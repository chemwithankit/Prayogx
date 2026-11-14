# Batch production

A batch is a queue of independent projects. The owner's words "create N videos" or "auto-publish" set the
*scope* and the *publishing permission*; they never change the per-reel process.

## 1. Manifest first
Create `$S/jobs/batches/<batch-id>/manifest.md` (`batch-id` = date + short name) with one row per reel:

| Reel ID | Topic | Slug | Research | Creative | Script | Storyboard | Build | Audio | Render | QA score | Deliverables | Approved | Published |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

Topics come from the owner or, when they say "next", from the roadmap in the owner's series order. Name the
exact roadmap IDs before starting.

## 2. One at a time, all the way through
Take reel 1 through stages 1–8 of `single-reel.md` before reel 2 starts. Do not write all the scripts
first, do not build shared scenes, do not copy a previous job's `Stage.tsx` as a starting point.

Allowed in parallel: research reading for the next topic while a render runs. Nothing else.

## 3. Diversity across the batch
Before each storyboard is approved, compare its treatment with every earlier reel in the batch (and the
last five jobs overall): hook type, central metaphor, main layout, camera vocabulary, sound palette. Record
the comparison in `creative.md`. Two reels in a batch must not read as variations of one video.

## 4. Waves
At most three reels per wave. After each wave, report to the owner: what is finished, each scorecard, what
remains. Continue with the next wave unless the owner redirects.

## 5. When quality or resources slip
Signs: a stage scored without revision, a storyboard that resembles the last one, stills fixed only for
layout, a long session with context pressure. Then finish the current reel properly, stop, and report how
many are done and why. Fewer excellent reels beat a full batch of average ones. Never lower a gate
silently.

## 6. Publishing inside a batch
Each reel is shipped and deployed on its own, after its own approval, one deploy at a time. One reel's
approval never covers another. A reel that fails its gate is held and reported; the batch moves on only if
the owner's instruction allows.

## 7. Batch complete
Every row shows QA ≥ 90, deliverables done and its own approval. The final report lists, per reel: the idea
in one line, the score, the improvements made in QA, the remaining honest gaps, and the links.
