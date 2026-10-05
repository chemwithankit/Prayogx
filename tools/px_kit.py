#!/usr/bin/env python3
"""
PrayogX Experience Kit: versioned blocks copied into standalone pages.

A page carries kit code between markers, so it stays one self-contained file:

    /* PX-KIT obs@1 BEGIN */
    ...exact copy of lib/px-kit/obs@1.js...
    /* PX-KIT obs@1 END */

The canonical copies live in lib/px-kit/<name>@<version>.js and their SHA-256 hashes in
lib/px-kit/VERSIONS.json. A page may use any recorded version; it upgrades only on purpose.

    python3 tools/px_kit.py check [FILE ...]   every block in the files (default: the whole tree) matches
    python3 tools/px_kit.py hash [--write]     the canonical hashes (--write records them in VERSIONS.json)
    python3 tools/px_kit.py embed FILE         replace every block in FILE with its canonical copy
    python3 tools/px_kit.py size               bytes per canonical block

check_library runs problems(ROOT), so a tampered block or canonical file fails the library check.
"""
import hashlib
import json
import os
import re
import sys

ROOT = os.environ.get("PRAYOGX_ROOT") or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT_DIR = os.path.join("lib", "px-kit")
VERSIONS = os.path.join(KIT_DIR, "VERSIONS.json")
NAME = re.compile(r"^([a-z]+)@(\d+)\.js$")
BLOCK = re.compile(r"/\* PX-KIT ([a-z]+)@(\d+) BEGIN \*/\n((?:.*?\n)?)/\* PX-KIT \1@\2 END \*/", re.S)
MARK = re.compile(r"/\* PX-KIT ([a-z]+)@(\d+) (BEGIN|END) \*/")
SKIP = {".git", "node_modules", "_scratch", "Claude outputs", "papers", ".venv", "output", "build"}


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def canonical(root=ROOT):
    """{'obs@1': text} for every canonical file (the text that sits between the markers)."""
    out = {}
    d = os.path.join(root, KIT_DIR)
    if not os.path.isdir(d):
        return out
    for fn in sorted(os.listdir(d)):
        m = NAME.match(fn)
        if m:
            with open(os.path.join(d, fn), encoding="utf-8") as fh:
                out["%s@%s" % m.groups()] = fh.read().rstrip("\n")
    return out


def load_versions(root=ROOT):
    p = os.path.join(root, VERSIONS)
    if not os.path.isfile(p):
        return {}
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


def page_problems(text, versions, where):
    """Every marked block in a page is complete, well formed and identical to a recorded version."""
    out = []
    marks = MARK.findall(text)
    blocks = BLOCK.findall(text)
    if len(marks) != 2 * len(blocks):
        out.append("%s: unmatched or malformed PX-KIT markers" % where)
    seen = set()
    for name, ver, body in blocks:
        body = body[:-1] if body.endswith("\n") else body
        key = "%s@%s" % (name, ver)
        if name in seen:
            out.append("%s: %s appears more than once" % (where, name))
        seen.add(name)
        rec = versions.get(key)
        if not rec:
            out.append("%s: %s is not a recorded kit version" % (where, key))
        elif sha(body) != rec.get("sha256"):
            out.append("%s: %s differs from lib/px-kit/%s.js (edited copy?)" % (where, key, key))
    return out


def kit_problems(root=ROOT):
    """Canonical files and VERSIONS.json agree."""
    out = []
    can, ver = canonical(root), load_versions(root)
    if not can and not ver:
        return out
    for key, text in can.items():
        if key not in ver:
            out.append("lib/px-kit/%s.js has no entry in VERSIONS.json" % key)
        elif ver[key].get("sha256") != sha(text):
            out.append("lib/px-kit/%s.js does not match its recorded hash (a released version must not change)" % key)
    for key in ver:
        if key not in can:
            out.append("VERSIONS.json lists %s but lib/px-kit/%s.js is missing" % (key, key))
    return out


def tree_files(root=ROOT):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP and not d.startswith(".")]
        for fn in filenames:
            if fn.endswith((".html", ".htm")):
                yield os.path.join(dirpath, fn)


def problems(root=ROOT, files=None):
    out = kit_problems(root)
    versions = load_versions(root)
    for p in files if files is not None else tree_files(root):
        with open(p, encoding="utf-8") as fh:
            text = fh.read()
        if "PX-KIT" in text:
            out.extend(page_problems(text, versions, os.path.relpath(p, root)))
    return out


def embed(path, root=ROOT):
    can = canonical(root)
    with open(path, encoding="utf-8") as fh:
        text = fh.read()

    def repl(m):
        key = "%s@%s" % (m.group(1), m.group(2))
        if key not in can:
            raise SystemExit("no canonical %s" % key)
        return "/* PX-KIT %s BEGIN */\n%s\n/* PX-KIT %s END */" % (key, can[key], key)

    new = BLOCK.sub(repl, text)
    if new != text:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(new)
    return new != text


def main(argv):
    cmd = argv[1] if len(argv) > 1 else "check"
    if cmd == "check":
        files = [os.path.abspath(a) for a in argv[2:]] or None
        probs = problems(ROOT, files)
        for p in probs:
            print("  ✗ " + p)
        print("PX-KIT: %s" % ("%d problem(s)" % len(probs) if probs else "all blocks match their recorded versions"))
        return 1 if probs else 0
    if cmd == "hash":
        can = canonical(ROOT)
        table = dict((k, {"sha256": sha(t), "bytes": len(t.encode("utf-8"))}) for k, t in sorted(can.items()))
        if "--write" in argv:
            old = load_versions(ROOT)
            for k, v in old.items():
                if k in table and v.get("sha256") != table[k]["sha256"]:
                    raise SystemExit("refusing: %s changed after release - add a new version instead" % k)
            old.update(table)
            with open(os.path.join(ROOT, VERSIONS), "w", encoding="utf-8") as fh:
                json.dump(dict(sorted(old.items())), fh, indent=2)
                fh.write("\n")
        print(json.dumps(table, indent=2))
        return 0
    if cmd == "embed":
        for a in argv[2:]:
            print("%s %s" % ("updated" if embed(os.path.abspath(a)) else "unchanged", a))
        return 0
    if cmd == "size":
        can = canonical(ROOT)
        tot = 0
        for k, t in sorted(can.items()):
            n = len(t.encode("utf-8"))
            tot += n
            print("%-10s %6d bytes" % (k, n))
        print("%-10s %6d bytes" % ("total", tot))
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
