/* ADV-2026-P1-PHY-Q04 - the immersed lens lab: a double convex lens in a liquid, its power against n_L.

   Layout v3 (G5). Drives the finished page headlessly: the file itself, the question and its four
   redrawn plots, the answer line (A or B - the two definitions of power), one START sweeping the liquid
   from 1.00 to 2.00 with the stops at air, water, 1.50 and 2.00, the rays and the focus the engine gives
   at each, both traces and their shapes, the run confirming A and B, pause / replay / reset, the liquid
   controls, classroom mode, the measured visual gates, phone widths, reduced motion, the library and
   feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1phyq04.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-PHY-Q04';
const REL = 'simulations/2026/paper-1/physics/adv-2026-p1-phy-q04/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const invf = n => 15 / n - 10, opt = n => 15 - 10 * n;       /* for comparison only */

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
  ok('the answer is not written into the script: it is the printed plots that match the computed curves',
     /var ANS = QRUN\.answer/.test(src) && /answer: hi\.length === 1 && ho\.length === 1 \? all\.join\(" or "\)/.test(js) && !/ANS\s*=\s*["']|answer\s*[:=]\s*["'][A-D]/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('layout v3 contract: question, lab (canvas + controls), solution, how to use - in that order',
     ['<section id="question"', '<section id="lab"', '<canvas id="labcv"', '<div id="controls"', '<section id="solution"', '<section id="howto"']
       .map(t => src.indexOf(t)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])));
  ok('no dashboards on the page: no rail, gauges, badges, log, evidence table or audit cards',
     !/class="(rail|gz|badge|badges|calc)"|id="(calclist|log|logbox)"/.test(src));
  ok('no dropdowns anywhere', !/<select/.test(src));
  ok('the solution holds the concept, the takeaways, the value table and the four-option table',
     /Understand the concept/.test(src) && /Key takeaways/.test(src) && /78\.2 cm/.test(src) && (src.match(/<tr( class="ok")?><td>\([A-D]\)<\/td>/g) || []).length === 4);
  ok('both definitions are named on the page, and MathonGo\'s choice is stated', /n<sub>L<\/sub><\/i>\/<i>f<\/i>/.test(src) && /MathonGo/.test(src));

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
  ok('the question is reproduced verbatim', qt === 'Q.4 A double convex lens made of glass of refractive index 1.5 and radii of curvature of the curved surfaces 20 cm each is immersed in a liquid of refractive index nL. The correct plot showing the variation of the power, in the units of diopter (D), as a function of nL is:', qt.slice(0, 120));
  ok('the four printed plots are redrawn, each with a description', await E(() => ['A', 'B', 'C', 'D'].every(k => document.querySelector('#og_' + k + ' path') && (document.getElementById('og_' + k).getAttribute('aria-label') || '').length > 40)));
  ok('the answer is visible from load: A or B, with the two definitions', (await p.textContent('#ansval')).trim() === 'A or B' && /\(A\) if power = 1\/f · \(B\) if power = n_L\/f/.test(await p.textContent('#ansexpr')));
  ok('PX.answer() gives the registry answer', await E(() => PX.answer()) === 'A or B');
  ok('options A and B are marked in the question, and only they', await E(() => ['A', 'B'].every(k => document.querySelector('#opts li[data-o="' + k + '"]').classList.contains('correct')) && document.querySelectorAll('#opts li.correct').length === 2));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(A) or (B)');
  ok('the engine: 1/f -> A only, n_L/f -> B only', await E(() => PX.QRUN.invfHits.join() === 'A' && PX.QRUN.opticalHits.join() === 'B'));
  ok('ready state: air, f = 20 cm, 5 D both ways', await E(() => { const s = PX.state(); return s.n === 1 && Math.abs(s.f - 20) < 1e-9 && Math.abs(s.invf - 5) < 1e-12 && Math.abs(s.optical - 5) < 1e-12; }) && /Ready/.test(await p.textContent('#narr')));
  ok('the canvas reports its smallest label, >= 13 px on the desktop', await E(() => PX.minLabelPx()) >= 13, await E(() => PX.minLabelPx()));

  /* ------------------------------------------------ one START sweeps the liquid */
  await p.click('#gobtn');
  ok('START runs it and the button becomes PAUSE', await E(() => PX.state().state) === 'running' && /PAUSE/.test(await p.textContent('#gobtn')));
  await p.click('#gobtn');
  const samples = await runToEnd(p, 2);
  const holds = [...new Set(samples.filter(s => s.phase === 'hold').map(s => s.n.toFixed(2)))];
  ok('the sweep stops at air, water, 1.50 and 2.00 in order', holds.join(',') === '1.00,1.33,1.50,2.00', holds.join(','));
  ok('n_L only rises, from 1.00 to 2.00', samples.every((s, i) => i === 0 || s.n >= samples[i - 1].n - 1e-12) && samples[samples.length - 1].n === 2);
  ok('at every instant both powers and f are the lens formulas', samples.every(s => Math.abs(s.invf - invf(s.n)) < 1e-9 && Math.abs(s.optical - opt(s.n)) < 1e-9 && (Math.abs(s.n - 1.5) < 1e-9 ? s.f === null || !isFinite(s.f) : Math.abs(s.f - 100 / invf(s.n)) < 1e-6)));
  const narrs = [...new Set(samples.map(s => s.narr.slice(0, 16)))];
  ok('the narration names each liquid', ['In air (n_L = 1.', 'Water (n_L = 1.3', 'n_L = 1.50: no i', 'n_L = 2.00 > 1.5', 'Done. The blue t'].every(t => narrs.indexOf(t) >= 0), narrs.join(' | '));
  const last = samples[samples.length - 1], m = last.measured;
  ok('the run traced both curves (> 200 samples)', last.traced > 200, last.traced);
  ok('measured: the 1/f trace is a curve through 5, 0 at 1.50, -2.50 -> plot (A)', m && m.invfHits.join() === 'A' && Math.abs(m.invf.at1 - 5) < 1e-9 && Math.abs(m.invf.at2 + 2.5) < 1e-9 && Math.abs(m.invf.zero - 1.5) < 0.005 && !m.invf.straight);
  ok('measured: the n_L/f trace is a straight line through 5, 0 at 1.50, -5.00 -> plot (B)', m && m.opticalHits.join() === 'B' && Math.abs(m.optical.at2 + 5) < 1e-9 && m.optical.straight);
  ok('the run confirms the answer line', /Confirmed by the run: 1\/f traced a curve through 5\.00, 0 and -2\.50 D \(A\); n_L\/f a straight line through 5\.00, 0 and -5\.00 D \(B\)/.test(await p.textContent('#anssub')) && last.confirmed);
  ok('the answer blinks as it is confirmed', samples.some(s => s.blink) || await E(() => document.getElementById('keyline').classList.contains('blink')));
  await sleep(2200);
  ok('...and stops blinking', await E(() => !document.getElementById('keyline').classList.contains('blink')));
  ok('the button offers RUN AGAIN', /RUN AGAIN/.test(await p.textContent('#gobtn')));

  /* ------------------------------------------------ pause, replay, reset */
  await p.click('#replaybtn'); await sleep(250);
  ok('REPLAY reruns the sweep from air', await E(() => PX.state().state === 'running' && PX.state().measured === null && PX.state().n < 1.2));
  await sleep(1700);
  await p.click('#gobtn'); const t0 = await E(() => PX.state().n); await sleep(500);
  ok('PAUSE freezes the liquid', await E(() => PX.state().n) === t0 && /RESUME/.test(await p.textContent('#gobtn')) && /^Paused/.test(await p.textContent('#narr')));
  await p.click('#gobtn'); await sleep(200);
  ok('RESUME carries on', await E(() => PX.state().state) === 'running');
  await p.click('#resetbtn'); await sleep(150);
  ok('RESET returns to air, ready', await E(() => PX.state().state === 'setup' && PX.state().n === 1 && PX.state().traced === 0) && /Ready/.test(await p.textContent('#narr')));

  /* ------------------------------------------------ the experiment's controls */
  await p.click('#sp2'); ok('speed ½× is a segmented button', await E(() => PX.RUN.speed) === 0.5 && await E(() => document.getElementById('sp2').getAttribute('aria-pressed')) === 'true');
  await p.click('#sp1'); ok('speed 1× restores', await E(() => PX.RUN.speed) === 1);
  await p.click('#lq_water'); await sleep(80);
  ok('Water 1.33: f = 78.2 cm, 1/f = 1.28 D, n_L/f = 1.70 D', await E(() => { const s = PX.state(); return s.n === 1.33 && Math.abs(s.f - 78.24) < 0.01 && Math.abs(s.optical - 1.7) < 1e-9; }) && await E(() => document.getElementById('lq_water').getAttribute('aria-pressed')) === 'true');
  await p.click('#lq_match'); await sleep(80);
  ok('1.50: f infinite, both powers zero, "the lens vanishes"', await E(() => { const s = PX.state(); return s.n === 1.5 && !isFinite(s.f) && s.invf === 0 && s.optical === 0; }) && /lens vanishes/.test(await p.textContent('#narr')));
  await p.click('#lq_dense'); await sleep(80);
  ok('2.00: f = -40 cm, diverging', await E(() => Math.abs(PX.state().f + 40) < 1e-9));
  await p.$eval('#in_n', el => { el.value = '1.7'; el.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(80);
  ok('the slider sets any liquid: 1.70 -> 1/f = -1.18 D, n_L/f = -2.00 D', await E(v => { const s = PX.state(); return s.n === 1.7 && Math.abs(s.invf - v) < 1e-12 && Math.abs(s.optical + 2) < 1e-9; }, invf(1.7)) && (await p.textContent('#nout')) === '1.70'
     && await E(() => ['lq_air', 'lq_water', 'lq_match', 'lq_dense'].every(k => document.getElementById(k).getAttribute('aria-pressed') === 'false')));
  await E(() => PX.setN(5));
  ok('out-of-range input is clamped to 2.00', await E(() => PX.state().n) === 2);
  await p.click('#lq_air'); await sleep(80);
  ok('Air restores n_L = 1.00', await E(() => PX.state().n) === 1);

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
    ok('portrait scene at ' + w + ' px: the canvas re-lays itself out (720 x 1090), labels >= 11 px on screen',
       await mp.evaluate(() => { const c = document.getElementById('labcv'); return c.width === 720 && c.height === 1090 && PX.minLabelPx() * c.getBoundingClientRect().width / c.width >= 11; }));
    const ms = await runToEnd(mp, 6);
    const mm = ms[ms.length - 1].measured;
    const ov1 = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const taps = await mp.evaluate(() => [...document.querySelectorAll('#controls button, #controls input')].map(e => e.getBoundingClientRect().height));
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('44 px touch targets at ' + w + ' px', Math.min.apply(null, taps) >= 44, Math.round(Math.min.apply(null, taps)));
    ok('the run measures A and B at ' + w + ' px too', mm && mm.invfHits.join() === 'A' && mm.opticalHits.join() === 'B');
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await mc.close();
  }

  /* ------------------------------------------------ reduced motion */
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.click('#gobtn'); await sleep(150);
  const rs = await rp.evaluate(() => PX.state());
  ok('reduced motion: one press shows the result at once - both traces, measured, no blinking',
     rs.done && rs.measured && rs.measured.invfHits.join() === 'A' && rs.measured.opticalHits.join() === 'B' && rs.confirmed
     && await rp.evaluate(() => { const k = document.getElementById('keyline'); k.classList.add('blink'); const a = getComputedStyle(k).animationName; k.classList.remove('blink'); return a === 'none'; }) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Physics, Q.4',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Physics' && e.questionNumber === 4);
  ok('status script_verified - automated pipeline, no human review', e && e.status === 'script_verified');
  ok('chapter Ray Optics and Optical Instruments', e && e.chapter === 'Ray Optics and Optical Instruments');
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
  const T = __dirname + '/apptest-p1phyq04';
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
    await a.fill('#q', 'lens'); await sleep(700);
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
