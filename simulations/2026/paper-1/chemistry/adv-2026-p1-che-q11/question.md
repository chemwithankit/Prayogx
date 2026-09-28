# ADV-2026-P1-CHE-Q11 — Carbonyl groups in X and Y

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 3 — numerical value |
| **Question** | Q.11 (MathonGo numbering: Q43) |
| **Type** | Numerical value (+4 / 0) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 31 |

---

## Question (verbatim)

The sum of total number of carbonyl groups ( >C=O ) present in the major products **X** and **Y** in the following reactions is ____.

```
(1)  H3C–CH(CO2H)–C(=O)–CH(CO2H)–CH3      --heat-->  X
(2)  cyclopentan-1-one bearing CO2H on C3 and C4,
     both on wedged ring bonds (cis)          --heat-->  Y
```

## Classification

| | |
|---|---|
| Chapter | Aldehydes, Ketones and Carboxylic Acids |
| Topic | Carboxylic acids on heating — decarboxylation of β-keto acids and cyclic anhydrides from cis-1,2-diacids |
| Difficulty | Easy-Moderate |
| Answer | **4** |

## Solution

1. Reactant 1 (2,4-dimethyl-3-oxopentanedioic acid) is a double **β-keto acid**. On heating each CO₂H leaves as CO₂ through a
   six-membered cyclic transition state (O–H → C=O of CO₂; C–CO₂H → C=C; ketone π → O–H), giving an enol that tautomerises to the ketone.
   Twice: **X = pentan-3-one**, C₅H₁₀O — **1 C=O**.
2. Reactant 2 has its CO₂H groups on C3 and C4 — **not** β to the ketone, so no CO₂ is lost. The two acids are 1,2 and **cis**
   (the wedged ring bonds), so on heating one OH oxygen attacks the other C=O carbon (tetrahedral intermediate), a proton moves to the
   leaving OH, and water leaves: **Y = the cis-fused cyclic anhydride**, C₇H₆O₄ — ketone + 2 anhydride C=O = **3 C=O**.
3. Sum = 1 + 3 = **4**.

Traps: one decarboxylation only (5); counting the CO₂ as part of X (8); letting Y lose CO₂ or letting the water "take a C=O" (undercount).
A trans diacid would not close the ring, but it would still hold 3 C=O — the sum would still be 4.

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | X 1 C=O, Y 3 C=O → 4 |
| The drawing (wedged ring bonds → RDKit, 3-D) | both CO₂H on the same face: cis |
| RDKit templates | 2 × decarboxylation → pentan-3-one; dehydration → cis-fused anhydride; no template fires on the wrong reactant |
| SMARTS count and atom balance | 1 and 3 C=O; C₇H₁₀O₅ → C₅H₁₀O + 2 CO₂; C₇H₈O₅ → C₇H₆O₄ + H₂O |
| MMFF | trans-fused anhydride ≈ 17 kcal/mol above cis |
| Custom conditions | no methyls → acetone (4); γ-keto acid → 6; trans → no anhydride, still 4; no heat → 6 |
| Numeric script | `tests/verify_p1q11.py` — 25 / 25 pass |
| Solution website | MathonGo (their Q43): 4 |
| The page | every intermediate and product made by pushing the arrows on molecule graphs; valence and charge checked each step; `tests/sim_p1q11.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q11 → 4 |

**Status: verified — 2026-09-27.**
