# ADV-2026-P2-CHE-Q08

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.8 (Section 2 — one or more correct, +4 full / partial / 0 / −1)
**Source:** `papers/adv_2026_paper_2.pdf`, page 25

---

## Question (verbatim)

In the following reaction sequence, **P**, **Q**, **S** and **T** are the major products.

```
                1. (CH₃CO)₂O, pyridine              1. H₃O⁺
aniline  ————————————————————————————>  P  ——————————————————————>  Q
                2. conc. HNO₃, conc. H₂SO₄, 288 K   2. NaNO₂/HCl, 273–278 K


                1. O₂/H₃O⁺                                Q
cumene   ————————————————————————————>  S  ——————————————————————>  T
                2. NaOH/CO₂                          aqueous NaOH
                3. H₃O⁺
```

The correct statement(s) about **P**, **Q**, **S** and **T** is(are)

- **(A)** Q on treatment with ethanol generates an aromatic aldehyde.
- **(B)** S gives positive phthalein dye test.
- **(C)** P is a dinitro compound.
- **(D)** T is a coloured compound.

**Answer: (B) and (D)**

---

## Solution

### 1. Route 1, steps 1–2: acetylate, then nitrate — this gives P

Aniline itself cannot be nitrated cleanly. The −NH₂ group is protonated by the nitrating mixture to
−NH₃⁺, which is strongly deactivating and *meta*-directing, and aniline is oxidised by nitric acid as
well. Acetic anhydride converts it to acetanilide first.

```
PhNH₂ + (CH₃CO)₂O / pyridine  ⟶  PhNHCOCH₃
```

−NHCOCH₃ is still activating and *ortho, para*-directing, but much more mildly, and it is bulky.
Nitration at 288 K therefore stops at **one** nitro group, overwhelmingly at the para position
because ortho is blocked sterically.

```
P = p-nitroacetanilide, C₈H₈N₂O₃ — a mononitro compound
```

### 2. Route 1, steps 3–4: hydrolyse, then diazotise — this gives Q

```
P + H₃O⁺  ⟶  p-nitroaniline
p-nitroaniline + NaNO₂/HCl, 273–278 K  ⟶  Q = p-nitrobenzenediazonium chloride
```

The low temperature matters: above about 278 K the diazonium salt decomposes to the phenol and
nitrogen.

### 3. Route 2: cumene process, then Kolbe–Schmitt — this gives S

```
cumene  —O₂, then H₃O⁺—>  phenol + acetone
phenol  —NaOH, CO₂—>  sodium salicylate  —H₃O⁺—>  S = salicylic acid
```

Kolbe–Schmitt carboxylates the phenoxide *ortho* to the oxygen, so S is 2-hydroxybenzoic acid:
OH on C2, COOH on C1.

### 4. (A) Q with ethanol — the aldehyde is not aromatic

Ethanol reduces a diazonium salt: the diazonium group is replaced by hydrogen and the ethanol is
oxidised.

```
ArN₂⁺Cl⁻ + C₂H₅OH  ⟶  ArH + CH₃CHO + N₂ + HCl
```

With Ar = p-nitrophenyl, the aromatic product is nitrobenzene. The only aldehyde formed is
**acetaldehyde** — two carbons, no ring. The statement asks for an *aromatic* aldehyde, and there
isn't one. **(A) is incorrect.**

### 5. (B) S in the phthalein dye test

The test condenses a phenol with phthalic anhydride under conc. H₂SO₄; two phenol rings attack the
anhydride carbonyl *at the position para to their −OH*. The requirement is therefore a free para
position, which is why p-cresol fails the test.

```
salicylic acid: OH at C2 · COOH at C1 · para to the OH is C5, and C5 carries a hydrogen
```

S is a phenol with its para position open, so it condenses and gives the coloured phthalein in
alkali. **(B) is correct.**

### 6. (C) Is P a dinitro compound?

No — and this is exactly what the acetylation was for.

```
P = CH₃CONH–C₆H₄–NO₂ :  one −NO₂
```

Only an unprotected, strongly activated ring under forcing conditions would take a second nitro
group. **(C) is incorrect.**

### 7. (D) T, the azo dye

In aqueous NaOH salicylic acid is deprotonated to the phenoxide — a very strongly activating group.
The diazonium ion is a weak electrophile, so it needs exactly that activation, and it couples *para*
to the phenoxide oxygen, at C5.

```
S + Q / aq. NaOH  ⟶  T, an −N=N− bridged azo compound, C₁₃H₉N₃O₅
```

The −N=N− links the two rings into one long conjugated system, with an electron-donating −O⁻/−OH at
one end and an electron-withdrawing −NO₂ at the other. That push–pull arrangement drops the
HOMO–LUMO gap far enough that the absorption lands in the visible. Azo compounds of this kind are the
classic synthetic dyes. **(D) is correct.**

### 8. Answer

**(B) and (D)**

Marking: +4 for both; +2 for either one alone; −1 for including (A) or (C).

---

## Independent verification

- **Structures checked computationally:** every intermediate was written as a SMILES string and
  parsed, and the counts quoted come from substructure matching rather than from reading the drawing
  — P returns exactly one nitro match, T returns exactly one aryl–N=N–aryl match.
- **The para position of S was located programmatically:** starting from the phenolic oxygen, walking
  three atoms round the ring lands on C5, and that atom carries one hydrogen. That is the structural
  requirement for the phthalein test, established without assuming the answer.
- **The phthalein requirement itself was verified against independent sources,** which state that
  p-cresol fails the test precisely because its para position is blocked.
- **The ethanol reaction was verified against independent sources:** it gives the arene plus
  acetaldehyde plus nitrogen, so the aldehyde is aliphatic.
- **Formula bookkeeping:** aniline C₆H₇N → acetanilide C₈H₉NO → P C₈H₈N₂O₃ → p-nitroaniline
  C₆H₆N₂O₂ → Q C₆H₄N₃O₂⁺; cumene C₉H₁₂ → phenol C₆H₆O → S C₇H₆O₃; T C₁₃H₉N₃O₅.
- **Why (A) is a good trap:** a diazonium salt *does* generate an aldehyde with ethanol, so the
  statement is half true. The word that breaks it is "aromatic".
- **Why (C) is a good trap:** "nitrating mixture" suggests forcing conditions, and aniline is highly
  activated. The acetyl group and the 288 K are precisely what hold it to one substitution.
- **Answer key cross-check:** derived independently first, then compared against a published key and
  worked solution for this paper, which agree on (B) and (D) and on the coupling occurring at
  position 5. IIT Roorkee's official key was not retrievable at the time of writing.
- **Headless-browser run:** 43 assertions — both routes forwards and backwards with formula and nitro
  counts at every step, the protecting-group experiment, three bench tests including a negative
  control on cumene, all four fates of Q, the conjugation sweep, the gate, predictions, theme toggle,
  clean console, zero horizontal overflow at 390 px and 360 px.

---

## What the simulation lets you do

1. **02 Route 1** — step aniline through to the diazonium salt with the structure redrawn each time,
   plus a side experiment contrasting nitration with and without the acetyl protecting group.
2. **03 Route 2** — step cumene through to salicylic acid, with the free para position marked, then
   run the phthalein, FeCl₃ and NaHCO₃ tests on whatever is in the flask (they correctly fail on the
   wrong compound).
3. **04 The coupling** — offer Q four different partners and see what each actually gives, then extend
   the conjugation and watch the absorption walk out of the ultraviolet into the visible.
4. **05 Verdict on A–D** — predict each statement, then check it against your own measurements.
5. **06 Step-by-step solution** — unlocked once all four statements have been tested.
