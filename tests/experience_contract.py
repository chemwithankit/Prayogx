#!/usr/bin/env python3
"""The concept -> learning objective -> experience contract (tools/experience_schema.py).

Checks the contract on the synthetic example document (tests/fixtures/experience_contract_example.json,
source "EXAMPLE": test data, not an NCERT mapping) and on broken copies of it, against the real
library (data/manifest.json) and, for locations, the real NCERT chapter structure. Read-only:
nothing in the repository is written.
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
import experience_schema as X  # noqa: E402

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or not detail else "  -> " + str(detail)))


DOC = json.load(open(os.path.join(HERE, "fixtures", "experience_contract_example.json"), encoding="utf-8"))
LIB = dict((s["id"], s) for s in json.load(open(os.path.join(ROOT, "data", "manifest.json"), encoding="utf-8"))["simulations"])
CON = dict((c["id"], c) for c in DOC["concepts"])


def broken(mutate, library=LIB, structure=None):
    d = copy.deepcopy(DOC)
    mutate(d)
    return X.problems(d, library, structure)


def refused(name, needle, mutate, **kw):
    p = broken(mutate, **kw)
    chk(name, any(needle in m for m in p), p)


def concept(d, cid):
    return next(c for c in d["concepts"] if c["id"] == cid)


EQ, BOYLE, ENT = "CPT-CHE-CHEMICAL-EQUILIBRIUM", "CPT-CHE-BOYLES-LAW", "CPT-CHE-ENTROPY"

# ---------------------------------------------------------------- vocabulary
chk("experience types: the ten learning modes, nothing technical",
    X.EXPERIENCE_TYPES == ("simulation", "animation", "virtual-lab", "graph", "data-explorer", "interactive-diagram",
                           "molecular", "derivation", "worked-example", "practice"))
chk("experience status: planned -> blueprint -> building -> review -> published, and retired",
    X.EXPERIENCE_STATUS == ("planned", "blueprint", "building", "review", "published", "retired"))
chk("objective verbs are a short list of learning verbs", len(X.LO_VERBS) == 10 and "explain" in X.LO_VERBS and "use" not in X.LO_VERBS)

# ---------------------------------------------------------------- the example is valid
p = X.problems(DOC, LIB)
chk("the example document is valid against the real library", p == [], p)
chk("...and it is clearly example data: source EXAMPLE, never NCERT",
    all(l["sourceId"] == "EXAMPLE" for c in DOC["concepts"] for l in c["locations"]) and "TEST/EXAMPLE DATA ONLY" in DOC["note"])

# ---------------------------------------------------------------- concept
c = CON[BOYLE]
chk("concept: stable id, title, subject", c["id"] == "CPT-CHE-BOYLES-LAW" and c["title"] == "Boyle's law" and c["subject"] == "Chemistry")
chk("concept: source / chapter / section through its location", c["locations"][0] == {
    "sourceId": "EXAMPLE", "chapterId": "EXAMPLE-BOOK-CH02", "sectionId": "2.3", "printedPages": [41, 42]})
chk("concept: learningObjectives and experiences are lists", isinstance(c["learningObjectives"], list) and isinstance(c["experiences"], list))
refused("a concept without a title is refused", "needs a title", lambda d: concept(d, BOYLE).update(title=" "))
refused("a concept whose subject disagrees with its id is refused", "does not match the id", lambda d: concept(d, BOYLE).update(subject="Physics"))
refused("a concept with no location is refused", "at least one location", lambda d: concept(d, BOYLE).update(locations=[]))
refused("a concept with no learning objective is refused", "at least one learning objective", lambda d: concept(d, BOYLE).update(learningObjectives=[]))
refused("a concept id in the CON- (library page) namespace is refused", "must look like", lambda d: concept(d, BOYLE).update(id="CON-CHE-BOYLES-LAW"))
for bad in ("CPT-CHE-PAGE-142", "CPT-CHE-142", "CPT-CHE-P9-GAS", "CPT-CHE-3F2A9C1B-77D0", "cpt-che-boyles-law"):
    refused("concept id %s is refused (a page, position, random value or wrong case)" % bad, "id", lambda d, b=bad: concept(d, BOYLE).update(id=b))
refused("two concepts with one id are refused", "already used", lambda d: d["concepts"].append(copy.deepcopy(concept(d, ENT))))

# ---------------------------------------------------------------- learning objective
lo = CON[EQ]["learningObjectives"][1]
chk("objective: stable id, a statement of learning, a verb", lo["id"] == "LO-CHE-CHEMICAL-EQUILIBRIUM-CONSTANT"
    and lo["statement"].startswith("Calculate") and lo["verb"] == "calculate")
chk("a concept can have several objectives (equilibrium has 3, entropy 2)",
    len(CON[EQ]["learningObjectives"]) == 3 and len(CON[ENT]["learningObjectives"]) == 2)
refused('"Use the slider ..." is refused: it describes the controls, not the learning', "describes the controls",
        lambda d: concept(d, BOYLE)["learningObjectives"][0].update(statement="Use the slider to change the volume of the gas."))
refused('"Click ..." is refused too', "describes the controls",
        lambda d: concept(d, BOYLE)["learningObjectives"][0].update(statement="Click start and watch the pressure gauge."))
refused("an objective without a real statement is refused", "needs a statement", lambda d: concept(d, BOYLE)["learningObjectives"][0].update(statement="Gas"))
refused("a verb outside the list is refused", "verb", lambda d: concept(d, BOYLE)["learningObjectives"][0].update(verb="play"))
refused("an objective id must name the idea", "must look like", lambda d: concept(d, BOYLE)["learningObjectives"][0].update(id="LO-1"))
refused("an objective id cannot be reused", "already used",
        lambda d: concept(d, ENT)["learningObjectives"].append(dict(concept(d, BOYLE)["learningObjectives"][0])))
chk("the verb is optional", broken(lambda d: concept(d, BOYLE)["learningObjectives"][0].pop("verb")) == [])

# ---------------------------------------------------------------- experience
e = CON[BOYLE]["experiences"][0]
chk("experience: stable id, type, title, objectives, status", e["id"] == "EXP-CHE-BOYLES-LAW-SYRINGE" and e["type"] == "simulation"
    and e["title"] and e["objectives"] == ["LO-CHE-BOYLES-LAW-PRESSURE-VOLUME"] and e["status"] == "planned")
chk("experience -> concept: implied by nesting in authoring, explicit (conceptId) at runtime",
    "conceptId" not in e and next(x for x in X.flatten(DOC)["experiences"] if x["id"] == e["id"])["conceptId"] == BOYLE)
for t in ("canvas-html-js", "mp4", "SIMULATION", None):
    refused("type %r is refused: a type is a learning mode from the list" % t, "is not one of",
            lambda d, t=t: concept(d, BOYLE)["experiences"][0].update(type=t))
for st in ("ready", "qa", "approved", None):
    refused("status %r is refused" % st, "status", lambda d, st=st: concept(d, BOYLE)["experiences"][0].update(status=st))
refused("an experience must serve an objective", "at least one learning objective", lambda d: concept(d, BOYLE)["experiences"][0].update(objectives=[]))
refused("...of its own concept, not another's", "is not one of this concept's",
        lambda d: concept(d, BOYLE)["experiences"][0].update(objectives=["LO-CHE-ENTROPY-SIGN"]))
refused("an experience id cannot repeat another id", "already used",
        lambda d: concept(d, ENT)["experiences"].append(dict(concept(d, BOYLE)["experiences"][0], objectives=["LO-CHE-ENTROPY-SIGN"])))

# ---------------------------------------------------------------- status is honest
pr = next(x for x in CON[EQ]["experiences"] if x["status"] == "published")
chk("a published experience is delivered by a published library page", pr["libraryId"] == "ADV-2026-P1-CHE-Q02"
    and LIB[pr["libraryId"]].get("status", "human_verified") not in ("draft", "deprecated"))
chk("a native experience (no library page) can be published: the lifecycles are separate",
    broken(lambda d: concept(d, BOYLE)["experiences"][0].update(status="published")) == [])
draft = copy.deepcopy(LIB)
draft["ADV-2026-P1-CHE-Q02"] = dict(draft["ADV-2026-P1-CHE-Q02"], status="draft")
refused("published while the library page is a draft is refused", "is draft", lambda d: None, library=draft)
refused("published with a page that is not in the library is refused", "not in the library",
        lambda d: next(x for x in concept(d, EQ)["experiences"] if x["status"] == "published").update(libraryId="ADV-2026-P2-CHE-Q99"))
refused("a libraryId must be a library id (ADV- or CON-)", "not a library id", lambda d: concept(d, BOYLE)["experiences"][0].update(libraryId="sims/boyle.html"))
refused("a practice experience is delivered by a question page, not a concept page", "question page",
        lambda d: next(x for x in concept(d, EQ)["experiences"] if x["type"] == "practice").update(libraryId="CON-CHE-EQUILIBRIUM", status="building"))
refused("a libraryId names an EXISTING page, even while planned (null until the page exists)", "not in the library",
        lambda d: concept(d, BOYLE)["experiences"][0].update(libraryId="CON-CHE-BOYLES-LAW"))
refused("...and while building", "not in the library",
        lambda d: concept(d, BOYLE)["experiences"][0].update(libraryId="CON-CHE-BOYLES-LAW", status="building"))

# ---------------------------------------------------------------- libraryId is optional (native experiences)
def one(exp, library=LIB):
    """A document whose only experience is `exp` (in Boyle's law); its problems."""
    def m(d):
        base = {"title": "An experience", "objectives": ["LO-CHE-BOYLES-LAW-PRESSURE-VOLUME"]}
        base.update(exp)
        concept(d, BOYLE)["experiences"] = [base]
    return broken(m, library=library)


native = lambda eid, t, st: {"id": eid, "type": t, "status": st, "libraryId": None}
chk("1. published + libraryId null -> valid (A: a native experience)", one(native("EXP-CHE-BOYLES-LAW-NATIVE-SIM", "simulation", "published")) == [])
chk("2. building + libraryId null -> valid (D)", one(native("EXP-CHE-BOYLES-LAW-NATIVE-LAB", "virtual-lab", "building")) == [])
chk("3. review + libraryId null -> valid", one(native("EXP-CHE-BOYLES-LAW-NATIVE-GRAPH", "graph", "review")) == [])
chk("4. planned + libraryId null -> valid (C)", one(native("EXP-CHE-BOYLES-LAW-NATIVE-ANIMATION", "animation", "planned")) == [])
chk("...every status is valid for a native experience, and so is leaving libraryId out",
    all(one(native("EXP-CHE-BOYLES-LAW-NATIVE-SIM", "simulation", st)) == [] for st in X.EXPERIENCE_STATUS)
    and one({"id": "EXP-CHE-BOYLES-LAW-NATIVE-SIM", "type": "simulation", "status": "published"}) == [])
chk("5. published + a valid, published libraryId -> valid (B: reusing a JEE page)",
    one({"id": "EXP-CHE-BOYLES-LAW-JEE-SIM", "type": "simulation", "status": "published", "libraryId": "ADV-2026-P1-CHE-Q12"}) == []
    and LIB["ADV-2026-P1-CHE-Q12"].get("status", "human_verified") == "human_verified")
p6 = one({"id": "EXP-CHE-BOYLES-LAW-JEE-SIM", "type": "simulation", "status": "published", "libraryId": "simulations/boyle/index.html"})
chk("6. an invalid libraryId -> refused", any("not a library id" in m for m in p6), p6)
p7 = one({"id": "EXP-CHE-BOYLES-LAW-PRACTICE", "type": "practice", "status": "planned", "libraryId": "CON-CHE-BOYLES-LAW"})
chk("7. practice + a non-ADV libraryId -> refused", any("question page" in m for m in p7), p7)
chk("8. practice + an ADV libraryId -> valid",
    one({"id": "EXP-CHE-BOYLES-LAW-PRACTICE", "type": "practice", "status": "published", "libraryId": "ADV-2026-P1-CHE-Q09"}) == [])
for bad in ("draft", "deprecated"):
    lib2 = copy.deepcopy(LIB)
    lib2["ADV-2026-P1-CHE-Q12"] = dict(lib2["ADV-2026-P1-CHE-Q12"], status=bad)
    p9 = one({"id": "EXP-CHE-BOYLES-LAW-JEE-SIM", "type": "simulation", "status": "published", "libraryId": "ADV-2026-P1-CHE-Q12"}, library=lib2)
    chk("9. a published experience linked to a %s page -> refused" % bad, any("is %s" % bad in m for m in p9), p9)
    chk("...while one still in production may link to a %s page" % bad,
        one({"id": "EXP-CHE-BOYLES-LAW-JEE-SIM", "type": "simulation", "status": "building", "libraryId": "ADV-2026-P1-CHE-Q12"}, library=lib2) == [])
alone = {"schemaVersion": "1.0.0", "concepts": [dict(copy.deepcopy(CON[BOYLE]), experiences=[
    dict(native("EXP-CHE-BOYLES-LAW-NATIVE-SIM", "simulation", "published"), title="A native experience",
         objectives=["LO-CHE-BOYLES-LAW-PRESSURE-VOLUME"])])]}
chk("10. a native experience stays valid with the real library, without one, and with an empty one",
    X.problems(alone, LIB) == [] and X.problems(alone, None) == [] and X.problems(alone, {}) == [])
chk("...and the example's own native experiences validate without any library at all", X.problems(
    (lambda d: (concept(d, EQ).update(experiences=[x for x in concept(d, EQ)["experiences"] if x["libraryId"] is None]), d)[1])(copy.deepcopy(DOC)), {}) == [])

# ---------------------------------------------------------------- zero / one / many experiences
ex = dict((cid, c["experiences"]) for cid, c in CON.items())
chk("one concept, one experience (Boyle's law: a simulation)", len(ex[BOYLE]) == 1)
chk("one concept, several experiences of different types (equilibrium: animation, data explorer, virtual lab, practice)",
    sorted(x["type"] for x in ex[EQ]) == ["animation", "data-explorer", "practice", "virtual-lab"])
chk("one concept, no experience yet (entropy: []), and still valid", ex[ENT] == [] and X.problems(DOC, LIB) == [])
cov = sum(1 for v in ex.values() if v)
chk("concept coverage and experience count are different measures (2 of 3 concepts, 5 experiences)", cov == 2 and sum(len(v) for v in ex.values()) == 5)
chk("one experience may serve several objectives", len(next(x for x in ex[EQ] if x["type"] == "virtual-lab")["objectives"]) == 2)

# ---------------------------------------------------------------- source locations
locs = CON[EQ]["locations"]
chk("a concept can appear in several places, across sources and without page numbers",
    len(locs) == 3 and len(set(l["chapterId"] for l in locs)) == 2 and "printedPages" not in locs[2] and "sectionId" not in locs[2])
refused("a location holds references only (no pdfPage, text or coordinates)", "unknown field",
        lambda d: concept(d, BOYLE)["locations"][0].update(pdfPage=9))
refused("printedPages must be [first, last]", "printedPages", lambda d: concept(d, BOYLE)["locations"][0].update(printedPages=[42, 41]))
refused("a location needs a sourceId", "sourceId", lambda d: concept(d, BOYLE)["locations"][0].update(sourceId="ncert textbook"))
# against a real book structure: the NCERT chapter as data/ncert describes it (no concept is added to it)
ch = json.load(open(os.path.join(ROOT, "data", "ncert", "chapters", "NCERT-11-CHE-P1-CH05.json"), encoding="utf-8"))
cat = json.load(open(os.path.join(ROOT, "data", "ncert", "catalog.json"), encoding="utf-8"))
STRUCT = {ch["id"]: {"sections": dict((s["id"], s["pages"]) for s in ch["sections"]),
                     "pages": cat["books"][0]["chapters"][0]["source"]["bookPages"]}}
real = lambda sec, pp: (lambda d: concept(d, BOYLE).update(locations=[{"sourceId": "NCERT", "chapterId": "NCERT-11-CHE-P1-CH05",
                                                                        "sectionId": sec, "printedPages": pp}]))
chk("a location in a real NCERT section checks against that book's structure",
    broken(real("5.4e", [151, 152]), structure=STRUCT) == [])
refused("...an unknown section is refused", "is not in NCERT-11-CHE-P1-CH05", real("5.9", [151, 152]), structure=STRUCT)
refused("...pages outside the section are refused", "fall outside", real("5.4e", [150, 152]), structure=STRUCT)
chk("...and a source the structure does not know is checked for form only (other books validate too)",
    X.problems(DOC, LIB, STRUCT) == [])

# ---------------------------------------------------------------- serialisation, no runtime leakage
s = json.dumps(DOC, sort_keys=True)
chk("the document round-trips through JSON unchanged", json.loads(s) == DOC)
for label, val in (("bytes", b"%PDF-1.4"), ("a function", len), ("NaN", math.nan), ("a set", {1})):
    refused("%s inside the document is refused" % label, "plain JSON", lambda d, v=val: concept(d, BOYLE).update(extra=v))
flat = X.flatten(DOC)


def plain(o):
    if isinstance(o, dict):
        return all(isinstance(k, str) and plain(v) for k, v in o.items())
    if isinstance(o, list):
        return all(plain(v) for v in o)
    return o is None or isinstance(o, (str, int, bool)) or (isinstance(o, float) and math.isfinite(o))


chk("runtime records are plain data only (str, int, bool, None, lists, objects)", plain(flat))
chk("runtime records: objectives and experiences carry their conceptId", all(x["conceptId"] in CON for x in flat["objectives"] + flat["experiences"]))
flat["experiences"][0]["status"] = "retired"; flat["concepts"][0]["locations"][0]["chapterId"] = "X"
chk("runtime records are copies: changing them leaves the authoring document alone", X.problems(DOC, LIB) == []
    and CON[BOYLE]["experiences"][0]["status"] == "planned" and CON[BOYLE]["locations"][0]["chapterId"] == "EXAMPLE-BOOK-CH02")

# ---------------------------------------------------------------- id stability
moved = copy.deepcopy(DOC)
moved["concepts"].reverse()
for cc in moved["concepts"]:
    cc["experiences"].reverse(); cc["learningObjectives"].reverse()
    for l in cc["locations"]:
        if "printedPages" in l:
            l["printedPages"] = [l["printedPages"][0] + 7, l["printedPages"][1] + 7]   # a later edition shifts the pages
ids = lambda d: sorted(x["id"] for k in ("concepts", "objectives", "experiences") for x in X.flatten(d)[k])
chk("reordering everything and shifting every page leaves every id, and validity, unchanged",
    ids(moved) == ids(DOC) and X.problems(moved, LIB) == [])
by_id = lambda d: dict((x["id"], {k: v for k, v in x.items()}) for x in X.flatten(d)["experiences"])
chk("...and each experience is still the same record when looked up by id", by_id(moved) == by_id(DOC))

# ---------------------------------------------------------------- source-agnostic, small, separate
src = open(os.path.join(ROOT, "tools", "experience_schema.py"), encoding="utf-8").read()
code = re.sub(r'"""[\s\S]*?"""', "", src)
code = "\n".join(line.split("#", 1)[0] for line in code.splitlines())
chk("the contract's code never mentions NCERT (it is the first source, not a rule)", "NCERT" not in code.upper())
chk("the contract carries no media, publishing or build fields", not re.search(r"higgsfield|instagram|youtube|reel|mp4|canvas|prompt|url", code, re.I))
chk("the contract does no I/O of its own (no files, network or database)", not re.search(r"open\(|urlopen|requests|sqlite|socket", code))

# ---------------------------------------------------------------- compatible with the page context seam
CTX_KEYS = ("pdfPage", "printedPage", "chapterId", "editionStatus")                     # NCERT.reader.getCurrentPageContext()
ctx = {"pdfPage": 16, "printedPage": 151, "chapterId": "NCERT-11-CHE-P1-CH05", "editionStatus": "exact_match"}
loc = {"sourceId": "NCERT", "chapterId": "NCERT-11-CHE-P1-CH05", "sectionId": "5.4e", "printedPages": [151, 152]}
reaches = lambda c, l: (c["chapterId"] == l["chapterId"] and c["printedPage"] is not None and "printedPages" in l
                        and l["printedPages"][0] <= c["printedPage"] <= l["printedPages"][1])
chk("a page context and a location meet on chapterId + printed page (what a future concept mapper needs)",
    set(CTX_KEYS) >= {"chapterId", "printedPage"} and reaches(ctx, loc) and not reaches(dict(ctx, printedPage=None), loc))
js = open(os.path.join(ROOT, "ncert", "experience-mapper.js"), encoding="utf-8").read()
chk("the ExperienceMapper seam is unchanged and still returns []",
    subprocess.run(["git", "diff", "--quiet", "HEAD", "--", "ncert/experience-mapper.js"], cwd=ROOT).returncode == 0
    and "getExperiencesForPage" in js and "return [];" in js)

print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
