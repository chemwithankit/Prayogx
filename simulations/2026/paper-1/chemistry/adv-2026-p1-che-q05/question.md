# ADV-2026-P1-CHE-Q05 — 2s and 2p orbital energies of H and Li

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 2 — one or more options correct |
| **Question** | Q.5 |
| **Type** | Multiple correct MCQ (+4 / partial +3, +2, +1 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 28 |

---

## Question (verbatim)

The 2s and the 2p orbital energies of hydrogen atom are E₂ₛ(H) and E₂ₚ(H), respectively. The 2s and the 2p
orbital energies of lithium atom are E₂ₛ(Li) and E₂ₚ(Li), respectively. The correct option(s) about the
orbital energies is(are)

| | |
|---|---|
| (A) | E₂ₛ(Li) < E₂ₚ(Li) |
| (B) | E₂ₛ(H) = E₂ₚ(H) |
| (C) | E₂ₚ(H) < E₂ₛ(Li) |
| (D) | E₂ₛ(H) > E₂ₛ(Li) |

## Classification

| | |
|---|---|
| Chapter | Atomic Structure |
| Topic | Orbital energies — degeneracy in hydrogen, penetration and shielding in lithium |
| Difficulty | Easy-Moderate |
| Answer | **(A), (B), (D)** |

## Energies (eV)

| | H 2s | H 2p | Li 2s | Li 2p |
|---|---|---|---|---|
| Page's solver (nucleus + 1s² core) | −3.401 | −3.401 | −4.763 | −3.426 |
| Hartree–Fock ΔSCF | −3.401 | −3.401 | −5.342 | −3.500 |
| Measured (spectroscopy) | −3.40 | −3.40 | −5.392 | −3.544 |

## Solution

1. **Hydrogen:** one electron, no shielding — E depends on n only: E₂ₛ(H) = E₂ₚ(H) = −13.6/4 = −3.40 eV. **(B) true.**
2. **Lithium:** the 2s orbital penetrates the 1s² core and feels more of the +3 nucleus than 2p, which has an
   angular node at the nucleus. Higher Z_eff → lower energy: E₂ₛ(Li) < E₂ₚ(Li). **(A) true.**
3. **H vs Li:** Z_eff(Li, 2s) ≈ 1.26–1.30 > 1 = Z_eff(H), so E₂ₛ(Li) < E₂ₛ(H), i.e. E₂ₛ(H) > E₂ₛ(Li). **(D) true.**
4. E₂ₚ(H) = E₂ₛ(H) > E₂ₛ(Li), the reverse of (C). **(C) false.**
5. Order: E₂ₛ(Li) < E₂ₚ(Li) < E₂ₛ(H) = E₂ₚ(H). **Answer (A), (B), (D).**

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | degeneracy in H, penetration in Li → (A), (B), (D) |
| sympy | hydrogenic 2s and 2p are exact eigenfunctions, E = −1/8 hartree |
| Numerov radial solver (separate from the page) | H −3.401 / −3.401; Li −4.763 / −3.426 eV |
| Slater's rules | Z_eff(Li 2s) = 1.30 → −5.75 eV |
| Spectroscopy | Li IE 5.392 eV; 670.8 nm line → Li 2p −3.544 eV |
| Hartree–Fock (pyscf) | Li 2s −5.342, Li 2p −3.500 eV |
| Robustness / controls | core exponent 2.3–3.0 same; no core → (B), (D); Be⁺ → (A), (B), (D) |
| Numeric script | `tests/verify_p1q05.py` — 18 / 18 pass |
| Solution website | MathonGo (their Q37): (A), (B), (D) |
| The page | energies solved in the page, statements evaluated at run time; `tests/sim_p1q05.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q5 → ABD |

**Status: verified — 2026-09-26.**
