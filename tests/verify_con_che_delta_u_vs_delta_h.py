#!/usr/bin/env python3
"""CON-CHE-DELTA-U-VS-DELTA-H - two calorimeters, one reaction (XP-09; NCERT Class 11 Chemistry Part I, §5.2.2(a), §5.3).

The same fuel burns in a sealed bomb (constant volume) and in an idealised piston calorimeter at 1 bar. Claims checked:
  q_V = ΔU (no work), q_p = ΔH, ΔH − ΔU = Δn_g RT, Δn_g = 0 gives ΔH = ΔU, temperature rises ΔT = −q / C_cal.

Solved here by routes that share no code with the page:
  1. exact rational arithmetic (fractions): Δn_g counted from the balanced equations (gases only), Δ_rU = Δ_rH − Δn_g RT;
  2. the work route: ideal-gas volumes of the actual gas present before and after (fuel, oxygen in excess, products),
     w = −pΔV, q_p = q_V − w, ΔH = q_p / n - must reproduce NCERT's Δ_rH;
  3. the calorimeter route: ΔT = −q / C_cal, then q recovered from ΔT, per mole;
  4. the locked blueprint table (docs/ncert/blueprints/CON-CHE-DELTA-U-VS-DELTA-H.md §1.2) to its stated precision;
  5. NCERT's own Problem 5.6 numbers, which are recorded as a source discrepancy (flag F1), not used;
then the page's ENGINE (between ENGINE-BEGIN and ENGINE-END) is run in Node and compared for every preset and what-if.

Run:  tests/.venv/bin/python tests/verify_con_che_delta_u_vs_delta_h.py [--json]
"""
import json
import os
import re
import subprocess
import sys
from fractions import Fraction as F

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "concepts", "chemistry", "con-che-delta-u-vs-delta-h", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    if "--json" not in sys.argv:
        print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or not detail else "  -> " + str(detail)))


R = F(8314, 1000)                  # J mol-1 K-1
T = F(298)                         # K
P = F(100000)                      # Pa (1 bar)
CCAL = F(207, 10)                  # kJ K-1 (NCERT, Problem 5.6)
RT = R * T / 1000                  # kJ mol-1

# the balanced equations, written out species by species: (coefficient, phase)
REACTIONS = {
    "C": {"name": "C(graphite) + O2(g) -> CO2(g)", "dH": F(-3935, 10), "n": F(1, 12),          # 1.000 g / 12.0 g mol-1
          "react": {"C": (1, "s"), "O2": (1, "g")}, "prod": {"CO2": (1, "g")}, "k": 4, "xo": 12},
    "H": {"name": "H2(g) + 1/2 O2(g) -> H2O(l)", "dH": F(-2858, 10), "n": F(1, 10),
          "react": {"H2": (1, "g"), "O2": (F(1, 2), "g")}, "prod": {"H2O": (1, "l")}, "k": 4, "xo": 10},
    "B": {"name": "C4H10(g) + 13/2 O2(g) -> 4 CO2(g) + 5 H2O(l)", "dH": F(-26580, 10), "n": F(1, 100),
          "react": {"C4H10": (1, "g"), "O2": (F(13, 2), "g")}, "prod": {"CO2": (4, "g"), "H2O": (5, "l")}, "k": 2, "xo": 5},
}


def dng(r):
    return sum(F(c) for c, ph in r["prod"].values() if ph == "g") - sum(F(c) for c, ph in r["react"].values() if ph == "g")


def solve(key, scale=1, dng_hyp=None):
    r = REACTIONS[key]
    real = dng(r)
    d = real if dng_hyp is None else F(dng_hyp)
    n = r["n"] * F(scale)
    dU = r["dH"] - real * RT                                    # route 1 (the reaction's ΔU)
    unit = n / r["k"]                                           # mol per token
    gas0 = sum(F(c) * r["k"] for c, ph in r["react"].values() if ph == "g") + r["xo"]
    ng0 = gas0 * unit
    ng1 = ng0 + n * d
    V0, V1 = ng0 * R * T / P, ng1 * R * T / P                   # m3
    w = -P * (V1 - V0) / 1000                                   # kJ on the system (route 2)
    qV = n * dU
    qP = qV - w
    dTv, dTp = -qV / CCAL, -qP / CCAL                           # route 3
    return {"key": key, "dng": d, "dngReal": real, "n": n, "dU": qV / n, "dH": qP / n, "gap": qP / n - qV / n, "dngRT": d * RT,
            "qV": qV, "qP": qP, "w": w, "dV": (V1 - V0) * 1000, "dTv": dTv, "dTp": dTp, "ng0": ng0, "ng1": ng1}


def fl(x):
    return float(x)


# ---------------------------------------------------------------- 1-3: the science
for key in "CHB":
    s = solve(key)
    chk("%s: Δn_g from the balanced equation (gases only) = %s" % (key, s["dng"]), s["dng"] == {"C": 0, "H": F(-3, 2), "B": F(-7, 2)}[key])
    chk("%s: the work route reproduces NCERT's Δ_rH exactly (q_p / n = Δ_rH)" % key, s["dH"] == REACTIONS[key]["dH"], fl(s["dH"]))
    chk("%s: ΔH − ΔU = Δn_g RT exactly" % key, s["gap"] == s["dngRT"], (fl(s["gap"]), fl(s["dngRT"])))
    chk("%s: the calorimeter route recovers q from ΔT (q = −C_cal ΔT)" % key, -CCAL * s["dTv"] == s["qV"] and -CCAL * s["dTp"] == s["qP"])
    chk("%s: exothermic: both waters warm (ΔT > 0, q < 0)" % key, s["dTv"] > 0 and s["dTp"] > 0 and s["qV"] < 0 and s["qP"] < 0)
    chk("%s: ΔV from the gas count matches Δn·RT/p" % key, s["dV"] == s["n"] * s["dng"] * R * T / P * 1000)
    chk("%s: the gas never runs out (excess O2 keeps a positive volume)" % key, s["ng1"] > 0)

c, h, b = solve("C"), solve("H"), solve("B")
chk("graphite: Δn_g = 0 gives ΔH = ΔU, equal ΔT, no piston motion", c["dH"] == c["dU"] and c["dTv"] == c["dTp"] and c["dV"] == 0)
chk("hydrogen and butane: the piston side warms more (Δn_g < 0, the atmosphere does work on the gas)", h["dTp"] > h["dTv"] and b["dTp"] > b["dTv"] and h["w"] > 0)
chk("(ΔH − ΔU)/Δn_g = RT for hydrogen and butane", h["gap"] / h["dng"] == RT and b["gap"] / b["dng"] == RT, fl(RT))
s2 = solve("H", scale=2)
chk("amount ×2 doubles ΔT and q but not the per-mole ΔU, ΔH", s2["dTv"] == 2 * h["dTv"] and s2["dU"] == h["dU"] and s2["dH"] == h["dH"])
s5 = solve("H", scale=F(1, 2))
chk("amount ×½ halves ΔT", s5["dTp"] == h["dTp"] / 2)
for d in [x / 2 for x in range(-6, 7)]:
    sh = solve("B", dng_hyp=d)
    if not (sh["gap"] == F(d) * RT and sh["dU"] == b["dU"] and sh["ng1"] > 0):
        chk("what-if Δn_g = %s keeps ΔU and gives the gap Δn_g RT" % d, False); break
else:
    chk("what-if Δn_g from −3 to +3: ΔU fixed, gap = Δn_g RT, gas volume stays positive (all reactions)",
        all(solve(k, dng_hyp=x / 2)["ng1"] > 0 for k in "CHB" for x in range(-6, 7)))
chk("what-if Δn_g > 0: the piston rises, the gas does work (w < 0), the bomb is the hotter side", solve("H", dng_hyp=2)["w"] < 0 and solve("H", dng_hyp=2)["dTv"] > solve("H", dng_hyp=2)["dTp"])

# ---------------------------------------------------------------- 4: the locked blueprint table
TABLE = {"C": (0, -393.5, -393.50, 0.00, 1.584, 1.584, 0.00), "H": (-1.5, -285.8, -282.08, -3.72, 1.363, 1.381, -3.72),
         "B": (-3.5, -2658.0, -2649.33, -8.67, 1.280, 1.284, -0.87)}
for key, (d, dH, dU, gap, tv, tp, dv) in TABLE.items():
    s = solve(key)
    chk("%s: equals the blueprint table (Δn_g, ΔH, ΔU, gap, ΔT sealed/piston, ΔV)" % key,
        fl(s["dng"]) == d and round(fl(s["dH"]), 1) == dH and round(fl(s["dU"]), 2) == dU and round(fl(s["gap"]), 2) == gap
        and round(fl(s["dTv"]), 3) == tv and round(fl(s["dTp"]), 3) == tp and round(fl(s["dV"]), 2) == dv,
        (fl(s["dU"]), fl(s["gap"]), fl(s["dTv"]), fl(s["dTp"]), fl(s["dV"])))
chk("RT = 2.4776 kJ mol⁻¹ (8.314 × 298 / 1000)", round(fl(RT), 4) == 2.4776)

# ---------------------------------------------------------------- 5: NCERT Problem 5.6 (flag F1: recorded, not used)
p56 = CCAL * 1 * 12                # 20.7 kJ K-1 × 1 K, per 1 g, × 12 g mol-1
chk("F1 recorded: Problem 5.6's illustrative readings give %.1f kJ mol⁻¹, not the tabulated 393.5 (the page uses 393.5)" % fl(p56),
    round(fl(p56), 1) == 248.4 and REACTIONS["C"]["dH"] == F(-3935, 10))

# ---------------------------------------------------------------- the page's own engine, in Node
src = open(PAGE, encoding="utf-8").read()
m = re.search(r"/\* ENGINE-BEGIN \*/(.*?)/\* ENGINE-END \*/", src, re.S)
chk("the page has an ENGINE block", bool(m))
cases = [(k, 1, None) for k in "CHB"] + [("H", 2, None), ("H", 0.5, None), ("B", 1, 2), ("C", 1, -3), ("H", 1, 3)]
js = m.group(1) + "\nvar out = [];\n" + "".join(
    "out.push(ENGINE.run({rxn:%s, scale:%s, dng:%s}));\n" % (json.dumps(k), s, "null" if d is None else d) for k, s, d in cases) + \
    "process.stdout.write(JSON.stringify(out));"
res = subprocess.run(["node", "-e", js], capture_output=True, text=True)
chk("the page's ENGINE runs in Node", res.returncode == 0, res.stderr[:300])
page = json.loads(res.stdout) if res.returncode == 0 else []
for (k, s, d), pg in zip(cases, page):
    v = solve(k, scale=F(s).limit_denominator(4), dng_hyp=d)
    keys = ("dU", "dH", "gap", "dngRT", "qV", "qP", "w", "dV", "dTv", "dTp")
    worst = max(abs(fl(v[x]) - pg[x]) for x in keys)
    chk("page = verifier for %s ×%s Δn_g %s (all of ΔU, ΔH, gap, Δn_gRT, q, w, ΔV, ΔT; max |diff| %.1e)" % (k, s, "real" if d is None else d, worst),
        worst < 1e-9 and pg["answer"] == (("−" if v["gap"] < 0 else "") + "%.2f" % abs(fl(v["gap"]))))

expected = {k: {x: fl(solve(k)[x]) for x in ("dng", "dU", "dH", "gap", "dngRT", "qV", "qP", "w", "dV", "dTv", "dTp")} for k in "CHB"}
expected["RT"] = fl(RT)
expected["CCAL"] = fl(CCAL)
if "--json" in sys.argv:
    print(json.dumps({"ok": not fail, "passed": len(ok), "failed": len(fail), "expected": expected}))
else:
    print()
    print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
