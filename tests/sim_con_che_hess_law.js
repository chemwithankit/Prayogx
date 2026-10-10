/* CON-CHE-HESS-LAW (XP-12, the enthalpy staircase) - the page suite.

     node tests/sim_con_che_hess_law.js            everything (about 3-5 minutes)
     node tests/sim_con_che_hess_law.js --quick    the XP-12 checks only (no shared kit contracts, gates or recorder)

   1 the shared Experience Kit contracts (tests/kit/contracts.js): observables, number provenance, action graph,
     Director determinism and validation, the learner lesson, replay, camera, 390 px, the real recorder twice
   2 XP-12: model, observables, action guards, sign reversal, route arithmetic, script progression, Director
     predicates and marks, replay with refusals and undo, 360 / 390 px layout, PX.state(), the learner flow by its
     real buttons, and the fact sheet (the page's values, statements and solution text against it)
   3 the target reveal (tests/target_gate.js) and the G5 visual gates (tests/visual_gates.js)               */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = process.env.PRAYOGX_ROOT || path.resolve(__dirname, '..');
const { launch } = require(path.join(ROOT, 'tests', '_browser'));
const C = require(path.join(ROOT, 'tests', 'kit', 'contracts'));
const ID = 'CON-CHE-HESS-LAW';
const FILE = path.join(ROOT, 'simulations', 'concepts', 'chemistry', 'con-che-hess-law', 'index.html');
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const FACTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'reel-maker', 'facts', ID + '.json'), 'utf8'));
const SRC = fs.readFileSync(FILE, 'utf8');
const QUICK = process.argv.includes('--quick');
let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (!c && x !== undefined ? '   ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 500) : '')); };
const fact = id => FACTS.values.find(v => v.id === id) || null;
const rxn = k => FACTS.reactions[k].dH;
const PHONE = w => ({ viewport: { width: w, height: w === 360 ? 780 : 844 }, isMobile: true, hasTouch: true });
const run = (p, frames) => C.frames(p, frames);
async function film(p, name, max) {
  await p.evaluate(f => PX.media(f), name); const marks = [];
  for (let i = 0; i < (max || 2400); i++) {
    await run(p, 1);
    const s = await p.evaluate(() => { const s = PX.state(); return { mark: s.mark, done: s.done, err: s.dirError, obs: s.obs }; });
    if (s.mark && (!marks.length || marks[marks.length - 1].mark !== s.mark)) marks.push({ mark: s.mark, obs: s.obs });
    if (s.done || s.err) return { marks, end: s };
  }
  return { marks, end: null };
}

(async () => {
  const b = await launch();
  try {
    /* ---------- 1 the shared kit contracts ---------- */
    if (!QUICK) {
      const res = await C.all(b, FILE, {
        root: ROOT,
        answers: [{ scene: 'route', id: 'predictRev', args: 'flip' }, { scene: 'sum', id: 'predictHeat', args: 'out' }],
        session: { 5: ['#insp-start'], 30: ['#insp-co2'], 55: ['#insp-co'], 80: ['#nextbtn'], 90: ['#trydirect'], 160: ['#nextbtn'], 170: ['#place-i'], 240: ['#nextbtn'], 250: ['#place-ii'], 258: ['#pr-same'], 262: ['#pr-flip'], 270: ['#reverse-ii'], 300: ['#place-ii'] },
        lesson: { hintAfter: 5, clicks: ['#insp-start', '#insp-co2', '#insp-co', '#trydirect', '#place-i', '#pr-flip', '#reverse-ii', '#place-ii', '#ph-out', '#sumbtn'], finishFrames: 600 }
      });
      for (const r of res) ok('kit contract: ' + r.name, r.ok, r.detail);
    }

    /* ---------- 2a the model, in isolation ---------- */
    {
      const block = /\/\* ENGINE-BEGIN \*\/([\s\S]*?)\/\* ENGINE-END \*\//.exec(SRC)[1], ctx = { Math }; vm.createContext(ctx);
      vm.runInContext(block + ';this.E=ENGINE;', ctx); const E = ctx.E;
      const r0 = E.run({ route: [] }), r1 = E.run({ route: [{ id: 'i', rev: false }] }), r2 = E.run({ route: [{ id: 'i', rev: false }, { id: 'ii', rev: true }] });
      const rb = E.run({ route: [{ id: 'i', rev: false }, { id: 'ii', rev: false }] });
      ok('model: an empty route is at the start, sum 0, not complete', r0.end === 'start' && r0.sumT === 0 && !r0.complete);
      ok('model: (i) takes the route to CO₂ with −393.5', r1.end === 'co2' && r1.routeSum === rxn('i').value && r1.valid);
      ok('model: (i) then (ii) reversed reaches CO with −110.5, the fact sheet\'s target', r2.complete && r2.routeSum === fact('target.dH').value && r2.target === r2.hess);
      ok('model: (i) then (ii) forwards is invalid at step 2 (it starts at CO, the route is at CO₂)', !rb.valid && rb.bad === 1 && rb.end === 'co2');
      ok('model: pure - the same input gives the same output, and the input is not changed', (() => { const p = { route: [{ id: 'i', rev: false }] }, a = JSON.stringify(E.run(p)), c = JSON.stringify(p); return a === JSON.stringify(E.run(p)) && c === JSON.stringify(p); })());
      ok('model: fits() says (ii) fits the route at CO₂ only when reversed', E.fits({ route: [{ id: 'i', rev: false }], rev: { ii: true } }, 'ii') && !E.fits({ route: [{ id: 'i', rev: false }], rev: { ii: false } }, 'ii'));
      ok('model: the route via CO and the direct route agree (paths.diff = 0) once complete', r2.pathsDiff === 0 && r2.viaCO === r2.direct);
      ok('model: the Table 5.2 difference is the fact sheet\'s (+0.03)', Math.abs(r2.tableDiff - fact('table.diff').value) < 1e-9, r2.tableDiff);
    }

    /* ---------- 2b observables, guards, reversal, arithmetic (one page) ---------- */
    {
      const { ctx, p, errors } = await C.open(b, FILE);
      const meta = await p.evaluate(() => PX.kit.OBS.ids().map(id => PX.kit.OBS.meta(id)));
      const need = ['rxn.i.dH', 'rxn.ii.dH', 'rxn.ii.used', 'level.start', 'level.co2', 'level.co', 'route.steps', 'route.sum', 'route.valid', 'route.complete', 'target.dH', 'hess.dH', 'direct.dH', 'viaCO.dH', 'paths.diff', 'table.fH.co', 'table.diff', 'lesson.done'];
      ok('observables: the blueprint set is defined (' + need.length + ')', need.every(id => meta.some(m => m.id === id)), need.filter(id => !meta.some(m => m.id === id)));
      ok('observables: every ΔH observable is in kJ mol⁻¹ with a stated sign convention', meta.filter(m => /dH|sum|diff/.test(m.id)).every(m => m.unit === 'kJ mol⁻¹' && m.signed && m.sign));
      ok('observables: measured values carry status measured, the reference level idealized', meta.find(m => m.id === 'rxn.i.dH').status === 'measured' && meta.find(m => m.id === 'table.fH.co').status === 'measured' && meta.find(m => m.id === 'level.start').status === 'idealized');
      const v0 = await p.evaluate(() => PX.state().obs);
      ok('observables: the page\'s fixed values equal the fact sheet (i, ii, CO₂ level, Hess, table)', v0['rxn.i.dH'] === rxn('i').value && v0['rxn.ii.dH'] === rxn('ii').value && v0['level.co2'] === fact('level.co2').value
        && v0['hess.dH'] === fact('target.dH').value && v0['level.co'] === fact('level.co').value && v0['table.fH.co'] === fact('table.fH.co').value, v0);
      const act = (id, a) => p.evaluate(([i, x]) => PX.act(i, x === null ? undefined : x), [id, a === undefined ? null : a]);
      const idle = async () => { for (let i = 0; i < 200 && await p.evaluate(() => PX.state().busy); i++) await run(p, 1); };
      ok('guard: placing a reaction in the first scene is refused (not allowed yet)', !(await act('place', 'i')).ok);
      for (const s of ['start', 'co2', 'co']) { await act('inspect', s); await idle(); }
      ok('guard: advance needs all three states seen, then works', (await p.evaluate(() => PX.doNext())).ok && (await p.evaluate(() => PX.state().phase)) === 'problem');
      await act('tryDirect'); await idle(); await p.evaluate(() => PX.doNext());
      ok('guard: (ii) cannot start the route (it starts at CO, the route is at the start)', !(await act('place', 'ii')).ok);
      await run(p, 1);
      const why1 = await p.evaluate(() => PX.texts().filter(t => t.kind === 'sci').map(t => t.text).join(' | '));
      ok('guard: the refusal is explained in the lab guide (where the reaction starts, where the route is)', /starts at CO \+ ½O₂, but your route has reached C\(graphite\) \+ O₂/.test(why1), why1.slice(0, 300));
      ok('arithmetic: (i) placed → route at CO₂, sum −393.5', (await act('place', 'i')).ok && (await idle(), true) && (await p.evaluate(() => PX.obs('route.sum'))) === rxn('i').value);
      ok('guard: (i) cannot be placed twice', !(await act('place', 'i')).ok);
      await p.evaluate(() => PX.doNext());
      ok('guard: sum is refused before the route is complete', !(await act('sum')).ok);
      ok('guard: (ii) forwards is refused at CO₂', !(await act('place', 'ii')).ok);
      await run(p, 1);
      const why2 = await p.evaluate(() => PX.texts().filter(t => t.kind === 'sci').map(t => t.text).join(' | '));
      ok('guard: ...and the guide says why: (ii) starts at CO + ½O₂, the route has reached CO₂', /\(ii\) starts at CO \+ ½O₂, but your route has reached CO₂/.test(why2), why2.slice(0, 300));
      ok('prediction: (ii) cannot be reversed before the learner predicts what reversing does', !(await act('reverse', 'ii')).ok);
      ok('prediction: the NEXT button cannot answer it (nothing to press, and it says so)', await p.evaluate(() => PX.next() === null && document.getElementById('nextbtn').disabled && /Predict first/.test(document.getElementById('nextbtn').textContent)));
      ok('prediction: the three answers are offered, the sum and route buttons are not the way forward', await p.evaluate(() => !document.getElementById('predgroup').hidden && ['pr-same', 'pr-flip', 'pr-zero'].every(i => !document.getElementById(i).hidden)));
      ok('prediction: "stays the same" is accepted as an answer but does not unlock the reversal', (await act('predictRev', 'same')).ok);
      await run(p, 1);
      const whyP = await p.evaluate(() => PX.texts().filter(t => t.kind === 'sci').map(t => t.text).join(' | '));
      ok('prediction: a wrong answer is explained in the lab guide', /Not quite\. Going down gave out heat/.test(whyP), whyP.slice(0, 300));
      ok('prediction: "becomes zero" does not unlock it either', (await act('predictRev', 'zero')).ok && !(await act('reverse', 'ii')).ok && await p.evaluate(() => PX.next() === null));
      ok('prediction: "changes sign" is right and unlocks the reversal', (await act('predictRev', 'flip')).ok && await p.evaluate(() => PX.next() && PX.next().id === 'reverse'));
      ok('prediction: it cannot be answered a second time', !(await act('predictRev', 'flip')).ok);
      const before = await p.evaluate(() => PX.obs('rxn.ii.used'));
      await act('reverse', 'ii'); await idle();
      const after = await p.evaluate(() => PX.obs('rxn.ii.used'));
      ok('sign reversal: reversing (ii) turns ' + before + ' into ' + after + ' (the same size, the opposite sign; the fact sheet\'s (iii))', before === rxn('ii').value && after === rxn('iii').value && after === -before);
      await act('reverse', 'ii'); await idle();
      ok('sign reversal: reversing again restores (ii)', (await p.evaluate(() => PX.obs('rxn.ii.used'))) === rxn('ii').value);
      await act('reverse', 'ii'); await idle();
      ok('arithmetic: (iii) placed → route complete at CO, sum −110.5 = the Hess value', (await act('place', 'ii')).ok && (await idle(), true)
        && await p.evaluate(() => PX.obs('route.complete') === 1 && PX.obs('route.sum') === PX.obs('hess.dH') && PX.obs('target.dH') === PX.obs('hess.dH')));
      ok('guard: (ii) cannot be reversed once it is in the route', !(await act('reverse', 'ii')).ok);
      ok('arithmetic: the CO level equals the route sum (start = 0)', await p.evaluate(() => PX.obs('level.co') === PX.obs('level.start') + PX.obs('route.sum')));
      const undo = await act('undo'); await idle(); await run(p, 1);
      ok('undo: removes the last step (route back at CO₂, not complete)', undo.ok && await p.evaluate(() => PX.obs('route.complete') === 0 && PX.obs('route.steps') === 1));
      await act('place', 'ii'); await idle(); await p.evaluate(() => PX.doNext());
      await run(p, 1);
      ok('prediction: before adding, the learner predicts the heat direction; the sum is refused until then', !(await act('sum')).ok && await p.evaluate(() => PX.next() === null && !document.getElementById('predgroup').hidden));
      ok('prediction: "takes in heat" does not unlock the sum', (await act('predictHeat', 'in')).ok && !(await act('sum')).ok);
      ok('prediction: "gives out heat" is right and unlocks the sum', (await act('predictHeat', 'out')).ok && await p.evaluate(() => PX.next() && PX.next().id === 'sum'));
      ok('target: before the sum the key result shows only its name', (await p.evaluate(() => document.getElementById('ansval').textContent)) === '');
      await act('sum'); await idle();
      ok('target: after the sum it shows −110.5 kJ mol⁻¹ from the observable', (await p.evaluate(() => document.getElementById('ansval').textContent)) === fact('target.dH').written);
      ok('guard: undo is refused once the steps are added', !(await act('undo')).ok);
      ok('page: no errors', errors.length === 0, errors);
      await ctx.close();
    }

    /* ---------- 2c the full film: Director predicates, marks, and the observables at each mark ---------- */
    {
      const { ctx, p, errors } = await C.open(b, FILE);
      const f = await film(p, 'full');
      const order = f.marks.map(m => m.mark);
      ok('Director: the full film ends without an error', !!f.end && f.end.done && !f.end.err, f.end);
      ok('Director: marks in teaching order (states → notMeasurable → co2Level → reversed → routeBuilt → found → aha → checked → takeaway)',
        JSON.stringify(order) === JSON.stringify(['states', 'notMeasurable', 'co2Level', 'reversed', 'routeBuilt', 'found', 'aha', 'checked', 'takeaway']), order);
      const at = k => (f.marks.find(m => m.mark === k) || {}).obs || {};
      ok('Director: at "found" the observables hold the fact sheet\'s target (route sum = Hess value = −110.5)', at('found')['target.dH'] === fact('target.dH').value && at('found')['route.sum'] === fact('target.dH').value);
      ok('Director: at "aha" the two routes agree (paths.diff = 0, via CO = direct = −393.5)', at('aha')['paths.diff'] === 0 && at('aha')['viaCO.dH'] === fact('viaCO.dH').value && at('aha')['direct.dH'] === fact('direct.dH').value);
      ok('Director: at "checked" the Table 5.2 difference is the fact sheet\'s +0.03', Math.abs(at('checked')['table.diff'] - fact('table.diff').value) < 1e-9);
      ok('Director: it acted only through actions (every Director action is in the log as source "director")', await p.evaluate(() => PX.log().every(e => e.source === 'director')) && (await p.evaluate(() => PX.log().length)) > 8);
      const film2 = await (async () => { const o = await C.open(b, FILE); const r = await film(o.p, 'full'); await o.ctx.close(); return r; })();
      ok('determinism: the full film twice gives identical marks and observables', JSON.stringify(f.marks) === JSON.stringify(film2.marks));
      const shown = await p.evaluate(() => PX.texts().filter(t => t.kind === 'sci').map(t => t.text));
      const st = FACTS.statements.find(s => s.id === 'st.sameStartEnd').text;
      ok('fact sheet: the takeaway shows the approved statement "' + st + '"', shown.some(t => t.indexOf(st) >= 0), shown.slice(0, 8));
      ok('page: no errors in the film', errors.length === 0, errors);
      await ctx.close();
    }

    /* ---------- 2d the learner flow by its real buttons, at 390 and 360 px, with layout checks ---------- */
    for (const w of [390, 360]) {
      const { ctx, p, errors } = await C.open(b, FILE, PHONE(w));
      const issues = new Set(), seen = [];
      let clicks = 0; const stalls = [];
      for (let i = 0; i < 120 && (await p.evaluate(() => PX.state().phase)) !== 'takeaway'; i++) {
        const ph = await p.evaluate(() => PX.state().phase); if (seen[seen.length - 1] !== ph) seen.push(ph);
        (await p.evaluate(() => PX.layoutIssues())).forEach(x => issues.add(ph + ': ' + x));
        const nb = await p.evaluate(() => { const b = document.getElementById('nextbtn'); return !b.disabled; });
        if (nb) { await p.evaluate(() => document.getElementById('nextbtn').scrollIntoView({ block: 'center' })); await p.click('#nextbtn'); clicks++; }
        else {
          const ask = await p.evaluate(() => ['pr-flip', 'ph-out'].filter(i => !document.getElementById(i).hidden && !document.getElementById(i).disabled)[0] || null);
          if (ask) {
            const wrong = ask === 'pr-flip' ? 'pr-same' : 'ph-in';       // the wrong answer's guide text must fit too
            await p.evaluate(i => document.getElementById(i).scrollIntoView({ block: 'center' }), wrong); await p.click('#' + wrong); await run(p, 3);
            (await p.evaluate(() => PX.layoutIssues())).forEach(x => issues.add(ph + ' (wrong answer): ' + x));
          }
          if (ask) { stalls.push(ph); await p.evaluate(i => document.getElementById(i).scrollIntoView({ block: 'center' }), ask); await p.click('#' + ask); }
        }
        await run(p, 75);
      }
      for (let i = 0; i < 4; i++) { (await p.evaluate(() => PX.layoutIssues())).forEach(x => issues.add('takeaway: ' + x)); await run(p, 20); }
      seen.push(await p.evaluate(() => PX.state().phase));
      ok(w + ' px: the NEXT button stalls at both predictions (route, sum) until the learner answers with the prediction buttons', JSON.stringify(stalls.filter((x, i) => stalls.indexOf(x) === i)) === JSON.stringify(['route', 'sum']), stalls);
      ok(w + ' px: the guided path (NEXT, plus the two predictions answered) reaches the takeaway (' + clicks + ' presses)', seen[seen.length - 1] === 'takeaway' && seen.indexOf('route') > 0, seen);
      ok(w + ' px: no lab-guide or equation text overflows its panel at any step', issues.size === 0, [...issues].slice(0, 6));
      const m = await p.evaluate(() => { const c = document.getElementById('labcv'), r = c.getBoundingClientRect(); return { over: document.documentElement.scrollWidth - innerWidth, eff: PX.minLabelPx() * r.width / c.width,
        taps: [...document.querySelectorAll('#controls button')].filter(e => e.offsetParent !== null).map(e => e.getBoundingClientRect().height) }; });
      ok(w + ' px: no horizontal scrolling', m.over <= 0, m.over);
      ok(w + ' px: every canvas label is at least 11 px on screen (' + m.eff.toFixed(1) + ')', m.eff >= 11);
      ok(w + ' px: every visible control is at least 44 px tall', Math.min.apply(null, m.taps) >= 44, m.taps);
      ok(w + ' px: the route buttons were the real path (the log holds learner place, predictions, reverse and sum)', await p.evaluate(() => ['place', 'predictRev', 'reverse', 'predictHeat', 'sum'].every(id => PX.log().some(e => e.source === 'learner' && e.id === id))));
      ok(w + ' px: no errors', errors.length === 0, errors);
      await ctx.close();
    }

    /* ---------- 2e replay with a refusal and an undo, and PX.state() ---------- */
    {
      const live = await C.open(b, FILE);
      const script = [['inspect', 'start'], ['inspect', 'co2'], ['inspect', 'co'], ['advance'], ['tryDirect'], ['advance'], ['place', 'ii'], ['place', 'i'], ['advance'], ['place', 'ii'], ['reverse', 'ii'], ['predictRev', 'same'], ['predictRev', 'flip'], ['reverse', 'ii'], ['place', 'ii'], ['undo'], ['place', 'ii'], ['advance'], ['sum'], ['predictHeat', 'in'], ['predictHeat', 'out'], ['sum']];
      for (const [id, a] of script) { await live.p.evaluate(([i, x]) => PX.act(i, x === null ? undefined : x), [id, a === undefined ? null : a]); await run(live.p, 70); }
      const snap = await live.p.evaluate(() => PX.snapshot()), log = await live.p.evaluate(() => PX.log());
      const rep = await C.open(b, FILE); await rep.p.evaluate(l => PX.replay(l), log);
      const frames = await live.p.evaluate(() => PX.kit.CLOCK.frame); await run(rep.p, frames + 5);
      const snap2 = await rep.p.evaluate(() => PX.snapshot());
      ok('replay: a session with refused actions and an undo replays to the identical state and observables', JSON.stringify(snap.S) === JSON.stringify(snap2.S) && JSON.stringify(snap.obs) === JSON.stringify(snap2.obs), [snap.S, snap2.S]);
      ok('replay: refused actions are not in the log (only what changed the state; four of the 22 were refused)', log.length === script.length - 4, log.map(e => e.id));
      const st = await rep.p.evaluate(() => PX.state());
      ok('PX.state(): phase, stage, busy, mark, shot, done and obs, plus a flat obs_* field for every observable', ['phase', 'stage', 'busy', 'shot', 'done', 'obs'].every(k => k in st)
        && Object.keys(st.obs).every(id => st['obs_' + id.replace(/\./g, '_')] === st.obs[id]), Object.keys(st));
      ok('PX.answer() is the model\'s computed answer, written as the fact sheet writes it', (await rep.p.evaluate(() => PX.answer())) === fact('target.dH').written);
      await live.ctx.close(); await rep.ctx.close();
    }

    /* ---------- 2f static: standalone ES5, the solution text against the fact sheet ---------- */
    {
      const js = SRC.slice(SRC.indexOf('<script'), SRC.lastIndexOf('</script>'));
      ok('standalone: no external script, stylesheet, fetch, XHR or browser storage', !/<script[^>]+src=|<link[^>]+stylesheet|fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB/.test(SRC));
      ok('ES5 only in the script (block comments are not code)', !/(^|[^\w.$])(let|const|class)\s|=>|`/.test(js.replace(/\/\*[\s\S]*?\*\//g, '')));
      ok('meta sim-id is ' + ID, SRC.indexOf('<meta name="sim-id" content="' + ID + '">') >= 0);
      const sol = /<section id="solution"[\s\S]*?<\/section>/.exec(SRC)[0].replace(/<[^>]+>/g, ' ');
      const nums = (sol.match(/[−+]?\d+\.\d+/g) || []).map(x => x.replace('−', '-'));
      const allowed = new Set([].concat(FACTS.values.map(v => v.value), Object.values(FACTS.reactions).map(r => r.dH.value)).map(v => String(v)));
      const refs = new Set(['5.4', '5.2', '5.16']);
      const stray = nums.filter(x => !allowed.has(String(Number(x))) && !refs.has(x.replace(/^[+-]/, '')));
      ok('fact sheet: every decimal number in the written solution is a fact-sheet value (or a section / table / equation number)', stray.length === 0, stray);
      ok('fact sheet: the solution states the approved takeaway and the reversal rule', /Enthalpy depends only on the start and the end/.test(sol) && /Reverse a reaction → reverse the sign of ΔH/.test(sol));
      const block = /\/\* ENGINE-BEGIN \*\/([\s\S]*?)\/\* ENGINE-END \*\//.exec(SRC)[1];
      ok('the answer is not written anywhere in the script (it is computed)', js.indexOf(fact('target.dH').written) < 0 && !/-1105\b/.test(block));
    }

    /* ---------- 3 the target reveal and the G5 visual gates ---------- */
    if (!QUICK) {
      const { targetChecks } = require(path.join(ROOT, 'tests', 'target_gate'));
      const entry = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'manifest.json'), 'utf8')).simulations.find(s => s.id === ID);
      for (const c of await targetChecks(b, URL, SRC, entry)) ok(c.name, c.ok, c.detail);
      const { gates } = require(path.join(ROOT, 'tests', 'visual_gates'));
      for (const g of await gates(FILE)) if (g.status !== 'MANUAL') ok('gate ' + g.gate + ' ' + g.name + ': ' + g.status, g.status === 'PASS' || g.status === 'N/A', g.detail);
    }
  } catch (err) {
    ok('suite ran to the end', false, err && err.stack);
  } finally { await b.close(); }
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  process.exit(bad ? 1 : 0);
})();
