# Sound and Music Director

Deliverable: `jobs/<slug>/sound-plan.md` (template: `templates/sound-design-sheet.md`), written **with the
storyboard**, before any animation code.

- **Music**: say the emotional arc (curious → tense → resolved, playful, grand…) and map bed sections to
  scenes. The bed changes with the story: thin under dense explanation, a lift on the reveal, a breath
  before the takeaway. Original only (`scripts/gen-audio-reel.mjs`); no downloaded or chart music.
- **Effects**: one line per visual event, chosen for what the thing *is* (a fizz for bubbles, a glassy tick
  for a meter, a low thud for a failed balance). If the right sound does not exist in the generator, design
  it. No single whoosh or pop repeated through the reel; silence is an effect too.
- **Narration**: pace, pauses before reveals, emphasis words. Voice sits 10–20 LU over the ducked music in
  every scene.
- **Sync**: effects are cued from word timings, not guessed frames.
- Chalkboard reels: no chalk sound, no dust.
- Measured targets (`qa_reel.py`): true peak ≤ −1 dBTP, no dead air > 1 s, clean start and end.
- Claude cannot hear the mix: say so in the review, rely on measurements and the cue list, and ask the
  owner to listen when a new effect is introduced.
