# ADV-2026-P1-CHE-Q09 — He/Ar mixtures in two piston cylinders

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 3 — numerical value |
| **Question** | Q.9 (MathonGo numbering: Q41) |
| **Type** | Numerical value (+4 / 0) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 31 |

---

## Question (verbatim)

Two cylinders, both fitted with frictionless pistons, are filled with mixtures of He and Ar gases. In the first cylinder, the
masses of He and Ar are *m*₁ and *m*₂, respectively. In the second cylinder, the masses of He and Ar are *m*₂ and *m*₁,
respectively. The molar mass of Ar is 10 times the molar mass of He. The external pressure applied by the piston on the first
cylinder needs to be 5 times that on the second cylinder so that the volume of the gas mixtures in both the cylinders are equal at
the same temperature. Assuming He and Ar behave like ideal gases, the value of (*m*₁/*m*₂) is ____.

## Classification

| | |
|---|---|
| Chapter | States of Matter: Gases and Liquids |
| Topic | Ideal gas equation — pressure, moles and gas mixtures at equal volume and temperature |
| Difficulty | Easy |
| Answer | **9.80** |

## Solution

1. Let M(He) = M, so M(Ar) = 10M.
2. n₁ = m₁/M + m₂/(10M) = (10m₁ + m₂)/(10M); n₂ = m₂/M + m₁/(10M) = (10m₂ + m₁)/(10M).
3. Same V and T: P₁/P₂ = n₁/n₂ = 5.
4. 10m₁ + m₂ = 5(10m₂ + m₁) ⇒ 5m₁ = 49m₂ ⇒ **m₁/m₂ = 49/5 = 9.80**.
5. Check: n₁ : n₂ = (98 + 1) : (10 + 9.8) = 99 : 19.8 = 5 : 1 ✓.

General form: m₁/m₂ = (pk − 1)/(k − p) with k = M(Ar)/M(He) and p = P₁/P₂; it exists only when 1/k < p < k.

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | 5m₁ = 49m₂ → 9.80 |
| sympy | exact 49/5; general (pk − 1)/(k − p); M cancels |
| Independent bisection | 9.8000, unique root |
| Ideal-gas calculation (real units, 250 / 300 / 600 K) | P₁/P₂ = 5 every time |
| Robustness / custom values | real molar masses → 9.82; p = 2 → 2.38; p = k → no solution |
| Traps | m₁/m₂ = 5 → P₁/P₂ = 3.4; m₁/m₂ = 0.10 → 0.2; masses instead of moles → no solution |
| Numeric script | `tests/verify_p1q09.py` — 20 / 20 pass |
| Solution website | MathonGo (their Q41): 9.8 |
| The page | answer computed at run time by its own bisection; `tests/sim_p1q09.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q9 → 9.80 |

**Status: verified — 2026-09-27.**
