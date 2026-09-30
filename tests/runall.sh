#!/usr/bin/env bash
# Every available suite, run against the production tree.
#
# Runs on macOS and in the Claude Cowork Linux container:
#   - tests/.venv (if present) goes first on PATH, so `python3` - here and in
#     every helper the browser suites spawn - has sympy/numpy/scipy/RDKit.
#   - Playwright and Chromium are resolved by tests/_browser.js.
#   - `timeout` falls back to gtimeout, then to perl (always present on macOS).
#   - A suite that is referenced but not on disk is reported MISSING, not
#     FAILED, and is counted separately.
#   - propagation.js and stalecache.js write into the tree they test (a probe
#     simulation; a revision bump on P2 Q16). They run against a throwaway copy
#     of the working tree, so an interrupted run cannot leave debris behind.
#
# Exit: 0 all passed, 1 any FAILED, 2 nothing failed but something MISSING.
set -u
ROOT="${PRAYOGX_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
HERE="$(cd "$(dirname "$0")" && pwd)"
# The Cowork container kept extra suites (verify15-17.py, t17.js, scalecheck.js)
# in /home/claude/build; they resolve there. Elsewhere this falls back to ROOT.
BUILD="${PRAYOGX_BUILD:-/home/claude/build}"
cd "$BUILD" 2>/dev/null || cd "$ROOT"
[ -x "$HERE/.venv/bin/python3" ] && export PATH="$HERE/.venv/bin:$PATH"
pass=0; fail=0; missing=0
line(){ printf '%-46s %s\n' "$1" "$2"; }

tmo(){ # seconds, command...
  if command -v timeout >/dev/null 2>&1; then timeout "$@"
  elif command -v gtimeout >/dev/null 2>&1; then gtimeout "$@"
  else perl -e 'alarm shift; exec @ARGV or die "exec: $!"' "$@"; fi
}

SCRATCH=""
make_scratch(){ # a fresh disposable copy of the working tree; call in this shell, not $(...)
  cleanup
  SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/prayogx-tests.XXXXXX")"
  # -rlp, not -a: the copy must get fresh mtimes. python's http.server sends
  # Last-Modified and no Cache-Control, so Chromium caches heuristically for ~10%
  # of a file's age; days-old mtimes kept the revision-1 feed "fresh" for hours
  # and made stalecache.js fail 25/28 for a reason that is not the product's.
  rsync -rlp \
    --exclude='/.git' --exclude='/_scratch' --exclude='/Claude outputs' --exclude='/papers' \
    --exclude='node_modules' --exclude='/tests/.venv' \
    --exclude='/app/android/.gradle' --exclude='/app/android/build' --exclude='/app/android/app/build' \
    --exclude='/app/android/app/src/main/assets' \
    "$ROOT/" "$SCRATCH/"
}
cleanup(){ [ -n "$SCRATCH" ] && rm -rf "$SCRATCH"; }
trap cleanup EXIT

echo "=== chemistry verifiers (exact arithmetic, no browser) ==="
echo "    python3 = $(command -v python3)"
for f in verify15.py verify16.py verify17.py "$HERE/verify_p1q01.py" "$HERE/verify_p1q02.py" "$HERE/verify_p1q03.py" "$HERE/verify_p1q04.py" "$HERE/verify_p1q05.py" "$HERE/verify_p1q06.py" "$HERE/verify_p1q07.py" "$HERE/verify_p1q08.py" "$HERE/verify_p1q09.py" "$HERE/verify_p1q10.py" "$HERE/verify_p1q11.py" "$HERE/verify_p1q12.py" "$HERE/verify_p1q13.py" "$HERE/verify_p1q14.py" "$HERE/verify_p1q15.py" "$HERE/verify_p1q16.py" "$HERE/verify_p1phyq01.py" "$HERE/verify_p1phyq02.py" "$HERE/verify_p1phyq03.py" "$HERE/verify_p1phyq04.py" "$HERE/verify_p1phyq05.py" "$HERE/verify_p1phyq06.py" "$HERE/verify_p1phyq07.py" "$HERE/verify_p1phyq08.py" "$HERE/verify_p1phyq09.py"; do
  nm=$(basename "$f")
  if [ ! -f "$f" ]; then line "$nm" "MISSING (not in this tree)"; missing=$((missing+1)); continue; fi
  out=$(python3 "$f" 2>&1 | tail -1)
  if echo "$out" | grep -q "0 failed"; then line "$nm" "$out"; pass=$((pass+1));
  else line "$nm" "FAILED: $out"; fail=$((fail+1)); fi
done

echo
echo "=== workflow tools: tracker Sheet sync, simulation factory, registry rules (no network) ==="
for f in "$HERE/test_tracker_sheet.py" "$HERE/test_auto_sim.py" "$HERE/test_registry_schema.py"; do
  nm=$(basename "$f")
  if [ ! -f "$f" ]; then line "$nm" "MISSING (not in this tree)"; missing=$((missing+1)); continue; fi
  out=$(python3 "$f" 2>&1 | tail -1)
  if echo "$out" | grep -q " 0 failed"; then line "$nm" "$out"; pass=$((pass+1));
  else line "$nm" "FAILED: $out"; fail=$((fail+1)); fi
done

echo
echo "=== library and production validation ==="
for f in check_library.py production_audit.py; do
  if out=$(python3 "$ROOT/tools/$f" 2>&1); then line "$f" "$(echo "$out" | tail -1)"; pass=$((pass+1));
  else line "$f" "FAILED"; echo "$out" | tail -5; fail=$((fail+1)); fi
done

echo
echo "=== headless browser suites ==="
run(){ # name, script [, root]
  if [ ! -f "$2" ]; then line "$1" "MISSING ($(basename "$2") not in this tree)"; missing=$((missing+1)); return; fi
  full=$(PRAYOGX_ROOT="${3:-$ROOT}" tmo 400 node "$2" 2>&1)
  out=$(echo "$full" | grep -E "^[0-9]+ / [0-9]+ passed" | tail -1)
  if [ -z "$out" ]; then line "$1" "NO RESULT"; echo "$full" | tail -3 | sed 's/^/      /'; fail=$((fail+1)); return; fi
  a=${out%% /*}; b=$(echo "$out" | awk '{print $3}')
  if [ "$a" = "$b" ]; then line "$1" "$out"; pass=$((pass+1));
  else line "$1" "FAILED  $out"; echo "$full" | grep -E "^FAIL" | head -5 | sed 's/^/      /'; fail=$((fail+1)); fi
}
run "Q17 simulation (t17.js)"              t17.js
run "P1 Q1 two-step compression bench"    "$HERE/sim_p1q01.js"
run "P1 Q2 reversible reaction chamber"    "$HERE/sim_p1q02.js"
run "P1 Q3 dipole bench"                   "$HERE/sim_p1q03.js"
run "P1 Q4 lactone overlay bench"          "$HERE/sim_p1q04.js"
run "P1 Q5 atom chamber"                  "$HERE/sim_p1q05.js"
run "P1 Q6 chemical identity lab"         "$HERE/sim_p1q06.js"
run "P1 Q7 electron-transfer lab"         "$HERE/sim_p1q07.js"
run "P1 Q8 synthesis pathway lab"          "$HERE/sim_p1q08.js"
run "P1 Q9 twin-cylinder pressure lab"     "$HERE/sim_p1q09.js"
run "P1 Q10 isomer assembly lab"          "$HERE/sim_p1q10.js"
run "P1 Q11 two-flask carbonyl lab"       "$HERE/sim_p1q11.js"
run "P1 Q12 straight-line carbon lab"     "$HERE/sim_p1q12.js"
run "P1 Q13 thermo-signs lab"             "$HERE/sim_p1q13.js"
run "P1 Q14 VSEPR shape lab"              "$HERE/sim_p1q14.js"
run "P1 Q15 ozonolysis-aldol ring lab"    "$HERE/sim_p1q15.js"
run "P1 Q16 oxime reach lab"             "$HERE/sim_p1q16.js"
run "P1 PHY Q1 rolling-ring bench"        "$HERE/sim_p1phyq01.js"
run "P1 PHY Q2 flux-exclusion resonance"  "$HERE/sim_p1phyq02.js"
run "P1 PHY Q3 corner tip-off lab"      "$HERE/sim_p1phyq03.js"
run "P1 PHY Q4 immersed lens lab"       "$HERE/sim_p1phyq04.js"
run "P1 PHY Q5 Bohr jump lab"           "$HERE/sim_p1phyq05.js"
run "P1 PHY Q6 through-the-ring launcher" "$HERE/sim_p1phyq06.js"
run "P1 PHY Q7 three-step engine lab"   "$HERE/sim_p1phyq07.js"
run "P1 PHY Q8 plane-wave tracker"      "$HERE/sim_p1phyq08.js"
run "P1 PHY Q9 buoyant pendulum lab"    "$HERE/sim_p1phyq09.js"
run "production suite (prodcheck)"         "$HERE/prodcheck.js"
make_scratch
run "single-source propagation"            "$HERE/propagation.js"  "$SCRATCH"
make_scratch
run "revision + stale cache"               "$HERE/stalecache.js"   "$SCRATCH"
run "Capacitor app shell"                  "$HERE/appcheck_prod.js"
run "Android 16 edge-to-edge"              "$HERE/edgetoedge.js"
run "feed failure messages"                "$HERE/feederror.js"
run "global navigation"                    "$HERE/navigation.js"
run "visual QA gates (layout v3)"          "$HERE/test_visual_gates.js"
run "feed schema latch"                    "$HERE/schemagate.js"
run "AdMob banner placement"               "$HERE/adsgate.js"
run "catalogue at 1000 simulations"        scalecheck.js

echo
echo "suites passed: $pass   failed: $fail   missing: $missing"
[ $fail -eq 0 ] || exit 1
[ $missing -eq 0 ] || exit 2
