# ADV-2026-P2-CHE-Q14

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.14 (Section 3 — numerical value, +4 full / 0 otherwise, no negative marking)
**Source:** `papers/adv_2026_paper_2.pdf`, page 28

---

## Question (verbatim)

In the following reaction sequence, major products X and Y are acyclic monomers.

```
CH3I  —(1) KCN  (2) H3O+, Δ  (3) Red P, Br2  (4) NH3 (excess)→  X
Caprolactam  —H3O+, Δ→  Y
```

**500 mol** of X completely reacts with **500 mol** of Y to give **1 mol** of a single biodegradable
acyclic copolymer Z as the only product. The amount of Z formed in grams is ______.

**Given:** Atomic mass (in amu): H : 1, C : 12, N : 14, O : 16, Br : 80

**Answer: 85018**

> The paper says **500 mol**, not 500 mL. The simulation quotes it as the paper does and takes
> amounts in moles.

---

## Solution

### 1. Follow the carbon to find X

Each reagent does exactly one thing, and only one of them changes the carbon count:

```
CH3I  --KCN-->  CH3CN  --H3O+, Δ-->  CH3COOH  --red P / Br2-->  BrCH2COOH
      --NH3 (excess)-->  H2N-CH2-COOH
```

Cyanide displaces iodide by SN2 and brings a carbon with it; hydrolysis takes the nitrile through
the amide all the way to the acid; red P / Br₂ is the Hell–Volhard–Zelinsky reaction, which
brominates the α carbon; excess ammonia then displaces that bromide, and the excess is what stops it
alkylating a second time.

```
X = glycine, C2H5NO2
M = 2(12) + 5(1) + 14 + 2(16) = 75 g/mol
```

### 2. Open the ring to find Y

Caprolactam is a *cyclic* amide — a seven-membered ring made of N, a carbonyl carbon and five CH₂
groups. Acidic hydrolysis cuts the C–N bond and adds the elements of water across it, and the ring
falls open into a straight chain with an amine at one end and an acid at the other.

```
C6H11NO + H2O  ->  H2N-(CH2)5-COOH
Y = 6-aminohexanoic acid, C6H13NO2
M = 6(12) + 13(1) + 14 + 2(16) = 131 g/mol    (= 113 + 18, as it must be)
```

### 3. Count the links, not the units

1000 mol of monomer units end up in 1 mol of chains, so every chain is 1000 units long. A chain with
two loose ends has one fewer link than it has units:

```
links = 1000 - 1 = 999   ->   999 mol of H2O eliminated
```

Every amide link is made by an –NH₂ and a –COOH condensing, and each one ejects exactly one water.
A *cyclic* polymer would have lost 1000 — the word **acyclic** in the question is what makes it 999.

### 4. Weigh what went in and take off what left

```
mass in   = 500 x 75 + 500 x 131 = 37 500 + 65 500 = 103 000 g
water out = 999 x 18                               =  17 982 g
mass of Z = 103 000 - 17 982                       =  85 018 g
```

### 5. Answer

**85018 g**

Marking: +4 for 85018, 0 otherwise. No negative marking.

---

## Independent verification

- **Derived before anything was looked up.** Both structures, both molar masses, the link count and
  the arithmetic were fixed from first principles, and only then compared with a published solution.
- **The carbon count tracked through the whole sequence.** CH₃I has one carbon and glycine has two,
  and the only step that adds carbon is the cyanide displacement. That alone forces X to be a
  two-carbon acid, independently of recognising the reagents by name.
- **Hydrolysis checked atom by atom,** not by name: C₆H₁₁NO + H₂O = C₆H₁₃NO₂ balances on every
  element, and 113 + 18 = 131 on the masses.
- **The answer computed twice, two different ways.** Subtracting the water from the monomer mass
  gives 85 018 g. Counting the atoms of one mole of chain —
  C 4000, H 7002, N 1000, O 1001 — and multiplying by the atomic masses gives 85 018 g to machine
  precision.
- **Conservation of mass checked explicitly:** 103 000 g of monomer = 85 018 g of polymer +
  17 982 g of water, exactly, with no element going negative.
- **The model tested away from the paper's numbers.** Two chains instead of one gives 85 036 g (one
  fewer link); a 300 / 700 split gives 96 218 g; and with one unit per chain no links form, no water
  is lost and the mass reduces to the monomer mass — the formula degrades correctly at the boundary
  rather than by luck.
- **The distractors reproduced deliberately:** losing 1000 waters gives 85 000; forgetting the water
  gives 103 000; using caprolactam (113) in place of Y gives 94 000. None of them is 85 018.
- **Answer key cross-check.** A published worked solution for this paper identifies the same X and
  Y, uses the same 999 waters and reports the same 85 018. IIT Roorkee's official key was not
  retrievable at the time of writing.
- **Headless-browser run:** 98 assertions driving the whole flow — the chemistry the page is built
  on, the model's behaviour away from the paper's numbers, the empty control panel with the answer
  nowhere on it, the refusal of more chains than units, each of the four screens in turn (the four
  reagent steps with the right molecule on screen, the ring opening with water attacking the C–N
  bond, one water per link accelerating to 999, and the arithmetic with its last value withheld),
  the suspense card, the graffiti reveal with its spray filter and particle burst, the header
  blinking once and stopping, the record and monomer cards, a re-run on different data giving a
  different answer, replay, theme toggle, clean console, zero horizontal overflow at 390 px and
  360 px, and a theatre that fits in one window.

**Status: verified — 2026-09-14.**

---

## What the simulation does

The page is a five-screen experiment: **enter the data → watch the chemistry → see the numbers →
reveal the answer.** The whole run takes about 40 seconds.

### Screen 1 — enter the data

A reactor control panel with three glass vessels: monomer X, monomer Y and the product drum. Three
amounts go in — how much X, how much Y, how many moles of polymer they must end up as — and the
atomic masses sit underneath, pre-filled from the question and editable. **Every molar mass on the
page is summed from those four numbers**, so nothing is a remembered constant. Bromine is shown but
greyed out: it is given in the question and never reaches the answer, because no bromine survives
into X. Nothing is identified yet — the panel does not say what X and Y are.

**Start experiment** stays disabled until the amounts are in, and the reactor refuses a charge it
cannot make (more chains than monomer units) with the reason given.

### Screen 2 — discover X

CH₃I appears large and readable, and the four reagents fly in one at a time. At each step the
reagent enters, the molecule changes, and **only the group that changed is haloed** — the iodide
leaving, the nitrile carbon arriving, the α bromine, the amine. A five-stop rail across the top
tracks CH₃I → CH₃CN → CH₃COOH → BrCH₂COOH → NH₂CH₂COOH, and the caption names the reaction that did
it. At the end: **X identified — GLYCINE**, with its formula and its molar mass added up on the spot.

### Screen 3 — discover Y

Caprolactam is drawn as a proper seven-membered ring, with the C–N bond that is about to break
picked out in red. A water molecule drifts in, the bond fades, and **the ring unrolls into a
zig-zag chain** — the same seven atoms, morphing from heptagon to chain — while H₂N appears at one
end and OH grows at the other. **Ring opened — 6-AMINOHEXANOIC ACID**, with 113 + 18 = 131 shown
underneath.

### Screen 4 — polymerise

Two streams of monomers feed a reactor. The chain grows one unit at a time, alternating Gly and Ahx,
and **each new link ejects a water molecule that floats away** while the counters tick: units
linked, links formed, H₂O released. After six links it accelerates smoothly to 1000 units and
999 waters — the point being that the water count is one *behind* the unit count, which is the whole
question.

### Screen 5 — the arithmetic

Five lines assemble one at a time: mass of X, mass of Y, total monomer in, water out — and then the
last line, `103 000 − 17 982 = ?`, with the value deliberately withheld.

### The reveal

A suspense card asks *What is the mass of Z?* over a row of blanks, with a pulsing **Reveal answer**
button. Pressing it sprays **85 018 g** across the screen in rough-edged graffiti lettering with
drips and a burst of particles, and the header answer box blinks once. Underneath, in small type:
*X = glycine, M = 75 | Y = 6-aminohexanoic acid, M = 131 | 999 waters lost.*

### It is a model, not a script

Change the data and the reactor reaches a different answer: two chains gives 85 036 g, a 300/700
split gives 96 218 g, and changing an atomic mass changes every molar mass on the page. **Replay
experiment** and **change the data** are available from every screen after the first.
