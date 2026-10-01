# PrayogX Reel Maker

Turns a published PrayogX simulation into a vertical Instagram Reel (1080 × 1920, H.264 + AAC, 20–40 s), with a
thumbnail and a caption. The footage is the **real simulation page**, recorded frame by frame. Phase 1 makes reels
only: nothing is published anywhere.

```bash
node tools/reel-maker/generate-reel.js ADV-2026-P1-PHY-Q14
```

Output (git-ignored, never deployed; `tools/` is excluded from the site):

```
tools/reel-maker/output/<ID>/
  reel.mp4        the reel
  thumbnail.jpg   a designed cover (1080 × 1920)
  caption.txt     Instagram caption with hashtags (no spoiler)
  reel.json       manifest: timeline, sound cues, source page and commit, validation results
```

Options: `--reuse-footage` skips recording if footage exists; `--preview 3.5,18,33` renders only those moments
(and the thumbnail) to PNG for a quick look; `--keep-work` keeps the composed frames.

## How it works

| Stage | File | What it does |
|---|---|---|
| Story | `reels/<ID>.json` | The question-specific part: hook, which simulation moments to show, callouts (in canvas coordinates), the aha moment, answer and payoff lines, thumbnail and caption text. |
| Record | `recorder.js` | Opens the page with the project's Playwright (`tests/_browser.js`) at a phone viewport. It replaces `requestAnimationFrame` / `performance.now` / `Date.now` with a manual clock and steps the page 1/30 s at a time, screenshotting `canvas#labcv` and logging `PX.state()` for every frame. The page is not modified. It also reads the question text, lists and options from the page, and stills such as the revealed `#target`. |
| Compose | `composer/` | A 1080 × 1920 stage page. The template `question-simulation-v1` builds the beats (hook → context → question → problem → "can we see it?" → one beat per simulation moment → aha → answer → payoff) and draws every frame as a function of time: kinetic type, the real footage with crops and punch-ins, callouts, a match scoreboard, the answer reveal, branding. It reports every text box and every sound cue. |
| Sound | `audio.py` | Synthesizes royalty-free sound design with numpy (pad bed, whoosh, riser, impact, pop, tick, ping, ding, reveal chime, shimmer) on the composer's cue sheet. |
| Encode | `encode.swift` | macOS AVFoundation: frames + WAV → H.264 High + AAC 192 kb/s MP4. Also `probe` (duration, size, codecs) and `frames` (decode at given times). Compiled once into `.cache/`. No ffmpeg; nothing is downloaded. |
| Validate | `validate.js` | 16 checks: the files; 20–40 s; 1080 × 1920 (9:16); H.264 / 30 fps / AAC stereo; playable; decoded video matches the composition at every beat; no black or empty frame; every beat present; the question as the page states it; real footage throughout the experiment beats; the aha; the answer reveal; branding; all text inside the Instagram-safe area; thumbnail; caption. |

## A new reel

Write `reels/<ID>.json` for a layout v3 page (it needs `canvas#labcv`, `section#question`, and `window.PX` with
`start()`, `state()` and `RUN.done`). Pick the moments by `PX.state()` fields (`match`, `phases`), give the regions
of the canvas to show, and write the story lines. The engine needs no change. The template sizes the beats from
the content, so durations vary per question.

## Limits

- The encoder uses macOS AVFoundation, so reels are made on a Mac (the rest is portable).
- One template so far (`question-simulation-v1`).
- The sound is synthesized: good enough for review, but music can be laid over the `audioCues` in `reel.json` later.
- A full build takes about 6 minutes on this Mac (recording about 1.5, composing about 3, sound + encode + validation about 1.5).
