# Chapter one-shots: evaluation and recommended architecture (2026-11-24)

Goal: combine a chapter's topic videos into a complete 9:16 one-shot and a complete 16:9 one-shot, and update it when
one part changes, without rebuilding everything.

## What we already have
- Every part is rendered and released with the same settings: H.264, yuv420p, 30 fps, AAC 48 kHz. That holds for the
  9:16 release copies (`release.sh`), and the 16:9 renders follow one Remotion setting.
- The chapter order exists: the roadmap (`cbse-series/roadmap/*.csv`, part numbers), already used by
  `scripts/session-helpers/build_library.py` to list each chapter's videos in order.
- Every part ends on the same brand end card (≈ 3.7 s), and its content-end frame is known in code (`q.brand`).

## Tested
Parts 3 and 4 (9:16 release copies) were joined with ffmpeg's concat demuxer and **no re-encoding** (`-c copy`):
- It took **2 s** with no quality loss, and the result decodes cleanly.
- The joined audio is **68 ms longer** than the video. AAC frames do not end exactly on video frames, so about 35 ms is
  added per join; over 25 parts that would grow to about 0.9 s.

## Options
| Option | How | Quality | Cost | Verdict |
|---|---|---|---|---|
| A. Stream-copy join | concat demuxer, `-c copy` | lossless | seconds | audio drift grows; end card repeats each part |
| **B. Trim + join, audio re-encoded** | per part: video cut at its content end (stream copy at a keyframe) or one fast re-encode; audio cut to the same length; one chapter title card at the start and one end card | visually lossless (CRF 18 once) | **~2–5 min per chapter**, CPU only | **recommended** |
| C. Remotion chapter composition | a `<Series>` of each part's composition (9:16 and 16:9), one render | best: one continuous mix, music cross-fades | 30–60 min render per chapter per format | only for a showcase release |
| D. Editor (Premiere / Resolve) | manual timeline | best control | hours per chapter | not scalable |

## Recommended architecture (B), to build when the first chapter is near complete
1. **`publish/segment.json` per part**, written at release:
   - roadmap ID and part number;
   - content-end time (before the brand card);
   - the 9:16 and 16:9 file paths.
2. **`scripts/session-helpers/one_shot.sh <class> <subject> <chapter> [--16x9]`**:
   - reads the roadmap order;
   - collects each part's segment.json;
   - cuts each part at its content end;
   - adds a chapter title card (rendered once) and one end card;
   - joins the parts, then encodes once (video CRF 18, audio loudness-normalised).
   - Output: `jobs/_one-shots/<chapter>-9x16.mp4` and `-16x9.mp4`, with YouTube chapter timestamps generated from the
     part lengths.
3. **Updating:** re-render the one changed part, then rerun `one_shot.sh` (minutes); no other part is touched.
4. **Both formats from the same manifest:** separate timelines are automatic, because each part already has its own
   9:16 and 16:9 file.

## Limits
- Music restarts at each part. That's fine for a lesson series, but option C is the only way to get one continuous score.
- Parts missing a 16:9 version (anything made before 2026-11-24) can't join a 16:9 one-shot until they are recomposed.
- Nothing here needs AI or new animation; the title card is one small Remotion still/clip.

Status: **evaluated, not built**. Build option B when the owner asks for the first chapter one-shot.
