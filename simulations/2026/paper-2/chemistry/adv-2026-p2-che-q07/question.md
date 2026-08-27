# ADV-2026-P2-CHE-Q07

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.7 (Section 2 — one or more correct, +4 full / partial / 0 / −1)
**Source:** `papers/adv_2026_paper_2.pdf`, page 25

---

## Question (verbatim)

The correct statement(s) regarding the periodic properties of elements is(are)

- **(A)** Second ionization enthalpy of carbon atom is less than that of boron atom.
- **(B)** Increasing order of ionic radii: Al³⁺ < Mg²⁺ < Na⁺
- **(C)** Under identical conditions, in solid state, the density of potassium metal is more than
  density of sodium metal.
- **(D)** The H–H bond is weaker than F–F bond.

**Answer: (A) and (B)**

---

## Solution

### 1. (A) Second ionisation enthalpy — look at what is left behind

The second ionisation removes an electron from the **cation**, so write the cation configurations,
not the neutral atoms':

```
B⁺ : 1s² 2s²            C⁺ : 1s² 2s² 2p¹
```

B⁺ has a filled, strongly penetrating 2s subshell — a stable arrangement that resists losing another
electron. C⁺ only has to give up a lone 2p electron, which is higher in energy and better shielded.

```
IE₂(C) = 2352.6 kJ mol⁻¹  <  IE₂(B) = 2427.1 kJ mol⁻¹
```

Note the reversal: IE₁ rises across the period (B 800.6 < C 1086.5), but IE₂ falls.
**(A) is correct.**

### 2. (B) Isoelectronic ions — only the nucleus changes

Na⁺, Mg²⁺ and Al³⁺ each have exactly 10 electrons. With the electron count fixed, shielding is
essentially fixed too, so the effective nuclear charge tracks the proton count.

| Ion | Z | electrons | radius / pm |
|---|---|---|---|
| Na⁺ | 11 | 10 | 102.0 |
| Mg²⁺ | 12 | 10 | 72.0 |
| Al³⁺ | 13 | 10 | 53.5 |

More protons pulling the same ten electrons means a smaller ion, so
**Al³⁺ < Mg²⁺ < Na⁺** — exactly the printed order. **(B) is correct.**

### 3. (C) Density down group 1 — the one place the trend breaks

Density is mass per unit volume, and both rise going down the group. Usually mass wins. Between
sodium and potassium it does not: the atomic volume jumps more than the atomic mass does.

```
Li 0.534 · Na 0.968 · K 0.856 · Rb 1.532 · Cs 1.879   g cm⁻³
```

Potassium is **less** dense than sodium — the only inversion in the group, and the reason both float
on water while the heavier members do not. The statement claims the opposite. **(C) is incorrect.**

### 4. (D) H–H against F–F — not close

```
H–H = 436 kJ mol⁻¹        F–F = 158.8 kJ mol⁻¹
```

H–H is one of the strongest single bonds there is: two 1s orbitals overlapping with nothing else in
the way. F–F is anomalously **weak** — the two fluorines are small, so the three lone pairs on each
sit close enough to repel strongly, and there are no d orbitals to relieve it. F–F is even weaker
than Cl–Cl (242) and Br–Br (193).

The statement has it backwards by a factor of nearly three. **(D) is incorrect.**

### 5. Answer

**(A) and (B)**

Marking: +4 for both; +2 for either one alone; −1 for including (C) or (D).

---

## Independent verification

- **Ionisation reversal is real, not a rounding artefact:** the gap is 2427.1 − 2352.6 = 74.5
  kJ mol⁻¹, far outside any measurement uncertainty, and it is explained by the configurations of
  the cations rather than the atoms.
- **Isoelectronic check:** all three ions were confirmed to hold exactly 10 electrons before their
  radii were compared — the trend statement is only meaningful within an isoelectronic set.
- **Density is measured, not asserted:** the bench weighs a fixed 1 cm³ of each metal, so the Na/K
  inversion appears as an actual reading rather than a remembered fact.
- **Bond enthalpies checked across the whole halogen series:** Cl–Cl 242 > Br–Br 193 > F–F 158.8 >
  I–I 151 kJ mol⁻¹. Fluorine sits out of place — weaker than both chlorine and bromine despite being
  the smallest — which is the anomaly (D) trips over.
- **Distractor audit:** (C) is believable because density does rise down almost every group; (D) is
  believable if you assume a small atom always makes a strong bond. Both are correct-sounding
  generalisations with a famous exception.
- **Answer key cross-check:** derived independently first, then compared against a published key and
  worked solution for this paper, which agree on (A) and (B) and quote the same values. IIT Roorkee's
  official key was not retrievable at the time of writing.
- **Headless-browser run:** 30 assertions — periodic table selector, electron stripping on both
  elements with the correct orbital reported, comparison selector, isoelectronic sweep across all
  three ions, both bulk benches, the gate, predictions, theme toggle, clean console, zero horizontal
  overflow at 390 px and 360 px.

---

## What the simulation lets you do

1. **02 Ionisation bench** — pick an element from period 2 and pull electrons off one at a time,
   watching which orbital each one leaves from, against a bar chart of successive ionisation energies
   with a comparison element overlaid.
2. **03 Isoelectronic bench** — hold the electron count at ten and drag the proton count from O²⁻ to
   Al³⁺, with the ion drawn to scale.
3. **04 Bulk bench** — weigh a fixed cubic centimetre of each alkali metal, then break H–H against the
   four halogen bonds with a stretch slider that reports the work done.
4. **05 Verdict on A–D** — predict each statement, then check it against your own measurements.
5. **06 Step-by-step solution** — unlocked once all four statements have been tested.
