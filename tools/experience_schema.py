"""The experience contract: the ways a student can learn a concept.

Source-agnostic. Concepts are defined once, in the concept inventory (tools/concept_schema.py);
an experience refers to one by id and never repeats it.

    Source -> Book -> Chapter -> Section -> Concept -> Learning objective -> Experience (-> future media)

    Concept -> source locations        concept_schema   (reference)
    Concept -> learning objectives     concept_schema   (semantic)
    Experience -> concept              here, conceptId
    Experience -> learning objectives  here, objective ids of that concept
    Experience -> library page         here, optional libraryId (integration)

A concept may have zero, one or many experiences. Each serves one or more of its concept's
objectives, through one learning mode.

Experience document (JSON, written with Python json; deterministic and serialisable)

    { "schemaVersion": "2.0.0",
      "experiences": [ {
          "id":         "EXP-CHE-CHEMICAL-EQUILIBRIUM-LE-CHATELIER",   stable; never a page, index or random id
          "conceptId":  "CPT-CHE-CHEMICAL-EQUILIBRIUM",               a concept in the inventory
          "type":       "virtual-lab",                                the learning mode (EXPERIENCE_TYPES)
          "title":      "Disturb the flask",
          "objectives": ["LO-CHE-CHEMICAL-EQUILIBRIUM-DISTURBANCE"],  objectives of that concept
          "status":     "planned",                                    EXPERIENCE_STATUS
          "libraryId":  null } ] }                                    optional link to a library page

`libraryId` is optional. When an experience is delivered by, or linked to, an existing PrayogX library
page (an ADV- question page or a CON- concept page, tools/registry_schema.py), it names that page, which
must then exist. A native experience (an interactive-book experience, or one from another source) has
none, and can go all the way to "published" without one. This contract does not describe how an
experience is built (no files, canvas, prompts or URLs) and carries no media or publishing fields: those
are separate layers that consume an experience by id and type.

Schema 2.0.0 replaced 1.x, in which experiences were nested inside a repeated copy of their concept.
"""
import json
import re

import concept_schema
import registry_schema

SCHEMA_MAJOR = "2"
EXPERIENCE_FIELDS = ("id", "conceptId", "type", "title", "objectives", "status", "libraryId")

# The learning mode, not the technology ("animation", not "mp4"). Several modes for one
# concept are several experiences.
EXPERIENCE_TYPES = ("simulation", "animation", "virtual-lab", "graph", "data-explorer",
                    "interactive-diagram", "molecular", "derivation", "worked-example", "practice")

# The experience's own production lifecycle. It is separate from a library page's publication
# status (registry_schema): "published" means the experience passed its own content / QA gate, not
# that a library page exists. Only when an experience is linked to a page (libraryId) is the page checked.
EXPERIENCE_STATUS = ("planned", "blueprint", "building", "review", "published", "retired")

# References to concepts and objectives follow the concept inventory's rules: one definition, not two.
CONCEPT_ID_RE = concept_schema.CONCEPT_ID_RE
LO_ID_RE = concept_schema.LO_ID_RE

# An experience id is an artifact identifier, not a semantic one: it has its own rule, built on the
# same subject / slug grammar - the form and a length limit, nothing inferred from the words (an
# experience may be called EXP-CHE-WORKED-EXAMPLE-2 or EXP-CHE-Q12).
EXP_ID_RE = re.compile(r"^EXP-(%s)-%s$" % (concept_schema.SUBJECT_PATTERN, concept_schema.SLUG_PATTERN))
EXP_ID_MAX = 72


def exp_id_problems(where, value):
    """An experience's own id: EXP-<SUBJ>-<SLUG>, at most EXP_ID_MAX characters."""
    if not isinstance(value, str) or not EXP_ID_RE.match(value) or len(value) > EXP_ID_MAX:
        return ["%s: experience id %r must look like EXP-<SUBJ>-<SLUG> (upper case, at most %d characters)"
                % (where, value, EXP_ID_MAX)]
    return []


def _code(ident):
    return ident.split("-")[1] if isinstance(ident, str) and ident.count("-") >= 2 else None


def inventory_index(inventory):
    """{conceptId: set of its objective ids} from a concept inventory document. The inventory's
    own validity is concept_schema's job; this only reads it."""
    index = {}
    for c in (inventory or {}).get("concepts", []) if isinstance(inventory, dict) else []:
        if isinstance(c, dict) and isinstance(c.get("id"), str):
            index[c["id"]] = set(lo.get("id") for lo in c.get("learningObjectives", []) or [] if isinstance(lo, dict))
    return index


def problems(doc, inventory=None, library=None):
    """Everything wrong with an experience document, as messages (empty list = valid).

    inventory: optional concept inventory document (tools/concept_schema.py). Given, every
               conceptId must name one of its concepts and every objective must be one of that
               concept's. Without it, references are checked for form only.
    library:   optional {id: library record} (data/manifest.json entries) to check libraryId."""
    if not isinstance(doc, dict):
        return ["the document must be an object"]
    out = []
    if str(doc.get("schemaVersion", "")).split(".")[0] != SCHEMA_MAJOR:
        out.append("schemaVersion must be %s.x" % SCHEMA_MAJOR)
    try:
        json.dumps(doc, allow_nan=False)
    except (TypeError, ValueError) as exc:
        out.append("the document must be plain JSON (no files, bytes, functions or objects): %s" % exc)
    if "concepts" in doc:
        out.append("concepts are defined once, in the concept inventory: reference them by conceptId")
    exps = doc.get("experiences")
    if not isinstance(exps, list):
        return out + ["experiences must be a list (it may be empty)"]
    index = inventory_index(inventory) if inventory is not None else None
    seen = {}
    for e in exps:
        out.extend(experience_problems(e, index, library, seen))
    return out


def experience_problems(e, index=None, library=None, seen=None):
    seen = {} if seen is None else seen
    if not isinstance(e, dict):
        return ["an experience must be an object"]
    eid = e.get("id")
    where = "experience %s" % (eid if eid else "<no id>")
    out = exp_id_problems(where, eid)
    if isinstance(eid, str):
        if eid in seen:
            out.append("%s: id %s is already used" % (where, eid))
        seen[eid] = True
    for k in e:
        if k not in EXPERIENCE_FIELDS:
            hint = (" (concept details live in the concept inventory; reference it by conceptId)"
                    if k in ("concept", "locations", "learningObjectives", "subject", "description") else "")
            out.append("%s: %r is not an experience field (%s)%s" % (where, k, ", ".join(EXPERIENCE_FIELDS), hint))

    cid = e.get("conceptId")
    cprob = concept_schema.id_problems(where, cid, CONCEPT_ID_RE, "concept")
    if cid is None:
        out.append("%s: needs a conceptId (the concept it teaches)" % where)
    else:
        out.extend(cprob)
    if not cprob and isinstance(eid, str) and _code(eid) != _code(cid):
        out.append("%s: subject code differs from its concept's" % where)

    if e.get("type") not in EXPERIENCE_TYPES:
        out.append("%s: type %r is not one of %s" % (where, e.get("type"), ", ".join(EXPERIENCE_TYPES)))
    if not isinstance(e.get("title"), str) or not e["title"].strip():
        out.append("%s: needs a title" % where)
    obj = e.get("objectives")
    if not isinstance(obj, list) or not obj:
        out.append("%s: must serve at least one learning objective" % where)
        obj = []
    if len(set(o for o in obj if isinstance(o, str))) != len(obj):
        out.append("%s: lists an objective twice" % where)
    for o in obj:
        oprob = concept_schema.id_problems(where, o, LO_ID_RE, "objective")
        out.extend(oprob)
        if not oprob and not cprob and _code(o) != _code(cid):
            out.append("%s: objective %s is for another subject than its concept" % (where, o))
    if index is not None and cid is not None and not cprob:
        if cid not in index:
            out.append("%s: concept %s is not in the inventory" % (where, cid))
        else:
            for o in obj:
                if isinstance(o, str) and o not in index[cid]:
                    out.append("%s: objective %s is not one of %s's" % (where, o, cid))
    if e.get("status") not in EXPERIENCE_STATUS:
        out.append("%s: status %r is not one of %s" % (where, e.get("status"), ", ".join(EXPERIENCE_STATUS)))
    out.extend(_library_problems(where, e, library))
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


def experiences_for(doc, concept_id):
    """The experiences of one concept, in document order (zero, one or many)."""
    return [dict(e) for e in (doc or {}).get("experiences", []) if isinstance(e, dict) and e.get("conceptId") == concept_id]
