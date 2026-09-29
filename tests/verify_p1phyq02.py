#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q02 - an LC circuit whose coil holds a shorted inner coil: the resonant frequency.

A long coil (N turns per unit length, area S, length d, self-inductance L) is in series with a capacitor C.
Inside it sits a coil of length d/2, area S/2 and 2N turns per unit length, its ends joined by a wire.
No resistance anywhere. Find the resonant (angular) frequency.

Solved here before the key, by routes that share no code:
  1. sympy: solenoid inductances L1, L2 and M from mu0 n^2 A l and mu0 n1 n2 A l; the shorted coil's
     EMF is zero (L2 dI2/dt + M dI1/dt = 0), so L_eff = L1 - M^2/L2 and omega = 1/sqrt(L_eff C);
  2. the coupled circuit integrated numerically (scipy, with the two coil equations as written, no L_eff),
     the period measured from the charge's zero crossings;
  3. field energy: the field in every region worked out from Ampere's law with the inner coil's current
     fixed by flux conservation, the energy integral B^2/2 mu0 dV taken over the volumes, L_eff = 2U/I1^2;
then every printed option audited (the L_eff each implies), controls, and the page's engine in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq02.py
"""
import json
import math
import os
import re
import subprocess
import sys

import numpy as np
import sympy as sp
from scipy.integrate import solve_ivp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q02", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


# the options exactly as printed, as omega sqrt(LC)
OPTIONS = {"A": 4 / math.sqrt(15), "B": 6 / math.sqrt(5), "C": 2 / math.sqrt(3), "D": math.sqrt(2 / 3)}

# ------------------------------------------------------------------ 1. sympy
mu0, N, S, d, C = sp.symbols("mu0 N S d C", positive=True)
L1 = mu0 * N**2 * S * d                                   # long solenoid: mu0 n^2 A l
L2 = mu0 * (2 * N)**2 * (S / 2) * (d / 2)
M = mu0 * N * (2 * N) * (S / 2) * (d / 2)                 # outer field mu0 N I1 through the inner coil's 2N (d/2) turns of area S/2
L = sp.symbols("L", positive=True)
chk("sympy: L2 = L1 = L (2N, S/2, d/2 - the same N d turns on half the area)", sp.simplify(L2 - L1) == 0)
chk("sympy: M = L/2", sp.simplify(M - L1 / 2) == 0)
i1, i2 = sp.symbols("i1dot i2dot")
sol = sp.solve([sp.Eq(L2 * i2 + M * i1, 0)], [i2])        # shorted, R = 0: zero EMF round the inner coil
Leff = sp.simplify((L1 * i1 + M * sol[i2]) / i1)          # voltage across the outer coil per unit dI1/dt
chk("sympy: L_eff = L1 - M^2/L2 = 3L/4", sp.simplify(Leff - sp.Rational(3, 4) * L1) == 0, Leff)
omega = sp.simplify(1 / sp.sqrt(sp.simplify(Leff / L1) * L * C))    # the derived L_eff, written in units of L
chk("sympy: omega = 1/sqrt(L_eff C) = 2/sqrt(3LC)", sp.simplify(omega - 2 / sp.sqrt(3 * L * C)) == 0, omega)
w_model = 2 / math.sqrt(3)
match = [k for k, v in OPTIONS.items() if abs(v - w_model) < 1e-12]
chk("exactly one option equals it, and it is C", match == ["C"], match)
chk("coupling: k^2 = M^2/(L1 L2) = 1/4 - the fraction of the volume the inner coil fills", sp.simplify(M**2 / (L1 * L2) - sp.Rational(1, 4)) == 0)

# ------------------------------------------------------------------ 2. the coupled circuit, integrated
def circuit_omega(L1v=1.0, L2v=1.0, Mv=0.5, Cv=1.0, shorted=True, T=60.0):
    """State (q, i1, i2): L1 i1' + M i2' = -q/C ; M i1' + L2 i2' = 0 (shorted) or i2 = 0 (open). Returns omega from the period."""
    A = np.array([[L1v, Mv], [Mv, L2v]])
    def f(t, y):
        q, a, b = y
        if shorted:
            di1, di2 = np.linalg.solve(A, [-q / Cv, 0.0])
        else:
            di1, di2 = -q / (Cv * L1v), 0.0
        return [a, di1, di2]
    s = solve_ivp(f, (0, T), [1.0, 0.0, 0.0], max_step=0.002, rtol=1e-11, atol=1e-12, dense_output=True)
    t = np.linspace(0, T, int(T * 2500) + 1)
    q = s.sol(t)[0]
    up = [t[i] - q[i] * (t[i + 1] - t[i]) / (q[i + 1] - q[i]) for i in range(len(q) - 1) if q[i] < 0 <= q[i + 1]]
    period = (up[-1] - up[0]) / (len(up) - 1)
    i1 = s.sol(t)[1]; i2 = s.sol(t)[2]
    ratio = np.polyfit(i1, i2, 1)[0] if shorted else 0.0
    energy = 0.5 * q**2 / Cv + 0.5 * L1v * i1**2 + (Mv * i1 * i2 + 0.5 * L2v * i2**2 if shorted else 0)
    return 2 * math.pi / period, ratio, float(np.max(energy) - np.min(energy))


w_num, r12, dE = circuit_omega()
chk("integrated circuit: omega sqrt(LC) = %.6f = 2/sqrt(3)" % w_num, abs(w_num - w_model) < 1e-5, w_num)
chk("integrated circuit: I2 = -I1/2 all the time", abs(r12 + 0.5) < 1e-6, r12)
chk("integrated circuit: energy conserved (no resistance)", dE < 1e-6, dE)
w_open, _, _ = circuit_omega(shorted=False)
chk("control, inner coil open: omega sqrt(LC) = 1 (no option)", abs(w_open - 1) < 1e-5 and all(abs(v - 1) > 1e-3 for v in OPTIONS.values()), w_open)
chk("the short raises the frequency by 2/sqrt(3) = 1.1547 (period x sqrt(3)/2)", abs(w_num / w_open - 2 / math.sqrt(3)) < 1e-5)

# ------------------------------------------------------------------ 3. field energy over the volume
def field_energy_L(n=1.0, m=2.0, a=0.5, l=0.5):
    """Units: mu0 = S = d = I1 = 1. Inner current from flux conservation: its flux linkage m n (l d)(a S) B_in stays 0.
    Ampere: outside the inner coil B = n I1 (its field is confined inside it); inside B_in = n I1 + m n I2.
    Returns L_eff = 2U/I1^2 and I2 (so that B_in = 0 is found, not assumed)."""
    I2 = sp.symbols("I2")
    Bin = n * 1 + m * n * I2
    I2v = sp.solve(sp.Eq(m * n * l * a * Bin, 0), I2)[0]
    Bin_v = float(Bin.subs(I2, I2v))
    Bout = n * 1
    vol_in, vol_out = a * l, 1 - a * l
    U = 0.5 * (Bout**2 * vol_out + Bin_v**2 * vol_in)
    return 2 * U, float(I2v), Bin_v


Lfield, I2f, Bin = field_energy_L()
chk("field energy: flux conservation gives I2 = -I1/2 and B = 0 inside the inner coil", abs(I2f + 0.5) < 1e-12 and abs(Bin) < 1e-12, (I2f, Bin))
chk("field energy: the field fills 3/4 of the volume, so L_eff = 2U/I1^2 = 3L/4", abs(Lfield - 0.75) < 1e-12, Lfield)
chk("field energy agrees with the circuit route", abs(1 / math.sqrt(Lfield) - w_num) < 1e-5)

# ------------------------------------------------------------------ every option
implied = {k: 1 / v**2 for k, v in OPTIONS.items()}      # L_eff / L that each option implies
print("omega sqrt(LC) by option:", ", ".join("%s %.4f (L_eff %.4f L)" % (k, OPTIONS[k], implied[k]) for k in "ABCD"))
chk("A implies L_eff = 15L/16: removing 1/16 of the volume (area and length fractions squared)", abs(implied["A"] - 15 / 16) < 1e-12)
chk("B implies L_eff = 5L/36: no flux argument gives it", abs(implied["B"] - 5 / 36) < 1e-12)
chk("C implies L_eff = 3L/4: correct", abs(implied["C"] - 0.75) < 1e-12)
chk("D implies L_eff = 3L/2 = L + M: the induced current's sign reversed (aiding, not opposing)", abs(implied["D"] - 1.5) < 1e-12)
chk("only C lies within 0.01 % of the integrated circuit", [k for k in "ABCD" if abs(OPTIONS[k] - w_num) / w_num < 1e-4] == ["C"])

# ------------------------------------------------------------------ controls: the general law L_eff = L(1 - a l), any m
for m, a, l in ((1, 0.5, 0.5), (3, 0.5, 0.5), (2, 0.25, 1.0), (2, 1.0, 0.3), (0.5, 0.8, 0.8)):
    L2v, Mv = m * m * a * l, m * a * l
    wn, _, _ = circuit_omega(L1v=1.0, L2v=L2v, Mv=Mv, T=50.0)
    Lf, _, _ = field_energy_L(m=m, a=a, l=l)
    chk("control m = %s, a = %s, l = %s: circuit and field both give omega = 1/sqrt(1 - a l)" % (m, a, l),
        abs(wn - 1 / math.sqrt(1 - a * l)) < 2e-5 and abs(Lf - (1 - a * l)) < 1e-12, "%.6f" % wn)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + "\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(ENGINE.Q), open: ENGINE.run({m: 2, a: 0.5, l: 0.5, mode: 'open'}), g: ENGINE.run({m: 3, a: 0.25, l: 1, mode: 'short'})}));"
        out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(out.stdout)
        except ValueError:
            res = {}
        q = res.get("q", {})
        chk("page engine: answer C", q.get("answer") == "C", out.stderr[:200] or q.get("answer"))
        chk("page engine: L2 = L, M = L/2, L_eff = 3L/4", abs(q.get("L2", 0) - 1) < 1e-12 and abs(q.get("M", 0) - 0.5) < 1e-12 and abs(q.get("Leff", 0) - 0.75) < 1e-12)
        chk("page engine: omega sqrt(LC) = 2/sqrt(3)", abs(q.get("w", 0) - w_model) < 1e-12, q.get("w"))
        chk("page engine: its own circuit integration agrees", abs(q.get("wNum", 0) - w_model) < 2e-4, q.get("wNum"))
        chk("page engine: its field-energy route gives B = 0 inside and 3L/4", abs(q.get("Bin", 1)) < 1e-12 and abs(q.get("LeffField", 0) - 0.75) < 1e-12)
        chk("page engine: every option judged as here", [o.get("ok") for o in q.get("options", [])] == [False, False, True, False])
        op = res.get("open", {})
        chk("page engine, inner coil open: omega sqrt(LC) = 1, not the question", abs(op.get("w", 0) - 1) < 1e-12 and op.get("complete") is False)
        g = res.get("g", {})
        chk("page engine, m = 3, a = 1/4, l = 1: L_eff = 3L/4 again (turns do not matter)", abs(g.get("Leff", 0) - 0.75) < 1e-12 and g.get("complete") is False)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("omega = 1/sqrt(3LC/4) = 2/sqrt(3LC)  ->  ANSWER  %s" % ("C" if match == ["C"] else "?"))
print("official key (read last): C -", "agrees" if match == ["C"] else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
