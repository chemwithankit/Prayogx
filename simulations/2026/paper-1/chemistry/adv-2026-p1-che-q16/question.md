# ADV-2026-P1-CHE-Q16 — Oximes of 2-bromo-5-nitroaryl carbonyls: SNAr, Kemp elimination, nitriles

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 4 — matching list set |
| **Question** | Q.16 (MathonGo numbering: Q48) |
| **Type** | Single correct option (+4 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 35 |

---

## Question (verbatim)

Q.16 Match the major products obtained in the reactions given in **List-I** with the corresponding structures in **List-II** and choose the correct option.

List-I (structures, as SMILES; `/` `\` give the C=N geometry exactly as drawn):

- (P) `Brc1ccc([N+](=O)[O-])cc1/C=N\O` — aqueous NaOH
- (Q) `Brc1ccc([N+](=O)[O-])cc1/C=N\O` — 1. (CH₃CO)₂O 2. Na₂CO₃
- (R) `Brc1ccc([N+](=O)[O-])cc1/C(C)=N\O` — aqueous NaOH
- (S) `Brc1ccc([N+](=O)[O-])cc1/C(C)=N/OC(C)=O` — aqueous Na₂CO₃

List-II: (1) `N#Cc1cc([N+](=O)[O-])ccc1O` · (2) `N#Cc1cc([N+](=O)[O-])ccc1Br` · (3) `CC(=O)Nc1cc([N+](=O)[O-])ccc1Br` ·
(4) `Cc1noc2ccc([N+](=O)[O-])cc12` · (5) `Brc1ccc([N+](=O)[O-])cc1/C(C)=N/O`

(A) P → 2; Q ⟶ 1; R → 5; S ⟶ 4 &nbsp; (B) P → 1; Q ⟶ 2; R → 4; S ⟶ 5 &nbsp; (C) P → 1; Q ⟶ 2; R → 3; S ⟶ 4 &nbsp; (D) P → 2; Q ⟶ 1; R → 3; S ⟶ 5

The structures are printed as drawings; the SMILES above were transcribed from page 35 and are drawn on the page from the lab's molecule graphs.
In P, Q and R the oxime O is drawn on the ring's side of C=N (Z); in S the O-acetyl group is drawn away from the ring (E), and (5) is the E oxime.

## Classification

| | |
|---|---|
| Chapter | Aldehydes, Ketones and Carboxylic Acids |
| Topic | Reactions of oximes — intramolecular nucleophilic aromatic substitution, Kemp elimination and dehydration of O-acyl aldoximes to nitriles |
| Also | Haloarenes (SNAr, NO₂ activation) · E/Z isomerism of C=N · Beckmann rearrangement (distractor) |
| Difficulty | Difficult |
| Answer | **(B)** |

## Solution

1. **Geometry decides reach.** C=N does not rotate; only the C1–C7 single bond turns. In the Z oximes (P, Q, R) the oxime O can swing
   within contact of C2, the carbon carrying Br (below the 3.22 Å C + O contact in a rigid-rotation model, meaning the
   atoms can meet); in the E isomer (S) it is never nearer than 4.2 Å.
2. **P (aqueous NaOH):** OH⁻ removes the oxime O–H; the oximate O⁻ attacks C2 (intramolecular SNAr — the para-NO₂ takes the Meisenheimer
   charge); Br⁻ leaves → 5-nitro-1,2-benzisoxazole. C3 carries H, so OH⁻ removes it as the N–O bond breaks (Kemp elimination) →
   2-cyano-4-nitrophenoxide (yellow); work-up → 2-hydroxy-5-nitrobenzonitrile **(1)**.
3. **Q (Ac₂O, then Na₂CO₃):** the O–H is acetylated, so there is no nucleophile; the C7–H is anti to N–OAc and carbonate removes it
   (anti E2) → 2-bromo-5-nitrobenzonitrile **(2)**; the C–Br bond is never involved.
4. **R (aqueous NaOH):** as P up to the ring closure → 3-methyl-5-nitro-1,2-benzisoxazole; no H on C3, so no Kemp elimination **(4)**.
5. **S (aqueous Na₂CO₃):** no C–H on C7 and the O points away from the ring; hydroxide cleaves only the ester (acyl–O bond), the C=N keeps
   its E geometry, and the E oximate cannot reach C2 → the E ketoxime **(5)**.
6. P → 1, Q → 2, R → 4, S → 5: **(B)**. (3) is the Beckmann amide of the E ketoxime — it needs acid, not base.

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | P1 Q2 R4 S5 → B |
| RDKit structure edits (SNAr, Kemp, acetylation, anti E2, hydrolysis) | products = List-II (1), (2), (4), (5) by isomeric canonical SMILES |
| Geometry (ETKDG + MMFF, rigid torsion scan) | rigid torsion scan: Z O comes within the 3.22 Å contact of C2; E never below 4.25 Å |
| Activation (RDKit resonance enumeration) | para-NO₂ carries the Meisenheimer charge; meta control cannot |
| Arrow-pushing ledger (independent of the page) | every intermediate valid, charge conserved |
| Controls | E aldoxime + NaOH: no reaction · meta-NO₂: no cyclisation · Z O-acetyl ketoxime → (4) · Beckmann of E ketoxime → (3), of Z → N-methyl amide |
| Numeric script | `tests/verify_p1q16.py` — 36 / 36 pass |
| The page | engine run in Node by the verifier: same matches and option; `tests/sim_p1q16.js` drives the whole page and the app shell |
| Solution website | MathonGo — not consulted (Claude Code access is an open decision in `docs/DECISIONS.md`) |
| Answer key (checked afterwards) | official final key printed with the paper: Q16 → B |

**Status: verified (scripts, independent derivation and the official key) — 2026-09-28. Not yet reviewed by the owner.**
