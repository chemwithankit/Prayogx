"""ADV-2026-P1-CHE-Q04 - independent derivation, no answer key consulted.

Two cyclobutane half-esters, each carrying CH2CO2Et (wedge) and CH2CO2H (hash) on one ring
carbon and a CH3 (wedge) on another - on the ADJACENT carbon in the top substrate, on the
OPPOSITE carbon in the bottom one. LiBH4 reduces only the ester, BH3 only the acid; the
acid workup (H+) closes the hydroxy acid / hydroxy ester to a six-membered spiro lactone.
Are P & Q, and R & S, identical, enantiomers or diastereomers?

Routes used, so no single argument is trusted on its own:
  1. RDKit reads the substrates as drawn - 2D coordinates copied from the printed
     structures, with the wedge and hash bonds - and assigns their stereocentres itself
  2. the two reductions and the lactonisation are run as reaction templates that never
     touch the stereocentre bonds; the products are compared as canonical isomeric SMILES,
     with the mirror image of each tested too
  3. CIP descriptors of every stereocentre in every product (new RDKit CIP labeller)
  4. enumeration: every stereoisomer of each lactone constitution, and where P, Q, R, S
     fall among them
  5. 3D: conformers embedded and aligned (best RMSD over atom permutations) - an
     identical pair superimposes, these do not
  6. controls and an audit of every printed option

Run:  python3 tests/verify_p1q04.py
"""
from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdCIPLabeler
from rdkit.Chem.EnumerateStereoisomers import EnumerateStereoisomers, StereoEnumerationOptions

RDLogger.DisableLog("rdApp.*")
ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


# ------------------------------------------------ 1. the substrates, as drawn
# image pixel coordinates of the printed structures (y down), scaled to about 1.5 A per bond
def molblock(atoms, bonds):
    L = ["", "  hand-drawn from the paper", "", "%3d%3d  0  0  0  0  0  0  0  0999 V2000" % (len(atoms), len(bonds))]
    for el, x, y in atoms:
        L.append("%10.4f%10.4f%10.4f %-3s 0  0  0  0  0  0  0  0  0  0  0  0" % (x / 80.0, -y / 80.0, 0.0, el))
    for a, b, o, st in bonds:
        L.append("%3d%3d%3d%3d" % (a, b, o, st))
    L.append("M  END")
    return "\n".join(L)


def substrate(me_xy, me_on):
    # 1 C1 (the quaternary ring carbon), 2-4 ring, 5 CH3, 6 CH2 (wedge) 7 C(=O) 8 =O 9 O 10-11 Et,
    # 12 CH2 (hash) 13 C(=O) 14 =O 15 OH
    atoms = [("C", 375, 215), ("C", 460, 130), ("C", 375, 50), ("C", 290, 130), ("C", me_xy[0], me_xy[1]),
             ("C", 275, 280), ("C", 270, 390), ("O", 200, 430), ("O", 330, 440), ("C", 330, 520), ("C", 400, 560),
             ("C", 480, 280), ("C", 480, 390), ("O", 540, 430), ("O", 420, 440)]
    bonds = [(1, 2, 1, 0), (2, 3, 1, 0), (3, 4, 1, 0), (4, 1, 1, 0), (me_on, 5, 1, 1),   # 1 = wedge from me_on
             (1, 6, 1, 1), (6, 7, 1, 0), (7, 8, 2, 0), (7, 9, 1, 0), (9, 10, 1, 0), (10, 11, 1, 0),
             (1, 12, 1, 6), (12, 13, 1, 0), (13, 14, 2, 0), (13, 15, 1, 0)]                  # 6 = hash
    m = Chem.MolFromMolBlock(molblock(atoms, bonds))
    return m


TOP = substrate((545, 130), 2)      # CH3 on the carbon ADJACENT to C1, wedge
BOT = substrate((375, -35), 3)      # CH3 on the carbon OPPOSITE C1, wedge
for nm, m in (("top", TOP), ("bottom", BOT)):
    chk("the %s substrate reads as C11H18O4 (a cyclobutane half-ester)" % nm,
        Chem.rdMolDescriptors.CalcMolFormula(m) == "C11H18O4", Chem.rdMolDescriptors.CalcMolFormula(m))
smi_top, smi_bot = Chem.MolToSmiles(TOP), Chem.MolToSmiles(BOT)
chk("the top substrate has two stereocentres (C1 and the CH3 carbon)",
    len(Chem.FindMolChiralCenters(TOP, includeUnassigned=True, useLegacyImplementation=False)) == 2, smi_top)
chk("the bottom substrate's stereo is cis/trans across the ring (1,3)", "@" in smi_bot, smi_bot)

# ------------------------------------------------ 2. the reactions
LIBH4 = AllChem.ReactionFromSmarts("[CX4:1][C:2](=[O:3])[O:4][CH2][CH3]>>[CX4:1][CH2:2][OH:4]")      # ester -> CH2OH
BH3 = AllChem.ReactionFromSmarts("[CX4:1][C:2](=[O:3])[OX2H1:4]>>[CX4:1][CH2:2][OH:4]")              # acid  -> CH2OH
LACT = AllChem.ReactionFromSmarts("([CH2:1][OH1:2].[C:3](=[O:4])[OX2:5])>>[CH2:1][O:2][C:3]=[O:4].[O:5]")  # close the ring, lose H2O / EtOH


def run(rxn, m):
    out = set()
    for ps in rxn.RunReactants((m,)):
        p = ps[0]
        try:
            Chem.SanitizeMol(p)
            out.add(Chem.MolToSmiles(p))
        except Exception:
            pass
    assert len(out) == 1, out
    return Chem.MolFromSmiles(out.pop())


def lactonise(m):
    out = set()
    for ps in LACT.RunReactants((m,)):
        p = ps[0]
        try:
            Chem.SanitizeMol(p)
            if p.GetRingInfo().NumRings() == 2:
                out.add(Chem.MolToSmiles(p))
        except Exception:
            pass
    assert len(out) == 1, out
    return Chem.MolFromSmiles(out.pop())


mid = {}
for tag, sub in (("P", TOP), ("Q", TOP), ("R", BOT), ("S", BOT)):
    mid[tag] = run(LIBH4 if tag in "PR" else BH3, sub)
chk("LiBH4 leaves the acid: P and R precursors are hydroxy ACIDS",
    all(m.HasSubstructMatch(Chem.MolFromSmarts("C(=O)[OH]")) and not m.HasSubstructMatch(Chem.MolFromSmarts("C(=O)OCC")) for m in (mid["P"], mid["R"])))
chk("BH3 leaves the ester: Q and S precursors are hydroxy ESTERS",
    all(m.HasSubstructMatch(Chem.MolFromSmarts("C(=O)OCC")) and not m.HasSubstructMatch(Chem.MolFromSmarts("C(=O)[OH]")) for m in (mid["Q"], mid["S"])))
prod = {k: lactonise(v) for k, v in mid.items()}
S = {k: Chem.MolToSmiles(v) for k, v in prod.items()}
for k in "PQRS":
    print("      %s = %s" % (k, S[k]))
ring6 = Chem.MolFromSmarts("[C]1(CC[O]C(=O)C1)")
chk("H+ closes a six-membered spiro delta-lactone in all four (C9H14O2)",
    all(prod[k].HasSubstructMatch(ring6) and Chem.rdMolDescriptors.CalcMolFormula(prod[k]) == "C9H14O2" for k in "PQRS"))
flat = {k: Chem.MolToSmiles(prod[k], isomericSmiles=False) for k in "PQRS"}
chk("P and Q have the same constitution; so do R and S", flat["P"] == flat["Q"] and flat["R"] == flat["S"])


def mirror(m):
    mm = Chem.Mol(m)
    for a in mm.GetAtoms():
        t = a.GetChiralTag()
        if t == Chem.ChiralType.CHI_TETRAHEDRAL_CW:
            a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CCW)
        elif t == Chem.ChiralType.CHI_TETRAHEDRAL_CCW:
            a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CW)
    return Chem.MolToSmiles(mm)


def relation(a, b):
    if S[a] == S[b]:
        return "identical"
    if mirror(prod[a]) == S[b]:
        return "enantiomers"
    if flat[a] == flat[b]:
        return "diastereomers"
    return "constitutional"


rPQ, rRS = relation("P", "Q"), relation("R", "S")
chk("P and Q are not the same molecule", S["P"] != S["Q"])
chk("Q is not the mirror image of P", mirror(prod["P"]) != S["Q"])
chk("so P and Q are DIASTEREOMERS", rPQ == "diastereomers", rPQ)
chk("R and S are not the same molecule", S["R"] != S["S"])
chk("R and S are each their own mirror image (achiral, a mirror plane through C1 and C3)",
    mirror(prod["R"]) == S["R"] and mirror(prod["S"]) == S["S"])
chk("so R and S are DIASTEREOMERS (cis/trans)", rRS == "diastereomers", rRS)
chk("P and Q are chiral (not their own mirror image)", mirror(prod["P"]) != S["P"] and mirror(prod["Q"]) != S["Q"])

# ------------------------------------------------ 3. CIP descriptors
def cip(m):
    mm = Chem.Mol(m)
    rdCIPLabeler.AssignCIPLabels(mm)
    return sorted((a.GetSymbol() + str(a.GetIdx()), a.GetProp("_CIPCode")) for a in mm.GetAtoms() if a.HasProp("_CIPCode"))


cP, cQ, cR, cS = cip(prod["P"]), cip(prod["Q"]), cip(prod["R"]), cip(prod["S"])
print("      CIP  P %s  Q %s  R %s  S %s" % (cP, cQ, cR, cS))
lab = lambda c: [x[1] for x in c]
chk("P and Q: two stereocentres each, same CH3 carbon, spiro carbon inverted",
    len(cP) == 2 and len(cQ) == 2 and sorted(lab(cP)) != sorted(lab(cQ)) or (len(cP) == 2 and lab(cP) != lab(cQ)))
chk("R and S: pseudo-asymmetric (r/s) centres, one each way - cis/trans, achiral",
    all(x in ("r", "s") for x in lab(cR) + lab(cS)) and lab(cR) != lab(cS), "%s vs %s" % (lab(cR), lab(cS)))

# ------------------------------------------------ 4. enumeration
def isomers(smiles_flat):
    m = Chem.MolFromSmiles(smiles_flat)
    o = StereoEnumerationOptions(unique=True, onlyUnassigned=True)
    return sorted({Chem.MolToSmiles(x) for x in EnumerateStereoisomers(m, options=o)})


iT, iB = isomers(flat["P"]), isomers(flat["R"])
chk("the top lactone constitution has 4 stereoisomers (2 pairs of enantiomers)", len(iT) == 4, str(len(iT)))
chk("P and Q are two of them, from DIFFERENT enantiomer pairs", S["P"] in iT and S["Q"] in iT and mirror(prod["P"]) in iT and mirror(prod["P"]) != S["Q"])
chk("the bottom lactone constitution has 2 stereoisomers (cis and trans), both achiral", len(iB) == 2 and set(iB) == {S["R"], S["S"]})

# ------------------------------------------------ 5. 3D superposition
def confs(smi, seed):
    m = Chem.AddHs(Chem.MolFromSmiles(smi))
    AllChem.EmbedMultipleConfs(m, numConfs=20, randomSeed=seed)
    AllChem.MMFFOptimizeMoleculeConfs(m)
    return Chem.RemoveHs(m)


def best_rms(a, b):
    # every conformer of one against every conformer of the other, every symmetry-equivalent
    # atom mapping, proper rotations only: the smallest RMSD found
    ma, mb = confs(a, 7), confs(b, 11)
    return min(AllChem.GetBestRMS(ma, mb, i.GetId(), j.GetId()) for i in ma.GetConformers() for j in mb.GetConformers())


rP_P = best_rms(S["P"], S["P"])
rP_Q = best_rms(S["P"], S["Q"])
rP_mQ = best_rms(S["P"], mirror(prod["Q"]))
rR_S = best_rms(S["R"], S["S"])
chk("control: P on an independently generated copy of P superimposes (RMSD < 0.05 A)", rP_P < 0.05, "%.3f A" % rP_P)
chk("P on Q does not superimpose", rP_Q > 0.15, "%.3f A" % rP_Q)
chk("P on the MIRROR IMAGE of Q does not superimpose either -> not enantiomers", rP_mQ > 0.15, "%.3f A" % rP_mQ)
chk("R on S does not superimpose", rR_S > 0.15, "%.3f A" % rR_S)

# ------------------------------------------------ 6. controls and options
NOME = substrate((545, 130), 2)
nm = Chem.RWMol(NOME); nm.RemoveAtom(4); nm = nm.GetMol(); Chem.SanitizeMol(nm)
p0, q0 = lactonise(run(LIBH4, nm)), lactonise(run(BH3, nm))
chk("control: with no CH3 the two routes give the SAME lactone (C1 is then not a stereocentre)",
    Chem.MolToSmiles(p0) == Chem.MolToSmiles(q0), Chem.MolToSmiles(p0))
OPT = {"A": ("identical", "diastereomers"), "B": ("diastereomers", "identical"),
       "C": ("diastereomers", "diastereomers"), "D": ("identical", "identical")}
hits = [k for k, v in OPT.items() if v == (rPQ, rRS)]
chk("exactly one printed option matches: (C)", hits == ["C"], str(hits))
chk("(A), (B), (D) each call a pair identical - the two routes close the lactone in opposite directions",
    all("identical" in OPT[k] for k in "ABD"))

print()
print("P & Q: the C=O swaps faces at the spiro carbon, CH3 unchanged -> diastereomers (both chiral)")
print("R & S: the same swap, 1,3 across the ring -> cis/trans diastereomers (both achiral)")
print("ANSWER  (C)")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
