/* px-cam@1 - renderer-independent camera mathematics (no drawing).
   Named shots {eye:[x,y,z], at:[x,y,z], fov, tall?}; go() eases from the current view (the target leads the
   eye slightly; an optional lift arcs the path); user() adds a bounded orbit offset and cancels a scripted
   move; view() returns the pose any renderer can use (a 2.5D page can use `at` as its pan focus and fov as
   zoom). It advances only through update(dt) from the clock, so transitions are deterministic. */
var CAM = (function () {
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function v3(a) { return [a[0], a[1], a[2]]; }
  function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function create(shots, o) {
    o = o || {};
    var k, api = {}, maxYaw = o.maxYaw === undefined ? 0.6 : o.maxYaw, maxPitch = o.maxPitch === undefined ? 0.25 : o.maxPitch;
    function okShot(s, n) {
      if (!s || !s.eye || !s.at || s.eye.length !== 3 || s.at.length !== 3 || !(s.fov > 0)) throw new Error("CAM: bad shot " + n);
      if (s.tall) okShot(s.tall, n + ".tall");
    }
    for (k in shots) if (shots.hasOwnProperty(k)) okShot(shots[k], k);
    var st = { shot: null, base: null, from: null, to: null, u: 1, dur: 1, lift: 0, yaw: 0, pitch: 0 };
    api.resolve = function (name) {
      var s = shots[name];
      if (!s) throw new Error("CAM: unknown shot " + name);
      var r = o.portrait && o.portrait() && s.tall ? s.tall : s;
      return { eye: v3(r.eye), at: v3(r.at), fov: r.fov };
    };
    api.set = function (name) { st.shot = name; st.base = api.resolve(name); st.u = 1; st.yaw = 0; st.pitch = 0; };
    api.go = function (name, dur, lift) {
      if (!st.base) { api.set(name); return; }
      st.from = { eye: v3(st.base.eye), at: v3(st.base.at), fov: st.base.fov };
      st.to = api.resolve(name); st.shot = name; st.dur = dur > 0 ? dur : 0.0001; st.lift = lift || 0; st.u = 0;
      st.yaw = 0; st.pitch = 0;
    };
    api.update = function (dt) {
      if (st.u >= 1 || !st.to) return;
      st.u = Math.min(1, st.u + dt / st.dur);
      var e = ease(st.u), et = ease(Math.min(1, st.u * 1.3)), eye = lerp3(st.from.eye, st.to.eye, e);
      eye[1] += Math.sin(Math.PI * e) * st.lift;
      st.base = { eye: eye, at: lerp3(st.from.at, st.to.at, et), fov: st.from.fov + (st.to.fov - st.from.fov) * e };
    };
    api.flying = function () { return st.u < 1; };
    /* the learner's drag: bounded yaw/pitch around the target; a scripted move stops where it is */
    api.user = function (dyaw, dpitch) {
      st.u = 1;
      st.yaw = Math.max(-maxYaw, Math.min(maxYaw, st.yaw + (dyaw || 0)));
      st.pitch = Math.max(-maxPitch, Math.min(maxPitch, st.pitch + (dpitch || 0)));
    };
    api.resetUser = function () { st.yaw = 0; st.pitch = 0; };
    api.view = function () {
      if (!st.base) throw new Error("CAM: no shot set");
      var b = st.base, dx = b.eye[0] - b.at[0], dz = b.eye[2] - b.at[2], c = Math.cos(st.yaw), s = Math.sin(st.yaw), dist = Math.sqrt(dx * dx + dz * dz);
      return { eye: [b.at[0] + dx * c + dz * s, b.eye[1] + st.pitch * dist, b.at[2] - dx * s + dz * c], at: v3(b.at), fov: b.fov, shot: st.shot };
    };
    api.state = function () { return { shot: st.shot, u: st.u, yaw: st.yaw, pitch: st.pitch }; };
    return api;
  }
  return { create: create, ease: ease };
})();
