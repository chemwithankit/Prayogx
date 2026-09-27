# ADV-2026-P1-CHE-Q08 — From sodium butanoate to Q, R, S and T

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 2 — one or more options correct |
| **Question** | Q.8 (MathonGo numbering: Q40) |
| **Type** | Multiple correct MCQ (+4 / partial +3, +2, +1 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 30 |

---

## Question (verbatim)

In the following reaction sequence, **Q**, **R**, **S** and **T** are the major products.

```
CH3CH2CH2COONa --(1. Kolbe's electrolysis; 2. V2O5, 500 °C, 10-20 atm)--> Q
Q --(phthalic anhydride, anhyd. AlCl3)--> R
R --(1. PCl5; 2. H2-Pd/BaSO4)--> S
S --(NH2NH2, heat)--> T
```

The correct statement(s) about **Q**, **R**, **S** and **T** is(are)

| | |
|---|---|
| (A) | **S** on warming with ammoniacal AgNO₃ results in the formation of silver mirror. |
| (B) | **Q** on treatment with Cl₂(excess)/UV gives gammaxane. |
| (C) | **T** is a heterocyclic compound. |
| (D) | **R** on acid catalyzed intramolecular cyclization followed by treatment with Zn-Hg/HCl gives 9,10-dihydroxyanthracene. |

## Classification

| | |
|---|---|
| Chapter | Aldehydes, Ketones and Carboxylic Acids |
| Topic | Reaction sequence — Kolbe electrolysis, Friedel–Crafts acylation, Rosenmund reduction, Tollens test and hydrazine ring closure |
| Difficulty | Moderate |
| Answer | **(A), (B), (C)** |

## Identities

| | Compound | Formula | Made by |
|---|---|---|---|
| Q | benzene | C₆H₆ | Kolbe → n-hexane; V₂O₅, 500 °C → aromatisation (−4H₂) |
| R | 2-benzoylbenzoic acid | C₁₄H₁₀O₃ | Friedel–Crafts acylation with phthalic anhydride |
| S | 2-benzoylbenzaldehyde | C₁₄H₁₀O₂ | PCl₅ → acid chloride; H₂-Pd/BaSO₄ (Rosenmund) |
| T | 1-phenylphthalazine | C₁₄H₁₀N₂ | NH₂NH₂ condenses with both C=O (−2H₂O) |

## Solution

1. **Q:** 2 CH₃CH₂CH₂COO⁻ → CH₃(CH₂)₄CH₃ + 2CO₂ + 2e⁻; n-hexane over V₂O₅ at 500 °C → benzene + 4H₂.
   With excess Cl₂ under UV, benzene adds 3Cl₂ → C₆H₆Cl₆ (BHC), whose γ-isomer is gammaxane. **(B) true.**
2. **R:** benzene + phthalic anhydride (AlCl₃) → 2-benzoylbenzoic acid. Acid-catalysed cyclisation → anthraquinone;
   Clemmensen (Zn-Hg/HCl) converts both C=O to CH₂ → 9,10-dihydroanthracene (C₁₄H₁₂), not 9,10-dihydroxyanthracene
   (C₁₄H₁₀O₂). **(D) false.**
3. **S:** PCl₅ gives the acid chloride; the poisoned Rosenmund catalyst stops at the aldehyde, 2-benzoylbenzaldehyde. An
   aldehyde reduces Tollens' reagent to a silver mirror. **(A) true.**
4. **T:** the aldehyde and ketone of S are 1,4-related; hydrazine condenses with both to close a six-membered ring containing
   N–N: 1-phenylphthalazine, a heterocycle. **(C) true.**
5. **Answer (A), (B), (C).**

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | Q benzene, R keto acid, S keto aldehyde, T phthalazine → (A), (B), (C) |
| Element and charge balance | every step balances |
| RDKit reaction templates | Kolbe coupling, Friedel–Crafts, cyclisation, Clemmensen, PCl₅, Rosenmund generate the named products |
| Functional-group SMARTS | only S has CHO; T has 2 ring N; Clemmensen product has no O |
| Custom conditions | propanoate → n-butane (no Q); Pd/C → alcohol + hydrazone (only (B)) |
| Numeric script | `tests/verify_p1q08.py` — 24 / 24 pass |
| Solution website | MathonGo (their Q40): (A), (B), (C) |
| The page | structures from bond lists, formulas and groups counted in the page; `tests/sim_p1q08.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q8 → ABC |

**Status: verified — 2026-09-27.**
