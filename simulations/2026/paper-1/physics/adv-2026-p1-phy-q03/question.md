# ADV-2026-P1-PHY-Q03 — A solid cylinder rolls off a vertical edge: its speed when it loses contact

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 1 — four questions, only one option correct |
| **Question** | Q.3 (MathonGo numbering: Q19) |
| **Type** | Single correct option (+3 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 13 |

---

## Question (verbatim)

Q.3 A solid cylinder of radius *R* rolls without slipping with a center of mass speed *v*₀ = √(*gR*/3) on a horizontal surface with a vertical edge, as shown in the figure. Here, *g* is the acceleration due to the gravity. At the moment when the cylinder loses contact with the surface due to rotation around the corner, the speed of its center of mass is:

(A) 0 &nbsp; (B) √(5*gR*/7) &nbsp; (C) √(*gR*/15) &nbsp; (D) √(3*gR*/7)

The figure shows the cylinder on the top of a hatched block, moving right with speed *v*₀ towards the block's vertical edge. It is redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | System of Particles and Rotational Motion |
| Topic | Rolling off a vertical edge - rotation about the corner, energy with the parallel-axis inertia, and loss of contact when N = 0 |
| Also | Circular motion (the radial equation) · energy conservation · rolling without slipping |
| Difficulty | Moderate |
| Answer | **(B)** |

## Solution

1. **At the edge.** In rolling without slipping, the contact point is at rest. When it reaches the corner, the corner becomes the pivot with no impulse, and ω = *v*₀/*R* carries on. Angular momentum about the corner is (3/2)*mRv*₀ both before and after.
2. **About the corner.** *I* = ½*mR*² + *mR*² = (3/2)*mR*², so KE = ½*I*(*v*/*R*)² = ¾*mv*².
3. **Energy.** The centre falls *R*(1 − cos θ): ¾*mv*² = ¾*mv*₀² + *mgR*(1 − cos θ).
4. **The corner's push.** *mg* cos θ − *N* = *mv*²/*R*. At θ = 0, *N* = (2/3)*mg*, so the cylinder does not leave at once. *N* falls as θ grows.
5. **Contact lost, N = 0.** Then *v*² = *gR* cos θ. With *v*₀² = *gR*/3: (7/4) cos θ = 5/4, so cos θ = 5/7 (θ ≈ 44.4°) and *v* = √(5*gR*/7). This is option **(B)**.
6. **The options.**
   - (A) 0 and (C) *gR*/15 are below *v*₀²: impossible, because the centre only falls.
   - (D) 3*gR*/7 needs cos θ = 3/7, where energy gives *v*² = (23/21)*gR* and *N* = −(2/3)*mg*. Contact would already have been lost. (D) is what you get by subtracting the initial KE.
   - In general, cos θ = (3*v*₀²/*gR* + 4)/7. If *v*₀² ≥ *gR*, the cylinder leaves at the edge itself.
7. **Idealisation.** The needed friction is *f* = (1/3)*mg* sin θ, while *N* → 0. A real corner would let the cylinder slip slightly before 44.4°. The question states pure rotation about the corner, and the page says so.

## Verification log

| Check | Result |
|---|---|
| Independent derivation (no impulse at the edge, I = 3/2 mR², energy + N = 0) | cos θ = 5/7, v = √(5gR/7) → B |
| sympy | cos θ = (3v₀²/gR + 4)/7 = 5/7; v² = 5gR/7; only option B |
| Newton–Euler in Cartesian coordinates (scipy), corner force from the no-slip constraint, no energy equation | N = 0 at v²/gR = 0.714286, cos θ = 5/7 |
| Exact fractions | 5/7; energy balance closes |
| Whole input range | v₀²/gR = 0.04…0.99 agrees with (3u + 4)/7; v₀² ≥ gR leaves at the edge |
| Flight after release | never within R of the block again (every v₀, both scene depths) |
| Every option | A, C below v₀² (impossible); D gives N = −2/3 mg; only B |
| Numeric script | `tests/verify_p1phyq03.py` |
| The page | engine run in Node by the verifier: same answer and numbers; `tests/sim_p1phyq03.js` drives the page, the visual gates and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q19 = Physics Q.3): (B), same steps |
| Answer key | official key printed with the paper (page 13, visible on the same page as the question; the derivation above does not use it): Q.3 → B |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates, library and production audits) — 2026-09-30. No human review has been recorded.**
