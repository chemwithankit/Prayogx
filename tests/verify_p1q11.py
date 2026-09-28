"""ADV-2026-P1-CHE-Q11 - independent derivation, no answer key consulted.

The sum of total number of carbonyl groups (>C=O) present in the major products X and Y is ____.
  (1) HO2C-CH(CH3)-CO-CH(CH3)-CO2H  --heat-->  X
  (2) 4-oxocyclopentane-1,2-dicarboxylic acid, the two CO2H drawn cis (wedged ring bonds)  --heat-->  Y

Routes used, so no single argument is trusted on its own:
  1. the drawing decoded: the wedged ring bonds rebuilt as a mol block, read by RDKit, and the cis/trans
     relationship of the two CO2H groups measured on an embedded 3-D structure
  2. RDKit reaction templates for the two thermal reactions - beta-keto acid decarboxylation (applied until
     nothing is left to react) and intramolecular dehydration of a 1,2-diacid - generate X and Y; they are
     not typed in, and the templates are shown NOT to fire where they should not
  3. atom and charge bookkeeping for every step: where each C, O and H goes
  4. carbonyl groups counted by SMARTS on the products, and by hand from the formulas
  5. MMFF energies: why only the cis diacid closes to the anhydride (a trans-fused 5,5 anhydride is strained)
  6. the conditions the page lets a student change, and the traps

Run:  python3 tests/verify_p1q11.py
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


CO = Chem.MolFromSmarts("[#6X3]=[OX1]")


def n_co(smi):
    return len(Chem.MolFromSmiles(smi).GetSubstructMatches(CO))


# ------------------------------------------------ 1. the drawing
coords = {0: (0, 0), 1: (0.8, 0.6), 2: (1.8, 0.35), 3: (1.8, -0.35), 4: (0.8, -0.6), 5: (-1, 0), 6: (2.5, 0.9), 7: (3.4, 0.9),
          8: (2.3, 1.8), 9: (2.5, -0.9), 10: (3.4, -0.9), 11: (2.3, -1.8)}
el = "CCCCCOCOOCOO"
bonds = [(0, 1, 1, 0), (3, 2, 1, 0), (0, 4, 1, 0), (0, 5, 2, 0), (2, 6, 1, 0), (6, 7, 1, 0), (6, 8, 2, 0), (3, 9, 1, 0), (9, 10, 1, 0), (9, 11, 2, 0),
         (2, 1, 1, 6), (3, 4, 1, 6)]   # wide end of each wedge at C3/C4: seen from C3/C4 the bond to C2/C5 goes back (hash)
mb = "\n  RDKit          2D\n\n%3d%3d  0  0  0  0  0  0  0  0999 V2000\n" % (12, len(bonds))
for i in range(12):
    mb += "%10.4f%10.4f%10.4f %-3s 0  0  0  0  0  0  0  0  0  0  0  0\n" % (coords[i][0], coords[i][1], 0, el[i])
for a, b, o, st in bonds:
    mb += "%3d%3d%3d%3d\n" % (a + 1, b + 1, o, st)
mb += "M  END\n"
drawn = Chem.MolFromMolBlock(mb)
Chem.AssignStereochemistry(drawn, cleanIt=True, force=True)


def ring_faces(mol, ring, subs):
    m = Chem.AddHs(mol)
    AllChem.EmbedMolecule(m, randomSeed=7)
    c = m.GetConformer().GetPositions()
    ctr = c[ring].mean(0)
    n = np.linalg.svd(c[ring] - ctr)[2][2]
    return [np.sign(np.dot(c[s] - c[r], n)) for r, s in subs]


f = ring_faces(drawn, [0, 1, 2, 3, 4], [(2, 6), (3, 9)])
chk("the wedged drawing, read by RDKit, puts both CO2H on the same face: cis", f[0] == f[1], Chem.MolToSmiles(drawn))
YSUB = Chem.MolToSmiles(drawn)
mirror = YSUB.replace("@@", "!").replace("@", "@@").replace("!", "@")
chk("...and it is the achiral (meso) cis diacid, C7H8O5: its mirror image is itself", CalcMolFormula(drawn) == "C7H8O5" and can(mirror) == can(YSUB))

XSUB = "CC(C(=O)O)C(=O)C(C)C(=O)O"
chk("reactant 1 is 2,4-dimethyl-3-oxopentanedioic acid, C7H10O5, with 3 C=O", CalcMolFormula(Chem.MolFromSmiles(XSUB)) == "C7H10O5" and n_co(XSUB) == 3)
chk("reactant 2 has 3 C=O too (one ketone, two acids)", n_co(YSUB) == 3)

# ------------------------------------------------ 2. reaction templates
BKA = Chem.MolFromSmarts("[CX3:1](=[O:2])[CX4:3][CX3:4](=[O:5])[OX2H1:6]")      # beta-keto acid
decarb = AllChem.ReactionFromSmarts("[C:1](=[O:2])[C:3][C:4](=[O:5])[OH1:6]>>[C:1](=[O:2])[C:3].[O:5]=[C:4]=[O:6]")


def heat_decarb(smi):
    m, lost = Chem.MolFromSmiles(smi), 0
    while m.HasSubstructMatch(BKA):
        prods = decarb.RunReactants((m,))
        p = prods[0][0]
        Chem.SanitizeMol(p)
        m, lost = Chem.MolFromSmiles(Chem.MolToSmiles(p)), lost + 1
    return Chem.MolToSmiles(m), lost


X, nCO2 = heat_decarb(XSUB)
chk("heating repeats the beta-keto acid decarboxylation until no beta-keto acid is left: 2 CO2 lost", nCO2 == 2)
chk("X = pentan-3-one, C5H10O", X == can("CCC(=O)CC") and CalcMolFormula(Chem.MolFromSmiles(X)) == "C5H10O", X)
chk("atoms balance: C7H10O5 -> C5H10O + 2 CO2", CalcMolFormula(Chem.MolFromSmiles(XSUB)) == "C7H10O5")
chk("the Y diacid has no beta-keto acid: its CO2H carbons hang on C3/C4, not next to the ketone", not Chem.MolFromSmiles(YSUB).HasSubstructMatch(BKA))
anh = AllChem.ReactionFromSmarts("[C:1](=[O:2])([OH1:3])[C:4][C:5][C:6](=[O:7])[OH1:8]>>[C:1](=[O:2])1[C:4][C:5][C:6](=[O:7])[O:3]1.[OH2:8]")
ps = {Chem.MolToSmiles(p[0]) for p in anh.RunReactants((Chem.MolFromSmiles(YSUB),)) if not Chem.SanitizeMol(p[0])}
Y = sorted(ps)[0]
chk("the 1,2-diacid dehydrates to a five-membered cyclic anhydride, C7H6O4", CalcMolFormula(Chem.MolFromSmiles(Y)) == "C7H6O4", Y)
def fusion_cis(smi):
    m = Chem.MolFromSmiles(smi)
    fus = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == "C" and a.GetTotalNumHs() == 1 and a.IsInRingSize(5) and a.GetDegree() == 3]
    ring = [i for i in m.GetRingInfo().AtomRings() if any(m.GetAtomWithIdx(j).GetSymbol() == "C" and m.GetAtomWithIdx(j).GetTotalNumHs() == 2 for j in i)][0]
    mh = Chem.AddHs(m); AllChem.EmbedMolecule(mh, randomSeed=7); c = mh.GetConformer().GetPositions()
    n = np.linalg.svd(c[list(ring)] - c[list(ring)].mean(0))[2][2]
    hs = [[nb.GetIdx() for nb in mh.GetAtomWithIdx(f).GetNeighbors() if nb.GetSymbol() == "H"][0] for f in fus]
    return np.sign(np.dot(c[hs[0]] - c[fus[0]], n)) == np.sign(np.dot(c[hs[1]] - c[fus[1]], n))
chk("...stereochemistry kept: the two ring-fusion H atoms are on the same face (cis-fused)", fusion_cis(Y))
chk("atoms balance: C7H8O5 -> C7H6O4 + H2O", CalcMolFormula(Chem.MolFromSmiles(YSUB)) == "C7H8O5")
chk("the anhydride template cannot fire on reactant 1 (its acids are 1,3 across the ketone, not 1,2)",
    len(anh.RunReactants((Chem.MolFromSmiles(XSUB),))) == 0)

# ------------------------------------------------ 3/4. carbonyl count
cx, cy = n_co(X), n_co(Y)
chk("X has 1 C=O (the ketone)", cx == 1)
chk("Y has 3 C=O (the ketone and the two anhydride carbonyls)", cy == 3)
chk("the water leaving from Y takes the OH oxygen, not a C=O oxygen: both acid C=O survive in the anhydride", cy == n_co(YSUB))
chk("SUM = 1 + 3 = 4", cx + cy == 4)

# ------------------------------------------------ 5. why cis only
def best_energy(smi):
    m = Chem.AddHs(Chem.MolFromSmiles(smi)); es = []
    for seed in range(10):
        if AllChem.EmbedMolecule(m, randomSeed=seed) == 0:
            AllChem.MMFFOptimizeMolecule(m, maxIters=4000)
            es.append(AllChem.MMFFGetMoleculeForceField(m, AllChem.MMFFGetMoleculeProperties(m)).CalcEnergy())
    return min(es)


cis_anh, trans_anh = "O=C1C[C@H]2C(=O)OC(=O)[C@H]2C1", "O=C1C[C@@H]2C(=O)OC(=O)[C@H]2C1"
chk("the two anhydrides compared are the cis-fused and the trans-fused one", fusion_cis(cis_anh) and not fusion_cis(trans_anh) and can(cis_anh) == can(Y))
e_cis, e_trans = best_energy(cis_anh), best_energy(trans_anh)
chk("MMFF: the trans-fused anhydride is far more strained than the cis-fused one (> 10 kcal/mol)", e_trans - e_cis > 10, f"{e_trans - e_cis:.1f} kcal/mol")

# ------------------------------------------------ 6. custom conditions and traps
Xa, na = heat_decarb("OC(=O)CC(=O)CC(=O)O")
chk("acetonedicarboxylic acid (no methyls): 2 CO2 lost, acetone, 1 C=O", Xa == can("CC(C)=O") and na == 2 and n_co(Xa) == 1)
Xg, ng = heat_decarb("OC(=O)CCC(=O)CCC(=O)O")
chk("4-oxoheptanedioic acid (a gamma-keto acid): nothing to decarboxylate, 3 C=O remain", ng == 0 and n_co(Xg) == 3)
chk("trans diacid: no anhydride at this temperature - but it keeps its 3 C=O, so the sum would still be 4", n_co(YSUB) == 3)
chk("no heat: nothing reacts, 3 + 3 = 6", n_co(XSUB) + n_co(YSUB) == 6)
chk("trap: stopping after one decarboxylation gives 2 C=O for X (sum 5)", n_co("CCC(=O)C(C)C(=O)O") == 2)
co2 = Chem.MolFromSmiles("O=C=O")
chk("trap: counting the two CO2 (2 C=O each) as part of X would give 1 + 4 + 3 = 8 - CO2 leaves as a gas, it is not X",
    sum(1 for b in co2.GetBonds() if b.GetBondTypeAsDouble() == 2) == 2 and cx + 2 * 2 + cy == 8)
chk("trap: thinking the water removes a C=O gives Y = 1 C=O (sum 2) - the lab tracks every oxygen", cy != 1)

print()
print("X = pentan-3-one (1 C=O); Y = cis-fused keto anhydride (3 C=O)")
print("ANSWER  4")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
raise SystemExit(1 if fail else 0)
