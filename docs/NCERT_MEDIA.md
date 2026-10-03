# NCERT media production

How an NCERT concept becomes media. The machinery is the existing reel maker
(`tools/reel-maker`, [README](../tools/reel-maker/README.md)) and the existing publishers; this
document adds the NCERT asset types, their durations and the voiceover layer. Status: **design,
approved 2026-10-02; built in Phase 7** of [NCERT.md](NCERT.md). The JEE reel rules are unchanged.

## 1. The asset chain

```
NCERT concept
  ↓
Interactive simulation            the CON- page (simulations/concepts/…)
  ↓
Educational animation             teaches the concept; length set by the concept
  ↓
English voiceover                 one voice track per asset, provenance recorded
  ↓
20–30 s Standard reel   OR   40–50 s Concept-explanation reel
  ↓
Instagram  +  YouTube Shorts      (the reel)      YouTube video, private first (the animation)
  ↓
Publication record                tools/reel-maker/publications.json
```

The animation and the reel are **separate assets** with separate purposes.

## 2. Durations (fixed production guidelines)

| Asset | Target | Purpose | Notes |
|---|---|---|---|
| **Standard reel** | **20–30 s** | quick visual hook, simulation showcase, curiosity, CTA | fast-paced, stop-motion style, strong transitions, English voiceover where appropriate; Instagram Reels and YouTube Shorts |
| **Concept-explanation reel** | **40–50 s** | actually explains the NCERT concept; teaching before promotion | strong opening hook, simulation/animation-driven explanation, English voiceover, clear takeaway, concise ending/CTA. Never stretched to 60–120 s. |
| **Educational animation** | set by the concept | teaches the concept | visual explanation, simulation footage, diagrams, English voiceover, sound design, takeaway. Not bound by the reel limits. |

Enforcement:

- A concept reel's story declares `"reelType": "standard"` or `"explain"`. The validator derives the
  duration limits from the type (20–30 s or 40–50 s) and refuses a story whose `durationLimits`
  disagree with its type, so a reel cannot be stretched or squeezed by editing one number.
- The animation's storyboard declares its target length and a one-line reason; the encoded animation
  must land within ±10 % of it. There is no fixed cap.
- JEE reels keep their existing rules (`durationLimits` default 20–40 s, the 30 checks).

## 3. Reel and animation content

**Reel:** hook → the concept or problem → why it is confusing → visual demonstration → the
simulation → explanation → takeaway → PrayogX CTA. The viewer should learn something even if they
never open the site. Stop-motion style is a composer effect for graphics and transitions (held frames
at 12 fps, paper-cut offsets); simulation footage stays smooth at 30 fps.

**Animation:** 1920 × 1080, built by the same composer from a storyboard
(`tools/reel-maker/animations/<ID>.json`): beats, the voice script, simulation moments recorded from
the real page (read-only, as for reels), diagrams, the takeaway.

Templates (new): `concept-reel-standard-v1`, `concept-reel-explain-v1`, `concept-animation-v1`.
The JEE template `question-simulation-v1` is untouched.

## 4. Voiceover

The layer is provider-independent: `synth(script) → voice.wav + provenance`.

| Provider | Status |
|---|---|
| `recorded`: the owner's own recordings | allowed; provenance = speaker, date, consent |
| `licensed:<vendor>`: a commercial TTS | allowed once its licence for commercial social-media use is verified and recorded in `voice_library.json`; keys only in `.env` |
| internal / AI capability | used when quality is sufficient and its licence permits commercial publication |
| `draft-system` (macOS `say`) | **drafts and timing only, never published**: Apple licenses the system voices for personal, non-commercial use |

The provider choice is deferred to Phase 7 and does not block anything before it.

Every voiced asset records in its manifest: provider, voice, language (English), licence and the
terms version checked, date verified, script hash, audio sha256, and for recordings the speaker's
consent. The build refuses a voice whose licence is not verified, as it already refuses unverified
music (`audio_library.json`).

Mixing reuses `audio.py`: the mix already has the priority VOICE > MUSIC > SFX with ducking.
Timing is voice-first: the voice track is made, its line lengths are measured, and the composer lays
the beats to them.

Additional checks for voiced assets (on top of the existing 30 for reels): licence verified,
provenance complete, script hash matches, speech inside the video with no overlapping lines,
voice peak ≤ −1 dBTP, speech ≥ 10 dB above the music while it plays, 130–175 words per minute, and an
`.srt` caption file generated.

## 5. Publishing

Unchanged gates: a reel is approved only by the owner after watching it
(`instagram_publish.py approve`), and published by a separate command. YouTube uploads need the
owner's explicit request and a stated privacy, private first. The animation is uploaded as a regular
(non-Short) YouTube video under the same approval.

Publication records gain `asset: "reel" | "animation"`; a record without it is a reel, so no existing
record changes. The NCERT dashboard's WATCH list reads only VERIFIED records.

Per concept, the outputs live in `tools/reel-maker/output/<ID>/` (git-ignored, never deployed):
`reel.mp4`, `thumbnail.jpg`, `caption.txt`, `reel.json`, and `animation/` for the animation.
