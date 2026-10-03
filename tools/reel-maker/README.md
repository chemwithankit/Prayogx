# PrayogX Reel Maker

Turns a PrayogX simulation into a vertical Instagram Reel (1080 × 1920, H.264 + AAC; duration set by the
concept, see Duration), with a thumbnail, a caption and a manifest. The footage is the **real simulation page**, recorded frame by frame,
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

### Duration

Reel duration is concept-driven, not fixed. Shorter is preferred when it is enough, but a reel may be longer when
the concept genuinely needs more explanation, narration or visual progression; every extra second must have a clear
educational or storytelling purpose. Guidelines, not limits: about **20–30 s** for a basic simulation or visual
showcase, about **40–50 s** for a concept explanation, longer for a complex concept when genuinely necessary. The
chain is concept → story beats → visual progression → narration → duration. Never compress a meaningful explanation
to hit a number, and never pad. Today the duration check enforces the story's `durationLimits` (default `[20, 40]`
in `validate.js`); a story that genuinely needs more time declares wider limits in its spec.

### Voiceover (decided and implemented 2026-10-03; publishing of narrated reels not enabled)

The provider-neutral narration layer is implemented: narration validation (*Narration model*, *Narration in the
story*), local verification and the verified voice stem in the mixer (*Verified voice*), and explicit generation with
verified-segment reuse and narrated variants (*Generating the voice*). The first narrated reel,
`ADV-2026-P2-PHY-Q01.narrated`, is READY_FOR_REVIEW. Publishing is intentionally not enabled for narrated variants:
the publishers cannot see them, so none is published until the owner decides how and changes that deliberately.
These decisions bind the implementation:

1. **Provider-neutral.** reviewed spoken-form script → provider adapter → generated audio → local verification →
   voice stem → the existing `audio.py` mix → the existing checks → human approval → publishing. Higgsfield is the
   first adapter; others (e.g. Sarvam AI) implement the same contract. No provider is hard-coded into the story,
   composer or educational logic; a voice is chosen by a profile (provider, model, voice, settings, language).
2. **PrayogX owns the narration.** The provider receives only the final, reviewed spoken-form text. It never
   rewrites, summarizes, improvises, adds explanation, changes terminology or decides what is taught.
3. **Spoken form.** The verified narration keeps the exact notation; a separate, human-reviewed spoken form is what
   is voiced (`H2SO4` → "H two S O four", `ΔG°` → "delta G naught", `Fe²⁺` → "F E two plus"). It preserves the
   meaning, is never produced automatically without review, and the screen keeps the exact notation.
4. **Voiceover-first design.** When a narrated reel is intended, the simulation's design brief plans it before
   implementation: narration beats, sync with visual events, speaking time and pauses, spoken forms, transitions,
   the discovery and aha moments, the reveal, the reel's duration, and the silent version. Narration adds to the
   picture rather than reading on-screen text aloud. The simulation stays fully usable without sound.
5. **The visual story leads.** A meaningful simulation is never distorted to fit a voice duration; if the narration
   needs more time and the concept benefits, the story grows (see Duration).
6. **Protected moments.** The answer reveal, key measurements, important graph transitions, conceptual discoveries
   and major visual transformations stay clear of competing narration unless the narration is deliberately part of
   that moment. The existing aha / reveal audio checks keep guarding them.
7. **External voice policy.** Reel audio is either PrayogX's own (music, effects) or a verified, licensed external
   voiceover. An external voice is listed in `audio_library.json` (role `voice`) with provider, model, voice,
   licence and the terms reviewed (a licence document kept in the repository), commercial use, permitted platforms,
   attribution and its qualification scope; every voiced reel also records its generation provenance and
   verification. It never bypasses provenance checks, the reel checks or human approval.
8. **AI-voice disclosure.** One standard line, used only when the reel actually contains AI-generated narration,
   never on silent reels: *"Narration: AI-generated voice reading a script written and checked by PrayogX."*
   It is stored once (Phase 1: the voice asset's `disclosureText` in `audio_library.json`, read by the caption
   builder and the caption check), never re-worded per reel.
9. **Verification.** generate → save the original audio → transcribe locally (whisper.cpp) → compare word for word
   with the reviewed spoken form → VERIFIED or FAILED → only then the mix. Missing, added, substituted, repeated or
   reordered words fail. Transcriber spellings (`one` ↔ `1`, `H two S O four` ↔ `H2SO4`, `K p` ↔ `Kp`) are accepted
   only through an explicit, reviewed equivalence table, and every use is listed; nothing is normalized silently.
10. **Low transcription probability is not failure.** Whisper's word probability is kept with its timestamp and
    flagged for listening; only real word discrepancies fail.
11. **Credit safety.** prepare → cost estimate → an explicit per-run credit cap (declared for the run, no default)
    → explicit generation → verification. An estimate over the cap stops before any generation. Building a reel
    never triggers paid generation; generation is its own command.
12. **Source audio is kept** with its checksum, job ID, provider, model, voice, settings, cost and verification,
    so every voiced reel is auditable from its records even if exact regeneration is not possible.
13. **The audio pipeline stays.** Music, effects, mastering (-14 LUFS, -1 dBTP), encoding, the recorder, the composer
    and the publishers are unchanged; the voice layer delivers a clean voice stem into `mix()` with priority
    VOICE > MUSIC > SFX.
14. **Checks.** Every reel passes all its checks: the 30 below, plus voice checks only when narration exists. Then
    human review; publishing stays separate and human-approved. Nothing is published automatically.
15. **Silent reels are unchanged.** No narration in the story means no voice generation, no voice checks and no
    disclosure; existing reels build exactly as today.
16. **Provisional voice profile.** `higgsfield / elevenlabs_v4 / Emily / English`, status **provisional**. Qualified
    2026-10-03 in the PrayogX Media Lab (English narration, word-for-word Whisper verification, scientific terms,
    formula spoken forms, units and numbers, owner listening) for that provider, model, voice and default settings
    and the tested spoken-form workflow only. Not a permanent or universal choice; `text2speech_v2` + Emily also
    passed.
17. **NCERT Explorer** can reuse this voice and media infrastructure later while keeping its own content and data;
    nothing in NCERT Explorer changes now (its plan, docs/NCERT_MEDIA.md §4, is reconciled when it reaches its voice
    phase). Its narrated media follow the same concept-driven duration, and its voices use this same provenance
    (`audio_library.json`; no separate voice library).
18. **YouTube.** A Short with AI narration is handled explicitly: `tools/youtube_publish.py` sends
    `containsSyntheticMedia: true` when the approved reel's `reel.json` has `audio.aiNarration: true` (Phase 2B), and
    `false` for every silent reel, as before.

#### Narration model: narrate the story, not the screen (2026-10-03)

- **End to end, selectively.** A narrated reel may speak at any beat of the story: hook → context → question / problem
  → curiosity → the experiment moments (observation, explanation) → aha → answer / reveal → payoff. Narration is
  optional for every beat; a beat without a segment is silent. Speak only where it improves understanding, curiosity,
  attention, cause and effect, the interpretation of the simulation, the aha, the reveal or the final takeaway.
- **On-screen text is not automatically spoken.** For each beat the author asks: does speaking here make the concept or
  the story better? A segment's `mode` records the answer: `explanation` (why something happens), `interpretation`
  (what a visible thing means), `condensed` (a long text in one natural sentence), `spoken-text` (a short visible line,
  said naturally). Absent = silent. A formula is never read mechanically: "ΔV = IR" on screen becomes "the voltage
  across the resistor depends on both the current and the resistance" when that helps, or nothing.
- **Problem statements.** A long, technical or mathematical question is not read aloud: skip the beat, or condense it
  into one conceptual sentence ("We want to know how one ampere can flow when the electrons barely move."). A short
  question may be spoken naturally; an obvious one may be skipped. The narrator is a teacher introducing the
  challenge, never a screen reader.
- **Curiosity → observation → aha → explanation → reveal.** Frame the puzzle without answering it; during the
  experiment explain what is invisible, counter-intuitive or causal, not each movement; direct attention to the key
  observation; let the aha land and then explain why it matters; never state the answer before the visual reveal (an
  answer line starts at or after the reveal and is marked `deliberate`); end on the physical meaning, not only the number.
- **Visual first.** The reel must make sense muted. Narration adds interpretation, emphasis and context; essential
  information is never only in the voice.
- **Timing.** Narration may lengthen a reel when it is genuinely educational (concept-driven duration): moments and the
  question take `seconds`; the fixed beats (hook, context, problem, curiosity, answer, payoff) may be lengthened, never
  shortened, with `story.beatSeconds`; each holds its last frame after its animation. One narrator: segments never overlap.
- **Validation.** `narration.py` reports, never rewrites: a question or problem narration over 30 words, or any spoken line
  that repeats more than 12 words of its on-screen `text` verbatim, is a review item (acknowledge `long` or
  `reads-screen` only when that is intended); an unknown `mode`, a duplicate beat + offset or a bad `beatSeconds` is an
  error. `spoken` is always written and reviewed by a person; nothing derives it from `text`.
- The same model serves NCERT Explorer media later; nothing there changes now.

#### Narration in the story (Phase 1)

A story spec may carry `narration` beside `story`. Without it the reel is silent, exactly as before.

```json
"narration": {
  "voiceProfile": "prayogx-en-emily-v1",
  "reviewedBy": "Ankit", "reviewedAt": "2026-10-03",
  "segments": [
    {"beat": "hook",     "text": "Can you solve this?", "spoken": "Can you solve this?"},
    {"beat": "moment-A", "text": "ΔG° = ΔH° − TΔS°",
     "spoken": "delta G naught equals delta H naught minus T delta S naught", "acknowledge": []}
  ]
}
```

- `text` is the exact on-screen, scientific form; `spoken` is the exact, human-reviewed words the voice says.
  Nothing derives `spoken` from `text`.
- `beat` is one of the composer's beats: `hook`, `context`, `question`, `problem`, `curiosity`, `moment-<id>` (one per
  `story.moments[]`), `answer`, `payoff`.
- `python3 tools/reel-maker/narration.py check <ID>` validates it offline. Errors: unknown or unusable profile, a
  voice asset without a verified licence, licence document or `disclosureText`, a missing beat, text or spoken form,
  an empty spoken form, a beat the story does not have, an unresolved placeholder, and any notation left in a spoken
  form (digits, Greek letters, sub/superscripts, operators, arrows, brackets). Review items, never auto-corrected:
  acronym- or formula-like tokens (`NaCl`, `JEE`) and letter runs (`S O`); a person checks them and lists them in
  the segment's `acknowledge`.
- `narration.authorize_generation(spec, estimate, cap)` is the gate a future generation command must pass: valid
  narration, no open review items, `reviewedBy` and `reviewedAt` set, an explicit positive per-run credit cap (no
  default), a provider estimate, and the estimate within the cap. It never generates anything.
- Files: `voice_profiles.json` (profiles: provider, model, voice, settings, language, status, qualification),
  `audio_library.json` (the voice asset: licence, permitted use, `disclosureText`), `licences/` (the licence record),
  `narration.py`, `tests/test_narration.py`. `audio.py` and `generate-reel.js` name no provider or voice.

#### Verified voice (Phase 2A)

- **Verify:** `python3 tools/reel-maker/voice_verify.py verify --profile P --beat B --audio SOURCE --spoken-file F --out DIR`
  transcribes locally with whisper.cpp (`ggml-small.en`, `-l en -t 4 -bs 5 -bo 5 -tp 0.0 -nf`; `WHISPER_CPP_BIN`,
  `WHISPER_MODEL`, kept outside the repository), compares word for word with the reviewed spoken form and writes
  `DIR/voice.json` (schema `prayogx-voice-record/1`, git-ignored with the reel's output). The record keeps the asset
  ID, the profile snapshot, per segment the source (provider, model, job ID, sha256), the decoded WAV (format
  conversion only, sha256), the spoken-form sha256 (whitespace collapsed), the expected text, raw and normalized
  transcripts, every equivalence applied, the missing / added / substituted / repeated / reordered words, listening
  flags (word p < 0.5, with times), the verifier and equivalence-table versions, and VERIFIED or FAILED.
- **Equivalences:** `transcript_equivalences.json` (versioned): only the transcriber spellings observed and checked by
  ear (`Kp`, `Kc`, `RT`, `H2SO4`, `G0`/`H0`/`S0`/`E0`, `H+`, `OH-`, `OH`), an exact integer ↔ number-words rule, and (v2)
  the reviewed spelling pair millimetre ↔ millimeter: both sides are compared in the canonical spelling and every
  respelling is listed; the authored spoken text is never changed.
- **Mix:** a plan with `voice: {record, narration}` makes `audio.py` build the voice stem: only VERIFIED segments whose
  source, decoded audio and spoken form match the record; normalized to -16 LUFS, resampled to 48 kHz stereo, placed
  at beat start + offset, never stretched or cut. A segment longer than its beat fails with the seconds it needs; one
  over the aha or the answer reveal (1.5 s) fails unless marked deliberate. The existing `mix()` then ducks music
  10 dB and effects 6 dB under it, and the existing master is unchanged. The report gains `mix.voice` (segments,
  hashes, disclosure, `aiNarration`), and `voice.wav` / `music-bed.wav` are written for the checks.
- **Music rule on narrated reels:** the existing check that the music plays at least 3 dB louder in the simulation than
  under the question compares, on a narrated reel only, the music before the voice's own ducking
  (`mix.musicGainDbBySectionPreVoice`, written only when a voice exists); the question and answer ducking and the
  voice's 6 LU margin are unchanged, and silent reels keep the original comparison.
- **Checks (narrated reels only):** 12 voice checks in `audio_check.py` (narration, profile, licence, VERIFIED, source
  and spoken hashes, voice in every narrated beat, the voice audible in the final mix, music at least 6 LU under it,
  48 kHz stereo, no time change, disclosure) and the caption's disclosure line in `validate.js`. The caption takes the
  line from the report, which takes it from the voice asset. A silent reel renders byte-identically and runs none of them.
- **Tests:** `tests/test_voice_layer.py` (fakes only); `RUN_VOICE_INTEGRATION=1` re-runs the Media Lab sample.

#### Generating the voice and building a narrated reel (Phase 2B)

- **Variants.** A narrated version of a reel is a variant: story `reels/<ID>.<variant>.json` (e.g. `.narrated`), output
  `output/_variants/<ID>.<variant>/`. The silent reel's story, `output/<ID>/` and its publication records are never
  touched, and the publishers cannot find or resolve a variant (they list only `output/<ID>/reel.json` and accept only
  simulation IDs), so a variant cannot be published.
- **Voice, explicitly and separately** (`voice.py`, provider adapters in `voice_providers.py`):
  `prepare <ID> --variant narrated` (validate and plan; no provider call) → `estimate` (the provider's cost; spends
  nothing) → `generate --cap CREDITS --confirm <ID>` (the only paid step: narration valid and reviewed, an explicit cap,
  estimate within the cap and the balance; one segment at a time, each verified at once; the first failure stops it;
  nothing is retried; a second paid run of the same narration needs `--new-attempt`). Everything is kept in the
  variant's `voice/`: plan, requests, raw responses, original audio, `attempts.json`, `voice.json`.
- **Reuse of VERIFIED audio:** a segment whose spoken text, voice profile (and its provider, model and voice) match a
  VERIFIED segment in `voice.json` or the archived `records/`, with its source and decoded files still matching their
  sha256, is reused: no provider call, 0 credits, and the new record says where it came from (`reusedFrom`). Only new
  segments are estimated, paid for and verified; new files are named per attempt so reused files are never
  overwritten, and the previous record is archived. When nothing is new, no provider is contacted at all.
- **Higgsfield adapter:** the official CLI, model `elevenlabs_v4`, `--dialogue [{text, voice_type, voice_id}]`, stdin
  closed, cost = balance before − after; e-mail addresses and tokens are redacted from anything stored.
- **Build:** `node tools/reel-maker/generate-reel.js <ID> --variant narrated` consumes the VERIFIED `voice.json` and
  stops if it is missing or not VERIFIED. Building never calls a provider or spends credits.
- **Tests:** `tests/test_voice_generation.py`: a fake provider; any attempt to build a real adapter fails the suite.

### The 30 reel checks

The files exist · within the story's duration limits (default 20–40 s) · 1080 × 1920 (9:16) · H.264 / 30 fps / AAC stereo, playable · the Reels container
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
- Voice-over exists only as narrated variants (Voiceover above), built from a VERIFIED voice record; the publishers do
  not handle variants yet, so narrated reels cannot be published until that is deliberately enabled.
- A full build takes about 4–7 minutes.
