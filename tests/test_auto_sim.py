#!/usr/bin/env python3
"""tools/auto_sim.py - the simulation factory's planner, state machine, dry-run guard, trace and smoke.

Everything runs offline against the repository as it is. Batch state goes to a temporary
directory, and the repository fingerprint is checked before and after: the suite itself proves
that planning and dry runs change nothing.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
import auto_sim as A  # noqa: E402

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or not detail else "  -> " + str(detail)))


def raises(fn, *a, **k):
    try:
        fn(*a, **k)
    except A.Unsafe as e:
        return str(e)
    return None


PAPER1 = "papers/Jee_Adv_2026_paper1_solutions_final.pdf"
HAVE_PAPER = os.path.exists(os.path.join(ROOT, PAPER1))


def q(n, subject="Chemistry", paper=1, src=PAPER1, sol=None, **extra):
    d = {"type": "question", "exam": "JEE Advanced", "year": 2026, "paper": paper, "subject": subject,
         "question": n, "questionSource": src}
    if sol:
        d["solutionSource"] = sol
    d.update(extra)
    return d


TMP = tempfile.mkdtemp(prefix="auto-sim-test.")
n_batch = [0]


def batch(items, mode="dry-run", cont=False):
    n_batch[0] += 1
    return A.make_batch({"mode": mode, "continueOnBlocked": cont, "items": items}, TMP, stamp="t%02d" % n_batch[0])


FP0 = A.fingerprint()
try:
    # ------------------------------------------------------------ the stage list
    want = ["input_received", "source_accessible", "source_verified", "question_or_concept_verified", "solution_verified",
            "independent_solve_complete", "scientific_verification_complete", "learning_objectives_complete", "design_complete",
            "implementation_complete", "visual_qa_complete", "scientific_qa_complete", "browser_qa_complete", "mobile_qa_complete",
            "registry_complete", "production_audit_complete", "commit_complete", "push_complete", "deployment_complete",
            "live_smoke_test_complete", "item_complete"]
    chk("21 stages in the pipeline order (item_failed is a status, not a stage)", A.STAGE_NAMES == want)
    kinds = dict((s[0], s[3]) for s in A.STAGES)
    chk("every stage before implementation only reads", all(kinds[s] == "read" for s in want[:9]))
    chk("commit is a git stage; push, deploy and the Sheet are remote stages",
        kinds["commit_complete"] == "git" and kinds["push_complete"] == kinds["deployment_complete"] == kinds["item_complete"] == "remote")

    # ------------------------------------------------------------ IDs and sources
    chk("question ID and folder follow the registry scheme",
        A.question_id(q(17))[:3] == ("ADV-2026-P1-CHE-Q17", "CHE", "simulations/2026/paper-1/chemistry/adv-2026-p1-che-q17/"))
    chk("Chemistry keeps the pNqNN test names", A.question_id(q(17))[3] == "p1q17")
    chk("other subjects get the subject in the test name (no collision with Chemistry P1 Q01)",
        A.question_id(q(1, "Physics"))[3] == "p1phyq01")
    chk("an exam with no ID scheme is refused", raises(A.question_id, dict(q(3), exam="NEET")) is not None)
    chk("an unknown subject is refused", raises(A.question_id, q(3, "Biology")) is not None)
    chk("a URL source is classified, fetched later", A.check_source("https://example.org/x.pdf")["kind"] == "url"
        and A.check_source("https://example.org/x.pdf")["ok"] is None)
    chk("a missing local source is not ok", A.check_source("papers/nope.pdf")["ok"] is False)
    chk("page fragment parsed from 'file#page=35'", A.check_source(PAPER1 + "#page=35")["pages"] == "35")
    if HAVE_PAPER:
        s = A.check_source(PAPER1)
        chk("a private paper in papers/ is readable and recognised as git-ignored", s["ok"] and "git-ignored" in s["note"], s)
        chk("the Paper 1 PDF has 35 pages (Q16 is on the last)", A.pdf_pages(os.path.join(ROOT, PAPER1)) == 35)
        chk("a page inside the PDF is accepted", A.check_source(PAPER1 + "#page=35")["ok"] is True)
        chk("a page past the end of the PDF is a source blocker", A.check_source(PAPER1 + "#page=36")["ok"] is False)
        rdir = os.path.join(TMP, "pages")
        if A._pdfium() is None:
            # system python3 without pypdfium2: the CLI hands off to tests/.venv; test that path
            rc = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "auto_sim.py"), "render", PAPER1, "--pages", "35",
                                 "--out", rdir], capture_output=True, text=True, cwd=ROOT)
            chk("render CLI hands off to tests/.venv (this interpreter has no pypdfium2)",
                rc.returncode == 0 and os.path.exists(os.path.join(rdir, "p035.png")), rc.stdout + rc.stderr)
            chk("render in-process without pypdfium2 is refused with the install hint",
                "tests/.venv" in (raises(A.render_pages, PAPER1, [35], rdir) or ""))
            r = {"png": os.path.join(rdir, "p035.png"), "txt": os.path.join(rdir, "p035.txt"), "width": 1191, "height": 1684}
        else:
            r = A.render_pages(PAPER1, [35], rdir)[0]
            chk("render: a page outside the PDF is refused", raises(A.render_pages, PAPER1, [36], rdir) is not None)
            chk("render: a missing PDF is refused", raises(A.render_pages, "papers/nope.pdf", [1], rdir) is not None)
            sys_py = os.path.join(sys.base_prefix, "bin", "python3")
            if os.path.exists(sys_py) and sys.base_prefix != sys.prefix:
                rc = subprocess.run([sys_py, os.path.join(ROOT, "tools", "auto_sim.py"), "render", PAPER1, "--pages", "34-35",
                                     "--out", os.path.join(TMP, "cli")], capture_output=True, text=True, cwd=ROOT)
                chk("render CLI from the system python3 hands off to tests/.venv and renders pages 34-35",
                    rc.returncode == 0 and os.path.exists(os.path.join(TMP, "cli", "p034.png")) and os.path.exists(os.path.join(TMP, "cli", "p035.png")),
                    rc.stdout + rc.stderr)
        chk("render: page 35 -> PNG at 2x (1191 x 1684 px)", os.path.exists(r["png"]) and os.path.getsize(r["png"]) > 50000
            and (r["width"], r["height"]) == (1191, 1684) and open(r["png"], "rb").read(8) == b"\x89PNG\r\n\x1a\n", r)
        txt = open(r["txt"], encoding="utf-8").read() if os.path.exists(r["txt"]) else ""
        chk("render: the text layer is readable and is Q16 (stem, four options, key B)",
            "Q.16 Match the major products" in txt and all("(%s) P" % o in txt for o in "ABCD") and "Answer Q16: B" in txt, txt[:120])
        chk("render: the page says it is the last Chemistry page (10/10) - there is no P1 Chemistry Q17", "10/10" in txt)
    chk("rendered pages default to .tmp/auto-simulation/pages/, which git ignores",
        A.PAGES_DIR.startswith(A.STATE_ROOT) and subprocess.run(["git", "check-ignore", "-q", os.path.relpath(A.PAGES_DIR, ROOT) + "/x.png"],
                                                                 cwd=ROOT).returncode == 0)

    # ------------------------------------------------------------ plan
    b1 = batch([q(16, sol=PAPER1), q(17, sol=PAPER1), q(1, "Physics"),
                {"type": "concept", "concept": "Nucleophilic aromatic substitution", "subject": "Chemistry", "source": "https://example.org/snar"},
                q(18, paper=2, src="papers/does_not_exist.pdf"), q(17), q(4, "Mathematics"), {"type": "recipe"}])
    _, its = A.items_of(b1)
    st = {it["n"]: it for it in its}
    chk("plan keeps the owner's order", [it["n"] for it in its] == list(range(1, 9)))
    chk("an existing ID is skipped as a duplicate, with nothing to create",
        st[1]["status"] == "skipped-duplicate" and st[1]["files"] == [])
    chk("a new question plans its five files", st[2]["files"] == [
        "simulations/2026/paper-1/chemistry/adv-2026-p1-che-q17/index.html", "simulations/2026/paper-1/chemistry/adv-2026-p1-che-q17/meta.json",
        "simulations/2026/paper-1/chemistry/adv-2026-p1-che-q17/question.md", "tests/verify_p1q17.py", "tests/sim_p1q17.js"])
    chk("Chemistry items load the chemistry doctrine skill", "prayogx-chemistry" in st[2]["skills"])
    chk("Physics: warned that no doctrine skill exists, not blocked",
        any("physics" in w for w in st[3]["warnings"]) and not st[3]["blockers"])
    chk("a concept gets a CON- ID, a concepts/ folder and concept.md",
        st[4]["id"] == "CON-CHE-NUCLEOPHILIC-AROMATIC-SUBSTITUTION"
        and st[4]["folder"] == "simulations/concepts/chemistry/con-che-nucleophilic-aromatic-substitution/"
        and st[4]["files"][2].endswith("/concept.md") and st[4]["files"][3] == "tests/verify_con_che_nucleophilic_aromatic_substitution.py")
    chk("a concept may be built and registered as draft; publishing stops at commit_complete",
        any(b["kind"] == "decision" and b.get("atStage") == "commit_complete" for b in st[4]["blockers"]))
    chk("a concept close to an existing page reports the near-duplicate (P1 Q16)",
        any(x["id"] == "ADV-2026-P1-CHE-Q16" for x in st[4].get("nearDuplicates", [])), st[4].get("nearDuplicates"))
    chk("a missing source is a source blocker, and the item is blocked at planning",
        any(b["kind"] == "source" for b in st[5]["blockers"]) and st[5]["status"] == "blocked"
        and st[5]["failure"]["stage"] == "source_accessible")
    chk("the same ID twice in one batch is caught", any("twice" in b["detail"] for b in st[6]["blockers"]))
    chk("mathematics needs a verifier doctrine first", any(b["kind"] == "decision" for b in st[7]["blockers"]))
    chk("an unknown item type is refused", any(b["kind"] == "source" for b in st[8]["blockers"]))
    chk("no solution source -> warning that the key must come from the question source",
        any("solution source" in w for w in st[3]["warnings"]))
    chk("a spec with no items is refused", raises(A.make_batch, {"items": []}, TMP) is not None)
    chk("an unknown mode is refused", raises(A.make_batch, {"mode": "yolo", "items": [q(17)]}, TMP) is not None)

    # ------------------------------------------------------------ dry-run simulation
    lines, outcome = A.simulate(b1)
    oc = dict(outcome)
    chk("dry run: the duplicate is skipped", oc[1] == "skipped-duplicate")
    chk("dry run: a clean question is planned end to end", oc[2] == "planned")
    chk("dry run: the missing-source item blocks at source_accessible",
        oc[5] == "blocked" and any("source_accessible" in l and "BLOCKED" in l for l in lines))
    chk("dry run: continueOnBlocked false stops the batch after a blocked item",
        all(oc[k] == "not-started" for k in (6, 7, 8)), outcome)
    chk("dry run: items are walked in order, one at a time",
        [int(l[:3]) for l in lines if l[:3].isdigit() and l.endswith(": START")] == [2, 3, 4, 5],
        [l[:60] for l in lines if l[:3].isdigit()])
    chk("dry run: every stage of a planned item appears in order",
        [l.split()[0] for l in lines[lines.index([x for x in lines if x.startswith("002") and "START" in x][0]) + 1:][:21]] == want)
    b2 = batch([q(18, paper=2, src="papers/does_not_exist.pdf"), q(17)], cont=True)
    _, out2 = A.simulate(b2)
    chk("continueOnBlocked true: the next item still runs", dict(out2) == {1: "blocked", 2: "planned"}, out2)
    b3 = batch([{"type": "concept", "concept": "Buffer action", "subject": "Chemistry", "source": "https://example.org/b"},
                q(4, "Mathematics")], mode="production", cont=True)
    lines3, out3 = A.simulate(b3)
    chk("production mode: a concept runs through registry and stops at commit_complete",
        dict(out3)[1] == "blocked" and any(l.split()[0] == "commit_complete" and "decision" in l for l in lines3)
        and any(l.split()[0] == "registry_complete" for l in lines3))
    chk("production mode: mathematics stops at its first write stage (gate not weakened)",
        dict(out3)[2] == "blocked" and any(l.split()[0] == "implementation_complete" and "mathematics" in l for l in lines3))
    b9 = batch([{"type": "concept", "concept": "Buffer action", "subject": "Chemistry", "source": "https://example.org/b"}], mode="production")
    for s in want[:16]:
        A.advance(b9, 1, s, "ok")
    chk("production state machine: a concept cannot reach commit_complete",
        "blocked at commit_complete" in (raises(A.advance, b9, 1, "commit_complete", "x", commit="HEAD") or ""))
    chk("a concept with no subject is refused at planning",
        A.make_batch({"items": [{"type": "concept", "concept": "Buffer action"}]}, TMP, stamp="nosubj") and
        json.load(open(os.path.join(TMP, "batch-nosubj", "item-001", "state.json")))["status"] == "blocked")
    b10 = batch([{"type": "concept", "concept": "Buffer action", "subject": "Chemistry", "source": "https://example.org/b"},
                 {"type": "concept", "concept": "buffer   ACTION!", "subject": "Chemistry", "source": "https://example.org/b"}])
    _, its10 = A.items_of(b10)
    chk("the same concept twice (any spelling) is one ID - caught as a duplicate",
        its10[0]["id"] == its10[1]["id"] == "CON-CHE-BUFFER-ACTION" and any("twice" in x["detail"] for x in its10[1]["blockers"]))

    # ------------------------------------------------------------ state machine
    for s in want[:9]:
        A.advance(b1, 2, s, "")
    chk("dry run: implementation_complete is refused", "dry-run" in (raises(A.advance, b1, 2, "implementation_complete", "files") or ""))
    b4 = batch([q(17, sol=PAPER1), q(18, sol=PAPER1)], mode="production")
    chk("out of order: a later stage before an earlier one is refused",
        "next stage is input_received" in (raises(A.advance, b4, 1, "design_complete", "") or ""))
    chk("strictly sequential: item 2 cannot start while item 1 is unfinished",
        "finish it" in (raises(A.advance, b4, 2, "input_received", "") or ""))
    for s in want[:9]:
        A.advance(b4, 1, s, "")
    chk("a check or write stage needs evidence", "evidence" in (raises(A.advance, b4, 1, "implementation_complete", "  ") or ""))
    A.advance(b4, 1, "implementation_complete", "3 files")
    for s in want[10:16]:
        A.advance(b4, 1, s, "ok")
    chk("commit_complete needs a real commit hash", raises(A.advance, b4, 1, "commit_complete", "x", commit="deadbeef") is not None)
    head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    A.advance(b4, 1, "commit_complete", "commit", commit=head)
    b_, res = A.resume(b4)
    r1 = res[0]
    chk("resume: claims are re-checked - missing files are doubted",
        any("missing" in d for d in r1["doubts"]), r1["doubts"])
    chk("resume: registry claim is checked against the manifest", any("manifest" in d for d in r1["doubts"]))
    chk("resume: a commit that does not touch the item's folder is doubted", any("does not touch" in d for d in r1["doubts"]))
    chk("resume: names the next stage", r1["next"] == "push_complete", r1["next"])
    it = json.load(open(os.path.join(b4, "item-001", "state.json")))
    it["stages"]["push_complete"] = {"evidence": "forged"}
    it["stages"]["commit_complete"]["commit"] = "0" * 40
    json.dump(it, open(os.path.join(b4, "item-001", "state.json"), "w"))
    _, res = A.resume(b4)
    chk("resume: a forged commit and push are both doubted",
        any("does not exist" in d for d in res[0]["doubts"]) and any("origin/main" in d for d in res[0]["doubts"]), res[0]["doubts"])

    b7 = batch([q(18, paper=2, src="papers/does_not_exist.pdf"), q(17)], mode="production", cont=True)
    chk("a plan-time source block lets the next item start when continueOnBlocked",
        raises(A.advance, b7, 2, "input_received", "") is None)
    b8 = batch([q(18, paper=2, src="papers/does_not_exist.pdf"), q(17)], mode="production")
    chk("a plan-time source block stops the next item without continueOnBlocked",
        "does not continue" in (raises(A.advance, b8, 2, "input_received", "") or ""))
    b5 = batch([q(17, sol=PAPER1), q(18, sol=PAPER1), q(15, paper=2, sol=PAPER1)], mode="production")
    A.fail(b5, 1, "source_verified", "source", "page 36 unreadable")
    chk("a source failure blocks the item", json.load(open(os.path.join(b5, "item-001", "state.json")))["status"] == "blocked")
    chk("without continueOnBlocked, the next item may not start", "does not continue" in (raises(A.advance, b5, 2, "input_received", "") or ""))
    b6 = batch([q(17, sol=PAPER1), q(18, sol=PAPER1)], mode="production", cont=True)
    A.fail(b6, 1, "source_verified", "source", "page 36 unreadable")
    chk("with continueOnBlocked, the next item may start", raises(A.advance, b6, 2, "input_received", "") is None)
    A.fail(b6, 2, "deployment_complete", "critical", "Pages deploy failed")
    bb, _ = A.items_of(b6)
    chk("a critical failure stops the whole batch", bb.get("stopped", {}).get("item") == 2)
    chk("a recoverable failure keeps the item in progress",
        A.fail(b5, 2, "browser_qa_complete", "recoverable", "overlap at 390 px")["status"] == "in-progress")
    chk("an unknown failure kind is refused", raises(A.fail, b5, 2, "x", "whatever", "d") is not None)

    # ------------------------------------------------------------ trace the reference build
    t = A.trace("ADV-2026-P1-CHE-Q16")
    chk("trace Q16: all 21 stages evidenced", [r["stage"] for r in t["stages"]] == want and all(r["ok"] for r in t["stages"]),
        [r["stage"] for r in t["stages"] if not r["ok"]])
    ev = {r["stage"]: r["evidence"] for r in t["stages"]}
    chk("trace Q16: the three commits, in order", re.search(r"5e72a93.*7dc4105.*8db6fb3", ev["commit_complete"]) is not None, ev["commit_complete"])
    chk("trace Q16: independent answer and official key recorded", "B" in ev["independent_solve_complete"] and "B" in ev["solution_verified"])
    chk("trace Q16: owner review recorded, feed says human_verified", t["ownerReview"] and t["feedStatus"] == "human_verified")
    tp2 = A.trace("ADV-2026-P2-CHE-Q05")
    chk("trace an older page: missing suites are reported, not invented",
        not {r["stage"]: r["ok"] for r in tp2["stages"]}["scientific_qa_complete"] and not tp2["ownerReview"])
    chk("trace an unknown ID is refused", raises(A.trace, "ADV-2026-P9-CHE-Q99") is not None)

    # ------------------------------------------------------------ smoke (injected fetch, no network)
    sim = next(s for s in A.manifest()["simulations"] if s["id"] == "ADV-2026-P1-CHE-Q16")
    cat = json.load(open(os.path.join(ROOT, "content", "catalog.json")))
    detail = json.load(open(os.path.join(ROOT, "content", "sims", "ADV-2026-P1-CHE-Q16.json")))
    page = open(os.path.join(ROOT, sim["path"]), "rb").read()

    def site(overrides=None):
        pages = {"/": (200, b"<html>"), "/content/catalog.json": (200, json.dumps(cat).encode()),
                 "/content/index.json": (200, b"... ADV-2026-P1-CHE-Q16 ..."),
                 "/content/sims/ADV-2026-P1-CHE-Q16.json": (200, json.dumps(detail).encode()),
                 "/" + sim["path"]: (200, page), "/s/ADV-2026-P1-CHE-Q16/": (200, b"<html>"),
                 "/sitemap.xml": (200, b"<loc>https://prayogx.co.in/s/ADV-2026-P1-CHE-Q16/</loc>")}
        pages.update(overrides or {})
        return lambda url: pages.get(url.replace("https://x.test", "").split("?")[0], (404, b""))
    r = A.smoke("ADV-2026-P1-CHE-Q16", "https://x.test", site())
    chk("smoke: a correct deploy passes every check", all(x["ok"] for x in r), [x["check"] for x in r if not x["ok"]])
    r = A.smoke("ADV-2026-P1-CHE-Q16", "https://x.test", site({"/CLAUDE.md": (200, b"# PrayogX")}))
    chk("smoke: a deployed private file fails", not all(x["ok"] for x in r))
    stale = dict(cat, version="000000000000")
    r = A.smoke("ADV-2026-P1-CHE-Q16", "https://x.test", site({"/content/catalog.json": (200, json.dumps(stale).encode())}))
    chk("smoke: a stale live feed fails", any(x["check"].startswith("live feed") and not x["ok"] for x in r))
    r = A.smoke("ADV-2026-P1-CHE-Q16", "https://x.test", site({"/" + sim["path"]: (404, b"")}))
    chk("smoke: a missing simulation page fails", any(x["check"] == "simulation page responds" and not x["ok"] for x in r))

    # ------------------------------------------------------------ preflight
    g = {x["gate"]: x for x in A.preflight()}
    chk("preflight: script_verified is available, so the publish-status gate passes",
        g["publish status for unreviewed pages"]["ok"] and A.AUTO_STATUS == "script_verified", g["publish status for unreviewed pages"])
    rname, rdetail = A.pdf_reader()
    chk("preflight: the PDF page reader gate passes with pypdfium2 from the project venv",
        g["PDF page reader for exam papers (pypdfium2 or pdftoppm)"]["ok"] and rname == "pypdfium2", rdetail)
    chk("preflight: deploy exclusions and ignores are checked",
        g["deploy exclusions intact"]["ok"] and g["papers/ is git-ignored"]["ok"] and g[".tmp/ (batch state) is git-ignored"]["ok"])

    # ------------------------------------------------------------ CLI
    def cli(*args):
        return subprocess.run([sys.executable, os.path.join(ROOT, "tools", "auto_sim.py")] + list(args), capture_output=True, text=True, cwd=ROOT)
    bad = os.path.join(TMP, "bad.json")
    json.dump({"items": []}, open(bad, "w"))
    chk("CLI: an unusable spec exits 2 with STOPPED", cli("plan", bad, "--state-root", TMP).returncode == 2)
    r = cli("guard", b1)
    chk("CLI guard: exit 0 after all of the above", r.returncode == 0 and "changed nothing" in r.stdout, r.stdout + r.stderr)
    src = open(os.path.join(ROOT, "tools", "auto_sim.py"), encoding="utf-8").read()
    chk("the factory script never commits, pushes or deploys",
        not re.search(r'"git",\s*"(commit|push|add)"|publish\.sh"|update_values', src))
finally:
    shutil.rmtree(TMP, ignore_errors=True)

chk("the whole suite changed nothing in the repository (fingerprint before == after)", A.fingerprint() == FP0)
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
