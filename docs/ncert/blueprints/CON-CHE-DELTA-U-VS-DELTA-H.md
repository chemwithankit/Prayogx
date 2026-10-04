# XP-09 blueprint: Two calorimeters, one reaction
## The first PrayogX End-to-End Production Pilot

Status: **BUILD-READY (blueprint locked for owner review)**. No page, assets, experience records, reel or media
exist yet. Nothing here is published.

| | |
|---|---|
| Planning label | XP-09 (docs/NCERT_CH05_INTERACTIVE_OPPORTUNITIES.md), the approved pilot |
| Delivering page | `CON-CHE-DELTA-U-VS-DELTA-H`, already `planned` on 5.2.2 and 5.3 in `data/ncert/chapters/NCERT-11-CHE-P1-CH05.json`; folder `simulations/concepts/chemistry/con-che-delta-u-vs-delta-h/` (`index.html`, `meta.json`, `concept.md`) |
| Experience type | `virtual-lab` (one page) |
| Source | NCERT Class 11 Chemistry Part I, Ch 5, Reprint 2026-27 (`kech105.pdf`, SHA-256 `e2b5d180…48ec5f8`); pp. 142–146 and 150–152 re-read 2026-10-04, Figs. 5.7 and 5.8 viewed as rendered pages |

---

## 0. What this pilot proves

XP-09 is not only a simulation. It is the first item to travel the whole chain:

```
NCERT source → concept → blueprint → interactive experience → (visual assets) → experience QA
→ reel story → capture from the real page → narration → music/audio → composition → automated media QA
→ human approval → publication-ready output
```

It validates the following, each with the test rows of §11:

| | Stage | Validated by |
|---|---|---|
| A | Source / content | §1 dataset, flags F1–F8; rows A, F |
| B | Concept + learning objectives | §2; row B |
| C | Interactive experience | §3; rows C, D, E, G, H |
| D | Visual asset integration | §4 decision; rows I, J, K |
| E | Experience QA | rows C–H, K |
| F | Social-media story design | §6; rows P, Q |
| G | Reel capture | §7; row L |
| H | Voice / narration | §8; row M |
| I | Music / audio | §8; row N |
| J | Final reel composition | rows O, P |
| K | Automated validation | every automated row |
| L | Human approval | §10; row T |
| M | Publication readiness | rows R, S; endpoint in §12 |

**The pilot ends at publication readiness, not publication.** "Ready" means the silent reel is APPROVED by
the owner, and `tools/publish.py publish … --dry-run` lists no failure except the deliberate draft-page
policy (§12, blocker 2). Nothing is posted unless the owner separately and explicitly asks.

---

## 1. Source and the numerical dataset

### 1.1 NCERT basis (pages read)

| Page | What it supports |
|---|---|
| 142 (5.2.1) | ΔU = q_V at constant volume |
| 143 (5.2.2a) | ΔH = q_p; ΔH < 0 exothermic, > 0 endothermic; pΔV = Δn_g RT (eq. 5.9); **ΔH = ΔU + Δn_g RT** (eq. 5.10); Δn_g = gaseous products − gaseous reactants; insignificant for solids/liquids |
| 144–145 (5.2.2c) | q = C ΔT (eq. 5.11) |
| 145 (5.3, 5.3a, Fig. 5.7) | calorimetry; constant V vs constant p; bomb calorimeter: steel bomb in a water bath, stirrer, thermometer, firing leads, oxygen inlet; sealed → ΔV = 0 → no work → q_V |
| 146 (5.3b, Fig. 5.8, Problem 5.6) | constant-pressure measurement gives ΔH, the heat of reaction; exothermic → q_p < 0; polystyrene-cup calorimeter for reaction mixtures; Problem 5.6 (graphite in a bomb) |
| 150 | H₂(g) + ½O₂(g) → H₂O(l), Δ_fH° = −285.8 kJ mol⁻¹ (also printed as −285.83 on pp. 151–152; the 0.03 difference is immaterial here) |
| 151 | C(graphite, s) + O₂(g) → CO₂(g), Δ_rH° = −393.5 kJ mol⁻¹ |
| 152 | C₄H₁₀(g) + 13/2 O₂(g) → 4CO₂(g) + 5H₂O(l), Δ_cH° = −2658.0 kJ mol⁻¹ |

The page shows a reference ("NCERT Class 11 Chemistry Part I, §5.3, pp. 145–146"), never NCERT's text.

### 1.2 The one dataset used (internally consistent)

**Conventions**
- **Sign:** IUPAC. q and w are positive into the system, so:
  - q_cal = −q_rxn;
  - ΔT = −q_rxn / C_cal;
  - w = −p_ex ΔV.
- **Constants:** T = **298 K** (NCERT's value); R = **8.314 J mol⁻¹ K⁻¹**; RT = **2.4776 kJ mol⁻¹**;
  p = **1 bar** (NCERT standard state).
- **Calorimeter:** C_cal = **20.7 kJ K⁻¹**, NCERT's bomb-calorimeter value, the same on both sides.
- **Precision:** temperatures to 0.001 K; energies to 0.01 kJ mol⁻¹, or 0.001 kJ for a sample.
- **Method:**
  - Δ_rU = Δ_rH° − Δn_g RT;
  - q_V = n Δ_rU and q_p = n Δ_rH;
  - ΔT_V = −q_V / C_cal and ΔT_p = −q_p / C_cal;
  - the piston side has ΔV = n Δn_g RT / p and w = −n Δn_g RT.

| Reaction (amount) | Δn_g | Δ_rH (kJ mol⁻¹) | Δ_rU (kJ mol⁻¹) | ΔH − ΔU | q_V (kJ) | q_p (kJ) | ΔT_V (K) | ΔT_p (K) | piston ΔV | w on the piston side |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C(graphite) + O₂ → CO₂ (1.000 g = 0.08333 mol, M = 12.0) | 1 − 1 = **0** | −393.5 | −393.50 | **0** | −32.792 | −32.792 | 1.584 | 1.584 | 0 | 0 |
| H₂ + ½O₂ → H₂O(l) (0.100 mol) | 0 − 1.5 = **−1.5** | −285.8 | −282.08 | **−3.72** | −28.208 | −28.580 | 1.363 | 1.381 | −3.72 L | +0.372 kJ |
| C₄H₁₀ + 13/2 O₂ → 4CO₂ + 5H₂O(l) (0.0100 mol) | 4 − 7.5 = **−3.5** | −2658.0 | −2649.33 | **−8.67** | −26.493 | −26.580 | 1.280 | 1.284 | −0.87 L | +0.087 kJ |

**The relationship.** In every row, ΔH − ΔU = Δn_g RT, so (ΔH − ΔU) / Δn_g = RT = 2.478 kJ mol⁻¹ wherever
Δn_g ≠ 0. This was checked by three routes: the equation, the work (−pΔV with the ideal-gas ΔV), and
inverting q = −C_cal ΔT.

**What-ifs** (labelled hypothetical; Δ_rU fixed at H₂'s −282.08 kJ mol⁻¹, 0.100 mol):

| Δn_g | −4 | −2 | −1.5 | 0 | +1 | +2 | +4 |
|---|---|---|---|---|---|---|---|
| ΔH − ΔU (kJ mol⁻¹) | −9.91 | −4.96 | −3.72 | 0 | +2.48 | +4.96 | +9.91 |

The amount what-if (×½, ×1, ×2) scales q, ΔT and ΔV; per-mole ΔU and ΔH are unchanged.

**Model scope.**
- Exothermic only; ΔT < 3 K; ideal gases.
- Products are referred back to 298 K; Δ_rU is taken at 298 K, ignoring the ~1.5 K rise.
- No heat loss; the whole calorimeter is one known C_cal.
- **Assumption:** the right-hand constant-pressure vessel is idealised (flag F5).

### 1.3 Source flags (NCERT is never silently corrected)

| # | Item | Decision |
|---|---|---|
| F1 | **Erratum (data inconsistency).** Problem 5.6 (p. 146) yields Δ_cU(graphite) = −2.48 × 10² kJ mol⁻¹ from illustrative readings (20.7 kJ K⁻¹ × 1 K × 12 g mol⁻¹). The same reaction's enthalpy is −393.5 kJ mol⁻¹ on pp. 151–152, and Δn_g = 0, so ΔU should equal it | the experience uses **−393.5**, so 1.000 g gives ΔT = 1.584 K. `#solution` shows Problem 5.6 as NCERT's *method*, with a visible note that its readings are illustrative and its result differs from the tabulated value. **Owner review at Gate 1** |
| F2 | Problem 5.6 writes ΔU = "−20.7 kJ K⁻¹" | shown in kJ, with a note |
| F3 | Problem 5.6 uses C_V for the *calorimeter's* heat capacity, the symbol of a gas's C_V (5.2.2d) | the page writes C_cal, with a note that NCERT calls it C_V there |
| F4 | p. 143: "at constant volume ΔH = ΔU = q_V" | never stated in general; the bomb gives ΔU, and ΔH follows from eq. 5.10 |
| F5 | Fig. 5.8's polystyrene cup is for reaction mixtures in solution; no fuel can be burnt in it | the constant-pressure side is an **idealised piston calorimeter**, labelled as such; Fig. 5.8 is acknowledged in the solution |
| F6 | 5.3 sums the liquid's and the calorimeter's heat capacities | lumped into one known C_cal (as Problem 5.6 does); stated |
| F7 | NCERT uses R = 8.3 (Problem 5.5) and 8.314 elsewhere; T = 298 K | 8.314 J mol⁻¹ K⁻¹ and 298 K throughout |
| F8 | Exercise 5.8: NH₂CN (s) in the text, (g) in the equation | not used |

---

## 2. Concepts, objectives and experience records

One page; under the experience contract (one concept per record), it carries three records. Each was
validated in memory with `tools/experience_schema.py`, with `libraryId: null` until the page exists. None
is written yet.

| Record | Concept | Objectives |
|---|---|---|
| `EXP-CHE-TWO-CALORIMETERS` (primary) | `CPT-CHE-CALORIMETRY` | `LO-CHE-CALORIMETRY-BOMB-DELTA-U`, `LO-CHE-CALORIMETRY-CONSTANT-PRESSURE-DELTA-H`, `LO-CHE-CALORIMETRY-CALCULATE` |
| `EXP-CHE-TWO-CALORIMETERS-DELTA-H-DELTA-U` | `CPT-CHE-DELTA-H-DELTA-U-RELATION` | `LO-CHE-DELTA-H-DELTA-U-DERIVE`, `LO-CHE-DELTA-H-DELTA-U-CALCULATE`, `LO-CHE-DELTA-H-DELTA-U-WHEN-SIGNIFICANT` |
| `EXP-CHE-TWO-CALORIMETERS-HEAT-SIGN` | `CPT-CHE-EXOTHERMIC-ENDOTHERMIC` | `LO-CHE-EXOTHERMIC-ENDOTHERMIC-SIGN` |

Status goes `blueprint → building → review → published`. `libraryId` becomes `CON-CHE-DELTA-U-VS-DELTA-H`
once the page is in the library.

**Touched, not claimed:**
- reaction enthalpy (q_p is "the heat of reaction", but its Σ-definition is §5.4);
- combustion enthalpy (§5.5a);
- heat capacity itself (XP-08).

| Objective | Where it is met |
|---|---|
| CALORIMETRY-BOMB-DELTA-U | stages 5 and 7: rigid lid, ΔV = 0, w = 0 → q_V = ΔU |
| CALORIMETRY-CONSTANT-PRESSURE-DELTA-H | stages 6–8: the piston moves; q_p = ΔH, compared side by side |
| CALORIMETRY-CALCULATE | stage 8: q = −C_cal ΔT → per mole |
| DELTA-H-DELTA-U-CALCULATE | stages 8–9: the measured gap vs Δn_g RT |
| DELTA-H-DELTA-U-WHEN-SIGNIFICANT | three reactions (Δn_g 0, −1.5, −3.5) + the Δn_g what-if |
| DELTA-H-DELTA-U-DERIVE | `#solution`: pΔV = Δn_g RT → eq. 5.10, from the piston the student watched |
| EXOTHERMIC-ENDOTHERMIC-SIGN | stage 4: the water warms → q_rxn < 0 → ΔH < 0 |

**Not taught here:**
- Hess's law and formation/combustion definitions (XP-11, XP-12);
- heat capacity itself (XP-08); C_p − C_v (XP-06);
- calibration, heat-loss corrections, temperature dependence of ΔH;
- endothermic calorimetry; bond enthalpies.

---

## 3. The experience

**Title:** *Two calorimeters, one reaction.* Subtitle: *Why a sealed bomb measures ΔU and an open
vessel measures ΔH.*

**Core learning question** (in `section#question`, PrayogX wording):

> The same fuel burns in two identical calorimeters, one sealed and one at constant pressure. Why can they
> report different heats for the same reaction, and when do they agree?

It must not contain the result formula: the reel's "no premature answer" check reads the question.

**Scenario.**
- Two identical calorimeters: NCERT Fig. 5.7, drawn twice, with the same water, stirrer, thermometer and
  C_cal.
- **Left:** the fuel is sealed in a steel bomb.
- **Right:** the vessel's lid is a free piston held at 1 bar (idealised; F5).
- The student ignites both, reads both thermometers, and finds that "almost the same" is exactly
  Δn_g RT.

**Initial state.**
- Reaction **H₂** (0.100 mol); both at 298.000 K.
- Gas shown as mole tokens (1 token = 0.05 mol).
- Key-result line `Target: ΔH − ΔU` (the symbol only; standards §4).
- ▶ Ignite primed.

**Controls.** Three meaningful interactions; nothing else.

| Control | Kind | What the student learns |
|---|---|---|
| Reaction `[C(graphite)] [H₂] [Butane]` | segmented | the gap follows Δn_g (0, −1.5, −3.5) |
| ▶ Ignite (= START) | button | cause → process → effect on both sides at once |
| Prediction `[Bomb hotter] [Same] [Piston side hotter]` | optional toggle; never blocks | commit, then confront |

- **Standard controls:** Pause · Replay · Reset · Classroom.
- **What-ifs**, shown only after the first reveal: amount `[×½][×1][×2]` and a **hypothetical Δn_g**
  slider (−4…+4, step 0.5, labelled "what-if").

**Visual model** (all native Canvas 2-D, pseudo-3-D; layout v3):
- **Arrangement:** side by side on desktop; stacked on phones, bomb on top (portrait recomposition).
- **Apparatus:** Fig. 5.7 in each, with jacket, water, a turning stirrer, firing leads and a tall
  thermometer whose reading is drawn **on** it to 0.001 K.
- **Lids:** the left lid is bolted ("sealed: constant volume"); the right is a piston with a 1 bar arrow
  ("piston at 1 bar: constant pressure").
- **Gas mole tokens** before and after; tokens become droplets when liquid water forms, so Δn_g is
  counted, not stated.
- **Arrows:** heat arrows from vessel to water labelled from the system's view (q < 0); on the right, a
  work arrow labelled "w = −pΔV > 0 (the atmosphere does work on the system)".
- **Reveal:** per-mole bars ΔU vs ΔH with a gap bracket, and a magnified inset **labelled "gap shown ×20"**
  (the gap is 1–3 % of a bar).
- **Readouts:** ≤ 4, all measurements: ΔT_V, ΔT_p, q_V, q_p. No dashboard; no `#analysis` graph.

**Variables.**

| Kind | Variables |
|---|---|
| User-controlled | reaction; prediction; what-ifs (amount, hypothetical Δn_g) |
| Fixed constants | C_cal, T, p, R, Δ_rH° values, amounts, M(C) = 12.0 g mol⁻¹ (§1.2) |
| Calculated by the model | Δn_g from the balanced equation, Δ_rU, q_V, q_p, ΔT_V, ΔT_p, ΔV, w |
| Observed | the two thermometers and their ΔT; piston displacement; tokens before and after |
| Derived by the student, checked by the page | q = −C_cal ΔT; per-mole ΔU and ΔH; the gap; Δn_g RT |

No answer literal appears in the page source; everything is computed by `run(D)`.

**Real-time feedback.**
- **Choosing a reaction:** the tokens re-form, Δn_g updates, a faint ghost shows the piston's expected
  direction, and the target line resets.
- **Ignite:** flash → heat arrows → thermometers climb → piston moves → plateau.
- **Prediction:** marked only after the plateau.

**Cause → effect.**

```
Student ignites the same reaction in a sealed bomb and under a free piston
  ↓
Gas moles change by Δn_g. Sealed: the volume cannot change → w = 0.
                          Piston: the volume changes → w = −pΔV = −n Δn_g RT crosses the boundary
  ↓
ΔT_V = −nΔU / C_cal and ΔT_p = −nΔH / C_cal: they differ unless Δn_g = 0
  ↓
q_V = ΔU and q_p = ΔH, and ΔH − ΔU = Δn_g RT: the heat difference IS the expansion work
```

**Discovery sequence (10 stages, one scene each, virtual clock):**
1. **Observe:** two identical calorimeters; the only difference is the lid. *Notice first: the lid.*
2. **Predict** (optional): which thermometer rises more?
3. **Ignite:** the leads spark; the fuel burns in O₂ on both sides.
4. **Observe the heat change:** the water warms. Shown: the system loses heat, q < 0, exothermic.
5. **Compare calorimeters (sealed):** the lid cannot move → ΔV = 0 → w = 0 → all of ΔU appears as heat.
6. **Identify work (piston):** tokens drop (Δn_g < 0), the piston sinks, the atmosphere does work on the
   system → q_p = ΔU − w.
7. **Read:** ΔT_V and ΔT_p plateau and are read to 0.001 K.
8. **Calculate:** q = −C_cal ΔT → divide by n → ΔU and ΔH per mole.
9. **Compare the difference:** the measured ΔH − ΔU vs Δn_g RT from the equation → ✓ match.
10. **Reveal:** `ΔH − ΔU = Δn_g RT = −3.72 kJ mol⁻¹` in the target line (one pulse). Switching to
    graphite collapses the bracket (Δn_g = 0); butane widens it.

**Aha.** *"Both calorimeters see the same reaction; the only difference is whether expansion work can
cross the boundary. The bomb can't, so it measures ΔU. The open one can, so it measures ΔH. The gap is
exactly that work, Δn_g RT, so it vanishes when the moles of gas don't change."* A second beat: the gap
divided by Δn_g is RT, every time.

**Misconceptions corrected** (all grounded in NCERT's own statements):

| Misconception | Correction |
|---|---|
| ΔH and ΔU are always equal | gaps for H₂ and butane; equality only for graphite |
| A bomb calorimeter measures ΔH | the lid never moves → ΔU. Problem 5.6 reads ΔH from a bomb only because Δn_g = 0, said explicitly |
| Δn_g counts every species | tokens only for gases |
| The water warmed, so q_rxn > 0 | arrow direction + sign label (p. 146) |
| The gap is measurement error | it equals Δn_g RT, computed independently, every run |
| J vs kJ in RT | shown explicitly |

**Final reveal** (not decorative):
- the bars rise from the *measured* ΔT;
- the bracket snaps to Δn_g RT computed from the token count, with a ✓ when they agree;
- the target line shows the value.

For graphite the bars meet: "Δn_g = 0, so ΔH = ΔU, which is why NCERT's Problem 5.6 can read ΔH from a
bomb."

**What-ifs** (2):
1. **Amount:** ΔT and q scale; per-mole values don't. This is why we divide by moles.
2. **Hypothetical Δn_g:** the piston reverses for Δn_g > 0, the gap changes sign, and it is zero at 0.

**Apply.** The Apply area already lists **ADV-2026-P1-PHY-Q11** (two-chamber heat lab: constant V vs
constant p) on 5.2.2. Exercises 5.4 and 5.8 are NCERT's practice of this idea (5.8 is not used; F8). No
JEE page, record or mapping changes.

**Rejected for simplicity:**
- inputs for fuel mass, C_cal, water volume, T, p or O₂ pressure;
- a reaction builder; a heat-loss toggle;
- a T–t graph section; a third (polystyrene-cup) calorimeter; a combustion-chemistry view;
- a photoreal or AI-generated background;
- any dropdown.

Each adds a control without serving the pivot.

**Technical.**
- One self-contained `index.html`, ES5, no fetch, storage or external resources.
- Layout v3 contract: `section#question`, `section#lab` (`canvas#labcv` + `#controls`), `section#solution`,
  `section#howto`; key-result line `#target`.
- `window.PX`:
  - `start()` = Ignite; `RUN.done` set after the reveal;
  - `state()` = {phase, stage, reaction, dng, dTv, dTp, qV, qP, dU, dH, gap, dV};
  - `stage()`, `minLabelPx()`.
- Virtual clock only: every motion is a function of clock time, and nothing uses `Math.random`. The
  stirrer and flame flicker come from a fixed seed.
- Reduced motion and classroom mode. No overflow at 390/360 px.
- `#solution` contains:
  - the derivation, tied to the piston;
  - per-reaction calculations;
  - Problem 5.6 by NCERT's method, with the F1 note;
  - ≥ 5 independent checks;
  - the concept explanation and 3–6 takeaways.

---

## 4. Generated visuals (Higgsfield): decision

Higgsfield is treated as a production tool. It is neither mandatory nor forbidden. Each candidate was
judged on whether it teaches **better** than a native drawing:

| Candidate | Verdict | Why |
|---|---|---|
| Molecular combustion clip (H₂ + O₂ → H₂O) | **no** | the pivot is Δn_g, which the native tokens show *counted and synced* to the selected reaction; a fixed clip cannot follow the reaction choice or the what-if, and the combustion mechanism is not taught here |
| Microscopic gas pushing the piston (pressure–volume work) | **no** | a native particle view is deterministic, follows ΔV exactly, and can respond to Δn_g; a generated clip cannot, and cannot be stepped by the recorder's clock |
| Photoreal bomb calorimeter / lab scene | **no** | decoration; a generated "photo" of an instrument could misrepresent real apparatus |
| Cinematic intro shot for the reel | **no** | the reel must teach from the real experience; a cinematic opener only advertises |

**Decision: no generated visual is educationally justified for XP-09.** All quantitative and interactive
visuals stay native, which the visual-asset rules also require. **Higgsfield is still exercised by this
pilot, as the narration voice** (profile `prayogx-en-emily-v1`, §8).

**Visual-asset stage of the pilot (D, I, J, K):**
- XP-09 verifies the **decision path**: the page declares **no** `px-visual-asset`, `tools/check_library.py`
  passes the visual check, and the page runs with the network blocked.
- The seam's own mechanics stay proven by its existing suites (`tests/test_visual_assets.py`,
  `tests/visual_asset_capture.js`), re-run as part of the pilot.
- **The first real asset** goes to a later experience that genuinely needs one, after a visual licence
  review; candidates are marked in the opportunity analysis.
- **If the owner wants XP-09 itself to carry an asset**, it must clear §4's bar first. No asset is
  created to tick a box.

## 5. Visual-asset test plan

The general plan below applies to any experience. For XP-09, the expected outcome is "none declared".

| Step | Check | XP-09 expected result |
|---|---|---|
| registry | `visual_assets.library_problems()` == [] | ✓ (registry valid, 0 assets) |
| declaration | `visual_assets.declared(page)` | `[]` |
| metadata, SHA-256, embedded bytes | `page_problems(page, lib)` == [] | ✓ (vacuous: nothing declared) |
| network-blocked run | the page loads and completes a run with every non-`file:`/`data:` request aborted; 0 requests | ✓ |
| reel capture of an asset | `visual_asset_capture.js` (fixture) | ✓ (seam regression) |

If a future revision adds an asset, rows 2–5 become content checks for that asset: listed, licence
verified, SHA-256 matches, drawn on `canvas#labcv`, visible in a recorded frame.

## 6. Social-media reel: story design

- **Audience:** Class 11 students and JEE/NEET aspirants who know ΔU and ΔH as symbols but mix them up.
- **Promise:** learn one real thing in under a minute, even without opening the site.
- **Format:** a narrated concept-explanation reel, plus the silent standard cut built from the same story.
- **Duration:** target **35–50 s**, set by the story (`durationLimits` declared in the story, not forced).
  The silent cut is likely 30–40 s.

The beats map onto the existing composer's fixed order (hook > context > question > problem > curiosity >
simulation moments > answer > payoff), which `validate.js` checks:

| Beat | On-screen text (PrayogX wording) | Visual (recorded from the page) | Narration (draft; spoken form reviewed at Gate 4) |
|---|---|---|---|
| hook | "Same reaction. Two calorimeters. Two different answers?" | the two calorimeters, lids highlighted | "Same reaction, two calorimeters, and they don't agree." |
| context | "NCERT Class 11 · Chemistry · §5.3 Calorimetry" | (context card) | — |
| question | the page's learning question | (question card) | — |
| problem | "0.1 mol H₂ burns in a sealed bomb and under a free piston at 1 bar." | stage 1 | "Burn the same hydrogen in a sealed steel bomb, and under a free piston." |
| curiosity | "Which thermometer rises more?" | stage 2 | "Which one gets hotter?" |
| moment A | "Ignite" | stage 3–4 (flash, heat arrows, both thermometers climb) | — (sound effect only) |
| moment B | "The sealed lid can't move: no work" | stage 5 | "The bomb can't expand, so no work is done. All the energy shows up as heat." |
| moment C (aha) | "The piston sinks: the atmosphere does work" | stage 6 | "On the right, gas disappears, the piston sinks, and the atmosphere pushes in extra energy." |
| moment D | "1.363 K vs 1.381 K" | stage 7–8 (readings, per-mole bars) | — |
| answer | headline **"ΔH − ΔU = Δn_g RT"**, ring "−3.72 kJ/mol" | stage 9–10 (bracket ✓) | "That gap is exactly delta n g R T. The bomb measures delta U; the open vessel measures delta H." |
| payoff | "Δn_g = 0 → ΔH = ΔU. Explore it on PrayogX" | graphite: bars meet | "No change in gas moles, no gap. Try it on PrayogX." |

- **Narration length:** about 95–110 words at 130–175 wpm, so about 35–45 s of speech, with the answer
  reveal and the aha kept clear of overlapping speech.
- **The formula appears only in the answer beat.** The page shows it only in stage 10, so the recorded
  moments are taken from stages 1–9. This satisfies "no premature answer".
- **Caption:** hook + one-sentence explanation + "NCERT Class 11 Chemistry §5.3" + CTA + the standard
  AI-voice disclosure line (narrated version only). No spoiler. Hashtags are concept-based (#Chemistry,
  #Thermodynamics, #NCERT, #PrayogX), not JEE-paper tags.

## 7. Capture compatibility (existing recorder, unchanged)

- **Contract the recorder needs:** `canvas#labcv`, `section#question`, `window.PX.start()`, `PX.RUN.done`,
  the key-result line `#target`. All are part of §3.
- **Determinism:**
  - every motion is a pure function of the virtual clock (`requestAnimationFrame`, `performance.now`,
    `Date.now` are replaced by the recorder);
  - the stirrer, flame and token motion are seeded and clock-driven;
  - the thermometer follows a closed-form first-order rise;
  - **nothing animates from `setTimeout`/`setInterval` or real time.**
- **Capture states** (`PX.stage()` names): `setup, predict, ignite, heat, sealed, piston, read, calculate,
  compare, reveal`. `PX.state()` exposes the numbers so story moments can select by state.
- **Interaction sequence for the recorder:**
  - spec actions: select `[H₂]` → `PX.start()`;
  - `done` = `PX.RUN.done`, after `reveal`;
  - the payoff footage is a second, short action run with `[C(graphite)]`, or a still of the graphite
    reveal taken via the spec's `stills`.
- **Viewport:** the recorder's phone viewport (420 × 860 @ 2.6). The **stacked portrait layout** is the
  reel layout, with both thermometers, both lids and the piston inside `canvas#labcv` at all times;
  readings stay ≥ 11 px CSS, so they are legible in 1080 × 1920.
- **Must stay visible in every captured frame:** both thermometer readings, both lids, the token areas,
  and the heat/work arrows during stages 4–6.
- **Generated visuals:** none (§4), so no special handling.

## 8. Audio and voice (existing infrastructure only)

| Item | Value |
|---|---|
| Music | `prayogx-score-v2` (`tools/reel-maker/music.py`; licensed in `audio_library.json`) |
| Effects | `prayogx-sfx-v1` (ignition cue on moment A, a reveal cue on the answer) |
| Voice | `voice-higgsfield-elevenlabs-v4` through profile `prayogx-en-emily-v1` (Higgsfield CLI, `elevenlabs_v4`; status **provisional**, licence `tools/reel-maker/licences/higgsfield-elevenlabs-voice.md`) |
| Story files | silent: `tools/reel-maker/reels/CON-CHE-DELTA-U-VS-DELTA-H.json`; narrated variant: `reels/CON-CHE-DELTA-U-VS-DELTA-H.narrated.json` with `narration.segments` (text, spoken, reviewedBy, reviewedAt) |
| Generation | `voice.py prepare` → `estimate` → `generate --cap <owner-set credits> --confirm CON-CHE-DELTA-U-VS-DELTA-H`: the only paid step, owner-run or owner-authorised, never part of a build |
| Verification | `voice_verify.py` (whisper.cpp word-for-word against the reviewed spoken form) → `voice.json` VERIFIED |
| Mix and master | `audio.py`: VOICE > MUSIC > SFX (music ducked 10 dB under voice, effects 6 dB); −14 LUFS integrated, −1 dBTP limiter |

**Spoken forms** (examples; reviewed at Gate 4):
- "ΔH − ΔU = Δn_g RT" → "delta H minus delta U equals delta n g R T";
- "kJ mol⁻¹" → "kilojoules per mole";
- "H₂" → "hydrogen".

No notation reaches the voice.

## 9. Final media QA: acceptance criteria

| Area | Pass condition |
|---|---|
| Content | every statement traceable to §1.1; the numbers equal §1.2; no statement that the bomb measures ΔH, or that ΔH = ΔU in general; F1–F8 honoured |
| Visual | no clipping (all text in the Instagram-safe area); no black or empty frame; footage present in every experiment beat; labels legible on a phone; PrayogX branding beat present; no generated visual (none used) |
| Audio | narration in every narrated beat and audible in the mix (variant); true peak ≤ −0.3 dBTP (check) after the −1 dBTP limiter; −14 ± 1.5 LUFS; no dead air > 1 s; music ≥ 6 LU under the voice; aha and reveal ≥ 3 dB above the bed |
| Video | 1080 × 1920, H.264, 30 fps, AAC stereo 48 kHz; moov first, no edit lists; ≤ 300 MB, ≤ 25 Mbps; duration within the story's declared limits; decoded frames match the composition at every beat |
| Social | Instagram Reels container rules (above); YouTube Shorts: vertical, ≤ 60 s, same file; caption with no spoiler; disclosure line on the narrated version |
| Provenance | `reel.json` names the source page and its revision, the repo commit, the story, and the audio assets with licences; `voice.json` names the profile, the asset and its hashes; the page names its concept and experience records (§2); the ledger stays untouched until a real publish |

## 10. Human approval gates (automation never equals approval)

| Gate | Who | Approves | Evidence reviewed | Recorded where |
|---|---|---|---|---|
| 1 Source / science | owner | §1 dataset, the F1 decision, the objective mapping | this blueprint; verifier output | the owner's sign-off on this file |
| 2 Experience | owner | the built page: behaviour, look, correctness | stage screenshots at 1280 and 390 px; the suites; visual gates A–K | commit authorised by the owner; experience records → `review` |
| 3 Visual asset | owner | "no generated asset" (or a specific asset and licence, if ever added) | §4; `visual_library.json` | this file / the registry entry |
| 4 Reel story + narration | owner | story beats, on-screen text, spoken forms (`reviewedBy`), credit cap | `reels/…json` and `.narrated.json`; `--preview` frames | the story's `narration.reviewedBy/At`; the cap is given in chat |
| 5 Final media | owner | the watched reel(s) | `reel.mp4`, thumbnail, caption, validation reports | `instagram_publish.py approve <ID> --reviewer …` (bound to the files' SHA-256) |
| 6 Publication | owner | destination, privacy, timing | the `publish --dry-run` checklist | only an explicit owner request runs `publish`; not part of this pilot (§12) |

## 11. E2E test matrix

Legend: **A** = automated, **M** = manual (owner or reviewer looks). "new" = a suite written during
implementation.

| # | What is tested | Why it matters | A/M | Pass | Fail | Evidence |
|---|---|---|---|---|---|---|
| A | blueprint validity: every LO/concept/EXP id exists or is valid; §1.2 numbers re-derived | the build starts from correct content | A + M | ids resolve; recomputed table equals §1.2 to stated precision | any unknown id or number mismatch | script output; Gate 1 |
| B | contracts: the 3 experience records against `experience_schema.problems` (inventory + library); concept inventory unchanged | traceability and no contract drift | A | `problems == []` (libraryId null before the page, set after) | any problem | contract output |
| C | experience build: one file, ES5, unique ids, PX hooks, layout v3 contract, `check_library`, `production_audit`, drift | the page meets the invariants | A | all green | any failure | tool output |
| D | browser rendering: every stage renders without console errors at 1280 and 390 px | the student sees a working lab | A + M | 0 errors; screenshots of all 10 stages looked at (gates B, G, H) | an error, or a stage looks wrong | screenshots; gate report |
| E | interaction: each control changes state and the visible scene; prediction never blocks; reset/replay/restore; what-ifs only after the reveal | the controls teach | A | page suite (new `tests/sim_con_che_delta_u_vs_delta_h.js`) passes | any assertion fails | suite count |
| F | scientific numbers: verifier (new `tests/verify_con_che_delta_u_vs_delta_h.py`), 3 routes (eq. 5.10, −pΔV, C_cal ΔT inverse) for every preset and what-if; `PX.state()` equals the verifier | correctness outranks visuals | A | all routes agree (< 0.01 kJ mol⁻¹, < 0.001 K); signs correct; no answer literal in the source | any disagreement | verifier report |
| G | responsive: 1280, 768, 390, 360 px; portrait recomposition; no horizontal overflow; `PX.minLabelPx()` ≥ 11 px on a phone | phones are the main device | A + M | visual gates A C D E F I J K pass | overflow, small labels, a gate fails | `visual_gates.js` output; screenshots |
| H | accessibility: controls ≥ 44 px, keyboard operable, `aria-pressed` on segments, live region announces readings and the reveal, colour never the only cue, reduced motion | usable by everyone | A + M | page-suite checks pass; manual keyboard pass | any failure | suite + note |
| I | visual-asset registry: `library_problems() == []` | no unlisted or unlicensed visual | A | [] | any problem | `check_library` |
| J | visual-asset hash/provenance on the page: declared assets embedded byte-exactly | provenance survives packaging | A | XP-09 declares none → `page_problems == []`; seam suite passes | any problem | `test_visual_assets.py` |
| K | network-blocked run: the page loads, runs to `RUN.done` with all non-`file:`/`data:` requests aborted; 0 requested | self-contained, offline | A | 0 requests, run completes, 0 errors | any request or error | page-suite log |
| L | reel capture: `generate-reel.js <ID> --draft` records read-only (byte-identical folder); recording twice gives identical frame hashes; frames show both thermometers and the piston | the reel is the real experience, deterministic | A + M | recorder succeeds, identical hashes, frames looked at | recorder error, a hash differs, an element missing | footage + `footage.json`; `--preview` frames |
| M | narration: `narration.py check` valid; `voice.py prepare/estimate` (no spend); after a Gate 4 cap, `generate` → VERIFIED `voice.json`; 12 voice checks | correct, verified speech | A (+ owner cap) | VERIFIED; 12/12 voice checks | unverified segment, a check fails | `voice.json`, `attempts.json`, check report |
| N | audio: licensed assets only; −14 ± 1.5 LUFS; true peak ≤ −0.3 dBTP; no dead air; ducking; arc and cues | social-ready sound | A | the audio checks inside the 30 pass | any failure | `reel.json` audio report |
| O | video encoding: 1080 × 1920, H.264 30 fps, AAC 48 kHz, container rules, duration within the declared limits | platforms accept it | A | the container/encoding checks pass | any failure | validation report |
| P | final reel visual: the decoded video matches the composition; no black frames; beats in order; text in the safe area; branding; thumbnail | looks right | A + M | all 30 reel checks pass (30/30, narrated also 12/12 voice); owner watches | any check fails / owner rejects | report; Gate 5 |
| Q | final reel science: every on-screen number equals §1.2; the answer only at the answer beat; no false statement (bomb ≠ ΔH; ΔH ≠ ΔU in general) | the reel must not mislead | A + M | the "no premature answer" check passes; numbers match the verifier; owner review | a mismatch or a misleading line | report + review note |
| R | social compatibility: Instagram dry-run preflight; YouTube metadata + dry-run | ready to post on request | A | dry-run lists no failure except the deliberate draft-page check (§12) | any other failure | dry-run checklists |
| S | provenance/traceability: concept → EXP records → page (`libraryId`) → `reel.json` (source page, revision, commit, story) → audio/voice asset ids → caption disclosure | every output traces back | A | all links present and consistent | a missing or inconsistent link | a small traceability check in the page suite / report |
| T | human approval: Gates 1–6 recorded; no `approve` or `publish` run by automation | automation is not approval | M (+ A guard) | Gate records exist; `reel.json` status history shows the owner's `approve` | any automated approval/publish | status history; this file |

## 12. Blockers and gaps

| # | Gap | Class | Smallest fix | When |
|---|---|---|---|---|
| 1 | **The reel tooling is question-shaped.** `composer.js` and `generate-reel.js` read `entry.exam/year/paperNumber/questionNumber/answer/questionType` and build JEE caption and hashtags. A concept entry has none of these (`entry.exam.toUpperCase()` would throw), and `validate.js` takes the answer from the manifest | **BLOCKER for G–P → MINIMAL PILOT FIX** | for `kind: "concept"` entries: context and chip from the concept's source (NCERT book, §), the answer headline and ring from the story, caption and hashtags from the story; **JEE reels unchanged** (regression: an existing JEE story recomposes identically and still passes 30/30) | at the reel stage, as a separate owner-approved reel-tooling change; never a page change |
| 2 | **Concept pages can only be drafts** (`CONCEPT_PUBLISHABLE = False`), and the Instagram preflight refuses a draft page | **BLOCKER for real publication only** (not for readiness) | the pilot ends at APPROVED + dry-run (§0); turning concept publishing on is the owner's Phase 5 decision (the NCERT page must open concepts) | owner decision, after the pilot |
| 3 | **Narrated variants cannot be published** (the publishers read only `output/<ID>`) | **FUTURE GAP** | the pilot validates the narrated variant to READY_FOR_REVIEW and treats the silent reel as the publishable artifact; enabling variant publishing is a later owner decision | after the pilot |
| 4 | **No real experience document exists** for Chapter 5 (records validated only in memory) | **MINIMAL PILOT FIX** | write the three records to a chapter experience document beside the inventory, validated by the existing contract (as `concept_contract.py` does for inventories) | at implementation, when the page exists |
| 5 | Explorer Watch link (G5), concept-level watch (G2) | FUTURE GAP | none for the pilot | later |
| 6 | Voice profile is **provisional** | not a gap | qualified for exactly this configuration; generation stays owner-capped | — |

**None of these blocks building the experience.** Blocker 1 must be fixed before the reel stage; blocker 2
only before a real post.

## 13. XP-09 E2E pass checklist

- [x] Source data verified (§1, flags F1–F8)
- [x] Blueprint BUILD-READY
- [ ] Experience built
- [ ] Experience scientifically correct (row F)
- [ ] Automated tests pass (rows A–C, E, F, I–K)
- [ ] Desktop works (row D)
- [ ] Mobile works (row G)
- [ ] Accessibility baseline passes (row H)
- [x] Approved visual asset integrated OR documented that none is educationally justified (§4: none justified)
- [ ] Visual asset provenance/licence verified if used (n/a while none is used; rows I–J still run)
- [ ] Network-independent experience verified (row K)
- [ ] Reel story created (silent + narrated)
- [ ] Reel captured from the real experience (row L)
- [ ] Voice/narration generated and validated (row M)
- [ ] Music/audio mixed and validated (row N)
- [ ] Final reel technical QA passes (rows O, P)
- [ ] Final reel scientific QA passes (row Q)
- [ ] Final reel social compatibility passes (row R)
- [ ] Provenance/traceability passes (row S)
- [ ] Human final approval completed (Gates 1–5, row T)
- [ ] No publishing without explicit approval (Gate 6)
