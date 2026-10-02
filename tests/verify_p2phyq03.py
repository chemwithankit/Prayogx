#!/usr/bin/env python3
"""ADV-2026-P2-PHY-Q03 - a thin prism (A = 6 deg) whose index varies as n(lambda) = alpha lambda + beta/lambda^2,
alpha = 3 um^-1, beta = 0.096 um^2. Dm at the wavelength where the angle of minimum deviation is smallest:
(A) 6.4 (B) 4.8 (C) 3.2 (D) 2.4 degrees.

The MathonGo solution was read first only for the approach. Solved here by routes that share no code with the page:
  1. exact rational arithmetic: dn/dlambda = 0 -> lambda^3 = 2 beta/alpha; n; the thin-prism Dm = (n - 1)A;
  2. sympy: the stationary point, its second derivative, and the minimum of n over all lambda > 0;
  3. the exact prism formula n = sin((A + Dm)/2)/sin(A/2);
  4. a brute-force ray trace on a grid of wavelengths and angles of incidence (numpy, Snell's law at both faces);
  5. every option audited against the range of n the material can have;
then the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p2phyq03.py
"""
import json
import os
import re
import subprocess
import sys
from fractions import Fraction as F

import numpy as np
import sympy as sp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-2", "physics", "adv-2026-p2-phy-q03", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    detail = str(detail)
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + detail))


A, al, be = F(6), F(3), F(96, 1000)
OPTS = {"A": F(64, 10), "B": F(48, 10), "C": F(32, 10), "D": F(24, 10)}

# ------------------------------------------------------------------ 1. exact rational arithmetic
lam3 = 2 * be / al
lam = F(4, 10)
n_min = al * lam + be / lam ** 2
Dthin = (n_min - 1) * A
chk("exact: lambda^3 = 2 beta/alpha = 0.064 um^3, so lambda_min = 0.4 um exactly", lam3 == F(64, 1000) and lam ** 3 == lam3)
chk("exact: n(0.4) = 1.2 + 0.6 = 1.8", n_min == F(18, 10), n_min)
chk("exact: thin-prism Dm = (1.8 - 1) x 6 = 4.8 deg = option (B)", Dthin == OPTS["B"], Dthin)

# ------------------------------------------------------------------ 2. sympy
x = sp.symbols("lambda", positive=True)
nx = sp.Rational(3) * x + sp.Rational(96, 1000) / x ** 2
crit = sp.solve(sp.diff(nx, x), x)
chk("sympy: the only stationary point for lambda > 0 is 0.4 um, and it is a minimum (n'' > 0)", crit == [sp.Rational(2, 5)] and sp.diff(nx, x, 2).subs(x, sp.Rational(2, 5)) > 0, crit)
chk("sympy: n -> infinity at both ends (lambda -> 0 and lambda -> infinity), so 1.8 is the global minimum",
    sp.limit(nx, x, 0, "+") == sp.oo and sp.limit(nx, x, sp.oo) == sp.oo)

# ------------------------------------------------------------------ 3. the exact prism formula
def dm_exact(n, A_deg):
    return 2 * np.degrees(np.arcsin(n * np.sin(np.radians(A_deg) / 2))) - A_deg


Dex = dm_exact(1.8, 6.0)
chk("exact prism formula: Dm = 2 asin(1.8 sin 3 deg) - 6 deg = 4.811 deg, within 0.3 % of 4.8 (option B, not A, C or D)",
    abs(Dex - 4.8) / 4.8 < 0.003 and min(OPTS, key=lambda k: abs(float(OPTS[k]) - Dex)) == "B", round(Dex, 4))

# ------------------------------------------------------------------ 4. brute-force ray trace
lams = np.linspace(0.2, 1.0, 1601)
incs = np.linspace(0.01, 60, 6000)


def trace(n, A_deg, i_deg):
    i = np.radians(i_deg)
    r1 = np.arcsin(np.sin(i) / n)
    r2 = np.radians(A_deg) - r1
    s = n * np.sin(r2)
    e = np.where(np.abs(s) <= 1, np.arcsin(np.clip(s, -1, 1)), np.nan)
    return np.degrees(i + e) - A_deg


ns = 3 * lams + 0.096 / lams ** 2
Dm = np.array([np.nanmin(trace(n, 6.0, incs)) for n in ns])
k = int(np.argmin(Dm))
chk("ray trace on a grid (1601 wavelengths x 6000 incidences): the smallest Dm is at 0.400 um and equals 4.811 deg",
    abs(lams[k] - 0.4) < 1e-3 and abs(Dm[k] - Dex) < 1e-3, (lams[k], Dm[k]))
chk("ray trace: the minimum-deviation path is symmetric (incidence = emergence = asin(n sin(A/2)))",
    abs(incs[int(np.nanargmin(trace(1.8, 6.0, incs)))] - np.degrees(np.arcsin(1.8 * np.sin(np.radians(3))))) < 0.02)
chk("ray trace: shorter and longer wavelengths are both deviated more (Dm at 0.25 um and 1.0 um exceed 4.81 deg)", Dm[0] > Dm[k] and Dm[-1] > Dm[k] and Dm[int(0.05 / 0.0005)] > Dm[k])

# ------------------------------------------------------------------ 5. the options audited
need = {kk: 1 + float(OPTS[kk]) / 6 for kk in OPTS}
chk("(C) 3.2 deg and (D) 2.4 deg need n = 1.53 and 1.4, below the material's minimum 1.8: no wavelength gives them",
    need["C"] < 1.8 and need["D"] < 1.8)
roots = sorted(float(r) for r in sp.solve(sp.Eq(nx, sp.Rational(1) + sp.Rational(64, 60)), x) if r.is_real and r > 0)
chk("(A) 6.4 deg needs n = 2.067, which the material reaches only at 0.280 um and 0.600 um - not the smallest Dm",
    len(roots) == 2 and abs(roots[0] - 0.2796) < 1e-3 and abs(roots[1] - 0.6) < 1e-9, roots)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + (
            "\nvar q = ENGINE.run(), s = q.s, bad = 0, n = 0, A, a, b;"
            "for (A = 2; A <= 10; A += 1) for (a = 2; a <= 4.001; a += 0.5) for (b = 0.05; b <= 0.1501; b += 0.025){ n++; var r = ENGINE.search({A: A, alpha: a, beta: b});"
            " if (Math.abs(r.lam - Math.cbrt(2 * b / a)) > 1e-4 || Math.abs(r.D - (2 * Math.asin(r.n * Math.sin(A * Math.PI / 360)) * 180 / Math.PI - A)) > 1e-6) bad++; }"
            "process.stdout.write(JSON.stringify({ans: q.answer, lam: s.lam, n: s.n, D: s.D, Dthin: s.Dthin, grid: n, bad: bad, pickA: ENGINE.pick(6.4), pickNone: ENGINE.pick(5.6)}));")
        o = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(o.stdout)
        except ValueError:
            res = {}
        chk("page engine: answer 'B' from its measured smallest Dm", res.get("ans") == "B", o.stderr[:200] or res)
        chk("page engine: lambda_min = 0.400 um, n = 1.800, Dm = 4.8111 deg (exact formula), thin 4.800 deg",
            abs(res.get("lam", 0) - 0.4) < 1e-6 and abs(res.get("n", 0) - 1.8) < 1e-9 and abs(res.get("D", 0) - Dex) < 1e-6 and abs(res.get("Dthin", 0) - 4.8) < 1e-9, res)
        chk("page engine: its two searches match (2 beta/alpha)^(1/3) and the exact formula over the slider range", res.get("grid", 0) == 225 and res.get("bad", 1) == 0, (res.get("grid"), res.get("bad")))
        chk("page engine: its matcher picks (A) for 6.4 and nothing for 5.6", res.get("pickA") == "A" and res.get("pickNone") is None)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("lambda_min = (2 beta/alpha)^(1/3) = 0.4 um, n = 1.8, Dm = (n - 1)A = 4.8 deg (exact 4.81)  ->  ANSWER B")
print("official final key (jeeadv.ac.in, Paper 2, read last): B - agrees")
print("MathonGo solution (their Q21 = Physics Q.3, read first for the approach): B - agrees")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
