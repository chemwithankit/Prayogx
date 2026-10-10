"""The NCERT Explorer's data rules and its generated feed.

The NCERT layer is a second way into the same library: it maps the sections and printed pages of an
NCERT chapter to simulations. It never edits a simulation record. Concept pages (CON-) are what a
student explores there; existing JEE pages (ADV-) are linked by ID only, as practice.

Authoring (curated by hand, written with Python json):
    data/ncert/catalog.json                 class -> subject -> book -> chapter, official sources, editions
    data/ncert/chapters/<chapter-id>.json   sections, printed page ranges, the mapping

IDs
    book      NCERT-<CLASS>-<SUBJ>-P<n>          NCERT-11-CHE-P1
    chapter   NCERT-<CLASS>-<SUBJ>-P<n>-CH<NN>   NCERT-11-CHE-P1-CH05
    section   intro | summary | exercises | 5.1 | 5.1.4 | 5.4e   (unique within the chapter)

Each section maps
    understand  CON- concept simulations
    watch       {"sim": <CON- id>, "asset": "animation" | "reel"}: shown only once it is VERIFIED in
                tools/reel-maker/publications.json
    apply       ADV- JEE simulations ("Related JEE problems")
    planned     CON- pages approved but not built: checked for form, never shipped

A chapter may also carry `pageMap`: {"<printed page>": ["CON-...", "ADV-..."]}. This is the EXPLICIT
page -> resource mapping (owner rule, 2026-10-10): the Explorer's page panel shows a resource on a page
only if it is listed here for that page. Nothing is inferred from the section or chapter. Every ID must
be listed in the chapter's sections (CON- under `understand`, ADV- under `apply`) on a section that
contains that page.

The PDFs are never hosted or proxied. `source.official` is the NCERT download; `source.hosted` must
stay null until written permission is recorded (docs/NCERT.md).

Generated (tools/build_content.py, never edited by hand):
    content/ncert/catalog.json       the catalogue a client lists chapters from
    content/ncert/<chapter-id>.json  one chapter: sections + the cards of every simulation it links

Draft simulations stay out of the feed: a section linking one simply shows nothing for it yet.
"""
import hashlib
import json
import os
import re

import registry_schema as schema

SUBJECT_CODES = {"PHY": "Physics", "CHE": "Chemistry"}
CLASSES = (11, 12)
BOOK_ID_RE = re.compile(r"^NCERT-(11|12)-(PHY|CHE)-P[1-9]$")
CHAPTER_ID_RE = re.compile(r"^(NCERT-(?:11|12)-(?:PHY|CHE)-P[1-9])-CH(\d{2})$")
SECTION_ID_RE = re.compile(r"^(intro|summary|exercises|\d{1,2}(\.\d{1,2}){0,2}[a-z]?)$")
OFFICIAL_RE = re.compile(r"^https://ncert\.nic\.in/textbook/pdf/[a-z0-9]+\.pdf$")
SHA_RE = re.compile(r"^[0-9a-f]{64}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
WATCH_ASSETS = ("animation", "reel")

CATALOG = os.path.join("data", "ncert", "catalog.json")
FEED_DIR = os.path.join("content", "ncert")

# A card carries what the dashboard needs to list and open a simulation, and no more.
CARD_FIELDS = ["id", "title", "shortTitle", "path", "revision", "status", "subject", "chapter", "topic",
               "difficulty", "estimatedMinutes", "exam", "year", "paper", "questionNumber"]


def _load(root, rel):
    with open(os.path.join(root, rel), encoding="utf-8") as fh:
        return json.load(fh)


def load(root):
    """(catalog, {chapter id: chapter}) or raises OSError / ValueError."""
    catalog = _load(root, CATALOG)
    chapters = {}
    for book in catalog.get("books", []):
        for ch in book.get("chapters", []):
            if ch.get("file") and os.path.isfile(os.path.join(root, ch["file"])):
                chapters[ch.get("id")] = _load(root, ch["file"])
    return catalog, chapters


def exists(root):
    return os.path.isfile(os.path.join(root, CATALOG))


def _verified_media(root):
    """{(sim id, asset): [{platform, url}]} from VERIFIED records in the publication ledger.

    A record without `asset` is a reel (every record written before the NCERT track); a record
    without `platform` is Instagram. YouTube is listed first, as the better place to watch."""
    path = os.path.join(root, "tools", "reel-maker", "publications.json")
    out = {}
    if not os.path.isfile(path):
        return out
    with open(path, encoding="utf-8") as fh:
        pubs = json.load(fh).get("publications", [])
    for p in pubs if isinstance(pubs, list) else []:
        if not isinstance(p, dict) or p.get("status") != "VERIFIED" or not p.get("simulationId"):
            continue
        url = p.get("url") or p.get("permalink")
        if url:
            plat = p.get("platform", "instagram")
            out.setdefault((p["simulationId"], p.get("asset", "reel")), []).append({"platform": plat, "url": url})
    for links in out.values():
        links.sort(key=lambda l: (l["platform"] != "youtube", l["platform"]))
    return out


def mapped_concepts(root):
    """Every CON- ID a chapter section lists under `understand` (the only way a concept is published)."""
    if not exists(root):
        return set()
    try:
        _catalog, chapters = load(root)
    except (OSError, ValueError):
        return set()
    return set(i for ch in chapters.values() for s in ch.get("sections", []) for i in s.get("understand", []))


def problems(root, sims):
    """Everything wrong with the NCERT data, as messages (empty list = valid)."""
    out = []
    if not exists(root):
        return out
    try:
        catalog, chapters = load(root)
    except (OSError, ValueError) as exc:
        return ["data/ncert: cannot be read (%s)" % exc]
    by_id = dict((s.get("id"), s) for s in sims)
    seen_books, seen_chapters, files = set(), set(), set()

    for book in catalog.get("books", []):
        bid = book.get("id", "<no id>")
        if not BOOK_ID_RE.match(bid):
            out.append("%s: book ID must look like NCERT-11-CHE-P1" % bid)
            continue
        if bid in seen_books:
            out.append("%s: duplicate book" % bid)
        seen_books.add(bid)
        cls, code = int(bid.split("-")[1]), bid.split("-")[2]
        if book.get("class") != cls:
            out.append("%s: class %r does not match the ID" % (bid, book.get("class")))
        if book.get("subject") != SUBJECT_CODES[code]:
            out.append("%s: subject %r does not match the ID (%s)" % (bid, book.get("subject"), SUBJECT_CODES[code]))
        if not book.get("title"):
            out.append("%s: book has no title" % bid)

        for ch in book.get("chapters", []):
            cid = ch.get("id", "<no id>")
            m = CHAPTER_ID_RE.match(cid)
            if not m or m.group(1) != bid:
                out.append("%s: chapter ID must be %s-CH<NN>" % (cid, bid))
                continue
            if cid in seen_chapters:
                out.append("%s: duplicate chapter" % cid)
            seen_chapters.add(cid)
            if ch.get("number") != int(m.group(2)):
                out.append("%s: number %r does not match the ID" % (cid, ch.get("number")))
            if not ch.get("title"):
                out.append("%s: chapter has no title" % cid)
            want = "data/ncert/chapters/%s.json" % cid
            if ch.get("file") != want:
                out.append("%s: file must be %s" % (cid, want))
            files.add(want)

            src = ch.get("source") or {}
            if not OFFICIAL_RE.match(src.get("official") or ""):
                out.append("%s: source.official must be an https://ncert.nic.in/textbook/pdf/<file>.pdf URL" % cid)
            if src.get("hosted") is not None:
                out.append("%s: source.hosted must stay null - NCERT PDFs are not hosted or proxied without "
                           "written permission recorded in docs/DECISIONS.md" % cid)
            bp = src.get("bookPages")
            pages_ok = (isinstance(bp, list) and len(bp) == 2 and all(isinstance(x, int) and x > 0 for x in bp)
                        and bp[0] <= bp[1])
            if not pages_ok:
                out.append("%s: source.bookPages must be [first, last] printed pages" % cid)
            if not src.get("titleToken"):
                out.append("%s: source.titleToken is needed to recognise another reprint of the chapter" % cid)
            eds = src.get("editions")
            if not isinstance(eds, list) or not eds:
                out.append("%s: source.editions needs at least one fingerprinted edition" % cid)
            for ed in eds if isinstance(eds, list) else []:
                lab = ed.get("label", "<no label>")
                if not SHA_RE.match(ed.get("sha256") or ""):
                    out.append("%s: edition %s needs a lower-case sha256" % (cid, lab))
                if not isinstance(ed.get("pdfPages"), int) or ed["pdfPages"] < 1:
                    out.append("%s: edition %s needs pdfPages" % (cid, lab))
                elif pages_ok and ed.get("pageLabels") == "book" and ed["pdfPages"] != bp[1] - bp[0] + 1:
                    out.append("%s: edition %s has %d pages but bookPages span %d" % (cid, lab, ed["pdfPages"], bp[1] - bp[0] + 1))
                if ed.get("pageLabels") not in ("book", "index"):
                    out.append("%s: edition %s pageLabels must be 'book' or 'index'" % (cid, lab))
                if not DATE_RE.match(ed.get("verified") or ""):
                    out.append("%s: edition %s needs the date it was verified" % (cid, lab))

            chap = chapters.get(cid)
            if chap is None:
                out.append("%s: %s is missing" % (cid, want))
                continue
            if chap.get("id") != cid:
                out.append("%s: %s carries id %r" % (cid, want, chap.get("id")))
            out.extend(_section_problems(cid, chap, bp if pages_ok else None, by_id))

    disk = os.path.join(root, "data", "ncert", "chapters")
    if os.path.isdir(disk):
        for fn in sorted(os.listdir(disk)):
            if fn.endswith(".json") and "data/ncert/chapters/" + fn not in files:
                out.append("data/ncert/chapters/%s: not listed in data/ncert/catalog.json" % fn)
    return out


def _section_problems(cid, chap, bp, by_id):
    out = []
    secs = chap.get("sections")
    if not isinstance(secs, list) or not secs:
        return ["%s: no sections" % cid]
    seen = set()
    for s in secs:
        sid = s.get("id", "<no id>")
        where = "%s %s" % (cid, sid)
        if not SECTION_ID_RE.match(sid):
            out.append("%s: section ID must be intro, summary, exercises or like 5.1 / 5.1.4 / 5.4e" % where)
        if sid in seen:
            out.append("%s: duplicate section" % where)
        seen.add(sid)
        if not s.get("title"):
            out.append("%s: section has no title" % where)
        if s.get("level") not in (1, 2):
            out.append("%s: level must be 1 or 2" % where)
        pg = s.get("pages")
        if not (isinstance(pg, list) and len(pg) == 2 and all(isinstance(x, int) for x in pg) and pg[0] <= pg[1]):
            out.append("%s: pages must be [first, last]" % where)
        elif bp and (pg[0] < bp[0] or pg[1] > bp[1]):
            out.append("%s: pages %s fall outside the chapter's %s" % (where, pg, bp))
        for key in ("concepts", "understand", "watch", "apply", "planned"):
            if not isinstance(s.get(key, []), list):
                out.append("%s: %s must be a list" % (where, key))
        for i in s.get("understand", []):
            if schema.kind_of({"id": i}) != "concept" or not schema.valid_id(i):
                out.append("%s: understand lists %s - only CON- concept simulations belong there" % (where, i))
            elif i not in by_id:
                out.append("%s: understand lists %s, which is not in data/manifest.json" % (where, i))
        for i in s.get("apply", []):
            if schema.kind_of({"id": i}) != "question" or not schema.valid_id(i):
                out.append("%s: apply lists %s - only ADV- JEE simulations belong there" % (where, i))
            elif i not in by_id:
                out.append("%s: apply lists %s, which is not in data/manifest.json" % (where, i))
        for i in s.get("planned", []):
            if schema.kind_of({"id": i}) != "concept" or not schema.valid_id(i):
                out.append("%s: planned lists %s - only CON- IDs belong there" % (where, i))
            elif i in by_id and by_id[i].get("status", schema.DEFAULT_STATUS) != "draft":
                out.append("%s: %s is published - move it from planned to understand" % (where, i))
        for w in s.get("watch", []):
            if not isinstance(w, dict) or w.get("asset") not in WATCH_ASSETS:
                out.append("%s: watch entries are {\"sim\": <CON- id>, \"asset\": animation|reel}" % where)
            elif w.get("sim") not in s.get("understand", []):
                out.append("%s: watch %s must also be under understand in the same section" % (where, w.get("sim")))
        for key in ("understand", "apply", "planned"):
            ids = s.get(key, [])
            if isinstance(ids, list) and len(set(ids)) != len(ids):
                out.append("%s: %s repeats an ID" % (where, key))
    out += _page_map_problems(cid, chap, bp, by_id)
    return out


def _page_map_problems(cid, chap, bp, by_id):
    pm = chap.get("pageMap")
    if pm is None:
        return []
    out = []
    if not isinstance(pm, dict):
        return ["%s: pageMap must be an object {printed page: [IDs]}" % cid]
    secs = chap.get("sections", [])
    for key, ids in pm.items():
        where = "%s pageMap[%s]" % (cid, key)
        if not (isinstance(key, str) and key.isdigit()):
            out.append("%s: the key must be a printed page number" % where)
            continue
        page = int(key)
        if bp and not (bp[0] <= page <= bp[1]):
            out.append("%s: page falls outside the chapter's %s" % (where, bp))
        if not isinstance(ids, list) or not ids:
            out.append("%s: must be a non-empty list of IDs" % where)
            continue
        if len(set(ids)) != len(ids):
            out.append("%s: repeats an ID" % where)
        for i in ids:
            kind = schema.kind_of({"id": i}) if isinstance(i, str) else None
            if kind not in ("concept", "question") or not schema.valid_id(i):
                out.append("%s: %r is not a CON- or ADV- ID" % (where, i))
                continue
            if i not in by_id:
                out.append("%s: %s is not in data/manifest.json" % (where, i))
            field = "understand" if kind == "concept" else "apply"
            home = [s for s in secs if i in s.get(field, []) and s["pages"][0] <= page <= s["pages"][1]]
            if not home:
                out.append("%s: %s must be listed under %s of a section that contains page %d" % (where, i, field, page))
    return out


def _card(sim):
    out = {}
    for f in CARD_FIELDS:
        v = sim.get(f)
        if v is None or v == "" or v == []:
            continue
        out[f] = v
    out.setdefault("status", schema.DEFAULT_STATUS)
    out.setdefault("revision", 1)
    out["kind"] = schema.kind_of(sim)
    return out


def feed(root, sims):
    """{relative path: object} for content/ncert/. Pure: writes nothing."""
    if not exists(root):
        return {}
    catalog, chapters = load(root)
    live = dict((s["id"], s) for s in sims
                if s.get("id") and s.get("status", schema.DEFAULT_STATUS) != "draft")
    media = _verified_media(root)
    files = {}
    books = []
    for book in catalog.get("books", []):
        bch = []
        for ch in book.get("chapters", []):
            chap = chapters.get(ch["id"])
            if chap is None:
                continue
            cards, sections = {}, []
            for s in chap.get("sections", []):
                und = [i for i in s.get("understand", []) if i in live]
                app = [i for i in s.get("apply", []) if i in live]
                wat = [{"sim": w["sim"], "asset": w["asset"], "links": media[(w["sim"], w["asset"])]}
                       for w in s.get("watch", []) if w["sim"] in und and (w["sim"], w["asset"]) in media]
                for i in und + app:
                    cards[i] = _card(live[i])
                sections.append({"id": s["id"], "number": s.get("number", ""), "title": s["title"],
                                 "level": s["level"], "pages": s["pages"], "concepts": s.get("concepts", []),
                                 "understand": und, "watch": wat, "apply": app})
            pmap = {}
            for key, ids in sorted((chap.get("pageMap") or {}).items(), key=lambda kv: int(kv[0])):
                und = [i for i in ids if i in live and schema.kind_of(live[i]) == "concept"]
                app = [i for i in ids if i in live and schema.kind_of(live[i]) == "question"]
                if und or app:
                    pmap[key] = {"understand": und, "apply": app}
            meta = {"id": ch["id"], "number": ch["number"], "title": ch["title"],
                    "source": dict((k, v) for k, v in ch["source"].items())}
            body = {"book": {k: book[k] for k in ("id", "class", "subject", "title")},
                    "chapter": meta, "sections": sections, "pageMap": pmap,
                    "simulations": [cards[k] for k in sorted(cards)]}
            ver = _version(body)
            files["%s.json" % ch["id"]] = dict([("schemaVersion", "1.0.0"), ("version", ver)] + list(body.items()))
            n_und = len(set(i for s in sections for i in s["understand"]))
            n_app = len(set(i for s in sections for i in s["apply"]))
            bch.append({"id": ch["id"], "number": ch["number"], "title": ch["title"], "version": ver,
                        "feed": "content/ncert/%s.json" % ch["id"], "bookPages": ch["source"]["bookPages"],
                        "counts": {"sections": len(sections), "understand": n_und, "apply": n_app}})
        books.append({"id": book["id"], "class": book["class"], "subject": book["subject"],
                      "title": book["title"], "chapters": bch})
    cat = {"books": books}
    files["catalog.json"] = dict([("schemaVersion", "1.0.0"), ("version", _version(cat)),
                                  ("generatedFrom", "data/ncert/")] + list(cat.items()))
    return files


def _version(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()[:12]


def serialise(obj):
    """The exact bytes build_content.py writes, so check_library.py can compare."""
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n"
