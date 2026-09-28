/* ADV-2026-P1-CHE-Q11 - the two-flask carbonyl lab: beta-keto acid decarboxylation and a cyclic anhydride, mechanisms at two levels.

   Drives the finished page headlessly: the chemistry engine in the page, the
   optional reaction conditions and their honest warnings, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q11.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q11';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q11/';
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
     /var ANS = QRUN\.answer/.test(src) && /answer: String\(sum\)/.test(js) && !/ANS\s*=\s*["']|answer:\s*["']\d|= 4["']|1 \+ 3 = 4/.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('sections: mission brief, interactive experiment, mechanism explorer, detailed solution, how to use',
     /Mission brief/.test(src) && /Interactive experiment/.test(src) && /Mechanism explorer/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [], reqs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  p.on('request', r => reqs.push(r.url()));
  await p.goto(URL); await sleep(700);
  const E = (f, a) => p.evaluate(f, a);

  ok('it loads with no request beyond the file itself', reqs.every(u => u.startsWith('file:')), reqs.length + ' requests');
  const qt = (await p.textContent('#question .qtext')).replace(/\s+/g, ' ').trim();
  ok('the question is reproduced verbatim', qt === 'Q.11 The sum of total number of carbonyl groups ( >C=O ) present in the major products X and Y in the following reactions is ____.', qt.slice(0, 80));
  ok('the two reactions are drawn, with the wedged cis ring bonds', await p.evaluate(() => { const s = document.getElementById('scheme'); return !!s && s.querySelectorAll('path').length >= 10 && /cis/.test(s.getAttribute('aria-label')); }));

  /* ------------------------------------------------ the chemistry in the page */
  const sci = await E(() => {
    const o = {}, q = PX.qrun();
    o.ans = PX.answer(); o.cX = q.cX; o.cY = q.cY; o.cX0 = q.cX0; o.cY0 = q.cY0; o.fx = q.fx; o.fy = q.fy; o.nCO2 = q.nCO2; o.nH2O = q.nH2O;
    o.xk = q.xs.map(s => s.kind).join(','); o.yk = q.ys.map(s => s.kind).join(',');
    o.xa = q.xs.map(s => s.arrows.length).join(','); o.ya = q.ys.map(s => s.arrows.length).join(',');
    o.valid = q.xs.concat(q.ys).every(s => s.ok && PX.valid(s.A) && PX.valid(s.B));
    o.pushed = q.xs.concat(q.ys).every(s => JSON.stringify(PX.push(s.A, s.arrows).b) === JSON.stringify(s.B.b));
    o.coTrail = [q.X0].concat(q.xs.map(s => s.B)).map(m => PX.coBonds(m, PX.mainFrag(m)).length).join(',');
    o.coTrailY = [q.Y0].concat(q.ys.map(s => s.B)).map(m => PX.coBonds(m, PX.mainFrag(m)).length).join(',');
    o.noDecY = PX.findDecarb(q.Y0) === null; o.noAnhX = PX.findAnh(q.X0) === null;
    const r = D => { const R = PX.run(D); return { a: R.answer, c: R.complete, x: R.cX, y: R.cY, f: R.fx }; };
    o.plain = r({ xs: 'plain', ys: 'cis', heat: 'heat' }); o.gamma = r({ xs: 'gamma', ys: 'cis', heat: 'heat' });
    o.trans = r({ xs: 'q', ys: 'trans', heat: 'heat' }); o.rt = r({ xs: 'q', ys: 'cis', heat: 'rt' });
    return o;
  });
  ok('the page finds 1 + 3 = 4 at run time', sci.ans === '4' && sci.cX === 1 && sci.cY === 3, sci.ans);
  ok('both reactants start with 3 C=O', sci.cX0 === 3 && sci.cY0 === 3);
  ok('flask 1: decarboxylation, tautomerism (2 steps), twice; 2 CO2', sci.xk === 'decarb,taut1,taut2,decarb,taut1,taut2' && sci.nCO2 === 2, sci.xk);
  ok('flask 2: attack, proton transfer, elimination; 1 H2O', sci.yk === 'attack,pt,elim' && sci.nH2O === 1, sci.yk);
  ok('curved arrows per step: 3 around each cyclic TS, 3 then 2 for tautomerism, 2 each for the anhydride', sci.xa === '3,3,2,3,3,2' && sci.ya === '2,2,2', sci.xa + ' / ' + sci.ya);
  ok('every intermediate is chemically valid and charge is conserved', sci.valid);
  ok('every product state is exactly what its arrows produce (products are pushed, not drawn)', sci.pushed);
  ok('C=O trail in flask 1: 3 → 1 → 2 → 2 → 0 → 1 → 1 (enols have none, the oxocarbenium has one)', sci.coTrail === '3,1,2,2,0,1,1', sci.coTrail);
  ok('C=O trail in flask 2: 3 → 2 → 2 → 3', sci.coTrailY === '3,2,2,3', sci.coTrailY);
  ok('X = C5H10O, Y = C7H6O4', sci.fx === 'C₅H₁₀O' && sci.fy === 'C₇H₆O₄', sci.fx + ' ' + sci.fy);
  ok('Y has no beta-keto acid; X has no 1,2-diacid', sci.noDecY && sci.noAnhX);
  ok('no methyls: acetone, still 4, flagged; gamma-keto acid: 6; trans: 4 but flagged; no heat: 6', sci.plain.a === '4' && sci.plain.f === 'C₃H₆O' && !sci.plain.c && sci.gamma.a === '6' && sci.trans.a === '4' && !sci.trans.c && sci.rt.a === '6');

  /* ------------------------------------------------ before the run */
  ok('the header answer starts locked', /Investigating X and Y/.test(await p.textContent('#ansval')) && await E(() => document.getElementById('answerbox').classList.contains('locked')));
  ok('the answer is shown nowhere before the run', !/ANSWER FOUND|X \+ Y = 4|1 \+ 3 = 4/.test(await E(() => document.body.innerText)) && await E(() => document.getElementById('solbody').hidden));
  ok('the solution is locked', await E(() => document.getElementById('solbody').hidden && !document.getElementById('solgate').hidden));
  ok('the unknowns start as ?', await E(() => ['A', 'B', 'R'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['xs', 'ys', 'heat'].map(k => document.getElementById('in_' + k).value));
  ok('every value is pre-set to the question', vals.join(',') === 'q,cis,heat', vals.join(','));
  ok('status reads QUESTION VALUES LOADED', /QUESTION VALUES LOADED/.test(await p.textContent('#status')));
  ok('START reads START EXPERIMENT', /START EXPERIMENT/.test(await p.textContent('#gobtn')));
  ok('guidance says to set values or use the defaults', /Set your values or use the question defaults/.test(await p.textContent('#guide')));

  /* ------------------------------------------------ optional conditions */
  await E(() => PX.setField('ys', 'trans'));
  ok('changing a value switches to USING CUSTOM VALUES', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  ok('...with an honest warning about the cis drawing', /cis/.test(await p.textContent('#condwarn')));
  await E(() => PX.setField('heat', 'rt'));
  ok('no heat is flagged too', /heat/.test(await p.textContent('#condwarn')));
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['xs', 'ys', 'heat'].map(k => document.getElementById('in_' + k).value))).join(',') === 'q,cis,heat'
     && /QUESTION VALUES LOADED/.test(await p.textContent('#status')) && await E(() => document.getElementById('condwarn').hidden));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question values', await E(() => PX.RUN.state) === 'running' && await E(() => PX.RUN.D.xs === 'q' && PX.RUN.D.ys === 'cis'));
  ok('status: preparing experiment', /Preparing experiment/.test(await p.textContent('#xstattxt')));
  ok('values lock while it runs', await E(() => document.getElementById('in_xs').disabled));
  ok('the answer panel narrates: Loading the two flasks', /Loading the two flasks/.test(await p.textContent('#ansval')));
  await sleep(2600);
  ok('status: experiment running; the flasks heat up', /Experiment running/.test(await p.textContent('#xstattxt')) && parseInt(await p.textContent('#g_T'), 10) > 25);
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [], msgs = new Set();
  for (let i = 0; i < 900; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansval').textContent, co2: document.getElementById('g_n1').textContent, h2o: document.getElementById('g_n2').textContent, co: document.getElementById('g_vol').textContent, ar: document.getElementById('g_p').textContent, rt: document.querySelector('#u_R .v').textContent }));
    seen.add(s.st); live.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all ten stages', ['load', 'x1', 'x2', 'x3', 'x4', 'y1', 'y2', 'y3', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer panel steps through every message', ['Loading the two flasks', 'first decarboxylation', 'enol → ketone', 'second decarboxylation', 'enol → ketone again', 'nucleophilic attack', 'proton transfer', 'water leaves', 'Auditing the traps', 'Calculating final result'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)), [...msgs].join(' / ').slice(0, 160));
  const co2 = live.filter(s => s.now && /^x/.test(s.now.name)).map(s => +s.co2);
  ok('macroscopic and molecular levels in step: CO2 in the limewater climbs 0 → 1 → 2 during the decarboxylations', co2.every((v, i) => !i || v >= co2[i - 1]) && co2.indexOf(0) >= 0 && co2.indexOf(1) >= 0 && co2[co2.length - 1] === 2);
  ok('...and water appears only when the anhydride closes', live.filter(s => s.now && (s.now.name === 'y1' || s.now.name === 'y2')).every(s => s.h2o === '0') && live.some(s => s.now && s.now.name === 'y3' && s.h2o === '1'));
  const cos = new Set(live.filter(s => s.now && /^[xy]\d/.test(s.now.name)).map(s => s.co));
  ok('the live C=O gauge follows the molecule: 3, 1, 2, 0 and back to 1 in flask 1', ['3', '1', '2', '0'].every(v => cos.has(v)), [...cos].join(','));
  ok('the arrow gauge shows 3 pairs in a decarboxylation and 2 in the anhydride steps', live.some(s => s.now && s.now.name === 'x1' && s.ar === '3') && live.some(s => s.now && s.now.name === 'y1' && s.ar === '2'));
  ok('the sum is unknown until Y is made', live.some(s => s.now && s.now.name === 'y2' && s.rt === '?') && live.some(s => s.now && s.now.name === 'test' && s.rt === '4'));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'load,x1,x2,x3,x4,y1,y2,y3,c,d,match', (await E(() => PX.calcKeys())).join(','));
  ok('the case file: 1, 3, 4', await E(() => ['A', 'B', 'R'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(',')) === '1,3,4');
  ok('the evidence table has one row per mechanistic step (9)', await E(() => document.querySelectorAll('#log tbody tr').length) === 9);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('audit: X holds, Y holds, both traps fail', cards.A === true && cards.B === true && cards.C === false && cards.D === false, JSON.stringify(cards));
  ok('all six badges are earned', await E(() => ['dec', 'taut', 'nuc', 'anh', 'trap', 'mas'].every(k => PX.badges()[k])) && await E(() => document.querySelectorAll('.badge.on').length) === 6);
  ok('both charts are drawn from the molecules (2 series each)', await E(() => document.querySelectorAll('#curve path').length === 2 && document.querySelectorAll('#curve circle').length === 11 && document.querySelectorAll('#bars path').length === 2));
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: β-keto acid, CO2 into limewater, X = C5H10O, Y = C7H6O4, 1 + 3', /β-keto acid found/.test(cl) && /limewater/.test(cl) && /C₅H₁₀O/.test(cl) && /C₇H₆O₄/.test(cl) && /1 \+ 3 = 4/.test(cl));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, X + Y = 4', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /X \+ Y = 4/.test(rv), rv.slice(0, 80));
  ok('...with the CO2, the water and the sum as graffiti', /−2 CO₂/.test(rv) && /−1 H₂O/.test(rv) && /1 \+ 3 = 4/.test(rv));
  ok('the header unlocks to 4', (await p.textContent('#ansval')).trim() === '4');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution unlocks with the answer', await E(() => !document.getElementById('solbody').hidden) && (await p.textContent('#solans')) === '4' && /pentan-3-one/.test(await p.textContent('#solbody')));
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));

  /* ------------------------------------------------ tools and the mechanism explorer */
  await p.click('#t_eq'); await p.click('#t_why'); await sleep(150);
  ok('SHOW EQUATION and SHOW WHY? toggle', await E(() => document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_why').getAttribute('aria-pressed') === 'true'));
  await p.click('#t_eq'); await p.click('#t_why');
  await p.click('#t_cmp');
  ok('SLOW MOTION sets half speed', await E(() => PX.RUN.speed) === 0.5);
  await p.click('#t_cmp');
  ok('explorer starts on decarboxylation 1 with 3 arrows and 3 C=O', /Decarboxylation 1/.test(await p.textContent('#xinfo')) && /moved<\/th><td>3/.test(await E(() => document.getElementById('xinfo').innerHTML)) && /now<\/th><td><b>3/.test(await E(() => document.getElementById('xinfo').innerHTML)));
  await p.click('#x_next'); await sleep(100);
  ok('NEXT finishes the step: CO2 gone, 1 C=O left in the enol acid', /now<\/th><td><b>1/.test(await E(() => document.getElementById('xinfo').innerHTML)) && /result/.test(await p.textContent('#x_uv')));
  await p.click('#x_next'); await sleep(100);
  ok('NEXT again moves to tautomerism', /Tautomerism \(i\)/.test(await p.textContent('#xinfo')));
  await p.selectOption('#x_rx', 'y'); await sleep(100);
  await E(() => { const s = document.getElementById('x_u'); s.value = 100; s.dispatchEvent(new Event('input')); });
  ok('flask 2 in the explorer: the attack leaves an O⁻ and an O⁺, 2 C=O', /Nucleophilic attack/.test(await p.textContent('#xinfo')) && /O⁺/.test(await p.textContent('#xinfo')) && /O⁻/.test(await p.textContent('#xinfo')) && /now<\/th><td><b>2/.test(await E(() => document.getElementById('xinfo').innerHTML)));
  await p.click('#x_reset');
  ok('explorer reset returns to flask 1, step 1', /Decarboxylation 1/.test(await p.textContent('#xinfo')) && await E(() => document.getElementById('x_rx').value) === 'x');

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0 && await E(() => document.querySelector('#u_R .v').textContent) === '?');
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ custom experiments */
  await E(() => PX.setField('ys', 'trans'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const krv = await E(() => document.getElementById('revealhost').textContent);
  ok('trans diacid: no anhydride, no water, reported as not the question', /1 \+ 3 = 4/.test(krv) && /not the question/.test(krv) && !/ANSWER FOUND/.test(krv) && (await p.textContent('#g_n2')) === '0', krv.slice(0, 70));
  ok('...card ② fails honestly (no anhydride)', await E(() => PX.cards().B.v === false && /Trans/.test(PX.cards().B.ev)));
  await p.click('#resetq');
  await E(() => PX.setField('xs', 'gamma'));
  await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const crv = await E(() => document.getElementById('revealhost').textContent);
  ok('gamma-keto acid: no CO2, 3 + 3 = 6, said plainly', /3 \+ 3 = 6/.test(crv) && !/ANSWER FOUND/.test(crv) && (await p.textContent('#g_n1')) === '0', crv.slice(0, 60));
  ok('...the sum tile is flagged, not claimed', await E(() => document.getElementById('u_R').classList.contains('warn')) && await E(() => !PX.badges().mas));
  ok('the header still answers the question itself', (await p.textContent('#ansval')).trim() === '4');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  ok('and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 19);
  await p.click('#classbtn');
  await p.click('#revealnow'); await sleep(100);
  ok('Reveal anyway opens the answer without the run', (await p.textContent('#ansval')).trim() === '4');
  await p.click('#themebtn'); await sleep(150); await p.click('#themebtn'); await sleep(150);
  ok('every id is unique', await E(() => { const a = [...document.querySelectorAll('[id]')].map(e => e.id); return a.length === new Set(a).size; }));
  ok('every canvas and chart has an accessible label', await E(() => [...document.querySelectorAll('canvas, svg[role=img]')].every(e => (e.getAttribute('aria-label') || '').length > 10)));
  ok('the how-to section has all eight steps', await E(() => document.querySelectorAll('#howto .howto > div').length) === 8);
  ok('console clean on the desktop run', errs.length === 0, errs.slice(0, 2).join(' | '));

  /* ------------------------------------------------ phones */
  for (const w of [390, 360]){
    const m = await b.newPage({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
    const me = []; m.on('pageerror', e => me.push(e.message));
    await m.goto(URL); await sleep(400);
    const ov0 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await m.evaluate(() => { PX.speed(20); PX.start(); });
    for (let i = 0; i < 80 && !(await m.evaluate(() => PX.RUN.done)); i++) await sleep(250);
    await sleep(1300);
    const ov1 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_xs').getBoundingClientRect().height, document.getElementById('x_next').getBoundingClientRect().height, document.getElementById('x_rx').getBoundingClientRect().height]);
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('touch-sized controls at ' + w + ' px', tap[0] >= 34 && tap[1] >= 32 && tap[2] >= 32 && tap[3] >= 32, tap.map(Math.round).join('/'));
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await m.close();
  }
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.evaluate(() => { PX.speed(20); PX.start(); });
  for (let i = 0; i < 80 && !(await rp.evaluate(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1300);
  ok('reduced motion: complete answer, no animation, no confetti', (await rp.textContent('#ansval')).trim() === '4'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && await rp.evaluate(() => document.querySelectorAll('#revealhost rect[width="8"]').length === 0) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.11',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 11);
  ok('chapter Aldehydes, Ketones and Carboxylic Acids', e && e.chapter === 'Aldehydes, Ketones and Carboxylic Acids');
  ok('meta.json is the manifest entry', e && JSON.stringify(JSON.parse(fs.readFileSync(ROOT + '/' + REL + 'meta.json', 'utf8'))) === JSON.stringify(e));
  const cat = JSON.parse(fs.readFileSync(ROOT + '/content/catalog.json', 'utf8'));
  ok('the catalogue lists it at its revision', cat.revisions && cat.revisions[ID] === e.revision);
  const idx = JSON.parse(fs.readFileSync(ROOT + '/content/index.json', 'utf8'));
  ok('the card index carries it with its path', idx.simulations.some(s => s.id === ID && s.path === REL + 'index.html'));
  ok('its detail record, search text, crawlable page and sitemap entry exist', fs.existsSync(ROOT + '/content/sims/' + ID + '.json')
     && !!JSON.parse(fs.readFileSync(ROOT + '/content/search.json', 'utf8')).text[ID]
     && fs.existsSync(ROOT + '/s/' + ID + '/index.html') && fs.readFileSync(ROOT + '/sitemap.xml', 'utf8').includes('/s/' + ID + '/'));
  const lock = JSON.parse(fs.readFileSync(ROOT + '/data/revisions.json', 'utf8'));
  const sha = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex');
  ok('the revision lock records this exact file', lock[ID] && lock[ID].sha256 === sha && lock[ID].revision === e.revision);

  /* ------------------------------------------------ Android: real app shell, real feed */
  const net = require('net');
  const freePort = () => new Promise(res => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
  const PS = await freePort(), PA = await freePort();
  const site = spawn('python3', [__dirname + '/corsserve.py', String(PS), ROOT], { stdio: 'ignore' });
  const T = __dirname + '/apptest-q11';
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
  ok('the app finds the whole library in the feed', await a.evaluate(() => window.__prayogx.state().sims) === man.simulations.length, man.simulations.length);
  await a.fill('#q', 'decarboxylation'); await sleep(700);
  const cardTxt = await a.evaluate(() => [...document.querySelectorAll('.simcard')].map(c => c.innerText).join(' | '));
  /* search can match more than one simulation as the library grows: open this one by its own title */
  const at = await a.evaluate(t => [...document.querySelectorAll('.simcard')].findIndex(c => c.innerText.indexOf(t[0]) >= 0 || c.innerText.indexOf(t[1]) >= 0), [e.title, e.shortTitle]);
  ok('app search finds its card', at >= 0, cardTxt.replace(/\s+/g, ' ').slice(0, 80));
  await a.locator('.simcard').nth(Math.max(0, at)).click(); await sleep(600);
  await a.click('#openbtn'); await sleep(2200);
  const inFrame = await a.evaluate(() => { const d = document.getElementById('frame').contentDocument; return d ? { id: (d.querySelector('meta[name=sim-id]') || {}).content, px: typeof d.defaultView.PX } : null; });
  ok('the app opens it from the feed', inFrame && inFrame.id === ID && inFrame.px === 'object', JSON.stringify(inFrame));
  ok('the banner is hidden while it is open', await a.evaluate(() => window.__ad.indexOf('hide') >= 0));
  await a.evaluate(() => window.__prayogx.goBack()); await sleep(500);
  ok('Android back closes it and the banner comes back', await a.evaluate(() => document.getElementById('viewer').hidden
     && Math.max(window.__ad.lastIndexOf('resume'), window.__ad.lastIndexOf('show')) > window.__ad.lastIndexOf('hide')));
  ok('app console clean', ae.length === 0, ae[0]);
  await actx.close(); site.kill(); app.kill();
  fs.rmSync(T, { recursive: true, force: true });

  ok('no page errors anywhere', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  await b.close();
  process.exit(bad ? 1 : 0);
})();
