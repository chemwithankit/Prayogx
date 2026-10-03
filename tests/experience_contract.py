#!/usr/bin/env python3
"""The experience contract (tools/experience_schema.py, schema 2.0.0).

Experiences reference their concept by conceptId; concepts live once, in the concept inventory
(tools/concept_schema.py, tested by tests/concept_contract.py). Checks the synthetic example
(tests/fixtures/experience_contract_example.json, test data, not an NCERT mapping) against its
synthetic inventory (tests/fixtures/concept_contract_example.json) and the real library
(data/manifest.json), and broken copies of it. Read-only: nothing in the repository is written.
"""
import copy
import json
import math
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
import concept_schema as C  # noqa: E402
import experience_schema as X  # noqa: E402

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or not detail else "  -> " + str(detail)))


DOC = json.load(open(os.path.join(HERE, "fixtures", "experience_contract_example.json"), encoding="utf-8"))
INV = json.load(open(os.path.join(HERE, "fixtures", "concept_contract_example.json"), encoding="utf-8"))
LIB = dict((s["id"], s) for s in json.load(open(os.path.join(ROOT, "data", "manifest.json"), encoding="utf-8"))["simulations"])
EXP = dict((e["id"], e) for e in DOC["experiences"])
BOYLE, EQ, ENT, NEWTON = "CPT-CHE-BOYLE-LAW", "CPT-CHE-CHEMICAL-EQUILIBRIUM", "CPT-CHE-ENTROPY", "CPT-PHY-NEWTON-SECOND-LAW"
SYR = "EXP-CHE-BOYLE-LAW-SYRINGE"
PRACTICE = "EXP-CHE-CHEMICAL-EQUILIBRIUM-OPPOSING-REACTIONS"
BOYLE_LO = "LO-CHE-BOYLE-LAW-PRESSURE-VOLUME"


def broken(mutate, inventory=INV, library=LIB):
    d = copy.deepcopy(DOC)
    mutate(d)
    return X.problems(d, inventory, library)


def refused(name, needle, problems):
    chk(name, any(needle in m for m in problems), problems)


def exp(d, eid):
    return next(e for e in d["experiences"] if e["id"] == eid)


def one(e, inventory=INV, library=LIB):
    """Problems of a document holding only experience `e` (a Boyle's law experience by default)."""
    base = {"title": "An experience", "conceptId": BOYLE, "objectives": [BOYLE_LO]}
    base.update(e)
    return X.problems({"schemaVersion": "2.0.0", "experiences": [base]}, inventory, library)


# ---------------------------------------------------------------- vocabulary
chk("experience types: the ten learning modes, nothing technical",
    X.EXPERIENCE_TYPES == ("simulation", "animation", "virtual-lab", "graph", "data-explorer", "interactive-diagram",
                           "molecular", "derivation", "worked-example", "practice"))
chk("experience status: planned -> blueprint -> building -> review -> published, and retired",
    X.EXPERIENCE_STATUS == ("planned", "blueprint", "building", "review", "published", "retired"))
chk("an experience has exactly these fields: id, conceptId, type, title, objectives, status, libraryId",
    X.EXPERIENCE_FIELDS == ("id", "conceptId", "type", "title", "objectives", "status", "libraryId"))

# ---------------------------------------------------------------- the example is valid
chk("the inventory the example refers to is itself valid", C.problems(INV) == [], C.problems(INV))
p = X.problems(DOC, INV, LIB)
chk("the example document is valid against its inventory and the real library", p == [], p)
chk("...and it is clearly example data", "TEST/EXAMPLE DATA ONLY" in DOC["note"] and DOC["schemaVersion"] == "2.0.0")

# ---------------------------------------------------------------- experience -> concept, by reference
e = EXP[SYR]
chk("experience: stable id, conceptId, type, title, objectives, status, libraryId",
    e == {"id": SYR, "conceptId": BOYLE, "type": "simulation", "title": "The sealed syringe",
          "objectives": [BOYLE_LO], "status": "planned", "libraryId": None})
chk("the concept is referenced, never repeated: no concept fields anywhere in the experience document",
    "concepts" not in DOC and not any(k in x for x in DOC["experiences"] for k in ("locations", "learningObjectives", "subject", "description")))
refused("an experience document that declares concepts is refused (they live in the inventory)", "defined once, in the concept inventory",
        broken(lambda d: d.update(concepts=copy.deepcopy(INV["concepts"]))))
for k, v in (("locations", []), ("learningObjectives", []), ("concept", {"id": BOYLE}), ("subject", "Chemistry")):
    refused("an embedded %r is refused, pointing to the inventory" % k, "live in the concept inventory", one({k: v, "id": SYR, "type": "simulation", "status": "planned"}))
refused("an experience needs a conceptId", "needs a conceptId", broken(lambda d: exp(d, SYR).pop("conceptId")))
for bad in ("CON-CHE-BOYLE-LAW", "CPT-CHE-PAGE-142", "CPT-CHE-Q12", "boyle"):
    refused("conceptId %r is refused by the inventory's id rules" % bad, "concept id", broken(lambda d, b=bad: exp(d, SYR).update(conceptId=b)))
refused("a conceptId that is not in the inventory is refused", "is not in the inventory", broken(lambda d: exp(d, SYR).update(conceptId="CPT-CHE-IDEAL-GAS")))
chk("...without an inventory, references are checked for form only", broken(lambda d: exp(d, SYR).update(conceptId="CPT-CHE-IDEAL-GAS"), inventory=None) == [])
refused("an experience for another subject than its concept is refused", "subject code differs",
        broken(lambda d: exp(d, SYR).update(conceptId=NEWTON)))

# ---------------------------------------------------------------- experience -> objectives of that concept
chk("objectives are the concept's own (checked against the inventory)",
    all(o in [lo["id"] for lo in next(c for c in INV["concepts"] if c["id"] == x["conceptId"])["learningObjectives"]]
        for x in DOC["experiences"] for o in x["objectives"]))
refused("an experience must serve an objective", "at least one learning objective", broken(lambda d: exp(d, SYR).update(objectives=[])))
refused("...of its own concept, not another concept's", "is not one of CPT-CHE-BOYLE-LAW's",
        broken(lambda d: exp(d, SYR).update(objectives=["LO-CHE-CHEMICAL-EQUILIBRIUM-DYNAMIC"])))
refused("...and not one the inventory does not have", "is not one of", broken(lambda d: exp(d, SYR).update(objectives=["LO-CHE-BOYLE-LAW-TEMPERATURE"])))
refused("...nor the same objective twice", "lists an objective twice", broken(lambda d: exp(d, SYR).update(objectives=[BOYLE_LO, BOYLE_LO])))
for bad in ("LO-1", "LO-CHE-BOYLE-LAW-001", "Boyle pressure"):
    refused("objective %r is refused by the inventory's id rules" % bad, "objective id", broken(lambda d, b=bad: exp(d, SYR).update(objectives=[b])))
refused("an objective for another subject than the concept is refused", "another subject",
        broken(lambda d: exp(d, SYR).update(objectives=["LO-PHY-BOYLE-LAW-PRESSURE-VOLUME"])))
refused("a concept with no objectives (entropy) cannot have an experience yet", "is not one of CPT-CHE-ENTROPY's",
        one({"id": "EXP-CHE-ENTROPY-MIXING", "conceptId": ENT, "objectives": ["LO-CHE-ENTROPY-MIXING"], "type": "animation", "status": "planned"}))

# ---------------------------------------------------------------- experience fields
for t in ("canvas-html-js", "mp4", "SIMULATION", None):
    refused("type %r is refused: a type is a learning mode from the list" % t, "is not one of", broken(lambda d, t=t: exp(d, SYR).update(type=t)))
for st in ("ready", "qa", "approved", None):
    refused("status %r is refused" % st, "status", broken(lambda d, st=st: exp(d, SYR).update(status=st)))
refused("an experience needs a title", "needs a title", broken(lambda d: exp(d, SYR).update(title=" ")))
# an experience id is an artifact identifier: its own rule (form and length), no concept semantics
for good in ("EXP-CHE-P4-SOMETHING", "EXP-CHE-WORKED-EXAMPLE-2", "EXP-CHE-Q12", "EXP-CHE-PAGE-41", "EXP-PHY-PAGE-41",
             "EXP-CHE-LE-CHATELIER", "EXP-CHE-P142", "EXP-CHE-001", "EXP-CHE-3F2A9C1B-77D0"):
    # in the example it would belong to a Chemistry concept, so only CHE ids are also tried there
    chk("experience id %s is valid (nothing is inferred from its words)" % good,
        X.exp_id_problems("x", good) == [] and (not good.startswith("EXP-CHE-") or broken(lambda d, g=good: exp(d, SYR).update(id=g)) == []))
chk("EXP-PHY-PAGE-41 is a valid id, but not for a Chemistry concept (subjects must agree)",
    any("subject code differs" in m for m in broken(lambda d: exp(d, SYR).update(id="EXP-PHY-PAGE-41"))))
for bad, why in (("EXP-1", "no subject or slug"), ("exp-che-x", "lower case"), ("EX-CHE-SYRINGE", "wrong prefix"),
                 ("XEXP-CHE-SYRINGE", "malformed prefix"), ("EXP-BIO-SYRINGE", "unknown subject"), ("EXP-che-SYRINGE", "lower-case subject"),
                 ("EXP-CHE-", "empty slug"), ("EXP-CHE--SYRINGE", "empty slug word"), ("EXP-CHE-SYRINGE-", "trailing hyphen"),
                 ("EXP-CHE-SEALED SYRINGE", "a space"), ("EXP-CHE-" + "-".join(["W"] * 11), "too many slug words"),
                 ("EXP-CHE-" + "S" * 65, "over 72 characters"), (None, "missing"), (42, "not text")):
    refused("experience id %r is refused (%s)" % (bad, why), "experience id", broken(lambda d, b=bad: exp(d, SYR).update(id=b)))
chk("an id of exactly 72 characters is accepted, 73 is not",
    X.exp_id_problems("x", "EXP-CHE-" + "S" * 64) == [] and X.exp_id_problems("x", "EXP-CHE-" + "S" * 65) != [])
chk("the separation: CPT-CHE-Q12 invalid, EXP-CHE-Q12 valid; CPT-CHE-P142 invalid, EXP-CHE-P142 valid",
    C.id_problems("x", "CPT-CHE-Q12", C.CONCEPT_ID_RE, "concept") != [] and X.exp_id_problems("x", "EXP-CHE-Q12") == []
    and C.id_problems("x", "CPT-CHE-P142", C.CONCEPT_ID_RE, "concept") != [] and X.exp_id_problems("x", "EXP-CHE-P142") == [])
chk("...and LO-CHE-BOYLE-LAW-001 stays invalid while EXP-CHE-BOYLE-LAW-001 is valid (objectives keep the concept rules)",
    C.id_problems("x", "LO-CHE-BOYLE-LAW-001", C.LO_ID_RE, "objective") != [] and X.exp_id_problems("x", "EXP-CHE-BOYLE-LAW-001") == [])
refused("an experience whose conceptId is positional (CPT-CHE-Q12) is still refused: references keep the concept rules",
        "must name the idea", broken(lambda d: exp(d, SYR).update(conceptId="CPT-CHE-Q12")))
refused("...and so is a positional objective reference (LO-CHE-BOYLE-LAW-001)", "must name the idea",
        broken(lambda d: exp(d, SYR).update(objectives=["LO-CHE-BOYLE-LAW-001"])))
refused("an experience id cannot be used twice", "already used", broken(lambda d: d["experiences"].append(dict(exp(d, SYR)))))
for k, v in (("media", {"eligible": True}), ("url", "https://example.com"), ("canvas", "800x600"), ("prompt", "...")):
    refused("no %r field: build details and media are separate layers" % k, "is not an experience field", one({k: v, "id": SYR, "type": "simulation", "status": "planned"}))

# ---------------------------------------------------------------- libraryId is optional (native experiences)
native = lambda eid, t, st: {"id": eid, "type": t, "status": st, "libraryId": None}
chk("1. published + libraryId null -> valid (a native experience)", one(native("EXP-CHE-BOYLE-LAW-NATIVE-SIM", "simulation", "published")) == [])
chk("2. building + libraryId null -> valid", one(native("EXP-CHE-BOYLE-LAW-NATIVE-LAB", "virtual-lab", "building")) == [])
chk("3. review + libraryId null -> valid", one(native("EXP-CHE-BOYLE-LAW-NATIVE-GRAPH", "graph", "review")) == [])
chk("4. planned + libraryId null -> valid", one(native("EXP-CHE-BOYLE-LAW-NATIVE-ANIMATION", "animation", "planned")) == [])
chk("...every status is valid for a native experience, and so is leaving libraryId out",
    all(one(native("EXP-CHE-BOYLE-LAW-NATIVE-SIM", "simulation", st)) == [] for st in X.EXPERIENCE_STATUS)
    and one({"id": "EXP-CHE-BOYLE-LAW-NATIVE-SIM", "type": "simulation", "status": "published"}) == [])
chk("5. published + a valid, published libraryId -> valid (reusing a JEE page)",
    one({"id": "EXP-CHE-BOYLE-LAW-JEE-SIM", "type": "simulation", "status": "published", "libraryId": "ADV-2026-P1-CHE-Q12"}) == []
    and LIB["ADV-2026-P1-CHE-Q12"].get("status", "human_verified") == "human_verified")
p6 = one({"id": "EXP-CHE-BOYLE-LAW-JEE-SIM", "type": "simulation", "status": "published", "libraryId": "simulations/boyle/index.html"})
chk("6. an invalid libraryId -> refused", any("not a library id" in m for m in p6), p6)
p7 = one({"id": "EXP-CHE-BOYLE-LAW-PRACTICE", "type": "practice", "status": "planned", "libraryId": "CON-CHE-BOYLE-LAW"})
chk("7. practice + a non-ADV libraryId -> refused", any("question page" in m for m in p7), p7)
chk("8. practice + an ADV libraryId -> valid",
    one({"id": "EXP-CHE-BOYLE-LAW-PRACTICE", "type": "practice", "status": "published", "libraryId": "ADV-2026-P1-CHE-Q09"}) == [])
for bad in ("draft", "deprecated"):
    lib2 = copy.deepcopy(LIB)
    lib2["ADV-2026-P1-CHE-Q12"] = dict(lib2["ADV-2026-P1-CHE-Q12"], status=bad)
    p9 = one({"id": "EXP-CHE-BOYLE-LAW-JEE-SIM", "type": "simulation", "status": "published", "libraryId": "ADV-2026-P1-CHE-Q12"}, library=lib2)
    chk("9. a published experience linked to a %s page -> refused" % bad, any("is %s" % bad in m for m in p9), p9)
    chk("...while one still in production may link to a %s page" % bad,
        one({"id": "EXP-CHE-BOYLE-LAW-JEE-SIM", "type": "simulation", "status": "building", "libraryId": "ADV-2026-P1-CHE-Q12"}, library=lib2) == [])
n10 = native("EXP-CHE-BOYLE-LAW-NATIVE-SIM", "simulation", "published")
chk("10. a native experience stays valid with the real library, without one, and with an empty one",
    one(n10) == [] and one(n10, library=None) == [] and one(n10, library={}) == [])
refused("a libraryId names an EXISTING page, even while planned (null until the page exists)", "not in the library",
        broken(lambda d: exp(d, SYR).update(libraryId="CON-CHE-BOYLE-LAW")))
chk("the example's linked practice experience is published, behind a published JEE page",
    EXP[PRACTICE]["status"] == "published" and LIB[EXP[PRACTICE]["libraryId"]].get("status", "human_verified") not in ("draft", "deprecated"))

# ---------------------------------------------------------------- zero / one / many per concept
per = dict((c["id"], X.experiences_for(DOC, c["id"])) for c in INV["concepts"])
chk("one concept, one experience (Boyle's law: a simulation)", [x["type"] for x in per[BOYLE]] == ["simulation"])
chk("one concept, several of different types (equilibrium: animation, data explorer, virtual lab, practice)",
    sorted(x["type"] for x in per[EQ]) == ["animation", "data-explorer", "practice", "virtual-lab"])
chk("concepts with no experience yet (Newton, entropy), and still valid", per[NEWTON] == [] and per[ENT] == [])
chk("coverage and count are different measures (2 of 4 concepts, 5 experiences)",
    sum(1 for v in per.values() if v) == 2 and sum(len(v) for v in per.values()) == 5)
chk("one experience may serve several objectives", len(EXP["EXP-CHE-CHEMICAL-EQUILIBRIUM-LE-CHATELIER"]["objectives"]) == 2)
chk("experiences_for returns copies", (lambda r: (r[0].update(status="retired"), EXP[SYR]["status"])[1])(X.experiences_for(DOC, BOYLE)) == "planned")

# ---------------------------------------------------------------- serialisation and stability
chk("the document round-trips through JSON unchanged", json.loads(json.dumps(DOC)) == DOC)
for label, val in (("bytes", b"%PDF-1.4"), ("a function", len), ("NaN", math.nan), ("a set", {1})):
    refused("%s inside the document is refused" % label, "plain JSON", broken(lambda d, v=val: exp(d, SYR).update(title=v)))
moved = copy.deepcopy(DOC); moved["experiences"].reverse()
inv2 = copy.deepcopy(INV); inv2["concepts"].reverse()
for c in inv2["concepts"]:
    for l in c["locations"]:
        if "printedPages" in l:
            l["printedPages"] = [l["printedPages"][0] + 7, l["printedPages"][1] + 7]     # a later edition shifts the pages
chk("reordering experiences and concepts, and shifting every page, leaves every reference valid",
    X.problems(moved, inv2, LIB) == [] and sorted(x["id"] for x in moved["experiences"]) == sorted(EXP))
refused("a document with the old schema (1.x) is refused", "schemaVersion must be 2", broken(lambda d: d.update(schemaVersion="1.0.0")))

# ---------------------------------------------------------------- source-agnostic, small, separate
src = open(os.path.join(ROOT, "tools", "experience_schema.py"), encoding="utf-8").read()
code = re.sub(r'"""[\s\S]*?"""', "", src)
code = "\n".join(line.split("#", 1)[0] for line in code.splitlines())
chk("the contract's code never mentions NCERT", "NCERT" not in code.upper())
chk("the contract carries no media, publishing or build fields", not re.search(r"higgsfield|instagram|youtube|reel|mp4|canvas|prompt|url", code, re.I))
chk("the contract does no I/O of its own", not re.search(r"open\(|urlopen|requests|sqlite|socket", code))
chk("the experience's own id uses exp_id_problems; concept_schema.id_problems serves only the two references",
    code.count("concept_schema.id_problems(") == 2 and "id_problems(where, cid, CONCEPT_ID_RE" in code
    and "id_problems(where, o, LO_ID_RE" in code and "out = exp_id_problems(where, eid)" in code)
chk("the experience id rule is built from the canonical subject / slug grammar, not a copy of it",
    X.EXP_ID_RE.pattern == r"^EXP-(%s)-%s$" % (C.SUBJECT_PATTERN, C.SLUG_PATTERN) and "[A-Z0-9]+(?:" not in code)
chk("concept, location and objective rules are not redefined here (they come from concept_schema)",
    not re.search(r"printedPages|sourceId|LOCATION_FIELDS|SECTION_ID|LO_VERBS\s*=|_UI_START|_POSITIONAL", code)
    and X.LO_ID_RE is C.LO_ID_RE and X.CONCEPT_ID_RE is C.CONCEPT_ID_RE)

# ---------------------------------------------------------------- compatible with the page context seam
ctx = {"pdfPage": 16, "printedPage": 151, "chapterId": "NCERT-11-CHE-P1-CH05", "editionStatus": "exact_match"}
loc = {"sourceId": "NCERT-11-CHE-P1", "chapterId": "NCERT-11-CHE-P1-CH05", "sectionId": "5.4e", "printedPages": [151, 152]}
reaches = lambda c, l: (c["chapterId"] == l["chapterId"] and c["printedPage"] is not None and "printedPages" in l
                        and l["printedPages"][0] <= c["printedPage"] <= l["printedPages"][1])
chk("a page context meets a concept location on chapterId + printed page (what a future concept mapper needs)",
    reaches(ctx, loc) and not reaches(dict(ctx, printedPage=None), loc) and C.location_problems("x", loc) == [])
js = open(os.path.join(ROOT, "ncert", "experience-mapper.js"), encoding="utf-8").read()
chk("the ExperienceMapper seam is unchanged and still returns []",
    subprocess.run(["git", "diff", "--quiet", "HEAD", "--", "ncert/experience-mapper.js"], cwd=ROOT).returncode == 0
    and "getExperiencesForPage" in js and "return [];" in js)

print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
