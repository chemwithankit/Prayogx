/* ADV-2026-P1-CHE-Q16 - the oxime reach lab: intramolecular SNAr, the Kemp elimination, O-acetylation and anti E2, ester hydrolysis.

   Drives the finished page headlessly: the chemistry engine in the page (every
   elementary step valid, charge and electrons conserved, products matched by
   graph), the 3-D reach model, the optional conditions and their honest
   warnings, the automatic run from START to the reveal with no further clicks,
   the gauges, the charts, replay, pause, reset, custom runs, the reach explorer,
   classroom mode, phone widths, reduced motion, the library and feed entries,
   and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q16.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium, launch } = require('./_browser');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q16';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q16/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

(async () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const js = src.slice(src.indexOf('<script>'));
  /* ------------------------------------------------ the file itself */
  ok('the page carries its permanent ID', src.includes('<meta name="sim-id" content="' + ID + '">'));
  ok('one self-contained file: no external script, stylesheet, font or fetch',
     !/<script[^>]+src=|<link[^>]+stylesheet|@import|fetch\(|XMLHttpRequest|https?:\/\/(?!www\.w3\.org)/.test(src));
  ok('nothing stored on the device', !/localStorage|sessionStorage|indexedDB/.test(src));
  ok('no navigation markup of its own', !/rback|vback|#\/run\//.test(src));
  ok('ES5-safe script', !/=>|\b(let|const)\s+[A-Za-z_$][\w$]*\s*=|`|[\w\])]\?\.[A-Za-z_$]/.test(js));
  ok('the answer is not written into the script: it is computed at run time',
     /var ANS = QRUN\.answer/.test(src) && /answer: hits\.length === 1 \? hits\[0\]/.test(js) && !/ANS\s*=\s*["']|answer:\s*["'][A-D]["']|\bmap\s*=\s*\{\s*P\s*:\s*1/.test(js));
  ok('the chemistry engine is marked, so the verifier can run it in node', /\/\*ENGINE-BEGIN\*\/[\s\S]+\/\*ENGINE-END\*\//.test(src));
  ok('no prediction stage (optional by the standard; none here)', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('sections: mission brief, experiment, reach explorer, detailed solution, concept & takeaways, how to use',
     ['Mission brief', 'Interactive experiment', 'Reach explorer', 'Detailed solution', 'Concept explanation', 'How to use this simulation'].every(t => src.indexOf(t) >= 0));

  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [], reqs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  p.on('request', r => reqs.push(r.url()));
  await p.goto(URL); await sleep(800);
  const E = (f, a) => p.evaluate(f, a);

  ok('it loads with no request beyond the file itself', reqs.every(u => u.startsWith('file:') || u.startsWith('data:')), reqs.length + ' requests');
  const qt = (await p.textContent('#question .qtext p')).replace(/\s+/g, ' ').trim();
  ok('the question is reproduced verbatim', qt === 'Q.16 Match the major products obtained in the reactions given in List-I with the corresponding structures in List-II and choose the correct option.', qt.slice(0, 120));
  const ot = (await p.textContent('#question .opts')).replace(/\s+/g, ' ');
  ok('the four options as printed', ['P → 2; Q ⟶ 1; R → 5; S ⟶ 4', 'P → 1; Q ⟶ 2; R → 4; S ⟶ 5', 'P → 1; Q ⟶ 2; R → 3; S ⟶ 4', 'P → 2; Q ⟶ 1; R → 3; S ⟶ 5'].every(t => ot.indexOf(t) >= 0));
  ok('List-I: four reactions with their conditions; List-II: five structures, all drawn', await E(() => document.querySelectorAll('#qlist1 .qrow svg').length === 4 && document.querySelectorAll('#qlist2 .qrow svg').length === 5
     && /aqueous NaOH/.test(document.getElementById('qlist1').textContent) && /\(CH3CO\)2O/.test(document.getElementById('qlist1').textContent.replace(/\s+/g, ''))));

  /* ------------------------------------------------ the chemistry in the page */
  const sci = await E(() => {
    const E2 = PX.ENGINE, q = PX.qrun(), o = {};
    o.ans = PX.answer(); o.map = ['P', 'Q', 'R', 'S'].map(k => q.map[k]).join(','); o.hits = q.hits.join(',');
    o.steps = ['P', 'Q', 'R', 'S'].map(k => q.res[k].steps.length).join(',');
    o.arrows = q.res.P.steps.map(s => s.arrows.length).join(',');
    o.valid = ['P', 'Q', 'R', 'S'].every(k => q.res[k].steps.every(s => s.valid && E2.valid(s.before) && E2.valid(s.after) && s.charge === s.charge0 && s.e0 === s.e1));
    o.pushed = ['P', 'Q', 'R', 'S'].every(k => q.res[k].steps.every(s => JSON.stringify(E2.push(s.before, s.arrows).b) === JSON.stringify(s.after.b)));
    o.logs = ['P', 'Q', 'R', 'S'].map(k => q.res[k].log.join('+')).join(' | ');
    o.zr = E2.reach('ald', true); o.er = E2.reach('ket', false); o.zk = E2.reach('ket', true);
    o.act = E2.activation(E2.scaffold(E2.LIST1.P.sub)).rel;
    o.meta = E2.activation(E2.scaffold({ side: 'aldoxime', c2: 'Br', nitro: 'meta', oSub: 'H', syn: true })).ok;
    const r = D => { const R = PX.run(D); return { m: ['P', 'Q', 'R', 'S'].map(k => R.map[k]).join(','), a: R.answer, c: R.complete, v: R.valid }; };
    o.c1 = r({ nitro: 'meta', qAc: 'Ac2O', sGeo: 'E', sCond: 'Na2CO3' }); o.c2 = r({ nitro: 'para', qAc: 'skip', sGeo: 'E', sCond: 'Na2CO3' });
    o.c3 = r({ nitro: 'para', qAc: 'Ac2O', sGeo: 'Z', sCond: 'Na2CO3' }); o.c4 = r({ nitro: 'para', qAc: 'Ac2O', sGeo: 'E', sCond: 'acid' });
    o.h5 = E2.hash(E2.scaffold(E2.LIST2[5])) !== E2.hash(E2.scaffold({ side: 'ketoxime', c2: 'Br', nitro: 'para', oSub: 'H', syn: true }));
    return o;
  });
  ok('the page finds option B at run time', sci.ans === 'B' && sci.hits === 'B', sci.ans);
  ok('products matched with List-II by graph: P1 Q2 R4 S5', sci.map === '1,2,4,5', sci.map);
  ok('elementary steps: P 5, Q 4, R 3, S 3', sci.steps === '5,4,3,3', sci.steps);
  ok('curved arrows in P: 2 (deprotonation), 4 (SNAr addition), 4 (bromide leaves), 3 (Kemp), 2 (work-up)', sci.arrows === '2,4,4,3,2', sci.arrows);
  ok('every intermediate of all four reactions is valid; charge and electrons conserved', sci.valid);
  ok('every product state is exactly what its arrows produce', sci.pushed);
  ok('pathways: P SNAr + Kemp; Q acetylation + E2; R SNAr, no Kemp; S hydrolysis, no reach',
     /intramolecular SNAr\+Kemp elimination\+work-up/.test(sci.logs) && /O-acetylation\+anti E2/.test(sci.logs) && /no H-3/.test(sci.logs) && /ester hydrolysis\+no ring closure: the O cannot reach/.test(sci.logs), sci.logs);
  ok('reach: Z oxime O comes within contact (< 3.22 Å), E never does', sci.zr.ok && sci.zk.ok && !sci.er.ok && sci.zr.d < 2.6 && sci.er.d > 4.0, sci.zr.d.toFixed(2) + ' / ' + sci.er.d.toFixed(2));
  ok('activation read from the graph: NO₂ para to Br; a meta-NO₂ is not activated', sci.act === 'para' && sci.meta === false);
  ok('(5) and R\'s substrate differ only in C=N geometry, and the hash tells them apart', sci.h5);
  ok('controls: meta-NO₂ → nothing matches; Q unacetylated → Q → 1; Z-S → S → 4; S in acid → S → 3 (Beckmann)',
     sci.c1.m === '0,0,0,0' && sci.c2.m === '1,1,4,5' && sci.c3.m === '1,2,4,4' && sci.c4.m === '1,2,4,3' && [sci.c1, sci.c2, sci.c3, sci.c4].every(x => !x.c && x.a === 'none' && x.v),
     [sci.c1.m, sci.c2.m, sci.c3.m, sci.c4.m].join(' | '));

  /* ------------------------------------------------ layout v2 */
  const lay = await E(() => {
    const s = document.getElementById('ansstrip'), g = document.querySelector('.grid1'), d = document.getElementById('dock'), go = document.getElementById('gobtn');
    return { strip: !!s && s.getBoundingClientRect().bottom <= g.getBoundingClientRect().top + 1, dock: !!d && d.getBoundingClientRect().top >= g.getBoundingClientRect().bottom - 1 && d.contains(go), val: document.getElementById('ansstripv').textContent };
  });
  ok('the final answer is visible above the experiment screen from the start', lay.strip && lay.val === 'B', lay.val);
  ok('START EXPERIMENT and the whole control bar sit below the experiment screen', lay.dock);
  ok('the full solution is open (no gate), with every step drawn', await E(() => !document.getElementById('solbody').hidden && document.getElementById('solgate').hidden
     && document.querySelectorAll('#solsteps .mstep').length === 15 && document.querySelectorAll('#solsteps .mstep svg path[marker-end]').length >= 30));
  ok('concept explanation and six key takeaways', await E(() => document.querySelectorAll('#concept .keyfacts > div').length) === 6);
  ok('the five tiles start as ?', await E(() => ['P', 'Q', 'R', 'S', 'O'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['nitro', 'qAc', 'sGeo', 'sCond'].map(k => document.getElementById('in_' + k).value));
  ok('every value is pre-set to the question', vals.join(',') === 'para,Ac2O,E,Na2CO3', vals.join(','));

  /* ------------------------------------------------ optional conditions */
  await E(() => PX.setField('sGeo', 'Z'));
  ok('changing a condition switches to USING CUSTOM VALUES, with an honest warning', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /printed as the E isomer/.test(await p.textContent('#condwarn')));
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['nitro', 'qAc', 'sGeo', 'sCond'].map(k => document.getElementById('in_' + k).value))).join(',') === 'para,Ac2O,E,Na2CO3' && await E(() => document.getElementById('condwarn').hidden));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question values', await E(() => PX.RUN.state) === 'running');
  ok('values lock while it runs', await E(() => document.getElementById('in_nitro').disabled));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [], msgs = new Set();
  for (let i = 0; i < 2000; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansstrips').textContent, d: document.getElementById('g_d').textContent, ar: document.getElementById('g_ar').textContent,
      q: document.getElementById('g_q').textContent, okk: document.getElementById('g_ok').textContent, a: document.getElementById('g_a').textContent, tp: document.querySelector('#u_P .v').textContent, to: document.querySelector('#u_O .v').textContent,
      curve: document.querySelectorAll('#curve polyline').length, bars: document.querySelectorAll('#bars polyline').length, bench: [...document.querySelectorAll('#bench span.now')].map(x => x.textContent).join('') }));
    seen.add(s.st); live.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all ten stages', ['load', 'reach', 'P', 'Q', 'R', 'S', 'assay', 'match', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer strip steps through every message', ['Loading four flasks', 'Scanning the reach', 'Running flask P', 'Running flask Q', 'Running flask R', 'Running flask S', 'Analysing the products', 'Matching products', 'Testing options', 'Calculating final result'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)));
  ok('the O···C–Br gauge reads below contact during the reach scan', live.some(s => s.now && s.now.name === 'reach' && s.d === '< 3.22'));
  ok('no progress percentage inside a live region while it runs', live.every(s => !/%/.test(s.msg)));
  ok('the arrow gauge counts the pairs: 4 in P\'s SNAr, 3 in Q\'s E2', live.some(s => s.now && s.now.name === 'P' && /^4 · 2\/5$/.test(s.ar)) && live.some(s => s.now && s.now.name === 'Q' && /^3 · 4\/4$/.test(s.ar)));
  ok('charge and octets are checked on every step', live.filter(s => s.now && ['P', 'Q', 'R', 'S'].indexOf(s.now.name) >= 0 && s.q !== '—').every(s => s.okk === '✓ all' && /^(-?\d|\+\d) → (-?\d|\+\d)$/.test(s.q)));
  ok('A₃₈₀ rises only in flask P (the nitrophenoxide) and falls at the work-up', live.some(s => s.now && s.now.name === 'P' && parseFloat(s.a) > 1.2) && live.filter(s => s.now && ['Q', 'R', 'S'].indexOf(s.now.name) >= 0).every(s => parseFloat(s.a) < 0.2));
  ok('the bench lights each flask in turn', ['P', 'Q', 'R', 'S'].every(k => live.some(s => s.now && s.now.name === k && s.bench === k)));
  ok('tiles fill at the List-II step; the option only after the test', live.some(s => s.now && s.now.name === 'assay' && s.tp === '?') && live.some(s => s.now && s.now.name === 'test' && s.tp === '→ 1' && s.to === '?'));
  ok('both charts are drawn from the model while it runs', live.some(s => s.now && s.now.name === 'reach' && s.curve >= 1) && live.some(s => s.now && s.now.name === 'S' && s.bars === 4));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'load,reach,P,Q,R,S,assay,match,oA,oB,oC,oD,answer', (await E(() => PX.calcKeys())).join(','));
  ok('the case file: → 1, → 2, → 4, → 5, (B)', await E(() => ['P', 'Q', 'R', 'S', 'O'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(',')) === '→ 1,→ 2,→ 4,→ 5,(B)');
  ok('List-II rows 1, 2, 4, 5 are marked; 3 is not', await E(() => [1, 2, 3, 4, 5].map(i => document.getElementById('l2_' + i).classList.contains('hit') ? 1 : 0).join('')) === '11011');
  ok('the evidence table: every elementary step, 15 rows', await E(() => document.querySelectorAll('#log tbody tr').length) === 15);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('option board: B matches; A, C, D fail', cards.A === false && cards.B === true && cards.C === false && cards.D === false, JSON.stringify(cards));
  ok('all six badges are earned', await E(() => ['geo', 'snar', 'kemp', 'cn', 'lab', 'mas'].every(k => PX.badges()[k])) && await E(() => document.querySelectorAll('.badge.on').length) === 6);
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: reach distances, the four pathways, List-II, (B)', /reaches/.test(cl) && /Kemp elimination/.test(cl) && /anti E2/.test(cl) && /cannot reach/.test(cl) && /P → \(1\) · Q → \(2\) · R → \(4\) · S → \(5\)/.test(cl) && /\(B\)/.test(cl));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, OPTION (B)', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /OPTION \(B\)/.test(rv), rv.slice(0, 80));
  ok('the header reads B and blinks as it lands', (await p.textContent('#ansval')).trim() === 'B' && await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(B)');

  /* ------------------------------------------------ tools and the reach explorer */
  await p.click('#t_eq'); await p.click('#t_why'); await sleep(150);
  ok('SHOW EQUATION and SHOW WHY? toggle', await E(() => document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_why').getAttribute('aria-pressed') === 'true'));
  await p.click('#t_eq'); await p.click('#t_why');
  await p.click('#t_cmp'); ok('SLOW MOTION sets half speed', await E(() => PX.RUN.speed) === 0.5); await p.click('#t_cmp');
  const xi = () => E(() => document.getElementById('xinfo').textContent);
  await sleep(500);
  ok('explorer starts on P\'s Z aldoxime: can reach, product (1)', /O can reach C–Br/.test(await xi()) && /List-II \(1\)/.test(await xi()));
  await p.click('#x_geo button[data-v="E"]'); await sleep(500);
  ok('E: can never reach; the oxime survives, not in List-II', /can never reach/.test(await xi()) && /not in List-II/.test(await xi()));
  await p.click('#x_kind button[data-v="ket"]'); await p.selectOption('#x_os', 'Ac'); await p.selectOption('#x_rg', 'Na2CO3'); await sleep(500);
  ok('E O-acetyl ketoxime in Na₂CO₃ (flask S): List-II (5)', /List-II \(5\)/.test(await xi()));
  await p.selectOption('#x_rg', 'acid'); await sleep(500);
  ok('...in acid: the Beckmann amide, List-II (3)', /List-II \(3\)/.test(await xi()));
  await p.focus('#mol'); const t1 = await E(() => PX.explorer.tau); await p.keyboard.press('ArrowUp'); const t2 = await E(() => PX.explorer.tau);
  const y1 = await E(() => PX.explorer.yaw); await p.keyboard.press('ArrowRight'); const y2 = await E(() => PX.explorer.yaw);
  ok('keyboard: arrow keys turn the bond and the view', t2 === (t1 + 5) % 360 && y2 > y1);
  const box = await (await p.$('#mol')).boundingBox(); await p.mouse.move(box.x + 200, box.y + 200); await p.mouse.down(); await p.mouse.move(box.x + 320, box.y + 240, { steps: 4 }); await p.mouse.up();
  ok('dragging turns the model', await E(() => PX.explorer.yaw) > y2 + 0.5);
  await p.fill('#x_tau', '0'); await p.dispatchEvent('#x_tau', 'input'); await sleep(200);
  await p.click('#x_reset'); await sleep(400);
  ok('explorer reset returns to P\'s oxime', /O can reach C–Br/.test(await xi()) && await E(() => PX.explorer.kind === 'ald' && PX.explorer.geo === 'Z' && PX.explorer.os === 'H'));

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0);
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn'); await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')) && await E(() => PX.calcKeys().length) === 0);

  /* ------------------------------------------------ a custom experiment */
  await E(() => PX.setField('sGeo', 'Z'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 160 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const krv = await E(() => document.getElementById('revealhost').textContent);
  ok('Z-S: S cyclises to (4); no printed option fits, said plainly', /S → 4/.test(krv) && !/ANSWER FOUND/.test(krv), krv.slice(0, 70));
  ok('...every option card fails honestly', await E(() => ['A', 'B', 'C', 'D'].every(k => PX.cards()[k].v === false)) && await E(() => document.getElementById('u_O').classList.contains('warn')));
  ok('the header still answers the question itself', (await p.textContent('#ansval')).trim() === 'B' && (await p.textContent('#ansstripv')).trim() === 'B');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  await p.click('#classbtn');
  await p.click('#themebtn'); await sleep(150); await p.click('#themebtn'); await sleep(150);
  ok('every id is unique', await E(() => { const a = [...document.querySelectorAll('[id]')].map(e => e.id); return a.length === new Set(a).size; }));
  ok('every canvas and chart has an accessible label', await E(() => [...document.querySelectorAll('canvas, svg.chart')].every(e => (e.getAttribute('aria-label') || '').length > 10)));
  ok('every structure drawing has a label', await E(() => [...document.querySelectorAll('#question svg[role=img], #solution svg[role=img]')].every(e => (e.getAttribute('aria-label') || '').length > 8)));
  const xm = await E(async () => { const el = document.getElementById('xinfo'); let n = 0; const mo = new MutationObserver(() => n++); mo.observe(el, { childList: true, subtree: true, characterData: true }); await new Promise(r => setTimeout(r, 2000)); mo.disconnect(); return n; });
  ok('the explorer panel (a live region) is not rewritten while nothing changes', xm === 0, xm + ' mutations in 2 s');
  ok('names under the structures are marked as PrayogX-added, not part of the question', await E(() => { const n = [...document.querySelectorAll('#question .qrow .nm')]; return n.length === 9 && n.every(e => /^PrayogX-added name: /.test(e.textContent)); }));
  ok('the phone caption is not shown on the desktop', await E(() => getComputedStyle(document.getElementById('capm')).display === 'none'));
  ok('the how-to section has all eight steps', await E(() => document.querySelectorAll('#howto .howto > div').length) === 8);
  ok('console clean on the desktop run', errs.length === 0, errs.slice(0, 2).join(' | '));

  /* ------------------------------------------------ phones */
  for (const w of [390, 360]){
    const m = await b.newPage({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
    const me = []; m.on('pageerror', e => me.push(e.message));
    await m.goto(URL); await sleep(500);
    const ov0 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await m.evaluate(() => { PX.speed(20); PX.start(); });
    for (let i = 0; i < 160 && !(await m.evaluate(() => PX.RUN.done)); i++) await sleep(250);
    await sleep(1300);
    const ov1 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_nitro').getBoundingClientRect().height, document.querySelector('#x_geo button').getBoundingClientRect().height, document.getElementById('x_os').getBoundingClientRect().height]);
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('touch-sized controls at ' + w + ' px', tap[0] >= 34 && tap[1] >= 32 && tap[2] >= 32 && tap[3] >= 32, tap.map(Math.round).join('/'));
    await m.evaluate(() => { PX.replay(); PX.speed(3); });
    for (let i = 0; i < 200 && !(await m.evaluate(() => { const s = PX.now(); return s && s.name === 'P' && PX.last().ph && PX.last().ph.phase === 'step'; })); i++) await sleep(80);
    await sleep(300);
    const cap = await m.evaluate(() => { const c = document.getElementById('capm'); return { d: getComputedStyle(c).display, fs: parseFloat(getComputedStyle(c).fontSize), t: c.textContent }; });
    ok('the step caption is repeated as readable text under the canvas at ' + w + ' px', cap.d === 'block' && cap.fs >= 13 && /step \d of 5/.test(cap.t) && cap.t.length > 60, cap.fs + 'px');
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await m.close();
  }
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.evaluate(() => { PX.speed(20); PX.start(); });
  for (let i = 0; i < 160 && !(await rp.evaluate(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1300);
  ok('reduced motion: complete answer, no animation, no confetti', (await rp.textContent('#ansval')).trim() === 'B'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && await rp.evaluate(() => document.querySelectorAll('#revealhost rect[width="8"]').length === 0) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.16',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 16);
  ok('chapter Aldehydes, Ketones and Carboxylic Acids', e && e.chapter === 'Aldehydes, Ketones and Carboxylic Acids');
  ok('verification recorded as script-verified only - no human-verified claim', e && e.verification && e.verification.status === 'verified' && !/human/i.test(JSON.stringify(e.verification)) && e.status !== 'human_verified');
  const DRAFT = e && e.status === 'draft';
  console.log('      (status: ' + (DRAFT ? 'draft - awaiting the owner\'s review' : e && e.status || 'default') + ')');
  ok('meta.json is the manifest entry', e && JSON.stringify(JSON.parse(fs.readFileSync(ROOT + '/' + REL + 'meta.json', 'utf8'))) === JSON.stringify(e));
  const cat = JSON.parse(fs.readFileSync(ROOT + '/content/catalog.json', 'utf8'));
  const idx = JSON.parse(fs.readFileSync(ROOT + '/content/index.json', 'utf8'));
  const lock = JSON.parse(fs.readFileSync(ROOT + '/data/revisions.json', 'utf8'));
  const inSearch = !!JSON.parse(fs.readFileSync(ROOT + '/content/search.json', 'utf8')).text[ID];
  const inSitemap = fs.readFileSync(ROOT + '/sitemap.xml', 'utf8').includes('/s/' + ID + '/');
  if (DRAFT){
    /* a draft is built but not published: nothing public may carry it until the owner's review */
    ok('draft: absent from the catalogue, card index and search text', !(ID in (cat.revisions || {})) && !idx.simulations.some(s => s.id === ID) && !inSearch);
    ok('draft: no detail record, no crawlable page, not in the sitemap', !fs.existsSync(ROOT + '/content/sims/' + ID + '.json') && !fs.existsSync(ROOT + '/s/' + ID) && !inSitemap);
    ok('draft: not in the revision lock (it has never been published)', !(ID in lock));
  } else {
    ok('the catalogue lists it at its revision', cat.revisions && cat.revisions[ID] === e.revision);
    ok('the card index carries it with its path', idx.simulations.some(s => s.id === ID && s.path === REL + 'index.html'));
    ok('its detail record, search text, crawlable page and sitemap entry exist', fs.existsSync(ROOT + '/content/sims/' + ID + '.json') && inSearch && fs.existsSync(ROOT + '/s/' + ID + '/index.html') && inSitemap);
    ok('its crawlable page names the canonical origin', fs.readFileSync(ROOT + '/s/' + ID + '/index.html', 'utf8').includes('https://prayogx.co.in/s/' + ID + '/'));
    const sha = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex');
    ok('the revision lock records this exact file', lock[ID] && lock[ID].sha256 === sha && lock[ID].revision === e.revision);
  }

  /* ------------------------------------------------ Android: real app shell, real feed */
  const net = require('net');
  const freePort = () => new Promise(res => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
  const PS = await freePort(), PA = await freePort();
  const site = spawn('python3', [__dirname + '/corsserve.py', String(PS), ROOT], { stdio: 'ignore' });
  const T = __dirname + '/apptest-q16';
  fs.rmSync(T, { recursive: true, force: true }); fs.mkdirSync(T, { recursive: true });
  for (const f of fs.readdirSync(ROOT + '/app/www')) fs.copyFileSync(ROOT + '/app/www/' + f, T + '/' + f);
  fs.writeFileSync(T + '/config.js', fs.readFileSync(T + '/config.js', 'utf8').replace(/origin:\s*"[^"]+"/, 'origin: "http://127.0.0.1:' + PS + '"'));
  const app = spawn('python3', ['-m', 'http.server', String(PA), '--bind', '127.0.0.1'], { cwd: T, stdio: 'ignore' });
  await sleep(900);
  const actx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await actx.addInitScript(() => {
    window.__ad = [];
    window.Capacitor = { getPlatform: () => 'android', Plugins: { AdMob: {
      initialize: () => Promise.resolve(), showBanner: () => { window.__ad.push('show'); return Promise.resolve(); },
      resumeBanner: () => { window.__ad.push('resume'); return Promise.resolve(); },
      hideBanner: () => { window.__ad.push('hide'); return Promise.resolve(); },
      addListener: () => Promise.resolve({ remove(){} }) } } };
  });
  const a = await actx.newPage(); const ae = []; a.on('pageerror', x => ae.push(x.message));
  await a.goto('http://127.0.0.1:' + PA + '/', { waitUntil: 'networkidle' }); await sleep(1200);
  const pubN = man.simulations.filter(x => x.status !== 'draft').length;
  ok('the app finds the whole published library in the feed', await a.evaluate(() => window.__prayogx.state().sims) === pubN, pubN);
  await a.fill('#q', 'Kemp elimination'); await sleep(700);
  const cardTxt = await a.evaluate(() => [...document.querySelectorAll('.simcard')].map(c => c.innerText).join(' | '));
  const at = await a.evaluate(t => [...document.querySelectorAll('.simcard')].findIndex(c => c.innerText.indexOf(t[0]) >= 0 || c.innerText.indexOf(t[1]) >= 0), [e.title, e.shortTitle]);
  if (DRAFT){
    ok('draft: the app does not list it (the feed does not carry it)', at < 0 && await a.evaluate(() => window.__prayogx.state().sims) === idx.simulations.length, cardTxt.replace(/\s+/g, ' ').slice(0, 80));
  } else {
    ok('app search finds its card', at >= 0, cardTxt.replace(/\s+/g, ' ').slice(0, 80));
    await a.locator('.simcard').nth(Math.max(0, at)).click(); await sleep(600);
    await a.click('#openbtn'); await sleep(2200);
    const inFrame = await a.evaluate(() => { const d = document.getElementById('frame').contentDocument; return d ? { id: (d.querySelector('meta[name=sim-id]') || {}).content, px: typeof d.defaultView.PX } : null; });
    ok('the app opens it from the feed', inFrame && inFrame.id === ID && inFrame.px === 'object', JSON.stringify(inFrame));
    ok('the banner is hidden while it is open', await a.evaluate(() => window.__ad.indexOf('hide') >= 0));
    await a.evaluate(() => window.__prayogx.goBack()); await sleep(500);
    ok('Android back closes it and the banner comes back', await a.evaluate(() => document.getElementById('viewer').hidden
       && Math.max(window.__ad.lastIndexOf('resume'), window.__ad.lastIndexOf('show')) > window.__ad.lastIndexOf('hide')));
  }
  ok('app console clean', ae.length === 0, ae[0]);
  await actx.close(); site.kill(); app.kill();
  fs.rmSync(T, { recursive: true, force: true });

  ok('no page errors anywhere', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  await b.close();
  process.exit(bad ? 1 : 0);
})();
