"""The content contract behind the reading experience: concept -> learning objective -> experience.

Source-agnostic. NCERT is the first source; nothing here depends on it.

    Source -> Book -> Chapter -> Section -> Concept -> Learning objective -> Experience (-> future media)

A CONCEPT is the semantic learning unit ("Internal energy"). It is not a page and not a simulation:
pages are only where it appears (locations); simulations are one of several ways to learn it
(experiences). A concept may have zero, one or many experiences, and one or many objectives.

Authoring document (JSON, written with Python json; deterministic and serialisable)

    { "schemaVersion": "1.0.0",
      "concepts": [ {
          "id":       "CPT-CHE-INTERNAL-ENERGY",          stable; never a page, index or random id
          "title":    "Internal energy",
          "subject":  "Chemistry",
          "locations": [                                   where the concept appears; one or many
              { "sourceId": "NCERT", "chapterId": "NCERT-11-CHE-P1-CH05",
                "sectionId": "5.1.4", "printedPages": [138, 140] } ],     sectionId, printedPages optional
          "learningObjectives": [                          one or many
              { "id": "LO-CHE-INTERNAL-ENERGY-HEAT-WORK",
                "statement": "Explain how heat and work together change the internal energy of a system.",
                "verb": "explain" } ],                     verb optional, from LO_VERBS
          "experiences": [                                 zero, one or many; nested, so conceptId is implied
              { "id": "EXP-CHE-INTERNAL-ENERGY-TWO-PATHS",
                "type": "simulation",                      the learning mode (EXPERIENCE_TYPES), not a technology
                "title": "Two paths, one change",
                "objectives": ["LO-CHE-INTERNAL-ENERGY-HEAT-WORK"],   objectives of the same concept
                "status": "planned",                       EXPERIENCE_STATUS
                "libraryId": null } ] } ] }               optional link to an existing library page

`libraryId` is optional. When an experience is delivered by, or linked to, an existing PrayogX library
page (an ADV- question page or a CON- concept page, tools/registry_schema.py), it names that page, which
must then exist. A native experience (an interactive-book experience, or one from another source) has
none, and can go all the way to "published" without one. This contract does not describe how an experience is built (no files,
canvas, prompts or URLs) and carries no media or publishing fields: those are separate layers that
consume an experience by id and type.

Runtime records (`flatten`) are the same data, normalised for a client: experiences and objectives
carry their conceptId. Never PDF.js objects, DOM nodes, files or UI state.
"""
import json
import re

import registry_schema

SCHEMA_MAJOR = "1"

# The learning mode, not the technology ("animation", not "mp4"). Several modes for one
# concept are several experiences.
EXPERIENCE_TYPES = ("simulation", "animation", "virtual-lab", "graph", "data-explorer",
                    "interactive-diagram", "molecular", "derivation", "worked-example", "practice")

# The experience's own production lifecycle. It is separate from a library page's publication
# status (registry_schema): "published" means the experience passed its own content / QA gate, not
# that a library page exists. Only when an experience is linked to a page (libraryId) is the page checked.
EXPERIENCE_STATUS = ("planned", "blueprint", "building", "review", "published", "retired")

# What the student will be able to do. Optional on an objective; kept short on purpose.
LO_VERBS = ("identify", "describe", "visualize", "explain", "compare", "predict",
            "calculate", "derive", "apply", "analyze")

_SUBJ = "|".join(registry_schema.SUBJECTS)
_SLUG = r"[A-Z0-9]+(?:-[A-Z0-9]+){0,9}"
CONCEPT_ID_RE = re.compile(r"^CPT-(%s)-%s$" % (_SUBJ, _SLUG))
LO_ID_RE = re.compile(r"^LO-(%s)-%s$" % (_SUBJ, _SLUG))
EXP_ID_RE = re.compile(r"^EXP-(%s)-%s$" % (_SUBJ, _SLUG))
SOURCE_ID_RE = re.compile(r"^[A-Z][A-Z0-9]{1,15}$")
ID_MAX = 72
# a word that is a page reference or a bare number: identity must not depend on pages or order
_POSITIONAL = re.compile(r"^(PAGE|PG|PP|P\d+|PG\d+|PAGE\d+|\d+)$")
_UUIDISH = re.compile(r"[0-9A-F]{8}-?[0-9A-F]{4}")
# an objective describes learning, not the controls ("Use the slider ...")
_UI_START = re.compile(r"^\s*(use|click|tap|drag|press|move|slide|toggle|select|open|scroll)\b", re.I)


def _id_problems(where, value, rx, kind):
    out = []
    if not isinstance(value, str) or not rx.match(value) or len(value) > ID_MAX:
        return ["%s: %s id %r must look like %s" % (where, kind, value, rx.pattern)]
    words = value.split("-")[2:]
    if any(_POSITIONAL.match(w) for w in words) or _UUIDISH.search(value):
        out.append("%s: %s id %r must name the idea, not a page, a position or a random value" % (where, kind, value))
    return out


def _subject_code(cid):
    return cid.split("-")[1] if isinstance(cid, str) and cid.count("-") >= 2 else None


def problems(doc, library=None, structure=None):
    """Everything wrong with an authoring document, as messages (empty list = valid).

    library:   optional {id: library record} (data/manifest.json entries) to check libraryId.
    structure: optional {chapterId: {"sections": {id: [first, last]}, "pages": [first, last]}}
               to check locations against a known book structure. Locations in chapters it
               does not know are checked for form only, so other sources validate too."""
    out = []
    if not isinstance(doc, dict):
        return ["the document must be an object"]
    if str(doc.get("schemaVersion", "")).split(".")[0] != SCHEMA_MAJOR:
        out.append("schemaVersion must be %s.x" % SCHEMA_MAJOR)
    concepts = doc.get("concepts")
    if not isinstance(concepts, list):
        return out + ["concepts must be a list"]
    try:
        json.dumps(doc, allow_nan=False)
    except (TypeError, ValueError) as exc:
        out.append("the document must be plain JSON (no files, bytes, functions or objects): %s" % exc)

    seen = {}
    for c in concepts:
        if not isinstance(c, dict):
            out.append("a concept must be an object")
            continue
        cid = c.get("id", "<no id>")
        where = "concept %s" % cid
        out.extend(_id_problems(where, cid, CONCEPT_ID_RE, "concept"))
        code = _subject_code(cid)
        if not isinstance(c.get("title"), str) or not c["title"].strip():
            out.append("%s: needs a title" % where)
        if code in registry_schema.SUBJECTS and str(c.get("subject", "")).lower() != registry_schema.SUBJECTS[code]:
            out.append("%s: subject %r does not match the id's %s" % (where, c.get("subject"), code))

        locs = c.get("locations")
        if not isinstance(locs, list) or not locs:
            out.append("%s: needs at least one location (where the concept appears)" % where)
            locs = []
        for i, loc in enumerate(locs):
            out.extend(_location_problems("%s location %d" % (where, i + 1), loc, structure))

        los = c.get("learningObjectives")
        if not isinstance(los, list) or not los:
            out.append("%s: needs at least one learning objective" % where)
            los = []
        lo_ids = set()
        for lo in los:
            if not isinstance(lo, dict):
                out.append("%s: a learning objective must be an object" % where)
                continue
            lid = lo.get("id", "<no id>")
            lw = "%s objective %s" % (where, lid)
            out.extend(_id_problems(lw, lid, LO_ID_RE, "objective"))
            if _subject_code(lid) not in (None, code):
                out.append("%s: subject code differs from its concept's" % lw)
            st = lo.get("statement")
            if not isinstance(st, str) or len(st.strip()) < 12:
                out.append("%s: needs a statement of what the student will be able to do" % lw)
            elif _UI_START.match(st):
                out.append("%s: describes the controls (%r), not the learning" % (lw, st.split()[0]))
            if "verb" in lo and lo["verb"] not in LO_VERBS:
                out.append("%s: verb %r is not one of %s" % (lw, lo["verb"], ", ".join(LO_VERBS)))
            out.extend(_dup(seen, lid, lw))
            lo_ids.add(lid)

        exps = c.get("experiences")
        if not isinstance(exps, list):
            out.append("%s: experiences must be a list (it may be empty)" % where)
            exps = []
        for e in exps:
            if not isinstance(e, dict):
                out.append("%s: an experience must be an object" % where)
                continue
            eid = e.get("id", "<no id>")
            ew = "%s experience %s" % (where, eid)
            out.extend(_id_problems(ew, eid, EXP_ID_RE, "experience"))
            if _subject_code(eid) not in (None, code):
                out.append("%s: subject code differs from its concept's" % ew)
            if e.get("type") not in EXPERIENCE_TYPES:
                out.append("%s: type %r is not one of %s" % (ew, e.get("type"), ", ".join(EXPERIENCE_TYPES)))
            if not isinstance(e.get("title"), str) or not e["title"].strip():
                out.append("%s: needs a title" % ew)
            obj = e.get("objectives")
            if not isinstance(obj, list) or not obj:
                out.append("%s: must serve at least one learning objective" % ew)
            else:
                for o in obj:
                    if o not in lo_ids:
                        out.append("%s: objective %s is not one of this concept's" % (ew, o))
            if e.get("status") not in EXPERIENCE_STATUS:
                out.append("%s: status %r is not one of %s" % (ew, e.get("status"), ", ".join(EXPERIENCE_STATUS)))
            out.extend(_library_problems(ew, e, library))
            out.extend(_dup(seen, eid, ew))
        out.extend(_dup(seen, cid, where))
    return out


def _dup(seen, ident, where):
    if not isinstance(ident, str):
        return []
    if ident in seen:
        return ["%s: id %s is already used by %s" % (where, ident, seen[ident])]
    seen[ident] = where
    return []


def _location_problems(where, loc, structure):
    out = []
    if not isinstance(loc, dict):
        return ["%s: must be an object" % where]
    if not SOURCE_ID_RE.match(str(loc.get("sourceId", ""))):
        out.append("%s: sourceId must be a short upper-case source name (A-Z, 0-9)" % where)
    if not isinstance(loc.get("chapterId"), str) or not loc["chapterId"]:
        out.append("%s: needs a chapterId" % where)
    if "sectionId" in loc and (not isinstance(loc["sectionId"], str) or not loc["sectionId"]):
        out.append("%s: sectionId, when given, must be a section id" % where)
    pp = loc.get("printedPages")
    if pp is not None and not (isinstance(pp, list) and len(pp) == 2 and all(isinstance(x, int) and x > 0 for x in pp)
                               and pp[0] <= pp[1]):
        out.append("%s: printedPages, when given, must be [first, last]" % where)
        pp = None
    for k in loc:
        if k not in ("sourceId", "chapterId", "sectionId", "printedPages"):
            out.append("%s: unknown field %r (a location is a reference, not content)" % (where, k))
    known = (structure or {}).get(loc.get("chapterId"))
    if known:
        secs = known.get("sections", {})
        if "sectionId" in loc and loc["sectionId"] not in secs:
            out.append("%s: section %s is not in %s" % (where, loc["sectionId"], loc["chapterId"]))
        rng = secs.get(loc.get("sectionId")) or known.get("pages")
        if pp and rng and (pp[0] < rng[0] or pp[1] > rng[1]):
            out.append("%s: printed pages %s fall outside %s" % (where, pp, rng))
    return out


def _library_problems(where, e, library):
    """libraryId is optional. Absent (null), the experience is native: nothing about it depends on
    the library, whatever its status. Present, it says "delivered by / linked to this existing
    library page", so the page must exist; the experience and the page keep separate lifecycles,
    and only a published experience needs a published page behind it."""
    lib = e.get("libraryId")
    if lib is None:
        return []
    if not registry_schema.valid_id(lib):
        return ["%s: libraryId %r is not a library id (ADV- or CON-)" % (where, lib)]
    out = []
    if e.get("type") == "practice" and registry_schema.kind_of({"id": lib}) != "question":
        out.append("%s: a practice experience is delivered by a question page (ADV-)" % where)
    if library is not None:
        rec = library.get(lib)
        if rec is None:
            out.append("%s: libraryId %s is not in the library (leave it null until the page exists)" % (where, lib))
        elif e.get("status") == "published" and rec.get("status", registry_schema.DEFAULT_STATUS) in ("draft", "deprecated"):
            out.append("%s: published, but the page that delivers it (%s) is %s" % (where, lib, rec.get("status")))
    return out


def flatten(doc):
    """Runtime records for a client: plain, normalised copies; experiences and objectives
    carry their conceptId. Assumes problems(doc) == []."""
    concepts, objectives, experiences = [], [], []
    for c in doc.get("concepts", []):
        concepts.append({"id": c["id"], "title": c["title"], "subject": c.get("subject"),
                         "locations": [dict(l) for l in c.get("locations", [])],
                         "objectiveIds": [lo["id"] for lo in c.get("learningObjectives", [])],
                         "experienceIds": [e["id"] for e in c.get("experiences", [])]})
        for lo in c.get("learningObjectives", []):
            objectives.append(dict(lo, conceptId=c["id"]))
        for e in c.get("experiences", []):
            experiences.append(dict(e, conceptId=c["id"], objectives=list(e.get("objectives", []))))
    return {"concepts": concepts, "objectives": objectives, "experiences": experiences}
