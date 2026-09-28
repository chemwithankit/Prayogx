"""Q15 data generator (build time): the four List-I alkenes and the five List-II products as graphs (the question's
structures), and 2-D drawing coordinates for every mechanistic state (RDKit depictions, aligned step to step).
The chemistry itself (which bonds break and form, which enolate, which product) is NOT exported - the page works it
out by pushing arrows; this script only pushes the same arrows independently to know what to draw, and checks itself."""
import json, math
import numpy as np
from rdkit import Chem
from rdkit.Chem import rdDepictor, AllChem
rdDepictor.SetPreferCoordGen(True)

SUB = {"P": "CC1CCCC2=C1CCCC2C", "Q": "CC1CCCCC2=C1CCC2C", "R": "CC1CCCC(C)C2=C1CCC2", "S": "CC1CCC(C)C2=C1CCCC2"}
L2 = {1: "CC12CCCCC1(O)C(C)CCC2=O", 2: "CC12CCCC1(O)C(C)CCCC2=O", 3: "CC12CCC(C)C1(O)CCCCC2=O", 4: "CC1CCCC2(C)CCCC(=O)C12O", 5: "CC1CCCC2(C)C(=O)CCCC12O"}
VAL = {"C": 4, "O": 2, "H": 1}


def graph(smi):
    m = Chem.MolFromSmiles(smi)
    at = [[a.GetSymbol(), a.GetTotalNumHs()] for a in m.GetAtoms()]
    bd = {}
    for b in m.GetBonds():
        i, j = sorted((b.GetBeginAtomIdx(), b.GetEndAtomIdx())); bd[(i, j)] = int(b.GetBondTypeAsDouble())
    return at, bd


def bo(B, i, j): return B.get(tuple(sorted((i, j))), 0)


def setbo(B, i, j, o):
    k = tuple(sorted((i, j)))
    if o <= 0: B.pop(k, None)
    else: B[k] = o


def nb(B, i): return [(j if k == i else k, o) for (k, j), o in B.items() if i in (k, j)]


def charge(at, B, i):
    el, h = at[i]; v = sum(o for _, o in nb(B, i)) + h
    if el == "Zn": return v
    if el == "H": return 1 if v == 0 else v - 1
    return v - VAL[el]


def push(B, arrows):
    B = dict(B)
    for fr, to in arrows:
        if fr[0] == "b": setbo(B, fr[1], fr[2], bo(B, fr[1], fr[2]) - 1)
        if to[0] == "b": setbo(B, to[1], to[2], bo(B, to[1], to[2]) + 1)
    return B


def comps(n, B):
    seen, out = set(), []
    for s in range(n):
        if s in seen: continue
        st, c = [s], []
        seen.add(s)
        while st:
            x = st.pop(); c.append(x)
            for y, _ in nb(B, x):
                if y not in seen: seen.add(y); st.append(y)
        out.append(sorted(c))
    return out


def path_len(B, s, t, banned):
    """shortest path s->t avoiding one bond (length in bonds)"""
    from collections import deque
    dq, seen = deque([(s, 0)]), {s}
    while dq:
        x, d = dq.popleft()
        if x == t: return d
        for y, _ in nb(B, x):
            if tuple(sorted((x, y))) == banned or y in seen: continue
            seen.add(y); dq.append((y, d + 1))
    return None


def plan(key, mode="stable"):
    at, B0 = graph(SUB[key])
    n0 = len(at)
    ca, cb = [k for k, o in B0.items() if o == 2 and at[k[0]][0] == "C" and at[k[1]][0] == "C"][0]
    O1, O2, O3, ZN, OB, HA = n0, n0 + 1, n0 + 2, n0 + 3, n0 + 4, n0 + 5
    at = at + [["O", 0], ["O", 0], ["O", 0], ["Zn", 0], ["O", 1], ["H", 0]]
    B = dict(B0); setbo(B, O1, O2, 2); setbo(B, O2, O3, 1)
    # the dione's carbonyl carbons are ca and cb; enolate candidates: alpha C-H carbons of each
    cands = []
    for ck, cm in ((ca, cb), (cb, ca)):
        for x, _ in nb(B0, ck):
            if at[x][0] != "C" or x in (ca, cb) or at[x][1] == 0: continue
            subst = sum(1 for y, _ in nb(B0, x) if at[y][0] == "C")      # carbon neighbours of the alpha carbon in the dione
            # new rings when x bonds to cm: the two paths from x to cm around the ten-membered ring
            r1 = path_len(dict((k, v) for k, v in B0.items() if k != tuple(sorted((ca, cb)))), x, cm, tuple(sorted((x, ck))))
            ringA = r1 + 1
            ringB = 10 - ringA + 2
            cands.append({"x": x, "ck": ck, "cm": cm, "subst": subst, "rings": sorted((ringA, ringB))})
    ok = [c for c in cands if c["rings"][0] >= 5]
    ok.sort(key=lambda c: ((-c["subst"]) if mode == "stable" else c["subst"], c["x"]))
    ch = ok[0]
    CA, CK, CM = ch["x"], ch["ck"], ch["cm"]
    at[CA][1] -= 1; setbo(B, CA, HA, 1)
    OK, OM = (O3, O2) if CK == ca else (O2, O3)
    steps = [
        ("cyclo", [(("a", O3), ("b", O3, cb)), (("b", ca, cb), ("b", ca, O1)), (("b", O1, O2), ("a", O2))]),
        ("retro", [(("a", O1), ("b", ca, O1)), (("b", ca, cb), ("b", cb, O3)), (("b", O3, O2), ("a", O2))]),
        ("recomb", [(("a", O2), ("b", O2, cb)), (("b", cb, O3), ("b", O3, ca)), (("b", ca, O1), ("a", O1))]),
        ("zn1", [(("a", ZN), ("b", ZN, O1)), (("b", O1, O2), ("a", O2))]),
        ("zn2", [(("a", O2), ("b", O2, cb)), (("b", cb, O3), ("a", O3)), (("a", O3), ("b", O3, ca)), (("b", ca, O1), ("a", O1))]),
        ("enol", [(("a", OB), ("b", OB, HA)), (("b", HA, CA), ("b", CA, CK)), (("b", CK, OK), ("a", OK))]),
        ("aldol", [(("a", OK), ("b", OK, CK)), (("b", CA, CK), ("b", CA, CM)), (("b", CM, OM), ("a", OM))]),
        ("prot", [(("a", OM), ("b", OM, HA)), (("b", HA, OB), ("a", OB))]),
    ]
    states = [B]
    for _, arr in steps:
        states.append(push(states[-1], arr))
    n = len(at)
    for s in states:
        for i in range(n):
            q = charge(at, s, i)
            assert -1 <= q <= 1 or at[i][0] == "Zn", (key, i, q)
        assert sum(charge(at, s, i) for i in range(n)) == -1   # the hydroxide's charge, carried through
    roles = {"ca": ca, "cb": cb, "O1": O1, "O2": O2, "O3": O3, "Zn": ZN, "Ob": OB, "Ha": HA, "Calpha": CA, "Ck": CK, "Cm": CM, "Ok": OK, "Om": OM}
    return at, states, steps, roles, cands, n0


def rdmol(at, B, idx):
    """an RDKit mol of the atoms idx (a connected set) with the bonds among them; charges from the bond graph"""
    em = Chem.RWMol(); mp = {}
    for i in idx:
        a = Chem.Atom(at[i][0]); a.SetNoImplicit(True); a.SetNumExplicitHs(at[i][1]); a.SetFormalCharge(charge(at, B, i)); mp[i] = em.AddAtom(a)
    for (i, j), o in B.items():
        if i in mp and j in mp:
            em.AddBond(mp[i], mp[j], {1: Chem.BondType.SINGLE, 2: Chem.BondType.DOUBLE, 3: Chem.BondType.TRIPLE}[o])
    m = em.GetMol(); Chem.SanitizeMol(m)
    return m, mp


def depict(at, B, idx):
    m, mp = rdmol(at, B, idx)
    rdDepictor.Compute2DCoords(m)
    c = m.GetConformer()
    return {i: np.array([c.GetAtomPosition(mp[i]).x, c.GetAtomPosition(mp[i]).y]) for i in idx}


def align(new, ref, keys):
    """rotate / reflect / translate `new` onto `ref` over the shared atoms (Kabsch with reflection allowed)"""
    keys = [k for k in keys if k in new and k in ref]
    X = np.array([new[k] for k in keys]); Y = np.array([ref[k] for k in keys])
    mx, my = X.mean(0), Y.mean(0)
    best = None
    for refl in (1, -1):
        Xr = (X - mx) * np.array([1, refl])
        U, _, Vt = np.linalg.svd(Xr.T @ (Y - my))
        R = U @ Vt
        if np.linalg.det(R) < 0: continue
        err = ((Xr @ R - (Y - my)) ** 2).sum()
        if best is None or err < best[0]: best = (err, refl, R)
    _, refl, R = best
    return {k: ((v - mx) * np.array([1, refl])) @ R + my for k, v in new.items()}


def layouts(key, mode="stable"):
    at, states, steps, roles, cands, n0 = plan(key, mode)
    n = len(at)
    main = lambda B: [c for c in comps(n, B) if roles["ca"] in c][0]
    L = []
    prev = None
    for k, B in enumerate(states):
        idx = main(B); P = depict(at, B, idx)
        if prev is not None: P = align(P, prev, list(range(n0)))
        L.append(P); prev = P
    # place the free fragments that take part in a step next to the atom they bond to (A) or have just left (B)
    def far(i): return np.array([40.0 + i, 40.0])
    def unitv(v): l = np.linalg.norm(v); return v / l if l > 1e-9 else np.array([1.0, 0.0])
    def place_free(pos, Bgraph, other, main_idx, cen, spread):
        for F in comps(n, Bgraph):
            if any(i in main_idx for i in F): continue
            anchor = None
            for i in F:
                for m in main_idx:
                    if bo(other, i, m) and m in pos: anchor = (i, m); break
                if anchor: break
            if not anchor: continue
            i, m = anchor
            d = unitv(pos[m] - cen)
            pos[i] = pos[m] + d * spread
            rest = [x for x in F if x != i]
            for t, x in enumerate(rest):
                ang = (t - (len(rest) - 1) / 2) * 0.9
                c, sn = math.cos(ang), math.sin(ang)
                pos[x] = pos[i] + np.array([d[0] * c - d[1] * sn, d[0] * sn + d[1] * c]) * 1.25
    out = []
    for k, (name, arr) in enumerate(steps):
        A = {i: far(i) for i in range(n)}; Bp = {i: far(i) for i in range(n)}
        for i, v in L[k].items(): A[i] = v
        for i, v in L[k + 1].items(): Bp[i] = v
        cenA = np.mean([L[k][i] for i in range(n0)], 0); cenB = np.mean([L[k + 1][i] for i in range(n0)], 0)
        place_free(A, states[k], states[k + 1], set(L[k].keys()), cenA, 1.9)
        place_free(Bp, states[k + 1], states[k], set(L[k + 1].keys()), cenB, 2.4)
        out.append({"name": name, "A": [[round(float(A[i][0]), 3), round(float(-A[i][1]), 3)] for i in range(n)],
                    "B": [[round(float(Bp[i][0]), 3), round(float(-Bp[i][1]), 3)] for i in range(n)]})
    start = [[round(float(L[0].get(i, far(i))[0]), 3), round(float(-L[0].get(i, far(i))[1]), 3)] for i in range(n)]
    return at, states, steps, roles, cands, n0, out, start


def product_smiles(at, B, roles):
    n = len(at); idx = [c for c in comps(n, B) if roles["ca"] in c][0]
    m, _ = rdmol(at, B, idx)
    m = Chem.RemoveHs(m)
    return Chem.MolToSmiles(m)


if __name__ == "__main__":
    data = {"sub": {}, "list2": {}}
    for k in "PQRS":
        at, B = graph(SUB[k])
        at_all, states, steps, roles, cands, n0, lay, start = layouts(k)
        atK, statesK, _, rolesK, _, _, layK, startK = layouts(k, "kinetic")
        data["sub"][k] = {"atoms": at, "bonds": [[i, j, o] for (i, j), o in sorted(B.items())], "start": start, "lay": lay, "calpha": roles["Calpha"],
                          "startK": startK, "layK": layK, "calphaK": rolesK["Calpha"]}
        print(k, "kinetic enolate at", rolesK["Calpha"], "product", product_smiles(atK, statesK[-1], rolesK))
        ps = product_smiles(at_all, states[-1], roles)
        hit = [m for m, s in L2.items() if Chem.CanonSmiles(s) == Chem.CanonSmiles(ps)]
        print(k, "enolate at", roles["Calpha"], "rings", [c["rings"] for c in cands if c["x"] == roles["Calpha"]][0], "product", ps, "-> List-II", hit)
    for m, s in L2.items():
        at, B = graph(s)
        data["list2"][m] = {"atoms": at, "bonds": [[i, j, o] for (i, j), o in sorted(B.items())], "smiles": s}
    json.dump(data, open("q15data.json", "w"), separators=(",", ":"))
    print("bytes", len(json.dumps(data, separators=(",", ":"))))
