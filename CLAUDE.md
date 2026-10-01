# PrayogX — working instructions for Claude Code

PrayogX is a **curated library of interactive JEE / NEET Chemistry and Physics simulations**.
Each one is a self-contained virtual experiment built from one exam question. Live site:
<https://prayogx.co.in> (the old `chemwithankit.github.io/Prayogx` only redirects there).
Repository: `github.com/chemwithankit/Prayogx`, branch `main`. Android package:
`com.prayogx.app`.

## Scope

- **Library-first.** Claude is an **internal development tool**: it builds, improves, debugs,
  validates and maintains curated simulations.
- The student-facing "upload a question → AI generates a simulation" platform is
  **deferred**. Don't build toward it: no backend, accounts, credits or AI-generation
  infrastructure unless the owner asks.
- Current library: **46 simulations** — 33 Chemistry (JEE Advanced 2026 Paper 1 Q1–Q16, Paper 2
  Q1–Q17) and 13 Physics (Paper 1 Q1–Q13, built by the factory, `script_verified`). P1 CHE Q16 was
  reviewed and published by the owner on 2026-09-29. There is no next build until the owner names one.

## Owner control

- **The owner chooses every question.** Never pick one yourself. "Next question" means the
  lowest unbuilt question of the active paper and subject: name the exact ID first. A vague
  request never starts a batch, and never build several simulations silently.
- **Never modify an existing simulation unless the owner asks for that page.** The 32 pages
  span four historical generations
  ([docs/SIMULATION_STANDARDS.md §3](docs/SIMULATION_STANDARDS.md)). Keep each page's
  generation and never retrofit to a newer standard.
- Don't touch Android native code, AdSense/AdMob configuration, `.github/workflows/static.yml`
  or deployment unless asked.

## Permanent simulation invariants

- One self-contained `index.html`, ES5, no external resources, no `fetch`, no browser
  storage.
- `<meta name="sim-id">`, unique element ids, `window.PX` test hooks.
- The question is **verbatim**. **Solve independently first**, then cross-check the official
  key. If they disagree: **stop and investigate**. The MathonGo solution is read first only as a
  conceptual reference for the intended JEE reasoning, never as the answer's source. The page is
  an original PrayogX experiment, not a reproduction of it.
- The page **computes** the answer from its model; it is never hard-coded.
- The model is valid over the whole input range. Representative data and exaggerated scales
  are labelled.
- **Scientific correctness outranks visual effects, always.**
- Works on phone, tablet and desktop: no horizontal overflow at 390/360 px, zero console
  errors, working reset / replay / restore, classroom mode, reduced motion.
- Detailed solution (always open), concept explanation and key takeaways.

**New simulations** follow **layout v3 (G5), the master visual standard**
([docs/SIMULATION_STANDARDS.md §4](docs/SIMULATION_STANDARDS.md)): the question, then a large,
immersive experiment as the hero, simple controls right beside it (no dropdowns), the detailed
solution, a graph only if useful, and how to use — no dashboards, badges or logs on the page. Each
page passes the visual QA gates A–K (`python3 tools/auto_sim.py gates`, `tests/visual_gates.js`).
They progressively target an **immersive virtual laboratory**: the student feels they are
performing the experiment. That means pseudo-3-D or 3-D apparatus and molecules where they
aid learning, real interaction with apparatus and molecules, and animation that shows
CAUSE → PROCESS → EFFECT, never decoration. Prediction is optional and non-blocking. From
2026-10-01 the key-result line is the **target**: only its name or symbol (never "UNKNOWN", "?" or
"—") until the experiment determines it, then the computed value with one short pulse, kept
visible. The answer is not shown before the run. Full standard:
[docs/SIMULATION_STANDARDS.md](docs/SIMULATION_STANDARDS.md).

## Reels (tools/reel-maker)

- **New simulation → reel automatically**, after it is validated and integrated
  (`prayogx-new-simulation` step 22, pipeline §7a). **Existing simulation → a reel only when the owner
  explicitly asks** ("Generate a Reel for Q3"), with `node tools/reel-maker/generate-reel.js <ID>`.
- A reel treats the simulation as a read-only source: no edits to its page, tests, data or the catalogue.
  A reel problem is fixed in the reel story (`tools/reel-maker/reels/<ID>.json`) or the reel tooling.
- Every reel must pass all 30 reel checks (11 of them on the audio: the MP4's decoded track and the music stem) and ends
  **READY_FOR_REVIEW**. Outputs stay in `tools/reel-maker/output/` (git-ignored, never deployed).
- **Audio is original only**: the score and effects are composed by `tools/reel-maker/music.py` (an arranged, evolving track per reel) and listed
  with provenance in `audio_library.json`. Never use film or chart songs, trending Instagram audio, YouTube or
  "free music" downloads, or any track whose commercial social-media licence is not verified.
- **Instagram publishing is human-gated** (`tools/instagram_publish.py`, docs/INSTAGRAM_PUBLISHING.md):
  READY_FOR_REVIEW → APPROVED only when the owner runs `approve` after watching the reel; `publish` is a
  separate command. Claude never runs `approve` or `publish` unless the owner explicitly asks for that reel in
  this conversation, never infers approval from validation, a commit or a push, and never puts a token in a
  file, log or message (`.env` is git-ignored; `.env.example` has placeholders only).

## Registry and generated files

- ID `ADV-<YEAR>-P<n>-<SUBJ>-Q<NN>`, with `SUBJ` one of `PHY | CHE | MAT`; concept simulations
  use `CON-<SUBJ>-<SLUG>` (draft-only until the clients render concepts). Both are defined once in
  `tools/registry_schema.py` and enforced by `tools/check_library.py`. A question's folder is the
  lowercase ID under `simulations/<year>/paper-<n>/<subject>/`, holding `index.html`, `meta.json`
  and `question.md`; a concept's is under `simulations/concepts/<subject>/`, with `concept.md`.
- IDs are permanent. A change to a published page bumps `revision` + `updatedAt`.
- `meta.json` stays byte-identical to its `data/manifest.json` entry. Write JSON only with
  Python `json`.
- **Never hand-edit generated files** (`data/manifest.js`, `data/revisions.json`, `content/`,
  `s/`, `sitemap.xml`, `robots.txt`, the `sw.js` stamp). Regenerate with:
  `python3 tools/sync_manifest.py && python3 tools/build_content.py && python3 tools/check_library.py && python3 tools/production_audit.py`,
  then confirm the CI drift gate
  (`git diff --quiet -- data/ content/ s/ sitemap.xml robots.txt sw.js` after regenerating).

## Validation

- Per simulation: `tests/verify_<pNqNN>.py` (≥ 2 independent routes, audit of every option)
  and `tests/sim_<pNqNN>.js` (Playwright). Library: `bash tests/runall.sh`.
- Local toolchain: `tests/.venv`, Playwright 1.56.1 / Chromium 1194 via `tests/_browser.js`.
  See `tests/README.md`.
- Screenshot every stage and **look** at it.
- Report exact pass counts. Never claim a suite passed that you didn't run. `sim_p1q10.js`
  has a known intermittent test race.
- **Never call a page human-verified** unless the owner confirms a review
  (SIMULATION_STANDARDS.md §9).

## Git safety

- Create local commits **only when the owner authorises it**. **Never push or deploy without
  explicit approval**: pushing to `main` deploys prayogx.co.in. The owner publishes with
  `./publish.sh`.
- **The one standing authorisation.** When the owner explicitly requests **production mode** for a
  **named list of items**, the factory may commit, push (`./publish.sh`) and deploy **those named
  items only**, one at a time, and only after every required gate for that item has passed and
  `tools/auto_sim.py preflight --online` passes (docs/AUTO_SIMULATION_PIPELINE.md §1). Such pages
  are published as `script_verified`, never `human_verified`. It does **not** authorise:
  unrequested items; blocked or failed items; anything after a scientific-verification failure or
  a critical-test failure; force-pushes; unrelated modifications; or bypassing any audit,
  validation or test. Everything else follows the rules above.
- Stage specific paths, never sweep in unrelated untracked files (`_scratch/`,
  `Claude outputs/`, test leftovers). `publish.sh` runs `git add -A`, so warn about stray
  files.
- `papers/` and PDFs never enter the repository.

## Where things are

| Need | Go to |
|---|---|
| Build a new simulation | `.claude/skills/prayogx-new-simulation/` |
| Chemistry doctrine (organic, physical, inorganic) | `.claude/skills/prayogx-chemistry/` |
| Validate before calling it done | `.claude/skills/prayogx-validate/` |
| Register in the library | `.claude/skills/prayogx-register/` |
| Batches, dry runs, the autonomous pipeline | `.claude/skills/prayogx-auto-simulation/`, `docs/AUTO_SIMULATION_PIPELINE.md`, `tools/auto_sim.py` |
| Sync the Google Sheet tracker (in place, never recreate) | `.claude/skills/prayogx-register/` §5, `tools/tracker_sheet.py` |
| Fix or review an existing page | `.claude/skills/prayogx-review-existing/` |
| Reels: generate, audio, review, approve, publish to Instagram | `tools/reel-maker/README.md`, `tools/instagram_publish.py`, `docs/INSTAGRAM_PUBLISHING.md` |
| Tokens, components, animation CSS | `.claude/skills/prayogx-design-system/reference.md` |
| Standards, generations, immersive direction | `docs/SIMULATION_STANDARDS.md` |
| Decisions and open questions | `docs/DECISIONS.md` |
| Deploy, Android, testing setup | `docs/DEPLOYMENT.md`, `docs/ANDROID_RELEASE_READINESS.md`, `docs/TESTING_PORTABILITY.md` |
