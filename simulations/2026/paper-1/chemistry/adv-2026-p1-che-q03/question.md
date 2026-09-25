# ADV-2026-P1-CHE-Q03 — order of dipole moments of BF₃, NH₄⁺, NF₃ and NH₃

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 1 — single correct option |
| **Question** | Q.3 |
| **Type** | Single correct MCQ (+3 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 27 |

---

## Question (verbatim)

The correct order of dipole moments for the given species is

| | |
|---|---|
| (A) | BF₃ = NH₄⁺ < NF₃ < NH₃ |
| (B) | BF₃ < NH₄⁺ < NF₃ < NH₃ |
| (C) | NH₄⁺ < BF₃ < NH₃ < NF₃ |
| (D) | BF₃ < NH₄⁺ < NH₃ < NF₃ |

## Classification

| | |
|---|---|
| Chapter | Chemical Bonding and Molecular Structure |
| Topic | Dipole moment — vector sum of bond and lone-pair moments |
| Difficulty | Easy-Moderate |
| Answer | **(A) BF₃ = NH₄⁺ < NF₃ < NH₃** |

## Rules / formulas

```
mu_molecule = | sum(bond moments) + sum(lone-pair moments) |      vectors
mu_bond ~ kappa (chi_A - chi_B), kappa = 1 D per Pauling unit,  toward the more electronegative atom
pyramid, bond angle alpha:  cos^2(beta) = (1 + 2 cos alpha) / 3
mu(NH3) = 3 mu_NH cos(beta) + mu_lp        bonds and lone pair add
mu(NF3) = | mu_lp - 3 mu_NF cos(beta) |    bonds and lone pair oppose
torque in a field: tau = mu E sin(theta)  ->  mu = tau_max / E
```

## Data

| Species | VSEPR shape | Lone pair on centre | Model μ / D | Measured μ / D |
|---|---|---|---|---|
| BF₃ | trigonal planar, 120° | none | 0 (exact, by symmetry) | 0 |
| NH₄⁺ | tetrahedral, 109.5° | none | 0 (exact, by symmetry) | 0 |
| NF₃ | trigonal pyramidal, ≈102° | 1 | \|1.00 − 3 × 0.94 × 0.441\| = 0.244 | 0.234 (0.80 × 10⁻³⁰ C m) |
| NH₃ | trigonal pyramidal, ≈107° | 1 | 3 × 0.84 × 0.372 + 1.00 = 1.938 | 1.47 (4.90 × 10⁻³⁰ C m) |

Model data: Pauling χ — H 2.20, B 2.04, N 3.04, F 3.98; 1 D per unit difference; lone-pair moment on N 1.0 D.

## Solution

1. **Shapes (VSEPR).** BF₃: 3 bond pairs → trigonal planar. NH₄⁺: 4 bond pairs → tetrahedral.
   NF₃ and NH₃: 3 bond pairs + 1 lone pair → trigonal pyramidal.
2. **BF₃ and NH₄⁺.** Equal bond moments arranged symmetrically round the centre cancel exactly —
   three at 120° in a plane, four to the corners of a tetrahedron. No lone pair on the centre. μ = 0 for
   both, so **BF₃ = NH₄⁺**. (NH₄⁺ is an ion, but its charge is symmetric about N: no dipole about its centre.)
3. **NH₃.** N is more electronegative than H, so the N–H moments point toward N — the same way as the
   lone pair. They add: large μ.
4. **NF₃.** F is more electronegative than N, so the N–F moments point toward F — away from the lone pair.
   They oppose: small μ, even though N–F is the more polar bond.
5. **Order:** BF₃ = NH₄⁺ < NF₃ < NH₃ → **(A)**.
6. **Options:** (B), (C) and (D) all put a strict order between BF₃ and NH₄⁺, which are both exactly zero.
   (C) and (D) also put NF₃ above NH₃ — the answer you get by comparing bond polarities alone and
   forgetting the lone pair.

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | VSEPR + vector sum → BF₃ = NH₄⁺ (0) < NF₃ < NH₃ → (A) |
| Symbolic (sympy) | BF₃ and NH₄⁺ sums vanish for any bond moment; pyramid resultant 3m cos β ± L; cos²β = (1 + 2 cos α)/3 checked |
| Bond-moment model | NH₃ 1.938 D, NF₃ 0.244 D |
| Robustness | order holds for lone-pair moment > 0.153 D, NH₃ angle 100–110°, NF₃ angle 98–106°, κ 0.5–1.5; flips with no lone pair |
| Measured values | NH₃ 1.47 D, NF₃ 0.23 D, BF₃ 0, NH₄⁺ 0 — same order |
| Quantum chemistry (B3LYP/aug-cc-pVDZ, pyscf) | BF₃ 0.000, NH₄⁺ 0.000, NF₃ 0.197, NH₃ 1.522 D |
| Numeric script | `tests/verify_p1q03.py` — 28 / 28 pass, answer (A) |
| The page | vector sums, torque-meter readings τ_max/E equal to them, order and option matched at run time; `tests/sim_p1q03.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q3 → A |

**Status: verified — 2026-09-25.**
