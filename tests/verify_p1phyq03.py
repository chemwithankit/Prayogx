#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q03 - a solid cylinder rolls off a vertical edge: its speed when it loses contact.

A solid cylinder (radius R) rolls without slipping at v0 = sqrt(gR/3) on a horizontal surface that ends
in a vertical edge. It turns about the corner and loses contact. Find the speed of its centre then.

Solved here before the key, by routes that share no code:
  1. sympy: energy about the corner (I = I_cm + mR^2 = 3/2 mR^2) with the contact condition N = 0,
     i.e. mg cos(theta) = m v^2 / R;
  2. Newton-Euler in Cartesian coordinates (scipy): the centre's position and velocity and the spin,
     with the corner's force (both components) solved from the no-slip constraint at every instant -
     no energy equation, no pivot angle - integrated until the corner's push falls to zero;
  3. exact rational arithmetic of the general result cos(theta) = (3 v0^2/gR + 4)/7;
then the edge (no impulse), the whole input range, the flight after release (it never touches the block
again), every printed option, and the page's engine in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq03.py
"""
import json
import math
import os
import re
import subprocess
import sys
from fractions import Fraction as Fr

import numpy as np
import sympy as sp
from scipy.integrate import solve_ivp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q03", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


# the options exactly as printed, as v^2/(gR)
OPTIONS = {"A": 0.0, "B": 5 / 7, "C": 1 / 15, "D": 3 / 7}

# ------------------------------------------------------------------ 1. sympy: energy + N = 0
m, g, R, v0, v, c = sp.symbols("m g R v0 v c", positive=True)
Icm = sp.Rational(1, 2) * m * R**2                                    # solid cylinder
Ic = Icm + m * R**2                                                   # parallel axes, to the corner
chk("sympy: I about the corner = 3/2 m R^2", sp.simplify(Ic - sp.Rational(3, 2) * m * R**2) == 0)
KE = lambda s: sp.Rational(1, 2) * Ic * (s / R)**2                    # pure rotation about the corner, omega = v/R
chk("sympy: rolling KE (1/2 m v^2 + 1/2 I_cm w^2) = rotation about the contact point = 3/4 m v^2",
    sp.simplify(sp.Rational(1, 2) * m * v**2 + sp.Rational(1, 2) * Icm * (v / R)**2 - KE(v)) == 0)
energy = sp.Eq(KE(v), KE(v0) + m * g * R * (1 - c))                   # the centre falls R(1 - cos)
contact = sp.Eq(v**2, g * R * c)                                      # N = mg cos - m v^2/R = 0
sol = sp.solve([energy.subs(v**2, g * R * c).subs(v, sp.sqrt(g * R * c))], [c], dict=True)
cgen = sp.simplify(sol[0][c])
chk("sympy: cos(theta) at release = (3 v0^2/(gR) + 4)/7", sp.simplify(cgen - (3 * v0**2 / (g * R) + 4) / 7) == 0, cgen)
cq = sp.simplify(cgen.subs(v0, sp.sqrt(g * R / 3)))
chk("sympy: with v0^2 = gR/3, cos(theta) = 5/7", cq == sp.Rational(5, 7), cq)
v2q = sp.simplify(g * R * cq)
chk("sympy: v^2 = gR cos(theta) = 5gR/7", sp.simplify(v2q - sp.Rational(5, 7) * g * R) == 0, v2q)
chk("sympy: and at the edge N = mg - m v0^2/R = 2/3 mg > 0, so it does not leave at once",
    sp.simplify(m * g - m * (g * R / 3) / R - sp.Rational(2, 3) * m * g) == 0)
v2_sym = float(cq)
match = [k for k, val in OPTIONS.items() if abs(val - v2_sym) < 1e-12]
chk("exactly one option equals it, and it is B", match == ["B"], match)


# ------------------------------------------------------------------ 2. Newton-Euler, Cartesian, constraint forces
def corner_forces(st, u_mass=1.0, I=0.5):
    """state (x, y, vx, vy, w) with the corner at the origin, g = R = 1, spin w counter-clockwise.
    Solve m a = F + m g, I alpha = (corner - centre) x F, and the no-slip constraint's derivative."""
    x, y, vx, vy, w = st
    # unknowns: Fx, Fy, ax, ay, alpha
    A = np.array([
        [1, 0, -u_mass, 0, 0],                       # Fx - m ax = 0
        [0, 1, 0, -u_mass, 0],                       # Fy - m ay = m g
        [-y, x, 0, 0, I],                            # I alpha = (-x, -y) x F = -(x Fy - y Fx)  ->  x Fy - y Fx + I alpha = 0
        [0, 0, 1, 0, y],                             # ax = alpha(-y) + w(-vy)
        [0, 0, 0, 1, -x],                            # ay = alpha(x) + w(vx)
    ], dtype=float)
    b = np.array([0.0, u_mass * 1.0, 0.0, -w * vy, w * vx])
    Fx, Fy, ax, ay, al = np.linalg.solve(A, b)
    r = math.hypot(x, y)
    N = (Fx * x + Fy * y) / r                        # along corner -> centre
    f = (Fx * (-y) + Fy * x) / r                     # along the tangent (counter-clockwise)
    return Fx, Fy, ax, ay, al, N, f


def newton_release(u, T=200.0):
    s0 = [0.0, 1.0, math.sqrt(u), 0.0, -math.sqrt(u)]           # centre above the corner, rolling right: w = -v0 (clockwise)
    if corner_forces(s0)[5] <= 0:
        return {"immediate": True, "v2": u, "cos": 1.0, "state": s0}

    def rhs(t, s):
        _, _, ax, ay, al, _, _ = corner_forces(s)
        return [s[2], s[3], ax, ay, al]

    def ev(t, s):
        return corner_forces(s)[5]
    ev.terminal, ev.direction = True, -1
    out = solve_ivp(rhs, (0, T), s0, events=ev, rtol=1e-12, atol=1e-13, max_step=0.01)
    st = out.y_events[0][0]
    x, y, vx, vy, w = st
    return {"immediate": False, "v2": vx * vx + vy * vy, "cos": y / math.hypot(x, y), "r": math.hypot(x, y),
            "w": w, "state": st, "t": out.t_events[0][0]}


nq = newton_release(1 / 3)
chk("Newton-Euler: the corner's push falls to zero - release found", not nq["immediate"])
chk("Newton-Euler: at release v^2/gR = 0.714286 (5/7)", abs(nq["v2"] - 5 / 7) < 1e-7, "%.9f" % nq["v2"])
chk("Newton-Euler: at release cos(theta) = 5/7 (theta = 44.42 deg)", abs(nq["cos"] - 5 / 7) < 1e-7, "%.9f" % nq["cos"])
chk("Newton-Euler: the centre stays at distance R from the corner (constraint held)", abs(nq["r"] - 1) < 1e-7, nq["r"])
chk("Newton-Euler: the spin equals the turning rate about the corner (w R = -v)", abs(abs(nq["w"]) - math.sqrt(nq["v2"])) < 1e-7)
match2 = [k for k, val in OPTIONS.items() if abs(val - nq["v2"]) < 1e-6]
chk("Newton-Euler: only option B matches", match2 == ["B"], match2)
# the friction the corner must supply: f = (1/3) mg sin(theta), while N -> 0
th_probe = [0.2, 0.5, 0.7]
fr_ok = True
for thp in th_probe:
    vv = math.sqrt(1 / 3 + 4 / 3 * (1 - math.cos(thp)))
    s = [math.sin(thp), math.cos(thp), vv * math.cos(thp), -vv * math.sin(thp), -vv]
    _, _, _, _, _, Np, fp = corner_forces(s)
    fr_ok = fr_ok and abs(abs(fp) - math.sin(thp) / 3) < 1e-9 and abs(Np - (math.cos(thp) - vv * vv)) < 1e-9
chk("Newton-Euler: friction needed |f| = (1/3) mg sin(theta) and N = mg cos(theta) - m v^2/R (the page's formulas)", fr_ok)

# ------------------------------------------------------------------ 3. exact arithmetic
u = Fr(1, 3)
cex = (3 * u + 4) / 7
chk("exact: cos(theta) = (3/3 + 4)/7 = 5/7 and v^2 = 5/7 gR", cex == Fr(5, 7))
chk("exact: energy balance 3/4 (5/7) = 3/4 (1/3) + (1 - 5/7)", Fr(3, 4) * cex == Fr(3, 4) * u + (1 - cex))

# ------------------------------------------------------------------ the edge: no impulse
L_before = 0.5 * math.sqrt(1 / 3) + 1.0 * math.sqrt(1 / 3) * 1.0      # I_cm w + m v0 R about the corner
L_after = 1.5 * math.sqrt(1 / 3)                                        # I_corner w with w = v0/R
chk("edge: angular momentum about the corner is continuous (3/2 m R v0) - no impulse, w stays v0/R", abs(L_before - L_after) < 1e-15)

# ------------------------------------------------------------------ the whole input range
grid_ok, worst = True, 0.0
for uu in [0.04, 0.1, 0.2, 1 / 3, 0.5, 0.7, 0.9, 0.99]:
    nr = newton_release(uu)
    cf = (3 * uu + 4) / 7
    worst = max(worst, abs(nr["cos"] - cf), abs(nr["v2"] - cf))
    grid_ok = grid_ok and not nr["immediate"]
chk("range: for v0^2/gR from 0.04 to 0.99, Newton-Euler agrees with cos = v^2/gR = (3u + 4)/7", grid_ok and worst < 1e-6, worst)
chk("range: v0^2 >= gR leaves at the edge itself with v = v0 (N < 0 already at theta = 0)",
    newton_release(1.1)["immediate"] and newton_release(1.44)["immediate"] and abs(newton_release(1.0)["cos"] - 1) < 1e-6)


# ------------------------------------------------------------------ after release: free flight, never touches the block again
def clearance(uu, depth):
    rel = newton_release(uu)
    x, y, vx, vy, _ = rel["state"]
    y_land = -depth + 1
    t_land = vy + math.sqrt(vy * vy + 2 * (y - y_land))
    worst = 9.0
    for t in np.linspace(1e-4, t_land, 4000):
        px, py = x + vx * t, y + vy * t - 0.5 * t * t
        if px > 0 and py > 0:
            dist = math.hypot(px, py)
        elif px > 0:
            dist = px
        elif py > 0:
            dist = py
        else:
            dist = -1
        worst = min(worst, dist)
    return worst


cl = min(clearance(uu, dp) for uu in [0.04, 0.2, 1 / 3, 0.6, 0.95, 1.2, 1.44] for dp in (2.2, 2.4))
chk("flight: after release the cylinder never comes back within R of the block (every v0, both scene depths)", cl > 1 - 1e-9, cl)

# ------------------------------------------------------------------ every printed option
v2_at = lambda cc, uu=1 / 3: uu + 4 / 3 * (1 - cc)
chk("audit A (0) and C (1/15): below v0^2 = 1/3 - impossible, the centre only falls, so v^2 >= v0^2",
    OPTIONS["A"] < 1 / 3 and OPTIONS["C"] < 1 / 3 and all(v2_at(math.cos(t)) >= 1 / 3 for t in np.linspace(0, math.pi / 2, 50)))
cD = 3 / 7
chk("audit D (3/7): it needs cos = 3/7, where energy gives v^2 = 23/21 and N = -(2/3) mg < 0 - contact already lost",
    abs(v2_at(cD) - 23 / 21) < 1e-12 and abs((cD - v2_at(cD)) + 2 / 3) < 1e-12)
chk("audit D: it is what the energy equation gives with the initial KE subtracted: 7/4 c = 1 - 3/4 u",
    abs((1 - 0.75 * (1 / 3)) / 1.75 - 3 / 7) < 1e-12)
chk("audit B (5/7): energy and N = 0 together - the only consistent option", abs(v2_at(5 / 7) - 5 / 7) < 1e-12)
chk("side note: a point mass (no rotation) would give 7/9, which is not an option", abs((1 / 3 + 2) / 3 - 7 / 9) < 1e-12)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + ("\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(ENGINE.Q), sim: ENGINE.simulate(1/3, 0.001),"
                             " lo: ENGINE.run({u: 0.1}), hi: ENGINE.run({u: 1.2}), simLo: ENGINE.simulate(0.1, 0.001),"
                             " f: ENGINE.friction(0.5), n: ENGINE.normal(1/3, 0.5)}));")
        out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(out.stdout)
        except ValueError:
            res = {}
        q = res.get("q", {})
        chk("page engine: answer B", q.get("answer") == "B", out.stderr[:200] or q.get("answer"))
        chk("page engine: cos = v^2/gR = 5/7, theta = 44.415 deg", abs(q.get("cos", 0) - 5 / 7) < 1e-12 and abs(q.get("v2", 0) - 5 / 7) < 1e-12
            and abs(q.get("thetaDeg", 0) - math.degrees(math.acos(5 / 7))) < 1e-9, q.get("thetaDeg"))
        chk("page engine: it prints 5/7 as a fraction and hits exactly one option",
            q.get("v2frac") == {"n": 5, "d": 7} and [h["key"] for h in q.get("hits", [])] == ["B"])
        sim = res.get("sim", {})
        chk("page engine: its pivot integration (no energy) releases at v^2 = 5/7 too", abs(sim.get("v2", 0) - 5 / 7) < 1e-9, sim.get("v2"))
        chk("page engine agrees with the Newton-Euler route here", abs(sim.get("v2", 0) - nq["v2"]) < 1e-7)
        lo, hi = res.get("lo", {}), res.get("hi", {})
        chk("page engine, v0^2 = 0.1 gR: cos = (0.3 + 4)/7 and not the question", abs(lo.get("cos", 0) - 4.3 / 7) < 1e-12 and lo.get("answer") is None)
        chk("page engine, v0^2 = 0.1 gR: its integration agrees", abs(res.get("simLo", {}).get("v2", 0) - 4.3 / 7) < 1e-9)
        chk("page engine, v0^2 = 1.2 gR: leaves at the edge with v^2 = 1.2 gR", hi.get("immediate") is True and abs(hi.get("v2", 0) - 1.2) < 1e-12)
        chk("page engine: friction and normal formulas", abs(res.get("f", 0) - math.sin(0.5) / 3) < 1e-12
            and abs(res.get("n", 0) - (math.cos(0.5) - v2_at(math.cos(0.5)))) < 1e-12)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("cos(theta) = 5/7, v = sqrt(5gR/7)  ->  ANSWER  %s" % ("B" if match == ["B"] else "?"))
print("official key (read last): B -", "agrees" if match == ["B"] else "DISAGREES")
print("MathonGo solution (their Q19 = Physics Q.3): B -", "agrees" if match == ["B"] else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
