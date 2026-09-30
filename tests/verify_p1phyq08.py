#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q08 - the EM wave E = E0 sin(3y + 4z + wt) i-hat in vacuum: direction of travel, |k|,
omega and the magnetic field.

Solved here before the key, by routes that share no code:
  1. sympy: Maxwell's equations applied to the given field - the wave equation fixes w = c|k|, Faraday's
     law gives B, and div E = div B = 0; the direction from a surface of constant phase;
  2. numerics (numpy): a crest followed in time (root of the phase), the wavelength from successive maxima
     along the travel direction, the curl of E by finite differences and B by integrating dB/dt in time;
  3. the Poynting vector E x B / mu0 averaged over a period points along the travel direction;
then every statement is decided and the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq08.py
"""
import json
import math
import os
import re
import subprocess
import sys

import numpy as np
import sympy as sp
from scipy.optimize import brentq

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q08", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


C = 3e8
# ------------------------------------------------------------------ 1. sympy + Maxwell
x, y, z, t, w, E0, c = sp.symbols("x y z t omega E_0 c", positive=True)
Ex = E0 * sp.sin(3 * y + 4 * z + w * t)
E = sp.Matrix([Ex, 0, 0])
curl = lambda F: sp.Matrix([sp.diff(F[2], y) - sp.diff(F[1], z), sp.diff(F[0], z) - sp.diff(F[2], x), sp.diff(F[1], x) - sp.diff(F[0], y)])
lap = sum(sp.diff(Ex, v, 2) for v in (x, y, z))
wsol = sp.solve(sp.Eq(sp.simplify(lap / Ex), sp.simplify(sp.diff(Ex, t, 2) / Ex) / c**2), w)     # -25 = -w^2/c^2
chk("sympy: the wave equation gives w = c|k| = 5c", wsol == [5 * c], wsol)
wq = 5 * c
Bfield = sp.integrate(-curl(E), t).subs(w, wq)                          # Faraday: dB/dt = -curl E
Bexp = (E0 / c) * sp.sin(3 * y + 4 * z + wq * t) * sp.Matrix([0, -sp.Rational(4, 5), sp.Rational(3, 5)])
chk("sympy (Faraday): B = (E0/c) sin(...)(-4j + 3k)/5", sp.simplify(Bfield - Bexp) == sp.zeros(3, 1), Bfield.T)
chk("sympy: Ampere-Maxwell holds too - curl B = (1/c^2) dE/dt", sp.simplify(curl(Bexp) - sp.diff(E, t).subs(w, wq) / c**2) == sp.zeros(3, 1))
chk("sympy: div E = div B = 0 (transverse wave)", sp.diff(Ex, x) == 0 and sp.simplify(sum(sp.diff(Bexp[i], v) for i, v in enumerate((x, y, z)))) == 0)
Dopt = (E0 / c) * sp.sin(3 * y + 4 * z + wq * t) * sp.Matrix([0, 4, -3])
chk("sympy (D): the option's B is -5 times the true B (wrong sign and 5x too large)", sp.simplify(Dopt + 5 * Bexp) == sp.zeros(3, 1))
kmag = sp.sqrt(3**2 + 4**2)
chk("sympy (B): |k| = 5, not 0.5", kmag == 5)
chk("sympy (C): w = c|k| = 1.5e9 rad/s", float((5 * c).subs(c, C)) == 1.5e9)
s_ = sp.symbols("s")
dirv = sp.Matrix([0, -sp.Rational(3, 5), -sp.Rational(4, 5)])
phase_along = (3 * (y + dirv[1] * s_) + 4 * (z + dirv[2] * s_) + wq * t)
chk("sympy (A): moving along -(3j + 4k)/5 at speed c keeps the phase constant", sp.simplify(phase_along.subs(s_, c * t) - (3 * y + 4 * z)) == 0)
sym_ans = ["A", "C"]

# ------------------------------------------------------------------ 2. numerics
W = 5 * C
phase = lambda r, tt: 3 * r[1] + 4 * r[2] + W * tt


def crest_on_ray(tt, u):
    """the point s*u on the ray along u where the phase is pi/2 (first root with s > -3)."""
    f = lambda s: phase(np.array(u) * s, tt) - math.pi / 2
    return brentq(f, -3, 3)


u = np.array([0, 0.6, 0.8])
dt = 1e-10
s0, s1 = crest_on_ray(0, u), crest_on_ray(dt, u)
vel = (s1 - s0) * u / dt
spd = np.linalg.norm(vel)
chk("numerics (A): a followed crest moves along (0, -0.6, -0.8)", np.allclose(vel / spd, [0, -0.6, -0.8], atol=1e-9), vel / spd)
chk("numerics: ...at c = 3e8 m/s", abs(spd - C) < 1e-3 * C, spd)
d = np.array([0, -0.6, -0.8]); ss = np.linspace(0, 3, 300001); vals = np.sin([phase(d * s, 0) for s in ss])
peaks = [ss[i] for i in range(1, len(ss) - 1) if vals[i] > vals[i - 1] and vals[i] >= vals[i + 1]]
lam = peaks[1] - peaks[0]
chk("numerics (B): successive crests 1.2566 m apart -> |k| = 2 pi/lambda = 5.000 m^-1", abs(lam - 2 * math.pi / 5) < 2e-5 and abs(2 * math.pi / lam - 5) < 1e-3, lam)
h = 1e-6
Exf = lambda r, tt: math.sin(phase(r, tt))
r0 = np.array([0.0, 0.3, -0.2])
dEdz = (Exf(r0 + [0, 0, h], 0) - Exf(r0 - [0, 0, h], 0)) / (2 * h)
dEdy = (Exf(r0 + [0, h, 0], 0) - Exf(r0 - [0, h, 0], 0)) / (2 * h)
curlE = np.array([0.0, dEdz, -dEdy])
ts = np.linspace(0, 2 * math.pi / W, 2001)                              # integrate dB/dt = -curl E over a period at r0
Bt = np.zeros(3); Bs = []
for i in range(len(ts)):
    if i:
        dtt = ts[i] - ts[i - 1]; mid = 0.5 * (ts[i] + ts[i - 1])
        cz = (Exf(r0 + [0, 0, h], mid) - Exf(r0 - [0, 0, h], mid)) / (2 * h); cy = (Exf(r0 + [0, h, 0], mid) - Exf(r0 - [0, h, 0], mid)) / (2 * h)
        Bt = Bt - np.array([0.0, cz, -cy]) * dtt
    Bs.append(Bt.copy())
Bs = np.array(Bs)
B_amp = (Bs.max(axis=0) - Bs.min(axis=0)) / 2 * C                      # c|B| / E0 per component
chk("numerics (Faraday): c|B_y| = 0.8 E0, c|B_z| = 0.6 E0 - |B| = E0/c", abs(B_amp[1] - 0.8) < 1e-3 and abs(B_amp[2] - 0.6) < 1e-3 and abs(B_amp[0]) < 1e-9, B_amp)
Bdir = Bs[500] - Bs[0]
chk("numerics: B is along +-(-4j + 3k)/5 - perpendicular to E and to the travel", abs(np.dot(Bdir, [1, 0, 0])) < 1e-12 and abs(np.dot(Bdir, d)) < 1e-9 * np.linalg.norm(Bdir))

# ------------------------------------------------------------------ 3. Poynting vector
Sav = np.zeros(3)
for tt in np.linspace(0, 2 * math.pi / W, 400, endpoint=False):
    e = np.array([math.sin(phase(r0, tt)), 0, 0]); b = math.sin(phase(r0, tt)) * np.array([0, -0.8, 0.6]) / C
    Sav += np.cross(e, b)
Sav /= np.linalg.norm(Sav)
chk("Poynting: <E x B> points along -(3j + 4k)/5, the direction of travel", np.allclose(Sav, d, atol=1e-12), Sav)
bD = np.array([0, 4, -3]) / C
chk("Poynting with option (D)'s B points backwards, against the travel - so (D) cannot be right", np.dot(np.cross([1, 0, 0], bD), d) < 0)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + "\nprocess.stdout.write(JSON.stringify(ENGINE.run()));"
        out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            q = json.loads(out.stdout)
        except ValueError:
            q = {}
        chk("page engine: answer '(A), (C)'", q.get("answer") == "(A), (C)", out.stderr[:200] or q)
        chk("page engine: direction (0, -0.6, -0.8) at c; |k| = 5; w = 1.5e9", np.allclose(q.get("dir", [9, 9, 9]), [0, -0.6, -0.8], atol=1e-9) and abs(q.get("speed", 0) - C) < 1 and q.get("k") == 5 and q.get("w") == 1.5e9)
        chk("page engine: its measured wavelength is 2 pi/5 m", abs(q.get("lambda", 0) - 2 * math.pi / 5) < 1e-6, q.get("lambda"))
        chk("page engine: its Faraday B amplitude is (E0/c)(0, -0.8, 0.6)", np.allclose(np.array(q.get("B", [9, 9, 9])) * C, [0, -0.8, 0.6], atol=1e-6), q.get("B"))
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("A true (against k) · B false (|k| = 5) · C true (w = c|k|) · D false (B is -1/5 of it)  ->  ANSWER  %s" % ", ".join(sym_ans))
print("official key (read last): AC -", "agrees" if sym_ans == ["A", "C"] else "DISAGREES")
print("MathonGo solution (their Q24 = Physics Q.8): (A), (C) -", "agrees" if sym_ans == ["A", "C"] else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
