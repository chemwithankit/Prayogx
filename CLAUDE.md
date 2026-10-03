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
- Current library: **50 simulations** — 33 Chemistry (JEE Advanced 2026 Paper 1 Q1–Q16, Paper 2
  Q1–Q17) and 17 Physics (Paper 1 Q1–Q16, Paper 2 Q1, built by the factory, `script_verified`). P1 CHE Q16 was
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
- Every reel must pass all 30 reel checks (11 of them on the audio: the MP4's decoded track and the music stem), plus
  the voice checks when it is narrated, and ends **READY_FOR_REVIEW**. Outputs stay in `tools/reel-maker/output/`
  (git-ignored, never deployed).
- **Reel duration is concept-driven, not fixed:** about 20–30 s for a basic simulation, about 40–50 s for a concept
  explanation, longer only when the concept genuinely needs it; guidelines, not limits. Never compress a meaningful
  explanation or pad (`tools/reel-maker/README.md` → Duration).
- **Music and effects are original only**: the score and effects are composed by `tools/reel-maker/music.py` (an arranged, evolving track per reel) and listed
  with provenance in `audio_library.json`. Never use film or chart songs, trending Instagram audio, YouTube or
  "free music" downloads, or any track whose commercial social-media licence is not verified. The one other
  permitted sound is a **verified, licensed external voiceover** (implemented 2026-10-03 as narrated variants; publishing them is not enabled yet): PrayogX
  writes the narration, a reviewed spoken form is voiced, the audio is verified word for word locally, its provenance
  and the standard AI-voice disclosure are recorded, and it never bypasses the checks or human approval. Paid voice
  generation is a separate command under an explicit credit cap, never part of building a reel. A narrated reel is
  planned in the simulation's design brief. Policy: `tools/reel-maker/README.md` → Voiceover.
- **Instagram publishing is human-gated** (`tools/instagram_publish.py`, docs/INSTAGRAM_PUBLISHING.md):
  READY_FOR_REVIEW → APPROVED only when the owner runs `approve` after watching the reel; `publish` is a
  separate command. Claude never runs `approve` or `publish` unless the owner explicitly asks for that reel in
  this conversation, never infers approval from validation, a commit or a push, and never puts a token in a
  file, log or message (`.env` is git-ignored; `.env.example` has placeholders only). The only exception is a
  question the owner names in End-to-End Production Mode (below).
- **After a VERIFIED publish** (owner's standing instruction, 2026-10-02) the publisher itself commits and pushes
  `tools/reel-maker/publications.json` alone (only from `main`, in step with GitHub, nothing else staged) and
  deletes the reel's hosted copy from the media repo. This covers only that ledger file and that hosted copy.
- **YouTube Shorts** (`tools/youtube_publish.py`, `tools/publish.py`, docs/YOUTUBE_SHORTS_PUBLISHING.md): the same
  approval and the exact approved reel.mp4; only on the owner's explicit `--youtube` request with a stated privacy
  (private first; unaudited API projects are private-only). Never authenticate or upload from the factory, except for
  a question the owner names in End-to-End Production Mode (below).

## End-to-End Production Mode (explicit, per question)

- **The default is unchanged.** Outside this mode every gate above stays exactly as it is: a reel, its approval, its
  Instagram publish and its YouTube Short each need the owner's own request in the conversation.
- **Trigger.** The owner explicitly says a named question is in End-to-End Production Mode (for example "Put
  ADV-2026-P2-PHY-Q03 into End-to-End Production Mode"). It covers that question only, for that request. It is never
  inferred from "production mode", a vague request, a validation result or another item.
- **What it authorises, without stopping to ask at any stage:**
  - the full production-mode build, including every gate, the preflight, the commit, `./publish.sh`, the live checks and the Sheet sync;
  - the reel: the story, `auto_sim.py reel` and all 30 reel checks;
  - approval: `instagram_publish.py approve <ID> --reviewer <owner> --note "End-to-End Production Mode authorization" --confirm <ID>`. The owner's instruction is the human approval, and it is recorded as such;
  - hosting the reel, then `publish --confirm <ID>`, with the automatic ledger record and hosted-copy removal;
  - the YouTube Short via `youtube_publish.py publish <ID> --privacy private --confirm <ID>`. Uploads are private unless the instruction names another privacy;
  - committing and pushing the publication records, the reel story and any reel-tooling fix the run needed;
  - a final check of GitHub, the live site and a clean working tree.
- **What it never relaxes:**
  - Every scientific, validation, test and audit gate still applies. A failure stops the pipeline at that stage and nothing later runs; for example, no reel is published after a failed check, and nothing goes public after a simulation failure.
  - The security rules still hold: official APIs only, no secrets in files or logs, no browser automation.
  - Nothing goes public on YouTube unless the instruction names that privacy.
  - No force-push, and no unrelated files.
- **Report once, at the end:** what was created, published (URLs), committed (hashes), pushed and verified, plus
  anything that failed or was skipped.

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
