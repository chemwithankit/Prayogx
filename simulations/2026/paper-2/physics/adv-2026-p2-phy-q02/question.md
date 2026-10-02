# ADV-2026-P2-PHY-Q02 — Rate of temperature rise of a liquid heated by a radioactive nuclide produced at a constant rate

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 2 |
| **Subject** | Physics |
| **Section** | Section 1 — single correct option |
| **Question** | Q.2 (MathonGo numbering: Q20) |
| **Type** | Single correct option (+3 / 0 / −1) |
| **Source** | `papers/adv_2026_paper_2.pdf`, page 10 |

---

## Question (verbatim)

Q.2 A nuclear reactor starts producing a radioactive nuclide *X* from *t* = 0, at a constant rate of *α* per second. Each decay of *X* produces energy *E*₀, which is utilized to heat a liquid of mass *m* and specific heat *s*. Assuming no heat loss from the liquid and taking *λ* as the decay constant of *X*, the rate of increase in the temperature of the liquid is:

(A) (*αE*₀/*m s*)(1 − *e*^(−*λt*))  (B) (*αE*₀/*m s*)(*e*^(*λt*) − 1)  (C) (*λE*₀/*m s*)(1 − *e*^(−*λt*))  (D) (*E*₀/*m s*)(*α* − *λe*^(−*λt*))

## Classification

| | |
|---|---|
| Chapter | Nuclei |
| Topic | Radioactive nuclide produced at a constant rate - build-up to saturation and the heat its decays deliver |
| Difficulty | Moderate |
| Answer | **A** (d*T*/d*t* = (*αE*₀/*ms*)(1 − *e*^(−*λt*))) |

## Solution

1. **Count the nuclei.** d*N*/d*t* = *α* − *λN*, with *N*(0) = 0.
2. **Solve.** *N*(*t*) = (*α*/*λ*)(1 − *e*^(−*λt*)).
3. **Activity.** *λN* = *α*(1 − *e*^(−*λt*)): zero at the start, rising to *α* when decay balances production.
4. **Heat.** No heat is lost, so *ms* d*T*/d*t* = *E*₀*λN*.
5. **Rate of temperature rise.** d*T*/d*t* = (*αE*₀/*ms*)(1 − *e*^(−*λt*)): **option (A)**.
6. **Check.** At *t* = 0 nothing has decayed, so d*T*/d*t* = 0; as *t* → ∞, d*T*/d*t* → *αE*₀/(*ms*). Only (A) does both: (B) diverges, (C) tends to *λE*₀/(*ms*), (D) gives *E*₀(*α* − *λ*)/(*ms*) at *t* = 0.

## Verification log

| Check | Result |
|---|---|
| Approach | MathonGo solution read first as the conceptual reference |
| Independent solve | d*N*/d*t* = *α* − *λN* → d*T*/d*t* = (*αE*₀/*ms*)(1 − *e*^(−*λt*)) |
| Symbolic (sympy) | the rate equation solved; *E*₀*λN*/(*ms*) is exactly (A); (B), (C), (D) differ |
| Convolution of production with the decay law | equals (A) within 10⁻⁶ |
| Monte Carlo of individual nuclei (200 runs) | the activity follows *α*(1 − *e*^(−*λt*)) within 3 % |
| Energy bookkeeping | temperature rise = *E*₀ × (made − present)/(*ms*) |
| Options | (A) passes both limits; (B), (C), (D) each fail one |
| Numeric script | `tests/verify_p2phyq02.py` |
| The page | engine run in Node by the verifier: its thermometer readings fit (A) (misfit 0.01 %), the others miss by 39 % or more, (A) over the whole slider range; `tests/sim_p2phyq02.js` checks the staged run, the fit, conservation of nuclei, the reactor-off what-if, every control, the target display (`tests/target_gate.js`), the visual gates A–K and the app shell |
| Solution website | MathonGo Paper 2 solutions (their Q20 = Physics Q.2): (A) |
| Answer key | official final key, JEE Advanced 2026 Paper 2 (jeeadv.ac.in, published 2026-06-01; read last): Q.2 → A |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates A–K, library and production audits) — 2026-10-02. No human review has been recorded.**
