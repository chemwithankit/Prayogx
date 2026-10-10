#!/usr/bin/env python3
"""The NCERT Explorer data layer (tools/ncert_schema.py) and how the library tools treat it.

Unit checks on the real data/ncert/ files and on broken copies of them, then end-to-end runs of
sync_manifest.py, build_content.py, check_library.py and production_audit.py on a throwaway copy of
the working tree:

  * the JEE feed (content/index.json, search.json, catalog.json, content/sims/, s/, sitemap.xml,
    robots.txt, sw.js) stays BYTE-IDENTICAL when concepts are added - draft, or published through
    the NCERT Explorer (CONCEPT_PUBLISHABLE, switched on; its off state is checked in the copy);
  * a published concept must be mapped under `understand`, appears only in content/ncert/, and a
    draft one linked there is simply left out;
  * WATCH shows only media with a VERIFIED publication record.

The real repository is never touched; the suite checks that at the end.
"""
import copy
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
import ncert_schema as N  # noqa: E402
import registry_schema as S  # noqa: E402
import auto_sim  # noqa: E402

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or not detail else "  -> " + str(detail)))


FP0 = auto_sim.fingerprint()
CH = "NCERT-11-CHE-P1-CH05"
MAN = json.load(open(os.path.join(ROOT, "data", "manifest.json"), encoding="utf-8"))
SIMS = MAN["simulations"]

# ---------------------------------------------------------------- unit: the real data
chk("the real data/ncert/ is valid", N.problems(ROOT, SIMS) == [], N.problems(ROOT, SIMS))
cat, chapters = N.load(ROOT)
chk("the pilot chapter is catalogued", [c["id"] for b in cat["books"] for c in b["chapters"]] == [CH])
src = cat["books"][0]["chapters"][0]["source"]
chk("NCERT PDFs are not hosted: source.hosted is null and official is ncert.nic.in",
    src["hosted"] is None and src["official"] == "https://ncert.nic.in/textbook/pdf/kech105.pdf")
chk("the verified edition is fingerprinted (Reprint 2026-27, 32 pages labelled 136-167)",
    src["editions"][0]["sha256"].startswith("e2b5d180") and src["editions"][0]["pdfPages"] == 32 and src["bookPages"] == [136, 167])
secs = {s["id"]: s for s in chapters[CH]["sections"]}
chk("approved APPLY links: 5.1.4 PHY-Q07, 5.2.1 CHE-Q01, 5.2.2 PHY-Q11, 5.6b/c CHE-Q13",
    secs["5.1.4"]["apply"] == ["ADV-2026-P1-PHY-Q07"] and secs["5.2.1"]["apply"] == ["ADV-2026-P1-CHE-Q01"]
    and secs["5.2.2"]["apply"] == ["ADV-2026-P1-PHY-Q11"] and secs["5.6b"]["apply"] == secs["5.6c"]["apply"] == ["ADV-2026-P1-CHE-Q13"])
chk("pilots: DELTA-U-VS-DELTA-H and CALORIMETER-01 published under understand (5.2.2, 5.3); REVERSIBLE-WORK (5.2.1), HESS-LAW (5.4e) and GIBBS-SPONTANEITY (5.6b, 5.6c) planned",
    secs["5.2.2"]["understand"] == secs["5.3"]["understand"] == ["CON-CHE-DELTA-U-VS-DELTA-H", "CON-CHE-CALORIMETER-01"]
    and secs["5.2.2"]["planned"] == secs["5.3"]["planned"] == []
    and secs["5.2.1"]["planned"] == ["CON-CHE-REVERSIBLE-WORK"] and secs["5.4e"]["planned"] == ["CON-CHE-HESS-LAW"]
    and secs["5.6b"]["planned"] == secs["5.6c"]["planned"] == ["CON-CHE-GIBBS-SPONTANEITY"])
F = N.feed(ROOT, SIMS)
chk("the feed is two files: the catalogue and the chapter", sorted(F) == ["%s.json" % CH, "catalog.json"])
chk("the committed content/ncert/ matches the feed byte for byte",
    all(open(os.path.join(ROOT, "content", "ncert", k), encoding="utf-8").read() == N.serialise(v) for k, v in F.items()))
chk("the feed is deterministic", N.serialise(N.feed(ROOT, SIMS)[CH + ".json"]) == N.serialise(F[CH + ".json"]))
chf = F[CH + ".json"]
chk("planned pages never ship", "planned" not in json.dumps(chf) and "CON-CHE-HESS-LAW" not in json.dumps(chf)
    and "CON-CHE-REVERSIBLE-WORK" not in json.dumps(chf)
    and "CON-CHE-GIBBS-SPONTANEITY" not in json.dumps(chf))
chk("a draft concept never ships, even when it exists in the library",
    not [c for c in chf["simulations"] if next((x for x in SIMS if x["id"] == c["id"]), {}).get("status") == "draft"])
chk("every linked simulation has a card with path and revision, and only linked ones",
    sorted(c["id"] for c in chf["simulations"]) == ["ADV-2026-P1-CHE-Q01", "ADV-2026-P1-CHE-Q13", "ADV-2026-P1-PHY-Q07", "ADV-2026-P1-PHY-Q11",
                                                    "CON-CHE-CALORIMETER-01", "CON-CHE-DELTA-U-VS-DELTA-H"]
    and all(c.get("path") and c.get("revision") and c["kind"] == ("concept" if c["id"].startswith("CON-") else "question")
            for c in chf["simulations"]))
chk("the published concept's card points to its own page",
    any(c["id"] == "CON-CHE-DELTA-U-VS-DELTA-H" and c["path"] == "simulations/concepts/chemistry/con-che-delta-u-vs-delta-h/index.html"
        and c["status"] == "script_verified" for c in chf["simulations"]))
chk("cards carry no detail prose (no verification log, no summary)",
    not any(k in c for c in chf["simulations"] for k in ("verification", "summary", "derivedQuantities")))

# ---------------------------------------------------------------- unit: broken copies of the data
T = tempfile.mkdtemp(prefix="ncert-test.")


def broken(mutate_cat=None, mutate_ch=None, extra_file=None, sims=None):
    """problems() for a copy of data/ncert/ after mutating it."""
    r = os.path.join(T, "r")
    shutil.rmtree(r, ignore_errors=True)
    os.makedirs(os.path.join(r, "data", "ncert", "chapters"))
    c, ch = copy.deepcopy(cat), copy.deepcopy(chapters[CH])
    if mutate_cat:
        mutate_cat(c)
    if mutate_ch:
        mutate_ch(ch)
    json.dump(c, open(os.path.join(r, "data", "ncert", "catalog.json"), "w"))
    json.dump(ch, open(os.path.join(r, "data", "ncert", "chapters", CH + ".json"), "w"))
    if extra_file:
        json.dump({"id": "x"}, open(os.path.join(r, "data", "ncert", "chapters", extra_file), "w"))
    return N.problems(r, sims if sims is not None else SIMS)


def sec(ch, sid):
    return next(s for s in ch["sections"] if s["id"] == sid)


def chap(c):
    return c["books"][0]["chapters"][0]


def refused(name, needle, **kw):
    p = broken(**kw)
    chk(name, any(needle in m for m in p), p)


refused("an unknown simulation under apply is refused", "not in data/manifest.json",
        mutate_ch=lambda ch: sec(ch, "5.2.1")["apply"].append("ADV-2026-P1-CHE-Q99"))
refused("a JEE page under understand is refused", "only CON- concept simulations",
        mutate_ch=lambda ch: sec(ch, "5.2.1")["understand"].append("ADV-2026-P1-CHE-Q01"))
refused("a concept under apply is refused", "only ADV- JEE simulations",
        mutate_ch=lambda ch: sec(ch, "5.2.1")["apply"].append("CON-CHE-HESS-LAW"))
refused("an unknown concept under understand is refused", "not in data/manifest.json",
        mutate_ch=lambda ch: sec(ch, "5.4e")["understand"].append("CON-CHE-NOT-REGISTERED"))
refused("a malformed planned ID is refused", "only CON- IDs",
        mutate_ch=lambda ch: sec(ch, "5.4e")["planned"].append("CON-CHE-hess"))
refused("pages outside the chapter are refused", "fall outside",
        mutate_ch=lambda ch: sec(ch, "exercises").update(pages=[165, 170]))
refused("reversed pages are refused", "pages must be [first, last]",
        mutate_ch=lambda ch: sec(ch, "5.3").update(pages=[146, 145]))
refused("a duplicate section is refused", "duplicate section",
        mutate_ch=lambda ch: ch["sections"].append(copy.deepcopy(ch["sections"][1])))
refused("a malformed section ID is refused", "section ID must be",
        mutate_ch=lambda ch: sec(ch, "5.3").update(id="5.3 calorimetry"))
refused("a level other than 1 or 2 is refused", "level must be",
        mutate_ch=lambda ch: sec(ch, "5.3").update(level=3))
refused("a repeated ID in one list is refused", "repeats an ID",
        mutate_ch=lambda ch: sec(ch, "5.2.1")["apply"].append("ADV-2026-P1-CHE-Q01"))
refused("watch without the same concept under understand is refused", "must also be under understand",
        mutate_ch=lambda ch: sec(ch, "5.4e")["watch"].append({"sim": "CON-CHE-HESS-LAW", "asset": "animation"}))
refused("an unknown watch asset is refused", "watch entries are",
        mutate_ch=lambda ch: sec(ch, "5.4e")["watch"].append({"sim": "CON-CHE-HESS-LAW", "asset": "podcast"}))
refused("a hosted PDF is refused without recorded permission", "source.hosted must stay null",
        mutate_cat=lambda c: chap(c)["source"].update(hosted="ncert/pdf/kech105.pdf"))
refused("a non-NCERT official URL is refused", "source.official must be",
        mutate_cat=lambda c: chap(c)["source"].update(official="https://example.com/kech105.pdf"))
refused("an edition without a sha256 is refused", "needs a lower-case sha256",
        mutate_cat=lambda c: chap(c)["source"]["editions"][0].update(sha256="E2B5"))
refused("an edition whose page count disagrees with bookPages is refused", "has 31 pages",
        mutate_cat=lambda c: chap(c)["source"]["editions"][0].update(pdfPages=31))
refused("a chapter without editions is refused", "at least one fingerprinted edition",
        mutate_cat=lambda c: chap(c)["source"].update(editions=[]))
refused("a bad book ID is refused", "book ID must look like",
        mutate_cat=lambda c: c["books"][0].update(id="NCERT-11-CHEM-P1"))
refused("a subject that disagrees with the book ID is refused", "does not match the ID",
        mutate_cat=lambda c: c["books"][0].update(subject="Physics"))
refused("a chapter ID outside its book is refused", "chapter ID must be",
        mutate_cat=lambda c: chap(c).update(id="NCERT-12-CHE-P1-CH05"))
refused("a chapter number that disagrees with its ID is refused", "does not match the ID",
        mutate_cat=lambda c: chap(c).update(number=6))
refused("a chapter file that is not listed is refused", "not listed in data/ncert/catalog.json",
        extra_file="NCERT-11-CHE-P1-CH06.json")
planned_live = copy.deepcopy(SIMS) + [{"id": "CON-CHE-HESS-LAW", "status": "script_verified"}]
refused("a planned concept that is already published must move to understand", "move it from planned",
        sims=planned_live)
chk("no NCERT data at all is not an error (the layer is optional)",
    N.problems(os.path.join(T, "nothing"), SIMS) == [] and N.feed(os.path.join(T, "nothing"), SIMS) == {})

# ---------------------------------------------------------------- end to end on a throwaway copy
W = os.path.join(T, "w")
EXCL = ["/.git", "/_scratch", "/Claude outputs", "/papers", "node_modules", "/tests/.venv", "/.tmp",
        "/app/android/.gradle", "/app/android/build", "/app/android/app/build", "/app/android/app/src/main/assets",
        "/tests/adstest*", "/tests/apptest*", "/tests/appwww*"]
subprocess.run(["rsync", "-rlp"] + ["--exclude=" + e for e in EXCL] + [ROOT + "/", W + "/"], check=True)
JEE = ["content/index.json", "content/search.json", "content/catalog.json", "sitemap.xml", "robots.txt", "sw.js"]


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


def jee_snapshot():
    """sha256 of every JEE-facing generated file, plus the s/ and content/sims/ trees."""
    h = {}
    for rel in JEE:
        h[rel] = hashlib.sha256(open(os.path.join(W, rel), "rb").read()).hexdigest()
    for tree in ("s", os.path.join("content", "sims")):
        for dp, _d, fs in os.walk(os.path.join(W, tree)):
            for f in fs:
                p = os.path.join(dp, f)
                h[os.path.relpath(p, W)] = hashlib.sha256(open(p, "rb").read()).hexdigest()
    return h


def all_pass(r):
    return all(v[0] == 0 for v in r.values())


def why(r):
    return {k: v[1][-400:] for k, v in r.items() if v[0]}


try:
    r = run_tools()
    chk("baseline copy: all four tools pass", all_pass(r), why(r))
    BASE = jee_snapshot()
    MAN0 = jload("data/manifest.json")
    LOCK0 = jload("data/revisions.json")

    cid = "CON-CHE-HESS-FIXTURE"          # a test-only concept (CON-CHE-HESS-LAW itself is a real draft since 2026-10-06)
    folder = S.concept_folder(cid)
    os.makedirs(os.path.join(W, folder))
    open(os.path.join(W, folder, "index.html"), "w").write(
        '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="sim-id" content="%s">'
        '<title>The enthalpy staircase</title></head><body><h1>The enthalpy staircase</h1></body></html>\n' % cid)
    open(os.path.join(W, folder, "concept.md"), "w").write("# %s - test fixture\n" % cid)
    concept = {"id": cid, "kind": "concept", "slug": cid.lower(), "revision": 1, "path": folder + "index.html",
               "folder": folder, "title": "The enthalpy staircase", "shortTitle": "Enthalpy staircase",
               "subject": "Chemistry", "chapter": "Thermodynamics", "topic": "Hess's law", "tags": ["hess", "enthalpy"],
               "learningObjectives": ["Show that the enthalpy change does not depend on the path"],
               "source": {"title": "Chemistry Part I, Class XI", "author": "NCERT", "chapter": "5 Thermodynamics",
                          "pages": "151-152", "url": "https://ncert.nic.in/textbook/pdf/kech105.pdf"},
               "verification": {"status": "verified", "methods": ["test fixture"]}, "status": "draft",
               "createdAt": "2026-10-02", "updatedAt": "2026-10-02"}

    def with_concept(**changes):
        c = dict(concept, **changes)
        jsave(folder + "meta.json", c)
        m = copy.deepcopy(MAN0)
        m["simulations"] = copy.deepcopy(MAN0["simulations"]) + [c]
        jsave("data/manifest.json", m)

    def map_concept(on):
        ch = jload("data/ncert/chapters/%s.json" % CH)
        s = next(x for x in ch["sections"] if x["id"] == "5.4e")
        s["understand"], s["planned"] = ([cid], []) if on else ([], [cid])
        jsave("data/ncert/chapters/%s.json" % CH, ch)

    # a draft concept, mapped under understand: valid, and invisible everywhere
    with_concept()
    map_concept(True)
    r = run_tools()
    chk("a draft concept mapped under understand passes all four tools", all_pass(r), why(r))
    chk("JEE feed byte-identical with a draft concept present", jee_snapshot() == BASE,
        sorted(k for k, v in jee_snapshot().items() if BASE.get(k) != v))
    chk("a draft concept is left out of content/ncert/ (the section simply shows nothing yet)",
        cid not in open(os.path.join(W, "content", "ncert", CH + ".json")).read())

    # published while CONCEPT_PUBLISHABLE is switched off (in the copy only): refused, draft only
    with_concept(status="script_verified")
    rs = os.path.join(W, "tools", "registry_schema.py")
    txt = open(rs, encoding="utf-8").read()
    open(rs, "w", encoding="utf-8").write(txt.replace("CONCEPT_PUBLISHABLE = True", "CONCEPT_PUBLISHABLE = False"))
    r = run_tools()
    chk("publishing a concept is refused while CONCEPT_PUBLISHABLE is off",
        r["check_library.py"][0] != 0 and "only be registered as status 'draft'" in r["check_library.py"][1])

    # the NCERT Explorer path (CONCEPT_PUBLISHABLE on, as in the repository): concepts publishable once mapped
    open(rs, "w", encoding="utf-8").write(txt)
    chk("the repository has concept publishing switched on", "CONCEPT_PUBLISHABLE = True" in txt)
    r = run_tools()
    chk("a published, mapped concept passes all four tools", all_pass(r), why(r))
    chk("JEE feed, detail records, crawlable pages, sitemap and sw.js stay byte-identical with a published concept",
        jee_snapshot() == BASE, sorted(k for k, v in jee_snapshot().items() if BASE.get(k) != v))
    chk("the published concept is in content/ncert/ under 5.4e, as a concept card",
        any(s["id"] == "5.4e" and s["understand"] == [cid] for s in jload("content/ncert/%s.json" % CH)["sections"])
        and any(c["id"] == cid and c["kind"] == "concept" for c in jload("content/ncert/%s.json" % CH)["simulations"]))
    chk("the published concept is in the revision lock (it is cached by revision too)",
        jload("data/revisions.json").get(cid, {}).get("revision") == 1)
    chk("the NCERT catalogue counts the concept (with DELTA-U-VS-DELTA-H and CALORIMETER-01: 3)", jload("content/ncert/catalog.json")["books"][0]["chapters"][0]["counts"]["understand"] == 3)

    # unmapped published concept: refused
    map_concept(False)
    r = run_tools()
    chk("a published concept that no chapter maps is refused",
        r["check_library.py"][0] != 0 and "must be mapped under 'understand'" in r["check_library.py"][1],
        r["check_library.py"][1][-300:])

    # stale or hand-edited feed is caught
    map_concept(True)
    run_tools()
    p = os.path.join(W, "content", "ncert", CH + ".json")
    open(p, "a").write(" ")
    r = subprocess.run([sys.executable, "tools/check_library.py"], cwd=W, capture_output=True, text=True)
    chk("a hand-edited content/ncert/ file is caught as stale", r.returncode != 0 and "is stale" in r.stdout)
    open(os.path.join(W, "content", "ncert", "NCERT-11-CHE-P1-CH99.json"), "w").write("{}\n")
    run_tools()
    chk("a stale chapter feed file is retired by the build",
        not os.path.exists(os.path.join(W, "content", "ncert", "NCERT-11-CHE-P1-CH99.json")))

    # WATCH: only VERIFIED media reaches the feed
    ch = jload("data/ncert/chapters/%s.json" % CH)
    next(x for x in ch["sections"] if x["id"] == "5.4e")["watch"] = [{"sim": cid, "asset": "animation"}]
    jsave("data/ncert/chapters/%s.json" % CH, ch)
    pubs = jload("tools/reel-maker/publications.json")
    pubs["publications"].append({"simulationId": cid, "asset": "animation", "platform": "youtube",
                                 "status": "PUBLISHED", "url": "https://www.youtube.com/watch?v=TESTFIXTURE"})
    jsave("tools/reel-maker/publications.json", pubs)
    r = run_tools()
    w = next(s for s in jload("content/ncert/%s.json" % CH)["sections"] if s["id"] == "5.4e")["watch"]
    chk("an unverified animation is not shown under WATCH", all_pass(r) and w == [], (why(r), w))
    pubs["publications"][-1]["status"] = "VERIFIED"
    jsave("tools/reel-maker/publications.json", pubs)
    r = run_tools()
    w = next(s for s in jload("content/ncert/%s.json" % CH)["sections"] if s["id"] == "5.4e")["watch"]
    chk("a VERIFIED animation is shown under WATCH with its YouTube link",
        all_pass(r) and w == [{"sim": cid, "asset": "animation",
                               "links": [{"platform": "youtube", "url": "https://www.youtube.com/watch?v=TESTFIXTURE"}]}], w)
    chk("JEE outputs still byte-identical after all of it", jee_snapshot() == BASE,
        sorted(k for k, v in jee_snapshot().items() if BASE.get(k) != v))
finally:
    shutil.rmtree(T, ignore_errors=True)

chk("the real repository was not touched", auto_sim.fingerprint() == FP0)
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
