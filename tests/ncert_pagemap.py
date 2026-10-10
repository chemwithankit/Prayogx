"""pageMap schema rules (tools/ncert_schema.py): the explicit page -> resource mapping.
Run: python3 tests/ncert_pagemap.py"""
import copy, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import ncert_schema  # noqa: E402

sims = json.load(open(os.path.join(ROOT, "data/manifest.json")))
sims = sims["simulations"] if isinstance(sims, dict) else sims
CH = "data/ncert/chapters/NCERT-11-CHE-P1-CH05.json"
orig = json.load(open(os.path.join(ROOT, CH)))
n = bad = 0


def check(label, cond):
    global n, bad
    n += 1
    bad += 0 if cond else 1
    print(("PASS  " if cond else "FAIL  ") + label)


def run(mutate):
    chap = copy.deepcopy(orig)
    mutate(chap)
    real = ncert_schema._load
    ncert_schema._load = lambda r, rel: chap if rel == CH else real(r, rel)
    try:
        return [p for p in ncert_schema.problems(ROOT, sims) if "pageMap" in p]
    finally:
        ncert_schema._load = real


check("the shipped pageMap is valid", run(lambda c: None) == [])
check("page outside the chapter is rejected", any("outside" in p for p in run(lambda c: c["pageMap"].update({"999": ["CON-CHE-CALORIMETER-01"]}))))
check("non-numeric page key is rejected", any("printed page number" in p for p in run(lambda c: c["pageMap"].update({"x": ["CON-CHE-CALORIMETER-01"]}))))
check("unknown ID is rejected", any("not a CON- or ADV-" in p for p in run(lambda c: c["pageMap"].update({"143": ["nope"]}))))
check("ID missing from the manifest is rejected", any("manifest" in p for p in run(lambda c: c["pageMap"].update({"143": ["CON-CHE-NOT-A-THING"]}))))
check("ID on a page outside any section that lists it is rejected",
      any("must be listed" in p for p in run(lambda c: c["pageMap"].update({"137": ["CON-CHE-CALORIMETER-01"]}))))
check("empty list is rejected", any("non-empty" in p for p in run(lambda c: c["pageMap"].update({"143": []}))))
check("repeated ID is rejected", any("repeats" in p for p in run(lambda c: c["pageMap"].update({"143": ["CON-CHE-CALORIMETER-01"] * 2}))))
check("a chapter without pageMap is still valid", run(lambda c: c.pop("pageMap")) == [])
print("\n%d/%d passed" % (n - bad, n))
sys.exit(1 if bad else 0)
