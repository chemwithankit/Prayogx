# ADV-2026-P1-PHY-Q13 — Sound in two-path tube networks: the smallest length for a maximum at the detector

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 4 — matching list set |
| **Question** | Q.13 (MathonGo numbering: Q29) |
| **Type** | Single correct option (+4 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 22 |

---

## Question (verbatim)

Q.13 List-I shows four configurations made of straight and semi-circular narrow tubes containing air. A sound wave of wavelength *λ* = 0.29 m enters these structures at the point *S* and a sound detector is placed at *D*. Between the points *S* and *D*, the sound travels only through the tubes. List-II contains the possible smallest values of *l* (refer to the figures) for which the detector *D* records maximum amplitude. Ignore effects of sharp corners. [Given cos(15°) = 0.97]

Choose the option that best describes the match between the entries in List-I to those in List-II.

| List-I | List-II |
|---|---|
| (P) *S* and *D* joined by a straight tube *l* and a semicircular tube on it (height 0.5*l*) | (1) 1.32 m |
| (Q) a straight tube *l* and a rectangular detour of height 0.5*l* | (2) 1.19 m |
| (R) a straight tube *l*, a vertical tube *l* at *S*, and a semicircle on the diagonal back to *D* | (3) 0.51 m |
| (S) a straight tube *l* and a triangular detour, 45° at *S* and 105° at the top | (4) 0.29 m |
| | (5) 0.13 m |

(A) P→4, Q→3, R→5, S→1  (B) P→4, Q→3, R→1, S→5
(C) P→3, Q→4, R→1, S→2  (D) P→3, Q→4, R→5, S→2

The four List-I figures are described in words here and redrawn on the page.

## Classification

| | |
|---|---|
| Chapter | Waves |
| Topic | Interference of sound along two paths in tube networks - the smallest length for a maximum at the detector |
| Also | Superposition; path difference |
| Difficulty | Moderate |
| Answer | **D** (P→3, Q→4, R→5, S→2) |

## Solution

1. **The condition.** The sound splits at *S* and recombines at *D*. The detector hears a maximum when Δ = (detour) − *l* = *mλ*, so the smallest *l* has Δ = *λ*. A detour of *kl* gives *l* = *λ*/(*k* − 1).
2. **(P)** Semicircle on *l*: *k* = π/2, so *l* = 0.29/0.571 = 0.508 m → **(3)**.
3. **(Q)** Up 0.5*l*, across *l*, down 0.5*l*: *k* = 2, so *l* = 0.29 m → **(4)**.
4. **(R)** Up *l*, then a semicircle on the diagonal *l*√2: *k* = 1 + π/√2 = 3.221, so *l* = 0.131 m → **(5)**.
5. **(S)** Triangle with 45° at *S*, 30° at *D* and 105° at the top. By the sine rule, *k* = (sin 30° + sin 45°)/sin 105° = 1.2071/0.97 = 1.2445, so *l* = 1.186 m → **(2)**. With the exact cos 15° = 0.9659, *l* = 1.161 m, which is still nearest (2).
6. P→3, Q→4, R→5, S→2: **option (D)**.

## Verification log

| Check | Result |
|---|---|
| Independent derivation | l = 0.508, 0.290, 0.131, 1.186 m → (3), (4), (5), (2) → D |
| sympy | the detour factors and the first maxima at Δ = λ |
| Geometry from coordinates + phasors | path lengths measured from the drawn networks; the first maximum of \|1 + e^(iφ)\| found by sweeping l agrees |
| Options | A, B and C each fail on at least one row |
| Numeric script | `tests/verify_p1phyq13.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq13.js` checks every sweep, silence at λ/2, the maximum at λ, the match, the visual gates and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q29 = Physics Q.13): D |
| Answer key | official key printed with the paper (page 22; the derivation above does not use it): Q.13 → D |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates, library and production audits) — 2026-09-30. No human review has been recorded.**
