/* ADV-2026-P1-CHE-Q08 - the synthesis pathway lab: sodium butanoate to Q, R, S and T.

   Drives the finished page headlessly: the chemistry engine in the page, the
   optional reaction conditions and their honest warnings, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q08.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium, launch } = require('./_browser');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q08';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q08/';
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
  ok('sections: mission brief, interactive experiment, structure explorer, detailed solution, how to use',
     /Mission brief/.test(src) && /Interactive experiment/.test(src) && /Structure explorer/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));

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
  ok('the question is reproduced verbatim', qt === 'Q.8 In the following reaction sequence, Q, R, S and T are the major products.', qt);
  const sch = (await p.textContent('#schemetxt')).replace(/\s+/g, ' ');
  ok('the printed reagents, in order', /Kolbe's electrolysis/.test(sch) && /V2O5, 500 °C, 10-20 atm/.test(sch) && /phthalic anhydride, anhyd\. AlCl3/.test(sch) && /1\. PCl5; 2\. H2-Pd\/BaSO4/.test(sch) && /NH2NH2, heat/.test(sch), sch.slice(0, 80));
  const opts = (await p.textContent('#opts')).replace(/\s+/g, '');
  ok('the four printed options', opts === '(A)SonwarmingwithammoniacalAgNO3resultsintheformationofsilvermirror.(B)QontreatmentwithCl2(excess)/UVgivesgammaxane.(C)Tisaheterocycliccompound.(D)RonacidcatalyzedintramolecularcyclizationfollowedbytreatmentwithZn-Hg/HClgives9,10-dihydroxyanthracene.', opts);

  /* ------------------------------------------------ the chemistry in the page */
  const sci = await E(() => {
    const o = {};
    o.truth = PX.qtrue(); o.ids = PX.qrun().ids;
    o.f = ['benzene', 'R', 'S', 'T', 'anthraquinone', 'dihydroanthracene', 'dihydroxyanthracene', 'bhc'].map(k => PX.formula(k));
    o.cho = ['benzene', 'R', 'S', 'T'].map(k => PX.groups(k).cho.length > 0);
    o.ringN = PX.groups('T').ringHetero.length;
    const c = PX.clemmensen('anthraquinone'); o.clem = [c.n, c.f.C, c.f.H, c.f.O || 0];
    o.dbe = [PX.dbe('benzene'), PX.dbe('S'), PX.dbe('T')];
    const r = D => { const R = PX.run(D); return { T: R.truth.join(''), c: R.complete, ids: R.ids }; };
    o.pro = r({ salt: 'propanoate', cat: 'PdBaSO4' }); o.pdc = r({ salt: 'butanoate', cat: 'PdC' });
    return o;
  });
  ok('the engine builds Q = benzene, R = keto acid, S = keto aldehyde, T = phthalazine', JSON.stringify(sci.ids) === JSON.stringify({ Q: 'benzene', R: 'R', S: 'S', T: 'T' }));
  ok('formulas counted from the bonds: C6H6, C14H10O3, C14H10O2, C14H10N2', sci.f.slice(0, 4).join(',') === 'C₆H₆,C₁₄H₁₀O₃,C₁₄H₁₀O₂,C₁₄H₁₀N₂', sci.f.join(','));
  ok('...anthraquinone C14H8O2, 9,10-dihydroanthracene C14H12, 9,10-dihydroxyanthracene C14H10O2, BHC C6H6Cl6', sci.f.slice(4).join(',') === 'C₁₄H₈O₂,C₁₄H₁₂,C₁₄H₁₀O₂,C₆H₆Cl₆');
  ok('only S has an aldehyde C–H', sci.cho.join(',') === 'false,false,true,false');
  ok('T has two nitrogen atoms in a ring', sci.ringN === 2);
  ok('Clemmensen on the graph: 2 C=O → CH2 gives C14H12, no oxygen', sci.clem.join(',') === '2,14,12,0');
  ok('degrees of unsaturation: benzene 4, S 10, T 11', sci.dbe.join(',') === '4,10,11');
  ok('the page finds (A), (B), (C) at run time', sci.truth.join(',') === 'A,B,C' && await E(() => PX.answer()) === '(A), (B), (C)');
  ok('sodium propanoate: n-butane, no benzene, nothing downstream', !sci.pro.ids.Q && sci.pro.T === '' && !sci.pro.c);
  ok('unpoisoned Pd/C: S is the alcohol, T a hydrazone - only (B) survives, flagged', sci.pdc.ids.S === 'alcohol' && sci.pdc.ids.T === 'hydrazone' && sci.pdc.T === 'B' && !sci.pdc.c);

  /* ------------------------------------------------ before the run */
  ok('the header answer starts locked', /Investigating Q, R, S and T/.test(await p.textContent('#ansval')) && await E(() => document.getElementById('answerbox').classList.contains('locked')));
  ok('the answer is shown nowhere before the run', !/CORRECT OPTIONS|ANSWER FOUND|Supported statements/.test(await E(() => document.body.innerText)));
  ok('the solution is locked', await E(() => document.getElementById('solbody').hidden && !document.getElementById('solgate').hidden));
  ok('the unknowns start as ?', await E(() => ['Q', 'R', 'S', 'T'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['salt', 'cat'].map(k => document.getElementById('in_' + k).value));
  ok('every condition is pre-set to the question', vals.join(',') === 'butanoate,PdBaSO4', vals.join(','));
  ok('status reads QUESTION VALUES LOADED', /QUESTION VALUES LOADED/.test(await p.textContent('#status')));
  ok('START reads START EXPERIMENT', /START EXPERIMENT/.test(await p.textContent('#gobtn')));
  ok('guidance says to set values or use the defaults', /Set your values or use the question defaults/.test(await p.textContent('#guide')));
  ok('the printed scheme is drawn on its own canvas', await E(() => { const c = document.getElementById('schemecv'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 400) if (d[i] > 150) n++; return n > 20; }));

  /* ------------------------------------------------ optional conditions */
  await E(() => PX.setField('cat', 'PdC'));
  ok('changing a condition switches to USING CUSTOM VALUES', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  ok('...with an honest warning that the question pathway changes', /poisoned Pd\/BaSO₄/.test(await p.textContent('#condwarn')) && await E(() => !document.getElementById('condwarn').hidden));
  await E(() => PX.setField('salt', 'propanoate'));
  ok('each changed condition adds its own warning', (await p.textContent('#condwarn')).split('⚠').length - 1 >= 2);
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['salt', 'cat'].map(k => document.getElementById('in_' + k).value))).join(',') === 'butanoate,PdBaSO4'
     && /QUESTION VALUES LOADED/.test(await p.textContent('#status')) && await E(() => document.getElementById('condwarn').hidden));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question conditions', await E(() => PX.RUN.state) === 'running' && await E(() => PX.RUN.D.salt === 'butanoate' && PX.RUN.D.cat === 'PdBaSO4'));
  ok('status: preparing experiment', /Preparing experiment/.test(await p.textContent('#xstattxt')));
  ok('conditions lock while it runs', await E(() => document.getElementById('in_salt').disabled));
  ok('the answer panel narrates: Analyzing Step 1', /Analyzing Step 1/.test(await p.textContent('#ansval')));
  await sleep(2600);
  ok('status: experiment running; conditions shown', /Experiment running/.test(await p.textContent('#xstattxt')) && /electrolysis/.test(await p.textContent('#g_c')));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [], msgs = new Set();
  for (let i = 0; i < 700; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansval').textContent, prod: document.getElementById('g_prod').textContent, f: document.getElementById('g_f').textContent, grp: document.getElementById('g_grp').textContent, q: document.querySelector('#u_Q .v').textContent }));
    seen.add(s.st); live.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all ten stages', ['kolbe', 'arom', 'bhc', 'fc', 'cyc', 'rosen', 'tollens', 'ring', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer panel steps through every investigation message', ['Analyzing Step 1', 'Identifying Q', 'Testing Q with Cl₂', 'Identifying R', 'Testing R', 'Identifying S', "Testing S with Tollens", 'Identifying T', 'Testing statements', 'Calculating final result'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)), [...msgs].join(' / ').slice(0, 160));
  ok('live data: n-hexane C6H14, then benzene C6H6', live.some(s => s.now && s.now.name === 'kolbe' && s.prod === 'n-hexane' && s.f === 'C₆H₁₄') && live.some(s => s.now && s.now.name === 'arom' && s.f === 'C₆H₆'));
  ok('live data: S shows –CHO and T shows ring N', live.some(s => s.now && s.now.name === 'rosen' && /–CHO/.test(s.grp)) && live.some(s => s.now && s.now.name === 'ring' && /ring N/.test(s.grp)));
  ok('Q is unknown until the furnace has run', live.some(s => s.now && s.now.name === 'kolbe' && s.q === '?') && live.some(s => s.now && s.now.name === 'bhc' && s.q === 'benzene'));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'kolbe,q,b,r,d,s,a,c,t,board,match', (await E(() => PX.calcKeys())).join(','));
  ok('the case file: benzene, 2-benzoylbenzoic acid, 2-benzoylbenzaldehyde, 1-phenylphthalazine', await E(() => ['Q', 'R', 'S', 'T'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(',')) === 'benzene,2-benzoylbenzoic acid,2-benzoylbenzaldehyde,1-phenylphthalazine'
     && await E(() => ['Q', 'R', 'S', 'T'].every(k => document.getElementById('u_' + k).classList.contains('found'))));
  ok('evidence table: four rows', await E(() => document.querySelectorAll('#log tbody tr').length) === 4);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('option board: A, B, C supported, D not', cards.A === true && cards.B === true && cards.C === true && cards.D === false, JSON.stringify(cards));
  ok('the board cards are coloured by verdict', await E(() => ['A', 'B', 'C'].every(k => document.getElementById('oc_' + k).classList.contains('yes')) && document.getElementById('oc_D').classList.contains('no')));
  ok('all seven badges are earned', await E(() => ['ko', 'uv', 'fc', 'red', 'ag', 'ring', 'mas'].every(k => PX.badges()[k])) && await E(() => document.querySelectorAll('.badge.on').length) === 7);
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: benzene, keto acid, Clemmensen C14H12, silver mirror, heterocyclic, answer', /Q = benzene/.test(cl) && /2-benzoylbenzoic acid/.test(cl) && /C₁₄H₁₂/.test(cl) && /silver mirror/.test(cl) && /heterocyclic/.test(cl) && /Supported statements: \(A\), \(B\), \(C\)/.test(cl));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, CORRECT OPTIONS (A), (B), (C)', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /CORRECT OPTIONS/.test(rv) && /\(A\), \(B\), \(C\)/.test(rv), rv.slice(0, 80));
  ok('...with the four formulas and the graffiti', /C₁₄H₁₀N₂/.test(rv) && /SILVER MIRROR/.test(rv) && /GAMMAXANE/.test(rv));
  ok('the header unlocks to (A), (B), (C)', (await p.textContent('#ansval')).trim() === '(A), (B), (C)');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution unlocks with the answer', await E(() => !document.getElementById('solbody').hidden) && /\(A\), \(B\), \(C\)/.test(await p.textContent('#solans')) && /9,10-dihydroanthracene/.test(await p.textContent('#solbody')));
  ok('the options are marked: A, B, C correct; D not', await E(() => ['A', 'B', 'C'].every(k => document.querySelector('#opts li[data-k="' + k + '"]').classList.contains('correct')) && document.querySelector('#opts li[data-k="D"]').classList.contains('wrong')));
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));

  /* ------------------------------------------------ tools and the structure explorer */
  await p.click('#t_eq'); await p.click('#t_why'); await sleep(150);
  ok('SHOW EQUATION and SHOW WHY? toggle', await E(() => document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_why').getAttribute('aria-pressed') === 'true'));
  await p.click('#t_eq'); await p.click('#t_why');
  await p.click('#t_cmp'); await sleep(150);
  ok('COMPARE THE (D) PRODUCTS: C14H12 vs C14H10O2, oxygen 0 vs 2', await E(() => PX.explorer.cmp) && /0 vs 2/.test(await p.textContent('#xinfo')));
  await p.click('.xpick button[data-m="T"]'); await sleep(100);
  ok('explorer on T: C14H10N2, heterocyclic, Tollens negative', /C₁₄H₁₀N₂/.test(await p.textContent('#xinfo')) && /heterocyclic/.test(await p.textContent('#xinfo')) && /negative/.test(await p.textContent('#xinfo')));
  await p.click('.xpick button[data-m="anthraquinone"]'); await sleep(100);
  ok('explorer on anthraquinone predicts the Clemmensen product C14H12', /C₁₄H₁₂ \(2 C=O → CH₂\)/.test(await p.textContent('#xinfo')));
  await p.focus('#mol'); await p.keyboard.press('ArrowRight'); await sleep(100);
  ok('arrow keys step through the compounds', await E(() => PX.explorer.m) === 'dihydroanthracene');
  await p.click('.xpick button[data-m="S"]');

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0 && await E(() => document.querySelector('#u_Q .v').textContent) === '?');
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ custom experiments */
  await E(() => PX.setField('cat', 'PdC'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const prv = await E(() => document.getElementById('revealhost').textContent);
  ok('Pd/C run: over-reduction reported, your run supports only (B)', /over-reduces/.test(prv) && /your run: \(B\)/.test(prv) && !/ANSWER FOUND/.test(prv), prv.slice(0, 60));
  ok('...S is flagged as the alcohol', /alcohol/.test(await p.textContent('#u_S .v')) && await E(() => document.getElementById('u_S').classList.contains('warn')));
  await p.click('#resetq');
  await E(() => PX.setField('salt', 'propanoate'));
  await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const crv = await E(() => document.getElementById('revealhost').textContent);
  ok('propanoate run: no benzene, the pathway does not apply', /No benzene forms/.test(crv) && !/ANSWER FOUND/.test(crv), crv.slice(0, 60));
  ok('...Q is flagged, not claimed', await E(() => document.getElementById('u_Q').classList.contains('warn')) && await E(() => !PX.badges().mas));
  ok('the header still answers the question itself', (await p.textContent('#ansval')).trim() === '(A), (B), (C)');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  ok('and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 19);
  await p.click('#classbtn');
  await p.click('#revealnow'); await sleep(100);
  ok('Reveal anyway opens the answer without the run', (await p.textContent('#ansval')).trim() === '(A), (B), (C)');
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
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_salt').getBoundingClientRect().height, document.getElementById('x_cmp').getBoundingClientRect().height]);
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
  ok('reduced motion: complete answer, no animation, no confetti', (await rp.textContent('#ansval')).trim() === '(A), (B), (C)'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && await rp.evaluate(() => document.querySelectorAll('#revealhost rect[width="8"]').length === 0) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.8',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 8);
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
  const T = __dirname + '/apptest-q08';
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
  await a.fill('#q', 'phthalazine'); await sleep(700);
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
