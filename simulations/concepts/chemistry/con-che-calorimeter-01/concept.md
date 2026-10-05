# CON-CHE-CALORIMETER-01 - How does a calorimeter work?

NCERT Class 11 Chemistry Part I, Unit 5 Thermodynamics (Reprint 2026-27), §5.2.2(c) and §5.3 Calorimetry, pp. 144–146.
A guided virtual experiment for the weakest Class 11 learner; a companion to CON-CHE-DELTA-U-VS-DELTA-H (XP-09).
Design: `docs/ncert/blueprints/CON-CHE-CALORIMETER-01.md`.

## Learning goal

"A calorimeter is an apparatus that finds the heat released or absorbed by a process by observing a temperature change
under controlled conditions." The student performs the experiment; a lab guide beside the apparatus answers, after every
action: what you did, what happened, why, and what to do next. Nothing advances on its own.

## The 13 scenes (each opened by the student's action)

1 enter the lab · 2 pour 200 g of water · 3 place the reaction tube · 4 insert the thermometer (25.0 °C; temperature,
not heat) · 5 close the lid, inspect the parts · 6 start the reaction (25.0 → 27.5 °C) · 7 read ΔT = 2.5 °C · 8 run with
400 g and 100 g · 9 build q = mcΔT (the target reveal, 2.1 kJ) · 10 insulated vs poorly insulated (2.5 vs 1.75 °C) ·
11 bomb calorimeter: push the wall (ΔV = 0, w = 0), ignite (q_V = ΔU) · 12 piston: push it, run a gas-forming reaction
(expansion work, q_p = ΔH) · 13 rigid vs movable, ΔH − ΔU = Δn_g RT, three reactions → XP-09.

## Dataset (simple, illustrative)

Reaction heat 2100 J; water c = 4.2 J g⁻¹ °C⁻¹ (NCERT's value); start 25.0 °C. 200 g: +2.50 °C; 100 g: +5.00 °C;
400 g: +1.25 °C; poorly insulated (30 % lost, illustrative): +1.75 °C, so q = mcΔT would give 1470 J.
q = 200 × 4.2 × 2.5 = 2100 J. The calorimeter's own heat capacity is neglected. The bomb and piston scenes are qualitative.

## Experience records (data/ncert/experiences/NCERT-11-CHE-P1-CH05.json)

EXP-CHE-HOW-CALORIMETER-WORKS (CPT-CHE-CALORIMETRY) · EXP-CHE-HOW-CALORIMETER-WORKS-HEAT-CAPACITY (CPT-CHE-HEAT-CAPACITY), status review.

## Verification log

| Check | Result |
|---|---|
| Dataset consistency and the page engine | `tests/verify_con_che_calorimeter_01.py` |
| Learner flow, guide texts, unlocking order, target, responsive, accessibility, determinism, no network | `tests/sim_con_che_calorimeter_01.js` |
| Status | draft · owner review pending |
