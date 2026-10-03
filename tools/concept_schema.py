"""The concept inventory contract: the semantic learning units of a source book.

Source-agnostic. It knows nothing of NCERT, Chemistry, JEE, page numbering or exams; a caller may
pass a known book structure to check locations against.

A CONCEPT is a meaningful unit of learner understanding ("Chemical equilibrium"). It is not a page,
a section heading, a simulation, a library page, an experience, a keyword or an exam question.

    Concept -> learning objective -> experience     semantic   (objectives here; experiences: experience_schema)
    Concept -> source location                      reference  (here)
    Experience -> libraryId                         optional integration (experience_schema only)

Inventory document (JSON, written with Python json; deterministic and serialisable)

    { "schemaVersion": "1.0.0",
      "concepts": [ {
          "id":          "CPT-CHE-CHEMICAL-EQUILIBRIUM",      required; CPT-<SUBJ>-<SLUG>
          "title":       "Chemical equilibrium",               required
          "description": "...",                                optional
          "locations": [                                       required; one or many, no duplicates
              { "sourceId": "MY-BOOK", "chapterId": "MY-BOOK-CH07",      required
                "sectionId": "7.1", "printedPages": [190, 193] } ],     optional, optional
          "learningObjectives": [                              optional; zero or more
              { "id": "LO-CHE-CHEMICAL-EQUILIBRIUM-DISTURBANCE",
                "statement": "Predict the direction an equilibrium shifts when a reactant is added.",
                "verb": "predict" } ] } ] }                    verb optional

Nothing else belongs on a concept at this layer: no experiences, library pages, media, difficulty,
tags or scores. A section may hold any number of concepts and a concept may span sections and page
ranges (one location each); nothing here enforces a granularity.

Objectives follow the conventions the experience contract already uses (tools/experience_schema.py):
the same LO- ids, statement rule and verbs. tests/concept_contract.py keeps the two in step.
"""
import json
import re

import registry_schema

SCHEMA_MAJOR = "1"
CONCEPT_FIELDS = ("id", "title", "description", "locations", "learningObjectives")
LOCATION_FIELDS = ("sourceId", "chapterId", "sectionId", "printedPages")
OBJECTIVE_FIELDS = ("id", "statement", "verb")

LO_VERBS = ("identify", "describe", "visualize", "explain", "compare", "predict",
            "calculate", "derive", "apply", "analyze")

_SUBJ = "|".join(registry_schema.SUBJECTS)
_SLUG = r"[A-Z0-9]+(?:-[A-Z0-9]+){0,9}"
# public building blocks, for ids of other kinds built on the same grammar (e.g. experience ids)
SUBJECT_PATTERN, SLUG_PATTERN = _SUBJ, _SLUG
CONCEPT_ID_RE = re.compile(r"^CPT-(%s)-%s$" % (_SUBJ, _SLUG))
LO_ID_RE = re.compile(r"^LO-(%s)-%s$" % (_SUBJ, _SLUG))
ID_MAX = 72
# identifiers of a book, chapter or section: upper-case words joined by hyphens / short tokens
SOURCE_ID_RE = re.compile(r"^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){0,7}$")
CHAPTER_ID_RE = re.compile(r"^[A-Z0-9][A-Z0-9]*(?:-[A-Z0-9]+){0,9}$")
SECTION_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$")
LOCATION_ID_MAX = 64

# A slug word that points at a place or a position instead of naming the idea: a page, section,
# chapter, question or exercise marker, a bare number, or a random value. Chemistry stays legal:
# "CH4", "P4", "S8", "SN1", "CO2" and a "CH" bond are names, not places.
_POSITIONAL_WORD = re.compile(r"^(PAGE|PG|PP|SEC|SECTION|CHAPTER|QUESTION|EXERCISE|\d+"
                              r"|(?:PAGE|PG|PP|SEC|Q|EX)\d+|P\d{2,})$")      # P142 is a page; P4 is phosphorus
_UUIDISH = re.compile(r"[0-9A-F]{8}-?[0-9A-F]{4}")
# an objective describes learning, not the controls ("Use the slider ...")
_UI_START = re.compile(r"^\s*(use|click|tap|drag|press|move|slide|toggle|select|open|scroll)\b", re.I)


def id_problems(where, value, rx, kind):
    """A concept or objective id: the pattern, a length limit, and no positional words."""
    if not isinstance(value, str) or not rx.match(value) or len(value) > ID_MAX:
        return ["%s: %s id %r must look like %s" % (where, kind, value, rx.pattern)]
    words = value.split("-")[2:]
    if any(_POSITIONAL_WORD.match(w) for w in words) or _UUIDISH.search(value):
        return ["%s: %s id %r must name the idea, not a page, section, question, number or random value"
                % (where, kind, value)]
    return []


def problems(doc, structure=None):
    """Everything wrong with an inventory document, as messages (empty list = valid).

    structure: optional knowledge of real books, {"sources": {sourceId: {chapterId:
               {"pages": [first, last], "sections": {sectionId: [first, last]}}}}}. A location
               in a known source is checked against it (the chapter belongs to the source, the
               section exists, the pages fit); any other source is checked for form only."""
    if not isinstance(doc, dict):
        return ["the document must be an object"]
    out = []
    if str(doc.get("schemaVersion", "")).split(".")[0] != SCHEMA_MAJOR:
        out.append("schemaVersion must be %s.x" % SCHEMA_MAJOR)
    try:
        json.dumps(doc, allow_nan=False)
    except (TypeError, ValueError) as exc:
        out.append("the document must be plain JSON (no files, bytes, functions or objects): %s" % exc)
    concepts = doc.get("concepts")
    if not isinstance(concepts, list):
        return out + ["concepts must be a list"]
    seen = {}
    for c in concepts:
        out.extend(concept_problems(c, structure, seen))
    return out


def concept_problems(c, structure=None, seen=None):
    """Everything wrong with one concept. `seen` collects ids across a document."""
    seen = {} if seen is None else seen
    if not isinstance(c, dict):
        return ["a concept must be an object"]
    cid = c.get("id")
    where = "concept %s" % (cid if cid else "<no id>")
    out = []
    if cid is None:
        out.append("%s: needs an id" % where)
    else:
        out.extend(id_problems(where, cid, CONCEPT_ID_RE, "concept"))
        out.extend(_dup(seen, cid, where))
    for k in c:
        if k not in CONCEPT_FIELDS:
            hint = (" (the concept -> experience relationship belongs to the experience contract)"
                    if k in ("experiences", "experienceIds", "experienceId", "libraryId") else "")
            out.append("%s: %r is not a concept field (%s)%s" % (where, k, ", ".join(CONCEPT_FIELDS), hint))
    if not isinstance(c.get("title"), str) or not c["title"].strip():
        out.append("%s: needs a title" % where)
    if "description" in c and (not isinstance(c["description"], str) or not c["description"].strip()):
        out.append("%s: a description, when given, must be text" % where)

    locs = c.get("locations")
    if not isinstance(locs, list) or not locs:
        out.append("%s: needs at least one location (where the concept appears)" % where)
        locs = []
    keys = set()
    for i, loc in enumerate(locs):
        lw = "%s location %d" % (where, i + 1)
        out.extend(location_problems(lw, loc, structure))
        if isinstance(loc, dict):
            key = json.dumps(loc, sort_keys=True, default=str)
            if key in keys:
                out.append("%s: repeats an earlier location" % lw)
            keys.add(key)

    los = c.get("learningObjectives", [])
    if not isinstance(los, list):
        out.append("%s: learningObjectives, when given, must be a list" % where)
        los = []
    code = cid.split("-")[1] if isinstance(cid, str) and cid.count("-") >= 2 else None
    for lo in los:
        out.extend(objective_problems(where, lo, code, seen))
    return out


def objective_problems(where, lo, code, seen):
    if not isinstance(lo, dict):
        return ["%s: a learning objective must be an object" % where]
    lid = lo.get("id")
    lw = "%s objective %s" % (where, lid if lid else "<no id>")
    out = id_problems(lw, lid, LO_ID_RE, "objective")
    if not out and code and lid.split("-")[1] != code:
        out.append("%s: subject code differs from its concept's" % lw)
    for k in lo:
        if k not in OBJECTIVE_FIELDS:
            out.append("%s: %r is not an objective field (%s)" % (lw, k, ", ".join(OBJECTIVE_FIELDS)))
    st = lo.get("statement")
    if not isinstance(st, str) or len(st.strip()) < 12:
        out.append("%s: needs a statement of what the student will be able to do" % lw)
    elif _UI_START.match(st):
        out.append("%s: describes the controls (%r), not the learning" % (lw, st.split()[0]))
    if "verb" in lo and lo["verb"] not in LO_VERBS:
        out.append("%s: verb %r is not one of %s" % (lw, lo["verb"], ", ".join(LO_VERBS)))
    if isinstance(lid, str):
        out.extend(_dup(seen, lid, lw))
    return out


def location_problems(where, loc, structure=None):
    """A source reference. Its form for any source; its facts for a source `structure` knows."""
    if not isinstance(loc, dict):
        return ["%s: must be an object" % where]
    out = []
    for k in loc:
        if k not in LOCATION_FIELDS:
            hint = " (a PDF page is not a stable reference; use printedPages)" if k in ("pdfPage", "page") else ""
            out.append("%s: %r is not a location field (%s)%s" % (where, k, ", ".join(LOCATION_FIELDS), hint))
    src, chap = loc.get("sourceId"), loc.get("chapterId")
    if not isinstance(src, str) or not SOURCE_ID_RE.match(src) or len(src) > LOCATION_ID_MAX:
        out.append("%s: needs a sourceId: upper-case words joined by hyphens, e.g. MY-BOOK" % where)
    if not isinstance(chap, str) or not CHAPTER_ID_RE.match(chap) or len(chap) > LOCATION_ID_MAX:
        out.append("%s: needs a chapterId: upper-case words joined by hyphens, e.g. MY-BOOK-CH03" % where)
    if "sectionId" in loc and (not isinstance(loc["sectionId"], str) or not SECTION_ID_RE.match(loc["sectionId"])):
        out.append("%s: sectionId, when given, must be a short section id such as 3.2" % where)
    pp = loc.get("printedPages")
    if "printedPages" in loc and not (isinstance(pp, list) and len(pp) == 2
                                      and all(isinstance(x, int) and not isinstance(x, bool) and x > 0 for x in pp)
                                      and pp[0] <= pp[1]):
        out.append("%s: printedPages, when given, must be an ascending inclusive range [first, last]" % where)
        pp = None
    if out:
        return out
    book = ((structure or {}).get("sources") or {}).get(src)
    if book is None:
        return out                                     # an unknown source: its form is all we can check
    ch = book.get(chap)
    if ch is None:
        return ["%s: %s is not a chapter of %s" % (where, chap, src)]
    secs = ch.get("sections") or {}
    if "sectionId" in loc and loc["sectionId"] not in secs:
        out.append("%s: section %s is not in %s" % (where, loc["sectionId"], chap))
    rng = secs.get(loc.get("sectionId")) if "sectionId" in loc else ch.get("pages")
    if pp and rng and (pp[0] < rng[0] or pp[1] > rng[1]):
        out.append("%s: printed pages %s fall outside %s" % (where, pp, rng))
    return out


def _dup(seen, ident, where):
    if not isinstance(ident, str):
        return []
    if ident in seen:
        return ["%s: id %s is already used by %s" % (where, ident, seen[ident])]
    seen[ident] = where
    return []
