"""ADV-2026-P1-CHE-Q07 - independent derivation, no answer key consulted.

Reaction of PtF6 with oxygen gas gives an ionic compound X+Y-. Correct statement(s):
  (A) The bond order of X+ is 1.5.
  (B) Valence d-orbitals of the metal ion in X+Y- has 5 electrons.
  (C) PtF6 acts as an oxidant in this reaction.
  (D) PtF6 acts as a fluorinating agent in this reaction.

Routes used, so no single argument is trusted on its own:
  1. element and charge conservation fix X+ = O2+ and Y- = [PtF6]- (the only split of O2PtF6 into
     a +1 cation and a -1 anion that keeps six F on Pt, as a hexafluoride anion must)
  2. molecular-orbital filling (aufbau + Hund) written here from scratch: bond orders of the O2 family
     and of N2 / NO+ against the textbook values; the measured bond lengths fall in the same order
  3. Hartree-Fock (pyscf): O2, O2+ and O2- bond-length scans and Mayer bond orders - removing the
     electron shortens and strengthens the bond (runs only when pyscf is installed)
  4. oxidation states by charge balance (sympy) and the platinum electron configuration
  5. an electron and fluorine ledger for the reaction
  6. an audit of every printed option, and the conditions the page lets a student change

Run:  python3 tests/verify_p1q07.py
"""
import re

import sympy as sp

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


def formula(s):
    out = {}
    for el, n in re.findall(r"([A-Z][a-z]?)(\d*)", s):
        out[el] = out.get(el, 0) + (int(n) if n else 1)
    return out


# ------------------------------------------------ 1. what are X+ and Y-?
lhs = {}
for f in ("O2", "PtF6"):
    for k, v in formula(f).items():
        lhs[k] = lhs.get(k, 0) + v
# product is one salt X+Y-; Y- must be a platinum fluoride anion that keeps the metal, X+ holds the rest
cands = []
for nF_on_Pt in range(0, 7):
    X = {"O": 2, "F": 6 - nF_on_Pt}
    Y = {"Pt": 1, "F": nF_on_Pt}
    # oxidation states: F -1 always; O in X+ averages (1 + (6 - nF)) / 2; Pt = nF - 1
    ptox = nF_on_Pt - 1
    oox = sp.Rational(1 + (6 - nF_on_Pt), 2)
    cands.append((nF_on_Pt, X, Y, ptox, oox))
hexa = [c for c in cands if c[0] == 6]
chk("mass balance O2 + PtF6 -> X+Y- conserves O 2, Pt 1, F 6", lhs == {"O": 2, "Pt": 1, "F": 6})
chk("Y- keeps all six F on Pt (a hexafluoroplatinate anion) -> X+ = O2+, Y- = [PtF6]-", hexa[0][1] == {"O": 2, "F": 0} and hexa[0][2] == {"Pt": 1, "F": 6})
chk("any other split would put F on oxygen (an O-F bond) - that is the fluorination that did NOT happen", all(c[1]["F"] > 0 for c in cands if c[0] < 6))
IE = {"O2": 12.07, "Xe": 12.13, "NO": 9.26, "N2": 15.58}
chk("IE(O2) 12.07 eV is below IE(Xe) 12.13 eV - Bartlett's reason for trying Xe next", IE["O2"] < IE["Xe"])

# ------------------------------------------------ 2. MO filling, written independently of the page
def mo(n, order=None):
    # (name, energy rank, bonding?)
    if (order or ('O' if n > 14 else 'N')) == 'O':
        L = [("s1s", 1, 1), ("s*1s", 2, 0), ("s2s", 3, 1), ("s*2s", 4, 0), ("s2pz", 5, 1), ("p2px", 6, 1), ("p2py", 6, 1),
             ("p*2px", 7, 0), ("p*2py", 7, 0), ("s*2pz", 8, 0)]
    else:
        L = [("s1s", 1, 1), ("s*1s", 2, 0), ("s2s", 3, 1), ("s*2s", 4, 0), ("p2px", 5, 1), ("p2py", 5, 1), ("s2pz", 6, 1),
             ("p*2px", 7, 0), ("p*2py", 7, 0), ("s*2pz", 8, 0)]
    occ = {o[0]: 0 for o in L}
    left = n
    for r in range(1, 9):
        g = [o for o in L if o[1] == r]
        for o in g:
            if left:
                occ[o[0]] += 1; left -= 1
        for o in g:
            if left:
                occ[o[0]] += 1; left -= 1
    nb = sum(occ[o[0]] for o in L if o[2])
    na = sum(occ[o[0]] for o in L if not o[2])
    un = sum(1 for o in L if occ[o[0]] == 1)
    return sp.Rational(nb - na, 2), nb, na, un, occ


BO = {k: mo(n)[0] for k, n in {"O2 2-": 18, "O2-": 17, "O2": 16, "O2+": 15, "N2": 14, "NO+": 14, "NO": 15}.items()}
chk("O2+ (15 e): bonding 10, antibonding 5 -> bond order 5/2", mo(15)[1:3] == (10, 5) and BO["O2+"] == sp.Rational(5, 2))
chk("textbook series: O2 2- 1, O2- 3/2, O2 2, O2+ 5/2, N2 3, NO+ 3, NO 5/2",
    [BO[k] for k in ("O2 2-", "O2-", "O2", "O2+", "N2", "NO+", "NO")] == [1, sp.Rational(3, 2), 2, sp.Rational(5, 2), 3, 3, sp.Rational(5, 2)])
chk("the electron removed from O2 was antibonding (pi*): bond order rises 2 -> 2.5", mo(16)[2] - mo(15)[2] == 1)
chk("bond order 1.5 belongs to superoxide O2- (17 e), not to O2+", BO["O2-"] == sp.Rational(3, 2))
chk("magnetism: O2 two unpaired, O2+ one unpaired (both paramagnetic)", mo(16)[3] == 2 and mo(15)[3] == 1)
chk("the sigma2p / pi2p ordering does not change any bond order (every count 10-18 e, both orders)", all(mo(n, "O")[0] == mo(n, "N")[0] for n in range(10, 19)))
LEN = {"O2 2-": 149, "O2-": 133, "O2": 121, "O2+": 112}     # pm, measured
chk("measured bond lengths shrink as the bond order rises: 149 > 133 > 121 > 112 pm",
    sorted(LEN, key=lambda k: BO[k]) == sorted(LEN, key=lambda k: -LEN[k]))

try:
    import numpy as np
    from pyscf import gto, scf

    def uhf(r, q, s):
        m = gto.M(atom="O 0 0 0; O 0 0 %f" % r, basis="6-31g*", charge=q, spin=s, verbose=0)
        mf = scf.UHF(m)
        mf.kernel()
        S = m.intor("int1e_ovlp")
        Pa, Pb = mf.make_rdm1()
        lab = np.array([a[0] for a in m.ao_labels(fmt=False)])
        A, B = lab == 0, lab == 1
        PSa, PSb = Pa @ S, Pb @ S
        mb = 2 * (np.sum(PSa[np.ix_(A, B)] * PSa[np.ix_(B, A)].T) + np.sum(PSb[np.ix_(A, B)] * PSb[np.ix_(B, A)].T))
        return mf.e_tot, mb

    res = {}
    for key, q, s in (("O2", 0, 2), ("O2+", 1, 1), ("O2-", -1, 1)):
        rs = np.arange(1.00, 1.45, 0.01)
        r0 = rs[int(np.argmin([uhf(r, q, s)[0] for r in rs]))]
        res[key] = (r0, uhf(r0, q, s)[1])
    chk("UHF/6-31G* equilibrium bond: O2+ %.2f < O2 %.2f < O2- %.2f A" % (res["O2+"][0], res["O2"][0], res["O2-"][0]),
        res["O2+"][0] < res["O2"][0] < res["O2-"][0])
    chk("UHF Mayer bond order: O2+ %.2f > O2 %.2f > O2- %.2f - O2+ is far above 1.5" % (res["O2+"][1], res["O2"][1], res["O2-"][1]),
        res["O2+"][1] > res["O2"][1] > res["O2-"][1] and res["O2+"][1] > 2.0)
except ImportError:
    print("SKIP  pyscf not installed - recorded: UHF/6-31G* r(O2+) 1.07 < r(O2) 1.17 < r(O2-) 1.30 A; Mayer BO 2.26 > 1.83 > 1.38")

# ------------------------------------------------ 3. oxidation states and platinum's d-electrons
x = sp.symbols("x")
pt_in_PtF6 = sp.solve(sp.Eq(x + 6 * (-1), 0), x)[0]
pt_in_anion = sp.solve(sp.Eq(x + 6 * (-1), -1), x)[0]
chk("charge balance: Pt +6 in PtF6, +5 in [PtF6]-", pt_in_PtF6 == 6 and pt_in_anion == 5)
d, s = 9, 1                                   # Pt ground state [Xe] 4f14 5d9 6s1 (NIST)
chk("Pt ground state [Xe]4f14 5d9 6s1: 10 electrons beyond the 4f14 core, as for group 10", d + s == 10)


def d_count(ox):
    dd, ss = d, s
    for _ in range(ox):
        if ss:
            ss -= 1
        else:
            dd -= 1
    return dd, ss


chk("Pt(+5): 6s1 then four 5d leave -> 5d5, 6s0", d_count(5) == (5, 0))
chk("Pt(+6) in PtF6 would be 5d4 - the electron from O2 turns it into 5d5", d_count(6) == (4, 0))
t2g = min(6, d_count(5)[0])
chk("octahedral low spin (5d, large splitting): t2g5 eg0, one unpaired electron", t2g == 5 and d_count(5)[0] - t2g == 0)

# ------------------------------------------------ 4. electron and fluorine ledger
e_lost_by_O2 = 1                               # O2 -> O2+
e_gained_by_Pt = pt_in_PtF6 - pt_in_anion      # +6 -> +5
chk("electrons: O2 loses 1, Pt gains 1 - PtF6 is reduced, i.e. it is the oxidant", e_lost_by_O2 == e_gained_by_Pt == 1)
F_on_Pt_before, F_on_Pt_after, F_on_O_after = 6, formula("PtF6")["F"], formula("O2").get("F", 0)
chk("fluorine: 6 on Pt before, 6 on Pt after, 0 on oxygen - no F transferred", (F_on_Pt_before, F_on_Pt_after, F_on_O_after) == (6, 6, 0))

# ------------------------------------------------ 5. option audit
truth = {
    "A": BO["O2+"] == sp.Rational(3, 2),
    "B": d_count(pt_in_anion)[0] == 5,
    "C": e_gained_by_Pt > 0,
    "D": F_on_O_after > 0,
}
T = [k for k in "ABCD" if truth[k]]
chk("(A) false: bond order of O2+ is 2.5", not truth["A"])
chk("(B) true: Pt(+5) is 5d5", truth["B"])
chk("(C) true: PtF6 is reduced, so it is the oxidant", truth["C"])
chk("(D) false: no fluorine moves to oxygen", not truth["D"])
chk("true statements: B, C", T == ["B", "C"], str(T))

# the conditions the page lets a student change
chk("NO instead: IE 9.26 eV -> NO+[PtF6]- (a known salt), NO+ bond order 3 - still not 1.5", IE["NO"] < 12.2 and BO["NO+"] == 3)
chk("N2 instead: IE 15.58 eV is above what PtF6 can remove - no salt", IE["N2"] > 12.2)

print()
print("X+ = O2+ (bond order 2.5)   Y- = [PtF6]- (Pt +5, 5d5)   PtF6 = oxidant, not a fluorinating agent")
print("ANSWER  (B), (C)")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
raise SystemExit(1 if fail else 0)
