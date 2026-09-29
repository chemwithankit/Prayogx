---
name: prayogx-new-simulation
description: Build one new PrayogX simulation end to end, from a question the owner named ("build Paper 1 Chemistry Q16", "next question") to a verified, registered page and a report. Use only for a question the owner has explicitly chosen.
---

# Build a new PrayogX simulation

Standard: `docs/SIMULATION_STANDARDS.md`. Reference pages: P1 Q12–Q15
(`simulations/2026/paper-1/chemistry/adv-2026-p1-che-q12` … `q15`). Work in this repository
directly; nothing outside it is needed.

**Never skip scientific verification in favour of visual work.** Steps 2–4 come before any
code.

## Scope gate (before step 1)

- Build only the question the owner named. For "next question": list the existing folders
  under `simulations/<year>/paper-<n>/<subject>/`, take the lowest unbuilt number, and **state
  the exact ID in one line** before doing anything.
- A vague request, or a contradictory one (header says Chemistry, body says Physics): ask.
  Never start a batch. "Next N questions" means N separate full runs, reported one by one.
- If the folder already exists, this is not a new build: use `prayogx-review-existing`.

## Workflow

1. **Confirm the question and ID.** `ADV-<YEAR>-P<n>-<PHY|CHE|MAT>-Q<NN>`, where `NN` is the
   *section's* question number. MathonGo Paper 1 numbers are combined (Maths 1–16, Physics
   17–32, Chemistry 33–48), so MathonGo Q48 = Chemistry Q.16.
2. **Verify the source.** Question papers are in `papers/` (private, git-ignored; never copy
   them anywhere tracked). Render the page first - `python3 tools/auto_sim.py render papers/<file>.pdf --pages N` (pypdfium2 in
   `tests/.venv`, no system package) - then Read the PNG it prints, and cross-check the `.txt` text layer
   beside it; the Read tool's own `pages:` needs Poppler, which is not installed. `pdftotext` is not
   installed on this Mac. Structures and schemes are images, so look at them. Transcribe
   **verbatim**: numbers, units, conditions, options. Record exam, year, paper, section,
   question type, marking and source page. Report anything unclear; never invent.
3. **Solve independently.** Governing laws, variables, constraints, units, sign conventions,
   limiting cases. Solve completely before looking at any key.
4. **Cross-check** against the official key printed in the paper PDF and, if available, a
   published solution. **If anything disagrees: stop, investigate, report to the owner.**
5. **Learning objective.** The one conceptual *pivot* the student must feel. Everything else
   serves it.
6. **Experiment type.** What real experiment or process makes the pivot tangible: apparatus,
   molecule, field, graph.
7. **Scientific design brief.** Write it down before coding (template below). Show it to the
   owner if the design is unusual or needs WebGL.
8. **Interaction model.** Controls = the variables of the governing equations, question
   values pre-loaded, custom inputs only where meaningful (with honest off-pathway warnings
   and a restore control). Robust input parsing with clear messages.
9. **Visual experience.** Layout v2 (standards §4) and the immersive direction (§6).
   Apparatus and molecules should feel present; show the vessel and molecules in sync for
   organic chemistry.
10. **Rendering level.** Choose 2-D / pseudo-3-D / WebGL by the table in standards §6.
    WebGL needs owner approval.
11. **Animation sequence.** 8–13 stages, one scene each, each proving one piece of the
    answer; CAUSE → PROCESS → EFFECT; virtual clock, so pause, speed and reduced motion
    govern everything.
12. **Implement.** Copy the shell, tokens and helpers from the closest G4 page, then replace
    the question-specific engine, scenes and UI. One file, ES5, unique ids, `window.PX`
    hooks. If you merge code from several pages, check for duplicate function names and ids.
13. **Answer calculation.** `run(D)` returns everything derived; `var QRUN = run(copyST());
    var ANS = QRUN.answer;`. Custom runs must report honestly when they no longer answer the
    question. **No answer literal in the source.**
14. **Detailed solution:** complete, exam-level, always open, with drawn structures and
    curved-arrow mechanisms for organic chemistry, an option table, traps, and an independent
    verification block (≥ 5 checks).
15. **Concept explanation:** the pivot, stated plainly, with jargon defined.
16. **Key takeaways:** 3–6 exam-useful statements.
17. **Validate:** follow `prayogx-validate` (verifier + page suite).
18. **Test mobile / browser / console:** 390 and 360 px with no overflow, zero console
    errors, reduced motion, classroom mode. Screenshot every stage and **look**.
19. **Metadata:** write `meta.json` and `question.md` (see `prayogx-register`).
20. **Register:** follow `prayogx-register`.
21. **Generated-content validation:** the four tools plus the drift gate, all green.
22. **Report:** use the format below, then **stop**. Don't commit unless the owner has
    authorised it; never push.

## Design brief template

```
ID / QUESTION   ADV-…  (source: papers/<file> p.<n>)
PIVOT           <the one idea the student must feel>
INDEPENDENT ANSWER  <value>   OFFICIAL KEY <value>   AGREE? yes/no
EXPERIMENT      <apparatus / molecules / process>
RENDERING       2-D | pseudo-3-D | WebGL (approval?)     WHY: <learning value>
INTERACTIONS    <controls = equation variables; custom inputs + warnings>
STAGES (8–13)   1 <scene → what it proves> … n <reveal>
ORGANIC         vessel event ↔ mechanism step, per stage
INSTRUMENTS     <gauges>        CHARTS  <from model state>
EXPLORER        <tool that fits the concept>
SOLUTION        <figures / calculations>, option table, traps, ≥5 checks
CONCEPT         <pivot in one paragraph>     TAKEAWAYS  <3–6>
```

## Report format

```
COMPLETED     <ID> — <lab name>
FILES         created / updated (paths)
VERIFICATION  verifier N/N · page suite N/N · check_library OK · production_audit N/N · drift clean
              independent answer <x> · official key <x> · published solution <x or n/a>
ISSUES        <anything not done or not verified — say so plainly>
REGISTRY      manifest (N simulations) · taxonomy · tracker.csv · README row · tests registered
NEXT          owner reviews; publish with ./publish.sh when approved
```
