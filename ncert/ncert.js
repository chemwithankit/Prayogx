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

  /* Chapter: a placeholder for the reading screen - the chapter and its sections. */
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
      '<p class="nx-note">The chapter reader and its simulations open here in the next build. For now this is the chapter outline.</p>' +
      '<section class="nx-outline" aria-labelledby="nx-outline-h">' +
        '<h2 id="nx-outline-h">Sections</h2><ol class="nx-sections">';
    for (var i = 0; i < secs.length; i++) {
      var s = secs[i];
      html += '<li class="nx-sec nx-l' + (s.level === 2 ? 2 : 1) + '" data-section="' + esc(s.id) + '">' +
        '<span class="nx-secno">' + esc(s.number) + "</span>" +
        '<span class="nx-secbody"><span class="nx-sectitle">' + esc(s.title) + "</span>" +
        '<span class="nx-secpages">' + esc(pages(s.pages)) + "</span></span></li>";
    }
    html += "</ol></section>";
    setState("ready", "chapter", html, ch.title + ", Class " + bp[0] + " " + book.subject);
  }

  /* ------------------------------------------------------------- routing */
  function parse() {
    var h = (location.hash || "").replace(/^#\/?/, "").replace(/\/+$/, "");
    if (!h) return [];
    var parts = h.split("/");
    for (var i = 0; i < parts.length; i++) parts[i] = decodeURIComponent(parts[i]).toLowerCase();
    return parts;
  }

  function route() {
    var my = ++seq;
    var parts = parse();
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

  window.NCERT = { state: function () { return { status: STATE.status, view: STATE.view, route: STATE.route }; } };
  window.addEventListener("hashchange", route);
  route();
})();
