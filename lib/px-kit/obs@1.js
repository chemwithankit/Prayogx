/* px-obs@1 - the one scientific truth.
   An observable is a named, typed, provenance-tagged scientific quantity. frame(ctx) computes every value once,
   in definition order; every consumer (renderer, guide, PX.state, tests, recorder) reads that one snapshot.
   Scientific values never contain presentation progress: present()/fp() give a gradual reveal of a value
   without changing the observable. f()/num()/fp() record what they printed, and shown() records every
   visible string with its kind, so tests can prove each scientific number came from an observable. */
var OBS = (function () {
  var STATUS = ["measured", "calculated", "illustrative", "idealized", "hypothetical", "exaggerated"];
  var KINDS = ["sci", "ui", "decor"];
  var ID = /^[a-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)*$/;
  function create() {
    var defs = {}, order = [], vals = null, emitted = [], shown = [], mark = 0, o = { frames: 0 };
    function fail(m) { throw new Error("OBS: " + m); }
    function need(id) {
      if (!defs[id]) fail("unknown observable " + id);
      if (!vals) fail("no frame computed yet");
    }
    o.def = function (id, d) {
      d = d || {};
      if (!ID.test(id)) fail("bad id " + id);
      if (defs[id]) fail("duplicate observable " + id);
      if (typeof d.unit !== "string") fail(id + ": unit must be a string ('' if none)");
      if (!d.meaning) fail(id + ": meaning is required");
      if (STATUS.indexOf(d.status) < 0) fail(id + ": status must be one of " + STATUS.join(", "));
      if (typeof d.from !== "function") fail(id + ": from(ctx, get) is required");
      if (d.signed && !d.sign) fail(id + ": a signed observable needs its sign convention");
      var dec = d.decimals === undefined ? 2 : d.decimals;
      if (!(dec >= 0 && dec <= 6 && Math.floor(dec) === dec)) fail(id + ": decimals must be 0-6");
      defs[id] = { id: id, unit: d.unit, meaning: d.meaning, status: d.status, signed: !!d.signed, sign: d.sign || null,
        decimals: dec, plus: !!d.plus, from: d.from };
      order.push(id);
      return o;
    };
    /* compute the snapshot for this frame; values may use earlier observables through get(id) */
    o.frame = function (ctx) {
      var out = {}, i, id, v;
      var get = function (k) { if (!(k in out)) fail(k + " used before it is defined"); return out[k]; };
      for (i = 0; i < order.length; i++) {
        id = order[i];
        v = defs[id].from(ctx, get);
        if (typeof v !== "number" || !isFinite(v)) fail(id + " is not a finite number");
        out[id] = v;
      }
      vals = out; emitted = []; shown = []; mark = 0; o.frames++;
      return o;
    };
    o.v = function (id) { need(id); return vals[id]; };
    function fmt(d, x) {
      var p = Math.pow(10, d.decimals), s = (Math.round(x * p) / p).toFixed(d.decimals);
      if (Number(s) === 0) s = (0).toFixed(d.decimals);
      if (s.charAt(0) === "-") s = "−" + s.slice(1);
      else if (d.plus && Number(s) > 0) s = "+" + s;
      return s;
    }
    function unit(d, s) { return d.unit ? s + " " + d.unit : s; }
    o.num = function (id) { need(id); var s = fmt(defs[id], vals[id]); emitted.push(s); return s; };
    o.f = function (id) { need(id); var s = unit(defs[id], fmt(defs[id], vals[id])); emitted.push(s); return s; };
    /* presentation transform: a gradual reveal from start toward the observable; never stored, never an observable */
    o.present = function (id, progress, start) {
      need(id);
      var p = progress < 0 ? 0 : progress > 1 ? 1 : +progress || 0, s0 = start === undefined ? 0 : +start;
      return s0 + (vals[id] - s0) * p;
    };
    o.fp = function (id, progress, start) { var s = unit(defs[id], fmt(defs[id], o.present(id, progress, start))); emitted.push(s); return s; };
    o.meta = function (id) {
      if (!defs[id]) fail("unknown observable " + id);
      var d = defs[id];
      return { id: d.id, unit: d.unit, meaning: d.meaning, status: d.status, signed: d.signed, sign: d.sign, decimals: d.decimals };
    };
    o.ids = function () { return order.slice(); };
    o.snapshot = function () { var s = {}, i; if (!vals) return s; for (i = 0; i < order.length; i++) s[order[i]] = vals[order[i]]; return s; };
    /* flat fields for PX.state(): the recorder keeps only flat number/string/boolean fields */
    o.flat = function () { var s = {}, i; if (!vals) return s; for (i = 0; i < order.length; i++) s["obs_" + order[i].replace(/\./g, "_")] = vals[order[i]]; return s; };
    /* every visible string goes through shown(). Each entry keeps the f()/num()/fp() strings printed since the
       previous shown() call (from), so a test can check that every number in a "sci" text is one of its own
       observable strings, not a number that only happens to be printed elsewhere in the frame. */
    o.shown = function (text, kind) {
      kind = kind || "sci";
      if (KINDS.indexOf(kind) < 0) fail("bad text kind " + kind);
      shown.push({ text: String(text), kind: kind, from: emitted.slice(mark) });
      mark = emitted.length;
      return String(text);
    };
    o.shownList = function () { return shown.slice(); };
    o.emitted = function () { return emitted.slice(); };
    return o;
  }
  return { create: create, STATUS: STATUS, KINDS: KINDS };
})();
