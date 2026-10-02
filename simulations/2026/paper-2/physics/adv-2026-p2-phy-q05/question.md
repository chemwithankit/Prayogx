# ADV-2026-P2-PHY-Q05 — Two isosceles prisms linked by a mirror: minimum deviation and the angle between the apex bisectors

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 2 |
| **Subject** | Physics |
| **Section** | Section 2 — one or more correct options |
| **Question** | Q.5 (MathonGo numbering: Q23) |
| **Type** | Multiple correct options (+4 / +3 / +2 / +1 / 0 / −1) |
| **Source** | `papers/adv_2026_paper_2.pdf`, page 13 (with figure) |

---

## Question (verbatim)

Q.5 Consider two isosceles prisms 1 and 2 with prism angles *A*₁ and *A*₂ and refractive indices *n*₁ and *n*₂, respectively, as shown in the figure. The faces *a*₁*b*₁ and *a*₂*b*₂ are parallel to each other and perpendicular to the mirror *M*. If a ray of light is incident on the face *a*₁*c*₁ and emerges from the face *a*₂*c*₂, then the correct statement(s) is/are:

*(Figure: prism 1 with apex a₁, vertical face a₁b₁ and face a₁c₁; prism 2 with apex a₂, vertical face a₂b₂ and face a₂c₂; the mirror M below; the ray i₁ → e₁ → mirror → i₂ → e₂; dashed lines through a₁ and a₂, continuing inside each prism to its base at a right angle, meet above at θ.)*

(A) If both the prisms are at minimum deviation condition, then *n*₂/*n*₁ = sin(*A*₁/2) / sin(*A*₂/2).
(B) If prism 2 is at minimum deviation condition, then sin *i*₁ = *n*₂ sin(*A*₂/2) is always true.
(C) If both the prisms 1 and 2 are thin and are at minimum deviation condition with angles of deviation *δ*ₘ₁ and *δ*ₘ₂, respectively, then *θ* = *δ*ₘ₁/(2(*n*₁ − 1)) + *δ*ₘ₂/(2(*n*₂ − 1)).
(D) If prism 1 is at minimum deviation condition, then sin *i*₂ = *n*₁ sin(*A*₁/2) is always true.

## Classification

| | |
|---|---|
| Chapter | Ray Optics and Optical Instruments |
| Topic | Two isosceles prisms linked by a plane mirror - minimum deviation and the angle between the apex bisectors |
| Difficulty | Moderate-Hard |
| Answer | **(A), (C), (D)** |

## Solution

1. **Mirror link.** Both facing faces are perpendicular to *M*, so reflection carries the emergence angle into the incidence angle: *i*₂ = *e*₁.
2. **Minimum deviation.** Symmetric path: *r* = *A*/2, sin *i* = sin *e* = *n* sin(*A*/2).
3. **(D) true.** Prism 1 at minimum deviation: sin *i*₂ = sin *e*₁ = *n*₁ sin(*A*₁/2).
4. **(A) true.** Prism 2 also at minimum deviation: *n*₁ sin(*A*₁/2) = *n*₂ sin(*A*₂/2).
5. **(B) false.** It needs *i*₁ = *e*₁, i.e. prism 1 symmetric too — not always.
6. **(C) true.** The dashed lines meet the bases at right angles: they are the apex bisectors, so *θ* = (*A*₁ + *A*₂)/2; thin prisms: *A* = *δ*ₘ/(*n* − 1).

## Verification log

| Check | Result |
|---|---|
| Approach | MathonGo solution read first as the conceptual reference: (A), (D) |
| Independent solve | (A), (D) true, (B) false; θ first read as *A*₁ + *A*₂ |
| Disagreement | official key ACD ≠ first solve on (C): investigated — the 4× figure shows the dashed lines meet the bases at right angles (apex bisectors), so *θ* = (*A*₁ + *A*₂)/2 and (C) is true |
| sympy | minimum deviation at sin *i* = *n* sin(*A*/2), inside angle *A*/2 |
| Independent ray trace (300 random prism pairs) | (D) in all, (B) fails, (A) in all pairs where both can be symmetric |
| Thin-prism limit | formula = *θ* within 0.2 % at 5°, → 0 as *A* → 0; face angle = 2× formula |
| Numeric script | `tests/verify_p2phyq05.py` |
| The page | engine run in Node by the verifier (answer (A), (C), (D); its trace = the independent trace to 10⁻⁹°); `tests/sim_p2phyq05.js` checks the trace, the four tests, the presets, the target display (`tests/target_gate.js`), the visual gates A–K and the app shell |
| Solution website | MathonGo Paper 2 solutions (their Q23): (A), (D) — disagrees on (C), reading *θ* between the faces |
| Answer key | official final key, JEE Advanced 2026 Paper 2 (jeeadv.ac.in, published 2026-06-01; read last): Q.5 → ACD |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates A–K, library and production audits) — 2026-10-02. No human review has been recorded.**
