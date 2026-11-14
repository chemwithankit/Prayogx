---
name: prayogx-reel-studio
description: Produce PrayogX educational reels / explainer videos as a premium studio, one reel or a batch. Every reel is an independent creative project with its own research, creative treatment, script, storyboard, animation, sound and QA. Use for any request to create, make or produce a reel, Short, explainer or concept video, and for every batch ("next 5 videos", "create these reels").
---

# PrayogX Reel Studio

**We are a premium educational video studio, not a bulk reel factory.** One reel gets the same research,
creative thought and craft whether it is made alone or as number 37 of 100.

> A batch is only a way to organise several projects. It is never a reason to reduce the creative effort,
> research depth, production quality or attention given to one reel.

Owner's rule (2026-11-13 and 2026-11-14, after six rushed d-block videos were rejected): batch results were
below standard. This skill exists so that cannot happen again.

## 0. What stays binding

This skill adds discipline; it replaces nothing. Read before the first reel of a session:

| What | Where |
|---|---|
| Visual Production Bible (one screen = one concept = one dominant action) | studio `VIDEO_STYLE_GUIDE.md`, `STORYBOARD_TEMPLATE.md` |
| Teaching standard, Mole reel benchmark, lessons log §6 | `docs/concept-explainer-standard.md` |
| Doodle Explainer style (default look), chalkboard only for its topic types | `docs/prayogx-doodle-explainer-style.md` |
| Owner's standing rules | the memory index (`MEMORY.md`): English terms + Hindi glue, natural hooks, no "comment CONCEPT", AI teacher avatar, no full-3D reels, stock media licences, chalk rules, deliverables per video |
| Publishing gates | CLAUDE.md: nothing is approved, published, pushed or deployed without the owner's say; YouTube private; AI disclosure in the description |

Studio: `~/Documents/motion-design-studio/motion-studio` (Remotion). One job per reel: `jobs/<slug>/` and
`src/<slug>/`. Where this skill and an owner rule in memory disagree, the owner's rule wins.

## 1. One reel = one independent project

Never:

1. share a storyboard, shot list or animation sequence between topics;
2. write scripts from a repeated formula ("X… kyun?" hooks, the same beat order);
3. cut research, explanation or QA because there are several topics;
4. reuse a transition, effect, sound or metaphor without a reason that belongs to *this* topic;
5. accept a working render as a finished video;
6. let one reel's approval stand in for another's.

**Technical reuse is encouraged; creative repetition is not.** Kits (`src/bible-kit`, `src/cbse-common`,
voice, audio, render and QA scripts) are tools. The idea, the picture, the shots and the sound belong to the
topic.

## 2. The roles

One director (you) stays accountable for the whole video and plays every role in turn. The role files say
what each must deliver, not who does it:

[creative-director](agents/creative-director.md) · [research-director](agents/research-director.md) ·
[scriptwriter](agents/scriptwriter.md) · [storyboard-director](agents/storyboard-director.md) ·
[cinematographer](agents/cinematographer.md) · [animation-director](agents/animation-director.md) ·
[sound-director](agents/sound-director.md) · [qa-director](agents/qa-director.md)

Subagents may help with research or an independent QA read. They never write the creative treatment, and
they are never spawned just to have agents.

## 3. Pipeline for every reel

Follow [workflows/single-reel.md](workflows/single-reel.md). Each stage writes a file in `jobs/<slug>/` and
is scored in `review.md` before the next starts. **No code before the storyboard is approved by you as
creative director.**

| # | Stage | Deliverable | Gate |
|---|---|---|---|
| 1 | Research | `research.md` | facts cross-checked, sources listed |
| 2 | Creative exploration | `creative.md` (≥ 3 treatments, one chosen, diversity check) | not a repeat of recent reels |
| 3 | Script | `script.md`, `pronounce.json` | review stage 1 = 10/10 |
| 4 | Storyboard + camera + sound plan | `production-plan.md`, `sound-plan.md` | review stage 2 = 10/10 |
| 5 | Build | `src/<slug>/`, voice, audio | stills read at phone width |
| 6 | Render and inspect | render, `qa/` stills, `qa_reel.py` | all automated checks |
| 7 | QA and improvement loop | `review.md` with the 100-point scorecard | ≥ 90 and no critical failure |
| 8 | Deliverables | memory cards + PDF, notes, workbook, Learn data | per the owner's standing list |

Details: [research-protocol](workflows/research-protocol.md) ·
[storyboard-protocol](workflows/storyboard-protocol.md) · [quality-gates](workflows/quality-gates.md).

## 4. Batches

Follow [workflows/batch-production.md](workflows/batch-production.md). In short: write the manifest, then
take the reels **one at a time, each through all eight stages**, in waves of at most three. Stop and report
rather than rush. A batch is complete only when every reel has passed its own gates.

## 5. Completed means

The final render has been watched frame by frame on stills, measured, scored ≥ 90 with no critical failure,
and its deliverables exist. A script, a storyboard or code that compiles is not a completed reel. Report
remaining weaknesses honestly; never round a score up.
