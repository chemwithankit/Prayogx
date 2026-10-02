# ADV-2026-P2-PHY-Q04 — Period of small radial oscillations of a nudged circular orbit under an inverse-square force

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 2 |
| **Subject** | Physics |
| **Section** | Section 1 — single correct option |
| **Question** | Q.4 (MathonGo numbering: Q22) |
| **Type** | Single correct option (+3 / 0 / −1) |
| **Source** | `papers/adv_2026_paper_2.pdf`, page 11 |

---

## Question (verbatim)

Q.4 A particle of mass *m*, and angular momentum *ℓ* is moving in a circular orbit of radius *r*₀ under the influence of an attractive force **F**(*r*) = −(*k*/*r*²) *r̂*. Keeping its angular momentum unchanged, the particle is displaced radially by a small distance *δr* ≪ *r*₀, due to which its radial distance varies periodically. The corresponding time period is:

(A) 2*πℓ*³/(*mk*²)  (B) 2*π*√(*m*/*k*)  (C) 2*πℓ*³/(3*mk*²)  (D) 2*πℓ*³/(5*mk*²)

## Classification

| | |
|---|---|
| Chapter | Gravitation |
| Topic | Radial oscillation of a nudged circular orbit under an inverse-square force - effective potential and a closed orbit |
| Difficulty | Moderate |
| Answer | **A** (*T* = 2*πℓ*³/(*mk*²)) |

## Solution

1. **Effective potential.** With *ℓ* fixed, *U*ₑff = *ℓ*²/(2*mr*²) − *k*/*r*.
2. **Circular orbit.** d*U*ₑff/d*r* = 0 → *r*₀ = *ℓ*²/(*mk*).
3. **Curvature.** *U*ₑff″(*r*₀) = 3*ℓ*²/(*mr*₀⁴) − 2*k*/*r*₀³ = *k*/*r*₀³ (using *ℓ*² = *mkr*₀).
4. **Small oscillation.** *ω*² = *U*ₑff″/*m* = *k*/(*mr*₀³), so *T* = 2*π*√(*mr*₀³/*k*).
5. **In terms of ℓ.** *T* = 2*πℓ*³/(*mk*²): **option (A)**.
6. **Check.** The orbital period 2*πmr*₀²/*ℓ* is the same: the orbit closes (an ellipse). (B) has the wrong units; (C) and (D) are a third and a fifth of the right value.

## Verification log

| Check | Result |
|---|---|
| Approach | MathonGo solution read first as the conceptual reference |
| Independent solve | *U*ₑff″(*r*₀) = *k*/*r*₀³ → *T* = 2*πℓ*³/(*mk*²) |
| sympy | minimum, curvature, period and equal orbital period, exactly |
| DOP853 integration (10⁻¹²) | period → formula as *δr* → 0; excess ∝ *δr*² |
| Kepler (finite nudge) | integrated period = 2*π*√(*ma*³/*k*), 10⁻⁸ |
| Options | units of (B); (C), (D) a third and a fifth; *k*/*r*¹·⁵ rosette |
| Numeric script | `tests/verify_p2phyq04.py` |
| The page | engine run in Node by the verifier (answer A; period equal to DOP853 within 10⁻⁵; ℓ conserved; orbit closes); `tests/sim_p2phyq04.js` checks the staged run, the measured period, the what-if, the sliders, the target display (`tests/target_gate.js`), the visual gates A–K and the app shell |
| Solution website | MathonGo Paper 2 solutions (their Q22 = Physics Q.4): (A) |
| Answer key | official final key, JEE Advanced 2026 Paper 2 (jeeadv.ac.in, published 2026-06-01; read last): Q.4 → A |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates A–K, library and production audits) — 2026-10-02. No human review has been recorded.**
