---
name: prayogx-validate
description: Validate a new or changed PrayogX simulation before calling it done: scientific and answer correctness, the per-simulation verifier and Playwright suite, visual inspection, and the library tools and drift gate. Use at the end of prayogx-new-simulation or prayogx-review-existing.
---

# Validate a PrayogX simulation

Done means **the independent derivation, the official key, the page's computed answer and the
written solution all agree**, and every check below is green. If anything disagrees: stop,
investigate, fix, re-run everything. Report exact counts; never claim a check that wasn't run.

## Environment (one-time setup is in `tests/README.md`)

- Python: `tests/.venv/bin/python` (sympy, numpy, scipy, RDKit).
- Browser: `node tests/<suite>.js` resolves Playwright 1.56.1 / Chromium 1194 through
  `tests/_browser.js`.
- Whole library: `bash tests/runall.sh`. Exit 0 = all passed, 1 = something failed, 2 = only
  MISSING container-era files. Known: `sim_p1q10.js` fails intermittently from a test race.

## 1. Question and science

- [ ] Question verbatim against the source PDF (numbers, units, options, structures).
- [ ] Solved independently before any key; laws, assumptions, units, signs and limiting
      cases written down.
- [ ] The model holds over the whole input range (sweep each important input min → max).
- [ ] Representative data and exaggerated scales labelled.
- [ ] Chemistry: see `prayogx-chemistry` (valence and charge after every step, products
      matched by structure).

## 2. Answer: `tests/verify_<pNqNN>.py`

- [ ] ≥ 2 **independent** routes (e.g. exact solve + numerical scan; RDKit templates +
      independent arrow-pushing; model + measured data).
- [ ] Audits **every printed option** (why each distractor fails).
- [ ] Custom-condition controls behave as the science predicts.
- [ ] Ends `N passed, 0 failed`.
- [ ] Official key checked (and a published solution if available), both recorded in
      `meta.json` → `verification.methods` and in the page's verification block.

## 3. Behaviour: `tests/sim_<pNqNN>.js`

Adapt the closest Paper 1 suite (keep its head and tail, rewrite the middle). It must end
`N / N passed` and cover:

- [ ] self-contained (no external URL, `fetch` or storage), ES5, unique ids, `sim-id` meta
- [ ] no answer literal in the source; `PX.answer()` equals the key
- [ ] optional inputs: empty, invalid, negative, zero, fractional and out-of-range values fall
      back with a message
- [ ] answer visible above the experiment from load; dock below the screen
- [ ] one START runs every stage with no further clicks; messages, tiles, board, charts, log
      and calculation lines appear in order
- [ ] instruments equal the model; for organic, flask and molecules stay in step
- [ ] reveal, plus a blink that is present and then gone
- [ ] explorer (drag, keys), REPLAY, Pause, RESET, speed, slow motion, restore
- [ ] one custom run end to end; classroom mode
- [ ] **390 and 360 px: `scrollWidth − clientWidth == 0`**; reduced motion; **zero console
      errors**
- [ ] feed entries (manifest, `content/`, revision lock, `s/<ID>/`) and the real app shell
      finds, opens and returns from it
- [ ] performance: the full run stays smooth at 390 px; no long main-thread stalls

## 4. Visual inspection

- [ ] Screenshot every stage and the reveal at 1280 px and 390 px, and **look**: no
      overlaps, clipped text, overflowing equations or label collisions.
- [ ] Solution figures render (SVG `role="img"` + aria-label, correct `xmlns`).
- [ ] Light and dark themes both readable.

## 5. Library and generated content (repository root)

```bash
python3 tools/sync_manifest.py && python3 tools/build_content.py
python3 tools/check_library.py        # must exit 0
python3 tools/production_audit.py     # all checks pass
git diff --quiet -- data/ content/ s/ sitemap.xml robots.txt sw.js || echo "commit the regenerated files"
```

- [ ] If shared or library files changed, also run `bash tests/runall.sh` and report the
      summary line.
- [ ] `git status`: only the intended paths changed; the other simulations are untouched.

## 6. Status language

Record `verification.status: "verified"` with `verifiedOn` only when sections 1–5 pass. Never
describe the page as human-verified (`docs/SIMULATION_STANDARDS.md` §9).
