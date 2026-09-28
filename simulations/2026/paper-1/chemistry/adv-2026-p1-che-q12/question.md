# ADV-2026-P1-CHE-Q12 — Collinear carbons in X

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 3 — numerical value |
| **Question** | Q.12 (MathonGo numbering: Q44) |
| **Type** | Numerical value (+4 / 0) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 31 |

---

## Question (verbatim)

Treatment of buta-1,3-diyne with NaNH₂ (2 equivalents), followed by reaction with excess of *trans*-CH₃-CH=CH-CH₂-Br gives **X** as the
major product. The maximum number of carbon atoms that are collinear (in a straight line) in **X** is ____.

## Classification

| | |
|---|---|
| Chapter | Hydrocarbons |
| Topic | Alkynes — acidity of terminal alkynes, acetylide SN2 alkylation and linear sp geometry |
| Difficulty | Easy-Moderate |
| Answer | **6** |

## Solution

1. The terminal sp C–H bonds of buta-1,3-diyne are acidic (pKa ≈ 25; NH₃ ≈ 38). Two equivalents of NaNH₂ remove both protons:
   HC≡C–C≡CH + 2 NH₂⁻ → ⁻C≡C–C≡C⁻ + 2 NH₃.
2. Each acetylide attacks the CH₂ of *trans*-crotyl bromide (primary, allylic) by SN2 — backside attack, Br⁻ leaves as NaBr.
   With excess bromide both ends react: **X = CH₃CH=CHCH₂–C≡C–C≡C–CH₂CH=CHCH₃** (C₁₂H₁₄, the *E* geometry kept).
3. Hybridisation along the chain: sp³, sp², sp², **sp³, sp, sp, sp, sp, sp³**, sp², sp², sp³. Each sp carbon holds its two σ-neighbours
   at 180°, so C4–C5≡C6–C7≡C8–C9 are on one straight line. At the CH₂ (sp³, 109.5°) the chain turns off the axis.
4. Maximum collinear carbons = 4 (sp) + 2 (CH₂) = **6**.

Traps: counting only the sp carbons (4); letting the line run on past the CH₂ (8); the *trans* C=C is not linear (120°).

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | X = C₁₂H₁₄; 6 collinear carbons |
| RDKit templates | 2 × deprotonation, 2 × SN2 → X with *E,E* kept; templates do not fire where they must not |
| RDKit hybridisation | 4 sp, 4 sp², 4 sp³ |
| MMFF 3-D (20 conformers) | 6 carbons within 0.10 Å of one line in every conformer; next carbon 1.4 Å off |
| Custom conditions | hexatriyne 8; ethyne 4; 1 eq 5; allyl or propargyl bromide 6 |
| Numeric script | `tests/verify_p1q12.py` — 26 / 26 pass |
| Solution website | MathonGo (their Q44): 6 |
| The page | every intermediate and product made by pushing the arrows on molecule graphs; valence and charge checked each step; the line counted by rule and on a geometric model; `tests/sim_p1q12.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q12 → 6 |

**Status: verified — 2026-09-28.**
