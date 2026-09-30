#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q11 - an insulated container: S1 (1 mol monoatomic gas, fixed volume) and S2 (1 mol,
held at atmospheric pressure by a free insulated piston) joined by a conducting partition (K, A, x).
The time for the temperature gap to halve is n xR/KA; find n (ln 2 = 0.7 given).

Solved here before the key, by routes that share no code:
  1. sympy: C_V dT1/dt = -H, C_P dT2/dt = +H, H = KA(T1 - T2)/x; the gap ODE solved exactly;
  2. first law integrated numerically for each gas with the piston's work computed from P dV (no C_P used:
     S2's heat goes into dU = (3/2)R dT2 plus P dV with V from PV = RT at fixed P), half-time found from the numbers;
  3. energy bookkeeping: heat out of S1 equals heat into S2, and S2's heat splits 3:2 between internal energy and work;
then the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq11.py
"""
import json
import math
import os
import re
import subprocess
import sys

import sympy as sp
from scipy.integrate import solve_ivp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q11", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


# ------------------------------------------------------------------ 1. sympy
t, K, A, x, R, dT0 = sp.symbols("t K A x R Delta_T0", positive=True)
Cv, Cp = sp.Rational(3, 2) * R, sp.Rational(5, 2) * R
kr = sp.simplify((K * A / x) * (1 / Cv + 1 / Cp))
chk("sympy: the gap decays at rate (KA/x)(1/C_V + 1/C_P) = (16/15) KA/(xR)", sp.simplify(kr - sp.Rational(16, 15) * K * A / (x * R)) == 0, kr)
D = sp.Function("D")
solD = sp.dsolve(sp.Eq(D(t).diff(t), -kr * D(t)), D(t), ics={D(0): dT0}).rhs
thalf = sp.solve(sp.Eq(solD, dT0 / 2), t)[0]
n_exact = sp.simplify(thalf / (x * R / (K * A)))
chk("sympy: t_half = (15/16) ln 2 xR/KA", sp.simplify(n_exact - sp.Rational(15, 16) * sp.log(2)) == 0, n_exact)
n_given = float(sp.Rational(15, 16) * sp.Rational(7, 10))
chk("with the given ln 2 = 0.7: n = 0.65625 -> 0.66", abs(n_given - 0.65625) < 1e-15 and round(n_given, 2) == 0.66)
chk("with the exact ln 2: n = 0.6498, also inside the key's [0.63, 0.70]", abs(float(n_exact) - 0.64983) < 1e-4 and 0.63 <= float(n_exact) <= 0.70 and 0.63 <= n_given <= 0.70)
nlock = sp.Rational(3, 4) * sp.log(2)
chk("control: with the piston locked (both C_V) the rate is 4/3 and n = (3/4) ln 2 = 0.52 - outside the key (the free piston matters)", abs(float(nlock) - 0.5199) < 1e-4 and not (0.63 <= float(nlock) <= 0.70))

# ------------------------------------------------------------------ 2. first law with P dV
Rg = 8.314462618
P_atm = 101325.0
KA_x = 2.0                                    # W/K, any value


def rhs(tt, y):
    T1, T2 = y
    H = KA_x * (T1 - T2)
    dT1 = -H / (1.5 * Rg)                     # S1: fixed volume, all heat to internal energy
    # S2: dU + P dV = H with U = (3/2) R T2 and V = R T2/P  ->  (3/2) R dT2 + P (R/P) dT2 = H
    dV_dT = Rg / P_atm
    dT2 = H / (1.5 * Rg + P_atm * dV_dT)
    return [dT1, dT2]


def half_time(T1, T2):
    g0 = T1 - T2
    ev = lambda tt, y: (y[0] - y[1]) - g0 / 2
    ev.terminal, ev.direction = True, -1
    out = solve_ivp(rhs, (0, 100), [T1, T2], events=ev, rtol=1e-12, atol=1e-12)
    return out.t_events[0][0]


unit = Rg / KA_x                              # xR/KA with x/KA folded into KA_x
th1 = half_time(400.0, 300.0) / unit
th2 = half_time(350.0, 300.0) / unit
chk("first law with P dV (no C_P assumed): t_half = 0.6498 xR/KA", abs(th1 - 15 / 16 * math.log(2)) < 1e-8, th1)
chk("...and the same for a 50 K initial gap (n does not depend on the gap)", abs(th2 - th1) < 1e-9)
out = solve_ivp(rhs, (0, 20 * unit), [400.0, 300.0], rtol=1e-12, atol=1e-12, dense_output=True)
T1e, T2e = out.y[0][-1], out.y[1][-1]
q_out = 1.5 * Rg * (400 - T1e); dU2 = 1.5 * Rg * (T2e - 300); W2 = P_atm * (Rg * T2e / P_atm - Rg * 300 / P_atm)
chk("energy: heat out of S1 = heat into S2 = dU2 + P dV2", abs(q_out - (dU2 + W2)) < 1e-6 * q_out)
chk("...S2's heat splits 3:2 between internal energy and the work on the piston", abs(dU2 / W2 - 1.5) < 1e-9)
chk("final common temperature (3/2 * 400 + 5/2 * 300)/4 = 337.5 K", abs(T1e - 337.5) < 0.01 and abs(T2e - 337.5) < 0.01, (T1e, T2e))

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + "\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(), lock: ENGINE.halfTime(400, 300, true), g50: ENGINE.halfTime(350, 300, false)}));"
        o = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(o.stdout)
        except ValueError:
            res = {}
        q = res.get("q", {})
        chk("page engine: answer '0.66' (n with ln 2 = 0.7), rate 16/15, inside the key", q.get("answer") == "0.66" and abs(q.get("k", 0) - 16 / 15) < 1e-7 and q.get("inKey") is True, o.stderr[:200] or q)
        chk("page engine: its t_half = 0.6498 agrees with the P dV integration", abs(q.get("th", 0) - th1) < 1e-6)
        chk("page engine: locked piston 0.5199; 50 K gap the same t_half", abs(res.get("lock", 0) - float(nlock)) < 1e-6 and abs(res.get("g50", 0) - th1) < 1e-6)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("dDT/dt = -(16/15)(KA/xR) DT  ->  n = (15/16) ln 2 = 0.656 (ln 2 = 0.7) / 0.650 (exact)  ->  ANSWER 0.66")
print("official key (read last): [0.63 to 0.70] - agrees")
print("MathonGo solution (their Q27 = Physics Q.11): 0.66 - agrees")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
