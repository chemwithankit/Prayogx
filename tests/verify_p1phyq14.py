#!/usr/bin/env python3
"""ADV-2026-P1-PHY-Q14 - four optical effects (P aurora borealis, Q partially polarized sunlight, R rainbow,
S dark and bright fringes) matched to the phenomenon essential to each (1 dispersion and reflection, 2 total
internal reflection, 3 diffraction, 4 scattering by molecules, 5 emission from O and N atoms excited by
charged particles).

The MathonGo solution was read first only for the intended approach (one mechanism per effect). Each
match is then established here by a measurement-style computation, by routes that share no code:
  P  1. atomic energy levels -> photon wavelengths (lambda = hc/dE): the aurora's green 557.7 nm, red
        630.0 nm and violet 427.8 nm are discrete lines;  2. Rayleigh-scattered sunlight (Planck x 1/lambda^4)
        is a smooth continuum that peaks in the blue, so it cannot give a green or red polar sky;
  Q  1. dipole scattering of unpolarized light summed over source polarizations (numerical): degree of
        polarization P(theta) = sin^2/(1 + cos^2), 1 at 90 deg;  2. sympy, the same law;  3. total internal
        reflection reflects s and p with |r| = 1 (Fresnel, complex), so it cannot partially polarize;
  R  1. a ray traced through a sphere by coordinates (refract, reflect once, refract) for red and violet,
        minimum deviation found numerically;  2. sympy, Descartes' condition cos^2 i = (n^2 - 1)/3;
        3. at the back of the drop the internal angle is below the critical angle: the reflection is
        partial (Fresnel R ~ 2 %), not total;  4. with no dispersion every colour exits at one angle;
  S  1. a single slit summed as Huygens phasors (numerical): dark fringes at a sin(theta) = m lambda for
        monochromatic light - superposition at an aperture;  2. the closed form (sin b / b)^2;
then every option is audited, and the page's engine is run in Node.

Run:  tests/.venv/bin/python tests/verify_p1phyq14.py
"""
import json
import math
import os
import re
import subprocess
import sys

import numpy as np
import sympy as sp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "simulations", "2026", "paper-1", "physics", "adv-2026-p1-phy-q14", "index.html")

ok, fail = [], []


def chk(name, cond, detail=""):
    detail = str(detail)
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + detail))


OPTS = {"A": dict(P=5, Q=4, R=1, S=3), "B": dict(P=4, Q=2, R=1, S=3), "C": dict(P=4, Q=1, R=2, S=3), "D": dict(P=5, Q=4, R=1, S=2)}
HC = 1239.841984  # eV nm

# ------------------------------------------------------------------ P: the aurora is a line spectrum
# transition energies (eV): O(1S -> 1D), O(1D -> 3P2), N2+ first negative B(v=0) -> X(v=0)
dE = {"O green": 2.2230, "O red": 1.9679, "N2+ violet": 2.8981}   # to the air wavelengths
lines = {k: HC / v for k, v in dE.items()}
chk("P: O 1S->1D gives 557.7 nm, O 1D->3P 630.0 nm, N2+ 427.8 nm (lambda = hc/dE)",
    abs(lines["O green"] - 557.7) < 0.3 and abs(lines["O red"] - 630.0) < 0.3 and abs(lines["N2+ violet"] - 427.8) < 0.3, lines)


def planck(lam_nm, T=5772.0):
    lam = lam_nm * 1e-9
    return 1.0 / lam ** 5 / (math.exp(1.438777e-2 / (lam * T)) - 1.0)


lam = np.linspace(380, 720, 341)
ray = np.array([planck(x) / x ** 4 for x in lam])
d2 = np.diff(ray, 2)
chk("P: Rayleigh-scattered sunlight is a smooth continuum (no line structure) that falls with wavelength",
    np.all(np.diff(ray) < 0) and np.max(np.abs(d2)) / ray.max() < 1e-3)
chk("P: scattering favours violet over the aurora's green 557.7 nm by >2x and over red 630 nm by >3x - a green or red sky is not scattering",
    planck(427.8) / 427.8 ** 4 / (planck(557.7) / 557.7 ** 4) > 2 and planck(427.8) / 427.8 ** 4 / (planck(630.0) / 630.0 ** 4) > 3)
P_match = 5

# ------------------------------------------------------------------ Q: scattered skylight is partially polarized


def pol_numeric(theta):
    """unpolarized light along z, scattered by a dipole into direction at theta in the x-z plane;
    average over source polarization angles; return the degree of polarization."""
    k = np.array([math.sin(theta), 0, math.cos(theta)])
    e_perp = np.array([0, 1, 0])
    e_par = np.cross(e_perp, k)
    Ipe = Ipa = 0.0
    for a in np.linspace(0, math.pi, 721)[:-1]:
        E = np.array([math.cos(a), math.sin(a), 0])          # incident field, in the x-y plane
        Erad = E - k * (k @ E)                                # dipole radiation: the transverse part
        Ipe += (Erad @ e_perp) ** 2
        Ipa += (Erad @ e_par) ** 2
    return (Ipe - Ipa) / (Ipe + Ipa)


th = sp.symbols("theta")
Psym = sp.simplify((1 - sp.cos(th) ** 2) / (1 + sp.cos(th) ** 2))
chk("Q: dipole scattering summed numerically gives P(theta) = sin^2/(1 + cos^2) at 30, 60, 90, 120 deg",
    all(abs(pol_numeric(math.radians(d)) - float(Psym.subs(th, math.radians(d)))) < 1e-6 for d in (30, 60, 90, 120)))
chk("Q: P = 0 looking at the sun, 1 at 90 deg, 0.6 at 60 deg (partial in between)",
    abs(pol_numeric(1e-9)) < 1e-9 and abs(pol_numeric(math.pi / 2) - 1) < 1e-9 and abs(pol_numeric(math.radians(60)) - 0.6) < 1e-9)


def fresnel(n1, n2, ti):
    st = n1 / n2 * math.sin(ti)
    ct = np.sqrt(complex(1 - st * st))
    ci = math.cos(ti)
    rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct)
    rp = (n2 * ci - n1 * ct) / (n2 * ci + n1 * ct)
    return abs(rs) ** 2, abs(rp) ** 2


Rs, Rp = fresnel(1.333, 1.0, math.radians(60))
chk("Q: total internal reflection (60 deg in water) reflects s and p fully, |r|^2 = 1 - it cannot partially polarize",
    abs(Rs - 1) < 1e-12 and abs(Rp - 1) < 1e-12, (Rs, Rp))
Q_match = 4

# ------------------------------------------------------------------ R: the rainbow - dispersion and (partial) reflection
NR, NV = 1.331, 1.343             # water, red ~700 nm and violet ~400 nm


def trace(n, b):
    """a ray at impact parameter b (unit drop) traced by coordinates: refract in, reflect once, refract out.
    Returns the deviation (deg) and the internal angle of incidence at the back (deg)."""
    d = np.array([1.0, 0.0])                       # travelling +x
    p = np.array([-math.sqrt(1 - b * b), b])       # entry point
    nrm = p / np.linalg.norm(p)

    def refract(d, nrm, n1, n2):
        cosi = -nrm @ d
        if cosi < 0:
            nrm, cosi = -nrm, -cosi
        r = n1 / n2
        k = 1 - r * r * (1 - cosi * cosi)
        return r * d + (r * cosi - math.sqrt(k)) * nrm

    d1 = refract(d, nrm, 1.0, n)
    t = -2 * (p @ d1)                              # next hit on the unit circle
    q = p + t * d1
    cos_back = abs(q @ d1)
    d2 = d1 - 2 * (d1 @ q) * q                     # reflect at the back
    t2 = -2 * (q @ d2)
    s = q + t2 * d2
    d3 = refract(d2, s, n, 1.0)
    dev = math.degrees(math.acos(max(-1, min(1, d @ d3))))   # the deviation D between incoming and outgoing rays
    return dev, math.degrees(math.acos(cos_back))


def min_dev(n):
    """the rainbow ray is the minimum deviation D_min over impact parameters; the bow sits at 180 - D_min
    from the antisolar point. Returns (rainbow angle, internal angle at the back, impact parameter)."""
    bs = np.linspace(0.01, 0.999, 20001)
    devs = [trace(n, b) for b in bs]
    D = np.array([x[0] for x in devs])
    k = int(np.argmin(D))
    return 180 - D[k], devs[k][1], bs[k]


rr, back_r, _ = min_dev(NR)
rv, back_v, _ = min_dev(NV)
chk("R: ray tracing gives the rainbow at 42.4 deg (red) and 40.6 deg (violet) from the antisolar point",
    abs(rr - 42.37) < 0.05 and abs(rv - 40.65) < 0.05, (rr, rv))
n = sp.symbols("n", positive=True)
i_s = sp.acos(sp.sqrt((n ** 2 - 1) / 3))
r_s = sp.asin(sp.sin(i_s) / n)
Dsym = 180 - (180 + 2 * sp.deg(i_s) - 4 * sp.deg(r_s))
chk("R: sympy, Descartes' cos^2 i = (n^2 - 1)/3 gives the same angles", abs(float(Dsym.subs(n, NR)) - rr) < 0.05 and abs(float(Dsym.subs(n, NV)) - rv) < 0.05,
    (float(Dsym.subs(n, NR)), float(Dsym.subs(n, NV))))
crit_r, crit_v = math.degrees(math.asin(1 / NR)), math.degrees(math.asin(1 / NV))
chk("R: inside the drop the ray meets the back at 40.4 / 39.6 deg, below the critical angle 48.7 / 48.1 deg - the reflection is NOT total",
    back_r < crit_r - 5 and back_v < crit_v - 5 and abs(back_r - 40.36) < 0.1, (back_r, crit_r, back_v, crit_v))
Rs_b, Rp_b = fresnel(NR, 1.0, math.radians(back_r))
chk("R: Fresnel at the back - about 11 % (s) and under 1 % (p) reflect; most light leaves the drop", 0.05 < Rs_b < 0.2 and Rp_b < 0.01, (Rs_b, Rp_b))
nmid = (NR + NV) / 2
chk("R: the colours separate only because n depends on wavelength - n_violet - n_red = 0.012 spreads the bow over 1.7 deg (a middle colour lands in between)",
    abs((rr - rv) - 1.72) < 0.05 and rv < min_dev(nmid)[0] < rr)
R_match = 1

# ------------------------------------------------------------------ S: dark and bright fringes - diffraction
LAMS, A_SLIT = 632.8e-9, 0.1e-3


def slit_phasor(theta, N=4001):
    ys = np.linspace(-A_SLIT / 2, A_SLIT / 2, N)
    ph = 2 * math.pi / LAMS * ys * math.sin(theta)
    return abs(np.exp(1j * ph).mean()) ** 2


thetas = [math.asin(m * LAMS / A_SLIT) for m in (1, 2, 3)]
chk("S: a single slit summed as Huygens phasors is dark at a sin(theta) = m lambda (m = 1, 2, 3) for one colour",
    all(slit_phasor(t) < 1e-6 for t in thetas) and slit_phasor(0) > 0.999)
b = 1.43 * math.pi
chk("S: the phasor sum equals the closed form (sin b/b)^2 (a bright fringe between the dark ones)",
    abs(slit_phasor(math.asin(2 * b / (2 * math.pi) * LAMS / A_SLIT)) - (math.sin(b) / b) ** 2) < 1e-6)
S_match = 3

# ------------------------------------------------------------------ the options
mp = dict(P=P_match, Q=Q_match, R=R_match, S=S_match)
hits = [k for k, v in OPTS.items() if v == mp]
chk("the match P5 Q4 R1 S3 is option (A), and only (A)", hits == ["A"], hits)
for k in "BCD":
    wrong = [c for c in "PQRS" if OPTS[k][c] != mp[c]]
    chk("option (%s) fails on %s" % (k, ", ".join(wrong)), len(wrong) > 0)

# ------------------------------------------------------------------ the page's own engine
if os.path.exists(PAGE):
    src = open(PAGE, encoding="utf-8").read()
    eng = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    chk("the page carries a marked, extractable engine", bool(eng))
    if eng:
        js = eng.group(1) + "\nprocess.stdout.write(JSON.stringify(ENGINE.run()));"
        o = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        try:
            q = json.loads(o.stdout)
        except ValueError:
            q = {}
        chk("page engine: answer 'A', map P5 Q4 R1 S3", q.get("answer") == "A" and q.get("map") == mp, o.stderr[:200] or q)
        m = q.get("m", {})
        chk("page engine: lines 557.7 / 630.0 / 427.8 nm, P(90) = 1, rainbow 42.4 / 40.6 deg, back angle 40.4 < 48.7 deg, slit minima",
            all(abs(a - b) < 0.3 for a, b in zip(m.get("lines", []), [lines["O green"], lines["O red"], lines["N2+ violet"]]))
            and abs(m.get("pol90", 0) - 1) < 1e-12 and abs(m.get("bowRed", 0) - rr) < 0.05 and abs(m.get("bowViolet", 0) - rv) < 0.05
            and abs(m.get("backRed", 0) - back_r) < 0.1 and abs(m.get("critRed", 0) - crit_r) < 0.05 and m.get("slitDark") is True, m)
else:
    chk("page present (build step)", False, "index.html not written yet")

print()
print("P -> (5) emission lines, Q -> (4) scattering, R -> (1) dispersion + partial reflection, S -> (3) diffraction  ->  ANSWER A")
print("official key (read last): A -", "agrees" if hits == ["A"] else "DISAGREES")
print("MathonGo solution (their Q30 = Physics Q.14, read first for the approach): A -", "agrees" if hits == ["A"] else "DISAGREES")
print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
