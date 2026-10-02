# ADV-2026-P2-PHY-Q03 — Smallest angle of minimum deviation of a thin prism whose refractive index varies with wavelength

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 2 |
| **Subject** | Physics |
| **Section** | Section 1 — single correct option |
| **Question** | Q.3 (MathonGo numbering: Q21) |
| **Type** | Single correct option (+3 / 0 / −1) |
| **Source** | `papers/adv_2026_paper_2.pdf`, page 10 |

---

## Question (verbatim)

Q.3 A beam of polychromatic light passes through a thin prism of prism angle 6°. The refractive index of the material of the prism varies with wavelength (*λ*) as *n*(*λ*) = *αλ* + *β*/*λ*², where *α* = 3 *μ*m⁻¹ and *β* = 0.096 *μ*m². If *λ*ₘᵢₙ is the wavelength at which the angle of minimum deviation *D*ₘ is smallest, then the correct value of *D*ₘ at *λ*ₘᵢₙ is

(A) 6.4°  (B) 4.8°  (C) 3.2°  (D) 2.4°

## Classification

| | |
|---|---|
| Chapter | Ray Optics and Optical Instruments |
| Topic | Minimum deviation of a thin prism with a wavelength-dependent index - the wavelength deviated least |
| Difficulty | Easy-Moderate |
| Answer | **B** (*D*ₘ = 4.8° at *λ*ₘᵢₙ = 0.4 *μ*m) |

## Solution

1. **Thin prism.** *D*ₘ = (*n* − 1)*A*: with *A* fixed, *D*ₘ is smallest where *n*(*λ*) is smallest.
2. **Minimise n.** d*n*/d*λ* = *α* − 2*β*/*λ*³ = 0 → *λ*³ = 2*β*/*α* = 0.064 *μ*m³ → *λ*ₘᵢₙ = 0.4 *μ*m (d²*n*/d*λ*² > 0).
3. **Smallest index.** *n* = 3 × 0.4 + 0.096/0.16 = 1.8.
4. **Deviation.** *D*ₘ = (1.8 − 1) × 6° = **4.8°**: **option (B)**.
5. **Check.** The exact formula *n* = sin[(*A* + *D*ₘ)/2]/sin(*A*/2) gives 4.81°.
6. **Other options.** (C) and (D) need *n* = 1.53 and 1.4, below the material's minimum; (A) needs *n* = 2.07, reached only at 0.28 and 0.6 *μ*m.

## Verification log

| Check | Result |
|---|---|
| Approach | MathonGo solution read first as the conceptual reference |
| Independent solve | *λ*ₘᵢₙ = 0.4 *μ*m, *n* = 1.8, *D*ₘ = 4.8° |
| Exact rational arithmetic | *λ*³ = 0.064, *n* = 1.8, *D*ₘ = 4.8° exactly (thin prism) |
| sympy | single stationary point at 0.4 *μ*m, a global minimum of *n* |
| Exact prism formula | 4.811°, nearest option (B) |
| Brute-force ray trace | smallest *D*ₘ 4.811° at 0.400 *μ*m, on the symmetric path |
| Options | (C), (D) need *n* below 1.8; (A) only at 0.280 and 0.600 *μ*m |
| Numeric script | `tests/verify_p2phyq03.py` |
| The page | engine run in Node by the verifier (answer B; both searches match theory over the slider range); `tests/sim_p2phyq03.js` checks the staged run, the D(*i*) dip, the scan against the exact formula, the what-if, the probe, the sliders, the target display (`tests/target_gate.js`), the visual gates A–K and the app shell |
| Solution website | MathonGo Paper 2 solutions (their Q21 = Physics Q.3): (B) |
| Answer key | official final key, JEE Advanced 2026 Paper 2 (jeeadv.ac.in, published 2026-06-01; read last): Q.3 → B |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates A–K, library and production audits) — 2026-10-02. No human review has been recorded.**
