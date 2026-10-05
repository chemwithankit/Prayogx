/* px-dir@1 - the event-aware Director.
   A film is a list of steps. It acts only through act.do(id, args, "director"), so it obeys the same
   validation as a learner; it waits on animation idleness, observable comparisons, named predicates,
   learner actions or simulation seconds; it never evaluates strings and never touches scientific state.
   update() runs once per frame after the clock step, so the same inputs give the same film every time.
   Status lives in S.dir (serialisable): film, i, mode, mark, marks, shot, focus, say, hint, error, done. */
var DIR = (function () {
  var KINDS = ["do", "wait", "shot", "focus", "say", "mark", "end"];
  var WAITS = ["idle", "obs", "pred", "learner", "seconds"];
  var MODES = ["media", "classroom", "learner"];
  function create(o) {
    var S = o.state, act = o.act, clock = o.clock, films = {}, api = {}, playing = false, steps = null, w = null;
    function fail(m) { throw new Error("DIR: " + m); }
    function blank() { return { film: null, i: 0, mode: null, mark: null, marks: 0, shot: null, focus: null, say: null, hint: null, error: null, done: false }; }
    S.dir = blank();
    function check(s, n) {
      var kinds = [], k;
      for (k in s) if (s.hasOwnProperty(k) && KINDS.indexOf(k) >= 0) kinds.push(k);
      if (kinds.length !== 1) fail(n + ": a step needs exactly one of " + KINDS.join(", "));
      if (s["do"] !== undefined && typeof s["do"] !== "string") fail(n + ": do names an action");
      if (s.wait) {
        var ws = [];
        for (k in s.wait) if (s.wait.hasOwnProperty(k) && WAITS.indexOf(k) >= 0) ws.push(k);
        if (ws.length !== 1) fail(n + ": a wait needs exactly one of " + WAITS.join(", "));
        if (s.wait.obs !== undefined && (typeof s.wait.obs !== "string" || typeof s.wait.op !== "string" || typeof s.wait.value !== "number")) fail(n + ": wait obs needs {obs, op, value}");
        if (s.wait.pred !== undefined && typeof s.wait.pred !== "string") fail(n + ": wait pred names a predicate");
        if (s.wait.learner !== undefined && typeof s.wait.learner !== "string") fail(n + ": wait learner names an action");
        if (s.wait.seconds !== undefined && !(s.wait.seconds >= 0)) fail(n + ": wait seconds must be a number");
        if (s.wait.timeout !== undefined && !(s.wait.timeout > 0)) fail(n + ": timeout must be positive");
      }
      if (s.shot !== undefined && typeof s.shot !== "string") fail(n + ": shot names a camera shot");
    }
    api.load = function (name, list) {
      if (!list || !list.length) fail(name + ": empty film");
      for (var i = 0; i < list.length; i++) check(list[i], name + " step " + i);
      films[name] = list;
      return api;
    };
    api.play = function (name, mode) {
      if (!films[name]) fail("unknown film " + name);
      if (MODES.indexOf(mode) < 0) fail("bad mode " + mode);
      S.dir = blank(); S.dir.film = name; S.dir.mode = mode;
      steps = films[name]; playing = true; w = null;
    };
    api.stop = function () { playing = false; };
    api.reset = function () { playing = false; w = null; S.dir = blank(); };
    api.playing = function () { return playing; };
    var teacherTap = false;
    api.tap = function () { teacherTap = true; };       /* classroom mode: the teacher's tap releases a learner wait */
    function matches(pat, id) { return pat.charAt(pat.length - 1) === "*" ? id.indexOf(pat.slice(0, -1)) === 0 : pat === id; }
    function satisfied(x) {
      if (x.idle !== undefined) return act.cond({ idle: x.idle });
      if (x.obs !== undefined) return act.cond({ obs: x.obs, op: x.op, value: x.value, tol: x.tol });
      if (x.pred !== undefined) return act.cond({ pred: x.pred });
      if (x.seconds !== undefined) return clock.t - w.from >= x.seconds - 1e-9;
      if (x.learner !== undefined) {
        if (S.dir.mode === "media") return true;
        if (S.dir.mode === "classroom" && teacherTap) return true;
        var lg = act.log(), i;
        for (i = w.logAt; i < lg.length; i++) if (lg[i].source === "learner" && matches(x.learner, lg[i].id)) return true;
        return false;
      }
      return false;
    }
    function finish(err) { playing = false; if (err) S.dir.error = err; else S.dir.done = true; if (o.onEnd) o.onEnd(S.dir); }
    /* a bad step (unknown predicate, shot or observable) stops the film with an error; it never escapes into
       the frame loop */
    api.update = function () {
      if (!playing) return;
      try { run(); } catch (e) { finish("error at step " + S.dir.i + ": " + e.message); }
    };
    function run() {
      var guard = 0, s, r;
      while (playing && guard++ < 64) {
        if (S.dir.i >= steps.length) { finish(); return; }
        s = steps[S.dir.i];
        if (s.wait) {
          if (!w) { w = { from: clock.t, logAt: act.log().length, hinted: false }; teacherTap = false; }
          if (satisfied(s.wait)) { w = null; S.dir.hint = null; S.dir.i++; continue; }
          if (s.wait.timeout !== undefined && clock.t - w.from >= s.wait.timeout) {
            if (s.wait.hint !== undefined) { if (!w.hinted) { w.hinted = true; S.dir.hint = s.wait.hint; } }
            else { finish("timed out waiting at step " + S.dir.i); return; }
          }
          return;
        }
        if (s["do"] !== undefined) {
          r = act.do(s["do"], s.args, "director");
          if (!r.ok) { finish("refused at step " + S.dir.i + ": " + r.reason); return; }
        } else if (s.shot !== undefined) { S.dir.shot = s.shot; if (o.cam) o.cam.go(s.shot, s.dur === undefined ? 1 : s.dur, s.lift || 0); }
        else if (s.focus !== undefined) S.dir.focus = s.focus;
        else if (s.say !== undefined) S.dir.say = s.say;
        else if (s.mark !== undefined) { S.dir.mark = s.mark; S.dir.marks++; }
        else if (s.end !== undefined) { S.dir.i = steps.length; finish(); return; }
        S.dir.i++;
      }
      if (guard >= 64) finish("more than 64 steps in one frame");
    }
    return api;
  }
  return { create: create, KINDS: KINDS, WAITS: WAITS, MODES: MODES };
})();
