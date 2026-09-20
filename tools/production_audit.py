#!/usr/bin/env python3
"""
Production readiness audit.

check_library.py validates the library for correctness. This asks the separate
question of whether the SINGLE-SOURCE PROMISE actually holds:

  * every simulation on disk is in the manifest and vice versa
  * every simulation has a permanent ID, a revision and a recorded content hash
  * the recorded hash matches the file on disk
  * the feed every client reads carries the same IDs and revisions
  * the mobile app bundle contains NO simulation and NO catalogue
  * the app reads the same feed the website publishes
  * nothing in the deployable tree is a second copy of a simulation

Exit 0 = production ready, 1 = something would ship broken.
"""
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
problems, notes, checks = [], [], []


def ok(label, passed, detail=""):
    checks.append((passed, label, detail))
    if not passed:
        problems.append(label + (" — " + detail if detail else ""))


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for c in iter(lambda: fh.read(65536), b""):
            h.update(c)
    return h.hexdigest()


man = json.load(open(os.path.join(ROOT, "data/manifest.json"), encoding="utf-8"))
sims = man["simulations"]
lock = json.load(open(os.path.join(ROOT, "data/revisions.json"), encoding="utf-8"))
idx = json.load(open(os.path.join(ROOT, "content/index.json"), encoding="utf-8"))
cat = json.load(open(os.path.join(ROOT, "content/catalog.json"), encoding="utf-8"))

# ---------------------------------------------- 2. every simulation accounted for
on_disk = set()
for dirpath, _d, files in os.walk(os.path.join(ROOT, "simulations")):
    if "index.html" in files:
        on_disk.add(os.path.relpath(dirpath, ROOT).replace(os.sep, "/") + "/")
in_manifest = set(s["folder"] for s in sims)
ok("every simulation folder on disk is in the manifest",
   not (on_disk - in_manifest), ", ".join(sorted(on_disk - in_manifest)))
ok("every manifest entry exists on disk",
   not (in_manifest - on_disk), ", ".join(sorted(in_manifest - on_disk)))
ok("the counts agree", len(sims) == len(on_disk) == man["counts"]["total"],
   "%d manifest / %d disk / %d counts" % (len(sims), len(on_disk), man["counts"]["total"]))

# ------------------------------------- 3. permanent ID + revision + content hash
ID_RE = re.compile(r"^ADV-\d{4}-P\d+-(PHY|CHE|MAT)-Q\d{2,3}$")
bad_id = [s["id"] for s in sims if not ID_RE.match(s["id"])]
ok("every ID matches the permanent convention", not bad_id, ", ".join(bad_id))
ok("every ID is unique", len(set(s["id"] for s in sims)) == len(sims))
no_rev = [s["id"] for s in sims if not isinstance(s.get("revision"), int) or s["revision"] < 1]
ok("every simulation carries an integer revision", not no_rev, ", ".join(no_rev))
unlocked = [s["id"] for s in sims if s["id"] not in lock]
ok("every simulation has a recorded content hash", not unlocked, ", ".join(unlocked))
drift = []
for s in sims:
    rec = lock.get(s["id"])
    if not rec:
        continue
    actual = sha(os.path.join(ROOT, s["path"]))
    if rec["revision"] != s["revision"]:
        drift.append("%s lock r%s vs manifest r%s" % (s["id"], rec["revision"], s["revision"]))
    elif rec["sha256"] != actual:
        drift.append("%s content changed without a revision bump" % s["id"])
ok("every recorded hash matches the file on disk and its revision",
   not drift, "; ".join(drift))

# ------------------------------------------------- 4. the feed carries the same
feed = {c["id"]: c for c in idx["simulations"]}
ok("the feed lists exactly the manifest's simulations",
   set(feed) == set(s["id"] for s in sims),
   "feed %d, manifest %d" % (len(feed), len(sims)))
rev_mismatch = [s["id"] for s in sims if feed.get(s["id"], {}).get("revision") != s["revision"]]
ok("the feed carries each simulation's current revision", not rev_mismatch,
   ", ".join(rev_mismatch))
ok("catalog.json revision map agrees with the index",
   cat["revisions"] == {c["id"]: c["revision"] for c in idx["simulations"]})
missing_detail = [s["id"] for s in sims
                  if not os.path.isfile(os.path.join(ROOT, "content/sims", s["id"] + ".json"))]
ok("every simulation has a detail record", not missing_detail, ", ".join(missing_detail))
missing_page = [s["id"] for s in sims
                if not os.path.isfile(os.path.join(ROOT, "s", s["id"], "index.html"))]
ok("every simulation has a crawlable page", not missing_page, ", ".join(missing_page))

# ------------------------------------------- 5. no duplicated simulation content
app_www = os.path.join(ROOT, "app/www")
dupes = []
if os.path.isdir(app_www):
    for dirpath, _d, files in os.walk(app_www):
        for f in files:
            p = os.path.join(dirpath, f)
            if f.endswith((".html", ".js")):
                head = open(p, encoding="utf-8", errors="ignore").read(400000)
                if "sim-id" in head and "<style>" in head:
                    dupes.append(os.path.relpath(p, ROOT))
ok("the mobile bundle contains no simulation copy", not dupes, ", ".join(dupes))
app_files = sorted(os.listdir(app_www)) if os.path.isdir(app_www) else []
ok("the mobile bundle is a shell, not a site copy",
   set(app_files) <= {"index.html", "app.js", "app.css", "config.js"},
   ", ".join(app_files))
ok("no catalogue is bundled with the app",
   not os.path.exists(os.path.join(app_www, "content")) and
   not os.path.exists(os.path.join(app_www, "data")))

# ----------------------------- 6/7. the app reads the published feed, not a copy
cfg = open(os.path.join(app_www, "config.js"), encoding="utf-8").read()
m = re.search(r'origin:\s*"([^"]+)"', cfg)
origin = m.group(1) if m else ""
ok("the app points at an https origin", origin.startswith("https://"), origin)
ok("the app reads the same three feed files the website publishes",
   all(k in cfg for k in ("content/catalog.json", "content/index.json", "content/sims/{id}.json")))
capcfg = json.load(open(os.path.join(ROOT, "app/capacitor.config.json"), encoding="utf-8"))
ok("native HTTP is enabled, so the app does not depend on the host's CORS",
   capcfg.get("plugins", {}).get("CapacitorHttp", {}).get("enabled") is True)
ok("the Android project exists", os.path.isdir(os.path.join(ROOT, "app/android")))
ios = os.path.isdir(os.path.join(ROOT, "app/ios"))
if not ios:
    notes.append("app/ios is absent — it can only be generated on macOS with `npx cap add ios`")

# ---------------------------------------------------- 8. cache keys move on change
sw = open(os.path.join(ROOT, "sw.js"), encoding="utf-8").read()
m = re.search(r'var VERSION = "([^"]*)";', sw)
ok("the service worker is stamped with the current feed version",
   m and m.group(1) == cat["version"], (m.group(1) if m else "none") + " vs " + cat["version"])
ok("simulation URLs are revision-keyed in the site",
   'sim.revision' in open(os.path.join(ROOT, "site/site.js"), encoding="utf-8").read())
ok("the app keys its stored copy on revision",
   'rec.revision === wanted' in open(os.path.join(app_www, "app.js"), encoding="utf-8").read())

# ------------------------------------------------ deployment hygiene
ok("papers/ is gitignored", "papers/" in open(os.path.join(ROOT, ".gitignore"), encoding="utf-8").read())
wf = open(os.path.join(ROOT, ".github/workflows/static.yml"), encoding="utf-8").read()
ok("the deploy workflow re-validates before publishing", "check_library.py" in wf)
ok("the deploy workflow refuses stale generated content", "git diff --quiet" in wf)
ok("the deploy workflow excludes papers/", "--exclude='./papers'" in wf)

print("PRODUCTION AUDIT — %d checks" % len(checks))
for passed, label, detail in checks:
    print(("  PASS  " if passed else "  FAIL  ") + label + ("   " + detail if detail and not passed else ""))
for n in notes:
    print("  NOTE  " + n)
print()
if problems:
    print("%d problem(s) — NOT production ready" % len(problems))
    return_code = 1
else:
    print("All %d checks pass. Single-source promise holds." % len(checks))
    return_code = 0
sys.exit(return_code)
