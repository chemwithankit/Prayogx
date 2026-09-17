# ADV-2026-P2-CHE-Q16 — mole fraction of B in the vapour phase

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 2 |
| **Subject** | Chemistry |
| **Section** | Section 4 — question stem shared by Q.15 and Q.16 |
| **Question** | Q.16 |
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

| Quantity | Value | Needed for Q.16? |
|---|---|---|
| Molar mass of A | 50 g mol⁻¹ | **yes** — converts the molality to a mole fraction |
| The gas constant *R* | 0.08 L atm K⁻¹ mol⁻¹ | no |
| Molar mass of B | 57 g mol⁻¹ | no |
| Density of liquid B at 300 K | 0.5 g/mL | no |
| 1 atm | 760 mm Hg | no |

**Q.16** The mole fraction of B in vapour phase which is in equilibrium with this solution is ____ .

*(Q.15, the ratio of molar volumes, is a separate simulation — `ADV-2026-P2-CHE-Q15`.)*

---

## Classification

| | |
|---|---|
| **Chapter** | Solutions and Colligative Properties |
| **Topic** | Vapour-phase composition over an ideal solution |
| **Subtopics** | Molality to mole fraction · Raoult's law for a binary ideal solution · Partial pressure from the measured total · Dalton's law in the vapour · Liquid composition *x* versus vapour composition *y* · Relative volatility and why the vapour is richer in the more volatile component |
| **Also draws on** | Mole concept · Ideal gas mixtures |
| **Difficulty** | Moderate |
| **Answer** | **0.16** |

---

## Rules / formulas

```
n(A) = w(A)/M(A)                       moles of solvent from its mass
n(B) = m · w(A)/1000                   molality is per KILOGRAM of solvent
x(B) = n(B)/[n(A) + n(B)]              LIQUID-phase mole fraction

p(A) = x(A)·p°(A)                      Raoult's law - uses the LIQUID composition
p(B) = p(total) − p(A)                 whatever the gauge has left over

p(i) = y(i)·p(total)                   Dalton's law in an ideal gas mixture
y(B) = p(B)/p(total)                   VAPOUR-phase mole fraction

combined:  y(B) = x(B)·p°(B)/p(total)
           y(B)/x(B) = p°(B)/p(total)          the enrichment factor
```

---

## Data

| Quantity | Value |
|---|---|
| Basis taken | 1000 g (1 kg) of A |
| n(A) | 20 mol |
| n(B) | 5 mol |
| x(A) — liquid | 0.80 |
| **x(B) — liquid** | **0.20** |
| p(A) = 0.80 × 105 | 84 mm Hg |
| p(B) = 100 − 84 | 16 mm Hg |
| p°(B) recovered, p(B)/x(B) | 80 mm Hg |
| y(A) = 84/100 | 0.84 |
| **y(B) = 16/100** | **0.16** |
| y(B)/x(B) = p°(B)/p(T) | 0.8 |
| Relative volatility α = p°(A)/p°(B) | 21/16 = 1.3125 |
| Richer phase in B | the **liquid** (B is the less volatile component) |

### Distractors this question actually produces

| Mistake | Gives |
|---|---|
| Handing in x(B), the liquid mole fraction | 0.20 |
| Answering y(A) instead of y(B) | 0.84 |
| p(B)/p(A) instead of p(B)/p(T) | 0.1905 |
| Using p°(A) in y = x·p°/p(T) | 0.21 |
| Answering 1 − x(B) | 0.80 |
| p(B)/p°(B) — which is x(B) by definition | 0.20 |

### Robustness of the model

| Change | y(B) |
|---|---|
| 2500 g of A instead of 1000 g (n(A) = 50, n(B) = 12.5) | 0.16 — unchanged |
| p°(A) = 100 = p(T), so both liquids equally volatile | 0.20 = x(B) exactly |
| p°(A) = 80 < p(T), so B becomes the more volatile one | 0.36 > x(B) |
| m = 0.1 mol/kg (almost pure A) | 0.0037 |
| m = 10 mol/kg (x(B) = 1/3) | 0.30 |
| M(B) = 200, ρ(B) = 2, R = 0.5 all at once | 0.16 — none of them enters |

---

## Solution

1. **Moles of A.** Molality is per kilogram of solvent, so take 1000 g of A as the basis.
   n(A) = 1000 / 50 = **20 mol**.

2. **Liquid-phase mole fraction.** A 5 molal solution has n(B) = **5 mol** for that kilogram.
   x(A) = 20/(20 + 5) = **0.8** and x(B) = **0.2**.
   This is the number the question is waiting for you to hand in by mistake.

3. **Partial pressure of A, by Raoult's law.** Each component's partial pressure is its pure vapour
   pressure scaled by its own mole fraction *in the liquid*.
   p(A) = 0.8 × 105 = **84 mm Hg**.

4. **Partial pressure of B, from the total.** The gauge reads the sum of the two partial pressures
   and A's share is now known.
   p(B) = 100 − 84 = **16 mm Hg**.

5. **Vapour-phase mole fraction, by Dalton's law.** In an ideal gas mixture p(i) = y(i)·p(total), so
   the vapour composition is just each component's pressure share.
   y(B) = 16 / 100 = **0.16**.

6. **Why it is smaller than x(B).** Putting the steps together, y(B) = x(B)·p°(B)/p(T), and here
   p°(B) = 16/0.2 = 80 mm Hg against p°(A) = 105 mm Hg. B is the less volatile component, so the
   vapour is *poorer* in B than the liquid: 0.16 against 0.20, an enrichment factor of exactly
   p°(B)/p(T) = 0.8. Equivalently y(A) = 0.84 > x(A) = 0.80 — the vapour is always richer in the
   more volatile component, which is the whole basis of fractional distillation.

**Answer: 0.16**

---

## Verification log

| Check | Result |
|---|---|
| Derived from first principles before any published solution was consulted | pass — all five steps fixed independently |
| Liquid composition closes | x(A) + x(B) = 0.80 + 0.20 = 1 exactly |
| Vapour composition closes | y(A) + y(B) = 0.84 + 0.16 = 1 exactly |
| Partial pressures add back to the measured total | 84 + 16 = 100 mm Hg |
| Second independent route via p°(B) | p°(B) = p(B)/x(B) = 80; x(B)·p°(B)/p(T) = 0.16 |
| Third route | 1 − x(A)p°(A)/p(T) = 0.16 |
| Relative-volatility form, α = p°(A)/p°(B) = 21/16 | reproduces y(A) = 0.84 exactly |
| Sign of the effect predicted before computing | p°(B) < p°(A) ⟹ y(B) < x(B); computed values agree |
| Limiting case: p°(A) = p(T) | y(B) = x(B) exactly — equally volatile pair |
| Limiting case: p°(A) < p(T) | y(B) > x(B) — B becomes the more volatile one |
| Limiting case: m → 0 | y(B) → 0 |
| Basis independence | 500 g, 1000 g, 2500 g, 137 g of A all give x(B) = 0.2 and y(B) = 0.16 |
| Unused data confirmed unused | changing M(B), ρ(B) and R together leaves the answer at 0.16 |
| Refusal case: p(T) ≤ x(A)p°(A) would make p(B) negative | the bench disarms and states A's own contribution |
| Distractor audit (6 mistakes) | 0.20, 0.84, 0.1905, 0.21, 0.80, 0.20 — none is 0.16 |
| Independent numeric script in exact fractions (`verify16.py`) | 28 / 28 checks pass, answer 4/25 = 0.16 |
| Headless-browser run of the finished page (`t16.js`) | 114 / 114 assertions pass, live model returns 0.16, zero console errors, no overflow at 390 px or 360 px |
| Answer hidden until revealed | 12-frame leak sweep across every stage — the answer appears nowhere |
| Classroom mode and NEXT STEP | walks molality → x → p(A) → p(B) → y(B) → answer, one beat per press, run paused between |
| Reduced-motion run | blink, flash and card animations suppressed; content and answer still complete |
| Cross-check against a published worked solution for this paper | same route, same intermediates (x(B) = 0.2, p(A) = 84, p(B) = 16), same answer 0.16 |
| IIT Roorkee official key | not retrievable at the time of writing |

**Status: verified — 2026-09-17.**
