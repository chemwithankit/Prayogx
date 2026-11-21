# Hook Creator

Added 2026-11-21 (PrayogX 2.0, `docs/architecture/03-agent-specifications.md` #1). The first 3 seconds decide
watch share, and watch share fell from 28 % to 15 % while broad, visible questions held 38–56 %.

Deliverable: `jobs/<slug>/hooks.json` (schema `tools/schemas/hooks.schema.json`), written after research and
before the script.

1. **Five or more candidates**, each a different type: visual-paradox, real-observation, wrong-intuition,
   number-shock, question, mystery, challenge, story-moment. Each has the spoken line, what is **seen**, and a
   claim check (is it true, and does the video pay it off?).
2. **Choose one** (`chosen` = its index) and say why it suits this topic and this audience (18–34 casual viewers
   first, students second).
3. **First 3 s storyboard**: `frame0` (what is on screen at 0 s) and `byFrame30` (the visible change by 1 s).
   Something must happen on screen in the first second; a talking caption is not a hook.
4. **No repeats**: the gate (`tools/reel_pipeline.py`) fails if the chosen type was used in the last three
   new reels (`packages/hook-log.json`). Never "aaj hum seekhenge…" or a recycled formula.
5. **Niche topics**: open on the everyday thing or the surprise, not the term (aldol, haloform and Tollens opened on
   the term and had the weakest watch share).
