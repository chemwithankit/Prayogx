/* ADV-2026-P1-CHE-Q15 - the ozonolysis–aldol ring lab: the Criegee mechanism, Zn reduction, the more stable enolate and the aldol, at two levels.

   Drives the finished page headlessly: the chemistry engine in the page, the
   optional reaction conditions and their honest warnings, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q15.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium, launch } = require('./_browser');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q15';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q15/';
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
     /var ANS = QRUN\.answer/.test(src) && /answer = hits\.length === 1 \? hits\[0\]/.test(js) && !/ANS\s*=\s*["']|answer:\s*["'][A-D]["']|\bmap\s*=\s*\[2/.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('sections: mission brief, interactive experiment, mechanism explorer, detailed solution, how to use',
     /Mission brief/.test(src) && /Interactive experiment/.test(src) && /Mechanism explorer/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));
  ok('the detailed solution draws every step of P with curved arrows, the ring closures of Q, R, S and the option table',
     (src.match(/<div class="sol-fig">/g) || []).length >= 12 && /Step 1 — 1,3-dipolar cycloaddition/.test(src) && /Step 8 — the alkoxide/.test(src) && /rejected/.test(src) && (src.match(/<div class="lst">/g) || []).length === 9);

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
  const qt = (await p.textContent('#question .qtext p')).replace(/\s+/g, ' ').trim();
  ok('the question is reproduced verbatim', qt === 'Q.15 The List-II contains products obtained from the reaction of compounds in List-I with O3/Zn-H2O followed by cyclization (via more stable enolate) in the presence of aqueous NaOH. Match each entry in List-I with appropriate entry in List-II and choose the correct option.', qt.slice(0, 120));
  const ot = (await p.textContent('#question .opts')).replace(/\s+/g, ' ');
  ok('the four options as printed', ['P ⟶ 2; Q ⟶ 4; R ⟶ 1; S ⟶ 3', 'P ⟶ 3; Q ⟶ 4; R ⟶ 5; S ⟶ 2', 'P ⟶ 2; Q ⟶ 1; R ⟶ 5; S ⟶ 3', 'P ⟶ 3; Q ⟶ 5; R ⟶ 4; S ⟶ 2'].every(t => ot.indexOf(t) >= 0));

  /* ------------------------------------------------ the chemistry in the page */
  const sci = await E(() => {
    const o = {}, q = PX.qrun();
    o.ans = PX.answer(); o.map = q.map.join(','); o.hits = q.hits.join(',');
    o.kinds = q.subs[0].steps.map(s => s.kind).join(','); o.arrows = q.subs[0].steps.map(s => s.arrows.length).join(',');
    o.valid = q.subs.every(s => s.steps.every(t => t.ok && PX.valid(t.A) && PX.valid(t.B)));
    o.pushed = q.subs.every(s => s.steps.every(t => JSON.stringify(PX.push(t.A, t.arrows).b) === JSON.stringify(t.B.b)));
    o.fx = q.subs.map(s => s.fx).join(','); o.lay = q.subs.every(s => s.calpha === s.layCalpha);
    o.rings = q.subs.map(s => s.ch.rings.join('+')).join(','); o.subst = q.subs.map(s => s.ch.subst).join(',');
    o.small = q.subs[1].cands.some(c => c.rings[0] < 5 && c.subst === 3);
    const r = D => { const R = PX.run(D); return { m: R.map.join(','), a: R.answer, c: R.complete, lay: R.subs.every(s => s.calpha === s.layCalpha), n: R.subs[0].steps.length }; };
    o.kin = r({ en: 'kinetic', base: 'naoh' }); o.nob = r({ en: 'stable', base: 'none' });
    return o;
  });
  ok('the page finds option C at run time', sci.ans === 'C' && sci.hits === 'C', sci.ans);
  ok('products matched with List-II by graph: P2 Q1 R5 S3', sci.map === '2,1,5,3', sci.map);
  ok('eight steps for each alkene: cycloaddition … protonation', sci.kinds === 'cyclo,retro,recomb,zn1,zn2,enol,aldol,prot', sci.kinds);
  ok('curved arrows per step 3,3,3,2,4,3,3,2', sci.arrows === '3,3,3,2,4,3,3,2', sci.arrows);
  ok('every intermediate of all four alkenes is valid and charge is conserved', sci.valid);
  ok('every product state is exactly what its arrows produce', sci.pushed);
  ok('all four products are C12H20O2', sci.fx === 'C₁₂H₂₀O₂,C₁₂H₂₀O₂,C₁₂H₂₀O₂,C₁₂H₂₀O₂', sci.fx);
  ok('the enolate chosen by the page is the one the drawings were made for', sci.lay && sci.kin.lay);
  ok('new rings 5+7, 6+6, 6+6, 5+7 from tertiary enolate carbons', sci.rings === '5+7,6+6,6+6,5+7' && sci.subst === '3,3,3,3', sci.rings);
  ok('Q: the other CH(CH3) enolate is rejected because it would close a ring below five', sci.small);
  ok('controls: kinetic enolate → 0,0,5,0 no option; no base → stops after 5 steps, nothing matches', sci.kin.m === '0,0,5,0' && sci.kin.a === 'none' && !sci.kin.c && sci.nob.n === 5 && sci.nob.m === '0,0,0,0');

  /* ------------------------------------------------ layout v2 */
  const lay = await E(() => {
    const s = document.getElementById('ansstrip'), g = document.querySelector('.grid1'), d = document.getElementById('dock'), go = document.getElementById('gobtn');
    return { strip: !!s && s.getBoundingClientRect().bottom <= g.getBoundingClientRect().top + 1, dock: !!d && d.getBoundingClientRect().top >= g.getBoundingClientRect().bottom - 1 && d.contains(go), val: document.getElementById('ansstripv').textContent };
  });
  ok('the final answer is visible above the experiment screen from the start', lay.strip && lay.val === 'C', lay.val);
  ok('START EXPERIMENT and the whole control bar sit below the experiment screen', lay.dock);
  ok('the full solution is open (no gate)', await E(() => !document.getElementById('solbody').hidden && document.getElementById('solgate').hidden));
  ok('the five tiles start as ?', await E(() => ['P', 'Q', 'R', 'S', 'O'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['en', 'base'].map(k => document.getElementById('in_' + k).value));
  ok('every value is pre-set to the question', vals.join(',') === 'stable,naoh', vals.join(','));

  /* ------------------------------------------------ optional conditions */
  await E(() => PX.setField('en', 'kinetic'));
  ok('changing a condition switches to USING CUSTOM VALUES, with an honest warning', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /more stable enolate/.test(await p.textContent('#condwarn')));
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['en', 'base'].map(k => document.getElementById('in_' + k).value))).join(',') === 'stable,naoh' && await E(() => document.getElementById('condwarn').hidden));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question values', await E(() => PX.RUN.state) === 'running');
  ok('values lock while it runs', await E(() => document.getElementById('in_en').disabled));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [], msgs = new Set();
  for (let i = 0; i < 1400; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansstrips').textContent, T: document.getElementById('g_T').textContent, co: document.getElementById('g_co').textContent, ar: document.getElementById('g_p').textContent, sub: document.getElementById('g_sub').textContent, tp: document.querySelector('#u_P .v').textContent, to: document.querySelector('#u_O .v').textContent }));
    seen.add(s.st); live.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all thirteen stages', ['load', 'cyclo', 'retro', 'recomb', 'zn1', 'zn2', 'enol', 'aldol', 'prot', 'qrs', 'list2', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer strip steps through every message', ['Cooling the flask', 'Ozone adds', 'molozonide splits', 'secondary ozonide', 'Zn cuts', 'Releasing the dione', 'more stable enolate', 'Closing the new ring', 'Protonating', 'Running Q, R and S', 'Matching products', 'Testing options', 'Calculating final result'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)));
  ok('the flask follows the mechanism: −78 °C with ozone, 25 °C with zinc, warm with NaOH', live.some(s => s.now && s.now.name === 'cyclo' && /^[-−]78 °C$/.test(s.T)) && live.some(s => s.now && s.now.name === 'zn2' && s.T === '25 °C') && live.some(s => s.now && s.now.name === 'aldol' && s.T === '60 °C'));
  ok('the C=O gauge follows the molecule: 0 before ozone, 2 in the dione', live.some(s => s.now && s.now.name === 'cyclo' && s.co === '0') && live.some(s => s.now && s.now.name === 'enol' && s.co === '2'));
  ok('the arrow gauge shows 4 pairs in the zinc cascade', live.some(s => s.now && s.now.name === 'zn2' && s.ar === '4'));
  ok('Q, R and S each run through their own steps', ['Q', 'R', 'S'].every(k => live.some(s => s.now && s.now.name === 'qrs' && s.sub === k)));
  ok('tiles fill at the List-II step; the option only after the test', live.some(s => s.now && s.now.name === 'qrs' && s.tp === '?') && live.some(s => s.now && s.now.name === 'test' && s.tp === '→ 2' && s.to === '?'));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'load,cyclo,retro,recomb,zn1,zn2,enol,aldol,prot,qrs,list2,oA,oB,oC,oD,match', (await E(() => PX.calcKeys())).join(','));
  ok('the case file: → 2, → 1, → 5, → 3, (C)', await E(() => ['P', 'Q', 'R', 'S', 'O'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(',')) === '→ 2,→ 1,→ 5,→ 3,(C)');
  ok('the evidence table: 8 steps of P and 3 whole runs', await E(() => document.querySelectorAll('#log tbody tr').length) === 11);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('option board: C matches; A, B, D fail', cards.A === false && cards.B === false && cards.C === true && cards.D === false, JSON.stringify(cards));
  ok('all six badges are earned', await E(() => ['oz', 'zn', 'enol', 'ring', 'match', 'mas'].every(k => PX.badges()[k])) && await E(() => document.querySelectorAll('.badge.on').length) === 6);
  ok('both charts are drawn from the mechanism', await E(() => document.querySelectorAll('#curve rect').length === 18 && document.querySelectorAll('#bars rect').length >= 8));
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: enolate candidates, rings, List-II, (C)', /candidates:/.test(cl) && /chosen C/.test(cl) && /new rings 6\/6/.test(cl) && /P → 2 · Q → 1 · R → 5 · S → 3/.test(cl) && /\(C\)/.test(cl));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, OPTION (C)', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /OPTION \(C\)/.test(rv), rv.slice(0, 80));
  ok('the header reads C and blinks as it lands', (await p.textContent('#ansval')).trim() === 'C' && await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === 'C');

  /* ------------------------------------------------ tools and the mechanism explorer */
  await p.click('#t_eq'); await p.click('#t_why'); await sleep(150);
  ok('SHOW EQUATION and SHOW WHY? toggle', await E(() => document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_why').getAttribute('aria-pressed') === 'true'));
  await p.click('#t_eq'); await p.click('#t_why');
  await p.click('#t_cmp'); ok('SLOW MOTION sets half speed', await E(() => PX.RUN.speed) === 0.5); await p.click('#t_cmp');
  const xi = () => E(() => document.getElementById('xinfo').innerHTML);
  ok('explorer starts on P, cycloaddition, 3 pairs', /P · 1,3-Dipolar cycloaddition/.test(await xi()) && /moved<\/th><td>3/.test(await xi()));
  await p.click('#x_next'); await p.click('#x_next'); await p.click('#x_next'); await p.click('#x_next'); await sleep(100);
  ok('NEXT walks to the zinc cascade (4 pairs) and names the product (2)', /Zn reduction \(ii\)/.test(await xi()) && /moved<\/th><td>4/.test(await xi()) && /List-II \(2\)/.test(await xi()));
  await p.selectOption('#x_sub', '1'); await sleep(100);
  ok('Q in the explorer: rings 6 + 6, List-II (1)', /new rings 6 \+ 6/.test(await xi()) && /List-II \(1\)/.test(await xi()));
  await p.selectOption('#x_en', 'kinetic'); await sleep(200);
  ok('Q with the kinetic enolate: not in List-II', /not in List-II/.test(await xi()));
  await p.click('#x_reset');
  ok('explorer reset returns to P, step 1', /P · 1,3-Dipolar/.test(await xi()) && await E(() => document.getElementById('x_en').value) === 'stable');

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0);
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn'); await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ custom experiments */
  await E(() => PX.setField('en', 'kinetic'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 120 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const krv = await E(() => document.getElementById('revealhost').textContent);
  ok('kinetic enolate: P, Q, S not in List-II, no option, said plainly', /P → –/.test(krv) && /not the question/.test(krv) && !/ANSWER FOUND/.test(krv), krv.slice(0, 70));
  ok('...every option card fails honestly', await E(() => ['A', 'B', 'C', 'D'].every(k => PX.cards()[k].v === false)) && await E(() => document.getElementById('u_O').classList.contains('warn')));
  ok('the header still answers the question itself', (await p.textContent('#ansval')).trim() === 'C' && (await p.textContent('#ansstripv')).trim() === 'C');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
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
    for (let i = 0; i < 120 && !(await m.evaluate(() => PX.RUN.done)); i++) await sleep(250);
    await sleep(1300);
    const ov1 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_en').getBoundingClientRect().height, document.getElementById('x_next').getBoundingClientRect().height, document.getElementById('x_sub').getBoundingClientRect().height]);
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('touch-sized controls at ' + w + ' px', tap[0] >= 34 && tap[1] >= 32 && tap[2] >= 32 && tap[3] >= 32, tap.map(Math.round).join('/'));
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await m.close();
  }
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.evaluate(() => { PX.speed(20); PX.start(); });
  for (let i = 0; i < 120 && !(await rp.evaluate(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1300);
  ok('reduced motion: complete answer, no animation, no confetti', (await rp.textContent('#ansval')).trim() === 'C'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && await rp.evaluate(() => document.querySelectorAll('#revealhost rect[width="8"]').length === 0) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.15',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 15);
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
  const T = __dirname + '/apptest-q15';
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
  await a.fill('#q', 'ozonolysis'); await sleep(700);
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
