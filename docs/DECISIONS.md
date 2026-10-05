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
| 09-28 | For new pages (answer visibility superseded 10-01, see above): the answer is visible above the experiment, START and all controls sit below the screen, the detailed solution is complete and always open, and animation quality is premium and meaningful. |
| 09-28 | Canonical origin is `https://prayogx.co.in`; `chemwithankit.github.io/Prayogx` is only a legacy 301 redirect. |
| 10-02 | **NCERT Explorer**, a second, additive content track ([NCERT.md](NCERT.md)): NCERT concept → simulation (LEARN), beside the JEE Questions Library (APPLY). Separate discovery systems over one simulation library, sharing the simulation engine, media and publishing pipelines. Dedicated `/ncert/` page; mapping in `data/ncert/`, feed in `content/ncert/`. Chapter IDs `NCERT-<CLASS>-<SUBJ>-P<n>-CH<NN>`; simulations keep `CON-` IDs. JEE pages are linked as "Related JEE problems" by ID only, never edited. Concepts are published only through the NCERT Explorer and never reach the JEE feed. Unlinked and `noindex` until the owner's deployment approval. |
| 10-02 | **NCERT PDFs are not hosted or proxied.** The student opens the official chapter PDF locally (PDF.js, a pinned version vendored inside `/ncert/` only) with "Read Official NCERT PDF ↗" as the fallback; `source.hosted` stays `null` until written permission is recorded here. The source layer is swappable. Real-device checks on iOS and Android are the Phase 3 exit gate. |
| 10-02 | **Visual learning objective (library-wide, new pages):** every important concept gets its strongest visual and interactive representation, chosen in this order: interactive simulation → experimental / graph explorer → real-world simulation → animation → static visual only when nothing else adds value. Every interaction must have pedagogical value. See NCERT.md §2. Existing pages are not retrofitted. |
| 10-02 | **NCERT media** ([NCERT_MEDIA.md](NCERT_MEDIA.md)): concept → simulation → educational animation → English voiceover → a **20–30 s standard reel** or a **40–50 s concept-explanation reel** → Instagram + YouTube Shorts. The reel type is declared and its duration validated automatically; the animation's length is set by the concept. The voiceover provider is pluggable (recorded / licensed TTS / internal) with provenance and licence recorded; macOS system voices are drafts only. JEE reel rules unchanged; human approval gates unchanged. |
| 10-03 | **Reel voiceover, Phase 0 (policy only; no code yet)** — full text in `tools/reel-maker/README.md` → Voiceover and Duration. A provider-neutral voice layer feeds a verified voice stem into the existing `audio.py` mix (VOICE > MUSIC > SFX); music, effects, mastering, encoding, recorder, composer and publishers are unchanged. PrayogX owns the narration; providers receive only the human-reviewed spoken form (exact notation stays on screen). Every voiceover is verified locally word for word (whisper.cpp; transcriber spellings only through a reviewed equivalence table; low word probability → listening flag, not failure). Reel audio is PrayogX-original or a verified, licensed external voice recorded in `audio_library.json`; one standard AI-voice disclosure line, only on narrated reels. Paid generation: prepare → estimate → explicit per-run credit cap → explicit generation, never triggered by a reel build. Narration is planned in the design brief when a narrated reel is intended; the visual story leads and the answer reveal and other key moments stay clear of narration. Silent reels unchanged; voice checks only when narrated; human approval unchanged. **Reel duration is concept-driven** (about 20–30 s basic, 40–50 s concept explanation, longer when genuinely needed; guidelines, not limits). Provisional profile: Higgsfield / ElevenLabs `elevenlabs_v4` / Emily / English, qualified 2026-10-03 for that configuration and workflow only. NCERT Explorer may reuse the infrastructure later; nothing in it changes now. |
| 10-03 | **Narration model: narrate the story, not the screen** (owner, after reviewing the narrated Q01 reel). A narrated reel may speak at any beat, hook → context → question → experiment → observation → aha → answer → payoff, but only where speaking improves the story or the concept; every beat's narration is optional. On-screen text is never automatically spoken: a segment is an explanation, an interpretation, a condensed sentence or a short line said naturally (`mode`), or absent. Long problem statements are skipped or condensed into one conceptual sentence, never read word for word. Visual first: the reel works muted. Fixed beats may be lengthened (never shortened) with `story.beatSeconds`; duration stays concept-driven. On narrated reels the music rule "louder in the simulation than under the question" uses the music before voice ducking; silent reels unchanged. Details: `tools/reel-maker/README.md` → Narration model. |
| 10-03 | **Voiceover, Phase 1 — the four open points locked by the owner.** (A) **YouTube synthetic media:** a Short with AI narration is handled explicitly and never inherits the silent-reel `containsSyntheticMedia: false`; the publisher is changed in the phase that first builds a narrated reel, and until then narrated reels cannot be built at all (`generate-reel.js` refuses them). (B) **One provenance system:** `tools/reel-maker/audio_library.json` stays the single asset and licence registry; voice assets are role `voice`, source `external-tts`; per-reel voice records live in the reel's output and reference the asset ID; no separate `voice_library.json` (supersedes that plan in `docs/NCERT_MEDIA.md` §4 when NCERT reaches its voice phase). (C) **NCERT narrated media follow the same concept-driven duration:** shorter when sufficient, longer when scientifically or pedagogically justified, never compressed and never padded. (D) **Disclosure:** "Narration: AI-generated voice reading a script written and checked by PrayogX.", stored once as the voice asset's `disclosureText`. Phase 1 (offline): `voice_profiles.json` (provisional `prayogx-en-emily-v1`), the voice asset and its licence record (`tools/reel-maker/licences/`), `narration.py` (validation and the credit-cap gate, no provider calls), `tests/test_narration.py`. |
| 10-01 | **Target variable / result display** for every new page (SIMULATION_STANDARDS.md §4): the key-result line shows only the target's name or symbol, never "UNKNOWN", "?", "—" or a placeholder, until the experiment determines it. Then it shows the computed value in the same place, with one short pulse, and the value stays. The answer is no longer shown above the experiment before the run; it stays in the always-open solution. This supersedes "the answer is visible above the experiment" (09-28) for new pages. Pages built before 10-01 (G1–G4, and G5 P1 PHY Q03–Q13) are not retrofitted. |
| 10-01 | **The MathonGo solution is a conceptual reference** for every new simulation: read it for the intended JEE reasoning, then derive the answer independently (≥ 2 verifier routes) and read the official key last. Disagreement still means stop and investigate. The simulation is an original PrayogX interpretation, never a reproduction of the solution. Refines 08-27: the independent solve is unchanged. |
| 10-05 | **Concepts are publishable through the NCERT Explorer** (owner, best-practice Phase A of the first NCERT reel): `registry_schema.CONCEPT_PUBLISHABLE` is on. A concept is published as `script_verified` (or `human_verified` after the owner's review) only when a chapter maps it under `understand`; drafts and unmapped concepts are still refused, and concepts never enter the JEE feed, `s/` or the sitemap. The panel's **Understand** block opens the concept page in a new tab. First: CON-CHE-DELTA-U-VS-DELTA-H (XP-09), mapped to 5.2.2 and 5.3. `/ncert/` stays unlinked and `noindex` (Phase 8). |
| 09-30 | **Layout v3 (G5), the master visual standard**, for every new page and concept page (SIMULATION_STANDARDS.md §4): question → a large, immersive experiment as the hero → simple controls right beside it (toggles, segmented buttons, number inputs, sliders — no dropdowns) → detailed solution → a graph only if useful → how to use. No dashboards, badges, logs or evidence tables on the page (internal only). Visual QA gates A–J, measured by `tests/visual_gates.js` where measurable. Existing pages keep their generation. |
| 09-29 | **`script_verified`** is a registry status: passed the automated pipeline (independent verifier, browser / UI / mobile suite, library and production audits, live smoke after deploy) with no human review. Factory-published pages carry it explicitly; they are never `human_verified`. Existing statuses unchanged. |
| 09-29 | **Concept IDs** are `CON-<PHY\|CHE\|MAT>-<SLUG>` (slug: 1–8 upper-case words, ID ≤ 64 characters), folder `simulations/concepts/<subject>/<id-lowercase>/`, `concept.md` beside `meta.json`; fields and rules in `tools/registry_schema.py`. Concepts register as `draft` only until the website, the app and the crawlable pages render them. |
| 09-29 | Simulation factory (`prayogx-auto-simulation`, `tools/auto_sim.py`): production mode only for a named item list the owner requests, narrowly scoped in `CLAUDE.md`. Physics runs on the interim gates (pipeline §5) until a physics skill exists; mathematics stays blocked until an independent mathematical verification workflow exists. Poppler (`pdftoppm`) is an environment prerequisite for reading `papers/`, never a repository dependency. |
| 09-29 | The Google Sheet tracker is permanent (same ID and URL) and is synced **in place** by upsert on Simulation ID through the Google Sheets connector, as part of registration: `tools/tracker_sheet.py` plans, prechecks and verifies; writes are `update_values` to planned ranges only; no recreate, no deletion, no `append_values`. The tab is found by `sheetId`; numbers compare numerically. A failed or skipped sync is reported as incomplete / pending, never as done. |

## Superseded

- Header answer "always visible" (P2 Q01–Q04) → "locked until the run ends" (08-27, G2/G3) →
  **visible above the experiment** (09-28, G4 onward).
- Solution gated behind the run → **always open** (09-28).
- Prediction stage as part of the doctrine (08-27, G2) → dropped in practice (P1 Q01, Q03
  onward) → **optional, non-blocking** (09-28).
- Seven-section page → layout v2 for new pages → **layout v3 (G5)** for new pages (09-30). Older pages keep their generation.
- Rail, gauge grid, badges, reasoning log, evidence table and select menus as standard page furniture (G4) → not shown on new pages; the data stays internal for the tests (09-30).
- Tracker Sheet recreated from the CSV on every update (a new URL each time, via the Drive
  connector) → **permanent Sheet, upsert in place** through the Sheets connector (09-29).
- An external "master prompt" written per question → Claude writes the design brief itself.
- The Cowork build environment (container, device bridge, per-question packages, build kit):
  **retired**. Development now happens directly in this repository with Claude Code. The
  finished `index.html` files are the only source of simulation code.

## Builds

- **JEE Advanced 2026 · Paper 1 · Chemistry · Q16** (`ADV-2026-P1-CHE-Q16`): named by the owner on
  2026-09-28 and built the same day, the first page under the immersive standard (a pseudo-3-D reach
  scan, a two-level flask and mechanism bench, and explicit concept and takeaways). It is script-verified
  and was held as `status: "draft"` until the owner's review. The owner reviewed and approved it on
  2026-09-29, and it was published by removing that field and regenerating.
- **Next build:** none named. The owner chooses.

## Open: needs the owner's decision

| Topic | Options | Evidence |
|---|---|---|
| Feed `status` default for the older pages | keep `human_verified` · set `script_verified` on pages with no recorded review · set per page as reviewed | `build_content.py` `DEFAULTS` publishes `human_verified` for every page without a `status`; only Q16 records an owner review (SIMULATION_STANDARDS.md §9). The factory no longer depends on this: its pages carry `script_verified` explicitly |
| Concept display | render concept cards and pages in `site.js`, the app shell (a store release) and `build_content.py`'s crawlable pages | until then concepts are draft-only (`registry_schema.CONCEPT_PUBLISHABLE = False`) |
| Physics skill; mathematics verifier | add a `prayogx-physics` skill · define an independent mathematical verification workflow | Physics runs on the interim gates; mathematics is blocked in production |
| Other exams (NEET, JEE Main) | ID scheme | IDs are `ADV-` only; the factory refuses other exams |
| Layout-v2 template | replace `templates/simulation-template.html` · add a v2 template beside it · document "copy the latest G4 page" only | the template is the G1-era shell |
| Published solution (MathonGo) access | Drive connector · owner supplies the text · official key + independent solving only | only 11 of 32 `verification.methods` cite MathonGo |
| Paper 2 tests | black-box Playwright (no page change) · add `window.PX` hooks (17 page edits + revision bumps) | Paper 2 pages have no `window.PX` |
| Deploying `CLAUDE.md` and `.claude/` | add both to the deny list in `.github/workflows/static.yml` · accept that they are public | the deploy uses a deny list; neither is excluded, so the next push publishes them at prayogx.co.in |
| Exam-PDF history clean-up (proposed in Cowork) | close · check on GitHub | the local history has one root and no exam PDF, only two `Claude outputs/` audit PDFs |
| `sim_p1q10.js` intermittent failure | apply the one-line test fix · leave it | a polling race in the test, not a page defect (TESTING_PORTABILITY.md §10) |
| Android release items | see [ANDROID_RELEASE_READINESS.md](ANDROID_RELEASE_READINESS.md) | consent, live ads, `app-ads.txt`, versionCode, keystore |
