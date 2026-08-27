# ADV-2026-P2-CHE-Q04

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.4 (Section 1 — single correct MCQ, +3 / 0 / −1)
**Source:** `papers/adv_2026_paper_2.pdf`, page 22

---

## Question (verbatim)

A known artificial sweetener **X** is composed of 4-chloro-4-deoxy-α-D-galactose and
1,6-dichloro-1,6-dideoxy-β-D-fructose joined by a glycosidic linkage. Structure of D-galactose is given
below:

```
        CHO
   H ---+--- OH        C2   OH right
  HO ---+--- H         C3   OH left
  HO ---+--- H         C4   OH left
   H ---+--- OH        C5   OH right
       CH2OH
     = D-galactose
```

The correct structure of **X** is

The four printed options are structures. All four draw the pyranose anomeric oxygen **down (α)**; they
differ in exactly two places:

| Option | C4 chlorine on the pyranose | Fructofuranose anomeric centre |
|---|---|---|
| **(A)** | **axial / up — *galacto*** | **β — C1′ CH₂Cl up** |
| (B) | equatorial / down — *gluco* | β — C1′ CH₂Cl up |
| (C) | equatorial / down — *gluco* | α — C1′ CH₂Cl down |
| (D) | axial / up — *galacto* | α — C1′ CH₂Cl down |

**Answer: (A)** — X is **sucralose**, C₁₂H₁₉Cl₃O₈.

---

## Classification

| Field | Value |
|---|---|
| Chapter | Biomolecules |
| Topic | Carbohydrates — structure and glycosidic linkages |
| Subtopics | Fischer and Haworth projections; anomers and the α/β convention; epimers (glucose vs galactose); pyranose and furanose rings; glycosidic linkage in a non-reducing disaccharide; deoxy-halo sugars; artificial sweeteners |
| Concepts | Reading a Fischer projection; the C4 epimeric relationship; anomeric configuration; stereoisomers with identical formulae |
| Difficulty | Moderate |

## Rules used

```
Fischer -> Haworth (D-sugar):  right -> DOWN,  left -> UP,  C6 -> UP
alpha-D-anomer: anomeric substituent DOWN;  beta-D-anomer: UP
galactose = glucose epimeric at C4  (C4-OH axial rather than equatorial)
glycoside = anomeric C-O-R; a 1<->2' link joins both anomeric carbons -> non-reducing disaccharide
deoxy-halo sugar: -OH replaced by -Cl (at C4 here, with inversion)
```

---

## Solution

**Step 1 — recognise the compound.** 4-chloro-4-deoxy-α-D-galactopyranose joined to
1,6-dichloro-1,6-dideoxy-β-D-fructofuranose is **sucralose**, C₁₂H₁₉Cl₃O₈. The question's wording is the
IUPAC name of sucralose read clause for clause.

**Step 2 — read the Fischer projection.** OH is on the right at C2 and C5, on the left at C3 and C4.
Converting (right → down, left → up, C6 up):

| Carbon | Fischer | Haworth |
|---|---|---|
| C2 | right | down |
| C3 | left | up |
| **C4** | **left** | **up (axial)** |
| C6 | — | up |

That axial C4 is the *only* thing distinguishing galactose from glucose, so **the C4 chlorine must point
up**. This eliminates (B) and (C).

**Step 3 — the pyranose anomeric centre.** "α-D-galactose" puts the glycosidic oxygen **down**. All four
printed options draw this correctly, so it eliminates nothing — but getting it wrong would not give
sucralose.

**Step 4 — the fructose anomeric centre.** "β-D-fructofuranose" fixes C2′: in the orientation the paper
uses, the C1′ CH₂Cl points **up** and the glycosidic oxygen down. Options (C) and (D) draw the CH₂Cl down —
the α anomer — so they go.

**Step 5 — intersect.**

```
C4 axial => {A, D}     n     fructose beta => {A, B}     =     {A}
```

**Answer: (A).**

---

## Verification log

| Check | Result |
|---|---|
| Reference structure | sucralose, InChIKey `BAQAVOSOZGMPRM-QBMZZYIRSA-N`, SMILES `OC[C@H]1O[C@H](O[C@]2(CCl)O[C@H](CCl)[C@@H](O)[C@@H]2O)[C@H](O)[C@@H](O)[C@H]1Cl` |
| Galactose half rebuilt from the drawn Haworth as explicit 3D coordinates, configuration assigned by RDKit | axial-C4 build → `CO[C@H]1O[C@H](CO)[C@H](Cl)[C@H](O)[C@H]1O` = the reference's galactose half ✓; equatorial build differs at exactly one centre ✗ |
| Fructose half, same method | CH₂Cl-up build → `CO[C@]1(CCl)O[C@H](CCl)[C@@H](O)[C@@H]1O` = the reference's fructose half ✓; CH₂Cl-down build is its C2′ epimer ✗ |
| Name cross-check | "1,6-dichloro-1,6-dideoxy-β-D-fructofuranosyl 4-chloro-4-deoxy-α-D-galactopyranoside" matches the question's wording |
| Formula | C₁₂H₁₉Cl₃O₈, M = 397.6; all four options share it, so the question is purely stereochemical |
| Redundant chemical argument | sucralose is made from sucrose (gluco); C4 chlorination proceeds with inversion → galacto. Predicts the axial Cl without using the Fischer projection ✓ |
| Distractor audit | (B) fails C4 only; (D) fails the fructose anomer only; (C) fails both — each is a single believable slip |
| Simulation run headless: builder, all three toggles, elimination matrix, Fischer stepper | identifies (A) as sucralose and names (B)/(C)/(D) correctly; zero console errors ✓ |

Note: no official answer key was retrievable at the time of writing, so the answer rests on the
structural verification above rather than on a published key.

**Status: verified — 2026-08-26.**
