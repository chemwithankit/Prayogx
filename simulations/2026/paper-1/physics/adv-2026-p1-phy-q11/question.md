# ADV-2026-P1-PHY-Q11 — Heat through a partition: gas at constant volume and gas at constant pressure

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 3 — four questions, numerical value |
| **Question** | Q.11 (MathonGo numbering: Q27) |
| **Type** | Numerical value (+4 / 0), rounded to two decimal places |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 19 |

---

## Question (verbatim)

Q.11 As shown in the figure, an insulated container is fitted with a thermally conducting but immovable partition (*P*₁) and a freely movable but thermally insulated piston (*P*₂). The partition *P*₁ with thermal conductivity *K*, cross sectional area *A* and width *x* divides the container into two sections, *S*₁ and *S*₂, each containing one mole of a monoatomic gas. The piston *P*₂ moves freely such that the gas in *S*₂ is always at the atmospheric pressure. Initially, the difference between the temperatures of *S*₁ and *S*₂ is Δ*T*₀. The time it takes for the temperature difference to become Δ*T*₀/2 is *nxR*/*KA*, where *R* is the universal gas constant. The value of *n* is:
[ Given: ln 2 ≈ 0.7 ]

The figure shows the container with *S*₁ on the left, the hatched partition *P*₁ of width *x*, and *S*₂ closed on the right by the piston *P*₂. It is redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | Thermodynamics |
| Topic | Heat conduction between a gas at constant volume and a gas at constant pressure - exponential decay of the temperature gap |
| Also | Thermal properties of matter (conduction) |
| Difficulty | Moderate |
| Answer | **0.66** (n = (15/16) ln 2; key 0.63 to 0.70) |

## Solution

1. **Heat flow.** Heat crosses the partition at *H* = *KA*(*T*₁ − *T*₂)/*x*.
2. **Each gas.** *S*₁ has a fixed volume, so it loses heat at constant volume: *C<sub>V</sub>* = 3*R*/2. *S*₂ is held at atmospheric pressure, so it gains heat at constant pressure: *C<sub>P</sub>* = 5*R*/2.
3. **The gap.** dΔ*T*/d*t* = −(*KA*/*x*)(1/*C<sub>V</sub>* + 1/*C<sub>P</sub>*)Δ*T* = −(16/15)(*KA*/*xR*)Δ*T*, so the gap decays exponentially.
4. **Half-time.** *t* = (15/16) ln 2 · *xR*/*KA*. With the given ln 2 = 0.7 this is ***n* = 0.656 ≈ 0.66**. With the exact ln 2 it is 0.650, also inside the key's range.
5. **Why the piston matters.** If *P*₂ were locked, both gases would be at constant volume and *n* would be 0.525. With the free piston, part of *S*₂'s heat does work on it.

## Verification log

| Check | Result |
|---|---|
| Independent derivation | n = (15/16) ln 2 = 0.656 (ln 2 = 0.7) |
| sympy | rate 16/15; t½ = (15/16) ln 2 |
| First law with P dV (no C_P assumed) | t½ = 0.6498 xR/KA for 100 K and 50 K gaps; S₂'s heat splits 3:2 |
| Control (piston locked) | 0.525, outside the key |
| Numeric script | `tests/verify_p1phyq11.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq11.js` checks energy and the decay at every instant, the visual gates and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q27 = Physics Q.11): 0.66 |
| Answer key | official key printed with the paper (page 19; the derivation above does not use it): Q.11 → 0.63 to 0.70 |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates, library and production audits) — 2026-09-30. No human review has been recorded.**
