"""ADV-2026-P1-CHE-Q09 - independent derivation, no answer key consulted.

Cylinder 1: m1 of He + m2 of Ar; cylinder 2: m2 of He + m1 of Ar. M(Ar) = 10 M(He).
Equal V and T; P1 = 5 P2. Ideal gases. Find m1/m2 (numerical value, two decimals).

Routes used, so no single argument is trusted on its own:
  1. sympy: exact solution of n1 = 5 n2 with symbolic masses and molar mass, and the general formula
  2. a numerical root find (brentq-style bisection, written here) on P1/P2(r) - 5
  3. an ideal-gas "experiment": moles -> pressures with R, a chosen V and two temperatures
  4. robustness to the real molar masses, and the conditions the page lets a student change
  5. the traps: the pressure ratio as the answer, the inverted ratio, masses in place of moles

Run:  python3 tests/verify_p1q09.py
"""
import sympy as sp

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


m1, m2, M, k, p, r = sp.symbols("m1 m2 M k p r", positive=True)

# ------------------------------------------------ 1. exact algebra
n1 = m1 / M + m2 / (10 * M)
n2 = m2 / M + m1 / (10 * M)
sol = sp.solve(sp.Eq(n1, 5 * n2), m1)
ratio = sp.simplify(sol[0] / m2)
chk("sympy: n1 = 5 n2 gives m1/m2 = 49/5", ratio == sp.Rational(49, 5), str(ratio))
chk("...= 9.80 to two decimals", f"{float(ratio):.2f}" == "9.80")
gen = sp.solve(sp.Eq(k * r + 1, p * (k + r)), r)[0]
chk("general form r = (p k - 1)/(k - p)", sp.simplify(gen - (p * k - 1) / (k - p)) == 0, str(sp.simplify(gen)))
chk("general form at k = 10, p = 5 gives 49/5", gen.subs({k: 10, p: 5}) == sp.Rational(49, 5))
M_ = sp.symbols("M_", positive=True)
chk("M cancels: the answer does not depend on the molar mass of He itself",
    sp.simplify(ratio.subs(M, M_) - ratio) == 0)


# ------------------------------------------------ 2. numerical root
def pratio(rr, kk=10.0):
    return (kk * rr + 1) / (kk + rr)


def bisect(f, lo, hi, n=200):
    flo = f(lo)
    for _ in range(n):
        mid = 0.5 * (lo + hi)
        if (f(mid) > 0) == (flo > 0):
            lo, flo = mid, f(mid)
        else:
            hi = mid
    return 0.5 * (lo + hi)


rn = bisect(lambda x: pratio(x) - 5, 1e-6, 1e3)
chk("bisection on P1/P2(r) - 5 converges to 9.8000", abs(rn - 9.8) < 1e-9, f"{rn:.10f}")
chk("P1/P2 rises monotonically with r (one root only)", all(pratio(a) < pratio(a + 0.5) for a in [x * 0.5 for x in range(1, 80)]))

# ------------------------------------------------ 3. an ideal-gas experiment
R = 0.082057
MHe, MAr = 4.0, 40.0           # g/mol, ratio exactly 10 as the question states
for m2g in (1.0, 3.7):
    for T in (250.0, 300.0, 600.0):
        m1g = 9.8 * m2g
        V = 5.0
        P1 = (m1g / MHe + m2g / MAr) * R * T / V
        P2 = (m2g / MHe + m1g / MAr) * R * T / V
        chk(f"PV = nRT with m2 = {m2g} g, T = {T:.0f} K: P1/P2 = {P1 / P2:.6f}", abs(P1 / P2 - 5) < 1e-9)

# ------------------------------------------------ 4. robustness and custom values
kreal = 39.948 / 4.0026
rreal = (5 * kreal - 1) / (kreal - 5)
chk("real molar masses (k = 9.98): m1/m2 = 9.82 - close, but the question fixes k = 10", f"{rreal:.2f}" == "9.82", f"{rreal:.4f}")
chk("p = 2 instead: m1/m2 = (20 - 1)/(10 - 2) = 2.38", f"{(2 * 10 - 1) / (10 - 2):.2f}" == "2.38")
chk("p = 10 = k: no solution - n1/n2 approaches 10 only as m1/m2 -> infinity", max(pratio(x) for x in (1e3, 1e6, 1e9)) < 10)
chk("k = 5, p = 5: no solution either", all(pratio(x, 5) < 5 for x in (1, 100, 1e6)))

# ------------------------------------------------ 5. the traps
chk("trap: m1/m2 = 5 gives P1/P2 = 51/15 = 3.4, not 5", abs(pratio(5) - 3.4) < 1e-12)
chk("trap: m1/m2 = 1/9.8 = 0.10 gives P1/P2 = 0.2 (the cylinders swapped)", abs(pratio(1 / 9.8) - 0.2) < 1e-12)
chk("trap: equating masses instead of moles (m1 + m2 = 5(m2 + m1)) has no positive solution",
    sp.solve(sp.Eq(m1 + m2, 5 * (m2 + m1)), m1) == [])

print()
print("n1 : n2 = 99 : 19.8 = 5 : 1")
print("ANSWER  m1/m2 = 9.80")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
raise SystemExit(1 if fail else 0)
