#!/usr/bin/env python3
"""PrayogX Experience Kit - version and drift checks (tools/px_kit.py, and its hook in tools/check_library.py).

Every tamper case runs on a temporary copy of the kit and a page, never on the repository.
Run:  python3 tests/kit/test_px_kit.py
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import px_kit  # noqa: E402

N = [0, 0]


def ok(label, cond, detail=None):
    N[0] += 1
    if not cond:
        N[1] += 1
    print(("PASS  " if cond else "FAIL  ") + label + ("" if cond or detail is None else "   " + repr(detail)[:300]))


def sandbox():
    """a temp root holding a copy of lib/px-kit and the toy page"""
    d = tempfile.mkdtemp(prefix="pxkit-")
    shutil.copytree(os.path.join(ROOT, "lib", "px-kit"), os.path.join(d, "lib", "px-kit"))
    os.makedirs(os.path.join(d, "pages"))
    shutil.copy(os.path.join(ROOT, "tests", "kit", "toy", "index.html"), os.path.join(d, "pages", "toy.html"))
    return d


def edit(path, old, new, count=1):
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    assert old in text, old
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text.replace(old, new, count))


# 1 the repository as it is
can, ver = px_kit.canonical(ROOT), px_kit.load_versions(ROOT)
ok("the kit has the five Phase 1 modules", sorted(can) == ["act@1", "cam@1", "clock@1", "dir@1", "obs@1"], sorted(can))
ok("every canonical file matches its recorded hash", px_kit.kit_problems(ROOT) == [], px_kit.kit_problems(ROOT))
ok("VERSIONS.json records the byte size of each version", all(ver[k]["bytes"] == len(can[k].encode("utf-8")) for k in can))
ok("the whole tree has no kit problems", px_kit.problems(ROOT) == [], px_kit.problems(ROOT))
toy = os.path.join(ROOT, "tests", "kit", "toy", "index.html")
with open(toy, encoding="utf-8") as fh:
    blocks = px_kit.BLOCK.findall(fh.read())
ok("the toy carries all five blocks", sorted(b[0] for b in blocks) == ["act", "cam", "clock", "dir", "obs"])
hits = [p for p in px_kit.tree_files(ROOT) if "PX-KIT" in open(p, encoding="utf-8").read() and not p.startswith(os.path.join(ROOT, "tests", "kit"))]
ok("no existing page carries kit blocks (nothing was migrated)", hits == [], [os.path.relpath(h, ROOT) for h in hits])

# 2 tamper cases, each on a fresh sandbox
cases = []
d = sandbox(); page = os.path.join(d, "pages", "toy.html")
edit(page, "if (!playing) return;", "if (!playing) return; S.dir.i++;")
cases.append(("an edited copy of a block in a page", d, "dir@1 differs"))
d = sandbox(); page = os.path.join(d, "pages", "toy.html")
edit(page, "/* PX-KIT obs@1 BEGIN */", "/* PX-KIT obs@7 BEGIN */")
cases.append(("a page block with a mismatched version marker", d, "malformed"))
d = sandbox(); page = os.path.join(d, "pages", "toy.html")
edit(page, "/* PX-KIT obs@1 BEGIN */", "/* PX-KIT obs@7 BEGIN */")
edit(page, "/* PX-KIT obs@1 END */", "/* PX-KIT obs@7 END */")
cases.append(("a page block naming an unrecorded version", d, "obs@7 is not a recorded kit version"))
d = sandbox(); page = os.path.join(d, "pages", "toy.html")
edit(page, "/* PX-KIT cam@1 END */", "")
cases.append(("a page block with a missing END marker", d, "malformed"))
d = sandbox()
edit(os.path.join(d, "lib", "px-kit", "obs@1.js"), "decimals", "decimalz")
cases.append(("an edited canonical file (a released version changed)", d, "obs@1.js does not match its recorded hash"))
d = sandbox()
os.remove(os.path.join(d, "lib", "px-kit", "cam@1.js"))
cases.append(("a recorded version whose canonical file is missing", d, "cam@1.js is missing"))
d = sandbox()
shutil.copy(os.path.join(d, "lib", "px-kit", "obs@1.js"), os.path.join(d, "lib", "px-kit", "obs@2.js"))
cases.append(("a new canonical version with no VERSIONS.json entry", d, "obs@2.js has no entry"))
d = sandbox(); page = os.path.join(d, "pages", "toy.html")
with open(page, encoding="utf-8") as fh:
    t = fh.read()
i = t.index("/* PX-KIT clock@1 BEGIN */"); j = t.index("/* PX-KIT clock@1 END */") + len("/* PX-KIT clock@1 END */")
edit(page, "/* PX-KIT obs@1 BEGIN */", t[i:j] + "\n/* PX-KIT obs@1 BEGIN */")
cases.append(("the same module embedded twice", d, "clock appears more than once"))

for label, d, expect in cases:
    probs = px_kit.problems(d)
    ok("detected: " + label, any(expect in p for p in probs), probs)
    shutil.rmtree(d)

# 3 releasing: hash --write refuses to overwrite a released version's hash
d = sandbox()
edit(os.path.join(d, "lib", "px-kit", "obs@1.js"), "decimals", "decimalz")
r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "px_kit.py"), "hash", "--write"],
                   env=dict(os.environ, PRAYOGX_ROOT=d), capture_output=True, text=True)
with open(os.path.join(d, "lib", "px-kit", "VERSIONS.json")) as fh:
    unchanged = json.load(fh)["obs@1"]["sha256"] == ver["obs@1"]["sha256"]
ok("hash --write refuses to re-record a changed released version", r.returncode != 0 and "refusing" in (r.stderr + r.stdout) and unchanged, r.stderr)
shutil.rmtree(d)

# 4 embed restores an edited copy
d = sandbox(); page = os.path.join(d, "pages", "toy.html")
edit(page, "if (!playing) return;", "if (!playing) return; S.dir.i++;")
os.environ["PRAYOGX_ROOT"] = d
changed = px_kit.embed(page, d)
ok("embed restores the canonical copy of an edited block", changed and px_kit.problems(d) == [], px_kit.problems(d))
del os.environ["PRAYOGX_ROOT"]
shutil.rmtree(d)

# 5 check_library runs the kit check (tamper with a temporary copy of the toy inside the repo tree)
probe = os.path.join(ROOT, "tests", "kit", "toy", "_tamper_probe.html")
try:
    shutil.copy(toy, probe)
    edit(probe, "if (!playing) return;", "if (!playing) return; S.dir.i++;")
    r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "check_library.py")], capture_output=True, text=True)
    ok("check_library fails on a tampered kit block anywhere in the tree", r.returncode != 0 and "_tamper_probe.html: dir@1 differs" in r.stdout, r.stdout[-400:])
finally:
    if os.path.exists(probe):
        os.remove(probe)
r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "check_library.py")], capture_output=True, text=True)
ok("check_library passes again once the probe is gone", r.returncode == 0, r.stdout[-400:])

print("\n%d passed, %d failed" % (N[0] - N[1], N[1]))
sys.exit(1 if N[1] else 0)
