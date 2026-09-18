# PrayogX platform architecture

**One codebase · one simulation library · one manifest · one content source · many clients.**

Status: v1 migration, branch `platform/v1`. Written 2026-09-18.

---

## 1. Current architecture analysis

### What exists

```
index.html            catalogue shell (45 lines) - loads site.css, manifest.js, site.js
site/site.js          the whole website: routing, filtering, search, cards, detail view
site/site.css         design system (custom properties, light + dark)
data/manifest.json    SOURCE OF TRUTH - one record per simulation
data/manifest.js      byte-identical mirror as window.SIM_MANIFEST, for file:// use
data/taxonomy.json    subject -> chapter -> topic -> subtopics tree
data/tracker.csv      internal progress tracker (never deployed)
simulations/<year>/<paper>/<subject>/<slug>/
                      index.html   the simulation - ONE self-contained file
                      meta.json    the same record the manifest carries
                      question.md  the question, derivation and verification log
tools/sync_manifest.py   sorts, recomputes counts, mirrors to manifest.js, cache-stamps
tools/check_library.py   validation gate
publish.sh            sync -> check -> commit -> push
.github/workflows/static.yml   deny-list tar -> GitHub Pages
papers/               source exam PDFs - gitignored, never deployed
```

### Findings

**Strong, and kept unchanged:**

1. The catalogue is already fully data-driven. `site.js` hard-codes no simulation. Years,
   subjects, chapters, topics, counts, cards and both dropdown hierarchies are derived from
   the manifest at load time.
2. Every simulation is a self-contained single HTML file. Verified across all 17: no external
   `src`/`href`, no `../` references, no CDN, no fonts, no fetch, no build step. This is the
   single most valuable property in the repository - it is what lets one artefact serve web,
   PWA, Android and iOS with no per-platform version.
3. Validation already covers unique IDs, required fields, broken paths, missing companions,
   meta-vs-manifest agreement, stale counts, an unparseable mirror and orphaned folders, and
   `publish.sh` refuses to push when it fails.
4. Deployment is a deny-list: a new simulation folder publishes with no workflow edit, and the
   job hard-fails if `papers/` or any PDF reaches `_site`.
5. Cache-busting is real: assets carry `?v=<hash of manifest>`, simulation links carry
   `?v=<revision>`.

**The scaling defect:**

`data/manifest.json` is **165 KB for 17 simulations** - about **8.4 KB per entry**, because each
record carries the full verification log, interactivity list, concept prose and derived
quantities. The catalogue downloads every byte of it before it can draw a single card, and
`manifest.js` ships the same payload again.

| simulations | full manifest | card-level index only |
|---|---|---|
| 17 | 165 KB | 19 KB |
| 100 | 0.8 MB | 115 KB |
| 1000 | **8.4 MB** | 1.1 MB |

Nothing else in the repository fails at 1000 simulations. This does, and it fails first.

**Also missing:**

| Gap | Consequence |
|---|---|
| No PWA - no web manifest, no service worker | not installable, nothing works offline |
| Hash-only routing (`#/sim/<ID>`) | no simulation has its own indexable URL; Google sees one page |
| Whole grid rendered at once | 1000 cards = 1000 DOM subtrees on first paint |
| No thumbnails | cards are text-only |
| No favorites / recently viewed / progress | nothing to return to |
| No `access` field | free/premium cannot be expressed without editing every file later |
| No mobile client | - |

---

## 2. Proposed architecture

```
                      AUTHORING (unchanged)
          data/manifest.json  +  simulations/**/index.html
                              |
                              |  tools/build_content.py   (new)
                              |  tools/check_library.py   (extended)
                              v
                      PUBLISHED CONTENT FEED
       content/catalog.json     feed version + per-sim revision map   (~30 KB @1000)
       content/index.json       card-level records                    (~1.1 MB @1000)
       content/sims/<ID>.json   full detail record, one file per sim   (fetched on demand)
       simulations/**/index.html   the simulation itself, untouched
                              |
        ----------------------+----------------------
        |                     |                      |
     WEBSITE               PWA                   MOBILE APP
   GitHub Pages     same origin + SW         Capacitor shell
                    app-shell cache          Android + iOS
                    per-sim runtime cache    same feed over https
```

Three rules hold the design together:

1. **`data/manifest.json` remains the source of truth and its schema is unchanged.** The feed is
   derived from it by a build step. Nothing that authors a simulation today has to change.
2. **The simulation HTML is the shared artefact.** No client re-implements a simulation; every
   client opens the same file at the same path.
3. **Clients read the feed, never the manifest.** The manifest may grow to megabytes; the feed
   is what ships.

### Layer separation

| Layer | Lives in | Changes when | Shipped to store? |
|---|---|---|---|
| App code | `index.html`, `site/`, `app/` | a feature changes | yes (mobile) |
| Simulation content | `simulations/**` | a simulation is added or revised | **no - fetched** |
| Catalogue metadata | `data/manifest.json` -> `content/` | a simulation is added or revised | **no - fetched** |
| User data | `localStorage` now, account later | continuously | n/a |

This is what makes "add once, available everywhere" true for the mobile apps as well: a new
simulation changes only the content layer, which the installed app fetches. No rebuild, no
resubmission.

---

## 3. Migration plan

Each phase ends with `tools/check_library.py` green and every existing simulation opening.

| Phase | Change | Risk | Reversible |
|---|---|---|---|
| 0 | branch `platform/v1`, docs | none | yes |
| 1 | `build_content.py` emits `content/`; nothing consumes it yet | none - additive | yes |
| 2 | `site.js` prefers `content/index.json`, falls back to manifest | low - fallback retained | yes |
| 3 | incremental grid rendering, favorites, recently viewed | low | yes |
| 4 | PWA: web manifest, icons, service worker, offline, update toast | low | yes |
| 5 | generated per-simulation stub pages -> indexable URLs | low - hash routes still work | yes |
| 6 | extended validation wired into `publish.sh` and the Pages job | none | yes |
| 7 | `app/` Capacitor shell, Android + iOS projects | isolated - own folder | yes |

**Breaking points identified, and how each is handled**

- *Stale service worker serving an old shell.* Cache name carries the feed version; the worker
  claims clients and the page shows an update prompt rather than silently switching.
- *Feed and manifest disagreeing.* The feed is generated, never edited; validation fails the
  build if `content/` is stale relative to `data/manifest.json`.
- *`file://` use.* `manifest.js` fallback is kept, so opening `index.html` from disk still works.
- *Existing bookmarks.* `#/sim/<ID>` keeps working; clean URLs are added alongside, not instead.
- *A simulation revised without a revision bump.* Validation flags a changed `index.html` whose
  `revision` did not move, since that is what defeats every cache in the chain.

---

## 4. Folder structure (target)

```
/                         web root, deployed to GitHub Pages
  index.html              app shell
  manifest.webmanifest    PWA manifest                             (new)
  sw.js                   service worker                           (new)
  offline.html            offline fallback                         (new)
  site/site.css|site.js   app code
  site/icons/             PWA + app icons                          (new)
  content/                GENERATED - the client feed              (new)
    catalog.json
    index.json
    sims/<ID>.json
  s/<ID>/index.html       GENERATED - indexable stub per simulation (new)
  simulations/**          the simulations themselves (unchanged)
  data/                   authoring source of truth (unchanged)
  tools/                  build + validation (not deployed)
  docs/                   this document                            (new)
  app/                    Capacitor shell                          (new, phase 7)
    capacitor.config.json
    www/                  thin native shell, NOT a copy of the site
    android/  ios/        generated native projects
  papers/                 gitignored, never deployed
```

---

## 5. Dependencies

**Web + PWA: none.** No framework, no bundler, no npm at runtime. The site stays vanilla ES5-safe
JavaScript, which is also what keeps the simulations portable. Build tooling stays Python 3
standard library.

**Mobile:** Node 20+, `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`,
`@capacitor/preferences`, `@capacitor/app`, `@capacitor/splash-screen`, `@capacitor/status-bar`.
Android Studio + JDK 17 for the AAB. Xcode 15+ on macOS for the iOS archive.

---

## 6. Manifest changes

The schema gains three optional fields, all defaulted by the build so no existing record must be
edited:

| Field | Default | Purpose |
|---|---|---|
| `access` | `"free"` | free / premium / pro - the UI reads it, nothing is hard-coded |
| `status` | `"human_verified"` | publishing state; `draft` entries are excluded from the feed |
| `thumb` | derived | card image path when one exists |

`revision` already exists and already drives cache-busting; it becomes the content version for
every client.

---

## 7. Simulation loader changes

Today: load the entire manifest, then render. After: load `content/index.json` (card fields only),
render the catalogue, and fetch `content/sims/<ID>.json` only when a detail page is opened. The
simulation itself is still opened as a plain URL, so the loader never has to understand a
simulation - which is why simulation #1000 needs no code.

---

## 8-10. Client plans

**Web + PWA.** App shell cached on install; the feed cached with stale-while-revalidate; an opened
simulation cached on first open so it works offline afterwards. Never pre-cache the whole library.

**Android.** Capacitor shell, `com.prayogx.app`. Remote content from the published site with an
offline cache; native back button mapped to in-app history; safe-area insets; portrait and
landscape both supported because simulations are wide.

**iOS.** Same shell, bundle `com.prayogx.app`, `WKWebView`, safe-area insets, swipe-back mapped to
history. Content updates are data, not executable code, which is what keeps remote updating inside
App Store policy.

---

## 11-13. Content, versioning, caching

- **Content update:** push to `main` -> validation -> Pages -> clients see a new
  `content/catalog.json` version and refresh their index. Installed apps pick it up with no store
  release.
- **Versioning:** every simulation carries `revision`; the feed carries a `version` hash over the
  whole catalogue. A client compares revisions to decide what to re-fetch. Rollback is a git revert
  of the content, since the feed is generated.
- **Caching:** app shell - cache first, revalidate on activate. Feed - stale-while-revalidate.
  Simulation HTML - cache on open, keyed by `?v=<revision>`, bounded by an LRU cap so the cache
  cannot grow without limit.

## 14. Deployment

`publish.sh` -> sync manifest -> build content -> validate -> commit -> push -> Pages workflow
re-validates and refuses to deploy on failure. Mobile releases are manual and rare, because
content does not need them.

## 15. Testing

Extended `check_library.py` (IDs, paths, assets, counts, orphans, feed freshness, revision
discipline) plus the existing headless Playwright suites per simulation. Manual matrix: desktop
Chrome and Safari, mobile Safari and Chrome, an Android device, an iPad, and a classroom display.

## 16. Scalability

At 1000 simulations: feed index ~1.1 MB (shardable by subject or year if it ever needs to be),
detail records fetched one at a time, grid rendered incrementally, simulations fetched on demand.
No component holds the whole library in memory except the index, and the index is deliberately the
smallest record that can draw a card.
