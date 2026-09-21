/* ==========================================================================
   PrayogX mobile shell

   WHAT THIS FILE IS NOT: it is not a copy of the website, and it contains no
   simulation. It is a native-feeling client for the same published content
   feed the website reads. Adding a simulation to data/manifest.json and
   deploying makes it appear here with no rebuild and no store release.

   WHAT IT DOES
     - reads content/catalog.json + content/index.json from the published site
     - keeps the last good copy of both, so the app opens instantly and works
       with no connection
     - opens a simulation by fetching its single self-contained HTML file and
       rendering it with srcdoc, which is why an opened simulation keeps
       working offline
     - stores opened simulations in IndexedDB, capped, newest kept
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.PRAYOGX;
  var ORIGIN = CFG.origin.replace(/\/+$/, "");
  var url = function (p) { return ORIGIN + "/" + String(p).replace(/^\/+/, ""); };

  var SIMS = [], CATALOG = null, SEARCH = null, MODE = "library";
  var FILTERS = {}, SHOWN = 24, PAGE = 24, VIEW = null, DETAIL = {};
  var el = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var arr = function (v) { return Array.isArray(v) ? v : (v ? [v] : []); };
  var COLOR = { Chemistry: "var(--chem)", Physics: "var(--phys)" };

  /* ------------------------------------------------------------- storage
     Small values in localStorage; simulation HTML in IndexedDB, because a
     simulation is 100-140 KB and thirty of them would not belong in a
     key-value store meant for preferences. */
  var K = "prayogx:v1:";
  function get(k, d) {
    try { var v = localStorage.getItem(K + k); return v === null ? d : JSON.parse(v); }
    catch (e) { return d; }
  }
  function set(k, v) { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) {} }

  var DB = null;
  function db() {
    if (DB) return DB;
    DB = new Promise(function (res, rej) {
      var r = indexedDB.open("prayogx", 1);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains("sims")) d.createObjectStore("sims", { keyPath: "id" });
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return DB;
  }
  function dbGet(id) {
    return db().then(function (d) {
      return new Promise(function (res) {
        var t = d.transaction("sims", "readonly").objectStore("sims").get(id);
        t.onsuccess = function () { res(t.result || null); };
        t.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }
  function dbPut(rec) {
    return db().then(function (d) {
      return new Promise(function (res) {
        var s = d.transaction("sims", "readwrite").objectStore("sims");
        s.put(rec);
        s.transaction.oncomplete = function () { res(true); };
        s.transaction.onerror = function () { res(false); };
      });
    }).then(trimOffline).catch(function () { return false; });
  }
  function dbAll() {
    return db().then(function (d) {
      return new Promise(function (res) {
        var out = [], c = d.transaction("sims", "readonly").objectStore("sims").openCursor();
        c.onsuccess = function () {
          var cur = c.result;
          if (!cur) { res(out); return; }
          out.push({ id: cur.value.id, at: cur.value.at, bytes: (cur.value.html || "").length });
          cur.continue();
        };
        c.onerror = function () { res(out); };
      });
    }).catch(function () { return []; });
  }
  function dbDel(id) {
    return db().then(function (d) {
      d.transaction("sims", "readwrite").objectStore("sims").delete(id);
      return true;
    }).catch(function () { return false; });
  }
  /* Keep the device tidy: newest N kept, the rest dropped. */
  function trimOffline() {
    return dbAll().then(function (list) {
      var cap = CFG.offlineCap || 30;
      if (list.length <= cap) return;
      list.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      return Promise.all(list.slice(cap).map(function (r) { return dbDel(r.id); }));
    });
  }

  function favs() { return get("favorites", []); }
  function isFav(id) { return favs().indexOf(id) >= 0; }
  function toggleFav(id) {
    var f = favs(), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.unshift(id);
    set("favorites", f);
    return i < 0;
  }
  function noteRecent(id) {
    var r = get("recent", []), i = r.indexOf(id);
    if (i >= 0) r.splice(i, 1);
    r.unshift(id); set("recent", r.slice(0, 40));
  }

  /* --------------------------------------------------------------- toast */
  var toastT;
  function toast(msg, actionLabel, action) {
    var t = el("toast");
    t.innerHTML = "<span>" + esc(msg) + "</span>";
    if (actionLabel) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = actionLabel;
      b.addEventListener("click", function () { t.hidden = true; action(); });
      t.appendChild(b);
    }
    t.hidden = false;
    clearTimeout(toastT);
    if (!actionLabel) toastT = setTimeout(function () { t.hidden = true; }, 3200);
  }

  /* ---------------------------------------------------------------- feed */
  function loadFeed() {
    var cached = get("index", null);
    if (cached && cached.simulations) {
      SIMS = cached.simulations;
      CATALOG = get("catalog", null);
      render();
    }
    return fetch(url(CFG.feed.catalog), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw httpError(r, CFG.feed.catalog); return r.json(); })
      .then(function (cat) {
        var known = get("catalog", null);
        CATALOG = cat;
        set("catalog", cat);
        if (known && known.version === cat.version && SIMS.length) return null;  // nothing moved
        return fetch(url(CFG.feed.index)).then(function (r) {
          if (!r.ok) throw httpError(r, CFG.feed.index);
          return r.json();
        }).then(function (idx) {
          var first = !SIMS.length;
          SIMS = idx.simulations || [];
          set("index", idx);
          render();
          if (!first) toast("Library updated — " + SIMS.length + " simulations");
          return true;
        });
      })
      .catch(function (e) {
        var reached = !!(e && e.status);   // the server answered; it just did not have it
        if (SIMS.length) {
          toast(reached
            ? "Could not check for updates — the site answered HTTP " + e.status
            : "Offline — showing the library as it was last seen");
          return;
        }
        el("screen").innerHTML = reached
          ? '<div class="empty"><h3>The library is not published yet</h3><p>' +
            esc(ORIGIN) + " is reachable, but it answered <b>HTTP " + e.status +
            "</b> for <code>" + esc(e.path || CFG.feed.catalog) + "</code>. " +
            "Deploy the site, then reopen the app.</p></div>"
          : '<div class="empty"><h3>No connection</h3>' +
            "<p>The library has not been downloaded on this device yet. " +
            "Connect once and it will be kept for offline use.</p></div>";
      });
  }

  /* A reachable server that answers 404 is not "no connection", and saying so
     sends you hunting through Android networking instead of looking at what is
     deployed. Carry the status so the message can tell the difference. */
  function httpError(r, path) {
    var e = new Error("HTTP " + r.status + " for " + path);
    e.status = r.status;
    e.path = path;   // named, not read back from r.url: in the app CapacitorHttp
    return e;        // proxies GETs and r.url is the interceptor, not the feed
  }

  function ensureSearch() {
    if (SEARCH) return Promise.resolve();
    return fetch(url(CFG.feed.search)).then(function (r) { return r.json(); })
      .then(function (j) { SEARCH = j.text || {}; }).catch(function () { SEARCH = {}; });
  }

  function detail(id) {
    if (DETAIL[id]) return Promise.resolve(DETAIL[id]);
    return fetch(url(CFG.feed.detail.replace("{id}", encodeURIComponent(id))))
      .then(function (r) { if (!r.ok) throw new Error("x"); return r.json(); })
      .then(function (j) { DETAIL[id] = j; return j; })
      .catch(function () { return null; });
  }

  /* ------------------------------------------------------------ matching */
  function hay(s) {
    return [s.id, s.title, s.shortTitle, s.chapter, s.topic, s.subject, s.exam,
            "q" + s.questionNumber, arr(s.tags).join(" "), (SEARCH && SEARCH[s.id]) || ""]
      .join(" ").toLowerCase();
  }
  function matches(s) {
    if (FILTERS.subject && s.subject !== FILTERS.subject) return false;
    if (FILTERS.chapter && s.chapter !== FILTERS.chapter) return false;
    if (FILTERS.year && String(s.year) !== String(FILTERS.year)) return false;
    if (FILTERS.difficulty && s.difficulty !== FILTERS.difficulty) return false;
    var q = (el("q").value || "").trim().toLowerCase();
    if (q) {
      var h = hay(s), terms = q.split(/\s+/);
      for (var i = 0; i < terms.length; i++) if (h.indexOf(terms[i]) < 0) return false;
    }
    return true;
  }
  function pool() {
    if (MODE === "favorites") {
      var f = favs();
      return SIMS.filter(function (s) { return f.indexOf(s.id) >= 0; });
    }
    if (MODE === "recent") {
      var r = get("recent", []), out = [];
      r.forEach(function (id) {
        SIMS.forEach(function (s) { if (s.id === id) out.push(s); });
      });
      return out;
    }
    return SIMS;
  }

  /* -------------------------------------------------------------- render */
  function cardHTML(s, extraPill) {
    var fav = isFav(s.id);
    return '<a class="simcard" href="#" data-open="' + esc(s.id) + '" style="--c:' +
      (COLOR[s.subject] || "var(--accent)") + '">' +
      '<button class="star' + (fav ? " on" : "") + '" type="button" data-fav="' + esc(s.id) +
        '" aria-label="' + (fav ? "Remove from saved" : "Save") + '">' +
        (fav ? "★" : "☆") + "</button>" +
      '<div class="kicker">' + esc(s.exam || "JEE Advanced") + " " + esc(s.year) + " · " +
        esc(s.paper || "") + " · Q." + esc(s.questionNumber) + "</div>" +
      "<h3>" + esc(s.shortTitle || s.title) + "</h3>" +
      '<div class="meta">' + esc(s.chapter) + " — " + esc(s.topic) + "</div>" +
      '<div class="row2">' +
        (s.difficulty ? '<span class="pill">' + esc(s.difficulty) + "</span>" : "") +
        (s.estimatedMinutes ? '<span class="pill">~' + esc(s.estimatedMinutes) + " min</span>" : "") +
        (s.access && s.access !== "free"
          ? '<span class="pill prem">' + esc(String(s.access).toUpperCase()) + "</span>" : "") +
        (extraPill || "") +
      "</div></a>";
  }

  function renderList() {
    var list = pool().filter(matches);
    var titles = { library: "Library", favorites: "Saved", recent: "Recent", offline: "Offline" };
    el("screenTitle").textContent = titles[MODE] || "Library";
    var chips = Object.keys(FILTERS).filter(function (k) { return FILTERS[k]; });
    el("chiprow").innerHTML = chips.map(function (k) {
      return '<button type="button" data-unfilter="' + k + '">' + esc(FILTERS[k]) + " ✕</button>";
    }).join("");
    el("filterbtn").className = "filterbtn" + (chips.length ? " on" : "");

    if (!list.length) {
      var why = MODE === "favorites"
        ? "Tap the star on any simulation to keep it here."
        : (MODE === "recent" ? "Simulations you open will appear here."
                             : "Try a broader search or clear the filters.");
      el("screen").innerHTML = '<div class="empty"><h3>Nothing here yet</h3><p>' + why + "</p></div>";
      return;
    }
    var batch = list.slice(0, SHOWN);
    el("screen").innerHTML =
      '<p class="countline">' + batch.length + " of " + list.length + " simulation" +
        (list.length === 1 ? "" : "s") + "</p>" +
      batch.map(function (s) { return cardHTML(s); }).join("") +
      (list.length > batch.length
        ? '<button class="more" id="more" type="button">Show more (' +
          (list.length - batch.length) + " left)</button>" : "");
    var m = el("more");
    if (m) m.addEventListener("click", function () { SHOWN += PAGE; renderList(); });
  }

  function renderOffline() {
    el("screenTitle").textContent = "Offline";
    el("screen").innerHTML = '<p class="countline">Checking what is stored…</p>';
    dbAll().then(function (list) {
      if (!list.length) {
        el("screen").innerHTML = '<div class="empty"><h3>Nothing stored yet</h3>' +
          "<p>Every simulation you open is kept on this device automatically, " +
          "so you can run it again with no connection.</p></div>";
        return;
      }
      list.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      var bytes = list.reduce(function (t, r) { return t + (r.bytes || 0); }, 0);
      var html = '<p class="countline">' + list.length + " simulation" +
        (list.length === 1 ? "" : "s") + " stored · " + Math.round(bytes / 1024) +
        " KB · newest " + (CFG.offlineCap || 30) + " kept</p>";
      list.forEach(function (r) {
        var s = null;
        SIMS.forEach(function (x) { if (x.id === r.id) s = x; });
        if (s) html += cardHTML(s, '<span class="pill dl">on this device</span>');
      });
      el("screen").innerHTML = html;
    });
  }

  function renderDetail(id) {
    var card = null;
    SIMS.forEach(function (s) { if (s.id === id) card = s; });
    if (!card) { MODE = "library"; render(); return; }
    el("screenTitle").textContent = "Simulation";
    function paint(full) {
      var s = full || card;
      function list(t, items) {
        items = arr(items);
        if (!items.length) return "";
        return "<h3>" + t + "</h3><ul>" +
          items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
      }
      el("screen").innerHTML =
        '<button class="back" id="dback" type="button">‹ Back</button>' +
        '<div class="detail"><h2>' + esc(s.title) + "</h2>" +
        (s.summary ? '<p class="sum">' + esc(s.summary) + "</p>" : "") +
        '<dl class="facts">' +
          "<dt>Exam</dt><dd>" + esc(s.exam) + " " + esc(s.year) + " · " + esc(s.paper) +
            " · Q." + esc(s.questionNumber) + "</dd>" +
          "<dt>Chapter</dt><dd>" + esc(s.chapter) + "</dd>" +
          "<dt>Topic</dt><dd>" + esc(s.topic) + "</dd>" +
          (s.difficulty ? "<dt>Difficulty</dt><dd>" + esc(s.difficulty) + "</dd>" : "") +
        "</dl>" +
        list("Sub-topics", s.subtopics) + list("What you can do", s.interactivity) +
        "</div>" +
        '<div class="openbar">' +
          '<button class="btn solid" id="openbtn" type="button">Open simulation</button>' +
          '<button class="btn' + (isFav(id) ? " on" : "") + '" id="favbtn" type="button">' +
            (isFav(id) ? "★" : "☆") + "</button>" +
        "</div>";
      el("dback").addEventListener("click", function () { MODE = VIEW || "library"; render(); });
      el("openbtn").addEventListener("click", function () { openSim(card); });
      el("favbtn").addEventListener("click", function () {
        var on = toggleFav(id);
        el("favbtn").className = "btn" + (on ? " on" : "");
        el("favbtn").textContent = on ? "★" : "☆";
      });
    }
    paint(null);
    detail(id).then(function (full) { if (MODE === "detail:" + id) paint(full); });
  }

  function render() {
    el("boot") && el("boot").remove();
    var searching = MODE === "library" || MODE === "favorites" || MODE === "recent";
    el("searchwrap").style.display = searching ? "" : "none";
    el("chiprow").style.display = searching ? "" : "none";
    if (MODE.indexOf("detail:") === 0) return renderDetail(MODE.slice(7));
    if (MODE === "offline") return renderOffline();
    renderList();
  }

  /* ------------------------------------------------------- the simulation
     A simulation is one self-contained HTML file, so it can be rendered from
     a string. That is what makes an opened simulation work offline without
     the app shipping a single line of it. */
  function openSim(card) {
    var v = el("viewer"), f = el("frame");
    el("vtitle").textContent = card.shortTitle || card.title;
    el("vfav").className = "vfav" + (isFav(card.id) ? " on" : "");
    el("vfav").textContent = isFav(card.id) ? "★" : "☆";
    el("vfav").onclick = function () {
      var on = toggleFav(card.id);
      el("vfav").className = "vfav" + (on ? " on" : "");
      el("vfav").textContent = on ? "★" : "☆";
    };
    v.hidden = false;
    f.srcdoc = '<!doctype html><meta charset="utf-8"><body style="font:15px system-ui;' +
      'padding:26px;color:#777">Loading the simulation…</body>';
    noteRecent(card.id);

    var wanted = card.revision || 1;
    dbGet(card.id).then(function (rec) {
      if (rec && rec.revision === wanted && rec.html) { f.srcdoc = rec.html; return; }
      return fetch(url(card.path) + "?v=" + wanted)
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
        .then(function (html) {
          f.srcdoc = html;
          dbPut({ id: card.id, revision: wanted, html: html, at: Date.now() });
        })
        .catch(function () {
          if (rec && rec.html) {                       // older revision beats nothing
            f.srcdoc = rec.html;
            toast("Offline — showing the copy stored on this device");
            return;
          }
          f.srcdoc = '<!doctype html><meta charset="utf-8"><body style="font:15px system-ui;' +
            'padding:26px;line-height:1.6;color:#555"><h3 style="color:#222">Not available offline' +
            "</h3><p>This simulation has not been opened on this device yet. " +
            "Connect once and it will be kept here.</p></body>";
        });
    });
  }
  function closeSim() {
    el("viewer").hidden = true;
    el("frame").srcdoc = "";
    render();
  }

  /* ---------------------------------------------------------------- sheet */
  function facetValues(field) {
    var seen = {};
    SIMS.forEach(function (s) { if (s[field]) seen[s[field]] = 1; });
    return Object.keys(seen).sort();
  }
  function openSheet() {
    var fields = [["subject", "Subject"], ["year", "Year"], ["chapter", "Chapter"],
                  ["difficulty", "Difficulty"]];
    el("sheetfields").innerHTML = fields.map(function (f) {
      var vals = facetValues(f[0]);
      if (!vals.length) return "";
      return '<div class="fgroup"><h4>' + f[1] + '</h4><div class="fopts">' +
        vals.map(function (v) {
          return '<button type="button" data-f="' + f[0] + '" data-v="' + esc(v) + '"' +
            (String(FILTERS[f[0]]) === String(v) ? ' class="on"' : "") + ">" + esc(v) + "</button>";
        }).join("") + "</div></div>";
    }).join("");
    el("sheet").hidden = false;
  }
  function closeSheet() { el("sheet").hidden = true; }

  /* --------------------------------------------------------------- events */
  document.addEventListener("click", function (e) {
    var fav = e.target.closest("[data-fav]");
    if (fav) {
      e.preventDefault(); e.stopPropagation();
      var on = toggleFav(fav.getAttribute("data-fav"));
      fav.className = "star" + (on ? " on" : "");
      fav.textContent = on ? "★" : "☆";
      if (MODE === "favorites") renderList();
      return;
    }
    var open = e.target.closest("[data-open]");
    if (open) {
      e.preventDefault();
      VIEW = MODE;
      MODE = "detail:" + open.getAttribute("data-open");
      window.scrollTo(0, 0);
      render();
      return;
    }
    var un = e.target.closest("[data-unfilter]");
    if (un) { delete FILTERS[un.getAttribute("data-unfilter")]; SHOWN = PAGE; render(); return; }
    var opt = e.target.closest("[data-f]");
    if (opt) {
      var k = opt.getAttribute("data-f"), v = opt.getAttribute("data-v");
      if (String(FILTERS[k]) === String(v)) delete FILTERS[k]; else FILTERS[k] = v;
      openSheet();
      return;
    }
  });

  el("tabs").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-tab]");
    if (!b) return;
    [].forEach.call(el("tabs").querySelectorAll("button"), function (x) { x.className = ""; });
    b.className = "on";
    MODE = b.getAttribute("data-tab");
    SHOWN = PAGE;
    window.scrollTo(0, 0);
    render();
  });

  var qT;
  el("q").addEventListener("input", function () {
    ensureSearch().then(function () {
      clearTimeout(qT);
      qT = setTimeout(function () { SHOWN = PAGE; renderList(); }, 140);
    });
  });
  el("filterbtn").addEventListener("click", openSheet);
  el("sheetbg").addEventListener("click", closeSheet);
  el("clearf").addEventListener("click", function () { FILTERS = {}; openSheet(); });
  el("applyf").addEventListener("click", function () { closeSheet(); SHOWN = PAGE; render(); });
  el("vback").addEventListener("click", closeSim);
  el("themebtn").addEventListener("click", function () {
    var r = document.documentElement;
    var dark = r.getAttribute("data-theme") === "dark" ||
      (!r.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    r.setAttribute("data-theme", dark ? "light" : "dark");
    set("theme", dark ? "light" : "dark");
  });
  var savedTheme = get("theme", null);
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

  /* Android hardware back, and the iOS swipe that maps to it: close the
     viewer, then a sheet, then the detail screen, and only then leave. */
  function goBack() {
    if (!el("viewer").hidden) { closeSim(); return true; }
    if (!el("sheet").hidden) { closeSheet(); return true; }
    if (MODE.indexOf("detail:") === 0) { MODE = VIEW || "library"; render(); return true; }
    if (MODE !== "library") {
      MODE = "library";
      [].forEach.call(el("tabs").querySelectorAll("button"), function (x) {
        x.className = x.getAttribute("data-tab") === "library" ? "on" : "";
      });
      render();
      return true;
    }
    return false;
  }
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") goBack(); });
  document.addEventListener("deviceready", function () {}, false);
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener("backButton", function () {
      if (!goBack()) window.Capacitor.Plugins.App.exitApp();
    });
    window.Capacitor.Plugins.App.addListener("appStateChange", function (st) {
      if (st.isActive) loadFeed();          // check for new content on resume
    });
    if (window.Capacitor.Plugins.SplashScreen) window.Capacitor.Plugins.SplashScreen.hide();
  }
  window.addEventListener("online", function () { loadFeed(); });

  loadFeed();
  window.__prayogx = { goBack: goBack, state: function () {
    return { mode: MODE, sims: SIMS.length, filters: FILTERS, catalog: CATALOG && CATALOG.version };
  } };
})();
