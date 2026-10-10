# CON-CHE-REVERSIBLE-WORK: one gas, many paths (XP-05), blueprint

Status: **approved by the owner (2026-10-10) with D1, D2, the scope (#12, #13, #15) and the ID D7; built the same day as a
draft (not committed).** Implementation notes that differ from the text below: grain by grain is quasi-static (each grain
one exact step to its new equilibrium, 160 grains per second), so the run gives 32.149 L atm; pouring is a toggle (pour /
stop) rather than a hold; a prediction is required but may be wrong (the result answers it).

### Kit friction log (evidence for the architecture review)

- `cam@1` in 2D again: the page needs no camera move, but the shared contract requires the default film to move the
  camera, so the three shots are identical (second 2D use: evidence for `cam@2`, or for making that contract opt-in).
- One-frame lag: `frame()` ran the Director before recomputing observables, so a Director wait on an observable lagged
  the reveal by a frame (target gate 3). Fixed by computing observables before and after `D.update()`; the same order is
  in the toy and Hess, so this is a candidate convention or `dir@2` note.
- The lesson film again repeats the script scene by scene with hints (second use: evidence for `act@2` hints).
- `tests/kit/contracts.js` treated the position:fixed sticky button as invisible (`offsetParent` is null), so the
  sticky branch of the 390 px check could never pass; fixed to count a fixed element by its box.

| | |
|---|---|
| **Chapter** | NCERT Class 11 Chemistry Part I, Ch 5 Thermodynamics, §5.2.1 Work (printed pp. 140–142) |
| **Owner's choice** | 2026-10-10: "complete thermodynamics chapter first", whole chapter, all formats; first item **#13 reversible vs irreversible**. |
| **Planned as** | XP-05 "p–V work explorer" (`docs/NCERT_CH05_INTERACTIVE_OPPORTUNITIES.md`). |
| **Concepts covered** | #13 reversible and irreversible processes (primary, **E**); #12 pressure–volume work (**E**, the same cylinder and plot); #15 free expansion (**D**, inside stage 6). #14 reversible isothermal work (**H**) gets only its *result* here; the derivation and the practice stay a separate explainer and practice tool. |
| **Objectives** | `LO-CHE-REVERSIBLE-PROCESS-DESCRIBE`, `LO-CHE-REVERSIBLE-IRREVERSIBLE-COMPARE`, `LO-CHE-PV-WORK-AREA`, `LO-CHE-PV-WORK-CALCULATE`, `LO-CHE-REVERSIBLE-IRREVERSIBLE-WORK-COMPARE` |
| **Apply link** | ADV-2026-P1-CHE-Q01 (two-step isothermal compression, minimum work), by ID only, never edited. |
| **Proposed ID** | `CON-CHE-REVERSIBLE-WORK` (decision D7). |
| **Role in the architecture** | the kit's **first time-stepped production** (`ENGINE.step` + fixed substeps), the first live graph read from observables, and the first learner manipulation *during* a running process. |

## 1. Scientific objective

By the end, the weakest student can say, and show on the plot:

> **Work is the area under the outside-pressure path, so the same gas going between the same two states can do
> different amounts of work. The slower the change (the closer the outside pressure stays to the gas pressure), the
> more work the gas does on expansion and the less it needs on compression. The limit is the reversible process: at
> every moment a tiny change could send it back, and a reversible round trip leaves nothing behind.**

Three things, in this order:
1. **Work is an area.** w = −p_ex ΔV; on the p–V plot, |w| is the shaded area under the p_ex path (Fig. 5.5).
2. **The path decides the area.** Same start, same end, 1 step vs 2 vs 8 vs "grain by grain": the expansion work
   grows toward a maximum; the reversible process is that limit.
3. **Why "reversible".** Expand and then compress back in N steps: the surroundings are left 64/N L·atm worse off.
   Only the reversible path returns everything (net 0). That is the meaning of "could be reversed by an
   infinitesimal change".

**Out of scope:** the derivation of w_rev = −2.303 nRT log(V_f/V_i) (concept #14, an explainer + practice);
adiabatic processes; real gases; the optimal (geometric) choice of intermediate pressures (that is the JEE question's
idea, linked as Apply).

## 2. Source and scientific facts

Source: `kech105.pdf`, Reprint 2026-27, SHA-256 `e2b5d180…48ec5f8` (matches `data/ncert/catalog.json`). It was read
on 2026-10-10 from the scratch copy with the vendored PDF.js and is never stored in the repository. Printed page *p*
is PDF page *p* − 135.

| Fact | As printed | Page |
|---|---|---|
| Set-up: a cylinder of ideal gas with a **frictionless piston**; compression by a constant p_ex in a single step until the inside pressure equals p_ex | — | 140–141 |
| w = −p_ex ΔV = −p_ex (V_f − V_i) | eq. 5.2 | 141 |
| Sign: compression → (V_f − V_i) < 0 → w > 0, "work is done on the system" | — | 141 |
| Finite steps: the work is summed, w = −Σ p ΔV (Fig. 5.5 b) | — | 141 |
| Infinite steps: p_ex = p_in ± dp, w = −∫ p_ex dV (eq. 5.3, Fig. 5.5 c) | — | 141 |
| Reversible: "could, at any moment, be reversed by an infinitesimal change"; "proceeds infinitely slowly by a series of equilibrium states"; "system and the surroundings are always in near equilibrium" | — | 141 |
| "Processes other than reversible processes are known as irreversible processes" | — | 142 |
| Reversible, isothermal, ideal gas: w_rev = −nRT ln(V_f/V_i) = −2.303 nRT log(V_f/V_i) | eq. 5.5 | 142 |
| Free expansion (p_ex = 0): no work, reversible or not | — | 142 |
| Isothermal ideal gas into vacuum: w = 0, q = 0 (Joule), ΔU = 0 | — | 142 |
| Isothermal irreversible: q = −w = p_ex (V_f − V_i); isothermal reversible: q = −w = 2.303 nRT log(V_f/V_i) | — | 142 |
| **Problem 5.2:** 2 L of ideal gas at 10 atm expands isothermally at 25 °C into a vacuum to 10 L: q = −w = 0 | — | 142 |
| **Problem 5.3:** the same expansion against a constant 1 atm: q = −w = 8 L·atm | — | 142 |
| **Problem 5.4:** "the expansion given in problem 5.2, **for 1 mol** … conducted reversibly": 2.303 × 1 × 0.08206 × 298 × log 5 = **39.366 L·atm** | — | 142–143 |

### Independent solution (done before reading any answer key; reproduced by the verifier)

For the gas **as Problem 5.2 states it** (2 L, 10 atm, 298 K): nRT = p_iV_i = **20 L·atm**, so
**n = 20 / (0.08206 × 298) = 0.818 mol**, and p_f = 20/10 = **2 atm**.

| Path (2 L → 10 L, isothermal) | Work done **by** the gas (L·atm) | w (on the gas) |
|---|---|---|
| Into vacuum (p_ex = 0) | 0 | 0 |
| Against 1 atm, piston held by a stop at 10 L (Problem 5.3) | 8 | −8 |
| 1 step: p_ex = 2 atm | 16.000 | −16.000 |
| 2 equal steps: p_ex = 6, then 2 atm | 21.333 | −21.333 |
| 4 equal steps: 8, 6, 4, 2 atm | 25.667 | −25.667 |
| 8 equal steps: 9, 8, … 2 atm | 28.579 | −28.579 |
| Reversible: 20 ln 5 | **32.189** | **−32.189** |

Compression back (10 L → 2 L) in N equal steps needs 80.000, 53.333, 41.667, 36.579 L·atm (N = 1, 2, 4, 8) and
32.189 reversibly. **The round trip leaves (p_i − p_f)(V_f − V_i)/N = 64/N L·atm in the surroundings, exactly**
(N = 1: 64; 2: 32; 4: 16; 8: 8; checked numerically to N = 800). The reversible round trip leaves 0.

### Discrepancy found (stop and decide; flag F1)

**Problem 5.4 is inconsistent with Problem 5.2.** The gas of 5.2 (2 L at 10 atm, 298 K) is 0.818 mol, not 1 mol.
1 mol at 298 K in 2 L would be at 12.2 atm. NCERT's 39.366 L·atm is right *for 1 mol*; for the gas of 5.2 the
reversible work is 32.19 L·atm. (The planning study already listed this erratum.) Also, 2.303 × log is NCERT's
rounding of ln: the exact 1-mol value is 39.357, so the two forms differ only in the third decimal.

**Assumptions and design decisions (for the owner):**
- **D1. Dataset: the gas of Problem 5.2** (2 L, 10 atm, 25 °C → 10 L), with n *computed* (0.818 mol). Every number
  on screen is then whole or simple (16, 21.3, 25.7, 28.6, 32.2; round-trip losses 64, 32, 16, 8), and Problems 5.2
  and 5.3 appear exactly as printed. Stage 6 shows the 5.4 note: "NCERT's 39.4 L·atm assumes 1 mol; this gas is
  0.818 mol, so it does 32.2 L·atm." *Alternative:* 1 mol at 298 K (p_i = 12.2 atm), which reproduces 39.4 but
  contradicts 5.2's "10 atm" and gives untidy numbers. **Recommended: D1 as written.**
- **D2. Unit: L·atm only,** as NCERT's problems use, with one note "1 L·atm = 101.3 J". A weak student should see
  one unit.
- **D3. Equal weights.** Each step removes (or adds) equal weights, so p_ex falls in equal steps of (10 − 2)/N atm.
  8 identical weights of 1 atm each make 1, 2, 4 and 8 steps natural (8, 4+4, 2+2+2+2, 1 each).
- **D4. Isothermal by a water bath** (labelled "kept at 25 °C by the bath": idealized). ΔU = 0 on every path, so
  q = −w; the bath's heat arrow is bound to q.
- **D5. Illustrative piston motion.** NCERT's piston is frictionless; a frictionless piston released in one step
  would oscillate for ever. The page gives it a small damping so that it settles (time and damping labelled "motion
  not to scale"). **The work is unaffected:** with p_ex constant during a step, w = −p_ex ΔV no matter how the
  piston overshoots, which the verifier proves by integrating the motion (§9).
- **D6. "Grain by grain" is the reversible approximation:** sand poured off one grain at a time (the classic
  picture), 800 grains. The page shows the run's own integrated work (32.15) *and* the calculated reversible limit
  (32.19, status `idealized`), so the student sees the approach, never a fake equality.
- **D7. The ID** `CON-CHE-REVERSIBLE-WORK` (the experience covers #12, #13 and #15; the name says what it teaches).

## 3. Representation decision: 2.5-D apparatus + a 2-D p–V plot, one canvas

- **The concept is an area on a graph that a moving piston draws.** The plot is not decoration: it *is* the
  answer. Every move of the piston draws its p_ex path and shades the area live.
- **A 2.5-D cylinder** (front view, glass wall, piston, weight stack, a sand heap, the water bath): the student
  needs to *see* the weights come off and the piston rise. Depth teaches nothing more, so **no WebGL** (architecture
  §1.2). Two side-by-side regions on desktop (apparatus left, plot right); stacked on phones (apparatus above,
  plot below), both inside `#labcv`.
- **No 3-D, no fallback renderer**, so no divergent presentations.

## 4. Learner journey (weakest student; the learner acts, the page responds)

Prediction gates (★) cannot be passed by NEXT: the guide points to the choices but never makes one. A wrong
prediction is never blocked; the result answers it ("You predicted *less*; the area says *more*").

1. **Meet the gas.** The cylinder: 2 L of gas at 10 atm, held down by 8 weights (each "1 atm"). The plot shows the
   start point and the gas's isotherm (faint, labelled "pV = 20 L·atm at 25 °C"). The learner taps the gas, a
   weight and the bath: what each is.
2. **One big step.** The learner lifts **all 8 weights at once** (drag the stack off, or the button). p_ex drops to
   2 atm; the piston shoots up, overshoots, settles at 10 L. The plot draws the p_ex path (a horizontal line at
   2 atm from 2 to 10 L) and fills the area: **work by the gas = 16 L·atm**. The bath arrow shows q = 16 L·atm in.
   Guide: "work is the area under the outside pressure".
3. **★ Predict, then take the weights off one by one.** Reset to 2 L. "If you lift the weights off **one at a
   time**, will the gas do *more*, *less* or *the same* work?" Then the learner lifts each of the 8 weights (8
   real actions; NEXT may suggest "lift the next weight" only *after* the prediction). The staircase path and its
   area grow: **28.6 L·atm**. The 1-step area stays as a ghost for comparison. Optional: 2 and 4 steps from a
   segmented choice (2, 4).
4. **Grain by grain.** The learner **holds** "Pour off sand" (a hold action; a slider on keyboards). p_ex follows
   the gas pressure down the isotherm, always a hair below it. The area approaches **32.2 L·atm** (the run shows
   its own 32.15; the limit line "reversible: 32.2" appears). Guide: "at every moment one grain put back would push
   the gas back in: this is a **reversible** process".
5. **★ Predict, then go back.** "To push the gas back to 2 L, which costs the **least** work: all weights at once,
   one at a time, or grain by grain?" The learner compresses with the path of their choice (and may try the
   others). The plot shows the compression area *above* the expansion area; the difference is shaded red: **left
   in the surroundings: 64 L·atm (1 step), 8 (8 steps), ≈ 0 (grain by grain)**. The aha: an irreversible round
   trip cannot be undone for free; a reversible one can.
6. **Same start, same end, three ways** (NCERT Problems 5.2–5.4). Three quick runs on the same cylinder: into a
   vacuum (w = 0; free expansion), against 1 atm with a stop at 10 L (w = −8 L·atm), reversibly (−32.2). A table
   builds from the observables: ΔU = 0 for all three, q and w differ: **q and w depend on the path; ΔU does not**
   (the link back to state functions and Hess). The F1 note on Problem 5.4 appears here.
7. **Takeaway.** The three statements of §1, with Fig. 5.5's three pictures redrawn from the learner's own runs.

**NEXT-only check:** a `doNext`-only drive stops at stage 3's prediction and again at stage 5's. Expected
interactions: ≥ 2 predictions, ≥ 10 manipulations (weights, hold), 1 choice of compression path.

## 5. Scientific model (`ENGINE-BEGIN/END`, time-stepped)

Constants (exported): `R = 0.08206` L·atm mol⁻¹ K⁻¹, `T = 298`, `PI = 10` atm, `VI = 2` L, `VF = 10` L,
`NRT = PI·VI` (20 L·atm), `N_WEIGHTS = 8`, `W_ATM = (PI − PF)/8` (1 atm each), `GRAINS = 800`, `LATM_J = 101.325`.
Problem data: `P53_PEX = 1` atm with `STOP = 10` L; `P54_NCERT = 39.366` (printed, flagged).

**Model state `ms`** (integrated): `V` (L), `u` (dV/dt), `pex` (atm), `wBy` (∫p_ex dV, L·atm), `run`
{path, dir, steps}, `stops` {lo, hi}, `history` handled by OBS, not here.

**`ENGINE.step(ms, dt)`**, fixed substep 1 ms (`CLOCK.create({substep: 0.001})`):
```
p_gas = NRT / V                                  isothermal ideal gas (the bath, D4)
a     = K · (p_gas − pex) − C · u                 illustrative piston dynamics (D5; K, C chosen to settle in ≈ 1 s)
u    += a·dt;  V += u·dt                          semi-implicit Euler
clamp V to [stops.lo, stops.hi], u = 0 at a stop
wBy  += pex · ΔV                                  exact for piecewise-constant pex
```
**`ENGINE.derive(ms)`** returns p_gas, w = −wBy, q = wBy, ΔU = 0, settled (|u| and |p_gas − pex| small, or at a
stop).

**Closed forms (exported for the verifier and the comparison table):** `stepWork(N, dir)` (Σ p_k ΔV_k with equal
weights), `revWork(dir)` = ∓NRT ln(VF/VI), `cycleLoss(N)` = (PI − PF)(VF − VI)/N, `p53()`, `p52()`.

**Validity domain:** V ∈ [2, 10] L by the stops; pex ∈ [0, 10] atm; p_gas never non-finite (V ≥ 2). pex = 0 is a
valid free expansion (the piston stops at the 10 L stop; w = 0).

## 6. Observables (`obs@1`; the only numbers the page may print)

| id | Unit | Status | Meaning |
|---|---|---|---|
| `gas.V` | L | calculated | gas volume now |
| `gas.p` | atm | calculated | gas pressure now (NRT/V) |
| `ext.p` | atm | calculated | outside pressure now (weights / sand) |
| `run.wBy` | L·atm | calculated | work done **by** the gas so far in this run (the shaded area) |
| `run.w` | L·atm | calculated, signed | w on the gas (NCERT sign: + on compression) |
| `run.q` | L·atm | calculated, signed | heat into the gas from the bath (= −w, isothermal) |
| `run.dU` | L·atm | idealized | 0 (isothermal ideal gas) |
| `run.steps` | — | ui | steps taken in this run |
| `ref.w1`, `ref.w8` | L·atm | calculated | the 1-step and 8-step expansion work (ghost areas) |
| `rev.wBy` | L·atm | idealized | the reversible limit, NRT ln 5 = 32.2 |
| `cycle.loss` | L·atm | calculated | compression work − expansion work for the learner's round trip |
| `p52.w`, `p53.w`, `p54.w` | L·atm | calculated | the three NCERT paths for this gas |
| `p54.ncert` | L·atm | measured (as printed, flagged) | 39.366, shown only with the F1 note |
| `gas.n` | mol | calculated | 0.818 |

Display: 1 decimal for work (16.0, 28.6, 32.2), 1 decimal for p and V. Fact keys (for the fact sheet and media) are
listed in the fact sheet, one per observable shown in a reel.

## 7. Actions (`act@1`)

| id | args | `when` | run |
|---|---|---|---|
| `advance` | — | scene exit holds | built-in |
| `inspect` | `gas` \| `weight` \| `bath` | scene = meet | flag `seen_*` |
| `liftAll` | — | expansion ready, all 8 weights on | pex → 2 atm in one step |
| `lift` | — | a weight remains, run is stepwise | pex −= 1 atm; logged with t |
| `pour` | `true` \| `false` (hold start / stop) | grain run, sand remains | while held, pex follows p_gas − dp, one grain per substep schedule (deterministic) |
| `predict` | `more` \| `less` \| `same` (stage 3); `one` \| `each` \| `grain` (stage 5) | its scene | records the choice; the verdict comes later from observables |
| `compress` | `one` \| `each` \| `grain` | a prediction is recorded | the chosen compression path (adds weights or sand) |
| `path` | `vacuum` \| `p53` \| `rev` | scene = three ways | runs that NCERT path |
| `resetRun` | — | not busy | back to 2 L, 8 weights, keeps ghosts |

Every button, drag, hold and key goes through `ACT.do`; the hold is two logged actions so replay is exact.

## 8. Script, films, camera

- **Scenes:** `meet`, `oneStep`, `eachWeight`, `grain`, `back`, `threeWays`, `takeaway`. Exits on observables
  (`gas.V ≥ 9.99` and `settled`, `run.steps ≥ 8`, `run.wBy ≥ 32.1`, a recorded prediction, etc.).
- **Films:** `default` (to the key result: the grain-by-grain area 32.2, the target line "w_rev (2 L → 10 L)"
  revealed then), `full` (to the takeaway, for media), `lesson` (learner/classroom; a friction-log candidate for
  act@2 hints, see the architecture review §9).
- **Key-result line:** shows only "w_rev (2 L → 10 L)" until the learner's grain-by-grain run completes; then
  −32.2 L·atm with one pulse.
- **Camera (`cam@1`, 2-D role):** shots `apparatus`, `plot`, `both`, with `tall` variants for phones (stacked).
  Friction-log item: the 2-D form.

## 9. Verification (`tests/verify_con_che_reversible_work.py`, before any page)

Independent routes:
1. **Closed form:** Σ p_k ΔV_k for N = 1, 2, 4, 8; NRT ln 5; the cycle loss 64/N (also proved algebraically).
2. **Integration of the page's ENGINE in Node** (the same `ENGINE-BEGIN/END` text) at substeps 1 ms and 0.25 ms and
   at 30/60 fps frame splits: ∫p_ex dV equals route 1 within 1e-6 L·atm (D5's claim), and the final state is the
   same at every frame rate.
3. **Simpson integration of the isotherm** for the reversible limit; the 800-grain run within 0.05 L·atm of it.
4. **NCERT:** 5.2 → 0; 5.3 → 8; 5.4 → 39.36 for 1 mol (reproduced) and 32.19 for 0.818 mol (F1 documented).
5. **Sign audit:** every compression w > 0, every expansion w < 0, q = −w, ΔU = 0.
6. **Domain sweep:** pex from 0 to 10, every N from 1 to 8: finite, inside the stops, settles.

## 10. Page tests and gates (`tests/sim_con_che_reversible_work.js`)

Kit contracts (incl. the opt-in ones proposed in the architecture review: NEXT-only stall, frame-rate
independence, no eased science in `PX.state`, status qualifiers visible, binding sign check for the bath and piston
arrows); every stage screenshot at desktop, 390 and 360 px; classroom; reduced motion (motion becomes stepping, the
areas still build); two recordings identical; visual gates A–K.

## 11. Budgets

2-D canvas, DPR ≤ 2; static-scene mode when nothing moves; ≤ 1 emphasised animation at a time; sand drawn as one
heap shape plus ≤ 40 falling grains on phones (the 800-grain count lives in the model, not in sprites); the plot's
history ≤ 2 000 points per run (decimated by volume).

## 12. Media hooks (after approval only)

Marks: `oneStepArea`, `eachWeightArea`, `reversibleLimit`, `roundTripLoss`, `threeWays`. Reel candidates (one
concept each, decided at storyboarding): "Why does squeezing a gas slowly cost less work?" (stage 5) and "Work is
an area" (stages 2–4).

## 13. Questions for the owner

1. **F1 / D1:** use the gas exactly as Problem 5.2 states it (0.818 mol, reversible 32.2 L·atm, with the 5.4 note)?
2. **D2:** L·atm only?
3. **Scope:** #12, #13 and #15 in this one experience, with #14's derivation left to its own explainer and
   practice tool?
4. **D7:** the ID `CON-CHE-REVERSIBLE-WORK`?
5. Approve this blueprint so the verifier (§9) can be written first, then the page.
