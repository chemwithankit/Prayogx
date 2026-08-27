# ADV-2026-P2-CHE-Q06

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.6 (Section 2 — one or more correct, +4 full / partial / 0 / −1)
**Source:** `papers/adv_2026_paper_2.pdf`, page 24

---

## Question (verbatim)

Correct statement(s) about the compounds **P**, **Q** and **R** is(are)

```
Xe(g)  +  F₂(g)          ——873 K, 7 bar——>   P
        (1 : 5 ratio)

P      +  O₂F₂           ————143 K————>      Q  +  O₂

Q      +  H₂O            —complete hydrolysis—>   R  +  HF
```

- **(A)** P has two lone pairs of electrons on the central atom.
- **(B)** Q has a perfect octahedral geometry.
- **(C)** Q can act as a fluorinating agent.
- **(D)** The molecular structure of R is trigonal pyramidal.

**Answer: (A), (C) and (D)**

---

## Solution

### 1. Identify P from the stoichiometry

Xenon and fluorine give three fluorides, and the mixture ratio picks which one:

| Xe : F₂ | Conditions | Product |
|---|---|---|
| 2 : 1 | 673 K, 1 bar | XeF₂ |
| **1 : 5** | **873 K, 7 bar** | **XeF₄** |
| 1 : 20 | 573 K, 60–70 bar | XeF₆ |

The printed conditions are exactly the middle row.

```
Xe + 2F₂  ——873 K, 7 bar——>  XeF₄        P = XeF₄
```

### 2. O₂F₂ at 143 K pushes P up one fluoride

Dioxygen difluoride is a violent low-temperature fluorinating agent; it donates two fluorine atoms
and leaves as O₂.

```
XeF₄ + O₂F₂  ——143 K——>  XeF₆ + O₂       Q = XeF₆
```

Fluorine bookkeeping: 4 (from XeF₄) + 2 (from O₂F₂) = 6. Xenon goes from +4 to +6.

### 3. Complete hydrolysis of Q

Partial hydrolysis would stop at XeOF₄ or XeO₂F₂; the word *complete* takes it all the way.

```
XeF₆ + 3H₂O  ⟶  XeO₃ + 6HF                R = XeO₃
```

Xenon stays at +6 — this is a substitution, not a redox step.

### 4. (A) XeF₄ — two lone pairs

```
Xe has 8 valence electrons · 4 go into Xe–F bonds · 8 − 4 = 4 left = 2 lone pairs
```

Steric number 6 → octahedral electron geometry; the two lone pairs take the axial positions, so the
four fluorines are square planar. **(A) is correct.**

### 5. (B) XeF₆ — one lone pair, so not a perfect octahedron

```
8 valence electrons − 6 bonds = 2 left = 1 lone pair · steric number 7
```

Seven electron pairs cannot arrange octahedrally. The lone pair caps one triangular face and pushes
the three fluorines around it apart, giving a distorted (capped) octahedron with C₃ᵥ symmetry.
A perfect octahedron requires six equivalent bonds and no lone pair. **(B) is incorrect.**

### 6. (C) XeF₆ is a fluorinating agent

Xenon is at +6, held there by six fluorines. Anything that will accept fluorine takes it, and the
xenon is reduced:

```
XeF₆ + 3H₂  ⟶  Xe + 6HF
SF₄ + XeF₆  ⟶  SF₆ + XeF₄
XeF₆ + 3Hg  ⟶  Xe + 3HgF₂
```

All three xenon fluorides fluorinate; the hexafluoride is the strongest. **(C) is correct.**

### 7. (D) XeO₃ — trigonal pyramidal

```
8 valence electrons − (3 × 2 for three Xe=O bonds) = 2 left = 1 lone pair
```

Three bond pairs and one lone pair: steric number 4, tetrahedral electron geometry, and the atoms
form a pyramid like NH₃, with O–Xe–O squeezed to about 103°. **(D) is correct.**

### 8. Answer

**(A), (C) and (D)**

Marking: +4 only for all three; +3 for any two; +1 for one alone; −1 for including (B).

---

## Independent verification

- **Shapes from counting, not memory:** every geometry is derived by one routine — valence electrons
  minus bonding electrons, halved — applied identically to XeF₂, XeF₄, XeF₆ and XeO₃.
- **Atom balance:** all three steps balance element by element, checked in the ledger the simulation
  displays.
- **Oxidation-state ladder:** +4 → +6 → +6, confirming the O₂F₂ step is the only redox step.
- **Why (B) fails precisely:** perfect octahedral needs steric number 6 with zero lone pairs; XeF₆ has
  steric number 7.
- **Distractor audit:** (B) is believable because XeF₆ *looks* octahedral on paper and is often drawn
  that way. The trap is the difference between six bonds and seven electron pairs.
- **Literature cross-check:** XeF₄ square planar (D₄ₕ), XeF₆ distorted octahedral (fluxional C₃ᵥ),
  XeO₃ trigonal pyramidal with O–Xe–O ≈ 103°.
- **Answer key cross-check:** derived independently first, then compared against a published key and
  worked solution for this paper, which agree on (A), (C) and (D). IIT Roorkee's official key was not
  retrievable at the time of writing.
- **Headless-browser run:** 47 assertions — every control, both product-selection boundaries
  (ratio and pressure), the full chain with atom ledgers, all four molecule models with their
  bond/lone-pair counts, the fluorinating assay including an argon control, the gate, predictions,
  theme toggle, clean console, zero horizontal overflow at 390 px and 360 px.

---

## What the simulation lets you do

1. **02 The fluorination reactor** — set the Xe : F₂ ratio, temperature and pressure and see which
   fluoride you actually make, on a log-scale map with the three standard recipes marked.
2. **03 The chain** — walk P → Q → R one step at a time, with each step's atom ledger balancing in
   front of you, plus a fluorinating assay that offers Q four substrates (one of them a control).
3. **04 Molecule bench** — rotate real 3D models of XeF₂, XeF₄, XeF₆ and XeO₃, with the electron
   bookkeeping that produces each shape shown alongside.
4. **05 Verdict on A–D** — predict each statement, then check it against your own measurements.
5. **06 Step-by-step solution** — unlocked once all four statements have been tested.
