# ADV-2026-P1-CHE-Q13 — Signs of ΔH and ΔS

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Chemistry |
| **Section** | Section 4 — matching list set |
| **Question** | Q.13 (MathonGo numbering: Q45) |
| **Type** | Single correct option (+4 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 32 |

---

## Question (verbatim)

List-I contains various physical/chemical processes, and List-II contains combinations of changes in enthalpy (ΔH) and entropy (ΔS).
Match each entry in List-I to the appropriate entry in List-II, and choose the correct option.

| List-I | List-II |
|---|---|
| (P) Physisorption | (1) ΔH > 0 and ΔS > 0 |
| (Q) Diamond ⟶ Graphite | (2) ΔH < 0 and ΔS < 0 |
| (R) Denaturation of protein | (3) ΔH < 0 and ΔS = 0 |
| (S) Propene ⟶ Cyclopropane | (4) ΔH > 0 and ΔS < 0 |
| | (5) ΔH < 0 and ΔS > 0 |

(A) P → 2; Q → 3; R → 5; S → 4 &nbsp; (B) P → 4; Q → 3; R → 5; S → 1 &nbsp; (C) P → 2; Q → 5; R → 1; S → 4 &nbsp; (D) P → 2; Q → 5; R → 1; S → 3

## Classification

| | |
|---|---|
| Chapter | Thermodynamics |
| Topic | Signs of enthalpy and entropy change — adsorption, allotropes, protein denaturation and ring strain |
| Difficulty | Moderate |
| Answer | **(C)** |

## Solution

1. **P, physisorption:** van der Waals attraction forms — heat released, ΔH < 0 (≈ −15 kJ/mol for N₂ on charcoal). A 3-D gas becomes a 2-D film:
   S(3-D, 77 K) = 122.3, S(2-D) = 56.1 J/K·mol, ΔS ≈ −66 J/K·mol < 0 → **(2)**.
2. **Q, diamond → graphite:** ΔH = ΔcH(diamond) − ΔcH(graphite) = −395.4 − (−393.5) = −1.9 kJ/mol; ΔS = 5.74 − 2.38 = +3.36 J/K·mol → **(5)**.
3. **R, denaturation:** hydrogen bonds break — heat absorbed (DSC peak), ΔH > 0; the unfolded chain has vastly more conformations, ΔS > 0
   (ΔS = ΔH/Tm at the midpoint) → **(1)**.
4. **S, propene → cyclopropane:** ΔH = ΔcH(propene) − ΔcH(cyclopropane) = −2058.0 − (−2091.3) = +33.3 kJ/mol (ring strain);
   ΔS = 237.5 − 267.0 = −29.5 J/K·mol (ring closure freezes the CH₃ rotor) → **(4)**.
5. P2, Q5, R1, S4 → **(C)**. (A) fails at Q and R, (B) at all four, (D) at S. Entry (3) fits no process.

## Verification log

| Check | Result |
|---|---|
| Independent derivation before any key | P2 Q5 R1 S4 → C |
| Hess's law two ways (Q, S) | combustion and formation enthalpies agree: −1.9 and +33.3 kJ/mol |
| Sackur–Tetrode (P) | S°(N₂) reproduced (191.5 J/K·mol); ΔS < 0 over 50–298 K and 0.16–0.3 nm² |
| Two-state DSC (R) | peak area = ΔH within 0.5 %; ΔS = ΔH/Tm > 0 |
| Controls | chemisorption still (2); Q, R or S reversed → no printed option fits |
| Numeric script | `tests/verify_p1q13.py` — 31 / 31 pass |
| Solution website | MathonGo (their Q45): C |
| The page | every ΔH and ΔS computed at run time, signs and option read off; `tests/sim_p1q13.js` drives the whole page |
| Answer key (checked afterwards) | official final key printed with the paper: Q13 → C |

**Status: verified — 2026-09-28.**
