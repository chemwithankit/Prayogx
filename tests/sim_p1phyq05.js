/* ADV-2026-P1-PHY-Q05 - the Bohr jump lab: a Lyman transition in hydrogen, four expressions checked.

   Layout v3 (G5). Drives the finished page headlessly: the file itself, the question and its four
   statements, the answer line ((A), (C)) and PX.answer(), one START running orbit -> jump -> photon ->
   measure -> audit, the orbit quantities against the Bohr formulas at every instant, the audit of each
   expression against the measured change for every starting orbit 2..6, pause / replay / reset, the orbit,
   speed and wave controls, classroom mode, the measured visual gates, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1phyq05.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-PHY-Q05';
const REL = 'simulations/2026/paper-1/physics/adv-2026-p1-phy-q05/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const RY = 13.605693;                                   /* eV, for comparison only */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

async function runToEnd(p, speed){
  const samples = [];
  await p.evaluate(s => { PX.speed(s); PX.start(); }, speed);
  for (let i = 0; i < 2000; i++){
    const s = await p.evaluate(() => Object.assign(PX.state(), { narr: document.getElementById('narr').textContent, blink: document.getElementById('keyline').classList.contains('blink') }));
    samples.push(s);
    if (s.done) break;
    await sleep(20);
  }
  return samples;
}

(async () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const js = src.slice(src.indexOf('<script>'));
  /* ------------------------------------------------ the file itself */
  ok('the page carries its permanent ID', src.includes('<meta name="sim-id" content="' + ID + '">'));
  ok('one self-contained file: no external script, stylesheet, font or fetch',
     !/<script[^>]+src=|<link[^>]+stylesheet|@import|fetch\(|XMLHttpRequest|https?:\/\/(?!www\.w3\.org)/.test(src));
  ok('nothing stored on the device', !/localStorage|sessionStorage|indexedDB/.test(src));
  ok('ES5-safe script', !/=>|\b(let|const)\s+[A-Za-z_$][\w$]*\s*=|`|[\w\])]\?\.[A-Za-z_$]/.test(js));
  ok('the answer is not written into the script: it is the options whose expression equals the true quantity for every Lyman line',
     /var ANS = QRUN\.answer/.test(src) && /for \(n = 2; n <= 6; n\+\+\) if \(!holds\(KEYS\[i\], n\)\) all = false/.test(js) && !/ANS\s*=\s*["']|answer\s*[:=]\s*["']\(/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('layout v3 contract: question, lab (canvas + controls), solution, how to use - in that order',
     ['<section id="question"', '<section id="lab"', '<canvas id="labcv"', '<div id="controls"', '<section id="solution"', '<section id="howto"']
       .map(t => src.indexOf(t)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])));
  ok('no dashboards on the page: no rail, gauges, badges, log, evidence table or audit cards',
     !/class="(rail|gz|badge|badges|calc)"|id="(calclist|log|logbox)"/.test(src));
  ok('no dropdowns anywhere', !/<select/.test(src));
  ok('the solution holds the concept, the takeaways and the four-option table with the n = 3 numbers',
     /Understand the concept/.test(src) && /Key takeaways/.test(src) && /12\.09 eV/.test(src) && /26\.6 Å/.test(src) && /6\.65 Å/.test(src) && /24\.19 eV/.test(src) && !/24\.18/.test(src));

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
  ok('the question is reproduced verbatim', qt === 'Q.5 Consider a hydrogen atom with vk, rk, and Kk denoting the velocity, orbital radius and kinetic energy of the electron in the kth orbit, respectively. The electron undergoes a transition from the nth orbit, emitting radiation corresponding to the Lyman series. Considering h to be the Planck’s constant and ϵ0 the permittivity of the free space, the correct statement(s) is/are:', qt.slice(0, 120));
  ok('the four statements as printed', (await E(() => [...document.querySelectorAll('#opts li')].map(l => l.textContent.replace(/\s+/g, ' ').trim()).join(' | '))) ===
     '(A)Magnitude of change in kinetic energy of electron can be expressed as h/4π · |n vn/rn − v1/r1|. | (B)Magnitude of change in de Broglie wavelength of the electron can be expressed as e²/4ϵ0 · |1/Kn − 1/K1|. | (C)Frequency of the radiation emitted can be expressed as e²/(8πϵ0h) · (1/r1 − 1/rn). | (D)Magnitude of change in total energy of the electron can be expressed as h/2π · |v1/r1 − n vn/rn|.');
  ok('the answer is visible from load: (A), (C)', (await p.textContent('#ansval')).trim() === '(A), (C)');
  ok('PX.answer() gives the registry answer', await E(() => PX.answer()) === '(A), (C)');
  ok('options A and C are marked in the question, and only they', await E(() => ['A', 'C'].every(k => document.querySelector('#opts li[data-o="' + k + '"]').classList.contains('correct')) && document.querySelectorAll('#opts li.correct').length === 2));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(A), (C)');
  ok('ready state: orbit 3 (the default), K = 1.51 eV', await E(() => { const s = PX.state(); return s.n === 3 && s.orbit === 3 && Math.abs(s.K / PX.ENGINE.e - 13.605693 / 9) < 1e-5; }) && /Ready/.test(await p.textContent('#narr')));
  ok('the canvas reports its smallest label, >= 13 px on the desktop', await E(() => PX.minLabelPx()) >= 13, await E(() => PX.minLabelPx()));

  /* ------------------------------------------------ one START runs the whole experiment */
  await p.click('#gobtn');
  ok('START runs it and the button becomes PAUSE', await E(() => PX.state().state) === 'running' && /PAUSE/.test(await p.textContent('#gobtn')));
  await p.click('#gobtn');
  const samples = await runToEnd(p, 2);
  const order = []; samples.forEach(s => { if (order[order.length - 1] !== s.phase) order.push(s.phase); });
  ok('with no further clicks it runs orbit -> jump -> photon -> measure -> audit -> done', order.slice(order.indexOf('orbit')).join(',') === 'orbit,jump,photon,measure,audit,done', order.join(','));
  ok('the readouts are the Bohr values of the current orbit at every instant (v ~ 1/k, r ~ k^2, K ~ 1/k^2, lambda ~ k)', samples.every(s => {
     const k = s.orbit; return Math.abs(s.K / 1.602176634e-19 - RY / (k * k)) < 1e-4 && Math.abs(s.r / 5.29177e-11 - k * k) < 1e-3 * k * k && Math.abs(s.lam / 3.32492e-10 - k) < 1e-3 * k && Math.abs(s.v / 2.18769e6 - 1 / k) < 1e-4; }));
  ok('orbit 3 before the jump, orbit 1 after it', samples.filter(s => s.phase === 'orbit').every(s => s.orbit === 3) && samples.filter(s => s.phase === 'photon').every(s => s.orbit === 1));
  const narrs = [...new Set(samples.map(s => s.narr.slice(0, 14)))];
  ok('the narration names each stage', ['Orbit 3: m v r', 'The electron j', 'Its total ener', 'Measured chang', 'Checking each ', 'Result for the'].every(t => narrs.indexOf(t) >= 0), narrs.join(' | '));
  ok('the audit reveals the options one by one', [1, 2, 3, 4].every(r => samples.some(s => s.phase === 'audit' && s.rows === r)));
  const last = samples[samples.length - 1], au3 = last.audit;
  ok('audit (A): the expression equals the measured |dK| = 12.09 eV', au3 && au3.A.ok && Math.abs(au3.A.truth / 1.602176634e-19 - 12.0939) < 1e-3 && Math.abs(au3.A.expr / au3.A.truth - 1) < 1e-12);
  ok('audit (B): 26.6 A against the measured 6.65 A - fails', au3 && !au3.B.ok && Math.abs(au3.B.expr * 1e10 - 26.599) < 0.01 && Math.abs(au3.B.truth * 1e10 - 6.6498) < 0.001);
  ok('audit (C): the expression equals the photon frequency 2.92e15 Hz', au3 && au3.C.ok && Math.abs(au3.C.truth / 1e15 - 2.9243) < 1e-3);
  ok('audit (D): 24.19 eV against the measured 12.09 eV - fails', au3 && !au3.D.ok && Math.abs(au3.D.expr / au3.D.truth - 2) < 1e-12);
  ok('the run measures the answer (A), (C) and confirms the answer line', last.measuredAnswer === '(A), (C)' && last.confirmed && /Confirmed by the run for the jump 3 → 1/.test(await p.textContent('#anssub')));
  ok('the answer blinks as it is confirmed', samples.some(s => s.blink) || await E(() => document.getElementById('keyline').classList.contains('blink')));
  await sleep(2200);
  ok('...and stops blinking', await E(() => !document.getElementById('keyline').classList.contains('blink')));
  ok('the button offers RUN AGAIN', /RUN AGAIN/.test(await p.textContent('#gobtn')));

  /* ------------------------------------------------ every starting orbit */
  for (const k of [2, 4, 5, 6]){
    await p.click('#n' + k); await sleep(60);
    const ms = await runToEnd(p, 8);
    const au = ms[ms.length - 1].audit;
    ok('from orbit ' + k + ': A and C hold, B is ' + (k + 1) + '× and D 2× the measured change', au && au.A.ok && au.C.ok && !au.B.ok && !au.D.ok
       && Math.abs(au.B.expr / au.B.truth - (k + 1)) < 1e-9 && Math.abs(au.D.expr / au.D.truth - 2) < 1e-12
       && Math.abs(au.A.truth / 1.602176634e-19 - RY * (1 - 1 / (k * k))) < 1e-4 && ms[ms.length - 1].measuredAnswer === '(A), (C)');
  }
  await p.click('#n3'); await sleep(60);

  /* ------------------------------------------------ pause, replay, reset */
  await p.click('#replaybtn'); await sleep(250);
  ok('REPLAY reruns from orbit 3', await E(() => PX.state().state === 'running' && PX.state().audit === null && PX.state().orbit === 3));
  await p.click('#gobtn'); const t0 = await E(() => PX.state().t); await sleep(500);
  ok('PAUSE freezes the run', await E(() => PX.state().t) === t0 && /RESUME/.test(await p.textContent('#gobtn')) && /^Paused/.test(await p.textContent('#narr')));
  await p.click('#gobtn'); await sleep(200);
  ok('RESUME carries on', await E(() => PX.state().state) === 'running');
  await p.click('#resetbtn'); await sleep(150);
  ok('RESET returns to the ready state', await E(() => PX.state().state === 'setup' && PX.state().phase === 'ready' && PX.state().t === 0) && /Ready/.test(await p.textContent('#narr')));

  /* ------------------------------------------------ the experiment's controls */
  await p.click('#sp2'); ok('speed ½× is a segmented button', await E(() => PX.RUN.speed) === 0.5 && await E(() => document.getElementById('sp2').getAttribute('aria-pressed')) === 'true');
  await p.click('#sp1'); ok('speed 1× restores', await E(() => PX.RUN.speed) === 1);
  await p.click('#woff'); ok('wave OFF hides the de Broglie wave', await E(() => PX.RUN.wave) === false && await E(() => document.getElementById('woff').getAttribute('aria-pressed')) === 'true');
  await p.click('#won'); ok('wave ON shows it', await E(() => PX.RUN.wave) === true);
  await p.click('#n5'); ok('orbit 5 is a segmented button and resets the run', await E(() => PX.state().n === 5 && PX.state().state === 'setup') && await E(() => document.getElementById('n5').getAttribute('aria-pressed')) === 'true');
  await E(() => PX.setN(9)); ok('an impossible orbit falls back to 3', await E(() => PX.state().n) === 3);

  /* ------------------------------------------------ classroom */
  await p.click('#classbtn'); await sleep(250);
  ok('CLASSROOM widens the experiment to the screen and hides the rest', await E(() => document.getElementById('labcv').getBoundingClientRect().width >= 0.95 * innerWidth - 40
     && getComputedStyle(document.getElementById('solution')).display === 'none' && getComputedStyle(document.getElementById('question')).display === 'none'));
  ok('...and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 22);
  await p.click('#classbtn'); await sleep(150);
  ok('...and exits cleanly', await E(() => !document.body.classList.contains('classroom') && getComputedStyle(document.getElementById('solution')).display !== 'none'));
  await p.click('#themebtn'); ok('the theme toggle switches', await E(() => !!document.documentElement.getAttribute('data-theme')));

  ok('every id is unique', await E(() => { const a = [...document.querySelectorAll('[id]')].map(e => e.id); return a.length === new Set(a).size; }));
  ok('every canvas and chart has an accessible label', await E(() => [...document.querySelectorAll('canvas, svg[role=img]')].every(e => (e.getAttribute('aria-label') || '').length > 10)));
  ok('the how-to section has five short points', await E(() => document.querySelectorAll('#howto ol.howto > li').length) === 5);
  ok('the page says script-verified, never human-verified', /script-verified/.test(src) && !/human[- ]verified/i.test(src));
  ok('console clean on the desktop run', errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();

  /* ------------------------------------------------ layout v3 visual gates, measured */
  const gr = await gates(FILE);
  const gf = gr.filter(r => r.status === 'FAIL').map(r => r.gate);
  ok('visual gates A C D E F I J all pass (B G H are the screenshots and the verifier)', gf.length === 0 && gr.filter(r => r.status === 'PASS').length === 7, gf.join('') || 'all pass');

  /* ------------------------------------------------ phones */
  for (const w of [390, 360]){
    const mc = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
    const mp = await mc.newPage(); const me = [];
    mp.on('pageerror', e => me.push(e.message)); mp.on('console', x => { if (x.type() === 'error') me.push(x.text()); });
    await mp.goto(URL); await sleep(500);
    const ov0 = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok('portrait scene at ' + w + ' px: the canvas re-lays itself out (720 x 1250), labels >= 11 px on screen',
       await mp.evaluate(() => { const c = document.getElementById('labcv'); return c.width === 720 && c.height === 1250 && PX.minLabelPx() * c.getBoundingClientRect().width / c.width >= 11; }));
    const ms = await runToEnd(mp, 6);
    const ov1 = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const taps = await mp.evaluate(() => [...document.querySelectorAll('#controls button, #controls input')].map(e => e.getBoundingClientRect().height));
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('44 px touch targets at ' + w + ' px', Math.min.apply(null, taps) >= 44, Math.round(Math.min.apply(null, taps)));
    ok('the run measures (A), (C) at ' + w + ' px too', ms[ms.length - 1].measuredAnswer === '(A), (C)');
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await mc.close();
  }

  /* ------------------------------------------------ reduced motion */
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.click('#gobtn'); await sleep(150);
  const rs = await rp.evaluate(() => PX.state());
  ok('reduced motion: one press shows the result at once - the audit, measured, no blinking',
     rs.done && rs.audit && rs.measuredAnswer === '(A), (C)' && rs.confirmed && rs.rows === 4
     && await rp.evaluate(() => { const k = document.getElementById('keyline'); k.classList.add('blink'); const a = getComputedStyle(k).animationName; k.classList.remove('blink'); return a === 'none'; }) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Physics, Q.5',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Physics' && e.questionNumber === 5);
  ok('status script_verified - automated pipeline, no human review', e && e.status === 'script_verified');
  ok('chapter Atoms', e && e.chapter === 'Atoms');
  ok('meta.json is the manifest entry', e && JSON.stringify(JSON.parse(fs.readFileSync(ROOT + '/' + REL + 'meta.json', 'utf8'))) === JSON.stringify(e));
  const cat = JSON.parse(fs.readFileSync(ROOT + '/content/catalog.json', 'utf8'));
  const idx = JSON.parse(fs.readFileSync(ROOT + '/content/index.json', 'utf8'));
  const lock = JSON.parse(fs.readFileSync(ROOT + '/data/revisions.json', 'utf8'));
  if (published){
    ok('the catalogue lists it at its revision', cat.revisions && cat.revisions[ID] === e.revision);
    ok('the card index carries it with its path and status', idx.simulations.some(s => s.id === ID && s.path === REL + 'index.html' && s.status === 'script_verified'));
    ok('its detail record, search text, crawlable page and sitemap entry exist', fs.existsSync(ROOT + '/content/sims/' + ID + '.json')
       && !!JSON.parse(fs.readFileSync(ROOT + '/content/search.json', 'utf8')).text[ID]
       && fs.existsSync(ROOT + '/s/' + ID + '/index.html') && fs.readFileSync(ROOT + '/sitemap.xml', 'utf8').includes('/s/' + ID + '/'));
    const sha = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex');
    ok('the revision lock records this exact file', lock[ID] && lock[ID].sha256 === sha && lock[ID].revision === e.revision);
  } else {
    ok('a draft stays off the feed, the sitemap and the lock', !idx.simulations.some(s => s.id === ID) && !lock[ID] && !fs.readFileSync(ROOT + '/sitemap.xml', 'utf8').includes(ID));
  }

  /* ------------------------------------------------ Android: real app shell, real feed */
  const net = require('net');
  const freePort = () => new Promise(res => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
  const PS = await freePort(), PA = await freePort();
  const site = spawn('python3', [__dirname + '/corsserve.py', String(PS), ROOT], { stdio: 'ignore' });
  const T = __dirname + '/apptest-p1phyq05';
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
  ok('the app finds the whole published library in the feed', await a.evaluate(() => window.__prayogx.state().sims) === man.simulations.filter(s => s.status !== 'draft').length);
  if (published){
    await a.fill('#q', 'Bohr'); await sleep(700);
    const at = await a.evaluate(t => [...document.querySelectorAll('.simcard')].findIndex(c => c.innerText.indexOf(t[0]) >= 0 || c.innerText.indexOf(t[1]) >= 0), [e.title, e.shortTitle]);
    ok('app search finds its card', at >= 0);
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
