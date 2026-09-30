#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q09 - a thin rod (density rho, length L) hinged at the bottom of a tank of two liquids
(6 rho up to L/2, 2 rho above), fully immersed: the period of small oscillations is (2 pi/n) sqrt(L/g); find n.

Solved here before the key, by routes that share no code:
  1. sympy: torques about the hinge of the two buoyancy forces and the weight for a tilt theta, with the
     exact submerged length L/(2 cos theta), expanded to first order; I = M L^2/3; n = sqrt(kappa/I);
  2. numerical integration of the full nonlinear equation of motion (scipy), with the buoyancy computed by
     integrating the liquid pressure's upward force element by element along the rod (no centre-of-buoyancy
     formula), the period timed from zero crossings at small amplitude;
  3. energy: the potential energy U(theta) of the rod in the layered liquid, its curvature at 0 gives kappa;
then the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq09.py
"""
import json
import math
import os
import re
import subprocess
import sys

import numpy as np
import sympy as sp
from scipy.integrate import quad, solve_ivp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q09", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


# ------------------------------------------------------------------ 1. sympy torques
th, rho, A, g, L = sp.symbols("theta rho A g L", positive=True)
s = L / (2 * sp.cos(th))                                               # rod length below the interface at height L/2
tau = (6 * rho * A * s * g * (s / 2) + 2 * rho * A * (L - s) * g * ((L + s) / 2) - rho * A * L * g * (L / 2)) * sp.sin(th)
kappa = sp.simplify(sp.limit(tau / th, th, 0))
I = rho * A * L * L**2 / 3
chk("sympy: restoring torque per radian kappa = rho A g L^2", sp.simplify(kappa - rho * A * g * L**2) == 0, kappa)
chk("sympy: the two buoyancy torques are equal (3/4 rho A g L^2 each) and the weight's is 1/2", sp.simplify(sp.limit(6 * rho * A * s * g * (s / 2) * sp.sin(th) / th, th, 0) - sp.Rational(3, 4) * rho * A * g * L**2) == 0
    and sp.simplify(sp.limit(2 * rho * A * (L - s) * g * ((L + s) / 2) * sp.sin(th) / th, th, 0) - sp.Rational(3, 4) * rho * A * g * L**2) == 0)
w2 = sp.simplify(kappa / I)
n_sym = sp.sqrt(sp.simplify(w2 * L / g))
chk("sympy: omega^2 = 3 g/L, so n = sqrt(3)", sp.simplify(w2 - 3 * g / L) == 0 and n_sym == sp.sqrt(3), n_sym)
series = sp.series(sp.simplify(tau / (rho * A * g * L**2)), th, 0, 4).removeO()
chk("sympy: the tilt-dependent submerged length changes the torque only at order theta^3 (tau = kappa (theta + theta^3/3))", sp.simplify(series - (th + th**3 / 3)) == 0, series)
n_val = float(n_sym)
chk("n = 1.732 lies in the key's range [1.70, 1.75] and rounds to 1.73", 1.70 <= n_val <= 1.75 and round(n_val, 2) == 1.73, n_val)


# ------------------------------------------------------------------ 2. nonlinear dynamics, buoyancy from pressure
def torque_numeric(theta, Lr=1.0, gr=9.8):
    """sum over rod elements of (upward liquid force - weight) x horizontal lever arm; per unit A, rho = 1."""
    def dens(h):
        return 6.0 if h < Lr / 2 else 2.0
    f = lambda l: (dens(l * math.cos(theta)) - 1.0) * gr * l * math.sin(theta)   # element dl at distance l
    brk = min(Lr, Lr / (2 * math.cos(theta)))
    return quad(f, 0, brk, epsabs=1e-13)[0] + (quad(f, brk, Lr, epsabs=1e-13)[0] if brk < Lr else 0.0)


def period(amp, Lr=1.0, gr=9.8):
    Ir = Lr**3 / 3
    rhs = lambda t, y: [y[1], -torque_numeric(y[0], Lr, gr) / Ir]
    cross = lambda t, y: y[0]
    cross.direction = -1
    out = solve_ivp(rhs, (0, 20), [amp, 0], events=cross, rtol=1e-11, atol=1e-12, max_step=0.01)
    tc = out.t_events[0]
    return (tc[-1] - tc[0]) / (len(tc) - 1)


T1 = period(math.radians(1))
n_num = 2 * math.pi / (T1 * math.sqrt(9.8 / 1.0))
chk("dynamics: at 1 deg amplitude the timed period gives n = 1.7321", abs(n_num - math.sqrt(3)) < 5e-4, n_num)
T2 = period(math.radians(1), Lr=2.0, gr=9.8)
chk("dynamics: n does not depend on L (L = 2 m gives the same n)", abs(2 * math.pi / (T2 * math.sqrt(9.8 / 2.0)) - math.sqrt(3)) < 5e-4)
n12 = 2 * math.pi / (period(math.radians(12)) * math.sqrt(9.8))
chk("dynamics: a 12 deg swing is slightly stiffer (n about 1.74), still in the key's range", 1.735 < n12 < 1.75, n12)


# ------------------------------------------------------------------ 3. energy
def potential(theta, Lr=1.0, gr=9.8):
    """U per unit A (rho = 1): each rod element at height h has rho g h, and its buoyancy has potential
    -g * integral_0^h rho_liquid(h') dh' (the work of the pressure force in layered liquid)."""
    Phi = lambda h: 6.0 * h if h < Lr / 2 else 6.0 * Lr / 2 + 2.0 * (h - Lr / 2)
    f = lambda l: gr * (l * math.cos(theta) - Phi(l * math.cos(theta)))
    brk = min(Lr, Lr / (2 * math.cos(theta)))
    return quad(f, 0, brk, epsabs=1e-13)[0] + (quad(f, brk, Lr, epsabs=1e-13)[0] if brk < Lr else 0.0)


hh = 1e-3
curv = (potential(hh) - 2 * potential(0) + potential(-hh)) / hh**2
chk("energy: U(theta) has a minimum at 0 with curvature kappa = g L^2 (per rho A)", abs(curv - 9.8) < 1e-3, curv)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + "\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(), m6: ENGINE.measure(6 * Math.PI / 180, 3), m12: ENGINE.measure(12 * Math.PI / 180, 3), t5: ENGINE.torque(0.05)}));"
        out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(out.stdout)
        except ValueError:
            res = {}
        q = res.get("q", {})
        chk("page engine: answer '1.73', kappa = 1, I = 1/3, inside the key range", q.get("answer") == "1.73" and abs(q.get("kappa", 0) - 1) < 1e-9 and abs(q.get("I", 0) - 1 / 3) < 1e-12 and q.get("inKey") is True, out.stderr[:200] or q)
        chk("page engine: its 6 deg run times n = 1.733", abs(res.get("m6", {}).get("n", 0) - 1.7332) < 2e-3, res.get("m6"))
        chk("page engine: its 12 deg run agrees with the integration here", abs(res.get("m12", {}).get("n", 0) - n12) < 2e-3, (res.get("m12"), n12))
        chk("page engine: its torque at 0.05 rad equals the pressure-integrated torque (per rho A g L^2)", abs(res.get("t5", 0) - torque_numeric(0.05) / 9.8) < 1e-9)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("kappa = rho A g L^2, I = rho A L^3/3, omega^2 = 3g/L  ->  n = sqrt(3) = %.4f  ->  ANSWER 1.73" % n_val)
print("official key (read last): [1.70 to 1.75] -", "agrees" if 1.70 <= n_val <= 1.75 else "DISAGREES")
print("MathonGo solution (their Q25 = Physics Q.9): 1.73 -", "agrees" if round(n_val, 2) == 1.73 else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
