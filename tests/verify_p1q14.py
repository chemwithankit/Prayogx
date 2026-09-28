"""ADV-2026-P1-CHE-Q14 - independent derivation, no answer key consulted.

Species: SOCl2, XeOF4, ClF3, ClF5, XeF5+, SO3(2-), XeF3+, SF4
List-I: (P) See-saw (Q) T-Shaped (R) Trigonal Planar (S) Square Pyramidal
List-II: (1) one (2) two (3) three (4) four (5) zero
Options: (A) P1 Q2 R5 S3  (B) P5 Q4 R2 S3  (C) P3 Q2 R1 S4  (D) P1 Q3 R5 S4

Routes used, so no single argument is trusted on its own:
  1. lone pairs counted two ways: the central-atom rule (V - bonding electrons - charge)/2, and a full Lewis-structure
     count of all valence electrons with the terminal atoms' octets filled first
  2. a second repulsion model, written separately from the page's: points on a sphere, 1/r^8 repulsion with its own
     lone-pair weights, minimised with scipy from 40 random starts
  3. shapes read from the angles between bonded atoms; the textbook AXnEm table as a cross-check
  4. tally, List-II, every option; controls SO3, XeF4, SF6
  5. qualitative agreement with measured angles (lone pairs squeeze their neighbours)
  6. the page's shapes (node run of the engine) compared

Run:  python3 tests/verify_p1q14.py
"""
import numpy as np
from scipy.optimize import minimize

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


VAL = {"S": 6, "Xe": 8, "Cl": 7, "O": 6, "F": 7}
SP = {"SOCl2": ("S", ["O", "Cl", "Cl"], 0), "XeOF4": ("Xe", ["O", "F", "F", "F", "F"], 0), "ClF3": ("Cl", ["F"] * 3, 0), "ClF5": ("Cl", ["F"] * 5, 0),
      "XeF5+": ("Xe", ["F"] * 5, 1), "SO3(2-)": ("S", ["O"] * 3, -2), "XeF3+": ("Xe", ["F"] * 3, 1), "SF4": ("S", ["F"] * 4, 0),
      "SO3": ("S", ["O"] * 3, 0), "XeF4": ("Xe", ["F"] * 4, 0), "SF6": ("S", ["F"] * 6, 0)}
QUESTION = ["SOCl2", "XeOF4", "ClF3", "ClF5", "XeF5+", "SO3(2-)", "XeF3+", "SF4"]


def lp_rule(c, L, q):
    return (VAL[c] - sum(2 if x == "O" else 1 for x in L) - q) / 2


def lp_lewis(c, L, q):
    total = VAL[c] + sum(VAL[x] for x in L) - q
    # every terminal atom completes its octet: F/Cl single bond (2 shared) + 3 lone pairs; O double bond (4 shared) + 2 lone pairs
    used = sum(8 if x in ("F", "Cl") else 8 for x in L)   # electrons "owned" by the bond + terminal lone pairs
    return (total - used) / 2


# ------------------------------------------------ 1. lone pairs, two ways
for k in QUESTION:
    c, L, q = SP[k]
    a, b = lp_rule(c, L, q), lp_lewis(c, L, q)
    chk("%-8s lone pairs: rule %g = Lewis count %g" % (k, a, b), a == b and a == int(a))

# ------------------------------------------------ 2. a separate repulsion model
WB = {(0, 0): 1.0, (0, 1): 1.2, (1, 1): 1.5}


def energy(x, lp):
    th, ph = x[0::2], x[1::2]
    P = np.stack([np.sin(th) * np.cos(ph), np.sin(th) * np.sin(ph), np.cos(th)], 1)
    e = 0.0
    for i in range(len(lp)):
        for j in range(i + 1, len(lp)):
            r2 = ((P[i] - P[j]) ** 2).sum()
            e += WB[tuple(sorted((lp[i], lp[j])))] / r2 ** 4
    return e


def relax(nb, nl, starts=40, seed=1):
    lp = [0] * nb + [1] * nl
    rng = np.random.default_rng(seed); best = None
    for _ in range(starts):
        x0 = np.stack([np.arccos(rng.uniform(-1, 1, nb + nl)), rng.uniform(0, 2 * np.pi, nb + nl)], 1).ravel()
        r = minimize(energy, x0, args=(lp,), method="L-BFGS-B")
        if best is None or r.fun < best.fun - 1e-10:
            best = r
    th, ph = best.x[0::2], best.x[1::2]
    return np.stack([np.sin(th) * np.cos(ph), np.sin(th) * np.sin(ph), np.cos(th)], 1)[:nb]


def angles(B):
    return [np.degrees(np.arccos(np.clip(B[i] @ B[j], -1, 1))) for i in range(len(B)) for j in range(i + 1, len(B))]


def shape(B):
    A = angles(B); n = len(B)
    c = lambda t: sum(abs(a - t) < 12 for a in A)
    if n == 3:
        if c(180) == 1 and c(90) == 2: return "T-shaped"
        return "trigonal planar" if abs(sum(A) - 360) < 6 else "trigonal pyramidal"
    if n == 4:
        if c(180) == 2 and c(90) == 4: return "square planar"
        if c(180) == 1 and c(120) == 1 and c(90) == 4: return "see-saw"
        if c(109.5) == 6: return "tetrahedral"
    if n == 5:
        if c(180) == 2 and c(90) == 8: return "square pyramidal"
        if c(180) == 1 and c(120) == 3 and c(90) == 6: return "trigonal bipyramidal"
    if n == 6 and c(180) == 3 and c(90) == 12: return "octahedral"
    return "unclassified"


AXE = {(4, 1): "trigonal pyramidal", (5, 1): "see-saw", (5, 2): "T-shaped", (6, 1): "square pyramidal", (6, 2): "square planar", (3, 0): "trigonal planar", (6, 0): "octahedral"}
res = {}
for k in QUESTION + ["SO3", "XeF4", "SF6"]:
    c, L, q = SP[k]; nl = int(lp_rule(c, L, q)); B = relax(len(L), nl)
    res[k] = (shape(B), angles(B), len(L) + nl, nl)
for k in QUESTION:
    sh, A, sn, nl = res[k]
    chk("%-8s repulsion model: %s = AX%dE%d table" % (k, sh, sn - nl, nl), sh == AXE[(sn, nl)], "angles %s" % ",".join("%.0f" % a for a in sorted(set(np.round(A)))))

# ------------------------------------------------ 3. tally, List-II, options
SH = ["see-saw", "T-shaped", "trigonal planar", "square pyramidal"]
cnt = [sum(res[k][0] == s for k in QUESTION) for s in SH]
m = [{0: 5, 1: 1, 2: 2, 3: 3, 4: 4}[c] for c in cnt]
chk("counts: see-saw 1, T-shaped 2, trigonal planar 0, square pyramidal 3", cnt == [1, 2, 0, 3], str(cnt))
chk("List-II: P1 Q2 R5 S3", m == [1, 2, 5, 3], str(m))
OPTS = {"A": [1, 2, 5, 3], "B": [5, 4, 2, 3], "C": [3, 2, 1, 4], "D": [1, 3, 5, 4]}
hits = [k for k, v in OPTS.items() if v == m]
chk("exactly one option matches: (A)", hits == ["A"], str(hits))
for k in "BCD":
    bad = ["PQRS"[i] for i in range(4) if OPTS[k][i] != m[i]]
    chk("option (%s) rejected at %s" % (k, ",".join(bad)), bool(bad))
chk("the two pyramidal species (SOCl2, SO3 2-) are in no List-I shape", [k for k in QUESTION if res[k][0] not in SH] == ["SOCl2", "SO3(2-)"])
chk("control SO3 -> trigonal planar (no lone pair)", res["SO3"][0] == "trigonal planar")
chk("control XeF4 -> square planar (two lone pairs trans)", res["XeF4"][0] == "square planar")
chk("control SF6 -> octahedral", res["SF6"][0] == "octahedral")

# ------------------------------------------------ 5. lone pairs squeeze their neighbours (measured: ClF3 87.5, SO3 2- ~106, SF4 axial 173)
chk("ClF3: axial-equatorial angle below 90 deg", min(res["ClF3"][1]) < 90, "%.1f" % min(res["ClF3"][1]))
chk("SO3 2-: O-S-O below 109.5 deg", max(res["SO3(2-)"][1]) < 109.5, "%.1f" % max(res["SO3(2-)"][1]))
chk("SF4: axial F-S-F bent below 180 deg", max(res["SF4"][1]) < 179, "%.1f" % max(res["SF4"][1]))

# ------------------------------------------------ 6. the page (node run of its engine)
page = {"SOCl2": "trigonal pyramidal", "XeOF4": "square pyramidal", "ClF3": "T-shaped", "ClF5": "square pyramidal", "XeF5+": "square pyramidal",
        "SO3(2-)": "trigonal pyramidal", "XeF3+": "T-shaped", "SF4": "see-saw", "SO3": "trigonal planar", "XeF4": "square planar", "SF6": "octahedral"}
chk("page shapes agree with this script for all 11 species", all(page[k] == res[k][0] for k in page))

print()
print("P -> 1, Q -> 2, R -> 5, S -> 3")
print("ANSWER  A")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
