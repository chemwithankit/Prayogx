# Production test suites

Five suites that check the things the library check cannot: that the **single-source
promise** actually holds end to end, across the website, the PWA and the Capacitor app.

They take their repository root from `PRAYOGX_ROOT`, defaulting to the repository they
live in, and each one restores whatever it changes.

## What runs where

| Suite | Needs | What it proves |
|---|---|---|
| `../tools/check_library.py` | python3 | the library is coherent |
| `../tools/production_audit.py` | python3 | 27 single-source checks: IDs, revisions, hashes, feed agreement, no duplicated content, cache keying, deploy hygiene |
| `prodcheck.js` | node + Playwright | catalogue, search, filters, detail pages, direct URLs, deep links, back navigation, mobile layout, PWA, offline, broken assets |
| `propagation.js` | node + Playwright | adds ONE simulation to the canonical source and proves the website, PWA, crawlable pages and the app all pick it up with no code change — then removes it |
| `stalecache.js` | node + Playwright | a revision bump moves the feed version, the worker version and the lock hash; the browser and the app both stop serving the old copy; an unbumped edit is refused |
| `appcheck_prod.js` | node + Playwright | the Capacitor shell against the real feed: no bundled content, native list, filters, offline storage, back navigation |

The two Python tools run anywhere, including this Mac. The browser suites need Playwright
and a Chromium build, which live in the Cowork container — they are not installed here.

## Running them

```bash
# the two that run anywhere
python3 tools/check_library.py
python3 tools/production_audit.py

# all of them, where Playwright is available
bash tests/runall.sh
```

`runall.sh` reports a pass/fail line per suite and exits non-zero if any fails.

## A rule these suites follow

Any suite that edits the canonical source restores it in a `finally` block. An earlier
version did not, and a mid-run failure left the tree modified, which then failed the next
suite for the wrong reason. If you add a suite that writes anything, do the same.
