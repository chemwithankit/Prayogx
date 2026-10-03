---
name: prayogx-new-simulation
description: Build one new PrayogX simulation end to end, from a question the owner named ("build Paper 1 Chemistry Q16", "next question") to a verified, registered page and a report. Use only for a question the owner has explicitly chosen.
---

# Build a new PrayogX simulation

Standard: `docs/SIMULATION_STANDARDS.md` — **new pages are built to layout v3 (G5), §4**: the
question, then a large experiment with its controls right beside it, then the solution, an
optional graph, and how to use. Engine, tokens and helpers come from the latest G4 pages (P1 PHY
Q02, P1 CHE Q12–Q16); their layout does not. Work in this repository
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
3. **Understand the intended reasoning, then solve independently.** Read the MathonGo solution
   as a conceptual reference for the intended JEE approach (standards §2). Then derive the
   answer yourself: governing laws, variables, constraints, units, sign conventions, limiting
   cases, by ≥ 2 independent routes. Never take the answer from the solution, and do not look at
   the official key yet.
4. **Cross-check** against the official key printed in the paper PDF, MathonGo's answer, and
   authoritative sources. **If anything disagrees: stop, investigate, report to the owner.**
   Then name the underlying scientific phenomenon: the experiment is built from it, as an
   original PrayogX interpretation, never a reproduction of the solution.
5. **Learning objective.** The one conceptual *pivot* the student must feel. Everything else
   serves it.
6. **Experiment type.** What real experiment or process makes the pivot tangible: apparatus,
   molecule, field, graph.
7. **Scientific design brief.** Write it down before coding (template below). Show it to the
   owner if the design is unusual or needs WebGL. If a **narrated reel** is intended, plan it here,
   not afterwards: narration beats and their sync with visual events, speaking time and pauses,
   the reviewed spoken forms of the notation, the aha and the reveal (kept clear of narration),
   the reel's duration, and how the page and reel still work silently. Narrate the story, not the screen:
   any beat may be narrated, none must be, long problem statements are skipped or condensed
   (`tools/reel-maker/README.md` → Voiceover, Narration model).
8. **Interaction model.** Controls = the variables of the governing equations, question
   values pre-loaded, custom inputs only where meaningful (with honest off-pathway warnings
   and a restore control). Robust input parsing with clear messages. **Controls are toggles,
   segmented buttons, number inputs with units, or sliders — never a dropdown — in one
   `#controls` group directly below (or above) the canvas, ≥ 44 px tall**, and every change makes
   the affected object visibly respond. Remove any control that teaches nothing.
9. **Visual experience.** Layout v3 (standards §4) and the immersive direction (§6). Decide
   first: the main visual object, the main action, what the student must notice first, and
   what can be removed. The experiment is the hero — full content width, most of the screen,
   objects big enough to read from several feet away, measurements drawn on the instruments.
   No dashboard: no rail, gauge grid, badges, logs or evidence tables on the page. Show the
   vessel and molecules in sync for organic chemistry, both large.
10. **Rendering level.** Choose 2-D / pseudo-3-D / WebGL by the table in standards §6.
    WebGL needs owner approval.
11. **Animation sequence.** 8–13 stages, one scene each, each proving one piece of the
    answer; CAUSE → PROCESS → EFFECT; virtual clock, so pause, speed and reduced motion
    govern everything.
12. **Implement.** Build the layout v3 page contract (`section#question`, `section#lab` with
    `canvas#labcv` + `#controls`, `section#solution`, optional `#analysis`, `section#howto`);
    take tokens, helpers, the virtual clock, the reveal and the engine pattern from the latest
    G4 page, then write the question-specific engine and scenes. Desktop landscape and phone
    portrait canvas layouts; every canvas label through one helper feeding `PX.minLabelPx()`.
    One file, ES5, unique ids, `window.PX` hooks. If you merge code from several pages, check for
    duplicate function names and ids.
13. **Answer calculation.** `run(D)` returns everything derived; `var QRUN = run(copyST());
    var ANS = QRUN.answer;`. Custom runs must report honestly when they no longer answer the
    question. **No answer literal in the source.**
    **Target display** (standards §4, *Target variable*): the key-result line shows only the
    target's name or symbol (`Target: v`) until the run determines it. Never "UNKNOWN", "?", "—"
    or a placeholder. The run then writes the computed value into the same line with one short
    pulse, and it stays. Reduced motion: the value appears without the pulse. Reset returns the
    line to the symbol only.
14. **Detailed solution:** complete, exam-level, always open, right after the experiment, and
    tied to what the student observed. Chemistry: structures, mechanism, bonds breaking and
    forming, curved arrows, intermediates, stereo- and regiochemistry, calculations. Physical
    chemistry: set-up, equations, substitutions, calculations, observations, interpretation.
    Physics: diagram, equations, derivation, values with units, reasoning, result. Plus an option
    table, traps, and an independent verification block (≥ 5 checks).
15. **Concept explanation:** the pivot, stated plainly, with jargon defined (inside the
    solution section).
16. **Key takeaways:** 3–6 exam-useful statements (inside the solution section). A graph goes
    in `#analysis` only if it helps understand or solve; "How to use" is five short points.
17. **Validate:** follow `prayogx-validate` (verifier + page suite).
18. **Test mobile / browser / console:** 390 and 360 px with no overflow, zero console
    errors, reduced motion, classroom mode. Run `node tests/visual_gates.js <page>` (gates A C D
    E F I J K must pass) and screenshot every stage at 1280 and 390 px and **look** (gates B G H).
    Repair and re-run until clean.
19. **Metadata:** write `meta.json` and `question.md` (see `prayogx-register`).
20. **Register:** follow `prayogx-register`.
21. **Generated-content validation:** the four tools plus the drift gate, all green.
22. **Reel (automatic for every NEW simulation):** only after steps 17–21 are green, so the page is
    validated and in the website and app feed. Run
    `node tools/reel-maker/generate-reel.js <ID> --draft`, which records the page read-only and writes
    `tools/reel-maker/reels/<ID>.json`. Then write the story: a question-specific hook, problem line,
    curiosity line, the moments (the page's phases), callouts, the aha and the caption. Check it with
    `--preview t1,t2,…`, look at the frames, and run `node tools/reel-maker/generate-reel.js <ID> --origin new-simulation`
    (or `auto_sim.py reel <batch> <n>` in the factory). It must end with every reel check passed (`30 / 30`, plus
    the voice checks when narrated) and
    `READY_FOR_REVIEW`; it is never approved or published here (`tools/instagram_publish.py` is the owner's
    step), except for a question the owner names in End-to-End Production Mode (CLAUDE.md). If the reel fails, fix the story or the reel tooling, never the
    simulation. If it still fails, report "Simulation complete; Reel generation failed."
    Existing simulations never get a reel unless the owner asks for one (`tools/reel-maker/README.md`).
23. **Report:** use the format below, then **stop**. Don't commit unless the owner has
    authorised it; never push.

## Design brief template

```
ID / QUESTION   ADV-…  (source: papers/<file> p.<n>)
PIVOT           <the one idea the student must feel>
INDEPENDENT ANSWER  <value>   OFFICIAL KEY <value>   AGREE? yes/no
EXPERIMENT      <apparatus / molecules / process>
MAIN VISUAL     <the one object that fills the screen>   NOTICE FIRST <what the eye must land on>
MAIN ACTION     <what the student does / what happens>
RENDERING       2-D | pseudo-3-D | WebGL (approval?)     WHY: <learning value>
CONTROLS        <toggles / segmented / number inputs / sliders — no dropdowns; each: what it changes>
MEASUREMENTS    <≤ 4, drawn on the instruments>
STAGES (8–13)   1 <scene → what it proves> … n <reveal>
ORGANIC         vessel event ↔ mechanism step, per stage
GRAPHS          none | <one or two, and why each helps>
EXPLORER        none | <only if it teaches what the experiment cannot>
REMOVED         <what a G4 page would have shown that this page leaves out>
SOLUTION        <figures / calculations>, option table, traps, ≥5 checks
CONCEPT         <pivot in one paragraph>     TAKEAWAYS  <3–6>
```

## Report format

```
COMPLETED     <ID> — <lab name>
FILES         created / updated (paths)
VERIFICATION  verifier N/N · page suite N/N · visual gates A–K (measured pass, B G H looked at) · check_library OK · production_audit N/N · drift clean
              independent answer <x> · official key <x> · published solution <x or n/a>
ISSUES        <anything not done or not verified — say so plainly>
REGISTRY      manifest (N simulations) · taxonomy · tracker.csv · README row · tests registered
REEL          tools/reel-maker/output/<ID>/reel.mp4 · <s> s · 30/30 reel checks · READY_FOR_REVIEW (not published)
              (or: Simulation complete; Reel generation failed — <why>)
NEXT          owner reviews; publish with ./publish.sh when approved
```
