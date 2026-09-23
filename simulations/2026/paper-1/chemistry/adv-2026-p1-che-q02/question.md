# ADV-2026-P1-CHE-Q02 — graphical representation of a reversible first-order reaction R ⇌ P

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 1 — single correct option |
| **Question** | Q.2 (combined number Q.34: 16 Mathematics + 16 Physics + 2) |
| **Type** | Single correct MCQ (+3 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 26 |

---

## Question (verbatim)

For a reversible reaction **R** ⇌ **P**, at constant temperature, both the forward and the backward
reactions are first order elementary reactions with rate constants *k*<sub>f</sub> and *k*<sub>b</sub>,
respectively. At time zero, the concentration of **R** is [**R**]<sub>0</sub> and the concentration of
**P** is zero. At any given time, [**R**] and [**P**] are the concentrations of **R** and **P**,
respectively. If *k*<sub>b</sub> = 4*k*<sub>f</sub>, the correct graphical representation of the
reaction is

The four options are graphs of *concentration ratio* against *time*, with [R]/[R]<sub>0</sub> drawn
dashed and [P]/[R]<sub>0</sub> drawn solid. The time axes carry no numbers. As printed:

| Option | [R]/[R]<sub>0</sub> (dashed) | [P]/[R]<sub>0</sub> (solid) | Shape |
|---|---|---|---|
| (A) | falls from 1, levels off at 0.5 | rises from 0, levels off at 0.5 | both settle about half-way along the axis |
| (B) | falls from 1, levels off at 0.2 | rises from 0, levels off at 0.8 | settles quickly |
| (C) | falls from 1, levels off at 0.8 | rises from 0, levels off at 0.2 | settles quickly |
| (D) | decays towards about 0.05, no level stretch | curves **upward** and reaches 1 at the right edge | the curves cross near 0.33 |

The simulation redraws all four as live vector graphs; the PDF itself is never published.

## Classification

| | |
|---|---|
| Chapter | Chemical Kinetics |
| Topic | Reversible (opposing) first-order reactions |
| Also uses | Dynamic equilibrium; K = k<sub>f</sub>/k<sub>b</sub>; mass balance; reading kinetics graphs |
| Difficulty | Moderate |
| Answer | **(C)** |

## Rules / formulas

```
rf = kf[R]          rb = kb[P]                       (elementary, first order)
d[P]/dt = kf[R] - kb[P],   [R] = [R]0 - [P]          (every R lost is a P gained)
=> d[P]/dt = kf[R]0 - (kf + kb)[P]
[P]/[R]0 = kf/(kf + kb) * (1 - exp(-(kf + kb) t))
[R]/[R]0 = kb/(kf + kb) + kf/(kf + kb) * exp(-(kf + kb) t)
equilibrium:  kf[R]eq = kb[P]eq,   K = [P]eq/[R]eq = kf/kb
kobs = kf + kb,    tau = 1/(kf + kb)
```

## Data (derived)

| Quantity | Value |
|---|---|
| k<sub>b</sub>/k<sub>f</sub> (stated in the stem) | 4 |
| [P]<sub>eq</sub>/[R]<sub>0</sub> = k<sub>f</sub>/(k<sub>f</sub> + k<sub>b</sub>) | 1/5 = **0.2** |
| [R]<sub>eq</sub>/[R]<sub>0</sub> = k<sub>b</sub>/(k<sub>f</sub> + k<sub>b</sub>) | 4/5 = **0.8** |
| K = k<sub>f</sub>/k<sub>b</sub> | 1/4 |
| k<sub>obs</sub> = k<sub>f</sub> + k<sub>b</sub> | 5k<sub>f</sub> |
| With the page's defaults k<sub>f</sub> = 1 s⁻¹, [R]<sub>0</sub> = 1 M | τ = 0.200 s, half-way at 0.139 s, r<sub>f</sub> = r<sub>b</sub> = 0.800 mol L⁻¹ s⁻¹ at equilibrium |

The stem gives no values for k<sub>f</sub> or [R]<sub>0</sub>. They are convenient starting numbers
in the simulation; the plateau depends only on k<sub>b</sub>/k<sub>f</sub>.

## Solution

1. **Equilibrium is equal rates, not zero rates.** Both steps are elementary and first order, so
   r<sub>f</sub> = k<sub>f</sub>[R] and r<sub>b</sub> = k<sub>b</sub>[P]. At equilibrium
   k<sub>f</sub>[R]<sub>eq</sub> = k<sub>b</sub>[P]<sub>eq</sub>.
2. **Put in k<sub>b</sub> = 4k<sub>f</sub>:** k<sub>f</sub>[R]<sub>eq</sub> = 4k<sub>f</sub>[P]<sub>eq</sub>,
   so [R]<sub>eq</sub> = 4[P]<sub>eq</sub>.
3. **Mass balance:** [R]<sub>eq</sub> + [P]<sub>eq</sub> = [R]<sub>0</sub>, so 5[P]<sub>eq</sub> = [R]<sub>0</sub>:
   **[P]<sub>eq</sub>/[R]<sub>0</sub> = 0.2** and **[R]<sub>eq</sub>/[R]<sub>0</sub> = 0.8**.
4. **Shape:** integrating d[P]/dt = k<sub>f</sub>[R]<sub>0</sub> − (k<sub>f</sub> + k<sub>b</sub>)[P] from
   [P] = 0 gives [P]/[R]<sub>0</sub> = 0.2(1 − e<sup>−5k<sub>f</sub>t</sup>) and
   [R]/[R]<sub>0</sub> = 0.8 + 0.2e<sup>−5k<sub>f</sub>t</sup>: start at 1 and 0, fastest change at the
   start, both bend over, sum always 1, level off at 0.8 and 0.2.
5. **Against the options:** (A) levels at 0.5/0.5, which needs k<sub>b</sub> = k<sub>f</sub>. (B) levels
   with P at 0.8, which needs k<sub>f</sub> = 4k<sub>b</sub>. (D) never levels off, its [P] is concave
   up, and where its curves cross [R] + [P] ≈ 0.66[R]<sub>0</sub>, not [R]<sub>0</sub>. **(C)** matches
   in every respect.

**Answer: (C)**

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | rate law + detailed balance + mass balance → 0.2 / 0.8 → (C) |
| Symbolic (sympy `dsolve`) | [P] = k<sub>f</sub>[R]<sub>0</sub>/(k<sub>f</sub>+k<sub>b</sub>)(1 − e<sup>−(k<sub>f</sub>+k<sub>b</sub>)t</sup>); limit 1/5; concave down for all t |
| Numerical (hand-written RK4, no closed form) | agrees to 3.7 × 10⁻¹⁵ at seven times; plateau 0.800000 / 0.200000; mass balance to 2 × 10⁻¹⁵ |
| Exact fractions | 1/5 and 4/5; k<sub>f</sub>·4/5 = k<sub>b</sub>·1/5; K = 1/4 = k<sub>f</sub>/k<sub>b</sub> |
| Molecules (Gillespie, 5000 molecules) | settles at 0.196 ± 0.006; 23,699 conversions after settling — reactions never stop |
| Robustness | independent of [R]<sub>0</sub> and of the absolute rate constants; k<sub>b</sub>/k<sub>f</sub> = 1, 2, 4, 9 → 1/2, 1/3, 1/5, 1/10 |
| Distractor audit | (A) K = 1; (B) K = 4 (constants swapped); (D) no plateau, concave-up P, sum ≈ 0.66; only (C) gives K = 1/4 |
| Numeric script | `tests/verify_p1q02.py` — 34 / 34 pass, answer (C) |
| The page | answer letter chosen at run time from the printed plateaus; `tests/sim_p1q02.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q2 → C; ExamSIDE worked solution: (C), [R]/[R]<sub>0</sub> 1 → 0.8, [P]/[R]<sub>0</sub> 0 → 0.2 |

**Status: verified — 2026-09-23.**
