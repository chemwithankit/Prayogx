"""ADV-2026-P1-CHE-Q05 - independent derivation, no answer key consulted.

2s and 2p orbital energies of H and of Li. Which of
  (A) E2s(Li) < E2p(Li)   (B) E2s(H) = E2p(H)   (C) E2p(H) < E2s(Li)   (D) E2s(H) > E2s(Li)
are true?

Routes used, so no single argument is trusted on its own:
  1. sympy: exact hydrogenic 2s and 2p wavefunctions - both are eigenfunctions with
     E = -1/8 hartree = -13.6/4 eV (degenerate)
  2. a numerical radial Schroedinger equation (Numerov shooting on a log grid, written
     here independently of the page) for H and for an electron outside a 1s^2 core
  3. Slater's rules
  4. spectroscopic data: H n = 2 level, Li ionisation energy, Li 2s-2p resonance line
  5. Hartree-Fock (pyscf) delta-SCF for Li 1s2 2s and 1s2 2p against Li+ (runs only
     when pyscf is installed; its numbers are recorded below otherwise)
  6. robustness and an audit of every printed option

Run:  python3 tests/verify_p1q05.py
"""
import math

import numpy as np
import sympy as sp

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))


HA = 27.211386       # eV per hartree
RY = HA / 2          # 13.6057 eV
TOL = 0.005          # eV

# ------------------------------------------------ 1. exact hydrogen
r = sp.symbols("r", positive=True)
R2s = (2 - r) * sp.exp(-r / 2)          # unnormalised hydrogenic radial functions, Z = 1
R2p = r * sp.exp(-r / 2)


def energy(R, l):
    # <H> for psi = R(r) Y_lm:  -1/2 (R'' + 2R'/r - l(l+1)R/r^2) - R/r = E R
    HR = -sp.Rational(1, 2) * (sp.diff(R, r, 2) + 2 * sp.diff(R, r) / r - l * (l + 1) * R / r**2) - R / r
    return sp.simplify(HR / R)


E2s_H, E2p_H = energy(R2s, 0), energy(R2p, 1)
chk("hydrogen 2s is an exact eigenfunction with E = -1/8 hartree", E2s_H == -sp.Rational(1, 8), str(E2s_H))
chk("hydrogen 2p is an exact eigenfunction with E = -1/8 hartree", E2p_H == -sp.Rational(1, 8), str(E2p_H))
chk("-1/8 hartree = -13.6/4 = -3.40 eV: E2s(H) = E2p(H), depends on n only", abs(float(E2s_H) * HA + 3.4014) < 1e-3)
chk("2s has one radial node (r = 2 bohr), 2p none", sp.solve(sp.Eq(2 - r, 0), r) == [2])

# ------------------------------------------------ 2. numerical Schroedinger equation
def V(rr, Z, nc, zeta):
    return -Z / rr + nc * (1 / rr - (zeta + 1 / rr) * np.exp(-2 * zeta * rr))


def solve(Z, nc, l, nodes, zeta, N=3000):
    x = np.linspace(np.log(1e-6), np.log(60), N); h = x[1] - x[0]; rr = np.exp(x)
    Vr = V(rr, Z, nc, zeta)

    def shoot(E):
        f = 1 - h * h * (2 * rr**2 * (Vr - E) + (l + 0.5) ** 2) / 12
        y = np.zeros(N); y[0] = rr[0] ** (l + 0.5); y[1] = rr[1] ** (l + 0.5); cnt = 0
        for i in range(1, N - 1):
            y[i + 1] = ((12 - 10 * f[i]) * y[i] - f[i - 1] * y[i - 1]) / f[i + 1]
            if y[i + 1] * y[i] < 0:
                cnt += 1
            if abs(y[i + 1]) > 1e30:
                y[: i + 2] /= 1e30
        return cnt, y[-1]
    lo, hi = -Z * Z, -1e-5
    for _ in range(70):
        E = (lo + hi) / 2; c, t = shoot(E)
        if c > nodes: hi = E
        elif c < nodes: lo = E
        elif t * (-1) ** nodes > 0: lo = E
        else: hi = E
    return (lo + hi) / 2 * HA


z = 3 - 5 / 16
num = {"H2s": solve(1, 0, 0, 1, 1), "H2p": solve(1, 0, 1, 0, 1), "Li2s": solve(3, 2, 0, 1, z), "Li2p": solve(3, 2, 1, 0, z)}
print("      numerical:", {k: round(v, 3) for k, v in num.items()})
chk("numerical H 2s = H 2p = -3.401 eV", abs(num["H2s"] + 3.4014) < 2e-3 and abs(num["H2p"] - num["H2s"]) < 1e-3)
chk("numerical Li (1s2 core): 2s = -4.76 eV, 2p = -3.43 eV", abs(num["Li2s"] + 4.763) < 0.01 and abs(num["Li2p"] + 3.426) < 0.01)
chk("the core lifts the l-degeneracy: Li 2s lies 1.34 eV below Li 2p", num["Li2p"] - num["Li2s"] > 1.0, "%.3f eV" % (num["Li2p"] - num["Li2s"]))

# ------------------------------------------------ 3. Slater's rules
zeff = 3 - 2 * 0.85
chk("Slater: Zeff(Li, 2s) = 3 - 2(0.85) = 1.30 > 1 = Zeff(H)", abs(zeff - 1.30) < 1e-9)
chk("Slater: E2s(Li) ~ -13.6 x 1.30^2 / 4 = -5.75 eV < -3.40 eV", -RY * zeff**2 / 4 < -3.4, "%.2f eV" % (-RY * zeff**2 / 4))

# ------------------------------------------------ 4. spectroscopy
IE_Li = 5.3917                 # eV, Li 2s ionisation energy
line = 1239.84198 / 670.791    # eV, Li 2s-2p resonance (D) line
spec = {"H2s": -RY / 4, "H2p": -RY / 4, "Li2s": -IE_Li, "Li2p": -IE_Li + line}
print("      measured:", {k: round(v, 3) for k, v in spec.items()})
chk("measured: Li 2p = -5.392 + 1.848 = -3.544 eV", abs(spec["Li2p"] + 3.544) < 2e-3)

# ------------------------------------------------ 5. Hartree-Fock delta-SCF
REC = {"Li2s": -5.342, "Li2p": -3.500}      # ROHF/aug-cc-pVTZ, run 2026-09-26
try:
    from pyscf import gto, scf

    def e(spin, charge, irrep=None):
        m = gto.M(atom="Li 0 0 0", basis="aug-cc-pvtz", spin=spin, charge=charge, symmetry="D2h", verbose=0)
        mf = scf.ROHF(m)
        if irrep:
            mf.irrep_nelec = irrep
        return mf.kernel()
    ion = e(0, 1)
    hf = {"Li2s": (e(1, 0, {"Ag": (2, 1)}) - ion) * HA, "Li2p": (e(1, 0, {"Ag": (1, 1), "B1u": (1, 0)}) - ion) * HA}
    src = "computed now"
except ImportError:
    hf, src = REC, "recorded (pyscf not installed)"
chk("Hartree-Fock (%s): Li 2s %.3f eV < Li 2p %.3f eV < -3.40 eV" % (src, hf["Li2s"], hf["Li2p"]),
    hf["Li2s"] < hf["Li2p"] < -3.4)

# ------------------------------------------------ 6. options
ST = {"A": ("Li2s", "<", "Li2p"), "B": ("H2s", "=", "H2p"), "C": ("H2p", "<", "Li2s"), "D": ("H2s", ">", "Li2s")}


def truth(E):
    out = []
    for k, (a, op, b) in ST.items():
        v = abs(E[a] - E[b]) <= TOL if op == "=" else (E[a] < E[b] - TOL if op == "<" else E[a] > E[b] + TOL)
        if v:
            out.append(k)
    return out


chk("numerical model: true = A, B, D", truth(num) == ["A", "B", "D"], str(truth(num)))
chk("measured values: true = A, B, D", truth(spec) == ["A", "B", "D"], str(truth(spec)))
chk("Hartree-Fock values (with exact H): true = A, B, D", truth({"H2s": -RY / 4, "H2p": -RY / 4, **hf}) == ["A", "B", "D"])
chk("(C) is false every way: E2p(H) = -3.40 lies ABOVE E2s(Li)", num["H2p"] > num["Li2s"] and spec["H2p"] > spec["Li2s"])
chk("robust to the core exponent (zeta 2.3-3.0)", all(truth({**num, "Li2s": solve(3, 2, 0, 1, zz), "Li2p": solve(3, 2, 1, 0, zz)}) == ["A", "B", "D"] for zz in (2.3, 2.69, 3.0)))
nocore = {**num, "Li2s": solve(3, 0, 0, 1, 3), "Li2p": solve(3, 0, 1, 0, 3)}
chk("control: remove the core and Li2+'s 2s = 2p again - (A) turns false", truth(nocore) == ["B", "D"], str(truth(nocore)))
be = {**num, "Li2s": solve(4, 2, 0, 1, 4 - 5 / 16), "Li2p": solve(4, 2, 1, 0, 4 - 5 / 16)}
chk("isoelectronic Be+: the same three statements hold", truth(be) == ["A", "B", "D"])

print()
print("E2s(Li) < E2p(Li) < E2s(H) = E2p(H)")
print("ANSWER  (A), (B), (D)")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
