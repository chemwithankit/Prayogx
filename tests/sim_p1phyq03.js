/* ADV-2026-P1-PHY-Q03 - the corner tip-off lab: a solid cylinder rolls off a vertical edge.

   The first page built to layout v3 (G5). Drives the finished page headlessly: the file itself, the
   physics the run measures (the centre on a circle about the corner, energy, the corner's push falling
   to zero at cos = 5/7), the answer confirmed by the run, pause / replay / reset, the v0 control and its
   honest warnings, the speed and force toggles, classroom mode, the measured visual gates, phone widths,
   reduced motion, the library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1phyq03.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-PHY-Q03';
const REL = 'simulations/2026/paper-1/physics/adv-2026-p1-phy-q03/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const C57 = 5 / 7;                                    /* v^2/gR of option B, for comparison only */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

async function runToEnd(p, speed){
  const samples = [];
  await p.evaluate(s => { PX.setSpeed(s); PX.start(); }, speed);
  for (let i = 0; i < 1200; i++){
    const s = await p.evaluate(() => PX.state());
    samples.push(s);
    if (s.done) break;
    await sleep(25);
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
  ok('the answer is not written into the script: it is the printed option that matches the computed v^2',
     /var ANS = QRUN\.answer/.test(src) && /R\.answer = hits\.length === 1 && q\.question \? hits\[0\]\.key/.test(js) && !/ANS\s*=\s*["']|answer\s*[:=]\s*["'][A-D]["']|0\.714/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('layout v3 contract: question, lab (canvas + controls), solution, analysis, how to use - in that order',
     ['<section id="question"', '<section id="lab"', '<canvas id="labcv"', '<div id="controls"', '<section id="solution"', '<section id="analysis"', '<section id="howto"']
       .map(t => src.indexOf(t)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])));
  ok('no dashboards on the page: no rail, gauges, badges, log, evidence table or audit cards',
     !/class="(rail|gz|badge|badges|calc)"|id="(calclist|log|logbox)"/.test(src));
  ok('no dropdowns anywhere', !/<select/.test(src));
  ok('the solution holds the concept, the takeaways, a drawn figure and the four-option table',
     /Understand the concept/.test(src) && /Key takeaways/.test(src) && (src.match(/<div class="solfig">/g) || []).length === 1 && (src.match(/<tr( class="ok")?><td>\([A-D]\)/g) || []).length === 4);

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
  ok('the question is reproduced verbatim', qt === 'Q.3 A solid cylinder of radius R rolls without slipping with a center of mass speed v0 = √gR/3 on a horizontal surface with a vertical edge, as shown in the figure. Here, g is the acceleration due to the gravity. At the moment when the cylinder loses contact with the surface due to rotation around the corner, the speed of its center of mass is:', qt.slice(0, 120));
  ok('the four options as printed', (await E(() => [...document.querySelectorAll('#opts li')].map(l => l.textContent.replace(/\s+/g, '')).join(' | '))) === '(A)0 | (B)√5gR/7 | (C)√gR/15 | (D)√3gR/7');
  ok('the figure is redrawn and labelled', await E(() => (document.querySelector('.qfig svg').getAttribute('aria-label') || '').indexOf('vertical edge') > 0));
  ok('the answer is visible from load: (B), v = √(5gR/7)', (await p.textContent('#ansval')).trim() === '(B)' && (await p.textContent('#ansexpr')).trim() === 'v = √(5gR/7)');
  ok('option B is marked in the question, and only B', await E(() => document.querySelector('#opts li[data-o="B"]').classList.contains('correct') && document.querySelectorAll('#opts li.correct').length === 1));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(B)');
  ok('the engine: cos = 5/7 at 44.4°, v^2 = 5gR/7', await E(() => Math.abs(PX.QRUN.cos - 5 / 7) < 1e-12 && Math.abs(PX.QRUN.v2 - 5 / 7) < 1e-12 && Math.abs(PX.QRUN.thetaDeg - 44.415) < 1e-3));
  ok('ready state: the question value, v0 = √(gR/3), no warning', await E(() => PX.state().question && Math.abs(PX.state().u - 1 / 3) < 1e-15 && document.getElementById('warn').hidden)
     && (await p.textContent('#v0out')) === '√(gR/3)' && /Ready/.test(await p.textContent('#narr')));
  ok('the canvas reports its smallest label, >= 13 px on the desktop', await E(() => PX.minLabelPx()) >= 13, await E(() => PX.minLabelPx()));

  /* ------------------------------------------------ one START runs the whole experiment */
  await p.click('#gobtn');
  ok('START runs it and the button becomes PAUSE', await E(() => PX.state().state) === 'running' && /PAUSE/.test(await p.textContent('#gobtn')));
  const narrs = new Set();
  const samples = [];
  await E(() => PX.setSpeed(0.5));
  for (let i = 0; i < 1500; i++){
    const s = await E(() => Object.assign(PX.state(), { narr: document.getElementById('narr').textContent, blink: document.getElementById('keyline').classList.contains('blink') }));
    samples.push(s); narrs.add(s.narr.slice(0, 18));
    if (s.done) break;
    await sleep(20);
  }
  const order = []; samples.forEach(s => { if (order[order.length - 1] !== s.phase) order.push(s.phase); });
  ok('with no further clicks it runs roll -> pivot -> release -> flight -> done', order.join(',') === 'roll,pivot,release,flight,done', order.join(','));
  const roll = samples.filter(s => s.phase === 'roll'), piv = samples.filter(s => s.phase === 'pivot');
  ok('rolling: v = v0 and N = mg on the flat top', roll.length > 3 && roll.every(s => Math.abs(s.v2 - 1 / 3) < 1e-12 && s.N === 1));
  ok('turning about the corner: the centre stays on a circle of radius R', piv.length > 5 && piv.every(s => Math.abs(Math.hypot(s.x, s.y) - 1) < 1e-9), piv.length + ' samples');
  ok('...energy is conserved: 3/4 v^2 = 3/4 v0^2 + gR(1 - cos)', piv.every(s => Math.abs(0.75 * s.v2 - 0.25 - (1 - Math.cos(s.th))) < 1e-9));
  ok('...the corner\'s push N = cos - v^2/gR, falling as the angle grows', piv.every(s => Math.abs(s.N - (Math.cos(s.th) - s.v2)) < 1e-9)
     && piv.every((s, i) => i === 0 || s.N <= piv[i - 1].N + 1e-12) && piv[0].N > 0.6);
  const m = samples[samples.length - 1].measured;
  ok('released where N reaches 0: v^2/gR = 0.714286 (5/7), measured by the run', m && Math.abs(m.v2 - C57) < 1e-9, m && m.v2.toFixed(9));
  ok('...at cos = 5/7, θ = 44.4°', m && Math.abs(m.cos - C57) < 1e-9 && Math.abs(m.thetaDeg - 44.415) < 1e-3);
  ok('...and the measured value picks option B', m && m.option === 'B');
  const fl = samples.filter(s => s.phase === 'flight');
  ok('free flight: the speed only grows and the cylinder falls away from the corner', fl.length > 3 && fl.every((s, i) => i === 0 || s.v2 >= fl[i - 1].v2 - 1e-12) && fl.every(s => Math.hypot(s.x, s.y) >= 1 - 1e-9));
  ok('the narration steps through every stage', ['Rolling without sl', 'At the edge the co', 'N = 0: contact los', 'Free flight: the c', 'Measured at the mo'].every(t => [...narrs].some(x => x.indexOf(t) === 0)), [...narrs].join(' | '));
  ok('the run confirms the answer line', /Confirmed by the run: N = 0 at cos θ = 5\/7, v² = 0\.7143 gR/.test(await p.textContent('#anssub')) && await E(() => PX.state().confirmed));
  ok('the answer blinks as it is confirmed', samples.some(s => s.blink));
  await sleep(2200);
  ok('...and stops blinking', await E(() => !document.getElementById('keyline').classList.contains('blink')));
  ok('the final narration names option (B)', /option \(B\)/.test(await p.textContent('#narr')));
  ok('the button offers RUN AGAIN', /RUN AGAIN/.test(await p.textContent('#gobtn')));
  ok('the chart draws both curves and the crossing at 44.4°', await E(() => document.querySelectorAll('#chart path').length >= 3 && /44\.4°, v²\/gR = 0\.714/.test(document.getElementById('chart').textContent)));

  /* ------------------------------------------------ pause, replay, reset */
  await p.click('#replaybtn'); await sleep(250);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.state().state === 'running' && PX.state().measured === null && ['roll', 'pivot'].indexOf(PX.state().phase) >= 0));
  await p.click('#gobtn'); const t0 = await E(() => JSON.stringify([PX.state().x, PX.state().phase])); await sleep(500);
  ok('PAUSE freezes the cylinder', await E(() => JSON.stringify([PX.state().x, PX.state().phase])) === t0 && /RESUME/.test(await p.textContent('#gobtn')) && /^Paused/.test(await p.textContent('#narr')));
  await p.click('#gobtn'); await sleep(200);
  ok('RESUME carries on', await E(() => PX.state().state) === 'running');
  await p.click('#resetbtn'); await sleep(150);
  ok('RESET returns to the ready state', await E(() => PX.state().state === 'setup' && PX.state().phase === 'ready') && /Ready/.test(await p.textContent('#narr')));

  /* ------------------------------------------------ the experiment's controls */
  await p.click('#sp4'); ok('speed ¼× is a segmented button', await E(() => PX.RUN.speed) === 0.25 && await E(() => document.getElementById('sp4').getAttribute('aria-pressed')) === 'true');
  await p.click('#sp1'); ok('speed 1× restores', await E(() => PX.RUN.speed) === 1);
  await p.click('#foff'); ok('forces OFF hides the arrows', await E(() => PX.RUN.forces) === false && await E(() => document.getElementById('foff').getAttribute('aria-pressed')) === 'true');
  await p.click('#fon'); ok('forces ON shows them', await E(() => PX.RUN.forces) === true);

  await p.$eval('#in_v0', el => { el.value = '0.4'; el.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(100);
  ok('a custom v0 is labelled and warned: not the question', await E(() => !PX.state().question && !document.getElementById('warn').hidden) && /0\.400 √\(gR\)/.test(await p.textContent('#v0out'))
     && /not the question's set-up/.test(await p.textContent('#warn')) && /0\.640/.test(await p.textContent('#warn')));
  let cs = await runToEnd(p, 4);
  let cm = cs[cs.length - 1].measured;
  ok('v0 = 0.4 √(gR): released at cos = (3(0.16) + 4)/7 = 0.640', cm && Math.abs(cm.cos - (3 * 0.16 + 4) / 7) < 1e-9 && cm.option === null, cm && cm.cos);
  ok('...reported as your v0, not the question, and the answer line still answers the question', /not the question's/.test(await p.textContent('#narr')) && (await p.textContent('#ansval')).trim() === '(B)');
  ok('...the chart follows the slider', /0\.640/.test(await E(() => document.getElementById('chart').textContent)));
  await p.$eval('#in_v0', el => { el.value = '1.1'; el.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(100);
  ok('v0^2 >= gR is warned: it leaves at the edge', /cannot hold the cylinder at all/.test(await p.textContent('#warn')));
  cs = await runToEnd(p, 4); cm = cs[cs.length - 1].measured;
  ok('...and does: released at θ = 0 with v = v0', cm && cm.thetaDeg === 0 && Math.abs(cm.v2 - 1.21) < 1e-9 && !cs.some(s => s.phase === 'pivot'));
  await p.$eval('#in_v0', el => { el.value = '0.05'; el.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(100);
  ok('out-of-range input is clamped to the slider bounds (0.2 √(gR))', await E(() => Math.abs(PX.state().u - 0.04) < 1e-12));
  await p.click('#qbtn'); await sleep(100);
  ok('QUESTION VALUE restores v0 = √(gR/3) exactly', await E(() => PX.state().question && PX.state().u === 1 / 3 && document.getElementById('warn').hidden) && (await p.textContent('#v0out')) === '√(gR/3)');

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
    ok('portrait scene at ' + w + ' px: the canvas re-lays itself out (720 x 820), labels >= 11 px on screen',
       await mp.evaluate(() => { const c = document.getElementById('labcv'); return c.width === 720 && c.height === 820 && PX.minLabelPx() * c.getBoundingClientRect().width / c.width >= 11; }));
    const ms = await runToEnd(mp, 4);
    const mm = ms[ms.length - 1].measured;
    const ov1 = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const taps = await mp.evaluate(() => [...document.querySelectorAll('#controls button, #controls input')].map(e => e.getBoundingClientRect().height));
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('44 px touch targets at ' + w + ' px', Math.min.apply(null, taps) >= 44, Math.round(Math.min.apply(null, taps)));
    ok('the run measures 5/7 at ' + w + ' px too', mm && Math.abs(mm.v2 - C57) < 1e-9);
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await mc.close();
  }

  /* ------------------------------------------------ reduced motion */
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.click('#gobtn'); await sleep(150);
  const rs = await rp.evaluate(() => PX.state());
  ok('reduced motion: one press shows the result at once - the release moment, measured, no blinking',
     rs.done && rs.measured && Math.abs(rs.measured.v2 - C57) < 1e-9 && rs.confirmed
     && await rp.evaluate(() => { const k = document.getElementById('keyline'); k.classList.add('blink'); const a = getComputedStyle(k).animationName; k.classList.remove('blink'); return a === 'none'; }) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Physics, Q.3',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Physics' && e.questionNumber === 3);
  ok('status script_verified - automated pipeline, no human review', e && e.status === 'script_verified');
  ok('chapter System of Particles and Rotational Motion', e && e.chapter === 'System of Particles and Rotational Motion');
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
  const T = __dirname + '/apptest-p1phyq03';
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
    await a.fill('#q', 'cylinder'); await sleep(700);
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
