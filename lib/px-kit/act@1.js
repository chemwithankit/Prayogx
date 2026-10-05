/* px-act@1 - one input path and the learning script.
   Learner taps, the Director, tests and the recorder all call do(id, args, source). An action may validate,
   change learning state, start an animation, change scene or request a camera shot; it never computes a
   scientific quantity and never draws. The learning script is data: scenes, allowed actions, next-action
   rules, exit conditions, guide ids and milestones. Conditions are objects, never evaluated strings.
   State shape it relies on: S.scene (index into script.scenes) and S.flags (plain object). */
var ACT = (function () {
  var SOURCES = ["learner", "director", "test", "recorder"];
  var COND_KEYS = ["all", "any", "not", "flag", "obs", "op", "value", "tol", "pred", "idle"];
  var OPS = [">=", "<=", ">", "<", "==", "!="];
  function create(o) {
    var S = o.state, script = o.script, defs = {}, preds = {}, log = [], hits = [], api = {};
    function fail(m) { throw new Error("ACT: " + m); }
    function scene() { return script.scenes[S.scene]; }
    function busy() { return !!(o.busy && o.busy()); }
    api.def = function (id, d) {
      if (defs[id]) fail("duplicate action " + id);
      if (!d || typeof d.run !== "function") fail(id + ": run(S, args) is required");
      defs[id] = { when: d.when || function () { return true; }, run: d.run, args: d.args || null, whileBusy: !!d.whileBusy };
      return api;
    };
    /* named predicates: the only code a condition may call */
    api.pred = function (name, fn) { if (preds[name]) fail("duplicate predicate " + name); preds[name] = fn; return api; };
    api.cond = function (c) {
      var i;
      if (!c) return true;
      if (c.all) { for (i = 0; i < c.all.length; i++) if (!api.cond(c.all[i])) return false; return true; }
      if (c.any) { for (i = 0; i < c.any.length; i++) if (api.cond(c.any[i])) return true; return false; }
      if (c.not) return !api.cond(c.not);
      if (c.flag !== undefined) return c.flag.charAt(0) === "!" ? !S.flags[c.flag.slice(1)] : !!S.flags[c.flag];
      if (c.obs !== undefined) {
        var v = o.obs.v(c.obs), x = c.value, tol = c.tol || 0;
        if (c.op === ">=") return v >= x - tol;
        if (c.op === "<=") return v <= x + tol;
        if (c.op === ">") return v > x;
        if (c.op === "<") return v < x;
        if (c.op === "==") return Math.abs(v - x) <= tol;
        if (c.op === "!=") return Math.abs(v - x) > tol;
        fail("bad comparator " + c.op);
      }
      if (c.pred !== undefined) { if (!preds[c.pred]) fail("unknown predicate " + c.pred); return !!preds[c.pred](S); }
      if (c.idle !== undefined) return busy() !== !!c.idle;
      fail("unknown condition " + JSON.stringify(c));
    };
    function allowed(id) {
      if (id === "advance") return true;
      var a = scene().allow || [];
      return a.indexOf(id) >= 0 || a.indexOf("*") >= 0;
    }
    /* the built-in action that moves to the next scene, once the current scene's exit condition holds */
    api.def("advance", {
      when: function () { return S.scene < script.scenes.length - 1 && api.cond(scene().exit); },
      run: function () { S.scene++; if (o.onScene) o.onScene(S.scene); }
    });
    api.check = function (id, args) {
      var d = defs[id];
      if (!d) return "unknown action " + id;
      if (busy() && !d.whileBusy) return "busy";
      if (!allowed(id)) return id + " is not allowed in scene " + scene().id;
      if (d.args && d.args.indexOf(args) < 0) return "bad argument " + args + " for " + id;
      if (!d.when(S, args)) return id + " is not ready";
      return null;
    };
    api.do = function (id, args, source) {
      if (SOURCES.indexOf(source) < 0) return { ok: false, reason: "bad source " + source };
      var why = api.check(id, args);
      if (why) return { ok: false, reason: why };
      defs[id].run(S, args);
      var e = { f: o.clock.frame, t: +o.clock.t.toFixed(6), id: id, args: args === undefined ? null : args, source: source };
      log.push(e);
      if (o.onAction) o.onAction(e);
      return { ok: true };
    };
    /* the one thing to do next: the first matching rule of the current scene that can run now */
    api.next = function () {
      if (busy()) return null;
      var rules = scene().next || [], i, r;
      for (i = 0; i < rules.length; i++) {
        r = rules[i];
        if (api.cond(r["if"]) && !api.check(r.act, r.args)) return { id: r.act, args: r.args === undefined ? null : r.args, label: r.label || r.act };
      }
      return null;
    };
    api.doNext = function (source) { var n = api.next(); return n ? api.do(n.id, n.args === null ? undefined : n.args, source || "learner") : { ok: false, reason: "nothing to do" }; };
    /* tap regions, registered by the presentation each frame */
    api.hitsReset = function () { hits = []; };
    api.hit = function (r, id, args) { hits.push({ x: r.x, y: r.y, w: r.w, h: r.h, id: id, args: args }); };
    api.at = function (x, y) { var i, h; for (i = hits.length - 1; i >= 0; i--) { h = hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; };
    api.log = function () { return log.slice(); };
    api.reset = function () { log = []; hits = []; };
    /* replay: re-apply logged inputs at the same simulation time, so a session replays the same at any frame
       rate (Director actions are regenerated by the Director) */
    api.replayer = function (entries) {
      var list = [], i = 0, k;
      for (k = 0; k < entries.length; k++) if (entries[k].source !== "director") list.push(entries[k]);
      return function () {
        while (i < list.length && list[i].t <= o.clock.t + 1e-6) { var e = list[i++]; api.do(e.id, e.args === null ? undefined : e.args, e.source); }
      };
    };
    api.scene = scene;
    /* static checks of the script against the defined actions, predicates and guide ids */
    api.validate = function (guideIds) {
      var out = [], seen = {}, i, j;
      function cond(c, where) {
        if (!c) return;
        var k;
        for (k in c) if (c.hasOwnProperty(k) && COND_KEYS.indexOf(k) < 0) out.push(where + ": unknown condition key " + k);
        if (typeof c === "string" || typeof c === "function") out.push(where + ": conditions must be objects");
        if (c.all) for (k = 0; k < c.all.length; k++) cond(c.all[k], where);
        if (c.any) for (k = 0; k < c.any.length; k++) cond(c.any[k], where);
        if (c.not) cond(c.not, where);
        if (c.obs !== undefined && OPS.indexOf(c.op) < 0) out.push(where + ": bad comparator " + c.op);
        if (c.pred !== undefined && !preds[c.pred]) out.push(where + ": unknown predicate " + c.pred);
      }
      if (!script || !script.scenes || !script.scenes.length) return ["the script has no scenes"];
      for (i = 0; i < script.scenes.length; i++) {
        var sc = script.scenes[i], w = "scene " + (sc.id || i);
        if (!sc.id) out.push(w + ": id is required");
        if (seen[sc.id]) out.push(w + ": duplicate scene id");
        seen[sc.id] = 1;
        if (!sc.objective) out.push(w + ": objective is required");
        for (j = 0; j < (sc.allow || []).length; j++) if (sc.allow[j] !== "*" && !defs[sc.allow[j]]) out.push(w + ": allows unknown action " + sc.allow[j]);
        for (j = 0; j < (sc.next || []).length; j++) {
          if (!defs[sc.next[j].act]) out.push(w + ": next names unknown action " + sc.next[j].act);
          cond(sc.next[j]["if"], w + " next");
        }
        cond(sc.exit, w + " exit");
        if (guideIds && sc.guide && guideIds.indexOf(sc.guide) < 0) out.push(w + ": unknown guide " + sc.guide);
        if (i < script.scenes.length - 1 && !sc.exit) out.push(w + ": a scene that is not the last needs an exit condition");
      }
      return out;
    };
    /* UI convention (proven in CON-CHE-CALORIMETER-01): the guide's NEXT button does the next action, and a
       sticky button offers it whenever the experiment is on screen but neither the NEXT button nor the
       page's own action buttons are. Pass DOM elements; isOnScreen(el) decides visibility. */
    api.syncNextUI = function (u) {
      var n = api.next(), inView = function (el) { if (!el || el.hidden || el.offsetParent === null) return false; var r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; };
      if (u.button){ u.button.disabled = !n; u.button.textContent = n ? "▶ " + n.label : (u.idleText || "…"); }
      if (u.sticky) {
        var cv = u.stage ? u.stage.getBoundingClientRect() : null, stageOn = !cv || (cv.bottom > 80 && cv.top < window.innerHeight - 80);
        var others = false, i; for (i = 0; i < (u.primary || []).length; i++) if (inView(u.primary[i])) others = true;
        var show = !!n && stageOn && !inView(u.button) && !others;
        if (u.sticky.hidden === show) u.sticky.hidden = !show;
        if (show) u.sticky.textContent = "▶ " + n.label;
      }
      return n;
    };
    return api;
  }
  return { create: create, SOURCES: SOURCES };
})();
