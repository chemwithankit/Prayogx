# ADV-2026-P1-CHE-Q15 — Ozonolysis then intramolecular aldol

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 4 — matching list set |
| **Question** | Q.15 (MathonGo numbering: Q47) |
| **Type** | Single correct option (+4 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 34 |

---

## Question (verbatim)

The **List-II** contains products obtained from the reaction of compounds in **List-I** with O₃/Zn-H₂O followed by cyclization (via more stable enolate)
in the presence of aqueous NaOH. Match each entry in **List-I** with appropriate entry in **List-II** and choose the correct option.

List-I (structures, as SMILES): (P) `CC1CCCC2=C1CCCC2C` · (Q) `CC1CCCCC2=C1CCC2C` · (R) `CC1CCCC(C)C2=C1CCC2` · (S) `CC1CCC(C)C2=C1CCCC2`

List-II: (1) `CC12CCCCC1(O)C(C)CCC2=O` · (2) `CC12CCCC1(O)C(C)CCCC2=O` · (3) `CC12CCC(C)C1(O)CCCCC2=O` · (4) `CC1CCCC2(C)CCCC(=O)C12O` · (5) `CC1CCCC2(C)C(=O)CCCC12O`

(A) P ⟶ 2; Q ⟶ 4; R ⟶ 1; S ⟶ 3 &nbsp; (B) P ⟶ 3; Q ⟶ 4; R ⟶ 5; S ⟶ 2 &nbsp; (C) P ⟶ 2; Q ⟶ 1; R ⟶ 5; S ⟶ 3 &nbsp; (D) P ⟶ 3; Q ⟶ 5; R ⟶ 4; S ⟶ 2

## Classification

| | |
|---|---|
| Chapter | Aldehydes, Ketones and Carboxylic Acids |
| Topic | Reductive ozonolysis of cyclic alkenes and intramolecular aldol cyclization via the more stable enolate |
| Difficulty | Difficult |
| Answer | **(C)** |

## Solution

1. **Ozonolysis** (Criegee): O₃ adds across the ring-fusion C=C (molozonide), the molozonide splits into a ketone and a carbonyl oxide, these recombine
   to the secondary ozonide; Zn/H₂O cuts the O–O bond and releases two ketones. Both rings open into one ten-membered ring:
   6-6 alkenes (P, S) → cyclodecane-1,6-dione; 7-5 alkenes (Q, R) → cyclodecane-1,5-dione.
2. **Enolate:** OH⁻ removes the α-H from the CH that carries CH₃ (the more substituted, more stable enolate), provided the ring it will close has ≥ 5 atoms.
3. **Aldol:** the enolate carbon attacks the other C=O across the ring; protonation gives the β-hydroxy ketone.
   - P (1,6-dione): new rings 5 + 7 → **(2)**
   - Q (1,5-dione): the 7-ring-side CH(CH₃) closes 6 + 6 (the 5-ring-side one would need a 4-ring) → **(1)**
   - R (1,5-dione): 6 + 6 → **(5)**
   - S (1,6-dione): 5 + 7 → **(3)**
4. P → 2, Q → 1, R → 5, S → 3: **(C)**.

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | P2 Q1 R5 S3 → C |
| RDKit templates (ozonolysis + every aldol) | same four products; canonical SMILES = List-II (2), (1), (5), (3) |
| Arrow-pushing (Python, 8 steps each) | every intermediate valid, charge kept, same products |
| Controls | kinetic enolate → no option; no base → dione only; (4) from no alkene |
| Numeric script | `tests/verify_p1q15.py` — 27 / 27 pass |
| Solution website | MathonGo (their Q47): C |
| The page | mechanism pushed, enolate chosen and products matched at run time; `tests/sim_p1q15.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q15 → C |

**Status: verified — 2026-09-28.**
