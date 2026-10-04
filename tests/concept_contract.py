#!/usr/bin/env python3
"""The concept inventory contract (tools/concept_schema.py).

Checks the contract on a synthetic example (tests/fixtures/concept_contract_example.json, sources
EXAMPLE-BOOK and MY-BOOK: test data, not an NCERT inventory) and on broken copies of it, and checks
locations against the real NCERT chapter structure built from data/ncert/ (which the schema itself
never reads). Read-only: nothing in the repository is written.
"""
import copy
import json
import math
import os
import re
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


DOC = json.load(open(os.path.join(HERE, "fixtures", "concept_contract_example.json"), encoding="utf-8"))
BOYLE, EQ, NEWTON, ENT = "CPT-CHE-BOYLE-LAW", "CPT-CHE-CHEMICAL-EQUILIBRIUM", "CPT-PHY-NEWTON-SECOND-LAW", "CPT-CHE-ENTROPY"

# the real NCERT book, as data/ncert describes it - built here, so the schema never depends on it
cat = json.load(open(os.path.join(ROOT, "data", "ncert", "catalog.json"), encoding="utf-8"))
STRUCT = {"sources": {}}
for book in cat["books"]:
    for ch in book["chapters"]:
        chap = json.load(open(os.path.join(ROOT, ch["file"]), encoding="utf-8"))
        STRUCT["sources"].setdefault(book["id"], {})[ch["id"]] = {
            "pages": ch["source"]["bookPages"], "sections": dict((s["id"], s["pages"]) for s in chap["sections"])}


def concept(d, cid):
    return next(c for c in d["concepts"] if c["id"] == cid)


def one(c, structure=None):
    """Problems of a document holding only concept `c`."""
    return C.problems({"schemaVersion": "1.0.0", "concepts": [c]}, structure)


def broken(mutate, structure=None):
    d = copy.deepcopy(DOC)
    mutate(d)
    return C.problems(d, structure)


def refused(name, needle, problems):
    chk(name, any(needle in m for m in problems), problems)


MIN = {"id": "CPT-CHE-BOYLE-LAW", "title": "Boyle's law", "locations": [{"sourceId": "MY-BOOK", "chapterId": "MY-BOOK-CH03"}]}
NC = lambda sec=None, pp=None: dict([("sourceId", "NCERT-11-CHE-P1"), ("chapterId", "NCERT-11-CHE-P1-CH05")]
                                    + ([("sectionId", sec)] if sec else []) + ([("printedPages", pp)] if pp else []))

# ---------------------------------------------------------------- valid
chk("the example document is valid", C.problems(DOC) == [], C.problems(DOC))
chk("...and is clearly example data (EXAMPLE-BOOK / MY-BOOK, never NCERT)", "TEST/EXAMPLE DATA ONLY" in DOC["note"]
    and all(l["sourceId"] in ("EXAMPLE-BOOK", "MY-BOOK") for c in DOC["concepts"] for l in c["locations"]))
chk("1. a minimal concept: id, title, one location", one(MIN) == [])
chk("2. several locations", len(concept(DOC, NEWTON)["locations"]) == 2 and one(concept(DOC, NEWTON)) == [])
chk("3. a location with a section and no pages", concept(DOC, NEWTON)["locations"][0] == {
    "sourceId": "MY-BOOK", "chapterId": "MY-BOOK-CH03", "sectionId": "3.2"})
chk("4. a location with pages and no section", concept(DOC, NEWTON)["locations"][1] == {
    "sourceId": "MY-BOOK", "chapterId": "MY-BOOK-CH05", "printedPages": [88, 90]})
chk("5. a concept spanning several sections (7.1 and 7.4), one location each",
    [l["sectionId"] for l in concept(DOC, EQ)["locations"]] == ["7.1", "7.4"])
chk("6. a concept with learning objectives (one, or several)",
    len(concept(DOC, BOYLE)["learningObjectives"]) == 1 and len(concept(DOC, EQ)["learningObjectives"]) == 3)
chk("7. a concept with no learning objectives (absent, or an empty list)",
    "learningObjectives" not in concept(DOC, ENT) and concept(DOC, NEWTON)["learningObjectives"] == [] and C.problems(DOC) == [])
chk("8. a generic non-NCERT source validates on form alone", one(dict(MIN, locations=[{"sourceId": "MY-BOOK", "chapterId": "MY-BOOK-CH03", "sectionId": "3.2"}]), STRUCT) == [])
chk("9. no experience needed (none in the example; the concept is complete without one)",
    not any("experiences" in c for c in DOC["concepts"]))
chk("10. no library page, JEE question or media needed", not re.search(r"libraryId|ADV-|media|reel", json.dumps(DOC)))
chk("a description is optional", "description" in concept(DOC, EQ) and "description" not in concept(DOC, BOYLE))
chk("the inventory holds no experiences: they live in the experience document and point here by conceptId",
    not any(k in c for c in DOC["concepts"] for k in ("experiences", "experienceIds")))
chk("concept ids may carry real chemistry: CH4, P4, S8, SN1, a CH bond",
    all(C.id_problems("x", i, C.CONCEPT_ID_RE, "concept") == [] for i in
        ("CPT-CHE-COMBUSTION-OF-CH4", "CPT-CHE-WHITE-P4", "CPT-CHE-S8-RING", "CPT-CHE-SN1-MECHANISM", "CPT-CHE-CH-BOND-ENTHALPY")))

# ---------------------------------------------------------------- invalid
refused("11. a missing id is refused", "needs an id", one({k: v for k, v in MIN.items() if k != "id"}))
for bad in ("CON-CHE-BOYLE-LAW", "C-CHE-BOYLE-LAW", "CPT-BIO-BOYLE-LAW", "cpt-che-boyle-law"):
    refused("12. wrong prefix or form %s is refused" % bad, "must look like", one(dict(MIN, id=bad)))
for bad in ("CPT-CHE-PAGE-142", "CPT-CHE-GAS-LAWS-P142", "CPT-CHE-PG12"):
    refused("13. page-encoded %s is refused" % bad, "must name the idea", one(dict(MIN, id=bad)))
for bad in ("CPT-CHE-SEC-5-2", "CPT-CHE-SECTION-THREE", "CPT-CHE-GASES-SEC3"):
    refused("14. section-encoded %s is refused" % bad, "must name the idea", one(dict(MIN, id=bad)))
for bad in ("CPT-CHE-Q12", "CPT-CHE-QUESTION-ON-GASES", "CPT-CHE-EX3-GAS"):
    refused("15. question-encoded %s is refused" % bad, "must name the idea", one(dict(MIN, id=bad)))
for bad in ("CPT-CHE-001", "CPT-CHE-3F2A9C1B-77D0"):
    refused("...and %s (a number or random value) is refused" % bad, "must name the idea", one(dict(MIN, id=bad)))
refused("16. a missing title is refused", "needs a title", one({k: v for k, v in MIN.items() if k != "title"}))
refused("17. an empty title is refused", "needs a title", one(dict(MIN, title="  ")))
refused("18. missing locations are refused", "at least one location", one({k: v for k, v in MIN.items() if k != "locations"}))
refused("19. empty locations are refused", "at least one location", one(dict(MIN, locations=[])))
refused("20. a malformed location is refused", "must be an object", one(dict(MIN, locations=["MY-BOOK ch 3"])))
refused("21. a location without a sourceId is refused", "needs a sourceId", one(dict(MIN, locations=[{"chapterId": "MY-BOOK-CH03"}])))
refused("22. a location without a chapterId is refused", "needs a chapterId", one(dict(MIN, locations=[{"sourceId": "MY-BOOK"}])))
for pp in ([42, 41], [41], [0, 3], ["41", "42"], [41.5, 42], [True, 2]):
    refused("23. printedPages %r is refused (an ascending inclusive range of page numbers)" % (pp,), "printedPages",
            one(dict(MIN, locations=[{"sourceId": "MY-BOOK", "chapterId": "MY-BOOK-CH03", "printedPages": pp}])))
refused("24. two identical locations are refused", "repeats an earlier location",
        broken(lambda d: concept(d, EQ)["locations"].append(dict(concept(d, EQ)["locations"][0]))))
chk("...while two different locations in one chapter are fine", one(concept(DOC, EQ)) == [])
refused("25. a repeated objective id within a concept is refused", "already used",
        broken(lambda d: concept(d, EQ)["learningObjectives"].append(dict(concept(d, EQ)["learningObjectives"][0]))))
refused("...and across concepts", "already used",
        broken(lambda d: concept(d, NEWTON).update(learningObjectives=[dict(concept(d, EQ)["learningObjectives"][0])])))
for bad in ("LO-1", "LO-CHE-EQUILIBRIUM-001", "OBJ-CHE-EQUILIBRIUM", None):
    refused("26. objective id %r is refused" % bad, "must", broken(lambda d, b=bad: concept(d, EQ)["learningObjectives"][0].update(id=b)))
refused("...an objective for another subject than its concept is refused", "subject code differs",
        broken(lambda d: concept(d, EQ)["learningObjectives"][0].update(id="LO-PHY-CHEMICAL-EQUILIBRIUM-DYNAMIC")))
refused("...an objective describing controls is refused", "describes the controls",
        broken(lambda d: concept(d, EQ)["learningObjectives"][0].update(statement="Use the slider to add more reactant.")))
refused("...a verb outside the list is refused", "verb", broken(lambda d: concept(d, EQ)["learningObjectives"][0].update(verb="play")))
refused("...a concept id used twice is refused", "already used", broken(lambda d: d["concepts"].append(copy.deepcopy(concept(d, BOYLE)))))

# ---------------------------------------------------------------- against a known book (real NCERT structure)
chk("a known chapter and section with fitting pages: valid", one(dict(MIN, locations=[NC("5.4e", [151, 152])]), STRUCT) == [])
chk("a known chapter, no section, pages inside the chapter: valid", one(dict(MIN, locations=[NC(None, [136, 140])]), STRUCT) == [])
refused("27. an unknown section in a known chapter is refused", "is not in NCERT-11-CHE-P1-CH05",
        one(dict(MIN, locations=[NC("5.9")]), STRUCT))
refused("28. pages outside the section are refused", "fall outside", one(dict(MIN, locations=[NC("5.4e", [150, 152])]), STRUCT))
refused("...pages outside the chapter are refused", "fall outside", one(dict(MIN, locations=[NC(None, [130, 140])]), STRUCT))
refused("...a chapter that is not in the known source is refused", "is not a chapter of",
        one(dict(MIN, locations=[{"sourceId": "NCERT-11-CHE-P1", "chapterId": "NCERT-11-CHE-P1-CH06"}]), STRUCT))
chk("without the structure, the same NCERT location is checked for form only", one(dict(MIN, locations=[NC("5.9")])) == [])

# ---------------------------------------------------------------- only what belongs to a concept
for k, v in (("experiences", []), ("libraryId", "ADV-2026-P1-CHE-Q09"), ("difficulty", "easy"), ("tags", ["gas"]),
             ("subject", "Chemistry"), ("media", {"eligible": True})):
    refused("a concept carries no %r field" % k, "is not a concept field", one(dict(MIN, **{k: v})))
refused("...and says where experiences belong", "belongs to the experience contract", one(dict(MIN, experiences=[])))
refused("a location carries no pdfPage (not a stable reference)", "not a stable reference",
        one(dict(MIN, locations=[{"sourceId": "MY-BOOK", "chapterId": "MY-BOOK-CH03", "pdfPage": 9}])))
for label, val in (("bytes", b"%PDF"), ("a function", len), ("NaN", math.nan)):
    refused("%s inside the document is refused" % label, "plain JSON", broken(lambda d, v=val: concept(d, BOYLE).update(title=v)))
chk("the document round-trips through JSON unchanged", json.loads(json.dumps(DOC)) == DOC)
moved = copy.deepcopy(DOC); moved["concepts"].reverse()
for c in moved["concepts"]:
    c["locations"].reverse()
chk("reordering concepts and locations changes nothing (identity is the id, not the position)", C.problems(moved) == [])

# ---------------------------------------------------------------- three relationships, three places
src = open(os.path.join(ROOT, "tools", "concept_schema.py"), encoding="utf-8").read()
code = re.sub(r'"""[\s\S]*?"""', "", src)
code = "\n".join(line.split("#", 1)[0] for line in code.splitlines())
chk("Concept -> source location: here, as references only (sourceId, chapterId, sectionId, printedPages)",
    C.LOCATION_FIELDS == ("sourceId", "chapterId", "sectionId", "printedPages"))
chk("Concept -> objective: here; Concept -> experience: not here (no experience logic, no import of the experience contract)",
    "import experience_schema" not in code and not re.search(r"EXPERIENCE|status", code))
chk("Experience -> libraryId: not here (the optional integration stays in the experience contract)",
    "libraryId" not in code.replace('"libraryId")', "") and hasattr(X, "_library_problems"))
chk("the concept contract's code is source-agnostic (no NCERT) and does no I/O",
    "NCERT" not in code.upper() and not re.search(r"open\(|urlopen|requests|sqlite|socket", code))

# ---------------------------------------------------------------- one definition: the experience contract uses this one
chk("the experience contract uses these very concept and objective id rules (not copies)",
    X.CONCEPT_ID_RE is C.CONCEPT_ID_RE and X.LO_ID_RE is C.LO_ID_RE)
xsrc = open(os.path.join(ROOT, "tools", "experience_schema.py"), encoding="utf-8").read()
chk("...it checks its conceptId and objective references with concept_schema.id_problems (exactly those two)",
    xsrc.count("concept_schema.id_problems(") == 2)
chk("...while concept-only semantics (positional words, random-value heuristic) never reach experience ids",
    not re.search(r"_POSITIONAL|_UUIDISH|LO_VERBS\s*=|_UI_START\s*=|SOURCE_ID_RE", xsrc)
    and X.exp_id_problems("x", "EXP-CHE-Q12") == [] and C.id_problems("x", "CPT-CHE-Q12", C.CONCEPT_ID_RE, "concept") != [])
chk("...and the dependency runs one way: experiences import concepts, never the reverse",
    "import concept_schema" in xsrc and "import experience_schema" not in code)

# ---------------------------------------------------------------- real inventories (data/ncert/concepts/)
INV_DIR = os.path.join(ROOT, "data", "ncert", "concepts")
for fn in sorted(os.listdir(INV_DIR)) if os.path.isdir(INV_DIR) else []:
    if not fn.endswith(".json"):
        continue
    inv = json.load(open(os.path.join(INV_DIR, fn), encoding="utf-8"))
    chap_id = fn[:-5]
    allocs = [l for c in inv.get("concepts", []) for l in c.get("locations", [])]
    chk("%s: a valid concept inventory, every location checked against the real chapter" % fn,
        C.problems(inv, STRUCT) == [], C.problems(inv, STRUCT))
    chk("%s: every location is in its own chapter and names a section" % fn,
        allocs and all(l.get("chapterId") == chap_id and "sectionId" in l and "printedPages" in l for l in allocs))
    chk("%s: every concept has a description and at least one learning objective with a verb" % fn,
        all(c.get("description") and c.get("learningObjectives")
            and all("verb" in o for o in c["learningObjectives"]) for c in inv["concepts"]))

print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
