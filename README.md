# PrayogX

**JEE Advanced Interactive Simulation Library.** Interactive 2D scientific simulations built from
selected JEE Advanced Physics and Chemistry questions. Everything here is plain HTML/CSS/JS — no build step, no dependencies, no network calls.
Double-click any file to open it.

## Start here

Open **`index.html`** at the project root — the website. Filter by year, subject, chapter or topic,
search by keyword, concept, formula or tag, and click **OPEN SIMULATION** to launch one.

## Layout

```
index.html                     THE PRAYOGX WEBSITE — catalogue shell (loads site/ + data/)
site/
  site.css                     website styles
  site.js                      website logic: manifest loading, filters, search, routing
data/
  manifest.json                master index — SINGLE SOURCE OF TRUTH
  manifest.js                  same object as window.SIM_MANIFEST, for opening the site from file://
  taxonomy.json                subject → chapter → topic → subtopic vocabulary
  tracker.csv                  local source of truth for the Google Sheet progress tracker
tools/
  sync_manifest.py             rebuild counts + regenerate manifest.js from manifest.json
  check_library.py             validate every manifest path, id, metadata match and count
publish.sh                     validate, commit and push to GitHub (one command)
.github/workflows/static.yml   GitHub Pages deploy workflow — do not delete
.nojekyll                      tells GitHub Pages to serve the files as-is
papers/
  adv_2026_paper_2.pdf         source question papers - LOCAL ONLY, git-ignored, never deployed
templates/
  simulation-template.html     starter shell: design tokens, seven-section skeleton, build checklist
simulations/
  <year>/paper-<n>/<subject>/<simulation-id>/
      index.html               the self-contained simulation
      meta.json                metadata for this simulation
      question.md              verbatim question, classification, worked solution, verification log
```

The website is a **discovery layer only**. It contains no simulation content and never copies one —
each card links to the `path` recorded in the manifest. Simulations stay exactly where they are.

```
   new simulation → its files → meta.json → data/manifest.json → website discovers it
```

## Conventions

**Simulation ID** — `ADV-<YEAR>-P<PAPER>-<SUBJ>-Q<NN>`, e.g. `ADV-2026-P2-CHE-Q01`.
Subject codes: `PHY`, `CHE`, `MAT`. The folder name is the lowercase ID.

**IDs are permanent.** A redo, fix or upgrade edits the existing folder in place and bumps
`revision` and `updatedAt` in `meta.json` and the manifest. It never mints a new ID and never
creates a duplicate folder.

**Every simulation is self-contained.** One HTML file carries its own styles, scripts and model,
so it opens from disk, from a USB stick or from any static host without changes.

**Every simulation ships the same seven sections:** the verbatim question, an interactive
experiment, a live chart, a concept builder, the calculation panel, a step-by-step solution with
an independent verification log, and a classification table.

## The house style

Every simulation follows the same seven-section shape — verbatim question, interactive experiment, chart,
concept builder, calculation, step-by-step solution with an independent verification block, classification
table — using the same validated four-colour series palette and the same self-contained single-file build.
`templates/simulation-template.html` carries the whole shell plus a build checklist; start there.

The rule behind the template: each simulation has **one conceptual pivot** made tangible by an interaction,
and the page **computes the official answer from the live model** rather than quoting it.

## Adding a simulation

1. Copy `templates/simulation-template.html` and build
   `simulations/<year>/paper-<n>/<subject>/<id>/index.html`, `meta.json` and `question.md`.
2. Append the `meta.json` object to `simulations[]` in `data/manifest.json`.
3. Run `python3 tools/sync_manifest.py` — it re-sorts, recomputes `counts` and regenerates
   `data/manifest.js`.
4. Run `python3 tools/check_library.py` — it fails loudly on a broken path, a duplicate id, a
   metadata mismatch or an orphaned folder.
5. Add any new chapter/topic names to `data/taxonomy.json` so the vocabulary stays consistent.
6. Append the row to `data/tracker.csv` and re-upload it to the progress tracker.
7. `./publish.sh "Add <SIM-ID>"` — pushes to GitHub; the live site updates by itself from there.

**The website needs no change at any point.** Years, subjects, chapters, topics, counts and cards are
all derived from the manifest at page load, so a new entry appears the moment step 3 is done.

## Progress tracker

[PrayogX — Simulation Progress Tracker](https://docs.google.com/spreadsheets/d/1TPwZ9rvYbVjYj8aRckp2A5TkuU8qV-BCcEvUgfx-gFA/edit)
(Google Sheet). `data/tracker.csv` is the local source of truth — the sheet is written from it, so
edit the CSV rather than the sheet.

The Drive connector cannot append rows to an existing sheet, so each update recreates the sheet from the
CSV and the URL changes. The current URL always lives in `data/manifest.json` under `library.tracker.url`.

## The website — PrayogX

`index.html` + `site/` is a static site — no backend, no framework, no dependencies, no build step.

**How it reads the catalogue.** Over `http(s)` it fetches `data/manifest.json` directly, so the JSON is
always live. Opened straight from disk (`file://`) browsers block that fetch, so it falls back to
`data/manifest.js`, which exposes the same object as `window.SIM_MANIFEST`. The footer states which source
was used. This is why `tools/sync_manifest.py` must be run after editing the manifest — it keeps the two
in step.

**Filters** — year, subject, chapter, topic, and a search box covering title, summary, question number,
chapter, topic, sub-topics, concepts, formulas, tags and id. All filters combine, and each dropdown only
offers values still reachable under the others (choosing Physics narrows the chapter list to Physics
chapters). "Reset filters" clears everything.

**Bookmarkable URLs** — filter state and the detail page live in the hash, so no backend is needed:

```
index.html#/                                          all simulations
index.html#/?y=2026&s=Chemistry&c=Electrochemistry    a filtered view
index.html#/sim/ADV-2026-P2-CHE-Q01                   one simulation's detail page
```

### Run it locally

Double-click `index.html` — it works from disk via the `manifest.js` fallback.

To run it exactly as it will be deployed (reading `manifest.json` live):

```bash
cd "<project folder>"
python3 -m http.server 8000
# then open http://localhost:8000
```

### Publishing to GitHub

**Adding a simulation does not reach GitHub on its own.** The folder on this computer and the GitHub
repository are two separate copies; GitHub only changes when something pushes to it. What *is* automatic is
the last step: once a push lands, GitHub Pages rebuilds and the live site picks up the new simulation with
no edit to the website code.

```
add simulation → update manifest → ./publish.sh → GitHub → Pages rebuilds → live site
                 \________ you ________/         \____ automatic ____/
```

Run this from a Terminal in the project folder:

```bash
./publish.sh "Add ADV-2026-P2-PHY-Q03"
```

It syncs the manifest, runs the library check, commits everything and pushes. If the check finds a broken
path or a stale manifest it stops before pushing, so a broken link never reaches the live site.

The first run asks once for your repository URL (e.g. `https://github.com/<you>/prayogx.git`) and adopts
whatever history is already on GitHub, so files you uploaded through the web interface are not lost — after
that run, the repository matches this folder exactly.

If you would rather not use the script: `git add -A && git commit -m "..." && git push` does the same
thing, minus the safety checks.

**Nothing on GitHub is ever deleted by the script.** Anything that exists in the repository but not in this
folder — the Pages workflow, a LICENSE, a CNAME, anything added through the GitHub web interface — is pulled
back into the folder and committed before the push. For files that exist in both places, this folder's
version wins, and the script lists them so you can see what it is about to overwrite.

### Deploy it as a static site

The whole project folder *is* the site — deploy it as-is, with `index.html` at the web root so the
manifest's relative paths resolve. No build step.

- **GitHub Pages** — already set up. `.github/workflows/static.yml` uploads the whole repository and
  deploys it on every push to `main`. Leave that file alone; `publish.sh` protects it (see below).
- **Netlify / Vercel / Cloudflare Pages** — drag the folder in, or connect the repo. Build command: none.
  Publish directory: the project root.
- **Any static host or S3 bucket** — upload the folder, serve `index.html` as the index document.

### What gets published

`.github/workflows/static.yml` assembles the deploy directory with a deny list, so a new simulation folder
or site asset is published automatically. These are kept in the repository but never deployed:

| Not published | Why |
|---|---|
| `papers/` | source exam PDFs — also git-ignored, so they never leave this computer |
| `tools/` | maintenance scripts |
| `templates/` | the authoring shell |
| `data/tracker.csv` | internal progress tracker |
| `README.md`, `publish.sh`, `.gitignore` | working files |

The workflow has a guard step that fails the deploy if `papers/` or any `.pdf` reaches the deploy directory,
so the PDFs cannot leak through a future edit by accident.

## Contents

| ID | Year | Paper | Subject | Chapter | Question | Answer |
|---|---|---|---|---|---|---|
| `ADV-2026-P2-CHE-Q01` | 2026 | 2 | Chemistry | Electrochemistry | Q.1 | (C) 5 |
| `ADV-2026-P2-CHE-Q02` | 2026 | 2 | Chemistry | Chemical Bonding and Molecular Structure | Q.2 | (B) |
| `ADV-2026-P2-CHE-Q03` | 2026 | 2 | Chemistry | Aldehydes, Ketones and Carboxylic Acids | Q.3 | (A) |
| `ADV-2026-P2-CHE-Q04` | 2026 | 2 | Chemistry | Biomolecules | Q.4 | (A) |
| `ADV-2026-P2-CHE-Q05` | 2026 | 2 | Chemistry | Chemical Kinetics | Q.5 | (C) and (D) |
