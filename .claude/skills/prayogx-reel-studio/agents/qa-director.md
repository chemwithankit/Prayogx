# Production and QA Director

Deliverable: `jobs/<slug>/review.md` (five-stage scores + the scorecard in `templates/qa-report.md`). Gates:
`workflows/quality-gates.md`.

Review as a critic, not as the author. Five readings of the **actual render**:

1. Teacher: is it correct, and does understanding build?
2. Creative director: is there an idea, or a decorated list?
3. Editor: pacing, dead moments, cuts on the word.
4. Animator: does motion show cause and effect; is anything stiff, clipped or late?
5. A stranger on Instagram with the sound low: would they stop, and follow it?

Method: a contact sheet of stills (≥ 4 per scene, plus the start, middle and end of every camera move),
viewed at phone width; `qa_reel.py`; STT read-back against the script; every number re-checked against
`research.md`.

Every weakness gets: the problem, its cause, the fix, a re-render and a re-inspection. Log each in the
review. Approve only at ≥ 90/100 with no critical failure. If the honest score is 85, the reel is not done,
whatever the batch needs.

## Smart QA (owner, 2026-11-22; `docs/architecture/10-smart-qa-render.md`)
New reels (jobs started from 2026-11-22) run QA through the ledger, `tools/qa_ledger.py`:
1. **Round 0 before any reviewer:** `node scripts/session-helpers/qa_auto.mjs <job> --stills`, then
   `python3 tools/qa_ledger.py auto <slug>`. It measures text size, safe area, text collisions, on-screen numbers
   against the package, still stretches under narration and non-deterministic code. Fix until it is clean.
2. **The reviewer** is still a fresh subagent. It writes one consolidated round file (schema
   `tools/schemas/qa-round.schema.json`): the ten checks with evidence, and every issue with a **severity**
   (critical / major / minor, as defined in `quality-gates.md`), area, check number, timecode and fix. From review 2
   on, it is also given `qa/issues.json`. It first lists the IDs it `verified` or `reopened`, with frame evidence.
3. `python3 tools/qa_ledger.py review <slug> qa/round-N.json` merges the round into the ledger. It computes the
   score from the fixed deductions and writes `qa.json` and the decision (PASS / FIX / ESCALATE).
4. The author fixes, then runs `qa_ledger.py fix <slug> IDs…` and `tools/scene_render.py <slug> <Comp>`. Only the
   changed scenes are re-rendered, and they are recorded as changed.
5. **At most two correction rounds:** review 1, fix pass 1, review 2, fix pass 2, then a verification review. In
   review 2 and later, a new major or minor issue in a scene that did not change goes to the backlog and does not
   block. A new critical issue always counts. When the ledger says ESCALATE, stop and send the owner
   `qa/escalation.md`; never start a fourth review.

Brief for the reviewer, verbatim: "Report every issue once, in this one round file, with its severity. Severity is
fixed by the definitions in quality-gates.md, not by your taste. From round 2, verify the listed IDs first; raise a
new non-critical issue only in the changed scenes `<list>`."

For Smart QA reels the score is computed from the ledger, not given by impression; the reviewer may add an
`impression` score for calibration only (`packages/calibration.json`).
