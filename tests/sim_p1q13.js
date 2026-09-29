/* ADV-2026-P1-CHE-Q13 - the thermo-signs lab: ΔH and ΔS measured for four processes, List-II matched, options tested.

   Drives the finished page headlessly: the chemistry engine in the page, the
   optional reaction conditions and their honest warnings, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q13.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium, launch } = require('./_browser');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q13';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q13/';
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
  ok('sections: mission brief, interactive experiment, ΔG–T explorer, detailed solution, how to use',
     /Mission brief/.test(src) && /Interactive experiment/.test(src) && /ΔG–T explorer/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));
  ok('the detailed solution works every process with numbers, the sign plane and the option table',
     /Sackur–Tetrode|2-D film/.test(src) && /−395\.4/.test(src) && /ΔH \/ T<sub>m<\/sub>/.test(src) && /−2091\.3/.test(src) && /class="soplane"/.test(src) && /rejected/.test(src));

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
  ok('the question is reproduced verbatim', qt === 'Q.13 List-I contains various physical/chemical processes, and List-II contains combinations of changes in enthalpy (ΔH) and entropy (ΔS). Match each entry in List-I to the appropriate entry in List-II, and choose the correct option.', qt.slice(0, 90));
  const lists = (await p.textContent('#question .qtext')).replace(/\s+/g, ' ');
  ok('List-I, List-II and all four options as printed', ['(P) Physisorption', '(Q) Diamond ⟶ Graphite', '(R) Denaturation of protein', '(S) Propene ⟶ Cyclopropane', '(1) ΔH > 0 and ΔS > 0', '(2) ΔH < 0 and ΔS < 0', '(3) ΔH < 0 and ΔS = 0', '(4) ΔH > 0 and ΔS < 0', '(5) ΔH < 0 and ΔS > 0',
     'P → 2; Q → 3; R → 5; S → 4', 'P → 4; Q → 3; R → 5; S → 1', 'P → 2; Q → 5; R → 1; S → 4', 'P → 2; Q → 5; R → 1; S → 3'].every(t => lists.indexOf(t) >= 0));

  /* ------------------------------------------------ the thermodynamics in the page */
  const sci = await E(() => {
    const o = {}, q = PX.qrun();
    o.ans = PX.answer(); o.map = q.map.join(','); o.hits = q.hits.join(',');
    o.v = q.procs.map(p => [p.dH.toFixed(2), p.dS.toFixed(2)].join('/')).join(' ');
    o.st = PX.s3D(28.014, 298.15, 1e5); o.dsc = PX.dscScan(500, 347).area;
    o.aud = ['A', 'B', 'C', 'D'].map(k => q.audit[k].v).join(',');
    const r = D => { const R = PX.run(D); return { m: R.map.join(','), a: R.answer, c: R.complete }; };
    o.chem = r({ p: 'chem', q: 'fwd', r: 'den', s: 'fwd' }); o.qr = r({ p: 'phys', q: 'rev', r: 'den', s: 'fwd' });
    o.rr = r({ p: 'phys', q: 'fwd', r: 'ren', s: 'fwd' }); o.sr = r({ p: 'phys', q: 'fwd', r: 'den', s: 'rev' });
    return o;
  });
  ok('the page finds option C at run time', sci.ans === 'C' && sci.hits === 'C', sci.ans);
  ok('measured map P → 2, Q → 5, R → 1, S → 4', sci.map === '2,5,1,4', sci.map);
  ok('measured values: P −15/−66.2, Q −1.9/+3.36, R +500/+1441, S +33.3/−29.5', sci.v === '-15.00/-66.22 -1.90/3.36 500.00/1440.92 33.30/-29.50', sci.v);
  ok('the Sackur–Tetrode entropy of N2 at 298 K is 150.4 J/K·mol (a known value)', Math.abs(sci.st - 150.4) < 0.1, sci.st.toFixed(2));
  ok('the DSC scan integrates back to ΔH = 500 kJ/mol', Math.abs(sci.dsc - 500) < 1, sci.dsc.toFixed(2));
  ok('option audit: only (C) matches', sci.aud === 'false,false,true,false', sci.aud);
  ok('controls: chemisorption still (2), flagged; reversing Q, R or S leaves no option', sci.chem.m === '2,5,1,4' && !sci.chem.c && sci.qr.a === 'none' && sci.rr.a === 'none' && sci.sr.a === 'none', [sci.qr.m, sci.rr.m, sci.sr.m].join(' / '));

  /* ------------------------------------------------ layout v2: the answer is above the experiment from the start */
  const lay = await E(() => {
    const s = document.getElementById('ansstrip'), g = document.querySelector('.grid1'), d = document.getElementById('dock'), go = document.getElementById('gobtn');
    return { strip: !!s && s.getBoundingClientRect().bottom <= g.getBoundingClientRect().top + 1, dock: !!d && d.getBoundingClientRect().top >= g.getBoundingClientRect().bottom - 1 && d.contains(go), val: document.getElementById('ansstripv').textContent };
  });
  ok('the final answer is visible above the experiment screen from the start', lay.strip && lay.val === 'C', lay.val);
  ok('START EXPERIMENT and the whole control bar sit below the experiment screen', lay.dock);
  ok('the full solution is open (no gate)', await E(() => !document.getElementById('solbody').hidden && document.getElementById('solgate').hidden));
  ok('the five tiles start as ?', await E(() => ['P', 'Q', 'R', 'S', 'O'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['p', 'q', 'r', 's'].map(k => document.getElementById('in_' + k).value));
  ok('every value is pre-set to the question', vals.join(',') === 'phys,fwd,den,fwd', vals.join(','));
  ok('status reads QUESTION VALUES LOADED', /QUESTION VALUES LOADED/.test(await p.textContent('#status')));

  /* ------------------------------------------------ optional conditions */
  await E(() => PX.setField('q', 'rev'));
  ok('changing a process switches to USING CUSTOM VALUES, with an honest warning', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /flips both signs/.test(await p.textContent('#condwarn')));
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['p', 'q', 'r', 's'].map(k => document.getElementById('in_' + k).value))).join(',') === 'phys,fwd,den,fwd' && await E(() => document.getElementById('condwarn').hidden));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question values', await E(() => PX.RUN.state) === 'running');
  ok('values lock while it runs', await E(() => document.getElementById('in_p').disabled));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [], msgs = new Set();
  for (let i = 0; i < 900; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansstrips').textContent, dh: document.getElementById('g_dh').textContent, ds: document.getElementById('g_ds').textContent, l2: document.getElementById('g_l2').textContent, tp: document.querySelector('#u_P .v').textContent, to: document.querySelector('#u_O .v').textContent }));
    seen.add(s.st); live.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all eight stages', ['load', 'p', 'q', 'r', 's', 'plane', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer strip steps through every message', ['Setting up four calorimeters', 'Measuring P', 'Measuring Q', 'Measuring R', 'Measuring S', 'sign plane', 'Testing options', 'Calculating final result'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)));
  ok('ΔH is read before ΔS inside each measurement', live.some(s => s.now && s.now.name === 'r' && s.dh !== '—' && s.ds === '—') && live.some(s => s.now && s.now.name === 'r' && s.ds !== '—'));
  ok('the live gauges show each process’s own values', live.some(s => s.now && s.now.name === 'p' && /−15\.0/.test(s.dh)) && live.some(s => s.now && s.now.name === 'q' && /\+3\.36/.test(s.ds)) && live.some(s => s.now && s.now.name === 's' && s.l2 === '(4)'));
  ok('tiles fill as the measurements finish; the option only after the test', live.some(s => s.now && s.now.name === 'q' && s.tp === '→ 2') && live.some(s => s.now && s.now.name === 'plane' && s.to === '?'));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'load,p,q,r,s,plane,oA,oB,oC,oD,match', (await E(() => PX.calcKeys())).join(','));
  ok('the case file: → 2, → 5, → 1, → 4, (C)', await E(() => ['P', 'Q', 'R', 'S', 'O'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(',')) === '→ 2,→ 5,→ 1,→ 4,(C)');
  ok('the evidence table has one row per process (4)', await E(() => document.querySelectorAll('#log tbody tr').length) === 4);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('option board: A, B, D fail; C matches', cards.A === false && cards.B === false && cards.C === true && cards.D === false, JSON.stringify(cards));
  ok('all six badges are earned', await E(() => ['heat', 'hess', 'dsc', 'ent', 'plane', 'mas'].every(k => PX.badges()[k])) && await E(() => document.querySelectorAll('.badge.on').length) === 6);
  ok('both charts are drawn from the measurements: 4 ΔG lines, 8 bars', await E(() => document.querySelectorAll('#curve path').length === 4 && document.querySelectorAll('#bars rect').length === 8));
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: Sackur–Tetrode, Hess, DSC, List-II entries, (C)', /Sackur–Tetrode/.test(cl) && /Hess/.test(cl) && /scanning calorimetry/.test(cl) && /List-II \(4\)/.test(cl) && /\(C\)/.test(cl));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, OPTION (C)', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /OPTION \(C\)/.test(rv), rv.slice(0, 80));
  ok('...with ΔG = ΔH − TΔS and the mapping as graffiti', /ΔG = ΔH − TΔS/.test(rv) && /P → 2 · Q → 5 · R → 1 · S → 4/.test(rv));
  ok('the header reads C and blinks as it lands', (await p.textContent('#ansval')).trim() === 'C' && await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === 'C');

  /* ------------------------------------------------ tools and the ΔG–T explorer */
  await p.click('#t_eq'); await p.click('#t_why'); await sleep(150);
  ok('SHOW EQUATION and SHOW WHY? toggle', await E(() => document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_why').getAttribute('aria-pressed') === 'true'));
  await p.click('#t_eq'); await p.click('#t_why');
  await p.click('#t_cmp'); ok('SLOW MOTION sets half speed', await E(() => PX.RUN.speed) === 0.5); await p.click('#t_cmp');
  const xi = () => E(() => document.getElementById('xinfo').innerHTML);
  ok('explorer starts on P at 298 K: (2), ΔG > 0 (physisorption of N2 is a low-temperature process)', /\(2\)/.test(await xi()) && /spontaneous below 227 K/.test(await xi()));
  await p.selectOption('#x_proc', '2'); await E(() => { const s = document.getElementById('x_T'); s.value = 400; s.dispatchEvent(new Event('input')); });
  ok('R at 400 K: (1), spontaneous above Tm', /\(1\)/.test(await xi()) && /spontaneous above 347 K/.test(await xi()) && (await p.textContent('#x_Tv')) === '400 K');
  await p.selectOption('#x_proc', '3');
  ok('S: never spontaneous', /never spontaneous/.test(await xi()));
  await p.selectOption('#x_dir', 'rev');
  ok('S reversed: (5), spontaneous at every temperature', /\(5\)/.test(await xi()) && /every temperature/.test(await xi()));
  await p.click('#x_reset');
  ok('explorer reset returns to P, 298 K', /Physisorption/.test(await xi()) && await E(() => document.getElementById('x_T').value) === '298');

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0);
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn'); await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ custom experiments */
  await E(() => PX.setField('s', 'rev'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const krv = await E(() => document.getElementById('revealhost').textContent);
  ok('S reversed: S → 5, no option fits, said plainly', /S → 5/.test(krv) && /not the question/.test(krv) && !/ANSWER FOUND/.test(krv), krv.slice(0, 70));
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
    for (let i = 0; i < 80 && !(await m.evaluate(() => PX.RUN.done)); i++) await sleep(250);
    await sleep(1300);
    const ov1 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_p').getBoundingClientRect().height, document.getElementById('x_reset').getBoundingClientRect().height, document.getElementById('x_proc').getBoundingClientRect().height]);
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
  ok('reduced motion: complete answer, no animation, no confetti', (await rp.textContent('#ansval')).trim() === 'C'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && await rp.evaluate(() => document.querySelectorAll('#revealhost rect[width="8"]').length === 0) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.13',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 13);
  ok('chapter Thermodynamics', e && e.chapter === 'Thermodynamics');
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
  const T = __dirname + '/apptest-q13';
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
  await a.fill('#q', 'denaturation'); await sleep(700);
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
