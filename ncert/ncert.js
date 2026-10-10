/* ==========================================================================
   PrayogX NCERT Explorer: the page shell (docs/NCERT.md, Phase 2)

   Reads the generated feed only - never data/ncert/ or the JEE manifest:
     ../content/ncert/catalog.json         class -> subject -> book -> chapter
     ../content/ncert/<chapter-id>.json    one chapter: sections + linked simulations

   Routes (hash, so the page works as one static file):
     #/                                   browse every class
     #/11                                 one class
     #/11/chemistry                       one subject in that class
     #/11/chemistry/part-1                one book
     #/11/chemistry/part-1/ch05           one chapter
   Anything else is "not found". URL segments are derived from the IDs:
     NCERT-11-CHE-P1      -> 11 / chemistry / part-1
     NCERT-11-CHE-P1-CH05 -> ch05

   States, on <main data-state>: loading | ready | empty | error | notfound.
   Test hook: window.NCERT.state().

   Plain ES5, like site/site.js. No storage beyond the shared theme choice.
   ========================================================================== */
(function () {
  "use strict";

  var FEED = "../content/ncert/";
  var SCHEMA_MAJOR = "1";

  var main = document.getElementById("nx");
  var CAT = null;          // the catalogue, once loaded
  var CHAPTERS = {};       // chapter id -> loaded chapter feed
  var CAT_REQ = null;      // the catalogue request in flight
  var STATE = { status: "loading", view: null, route: "" };
  var seq = 0;             // guards against a slow response painting over a newer route

  /* ------------------------------------------------------------ helpers */
  function esc(t) {
    return String(t === undefined || t === null ? "" : t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function subjectColor(subject) { return "var(--subj-" + slug(subject) + ", var(--subj-other))"; }
  function pages(p) {
    if (!p || p.length !== 2) return "";
    return p[0] === p[1] ? "p. " + p[0] : "pp. " + p[0] + "–" + p[1];
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  function bookPath(book) {
    var m = /^NCERT-(\d+)-[A-Z]+-P(\d+)$/.exec(book.id || "");
    return m ? [m[1], slug(book.subject), "part-" + m[2]] : null;
  }
  function chapterSeg(ch) {
    var m = /-CH(\d{2})$/.exec(ch.id || "");
    return m ? "ch" + m[1] : null;
  }
  function href(parts) { return "#/" + parts.join("/"); }

  /* -------------------------------------------------------------- loading */
  function getJSON(url, done) {
    var x = new XMLHttpRequest();
    x.open("GET", url, true);
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status < 200 || x.status >= 300) {
        done(new Error(x.status ? "HTTP " + x.status : "network"), null);
        return;
      }
      var data = null;
      try { data = JSON.parse(x.responseText); } catch (e) { done(new Error("unreadable"), null); return; }
      if (!data || String(data.schemaVersion || "").split(".")[0] !== SCHEMA_MAJOR) {
        done(new Error("schema " + (data && data.schemaVersion)), null);
        return;
      }
      done(null, data);
    };
    try { x.send(); } catch (e) { done(new Error("network"), null); }
  }

  function loadCatalog(done) {
    if (CAT) { done(null, CAT); return; }
    if (CAT_REQ) { CAT_REQ.push(done); return; }
    CAT_REQ = [done];
    getJSON(FEED + "catalog.json", function (err, data) {
      if (!err) CAT = data;
      var waiting = CAT_REQ; CAT_REQ = null;
      for (var i = 0; i < waiting.length; i++) waiting[i](err, data);
    });
  }

  function loadChapter(ch, done) {
    if (CHAPTERS[ch.id]) { done(null, CHAPTERS[ch.id]); return; }
    // the chapter's version, from the catalogue, makes each revision its own URL
    getJSON(FEED + encodeURIComponent(ch.id) + ".json?v=" + encodeURIComponent(ch.version || ""), function (err, data) {
      if (!err && data.chapter && data.chapter.id === ch.id) CHAPTERS[ch.id] = data;
      else if (!err) err = new Error("wrong chapter");
      done(err, CHAPTERS[ch.id] || null);
    });
  }

  /* ---------------------------------------------------------- rendering */
  function setState(status, view, html, title) {
    readerDestroy();          // leaving (or re-rendering) a chapter ends its document and worker
    panelDestroy();
    STATE = { status: status, view: view, route: location.hash || "#/" };
    main.setAttribute("data-state", status);
    main.innerHTML = '<div class="inner">' + html + "</div>";
    document.title = (title ? title + " · " : "") + "NCERT Explorer · PrayogX";
    var h = main.querySelector("h1");
    if (h && status !== "loading") { h.setAttribute("tabindex", "-1"); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
  }

  function crumbs(list) {
    // list: [[label, href or null], ...]; the last item is the current page
    var out = '<nav class="nx-crumbs" aria-label="Breadcrumb"><ol>';
    for (var i = 0; i < list.length; i++) {
      var last = i === list.length - 1;
      out += "<li>" + (last || !list[i][1]
        ? '<span' + (last ? ' aria-current="page"' : "") + ">" + esc(list[i][0]) + "</span>"
        : '<a href="' + list[i][1] + '">' + esc(list[i][0]) + "</a>") + "</li>";
    }
    return out + "</ol></nav>";
  }

  function showLoading(what) {
    setState("loading", null, '<p class="loading">Loading ' + esc(what) + "…</p>", "");
  }

  function showError(what, err) {
    setState("error", "error",
      '<div class="nx-state" role="alert">' +
        '<h1>Could not load ' + esc(what) + "</h1>" +
        "<p>Check your connection and try again. If you are offline, chapters you have opened before may still be available.</p>" +
        '<p class="nx-state-detail">' + esc(err && err.message) + "</p>" +
        '<button type="button" class="nx-btn" id="nx-retry">Try again</button>' +
      "</div>", "Error");
    document.getElementById("nx-retry").onclick = function () { route(); };
  }

  function showNotFound() {
    setState("notfound", "notfound",
      '<div class="nx-state">' +
        "<h1>This page is not in the NCERT Explorer</h1>" +
        "<p>The class, book or chapter in this link does not exist here yet.</p>" +
        '<a class="nx-btn" href="#/">Browse the NCERT Explorer</a>' +
      "</div>", "Not found");
  }

  function showEmpty() {
    setState("empty", "empty",
      '<div class="nx-state">' +
        "<h1>No NCERT chapters yet</h1>" +
        "<p>Chapters appear here as they are prepared. Meanwhile the JEE Questions library has every simulation.</p>" +
        '<a class="nx-btn" href="../">Open the JEE Questions library</a>' +
      "</div>", "");
  }

  /* Group the catalogue's books by class and subject, keeping feed order. */
  function grouped(books) {
    var classes = [], byClass = {};
    for (var i = 0; i < books.length; i++) {
      var b = books[i], c = String(b["class"]);
      if (!byClass[c]) { byClass[c] = { cls: c, subjects: [], bySubj: {} }; classes.push(byClass[c]); }
      var g = byClass[c];
      if (!g.bySubj[b.subject]) { g.bySubj[b.subject] = { subject: b.subject, books: [] }; g.subjects.push(g.bySubj[b.subject]); }
      g.bySubj[b.subject].books.push(b);
    }
    return classes;
  }

  function chapterRow(book, ch) {
    var bp = bookPath(book), seg = chapterSeg(ch);
    var c = ch.counts || {};
    var meta = [pages(ch.bookPages), plural(c.sections || 0, "section", "sections")];
    if (c.understand) meta.push(plural(c.understand, "simulation", "simulations"));
    if (c.apply) meta.push(plural(c.apply, "related JEE problem", "related JEE problems"));
    return '<li><a class="nx-chapter" href="' + href(bp.concat(seg)) + '">' +
      '<span class="nx-chno">' + esc(ch.number) + "</span>" +
      '<span class="nx-chtext"><span class="nx-chtitle">' + esc(ch.title) + "</span>" +
      '<span class="nx-chmeta">' + esc(meta.join(" · ")) + "</span></span>" +
      '<span class="nx-go" aria-hidden="true">›</span></a></li>';
  }

  /* Browse: the whole catalogue, or one class / subject / book of it. */
  function showBrowse(filter) {
    var books = CAT.books || [];
    var usable = [];
    for (var i = 0; i < books.length; i++) if (bookPath(books[i]) && (books[i].chapters || []).length) usable.push(books[i]);
    if (!usable.length) { showEmpty(); return; }

    var pick = [];
    for (i = 0; i < usable.length; i++) {
      var p = bookPath(usable[i]);
      if (filter.cls && p[0] !== filter.cls) continue;
      if (filter.subj && p[1] !== filter.subj) continue;
      if (filter.book && p[2] !== filter.book) continue;
      pick.push(usable[i]);
    }
    if (!pick.length) { showNotFound(); return; }

    var trail = [["NCERT", filter.cls ? "#/" : null]], title = "";
    if (filter.cls) { trail.push(["Class " + filter.cls, filter.subj ? href([filter.cls]) : null]); title = "Class " + filter.cls; }
    if (filter.subj) { trail.push([pick[0].subject, filter.book ? href([filter.cls, filter.subj]) : null]); title = pick[0].subject + ", " + title; }
    if (filter.book) { trail.push([pick[0].title, null]); title = pick[0].title + ", Class " + filter.cls; }

    var html = filter.cls ? crumbs(trail) : "";
    html += '<header class="nx-hero">' +
      (filter.cls ? '<h1>' + esc(filter.book ? pick[0].title : filter.subj ? pick[0].subject : "Class " + filter.cls) + "</h1>"
                  : "<h1>NCERT Explorer</h1>" +
                    '<p class="nx-lede">Read the NCERT chapter. Beside it, explore the simulations that make each idea visible, then apply it to JEE problems.</p>') +
      "</header>";

    var groups = grouped(pick);
    for (var g = 0; g < groups.length; g++) {
      html += '<section class="nx-class" aria-labelledby="nx-c' + esc(groups[g].cls) + '">' +
        (filter.cls ? "" : '<h2 class="nx-classname" id="nx-c' + esc(groups[g].cls) + '"><a href="' + href([groups[g].cls]) + '">Class ' + esc(groups[g].cls) + "</a></h2>");
      if (filter.cls) html += '<h2 class="nx-sr" id="nx-c' + esc(groups[g].cls) + '">Class ' + esc(groups[g].cls) + "</h2>";
      for (var s = 0; s < groups[g].subjects.length; s++) {
        var sub = groups[g].subjects[s];
        for (var k = 0; k < sub.books.length; k++) {
          var b = sub.books[k], bp = bookPath(b);
          html += '<article class="nx-book" style="--c:' + subjectColor(b.subject) + '">' +
            '<header class="nx-bookhead">' +
              '<span class="nx-subj"><span class="nx-swatch" aria-hidden="true"></span>' +
                (filter.subj ? esc(b.subject) : '<a href="' + href(bp.slice(0, 2)) + '">' + esc(b.subject) + "</a>") + "</span>" +
              '<h3 class="nx-booktitle">' + (filter.book ? esc(b.title) : '<a href="' + href(bp) + '">' + esc(b.title) + "</a>") + "</h3>" +
              '<span class="nx-bookmeta">' + esc(plural(b.chapters.length, "chapter", "chapters") + " ready") + "</span>" +
            "</header>" +
            '<ol class="nx-chapters">';
          for (var c = 0; c < b.chapters.length; c++) if (chapterSeg(b.chapters[c])) html += chapterRow(b, b.chapters[c]);
          html += "</ol></article>";
        }
      }
      html += "</section>";
    }
    setState("ready", filter.book ? "book" : filter.subj ? "subject" : filter.cls ? "class" : "browse", html, title);
  }

  /* Chapter: the reader beside the contextual learning panel (docs/NCERT_UX.md, UX-1). */
  function showChapter(book, ch, feed) {
    var bp = bookPath(book);
    var secs = feed.sections || [];
    var ed = ((feed.chapter.source || {}).editions || [])[0];
    var html = crumbs([["NCERT", "#/"], ["Class " + bp[0], href([bp[0]])], [book.subject, href(bp.slice(0, 2))],
                       [book.title, href(bp)], ["Chapter " + ch.number, null]]);
    html += '<header class="nx-hero nx-chhero" style="--c:' + subjectColor(book.subject) + '">' +
      '<h1><span class="nx-h1no">Chapter ' + esc(ch.number) + "</span>" + esc(ch.title) + "</h1>" +
      '<ul class="nx-facts">' +
        "<li>" + esc(pages(feed.chapter.source && feed.chapter.source.bookPages)) + "</li>" +
        "<li>" + esc(plural(secs.length, "section", "sections")) + "</li>" +
        (ed ? "<li>" + esc(ed.label) + "</li>" : "") +
      "</ul>" +
      "</header>" +
      '<div class="nx-chlayout" id="nx-chlayout" data-reader-state="loading" style="--c:' + subjectColor(book.subject) + '">' +
      readerShell(ch) +
      panelShell(book, ch, feed) +
      "</div>" +
      '<button type="button" class="nx-ctxbar" id="nx-ctxbar" hidden aria-controls="nx-panel" aria-expanded="false"></button>' +
      '<div class="nx-scrim" id="nx-scrim" hidden></div>';
    setState("ready", "chapter", html, ch.title + ", Class " + bp[0] + " " + book.subject);
    panelMount(book, ch, feed);
    readerMount(feed, ch);
  }

  /* -------------------------------------------------------- learning panel
     The panel answers, for the page being read: where am I (identity, On this page),
     what am I learning (Concept), what can I explore (Explore), what can I apply
     (Apply), with the chapter map and the PDF source below. Desktop (>= 960 px): the
     ~30 % column beside the reader. Narrower: the same panel as a bottom sheet, opened
     from a context bar that appears only when the page has something to offer, or from
     the reader's chapter title.

     UX-1 has no concept inventory yet: Concept stays empty; Explore shows whatever
     NCERT.ExperienceMapper.getExperiencesForPage() returns (today []); Apply uses the
     chapter's existing JEE links for the sections on the page. Page -> section uses the
     printed page from the page context; an unverified edition is matched the same way
     but says so; a PDF without printed pages falls back to the section chosen in the
     chapter map. It reads the reader's state; it never changes it, except that a
     chapter-map choice turns the page. */
  var PANEL = null;

  function panelShell(book, ch, feed) {
    var bp = bookPath(book), secs = feed.sections || [];
    var rows = "";
    for (var i = 0; i < secs.length; i++) {
      var s = secs[i];
      rows += '<li class="nx-sec nx-l' + (s.level === 2 ? 2 : 1) + '" data-section="' + esc(s.id) + '">' +
        '<button type="button" class="nx-secbtn" data-go="' + esc(s.id) + '">' +
        '<span class="nx-secno">' + esc(s.number) + "</span>" +
        '<span class="nx-secbody"><span class="nx-sectitle">' + esc(s.title) + "</span>" +
        '<span class="nx-secpages">' + esc(pages(s.pages)) + "</span></span></button></li>";
    }
    // aria-live="off": <main> is a polite live region, and the panel re-renders on every page turn;
    // only #nx-live (its own polite region) announces the change, once
    return '<aside class="nx-context" id="nx-panel" aria-label="Learning for this page" aria-live="off">' +
      '<div class="nx-sheethead"><span class="nx-sheettitle">Chapter ' + esc(ch.number) + " · " + esc(ch.title) + "</span>" +
        '<button type="button" class="nx-tool nx-sheetclose" id="nx-sheetclose" aria-label="Close">\u00d7</button></div>' +
      '<section class="nx-pblock nx-identity" aria-label="Chapter">' +
        '<p class="nx-pcrumb">Class ' + esc(bp[0]) + " \u00b7 " + esc(book.subject) + " \u00b7 " + esc(book.title) + "</p>" +
        '<p class="nx-ptitle"><span class="nx-pchno">Chapter ' + esc(ch.number) + "</span>" + esc(ch.title) + "</p>" +
      "</section>" +
      '<section class="nx-pblock nx-here" id="nx-here" aria-labelledby="nx-here-h" hidden>' +
        '<h2 class="nx-plabel" id="nx-here-h">On this page</h2><div id="nx-here-body"></div></section>' +
      '<section class="nx-pblock" id="nx-concept" aria-labelledby="nx-concept-h" hidden>' +
        '<h2 class="nx-plabel" id="nx-concept-h">Concept</h2><div id="nx-concept-body"></div></section>' +
      '<section class="nx-pblock" id="nx-explore" aria-labelledby="nx-explore-h" hidden>' +
        '<h2 class="nx-plabel" id="nx-explore-h">Explore</h2><ul class="nx-explist" id="nx-explore-body"></ul></section>' +
      '<p class="nx-quiet" id="nx-quiet" hidden>Nothing to explore on this page yet.</p>' +
      '<section class="nx-pblock" id="nx-understand" aria-labelledby="nx-understand-h" hidden>' +
        '<h2 class="nx-plabel" id="nx-understand-h">Understand</h2><p class="nx-pnote">Concept experiment for this page</p>' +
        '<ul class="nx-applist" id="nx-understand-body"></ul></section>' +
      '<section class="nx-pblock" id="nx-apply" aria-labelledby="nx-apply-h" hidden>' +
        '<h2 class="nx-plabel" id="nx-apply-h">Apply</h2><p class="nx-pnote">JEE practice for this section</p>' +
        '<ul class="nx-applist" id="nx-apply-body"></ul></section>' +
      '<details class="nx-pblock nx-map" id="nx-map" open><summary>Chapter map <span class="nx-count">(' + secs.length + ")</span></summary>" +
        '<ol class="nx-sections">' + rows + "</ol></details>" +
      sourceCard(feed) +
      '<p class="nx-sr" id="nx-live" aria-live="polite"></p>' +
      "</aside>";
  }

  function pel(id) { return document.getElementById(id); }
  function narrow() { return !!(window.matchMedia && window.matchMedia("(max-width: 959px)").matches); }

  function panelMount(book, ch, feed) {
    PANEL = { book: book, ch: ch, feed: feed, chosen: null, reading: null, sheet: false, opener: null, live: "", onKey: null,
              pushed: false, onPop: null, backTimer: null };
    pel("nx-map").onclick = function (ev) {
      var b = ev.target.closest ? ev.target.closest("[data-go]") : null;
      if (b) panelGo(b.getAttribute("data-go"));
    };
    pel("nx-ctxbar").onclick = function () { panelSheet(true, null); };
    pel("nx-sheetclose").onclick = function () { panelSheet(false); };
    pel("nx-scrim").onclick = function () { panelSheet(false); };
    pel("nx-rtitle").onclick = function () {
      var map = pel("nx-map");
      map.open = true;
      if (narrow()) panelSheet(true, map);
      else { var sm = map.querySelector("summary"); if (sm) sm.focus(); }
    };
    PANEL.onKey = function (ev) { if (PANEL && PANEL.sheet && (ev.key === "Escape" || ev.key === "Esc")) { ev.preventDefault(); panelSheet(false); } };
    document.addEventListener("keydown", PANEL.onKey);
    // browser Back while the sheet is open pops the entry the sheet pushed: close the sheet
    PANEL.onPop = function () {
      if (PANEL && PANEL.sheet && !sheetEntry()) { PANEL.pushed = false; sheetUI(false); }
    };
    window.addEventListener("popstate", PANEL.onPop);
    panelChapterData(feed);
    panelRender();
  }

  /* What the mapper needs for this chapter: its sections (with their JEE links), a label for
     each linked practice page, and - when the chapter feed carries them - the concept
     inventory and experience documents (feed.learning: {inventory, experiences}). No
     chapter feed carries learning documents yet, so no concept is shown in production. */
  function panelChapterData(feed) {
    var M = window.NCERT && window.NCERT.ExperienceMapper;
    if (!M || !M.setChapterData) return;
    var practice = {}, pages = {}, sims = feed.simulations || [];
    for (var i = 0; i < sims.length; i++) {
      var c = sims[i];
      if (c.kind === "concept") { pages[c.id] = { title: c.shortTitle || c.title, path: c.path }; continue; }
      practice[c.id] = { title: c.shortTitle || c.title,
                         label: (c.exam || "JEE") + " " + (c.year || "") + " \u00b7 " + (c.paper || "") + " \u00b7 Q" + c.questionNumber };
    }
    M.setChapterData({ chapterId: feed.chapter.id, sections: feed.sections || [], practice: practice, pages: pages, pageMap: feed.pageMap || null,
                       learning: feed.learning || null });
  }

  function panelDestroy() {
    if (!PANEL) return;
    document.removeEventListener("keydown", PANEL.onKey);
    window.removeEventListener("popstate", PANEL.onPop);
    clearTimeout(PANEL.backTimer);
    main.removeAttribute("data-reading");
    main.removeAttribute("data-sheet");
    main.removeAttribute("data-ctxbar");
    PANEL = null;
  }

  /* A chapter-map choice: turn the PDF to the section's first printed page when the open
     PDF has printed page labels; otherwise remember the section as the reading context. */
  function panelGo(id) {
    var sec = panelSection(id);
    if (!sec) return;
    var at = -1;
    if (READER && READER.doc && READER.labels) {
      for (var i = 0; i < READER.labels.length; i++) if (String(READER.labels[i]) === String(sec.pages[0])) { at = i; break; }
    }
    PANEL.chosen = id;
    if (at >= 0) readerGo(at + 1);
    panelRender();
    if (narrow() && PANEL.sheet && at >= 0) panelSheet(false);
  }

  function panelSection(id) {
    var secs = (PANEL && PANEL.feed.sections) || [];
    for (var i = 0; i < secs.length; i++) if (secs[i].id === id) return secs[i];
    return null;
  }

  /* The learning context for where the student is (NCERT.ExperienceMapper.getLearningContext):
     the page, how it was placed, its sections, concepts with their objectives and published
     experiences, and Apply. A chosen chapter-map section stands in when the page has no
     printed number, or before a PDF is open. */
  function panelLearning(ctx) {
    var M = window.NCERT && window.NCERT.ExperienceMapper;
    // before a PDF is open, a deep link (…/p143) still says which page the student means
    if (!ctx && DEEP !== null && !PANEL.chosen) ctx = { pdfPage: 0, printedPage: DEEP, chapterId: PANEL.feed.chapter.id, editionStatus: null };
    try {
      return M && M.getLearningContext ? M.getLearningContext(ctx, { sectionId: PANEL.chosen, chapterId: PANEL.feed.chapter.id }) : null;
    } catch (e) { return null; }
  }

  /* How the panel states the place. */
  function panelWhere(lc) {
    if (!lc) return { kind: "none", label: "", note: "" };
    var pg = lc.page;
    if (pg && lc.match === "printed-page") {
      return { kind: "page", label: "p. " + pg.printedPage,
               note: pg.editionStatus === "exact_match" ? "" : "Your PDF’s edition could not be verified — page matching may be approximate." };
    }
    if (pg) {
      return { kind: "pdf", label: "PDF page " + pg.pdfPage,
               note: lc.match === "section" ? "Your PDF has no printed page numbers; showing the chosen section."
                                            : "Your PDF has no printed page numbers. Choose a section in the chapter map." };
    }
    if (lc.match === "section" && lc.sections.length) {
      return { kind: "section", label: "Section " + (lc.sections[0].number || lc.sections[0].title), note: "" };
    }
    return { kind: "none", label: "", note: "" };
  }

  var TYPE_LABEL = { "simulation": "Simulation", "animation": "Animation", "virtual-lab": "Virtual Lab", "graph": "Graph Explorer",
                     "data-explorer": "Data Explorer", "interactive-diagram": "Interactive Diagram", "molecular": "Molecular",
                     "derivation": "Derivation", "worked-example": "Worked Example" };

  function panelRender() {
    if (!PANEL || !pel("nx-panel")) return;
    var ctx = READER ? READER.context : null;
    var reading = !!(READER && READER.doc);
    if (reading !== PANEL.reading) {
      // once a PDF is open the hero folds into the panel, and the map and source details close
      PANEL.reading = reading;
      main.setAttribute("data-reading", reading ? "1" : "0");
      pel("nx-map").open = !reading;
      var more = pel("nx-srcmore");
      if (more) more.open = !reading;
    }
    var lc = panelLearning(ctx);
    var where = panelWhere(lc);
    var sections = lc && where.kind !== "none" ? lc.sections : [];
    var concepts = lc && where.kind !== "none" ? lc.concepts : [];
    var apply = lc && where.kind !== "none" ? lc.apply : [];
    var understand = lc && where.kind !== "none" ? (lc.understand || []) : [];
    var nexp = 0;
    for (var ce = 0; ce < concepts.length; ce++) nexp += concepts[ce].experiences.length;

    var here = pel("nx-here");
    here.hidden = where.kind === "none";
    if (!here.hidden) {
      var h = '<p class="nx-herepage">' + esc(where.label) + "</p>";
      if (sections.length) {
        h += '<ul class="nx-heresecs">';
        for (var i = 0; i < sections.length; i++) {
          var s = sections[i];
          h += '<li><span class="nx-heresecno">' + esc(s.number) + "</span>" + esc(s.title) + "</li>";
        }
        h += "</ul>";
      }
      if (where.note) h += '<p class="nx-pwarn" role="note">' + esc(where.note) + "</p>";
      pel("nx-here-body").innerHTML = h;
    }

    // Concept: each concept here, with its learning objectives
    var cb = pel("nx-concept");
    cb.hidden = !concepts.length;
    if (concepts.length) {
      var ch = "";
      for (var ci = 0; ci < concepts.length; ci++) {
        var cc = concepts[ci];
        ch += '<div class="nx-cpt" data-concept="' + esc(cc.concept.id) + '"><p class="nx-cpttitle">' + esc(cc.concept.title) + "</p>" +
          (cc.concept.description ? '<p class="nx-cptdesc">' + esc(cc.concept.description) + "</p>" : "");
        if (cc.objectives.length) {
          ch += '<ul class="nx-objs" aria-label="Learning objectives">';
          for (var oi = 0; oi < cc.objectives.length; oi++) ch += '<li data-objective="' + esc(cc.objectives[oi].id) + '">' + esc(cc.objectives[oi].statement) + "</li>";
          ch += "</ul>";
        }
        ch += "</div>";
      }
      pel("nx-concept-body").innerHTML = ch;
    }

    // Explore: every published experience of these concepts, with the purpose it serves
    var ex = pel("nx-explore");
    ex.hidden = !nexp;
    if (nexp) {
      var li = "", grouped = concepts.length > 1;
      for (var g = 0; g < concepts.length; g++) {
        var gc = concepts[g];
        if (!gc.experiences.length) continue;
        if (grouped) li += '<li class="nx-expgroup">' + esc(gc.concept.title) + "</li>";
        var purpose = {};
        for (var po = 0; po < gc.objectives.length; po++) purpose[gc.objectives[po].id] = gc.objectives[po].statement;
        for (var k = 0; k < gc.experiences.length; k++) {
          var x = gc.experiences[k];
          li += '<li class="nx-expitem" data-experience="' + esc(x.id) + '">' +
            '<span class="nx-exptype">' + esc(TYPE_LABEL[x.type] || x.type) + "</span>" +
            '<span class="nx-exptitle">' + esc(x.title) + "</span>" +
            (purpose[x.objectives[0]] ? '<span class="nx-exppurpose">' + esc(purpose[x.objectives[0]]) + "</span>" : "") + "</li>";
        }
      }
      pel("nx-explore-body").innerHTML = li;
    }
    pel("nx-quiet").hidden = where.kind === "none" || !!nexp || understand.length > 0;

    // Understand: the published concept pages for this place (the page itself, in a new tab)
    var un = pel("nx-understand");
    un.hidden = !understand.length;
    if (understand.length) {
      var ul = "";
      for (var u = 0; u < understand.length; u++) {
        var u2 = understand[u], to = "../" + u2.path.replace(/index\.html$/, "");
        ul += '<li><a class="nx-applink" href="' + esc(to) + '" target="_blank" rel="noopener" data-sim="' + esc(u2.libraryId) + '"' +
          ' aria-label="' + esc("Concept experiment: " + u2.title + " (opens in a new tab)") + '">' +
          '<span class="nx-applabel">Concept experiment</span>' +
          '<span class="nx-apptitle">' + esc(u2.title) + '<span aria-hidden="true"> ↗</span></span></a></li>';
      }
      pel("nx-understand-body").innerHTML = ul;
    }

    // Apply: JEE practice for this place
    var ap = pel("nx-apply");
    ap.hidden = !apply.length;
    if (apply.length) {
      var al = "";
      for (var m = 0; m < apply.length; m++) {
        var a2 = apply[m];
        al += '<li><a class="nx-applink" href="../#/run/' + encodeURIComponent(a2.libraryId) + '" target="_blank" rel="noopener" data-sim="' + esc(a2.libraryId) + '"' +
          ' aria-label="' + esc(a2.label + ": " + a2.title + " (opens the Questions library in a new tab)") + '">' +
          '<span class="nx-applabel">' + esc(a2.label) + "</span>" +
          '<span class="nx-apptitle">' + esc(a2.title) + '<span aria-hidden="true"> ↗</span></span></a></li>';
      }
      pel("nx-apply-body").innerHTML = al;
    }

    // the chapter map marks where the student is
    var cur = {};
    for (var q = 0; q < sections.length; q++) cur[sections[q].id] = 1;
    var items = pel("nx-map").querySelectorAll(".nx-sec");
    for (var r = 0; r < items.length; r++) {
      if (cur[items[r].getAttribute("data-section")]) items[r].setAttribute("aria-current", "location");
      else items[r].removeAttribute("aria-current");
    }

    // phones / tablets: a context bar only when this page has something to explore or apply
    var bar = pel("nx-ctxbar");
    var useful = reading && where.kind !== "none" && (nexp > 0 || understand.length > 0 || apply.length > 0);
    bar.hidden = !useful;
    main.setAttribute("data-ctxbar", useful ? "1" : "0");
    var place = concepts.length ? concepts[0].concept.title : sections.length ? sections[0].title : "";
    var summary = where.label + (place ? " \u00b7 " + place : "") +
      (nexp ? " \u00b7 " + nexp + " to explore" : "") + (understand.length ? " \u00b7 " + understand.length + " to understand" : "") +
      (apply.length ? " \u00b7 " + apply.length + " to apply" : "");
    if (useful) bar.innerHTML = '<span class="nx-ctxtext">' + esc(summary) + '</span><span class="nx-ctxup" aria-hidden="true">\u25b4</span>';
    bar.setAttribute("aria-label", useful ? summary + ". Open the learning panel." : "");

    // one polite announcement per change of place
    var live = reading && where.kind !== "none" ? summary : "";
    if (live !== PANEL.live) { PANEL.live = live; pel("nx-live").textContent = live; }
  }

  /* The bottom sheet (narrow screens only), and browser history.
     Opening pushes one history entry with the same URL (the hash does not change, so the
     router is not involved) marked as ours. Browser Back pops it and popstate closes the
     sheet. Every other way of closing (x, the scrim, Esc, a chapter-map choice) consumes
     that entry with history.back(), so the next Back goes where the student expects; the
     reader, its page and zoom are never touched. */
  var SHEET_MARK = "prayogx-ncert-sheet";

  function sheetEntry() {
    var st = window.history && window.history.state;
    return !!(st && st.nxSheet === SHEET_MARK);
  }

  function panelSheet(open, focusTo) {
    if (!PANEL) return;
    if (open) {
      if (!narrow()) return;
      if (PANEL.sheet) { var f0 = focusTo && focusTo.querySelector ? focusTo.querySelector("summary") : null; if (f0) f0.focus(); return; }
      sheetUI(true, focusTo);
      try {
        window.history.pushState({ nxSheet: SHEET_MARK }, "", window.location.href);
        PANEL.pushed = true;
      } catch (e) { PANEL.pushed = false; }
      return;
    }
    if (!PANEL.sheet) return;
    if (PANEL.pushed && sheetEntry()) {
      PANEL.pushed = false;
      window.history.back();                     // popstate closes the sheet
      clearTimeout(PANEL.backTimer);             // in case the browser does not report it
      PANEL.backTimer = setTimeout(function () { if (PANEL && PANEL.sheet) sheetUI(false); }, 400);
    } else {
      PANEL.pushed = false;
      sheetUI(false);
    }
  }

  function sheetUI(open, focusTo) {
    if (!PANEL || open === PANEL.sheet) return;
    PANEL.sheet = open;
    main.setAttribute("data-sheet", open ? "1" : "0");
    pel("nx-scrim").hidden = !open;
    pel("nx-ctxbar").setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      PANEL.opener = document.activeElement;
      var f = focusTo && focusTo.querySelector ? focusTo.querySelector("summary") : null;
      (f || pel("nx-sheetclose")).focus();
    } else {
      clearTimeout(PANEL.backTimer);
      if (PANEL.opener && PANEL.opener.focus && document.body.contains(PANEL.opener)) PANEL.opener.focus();
    }
  }

  /* ---------------------------------------------------------------- reader
     The chapter PDF is the student's own copy. NCERT's server does not let other
     sites read its files (no CORS header, docs/NCERT.md §4), and PrayogX does not
     host or relay them, so the student downloads the official chapter and picks
     it here. The bytes go from the file picker straight into PDF.js: nothing is
     uploaded, fetched, stored or cached.

       File -> checks (size, MIME, "%PDF-" signature) -> bytes -> SHA-256 (Web Crypto)
            -> PDF.js {data} -> one page drawn at a time

     Reader states, on #nx-reader[data-reader-state] (and on the layout):
       no_hosted_pdf   no copy is hosted: download the official PDF, then choose it
       file_selected   a file was picked
       validating      checking it is a usable PDF, fingerprinting it
       loading         PDF.js and the document are on their way
       ready           a page is drawn
       invalid_file    not usable: empty, too large, unreadable, not a PDF
       corrupt_pdf     PDF.js could not parse it
       unsupported_pdf a PDF this reader cannot open (password protected)
       source_blocked  a URL source the browser refuses (cross-origin, no CORS)
       error           anything else
     A file rejected while another document is open leaves that document as it was
     and shows a notice instead. A PDF.js failure releases the previous document
     first, so there is never more than one document or worker alive.

     Verification of the chosen file, against the catalogue's editions:
       exact_match     its SHA-256 equals a catalogued edition's: "Verified NCERT edition"
       unverified      readable, but no fingerprint match (another reprint, or another
                       file): "PDF loaded - edition could not be verified"
       unavailable     this browser has no Web Crypto here, so no fingerprint

     The page view is single-page for now (one canvas, swapped when the next draw is
     done). It lives behind readerGo / readerDraw / readerZoom, so a later continuous,
     virtualised view replaces only those. */
  var MAX_FILE_BYTES = 150 * 1024 * 1024;   // see docs/NCERT.md: an NCERT chapter is ~2-15 MB
  var ZOOM_STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 2.5, 3];   // multiples of fit width
  var READER = null;
  var READER_STATS = { bridgeLoads: 0, opened: 0, destroyed: 0, draws: 0 };

  /* The page context contract: where the student is, as plain metadata.
       { pdfPage, printedPage, chapterId, editionStatus }
     pdfPage is the 1-based PDF page; printedPage is the book's printed page from
     the PDF's own page labels (null when it has none, or a label is not a page
     number - it is never assumed equal to pdfPage); chapterId comes from the
     chapter feed; editionStatus is verification.status ("exact_match",
     "unverified" = readable but unverified, "unavailable"), or null for a source
     with no fingerprint. It is published (frozen) when the current page changes:
     once when a document's first page is known (after its page labels are read),
     then once per real page turn. Zoom, fit, resize and redraws never publish.
     A new document starts from nothing; a failed or closed one leaves no context.
     It never carries bytes, the File, or PDF.js objects. NCERT.ExperienceMapper
     (experience-mapper.js) is the consumer this is shaped for. */
  var PAGE_LISTENERS = [];
  var BRIDGE = { state: "idle", waiting: [], failures: 0 };

  function readerShell(ch) {
    function tool(act, glyph, label) {
      return '<button type="button" class="nx-tool" data-act="' + act + '" id="nx-t-' + act + '" aria-label="' + label +
        '" title="' + label + '"><span aria-hidden="true">' + glyph + "</span></button>";
    }
    return '<section class="nx-reader" id="nx-reader" data-reader-state="loading" aria-label="Chapter reader">' +
      '<div class="nx-rbar">' +
        '<button type="button" class="nx-rtitle" id="nx-rtitle" aria-controls="nx-panel" title="Chapter map and PDF source">Chapter ' +
          esc(ch.number) + " · " + esc(ch.title) + '<span class="nx-rtitlemore" aria-hidden="true"> \u25be</span></button>' +
        '<div class="nx-tools" id="nx-tools" role="toolbar" aria-label="Pages and zoom" hidden>' +
          '<div class="nx-tgroup">' + tool("first", "«", "First page") + tool("prev", "‹", "Previous page") +
            '<span class="nx-pagebox"><label class="nx-sr" for="nx-pageno">Page number</label>' +
            '<input id="nx-pageno" class="nx-pageno" type="number" inputmode="numeric" min="1" value="1" autocomplete="off">' +
            '<span class="nx-pagetotal" id="nx-pagetotal">/ 0</span></span>' +
            tool("next", "›", "Next page") + tool("last", "»", "Last page") + "</div>" +
          '<div class="nx-tgroup">' + tool("out", "−", "Zoom out") +
            '<button type="button" class="nx-tool nx-fit" data-act="fit" id="nx-t-fit" aria-label="Fit page width" title="Fit page width">Fit</button>' +
            tool("in", "+", "Zoom in") + "</div>" +
        "</div>" +
        '<span class="nx-rstatus" id="nx-rstatus" aria-live="polite"></span>' +
      "</div>" +
      '<div class="nx-rbody" id="nx-rbody"><p class="nx-rmsg">Preparing the reader…</p></div>' +
      "</section>";
  }

  /* The PDF source. Before a PDF is chosen: the official source and privacy, open. Once one is
     chosen: a compact one-line summary (file, status, "Choose another PDF"); the verification
     details, official source and privacy wait in one collapsed "Details". */
  function sourceCard(feed) {
    var src = feed.chapter.source || {}, ed = (src.editions || [])[0];
    return '<section class="nx-pblock nx-source" aria-labelledby="nx-source-h">' +
      '<h2 class="nx-plabel" id="nx-source-h">Chapter PDF</h2>' +
      '<div class="nx-srcsum" id="nx-srcsum" hidden><span class="nx-srcstate" id="nx-srcstate"></span>' +
        '<button type="button" class="nx-btn nx-btn-quiet nx-choose" id="nx-choose-card">Choose another PDF</button></div>' +
      '<input type="file" id="nx-file" class="nx-file" accept="application/pdf" tabindex="-1" aria-hidden="true">' +
      '<details class="nx-srcmore" id="nx-srcmore" open><summary>Details, official source and privacy</summary>' +
        '<div class="nx-verify" id="nx-verify" aria-live="polite"></div>' +
        '<p class="nx-srcline">Official NCERT chapter' + (ed ? " · catalogued edition " + esc(ed.label) : "") + "</p>" +
        (src.official ? '<a class="nx-rofficial" href="' + esc(src.official) + '" target="_blank" rel="noopener">' +
          'Open official NCERT PDF<span aria-hidden="true"> ↗</span></a>' : "") +
        '<p class="nx-privacy">The PDF you choose stays on this device. PrayogX never uploads or stores it.</p>' +
      "</details></section>";
  }

  function readerEls() {
    return { root: document.getElementById("nx-reader"), body: document.getElementById("nx-rbody"),
             status: document.getElementById("nx-rstatus"), tools: document.getElementById("nx-tools"),
             layout: document.getElementById("nx-chlayout"), verify: document.getElementById("nx-verify"),
             file: document.getElementById("nx-file") };
  }

  function officialButton(primary) {
    if (!READER || !READER.official) return "";
    return '<a class="nx-btn' + (primary ? "" : " nx-btn-quiet") + '" href="' + esc(READER.official) +
      '" target="_blank" rel="noopener">Open official NCERT PDF<span aria-hidden="true"> ↗</span></a>';
  }
  function chooseButton(label, primary) {
    return '<button type="button" class="nx-btn' + (primary ? "" : " nx-btn-quiet") + ' nx-choose" data-choose="1">' +
      esc(label) + "</button>";
  }
  function mb(bytes) {
    if (bytes < 1048576) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    return (bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0) + " MB";
  }

  function readerState(state, html, status) {
    var e = readerEls();
    if (!e.root) return;
    READER.state = state;
    READER.history.push(state);
    e.root.setAttribute("data-reader-state", state);
    e.layout.setAttribute("data-reader-state", state);
    if (html !== null) {
      e.body.innerHTML = html;
      var picks = e.body.querySelectorAll("[data-choose]");
      for (var i = 0; i < picks.length; i++) picks[i].onclick = readerPick;
      var retry = document.getElementById("nx-rretry");
      if (retry) retry.onclick = function () { if (READER && READER.retry) READER.retry(); };
    }
    e.tools.hidden = state !== "ready";
    panelRender();
    e.status.textContent = status || "";
  }

  function readerPick() {
    var f = document.getElementById("nx-file");
    if (f) f.click();
  }

  function readerMount(feed, ch) {
    var src = feed.chapter.source || {};
    READER = { seq: 0, pick: 0, source: null, official: src.official || "", editions: src.editions || [],
               bookPages: src.bookPages || null, chapterTitle: ch.title, chapterId: feed.chapter.id || null,
               context: null, ctxReady: false, state: "loading", history: [],
               detail: null, notice: null, local: null, verification: null, retry: null, labels: null,
               pages: 0, page: 0, zoom: 1, maxed: false, drawn: null,
               task: null, doc: null, render: null, width: 0, onResize: null, onKey: null, timer: null };
    var e = readerEls();
    e.file.onchange = function () {
      var file = e.file.files && e.file.files[0];
      e.file.value = "";              // so picking the same file again still fires
      if (file) readerChoose(file);
    };
    document.getElementById("nx-choose-card").onclick = readerPick;
    e.tools.onclick = function (ev) {
      var b = ev.target.closest ? ev.target.closest("[data-act]") : null;
      if (!b || b.disabled || !READER || !READER.doc) return;
      var a = b.getAttribute("data-act");
      if (a === "first") readerGo(1);
      else if (a === "prev") readerGo(READER.page - 1);
      else if (a === "next") readerGo(READER.page + 1);
      else if (a === "last") readerGo(READER.pages);
      else if (a === "in") readerZoom(1);
      else if (a === "out") readerZoom(-1);
      else if (a === "fit") readerZoom(0);
    };
    var pageno = document.getElementById("nx-pageno");
    pageno.onchange = function () { readerGo(parseInt(pageno.value, 10)); };
    pageno.onkeydown = function (ev) { if (ev.key === "Enter") { ev.preventDefault(); readerGo(parseInt(pageno.value, 10)); } };
    READER.onKey = function (ev) {
      if (!READER || !READER.doc || READER.state !== "ready") return;
      var t = ev.target && ev.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var k = ev.key, used = true;
      if (k === "ArrowRight" || k === "PageDown") readerGo(READER.page + 1);
      else if (k === "ArrowLeft" || k === "PageUp") readerGo(READER.page - 1);
      else if (k === "Home") readerGo(1);
      else if (k === "End") readerGo(READER.pages);
      else if (k === "+" || k === "=") readerZoom(1);
      else if (k === "-") readerZoom(-1);
      else if (k === "0") readerZoom(0);
      else used = false;
      if (used) ev.preventDefault();
    };
    e.root.addEventListener("keydown", READER.onKey);
    if (src.hosted) {
      // a same-origin copy, only ever set once permission is recorded (docs/NCERT.md §4)
      readerOpen({ url: "../" + String(src.hosted).replace(/^\/+/, "") });
      return;
    }
    readerHome();
  }

  function readerHome() {
    readerState("no_hosted_pdf",
      '<div class="nx-rpanel nx-onboard">' +
        "<h2>Read this chapter from your own copy</h2>" +
        "<p>PrayogX does not host NCERT textbooks. Get the official chapter PDF from NCERT, then open it here. It stays on your device.</p>" +
        '<ol class="nx-steps">' +
          '<li><span class="nx-stepno" aria-hidden="true">1</span><div><strong>Download the official chapter PDF</strong>' +
            officialButton(false) + "</div></li>" +
          '<li><span class="nx-stepno" aria-hidden="true">2</span><div><strong>Already downloaded it?</strong>' +
            chooseButton("Choose PDF", true) + "</div></li>" +
        "</ol>" +
      "</div>", "");
    readerVerify();
  }

  /* -------- a file was picked: check it, fingerprint it, then hand the bytes to PDF.js */
  function readerChoose(file) {
    if (!READER) return;
    var pick = ++READER.pick;
    var hadDoc = !!READER.doc;
    READER.notice = null;
    if (hadDoc) READER.history.push("file_selected");     // the open document stays on screen meanwhile
    else readerState("file_selected", '<p class="nx-rmsg">Checking “' + esc(file.name) + "”…</p>", "");
    function stale() { return !READER || pick !== READER.pick; }
    function reject(kind, message) {
      if (stale()) return;
      readerReject(kind, message, file);
    }
    if (!file.size) { reject("empty", "This file is empty."); return; }
    if (file.size > MAX_FILE_BYTES) {
      reject("too_large", "This file is " + mb(file.size) + ". The reader opens PDFs up to " + mb(MAX_FILE_BYTES) +
        "; an NCERT chapter PDF is usually well under 20 MB. Check that you chose the chapter PDF, not a whole-book archive.");
      return;
    }
    if (hadDoc) READER.history.push("validating");
    else readerState("validating", '<p class="nx-rmsg">Checking “' + esc(file.name) + "”…</p>", "");
    readBytes(file.slice(0, 1024), function (err, head) {
      if (stale()) return;
      if (err) { reject("unreadable", "Your browser could not read this file. Try choosing it again."); return; }
      if (!hasPdfSignature(new Uint8Array(head))) {
        reject("not_pdf", "This is not a PDF" + (file.type && file.type !== "application/pdf" ? " (it is " + file.type + ")" : "") +
          ". Choose the chapter PDF you downloaded from NCERT.");
        return;
      }
      readBytes(file, function (err2, buf) {
        if (stale()) return;
        if (err2) { reject("unreadable", "Your browser could not read this file. Try choosing it again."); return; }
        sha256(buf, function (hex) {
          if (stale()) return;
          var local = { name: file.name, size: file.size, type: file.type || "", sha256: hex, file: file };
          readerOpen({ data: new Uint8Array(buf) }, local);
        });
      });
    });
  }

  function readerReject(kind, message, file) {
    READER.notice = { kind: kind, message: message, name: file ? file.name : "" };
    if (READER.doc) {
      READER.history.push("invalid_file");
      // the open document stays exactly as it was; say why the new file was refused
      readerVerify();
      return;
    }
    READER.retry = null;
    readerState("invalid_file",
      '<div class="nx-rpanel" role="alert">' +
        "<h2>That file cannot be opened</h2>" +
        "<p>" + esc(message) + "</p>" +
        '<div class="nx-ractions">' + chooseButton("Choose another PDF", true) + officialButton(false) + "</div>" +
      "</div>", "");
    readerVerify();
  }

  function hasPdfSignature(bytes) {
    // "%PDF-" may follow a little leading junk; the specification allows it within the first 1024 bytes
    for (var i = 0; i + 4 < bytes.length && i < 1024; i++) {
      if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46 && bytes[i + 4] === 0x2d) return true;
    }
    return false;
  }

  function readBytes(blob, done) {
    var r = new FileReader();
    r.onload = function () { done(null, r.result); };
    r.onerror = function () { done(r.error || new Error("read failed"), null); };
    r.readAsArrayBuffer(blob);
  }

  function sha256(buf, done) {
    var subtle = window.crypto && window.crypto.subtle;
    if (!subtle || !subtle.digest) { done(null); return; }        // e.g. plain http on a LAN address
    subtle.digest("SHA-256", buf).then(function (d) {
      var b = new Uint8Array(d), hex = "";
      for (var i = 0; i < b.length; i++) hex += (b[i] < 16 ? "0" : "") + b[i].toString(16);
      done(hex);
    }, function () { done(null); });
  }

  /* -------- the PDF.js bridge, loaded only when a document is opened */
  function loadBridge(done) {
    if (window.NCERTPDF) { done(null); return; }
    BRIDGE.waiting.push(done);
    if (BRIDGE.state === "loading") return;
    BRIDGE.state = "loading";
    var finished = false;
    function finish(err) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      window.removeEventListener("ncert-pdf-ready", onReady);
      BRIDGE.state = err ? "idle" : "ready";
      if (err) BRIDGE.failures++;
      if (err && script.parentNode) script.parentNode.removeChild(script);   // let a retry load it again
      var w = BRIDGE.waiting; BRIDGE.waiting = [];
      for (var i = 0; i < w.length; i++) w[i](err);
    }
    function onReady() { finish(null); }
    window.addEventListener("ncert-pdf-ready", onReady);
    var script = document.createElement("script");
    script.type = "module";
    // a module that failed to load stays failed for this page under the same URL,
    // so a retry asks for it under a new one
    script.src = "reader.mjs" + (BRIDGE.failures ? "?retry=" + BRIDGE.failures : "");
    script.onerror = function () { finish(new Error("the PDF reader could not be loaded")); };
    var timer = setTimeout(function () { finish(new Error("the PDF reader took too long to load")); }, 30000);
    READER_STATS.bridgeLoads++;
    document.head.appendChild(script);
  }

  /* -------- open a document: {data: Uint8Array} (a chosen file) or {url} (a hosted copy) */
  function readerOpen(source, local) {
    if (!READER) return;
    readerRelease();
    var my = ++READER.seq;
    READER.source = source.url ? { url: source.url } : null;     // bytes are never kept: PDF.js takes them over
    READER.local = local || null;
    READER.notice = null;
    READER.detail = null;
    READER.verification = null;
    READER.labels = null;
    READER.context = null;     // no page context until the new document's first page is known
    READER.ctxReady = false;
    READER.pages = 0;          // nothing from a previous document may leak into this one
    READER.page = 0;
    READER.drawn = null;
    READER.zoom = 1;
    READER.maxed = false;
    READER.retry = local ? function () { readerChoose(local.file); } : function () { readerOpen(source); };
    readerState("loading", '<p class="nx-rmsg">Opening ' + (local ? "“" + esc(local.name) + "”" : "the chapter") + "…</p>", "");
    readerVerify();
    loadBridge(function (err) {
      if (!READER || my !== READER.seq) return;
      if (err) { readerFail({ kind: "error", name: "BridgeError", message: err.message }); return; }
      var task = window.NCERTPDF.open(source);
      READER.task = task;
      task.promise.then(function (doc) {
        if (!READER || my !== READER.seq) { task.destroy(); return; }   // superseded: end it and its worker
        READER.doc = doc;
        READER.pages = doc.numPages;
        READER.page = 1;
        READER_STATS.opened++;
        READER.verification = verify(local, doc.numPages);
        readerState("loading", '<div class="nx-rpage" id="nx-rpage" tabindex="0" aria-label="Chapter page. Use the arrow keys to turn pages."></div>', "");
        readerVerify();
        // printedPage needs the labels, so the first page context waits for them;
        // drawing does not
        var labelled = function (labels) {
          if (!READER || my !== READER.seq) return;
          READER.labels = labels || null;
          READER.verification = verify(local, doc.numPages, labels);
          readerVerify();
          readerStatus();
          if (JUMP !== null && labels) {                // open at the page the link names
            for (var li = 0; li < labels.length; li++) if (String(labels[li]).replace(/^\s+|\s+$/g, "") === String(JUMP)) { readerGo(li + 1); break; }
          }
          JUMP = null;
          READER.ctxReady = true;
          readerAnnounce();
        };
        doc.getPageLabels().then(labelled, function () { labelled(null); });
        READER.onResize = function () {
          clearTimeout(READER.timer);
          READER.timer = setTimeout(function () { if (READER && READER.doc) readerDraw(false); }, 150);
        };
        window.addEventListener("resize", READER.onResize);
        readerDraw(true);
      }, function (e) {
        if (!READER || my !== READER.seq) return;
        readerFail(window.NCERTPDF.classify(e, source));
      });
    });
  }

  /* What the catalogue can say about a chosen file. Never claims an edition it cannot prove. */
  function verify(local, numPages, labels) {
    if (!local) return null;
    var v = { status: "unverified", edition: null, sha256: local.sha256, pages: numPages, checks: [] };
    if (!local.sha256) v.status = "unavailable";
    for (var i = 0; i < READER.editions.length; i++) {
      if (local.sha256 && READER.editions[i].sha256 === local.sha256) { v.status = "exact_match"; v.edition = READER.editions[i].label; }
    }
    var ed = READER.editions[0];
    if (v.status !== "exact_match") {
      if (ed && ed.pdfPages) v.checks.push(numPages === ed.pdfPages
        ? numPages + " pages, the same as the catalogued edition"
        : numPages + " pages; the catalogued edition has " + ed.pdfPages);
      var bp = READER.bookPages;
      if (labels && labels.length && bp) {
        var a = parseInt(labels[0], 10), z = parseInt(labels[labels.length - 1], 10);
        v.checks.push(a === bp[0] && z === bp[1]
          ? "printed pages " + a + "–" + z + ", as in the catalogue"
          : "printed pages " + labels[0] + "–" + labels[labels.length - 1] + "; the catalogue has " + bp[0] + "–" + bp[1]);
      }
    }
    return v;
  }

  /* The source card: what file is open, and how far it could be verified. */
  function readerVerify() {
    var e = readerEls();
    if (!e.verify || !READER) return;
    var html = "";
    var L = READER.local, v = READER.verification;
    if (L) html += '<p class="nx-vfile"><span class="nx-vname">' + esc(L.name) + "</span> · " + esc(mb(L.size)) + "</p>";
    if (v && v.status === "exact_match") {
      html += '<p class="nx-vbadge nx-vok" data-verify="exact_match"><span aria-hidden="true">✓ </span>Verified NCERT edition · ' + esc(v.edition) + "</p>" +
        '<p class="nx-vnote">Its SHA-256 fingerprint matches the catalogued edition.</p>';
    } else if (v) {
      html += '<p class="nx-vbadge nx-vwarn" data-verify="' + v.status + '">PDF loaded — edition could not be verified</p>' +
        '<p class="nx-vnote">' + (v.status === "unavailable"
          ? "This browser cannot fingerprint files here, so the edition was not checked."
          : "Its fingerprint does not match the catalogued edition. It may be another reprint, or another file.") + "</p>" +
        (v.checks.length ? '<ul class="nx-vchecks"><li>' + v.checks.map(esc).join("</li><li>") + "</li></ul>" : "");
    } else if (!L && READER.state === "no_hosted_pdf") {
      html += '<p class="nx-vnote">No PDF chosen yet.</p>';
    }
    if (READER.notice && READER.doc) {
      // only while a document stays open; otherwise the reader panel itself explains the refusal
      html += '<p class="nx-vbadge nx-verr" role="alert" data-notice="' + esc(READER.notice.kind) + '">' +
        "“" + esc(READER.notice.name) + "” was not opened: " + esc(READER.notice.message) + "</p>";
    }
    e.verify.innerHTML = html;

    // the compact summary: which file, and how far it was verified
    var sum = document.getElementById("nx-srcsum"), st = document.getElementById("nx-srcstate");
    if (sum && st) {
      sum.hidden = !L;
      if (L) {
        var badge = !READER.doc ? ["nx-vwarn", "not opened"]
          : v && v.status === "exact_match" ? ["nx-vok", "\u2713 Verified edition"]
          : v && v.status === "unavailable" ? ["nx-vwarn", "Edition not checked"]
          : v ? ["nx-vwarn", "Edition not verified"] : null;
        st.innerHTML = '<span class="nx-srcfile">' + esc(L.name) + "</span>" +
          (badge ? '<span class="nx-srcbadge ' + badge[0] + '">' + badge[1] + "</span>" : "");
      }
    }
    var more = document.getElementById("nx-srcmore");
    if (more && READER.notice && READER.doc) more.open = true;      // say why a new file was refused
  }

  /* -------- the page view: one page at a time */
  function readerGo(n) {
    if (!READER || !READER.doc) return;
    if (isNaN(n)) n = READER.page;
    n = Math.max(1, Math.min(READER.pages, n));
    if (n === READER.page) {
      // same page: draw it only if nothing is drawn or drawing for it; never a page change
      if (!READER.render && !(READER.drawn && READER.drawn.pageNumber === n)) readerDraw(true);
      readerTools();
      return;
    }
    READER.page = n;
    readerAnnounce();
    readerDraw(true);
  }

  /* -------- the page context: build it, publish it when the page changes */
  function readerContext() {
    if (!READER || !READER.doc || !READER.page) return null;
    var label = READER.labels ? READER.labels[READER.page - 1] : null;
    var printed = label !== null && label !== undefined && /^\s*\d+\s*$/.test(String(label)) ? parseInt(label, 10) : null;
    var ctx = { pdfPage: READER.page, printedPage: printed, chapterId: READER.chapterId,
                editionStatus: READER.verification ? READER.verification.status : null };
    return Object.freeze ? Object.freeze(ctx) : ctx;
  }

  function readerAnnounce() {
    if (!READER || !READER.ctxReady) return;
    var ctx = readerContext();
    if (!ctx || (READER.context && READER.context.pdfPage === ctx.pdfPage)) return;   // not a change
    READER.context = ctx;
    if (ctx.printedPage !== null) {                 // the address bar follows the page: refresh and bookmarks return here
      DEEP = ctx.printedPage;
      try {
        var seg = (location.hash || "").replace(/^#\/?/, "").replace(/\/+$/, "").split("/").slice(0, 4).join("/");
        if (seg.split("/").length === 4) history.replaceState(history.state, "", "#/" + seg + "/p" + ctx.printedPage);
      } catch (e) { /* the address bar is a convenience */ }
    }
    var list = PAGE_LISTENERS.slice();
    for (var i = 0; i < list.length; i++) {
      // a listener's own error must not break the reader; surface it without stopping
      try { list[i](ctx); } catch (e) { setTimeout(function () { throw e; }, 0); }
    }
    panelRender();
  }

  function readerZoom(dir) {
    if (!READER || !READER.doc) return;
    var z = READER.zoom, next = 1, i;
    if (dir > 0) {
      if (READER.maxed) return;
      next = z;
      for (i = 0; i < ZOOM_STEPS.length; i++) if (ZOOM_STEPS[i] > z + 0.001) { next = ZOOM_STEPS[i]; break; }
    } else if (dir < 0) {
      next = z;
      for (i = ZOOM_STEPS.length - 1; i >= 0; i--) if (ZOOM_STEPS[i] < z - 0.001) { next = ZOOM_STEPS[i]; break; }
    }
    if (Math.abs(next - z) < 0.001 && READER.drawn) { readerTools(); return; }
    READER.zoom = next;
    READER.maxed = false;
    readerDraw(true);
  }

  /* Draw the current page into a fresh canvas and swap it in when done, so a turn or a
     zoom never shows a half-drawn page and never reuses a canvas still being drawn. */
  function readerDraw(force) {
    var holder = document.getElementById("nx-rpage");
    if (!holder || !READER || !READER.doc) return;
    var width = Math.max(200, Math.floor(holder.clientWidth));
    if (!force && READER.drawn && Math.abs(width - READER.width) < 8) return;
    if (READER.render) { READER.render.cancel(); READER.render = null; }
    READER.width = width;
    var my = READER.seq, page = READER.page;
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-label", "Page " + page + " of " + READER.pages);
    var r = window.NCERTPDF.renderPage(READER.doc, page, canvas, { fitWidth: width, zoom: READER.zoom });
    READER.render = r;
    READER_STATS.draws++;
    readerTools();
    r.promise.then(function (info) {
      if (!READER || my !== READER.seq || READER.render !== r) { canvas.width = 0; canvas.height = 0; return; }
      READER.render = null;
      var old = holder.querySelector("canvas");
      holder.appendChild(canvas);
      if (old) { holder.removeChild(old); old.width = 0; old.height = 0; }   // free the old page's pixels now
      READER.drawn = info;
      // a page wider than the reader scrolls from its left edge (centred, its left part would be unreachable)
      holder.className = "nx-rpage" + (info.cssWidth > holder.clientWidth ? " nx-wide" : "");
      if (info.clamped) { READER.zoom = info.zoom; READER.maxed = true; }
      if (READER.state !== "ready") readerState("ready", null, "");
      readerStatus();
      readerTools();
    }, function (e) {
      canvas.width = 0; canvas.height = 0;
      if (!READER || my !== READER.seq || READER.render !== r) return;
      READER.render = null;
      if (e && (e.name === "RenderingCancelledException" || e.message === "cancelled")) return;
      readerFail(window.NCERTPDF.classify(e, READER.source));
    });
  }

  function readerStatus() {
    var e = readerEls();
    if (!e.status || !READER || READER.state !== "ready") return;
    var label = READER.labels && READER.labels[READER.page - 1];
    e.status.textContent = (label && label !== String(READER.page) ? "Book p. " + label + " · " : "") +
      Math.round(READER.zoom * 100) + "%" + (READER.maxed ? " (max)" : "");
  }

  function readerTools() {
    if (!READER) return;
    var n = READER.page, N = READER.pages;
    function set(id, off) {
      var b = document.getElementById(id);
      if (!b) return;
      // a focused button that becomes disabled drops focus to the page body, and the reader's
      // keys stop working: hand focus to the page instead
      if (off && document.activeElement === b) { var pg = document.getElementById("nx-rpage"); if (pg) pg.focus(); }
      b.disabled = off;
    }
    set("nx-t-first", n <= 1); set("nx-t-prev", n <= 1);
    set("nx-t-next", n >= N); set("nx-t-last", n >= N);
    set("nx-t-out", READER.zoom <= ZOOM_STEPS[0] + 0.001);
    set("nx-t-in", READER.maxed || READER.zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1] - 0.001);
    var fit = document.getElementById("nx-t-fit");
    if (fit) fit.setAttribute("aria-pressed", Math.abs(READER.zoom - 1) < 0.001 ? "true" : "false");
    var no = document.getElementById("nx-pageno"), tot = document.getElementById("nx-pagetotal");
    if (no) { no.value = String(n); no.max = String(N); }
    if (tot) tot.textContent = "/ " + N;
  }

  function readerFail(info) {
    READER.detail = info;
    readerRelease();
    var kind = info.kind === "blocked" ? "source_blocked"
      : /InvalidPDF|FormatError/.test(info.name) ? "corrupt_pdf"
      : /Password/.test(info.name) ? "unsupported_pdf" : "error";
    var title = {
      source_blocked: "The NCERT website does not let other sites load this PDF",
      corrupt_pdf: "This PDF looks damaged",
      unsupported_pdf: "This PDF cannot be opened here",
      error: "The reader could not open this PDF"
    }[kind];
    var text = {
      source_blocked: "Your browser refused to hand the file to PrayogX. Download it from the NCERT website, then choose it here.",
      corrupt_pdf: "The file starts like a PDF but could not be read. Download the chapter again from NCERT and choose the new copy.",
      unsupported_pdf: "It is password protected. NCERT chapter PDFs are not, so this is probably a different file.",
      error: "Something went wrong while opening or drawing it. Try again, or choose another copy."
    }[kind];
    var canRetry = kind !== "unsupported_pdf" && READER.retry;
    readerState(kind,
      '<div class="nx-rpanel" role="alert">' +
        "<h2>" + title + "</h2><p>" + text + "</p>" +
        '<p class="nx-state-detail">' + esc(info.name + (info.status ? " " + info.status : "") + ": " + info.message) + "</p>" +
        '<div class="nx-ractions">' + chooseButton("Choose another PDF", true) +
          (canRetry ? '<button type="button" class="nx-btn nx-btn-quiet" id="nx-rretry">Try again</button>' : "") +
          officialButton(false) + "</div>" +
      "</div>", "");
    readerVerify();
  }

  /* Release the open document, its worker, any render in flight and the resize hook. */
  function readerRelease() {
    if (!READER) return;
    clearTimeout(READER.timer);
    if (READER.onResize) { window.removeEventListener("resize", READER.onResize); READER.onResize = null; }
    if (READER.render) { READER.render.cancel(); READER.render = null; }
    // PDF.js 6: the loading task owns the document and its worker; destroying the task ends both
    if (READER.task) { READER.task.destroy(); if (READER.doc) READER_STATS.destroyed++; }
    READER.doc = null;
    READER.task = null;
    READER.context = null;
    READER.ctxReady = false;
    READER.width = 0;
    var holder = document.getElementById("nx-rpage");
    var c = holder && holder.querySelector("canvas");
    if (c) { c.width = 0; c.height = 0; }
  }

  function readerDestroy() {
    if (!READER) return;
    READER.seq++;            // anything still in flight for this reader is now ignored
    READER.pick++;
    readerRelease();
    var root = document.getElementById("nx-reader");
    if (root && READER.onKey) root.removeEventListener("keydown", READER.onKey);
    READER.local = null;     // drop the File reference
    READER = null;
  }

  /* ------------------------------------------------------------- routing */
  var JUMP = null;     // the deep-linked page, consumed by the first PDF that opens (a re-picked file starts at page 1)
  var DEEP = null;     // printed page named by the URL (#/…/ch05/p143); kept in step with the page being read
  function parse() {
    var h = (location.hash || "").replace(/^#\/?/, "").replace(/\/+$/, "");
    if (!h) return [];
    var parts = h.split("/");
    for (var i = 0; i < parts.length; i++) parts[i] = decodeURIComponent(parts[i]).toLowerCase();
    return parts;
  }

  function route() {
    var parts = parse();
    // only the page segment (…/p143) changed on the chapter already open: follow it, never rebuild the reader
    var baseOf = function (h) { return String(h || "").replace(/^#\/?/, "").replace(/\/+$/, "").replace(/\/p[0-9]{1,4}$/i, "").toLowerCase(); };
    if (STATE && STATE.view === "chapter" && baseOf(STATE.route) === baseOf(location.hash)) {
      var m = /\/p([0-9]{1,4})\/?$/i.exec(location.hash || "");
      DEEP = m ? parseInt(m[1], 10) : DEEP;
      STATE.route = location.hash || "#/";
      return;
    }
    var my = ++seq;
    // an optional 5th segment, p<printed page>, is the deep link / bookmark to a page of the chapter
    DEEP = JUMP = null;
    if (parts.length === 5 && /^p[0-9]{1,4}$/.test(parts[4])) { DEEP = JUMP = parseInt(parts[4].slice(1), 10); parts = parts.slice(0, 4); }
    if (parts.length > 4) { showNotFound(); return; }
    if (!CAT) showLoading("the NCERT library");
    loadCatalog(function (err) {
      if (my !== seq) return;
      if (err) { showError("the NCERT library", err); return; }
      if (parts.length < 4) {
        showBrowse({ cls: parts[0], subj: parts[1], book: parts[2] });
        return;
      }
      var books = CAT.books || [];
      for (var i = 0; i < books.length; i++) {
        var bp = bookPath(books[i]);
        if (!bp || bp[0] !== parts[0] || bp[1] !== parts[1] || bp[2] !== parts[2]) continue;
        var chs = books[i].chapters || [];
        for (var j = 0; j < chs.length; j++) {
          if (chapterSeg(chs[j]) !== parts[3]) continue;
          var book = books[i], ch = chs[j];
          if (!CHAPTERS[ch.id]) showLoading("Chapter " + ch.number + ", " + ch.title);
          loadChapter(ch, function (err2, feed) {
            if (my !== seq) return;
            if (err2) showError("Chapter " + ch.number + ", " + ch.title, err2);
            else showChapter(book, ch, feed);
          });
          return;
        }
      }
      showNotFound();
    });
  }

  /* ----------------------------------------------------------- bootstrap */
  // the theme choice is shared with the library (same key, same attribute)
  document.getElementById("themebtn").addEventListener("click", function () {
    var root = document.documentElement;
    var dark = root.getAttribute("data-theme") === "dark" ||
      (!root.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.setAttribute("data-theme", dark ? "light" : "dark");
    try { localStorage.setItem("jee-sim-theme", dark ? "light" : "dark"); } catch (e) {}
  });
  try {
    var saved = localStorage.getItem("jee-sim-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  } catch (e) {}

  var api = window.NCERT || {};      // experience-mapper.js has already added NCERT.ExperienceMapper
  window.NCERT = api;
  api.state = function () { return { status: STATE.status, view: STATE.view, route: STATE.route }; };
  api.reader = {
    // the page context contract (see PAGE_LISTENERS above)
    getCurrentPageContext: function () { return READER ? READER.context : null; },
    onPageChange: function (fn) {
      if (typeof fn !== "function") return function () {};
      PAGE_LISTENERS.push(fn);
      return function () { var i = PAGE_LISTENERS.indexOf(fn); if (i >= 0) PAGE_LISTENERS.splice(i, 1); };
    },
    // test hooks for the reader (read-only views of its state, plus open() for URL sources)
    state: function () {
      if (!READER) return null;
      var L = READER.local;
      return { state: READER.state, history: READER.history.slice(), pages: READER.pages, page: READER.page,
               zoom: READER.zoom, maxed: READER.maxed, drawn: READER.drawn, detail: READER.detail,
               notice: READER.notice, verification: READER.verification,
               file: L ? { name: L.name, size: L.size, type: L.type, sha256: L.sha256 } : null,
               source: L ? "local" : READER.source ? "url" : null,
               version: window.NCERTPDF ? window.NCERTPDF.version : null };
    },
    open: function (source) { if (READER) readerOpen(source); },
    close: function () { readerDestroy(); },
    stats: function () {
      return { bridgeLoads: READER_STATS.bridgeLoads, opened: READER_STATS.opened, destroyed: READER_STATS.destroyed,
               draws: READER_STATS.draws, rendering: !!(READER && READER.render), hasDoc: !!(READER && READER.doc),
               maxFileBytes: MAX_FILE_BYTES };
    },
    // lets a test exercise the size limit without building a 150 MB file; returns the old value
    _setMaxFileBytes: function (n) { var o = MAX_FILE_BYTES; MAX_FILE_BYTES = n; return o; }
  };
  window.addEventListener("pagehide", function () { readerDestroy(); });
  window.addEventListener("hashchange", route);
  route();
})();
