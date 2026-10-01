/* ADV-2026-P1-PHY-Q14 - the sky optics lab: four optical effects matched to their phenomena by measurement
   (the aurora's line spectrum, the polarization of skylight, red and violet light in a raindrop, fringes behind a
   slit), option A.

   Layout v3 (G5) with the target display (from 2026-10-01). Drives the finished page headlessly: the file
   itself, the question, both lists and the options (none marked before the run), the target area and every
   target check (tests/target_gate.js), one START visiting P, Q, R, S with each station's measurement, the match
   and the option, the station buttons and the probe slider, pause / replay / reset, classroom mode, the
   measured visual gates A-K, phone widths, reduced motion, the library and feed entries, and the real app
   shell discovering and opening it.

   Run:  node tests/sim_p1phyq14.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { targetChecks } = require('./target_gate');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-PHY-Q14';
const REL = 'simulations/2026/paper-1/physics/adv-2026-p1-phy-q14/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

async function runToEnd(p, speed){
  const samples = [];
  await p.evaluate(s => { PX.speed(s); PX.start(); }, speed);
  for (let i = 0; i < 3000; i++){
    const s = await p.evaluate(() => Object.assign(PX.state(), { narr: document.getElementById('narr').textContent, pulse: document.getElementById('target').classList.contains('pulse'), tgt: document.getElementById('target').innerText.replace(/\s+/g, ' ').trim() }));
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
  ok('the answer is not written into the script: the option is the one whose map matches the measured phenomena',
     /var ANS = QRUN\.answer/.test(src) && /function phenomenon/.test(js) && /function measure/.test(js) && /answer: hits\.length === 1 \? hits\[0\] : null/.test(js)
     && !/ANS\s*=\s*["']|["']\(A\)["']|P→5, Q→4/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('layout v3 contract: question, lab (canvas + controls), solution, how to use - in that order',
     ['<section id="question"', '<section id="lab"', '<canvas id="labcv"', '<div id="controls"', '<section id="solution"', '<section id="howto"']
       .map(t => src.indexOf(t)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])));
  ok('no dashboards on the page: no rail, gauges, badges, log, evidence table or audit cards',
     !/class="(rail|gz|badge|badges|calc)"|id="(calclist|log|logbox)"/.test(src));
  ok('no dropdowns anywhere', !/<select/.test(src));
  ok('the target area is in the experiment: #target (match) with a symbol and an empty value',
     /<section id="lab"[\s\S]*<p class="keyres" id="target" data-kind="match"[^>]*><span class="lbl">Target:<\/span><span class="sym">[^<]+<\/span><span class="val" id="ansval"><\/span><\/p>/.test(src));
  ok('the solution holds the concept, the takeaways, each mechanism and the partial (not total) reflection',
     /Understand the concept/.test(src) && /Key takeaways/.test(src) && /557\.7 nm/.test(src) && /sin²<i>θ<\/i>\/\(1 \+ cos²<i>θ<\/i>\)/.test(src) && /critical angle of 48\.7°/.test(src) && /<i>a<\/i> sin <i>θ<\/i> = <i>mλ<\/i>/.test(src));

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
  const qt = (await p.innerText('#question .qtext')).replace(/\s+/g, ' ').trim();
  ok('the question is reproduced verbatim', qt === 'Q.14 In the List-I, four optical effects are mentioned. The physical phenomena of light which are essential to describe these optical effects are given in List-II. Choose the option which describes the correct match between the entries in List-I to those in List-II.', qt.slice(0, 120));
  const ql = (await p.innerText('#question')).replace(/\s+/g, ' ');
  ok('List-I and List-II verbatim', ['(P) Colorful sky in north polar region (Aurora Borealis)', '(Q) Partially polarized sun light', '(R) Rainbow', '(S) Dark and bright fringes',
     '(1) Dispersion and reflection', '(2) Total internal reflection', '(3) Diffraction', '(4) Scattering of light by molecules in the atmosphere',
     '(5) Emission of radiation from oxygen and nitrogen atoms excited by charged particles'].every(t => ql.indexOf(t) >= 0));
  const opts = await E(() => [...document.querySelectorAll('#opts li')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('the four options verbatim', opts.length === 4 && ['P→5, Q→4, R→1, S→3', 'P→4, Q→2, R→1, S→3', 'P→4, Q→1, R→2, S→3', 'P→5, Q→4, R→1, S→2'].every((t, i) => opts[i].indexOf(t) >= 0), opts.join(' | '));
  ok('no option is marked before the experiment', await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  ok('the target shows only its symbol at load', (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === 'TARGET: the match P, Q, R, S → List-II');
  ok('PX.answer() gives the registry answer', await E(() => PX.answer()) === 'A');
  ok('the engine: lines 557.7 / 630.0 / 427.8 nm, P(90) = 1, bow 42.4 / 40.6 deg, back 40.4 < critical 48.7 deg',
     await E(() => { const m = PX.QRUN.m; return Math.abs(m.lines[0] - 557.7) < 0.1 && Math.abs(m.lines[1] - 630.0) < 0.1 && Math.abs(m.lines[2] - 427.8) < 0.1 && m.pol90 === 1
       && Math.abs(m.bowRed - 42.37) < 0.02 && Math.abs(m.bowViolet - 40.65) < 0.02 && m.backRed < m.critRed && Math.abs(m.critRed - 48.70) < 0.02 && m.slitDark; }));
  ok('the rule table: lines -> 5, scattering polarization -> 4, dispersion + partial reflection -> 1 (total would be 2), one-colour fringes -> 3',
     await E(() => { const f = PX.ENGINE.phenomenon; return f({ lineSpectrum: true }) === 5 && f({ scatterPol: true }) === 4 && f({ dispersion: true, reflection: true, total: false }) === 1
       && f({ dispersion: true, reflection: true, total: true }) === 2 && f({ fringesOneColour: true }) === 3 && f({}) === null; }));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(A)');
  ok('ready state: station P, nothing measured', await E(() => PX.state().cfg === 'P' && PX.state().phase === 'ready' && Object.keys(PX.state().found).length === 0) && /Ready/.test(await p.textContent('#narr')));
  ok('the canvas reports its smallest label, >= 13 px on the desktop', await E(() => PX.minLabelPx()) >= 13, await E(() => PX.minLabelPx()));

  /* ------------------------------------------------ one START runs the whole experiment */
  await p.click('#gobtn');
  ok('START runs it and the button becomes PAUSE', await E(() => PX.state().state) === 'running' && /PAUSE/.test(await p.textContent('#gobtn')));
  await p.click('#gobtn');
  const samples = await runToEnd(p, 3);
  const order = []; samples.forEach(s => { const k = s.phase + (s.phase === 'done' ? '' : ':' + s.cfg); if (order[order.length - 1] !== k) order.push(k); });
  ok('with no further clicks it measures P, Q, R, S in turn, then matches', order.slice(order.indexOf('sweep:P')).join(',') === 'sweep:P,hold:P,sweep:Q,hold:Q,sweep:R,hold:R,sweep:S,hold:S,done', order.join(','));
  ok('the target shows only its symbol all through the run', samples.filter(s => !s.done).every(s => s.tgt === 'TARGET: the match P, Q, R, S → List-II') && samples.filter(s => !s.done).length > 20);
  ok('every sweep moves its probe forward (spectrometer, viewing angle, incidence)', ['P', 'Q', 'R'].every(c => { const w = samples.filter(s => s.phase === 'sweep' && s.cfg === c); return w.length > 5 && w.every((s, i) => i === 0 || s.x >= w[i - 1].x - 1e-9); }));
  const fd = last => last.found;
  const end = samples[samples.length - 1];
  ok('each station is matched to its phenomenon: P 5, Q 4, R 1, S 3', ['P', 'Q', 'R', 'S'].every((c, i) => fd(end)[c] && fd(end)[c].k === [5, 4, 1, 3][i]), JSON.stringify(Object.keys(fd(end)).map(c => c + fd(end)[c].k)));
  const narrs = [...new Set(samples.map(s => s.narr))];
  ok('the narration reports each measurement', ['P: 3 narrow lines, at 427.8, 557.7, 630.0 nm', 'Q: at 90° from the Sun', 'R: the deviation is least at 137.6° (red) and 139.4° (violet)', 'S: with light of one colour'].every(t => narrs.some(x => x.indexOf(t) === 0)), narrs.map(x => x.slice(0, 26)).join(' | '));
  ok('measured: map P5 Q4 R1 S3; option A', end.measured && end.measured.map.P === 5 && end.measured.map.Q === 4 && end.measured.map.R === 1 && end.measured.map.S === 3 && end.measured.option === 'A');
  ok('the run reveals the match in the target and marks option (A) only', end.confirmed && (await p.innerText('#ansval')) === 'P→5, Q→4, R→1, S→3 → (A)'
     && await E(() => [...document.querySelectorAll('#opts li.correct')].map(e => e.getAttribute('data-o')).join()) === 'A');
  ok('the target pulses as it is revealed', samples.some(s => s.pulse) || await E(() => document.getElementById('target').classList.contains('pulse')));
  await sleep(2200);
  ok('...and stops pulsing, the value kept', await E(() => !document.getElementById('target').classList.contains('pulse')) && (await p.innerText('#ansval')).indexOf('(A)') > 0);
  ok('the button offers RUN AGAIN', /RUN AGAIN/.test(await p.textContent('#gobtn')));

  /* ------------------------------------------------ controls */
  await p.click('#cR'); await sleep(60);
  ok('after the run a station button explores it and keeps the discovered result', await E(() => PX.state().cfg === 'R' && PX.state().done && PX.state().phase === 'explore') && (await p.innerText('#ansval')).indexOf('(A)') > 0
     && (await p.textContent('#xlab')) === 'Angle of incidence i');
  await E(() => PX.setX(70));
  ok('station R at i = 70: the internal angle is still below the critical angle', /internal angle 44\.9°, critical 48\.7°/.test(await p.textContent('#narr')), await p.textContent('#narr'));
  await p.click('#cQ'); await p.$eval('#in_x', el => { el.value = '60'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('station Q, dragging the slider to 60 deg: 60 % polarized (sin^2/(1 + cos^2))', /is 60 % polarized/.test(await p.textContent('#narr')) && (await p.textContent('#xout')) === '60.0°');
  await p.click('#cP'); await E(() => PX.setX(630.0));
  ok('station P at 630.0 nm: on the red oxygen line', /brightness here is 0\.55/.test(await p.textContent('#narr')), await p.textContent('#narr'));
  await p.click('#cS'); await E(() => PX.setX(0.2));
  ok('station S with a = 0.2 mm: the first dark band moves in to 3.16 mm', /first dark band is 3\.16 mm/.test(await p.textContent('#narr')));
  await E(() => PX.setX(9)); ok('the slit width is clamped to 0.40 mm', await E(() => PX.state().x) === 0.4);
  await E(() => PX.setX('x')); ok('a non-number falls back to the station default', await E(() => PX.state().x) === 0.1);
  await E(() => PX.setCfg('Z')); ok('an unknown station falls back to P', await E(() => PX.state().cfg) === 'P');
  await E(() => PX.speed(1)); await p.click('#replaybtn'); await sleep(250);
  ok('REPLAY reruns from station P with the target back to its symbol', await E(() => PX.state().state === 'running' && PX.state().measured === null && PX.state().phase === 'sweep' && PX.state().cfg === 'P')
     && (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === 'TARGET: the match P, Q, R, S → List-II' && await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  await sleep(700); await p.click('#gobtn'); const t0 = await E(() => PX.state().x); await sleep(500);
  ok('PAUSE freezes the run', await E(() => PX.state().x) === t0 && /RESUME/.test(await p.textContent('#gobtn')) && /^Paused/.test(await p.textContent('#narr')));
  await p.click('#gobtn'); await sleep(200);
  ok('RESUME carries on', await E(() => PX.state().state) === 'running');
  await p.click('#resetbtn'); await sleep(150);
  ok('RESET returns to the ready state: station P, nothing measured, the target symbol only', await E(() => PX.state().state === 'setup' && PX.state().phase === 'ready' && PX.state().cfg === 'P' && Object.keys(PX.state().found).length === 0)
     && /Ready/.test(await p.textContent('#narr')) && (await p.innerText('#ansval')) === '');
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

  /* ------------------------------------------------ the target display, every check (tests/target_gate.js) */
  const man0 = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  for (const c of await targetChecks(b, URL, src, man0.simulations.find(x => x.id === ID) || null)) ok(c.name, c.ok, c.detail);

  /* ------------------------------------------------ layout v3 visual gates, measured */
  const gr = await gates(FILE);
  const gf = gr.filter(r => r.status === 'FAIL').map(r => r.gate);
  ok('visual gates A C D E F I J K all pass (B G H are the screenshots and the verifier)', gf.length === 0 && gr.filter(r => r.status === 'PASS').length === 8 && (gr.find(r => r.gate === 'K') || {}).status === 'PASS', gf.join('') || 'all pass');

  /* ------------------------------------------------ phones */
  for (const w of [390, 360]){
    const mc = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
    const mp = await mc.newPage(); const me = [];
    mp.on('pageerror', e => me.push(e.message)); mp.on('console', x => { if (x.type() === 'error') me.push(x.text()); });
    await mp.goto(URL); await sleep(500);
    const ov0 = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok('portrait scene at ' + w + ' px: the canvas re-lays itself out (720 x 1380), labels >= 11 px on screen',
       await mp.evaluate(() => { const c = document.getElementById('labcv'); return c.width === 720 && c.height === 1380 && PX.minLabelPx() * c.getBoundingClientRect().width / c.width >= 11; }));
    const ms2 = await runToEnd(mp, 6);
    const ov1 = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const taps = await mp.evaluate(() => [...document.querySelectorAll('#controls button, #controls input')].map(e => e.getBoundingClientRect().height));
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('44 px touch targets at ' + w + ' px', Math.min.apply(null, taps) >= 44, Math.round(Math.min.apply(null, taps)));
    ok('the run matches option (A) at ' + w + ' px too', ms2[ms2.length - 1].measured && ms2[ms2.length - 1].measured.option === 'A' && ms2[ms2.length - 1].confirmed);
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await mc.close();
  }

  /* ------------------------------------------------ reduced motion */
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.click('#gobtn'); await sleep(150);
  const rs = await rp.evaluate(() => PX.state());
  ok('reduced motion: one press shows all four measurements and the match at once, no blinking',
     rs.done && rs.measured && rs.measured.option === 'A' && rs.confirmed && rs.phase === 'done'
     && await rp.evaluate(() => { const k = document.getElementById('target'); k.classList.add('pulse'); const a = getComputedStyle(k).animationName; k.classList.remove('pulse'); return a === 'none'; }) && re.length === 0, JSON.stringify(rs) + ' ' + re.join('|'));
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Physics, Q.14',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Physics' && e.questionNumber === 14);
  ok('status script_verified - automated pipeline, no human review', e && e.status === 'script_verified');
  ok('chapter Wave Optics', e && e.chapter === 'Wave Optics');
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
  const T = __dirname + '/apptest-p1phyq14';
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
    await a.fill('#q', 'aurora'); await sleep(700);
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
