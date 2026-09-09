# ADV-2026-P2-CHE-Q12

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.12 (Section 3 — numerical value, +4 full / 0 otherwise, no negative marking)
**Source:** `papers/adv_2026_paper_2.pdf`, page 28

---

## Question (verbatim)

In a solvent S, a compound B is partially dissociated into C and D as given below:

```
B ⇌ 2C + 2D
```

B, C and D are non-volatile in nature. The molar mass of B is 10 times the molar mass of S. The
standard boiling point and the standard enthalpy of vaporization of S are 400 K and 10R J mol⁻¹,
respectively (R is the gas constant in J K⁻¹ mol⁻¹). A solution of B in S with an initial
concentration of B as 0.25% (mass/mass) has a boiling point of 408 K at 1 bar pressure. In this
solution, the mole percent of B that has been dissociated is ______.

**Answer: 33.33**

---

## Solution

### 1. Kb is not looked up — it is built

No table of ebullioscopic constants is given, and none is needed. The thermodynamic definition is

```
Kb = R (Tb°)² M_S / ΔH_vap        with M_S in kg mol⁻¹
```

and because ΔH_vap is quoted as *10R*, the gas constant cancels before any arithmetic starts:

```
Kb = R(400)² (M_S/1000) / (10R) = 16 M_S   K kg mol⁻¹      (M_S in g mol⁻¹)
```

### 2. 0.25 % (m/m) as a molality

0.25 g of B per 100 g of solvent, and M_B = 10 M_S:

```
n_B = 0.25 / (10 M_S) mol   in   0.100 kg of S
m   = 0.25 / (10 M_S × 0.100) = 0.25 / M_S    mol kg⁻¹
```

### 3. The molar mass of the solvent cancels

This is the move the question is really testing. Kb carries one factor of M_S and the molality
carries one factor of 1/M_S:

```
Kb · m = (16 M_S) × (0.25 / M_S) = 4.000 K
```

So the identity of the solvent never enters the answer — which is exactly why it was never given.

### 4. The van't Hoff factor, read off the thermometer

```
ΔTb = 408 − 400 = 8 K
i   = ΔTb / (Kb m) = 8 / 4 = 2
```

An undissociated solution would have boiled at 404 K; the second 4 K is entirely the work of the
dissociation.

### 5. Count the particles the dissociation makes

Start with 1 mol of B and let a fraction α break up. Each one produces 2 C and 2 D — four particles
from one:

```
B ⇌ 2C + 2D :   (1 − α) + 2α + 2α = 1 + 3α
```

Limits: α = 0 gives i = 1, complete dissociation gives i = 4.

### 6. Solve for α

```
1 + 3α = 2   ⟹   α = 1/3 = 0.3333
mole percent dissociated = 33.33 %
```

### 7. Answer

**33.33 %**

Marking: +4 for 33.33, 0 otherwise. No negative marking.

---

## A note on the 0.25 % reading

Read strictly, "0.25 % (mass/mass)" means 0.25 g of B in 100 g of *solution*, leaving 99.75 g of
solvent. That gives Kb·m = 1600/399 = 4.0100 K, i = 1.99500 and α = 33.17 %. The paper's numbers are
chosen so that the conventional reading — 0.25 g of B per 100 g of *solvent* — lands on i = 2 exactly
and a clean 33.33 %, and that is the intended answer; the published solution takes the same route.
The difference is 0.5 %, well inside the two-decimal tolerance of the question only if the intended
reading is used, so the distinction is worth stating rather than hiding.

---

## Independent verification

- **Derived before anything was looked up.** Kb from thermodynamics, the molality from the mass
  percent, i from the measured rise and α from the stoichiometry — all fixed from first principles,
  and only then compared with a published solution.
- **The cancellation checked symbolically,** with M_S carried as a free symbol: Kb·m reduces to the
  constant 4, so the result holds for every solvent rather than merely for the values tried. The
  simulation sweeps M_S from 10 to 250 g mol⁻¹ and the product never leaves 4.000000.
- **Back-substitution.** Putting α = 1/3 back into ΔTb = i Kb m with M_S = 12, 20, 33.3, 58.5 and
  180 g mol⁻¹ returns 8.000000 K and a boiling point of exactly 408 K in every case.
- **Limiting cases.** i = 1 + 3α gives i = 1 at α = 0 and i = 4 at α = 1, bracketing boiling points
  of 404 K and 416 K. The measured 408 K sits inside that window, so a *partially* dissociated
  solution is consistent with the data, as the question states.
- **Units by dimensional analysis.** Kb in K kg mol⁻¹ times m in mol kg⁻¹ leaves kelvin, and i is
  dimensionless, so ΔTb comes out in kelvin as it must.
- **The distractors reproduced deliberately.** i = 1 + α gives α = 100 %, which the word *partially*
  rules out; ignoring dissociation gives 404 K, not 408; using Tb in place of ΔTb gives i = 102,
  far above the ceiling of 4; ignoring the factor of ten in M_B multiplies the molality by ten and
  gives a rise of 80 K. None of them is 33.33.
- **Answer key cross-check.** A published worked solution for this paper follows the same route —
  Kb = 16 M_S, Kb·m = 4, i = 2, i = 1 + 3α — and reports the same 33.33. IIT Roorkee's official key
  was not retrievable at the time of writing.
- **Headless-browser run:** 80 assertions driving the finished page end to end — both dials across
  their full range, the particle scene splitting exactly 6 of 12 units at 50 % and catching one
  mid-split at a fractional setting, the seven gauges, the live equation chain, the chart, the
  thermometer, Kb·m holding at 4.000 across a full sweep of M_S, the answer appearing nowhere before
  the match, the meter locking at 408.00 K, the trial and solvent logs, theme toggle, clean console,
  zero horizontal overflow at 390 px and 360 px, and the whole bench measuring 662 px so it fits in
  one window.

**Status: verified — 2026-09-09.**

---

## What the simulation lets you do

The whole experiment is **one screen**: a beaker of solvent S boiling on a hotplate with a digital
thermometer in it, seven live gauges, the equation chain, a chart, and two dials underneath. Nothing
about the run requires scrolling.

- **Break up the B.** The first dial is the unknown itself — the mole percent of B that has
  dissociated. Twelve drawn units of B sit in the flask; as the dial turns, each one *visibly comes
  apart* into two blue C and two orange D, with the unit at the fractional boundary caught
  mid-split, so the transformation is always on screen rather than a before-and-after swap.
- **Watch the count and the temperature move together.** The bay caption counts the particles
  (12 → 24 at the answer), the gauges show i, and the thermometer bar climbs towards the dashed
  408 K line that the question quotes. The status line reports the gap in kelvin and which way to
  go, without ever naming the answer.
- **Discover why the solvent is not given.** The second dial is the molar mass of S — a quantity the
  question never supplies. Turning it multiplies Kb and divides the molality by the same factor, and
  the gauge for Kb × m stays at 4.000 K while the thermometer does not move at all. Every solvent
  tried is logged in a small table, and the notebook says so in words once three have been tried.
- **Lock the meter.** When the thermometer reaches 408.00 K the instrument snaps to the exact
  reading, the flask shows 4 of the 12 units broken up — 8 whole B plus 16 fragments — and the
  answer box, the record of the run and the full derivation all unlock together.
- Alongside: a log of readings you choose to keep, four cards on the wrong answers this question
  actually produces (100, 404 K, 102, and hunting for a molar mass that is not there), a record of
  the run that fills in quantity by quantity, and the step-by-step solution with a verification log.
