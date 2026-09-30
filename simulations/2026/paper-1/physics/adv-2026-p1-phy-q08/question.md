# ADV-2026-P1-PHY-Q08 — The plane wave E₀ sin(3y + 4z + ωt) î: direction, |k|, ω and B

| | |
|---|---|
| **Exam** | JEE Advanced 2026 |
| **Paper** | Paper 1 |
| **Subject** | Physics |
| **Section** | Section 2 — four questions, one or more options correct |
| **Question** | Q.8 (MathonGo numbering: Q24) |
| **Type** | One or more correct options (+4 / +3 / +2 / +1 / 0 / −1) |
| **Source** | `papers/Jee_Adv_2026_paper1_solutions_final.pdf`, page 17 |

---

## Question (verbatim)

Q.8 The electric field associated with an electromagnetic wave travelling in vacuum is given by *E*₀ sin(3*y* + 4*z* + *ωt*)*î*, where *ω* is the angular frequency. All quantities are in SI units. The correct statement(s) about this wave is/are:
[Given: speed of light in vacuum *c* = 3 × 10⁸ ms⁻¹.]

(A) The wave is travelling in −(1/5)(3*ĵ* + 4*k̂*) direction.
(B) The magnitude of the wave vector is 0.5 m⁻¹.
(C) The value of *ω* is 1.5 × 10⁹ rad s⁻¹.
(D) The magnetic field associated with this wave is given by (*E*₀/*c*) sin(3*y* + 4*z* + *ωt*)(4*ĵ* − 3*k̂*).

## Classification

| | |
|---|---|
| Chapter | Electromagnetic Waves |
| Topic | A plane electromagnetic wave from its electric field - direction of travel, wave vector, angular frequency and the magnetic field |
| Difficulty | Moderate |
| Answer | **(A), (C)** |

## Solution

1. **The wave vector.** **k** = 3*ĵ* + 4*k̂*, so |**k**| = 5 m⁻¹ and **(B)** is false. The wavelength is *λ* = 2π/5 ≈ 1.257 m.
2. **Direction of travel.** Follow a crest, 3*y* + 4*z* + *ωt* = constant. As *t* grows, 3*y* + 4*z* falls, so the wave travels along −(3*ĵ* + 4*k̂*)/5 and **(A)** is true.
3. **Frequency.** *ω* = *c*|**k**| = 1.5 × 10⁹ rad/s, so **(C)** is true. The period is 4.19 ns.
4. **Magnetic field.** Faraday's law gives ∂**B**/∂*t* = −∇ × **E** = −*E*₀ cos(…)(4*ĵ* − 3*k̂*). Integrating, **B** = (*E*₀/*c*) sin(…)(−4*ĵ* + 3*k̂*)/5. Option (D) has the opposite sign and five times the size, so **(D)** is false. As a check, **E** × **B** ∝ −(3*ĵ* + 4*k̂*), which points along the direction of travel.

## Verification log

| Check | Result |
|---|---|
| Independent derivation | A, C |
| sympy (Maxwell's equations on the given field) | ω = 5c; B = (E₀/c)(−4ĵ + 3k̂)/5 sin; Ampère–Maxwell and divergences hold; option D = −5B |
| Numerics (crest followed, crests timed, curl by finite differences, dB/dt integrated) | direction (0, −0.6, −0.8) at c; λ = 1.2566 m; c\|B\| = E₀ along (0, −0.8, 0.6) |
| Poynting vector | ⟨E × B⟩ along the travel; option D's B would reverse it |
| Numeric script | `tests/verify_p1phyq08.py` |
| The page | engine run in Node by the verifier; `tests/sim_p1phyq08.js` drives the run, the audit, the visual gates and the app shell |
| Solution website | MathonGo Paper 1 solutions (their Q24 = Physics Q.8): (A), (C) |
| Answer key | official key printed with the paper (page 17; the derivation above does not use it): Q.8 → AC |

**Status: script-verified by the PrayogX simulation factory (independent verifier, page suite, visual gates, library and production audits) — 2026-09-30. No human review has been recorded.**
