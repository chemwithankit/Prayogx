# ADV-2026-P2-PHY-Q01 — Drift velocity of electrons in a wire on a battery with internal resistance

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 2 |
| **Subject** | Physics |
| **Section** | Section 1 — single correct option |
| **Question** | Q.1 (MathonGo numbering: Q19) |
| **Type** | Single correct option (+3 / 0 / −1) |
| **Source** | `papers/adv_2026_paper_2.pdf`, page 10 |

---

## Question (verbatim)

Q.1 A metal wire of cross-sectional area 0.5 mm² and length 100 m is connected across a battery of e.m.f. 2 V and internal resistance 1 Ω. The density, atomic mass and electrical conductivity of the metal are 6.35 × 10³ kg m⁻³, 63.5 gm/mole and 2 × 10⁸ mho m⁻¹, respectively. Assuming one conduction electron per atom of the metal, the drift velocity (in mm s⁻¹) of the electrons in the wire is:
[Take Avogadro’s number as 6 × 10²³ and charge of the electron as 1.6 × 10⁻¹⁹ C.]

(A) 0.052  (B) 0.104  (C) 0.208  (D) 0.156

## Classification

| | |
|---|---|
| Chapter | Current Electricity |
| Topic | Drift velocity of electrons in a wire on a battery with internal resistance - a large current from a slow drift |
| Difficulty | Easy-Moderate |
| Answer | **C** (v_d = 0.208 mm s⁻¹) |

## Solution

1. **SI units.** *A* = 0.5 × 10⁻⁶ m², *M* = 63.5 × 10⁻³ kg mol⁻¹, *σ* = 2 × 10⁸ Ω⁻¹ m⁻¹.
2. **Resistance.** *R* = *L*/(*σA*) = 100 / (2 × 10⁸ × 0.5 × 10⁻⁶) = 1 Ω.
3. **Current.** *I* = *ε*/(*R* + *r*) = 2/(1 + 1) = 1 A; the wire gets *IR* = 1 V of the 2 V.
4. **Free electrons.** *n* = *ρN*ₐ/*M* = 6.35 × 10³ × 6 × 10²³ / (63.5 × 10⁻³) = 6 × 10²⁸ m⁻³.
5. **Drift velocity.** *v*_d = *I*/(*neA*) = 1 / (6 × 10²⁸ × 1.6 × 10⁻¹⁹ × 0.5 × 10⁻⁶) = 1/4800 m s⁻¹ = **0.208 mm s⁻¹**: **option (C)**.
6. **Check.** *E* = *V*/*L* = 0.01 V m⁻¹; *v*_d = *σE*/(*ne*) = 0.208 mm s⁻¹.

## Verification log

| Check | Result |
|---|---|
| Approach | MathonGo solution read first as the conceptual reference |
| Independent solve | *R* = 1 Ω, *I* = 1 A, *n* = 6 × 10²⁸ m⁻³, *v*_d = 0.208 mm s⁻¹ |
| Circuit route and field route, exact fractions | both 1/4800 m s⁻¹ |
| Collision Monte Carlo (*eEτ*/*m*) | agrees within 1 % |
| Traps and options | *r* = 0 gives 0.417 (no option); A, B, D fail |
| Numeric script | `tests/verify_p2phyq01.py` |
| The page | engine run in Node by the verifier; `tests/sim_p2phyq01.js` checks the staged run, the tracer at the real drift speed, every control, the what-if tests, the target display (`tests/target_gate.js`), the visual gates A–K and the app shell |
| Solution website | MathonGo Paper 2 solutions (their Q19 = Physics Q.1): (C) |
| Answer key | official final key, JEE Advanced 2026 Paper 2 (jeeadv.ac.in, published 2026-06-01; read last): Q.1 → C |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates A–K, library and production audits) — 2026-10-02. No human review has been recorded.**
