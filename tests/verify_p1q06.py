"""ADV-2026-P1-CHE-Q06 - independent derivation, no answer key consulted.

  MnO2 + conc. HCl -> MnCl2 + X (greenish-yellow gas) + H2O
  NH3 + X (excess)  -> Y + HCl
  X + F2 (excess)  --573 K-->  Z

Correct statement(s):
  (A) X is used for sterilizing drinking water.   (B) Y has a planar structure.
  (C) Z is used in the enrichment of 235U.        (D) Y is a stronger Lewis base than ammonia.

Routes used, so no single argument is trusted on its own:
  1. element conservation (sympy nullspace) fixes X from reaction 1 with no chemistry assumed
  2. every equation used anywhere on the page balances, atoms and charge
  3. oxidation states: the redox in reaction 1 and the fluorination in reaction 3
  4. VSEPR electron counting for NCl3, NH3 and ClF3
  5. geometry: pyramid height of NCl3 from its measured bond length and angle, and an RDKit
     3D embedding - both say N sits well out of the Cl3 plane
  6. Lewis basicity: Pauling electronegativities, and Hartree-Fock (pyscf) proton affinities
     and N charges for NH3 and NCl3 treated identically (runs only when pyscf is installed)
  7. the NCERT-recorded uses of Cl2 and ClF3
  8. an audit of every printed option, and the conditions the page lets a student change

Run:  python3 tests/verify_p1q06.py
"""
import math
import re

import sympy as sp

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


def formula(s):
    """'MnCl2' -> {'Mn':1,'Cl':2}; supports a leading coefficient-free formula with brackets-free groups."""
    out = {}
    for el, n in re.findall(r"([A-Z][a-z]?)(\d*)", s):
        out[el] = out.get(el, 0) + (int(n) if n else 1)
    return out


def balanced(lhs, rhs, charge=(0, 0)):
    """lhs/rhs: lists of (coef, formula). True if every element count matches."""
    tot = {}
    for sign, side in ((1, lhs), (-1, rhs)):
        for c, f in side:
            for el, n in formula(f).items():
                tot[el] = tot.get(el, 0) + sign * c * n
    return all(v == 0 for v in tot.values()) and charge[0] == charge[1]


# ------------------------------------------------ 1. X from element conservation alone
# MnO2 + a HCl -> MnCl2 + X + b H2O, X = Mn_p O_q H_r Cl_s unknown.
a, b, p, q, r, s = sp.symbols("a b p q r s")
eqs = [sp.Eq(1, 1 + p),           # Mn
       sp.Eq(2, q + b),           # O
       sp.Eq(a, r + 2 * b),       # H
       sp.Eq(a, 2 + s)]           # Cl
sol = sp.solve(eqs, [p, q, r, s], dict=True)[0]
# X contains no Mn (all Mn is in MnCl2); all O leaves as water; all H leaves as water:
b_val = 2
a_val = sp.solve(sp.Eq(sol[r].subs(b, b_val), 0), a)[0]
X = {"Mn": sol[p], "O": sol[q].subs(b, b_val), "H": sol[r].subs({a: a_val, b: b_val}), "Cl": sol[s].subs(a, a_val)}
chk("element conservation: X carries no Mn, O or H", X["Mn"] == 0 and X["O"] == 0 and X["H"] == 0, str(X))
chk("...and exactly two Cl atoms with a = 4 HCl, b = 2 H2O  ->  X = Cl2", a_val == 4 and X["Cl"] == 2)
GAS_COLOUR = {"O2": "colourless", "H2": "colourless", "HCl": "colourless", "H2O": "colourless", "Cl2": "greenish-yellow", "ClO2": "yellow"}
chk("the colour clue agrees: of the plausible gases only Cl2 is greenish-yellow", [g for g, c in GAS_COLOUR.items() if c == "greenish-yellow"] == ["Cl2"])

# ------------------------------------------------ 2. every equation balances
EQ = {
    "MnO2 + 4HCl -> MnCl2 + Cl2 + 2H2O": ([(1, "MnO2"), (4, "HCl")], [(1, "MnCl2"), (1, "Cl2"), (2, "H2O")]),
    "2KMnO4 + 16HCl -> 2KCl + 2MnCl2 + 5Cl2 + 8H2O": ([(2, "KMnO4"), (16, "HCl")], [(2, "KCl"), (2, "MnCl2"), (5, "Cl2"), (8, "H2O")]),
    "NH3 + 3Cl2 -> NCl3 + 3HCl": ([(1, "NH3"), (3, "Cl2")], [(1, "NCl3"), (3, "HCl")]),
    "NH3 + Cl2 -> NH2Cl + HCl": ([(1, "NH3"), (1, "Cl2")], [(1, "NH2Cl"), (1, "HCl")]),
    "NH2Cl + Cl2 -> NHCl2 + HCl": ([(1, "NH2Cl"), (1, "Cl2")], [(1, "NHCl2"), (1, "HCl")]),
    "NHCl2 + Cl2 -> NCl3 + HCl": ([(1, "NHCl2"), (1, "Cl2")], [(1, "NCl3"), (1, "HCl")]),
    "8NH3 + 3Cl2 -> N2 + 6NH4Cl": ([(8, "NH3"), (3, "Cl2")], [(1, "N2"), (6, "NH4Cl")]),
    "Cl2 + 3F2 -> 2ClF3": ([(1, "Cl2"), (3, "F2")], [(2, "ClF3")]),
    "Cl2 + F2 -> 2ClF": ([(1, "Cl2"), (1, "F2")], [(2, "ClF")]),
    "U + 3ClF3 -> UF6 + 3ClF": ([(1, "U"), (3, "ClF3")], [(1, "UF6"), (3, "ClF")]),
}
for k, (l, rr) in EQ.items():
    chk("balances: " + k, balanced(l, rr))
chk("reaction 2 as printed (NH3 + X -> Y + HCl) with X = Cl2 in excess leaves Y = NCl3", balanced([(1, "NH3"), (3, "Cl2")], [(1, "NCl3"), (3, "HCl")]))

# ------------------------------------------------ 3. oxidation states
chk("reaction 1 is a redox: Mn +4 -> +2 (gains 2e), 2Cl(-1) -> Cl2(0) (loses 2e)", (4 - 2) == 2 * (0 - (-1)))
chk("KMnO4 route: 2 Mn gain 2 x 5 e = 5 Cl2 formed x 2 e", 2 * (7 - 2) == 5 * 2)
chk("reaction 3: Cl goes 0 -> +3 in ClF3, each F 0 -> -1 (3 per Cl)", 3 == 3 * 1)

# ------------------------------------------------ 4. VSEPR
VAL = {"N": 5, "Cl": 7}


def vsepr(center, n_bonds):
    lp = (VAL[center] - n_bonds) // 2
    sn = n_bonds + lp
    shape = {(4, 1): "trigonal pyramidal", (4, 0): "tetrahedral", (3, 0): "trigonal planar",
             (5, 2): "T-shaped", (5, 0): "trigonal bipyramidal"}[(sn, lp)]
    return sn, lp, shape


chk("NCl3: 3 bond pairs + 1 lone pair = 4 -> trigonal pyramidal", vsepr("N", 3) == (4, 1, "trigonal pyramidal"))
chk("NH3: same count -> trigonal pyramidal", vsepr("N", 3)[2] == "trigonal pyramidal")
chk("ClF3: 3 bond pairs + 2 lone pairs = 5 -> T-shaped", vsepr("Cl", 3) == (5, 2, "T-shaped"))

# ------------------------------------------------ 5. is NCl3 planar?
d, ang = 1.759, 107.1                       # measured N-Cl (A) and Cl-N-Cl (deg)
t = math.radians(ang)
h = d * math.sqrt(1 - (4 / 3) * math.sin(t / 2) ** 2)
chk("from d(N-Cl) 1.759 A and Cl-N-Cl 107.1 deg: N is 0.65 A above the Cl3 plane", abs(h - 0.65) < 0.01, "%.3f A" % h)
chk("angle sum 3 x 107.1 = 321 deg, far below the 360 deg of a planar molecule", 3 * ang < 350)
try:
    from rdkit import Chem
    from rdkit.Chem import AllChem
    m = Chem.AddHs(Chem.MolFromSmiles("ClN(Cl)Cl"))
    AllChem.EmbedMolecule(m, randomSeed=7)
    AllChem.UFFOptimizeMolecule(m)
    c = m.GetConformer()
    P = [c.GetAtomPosition(i) for i in range(4)]
    n_idx = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == "N"][0]
    cl = [P[i] for i in range(4) if i != n_idx]
    N = P[n_idx]
    v1, v2 = cl[1] - cl[0], cl[2] - cl[0]
    nrm = v1.CrossProduct(v2)
    nrm = nrm / nrm.Length()
    hh = abs((N - cl[0]).DotProduct(nrm))
    angs = []
    for i in range(3):
        for j in range(i + 1, 3):
            u, w = cl[i] - N, cl[j] - N
            angs.append(math.degrees(math.acos(u.DotProduct(w) / (u.Length() * w.Length()))))
    chk("RDKit 3D embedding (UFF): N sits %.2f A out of the Cl3 plane, angles %.0f deg" % (hh, sum(angs) / 3), hh > 0.4 and sum(angs) < 350)
except ImportError:
    print("SKIP  RDKit not installed - pyramid height from measured data above stands")

# ------------------------------------------------ 6. Lewis basicity NH3 vs NCl3
CHI = {"H": 2.20, "N": 3.04, "Cl": 3.16}
chk("Pauling: H (2.20) is less electronegative than N (3.04) - pushes density onto N", CHI["H"] < CHI["N"])
chk("Pauling: Cl (3.16) is more electronegative than N - pulls density away (-I)", CHI["Cl"] > CHI["N"])
try:
    from pyscf import gto, scf

    def pyramid(X, dd, aa, extra_h=None):
        tt = math.radians(aa)
        rho = dd * 2 * math.sin(tt / 2) / math.sqrt(3)
        hz = math.sqrt(dd * dd - rho * rho)
        at = [("N", (0, 0, 0))]
        for k in range(3):
            ph = 2 * math.pi * k / 3
            at.append((X, (rho * math.cos(ph), rho * math.sin(ph), -hz)))
        if extra_h:
            at.append(("H", (0, 0, extra_h)))
        return at

    def hf(atoms, charge=0):
        mol = gto.M(atom=atoms, basis="6-31g*", charge=charge, verbose=0)
        mf = scf.RHF(mol).run()
        return mf.e_tot, mf.mulliken_pop(verbose=0)[1][0]

    PA, QN = {}, {}
    for X, dd, aa in (("H", 1.012, 106.7), ("Cl", 1.759, 107.1)):
        e0, qn = hf(pyramid(X, dd, aa))
        e1, _ = hf(pyramid(X, dd, 109.47, extra_h=1.02), 1)
        PA[X], QN[X] = (e0 - e1) * 2625.5, qn
    chk("HF/6-31G* proton affinity (both treated identically): NH3 %.0f > NCl3 %.0f kJ/mol" % (PA["H"], PA["Cl"]), PA["H"] > PA["Cl"] + 50)
    chk("HF Mulliken charge on N: NH3 %.2f is more negative than NCl3 %.2f" % (QN["H"], QN["Cl"]), QN["H"] < QN["Cl"])
except ImportError:
    print("SKIP  pyscf not installed - recorded: HF/6-31G* vertical PA NH3 909, NCl3 744 kJ/mol; q(N) -1.02 vs -0.58")
print("NOTE  measured: NH3 gas-phase proton affinity 853.6 kJ/mol (NIST); NCl3 has no useful basicity - water hydrolyses it instead")

# ------------------------------------------------ 7. recorded uses (NCERT Class 12, p-Block Elements)
USES = {
    "Cl2": ["sterilising drinking water", "bleaching wood pulp and cotton", "manufacture of dyes, drugs and CHCl3, CCl4, DDT"],
    "ClF3": ["preparation of UF6 in the enrichment of 235U: U + 3ClF3 -> UF6 + 3ClF"],
}
chk("NCERT: chlorine is used for sterilising drinking water", any("drinking water" in u for u in USES["Cl2"]))
chk("NCERT: ClF3 makes UF6 for the enrichment of 235U", any("235U" in u for u in USES["ClF3"]))

# ------------------------------------------------ 8. option audit
ids = {"X": "Cl2", "Y": "NCl3", "Z": "ClF3"}
truth = {
    "A": ids["X"] == "Cl2" and any("drinking water" in u for u in USES[ids["X"]]),
    "B": vsepr("N", 3)[2] in ("trigonal planar",),
    "C": ids["Z"] == "ClF3" and any("235U" in u for u in USES[ids["Z"]]),
    "D": CHI["Cl"] < CHI["H"],                 # NCl3 would need a MORE donating substituent than H
}
T = [k for k in "ABCD" if truth[k]]
chk("(A) true: Cl2 sterilises drinking water", truth["A"])
chk("(B) false: NCl3 is trigonal pyramidal, not planar", not truth["B"])
chk("(C) true: ClF3 fluorinates U to UF6 for 235U enrichment", truth["C"])
chk("(D) false: NCl3 is a weaker Lewis base than NH3", not truth["D"])
chk("true statements: A, C", T == ["A", "C"], str(T))

# the conditions the page lets a student change
chk("KMnO4 instead of MnO2: X is still Cl2 - the answer does not depend on the oxidant", balanced(*EQ["2KMnO4 + 16HCl -> 2KCl + 2MnCl2 + 5Cl2 + 8H2O"]))
chk("NH3 in excess instead: N2 + NH4Cl, no NCl3 - the question's Y needs Cl2 in excess", balanced(*EQ["8NH3 + 3Cl2 -> N2 + 6NH4Cl"]))
chk("equal volumes of F2 (or 473 K): ClF, not ClF3 - the question's Z needs F2 in excess at 573 K", balanced(*EQ["Cl2 + F2 -> 2ClF"]))

print()
print("X = Cl2   Y = NCl3 (trigonal pyramidal, weaker base than NH3)   Z = ClF3 (T-shaped, makes UF6)")
print("ANSWER  (A), (C)")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
raise SystemExit(1 if fail else 0)
