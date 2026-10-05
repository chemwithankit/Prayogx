/* CON-CHE-DELTA-U-VS-DELTA-H - two calorimeters, one reaction (XP-09, the first End-to-End Production Pilot).

   Drives the finished page headlessly and checks it against the independent verifier's numbers
   (tests/verify_con_che_delta_u_vs_delta_h.py --json):
     A load · B no runtime errors · C no network requests · D reaction selector · E ignite · F prediction never blocks ·
     G the ten discovery stages in order · H/I/J graphite, hydrogen, butane datasets · K ΔH − ΔU = Δn_gRT ·
     L temperatures consistent · M what-if controls · N no premature reveal · O the reveal · P phones, no overflow
     (and the measured visual gates) · Q keyboard · R reduced motion · S window.PX state · T deterministic animation
     (manual clock: identical frames and states twice) · registration (published concept, NCERT mapping, experience records).

   Run:  node tests/sim_con_che_delta_u_vs_delta_h.js                                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { targetChecks } = require('./target_gate');
const { spawnSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'CON-CHE-DELTA-U-VS-DELTA-H';
const REL = 'simulations/concepts/chemistry/con-che-delta-u-vs-delta-h/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const RELATION = /ΔH\s*−\s*ΔU\s*=\s*Δn\(g\)·RT/;

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined && !c ? '   ' + x : '')); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* the recorder's manual clock: requestAnimationFrame, performance.now and Date.now driven by __pxClock.step(ms) */
const CLOCK = () => {
  let now = 0, q = [];
  window.__pxClock = { step(ms) { now += ms; const run = q; q = []; run.forEach(f => { try { f(now); } catch (e) { console.error(e); } }); return now; } };
  window.requestAnimationFrame = f => { q.push(f); return q.length; };
  window.cancelAnimationFrame = () => {};
  performance.now = () => now;
  const d0 = Date.now(); Date.now = () => d0 + now;
};

(async () => {
  const v = spawnSync(ROOT + '/tests/.venv/bin/python', [ROOT + '/tests/verify_con_che_delta_u_vs_delta_h.py', '--json'], { encoding: 'utf8' });
  const V = v.status === 0 ? JSON.parse(v.stdout) : null;
  ok('the independent verifier passes and provides the expected numbers', !!V && V.ok, v.stderr || v.stdout.slice(0, 200));
  const src = fs.readFileSync(FILE, 'utf8');
  const b = await launch();
  try {
    /* ---------------------------------------------------------------- A, B, C */
    console.log('=== A-C load, errors, network');
    const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
    const asked = [];
    await ctx.route('**/*', r => { const u = r.request().url(); if (!/^(file|data):/.test(u)) { asked.push(u); return r.abort(); } return r.continue(); });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(URL); await sleep(400);
    ok('A the page loads: question, lab (canvas + controls), solution, how-to, sim-id', await p.evaluate(id =>
      !!document.querySelector('section#question') && !!document.querySelector('section#lab canvas#labcv') && !!document.getElementById('controls')
      && !!document.querySelector('section#solution') && !!document.querySelector('section#howto') && document.querySelector('meta[name=sim-id]').content === id, ID));
    const S0 = await p.evaluate(() => PX.state());
    ok('S window.PX exposes the required state', ['reaction', 'ignited', 'stage', 'Tv', 'Tp', 'dU', 'dH', 'dng', 'dngRT', 'revealed', 'whatIfOpen', 'gap'].every(k => k in S0)
      && await p.evaluate(() => ['start', 'reset', 'replay', 'pick', 'predict', 'whatIf', 'answer', 'stage', 'minLabelPx', 'speed', 'state'].every(k => typeof PX[k] === 'function') && !!PX.RUN), JSON.stringify(S0));
    ok('initial state: hydrogen, not ignited, stage 1 (observe), both waters at 298.000 K', S0.reaction === 'H' && !S0.ignited && S0.stage === 1 && S0.Tv === 298 && S0.Tp === 298);

    /* ---------------------------------------------------------------- F prediction, D selector */
    console.log('=== D, F selector and prediction');
    await p.click('#predgroup [data-pred="P"]');
    ok('F the prediction toggles (aria-pressed) and moves to stage 2', await p.evaluate(() => document.querySelector('#predgroup [data-pred="P"]').getAttribute('aria-pressed') === 'true' && PX.state().stage === 2));
    await p.click('#predgroup [data-pred="P"]');
    ok('F ...and can be cleared again', await p.evaluate(() => PX.state().prediction === null));
    await p.click('#rxgroup [data-rx="B"]');
    let s = await p.evaluate(() => PX.state());
    ok('D the reaction selector switches to butane (aria-pressed, state, band text, stage 3)', s.reaction === 'B' && s.stage === 3
      && await p.evaluate(() => document.querySelector('#rxgroup [data-rx="B"]').getAttribute('aria-pressed') === 'true' && document.getElementById('narr').textContent.indexOf('C₄H₁₀') >= 0));
    await p.click('#rxgroup [data-rx="H"]');

    /* ---------------------------------------------------------------- E, G, N, O: one run without a prediction */
    console.log('=== E, G, N, O ignite, stages, reveal');
    const samples = [];
    await p.evaluate(() => { PX.speed(4); });
    await p.click('#gobtn');
    for (let i = 0; i < 600; i++) {
      const st = await p.evaluate(() => Object.assign(PX.state(), { narr: document.getElementById('narr').textContent, val: document.getElementById('ansval').textContent, res: document.getElementById('results').textContent }));
      samples.push(st); if (st.done) break; await sleep(25);
    }
    const last = samples[samples.length - 1];
    ok('E ignite runs the experiment to the end with no prediction made (prediction never blocks)', last.done && last.ignited && last.prediction === null);
    const seq = []; samples.forEach(x => { if (seq[seq.length - 1] !== x.stage) seq.push(x.stage); });
    ok('G the stages go 4 → 10 in order (ignite, react, settle, work, calc, compare, reveal)', JSON.stringify(seq.filter(x => x >= 4)) === JSON.stringify([4, 5, 6, 7, 8, 9, 10].filter(x => seq.indexOf(x) >= 0)) && seq.indexOf(10) >= 0 && seq.indexOf(7) >= 0 && seq.indexOf(9) >= 0, seq.join(','));
    const early = samples.filter(x => x.stage < 10);
    ok('N no premature reveal: before stage 10 the target is empty and the narration never states ΔH − ΔU = Δn(g)·RT',
      early.length > 5 && early.every(x => !x.val && !x.revealed && !RELATION.test(x.narr)), early.find(x => x.val || RELATION.test(x.narr)));
    ok('N ...and the canvas results strip only fills in after the readings settle (stage ≥ 8 for ΔU/ΔH)', early.every(x => x.stage >= 8 || x.res.indexOf('ΔU =') < 0));
    const vt = await p.evaluate(() => ({ val: document.getElementById('ansval').textContent, ans: PX.answer(), narr: document.getElementById('narr').textContent }));
    ok('O the reveal: the target shows ΔH − ΔU = Δn(g)·RT = ' + vt.ans + ' kJ mol⁻¹, from the model', RELATION.test(vt.val) && vt.val.indexOf(vt.ans) >= 0 && vt.ans === '−3.72', vt.val);
    ok('O ...the narration states q(V) = ΔU, q(p) = ΔH at the reveal and names the graphite case', samples.some(x => x.stage === 10 && /q\(V\) = ΔU/.test(x.narr) && /q\(p\) = ΔH/.test(x.narr)) && /Graphite/.test(vt.narr));
    ok('O ...the what-if controls appear only now', await p.evaluate(() => !document.getElementById('wigroup').hidden) && samples.slice(0, -1).every(x => !x.whatIfOpen));

    /* ---------------------------------------------------------------- H, I, J, K, L datasets */
    console.log('=== H-L datasets');
    for (const [k, name] of [['C', 'H graphite'], ['H', 'I hydrogen'], ['B', 'J butane']]) {
      await p.evaluate(k => { PX.pick(k); PX.speed(30); PX.start(); }, k);
      await p.waitForFunction(() => PX.state().done, null, { timeout: 30000 });
      const st = await p.evaluate(() => PX.state()), e = V.expected[k];
      const fields = ['dng', 'dU', 'dH', 'gap', 'dngRT', 'qV', 'qP', 'w', 'dV', 'dTv', 'dTp'];
      const worst = Math.max.apply(null, fields.map(f => Math.abs(st[f] - e[f])));
      ok(name + ': every model quantity equals the verifier (max |diff| ' + worst.toExponential(1) + ')', worst < 1e-9);
      const tbl = { C: [0, -393.5, -393.50, 0, 1.584, 1.584], H: [-1.5, -285.8, -282.08, -3.72, 1.363, 1.381], B: [-3.5, -2658.0, -2649.33, -8.67, 1.280, 1.284] }[k];
      ok(name + ': the locked dataset (Δn_g, ΔH, ΔU, gap, ΔT sealed/piston)', st.dng === tbl[0] && near(st.dH, tbl[1], 0.05) && near(st.dU, tbl[2], 0.005) && near(st.gap, tbl[3], 0.005) && near(st.dTv, tbl[4], 0.0005) && near(st.dTp, tbl[5], 0.0005));
      ok(name + ' K: ΔH − ΔU = Δn_g·RT (|diff| < 1e-9)', Math.abs(st.gap - st.dngRT) < 1e-9);
      ok(name + ' L: the thermometers end at 298 K + ΔT, and the accessible results text carries the same ΔT', near(st.Tv, 298 + st.dTv, 1e-12) && near(st.Tp, 298 + st.dTp, 1e-12)
        && await p.evaluate(x => document.getElementById('results').textContent.indexOf(x) >= 0, (st.dTv > 0 ? '+' : '') + st.dTv.toFixed(4)));
    }
    ok('H graphite: Δn_g = 0, ΔH = ΔU, the piston does not move', await p.evaluate(() => { PX.pick('C'); return true; }) && V.expected.C.gap === 0 && V.expected.C.dV === 0);
    const tgt = await p.evaluate(() => PX.state());

    /* ---------------------------------------------------------------- M what-if */
    console.log('=== M what-if');
    await p.evaluate(() => { PX.pick('H'); PX.speed(30); PX.start(); }); await p.waitForFunction(() => PX.state().done);
    await p.click('#amtgroup [data-amt="2"]');
    s = await p.evaluate(() => PX.state());
    ok('M amount ×2: ΔT doubles, per-mole ΔU and ΔH unchanged, still not hypothetical', near(s.dTv, 2 * V.expected.H.dTv, 1e-12) && near(s.dU, V.expected.H.dU, 1e-9) && !s.hypothetical && s.scale === 2);
    await p.click('#amtgroup [data-amt="0.5"]');
    s = await p.evaluate(() => PX.state());
    ok('M amount ×½ halves ΔT', near(s.dTp, V.expected.H.dTp / 2, 1e-12));
    await p.evaluate(() => { const r = document.getElementById('in_dng'); r.value = '2'; r.dispatchEvent(new Event('input')); });
    s = await p.evaluate(() => PX.state());
    ok('M hypothetical Δn_g = +2: same ΔU, the gap becomes +2RT, the piston rises (ΔV > 0), labelled what-if',
      s.hypothetical && s.dng === 2 && near(s.dU, V.expected.H.dU, 1e-9) && near(s.gap, 2 * V.expected.RT, 1e-9) && s.dV > 0 && /what-if/.test(await p.evaluate(() => document.getElementById('dngout').textContent)));
    await p.click('#realbtn');
    s = await p.evaluate(() => PX.state());
    ok('M "Real reaction" restores the real Δn_g', !s.hypothetical && s.dng === -1.5);
    await p.click('#gobtn'); await sleep(60);
    s = await p.evaluate(() => PX.state());
    ok('M igniting again restarts the main discovery with the real reaction and amount ×1', s.state === 'running' && !s.hypothetical && s.scale === 1 && s.stage >= 4);
    ok('B no runtime errors in the whole session', errs.length === 0, errs.join(' | '));
    ok('C no network request of any kind (all non-file/data requests blocked and counted)', asked.length === 0, asked.join(' '));
    await ctx.close();

    /* ---------------------------------------------------------------- Q keyboard */
    console.log('=== Q keyboard');
    const kc = await b.newContext({ viewport: { width: 1280, height: 860 } }); const kp = await kc.newPage();
    await kp.goto(URL); await sleep(300);
    await kp.focus('#rxgroup [data-rx="C"]'); await kp.keyboard.press('Enter');
    ok('Q a reaction button works from the keyboard (Enter)', await kp.evaluate(() => PX.state().reaction === 'C'));
    await kp.evaluate(() => PX.speed(30)); await kp.focus('#gobtn'); await kp.keyboard.press('Space');
    await kp.waitForFunction(() => PX.state().done, null, { timeout: 30000 }).catch(() => {});
    ok('Q IGNITE works from the keyboard (Space) and the run completes', await kp.evaluate(() => PX.state().done));
    const focusRing = await kp.evaluate(() => { const b0 = document.getElementById('gobtn'); b0.focus(); const s0 = getComputedStyle(b0); return s0.outlineStyle !== 'none' && parseFloat(s0.outlineWidth) >= 2; });
    ok('Q a visible focus ring on the controls', focusRing);
    ok('Q every control is a native button or range input with a name', await kp.evaluate(() => [...document.querySelectorAll('#controls button, #controls input')].every(e => (e.textContent || e.getAttribute('aria-label') || document.querySelector('label[for="' + e.id + '"]')))));
    await kc.close();

    /* ---------------------------------------------------------------- target gate (N, O, R) */
    console.log('=== target display');
    const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
    for (const c of await targetChecks(b, URL, src, man.simulations.find(x => x.id === ID) || null)) ok(c.name, c.ok, c.detail);

    /* ---------------------------------------------------------------- R reduced motion */
    console.log('=== R reduced motion');
    const rc = await b.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' }); const rp = await rc.newPage();
    await rp.goto(URL); await sleep(300);
    const c0 = await rp.evaluate(() => PX.RUN.clock); await sleep(400);
    ok('R reduced motion: nothing animates on its own (the stirrer and tokens hold still)', await rp.evaluate(c => PX.RUN.clock === c, c0));
    await rp.evaluate(() => PX.start()); await sleep(100);
    ok('R ...IGNITE goes straight to the measured result and the reveal', await rp.evaluate(() => PX.state().done && PX.state().revealed && document.getElementById('ansval').textContent.length > 0));
    await rc.close();

    /* ---------------------------------------------------------------- T determinism with the recorder's manual clock */
    console.log('=== T determinism');
    async function film() {
      const c = await b.newContext({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 1 }); await c.addInitScript(CLOCK);
      const q = await c.newPage(); await q.goto(URL);
      for (let i = 0; i < 5; i++) await q.evaluate(() => __pxClock.step(1000 / 30));
      await q.evaluate(() => PX.start());
      const frames = [], states = [];
      for (let f = 0; f < 30 * 22; f++) {
        await q.evaluate(() => __pxClock.step(1000 / 30));
        if (f % 45 === 0) { frames.push(crypto.createHash('sha256').update(await q.evaluate(() => document.getElementById('labcv').toDataURL())).digest('hex').slice(0, 16));
          states.push(await q.evaluate(() => { const s = PX.state(); return [s.stage, s.Tv.toFixed(6), s.Tp.toFixed(6), s.extent.toFixed(6)].join('|'); })); }
        if (await q.evaluate(() => PX.state().done)) break;
      }
      const fin = await q.evaluate(() => PX.state()); await c.close();
      return { frames, states, fin };
    }
    const f1 = await film(), f2 = await film();
    ok('T the run completes under the recorder\'s manual clock', f1.fin.done && f2.fin.done);
    ok('T two recordings give identical states at every sampled frame (' + f1.states.length + ')', JSON.stringify(f1.states) === JSON.stringify(f2.states));
    ok('T ...and identical canvas pixels (sha-256 of ' + f1.frames.length + ' frames)', JSON.stringify(f1.frames) === JSON.stringify(f2.frames));
    ok('T the script uses no Math.random, setInterval or wall-clock Date for animation', !/Math\.random|setInterval\(|new Date\(/.test(src.slice(src.indexOf('<script'))));

    /* ---------------------------------------------------------------- P phones + measured visual gates */
    console.log('=== P phones and visual gates');
    for (const vw of [390, 360]) {
      const pc = await b.newContext({ viewport: { width: vw, height: 844 }, isMobile: true, hasTouch: true }); const pp = await pc.newPage();
      await pp.goto(URL); await sleep(300); await pp.evaluate(() => { PX.speed(30); PX.start(); }); await pp.waitForFunction(() => PX.state().done);
      await pp.evaluate(() => { PX.whatIf('dng', 2); });
      const m = await pp.evaluate(() => ({ over: document.documentElement.scrollWidth > window.innerWidth, minPx: PX.minLabelPx(), cw: document.getElementById('labcv').width,
        taps: Math.min.apply(null, [...document.querySelectorAll('#controls button, #controls input')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect().height)) }));
      ok('P ' + vw + ' px: no horizontal overflow, portrait canvas, taps ≥ 44 px, labels ≥ 11 px on screen', !m.over && m.cw === 720 && m.taps >= 44 && m.minPx * vw / 720 >= 11 * 0.97, JSON.stringify(m));
      await pc.close();
    }
    const gr = await gates(FILE);
    for (const r of gr) if (r.status !== 'MANUAL') ok('gate ' + r.gate + ': ' + r.name + ' (' + r.status + ')', r.status === 'PASS', r.detail);

    /* ---------------------------------------------------------------- registration */
    console.log('=== registration');
    const e = man.simulations.find(x => x.id === ID), meta = JSON.parse(fs.readFileSync(ROOT + '/' + REL + 'meta.json', 'utf8'));
    ok('the page is registered as a published (script_verified) concept, byte-identical to meta.json', !!e && e.status === 'script_verified' && e.kind === 'concept' && JSON.stringify(e) === JSON.stringify(meta));
    const chap = JSON.parse(fs.readFileSync(ROOT + '/data/ncert/chapters/NCERT-11-CHE-P1-CH05.json', 'utf8')).sections;
    ok('the NCERT chapter maps it under understand in 5.2.2 and 5.3 (its source sections), and nowhere as planned',
       chap.filter(s => (s.understand || []).indexOf(ID) >= 0).map(s => s.id).join() === '5.2.2,5.3' && !chap.some(s => (s.planned || []).indexOf(ID) >= 0));
    const exp = JSON.parse(fs.readFileSync(ROOT + '/data/ncert/experiences/NCERT-11-CHE-P1-CH05.json', 'utf8')).experiences.filter(x => x.libraryId === ID);
    ok('three experience records (calorimetry primary, ΔH–ΔU, heat sign) point to this page', exp.length === 3 && exp[0].id === 'EXP-CHE-TWO-CALORIMETERS' && exp[0].conceptId === 'CPT-CHE-CALORIMETRY');
    ok('the page declares no visual asset (XP-09 tests the no-asset path)', !/name=["']px-visual-asset["']/.test(src));
    ok('the page is self-contained: no external script, stylesheet, image or fetch', !/<script[^>]+src=|<link[^>]+stylesheet|fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB/.test(src) && !/(src|href)=["']https?:/.test(src.replace(/https:\/\/ncert\.nic\.in[^"']*/g, '')));
    ok('ES5 only in the script (no let/const/arrow/template literals)', !/(^|[^\w.$])(let|const|class)\s|=>|`/.test(src.slice(src.indexOf('<script'), src.lastIndexOf('</script>'))));
  } catch (err) {
    ok('suite ran to the end', false, err && err.stack);
  } finally {
    await b.close();
  }
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  process.exit(bad ? 1 : 0);
})();
