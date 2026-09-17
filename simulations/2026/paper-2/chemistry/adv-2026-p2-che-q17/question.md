# ADV-2026-P2-CHE-Q17 — volume of 1 M H₂SO₄ in a Kjeldahl estimation

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 2 |
| **Subject** | Chemistry |
| **Section** | Section 4 — question stem shared by Q.17 and Q.18 |
| **Question** | Q.17 |
| **Type** | Numerical value (+2 / 0) |
| **Source** | `papers/adv_2026_paper_2.pdf`, page 29 |

---

## Question (verbatim)

### Question stem for question nos. 17 and 18

Consider the following reaction sequence in which **J**, **K**, **L** and **M** are the major
products.

```
                1. ClCH2COCl, anhyd. AlCl3
m-xylene   ------2. NaI, heat--------------->  J
                3. NaO-C6H4-NO2 (meta)
                   sodium 3-nitrophenoxide

           1. NaBH4
J   ----------------------->  K        (molar mass of K = 350 g mol^-1)
           2. PBr3

K   --- NH3 (excess) ---->  L
K   --- PhSNa ------------>  M
```

*The scheme is redrawn in the simulation as live vector structures rather than reproduced from the
exam PDF, so the paper itself is never published. Every structure is the one the paper prints.*

Given — atomic masses (amu):

| Element | Value | Needed for Q.17? |
|---|---|---|
| H | 1 | **yes** |
| C | 12 | **yes** |
| N | 14 | **yes** |
| O | 16 | **yes** |
| S | 32 | no — belongs to Q.18 |
| Br | 80 | only to check the stem's M(K) = 350 |
| Ba | 137 | no — belongs to Q.18 |

**Q.17** The volume of 1 M aqueous H₂SO₄ required to completely neutralize the ammonia evolved from
**5.72 g of L** in Kjeldahl's method of nitrogen estimation is ____ mL.

*(Q.18, the mass of BaSO₄ obtained from 3.79 g of M by the Carius method, is a separate question.)*

---

## Classification

| | |
|---|---|
| **Chapter** | Organic Chemistry — Some Basic Principles and Techniques |
| **Topic** | Kjeldahl estimation of nitrogen, on a compound built by a reaction sequence |
| **Subtopics** | Friedel–Crafts acylation · Finkelstein exchange · Williamson ether synthesis from a phenoxide · Selective reduction with NaBH₄ · Alcohol to bromide with PBr₃ · Nucleophilic substitution by ammonia · Quantitative analysis by the Kjeldahl method · Which nitrogens the method can and cannot estimate · Acid–base stoichiometry with a dibasic acid · Molarity to volume |
| **Also draws on** | Mole concept · Molar mass from atomic masses · Aromatic substitution orientation |
| **Difficulty** | Hard |
| **Answer** | **10** (mL) |

---

## Rules / formulas

```
M = sum over atoms of (count x atomic mass)          molar mass, built from the given masses

n(L)    = w(L)/M(L)                                  moles of the sample weighed out
n(NH3)  = n(L) x (number of nitrogens DIGESTED)      Kjeldahl: amine N only
n(H2SO4)= n(NH3)/2                                   2 NH3 + H2SO4 -> (NH4)2SO4, dibasic acid
V (L)   = n(H2SO4)/M(acid)                           molarity is mol per litre
V (mL)  = 1000 x V(L)                                the question asks for mL

% N estimated = 14 x n(NH3) / w(L) x 100             what the method reports
% N present   = 14 x 2 x n(L) / w(L) x 100           what the molecule actually contains
```

---

## Structures

Every molar mass below is built atom by atom from the atomic masses printed in the stem — nothing
is taken from a table.

| Compound | Structure | Formula | M (g/mol) |
|---|---|---|---|
| m-xylene (start) | 1,3-dimethylbenzene | C₈H₁₀ | 106 |
| after step 1 | Ar–CO–CH₂Cl (Friedel–Crafts acylation at the position *ortho/para* to both methyls) | C₁₀H₁₁ClO | — |
| after step 2 | Ar–CO–CH₂I (Finkelstein, Cl → I, a better leaving group) | C₁₀H₁₁IO | — |
| **J** | Ar–CO–CH₂–O–C₆H₄–NO₂ (3-nitrophenoxide displaces the iodide) | C₁₆H₁₅NO₄ | **285** |
| alcohol | Ar–CH(OH)–CH₂–O–C₆H₄–NO₂ (NaBH₄ reduces the ketone only; NO₂ is untouched) | C₁₆H₁₇NO₄ | 287 |
| **K** | Ar–CHBr–CH₂–O–C₆H₄–NO₂ (PBr₃ replaces OH by Br) | C₁₆H₁₆BrNO₃ | **350** ✓ matches the stem |
| **L** | Ar–CH(NH₂)–CH₂–O–C₆H₄–NO₂ (excess NH₃ displaces Br) | C₁₆H₁₈N₂O₃ | **286** |
| **M** | Ar–CH(SPh)–CH₂–O–C₆H₄–NO₂ (PhSNa, for Q.18) | C₂₂H₂₁NO₃S | 379 |

Ar = 2,4-dimethylphenyl throughout (the ring the acyl group entered).

**The stem's 350 is a checksum, not decoration.** M(K) = 16(12) + 16(1) + 80 + 14 + 3(16)
= 192 + 16 + 80 + 14 + 48 = **350**, exactly as printed — which confirms the whole assignment
before any arithmetic on L is attempted.

---

## Data

| Quantity | Value |
|---|---|
| Mass of L taken | 5.72 g |
| M(L) | 286 g/mol |
| n(L) | 5.72 / 286 = **0.02 mol** |
| Nitrogens in L | **2** — one amine (–NH₂), one nitro (–NO₂) |
| Nitrogens Kjeldahl estimates | **1** — the amine only |
| n(NH₃) evolved | 0.02 mol |
| Stoichiometry | 2 NH₃ + H₂SO₄ → (NH₄)₂SO₄ |
| n(H₂SO₄) | 0.01 mol |
| Acid strength | 1 M |
| Volume of acid | 0.01 L = **10 mL** |
| Nitrogen the method reports | 4.90 % N |
| Nitrogen actually present | 9.79 % N |

### The crux

Kjeldahl's digestion with hot concentrated H₂SO₄ converts nitrogen to ammonium **only when the
nitrogen is in an amine-like oxidation state**. Nitro, azo, diazo and ring nitrogens (pyridine and
the like) are *not* reduced, so they are never estimated. L has one of each kind, so exactly **one
mole of NH₃ comes off per mole of L** — not two. This single fact separates 10 mL from 20 mL, and
the question is built on it.

### Distractors this question actually produces

| Mistake | Gives |
|---|---|
| Counting both nitrogens | 20 mL |
| Treating H₂SO₄ as monobasic (as if it were HCl) | 20 mL |
| Both mistakes together | 40 mL |
| Using M(K) = 350 — the one molar mass the stem prints — in place of M(L) | 8.17 mL |
| Stopping the sequence at J and using 285 | 10.04 mL — **within a whisker of the right answer** |
| Answering in litres | 0.01 |

### Robustness of the model

| Change | Titre |
|---|---|
| 11.44 g of L instead of 5.72 g | 20 mL — linear in the mass |
| 2 M acid instead of 1 M | 5 mL — inverse in the strength |
| Atomic mass of C entered as 13 | M(K) = 366 ≠ 350, and the bench flags the broken checksum as a note (it still runs) |
| Atomic masses of S and Ba changed | 10 mL — unchanged; both belong to Q.18 |

---

## Solution

1. **Build J.** m-Xylene's two methyls are *o,p*-directing, so chloroacetyl chloride with anhydrous
   AlCl₃ acylates the ring at the one position activated by both — giving Ar–CO–CH₂Cl with
   Ar = 2,4-dimethylphenyl. NaI then exchanges the chloride for iodide (Finkelstein), because
   iodide is the better leaving group for what comes next. Sodium 3-nitrophenoxide attacks that
   α-carbon and displaces the iodide, giving the ether
   **J = Ar–CO–CH₂–O–C₆H₄–NO₂ = C₁₆H₁₅NO₄**, M = 16(12) + 15(1) + 14 + 4(16) = **285**.

2. **Build K, and check it against the stem.** NaBH₄ reduces the ketone to a secondary alcohol and
   leaves the aromatic nitro group alone — this selectivity is the point of using borohydride
   rather than a stronger reductant. PBr₃ then replaces the OH by Br:
   **K = Ar–CHBr–CH₂–O–C₆H₄–NO₂ = C₁₆H₁₆BrNO₃**, M = **350** — exactly the molar mass the stem
   states. The structure is now confirmed, not assumed.

3. **Build L, and count its nitrogens.** Excess ammonia displaces the bromide:
   **L = Ar–CH(NH₂)–CH₂–O–C₆H₄–NO₂ = C₁₆H₁₈N₂O₃**, M = 192 + 18 + 28 + 48 = **286**.
   n(L) = 5.72 / 286 = **0.02 mol**. Note that L carries **two** nitrogen atoms.

4. **Decide which nitrogen the method can see.** Kjeldahl digestion converts only amine-type
   nitrogen to ammonium; nitro nitrogen survives the digestion and is never estimated. So
   n(NH₃) = 1 × n(L) = **0.02 mol**, not 0.04 mol. (This is also why Kjeldahl under-reports the
   nitrogen of a nitro compound: it finds 4.90 % N where 9.79 % is present.)

5. **Neutralise the ammonia.** H₂SO₄ is dibasic — 2 NH₃ + H₂SO₄ → (NH₄)₂SO₄ — so the acid needed is
   half the ammonia: n(H₂SO₄) = 0.02 / 2 = **0.01 mol**.

6. **Convert to a volume.** Molarity is moles per litre, so
   V = 0.01 mol ÷ 1 mol L⁻¹ = 0.01 L = **10 mL**.

**Answer: 10 mL**

---

## Verification log

| Check | Result |
|---|---|
| Derived from first principles before any published solution was consulted | pass — the whole sequence, the structures and the Kjeldahl limitation were fixed independently |
| Every molar mass built atom by atom from the stem's own atomic masses | pass — no external mass table used anywhere |
| The stem's internal checksum | M(K) = C₁₆H₁₆BrNO₃ = 192 + 16 + 80 + 14 + 48 = **350**, exactly as printed — the structure is confirmed by the question itself |
| The sample mass is a clean amount | 5.72 / 286 = 0.02 mol exactly, which is how such stems are built |
| Independent corroboration from Q.18's data | 3.79 g of M (C₂₂H₂₁NO₃S, 379) = 0.01 mol exactly, giving 2.33 g of BaSO₄ (233) — three separate masses in one stem all resolve to round amounts |
| Stoichiometry of the neutralisation | 2 NH₃ + H₂SO₄ → (NH₄)₂SO₄ — dibasic, so n(acid) = n(NH₃)/2 |
| Dimensional check | mol ÷ (mol/L) = L, ×1000 = mL |
| Linearity in the mass | 11.44 g requires 20 mL — twice the mass, twice the titre |
| Inverse in the acid strength | 2 M requires 5 mL |
| Unused data confirmed unused | changing the atomic masses of S and Ba leaves the answer at 10 mL; both belong to Q.18 |
| Broken checksum handled as a note, not a refusal | entering C = 13 makes M(K) = 366 and the bench says so, while still running — because the checksum is the student's evidence, not a gate |
| Distractor audit (6 mistakes) | 20, 20, 40, 8.17, 10.04, 0.01 — none is 10 by a correct route, and the 10.04 near-miss is called out explicitly on the page |
| Independent numeric script, formulas assembled atom by atom (`verify17.py`) | 23 / 23 checks pass, answer 10 mL |
| Headless-browser run of the finished page (`t17.js`) | 113 / 113 assertions pass, live model returns 10 mL, zero console errors, no overflow at 390 px or 360 px, deck fits one window at 621 px |
| Answer hidden until revealed | 14-frame leak sweep across every stage — the answer appears nowhere |
| The prediction gate | the audit holds the clock at t = 2.3 s until the student commits to one nitrogen or two, and accepts a wrong commitment rather than blocking it |
| Classroom mode and NEXT STEP | walks J → K (350) → L (286) → the nitrogen audit → digestion and titration → the answer, one beat per press, run paused between, and the gate holds NEXT STEP too |
| Reduced-motion run | blink, flash and card animations suppressed; content and answer still complete |
| Cross-check against a published worked solution for this paper | same route, same M(L) = 286, same "1 mole of L releases 1 mole of NH₃", same answer 10 mL |
| IIT Roorkee official key | not retrievable at the time of writing |

**Status: verified — 2026-09-17.**
