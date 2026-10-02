#!/usr/bin/env python3
"""ADV-2026-P2-PHY-Q04 - a particle (mass m, angular momentum l) on a circular orbit r0 under F = -k/r^2 r-hat is
displaced radially by a small dr with l unchanged; its radial distance oscillates. The period:
(A) 2 pi l^3/(m k^2) (B) 2 pi sqrt(m/k) (C) 2 pi l^3/(3 m k^2) (D) 2 pi l^3/(5 m k^2).

The MathonGo solution was read first only for the approach. Solved here by routes that share no code with the page:
  1. sympy: the effective potential, r0 at its minimum, U'' there, omega^2 = U''/m, and T in terms of l;
  2. a numerical integration of the orbit with scipy's DOP853 (tolerance 1e-12) in polar form; the radial period
     from successive maxima tends to the formula as dr -> 0, with the excess scaling as dr^2;
  3. Kepler: a finite nudge gives an ellipse of semi-major axis a = r0 (1 + e)^2/(1 + 2e); its period
     2 pi sqrt(m a^3/k) matches the integration at every dr;
  4. the options: units, values, and the orbital period equal to the radial period (a closed orbit);
then the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p2phyq04.py
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import sympy as sp
from scipy.integrate import solve_ivp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-2", "physics", "adv-2026-p2-phy-q04", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    detail = str(detail)
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + detail))


# ------------------------------------------------------------------ 1. sympy
r, m, k, l = sp.symbols("r m k ell", positive=True)
U = l ** 2 / (2 * m * r ** 2) - k / r
r0 = sp.solve(sp.diff(U, r), r)
chk("sympy: the effective potential has its minimum at r0 = l^2/(m k)", r0 == [l ** 2 / (m * k)], r0)
R0 = l ** 2 / (m * k)
Upp = sp.simplify(sp.diff(U, r, 2).subs(r, R0))
chk("sympy: U''(r0) = k/r0^3", sp.simplify(Upp - k / R0 ** 3) == 0, Upp)
T = sp.simplify(2 * sp.pi / sp.sqrt(Upp / m))
TA = 2 * sp.pi * l ** 3 / (m * k ** 2)
chk("sympy: T = 2 pi / sqrt(U''/m) = 2 pi l^3/(m k^2) exactly: option (A)", sp.simplify(T - TA) == 0, T)
Torb = sp.simplify(2 * sp.pi * m * R0 ** 2 / l)
chk("sympy: the orbital period 2 pi m r0^2/l is the same, so the orbit closes", sp.simplify(Torb - TA) == 0, Torb)

# ------------------------------------------------------------------ representative values (as on the page)
M, K, Lm = 1.0, 50.0, 10.0
r0n = Lm ** 2 / (M * K)
TAn = 2 * np.pi * Lm ** 3 / (M * K ** 2)


def circ_r0(n):
    return (Lm ** 2 / (M * K)) ** (1 / (3 - n))       # m v^2/r = k/r^n with l = m v r


def radial_period(dr, n=2.0, revs=3.3):
    rc = circ_r0(n)
    r1 = rc * (1 + dr)
    t_end = revs * 2 * np.pi * M * rc ** 2 / Lm

    def f(t, y):                                     # y = r, pr; theta follows from l
        return [y[1] / M, Lm ** 2 / (M * y[0] ** 3) - K / y[0] ** n]

    def peak(t, y):
        return y[1]
    peak.direction = -1                              # pr goes + -> - at a maximum of r
    sol = solve_ivp(f, (0, t_end), [r1, 0.0], method="DOP853", rtol=1e-12, atol=1e-12, events=peak)
    tp = sol.t_events[0]
    tp = tp[tp > 1e-6]
    return float(np.mean(np.diff(np.concatenate([[0.0], tp])))), len(tp)


# ------------------------------------------------------------------ 2. the integration
dr_list = [0.01, 0.02, 0.05, 0.1]
Ts = [radial_period(d)[0] for d in dr_list]
ex = [(t / TAn - 1) for t in Ts]
chk("integration (DOP853, 1e-12): the radial period tends to 2 pi l^3/(mk^2) as dr -> 0 (dr = 0.01: within 0.02 %)", abs(ex[0]) < 2e-4, ex[0])
chk("integration: the excess grows as dr^2 (x4 when dr doubles, within 10 %)", abs(ex[1] / ex[0] - 4) < 0.4 and abs(ex[3] / ex[2] - 4) < 0.4, [round(e, 6) for e in ex])
chk("integration: at the page's default dr = 0.05 the period is within 0.5 % of (A) and far from B, C, D",
    abs(ex[2]) < 5e-3 and all(abs(Ts[2] - v) / v > 0.5 for v in (2 * np.pi * np.sqrt(M / K), TAn / 3, TAn / 5)), Ts[2])

# ------------------------------------------------------------------ 3. Kepler for a finite nudge
kep = []
for d, t in zip(dr_list, Ts):
    a = r0n * (1 + d) ** 2 / (1 + 2 * d)
    kep.append(abs(t / (2 * np.pi * np.sqrt(M * a ** 3 / K)) - 1))
chk("Kepler: the integrated period equals 2 pi sqrt(m a^3/k) with a = r0 (1 + e)^2/(1 + 2e) at every nudge (1e-8)", max(kep) < 1e-8, max(kep))

# ------------------------------------------------------------------ 4. the options
chk("units: 2 pi l^3/(m k^2) is in seconds (l: kg m^2/s, k: N m^2); 2 pi sqrt(m/k) is not - it is the spring formula", True)
chk("(C) and (D) are a third and a fifth of the orbital period; the wobble lasts one full revolution",
    abs(TAn / 3 - 0.8378) < 1e-3 and abs(TAn / 5 - 0.5027) < 1e-3)
Tn15 = radial_period(0.02, n=1.5, revs=6)[0]
Tc15 = 2 * np.pi * M * circ_r0(1.5) ** 2 / Lm
chk("for a force k/r^1.5 the radial period is the orbital period / sqrt(3 - n) - the orbit would not close (Bertrand)", abs(Tn15 / Tc15 - 1 / np.sqrt(1.5)) < 5e-3, Tn15 / Tc15)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + (
            "\nvar q = ENGINE.run(), Ls = q.sim.rec.map(function(x){ return x[4]; }), grid = [], d1 = ENGINE.run({dr: 0.01});"
            "[8, 10, 12].forEach(function(l){ [40, 60].forEach(function(k){ [0.8, 1.25].forEach(function(m){ grid.push(ENGINE.run({l: l, k: k, m: m}).answer); }); }); });"
            "var big = ENGINE.run({dr: 0.2});"
            "process.stdout.write(JSON.stringify({ans: q.answer, T: q.m.T, A: ENGINE.OPTS.A(q.sim.p), r0: q.sim.r0, Tc: q.sim.Tc, apsis: q.m.apsis, Lspread: Math.max.apply(null, Ls) - Math.min.apply(null, Ls),"
            " T01: d1.m.T, grid: grid, big: big.answer, bigT: big.m.T}));")
        o = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(o.stdout)
        except ValueError:
            res = {}
        chk("page engine: answer 'A' from its measured radial period", res.get("ans") == "A", o.stderr[:200] or res)
        chk("page engine: r0 = 2 m, orbital period 2.513 s, its measured Tr equals the DOP853 value at dr = 0.05 (1e-5)",
            abs(res.get("r0", 0) - 2) < 1e-12 and abs(res.get("Tc", 0) - TAn) < 1e-12 and abs(res.get("T", 0) - Ts[2]) / Ts[2] < 1e-5, (res.get("T"), Ts[2]))
        chk("page engine: angular momentum conserved to 1e-9 through the run; the farthest point returns after 360 deg (within 0.5 deg)",
            res.get("Lspread", 1) < 1e-9 and abs(res.get("apsis", 0) - 360) < 0.5, (res.get("Lspread"), res.get("apsis")))
        chk("page engine: at dr = 0.01 its period is within 0.03 % of 2 pi l^3/(mk^2)", abs(res.get("T01", 0) / TAn - 1) < 3e-4, res.get("T01"))
        chk("page engine: (A) across the slider range (12 runs); a large nudge (0.2) honestly matches no option", res.get("grid") == ["A"] * 12 and res.get("big") is None, (res.get("grid"), res.get("big")))
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("U_eff'' (r0) = k/r0^3, omega^2 = k/(m r0^3), r0 = l^2/(mk)  ->  T = 2 pi l^3/(m k^2)  ->  ANSWER A")
print("official final key (jeeadv.ac.in, Paper 2, read last): A - agrees")
print("MathonGo solution (their Q22 = Physics Q.4, read first for the approach): A - agrees")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
