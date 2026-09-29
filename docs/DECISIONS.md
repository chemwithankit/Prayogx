# PrayogX decisions

A dated log of product and process decisions. "Owner" means the project owner. Dates are 2026.
Newer entries supersede older ones. The detailed standard is in
[SIMULATION_STANDARDS.md](SIMULATION_STANDARDS.md).

## Standing decisions (recorded 2026-09-28)

| # | Decision |
|---|---|
| 1 | **PrayogX is library-first:** a curated library of interactive simulations built question by question, with the website, PWA and Android app as discovery layers. |
| 2 | **Student-facing AI generation is deferred** (student uploads a question → AI builds a simulation). No backend, credits, subscriptions or multi-tenant architecture for it unless the owner asks. |
| 3 | **AI / Claude is an internal development tool**, used to create, improve, debug, validate and maintain curated simulations. |
| 4 | **The owner chooses the questions.** Claude never selects one; "next question" means the lowest unbuilt question of the active paper and subject, named explicitly before any work starts. A vague request never starts a batch. |
| 5 | **The existing 32 simulations are preserved.** No retrofit to newer standards unless the owner asks for a specific page. |
| 6 | **New simulations follow the latest standard** (SIMULATION_STANDARDS.md). |
| 7 | **A prediction stage is optional and non-blocking.** It never gates the run or the answer. |
| 8 | **P1 Q12–Q15 (layout v2) are the current visual and layout reference.** |
| 9 | **New simulations progressively target immersive virtual-lab quality.** |
| 10 | **3-D is used where it improves learning**, never as decoration. True WebGL needs owner approval per simulation. |
| 11 | **Scientific correctness always outranks visual effects.** |
| 12 | **Mobile usability and performance remain mandatory.** |
| 13 | **Physics conventions will be set by the first real Physics simulation.** No Physics skill until then. |
| 14 | **Claude may create local commits only when the owner authorises it** (per task or per change). |
| 15 | **Claude never pushes or deploys without explicit owner approval.** Pushing to `main` deploys the site. |

## Earlier decisions still in force

| Date | Decision |
|---|---|
| 08-26 | Brand **PrayogX** on the website, every simulation, the template, the README and the tracker. |
| 08-26 | IDs are permanent. A redo edits the same folder and bumps `revision` + `updatedAt`. `data/manifest.json` is the single source; the website derives everything from it. |
| 08-27 | The answer is computed by the page, never hard-coded. Solve independently first; keys and published solutions verify afterwards. |
| 08-27 | `papers/` (exam PDFs) is private: git-ignored, deny-listed from Pages, with a PDF guard in CI. |
| 09-10 | Name positions as students do (octahedral 1–6); define jargon when first used; the answer blinks once and stops. |
| 09-17 | `data/tracker.csv` is the tracker's source of truth. The Google Sheet holds 19 scannable columns, and its URL lives in `data/manifest.json` → `library.tracker`. |
| 09-27 | Organic reaction questions show the complete two-level mechanism (vessel ↔ molecules, in sync). |
| 09-28 | For new pages: the answer is visible above the experiment, START and all controls sit below the screen, the detailed solution is complete and always open, and animation quality is premium and meaningful. |
| 09-28 | Canonical origin is `https://prayogx.co.in`; `chemwithankit.github.io/Prayogx` is only a legacy 301 redirect. |

## Superseded

- Header answer "always visible" (P2 Q01–Q04) → "locked until the run ends" (08-27, G2/G3) →
  **visible above the experiment** (09-28, G4 onward).
- Solution gated behind the run → **always open** (09-28).
- Prediction stage as part of the doctrine (08-27, G2) → dropped in practice (P1 Q01, Q03
  onward) → **optional, non-blocking** (09-28).
- Seven-section page → layout v2 for new pages. Older pages keep their generation.
- An external "master prompt" written per question → Claude writes the design brief itself.
- The Cowork build environment (container, device bridge, per-question packages, build kit):
  **retired**. Development now happens directly in this repository with Claude Code. The
  finished `index.html` files are the only source of simulation code.

## Builds

- **JEE Advanced 2026 · Paper 1 · Chemistry · Q16** (`ADV-2026-P1-CHE-Q16`): named by the owner on
  2026-09-28 and built the same day, the first page under the immersive standard (a pseudo-3-D reach
  scan, a two-level flask and mechanism bench, and explicit concept and takeaways). It is script-verified
  and **awaits the owner's review**. It carries `status: "draft"` in `meta.json` and the manifest, so the
  build keeps it out of the feed, crawlable pages, sitemap and revision lock. Publishing it after review
  means removing that field and regenerating (the owner's decision, 2026-09-29).
- **Next build:** none named. The owner chooses.

## Open: needs the owner's decision

| Topic | Options | Evidence |
|---|---|---|
| Feed `status` default | keep `human_verified` · change the default to `script_verified` · set per page as reviewed | `build_content.py` `DEFAULTS` publishes `human_verified` for all 32 in `content/`; nothing records a human review (SIMULATION_STANDARDS.md §9) |
| Layout-v2 template | replace `templates/simulation-template.html` · add a v2 template beside it · document "copy the latest G4 page" only | the template is the G1-era shell |
| Google Sheet tracker | CSV only (owner regenerates the Sheet) · try the Google Drive connector · drop the Sheet | the Sheet was recreated through a Cowork connector; Claude Code access is unverified |
| Published solution (MathonGo) access | Drive connector · owner supplies the text · official key + independent solving only | only 11 of 32 `verification.methods` cite MathonGo |
| Paper 2 tests | black-box Playwright (no page change) · add `window.PX` hooks (17 page edits + revision bumps) | Paper 2 pages have no `window.PX` |
| Deploying `CLAUDE.md` and `.claude/` | add both to the deny list in `.github/workflows/static.yml` · accept that they are public | the deploy uses a deny list; neither is excluded, so the next push publishes them at prayogx.co.in |
| Exam-PDF history clean-up (proposed in Cowork) | close · check on GitHub | the local history has one root and no exam PDF, only two `Claude outputs/` audit PDFs |
| `sim_p1q10.js` intermittent failure | apply the one-line test fix · leave it | a polling race in the test, not a page defect (TESTING_PORTABILITY.md §10) |
| Android release items | see [ANDROID_RELEASE_READINESS.md](ANDROID_RELEASE_READINESS.md) | consent, live ads, `app-ads.txt`, versionCode, keystore |
