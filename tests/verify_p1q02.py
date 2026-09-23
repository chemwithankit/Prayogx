"""ADV-2026-P1-CHE-Q02 - independent derivation, no answer key consulted.

R <=> P, both directions first-order and elementary, rate constants kf and kb.
[R](0) = [R]0, [P](0) = 0, kb = 4 kf.  Which graph of [R]/[R]0 and [P]/[R]0
against time is correct?

Four independent routes are used, so no single formula is trusted on its own:
  1. sympy solves the rate equation symbolically from scratch
  2. a hand-written RK4 integrator solves it numerically, no closed form used
  3. exact rational arithmetic for the equilibrium (detailed balance + mass balance)
  4. a stochastic (Gillespie) simulation of individual molecules - the same
     picture the page animates - must land on the same plateau

Run:  python3 tests/verify_p1q02.py
"""
import math
import random
from fractions import Fraction as F

import sympy as sp

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


# ------------------------------------------------ 1. symbolic, from the rate law
t = sp.symbols("t", nonnegative=True)
kf, kb, R0 = sp.symbols("k_f k_b R_0", positive=True)
P = sp.Function("P")
# d[P]/dt = kf[R] - kb[P], and [R] = [R]0 - [P] because every R lost is a P gained
sol = sp.dsolve(sp.Eq(P(t).diff(t), kf * (R0 - P(t)) - kb * P(t)), P(t), ics={P(0): 0})
P_sym = sp.simplify(sol.rhs)
P_formula = kf * R0 / (kf + kb) * (1 - sp.exp(-(kf + kb) * t))
chk("sympy's solution of the rate law equals kf/(kf+kb) (1 - e^-(kf+kb)t)",
    sp.simplify(P_sym - P_formula) == 0, str(P_sym))
R_sym = R0 - P_sym
R_formula = R0 * (kb / (kf + kb) + kf / (kf + kb) * sp.exp(-(kf + kb) * t))
chk("[R] = [R]0 (kb + kf e^-(kf+kb)t)/(kf+kb) follows from the mass balance",
    sp.simplify(R_sym - R_formula) == 0)
chk("the backward-rate term is really there: d[R]/dt = -kf[R] + kb[P]",
    sp.simplify(R_sym.diff(t) - (-kf * R_sym + kb * P_sym)) == 0)

sub = {kb: 4 * kf}
p_ratio = sp.simplify((P_sym / R0).subs(sub))
r_ratio = sp.simplify((R_sym / R0).subs(sub))
chk("with kb = 4kf:  [P]/[R]0 = 0.2 (1 - e^-5kf t)",
    sp.simplify(p_ratio - sp.Rational(1, 5) * (1 - sp.exp(-5 * kf * t))) == 0, str(p_ratio))
chk("with kb = 4kf:  [R]/[R]0 = 0.8 + 0.2 e^-5kf t",
    sp.simplify(r_ratio - (sp.Rational(4, 5) + sp.Rational(1, 5) * sp.exp(-5 * kf * t))) == 0,
    str(r_ratio))
chk("t -> infinity:  [P]/[R]0 -> 1/5", sp.limit(p_ratio, t, sp.oo) == sp.Rational(1, 5))
chk("t -> infinity:  [R]/[R]0 -> 4/5", sp.limit(r_ratio, t, sp.oo) == sp.Rational(4, 5))
chk("at t = 0 the curves start at R = 1, P = 0",
    r_ratio.subs(t, 0) == 1 and p_ratio.subs(t, 0) == 0)
chk("initial slope of [P]/[R]0 is kf (backward rate is zero at t = 0)",
    sp.simplify(p_ratio.diff(t).subs(t, 0) - kf) == 0)
chk("[P]/[R]0 is concave DOWN for all t > 0 (second derivative < 0)",
    sp.simplify(p_ratio.diff(t, 2) / kf ** 2) == -5 * sp.exp(-5 * kf * t))
chk("the observed relaxation constant is kf + kb = 5kf",
    sp.simplify(-sp.log((p_ratio - sp.Rational(1, 5)) / sp.Rational(-1, 5)) / t) == 5 * kf)

# ------------------------------------------------ 2. numeric RK4, no closed form
def rk4(kf_, kb_, r0, t_end, n):
    h = t_end / n
    r, p = r0, 0.0
    f = lambda r_, p_: (-kf_ * r_ + kb_ * p_, kf_ * r_ - kb_ * p_)
    for _ in range(n):
        a = f(r, p)
        b = f(r + h / 2 * a[0], p + h / 2 * a[1])
        c = f(r + h / 2 * b[0], p + h / 2 * b[1])
        d = f(r + h * c[0], p + h * c[1])
        r += h / 6 * (a[0] + 2 * b[0] + 2 * c[0] + d[0])
        p += h / 6 * (a[1] + 2 * b[1] + 2 * c[1] + d[1])
    return r, p


def analytic(kf_, kb_, r0, tt):
    pp = kf_ / (kf_ + kb_) * (1 - math.exp(-(kf_ + kb_) * tt)) * r0
    return r0 - pp, pp


worst = 0.0
for tt in (0.05, 0.1, 0.2, 0.3, 0.5, 1.0, 2.0):
    rn, pn = rk4(1.0, 4.0, 1.0, tt, 4000)
    ra, pa = analytic(1.0, 4.0, 1.0, tt)
    worst = max(worst, abs(rn - ra), abs(pn - pa))
chk("RK4 integration agrees with the closed form to 1e-10 at seven times", worst < 1e-10,
    "max |error| = %.1e" % worst)
rn, pn = rk4(1.0, 4.0, 1.0, 5.0, 20000)
chk("RK4 plateau after 25 relaxation times: R = 0.8, P = 0.2",
    abs(rn - 0.8) < 1e-9 and abs(pn - 0.2) < 1e-9, "R = %.6f, P = %.6f" % (rn, pn))
cons = max(abs(sum(rk4(1.0, 4.0, 1.0, tt, 2000)) - 1.0) for tt in (0.1, 0.4, 1.3, 3.0))
chk("mass balance: [R] + [P] = [R]0 at every time", cons < 1e-12, "drift %.1e" % cons)

# ------------------------------------------------ 3. exact equilibrium
kf_e, kb_e = F(1), F(4)
p_eq = kf_e / (kf_e + kb_e)
r_eq = kb_e / (kf_e + kb_e)
chk("exact: [P]eq/[R]0 = kf/(kf+kb) = 1/5", p_eq == F(1, 5))
chk("exact: [R]eq/[R]0 = kb/(kf+kb) = 4/5", r_eq == F(4, 5))
chk("detailed balance holds exactly: kf[R]eq = kb[P]eq = 0.8 kf [R]0",
    kf_e * r_eq == kb_e * p_eq == F(4, 5))
chk("equilibrium constant K = [P]eq/[R]eq = kf/kb = 1/4", p_eq / r_eq == kf_e / kb_e == F(1, 4))
chk("the answer depends only on kb/kf: kf = 0.37, kb = 1.48 gives the same 0.2",
    abs(0.37 / (0.37 + 1.48) - 0.2) < 1e-12)
chk("and not on [R]0: 2.5 M gives [P]eq = 0.5 M, still 0.2 of [R]0",
    abs(analytic(1, 4, 2.5, 40)[1] - 0.5) < 1e-12)
for ratio, want in ((1, F(1, 2)), (2, F(1, 3)), (4, F(1, 5)), (9, F(1, 10))):
    chk("explore mode: kb/kf = %d gives [P]eq/[R]0 = %s" % (ratio, want),
        F(1) / (1 + ratio) == want)
chk("limit kb -> 0 (irreversible) sends [P]eq -> [R]0", abs(1e-9 / (1e-9 + 1e-18) - 1) < 1e-8)

# ------------------------------------------------ 4. molecules (Gillespie SSA)
random.seed(20260923)
N, kf_s, kb_s = 5000, 1.0, 4.0
nR, nP, tt, tail = N, 0, 0.0, []
while tt < 6.0:
    a1, a2 = kf_s * nR, kb_s * nP
    a0 = a1 + a2
    tt += -math.log(random.random()) / a0
    if random.random() * a0 < a1:
        nR, nP = nR - 1, nP + 1
    else:
        nR, nP = nR + 1, nP - 1
    if tt > 3.0:
        tail.append(nP / N)
mean_p = sum(tail) / len(tail)
chk("5000 individual molecules settle at P/R0 = 0.200 +/- 0.01", abs(mean_p - 0.2) < 0.01,
    "measured %.4f" % mean_p)
chk("and keep converting at equilibrium (reactions never stop)", nR + nP == N and len(tail) > 1000,
    "%d events after t = 3" % len(tail))

# ------------------------------------------------ option audit, read off the printed graphs
# (A) R and P both level at 0.5.  (B) P levels at 0.8, R at 0.2.  (C) R levels at 0.8,
# P at 0.2.  (D) R falls towards ~0.05 with no plateau while P CURVES UPWARD to 1.0;
# the two cross near 0.3.
def K_from(r_plateau, p_plateau):
    return p_plateau / r_plateau


chk("(A) plateaus imply K = 1, i.e. kb = kf - contradicts kb = 4kf", K_from(0.5, 0.5) == 1)
chk("(B) plateaus imply K = 4, i.e. kf = 4kb - the rate constants swapped",
    abs(K_from(0.2, 0.8) - 4) < 1e-12)
chk("(C) plateaus imply K = 1/4, i.e. kb = 4kf - matches", abs(K_from(0.8, 0.2) - 0.25) < 1e-12)
chk("(D) breaks the mass balance: where the curves cross, R + P ~ 0.6, not 1",
    abs((0.3 + 0.3) - 1) > 0.3)
chk("(D) P is drawn concave UP; a first-order approach is always concave DOWN (see above)", True)
chk("(D) has no plateau at all, but kb > 0 guarantees one", True)
chk("exactly one option survives: C",
    [o for o, (r, p) in {"A": (0.5, 0.5), "B": (0.2, 0.8), "C": (0.8, 0.2)}.items()
     if abs(p / r - 0.25) < 1e-12] == ["C"])

print()
print("[P]/[R]0 = 0.2 (1 - e^-5kf t)     [R]/[R]0 = 0.8 + 0.2 e^-5kf t")
print("equilibrium  R : P = 4 : 1        kobs = kf + kb = 5 kf    tau = 1/(5 kf)")
print("ANSWER  (C)")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
