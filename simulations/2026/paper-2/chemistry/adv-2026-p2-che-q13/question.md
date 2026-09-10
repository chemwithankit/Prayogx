# ADV-2026-P2-CHE-Q13

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.13 (Section 3 — numerical value, +4 full / 0 otherwise, no negative marking)
**Source:** `papers/adv_2026_paper_2.pdf`, page 28

---

## Question (verbatim)

Consider that the coordinating atoms of the ligands in cis-[Co(NH₃)₄Cl₂]Cl and mer-[Co(NH₃)₃Cl₃]
octahedral complexes are at the vertices of an octahedron. The sum of total number of the triangular
faces in both the complexes having one N atom and two Cl atoms at their corners is ______.

**Answer: 6**

---

## Solution

### 1. The solid first, with its sites numbered

Six donor atoms sit at the vertices of an octahedron: **6 sites, 12 edges, 8 triangular faces**.
Every face takes exactly one site from each of the three opposite pairs, which is why there are
2 × 2 × 2 = 8 of them, and Euler's formula checks out: 6 − 12 + 8 = 2.

Number the sites the way an octahedral complex normally is numbered:

```
1, 2, 3, 4   round the square plane
5, 6         the two axial sites
opposite (trans) pairs:  1-3   2-4   5-6
```

Every pair that is *not* one of those three is **cis**. So:

| term | meaning | example sites |
| --- | --- | --- |
| **cis** | 90° apart, sharing an edge | 1 and 5 (one in the plane, one axial) |
| **trans** | 180° apart, opposite ends of one axis, sharing no face | 5 and 6 |
| **fac** (facial) | three donors all mutually cis, capping one triangular face | 1, 2, 5 |
| **mer** (meridional) | one pair trans and the third cis to both, so all three on one meridian | 1, 5, 6 |

Every edge lies in exactly two faces — the fact the whole count turns on.

### 2. Read the coordination sphere off the formula

```
cis-[Co(NH3)4Cl2]Cl   ->   4 N + 2 Cl inside the brackets    (6 donor atoms)
mer-[Co(NH3)3Cl3]     ->   3 N + 3 Cl                        (6 donor atoms)
```

The third chloride of the first complex is written *outside* the brackets — it is the counter-ion,
not a ligand, and never reaches a vertex. Taking 4 N + 3 Cl would need seven vertices, which no
octahedron has; that impossibility is itself the check that the brackets were read properly.

### 3. The cis complex — one Cl–Cl edge, two faces

*cis* puts the two chlorides 90° apart — say at **1** (square plane) and **5** (axial), which are
90° apart because every plane site is 90° from every axial one. They therefore share exactly one
edge, that edge lies in two faces, and the third corner of each must be one of the four nitrogens.

```
faces with 1 N and 2 Cl in cis-[Co(NH3)4Cl2]+  =  2
```

Enumerated with Cl on **1** and **5**, the eight faces split 2 with no chloride, 4 with one, 2 with
two — and none with three.

### 4. The mer complex — a trans pair does the work

In *mer* one pair of chlorides is trans and the third is cis to both — say **5** and **6** (the
axial pair, opposite each other) plus **1** in the plane, 90° from both. Because two **opposite**
sites are both chloride, every one of the eight faces already carries one chloride from that pair.
The four faces that also run through the third chloride therefore carry two.

```
faces with 1 N and 2 Cl in mer-[Co(NH3)3Cl3]  =  4
```

The other four run through position **3**, the nitrogen opposite it, and carry 2 N + 1 Cl. Census:
0 / 4 / 4 / 0 across 0, 1, 2 and 3 chlorides — eight faces, all accounted for.

### 5. Add them

```
2 + 4 = 6
```

### 6. Answer

**6**

Marking: +4 for 6, 0 otherwise. No negative marking.

---

## Independent verification

- **Derived before anything was looked up.** The eight faces, both isomer geometries and both counts
  were enumerated from first principles, and only then compared with a published solution.
- **The faces enumerated two ways.** Taking one vertex from each opposite pair gives 8 faces; brute
  force over all C(6,3) = 20 triples, discarding those that contain an opposite pair, gives the same
  8. Euler's formula, 6 − 12 + 8 = 2, agrees.
- **Exhaustive over placements, not one drawing.** All 15 ways of seating two chlorides on six
  vertices were classified — 12 cis, 3 trans — and *every* cis placement gives exactly 2 matching
  faces, every trans placement 0. All 20 ways of seating three were classified — 8 fac, 12 mer — and
  every mer placement gives exactly 4, every fac placement 3. So the answer cannot depend on which
  vertices happen to be drawn, and the simulation reproduces that table live in section 03.
- **The census closes.** cis splits its eight faces 2 / 4 / 2 / 0 across 0, 1, 2 and 3 chlorides;
  mer splits them 0 / 4 / 4 / 0. Both sum to 8, so no face is double-counted or missed.
- **Structural cross-check by a different argument.** A face carrying two chlorides *is* a Cl–Cl
  edge, and every edge lies in two faces: cis has one such edge → 2 faces, mer has two → 4 faces.
  This reproduces the enumeration without enumerating.
- **The distractors reproduced deliberately.** fac instead of mer gives 2 + 3 = 5; trans instead of
  cis gives 0 + 4 = 4; counting 2 N + 1 Cl instead gives 4 + 4 = 8; putting the ionic chloride on a
  vertex needs seven vertices and is impossible. None of them is 6.
- **Answer key cross-check.** A published worked solution for this paper argues from the same Cl–Cl
  edges and reports the same 6. IIT Roorkee's official key was not retrievable at the time of
  writing.
- **Headless-browser run:** 133 assertions driving the whole flow — the geometry the page is built
  on (8 faces, 12 edges, Euler, all four isomer counts, the 1-to-6 site numbering and its trans
  pairs 1-3, 2-4, 5-6, and the sites each isomer seats), the exhaustive placement check, the empty
  instrument panel with the answer nowhere on it, the refusal of seven donor atoms and of a face
  pattern that does not add to three, the isomer control adapting to the numbers typed and defining
  what it was given, each of the six run steps in turn, pause and resume genuinely freezing the
  clock, the model turning to the face under inspection with the position numbers printed on it, the
  ledger and chips filling live in position numbers, the answer blinking on arrival and the blink
  stopping rather than looping, the result and the gate, browsing either complex afterwards, all
  three traps reproduced as runs, theme toggle, clean console and zero horizontal overflow at
  390 px and 360 px.

**Status: verified — 2026-09-10.**

---

## What the simulation does

The page is an experiment you set up and run, not a diagram you read. Three phases, one screen.

### 1 — Enter the data

The instrument panel has one box for every quantity the question gives, and nothing else:

| box | what the question calls it |
| --- | --- |
| Complex A — NH₃ ligands | the 4 inside the brackets of cis-[Co(NH₃)₄Cl₂]Cl |
| Complex A — Cl ligands | the 2 inside the brackets, not the 3 written in the formula |
| Complex A — isomer | the prefix: **cis** — the panel then defines it and says it seats the Cl at **1** and **5**, and why |
| Complex B — NH₃ ligands, Cl ligands | 3 and 3 |
| Complex B — isomer | the prefix: **mer** — defined as one trans pair plus a third cis to both, seated at **1**, **5** and **6** |
| N atoms / Cl atoms at a face's corners | the pattern to count: **1 N and 2 Cl** |

The isomer buttons relabel themselves from the numbers typed — two of one ligand offers
*cis / trans*, three offers *fac / mer*, and anything else says there is only one arrangement.
Nothing is pre-selected. **Run experiment** stays disabled until the panel is complete, and the
bench refuses what it cannot build: seven donor atoms on six vertices, or a face pattern that does
not add to three, each with the reason shown against the field.

### 2 — Run the experiment

Six narrated steps, each in the student's own numbers:

1. **Build.** The wire cage draws itself in — 6 sites, 12 edges, 8 triangular faces, with the
   reason there are eight stated. Each site carries its number, and the key underneath spells out
   1–4 = square plane, 5–6 = axial, trans pairs 1-3, 2-4, 5-6.
2. **Load A.** The ligands fly in and land on the numbered sites the isomer demands — the
   narration says which sites and why — and the Cl–Cl edges light up.
3. **Check A.** The model **turns to face each of the eight triangles in turn**, the face is shaded
   on the model, its three corners are read out by number, and the ledger, the chips under the model
   and the live tally all fill in as the inspector goes.
4. **Rebuild B.** The ligands lift off and come back as the second complex — same cage, same eight
   faces, different labels.
5. **Check B.** The same eight-face sweep.
6. **Add up.** The two tallies are summed.

A **live tally** under the model counts the matching faces as they are found, six gauges fill in
only as the run establishes them, and the working writes itself one line per step. Pause, resume,
replay and 0.5× / 1× / 2× throughout, plus **change the data** to go back with the entries kept.

### 3 — Read the result

The answer appears as the outcome of the inspection and **blinks** — in the result box, the header,
the live tally and the total gauge, with a ring pulsing round the result — so the moment it is
produced is unmissable. The animation runs twice and stops rather than looping, and is suppressed
for readers who ask for reduced motion. Alongside it is an account of how the run got there.
Afterwards either complex can be reloaded onto the model, and clicking any row of the ledger turns
the model to that face so it can be checked by eye.

### It is a model, not a script

Nothing is hard-coded to the paper. Switch complex B to **fac** and the run gives 5. Switch complex
A to **trans** and it gives 4. Ask for 2 N and 1 Cl instead and it gives 8. Section 03 then does the
exhaustive check: it lists *every* placement of the same isomer class — all 12 cis, all 12 mer —
with the count each one gives, so the student can see that the particular vertices the bench chose
could not have mattered.
