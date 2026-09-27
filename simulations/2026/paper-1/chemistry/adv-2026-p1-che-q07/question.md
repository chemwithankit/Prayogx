# ADV-2026-P1-CHE-Q07 — O₂ + PtF₆ → O₂⁺[PtF₆]⁻

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 2 — one or more options correct |
| **Question** | Q.7 (MathonGo numbering: Q39) |
| **Type** | Multiple correct MCQ (+4 / partial +3, +2, +1 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 29 |

---

## Question (verbatim)

Reaction of PtF₆ with oxygen (O₂) gas results in the formation of an ionic compound, X⁺Y⁻. Correct statement(s) is(are)

| | |
|---|---|
| (A) | The bond order of X⁺ is 1.5. |
| (B) | Valence *d*-orbitals of the metal ion in X⁺Y⁻ has 5 electrons. |
| (C) | PtF₆ acts as an oxidant in this reaction. |
| (D) | PtF₆ acts as a fluorinating agent in this reaction. |

## Classification

| | |
|---|---|
| Chapter | Chemical Bonding and Molecular Structure |
| Topic | Molecular orbital theory |
| Difficulty | Easy-Moderate |
| Answer | **(B), (C)** |

## Solution

1. **X⁺ and Y⁻:** PtF₆ (electron affinity ≈ 7 eV) takes one electron from O₂ (IE 12.07 eV):
   O₂ + PtF₆ → O₂⁺[PtF₆]⁻. **X⁺ = O₂⁺ (dioxygenyl), Y⁻ = [PtF₆]⁻.**
2. **(A):** O₂⁺ has 15 electrons: σ1s² σ*1s² σ2s² σ*2s² σ2p_z² π2p_x² π2p_y² π*2p_x¹. N_b = 10, N_a = 5, bond order
   = (10 − 5)/2 = **2.5**, not 1.5 (1.5 is superoxide O₂⁻). **False.**
3. **(B):** In [PtF₆]⁻, x + 6(−1) = −1, so Pt is +5. Pt [Xe]4f¹⁴5d⁹6s¹ loses 6s¹ and four 5d electrons → **5d⁵**
   (octahedral, low spin t₂g⁵). **True.**
4. **(C):** Pt goes +6 → +5, so PtF₆ gains an electron and is reduced: it is the **oxidant**. **True.**
5. **(D):** All six F stay on Pt; no O–F bond forms. Only an electron moves, so PtF₆ is not acting as a fluorinating
   agent. **False.**
6. **Answer (B), (C).**

## Bond orders of the O₂ family

| Species | Electrons | Bonding / antibonding | Bond order | Bond length (pm) |
|---|---|---|---|---|
| O₂²⁻ | 18 | 10 / 8 | 1.0 | 149 |
| O₂⁻ | 17 | 10 / 7 | 1.5 | 133 |
| O₂ | 16 | 10 / 6 | 2.0 | 121 |
| **O₂⁺** | **15** | **10 / 5** | **2.5** | **112** |

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | O₂⁺[PtF₆]⁻; BO 2.5; Pt(V) 5d⁵; oxidant, not fluorinating → (B), (C) |
| Mass and charge balance | only the O₂⁺ / [PtF₆]⁻ split keeps F off oxygen |
| MO filling (written separately from the page) | O₂²⁻ 1, O₂⁻ 1.5, O₂ 2, O₂⁺ 2.5, N₂ 3, NO⁺ 3; ordering-independent |
| Hartree–Fock (pyscf UHF/6-31G*) | r: O₂⁺ 1.07 < O₂ 1.17 < O₂⁻ 1.30 Å; Mayer BO 2.26 > 1.83 > 1.38 |
| Oxidation states (sympy) | Pt +6 in PtF₆, +5 in [PtF₆]⁻; 5d⁵ |
| Electron / fluorine ledger | 1 e⁻ from O₂ to Pt; F on Pt 6 → 6, F on O 0 |
| Custom conditions | NO → NO⁺[PtF₆]⁻ (BO 3); N₂ (IE 15.58 eV) and F₂ → no salt |
| Numeric script | `tests/verify_p1q07.py` — 27 / 27 pass |
| Solution website | MathonGo (their Q39): (B), (C) |
| The page | MO filling, Pt electrons and the F audit computed in the page; `tests/sim_p1q07.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q7 → BC |

**Status: verified — 2026-09-27.**
