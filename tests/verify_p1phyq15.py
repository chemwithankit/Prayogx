#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q15 - four conducting loops in the XY plane rotate clockwise about the Z axis through O with
period T; a uniform field B (+z) fills x > 0. Match each loop to the qualitative graph of its induced current
i(t) (List-II): (1) a + pulse then a - pulse, (2) two + pulses then two - pulses, (3) + constant then - constant,
(4) zero, (5) linear ramps.

The MathonGo solution was read first only for the approach (area in the field). Solved here by routes that share
no code with the page:
  1. sympy: the overlap angle of each sector with the half-plane, piecewise in the rotation angle; i ~ dA/dt;
  2. Green's theorem on each loop exactly as drawn (arcs and straight wires, with the direction the wire runs):
     flux / B = closed integral of max(x, 0) dy, which counts each lobe with its own winding - so the sense of
     each lobe is not assumed, it follows from the drawn path; i(t) by finite differences over one period;
  3. a control: S drawn as a crossing figure-8 (opposite senses) gives current pulses that match no List-II
     graph - only the same-sense loop (the wire bends at O) gives the zero current of (4);
  4. every option audited;
then the page's engine is run in Node.

Sign: i is positive along the drawn arrow i (clockwise, seen from +z), so i > 0 while the flux through the loop
grows (Lenz).

Run:  tests/.venv/bin/python tests/verify_p1phyq15.py
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
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q15", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    detail = str(detail)
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + detail))


OPTS = {"A": dict(P=5, Q=4, R=1, S=3), "B": dict(P=3, Q=2, R=5, S=4), "C": dict(P=3, Q=2, R=1, S=4), "D": dict(P=5, Q=1, R=2, S=3)}
# List-II, as the mean current in each sixth of the period (normalised); (5) is a ramp up, then a ramp below zero
TEMPL = {1: [1, 0, 0, -1, 0, 0], 2: [1, 0, 1, -1, 0, -1], 3: [1, 1, 1, -1, -1, -1], 4: [0, 0, 0, 0, 0, 0],
         5: [1 / 11, 3 / 11, 5 / 11, -7 / 11, -9 / 11, -1]}


def classify(sixths):
    m = max(abs(v) for v in sixths)
    if m < 1e-6:
        return 4, 0.0
    v = np.array(sixths) / m
    d = {k: float(np.linalg.norm(v - np.array(t, float))) for k, t in TEMPL.items() if k != 4}
    k = min(d, key=d.get)
    return k, d[k]


# ------------------------------------------------------------------ 1. sympy: sectors and the half-plane
phi = sp.symbols("phi", real=True)


def overlap_deg(a0, a1, f):
    """angle (deg) of sector [a0, a1] rotated clockwise by f that lies in -90 < angle < 90 (sampled exactly)."""
    tot = 0.0
    for k in (-1, 0, 1):
        lo, hi = a0 - f + 360 * k, a1 - f + 360 * k
        tot += max(0.0, min(hi, 90) - max(lo, -90))
    return tot


SECT = {"P": [(90, 270)], "Q": [(90, 150), (210, 270)], "R": [(90, 150)], "S": [(30, 90), (210, 270)]}
sym_map = {}
for L, secs in SECT.items():
    f = np.linspace(0, 360, 3601)
    A = np.array([sum(overlap_deg(a, b, x) for a, b in secs) for x in f])
    i = np.gradient(A, f)                          # i ~ dA/dt (same sense for every lobe)
    sx = [float(i[(f >= 60 * k + 5) & (f <= 60 * k + 55)].mean()) for k in range(6)]
    sym_map[L] = classify(sx)[0]
x = sp.symbols("x")
A_P = sp.Piecewise((x, x <= 180), (360 - x, True))   # half-disc: overlap angle grows to 180 then falls
chk("sympy: the half-disc's area in the field is linear in the angle (slope +1 then -1): a constant current, reversing at T/2",
    sp.diff(A_P, x).subs(x, 90) == 1 and sp.diff(A_P, x).subs(x, 270) == -1)
chk("sector bookkeeping: P -> (3), Q -> (2), R -> (1), S -> (4)", sym_map == dict(P=3, Q=2, R=1, S=4), sym_map)


# ------------------------------------------------------------------ 2. Green's theorem on the loops as drawn
def arc(a0, a1, n=400):
    t = np.radians(np.linspace(a0, a1, n))
    return np.stack([np.cos(t), np.sin(t)], 1)


def seg(p, q, n=200):
    s = np.linspace(0, 1, n)[:, None]
    return np.array(p) * (1 - s) + np.array(q) * s


def P_(a):
    return [math.cos(math.radians(a)), math.sin(math.radians(a))]


O = [0.0, 0.0]
DRAWN = {
    # half-disc: the arc on the left from the top to the bottom, then up the y axis
    "P": [arc(90, 270), seg([0, -1], [0, 1])],
    # two sectors on the left, the wire meeting O once in the V and running up the y axis
    "Q": [arc(90, 150), seg(P_(150), O), seg(O, P_(210)), arc(210, 270), seg([0, -1], [0, 1])],
    # one sector
    "R": [arc(90, 150), seg(P_(150), O), seg(O, [0, 1])],
    # two opposite sectors; the wire bends at O (P30 -> O -> down the axis; P210 -> O -> up the axis): same sense
    "S": [arc(90, 30), seg(P_(30), O), seg(O, [0, -1]), arc(270, 210), seg(P_(210), O), seg(O, [0, 1])],
}
CROSS = [arc(90, 30), seg(P_(30), O), seg(O, P_(210)), arc(210, 270), seg([0, -1], O), seg(O, [0, 1])]   # crossing figure-8


def flux(parts, f):
    """flux / B through the loop rotated clockwise by f degrees: closed integral of max(x, 0) dy."""
    pts = np.vstack(parts)
    c, s = math.cos(math.radians(-f)), math.sin(math.radians(-f))
    q = pts @ np.array([[c, s], [-s, c]])
    xm = np.maximum(q[:, 0], 0)
    return float(np.sum(0.5 * (xm[1:] + xm[:-1]) * np.diff(q[:, 1])) + 0.5 * (xm[0] + xm[-1]) * (q[0, 1] - q[-1, 1]))


def current_sixths(parts, n=720):
    f = np.linspace(0, 360, n + 1)
    F = np.array([flux(parts, x) for x in f])
    i = np.gradient(F, f)                          # i ~ +dPhi/dt along the drawn (clockwise) arrow, up to a constant
    return [float(i[(f >= 60 * k + 5) & (f <= 60 * k + 55)].mean()) for k in range(6)], F


gmap, geo = {}, {}
for L, parts in DRAWN.items():
    sx, F = current_sixths(parts)
    gmap[L] = classify(sx)[0]
    geo[L] = (sx, F)
chk("Green's theorem on the drawn loops: the half-disc's flux at quarter turns 0 -> pi/4 -> pi/2 -> pi/4 (r = 1)",
    abs(abs(flux(DRAWN["P"], 0))) < 1e-3 and abs(abs(flux(DRAWN["P"], 90)) - math.pi / 4) < 2e-3 and abs(abs(flux(DRAWN["P"], 180)) - math.pi / 2) < 2e-3)
chk("Green's theorem: P -> (3), Q -> (2), R -> (1), S -> (4)", gmap == dict(P=3, Q=2, R=1, S=4), gmap)
sS, FS = geo["S"]
chk("S (the wire bends at O): the flux is constant all period - zero current", max(FS) - min(FS) < 1e-3, (min(FS), max(FS)))
sQ = geo["Q"][0]
chk("Q: two pulses one way, then two the other, each T/6 long, with T/6 gaps", all(abs(abs(v) / max(map(abs, sQ)) - t) < 0.05 for v, t in zip(sQ, [1, 0, 1, 1, 0, 1])), sQ)
cx, _ = current_sixths(CROSS)
ck, cd = classify(cx)
edge = 0.5 * math.pi / 180                         # one sector edge crossing the boundary: dA/dphi = r^2/2 per radian
chk("control: S as a crossing figure-8 (opposite senses) gives pulses of twice one edge's rate (they add), matching no List-II graph",
    abs(max(map(abs, cx)) / edge - 2) < 0.02 and cd > 0.5, (cx, ck, cd))
chk("the two routes agree loop by loop", gmap == sym_map)

# ------------------------------------------------------------------ the options
mp = gmap
hits = [k for k, v in OPTS.items() if v == mp]
chk("the match P3 Q2 R1 S4 is option (C), and only (C)", hits == ["C"], hits)
for k in "ABD":
    wrong = [c for c in "PQRS" if OPTS[k][c] != mp[c]]
    chk("option (%s) fails on %s" % (k, ", ".join(wrong)), len(wrong) > 0)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + "\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(), a: ['P','Q','R','S'].map(function(c){ return [0, 45, 90, 180, 270].map(function(f){ return ENGINE.areaIn(c, f); }); })}));"
        o = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(o.stdout)
        except ValueError:
            res = {}
        q = res.get("q", {})
        chk("page engine: answer 'C', map P3 Q2 R1 S4", q.get("answer") == "C" and q.get("map") == mp, o.stderr[:200] or q)
        want = [[sum(overlap_deg(a, b, f) for a, b in SECT[c]) / 360 * math.pi for f in (0, 45, 90, 180, 270)] for c in "PQRS"]
        got = res.get("a", [])
        chk("page engine: area in the field (r = 1) at 0, 45, 90, 180, 270 deg equals the sector overlap for every loop",
            len(got) == 4 and all(abs(a - b) < 1e-9 for ra, rb in zip(got, want) for a, b in zip(ra, rb)), got)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("P -> (3), Q -> (2), R -> (1), S -> (4)  ->  ANSWER C")
print("official key (read last): C -", "agrees" if hits == ["C"] else "DISAGREES")
print("MathonGo solution (their Q31 = Physics Q.15, read first for the approach): C -", "agrees" if hits == ["C"] else "DISAGREES",
      "(their S argument - opposite-sense lobes cancelling - is not used: opposite senses would add; see the control)")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
