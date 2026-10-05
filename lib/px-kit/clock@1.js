/* px-clock@1 - deterministic simulation time.
   Time advances only through step(dt). In a page, drive() takes dt from the requestAnimationFrame timestamp,
   which the PrayogX recorder replaces with its manual clock, so recordings are frame-exact.
   No wall-clock reads, no randomness. */
var CLOCK = (function () {
  function create(opts) {
    opts = opts || {};
    var c = { t: 0, frame: 0, speed: 1, paused: false, substep: opts.substep || 0, maxDt: opts.maxDt || 0.05 }, subs = [], acc = 0, ticks = 0;
    /* advance by dt seconds (scaled by speed, capped by maxDt). With substep > 0, time moves in whole fixed
       substeps and the remainder carries to the next frame, so 30 fps and 60 fps give the same steps. */
    c.step = function (dt) {
      dt = +dt;
      if (!(dt > 0)) dt = 0;
      if (dt > c.maxDt) dt = c.maxDt;
      c.frame++;
      if (c.paused || dt === 0) return 0;
      var h = dt * c.speed, n, k, i;
      if (!(c.substep > 0)) { c.t += h; for (i = 0; i < subs.length; i++) subs[i](h, c.t); return h; }
      acc += h; n = Math.floor(acc / c.substep + 1e-9); acc = Math.max(0, acc - n * c.substep);
      for (k = 0; k < n; k++) {
        c.t = ++ticks * c.substep;
        for (i = 0; i < subs.length; i++) subs[i](c.substep, c.t);
      }
      return n * c.substep;
    };
    /* fn(h, t) runs on every (sub)step: animations, model integration, camera transitions */
    c.on = function (fn) { subs.push(fn); return c; };
    c.pause = function (on) { c.paused = on === undefined ? !c.paused : !!on; return c.paused; };
    c.setSpeed = function (k) { k = +k; if (k > 0 && isFinite(k)) c.speed = k; return c.speed; };
    c.reset = function () { c.t = 0; c.frame = 0; c.paused = false; acc = 0; ticks = 0; };
    return c;
  }
  /* frame-rate-independent smoothing: deterministic for a fixed dt */
  function approach(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }
  /* the page loop: before() (e.g. action replay), then step, then onFrame(dt) (director, observables, drawing) */
  function drive(c, onFrame, before) {
    var last = null;
    function f(ts) {
      var dt = last === null ? 0 : (ts - last) / 1000;
      last = ts;
      if (before) before();
      c.step(dt);
      onFrame(dt);
      requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  return { create: create, approach: approach, drive: drive };
})();
