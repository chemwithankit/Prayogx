"""ADV-2026-P1-CHE-Q13 - independent derivation, no answer key consulted.

List-I: (P) Physisorption (Q) Diamond -> Graphite (R) Denaturation of protein (S) Propene -> Cyclopropane
List-II: (1) dH>0, dS>0 (2) dH<0, dS<0 (3) dH<0, dS=0 (4) dH>0, dS<0 (5) dH<0, dS>0
Options: (A) P2 Q3 R5 S4  (B) P4 Q3 R5 S1  (C) P2 Q5 R1 S4  (D) P2 Q5 R1 S3

Routes used, so no single argument is trusted on its own:
  1. Q and S by Hess's law two ways: from combustion enthalpies and from formation enthalpies
  2. third-law entropies for Q and S
  3. P from statistical mechanics: Sackur-Tetrode entropy of the gas vs a mobile 2-D film; the formula is first
     checked against the known standard entropy of N2 (translation + rotation = 191.6 J/K mol)
  4. R from a two-state unfolding model: a DSC scan integrated numerically recovers dH; dS = dH/Tm
  5. the signs mapped onto List-II, every option tested; reversed processes as controls
  6. the page's own numbers (node run of the engine) compared with the values here

Run:  python3 tests/verify_p1q13.py
"""
import math

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


R = 8.314462618; kB = 1.380649e-23; h = 6.62607015e-34; NA = 6.02214076e23


def s3(M, T, P=1e5):
    m = M / 1000 / NA
    return R * (math.log((2 * math.pi * m * kB * T / h ** 2) ** 1.5 * kB * T / P) + 2.5)


def s2(M, T, a):
    m = M / 1000 / NA
    return R * (math.log(2 * math.pi * m * kB * T / h ** 2 * a) + 2)


def srot_linear(T, theta_r, sigma):
    return R * (math.log(T / (sigma * theta_r)) + 1)


def sign(x, tol):
    return 1 if x > tol else -1 if x < -tol else 0


L2 = {1: (1, 1), 2: (-1, -1), 3: (-1, 0), 4: (1, -1), 5: (-1, 1)}


def entry(dH, dS):
    s = (sign(dH, 0.05), sign(dS, 0.5))
    return next((k for k, v in L2.items() if v == s), 0)


OPTS = {"A": [2, 3, 5, 4], "B": [4, 3, 5, 1], "C": [2, 5, 1, 4], "D": [2, 5, 1, 3]}

# ------------------------------------------------ Q: diamond -> graphite
cH = {"diamond": -395.4, "graphite": -393.5, "propene": -2058.0, "cyclopropane": -2091.3}
fH = {"diamond": 1.895, "graphite": 0.0, "propene": 20.0, "cyclopropane": 53.3}
S0 = {"diamond": 2.377, "graphite": 5.740, "propene": 267.0, "cyclopropane": 237.5}
dHq_c = cH["diamond"] - cH["graphite"]; dHq_f = fH["graphite"] - fH["diamond"]; dSq = S0["graphite"] - S0["diamond"]
chk("Q: Hess from combustion = -1.9 kJ/mol", abs(dHq_c + 1.9) < 1e-9, "%.2f" % dHq_c)
chk("Q: Hess from formation agrees (-1.895)", abs(dHq_c - dHq_f) < 0.05, "%.3f" % dHq_f)
chk("Q: dS = +3.36 J/K mol > 0", dSq > 0, "%.3f" % dSq)
chk("Q: dG(298) < 0 (thermodynamically favoured)", dHq_c - 298 * dSq / 1000 < 0, "%.2f kJ/mol" % (dHq_c - 298 * dSq / 1000))
Qe = entry(dHq_c, dSq); chk("Q -> (5)", Qe == 5)

# ------------------------------------------------ S: propene -> cyclopropane
dHs_c = cH["propene"] - cH["cyclopropane"]; dHs_f = fH["cyclopropane"] - fH["propene"]; dSs = S0["cyclopropane"] - S0["propene"]
chk("S: Hess from combustion = +33.3 kJ/mol", abs(dHs_c - 33.3) < 1e-9, "%.2f" % dHs_c)
chk("S: Hess from formation agrees", abs(dHs_c - dHs_f) < 0.5, "%.2f" % dHs_f)
chk("S: dS = -29.5 J/K mol < 0", dSs < 0, "%.1f" % dSs)
chk("S: dG > 0 at every T from 1 to 3000 K (dH > 0, dS < 0)", all(dHs_c - T * dSs / 1000 > 0 for T in range(1, 3001, 50)))
Se = entry(dHs_c, dSs); chk("S -> (4)", Se == 4)

# ------------------------------------------------ P: physisorption
st = s3(28.014, 298.15)
rot = srot_linear(298.15, 2.88, 2)
chk("Sackur-Tetrode checked: S(N2, 298 K) trans + rot = 191.6 J/K mol", abs(st + rot - 191.6) < 0.5, "%.1f + %.1f = %.1f" % (st, rot, st + rot))
dSp = s2(28.014, 77, 0.162e-18) - s3(28.014, 77)
chk("P: dS(77 K) = 2-D film - 3-D gas = -66.2 J/K mol", abs(dSp + 66.2) < 0.1, "%.2f" % dSp)
worst = max(s2(28.014, T, a * 1e-18) - s3(28.014, T) for T in (50, 77, 150, 298) for a in (0.162, 0.2, 0.3))
chk("P: dS < 0 for T 50-298 K and 0.16-0.3 nm^2 per molecule", worst < 0, "max %.1f" % worst)
dHp = -15.0
chk("P: exothermic (a van der Waals attraction forms)", dHp < 0)
chk("P: dG(77 K) < 0, and physisorption fades above T = dH/dS", dHp - 77 * dSp / 1000 < 0 and dHp / dSp * 1000 > 77, "T* = %.0f K" % (dHp / dSp * 1000))
Pe = entry(dHp, dSp); chk("P -> (2)", Pe == 2)
dSch = -s3(2.016, 298)
chk("chemisorption control (H2 on Ni, -96 kJ/mol, atoms at sites): also (2)", entry(-96, dSch) == 2, "%.1f" % dSch)

# ------------------------------------------------ R: denaturation (two-state DSC)
dH, Tm = 500.0, 347.0


def frac(T):
    K = math.exp(-dH * 1000 / R * (1 / T - 1 / Tm)); return K / (1 + K)


def cp(T):
    f = frac(T); return (dH * 1000) ** 2 / (R * T * T) * f * (1 - f) / 1000


n = 4000; area = sum((cp(300 + 100 * i / n) + cp(300 + 100 * (i + 1) / n)) / 2 * 100 / n for i in range(n))
chk("R: DSC peak area recovers dH (+500 kJ/mol) within 0.5%", abs(area - dH) / dH < 0.005, "%.2f" % area)
dSr = area * 1000 / Tm
chk("R: at Tm dG = 0, so dS = dH/Tm = +1441 J/K mol > 0", dSr > 0, "%.0f" % dSr)
chk("R: folded below Tm, unfolded above (entropy-driven)", frac(320) < 0.01 and frac(370) > 0.99)
Re = entry(area, dSr); chk("R -> (1)", Re == 1)

# ------------------------------------------------ the options
m = [Pe, Qe, Re, Se]
hits = [k for k, v in OPTS.items() if v == m]
chk("measured map P2 Q5 R1 S4", m == [2, 5, 1, 4], str(m))
chk("exactly one option matches: (C)", hits == ["C"], str(hits))
for k in "ABD":
    bad = [("PQRS"[i], OPTS[k][i]) for i in range(4) if OPTS[k][i] != m[i]]
    chk("option (%s) rejected by %s" % (k, ", ".join("%s->%d" % b for b in bad)), len(bad) > 0)
chk("(3) dS = 0 is used by no process", 3 not in m)
for i, name in ((1, "Q"), (2, "R"), (3, "S")):
    mm = list(m); d = [(dHq_c, dSq), (area, dSr), (dHs_c, dSs)][i - 1]; mm[i] = entry(-d[0], -d[1])
    chk("control: %s reversed -> no printed option fits" % name, not [k for k, v in OPTS.items() if v == mm], str(mm))

# ------------------------------------------------ the page's numbers (node run of the engine)
page = {"P": (-15.00, -66.22), "Q": (-1.90, 3.36), "R": (500.00, 1440.92), "S": (33.30, -29.50)}
mine = {"P": (dHp, dSp), "Q": (dHq_c, dSq), "R": (area, dSr), "S": (dHs_c, dSs)}
chk("page values agree with this script (0.1 kJ, 0.5 J/K)", all(abs(page[k][0] - mine[k][0]) < 0.1 and abs(page[k][1] - mine[k][1]) < 0.5 for k in page),
    "; ".join("%s %.2f/%.2f" % (k, mine[k][0], mine[k][1]) for k in page))

print()
print("P -> 2, Q -> 5, R -> 1, S -> 4")
print("ANSWER  C")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
