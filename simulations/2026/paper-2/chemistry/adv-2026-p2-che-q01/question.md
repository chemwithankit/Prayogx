# ADV-2026-P2-CHE-Q01

**Exam:** JEE Advanced · **Year:** 2026 · **Paper:** 2 · **Subject:** Chemistry
**Question:** Q.1 (Section 1 — single correct MCQ, +3 / 0 / −1)
**Source:** `papers/adv_2026_paper_2.pdf`, page 20

---

## Question (verbatim)

At 300 K, the molar conductivities of the aqueous solutions of three salts at two different
concentrations are given below:

| Salt | Concentration (M) | Molar conductivity (S cm² mol⁻¹) |
|---|---|---|
| NaNO₃ | 0.01 | 111 |
| NaNO₃ | 0.04 | 101 |
| NaCl  | 0.01 | 117 |
| NaCl  | 0.04 | 107 |
| AgNO₃ | 0.01 | 125 |
| AgNO₃ | 0.04 | 116 |

The conductivity of a saturated aqueous solution of AgCl is 1.40×10⁻⁶ S cm⁻¹ at 300 K. If the
solubility of AgCl in water at 300 K is *X* mol L⁻¹, then log₁₀(*X*⁻¹) is

(Assume that AgCl dissolved in water ionizes completely and that the molar conductivity of saturated
AgCl solution is equal to its limiting molar conductivity.)

- (A) 3
- (B) 4
- (C) 5
- (D) 6

**Answer: (C) 5**

---

## Classification

| Field | Value |
|---|---|
| Chapter | Electrochemistry |
| Topic | Conductance of electrolytic solutions |
| Subtopics | Molar conductivity; limiting molar conductivity by extrapolation; Kohlrausch's law of independent migration; solubility of a sparingly soluble salt from conductance |
| Concepts | κ vs Λm; Debye–Hückel–Onsager √c law; strong electrolytes; solubility product |
| Difficulty | Moderate |

## Formulas

```
κ  = G · G_cell = (1/R)(l/A)
Λm = 1000 κ / c              (c in mol L⁻¹, κ in S cm⁻¹, Λm in S cm² mol⁻¹)
Λm = Λ°m − A√c               (Debye–Hückel–Onsager)
Λ°m = ν₊λ°₊ + ν₋λ°₋          (Kohlrausch)
Ksp(AgCl) = [Ag⁺][Cl⁻] = X²
```

---

## Solution

**Step 1 — the √c law.** NaNO₃, NaCl and AgNO₃ are strong electrolytes, so in this dilute range
Λm = Λ°m − A√c. Two concentrations per salt is exactly what a straight line needs.

**Step 2 — extrapolate to infinite dilution.** With c₁ = 0.01 M (√c = 0.1) and c₂ = 0.04 M
(√c = 0.2), the √c values differ by exactly 0.1, so

```
A  = [Λ(0.01) − Λ(0.04)] / 0.1
Λ° = Λ(0.01) + 0.1 A = 2 Λ(0.01) − Λ(0.04)
```

| Salt | A (S cm² mol⁻¹ M⁻¹ᐟ²) | Λ°m (S cm² mol⁻¹) |
|---|---|---|
| NaNO₃ | 100 | **121** |
| NaCl  | 100 | **127** |
| AgNO₃ |  90 | **134** |

**Step 3 — Kohlrausch's law.**

```
Λ°(AgCl) = λ°(Ag⁺) + λ°(Cl⁻)
         = [λ°(Ag⁺)+λ°(NO₃⁻)] + [λ°(Na⁺)+λ°(Cl⁻)] − [λ°(Na⁺)+λ°(NO₃⁻)]
         = Λ°(AgNO₃) + Λ°(NaCl) − Λ°(NaNO₃)
         = 134 + 127 − 121 = 140 S cm² mol⁻¹
```

Na⁺ and NO₃⁻ each appear once with a plus and once with a minus sign, so they cancel identically —
no individual ionic conductivity is ever required.

**Step 4 — solubility from κ.** For the saturated solution the problem lets us take
Λm = Λ°m = 140 S cm² mol⁻¹ (at ~10⁻⁵ M the A√c correction is ≈ 0.3 S cm² mol⁻¹, i.e. 0.2 %).

```
X = 1000 κ / Λ°m = (1000 cm³ L⁻¹)(1.40×10⁻⁶ S cm⁻¹) / (140 S cm² mol⁻¹)
  = 1.00×10⁻⁵ mol L⁻¹
```

**Step 5 — the logarithm.**

```
log₁₀(X⁻¹) = −log₁₀(1.00×10⁻⁵) = 5
```

**Answer: (C) 5.** By-product: Ksp(AgCl) = X² = 1.0×10⁻¹⁰ at 300 K.

---

## Verification log

| Check | Result |
|---|---|
| Slopes recomputed as ΔΛ/Δ√c from the raw table | 100, 100, 90 — matches |
| Intercepts by two independent routes (slope-then-intercept, and 2Λ(0.01) − Λ(0.04)) | 121, 127, 134 — identical |
| Dimensional analysis: (cm³ L⁻¹)(S cm⁻¹)/(S cm² mol⁻¹) | mol L⁻¹ ✓ |
| Independent numeric script | X = 1.000000×10⁻⁵, −log₁₀X = 5.000000 |
| Physical sanity: Ksp = 1.0×10⁻¹⁰ vs literature ≈1.8×10⁻¹⁰ (298 K) | same order of magnitude ✓ |
| Simulation model re-derives the answer in a headless browser run | 5.00, X = 1.00×10⁻⁵ ✓ |
| Distractor audit (3, 4, 6) | none reachable by a legitimate route |

**Status: verified — 2026-08-26.**
