/* PrayogX Experience Kit - shared contract checks for any page built on the kit (Phase 1).

   const C = require('./contracts');
   for (const r of await C.all(browser, '/abs/path/index.html', options)) ok(r.name, r.ok, r.detail);

   Every check runs the page under the recorder's manual clock (requestAnimationFrame, performance.now and
   Date.now replaced), so results are frame-exact. The page contract they rely on:
     window.PX: start(), reset(), state() {phase, stage, obs, obs_*, mark, shot, done, dirError}, obs(id), next(),
                doNext(), snapshot(), texts(), emitted(), log(), replay(entries), anchors(), RUN.done,
                kit {OBS, ACT, DIR, CAM, SCRIPT, GUIDES}
     #labcv the experience canvas; elements holding scientific text carry data-sci
     #nextbtn the guide's NEXT button and #stickybtn the sticky next-action button (ACT.syncNextUI) - the 390 px
              learner-flow check needs one of them on screen without scrolling
     the default film moves the camera at least once (CAM.go through a shot step)
     ENGINE between ENGINE-BEGIN / ENGINE-END; drawing code between PRESENT-BEGIN / PRESENT-END            */
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');

const CLOCK = () => {
  let now = 0, q = [];
  window.__pxClock = { step(ms) { now += ms; const run = q; q = []; run.forEach(f => { try { f(now); } catch (e) { console.error(e); } }); return now; } };
  window.requestAnimationFrame = f => { q.push(f); return q.length; }; window.cancelAnimationFrame = () => {};
  performance.now = () => now; const d0 = Date.now(); Date.now = () => d0 + now;
};
const url = file => 'file://' + file.split('/').map(encodeURIComponent).join('/');
async function open(b, file, vp) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 1000, height: 900 } }, vp || {}));
  await ctx.addInitScript(CLOCK);
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(url(file));
  await frames(p, 2);
  return { ctx, p, errors };
}
const frames = (p, n, fps) => p.evaluate(([k, ms]) => { for (let i = 0; i < k; i++) __pxClock.step(ms); }, [n, 1000 / (fps || 30)]);
const digest = s => crypto.createHash('sha256').update(typeof s === 'string' ? s : JSON.stringify(s)).digest('hex').slice(0, 16);

/* ---------- static: ENGINE constants and the presentation lint ---------- */
function engineBlock(src) { const m = /\/\* ENGINE-BEGIN \*\/([\s\S]*?)\/\* ENGINE-END \*\//.exec(src); return m ? m[1] : null; }
function engineConstants(src) {
  const block = engineBlock(src); if (!block) return null;
  const ctx = { Math }; vm.createContext(ctx); vm.runInContext(block + '\n;this.__E = ENGINE;', ctx);
  const out = {}; for (const k in ctx.__E) if (typeof ctx.__E[k] === 'number') out[k] = ctx.__E[k];
  return out;
}
/* inside PRESENT-BEGIN..END: no reference to ENGINE, and no non-integer literal equal to an ENGINE constant.
   Integer literals are not checked: they collide with layout and colour (rgb 150 vs a 150 W heater), and a
   displayed integer is caught at run time by the provenance check, which is the real guarantee. */
function lintPresentation(src) {
  const consts = engineConstants(src) || {}, out = [];
  const re = /\/\* PRESENT-BEGIN \*\/([\s\S]*?)\/\* PRESENT-END \*\//g; let m, any = false;
  while ((m = re.exec(src))) {
    any = true;
    const code = m[1].replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/\/\*[\s\S]*?\*\//g, '');
    if (/\bENGINE\./.test(code)) out.push('presentation code reads ENGINE directly');
    const lits = code.match(/(?<![\w.])\d+\.\d+/g) || [];
    for (const l of lits) for (const k in consts) if (Number(l) === consts[k] && !Number.isInteger(consts[k])) out.push('presentation literal ' + l + ' duplicates ENGINE.' + k);
  }
  if (!any) out.push('no PRESENT-BEGIN / PRESENT-END region');
  return out;
}

/* ---------- number provenance: every scientific numeric claim comes from an observable this frame ----------
   Each "sci" text must be explained by its OWN observable strings (the f/num/fp output printed for it, which
   OBS.shown records as `from`): remove those strings, and no digit may remain. A number that merely equals a
   value printed elsewhere in the frame does not count. Every visible [data-sci] element must hold a text that
   was recorded as "sci" this frame. Chemical formulas use subscript glyphs (H₂O), which are not digits. */
async function provenance(p) {
  return p.evaluate(() => {
    const bad = [], sci = PX.texts().filter(x => x.kind === 'sci'), texts = new Set(sci.map(x => x.text));
    sci.forEach(x => {
      let rest = x.text;
      (x.from || []).slice().sort((a, b) => b.length - a.length).forEach(s => { rest = rest.split(s).join(' '); });
      const left = rest.match(/\d+(?:\.\d+)?/g);
      if (left) bad.push(left.join(',') + ' in "' + x.text.slice(0, 80) + '"');
    });
    document.querySelectorAll('[data-sci]').forEach(el => {
      if (el.offsetParent !== null && /\d/.test(el.textContent) && !texts.has(el.textContent)) bad.push('#' + el.id + ' shows text not recorded as scientific: "' + el.textContent.slice(0, 80) + '"');
    });
    return { bad, checked: sci.length };
  });
}

/* ---------- the checks ---------- */
async function all(b, file, o) {
  o = o || {}; const res = [], add = (name, ok, detail) => res.push({ name, ok: !!ok, detail });
  const src = fs.readFileSync(file, 'utf8');

  /* 1 observable schema */
  {
    const { ctx, p, errors } = await open(b, file);
    const r = await p.evaluate(() => {
      const O = PX.kit.OBS, ids = O.ids(), st = PX.state(), metas = ids.map(id => O.meta(id));
      return { ids, metas, stateKeys: Object.keys(st.obs || {}), flat: ids.every(id => ('obs_' + id.replace(/\./g, '_')) in st), statuses: ["measured", "calculated", "illustrative", "idealized", "hypothetical", "exaggerated"] };
    });
    add('observables: every one has a unit, a meaning and a known status', r.metas.every(m => typeof m.unit === 'string' && m.meaning && r.statuses.indexOf(m.status) >= 0), r.metas);
    add('observables: every signed observable states its sign convention once', r.metas.every(m => !m.signed || !!m.sign));
    add('observables: PX.state().obs holds exactly the defined observables', JSON.stringify(r.stateKeys) === JSON.stringify(r.ids));
    add('observables: PX.state() also has the flat obs_* fields the recorder keeps', r.flat);
    add('observables: a duplicate id is refused', await p.evaluate(id => { try { PX.kit.OBS.def(id, { unit: '', meaning: 'x', status: 'calculated', from: () => 0 }); return false; } catch (e) { return /duplicate/.test(e.message); } }, r.ids[0]));
    add('page: no errors on load', errors.length === 0, errors);
    await ctx.close();
  }

  /* 2 scientific number provenance, at every scene of the default film, plus a negative control */
  {
    const { ctx, p } = await open(b, file);
    await p.evaluate(() => PX.start());
    const seen = []; let worst = [];
    for (let i = 0; i < (o.maxFrames || 900); i++) {
      await frames(p, 1);
      if (i % 10 === 0) { const r = await provenance(p); seen.push(r.checked); if (r.bad.length) worst = worst.concat(r.bad); }
      if (await p.evaluate(() => PX.RUN.done || !!PX.state().dirError)) break;
    }
    const end = await provenance(p);
    add('provenance: every scientific number shown during the film came from an observable (' + seen.length + ' samples)', worst.length === 0 && end.bad.length === 0, worst.concat(end.bad).slice(0, 6));
    const neg = await p.evaluate(() => {
      const O = PX.kit.OBS, out = {};
      const probe = () => { const L = O.shownList(); const x = L[L.length - 1]; let r = x.text; x.from.forEach(s => { r = r.split(s).join(' '); }); return /\d/.test(r); };
      O.shown('the value is 99.9', 'sci'); out.typed = probe();
      const elsewhere = O.emitted()[0]; O.shown('the value is ' + elsewhere, 'sci'); out.coincidence = probe(); out.value = elsewhere;
      O.shown('the value is ' + O.f(O.ids()[0]), 'sci'); out.honest = !probe();
      return out;
    });
    add('provenance: a number typed by hand into scientific text is caught (negative control)', neg.typed);
    add('provenance: a typed number equal to a value printed elsewhere this frame is still caught (negative control, ' + neg.value + ')', neg.coincidence, neg);
    add('provenance: the same text built from its own observable passes', neg.honest, neg);
    const plantedText = 'The value rose by 1.25.';
    const hasSci = await p.evaluate(t => { const el = [...document.querySelectorAll('[data-sci]')].find(e => e.offsetParent !== null); if (el) el.textContent = t; return !!el; }, plantedText);
    const dom = hasSci ? await provenance(p) : { bad: [] };
    add('provenance: a [data-sci] element whose text was not recorded as scientific is caught (negative control' + (hasSci ? ')' : '; not applicable, no visible [data-sci] element)'), !hasSci || dom.bad.some(x => x.indexOf(plantedText) >= 0), dom.bad);
    add('provenance: UI and decor numbers (step counters, scale ticks) are not flagged', await p.evaluate(() => PX.texts().some(t => t.kind !== 'sci' && /\d/.test(t.text))));
    const lint = lintPresentation(src);
    add('provenance: presentation code has no ENGINE reads or copied model constants', lint.length === 0, lint);
    /* plant a read of the page's own ENGINE and, if it has one, a copy of its first non-integer constant */
    const consts = engineConstants(src) || {}, key = Object.keys(consts).find(k => !Number.isInteger(consts[k])) || Object.keys(consts)[0];
    const copy = key !== undefined && !Number.isInteger(consts[key]);
    const planted = src.replace('/* PRESENT-END */', 'var bad = ' + (copy ? consts[key] + ' * ' : '') + 'ENGINE.' + (key || 'run') + ';\n/* PRESENT-END */');
    add('provenance: the presentation lint catches a planted ENGINE read' + (copy ? ' and a copied model constant' : '') + ' (negative control)', lintPresentation(planted).length >= (copy ? 2 : 1), lintPresentation(planted));
    await ctx.close();
  }

  /* 3 + 4 action graph and learning script */
  {
    const { ctx, p } = await open(b, file);
    const v = await p.evaluate(() => PX.kit.ACT.validate(PX.kit.GUIDES));
    add('script: validates against the defined actions, predicates and guides', v.length === 0, v);
    await p.evaluate(() => PX.reset());
    const s0 = await p.evaluate(() => PX.state().stage); await frames(p, 300);
    add('script: nothing advances on its own (10 s without an action)', (await p.evaluate(() => PX.state().stage)) === s0);
    /* o.answers: [{ scene, id, args }] - a scene where NEXT deliberately cannot go on (a prediction): the walk
       gives the learner's answer through the same action pathway, once, then follows next() again */
    const walk = await p.evaluate((answers) => {
      const ids = PX.kit.SCRIPT.scenes.map(s => s.id), visited = [ids[0]], steps = []; let unexpected = 0, idleFrames = 0;
      const given = {};
      for (let i = 0; i < 4000; i++) {
        const before = PX.state().phase, n = PX.next();
        if (n) { const r = PX.doNext(); steps.push(n.id); idleFrames = 0; if (!r.ok) return { err: 'next() offered ' + n.id + ' but do() refused: ' + r.reason }; }
        else {
          const ans = answers.find(x => x.scene === before && !given[x.scene + x.id + x.args]);
          if (ans && !PX.state().busy) { given[ans.scene + ans.id + ans.args] = 1; const r = PX.act(ans.id, ans.args); if (!r.ok) return { err: 'the answer ' + ans.id + ' was refused: ' + r.reason }; idleFrames = 0; continue; }
          __pxClock.step(1000 / 30); idleFrames++; if (PX.state().phase !== before) unexpected++;
        }
        const ph = PX.state().phase; if (visited[visited.length - 1] !== ph) visited.push(ph);
        if (!n && !PX.state().busy && PX.kit.ACT.scene() === PX.kit.SCRIPT.scenes[ids.length - 1] && !PX.next() && idleFrames > 30) break;
        if (idleFrames > 600) return { err: 'dead end in scene ' + ph };
      }
      return { visited, steps, unexpected, ids };
    }, o.answers || []);
    add('action graph: following next() from reset reaches every scene in order', !walk.err && JSON.stringify(walk.visited) === JSON.stringify(walk.ids), walk.err || walk.visited);
    add('action graph: no dead ends, and every exit condition was satisfied', !walk.err && walk.steps.filter(s => s === 'advance').length === walk.ids.length - 1, walk.steps);
    add('action graph: scenes changed only through the advance action', !walk.err && walk.unexpected === 0);
    const again = await (async () => { const { ctx: c2, p: p2 } = await open(b, file); const r = await p2.evaluate(() => { PX.reset(); const out = []; for (let i = 0; i < 4000 && out.length < 40; i++) { const n = PX.next(); if (n) { PX.doNext(); out.push(n.id + '@' + PX.kit.CLOCK.frame); } else __pxClock.step(1000 / 30); } return out; }); await c2.close(); return r; })();
    const once = await p.evaluate(() => { PX.reset(); const out = []; for (let i = 0; i < 4000 && out.length < 40; i++) { const n = PX.next(); if (n) { PX.doNext(); out.push(n.id + '@' + PX.kit.CLOCK.frame); } else __pxClock.step(1000 / 30); } return out; });
    add('action graph: the same walk twice gives the same actions at the same frames', JSON.stringify(once) === JSON.stringify(again) && once.length > 0, [once, again]);
    await ctx.close();
  }

  /* 5 Director: determinism, validation, learner waits and hints */
  {
    const film = async () => {
      const { ctx, p } = await open(b, file); await p.evaluate(() => PX.start()); const trace = [];
      for (let i = 0; i < (o.maxFrames || 900); i++) {
        await frames(p, 1);
        trace.push(await p.evaluate(() => { const s = PX.state(); return [s.phase, s.mark, s.shot, s.t.toFixed(6), JSON.stringify(s.obs)].join('|'); }));
        if (i % 30 === 0) trace.push(digest(await p.evaluate(() => document.getElementById('labcv').toDataURL())));
        if (await p.evaluate(() => PX.RUN.done || !!PX.state().dirError)) break;
      }
      const end = await p.evaluate(() => PX.state()); await ctx.close(); return { trace, end };
    };
    const f1 = await film(), f2 = await film();
    add('Director: the default film runs to the end with every wait resolved', f1.end.done && !f1.end.dirError, f1.end.dirError);
    add('Director: the same film twice gives identical states, observables and pixels (' + f1.trace.length + ' samples)', JSON.stringify(f1.trace) === JSON.stringify(f2.trace));
    const { ctx, p } = await open(b, file);
    const r = await p.evaluate(() => { PX.reset(); const ids = PX.kit.SCRIPT.scenes[PX.kit.SCRIPT.scenes.length - 1].allow; const sci = () => { const s = PX.state(); return JSON.stringify([s.phase, s.obs, PX.snapshot().S.flags, PX.log().length]); }, before = sci();
      PX.kit.DIR.load('__bad', [{ 'do': ids[0] }, { end: true }]); PX.kit.DIR.play('__bad', 'media'); __pxClock.step(33); return { err: PX.state().dirError, same: sci() === before }; });
    add('Director: it cannot bypass action validation (a disallowed action stops the film, state unchanged)', /refused/.test(r.err || '') && r.same, r);
    add('Director: a string expression is never evaluated - it stops the film as an unknown predicate and the frame loop keeps running', await p.evaluate(() => { try { PX.kit.DIR.load('__s', [{ wait: { pred: 'PX.state().t > 1' } }]); PX.kit.DIR.play('__s', 'media'); __pxClock.step(33); const f = PX.kit.CLOCK.frame; __pxClock.step(33); __pxClock.step(33); return /unknown predicate/.test(PX.state().dirError || '') && PX.kit.CLOCK.frame === f + 2; } catch (e) { return true; } }));
    if (o.lesson) {
      await p.evaluate(m => PX.lesson(m), 'learner');
      await frames(p, Math.round((o.lesson.hintAfter + 0.5) * 30));
      const hinted = await p.evaluate(() => PX.state().hint);
      add('Director: in learner mode it waits for the learner and shows the hint after the timeout', !!hinted && !(await p.evaluate(() => PX.RUN.done)), hinted);
      for (const sel of o.lesson.clicks) { await p.click(sel, { timeout: 5000 }); await frames(p, 60); }
      await frames(p, o.lesson.finishFrames || 400);
      const end = await p.evaluate(() => { const s = PX.state(); return { done: s.done, dirError: s.dirError }; });
      add('Director: after the learner acts, the lesson completes (done, no Director error)', end.done === true && !end.dirError, end);
    }
    await ctx.close();
  }

  /* 6 replay: a learner session replayed from its log reproduces the state */
  {
    const session = async (log) => {
      const { ctx, p } = await open(b, file);
      if (log) await p.evaluate(l => PX.replay(l), log); else await p.evaluate(() => PX.reset());
      for (let i = 0; i < 520; i++) {
        if (!log && o.session && o.session[i]) for (const sel of o.session[i]) await p.click(sel);
        await frames(p, 1);
      }
      const out = { snap: await p.evaluate(() => PX.snapshot()), log: await p.evaluate(() => PX.log()) }; await ctx.close(); return out;
    };
    const live = await session(null), rep = await session(live.log);
    add('replay: the session log has learner actions', live.log.filter(e => e.source === 'learner').length >= 2, live.log);
    add('replay: replaying the log gives the identical snapshot (state, observables, camera, time)', JSON.stringify(live.snap) === JSON.stringify(rep.snap), [live.snap.S, rep.snap.S]);
  }

  /* 7 camera: tall variants on phones, anchors on screen, a drag cancels a scripted move */
  {
    for (const vp of [{ viewport: { width: 1280, height: 900 } }, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]) {
      const { ctx, p } = await open(b, file, vp); const w = vp.viewport.width;
      await p.evaluate(() => PX.start()); let off = [];
      for (let i = 0; i < (o.maxFrames || 900); i++) {
        await frames(p, 1);
        if (i % 15 === 0) { const a = await p.evaluate(() => { const c = document.getElementById('labcv'); return { a: PX.anchors(), W: c.width, H: c.height, busy: PX.kit.CAM.flying() }; });
          if (!a.busy) for (const k in a.a) { const q = a.a[k]; if (!(q.x >= 0 && q.x <= a.W && q.y >= 0 && q.y <= a.H)) off.push(k + '@' + i); } }
        if (await p.evaluate(() => PX.RUN.done)) break;
      }
      add('camera (' + w + ' px): every anchor stays inside the canvas while the camera is settled', off.length === 0, off.slice(0, 5));
      if (w < 600) add('camera (390 px): portrait screens use the tall shot', await p.evaluate(() => { const v = PX.kit.CAM.view(), t = PX.kit.CAM.resolve(v.shot); return Math.abs(v.fov - t.fov) < 1e-9 && t.fov > 0.7; }));
      await ctx.close();
    }
    /* the page's own default film supplies the scripted move: catch it mid-flight, then drag */
    const { ctx, p } = await open(b, file);
    const r = await p.evaluate(n => { PX.start(); const C = PX.kit.CAM; let i = 0; while (i++ < n && !C.flying() && !PX.RUN.done) __pxClock.step(1000 / 30);
      if (!C.flying()) return { moved: false }; __pxClock.step(1000 / 30); const at = C.view().at.join(); C.user(0.2, 0); __pxClock.step(300); return { moved: true, flying: C.flying(), same: C.view().at.join() === at }; }, o.maxFrames || 900);
    add('camera: a user drag cancels the scripted move where it is (a move from the default film)', r.moved && !r.flying && r.same, r);
    await ctx.close();
  }

  /* 8 390 px: no overflow, taps, and the next action reachable without scrolling */
  {
    const { ctx, p } = await open(b, file, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await p.evaluate(() => { PX.reset(); document.getElementById('labcv').scrollIntoView({ block: 'start' }); }); await frames(p, 2);
    const r = await p.evaluate(() => {
      const vis = e => e && !e.hidden && e.offsetParent !== null, inView = e => { const q = e.getBoundingClientRect(); return q.top >= 0 && q.bottom <= innerHeight; };
      const nb = document.getElementById('nextbtn'), sb = document.getElementById('stickybtn');
      const taps = [...document.querySelectorAll('button')].filter(vis).map(e => e.getBoundingClientRect().height);
      return { over: document.documentElement.scrollWidth - innerWidth, reach: (vis(nb) && inView(nb)) || (vis(sb) && inView(sb)), minTap: Math.min.apply(null, taps) };
    });
    add('390 px: no horizontal overflow', r.over <= 0, r.over);
    add('390 px: the next action is reachable without scrolling (NEXT button or sticky button)', r.reach);
    add('390 px: every visible button is at least 44 px tall', r.minTap >= 44, r.minTap);
    await ctx.close();
  }

  /* 9 recorder: the real recorder.js, twice */
  if (o.recorder !== false) {
    const { record } = require(path.join(o.root, 'tools', 'reel-maker', 'recorder.js'));
    const spec = { fps: 30, record: { viewport: { width: 390, height: 844, deviceScaleFactor: 2 }, maxSeconds: 40, tailSeconds: 0.5 } };
    const tmp = n => fs.mkdtempSync(path.join(require('os').tmpdir(), 'pxkit-rec-' + n + '-'));
    const d1 = tmp('a'), d2 = tmp('b');
    const r1 = await record(spec, file, d1), r2 = await record(spec, file, d2);
    const strip = f => f.frames.map(x => { const y = Object.assign({}, x); delete y.file; return y; });
    const pix = d => fs.readdirSync(path.join(d, 'footage')).sort().map(f => digest(fs.readFileSync(path.join(d, 'footage', f)).toString('base64')));
    const fr = r1.footage.frames, last = fr[fr.length - 1];
    add('recorder: the existing recorder.js records the page to done (' + fr.length + ' frames)', r1.footage.doneAt >= 0 && r1.footage.pageErrors.length === 0, r1.footage.pageErrors);
    add('recorder: footage.json carries observables (obs_*), marks and shots', Object.keys(last).some(k => k.indexOf('obs_') === 0) && 'mark' in last && 'shot' in last, Object.keys(last));
    add('recorder: two recordings give identical per-frame state and observables', JSON.stringify(strip(r1.footage)) === JSON.stringify(strip(r2.footage)));
    add('recorder: two recordings give identical pixels', JSON.stringify(pix(d1)) === JSON.stringify(pix(d2)));
    for (const d of [d1, d2]) fs.rmSync(d, { recursive: true, force: true });
  }
  return res;
}

module.exports = { all, lintPresentation, engineConstants, provenance, open, frames, CLOCK };
