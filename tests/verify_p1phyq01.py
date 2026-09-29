#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q01 - two rollers on the rim of a fixed disk: when do they touch again?

A large disk of radius R is held still; two disks of radius r = R/50 sit on its circumference,
touching, with angular separation dTheta between their centres. They roll without slipping in
opposite directions with angular velocities omega and 2 omega. Find tau, the time at which they
are again in contact (use sin dTheta = dTheta).

Solved here before the key, three ways that share no code:
  1. sympy: rolling constraint v = omega r, centre circle R + r, Omega = v/(R + r), contact angle
     from (R + r) dTheta = 2r, sweep 2 pi - 2 dTheta, tau = sweep / (Omega1 + Omega2);
  2. kinematics by time stepping (RK4): each centre is moved by the no-slip condition alone - the
     material point of the roller touching the rim has zero velocity - with no Omega formula; the
     spin angle is integrated too; contact is the moment the centres are again exactly 2r apart
     (found by bisection), with the exact contact angle, no small-angle step;
  3. every printed option evaluated and the error each one makes named;
then controls, the coin-rotation count, and (if the page exists) the page's own engine in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq01.py
"""
import json
import math
import os
import re
import subprocess
import sys

import sympy as sp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q01", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


# the four printed options, as printed: tau = coef x (2 pi - num/den) / (div omega)
OPTIONS = {"A": (51, 4, 51, 1), "B": (51, 2, 51, 3), "C": (51, 4, 51, 3), "D": (51, 2, 51, 1)}

# ------------------------------------------------------------------ 1. sympy
R, r, w, t = sp.symbols("R r omega t", positive=True)
v1, v2 = w * r, 2 * w * r                           # rolling on a fixed surface: contact point at rest
Om1, Om2 = v1 / (R + r), v2 / (R + r)               # centres move on the circle of radius R + r
dth = sp.symbols("dtheta", positive=True)
dth_sol = sp.solve(sp.Eq((R + r) * dth, 2 * r), dth)[0]   # sin(dTheta) = dTheta: chord 2r = arc
sweep = 2 * sp.pi - 2 * dth_sol                      # they move apart; far-side gap must close to dTheta
tau = sp.simplify(sweep / (Om1 + Om2))
tau_q = sp.simplify(tau.subs(r, R / 50))
print("tau(R, r)       =", tau)
print("tau(r = R/50)   =", tau_q)
chk("sympy: Omega1 = omega/51 and Omega2 = 2 omega/51 at r = R/50",
    sp.simplify(Om1.subs(r, R / 50) - w / 51) == 0 and sp.simplify(Om2.subs(r, R / 50) - 2 * w / 51) == 0)
chk("sympy: dTheta = 2r/(R + r) = 2/51", sp.simplify(dth_sol.subs(r, R / 50) - sp.Rational(2, 51)) == 0)
chk("sympy: sweep = 2 pi - 4/51", sp.simplify(sweep.subs(r, R / 50) - (2 * sp.pi - sp.Rational(4, 51))) == 0)
opt_expr = {k: c * (2 * sp.pi - sp.Rational(n, d)) / (div * w) for k, (c, n, d, div) in OPTIONS.items()}
match = [k for k, e in opt_expr.items() if sp.simplify(e - tau_q) == 0]
chk("sympy: exactly one option equals tau, and it is C", match == ["C"], match)
wt = float(tau_q * w)
print("omega tau       = %.6f" % wt)

# ------------------------------------------------------------------ 2. kinematics by time stepping
def step_state(s, h, Rv, rv, wspin, sense):
    """s = (x, y, spin); the centre moves so that the contact material point is at rest.
    sense = +1 counterclockwise spin (rolls counterclockwise round O on the outside), -1 clockwise."""
    def f(st):
        x, y, _ = st
        d = math.hypot(x, y)
        cx, cy = -x / d * rv, -y / d * rv            # vector centre -> contact point (towards O)
        om = sense * wspin
        # velocity of the contact material point = v_c + om z x (p - c) = 0  =>  v_c = -om z x (p - c)
        vx, vy = -(-om * cy), -(om * cx)
        return (vx, vy, om)
    k1 = f(s)
    k2 = f(tuple(s[i] + 0.5 * h * k1[i] for i in range(3)))
    k3 = f(tuple(s[i] + 0.5 * h * k2[i] for i in range(3)))
    k4 = f(tuple(s[i] + h * k3[i] for i in range(3)))
    return tuple(s[i] + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) for i in range(3))


def simulate(k=50.0, n1=1.0, n2=2.0, h=0.004, phi0=math.radians(55)):
    """Two rollers of radius 1 on a disk of radius k (units of r), omega = 1. Returns the exact
    contact time, the spins, the exact contact angle, the drift of |c| from R + r, and the far-side angle."""
    Rv, rv = k, 1.0
    dexact = 2 * math.asin(rv / (Rv + rv))           # exact: centres 2r apart on the circle R + r
    a1, a2 = phi0 + dexact / 2, phi0 - dexact / 2
    s1 = ((Rv + rv) * math.cos(a1), (Rv + rv) * math.sin(a1), 0.0)
    s2 = ((Rv + rv) * math.cos(a2), (Rv + rv) * math.sin(a2), 0.0)
    dist = lambda p, q: math.hypot(p[0] - q[0], p[1] - q[1])
    tt, apart, drift = 0.0, False, 0.0
    while tt < 5000:
        n1s = step_state(s1, h, Rv, rv, n1, +1)
        n2s = step_state(s2, h, Rv, rv, n2, -1)
        drift = max(drift, abs(math.hypot(n1s[0], n1s[1]) - (Rv + rv)))
        if dist(n1s, n2s) > 2 * rv + 1e-6:
            apart = True
        if apart and dist(n1s, n2s) <= 2 * rv:
            lo, hi = 0.0, h                          # bisection inside the last step
            for _ in range(60):
                m = (lo + hi) / 2
                if dist(step_state(s1, m, Rv, rv, n1, +1), step_state(s2, m, Rv, rv, n2, -1)) <= 2 * rv:
                    hi = m
                else:
                    lo = m
            f1, f2 = step_state(s1, hi, Rv, rv, n1, +1), step_state(s2, hi, Rv, rv, n2, -1)
            return {"tau": tt + hi, "spin1": f1[2], "spin2": f2[2], "dexact": dexact, "drift": drift,
                    "meet": math.degrees(math.atan2((f1[1] + f2[1]) / 2, (f1[0] + f2[0]) / 2))}
        s1, s2, tt = n1s, n2s, tt + h
    return None


sim = simulate()
tau_exact_formula = 51 * (2 * math.pi - 2 * sim["dexact"]) / 3
chk("time stepping: the centres stay on the circle R + r (no-slip alone keeps them there)", sim["drift"] < 1e-6, sim["drift"])
chk("time stepping: contact again at omega tau = %.4f (exact geometry)" % sim["tau"],
    abs(sim["tau"] - tau_exact_formula) < 1e-4, "%.6f vs %.6f" % (sim["tau"], tau_exact_formula))
chk("time stepping agrees with the small-angle answer C to 0.01 %",
    abs(sim["tau"] - wt) / wt < 1e-4, "%.6f vs %.6f" % (sim["tau"], wt))
chk("small-angle step: 2 asin(1/51) vs 2/51 differ by < 1e-5 rad", abs(sim["dexact"] - 2 / 51) < 1e-5, sim["dexact"] - 2 / 51)
chk("time stepping: each centre's angular speed is omega/51 and 2 omega/51 (from the spin, not assumed)",
    abs((2 * math.pi - 2 * sim["dexact"]) / sim["tau"] - 3 / 51) < 1e-6)
turns1 = sim["spin1"] / (2 * math.pi)
laps1 = (sim["tau"] / 51) / (2 * math.pi)
chk("coin rotation: a roller spins (R + r)/r = 51 times per lap, not R/r = 50", abs(turns1 / laps1 - 51) < 1e-6, turns1 / laps1)
chk("roller 2 spins twice as far as roller 1, in the opposite sense", abs(sim["spin2"] / sim["spin1"] + 2) < 1e-9, sim["spin2"] / sim["spin1"])
# at the meeting roller 2 is dTheta ahead of roller 1 (anticlockwise), so the pair's midpoint is
# phi1 + dTheta/2 = phi0 + dTheta + Omega1 tau
meet_pred = (55 + math.degrees(sim["dexact"] + sim["tau"] / 51)) % 360
meet_dev = abs((sim["meet"] - meet_pred + 180) % 360 - 180)
chk("they meet on the far side, where the midpoint is at phi0 + dTheta + Omega1 tau (%.1f deg on from the start)" % math.degrees(sim["dexact"] + sim["tau"] / 51),
    meet_dev < 0.01 and 100 < math.degrees(sim["tau"] / 51) < 140, "%.3f vs %.3f" % (sim["meet"] % 360, meet_pred))

# ------------------------------------------------------------------ 3. every option
vals = {k: c * (2 * math.pi - n / d) / div for k, (c, n, d, div) in OPTIONS.items()}
print("omega tau by option:", ", ".join("%s %.4f" % kv for kv in sorted(vals.items())))
chk("option C = %.4f equals the model (small angle) to 1e-12" % vals["C"], abs(vals["C"] - wt) < 1e-12)
chk("option A (/omega): the relative speed is 3 omega/51, not omega/51 - three times too long", abs(vals["A"] / vals["C"] - 3) < 1e-12)
chk("option B (2/51): subtracts dTheta once - the far-side gap must also close to dTheta", abs(vals["B"] - vals["C"] - 2 / 3) < 1e-12)
chk("option D: both mistakes", abs(vals["D"] - 3 * vals["B"]) < 1e-12)
chk("only C lies within 0.1 % of the time-stepped contact", [k for k in "ABCD" if abs(vals[k] - sim["tau"]) / sim["tau"] < 1e-3] == ["C"])
chk("the trap R instead of R + r (50 in place of 51) is not among the options",
    all(abs(v - 50 * (2 * math.pi - 4 / 50) / 3) > 1e-3 for v in vals.values()))

# ------------------------------------------------------------------ controls
for k, n1, n2 in ((10, 1, 2), (50, 1, 1), (50, 1, 3), (5, 2, 3)):
    s = simulate(k=k, n1=n1, n2=n2, h=0.002 if k < 20 else 0.004)
    pred = (k + 1) * (2 * math.pi - 2 * s["dexact"]) / (n1 + n2)
    chk("control R/r = %d, speeds %d omega and %d omega: time stepping = (R+r)/r x (2 pi - 2 dTheta)/(n1 + n2)" % (k, n1, n2),
        abs(s["tau"] - pred) / pred < 1e-5, "%.5f vs %.5f" % (s["tau"], pred))

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + "\nprocess.stdout.write(JSON.stringify({q: ENGINE.run(ENGINE.Q), c1: ENGINE.run({k: 10, n1: 1, n2: 2, dir: 'opp', geo: 'small'}), ex: ENGINE.run({k: 50, n1: 1, n2: 2, dir: 'opp', geo: 'exact'})}));"
        out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(out.stdout)
        except ValueError:
            res = {}
        q = res.get("q", {})
        chk("page engine: answer C", q.get("answer") == "C", out.stderr[:200] or q.get("answer"))
        chk("page engine: omega tau equals sympy", abs(q.get("tauW", 0) - wt) < 1e-9, q.get("tauW"))
        chk("page engine: its own time stepping lands on the exact contact", abs(q.get("tauNum", 0) - sim["tau"]) < 2e-3, q.get("tauNum"))
        chk("page engine: Omega1, Omega2 = 1/51, 2/51 (units of omega); dTheta = 2/51",
            abs(q.get("Om1", 0) - 1 / 51) < 1e-12 and abs(q.get("Om2", 0) - 2 / 51) < 1e-12 and abs(q.get("dTheta", 0) - 2 / 51) < 1e-12)
        chk("page engine: spins per lap 51", q.get("spinsPerLap") == 51)
        chk("page engine: every option judged as here", [o.get("ok") for o in q.get("options", [])] == [False, False, True, False])
        c1 = res.get("c1", {})
        chk("page engine control R/r = 10: omega tau = 11 (2 pi - 4/11)/3, not the question",
            abs(c1.get("tauW", 0) - 11 * (2 * math.pi - 4 / 11) / 3) < 1e-9 and c1.get("complete") is False)
        ex = res.get("ex", {})
        chk("page engine exact geometry: dTheta = 2 asin(1/51), flagged as not the question's rule",
            abs(ex.get("dTheta", 0) - 2 * math.asin(1 / 51)) < 1e-12 and ex.get("complete") is False)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("omega tau = 51(2 pi - 4/51)/3 = %.4f  ->  ANSWER  %s" % (wt, "C" if match == ["C"] else "?"))
print("official key (read last): C -", "agrees" if match == ["C"] else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
