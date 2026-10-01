# ADV-2026-P1-PHY-Q14 — Four optical effects and the phenomenon essential to each

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 4 — matching list set |
| **Question** | Q.14 (MathonGo numbering: Q30) |
| **Type** | Single correct option (+4 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 23 |

---

## Question (verbatim)

Q.14 In the **List-I**, four optical effects are mentioned. The physical phenomena of light which are essential to describe these optical effects are given in **List-II**. Choose the option which describes the correct match between the entries in **List-I** to those in **List-II**.

| List-I | List-II |
|---|---|
| (P) Colorful sky in north polar region (Aurora Borealis) | (1) Dispersion and reflection |
| (Q) Partially polarized sun light | (2) Total internal reflection |
| (R) Rainbow | (3) Diffraction |
| (S) Dark and bright fringes | (4) Scattering of light by molecules in the atmosphere |
| | (5) Emission of radiation from oxygen and nitrogen atoms excited by charged particles |

(A) P→5, Q→4, R→1, S→3  (B) P→4, Q→2, R→1, S→3
(C) P→4, Q→1, R→2, S→3  (D) P→5, Q→4, R→1, S→2

## Classification

| | |
|---|---|
| Chapter | Wave Optics |
| Topic | Optical effects in nature and the phenomenon essential to each - emission, scattering, dispersion with reflection, diffraction |
| Also | Ray Optics (rainbow, scattering); Atoms (emission lines) |
| Difficulty | Easy |
| Answer | **A** (P→5, Q→4, R→1, S→3) |

## Solution

1. **(P) Aurora borealis → (5).** Charged particles from the Sun excite oxygen and nitrogen high in the atmosphere, and the atoms emit at fixed wavelengths (O 557.7 nm and 630.0 nm, N₂⁺ 427.8 nm): a line spectrum. Scattered sunlight is a smooth continuum strongest in the violet, so it cannot give a green or red sky.
2. **(Q) Partially polarized sunlight → (4).** Light scattered by air molecules at angle *θ* from the Sun has degree of polarization *P* = sin²*θ*/(1 + cos²*θ*): zero towards the Sun, largest at 90°. Total internal reflection reflects both polarizations fully and cannot polarize it.
3. **(R) Rainbow → (1).** Dispersion (n = 1.331 red, 1.343 violet) and one internal reflection in a raindrop put the bow at 42.4° (red) and 40.6° (violet). The reflection is partial: the ray meets the back at about 40°, below the critical angle 48.7°. Option (2) is the trap.
4. **(S) Dark and bright fringes → (3).** Light of one colour through a narrow opening is dark where *a* sin *θ* = *mλ*: diffraction.
5. P→5, Q→4, R→1, S→3: **option (A)**. (B) fails on P and Q, (C) on P, Q and R, (D) on S.

## Verification log

| Check | Result |
|---|---|
| Approach | MathonGo solution read first as the conceptual reference (one mechanism per effect); the answer derived independently |
| P | λ = hc/ΔE gives the lines 557.7 / 630.0 / 427.8 nm; Rayleigh-scattered sunlight is a smooth continuum |
| Q | dipole scattering (numerical and sympy): P = sin²θ/(1 + cos²θ); Fresnel: total internal reflection gives no polarization |
| R | ray traced through a drop by coordinates and by Descartes: 42.4° / 40.6°; back angle 40.4° < critical 48.7°, Fresnel R ≈ 11 % |
| S | single slit as Huygens phasors: dark at a sin θ = mλ |
| Options | B, C and D each fail on at least one row |
| Numeric script | `tests/verify_p1phyq14.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq14.js` checks every station, the match, the target display (`tests/target_gate.js`), the visual gates A–K and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q30 = Physics Q.14): (A) |
| Answer key | official key printed with the paper (page 23; read last): Q.14 → A |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates A–K, library and production audits) — 2026-10-01. No human review has been recorded.**
