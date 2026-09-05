/* ==========================================================================
   PrayogX — JEE Advanced Interactive Simulation Library — website
   A discovery / filtering / navigation layer. It never contains simulation
   content: every card links out to the existing simulation HTML file at the
   `path` recorded in the manifest.

   SOURCE OF TRUTH
     data/manifest.json   — read directly when the site is served over http(s)
     data/manifest.js     — same object as window.SIM_MANIFEST, used when the
                            page is opened straight from disk (file://), where
                            fetch() of a local JSON file is blocked
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
  var SIMS = [];
  var LIB = {};

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
    ["q", "y", "s", "c", "t"].forEach(function (k) {
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
    return [
      s.id, s.title, s.shortTitle, s.summary, s.subject, s.branch, s.chapter, s.topic,
      s.paper, s.year, s.exam, s.difficulty, s.questionType, s.section, s.answer,
      "q" + s.questionNumber, "question " + s.questionNumber,
      arr(s.subtopics).join(" "), arr(s.concepts).join(" "), arr(s.formulas).join(" "),
      arr(s.tags).join(" "), arr(s.interactivity).join(" ")
    ].join(" ").toLowerCase();
  }
  function matches(s, f) {
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
    var labels = { q: "search", y: "year", s: "subject", c: "chapter", t: "topic" };
    var pills = Object.keys(labels).filter(function (k) { return f[k]; }).map(function (k) {
      return '<button type="button" class="pill" data-clear="' + k + '">' +
        labels[k] + ": " + esc(f[k]) + " ✕</button>";
    });
    return pills.length ? '<div class="activefilters">' + pills.join("") + "</div>" : "";
  }

  function cardHTML(s) {
    var tags = arr(s.tags).slice(0, 4).map(function (t) {
      return '<button type="button" class="tag" data-tag="' + esc(t) + '">' + esc(t) + "</button>";
    }).join("");
    return '' +
      '<article class="card" style="--c:' + color(s.subject) + '">' +
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
  function renderList(f) {
    var shown = sortSims(SIMS.filter(function (s) { return matches(s, f); }));
    var body = shown.length
      ? '<div class="grid">' + shown.map(cardHTML).join("") + "</div>"
      : '<div class="empty"><h3>No simulations match those filters</h3>' +
        "<p>Try clearing one of them, or search for a broader term.</p></div>";

    app.innerHTML =
      countsHTML(SIMS) +
      filtersHTML(f) +
      '<p class="resultline" aria-live="polite"><span>Showing <strong>' + shown.length +
        "</strong> of " + SIMS.length + " simulation" + (SIMS.length === 1 ? "" : "s") + ".</span>" +
        activeFiltersHTML(f) + "</p>" +
      body;

    var q = document.getElementById("q");
    var t;
    q.addEventListener("input", function () {
      clearTimeout(t);
      var v = q.value;
      t = setTimeout(function () {
        var nf = current(); nf.q = v;
        var pos = q.selectionStart;
        setFilters(nf, true);
        var nq = document.getElementById("q");
        if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} }
      }, 160);
    });
    bindSelect("fy", "y"); bindSelect("fs", "s"); bindSelect("fc", "c"); bindSelect("ft", "t");

    document.getElementById("reset").addEventListener("click", function () { setFilters({}); });

    app.addEventListener("click", function (e) {
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
  function renderSim(id) {
    var s = null;
    for (var i = 0; i < SIMS.length; i++) if (SIMS[i].id === id) { s = SIMS[i]; break; }
    if (!s) {
      app.innerHTML = '<a class="back" href="#/">← All simulations</a>' +
        '<div class="error"><h3>No simulation with that ID</h3>' +
        "<p><code>" + esc(id) + "</code> is not in the manifest. It may have been renamed, " +
        "or the manifest may not have been updated yet.</p></div>";
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
        (s.summary ? '<p class="summary">' + esc(s.summary) + "</p>" : "") +
        '<div class="ctarow">' +
          '<a class="cta" href="' + simHref(s) + '">OPEN SIMULATION</a>' +
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
        "</div>" +
        (arr(s.tags).length
          ? '<div class="taglist">' + arr(s.tags).map(function (t) {
              return '<a href="' + filterHash({ q: t }) + '">' + esc(t) + "</a>";
            }).join("") + "</div>"
          : "") +
        '<div class="idline">' + esc(s.id) + " · " + esc(s.path) + "</div>" +
      "</article>";
    window.scrollTo(0, 0);
  }

  /* -------------------------------------------------------------- render */
  function render() {
    var r = parseHash();
    if (r.view === "sim") renderSim(r.id); else renderList(r.f || {});
  }

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

  function boot(manifest, source) {
    LIB = manifest.library || {};
    SIMS = (manifest.simulations || []).filter(function (s) { return s && s.id && s.path; });
    var foot = document.getElementById("foot-src");
    if (foot) foot.innerHTML = "catalogue read from <code>" + source + "</code>" +
      (LIB.updatedAt ? " · updated " + esc(LIB.updatedAt) : "");
    window.addEventListener("hashchange", render);
    render();
  }

  function fail(detail) {
    app.innerHTML = '<div class="error"><h3>Could not load the simulation catalogue</h3>' +
      "<p>The site reads <code>data/manifest.json</code> when served over http, and falls back to " +
      "<code>data/manifest.js</code> when opened from disk. Neither was available.</p>" +
      "<p>" + esc(detail) + "</p></div>";
  }

  // Prefer the JSON — it is the source of truth. Fall back to the JS global for file://.
  var done = false;
  function useFallback(why) {
    if (done) return; done = true;
    if (window.SIM_MANIFEST) boot(window.SIM_MANIFEST, "data/manifest.js");
    else fail(why);
  }
  if (window.fetch && location.protocol !== "file:") {
    fetch("data/manifest.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { if (!done) { done = true; boot(j, "data/manifest.json"); } })
      .catch(function (e) { useFallback(String(e)); });
  } else {
    useFallback("fetch() is unavailable on file:// URLs.");
  }
})();
