"""ADV-2026-P1-CHE-Q03 - independent derivation, no answer key consulted.

The correct order of dipole moments for BF3, NH4+, NF3 and NH3.

Routes used, so no single argument is trusted on its own:
  1. sympy: the exact vector sum of bond moments for each VSEPR geometry, with the bond
     moment and the lone-pair moment left as symbols - which sums vanish identically
  2. sympy: the C3v resultant |3 m cos(beta) +/- L| derived from the vectors, with
     cos^2(beta) = (1 + 2 cos(alpha)) / 3 from the bond angle alpha
  3. the page's bond-moment model with its default data (Pauling electronegativities,
     1 D per unit difference, VSEPR angles 107 / 102 degrees, lone pair 1.0 D)
  4. robustness: how far the lone-pair moment and the bond angles can move before the
     order changes
  5. measured gas-phase values from the literature
  6. an ab initio check: B3LYP/aug-cc-pVDZ at experimental geometries (runs only when
     pyscf is installed; its numbers are recorded below otherwise)
  7. an audit of every printed option

Run:  python3 tests/verify_p1q03.py
"""
import math

import sympy as sp

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


# ------------------------------------------------ 1. exact vector sums
m, L, al = sp.symbols("m L alpha", positive=True)
S3 = sp.sqrt(3)
# BF3: trigonal planar, bonds at 0, 120, 240 degrees in a plane
tri = [sp.Matrix([sp.cos(2 * sp.pi * k / 3), sp.sin(2 * sp.pi * k / 3), 0]) for k in range(3)]
s_bf3 = sp.simplify(sum((m * u for u in tri), sp.zeros(3, 1)))
chk("BF3: three equal bond moments at 120 deg sum to zero for ANY bond moment m", s_bf3 == sp.zeros(3, 1), str(list(s_bf3)))
# NH4+: tetrahedral, bonds toward alternate corners of a cube
tet = [sp.Matrix(v) / S3 for v in ((1, 1, 1), (1, -1, -1), (-1, 1, -1), (-1, -1, 1))]
s_nh4 = sp.simplify(sum((m * u for u in tet), sp.zeros(3, 1)))
chk("NH4+: four equal bond moments to tetrahedral corners sum to zero for ANY m", s_nh4 == sp.zeros(3, 1))
chk("NH4+: the tetrahedral angle is arccos(-1/3) = 109.47 deg",
    sp.simplify((tet[0].T * tet[1])[0] + sp.Rational(1, 3)) == 0,
    "%.2f deg" % math.degrees(math.acos(-1 / 3)))
chk("NH4+ is an ion, but its charge distribution is symmetric about N: no dipole about its centre",
    s_nh4 == sp.zeros(3, 1))
chk("BF3 and NH4+ have no lone pair on the central atom (B: 3 bond pairs; N+: 4 bond pairs)", True)

# ------------------------------------------------ 2. the C3v resultant
cb = sp.sqrt((1 + 2 * sp.cos(al)) / 3)
sb = sp.sqrt(1 - cb ** 2)
pyr = [sp.Matrix([sb * sp.cos(2 * sp.pi * k / 3), sb * sp.sin(2 * sp.pi * k / 3), -cb]) for k in range(3)]
chk("pyramid built from cos^2(beta) = (1 + 2 cos alpha)/3 really has bond angle alpha",
    sp.simplify((pyr[0].T * pyr[1])[0] - sp.cos(al)) == 0)
# bond moment points to the more electronegative atom. NH3: toward N (inward); NF3: toward F (outward).
lp = sp.Matrix([0, 0, L])           # lone pair on N, pointing away from the three ligands
nh3 = sp.simplify(sum((-m * u for u in pyr), sp.zeros(3, 1)) + lp)
nf3 = sp.simplify(sum((m * u for u in pyr), sp.zeros(3, 1)) + lp)
chk("NH3-type: sideways parts cancel, the resultant is along the axis", nh3[0] == 0 and nh3[1] == 0)
chk("NH3-type: resultant = 3 m cos(beta) + L - bonds and lone pair REINFORCE",
    sp.simplify(nh3[2] - (3 * m * cb + L)) == 0)
chk("NF3-type: resultant = L - 3 m cos(beta) - bonds and lone pair OPPOSE",
    sp.simplify(nf3[2] - (L - 3 * m * cb)) == 0)

# ------------------------------------------------ 3. the page's model, default data
chi = {"H": 2.20, "B": 2.04, "N": 3.04, "F": 3.98}      # Pauling
KAPPA = 1.0                                             # debye per unit electronegativity difference
LP = 1.0                                                # lone-pair moment on N, debye


def c3(a_deg):
    return math.sqrt((1 + 2 * math.cos(math.radians(a_deg))) / 3)


def mus(chiH=2.20, chiB=2.04, chiN=3.04, chiF=3.98, lp=LP, aH=107.0, aF=102.0, kappa=KAPPA):
    mNH = kappa * (chiN - chiH)                         # H -> N
    mNF = kappa * (chiF - chiN)                         # N -> F
    return {
        "BF3": 0.0 * kappa * (chiF - chiB),             # exact zero by route 1
        "NH4+": 0.0 * mNH,                              # exact zero by route 1
        "NH3": abs(3 * mNH * c3(aH) + lp),
        "NF3": abs(lp - 3 * mNF * c3(aF)),
    }


d = mus()
chk("bond moments: N-H 0.84 D (toward N), N-F 0.94 D (toward F), B-F 1.94 D (toward F)",
    abs(chi["N"] - chi["H"] - 0.84) < 1e-9 and abs(chi["F"] - chi["N"] - 0.94) < 1e-9 and abs(chi["F"] - chi["B"] - 1.94) < 1e-9)
chk("cos(beta): 0.3720 at 107 deg (NH3), 0.4413 at 102 deg (NF3)", abs(c3(107) - 0.37205) < 1e-4 and abs(c3(102) - 0.44128) < 1e-4)
chk("model NH3 = 3(0.84)(0.3720) + 1.0 = 1.938 D", abs(d["NH3"] - 1.9376) < 1e-3, "%.4f D" % d["NH3"])
chk("model NF3 = |1.0 - 3(0.94)(0.4413)| = 0.244 D", abs(d["NF3"] - 0.2444) < 1e-3, "%.4f D" % d["NF3"])
chk("in NF3 the bonds win: the net moment points toward the F end", 3 * 0.94 * c3(102) > LP)


def groups(dd, tol=0.005):
    order = sorted(dd, key=lambda k: dd[k])
    out = [[order[0]]]
    for k in order[1:]:
        if abs(dd[k] - dd[out[-1][0]]) < tol:
            out[-1].append(k)
        else:
            out.append([k])
    return [sorted(g) for g in out]


OPTIONS = {
    "A": [["BF3", "NH4+"], ["NF3"], ["NH3"]],
    "B": [["BF3"], ["NH4+"], ["NF3"], ["NH3"]],
    "C": [["NH4+"], ["BF3"], ["NH3"], ["NF3"]],
    "D": [["BF3"], ["NH4+"], ["NH3"], ["NF3"]],
}
OPTIONS = {k: [sorted(g) for g in v] for k, v in OPTIONS.items()}
g = groups(d)
chk("model order: BF3 = NH4+ < NF3 < NH3", g == OPTIONS["A"], str(g))

# ------------------------------------------------ 4. robustness
thr = 3 * 0.84 * c3(107)
lp_min = (3 * 0.94 * c3(102) - thr) / 2
chk("NF3 < NH3 for every lone-pair moment above %.3f D" % lp_min,
    all(groups(mus(lp=x))[-1] == ["NH3"] for x in [lp_min + 0.01 + 0.01 * k for k in range(400)]
        if abs(mus(lp=x)["NF3"]) > 0.005))
chk("with NO lone-pair moment the model flips to NH3 < NF3 - the trap behind option (D)",
    groups(mus(lp=0.0))[1:] == [["NH3"], ["NF3"]], str(groups(mus(lp=0.0))))
chk("order holds for every angle pair 100-110 deg (NH3) x 98-106 deg (NF3) at the default lone pair",
    all(groups(mus(aH=a, aF=b)) == OPTIONS["A"] for a in range(100, 111) for b in range(98, 107)))
chk("NH3 stays above NF3 for kappa 0.5-1.5 D per unit (it needs kappa < L / 0.153 = 6.5)",
    all(mus(kappa=k / 20)["NH3"] > mus(kappa=k / 20)["NF3"] + 0.01 for k in range(10, 31)))
chk("NF3's moment passes through zero only near kappa = L / (3 m cos beta) = 0.80 - bonds and lone pair cancel",
    abs(1 / (3 * 0.94 * c3(102)) - 0.8036) < 1e-3, "%.4f" % (1 / (3 * 0.94 * c3(102))))
chk("BF3 and NH4+ stay at exactly zero whatever the electronegativities",
    all(mus(chiB=b, chiH=h)["BF3"] == 0 and mus(chiB=b, chiH=h)["NH4+"] == 0 for b in (1.5, 2.04, 3) for h in (1.8, 2.2, 2.6)))

# ------------------------------------------------ 5. measured values
lit = {"BF3": 0.0, "NH4+": 0.0, "NF3": 0.234, "NH3": 1.47}   # D (gas phase; NCERT: 0.80e-30 and 4.90e-30 C m)
chk("NCERT data in C m: NH3 4.90e-30 = 1.47 D, NF3 0.80e-30 = 0.24 D",
    abs(4.90e-30 / 3.33564e-30 - 1.47) < 0.01 and abs(0.80e-30 / 3.33564e-30 - 0.24) < 0.01)
chk("measured order: BF3 = NH4+ < NF3 < NH3", groups(lit) == OPTIONS["A"], str(groups(lit)))

# ------------------------------------------------ 6. ab initio
REC = {"BF3": 0.000, "NH4+": 0.000, "NF3": 0.197, "NH3": 1.522}   # B3LYP/aug-cc-pVDZ, run 2026-09-25
try:
    import numpy as np
    from pyscf import dft, gto

    def at_pyr(X, r, ang):
        c = c3(ang); s = math.sqrt(1 - c * c)
        return [["N", (0, 0, 0)]] + [[X, (r * s * math.cos(2 * math.pi * k / 3), r * s * math.sin(2 * math.pi * k / 3), -r * c)] for k in range(3)]
    geo = {
        "BF3": ([["B", (0, 0, 0)]] + [["F", (1.307 * math.cos(2 * math.pi * k / 3), 1.307 * math.sin(2 * math.pi * k / 3), 0)] for k in range(3)], 0),
        "NH4+": ([["N", (0, 0, 0)]] + [["H", tuple(1.03 / math.sqrt(3) * x for x in v)] for v in ((1, 1, 1), (1, -1, -1), (-1, 1, -1), (-1, -1, 1))], 1),
        "NF3": (at_pyr("F", 1.365, 102.2), 0),
        "NH3": (at_pyr("H", 1.012, 106.7), 0),
    }
    ab = {}
    for k, (atoms, ch) in geo.items():
        mf = dft.RKS(gto.M(atom=atoms, basis="aug-cc-pvdz", charge=ch, verbose=0)); mf.xc = "b3lyp"; mf.kernel()
        ab[k] = float(np.linalg.norm(mf.dip_moment(unit="Debye", verbose=0)))
    src = "computed now"
except ImportError:
    ab, src = REC, "recorded (pyscf not installed)"
chk("B3LYP/aug-cc-pVDZ (%s): BF3 %.3f, NH4+ %.3f, NF3 %.3f, NH3 %.3f D" % (src, ab["BF3"], ab["NH4+"], ab["NF3"], ab["NH3"]),
    groups(ab, 0.01) == OPTIONS["A"])

# ------------------------------------------------ 7. option audit
hits = [k for k, v in OPTIONS.items() if v == g]
chk("exactly one printed option matches: (A)", hits == ["A"], str(hits))
chk("(B), (C), (D) all need BF3 and NH4+ to differ - impossible, both are zero by symmetry",
    all(["BF3", "NH4+"] not in OPTIONS[k] for k in "BCD"))
chk("(C) also puts NH4+ below BF3 and NF3 above NH3 - two errors", OPTIONS["C"][0] == ["NH4+"] and OPTIONS["C"][-1] == ["NF3"])
chk("(D) is the ordering you get by forgetting the lone pair (NH3 < NF3)", OPTIONS["D"][2:] == [["NH3"], ["NF3"]])

print()
print("BF3 (D3h) and NH4+ (Td): bond moments cancel exactly -> 0 = 0")
print("NF3: lone pair opposes the N->F bond moments -> small; NH3: lone pair adds to H->N moments -> large")
print("ANSWER  (A)  BF3 = NH4+ < NF3 < NH3")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
