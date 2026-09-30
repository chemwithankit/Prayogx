#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q06 - a particle thrown from O at angle theta passes through P (5 m, 1 m): which statements
about its speed and the position of its highest point are correct?

Solved here before the key, by routes that share no code:
  1. sympy: the trajectory y = x tan th - g x^2/(2 v^2 cos^2 th) through P gives v^2(th); the highest point
     from dy/dx = 0; each statement decided symbolically;
  2. numerical integration of Newton's second law (scipy solve_ivp, no trajectory formula): the launch speed
     found by shooting (root-finding on the height at x = 5 m), the highest point from the event vy = 0;
  3. exact geometry for (D): tan th = 1/5 is the slope of OP, so no parabola with finite speed reaches P,
     and the miss for v = 125 sqrt(g) is 26/31250 m;
then the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq06.py
"""
import json
import math
import os
import re
import subprocess
import sys
from fractions import Fraction as Fr

import sympy as sp
from scipy.integrate import solve_ivp
from scipy.optimize import brentq

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q06", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


# ------------------------------------------------------------------ 1. sympy
x, v, g, th = sp.symbols("x v g theta", positive=True)
y = x * sp.tan(th) - g * x**2 / (2 * v**2 * sp.cos(th)**2)
v2 = sp.solve(sp.Eq(y.subs(x, 5), 1), v**2)
v2 = [s for s in v2][0] if v2 else sp.solve(sp.Eq(y.subs(x, 5), 1), v)[0]**2
v2 = sp.simplify(sp.solve(sp.Eq(y.subs(x, 5), 1), v)[0]**2)
chk("sympy: through P, v^2 = 25 g / (2 cos^2 th (5 tan th - 1))", sp.simplify(v2 - 25 * g / (2 * sp.cos(th)**2 * (5 * sp.tan(th) - 1))) == 0, v2)
xa = sp.solve(sp.Eq(sp.diff(y, x), 0), x)[0]
chk("sympy: highest point at x = v^2 sin 2th / 2g", sp.simplify(xa - v**2 * sp.sin(2 * th) / (2 * g)) == 0, xa)
v45 = sp.sqrt(sp.simplify(v2.subs(th, sp.pi / 4)))
chk("sympy (A): at 45 deg, v = 5 sqrt(g)/2", sp.simplify(v45 - 5 * sp.sqrt(g) / 2) == 0, v45)
xa45 = sp.simplify(xa.subs({v: v45, th: sp.pi / 4}))
chk("sympy (B): at 45 deg the highest point is at x = 25/8 m < 5 m - before P", xa45 == sp.Rational(25, 8), xa45)
xa30 = sp.nsimplify(sp.simplify(xa.subs(v, sp.sqrt(v2)).subs(th, sp.pi / 6)))
chk("sympy (C): at 30 deg the highest point is at x = 3.825 m < 5 m - before P, so (C) is false", abs(float(xa30) - 3.82503) < 1e-3 and float(xa30) < 5, float(xa30))
thD = sp.atan(sp.Rational(1, 5))
chk("sympy (D): at tan th = 1/5 the factor 5 tan th - 1 is exactly 0 - v^2 is unbounded, (D) false", sp.simplify(5 * sp.tan(thD) - 1) == 0)
xa_gen = sp.simplify(xa.subs(v, sp.sqrt(v2)))
t = sp.symbols("t", positive=True)
chk("sympy: the highest point is at x = 12.5 tan th/(5 tan th - 1): beyond P only for tan th < 2/5 (about 21.8 deg)",
    sp.simplify(xa_gen - sp.Rational(25, 2) * sp.tan(th) / (5 * sp.tan(th) - 1)) == 0
    and sp.solve(sp.Eq(sp.Rational(25, 2) * t / (5 * t - 1), 5), t) == [sp.Rational(2, 5)])
sym_ans = [k for k, val in (("A", True), ("B", xa45 < 5), ("C", float(xa30) > 5), ("D", False)) if val]
chk("sympy: exactly A and B are true", sym_ans == ["A", "B"], sym_ans)

# ------------------------------------------------------------------ 2. Newton's law integrated, shooting
G = 9.8


def fly(theta_deg, speed):
    c, s = math.cos(math.radians(theta_deg)), math.sin(math.radians(theta_deg))
    hit5 = lambda t_, u: u[0] - 5.0
    hit5.terminal, hit5.direction = False, 1
    top = lambda t_, u: u[3]
    top.direction = -1
    land = lambda t_, u: u[1] if t_ > 1e-9 else 1.0
    land.terminal, land.direction = True, -1
    out = solve_ivp(lambda t_, u: [u[2], u[3], 0.0, -G], (0, 100), [0, 0, speed * c, speed * s],
                    events=[hit5, top, land], rtol=1e-12, atol=1e-12, max_step=0.01)
    y5 = out.y_events[0][0][1] if len(out.y_events[0]) else -1e9      # landed before x = 5 m
    xtop = out.y_events[1][0][0] if len(out.y_events[1]) else math.inf
    return y5, xtop


def shoot(theta_deg):
    return brentq(lambda s: fly(theta_deg, s)[0] - 1.0, 5.0, 60.0, xtol=1e-13)


s45 = shoot(45)
chk("integration (A): the shot through P at 45 deg has v = 2.500 sqrt(g)", abs(s45 / math.sqrt(G) - 2.5) < 1e-7, s45 / math.sqrt(G))
chk("integration (B): its top (vy = 0) is at x = 3.125 m, before P", abs(fly(45, s45)[1] - 3.125) < 1e-6, fly(45, s45)[1])
s30 = shoot(30)
chk("integration (C): at 30 deg v = 2.972 sqrt(g) and the top is at x = 3.825 m - before P", abs(s30 / math.sqrt(G) - 2.972125) < 1e-4 and abs(fly(30, s30)[1] - 3.82503) < 1e-3 and fly(30, s30)[1] < 5)
thD_deg = math.degrees(math.atan(0.2))
misses = [1.0 - fly(thD_deg, k * math.sqrt(G))[0] for k in (10, 30, 125, 1000)]
chk("integration (D): along tan^-1(1/5), 10, 30, 125, 1000 sqrt(g) all pass below P, closer but never on it", all(mm > 0 for mm in misses) and misses == sorted(misses, reverse=True), misses)
chk("integration: 20 deg is a shallow throw whose top (5.549 m) is after P - so 'after P' needs a shallow angle", abs(fly(20, shoot(20))[1] - 5.549) < 1e-3)

# ------------------------------------------------------------------ 3. exact numbers for (D)
miss125 = Fr(25) / (2 * 125**2 * Fr(25, 26))                       # g x^2/(2 v^2 cos^2) with v^2 = 125^2 g, cos^2 = 25/26
chk("exact: with v = 125 sqrt(g) along tan^-1(1/5) the ball is 26/31250 m = 0.832 mm below P", miss125 == Fr(26, 31250) and abs(misses[2] - float(miss125)) < 1e-9)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + ("\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(), v20: ENGINE.vReq(20), a20: ENGINE.apexX(20), vD: isFinite(ENGINE.vReq(ENGINE.TH_D)),"
                             " y: ENGINE.yAt(45, 2.5, 5)}));")
        out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(out.stdout)
        except ValueError:
            res = {}
        q = res.get("q", {})
        chk("page engine: answer '(A), (B)'", q.get("answer") == "(A), (B)", out.stderr[:200] or q)
        chk("page engine: 2.500, 3.125 m, 2.972, 3.825 m, and a 0.832 mm miss", abs(q.get("v45", 0) - 2.5) < 1e-12 and abs(q.get("apex45", 0) - 3.125) < 1e-12
            and abs(q.get("v30", 0) - 2.972125) < 1e-5 and abs(q.get("apex30", 0) - 3.82503) < 1e-4 and abs(q.get("missD", 0) - float(miss125)) < 1e-12)
        chk("page engine: tan^-1(1/5) has no finite speed; 20 deg peaks after P", res.get("vD") is False and res.get("a20", 0) > 5)
        chk("page engine: the 45 deg throw passes exactly through P", abs(res.get("y", 0) - 1) < 1e-12)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("A true, B true, C false (top at 3.825 m), D false (v unbounded)  ->  ANSWER  %s" % ", ".join(sym_ans))
print("official key (read last): AB -", "agrees" if sym_ans == ["A", "B"] else "DISAGREES")
print("MathonGo solution (their Q22 = Physics Q.6): (A), (B) -", "agrees" if sym_ans == ["A", "B"] else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
