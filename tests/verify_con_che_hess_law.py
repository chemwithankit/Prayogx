#!/usr/bin/env python3
"""Independent verifier for CON-CHE-HESS-LAW (XP-12, "the enthalpy staircase").

    python3 tests/verify_con_che_hess_law.py            verify; also check the committed fact sheet is current
    python3 tests/verify_con_che_hess_law.py --facts    verify, then (re)write tools/reel-maker/facts/CON-CHE-HESS-LAW.json

Source: NCERT Class 11 Chemistry Part I, Unit 5 Thermodynamics, kech105.pdf, Reprint 2026-27
(SHA-256 e2b5d180...48ec5f8, the hash in data/ncert/catalog.json), read 2026-10-06 from rendered page images:
  p. 151  section 5.4(e): reactions (i) and (ii), (ii) reversed = (iii), the target reaction and why it cannot be
          measured; convention 3 (reversing an equation reverses the sign of Delta_rH)
  p. 152  the result -110.5 kJ mol-1 and eq. 5.16
  p. 149  Table 5.2: Delta_fH of CO(g) -110.53, CO2(g) -393.51, C(graphite) 0 kJ mol-1 (the independent check)
The PDF is never stored in the repository; its values are transcribed below with their pages.

Values are integers: the worked example in tenths of a kJ mol-1 (it prints one decimal), Table 5.2 in hundredths
(it prints two), so no check depends on floating-point error. This file is the authority for the facts; the page's
ENGINE is checked against it (V9), and the fact sheet is generated from it (V10), never typed by hand.
Exit 0: every check passes. Exit 1: any check fails (each failure is printed).
"""
import hashlib
import itertools
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "simulations", "concepts", "chemistry", "con-che-hess-law", "index.html")
FACTS = os.path.join(ROOT, "tools", "reel-maker", "facts", "CON-CHE-HESS-LAW.json")
CATALOG = os.path.join(ROOT, "data", "ncert", "catalog.json")

SOURCE = {
    "book": "NCERT Chemistry Part I, Class XI",
    "unit": "5 Thermodynamics",
    "file": "kech105.pdf",
    "edition": "Reprint 2026-27",
    "sha256": "e2b5d180e6f16f33f6d636a742ed6c23ce6a55636e5edb7f26207a8ed48ec5f8",
    "url": "https://ncert.nic.in/textbook/pdf/kech105.pdf",
    "read": "2026-10-06, from rendered page images (printed page p = PDF page p - 135)",
}

# ---- the states (the same matter: 1 C and 2 O in each) ----
STATES = {
    "start": {"written": "C(graphite) + O₂", "spoken": "carbon graphite plus O two", "atoms": {"C": 1, "O": 2}},
    "co": {"written": "CO + ½O₂", "spoken": "C O plus half O two", "atoms": {"C": 1, "O": 2}},
    "co2": {"written": "CO₂", "spoken": "C O two", "atoms": {"C": 1, "O": 2}},
}
# species composition, for the balance check of each reaction
SPECIES = {"C": {"C": 1}, "O2": {"O": 2}, "CO": {"C": 1, "O": 1}, "CO2": {"C": 1, "O": 2}}

# ---- transcribed from the source, as printed (tenths of a kJ mol-1) ----
PRINTED = {
    "i": {"from": "start", "to": "co2", "dH10": -3935, "page": 151, "label": "(i)",
          "lhs": {"C": 2, "O2": 2}, "rhs": {"CO2": 2},             # every equation x2, so ½ becomes 1
          "written": "C(graphite) + O₂ → CO₂", "spoken": "carbon graphite plus O two gives C O two"},
    "ii": {"from": "co", "to": "co2", "dH10": -2830, "page": 151, "label": "(ii)",
           "lhs": {"CO": 2, "O2": 1}, "rhs": {"CO2": 2},
           "written": "CO + ½O₂ → CO₂", "spoken": "C O plus half O two gives C O two"},
    "iii": {"from": "co2", "to": "co", "dH10": 2830, "page": 151, "label": "(iii)",
            "lhs": {"CO2": 2}, "rhs": {"CO": 2, "O2": 1},
            "written": "CO₂ → CO + ½O₂", "spoken": "C O two gives C O plus half O two"},
    "target": {"from": "start", "to": "co", "dH10": -1105, "page": 152, "label": "target",
               "lhs": {"C": 2, "O2": 1}, "rhs": {"CO": 2},
               "written": "C(graphite) + ½O₂ → CO", "spoken": "carbon graphite plus half O two gives C O"},
}
NOT_MEASURABLE = {"reaction": "target", "page": 151,
                  "reason": "Although CO(g) is the major product, some CO2 gas is always produced in this reaction."}
TABLE_5_2 = {"page": 149, "CO": -11053, "CO2": -39351, "C_graphite": 0}       # hundredths of a kJ mol-1
TOL_HUNDREDTHS = 5      # Table 5.2 vs the worked example: half the example's rounding (0.05 kJ mol-1)

MEASURED = ("i", "ii")  # the reactions a learner can place; (iii) is (ii) reversed

FAILS = []
PASSES = []


def check(name, ok, detail=""):
    (PASSES if ok else FAILS).append(name)
    print(("PASS  " if ok else "FAIL  ") + name + ("" if ok and not detail else "   " + str(detail)))


def kj(t10):
    return t10 / 10.0


def step(rid, reversed_):
    r = PRINTED[rid]
    return (r["to"], r["from"], -r["dH10"]) if reversed_ else (r["from"], r["to"], r["dH10"])


def walk(route):
    """an independent route walk (not the page's code): route = [(id, reversed)], from "start".
    Returns (valid, end, sum_tenths, first_invalid_index)."""
    at, total = "start", 0
    for k, (rid, rev) in enumerate(route):
        a, b, dh = step(rid, rev)
        if a != at:
            return False, at, total, k
        at, total = b, total + dh
    return True, at, total, -1


def levels():
    """route 2: enthalpy levels relative to start = 0, from the two measured reactions only"""
    h = {"start": 0}
    h["co2"] = h["start"] + PRINTED["i"]["dH10"]
    h["co"] = h["co2"] - PRINTED["ii"]["dH10"]          # (ii) goes co -> co2, so co = co2 - dH(ii)
    return h


def balanced(r):
    def count(side):
        out = {}
        for sp, n in side.items():
            for el, m in SPECIES[sp].items():
                out[el] = out.get(el, 0) + n * m
        return out
    return count(r["lhs"]) == count(r["rhs"])


def engine_routes():
    """V9: the page's own ENGINE (between ENGINE-BEGIN / ENGINE-END), run in Node over every enumerated route"""
    src = open(PAGE, encoding="utf-8").read()
    m = re.search(r"/\* ENGINE-BEGIN \*/([\s\S]*?)/\* ENGINE-END \*/", src)
    if not m:
        raise RuntimeError("no ENGINE-BEGIN / ENGINE-END block in the page")
    routes = all_routes()
    js = ("const vm=require('vm');const c={Math};vm.createContext(c);vm.runInContext(process.argv[1]+';this.E=ENGINE;',c);"
          "const R=JSON.parse(process.argv[2]);"
          "console.log(JSON.stringify({hess:c.E.hessT(),routes:R.map(r=>{const o=c.E.run({route:r.map(x=>({id:x[0],rev:x[1]}))});"
          "return [o.valid,o.end,o.sumT,o.bad,o.complete];})}));")
    out = subprocess.run(["node", "-e", js, m.group(1), json.dumps(routes)], capture_output=True, text=True, check=True)
    return routes, json.loads(out.stdout)


def all_routes(max_len=3):
    moves = [(rid, rev) for rid in MEASURED for rev in (False, True)]
    out = []
    for n in range(1, max_len + 1):
        out.extend([list(map(list, p)) for p in itertools.product(moves, repeat=n)])
    return out


def verify():
    # V1 source values, as printed
    check("V1 source: the PDF hash recorded here is the one in data/ncert/catalog.json",
          SOURCE["sha256"] in open(CATALOG, encoding="utf-8").read(), SOURCE["sha256"][:12])
    check("V1 source: (i) C(graphite) + O₂ → CO₂ is −393.5 kJ mol⁻¹ (p. 151)", PRINTED["i"]["dH10"] == -3935)
    check("V1 source: (ii) CO + ½O₂ → CO₂ is −283.0 kJ mol⁻¹ (p. 151)", PRINTED["ii"]["dH10"] == -2830)
    check("V1 source: (iii) CO₂ → CO + ½O₂ is +283.0 kJ mol⁻¹ (p. 151)", PRINTED["iii"]["dH10"] == 2830)
    check("V1 source: the result for C(graphite) + ½O₂ → CO is −110.5 kJ mol⁻¹ (p. 152)", PRINTED["target"]["dH10"] == -1105)
    check("V1 source: Table 5.2 (p. 149) CO −110.53, CO₂ −393.51, C(graphite) 0 kJ mol⁻¹",
          (TABLE_5_2["CO"], TABLE_5_2["CO2"], TABLE_5_2["C_graphite"]) == (-11053, -39351, 0))

    # V2 atom balance
    check("V2 every state holds the same matter (1 C, 2 O)", all(s["atoms"] == {"C": 1, "O": 2} for s in STATES.values()))
    check("V2 every reaction is balanced", all(balanced(r) for r in PRINTED.values()),
          [k for k, r in PRINTED.items() if not balanced(r)])
    check("V2 each reaction joins the states it names (its two sides are those states' species)",
          PRINTED["i"]["from"] == "start" and PRINTED["i"]["to"] == "co2" and PRINTED["ii"]["from"] == "co" and PRINTED["ii"]["to"] == "co2")

    # V3 reversal (convention 3, p. 151)
    rev_ok = all(step(r, True)[2] == -step(r, False)[2] and step(r, True)[:2] == step(r, False)[1::-1] for r in MEASURED)
    check("V3 reversing a reaction swaps its ends and reverses the sign of ΔᵣH (p. 151)", rev_ok)
    check("V3 (iii) is exactly (ii) reversed", step("ii", True) == (PRINTED["iii"]["from"], PRINTED["iii"]["to"], PRINTED["iii"]["dH10"]))

    # V4 route 1: NCERT's own route (i) + (iii)
    v4 = PRINTED["i"]["dH10"] + PRINTED["iii"]["dH10"]
    check("V4 route 1, NCERT's: (i) + (iii) = −393.5 + 283.0 = −110.5 kJ mol⁻¹", v4 == PRINTED["target"]["dH10"], kj(v4))

    # V5 route 2: enthalpy levels (independent algebra)
    h = levels()
    check("V5 route 2, levels: H(CO) = H(CO₂) − ΔᵣH(ii) = −110.5 kJ mol⁻¹ (start = 0)", h["co"] == PRINTED["target"]["dH10"], kj(h["co"]))

    # V6 path independence over every route the learner can build (up to 3 steps)
    routes = all_routes()
    to_co = [r for r in routes if walk(r)[0] and walk(r)[1] == "co"]
    to_co2 = [r for r in routes if walk(r)[0] and walk(r)[1] == "co2"]
    check("V6 every valid route from the start to CO sums to −110.5 kJ mol⁻¹ (%d routes)" % len(to_co),
          len(to_co) > 0 and all(walk(r)[2] == PRINTED["target"]["dH10"] for r in to_co), to_co)
    check("V6 every valid route from the start to CO₂ sums to −393.5 kJ mol⁻¹ (%d routes)" % len(to_co2),
          len(to_co2) > 0 and all(walk(r)[2] == PRINTED["i"]["dH10"] for r in to_co2))
    bad = [r for r in routes if not walk(r)[0]]
    check("V6 every invalid route is refused at the first step that does not start where the route is (%d routes)" % len(bad),
          all(step(r[walk(r)[3]][0], r[walk(r)[3]][1])[0] != walk(r)[1] for r in bad))
    check("V6 the shortest route to CO is (i) then (ii) reversed, exactly NCERT's",
          min(to_co, key=len) == [["i", False], ["ii", True]])

    # V7 a closed cycle sums to zero
    cyc = PRINTED["i"]["dH10"] + PRINTED["iii"]["dH10"] - PRINTED["target"]["dH10"]
    check("V7 start → CO₂ → CO → start sums to 0", cyc == 0, kj(cyc))
    check("V7 two routes start → CO₂ agree: direct (i) = target + (ii)", PRINTED["i"]["dH10"] == PRINTED["target"]["dH10"] + PRINTED["ii"]["dH10"])

    # V11 the cancellation the explainer shows: (i) + (iii), cancel what appears on both sides -> the target
    lhs, rhs = {}, {}
    for r in ("i", "iii"):
        for sp, n in PRINTED[r]["lhs"].items():
            lhs[sp] = lhs.get(sp, 0) + n
        for sp, n in PRINTED[r]["rhs"].items():
            rhs[sp] = rhs.get(sp, 0) + n
    for sp in list(lhs):
        c = min(lhs[sp], rhs.get(sp, 0))
        lhs[sp] -= c
        rhs[sp] = rhs.get(sp, 0) - c
    lhs = {k: v for k, v in lhs.items() if v}
    rhs = {k: v for k, v in rhs.items() if v}
    check("V11 adding (i) and (iii): CO₂ cancels and O₂ nets to ½, leaving exactly C(graphite) + ½O₂ → CO",
          lhs == PRINTED["target"]["lhs"] and rhs == PRINTED["target"]["rhs"], (lhs, rhs))
    check("V11 the check question: (i) reversed is +393.5 kJ mol⁻¹ (convention 3)", step("i", True)[2] == 3935)

    # V8 the independent Table 5.2 check (formation enthalpies: target = Delta_fH(CO) - Delta_fH(C) - ½·0)
    f_co = TABLE_5_2["CO"] - TABLE_5_2["C_graphite"]
    d1 = PRINTED["target"]["dH10"] * 10 - f_co
    d2 = PRINTED["ii"]["dH10"] * 10 - (TABLE_5_2["CO2"] - TABLE_5_2["CO"])
    d3 = PRINTED["i"]["dH10"] * 10 - (TABLE_5_2["CO2"] - TABLE_5_2["C_graphite"])
    check("V8 Table 5.2 agrees with the result: −110.5 vs −110.53, |%.2f| ≤ 0.05" % (d1 / 100), abs(d1) <= TOL_HUNDREDTHS)
    check("V8 Table 5.2 agrees with (ii): −283.0 vs −393.51 − (−110.53) = −282.98, |%.2f| ≤ 0.05" % (d2 / 100), abs(d2) <= TOL_HUNDREDTHS)
    check("V8 Table 5.2 agrees with (i): −393.5 vs −393.51, |%.2f| ≤ 0.05" % (d3 / 100), abs(d3) <= TOL_HUNDREDTHS)

    # V9 the page's ENGINE equals this verifier on every route
    if os.path.exists(PAGE):
        try:
            routes9, res = engine_routes()
            ok = res["hess"] == PRINTED["target"]["dH10"]
            mism = []
            for r, e in zip(routes9, res["routes"]):
                v, end, tot, k = walk(r)
                if [v, end, tot, k] != [e[0], e[1], e[2], e[3]] or e[4] != (v and end == "co"):
                    mism.append((r, e, (v, end, tot, k)))
            check("V9 the page's ENGINE gives the same validity, end, sum and first invalid step on all %d routes" % len(routes9), ok and not mism, mism[:3] or res["hess"])
        except Exception as e:  # noqa: BLE001 - any failure here is a failure
            check("V9 the page's ENGINE could be run and compared", False, e)
    else:
        print("NOTE  V9 skipped: the page is not built yet (%s)" % os.path.relpath(PAGE, ROOT))


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


def spoken_value(scaled, decimals):
    """-3935, 1 -> 'minus three hundred ninety-three point five'; digits after the point read one by one"""
    sign = "minus " if scaled < 0 else ("plus " if scaled > 0 else "")
    a = abs(scaled)
    whole, frac = divmod(a, 10 ** decimals)
    frac_s = str(frac).rjust(decimals, "0")
    return sign + _words(whole) + " point " + " ".join(_ONES[int(c)] for c in frac_s)


def written_value(scaled, decimals, plus=False):
    s = ("%." + str(decimals) + "f") % (abs(scaled) / 10 ** decimals)
    return ("−" if scaled < 0 else ("+" if plus and scaled > 0 else "")) + s


UNIT = {"written": "kJ mol⁻¹", "spoken": "kilojoules per mole"}


def value(fid, scaled, decimals, meaning, status, source, plus=True):
    return {"id": fid, "value": scaled / 10 ** decimals, "decimals": decimals, "unit": UNIT["written"],
            "written": written_value(scaled, decimals, plus) + " " + UNIT["written"],
            "spoken": spoken_value(scaled, decimals) + " " + UNIT["spoken"],
            "short": written_value(scaled, decimals, plus), "spokenShort": spoken_value(scaled, decimals),
            "meaning": meaning, "status": status, "source": source}


def facts():
    t = PRINTED
    d1 = t["target"]["dH10"] * 10 - (TABLE_5_2["CO"] - TABLE_5_2["C_graphite"])
    body = {
        "schema": "prayogx-facts-v1",
        "conceptId": "CON-CHE-HESS-LAW",
        "ncertConcept": "CPT-CHE-HESS-LAW",
        "section": "NCERT Class 11 Chemistry Part I, Unit 5, 5.4(e) Hess's Law of Constant Heat Summation",
        "source": SOURCE,
        "generatedBy": "tests/verify_con_che_hess_law.py --facts",
        "authority": "The verifier is the authority; this sheet is its approved representation for presentation and media. "
                     "It holds no formulas to evaluate: consumers display these values, they never compute new ones.",
        "signConvention": {"negative": "enthalpy decreases: heat is given out (exothermic)",
                           "positive": "enthalpy increases: heat is taken in (endothermic)",
                           "basis": "per mole of the reaction as written, standard conditions, the same temperature (5.4(e), p. 151)",
                           "reversal": "Reversing a chemical equation reverses the sign of ΔᵣH (convention 3, p. 151)."},
        "unit": UNIT,
        "states": {k: {"written": v["written"], "spoken": v["spoken"], "atoms": v["atoms"]} for k, v in STATES.items()},
        "reactions": {k: {"label": r["label"], "from": r["from"], "to": r["to"], "written": r["written"], "spoken": r["spoken"],
                          "dH": value("rxn.%s.dH" % k, r["dH10"], 1, "ΔᵣH of %s" % r["written"],
                                      "calculated" if k in ("iii", "target") else "measured",
                                      {"page": r["page"], "section": "5.4(e)" if r["page"] == 151 else "5.4(e), eq. 5.16"})}
                      for k, r in t.items()},
        "notMeasurable": {"reaction": "target", "written": t["target"]["written"], "page": NOT_MEASURABLE["page"],
                          "reason": "We cannot measure C(graphite) + ½O₂ → CO directly, because some CO₂ always forms."},
        "values": [
            value("level.start", 0, 1, "relative enthalpy of the start state, the reference (start = 0)", "idealized",
                  {"note": "relative scale; Δ_fH of an element in its reference state is 0 (5.4(c), p. 150)"}, plus=False),
            value("level.co2", levels()["co2"], 1, "relative enthalpy of CO₂ (start + (i))", "calculated", {"page": 151}, plus=False),
            value("level.co", levels()["co"], 1, "relative enthalpy of CO + ½O₂ (found by Hess's law)", "calculated", {"page": 152}, plus=False),
            value("target.dH", t["target"]["dH10"], 1, "ΔᵣH of C(graphite) + ½O₂ → CO found by Hess's law: the key result", "calculated", {"page": 152}),
            value("direct.dH", t["i"]["dH10"], 1, "start → CO₂ directly, reaction (i)", "measured", {"page": 151}),
            value("viaCO.dH", t["target"]["dH10"] + t["ii"]["dH10"], 1, "start → CO → CO₂: target + (ii)", "calculated", {"page": 152}),
            value("paths.diff", 0, 1, "via CO minus direct: zero, the routes agree", "calculated", {"page": 152}),
            value("table.fH.co", TABLE_5_2["CO"], 2, "Δ_fH⊖ of CO(g), NCERT Table 5.2", "measured", {"page": TABLE_5_2["page"], "table": "5.2"}, plus=False),
            value("table.fH.co2", TABLE_5_2["CO2"], 2, "Δ_fH⊖ of CO₂(g), NCERT Table 5.2", "measured", {"page": TABLE_5_2["page"], "table": "5.2"}, plus=False),
            value("check.irev.dH", -t["i"]["dH10"], 1, "ΔᵣH of CO₂ → C(graphite) + O₂: (i) reversed (the explainer's check question)", "calculated",
                  {"page": 151, "rule": "convention 3: reversing an equation reverses the sign of ΔᵣH"}),
            value("table.diff", d1, 2, "found ΔᵣH minus Table 5.2's Δ_fH(CO); agreement when |diff| ≤ 0.05 (the example rounds to 0.1)",
                  "calculated", {"page": 149}),
        ],
        "equations": [
            {"id": "eq.hess.general", "written": "ΔᵣH = ΔᵣH₁ + ΔᵣH₂ + ΔᵣH₃ …", "spoken": "delta r H equals delta r H one plus delta r H two plus delta r H three and so on",
             "source": {"page": 152, "equation": "5.16"}},
            {"id": "eq.hess.route", "written": "ΔᵣH = (i) + (iii)", "spoken": "delta r H equals reaction one plus reaction three", "source": {"page": 152}},
            {"id": "eq.hess.sum", "written": "(−393.5) + (+283.0) = −110.5 kJ mol⁻¹",
             "spoken": "minus three hundred ninety-three point five plus two hundred eighty-three point zero equals minus one hundred ten point five kilojoules per mole",
             "source": {"page": 152}},
            {"id": "eq.cancel", "written": "C(graphite) + O₂ + CO₂ → CO₂ + CO + ½O₂", "result": "C(graphite) + ½O₂ → CO",
             "cancels": ["CO₂"], "oxygenTally": "O₂ − ½O₂ = ½O₂",
             "spoken": "C O two appears on both sides, so it cancels; one O two on the left and half an O two on the right leave half an O two",
             "source": {"page": 152, "note": "adding (i) and (iii)"}},
            {"id": "eq.check", "written": "C(graphite) + O₂ → CO₂ has ΔᵣH = −393.5 kJ mol⁻¹. What is ΔᵣH for CO₂ → C(graphite) + O₂?",
             "answer": "check.irev.dH", "source": {"page": 151, "rule": "convention 3"}},
            {"id": "eq.paths", "written": "−393.5 = (−110.5) + (−283.0)", "spoken": "minus three hundred ninety-three point five equals minus one hundred ten point five plus minus two hundred eighty-three point zero",
             "source": {"page": 152}},
        ],
        "statements": [
            {"id": "st.stateFunction", "text": "Enthalpy is a state function: its change depends only on the start and the end, not on the path.", "source": {"page": 151}},
            {"id": "st.sameStartEnd", "text": "Same start, same end → same ΔH.", "source": {"page": 151}},
            {"id": "st.reverse", "text": "Reverse a reaction → reverse the sign of ΔH.", "source": {"page": 151}},
            {"id": "st.notMeasurable", "text": "We cannot measure C(graphite) + ½O₂ → CO directly, because some CO₂ always forms.", "source": {"page": 151}},
            {"id": "st.hessLaw", "text": "If a reaction takes place in several steps, its standard reaction enthalpy is the sum of the standard enthalpies of the steps.", "source": {"page": 151}},
            {"id": "st.takeaway", "text": "Enthalpy depends only on the start and the end.", "source": {"page": 151}},
        ],
        "mustNotSay": [
            "ΔH depends on the route taken.",
            "Hess's law means the reaction really happens in steps.",
            "Reversing a reaction does not change ΔH.",
            "The ΔH of forming CO was measured directly.",
            "CO₂ is a step in burning carbon to CO.",
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
    check("V10 every value in the fact sheet carries its source", all(v["source"] for v in sheet["values"])
          and all(r["dH"]["source"] for r in sheet["reactions"].values()))
    check("V10 the fact sheet's values equal the verifier's (target, H(CO), routes, table)",
          vals["target.dH"]["value"] == kj(PRINTED["target"]["dH10"]) and vals["level.co"]["value"] == kj(levels()["co"])
          and vals["viaCO.dH"]["value"] == vals["direct.dH"]["value"] and vals["table.fH.co"]["value"] == -110.53)
    check("V10 spoken forms read the printed values", sheet["reactions"]["i"]["dH"]["spoken"] == "minus three hundred ninety-three point five kilojoules per mole"
          and vals["table.diff"]["written"] == "+0.03 kJ mol⁻¹", (sheet["reactions"]["i"]["dH"]["spoken"], vals["table.diff"]["written"]))
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
