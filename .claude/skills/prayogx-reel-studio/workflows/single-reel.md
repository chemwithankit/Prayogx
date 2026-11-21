# Single reel: the eight stages

Studio: `S=~/Documents/motion-design-studio/motion-studio`. Job: `$S/jobs/<slug>/`, code `$S/src/<slug>/`.
Each stage ends with its score and its honest gaps written in `review.md`. A stage below its gate is
revised before the next begins.

## 1. Research → `research.md`
`research-protocol.md`. Primary source read in full, ≥ 2 further sources, numbers solved independently.

## 1b. Package and hook
`tools/content_package.py init <RM-ID>` (before research), fill the package from the research, then
`agents/hook-creator.md` → `hooks.json`. Run `tools/reel_pipeline.py check <slug>` after each stage from here on.

## 2. Creative exploration → `creative.md`
`agents/creative-director.md`. Three or more treatments, one chosen, the carried-through picture named, the
diversity check against the last five jobs recorded.

## 3. Script → `script.md`, `pronounce.json`
`agents/scriptwriter.md`. Write, then read it aloud in your head as the viewer: where would they scroll
away? where is a term used before it is felt? Revise. Gate: 10/10 on hook, story, clarity, accuracy,
language.

## 4. Storyboard, camera, sound → `production-plan.md`, `sound-plan.md`
`storyboard-protocol.md`, `agents/cinematographer.md`, `agents/sound-director.md`. Gate: every shot has a
dominant action on a word, a camera decision, a sound decision and a reason. **No code before this gate.**

## 5. Build
1. Voice: `scripts/sarvam_vo_sentences.py <job> --speaker anand_hi_news --pace 1.2 --whole`, then
   `scripts/session-helpers/stt_hindi.py`, `scripts/align-voice.py`, `scripts/level-voice.py`
   (`tests/.venv` python). Fix mis-voiced words and re-voice only those clips.
2. Scenes in `src/<slug>/`, cued with `at()` / `num()` from `timing.ts` (mind repeated tokens and digits).
3. Stills pass after each scene, not at the end:
   `node scripts/session-helpers/stills.mjs <job> <Comp> <secs…>`; read `qa/grid.jpg` at phone width.
4. Audio: `END_HOLD=110 node scripts/gen-audio-reel.mjs <job>` from the sound plan; new effects are added
   to the generator when the plan needs them.

## 6. Render and inspect
`bash scripts/session-helpers/render.sh <job> <Comp>` (render, thumbnail, release copy, `qa_reel.py`). Then
a full contact sheet of the final render. A render that passes the script is only a candidate.

Smart QA reels (from 2026-11-22) follow these steps instead of the full re-render loop:
1. Run `node scripts/session-helpers/qa_auto.mjs <job> --stills`.
2. Run `python3 tools/qa_ledger.py auto <slug>`, which is Round 0 and must be clean.
3. For the first render, run `python3 tools/scene_render.py <slug> <Comp> --all`.
4. After every fix, run `scene_render.py` again without `--all`, so only the changed scenes are re-rendered.
5. Make the thumbnail and the release copy once, after the reel passes (`render.sh`, or `jobs/<slug>/release.sh`).

## 7. QA and improvement loop → `review.md`
Smart QA reels: the ledger runs this stage (`agents/qa-director.md` §Smart QA, `quality-gates.md` §Smart QA). The
limit is two correction rounds, after which the ledger escalates.
`quality-gates.md`. Problem → cause → fix → re-render → re-inspect, logged. Approve at ≥ 90/100 with no
critical failure.

## 8. Deliverables (owner's standing list)
- Memory cards (Instagram carousel, 4:5) and their PDF: `bash scripts/session-helpers/cards.sh <job>
  <Comp>Cards`; each card has its own visual.
- Short notes (Drive doc with the Short's link), workbook PDF, quiz, Learn topic JSON.
- A simulation only if it passes the REQUIRED test.
- Thumbnail names the subject, never the class.
- `publish/` files via `bible_publish_files.py`.

## Then stop for the owner
Show the reel and the scorecard. Shipping (`chalk_ship.sh`), the Learn deploy (`chalk_deploy.sh`), the Reels
Log row and the roadmap update happen only on the owner's approval for that reel, or under an auto-publish
instruction the owner gave for that batch. Even then, a reel below the gate is never published.
