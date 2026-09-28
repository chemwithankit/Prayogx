/* ADV-2026-P1-CHE-Q12 - the straight-line carbon lab: acetylide formation, SN2 alkylation and the collinear carbons of X.

   Drives the finished page headlessly: the chemistry engine in the page, the
   optional reaction conditions and their honest warnings, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q12.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium, launch } = require('./_browser');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q12';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q12/';
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
     /var ANS = QRUN\.answer/.test(src) && /answer: String\(nC_line\)/.test(js) && !/ANS\s*=\s*["']|answer:\s*["']\d|count:\s*6|= 6["']/.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('sections: mission brief, interactive experiment, 3-D line explorer, detailed solution, how to use',
     /Mission brief/.test(src) && /Interactive experiment/.test(src) && /3-D line explorer/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));
  ok('the detailed solution carries drawn structures with curved arrows (4 figures, unique marker ids)',
     (src.match(/<div class="sol-fig">/g) || []).length === 4 && ['mah1', 'mah2', 'mah3', 'mah4'].every(k => (src.match(new RegExp('id="' + k + '"', 'g')) || []).length === 1));

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
  ok('the question is reproduced verbatim', qt === 'Q.12 Treatment of buta-1,3-diyne with NaNH2 (2 equivalents), followed by reaction with excess of trans-CH3-CH=CH-CH2-Br gives X as the major product. The maximum number of carbon atoms that are collinear (in a straight line) in X is ____.', qt.slice(0, 90));

  /* ------------------------------------------------ the chemistry in the page */
  const sci = await E(() => {
    const o = {}, q = PX.qrun();
    o.ans = PX.answer(); o.fx = q.fx; o.nsp = q.nsp; o.count = q.count; o.geo = q.geo.on.length; o.nAlk = q.nAlk; o.agree = q.agree;
    o.kinds = q.steps.map(s => s.kind).join(','); o.arrows = q.steps.map(s => s.arrows.length).join(',');
    o.valid = q.steps.every(s => s.ok && PX.valid(s.A) && PX.valid(s.B));
    o.pushed = q.steps.every(s => JSON.stringify(PX.push(s.A, s.arrows).b) === JSON.stringify(s.B.b));
    o.hyb = q.G.map(g => g.hyb).join(',');
    o.ruleIdx = q.rule.map(i => q.path.indexOf(i)).join(',');
    o.dmax = Math.max.apply(null, q.geo.dist);
    const r = D => { const R = PX.run(D); return { a: R.answer, c: R.complete, f: R.fx }; };
    o.tri = r({ chain: 'triyne', base: '2', rx: 'crotyl' }); o.eth = r({ chain: 'ethyne', base: '2', rx: 'crotyl' });
    o.one = r({ chain: 'diyne', base: '1', rx: 'crotyl' }); o.allyl = r({ chain: 'diyne', base: '2', rx: 'allyl' }); o.prop = r({ chain: 'diyne', base: '2', rx: 'propargyl' });
    return o;
  });
  ok('the page counts 6 collinear carbons at run time', sci.ans === '6' && sci.count === 6, sci.ans);
  ok('two independent counts agree: rule (sp run + neighbours) and the geometric model', sci.geo === 6 && sci.agree);
  ok('X = C12H14 with both ends alkylated', sci.fx === 'C₁₂H₁₄' && sci.nAlk === 2, sci.fx);
  ok('mechanism: deprotonate both ends, then SN2 at both ends', sci.kinds === 'depL,depR,sn2L,sn2R', sci.kinds);
  ok('two curved arrows per step (lone pair in, bond pair out)', sci.arrows === '2,2,2,2', sci.arrows);
  ok('every intermediate is chemically valid and charge is conserved', sci.valid);
  ok('every product state is exactly what its arrows produce (products are pushed, not drawn)', sci.pushed);
  ok('hybridisation read from bond orders: sp3 sp2 sp2 sp3 sp sp sp sp sp3 sp2 sp2 sp3', sci.hyb === 'sp3,sp2,sp2,sp3,sp,sp,sp,sp,sp3,sp2,sp2,sp3', sci.hyb);
  ok('the line runs from C4 to C9 (CH2 to CH2)', sci.ruleIdx === '3,4,5,6,7,8', sci.ruleIdx);
  ok('the rest of the chain is well off the line (> 1 A)', sci.dmax > 1, sci.dmax.toFixed(2));
  ok('variants: triyne 8, ethyne 4, 1 eq 5, allyl 6, propargyl 6 — all flagged as not the question',
     sci.tri.a === '8' && sci.eth.a === '4' && sci.one.a === '5' && sci.allyl.a === '6' && sci.prop.a === '6' && [sci.tri, sci.eth, sci.one, sci.allyl, sci.prop].every(x => !x.c),
     [sci.tri.a, sci.eth.a, sci.one.a, sci.allyl.a, sci.prop.a].join(','));

  /* ------------------------------------------------ layout v2: the answer is above the experiment from the start */
  const lay = await E(() => {
    const s = document.getElementById('ansstrip'), g = document.querySelector('.grid1'), d = document.getElementById('dock'), go = document.getElementById('gobtn');
    return { strip: !!s && s.compareDocumentPosition(g) === Node.DOCUMENT_POSITION_FOLLOWING && s.getBoundingClientRect().bottom <= g.getBoundingClientRect().top + 1,
      dock: !!d && d.getBoundingClientRect().top >= g.getBoundingClientRect().bottom - 1 && d.contains(go), val: document.getElementById('ansstripv').textContent };
  });
  ok('the final answer is visible above the experiment screen from the start', lay.strip && lay.val === '6', lay.val);
  ok('START EXPERIMENT and the whole control bar sit below the experiment screen', lay.dock);
  ok('the header answer shows 6 before any run', (await p.textContent('#ansval')).trim() === '6');
  ok('the full solution is open (no gate)', await E(() => !document.getElementById('solbody').hidden && document.getElementById('solgate').hidden) && /dodeca|CH₂–C≡C–C≡C–CH₂|C4 – C5/.test(await p.textContent('#solbody')));
  ok('the unknowns start as ?', await E(() => ['A', 'B', 'R'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['chain', 'base', 'rx'].map(k => document.getElementById('in_' + k).value));
  ok('every value is pre-set to the question', vals.join(',') === 'diyne,2,crotyl', vals.join(','));
  ok('status reads QUESTION VALUES LOADED', /QUESTION VALUES LOADED/.test(await p.textContent('#status')));
  ok('START reads START EXPERIMENT', /START EXPERIMENT/.test(await p.textContent('#gobtn')));

  /* ------------------------------------------------ optional conditions */
  await E(() => PX.setField('base', '1'));
  ok('changing a value switches to USING CUSTOM VALUES', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  ok('...with an honest warning about the equivalents', /2 equivalents/.test(await p.textContent('#condwarn')));
  await E(() => PX.setField('chain', 'triyne'));
  ok('another alkyne is flagged too', /buta-1,3-diyne/.test(await p.textContent('#condwarn')));
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['chain', 'base', 'rx'].map(k => document.getElementById('in_' + k).value))).join(',') === 'diyne,2,crotyl'
     && /QUESTION VALUES LOADED/.test(await p.textContent('#status')) && await E(() => document.getElementById('condwarn').hidden));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question values', await E(() => PX.RUN.state) === 'running' && await E(() => PX.RUN.D.chain === 'diyne' && PX.RUN.D.base === '2'));
  ok('values lock while it runs', await E(() => document.getElementById('in_chain').disabled));
  ok('the answer strip narrates while it runs: Charging the flask', /Charging the flask/.test(await p.textContent('#ansstrips')));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [], msgs = new Set();
  for (let i = 0; i < 900; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansstrips').textContent, r: document.getElementById('g_r').textContent, n1: document.getElementById('g_n1').textContent, n2: document.getElementById('g_n2').textContent, ar: document.getElementById('g_p').textContent, rt: document.querySelector('#u_R .v').textContent }));
    seen.add(s.st); live.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all nine stages', ['load', 'd1', 'd2', 's1', 's2', 'hyb', 'line', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer strip steps through every message', ['Charging the flask', 'Deprotonating the first end', 'Deprotonating the second end', 'First SN2 attack', 'Second SN2 attack', 'Assigning hybridisation', 'Firing the laser', 'Auditing the traps', 'Counting collinear carbons'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)), [...msgs].join(' / ').slice(0, 160));
  const nab = live.filter(s => s.now && /^[ds]\d/.test(s.now.name)).map(s => +s.n2);
  ok('macroscopic and molecular levels in step: NaBr climbs 0 → 1 → 2 only during the SN2 steps', nab.every((v, i) => !i || v >= nab[i - 1]) && live.filter(s => s.now && /^d/.test(s.now.name)).every(s => s.n2 === '0') && nab[nab.length - 1] === 2);
  ok('...NaNH2 is used up 2 → 1 → 0 during the deprotonations', ['2 eq', '1 eq', '0 eq'].every(v => live.some(s => s.now && /^d/.test(s.now.name) && s.r === v)));
  ok('...acetylide ends rise to 2 and fall back to 0 as they are alkylated', live.some(s => s.n1 === '2') && live.some(s => s.now && s.now.name === 's2' && s.n1 === '0'));
  ok('the arrow gauge shows 2 pairs in each step', live.some(s => s.now && s.now.name === 'd1' && s.ar === '2') && live.some(s => s.now && s.now.name === 's1' && s.ar === '2'));
  ok('the count is unknown until the laser test', live.some(s => s.now && s.now.name === 'hyb' && s.rt === '?') && live.some(s => s.now && s.now.name === 'test' && s.rt === '6'));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'load,d1,d2,s1,s2,hyb,line,c,d,match', (await E(() => PX.calcKeys())).join(','));
  ok('the case file: C12H14, 4 sp C, 6', await E(() => ['A', 'B', 'R'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(',')) === 'C₁₂H₁₄,4 sp C,6');
  ok('the evidence table has one row per mechanistic step (4)', await E(() => document.querySelectorAll('#log tbody tr').length) === 4);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('audit: X holds, 6 holds, both traps (4 and 8) fail', cards.A === true && cards.B === true && cards.C === false && cards.D === false, JSON.stringify(cards));
  ok('all six badges are earned', await E(() => ['base', 'nuc', 'sn2', 'hyb', 'trap', 'mas'].every(k => PX.badges()[k])) && await E(() => document.querySelectorAll('.badge.on').length) === 6);
  ok('both charts are drawn from the model: 10 bond angles, 12 distances', await E(() => document.querySelectorAll('#curve rect').length === 10 && document.querySelectorAll('#bars rect').length === 12));
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: acetylide, backside SN2, X = C12H14, sp = 180°, 6', /acetylide/.test(cl) && /backside/.test(cl) && /C₁₂H₁₄/.test(cl) && /sp = 180°/.test(cl) && /= 6 \(CH₂–C≡C–C≡C–CH₂\)/.test(cl));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, 6 IN A LINE', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /6 IN A LINE/.test(rv), rv.slice(0, 80));
  ok('...with sp = 180°, the six-carbon axis and SN2 × 2 as graffiti', /sp = 180°/.test(rv) && /CH₂–C≡C–C≡C–CH₂/.test(rv) && /SN2 × 2/.test(rv));
  ok('the header still reads 6', (await p.textContent('#ansval')).trim() === '6');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '6');
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));

  /* ------------------------------------------------ tools and the 3-D line explorer */
  await p.click('#t_eq'); await p.click('#t_why'); await sleep(150);
  ok('SHOW EQUATION and SHOW WHY? toggle', await E(() => document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_why').getAttribute('aria-pressed') === 'true'));
  await p.click('#t_eq'); await p.click('#t_why');
  await p.click('#t_cmp');
  ok('SLOW MOTION sets half speed', await E(() => PX.RUN.speed) === 0.5);
  await p.click('#t_cmp');
  ok('explorer starts on the question molecule: C12H14, 6 on the line', /C₁₂H₁₄/.test(await p.textContent('#xinfo')) && /one straight line<\/th><td><b>6<\/b>/.test(await E(() => document.getElementById('xinfo').innerHTML)));
  await p.selectOption('#x_chain', 'triyne'); await sleep(100);
  ok('hexatriyne in the explorer: 8 on the line', /one straight line<\/th><td><b>8<\/b>/.test(await E(() => document.getElementById('xinfo').innerHTML)));
  await p.selectOption('#x_base', '1'); await sleep(100);
  ok('...with one equivalent of base: 7', /one straight line<\/th><td><b>7<\/b>/.test(await E(() => document.getElementById('xinfo').innerHTML)));
  await E(() => { const s = document.getElementById('x_phi'); s.value = 90; s.dispatchEvent(new Event('input')); });
  ok('the spin slider stops auto-spin and sets the angle', await E(() => document.getElementById('x_spin').getAttribute('aria-pressed')) === 'false' && (await p.textContent('#x_phiv')) === '90°');
  await p.click('#x_reset'); await sleep(100);
  ok('explorer reset returns to the question molecule', /one straight line<\/th><td><b>6<\/b>/.test(await E(() => document.getElementById('xinfo').innerHTML)) && await E(() => document.getElementById('x_chain').value) === 'diyne');

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0 && await E(() => document.querySelector('#u_R .v').textContent) === '?');
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ custom experiments */
  await E(() => PX.setField('base', '1'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const krv = await E(() => document.getElementById('revealhost').textContent);
  ok('1 eq NaNH2: one end alkylated, 5 in a line, reported as not the question', /5 collinear/.test(krv) && /not the question/.test(krv) && !/ANSWER FOUND/.test(krv) && (await p.textContent('#g_n2')) === '1', krv.slice(0, 70));
  ok('...card ① fails honestly (only one end)', await E(() => PX.cards().A.v === false && /Only 1 end/.test(PX.cards().A.ev)));
  await p.click('#resetq');
  await E(() => PX.setField('chain', 'triyne'));
  await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const crv = await E(() => document.getElementById('revealhost').textContent);
  ok('hexatriyne: 8 in a line, said plainly', /8 collinear/.test(crv) && !/ANSWER FOUND/.test(crv), crv.slice(0, 60));
  ok('...the count tile is flagged, not claimed', await E(() => document.getElementById('u_R').classList.contains('warn')) && await E(() => !PX.badges().mas));
  ok('the header still answers the question itself', (await p.textContent('#ansval')).trim() === '6' && (await p.textContent('#ansstripv')).trim() === '6');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  ok('and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 19);
  await p.click('#classbtn');
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
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_chain').getBoundingClientRect().height, document.getElementById('x_reset').getBoundingClientRect().height, document.getElementById('x_chain').getBoundingClientRect().height]);
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
  ok('reduced motion: complete answer, no animation, no confetti', (await rp.textContent('#ansval')).trim() === '6'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && await rp.evaluate(() => document.querySelectorAll('#revealhost rect[width="8"]').length === 0) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.12',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 12);
  ok('chapter Hydrocarbons', e && e.chapter === 'Hydrocarbons');
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
  const T = __dirname + '/apptest-q12';
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
  await a.fill('#q', 'acetylide'); await sleep(700);
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
