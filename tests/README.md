# Production test suites

Nine suites that check the things the library check cannot: that the **single-source
promise** actually holds end to end, across the website, the PWA and the Capacitor app.

They take their repository root from `PRAYOGX_ROOT`, defaulting to the repository they
live in, and each one restores whatever it changes.

## What runs where

| Suite | Needs | What it proves |
|---|---|---|
| `../tools/check_library.py` | python3 | the library is coherent |
| `../tools/production_audit.py` | python3 | 45 single-source checks: IDs, revisions, hashes, feed agreement, no duplicated content, cache keying, deploy hygiene |
| `prodcheck.js` | node + Playwright | catalogue, search, filters, detail pages, direct URLs, deep links, back navigation, mobile layout, PWA, offline, broken assets |
| `propagation.js` | node + Playwright | adds ONE simulation to the canonical source and proves the website, PWA, crawlable pages and the app all pick it up with no code change — then removes it |
| `stalecache.js` | node + Playwright | a revision bump moves the feed version, the worker version and the lock hash; the browser and the app both stop serving the old copy; an unbumped edit is refused |
| `appcheck_prod.js` | node + Playwright | the Capacitor shell against the real feed: no bundled content, native list, filters, offline storage, back navigation |
| `edgetoedge.js` | node + Playwright | Android 16 edge-to-edge: with real system-bar insets applied, the header, tab bar, cards, search, filter and the simulation frame all stay clear of the status and navigation bars, in portrait and landscape - and with no insets the layout is byte-for-byte what it was |
| `feederror.js` | node + Playwright | that a published site answering 404 is reported as *not published yet* - naming the origin, the status and the feed path - and not as "No connection"; that an unreachable host still is; and that neither throws away a library already stored on the device |
| `navigation.js` | node + Playwright | the shared simulation runner: Library to a simulation and back by button and by Back, one history entry per open, the bar still reachable 4,000 px into a long simulation, the Top control, direct file URLs and deep links, the simulation's own controls untouched, mobile layout, and Android's back order in the app shell |
| `schemagate.js` | node + Playwright | the feed schema latch: a 1.0.0 feed loads, a 1.4.2 feed loads, a 2.0.0 feed is refused with no library rendered on either platform, a feed with no schemaVersion is not treated as hostile, the manifest fallback is latched by the same rule, a refusal survives the feed going unreachable, and it clears itself once the build understands the format |
| `adsgate.js` | node + Playwright | the AdMob banner: exactly one anchored adaptive banner is requested, with Google's test unit while `ads.testing` is on and never the production one; no interstitial, rewarded, native or app-open ad is ever asked for; the reported height lifts the tab bar, the list and the toast instead of being covered by the ad; the banner goes down for the simulation viewer and an ad that loads late while a simulation is open does not pad the page; leaving a simulation resumes rather than buying a new ad, and a failed ad does; a rejecting `hideBanner` never reaches the page; and with `ads.enabled: false`, or no Capacitor at all, the plugin is never called and the layout is exactly what it was before ads existed |

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

## What `edgetoedge.js` can and cannot prove

It drives the real `app/www` shell in a real browser and sets `--safe-t/-b/-l/-r` with
exactly the statement `MainActivity.publishInsets()` builds, so **the CSS half is
verified, not asserted**. The native half - that Android actually reports those insets
and that the WebView receives the JavaScript - cannot run here: that needs an Android
SDK and an emulator, and the container has neither. The suite pins the seam between the
two halves statically instead: the property names `MainActivity.java` writes must be the
ones `app.css` reads, or it fails.

## A rule these suites follow

Any suite that edits the canonical source restores it in a `finally` block. An earlier
version did not, and a mid-run failure left the tree modified, which then failed the next
suite for the wrong reason. If you add a suite that writes anything, do the same.
