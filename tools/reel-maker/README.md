# PrayogX Reel Maker

Turns a PrayogX simulation into a vertical Instagram Reel (1080 × 1920, H.264 + AAC, 20–40 s), with a
thumbnail, a caption and a manifest. The footage is the **real simulation page**, recorded frame by frame,
read-only. The soundtrack is an original score with synchronized effects, made here. This tool never publishes:
a person reviews, approves and publishes with `tools/instagram_publish.py` (docs/INSTAGRAM_PUBLISHING.md).

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
  caption.txt     Instagram caption, no spoiler  reel.json       manifest: origin, status + history, timeline,
                                                                  audio (provenance, arc, mix, measurements), answer
                                                                  reveal, source page + commit, integrity, the
                                                                  validated files' sha256, validation
  publish/        (after approval) publish.log, the lock - private, never committed
```

A successful run ends `30 / 30 reel checks passed` and `READY_FOR_REVIEW`.

States in `reel.json`: GENERATED → VALIDATED → READY_FOR_REVIEW here; then APPROVED → PUBLISHING → PUBLISHED →
VERIFIED only through `tools/instagram_publish.py`. Failures: GENERATION_FAILED (the build stopped, e.g. an
unlicensed audio asset), VALIDATION_FAILED, REJECTED, NOT_READY (files changed after validation),
PUBLISH_FAILED, VERIFICATION_FAILED. Regenerating a reel starts a new record and voids any approval.

## How it works

| Stage | File | What it does |
|---|---|---|
| Story | `reels/<ID>.json` | Everything question-specific: hook, problem and curiosity lines, the moments to show, crop regions, callouts, the aha, answer overrides, thumbnail and caption. Reviewable and reproducible. |
| Record | `recorder.js` | Opens the page with the project's Playwright (`tests/_browser.js`) at a phone viewport and steps it on a manual clock (`requestAnimationFrame`, `performance.now`, `Date.now`), 1/30 s at a time. It captures the hero element (default `canvas#labcv`) and every simple field of `PX.state()` (and `PX.stage()`) per frame. It also reads the question, lists and options from the page, its result line (`#target`, or `#keyline` on older G5 pages) and its figure. |
| Compose | `composer/` | A 1080 × 1920 stage. The template `question-simulation-v1` builds hook → context → question → problem → curiosity → the moments (+ aha) → answer → payoff and draws every frame as a function of time. It reports every text box and sound cue. |
| Sound | `music.py`, `audio.py` | The original score (composed in `music.py`), the effects on the composer's cue sheet, and the mix (see Audio). Refuses any asset not verified in `audio_library.json`. |
| Encode | `encode.swift` | macOS AVFoundation: H.264 High (no B-frames) + AAC-LC 48 kHz stereo 128 kbps, moov first. Also `probe`, `frames` and `audio` (decodes the MP4's track). Compiled once into `.cache/`. |
| Container | `mp4tools.py` | Removes AVFoundation's edit lists (Reels spec: none), repointing the chunk offsets; `inspect` for the checks. |
| Validate | `validate.js`, `audio_check.py` | The 30 checks below. |

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

### Audio

- **Music**: `prayogx-score-v2`, composed per reel by `music.py` (polyBLEP saws and supersaws, additive piano,
  marimba, bells and plucks, a string section, a synthesized drum kit - no samples). Five styles chosen from the
  subject and chapter (override with `audio.style` in the story spec; `audio.energy: "high"` starts the groove one
  stage further on):

  | Style | Used for | Character |
  |---|---|---|
  | `edm` | electricity, magnetism, induction, modern physics, mechanics | four-on-the-floor, offbeat reese bass, sidechained supersaw stabs, plucked arpeggios, a supersaw drop |
  | `synthwave` | optics, waves | gated snare, octave-bouncing bass, wide pads, a vibrato saw lead |
  | `cinematic` | thermodynamics, physical chemistry | taiko and toms, spiccato strings, piano theme, pulsing bass, a supersaw lift |
  | `organic` | organic chemistry | swung shaker and congas, marimba, pizzicato, piano chords, plucked bass, an electronic lift |
  | `crystal` | inorganic chemistry | shuffled 2-step hats, sub bass, bells and crystal arpeggios, supersaw chords |

  The chapter keeps an **identity instrument** that carries the hook in the intro and the breakdown. A **melodic
  hook** in phrase form (an idea, its sequence a step lower, the idea again, a cadence onto the tonic) recurs on
  different instruments and octaves. Harmony: a seeded progression of 7th and 9th chords, voice-led.
- **Arrangement** (from the reel's own beats): intro (the hook, a filtered pad) → verse under the question (soft
  chords and percussion, then a pulse) → build (kick, filter sweep, accelerating snare roll, riser, a half-beat gap)
  → the groove lands on a downbeat as the simulation starts and **changes at every moment**: A lean (drums, bass,
  arpeggio, hook), B full (chords, strings, hook an octave up), C broken beat with held bass and the harmony moved
  on, D peak - each with a fill, a crash and a rising dynamic → the aha stops the groove (breakdown, the hook at half
  speed) → pre-reveal roll and riser → **the drop on the answer reveal** (the hook on the big lead, everything in)
  → outro on the tonic major with the hook's cadence.
- **Production**: kick-keyed sidechain pumping, filter automation, swing, humanized timing and velocity, a synthetic
  room, and an automatic static mix that sets each stem's loudness (BS.1770) relative to the drums.
- **Effects**: `prayogx-sfx-v1`, synthesized on the composer's cues (whooshes, pops, pings, hits, the reveal).
- **Mix**: stems with priority VOICE > MUSIC > SFX. The music ducks 6 dB under the question, 4 under the problem
  lines, 6 under the aha text, 5 under the answer text and up to 4.5 under each effect (a voice stem, when there
  is one, ducks music 10 dB and effects 6). Then -14 LUFS integrated (BS.1770-4), a -1 dBTP true-peak limiter,
  a fade in, a 1.1 s fade out and a silent last frame.
- **Provenance**: `reel.json` → `audio.tracks` carries assetId, source, licence, licenseVerified, sourceReference,
  permittedUse, commercialUse, attributionRequired and attributionText for each track. To add an outside asset,
  list it in `audio_library.json` with `source: "file"`, its sha256 and a licence document kept in the repo; an
  asset that is not verified for commercial Instagram use is refused and the build stops (GENERATION_FAILED).
- **Sync**: the edit lists are removed, so the audio starts at 0. Apple's decoder still trims the AAC priming
  (the check below proves 0 ms on the decoded track); a decoder that does not would play it 44 ms late, inside
  the ITU-R BT.1359 tolerance for late audio, and never early.

### The 30 reel checks

The files exist · 20–40 s · 1080 × 1920 (9:16) · H.264 / 30 fps / AAC stereo, playable · the Reels container
(moov first, no edit lists, ≤ 300 MB, ≤ 25 Mbps, 23–60 fps) · the decoded video
matches the composition at every beat · no black or empty frame · every beat present and in order · the
question as the page states it · real footage through every experiment beat · the footage recorded to its end
with no page errors · the aha · the answer reveal · **no premature answer** (no text before the reveal shows it)
· branding · all text inside the Instagram-safe area · thumbnail · caption without a spoiler · **the simulation
only read** (byte-identical folder).

Audio, measured on the MP4's own decoded track (and the music stem): AAC stereo 48 kHz ~128 kbps as long as the video · **the decoded
waveform matches the rendered mix, offset under one frame** · the score's arc and the cues follow the beats (a
cue at the aha and the reveal) · every asset licensed (re-checked against the library) · no clipping (true peak
≤ -0.3 dBTP) · -14 ± 1.5 LUFS · no dead air over 1 s · a clean start and end · the aha and the reveal at least
3 dB above the bed · the music ducks under the question and answer text · **the music is composed and evolves**
(on the music stem: verse quieter than the groove, a breakdown on the aha, the drop the loudest part, a steady
beat, a measurable change at every groove stage, the hook in 3+ sections, 10+ instruments).

## Limits

- Encoding needs macOS (AVFoundation + `swiftc`); elsewhere the generator stops with a clear message. Recording
  and `--preview` work anywhere.
- One template so far (`question-simulation-v1`). Pages need `window.PX.start()` and something to record; older
  pages may need `record.element`, `record.actions` or `record.done` in the spec.
- The audio check's sync reference is Apple's decoder (AVFoundation); see Audio → Sync for other decoders.
- No voice-over yet: the mix reserves the top priority for one.
- A full build takes about 4–7 minutes.
