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
- **Headless-browser run:** 93 assertions driving the whole flow — the empty instrument panel with
  the answer nowhere on it, inline validation of unreadable and out-of-range entries, the Run button
  arming only on complete data, each of the six steps in turn (the flask filling and reaching the
  entered boiling point, B appearing as twelve units, the undissociated boil landing on 404 K, the
  shortfall band, units splitting mid-run, the final count of 24), pause and resume genuinely
  freezing and restarting the clock, the answer absent until the last step, the result panel and the
  gate, the model checked to be general rather than hard-coded to the paper, refusals for a
  measurement below the undissociated value and above the full-dissociation ceiling, one C and one D
  reproducing the 100 % distractor, the solvent sweep holding Kb·m at 4.000, theme toggle, clean
  console, zero horizontal overflow at 390 px and 360 px, and the whole bench under 700 px so it
  fits in one window.

**Status: verified — 2026-09-09.**

---

## What the simulation does

The page is an experiment you set up and run, not a calculation you read. It has three phases, all
on one screen.

### 1 — Enter the data

The instrument panel has one box for every quantity the question gives you, and nothing else:

| box | what the question calls it |
| --- | --- |
| Boiling point of pure S | the standard boiling point of the solvent, 400 K |
| Enthalpy of vaporisation of S | quoted as a multiple of R — enter 10 |
| Molar mass of B ÷ that of S | “10 times the molar mass of S” |
| Concentration of B | 0.25 % (m/m), i.e. grams of B per 100 g of solvent |
| Boiling point of the solution | the one measurement, 408 K |
| What one B breaks into | B ⇌ **2** C + **2** D |

There is deliberately **no box for the molar mass of the solvent**, because the experiment does not
need one — which is exactly why the question never gives it. Every entry is checked as it is typed
and the reason is shown in place; **Run experiment** stays disabled until all seven boxes hold
usable values.

### 2 — Run the experiment

Pressing the button starts a six-step run, each step narrated with the student's own numbers:

1. **Boil S.** The flask fills, the hotplate glows, bubbles start, and the thermometer climbs to
   the boiling point of the pure solvent that was entered. That is the baseline.
2. **Add B.** Twelve drawn units of B drop into the liquid, and the molality appears in the working.
3. **Boil again.** With nothing dissociated, i = 1, and the flask reaches only 404 K.
4. **Compare.** The shortfall against the entered measurement is drawn as an orange band on the
   temperature scale, labelled `+4.00 K ?` — the kelvin nobody has accounted for.
5. **Dissociate.** B is allowed to break apart. Each unit visibly comes apart into two blue C and
   two orange D, the particle count climbs, and the thermometer rises with it — until it reaches
   the measurement that was entered, and stops there.
6. **Count.** Twelve dissolved, twenty-four present. That ratio is the van't Hoff factor.

Six gauges fill in only as the run establishes them; the mole percent stays blank until the last
step. The working writes itself one line at a time as the step that earns it is carried out. The
chart, drawn from the entered data, has the measurement dashed across it and a marker that travels
along the curve during step 5. Pause, resume, replay and 0.5× / 1× / 2× are available throughout,
and **change the data** returns to the panel with the entries kept.

### 3 — Read the result

The answer appears as the outcome of the run, with a plain account of how the bench got there,
quoting the student's own numbers: the pure solvent boiled at 400.00 K, dissolving B raised it to
404.00 K, the flask actually boiled at 408.00 K, so there are 2.000× as many particles as were
dissolved; one B leaves 4 particles, so 1 + 3α = 2.000 and α = 33.33 %.

### It is a model, not a script

Nothing is hard-coded to the paper. Enter different data and the bench reaches a different answer.
Enter data that cannot be reconciled and it stops at the comparison step and says why — a boiling
point below the undissociated value ("a non-volatile solute can only raise a boiling point"), or
above the ceiling that complete dissociation could reach, with that ceiling stated. Entering one C
and one D reproduces the commonest wrong reading, 100 %, as a run rather than as a warning.

Alongside: a panel that sweeps the solvent's molar mass across its whole range and shows K<sub>b</sub>
rising, the molality falling and their product never moving; a log of every run made, refusals
included; a notebook that writes itself; four cards on the wrong answers this question really
produces; a record of the run; and the step-by-step solution, gated until a run finishes.
