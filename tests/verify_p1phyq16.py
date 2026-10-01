#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q16 - four planar frames of uniform rods (each of mass m and length l) and their moments of
inertia about an axis OCO' in the plane of each frame; match List-I to List-II: (1) 5/4 (2) 1/6 (3) 1/12 (4) 2/3
(5) 1/3, in ml^2.

The frames, read from the figures: (P) rods CA and CB at right angles, the axis through C at 45 deg to each;
(Q) an equilateral triangle, the axis through the vertex C parallel to AB; (R) a square, the axis along the
diagonal CA; (S) rods CA and CB at 30 deg either side of the axis through C.

The MathonGo solution was read first only for the approach. Solved here by routes that share no code with the page:
  1. sympy: each rod as the exact integral of (m/l)(s sin theta)^2 ds (one end on the axis) or m d^2 (parallel);
  2. the parallel-axis theorem through each rod's centre: (ml^2/12) sin^2 theta + m d_cm^2;
  3. the full inertia tensor of each frame built as point masses in 3-D, the axis turned to a random direction,
     I = n . I_tensor . n;
  4. a rigid-body spin-up from rest under a constant torque (RK4): I = tau / alpha;
  5. every option audited;
then the page's engine is run in Node (its rods, I, classification, spin-up and answer).

Run:  tests/.venv/bin/python tests/verify_p1phyq16.py
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
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q16", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    detail = str(detail)
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + detail))


LIST2 = {1: sp.Rational(5, 4), 2: sp.Rational(1, 6), 3: sp.Rational(1, 12), 4: sp.Rational(2, 3), 5: sp.Rational(1, 3)}
OPTS = {"A": dict(P=5, Q=1, R=4, S=2), "B": dict(P=1, Q=3, R=4, S=2), "C": dict(P=5, Q=3, R=2, S=1), "D": dict(P=5, Q=4, R=2, S=1)}

# ------------------------------------------------------------------ the frames, in the figure's own coordinates
# Each frame drawn as in the paper (x right, y up), with the axis as a point and a direction. l = 1.
s3 = sp.sqrt(3)
FIG = {
    # P: C at the origin, A straight down, B to the right; the axis from O (lower left) to O' (upper right) at 45 deg
    "P": dict(pts={"C": (0, 0), "A": (0, -1), "B": (1, 0)}, rods=[("C", "A"), ("C", "B")], axis=(1, 1)),
    # Q: C at the top, AB below and parallel to the horizontal axis
    "Q": dict(pts={"C": (0, 0), "A": (-sp.Rational(1, 2), -s3 / 2), "B": (sp.Rational(1, 2), -s3 / 2)}, rods=[("C", "A"), ("C", "B"), ("A", "B")], axis=(1, 0)),
    # R: a square standing on A, C at the top; the axis vertical along CA
    "R": dict(pts={"C": (0, 0), "B": (1 / sp.sqrt(2), -1 / sp.sqrt(2)), "A": (0, -sp.sqrt(2)), "D": (-1 / sp.sqrt(2), -1 / sp.sqrt(2))},
              rods=[("C", "B"), ("B", "A"), ("A", "D"), ("D", "C")], axis=(0, 1)),
    # S: C at the top, the rods 30 deg either side of the vertical axis
    "S": dict(pts={"C": (0, 0), "A": (-sp.Rational(1, 2), -s3 / 2), "B": (sp.Rational(1, 2), -s3 / 2)}, rods=[("C", "A"), ("C", "B")], axis=(0, 1)),
}


def vec(p):
    return sp.Matrix([p[0], p[1]])


def unit(a):
    v = sp.Matrix(a)
    return v / sp.sqrt(v.dot(v))


# the figures: every rod has length l, and the angles are as printed
lengths = {c: [sp.nsimplify(sp.sqrt((vec(f["pts"][a]) - vec(f["pts"][b])).dot(vec(f["pts"][a]) - vec(f["pts"][b])))) for a, b in f["rods"]] for c, f in FIG.items()}
chk("every rod of every frame has length l", all(v == 1 for L in lengths.values() for v in L), lengths)


def ang(c, a, b):
    """angle (deg) between rod a-b and the axis line"""
    d = vec(FIG[c]["pts"][b]) - vec(FIG[c]["pts"][a])
    cosv = abs(d.dot(unit(FIG[c]["axis"]))) / sp.sqrt(d.dot(d))
    return sp.nsimplify(sp.acos(cosv) * 180 / sp.pi)


chk("the angles of the figures: P 45/45, Q 60/60 with AB parallel, R all four sides 45, S 30/30, P and R corners 90",
    [ang("P", "C", "A"), ang("P", "C", "B")] == [45, 45] and [ang("Q", "C", "A"), ang("Q", "C", "B"), ang("Q", "A", "B")] == [60, 60, 0]
    and all(ang("R", a, b) == 45 for a, b in FIG["R"]["rods"]) and [ang("S", "C", "A"), ang("S", "C", "B")] == [30, 30]
    and (vec(FIG["P"]["pts"]["A"]) - vec(FIG["P"]["pts"]["C"])).dot(vec(FIG["P"]["pts"]["B"]) - vec(FIG["P"]["pts"]["C"])) == 0
    and (vec(FIG["R"]["pts"]["B"]) - vec(FIG["R"]["pts"]["C"])).dot(vec(FIG["R"]["pts"]["D"]) - vec(FIG["R"]["pts"]["C"])) == 0)


def dist(c, p):
    """perpendicular distance of a point from the axis through C"""
    n = unit(FIG[c]["axis"])
    v = vec(p)
    return sp.sqrt(sp.simplify(v.dot(v) - v.dot(n) ** 2))


# ------------------------------------------------------------------ 1. the exact rod integral
s = sp.symbols("s", nonnegative=True)
I1 = {}
for c, f in FIG.items():
    tot = 0
    for a, b in f["rods"]:
        pa, pb = vec(f["pts"][a]), vec(f["pts"][b])
        pt = pa + s * (pb - pa)                                     # s from 0 to 1 along the rod, mass density m/l = 1
        n = unit(f["axis"])
        r2 = sp.simplify(pt.dot(pt) - pt.dot(n) ** 2)              # perpendicular distance squared
        tot += sp.integrate(r2, (s, 0, 1))
    I1[c] = sp.nsimplify(sp.simplify(tot))
chk("sympy integral: P = ml^2/3, Q = 5ml^2/4, R = 2ml^2/3, S = ml^2/6", I1 == {"P": sp.Rational(1, 3), "Q": sp.Rational(5, 4), "R": sp.Rational(2, 3), "S": sp.Rational(1, 6)}, I1)

# ------------------------------------------------------------------ 2. through each rod's centre (parallel axis)
I2 = {}
for c, f in FIG.items():
    tot = 0
    for a, b in f["rods"]:
        th = ang(c, a, b) * sp.pi / 180
        mid = (vec(f["pts"][a]) + vec(f["pts"][b])) / 2
        tot += sp.Rational(1, 12) * sp.sin(th) ** 2 + dist(c, mid) ** 2
    I2[c] = sp.nsimplify(sp.simplify(tot))
chk("parallel-axis route through each rod's centre agrees with the integral", I2 == I1, I2)

# ------------------------------------------------------------------ 3. the inertia tensor in 3-D, axis in a random direction
rng = np.random.default_rng(16)


def rot():
    q, _ = np.linalg.qr(rng.standard_normal((3, 3)))
    return q * np.sign(np.linalg.det(q))


I3 = {}
for c, f in FIG.items():
    Rm = rot()
    pts = []
    for a, b in f["rods"]:
        pa, pb = np.array([float(x) for x in f["pts"][a]] + [0.0]), np.array([float(x) for x in f["pts"][b]] + [0.0])
        N = 4000
        for k in range(N):                                         # midpoint rule, mass 1/N each
            pts.append(pa + (k + 0.5) / N * (pb - pa))
    P3 = np.array(pts) @ Rm.T
    T = np.zeros((3, 3))
    for r in P3:
        T += (r @ r * np.eye(3) - np.outer(r, r)) / 4000
    n = Rm @ np.array([float(FIG[c]["axis"][0]), float(FIG[c]["axis"][1]), 0.0])
    n /= np.linalg.norm(n)
    I3[c] = float(n @ T @ n)
chk("inertia tensor, frames turned to a random orientation: n.I.n equals the exact values to 1e-6",
    all(abs(I3[c] - float(I1[c])) < 1e-6 for c in I1), {c: round(v, 7) for c, v in I3.items()})

# ------------------------------------------------------------------ 4. a rigid-body spin-up under a constant torque
tau = 0.5


def spin(I, T=3.0, dt=1e-3):
    y = np.array([0.0, 0.0])                                         # phi, omega

    def f(y):
        return np.array([y[1], tau / I])
    t = 0.0
    while t < T - 1e-12:
        k1 = f(y); k2 = f(y + dt / 2 * k1); k3 = f(y + dt / 2 * k2); k4 = f(y + dt * k3)
        y = y + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        t += dt
    alpha = 2 * y[0] / t ** 2                                        # from the angle turned, phi = alpha t^2 / 2
    return tau / alpha


I4 = {c: spin(float(v)) for c, v in I1.items()}
chk("spin-up: I = tau / alpha recovered from the angle turned in 3 s, for every frame", all(abs(I4[c] - float(I1[c])) < 1e-9 for c in I1), I4)
chk("the heaviest frame to turn (Q) spins up slowest, the lightest (S) fastest: alpha ratio Q:S = 2/15", abs((tau / I4["Q"]) / (tau / I4["S"]) - 2 / 15) < 1e-9)

# ------------------------------------------------------------------ the match and the options
mp = {c: next(k for k, v in LIST2.items() if v == I1[c]) for c in I1}
chk("each frame equals one List-II entry: P 5, Q 1, R 4, S 2", mp == dict(P=5, Q=1, R=4, S=2), mp)
chk("value (3), ml^2/12, belongs to no frame", sp.Rational(1, 12) not in I1.values())
hits = [k for k, v in OPTS.items() if v == mp]
chk("the match P5 Q1 R4 S2 is option (A), and only (A)", hits == ["A"], hits)
for k in "BCD":
    wrong = [c for c in "PQRS" if OPTS[k][c] != mp[c]]
    chk("option (%s) fails on %s" % (k, ", ".join(wrong)), len(wrong) > 0)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + ("\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(), len: ENGINE.CFGS.map(function(c){ return ENGINE.FRAMES[c].rods.map(function(r){ return ENGINE.rodLen(c, r); }); }),"
                             " spin: ENGINE.CFGS.map(function(c){ return ENGINE.spinUp(c, 3, 1 / 240).I; })}));")
        o = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(o.stdout)
        except ValueError:
            res = {}
        q = res.get("q", {})
        chk("page engine: answer 'A', map P5 Q1 R4 S2", q.get("answer") == "A" and q.get("map") == mp, o.stderr[:200] or q)
        chk("page engine: I equals the exact value for every frame (to 1e-12)", all(abs(q.get("I", {}).get(c, 9) - float(I1[c])) < 1e-12 for c in I1), q.get("I"))
        chk("page engine: every rod has length 1", all(abs(x - 1) < 1e-12 for L in res.get("len", [[9]]) for x in L), res.get("len"))
        chk("page engine: its spin-up gives back I = tau / alpha", all(abs(a - float(I1[c])) < 1e-9 for a, c in zip(res.get("spin", []), "PQRS")) and len(res.get("spin", [])) == 4, res.get("spin"))
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("P -> (5) ml^2/3, Q -> (1) 5ml^2/4, R -> (4) 2ml^2/3, S -> (2) ml^2/6  ->  ANSWER A")
print("official key (read last): A -", "agrees" if hits == ["A"] else "DISAGREES")
print("MathonGo solution (their Q32 = Physics Q.16, read first for the approach): A -", "agrees" if hits == ["A"] else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
