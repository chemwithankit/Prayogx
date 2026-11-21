# 05 — Production Quality Assessment

Status: assessment, 2026-11-21. Evidence: the job folders, `AUDIT-2026-11-17.md`, the Instagram snapshot of
2026-11-05 (102 reels: median views 1,280; mean average watch time 12.0 s), and the views diagnosis in memory
(watch share 28 % → 15 %; broad questions 38–56 %, niche reaction topics 9–15 %).

**Honesty note:** this audit read files, scorecards and numbers; it did not watch every reel. Motion and audio
judgements below come from the owner's verdict, the audit, the job files and metrics.

## 1. Why the videos fall short of the next level

| Dimension | What the evidence shows | Effect |
|---|---|---|
| **Hook** | Hooks were written as lines, often a "why…?" question, rarely a visible event in frame 1. No hook log, so types repeat. Niche topics (aldol, haloform, Tollens) open on a term the casual viewer does not know. | Lowest watch share (9–15 %) exactly on those topics. |
| **Script** | Pre-11-17 scripts used translated Hindi; facts lived only in the script, not in a checked sheet. Pace set by fitting a length. | Lint now catches language; fact errors still have no second route. |
| **Depth** | "One idea per reel" cut preparations and reactions (04-014, 04-015, 04-017). Now "one complete topic", 60–180 s. | Risk swings the other way: long, dense reels that lose casual viewers. Need depth *and* a 15–30 s payoff. |
| **Storyboard** | Only 22 of 162 jobs have `production-plan.md`; most reels were built straight from the script. | Scenes illustrate words instead of showing a process. |
| **Assets** | 2 of 162 jobs have an object sheet. Generic beakers, boxes, labelled circles. | Looks "made by template"; undermines trust. |
| **Animation** | Same `Shell`, captions, push/pull camera and 8–9-scene arc across batches; imports from other jobs. | Owner's "same template" verdict. |
| **Voice** | Sarvam is natural but occasionally translates terms; levelled and aligned well. | Small but noticeable credibility hits. |
| **Timing** | Effects cued to words (good); but long explanatory stretches with one visual. | Mid-reel drop-off (inferred from 12 s average watch). |
| **Editing** | Release encode and loudness are solid (measured). Few deliberate pattern interrupts. | Clean but flat. |
| **Educational effect** | No measurement of learning: no quiz-to-reel link, no retention by section. | Cannot tell which teaching choices work. |
| **Process** | Self-scored 91–92 at final; ~1 hour per reel; batches of 6+/day. | Scores carried no information. |

**Root cause in one line:** the rules are good but mostly prose; the few that are scripts (lint, reuse, qa_reel)
work. What cannot be measured is judged by the author, under batch pressure, with no feedback from real viewers.

## 2. Reel Quality Scorecard v2 (measurable)

Keeps the 100-point card in `quality-gates.md` and adds measured sub-scores so a score means the same thing
every time. **A** = automated, **I** = independent reviewer with frame evidence, **O** = owner, **M** = market (after publish).

| Area | Pts | Measures (how) |
|---|---|---|
| Hook (0–3 s) | 10 | visible change by frame 30 (A: frame diff); hook type not in last 20 (A: hook log); first line ≤ 12 words (A); a stranger understands what's at stake (I) |
| Scientific accuracy | 15 | Maths Validator 100 % (A); every factual line has a factRef with 2 sources (A); zero errors found by QA (I) |
| Coverage & depth | 10 | coverage map: no unexplained gaps (A); every named reaction has a reaction shot (A: storyboard ↔ script) |
| Story & script | 10 | Hinglish lint 0 errors (A); ≤ 2.6 words/s average, no stretch > 3.2 (A: align.json); payoff/takeaway in the last 10 % (I) |
| Visual design & objects | 15 | object sheet complete with references (A); objects read as real at phone size (I: `objects.jpg`) |
| Animation & cinematography | 15 | no still > 2 s under narration (A); dominant-action per shot (I); ≥ 5/8 grammar axes new, reuse check pass (A) |
| Voice & sound | 10 | STT term match ≥ 98 % (A); −1 dBTP, 10–20 LU voice over music (A); designed SFX on events (I) |
| Typography & composition | 5 | text ≥ 40 px, equations ≥ 48 px, no collisions (A: layout check on stills) |
| Package consistency | 5 | glossary diff 0 between reel captions, notes, quiz, caption (A) |
| Educational effect | 5 | 10-question quiz maps to reel beats (A); QA "would a first-time student learn it" (I) |
| **Total** | **100** | **Gate: ≥ 90 and all ten mandatory checks yes** |

**Market score (after 7 days, not a gate, used for learning):** watch share vs channel median, 3-s hold
(YouTube Analytics), saves + shares per 1,000 views, follows per 1,000 views, Learn page visits from the link.

**Calibration:** each time the owner reviews a reel, record owner score vs QA score in
`jobs/_calibration.jsonl`. If QA is > 5 points above the owner on 3 reels, tighten the reviewer prompt.

## 3. Highest quality per unit of effort and cost

| # | Change | Effort | Cost | Expected gain |
|---|---|---|---|---|
| 1 | **Visible-event hooks + hook log** (Hook Creator, 5 candidates, first-3-s storyboard) | S | 0 | largest: watch share is the main ranking signal |
| 2 | **Make the existing gates mandatory in a runner** (state.json; cannot render without research, design sheet, lint, reuse) | S | 0 | stops the 2-in-162 adoption gap |
| 3 | **Concept package + glossary** (doc 06) | M | 0 | consistent terms; notes/quiz/workbook from one source; fixes 10/25 counts |
| 4 | **Two-length strategy**: a 20–40 s "one surprising thing" cut for Instagram + the complete 60–180 s topic for YouTube/Learn, from one build | M | 0 | broad-reach short cut + complete teaching long cut (15–40 s reels had the best median, n=4). **Owner decision:** this changes the "one complete topic per reel" rule for Instagram only; the complete reel stays the teaching unit |
| 5 | **Second-model fact check** (Gemini grounded) + Python maths validator | S | ~₹ tens/reel | removes the most damaging failure class |
| 6 | **Gemini video review of the MP4** as a second independent QA (watches motion, hears audio) | S | low | closes "Claude cannot hear the mix" gap |
| 7 | **Object library of real apparatus** (drawn once, reviewed, reused as *infrastructure*, not scenes) | M | 0 | real objects without per-reel redraw time |
| 8 | **Analytics loop** (YouTube Analytics + weekly IG pull → topic/hook choices) | M | 0 | decisions from data, not guesses |
| 9 | AI plates (Nano Banana) for realism shots only | S | low | richer worlds where a lab/real place matters |
| 10 | Veo clips | M | high | low teaching value; last |

Avoid: more agents for their own sake, full-3D (owner rule), raising batch size before scores rise.
