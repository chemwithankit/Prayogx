# ADV-2026-P1-CHE-Q10 — Isomers of square planar K[M(NCS)(NO₂)(gly)]

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 3 — numerical value |
| **Question** | Q.10 (MathonGo numbering: Q42) |
| **Type** | Numerical value (+4 / 0) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 31 |

---

## Question (verbatim)

The total number of all possible isomers for the square planar complex with formula K[M(NCS)(NO₂)(gly)] is ____.

(M = metal ion and gly = NH₂CH₂COO⁻ )

## Classification

| | |
|---|---|
| Chapter | Coordination Compounds |
| Topic | Isomerism in coordination compounds — linkage, geometrical and optical isomers of a square planar complex |
| Difficulty | Moderate |
| Answer | **8** |

## Solution

1. K⁺ is a counter-ion. In [M(NCS)(NO₂)(gly)]⁻: x − 1 − 1 − 1 = −1, so M is +2; donor atoms 1 + 1 + 2 = 4 (square planar, as given).
2. **Linkage:** NCS⁻ binds through N or S; NO₂⁻ through N (nitro) or O (nitrito) → 2 × 2 = **4** donor-atom sets.
3. **Geometrical:** glycinate is an unsymmetrical (N, O) chelate and spans two cis corners. For [M(AB)cd] the other two ligands
   sit with c trans to A (d trans to B) or c trans to B (d trans to A) → **2** isomers per set.
4. **Optical:** a square planar complex lies in its own mirror plane — **no** optical isomers.
5. Total = 4 × 2 = **8**.

Traps: 4 + 2 = 6 (adding); 16 (doubling for mirror images); 2 (forgetting linkage isomerism); 4 (treating glycinate as symmetrical).
On a tetrahedron the same ligands would also give 8, but as 4 pairs of enantiomers.

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | 2 × 2 × 2, no optical isomers → 8 |
| Brute force (64 seatings, 8 symmetry operations of a square) | 8 isomers, 2 per linkage set |
| Burnside's lemma | (1/8) × 64 = 8 |
| 3-D coordinates (rotations found numerically; reflected coordinates superimposed) | 0 chiral isomers; tetrahedral contrast is chiral |
| Custom conditions | tetrahedral 8 (4 enantiomer pairs); acac 4; Cl⁻ for NCS⁻ 4; two halides 2 |
| Traps | 6, 16, 2, 4 and a trans-spanning chelate (12) all rejected |
| Numeric script | `tests/verify_p1q10.py` — 26 / 26 pass |
| Solution website | MathonGo (their Q42): 8 |
| The page | isomers counted at run time by its own enumeration; `tests/sim_p1q10.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q10 → 8 |

**Status: verified — 2026-09-27.**
