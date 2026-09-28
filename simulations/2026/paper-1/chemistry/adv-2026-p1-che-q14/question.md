# ADV-2026-P1-CHE-Q14 — VSEPR shapes of eight species

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 4 — matching list set |
| **Question** | Q.14 (MathonGo numbering: Q46) |
| **Type** | Single correct option (+4 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 33 |

---

## Question (verbatim)

Consider the following species:

SOCl₂, XeOF₄, ClF₃, ClF₅, XeF₅⁺, SO₃²⁻, XeF₃⁺, SF₄

List-I contains different molecular shapes and List-II contains total number of species with the same molecular shapes from the given species.
Match each entry in List-I with the appropriate entry in List-II and choose the correct option.

| List-I | List-II |
|---|---|
| (P) See-saw | (1) one |
| (Q) T-Shaped | (2) two |
| (R) Trigonal Planar | (3) three |
| (S) Square Pyramidal | (4) four |
| | (5) zero |

(A) P → 1; Q → 2; R → 5; S → 3 &nbsp; (B) P → 5; Q → 4; R → 2; S → 3 &nbsp; (C) P → 3; Q → 2; R → 1; S → 4 &nbsp; (D) P → 1; Q → 3; R → 5; S → 4

## Classification

| | |
|---|---|
| Chapter | Chemical Bonding and Molecular Structure |
| Topic | VSEPR theory — lone pairs, steric number and molecular shapes |
| Difficulty | Moderate |
| Answer | **(A)** |

## Solution

| Species | LP = (V − bonds − charge)/2 | SN | Shape |
|---|---|---|---|
| SOCl₂ | (6 − 4 − 0)/2 = 1 | 4 | trigonal pyramidal |
| XeOF₄ | (8 − 6 − 0)/2 = 1 | 6 | square pyramidal |
| ClF₃ | (7 − 3 − 0)/2 = 2 | 5 | T-shaped |
| ClF₅ | (7 − 5 − 0)/2 = 1 | 6 | square pyramidal |
| XeF₅⁺ | (8 − 5 − 1)/2 = 1 | 6 | square pyramidal |
| SO₃²⁻ | (6 − 6 + 2)/2 = 1 | 4 | trigonal pyramidal |
| XeF₃⁺ | (8 − 3 − 1)/2 = 2 | 5 | T-shaped |
| SF₄ | (6 − 4 − 0)/2 = 1 | 5 | see-saw |

See-saw 1 → (1); T-shaped 2 → (2); trigonal planar 0 → (5); square pyramidal 3 → (3). **P → 1, Q → 2, R → 5, S → 3: (A).**

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | 1, 2, 0, 3 → A |
| Lone pairs two ways | central-atom rule = Lewis-structure count for all eight |
| Second repulsion model (scipy, 1/r⁸) | same eight shapes as the AXₙEₘ table and the page |
| Controls | SO₃ planar, XeF₄ square planar, SF₆ octahedral |
| Numeric script | `tests/verify_p1q14.py` — 30 / 30 pass |
| Solution website | MathonGo (their Q46): A |
| The page | counts, relaxation, shapes and option computed at run time; `tests/sim_p1q14.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q14 → A |

**Status: verified — 2026-09-28.**
