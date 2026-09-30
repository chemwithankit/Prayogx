#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q04 - a double convex lens (n = 1.5, R = 20 cm each) immersed in a liquid of index n_L:
the plot of its power (D) against n_L.

The official key accepts "A or B". The two options are the two standard definitions of the power of a
lens in a medium: 1/f (the lens-maker's formula in the liquid - a hyperbola, option A) and the optical
power n_L/f (the sum of the surface powers - a straight line, option B).

Solved here before the key, by routes that share no code:
  1. sympy: the surface powers (n2 - n1)/R added, and the lens-maker's formula, symbolically;
  2. an exact Snell's-law ray trace (numpy, no paraxial formula) through a real biconvex lens with two
     spherical surfaces, for a thin lens and a vanishing ray height - the focal length measured where the
     traced ray crosses the axis;
  3. paraxial matrix (ABCD) optics with the reduced-angle convention (a third formalism);
then the shape of each quantity over n_L in [1, 2] is compared with the four printed plots, and the page's
engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq04.py
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
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q04", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


NG, R = 1.5, 0.20                                               # glass index; |R| in metres
# the printed plots, read from the paper: values at n_L = 1.0 and 2.0, zero crossing, straight or not;
# C and D diverge at n_L = 1.5 (C: positive before, D: negative before)
PLOTS = {"A": dict(finite=True, at1=5.0, zero=1.5, at2=-2.5, straight=False),
         "B": dict(finite=True, at1=5.0, zero=1.5, at2=-5.0, straight=True),
         "C": dict(finite=False, before=+1),
         "D": dict(finite=False, before=-1)}


def shape(fn):
    n = np.linspace(1.0, 2.0, 401)
    p = np.array([fn(x) for x in n], dtype=float)
    finite = bool(np.all(np.isfinite(p)) and np.max(np.abs(np.diff(p))) < 1.0)
    lin = p[0] + (p[-1] - p[0]) * (n - 1.0)
    zero = None
    for i in range(1, len(n)):
        if p[i - 1] > 0 >= p[i]:
            zero = n[i - 1] + (n[i] - n[i - 1]) * p[i - 1] / (p[i - 1] - p[i])
            break
    return dict(finite=finite, at1=p[0], at2=p[-1], zero=zero, straight=bool(np.max(np.abs(p - lin)) < 0.02), before=1 if p[0] > 0 else -1)


def which(ft):
    out = []
    for k, o in PLOTS.items():
        if not o["finite"]:
            if not ft["finite"] and ft["before"] == o["before"]:
                out.append(k)
        elif ft["finite"] and abs(ft["at1"] - o["at1"]) <= 0.25 and ft["zero"] is not None and abs(ft["zero"] - 1.5) <= 0.02 \
                and abs(ft["at2"] - o["at2"]) <= 0.25 and ft["straight"] == o["straight"]:
            out.append(k)
    return out


# ------------------------------------------------------------------ 1. sympy
nL, ng, r = sp.symbols("n_L n_g R", positive=True)
R1, R2 = r, -r
surf = lambda n1, n2, Rs: (n2 - n1) / Rs
phi = sp.simplify(surf(nL, ng, R1) + surf(ng, nL, R2))                       # optical power: surfaces added
invf = sp.simplify((ng / nL - 1) * (1 / R1 - 1 / R2))                        # lens-maker's formula in the liquid
chk("sympy: optical power = 2(n_g - n_L)/R", sp.simplify(phi - 2 * (ng - nL) / r) == 0, phi)
chk("sympy: lens-maker 1/f = optical power / n_L (the two definitions differ by the factor n_L)", sp.simplify(invf - phi / nL) == 0)
sub = {ng: sp.Rational(3, 2), r: sp.Rational(1, 5)}
P1 = sp.simplify(invf.subs(sub))
P2 = sp.simplify(phi.subs(sub))
chk("sympy: 1/f = 15/n_L - 10 D", sp.simplify(P1 - (15 / nL - 10)) == 0, P1)
chk("sympy: n_L/f = 15 - 10 n_L D", sp.simplify(P2 - (15 - 10 * nL)) == 0, P2)
chk("sympy: 1/f at n_L = 1, 1.5, 2: 5, 0, -5/2 D", [P1.subs(nL, v) for v in (1, sp.Rational(3, 2), 2)] == [5, 0, sp.Rational(-5, 2)])
chk("sympy: n_L/f at n_L = 1, 1.5, 2: 5, 0, -5 D", [P2.subs(nL, v) for v in (1, sp.Rational(3, 2), 2)] == [5, 0, -5])
chk("sympy: 1/f is convex (second derivative 30/n_L^3 > 0), n_L/f is linear",
    sp.simplify(sp.diff(P1, nL, 2) - 30 / nL**3) == 0 and sp.diff(P2, nL, 2) == 0)
fA = lambda x: float(P1.subs(nL, x))
fB = lambda x: float(P2.subs(nL, x))
hitsA, hitsB = which(shape(fA)), which(shape(fB))
chk("1/f matches exactly one printed plot: (A)", hitsA == ["A"], hitsA)
chk("n_L/f matches exactly one printed plot: (B)", hitsB == ["B"], hitsB)
answer = " or ".join(sorted(set(hitsA + hitsB)))
chk("together: A or B - the official key", answer == "A or B", answer)


# ------------------------------------------------------------------ 2. exact Snell ray trace
def refract(d, nrm, n1, n2):
    """unit direction d crossing a surface with unit normal nrm (pointing back towards the incoming side)."""
    cosi = -np.dot(nrm, d)
    eta = n1 / n2
    k = 1 - eta**2 * (1 - cosi**2)
    return eta * d + (eta * cosi - math.sqrt(k)) * nrm


def sphere_hit(p, d, c, rad, front):
    oc = p - c
    b = np.dot(oc, d)
    q = np.dot(oc, oc) - rad * rad
    disc = b * b - q
    t = -b - math.sqrt(disc) if front else -b + math.sqrt(disc)
    return p + t * d


def traced_f(n_l, t=1e-4, h=1e-5):
    """focal length (m, measured in the liquid from the lens centre) of a biconvex lens of centre thickness t,
    from one exact ray at height h; the lens sits at x = 0, light travels +x."""
    c1 = np.array([-t / 2 + R, 0.0])                 # centre of the first surface (R1 = +R)
    c2 = np.array([t / 2 - R, 0.0])                  # centre of the second surface (R2 = -R)
    p = np.array([-1.0, h]); d = np.array([1.0, 0.0])
    p1 = sphere_hit(p, d, c1, R, True)
    n1v = (p1 - c1) / R                               # outward normal of the first sphere points left here
    d1 = refract(d, n1v, n_l, NG)
    p2 = sphere_hit(p1, d1, c2, R, False)
    n2v = -(p2 - c2) / R
    d2 = refract(d1, n2v, NG, n_l)
    if abs(d2[1]) < 1e-15:
        return math.inf
    s = -p2[1] / d2[1]
    return p2[0] + s * d2[0]                          # axis crossing (negative: virtual, diverging)


grid = [1.0, 1.1, 1.2, 1.33, 1.4, 1.45, 1.55, 1.6, 1.8, 2.0]
worst = 0.0
for x in grid:
    f = traced_f(x)
    worst = max(worst, abs(1 / f - fA(x)), abs(x / f - fB(x)))
chk("Snell ray trace: 1/f and n_L/f from the traced focus agree with the formulas (10 liquids, 1.0 to 2.0)", worst < 1e-3, worst)
chk("Snell ray trace: in air f = +20 cm, in water f = +78.2 cm (converging)", abs(traced_f(1.0) - 0.20) < 1e-4 and abs(traced_f(1.33) - 0.7824) < 2e-3,
    (traced_f(1.0), traced_f(1.33)))
chk("Snell ray trace: at n_L = 2.0 the ray diverges from a virtual focus 40 cm before the lens", abs(traced_f(2.0) + 0.40) < 1e-3, traced_f(2.0))
p = np.array([-1.0, 1e-3]); d = np.array([1.0, 0.0])
c1 = np.array([R, 0.0])
d_match = refract(d, (sphere_hit(p, d, c1, R, True) - c1) / R, 1.5, 1.5)
chk("Snell ray trace: at n_L = 1.5 the ray is not bent at all (the lens vanishes)", np.allclose(d_match, d, atol=1e-15))
shA = shape(lambda x: 1 / traced_f(x) if abs(x - 1.5) > 1e-9 else 0.0)
shB = shape(lambda x: x / traced_f(x) if abs(x - 1.5) > 1e-9 else 0.0)
chk("Snell ray trace: the traced 1/f matches plot (A), the traced n_L/f plot (B)", which(shA) == ["A"] and which(shB) == ["B"], (which(shA), which(shB)))


# ------------------------------------------------------------------ 3. ABCD matrices (reduced angles)
def abcd_power(n_l):
    """system matrix of refraction - translation (0) - refraction, reduced angles n*u; returns -C (the optical power)."""
    Rf = lambda n1, n2, Rs: np.array([[1, 0], [-(n2 - n1) / Rs, 1]])
    M = Rf(NG, n_l, -R) @ Rf(n_l, NG, R)
    return -M[1, 0]


chk("ABCD: the system power equals n_L/f = 15 - 10 n_L at every liquid", max(abs(abcd_power(x) - fB(x)) for x in grid) < 1e-12)
chk("ABCD: and its effective focal length in the liquid gives 1/f = power / n_L", max(abs(abcd_power(x) / x - fA(x)) for x in grid) < 1e-12)

# ------------------------------------------------------------------ the other printed plots
chk("C and D diverge at n_L = 1.5; the power is finite (zero) there under both definitions - both out",
    fA(1.5) == 0 and fB(1.5) == 0 and "C" not in hitsA + hitsB and "D" not in hitsA + hitsB)
fcm = lambda x: 100 / fA(x) if abs(x - 1.5) > 1e-12 else math.inf
chk("the focal length is what diverges at 1.5 (f -> +inf from below, -inf from above)", fcm(1.4999) > 1e5 and fcm(1.5001) < -1e5)
chk("D is also negative in air, where a double convex lens converges (5 D) - wrong sign", PLOTS["D"]["before"] < 0 < fA(1.0))
chk("water values: f = 78.2 cm, 1/f = 1.28 D, n_L/f = 1.70 D (as printed on the page)",
    abs(fcm(1.33) - 78.24) < 0.05 and abs(fA(1.33) - 1.278) < 1e-3 and abs(fB(1.33) - 1.70) < 1e-12)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + ("\nvar g = []; for (var i = 0; i <= 20; i++){ var x = 1 + i / 20; g.push([x, ENGINE.invf(x), ENGINE.optical(x), ENGINE.fcm(x)]); }"
                             "\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(), g: g, fm: ENGINE.fcm(1.5) === Infinity}));")
        out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(out.stdout)
        except ValueError:
            res = {}
        q = res.get("q", {})
        chk("page engine: answer 'A or B' (1/f -> A, n_L/f -> B)", q.get("answer") == "A or B" and q.get("invfHits") == ["A"] and q.get("opticalHits") == ["B"],
            out.stderr[:200] or q)
        chk("page engine: 1/f and n_L/f equal the formulas at 21 liquids", all(abs(a - fA(x)) < 1e-12 and abs(b - fB(x)) < 1e-12 for x, a, b, _ in res.get("g", [])) and len(res.get("g", [])) == 21)
        chk("page engine: f in cm, infinite at 1.5", all((c is None and abs(x - 1.5) < 1e-9) or (c is not None and abs(c - fcm(x)) < 1e-9) for x, _, _, c in res.get("g", [])) and res.get("fm") is True)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("1/f -> %s ; n_L/f -> %s  ->  ANSWER  %s" % (hitsA, hitsB, answer))
print("official key (read last): A or B -", "agrees" if answer == "A or B" else "DISAGREES")
print("MathonGo solution (their Q20 = Physics Q.4): A, using 1/f -", "contained in it" if "A" in hitsA else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
