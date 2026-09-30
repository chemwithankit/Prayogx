# ADV-2026-P1-PHY-Q12 — Magnetic field far along the axis of a spinning charged hollow cone

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 3 — four questions, numerical value |
| **Question** | Q.12 (MathonGo numbering: Q28) |
| **Type** | Numerical value (+4 / 0), rounded to two decimal places |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 20 |

---

## Question (verbatim)

Q.12 A hollow, right circular cone of base radius *R* and height *h*, with its tip at the origin is rotating about the *Z*-axis with an angular velocity *ω*, as shown in the figure. The cone carries a total charge *Q* uniformly distributed on its curved surface. The magnitude of magnetic field at a point (0,0, *z*), where *z* ≫ *R* and *z* ≫ *h*, is (*nμ*₀/4π)(*QR*²*ω*/*z*³). The value of *n* is:

The figure shows the cone opening upwards along *Z* from its tip at the origin, base radius *R* at height *h*, spinning about *Z* at *ω*. It is redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | Moving Charges and Magnetism |
| Topic | Magnetic moment of a spinning charged cone and its far field on the axis |
| Also | Magnetic dipole; Biot–Savart law |
| Difficulty | Moderate |
| Answer | **0.50** (n = 1/2; key 0.50) |

## Solution

1. **Rings.** At a fraction *u* of the way along the slant, the ring has radius *r* = *uR*. The curved area up to *u* grows as *u*², so the ring holds *dq* = 2*Qu du*.
2. **Each ring is a current loop.** Spinning at *ω*, *dI* = *dq ω*/2π, and its moment is *dm* = *dI* · π*r*² = *dq ω r*²/2 = *QωR*² *u*³ *du*.
3. **Add them.** *m* = *QωR*² ∫₀¹ *u*³ *du* = *QR*²*ω*/4. The height *h* drops out.
4. **Far on the axis the cone is a dipole.** *B* = (*μ*₀/4π) · 2*m*/*z*³ = (*μ*₀/4π) · *QR*²*ω*/(2*z*³), so ***n* = 0.5**.

## Verification log

| Check | Result |
|---|---|
| Independent derivation | m = QR²ω/4, n = 1/2 |
| sympy | ring moments and their integral; h drops out |
| Exact axial Biot–Savart field (scipy), no dipole approximation | B z³ → 0.5 (μ₀/4π)QR²ω as z grows, for several heights |
| Direct 3-D sum over moving surface charges | agrees at a far axial point |
| Numeric script | `tests/verify_p1phyq12.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq12.js` checks the moment ring by ring and the exact field against the dipole value, the visual gates and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q28 = Physics Q.12): 0.5 |
| Answer key | official key printed with the paper (page 20; the derivation above does not use it): Q.12 → 0.50 |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates, library and production audits) — 2026-09-30. No human review has been recorded.**
