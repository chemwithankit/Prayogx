#!/usr/bin/env python3
"""PrayogX Learn - build and check the Doodle topic pages (Class -> Subject -> Chapter -> Topic).

    python3 tools/build_learn.py            validate every topic, then write the pages
    python3 tools/build_learn.py --check    validate only (exit 1 on any problem); writes nothing
    python3 tools/build_learn.py --online   also ask YouTube's public oEmbed endpoint whether each video embeds

Source of truth: data/learn/topics/<slug>.json, one per topic (format in docs/LEARN_PUBLISHING.md). Each topic's
own assets sit beside its page: learn/<slug>/notes.pdf (the same approved Drive notes, exported), learn/<slug>/img/
(the notes' diagrams) and, only when the topic's simulation decision is REQUIRED, learn/<slug>/sim.html.

Generated (never hand-edit): learn/index.html and learn/<slug>/index.html. Only topics with "status": "ready" are
written and listed; drafts are validated but stay off the site. The sitemap picks the ready pages up through
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
OUT = os.path.join(ROOT, "learn")
SITE_URL = "https://prayogx.co.in"
SUBJECTS = {"Physics": "var(--subj-physics)", "Chemistry": "var(--subj-chemistry)",
            "Mathematics": "var(--subj-mathematics)", "Biology": "#c2185b"}
DECISIONS = ("REQUIRED", "NOT_REQUIRED")
SIM_STATUS = ("pass", "pending")
YT_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
IG_URL = re.compile(r"^https://www\.instagram\.com/reel/[A-Za-z0-9_-]+/$")
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
PDF_MAX = 6 * 1024 * 1024


def esc(t):
    return html.escape(str(t), quote=True)


def inline(t):
    """escape, then allow **bold** only"""
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", esc(t))


def load():
    out = []
    for p in sorted(glob.glob(os.path.join(TOPICS, "*.json"))):
        with open(p, encoding="utf-8") as fh:
            t = json.load(fh)
        t["_file"] = os.path.relpath(p, ROOT)
        out.append(t)
    return out


# ------------------------------------------------------------------ validation
def problems(t, slugs):
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
    if os.path.basename(t["_file"]) != slug + ".json":
        p.append("file name must be %s.json" % slug)
    if t["status"] not in ("draft", "ready"):
        p.append("status must be draft or ready")
    if t["subject"] not in SUBJECTS:
        p.append("subject must be one of %s" % ", ".join(SUBJECTS))
    if not isinstance(t["class"], (int, str)):
        p.append("class must be a number or a label")
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


# ------------------------------------------------------------------ pages
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
<body>
<header class="site-head">
  <div class="inner">
    <a class="brand" href="%(up)slearn/" aria-label="PrayogX Learn home">
      %(mark)s
      <span class="brand-text">
        <span class="brand-title">PRAYOG<i>X</i></span>
        <span class="brand-kicker">Learn · Doodle explainers</span>
      </span>
    </a>
    <span class="navlinks"><a href="%(up)slearn/">Learn</a><a href="%(up)s">Simulations</a>
    <button class="themebtn" id="themebtn" type="button" aria-label="Switch colour theme">◐ theme</button></span>
  </div>
</header>
<main><div class="inner">
%(body)s
</div></main>
<footer class="site-foot"><div class="inner"><span><strong>PrayogX Learn</strong> · Doodle explainer, short notes and practice quiz</span></div></footer>
<script src="%(up)slearn/learn.js"></script>
</body>
</html>
""" % {"title": esc(title), "desc": esc(desc), "canon": esc(canon), "up": up, "mark": MARK, "body": body}


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


def class_label(c):
    return "Class %s" % c if isinstance(c, int) or str(c).isdigit() else str(c)


def topic_page(t, by_slug, ready):
    slug = t["slug"]
    c = SUBJECTS[t["subject"]]
    pdf = os.path.join(OUT, slug, t["notes"]["pdf"])
    kb = os.path.getsize(pdf) / 1024.0
    size = "%.1f MB" % (kb / 1024) if kb > 1024 else "%d KB" % kb
    sim = t["simulation"]
    has_sim = sim["decision"] == "REQUIRED" and sim.get("status") == "pass"
    crumbs = ('<nav class="crumbs" aria-label="Breadcrumb"><a href="../">Learn</a><span class="sep">›</span>'
              '<a href="../#%s">%s</a><span class="sep">›</span><span>%s</span><span class="sep">›</span>'
              '<span>%s</span></nav>') % (esc(anchor(t)), esc(class_label(t["class"])), esc(t["subject"]), esc(t["chapter"]))
    jumps = '<a href="#concept">Concept</a>' + ('<a href="#simulation">Simulation</a>' if has_sim else "") + '<a href="#quiz-sect">Quiz</a>'
    hero = """
<div class="hero">
  <div>
    <div class="video"><iframe src="https://www.youtube-nocookie.com/embed/%(yt)s?rel=0&amp;modestbranding=1&amp;playsinline=1"
      title="%(title)s: Doodle explainer video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
    <p class="video-alt">Video not playing? <a href="%(ig)s" rel="noopener" target="_blank">Watch it on Instagram</a> ·
      <a href="https://www.youtube.com/shorts/%(yt)s" rel="noopener" target="_blank">YouTube</a></p>
  </div>
  <div class="actions">
    <a class="dl" href="%(pdf)s" download="%(dlname)s"><span class="ico">PDF</span>
      <span><span class="t">Download the short notes</span><br><span class="s">%(notes)s · PDF, %(size)s · solved examples, CBSE practice set and answer key</span></span></a>
    <div class="jump">%(jumps)s</div>
    <h2 style="font-size:16px;margin:8px 0 0">Key points</h2>
    <ul class="keypts">%(keys)s</ul>
  </div>
</div>""" % {"yt": esc(t["video"]["youtubeId"]), "title": esc(t["title"]), "ig": esc(t["video"]["instagram"]),
             "pdf": esc(t["notes"]["pdf"]), "dlname": esc("PrayogX - %s - short notes.pdf" % t["title"]),
             "notes": esc(t["notes"].get("title", "Short notes")), "size": size, "jumps": jumps,
             "keys": "".join("<li>%s</li>" % inline(k) for k in t["keyPoints"])}
    sects = "".join('<section class="sect"%s><h2>%s</h2>%s</section>' % (
        ' id="concept"' if i == 0 else "", esc(s["h"]), "".join(block_html(b) for b in s["blocks"]))
        for i, s in enumerate(t["sections"]))
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
    same = [x for x in ready if x["slug"] != slug and x["subject"] == t["subject"] and x["chapter"] == t["chapter"] and x["class"] == t["class"]]
    rel = [by_slug[r] for r in t.get("related", []) if r in by_slug and by_slug[r]["status"] == "ready"]
    more = []
    for x in rel + same:
        if x not in more:
            more.append(x)
    morehtml = ""
    if more:
        morehtml = '<section class="sect"><h2>Related topics</h2><div class="lgrid">%s</div></section>' % "".join(card(x, "../") for x in more)
    chips = ('<div class="chips"><span class="chip">%s</span><span class="chip subj">%s</span><span class="chip">%s</span></div>'
             % (esc(class_label(t["class"])), esc(t["subject"]), esc(t["chapter"])))
    body = ('%s<article class="topic" style="--c:%s"><div class="learn-kick">PrayogX Learn</div><h1>%s</h1>%s'
            '<p class="lede">%s</p>%s%s%s%s%s</article>') % (crumbs, c, esc(t["title"]), chips, inline(t["summary"]), hero, sects, simhtml, quiz, morehtml)
    return shell("%s · PrayogX Learn" % t["title"], t["summary"], "%s/learn/%s/" % (SITE_URL, slug), "../../", body)


def anchor(t):
    return re.sub(r"[^a-z0-9]+", "-", ("c%s-%s" % (t["class"], t["subject"])).lower()).strip("-")


def card(t, prefix):
    return ('<a class="lcard" style="--c:%s" href="%s%s/"><div class="t">%s</div><div class="s">%s</div>'
            '<div class="m">%s · %s%s</div></a>') % (
        SUBJECTS[t["subject"]], prefix, esc(t["slug"]), esc(t["title"]), esc(t["summary"]), esc(class_label(t["class"])),
        esc(t["subject"]), " · simulation" if t["simulation"]["decision"] == "REQUIRED" and t["simulation"].get("status") == "pass" else "")


def class_key(c):
    return (0, int(c)) if isinstance(c, int) or str(c).isdigit() else (1, str(c))


def index_page(ready):
    order = ["Physics", "Chemistry", "Mathematics", "Biology"]
    body = ['<div class="lhead"><div class="learn-kick">PrayogX Learn</div><h1>Doodle explainers, notes and quizzes</h1>'
            '<p>Pick a topic: watch the short Doodle video, download the notes, read the explanation, try the quiz and, '
            'where it helps, play with a simulation.</p></div>']
    for cl in sorted({t["class"] for t in ready}, key=class_key):
        body.append('<section class="lclass"><h2>%s</h2>' % esc(class_label(cl)))
        subs = sorted({t["subject"] for t in ready if t["class"] == cl}, key=lambda s: order.index(s))
        for s in subs:
            ts = [t for t in ready if t["class"] == cl and t["subject"] == s]
            body.append('<div class="lsubj" id="%s" style="--c:%s"><h3>%s</h3>' % (esc(anchor(ts[0])), SUBJECTS[s], esc(s)))
            for ch in sorted({t["chapter"] for t in ts}):
                body.append('<div class="lchap"><h4>%s</h4><div class="lgrid">%s</div></div>' % (
                    esc(ch), "".join(card(t, "") for t in sorted(ts, key=lambda t: t.get("series", 0)) if t["chapter"] == ch)))
            body.append("</div>")
        body.append("</section>")
    return shell("PrayogX Learn · Doodle explainers, notes and quizzes",
                 "Short Doodle explainer videos with downloadable notes, a clear explanation and a practice quiz for each CBSE topic.",
                 SITE_URL + "/learn/", "../", "".join(body))


def learn_urls():
    """the sitemap entries for the ready topics (used by tools/build_content.py)"""
    ready = [t for t in load() if t.get("status") == "ready"]
    return (["%s/learn/" % SITE_URL] if ready else []) + ["%s/learn/%s/" % (SITE_URL, t["slug"]) for t in ready]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--online", action="store_true")
    a = ap.parse_args(argv)
    topics = load()
    slugs = {t.get("slug") for t in topics}
    ids = [t.get("id") for t in topics]
    bad = 0
    if len(set(ids)) != len(ids):
        print("FAIL duplicate topic ids"); bad += 1
    for t in topics:
        ps = problems(t, slugs)
        sim = t.get("simulation", {})
        simtxt = sim.get("decision", "?") + ("" if sim.get("decision") != "REQUIRED" else " (%s)" % sim.get("status"))
        if ps:
            bad += 1
            print("FAIL %-28s %s" % (t.get("slug"), "; ".join(ps)))
        else:
            print("ok   %-28s %-6s quiz %d  simulation %s" % (t["slug"], t["status"], len(t["quiz"]), simtxt))
        if a.online and not ps:
            ok, why = youtube_embeddable(t["video"]["youtubeId"])
            print("     video %s: %s" % (t["video"]["youtubeId"], why if ok is not True else "embeds"))
    if bad:
        print("%d topic(s) failed; nothing written." % bad)
        return 1
    if a.check:
        return 0
    ready = [t for t in topics if t["status"] == "ready"]
    by_slug = {t["slug"]: t for t in topics}
    for t in ready:
        with open(os.path.join(OUT, t["slug"], "index.html"), "w", encoding="utf-8") as fh:
            fh.write(topic_page(t, by_slug, ready))
    with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(index_page(ready))
    print("learn/: %d topic page(s) + index written (%d draft(s) held back)" % (len(ready), len(topics) - len(ready)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
