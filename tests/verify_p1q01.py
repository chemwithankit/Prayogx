"""ADV-2026-P1-CHE-Q01 - independent derivation, no answer key consulted.

0.5 mol ideal gas, 600 K throughout, 2 bar -> 8 bar in two irreversible steps:
first against a constant external P (2 < P < 8), then against 8 bar, each step
stopping when the gas pressure reaches the external pressure. W = total work
done ON the gas. Minimum |W| over all P, in units of R (J K^-1 mol^-1)?

Routes used, so no single formula is trusted on its own:
  1. sympy: W(P) from w = -Pext dV, its derivative, the stationary point, the
     second derivative, and the minimum value
  2. brute force: W computed from volumes in litres and bar (R = 0.083145
     L bar K^-1 mol^-1, 1 bar L = 100 J) on a fine grid of P, no formula for W
  3. exact rational arithmetic at the optimum
  4. bounds: the minimum must lie between the reversible isothermal work (the
     infimum over infinitely many steps) and the one-step work
  5. an audit of every printed option

Run:  python3 tests/verify_p1q01.py
"""
import math
from fractions import Fraction as F

import sympy as sp

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


n0, T0, P1, P2 = F(1, 2), 600, 2, 8

# ------------------------------------------------ 1. symbolic
n, R, T, Pa, Pb, P = sp.symbols("n R T P_1 P_2 P", positive=True)
V = lambda p: n * R * T / p                     # isothermal ideal gas
w1 = -P * (V(P) - V(Pa))                        # work ON the gas, step 1: w = -Pext dV
w2 = -Pb * (V(Pb) - V(P))                       # step 2
W = sp.simplify(w1 + w2)
chk("W(P) = nRT (P/P1 + P2/P - 2)", sp.simplify(W - n * R * T * (P / Pa + Pb / P - 2)) == 0, str(W))
crit = sp.solve(sp.diff(W, P), P)
chk("dW/dP = 0 only at P = sqrt(P1 P2)", crit == [sp.sqrt(Pa * Pb)], str(crit))
chk("and it is a minimum: d2W/dP2 > 0 there",
    sp.simplify(sp.diff(W, P, 2).subs(P, sp.sqrt(Pa * Pb))) == 2 * n * R * T / (Pa * sp.sqrt(Pa * Pb)))
Wmin = sp.simplify(W.subs(P, sp.sqrt(Pa * Pb)))
chk("W_min = 2nRT (sqrt(P2/P1) - 1)",
    sp.simplify(Wmin - 2 * n * R * T * (sp.sqrt(Pb / Pa) - 1)) == 0, str(Wmin))
num = Wmin.subs({n: sp.Rational(1, 2), T: 600, Pa: 2, Pb: 8})
chk("with the question's values W_min = 600 R", sp.simplify(num - 600 * R) == 0, str(num))
chk("at the optimum the two steps do equal work",
    sp.simplify((w1 - w2).subs(P, sp.sqrt(Pa * Pb))) == 0)
chk("W(P) is symmetric in ln P about ln sqrt(P1 P2)",
    sp.simplify(W.subs(P, sp.sqrt(Pa * Pb) * sp.Symbol("x", positive=True))
                - W.subs(P, sp.sqrt(Pa * Pb) / sp.Symbol("x", positive=True))) == 0)

# ------------------------------------------------ 2. brute force in litres and bar
RL = 0.0831446      # L bar K^-1 mol^-1
RJ = 8.314462618    # J K^-1 mol^-1  (RL * 100)
def Vl(p): return float(n0) * RL * T0 / p
def work_J(p):
    # piston pushed by a constant external pressure: w = Pext x (volume swept), 1 bar L = 100 J
    return 100 * (p * (Vl(P1) - Vl(p)) + P2 * (Vl(p) - Vl(P2)))
grid = [P1 + (P2 - P1) * k / 60000 for k in range(1, 60000)]
best = min(grid, key=work_J)
chk("a 60 000-point scan of P finds the minimum at 4.000 bar", abs(best - 4) < 2e-4, "%.4f bar" % best)
chk("where |W| = 600 R to 5 significant figures", abs(work_J(best) / RJ - 600) < 1e-2, "%.3f R" % (work_J(best) / RJ))
chk("volumes: 12.47 L at 2 bar, 6.236 L at 4 bar, 3.118 L at 8 bar",
    abs(Vl(2) - 12.4717) < 1e-3 and abs(Vl(4) - 6.2359) < 1e-3 and abs(Vl(8) - 3.1179) < 1e-3)
chk("in joules: 4988.7 J", abs(work_J(4) - 4988.7) < 0.5, "%.1f J" % work_J(4))
chk("the work is positive (done ON the gas) for every P", all(work_J(p) > 0 for p in grid[::500]))

# ------------------------------------------------ 3. exact at the optimum
Popt = F(4)
wa = n0 * T0 * (Popt / P1 - 1)
wb = n0 * T0 * (F(P2) / Popt - 1)
chk("exact: step 1 = 300 R, step 2 = 300 R", wa == 300 and wb == 300)
chk("exact: total = 600 R", wa + wb == 600)
chk("isothermal ideal gas: dU = 0 so q = -w = -600 R (heat leaves the gas)", -(wa + wb) == -600)

# ------------------------------------------------ 4. bounds
Wrev = float(n0) * T0 * math.log(P2 / P1)
W1 = float(n0) * T0 * (P2 / P1 - 1)
chk("reversible limit nRT ln 4 = 415.9 R is below the two-step minimum", Wrev < 600, "%.1f R" % Wrev)
chk("single step against 8 bar = 900 R is above it", W1 == 900)
chk("two steps sit between: 415.9 R < 600 R < 900 R", Wrev < 600 < W1)
def Wk(k):  # k equal-ratio steps: the optimum for k steps
    r = (P2 / P1) ** (1 / k)
    return float(n0) * T0 * k * (r - 1)
chk("more optimal steps approach the reversible limit: 1, 2, 4, 100 steps",
    Wk(1) > Wk(2) > Wk(4) > Wk(100) > Wrev and abs(Wk(10000) - Wrev) < 0.05,
    ", ".join("%.1f" % Wk(k) for k in (1, 2, 4, 100)))

# ------------------------------------------------ 5. option audit
def P_giving(WR):
    # P/2 + 8/P - 2 = WR/300  ->  P^2 - 2(2 + WR/300)P + 16 = 0
    b = 2 * (2 + WR / 300.0)
    d = b * b - 64
    return None if d < 0 else ((b - math.sqrt(d)) / 2, (b + math.sqrt(d)) / 2)
chk("(A) 207 R is below the reversible limit - no process can do it", 207 < Wrev)
chk("(A) is nRT ln 2 = 207.9 R - half the reversible work", abs(float(n0) * T0 * math.log(2) - 207.9) < 0.1)
chk("(A) no real P gives it", P_giving(207) is None)
pc = P_giving(630)
chk("(C) 630 R is a two-step run at P = 3.2 or 5 bar, not the minimum",
    pc and abs(pc[0] - 3.2) < 1e-9 and abs(pc[1] - 5) < 1e-9, str(pc))
pd = P_giving(900)
chk("(D) 900 R is the P -> 2 or P -> 8 limit: a single step", pd and abs(pd[0] - 2) < 1e-9 and abs(pd[1] - 8) < 1e-9, str(pd))
chk("(B) 600 R is the minimum, at P = 4 bar", P_giving(600) == (4.0, 4.0))
opts = {"A": 207, "B": 600, "C": 630, "D": 900}
chk("exactly one option equals the computed minimum: B",
    [k for k, v in opts.items() if abs(v - 600) < 1] == ["B"])

print()
print("W(P) = nRT (P/P1 + P2/P - 2)        P* = sqrt(P1 P2) = 4 bar")
print("W_min = 2nRT (sqrt(P2/P1) - 1) = 2 x 0.5 x 600 x (2 - 1) R = 600 R  (4988.7 J)")
print("ANSWER  (B)")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
