/* ADV-2026-P1-CHE-Q06 - the chemical identity lab: X, Y and Z (Cl2, NCl3, ClF3).

   Drives the finished page headlessly: the chemistry engine in the page, the
   optional reaction conditions and their honest warnings, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q06.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q06';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q06/';
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
  ok('the answer letter is not written into the page source',
     !/ANS\s*=\s*["'][^"']*\(A\)|QTRUE\s*=\s*\[/.test(src) && /QTRUE = QRUN\.truth/.test(src));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('sections: mission brief, interactive experiment, molecular explorer, detailed solution, how to use',
     /Mission brief/.test(src) && /Interactive experiment/.test(src) && /Molecular explorer/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));

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
  ok('the question stem is reproduced verbatim', qt === 'Q.6 Correct statement(s) about the compounds X, Y and Z is(are)', qt);
  const sch = await E(() => document.getElementById('scheme').textContent.replace(/\s+/g, ' '));
  ok('the three printed reactions, with their conditions', /MnO2 \+ Conc\. HCl/.test(sch) && /MnCl2 \+/.test(sch) && /\(greenish yellow gas\)/.test(sch)
     && /NH3 \+ X/.test(sch) && /Y \+ HCl/.test(sch) && /X \+ F2/.test(sch) && /573 K/.test(sch) && (sch.match(/\(excess\)/g) || []).length === 2, sch.slice(0, 90));
  const opts = (await p.textContent('#opts')).replace(/\s+/g, '');
  ok('the four printed options', opts === '(A)Xisusedforsterilizingdrinkingwater.(B)Yhasaplanarstructure.(C)Zisusedintheenrichmentof235U.(D)YisastrongerLewisbasethanammonia.', opts);

  /* ------------------------------------------------ the chemistry in the page */
  const sci = await E(() => {
    const o = {};
    o.truth = PX.qtrue(); o.ids = PX.qrun().ids; o.x1 = PX.solveX1();
    o.ncl3 = PX.vsepr('NCl3'); o.clf3 = PX.vsepr('ClF3'); o.nh3 = PX.vsepr('NH3');
    const r = D => { const R = PX.run(D); return { T: R.truth.join(''), c: R.complete, ids: R.ids }; };
    const q = PX.Q;
    o.kmno4 = r(Object.assign({}, q, { ox: 'KMnO4' }));
    o.dil = r(Object.assign({}, q, { hcl: 'dil' }));
    o.xsnh3 = r(Object.assign({}, q, { r2: 'xsNH3' }));
    o.eq = r(Object.assign({}, q, { r3f: 'eq' }));
    o.t473 = r(Object.assign({}, q, { r3T: '473' }));
    o.t298 = r(Object.assign({}, q, { r3T: '298' }));
    return o;
  });
  ok('atom balance in the page: MnO2 + 4HCl -> MnCl2 + X + 2H2O gives X = Cl2, and nothing else', sci.x1.length === 1 && sci.x1[0].a === 4 && sci.x1[0].b === 2 && sci.x1[0].X === 'Cl2', JSON.stringify(sci.x1));
  ok('the engine identifies X = Cl2, Y = NCl3, Z = ClF3', sci.ids.X === 'Cl2' && sci.ids.Y === 'NCl3' && sci.ids.Z === 'ClF3');
  ok('VSEPR in the page: NCl3 3 bp + 1 lp, trigonal pyramidal, not planar', sci.ncl3.bp === 3 && sci.ncl3.lp === 1 && /pyramidal/.test(sci.ncl3.geo) && sci.ncl3.planar === false, JSON.stringify(sci.ncl3));
  ok('VSEPR in the page: ClF3 3 bp + 2 lp, T-shaped; NH3 pyramidal', sci.clf3.bp === 3 && sci.clf3.lp === 2 && /T-shaped/.test(sci.clf3.geo) && /pyramidal/.test(sci.nh3.geo));
  ok('the page finds (A), (C) at run time', sci.truth.join(',') === 'A,C' && await E(() => PX.answer()) === '(A), (C)');
  ok('KMnO4 as oxidant: the same X, the same answer', sci.kmno4.c && sci.kmno4.T === 'AC');
  ok('dilute HCl with MnO2: no X, the pathway stops', !sci.dil.c && !sci.dil.ids.X);
  ok('NH3 in excess: N2, not NCl3 - the question pathway is not followed', !sci.xsnh3.c && sci.xsnh3.ids.Y === 'N2');
  ok('F2 not in excess, or 473 K: ClF, not ClF3', !sci.eq.c && sci.eq.ids.Z === 'ClF' && !sci.t473.c && sci.t473.ids.Z === 'ClF');
  ok('298 K: no Z at all', !sci.t298.c && !sci.t298.ids.Z);

  /* ------------------------------------------------ before the run */
  ok('the header answer starts locked', /Investigating X, Y and Z/.test(await p.textContent('#ansval')) && await E(() => document.getElementById('answerbox').classList.contains('locked')));
  ok('the answer is shown nowhere before the run', !/CORRECT OPTIONS|ANSWER FOUND|Supported statements/.test(await E(() => document.body.innerText)));
  ok('the solution is locked', await E(() => document.getElementById('solbody').hidden && !document.getElementById('solgate').hidden));
  ok('the unknowns start as ?', await E(() => ['X', 'Y', 'Z'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['ox', 'hcl', 'r2', 'r3f', 'r3T'].map(k => document.getElementById('in_' + k).value));
  ok('every condition is pre-set to the question', vals.join(',') === 'MnO2,conc,xsCl2,xsF2,573', vals.join(','));
  ok('status reads QUESTION VALUES LOADED', /QUESTION VALUES LOADED/.test(await p.textContent('#status')));
  ok('START reads START EXPERIMENT', /START EXPERIMENT/.test(await p.textContent('#gobtn')));
  ok('guidance says to set values or use the defaults', /Set your values or use the question defaults/.test(await p.textContent('#guide')));

  /* ------------------------------------------------ optional conditions */
  await E(() => PX.setField('r2', 'xsNH3'));
  ok('changing a condition switches to USING CUSTOM VALUES', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  ok('...with an honest warning that the question pathway changes', /excess Cl₂/.test(await p.textContent('#condwarn')) && await E(() => !document.getElementById('condwarn').hidden));
  await E(() => PX.setField('r3T', '298'));
  ok('each changed condition adds its own warning', (await p.textContent('#condwarn')).split('⚠').length - 1 >= 2);
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['ox', 'hcl', 'r2', 'r3f', 'r3T'].map(k => document.getElementById('in_' + k).value))).join(',') === 'MnO2,conc,xsCl2,xsF2,573'
     && /QUESTION VALUES LOADED/.test(await p.textContent('#status')) && await E(() => document.getElementById('condwarn').hidden));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question conditions', await E(() => PX.RUN.state) === 'running' && await E(() => PX.RUN.D.r2 === 'xsCl2' && PX.RUN.D.r3T === '573'));
  ok('status: preparing experiment', /Preparing experiment/.test(await p.textContent('#xstattxt')));
  ok('conditions lock while it runs', await E(() => document.getElementById('in_ox').disabled));
  ok('the answer panel narrates: Analyzing Reaction 1', /Analyzing Reaction 1/.test(await p.textContent('#ansval')));
  await sleep(2600);
  ok('status: experiment running; gas is flowing', /Experiment running/.test(await p.textContent('#xstattxt')) && /flowing|—/.test(await p.textContent('#g_gf')));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [], msgs = new Set();
  for (let i = 0; i < 600; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansval').textContent, col: document.getElementById('g_col').textContent, T: document.getElementById('g_T').textContent, shp: document.getElementById('g_shape').textContent, x: document.querySelector('#u_X .v').textContent }));
    seen.add(s.st); live.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all nine stages', ['genX', 'obsX', 'idX', 'formY', 'anaY', 'formZ', 'anaZ', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer panel steps through every investigation message', ['Analyzing Reaction 1', 'Identifying X', 'Analyzing Reaction 2', 'Identifying Y', 'Analyzing Reaction 3', 'Identifying Z', 'Testing statements', 'Calculating final result'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)), [...msgs].join(' / ').slice(0, 160));
  ok('live data: greenish-yellow is observed at station 1', live.some(s => s.now && s.now.name === 'obsX' && /greenish-yellow/.test(s.col)));
  ok('live data: the chamber heats up to 573 K', live.some(s => s.now && s.now.name === 'formZ' && s.T === '573 K') && live.some(s => s.now && s.now.name === 'formZ' && /^(29\d|3\d\d|4\d\d|5[0-6]\d) K$/.test(s.T)));
  ok('live data: the shapes found are trigonal pyramidal and T-shaped', live.some(s => /pyramidal/.test(s.shp)) && live.some(s => /T-shaped/.test(s.shp)));
  ok('X is unknown until the gas has been analysed', live.some(s => s.now && s.now.name === 'genX' && s.x === '?') && live.some(s => s.now && s.now.name === 'idX' && s.x === 'Cl₂'));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'r1,x,a,r2,b,d,r3,c,board,match', (await E(() => PX.calcKeys())).join(','));
  ok('the three unknowns are identified on the case file', await E(() => ['X', 'Y', 'Z'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(',')) === 'Cl₂,NCl₃,ClF₃'
     && await E(() => ['X', 'Y', 'Z'].every(k => document.getElementById('u_' + k).classList.contains('found'))));
  ok('evidence table: three rows', await E(() => document.querySelectorAll('#log tbody tr').length) === 3);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('option board: A supported, B not, C supported, D not', cards.A === true && cards.B === false && cards.C === true && cards.D === false, JSON.stringify(cards));
  ok('the board cards are coloured by verdict', await E(() => document.getElementById('oc_A').classList.contains('yes') && document.getElementById('oc_B').classList.contains('no') && document.getElementById('oc_C').classList.contains('yes') && document.getElementById('oc_D').classList.contains('no')));
  ok('all five badges are earned', JSON.stringify(await E(() => PX.badges())) === JSON.stringify({ det: true, geo: true, lew: true, hot: true, mas: true }) && await E(() => document.querySelectorAll('.badge.on').length) === 5);
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: atom balance, pyramidal, weaker base, T-shaped, answer', /X = Cl₂/.test(cl) && /trigonal pyramidal/.test(cl) && /weaker/.test(cl) && /T-shaped/.test(cl) && /Supported statements: \(A\), \(C\)/.test(cl));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, CORRECT OPTIONS (A), (C)', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /CORRECT OPTIONS/.test(rv) && /\(A\), \(C\)/.test(rv), rv.slice(0, 80));
  ok('...with X, Y, Z and the closing line', /X = Cl₂/.test(rv) && /Y = NCl₃/.test(rv) && /Z = ClF₃/.test(rv) && /You successfully identified all three compounds/.test(rv));
  ok('the header unlocks to (A), (C)', (await p.textContent('#ansval')).trim() === '(A), (C)');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution unlocks with the answer', await E(() => !document.getElementById('solbody').hidden) && /\(A\), \(C\)/.test(await p.textContent('#solans')) && /0\.65 Å/.test(await p.textContent('#solbody')));
  ok('the options are marked: A, C correct; B, D not', await E(() => ['A', 'C'].every(k => document.querySelector('#opts li[data-k="' + k + '"]').classList.contains('correct')) && ['B', 'D'].every(k => document.querySelector('#opts li[data-k="' + k + '"]').classList.contains('wrong'))));
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));

  /* ------------------------------------------------ tools and the molecular explorer */
  await p.click('#t_eq'); await p.click('#t_why'); await sleep(150);
  ok('SHOW EQUATION and SHOW WHY? toggle', await E(() => PX.RUN && document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_why').getAttribute('aria-pressed') === 'true'));
  await p.click('#t_eq'); await p.click('#t_why');
  await p.click('.xpick button[data-m="ClF3"]'); await sleep(150);
  ok('explorer: ClF3 shows T-shaped, trigonal bipyramidal electron geometry', /T-shaped/.test(await p.textContent('#xinfo')) && /trigonal bipyramidal/.test(await p.textContent('#xinfo')));
  const y0 = await E(() => PX.explorer.yaw);
  await p.click('#x_spin');
  const bb = await (await p.$('#mol')).boundingBox();
  await p.mouse.move(bb.x + 200, bb.y + 200); await p.mouse.down(); await p.mouse.move(bb.x + 320, bb.y + 230, { steps: 6 }); await p.mouse.up();
  ok('explorer: drag rotates the molecule', Math.abs(await E(() => PX.explorer.yaw) - y0) > 0.5);
  await p.focus('#mol'); const y1 = await E(() => PX.explorer.yaw); await p.keyboard.press('ArrowRight');
  ok('explorer: arrow keys rotate it too', Math.abs(await E(() => PX.explorer.yaw) - y1 - 0.15) < 1e-6);
  await p.click('#x_reset'); ok('explorer: reset view', await E(() => PX.explorer.yaw === 0.6 && PX.explorer.zoom === 1));
  await p.click('#t_cmp'); await sleep(150);
  ok('COMPARE NH3 vs NCl3 explains the weaker base', await E(() => PX.explorer.cmp) && /weaker Lewis base/.test(await p.textContent('#xinfo')));
  await p.click('.xpick button[data-m="NH3"]'); await p.click('#x_spin');

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0 && await E(() => document.querySelector('#u_X .v').textContent) === '?');
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ custom experiments */
  await E(() => PX.setField('ox', 'KMnO4'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  ok('KMnO4 run: the same three compounds and (A), (C)', /\(A\), \(C\)/.test(await E(() => document.getElementById('revealhost').textContent)) && /KMnO₄/.test(await E(() => document.getElementById('revealhost').textContent)));
  await p.click('#resetq');
  await E(() => PX.setField('r2', 'xsNH3'));
  await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const crv = await E(() => document.getElementById('revealhost').textContent);
  ok('NH3-excess run: the reveal says the question pathway does not apply', /PATHWAY/.test(crv) && !/ANSWER FOUND/.test(crv), crv.slice(0, 60));
  ok('...Y is flagged, not claimed', await E(() => document.getElementById('u_Y').classList.contains('warn')) && await E(() => !PX.badges().mas));
  ok('the header still answers the question itself', (await p.textContent('#ansval')).trim() === '(A), (C)');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  ok('and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 19);
  await p.click('#classbtn');
  await p.click('#revealnow'); await sleep(100);
  ok('Reveal anyway opens the answer without the run', (await p.textContent('#ansval')).trim() === '(A), (C)');
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
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_ox').getBoundingClientRect().height, document.querySelector('.xpick button').getBoundingClientRect().height]);
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('touch-sized controls at ' + w + ' px', tap[0] >= 34 && tap[1] >= 32 && tap[2] >= 32, tap.map(Math.round).join('/'));
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await m.close();
  }
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.evaluate(() => { PX.speed(20); PX.start(); });
  for (let i = 0; i < 80 && !(await rp.evaluate(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1300);
  ok('reduced motion: complete answer, no animation, no confetti', (await rp.textContent('#ansval')).trim() === '(A), (C)'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && await rp.evaluate(() => document.querySelectorAll('#revealhost rect[width="8"]').length === 0) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.6',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 6);
  ok('chapter The p-Block Elements (Group 17)', e && e.chapter === 'The p-Block Elements (Group 17)');
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
  const T = __dirname + '/apptest-q06';
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
  await a.fill('#q', 'interhalogen'); await sleep(700);
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
