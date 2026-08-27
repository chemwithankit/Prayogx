#!/usr/bin/env python3
"""
Validate the simulation library against the manifest.

Checks, for every entry in data/manifest.json:
  * required fields are present
  * the simulation id is unique and matches the ID convention
  * `path` and `folder` exist on disk
  * meta.json and question.md exist beside the simulation
  * meta.json agrees with the manifest entry
  * data/manifest.js is in sync with data/manifest.json
  * `counts` matches the actual simulations
  * every simulation folder on disk appears in the manifest (nothing orphaned)

Run:  python3 tools/check_library.py
Exit code 0 = clean, 1 = problems found.
It only reads; it never modifies anything.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, "data", "manifest.json")
JS_PATH = os.path.join(ROOT, "data", "manifest.js")
SIM_ROOT = os.path.join(ROOT, "simulations")

REQUIRED = ["id", "path", "folder", "title", "year", "paper", "subject",
            "questionNumber", "chapter", "topic", "tags"]
ID_RE = re.compile(r"^ADV-\d{4}-P\d+-(PHY|CHE|MAT)-Q\d{2,3}$")

problems = []
notes = []


def fail(msg):
    problems.append(msg)


def main():
    with open(JSON_PATH, encoding="utf-8") as fh:
        manifest = json.load(fh)
    sims = manifest.get("simulations", [])

    seen_ids = {}
    for sim in sims:
        sid = sim.get("id", "<no id>")

        for field in REQUIRED:
            if not sim.get(field) and sim.get(field) != 0:
                fail("%s: missing required field '%s'" % (sid, field))

        if sid in seen_ids:
            fail("%s: duplicate simulation id" % sid)
        seen_ids[sid] = True

        if not ID_RE.match(sid):
            fail("%s: id does not match ADV-<YEAR>-P<PAPER>-<SUBJ3>-Q<NN>" % sid)

        path = sim.get("path", "")
        abs_path = os.path.join(ROOT, path)
        if not path:
            fail("%s: no path" % sid)
        elif not os.path.isfile(abs_path):
            fail("%s: BROKEN PATH — %s does not exist" % (sid, path))

        folder = sim.get("folder", "")
        if folder:
            abs_folder = os.path.join(ROOT, folder)
            if not os.path.isdir(abs_folder):
                fail("%s: folder missing — %s" % (sid, folder))
            else:
                for companion in ("meta.json", "question.md"):
                    if not os.path.isfile(os.path.join(abs_folder, companion)):
                        fail("%s: %s missing in %s" % (sid, companion, folder))
                meta_file = os.path.join(abs_folder, "meta.json")
                if os.path.isfile(meta_file):
                    with open(meta_file, encoding="utf-8") as fh:
                        meta = json.load(fh)
                    for field in ("id", "path", "title", "chapter", "topic", "subject", "year"):
                        if meta.get(field) != sim.get(field):
                            fail("%s: meta.json '%s' disagrees with the manifest (%r vs %r)"
                                 % (sid, field, meta.get(field), sim.get(field)))

    # counts
    expected = {"total": len(sims), "byYear": {}, "bySubject": {}, "byChapter": {}}
    for sim in sims:
        for key, field in (("byYear", "year"), ("bySubject", "subject"), ("byChapter", "chapter")):
            value = str(sim.get(field, "unknown"))
            expected[key][value] = expected[key].get(value, 0) + 1
    if manifest.get("counts") != expected:
        fail("counts block is stale — run tools/sync_manifest.py")

    # manifest.js in sync
    if not os.path.isfile(JS_PATH):
        fail("data/manifest.js is missing — the website cannot load from file://")
    else:
        with open(JS_PATH, encoding="utf-8") as fh:
            js = fh.read()
        start, end = js.find("{"), js.rfind("}")
        if start < 0 or end < 0:
            fail("data/manifest.js is not parseable — run tools/sync_manifest.py")
        else:
            try:
                mirrored = json.loads(js[start:end + 1])
            except ValueError as exc:
                mirrored = None
                fail("data/manifest.js is not valid JSON (%s) — run tools/sync_manifest.py" % exc)
            if mirrored is not None and mirrored != manifest:
                fail("data/manifest.js is out of sync with manifest.json — run tools/sync_manifest.py")

    # orphaned simulation folders
    def norm(p):
        return os.path.normpath(p.replace("/", os.sep)).rstrip(os.sep)

    known = set(norm(s.get("folder", "")) for s in sims if s.get("folder"))
    if os.path.isdir(SIM_ROOT):
        for dirpath, _dirnames, filenames in os.walk(SIM_ROOT):
            if "index.html" in filenames:
                rel = norm(os.path.relpath(dirpath, ROOT))
                if rel not in known:
                    fail("orphan: %s has a simulation but no manifest entry" % rel)

    print("Checked %d simulation(s) in %s" % (len(sims), os.path.relpath(JSON_PATH, ROOT)))
    for note in notes:
        print("  note: %s" % note)
    if problems:
        print("\n%d problem(s):" % len(problems))
        for problem in problems:
            print("  ✗ %s" % problem)
        return 1
    print("  ✓ all paths resolve, ids unique, metadata consistent, counts and manifest.js in sync")
    return 0


if __name__ == "__main__":
    sys.exit(main())
