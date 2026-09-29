/* ADV-2026-P1-CHE-Q10 - the isomer assembly lab: K[M(NCS)(NO2)(gly)], square planar.

   Drives the finished page headlessly: the chemistry engine in the page, the
   optional reaction conditions and their honest warnings, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q10.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium, launch } = require('./_browser');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q10';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q10/';
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
     /var ANS = QRUN\.answer/.test(src) && /answer: String\(N\)/.test(js) && !/ANS\s*=\s*["']|answer:\s*["']\d|["']8 ISOMERS|4 × 2 = 8/.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('sections: mission brief, interactive experiment, isomer explorer, detailed solution, how to use',
     /Mission brief/.test(src) && /Interactive experiment/.test(src) && /Isomer explorer/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));

  const b = await launch();
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
  ok('the question is reproduced verbatim', qt === 'Q.10 The total number of all possible isomers for the square planar complex with formula K[M(NCS)(NO2)(gly)] is ____. (M = metal ion and gly = NH2CH2COO– )', qt.slice(0, 80));

  /* ------------------------------------------------ the stereochemistry in the page */
  const sci = await E(() => {
    const o = {}, q = PX.qrun();
    o.ans = PX.answer(); o.N = q.N; o.raw = q.raw.length; o.sets = q.nSets; o.per = q.perSet.join(','); o.chiral = q.chiral;
    o.seats = q.iso.map(i => i.seats).join(','); o.names = q.iso.map(i => i.set + ': ' + i.name);
    o.sq = PX.geom.sq.proper.length; o.td = PX.geom.td.proper.length;
    o.same = PX.canon(['gO', 'NCS', 'NO2', 'gN'], 'sq') === PX.canon(PX.act([1, 2, 3, 0], ['gO', 'NCS', 'NO2', 'gN']), 'sq');
    o.diff = PX.canon(['gO', 'NCS', 'NO2', 'gN'], 'sq') !== PX.canon(['gO', 'NO2', 'NCS', 'gN'], 'sq');
    const r = D => { const R = PX.run(D); return { a: R.answer, c: R.complete, ch: R.chiral }; };
    o.td8 = r({ geom: 'td', x: 'NCS', y: 'NO2', ch: 'gly' }); o.acac = r({ geom: 'sq', x: 'NCS', y: 'NO2', ch: 'acac' });
    o.cl = r({ geom: 'sq', x: 'Cl', y: 'NO2', ch: 'gly' }); o.hal = r({ geom: 'sq', x: 'Cl', y: 'Br', ch: 'gly' });
    return o;
  });
  ok('the page counts 8 isomers at run time', sci.ans === '8' && sci.N === 8, sci.ans);
  ok('it builds all 64 seatings and folds them with the 8 rotations of a square (12 for a tetrahedron)', sci.raw === 64 && sci.sq === 8 && sci.td === 12);
  ok('4 linkage sets x 2 geometric isomers, none chiral; every isomer seen 8 times', sci.sets === 4 && sci.per === '2,2,2,2' && sci.chiral === 0 && sci.seats === '8,8,8,8,8,8,8,8');
  ok('turning the molecule keeps the isomer; swapping two ligands changes it', sci.same && sci.diff);
  ok('each pair within a set differs in what is trans to the glycinate N', sci.names.filter(n => /trans to N\(gly\)/.test(n)).length === 8 && new Set(sci.names).size === 8);
  ok('tetrahedral: 8 again but all chiral, flagged as not the question', sci.td8.a === '8' && sci.td8.ch === 8 && !sci.td8.c);
  ok('symmetrical chelate gives 4; Cl- for NCS- gives 4; two halides give 2', sci.acac.a === '4' && sci.cl.a === '4' && sci.hal.a === '2');

  /* ------------------------------------------------ before the run */
  ok('the header answer starts locked', /Investigating the isomers/.test(await p.textContent('#ansval')) && await E(() => document.getElementById('answerbox').classList.contains('locked')));
  ok('the answer is shown nowhere before the run', !/ANSWER FOUND|8 ISOMERS|4 × 2 = 8/.test(await E(() => document.body.innerText)) && await E(() => document.getElementById('solbody').hidden));
  ok('the solution is locked', await E(() => document.getElementById('solbody').hidden && !document.getElementById('solgate').hidden));
  ok('the unknowns start as ?', await E(() => ['A', 'B', 'R'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['geom', 'x', 'y', 'ch'].map(k => document.getElementById('in_' + k).value));
  ok('every value is pre-set to the question', vals.join(',') === 'sq,NCS,NO2,gly', vals.join(','));
  ok('status reads QUESTION VALUES LOADED', /QUESTION VALUES LOADED/.test(await p.textContent('#status')));
  ok('START reads START EXPERIMENT', /START EXPERIMENT/.test(await p.textContent('#gobtn')));
  ok('guidance says to set values or use the defaults', /Set your values or use the question defaults/.test(await p.textContent('#guide')));
  ok('the explorer does not show the catalogue before it is asked for', /press SHOW ALL ISOMERS/.test(await p.textContent('#xinfo')));

  /* ------------------------------------------------ optional conditions */
  await E(() => PX.setField('geom', 'td'));
  ok('changing a value switches to USING CUSTOM VALUES', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  ok('...with an honest warning', /question says <b>square planar|question says square planar/.test(await E(() => document.getElementById('condwarn').innerText + document.getElementById('condwarn').innerHTML)));
  await E(() => PX.setField('ch', 'acac'));
  ok('a symmetrical chelate is flagged too', /glycinate/.test(await p.textContent('#condwarn')));
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['geom', 'x', 'y', 'ch'].map(k => document.getElementById('in_' + k).value))).join(',') === 'sq,NCS,NO2,gly'
     && /QUESTION VALUES LOADED/.test(await p.textContent('#status')) && await E(() => document.getElementById('condwarn').hidden));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question values', await E(() => PX.RUN.state) === 'running' && await E(() => PX.RUN.D.geom === 'sq' && PX.RUN.D.ch === 'gly'));
  ok('status: preparing experiment', /Preparing experiment/.test(await p.textContent('#xstattxt')));
  ok('values lock while it runs', await E(() => document.getElementById('in_geom').disabled));
  ok('the answer panel narrates: Reading the formula', /Reading the formula/.test(await p.textContent('#ansval')));
  await sleep(2600);
  ok('status: experiment running; geometry shown', /Experiment running/.test(await p.textContent('#xstattxt')) && /square planar/.test(await p.textContent('#g_T')));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [], msgs = new Set();
  for (let i = 0; i < 800; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansval').textContent, ex: document.getElementById('g_r').textContent, d: document.getElementById('g_n1').textContent, tot: document.getElementById('g_v').textContent, rt: document.querySelector('#u_R .v').textContent }));
    seen.add(s.st); live.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all nine stages', ['load', 'donors', 'linkage', 'chelate', 'build', 'fold', 'mirror', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer panel steps through every message', ['Reading the formula', 'Identifying the donor atoms', 'Counting linkage sets', 'Seating the chelate', 'Building every arrangement', 'Folding by symmetry', 'Testing mirror images', 'Auditing the traps', 'Calculating final result'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)), [...msgs].join(' / ').slice(0, 160));
  const exam = new Set(live.filter(s => s.now && s.now.name === 'build').map(s => s.ex));
  ok('live data: the build examines the seatings one by one', exam.size >= 12, exam.size + ' distinct');
  const dist = live.filter(s => s.now && s.now.name === 'build').map(s => +s.d);
  ok('live data: the distinct count only ever rises, from 2 to 8', dist.every((v, i) => !i || v >= dist[i - 1]) && dist[0] <= 4 && dist[dist.length - 1] === 8, dist.slice(0, 3) + '…' + dist.slice(-1));
  ok('the total is unknown until the mirror test is done', live.some(s => s.now && s.now.name === 'build' && s.rt === '?' && s.tot === '—') && live.some(s => s.now && s.now.name === 'test' && s.rt === '8'));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'load,donors,linkage,chelate,build,fold,mirror,c,d,match', (await E(() => PX.calcKeys())).join(','));
  ok('the case file: 4 linkage sets, 2 per set, 8 isomers', await E(() => ['A', 'B', 'R'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(',')) === '4,2,8');
  ok('the evidence table has one row per seating', await E(() => document.querySelectorAll('#log tbody tr').length) === 64);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('audit: linkage holds, geometric holds, both traps fail', cards.A === true && cards.B === true && cards.C === false && cards.D === false, JSON.stringify(cards));
  ok('all six badges are earned', await E(() => ['lnk', 'che', 'sym', 'mir', 'trap', 'mas'].every(k => PX.badges()[k])) && await E(() => document.querySelectorAll('.badge.on').length) === 6);
  ok('the discovery curve and the seatings-per-isomer bars are drawn from the enumeration', await E(() => document.querySelectorAll('#curve path').length === 1 && document.querySelectorAll('#curve circle').length === 9 && document.querySelectorAll('#bars rect').length === 8));
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: M(II), 2 × 2 = 4, cis only, 64 seatings, 0 optical, 4 × 2 = 8', /M is \+2/.test(cl) && /2 × 2 = 4/.test(cl) && /only a cis edge/.test(cl) && /64 seatings/.test(cl) && /0 optical isomers/.test(cl) && /= 8/.test(cl));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, 8 ISOMERS', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /8 ISOMERS/.test(rv), rv.slice(0, 80));
  ok('...with the count and the mirror test as graffiti', /2 × 2 × 2 = 8/.test(rv) && /0 mirror twins/.test(rv));
  ok('the header unlocks to 8', (await p.textContent('#ansval')).trim() === '8');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution unlocks with the answer', await E(() => !document.getElementById('solbody').hidden) && (await p.textContent('#solans')) === '8' && /2 × 2 = 4/.test(await p.textContent('#solbody')));
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));

  /* ------------------------------------------------ tools and the isomer explorer */
  await p.click('#t_eq'); await p.click('#t_why'); await sleep(150);
  ok('SHOW EQUATION and SHOW WHY? toggle', await E(() => document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_why').getAttribute('aria-pressed') === 'true'));
  await p.click('#t_eq'); await p.click('#t_why');
  await p.click('#x_rot'); await sleep(80);
  ok('explorer: a turn keeps the same isomer', /the same isomer/.test(await p.textContent('#xinfo')) && /made<\/th><td><b>1</.test(await E(() => document.getElementById('xinfo').innerHTML)));
  await p.click('#x_flip'); await sleep(80);
  ok('explorer: a flip keeps the same isomer', /the same isomer/.test(await p.textContent('#xinfo')));
  await p.click('#x_swap'); await sleep(80);
  ok('explorer: a swap makes a different isomer (2 made)', /a different isomer/.test(await p.textContent('#xinfo')) && /made<\/th><td><b>2</.test(await E(() => document.getElementById('xinfo').innerHTML)));
  await p.selectOption('#x_x', 'SCN'); await sleep(80);
  ok('explorer: S-bound thiocyanate is a new linkage isomer (3 made)', /thiocyanato-S/.test(await p.textContent('#xinfo')) && /made<\/th><td><b>3</.test(await E(() => document.getElementById('xinfo').innerHTML)));
  await p.click('#x_mir'); await sleep(80);
  ok('explorer mirror test: the mirror image is the molecule turned over', /no optical isomers/.test(await p.textContent('#xinfo')));
  await p.click('#x_solve'); await sleep(80);
  ok('explorer SHOW ALL ISOMERS names this one in the catalogue of 8', /#\d of 8/.test(await p.textContent('#xinfo')));
  await p.click('#x_reset');
  ok('explorer reset starts again', /press SHOW ALL ISOMERS/.test(await p.textContent('#xinfo')) && /made<\/th><td><b>1</.test(await E(() => document.getElementById('xinfo').innerHTML)));

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0 && await E(() => document.querySelector('#u_R .v').textContent) === '?');
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ custom experiments */
  await E(() => PX.setField('geom', 'td'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const krv = await E(() => document.getElementById('revealhost').textContent);
  ok('tetrahedral: 8 isomers but 8 chiral, reported as not the question\'s complex', /8 isomer/.test(krv) && /8 chiral/.test(krv) && /not the question/.test(krv) && !/ANSWER FOUND/.test(krv), krv.slice(0, 60));
  ok('...the mirror test reports the chirality', /chiral/.test(await p.textContent('#g_vol')) && await E(() => PX.cards().C.v === true));
  await p.click('#resetq');
  await E(() => PX.setField('ch', 'acac'));
  await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const crv = await E(() => document.getElementById('revealhost').textContent);
  ok('symmetrical acac: 4 isomers, said plainly', /4 isomer/.test(crv) && !/ANSWER FOUND/.test(crv), crv.slice(0, 60));
  ok('...the total tile is flagged, not claimed', await E(() => document.getElementById('u_R').classList.contains('warn')) && await E(() => !PX.badges().mas));
  ok('the header still answers the question itself', (await p.textContent('#ansval')).trim() === '8');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  ok('and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 19);
  await p.click('#classbtn');
  await p.click('#revealnow'); await sleep(100);
  ok('Reveal anyway opens the answer without the run', (await p.textContent('#ansval')).trim() === '8');
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
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_geom').getBoundingClientRect().height, document.getElementById('x_rot').getBoundingClientRect().height, document.getElementById('x_x').getBoundingClientRect().height]);
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
  ok('reduced motion: complete answer, no animation, no confetti', (await rp.textContent('#ansval')).trim() === '8'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && await rp.evaluate(() => document.querySelectorAll('#revealhost rect[width="8"]').length === 0) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.10',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 10);
  ok('chapter Coordination Compounds', e && e.chapter === 'Coordination Compounds');
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
  const T = __dirname + '/apptest-q10';
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
  ok('the app finds the whole library in the feed', await a.evaluate(() => window.__prayogx.state().sims) === man.simulations.filter(s => s.status !== 'draft').length, man.simulations.length);
  await a.fill('#q', 'thiocyanate'); await sleep(700);
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
