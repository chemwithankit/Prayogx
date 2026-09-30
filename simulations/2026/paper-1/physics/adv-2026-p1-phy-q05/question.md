# ADV-2026-P1-PHY-Q05 — A Lyman transition in the Bohr hydrogen atom: four expressions checked

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 2 — four questions, one or more options correct |
| **Question** | Q.5 (MathonGo numbering: Q21) |
| **Type** | One or more correct options (+4 / +3 / +2 / +1 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 15 |

---

## Question (verbatim)

Q.5 Consider a hydrogen atom with *v<sub>k</sub>*, *r<sub>k</sub>*, and *K<sub>k</sub>* denoting the velocity, orbital radius and kinetic energy of the electron in the *k*<sup>th</sup> orbit, respectively. The electron undergoes a transition from the *n*<sup>th</sup> orbit, emitting radiation corresponding to the Lyman series. Considering *h* to be the Planck’s constant and *ϵ*<sub>0</sub> the permittivity of the free space, the correct statement(s) is/are:

(A) Magnitude of change in kinetic energy of electron can be expressed as (*h*/4π) |*n v<sub>n</sub>*/*r<sub>n</sub>* − *v*<sub>1</sub>/*r*<sub>1</sub>|.
(B) Magnitude of change in de Broglie wavelength of the electron can be expressed as (*e*²/4*ϵ*<sub>0</sub>) |1/*K<sub>n</sub>* − 1/*K*<sub>1</sub>|.
(C) Frequency of the radiation emitted can be expressed as *e*²/(8π*ϵ*<sub>0</sub>*h*) (1/*r*<sub>1</sub> − 1/*r<sub>n</sub>*).
(D) Magnitude of change in total energy of the electron can be expressed as (*h*/2π) |*v*<sub>1</sub>/*r*<sub>1</sub> − *n v<sub>n</sub>*/*r<sub>n</sub>*|.

## Classification

| | |
|---|---|
| Chapter | Atoms |
| Topic | Bohr model of hydrogen - kinetic energy, de Broglie wavelength and the photon frequency in a Lyman transition |
| Also | Dual nature (de Broglie wavelength) · energy levels |
| Difficulty | Moderate |
| Answer | **(A), (C)** |

## Solution

1. **Bohr's rule.** *m v<sub>k</sub> r<sub>k</sub>* = *k h*/2π and *m v<sub>k</sub>*²/*r<sub>k</sub>* = *e*²/(4π*ϵ*₀*r<sub>k</sub>*²). Together these give *K<sub>k</sub>* = (*h*/4π) *k v<sub>k</sub>*/*r<sub>k</sub>* = *e*²/(8π*ϵ*₀*r<sub>k</sub>*), and *E<sub>k</sub>* = −*K<sub>k</sub>*.
2. **(A) is true.** |Δ*K*| = (*h*/4π)|*n v<sub>n</sub>*/*r<sub>n</sub>* − *v*₁/*r*₁|.
3. **(D) is false.** |Δ*E*| = |Δ*K*|, but (D) uses *h*/2π, so it gives twice the change.
4. **(C) is true.** *hν* = *K*₁ − *K<sub>n</sub>* = (*e*²/8π*ϵ*₀)(1/*r*₁ − 1/*r<sub>n</sub>*).
5. **(B) is false.** *λ<sub>k</sub>* = 2π*r<sub>k</sub>*/*k* = *e*²/(4*ϵ*₀ *k K<sub>k</sub>*). (B) omits the 1/*n*, which makes it (*n* + 1) times the true change. For *n* = 3 it gives 26.6 Å against the true 6.65 Å.

## Verification log

| Check | Result |
|---|---|
| Independent derivation (Bohr quantisation, E = −K, λ = 2πr/k) | A, C |
| sympy, symbolic k and n | expression / truth: A 1, B n + 1, C 1, D 2 |
| scipy.constants, n = 2…10 | A and C equal; B (n + 1)×, D 2×; ΔK = 13.6(1 − 1/n²) eV |
| Exact fractions | B ratio 3, 4, 5, 6, 7 for n = 2…6; D ratio 2 |
| n = 3 numbers | \|ΔK\| = 12.09 eV; \|Δλ\| = 6.65 Å (B gives 26.6 Å); ν = 2.92 × 10¹⁵ Hz; (D) gives 24.19 eV |
| Numeric script | `tests/verify_p1phyq05.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq05.js` audits every starting orbit 2…6, the visual gates and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q21 = Physics Q.5): (A), (C) |
| Answer key | official key printed with the paper (page 15; the derivation above does not use it): Q.5 → AC |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates, library and production audits) — 2026-09-30. No human review has been recorded.**
