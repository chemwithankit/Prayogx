# CON-CHE-CALORIMETER-01 — How Does a Calorimeter Work? (guided virtual experiment)

Status: draft concept page, NCERT Explorer, Class 11 Chemistry Part I Ch 5 (§5.2.2(c), §5.3).
Companion to XP-09 (CON-CHE-DELTA-U-VS-DELTA-H), which is linked and never modified.

## Principle

A guided virtual experiment, not an animated lecture. The student performs every action; the page
responds; the **lab guide** (drawn beside the apparatus, inside the simulation) explains:

| YOU DID | WHAT HAPPENED | WHY | NEXT |
|---|---|---|---|
| the action, in a few words | what can be observed | the physical reason, in plain words | the one thing to do now |

Nothing advances on its own. Every scene is unlocked by the student's action. Terms (ΔT, q = mcΔT, ΔV,
w, ΔU, ΔH, Δn_g) appear only after the student has seen the idea happen.

## One dataset (checked by `tests/verify_con_che_calorimeter_01.py`)

The reaction gives out 2100 J; water c = 4.2 J g⁻¹ °C⁻¹ (NCERT); water starts at 25.0 °C;
ΔT = Q (1 − loss) / (m c). 200 g → 2.5 °C (27.5 °C); 100 g → 5.0 °C; 400 g → 1.25 °C; poorly insulated
(30 % lost, illustrative) → 1.75 °C. The target, "the heat given out by the reaction", is computed from the
student's first run: q = 200 × 4.2 × 2.5 = 2.1 kJ. The calorimeter's own heat capacity is neglected (stated).

## Stage / state map

| # | Scene (key) | Student action that enters it | Observation | Explanation (WHY) | Next action unlocked | Animation (cause → process → effect) |
|---|---|---|---|---|---|---|
| 1 | Enter the lab (`lab`) | — (page opens) | an insulated calorimeter cup on a bench; a beaker of water, a reaction tube, a thermometer and a lid beside it | we cannot see heat, so we need an instrument | Pour 200 g of water | soft lab light; idle apparatus |
| 2 | Add water (`water`) | Pour 200 g of water | the water fills the inner cup | the water will absorb the reaction's heat; we watch the water instead of the heat | Place the reaction tube | beaker lifts, tilts, stream falls, level rises with a rippling surface |
| 3 | Place the reaction (`vessel`) | Place the reaction tube | the tube sits in the middle, surrounded by water | the reaction's energy will pass to the water touching the tube | Insert the thermometer | tube lowers from the rack into the water; ripples |
| 4 | Thermometer (`thermometer`) | Insert the thermometer | it reads 25.0 °C | a thermometer measures temperature, **not heat** | Close the lid | thermometer slides in; liquid column settles at 25.0; display lights up |
| 5 | Close and inspect (`lid`) | Close the lid; optionally tap lid, insulation, water, thermometer, tube | everything is shut inside the insulated cup | each part's job; the calorimeter makes the experiment controlled | Start the reaction | lid lowers and seats; tapped part glows with a label |
| 6 | Start the reaction (`reaction`) | Start the reaction | glow and bubbles in the tube; heat waves; convection; thermometer creeps 25.0 → 27.5 °C | the reaction released energy, the water received it, so its temperature rose | Read the temperature change | heat release rate rises then falls; warm water rises, cool water sinks; thermometer lags the water |
| 7 | Read ΔT (`deltaT`) | Read the temperature change | initial 25.0, final 27.5 marked on the thermometer | ΔT = final − initial = 2.5 °C ("change in temperature") | Change the amount of water | two markers slide to 25.0 and 27.5; a bracket labelled ΔT |
| 8 | Amount of water (`amount`) | Change the amount; run with 100 g and 400 g (200 g already measured) | 100 g → 5.0 °C; 400 g → 1.25 °C | the same energy shared by more water warms each gram less | Build the rule (after both runs) | water level changes; the same reaction; notebook card fills |
| 9 | q = mcΔT (`rule`) | Tap m, c and ΔT into the rule; then vary m and ΔT | the rule fills in; q for the first run | each symbol is something already seen; the rule describes the experiment | What if heat escapes? | tiles fly into the equation; q computed; **target reveal** (2.1 kJ, one pulse) |
| 10 | Heat loss (`loss`) | Run both cups (insulated / poorly insulated) | 2.5 °C vs 1.75 °C; heat wisps leaving the poor cup | lost heat makes ΔT, and so q, too small → control heat loss; definition of a calorimeter | Open the bomb calorimeter | two runs side by side; wisps through the thin wall and open top |
| 11 | Bomb (`bomb`) | Open the bomb; optionally inspect bomb, sample, oxygen, water, thermometer; push the wall; ignite | the wall does not move; temperature rises after ignition | volume cannot change → ΔV = 0 → no work, w = 0 → all the energy change is heat: q_V = ΔU | Try a movable piston | zoom into the steel bomb; force arrows, wall still, volume gauge flat; ignition flash, heat through steel into water |
| 12 | Piston (`piston`) | Push the piston; start the reaction | the piston moves and springs back; gas expands, lifting the piston and weight | a movable boundary at constant pressure; energy leaves as expansion work; q_p = ΔH | Compare the two | piston compresses and recovers; gas molecules multiply; piston and weight rise; work arrow |
| 13 | Connection (`connect`) | Compare the two; optionally pick a reaction | rigid vs movable side by side; ΔH − ΔU = Δn_g RT; Δn_g for three reactions | the difference is the expansion work, set by the change in gas moles | Try XP-09 (link) | ledger rows appear in turn; the equation last |

## Controls (no dropdowns)

One primary button always names the next thing to do; in-scene experiment buttons (Run, Push, Ignite);
choice chips for water amount, parts and reactions; a ΔT slider; Back, Replay, Pause, Reset, Classroom.
Apparatus on the canvas can also be tapped. `PX.start()` exists for tests and the reel recorder only
(it performs stages 1–9 in order); the page has no tour button.

## Layout

Desktop: canvas 1200 × 760, lab on the left (about 64 %), lab guide on the right. Phone: canvas
720 × 1440, lab above, lab guide below. Classroom mode: canvas full width, larger NEXT line; Pause and Replay.
Reduced motion: every action shows its end state at once.
