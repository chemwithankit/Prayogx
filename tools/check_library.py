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
  * the published content feed under content/ is present and current
  * every published simulation has a detail record, with no stale ones left over
  * no shipped simulation was edited without bumping its `revision`
  * `access` and `status` hold values the UI knows how to render

Run:  python3 tools/check_library.py
Exit code 0 = clean, 1 = problems found.
It only reads; it never modifies anything.
"""
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, "data", "manifest.json")
JS_PATH = os.path.join(ROOT, "data", "manifest.js")
LOCK_PATH = os.path.join(ROOT, "data", "revisions.json")
CONTENT = os.path.join(ROOT, "content")
SIM_ROOT = os.path.join(ROOT, "simulations")

ACCESS_VALUES = ("free", "premium", "pro")
STATUS_VALUES = ("human_verified", "draft", "deprecated")

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

    # ---------------------------------------------------------------- feed
    published = [s for s in sims if s.get("status", "human_verified") != "draft"]
    if not os.path.isdir(CONTENT):
        fail("content/ is missing - run tools/build_content.py")
    else:
        idx_file = os.path.join(CONTENT, "index.json")
        cat_file = os.path.join(CONTENT, "catalog.json")
        if not os.path.isfile(idx_file) or not os.path.isfile(cat_file):
            fail("content/index.json or content/catalog.json is missing - "
                 "run tools/build_content.py")
        else:
            with open(idx_file, encoding="utf-8") as fh:
                idx = json.load(fh)
            with open(cat_file, encoding="utf-8") as fh:
                cat = json.load(fh)
            feed_ids = set(c.get("id") for c in idx.get("simulations", []))
            man_ids = set(s.get("id") for s in published)
            for missing in sorted(man_ids - feed_ids):
                fail("%s: published but absent from content/index.json - "
                     "run tools/build_content.py" % missing)
            for extra in sorted(feed_ids - man_ids):
                fail("%s: in content/index.json but not published in the manifest" % extra)
            if cat.get("version") != idx.get("version"):
                fail("content/catalog.json and content/index.json disagree on the feed "
                     "version - run tools/build_content.py")
            if cat.get("counts", {}).get("total") != len(published):
                fail("content/catalog.json counts are stale - run tools/build_content.py")
            for sim in published:
                det = os.path.join(CONTENT, "sims", str(sim.get("id")) + ".json")
                if not os.path.isfile(det):
                    fail("%s: no detail record at content/sims/%s.json"
                         % (sim.get("id"), sim.get("id")))
            simdir = os.path.join(CONTENT, "sims")
            if os.path.isdir(simdir):
                for fn in sorted(os.listdir(simdir)):
                    if fn.endswith(".json") and fn[:-5] not in man_ids:
                        fail("stale detail record content/sims/%s - it is no longer "
                             "published; delete it" % fn)

    # ------------------------------------------------- revision discipline
    if not os.path.isfile(LOCK_PATH):
        notes.append("data/revisions.json not found - run tools/build_content.py to create it")
    else:
        with open(LOCK_PATH, encoding="utf-8") as fh:
            lock = json.load(fh)
        for sim in published:
            sid, rel = sim.get("id"), sim.get("path", "")
            abs_path = os.path.join(ROOT, rel)
            if not rel or not os.path.isfile(abs_path):
                continue
            rec = lock.get(sid)
            if not rec:
                notes.append("%s: not in the revision lock yet" % sid)
                continue
            h = hashlib.sha256()
            with open(abs_path, "rb") as fh:
                for chunk in iter(lambda: fh.read(65536), b""):
                    h.update(chunk)
            if rec.get("revision") == sim.get("revision", 1) and rec.get("sha256") != h.hexdigest():
                fail("%s: index.html changed but `revision` is still %s - every cache "
                     "(browser, service worker, app) is keyed on it, so nobody would see "
                     "the change. Bump the revision in meta.json and the manifest."
                     % (sid, sim.get("revision", 1)))

    # ------------------------------------------------------- access / status
    for sim in sims:
        a = sim.get("access", "free")
        if a not in ACCESS_VALUES:
            fail("%s: access %r is not one of %s" % (sim.get("id"), a, ACCESS_VALUES))
        st = sim.get("status", "human_verified")
        if st not in STATUS_VALUES:
            fail("%s: status %r is not one of %s" % (sim.get("id"), st, STATUS_VALUES))

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
    print("  ✓ all paths resolve, ids unique, metadata consistent, counts and manifest.js "
          "in sync,\n    content feed current, revisions disciplined")
    return 0


if __name__ == "__main__":
    sys.exit(main())
