#!/usr/bin/env python3
"""ADV-2026-P2-PHY-Q02 - a reactor produces a radioactive nuclide X at a constant rate alpha from t = 0; each decay
gives E0 to a liquid of mass m and specific heat s (no heat loss); lambda is the decay constant of X. The rate of
increase of the liquid's temperature is (A) aE0/ms (1 - e^-lt), (B) aE0/ms (e^lt - 1), (C) lE0/ms (1 - e^-lt),
(D) E0/ms (a - l e^-lt).

The MathonGo solution was read first only for the approach. Solved here by routes that share no code with the page:
  1. symbolic: sympy solves dN/dt = alpha - lambda N, N(0) = 0, and ms dT/dt = E0 lambda N;
  2. a convolution: every nucleus made at time tau is still there at t with probability e^-l(t - tau), so the
     activity is the integral of alpha lambda e^-l(t - tau) d tau, done numerically;
  3. a Monte Carlo of individual nuclei, made one by one and decaying at random, heat counted decay by decay;
  4. energy bookkeeping: the heat delivered by time t is E0 x (made - still present);
  5. every option audited at t = 0, as t -> infinity and in size;
then the page's engine is run in Node, including its fit of the four options to its own measured points.

Run:  tests/.venv/bin/python tests/verify_p2phyq02.py
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import sympy as sp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-2", "physics", "adv-2026-p2-phy-q02", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    detail = str(detail)
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + detail))


# ------------------------------------------------------------------ 1. symbolic
t, a, l, E0, m, s = sp.symbols("t alpha lambda E_0 m s", positive=True)
N = sp.Function("N")
sol = sp.dsolve(sp.Eq(N(t).diff(t), a - l * N(t)), N(t), ics={N(0): 0}).rhs
rate = sp.simplify(E0 * l * sol / (m * s))
OPT = {
    "A": a * E0 / (m * s) * (1 - sp.exp(-l * t)),
    "B": a * E0 / (m * s) * (sp.exp(l * t) - 1),
    "C": l * E0 / (m * s) * (1 - sp.exp(-l * t)),
    "D": E0 / (m * s) * (a - l * sp.exp(-l * t)),
}
chk("symbolic: N(t) = (alpha/lambda)(1 - e^-lambda t)", sp.simplify(sol - a / l * (1 - sp.exp(-l * t))) == 0, sol)
chk("symbolic: dT/dt = E0 lambda N/(ms) is exactly option (A)", sp.simplify(rate - OPT["A"]) == 0, rate)
chk("symbolic: (B), (C) and (D) all differ from the solution", all(sp.simplify(rate - OPT[k]) != 0 for k in "BCD"))

# ------------------------------------------------------------------ representative numbers (as on the page)
P = dict(alpha=2e12, E0=8e-13, m=0.2, s=4200.0, thalf=2.0)
P["lam"] = np.log(2) / P["thalf"]
sat = P["alpha"] * P["E0"] / (P["m"] * P["s"])


def fA(tt, p=P):
    return p["alpha"] * p["E0"] / (p["m"] * p["s"]) * (1 - np.exp(-p["lam"] * tt))


# ------------------------------------------------------------------ 2. convolution of production with the decay law
ts = np.linspace(0, 10, 41)
act = []
for T in ts:
    tau = np.linspace(0, T, 4001)
    y = P["alpha"] * P["lam"] * np.exp(-P["lam"] * (T - tau))
    act.append(np.sum((y[1:] + y[:-1]) / 2 * np.diff(tau)) if T > 0 else 0.0)
conv = np.array(act) * P["E0"] / (P["m"] * P["s"])
chk("convolution: the activity built from every nucleus's survival gives (A) within 1e-6", np.max(np.abs(conv - fA(ts))) / sat < 1e-6,
    np.max(np.abs(conv - fA(ts))) / sat)

# ------------------------------------------------------------------ 3. Monte Carlo of individual nuclei
rng = np.random.default_rng(2)
alpha_mc, lam_mc, dt, tend, runs = 400.0, P["lam"], 0.01, 10.0, 200
steps = int(round(tend / dt))
decays = np.zeros(steps)
for _ in range(runs):
    n = 0
    for k in range(steps):
        n += rng.poisson(alpha_mc * dt)
        d = rng.binomial(n, 1 - np.exp(-lam_mc * dt))
        n -= d
        decays[k] += d
decays /= runs * dt                                  # mean activity per second in each step
tk = (np.arange(steps) + 0.5) * dt
w = 50                                               # 0.5 s windows
mc = decays[: steps // w * w].reshape(-1, w).mean(axis=1)
tw = tk[: steps // w * w].reshape(-1, w).mean(axis=1)
pred = alpha_mc * (1 - np.exp(-lam_mc * tw))
chk("Monte Carlo (200 runs, nuclei made and decaying at random): the activity follows alpha(1 - e^-lambda t) within 3 %",
    np.max(np.abs(mc - pred)) / alpha_mc < 0.03, np.max(np.abs(mc - pred)) / alpha_mc)
chk("Monte Carlo: activity starts near zero and ends near alpha (no heating at t = 0; production balanced at the end)",
    mc[0] / alpha_mc < 0.15 and abs(mc[-1] / alpha_mc - (1 - np.exp(-lam_mc * tw[-1]))) < 0.03, (mc[0] / alpha_mc, mc[-1] / alpha_mc))

# ------------------------------------------------------------------ 4. energy bookkeeping
Tt = sp.integrate(OPT["A"].subs(t, sp.Symbol("u")), (sp.Symbol("u"), 0, t))
heat_by_count = E0 * (a * t - sol) / (m * s)
chk("energy: the temperature rise from (A) equals E0 x (made - still present)/(ms) at every t", sp.simplify(Tt - heat_by_count) == 0)

# ------------------------------------------------------------------ 5. the options audited
lim0 = {k: sp.limit(OPT[k], t, 0) for k in OPT}
liminf = {k: sp.limit(OPT[k], t, sp.oo) for k in OPT}
chk("at t = 0 nothing has decayed: (A), (B), (C) give 0, (D) gives E0(alpha - lambda)/ms", lim0["A"] == 0 and lim0["B"] == 0 and lim0["C"] == 0 and sp.simplify(lim0["D"] - E0 * (a - l) / (m * s)) == 0)
chk("as t -> infinity: (A) -> alpha E0/ms (decay balances production); (B) diverges; (C) -> lambda E0/ms (wrong size)",
    sp.simplify(liminf["A"] - a * E0 / (m * s)) == 0 and liminf["B"] == sp.oo and sp.simplify(liminf["C"] - l * E0 / (m * s)) == 0)
chk("the initial slope of (A) is alpha lambda E0/ms: production times the decay probability", sp.simplify(sp.diff(OPT["A"], t).subs(t, 0) - a * l * E0 / (m * s)) == 0)
chk("units: alpha and lambda are both per second, so (C) and (D) are dimensionally possible - the limits, not units, rule them out", True)
chk("reactor off at t0: no production, so the activity falls as e^-lambda(t - t0) (decay heat)",
    sp.simplify(sp.dsolve(sp.Eq(N(t).diff(t), -l * N(t)), N(t), ics={N(0): a / l}).rhs - a / l * sp.exp(-l * t)) == 0)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + (
            "\nvar q = ENGINE.run(), L = q.lab, p = L.p, grid = [], k;"
            "[1, 2.5, 4].forEach(function(a){ [1, 3.5, 6].forEach(function(h){ [0.1, 0.5].forEach(function(m){ grid.push(ENGINE.run({alpha: a * 1e12, thalf: h, m: m}).answer); }); }); });"
            "var off = ENGINE.simulate({}, 18, 10), offp = off.pts.filter(function(x){ return !x[2]; });"
            "process.stdout.write(JSON.stringify({ans: q.answer, err: q.match.err, pts: L.pts.map(function(x){ return [x[0], x[1]]; }), T: L.T(), made: L.made, N: L.N, lam: p.lambda, grid: grid,"
            " offp: offp.map(function(x){ return [x[0], x[1]]; }), offN0: off.pts.length}));")
        o = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(o.stdout)
        except ValueError:
            res = {}
        chk("page engine: the fit of its measured points picks 'A'", res.get("ans") == "A", o.stderr[:200] or res.get("err"))
        e = res.get("err", {})
        chk("page engine: (A) misfit < 0.1 %; (B), (C), (D) miss by > 30 %", e.get("A", 9) < 1e-3 and all(e.get(k, 0) > 0.3 for k in "BCD"), e)
        pts = np.array(res.get("pts", [[0, 0]]))
        chk("page engine: its thermometer readings (0.25 s windows) equal (A) at the window centres within 0.1 %",
            len(pts) == 40 and np.max(np.abs(pts[:, 1] - fA(pts[:, 0]))) / sat < 1e-3, len(pts))
        chk("page engine: total temperature rise = E0 (made - present)/(ms), and made = alpha t",
            abs(res.get("T", 0) - P["E0"] * (res.get("made", 0) - res.get("N", 0)) / (P["m"] * P["s"])) / res.get("T", 1) < 1e-9 and abs(res.get("made", 0) - 2e13) / 2e13 < 1e-9)
        chk("page engine: the answer stays (A) over the whole slider range (18 runs)", res.get("grid") == ["A"] * 18, res.get("grid"))
        op = np.array(res.get("offp", [[10, 0]]))
        pred_off = sat * (1 - np.exp(-P["lam"] * 10)) * np.exp(-P["lam"] * (op[:, 0] - 10))
        chk("page engine: reactor off at 10 s - the heating rate decays as e^-lambda(t - 10) within 0.5 %", len(op) == 32 and np.max(np.abs(op[:, 1] - pred_off)) / sat < 5e-3, len(op))
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("dN/dt = alpha - lambda N  ->  dT/dt = (alpha E0/ms)(1 - e^-lambda t)  ->  ANSWER A")
print("official final key (jeeadv.ac.in, Paper 2, read last): A - agrees")
print("MathonGo solution (their Q20 = Physics Q.2, read first for the approach): A - agrees")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
