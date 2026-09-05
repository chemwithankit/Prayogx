# ADV-2026-P2-CHE-Q11

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.11 (Section 3 — numerical value, +4 full / 0 otherwise, no negative marking)
**Source:** `papers/adv_2026_paper_2.pdf`, page 27

---

## Question (verbatim)

At a given temperature, 0.45 g of acetic acid in 50 mL of water is shaken with 1.0 g of charcoal and
the pH of the resulting solution is 3.0. Assume, the adsorption of acetic acid from the aqueous
solution by charcoal follows Freundlich isotherm,

```
x/m = k C^(1/n)
```

If the plot of log₁₀(x/m) against log₁₀C gives a straight line with slope 1, the value of k in
L mol⁻¹ is ______.

**Given:** The molar mass of acetic acid is 60 g mol⁻¹. The acid dissociation constant of acetic acid
is 1.0 × 10⁻⁵ at the given temperature. *x* is the mass (in grams) of acetic acid adsorbed. *m* is
the mass (in grams) of charcoal. C is the equilibrium concentration of acetic acid in the solution
after the adsorption is complete. *k* and *n* are constants for the acetic acid–charcoal system at
the given temperature.

**Answer: 1.5**

---

## Solution

### 1. What went into the flask

```
moles = 0.45 g ÷ 60 g mol⁻¹ = 0.0075 mol
C_initial = 0.0075 mol ÷ 0.050 L = 0.15 mol L⁻¹
```

The volume has to be in **litres**. Dividing by 50 instead of 0.050 gives 0.00015, which is moles per
millilitre.

### 2. The pH reading is about H⁺, not about the acid

```
[H⁺] = 10^(−pH) = 10^(−3.0) = 1.0 × 10⁻³ mol L⁻¹
```

Acetic acid is *weak*: only a small fraction of it has given up a proton. So the hydrogen ions the
meter sees are nowhere near the amount of acid present. That conversion is the whole point of being
handed Kₐ.

### 3. Kₐ turns [H⁺] into the acid concentration

```
CH₃COOH ⇌ CH₃COO⁻ + H⁺        Kₐ = [CH₃COO⁻][H⁺] / [CH₃COOH]
```

Both ions come only from the acid, so [CH₃COO⁻] ≈ [H⁺] and the expression collapses:

```
Kₐ = [H⁺]² / C        ⟹        C = [H⁺]² / Kₐ

C = (1.0 × 10⁻³)² ÷ (1.0 × 10⁻⁵) = 0.10 mol L⁻¹
```

Sense check: 0.10 M is *below* the 0.15 M we started with, which is exactly what adsorption should
do.

### 4. Mass balance — the acid moved, it did not vanish

```
n_left = C × V   = 0.10 × 0.050 = 0.005 mol
mass left        = 0.005 × 60   = 0.30 g
x = 0.45 − 0.30                 = 0.15 g adsorbed
```

0.30 g in the solution plus 0.15 g on the charcoal is the 0.45 g weighed out. A third of the acid
ended up on the surface.

### 5. x/m

```
x/m = 0.15 g ÷ 1.0 g = 0.15
```

*x* is a **mass**, as the question states, so *x*/*m* is grams per gram — a pure number.

### 6. The slope gives n

```
log₁₀(x/m) = log₁₀ k + (1/n) log₁₀ C
```

That is *y* = *c* + *sx*: a straight line whose gradient is 1/n and whose intercept is log₁₀k. The
question hands us the gradient:

```
1/n = 1   ⟹   n = 1   ⟹   x/m = kC
```

### 7. k

```
0.15 = k × (0.10)¹   ⟹   k = 0.15 ÷ 0.10 = 1.5
units: (g/g) ÷ (mol L⁻¹) = L mol⁻¹
```

The C in the isotherm is the concentration left **at equilibrium**, 0.10 M — not the 0.15 M we
started with. Using 0.15 gives 1.0, and that is the commonest wrong answer here.

### 8. Answer

**k = 1.5 L mol⁻¹**

Marking: +4 for 1.5, 0 otherwise. No negative marking, so there is never a reason to leave this
blank.

---

## Independent verification

- **Derived before anything was looked up.** Every step — the mole calculation, the Kₐ inversion, the
  mass balance, the slope and the final division — was fixed from first principles, and only then
  compared with a published solution.
- **The Kₐ route checked in both directions:** forwards it gives C = 0.10 M from pH 3.00, and
  substituting back, [H⁺] = √(KₐC) = 1.000 × 10⁻³, reproducing the meter reading exactly.
- **Conservation checked explicitly:** 0.30 g in solution + 0.15 g adsorbed = 0.45 g weighed out, to
  machine precision. The simulation enforces the same identity frame by frame while the flask shakes,
  and the test suite asserts it mid-shake as well as at equilibrium.
- **Two independent routes to k:** dividing (x/m) by C gives 1.5, and reading the intercept of the
  log–log line gives log₁₀k = 0.176091, i.e. k = 1.500000.
- **Units confirmed by dimensional analysis:** (g g⁻¹) ÷ (mol L⁻¹) = L mol⁻¹, which is the unit the
  question asks for — itself a check that *x* was correctly taken as a mass rather than a number of
  moles.
- **The traps reproduced deliberately:** using the initial 0.15 M gives exactly 1.0; treating pH 3 as
  the acid concentration gives an absurd 150; dividing by 50 instead of 0.050 L gives 0.00015;
  putting *x* in moles gives 0.025 L g⁻¹. None is 1.5.
- **The approximation quantified rather than assumed:** solving the weak-acid equilibrium exactly,
  without treating the acid left in solution as wholly undissociated, gives C = 0.1010 M and
  k = 1.455 — a 3.0% shift. The question's round numbers (Kₐ = 1.0 × 10⁻⁵, pH exactly 3.0) are chosen
  so the standard approximation lands on a clean 1.5, which is the intended answer.
- **Answer key cross-check:** a published worked solution for this paper follows the same steps and
  reports the same intermediate values — 10⁻³ M, 0.10 M, 0.005 mol, 0.30 g, 0.15 g, n = 1 — and the
  same answer, 1.5 L mol⁻¹. IIT Roorkee's official key was not retrievable at the time of writing.
- **Headless-browser run:** 98 assertions — the balance animation, the deliberate wrong divisor being
  refused, the charcoal addition, mass conservation mid-shake and at equilibrium, the pH meter
  settling, the six-step Kₐ reasoning revealing progressively, the mass balance splitting 0.45 into
  0.30 and 0.15, the slope slider driving n, the 0.15-versus-0.10 concentration trap, the slope
  triangle, the gate, badges, celebration, traps, progressive hints, experiment/explain modes,
  teacher mode, theme toggle, clean console and zero horizontal overflow at 390 px and 360 px.

---

## What the simulation lets you do

The page is a four-bench adsorption laboratory. This is a numerical-answer question with no printed
options, so the four benches test the four **decisions** on the way to *k*, and none of them will
settle anything until you have committed to a prediction.

1. **02 Bench A — weigh it, dissolve it.** A digital balance counts up to 0.45 g, a measuring
   cylinder empties into the flask, and the acid disperses through the water. The mole calculation
   appears one line at a time as you act. The volume conversion is a *choice*: pick "÷ 50" and the
   bench shows you the 0.00015 it produces and explains why it is moles per millilitre.
2. **03 Bench B — charcoal, and the shaker.** Forty-five dots, one per 0.01 g of acid, move through
   the liquid, bounce off the charcoal grains and snap onto the surface. The flask rocks while you
   shake it and stops itself at equilibrium. A live tally shows acid in solution, acid on the
   charcoal and the total — and the total never leaves 0.45 g, which is what settles the claim that
   charcoal "removes" the acid.
3. **04 Bench C — the pH meter, and the mass balance.** The probe descends and the reading settles on
   3.00. Then a six-step reasoning card walks from that reading through [H⁺], the dissociation
   equilibrium and Kₐ to the equilibrium concentration, 0.10 M — a hundred times the [H⁺]. The mass
   bar then splits 0.45 g into the 0.30 g still dissolved and the 0.15 g on the surface, and *x/m*
   appears.
4. **05 Bench D — the Freundlich plot.** The slope is *not* handed to you. Drag it until it matches
   the line the question describes; a slope triangle reports rise, run and rise/run so 1/n is read
   off rather than recalled, and the intercept is marked at log C = 0 and labelled log k as a second
   route to the same number. A concentration switch lets you deliberately build the commonest wrong
   answer — k = 1.0 from the initial 0.15 M — and be told which quantity the isotherm actually needs.
5. **06 Evidence board** — the notebook, a final record that fills in quantity by quantity, seven
   expandable JEE traps, and predict-then-check against what you measured.
6. **07 Step-by-step solution** — unlocked once all four benches have been run.

An **Experiment / Explain** toggle overlays short conceptual notes on every bench without leaving the
experiment. Progressive hints sit on each bench, there is an auto-play walkthrough that pauses at
each prediction, and a teacher mode with objectives, the expected wrong answers ranked by frequency,
a teaching order and a discussion question.
