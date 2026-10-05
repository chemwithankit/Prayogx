#!/usr/bin/env python3
"""CON-CHE-CALORIMETER-01 - how does a calorimeter work? (a concept exploration; NCERT Class 11 Chemistry §5.2.2(c), §5.3).

The page uses one simple dataset: a reaction gives out 2100 J; water's c = 4.2 J g-1 °C-1 (NCERT, Problem 5.8);
the water starts at 25.0 °C; ΔT = Q (1 - loss) / (m c); q = m c ΔT. Checked here independently in exact arithmetic,
then the page's ENGINE (between ENGINE-BEGIN and ENGINE-END) is run in Node and compared.

Run:  tests/.venv/bin/python tests/verify_con_che_calorimeter_01.py
"""
import json
import os
import re
import subprocess
import sys
from fractions import Fraction as F

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "concepts", "chemistry", "con-che-calorimeter-01", "index.html")
ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or not detail else "  -> " + str(detail)))


C, T0, Q, LOSS = F(42, 10), F(25), F(2100), F(3, 10)


def dT(q, m, loss=0):
    return q * (1 - loss) / (m * C)


chk("scene 6: 200 g of water warms from 25.0 to 27.5 °C", T0 + dT(Q, 200) == F(55, 2))
chk("scene 10: poorly insulated (30 % lost) the rise is only 1.75 °C, and q = mcΔT would give 1470 J", dT(Q, 200, LOSS) == F(7, 4) and 200 * C * dT(Q, 200, LOSS) == 1470)
chk("scene 8: 100 / 200 / 400 g give 5.00 / 2.50 / 1.25 °C - more water, smaller rise",
    [dT(Q, m) for m in (100, 200, 400)] == [5, F(5, 2), F(5, 4)])
chk("scene 8: m × ΔT is the same for every amount (the same heat)", len({m * dT(Q, m) for m in (100, 200, 400)}) == 1)
chk("scene 9: q = m c ΔT = 200 × 4.2 × 2.5 = 2100 J = 2.1 kJ (the target)", 200 * C * F(5, 2) == Q and float(Q / 1000) == 2.1)
chk("scene 9: the slider range (0.5-5 °C) and the three masses give whole joules", all((m * C * F(k, 2)).denominator == 1 for m in (100, 200, 400) for k in range(1, 11)))
chk("the specific heat capacity is NCERT's 4.2 J g⁻¹ °C⁻¹ (Problem 5.8)", C == F(21, 5))
# scenes 11-12: zinc with dilute acid, Zn(s) + 2H+(aq) -> Zn2+(aq) + H2(g). Standard enthalpies of formation:
# Zn2+(aq) -153.89 kJ/mol, the rest 0, so dH = -153.89 kJ/mol; dn_g = +1, so dU = dH - dn_g R T.
R_, T298, DH = F(8314, 1000), F(29815, 100), F(-153890)
DU = DH - 1 * R_ * T298
chk("zinc + acid: dn_g = +1, so dU = dH - RT is more negative than dH (more heat out when sealed and rigid)", DU < DH < 0)
gap = 1 - DH / DU
chk("...the true gap between the constant-pressure and constant-volume heats is about 2 %% (%.2f %%)" % float(gap * 100), F(1, 100) < gap < F(25, 1000))

src = open(PAGE, encoding="utf-8").read()
m = re.search(r"/\* ENGINE-BEGIN \*/(.*?)/\* ENGINE-END \*/", src, re.S)
chk("the page has an ENGINE block", bool(m))
js = m.group(1) + """
var E = ENGINE, out = { c: E.C, t0: E.T0, q: E.Q, loss: E.LOSS,
  d200: E.dT(E.Q, 200, 0), dLoss: E.dT(E.Q, 200, E.LOSS), d100: E.dT(E.Q, 100, 0), d400: E.dT(E.Q, 400, 0),
  heat: E.heat(200, E.dT(E.Q, 200, 0)), ex: [E.EX.C.dng, E.EX.H.dng, E.EX.K.dng], dtv: E.DTV, dtp: E.DTP };
process.stdout.write(JSON.stringify(out));"""
r = subprocess.run(["node", "-e", js], capture_output=True, text=True)
chk("the page's ENGINE runs in Node", r.returncode == 0, r.stderr[:300])
pg = json.loads(r.stdout) if r.returncode == 0 else {}
want = {"dtv": 2.0, "dtp": 1.6, "c": 4.2, "t0": 25, "q": 2100, "loss": 0.3, "d200": 2.5, "dLoss": 1.75, "d100": 5, "d400": 1.25, "heat": 2100}
chk("page = verifier for every quantity", all(abs(pg.get(k, 1e9) - v) < 1e-9 for k, v in want.items()), pg)
chk("the page's bath readings: 1.6 °C under the piston < 2.0 °C sealed, as the sign of dn_g requires", pg.get("dtp", 9) < pg.get("dtv", 0))
chk("the three reactions: Δn_g = 0, −1.5, +1 (gases only: C(s), H₂O(l), CaCO₃(s), CaO(s) do not count)", pg.get("ex") == [0, -1.5, 1], pg.get("ex"))

print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
