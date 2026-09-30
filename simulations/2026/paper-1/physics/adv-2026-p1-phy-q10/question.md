# ADV-2026-P1-PHY-Q10 — Five Carnot engines in series: the efficiency of each

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 3 — four questions, numerical value |
| **Question** | Q.10 (MathonGo numbering: Q26) |
| **Type** | Numerical value (+4 / 0), rounded to two decimal places |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 19 |

---

## Question (verbatim)

Q.10 As shown in the figure, five Carnot engines, each with efficiency *η* and same number of cycles per unit time, are operating between six heat reservoirs. The amount of heat released per cycle by one engine is completely absorbed by the next engine. Consider *Q*₀ to be the amount of heat absorbed per cycle by the first engine and *W* as the amount of total work done by all the engines per cycle, then the net efficiency of the system is found to be *η*<sub>net</sub> = *W*/*Q*₀ = 211/243. The value of *η* is:

The figure shows six reservoirs stacked vertically with an engine between each pair. *Q*₀ enters the first engine, each engine gives out work *W*₁ … *W*₅, and heat *Q*₁ … *Q*₅ passes down. It is redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | Thermodynamics |
| Topic | Carnot engines in series - each engine's rejected heat drives the next; net efficiency 1 - (1 - eta)^N |
| Difficulty | Easy-Moderate |
| Answer | **0.33** (η = 1/3; key 0.32 to 0.34) |

## Solution

1. Each engine passes on (1 − *η*) of the heat it receives, so *Q<sub>k</sub>* = (1 − *η*)<sup>*k*</sup>*Q*₀.
2. Energy conservation over the whole stack gives *W* = *Q*₀ − *Q*₅, so *W*/*Q*₀ = 1 − (1 − *η*)⁵ = 211/243.
3. That means (1 − *η*)⁵ = 32/243 = (2/3)⁵, so ***η* = 1/3 ≈ 0.33**.
4. For Carnot engines, each reservoir is 2/3 of the temperature of the one above, for example 1215 → 810 → 540 → 360 → 240 → 160 K. The cascade is then the same as one Carnot engine between 1215 K and 160 K.

## Verification log

| Check | Result |
|---|---|
| Independent derivation | η = 1/3 |
| sympy | the telescoping sum; the only root in (0, 1) is 1/3 |
| Five explicit Carnot cycles of ideal gas (1215 … 160 K) | W/Q₀ = 211/243; total entropy change 0 |
| Brute force (10⁶ values) | η = 0.33333 |
| Numeric script | `tests/verify_p1phyq10.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq10.js` drives the bisection, the visual gates and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q26 = Physics Q.10): 0.33 |
| Answer key | official key printed with the paper (page 19; the derivation above does not use it): Q.10 → 0.32 to 0.34 |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates, library and production audits) — 2026-09-30. No human review has been recorded.**
