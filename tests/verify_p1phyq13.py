#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q13 - sound of wavelength 0.29 m enters four tube networks at S and reaches a detector at
D along a straight tube of length l and a detour; the smallest l giving a maximum at D; match List-I to
List-II (1.32, 1.19, 0.51, 0.29, 0.13 m). cos 15 = 0.97 given.

Solved here before the key, by routes that share no code:
  1. sympy: each detour length as a multiple of l, first maximum at path difference = lambda;
  2. geometry from coordinates: each network built as points (semicircle arcs sampled, triangle from its
     angles by intersecting the two sides), path lengths measured numerically, then the two waves added
     as phasors and the first maximum of |1 + e^(i phi)| found by sweeping l (no path-difference formula);
  3. the options audited against the resulting match;
then the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq13.py
"""
import json
import math
import os
import re
import subprocess
import sys

import numpy as np
import sympy as sp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q13", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    detail = str(detail)
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + detail))


LAM = 0.29
LIST2 = {1: 1.32, 2: 1.19, 3: 0.51, 4: 0.29, 5: 0.13}
OPTS = {"A": dict(P=4, Q=3, R=5, S=1), "B": dict(P=4, Q=3, R=1, S=5), "C": dict(P=3, Q=4, R=1, S=2), "D": dict(P=3, Q=4, R=5, S=2)}
nearest = lambda v: min(LIST2, key=lambda k: abs(LIST2[k] - v))

# ------------------------------------------------------------------ 1. sympy
l = sp.symbols("l", positive=True)
c15 = sp.Rational(97, 100)
detour = {"P": sp.pi * l / 2, "Q": 2 * l, "R": l + sp.pi * sp.sqrt(2) * l / 2,
          "S": l * (sp.sin(sp.pi / 6) + sp.sin(sp.pi / 4)) / c15}
lmin = {k: float(sp.solve(sp.Eq(v - l, LAM), l)[0]) for k, v in detour.items()}
chk("sympy: P l = 0.29/(pi/2 - 1) = 0.508 m", abs(lmin["P"] - 0.50806) < 1e-4, lmin["P"])
chk("sympy: Q l = 0.29 m", abs(lmin["Q"] - 0.29) < 1e-12)
chk("sympy: R l = 0.29/(pi/sqrt2) = 0.1305 m", abs(lmin["R"] - 0.13055) < 1e-4, lmin["R"])
chk("sympy: S l = 0.29 x 0.97/(0.5 + 0.7071 - 0.97) = 1.186 m", abs(lmin["S"] - 1.18639) < 1e-4, lmin["S"])
sym_map = {k: nearest(v) for k, v in lmin.items()}
chk("sympy: nearest List-II values P->3, Q->4, R->5, S->2", sym_map == dict(P=3, Q=4, R=5, S=2), sym_map)
sym_hits = [k for k, v in OPTS.items() if v == sym_map]
chk("exactly one option matches: (D)", sym_hits == ["D"], sym_hits)
lS_exact = LAM / ((0.5 + math.sqrt(0.5)) / math.cos(math.radians(15)) - 1)
chk("with the exact cos 15 = 0.9659, S gives 1.161 m - still nearest (2) 1.19", abs(lS_exact - 1.1611) < 1e-3 and nearest(lS_exact) == 2, lS_exact)


# ------------------------------------------------------------------ 2. geometry from coordinates + phasors
def polylen(pts):
    pts = np.asarray(pts)
    return float(np.sum(np.hypot(np.diff(pts[:, 0]), np.diff(pts[:, 1]))))


def arc(cx, cy, r, a0, a1, n=20000):
    t = np.linspace(a0, a1, n)
    return np.stack([cx + r * np.cos(t), cy + r * np.sin(t)], axis=1)


def network(cfg):
    """detour path for l = 1 from S (0,0) to D (1,0)."""
    if cfg == "P":
        return arc(0.5, 0, 0.5, math.pi, 0)                      # semicircle, top of height 0.5 l
    if cfg == "Q":
        return np.array([[0, 0], [0, 0.5], [1, 0.5], [1, 0]])
    if cfg == "R":
        a0 = math.atan2(0.5, -0.5)                               # from the top of the vertical (0,1) about (0.5,0.5)
        return np.vstack([[[0, 0], [0, 1]], arc(0.5, 0.5, math.sqrt(0.5), a0, a0 - math.pi)])
    # S: sides from S at 45 deg and from D at 30 deg (105 at the apex), intersected
    t45, t30 = math.radians(45), math.radians(30)
    # apex = S + a (cos45, sin45) = D + b (-cos30, sin30)
    Amat = np.array([[math.cos(t45), math.cos(t30)], [math.sin(t45), -math.sin(t30)]])
    a, b = np.linalg.solve(Amat, np.array([1.0, 0.0]))
    apex = np.array([a * math.cos(t45), a * math.sin(t45)])
    return np.array([[0, 0], apex, [1, 0]])


factor = {k: polylen(network(k)) for k in "PQRS"}
chk("coordinates: the R network ends at D and the P arc tops out at 0.5 l", np.allclose(network("R")[-1], [1, 0], atol=1e-9) and abs(network("P")[:, 1].max() - 0.5) < 1e-6)
chk("coordinates: detour factors 1.5708, 2, 3.2214, 1.2497 (exact angles)", abs(factor["P"] - math.pi / 2) < 1e-6 and abs(factor["Q"] - 2) < 1e-12
    and abs(factor["R"] - (1 + math.pi / math.sqrt(2))) < 1e-6 and abs(factor["S"] - (0.5 + math.sqrt(0.5)) / math.cos(math.radians(15))) < 1e-9, factor)


def first_max(fac):
    ls = np.linspace(1e-4, 3, 300001)
    amp = np.abs(1 + np.exp(1j * 2 * np.pi * (fac - 1) * ls / LAM))
    i = next(i for i in range(1, len(ls) - 1) if amp[i] >= amp[i - 1] and amp[i] >= amp[i + 1] and amp[i] > 1.999)
    return ls[i]


fm = {k: first_max(factor[k]) for k in "PQRS"}
fm_given = dict(fm); fm_given["S"] = first_max((0.5 + math.sqrt(0.5)) / 0.97)
chk("phasor sweep: first maxima P 0.508, Q 0.290, R 0.131 m (to the sweep step)", abs(fm["P"] - lmin["P"]) < 2e-5 and abs(fm["Q"] - 0.29) < 2e-5 and abs(fm["R"] - lmin["R"]) < 2e-5, fm)
chk("phasor sweep: S 1.161 m with exact angles, 1.186 m with the given cos 15 = 0.97 - both nearest (2)", nearest(fm["S"]) == 2 and nearest(fm_given["S"]) == 2 and abs(fm_given["S"] - lmin["S"]) < 2e-5, (fm["S"], fm_given["S"]))
geo_map = {k: nearest(v) for k, v in fm_given.items()}
chk("phasor sweep: the match is P->3, Q->4, R->5, S->2 = option (D)", [k for k, v in OPTS.items() if v == geo_map] == ["D"], geo_map)
chk("at half a wavelength of path difference the detector is silent (Q at l = 0.145 m)", abs(abs(1 + np.exp(1j * 2 * np.pi * 0.145 / LAM))) < 1e-9)

# ------------------------------------------------------------------ 3. options
for k in "ABC":
    wrong = [c for c in "PQRS" if OPTS[k][c] != sym_map[c]]
    chk("option (%s) fails on %s" % (k, ", ".join(wrong)), len(wrong) > 0)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + "\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(), f: ['P','Q','R','S'].map(function(c){ return ENGINE.DETOUR[c](); })}));"
        o = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(o.stdout)
        except ValueError:
            res = {}
        q = res.get("q", {})
        chk("page engine: answer 'D', map P3 Q4 R5 S2", q.get("answer") == "D" and q.get("map") == dict(P=3, Q=4, R=5, S=2), o.stderr[:200] or q)
        chk("page engine: first maxima agree with the sympy values to 1e-6 m", all(abs(q.get("l", {}).get(k, 0) - lmin[k]) < 1e-6 for k in "PQRS"), q.get("l"))
        chk("page engine: detour factors P, Q, R as measured here; S with cos 15 = 0.97", all(abs(a - b) < 1e-6 for a, b in zip(res.get("f", [])[:3], [factor["P"], factor["Q"], factor["R"]])) and abs(res.get("f", [0, 0, 0, 0])[3] - (0.5 + math.sqrt(0.5)) / 0.97) < 1e-12)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("P 0.508 -> (3), Q 0.290 -> (4), R 0.131 -> (5), S 1.186 -> (2)  ->  ANSWER (D)")
print("official key (read last): D -", "agrees" if sym_hits == ["D"] else "DISAGREES")
print("MathonGo solution (their Q29 = Physics Q.13): (D) -", "agrees" if sym_hits == ["D"] else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
