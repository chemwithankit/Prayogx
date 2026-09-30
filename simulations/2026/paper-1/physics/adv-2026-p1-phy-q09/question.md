# ADV-2026-P1-PHY-Q09 — A hinged rod oscillating in two immiscible liquids: the value of n

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 3 — four questions, numerical value |
| **Question** | Q.9 (MathonGo numbering: Q25) |
| **Type** | Numerical value (+4 / 0), rounded to two decimal places |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 18 |

---

## Question (verbatim)

Q.9 A tank contains two immiscible liquids of densities 6*ρ* and 2*ρ*. The higher density liquid is filled up to a height *L*/2 from the bottom. A thin rod of density *ρ* and length *L* is fully immersed and hinged at the bottom so that it can oscillate freely, as shown in the figure. If the rod is slightly disturbed from its equilibrium, the time period of small oscillations is (2π/*n*)√(*L*/*g*), where *g* is the acceleration due to gravity. The value of *n* is:

The figure shows the tank, with the dense liquid filling the lower *L*/2 and the lighter liquid above it, and the vertical rod of length *L* hinged at the bottom centre. It is redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | Oscillations |
| Topic | Small oscillations of a hinged rod in two immiscible liquids - buoyancy torques in layered liquids, moment of inertia and the period |
| Also | Mechanical properties of fluids (buoyancy) · rotational motion (torque, moment of inertia) |
| Difficulty | Moderate |
| Answer | **1.73** (n = √3; key 1.70 to 1.75) |

## Solution

1. **Torques at tilt *θ*.**
   - Lower half, in 6*ρ*: the buoyancy 6*ρA*(*L*/2)*g* acts at *L*/4, giving (3/4)*ρAgL*² *θ*.
   - Upper half, in 2*ρ*: the buoyancy 2*ρA*(*L*/2)*g* acts at 3*L*/4, giving (3/4)*ρAgL*² *θ*.
   - Weight: *ρALg* acts at *L*/2, giving −(1/2)*ρAgL*² *θ*.
   - The net restoring torque is *ρAgL*² *θ*.
2. **Moment of inertia** about the hinge: *I* = *ρAL*³/3.
3. ***ω*² = 3*g*/*L***, so *T* = (2π/√3)√(*L*/*g*) and ***n* = √3 ≈ 1.73**.
4. The submerged length *L*/(2 cos *θ*) changes the torque only at order *θ*³, so the small-oscillation value is exact. Drag and the liquid's added mass are neglected.

## Verification log

| Check | Result |
|---|---|
| Independent derivation | n = √3 = 1.732 |
| sympy (exact submerged length) | κ = ρAgL², ω² = 3g/L, correction θ³/3 |
| Nonlinear dynamics, buoyancy integrated from the liquid pressure | n = 1.7321 at 1°; the same for L = 2 m; ≈ 1.74 at 12° |
| Energy (curvature of U(θ) in the layered liquid) | κ = gL² per ρA |
| Numeric script | `tests/verify_p1phyq09.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq09.js` times the swings, the visual gates and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q25 = Physics Q.9): 1.73 |
| Answer key | official key printed with the paper (page 18; the derivation above does not use it): Q.9 → 1.70 to 1.75 |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates, library and production audits) — 2026-09-30. No human review has been recorded.**
