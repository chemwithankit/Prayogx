/* ==========================================================================
   PrayogX — JEE Advanced Interactive Simulation Library — website
   A discovery / filtering / navigation layer. It never contains simulation
   content: every card links out to the existing simulation HTML file at the
   `path` recorded in the manifest.

   WHAT IT READS
     content/index.json     — card-level records, one per simulation. This is
                              the startup payload: ~1.2 KB per simulation
                              against ~9.7 KB for a full manifest entry.
     content/search.json    — free-text blobs, fetched on the first keystroke
     content/sims/<ID>.json — the full record, fetched when a detail page opens
     data/manifest.json     — fallback when the feed has not been built
     data/manifest.js       — fallback again, for file:// where fetch() of a
                              local JSON file is blocked

   All three are generated from data/manifest.json, which remains the single
   source of truth. Nothing about the catalogue is hardcoded here.
   Nothing about the catalogue is hardcoded here: years, subjects, chapters,
   topics, counts and cards are all derived from the manifest at load time.
   Add a simulation to the manifest and it appears — no change to this file.
   ========================================================================== */
(function () {
  "use strict";

  var SUBJECT_COLOR = {
    Physics: "var(--subj-physics)",
    Chemistry: "var(--subj-chemistry)",
    Mathematics: "var(--subj-mathematics)"
  };

  var app = document.getElementById("app").querySelector(".inner");
  var SIMS = [];          /* card records - everything the catalogue needs */
  var LIB = {};
  var MODE = "feed";      /* "feed" = lazy detail records, "manifest" = all inline */
  var DETAIL = {};        /* id -> full record, filled on demand */
  var SEARCH = null;      /* id -> text blob, fetched on the first search */
  var SEARCH_STATE = "";  /* "" | "loading" | "ready" | "failed" */
  var PAGE = 24;          /* cards drawn per batch - the grid never draws 1000 */
  var shownCount = PAGE;

  /* ------------------------------------------------------- user-local state
     Kept in localStorage and namespaced, so an account layer can later adopt
     the same shape and sync it without changing any call site here. */
  var STORE = "prayogx:v1:";
  function readSet(key) {
    try { return JSON.parse(localStorage.getItem(STORE + key) || "[]"); }
    catch (e) { return []; }
  }
  function writeSet(key, list) {
    try { localStorage.setItem(STORE + key, JSON.stringify(list.slice(0, 200))); }
    catch (e) {}
  }
  function isFav(id) { return readSet("favorites").indexOf(id) >= 0; }
  function toggleFav(id) {
    var f = readSet("favorites"), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.unshift(id);
    writeSet("favorites", f);
    return i < 0;
  }
  function noteVisit(id) {
    var r = readSet("recent"), i = r.indexOf(id);
    if (i >= 0) r.splice(i, 1);
    r.unshift(id);
    writeSet("recent", r.slice(0, 12));
  }

  /* ------------------------------------------------------------------ util */
  function esc(s) {
    return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function color(subject) { return SUBJECT_COLOR[subject] || "var(--subj-other)"; }
  function arr(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
  function uniqSorted(list) {
    var seen = {}, out = [];
    list.forEach(function (v) { if (v !== undefined && v !== null && v !== "" && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out.sort(function (a, b) { return String(a).localeCompare(String(b), undefined, { numeric: true }); });
  }

  /* --------------------------------------------------------------- routing */
  /* #/                       → catalogue (filters live in the hash query)
     #/?y=2026&s=Chemistry…   → catalogue with filters applied (bookmarkable)
     #/sim/<SIMULATION-ID>    → detail page for one simulation (bookmarkable) */
  function parseHash() {
    var h = location.hash.replace(/^#/, "");
    if (!h || h === "/") return { view: "list", f: {} };
    var m = h.match(/^\/sim\/([^/?]+)/);
    if (m) return { view: "sim", id: decodeURIComponent(m[1]) };
    var q = h.indexOf("?");
    var f = {};
    if (q >= 0) {
      h.slice(q + 1).split("&").forEach(function (kv) {
        if (!kv) return;
        var p = kv.split("=");
        f[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " "));
      });
    }
    return { view: "list", f: f };
  }
  // A simulation page is a plain static file, so a browser will happily serve a
  // stale copy after the page has been updated. Tagging the link with the
  // revision from the manifest makes each revision a distinct URL.
  function simHref(sim) {
    return esc(sim.path) + (sim.revision ? "?v=" + encodeURIComponent(sim.revision) : "");
  }

  function filterHash(f) {
    var parts = [];
    ["q", "y", "s", "c", "t", "fav"].forEach(function (k) {
      if (f[k]) parts.push(k + "=" + encodeURIComponent(f[k]));
    });
    return "#/" + (parts.length ? "?" + parts.join("&") : "");
  }
  function setFilters(f, replace) {
    var h = filterHash(f);
    if (replace && history.replaceState) history.replaceState(null, "", h);
    else location.hash = h;
    if (replace) render();
  }

  /* -------------------------------------------------------------- matching */
  function haystack(s) {
    // Index fields are always present; the prose blob is added once
    // content/search.json has arrived, so the first keystroke still matches on
    // title, chapter, topic and tags rather than waiting on a request.
    return [
      s.id, s.title, s.shortTitle, s.subject, s.branch, s.chapter, s.topic,
      s.paper, s.year, s.exam, s.difficulty, s.questionType, s.section,
      "q" + s.questionNumber, "question " + s.questionNumber,
      arr(s.tags).join(" "),
      s.summary || "", arr(s.subtopics).join(" "), arr(s.concepts).join(" "),
      arr(s.formulas).join(" "), arr(s.interactivity).join(" "),
      (SEARCH && SEARCH[s.id]) || ""
    ].join(" ").toLowerCase();
  }
  /* The blob is several times the size of a card and a visitor who never
     searches never needs it, so it is fetched on the first query and the view
     re-rendered when it lands. */
  function ensureSearch() {
    if (MODE !== "feed" || SEARCH_STATE) return;
    SEARCH_STATE = "loading";
    fetch("content/search.json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { SEARCH = j.text || {}; SEARCH_STATE = "ready"; render(); })
      .catch(function () { SEARCH_STATE = "failed"; });
  }
  function matches(s, f) {
    if (f.fav && !isFav(s.id)) return false;
    if (f.y && String(s.year) !== String(f.y)) return false;
    if (f.s && s.subject !== f.s) return false;
    if (f.c && s.chapter !== f.c) return false;
    if (f.t && s.topic !== f.t) return false;
    if (f.q) {
      var hay = haystack(s);
      var terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) < 0) return false;
    }
    return true;
  }
  function sortSims(list) {
    return list.slice().sort(function (a, b) {
      if (a.year !== b.year) return b.year - a.year;                       // newest year first
      var pa = a.paperNumber || 0, pb = b.paperNumber || 0;
      if (pa !== pb) return pa - pb;
      if (a.subject !== b.subject) return String(a.subject).localeCompare(String(b.subject));
      return (a.questionNumber || 0) - (b.questionNumber || 0);
    });
  }

  /* ---------------------------------------------------------------- pieces */
  function countsHTML(all, shown) {
    var bySubject = {}, byYear = {};
    all.forEach(function (s) {
      bySubject[s.subject] = (bySubject[s.subject] || 0) + 1;
      byYear[s.year] = (byYear[s.year] || 0) + 1;
    });
    var html = '<div class="count total"><span class="n">' + all.length + '</span>' +
      '<span class="k">total simulation' + (all.length === 1 ? "" : "s") + '</span></div>';
    Object.keys(bySubject).sort().forEach(function (k) {
      html += '<div class="count subj" style="--c:' + color(k) + '">' +
        '<span class="swatch"></span><span class="n">' + bySubject[k] + '</span>' +
        '<span class="k">' + esc(k) + '</span></div>';
    });
    Object.keys(byYear).sort().reverse().forEach(function (k) {
      html += '<div class="count"><span class="n">' + byYear[k] + '</span><span class="k">' + esc(k) + '</span></div>';
    });
    return '<div class="counts">' + html + '</div>';
  }

  function optionsFor(list, key, current) {
    var vals = uniqSorted(list.map(function (s) { return s[key]; }));
    if (key === "year") vals = vals.reverse();
    // keep a selected value visible even if the other filters would hide it
    if (current && vals.indexOf(current) < 0 && vals.indexOf(Number(current)) < 0) vals.unshift(current);
    return vals.map(function (v) {
      return '<option value="' + esc(v) + '"' + (String(v) === String(current) ? " selected" : "") + ">" + esc(v) + "</option>";
    }).join("");
  }

  function filtersHTML(f) {
    // Each dropdown offers the values still reachable given the OTHER filters,
    // so chapters narrow to the chosen subject and topics to the chosen chapter.
    function pool(exclude) {
      var g = {};
      Object.keys(f).forEach(function (k) { if (k !== exclude && k !== "q") g[k] = f[k]; });
      return SIMS.filter(function (s) { return matches(s, g); });
    }
    return '' +
      '<form class="filters" id="filters" autocomplete="off">' +
        '<div class="searchrow">' +
          '<input type="search" id="q" placeholder="Search title, chapter, topic, concept, formula or tag…" ' +
            'value="' + esc(f.q || "") + '" aria-label="Search simulations">' +
          '<button type="button" class="btn fav-filter' + (f.fav ? " on" : "") + '" id="favfilter" ' +
            'aria-pressed="' + (f.fav ? "true" : "false") + '">' +
            (f.fav ? "\u2605" : "\u2606") + " Favourites</button>" +
          '<button type="button" class="btn" id="reset">Reset filters</button>' +
        '</div>' +
        '<div class="selects">' +
          '<div class="field"><label for="fy">Year</label><select id="fy">' +
            '<option value="">All years</option>' + optionsFor(pool("y"), "year", f.y) + '</select></div>' +
          '<div class="field"><label for="fs">Subject</label><select id="fs">' +
            '<option value="">All subjects</option>' + optionsFor(pool("s"), "subject", f.s) + '</select></div>' +
          '<div class="field"><label for="fc">Chapter</label><select id="fc">' +
            '<option value="">All chapters</option>' + optionsFor(pool("c"), "chapter", f.c) + '</select></div>' +
          '<div class="field"><label for="ft">Topic</label><select id="ft">' +
            '<option value="">All topics</option>' + optionsFor(pool("t"), "topic", f.t) + '</select></div>' +
        '</div>' +
      '</form>';
  }

  function activeFiltersHTML(f) {
    var labels = { q: "search", y: "year", s: "subject", c: "chapter", t: "topic",
                   fav: "favourites" };
    var pills = Object.keys(labels).filter(function (k) { return f[k]; }).map(function (k) {
      return '<button type="button" class="pill" data-clear="' + k + '">' +
        labels[k] + (k === "fav" ? "" : ": " + esc(f[k])) + " ✕</button>";
    });
    return pills.length ? '<div class="activefilters">' + pills.join("") + "</div>" : "";
  }

  function accessHTML(s) {
    var a = s.access || "free";
    if (a === "free") return "";
    return '<span class="lock" data-access="' + esc(a) + '">' +
      (a === "premium" ? "PREMIUM" : "PRO") + "</span>";
  }
  function cardHTML(s) {
    var tags = arr(s.tags).slice(0, 4).map(function (t) {
      return '<button type="button" class="tag" data-tag="' + esc(t) + '">' + esc(t) + "</button>";
    }).join("");
    var fav = isFav(s.id);
    return '' +
      '<article class="card" style="--c:' + color(s.subject) + '">' +
        '<button type="button" class="fav' + (fav ? " on" : "") + '" data-fav="' + esc(s.id) +
          '" aria-pressed="' + (fav ? "true" : "false") +
          '" aria-label="' + (fav ? "Remove from" : "Add to") + ' favourites">' +
          (fav ? "\u2605" : "\u2606") + "</button>" +
        accessHTML(s) +
        '<div class="exam">' + esc(s.exam || "JEE ADVANCED").toUpperCase() + "</div>" +
        '<div class="where">' + esc(s.year) + " · " + esc(String(s.paper || "").toUpperCase()) + "</div>" +
        '<div class="subject">' + esc(String(s.subject || "").toUpperCase()) + "</div>" +
        '<div class="qno">Question ' + esc(s.questionNumber) + "</div>" +
        "<h3><a href=\"#/sim/" + encodeURIComponent(s.id) + '">' + esc(s.title) + "</a></h3>" +
        "<dl>" +
          "<dt>Chapter</dt><dd>" + esc(s.chapter) + "</dd>" +
          "<dt>Topic</dt><dd>" + esc(s.topic) + "</dd>" +
        "</dl>" +
        '<div class="tags">' + tags + "</div>" +
        '<div class="foot">' +
          '<a class="open" href="' + simHref(s) + '">OPEN SIMULATION</a>' +
          '<span class="simid">' + esc(s.id) + "</span>" +
        "</div>" +
      "</article>";
  }

  /* ------------------------------------------------------------ list view */
  /* A strip of what the visitor opened last, so there is something to come
     back to. Hidden until there is a history to show. */
  function recentHTML() {
    var ids = readSet("recent"), out = [];
    ids.forEach(function (id) {
      for (var i = 0; i < SIMS.length; i++) {
        if (SIMS[i].id === id) { out.push(SIMS[i]); break; }
      }
    });
    if (!out.length) return "";
    return '<section class="recent"><h2>Recently opened</h2><div class="rrow">' +
      out.slice(0, 8).map(function (s) {
        return '<a class="rchip" style="--c:' + color(s.subject) + '" href="#/sim/' +
          encodeURIComponent(s.id) + '"><span class="rk">' + esc(s.chapter) + "</span>" +
          "<span class=\"rt\">" + esc(s.shortTitle || s.title) + "</span></a>";
      }).join("") + "</div></section>";
  }

  function renderList(f) {
    var shown = sortSims(SIMS.filter(function (s) { return matches(s, f); }));
    /* Only a batch is put in the DOM. At 17 simulations this is invisible; at
       1000 it is the difference between a paint and a stall. */
    var batch = shown.slice(0, shownCount);
    var more = shown.length - batch.length;
    var body = shown.length
      ? '<div class="grid">' + batch.map(cardHTML).join("") + "</div>" +
        (more > 0
          ? '<div class="morerow"><button type="button" class="btn" id="more">Show ' +
            Math.min(more, PAGE) + " more <span>(" + more + " left)</span></button></div>"
          : "")
      : '<div class="empty"><h3>No simulations match those filters</h3>' +
        "<p>Try clearing one of them, or search for a broader term.</p></div>";

    var searching = f.q && SEARCH_STATE === "loading";
    app.innerHTML =
      countsHTML(SIMS) +
      (f.q || f.fav ? "" : recentHTML()) +
      filtersHTML(f) +
      '<p class="resultline" aria-live="polite"><span>Showing <strong>' + batch.length +
        "</strong> of " + shown.length + " match" + (shown.length === 1 ? "" : "es") +
        " in " + SIMS.length + " simulation" + (SIMS.length === 1 ? "" : "s") + "." +
        (searching ? " <em>Loading the full-text index…</em>" : "") + "</span>" +
        activeFiltersHTML(f) + "</p>" +
      body;

    var moreBtn = document.getElementById("more");
    if (moreBtn) moreBtn.addEventListener("click", function () {
      shownCount += PAGE;
      renderList(f);
    });

    var q = document.getElementById("q");
    var t;
    q.addEventListener("input", function () {
      clearTimeout(t);
      var v = q.value;
      ensureSearch();
      t = setTimeout(function () {
        shownCount = PAGE;
        var nf = current(); nf.q = v;
        var pos = q.selectionStart;
        setFilters(nf, true);
        var nq = document.getElementById("q");
        if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} }
      }, 160);
    });
    bindSelect("fy", "y"); bindSelect("fs", "s"); bindSelect("fc", "c"); bindSelect("ft", "t");

    document.getElementById("reset").addEventListener("click", function () { setFilters({}); });
    var favBtn = document.getElementById("favfilter");
    if (favBtn) favBtn.addEventListener("click", function () {
      var nf = current();
      if (nf.fav) delete nf.fav; else nf.fav = "1";
      shownCount = PAGE;
      setFilters(nf);
    });

    app.addEventListener("click", function (e) {
      var star = e.target.closest("[data-fav]");
      if (star) {
        var on = toggleFav(star.getAttribute("data-fav"));
        star.className = "fav" + (on ? " on" : "");
        star.setAttribute("aria-pressed", on ? "true" : "false");
        star.textContent = on ? "\u2605" : "\u2606";
        star.setAttribute("aria-label", (on ? "Remove from" : "Add to") + " favourites");
        if (current().fav) renderList(current());
        return;
      }
      var tag = e.target.closest("[data-tag]");
      if (tag) { var nf = current(); nf.q = tag.getAttribute("data-tag"); setFilters(nf); return; }
      var clear = e.target.closest("[data-clear]");
      if (clear) { var cf = current(); delete cf[clear.getAttribute("data-clear")]; setFilters(cf); }
    });

    function current() {
      var c = {}; Object.keys(f).forEach(function (k) { if (f[k]) c[k] = f[k]; }); return c;
    }
    function bindSelect(id, key) {
      var el = document.getElementById(id);
      el.addEventListener("change", function () {
        var nf = current();
        if (el.value) nf[key] = el.value; else delete nf[key];
        // dropping a broader filter can orphan a narrower one — clear what no longer applies
        if (key === "s" || key === "y") {
          if (nf.c && !SIMS.some(function (s) { return matches(s, { y: nf.y, s: nf.s, c: nf.c }); })) delete nf.c;
        }
        if (nf.t && !SIMS.some(function (s) { return matches(s, { y: nf.y, s: nf.s, c: nf.c, t: nf.t }); })) delete nf.t;
        setFilters(nf);
      });
    }
  }

  /* ---------------------------------------------------------- detail view */
  /* The card record is enough to draw the header and the OPEN button
     immediately; the prose arrives from content/sims/<ID>.json a moment later.
     A visitor who came to open the simulation never waits for it. */
  function renderSim(id) {
    var card = null, i;
    for (i = 0; i < SIMS.length; i++) if (SIMS[i].id === id) { card = SIMS[i]; break; }
    if (card) noteVisit(id);
    if (card && MODE === "feed" && !DETAIL[id]) {
      paintSim(card, true);
      fetch("content/sims/" + encodeURIComponent(id) + ".json")
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (full) {
          DETAIL[id] = full;
          if (parseHash().id === id) paintSim(full, false);
        })
        .catch(function () {
          if (parseHash().id === id) paintSim(card, false);   // header-only, still usable
        });
      return;
    }
    paintSim(DETAIL[id] || card, false);
  }

  function paintSim(s, pending) {
    if (!s) {
      app.innerHTML = '<a class="back" href="#/">← All simulations</a>' +
        '<div class="error"><h3>No simulation with that ID</h3>' +
        "<p><code>" + esc(parseHash().id || "") + "</code> is not in the catalogue. It may have " +
        "been renamed, or the feed may not have been rebuilt yet.</p></div>";
      return;
    }
    function list(title, items) {
      items = arr(items);
      if (!items.length) return "";
      return "<div><h2>" + title + '</h2><ul class="plain">' +
        items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
    }
    function metaRow(k, v) { return v ? "<div><dt>" + k + "</dt><dd>" + esc(v) + "</dd></div>" : ""; }

    app.innerHTML =
      '<a class="back" href="' + filterHash({}) + '">← All simulations</a>' +
      '<article class="detail" style="--c:' + color(s.subject) + '">' +
        '<div class="exam">' + esc(String(s.exam || "JEE ADVANCED").toUpperCase()) + "</div>" +
        "<h1>" + esc(s.title) + "</h1>" +
        '<div class="chips">' +
          '<span class="chip">' + esc(s.year) + "</span>" +
          '<span class="chip">' + esc(s.paper) + "</span>" +
          '<span class="chip subj">' + esc(s.subject) + "</span>" +
          '<span class="chip">Question ' + esc(s.questionNumber) + "</span>" +
          (s.section ? '<span class="chip">' + esc(s.section) + "</span>" : "") +
          (s.difficulty ? '<span class="chip">' + esc(s.difficulty) + "</span>" : "") +
          (s.estimatedMinutes ? '<span class="chip">~' + esc(s.estimatedMinutes) + " min</span>" : "") +
        "</div>" +
        (s.summary ? '<p class="summary">' + esc(s.summary) + "</p>"
                   : (pending ? '<p class="summary skel">&nbsp;</p>' : "")) +
        '<div class="ctarow">' +
          '<a class="cta" href="' + simHref(s) + '">OPEN SIMULATION</a>' +
          '<button type="button" class="favbig' + (isFav(s.id) ? " on" : "") + '" data-fav="' +
            esc(s.id) + '" aria-pressed="' + (isFav(s.id) ? "true" : "false") + '">' +
            (isFav(s.id) ? "★ Saved" : "☆ Save") + "</button>" +
          '<span class="ctanote">Opens the interactive simulation. Everything is on one page — no sign-in, works offline.</span>' +
        "</div>" +
        '<div class="cols">' +
          "<div><h2>Where it sits</h2><dl class=\"meta\">" +
            metaRow("Subject", s.subject) +
            metaRow("Chapter", s.chapter) +
            metaRow("Topic", s.topic) +
            metaRow("Question type", s.questionType) +
            metaRow("Difficulty", s.difficulty) +
          "</dl></div>" +
          list("Sub-topics covered", s.subtopics) +
          list("What you can do", s.interactivity) +
          list("Concepts", s.concepts) +
          (pending ? '<div class="loadingcol">Loading the full description…</div>' : "") +
        "</div>" +
        (arr(s.tags).length
          ? '<div class="taglist">' + arr(s.tags).map(function (t) {
              return '<a href="' + filterHash({ q: t }) + '">' + esc(t) + "</a>";
            }).join("") + "</div>"
          : "") +
        '<div class="idline">' + esc(s.id) + " · " + esc(s.path) + "</div>" +
      "</article>";
    var big = app.querySelector("[data-fav]");
    if (big) big.addEventListener("click", function () {
      var on = toggleFav(s.id);
      big.className = "favbig" + (on ? " on" : "");
      big.setAttribute("aria-pressed", on ? "true" : "false");
      big.textContent = on ? "★ Saved" : "☆ Save";
    });
    if (!pending) window.scrollTo(0, 0);
  }

  /* -------------------------------------------------------------- render */
  function render() {
    var r = parseHash();
    if (r.view === "sim") renderSim(r.id); else renderList(r.f || {});
  }

  /* --------------------------------------------------------------- offline
     Say so, once, at the top - and say what still works, because most of it
     does: the shell and every simulation already opened on this device. */
  function offlineBar() {
    var bar = document.querySelector(".offlinebar");
    if (navigator.onLine) { if (bar) bar.parentNode.removeChild(bar); return; }
    if (bar) return;
    bar = document.createElement("div");
    bar.className = "offlinebar";
    bar.textContent = "Offline — simulations you have already opened still work.";
    document.body.appendChild(bar);
  }
  window.addEventListener("online", offlineBar);
  window.addEventListener("offline", offlineBar);

  /* ------------------------------------------------------------ bootstrap */
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

  function boot(payload, source, mode) {
    MODE = mode;
    LIB = payload.library || {};
    SIMS = (payload.simulations || []).filter(function (s) { return s && s.id && s.path; });
    if (mode === "manifest") {
      // Every record is already complete, so no detail request is ever needed.
      SIMS.forEach(function (s) { DETAIL[s.id] = s; });
      SEARCH_STATE = "ready";
    }
    window.FEED_VERSION = payload.version || (LIB.updatedAt || "");
    var foot = document.getElementById("foot-src");
    if (foot) foot.innerHTML = "catalogue read from <code>" + source + "</code>" +
      (payload.version ? " · feed " + esc(String(payload.version).slice(0, 8)) : "") +
      (LIB.updatedAt ? " · updated " + esc(LIB.updatedAt) : "");
    window.addEventListener("hashchange", function () { shownCount = PAGE; render(); });
    offlineBar();
    render();
  }

  function fail(detail) {
    app.innerHTML = '<div class="error"><h3>Could not load the simulation catalogue</h3>' +
      "<p>The site reads <code>content/index.json</code>, and falls back to " +
      "<code>data/manifest.json</code> and then <code>data/manifest.js</code> when opened " +
      "from disk. None was available.</p>" +
      "<p>" + esc(detail) + "</p></div>";
  }

  /* Load order, cheapest first:
       1. content/index.json  — the built feed, ~1.2 KB per simulation
       2. data/manifest.json  — the source of truth, complete but heavy
       3. window.SIM_MANIFEST — the file:// mirror
     Each step is a strict fallback, so the site keeps working if the feed has
     not been built yet, and keeps working from disk with no server at all. */
  var done = false;
  /* The file:// mirror is injected only if both fetches failed, so a visitor
     served over http never downloads the full catalogue a second time. */
  function lastResort(why) {
    if (done) return;
    if (window.SIM_MANIFEST) {
      done = true; boot(window.SIM_MANIFEST, "data/manifest.js", "manifest"); return;
    }
    var sc = document.createElement("script");
    sc.src = "data/manifest.js";
    sc.onload = function () {
      if (done) return;
      if (window.SIM_MANIFEST) { done = true; boot(window.SIM_MANIFEST, "data/manifest.js", "manifest"); }
      else { done = true; fail(why); }
    };
    sc.onerror = function () { if (!done) { done = true; fail(why); } };
    document.head.appendChild(sc);
  }
  function tryManifest(why) {
    if (done) return;
    fetch("data/manifest.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { if (!done) { done = true; boot(j, "data/manifest.json", "manifest"); } })
      .catch(function (e) { lastResort(why + " / " + String(e)); });
  }
  if (window.fetch && location.protocol !== "file:") {
    fetch("content/index.json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        if (done) return;
        if (!j || !j.simulations || !j.simulations.length) throw new Error("empty feed");
        done = true; boot(j, "content/index.json", "feed");
      })
      .catch(function (e) { tryManifest(String(e)); });
  } else {
    lastResort("fetch() is unavailable on file:// URLs.");
  }
})();
