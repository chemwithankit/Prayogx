# PrayogX Learn: website pages for every Doodle batch

Owner's instruction (2026-10-29, "PrayogX Doodle Pipeline — Website Publishing and Conditional Simulations"): every
"Create the next set of 5 Doodle videos" batch also produces one **PrayogX Learn** page per topic, as an extension of
the existing Doodle workflow (motion studio → Instagram Trial Reel → YouTube Short → Drive notes → Reels Log), not a
separate system. Pilot: CBSE series 11–15 (2026-10-29).

## The portal (owner's structure and design brief, 2026-10-29)

- The site root (`index.html`, `#/`) shows exactly two entry points: **JEE Advanced Simulations** (the catalogue,
  now at `#/jee`; old `#/?…` filter links still open it) and **Learn — Classes 9th to 12th** (`learn/`).
- `learn/` → five class cards (Class 9, 10, 11, 12, Extra / Supplementary) → `learn/<class>/` subject cards →
  `learn/<class>/<subject>/` chapter cards in textbook order, with a **Chapters / Find a topic** switch (topic-wise
  search and chapter / discipline filters) → `learn/<class>/<subject>/<chapter>/` the chapter's topics in order
  (videos to Watch, planned topics marked Coming soon) → `learn/<slug>/` the video page (title and chapter context,
  the video first, notes, up-next and previous in the chapter, explanation, simulation, quiz).
- `data/learn/curriculum.json` holds classes → subjects → ordered chapters (`aliases`, `about`, and `planned` topics
  from the owner's Physics & Chemistry topic bank; Maths and Biology have no chapter-grouped bank yet, so their
  chapters show only what is published). Counts are always computed; nothing is invented (no progress data exists,
  so none is shown).
- Design rules (learn/learn.css): one accent per subject, line icons, no gradients, 16px+ text, 44px touch targets,
  visible focus, a skip link, small hover motion that is off under reduced motion; phone layouts are single-column.

## What a topic page holds

Class → Subject → Chapter → Topic, at `https://prayogx.co.in/learn/<slug>/`:

1. the Doodle video, embedded from YouTube (`youtube-nocookie.com`), with an Instagram link as the fallback;
2. the **same approved notes**, exported once from the Drive doc to `learn/<slug>/notes.pdf` (no second PDF);
3. the concept explanation, reusing the reel's research and the notes' diagrams (`learn/<slug>/img/`);
4. a 3–5 question quiz (client-side, no backend, nothing stored);
5. an interactive simulation **only when the decision is REQUIRED** (`learn/<slug>/sim.html`);
6. related topics: the same chapter automatically, plus `related` slugs.

## Files

| Path | Role |
|---|---|
| `data/learn/topics/<slug>.json` | source of truth per topic (written with Python `json`) |
| `tools/build_learn.py` | validates, then writes the pages; `--check` validates only; `--online` asks YouTube oEmbed whether each video embeds |
| `data/learn/curriculum.json` | classes, subjects, ordered chapters, descriptions, planned topics (Python `json`) |
| `learn/index.html`, `learn/<class>/…`, `learn/<slug>/index.html` | **generated**, never hand-edited (class folders are rebuilt from scratch) |
| `learn/learn.css`, `learn/learn.js` | shared page style (on top of `site/site.css`) and the quiz |
| `learn/<slug>/notes.pdf`, `img/`, `sim.html` | the topic's assets |
| `tests/learn_pages.js`, `tests/learn_sims.js` | Playwright suites (home, portal, class, subject, chapter and topic pages at 1280 / 390 / 360 px, a crawl of every internal link; simulation numbers) |

`tools/build_content.py` adds the ready Learn pages to `sitemap.xml`; the library header links to `learn/`.

## Topic record (data/learn/topics/<slug>.json)

`id`, `slug` (= file name), `status` (`draft` | `ready`; drafts stay off the site), `class` (number or "Supplementary"),
`subject` (Physics | Chemistry | Mathematics | Biology), `chapter`, `topic`, `title`, `summary`, `series`,
`studioJob`, `reelId`, `video {youtubeId, instagram}`, `notes {pdf, title, driveDoc}`, `keyPoints[]`,
`sections[{h, blocks[]}]` (each block exactly one of `p`, `formula`, `list`, `img`+`alt`+`caption`, `table{head,rows}`;
inline `**bold**` only), `quiz[{q, options[3-5], answer (index), explain}]` (3–5 questions),
`simulation {decision, reason, status, path, objective, instructions[], qa}`, `related[]`.

The validator refuses: missing fields, a slug/file mismatch, a non-PDF or missing notes file, missing images or alt
text, ragged tables, fewer than 3 or more than 5 questions, duplicate or fewer than 3 options, an answer index out of
range, a missing explanation, an unknown related slug, and a REQUIRED simulation without objective / instructions or
marked `pass` without its file.

## Simulation decision (per topic, recorded either way)

**REQUIRED** only when manipulating something teaches beyond the video: variables, cause and effect, a graph, a
hypothesis to test, a dynamic process. Never because of the subject. Prefer reusing an existing simulation.
**NOT_REQUIRED** when the video, explanation and quiz carry the idea (history, comparisons of evidence, a single
qualitative observation). The `reason` is always written.

A REQUIRED simulation: self-contained ES5 file, no external resources, `<meta name="sim-id">`, `window.PX` hooks,
brief instructions, phone and desktop, reduced motion, its numbers checked against an independent calculation in
`tests/learn_sims.js`. Status `pending` keeps the page publishable without it (no simulation section) and the batch
report says so; `pass` adds the "Try it yourself" section.

## Batch steps (after the reels are VERIFIED and the notes exist)

1. Export each topic's approved Drive notes as PDF → `learn/<slug>/notes.pdf`; copy the notes' diagrams → `img/`.
2. Write `data/learn/topics/<slug>.json` (explanation from the reel research; quiz from the notes' practice set,
   3–5 MCQs with explanations); decide the simulation.
3. Build any REQUIRED simulation; add its checks to `tests/learn_sims.js`; mark `pass` only when they pass.
4. `python3 tools/build_learn.py --online` (all ok; any video that does not embed is a manual action: switch the
   Short to unlisted in YouTube Studio).
5. `node tests/learn_pages.js && node tests/learn_sims.js`, then the library chain
   (`sync_manifest`, `build_content`, `check_library`, `production_audit`) and `tests/navigation.js`.
6. Look at the pages (phone and desktop).
7. **Deploy only with the owner's approval** (pushing `main` deploys prayogx.co.in): commit the Learn paths only.
   `publish.sh` runs `git add -A`, so while unrelated changes sit in the tree, commit specific paths and push that
   commit instead.
8. After deploy: check `https://prayogx.co.in/learn/<slug>/` loads, then record the website status (Reels Log
   column O, tracker `website=`).

## Destinations are independent

Instagram, YouTube and the website each have their own validation and status. A VERIFIED reel never implies a live
page, and a page never implies the video is embeddable: `--online` checks that separately. The batch report lists,
per topic: video and PDF, Instagram, YouTube, website, quiz QA, simulation decision and its build/QA status, and every
manual action.
