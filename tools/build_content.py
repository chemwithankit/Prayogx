#!/usr/bin/env python3
"""
Build the client content feed from data/manifest.json.

data/manifest.json stays the single source of truth and is never modified here.
This script derives the payload the clients actually download:

    content/catalog.json   feed version, counts, taxonomy facets and a compact
                           {id: revision} map, so a client can tell in one small
                           request what has changed since it last looked
    content/index.json     one CARD-level record per simulation - the smallest
                           record that can draw a catalogue card and satisfy a
                           filter
    content/search.json    a capped text blob per simulation, loaded only when
                           the visitor actually types in the search box
    content/sims/<ID>.json the full record for one simulation, fetched only when
                           its detail page is opened

Why: a manifest entry averages ~8.4 KB because it carries the verification log,
the interactivity list and the concept prose. At 1000 simulations that is 8.4 MB
downloaded before the first card appears. A card-level record is ~1.1 KB, so the
same catalogue costs ~1.1 MB and the prose is paid for only when it is read.

Fields defaulted here rather than in the manifest, so no existing record has to
be edited:  access -> "free",  status -> "human_verified".

Run:  python3 tools/build_content.py
"""
import hashlib
import json
import re
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "data", "manifest.json")
LOCK = os.path.join(ROOT, "data", "revisions.json")
OUT = os.path.join(ROOT, "content")

# What a card needs to render, filter, search and sort. Everything else is
# detail and is paid for on demand.
CARD_FIELDS = [
    "id", "slug", "path", "folder", "title", "shortTitle", "exam", "year",
    "paper", "paperNumber", "subject", "branch", "questionNumber", "section",
    "questionType", "chapter", "topic", "difficulty", "estimatedMinutes",
    "revision", "answerUnit", "tags", "access", "status", "thumb", "updatedAt",
]
# Free text worth searching. It ships in content/search.json, NOT in the index:
# it is several times the size of a card, and a visitor who never types never
# needs it. Title, chapter, topic and tags are searched from the index itself.
SEARCH_FIELDS = ["summary", "subtopics", "concepts", "formulas"]
SEARCH_CAP = 520      # characters per simulation - enough to find it, not an essay

DEFAULTS = {"access": "free", "status": "human_verified"}


def blob(sim):
    """One lowercase haystack per simulation, capped so search stays cheap."""
    parts = []
    for f in SEARCH_FIELDS:
        v = sim.get(f)
        if isinstance(v, list):
            # first clause of each item carries the distinctive words
            parts.extend(re.split(r"[.;:]", str(x))[0] for x in v)
        elif v:
            parts.append(re.split(r"[.;:]", str(v))[0])
    text = " ".join(" ".join(parts).lower().split())
    return text[:SEARCH_CAP]


def card(sim):
    out = {}
    for f in CARD_FIELDS:
        v = sim.get(f, DEFAULTS.get(f))
        if v is None or v == "" or v == []:
            continue
        out[f] = v
    for k, d in DEFAULTS.items():
        out.setdefault(k, d)
    return out


def sha_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def update_lock(published):
    """Record the content hash of each simulation against its revision.

    Every cache in the chain - the browser, the service worker, the mobile app -
    is keyed on `revision`. Editing a shipped simulation without bumping it is
    therefore invisible to every client, which is the one mistake that silently
    ships nothing. The lock makes it loud: a bumped revision re-blesses the new
    hash, an unbumped edit leaves the lock behind and check_library.py fails.
    """
    lock = {}
    if os.path.isfile(LOCK):
        with open(LOCK, encoding="utf-8") as fh:
            lock = json.load(fh)
    blessed, held = 0, []
    for sim in published:
        sid, rel = sim["id"], sim.get("path", "")
        abs_path = os.path.join(ROOT, rel)
        if not rel or not os.path.isfile(abs_path):
            continue
        sha, rev = sha_of(abs_path), sim.get("revision", 1)
        prev = lock.get(sid)
        if prev is None or prev.get("revision") != rev:
            lock[sid] = {"revision": rev, "sha256": sha}
            blessed += 1
        elif prev.get("sha256") != sha:
            held.append(sid)
    with open(LOCK, "w", encoding="utf-8") as fh:
        json.dump(lock, fh, indent=2, sort_keys=True)
        fh.write("\n")
    return blessed, held


def main():
    with open(MANIFEST, encoding="utf-8") as fh:
        manifest = json.load(fh)
    sims = manifest.get("simulations", [])

    published = [s for s in sims
                 if s.get("status", DEFAULTS["status"]) != "draft" and s.get("id")]
    published.sort(key=lambda s: s.get("id", ""))

    os.makedirs(os.path.join(OUT, "sims"), exist_ok=True)

    cards = [card(s) for s in published]

    # facets, so the client can build every dropdown without scanning details
    def facet(field):
        seen = {}
        for s in published:
            v = s.get(field)
            if v is None or v == "":
                continue
            seen[str(v)] = seen.get(str(v), 0) + 1
        return seen

    version = hashlib.sha256(
        json.dumps(cards, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()[:12]

    catalog = {
        "schemaVersion": "1.0.0",
        "version": version,
        "generatedFrom": "data/manifest.json",
        "updatedAt": manifest.get("library", {}).get("updatedAt"),
        "library": {k: v for k, v in manifest.get("library", {}).items()
                    if k in ("name", "fullName", "tagline", "description")},
        "counts": {
            "total": len(cards),
            "byYear": facet("year"),
            "bySubject": facet("subject"),
            "byChapter": facet("chapter"),
            "byAccess": {a: sum(1 for c in cards if c["access"] == a)
                         for a in sorted(set(c["access"] for c in cards))},
        },
        # the whole point: a client refreshes only what moved
        "revisions": {c["id"]: c.get("revision", 1) for c in cards},
        "index": "content/index.json",
        "detail": "content/sims/{id}.json",
    }

    def write(rel, obj):
        p = os.path.join(OUT, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as fh:
            json.dump(obj, fh, ensure_ascii=False, separators=(",", ":"))
            fh.write("\n")
        return os.path.getsize(p)

    cat_b = write("catalog.json", catalog)
    idx_b = write("index.json", {"version": version, "simulations": cards})
    srch_b = write("search.json", {"version": version,
                                   "text": {s["id"]: blob(s) for s in published}})

    det_b = 0
    for s in published:
        rec = dict(s)
        for k, d in DEFAULTS.items():
            rec.setdefault(k, d)
        rec["feedVersion"] = version
        det_b += write(os.path.join("sims", s["id"] + ".json"), rec)

    # Retire detail files for simulations that are no longer published. The
    # build never requires delete permission: if it cannot remove one it says so
    # and check_library.py reports it, rather than failing the build.
    want = set(s["id"] + ".json" for s in published)
    stale = []
    simdir = os.path.join(OUT, "sims")
    for fn in sorted(os.listdir(simdir)):
        if fn.endswith(".json") and fn not in want:
            try:
                os.remove(os.path.join(simdir, fn))
            except OSError:
                stale.append(fn)
    if stale:
        print("  NOTE: stale detail file(s) left in content/sims: %s" % ", ".join(stale))

    blessed, held = update_lock(published)

    man_b = os.path.getsize(MANIFEST)
    n = len(cards) or 1
    print("content feed built from data/manifest.json")
    print("  version        %s" % version)
    print("  simulations    %d published, %d draft"
          % (len(cards), len(sims) - len(cards)))
    print("  catalog.json   %6d B" % cat_b)
    print("  index.json     %6d B   (%d B per simulation)" % (idx_b, idx_b // n))
    print("  search.json    %6d B   (%d B per simulation, lazy)" % (srch_b, srch_b // n))
    print("  sims/*.json    %6d B   across %d files, fetched on demand" % (det_b, len(cards)))
    print("  manifest.json  %6d B   (%d B per simulation, authoring only)"
          % (man_b, man_b // n))
    print("  startup cost   %.0f%% of the manifest" % (100.0 * idx_b / man_b))
    print("  projected at 1000 simulations: index %.1f MB, manifest %.1f MB"
          % (idx_b / n * 1000 / 1e6, man_b / n * 1000 / 1e6))
    if blessed:
        print("  revision lock   %d simulation(s) recorded at their current revision" % blessed)
    if held:
        print("  revision lock   CHANGED WITHOUT A BUMP: %s" % ", ".join(held))
        print("                  bump `revision` in meta.json and the manifest, then rebuild -")
        print("                  every cache in the chain is keyed on it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
