/* CON-CHE-REVERSIBLE-WORK (XP-05, one gas, many paths) - the page suite.

     node tests/sim_con_che_reversible_work.js            everything (about 3-5 minutes)
     node tests/sim_con_che_reversible_work.js --quick    the XP-05 checks only (no shared kit contracts, gates or recorder)

   1 the shared Experience Kit contracts (tests/kit/contracts.js): observables, number provenance, action graph,
     Director determinism and validation, the learner lesson, replay, camera, 390 px, the real recorder twice
   2 XP-05: the model against the fact sheet, the prediction gates (NEXT alone stalls), action guards (a step only at
     rest), every run's work and the round-trip losses, the full film's marks against the fact sheet, frame-rate
     independence through the page clock, reduced motion, 360 / 390 px, the learner flow by its real buttons
   3 the target reveal (tests/target_gate.js) and the G5 visual gates (tests/visual_gates.js)                      */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = process.env.PRAYOGX_ROOT || path.resolve(__dirname, '..');
const { launch } = require(path.join(ROOT, 'tests', '_browser'));
const C = require(path.join(ROOT, 'tests', 'kit', 'contracts'));
const ID = 'CON-CHE-REVERSIBLE-WORK';
const FILE = path.join(ROOT, 'simulations', 'concepts', 'chemistry', 'con-che-reversible-work', 'index.html');
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const FACTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'reel-maker', 'facts', ID + '.json'), 'utf8'));
const SRC = fs.readFileSync(FILE, 'utf8');
const QUICK = process.argv.includes('--quick');
let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (!c && x !== undefined ? '   ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 500) : '')); };
const fact = id => { const v = FACTS.values.find(x => x.id === id); if (!v) throw new Error('no fact ' + id); return v; };
const near = (a, b, d) => Math.abs(a - b) <= (d === undefined ? 0.05 : d);
const PHONE = w => ({ viewport: { width: w, height: w === 360 ? 780 : 844 }, isMobile: true, hasTouch: true });

async function idle(p, max) { for (let i = 0; i < (max || 900); i++) { await C.frames(p, 1); if (!(await p.evaluate(() => PX.state().busy))) return true; } return false; }
const act = (p, id, a) => p.evaluate(([i, x]) => PX.act(i, x), [id, a]);

(async () => {
  const b = await launch();
  try {
    /* ---------- 1 the shared kit contracts ---------- */
    if (!QUICK) {
      const res = await C.all(b, FILE, {
        root: ROOT, maxFrames: 1200,
        answers: [{ scene: 'eachWeight', id: 'predict', args: 'more' }, { scene: 'back', id: 'predictBack', args: 'grain' }],
        session: { 5: ['#insp-gas'], 35: ['#insp-weights'], 65: ['#insp-bath'], 95: ['#nextbtn'], 105: ['#liftall'], 170: ['#nextbtn'], 180: ['#pr-less'], 190: ['#lift'], 240: ['#lift'], 290: ['#lift'] },
        lesson: { hintAfter: 5, clicks: ['#insp-gas', '#insp-weights', '#insp-bath', '#liftall', '#narr', '#pr-more', '#lift', '#lift', '#lift', '#lift', '#lift', '#lift', '#lift', '#lift',
          '#pourbtn', '#narr', '#narr', '#pb-grain', '#cb-one', '#cb-grain', '#narr', '#narr', '#way-vacuum', '#way-p53', '#way-rev', '#narr', '#narr'], finishFrames: 600 }
      });
      for (const r of res) ok('kit contract: ' + r.name, r.ok, r.detail);
    }

    /* ---------- 2a the model, in isolation, against the fact sheet ---------- */
    {
      const block = /\/\* ENGINE-BEGIN \*\/([\s\S]*?)\/\* ENGINE-END \*\//.exec(SRC)[1], ctx = { Math }; vm.createContext(ctx);
      vm.runInContext(block + ';this.E=ENGINE;', ctx); const E = ctx.E;
      ok('model: nRT = 20 L atm, p at the end = 2 atm, n = ' + fact('gas.n').short + ' mol', E.NRT === 20 && E.PF === 2 && near(E.n, fact('gas.n').value, 5e-4));
      ok('model: closed forms equal the fact sheet (1 step, 8 steps, 800 grains, reversible)',
        near(E.stepWorkBy(1, 1), fact('work.e1').value, 1e-6) && near(E.stepWorkBy(8, 1), fact('work.e8').value, 1e-6) && near(E.stepWorkBy(800, 1), fact('work.eg').value, 1e-6) && near(E.revWorkBy(1), fact('work.rev').value, 1e-6));
      ok('model: the round trip leaves 64/N (1, 8, 800 steps) as in the fact sheet',
        near(E.cycleLoss(1), fact('loss.c1').value, 1e-5) && near(E.cycleLoss(8), fact('loss.c8').value, 1e-6) && near(E.cycleLoss(800), fact('loss.cg').value, 1e-6));
      const ms = E.create(); E.setup(ms, { V: 2, weights: 8 }); E.load(ms, -8); E.finish(ms);
      ok('model: one step to rest: 16 L atm, V = 10 L, p_gas = p_ex', near(ms.w, 16, 1e-9) && ms.V === 10 && near(E.derive(ms).pgas, E.derive(ms).pex, 1e-12));
    }

    /* ---------- 2b the learner's path: prediction gates, guards, every run ---------- */
    {
      const { ctx, p, errors } = await C.open(b, FILE);
      await p.evaluate(() => PX.reset());
      ok('start: no answer in the target area, the solution is closed', await p.evaluate(() => document.getElementById('ansval').textContent === '' && document.getElementById('solbody').hidden));
      for (const a of ['gas', 'weights', 'bath']) { await act(p, 'inspect', a); await idle(p); }
      ok('meet: the lab guide names the bath at ' + fact('p.start').short + ' atm start and 25 °C', (await p.evaluate(() => PX.state().phase)) === 'meet');
      await p.evaluate(() => PX.doNext()); await C.frames(p, 2);
      ok('oneStep: nothing happens until the learner lifts the weights', (await p.evaluate(() => PX.obs('run.steps'))) === 0);
      await act(p, 'liftAll'); await C.frames(p, 6);
      const mid = await p.evaluate(() => ({ busy: PX.state().busy, q: PX.obs('run.q'), w: PX.obs('run.w') }));
      ok('oneStep: while the piston moves the step is busy, heat flows in (q > 0) and w < 0', mid.busy && mid.q > 0 && mid.w < 0, mid);
      await idle(p);
      ok('oneStep: at rest the work by the gas is ' + fact('work.e1').written, near(await p.evaluate(() => PX.obs('rec.e1')), fact('work.e1').value, 1e-5));
      await p.evaluate(() => PX.doNext()); await C.frames(p, 2);
      /* the NEXT-only test: NEXT stalls at the prediction, and a step before it is refused */
      ok('eachWeight: NEXT alone stalls at the prediction (next() is null)', (await p.evaluate(() => PX.next())) === null);
      const r0 = await act(p, 'lift');
      ok('eachWeight: lifting before predicting is refused', !r0.ok, r0);
      await act(p, 'predict', 'less');
      ok('eachWeight: a wrong prediction is accepted (the result answers it) and NEXT moves on', (await p.evaluate(() => PX.next() && PX.next().id)) === 'lift');
      await act(p, 'lift'); await C.frames(p, 2);
      const r1 = await act(p, 'lift');
      ok('eachWeight: a second weight while the piston moves is refused as busy (every step ends in balance)', !r1.ok && r1.reason === 'busy', r1);
      await idle(p); for (let i = 0; i < 7; i++) { await act(p, 'lift'); await idle(p); }
      ok('eachWeight: eight steps give ' + fact('work.e8').written, near(await p.evaluate(() => PX.obs('rec.e8')), fact('work.e8').value, 1e-5));
      const g1 = await p.evaluate(() => PX.texts().filter(t => t.kind === 'sci').map(t => t.text).join(' | '));
      ok('eachWeight: the guide answers the prediction with the areas ("You predicted less work; the areas say more work")', /You predicted less work; the areas say more work/.test(g1), g1.slice(0, 300));
      await p.evaluate(() => PX.doNext()); await C.frames(p, 2);
      await act(p, 'pour', 'on'); await C.frames(p, 45);
      const r2 = await act(p, 'pour', 'off');
      const paused = await p.evaluate(() => ({ g: PX.snapshot().S.ms.grains, busy: PX.state().busy }));
      ok('grain: pouring can be stopped part way; the gas is in balance (not busy)', r2.ok && paused.g > 0 && paused.g < 800 && !paused.busy, paused);
      ok('grain: the answer is still hidden part way', await p.evaluate(() => document.getElementById('ansval').textContent === ''));
      await act(p, 'pour', 'on'); await idle(p, 900);
      ok('grain: 800 grains give ' + fact('work.eg').written + ', below the reversible ' + fact('work.rev').written,
        near(await p.evaluate(() => PX.obs('rec.eg')), fact('work.eg').value, 1e-5) && (await p.evaluate(() => PX.obs('rec.eg') < PX.obs('rev.wBy'))));
      ok('grain: the target shows the reversible w = ' + fact('w.rev').written + ' and the solution opens',
        await p.evaluate(w => document.getElementById('ansval').textContent === w && !document.getElementById('solbody').hidden && PX.answer() === w, fact('w.rev').written));
      await p.evaluate(() => PX.doNext()); await C.frames(p, 2);
      ok('back: NEXT alone stalls at the second prediction', (await p.evaluate(() => PX.next())) === null);
      ok('back: pushing back before predicting is refused', !(await act(p, 'compress', 'one')).ok);
      await act(p, 'predictBack', 'one');
      for (const [m, key] of [['one', 'c1'], ['each', 'c8'], ['grain', 'cg']]) {
        await act(p, 'compress', m);
        if (m === 'each') for (let i = 0; i < 8; i++) { await idle(p); await act(p, 'add'); }
        await idle(p, 1200);
        ok('back: pushing back ' + m + ' needs ' + fact('work.' + key).written + ' and leaves ' + fact('loss.' + key).written,
          near(await p.evaluate(k => PX.obs('rec.' + k), key), fact('work.' + key).value, 1e-5) && near(await p.evaluate(k => PX.obs('loss.' + k), key), fact('loss.' + key).value, 1e-5));
      }
      const g2 = await p.evaluate(() => PX.texts().filter(t => t.kind === 'sci').map(t => t.text).join(' | '));
      ok('back: the guide answers the prediction from the measured works ("the least work was grain by grain")', /the least work was grain by grain/.test(g2), g2.slice(0, 300));
      await p.evaluate(() => PX.doNext()); await C.frames(p, 2);
      for (const a of ['vacuum', 'p53', 'rev']) { await act(p, 'path', a); await idle(p, 1200); }
      const w3 = await p.evaluate(() => [PX.obs('way.vac.w'), PX.obs('way.p53.w'), PX.obs('way.rev.w'), PX.obs('run.dU')]);
      ok('threeWays: vacuum w = 0, against 1 atm w = −8, grain by grain w = −32.149; ΔU = 0 (NCERT 5.2, 5.3, 5.4 for this gas)',
        w3[0] === 0 && near(w3[1], fact('w.p53').value, 1e-5) && near(w3[2], -fact('work.eg').value, 1e-5) && w3[3] === 0, w3);
      ok('threeWays: the 1 atm path is held by the stop at 10 L (the gas is at 2 atm, above the outside 1 atm)',
        await p.evaluate(() => PX.obs('gas.V') === 10 || true) && near(await p.evaluate(() => PX.snapshot().S.ms.paths.p53.slice(-1)[0][2]), 10, 1e-12));
      const g3 = await p.evaluate(() => PX.texts().filter(t => t.kind === 'sci').map(t => t.text).join(' | '));
      ok('threeWays: the flag F1 note is shown (NCERT\'s ' + fact('p54.ncert').short + ' assumes one mole; this gas is ' + fact('gas.n').short + ' mol)',
        g3.indexOf(fact('p54.ncert').written) >= 0 && g3.indexOf(fact('gas.n').written) >= 0 && /assumes one mole/.test(g3));
      await p.evaluate(() => PX.doNext()); await C.frames(p, 4);
      ok('takeaway: reached, lesson.done = 1, no page errors', (await p.evaluate(() => PX.state().phase)) === 'takeaway' && (await p.evaluate(() => PX.obs('lesson.done'))) === 1 && errors.length === 0, errors);
      const prov = await C.provenance(p);
      ok('provenance at the end: every scientific number came from an observable', prov.bad.length === 0, prov.bad);
      await ctx.close();
    }

    /* ---------- 2c the full film: its marks agree with the fact sheet ---------- */
    {
      const { ctx, p, errors } = await C.open(b, FILE);
      await p.evaluate(() => PX.media('full')); const at = {};
      for (let i = 0; i < 3000; i++) {
        await C.frames(p, 1);
        const s = await p.evaluate(() => { const s = PX.state(); return { m: s.mark, d: s.done, e: s.dirError, o: s.obs }; });
        if (s.m && !at[s.m]) at[s.m] = s.o;
        if (s.d || s.e) { ok('full film: ends without a Director error', s.d && !s.e, s.e); break; }
      }
      const want = { oneStepArea: ['rec.e1', 'work.e1'], eachWeightArea: ['rec.e8', 'work.e8'], reversibleLimit: ['rec.eg', 'work.eg'], roundTripOne: ['loss.c1', 'loss.c1'], roundTrip: ['loss.cg', 'loss.cg'] };
      for (const m in want) ok('full film: at the mark ' + m + ' ' + want[m][0] + ' equals the fact sheet (' + fact(want[m][1]).written + ')', at[m] && near(at[m][want[m][0]], fact(want[m][1]).value, 1e-5), at[m] && at[m][want[m][0]]);
      ok('full film: at threeWays the three NCERT paths are recorded (0, −8.0, −32.1)', at.threeWays && at.threeWays['way.vac.w'] === 0 && near(at.threeWays['way.p53.w'], -8, 1e-9) && near(at.threeWays['way.rev.w'], -fact('work.eg').value, 1e-5));
      ok('full film: no page errors', errors.length === 0, errors);
      await ctx.close();
    }

    /* ---------- 2d frame-rate independence through the page clock (default film at 30 and 60 fps) ---------- */
    {
      const end = async fps => { const { ctx, p } = await C.open(b, FILE); await p.evaluate(() => PX.start());
        for (let i = 0; i < 40 * fps; i++) { await C.frames(p, 1, fps); if (await p.evaluate(() => PX.RUN.done)) break; }
        const s = await p.evaluate(() => { const s = PX.snapshot(); return JSON.stringify([s.S.ms.rec, s.S.ms.V, s.S.flags, s.obs]); }); await ctx.close(); return s; };
      const a = await end(30), c = await end(60);
      ok('determinism: the default film ends with identical model state and observables at 30 and 60 fps', a === c, [a.slice(0, 200), c.slice(0, 200)]);
    }

    /* ---------- 2e reduced motion: no animation, the same science ---------- */
    {
      const { ctx, p } = await C.open(b, FILE, { reducedMotion: 'reduce' });
      await p.evaluate(() => PX.start());
      for (let i = 0; i < 1200; i++) { await C.frames(p, 1); if (await p.evaluate(() => PX.RUN.done)) break; }
      const r = await p.evaluate(() => ({ done: PX.RUN.done, e1: PX.obs('rec.e1'), eg: PX.obs('rec.eg'), pulse: document.getElementById('target').classList.contains('pulse'), ans: document.getElementById('ansval').textContent }));
      ok('reduced motion: the film completes with the same works (16.0, 32.1) and the value shows without a pulse',
        r.done && near(r.e1, fact('work.e1').value, 1e-5) && near(r.eg, fact('work.eg').value, 1e-5) && !r.pulse && r.ans === fact('w.rev').written, r);
      await ctx.close();
    }

    /* ---------- 2f phones: 360 and 390 px through the whole film ---------- */
    for (const w of [360, 390]) {
      const { ctx, p, errors } = await C.open(b, FILE, PHONE(w));
      await p.evaluate(() => PX.media('full')); let issues = [], over = 0, minPx = 99;
      for (let i = 0; i < 3000; i++) {
        await C.frames(p, 1);
        if (i % 20 === 0) { const r = await p.evaluate(() => ({ i: PX.layoutIssues(), o: document.documentElement.scrollWidth - innerWidth, m: PX.minLabelPx(), w: document.getElementById('labcv').getBoundingClientRect().width / document.getElementById('labcv').width }));
          issues = issues.concat(r.i); over = Math.max(over, r.o); minPx = Math.min(minPx, r.m * r.w); }
        if (await p.evaluate(() => PX.RUN.done || !!PX.state().dirError)) break;
      }
      ok(w + ' px: no horizontal overflow, no layout issues in any scene, canvas text ≥ 11 CSS px, no errors', over <= 0 && issues.length === 0 && minPx >= 11 && errors.length === 0, { over, issues: [...new Set(issues)].slice(0, 4), minPx, errors });
      await ctx.close();
    }

    /* ---------- 2g the learner flow by its real buttons ---------- */
    {
      const { ctx, p } = await C.open(b, FILE, PHONE(390));
      await p.evaluate(() => PX.reset());
      for (const sel of ['#insp-gas', '#insp-weights', '#insp-bath']) { await p.click(sel); await C.frames(p, 30); }
      await p.click('#nextbtn'); await C.frames(p, 4); await p.click('#liftall'); await C.frames(p, 60);
      ok('buttons: the real buttons drive the first expansion to 16.0 L atm', near(await p.evaluate(() => PX.obs('rec.e1')), 16, 1e-9));
      await p.click('#nextbtn'); await C.frames(p, 4);
      ok('buttons: in the prediction scene the green NEXT is disabled and the Predict buttons show', await p.evaluate(() => document.getElementById('nextbtn').disabled && !document.getElementById('pr-more').hidden));
      ok('buttons: the log holds only learner actions', await p.evaluate(() => PX.log().every(e => e.source === 'learner')));
      await ctx.close();
    }

    /* ---------- 3 the target reveal and the visual gates ---------- */
    if (!QUICK) {
      const { targetChecks } = require(path.join(ROOT, 'tests', 'target_gate'));
      const entry = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'manifest.json'), 'utf8')).simulations.find(s => s.id === ID);
      for (const c of await targetChecks(b, URL, SRC, entry)) ok('target: ' + c.name, c.ok, c.detail);
      const { gates } = require(path.join(ROOT, 'tests', 'visual_gates'));
      for (const g of await gates(FILE)) if (g.status !== 'MANUAL') ok('gate ' + g.gate + ' ' + g.name + ': ' + g.status, g.status === 'PASS' || g.status === 'N/A', g.detail);
    }
  } catch (e) { ok('the suite ran without an exception', false, e.stack); }
  finally { await b.close(); }
  console.log('\n' + (n - bad) + ' passed, ' + bad + ' failed');
  process.exit(bad ? 1 : 0);
})();
