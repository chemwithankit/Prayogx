# ADV-2026-P1-PHY-Q15 — Loops rotating through a half-plane magnetic field

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 4 — matching list set |
| **Question** | Q.15 (MathonGo numbering: Q31) |
| **Type** | Single correct option (+4 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 24 |

---

## Question (verbatim)

Q.15 **List-I** contains four conducting loops lying in the *XY* plane, as shown in the figures. The loops are rotating about *Z* axis passing through the point *O* with time period *T* in clockwise direction. The region *x* > 0 contains a uniform magnetic field *B* in the +*z* direction. **List-II** contains the qualitative variation of the induced current *i*(*t*) for each of these loops. Choose the option which describes the correct match between the entries in **List-I** to those in **List-II**.

List-I (figures): (P) a half-disc on the left of the *y* axis, its straight edge along the *y* axis through *O*; (Q) two 60° sectors on the left of *O*, one above and one below the *x* axis; (R) one 60° sector above and left of *O*; (S) two 60° sectors meeting at *O*, one above and right of *O* (in the field) and one below and left of *O*. Each loop is marked with a current arrow *i*.

List-II (graphs of *i* against *t* over one period *T*): (1) a positive pulse from 0 to *T*/6 and a negative pulse from *T*/2 to 2*T*/3; (2) positive pulses from 0 to *T*/6 and *T*/3 to *T*/2, negative pulses from *T*/2 to 2*T*/3 and 5*T*/6 to *T*; (3) a positive constant to *T*/2, then a negative constant; (4) zero; (5) a current growing linearly to *T*/2, then below zero and falling linearly.

(A) P→5, Q→4, R→1, S→3  (B) P→3, Q→2, R→5, S→4
(C) P→3, Q→2, R→1, S→4  (D) P→5, Q→1, R→2, S→3

The figures are described in words here and redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | Electromagnetic Induction |
| Topic | Loops rotating through a half-plane field - the induced current follows the rate at which loop area crosses the field boundary |
| Also | Moving Charges and Magnetism (flux) |
| Difficulty | Moderate |
| Answer | **C** (P→3, Q→2, R→1, S→4) |

## Solution

1. **The idea.** Φ = *B* · *A*<sub>in</sub>, the area of the loop inside *x* > 0. A sector edge crossing the boundary sweeps area at *r*²*ω*/2, so the emf and *i* are constant while an edge crosses and zero otherwise. Positive *i* is along the drawn arrow (clockwise): it flows while the flux grows.
2. **(P) → (3).** The half-disc's area enters steadily for half a turn, then leaves: + constant, then − constant.
3. **(Q) → (2).** Upper sector in (0–*T*/6), gap, lower sector in (*T*/3–*T*/2), upper out (*T*/2–2*T*/3), gap, lower out (5*T*/6–*T*).
4. **(R) → (1).** In (0–*T*/6), inside, out (*T*/2–2*T*/3), outside.
5. **(S) → (4).** The two sectors are diametrically opposite: one crosses out exactly as the other crosses in. The wire bends at *O* without crossing, so both lobes circulate the same way. The flux is constant and *i* = 0. (With opposite senses the two changes would add.)
6. P→3, Q→2, R→1, S→4: **option (C)**.

## Verification log

| Check | Result |
|---|---|
| Approach | MathonGo solution read first as the conceptual reference (area in the field) |
| Sector overlap (+ sympy, half-disc) | P3 Q2 R1 S4 |
| Green's theorem on the loops as drawn (flux / B = ∮ max(x, 0) dy) | P3 Q2 R1 S4; S's flux constant |
| Control: S as a crossing figure-8 | pulses at twice one edge's rate: matches no List-II graph |
| Options | A, B and D each fail |
| Numeric script | `tests/verify_p1phyq15.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq15.js` checks i = dA/dt at every instant, the match, the target display (`tests/target_gate.js`), the visual gates A–K and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q31 = Physics Q.15): (C). Their S argument (opposite-sense lobes cancelling) is not used; see the control |
| Answer key | official key printed with the paper (page 24; read last): Q.15 → C |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates A–K, library and production audits) — 2026-10-01. No human review has been recorded.**
