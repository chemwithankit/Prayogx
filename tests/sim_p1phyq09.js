/* ADV-2026-P1-PHY-Q09 - the buoyant pendulum lab: a hinged rod in two liquids, n in T = (2 pi/n) sqrt(L/g).

   Layout v3 (G5). Drives the finished page headlessly: the file itself, the question and figure, the answer
   line (n = 1.73) and PX.answer(), one START releasing the rod and timing three swings, the motion against
   the model at every instant, n measured for each nudge, pause / replay / reset, the nudge, force and speed
   controls, classroom mode, the measured visual gates, phone widths, reduced motion, the library and feed
   entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1phyq09.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-PHY-Q09';
const REL = 'simulations/2026/paper-1/physics/adv-2026-p1-phy-q09/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const N3 = Math.sqrt(3);                                      /* for comparison only */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

async function runToEnd(p, speed){
  const samples = [];
  await p.evaluate(s => { PX.speed(s); PX.start(); }, speed);
  for (let i = 0; i < 3000; i++){
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
  ok('the answer is not written into the script: n is computed from the torques and I',
     /var ANS = QRUN\.answer/.test(src) && /answer: n\.toFixed\(2\)/.test(js) && /function torque/.test(js) && !/ANS\s*=\s*["']|1\.73["']/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('layout v3 contract: question, lab (canvas + controls), solution, how to use - in that order',
     ['<section id="question"', '<section id="lab"', '<canvas id="labcv"', '<div id="controls"', '<section id="solution"', '<section id="howto"']
       .map(t => src.indexOf(t)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])));
  ok('no dashboards on the page: no rail, gauges, badges, log, evidence table or audit cards',
     !/class="(rail|gz|badge|badges|calc)"|id="(calclist|log|logbox)"/.test(src));
  ok('no dropdowns anywhere', !/<select/.test(src));
  ok('the solution holds the concept, the takeaways, the torques and the drag/added-mass caveat',
     /Understand the concept/.test(src) && /Key takeaways/.test(src) && /\(3\/4\)<i>ρAgL<\/i>²/.test(src) && /added mass/.test(src) && /order <i>θ<\/i>³/.test(src));

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
  ok('the question is reproduced verbatim', qt === 'Q.9 A tank contains two immiscible liquids of densities 6ρ and 2ρ. The higher density liquid is filled up to a height L/2 from the bottom. A thin rod of density ρ and length L is fully immersed and hinged at the bottom so that it can oscillate freely, as shown in the figure. If the rod is slightly disturbed from its equilibrium, the time period of small oscillations is (2π/n)√(L/g), where g is the acceleration due to gravity. The value of n is:', qt.slice(0, 120));
  ok('the figure is redrawn and labelled', await E(() => (document.querySelector('.qfig svg').getAttribute('aria-label') || '').indexOf('hinged at the bottom') > 0));
  ok('the answer is visible from load: n = 1.73', (await p.textContent('#ansval')).trim() === 'n = 1.73');
  ok('PX.answer() gives the registry answer', await E(() => PX.answer()) === '1.73');
  ok('the engine: kappa = rho A g L^2, I = rho A L^3/3, n = sqrt 3, inside the key range', await E(() => Math.abs(PX.QRUN.kappa - 1) < 1e-9 && Math.abs(PX.QRUN.I - 1 / 3) < 1e-12 && Math.abs(PX.QRUN.n - Math.sqrt(3)) < 1e-9 && PX.QRUN.inKey));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '1.73');
  ok('ready state: the rod upright, nudge 6 deg', await E(() => PX.state().th === 0 && PX.state().amp === 6) && /Ready/.test(await p.textContent('#narr')));
  ok('the canvas reports its smallest label, >= 13 px on the desktop', await E(() => PX.minLabelPx()) >= 13, await E(() => PX.minLabelPx()));

  /* ------------------------------------------------ one START runs the whole experiment */
  await p.click('#gobtn');
  ok('START runs it and the button becomes PAUSE', await E(() => PX.state().state) === 'running' && /PAUSE/.test(await p.textContent('#gobtn')));
  await p.click('#gobtn');
  const samples = await runToEnd(p, 3);
  const order = []; samples.forEach(s => { if (order[order.length - 1] !== s.phase) order.push(s.phase); });
  ok('with no further clicks it runs release -> swing -> done', order.slice(order.indexOf('release')).join(',') === 'release,swing,done', order.join(','));
  const mv = samples.filter(s => s.state === 'running');
  ok('the motion conserves energy: (1/2) I om^2 + U(th) stays at U(6 deg)', mv.length > 10 && (() => {
     const U = th => { const c = Math.cos(th), s = Math.min(1, 0.5 / c), Phi = h => h < 0.5 ? 6 * h : 3 + 2 * (h - 0.5), n = 400; let u = 0;
       for (let k = 0; k < n; k++){ const l = (k + 0.5) / n; u += (l * c - Phi(l * c)) / n; } return u; };
     const E0 = U(6 * Math.PI / 180); return mv.every(s => Math.abs(0.5 * (1 / 3) * s.om * s.om + U(s.th) - E0) < 2e-4); })());
  ok('the tilt stays within the nudge and crosses zero at least three times', mv.every(s => Math.abs(s.th) <= 6 * Math.PI / 180 + 1e-9) && samples[samples.length - 1].crossings >= 4);
  const narrs = [...new Set(samples.map(s => s.narr.slice(0, 14)))];
  ok('the narration names each stage', ['Released at 6°', 'Rocking: swing', 'Measured: T = '].every(t => narrs.indexOf(t) >= 0), narrs.join(' | '));
  const last = samples[samples.length - 1], m = last.measured;
  ok('measured: T = 1.157 s for L = 1 m', m && Math.abs(m.Tsec - 2 * Math.PI / N3 * Math.sqrt(1 / 9.8) * (1.7321 / m.n) * (m.n / 1.7321)) < 5e-3, m && m.Tsec);
  ok('measured: n = 2 pi/(T sqrt(g/L)) = 1.734 at 6 deg - sqrt 3 with the finite-amplitude correction (1 + A^2/8)', m && Math.abs(m.n - N3 * (1 + Math.pow(6 * Math.PI / 180, 2) / 8)) / N3 < 2e-4, m && m.n);
  ok('the run confirms the answer line', last.confirmed && /Confirmed by the run: 3 swings from 6° give T = 1\.157 s/.test(await p.textContent('#anssub')));
  ok('the answer blinks as it is confirmed', samples.some(s => s.blink) || await E(() => document.getElementById('keyline').classList.contains('blink')));
  await sleep(2200);
  ok('...and stops blinking', await E(() => !document.getElementById('keyline').classList.contains('blink')));
  ok('the button offers RUN AGAIN', /RUN AGAIN/.test(await p.textContent('#gobtn')));

  /* ------------------------------------------------ other nudges */
  for (const [amp, lo, hi] of [[3, 1.731, 1.734], [12, 1.735, 1.75]]){
    await p.click('#am' + amp); await sleep(60);
    const ms = await runToEnd(p, 6); const mm = ms[ms.length - 1].measured;
    ok('nudge ' + amp + '°: n = ' + (mm && mm.n.toFixed(3)) + ' (small swings give sqrt 3; 12° is slightly stiffer), still in the key range', mm && mm.n > lo && mm.n < hi && mm.n >= 1.70 && mm.n <= 1.75 && ms[ms.length - 1].confirmed);
  }
  await p.click('#am6'); await sleep(60);
  await E(() => PX.setAmp(45)); ok('an impossible nudge falls back to 6°', await E(() => PX.state().amp) === 6);
  await p.click('#foff'); ok('forces OFF hides the arrows', await E(() => PX.RUN.forces) === false && await E(() => document.getElementById('foff').getAttribute('aria-pressed')) === 'true');
  await p.click('#fon'); ok('forces ON shows them', await E(() => PX.RUN.forces) === true);
  await E(() => PX.speed(1)); await p.click('#replaybtn'); await sleep(250);
  ok('REPLAY reruns from the release', await E(() => PX.state().state === 'running' && PX.state().measured === null && PX.state().crossings === 0));
  await p.click('#gobtn'); const t0 = await E(() => PX.state().tm); await sleep(500);
  ok('PAUSE freezes the rod', await E(() => PX.state().tm) === t0 && /RESUME/.test(await p.textContent('#gobtn')) && /^Paused/.test(await p.textContent('#narr')));
  await p.click('#gobtn'); await sleep(200);
  ok('RESUME carries on', await E(() => PX.state().state) === 'running');
  await p.click('#resetbtn'); await sleep(150);
  ok('RESET returns to the upright rod', await E(() => PX.state().state === 'setup' && PX.state().phase === 'ready' && PX.state().th === 0) && /Ready/.test(await p.textContent('#narr')));
  await p.click('#sp2'); ok('speed ½× is a segmented button', await E(() => PX.RUN.speed) === 0.5 && await E(() => document.getElementById('sp2').getAttribute('aria-pressed')) === 'true');
  await p.click('#sp1'); ok('speed 1× restores', await E(() => PX.RUN.speed) === 1);

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
    ok('portrait scene at ' + w + ' px: the canvas re-lays itself out (720 x 1220), labels >= 11 px on screen',
       await mp.evaluate(() => { const c = document.getElementById('labcv'); return c.width === 720 && c.height === 1220 && PX.minLabelPx() * c.getBoundingClientRect().width / c.width >= 11; }));
    const ms2 = await runToEnd(mp, 6);
    const ov1 = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const taps = await mp.evaluate(() => [...document.querySelectorAll('#controls button, #controls input')].map(e => e.getBoundingClientRect().height));
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('44 px touch targets at ' + w + ' px', Math.min.apply(null, taps) >= 44, Math.round(Math.min.apply(null, taps)));
    ok('the run measures n = 1.73 at ' + w + ' px too', ms2[ms2.length - 1].measured && ms2[ms2.length - 1].measured.n.toFixed(2) === '1.73');
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await mc.close();
  }

  /* ------------------------------------------------ reduced motion */
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.click('#gobtn'); await sleep(150);
  const rs = await rp.evaluate(() => PX.state());
  ok('reduced motion: one press shows the timed period and n at once, no blinking',
     rs.done && rs.measured && Math.abs(rs.measured.n - Math.sqrt(3) * (1 + Math.pow(6 * Math.PI / 180, 2) / 8)) < 5e-4 && rs.confirmed && rs.phase === 'done'
     && await rp.evaluate(() => { const k = document.getElementById('keyline'); k.classList.add('blink'); const a = getComputedStyle(k).animationName; k.classList.remove('blink'); return a === 'none'; }) && re.length === 0, JSON.stringify(rs) + ' ' + re.join('|'));
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Physics, Q.9',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Physics' && e.questionNumber === 9);
  ok('status script_verified - automated pipeline, no human review', e && e.status === 'script_verified');
  ok('chapter Oscillations', e && e.chapter === 'Oscillations');
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
  const T = __dirname + '/apptest-p1phyq09';
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
    await a.fill('#q', 'hinged rod'); await sleep(700);
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
