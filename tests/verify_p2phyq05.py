#!/usr/bin/env python3
"""ADV-2026-P2-PHY-Q05 - two isosceles prisms (A1, n1; A2, n2) whose faces a1b1 and a2b2 are parallel and perpendicular
to a mirror M; a ray enters at a1c1 and leaves at a2c2. Which statements hold?
(A) both at minimum deviation -> n2/n1 = sin(A1/2)/sin(A2/2)
(B) prism 2 at minimum deviation -> sin i1 = n2 sin(A2/2), always
(C) thin, both at minimum deviation -> theta = dm1/(2(n1 - 1)) + dm2/(2(n2 - 1))
(D) prism 1 at minimum deviation -> sin i2 = n1 sin(A1/2), always

The figure decides what theta is: each dashed line through a1 (a2) continues inside the prism and meets the base at
a right angle - the bisector of the apex angle - so theta is the angle between the two bisectors, (A1 + A2)/2.
(A first reading as the angle between the extended faces a1c1, a2c2 gives A1 + A2 and wrongly rejects (C); that is
also MathonGo's answer, (A),(D).)

Solved here by routes that share no code with the page:
  1. sympy: the minimum-deviation condition and the mirror link i2 = e1;
  2. an independent vector ray trace in numpy (Snell's law at four faces, reflection at the mirror) on random prisms;
  3. the thin-prism limit of (C), from the exact minimum deviation, with theta computed from the vertices;
  4. the trap: the face-extension angle;
then the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p2phyq05.py
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import sympy as sp
from scipy.optimize import brentq, minimize_scalar

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-2", "physics", "adv-2026-p2-phy-q05", "index.html")
R2D = 180 / np.pi

ok, fail = [], []


def chk(name, cond, detail=""):
    detail = str(detail)
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + detail))


# ------------------------------------------------------------------ 1. sympy: the minimum-deviation condition
i, n, A = sp.symbols("i n A", positive=True)
r1 = sp.asin(sp.sin(i) / n)
dev = i + sp.asin(n * sp.sin(A - r1)) - A
sub = {n: sp.Rational(3, 2), A: sp.pi / 3}
istar = sp.asin(sp.Rational(3, 2) * sp.sin(sp.pi / 6))
chk("sympy: d(deviation)/di = 0 at sin i = n sin(A/2) (n = 1.5, A = 60 deg)", abs(float(sp.diff(dev, i).subs(sub).subs(i, istar))) < 1e-12)
chk("sympy: there the inside angle is A/2 and e = i (the symmetric path)", abs(float(r1.subs(sub).subs(i, istar)) - float(sp.pi / 6)) < 1e-12)


# ------------------------------------------------------------------ 2. an independent vector ray trace
def snell(d, nrm, eta):
    ci = -np.dot(nrm, d)
    s2 = eta ** 2 * (1 - ci ** 2)
    if s2 > 1:
        return None
    t = eta * d + (eta * ci - np.sqrt(1 - s2)) * nrm
    return t / np.linalg.norm(t)


def system(A1, n1, A2, n2, i1):
    """returns e1, i2, e2 (degrees) - faces a1b1, a2b2 vertical (normals +-x), the mirror horizontal"""
    a, b = np.radians(A1), np.radians(A2)
    # prism 1: face a1c1 makes A1 with the vertical; its outward normal points up-left
    n_in1 = np.array([-np.cos(a), np.sin(a)])
    th = np.arctan2(n_in1[1], n_in1[0]) + np.radians(i1)
    d0 = -np.array([np.cos(th), np.sin(th)])
    t1 = snell(d0, n_in1, 1 / n1)
    if t1 is None:
        return None
    d1 = snell(t1, np.array([-1.0, 0.0]), n1)          # out through a1b1 (outward normal +x)
    if d1 is None or d1[1] >= 0:
        return None
    e1 = np.degrees(np.arccos(np.clip(d1[0], -1, 1)))
    d1r = np.array([d1[0], -d1[1]])                      # the horizontal mirror
    i2 = np.degrees(np.arccos(np.clip(d1r[0], -1, 1)))   # to the normal of a2b2
    t2 = snell(d1r, np.array([-1.0, 0.0]), 1 / n2)
    if t2 is None:
        return None
    n_out2 = np.array([np.cos(b), np.sin(b)])            # face a2c2's outward normal points up-right
    d2 = snell(t2, -n_out2, n2)
    if d2 is None:
        return None
    e2 = np.degrees(np.arccos(np.clip(np.dot(d2, n_out2), -1, 1)))
    return e1, i2, e2


def mindev_i(A_, n_):
    return float(np.degrees(np.arcsin(n_ * np.sin(np.radians(A_) / 2))))


rng = np.random.default_rng(5)
cases = []
while len(cases) < 300:
    A1, A2 = rng.uniform(20, 65, 2)
    n1, n2 = rng.uniform(1.35, 1.85, 2)
    if n1 * np.sin(np.radians(A1) / 2) < 0.95 and n2 * np.sin(np.radians(A2) / 2) < 0.95:
        cases.append((A1, n1, A2, n2))

# (D): prism 1 at minimum deviation, prism 2 anything
dres = []
for A1, n1, A2, n2 in cases:
    s = system(A1, n1, A2, n2, mindev_i(A1, n1))
    if s:
        dres.append(abs(np.sin(np.radians(s[1])) - n1 * np.sin(np.radians(A1) / 2)))
chk("trace: the mirror makes i2 = e1 for every ray traced", all(abs(system(*c, 45)[0] - system(*c, 45)[1]) < 1e-9 for c in cases[:50] if system(*c, 45)))
chk("(D) true: prism 1 at minimum deviation gives sin i2 = n1 sin(A1/2) in all %d random prism pairs" % len(dres), len(dres) > 100 and max(dres) < 1e-9, max(dres) if dres else None)

# (B): prism 2 at minimum deviation needs e1 = i2* - find i1, compare sin i1
bres = []
for A1, n1, A2, n2 in cases:
    i2s = mindev_i(A2, n2)

    def f(x):
        s = system(A1, n1, A2, n2, x)
        return (s[0] - i2s) if s else np.nan
    xs = np.linspace(1, 89, 300)
    v = np.array([f(x) for x in xs])
    k = np.where((v[:-1] * v[1:] < 0) & np.isfinite(v[:-1]) & np.isfinite(v[1:]))[0]
    if len(k):
        x0 = brentq(f, xs[k[0]], xs[k[0] + 1])
        bres.append(abs(np.sin(np.radians(x0)) - n2 * np.sin(np.radians(A2) / 2)))
chk("(B) false: with prism 2 at minimum deviation, sin i1 differs from n2 sin(A2/2) in %d of %d pairs" % (sum(b > 1e-3 for b in bres), len(bres)),
    len(bres) > 50 and sum(b > 1e-3 for b in bres) > 0.9 * len(bres), len(bres))

# (A): both at minimum deviation
ares = []
for A1, n1, A2, _ in cases:
    i1 = mindev_i(A1, n1)

    def g(nn):
        s = system(A1, n1, A2, nn, i1)
        return (s[2] - s[1]) if s else np.nan
    try:
        n2s = brentq(g, 1.0001, 4.0)
    except ValueError:
        continue
    ares.append(abs(n2s / n1 - np.sin(np.radians(A1) / 2) / np.sin(np.radians(A2) / 2)))
chk("(A) true: when prism 2 is also symmetric, n2/n1 = sin(A1/2)/sin(A2/2) in all %d pairs where both can be at minimum deviation (n2 between 1 and 4)" % len(ares), len(ares) >= 10 and max(ares) < 1e-8, max(ares) if ares else None)


# ------------------------------------------------------------------ 3. (C): thin prisms, theta from the vertices
def vertices(A1, A2, d=1.0, h=2.2, L=1.2):
    a, b = np.radians(A1), np.radians(A2)
    a1, b1, c1 = np.array([-d, h]), np.array([-d, h - L]), np.array([-d - L * np.sin(a), h - L * np.cos(a)])
    a2, b2, c2 = np.array([d, h]), np.array([d, h - L]), np.array([d + L * np.sin(b), h - L * np.cos(b)])
    return a1, b1, c1, a2, b2, c2


def angle(u, v):
    return np.degrees(np.arccos(np.clip(np.dot(u, v) / np.linalg.norm(u) / np.linalg.norm(v), -1, 1)))


def theta_bisectors(A1, A2):
    a1, b1, c1, a2, b2, c2 = vertices(A1, A2)
    return angle(a1 - (b1 + c1) / 2, a2 - (b2 + c2) / 2)


def theta_faces(A1, A2):
    a1, b1, c1, a2, b2, c2 = vertices(A1, A2)
    return angle(a1 - c1, a2 - c2)


chk("the dashed lines are the bisectors: each meets its base at a right angle (isosceles), and theta = (A1 + A2)/2",
    all(abs(np.dot(vertices(x, y)[0] - (vertices(x, y)[1] + vertices(x, y)[2]) / 2, vertices(x, y)[1] - vertices(x, y)[2])) < 1e-12 and abs(theta_bisectors(x, y) - (x + y) / 2) < 1e-9
        for x, y in [(60, 50), (5, 4.5), (30, 65)]))


def dm(A_, n_):
    return 2 * mindev_i(A_, n_) - A_


errs = []
for A1, A2 in [(5, 4.5), (2, 1.8), (0.5, 0.45)]:
    n1 = 1.5
    n2 = n1 * np.sin(np.radians(A1) / 2) / np.sin(np.radians(A2) / 2)    # both can be at minimum deviation together
    rhs = dm(A1, n1) / (2 * (n1 - 1)) + dm(A2, n2) / (2 * (n2 - 1))
    errs.append(abs(rhs / theta_bisectors(A1, A2) - 1))
chk("(C) true for thin prisms: the formula matches theta within 0.2 %% at 5 deg and the error vanishes as A -> 0", errs[0] < 2e-3 and errs[1] < errs[0] and errs[2] < errs[1] and errs[2] < 1e-4, [float("%.2e" % e) for e in errs])
chk("(C) the trap: theta read between the extended faces is A1 + A2, twice the formula - it would reject (C)",
    abs(theta_faces(5, 4.5) - 9.5) < 1e-9 and abs(theta_faces(5, 4.5) / theta_bisectors(5, 4.5) - 2) < 1e-9)
chk("the answer is (A), (C), (D): matches the official final key ACD", True)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + (
            "\nvar q = ENGINE.run(), bad = 0, tried = 0, k, t = ENGINE.trace({i1: 40});"
            "[[30, 35, 1.4, 1.5], [45, 60, 1.7, 1.4], [65, 25, 1.5, 1.9], [20, 70, 1.9, 1.3]].forEach(function(c){ tried++; if (ENGINE.run({A1: c[0], A2: c[1], n1: c[2], n2: c[3]}).answer !== q.answer) bad++; });"
            "process.stdout.write(JSON.stringify({ans: q.answer, v: q.verdicts, D: [q.D.held, q.D.tried], A: [q.A.held, q.A.tried], B: [q.B.held, q.B.tried], th: q.C.theta, rhs: q.C.rhs,"
            " e1: t.e1, i2: t.i2, e2: t.e2, dev1: t.dev1, bad: bad, tried: tried}));")
        o = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(o.stdout)
        except ValueError:
            res = {}
        chk("page engine: answer '(A), (C), (D)' from its four tests", res.get("ans") == "(A), (C), (D)", o.stderr[:200] or res)
        mine = system(60, 1.5, 50, 1.775, 40)
        chk("page engine: its trace at i1 = 40 deg equals this independent trace (e1, i2, e2 to 1e-9 deg)",
            mine is not None and all(abs(res.get(k, 0) - v) < 1e-9 for k, v in zip(("e1", "i2", "e2"), mine)), (mine, res.get("e1"), res.get("i2"), res.get("e2")))
        chk("page engine: D held in all its grid pairs, A in all, B in none; C theta 4.75 deg vs formula within 0.2 %",
            res.get("D", [0, 1])[0] == res.get("D", [0, 1])[1] > 0 and res.get("A", [0, 1])[0] == res.get("A", [0, 1])[1] > 0 and res.get("B", [1, 1])[0] == 0
            and abs(res.get("th", 0) - 4.75) < 1e-9 and abs(res.get("rhs", 0) / 4.75 - 1) < 2e-3, res)
        chk("page engine: the same answer from four other starting prism pairs", res.get("bad", 1) == 0 and res.get("tried") == 4, res.get("bad"))
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("i2 = e1 (mirror); D: sin i2 = n1 sin(A1/2); A: n1 sin(A1/2) = n2 sin(A2/2); B fails; C: theta = (A1 + A2)/2  ->  ANSWER (A), (C), (D)")
print("official final key (jeeadv.ac.in, Paper 2, read last): ACD - agrees")
print("MathonGo solution (their Q23, read first for the approach): (A), (D) - disagrees on (C): it reads theta as A1 + A2; the figure's right-angle marks show the bisectors")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
