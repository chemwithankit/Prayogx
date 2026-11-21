# Quality gates

## Stage gates (five-stage review, in `review.md`)
Script, storyboard, visuals, editing/audio, final: each scored honestly out of 10 against the Mole reel
standard and revised before the next stage. Write what was wrong and what changed, not only the score.

## Automated checks
`qa_reel.py` (all checks; the release copy's standing 45 ms AAC offset is the one accepted miss): loudness,
true peak ≤ −1 dBTP, narration 10–20 LU over ducked music per scene, no dead air > 1 s, clean start and
end, no still stretch > 2 s under narration, correct size and frame rate.

## The 100-point scorecard (final render only)

| Area | Points | Asks |
|---|---|---|
| Conceptual accuracy | 20 | correct, complete for its scope, builds logically, a beginner gains real understanding |
| Storytelling and script | 15 | the hook stops a scroll, curiosity holds, pacing, a satisfying end, memorable |
| Visual richness and animation | 20 | cause → process → effect, polish, enough meaningful developments, own idea |
| Cinematography and transitions | 10 | purposeful, varied moves; one continuous world |
| Sound design and music | 15 | designed effects on events, music follows the story, clean balanced mix |
| Typography and composition | 10 | readable on a phone, nothing clipped or colliding, frames well filled |
| Editing, polish and branding | 10 | no glitches or awkward pauses, brand correct, no avatar in new reels |

### Scorecard v2 measures (2026-11-21, new reels)
Score each area from these measures, not from impressions. Automated ones come from `tools/reel_pipeline.py`.
- Hook: something visibly changes by 1 s; hook type not used in the last three reels; first line ≤ 12 words.
- Accuracy: `maths_validator.py` passes on every equation and number; every fact has two checks in the package.
- Coverage: every preparation and named reaction in `coverage.json` is in the video, with a reaction shot.
- Script: Hinglish lint 0 errors; about 2.6 words per second on average, no stretch above 3.2.
- Objects: every object in `visual-design.md` has a reference and reads as the real thing in `qa/objects.jpg`.
- Animation: no still stretch > 2 s under narration; reuse check passes.
- Sound: −1 dBTP, voice 10–20 LU over music, every key term voiced correctly.
- Consistency: glossary terms identical in the script, caption, notes, quiz and workbook.
- Calibration: after the owner watches a reel, add `{slug, qaScore, ownerScore}` to `packages/calibration.json`;
  if QA is more than 5 points above the owner on three reels, make the QA prompt stricter.

**Approve at ≥ 90.** Score what is on screen, not what was intended.

## Critical failures (block approval at any score)
- a scientific or numerical error, or a misleading picture;
- a broken, glitching or wrongly sized render;
- unreadable or clipped meaningful text;
- narration mis-voiced, inaudible or out of sync;
- a hook that misleads, or a story a first-time viewer cannot follow;
- a treatment that repeats another recent reel's;
- an owner rule broken (language, CTA, licences, chalk rules, no avatar in new reels).

## Smart QA: severities, computed score, two rounds (owner, 2026-11-22)
Applies to jobs started from 2026-11-22. All thresholds are in `tools/qa_rules.json`, the one source.

| Severity | Definition | Blocks? |
|---|---|---|
| **critical** | anything in "Critical failures" above: wrong or made-up science, misleading picture, named reaction not shown, generic stand-in for a key object, clipped or < 28 px meaningful text, mis-voiced key term, broken render, owner rule broken | always |
| **major** | clearly hurts understanding or phone quality and the fix is clear: text 28–39 px (equations < 48), inside the 64 px edge margin, a collision, a still > 2 s under narration, a too-small hero, a wipe onto an empty frame, weak visible change in a reaction | yes, unless it is raised late (below) |
| **minor** | polish a casual viewer would not notice | never; it is logged and fixed if cheap |

- A mandatory check is "no" only when an open critical or major issue maps to it.
- **Score** = each area's maximum minus open issues in that area: critical −8, major −3, minor −0.5 (at most −2 per
  area). "Fixed" counts until it is verified. **Pass** = 0 open critical or major issues, ten checks "yes", score
  ≥ 90.
- **Round 0** (`qa_auto.mjs` + `qa_ledger.py auto`) is clean before review 1. Its rules re-run on every later
  render, so a fixed measurable issue that comes back is **reopened** automatically.
- **Rounds:** review 1 (anything) → fix pass 1 → review 2 → fix pass 2 → verification review. From review 2 on, a new
  non-critical issue in an unchanged scene goes to the **backlog** and does not block.
- **Escalate to the owner** (`qa/escalation.md`, written by the ledger) when a critical issue is open after review
  2, the score did not improve between reviews, or the review limit is reached. Never run a fourth review.
- **Renders during QA:** `tools/scene_render.py` re-renders only the changed scenes and joins them. Make the
  thumbnail and the release copy once, after the reel passes.

## Improvement loop
Problem → cause → change (script, storyboard, animation, sound or edit) → re-render → re-inspect. Each pass
is logged in `review.md` under "Improvements made in QA". Within the round limit above, the loop runs until the gate
is met. If it cannot be met, the ledger escalates, and the escalation note tells the owner what is in the way.

## Honesty
Claude cannot hear the mix or watch motion in real time: audio is judged by measurement and cue lists,
motion by dense stills. Say so in the review, and name the remaining gaps. Never call a reel
human-reviewed; the owner's viewing is the final gate.
