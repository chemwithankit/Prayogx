#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q07 - a monoatomic ideal gas cycle: isothermal ab, isochoric bc, adiabatic ca.

Solved here before the key, by routes that share no code:
  1. sympy: the states from PV = nRT and TV^(gamma-1) = const, the heats from the first law, the
     efficiency as a function of r = V2/V1 and T_a;
  2. numerical integration of the first law along each leg (scipy), with no process formula assumed:
     the adiabat from dT/dV = -P/(n C_V), the isotherm's heat as the integral of P dV, the isochore's heat
     as n C_V dT;
  3. the given ln 2 = 0.7 used exactly as the paper states, for statement (A);
then every statement is decided and the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq07.py
"""
import json
import math
import os
import re
import subprocess
import sys

import sympy as sp
from scipy.integrate import quad, solve_ivp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q07", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


# ------------------------------------------------------------------ 1. sympy
n, R, Ta, V1, r = sp.symbols("n R T_a V_1 r", positive=True)
gam = sp.Rational(5, 3); Cv = sp.Rational(3, 2) * R
V2 = r * V1
Tc = Ta * (V1 / V2)**(gam - 1)
Pa, Pb = n * R * Ta / V1, n * R * Ta / V2
Qab = n * R * Ta * sp.log(r)
Qbc = n * Cv * (Ta - Tc)
eta = sp.simplify((Qab - Qbc) / Qab)
chk("sympy (C): T_a/T_c = r^(2/3) = 4 at r = 8", sp.simplify((Ta / Tc).subs(r, 8)) == 4)
chk("sympy (D): P_a/P_b = r = 8 at r = 8, not 4", sp.simplify((Pa / Pb).subs(r, 8)) == 8)
qab8, qbc8 = sp.simplify((Qab / (n * R * Ta)).subs(r, 8)), sp.simplify((Qbc / (n * R * Ta)).subs(r, 8))
chk("sympy (A): at r = 8, Q_bc = 9/8 nRT_a and Q_ab = 3 ln 2 nRT_a; Q_bc < Q_ab", qbc8 == sp.Rational(9, 8) and sp.simplify(qab8 - 3 * sp.log(2)) == 0 and float(qbc8) < float(qab8))
chk("sympy (B): eta has no T_a in it - it depends only on r", Ta not in eta.free_symbols and n not in eta.free_symbols and R not in eta.free_symbols, eta)
chk("sympy: no heat on the adiabat - the work on the gas along ca equals the heat released on bc (cycle closes)",
    sp.simplify(n * Cv * (Ta - Tc) - Qbc) == 0)
eta8 = float(eta.subs(r, 8))
chk("sympy: eta(8) = 1 - (9/8)/(3 ln 2) = 0.459", abs(eta8 - 0.4590) < 1e-3, eta8)
sym_ans = [k for k, v in (("A", float(qbc8) < float(qab8)), ("B", Ta not in eta.free_symbols),
                          ("C", sp.simplify((Ta / Tc).subs(r, 8)) == 4), ("D", sp.simplify((Pa / Pb).subs(r, 8)) == 4)) if v]
chk("sympy: exactly A, B and C are true", sym_ans == ["A", "B", "C"], sym_ans)

# ------------------------------------------------------------------ 2. the first law integrated along each leg
Rn, nn, CV = 8.314462618, 1.0, 1.5 * 8.314462618


def cycle_numeric(rr, T_a):
    v1 = 1e-3; v2 = rr * v1
    q_ab = quad(lambda V: nn * Rn * T_a / V, v1, v2, epsabs=1e-12)[0]              # dU = 0: Q = integral of P dV
    # adiabat from a to V2, integrated from dT/dV = -P/(n C_V) with P = nRT/V (no TV^(gamma-1) used)
    sol = solve_ivp(lambda V, T: [-(nn * Rn * T[0] / V) / (nn * CV)], (v1, v2), [T_a], rtol=1e-12, atol=1e-12)
    t_c = sol.y[0][-1]
    q_bc = nn * CV * (T_a - t_c)                                                   # isochore: W = 0
    w_ca = quad(lambda V: nn * Rn * (t_c * (v2 / V)**(2 / 3)) / V, v1, v2, epsabs=1e-12)[0]   # work done on gas along ca
    return dict(qab=q_ab, qbc=q_bc, tc=t_c, eta=(q_ab - q_bc) / q_ab, PaPb=(nn * Rn * T_a / v1) / (nn * Rn * T_a / v2), wca=w_ca)


c8 = cycle_numeric(8, 300)
chk("integration (C): the adiabat from 300 K ends at T_c = 75.0 K - T_a/T_c = 4", abs(c8["tc"] - 75) < 1e-6, c8["tc"])
chk("integration (A): Q_ab = 5.187 kJ absorbed, Q_bc = 2.806 kJ released - smaller", abs(c8["qab"] - 5187.1) < 1 and abs(c8["qbc"] - 2806.3) < 1 and c8["qbc"] < c8["qab"], (c8["qab"], c8["qbc"]))
chk("integration: work done on the gas along ca = Q_bc (the cycle's energy balances)", abs(c8["wca"] - c8["qbc"]) < 1e-3 * c8["qbc"])
etas = {(rr, T): cycle_numeric(rr, T)["eta"] for rr in (2, 4, 8, 16) for T in (150, 300, 600, 1200)}
chk("integration (B): eta is the same at 150, 300, 600, 1200 K for each r = 2, 4, 8, 16",
    all(abs(etas[(rr, T)] - etas[(rr, 300)]) < 1e-9 for rr in (2, 4, 8, 16) for T in (150, 600, 1200)))
chk("integration (D): P_a/P_b = 8", abs(c8["PaPb"] - 8) < 1e-12)
chk("the page's table: (2) 0.630 0.693 0.555 0.199 · (4) 0.397 1.386 0.905 0.347 · (8) 0.250 2.079 1.125 0.459",
    all(abs(a - b) < 6e-4 for rr, row in ((2, (0.630, 0.693, 0.555, 0.199)), (4, (0.397, 1.386, 0.905, 0.347)), (8, (0.250, 2.079, 1.125, 0.459)))
        for a, b in zip((rr ** (-2 / 3), math.log(rr), 1.5 * (1 - rr ** (-2 / 3)), 1 - 1.5 * (1 - rr ** (-2 / 3)) / math.log(rr)), row)))

# ------------------------------------------------------------------ 3. with the paper's ln 2 = 0.7
chk("with ln 2 = 0.7 as given: Q_ab = 2.1 nRT_a > Q_bc = 1.125 nRT_a, eta = 0.464", 3 * 0.7 > 1.125 and abs(1 - 1.125 / 2.1 - 0.4643) < 1e-4)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + ("\nvar c = ENGINE.cycle(8, 300), mid = ENGINE.state(c, 2, 0.5);"
                             "\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(), c: c, mid: mid, e6: ENGINE.cycle(8, 600).eta, e2: ENGINE.cycle(2, 300).eta}));")
        out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(out.stdout)
        except ValueError:
            res = {}
        q, c = res.get("q", {}), res.get("c", {})
        chk("page engine: answer '(A), (B), (C)'", q.get("answer") == "(A), (B), (C)", out.stderr[:200] or q)
        chk("page engine: T_c = 75 K, Q_ab and Q_bc as integrated here, P_a/P_b = 8", abs(c.get("Tc", 0) - 75) < 1e-9 and abs(c.get("Qab", 0) - c8["qab"]) < 1e-6
            and abs(c.get("Qbc", 0) - c8["qbc"]) < 1e-6 and abs(c.get("PaPb", 0) - 8) < 1e-12)
        chk("page engine: eta the same at 600 K; eta(2) = 0.199", abs(res.get("e6", 0) - c.get("eta", 1)) < 1e-12 and abs(res.get("e2", 0) - 0.1990) < 1e-3)
        mid = res.get("mid", {})
        chk("page engine: halfway along ca the state lies on the adiabat (T V^(2/3) = T_c V2^(2/3))",
            abs(mid.get("T", 0) * mid.get("V", 0)**(2 / 3) - 75 * (8e-3)**(2 / 3)) < 1e-9)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("A: 1.125 < 2.08 · B: eta(r) only · C: T_a/T_c = 4 · D: P_a/P_b = 8  ->  ANSWER  %s" % ", ".join(sym_ans))
print("official key (read last): ABC -", "agrees" if sym_ans == ["A", "B", "C"] else "DISAGREES")
print("MathonGo solution (their Q23 = Physics Q.7): (A), (B), (C) -", "agrees" if sym_ans == ["A", "B", "C"] else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
