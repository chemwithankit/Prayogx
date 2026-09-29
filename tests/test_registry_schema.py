#!/usr/bin/env python3
"""The registry's shared rules (tools/registry_schema.py) and the real library tools that use them.

Unit checks on IDs, slugs, folders and statuses, then end-to-end runs of sync_manifest.py,
build_content.py, check_library.py and production_audit.py on a throwaway copy of the working
tree: a page marked script_verified, the existing statuses, and concept entries (valid draft,
refused when published, malformed). The real repository is never touched; the suite checks
that at the end.
"""
import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
import registry_schema as S  # noqa: E402
import auto_sim  # noqa: E402

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or not detail else "  -> " + str(detail)))


Q16 = "ADV-2026-P1-CHE-Q16"
FP0 = auto_sim.fingerprint()

# ---------------------------------------------------------------- unit: IDs and statuses
chk("question IDs still valid", all(S.valid_id(i) for i in ("ADV-2026-P1-CHE-Q16", "ADV-2026-P2-PHY-Q03", "ADV-2027-P1-MAT-Q101")))
chk("concept IDs valid", all(S.valid_id(i) for i in ("CON-CHE-BUFFER-ACTION", "CON-CHE-SN1-MECHANISM", "CON-PHY-ELECTRIC-FIELD", "CON-MAT-X")))
chk("malformed IDs refused", not any(S.valid_id(i) for i in (
    "CON-CHE-buffer-action", "CON-BIO-CELL", "CON-CHE--X", "CON-CHE-X-", "CON-CHE-", "CON-CHE-A B", "CON-CHE-" + "-".join(["AB"] * 9),
    "con-che-x", "ADV-2026-P1-CHE-Q1", "CON-CHE-" + "X" * 60)))
chk("slug: case, punctuation and spacing folded", S.concept_slug("SN1 vs SN2: mechanism!") == "SN1-VS-SN2-MECHANISM"
    and S.concept_slug("  buffer   ACTION ") == "BUFFER-ACTION")
chk("concept ID from subject + name", S.concept_id("CHE", "Buffer action") == "CON-CHE-BUFFER-ACTION"
    and S.concept_id("PHY", "Electric field") == "CON-PHY-ELECTRIC-FIELD")
chk("concept folder is lower case under simulations/concepts/<subject>/",
    S.concept_folder("CON-CHE-BUFFER-ACTION") == "simulations/concepts/chemistry/con-che-buffer-action/")
for bad, why in ((("BIO", "x"), "subject"), (("CHE", "!!!"), "empty slug"), (("CHE", "word " * 3 + "x" * 60), "too long")):
    try:
        S.concept_id(*bad)
        chk("concept_id refuses " + why, False)
    except ValueError:
        chk("concept_id refuses " + why, True)
chk("status values: the existing three kept, script_verified added",
    S.STATUS_VALUES == ("human_verified", "script_verified", "draft", "deprecated") and S.DEFAULT_STATUS == "human_verified")
chk("ai_verified is not a registry status (it never existed)", "ai_verified" not in S.STATUS_VALUES)
chk("companions: question.md for questions, concept.md for concepts",
    S.companions({"id": Q16}) == ("meta.json", "question.md") and S.companions({"id": "CON-CHE-X"}) == ("meta.json", "concept.md"))

# ---------------------------------------------------------------- end to end on a throwaway copy
TMP = tempfile.mkdtemp(prefix="registry-test.")
W = os.path.join(TMP, "w")
EXCL = ["/.git", "/_scratch", "/Claude outputs", "/papers", "node_modules", "/tests/.venv", "/.tmp",
        "/app/android/.gradle", "/app/android/build", "/app/android/app/build", "/app/android/app/src/main/assets", "/tests/adstest*", "/tests/apptest*", "/tests/appwww*"]
subprocess.run(["rsync", "-rlp"] + ["--exclude=" + e for e in EXCL] + [ROOT + "/", W + "/"], check=True)


def run_tools():
    out = {}
    for t in ("sync_manifest.py", "build_content.py", "check_library.py", "production_audit.py"):
        r = subprocess.run([sys.executable, os.path.join("tools", t)], cwd=W, capture_output=True, text=True)
        out[t] = (r.returncode, r.stdout + r.stderr)
    return out


def jload(rel):
    return json.load(open(os.path.join(W, rel), encoding="utf-8"))


def jsave(rel, obj):
    with open(os.path.join(W, rel), "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


MAN0 = jload("data/manifest.json")


def set_manifest(sims):
    m = copy.deepcopy(MAN0)
    m["simulations"] = sims
    jsave("data/manifest.json", m)


def with_status(sid, status):
    sims = copy.deepcopy(MAN0["simulations"])
    for s in sims:
        if s["id"] == sid:
            if status is None:
                s.pop("status", None)
            else:
                s["status"] = status
            jsave(s["folder"] + "meta.json", s)
    return sims


try:
    r = run_tools()
    chk("baseline copy: all four tools pass", all(v[0] == 0 for v in r.values()), {k: v[1][-200:] for k, v in r.items() if v[0]})

    # script_verified on a published page
    set_manifest(with_status(Q16, "script_verified"))
    r = run_tools()
    chk("script_verified: sync, build, check_library and production_audit all pass",
        all(v[0] == 0 for v in r.values()), {k: v[1][-300:] for k, v in r.items() if v[0]})
    det = jload("content/sims/%s.json" % Q16)
    card = next(c for c in jload("content/index.json")["simulations"] if c["id"] == Q16)
    chk("script_verified reaches the feed (detail record and card)", det.get("status") == "script_verified" and card.get("status") == "script_verified")
    chk("script_verified page stays published: feed, crawlable page, sitemap, revision lock",
        os.path.exists(os.path.join(W, "s", Q16, "index.html")) and Q16 in open(os.path.join(W, "sitemap.xml")).read()
        and Q16 in jload("data/revisions.json"))
    others = [c for c in jload("content/index.json")["simulations"] if c["id"] != Q16]
    chk("every other page keeps the human_verified default", len(others) == 32 and all(c.get("status") == "human_verified" for c in others))
    site = open(os.path.join(W, "site", "site.js"), encoding="utf-8").read()
    app = open(os.path.join(W, "app", "www", "app.js"), encoding="utf-8").read() if os.path.exists(os.path.join(W, "app", "www", "app.js")) else ""
    chk("the website and the app filter only 'draft' - script_verified pages are listed, and neither shows a status label",
        '"draft"' in site and "human_verified" not in site and "script_verified" not in site and "human_verified" not in app)

    # existing statuses still work
    set_manifest(with_status(Q16, "deprecated"))
    r = run_tools()
    chk("deprecated still accepted", r["check_library.py"][0] == 0 and r["production_audit.py"][0] == 0, r["check_library.py"][1][-200:])
    # a draft is a page that was never published (the revision lock is append-only; the register
    # skill drops a never-published page's lock entry), so model that: no lock entry, no s/ page
    set_manifest(with_status(Q16, "draft"))
    lock = jload("data/revisions.json")
    lock.pop(Q16, None)
    with open(os.path.join(W, "data", "revisions.json"), "w", encoding="utf-8") as fh:
        json.dump(lock, fh, indent=2, sort_keys=True)
        fh.write("\n")
    shutil.rmtree(os.path.join(W, "s", Q16), ignore_errors=True)
    r = run_tools()
    chk("draft still accepted and kept off the feed",
        r["check_library.py"][0] == 0 and r["production_audit.py"][0] == 0
        and Q16 not in [c["id"] for c in jload("content/index.json")["simulations"]],
        (r["check_library.py"][1][-300:], r["production_audit.py"][1][-400:]))
    set_manifest(with_status(Q16, "ai_verified"))
    r = run_tools()
    chk("an unknown status (ai_verified) is refused by check_library", r["check_library.py"][0] != 0 and "status" in r["check_library.py"][1])

    # concepts (Q16 published again, with its original lock entry)
    shutil.copy(os.path.join(ROOT, "data", "revisions.json"), os.path.join(W, "data", "revisions.json"))
    set_manifest(with_status(Q16, None))
    cid = "CON-CHE-BUFFER-ACTION"
    folder = S.concept_folder(cid)
    os.makedirs(os.path.join(W, folder))
    page = ('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            '<meta name="sim-id" content="%s"><title>Buffer action</title></head><body><h1>Buffer action</h1></body></html>\n' % cid)
    open(os.path.join(W, folder, "index.html"), "w").write(page)
    open(os.path.join(W, folder, "concept.md"), "w").write("# CON-CHE-BUFFER-ACTION - Buffer action\n")
    concept = {"id": cid, "kind": "concept", "slug": cid.lower(), "revision": 1, "path": folder + "index.html", "folder": folder,
               "title": "Buffer action", "subject": "Chemistry", "chapter": "Equilibrium", "topic": "Buffer solutions",
               "tags": ["buffer", "equilibrium"], "learningObjectives": ["Explain why a buffer resists pH change on adding a little acid or base"],
               "source": {"title": "Chemistry Part I, Class XI", "author": "NCERT", "chapter": "7 Equilibrium", "url": "https://ncert.nic.in/textbook/pdf/kech107.pdf"},
               "verification": {"status": "verified", "methods": ["test fixture"]}, "status": "draft",
               "createdAt": "2026-09-29", "updatedAt": "2026-09-29"}

    def with_concept(**changes):
        c = dict(concept, **changes)
        for k, v in list(c.items()):
            if v is None:
                c.pop(k)
        jsave(folder + "meta.json", c)
        set_manifest(copy.deepcopy(MAN0["simulations"]) + [c])

    with_concept()
    r = run_tools()
    chk("a valid draft concept passes sync, build, check_library and production_audit",
        all(v[0] == 0 for v in r.values()), {k: v[1][-400:] for k, v in r.items() if v[0]})
    chk("a draft concept stays off the feed and the sitemap",
        cid not in json.dumps(jload("content/index.json")) and cid not in open(os.path.join(W, "sitemap.xml")).read())
    with_concept(status="script_verified")
    r = run_tools()
    chk("publishing a concept is refused until the clients render concepts",
        r["check_library.py"][0] != 0 and "only be registered as status 'draft'" in r["check_library.py"][1])
    with_concept(learningObjectives=None)
    r = run_tools()
    chk("a concept without learning objectives is refused", r["check_library.py"][0] != 0 and "learningObjectives" in r["check_library.py"][1])
    with_concept(source={"note": "somewhere"})
    r = run_tools()
    chk("a concept without a usable source is refused", r["check_library.py"][0] != 0 and "source needs" in r["check_library.py"][1])
    with_concept(subject="Physics")
    r = run_tools()
    chk("a concept whose subject disagrees with its ID is refused", r["check_library.py"][0] != 0 and "does not match the ID" in r["check_library.py"][1])
    os.remove(os.path.join(W, folder, "concept.md"))
    with_concept()
    r = run_tools()
    chk("a concept without concept.md is refused", r["check_library.py"][0] != 0 and "concept.md missing" in r["check_library.py"][1])
    bad = "CON-CHE-buffer-action"
    with_concept(id=bad)
    r = run_tools()
    chk("a malformed concept ID is refused by check_library and production_audit",
        r["check_library.py"][0] != 0 and r["production_audit.py"][0] != 0)
finally:
    shutil.rmtree(TMP, ignore_errors=True)

chk("the real repository was not touched", auto_sim.fingerprint() == FP0)
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
