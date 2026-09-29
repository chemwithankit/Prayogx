# Production test suites

Nine suites that check the things the library check cannot: that the **single-source
promise** actually holds end to end, across the website, the PWA and the Capacitor app.

They take their repository root from `PRAYOGX_ROOT`, defaulting to the repository they
live in, and each one restores whatever it changes.

## What runs where

| Suite | Needs | What it proves |
|---|---|---|
| `../tools/check_library.py` | python3 | the library is coherent |
| `../tools/production_audit.py` | python3 | 49 single-source checks: IDs, revisions, hashes, feed agreement, no duplicated content, cache keying, deploy hygiene |
| `prodcheck.js` | node + Playwright | catalogue, search, filters, detail pages, direct URLs, deep links, back navigation, mobile layout, PWA, offline, broken assets |
| `propagation.js` | node + Playwright | adds ONE simulation to the canonical source and proves the website, PWA, crawlable pages and the app all pick it up with no code change — then removes it |
| `stalecache.js` | node + Playwright | a revision bump moves the feed version, the worker version and the lock hash; the browser and the app both stop serving the old copy; an unbumped edit is refused |
| `appcheck_prod.js` | node + Playwright | the Capacitor shell against the real feed: no bundled content, native list, filters, offline storage, back navigation |
| `edgetoedge.js` | node + Playwright | Android 16 edge-to-edge: with real system-bar insets applied, the header, tab bar, cards, search, filter and the simulation frame all stay clear of the status and navigation bars, in portrait and landscape - and with no insets the layout is byte-for-byte what it was |
| `feederror.js` | node + Playwright | that a published site answering 404 is reported as *not published yet* - naming the origin, the status and the feed path - and not as "No connection"; that an unreachable host still is; and that neither throws away a library already stored on the device |
| `navigation.js` | node + Playwright | the shared simulation runner: Library to a simulation and back by button and by Back, one history entry per open, the bar still reachable 4,000 px into a long simulation, the Top control, direct file URLs and deep links, the simulation's own controls untouched, mobile layout, and Android's back order in the app shell |
| `schemagate.js` | node + Playwright | the feed schema latch: a 1.0.0 feed loads, a 1.4.2 feed loads, a 2.0.0 feed is refused with no library rendered on either platform, a feed with no schemaVersion is not treated as hostile, the manifest fallback is latched by the same rule, a refusal survives the feed going unreachable, and it clears itself once the build understands the format |
| `adsgate.js` | node + Playwright | the AdMob banner: exactly one anchored adaptive banner is requested, with Google's test unit while `ads.testing` is on and never the production one; no interstitial, rewarded, native or app-open ad is ever asked for; the reported height lifts the tab bar, the list and the toast instead of being covered by the ad; the banner goes down for the simulation viewer and an ad that loads late while a simulation is open does not pad the page; leaving a simulation resumes rather than buying a new ad, and a failed ad does; a rejecting `hideBanner` never reaches the page; and with `ads.enabled: false`, or no Capacitor at all, the plugin is never called and the layout is exactly what it was before ads existed |
| `verify_p1q01.py` | python3 + sympy | ADV-2026-P1-CHE-Q01 from first principles: sympy builds W(P) from w = -Pext dV and finds the single minimum at sqrt(P1 P2); a 60 000-point scan in litres and bar with no formula for W finds 4.000 bar and 600R; exact fractions give 300R + 300R; the reversible and one-step bounds; and every printed option audited |
| `sim_p1q01.js` | node + Playwright | the two-step compression bench end to end: self-contained, ES5, no prediction stage, no answer letter in the source; optional inputs with empty, invalid, negative, reversed and out-of-range entries; one START running the whole experiment with no further clicks - piston, work, sweep, search, best run, calculation lines in order, the reveal and its blink; replay, pause, reset; a custom run (P2 = 18 -> 6 bar, 1200R); classroom mode; 390 and 360 px; reduced motion; the feed entries; and the app shell opening it with the banner hidden |
| `verify_p1q02.py` | python3 + sympy | ADV-2026-P1-CHE-Q02 from first principles, four independent ways: sympy solves the rate law, a hand-written RK4 integrator reproduces it with no closed form, exact fractions give 1/5 and 4/5 with detailed balance, and a 5000-molecule stochastic simulation settles at 0.2; then every printed option is audited - only (C) implies K = kf/kb = 1/4 |
| `sim_p1q02.js` | node + Playwright | the reversible reaction chamber end to end: self-contained, ES5, no stored data and no answer letter in the source; optional inputs with empty, invalid, negative and fractional entries all falling back to the question; the prediction gate holding the clock; the molecule count tracking the rate law; equilibrium with both counters still climbing; the derivation, every wrong graph's feedback, the overlay, the reveal and its blink; replay, reset, explore mode at kb/kf = 1, 2, 9 and 0, pause and speed, classroom mode with both gates holding NEXT; 390 and 360 px; reduced motion; the manifest, feed, revision lock and crawlable page; and the real app shell finding it in the feed, opening it with the banner hidden and restoring the banner on back |
| `verify_p1q03.py` | python3 + sympy (+ pyscf if installed) | ADV-2026-P1-CHE-Q03 from first principles: sympy sums the bond vectors of each VSEPR shape with the bond moment as a symbol (BF3 and NH4+ vanish identically; the pyramid gives 3m cos(beta) +/- L); the bond-moment model gives NH3 1.938 D and NF3 0.244 D; robustness over lone-pair moment, angles and kappa; measured values; a B3LYP/aug-cc-pVDZ calculation (recorded values when pyscf is absent); every printed option audited |
| `sim_p1q03.js` | node + Playwright | the dipole bench end to end: self-contained, ES5, no prediction stage, no answer letter in the source; optional inputs with empty, invalid, negative, zero and out-of-range entries; one START runs build, bond dipoles, vector sum and field for all four species with no further clicks; zero torque for BF3 and NH4+; readings equal the vector sums; calculation lines in order; the reveal, blink and gates; replay, pause, reset; a custom run with the lone pair off (no printed option); classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q04.py` | python3 + RDKit | ADV-2026-P1-CHE-Q04 from the drawing: RDKit reads both substrates from 2D coordinates copied from the paper with their wedges and assigns the stereocentres; ester-only and acid-only reductions and the lactonisation run as templates; canonical SMILES, mirror images, CIP labels, stereoisomer enumeration and a 20-conformer RMSD search all give two diastereomer pairs; a no-CH3 control gives identical lactones; every printed option audited |
| `sim_p1q04.js` | node + Playwright | the lactone flasks and overlay bench end to end: self-contained, ES5, no prediction stage, no answer letter in the source; the printed scheme; the least-squares fit recovering a known rotation; structure choices and resets; one START runs both flasks, the overlay, the mirror test and the controls with no further clicks; the live RMSD falling; every calculation line in order; the reveal, blink and gates; replay, pause, reset; a custom run with no top CH3 (option A); classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q05.py` | python3 + sympy + numpy (+ pyscf if installed) | ADV-2026-P1-CHE-Q05: sympy shows hydrogenic 2s and 2p are exact eigenfunctions at -1/8 hartree; an independent Numerov radial solver gives Li 2s -4.76 and 2p -3.43 eV with a 1s2 core; Slater's rules; spectroscopic data; a Hartree-Fock delta-SCF (recorded when pyscf is absent); robustness, a no-core control and every option audited |
| `sim_p1q05.js` | node + Playwright | the atom chamber end to end: self-contained, ES5, no prediction stage, no answer letters in the source; optional inputs with empty, invalid, negative, fractional, inconsistent and zero entries; one START solves all four orbitals, draws the clouds, fills the ladder and tests the options with no further clicks; every calculation line in order; the reveal, blink and gates; replay, pause, reset; a no-core custom run; classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q06.py` | python3 + sympy (+ RDKit, pyscf if installed) | ADV-2026-P1-CHE-Q06: element conservation fixes X = Cl2 from reaction 1; every equation on the page balances; oxidation states; VSEPR for NCl3, NH3, ClF3; NCl3 pyramid height from measured data and an RDKit embedding; Hartree-Fock proton affinities NH3 vs NCl3; NCERT uses; the custom-condition branches and every option audited |
| `sim_p1q06.js` | node + Playwright | the chemical identity lab end to end: self-contained, ES5, no prediction stage, no answer letters in the source; the engine and its custom branches; optional conditions and warnings; one START runs all nine stages with no further clicks; answer-panel messages, live data, tiles, option board, badges and the reasoning log in order; the reveal, blink and gates; the molecular explorer (drag, keys, compare); replay, pause, reset; KMnO4 and excess-NH3 custom runs; classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q07.py` | python3 + sympy (+ pyscf if installed) | ADV-2026-P1-CHE-Q07: mass and charge balance fix O2+[PtF6]-; MO filling written independently (O2 family, N2, NO+) with both sigma/pi orderings; measured bond lengths; UHF bond scans and Mayer bond orders; oxidation states and the Pt 5d count; an electron and fluorine ledger; custom-condition controls and every option audited |
| `sim_p1q07.js` | node + Playwright | Bartlett's electron-transfer lab end to end: self-contained, ES5, no prediction stage, no answer letters in the source; the engine and its custom branches; optional conditions and warnings; one START runs all ten stages with no further clicks; answer-panel messages, live data, case file, option board, badges and the reasoning log in order; the reveal, blink and gates; the electron explorer; replay, pause, reset; NO and N2 custom runs; classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q08.py` | python3 + RDKit | ADV-2026-P1-CHE-Q08: element and charge balance of every step; RDKit reaction templates generate Q, R, S, T, anthraquinone and the Clemmensen product; functional-group SMARTS for Tollens, ring N and oxygen count; gammaxane constitution; custom-condition controls and every option audited |
| `sim_p1q08.js` | node + Playwright | the synthesis pathway lab end to end: self-contained, ES5, no prediction stage, no answer letters in the source; the engine and its custom branches; optional conditions and warnings; one START runs all ten stages with no further clicks; answer-panel messages, live data, case file, option board, badges and the reasoning log in order; the reveal, blink and gates; the structure explorer; replay, pause, reset; Pd/C and propanoate custom runs; classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q09.py` | python3 + sympy | ADV-2026-P1-CHE-Q09: sympy exact and general solution (M cancels); an independent bisection; an ideal-gas calculation in real units at three temperatures; real molar masses and custom values; the three traps |
| `sim_p1q09.js` | node + Playwright | the twin-cylinder pressure lab end to end: self-contained, ES5, no answer value in the script; the physics and its custom branches; optional values and warnings; one START runs all nine stages with no further clicks; answer-panel messages, the live scan, lock, back-check and temperature test, the audit, badges and charts; the reveal, blink and gates; the pressure explorer; replay, pause, reset; real-molar-mass and impossible custom runs; classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q10.py` | python3 + numpy | ADV-2026-P1-CHE-Q10: brute-force enumeration of all 64 seatings folded by the square's symmetry group; Burnside's lemma; 3-D coordinates with numerically found rotations and a mirror superposition test; tetrahedral, acac and halide controls; the traps (6, 16, 2, 4, trans-spanning chelate) |
| `sim_p1q10.js` | node + Playwright | the isomer assembly lab end to end: self-contained, ES5, no answer value in the script; the enumeration and its custom branches; optional ligands and warnings; one START runs all nine stages with no further clicks; answer-panel messages, the seating-by-seating build, folding and mirror test, the audit, badges and charts; the reveal, blink and gates; the isomer explorer; replay, pause, reset; tetrahedral and acac custom runs; classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q11.py` | python3 + RDKit | ADV-2026-P1-CHE-Q11: the wedged drawing decoded (cis); RDKit templates for beta-keto acid decarboxylation (repeated) and 1,2-diacid dehydration, and where they must not fire; SMARTS carbonyl count; atom balance; MMFF strain of the trans-fused anhydride; custom controls; the traps |
| `sim_p1q11.js` | node + Playwright | the two-flask carbonyl lab end to end: self-contained, ES5, no answer value in the script; the arrow-pushing engine (valid intermediates, conserved charge, products equal to what the arrows make) and its custom branches; optional conditions and warnings; one START runs all ten stages; flask and molecules in step; live gauges; audit, badges and charts; the reveal, blink and gates; the mechanism explorer; replay, pause, reset; trans and gamma custom runs; classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q12.py` | python3 + RDKit | ADV-2026-P1-CHE-Q12: RDKit templates for terminal-alkyne deprotonation (per equivalent) and acetylide SN2, and where they must not fire; E,E geometry kept; charge and atom balance; RDKit hybridisation; MMFF 3-D collinear count over 20 conformers; the sp-run rule; custom alkynes, base and bromides; the traps |
| `sim_p1q12.js` | node + Playwright | the straight-line carbon lab end to end: self-contained, ES5, no answer value in the script; the arrow-pushing engine (valid intermediates, conserved charge, products equal to what the arrows make), hybridisation and the two line counts, and its custom branches; the answer above the experiment and the dock below it; optional conditions and warnings; one START runs all nine stages; flask and molecules in step; live gauges; audit, badges and charts; the reveal and blink; the 3-D line explorer; replay, pause, reset; custom runs; classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q13.py` | python3 | ADV-2026-P1-CHE-Q13: Hess's law two ways for diamond to graphite and propene to cyclopropane; third-law entropies; Sackur-Tetrode physisorption entropy checked against S(N2); two-state DSC integration for denaturation; List-II mapping, every option, reversed-process controls; the page's values |
| `sim_p1q13.js` | node + Playwright | the thermo-signs lab end to end: self-contained, ES5, no answer in the script; the engine's measured values, known-value checks and controls; the answer above the experiment and the dock below it; conditions and warnings; one START runs all eight stages; ΔH read before ΔS; tiles, option board, badges and charts; the reveal and blink; the ΔG-T explorer; replay, pause, reset; a custom run; classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q14.py` | python3 + numpy + scipy | ADV-2026-P1-CHE-Q14: lone pairs counted two ways (central-atom rule and Lewis structure); a separate 1/r^8 repulsion model minimised with scipy from 40 starts; shapes from bond angles and the AXnEm table; tally, List-II and every option; controls SO3, XeF4, SF6; lone-pair compression; the page's shapes |
| `sim_p1q14.js` | node + Playwright | the VSEPR shape lab end to end: self-contained, ES5, no shape or answer in the script; the engine's counts, shapes, placements and controls; the answer above the experiment and the dock below it; conditions and warnings; one START runs all eight stages; gauges through the species; tiles, option board, badges and charts; the reveal and blink; the VSEPR builder; replay, pause, reset; a custom run; classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q15.py` | python3 + RDKit | ADV-2026-P1-CHE-Q15: RDKit ozonolysis template (one ten-membered dione each); every intramolecular aldol enumerated and the more substituted enolate closing rings of five or more chosen; canonical-SMILES match with List-II; the eight-step arrow-pushing mechanism pushed independently (gen_q15.py) with valence and charge checks; kinetic-enolate and no-base controls; every option |
| `gen_q15.py` | python3 + RDKit | build-time generator for Q15: the List-I and List-II graphs and RDKit drawing coordinates for every mechanistic state (the page computes the chemistry itself) |
| `sim_p1q15.js` | node + Playwright | the ozonolysis-aldol ring lab end to end: self-contained, ES5, no product or answer in the script; the arrow-pushing engine for all four alkenes (valid intermediates, conserved charge, products equal to what the arrows make), enolate choice and graph matching, and its controls; the answer above the experiment and the dock below it; one START runs all thirteen stages; flask and molecules in step; gauges, tiles, option board, badges and charts; the reveal and blink; the mechanism explorer; replay, pause, reset; a custom run; classroom mode; 390 and 360 px; reduced motion; the feed entries; and the real app shell opening it |
| `verify_p1q16.py` | python3 + RDKit | ADV-2026-P1-CHE-Q16: solved before the key; RDKit structure edits for intramolecular SNAr, the Kemp elimination, O-acetylation, anti E2 and ester hydrolysis, each sanitised; ETKDG + MMFF conformers with a rigid torsion scan (the Z oxime O reaches the C–Br carbon, the E never, against the 3.22 Å C + O contact) with C=N stereo read from CIP and 3-D dihedrals; RDKit resonance of the Meisenheimer complex (para-NO₂ activates, meta does not); an independent arrow-pushing ledger; List-II matched by isomeric canonical SMILES; every option audited; controls (E aldoxime, meta-NO₂, Z O-acetyl ketoxime, Beckmann of E and Z); the page's engine extracted and run in Node |
| `sim_p1q16.js` | node + Playwright | the oxime reach lab end to end: self-contained, ES5, a marked engine and no answer in the script; every elementary step valid with charge and electrons conserved and each product exactly what its arrows make; products matched by graph (C=N geometry included); the 3-D reach model; the answer above the experiment and the dock below it; conditions and warnings; one START runs all ten stages; the O···C–Br, arrow, charge, octet and A₃₈₀ gauges; tiles, List-II marks, option board, badges, 15-row evidence table and both charts; the reveal and blink; the reach explorer (Z/E, O-acetyl, reagent, keys and drag); replay, pause, reset; a custom run (Z-S → no option); classroom mode; 390 and 360 px; reduced motion; the step caption repeated as text on phones; and, by its status, either the feed entries and the real app shell opening it, or (while it is a draft) its absence from the feed, the sitemap, the lock and the app |

## Setting up on a Mac (one time)

Everything installs inside the repository (git-ignored) except Playwright's Chromium,
which goes to Playwright's per-user cache `~/Library/Caches/ms-playwright`. No sudo, and
nothing system-wide.

```bash
cd ~/Documents/"Project simulation"

# Node: Playwright 1.56.1 - the release that ships Chromium build 1194, the build
# these suites were written against
npm ci --prefix tests
npx --prefix tests playwright install chromium

# Python: sympy, numpy, scipy, RDKit in a project-local venv
python3 -m venv tests/.venv
tests/.venv/bin/pip install -r tests/requirements.txt
```

## Running them

```bash
# the two that need nothing installed
python3 tools/check_library.py
python3 tools/production_audit.py

# everything
bash tests/runall.sh

# one suite
tests/.venv/bin/python tests/verify_p1q04.py
node tests/sim_p1q04.js
```

`runall.sh` prints one line per suite and a summary line: `passed / failed / missing`.
It exits 0 when everything passed, 1 when anything FAILED, and 2 when nothing failed but
a referenced suite is MISSING. Five references are MISSING outside the Cowork container:
`verify15-17.py`, `t17.js` and `scalecheck.js` lived only in `/home/claude/build` and are
not in the repository (see `docs/TESTING_PORTABILITY.md`).

How the same files run in both places:

- **Playwright and Chromium** come from `tests/_browser.js`. It uses `$PLAYWRIGHT` first,
  then `tests/node_modules`, then the Cowork `/home/claude/build`. For the browser it uses
  `$PRAYOGX_CHROMIUM` first, then the Cowork `/opt/pw-browsers/chromium-1194`, then
  Playwright's own download. Both routes land on Chromium 141.0.7390.37.
- **`python3`**: `runall.sh` puts `tests/.venv/bin` first on `PATH` when the venv exists,
  so the verifiers and every helper a browser suite spawns get the same interpreter.
- **`timeout`**: GNU `timeout` if present, then `gtimeout`, then a `perl` fallback. macOS
  ships neither `timeout` nor `gtimeout`.
- **`PRAYOGX_BUILD`** (default `/home/claude/build`): `runall.sh` `cd`s there if it exists,
  so the container-only suites still resolve in Cowork. Elsewhere it runs from the
  repository root.

Some browser suites leave copies of the app shell in `tests/adstest*/`, `tests/apptest*/`
and `tests/appwww*/` after a run. They are git-ignored so `publish.sh` never commits them,
and they are safe to delete.

`propagation.js` and `stalecache.js` add a probe simulation and bump a real simulation's
revision. `runall.sh` runs each against a fresh throwaway copy of the working tree (made
with `rsync`, removed on exit), so the repository is never modified. Run directly with
`node`, they still work on the real tree and restore it in `finally`; prefer `runall.sh`.

**Known intermittent failure:** `sim_p1q10.js` sometimes reports 100/101 ("the distinct
count only ever rises"). That's a polling race in the test, not a simulation defect; see
`docs/TESTING_PORTABILITY.md` §10.

## What `edgetoedge.js` can and cannot prove

It drives the real `app/www` shell in a real browser and sets `--safe-t/-b/-l/-r` with
exactly the statement `MainActivity.publishInsets()` builds, so **the CSS half is
verified, not asserted**. The native half - that Android actually reports those insets
and that the WebView receives the JavaScript - cannot run here: that needs an Android
SDK and an emulator, and the container has neither. The suite pins the seam between the
two halves statically instead: the property names `MainActivity.java` writes must be the
ones `app.css` reads, or it fails.

## A rule these suites follow

Any suite that edits the canonical source restores it in a `finally` block. An earlier
version did not, and a mid-run failure left the tree modified, which then failed the next
suite for the wrong reason. If you add a suite that writes anything, do the same.
