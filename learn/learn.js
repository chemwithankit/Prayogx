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
