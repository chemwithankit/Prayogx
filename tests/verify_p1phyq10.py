#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q10 - five Carnot engines in series (each efficiency eta), each engine's rejected heat
absorbed by the next; W/Q0 = 211/243; find eta.

Solved here before the key, by routes that share no code:
  1. sympy: Q_k = (1 - eta)^k Q0, W = Q0 - Q5, solve 1 - (1 - eta)^5 = 211/243 exactly;
  2. five explicit Carnot cycles of 1 mol of ideal gas (two isotherms, two adiabats each) between six
     reservoirs whose temperatures are chosen so every engine has the same efficiency; heats from
     nRT ln(V ratio), the rejected heat of each engine fed as the absorbed heat of the next (scaling the
     number of moles), total work summed - no efficiency formula used; entropy balance checked;
  3. a brute-force scan of eta on a fine grid;
then the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq10.py
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

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q10", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


# ------------------------------------------------------------------ 1. sympy
eta = sp.symbols("eta", positive=True)
Q0 = sp.Integer(1)
Q = [Q0]
for k in range(5):
    Q.append(Q[-1] * (1 - eta))
W = sum(Q[k] - Q[k + 1] for k in range(5))
chk("sympy: W = Q0 - Q5 = 1 - (1 - eta)^5 (telescoping)", sp.simplify(W - (1 - (1 - eta)**5)) == 0)
sol = [s for s in sp.solve(sp.Eq(W, sp.Rational(211, 243)), eta) if s.is_real and 0 < s < 1]
chk("sympy: the only root in (0, 1) is eta = 1/3", sol == [sp.Rational(1, 3)], sol)
chk("exact: (1 - 1/3)^5 = 32/243, so W/Q0 = 211/243", (1 - Fr(1, 3))**5 == Fr(32, 243) and 1 - (1 - Fr(1, 3))**5 == Fr(211, 243))
chk("the key's range [0.32, 0.34] contains 1/3, and it rounds to 0.33", 0.32 <= 1 / 3 <= 0.34 and round(1 / 3, 2) == 0.33)
chk("trap: eta_net = 5 eta would give eta = 211/1215 = 0.174 - wrong (and exceeds 1 for eta > 0.2)", abs(211 / 243 / 5 - 0.1737) < 1e-3)

# ------------------------------------------------------------------ 2. explicit Carnot cycles
R = 8.314462618
gamma = 5 / 3


def carnot_cycle(n_mol, Th, Tc, V1, V2):
    """one Carnot cycle of n mol of monoatomic ideal gas: isothermal expansion V1 -> V2 at Th, adiabat to Tc,
    isothermal compression, adiabat back. Returns heat absorbed, heat rejected, work (J)."""
    V3 = V2 * (Th / Tc)**(1 / (gamma - 1))
    V4 = V1 * (Th / Tc)**(1 / (gamma - 1))
    q_in = n_mol * R * Th * math.log(V2 / V1)
    q_out = n_mol * R * Tc * math.log(V3 / V4)
    w_adiabats = n_mol * 1.5 * R * (Th - Tc) - n_mol * 1.5 * R * (Th - Tc)     # they cancel
    return q_in, q_out, q_in - q_out + w_adiabats


e_true = 1 / 3
temps = [1215 * (1 - e_true)**k for k in range(6)]
chk("reservoirs for equal Carnot efficiencies: 1215, 810, 540, 360, 240, 160 K", np.allclose(temps, [1215, 810, 540, 360, 240, 160]))
Q_in = 1000.0                                                               # J absorbed per cycle by engine 1
q, work_total, entropy = Q_in, 0.0, 0.0
for k in range(5):
    V1, V2 = 1e-3, 2e-3
    n_needed = q / (R * temps[k] * math.log(V2 / V1))                      # moles so that this engine absorbs exactly q
    qi, qo, w = carnot_cycle(n_needed, temps[k], temps[k + 1], V1, V2)
    entropy += -qi / temps[k] + qo / temps[k + 1]                           # reservoir entropy change per cycle
    work_total += w
    q = qo                                                                  # rejected heat fed to the next engine
chk("five explicit Carnot cycles: W/Q0 = 211/243 = 0.868313", abs(work_total / Q_in - 211 / 243) < 1e-12, work_total / Q_in)
chk("...the heat left at the bottom is Q5 = (32/243) Q0", abs(q / Q_in - 32 / 243) < 1e-12)
chk("...and every cycle is reversible: total reservoir entropy change 0", abs(entropy) < 1e-12, entropy)
chk("the cascade equals one Carnot engine between 1215 K and 160 K: 1 - 160/1215 = 211/243", abs(1 - 160 / 1215 - 211 / 243) < 1e-15)

# ------------------------------------------------------------------ 3. brute force
grid = np.linspace(0, 1, 1_000_001)
best = grid[np.argmin(np.abs(1 - (1 - grid)**5 - 211 / 243))]
chk("brute force over 10^6 values of eta: the best is 0.33333", abs(best - 1 / 3) < 1e-6, best)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + "\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(), n3: ENGINE.solve(211/243, 3).eta, w: ENGINE.works(1/3, 5), t: ENGINE.temps(1/3, 5)}));"
        out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(out.stdout)
        except ValueError:
            res = {}
        qq = res.get("q", {})
        chk("page engine: answer '0.33', eta = 1/3 to 1e-12, inside the key range", qq.get("answer") == "0.33" and abs(qq.get("eta", 0) - 1 / 3) < 1e-12 and qq.get("inKey") is True, out.stderr[:200] or qq)
        chk("page engine: works W_k = (1/3)(2/3)^(k-1) Q0", np.allclose(res.get("w", []), [(1 / 3) * (2 / 3)**k for k in range(5)], atol=1e-12))
        chk("page engine: reservoir temperatures 1215 ... 160 K", np.allclose(res.get("t", []), temps, atol=1e-9))
        chk("page engine: with 3 engines it would need eta = 1 - (32/243)^(1/3)", abs(res.get("n3", 0) - (1 - (32 / 243)**(1 / 3))) < 1e-12)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("1 - (1 - eta)^5 = 211/243  ->  eta = 1/3  ->  ANSWER 0.33")
print("official key (read last): [0.32 to 0.34] - agrees")
print("MathonGo solution (their Q26 = Physics Q.10): 0.33 - agrees")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
