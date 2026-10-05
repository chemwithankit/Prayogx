/* PrayogX Experience Kit - unit tests of the canonical blocks (lib/px-kit), run in Node without a browser.
   Each block is loaded exactly as a page carries it (plain ES5 in one scope).
   Run:  node tests/kit/kit_unit.js                                                                        */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = process.env.PRAYOGX_ROOT || path.resolve(__dirname, '..', '..');
const KIT = path.join(ROOT, 'lib', 'px-kit');
let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (!c && x !== undefined ? '   ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
const throws = (fn, re) => { try { fn(); return false; } catch (e) { return !re || re.test(e.message); } };
function kit() {
  const ctx = { Math, JSON, Error, Object, Array, Number, String, isFinite, window: { innerHeight: 800 } };
  vm.createContext(ctx);
  for (const f of ['clock@1.js', 'obs@1.js', 'act@1.js', 'dir@1.js', 'cam@1.js']) vm.runInContext(fs.readFileSync(path.join(KIT, f), 'utf8') + '\n;this.CLOCK=typeof CLOCK!=="undefined"?CLOCK:this.CLOCK;this.OBS=typeof OBS!=="undefined"?OBS:this.OBS;this.ACT=typeof ACT!=="undefined"?ACT:this.ACT;this.DIR=typeof DIR!=="undefined"?DIR:this.DIR;this.CAM=typeof CAM!=="undefined"?CAM:this.CAM;', ctx);
  return ctx;
}

console.log('=== clock');
{
  const K = kit();
  const run = seq => { const c = K.CLOCK.create({ substep: 0.004 }); const ticks = []; c.on((h, t) => ticks.push(+t.toFixed(9))); seq.forEach(d => c.step(d)); return { t: c.t, f: c.frame, ticks: ticks.length, last: ticks[ticks.length - 1] }; };
  const seq = [0.016, 0.017, 0.033, 0.016, 0.2, 0.004];
  ok('the same dt sequence gives the same time, frames and substeps', JSON.stringify(run(seq)) === JSON.stringify(run(seq)));
  const c = K.CLOCK.create({ substep: 0.002 }); let subs = 0; c.on(() => subs++); c.step(0.016);
  ok('fixed substeps: 16 ms → 8 substeps of 2 ms', subs === 8 && Math.abs(c.t - 0.016) < 1e-12);
  c.step(0.2); ok('dt is capped at maxDt (50 ms)', Math.abs(c.t - 0.066) < 1e-12);
  c.pause(true); const t0 = c.t; c.step(0.016); ok('paused: time does not advance (the frame still counts)', c.t === t0 && c.frame === 3);
  c.pause(false); c.setSpeed(2); c.step(0.01); ok('speed scales time', Math.abs(c.t - t0 - 0.02) < 1e-12);
  c.setSpeed(-1); ok('a bad speed is ignored', c.speed === 2);
  c.step(-5); c.step(NaN); ok('negative or NaN dt does not move time', Math.abs(c.t - t0 - 0.02) < 1e-12);
  const r = K.CLOCK.create({ substep: 0.004 }); const hs = []; r.on(h => hs.push(h)); r.step(0.006); const t1 = r.t; r.step(0.002);
  ok('a partial substep carries to the next frame (6 ms → one 4 ms step, then +2 ms → the second)', Math.abs(t1 - 0.004) < 1e-12 && Math.abs(r.t - 0.008) < 1e-12 && hs.every(h => h === 0.004));
  const fr = fps => { const k = K.CLOCK.create({ substep: 0.01 }); let x = 1, v = 0; const ts = []; k.on((h, t) => { v -= x * h; x += v * h; ts.push(t); }); for (let i = 0; i < fps * 2; i++) k.step(1 / fps); return { x, ts: ts.join() }; };
  const f30 = fr(30), f60 = fr(60), f50 = fr(50);
  ok('a time-stepped model gives identical results at 30, 50 and 60 fps (fixed step, not frame-dependent)', f30.x === f60.x && f30.x === f50.x && f30.ts === f60.ts);
  const a1 = K.CLOCK.approach(0, 10, 3, 0.1), a2 = K.CLOCK.approach(K.CLOCK.approach(0, 10, 3, 0.05), 10, 3, 0.05);
  ok('approach() is frame-rate independent (one 100 ms step = two 50 ms steps)', Math.abs(a1 - a2) < 1e-12);
  c.reset(); ok('reset() returns to t = 0, frame 0', c.t === 0 && c.frame === 0);
}

console.log('=== obs');
{
  const K = kit(), O = K.OBS.create();
  const d = (id, x) => Object.assign({ unit: 'J', meaning: 'm', status: 'calculated', from: () => 1 }, x);
  O.def('heat.water', d(null, { signed: true, sign: '+ = into the water', plus: true, decimals: 0, from: c => c.q }));
  O.def('heat.source', d(null, { signed: true, sign: '+ = into the source', decimals: 0, from: (c, get) => -get('heat.water') }));
  O.def('water.T', d(null, { unit: '°C', decimals: 1, from: c => 25 + c.q / 840 }));
  ok('duplicate ids are rejected', throws(() => O.def('water.T', d()), /duplicate/));
  ok('a bad status is rejected', throws(() => O.def('x.a', d(null, { status: 'guess' })), /status/));
  ok('a signed observable without a sign convention is rejected', throws(() => O.def('x.b', d(null, { signed: true })), /sign/));
  ok('a missing meaning or unit is rejected', throws(() => O.def('x.c', d(null, { meaning: '' }))) && throws(() => O.def('x.d', d(null, { unit: undefined }))));
  ok('bad ids are rejected', throws(() => O.def('Bad Id', d())));
  ok('reading before the first frame is an error', throws(() => O.v('water.T'), /no frame/));
  O.frame({ q: 2100 });
  ok('values come from the model context: q = 2100 J, source = −2100 J, T = 27.5 °C', O.v('heat.water') === 2100 && O.v('heat.source') === -2100 && O.v('water.T') === 27.5);
  ok('formatting: +2100 J, −2100 J (true minus sign), 27.5 °C', O.f('heat.water') === '+2100 J' && O.f('heat.source') === '−2100 J' && O.f('water.T') === '27.5 °C');
  O.frame({ q: -0.00001 }); ok('no "−0" or "+0"', O.f('heat.water') === '0 J' && O.num('heat.source') === '0');
  O.frame({ q: 2100 });
  ok('present() reveals gradually without changing the observable', O.present('water.T', 0.5, 25) === 26.25 && O.v('water.T') === 27.5 && O.fp('water.T', 0.5, 25) === '26.3 °C');
  ok('meta() carries unit, sign, status and meaning, not the formula', (m => m.sign === '+ = into the water' && m.status === 'calculated' && m.unit === 'J' && !('from' in m))(O.meta('heat.water')));
  const s1 = O.snapshot(), s2 = O.snapshot(); s1['water.T'] = 99;
  ok('snapshot() is a stable copy: changing it does not change the observable', s2['water.T'] === 27.5 && O.v('water.T') === 27.5);
  ok('flat() gives recorder-ready obs_* fields', O.flat().obs_water_T === 27.5 && O.flat().obs_heat_source === -2100);
  ok('ids() lists definition order', O.ids().join() === 'heat.water,heat.source,water.T');
  O.f('water.T'); O.shown('27.5 °C', 'sci'); O.shown('Step 2 of 3', 'ui');
  ok('emitted() and shownList() record what was printed this frame', O.emitted().indexOf('27.5 °C') >= 0 && O.shownList().length === 2);
  { const L = O.shownList(); ok('each shown text carries the observable strings printed since the previous shown() (the fp() and f() above), and the next text starts empty', JSON.stringify(L[0].from) === JSON.stringify(['26.3 °C', '27.5 °C']) && L[1].from.length === 0, L); }
  ok('a bad text kind is rejected', throws(() => O.shown('x', 'misc')));
  O.frame({ q: 1050 }); ok('a new frame clears the printed records', O.emitted().length === 0 && O.shownList().length === 0);
  const O2 = K.OBS.create(); O2.def('a.b', d(null, { from: () => NaN }));
  ok('a non-finite value is an error, not a silent display', throws(() => O2.frame({}), /finite/));
  const O3 = K.OBS.create(); O3.def('a.b', d(null, { from: (c, get) => get('a.c') })); O3.def('a.c', d());
  ok('using an observable before it is defined is an error', throws(() => O3.frame({}), /before/));
}

function lab(K, extra) {
  const S = { scene: 0, flags: {}, anim: null, n: 0 }, clock = K.CLOCK.create(), O = K.OBS.create();
  O.def('x.v', { unit: '', meaning: 'counter', status: 'calculated', decimals: 0, from: c => c.S.n });
  const script = { scenes: [
    { id: 'a', objective: 'press', allow: ['press'], next: [{ if: { flag: '!pressed' }, act: 'press', label: 'Press' }, { act: 'advance', label: 'Go on' }], exit: { flag: 'pressed' }, guide: 'ga' },
    { id: 'b', objective: 'count', allow: ['bump', 'press'], next: [{ if: { obs: 'x.v', op: '<', value: 3 }, act: 'bump', label: 'Bump' }, { act: 'advance', label: 'Go on' }], exit: { obs: 'x.v', op: '>=', value: 3 }, guide: 'gb' },
    { id: 'c', objective: 'done', allow: [], next: [], guide: 'gc' }] };
  const A = K.ACT.create({ state: S, script, obs: O, clock, busy: () => !!S.anim });
  A.def('press', { when: S => !S.flags.pressed, run: S => { S.flags.pressed = 1; S.anim = { t: 0, d: 0.1 }; } });
  A.def('bump', { args: [1, 2], run: (S, k) => { S.n += k || 1; } });
  A.pred('isThree', S => S.n === 3);
  clock.on(h => { if (S.anim) { S.anim.t += h; if (S.anim.t >= S.anim.d) S.anim = null; } });
  O.frame({ S });
  const frame = dt => { clock.step(dt); O.frame({ S }); };
  return Object.assign({ S, clock, O, A, script, frame }, extra || {});
}

console.log('=== act');
{
  const K = kit(), L = lab(K), { S, A } = L;
  ok('the script validates against the defined actions and guides', A.validate(['ga', 'gb', 'gc']).length === 0, A.validate(['ga', 'gb', 'gc']));
  ok('a bad source is refused', !A.do('press', undefined, 'hacker').ok);
  ok('an action not allowed in this scene is refused', /not allowed/.test(A.do('bump', 1, 'test').reason));
  ok('advance is refused before the exit condition holds', !A.do('advance', undefined, 'test').ok && S.scene === 0);
  ok('next() names the intended action', A.next().id === 'press' && A.next().label === 'Press');
  ok('do() runs it', A.do('press', undefined, 'learner').ok && S.flags.pressed === 1);
  ok('while an animation runs, actions are refused and next() is null', A.next() === null && /busy/.test(A.do('advance', undefined, 'test').reason));
  L.frame(0.05); L.frame(0.05); L.frame(0.01);
  ok('after the animation, next() is advance', A.next() && A.next().id === 'advance');
  ok('advance moves one scene', A.doNext('learner').ok && S.scene === 1);
  ok('a bad argument is refused', /bad argument/.test(A.do('bump', 7, 'test').reason));
  ok('an action whose when() is false is refused', /not ready/.test(A.do('press', undefined, 'test').reason));
  A.do('bump', 1, 'test'); L.frame(0.016); A.do('bump', 2, 'test'); L.frame(0.016);
  ok('observable conditions read the snapshot: x.v = 3 → next is advance', L.O.v('x.v') === 3 && A.next().id === 'advance');
  ok('named predicates', A.cond({ pred: 'isThree' }) === true && throws(() => A.cond({ pred: 'nope' }), /unknown predicate/));
  ok('a string condition is never evaluated', throws(() => A.cond('S.n === 3')));
  ok('unknown condition keys are rejected', throws(() => A.cond({ eval: 'x' })));
  ok('the log records frame, time, id, args and source', (l => l.length === 4 && l[0].id === 'press' && l[0].source === 'learner' && 'f' in l[0] && 't' in l[0])(A.log()));
  const v2 = A.validate(['ga']);
  ok('validate() finds unknown guides', v2.some(m => /unknown guide gb/.test(m)));
  const bad = K.ACT.create({ state: { scene: 0, flags: {} }, script: { scenes: [{ id: 'z', objective: 'o', allow: ['ghost'], next: [{ act: 'ghost2', if: { flag: 'a', eval: 1 } }], exit: { pred: 'none' } }, { id: 'y', objective: 'o' }] }, obs: L.O, clock: L.clock });
  const vb = bad.validate();
  ok('validate() finds unknown actions, keys and predicates', vb.some(m => /unknown action ghost/.test(m)) && vb.some(m => /unknown condition key eval/.test(m)) && vb.some(m => /unknown predicate none/.test(m)), vb);
  /* replay: the same learner inputs at the same frames give the same state */
  const record = () => { const M = lab(kit()); const steps = [() => M.A.do('press', undefined, 'learner'), null, null, null, () => M.A.doNext('learner'), () => M.A.do('bump', 2, 'learner'), null, () => M.A.do('bump', 1, 'learner'), null, () => M.A.doNext('learner')];
    steps.forEach(s => { if (s) s(); M.frame(0.04); }); return M; };
  const R1 = record();
  const R2 = lab(kit()), rp = R2.A.replayer(R1.A.log());
  for (let i = 0; i < 10; i++) { rp(); R2.frame(0.04); }
  ok('replaying the log reproduces the state exactly', JSON.stringify(R1.S) === JSON.stringify(R2.S) && R2.S.scene === 2, [R1.S, R2.S]);
  ok('...and the same log', JSON.stringify(R1.A.log()) === JSON.stringify(R2.A.log()));
  const R3 = lab(kit()), rp3 = R3.A.replayer(R1.A.log());
  for (let i = 0; i < 20; i++) { rp3(); R3.frame(0.02); }
  const sig = L => JSON.stringify(L.A.log().map(e => [e.id, e.args, e.t]));
  ok('replay is keyed to simulation time: the same log at twice the frame rate gives the same state and the same actions at the same times', JSON.stringify(R1.S) === JSON.stringify(R3.S) && sig(R1) === sig(R3), [sig(R1), sig(R3)]);
}

console.log('=== dir');
{
  const film = [{ 'do': 'press' }, { wait: { idle: true } }, { mark: 'pressed' }, { 'do': 'advance' }, { shot: 'close', dur: 0.5 }, { 'do': 'bump', args: 2 }, { wait: { seconds: 0.2 } }, { 'do': 'bump', args: 1 },
    { wait: { obs: 'x.v', op: '>=', value: 3 } }, { wait: { pred: 'isThree' } }, { focus: 'counter' }, { say: 'gb' }, { 'do': 'advance' }, { end: true }];
  const play = (mode, f, extra) => {
    const K = kit(), L = lab(K), cam = K.CAM.create({ wide: { eye: [0, 5, 20], at: [0, 0, 0], fov: 0.6 }, close: { eye: [0, 3, 8], at: [1, 1, 0], fov: 0.5 } });
    cam.set('wide'); L.clock.on(h => cam.update(h));
    const D = K.DIR.create({ state: L.S, act: L.A, clock: L.clock, cam }); D.load('f', f || film); D.play('f', mode);
    const trace = [];
    for (let i = 0; i < 400 && D.playing(); i++) { if (extra) extra(L, D, i); L.clock.step(1 / 30); D.update(); L.O.frame({ S: L.S }); trace.push(L.S.scene + ':' + L.S.n + ':' + L.S.dir.i + ':' + (L.S.dir.mark || '') + ':' + cam.view().eye.map(x => x.toFixed(6)).join(',')); }
    return { L, D, trace, cam };
  };
  const a = play('media'), b = play('media');
  ok('a film runs to the end', a.L.S.dir.done && !a.L.S.dir.error && a.L.S.scene === 2, a.L.S.dir);
  ok('the same film twice gives the same trace, frame by frame (' + a.trace.length + ' frames)', JSON.stringify(a.trace) === JSON.stringify(b.trace));
  ok('the Director acted only through actions (all logged as director)', a.L.A.log().every(e => e.source === 'director') && a.L.A.log().length === 5);
  ok('marks, shot, focus and say are recorded in S.dir', a.L.S.dir.mark === 'pressed' && a.L.S.dir.marks === 1 && a.L.S.dir.shot === 'close' && a.L.S.dir.focus === 'counter' && a.L.S.dir.say === 'gb');
  ok('the shot request started a camera move toward the new shot', a.cam.view().fov < 0.6 && a.cam.view().shot === 'close');
  const K = kit();
  const mk = () => { const L = lab(K); return { L, D: K.DIR.create({ state: L.S, act: L.A, clock: L.clock }) }; };
  ok('a step with two kinds is rejected', throws(() => mk().D.load('x', [{ 'do': 'press', mark: 'm' }])));
  ok('a string predicate is rejected', throws(() => mk().D.load('x', [{ wait: { pred: s => true } }])) && throws(() => mk().D.load('x', [{ wait: { obs: 'x.v', op: '>=' } }])));
  ok('a wait with two conditions is rejected', throws(() => mk().D.load('x', [{ wait: { idle: true, seconds: 1 } }])));
  const r = play('media', [{ 'do': 'bump', args: 1 }, { end: true }]);
  ok('the Director cannot bypass validation: a disallowed action stops the film with an error', /refused/.test(r.L.S.dir.error || '') && r.L.S.n === 0 && !r.L.S.dir.done);
  let thrown = null; const u = play('media', [{ wait: { pred: 'PX.state().t > 1' } }, { end: true }]);
  try { u.D.update(); } catch (e) { thrown = e; }
  ok('a string expression is never evaluated: it is an unknown predicate, stops the film with an error and never throws', /unknown predicate/.test(u.L.S.dir.error || '') && !thrown);
  const t = play('media', [{ wait: { seconds: 0.5 } }, { wait: { obs: 'x.v', op: '>=', value: 99, timeout: 1 } }, { end: true }]);
  ok('a wait that never resolves times out deterministically (no hint → error)', /timed out/.test(t.L.S.dir.error || ''));
  /* learner waits */
  const lw = [{ wait: { learner: 'press', timeout: 1, hint: 'Press the button' } }, { mark: 'learner-did-it' }, { end: true }];
  let hintSeen = false;
  const l = play('learner', lw, (L, D, i) => { if (L.S.dir.hint) hintSeen = true; if (i === 60) L.A.do('press', undefined, 'learner'); });
  ok('learner mode: the film waits for the learner, shows the hint after the timeout, then continues', hintSeen && l.L.S.dir.done && l.L.S.dir.mark === 'learner-did-it');
  const m = play('media', lw);
  ok('media mode: learner waits are passed without a learner', m.L.S.dir.done && m.trace.length < 5);
  const cl = play('classroom', lw, (L, D, i) => { if (i === 10) D.tap(); });
  ok('classroom mode: a teacher tap releases a learner wait', cl.L.S.dir.done && cl.trace.length <= 13);
  const dirAction = play('learner', [{ wait: { learner: 'press' } }, { end: true }], (L, D, i) => { if (i === 3) L.A.do('press', undefined, 'test'); });
  ok('a learner wait is not satisfied by a test or Director action', !dirAction.L.S.dir.done);
}

console.log('=== cam');
{
  const K = kit();
  let portrait = false;
  const shots = { wide: { eye: [0, 5, 20], at: [0, 0, 0], fov: 0.6, tall: { eye: [0, 7, 28], at: [0, 1, 0], fov: 0.7 } }, close: { eye: [4, 3, 8], at: [2, 1, 0], fov: 0.5 } };
  const C = K.CAM.create(shots, { portrait: () => portrait });
  ok('bad shots are rejected', throws(() => K.CAM.create({ x: { eye: [0, 0], at: [0, 0, 0], fov: 1 } })));
  C.set('wide'); ok('a shot sets eye, target and fov', JSON.stringify(C.view().eye) === '[0,5,20]' && C.view().fov === 0.6 && C.view().shot === 'wide');
  portrait = true; C.set('wide'); ok('portrait screens use the tall variant', C.view().eye[2] === 28 && C.view().fov === 0.7);
  portrait = false; C.set('wide');
  const fly = () => { const c = K.CAM.create(shots); c.set('wide'); c.go('close', 1, 0.5); const out = []; for (let i = 0; i < 40; i++) { c.update(1 / 30); out.push(c.view()); } return out; };
  const f1 = fly(), f2 = fly();
  ok('interpolation is deterministic', JSON.stringify(f1) === JSON.stringify(f2));
  const mid = f1[11];  /* u ≈ 0.4 */
  const eu = (mid.eye[0] - 0) / 4, au = (mid.at[0] - 0) / 2;
  ok('the target leads the eye during a move', au > eu, [eu, au]);
  ok('the move ends exactly on the shot', JSON.stringify(f1[39].eye.map(x => +x.toFixed(9))) === '[4,3,8]' && f1[39].fov === 0.5);
  ok('the lift arcs the path upward at mid-move', f1[14].eye[1] > 3 + (5 - 3) * 0 && f1[14].eye[1] > 5 - (5 - 3) * K.CAM.ease(15 / 30));
  const c = K.CAM.create(shots); c.set('wide'); c.go('close', 1); c.update(0.2); const at = c.view().at.slice();
  c.user(0.3, 0); c.update(0.5);
  ok('a user drag cancels the scripted move (the target stays where it was)', !c.flying() && JSON.stringify(c.view().at) === JSON.stringify(at));
  c.user(5, 5); const s = c.state();
  ok('the user offset is bounded', s.yaw === 0.6 && s.pitch === 0.25);
  const v = c.view(), d0 = Math.hypot(v.eye[0] - v.at[0], v.eye[2] - v.at[2]); c.resetUser(); const w = c.view(), d1 = Math.hypot(w.eye[0] - w.at[0], w.eye[2] - w.at[2]);
  ok('yaw orbits around the target at the same distance', Math.abs(d0 - d1) < 1e-9);
}

console.log('\n' + (n - bad) + ' / ' + n + ' passed');
process.exit(bad ? 1 : 0);
