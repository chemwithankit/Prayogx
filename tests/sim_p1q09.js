/* ADV-2026-P1-CHE-Q09 - the twin-cylinder pressure lab: He/Ar mixtures, m1/m2.

   Drives the finished page headlessly: the chemistry engine in the page, the
   optional reaction conditions and their honest warnings, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q09.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q09';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q09/';
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
     /var ANS = QRUN\.answer/.test(src) && !/9\.8|49\/5|19\.8/.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('sections: mission brief, interactive experiment, pressure explorer, detailed solution, how to use',
     /Mission brief/.test(src) && /Interactive experiment/.test(src) && /Pressure explorer/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));

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
  ok('the question is reproduced verbatim', qt === 'Q.9 Two cylinders, both fitted with frictionless pistons, are filled with mixtures of He and Ar gases. In the first cylinder, the masses of He and Ar are m1 and m2, respectively. In the second cylinder, the masses of He and Ar are m2 and m1, respectively. The molar mass of Ar is 10 times the molar mass of He. The external pressure applied by the piston on the first cylinder needs to be 5 times that on the second cylinder so that the volume of the gas mixtures in both the cylinders are equal at the same temperature. Assuming He and Ar behave like ideal gases, the value of (m1/m2) is ____.', qt.slice(0, 80));

  /* ------------------------------------------------ the physics in the page */
  const sci = await E(() => {
    const o = {}, q = PX.qrun();
    o.ans = PX.answer(); o.r = q.r; o.exact = q.exact; o.n = [q.n.n1, q.n.n2]; o.steps = q.scan.length;
    o.pr = [PX.pRatio(1, 10), PX.pRatio(5, 10), PX.pRatio(1 / 9.8, 10)];
    const r = D => { const R = PX.run(D); return { a: R.answer, c: R.complete, ok: R.ok }; };
    o.real = r({ k: '9.98', p: '5', T: '300' }); o.p2 = r({ k: '10', p: '2', T: '300' }); o.p10 = r({ k: '10', p: '10', T: '300' });
    o.k5 = r({ k: '5', p: '5', T: '300' }); o.inv = r({ k: '10', p: '0.2', T: '300' }); o.hot = r({ k: '10', p: '5', T: '600' });
    return o;
  });
  ok('the page finds m1/m2 = 9.80 at run time', sci.ans === '9.80', sci.ans);
  ok('its own bisection agrees with the exact formula to 1e-9', Math.abs(sci.r - 9.8) < 1e-9 && Math.abs(sci.exact - 9.8) < 1e-12, sci.r + ' / ' + sci.exact);
  ok('moles at the answer: n1 = 99, n2 = 19.8 (units m2/10M)', Math.abs(sci.n[0] - 99) < 1e-6 && Math.abs(sci.n[1] - 19.8) < 1e-6);
  ok('P1/P2 at m1 = m2 is 1; at the trap 5 it is 3.4; at 1/9.8 it is 0.2', Math.abs(sci.pr[0] - 1) < 1e-12 && Math.abs(sci.pr[1] - 3.4) < 1e-12 && Math.abs(sci.pr[2] - 0.2) < 1e-12);
  ok('real molar masses give 9.82, flagged as not the question', sci.real.a === '9.82' && !sci.real.c);
  ok('p = 2 gives 2.38; p = 0.2 gives the inverse 0.10', sci.p2.a === '2.38' && sci.inv.a === '0.10');
  ok('p = k or k = p: no solution, reported honestly', !sci.p10.ok && sci.p10.a === 'no solution' && !sci.k5.ok);
  ok('temperature changes nothing: 600 K still gives 9.80', sci.hot.a === '9.80');

  /* ------------------------------------------------ before the run */
  ok('the header answer starts locked', /Investigating m₁\/m₂/.test(await p.textContent('#ansval')) && await E(() => document.getElementById('answerbox').classList.contains('locked')));
  ok('the answer is shown nowhere before the run', !/9\.80|ANSWER FOUND|49\/5/.test(await E(() => document.body.innerText)));
  ok('the solution is locked', await E(() => document.getElementById('solbody').hidden && !document.getElementById('solgate').hidden));
  ok('the unknowns start as ?', await E(() => ['A', 'B', 'R'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['k', 'p', 'T'].map(k => document.getElementById('in_' + k).value));
  ok('every value is pre-set to the question', vals.join(',') === '10,5,300', vals.join(','));
  ok('status reads QUESTION VALUES LOADED', /QUESTION VALUES LOADED/.test(await p.textContent('#status')));
  ok('START reads START EXPERIMENT', /START EXPERIMENT/.test(await p.textContent('#gobtn')));
  ok('guidance says to set values or use the defaults', /Set your values or use the question defaults/.test(await p.textContent('#guide')));
  ok('the explorer starts at m1 = m2, not at the answer', (await p.textContent('#x_rv')) === '1.00');

  /* ------------------------------------------------ optional conditions */
  await E(() => PX.setField('p', '10'));
  ok('changing a value switches to USING CUSTOM VALUES', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  ok('...with an honest warning, including that no ratio can work', /needs P₁ = 5/.test(await p.textContent('#condwarn')) && /no positive mass ratio/.test(await p.textContent('#condwarn')));
  await E(() => PX.setField('T', '600'));
  ok('a temperature change is explained as cancelling', /cancels/.test(await p.textContent('#condwarn')));
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['k', 'p', 'T'].map(k => document.getElementById('in_' + k).value))).join(',') === '10,5,300'
     && /QUESTION VALUES LOADED/.test(await p.textContent('#status')) && await E(() => document.getElementById('condwarn').hidden));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question values', await E(() => PX.RUN.state) === 'running' && await E(() => PX.RUN.D.k === '10' && PX.RUN.D.p === '5'));
  ok('status: preparing experiment', /Preparing experiment/.test(await p.textContent('#xstattxt')));
  ok('values lock while it runs', await E(() => document.getElementById('in_k').disabled));
  ok('the answer panel narrates: Loading the cylinders', /Loading the cylinders/.test(await p.textContent('#ansval')));
  await sleep(2600);
  ok('status: experiment running; temperature shown', /Experiment running/.test(await p.textContent('#xstattxt')) && /300 K/.test(await p.textContent('#g_T')));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [], msgs = new Set();
  for (let i = 0; i < 700; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansval').textContent, r: document.getElementById('g_r').textContent, pr: document.getElementById('g_p').textContent, T: document.getElementById('g_T').textContent, rt: document.querySelector('#u_R .v').textContent }));
    seen.add(s.st); live.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all nine stages', ['load', 'moles', 'gas', 'scan', 'lock', 'check', 'temp', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer panel steps through every message', ['Loading the cylinders', 'Converting masses to moles', 'Applying PV = nRT', 'Scanning m₁/m₂', 'Locking the pistons', 'Back-checking', 'Testing the temperature', 'Auditing the traps', 'Calculating final result'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)), [...msgs].join(' / ').slice(0, 160));
  const trials = new Set(live.filter(s => s.now && s.now.name === 'scan').map(s => s.r));
  ok('live data: the scan visits many trial ratios', trials.size >= 6, trials.size + ' distinct');
  ok('live data: P1/P2 reaches 5.0000 once the pistons lock', live.some(s => s.now && s.now.name === 'lock' && s.pr === '5.0000'));
  ok('live data: the temperature climbs during the T test while P1/P2 stays 5', live.some(s => s.now && s.now.name === 'temp' && parseInt(s.T, 10) > 400) && live.filter(s => s.now && s.now.name === 'temp').every(s => s.pr === '5.0000'));
  ok('m1/m2 is unknown until the pistons lock', live.some(s => s.now && s.now.name === 'scan' && s.rt === '?') && live.some(s => s.now && s.now.name === 'check' && s.rt === '9.80'));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'load,moles,gas,scan,lock,check,temp,c,d,match', (await E(() => PX.calcKeys())).join(','));
  ok('the case file: n1 99.00, n2 19.80, m1/m2 9.80', await E(() => ['A', 'B', 'R'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(',')) === '99.00,19.80,9.80');
  ok('the scan table has one row per step', await E(() => document.querySelectorAll('#log tbody tr').length) >= 20);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('audit: P ∝ n holds, the solved value holds, both traps fail', cards.A === true && cards.B === true && cards.C === false && cards.D === false, JSON.stringify(cards));
  ok('all six badges are earned', await E(() => ['mol', 'gas', 'sol', 'chk', 'trap', 'mas'].every(k => PX.badges()[k])) && await E(() => document.querySelectorAll('.badge.on').length) === 6);
  ok('the P1/P2 curve and the mole bars are drawn from the model', await E(() => document.querySelectorAll('#curve path').length >= 1 && document.querySelectorAll('#curve circle').length >= 5 && document.querySelectorAll('#bars rect').length === 4));
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: moles, P ∝ n, scan, check = 5, T cancels, answer', /n = m\/M/.test(cl) && /R, T and V cancel/.test(cl) && /halvings/.test(cl) && /= 5 ✓/.test(cl) && /cancels/.test(cl) && /m₁\/m₂ = 9\.80/.test(cl));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, m1/m2 = 9.80', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /m₁\/m₂ = 9\.80/.test(rv), rv.slice(0, 80));
  ok('...with the equation and the mole ratio as graffiti', /5m₁ = 49m₂/.test(rv) && /99\.00 : 19\.80 = 5 : 1/.test(rv));
  ok('the header unlocks to 9.80', (await p.textContent('#ansval')).trim() === '9.80');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution unlocks with the answer', await E(() => !document.getElementById('solbody').hidden) && (await p.textContent('#solans')) === '9.80' && /5m₁ = 49m₂/.test(await p.textContent('#solbody')));
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));

  /* ------------------------------------------------ tools and the pressure explorer */
  await p.click('#t_eq'); await p.click('#t_why'); await sleep(150);
  ok('SHOW EQUATION and SHOW WHY? toggle', await E(() => document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_why').getAttribute('aria-pressed') === 'true'));
  await p.click('#t_eq'); await p.click('#t_why');
  await p.click('#x_solve'); await sleep(150);
  ok('explorer SOLVE moves the slider to 9.80', (await p.textContent('#x_rv')) === '9.80' && /9\.80/.test(await p.textContent('#xinfo')));
  await E(() => { const s = document.getElementById('x_p'); s.value = 2; s.dispatchEvent(new Event('input')); });
  await p.click('#x_solve'); await sleep(100);
  ok('explorer at p = 2 solves to 2.38', (await p.textContent('#x_rv')) === '2.38');
  await E(() => { const s = document.getElementById('x_p'); s.value = 12; s.dispatchEvent(new Event('input')); });
  ok('explorer at p = 12 > k says no solution', /none/.test(await p.textContent('#xinfo')));
  await p.click('#x_reset');
  ok('explorer reset returns to the question values at m1 = m2', (await p.textContent('#x_rv')) === '1.00' && (await p.textContent('#x_pv')) === '5');

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0 && await E(() => document.querySelector('#u_R .v').textContent) === '?');
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ custom experiments */
  await E(() => PX.setField('k', '9.98'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const krv = await E(() => document.getElementById('revealhost').textContent);
  ok('real molar masses: 9.82, reported as not the question\'s numbers', /9\.82/.test(krv) && /not the question/.test(krv) && !/ANSWER FOUND/.test(krv), krv.slice(0, 60));
  await p.click('#resetq');
  await E(() => PX.setField('p', '10'));
  await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const crv = await E(() => document.getElementById('revealhost').textContent);
  ok('p = 10: no positive ratio, said plainly', /No positive m₁\/m₂/.test(crv) && !/ANSWER FOUND/.test(crv), crv.slice(0, 60));
  ok('...the ratio tile is flagged, not claimed', await E(() => document.getElementById('u_R').classList.contains('warn')) && await E(() => !PX.badges().mas));
  ok('the header still answers the question itself', (await p.textContent('#ansval')).trim() === '9.80');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  ok('and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 19);
  await p.click('#classbtn');
  await p.click('#revealnow'); await sleep(100);
  ok('Reveal anyway opens the answer without the run', (await p.textContent('#ansval')).trim() === '9.80');
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
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_k').getBoundingClientRect().height, document.getElementById('x_solve').getBoundingClientRect().height]);
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
  ok('reduced motion: complete answer, no animation, no confetti', (await rp.textContent('#ansval')).trim() === '9.80'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && await rp.evaluate(() => document.querySelectorAll('#revealhost rect[width="8"]').length === 0) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.9',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 9);
  ok('chapter States of Matter: Gases and Liquids', e && e.chapter === 'States of Matter: Gases and Liquids');
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
  const T = __dirname + '/apptest-q09';
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
  await a.fill('#q', 'argon'); await sleep(700);
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
