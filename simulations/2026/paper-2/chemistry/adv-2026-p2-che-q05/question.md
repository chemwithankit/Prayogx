# ADV-2026-P2-CHE-Q05

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.5 (Section 2 — one or more correct, +4 full / +2 partial / 0 / −1)
**Source:** `papers/adv_2026_paper_2.pdf`, page 22

---

## Question (verbatim)

For a first-order reaction **R ⟶ P** at a given temperature, *k* is the rate constant. For this
reaction, at the given temperature, the concentrations of **R** and **P** at a time *t* are [**R**]
and [**P**], respectively. The correct graphical representation(s) for this reaction is(are)

The four printed options are graphs:

| Option | Axes (y vs x) | What the printed curve shows |
|---|---|---|
| (A) | [P] vs *t* | rises from the origin, **concave up** — flat at first, steepening |
| (B) | d[R]/d*t* vs [R] | **straight line through the origin with positive slope** |
| (C) | d[P]/d*t* vs *t* | starts at a maximum and **decays** towards zero |
| (D) | *k* vs *t* | **horizontal line** |

**Answer: (C) and (D)**

---

## Solution

### 1. Write the rate law and integrate it

First order in R means the rate is proportional to [R], with a single constant of proportionality *k*:

```
rate = −d[R]/dt = k[R]        ⟹        [R] = [R]₀ e^(−kt)
```

R only becomes P, so whatever R loses, P gains:

```
[P] = [R]₀ − [R] = [R]₀ (1 − e^(−kt))
```

### 2. (A) [P] against *t* — the curvature is wrong

```
d[P]/dt  = k[R]₀ e^(−kt)
d²[P]/dt² = −k² [R]₀ e^(−kt) < 0   for all t
```

The slope is largest at *t* = 0 and decays to zero, so [P] rises **fast at first and then flattens**
onto the plateau [R]₀ — concave **down**. The printed graph starts flat and gets steeper, which is
concave up. **(A) is incorrect.**

### 3. (B) d[R]/d*t* against [R] — the sign is wrong

```
d[R]/dt = −k[R]
```

That is a straight line through the origin, so the printed **shape** is right — but its slope is
**−k**, a negative number. R is being consumed, so d[R]/d*t* is negative at every instant and the
line must fall **below** the axis. The printed line rises above it. **(B) is incorrect.**

Had the axis been labelled −d[R]/d*t*, or simply "rate", the printed graph would have been right —
which is exactly the trap.

### 4. (C) d[P]/d*t* against *t* — correct

```
d[P]/dt = +k[R] = k[R]₀ e^(−kt)
```

Positive throughout, starting at its maximum *k*[R]₀ and decaying exponentially to zero as R runs
out — an exponential decay curve, exactly as printed. **(C) is correct.**

### 5. (D) *k* against *t* — correct

The question fixes the temperature. The rate constant depends on temperature through

```
k = A e^(−Ea/RT)
```

and on nothing else — time does not appear. It is a constant of the reaction at that temperature, so
plotting it against *t* gives a horizontal line. **(D) is correct.**

> The *rate* falls as the reaction proceeds; the *rate constant* does not.

### 6. Answer

**(C) and (D)**

Marking: +4 only for choosing both; +2 for either one alone; −1 for including (A) or (B).

---

## Independent verification

- **Sign swept over the whole run:** the largest value d[R]/d*t* reaches is −7×10⁻⁴ M s⁻¹ — it is
  never positive, so the line in (B) cannot rise.
- **Linearity check for (B):** a least-squares fit of d[R]/d*t* against [R] returns slope
  −0.3000 = −*k* exactly, so the printed straight-line-through-the-origin shape is right and only the
  sign is wrong.
- **Curvature check for (A):** d²[P]/d*t*² evaluated across the run is negative everywhere (maximum
  −2×10⁻⁴ M s⁻²), so [P] against *t* is concave down.
- **Exponential decay check for (C):** the ratio of d[P]/d*t* at *t* = 0 to its value at *t* = 1/*k*
  is 2.7196 ≈ e, the signature of a true exponential; monotonically decreasing and positive
  throughout.
- **Half-life independence:** computed for [R]₀ = 0.5, 1, 2 and 5 M, the half-life is 2.3105 s every
  time — matching ln2/*k* and confirming genuine first-order behaviour across the whole input range,
  not just at the default values.
- **Dimensional check:** *k*[R] has units s⁻¹ × mol L⁻¹ = mol L⁻¹ s⁻¹, which is a rate. A first-order
  *k* is s⁻¹ and carries no concentration unit, which is why it cannot drift with time or with [R].
- **Distractor audit:** (A) confuses the shape of [P] with the shape of an exponential *growth*;
  (B) is the classic missing-minus-sign — the magnitude plot −d[R]/d*t* vs [R] would have been
  correct. Both are single, believable slips, which is why the sign and the curvature both have to be
  checked explicitly.
- **Live model:** the simulation derives every verdict from the samples the student logs, using the
  same integrated rate law — it holds no stored answer key.
- **Headless-browser run:** every control driven (typed `1/2`, `5e-1`, out-of-range and non-numeric
  input, sliders, steppers, both k modes, run / pause / resume / speed / reset / scrub), two runs
  completed, all four sets of axes inspected, gate opened, answer resolved to (C) and (D), console
  clean, zero horizontal overflow at 390 px and 360 px.

---

## What the simulation lets you do

1. **02 The reactor** — set [R]₀ and *k* (directly, or through *T* via Arrhenius, as a constraint
   model), then run the vessel. Particle counts track the concentrations, the meters and the live
   integrated rate law update together, and samples are logged as the run proceeds.
2. **03 Plot your data** — switch between the four printed sets of axes. Your own logged samples are
   replotted on each one, with the shape the printed option shows drawn behind for comparison.
3. **04 Half-life trials** — every completed run is logged with the half-life *measured from your own
   samples*. Change [R]₀ and it does not move; change *k* and it does, with *k*·t½ staying at ln2.
4. **05 Verdict on A–D** — commit to a prediction for each option, then check it against what you
   measured.
5. **06 Step-by-step solution** — unlocked after two runs and all four sets of axes, or by choosing to
   reveal it early.
