"""The registry's shared rules: simulation IDs, folders, publication status and concept entries.

One definition, used by check_library.py, production_audit.py and auto_sim.py, so the three can
never disagree about what a valid entry is.

Question simulations (one exam question each)
    ID       ADV-<YEAR>-P<n>-<SUBJ>-Q<NN>            ADV-2026-P1-CHE-Q16
    folder   simulations/<year>/paper-<n>/<subject>/<id-lowercase>/
    files    index.html, meta.json, question.md

Concept simulations (one scientific idea, no exam question)
    ID       CON-<SUBJ>-<SLUG>                        CON-CHE-BUFFER-ACTION
             SLUG = 1-8 words of A-Z / 0-9 joined by single hyphens, whole ID <= 64 characters.
             Upper case in the ID, lower case in the folder, so it is URL- and file-system-safe
             on every platform (no case-only collisions). IDs are permanent, like question IDs.
    folder   simulations/concepts/<subject>/<id-lowercase>/
    files    index.html, meta.json, concept.md
    fields   kind "concept", id, path, folder, title, subject, chapter, topic, tags,
             learningObjectives (non-empty list), source (title / author / edition / chapter /
             pages / url / file - at least a title or a url or a file), verification.status,
             status (publication), revision, createdAt, updatedAt

Publication status (`status`; absent = the feed default, human_verified)
    human_verified   the owner (or a named reviewer) reviewed the page and signed it off
    script_verified  passed the automated pipeline - independent scientific verifier, browser /
                     UI / mobile suite, library and production audits - with no human review.
                     Never shown or described as human-verified.
    draft            built, not published: kept off the feed, crawlable pages, sitemap and lock
    deprecated       kept for old links, not promoted
    (ai_generated appears in SIMULATION_STANDARDS.md as intended vocabulary only; it is not a
    registry value.)
"""
import re

SUBJECTS = {"PHY": "physics", "CHE": "chemistry", "MAT": "mathematics"}
_SUBJ = "|".join(SUBJECTS)
QUESTION_ID_RE = re.compile(r"^ADV-\d{4}-P\d+-(%s)-Q\d{2,3}$" % _SUBJ)
CONCEPT_ID_RE = re.compile(r"^CON-(%s)-[A-Z0-9]+(?:-[A-Z0-9]+){0,7}$" % _SUBJ)
CONCEPT_ID_MAX = 64

STATUS_VALUES = ("human_verified", "script_verified", "draft", "deprecated")
DEFAULT_STATUS = "human_verified"

CONCEPT_REQUIRED = ["id", "kind", "path", "folder", "title", "subject", "chapter", "topic", "tags",
                    "learningObjectives", "source", "verification"]
# The website, the app and the crawlable pages render exam / year / paper / question number for
# every card. Until they render concepts, a concept may be registered only as a draft.
CONCEPT_PUBLISHABLE = False


def kind_of(sim):
    return "concept" if str(sim.get("id", "")).startswith("CON-") else "question"


def valid_id(sid):
    if QUESTION_ID_RE.match(sid or ""):
        return True
    return bool(CONCEPT_ID_RE.match(sid or "")) and len(sid) <= CONCEPT_ID_MAX


def concept_slug(name):
    """'Buffer action' -> 'BUFFER-ACTION'; 'SN1 vs SN2: mechanism' -> 'SN1-VS-SN2-MECHANISM'."""
    words = re.findall(r"[A-Z0-9]+", (name or "").upper())
    return "-".join(words[:8])


def concept_id(subj_code, name_or_slug):
    if subj_code not in SUBJECTS:
        raise ValueError("unknown subject code %r (%s)" % (subj_code, ", ".join(SUBJECTS)))
    slug = concept_slug(name_or_slug)
    if not slug:
        raise ValueError("a concept needs a name with letters or digits")
    cid = "CON-%s-%s" % (subj_code, slug)
    if len(cid) > CONCEPT_ID_MAX:
        raise ValueError("%s is longer than %d characters - give a shorter slug" % (cid, CONCEPT_ID_MAX))
    return cid


def concept_folder(cid):
    subj = SUBJECTS[cid.split("-")[1]]
    return "simulations/concepts/%s/%s/" % (subj, cid.lower())


def companions(sim):
    return ("meta.json", "concept.md") if kind_of(sim) == "concept" else ("meta.json", "question.md")


def concept_problems(sim):
    """Everything wrong with a concept entry, as messages (empty list = valid)."""
    sid = sim.get("id", "<no id>")
    out = []
    for f in CONCEPT_REQUIRED:
        if not sim.get(f):
            out.append("%s: concept entry is missing '%s'" % (sid, f))
    if sim.get("kind") and sim.get("kind") != "concept":
        out.append("%s: a CON- ID needs kind 'concept'" % sid)
    if valid_id(sid):
        want = concept_folder(sid)
        if sim.get("folder") and sim["folder"] != want:
            out.append("%s: concept folder must be %s" % (sid, want))
        if sim.get("path") and sim["path"] != want + "index.html":
            out.append("%s: concept path must be %sindex.html" % (sid, want))
        if sim.get("subject") and sim["subject"].lower() != SUBJECTS[sid.split("-")[1]]:
            out.append("%s: subject %r does not match the ID's %s" % (sid, sim["subject"], sid.split("-")[1]))
    lo = sim.get("learningObjectives")
    if lo is not None and (not isinstance(lo, list) or not all(isinstance(x, str) and x.strip() for x in lo)):
        out.append("%s: learningObjectives must be a list of statements" % sid)
    src = sim.get("source")
    if src is not None and (not isinstance(src, dict) or not any(src.get(k) for k in ("title", "url", "file"))):
        out.append("%s: source needs at least a title, a url or a file" % sid)
    if not CONCEPT_PUBLISHABLE and sim.get("status", DEFAULT_STATUS) != "draft":
        out.append("%s: a concept can only be registered as status 'draft' until the website, the app and "
                   "the crawlable pages render concepts (docs/AUTO_SIMULATION_PIPELINE.md §3)" % sid)
    return out
