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
| Editing, polish and branding | 10 | no glitches or awkward pauses, brand and avatar correct |

**Approve at ≥ 90.** Score what is on screen, not what was intended.

## Critical failures (block approval at any score)
- a scientific or numerical error, or a misleading picture;
- a broken, glitching or wrongly sized render;
- unreadable or clipped meaningful text;
- narration mis-voiced, inaudible or out of sync;
- a hook that misleads, or a story a first-time viewer cannot follow;
- a treatment that repeats another recent reel's;
- an owner rule broken (language, CTA, licences, chalk rules, avatar).

## Improvement loop
Problem → cause → change (script, storyboard, animation, sound or edit) → re-render → re-inspect. Each pass
is logged in `review.md` under "Improvements made in QA". Loop until the gate is met; if it cannot be met,
stop and tell the owner what is in the way.

## Honesty
Claude cannot hear the mix or watch motion in real time: audio is judged by measurement and cue lists,
motion by dense stills. Say so in the review, and name the remaining gaps. Never call a reel
human-reviewed; the owner's viewing is the final gate.
