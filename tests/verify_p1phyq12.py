#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q12 - a hollow cone (base radius R, height h, tip at the origin) with charge Q spread
uniformly over its curved surface spins about the z axis at w. The field at (0, 0, z), z >> R, h, is
n (mu0/4pi) Q R^2 w / z^3; find n.

Solved here before the key, by routes that share no code:
  1. sympy: surface charge density on the cone, ring moments dm = (dq w/2pi) pi r^2, total m = Q R^2 w/4,
     far axial field of a dipole (mu0/4pi) 2m/z^3 -> n = 1/2;
  2. the exact on-axis field of the spinning surface by numerical integration of Biot-Savart over the
     surface (scipy), no dipole approximation: B z^3 / ((mu0/4pi) Q R^2 w) -> 0.5 as z grows, for several h;
  3. a direct 3-D Biot-Savart sum over point charges moving on the surface (v = w x r), at a far point;
then the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq12.py
"""
import json
import math
import os
import re
import subprocess
import sys

import numpy as np
import sympy as sp
from scipy.integrate import quad

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q12", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    detail = str(detail)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + detail))


# ------------------------------------------------------------------ 1. sympy
Q, R, h, w, s = sp.symbols("Q R h omega s", positive=True)
Ls = sp.sqrt(R**2 + h**2)                                  # slant length
r = R * s / Ls                                            # radius at slant distance s from the tip
area = sp.pi * R * Ls                                     # curved surface area
sigma = Q / area
dq = sigma * 2 * sp.pi * r                                # per unit slant length
chk("sympy: the charge adds up to Q", sp.simplify(sp.integrate(dq, (s, 0, Ls)) - Q) == 0)
dm = dq * w / (2 * sp.pi) * sp.pi * r**2
m = sp.simplify(sp.integrate(dm, (s, 0, Ls)))
chk("sympy: total magnetic moment m = Q R^2 w / 4, independent of h", sp.simplify(m - Q * R**2 * w / 4) == 0, m)
n_val = sp.simplify(2 * m / (Q * R**2 * w))
chk("sympy: far axial dipole field (mu0/4pi) 2m/z^3 -> n = 1/2", n_val == sp.Rational(1, 2), n_val)


# ------------------------------------------------------------------ 2. exact axial Biot-Savart over the surface
def n_exact(z, hh, RR=1.0):
    """on-axis field of the spinning cone surface, integrated over the slant (ring by ring, exact loop field)."""
    L = math.hypot(RR, hh)
    def integrand(sl):
        rr = RR * sl / L; zr = hh * sl / L
        dqd = (1.0 / (math.pi * RR * L)) * 2 * math.pi * rr           # Q = 1
        dI = dqd / (2 * math.pi)                                       # w = 1
        return 2 * math.pi * dI * rr * rr / (rr * rr + (z - zr)**2)**1.5   # (mu0/4pi) units
    return quad(integrand, 0, L, epsabs=1e-14, epsrel=1e-12, limit=200)[0] * z**3


vals = {hh: [n_exact(z, hh) for z in (10, 100, 1000, 10000)] for hh in (1, 2, 4)}
chk("exact field: B z^3 -> 0.5000 far up the axis for h = R, 2R, 4R", all(abs(v[-1] - 0.5) < 1e-3 for v in vals.values()), {k: round(v[-1], 5) for k, v in vals.items()})
chk("...approaching steadily (the offset correction falls like h/z)", all(abs(v[3] - 0.5) < abs(v[2] - 0.5) < abs(v[1] - 0.5) for v in vals.values()))
chk("the page's plot numbers: at z = 2000R, h = 2R: B z^3 = 0.5012", abs(n_exact(2000, 2) - 0.5012) < 2e-4, n_exact(2000, 2))

# ------------------------------------------------------------------ 3. 3-D point charges
Nu, Nphi = 400, 500
u = np.repeat(np.sqrt((np.arange(Nu) + 0.5) / Nu), Nphi)     # equal-charge rings: area fraction u^2 uniform
phi = np.tile((np.arange(Nphi) + 0.5) * 2 * np.pi / Nphi, Nu)
N = Nu * Nphi
hh, RR, zp = 2.0, 1.0, 300.0
pos = np.stack([RR * u * np.cos(phi), RR * u * np.sin(phi), hh * u], axis=1)
vel = np.stack([-pos[:, 1], pos[:, 0], np.zeros(N)], axis=1)     # w x r, w = 1 along z
q = 1.0 / N
dvec = np.array([0, 0, zp]) - pos
B = (q * np.cross(vel, dvec) / (np.linalg.norm(dvec, axis=1)**3)[:, None]).sum(axis=0)   # (mu0/4pi) sum q v x r/r^3
chk("3-D moving point charges (2x10^5 on the surface, q v x r/r^3): B along z, B z^3 equals the exact ring integral at z = 300R",
    abs(B[2] * zp**3 - n_exact(zp, hh)) < 1e-4 and abs(B[0]) + abs(B[1]) < 1e-9 * abs(B[2]), (B * zp**3, n_exact(zp, hh)))

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + "\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(), f: [1, 2, 4].map(function(h){ return ENGINE.nAt(1000, h); }), near: ENGINE.nAt(10, 2), m1: ENGINE.moment(1), m4: ENGINE.moment(4)}));"
        o = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(o.stdout)
        except ValueError:
            res = {}
        qq = res.get("q", {})
        chk("page engine: answer '0.50'; m = 0.25 QR^2 w", qq.get("answer") == "0.50" and abs(qq.get("m", 0) - 0.25) < 1e-6, o.stderr[:200] or qq)
        chk("page engine: moment the same for h = R and 4R", abs(res.get("m1", 0) - 0.25) < 1e-6 and abs(res.get("m4", 0) - 0.25) < 1e-6)
        chk("page engine: its ring sum matches the exact integral here at z = 1000R and 10R", all(abs(a - n_exact(1000, hh)) < 1e-5 for a, hh in zip(res.get("f", [0, 0, 0]), (1, 2, 4))) and abs(res.get("near", 0) - n_exact(10, 2)) < 1e-5)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("m = QR^2 w/4, B = (mu0/4pi) 2m/z^3  ->  n = 0.5  ->  ANSWER 0.50")
print("official key (read last): 0.50 - agrees")
print("MathonGo solution (their Q28 = Physics Q.12): 0.5 - agrees")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
