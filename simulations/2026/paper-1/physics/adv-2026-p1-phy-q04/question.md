# ADV-2026-P1-PHY-Q04 — A double convex lens in a liquid: its power against the liquid's refractive index

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 1 — four questions, only one option correct |
| **Question** | Q.4 (MathonGo numbering: Q20) |
| **Type** | Single correct option (+3 / 0 / −1); the official key accepts A or B |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 14 |

---

## Question (verbatim)

Q.4 A double convex lens made of glass of refractive index 1.5 and radii of curvature of the curved surfaces 20 cm each is immersed in a liquid of refractive index *n<sub>L</sub>*. The correct plot showing the variation of the power, in the units of diopter (*D*), as a function of *n<sub>L</sub>* is:

The four options are plots of power (D) against *n<sub>L</sub>* from 1.0 to 2.0:
- **(A)** A curve bending upwards, from 5 at 1.0 through 0 at 1.5 to about −2.5 at 2.0.
- **(B)** A straight line from 5 through 0 at 1.5 to −5.
- **(C)** Positive and rising to +∞ just below 1.5, then coming up from −∞ above it (axis ±40).
- **(D)** The mirror image of (C).

They are redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | Ray Optics and Optical Instruments |
| Topic | Power of a thin lens immersed in a liquid - lens-maker's formula in a medium, optical power n_L/f against 1/f |
| Also | Refraction at spherical surfaces · converging and diverging lenses |
| Difficulty | Easy-Moderate |
| Answer | **A or B** (official key) |

## Solution

1. **Surface powers.** Each spherical surface, n₁ → n₂, has power (n₂ − n₁)/R. With R₁ = +0.20 m and R₂ = −0.20 m, each surface contributes 5(1.5 − *n<sub>L</sub>*) D.
2. **Optical power.** Adding the two surfaces gives *n<sub>L</sub>*/*f* = 10(1.5 − *n<sub>L</sub>*) D. This is a straight line through 5, 0 and −5 D at *n<sub>L</sub>* = 1, 1.5 and 2, which is plot **(B)**.
3. **1/f, from the lens-maker's formula in the liquid.** 1/*f* = (1.5/*n<sub>L</sub>* − 1)(1/R₁ − 1/R₂) = 10(1.5/*n<sub>L</sub>* − 1) D. This is a hyperbola bending upwards, through 5, 0 and −2.5 D, which is plot **(A)**. MathonGo uses this definition and gives (A).
4. **At n<sub>L</sub> = 1.5** the lens and liquid have the same index, so nothing refracts. The focal length is infinite and the power is 0. Above 1.5 the lens diverges.
5. **(C) and (D)** blow up at 1.5. The focal length does that, not the power, so both are wrong under either definition. (D) also has the wrong sign in air.
6. **The official key accepts A or B**, because the two plots correspond to the two standard definitions of the power of a lens in a medium.

## Verification log

| Check | Result |
|---|---|
| Independent derivation (surface powers; lens-maker in a medium) | n_L/f → (B), 1/f → (A); C, D out |
| sympy | n_L/f = 15 − 10 n_L; 1/f = 15/n_L − 10; convex vs linear; plot matching gives exactly A and B |
| Exact Snell's-law ray trace through two spherical surfaces | f = 20 cm (air), 78.2 cm (water), −40 cm (2.0); same curves |
| ABCD matrices (reduced angles) | system power = n_L/f at every liquid |
| Every option | A, B accepted (two definitions); C, D diverge where the power is 0 |
| Numeric script | `tests/verify_p1phyq04.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq04.js` drives the page, the visual gates and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q20 = Physics Q.4): (A) with P = 1/f, which the official key includes |
| Answer key | official key printed with the paper (page 14; the derivation above does not use it): Q.4 → A or B |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates, library and production audits) — 2026-09-30. No human review has been recorded.**
