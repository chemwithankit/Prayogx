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
- Current library: **33 Chemistry simulations**, JEE Advanced 2026 Paper 1 Q1–Q16 and Paper 2
  Q1–Q17. P1 Q16 (built 2026-09-28) is the first page under the immersive standard; the owner reviewed
  and published it on 2026-09-29. There is no next build until the owner names one.

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
  key. If they disagree: **stop and investigate**.
- The page **computes** the answer from its model; it is never hard-coded.
- The model is valid over the whole input range. Representative data and exaggerated scales
  are labelled.
- **Scientific correctness outranks visual effects, always.**
- Works on phone, tablet and desktop: no horizontal overflow at 390/360 px, zero console
  errors, working reset / replay / restore, classroom mode, reduced motion.
- Detailed solution (always open), concept explanation and key takeaways.

**New simulations** follow layout v2, with **P1 Q12–Q15 as the reference**, and
progressively target an **immersive virtual laboratory**: the student feels they are
performing the experiment. That means pseudo-3-D or 3-D apparatus and molecules where they
aid learning, real interaction with apparatus and molecules, and animation that shows
CAUSE → PROCESS → EFFECT, never decoration. Prediction is optional and non-blocking. Full
standard: [docs/SIMULATION_STANDARDS.md](docs/SIMULATION_STANDARDS.md).

## Registry and generated files

- ID `ADV-<YEAR>-P<n>-<SUBJ>-Q<NN>`, with `SUBJ` one of `PHY | CHE | MAT` (enforced by
  `tools/check_library.py`). The folder is the lowercase ID under
  `simulations/<year>/paper-<n>/<subject>/`, holding `index.html`, `meta.json` and
  `question.md`.
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
| Fix or review an existing page | `.claude/skills/prayogx-review-existing/` |
| Tokens, components, animation CSS | `.claude/skills/prayogx-design-system/reference.md` |
| Standards, generations, immersive direction | `docs/SIMULATION_STANDARDS.md` |
| Decisions and open questions | `docs/DECISIONS.md` |
| Deploy, Android, testing setup | `docs/DEPLOYMENT.md`, `docs/ANDROID_RELEASE_READINESS.md`, `docs/TESTING_PORTABILITY.md` |
