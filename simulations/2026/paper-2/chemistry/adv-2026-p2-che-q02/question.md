# ADV-2026-P2-CHE-Q02

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.2 (Section 1 — single correct MCQ, +3 / 0 / −1)
**Source:** `papers/adv_2026_paper_2.pdf`, page 20

---

## Question (verbatim)

The correct order of ONO bond angle in the given species is

- (A) NO₂⁺ < NO₂ < NO₃⁻ < NO₂⁻
- (B) NO₂⁻ < NO₃⁻ < NO₂ < NO₂⁺
- (C) NO₃⁻ < NO₂⁻ < NO₂ < NO₂⁺
- (D) NO₂⁻ < NO₃⁻ < NO₂⁺ < NO₂

**Answer: (B)**

---

## Classification

| Field | Value |
|---|---|
| Chapter | Chemical Bonding and Molecular Structure |
| Topic | VSEPR theory and molecular geometry |
| Subtopics | Electron-domain counting; lone-pair vs bond-pair repulsion; odd-electron (radical) species; resonance and bond order; isoelectronic series; Walsh's rules |
| Concepts | Steric number; ideal vs actual bond angle; repulsion hierarchy; symmetry-fixed geometries |
| Difficulty | Easy–Moderate |

## Rules used

```
Steric number = σ-bonded atoms + non-bonding domains on the central atom
Repulsion:  lone pair  >  bonding pair  >  single (odd) electron
SN 2 → linear (180°);  SN 3 → trigonal planar (120°), bent if a domain is non-bonding
Walsh (AB₂): 16 valence e⁻ → linear;  17–20 → bent, angle falls as electrons are added
Formal charge = V − N_nonbonding − ½ N_bonding
```

---

## Data

| Species | Valence e⁻ | σ domains | Non-bonding on N | Steric no. | Electron geometry | Shape | N–O bond order | ∠ONO |
|---|---|---|---|---|---|---|---|---|
| NO₂⁻ | 18 | 2 | 1 lone pair | 3 | trigonal planar | bent | 1.50 | **115.4°** |
| NO₃⁻ | 24 | 3 | none | 3 | trigonal planar | trigonal planar | 1.33 | **120.0°** |
| NO₂ | 17 | 2 | 1 single electron | 3 | trigonal planar | bent | 1.50 | **134.1°** |
| NO₂⁺ | 16 | 2 | none | 2 | linear | linear | 2.00 | **180.0°** |

---

## Solution

**Step 1 — count electron domains on nitrogen.** Only σ-bonded atoms and non-bonding electrons on the
central atom count; π bonds do not.

```
NO₂⁺ : 16 e⁻ → 2 σ + nothing          → SN 2
NO₂  : 17 e⁻ → 2 σ + 1 odd electron   → SN 3
NO₃⁻ : 24 e⁻ → 3 σ + nothing          → SN 3
NO₂⁻ : 18 e⁻ → 2 σ + 1 lone pair      → SN 3
```

**Step 2 — NO₂⁺ is linear.** Two domains and no non-bonding electrons on N; *sp* hybridised and
isoelectronic with CO₂ ⟹ **180°**, necessarily the largest. This eliminates (A) and (D).

**Step 3 — rank the three SN-3 species by the character of the third domain.** The ideal angle is 120°;
what moves a species off it is how hard the third domain pushes.

- **NO₃⁻** — three identical bonding domains, nothing else on N. *D*₃ₕ symmetry pins it at exactly **120°**.
- **NO₂⁻** — the third domain is a full lone pair, which repels more than a bonding pair and squeezes the
  N–O bonds together ⟹ **115.4°**, below 120°.
- **NO₂** — the third domain holds only one electron, which repels *less* than a bonding pair, so the bonds
  spread apart ⟹ **134.1°**, above 120°.

**Step 4 — assemble.**

```
NO₂⁻ (115.4°) < NO₃⁻ (120°) < NO₂ (134.1°) < NO₂⁺ (180°)
```

**Answer: (B).**

Memory hook: along NO₂⁺ → NO₂ → NO₂⁻ you add one electron at a time to the same skeleton and the angle
closes 180° → 134° → 115°. NO₃⁻ is pinned at 120° by symmetry, and 115.4 < 120 < 134.1 slots it second.

---

## Verification log

| Check | Result |
|---|---|
| Symmetry alone: NO₃⁻ is *D*₃ₕ, NO₂⁺ is *D*∞ₕ | 120° and 180° exact, not in dispute |
| Isoelectronic: NO₂⁺ ≡ CO₂ (16 e⁻) | linear 180° ✓ |
| Isoelectronic: NO₂⁻ ≡ O₃ (116.8°), SO₂ (119°) | bent, 115–119° band ✓ |
| Walsh's rules for AB₂ (16 e⁻ linear; 17–20 bent, angle falling) | 180 → 134.1 → 115.4 follows exactly ✓ |
| Redundant route: rank by non-bonding repulsion only (lone pair > bonding pair > single electron > none) | same order, no numbers used ✓ |
| Robustness: order is unchanged for any ∠NO₂ in 121–180° and any ∠NO₂⁻ below 120° | does not hinge on precise values ✓ |
| Distractor audit | (A) exact reverse; (C) swaps NO₃⁻/NO₂⁻ — forgets that a lone pair pushes below 120°; (D) puts NO₂⁺ below NO₂, contradicting linearity |
| Simulation run headless: ordering checker, builder and chart | all four species resolve correctly, zero console errors ✓ |

**Status: verified — 2026-08-26.**
