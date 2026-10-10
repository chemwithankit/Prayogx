#!/usr/bin/env python3
"""Independent verifier for CON-CHE-REVERSIBLE-WORK (XP-05, "one gas, many paths").

    python3 tests/verify_con_che_reversible_work.py           verify; also check the committed fact sheet is current
    python3 tests/verify_con_che_reversible_work.py --facts   verify, then (re)write tools/reel-maker/facts/CON-CHE-REVERSIBLE-WORK.json

Source: NCERT Class 11 Chemistry Part I, Unit 5 Thermodynamics, kech105.pdf, Reprint 2026-27
(SHA-256 e2b5d180...48ec5f8, the hash in data/ncert/catalog.json), read 2026-10-10 as text with the vendored PDF.js:
  p. 140-141  5.2.1 Work: the cylinder with a frictionless piston; w = -p_ex dV (eq. 5.2) and its sign; finite steps
              w = -sum p dV (Fig. 5.5 b); infinite steps w = -integral p_ex dV (eq. 5.3, Fig. 5.5 c); the definition of a
              reversible process
  p. 142      irreversible = every other process; w_rev = -2.303 nRT log(Vf/Vi) (eq. 5.5); free expansion (w = 0);
              q = -w for isothermal changes; Problems 5.2 (vacuum), 5.3 (1 atm), 5.4 (reversible, "1 mol")
  p. 143      Problem 5.4's arithmetic: 2.303 x 0.08206 x 298 x 0.6990 = 39.366 L atm
The PDF is never stored in the repository; its values are transcribed below with their pages.

Flag F1 (blueprint, owner-approved 2026-10-10): Problem 5.4 calls the gas of 5.2 "1 mol", but 2 L at 10 atm and 298 K is
0.818 mol. The experience uses the gas exactly as 5.2 states it (reversible work 32.19 L atm) and shows NCERT's 39.4 only
with that note. Every stepped path is computed here with exact fractions, so no check depends on floating-point error.
This file is the authority for the facts; the page's ENGINE is checked against it (V8), and the fact sheet is generated
from it (V10), never typed by hand. Exit 0: every check passes. Exit 1: any check fails (each failure is printed).
"""
import hashlib
import json
import math
import os
import re
import subprocess
import sys
from fractions import Fraction as Fr

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "simulations", "concepts", "chemistry", "con-che-reversible-work", "index.html")
FACTS = os.path.join(ROOT, "tools", "reel-maker", "facts", "CON-CHE-REVERSIBLE-WORK.json")
CATALOG = os.path.join(ROOT, "data", "ncert", "catalog.json")

SOURCE = {
    "book": "NCERT Chemistry Part I, Class XI",
    "unit": "5 Thermodynamics",
    "file": "kech105.pdf",
    "edition": "Reprint 2026-27",
    "sha256": "e2b5d180e6f16f33f6d636a742ed6c23ce6a55636e5edb7f26207a8ed48ec5f8",
    "url": "https://ncert.nic.in/textbook/pdf/kech105.pdf",
    "read": "2026-10-10, text extracted with the vendored PDF.js 6.3.289 (printed page p = PDF page p - 135)",
}

# ---- transcribed from the source, as printed ----
PRINTED = {
    "p52": {"V_i": 2, "p_i": 10, "t_C": 25, "V_f": 10, "p_ex": 0, "answer": 0, "page": 142},       # L, atm, °C, L, atm, L atm
    "p53": {"p_ex": 1, "answer": 8, "page": 142},                                                     # q = -w = p_ex (10 - 2)
    "p54": {"n": 1, "R": Fr("0.08206"), "T": 298, "log5": Fr("0.6990"), "answer": Fr("39.366"), "page": 143},
}
# ---- the experience's dataset (D1: the gas of Problem 5.2; D3: 8 equal weights; D6: 800 grains) ----
P_I, V_I, V_F = Fr(10), Fr(2), Fr(10)
NRT = P_I * V_I                      # 20 L atm (isothermal: p V is constant)
P_F = NRT / V_F                      # 2 atm
WEIGHTS, GRAINS = 8, 800
R, T = Fr("0.08206"), 298
LATM_J = Fr("101.325")

FAILS, PASSES = [], []


def check(name, ok, detail=""):
    (PASSES if ok else FAILS).append(name)
    print(("PASS  " if ok else "FAIL  ") + name + ("" if ok and not detail else "   " + str(detail)))


def steps_by(N, direction):
    """work done BY the gas for N equal pressure steps, each ending at equilibrium (exact fraction).
    direction +1: expansion 2 L -> 10 L (p_ex 10 -> 2); -1: compression 10 L -> 2 L (p_ex 2 -> 10)"""
    w, V = Fr(0), (V_I if direction > 0 else V_F)
    for k in range(1, N + 1):
        p = P_I - k * (P_I - P_F) / N if direction > 0 else P_F + k * (P_I - P_F) / N
        V2 = NRT / p
        w += p * (V2 - V)
        V = V2
    return w


def rev_by(direction):
    return direction * float(NRT) * math.log(float(V_F / V_I))


def simpson(f, a, b, n=2000):
    h = (b - a) / n
    return h / 3 * (f(a) + f(b) + sum((4 if i % 2 else 2) * f(a + i * h) for i in range(1, n)))


def engine_runs():
    """V8: the page's own ENGINE (between ENGINE-BEGIN / ENGINE-END), run in Node: every run of the experience at two
    substep sizes, the clock at 30 and 60 fps, and a domain sweep"""
    src = open(PAGE, encoding="utf-8").read()
    m = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    if not m:
        raise RuntimeError("no ENGINE-BEGIN / ENGINE-END block in the page")
    js = r"""
const vm=require('vm');const c={Math};vm.createContext(c);vm.runInContext(process.argv[1]+';this.E=ENGINE;',c);const E=c.E;
function settleRun(ms,dt){let t=0,vmax=ms.V,vmin=ms.V;while((ms.pour||!ms.settled)&&t<60){E.step(ms,dt);t+=dt;vmax=Math.max(vmax,ms.V);vmin=Math.min(vmin,ms.V);}return {t,vmax,vmin};}
function runs(dt){const r={},ms=E.create();let s;
 E.setup(ms,{V:2,weights:8});E.load(ms,-8);s=settleRun(ms,dt);r.e1=[ms.w,ms.V,s.t,s.vmax,s.vmin];
 E.setup(ms,{V:2,weights:8});let tmax=0;for(let i=0;i<8;i++){E.load(ms,-1);tmax=Math.max(tmax,settleRun(ms,dt).t);}r.e8=[ms.w,ms.V,tmax];
 E.setup(ms,{V:2,grains:800});ms.pour=-1;s=settleRun(ms,dt);r.eg=[ms.w,ms.V,s.t,ms.seg.length];
 E.setup(ms,{V:10,weights:0});E.load(ms,8);s=settleRun(ms,dt);r.c1=[ms.w,ms.V,s.t,s.vmax,s.vmin];
 E.setup(ms,{V:10,weights:0});tmax=0;for(let i=0;i<8;i++){E.load(ms,1);tmax=Math.max(tmax,settleRun(ms,dt).t);}r.c8=[ms.w,ms.V,tmax];
 E.setup(ms,{V:10,grains:0});ms.pour=1;s=settleRun(ms,dt);r.cg=[ms.w,ms.V,s.t];
 E.setup(ms,{V:2,weights:0,hi:10});E.release(ms,0);s=settleRun(ms,dt);r.vac=[ms.w,ms.V,s.t];
 E.setup(ms,{V:2,weights:0,hi:10});E.release(ms,1);s=settleRun(ms,dt);r.p53=[ms.w,ms.V,s.t];
 const d=E.derive(ms);r.derive=[d.w,d.q,d.dU,d.pgas,d.pex];return r;}
/* the page clock: fixed 1 ms substeps, the remainder carried; a lift every 1.5 s and a pour */
function clocked(fps){const ms=E.create();E.setup(ms,{V:2,weights:8});let acc=0,ticks=0,t=0;const sub=0.001;
 for(let f=0;f<fps*24;f++){acc+=1/fps;let n=Math.floor(acc/sub+1e-9);acc=Math.max(0,acc-n*sub);
  for(let k=0;k<n;k++){ticks++;t=ticks*sub;
   if(ticks%1500===0&&ms.weights>0&&ms.settled)E.load(ms,-1);
   if(ticks===14000){E.setup(ms,{V:2,grains:800});ms.pour=-1;}
   E.step(ms,sub);}}
 return JSON.stringify([ms.w,ms.V,ms.grains,ms.seg.length,ms.steps]);}
function sweep(){const out=[];for(const V0 of [2,3.5,5,10,12])for(let p=0;p<=10.001;p+=0.5){const ms=E.create();E.setup(ms,{V:V0,weights:0});E.release(ms,p);const s=settleRun(ms,0.001);
 const ok=isFinite(ms.V)&&isFinite(ms.w)&&ms.settled&&ms.V>=E.VBOT-1e-12&&ms.V<=E.VTOP+1e-12&&Math.abs(ms.w-p*(ms.V-V0))<1e-9;if(!ok)out.push([V0,p,ms.V,ms.w]);}return out;}
console.log(JSON.stringify({a:runs(0.001),b:runs(0.00025),f30:clocked(30),f60:clocked(60),f50:clocked(50),sweep:sweep(),
 closed:{s:[1,2,4,8,800].map(N=>[E.stepWorkBy(N,1),E.stepWorkBy(N,-1),E.cycleLoss(N)]),rev:E.revWorkBy(1),n:E.n,NRT:E.NRT,PF:E.PF}}));
"""
    out = subprocess.run(["node", "-e", js, m.group(1)], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def verify():
    # V1 source values, as printed
    check("V1 source: the PDF hash recorded here is the one in data/ncert/catalog.json",
          SOURCE["sha256"] in open(CATALOG, encoding="utf-8").read(), SOURCE["sha256"][:12])
    p52, p53, p54 = PRINTED["p52"], PRINTED["p53"], PRINTED["p54"]
    check("V1 source: Problem 5.2: 2 L at 10 atm, 25 °C, expands isothermally into a vacuum to 10 L (p. 142)",
          (p52["V_i"], p52["p_i"], p52["t_C"], p52["V_f"], p52["p_ex"]) == (2, 10, 25, 10, 0))
    check("V1 source: Problem 5.3: the same expansion against a constant 1 atm (p. 142)", p53["p_ex"] == 1)
    check("V1 source: Problem 5.4: 2.303 × 1 × 0.08206 × 298 × log 5 = 39.366 L atm (pp. 142-143)",
          p54["n"] == 1 and p54["R"] == Fr("0.08206") and p54["T"] == 298 and p54["answer"] == Fr("39.366"))
    check("V1 dataset: nRT = p_i V_i = 20 L atm and p_f = 2 atm (isothermal, ideal gas)", NRT == 20 and P_F == 2)

    # V2 route 1: equal pressure steps, exact fractions (NCERT: w = -sum p dV, Fig. 5.5 b)
    exp_ = {N: steps_by(N, 1) for N in (1, 2, 4, 8)}
    check("V2 one step, p_ex = 2 atm: work by the gas = 2 × (10 − 2) = 16 L atm (eq. 5.2)", exp_[1] == 16, exp_[1])
    check("V2 two steps (6, 2 atm): 6 × (10/3 − 2) + 2 × (10 − 10/3) = 64/3 = 21.333 L atm", exp_[2] == Fr(64, 3), exp_[2])
    check("V2 four steps (8, 6, 4, 2 atm): 77/3 = 25.667 L atm", exp_[4] == Fr(77, 3), exp_[4])
    check("V2 eight steps (9 … 2 atm): 28.579 L atm", abs(float(exp_[8]) - 28.579365) < 1e-6, float(exp_[8]))
    comp = {N: -steps_by(N, -1) for N in (1, 2, 4, 8)}
    check("V2 compression back to 2 L needs 80, 53.333, 41.667, 36.579 L atm (1, 2, 4, 8 steps)",
          comp[1] == 80 and comp[2] == Fr(160, 3) and comp[4] == Fr(125, 3) and abs(float(comp[8]) - 36.579365) < 1e-6, comp)

    # V3 route 2: the reversible limit three ways (eq. 5.5; Simpson's rule on the isotherm)
    r1 = rev_by(1)
    r2 = 2.303 * float(NRT) * math.log10(5)
    r3 = simpson(lambda V: float(NRT) / V, 2.0, 10.0)
    check("V3 reversible: nRT ln(V_f/V_i) = 20 ln 5 = 32.189 L atm", abs(r1 - 32.188758) < 1e-6, r1)
    check("V3 NCERT's form 2.303 nRT log(V_f/V_i) agrees to its rounding (|Δ| < 0.01)", abs(r2 - r1) < 0.01, r2)
    check("V3 Simpson's rule on the isotherm p = 20/V from 2 to 10 L agrees (|Δ| < 1e-9)", abs(r3 - r1) < 1e-9, r3)
    # V4 the path decides: expansion work rises, compression work falls, both toward the reversible limit
    seq = [steps_by(N, 1) for N in range(1, 41)]
    seqc = [-steps_by(N, -1) for N in range(1, 41)]
    check("V4 more steps → more work by the gas on expansion, always below the reversible limit (N = 1 … 40)",
          all(seq[i] < seq[i + 1] for i in range(39)) and float(seq[-1]) < r1)
    check("V4 more steps → less work needed for compression, always above the reversible limit (N = 1 … 40)",
          all(seqc[i] > seqc[i + 1] for i in range(39)) and float(seqc[-1]) > r1)
    g_e, g_c = float(steps_by(GRAINS, 1)), float(-steps_by(GRAINS, -1))
    check("V4 grain by grain (800 equal steps): 32.149 by the gas, 32.229 to compress; both within 0.05 of 32.189",
          abs(g_e - 32.148798) < 1e-6 and abs(g_c - 32.228798) < 1e-6 and abs(g_e - r1) < 0.05 and abs(g_c - r1) < 0.05, (g_e, g_c))

    # V5 the round trip: (p_i - p_f)(V_f - V_i)/N exactly
    loss = [(-steps_by(N, -1)) - steps_by(N, 1) for N in range(1, 21)]
    check("V5 an N-step round trip leaves exactly (p_i − p_f)(V_f − V_i)/N = 64/N L atm in the surroundings (N = 1 … 20)",
          all(loss[N - 1] == Fr(64, N) for N in range(1, 21)), loss[:4])
    check("V5 grain by grain the round trip leaves 64/800 = 0.08 L atm; the reversible round trip leaves 0",
          (-steps_by(GRAINS, -1)) - steps_by(GRAINS, 1) == Fr(64, 800) and abs(rev_by(-1) + rev_by(1)) < 1e-12)
    # algebra: both legs visit the same pressure levels p_m = p_f + m d; between levels m-1 and m the compression uses
    # p_m and the expansion p_(m-1), so each volume interval costs d (V_(m-1) - V_m), and the sum telescopes
    d, lv = (P_I - P_F) / 8, [NRT / (P_F + m * (P_I - P_F) / 8) for m in range(9)]
    check("V5 the telescoping argument: Σ d·(V_(m−1) − V_m) = d·(V_f − V_i) = 8 for N = 8",
          sum(d * (lv[m - 1] - lv[m]) for m in range(1, 9)) == Fr(8))

    # V6 NCERT's problems
    check("V6 Problem 5.2: q = −w = p_ex (10 − 2) = 0 × 8 = 0", p52["p_ex"] * (p52["V_f"] - p52["V_i"]) == p52["answer"])
    check("V6 Problem 5.3: q = −w = 1 × (10 − 2) = 8 L atm", p53["p_ex"] * (p52["V_f"] - p52["V_i"]) == p53["answer"])
    n4 = Fr("2.303") * p54["n"] * p54["R"] * p54["T"] * p54["log5"]
    check("V6 Problem 5.4, NCERT's own arithmetic (1 mol, log 5 = 0.6990) reproduces 39.366 to its last digit",
          abs(n4 - p54["answer"]) < Fr("0.0005"), float(n4))
    n52 = float(NRT / (R * T))
    check("V6 F1: the gas of 5.2 is n = pV/RT = 20/(0.08206 × 298) = 0.818 mol, not 1 mol (flagged, owner-approved D1)",
          abs(n52 - 0.817866) < 1e-5 and abs(n52 - 1) > 0.1, n52)
    check("V6 F1: for 1 mol the reversible work would be 39.36 L atm; for this gas it is 32.19 (= 39.36 × 0.818)",
          abs(1 * float(R) * T * math.log(5) - 39.357) < 1e-3 and abs(n52 * float(R) * T * math.log(5) - r1) < 1e-9)

    # V7 signs (eq. 5.2): compression w > 0, expansion w < 0; isothermal ideal gas ΔU = 0, so q = −w
    check("V7 sign audit: every expansion has w < 0 and every compression w > 0; q = −w; ΔU = 0",
          all(-steps_by(N, 1) < 0 and -steps_by(N, -1) > 0 for N in (1, 2, 4, 8, 800)) and -rev_by(1) < 0)
    check("V7 the unit: 1 L atm = 101.325 J, so the reversible work is 3262 J", abs(r1 * float(LATM_J) - 3261.53) < 0.01, r1 * float(LATM_J))

    # V8 the page's ENGINE equals this verifier on every run
    if os.path.exists(PAGE):
        try:
            e = engine_runs()
            want = {"e1": float(exp_[1]), "e8": float(exp_[8]), "eg": g_e, "c1": -float(comp[1]), "c8": -float(comp[8]), "cg": -g_c, "vac": 0.0, "p53": 8.0}
            for tag in ("a", "b"):
                r = e[tag]
                bad = {k: (r[k][0], v) for k, v in want.items() if abs(r[k][0] - v) > 1e-9}
                check("V8 the page's ENGINE, substep %s ms: all eight runs equal the exact work (|Δ| ≤ 1e-9)" % ("1" if tag == "a" else "0.25"), not bad, bad)
                ends = {k: r[k][1] for k in want}
                check("V8 substep %s ms: every run ends at its equilibrium volume (10 L or 2 L; the stop holds 10 L)" % ("1" if tag == "a" else "0.25"),
                      all(abs(ends[k] - (10 if k in ("e1", "e8", "eg", "vac", "p53") else 2)) < 1e-12 for k in ends), ends)
            a = e["a"]
            check("V8 each step settles within 2 s of simulation time; one-step expansion overshoots below the 13 L top",
                  a["e1"][2] < 2 and a["e8"][2] < 2 and a["c1"][2] < 2 and a["c8"][2] < 2 and a["e1"][3] < 12.5 and a["c1"][4] > 1.5,
                  (a["e1"][2:], a["c1"][2:]))
            check("V8 grain by grain is 800 steps of the p_ex path and takes 5 s at 160 grains per second",
                  a["eg"][3] == 800 and abs(a["eg"][2] - 5) < 0.01, a["eg"])
            check("V8 the derived values: w = −work by the gas, q = −w, ΔU = 0, p_gas = p_ex at rest (Problem 5.3 stops at 10 L: 2 vs 1 atm)",
                  a["derive"][0] == -8 and a["derive"][1] == 8 and a["derive"][2] == 0 and a["derive"][3] == 2 and a["derive"][4] == 1, a["derive"])
            check("V8 the page clock at 30, 50 and 60 fps gives the identical model state (fixed 1 ms substeps)",
                  e["f30"] == e["f60"] == e["f50"], [e["f30"], e["f60"], e["f50"]])
            check("V8 domain sweep: every p_ex from 0 to 10 atm from five volumes settles, finite, inside the stops, w = p_ex ΔV",
                  e["sweep"] == [], e["sweep"][:3])
            cl = e["closed"]
            check("V8 the ENGINE's closed forms equal this verifier's (steps, reversible, round-trip loss, n)",
                  all(abs(cl["s"][i][0] - float(steps_by(N, 1))) < 1e-9 and abs(cl["s"][i][1] - float(steps_by(N, -1))) < 1e-9
                      and abs(cl["s"][i][2] - 64 / N) < 1e-12 for i, N in enumerate((1, 2, 4, 8, 800)))
                  and abs(cl["rev"] - r1) < 1e-12 and abs(cl["n"] - n52) < 1e-12 and cl["NRT"] == 20 and cl["PF"] == 2)
        except Exception as ex:  # noqa: BLE001 - any failure here is a failure
            check("V8 the page's ENGINE could be run and compared", False, ex)
    else:
        print("NOTE  V8 skipped: the page is not built yet (%s)" % os.path.relpath(PAGE, ROOT))


# ------------------------------------------------------------------ the fact sheet (V10)
_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
         "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]


def _words(n):
    if n < 20:
        return _ONES[n]
    if n < 100:
        return _TENS[n // 10] + ("" if n % 10 == 0 else "-" + _ONES[n % 10])
    return _ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + _words(n % 100))


def spoken_value(x, decimals):
    scaled = round(abs(x) * 10 ** decimals)
    sign = "minus " if x < 0 and scaled else ""
    whole, frac = divmod(scaled, 10 ** decimals)
    return sign + _words(whole) + ("" if decimals == 0 else " point " + " ".join(_ONES[int(c)] for c in str(frac).rjust(decimals, "0")))


def written_value(x, decimals, plus=False):
    s = ("%." + str(decimals) + "f") % abs(x)
    zero = float(s) == 0
    return ("−" if x < 0 and not zero else ("+" if plus and x > 0 and not zero else "")) + s


UNITS = {"L atm": {"written": "L atm", "spoken": "litre atmospheres"}, "atm": {"written": "atm", "spoken": "atmospheres"},
         "L": {"written": "L", "spoken": "litres"}, "mol": {"written": "mol", "spoken": "moles"}}


def value(fid, x, decimals, unit, meaning, status, source, plus=False):
    u = UNITS[unit]
    return {"id": fid, "value": round(float(x), 6), "decimals": decimals, "unit": u["written"],
            "written": written_value(float(x), decimals, plus) + " " + u["written"],
            "spoken": spoken_value(float(x), decimals) + " " + u["spoken"],
            "short": written_value(float(x), decimals, plus), "meaning": meaning, "status": status, "source": source}


def facts():
    e1, e8, eg = steps_by(1, 1), steps_by(8, 1), steps_by(GRAINS, 1)
    c1, c8, cg = -steps_by(1, -1), -steps_by(8, -1), -steps_by(GRAINS, -1)
    body = {
        "schema": "prayogx-facts-v1",
        "conceptId": "CON-CHE-REVERSIBLE-WORK",
        "ncertConcept": "CPT-CHE-REVERSIBLE-IRREVERSIBLE-PROCESSES",
        "alsoCovers": ["CPT-CHE-PRESSURE-VOLUME-WORK", "CPT-CHE-REVERSIBLE-ISOTHERMAL-WORK (result only)"],
        "section": "NCERT Class 11 Chemistry Part I, Unit 5, 5.2.1 Work",
        "source": SOURCE,
        "generatedBy": "tests/verify_con_che_reversible_work.py --facts",
        "authority": "The verifier is the authority; this sheet is its approved representation for presentation and media. "
                     "It holds no formulas to evaluate: consumers display these values, they never compute new ones.",
        "signConvention": {"w": "w is the work done ON the gas: positive on compression, negative on expansion (eq. 5.2, p. 141)",
                           "workByGas": "the work done BY the gas is −w: the area under the outside-pressure path on the p–V plot",
                           "q": "isothermal ideal gas: ΔU = 0, so q = −w (p. 142)"},
        "dataset": {"gas": "the gas of NCERT Problem 5.2: 2 L at 10 atm and 25 °C, expanded isothermally to 10 L",
                    "weights": "the piston and the air above it press 2 atm; 8 equal weights add 1 atm each",
                    "sand": "800 grains of sand add 0.01 atm each (grain by grain = the reversible approximation)",
                    "flagF1": "NCERT Problem 5.4 calls this gas 1 mol; it is 0.818 mol (pV/RT), so its reversible work is 32.2 L atm, not 39.4"},
        "values": [
            value("gas.n", NRT / (R * T), 3, "mol", "amount of the gas of Problem 5.2: n = pV/RT", "calculated", {"page": 142, "flag": "F1"}),
            value("gas.nRT", NRT, 0, "L atm", "p·V of the gas, constant at 25 °C", "calculated", {"page": 142}),
            value("p.start", P_I, 0, "atm", "the gas at the start (2 L)", "measured", {"page": 142, "problem": "5.2"}),
            value("p.end", P_F, 0, "atm", "the gas at the end (10 L)", "calculated", {"page": 142}),
            value("work.e1", e1, 1, "L atm", "work done by the gas, all 8 weights off at once (p_ex = 2 atm)", "calculated", {"page": 141, "eq": "5.2"}),
            value("work.e8", e8, 1, "L atm", "work done by the gas, one weight at a time", "calculated", {"page": 141, "fig": "5.5 b"}),
            value("work.eg", eg, 1, "L atm", "work done by the gas, grain by grain (800 steps)", "calculated", {"page": 141, "fig": "5.5 c"}),
            value("work.rev", rev_by(1), 1, "L atm", "the reversible limit, nRT ln(V_f/V_i)", "calculated", {"page": 142, "eq": "5.5"}),
            value("w.rev", -rev_by(1), 1, "L atm", "w (on the gas) for the reversible expansion: the key result", "calculated", {"page": 142, "eq": "5.5"}, plus=True),
            value("work.c1", c1, 1, "L atm", "work needed to push the gas back, all 8 weights at once", "calculated", {"page": 141}),
            value("work.c8", c8, 1, "L atm", "work needed to push the gas back, one weight at a time", "calculated", {"page": 141}),
            value("work.cg", cg, 1, "L atm", "work needed to push the gas back, grain by grain", "calculated", {"page": 141}),
            value("loss.c1", c1 - e1, 1, "L atm", "round trip all at once: work left in the surroundings", "calculated", {"rule": "64/N"}),
            value("loss.c8", c8 - e8, 1, "L atm", "round trip one weight at a time: work left in the surroundings", "calculated", {"rule": "64/N"}),
            value("loss.cg", cg - eg, 1, "L atm", "round trip grain by grain: work left in the surroundings", "calculated", {"rule": "64/N"}),
            value("w.p52", 0, 1, "L atm", "Problem 5.2, into a vacuum: w = 0", "calculated", {"page": 142, "problem": "5.2"}, plus=True),
            value("w.p53", -8, 1, "L atm", "Problem 5.3, against 1 atm: w = −8 L atm", "calculated", {"page": 142, "problem": "5.3"}, plus=True),
            value("p54.ncert", PRINTED["p54"]["answer"], 1, "L atm", "NCERT's printed answer to Problem 5.4 (for 1 mol; flag F1)", "measured", {"page": 143, "problem": "5.4"}),
        ],
        "equations": [
            {"id": "eq.5.2", "written": "w = −p_ex ΔV = −p_ex (V_f − V_i)", "source": {"page": 141, "equation": "5.2"}},
            {"id": "eq.steps", "written": "w = −Σ p ΔV", "source": {"page": 141, "fig": "5.5 b"}},
            {"id": "eq.5.3", "written": "w = −∫ p_ex dV", "source": {"page": 141, "equation": "5.3"}},
            {"id": "eq.5.5", "written": "w_rev = −2.303 nRT log(V_f/V_i)", "source": {"page": 142, "equation": "5.5"}},
            {"id": "eq.iso", "written": "isothermal: ΔU = 0, q = −w", "source": {"page": 142}},
        ],
        "statements": [
            {"id": "st.area", "text": "The work done by the gas is the area under the outside-pressure path on the p–V plot.", "source": {"page": 141, "fig": "5.5"}},
            {"id": "st.path", "text": "Same start, same end, different paths: different work and different heat. ΔU is the same (0).", "source": {"page": 142}},
            {"id": "st.reversible", "text": "A reversible process could, at any moment, be reversed by an infinitesimal change; it proceeds infinitely slowly through equilibrium states.", "source": {"page": 141}},
            {"id": "st.irreversible", "text": "All other processes are irreversible.", "source": {"page": 142}},
            {"id": "st.max", "text": "In isothermal expansion the reversible path gives the most work; in compression it needs the least.", "source": {"page": 141, "fig": "5.5"}},
            {"id": "st.roundTrip", "text": "An irreversible round trip leaves work behind in the surroundings; a reversible round trip leaves none.", "source": {"derived": "V5"}},
            {"id": "st.free", "text": "Into a vacuum (p_ex = 0) the gas does no work.", "source": {"page": 142}},
        ],
        "mustNotSay": [
            "Work is a state function.",
            "The gas does the same work whichever way it expands.",
            "A reversible process is one that happens quickly.",
            "The reversible path needs the most work to compress the gas.",
            "In free expansion the gas does work on the vacuum.",
            "Problem 5.4's gas is 1 mol.",
        ],
        "spokenFormsStatus": "draft: every spoken form is reviewed at storyboarding before any voice is generated",
    }
    raw = json.dumps(body, ensure_ascii=False, indent=2, sort_keys=False)
    body["factsSha256"] = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    body["verifierSha256"] = hashlib.sha256(open(os.path.abspath(__file__), "rb").read()).hexdigest()
    return body


def serialise(f):
    return json.dumps(f, ensure_ascii=False, indent=2) + "\n"


def main():
    verify()
    sheet = facts()
    check("V10 the fact sheet is deterministic (generated twice, identical bytes)", serialise(sheet) == serialise(facts()))
    vals = {v["id"]: v for v in sheet["values"]}
    check("V10 every value in the fact sheet carries its source", all(v["source"] for v in sheet["values"]))
    check("V10 the fact sheet's key values: 16.0, 28.6, 32.1, 32.2, −32.2, losses 64.0 / 8.0 / 0.1",
          [vals[k]["short"] for k in ("work.e1", "work.e8", "work.eg", "work.rev", "w.rev", "loss.c1", "loss.c8", "loss.cg")]
          == ["16.0", "28.6", "32.1", "32.2", "−32.2", "64.0", "8.0", "0.1"], [vals[k]["short"] for k in ("work.e1", "work.e8", "work.eg", "work.rev", "w.rev")])
    check("V10 spoken forms read the values", vals["work.rev"]["spoken"] == "thirty-two point two litre atmospheres", vals["work.rev"]["spoken"])
    if "--facts" in sys.argv:
        os.makedirs(os.path.dirname(FACTS), exist_ok=True)
        if FAILS:
            print("\nNOT WRITTEN: %d check(s) failed; the fact sheet is generated only from a passing verifier" % len(FAILS))
        else:
            open(FACTS, "w", encoding="utf-8").write(serialise(sheet))
            print("WROTE %s (factsSha256 %s)" % (os.path.relpath(FACTS, ROOT), sheet["factsSha256"][:12]))
    else:
        cur = open(FACTS, encoding="utf-8").read() if os.path.exists(FACTS) else None
        check("V10 the committed fact sheet is current (regenerate with --facts)", cur == serialise(sheet),
              "" if cur == serialise(sheet) else "missing" if cur is None else "stale")
    print("\n%d passed, %d failed" % (len(PASSES), len(FAILS)))
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
