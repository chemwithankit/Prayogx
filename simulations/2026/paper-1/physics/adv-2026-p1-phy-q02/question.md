# ADV-2026-P1-PHY-Q02 — A shorted coil inside an LC circuit's coil: the resonant frequency

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 1 — four questions, only one option correct |
| **Question** | Q.2 (MathonGo numbering: Q18) |
| **Type** | Single correct option (+3 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 13 |

---

## Question (verbatim)

Q.2 Consider a circuit consisting of a capacitor of capacitance *C* and a coil with *N* turns per unit length, cross sectional area *S* and length *d*, where *d*² ≫ *S*. There is another coil of length *d*/2, cross sectional area *S*/2 and 2*N* turns per unit length completely inside the larger coil, as shown in the figure. The ends of this smaller coil are connected with each other by an insulated conducting wire. The self-inductance of the larger coil is *L*. Neglecting edge effects and all the Ohmic resistances, the resonant frequency of the circuit is:

(A) 4/√(15 LC) &nbsp; (B) 6/√(5 LC) &nbsp; (C) 2/√(3 LC) &nbsp; (D) √(2/(3 LC))

The figure shows the long coil (length *d*) with the shorter coil (length *d*/2) inside it, the shorter coil's ends joined by a wire loop
on the left, and on the right the long coil in series with the capacitor *C* and an AC source. It is redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | Electromagnetic Induction |
| Topic | Self and mutual inductance of coaxial solenoids - a shorted coil lowers the effective inductance and raises the LC resonance |
| Also | Alternating current (LC resonance) · flux conservation in a resistance-free loop · magnetic energy |
| Difficulty | Moderate |
| Answer | **(C)** |

## Solution

1. **Self-inductances.** L₁ = μ₀N²S*d* = *L*. The inner coil: L₂ = μ₀(2N)²(S/2)(*d*/2) = μ₀N²S*d* = *L* (the same *Nd* turns on half the area).
2. **Mutual inductance.** The outer field μ₀NI₁ threads the inner coil's 2N·(*d*/2) turns over area S/2: M = μ₀N·2N·(S/2)(*d*/2) = *L*/2.
3. **The shorted coil.** With no resistance its EMF is zero: L₂ dI₂/dt + M dI₁/dt = 0, so I₂ = −(M/L₂)I₁ = −I₁/2. The field inside it,
   μ₀(NI₁ + 2NI₂), is zero: the field is expelled from its core.
4. **Effective inductance.** V = L₁İ₁ + Mİ₂ = (L₁ − M²/L₂)İ₁, so L_eff = L − L/4 = **3L/4**. (Energy: the field now fills
   1 − (S/2)(*d*/2)/(S*d*) = 3/4 of the volume.)
5. **Resonance.** ω = 1/√(L_eff C) = 1/√(3LC/4) = **2/√(3LC)**: option **(C)**.
6. Distractors by the inductance each implies: (A) 15L/16 — the fractions squared; (B) 5L/36 — no flux argument gives it;
   (D) 3L/2 = L + M — the induced current taken as aiding.

## Verification log

| Check | Result |
|---|---|
| Independent derivation (solenoid inductances, zero EMF on the shorted coil) | ω = 2/√(3LC) → C |
| sympy | L₂ = L, M = L/2, L_eff = 3L/4; only option C equals ω |
| Coupled circuit integrated (scipy), no L_eff used | ω√(LC) = 1.154701; I₂ = −I₁/2 throughout; energy conserved |
| Field energy (flux conservation + Ampère + energy integral) | B = 0 in the core; L_eff = 3L/4 |
| Controls | open coil → 1; other turns/areas/lengths → 1/√(1 − a·ℓ) |
| Every option | ω√(LC): A 1.0328, B 2.6833, C 1.1547, D 0.8165 — only C |
| Numeric script | `tests/verify_p1phyq02.py` |
| The page | engine run in Node by the verifier: same answer and numbers; `tests/sim_p1phyq02.js` drives the page and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q18 = Physics Q.2): (C), same steps |
| Answer key | official key printed with the paper (page 13, visible on the same page as the question; the derivation above does not use it): Q.2 → C |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, library and production audits) — 2026-09-29. No human review has been recorded.**
