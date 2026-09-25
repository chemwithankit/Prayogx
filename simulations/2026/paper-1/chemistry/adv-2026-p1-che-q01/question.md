# ADV-2026-P1-CHE-Q01 — minimum work for a two-step isothermal compression

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 1 — single correct option |
| **Question** | Q.1 |
| **Type** | Single correct MCQ (+3 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 26 |

---

## Question (verbatim)

An ideal gas (0.5 mol), initially at 2 bar pressure, is compressed at a constant temperature of
600 K in two steps: first, against a constant external pressure of *P* bar (2 < *P* < 8), and then
against constant external pressure of 8 bar. At each step, the compression is stopped only when the
pressure of the gas becomes equal to the external pressure. The total work done on the gas in these
steps is *W*. Considering all possible values of *P* (2 < *P* < 8) and taking the gas constant as *R*
(in J K⁻¹ mol⁻¹), the minimum value of |*W*| (in J) is

| (A) | (B) | (C) | (D) |
|---|---|---|---|
| 207*R* | 600*R* | 630*R* | 900*R* |

## Classification

| | |
|---|---|
| Chapter | Thermodynamics |
| Topic | Work in isothermal compression of an ideal gas — irreversible, multi-step |
| Difficulty | Moderate |
| Answer | **(B) 600R** |

## Rules / formulas

```
w_on = -P_ext (V_final - V_initial)             work against a constant external pressure
V = nRT/P                                       each step ends on the isotherm
W(P) = nRT (P/P1 + P2/P - 2)
dW/dP = nRT (1/P1 - P2/P^2) = 0  ->  P = sqrt(P1 P2)
W_min = 2nRT (sqrt(P2/P1) - 1)
W_rev = nRT ln(P2/P1)    W_one-step = nRT (P2/P1 - 1)
```

## Data (derived)

| Quantity | Value |
|---|---|
| nRT | 0.5 × 600 R = 300R |
| V₁ at 2 bar / V₂ at 8 bar | 12.472 L / 3.118 L |
| Optimal first-step pressure | √(2 × 8) = **4 bar** (V = 6.236 L) |
| w₁ = w₂ at the optimum | 300R each |
| **W_min** | **600R J ≈ 4988.7 J** |
| Reversible limit / one step | 415.9R / 900R |

## Solution

1. **Work against a constant pressure.** w_on = P_ext(V_initial − V_final): the load on the piston
   times the volume swept.
2. **Each step ends on the isotherm**, so V = nRT/P there:
   w₁ = P(nRT/2 − nRT/P) = nRT(P/2 − 1), w₂ = 8(nRT/P − nRT/8) = nRT(8/P − 1).
3. **Total:** W(P) = nRT(P/2 + 8/P − 2) = 300R(P/2 + 8/P − 2).
4. **Minimise:** dW/dP = 300R(1/2 − 8/P²) = 0 → P = 4 bar; d²W/dP² > 0, so it is a minimum.
5. **Value:** W_min = 300R(2 + 2 − 2) = **600R J**. The work is done on the gas, so |W| = 600R.
6. **Options:** (A) 207R = nRT ln 2 is below the reversible work 415.9R — impossible. (C) 630R is a
   two-step run at P = 3.2 or 5 bar. (D) 900R is the one-step limit. **Answer (B).**

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | W(P) = nRT(P/P₁ + P₂/P − 2) → P = 4 bar → 600R → (B) |
| Symbolic (sympy) | single stationary point √(P₁P₂), d²W/dP² > 0, W_min = 600R |
| Brute force (60 000 P values, litres and bar, no formula for W) | minimum at 4.000 bar, 600.000R = 4988.7 J |
| Exact fractions | w₁ = w₂ = 300R at P = 4 bar |
| Bounds | 415.9R (reversible) < 600R < 900R (one step); 1, 2, 4, 100 steps → 900, 600, 497.1, 418.8R |
| Distractor audit | 207R impossible; 630R at P = 3.2 or 5 bar; 900R one step |
| Numeric script | `tests/verify_p1q01.py` — 26 / 26 pass, answer (B) |
| The page | golden-section search on measured Pext × ΔV gives 4.000000 bar, 600.000000R; option picked at run time; `tests/sim_p1q01.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q1 → B |

**Status: verified — 2026-09-25.**
