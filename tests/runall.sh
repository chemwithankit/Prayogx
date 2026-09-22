#!/usr/bin/env bash
# Every available suite, run against the production tree.
set -u
ROOT="${PRAYOGX_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="${PRAYOGX_BUILD:-/home/claude/build}"
cd "$BUILD" 2>/dev/null || cd "$ROOT"
pass=0; fail=0
line(){ printf '%-46s %s\n' "$1" "$2"; }

echo "=== chemistry verifiers (exact arithmetic, no browser) ==="
for f in verify15.py verify16.py verify17.py; do
  out=$(python3 "$f" 2>&1 | tail -1)
  if echo "$out" | grep -q "0 failed"; then line "$f" "$out"; pass=$((pass+1));
  else line "$f" "FAILED: $out"; fail=$((fail+1)); fi
done

echo
echo "=== library and production validation ==="
for f in check_library.py production_audit.py; do
  if out=$(python3 "$ROOT/tools/$f" 2>&1); then line "$f" "$(echo "$out" | tail -1)"; pass=$((pass+1));
  else line "$f" "FAILED"; echo "$out" | tail -5; fail=$((fail+1)); fi
done

echo
echo "=== headless browser suites ==="
run(){ # name, script
  out=$(timeout 400 node "$2" 2>&1 | grep -E "^[0-9]+ / [0-9]+ passed" | tail -1)
  if [ -z "$out" ]; then line "$1" "NO RESULT"; fail=$((fail+1)); return; fi
  a=${out%% /*}; b=$(echo "$out" | awk '{print $3}')
  if [ "$a" = "$b" ]; then line "$1" "$out"; pass=$((pass+1));
  else line "$1" "FAILED  $out"; fail=$((fail+1)); fi
}
run "Q17 simulation (t17.js)"              t17.js
run "production suite (prodcheck)"         "$HERE/prodcheck.js"
run "single-source propagation"            "$HERE/propagation.js"
run "revision + stale cache"               "$HERE/stalecache.js"
run "Capacitor app shell"                  "$HERE/appcheck_prod.js"
run "Android 16 edge-to-edge"              "$HERE/edgetoedge.js"
run "feed failure messages"                "$HERE/feederror.js"
run "global navigation"                    "$HERE/navigation.js"
run "feed schema latch"                    "$HERE/schemagate.js"
run "catalogue at 1000 simulations"        scalecheck.js

echo
echo "suites passed: $pass   failed: $fail"
[ $fail -eq 0 ] || exit 1
