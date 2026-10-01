# ADV-2026-P1-PHY-Q16 — Moment of inertia of planar rod frames about an axis in their plane

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 4 — matching list set |
| **Question** | Q.16 (MathonGo numbering: Q32) |
| **Type** | Single correct option (+4 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 25 |

---

## Question (verbatim)

Q.16 **List-I** shows four planar structures made of uniform solid rods each of mass *m* and length *l*. In the **List-II** the possible moment of inertia of these structures about an axis *OCO*′, which lies in the plane of the structures, are given. Choose the option that describes the correct match between the entries in **List-I** to those in **List-II**.

List-I (figures): (P) rods *CA* and *CB* meeting at *C* at 90°, *CA* pointing down and *CB* to the right; the axis *OCO*′ passes through *C* at 45° to each rod; (Q) an equilateral triangle *ABC*, the axis through *C* parallel to *AB* (60° to *CA* and *CB*); (R) a square *ABCD*, all angles 90°, the axis along the diagonal *CA*; (S) rods *CA* and *CB* from *C*, each at 30° to the axis.

List-II: (1) 5/4 *ml*² (2) 1/6 *ml*² (3) 1/12 *ml*² (4) 2/3 *ml*² (5) 1/3 *ml*²

(A) P→5, Q→1, R→4, S→2  (B) P→1, Q→3, R→4, S→2
(C) P→5, Q→3, R→2, S→1  (D) P→5, Q→4, R→2, S→1

The figures are described in words here and redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | System of Particles and Rotational Motion |
| Topic | Moment of inertia of planar rod frames about an axis in their own plane - each rod counts by its perpendicular distance from the axis |
| Also | Rotational dynamics (τ = *Iα*) |
| Difficulty | Easy-Moderate |
| Answer | **A** (P→5, Q→1, R→4, S→2) |

## Solution

1. **The idea.** A rod with one end on the axis at angle *θ*: a piece at distance *s* along it is *s* sin *θ* from the axis, so *I* = ∫₀ˡ (*m*/*l*)(*s* sin *θ*)² d*s* = (*ml*²/3) sin² *θ*. A rod parallel to the axis at distance *d*: *I* = *md*². Moments of the rods add.
2. **(P) → (5).** 2 × (*ml*²/3)(sin² 45°) = *ml*²/3.
3. **(Q) → (1).** 2 × (*ml*²/3)(sin² 60°) + *m*((√3/2)*l*)² = *ml*²/2 + 3*ml*²/4 = 5*ml*²/4.
4. **(R) → (4).** 4 × (*ml*²/3)(sin² 45°) = 2*ml*²/3.
5. **(S) → (2).** 2 × (*ml*²/3)(sin² 30°) = *ml*²/6.
6. P→5, Q→1, R→4, S→2: **option (A)**. (3), *ml*²/12, fits no frame.

## Verification log

| Check | Result |
|---|---|
| Approach | MathonGo solution read first as the conceptual reference ((*ml*²/3) sin² *θ* per rod) |
| Independent solve (from the figures) | P 1/3, Q 5/4, R 2/3, S 1/6 (in *ml*²) |
| sympy rod integrals in the figure's coordinates (lengths and angles checked) | P5 Q1 R4 S2 |
| Parallel-axis route through rod centres | equal for every frame |
| 3-D inertia tensor, frames at a random orientation | equal to 1e-6 |
| RK4 spin-up under a constant torque (*I* = τ/α) | equal for every frame |
| Options | B, C and D each fail |
| Numeric script | `tests/verify_p1phyq16.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq16.js` checks ω = (τ/*I*)*t* at every instant, each measured *I* and the match, the target display (`tests/target_gate.js`), the visual gates A–K and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q32 = Physics Q.16): (A), same method |
| Answer key | official key printed with the paper (page 25; read last): Q.16 → A |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates A–K, library and production audits) — 2026-10-02. No human review has been recorded.**
