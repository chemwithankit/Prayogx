# ADV-2026-P1-CHE-Q04 — spiro lactones from LiBH₄ and BH₃: identical or diastereomers?

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 1 — single correct option |
| **Question** | Q.4 |
| **Type** | Single correct MCQ (+3 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 27 |

---

## Question (verbatim)

Considering LiBH₄ reduces an ester group to the corresponding alcohol and does not reduce a carboxylic
acid group, the correct statement about the major products **P**, **Q**, **R** and **S** is

*Scheme (image in the paper, described):*

- **Top substrate** — a cyclobutane whose C1 carries CH₂CO₂Et on a **wedge** and CH₂CO₂H on a **hash**;
  the ring carbon **next to** C1 carries CH₃ on a **wedge**.
  **P** ← 1. LiBH₄, 2. H⁺ — substrate — 1. BH₃, 2. H⁺ → **Q**
- **Bottom substrate** — the same C1 arms (CH₂CO₂Et wedge, CH₂CO₂H hash); the ring carbon **across** the
  ring from C1 carries CH₃ on a **wedge**.
  **R** ← 1. LiBH₄, 2. H⁺ — substrate — 1. BH₃, 2. H⁺ → **S**

| | |
|---|---|
| (A) | **P** & **Q** are identical, and **R** & **S** are diastereomers. |
| (B) | **P** & **Q** are diastereomers, and **R** & **S** are identical. |
| (C) | **P** & **Q** are diastereomers, and **R** & **S** are diastereomers. |
| (D) | **P** & **Q** are identical, and **R** & **S** are identical. |

## Classification

| | |
|---|---|
| Chapter | Organic Chemistry - Some Basic Principles and Techniques |
| Topic | Stereoisomerism — diastereomers from chemoselective reduction and lactonisation |
| Difficulty | Moderate-Hard |
| Answer | **(C)** P & Q diastereomers, R & S diastereomers |

## Rules

```
LiBH4 :  R-CO2Et -> R-CH2OH        R-CO2H untouched   (given)
BH3   :  R-CO2H  -> R-CH2OH        R-CO2Et untouched
H+    :  HO-CH2CH2-C1-CH2-C(=O)X -> six-membered spiro delta-lactone  (X = OH: -H2O;  X = OEt: -EtOH)
identical    : some rotation superimposes the two
enantiomers  : the mirror image of one superimposes on the other
diastereomers: stereoisomers that are neither
```

## Products

| | Route | Ring O from | C=O from | SMILES | CIP |
|---|---|---|---|---|---|
| **P** | LiBH₄, H⁺ | wedge arm | hash arm | `C[C@@H]1CC[C@]12CCOC(=O)C2` | CH₃-C *R*, spiro *R* |
| **Q** | BH₃, H⁺ | hash arm | wedge arm | `C[C@@H]1CC[C@@]12CCOC(=O)C2` | CH₃-C *R*, spiro *S* |
| **R** | LiBH₄, H⁺ | wedge arm | hash arm | `C[C@H]1C[C@@]2(CCOC(=O)C2)C1` | *r*, *r* (achiral) |
| **S** | BH₃, H⁺ | hash arm | wedge arm | `C[C@H]1C[C@]2(CCOC(=O)C2)C1` | *s*, *s* (achiral) |

## Solution

1. **Different arms are reduced.** LiBH₄ reduces the ester (wedge) arm; BH₃ reduces the acid (hash) arm.
2. **H⁺ closes a δ-lactone.** HO–CH₂–CH₂–C1–CH₂–C(=O) is a six-membered ring, so each hydroxy acid / hydroxy
   ester cyclises to a spiro δ-lactone, C₉H₁₄O₂. P, Q (and R, S) share one constitution.
3. **Opposite directions.** In P/R the ring O is on the wedge face and the C=O branch on the hash face; in Q/S
   the reverse. The spiro carbon is therefore inverted; the CH₃ carbon is not touched.
4. **Top pair.** Two stereocentres, one inverted → **P & Q are diastereomers** (both chiral).
5. **Bottom pair.** CH₃ across the ring: a mirror plane makes R and S achiral; they are **cis/trans
   diastereomers**.
6. **Options.** (A), (B) and (D) each call a pair identical — true only if that substrate had no CH₃. **(C).**

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | opposite arms reduced → lactone closes both ways → spiro C inverted → (C) |
| RDKit from the drawing (2D coordinates + wedges) | substrates' stereocentres assigned by RDKit, not by hand |
| Reaction templates + canonical SMILES | P ≠ Q, Q ≠ mirror P; R ≠ S, R and S each self-mirror → both pairs diastereomers |
| CIP | P (R, R), Q (R, S); R (r, r), S (s, s) |
| Enumeration | 4 stereoisomers (top constitution), P and Q in different enantiomer pairs; 2 (bottom) = R, S |
| 3D, 20 MMFF conformers each | P/P 0.000 Å; P/Q 1.27 Å; P/mirror Q 0.41 Å; R/S 0.30 Å |
| Control | no CH₃ → both routes give the same lactone |
| Numeric script | `tests/verify_p1q04.py` — 27 / 27 pass, answer (C) |
| The page | Horn least-squares overlay and mirror test; option matched at run time; `tests/sim_p1q04.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q4 → C |

**Status: verified — 2026-09-25.**
