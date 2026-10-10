# CON-CHE-HESS-LAW - Hess's Law: the enthalpy staircase (XP-12)

NCERT Class 11 Chemistry Part I, Unit 5 Thermodynamics (Reprint 2026-27), §5.4(e) Hess's Law of Constant Heat Summation,
pp. 151–152, with Table 5.2 (p. 149) as the independent check. A first-class 2D concept experience on the Experience Kit
(`clock@1`, `obs@1`, `act@1`, `dir@1`, `cam@1`). Design: `docs/ncert/blueprints/CON-CHE-HESS-LAW.md`.

## Learning goal

"Enthalpy depends only on where a reaction starts and where it ends. So any route from the same start to the same end
gives the same total ΔH, and we can add measured steps to find a ΔH we cannot measure directly."

## The 8 scenes (each moved on by the learner)

1 meet the three states (the same matter: one C, two O) · 2 the problem: C(graphite) + ½O₂ → CO cannot be measured
directly (some CO₂ always forms) · 3 place (i), −393.5 kJ mol⁻¹: CO₂ lies below the start · 4 reverse (ii) into (iii),
+283.0 kJ mol⁻¹, and place it: the CO level is found · 5 add the steps: −110.5 kJ mol⁻¹ (the target reveal) · 6 compare
two routes to CO₂: −393.5 both ways · 7 check: Table 5.2 gives −110.53 kJ mol⁻¹ · 8 Hess's law (eq. 5.16).

## Dataset (NCERT, as printed)

(i) C(graphite) + O₂ → CO₂, −393.5; (ii) CO + ½O₂ → CO₂, −283.0; (iii) = (ii) reversed, +283.0; result −110.5 kJ mol⁻¹
(pp. 151–152). Table 5.2: Δ_fH⊖ CO −110.53, CO₂ −393.51 kJ mol⁻¹ (p. 149). Levels relative to the start (= 0).

## Verification log

| Check | Result |
|---|---|
| Source values, balance, reversal, both routes, every learner route, Table 5.2, the page ENGINE, the fact sheet | `tests/verify_con_che_hess_law.py` |
| Kit contracts, learner flow, actions, Director, replay, mobile, provenance, target, gates | `tests/sim_con_che_hess_law.js` |
| Fact sheet (generated) | `tools/reel-maker/facts/CON-CHE-HESS-LAW.json` |
| Status | draft · owner review pending |
