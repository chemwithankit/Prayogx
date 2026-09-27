"""ADV-2026-P1-CHE-Q10 - independent derivation, no answer key consulted.

The total number of all possible isomers for the square planar complex K[M(NCS)(NO2)(gly)] is ____.
(M = metal ion, gly = NH2CH2COO-)

Ligands: gly- is an unsymmetrical bidentate (N, O) chelate; NCS- binds through N or S; NO2- through N or O.

Routes used, so no single argument is trusted on its own:
  1. brute force: every seating of the donor atoms on the four corners, folded by the symmetry
     permutations of a square (the dihedral group of order 8)
  2. Burnside's lemma - the count from fixed points alone, no orbit bookkeeping
  3. real 3-D geometry: coordinates for the complex, every proper rotation that maps the donor
     sites onto themselves found numerically, and a mirror-image test done with coordinates
     (superimposable or not), for chirality
  4. the conditions the page lets a student change: tetrahedral geometry, a symmetrical chelate
     (acac-), single-donor halides in place of the ambidentate ligands
  5. the traps: adding instead of multiplying, doubling for optical isomers, ignoring linkage,
     treating glycinate as symmetrical, and the chelate spanning trans positions

Run:  python3 tests/verify_p1q10.py
"""
import itertools
import numpy as np

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


# ------------------------------------------------ 1. permutations of the square
SQ_ADJ = {frozenset(p) for p in [(0, 1), (1, 2), (2, 3), (3, 0)]}
rot = (1, 2, 3, 0)                      # site i goes to rot[i]
flip = (0, 3, 2, 1)                     # a 180 deg turn about the axis through sites 0 and 2


def compose(a, b):                      # apply a, then b
    return tuple(b[a[i]] for i in range(len(a)))


D4 = {(0, 1, 2, 3)}
while True:
    new = {compose(g, h) for g in D4 for h in (rot, flip)} | D4
    if new == D4:
        break
    D4 = new
chk("the symmetry group of the square has 8 elements", len(D4) == 8)

S4 = set(itertools.permutations(range(4)))
A4 = {p for p in S4 if sum(1 for i in range(4) for j in range(i + 1, 4) if p[i] > p[j]) % 2 == 0}
TD_ADJ = {frozenset(p) for p in itertools.combinations(range(4), 2)}

LIG = {
    "question": [("NCS", "SCN"), ("NO2", "ONO")],
    "Cl for NCS": [("Cl",), ("NO2", "ONO")],
    "halides": [("Cl",), ("Br",)],
}
CHELATE = {"gly": ("gN", "gO"), "acac": ("aO", "aO")}


def act(g, lab):                        # move the ligand on site i to site g[i]
    out = [None] * 4
    for i in range(4):
        out[g[i]] = lab[i]
    return tuple(out)


def seatings(mono, chel, adj):
    for x, y in itertools.product(*mono):
        for a, b in itertools.permutations(range(4), 2):
            if frozenset((a, b)) not in adj:
                continue
            rest = [i for i in range(4) if i not in (a, b)]
            for c, d in (rest, rest[::-1]):
                lab = [None] * 4
                lab[a], lab[b], lab[c], lab[d] = chel[0], chel[1], x, y
                yield tuple(lab)


def orbits(labs, group):
    seen, reps = set(), []
    for lab in labs:
        key = min(act(g, lab) for g in group)
        if key not in seen:
            seen.add(key); reps.append(key)
    return reps


def count(mono="question", chel="gly", geom="sq"):
    adj, proper, full = (SQ_ADJ, D4, D4) if geom == "sq" else (TD_ADJ, A4, S4)
    labs = list(seatings(LIG[mono], CHELATE[chel], adj))
    stereo = orbits(labs, proper)
    diast = orbits(labs, full)
    return len(labs), len(stereo), len(diast), len(stereo) - len(diast)


raw, n, nd, nchiral = count()
chk("64 raw seatings (4 linkage sets x 8 chelate placements x 2)", raw == 64, str(raw))
chk("brute force: 8 distinct isomers", n == 8, str(n))
chk("...none of them chiral: the full group adds no new identifications", nchiral == 0 and nd == 8)
per = {}
for lab in orbits(list(seatings(LIG["question"], CHELATE["gly"], SQ_ADJ)), D4):
    key = tuple(sorted(l for l in lab if l not in ("gN", "gO")))
    per[key] = per.get(key, 0) + 1
chk("each of the 4 linkage sets gives exactly 2 geometric isomers", len(per) == 4 and set(per.values()) == {2}, str(per))


def trans_to_N(lab):
    return lab[(lab.index("gN") + 2) % 4]


names = sorted("/".join(sorted(x for x in l if x not in ("gN", "gO"))) + ": " + trans_to_N(l) + " trans to N(gly)" for l in orbits(list(seatings(LIG["question"], CHELATE["gly"], SQ_ADJ)), D4))
chk("within each linkage set the two isomers differ in which ligand sits trans to the glycinate N", len(set(names)) == 8, "; ".join(names[:2]) + " ...")

# ------------------------------------------------ 2. Burnside
labs = list(seatings(LIG["question"], CHELATE["gly"], SQ_ADJ))
labset = set(labs)
chk("the seatings are closed under the group (a requirement for Burnside)", all(act(g, l) in labset for g in D4 for l in labs))
burn = sum(sum(1 for l in labs if act(g, l) == l) for g in D4) / len(D4)
chk("Burnside: (1/|G|) x sum of fixed seatings = 8", burn == 8, str(burn))
chk("only the identity fixes a seating: every isomer has 8 equivalent seatings (64/8)",
    all(sum(1 for l in labs if act(g, l) == l) == 0 for g in D4 if g != (0, 1, 2, 3)))

# ------------------------------------------------ 3. coordinates
def site_vectors(geom):
    if geom == "sq":
        return np.array([[0, 1, 0], [1, 0, 0], [0, -1, 0], [-1, 0, 0]], float)
    v = np.array([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], float)
    return v / np.sqrt(3)


def rotations(V):
    """Every proper rotation that maps the set of site vectors onto itself, found numerically."""
    Rs = []
    for a, b in itertools.permutations(range(len(V)), 2):
        if abs(abs(V[a] @ V[b]) - 1) < 1e-9:
            continue
        for a2, b2 in itertools.permutations(range(len(V)), 2):
            if abs(V[a] @ V[b] - V[a2] @ V[b2]) > 1e-9:
                continue
            A = np.array([V[a], V[b], np.cross(V[a], V[b])]).T
            B = np.array([V[a2], V[b2], np.cross(V[a2], V[b2])]).T
            R = B @ np.linalg.inv(A)
            if not np.allclose(R @ R.T, np.eye(3)) or abs(np.linalg.det(R) - 1) > 1e-9:
                continue
            perm = []
            for i in range(len(V)):
                j = [k for k in range(len(V)) if np.allclose(R @ V[i], V[k])]
                if len(j) != 1:
                    break
                perm.append(j[0])
            if len(perm) == len(V) and not any(np.allclose(R, S) for S, _ in Rs):
                Rs.append((R, tuple(perm)))
    return Rs


RS = rotations(site_vectors("sq"))
chk("numerically: 8 proper rotations map the square's sites onto themselves", len(RS) == 8)
chk("...and they are exactly the permutations used in route 1", {p for _, p in RS} == D4)
RT = rotations(site_vectors("td"))
chk("numerically: 12 proper rotations for a tetrahedron (they are the even permutations)", len(RT) == 12 and {p for _, p in RT} == A4)


def superimposable(lab, mirror_lab, perms):
    return any(act(g, mirror_lab) == lab for g in perms)


def mirror(lab, geom):
    V = site_vectors(geom)
    M = np.array([[0, 1, 0], [1, 0, 0], [0, 0, 1.0]])   # reflect in the plane x = y (a mirror for both shapes)
    out = [None] * 4
    for i in range(4):
        j = [k for k in range(4) if np.allclose(M @ V[i], V[k])][0]
        out[j] = lab[i]
    return tuple(out)


reps = orbits(labs, D4)
chk("coordinates: every square-planar isomer is superimposable on its mirror image",
    all(superimposable(l, mirror(l, "sq"), {p for _, p in RS}) for l in reps))
chk("...also true for the reflection in the molecular plane itself, which moves no atom",
    all(np.allclose(np.diag([1, 1, -1.0]) @ v, v) for v in site_vectors("sq")))
td_labs = list(seatings(LIG["question"], CHELATE["gly"], TD_ADJ))
td_reps = orbits(td_labs, A4)
chk("contrast: on a tetrahedron the same donors are chiral - no rotation superimposes the mirror image",
    all(not superimposable(l, mirror(l, "td"), A4) for l in td_reps))

# ------------------------------------------------ 4. custom conditions
c = count(geom="td")
chk("tetrahedral: still 8, but as 4 pairs of enantiomers (4 diastereomers)", c[1:] == (8, 4, 4), str(c))
chk("acac- (symmetrical O,O chelate), square planar: 4 - one geometric isomer per linkage set", count(chel="acac")[1] == 4)
chk("Cl- in place of NCS-: 4", count(mono="Cl for NCS")[1] == 4)
chk("Cl- and Br- for both ambidentate ligands: 2 (cis and trans to the glycinate N)", count(mono="halides")[1] == 2)
chk("acac on a tetrahedron: 4, none chiral (a mirror plane through the two monodentates)", count(chel="acac", geom="td")[1:] == (4, 4, 0))

# ------------------------------------------------ 5. traps and the chelate span
chk("trap: adding 4 linkage + 2 geometric gives 6, not 8", 4 + 2 == 6 != n)
chk("trap: doubling for optical isomers gives 16 - there are none", 2 * n == 16 and nchiral == 0)
chk("trap: ignoring linkage isomerism gives 2", count(mono="halides")[1] == 2 != n)
chk("trap: treating glycinate as symmetrical gives 4", count(chel="acac")[1] == 4 != n)
ML, BITE = 2.00, 2.65              # M-L in angstrom; N...O bite of a glycinate chelate (Cu(gly)2: about 2.6-2.7)
cis, trans = ML * np.sqrt(2), 2 * ML
chk("the chelate can only span cis corners: cis 2.83 A is close to its bite, trans 4.00 A is far beyond it",
    abs(cis - BITE) < 0.25 and trans - BITE > 1.2, f"cis {cis:.2f}, trans {trans:.2f}, bite {BITE}")
chk("allowing a trans-spanning chelate would give 12 - a structure that cannot exist",
    len(orbits(list(seatings(LIG["question"], CHELATE["gly"], {frozenset(p) for p in itertools.combinations(range(4), 2)})), D4)) == 12)

print()
print("linkage sets 2 x 2 = 4; geometric isomers per set 2; optical isomers 0")
print("ANSWER  8")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
raise SystemExit(1 if fail else 0)
