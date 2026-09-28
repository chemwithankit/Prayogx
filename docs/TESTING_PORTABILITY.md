# Test portability — can the suite run on the maintainer's Mac?

Audit date: 2026-09-28, against `main` after commit `45ec2a0`.
Machine audited: macOS (Darwin 24.6), Python 3.9.6 (`/usr/bin/python3`, Xcode CLT),
Node v24.21.0, npm 11.19.0. No Homebrew, no Google Chrome, no Playwright browsers cache.

**Short answer: no.** The test suite was written inside the Claude Cowork Linux container
and still assumes that container's filesystem. Only 3 of the 46 entries in
`tests/runall.sh` (18 verifiers + 2 library checks + 26 browser suites) run on this Mac today.

---

## 1. Hard-coded container paths

### `/home/claude/build` (the Cowork working tree)

| File | Line | What it is |
|---|---|---|
| `tests/runall.sh` | 6 | `BUILD="${PRAYOGX_BUILD:-/home/claude/build}"`, then `cd "$BUILD" 2>/dev/null \|\| cd "$ROOT"` |
| 24 JS suites | 2–11 | `require(process.env.PLAYWRIGHT \|\| '/home/claude/build/node_modules/playwright')` |

The 24 suites: `adsgate.js appcheck_prod.js edgetoedge.js feederror.js navigation.js
prodcheck.js propagation.js schemagate.js stalecache.js sim_p1q01.js … sim_p1q15.js`.
All of them honour a `PLAYWRIGHT` environment variable, so this one can be overridden
without editing a file.

### `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (a Linux Chromium binary)

The same 24 suites pass this path to `chromium.launch({ executablePath })`. **No
environment variable overrides it.** A Linux ELF binary can never run on macOS, so every
browser suite fails at launch even when Playwright is installed. `chromium-1194` is
Playwright's internal browser build number: the suites were written against whichever
Playwright release bundles that build.

### `/tmp/q03/…`

`sim_p1q03.js:216` and `sim_p1q04.js:212` write debugging screenshots to `/tmp/q03/`.
This works on macOS (`/tmp` exists and Playwright creates parent directories), but it
writes outside the repository and the scratch area. It's harmless, but it's leftover
container debugging.

## 2. Files referenced but not in the repository

`tests/runall.sh` names these files. They exist nowhere in the repository, in git history,
in `_scratch/` or in its archives: they lived only in the container's `/home/claude/build`.

| Missing file | Called as | Presumed purpose |
|---|---|---|
| `verify15.py` | chemistry verifier | Paper 2 Q15 |
| `verify16.py` | chemistry verifier | Paper 2 Q16 |
| `verify17.py` | chemistry verifier | Paper 2 Q17 |
| `t17.js` | browser suite "Q17 simulation" | Paper 2 Q17 page |
| `scalecheck.js` | browser suite "catalogue at 1000 simulations" | scale test |

Because `runall.sh` `cd`s into `$BUILD` first, these relative names only resolve inside the
container. On this Mac `python3 verify15.py` fails with *No such file* and counts as a
failure.

## 3. Python dependencies

None of these are installed for `/usr/bin/python3` on this Mac.

| Package | Needed by (hard import) | Notes |
|---|---|---|
| `sympy` | verify_p1q01, 02, 03, 05, 06, 07, 09 | pure Python |
| `numpy` | verify_p1q05, 10, 11, 12, 14; gen_q15 | |
| `scipy` | verify_p1q14 | |
| `rdkit` | verify_p1q04, 08, 11, 12, 15; gen_q15 | wheels exist for macOS / Python 3.9 on PyPI (`pip install rdkit`) |
| `pyscf` | **optional** in verify_p1q03, 05, 06, 07 | inside `try:`; the verifier falls back to recorded values. Not needed. |

Standard-library only: `verify_p1q13.py`, `addsim.py`, `removesim.py`, `corsserve.py`,
`tools/*.py`.

All `tests/*.py` and `tools/*.py` compile under Python 3.9.6 (`py_compile`), so there is
no newer-syntax blocker.

## 4. Node dependencies

| Package | Needed by | Status on this Mac |
|---|---|---|
| `playwright` (Chromium) | all 24 JS suites | not installed; no `tests/package.json` pins it |
| built-ins `fs path child_process crypto net` | all | available (Node 24) |

All 26 `tests/*.js` files pass `node --check`.

The browser suites also spawn helpers:

- `python3 -m http.server` (21 call sites)
- `python3 tests/corsserve.py` (20 call sites)
- `python3 tests/addsim.py` / `removesim.py`
- `python3 tools/sync_manifest.py`, `build_content.py`, `check_library.py`

All of these work with the stock macOS `python3`.

## 5. macOS incompatibilities

| Item | Where | Effect |
|---|---|---|
| `timeout` (GNU coreutils) | `runall.sh` `run()` | macOS has no `timeout`: every browser suite reports *NO RESULT* |
| Linux Chromium `executablePath` | 24 JS suites | cannot execute on macOS |
| `cd /home/claude/build` default | `runall.sh` | silently falls back to `$ROOT`, which breaks the relative names in §2 |

## 6. Suites that modify the working tree

`propagation.js` and `stalecache.js` add a probe simulation to the **real**
`data/manifest.json`, regenerate `content/`, `s/`, the sitemap and `sw.js`, then remove it
with `removesim.py`. Both try to restore in a `finally`, but an interrupted run (Ctrl-C,
crash, timeout kill) can leave a dirty tree. `publish.sh` runs `git add -A`, so that tree
would be published. Both suites respect `PRAYOGX_ROOT`, so they can be pointed at a copy.

## 7. Coverage: Paper 1 vs Paper 2

| | Paper 1 (Q01–Q15) | Paper 2 (Q01–Q17) |
|---|---|---|
| Independent verifier (`verify_*.py`) | 15 / 15 in repo | 0 in repo (3 referenced, missing: Q15–17) |
| Browser suite for the page (`sim_*.js`) | 15 / 15 in repo | 0 in repo (1 referenced, missing: Q17) |
| Library-wide checks (`check_library`, `production_audit`, `prodcheck`, `propagation`, …) | covered | covered |

Paper 2 Q01–Q14 have never had a dedicated test file. Each of their `question.md` files
has a verification log, but nothing in the repository re-runs it.

## 8. What runs on this Mac today

| Entry in `runall.sh` | Result here | Blocker |
|---|---|---|
| `tools/check_library.py` | **PASS** | — |
| `tools/production_audit.py` | **PASS** (49/49, 1 note: no `app/ios`) | — |
| `verify_p1q13.py` | **PASS** (31 passed, 0 failed) | — |
| `verify_p1q01, 02, 03, 06, 07, 09` | blocked | `sympy` |
| `verify_p1q05` | blocked | `numpy`, `sympy` |
| `verify_p1q10, 14` | blocked | `numpy` (+ `scipy` for q14) |
| `verify_p1q04, 08, 11, 12, 15` | blocked | `rdkit` (+ `numpy`) |
| `verify15.py`, `verify16.py`, `verify17.py` | blocked | file missing |
| 24 JS browser suites | blocked | Playwright not installed; Linux `executablePath`; `timeout` |
| `t17.js`, `scalecheck.js` | blocked | file missing |
| `tests/runall.sh` as a whole | blocked | all of the above |

The CI workflow (`.github/workflows/static.yml`) runs only `sync_manifest.py`,
`build_content.py`, `check_library.py` and a drift check. No test suite runs in CI.

`tests/README.md` also says "45 single-source checks" for `production_audit.py`; there
are now 49.

---

## 9. Proposal: the smallest safe way to run the suite on macOS

This is a proposal only; none of it is implemented yet. Each step is independently
reviewable and none of them touches a simulation or a deployed file.

**Step 1: one launcher helper instead of 24 hard-coded paths.**
Add `tests/_browser.js`, which exports `chromium` and `launch()`:

- Playwright resolves from `$PLAYWRIGHT`, otherwise from the repository's own
  `tests/node_modules`.
- `executablePath` is passed **only** when `$PRAYOGX_CHROMIUM` is set, so the container
  can keep its binary and the Mac uses Playwright's own download.

Each suite changes two lines: the `require` and the `chromium.launch(...)` call. No
assertion changes.

**Step 2: pin the toolchain in the repository.**

- `tests/package.json` with `playwright` as a devDependency, pinned to the release that
  ships Chromium build 1194 (confirm the exact version before pinning). Plus a
  `tests/package-lock.json`.
- `tests/requirements.txt` with `sympy numpy scipy rdkit` (`pyscf` listed as optional).
- Install into ignored locations: `tests/node_modules/` and a `tests/.venv/`. Add both to
  `.gitignore`.
- One-time setup: `npm ci --prefix tests && npx --prefix tests playwright install chromium`,
  plus `python3 -m venv tests/.venv && tests/.venv/bin/pip install -r tests/requirements.txt`.
  This downloads Chromium (~150 MB) and the Python wheels, so it needs the owner's go-ahead.

**Step 3: make `runall.sh` portable and honest.**

- Remove the `/home/claude/build` default and always run from `$ROOT`.
- Replace `timeout 400` with a portable fallback: use `timeout` or `gtimeout` if present,
  otherwise a `perl -e 'alarm shift; exec @ARGV'` wrapper (perl ships with macOS).
- Report a referenced-but-absent file as **MISSING**, separately from FAILED, and remove
  the five dead references from §2 until their tests are rewritten.
- Use `tests/.venv/bin/python` when it exists.

**Step 4: never let a test mutate the real tree.**
`runall.sh` exports the repository into a temporary directory (`git archive HEAD`, as this
audit did) and sets `PRAYOGX_ROOT` to it for `propagation.js` and `stalecache.js`. A
crashed run then cannot leave debris for `publish.sh` to push.

**Step 5 (separate phase, not part of "portability"): Paper 2 coverage.**
Write `verify_p2qNN.py` and `sim_p2qNN.js` for Q01–Q17, following the Paper 1 pattern.
This is new test code, one question at a time. It should not be mixed into the
portability change.

Optional, later: run the Python-only verifiers and `check_library` in the GitHub Actions
workflow (no browser needed), so a broken verifier is caught on every push.

Steps 1–4 are mechanical, change no simulation, no generated content and nothing that is
deployed, and can be verified by running `tests/runall.sh` on this Mac. The expected end
state is every existing suite passing, with P2 still reported as uncovered.
