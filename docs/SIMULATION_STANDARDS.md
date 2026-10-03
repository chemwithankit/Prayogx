# PrayogX simulation standards

The standard every **new** PrayogX simulation is built to, and the facts about the 46 that
already exist (33 Chemistry, 13 Physics). Decisions and their dates are in [DECISIONS.md](DECISIONS.md). The workflows
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

**Choosing the representation (from 2026-10-02, new pages).** Every important concept gets the
strongest visual and interactive representation for it, chosen in this order: interactive
simulation → experimental / graph explorer → real-world simulation → animation → a static visual
only when interaction or animation would add nothing. If it can be seen, let the student see it; if
it can be manipulated, let them manipulate it; if it can be discovered, let them discover it. No
interaction for novelty: each one must teach. Concept pages for the NCERT Explorer follow the same
standard ([NCERT.md](NCERT.md) §2).

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
- **The MathonGo solution is a conceptual reference** (from 2026-10-01). Read it to understand
  the intended JEE problem-solving approach, not to copy its answer: the answer is still derived
  independently (the verifier's ≥ 2 routes) and the official key is read last. The simulation is
  an original PrayogX interpretation, never a reproduction of the solution. The workflow:
  MathonGo solution → understand the intended reasoning → independently verify → cross-check with
  authoritative sources → identify the underlying scientific phenomenon → design a creative
  interactive experiment → let the student discover the result.
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
  (`scrollWidth − clientWidth == 0`). Tap targets ≥ 44 px on new pages (layout v3; G4 pages were
  built to ≥ 32 px). New pages use no dropdown for primary controls (§4).
- Zero console errors.
- A classroom / projector mode with enlarged narration.
- A complete detailed solution, a concept explanation and key takeaways (see §5).

## 3. The existing simulations: page generations

They were built over time to different rules. **They are preserved as they are.** They are
not retrofitted to a newer standard unless the owner asks for a specific page.

| Gen | Pages | Page shape | Answer at load | Solution | Prediction stage | `window.PX` |
|---|---|---|---|---|---|---|
| G1 | P2 Q01–Q04 | seven sections | visible | open | no | no |
| G2 | P2 Q05–Q17, P1 Q02 | seven sections + prediction | locked until the run ends | gated | yes | P2 no · P1 Q02 yes |
| G3 | P1 Q01, Q03–Q11 | compact lab (question · experiment · [explorer] · solution · how to use) | locked | gated | no | yes |
| G4 | P1 CHE Q12–Q16, P1 PHY Q01–Q02 | layout v2 | visible above the experiment | always open | no | yes |
| G5 | **every new page from 2026-09-30** | **layout v3 — the master visual standard (§4)** | a compact key-result line by the experiment: the answer from load on pages built before 2026-10-01 (P1 PHY Q03–Q13); from 2026-10-01 the target's name or symbol only, the value revealed when the experiment determines it (§4, *Target variable*) | always open | optional | yes |

Consequences:

- A "fix" to one old page must keep that page's generation. Don't mix in G4 behaviour
  unasked.
- Paper 2 pages have no `window.PX`. Their tests (none exist yet) cannot reuse the Paper 1
  suite pattern without adding hooks, and adding hooks is a page change (revision bump).
- P1 Q16 is layout v2 plus the first elements of the immersive direction (§6): a pseudo-3-D reach
  scan with depth sorting, a draggable 3-D explorer, and explicit Concept explanation and Key takeaways
  sections. Its chemistry engine sits between `/*ENGINE-BEGIN*/` and `/*ENGINE-END*/`, so the verifier
  can run the page's own engine in Node. That is a pattern worth reusing.
- `templates/simulation-template.html` is the **G1-era** shell (seven sections). It remains
  useful for the design tokens and the brand mark, but **it is not the layout for new pages.**
  New pages are built to layout v3 (§4). Take tokens, helpers, the engine pattern, the reveal and
  the test hooks from a recent G4 page (P1 PHY Q02 is the latest), but not its layout: the rail,
  gauge grid, badges, reasoning log, evidence table and select menus stay G4-only.

## 4. Current layout: layout v3 (G5) — the master visual standard

For every new page (and every future concept page) from 2026-09-30. The G1–G4 pages are not
redesigned to it unless the owner asks for a specific page.

**Philosophy.** A premium, immersive scientific experiment that is understood at a glance. The
goal is not to fill the page with information: the experiment is the hero, and its scientific
objects are big, clear and visually dominant. In priority order: scientific clarity; large,
readable scientific objects; realistic apparatus; meaningful animation; intuitive controls; a
clean hierarchy; visual depth; classroom readability; mobile usability; performance. Beauty
must serve understanding, and scientific correctness still outranks everything (§1).

```
header      brand bar · sim ID · H1 (small)
#question   01 THE QUESTION — verbatim, near the top, options as clear tiles (never collapsed)
#lab        02 THE EXPERIMENT — the hero
              compact key-result line (the TARGET: its name or symbol, the computed value
              revealed when the experiment determines it) + one stage caption
              .stage > canvas#labcv — full content width; desktop ≥ 55 % of the screen height,
                                      phone full width and ≥ 45 % of the height (portrait scene)
              measurements drawn IN the scene, on the instruments (thermometer, meter, gauge)
            #controls — directly below (or above) the canvas, ≤ 48 px away:
              ▶ START · Pause · Replay · Reset · Classroom, and the experiment's own controls as
              toggles, segmented buttons, number inputs with units, or sliders — no dropdowns
#solution   03 DETAILED SOLUTION — step by step, tied to what the student saw; concept
              explanation and key takeaways inside it
#analysis   04 ONE OR TWO GRAPHS — only if they help understand or solve (optional)
#explorer   optional, only when a separate tool teaches something the experiment cannot
#howto      HOW TO USE — five short points: what first, which controls, what to watch, what it
              shows, how to reset/replay
footer
```

**Information hierarchy.** Highest: the question, the experiment, the primary controls, the key
result. Secondary: the detailed solution, an important graph. Tertiary: how to use, supporting
explanation. **Internal only** (kept for the tests, never shown): logs, event histories, state
dumps, debug counters. So a new page has **no** status-chip bar, side rail, gauge grid, badges,
reasoning log, evidence table, unknown tiles, option-audit cards or classification table. The
option audit belongs in the solution's option table and, if useful, as one stage of the
experiment. At most 4 compact readouts may sit by the experiment, and only real measurements
("Temperature: 327 K"), never implementation state.

**Scale and legibility.** Ask: can a student several feet away understand the main apparatus or
molecule? If not: scale up, raise contrast, simplify the surroundings. Molecules large enough to
see atoms, bonds, bond changes, intermediates and electron movement; apparatus large enough to see
components, reagent movement, measurements and state changes; graphs readable without zooming.
Canvas text is never below 13 px on a desktop screen or 11 px on a phone screen (the page reports
its smallest canvas font through `PX.minLabelPx()`). Prefer less information in large, clear
objects over more information in small ones.

**Controls.** Every control answers "what does this change in the experiment?", sits next to the
experiment, is ≥ 44 px tall, and the affected object visibly responds (CONTROL → EXPERIMENT →
EFFECT). Use toggles `[ON][OFF]`, segmented buttons `[A][B][C]` for a few exclusive states,
number inputs with units and validated bounds (`Temperature [300] K`), or sliders where continuous
exploration teaches something. **No `<select>` for primary controls.** Remove controls that do not
improve learning.

**Responsive.** Recompose, don't shrink: on phones the scene is re-laid out for portrait (the
canvas changes its own resolution and arrangement), controls stack under it, labels stay readable
and nothing scrolls sideways. Classroom mode widens the experiment to the screen and enlarges the
narration (≥ 22 px) and labels.

**Per-simulation decision.** Before coding, the design brief records: the main visual object, the
main experimental action, the primary controls, the essential measurements, whether a graph is
needed, whether molecules or diagrams are needed, what is removed, and what the student must notice
first. The default structure changes only when the science benefits.

**Gates.** Every new page passes the visual QA gates A–K (`python3 tools/auto_sim.py gates`):
A C D E F I J K are measured by `node tests/visual_gates.js <page>`; B (object legibility), G
(realism) and H (scientific correctness) by looking at the screenshots and by the verifier. The
page contract the checker reads: `section#question`, `section#lab` holding `canvas#labcv` and
`#controls`, `section#solution`, optional `section#analysis` / `section#explorer`,
`section#howto`, and `window.PX.minLabelPx()`. Gate K (the target reveal, below) applies to
pages created on or after 2026-10-01 and to any page not yet registered; older pages report N/A.

**Target variable / result display** (from 2026-10-01). The primary quantity the experiment is
designed to determine has one dedicated target area in the experiment: the key-result line.

- Before and during the run it shows only the target's name or symbol (`Target: v`). Never
  "UNKNOWN", "?", "—", a placeholder value or any other empty-state text.
- When the experiment successfully determines the quantity, the actual value appears in the same
  place (`Target: v = √(5gR/7)`). It comes from the page's scientific model (`ANS`, computed),
  never a literal.
- The reveal gets one short pulse / glow, then the value stays permanently visible. The animation
  draws the eye without covering or distracting from the experiment. Under reduced motion the
  value appears without it.
- For a matching or multiple-choice question the target is the quantity the experiment measures
  (or the option, e.g. `Match: P→3, Q→4, R→5, S→2 → (D)`), revealed the same way.
- The answer is not shown above the experiment before the run. It remains in the detailed
  solution, which stays always open.
- Reset and a custom run return the line to the symbol only. A custom run reveals its own computed
  value, labelled as the custom result. RESTORE and a question run reveal the question's value.

The page contract gate K and the page suites read (`tests/target_gate.js`):

```html
<p class="keyres" id="target" data-kind="value">     <!-- value | option | match; inside section#lab -->
  <span class="lbl">Target:</span>                    <!-- optional static label -->
  <span class="sym">v</span>                          <!-- the name or symbol, never empty -->
  <span class="val" id="ansval"></span>               <!-- empty in the markup; the run writes the value -->
</p>
```

`window.PX` exposes `answer()` (the computed answer), `start()`, `reset()`, `speed(k)` and
`RUN.done`. The reveal adds the class `pulse` to `#target` once (a CSS animation of ≤ 2 s) and
removes it; under `prefers-reduced-motion` the value appears with no animation. An `option`
target shows each answer letter as `(X)`; a `match` target also shows its pairs (`P→3, Q→4 …`).

The visual language is VARIABLE → EXPERIMENT → DISCOVERY → CALCULATED VALUE → RESULT. Pages built
before 2026-10-01 keep the answer visible from load; they are not retrofitted unless the owner asks
for a specific page.

**Kept from layout v2:** the run confirms the answer (it blinks once and stops); one START runs
the whole investigation through a virtual clock (pause, speed, reduced motion); prediction optional and non-blocking; the `window.PX` hooks; custom values with honest
warnings and a restore control; classroom mode.

### 4.1 Layout v2 (G4) — the pages built to it

P1 CHE Q12–Q16 and P1 PHY Q01–Q02 use it and keep it (§3). It is no longer the layout for new
pages. For reference:

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
sensible, realistic proportions and subtle environmental cues. Apparatus should feel physically
present and substantial. Choose only relevant apparatus: every visible component has a purpose,
and there is no generic lab decoration. A polished 2-D or pseudo-3-D scene is preferred to heavy
3-D when it serves learning and performance better.

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

**Physics** (P1 PHY Q01–Q02 so far, built to the interim gates of AUTO_SIMULATION_PIPELINE.md §5).
Show the diagram the question implies, the governing equations with values and units, and the
derivation; the experiment's measurements are the physical quantities (time, current, field,
angle), drawn on the apparatus. A dedicated physics doctrine skill is still an open decision.

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

**Registry values** (`tools/registry_schema.py` → `STATUS_VALUES`; absent = `human_verified`):

| Status | Means |
|---|---|
| `human_verified` | the owner (or a named reviewer) has reviewed the page and signed it off |
| `script_verified` | passed the automated pipeline with **no human review**: independent scientific verifier, browser / UI / mobile suite, library checks and production audit, and after deploy the live smoke test. Every page the simulation factory publishes carries it explicitly. Never shown or described as human-verified |
| `draft` | built, not published (below) |
| `deprecated` | kept for old links, not promoted |

`ai_generated` (built by Claude, not yet independently verified) is vocabulary only, not a
registry value: such a page is a `draft`. There is no `ai_verified`. A `script_verified` page
becomes `human_verified` only when the owner reviews it; removing the field (or setting
`human_verified`) is then a metadata change recorded like any other.

**New pages before review:** a new simulation that has passed its scripts but not the owner's review is
registered with `"status": "draft"`. The build keeps it off every public surface (the feed, crawlable
pages, the sitemap, the revision lock); `production_audit.py` checks that. Removing the field publishes it.
The simulation file itself is still deployed at its path, because `simulations/` is published, but nothing
links to it.

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
- every stage and the reveal have been screenshotted and **looked at** (desktop and 390 px);
- new (layout v3) pages pass the visual QA gates A–K (§4): `node tests/visual_gates.js <page>` for
  A C D E F I J K, screenshots and the verifier for B G H; the page suite reports each target check
  (`tests/target_gate.js`) on its own line.

Environment: `tests/.venv` (sympy, numpy, scipy, RDKit), Playwright 1.56.1 / Chromium build
1194 via `tests/_browser.js`, and `bash tests/runall.sh` (exit 0 all pass, 1 fail, 2 only
missing). Details are in `tests/README.md` and [TESTING_PORTABILITY.md](TESTING_PORTABILITY.md).
Report exact pass counts, and never claim a suite passed that wasn't run.
