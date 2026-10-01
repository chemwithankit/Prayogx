# PrayogX Reel Maker

Turns a PrayogX simulation into a vertical Instagram Reel (1080 × 1920, H.264 + AAC, 20–40 s), with a
thumbnail, a caption and a manifest. The footage is the **real simulation page**, recorded frame by frame,
read-only. Nothing is published anywhere: Instagram publishing is a later phase.

## When a reel is made

| Simulation | Reel |
|---|---|
| **New** (built by `prayogx-new-simulation` / the factory) | **automatically**, once it is validated and in the website and app feed: `python3 tools/auto_sim.py reel <batch> <n>` or `--origin new-simulation` |
| **Existing** | **never automatically**; only when the owner asks ("Generate a Reel for Q3"): `node tools/reel-maker/generate-reel.js ADV-2026-P1-PHY-Q03` |

Either way the simulation is a read-only source. The generator hashes every file in its folder before and
after, and the reel fails if anything changed. A reel problem is fixed in the story spec or here, never in the
simulation.

## Commands

```bash
node tools/reel-maker/generate-reel.js ADV-2026-P1-PHY-Q03 --draft          # 1. record, write a first story spec
node tools/reel-maker/generate-reel.js ADV-2026-P1-PHY-Q03 --preview 3,15,24  # 2. look at frames while editing it
node tools/reel-maker/generate-reel.js ADV-2026-P1-PHY-Q03                  # 3. the reel (on request)
python3 tools/auto_sim.py reel <batch> <n>                                   #    the reel of a new factory item
```

Options: `--reuse-footage` skips recording; `--keep-work` keeps the composed frames; `--origin new-simulation |
on-request` is recorded in `reel.json` (the factory passes `new-simulation`).

Output (git-ignored, never deployed; `tools/` is excluded from the site):

```
tools/reel-maker/output/<ID>/
  reel.mp4        the reel                       thumbnail.jpg   a designed cover (1080 × 1920)
  caption.txt     Instagram caption, no spoiler  reel.json       manifest: origin, status, timeline, sound cues,
                                                                  answer reveal, source page + commit, integrity
                                                                  hashes, validation (Phase 3 reads these four)
```

A successful run ends `18 / 18 reel checks passed` and `READY FOR MANUAL REVIEW`.

## How it works

| Stage | File | What it does |
|---|---|---|
| Story | `reels/<ID>.json` | Everything question-specific: hook, problem and curiosity lines, the moments to show, crop regions, callouts, the aha, answer overrides, thumbnail and caption. Reviewable and reproducible. |
| Record | `recorder.js` | Opens the page with the project's Playwright (`tests/_browser.js`) at a phone viewport and steps it on a manual clock (`requestAnimationFrame`, `performance.now`, `Date.now`), 1/30 s at a time. It captures the hero element (default `canvas#labcv`) and every simple field of `PX.state()` (and `PX.stage()`) per frame. It also reads the question, lists and options from the page, its result line (`#target`, or `#keyline` on older G5 pages) and its figure. |
| Compose | `composer/` | A 1080 × 1920 stage. The template `question-simulation-v1` builds hook → context → question → problem → curiosity → the moments (+ aha) → answer → payoff and draws every frame as a function of time. It reports every text box and sound cue. |
| Sound | `audio.py` | Royalty-free sound design synthesized with numpy on the cue sheet. |
| Encode | `encode.swift` | macOS AVFoundation: H.264 High + AAC. Also `probe` and `frames`. Compiled once into `.cache/`. |
| Validate | `validate.js` | The 18 checks below. |

### The story spec

- `regions`: named crops of the recorded element, in its own units (canvas pixels): `"name": [x, y, w, h]`.
- `story.hook`: `beats` (optional rhythm words), `colors`, `line`. `story.problem`: lines. `story.curiosity`: one line.
  `*word*` highlights.
- `story.question`: `highlight` (words to mark), `listLabels` (subtitles for List-I / List-II), `figure: false`,
  `seconds`. The text, lists, options and figure come from the page itself.
- `story.moments[]`: `id`, `seconds`, `region`, `label`, `sub`. Choose the frames with `phases` (the page's
  `phase`, or `stage`), `match` (any recorded field) and/or `window` ([from, to] s of simulation time). A short
  run plays in slow motion. Optional `callout` (`text`, `anchor` in region units, `side`: `left`, `right`, or
  `lane` for a pill under the footage with a ring on the anchor, `from` 0–1), `result` (a scoreboard appears when
  two or more moments have one) and `aha` (`seconds`, `zoom` region, `kicker`, `lines`, optional `verdict`).
  `story.momentKicker` names them (default EXPERIMENT).
- `story.answer`: optional `lead`, `ring`, `headline`, `sub`, `still`, `stillLabel`. By default these come from
  the registry's question type and answer (OPTION B / OPTIONS A, C / ANSWER 0.50).
- `thumbnail`: `kicker`, `lines`, `region`, and frames by `phases` / `frameMatch` / `window`. `caption`: `hook`,
  `body`, `cta`, `hashtags`.

### The 18 reel checks

The files exist · 20–40 s · 1080 × 1920 (9:16) · H.264 / 30 fps / AAC stereo, playable · the decoded video
matches the composition at every beat · no black or empty frame · every beat present and in order · the
question as the page states it · real footage through every experiment beat · the footage recorded to its end
with no page errors · the aha · the answer reveal · **no premature answer** (no text before the reveal shows it)
· branding · all text inside the Instagram-safe area · thumbnail · caption without a spoiler · **the simulation
only read** (byte-identical folder).

## Limits

- Encoding needs macOS (AVFoundation + `swiftc`); elsewhere the generator stops with a clear message. Recording
  and `--preview` work anywhere.
- One template so far (`question-simulation-v1`). Pages need `window.PX.start()` and something to record; older
  pages may need `record.element`, `record.actions` or `record.done` in the spec.
- The sound is synthesized; real music can be laid over `audioCues` later.
- A full build takes about 4–7 minutes.
