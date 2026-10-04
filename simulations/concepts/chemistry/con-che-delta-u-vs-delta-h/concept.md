# CON-CHE-DELTA-U-VS-DELTA-H - Two calorimeters, one reaction

NCERT Class 11 Chemistry Part I, Unit 5 Thermodynamics (Reprint 2026-27), §5.2.2(a) and §5.3 Calorimetry,
pp. 143–146; reaction data pp. 150–152. Blueprint: `docs/ncert/blueprints/CON-CHE-DELTA-U-VS-DELTA-H.md` (XP-09).

## Concept

A calorimeter measures heat. In a sealed bomb (constant volume) no work is done, so q_V = ΔU. At constant pressure
the gas volume changes with the moles of gas, expansion work crosses the boundary, and q_p = ΔH. The two differ by
ΔH − ΔU = Δn_g RT (NCERT eq. 5.10), which is zero when the moles of gas do not change.

## Experience records (data/ncert/experiences/NCERT-11-CHE-P1-CH05.json)

| Record | Concept | Status |
|---|---|---|
| EXP-CHE-TWO-CALORIMETERS | CPT-CHE-CALORIMETRY | review |
| EXP-CHE-TWO-CALORIMETERS-DELTA-H-DELTA-U | CPT-CHE-DELTA-H-DELTA-U-RELATION | review |
| EXP-CHE-TWO-CALORIMETERS-HEAT-SIGN | CPT-CHE-EXOTHERMIC-ENDOTHERMIC | review |

## Dataset

T = 298 K, R = 8.314 J mol⁻¹ K⁻¹, RT = 2.4776 kJ mol⁻¹, C_cal = 20.7 kJ K⁻¹, p = 1 bar, IUPAC signs.

| Reaction | Amount | Δn_g | Δ_rH (kJ mol⁻¹) | Δ_rU (kJ mol⁻¹) | ΔH − ΔU | ΔT sealed / piston (K) |
|---|---|---:|---:|---:|---:|---|
| C(graphite) + O₂ → CO₂ | 1.000 g | 0 | −393.5 | −393.50 | 0 | 1.584 / 1.584 |
| H₂ + ½O₂ → H₂O(l) | 0.100 mol | −1.5 | −285.8 | −282.08 | −3.72 | 1.363 / 1.381 |
| C₄H₁₀ + 13/2 O₂ → 4CO₂ + 5H₂O(l) | 0.0100 mol | −3.5 | −2658.0 | −2649.33 | −8.67 | 1.280 / 1.284 |

## Source notes

NCERT Problem 5.6 (p. 146) uses illustrative readings that give −2.48 × 10² kJ mol⁻¹ for graphite; the same reaction is
listed at −393.5 kJ mol⁻¹ (pp. 151–152). This page uses −393.5 and says so briefly in its solution. The constant-pressure
calorimeter is an idealised piston vessel (NCERT's Fig. 5.8 cup is for reactions in solution).

## Verification log

| Check | Result |
|---|---|
| Three routes (eq. 5.10; work −pΔV with ideal-gas ΔV; inverse of q = −C_cal ΔT) agree for every reaction and what-if | `tests/verify_con_che_delta_u_vs_delta_h.py` |
| Page model equals the verifier; interaction, stages, reveal, responsive, accessibility, determinism, no network | `tests/sim_con_che_delta_u_vs_delta_h.js` |
| Status | draft · experience QA (owner) pending |
