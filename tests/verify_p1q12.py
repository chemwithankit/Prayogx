"""ADV-2026-P1-CHE-Q12 - independent derivation, no answer key consulted.

Treatment of buta-1,3-diyne with NaNH2 (2 equivalents), followed by reaction with excess of
trans-CH3-CH=CH-CH2-Br gives X as the major product. The maximum number of carbon atoms that are
collinear (in a straight line) in X is ____.

Routes used, so no single argument is trusted on its own:
  1. RDKit reaction templates - terminal-alkyne deprotonation (one per equivalent of NaNH2) and
     acetylide SN2 on a primary alkyl bromide - generate X; it is not typed in. The templates are shown
     NOT to fire where they should not (no second deprotonation with 1 eq, no SN2 on a neutral alkyne)
  2. charge and atom bookkeeping for every step
  3. hybridisation read by RDKit from the product graph
  4. 3-D geometry: X embedded (ETKDG, 20 conformers) and optimised with MMFF94; the largest set of
     carbon atoms within 0.10 A of one straight line is measured in every conformer
  5. the same rule the page uses (a run of sp carbons plus the two atoms bonded to its ends) on its own
  6. the conditions the page lets a student change (triyne, ethyne, 1 eq, allyl, propargyl) and the traps

Run:  python3 tests/verify_p1q12.py
"""
from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit.Chem.rdMolDescriptors import CalcMolFormula
import numpy as np

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


def can(s):
    return Chem.MolToSmiles(Chem.MolFromSmiles(s))


DEPROT = AllChem.ReactionFromSmarts("[CH1:1]#[C:2]>>[C-:1]#[C:2]")
SN2 = AllChem.ReactionFromSmarts("[C-:1]#[C:2].[CH2:3][Br:4]>>[C+0:1](#[C:2])[CH2:3].[Br-:4]")


def once(rxn, mols):
    out = rxn.RunReactants(mols)
    if not out:
        return None
    p = out[0][0]
    Chem.SanitizeMol(p)
    return p


def make(alkyne, eq, bromide):
    """the page's experiment: eq x deprotonation, then SN2 with excess bromide until no carbanion is left"""
    m = Chem.MolFromSmiles(alkyne)
    for _ in range(eq):
        p = once(DEPROT, (m,))
        if p is None:
            break
        m = p
    rx = Chem.MolFromSmiles(bromide)
    while m.HasSubstructMatch(Chem.MolFromSmarts("[C-]")):
        m = once(SN2, (m, rx))
    return Chem.MolFromSmiles(Chem.MolToSmiles(m))


def line_count_3d(smi, nconf=20, tol=0.10):
    mh = Chem.AddHs(Chem.MolFromSmiles(smi))
    cids = AllChem.EmbedMultipleConfs(mh, numConfs=nconf, randomSeed=7)
    AllChem.MMFFOptimizeMoleculeConfs(mh, maxIters=2000)
    C = [a.GetIdx() for a in mh.GetAtoms() if a.GetSymbol() == "C"]
    counts = []
    for cid in cids:
        X = mh.GetConformer(cid).GetPositions()
        best = 0
        for i in range(len(C)):
            for j in range(i + 1, len(C)):
                a, b = X[C[i]], X[C[j]]
                u = (b - a) / np.linalg.norm(b - a)
                n = sum(1 for k in C if np.linalg.norm(np.cross(X[k] - a, u)) < tol)
                best = max(best, n)
        counts.append(best)
    return counts


def line_by_rule(mol):
    """longest run of sp carbons along the carbon skeleton, plus the atom bonded to each end of the run"""
    sp = {a.GetIdx() for a in mol.GetAtoms() if a.GetSymbol() == "C" and a.GetHybridization() == Chem.HybridizationType.SP}
    best = 0
    seen = set()
    for s in sp:
        if s in seen:
            continue
        run, stack = set(), [s]
        while stack:
            k = stack.pop()
            if k in run:
                continue
            run.add(k)
            stack += [n.GetIdx() for n in mol.GetAtomWithIdx(k).GetNeighbors() if n.GetIdx() in sp]
        seen |= run
        ends = {n.GetIdx() for k in run for n in mol.GetAtomWithIdx(k).GetNeighbors() if n.GetIdx() not in run and n.GetSymbol() == "C"}
        best = max(best, len(run) + len(ends))
    return best


DIYNE, CROTYL = "C#CC#C", "C/C=C/CBr"

# ------------------------------------------------ 1. the reactions
m1 = once(DEPROT, (Chem.MolFromSmiles(DIYNE),))
m2 = once(DEPROT, (m1,))
chk("NaNH2 eq 1 removes one terminal H: HC#C-C#C(-)", Chem.MolToSmiles(m1) == can("[C-]#CC#C"), Chem.MolToSmiles(m1))
chk("NaNH2 eq 2 removes the other: (-)C#C-C#C(-)", Chem.MolToSmiles(m2) == can("[C-]#CC#[C-]"), Chem.MolToSmiles(m2))
chk("no third deprotonation is possible (no C-H left on an sp carbon)", once(DEPROT, (m2,)) is None)
chk("SN2 does not fire on the neutral alkyne", once(SN2, (Chem.MolFromSmiles(DIYNE), Chem.MolFromSmiles(CROTYL))) is None)
X = make(DIYNE, 2, CROTYL)
xs = Chem.MolToSmiles(X)
chk("X = CH3CH=CHCH2-C#C-C#C-CH2CH=CHCH3", xs == can("C/C=C/CC#CC#CC/C=C/C"), xs)
chk("X is C12H14", CalcMolFormula(X) == "C12H14", CalcMolFormula(X))
db = [b for b in X.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE]
chk("both C=C keep the trans (E) geometry - SN2 at the CH2 never touches them", all(b.GetStereo() == Chem.BondStereo.STEREOE for b in db), str([str(b.GetStereo()) for b in db]))

# ------------------------------------------------ 2. bookkeeping
dia = Chem.MolFromSmiles("[C-]#CC#[C-]")
chk("dianion carries charge -2 (two Na+ counter-ions)", Chem.GetFormalCharge(dia) == -2)
chk("carbon balance: 4 (diyne) + 2 x 4 (crotyl) = 12", sum(1 for a in X.GetAtoms() if a.GetSymbol() == "C") == 12)
chk("hydrogen balance: 2 - 2 (to NH3) + 2 x 7 (crotyl) = 14", sum(a.GetTotalNumHs() for a in X.GetAtoms()) == 14)
chk("X is neutral; each step conserves charge (NH2- -> NH3, C- + R-Br -> C-R + Br-)", Chem.GetFormalCharge(X) == 0)

# ------------------------------------------------ 3. hybridisation
hy = [str(a.GetHybridization()) for a in X.GetAtoms()]
chk("4 sp carbons in X", hy.count("SP") == 4, str(hy))
chk("4 sp2 carbons (two C=C) and 4 sp3 carbons (2 CH3, 2 CH2)", hy.count("SP2") == 4 and hy.count("SP3") == 4)

# ------------------------------------------------ 4. 3-D geometry
cnt = line_count_3d(xs)
chk("MMFF 3-D model: 6 carbons on one straight line, in every conformer", set(cnt) == {6}, str(sorted(set(cnt))))
mh = Chem.AddHs(X)
AllChem.EmbedMolecule(mh, randomSeed=11)
AllChem.MMFFOptimizeMolecule(mh, maxIters=2000)
P = mh.GetConformer().GetPositions()
patt = Chem.MolFromSmarts("[CH2]C#CC#C[CH2]")
path = mh.GetSubstructMatch(patt)
a, b = P[path[0]], P[path[-1]]
u = (b - a) / np.linalg.norm(b - a)
dev = [np.linalg.norm(np.cross(P[k] - a, u)) for k in path]
chk("CH2-C#C-C#C-CH2: all six within 0.05 A of the line through the two CH2", max(dev) < 0.05, "max %.3f A" % max(dev))
nxt = [n.GetIdx() for n in mh.GetAtomWithIdx(path[0]).GetNeighbors() if n.GetSymbol() == "C" and n.GetIdx() != path[1]][0]
d_next = np.linalg.norm(np.cross(P[nxt] - a, u))
chk("the next carbon (sp2 CH=) is well off the line", d_next > 1.0, "%.2f A" % d_next)
v1, v2 = P[path[1]] - P[path[0]], P[nxt] - P[path[0]]
ang = np.degrees(np.arccos(np.dot(v1, v2) / np.linalg.norm(v1) / np.linalg.norm(v2)))
chk("angle at the CH2 is tetrahedral (~109.5 deg, MMFF)", 105 < ang < 116, "%.1f deg" % ang)

# ------------------------------------------------ 5. the page's rule, on its own
chk("rule: sp run (4) + its two neighbours = 6", line_by_rule(X) == 6)

# ------------------------------------------------ 6. what the page lets a student change
cases = [("hexa-1,3,5-triyne", "C#CC#CC#C", 2, CROTYL, 8), ("ethyne", "C#C", 2, CROTYL, 4), ("1 eq NaNH2", DIYNE, 1, CROTYL, 5),
         ("allyl bromide", DIYNE, 2, "C=CCBr", 6), ("propargyl bromide", DIYNE, 2, "C#CCBr", 6)]
page = {"hexa-1,3,5-triyne": 8, "ethyne": 4, "1 eq NaNH2": 5, "allyl bromide": 6, "propargyl bromide": 6}   # the page's engine (node run)
for name, alk, eq, br, exp in cases:
    P2 = make(alk, eq, br)
    r = line_by_rule(P2)
    g = line_count_3d(Chem.MolToSmiles(P2), nconf=6)
    chk("variant %-18s rule %d = 3-D %s = page %d" % (name, r, max(g), page[name]), r == exp == max(g) == page[name], Chem.MolToSmiles(P2))

# ------------------------------------------------ traps
chk("trap: counting only the sp carbons gives 4, not the answer", hy.count("SP") == 4 != 6)
chk("trap: the line does not run on to 8 (CH= is %.1f A off it)" % d_next, d_next > 1.0)
sn2p = can("C=CC(C)C#CC#CC(C)C=C")   # if the acetylide attacked the far end (SN2') instead
chk("even the SN2' side product would give 6 - the count is robust", line_by_rule(Chem.MolFromSmiles(sn2p)) == 6)

print()
print("X = (2E,10E)-dodeca-2,10-diene-5,7-diyne, CH3CH=CHCH2-C#C-C#C-CH2CH=CHCH3")
print("ANSWER  6")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
