# ADV-2026-P1-PHY-Q07 — An isothermal–isochoric–adiabatic cycle of a monoatomic ideal gas

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 2 — four questions, one or more options correct |
| **Question** | Q.7 (MathonGo numbering: Q23) |
| **Type** | One or more correct options (+4 / +3 / +2 / +1 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 16 |

---

## Question (verbatim)

Q.7 A quasi-static cycle of a monoatomic ideal gas contains an isothermal process (***ab***), followed by an isochoric process (***bc***) and an adiabatic process (***ca***) as shown in the figure. The volumes of the gas are *V*₁ and *V*₂ at ***a*** and ***b***, respectively. If the cycle has heat input *Q*<sub>in</sub> and output *Q*<sub>out</sub>, then the efficiency of the cycle is defined as *η* = (*Q*<sub>in</sub> − *Q*<sub>out</sub>)/*Q*<sub>in</sub>. The correct statement(s) is/are:
[Given: ln 2 ≈ 0.7]

(A) If *V*₂/*V*₁ = 8, the heat released in the process ***bc*** is smaller than the heat absorbed in the process ***ab***.
(B) For a given value of *V*₂/*V*₁, *η* does not depend on the temperature of the isothermal process.
(C) If *V*₂/*V*₁ = 8, then the temperature of the gas at ***a*** is 4 times the temperature of the gas at ***c***.
(D) If *V*₂/*V*₁ = 8, then the pressure of the gas at ***a*** is 4 times the pressure of the gas at ***b***.

The figure is a *P*–*V* diagram. From *a* (at *V*₁) the isotherm falls to *b* (at *V*₂), the isochore drops from *b* to *c*, and the steeper adiabat returns from *c* to *a*. It is redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | Thermodynamics |
| Topic | A cycle of isothermal, isochoric and adiabatic processes for a monoatomic ideal gas - heat flows, temperature and pressure ratios, efficiency |
| Difficulty | Moderate |
| Answer | **(A), (B), (C)** |

## Solution

1. **The states.** Let *r* = *V*₂/*V*₁. Along the adiabat, *T* ∝ *V*<sup>−2/3</sup>, so *T<sub>c</sub>* = *T<sub>a</sub>* *r*<sup>−2/3</sup>. For *r* = 8 that gives *T<sub>a</sub>* = 4*T<sub>c</sub>*, so **(C)** is true.
2. **The heats.** *Q<sub>ab</sub>* = *nRT<sub>a</sub>* ln 8 ≈ 2.1 *nRT<sub>a</sub>* is absorbed. *Q<sub>bc</sub>* = (3/2)*nR*(*T<sub>a</sub>* − *T<sub>c</sub>*) = 1.125 *nRT<sub>a</sub>* is released, which is smaller, so **(A)** is true. No heat flows along *ca*.
3. **The efficiency.** *η* = 1 − (3/2)(1 − *r*<sup>−2/3</sup>)/ln *r*. *T<sub>a</sub>* cancels, so **(B)** is true. At *r* = 8, *η* ≈ 0.459 (0.464 with ln 2 = 0.7).
4. **The pressures.** On the isotherm, *P<sub>a</sub>*/*P<sub>b</sub>* = *V*₂/*V*₁ = 8, not 4, so **(D)** is false.

## Verification log

| Check | Result |
|---|---|
| Independent derivation | A, B, C |
| sympy | T_a/T_c = 4; Q_bc = 9/8 nRT_a < Q_ab = 3 ln 2 nRT_a; η has no T_a; P_a/P_b = 8 |
| First law integrated along each leg (scipy; adiabat from dT/dV = −P/nC_V) | T_c = 75.0 K from 300 K; Q_ab = 5.19 kJ, Q_bc = 2.81 kJ; η the same from 150 to 1200 K |
| Numeric script | `tests/verify_p1phyq07.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq07.js` drives the cycle, the audit, the visual gates and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q23 = Physics Q.7): (A), (B), (C) |
| Answer key | official key printed with the paper (page 16; the derivation above does not use it): Q.7 → ABC |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates, library and production audits) — 2026-09-30. No human review has been recorded.**
