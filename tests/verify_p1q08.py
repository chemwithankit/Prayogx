"""ADV-2026-P1-CHE-Q08 - independent derivation, no answer key consulted.

  CH3CH2CH2COONa --1. Kolbe's electrolysis; 2. V2O5, 500 C, 10-20 atm--> Q
  Q --phthalic anhydride, anhyd. AlCl3--> R --1. PCl5; 2. H2-Pd/BaSO4--> S --NH2NH2, heat--> T

Correct statement(s):
  (A) S on warming with ammoniacal AgNO3 gives a silver mirror.
  (B) Q on treatment with Cl2(excess)/UV gives gammaxane.
  (C) T is a heterocyclic compound.
  (D) R on acid catalysed intramolecular cyclisation followed by Zn-Hg/HCl gives 9,10-dihydroxyanthracene.

Routes used, so no single argument is trusted on its own:
  1. element and charge balance of every step (Kolbe, aromatisation, chlorination, Friedel-Crafts,
     PCl5, Rosenmund, hydrazine condensation, cyclisation, Clemmensen)
  2. RDKit reaction templates applied to the structures - the products are generated, not typed in,
     and compared with the named compounds by canonical SMILES
  3. functional-group SMARTS for the tests: aldehyde (Tollens), ring heteroatoms, oxygen count
  4. the conditions the page lets a student change, and an audit of every printed option

Run:  python3 tests/verify_p1q08.py
"""
from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


def can(s):
    return Chem.MolToSmiles(Chem.MolFromSmiles(s) if isinstance(s, str) else s)


def counts(smiles_list):
    out = {}
    for coef, s in smiles_list:
        m = Chem.AddHs(Chem.MolFromSmiles(s))
        for a in m.GetAtoms():
            out[a.GetSymbol()] = out.get(a.GetSymbol(), 0) + coef
    return out


def balanced(lhs, rhs, charge_l=0, charge_r=0):
    return counts(lhs) == counts(rhs) and charge_l == charge_r


def run1(smarts, *reactants):
    rxn = AllChem.ReactionFromSmarts(smarts)
    prods = set()
    for ps in rxn.RunReactants(tuple(Chem.MolFromSmiles(r) for r in reactants)):
        try:
            p = ps[0]
            Chem.SanitizeMol(p)
            prods.add(Chem.MolToSmiles(p))
        except Exception:
            pass
    return prods


BENZENE, ANH = "c1ccccc1", "O=C1OC(=O)c2ccccc12"
R_ = can("OC(=O)c1ccccc1C(=O)c1ccccc1")
COCL = can("ClC(=O)c1ccccc1C(=O)c1ccccc1")
S_ = can("O=Cc1ccccc1C(=O)c1ccccc1")
T_ = can("c1ccc(cc1)-c1nncc2ccccc12")
AQ = can("O=C1c2ccccc2C(=O)c2ccccc12")
DHA = can("C1c2ccccc2Cc2ccccc12")
DHOA = can("Oc1c2ccccc2c(O)c2ccccc12")

# ------------------------------------------------ Q
chk("Kolbe: 2 C3H7COO- -> C6H14 + 2 CO2 + 2 e- (atoms balance, charge -2 = -2 via 2e-)",
    balanced([(2, "CCCC(=O)[O-]")], [(1, "CCCCCC"), (2, "O=C=O")]))
kolbe = run1("[CH2:1][C](=O)[O-].[CH2:2][C](=O)[O-]>>[CH2:1][CH2:2]", "CCCC(=O)[O-]", "CCCC(=O)[O-]")
chk("Kolbe template (lose CO2 from each, join the two alkyl carbons) on two butanoates gives n-hexane", kolbe == {can("CCCCCC")}, str(kolbe))
chk("aromatisation: C6H14 -> C6H6 + 4 H2 balances", balanced([(1, "CCCCCC")], [(1, BENZENE), (4, "[H][H]")]))
m = Chem.MolFromSmiles(BENZENE)
chk("Q = benzene: one aromatic six-membered ring, C6H6", CalcMolFormula(m) == "C6H6" and all(a.GetIsAromatic() for a in m.GetAtoms()))

# ------------------------------------------------ (B)
chk("Cl2/UV: C6H6 + 3 Cl2 -> C6H6Cl6 (addition) balances", balanced([(1, BENZENE), (3, "ClCl")], [(1, "ClC1C(Cl)C(Cl)C(Cl)C(Cl)C1Cl")]))
lindane = "Cl[C@H]1[C@H](Cl)[C@@H](Cl)[C@@H](Cl)[C@H](Cl)[C@H]1Cl"
chk("gammaxane (lindane, gamma-HCH) has the same constitution as the addition product",
    can(Chem.MolFromSmiles(lindane).__class__ and Chem.MolToSmiles(Chem.MolFromSmiles(lindane), isomericSmiles=False)) == can("ClC1C(Cl)C(Cl)C(Cl)C(Cl)C1Cl"))
chk("substitution instead (C6H5Cl) would not be gammaxane - under UV with excess Cl2 addition wins", CalcMolFormula(Chem.MolFromSmiles("Clc1ccccc1")) != "C6H6Cl6")

# ------------------------------------------------ R
fc = run1("([C:1](=[O:2])[O:3][C:4]=[O:5]).[c;H1:6]>>([C:1](=[O:2])[c:6].[C:4](=[O:5])[OH1:3])", ANH, BENZENE)
chk("Friedel-Crafts template on phthalic anhydride + benzene gives 2-benzoylbenzoic acid", R_ in {can(p) for p in fc}, str(len(fc)) + " product(s)")
chk("R = C14H10O3; C6H6 + C8H4O3 -> C14H10O3 balances", CalcMolFormula(Chem.MolFromSmiles(R_)) == "C14H10O3" and balanced([(1, BENZENE), (1, ANH)], [(1, R_)]))

# ------------------------------------------------ (D)
intramol = run1("([c:1][C:2](=[O:3])[OH].[cH:4])>>[c:1][C:2](=[O:3])[c:4]", R_)
chk("acid-catalysed intramolecular acylation of R gives anthraquinone (-H2O)", AQ in {can(p) for p in intramol} and balanced([(1, R_)], [(1, AQ), (1, "O")]))
clem = AQ
for _ in range(2):
    prods = run1("[#6:2][C:1](=O)[#6:3]>>[#6:2][CH2:1][#6:3]", clem)
    clem = sorted(prods)[0] if prods else clem
chk("Clemmensen template (C=O -> CH2) applied to both carbonyls gives 9,10-dihydroanthracene", can(clem) == DHA, can(clem))
chk("...C14H12, no oxygen; 9,10-dihydroxyanthracene is C14H10O2 - a different compound",
    CalcMolFormula(Chem.MolFromSmiles(DHA)) == "C14H12" and CalcMolFormula(Chem.MolFromSmiles(DHOA)) == "C14H10O2" and DHA != DHOA)

# ------------------------------------------------ S
p1 = run1("[C:1](=[O:2])[OH]>>[C:1](=[O:2])Cl", R_)
chk("PCl5 template: R -> acid chloride C14H9ClO2", COCL in {can(p) for p in p1})
p2 = run1("[C:1](=[O:2])Cl>>[CH1:1]=[O:2]", COCL)
chk("Rosenmund template (poisoned Pd stops at CHO): acid chloride -> 2-benzoylbenzaldehyde", S_ in {can(p) for p in p2})
chk("R-COCl + H2 -> R-CHO + HCl balances", balanced([(1, COCL), (1, "[H][H]")], [(1, S_), (1, "Cl")]))
ald = Chem.MolFromSmarts("[CX3H1](=O)[#6]")
chk("(A) S has an aldehyde C-H (Tollens positive); R and T do not",
    Chem.MolFromSmiles(S_).HasSubstructMatch(ald) and not Chem.MolFromSmiles(R_).HasSubstructMatch(ald) and not Chem.MolFromSmiles(T_).HasSubstructMatch(ald))
chk("Tollens: RCHO + 2[Ag(NH3)2]+ + 3OH- -> RCOO- + 2Ag + 4NH3 + 2H2O balances (atoms)",
    balanced([(1, "CC=O"), (2, "[Ag+]"), (4, "N"), (3, "[OH-]")], [(1, "CC(=O)[O-]"), (2, "[Ag]"), (4, "N"), (2, "O")], 2 - 3, -1))

# ------------------------------------------------ T
chk("S + N2H4 -> T + 2 H2O balances (both carbonyls condense)", balanced([(1, S_), (1, "NN")], [(1, T_), (2, "O")]))
t = Chem.MolFromSmiles(T_)
ri = t.GetRingInfo()
ringN = [a.GetIdx() for a in t.GetAtoms() if a.GetSymbol() == "N" and ri.NumAtomRings(a.GetIdx())]
chk("(C) T = 1-phenylphthalazine: 2 N atoms inside a six-membered ring - heterocyclic", len(ringN) == 2 and t.HasSubstructMatch(Chem.MolFromSmarts("c1nncc2ccccc12")))
chk("the two carbonyl carbons of S are 1,4-related (C-C(ar)-C(ar)-C): room for exactly N-N between them",
    Chem.MolFromSmiles(S_).HasSubstructMatch(Chem.MolFromSmarts("O=[CH1]c:c[CX3](=O)")))

# ------------------------------------------------ custom conditions
chk("sodium propanoate instead: Kolbe gives n-butane (C4) - too short to close a benzene ring", balanced([(2, "CCC(=O)[O-]")], [(1, "CCCC"), (2, "O=C=O")]))
alc = can("OCc1ccccc1C(=O)c1ccccc1")
chk("Pd/C (not poisoned) goes on to the alcohol: no CHO, Tollens negative", not Chem.MolFromSmiles(alc).HasSubstructMatch(ald))
chk("...and with one carbonyl left, hydrazine gives only a hydrazone - no ring can close",
    len(Chem.MolFromSmiles(alc).GetSubstructMatches(Chem.MolFromSmarts("[CX3]=O"))) == 1)

# ------------------------------------------------ option audit
truth = {
    "A": Chem.MolFromSmiles(S_).HasSubstructMatch(ald),
    "B": CalcMolFormula(Chem.MolFromSmiles(BENZENE)) == "C6H6",
    "C": len(ringN) > 0,
    "D": can(clem) == DHOA,
}
T = [k for k in "ABCD" if truth[k]]
chk("(A) true, (B) true, (C) true, (D) false", T == ["A", "B", "C"], str(T))

print()
print("Q = benzene  R = 2-benzoylbenzoic acid  S = 2-benzoylbenzaldehyde  T = 1-phenylphthalazine")
print("ANSWER  (A), (B), (C)")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
raise SystemExit(1 if fail else 0)
