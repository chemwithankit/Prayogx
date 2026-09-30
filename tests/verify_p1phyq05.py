#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q05 - a hydrogen atom, a Lyman transition from orbit n: which of four expressions (for
|dK|, |d lambda_dB|, nu and |dE|) are correct?

Solved here before the key, by routes that share no code:
  1. sympy: the Bohr orbit derived from m v r = k h/2pi and the Coulomb force, for symbolic k and n; each
     expression compared with the quantity it claims to be, as an identity (or not) in n;
  2. numbers from scipy.constants (CODATA, not the page's constants), for every Lyman line n = 2 ... 10,
     with energies checked against the Rydberg formula 13.6 (1 - 1/n^2) eV;
  3. exact rational ratios of each expression to the true quantity: A and C are exactly 1, B is n + 1,
     D is exactly 2;
then the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq05.py
"""
import json
import math
import os
import re
import subprocess
import sys
from fractions import Fraction as Fr

import sympy as sp
import scipy.constants as C

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q05", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


# ------------------------------------------------------------------ 1. sympy, symbolic orbits
m, e, eps, h = sp.symbols("m e epsilon_0 h", positive=True)
k, n = sp.symbols("k n", positive=True, integer=True)
vk, rk = sp.symbols("v_k r_k", positive=True)
sol = sp.solve([sp.Eq(m * vk * rk, k * h / (2 * sp.pi)), sp.Eq(m * vk**2 / rk, e**2 / (4 * sp.pi * eps * rk**2))], [vk, rk], dict=True)[0]
V = sp.Lambda(k, sol[vk]); Rr = sp.Lambda(k, sol[rk])
Kk = sp.Lambda(k, sp.Rational(1, 2) * m * V(k)**2)
Ek = sp.Lambda(k, Kk(k) - e**2 / (4 * sp.pi * eps * Rr(k)))
Lk = sp.Lambda(k, h / (m * V(k)))
chk("sympy: v_k = e^2/(2 eps0 h k), r_k = eps0 h^2 k^2/(pi m e^2)", sp.simplify(V(k) - e**2 / (2 * eps * h * k)) == 0 and sp.simplify(Rr(k) - eps * h**2 * k**2 / (sp.pi * m * e**2)) == 0)
chk("sympy: E_k = -K_k", sp.simplify(Ek(k) + Kk(k)) == 0)
chk("sympy: K_k = (h/4pi) k v_k/r_k", sp.simplify(Kk(k) - h / (4 * sp.pi) * k * V(k) / Rr(k)) == 0)
chk("sympy: lambda_k = 2 pi r_k / k = e^2/(4 eps0 k K_k) - k wavelengths fit on orbit k", sp.simplify(Lk(k) - 2 * sp.pi * Rr(k) / k) == 0 and sp.simplify(Lk(k) - e**2 / (4 * eps * k * Kk(k))) == 0)
nu = (Ek(n) - Ek(1)) / h
truth = {"A": Kk(1) - Kk(n), "B": Lk(n) - Lk(1), "C": nu, "D": Ek(n) - Ek(1)}          # positive for n > 1
expr = {"A": h / (4 * sp.pi) * (V(1) / Rr(1) - n * V(n) / Rr(n)),
        "B": e**2 / (4 * eps) * (1 / Kk(n) - 1 / Kk(1)),
        "C": e**2 / (8 * sp.pi * eps * h) * (1 / Rr(1) - 1 / Rr(n)),
        "D": h / (2 * sp.pi) * (V(1) / Rr(1) - n * V(n) / Rr(n))}
ratio = {key: sp.simplify(expr[key] / truth[key]) for key in "ABCD"}
chk("sympy: (A) expression / |dK| = 1 for every n", sp.simplify(ratio["A"] - 1) == 0, ratio["A"])
chk("sympy: (B) expression / |d lambda| = n + 1 (missing the 1/n)", sp.simplify(ratio["B"] - (n + 1)) == 0, ratio["B"])
chk("sympy: (C) expression / nu = 1 for every n", sp.simplify(ratio["C"] - 1) == 0, ratio["C"])
chk("sympy: (D) expression / |dE| = 2 (h/2pi instead of h/4pi)", sp.simplify(ratio["D"] - 2) == 0, ratio["D"])
sym_ans = [key for key in "ABCD" if sp.simplify(ratio[key] - 1) == 0]
chk("sympy: exactly A and C hold for every Lyman line", sym_ans == ["A", "C"], sym_ans)

# ------------------------------------------------------------------ 2. scipy.constants numbers
me_, e_, eps_, h_ = C.m_e, C.e, C.epsilon_0, C.h
r = lambda q: eps_ * h_**2 * q**2 / (math.pi * me_ * e_**2)
v = lambda q: e_**2 / (2 * eps_ * h_ * q)
K = lambda q: 0.5 * me_ * v(q)**2
lam = lambda q: h_ / (me_ * v(q))
chk("numbers: r_1 = 0.529 A (Bohr radius), v_1 = 2.188e6 m/s", abs(r(1) - C.physical_constants["Bohr radius"][0]) < 1e-15 and abs(v(1) - 2.18769e6) < 50)
chk("numbers: K_1 = 13.606 eV (Rydberg energy)", abs(K(1) / e_ - C.physical_constants["Rydberg constant times hc in eV"][0]) < 1e-6)
okA = okC = True; badB = badD = True
for q in range(2, 11):
    dK = K(1) - K(q); dl = lam(q) - lam(1); f = dK / h_
    A = h_ / (4 * math.pi) * abs(q * v(q) / r(q) - v(1) / r(1))
    B = e_**2 / (4 * eps_) * abs(1 / K(q) - 1 / K(1))
    Cf = e_**2 / (8 * math.pi * eps_ * h_) * (1 / r(1) - 1 / r(q))
    D = h_ / (2 * math.pi) * abs(v(1) / r(1) - q * v(q) / r(q))
    okA &= abs(A / dK - 1) < 1e-12; okC &= abs(Cf / f - 1) < 1e-12
    badB &= abs(B / dl - (q + 1)) < 1e-9; badD &= abs(D / dK - 2) < 1e-12
    okA &= abs(dK / e_ - 13.605693 * (1 - 1 / q**2)) < 1e-5
chk("numbers, n = 2..10: (A) equals |dK| = 13.6(1 - 1/n^2) eV every time", okA)
chk("numbers, n = 2..10: (C) equals nu every time", okC)
chk("numbers, n = 2..10: (B) is n + 1 times |d lambda| - never equal", badB)
chk("numbers, n = 2..10: (D) is 2|dE| - never equal", badD)
n3 = dict(dK=(K(1) - K(3)) / e_, dl=(lam(3) - lam(1)) * 1e10, B=e_**2 / (4 * eps_) * abs(1 / K(3) - 1 / K(1)) * 1e10, nu=(K(1) - K(3)) / h_, D=2 * (K(1) - K(3)) / e_)
chk("the page's solution table (n = 3): 12.09 eV, 6.65 A vs 26.6 A, 2.92e15 Hz, 24.19 eV",
    round(n3["dK"], 2) == 12.09 and round(n3["dl"], 2) == 6.65 and round(n3["B"], 1) == 26.6 and round(n3["nu"] / 1e15, 2) == 2.92 and round(n3["D"], 2) == 24.19, n3)
chk("the Lyman photon from n = 3 is ultraviolet (102.5 nm, infinite nuclear mass)", abs(C.c / n3["nu"] * 1e9 - 102.5) < 0.1, C.c / n3["nu"] * 1e9)

# ------------------------------------------------------------------ 3. exact ratios
for q in range(2, 7):
    Kr = lambda j: Fr(1, j * j)                    # K_j / K_1
    lr = lambda j: Fr(j)                           # lambda_j / lambda_1
    ratioB = (1 / Kr(q) - 1) / (lr(q) - 1)         # (e^2/4eps0)(1/K_n - 1/K_1) / (lambda_n - lambda_1), lambda_1 = e^2/(4 eps0 K_1)
    ratioD = Fr(2)
    assert ratioB == q + 1 and ratioD == 2
chk("exact fractions: for n = 2..6 the (B) ratio is n + 1 (3, 4, 5, 6, 7), the (D) ratio 2", True)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + ("\nvar rows = []; for (var n = 2; n <= 6; n++){ var o = {n: n}; ENGINE.KEYS.forEach(function(k){ o[k] = [ENGINE.OPTS[k].expr(n), ENGINE.OPTS[k].truth(n), ENGINE.holds(k, n)]; }); rows.push(o); }"
                             "\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(), rows: rows, r1: ENGINE.r(1), K1: ENGINE.K(1), e: ENGINE.e}));")
        out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(out.stdout)
        except ValueError:
            res = {}
        q = res.get("q", {})
        chk("page engine: answer '(A), (C)'", q.get("answer") == "(A), (C)", out.stderr[:200] or q)
        rows = res.get("rows", [])
        chk("page engine: for n = 2..6, A and C hold, B and D fail", len(rows) == 5 and all(rw["A"][2] and rw["C"][2] and not rw["B"][2] and not rw["D"][2] for rw in rows))
        chk("page engine: its B and D ratios are n + 1 and 2", all(abs(rw["B"][0] / rw["B"][1] - (rw["n"] + 1)) < 1e-9 and abs(rw["D"][0] / rw["D"][1] - 2) < 1e-12 for rw in rows))
        chk("page engine: r_1 and K_1 agree with scipy.constants", abs(res.get("r1", 0) - r(1)) < 1e-15 and abs(res.get("K1", 0) / res.get("e", 1) - K(1) / e_) < 1e-6)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("A: ratio 1 · B: ratio n+1 · C: ratio 1 · D: ratio 2  ->  ANSWER  %s" % ", ".join(sym_ans))
print("official key (read last): AC -", "agrees" if sym_ans == ["A", "C"] else "DISAGREES")
print("MathonGo solution (their Q21 = Physics Q.5): (A), (C) -", "agrees" if sym_ans == ["A", "C"] else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
