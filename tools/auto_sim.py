#!/usr/bin/env python3
"""The PrayogX simulation factory: plans, tracks and checks batches of simulation builds.

Claude does the building (sources, science, design, code) by following
.claude/skills/prayogx-auto-simulation/SKILL.md. This script is the part that must not depend on
judgement: it turns a batch spec into an ordered plan, keeps each item's stage state, refuses to
let a stage be marked done out of order, re-checks claimed stages against the repository when a
batch resumes, proves a dry run changed nothing, reconstructs the full pipeline evidence of an
existing simulation, and runs the live smoke test after a deploy.

It never builds, commits, pushes or deploys anything itself.

  python3 tools/auto_sim.py plan SPEC.json                 new batch -> .tmp/auto-simulation/batch-*/
  python3 tools/auto_sim.py preflight [--online]           production gates for the whole repository
  python3 tools/auto_sim.py simulate BATCH                 dry run: walk every item through every stage
  python3 tools/auto_sim.py guard BATCH                    dry run changed nothing? (exit 1 if it did)
  python3 tools/auto_sim.py advance BATCH ITEM STAGE --evidence TEXT [--commit HASH]
  python3 tools/auto_sim.py fail BATCH ITEM STAGE --kind recoverable|source|critical --detail TEXT
  python3 tools/auto_sim.py resume BATCH                   verify claimed stages, name the next action
  python3 tools/auto_sim.py report BATCH                   the batch table and summary
  python3 tools/auto_sim.py trace ID [--run] [--online]    the whole pipeline, as evidenced for ID
  python3 tools/auto_sim.py smoke ID [--base URL]          live HTTP smoke test (read-only)
  python3 tools/auto_sim.py render PDF --pages 35          source page -> PNG + text in .tmp/ (pypdfium2)

Exit codes: 0 ok, 1 a check failed, 2 unusable input or an unsafe state.
"""
import argparse
import csv
import datetime
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import registry_schema as schema  # noqa: E402
MANIFEST = os.path.join(ROOT, "data", "manifest.json")
STATE_ROOT = os.path.join(ROOT, ".tmp", "auto-simulation")
LIVE = "https://prayogx.co.in"
SUBJ = {"physics": "PHY", "chemistry": "CHE", "mathematics": "MAT", "maths": "MAT", "math": "MAT"}
SUBJ_SKILL = {"CHE": "prayogx-chemistry"}          # a physics / maths doctrine skill does not exist yet

# (stage, what happens, where it is done, kind of effect)
#   kind: read   - reads sources or the repository only
#         work   - writes files inside the item's own paths (never an existing simulation)
#         shared - writes shared library files (manifest, taxonomy, tracker, README, tests list)
#         git    - local commit            remote - push / deploy / Sheet            check - tests
STAGES = [
    ("input_received", "item parsed and ID / duplicate check done", "auto_sim.py plan", "read"),
    ("source_accessible", "every source opens (local file read, URL fetched)", "SKILL §3", "read"),
    ("source_verified", "exam, year, paper, section, number, page and marking confirmed; concept source title/chapter/pages", "SKILL §3", "read"),
    ("question_or_concept_verified", "question transcribed verbatim (numbers, units, options, structures) / concept scope and definitions extracted", "prayogx-new-simulation 1-2", "read"),
    ("solution_verified", "official key and solution located and read (question mode); n/a for concepts", "prayogx-new-simulation 4", "read"),
    ("independent_solve_complete", "solved / derived independently before any key", "prayogx-new-simulation 3", "read"),
    ("scientific_verification_complete", "independent answer == official key (or concept equations and limits checked); conflicts stop the item", "prayogx-new-simulation 4", "read"),
    ("learning_objectives_complete", "pivot, observations, manipulations, misconception", "prayogx-new-simulation 5", "read"),
    ("design_complete", "design brief written (experiment, rendering level, stages, interactions)", "prayogx-new-simulation 6-11", "read"),
    ("implementation_complete", "index.html, verifier and page suite written in the item's own paths", "prayogx-new-simulation 12-16", "work"),
    ("visual_qa_complete", "every stage and the reveal screenshotted at 1280 and 390 px and looked at", "prayogx-validate §4", "check"),
    ("scientific_qa_complete", "tests/verify_<id>.py: N passed, 0 failed", "prayogx-validate §2", "check"),
    ("browser_qa_complete", "tests/sim_<id>.js: N / N passed, zero console errors", "prayogx-validate §3", "check"),
    ("mobile_qa_complete", "390 / 360 px no overflow, touch sizes, reduced motion", "prayogx-validate §3", "check"),
    ("registry_complete", "meta.json, question.md, manifest, taxonomy, tracker.csv, README and test registration; regenerated", "prayogx-register 1-3", "shared"),
    ("production_audit_complete", "check_library, production_audit, drift gate, runall.sh", "prayogx-validate §5", "check"),
    ("commit_complete", "one local commit for this item only", "SKILL §7", "git"),
    ("push_complete", "./publish.sh pushed the commit (fast-forward)", "SKILL §7", "remote"),
    ("deployment_complete", "the live feed serves the new version", "SKILL §7", "remote"),
    ("live_smoke_test_complete", "auto_sim.py smoke + tests/live_smoke.js pass on the live site", "SKILL §7", "check"),
    ("item_complete", "Sheet synced (prayogx-register §5), report written", "SKILL §8", "remote"),
]
STAGE_NAMES = [s[0] for s in STAGES]
WRITE_KINDS = ("work", "shared", "git", "remote")
AUTO_STATUS = "script_verified"      # the status every factory-built page is registered with


class Unsafe(Exception):
    pass


# ------------------------------------------------------------------ small helpers
def sh(*args, check=False):
    r = subprocess.run(list(args), cwd=ROOT, capture_output=True, text=True)
    if check and r.returncode:
        raise Unsafe("%s failed: %s" % (" ".join(args), r.stderr.strip()))
    return r


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def now():
    return datetime.datetime.now().isoformat(timespec="seconds")


def manifest():
    return load(MANIFEST)


def words(text):
    stop = {"and", "the", "of", "a", "an", "in", "on", "to", "for", "with", "by", "from", "its", "at", "as", "or", "vs"}
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 2 and w not in stop}


# ------------------------------------------------------------------ fingerprint (dry-run guard)
def fingerprint():
    """sha256 over every tracked and untracked-not-ignored file's path and bytes, plus git HEAD.
    .tmp/ is ignored, so batch state never counts as a change."""
    files = sh("git", "ls-files", "-z", "--cached", "--others", "--exclude-standard", check=True).stdout.split("\0")
    h = hashlib.sha256()
    h.update(sh("git", "rev-parse", "HEAD", check=True).stdout.encode())
    for f in sorted(x for x in files if x):
        p = os.path.join(ROOT, f)
        h.update(f.encode() + b"\0")
        if os.path.isfile(p):
            with open(p, "rb") as fh:
                h.update(hashlib.sha256(fh.read()).digest())
        else:
            h.update(b"<deleted>")
    return h.hexdigest()


# ------------------------------------------------------------------ sources
def check_source(src):
    """-> dict(kind, ref, ok, note). Local files are opened; URLs are only classified (fetching is
    Claude's job at the source stage, with WebFetch)."""
    if not src:
        return {"kind": "none", "ref": None, "ok": False, "note": "no source given"}
    ref = src if isinstance(src, str) else src.get("path") or src.get("url")
    pages = None if isinstance(src, str) else src.get("pages")
    if isinstance(src, str) and "#" in src:
        ref, frag = src.split("#", 1)
        pages = frag.replace("page=", "").replace("p", "")
    if re.match(r"^https?://", ref or ""):
        return {"kind": "url", "ref": ref, "pages": pages, "ok": None, "note": "fetch at source_accessible (WebFetch); record the exact URL"}
    p = ref if os.path.isabs(ref) else os.path.join(ROOT, ref)
    if not os.path.exists(p):
        return {"kind": "local", "ref": ref, "pages": pages, "ok": False, "note": "not found"}
    kind = "folder" if os.path.isdir(p) else ("pdf" if p.lower().endswith(".pdf") else "file")
    note = "readable"
    if kind == "pdf":
        n = pdf_pages(p)
        note = "readable, %d pages" % n if n else "readable"
        wanted = [int(x) for x in re.findall(r"\d+", str(pages or ""))]
        if n and any(w < 1 or w > n for w in wanted):
            return {"kind": kind, "ref": ref, "pages": pages, "ok": False,
                    "note": "page %s is outside the PDF (%d pages)" % (pages, n)}
    rel = os.path.relpath(p, ROOT)
    if not rel.startswith(".."):
        tracked = sh("git", "ls-files", "--error-unmatch", rel).returncode == 0
        ignored = sh("git", "check-ignore", "-q", rel).returncode == 0
        if kind == "pdf" and (tracked or not ignored):
            return {"kind": kind, "ref": ref, "pages": pages, "ok": False,
                    "note": "a PDF inside the repository that git would commit - move it to papers/ first"}
        note += " (private: git-ignored)" if ignored else ""
    return {"kind": kind, "ref": ref, "pages": pages, "ok": True, "note": note}


VENV_PY = os.path.join(ROOT, "tests", ".venv", "bin", "python3")
PAGES_DIR = os.path.join(STATE_ROOT, "pages")      # rendered source pages: git-ignored, never deployed


def _pdfium():
    try:
        import pypdfium2
        return pypdfium2
    except ImportError:
        return None


def pdf_reader():
    """-> (name, detail) of the PDF page renderer available to the source stages, or (None, why).
    pypdfium2 in the project venv (tests/requirements.txt) is the portable default; Poppler's
    pdftoppm is accepted if a machine happens to have it."""
    lib = _pdfium()
    if lib:
        return "pypdfium2", "pypdfium2 %s (PDFium %s) in this interpreter" % (lib.PYPDFIUM_INFO, lib.PDFIUM_INFO)
    if os.path.exists(VENV_PY):
        r = subprocess.run([VENV_PY, "-c", "import pypdfium2 as p; print(p.PYPDFIUM_INFO, p.PDFIUM_INFO)"],
                           capture_output=True, text=True)
        if r.returncode == 0:
            v = r.stdout.split()
            return "pypdfium2", "pypdfium2 %s (PDFium %s) in tests/.venv" % (v[0], v[1])
    import shutil
    if shutil.which("pdftoppm"):
        return "pdftoppm", shutil.which("pdftoppm")
    return None, "no renderer: install the project venv (tests/.venv/bin/pip install -r tests/requirements.txt)"


def pdf_pages(path):
    """Page count: PDFium when available, else the PDF's page tree; 0 if it cannot be read."""
    lib = _pdfium()
    if lib:
        try:
            doc = lib.PdfDocument(path)
            try:
                return len(doc)
            finally:
                doc.close()
        except Exception:                             # noqa: BLE001 - fall back to the page tree
            pass
    try:
        with open(path, "rb") as fh:
            data = fh.read()
    except OSError:
        return 0
    counts = [int(x) for x in re.findall(rb"/Type\s*/Pages\b[^>]*?/Count\s+(\d+)", data)]
    return max(counts) if counts else len(re.findall(rb"/Type\s*/Page(?![a-zA-Z])", data))


def render_pages(pdf, pages, out_dir=None, scale=2.0):
    """Render 1-based `pages` of `pdf` to PNG (and the page's text layer to .txt) for the source
    stages: Claude reads the PNG with the Read tool and cross-checks the text. Needs pypdfium2
    (tests/.venv). Output goes to .tmp/auto-simulation/pages/<pdf-stem>/ unless out_dir is given.
    -> list of {page, png, txt, width, height, chars}."""
    lib = _pdfium()
    if lib is None:
        raise Unsafe("pypdfium2 is not importable here - run with tests/.venv/bin/python3 "
                     "(or install: tests/.venv/bin/pip install -r tests/requirements.txt)")
    path = pdf if os.path.isabs(pdf) else os.path.join(ROOT, pdf)
    if not os.path.isfile(path):
        raise Unsafe("no such PDF: %s" % pdf)
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.splitext(os.path.basename(path))[0])
    out_dir = out_dir or os.path.join(PAGES_DIR, stem)
    os.makedirs(out_dir, exist_ok=True)
    doc = lib.PdfDocument(path)
    out = []
    try:
        n = len(doc)
        for pg in pages:
            if not 1 <= pg <= n:
                raise Unsafe("page %d is outside %s (%d pages)" % (pg, os.path.basename(path), n))
            page = doc[pg - 1]
            try:
                img = page.render(scale=scale).to_pil()
                png = os.path.join(out_dir, "p%03d.png" % pg)
                img.save(png)
                tp = page.get_textpage()
                try:
                    text = tp.get_text_range()
                finally:
                    tp.close()
                txt = os.path.join(out_dir, "p%03d.txt" % pg)
                with open(txt, "w", encoding="utf-8") as fh:
                    fh.write(text)
                out.append({"page": pg, "png": png, "txt": txt, "width": img.width, "height": img.height,
                            "chars": len(text.strip())})
            finally:
                page.close()
    finally:
        doc.close()
    return out


# ------------------------------------------------------------------ planning
def question_id(item):
    exam = (item.get("exam") or "").strip().lower()
    if exam not in ("jee advanced", "adv", "jee adv"):
        raise Unsafe("no ID scheme for exam %r yet - IDs are ADV-<YEAR>-P<n>-<SUBJ>-Q<NN> only" % item.get("exam"))
    subj = SUBJ.get((item.get("subject") or "").strip().lower())
    if not subj:
        raise Unsafe("unknown subject %r" % item.get("subject"))
    try:
        year, paper, q = int(item["year"]), int(item["paper"]), int(item["question"])
    except (KeyError, TypeError, ValueError):
        raise Unsafe("a question item needs integer year, paper and question")
    sid = "ADV-%d-P%d-%s-Q%02d" % (year, paper, subj, q)
    folder = "simulations/%d/paper-%d/%s/%s/" % (year, paper, item["subject"].strip().lower(), sid.lower())
    # Test files are tests/verify_pNqNN.py / sim_pNqNN.js - a convention from a Chemistry-only
    # library, with no subject in the name. Other subjects get the subject in the name, or
    # Physics P1 Q01 would overwrite Chemistry P1 Q01's suites.
    short = "p%dq%02d" % (paper, q) if subj == "CHE" else "p%d%sq%02d" % (paper, subj.lower(), q)
    return sid, subj, folder, short


def concept_matches(name, sims, limit=3):
    want = words(name)
    out = []
    for s in sims:
        text = " ".join([s.get("title", ""), s.get("topic", ""), " ".join(s.get("tags", [])),
                         " ".join(s.get("subtopics", [])), s.get("chapter", "")])
        have = words(text)
        if want and have:
            score = len(want & have) / len(want)
            if score >= 0.5:
                out.append({"id": s["id"], "score": round(score, 2), "title": s.get("shortTitle") or s.get("title")})
    return sorted(out, key=lambda x: -x["score"])[:limit]


def plan_item(n, item, sims, ids):
    t = (item.get("type") or "").lower()
    it = {"n": n, "type": t, "input": item, "blockers": [], "warnings": [], "files": [], "tests": [],
          "sources": {}, "skills": ["prayogx-new-simulation", "prayogx-validate", "prayogx-register", "prayogx-design-system"]}
    if t == "question":
        try:
            sid, subj, folder, short = question_id(item)
        except Unsafe as e:
            it["id"] = None
            it["blockers"].append({"kind": "source", "detail": str(e)})
            return it
        it.update(id=sid, folder=folder, subject=subj)
        if sid in ids:
            it["duplicate"] = {"id": sid, "folder": folder}
            it["blockers"].append({"kind": "duplicate", "detail": "%s already exists - not rebuilt; changing it needs the owner to name it (prayogx-review-existing)" % sid})
            return it
        if subj != "CHE":
            it["warnings"].append("test files named %s (subject in the name, so they cannot collide with Chemistry's pNqNN suites)" % short)
        for role in ("questionSource", "solutionSource"):
            it["sources"][role] = check_source(item.get(role))
        if it["sources"]["questionSource"]["ok"] is False:
            it["blockers"].append({"kind": "source", "detail": "question source: %s" % it["sources"]["questionSource"]["note"]})
        if not item.get("solutionSource"):
            it["warnings"].append("no solution source given: the official key must be found in the question source or the item stops at solution_verified")
        elif it["sources"]["solutionSource"]["ok"] is False:
            it["blockers"].append({"kind": "source", "detail": "solution source: %s" % it["sources"]["solutionSource"]["note"]})
        it["files"] = [folder + "index.html", folder + "meta.json", folder + "question.md",
                       "tests/verify_%s.py" % short, "tests/sim_%s.js" % short]
        it["tests"] = ["tests/verify_%s.py" % short, "tests/sim_%s.js" % short]
        taken = [f for f in it["files"] if os.path.exists(os.path.join(ROOT, f))]
        if taken:
            it["blockers"].append({"kind": "decision", "detail": "would overwrite existing file(s): %s" % ", ".join(taken)})
    elif t == "concept":
        name = item.get("concept") or ""
        subj = SUBJ.get((item.get("subject") or "").strip().lower())
        it.update(id=None, concept=name, subject=subj)
        if not name or not subj:
            it["blockers"].append({"kind": "source", "detail": "a concept item needs a concept name and a subject (Physics / Chemistry / Mathematics)"})
            return it
        try:
            cid = schema.concept_id(subj, item.get("slug") or name)
        except ValueError as e:
            it["blockers"].append({"kind": "source", "detail": str(e)})
            return it
        folder = schema.concept_folder(cid)
        short = cid.lower().replace("-", "_")
        it.update(id=cid, folder=folder)
        if cid in ids:
            it["duplicate"] = {"id": cid, "folder": folder}
            it["blockers"].append({"kind": "duplicate", "detail": "%s already exists - not rebuilt; for a materially different treatment give the item its own \"slug\"" % cid})
            return it
        it["files"] = [folder + "index.html", folder + "meta.json", folder + "concept.md",
                       "tests/verify_%s.py" % short, "tests/sim_%s.js" % short]
        it["tests"] = it["files"][3:]
        taken = [f for f in it["files"] if os.path.exists(os.path.join(ROOT, f))]
        if taken:
            it["blockers"].append({"kind": "decision", "detail": "would overwrite existing file(s): %s" % ", ".join(taken)})
        it["sources"]["conceptSource"] = check_source(item.get("source"))
        if it["sources"]["conceptSource"]["ok"] is False:
            it["blockers"].append({"kind": "source", "detail": "concept source: %s" % it["sources"]["conceptSource"]["note"]})
        near = concept_matches(name, sims)
        if near:
            it["nearDuplicates"] = near
            it["warnings"].append("similar pages exist: %s - build only if the new treatment is materially different" %
                                  ", ".join("%s (%.0f%%)" % (x["id"], 100 * x["score"]) for x in near))
        if not schema.CONCEPT_PUBLISHABLE:
            it["blockers"].append({"kind": "decision", "atStage": "commit_complete",
                                   "detail": "concept pages can be built, validated and registered as draft, but not published "
                                   "until the website, the app and the crawlable pages render concepts (pipeline §3)"})
    else:
        it["id"] = None
        it["blockers"].append({"kind": "source", "detail": "unknown item type %r (question | concept)" % item.get("type")})
        return it
    subj = it.get("subject")
    if subj in SUBJ_SKILL:
        it["skills"].insert(1, SUBJ_SKILL[subj])
    elif subj == "PHY":
        it["warnings"].append("no physics doctrine skill yet: use the physics gates in docs/AUTO_SIMULATION_PIPELINE.md §5")
    elif subj == "MAT":
        it["blockers"].append({"kind": "decision", "detail": "no verifier doctrine for mathematics - define it before a production build"})
    return it


def make_batch(spec, state_root=STATE_ROOT, stamp=None):
    mode = spec.get("mode", "dry-run")
    if mode not in ("dry-run", "production"):
        raise Unsafe("mode must be dry-run or production")
    items = spec.get("items") or []
    if not items:
        raise Unsafe("the spec has no items")
    man = manifest()
    sims = man["simulations"]
    ids = {s["id"] for s in sims}
    plan, seen = [], {}
    for n, item in enumerate(items, start=1):
        it = plan_item(n, item, sims, ids)
        if it.get("id"):
            if it["id"] in seen:
                it["blockers"].append({"kind": "duplicate", "detail": "the batch lists %s twice (item %d)" % (it["id"], seen[it["id"]])})
            seen.setdefault(it["id"], n)
        plan.append(it)
    stamp = stamp or datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    bdir = os.path.join(state_root, "batch-" + stamp)
    if os.path.exists(bdir):
        raise Unsafe("%s already exists" % bdir)
    batch = {"created": now(), "mode": mode, "continueOnBlocked": bool(spec.get("continueOnBlocked")),
             "visualDirection": spec.get("visualDirection"), "items": [p["n"] for p in plan],
             "fingerprint": fingerprint(), "head": sh("git", "rev-parse", "HEAD").stdout.strip(),
             "librarySize": len(sims)}
    save(os.path.join(bdir, "batch.json"), batch)
    for it in plan:
        it["stages"] = {}
        it["status"] = "pending"
        it["failure"] = None
        if any(b["kind"] == "duplicate" for b in it["blockers"]):
            it["status"] = "skipped-duplicate"
        elif any(b["kind"] == "source" for b in it["blockers"]):
            # known at planning: the item is blocked before it starts (failure policy B)
            src = [b["detail"] for b in it["blockers"] if b["kind"] == "source"]
            it["status"] = "blocked"
            it["failure"] = {"stage": "source_accessible", "kind": "source", "detail": "; ".join(src), "attempts": [], "at": now()}
        save(os.path.join(bdir, "item-%03d" % it["n"], "state.json"), it)
    return bdir


def items_of(bdir):
    b = load(os.path.join(bdir, "batch.json"))
    return b, [load(os.path.join(bdir, "item-%03d" % n, "state.json")) for n in b["items"]]


def save_item(bdir, it):
    save(os.path.join(bdir, "item-%03d" % it["n"], "state.json"), it)


# ------------------------------------------------------------------ preflight (production gates)
def preflight(online=False):
    gates = []

    def gate(name, ok, detail):
        gates.append({"gate": name, "ok": bool(ok), "detail": detail})

    values = schema.STATUS_VALUES
    gate("publish status for unreviewed pages", AUTO_STATUS in values and schema.DEFAULT_STATUS != AUTO_STATUS,
         "%s is a registry status (factory pages are never human_verified)" % AUTO_STATUS if AUTO_STATUS in values
         else "%s missing from registry_schema.STATUS_VALUES" % AUTO_STATUS)
    st = sh("git", "status", "--porcelain").stdout.strip()
    gate("working tree clean", not st, st.splitlines()[0] + (" ..." if st.count("\n") else "") if st else "clean")
    br = sh("git", "symbolic-ref", "--short", "HEAD").stdout.strip()
    gate("on main", br == "main", br)
    ahead = sh("git", "rev-list", "--count", "origin/main..HEAD").stdout.strip()
    behind = sh("git", "rev-list", "--count", "HEAD..origin/main").stdout.strip()
    gate("nothing unpushed before the batch starts", ahead == "0", "ahead %s of the local origin/main" % ahead)
    gate("not behind origin/main (local ref)", behind == "0", "behind %s" % behind)
    if online:
        remote = sh("git", "ls-remote", "--heads", "origin", "main").stdout.split()
        local = sh("git", "rev-parse", "origin/main").stdout.strip()
        gate("GitHub main equals the local origin/main", remote and remote[0] == local,
             "remote %s, local %s" % (remote[0][:7] if remote else "?", local[:7]))
    wf = open(os.path.join(ROOT, ".github", "workflows", "static.yml"), encoding="utf-8").read()
    need = ["./papers", "./tools", "./tests", "./docs", "./CLAUDE.md", "./.claude", "./app", "./data/tracker.csv"]
    miss = [x for x in need if "--exclude='%s'" % x not in wf]
    gate("deploy exclusions intact", not miss, "missing: %s" % ", ".join(miss) if miss else "papers, tools, tests, docs, CLAUDE.md, .claude, app, tracker.csv")
    gate(".tmp/ (batch state) is git-ignored", sh("git", "check-ignore", "-q", ".tmp/x").returncode == 0, ".tmp/")
    gate("papers/ is git-ignored", sh("git", "check-ignore", "-q", "papers/x.pdf").returncode == 0, "papers/")
    name, detail = pdf_reader()
    gate("PDF page reader for exam papers (pypdfium2 or pdftoppm)", name, detail)
    py = os.path.join(ROOT, "tests", ".venv", "bin", "python3")
    gate("science toolchain (tests/.venv)", os.path.exists(py), py if os.path.exists(py) else "missing - see tests/README.md")
    gate("browser toolchain (tests/node_modules/playwright)",
         os.path.isdir(os.path.join(ROOT, "tests", "node_modules", "playwright")), "Playwright via tests/_browser.js")
    return gates


# ------------------------------------------------------------------ state machine
def next_stage(it):
    for s in STAGE_NAMES:
        if s not in it["stages"]:
            return s
    return None


def advance(bdir, n, stage, evidence, commit=None):
    b, items = items_of(bdir)
    if stage not in STAGE_NAMES:
        raise Unsafe("unknown stage %r" % stage)
    it = next((x for x in items if x["n"] == n), None)
    if not it:
        raise Unsafe("no item %d" % n)
    if it["status"] in ("complete", "failed", "blocked", "skipped-duplicate"):
        raise Unsafe("item %d is %s" % (n, it["status"]))
    for x in items:                       # strictly sequential: earlier items must be finished
        if x["n"] < n and x["status"] not in ("complete", "blocked", "skipped-duplicate"):
            raise Unsafe("item %d is still %s - finish it before item %d" % (x["n"], x["status"], n))
        if x["n"] < n and x["status"] == "blocked" and not b["continueOnBlocked"]:
            raise Unsafe("item %d is blocked and the batch does not continue past blocked items" % x["n"])
    want = next_stage(it)
    if stage != want:
        raise Unsafe("item %d: next stage is %s, not %s" % (n, want, stage))
    kind = dict((s[0], s[3]) for s in STAGES)[stage]
    for x in it.get("blockers", []):
        if x["kind"] == "decision" and (x.get("atStage") == stage or (not x.get("atStage") and kind in WRITE_KINDS)
                                        or (x.get("atStage") and STAGE_NAMES.index(stage) > STAGE_NAMES.index(x["atStage"]))):
            raise Unsafe("item %d is blocked at %s: %s" % (n, stage, x["detail"]))
    if b["mode"] == "dry-run" and kind in WRITE_KINDS:
        raise Unsafe("dry-run batch: %s is a %s stage and cannot be completed" % (stage, kind))
    if kind != "read" and not (evidence or "").strip():
        raise Unsafe("%s needs evidence (a pass count, a path, a hash, a URL)" % stage)
    if stage == "commit_complete":
        if not commit or sh("git", "cat-file", "-e", commit + "^{commit}").returncode:
            raise Unsafe("commit_complete needs --commit with a hash that exists")
    rec = {"at": now(), "evidence": evidence}
    if commit:
        rec["commit"] = sh("git", "rev-parse", commit).stdout.strip()
    it["stages"][stage] = rec
    it["status"] = "complete" if stage == "item_complete" else "in-progress"
    save_item(bdir, it)
    return it


def fail(bdir, n, stage, kind, detail, attempts=None):
    b, items = items_of(bdir)
    it = next((x for x in items if x["n"] == n), None)
    if not it:
        raise Unsafe("no item %d" % n)
    if kind not in ("recoverable", "source", "critical"):
        raise Unsafe("kind must be recoverable, source or critical")
    it["failure"] = {"stage": stage, "kind": kind, "detail": detail, "attempts": attempts or [], "at": now()}
    it["status"] = {"recoverable": "in-progress", "source": "blocked", "critical": "failed"}[kind]
    save_item(bdir, it)
    if kind == "critical":
        b["stopped"] = {"item": n, "stage": stage, "detail": detail, "at": now()}
        save(os.path.join(bdir, "batch.json"), b)
    return it


def verify_claims(it):
    """Re-check claimed stages against the repository; returns a list of doubts."""
    doubts = []
    st = it["stages"]
    if "implementation_complete" in st:
        for f in it.get("files", []):
            if not os.path.exists(os.path.join(ROOT, f)):
                doubts.append("implementation_complete claimed but %s is missing" % f)
    if "registry_complete" in st and it.get("id"):
        if it["id"] not in {s["id"] for s in manifest()["simulations"]}:
            doubts.append("registry_complete claimed but %s is not in data/manifest.json" % it["id"])
    if "commit_complete" in st:
        c = st["commit_complete"].get("commit")
        if not c or sh("git", "cat-file", "-e", c + "^{commit}").returncode:
            doubts.append("commit_complete claimed but commit %s does not exist" % c)
        elif it.get("folder") and it["folder"].rstrip("/") not in sh("git", "show", "--name-only", "--format=", c).stdout:
            doubts.append("commit %s does not touch %s" % (c[:7], it["folder"]))
    if "push_complete" in st:
        c = st.get("commit_complete", {}).get("commit")
        if not c or sh("git", "merge-base", "--is-ancestor", c, "origin/main").returncode:
            doubts.append("push_complete claimed but the commit is not in origin/main (local ref)")
    return doubts


def resume(bdir):
    b, items = items_of(bdir)
    out = []
    for it in items:
        d = verify_claims(it)
        out.append({"n": it["n"], "id": it.get("id") or it.get("concept"), "status": it["status"],
                    "done": len(it["stages"]), "next": None if it["status"] != "in-progress" and it["status"] != "pending" else next_stage(it),
                    "doubts": d})
    return b, out


# ------------------------------------------------------------------ dry-run walk
def simulate(bdir):
    """Walk the batch in order, stage by stage, without doing anything. Shows exactly what production
    would do and where it would stop. Returns the transcript lines and the per-item outcome."""
    b, items = items_of(bdir)
    lines, outcome, stop = [], [], None
    for it in items:
        label = "%03d %s %s" % (it["n"], it["type"], it.get("id") or it.get("concept"))
        if stop:
            lines.append("%s: NOT STARTED - batch stopped at item %d (%s)" % (label, stop[0], stop[1]))
            outcome.append((it["n"], "not-started"))
            continue
        if it["status"] == "skipped-duplicate":
            lines.append("%s: SKIPPED - %s" % (label, it["blockers"][0]["detail"]))
            outcome.append((it["n"], "skipped-duplicate"))
            continue
        lines.append("%s: START" % label)
        src_block = [x for x in it["blockers"] if x["kind"] == "source"]
        dec_block = [x for x in it["blockers"] if x["kind"] == "decision"]
        ended = None
        for name, what, where, kind in STAGES:
            if name in ("source_accessible",) and src_block:
                lines.append("    %-34s BLOCKED (source): %s" % (name, src_block[0]["detail"]))
                ended = ("blocked", "source")
                break
            hit = [x for x in dec_block if (x.get("atStage") == name) or (not x.get("atStage") and kind in WRITE_KINDS)]
            if hit and b["mode"] == "production":
                lines.append("    %-34s BLOCKED (decision): %s" % (name, hit[0]["detail"]))
                ended = ("blocked", "decision")
                break
            tag = "would do" if kind == "read" else ("would write" if kind in ("work", "shared") else
                                                     "would run" if kind == "check" else "would %s" % ("commit" if kind == "git" else "push/deploy/sync"))
            lines.append("    %-34s %-12s %s  [%s]" % (name, tag, what, where))
        if ended:
            outcome.append((it["n"], "blocked"))
            if not b["continueOnBlocked"]:
                stop = (it["n"], "blocked, and continueOnBlocked is false")
            lines.append("%s: BLOCKED" % label)
        else:
            for x in dec_block:
                lines.append("    note: production would stop at %s: %s" % (x.get("atStage") or "implementation_complete", x["detail"]))
            for w in it["warnings"]:
                lines.append("    warning: %s" % w)
            lines.append("%s: PLANNED END TO END (dry run: nothing written)" % label)
            outcome.append((it["n"], "planned" if not dec_block else "planned-but-blocked-in-production"))
    return lines, outcome


# ------------------------------------------------------------------ trace an existing simulation
def trace(sid, run=False, online=False):
    man = manifest()
    sim = next((s for s in man["simulations"] if s["id"] == sid), None)
    if not sim:
        raise Unsafe("%s is not in data/manifest.json" % sid)
    m = re.match(r"ADV-\d{4}-P(\d+)-([A-Z]{3})-Q(\d+)", sid)
    short = ("p%sq%02d" if m.group(2) == "CHE" else "p%%s%sq%%02d" % m.group(2).lower()) % (m.group(1), int(m.group(3)))
    folder = sim["folder"]
    rows = []

    def ev(stage, ok, detail):
        rows.append({"stage": stage, "ok": bool(ok), "evidence": detail})

    qmd = open(os.path.join(ROOT, folder, "question.md"), encoding="utf-8").read()
    page = open(os.path.join(ROOT, sim["path"]), encoding="utf-8").read()
    meta = load(os.path.join(ROOT, folder, "meta.json"))
    methods = " ".join(meta.get("verification", {}).get("methods", []))
    src = meta.get("source", {})
    ev("input_received", True, "manifest entry %s, folder %s" % (sid, folder))
    ev("source_accessible", src.get("file"), "%s page %s (%s)" % (src.get("file"), src.get("page"),
       "present locally" if os.path.exists(os.path.join(ROOT, src.get("file", "?"))) else "not on this machine - private papers/"))
    ev("source_verified", all(k in meta for k in ("exam", "year", "paper", "section", "questionNumber", "marking")),
       "%s %s %s %s Q%s, marking %s" % (meta.get("exam"), meta.get("year"), meta.get("paper"), meta.get("section"), meta.get("questionNumber"), meta.get("marking")))
    ev("question_or_concept_verified", "## Question (verbatim)" in qmd, "question.md: Question (verbatim)")
    key = re.search(r"Answer key[^|]*\|([^|\n]+)", qmd)
    ev("solution_verified", key or "key" in methods.lower(), (key.group(1).strip() if key else "official key cited in verification.methods"))
    indep = re.search(r"Independent derivation[^|]*\|([^|\n]+)", qmd) or re.search(r"[Ss]olved independently[^\"]{0,80}", methods)
    ev("independent_solve_complete", indep, (indep.group(1) if indep and indep.groups() else indep.group(0) if indep else "not recorded").strip())
    ev("scientific_verification_complete", meta.get("verification", {}).get("status") == "verified" and str(meta.get("answer")) in qmd,
       "verification.status %s, answer %s agrees in question.md" % (meta.get("verification", {}).get("status"), meta.get("answer")))
    ev("learning_objectives_complete", meta.get("concepts") and re.search(r"takeaway", page, re.I),
       "%d concepts in meta; takeaways section on the page" % len(meta.get("concepts", [])))
    ev("design_complete", meta.get("interactivity"), "%d interactivity notes in meta" % len(meta.get("interactivity", [])))
    selfc = not re.search(r"\bfetch\(|localStorage|sessionStorage|<script[^>]+src=|<link[^>]+href=\"https?:", page)
    ev("implementation_complete", selfc and ('name="sim-id" content="%s"' % sid) in page and "window.PX" in page,
       "self-contained %s, sim-id meta %s, window.PX hooks %s (%d bytes)" % (selfc, ('name="sim-id" content="%s"' % sid) in page, "window.PX" in page, len(page.encode())))
    vpath, spath = "tests/verify_%s.py" % short, "tests/sim_%s.js" % short
    stxt = open(os.path.join(ROOT, spath), encoding="utf-8").read() if os.path.exists(os.path.join(ROOT, spath)) else ""
    ev("visual_qa_complete", stxt, ("page suite exists; " if stxt else "no page suite; ") + "screenshots are a manual look (not recorded in the repo)")
    vres = spres = None
    if run:
        py = os.path.join(ROOT, "tests", ".venv", "bin", "python3")
        vres = subprocess.run([py if os.path.exists(py) else sys.executable, vpath], cwd=ROOT, capture_output=True, text=True).stdout.strip().splitlines()[-1:]
        spres = [l for l in subprocess.run(["node", spath], cwd=ROOT, capture_output=True, text=True).stdout.splitlines() if re.match(r"^\d+ / \d+ passed", l)][-1:]
    ev("scientific_qa_complete", os.path.exists(os.path.join(ROOT, vpath)) and (not run or (vres and " 0 failed" in vres[0])),
       "%s%s" % (vpath, " -> " + vres[0] if vres else (" (exists; --run executes it)" if os.path.exists(os.path.join(ROOT, vpath)) else " MISSING")))
    ok_sp = not run or (spres and spres[0].split(" / ")[0] == spres[0].split(" / ")[1].split()[0])
    ev("browser_qa_complete", stxt and ok_sp, "%s%s" % (spath, " -> " + spres[0] if spres else (" (exists; --run executes it)" if stxt else " MISSING")))
    ev("mobile_qa_complete", all(x in stxt for x in ("390", "360")) and "reducedMotion" in stxt,
       "suite checks 390 / 360 px and reduced motion" if stxt else "no page suite")
    man_entry = meta == sim
    tax = load(os.path.join(ROOT, "data", "taxonomy.json"))
    in_tax = sim.get("chapter", "") in json.dumps(tax, ensure_ascii=False)
    with open(os.path.join(ROOT, "data", "tracker.csv"), encoding="utf-8", newline="") as fh:
        in_csv = any(r and r[0] == sid for r in csv.reader(fh))
    readme = sid in open(os.path.join(ROOT, "README.md"), encoding="utf-8").read()
    runall = vpath.split("/")[1] in open(os.path.join(ROOT, "tests", "runall.sh"), encoding="utf-8").read()
    ev("registry_complete", man_entry and in_tax and in_csv and runall,
       "meta==manifest %s, taxonomy %s, tracker.csv %s, runall.sh %s, README %s" % (man_entry, in_tax, in_csv, runall, readme))
    if run:
        cl = sh(sys.executable, "tools/check_library.py").returncode == 0
        pa = sh(sys.executable, "tools/production_audit.py").returncode == 0
        ev("production_audit_complete", cl and pa, "check_library %s, production_audit %s" % ("ok" if cl else "FAILED", "ok" if pa else "FAILED"))
    else:
        ev("production_audit_complete", True, "run with --run to execute check_library + production_audit")
    commits = sh("git", "log", "--format=%h %s", "--", folder).stdout.strip().splitlines()
    ev("commit_complete", commits, "; ".join(reversed(commits)))
    first = sh("git", "log", "--format=%H", "--", folder).stdout.split()
    pushed = first and sh("git", "merge-base", "--is-ancestor", first[0], "origin/main").returncode == 0
    ev("push_complete", pushed, "latest commit %s in origin/main (local ref): %s" % (first[0][:7] if first else "?", bool(pushed)))
    published = sim.get("status", "human_verified") != "draft"
    feed = [os.path.exists(os.path.join(ROOT, p)) for p in ("content/sims/%s.json" % sid, "s/%s/index.html" % sid)]
    in_map = sid in open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
    in_lock = sid in open(os.path.join(ROOT, "data", "revisions.json"), encoding="utf-8").read()
    ev("deployment_complete", published and all(feed) and in_map and in_lock,
       "published %s, feed %s, s/ page %s, sitemap %s, revision lock %s" % (published, feed[0], feed[1], in_map, in_lock))
    if online:
        res = smoke(sid)
        ev("live_smoke_test_complete", all(r["ok"] for r in res), "; ".join("%s %s" % (r["check"], "ok" if r["ok"] else "FAIL") for r in res))
    else:
        ev("live_smoke_test_complete", True, "run with --online for the live checks")
    t = man["library"].get("tracker", {})
    ev("item_complete", published and "Reviewed and approved by the owner" in qmd,
       "owner review recorded in question.md: %s; tracker Sheet recorded rows %s (syncedAt %s)" %
       ("Reviewed and approved by the owner" in qmd, t.get("rows"), t.get("syncedAt")))
    feed_status = load(os.path.join(ROOT, "content", "sims", "%s.json" % sid)).get("status") if feed[0] else None
    return {"id": sid, "feedStatus": feed_status, "ownerReview": "Reviewed and approved by the owner" in qmd, "stages": rows}


# ------------------------------------------------------------------ live smoke (HTTP)
def smoke(sid, base=LIVE, fetch=None):
    """Read-only HTTP checks against the live site. `fetch(url) -> (status, bytes)` can be injected."""
    def real_fetch(url):
        req = urllib.request.Request(url + ("&" if "?" in url else "?") + "nc=%d" % int(datetime.datetime.now().timestamp()),
                                     headers={"User-Agent": "prayogx-smoke"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, b""
        except Exception as e:                      # noqa: BLE001 - network failure is a smoke failure
            return 0, str(e).encode()
    fetch = fetch or real_fetch
    man = manifest()
    sim = next((s for s in man["simulations"] if s["id"] == sid), None)
    if not sim:
        raise Unsafe("%s is not in data/manifest.json" % sid)
    local_cat = load(os.path.join(ROOT, "content", "catalog.json"))
    res = []

    def chk(name, ok, detail=""):
        res.append({"check": name, "ok": bool(ok), "detail": detail})

    s, body = fetch(base + "/")
    chk("site responds", s == 200, s)
    s, body = fetch(base + "/content/catalog.json")
    try:
        cat = json.loads(body)
    except ValueError:
        cat = {}
    chk("live feed is this build's version", cat.get("version") == local_cat.get("version"), "%s vs %s" % (cat.get("version"), local_cat.get("version")))
    s, body = fetch(base + "/content/index.json")
    chk("catalogue lists the item", sid.encode() in body, s)
    s, body = fetch(base + "/content/sims/%s.json" % sid)
    try:
        det = json.loads(body)
    except ValueError:
        det = {}
    chk("item metadata loads", s == 200 and det.get("id") == sid, s)
    chk("item metadata answer matches the registry", str(det.get("answer")) == str(sim.get("answer")), "%s vs %s" % (det.get("answer"), sim.get("answer")))
    s, body = fetch(base + "/" + sim["path"])
    chk("simulation page responds", s == 200 and ('content="%s"' % sid).encode() in body, s)
    s, body = fetch(base + "/s/%s/" % sid)
    chk("crawlable page responds", s == 200, s)
    s, body = fetch(base + "/sitemap.xml")
    chk("sitemap lists the item", sid.encode() in body, s)
    for p in ("CLAUDE.md", ".claude/skills/prayogx-auto-simulation/SKILL.md", "data/tracker.csv", "tools/auto_sim.py"):
        s, _ = fetch(base + "/" + p)
        chk("private file not deployed: " + p, s == 404, s)
    return res


# ------------------------------------------------------------------ CLI
def print_report(bdir):
    b, items = items_of(bdir)
    print("batch %s  mode %s  continueOnBlocked %s" % (os.path.basename(bdir), b["mode"], b["continueOnBlocked"]))
    print("%-4s %-8s %-22s %-18s %-7s %-7s %s" % ("ITEM", "TYPE", "ID", "STATUS", "SCIENCE", "TESTS", "DEPLOYMENT"))
    tally = {"total": 0, "completed": 0, "blocked": 0, "skipped": 0, "failed": 0, "deployed": 0}
    for it in items:
        st = it["stages"]
        sci = "PASS" if "scientific_qa_complete" in st else ("SOURCE" if it["status"] == "blocked" else "--")
        tests = "PASS" if "production_audit_complete" in st else "--"
        dep = "LIVE" if "live_smoke_test_complete" in st else "NOT DEPLOYED"
        print("%-4s %-8s %-22s %-18s %-7s %-7s %s" % ("%02d" % it["n"], it["type"], (it.get("id") or it.get("concept") or "?")[:22],
                                                    it["status"].upper(), sci, tests, dep))
        tally["total"] += 1
        tally["completed"] += it["status"] == "complete"
        tally["blocked"] += it["status"] == "blocked"
        tally["skipped"] += it["status"] == "skipped-duplicate"
        tally["failed"] += it["status"] == "failed"
        tally["deployed"] += dep == "LIVE"
    print("TOTAL %(total)d  COMPLETED %(completed)d  BLOCKED %(blocked)d  SKIPPED (duplicate) %(skipped)d  FAILED %(failed)d  DEPLOYED %(deployed)d  NOT DEPLOYED %(nd)d"
          % dict(tally, nd=tally["total"] - tally["deployed"]))
    if b.get("stopped"):
        print("BATCH STOPPED at item %(item)d, %(stage)s: %(detail)s" % b["stopped"])


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("plan"); p.add_argument("spec"); p.add_argument("--state-root", default=STATE_ROOT)
    p = sub.add_parser("preflight"); p.add_argument("--online", action="store_true")
    for c in ("simulate", "guard", "resume", "report"):
        sub.add_parser(c).add_argument("batch")
    p = sub.add_parser("advance"); p.add_argument("batch"); p.add_argument("item", type=int); p.add_argument("stage")
    p.add_argument("--evidence", default=""); p.add_argument("--commit")
    p = sub.add_parser("fail"); p.add_argument("batch"); p.add_argument("item", type=int); p.add_argument("stage")
    p.add_argument("--kind", required=True); p.add_argument("--detail", required=True)
    p = sub.add_parser("trace"); p.add_argument("id"); p.add_argument("--run", action="store_true"); p.add_argument("--online", action="store_true")
    p = sub.add_parser("smoke"); p.add_argument("id"); p.add_argument("--base", default=LIVE)
    p = sub.add_parser("render"); p.add_argument("pdf"); p.add_argument("--pages", required=True, help="e.g. 35 or 34-35 or 1,3")
    p.add_argument("--out"); p.add_argument("--scale", type=float, default=2.0)
    a = ap.parse_args(argv)
    try:
        if a.cmd == "plan":
            bdir = make_batch(load(a.spec), a.state_root)
            print(bdir)
            _, items = items_of(bdir)
            for it in items:
                print("  %03d %-8s %-22s %s" % (it["n"], it["type"], it.get("id") or it.get("concept"), it["status"]))
                for x in it["blockers"]:
                    print("        blocker (%s): %s" % (x["kind"], x["detail"]))
                for w in it["warnings"]:
                    print("        warning: %s" % w)
                for f in it["files"]:
                    print("        would create %s" % f)
        elif a.cmd == "preflight":
            gates = preflight(a.online)
            for g in gates:
                print("  %-4s %-48s %s" % ("ok" if g["ok"] else "FAIL", g["gate"], g["detail"]))
            bad = [g for g in gates if not g["ok"]]
            print("PRODUCTION %s" % ("ALLOWED" if not bad else "BLOCKED (%d gate%s)" % (len(bad), "s" if len(bad) > 1 else "")))
            return 1 if bad else 0
        elif a.cmd == "simulate":
            lines, _ = simulate(a.batch)
            print("\n".join(lines))
        elif a.cmd == "guard":
            b, _ = items_of(a.batch)
            same = fingerprint() == b["fingerprint"]
            print("dry run changed nothing in the repository" if same else "THE REPOSITORY CHANGED since the batch was planned")
            return 0 if same else 1
        elif a.cmd == "advance":
            it = advance(a.batch, a.item, a.stage, a.evidence, a.commit)
            print("item %d: %s done; next %s" % (it["n"], a.stage, next_stage(it)))
        elif a.cmd == "fail":
            it = fail(a.batch, a.item, a.stage, a.kind, a.detail)
            print("item %d: %s at %s (%s)" % (it["n"], it["status"].upper(), a.stage, a.kind))
        elif a.cmd == "resume":
            b, out = resume(a.batch)
            bad = False
            for r in out:
                print("  %03d %-22s %-18s %2d stages done  next: %s" % (r["n"], r["id"], r["status"], r["done"], r["next"]))
                for d in r["doubts"]:
                    bad = True
                    print("        DOUBT: " + d)
            if b.get("stopped"):
                print("BATCH STOPPED at item %(item)d: %(detail)s" % b["stopped"])
            return 1 if bad else 0
        elif a.cmd == "report":
            print_report(a.batch)
        elif a.cmd == "trace":
            t = trace(a.id, a.run, a.online)
            for r in t["stages"]:
                print("  %-4s %-34s %s" % ("ok" if r["ok"] else "--", r["stage"], r["evidence"]))
            print("feed status %s · owner review recorded %s" % (t["feedStatus"], t["ownerReview"]))
            return 0 if all(r["ok"] for r in t["stages"]) else 1
        elif a.cmd == "render":
            # the venv's python3 is a symlink to the system interpreter, so compare prefixes, not paths
            if _pdfium() is None and os.path.exists(VENV_PY) and \
                    os.path.realpath(sys.prefix) != os.path.realpath(os.path.join(ROOT, "tests", ".venv")):
                os.execv(VENV_PY, [VENV_PY, os.path.abspath(__file__)] + (argv if argv is not None else sys.argv[1:]))
            want = []
            for part in a.pages.split(","):
                lo, _, hi = part.strip().partition("-")
                want += list(range(int(lo), int(hi or lo) + 1))
            for r in render_pages(a.pdf, want, a.out, a.scale):
                print("  page %d  %s  %dx%d px  text %d chars (%s)" % (r["page"], os.path.relpath(r["png"], ROOT), r["width"], r["height"],
                                                                         r["chars"], os.path.relpath(r["txt"], ROOT)))
        elif a.cmd == "smoke":
            res = smoke(a.id, a.base)
            for r in res:
                print("  %-4s %-50s %s" % ("ok" if r["ok"] else "FAIL", r["check"], r["detail"]))
            ok = all(r["ok"] for r in res)
            print("LIVE SMOKE %s" % ("PASS" if ok else "FAIL"))
            return 0 if ok else 1
    except Unsafe as e:
        print("STOPPED: %s" % e, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
