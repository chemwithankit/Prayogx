# ADV-2026-P2-CHE-Q09

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.9 (Section 2 — one or more correct, +4 full / partial / 0 / −1)
**Source:** `papers/adv_2026_paper_2.pdf`, page 25

---

## Question (verbatim)

The correct statement(s) regarding sugars is(are)

**Given:** Specific rotations of L-(−)-glucose and L-(+)-fructose are **−52.5°** and **+92.5°**,
respectively.

- **(A)** On treatment with HNO₃, gluconic acid is oxidized to saccharic acid, whereas glucose is not
  oxidized to saccharic acid.
- **(B)** Fructose gives a positive Fehling's test because it isomerises to glucose and another
  aldohexose in the presence of Fehling's reagent.
- **(C)** Invert sugar is an equimolar mixture of D-glucose and D-fructose formed after hydrolysis of
  the corresponding disaccharide.
- **(D)** Specific rotation of invert sugar is −40°.

**Answer: (B) and (C)**

---

## Solution

### 1. (A) HNO₃ oxidises *both* ends of a hexose

Nitric acid is a strong oxidising agent. Open-chain glucose offers it two oxidisable positions — the
C1 aldehyde and the C6 primary alcohol — and it takes both.

```
glucose  ——HNO₃——>  saccharic acid        (CHO → COOH  and  CH₂OH → COOH)
```

Gluconic acid is simply glucose whose C1 has already been oxidised, by a **mild** oxidant such as
bromine water, which stops there. Its C6 −CH₂OH is still untouched, so HNO₃ takes it to the same
dicarboxylic acid.

```
gluconic acid  ——HNO₃——>  saccharic acid   (CH₂OH → COOH)
```

Both routes land on saccharic acid. The statement's first half is fine; the clause *"whereas glucose
is not oxidized to saccharic acid"* is what breaks it. **(A) is incorrect.**

### 2. (B) Fehling's is alkaline, and alkali rearranges a ketose

Fructose has no aldehyde of its own. But Fehling's solution is strongly basic, and base removes the
acidic α-hydrogen at C1 to give a **1,2-enediol**, which can collapse back in more than one direction.

```
fructose  ⇌  1,2-enediol  ⇌  glucose
             1,2-enediol  ⇌  mannose
```

This is the Lobry de Bruyn–van Ekenstein rearrangement. It produces glucose **and mannose** — two
aldohexoses differing only at C2, which is exactly the "another aldohexose" the statement names.
Aldoses reduce Cu(II):

```
RCHO + 2Cu²⁺ + 5OH⁻  ⟶  RCOO⁻ + Cu₂O↓ + 3H₂O
```

So a ketose does give a positive test, and for exactly the reason stated. **(B) is correct.**

### 3. (C) Sucrose splits 1 : 1

```
C₁₂H₂₂O₁₁ + H₂O  ⟶  C₆H₁₂O₆ + C₆H₁₂O₆        342.30 + 18.02 = 180.16 + 180.16
```

One glycosidic bond, one water, two monosaccharides — one D-glucose and one D-fructose, in strictly
equal numbers. That equimolar mixture is what "invert sugar" names. **(C) is correct.**

### 4. Why it is called *invert* sugar

Sucrose is dextrorotatory, [α] = +66.5°. The mixture it hydrolyses into is laevorotatory. The **sign
of the rotation** flips during the reaction — the rotation inverts. Nothing about any configuration
inverts.

### 5. (D) The number is −20°, not −40°

Start from the printed data, which is for the **L** sugars. Enantiomers rotate equally and oppositely,
so the D sugars follow by a sign flip:

| printed | ⟹ | needed |
|---|---|---|
| L-(−)-glucose −52.5° | | **D-(+)-glucose +52.5°** |
| L-(+)-fructose +92.5° | | **D-(−)-fructose −92.5°** |

Invert sugar is equimolar, and glucose and fructose have the same molar mass (180.16), so equal moles
means equal mass and the specific rotation of the mixture is the plain average:

```
[α] = (+52.5 − 92.5) / 2 = −20°
```

−40° is what you get by *adding* the two and never dividing. It is the right pair of numbers with the
last step missing. **(D) is incorrect.**

### 6. Answer

**(B) and (C)**

Marking: +4 for both; +2 for either one alone; −1 for including (A) or (D).

---

## Independent verification

- **Functional groups counted, not eyeballed:** every structure was written as SMILES and matched
  against SMARTS patterns — glucose returns one aldehyde and one primary alcohol, gluconic acid one
  carboxyl and one primary alcohol, saccharic acid two carboxyls and nothing oxidisable left. That
  count is what refutes (A).
- **Isomerisation is atom-conserving:** fructose, glucose and mannose all return C₆H₁₂O₆, confirming
  the alkaline step rearranges rather than adds or removes anything.
- **Glucose and mannose confirmed as C2 epimers:** comparing assigned stereocentres, they differ at
  exactly one centre, so "another aldohexose" is a specific compound rather than hand-waving.
- **Hydrolysis mass balance:** 342.30 + 18.02 = 360.31 = 180.16 + 180.16.
- **The average computed by mass fraction, not assumed:** proper mass-weighting gives −20.000°,
  identical to the simple average, *because* the two molar masses are equal. The distinction matters
  whenever they are not.
- **The trap reproduced deliberately:** +52.5 + (−92.5) = −40 exactly, confirming the printed
  distractor is the undivided sum rather than different chemistry.
- **Sign check on the name:** sucrose +66.5° is dextrorotatory, the product mixture is laevorotatory,
  so the rotation inverts.
- **Answer key cross-check:** all four verdicts were fixed from first principles before any key was
  consulted, then compared against a published key and worked solution for this paper, which agree on
  (B) and (C). IIT Roorkee's official key was not retrievable at the time of writing.
- **Headless-browser run:** 71 assertions — the molecule explorer, both prediction gates refusing to
  run early, both oxidation flasks, the ketose and the sucrose negative control on Fehling's, the
  mechanism stepper forwards and back, hydrolysis and the balance, the D/L switch, the tile calculator
  in both its wrong (−40) and right (−20) configurations, the mixing slider at three compositions, the
  gate, badges, celebration, traps, progressive hints, teacher mode, theme toggle, clean console and
  zero horizontal overflow at 390 px and 360 px.

---

## What the simulation lets you do

The page is a four-bench laboratory. Each bench tests exactly one printed statement, and none of them
will run until you have committed to a prediction.

1. **02 Bench A — the oxidation flask.** Pick a bottle, tap any group on the Fischer projection to
   learn what HNO₃ does to it, then heat. The bench refuses to settle statement (A) on one flask alone,
   because the statement is a comparison; run both and they converge on saccharic acid.
2. **03 Bench B — Fehling's test on a ketose.** Heat fructose with Fehling's and watch Cu(II) drop out
   as brick-red Cu₂O. Sucrose is available as a real negative control, and stays blue. A four-step
   mechanism explorer walks the enediol route to glucose and mannose, with play, pause and step.
3. **04 Bench C — hydrolysing sucrose.** Tap the glycosidic bond, cut it with acid or with invertase,
   and read the balance: one of each, 1 : 1, with the rotation flipping from +66.5° to −20°.
4. **05 Bench D — the polarimeter.** Convert the printed L rotations to the D values you actually need,
   then build the calculation from tiles. You can deliberately construct the −40° answer and be told
   which step is missing before you build the right one.
5. **06 Verdict on A–D** — the notebook, six expandable JEE traps, and predict-then-check against what
   you measured.
6. **07 Step-by-step solution** — unlocked once all four benches have been run.

Progressive hints sit on every bench, there is an auto-play walkthrough that pauses at each prediction,
and a teacher mode with objectives, expected wrong answers and a suggested teaching order.
