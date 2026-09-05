#!/usr/bin/env python3
"""
Rebuild the derived parts of the catalogue from data/manifest.json.

data/manifest.json is the single source of truth. This script:
  1. sorts simulations by id,
  2. recomputes `counts` (total / byYear / bySubject / byChapter),
  3. regenerates data/manifest.js, which is the same object exposed as
     window.SIM_MANIFEST so the website works when opened straight from disk.

Run it after adding or editing a simulation entry:

    python3 tools/sync_manifest.py

It never touches simulation files.
"""
import hashlib
import re
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, "data", "manifest.json")
JS_PATH = os.path.join(ROOT, "data", "manifest.js")

BANNER = ("/* Auto-generated from manifest.json by tools/sync_manifest.py — do not edit by hand.\n"
          "   Exposes the manifest as window.SIM_MANIFEST so the website works from file://,\n"
          "   where fetch() of a local JSON file is blocked. */\n")


def main():
    with open(JSON_PATH, encoding="utf-8") as fh:
        manifest = json.load(fh)

    sims = manifest.get("simulations", [])
    sims.sort(key=lambda s: s.get("id", ""))

    counts = {"total": len(sims), "byYear": {}, "bySubject": {}, "byChapter": {}}
    for sim in sims:
        for key, field in (("byYear", "year"), ("bySubject", "subject"), ("byChapter", "chapter")):
            value = str(sim.get(field, "unknown"))
            counts[key][value] = counts[key].get(value, 0) + 1
    manifest["counts"] = counts
    manifest["simulations"] = sims

    with open(JSON_PATH, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    with open(JS_PATH, "w", encoding="utf-8") as fh:
        fh.write(BANNER)
        fh.write("window.SIM_MANIFEST = ")
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
        fh.write(";\n")


    # The catalogue is a static page, so a browser caches data/manifest.js and
    # the stylesheet indefinitely and a newly published simulation never shows
    # up. Stamp the asset references with a hash of the manifest, so that every
    # publish serves them from new URLs.
    version = hashlib.sha256(
        json.dumps(manifest, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()[:8]
    index_path = os.path.join(ROOT, "index.html")
    with open(index_path, encoding="utf-8") as fh:
        page = fh.read()
    stamped = re.sub(
        r'(href="site/site\.css|src="data/manifest\.js|src="site/site\.js)(\?v=[0-9a-f]+)?"',
        lambda m: m.group(1) + '?v=' + version + '"',
        page,
    )
    if stamped != page:
        with open(index_path, "w", encoding="utf-8") as fh:
            fh.write(stamped)
    print("  asset version: %s" % version)

    print("synced %d simulation(s)" % counts["total"])
    for key in ("byYear", "bySubject", "byChapter"):
        print("  %-10s %s" % (key + ":", counts[key]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
