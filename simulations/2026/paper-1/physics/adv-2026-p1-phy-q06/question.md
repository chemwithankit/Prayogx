# ADV-2026-P1-PHY-Q06 — A projectile through a point 1 m high and 5 m away: speed and highest point

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 2 — four questions, one or more options correct |
| **Question** | Q.6 (MathonGo numbering: Q22) |
| **Type** | One or more correct options (+4 / +3 / +2 / +1 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 16 |

---

## Question (verbatim)

Q.6 A particle is thrown with a speed *v* from a point *O* at an angle *θ* with the horizontal plane such that it passes through the point *P* at a height of 1 m and horizontal distance of 5 m from *O*, as shown in the figure. If acceleration due to gravity is *g* ms<sup>−2</sup>, then the correct statement(s) is/are:

(A) If *θ* = 45°, then *v* = 5√*g*/2 ms<sup>−1</sup>.
(B) If *θ* = 45°, the particle reaches its maximum height before it reaches *P*.
(C) If *θ* = 30°, the particle reaches its maximum height after reaching *P*.
(D) If *θ* = tan<sup>−1</sup>(1/5), then *v* = 125√*g* ms<sup>−1</sup>.

The figure shows *O* on level ground, the launch at speed *v* and angle *θ*, and *P* 1 m above the ground at a horizontal distance of 5 m. It is redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | Motion in a Plane |
| Topic | Projectile through a given point - launch speed for a given angle and the position of the highest point |
| Difficulty | Easy-Moderate |
| Answer | **(A), (B)** |

## Solution

1. **The trajectory.** *y* = *x* tan *θ* − *g x*²/(2*v*² cos²*θ*). Putting in *P* gives *v*² = 25*g*/[2 cos²*θ*(5 tan *θ* − 1)].
2. **45°.** *v*² = 25*g*/4, so *v* = 5√*g*/2, and **(A)** is true. The highest point is at *x* = *v*² sin 2*θ*/2*g* = 3.125 m, before *P*, so **(B)** is true.
3. **30°.** *v*² ≈ 8.83*g*, and the highest point is at *x* ≈ 3.825 m. That is still before *P*, so **(C)** is false.
4. **tan⁻¹(1/5).** This is the slope of the line *OP* itself, so 5 tan *θ* − 1 = 0 and no finite speed reaches *P*. **(D)** is false: with *v* = 125√*g*, the ball passes 26/31250 m ≈ 0.83 mm below *P*.
5. **In general**, the highest point is at *x* = 12.5 tan *θ*/(5 tan *θ* − 1). It lies beyond *P* only for shallow throws, 11.3° < *θ* < 21.8°.

## Verification log

| Check | Result |
|---|---|
| Independent derivation (trajectory through P, highest point) | A, B |
| sympy | v(45°) = 5√g/2; x_top(45°) = 25/8 m; x_top(30°) = 3.825 m; 5 tan θ − 1 = 0 at tan⁻¹(1/5) |
| Newton's law integrated (no trajectory formula), speed by shooting | 2.500√g, 3.125 m; 2.972√g, 3.825 m; every tan⁻¹(1/5) throw below P |
| Exact | the 125√g miss is 26/31250 m |
| Numeric script | `tests/verify_p1phyq06.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq06.js` drives every throw, the audit, the visual gates and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q22 = Physics Q.6): (A), (B) |
| Answer key | official key printed with the paper (page 16; the derivation above does not use it): Q.6 → AB |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates, library and production audits) — 2026-09-30. No human review has been recorded.**
