# ADV-2026-P2-CHE-Q15 — molar volume of pure B as a vapour against as a liquid

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 2 |
| **Subject** | Chemistry |
| **Section** | Section 4 — question stem shared by Q.15 and Q.16 |
| **Question** | Q.15 |
| **Type** | Numerical value (+2 / 0) |
| **Source** | `papers/adv_2026_paper_2.pdf`, page 28 |

---

## Question (verbatim)

### Question stem for question nos. 15 and 16

Two volatile liquids **A** and **B** form an ideal solution. Consider a **5 molal** solution of B in
A inside a closed container having a total vapour pressure of **100 mm Hg** at **300 K**. The vapour
pressure of pure A at 300 K is **105 mm Hg**. Assume that A and B behave as ideal gases in the
vapour phase.

Given:

| Quantity | Value |
|---|---|
| The gas constant *R* | 0.08 L atm K⁻¹ mol⁻¹ |
| Molar mass of A | 50 g mol⁻¹ |
| Molar mass of B | 57 g mol⁻¹ |
| Density of liquid B at 300 K | 0.5 g/mL |
| 1 atm | 760 mm Hg |

**Q.15** At 300 K, the ratio of the molar volume of pure B in vapour phase to its molar volume in
liquid phase is ____ .

*(Q.16, the mole fraction of B in the vapour phase, is not covered by this simulation.)*

---

## Classification

| | |
|---|---|
| **Chapter** | Solutions and Colligative Properties |
| **Topic** | Raoult's law for ideal solutions of two volatile liquids |
| **Subtopics** | Molality to mole fraction · Raoult's law for a binary ideal solution · Vapour pressure of a pure component from a measured total · Molar volume of a liquid from density · Molar volume of an ideal gas at a stated pressure |
| **Also draws on** | Mole concept · Ideal gas equation · Density · Unit conversion (mm Hg → atm) |
| **Difficulty** | Moderate |
| **Answer** | **2000** |

---

## Rules / formulas

```
n(A)  = w(A) / M(A)                        moles of solvent from its mass
n(B)  = m · w(A)/1000                      molality is per KILOGRAM of solvent
x(B)  = n(B) / [n(A) + n(B)]               mole fraction counts ALL the moles
      = m / (m + 1000/M(A))                closed form - w(A) cancels

p(total) = p°(A)·x(A) + p°(B)·x(B)         Raoult's law, ideal solution
  ⟹  p°(B) = [p(total) − p°(A)·x(A)] / x(B)

V(liquid, per mole) = M(B) / ρ(B)          mL/mol, then ÷1000 for L/mol
V(vapour, per mole) = R·T / p              p in atm = p(mm Hg)/760
                                           p must be p°(B) - PURE B's own pressure

ratio = V(vapour)/V(liquid) = R·T·ρ(B)·1000 / [M(B)·p°(B)]      dimensionless
```

---

## Data

| Quantity | Value |
|---|---|
| Basis taken | 1000 g (1 kg) of A |
| n(A) | 20 mol |
| n(B) | 5 mol |
| x(B) | 0.2 |
| x(A) | 0.8 |
| p(A) partial = p°(A)·x(A) | 84 mm Hg |
| p(B) partial = p(total) − p(A) | 16 mm Hg |
| **p°(B)** | **80 mm Hg** = 0.105263 atm |
| V(liquid B) | 57 / 0.5 = 114 mL/mol = 0.114 L/mol |
| V(vapour B) | (0.08 × 300) × (760/80) = **228 L/mol** |
| **Ratio** | 228 / 0.114 = **2000** |
| ∛2000 (edge ratio of the two cubes on the bench) | ≈ 12.6 |

### Distractors this question actually produces

| Mistake | Gives |
|---|---|
| RT/p with p = p(total) = 100 mm Hg | 1600 |
| RT/p with p = p°(A) = 105 mm Hg | 1523.81 |
| Forgetting mm Hg → atm | 2.63 |
| Leaving the liquid volume in mL | 2 |
| Reading 5 molal as x(B) = 5/20 | 1882.35 |
| Inverting the ratio (liquid ÷ vapour) | 5.0 × 10⁻⁴ |

### Robustness of the model

| Change | Ratio |
|---|---|
| 2500 g of A instead of 1000 g (n(A) = 50, n(B) = 12.5) | 2000 — unchanged |
| T = 600 K | 4000 |
| ρ(B) = 1.0 g/mL | 4000 |
| M(B) = 114 g/mol | 1000 |
| m = 10 mol/kg (x(B) = 1/3) | 1291.67 |

---

## Solution

1. **Take 1 kg of A as the basis, because molality is quoted per kilogram of solvent.**
   A 5 molal solution has 5 mol of B for every 1000 g of A.
   n(A) = 1000 / 50 = **20 mol**; n(B) = **5 mol**.

2. **Convert to mole fraction.** Raoult's law is written in mole fractions, never in molality —
   which is exactly why the molar mass of A is given.
   x(B) = 5 / (20 + 5) = **0.2**, so x(A) = **0.8**.
   The closed form x(B) = m / (m + 1000/M(A)) shows that the basis mass cancels out entirely.

3. **Apply Raoult's law and solve for the one unknown.**
   100 = (105)(0.8) + p°(B)(0.2) = 84 + 0.2 p°(B) ⟹ 0.2 p°(B) = 16 ⟹ **p°(B) = 80 mm Hg**.
   Check: 105 × 0.8 + 80 × 0.2 = 84 + 16 = 100 mm Hg, the measured total.

4. **Molar volume of liquid B, from its density.**
   One mole weighs 57 g, and 57 g of a liquid of density 0.5 g/mL occupies 57/0.5 = 114 mL.
   V(liquid) = **0.114 L mol⁻¹**.

5. **Molar volume of B as a vapour, from the ideal gas law at *its own* pressure.**
   "Pure B in the vapour phase" means one mole of B alone at 300 K, at p°(B) = 80 mm Hg —
   not at the mixture's 100 mm Hg and not at 1 atm.
   p = 80/760 atm, so V(vapour) = RT/p = (0.08 × 300)(760/80) = 24 × 9.5 = **228 L mol⁻¹**.

6. **The ratio.** Both volumes are per mole, so the units cancel and the answer is a pure number.
   228 / 0.114 = **2000**.

   Sanity: a mole of vapour at a tenth of an atmosphere spread over ~228 L against ~0.11 L of
   liquid is the expected three orders of magnitude. In each linear direction the expansion is
   only ∛2000 ≈ 12.6, which is the edge ratio the two cubes are drawn at on the bench.

**Answer: 2000**

---

## Verification log

| Check | Result |
|---|---|
| Derived from first principles before any published solution was consulted | pass — all six steps fixed independently |
| n(A), n(B), x(B), x(A) from the molality definition | 20, 5, 0.2, 0.8 — x(A) + x(B) = 1 exactly |
| x(B) independent of the basis mass (500, 1000, 2500, 137 g of A) | 0.2 in every case |
| x(B) against the closed form m/(m + 1000/M(A)) | identical (exact rationals) |
| Raoult back-substitution with p°(B) = 80 | 105(0.8) + 80(0.2) = 100 mm Hg, the measured value |
| Consistency of direction: p(total) < p°(A) requires p°(B) < p°(A) | 80 < 105 ✓ |
| V(vapour) by two routes: RT/(p/760) and RT·760/p | 228 L/mol both ways |
| Ratio by two routes: RT/p ÷ (M/ρ) and R·T·ρ·1000/(M·p) | 2000 to machine precision |
| Dimensional analysis | (L mol⁻¹)/(L mol⁻¹) — dimensionless ✓ |
| Magnitude check against V(1 atm, 300 K) = 24 L/mol | 24 × 9.5 = 228 ✓, and 10³-ish vapour:liquid ✓ |
| Scaling laws away from the paper's numbers (T, p°(B), ρ, M(B)) | 2× T → 2×; 2× p°(B) → ½×; 2× ρ → 2×; 2× M(B) → ½× |
| Mass of A swept over its whole range | ratio never moves — the cancellation is real, not a coincidence of 1000 g |
| Distractor audit (6 mistakes) | 1600, 1523.81, 2.63, 2, 1882.35, 5e-4 — none is 2000 |
| Refusal case: p(total) ≤ p°(A)·x(A) would need p°(B) < 0 | the bench disarms and states A's own contribution |
| Independent numeric script (`verify15.py`, exact fractions) | 32 / 32 checks pass, answer 2000 |
| Headless-browser run of the finished page (`t15.js`) | 111 / 111 assertions pass, live model returns 2000, zero console errors, no overflow at 390 px or 360 px |
| Answer hidden until revealed | 16-frame leak sweep across every screen of the run — the answer appears nowhere |
| Reduced-motion run | blink and card animations suppressed, content still complete |
| Cross-check against a published worked solution for this paper | same route, same intermediates (x(B) = 0.2, p°(B) = 80, 228 and 0.114 L/mol), same answer 2000 |
| IIT Roorkee official key | not retrievable at the time of writing |

**Status: verified — 2026-09-15.**
