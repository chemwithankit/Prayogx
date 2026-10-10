# CON-CHE-REVERSIBLE-WORK - One gas, many paths: reversible and irreversible work (XP-05)

NCERT Class 11 Chemistry Part I, Unit 5 Thermodynamics (Reprint 2026-27), §5.2.1 Work, pp. 140–143, with Problems
5.2–5.4. A first-class 2D concept experience on the Experience Kit (`clock@1`, `obs@1`, `act@1`, `dir@1`, `cam@1`), the
kit's first time-stepped model (`ENGINE.step`, 1 ms fixed substeps). Design: `docs/ncert/blueprints/CON-CHE-REVERSIBLE-WORK.md`
(approved by the owner 2026-10-10 with defaults D1, D2, scope #12 + #13 + #15, and this ID).

## Learning goal

"Work is the area under the outside-pressure path, so the same gas going between the same two states can do different
amounts of work. The slower the change, the more work the gas does on expansion and the less it needs on compression. The
limit is the reversible process, and a reversible round trip leaves nothing behind."

## The 7 scenes (each moved on by the learner)

1 meet the gas, the weights and the water bath · 2 lift all eight weights off at once: 16.0 L atm · 3 predict, then lift
them one at a time (a step only when the piston is at rest): 28.6 L atm · 4 pour the sand off grain by grain: 32.1 L atm,
the reversible limit 32.2 (the target reveal) · 5 predict, then push the gas back: all at once 80.0 (64.0 left over), one
at a time 36.6 (8.0), grain by grain 32.2 (0.1) · 6 NCERT Problems 5.2–5.4 on the same cylinder: w = 0, −8.0, −32.1
(limit −32.2); ΔU = 0 · 7 takeaway.

## Dataset

The gas of NCERT Problem 5.2: 2 L at 10 atm and 25 °C, isothermal (water bath), nRT = 20 L atm, n = 0.818 mol; expanded to
10 L (2 atm). Piston and air 2 atm; eight equal weights of 1 atm, or 800 grains of 0.01 atm. **Flag F1:** Problem 5.4
calls this gas 1 mol (39.4 L atm); it is 0.818 mol, so its reversible work is 32.2 L atm (owner decision D1). The piston's
motion between equilibria is illustrative (labelled "motion not to scale"); each step ends at its equilibrium, so the work
is exact.

## Verification log

| Check | Result |
|---|---|
| Source values, exact stepped work (fractions), three routes to the reversible limit, the 64/N round trip, NCERT 5.2–5.4 and F1, signs, the page ENGINE at two substeps and three frame rates, a domain sweep, the fact sheet | `tests/verify_con_che_reversible_work.py`: 41 passed |
| Kit contracts (incl. the recorder twice), the prediction gates and NEXT-only stall, step guards, every run against the fact sheet, the full film's marks, 30/60 fps, reduced motion, 360/390 px, real buttons, target reveal, gates A–K | `tests/sim_con_che_reversible_work.js`: 102 passed |
| Fact sheet (generated) | `tools/reel-maker/facts/CON-CHE-REVERSIBLE-WORK.json` |
| Status | draft · script_verified · owner review pending |
