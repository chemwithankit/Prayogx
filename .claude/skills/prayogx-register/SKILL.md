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
  - `status`: none for a page the owner has reviewed (the feed default is `human_verified`);
    `"draft"` while it awaits review; **`"script_verified"` for every page the simulation
    factory publishes without a human review** (`docs/SIMULATION_STANDARDS.md` §9). Values are
    defined once in `tools/registry_schema.py`. Don't add `access` unless the owner decides.
  - Concept simulations (`CON-<SUBJ>-<SLUG>`): folder `simulations/concepts/<subject>/<id-lowercase>/`,
    `concept.md` instead of `question.md`, and the fields in `tools/registry_schema.py`
    (`kind: "concept"`, `learningObjectives`, `source`, …). They register as `"draft"` only until
    the website, the app and the crawlable pages render concepts.
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

`data/tracker.csv` is the source of truth. The Google Sheet (`data/manifest.json` →
`library.tracker`: `id`, `sheetId`, `url`) holds 19 scannable columns and is **permanent**:
it is updated in place by upsert on Simulation ID, and its ID and URL never change.

**Never** create a replacement Sheet, recreate it through the Drive connector, trash, clear,
rename, reorder or delete anything in it, or use `append_values`. The only write is
`update_values` to the exact ranges a verified plan names. Writing to the Sheet is an
outward-facing action: run it only when the owner has asked for the sync.

Steps (Google Sheets connector + `tools/tracker_sheet.py`; save each connector response
verbatim as JSON in the scratchpad, never in the repository):

1. `get_spreadsheet` (spreadsheetId = `library.tracker.id`, fields `spreadsheetId`,
   `sheets.properties`) → `spreadsheet.json`. `get_values` `<tab>!A1:S` → `values.json`. The
   tab is the one whose `sheetId` equals `library.tracker.sheetId`; its title may change.
2. `python3 tools/tracker_sheet.py plan --spreadsheet spreadsheet.json --values values.json --out plan.json`
   Show the owner the plan: unchanged / updates (with the differing cells) / new rows, each
   with its exact range, and 0 deletions. Exit 2 (bad header, duplicate or blank IDs, tab or
   spreadsheet not found) → **stop**, report, write nothing.
3. Immediately before writing: `get_values` again → `values_now.json`, then
   `python3 tools/tracker_sheet.py precheck --plan plan.json --values values_now.json`.
   Exit 2 → the Sheet changed since the plan: stop and re-plan.
4. One `update_values` per planned row: the plan's `range` and its `values`, nothing else.
5. `get_values` again → `values_after.json`, then
   `python3 tools/tracker_sheet.py verify --values values_after.json`.
6. Only if verify exits 0: `python3 tools/tracker_sheet.py record --values values_after.json`
   (sets `rows` and `syncedAt` in `library.tracker`), then regenerate
   (`sync_manifest.py` → `build_content.py` → checks) because the manifest changed.

Reporting: say exactly which ranges were written and what verify said. If any write failed
or verify exits 1, report **"Sheet sync incomplete"** with the listed problems, do not
record, and leave the Sheet as it is: re-running steps 1–6 is safe, because the plan only
writes what still differs. If the connector is unavailable or the owner hasn't asked for the
sync, finish registration and report **"Sheet sync pending"**; `python3
tools/tracker_sheet.py status` (exit 3) says the same. Never claim the Sheet was updated
unless verify passed.

## 6. Publishing

Registration never pushes. Commit only if the owner authorised it for this task. The owner
publishes with `./publish.sh`, and pushing to `main` deploys the site.
