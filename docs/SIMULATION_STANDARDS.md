# PrayogX simulation standards

The standard every **new** PrayogX simulation is built to, and the facts about the 32 that
already exist. Decisions and their dates are in [DECISIONS.md](DECISIONS.md). The workflows
that apply this standard are the project skills in `.claude/skills/`.

When this document and the repository's tools disagree, **the tools win**
(`tools/check_library.py`, `tools/build_content.py`, `tools/production_audit.py`). Fix the
document.

---

## 1. What a PrayogX simulation is

A curated, self-contained virtual experiment built from one exam question. The student should
discover the answer by working the experiment, not by reading it.

```
Subject → Chapter → Topic → Question → Interactive simulation → Observation / experiment
        → Answer → Detailed solution → Concept explanation → Key takeaways
```

What PrayogX values, in priority order when they conflict:

1. scientific correctness
2. pedagogical quality and concept clarity
3. meaningful interaction and animation
4. visual polish
5. reliability: offline, self-contained, fast on ordinary phones

## 2. Permanent invariants (every new simulation)

**File and runtime**

- One self-contained `index.html`: all CSS in one `<style>`, all JS in one `<script>` (IIFE,
  `"use strict"`).
- ES5 only: no arrow functions, `let`/`const`, template literals or optional chaining. The
  Paper 1 suites test for this.
- No external scripts, stylesheets, fonts or CDNs; no `fetch`; no `localStorage`,
  `sessionStorage` or IndexedDB. None of the 32 existing pages uses any of these. Any
  exception needs the owner's explicit approval.
- It must open from disk, a USB stick or any static host.
- `<meta name="sim-id" content="<ID>">`. Every element id is unique: a duplicate id once
  silently killed an animation loop.
- Expose `window.PX` test hooks (run state, answer, stage, reset, replay, pause, speed,
  `setField`…) as the Paper 1 pages do. The Playwright suites drive the page through them.
- `role="img"` + a meaningful `aria-label` on every canvas and SVG. Honour
  `prefers-reduced-motion`.

**Science**

- The question is reproduced **verbatim**: numbers, units, conditions, options, structures.
  Never paraphrase.
- Solve it **independently first**. Only then compare with the official key (and a published
  solution, if available). If they disagree: **stop, investigate, report**. Never ship on
  the key's word alone.
- The page **computes** the answer from its model (e.g. `var QRUN = run(copyST()); var ANS =
  QRUN.answer;`). The answer is never a stored literal; the suites check the source for this.
- The model is valid across the **whole allowed input range**, not only the question's
  numbers.
- Representative data (where the question gives none) and exaggerated scales are **labelled**
  on the page and noted in `meta.json` → `verification.note`.
- **Scientific correctness outranks every visual effect.**

**Experience**

- Question values pre-loaded. Custom inputs only where scientifically meaningful, with honest
  warnings when a change takes the run off the question's pathway, and a
  "restore question conditions" control.
- RESET returns to the ready state, REPLAY reruns the same experiment, and restore resets
  custom inputs. All three work.
- Usable on phones, tablets and desktops: no horizontal overflow at 390 and 360 px
  (`scrollWidth − clientWidth == 0`), and tap targets ≥ 32 px (native selects
  `min-height: 40px`).
- Zero console errors.
- A classroom / projector mode with enlarged narration.
- A complete detailed solution, a concept explanation and key takeaways (see §5).

## 3. The 32 existing simulations: four page generations

They were built over time to different rules. **They are preserved as they are.** They are
not retrofitted to a newer standard unless the owner asks for a specific page.

| Gen | Pages | Page shape | Answer at load | Solution | Prediction stage | `window.PX` |
|---|---|---|---|---|---|---|
| G1 | P2 Q01–Q04 | seven sections | visible | open | no | no |
| G2 | P2 Q05–Q17, P1 Q02 | seven sections + prediction | locked until the run ends | gated | yes | P2 no · P1 Q02 yes |
| G3 | P1 Q01, Q03–Q11 | compact lab (question · experiment · [explorer] · solution · how to use) | locked | gated | no | yes |
| G4 | **P1 Q12–Q15** | **layout v2 — current reference** | visible above the experiment | always open | no | yes |

Consequences:

- A "fix" to one old page must keep that page's generation. Don't mix in G4 behaviour
  unasked.
- Paper 2 pages have no `window.PX`. Their tests (none exist yet) cannot reuse the Paper 1
  suite pattern without adding hooks, and adding hooks is a page change (revision bump).
- `templates/simulation-template.html` is the **G1-era** shell (seven sections). It remains
  useful for the design tokens and the brand mark, but **it is not the layout for new pages.**
  Start new pages from a G4 page.

## 4. Current layout: layout v2 (reference: P1 Q12–Q15)

Copy structure, tokens and helpers from the closest G4 page. Do not reconstruct them.

```
header     brand bar · sim ID · H1 · chips · header answer box · theme toggle
nav.jump   sticky, one anchor per section
Mission brief          verbatim question (tables/structures rebuilt) · unknown tiles
01 Interactive experiment
   status bar + stage chips                                  #xstat
   ANSWER STRIP — the answer, visible from page load         #ansstrip
   experiment screen  .lab3d > canvas#labcv (1040×620)  |  .rail: status · custom inputs · gauges
   DOCK, below the screen                                    #dock
       ▶ START · Pause · REPLAY · RESET · speed · CLASSROOM · SHOW EQUATION / OBSERVATION / WHY? · slow motion
   live SVG charts · option / audit board · badges · reasoning log + evidence table
02 Explorer            a tool that fits the concept (mechanism, 3-D molecule, VSEPR, ΔG–T …)
03 Detailed solution   always open
04 How to use this simulation + classification
footer
```

- **Answer visibility:** the answer is visible above the experiment from page load (answer
  strip + header box). The run still *confirms* it: stage messages, then the reveal, then the
  answer blinks once and stops. During a custom run the header keeps showing the question's
  answer.
- **One START** runs the whole investigation automatically, typically 8–13 stages of a few
  seconds each, one scene per stage, each proving one piece of the answer. Pause, speed and
  reduced motion govern every animation, through a virtual clock.
- **Prediction is optional and non-blocking.** A new page may invite a prediction, but it must
  never gate the run or the answer.
- **New for future pages:** an explicit **Concept explanation** and **Key takeaways** block
  (§5). G4 covers concepts inside the solution and classification; future pages make both
  explicit.

## 5. Answer, solution, concept, takeaways

- **Detailed solution**: complete and exam-level, always open. Every step, equation and
  calculation. For organic chemistry, the actual structures of every compound and the full
  mechanism drawn with curved arrows. An option table that says why each distractor fails,
  the common traps, and an **independent verification** block (≥ 5 checks: e.g. exact solve,
  numerical cross-check, limiting cases, dimensional analysis, distractor audit, official key,
  published solution).
- **Concept explanation**: the one idea the simulation turns on (its *pivot*), stated plainly.
  Define jargon at the point of use, and name positions the way students do (octahedral 1–6,
  ring locants).
- **Key takeaways**: 3–6 short, exam-useful statements the student should keep.

## 6. Future direction: the immersive virtual laboratory

> The student should feel they have entered a virtual laboratory and are personally
> performing the experiment, not watching a 2-D animation.

This is a **progressive target for new simulations**. It is never a reason to retrofit the 32
existing pages.

**Apparatus and environment.** Premium 3-D or pseudo-3-D where it helps: depth, perspective,
believable glassware, liquids, surfaces, instruments, lighting and shadow where technically
sensible. Apparatus should feel physically present.

**Apparatus interaction**, where educationally meaningful: rotate and zoom the view, inspect
components, turn knobs, open valves, flip switches, use electrodes, burettes and pipettes,
drag components, and change settings with immediate, visible cause and effect. Every drag
needs a tap / keyboard fallback.

**Molecular interaction**, where spatial structure teaches something: rotate and zoom
molecules, inspect and select atoms and bonds, highlight the reacting atoms and bonds, and
show bond breaking and formation, electron movement along curved arrows, intermediates and
products, viewable from different angles.

**Animation** becomes smoother, more spatial, more responsive and more realistic: depth,
parallax, particle and fluid behaviour, molecular motion, instrument responses, well-timed
transitions. **Every major animation communicates CAUSE → PROCESS → EFFECT.** Nothing is
decorative for its own sake, and there is no irrelevant gamification (no XP, coins or
streaks).

**Target experience**

```
Question → enter the lab → inspect apparatus / molecule → interact → perform the experiment
→ observe real-time change → understand cause → effect → discover the answer
→ detailed solution → concept → key takeaways
```

**Choosing the rendering level.** Pick the lightest level that delivers the learning:

| Level | Use when |
|---|---|
| 2-D Canvas / SVG | the concept is a graph, a count, a flat structure or a 2-D process |
| pseudo-3-D (Canvas depth sorting, CSS/SVG perspective, parallax) | apparatus or molecules benefit from depth. This is the existing G4 technique: rotating ball-and-stick with depth sorting |
| true WebGL 3-D | spatial understanding is the point *and* it runs well on ordinary phones. **Requires the owner's approval** per simulation, because the single-file, no-library rule means hand-written WebGL |

**Non-negotiable constraints on realism**

- Scientific correctness first. A realistic look must never imply a wrong process, scale or
  quantity. Pedagogical exaggeration is deliberate and **labelled**.
- It must stay usable and smooth on ordinary phones, tablets and laptops. Cache heavy
  computation, and don't block the main thread for long.
- It stays accessible: keyboard operation in explorers, reduced-motion support, text as well
  as colour for every signal.
- It stays inside the invariants of §2: one file, ES5, no libraries or CDNs unless the owner
  approves.

## 7. Chemistry conventions

**Organic** (every reaction-based question)

- **Two levels, in sync:** the vessel (macroscopic: reagents added, colour, gas, precipitate,
  temperature) beside the molecules (atoms, bonds, electrons, intermediates), each vessel
  event tied to its mechanistic step.
- Molecules are **graphs** (atoms with H counts, bond orders). Each elementary step is a list
  of curved arrows **pushed** on the graph: one electron pair from a lone pair or bond into a
  bond or onto an atom. Charges are **derived from bonding**, never typed.
- After every step: a valence check and charge conservation. The tests assert that every
  intermediate is valid and that every product equals what its arrows produce.
- Show the attacking species (lone pair), the direction of attack, bonds breaking (red,
  dashed) and forming (green), electron-pair movement along each arrow in order,
  intermediates, and the product. Structures never simply appear or disappear.
- Products are identified and matched to the options **by structure comparison**, never by a
  stored mapping. Selectivity rules are computed, and the rejected alternatives are shown.
- Show the reaction conditions and their observable consequences (baths, gas, end-point
  colours, precipitates).
- Layout coordinates may be precomputed at build time (e.g. with RDKit, as in
  `tests/gen_q15.py`). **The chemistry may not.**

**Physical chemistry**

- Realistic, appealing apparatus (calorimeter, cylinders and pistons, cells, bubblers, baths,
  meters, particle views).
- The controls are the variables of the governing equations, pre-filled with the question's
  values.
- Instruments, graphs and equations all read the same model state. Equations are bound live
  to the student's numbers. Graphs update as the experiment runs, and compressed or symlog
  axes are labelled.

**Inorganic / coordination**

- Spatial structures (rotatable ball-and-stick with depth sorting), lone pairs as lobes, and
  coordination geometry with labelled positions: octahedral **1–4 round the square plane, 5–6
  axial**, with the key printed where drawn.
- Ligand placement, chelation, linkage and geometric isomerism, and mirror tests are
  *computed*. Where an arbitrary placement choice is made, prove by exhaustion that it cannot
  change the answer.
- Electronic concepts (MO filling, d-electron counts) shown visually where they drive the
  answer.

**Physics.** Conventions will be established with the first real Physics simulation. The ID
subject code `PHY` and the folder `physics/` are already accepted by the tools; nothing else
is fixed yet.

## 8. Visual system

Tokens, typography, components, chart rules and animation CSS are in
`.claude/skills/prayogx-design-system/reference.md`. That file is distilled from the G4 pages,
which remain the source of truth. No new design-token framework is introduced.

## 9. Verification status

Two different fields exist today, and they must not be confused:

| Where | Field | Current value (all 32) | Meaning today |
|---|---|---|---|
| `meta.json` / manifest | `verification.status` | `verified` | the page's own verifier and suite passed and the answer matched the key |
| public feed (`content/index.json`, `content/sims/*.json`) | `status` | `human_verified` | a **default** filled in by `tools/build_content.py` (`DEFAULTS`) for every record that has no `status`. It is not a record of human review |

**Intended vocabulary (long term):**

| Status | Means |
|---|---|
| `ai_generated` | built by Claude; not yet independently verified |
| `script_verified` | independent verifier + page suite pass; answer matches the official key |
| `human_verified` | the owner (or a named reviewer) has reviewed the page and signed it off |

**Migration rule:** don't relabel existing simulations silently. Changing the feed default,
or setting a per-page `status`, is an owner decision (see DECISIONS.md). A changed default
alters the generated feed, but it does not change the simulations. Until then, **never
describe any page as human-verified** in reports, docs or UI unless the owner confirms a
review.

## 10. Validation expectations

A new simulation is done only when **the independent derivation, the official key, the page's
computed answer and the written solution all agree**, and:

- the verifier `tests/verify_<pNqNN>.py` ends `N passed, 0 failed`. It uses ≥ 2 independent
  routes, audits every option, and runs custom-condition controls;
- the page suite `tests/sim_<pNqNN>.js` ends `N / N passed`. It covers behaviour, reset and
  replay, custom runs, classroom mode, 390/360 px overflow, reduced motion, zero console
  errors, the feed entries, and the app shell opening it;
- `check_library.py` exits 0, `production_audit.py` passes all checks, and the CI drift gate is
  clean;
- every stage and the reveal have been screenshotted and **looked at** (desktop and 390 px).

Environment: `tests/.venv` (sympy, numpy, scipy, RDKit), Playwright 1.56.1 / Chromium build
1194 via `tests/_browser.js`, and `bash tests/runall.sh` (exit 0 all pass, 1 fail, 2 only
missing). Details are in `tests/README.md` and [TESTING_PORTABILITY.md](TESTING_PORTABILITY.md).
Report exact pass counts, and never claim a suite passed that wasn't run.
