---
name: prayogx-auto-simulation
description: Run the PrayogX simulation factory - one or many questions or concepts, processed strictly one after another through source verification, independent solving, design, build, validation, registry, and (in production mode) commit, publish, deploy check, live smoke test and Sheet sync. Use when the owner gives a batch, a source to build from, or asks for a dry run of the pipeline.
---

# PrayogX simulation factory

Specification: `docs/AUTO_SIMULATION_PIPELINE.md`. Script: `tools/auto_sim.py`. This skill
orchestrates `prayogx-new-simulation`, `prayogx-chemistry`, `prayogx-validate`,
`prayogx-register` and `prayogx-design-system`; it replaces none of them. `CLAUDE.md` and
`docs/SIMULATION_STANDARDS.md` apply to every item. **Q16 (`ADV-2026-P1-CHE-Q16`) is the
reference process**, not a template: never clone its chemistry, layout or apparatus.

## 0. Mode

- **DRY-RUN unless the owner's message says production.** Say which mode you are in, in the
  first line.
- Production is for the **named items only** and additionally needs
  `python3 tools/auto_sim.py preflight --online` to print `PRODUCTION ALLOWED`. If it prints
  BLOCKED, name the failing gates, and continue in dry-run mode, or build each item to
  `production_audit_complete` and stop for the owner's review. Never work around a gate. The
  limits of the authorisation are in `CLAUDE.md` → Git safety.
- **New pages are built to layout v3 (G5)** — `docs/SIMULATION_STANDARDS.md` §4: the question, a
  large immersive experiment as the hero, simple controls right beside it (no dropdowns), the
  detailed solution, a graph only if useful, how to use; no dashboards or logs on the page. The
  owner's visual direction refines this, never overrides science, performance or usability.
  `python3 tools/auto_sim.py gates` lists the visual QA gates A–K every page must pass.
- Factory pages register with `"status": "script_verified"` - never `human_verified`.
  Concepts (`CON-<SUBJ>-<SLUG>`) register as `draft` and stop before commit until the clients
  render concepts. Mathematics stays blocked. Physics uses the interim gates (pipeline §5).
- The owner chooses every item. A source to "find concepts in" produces a candidate list for the
  owner to confirm, never a silent batch.

## 1. Plan

1. Turn the request into a spec (`docs/AUTO_SIMULATION_PIPELINE.md` §2) in the scratchpad.
2. `python3 tools/auto_sim.py plan <spec>` → the batch directory. Show the owner the plan table:
   IDs, duplicates skipped, blockers, warnings, files per item.
3. Source pages: `python3 tools/auto_sim.py render <pdf> --pages N`, then Read the PNG (the text layer
   in the `.txt` beside it is a cross-check; structures and diagrams are only in the image).
4. Dry run: `python3 tools/auto_sim.py simulate <batch>`, then do the read-only stages for real
   (sources, verbatim question, key, independent solve, cross-check, learning objective, design
   brief), recording each with `advance`. Finish with `python3 tools/auto_sim.py guard <batch>`
   (must print "dry run changed nothing").

## 2. Per item, strictly in order

Record every stage as it is done:
`python3 tools/auto_sim.py advance <batch> <n> <stage> --evidence "<pass count / path / hash / URL>"`.
The script refuses out-of-order stages, a second item before the first is finished, and write
stages in a dry run.

| Stages | Follow |
|---|---|
| 1–7 source → independent solve → cross-check | `prayogx-new-simulation` steps 1–4, `prayogx-chemistry` for Chemistry, pipeline §5 for Physics and concepts |
| 8–9 learning objective, design brief | `prayogx-new-simulation` 5–11, recording the layout v3 decisions (main visual, main action, controls, measurements, graphs, what is removed, what is seen first) |
| 10 implementation | `prayogx-new-simulation` 12–16 (item's own paths only) |
| 11–14 visual, verifier, suite, mobile | `prayogx-validate` §1–§4; visual gates A–K: `node tests/visual_gates.js <page>` + screenshots (pipeline §6); repair until clean |
| 15–16 registry, audits | `prayogx-register` §1–§4, `prayogx-validate` §5, `bash tests/runall.sh` |
| 17–21 production only | pipeline §7: commit by name → remote check → `./publish.sh` → live feed version → `auto_sim.py smoke <ID>` + `node tests/live_smoke.js <ID>` → Sheet sync (`prayogx-register` §5) |
| reel (every new question item) | after stage 16 (local build) or 21 (production): write the story (`generate-reel.js <ID> --draft`, edit, `--preview`), then `python3 tools/auto_sim.py reel <batch> <n>`. It is recorded on the item, not as a stage: a reel failure never blocks or undoes the simulation (pipeline §7a) |

Any disagreement between the independent result and the key or a source: **stop the item**
(`auto_sim.py fail <batch> <n> <stage> --kind source --detail "…"`). Never pick a side silently.

## 3. Failures

`fail --kind recoverable` (repair, rerun the failed check and the regressions, continue),
`--kind source` (item blocked; next item only if `continueOnBlocked`), `--kind critical`
(deploy, push, smoke or infrastructure: the batch stops). Never delete or weaken a test,
hard-code an answer, disable an error check, skip a verifier or audit, use `--no-verify` or
force-push.

## 4. Interrupted?

`python3 tools/auto_sim.py resume <batch>`: every claimed stage is re-checked against the
repository. Redo any stage marked DOUBT. Check the live site before making another commit.

## 5. Report

Per item: the `PRAYOGX AUTO BUILD COMPLETE` block (pipeline §10) with exact counts, the commit
hash, LIVE / NOT DEPLOYED and the reel (READY_FOR_REVIEW - never approved or published by the factory - or
"Simulation complete; Reel generation failed."). Per batch: `python3 tools/auto_sim.py report <batch>`. Blocked or
failed items are listed, never hidden. Automated verification is never called human verification;
Q16 is `human_verified` only because the owner reviewed it on 2026-09-29.
