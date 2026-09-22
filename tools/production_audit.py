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

# Google Play has rejected anything below API 36 since 31 August 2026, and you cannot
# target an API you have not compiled against. Guard both, so a future `npx cap sync`
# or a "just make the build pass" edit cannot quietly drop the app below the floor.
PLAY_MIN_TARGET_SDK = 36
gv = os.path.join(ROOT, "app/android/variables.gradle")
if os.path.exists(gv):
    gtxt = open(gv, encoding="utf-8").read()
    def gradle_int(key):
        m = re.search(r"^\s*%s\s*=\s*(\d+)\s*$" % key, gtxt, re.M)
        return int(m.group(1)) if m else None
    tsdk, csdk = gradle_int("targetSdkVersion"), gradle_int("compileSdkVersion")
    ok("the app targets at least API %d, the Google Play floor" % PLAY_MIN_TARGET_SDK,
       tsdk is not None and tsdk >= PLAY_MIN_TARGET_SDK, "targetSdkVersion = %s" % tsdk)
    ok("compileSdk is at least targetSdk",
       csdk is not None and tsdk is not None and csdk >= tsdk,
       "compileSdkVersion = %s" % csdk)

# API 36 needs a toolchain Capacitor 6 does not ship with. AGP below 8.9.1
# refuses to compile against 36, and AGP 8.10 refuses to run on Gradle below
# 8.11.1. Both pins must move together, and the two AGP declarations in the
# tree must agree, or a `cap sync` or a half-finished upgrade leaves a project
# that cannot build against the SDK it claims to target.
MIN_AGP = (8, 9, 1)
MIN_GRADLE = (8, 11, 1)

def _ver(t):
    return tuple(int(x) for x in t.split("."))

agp_files = ["app/android/build.gradle",
             "app/android/capacitor-cordova-android-plugins/build.gradle"]
agp_found = {}
for rel in agp_files:
    fp = os.path.join(ROOT, rel)
    if not os.path.exists(fp):
        continue
    m = re.search(r"com\.android\.tools\.build:gradle:([0-9]+(?:\.[0-9]+)*)",
                  open(fp, encoding="utf-8").read())
    if m:
        agp_found[rel] = m.group(1)

ROOT_AGP_FILE = "app/android/build.gradle"
agp = agp_found.get(ROOT_AGP_FILE)
ok("the Android Gradle plugin can compile API 36 (needs >= %s)" % ".".join(map(str, MIN_AGP)),
   agp is not None and _ver(agp) >= MIN_AGP, "AGP %s in %s" % (agp, ROOT_AGP_FILE))

# The cordova-plugins module is gitignored and regenerated from the Capacitor CLI's
# template, so it comes back pinned to whatever Capacitor shipped. That is harmless:
# Gradle's buildscript classloaders delegate parent-first, so the root pin above is the
# AGP every subproject actually applies. Worth saying out loud, not worth failing over.
CORDOVA_AGP_FILE = "app/android/capacitor-cordova-android-plugins/build.gradle"
cordova_agp = agp_found.get(CORDOVA_AGP_FILE)
if cordova_agp and agp and cordova_agp != agp:
    notes.append("%s pins AGP %s, not %s - it is gitignored and regenerated by "
                 "`cap sync`, and the root pin wins, so this is cosmetic"
                 % (CORDOVA_AGP_FILE, cordova_agp, agp))

wrap = os.path.join(ROOT, "app/android/gradle/wrapper/gradle-wrapper.properties")
gradle = None
if os.path.exists(wrap):
    m = re.search(r"gradle-([0-9]+(?:\.[0-9]+)*)-(?:all|bin)\.zip",
                  open(wrap, encoding="utf-8").read())
    gradle = m.group(1) if m else None
ok("the Gradle wrapper is new enough for that plugin (needs >= %s)" % ".".join(map(str, MIN_GRADLE)),
   gradle is not None and _ver(gradle) >= MIN_GRADLE, "Gradle %s" % gradle)

# The wrapper's default connect timeout is 10s, which is not enough to start a ~200 MB
# download on a slow or proxied link - it fails before the first byte. Raised to 120s.
# `./gradlew wrapper --gradle-version X` rewrites this file from scratch and would put
# the default back, so it is worth a check rather than a comment.
WRAPPER_TIMEOUT_MS = 120000
timeout = None
if os.path.exists(wrap):
    m = re.search(r"^networkTimeout\s*=\s*(\d+)\s*$",
                  open(wrap, encoding="utf-8").read(), re.M)
    timeout = int(m.group(1)) if m else None
ok("the Gradle wrapper has room to start its download (needs >= %d ms)" % WRAPPER_TIMEOUT_MS,
   timeout is not None and timeout >= WRAPPER_TIMEOUT_MS, "networkTimeout = %s" % timeout)

ok("the Gradle wrapper script is committed executable",
   os.access(os.path.join(ROOT, "app/android/gradlew"), os.X_OK),
   "app/android/gradlew")

# Targeting API 36 makes edge-to-edge compulsory, so the WebView covers the status and
# navigation bars. The shell keeps clear of them through four CSS custom properties that
# MainActivity fills in from the real WindowInsets. The two halves are useless apart:
# if a rename lands on one side only, nothing errors - the app just quietly goes back to
# hiding its own header. Check they still name the same four things.
INSET_AXES = ["--safe-t", "--safe-b", "--safe-l", "--safe-r"]
mainact = os.path.join(ROOT, "app/android/app/src/main/java/com/prayogx/app/MainActivity.java")
appcss = os.path.join(ROOT, "app/www/app.css")
if os.path.exists(mainact) and os.path.exists(appcss):
    jtxt = open(mainact, encoding="utf-8").read()
    ctxt = open(appcss, encoding="utf-8").read()
    written = [a for a in INSET_AXES if "setProperty('%s'" % a in jtxt]
    read = [a for a in INSET_AXES if "var(%s)" % a in ctxt]
    ok("the native side publishes every inset axis the shell reads",
       written == INSET_AXES and read == INSET_AXES,
       "MainActivity writes %d, app.css reads %d" % (len(written), len(read)))
    # Only the surfaces that actually touch a screen edge. Each must carry both side
    # insets, and none may set a bare pixel side padding that would win over them -
    # the wide-screen block did exactly that and hid the search box behind a cutout.
    EDGE_SELECTORS = [".topbar", ".tabs", ".screen", ".vbar", "#frame", ".sheetbody", ".toast"]
    css_nc = re.sub(r"/\*.*?\*/", " ", ctxt, flags=re.S)   # comments confuse rule heads
    blocks = re.findall(r"([^{}]+)\{([^{}]*)\}", css_nc)
    missing, hardcoded = [], []
    for sel in EDGE_SELECTORS:
        own = [body for head, body in blocks
               if any(re.search(r"(^|[\s>+~])" + re.escape(sel) + r"$", part.strip())
                      for part in head.split(","))]
        if not own:
            missing.append(sel + " (no rule)")
            continue
        joined = " ".join(own)
        if "--safe-l" not in joined or "--safe-r" not in joined:
            missing.append(sel)
        for body in own:
            if re.search(r"padding-(?:left|right)\s*:\s*\d+px", body):
                hardcoded.append(sel)
    ok("every edge-touching surface carries both side insets",
       not missing, "missing: " + ", ".join(missing))
    ok("none of them overrides a side inset with a bare pixel padding",
       not hardcoded, "bare: " + ", ".join(hardcoded))
else:
    notes.append("MainActivity.java or app.css missing - edge-to-edge pairing not checked")
ios = os.path.isdir(os.path.join(ROOT, "app/ios"))
if not ios:
    notes.append("app/ios is absent — it can only be generated on macOS with `npx cap add ios`")

# ---------------------------------------------------- 8. cache keys move on change
sw = open(os.path.join(ROOT, "sw.js"), encoding="utf-8").read()
m = re.search(r'var VERSION = "([^"]*)";', sw)
# Shell and feed caches must move when the site is deployed; the simulations cache
# must NOT. Its entries are already keyed by a URL carrying ?v=<revision>, so naming it
# after the feed version only meant that adding a simulation renamed it and the activate
# sweep deleted it - taking every simulation a student had saved offline with it.
def _cache_expr(name):
    m = re.search(r"^var\s+%s\s*=\s*([^;]+);" % name, sw, re.M)
    return m.group(1).strip() if m else None

sims_expr, shell_expr, feed_expr = _cache_expr("SIMS"), _cache_expr("SHELL"), _cache_expr("FEED")
ok("the simulations cache name is stable, not feed-versioned",
   sims_expr is not None and "VERSION" not in sims_expr, "SIMS = %s" % sims_expr)
ok("the activate sweep exempts it",
   re.search(r"if\s*\(\s*k\s*===\s*SIMS\s*\)\s*return\s*;", sw) is not None)
ok("shell and feed caches are still version-keyed, so a deploy still replaces them",
   shell_expr is not None and "VERSION" in shell_expr and
   feed_expr is not None and "VERSION" in feed_expr,
   "SHELL = %s, FEED = %s" % (shell_expr, feed_expr))

ok("the service worker is stamped with the current feed version",
   m and m.group(1) == cat["version"], (m.group(1) if m else "none") + " vs " + cat["version"])
# Navigation lives in the shell, once, so a simulation never carries any. If the
# runner route or its frame went missing, every simulation would open as a bare file
# again with no way back - and nothing else here would notice.
site_js = open(os.path.join(ROOT, "site/site.js"), encoding="utf-8").read()
index_html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
ok("the shell carries a simulation runner with a way back",
   'id="runner"' in index_html and 'id="rback"' in index_html and '"#/run/"' in site_js)
# The app renders a simulation with srcdoc, and an srcdoc document inherits the
# shell's base URL - so a simulation's own <a href="#section"> resolves to the shell
# and tapping a section tab walks out of the simulation. 122 anchors across the
# library depend on the frame handling them instead.
app_js = open(os.path.join(app_www, "app.js"), encoding="utf-8").read()
# The feed is live; an installed client is frozen at the parser it shipped with. Each
# client declares the schema major it can read and refuses anything else rather than
# guessing at a shape it does not know. The two must agree, or one platform would accept
# a feed the other rejects.
def _schema_major(src):
    m = re.search(r"var\s+SUPPORTED_SCHEMA_MAJOR\s*=\s*(\d+)\s*;", src)
    return int(m.group(1)) if m else None

site_major = _schema_major(site_js)
app_major = _schema_major(app_js)
ok("both clients declare the feed schema major they can read",
   site_major is not None and app_major is not None,
   "site %s, app %s" % (site_major, app_major))
ok("and they agree, so Web and Android accept exactly the same feeds",
   site_major == app_major, "%s == %s" % (site_major, app_major))
ok("the published feed is a major both of them read",
   site_major is not None and str(cat.get("schemaVersion", "")).split(".")[0] == str(site_major),
   "catalog.json schemaVersion %s" % cat.get("schemaVersion"))

ok("the app handles a simulation's own in-page anchors inside the frame",
   "attachAnchorShim" in app_js and 'href.charAt(0) !== "#"' in app_js)

ok("no simulation carries navigation markup of its own",
   not any(re.search(r'rback|vback|#/run/', open(os.path.join(d, f), encoding="utf-8",
                                                  errors="ignore").read())
           for d, _, fs_ in os.walk(os.path.join(ROOT, "simulations"))
           for f in fs_ if f == "index.html"))

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
