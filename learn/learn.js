/* ==========================================================================
   PrayogX Learn — the topic-page quiz and the theme switch.
   The questions are not in this file: each page carries its own as JSON in
   <script type="application/json" id="quiz-data">, written by
   tools/build_learn.py from data/learn/topics/<slug>.json and validated there.

   Behaviour: pick an option, pick it again to clear it, or pick another to
   change; Submit once every question has an answer; the answers then lock,
   each question shows right / wrong and its explanation, and Retry clears it
   all. Nothing is stored or sent anywhere. ES5, no dependencies.
   ========================================================================== */
(function () {
  "use strict";

  /* ---- theme (same key as the library, so the choice follows the visitor) */
  var tb = document.getElementById("themebtn");
  try {
    var saved = localStorage.getItem("jee-sim-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  } catch (e) {}
  if (tb) tb.addEventListener("click", function () {
    var root = document.documentElement;
    var dark = root.getAttribute("data-theme") === "dark" ||
      (!root.getAttribute("data-theme") && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.setAttribute("data-theme", dark ? "light" : "dark");
    try { localStorage.setItem("jee-sim-theme", dark ? "light" : "dark"); } catch (e) {}
  });

  /* ---- subject pages: Chapter-wise / Topic-wise views, and the topic search and filters */
  var tabC = document.getElementById("tab-chapters"), tabT = document.getElementById("tab-topics");
  if (tabC && tabT) {
    var viewC = document.getElementById("view-chapters"), viewT = document.getElementById("view-topics");
    var show = function (topics, push) {
      tabC.setAttribute("aria-selected", topics ? "false" : "true");
      tabT.setAttribute("aria-selected", topics ? "true" : "false");
      viewC.hidden = !!topics; viewT.hidden = !topics;
      if (push && history.replaceState) history.replaceState(null, "", topics ? "#topics" : location.pathname);
    };
    tabC.addEventListener("click", function () { show(false, true); });
    tabT.addEventListener("click", function () { show(true, true); var q = document.getElementById("tq"); if (q) q.focus(); });
    show(location.hash === "#topics", false);

    var q = document.getElementById("tq"), sel = document.getElementById("tch"), grid = document.getElementById("tgrid");
    var chips = document.querySelectorAll("[data-filter-discipline]");
    var count = document.getElementById("tcount"), none = document.getElementById("tnone");
    var filter = function () {
      if (!grid) return;
      var terms = (q ? q.value : "").toLowerCase().split(/\s+/), chap = sel ? sel.value : "", disc = [], i, j, shown = 0;
      for (i = 0; i < chips.length; i++) if (chips[i].getAttribute("aria-pressed") === "true") disc.push(chips[i].getAttribute("data-filter-discipline"));
      var cards = grid.children;
      for (i = 0; i < cards.length; i++) {
        var c = cards[i], hay = c.getAttribute("data-search") || "", ok = true;
        for (j = 0; j < terms.length; j++) if (terms[j] && hay.indexOf(terms[j]) < 0) { ok = false; break; }
        if (ok && chap && c.getAttribute("data-chapter") !== chap) ok = false;
        if (ok && disc.length && disc.indexOf(c.getAttribute("data-discipline")) < 0) ok = false;
        c.hidden = !ok;
        if (ok) shown++;
      }
      if (count) count.textContent = shown + " of " + cards.length + " topic" + (cards.length === 1 ? "" : "s");
      if (none) none.hidden = shown > 0;
    };
    if (q) q.addEventListener("input", filter);
    if (sel) sel.addEventListener("change", filter);
    for (var ci = 0; ci < chips.length; ci++) chips[ci].addEventListener("click", function () {
      this.setAttribute("aria-pressed", this.getAttribute("aria-pressed") === "true" ? "false" : "true"); filter();
    });
    filter();
  }

  /* ---- simulation frame: same origin, so it is sized to its content (no scroll inside a scroll) */
  var simf = document.querySelector(".simbox iframe");
  if (simf) {
    var fit = function () {
      try {
        var d = simf.contentDocument;
        if (d && d.documentElement) simf.style.height = Math.max(420, d.documentElement.scrollHeight + 4) + "px";
      } catch (e) {}
    };
    simf.addEventListener("load", function () {
      fit();
      try {
        if (window.ResizeObserver) new ResizeObserver(fit).observe(simf.contentDocument.documentElement);
        else simf.contentWindow.addEventListener("resize", fit);
      } catch (e) {}
    });
    window.addEventListener("resize", fit);
  }

  /* ---- quiz */
  var holder = document.getElementById("quiz");
  var dataEl = document.getElementById("quiz-data");
  if (!holder || !dataEl) return;
  var QS;
  try { QS = JSON.parse(dataEl.textContent).questions || []; } catch (e) { QS = []; }
  if (!QS.length) return;

  var KEYS = "ABCDEFGH";
  var picks = [];        /* question index -> option index, or -1 */
  var submitted = false;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function paint() {
    var html = "", score = 0, answered = 0, i, j;
    for (i = 0; i < QS.length; i++) {
      var q = QS[i], pick = picks[i];
      if (pick >= 0) answered++;
      if (submitted && pick === q.answer) score++;
      html += '<div class="qitem" data-q="' + i + '">' +
        '<p class="qtext">' + (i + 1) + ". " + esc(q.q) + "</p>" +
        '<div class="qopts" role="group" aria-label="Question ' + (i + 1) + ' options">';
      for (j = 0; j < q.options.length; j++) {
        var cls = "qopt";
        if (submitted && j === q.answer) cls += " right";
        else if (submitted && j === pick) cls += " wrong";
        html += '<button type="button" class="' + cls + '" data-q="' + i + '" data-o="' + j + '"' +
          ' aria-pressed="' + (pick === j ? "true" : "false") + '"' + (submitted ? " disabled" : "") + ">" +
          '<span class="k">' + KEYS.charAt(j) + "</span><span>" + esc(q.options[j]) + "</span></button>";
      }
      html += "</div>";
      if (submitted) {
        var ok = pick === q.answer;
        html += '<p class="qexp" data-result="' + (ok ? "right" : "wrong") + '"><b>' +
          (ok ? "✓ Correct." : "✗ Correct answer: " + KEYS.charAt(q.answer) + ".") + "</b>" + esc(q.explain) + "</p>";
      }
      html += "</div>";
    }
    html += '<div class="qbar">';
    if (!submitted) {
      html += '<button type="button" class="btn primary" id="qsubmit"' + (answered < QS.length ? " disabled" : "") +
        ">Submit answers</button>" +
        '<span class="qmsg" id="qmsg">' + (answered < QS.length
          ? "Answered " + answered + " of " + QS.length + ". Tap an option again to clear it."
          : "All answered. You can still change any answer before you submit.") + "</span>";
    } else {
      html += '<span class="qscore" id="qscore">Score: ' + score + " / " + QS.length + "</span>" +
        '<button type="button" class="btn" id="qretry">Retry quiz</button>';
    }
    html += "</div>";
    holder.innerHTML = html;
  }

  holder.addEventListener("click", function (e) {
    var t = e.target;
    while (t && t !== holder && !(t.getAttribute && (t.getAttribute("data-o") !== null || t.id === "qsubmit" || t.id === "qretry"))) t = t.parentNode;
    if (!t || t === holder) return;
    if (t.id === "qsubmit") {
      for (var k = 0; k < QS.length; k++) if (picks[k] < 0) return;
      submitted = true; paint();
      var sc = document.getElementById("qscore");
      if (sc && sc.scrollIntoView) sc.scrollIntoView({ block: "nearest" });
      return;
    }
    if (t.id === "qretry") { reset(); return; }
    if (submitted) return;   /* answers are locked after submission; Retry unlocks */
    var qi = parseInt(t.getAttribute("data-q"), 10), oi = parseInt(t.getAttribute("data-o"), 10);
    picks[qi] = picks[qi] === oi ? -1 : oi;   /* same option again clears it */
    paint();
    var again = holder.querySelector('.qopt[data-q="' + qi + '"][data-o="' + oi + '"]');
    if (again) again.focus();
  });

  function reset() {
    picks = []; for (var i = 0; i < QS.length; i++) picks.push(-1);
    submitted = false; paint();
  }

  window.PX_LEARN = {
    pick: function (q, o) { if (!submitted) { picks[q] = picks[q] === o ? -1 : o; paint(); } },
    submit: function () { var b = document.getElementById("qsubmit"); if (b && !b.disabled) b.click(); },
    retry: reset,
    state: function () { return { picks: picks.slice(), submitted: submitted, count: QS.length }; }
  };
  reset();
})();
