# Dual-format videos: 9:16 + 16:9 (owner's permanent standard, 2026-11-24)

Every **new** video is produced twice. Previously published videos are not reprocessed until the owner asks.

| Version | Platforms | Made from |
|---|---|---|
| 9:16, 1080 × 1920 | Instagram **Trial Reels** (owner uploads by hand), YouTube **Shorts** | the reel's main composition (`src/<slug>/Stage.tsx`) |
| 16:9, 1920 × 1080 | YouTube **main video** (regular upload) | a recomposed landscape composition (`src/<slug>/Landscape.tsx`, id `<Name>16x9`) |

The 16:9 version is **recomposed**, not stretched, padded or framed by text panels. It reuses the reel's objects,
cues, timing and soundtrack, so the voice, music and every animation cue are identical; only positions and camera
framing change. Pilot and pattern: Part 4, `src/charge-conservation/Landscape.tsx` (studio repo).

## Per video, in order
1. **Storyboard both layouts.** For each shot, note the 9:16 and the 16:9 composition. 16:9 grammar: event on the
   left, its equation / meter / labels on the right; rows instead of stacks; full-width benches and backgrounds.
2. **Build.** First `Stage.tsx` (9:16). Then `Landscape.tsx`, which imports the exported objects from `Stage.tsx`,
   uses the same `cueSet()` and `Soundtrack`, and is registered in `entry.tsx` at 1920 × 1080.
3. **Round 0 on both.**
   - 9:16: `node scripts/session-helpers/qa_auto.mjs <slug> --stills`.
   - 16:9: `node scripts/session-helpers/qa_auto.mjs <slug> --comp <Name>16x9 --stills --out jobs/<slug>-16x9/qa/auto`,
     then `python3 tools/qa_ledger.py auto <slug>-16x9`. This needs a `jobs/<slug>-16x9/` folder (package.ref, script.md)
     and the symlink `src/<slug>-16x9 → <slug>`, so the landscape ledger stays separate.
4. **Render both.**
   - 9:16: the usual `release.sh`.
   - 16:9: `npx remotion render src/<slug>/entry.tsx <Name>16x9 jobs/<slug>-16x9/renders/<name>_16x9.mp4 --codec=h264 --crf=18`.
   - Run `qa_reel.py` on both. On the 16:9 file the "9:16" size check fails by design.
5. **Independent QA** covers both formats (the owner's ten checks apply to each).
6. **Publish** (gates unchanged):
   - **9:16, YouTube Short:** the existing `youtube_publish.py` flow.
   - **9:16, Instagram Trial Reel:** uploaded by the owner by hand (not settable via the API; see `instagram-publish-settings`).
   - **16:9, YouTube main video:** see "Open items" below.
7. **Playlists:** subject → class → chapter, e.g. "Class 12 Physics · Electric Charges and Fields", one playlist each
   for Shorts and for main videos where YouTube allows. See "Open items".
8. **Website:** in `data/learn/topics/<slug>.json`, `video.youtubeId` holds the 9:16 Short and `video.landscapeId` the
   16:9 video. The topic page then shows **Portrait 9:16 / Landscape 16:9**:
   - opens on Landscape on screens ≥ 820 px wide and on Portrait on phones;
   - remembers the visitor's choice;
   - without JavaScript, the portrait video plays.
   Pages without `landscapeId` are unchanged.
9. **Keep it a segment** (for chapter one-shots, `docs/ONE_SHOT_COMPILATION.md`): clean start and end, its own
   complete audio, the brand end card last, no cross-video transitions.

## Open items (need the owner)
- **16:9 upload to YouTube.** `tools/youtube_publish.py` accepts only vertical / square files today. A local, not yet
  committed change by another session adds a "long" vertical format. The landscape format (`"format": "landscape"`,
  width > height, a regular video, no #shorts) belongs on top of it once that lands.
- **Playlists.**
  - Today the publisher can add every upload to **one** configured playlist (`YT_PLAYLIST_ID`).
  - Per-chapter playlists need the `youtube.force-ssl` scope, which means the owner re-runs `youtube_publish.py auth`
    once (browser consent).
  - Then a small playlist step (find or create "Class N Subject · Chapter", add the video) can run after each publish.
  - Until then, playlists are made by hand in YouTube Studio.
