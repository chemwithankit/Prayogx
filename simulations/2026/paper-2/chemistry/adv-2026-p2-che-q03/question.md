# ADV-2026-P2-CHE-Q03

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.3 (Section 1 — single correct MCQ, +3 / 0 / −1)
**Source:** `papers/adv_2026_paper_2.pdf`, page 21

---

## Question (verbatim)

Natural rubber on complete ozonolysis (O₃/Zn-H₂O) gives compound **X** as the major product. **X** gives
positive iodoform and Tollen's tests. **X** on heating with aqueous NaOH gives **Y** as the major product.
**Y** is

- (A) cyclopent-2-en-1-one
- (B) 1-(2-hydroxycyclopropyl)ethan-1-one
- (C) 1,4-diacetylcyclohexa-1,4-diene
- (D) a bicyclic lactol — a cycloheptenone fused to a 2-hydroxytetrahydrofuran, methyl at the ring fusion

*(The four options are printed as structures; the names above are those structures.)*

**Answer: (A) cyclopent-2-en-1-one**

---

## Classification

| Field | Value |
|---|---|
| Chapter | Aldehydes, Ketones and Carboxylic Acids |
| Topic | Aldol condensation |
| Subtopics | Reductive ozonolysis; structure of natural rubber (*cis*-1,4-polyisoprene); iodoform test; Tollens' test; intramolecular aldol and ring size; dehydration to an α,β-unsaturated ketone |
| Concepts | Alkene cleavage; enolate formation; ring strain; conjugation as thermodynamic driving force |
| Difficulty | Moderate–Hard |

## Reactions used

```
R2C=CR'2  --O3, then Zn/H2O-->  R2C=O + O=CR'2        (reductive; stops at the carbonyl)
            with H2O2 instead:  any -CHO goes on to -COOH
CH3CO-R + 3I2 + 4NaOH  ->  CHI3(s) + RCOONa + 3NaI + 3H2O
RCHO + 2[Ag(NH3)2]+ + 3OH-  ->  RCOO- + 2Ag(s) + 4NH3 + 2H2O
aldol: enolate + C=O -> beta-hydroxy carbonyl  --heat, -H2O-->  alpha,beta-unsaturated carbonyl
ring size = |n(alpha) - n(carbonyl)| + 1
```

---

## Solution

**Step 1 — write natural rubber properly.** Natural rubber is *cis*-1,4-polyisoprene, repeat unit
–CH₂–C(CH₃)=CH–CH₂– (C₅H₈), one trisubstituted C=C per unit.

**Step 2 — cleave every double bond reductively.** O₃ then Zn/H₂O breaks each C=C and caps both carbons
with =O. The =C(CH₃)– end becomes a methyl ketone, the =CH– end an aldehyde:

```
...CH2-C(CH3)=CH-CH2...  ->  CH3-CO-CH2-CH2-CHO
X = 4-oxopentanal (levulinaldehyde), C5H8O2
```

Each fragment straddles two repeat units, so one repeat unit gives exactly one molecule of X.

**Step 3 — check X against both tests.** CH₃CO– present ⟹ iodoform positive. –CHO present ⟹ Tollens
positive. This rules out levulinic acid (the H₂O₂ work-up product, no CHO) and pentane-2,4-dione (no CHO).

**Step 4 — let NaOH close the ring.** Number X as C1 (CHO), C2, C3, C4 (C=O), C5 (CH₃). Enolates can form
at C2 (α to the aldehyde) and at C3 and C5 (α to the ketone). Ring size = |α − carbonyl| + 1:

| Enolate | Attacks | Ring size | Outcome |
|---|---|---|---|
| C2 | C4 | 3 | forbidden — 27.5 kcal mol⁻¹ of strain |
| C3 | C1 | 3 | forbidden — same |
| **C5** | **C1** | **5** | **forms** — only 6.2 kcal mol⁻¹ |

The ketone enolate attacking the more electrophilic aldehyde is also the favoured direction. Product:
3-hydroxycyclopentan-1-one, C₅H₈O₂ (an isomer of X).

**Step 5 — heat drives the dehydration.** The OH is β to the ketone, so E1cb loss of water gives the
conjugated enone:

```
3-hydroxycyclopentanone  -H2O ->  cyclopent-2-en-1-one, C5H6O  =  Y
```

**Answer: (A).**

---

## Verification log

| Check | Result |
|---|---|
| Atom economy: one C₅ repeat unit → one C₅ product | X C₅H₈O₂ → aldol C₅H₈O₂ (isomer) → Y C₅H₆O ✓ |
| Mass balance in RDKit | 100.12 − 18.02 = 82.10 = M(Y) ✓ |
| Both diagnostic tests re-derived by substructure match | X matches `[CH3]C(=O)[#6]` and `[CX3H1](=O)[#6]`; no other C₅H₈O₂ candidate matches both ✓ |
| Ring-size arithmetic enumerated independently of the drawing | {3, 3, 5} — only one viable ✓ |
| Literature precedent | base-mediated cyclisation of levulinaldehyde to cyclopent-2-enone is a standard intramolecular aldol ✓ |
| Conjugation requirement (Y is the thermodynamic product, must contain C=C–C=O) | (A) yes, (B) no ✓ |
| Distractor audit | (B) is the 3-ring aldol that strain forbids and is un-dehydrated; (C) is C₁₀H₁₂O₂ — needs two molecules of X; (D) is a C₁₀ bicyclic lactol, also a dimer and a 7-ring closure |
| Simulation run headless: ozonolysis, both work-ups, all four candidates, all six aldol combinations | correct throughout, zero console errors ✓ |

**Status: verified — 2026-08-26.**
