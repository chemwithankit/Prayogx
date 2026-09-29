# ADV-2026-P1-PHY-Q01 — Two rollers on a fixed disk: rolling without slipping and the time until they touch again

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 1 — four questions, only one option correct |
| **Question** | Q.1 (MathonGo numbering: Q17) |
| **Type** | Single correct option (+3 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 12 |

---

## Question (verbatim)

Q.1 Consider a large disk of radius *R* and two smaller disks, each of radius *r* = *R*/50, lying on its circumference, as shown in the figure. The smaller disks are initially in contact with each other, with an angular separation Δ*θ* between their centers. They are made to roll without slipping in opposite directions, with constant angular velocities *ω* and 2*ω* while the large disk is held stationary. The time *τ* at which the smaller disks are again in contact is:

[Use sin(Δ*θ*) = Δ*θ* and ignore gravity.]

(A) τ = 51 × (2π − 4/51)/ω &nbsp; (B) τ = 51 × (2π − 2/51)/3ω &nbsp; (C) τ = 51 × (2π − 4/51)/3ω &nbsp; (D) τ = 51 × (2π − 2/51)/ω

The figure shows the large disk with its radius *R*, the two touching small disks (radius *r*) on its rim at the upper right, the upper
one turning with *ω* (anticlockwise) and the lower one with 2*ω* (clockwise), and the angle Δ*θ* between the lines from the centre to
their centres. It is redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | System of Particles and Rotational Motion |
| Topic | Rolling without slipping on a fixed circular surface - angular speed of the centre and relative angular motion |
| Also | Circular motion (angular speed) · the coin-rotation paradox · small-angle geometry |
| Difficulty | Moderate |
| Answer | **(C)** |

## Solution

1. **Contact angle.** Touching, the centres are 2*r* apart and each is *R* + *r* from O. With sin Δθ = Δθ the chord equals the arc:
   (*R* + *r*)Δθ = 2*r*, so Δθ = 2*r*/(*R* + *r*) = 2/51 rad.
2. **Rolling without slipping.** The point of each small disk touching the fixed disk is at rest, so the centres move at *v*₁ = *ωr*
   and *v*₂ = 2*ωr*.
3. **Angular speed of each centre about O.** The centres move on the circle of radius *R* + *r* = 51*r*: Ω₁ = *ωr*/51*r* = *ω*/51,
   Ω₂ = 2*ω*/51. (Using *R* would give *ω*/50 — the coin-rotation trap: a disk rolling once round spins 1 + *R*/*r* = 51 times.)
4. **How far.** Moving in opposite directions, the angle between the centres grows at Ω₁ + Ω₂ = 3*ω*/51. They touch again when the
   gap on the far side has closed to Δθ: the angle swept is 2π − 2Δθ = 2π − 4/51.
5. τ = (2π − 4/51)/(3*ω*/51) = **51 × (2π − 4/51)/3ω** (ωτ ≈ 105.48): option **(C)**.
6. Distractors: (A) 316.44/ω uses *ω*/51 for the relative speed (one roller only); (B) 106.15/ω removes Δθ once; (D) both mistakes.

## Verification log

| Check | Result |
|---|---|
| Independent derivation (rolling constraint + geometry) | τ = 51(2π − 4/51)/3ω → C |
| sympy | only option C simplifies to the derived τ |
| RK4 time stepping, no-slip condition only, exact contact angle | ωτ = 105.4807, within 0.01 % of C; centres stay on R + r |
| Coin rotation | 51 spins per lap; roller 2 turns twice as far as roller 1 |
| Controls | R/r = 10, 5; speeds (1,1), (1,3), (2,3) follow (R + r)/r × (2π − 2Δθ)/(n₁ + n₂) |
| Every option | A 316.44, B 106.15, C 105.48, D 318.44 — only C |
| Numeric script | `tests/verify_p1phyq01.py` |
| The page | engine run in Node by the verifier: same answer and numbers; `tests/sim_p1phyq01.js` drives the page and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q17 = Physics Q.1): (C), same steps |
| Answer key | official key printed with the paper (page 12, visible on the same page as the question; the derivation above does not use it): Q.1 → C |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, library and production audits) — 2026-09-29. No human review has been recorded.**
