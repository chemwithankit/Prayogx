#!/usr/bin/env python3
"""PrayogX Learn - build and check the school learning portal (Class -> Subject -> Chapter -> Topic).

    python3 tools/build_learn.py            validate every topic, then write the pages
    python3 tools/build_learn.py --check    validate only (exit 1 on any problem); writes nothing
    python3 tools/build_learn.py --online   also ask YouTube's public oEmbed endpoint whether each video embeds

Sources of truth:
  data/learn/curriculum.json         classes (9, 10, 11, 12, Extra) -> subjects -> ordered chapters (with aliases)
  data/learn/topics/<slug>.json      one per Doodle topic (format in docs/LEARN_PUBLISHING.md)
Each topic's own assets sit beside its page: learn/<slug>/notes.pdf (the same approved Drive notes, exported),
learn/<slug>/img/ (the notes' diagrams), learn/<slug>/thumb.jpg (the reel cover) and, only when the topic's
simulation decision is REQUIRED, learn/<slug>/sim.html.

Generated (never hand-edit): learn/index.html (the five class cards), learn/<class>/index.html (subjects),
learn/<class>/<subject>/index.html (chapter-wise and topic-wise views) and learn/<slug>/index.html (topic pages).
Only topics with "status": "ready" are written and listed; drafts are validated but stay off the site. Every topic
must sit in a chapter of curriculum.json (Extra topics group by their own theme). The sitemap takes the pages from
learn_urls(), called by tools/build_content.py.

The website is its own destination: a topic's Instagram / YouTube state never decides it. A video that YouTube does
not embed (still private) is reported by --online as a manual action; it does not block the page, which always
links the Instagram reel as well.
"""
import argparse
import glob
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOPICS = os.path.join(ROOT, "data", "learn", "topics")
CURRICULUM = os.path.join(ROOT, "data", "learn", "curriculum.json")
OUT = os.path.join(ROOT, "learn")
SITE_URL = "https://prayogx.co.in"
COLOR = {"Physics": "var(--subj-physics)", "Chemistry": "var(--subj-chemistry)",
         "Mathematics": "var(--subj-mathematics)", "Biology": "#c2185b", "Science": "#0f8a8a"}
DECISIONS = ("REQUIRED", "NOT_REQUIRED")
SIM_STATUS = ("pass", "pending")
YT_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
IG_URL = re.compile(r"^https://www\.instagram\.com/reel/[A-Za-z0-9_-]+/$")
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
PDF_MAX = 6 * 1024 * 1024
RESERVED = set()   # slugs a topic may not take: the class folders (filled from the curriculum)


def esc(t):
    return html.escape(str(t), quote=True)


def inline(t):
    """escape, then allow **bold** only"""
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", esc(t))


def plain(t):
    return re.sub(r"\*\*(.+?)\*\*", r"\1", str(t))


def slugify(t):
    return re.sub(r"[^a-z0-9]+", "-", str(t).lower()).strip("-")


def load():
    out = []
    for p in sorted(glob.glob(os.path.join(TOPICS, "*.json"))):
        with open(p, encoding="utf-8") as fh:
            t = json.load(fh)
        t["_file"] = os.path.relpath(p, ROOT)
        out.append(t)
    return out


def load_curriculum():
    with open(CURRICULUM, encoding="utf-8") as fh:
        cur = json.load(fh)
    for c in cur["classes"]:
        RESERVED.add(c["id"])
    return cur


# ------------------------------------------------------------------ placement
def class_of(cur, t):
    for c in cur["classes"]:
        if str(c["class"]) == str(t.get("class")):
            return c
    return None


def place(cur, t):
    """(class, subject, chapter index or None, chapter name) or raises ValueError"""
    c = class_of(cur, t)
    if not c:
        raise ValueError("class %r is not in curriculum.json" % t.get("class"))
    subs = [s for s in c["subjects"] if t.get("subject") in s["disciplines"]]
    if not subs:
        raise ValueError("no %s subject takes %s topics" % (c["label"], t.get("subject")))
    s = subs[0]
    if c["id"] == "extra":
        return c, s, None, t["chapter"]
    for i, chp in enumerate(s["chapters"]):
        if t.get("chapter") == chp["name"] or t.get("chapter") in chp.get("aliases", []):
            return c, s, i, chp["name"]
    raise ValueError("chapter %r is not a %s %s chapter in curriculum.json" % (t.get("chapter"), c["label"], s["name"]))


# ------------------------------------------------------------------ validation
def problems(t, slugs, cur):
    p = []
    need = ("id", "slug", "status", "class", "subject", "chapter", "topic", "title", "summary", "video", "notes",
            "keyPoints", "sections", "quiz", "simulation")
    for k in need:
        if k not in t or t[k] in ("", None, [], {}):
            p.append("missing %s" % k)
    if p:
        return p
    slug = t["slug"]
    if not SLUG.match(slug):
        p.append("slug %r is not lower-case-hyphenated" % slug)
    if slug in RESERVED:
        p.append("slug %r is reserved for a class folder" % slug)
    if os.path.basename(t["_file"]) != slug + ".json":
        p.append("file name must be %s.json" % slug)
    if t["status"] not in ("draft", "ready"):
        p.append("status must be draft or ready")
    if t["subject"] not in ("Physics", "Chemistry", "Mathematics", "Biology"):
        p.append("subject must be Physics, Chemistry, Mathematics or Biology")
    try:
        place(cur, t)
    except ValueError as e:
        p.append(str(e))
    if "tags" in t and (not isinstance(t["tags"], list) or not all(isinstance(x, str) and x for x in t["tags"])):
        p.append("tags must be a list of words or phrases")
    v = t["video"]
    if not YT_ID.match(v.get("youtubeId", "")):
        p.append("video.youtubeId is not an 11-character YouTube ID")
    if not IG_URL.match(v.get("instagram", "")):
        p.append("video.instagram is not an Instagram reel URL")
    d = os.path.join(OUT, slug)
    pdf = os.path.join(d, t["notes"].get("pdf", ""))
    if not t["notes"].get("pdf") or not os.path.isfile(pdf):
        p.append("notes PDF missing: learn/%s/%s" % (slug, t["notes"].get("pdf")))
    else:
        with open(pdf, "rb") as fh:
            if fh.read(5) != b"%PDF-":
                p.append("notes PDF is not a PDF")
        if os.path.getsize(pdf) > PDF_MAX:
            p.append("notes PDF over %d MB" % (PDF_MAX // 1048576))
    if not t["notes"].get("driveDoc"):
        p.append("notes.driveDoc (the approved Drive notes it was exported from) is missing")
    if t.get("thumb") and not os.path.isfile(os.path.join(d, t["thumb"])):
        p.append("thumb missing: learn/%s/%s" % (slug, t["thumb"]))
    for s in t["sections"]:
        if not s.get("h") or not s.get("blocks"):
            p.append("a section needs h and blocks")
            continue
        for b in s["blocks"]:
            kinds = [k for k in ("p", "formula", "img", "table", "list") if k in b]
            if len(kinds) != 1:
                p.append("section %r: each block has exactly one of p/formula/img/table/list" % s["h"])
            if "img" in b:
                if not os.path.isfile(os.path.join(d, b["img"])):
                    p.append("image missing: learn/%s/%s" % (slug, b["img"]))
                if not b.get("alt"):
                    p.append("image %s needs alt text" % b["img"])
            if "table" in b:
                tb = b["table"]
                w = len(tb.get("head", []))
                if not w or any(len(r) != w for r in tb.get("rows", [])):
                    p.append("section %r: table rows must match the header width" % s["h"])
    # quiz: 3-5 questions, 3-5 distinct options, a valid answer and an explanation each
    qs = t["quiz"]
    if not 3 <= len(qs) <= 5:
        p.append("quiz must have 3-5 questions (has %d)" % len(qs))
    seen = set()
    for i, q in enumerate(qs, 1):
        opts = q.get("options") or []
        if not q.get("q") or not q.get("explain"):
            p.append("quiz Q%d needs q and explain" % i)
        if q.get("q") in seen:
            p.append("quiz Q%d repeats a question" % i)
        seen.add(q.get("q"))
        if not 3 <= len(opts) <= 5 or len(set(o.strip().lower() for o in opts)) != len(opts):
            p.append("quiz Q%d needs 3-5 distinct options" % i)
        a = q.get("answer")
        if not isinstance(a, int) or isinstance(a, bool) or not 0 <= a < len(opts):
            p.append("quiz Q%d answer must be an option index (0-%d)" % (i, len(opts) - 1))
        elif q.get("answerText") is not None and q["answerText"] != opts[a]:
            p.append("quiz Q%d answerText does not match options[answer]" % i)
    sim = t["simulation"]
    if sim.get("decision") not in DECISIONS:
        p.append("simulation.decision must be REQUIRED or NOT_REQUIRED")
    if not sim.get("reason"):
        p.append("simulation.reason is required either way")
    if sim.get("decision") == "REQUIRED":
        if sim.get("status") not in SIM_STATUS:
            p.append("a REQUIRED simulation needs status pass or pending")
        for k in ("objective", "instructions"):
            if not sim.get(k):
                p.append("a REQUIRED simulation needs %s" % k)
        if sim.get("status") == "pass" and not os.path.isfile(os.path.join(d, sim.get("path", "sim.html"))):
            p.append("simulation marked pass but learn/%s/%s is missing" % (slug, sim.get("path", "sim.html")))
    for r in t.get("related", []):
        if r not in slugs:
            p.append("related topic %r does not exist" % r)
    return p


def curriculum_problems(cur):
    p = []
    ids = [c["id"] for c in cur.get("classes", [])]
    if len(set(ids)) != len(ids):
        p.append("duplicate class ids")
    for c in cur.get("classes", []):
        sids = [s["id"] for s in c["subjects"]]
        if len(set(sids)) != len(sids):
            p.append("%s: duplicate subject ids" % c["id"])
        for s in c["subjects"]:
            names = [x["name"] for x in s["chapters"]]
            if len(set(names)) != len(names):
                p.append("%s/%s: duplicate chapters" % (c["id"], s["id"]))
    return p


def youtube_embeddable(vid):
    """YouTube's public oEmbed answers 200 for public / unlisted videos, 401/403/404 for private or missing"""
    url = "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" + vid
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "PrayogX-learn-check"}), timeout=15) as r:
            return r.status == 200, "embeds"
    except urllib.error.HTTPError as e:
        return False, "HTTP %d (private or unavailable: switch it to unlisted in YouTube Studio)" % e.code
    except Exception as e:  # noqa: BLE001 - report, never crash the build on a network blip
        return None, "could not check (%s)" % e.__class__.__name__



# ------------------------------------------------------------------ icons (inline, stroke = currentColor)
ICON = {
    "science": '<circle cx="12" cy="12" r="1.8"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>',
    "physics": '<circle cx="12" cy="12" r="1.8"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>',
    "chemistry": '<path d="M9 3h6M10 3v6.5L4.6 18.7A1.6 1.6 0 0 0 6 21h12a1.6 1.6 0 0 0 1.4-2.3L14 9.5V3"/><path d="M7.5 15h9"/>',
    "biology": '<path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14z"/><path d="M5 19c3-4 6-7 10-10"/>',
    "mathematics": '<path d="M5 7h14M9 7v11M15 7v8.5a2.5 2.5 0 0 0 4 2"/>',
    "extra": '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/>',
    "play": '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    "lock": '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "back": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    "doc": '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
}


def icon(name, size=24, cls="ico"):
    return ('<svg class="%s" viewBox="0 0 24 24" width="%d" height="%d" fill="none" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">%s</svg>') % (cls, size, size, ICON[name])


def subj_icon(s):
    return icon(s["id"] if s["id"] in ICON else "science")


# ------------------------------------------------------------------ page shell
MARK = ('<svg class="pxmark" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" '
        'rx="8" fill="var(--accent)"/><path d="M12.5 6.5h7M13.6 6.5v7.2L7.9 24.1a1.5 1.5 0 0 0 1.3 2.3h13.6a1.5 1.5 0 0 0 '
        '1.3-2.3l-5.7-10.4V6.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
        '<path d="M10.6 20.6h10.8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>')


def shell(title, desc, canon, up, body):
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
<link rel="canonical" href="%(canon)s">
<meta property="og:type" content="article">
<meta property="og:site_name" content="PrayogX">
<meta property="og:title" content="%(title)s">
<meta property="og:description" content="%(desc)s">
<meta name="theme-color" content="#2a78d6">
<link rel="stylesheet" href="%(up)ssite/site.css">
<link rel="stylesheet" href="%(up)slearn/learn.css">
<link rel="icon" href="%(up)ssite/icons/mark.svg">
</head>
<body class="learn">
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="inner">
    <a class="brand" href="%(up)slearn/" aria-label="PrayogX Learn home">
      %(mark)s
      <span class="brand-text">
        <span class="brand-title">PRAYOG<i>X</i></span>
        <span class="brand-kicker">Learn · Classes 9–12</span>
      </span>
    </a>
    <nav class="navlinks" aria-label="Sections"><a href="%(up)slearn/">Learn</a><a href="%(up)s#/jee">JEE Simulations</a>
    <button class="themebtn" id="themebtn" type="button" aria-label="Switch colour theme">◐</button></nav>
  </div>
</header>
<main id="main"><div class="inner">
%(body)s
</div></main>
<footer class="site-foot"><div class="inner"><span><strong>PrayogX Learn</strong> · Doodle explainers, short notes and practice quizzes for Classes 9–12</span>
<span class="dot">·</span><a href="%(up)s">PrayogX home</a></div></footer>
<script src="%(up)slearn/learn.js"></script>
</body>
</html>
""" % {"title": esc(title), "desc": esc(desc), "canon": esc(canon), "up": up, "mark": MARK, "body": body}


def crumbs(items):
    """items: [(label, href or None)]"""
    out = []
    for i, (label, href) in enumerate(items):
        if i:
            out.append('<span class="sep" aria-hidden="true">›</span>')
        out.append('<a href="%s">%s</a>' % (esc(href), esc(label)) if href else '<span aria-current="page">%s</span>' % esc(label))
    return '<nav class="crumbs" aria-label="Breadcrumb">%s</nav>' % "".join(out)


def subj_color(s):
    return COLOR.get(s["name"], "var(--accent)")


def block_html(b):
    if "p" in b:
        return "<p>%s</p>" % inline(b["p"])
    if "formula" in b:
        return '<p><span class="formula">%s</span></p>' % inline(b["formula"])
    if "list" in b:
        return "<ul>%s</ul>" % "".join("<li>%s</li>" % inline(x) for x in b["list"])
    if "img" in b:
        cap = '<figcaption>%s</figcaption>' % inline(b["caption"]) if b.get("caption") else ""
        return '<figure><img src="%s" alt="%s" loading="lazy">%s</figure>' % (esc(b["img"]), esc(b["alt"]), cap)
    tb = b["table"]
    head = "".join("<th>%s</th>" % inline(h) for h in tb["head"])
    rows = "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % inline(c) for c in r) for r in tb["rows"])
    return '<div class="tablewrap"><table class="ltable"><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (head, rows)


# ------------------------------------------------------------------ structure helpers
def norm(t):
    return re.sub(r"[^a-z0-9]+", " ", str(t).lower()).strip()


def chapters_of(cur, ready, c, s):
    """the subject's chapters, each {name, slug, n, about, discipline, planned, items}; items = ordered topic rows:
    {"title", "topic" (a ready topic or None)}. Extra subjects take their chapters (themes) from the topics."""
    mine = [t for t in ready if place(cur, t)[0] is c and place(cur, t)[1] is s]
    mine.sort(key=lambda t: t.get("series", 0))
    if c["id"] == "extra":
        src = []
        for t in mine:
            n = place(cur, t)[3]
            if n not in [x["name"] for x in src]:
                src.append({"name": n})
    else:
        src = s["chapters"]
    out = []
    for i, chp in enumerate(src):
        have = [t for t in mine if place(cur, t)[3] == chp["name"]]
        used, items = set(), []
        for title in chp.get("planned", []):
            hit = next((t for t in have if norm(t["topic"]) == norm(title) or norm(t["title"]) == norm(title)), None)
            if hit:
                used.add(hit["slug"])
            items.append({"title": hit["title"] if hit else title, "topic": hit})
        items += [{"title": t["title"], "topic": t} for t in have if t["slug"] not in used]
        out.append({"name": chp["name"], "slug": slugify(chp["name"]), "n": None if c["id"] == "extra" else i + 1,
                    "about": chp.get("about", ""), "discipline": chp.get("discipline"), "items": items,
                    "videos": [it["topic"] for it in items if it["topic"]], "planned": bool(chp.get("planned"))})
    return out


def chapter_of_topic(cur, ready, t):
    c, s, _, chname = place(cur, t)
    for chp in chapters_of(cur, ready, c, s):
        if chp["name"] == chname:
            return c, s, chp
    raise ValueError(t["slug"])


def count_txt(n, word):
    return "%d %s%s" % (n, word, "" if n == 1 else "s")


def topic_card(t, prefix, cur, show_chapter=True):
    c, s, i, chname = place(cur, t)
    has_sim = t["simulation"]["decision"] == "REQUIRED" and t["simulation"].get("status") == "pass"
    thumb = ('<span class="thumbwrap"><img class="thumb" src="%s%s/%s" alt="" loading="lazy" width="68" height="120">'
             '<span class="playdot">%s</span></span>' % (prefix, esc(t["slug"]), esc(t["thumb"]), icon("play", 16))
             if t.get("thumb") else '<span class="thumbwrap ph">%s</span>' % icon("play", 22))
    search = " ".join([t["title"], t["topic"], t["summary"], chname, t["subject"], " ".join(t.get("tags", [])),
                       " ".join(plain(k) for k in t["keyPoints"])]).lower()
    meta = [chname] if show_chapter else []
    meta.append(t["subject"])
    if has_sim:
        meta.append("simulation")
    return ('<a class="vcard" style="--c:%s" href="%s%s/" data-search="%s" data-discipline="%s" data-chapter="%s">%s'
            '<span class="vbody"><span class="t">%s</span><span class="s">%s</span><span class="m">%s</span></span></a>') % (
        COLOR.get(t["subject"], "var(--accent)"), prefix, esc(t["slug"]), esc(search), esc(t["subject"]), esc(chname), thumb,
        esc(t["title"]), esc(t["summary"]), esc(" · ".join(meta)))


# ------------------------------------------------------------------ topic (video) page
def topic_page(t, by_slug, ready, cur):
    slug = t["slug"]
    c, s, chp = chapter_of_topic(cur, ready, t)
    col = COLOR.get(t["subject"], "var(--accent)")
    pdf = os.path.join(OUT, slug, t["notes"]["pdf"])
    kb = os.path.getsize(pdf) / 1024.0
    size = "%.1f MB" % (kb / 1024) if kb > 1024 else "%d KB" % kb
    sim = t["simulation"]
    has_sim = sim["decision"] == "REQUIRED" and sim.get("status") == "pass"
    chap_href = "../%s/%s/%s/" % (c["id"], s["id"], chp["slug"])
    nav = crumbs([("Learn", "../"), (c["label"], "../%s/" % c["id"]), (s["name"], "../%s/%s/" % (c["id"], s["id"])),
                  (chp["name"], chap_href)])
    vids = chp["videos"]
    k = vids.index(t)
    prev_t = vids[k - 1] if k > 0 else None
    next_t = vids[k + 1] if k + 1 < len(vids) else None
    chapnum = ("Chapter %d · " % chp["n"]) if chp["n"] else ""
    upnext = ""
    if next_t:
        upnext = ('<a class="upnext" href="../%s/"><span class="k">Up next in this chapter</span>%s</a>' % (
            esc(next_t["slug"]), topic_card(next_t, "../", cur, show_chapter=False).replace('<a class="vcard"', '<span class="vcard"').replace("</a>", "</span>")))
    else:
        upnext = ('<a class="upnext done" href="%s"><span class="k">%s</span><span class="ut">%s %s</span></a>' % (
            esc(chap_href), "That's all the videos in this chapter so far", icon("back", 18), esc("Back to " + chp["name"])))
    hero = """
<div class="thead"><span class="chip subj">%(ctx)s</span><h1>%(title)s</h1></div>
<div class="watch">
  <div class="player">
    <div class="video"><iframe src="https://www.youtube-nocookie.com/embed/%(yt)s?rel=0&amp;modestbranding=1&amp;playsinline=1"
      title="%(title)s: Doodle explainer video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
    <p class="video-alt">Video not playing? <a href="%(ig)s" rel="noopener" target="_blank">Watch on Instagram</a> ·
      <a href="https://www.youtube.com/shorts/%(yt)s" rel="noopener" target="_blank">YouTube</a></p>
  </div>
  <div class="side">
    <p class="lede">%(lede)s</p>
    <a class="dl" href="%(pdf)s" download="%(dlname)s"><span class="ico">%(doc)s</span>
      <span><span class="t">Download the short notes</span><br><span class="s">PDF, %(size)s · solved examples, practice set and answer key</span></span></a>
    %(upnext)s
    <div class="pn">%(prev)s%(allv)s</div>
  </div>
</div>""" % {"yt": esc(t["video"]["youtubeId"]), "title": esc(t["title"]), "ig": esc(t["video"]["instagram"]),
             "ctx": esc("%s%s" % (chapnum, t["subject"])),
             "lede": inline(t["summary"]), "pdf": esc(t["notes"]["pdf"]), "dlname": esc("PrayogX - %s - short notes.pdf" % t["title"]),
             "size": size, "doc": icon("doc", 22), "upnext": upnext,
             "allv": ('<a class="pnb" href="%s">%s All videos in this chapter</a>' % (esc(chap_href), icon("back", 16))) if next_t else "",
             "prev": ('<a class="pnb" href="../%s/">%s Previous: %s</a>' % (esc(prev_t["slug"]), icon("back", 16), esc(prev_t["title"])) if prev_t else "")}
    keys = '<section class="sect"><h2>Key points</h2><ul class="keypts">%s</ul></section>' % "".join("<li>%s</li>" % inline(x) for x in t["keyPoints"])
    jumps = ('<nav class="jump" aria-label="On this page"><a href="#concept">Explanation</a>' + ('<a href="#simulation">Simulation</a>' if has_sim else "")
             + '<a href="#quiz-sect">Quiz</a></nav>')
    sects = "".join('<section class="sect"%s><h2>%s</h2>%s</section>' % (
        ' id="concept"' if i == 0 else "", esc(sec["h"]), "".join(block_html(b) for b in sec["blocks"]))
        for i, sec in enumerate(t["sections"]))
    simhtml = ""
    if has_sim:
        simhtml = """<section class="sect" id="simulation"><h2>Try it yourself</h2>
<p><b>Goal:</b> %s</p><ul>%s</ul>
<div class="simbox"><iframe src="%s" title="%s: interactive simulation" loading="lazy"></iframe></div>
<p class="simnote"><a href="%s" target="_blank" rel="noopener">Open the simulation full screen</a></p></section>""" % (
            inline(sim["objective"]), "".join("<li>%s</li>" % inline(x) for x in sim["instructions"]),
            esc(sim.get("path", "sim.html")), esc(t["title"]), esc(sim.get("path", "sim.html")))
    quiz_json = json.dumps({"questions": [{"q": q["q"], "options": q["options"], "answer": q["answer"], "explain": q["explain"]}
                                          for q in t["quiz"]]}, ensure_ascii=False).replace("</", "<\\/")
    quiz = ('<section class="sect" id="quiz-sect"><h2>Quick quiz</h2><p>%d questions. Choose an answer for each, then submit to see '
            'your score and the explanations.</p><div class="quiz" id="quiz" aria-live="polite"><noscript>The quiz needs JavaScript.</noscript></div>'
            '<script type="application/json" id="quiz-data">%s</script></section>') % (len(t["quiz"]), quiz_json)
    rel = [by_slug[r] for r in t.get("related", []) if r in by_slug and by_slug[r]["status"] == "ready"]
    more = [x for x in rel + [v for v in vids if v is not t] if x is not next_t]
    seen, uniq = set(), []
    for x in more:
        if x["slug"] not in seen:
            seen.add(x["slug"]); uniq.append(x)
    morehtml = ('<section class="sect"><h2>More from %s</h2><div class="vgrid">%s</div></section>' % (
        esc(chp["name"]), "".join(topic_card(x, "../", cur, show_chapter=False) for x in uniq))) if uniq else ""
    body = ('%s<article class="topic" style="--c:%s">%s<div class="study">%s%s%s%s%s</div>%s</article>') % (
        nav, col, hero, jumps, keys, sects, simhtml, quiz, morehtml)
    return shell("%s · PrayogX Learn" % t["title"], t["summary"], "%s/learn/%s/" % (SITE_URL, slug), "../../", body)


# ------------------------------------------------------------------ portal pages
def topics_in(cur, ready, c, s=None):
    out = [t for t in ready if place(cur, t)[0] is c and (s is None or place(cur, t)[1] is s)]
    return sorted(out, key=lambda t: t.get("series", 0))


def portal_page(cur, ready):
    cards = []
    for c in cur["classes"]:
        ts = topics_in(cur, ready, c)
        big = icon("extra", 30) if c["id"] == "extra" else '<span>%s</span>' % esc(c["class"])
        subs = "".join('<span class="pill" style="--c:%s">%s%s</span>' % (subj_color(s), icon(s["id"] if s["id"] in ICON else "science", 14, "pi"), esc(s["name"]))
                       for s in c["subjects"])
        count = count_txt(len(ts), "video") if ts else "Videos coming soon"
        cards.append(('<a class="classcard" href="%s/" data-class="%s"><span class="num" aria-hidden="true">%s</span><span class="cbody">'
                      '<span class="t">%s</span><span class="s">%s</span><span class="pills">%s</span>'
                      '<span class="m%s">%s</span></span><span class="go" aria-hidden="true">%s</span></a>') % (
            esc(c["id"]), esc(c["id"]), big, esc(c["label"]), esc(c["blurb"]), subs, "" if ts else " soon", esc(count), icon("arrow", 20)))
    latest = sorted(ready, key=lambda t: t.get("series", 0), reverse=True)[:6]
    body = ('<div class="lhead"><h1>Choose your class</h1><p>Every subject is laid out chapter by chapter. Each topic has a short '
            'Doodle video, notes you can download and a quick quiz.</p></div>'
            '<div class="classgrid">%s</div>' % "".join(cards))
    if latest:
        body += '<section class="sect"><h2>Newest videos</h2><div class="vgrid">%s</div></section>' % "".join(topic_card(t, "", cur) for t in latest)
    return shell("PrayogX Learn · Classes 9 to 12", "Doodle explainer videos, short notes and quizzes for CBSE Classes 9, 10, 11 and 12, "
                 "organised by class, subject and chapter.", SITE_URL + "/learn/", "../", body)


def class_page(cur, ready, c):
    cards = []
    for s in c["subjects"]:
        chs = chapters_of(cur, ready, c, s)
        nv = sum(len(x["videos"]) for x in chs)
        what = " · ".join(s["disciplines"]) if len(s["disciplines"]) > 1 else ""
        meta = [count_txt(len(chs), "chapter" if c["id"] != "extra" else "theme")] if chs else []
        meta.append(count_txt(nv, "video") if nv else "videos coming soon")
        cards.append(('<a class="subjcard" style="--c:%s" href="%s/"><span class="sic">%s</span><span class="sb"><span class="t">%s</span>'
                      '%s<span class="m">%s</span></span><span class="go" aria-hidden="true">%s</span></a>') % (
            subj_color(s), esc(s["id"]), subj_icon(s), esc(s["name"]),
            '<span class="s">%s</span>' % esc(what) if what else "", esc(" · ".join(meta)), icon("arrow", 20)))
    body = (crumbs([("Learn", "../"), (c["label"], None)]) +
            '<div class="lhead"><h1>%s</h1><p>%s</p></div><h2 class="pick">Choose a subject</h2>'
            '<div class="subjgrid">%s</div>') % (esc(c["label"]), esc(c["blurb"]), "".join(cards))
    return shell("%s · PrayogX Learn" % c["label"], "PrayogX Learn %s: choose a subject to see its chapters, Doodle explainer "
                 "videos, notes and quizzes." % c["label"], "%s/learn/%s/" % (SITE_URL, c["id"]), "../../", body)


def subject_page(cur, ready, c, s):
    chs = chapters_of(cur, ready, c, s)
    ts = topics_in(cur, ready, c, s)
    extra = c["id"] == "extra"
    multi = len(s["disciplines"]) > 1
    cards = []
    for chp in chs:
        nv, np_ = len(chp["videos"]), len(chp["items"])
        disc = ('<span class="disc" style="--c:%s">%s</span>' % (COLOR.get(chp["discipline"], "var(--accent)"), esc(chp["discipline"]))
                if chp.get("discipline") and multi else "")
        status = ('<span class="have">%s</span>' % esc(count_txt(nv, "video"))) if nv else '<span class="none">Videos coming soon</span>'
        if chp["planned"] and np_ > nv:
            status += '<span class="plan">%s planned</span>' % esc(count_txt(np_, "topic"))
        cards.append(('<a class="chapcard%s" href="%s/" id="ch-%s"%s><span class="cn">%s</span><span class="cb"><span class="t">%s</span>%s'
                      '<span class="row">%s%s</span></span><span class="go" aria-hidden="true">%s</span></a>') % (
            "" if nv else " quiet", esc(chp["slug"]), esc(chp["slug"]), ' style="--c:%s"' % subj_color(s),
            esc(chp["n"]) if chp["n"] else icon("extra", 18), esc(chp["name"]),
            '<span class="s">%s</span>' % esc(chp["about"]) if chp["about"] else "", disc, status, icon("arrow", 18)))
    disciplines = sorted({t["subject"] for t in ts})
    chips = "".join('<button type="button" class="fchip" data-filter-discipline="%s" aria-pressed="false">%s</button>' % (esc(d), esc(d))
                    for d in disciplines) if multi and len(disciplines) > 1 else ""
    chopts = "".join('<option value="%s">%s</option>' % (esc(x["name"]), esc(x["name"])) for x in chs if x["videos"])
    if ts:
        topics_view = ('<div class="tfilter"><input type="search" id="tq" placeholder="Search a concept, law, formula or word…" aria-label="Search topics">'
                       '<select id="tch" aria-label="Filter by chapter"><option value="">All chapters</option>%s</select>%s</div>'
                       '<p class="tcount" id="tcount" aria-live="polite"></p><div class="vgrid" id="tgrid">%s</div>'
                       '<p class="soon" id="tnone" hidden>No topic matches. Try a shorter word.</p>') % (
            chopts, chips, "".join(topic_card(t, "../../", cur) for t in sorted(ts, key=lambda t: t["title"].lower())))
    else:
        topics_view = '<p class="soon">Topics will appear here as their videos are published.</p>'
    lead = ("Pick a chapter to see its topics and videos, in the order your textbook follows."
            if not extra else "Curious ideas beyond the syllabus, grouped by theme.")
    body = (crumbs([("Learn", "../../"), (c["label"], "../"), (s["name"], None)]) +
            ('<div class="lhead subjhead" style="--c:%s"><span class="sic">%s</span><div><h1>%s %s</h1><p>%s</p></div></div>'
             '<div class="viewtabs" role="tablist" aria-label="Browse by"><button type="button" role="tab" id="tab-chapters" aria-controls="view-chapters" aria-selected="true">Chapters</button>'
             '<button type="button" role="tab" id="tab-topics" aria-controls="view-topics" aria-selected="false">Find a topic</button></div>'
             '<div id="view-chapters" role="tabpanel" aria-labelledby="tab-chapters"><div class="chapgrid">%s</div></div>'
             '<div id="view-topics" role="tabpanel" aria-labelledby="tab-topics" hidden>%s</div>') % (
                subj_color(s), subj_icon(s), esc(c["label"]), esc(s["name"]), esc(lead),
                "".join(cards) if cards else '<p class="soon">Videos coming soon.</p>', topics_view))
    return shell("%s %s · PrayogX Learn" % (c["label"], s["name"]),
                 "%s %s on PrayogX Learn: every chapter in order, with Doodle explainer videos, notes and quizzes." % (c["label"], s["name"]),
                 "%s/learn/%s/%s/" % (SITE_URL, c["id"], s["id"]), "../../../", body)


def chapter_page(cur, ready, c, s, chp, chs):
    k = chs.index(chp)
    prev_c = chs[k - 1] if k > 0 else None
    next_c = chs[k + 1] if k + 1 < len(chs) else None
    rows = []
    for i, it in enumerate(chp["items"], 1):
        t = it["topic"]
        if t:
            rows.append(('<li class="trow have"><a href="../../../%s/"><span class="tn">%d</span>%s<span class="tb"><span class="t">%s</span>'
                         '<span class="s">%s</span></span><span class="watch">%s Watch</span></a></li>') % (
                esc(t["slug"]), i, ('<img class="tthumb" src="../../../%s/%s" alt="" loading="lazy" width="45" height="80">' % (esc(t["slug"]), esc(t["thumb"])) if t.get("thumb") else ""),
                esc(t["title"]), esc(t["summary"]), icon("play", 14)))
        else:
            rows.append('<li class="trow soon"><span class="tn">%d</span><span class="tb"><span class="t">%s</span></span><span class="tag">Coming soon</span></li>' % (i, esc(it["title"])))
    nv = len(chp["videos"])
    head_meta = [count_txt(nv, "video") if nv else "No videos yet"]
    if chp["planned"]:
        head_meta.append(count_txt(len(chp["items"]), "topic") + " in the plan")
    first = ('<a class="cta" href="../../../%s/">%s Start with: %s</a>' % (esc(chp["videos"][0]["slug"]), icon("play", 16), esc(chp["videos"][0]["title"]))) if nv else ""
    if not chp["items"]:
        listing = '<p class="soon">Videos for this chapter are on the way. Explore another chapter meanwhile.</p>'
    else:
        listing = '<ol class="tlist">%s</ol>' % "".join(rows)
        if not chp["planned"] and c["id"] != "extra":
            listing += '<p class="soon">More topics for this chapter are on the way.</p>'
    pager = '<nav class="chapnav" aria-label="Chapters">%s%s</nav>' % (
        ('<a href="../%s/">%s Chapter %s: %s</a>' % (esc(prev_c["slug"]), icon("back", 16), esc(prev_c["n"] or ""), esc(prev_c["name"]))) if prev_c else "<span></span>",
        ('<a class="nx" href="../%s/">Chapter %s: %s %s</a>' % (esc(next_c["slug"]), esc(next_c["n"] or ""), esc(next_c["name"]), icon("arrow", 16))) if next_c else "<span></span>")
    label = ("Chapter %d" % chp["n"]) if chp["n"] else "Theme"
    disc = (' · %s' % chp["discipline"]) if chp.get("discipline") and len(s["disciplines"]) > 1 else ""
    body = (crumbs([("Learn", "../../../"), (c["label"], "../../"), (s["name"], "../"), (chp["name"], None)]) +
            ('<div class="lhead chaphead" style="--c:%s"><div class="learn-kick">%s%s</div><h1>%s</h1>%s<p class="meta">%s</p>%s</div>'
             '<section class="sect"><h2>Topics in this chapter</h2>%s</section>%s<p class="backrow"><a href="../">%s All %s %s chapters</a></p>') % (
                subj_color(s), esc(label), esc(disc), esc(chp["name"]), '<p>%s</p>' % esc(chp["about"]) if chp["about"] else "",
                esc(" · ".join(head_meta)), first, listing, pager, icon("back", 16), esc(c["label"]), esc(s["name"])))
    return shell("%s · %s %s · PrayogX Learn" % (chp["name"], c["label"], s["name"]),
                 "%s (%s %s): topics in order with Doodle explainer videos, notes and quizzes." % (chp["name"], c["label"], s["name"]),
                 "%s/learn/%s/%s/%s/" % (SITE_URL, c["id"], s["id"], chp["slug"]), "../../../../", body)


def learn_urls():
    """the sitemap entries: portal, class, subject and chapter pages, and the ready topics (used by build_content.py)"""
    cur = load_curriculum()
    ready = [t for t in load() if t.get("status") == "ready"]
    urls = ["%s/learn/" % SITE_URL]
    for c in cur["classes"]:
        urls.append("%s/learn/%s/" % (SITE_URL, c["id"]))
        for s in c["subjects"]:
            urls.append("%s/learn/%s/%s/" % (SITE_URL, c["id"], s["id"]))
            urls += ["%s/learn/%s/%s/%s/" % (SITE_URL, c["id"], s["id"], x["slug"]) for x in chapters_of(cur, ready, c, s)]
    return urls + ["%s/learn/%s/" % (SITE_URL, t["slug"]) for t in ready]


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--online", action="store_true")
    a = ap.parse_args(argv)
    cur = load_curriculum()
    topics = load()
    slugs = {t.get("slug") for t in topics}
    ids = [t.get("id") for t in topics]
    bad = 0
    for p in curriculum_problems(cur):
        print("FAIL curriculum: %s" % p); bad += 1
    if len(set(ids)) != len(ids):
        print("FAIL duplicate topic ids"); bad += 1
    for t in topics:
        ps = problems(t, slugs, cur)
        sim = t.get("simulation", {})
        simtxt = sim.get("decision", "?") + ("" if sim.get("decision") != "REQUIRED" else " (%s)" % sim.get("status"))
        if ps:
            bad += 1
            print("FAIL %-28s %s" % (t.get("slug"), "; ".join(ps)))
        else:
            c, s, i, chname = place(cur, t)
            print("ok   %-28s %-6s %s / %s / %s  quiz %d  simulation %s" % (t["slug"], t["status"], c["label"], s["name"], chname, len(t["quiz"]), simtxt))
        if a.online and not ps:
            ok, why = youtube_embeddable(t["video"]["youtubeId"])
            print("     video %s: %s" % (t["video"]["youtubeId"], why if ok is not True else "embeds"))
    if bad:
        print("%d problem(s); nothing written." % bad)
        return 1
    if a.check:
        return 0
    ready = [t for t in topics if t["status"] == "ready"]
    by_slug = {t["slug"]: t for t in topics}
    # generated class folders are rebuilt from scratch, so a renamed chapter leaves no stale page behind
    import shutil
    for c in cur["classes"]:
        shutil.rmtree(os.path.join(OUT, c["id"]), ignore_errors=True)
    n = nchap = 0
    for t in ready:
        write(os.path.join(OUT, t["slug"], "index.html"), topic_page(t, by_slug, ready, cur)); n += 1
    write(os.path.join(OUT, "index.html"), portal_page(cur, ready)); n += 1
    for c in cur["classes"]:
        write(os.path.join(OUT, c["id"], "index.html"), class_page(cur, ready, c)); n += 1
        for s in c["subjects"]:
            write(os.path.join(OUT, c["id"], s["id"], "index.html"), subject_page(cur, ready, c, s)); n += 1
            chs = chapters_of(cur, ready, c, s)
            for chp in chs:
                write(os.path.join(OUT, c["id"], s["id"], chp["slug"], "index.html"), chapter_page(cur, ready, c, s, chp, chs)); n += 1; nchap += 1
    print("learn/: %d page(s) written: portal, %d class, %d subject, %d chapter and %d topic page(s) (%d draft(s) held back)" % (
        n, len(cur["classes"]), sum(len(c["subjects"]) for c in cur["classes"]), nchap, len(ready), len(topics) - len(ready)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
