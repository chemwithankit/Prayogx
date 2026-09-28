---
name: prayogx-register
description: Register a new PrayogX simulation in the library, or record a revision of an existing one: meta.json, question.md, data/manifest.json, taxonomy, tracker.csv, README row, tests registration, then regenerate and check. Use after prayogx-validate passes.
---

# Register a simulation in the library

The website, PWA and app discover everything from `data/manifest.json` → `content/`. Nothing
else needs editing. Write every new row **literally**, for this ID; never derive it by
search-and-replace from another entry. Write JSON **only with Python `json`**
(`json.dump(obj, f, ensure_ascii=False, indent=2)` + trailing newline), because other
serializers rewrite floats.

## 1. Files in the simulation folder

`simulations/<year>/paper-<n>/<subject>/<id-lowercase>/`

- `index.html`: the page.
- `meta.json`: copy the field order of the latest record (P1 Q15): `id, slug, revision,
  path, folder, title, shortTitle, summary, exam, year, paper, paperNumber, subject, branch,
  questionNumber, section, questionType, marking, chapter, topic, subtopics, concepts,
  formulas, tags, difficulty, estimatedMinutes, answer, answerValue, answerUnit,
  derivedQuantities, verification{status, methods, verifiedOn, note}, interactivity, source,
  createdAt, updatedAt`.
  - New page: `revision: 1`, `createdAt` = `updatedAt` = today.
  - `path` is root-relative and ends in `index.html`.
  - `source.file` is a provenance string only; it is never linked.
  - Don't add a top-level `status` or `access` unless the owner decides (see
    `docs/DECISIONS.md` → open decisions).
- `question.md`: title line, `## Question (verbatim)`, `## Classification`, `## Solution`,
  `## Verification log` (a table of checks ending in the status line), as in P1 Q15.

## 2. Library records

1. `data/manifest.json` → `simulations[]`: insert the object, **byte-identical** to
   `meta.json`, after the previous ID.
2. `data/taxonomy.json` → `subjects.<Subject>.chapters.<chapter>.topics.<topic>` →
   `{subtopics[], simulations[]}`: add a chapter or topic only if new, and append the ID.
3. `data/tracker.csv`: one row in the 25-column header order already in the file (lists
   joined with `; `).
4. `README.md` Contents table: one row after the previous ID:
   `` | `<ID>` | <year> | <paper> | <Subject> | <chapter> | Q.<n> | <answer> | ``.
5. Tests: add `tests/verify_<pNqNN>.py` and `tests/sim_<pNqNN>.js` (plus any build-time
   generator); register them in `tests/runall.sh` (the verifier list and a `run "<label>"
   "$HERE/sim_<pNqNN>.js"` line) and add rows to `tests/README.md`.

## 3. Regenerate and check

```bash
python3 tools/sync_manifest.py      # sort, counts, data/manifest.js, ?v stamps
python3 tools/build_content.py      # content/, s/<ID>/, sitemap, robots, revisions lock, sw.js stamp
python3 tools/check_library.py      # exit 0
python3 tools/production_audit.py   # all checks pass
```

Never hand-edit the generated outputs.

## 4. Revisions (existing pages)

- Any change to a **published** page's `index.html` → bump `revision` and set `updatedAt`, in
  both `meta.json` and the manifest. `check_library.py` refuses changed content at the same
  revision, and `revision` drives the `?v=` cache-busting every client relies on.
- If the page was changed **before it was ever published**, drop its entry from
  `data/revisions.json` and rebuild instead of bumping.

## 5. Tracker sheet

`data/tracker.csv` is the source of truth. The Google Sheet (URL in `data/manifest.json` →
`library.tracker`) holds 19 scannable columns and is recreated from the CSV. How Claude Code
reaches Google Drive is an **open decision** (`docs/DECISIONS.md`). Until it's decided,
update the CSV and tell the owner the Sheet needs regenerating. Never claim the Sheet was
updated when it wasn't.

## 6. Publishing

Registration never pushes. Commit only if the owner authorised it for this task. The owner
publishes with `./publish.sh`, and pushing to `main` deploys the site.
