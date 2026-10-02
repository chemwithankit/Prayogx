#!/usr/bin/env python3
"""ADV-2026-P2-PHY-Q01 - drift velocity of the electrons in a wire (A = 0.5 mm^2, L = 100 m) across a battery
(e.m.f. 2 V, internal resistance 1 ohm); density 6.35e3 kg/m^3, atomic mass 63.5 g/mol, conductivity 2e8 S/m, one
conduction electron per atom, NA = 6e23, e = 1.6e-19 C. Options (mm/s): (A) 0.052 (B) 0.104 (C) 0.208 (D) 0.156.

The MathonGo solution was read first only for the approach. Solved here by routes that share no code with the page:
  1. the circuit route in exact fractions: R = L/(sigma A), I = eps/(R + r), n = rho NA / M, vd = I/(n e A);
  2. the field route in exact fractions: E = I R / L, vd = sigma E / (n e)  (J = sigma E = n e vd);
  3. a collision Monte Carlo (the NCERT picture): electrons accelerate at eE/m between collisions whose times are
     exponential with mean tau = m sigma / (n e^2); their time-averaged velocity is the drift, eE tau / m;
  4. the traps: no internal resistance, grams left unconverted, mm^2 converted wrongly; every option audited;
then the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p2phyq01.py
"""
import json
import os
import re
import subprocess
import sys
from fractions import Fraction as F

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-2", "physics", "adv-2026-p2-phy-q01", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    detail = str(detail)
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + detail))


# the data, exactly, in SI units
eps, r, L = F(2), F(1), F(100)
A = F(1, 2) * F(1, 10**6)                       # 0.5 mm^2 = 0.5e-6 m^2
sigma = F(2 * 10**8)
rho, M = F(635, 100) * 10**3, F(635, 10) / 1000   # 6.35e3 kg/m^3, 63.5e-3 kg/mol
NA, e = F(6 * 10**23), F(16, 10) / 10**19
OPTS = {"A": F(52, 1000), "B": F(104, 1000), "C": F(208, 1000), "D": F(156, 1000)}   # mm/s

# ------------------------------------------------------------------ 1. the circuit route
R = L / (sigma * A)
I = eps / (R + r)
n = rho * NA / M
vd1 = I / (n * e * A)
chk("circuit route: R = 1 ohm, I = 1 A, n = 6e28 m^-3 exactly", R == 1 and I == 1 and n == 6 * 10**28, (R, I, n))
chk("circuit route: vd = 1/4800 m/s exactly = 0.2083 mm/s", vd1 == F(1, 4800), vd1)

# ------------------------------------------------------------------ 2. the field route
V = I * R
E = V / L
vd2 = sigma * E / (n * e)
chk("field route: the wire gets V = 1 V of the 2 V (terminal voltage), E = 0.01 V/m", V == 1 and E == F(1, 100), (V, E))
chk("field route: vd = sigma E / (n e) equals the circuit route exactly", vd2 == vd1, vd2)

# ------------------------------------------------------------------ 3. a collision Monte Carlo (drift = e E tau / m)
me = 9.11e-31
tau = me * float(sigma) / (float(n) * float(e) ** 2)
acc = float(e) * float(E) / me
rng = np.random.default_rng(1)
free = rng.exponential(tau, 400000)              # free times between collisions
# each free flight starts at zero mean velocity (the random part averages out) and accelerates at a = eE/m;
# the time-averaged velocity is (sum of a t^2 / 2) / (sum of t)
vmc = acc * (free ** 2).sum() / 2 / free.sum()
chk("collision Monte Carlo: tau = m sigma/(n e^2) = %.3g s; the time-averaged velocity is the drift, within 1%%" % tau,
    abs(vmc - float(vd1)) / float(vd1) < 0.01, "%.5g vs %.5g" % (vmc, float(vd1)))

# ------------------------------------------------------------------ 4. the answer, the traps, the options
mm = vd1 * 1000
best = min(OPTS, key=lambda k: abs(OPTS[k] - mm))
chk("0.2083 mm/s is option (C) (0.208), within 0.2 %; no other option is within 20 %",
    best == "C" and abs(OPTS["C"] - mm) / mm < F(2, 1000) and all(abs(OPTS[k] - mm) / mm > F(1, 5) for k in "ABD"), float(mm))
chk("the options A, B, D are a quarter, a half and three quarters of 0.208", [OPTS[k] / OPTS["C"] for k in "ABD"] == [F(1, 4), F(1, 2), F(3, 4)])
vd_r0 = (eps / R) / (n * e * A) * 1000
chk("trap: forgetting the internal resistance gives 0.417 mm/s, which is no option", abs(vd_r0 - F(417, 1000)) < F(1, 1000) and all(abs(OPTS[k] - vd_r0) / vd_r0 > F(1, 10) for k in OPTS), float(vd_r0))
vd_g = I / ((rho * NA / (M * 1000)) * e * A) * 1000
chk("trap: leaving M in grams makes n 1000x too small and vd 1000x too large (208 mm/s)", vd_g == mm * 1000, float(vd_g))
vd_mm2 = I / (n * e * (F(1, 2) / 10**3)) * 1000
chk("trap: 0.5 mm^2 taken as 0.5e-3 m^2 gives vd 1000x too small", vd_mm2 * 1000 == mm, float(vd_mm2))
chk("with an ideal battery (r = 0) vd = sigma eps / (n e L) does not depend on A (the page's 'thicker wire' test)",
    all(((eps / (L / (sigma * a))) / (n * e * a)) == sigma * eps / (n * e * L) for a in (F(1, 10**7), A, F(2, 10**6))))
travel = L / vd1
chk("a drifting electron needs L/vd = 480 000 s (5.6 days) to travel the 100 m wire", travel == 480000 and abs(float(travel) / 86400 - 5.5556) < 0.001)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + ("\nvar q = ENGINE.run(), r0 = ENGINE.circuit({r: 0}), c2 = ENGINE.curve(0, {}, 0.1, 2, 4), c1 = ENGINE.curve(1, {}, 0.1, 2, 4), z2 = ENGINE.circuit({z: 2});"
                             "process.stdout.write(JSON.stringify({ans: q.answer, agree: q.routesAgree, R: q.c.R, I: q.c.I, V: q.c.V, E: q.c.E, n: q.c.n, vd: q.c.vd, vdf: q.c.vdField,"
                             " r0: ENGINE.pick(r0.vd), vdr0: r0.vd, flat: c2.map(function(p){return p[1];}), fall: c1.map(function(p){return p[1];}), z2: z2.vd, travel: q.c.travel}));")
        o = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(o.stdout)
        except ValueError:
            res = {}
        chk("page engine: answer 'C', its two routes agree", res.get("ans") == "C" and res.get("agree") is True, o.stderr[:200] or res)
        chk("page engine: R, I, V, E, n and vd equal the exact values (1e-12)", all(abs(res.get(k, 9) - float(v)) <= 1e-12 * max(1, abs(float(v))) for k, v in
            (("R", R), ("I", I), ("V", V), ("E", E), ("n", n), ("vd", vd1), ("vdf", vd2), ("travel", travel))), res)
        chk("page engine: r = 0 gives 0.417 mm/s, which it matches to no option", res.get("r0") is None and abs(res.get("vdr0", 0) - float(vd_r0) / 1000) < 1e-12)
        chk("page engine: its graph is computed - flat for r = 0, falling for r = 1 ohm; doubling the free electrons halves vd",
            max(res.get("flat", [1])) - min(res.get("flat", [0])) < 1e-15 and all(a > b for a, b in zip(res.get("fall", []), res.get("fall", [])[1:])) and abs(res.get("z2", 0) - float(vd1) / 2) < 1e-15)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("R = 1 ohm, I = 1 A, n = 6e28 m^-3, vd = 1/4800 m/s = 0.208 mm/s  ->  ANSWER C")
print("official final key (jeeadv.ac.in, Paper 2, read last): C -", "agrees" if best == "C" else "DISAGREES")
print("MathonGo solution (their Q19 = Physics Q.1, read first for the approach): C -", "agrees" if best == "C" else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
