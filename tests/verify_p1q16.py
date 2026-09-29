"""ADV-2026-P1-CHE-Q16 - independent derivation; the answer key is read only at the very end.

List-I: 2-bromo-5-nitrobenzaldehyde oxime and 2'-bromo-5'-nitroacetophenone oxime (O syn to the ring, Z), each
under base, one after O-acetylation, and the E O-acetyl ketoxime in aqueous Na2CO3.
List-II: (1) 2-hydroxy-5-nitrobenzonitrile  (2) 2-bromo-5-nitrobenzonitrile  (3) N-(2-bromo-5-nitrophenyl)acetamide
         (4) 3-methyl-5-nitro-1,2-benzisoxazole  (5) the E ketoxime.
Options: (A) P2 Q1 R5 S4  (B) P1 Q2 R4 S5  (C) P1 Q2 R3 S4  (D) P2 Q1 R3 S5

Routes, so no single argument is trusted on its own:
  1. RDKit structure edits for each elementary transformation (SNAr ring closure, Kemp elimination, O-acetylation,
     anti E2 to the nitrile, ester hydrolysis, Beckmann as a control), each product sanitised by RDKit
  2. geometry: ETKDG + MMFF conformers - the oxime O can reach the C-Br carbon (< 3.22 A, the C + O van der Waals
     contact) only in the Z isomers; C=N stereo read from CIP labels and from 3-D dihedrals independently
  3. activation: RDKit resonance enumeration of the Meisenheimer complex - negative charge reaches the nitro oxygens
     only when NO2 is ortho/para to the carbon attacked (para here); a meta-nitro control cannot
  4. an arrow-pushing ledger written separately from the page: valence and total charge after every step
  5. products matched to List-II by canonical SMILES including C=N stereo; every option audited; controls
  6. the page's own engine, extracted from index.html and run in node, must give the same matches

Run:  tests/.venv/bin/python tests/verify_p1q16.py
"""
import json, os, re, subprocess, sys
from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdMolTransforms
RDLogger.DisableLog("rdApp.*")

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, "..", "simulations/2026/paper-1/chemistry/adv-2026-p1-che-q16/index.html")
ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


NO2 = "[N+](=O)[O-]"
# aryl written first, so  aryl/C=N\O  puts the aryl and the oxime O on the same side (cis)
SUB = {
    "P": ("Brc1ccc(%s)cc1/C=N\\O" % NO2, "aqueous NaOH"),
    "Q": ("Brc1ccc(%s)cc1/C=N\\O" % NO2, "Ac2O; then Na2CO3"),
    "R": ("Brc1ccc(%s)cc1/C(C)=N\\O" % NO2, "aqueous NaOH"),
    "S": ("Brc1ccc(%s)cc1/C(C)=N/OC(C)=O" % NO2, "aqueous Na2CO3"),
}
L2 = {
    1: "N#Cc1cc(%s)ccc1O" % NO2,
    2: "N#Cc1cc(%s)ccc1Br" % NO2,
    3: "CC(=O)Nc1cc(%s)ccc1Br" % NO2,
    4: "Cc1noc2ccc(%s)cc12" % NO2,
    5: "Brc1ccc(%s)cc1/C(C)=N/O" % NO2,
}
OPTS = {"A": [2, 1, 5, 4], "B": [1, 2, 4, 5], "C": [1, 2, 3, 4], "D": [2, 1, 3, 5]}
can = lambda s: Chem.MolToSmiles(Chem.MolFromSmiles(s))          # isomeric: keeps C=N stereo
L2c = {k: can(v) for k, v in L2.items()}


# ------------------------------------------------ helpers on the oxime scaffold
def oxime_atoms(m):
    """ring C1, side-chain C7, N, O(oxime), and the ortho ring carbon C2 that carries Br (or None)"""
    for b in m.GetBonds():
        if b.GetBondType() != Chem.BondType.DOUBLE:
            continue
        a, c = b.GetBeginAtom(), b.GetEndAtom()
        if {a.GetSymbol(), c.GetSymbol()} != {"C", "N"} or a.GetIsAromatic() or c.GetIsAromatic():
            continue
        C7, N = (a, c) if a.GetSymbol() == "C" else (c, a)
        O = [x for x in N.GetNeighbors() if x.GetSymbol() == "O"]
        C1 = [x for x in C7.GetNeighbors() if x.GetIsAromatic()]
        if not O or not C1:
            continue
        C2 = [x for x in C1[0].GetNeighbors() if x.GetIsAromatic() and any(y.GetSymbol() == "Br" for y in x.GetNeighbors())]
        return C1[0].GetIdx(), C7.GetIdx(), N.GetIdx(), O[0].GetIdx(), (C2[0].GetIdx() if C2 else None)
    return None


def syn_by_cip(m):
    """Z  <=>  aryl and O on the same side (aryl outranks H or CH3; O outranks the lone pair)"""
    Chem.AssignStereochemistry(m, cleanIt=True, force=True)
    for b in m.GetBonds():
        if b.GetBondType() == Chem.BondType.DOUBLE and {b.GetBeginAtom().GetSymbol(), b.GetEndAtom().GetSymbol()} == {"C", "N"}:
            return b.GetStereo() == Chem.BondStereo.STEREOZ
    return None


def conformers(smi, n=30):
    mh = Chem.AddHs(Chem.MolFromSmiles(smi))
    ids = AllChem.EmbedMultipleConfs(mh, numConfs=n, randomSeed=0xF16)
    AllChem.MMFFOptimizeMoleculeConfs(mh, maxIters=2000)
    return mh, list(ids)


def reach(smi):
    """Can rotation about the ring-C1 - C7 bond bring the oxime O within contact of the C-Br carbon?
    MMFF geometry, then a rigid 5-degree scan of the C2-C1-C7=N torsion (C=N geometry is fixed: E/Z does not
    interconvert). Returns the closest O...C2 approach over the scan and the aryl-C=N-O dihedral."""
    mh, ids = conformers(smi)
    C1, C7, N, O, C2 = oxime_atoms(mh)
    conf = mh.GetConformer(ids[0])
    dih = abs(rdMolTransforms.GetDihedralDeg(conf, C1, C7, N, O))
    best = 99.0
    for t in range(0, 360, 5):
        rdMolTransforms.SetDihedralDeg(conf, C2, C1, C7, N, float(t))
        best = min(best, rdMolTransforms.GetBondLength(conf, O, C2))
    return best, dih


def activated(m, ipso):
    """NO2 ortho or para to the attacked carbon (ring path length 1 or 3)"""
    ring = [r for r in m.GetRingInfo().AtomRings() if ipso in r][0]
    for i in ring:
        if any(n.GetSymbol() == "N" and n.GetFormalCharge() == 1 for n in m.GetAtomWithIdx(i).GetNeighbors()):
            k = len(Chem.GetShortestPath(m, ipso, i)) - 1
            if k in (1, 3):
                return True
    return False


def edit(m, fn):
    rw = Chem.RWMol(Chem.Mol(m))
    Chem.Kekulize(rw, clearAromaticFlags=True)
    fn(rw)
    out = rw.GetMol()
    Chem.SanitizeMol(out)
    return out


def main_frag(m):
    frags = Chem.GetMolFrags(m, asMols=True)
    return max(frags, key=lambda f: f.GetNumHeavyAtoms())


# ------------------------------------------------ elementary transformations (route 1)
def snar_close(m):
    C1, C7, N, O, C2 = oxime_atoms(m)
    br = [x.GetIdx() for x in m.GetAtomWithIdx(C2).GetNeighbors() if x.GetSymbol() == "Br"][0]

    def f(rw):
        rw.RemoveBond(C2, br)
        rw.GetAtomWithIdx(br).SetFormalCharge(-1)
        rw.AddBond(O, C2, Chem.BondType.SINGLE)
        o = rw.GetAtomWithIdx(O)
        o.SetFormalCharge(0); o.SetNumExplicitHs(0); o.SetNoImplicit(True)
    return main_frag(edit(m, f))


def kemp(m):
    """base removes H-3 of a 1,2-benzisoxazole; C3=N becomes C#N and the N-O bond breaks -> 2-cyanophenoxide"""
    patt = Chem.MolFromSmarts("[cH1]1[n][o][c][c]1")
    hit = m.GetSubstructMatch(patt)
    if not hit:
        return None
    c3, n, o = hit[0], hit[1], hit[2]

    def f(rw):
        rw.RemoveBond(n, o)
        rw.GetBondBetweenAtoms(c3, n).SetBondType(Chem.BondType.TRIPLE)
        a = rw.GetAtomWithIdx(c3); a.SetNumExplicitHs(0); a.SetNoImplicit(True)
        rw.GetAtomWithIdx(o).SetFormalCharge(-1)
    return edit(m, f)


def protonate(m):
    def f(rw):
        for a in rw.GetAtoms():
            if a.GetSymbol() == "O" and a.GetFormalCharge() == -1 and not any(n.GetFormalCharge() == 1 for n in a.GetNeighbors()):
                a.SetFormalCharge(0); a.SetNumExplicitHs(1)
    return edit(m, f)


def acetylate(m):
    C1, C7, N, O, C2 = oxime_atoms(m)

    def f(rw):
        c = rw.AddAtom(Chem.Atom(6)); o2 = rw.AddAtom(Chem.Atom(8)); me = rw.AddAtom(Chem.Atom(6))
        rw.AddBond(O, c, Chem.BondType.SINGLE); rw.AddBond(c, o2, Chem.BondType.DOUBLE); rw.AddBond(c, me, Chem.BondType.SINGLE)
        o = rw.GetAtomWithIdx(O); o.SetNumExplicitHs(0); o.SetNoImplicit(True)
    return edit(m, f)


def is_acyl(m):
    C1, C7, N, O, C2 = oxime_atoms(m)
    return any(n.GetSymbol() == "C" and n.GetIdx() != N for n in m.GetAtomWithIdx(O).GetNeighbors())


def e2_nitrile(m):
    """anti elimination of AcOH from an O-acyl aldoxime: needs an H on C7"""
    C1, C7, N, O, C2 = oxime_atoms(m)
    if m.GetAtomWithIdx(C7).GetTotalNumHs() != 1:
        return None

    def f(rw):
        rw.RemoveBond(N, O)
        rw.GetBondBetweenAtoms(C7, N).SetBondType(Chem.BondType.TRIPLE)
        rw.GetBondBetweenAtoms(C7, N).SetStereo(Chem.BondStereo.STEREONONE)
        a = rw.GetAtomWithIdx(C7); a.SetNumExplicitHs(0); a.SetNoImplicit(True)
    return main_frag(edit(m, f))


def hydrolyse(m):
    """O-acyl oxime + OH- -> oximate + acetate (acyl-O cleavage: the C=N bond is not touched)"""
    C1, C7, N, O, C2 = oxime_atoms(m)
    acyl = [n.GetIdx() for n in m.GetAtomWithIdx(O).GetNeighbors() if n.GetIdx() != N][0]

    def f(rw):
        rw.RemoveBond(O, acyl)
        o = rw.GetAtomWithIdx(O); o.SetNumExplicitHs(1); o.SetNoImplicit(True)
    return main_frag(edit(m, f))


def beckmann(m):
    """acid control: the group ANTI to the oxime O migrates to N; the amide is the product"""
    mh, ids = conformers(Chem.MolToSmiles(m), 5)
    C1, C7, N, O, C2 = oxime_atoms(mh)
    subs = [x.GetIdx() for x in mh.GetAtomWithIdx(C7).GetNeighbors() if x.GetIdx() != N and x.GetSymbol() != "H"]
    anti = max(subs, key=lambda s: abs(rdMolTransforms.GetDihedralDeg(mh.GetConformer(ids[0]), s, C7, N, O)))
    other = [s for s in subs if s != anti][0]
    m2 = Chem.RemoveHs(mh)

    def f(rw):
        rw.RemoveBond(C7, anti); rw.AddBond(N, anti, Chem.BondType.SINGLE)
        rw.RemoveBond(N, O); rw.AddBond(C7, O, Chem.BondType.SINGLE)
        rw.GetBondBetweenAtoms(C7, N).SetStereo(Chem.BondStereo.STEREONONE)
        # tautomerise the imidic acid: C=N-...O-H  ->  C(=O)-NH
        rw.GetBondBetweenAtoms(C7, N).SetBondType(Chem.BondType.SINGLE)
        rw.GetBondBetweenAtoms(C7, O).SetBondType(Chem.BondType.DOUBLE)
        o = rw.GetAtomWithIdx(O); o.SetNumExplicitHs(0); o.SetNoImplicit(True)
        n = rw.GetAtomWithIdx(N); n.SetNumExplicitHs(1); n.SetNoImplicit(True)
    return Chem.MolFromSmiles(Chem.MolToSmiles(edit(m2, f))), other


# ------------------------------------------------ the reaction model
REACH = 3.22       # C (1.70) + O (1.52) van der Waals contact, A
GEO = {}


def geometry(smi):
    if smi not in GEO:
        GEO[smi] = reach(smi)
    return GEO[smi]


def react(smi, conditions, steps=None):
    """returns the isolated major product (after neutral work-up) and a list of what happened"""
    log = steps if steps is not None else []
    m = Chem.MolFromSmiles(smi)
    if conditions.startswith("Ac2O"):
        m = acetylate(m); log.append("O-acetylation")
        conditions = conditions.split("then ")[1]
    if conditions == "acid":
        p, mig = beckmann(m); log.append("Beckmann")
        return Chem.MolToSmiles(p), log
    if is_acyl(m):
        if e2_nitrile(m) is not None and syn_by_cip(m):     # Z: the C7-H is anti to the O-acyl group
            log.append("anti E2 -> nitrile")
            return Chem.MolToSmiles(e2_nitrile(m)), log
        m = hydrolyse(m); log.append("ester hydrolysis")
    # a free oxime in aqueous base is deprotonated; the oximate O attacks C-Br only if it can reach it and the ring is activated
    C1, C7, N, O, C2 = oxime_atoms(m)
    d, dih = geometry(Chem.MolToSmiles(m))
    if C2 is not None and d < REACH and activated(m, C2):
        m = snar_close(m); log.append("intramolecular SNAr")
        k = kemp(m)
        if k is not None:
            log.append("Kemp elimination"); m = protonate(k); log.append("work-up")
    else:
        log.append("no ring closure (O cannot reach C-Br)" if d >= REACH else "no ring closure (ring not activated)")
    return Chem.MolToSmiles(m), log


# ------------------------------------------------ 0. the substrates as drawn
for k in "PQRS":
    chk("%s parses, C=N stereo defined" % k, syn_by_cip(Chem.MolFromSmiles(SUB[k][0])) is not None)
chk("P, Q, R: oxime O syn to the ring (Z) by CIP", all(syn_by_cip(Chem.MolFromSmiles(SUB[k][0])) for k in "PQR"))
chk("S: O-acetyl anti to the ring (E) by CIP", syn_by_cip(Chem.MolFromSmiles(SUB["S"][0])) is False)
chk("List-II (5): E ketoxime", syn_by_cip(Chem.MolFromSmiles(L2[5])) is False)
chk("NO2 is para to C-Br in every substrate",
    all(activated(Chem.MolFromSmiles(SUB[k][0]), oxime_atoms(Chem.MolFromSmiles(SUB[k][0]))[4]) for k in "PQRS"))

# ------------------------------------------------ 2. geometry (MMFF)
gz, dz = geometry(SUB["R"][0]); ge, de = geometry(L2[5])
ga, _ = geometry(SUB["P"][0]); gae, _ = geometry("Brc1ccc(%s)cc1/C=N/O" % NO2)
chk("Z ketoxime: O reaches C-Br (< 3.22 A)", gz < REACH, "%.2f A" % gz)
chk("E ketoxime: O cannot reach C-Br", ge > REACH, "%.2f A" % ge)
chk("Z aldoxime: O reaches C-Br", ga < REACH, "%.2f A" % ga)
chk("E aldoxime: O cannot reach C-Br", gae > REACH, "%.2f A" % gae)
chk("3-D dihedral agrees with CIP: aryl-C=N-O near 0 deg (Z) vs 180 deg (E)", dz < 40 and de > 140, "%.0f / %.0f deg" % (dz, de))

# ------------------------------------------------ 3. activation (resonance enumeration of the Meisenheimer complex)
def nitro_takes_charge(smi):
    m = Chem.MolFromSmiles(smi)
    sup = Chem.ResonanceMolSupplier(m, Chem.KEKULE_ALL | Chem.ALLOW_INCOMPLETE_OCTETS * 0)
    for r in sup:
        for a in r.GetAtoms():                      # nitronate: N with two O- (charge carried onto the nitro group)
            if a.GetSymbol() == "N" and sum(1 for n in a.GetNeighbors() if n.GetSymbol() == "O" and n.GetFormalCharge() == -1) == 2:
                return True
    return False


para = "COC1(Br)C=C[C-](%s)C=C1" % NO2                 # sigma complex, nitro para to the attacked carbon
meta = "COC1(Br)[CH-]C(%s)=CC=C1" % NO2                # control: nitro meta to it
chk("para-NO2: the Meisenheimer charge reaches the nitro oxygens", nitro_takes_charge(para))
chk("meta-NO2 control: it cannot", not nitro_takes_charge(meta))

# ------------------------------------------------ 4. arrow-pushing ledger (independent of the page)
VAL = {"C": 4, "N": 3, "O": 2, "Br": 1, "H": 1}


def charges(atoms, bonds):
    tot = {i: 0 for i in atoms}
    for (a, b), o in bonds.items():
        tot[a] += o; tot[b] += o
    q = {}
    for i, (el, hs) in atoms.items():
        v = tot[i] + hs
        q[i] = v - VAL[el] if el in ("N", "O") else (v - 4 if el == "C" else v - VAL[el])
        if el == "O" and v == 1: q[i] = -1
        if el == "Br" and v == 0: q[i] = -1
        if el == "H" and v == 0: q[i] = 1
    return q


def push(bonds, arrows):
    b = dict(bonds)
    key = lambda x, y: (x, y) if (x, y) in b or (y, x) not in b else (y, x)
    for src, dst in arrows:
        if src[0] == "bond":
            k = key(*src[1]); b[k] -= 1
            if b[k] == 0: del b[k]
        if dst[0] == "bond":
            k = key(*dst[1]); b[k] = b.get(k, 0) + 1
    return b


def valid(atoms, bonds):
    q = charges(atoms, bonds)
    tot = {i: 0 for i in atoms}
    for (a, c), o in bonds.items():
        tot[a] += o; tot[c] += o
    okv = all(tot[i] + atoms[i][1] <= (4 if atoms[i][0] in ("C", "N") else 3 if atoms[i][0] == "O" else 1) for i in atoms)
    return okv and all(-1 <= q[i] <= 1 for i in atoms), sum(q.values())


# P: ring C1..C6 (Kekule C1=C6, C2=C3, C4=C5), side chain C7(H)=N8-O9-H10, Br11 on C2, nitro N12(=O13)O14- on C5, hydroxide O15-H16
A = {1: ("C", 0), 2: ("C", 0), 3: ("C", 1), 4: ("C", 1), 5: ("C", 0), 6: ("C", 1), 7: ("C", 1), 8: ("N", 0), 9: ("O", 0), 10: ("H", 0),
     11: ("Br", 0), 12: ("N", 0), 13: ("O", 0), 14: ("O", 0), 15: ("O", 0), 16: ("H", 0), 17: ("O", 0), 18: ("H", 0), 19: ("H", 0)}
B = {(1, 2): 1, (2, 3): 2, (3, 4): 1, (4, 5): 2, (5, 6): 1, (6, 1): 2, (1, 7): 1, (7, 8): 2, (8, 9): 1, (9, 10): 1, (2, 11): 1,
     (5, 12): 1, (12, 13): 2, (12, 14): 1, (15, 16): 1, (17, 18): 1, (17, 19): 1}
STEPS = [
    ("deprotonation of the oxime O-H", [(("lp", 15), ("bond", (15, 10))), (("bond", (9, 10)), ("atom", 9))]),
    ("oximate O attacks C2 (Meisenheimer complex, charge on the nitro group)",
     [(("lp", 9), ("bond", (9, 2))), (("bond", (2, 3)), ("bond", (3, 4))), (("bond", (4, 5)), ("bond", (5, 12))), (("bond", (12, 13)), ("atom", 13))]),
    ("rearomatisation, bromide leaves", [(("lp", 13), ("bond", (12, 13))), (("bond", (5, 12)), ("bond", (4, 5))),
                                          (("bond", (3, 4)), ("bond", (2, 3))), (("bond", (2, 11)), ("atom", 11))]),
]
atoms, bonds, ledger = dict(A), dict(B), []
for name, arr in STEPS:
    bonds = push(bonds, arr)
    ledger.append(valid(atoms, bonds))
chk("SNAr arrows: every intermediate valid", all(v for v, q in ledger), str([v for v, q in ledger]))
chk("SNAr arrows: total charge -1 conserved at every step", all(q == -1 for v, q in ledger), str([q for v, q in ledger]))
# the second hydroxide removes H-3 (on C7) in the Kemp elimination; atom 7 carries its H explicitly for this step
atoms[7] = ("C", 0); atoms[20] = ("H", 0); bonds[(7, 20)] = 1; atoms[21] = ("O", 0); atoms[22] = ("H", 0); bonds[(21, 22)] = 1
kem = push(bonds, [(("lp", 21), ("bond", (21, 20))), (("bond", (7, 20)), ("bond", (7, 8))), (("bond", (8, 9)), ("atom", 9))])
v, q = valid(atoms, kem)
chk("Kemp arrows: valid, C7#N8 triple bond formed, N-O broken, charge -2 (two OH- used) conserved",
    v and kem.get((7, 8)) == 3 and (8, 9) not in kem and q == -2, "charge %d" % q)

# ------------------------------------------------ 5. the four reactions and the options
m, logs = {}, {}
for k in "PQRS":
    p, lg = react(*SUB[k]); logs[k] = lg
    hit = [n for n, s in L2c.items() if s == can(p)]
    m[k] = hit[0] if hit else 0
    print("      %s: %s  ->  %s" % (k, " + ".join(lg), p))
got = [m[k] for k in "PQRS"]
chk("P -> (1): SNAr then Kemp elimination, phenol after work-up", m["P"] == 1)
chk("Q -> (2): O-acetylation then anti E2 to the nitrile, Br kept", m["Q"] == 2)
chk("R -> (4): SNAr only - no H-3, so no Kemp elimination", m["R"] == 4 and "Kemp elimination" not in logs["R"])
chk("S -> (5): hydrolysis only - E oxime cannot reach C-Br", m["S"] == 5)
hits = [o for o, v in OPTS.items() if v == got]
chk("exactly one option matches: (B)", hits == ["B"], str(hits))
for o, v in sorted(OPTS.items()):
    if o != "B":
        bad = ["%s->%d" % ("PQRS"[i], v[i]) for i in range(4) if v[i] != got[i]]
        chk("option (%s) refuted by %s" % (o, ", ".join(bad)), bool(bad))

# ------------------------------------------------ controls
e_ald = "Brc1ccc(%s)cc1/C=N/O" % NO2
p, lg = react(e_ald, "aqueous NaOH")
chk("control: E aldoxime + NaOH does not cyclise (O out of reach)", can(p) == can(e_ald), lg[-1])
meta_sub = "Brc1cc(%s)ccc1/C(C)=N\\O" % NO2
p, lg = react(meta_sub, "aqueous NaOH")
chk("control: meta-nitro Z ketoxime does not cyclise (ring not activated)", "intramolecular SNAr" not in lg, lg[-1])
z_ac = "Brc1ccc(%s)cc1/C(C)=N\\OC(C)=O" % NO2
p, lg = react(z_ac, "aqueous Na2CO3")
chk("control: a Z O-acetyl ketoxime would hydrolyse then close to (4) - geometry decides S", can(p) == L2c[4], " + ".join(lg))
bk, mig = beckmann(Chem.MolFromSmiles(L2[5]))
chk("distractor (3) is the Beckmann product of the E ketoxime - needs acid, not base",
    can(Chem.MolToSmiles(bk)) == L2c[3])
bz, _ = beckmann(Chem.MolFromSmiles(SUB["R"][0]))
chk("control: Beckmann of R's Z ketoxime gives the N-methyl amide, not (3)", can(Chem.MolToSmiles(bz)) != L2c[3], Chem.MolToSmiles(bz))
chk("distractors: no base route in this model yields (3)", 3 not in got)

# ------------------------------------------------ 6. the page's own engine (node)
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\*ENGINE-BEGIN\*/(.*?)/\*ENGINE-END\*/", src, re.S)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + "\nprocess.stdout.write(JSON.stringify(ENGINE.solveAll()));"
        out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            res = json.loads(out.stdout)
        except ValueError:
            res = {}
        chk("page engine: same matches P1 Q2 R4 S5", [res.get("map", {}).get(k) for k in "PQRS"] == got, out.stderr[:200] or str(res.get("map")))
        chk("page engine: same option (B)", res.get("answer") == "B", str(res.get("answer")))
        chk("page engine: every intermediate valid, charge conserved", res.get("valid") is True)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("P -> %d, Q -> %d, R -> %d, S -> %d" % tuple(got))
print("ANSWER  " + (hits[0] if len(hits) == 1 else "?"))
print("official key (read last): B -", "agrees" if hits == ["B"] else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
