# ADV-2026-P1-CHE-Q06 — Identify X, Y and Z (Cl₂, NCl₃, ClF₃)

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 2 — one or more options correct |
| **Question** | Q.6 |
| **Type** | Multiple correct MCQ (+4 / partial +3, +2, +1 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 29 |

---

## Question (verbatim)

Correct statement(s) about the compounds X, Y and Z is(are)

```
MnO₂ + Conc. HCl  ──────→  MnCl₂ + X + H₂O
                               (greenish yellow gas)

NH₃ + X           ──────→  Y + HCl
     (excess)

X + F₂            ─573 K→  Z
    (excess)
```

| | |
|---|---|
| (A) | X is used for sterilizing drinking water. |
| (B) | Y has a planar structure. |
| (C) | Z is used in the enrichment of ²³⁵U. |
| (D) | Y is a stronger Lewis base than ammonia. |

## Classification

| | |
|---|---|
| Chapter | The p-Block Elements (Group 17) |
| Topic | Chlorine, nitrogen trichloride and interhalogens — preparation, structure and uses |
| Difficulty | Easy-Moderate |
| Answer | **(A), (C)** |

## Identities

| Unknown | Reaction | Identity | Shape |
|---|---|---|---|
| X | MnO₂ + 4HCl → MnCl₂ + Cl₂ + 2H₂O | Cl₂ (greenish-yellow gas) | linear (diatomic) |
| Y | NH₃ + 3Cl₂ (excess) → NCl₃ + 3HCl | NCl₃ | trigonal pyramidal (3 bp + 1 lp) |
| Z | Cl₂ + 3F₂ (excess) → 2ClF₃, 573 K | ClF₃ | T-shaped (3 bp + 2 lp) |

## Solution

1. **X:** MnO₂ oxidises chloride from concentrated HCl. The atom balance MnO₂ + 4HCl → MnCl₂ + X + 2H₂O leaves exactly
   two Cl atoms for X, and the only greenish-yellow gas is chlorine: **X = Cl₂**. Chlorine is used to sterilise drinking
   water. **(A) true.**
2. **Y:** with chlorine in excess every N–H of ammonia is replaced (NH₃ → NH₂Cl → NHCl₂ → NCl₃): **Y = NCl₃**.
   N has 3 bond pairs and 1 lone pair, so the four pairs are tetrahedral and the molecule is trigonal pyramidal
   (N about 0.65 Å above the Cl₃ plane). **(B) false.**
3. Cl (χ 3.16) is more electronegative than N (3.04) and pulls electron density away from it; H (2.20) does the
   opposite. The lone pair on N is less available in NCl₃, so NCl₃ is a **weaker** Lewis base than NH₃. **(D) false.**
4. **Z:** Cl₂ + 3F₂ (excess) → 2ClF₃ at 573 K: **Z = ClF₃**, 3 bond pairs + 2 equatorial lone pairs → T-shaped.
   ClF₃ fluorinates uranium to UF₆ (U + 3ClF₃ → UF₆ + 3ClF), the volatile compound used to enrich ²³⁵U. **(C) true.**
5. **Answer (A), (C).**

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | X = Cl₂, Y = NCl₃, Z = ClF₃ → (A), (C) |
| Element conservation (sympy) | X has no Mn, O, H and two Cl; a = 4, b = 2 |
| Equations | all ten used on the page balance |
| VSEPR | NCl₃ trigonal pyramidal; ClF₃ T-shaped; NH₃ trigonal pyramidal |
| Geometry | measured d(N–Cl) 1.759 Å, ∠ 107.1° → N 0.65 Å out of plane; RDKit embedding agrees |
| Basicity | HF/6-31G* proton affinity NH₃ 909 > NCl₃ 744 kJ/mol; N charge −1.02 vs −0.58 |
| Uses | NCERT: Cl₂ sterilises drinking water; ClF₃ → UF₆ for ²³⁵U enrichment |
| Custom conditions | KMnO₄ → same answer; excess NH₃ → N₂ + NH₄Cl; 1 : 1 F₂ or 473 K → ClF; 298 K → no Z |
| Numeric script | `tests/verify_p1q06.py` — 37 / 37 pass |
| Solution website | MathonGo (their Q38): (A), (C) |
| The page | compounds identified and statements evaluated at run time; `tests/sim_p1q06.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q6 → AC |

**Status: verified — 2026-09-27.**
