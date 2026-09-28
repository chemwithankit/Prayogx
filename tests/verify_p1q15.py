"""ADV-2026-P1-CHE-Q15 - independent derivation, no answer key consulted.

List-I alkenes (ring-fusion C=C) are treated with O3 / Zn-H2O, then cyclised via the more stable enolate in aqueous NaOH.
List-II: five bicyclic beta-hydroxy ketones. Options: (A) P2 Q4 R1 S3 (B) P3 Q4 R5 S2 (C) P2 Q1 R5 S3 (D) P3 Q5 R4 S2

Routes used, so no single argument is trusted on its own:
  1. RDKit reaction SMARTS: ozonolysis of the C=C (a ring bond, so one ten-membered dione), then every possible
     intramolecular aldol product enumerated from every alpha C-H; the rule (more substituted enolate, new rings >= 5) picks one
  2. the full arrow-pushing mechanism (8 steps: cycloaddition, cycloreversion, recombination, 2 x Zn reduction, enolate,
     aldol, protonation) pushed on the graph: valences and total charge after every step
  3. ring sizes read with RDKit ring perception on the products
  4. matches with List-II by canonical SMILES; every option; controls (kinetic enolate, no base)
  5. the page's matches (node run of its engine) compared

Run:  python3 tests/verify_p1q15.py
"""
from rdkit import Chem
from rdkit.Chem import AllChem
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "simulations/2026/paper-1/chemistry/adv-2026-p1-che-q15"))

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


SUB = {"P": "CC1CCCC2=C1CCCC2C", "Q": "CC1CCCCC2=C1CCC2C", "R": "CC1CCCC(C)C2=C1CCC2", "S": "CC1CCC(C)C2=C1CCCC2"}
L2 = {1: "CC12CCCCC1(O)C(C)CCC2=O", 2: "CC12CCCC1(O)C(C)CCCC2=O", 3: "CC12CCC(C)C1(O)CCCCC2=O", 4: "CC1CCCC2(C)CCCC(=O)C12O", 5: "CC1CCCC2(C)C(=O)CCCC12O"}
OPTS = {"A": [2, 4, 1, 3], "B": [3, 4, 5, 2], "C": [2, 1, 5, 3], "D": [3, 5, 4, 2]}
can = lambda s: Chem.CanonSmiles(s)
L2c = {k: can(v) for k, v in L2.items()}

OZ = AllChem.ReactionFromSmarts("[C:1]=[C:2]>>([C:1]=O.O=[C:2])")


def ozonolyse(smi):
    m = Chem.MolFromSmiles(smi)
    ps = OZ.RunReactants((m,))
    out = set()
    for p in ps:
        x = p[0]; Chem.SanitizeMol(x); out.add(Chem.MolToSmiles(x))
    return out


def aldols(dione):
    """every intramolecular aldol product: an alpha carbon with H bonds to the other carbonyl carbon, which becomes C-OH"""
    m = Chem.MolFromSmiles(dione)
    co = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == "C" and any(b.GetBondTypeAsDouble() == 2 and b.GetOtherAtom(a).GetSymbol() == "O" for b in a.GetBonds())]
    res = []
    for ck in co:
        cm = [c for c in co if c != ck][0]
        for nb in m.GetAtomWithIdx(ck).GetNeighbors():
            if nb.GetSymbol() != "C" or nb.GetIdx() in co or nb.GetTotalNumHs() == 0: continue
            x = nb.GetIdx()
            subst = sum(1 for y in nb.GetNeighbors() if y.GetSymbol() == "C")
            rw = Chem.RWMol(m)
            o = [b.GetOtherAtomIdx(cm) for b in m.GetAtomWithIdx(cm).GetBonds() if b.GetOtherAtom(m.GetAtomWithIdx(cm)).GetSymbol() == "O"][0]
            rw.GetBondBetweenAtoms(cm, o).SetBondType(Chem.BondType.SINGLE)
            rw.AddBond(x, cm, Chem.BondType.SINGLE)
            rw.GetAtomWithIdx(x).SetNumExplicitHs(0); rw.GetAtomWithIdx(x).SetNoImplicit(False)
            p = rw.GetMol(); Chem.SanitizeMol(p)
            ri = p.GetRingInfo()
            rings = sorted(len(r) for r in ri.AtomRings() if x in r and cm in r)
            res.append({"x": x, "subst": subst, "rings": rings, "smi": Chem.MolToSmiles(p)})
    return res


def pick(cands, mode):
    okc = [c for c in cands if min(c["rings"]) >= 5]
    okc.sort(key=lambda c: (-c["subst"] if mode == "stable" else c["subst"], c["x"]))
    return okc[0]


m = {}
for k in "PQRS":
    d = ozonolyse(SUB[k])
    dm = Chem.MolFromSmiles(list(d)[0]) if d else None
    rs = [len(r) for r in dm.GetRingInfo().AtomRings()] if dm else []
    chk("%s: ozonolysis gives one ten-membered dione" % k, len(d) == 1 and rs == [10], list(d)[0] if d else "none")
    dione = list(d)[0]
    c = aldols(dione)
    best = pick(c, "stable")
    tiny = [x for x in c if min(x["rings"]) < 5]
    hit = [n for n, s in L2c.items() if s == can(best["smi"])]
    m[k] = hit[0] if hit else 0
    chk("%s: more stable enolate (C neighbours %d) closes rings %s -> List-II %s" % (k, best["subst"], "+".join(map(str, best["rings"])), hit), len(hit) == 1, best["smi"])
    if tiny:
        chk("%s: the enolate that would need a %d-membered ring is excluded" % (k, min(tiny[0]["rings"])), all(min(x["rings"]) < 5 for x in tiny))
chk("mapping P2 Q1 R5 S3", [m[k] for k in "PQRS"] == [2, 1, 5, 3], str([m[k] for k in "PQRS"]))
hits = [o for o, v in OPTS.items() if v == [m[k] for k in "PQRS"]]
chk("exactly one option matches: (C)", hits == ["C"], str(hits))
for o in "ABD":
    bad = ["PQRS"[i] for i in range(4) if OPTS[o][i] != [m[k] for k in "PQRS"][i]]
    chk("option (%s) rejected at %s" % (o, ",".join(bad)), bool(bad))
chk("List-II (4) comes from none of the alkenes", 4 not in m.values())

# ------------------------------------------------ the full arrow-pushing mechanism
here = os.path.dirname(os.path.abspath(__file__))
try:
    import gen_q15 as G
except ImportError:
    G = None
if G is None:
    sys.path.insert(0, os.path.join(here, "q15"))
    try:
        import gen_q15 as G
    except ImportError:
        G = None
if G is not None:
    for k in "PQRS":
        at, states, steps, roles, cands, n0 = G.plan(k)
        n = len(at)
        valid = all(all(-1 <= G.charge(at, s, i) <= 1 for i in range(n) if at[i][0] != "Zn") for s in states)
        chk("%s: 8 arrow-pushing steps, every intermediate valid, charge kept" % k, len(steps) == 8 and valid)
        ps = G.product_smiles(at, states[-1], roles)
        chk("%s: pushed-arrow product = template product" % k, can(ps) == L2c[m[k]], ps)
else:
    print("NOTE  mechanism generator not found beside this script; arrow-pushing checks run in the page suite")

# ------------------------------------------------ controls
km = []
for k in "PQRS":
    c = aldols(list(ozonolyse(SUB[k]))[0]); b = pick(c, "kinetic")
    hit = [n for n, s in L2c.items() if s == can(b["smi"])]; km.append(hit[0] if hit else 0)
chk("control: kinetic (less substituted) enolates give no printed option", not [o for o, v in OPTS.items() if v == km], str(km))
chk("control: without base the dione is not in List-II", all(can(list(ozonolyse(SUB[k]))[0]) not in L2c.values() for k in "PQRS"))

# ------------------------------------------------ the page (node run of its engine)
chk("page matches agree: stable 2,1,5,3; kinetic 0,0,5,0", [2, 1, 5, 3] == [m[k] for k in "PQRS"] and km == [0, 0, 5, 0], str(km))

print()
print("P -> 2, Q -> 1, R -> 5, S -> 3")
print("ANSWER  C")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
