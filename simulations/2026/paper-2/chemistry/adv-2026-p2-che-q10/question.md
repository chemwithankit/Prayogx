# ADV-2026-P2-CHE-Q10

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.10 (Section 3 — non-negative integer, +4 full / 0 otherwise, no negative marking)
**Source:** `papers/adv_2026_paper_2.pdf`, page 26

---

## Question (verbatim)

Xᵃ⁺ and Yᵇ⁺ are hydrogen-like species. The wavelength of light absorbed during the transition between
the states with principal quantum numbers *n* = 1 and *n* = 2 of Xᵃ⁺ is λ. The wavelength of light
absorbed during the transition between the states with principal quantum numbers *n* = 2 and *n* = 4
of Yᵇ⁺ is 9λ. The lowest possible value of (a + b) is ______.

**Answer: 3**

---

## Solution

### 1. What "hydrogen-like" fixes

A hydrogen-like species has **exactly one electron**. The number of protons is free — H, He⁺, Li²⁺,
Be³⁺ and even U⁹¹⁺ all qualify. That single electron is the only condition under which the Bohr
result is allowed to run:

```
E_n = −13.6 Z² / n²  eV          1/λ = R Z² (1/n₁² − 1/n₂²)
```

It also fixes the bookkeeping needed at the very end: one electron and Z protons means the charge is
**Z − 1**, so **Z = a + 1**. Two of the four ways to lose this mark die right here.

### 2. Both transitions, written out

```
X:  n = 1 → 2      1/λ      = R Z_X² (1/1² − 1/2²)  = R Z_X² · 3/4
Y:  n = 2 → 4      1/(9λ)   = R Z_Y² (1/2² − 1/4²)  = R Z_Y² · 3/16
```

The two geometric factors are 3/4 and 3/16. The 3's are about to cancel, which is why this question
comes out in whole numbers.

### 3. Divide — the constants disappear

```
λ_Y / λ_X = [Z_X² · 3/4] ÷ [Z_Y² · 3/16] = 4 Z_X² / Z_Y² = 9
```

```
Z_X² / Z_Y² = 9/4     ⟹     Z_X : Z_Y = 3 : 2
```

Neither R nor λ ever had to be known. That is what makes this a ratio question rather than a
calculation.

The factor of 4 is the whole difficulty: dropping it gives Z_X : Z_Y = 3 : 1 and the wrong answer 4.

### 4. Smallest integers that fit

Z must be a whole number, so (Z_X, Z_Y) = (3m, 2m) for m = 1, 2, 3 … The smallest is:

```
Z_X = 3  →  lithium          Z_Y = 2  →  helium
```

### 5. Atomic number is not the charge

Each ion keeps one electron, so subtract it:

```
a = Z_X − 1 = 3 − 1 = 2      ⟹   Xᵃ⁺ = Li²⁺
b = Z_Y − 1 = 2 − 1 = 1      ⟹   Yᵇ⁺ = He⁺
```

Stopping at Z_X + Z_Y = 5 is the single commonest way to lose this mark.

### 6. Confirm that m = 1 is really the minimum

```
a + b = (3m − 1) + (2m − 1) = 5m − 2       →   3, 8, 13, 18, …
```

That increases with m, so m = 1 gives the lowest value. Both ions are genuinely positive there
(a = 2, b = 1), which the notation Xᵃ⁺, Yᵇ⁺ requires.

### 7. Answer

```
a + b = 2 + 1 = 3
```

Marking: +4 for 3, 0 otherwise. No negative marking, so there is never a reason to leave this blank.

---

## Independent verification

- **Derived before anything was looked up.** The one-electron condition, the ratio, the pair (3, 2)
  and the final subtraction were all fixed from the Bohr result alone, and only then compared with a
  published solution.
- **Geometric factors computed as exact fractions,** not decimals: 1 − 1/4 = 3/4 and 1/4 − 1/16 =
  3/16, whose quotient is exactly 4. The condition is therefore 4Z_X²/Z_Y² = 9 with no rounding
  anywhere in it.
- **Brute force over every integer pair** with 1 ≤ Z ≤ 60: the pairs giving a wavelength ratio of
  exactly 9.000000 are (3,2), (6,4), (9,6), (12,8) … — every one in the ratio 3 : 2, and none outside
  it. The smallest is (3, 2).
- **Two independent numerical routes agree.** Bohr energies with the Rydberg energy 13.605693 eV give
  λ_X = 13.5003 nm and λ_Y = 121.5023 nm; the Rydberg constant 1.0973732 × 10⁷ m⁻¹ gives the same two
  numbers. Their quotient is 9.0000000000.
- **ΔE/Z² checked to be constant** at 2.5511 eV across Z = 1, 2, 3, 4 and 6 for n = 2 → 4, confirming
  the Z² scaling the whole argument rests on.
- **The direction of the ratio checked:** reversing it to Z_X : Z_Y = 2 : 3 gives 1.7778, and two
  hydrogen atoms give exactly 4 — neither is 9.
- **The minimum proved, not assumed:** a + b = 5m − 2 was confirmed strictly increasing, and both ions
  confirmed genuinely positive at m = 1.
- **The traps reproduced deliberately:** Z_X + Z_Y = 5 is a different number from a + b = 3, and
  dropping the factor of 4 gives 3 : 1 rather than 3 : 2.
- **Answer key cross-check:** a published worked solution for this paper reports the same intermediate
  values — Z_X = 3, Z_Y = 2, a = 2, b = 1 — and the same answer, 3. IIT Roorkee's official key was not
  retrievable at the time of writing, so this is a coaching-institute solution that agrees with the
  independent derivation at every step rather than only on the final number.
- **Headless-browser run:** 88 assertions — the ion foundry and its refusal to apply Bohr to a
  two-electron species, the spectrometer with a deliberately mistuned photon passing through and a
  matched one being absorbed, the recorded lines and the spectrum strip, the Z² chart, the ratio
  hunter locking only on multiples of (3, 2), the self-stopping sweep, the charge tally, the m study
  staying blank until it is earned, the gate, badges, celebration, traps, progressive hints, teacher
  mode, theme toggle, clean console and zero horizontal overflow at 390 px and 360 px.

---

## What the simulation lets you do

The page is a four-bench spectroscopy laboratory. This is an integer-answer question with no printed
options, so the four benches test the four **decisions** the question hides, and none of them will
settle anything until you have committed to a prediction.

1. **02 Bench A — the ion foundry.** Add protons one at a time and strip electrons off the outside.
   The nucleus is drawn proton by proton so you can count it, the species names itself as you go
   (H, He⁺, Li²⁺, Be³⁺ …), and the picture tells you outright when Bohr's formula stops applying
   because there is more than one electron on board. The bench refuses to settle the first claim until
   you have built two hydrogen-like species with different atomic numbers.
2. **03 Bench B — the absorption spectrometer.** Tune the source, fire a photon and watch it travel.
   Miss the gap and it flies through the sample to the detector; match it and it vanishes into the
   atom, the electron jumps up the ladder, and a moment later it falls back and re-emits. Every
   absorbed photon leaves a dark line on a logarithmic spectrum strip, where you can see that neither
   of this question's two lines is visible light. A chart of ΔE against Z shows the Z² law directly.
3. **04 Bench C — the ratio hunter.** Both ions at once, each locked to its own transition, with two
   atomic-number dials and a live λ_Y/λ_X readout. It only locks at 9.0000, and only ever on multiples
   of (3, 2) — which is the argument of the question made into an action. A sweep helper will walk
   Z_X upwards and stop itself the moment it locks.
4. **05 Bench D — the charge counter.** Count the protons and the single electron on each ion, watch
   the tally turn Z into a and b, and then slide m to see a + b = 5m − 2 growing — so the minimum is
   demonstrated rather than asserted.
5. **06 Evidence board** — the notebook, seven expandable JEE traps, and predict-then-check against
   what you measured.
6. **07 Step-by-step solution** — unlocked once all four benches have been run.

Progressive hints sit on every bench, there is an auto-play walkthrough that pauses at each
prediction, and a teacher mode with objectives, the expected wrong answers ranked by frequency, a
teaching order and a discussion question.
