# The PrayogX simulation factory

How one or many simulations are built, verified, registered and deployed in one sequential,
self-checking run. Operating procedure: `.claude/skills/prayogx-auto-simulation/SKILL.md`.
Supporting script: `tools/auto_sim.py` (tests: `tests/test_auto_sim.py`). Live browser smoke
test: `tests/live_smoke.js`.

The factory **orchestrates the existing workflow**. It does not replace it:

| Stage group | Done by |
|---|---|
| sources, question, key, independent solve, design, build | `prayogx-new-simulation` (+ `prayogx-chemistry` for Chemistry) |
| verifier, page suite, visual QA, library checks | `prayogx-validate` |
| meta.json, question.md, manifest, taxonomy, tracker.csv, regenerate, Sheet sync | `prayogx-register` |
| tokens, components, animation CSS | `prayogx-design-system` |
| plan, stage state, order, resume, dry-run proof, trace, live smoke | `tools/auto_sim.py`, `tests/live_smoke.js` |

Everything in `CLAUDE.md` and `docs/SIMULATION_STANDARDS.md` still applies to every item.

## 1. Modes

| Mode | What it may do | When |
|---|---|---|
| **DRY-RUN** (default) | read sources and the repository, solve, design, plan files, tests and deploy steps; write only `.tmp/` | always allowed; `auto_sim.py guard` proves nothing else changed |
| **PRODUCTION** | the whole pipeline per item, including one commit, `./publish.sh`, deploy check, live smoke test and Sheet sync | only when the owner's message says *production* for a named list of items **and** `auto_sim.py preflight --online` passes |

A production request is the owner's authorisation, for those named items only, to commit, push and
deploy each item once every gate for it is green (`CLAUDE.md` → Git safety). It never covers
unrequested, blocked or failed items, anything after a scientific-verification or critical-test
failure, force-pushes, unrelated changes, or skipping any audit, validation or test.

**Status.** Every page the factory publishes is registered with `"status": "script_verified"`:
it passed the independent scientific verifier, the browser / UI / mobile suite, the library checks
and the production audit, and after deploy it must pass the live smoke test. It is never
`human_verified`; that needs the owner's review (`SIMULATION_STANDARDS.md` §9). If the live smoke
test fails, the item is a **critical failure**: the batch stops and the owner is told the page is
live but failed its smoke test; any revert needs the owner (a published page cannot simply return to
`draft`, because the revision lock is append-only).

## 2. Input

Claude turns the owner's request into a spec (JSON), shows the plan, and runs it:

```json
{
  "mode": "dry-run",
  "continueOnBlocked": false,
  "visualDirection": "Premium immersive laboratory with advanced animation.",
  "items": [
    {"type": "question", "exam": "JEE Advanced", "year": 2026, "paper": 1, "subject": "Chemistry",
     "question": 17, "questionSource": "papers/Jee_Adv_2026_paper1_solutions_final.pdf#page=36",
     "solutionSource": "papers/Jee_Adv_2026_paper1_solutions_final.pdf#page=36"},
    {"type": "concept", "concept": "Buffer action", "subject": "Chemistry",
     "source": "https://ncert.nic.in/textbook/pdf/kech107.pdf", "slug": "BUFFER-ACTION"}
  ]
}
```

| Owner input | Spec |
|---|---|
| A. one question + solution source | one `question` item |
| B. several questions (lists or one folder / PDF / site) | one `question` item per question, in the owner's order; a folder or bank is read first and every question listed back to the owner with its source page before planning |
| C. one concept + source | one `concept` item (`subject` required; `slug` optional, defaults to the concept name) |
| D. several concepts | one `concept` item each |
| E. mixed batch | items exactly in the supplied order |
| F. "find the simulation-worthy concepts in this chapter" | read the source, list candidates with a one-line reason each and the existing pages they overlap (`nearDuplicates`), and **ask the owner to confirm the list**: the owner chooses every item (CLAUDE.md) |

A source is a local path (`papers/…`, optionally `#page=N`), a folder, or a URL. PDF pages are read by rendering them (`auto_sim.py render`, §11) and looking at the image; the page count is checked at planning. Local PDFs stay in
`papers/` (git-ignored); the planner refuses a PDF that git would commit. URLs are fetched at
`source_accessible` with WebFetch and recorded exactly. Visual-inspiration sites are for ideas only;
no design, asset or code is copied.

Sources have roles, and a role is never swapped: question source, solution / key source,
scientific reference, visual inspiration. If two authoritative sources conflict, the item stops
(`source` failure) with both cited.

## 3. IDs, files and duplicates

- Question: `ADV-<YEAR>-P<n>-<PHY|CHE|MAT>-Q<NN>` (JEE Advanced only; another exam has no ID
  scheme yet and is refused). Folder `simulations/<year>/paper-<n>/<subject>/<id-lowercase>/`.
- Test files: Chemistry keeps `tests/verify_pNqNN.py` / `tests/sim_pNqNN.js`. Every other subject
  puts the subject in the name (`verify_p1phyq01.py`), because the Chemistry names carry no subject
  and Physics P1 Q01 would otherwise overwrite Chemistry P1 Q01's suites.
- An ID already in the manifest is **skipped as a duplicate** and never rebuilt; changing a page
  needs the owner to name it (`prayogx-review-existing`). A planned file that already exists
  blocks the item.
- Concepts: the planner scores word overlap with every page's title, topic, tags and subtopics and
  lists matches of 50 % and more. Build only if the new treatment is materially different.
- Concepts: ID `CON-<PHY|CHE|MAT>-<SLUG>` (`CON-CHE-BUFFER-ACTION`): the slug is the concept name
  (or the item's `slug`) folded to 1–8 upper-case words joined by hyphens, whole ID ≤ 64
  characters. Folder `simulations/concepts/<subject>/<id-lowercase>/` with `index.html`,
  `meta.json` and `concept.md`; tests `tests/verify_con_<subj>_<slug>.py` / `sim_con_…js`.
  Registry fields: `kind: "concept"`, `id`, `path`, `folder`, `title`, `subject`, `chapter`,
  `topic`, `tags`, `learningObjectives` (list), `source` (title / author / edition / chapter /
  pages / url / file; at least a title, url or file), `verification.status`, `status`,
  `revision`, `createdAt`, `updatedAt`. All defined once in `tools/registry_schema.py`, enforced
  by `check_library.py` and `production_audit.py`. The same name in any spelling gives the same ID,
  so a repeat is caught as a duplicate; a materially different treatment gets its own `slug`.
- **Concept publication:** the website, the app and the crawlable pages render exam, year, paper
  and question number for every card, so a concept may be registered only as `draft` until they
  render concepts (`registry_schema.CONCEPT_PUBLISHABLE`). In production a concept item runs every
  stage through `production_audit_complete` and stops before `commit_complete`.

## 4. The per-item pipeline (21 stages)

Strictly in order; an item starts only when the previous item is complete, skipped or (with
`continueOnBlocked`) blocked. `auto_sim.py advance` refuses anything else, and refuses write
stages in a dry-run batch.

| # | Stage | Evidence required | Effect |
|---|---|---|---|
| 1 | input_received | plan line, ID, duplicate check | read |
| 2 | source_accessible | every source opened / fetched | read |
| 3 | source_verified | exam, year, paper, section, number, page, marking; for concepts title, author, edition, chapter, pages (never invented) | read |
| 4 | question_or_concept_verified | verbatim transcription; concept scope, definitions, equations | read |
| 5 | solution_verified | official key / solution read (question mode) | read |
| 6 | independent_solve_complete | solved before any key; laws, units, signs, limits | read |
| 7 | scientific_verification_complete | independent == key; concepts: equations, limiting cases, misconceptions checked | read |
| 8 | learning_objectives_complete | pivot, what is manipulated / observed, misconception | read |
| 9 | design_complete | design brief (`prayogx-new-simulation` template) | read |
| 10 | implementation_complete | page, verifier and suite in the item's own paths | work |
| 11 | visual_qa_complete | every stage + reveal at 1280 and 390 px, looked at, repaired | check |
| 12 | scientific_qa_complete | `verify_*.py` N passed, 0 failed | check |
| 13 | browser_qa_complete | `sim_*.js` N / N, zero console errors | check |
| 14 | mobile_qa_complete | 390 / 360 px no overflow, touch sizes, reduced motion | check |
| 15 | registry_complete | meta.json (`status: "script_verified"`; concepts `draft`), question.md / concept.md, manifest, taxonomy, tracker.csv, README, tests registered, regenerated | shared |
| 16 | production_audit_complete | check_library, production_audit, drift gate, `runall.sh` summary | check |
| 17 | commit_complete | one commit for this item only (`--commit` hash) | git |
| 18 | push_complete | `./publish.sh` fast-forward to `main` | remote |
| 19 | deployment_complete | live `content/catalog.json` version == this build | remote |
| 20 | live_smoke_test_complete | `auto_sim.py smoke` + `node tests/live_smoke.js` pass | check |
| 21 | item_complete | Sheet synced and verified (`prayogx-register` §5), report | remote |

## 5. Scientific gates

Every item needs an **independent** verifier (`tests/verify_*.py`): at least two routes, every
option audited, custom-condition controls. It must not read the page's answer and compare it with
itself; it may run the page's extracted engine only as one route among independent ones (Q16 does
this). The page computes its answer from its model; no answer literal.

- **Chemistry** (`prayogx-chemistry`): atom and charge balance after every step, valence, products
  matched by structure (RDKit canonical SMILES), stereo- and regiochemistry, mechanisms with
  conserved electrons, equilibrium, thermodynamics, kinetics, electrochemistry, acid-base, numbers.
- **Physics** (no doctrine skill yet): governing equations derived, units and dimensions checked
  (sympy), sign conventions stated, vectors resolved, conservation laws checked numerically,
  limiting and boundary cases, a numerical integration or scan independent of the closed form,
  physical plausibility of every displayed value.
- **Concepts**: every equation and reaction from the source re-derived or re-checked, limiting
  cases, one worked example computed two ways, misconceptions shown to fail in the model.
- **Mathematics or another subject**: no production build until a verifier doctrine exists.

Conflicts between the independent result and a key or source: **stop the item** and report both.

## 6. Visual and browser gates

Every new page is built to **layout v3 (G5)** (`SIMULATION_STANDARDS.md` §4): question → large
immersive experiment → nearby simple controls → detailed solution → graph only if useful → how
to use; no dashboards, raw logs or dropdowns for primary controls. `prayogx-validate` §3–§4 in
full, plus the owner's visual direction as a *design* direction that never overrides science,
performance or usability.

| Gate | Checks | How |
|---|---|---|
| A | main experiment scale: ≥ 90 % of the content width, ≥ 55 % of the screen height (desktop); full width, ≥ 45 % of the height (phone) | measured |
| B | object legibility: apparatus, molecules, labels, graphs readable from several feet away | screenshots |
| C | control proximity: `#controls` ≤ 48 px above or below the experiment | measured |
| D | no `<select>` among the primary controls | measured |
| E | information density: no raw logs, badges or rail; ≤ 2 charts, ≤ 4 readouts | measured |
| F | page simplicity: question → experiment + controls → solution → [analysis / explorer] → how to use | measured |
| G | realism: depth, lighting, materials, proportions; no decoration | screenshots |
| H | scientific correctness; no misleading exaggeration | verifier + suite |
| I | mobile: no overflow at 390 / 360 px, taps ≥ 44 px, canvas labels ≥ 11 px on screen | measured |
| J | classroom: experiment widened, narration ≥ 22 px, canvas labels ≥ 13 px on desktop | measured |
| K | target reveal (pages created from 2026-10-01): `#target` shows only the symbol before and during the run and after RESET — no UNKNOWN, ?, dash or answer; the computed value after the run, one pulse, none under reduced motion; value / option / match form (`tests/target_gate.js`) | measured |

Measured gates: `node tests/visual_gates.js <page>` (the list and thresholds:
`python3 tools/auto_sim.py gates`). After the functional build: one visual refinement pass (depth,
spacing, lighting, hierarchy, motion, molecule readability, graph clarity, result emphasis,
mobile, classroom mode), screenshots looked at; any failing gate is repaired automatically and
the gates and the page suite re-run. Animation shows CAUSE → PROCESS → EFFECT; no chemically or
physically impossible motion; no decorative motion.

## 7. Registry, build and deployment

Unchanged repository workflow: `prayogx-register` → `sync_manifest.py` → `build_content.py` →
`check_library.py` → `production_audit.py` → drift gate → `bash tests/runall.sh`. Generated files
are never edited by hand.

Production, per item, after stage 16:

1. `git status`: only the item's paths and the shared registry files changed; no PDFs, secrets,
   `.tmp/`, `_scratch/` or test leftovers. Stage paths by name; never `git add -A`.
2. One commit: `Add <exam> <year> P<n> <Subject> Q<NN> simulation`.
3. `git ls-remote origin main` equals the local `origin/main` (else stop: `publish.sh` would merge
   `-s ours`). Then `./publish.sh`. Never force-push, never `--no-verify`.
4. Wait for the live `content/catalog.json` version to equal the local one.
5. `python3 tools/auto_sim.py smoke <ID>` and `node tests/live_smoke.js <ID>`.
6. Tracker Sheet sync (`prayogx-register` §5), then the item report.

A failed deploy or smoke test is a **critical** failure: the batch stops (§8).

## 7a. The reel

Every **new** question simulation gets an Instagram reel once it is validated and integrated: after
`production_audit_complete` for a local build, and after `live_smoke_test_complete` in production. Write the
story spec (`node tools/reel-maker/generate-reel.js <ID> --draft`, then edit and `--preview`), then run
`python3 tools/auto_sim.py reel <batch> <n>`. That runs the generator with `--origin new-simulation`, which
records the real page read-only, composes, scores (original music and effects), encodes and runs 30 reel checks,
11 of them on the audio. The outcome is stored on the item as `reel: ready-for-review | failed`
(with the reel's own state, `READY_FOR_REVIEW` or a failure) and shown in the REEL column of `auto_sim.py report`.

The reel is **not** one of the 21 stages. A reel failure never blocks, fails or undoes the simulation; it is
reported as "Simulation complete; Reel generation failed." and fixed in the reel story or tooling. The simulation
itself is never touched (the generator hashes its folder before and after).

**Existing simulations** get a reel only when the owner asks for one, directly with
`node tools/reel-maker/generate-reel.js <ID>` (origin `on-request`), never automatically. The factory stops at
READY_FOR_REVIEW and never publishes: approval and Instagram publishing are separate human steps with
`tools/instagram_publish.py` (docs/INSTAGRAM_PUBLISHING.md); a production-mode authorisation for a simulation does
not cover its reel. The only exception is a question the owner names in End-to-End Production Mode (CLAUDE.md).
Reel files live in `tools/reel-maker/output/` (git-ignored; `tools/` is never deployed).

## 8. State, failures and resume

State lives in `.tmp/auto-simulation/batch-<timestamp>/` (git-ignored, never deployed):
`batch.json` (mode, order, repository fingerprint, HEAD) and `item-NNN/state.json` (plan, stages
with evidence and time, status, failure).

| Failure kind | Meaning | Action |
|---|---|---|
| recoverable | an ordinary defect (overlap, timing, selector, metadata, calculation bug) | diagnose → root cause → repair → rerun the failed check → rerun regressions → continue |
| source | unreadable, ambiguous or conflicting source; key disagrees and cannot be resolved | the item is **blocked**; the next item starts only if `continueOnBlocked` |
| critical | infrastructure, push, deploy, live smoke, anything that may affect other items | the **batch stops** |

Forbidden repairs: deleting or weakening tests, hard-coding answers, disabling error checks,
skipping the verifier, bypassing audits, `--no-verify`, force-push, deleting unrelated files.

Resume after an interruption: `python3 tools/auto_sim.py resume <batch>` re-checks every claimed
stage against the repository (files exist, ID in the manifest, commit exists and touches the
folder, commit is in `origin/main`) and names the next stage. A stage whose claim cannot be
confirmed is redone. Deployment is re-checked on the live site before any new commit.

## 9. Decided, and still open

Decided 2026-09-29: `script_verified` (§1); concept IDs, folders and fields (§3); Physics on the
interim §5 gates; mathematics blocked in production; PDF pages rendered with `pypdfium2` in the project venv, no system package (§11).

| Open | Blocks |
|---|---|
| Concept display in the website, the app (a store release) and the crawlable pages | publishing concept items |
| A `prayogx-physics` doctrine skill | nothing; recommended before large Physics batches |
| An independent mathematical verification workflow | any mathematics item (the gate stays) |
| Other exams (NEET, JEE Main): ID scheme | any such item |

## 10. Reports

Per item, the `PRAYOGX AUTO BUILD COMPLETE` block (type, ID, source, official answer, each gate
PASS / FAIL with counts, commit, LIVE / NOT DEPLOYED, live URL, warnings). Per batch,
`python3 tools/auto_sim.py report <batch>`: the ITEM | TYPE | ID | STATUS | SCIENCE | TESTS |
DEPLOYMENT | REEL table and TOTAL / COMPLETED / BLOCKED / FAILED / DEPLOYED / NOT DEPLOYED. A batch with
a blocked or failed item is never reported as a success. Status language follows
`SIMULATION_STANDARDS.md` §9: automated verification is never called human verification.

## 11. Environment prerequisites (not repository dependencies)

| Needed for | Prerequisite | Checked by |
|---|---|---|
| reading `papers/*.pdf` pages (source stages) | `pypdfium2` in `tests/.venv` (`tests/requirements.txt`; no system package). `python3 tools/auto_sim.py render <pdf> --pages N` writes `.tmp/auto-simulation/pages/<pdf>/pNNN.png` + `.txt` (git-ignored); Claude reads the PNG with the Read tool and cross-checks the text layer. Poppler's `pdftoppm` is accepted if present, never required | `auto_sim.py preflight` |
| verifiers | `tests/.venv` (sympy, numpy, scipy, RDKit) | `preflight` |
| page suites, live smoke | `tests/node_modules` Playwright 1.56.1 + Chromium 1194 | `preflight` |
| push | GitHub credentials on this Mac (`./publish.sh`) | the push itself |
| Sheet sync | the Google Sheets connector | `prayogx-register` §5 |

Nothing is installed by the factory; a missing prerequisite fails `preflight` and is reported.

## 12. Proof: the Q16 reference build

`python3 tools/auto_sim.py trace ADV-2026-P1-CHE-Q16 --run --online` reconstructs all 21 stages
from the repository and the live site: source page 35, verbatim question, key B, independent P1
Q2 R4 S5 → B, verifier and suite, registry, commits `5e72a93` → `7dc4105` → `8db6fb3`, push, feed,
live smoke, the owner's review of 2026-09-29 and the Sheet at 33 rows. On an older page the trace
reports what is missing rather than inventing it.
