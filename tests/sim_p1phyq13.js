/* ADV-2026-P1-PHY-Q13 - the two-path sound tube lab: the smallest l giving a maximum at D in four tube networks,
   matched to List-II, option (D).

   Layout v3 (G5). Drives the finished page headlessly: the file itself, the question, List-I figures, List-II and
   the options, the answer line and PX.answer(), one START sweeping l in P, Q, R, S with the amplitude at D dipping
   to silence at half a wavelength and reaching the maximum at one wavelength, the match and the option, the tube
   buttons and the length slider, pause / replay / reset, classroom mode, the measured visual gates, phone widths,
   reduced motion, the library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1phyq13.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-PHY-Q13';
const REL = 'simulations/2026/paper-1/physics/adv-2026-p1-phy-q13/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');

let n = 0, bad = 0;
const LM = { P: 0.29 / (Math.PI / 2 - 1), Q: 0.29, R: 0.29 / (Math.PI / Math.SQRT2), S: 0.29 * 0.97 / (0.5 + Math.SQRT1_2 - 0.97) };   /* first maxima, for comparison only */
const PX_DETOUR = { P: Math.PI / 2, Q: 2, R: 1 + Math.PI / Math.SQRT2, S: (0.5 + Math.SQRT1_2) / 0.97 };
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
  ok('the answer is not written into the script: the option is the one whose map matches the swept first maxima',
     /var ANS = QRUN\.answer/.test(src) && /function firstMax/.test(js) && /function amp/.test(js) && /answer: hits\.length === 1 \? hits\[0\] : null/.test(js)
     && !/ANS\s*=\s*["']|["']\(?D\)?["']\s*[:;)]|P→3, Q→4/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('layout v3 contract: question, lab (canvas + controls), solution, how to use - in that order',
     ['<section id="question"', '<section id="lab"', '<canvas id="labcv"', '<div id="controls"', '<section id="solution"', '<section id="howto"']
       .map(t => src.indexOf(t)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])));
  ok('no dashboards on the page: no rail, gauges, badges, log, evidence table or audit cards',
     !/class="(rail|gz|badge|badges|calc)"|id="(calclist|log|logbox)"/.test(src));
  ok('no dropdowns anywhere', !/<select/.test(src));
  ok('the solution holds the concept, the takeaways, each detour and the sine rule with cos 15 = 0.97',
     /Understand the concept/.test(src) && /Key takeaways/.test(src) && /π<i>l<\/i>\/2/.test(src) && /sine rule/.test(src) && /cos 15° = 0\.97/.test(src));

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
  const qt = (await p.innerText('#question .qtext')).replace(/\s+/g, ' ').trim();   /* innerText: the <br> before 'Choose' is a line break */
  ok('the question is reproduced verbatim', qt === 'Q.13 List-I shows four configurations made of straight and semi-circular narrow tubes containing air. A sound wave of wavelength λ = 0.29 m enters these structures at the point S and a sound detector is placed at D. Between the points S and D, the sound travels only through the tubes. List-II contains the possible smallest values of l (refer to the figures) for which the detector D records maximum amplitude. Ignore effects of sharp corners. [Given cos(15°) = 0.97] Choose the option that best describes the match between the entries in List-I to those in List-II.', qt.slice(0, 120));
  ok('List-I: four figures P, Q, R, S, each drawn and labelled', await E(() => { const f = [...document.querySelectorAll('#question svg[role=img]')]; return f.length >= 4 && f.every(e => (e.getAttribute('aria-label') || '').length > 10); }));
  const l2 = (await p.textContent('#question')).replace(/\s+/g, ' ');
  ok('List-II: 1.32, 1.19, 0.51, 0.29, 0.13 m', ['(1) 1.32 m', '(2) 1.19 m', '(3) 0.51 m', '(4) 0.29 m', '(5) 0.13 m'].every(t => l2.indexOf(t) >= 0));
  const opts = await E(() => [...document.querySelectorAll('#opts li')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('the four options verbatim', opts.length === 4 && ['P→4, Q→3, R→5, S→1', 'P→4, Q→3, R→1, S→5', 'P→3, Q→4, R→1, S→2', 'P→3, Q→4, R→5, S→2'].every((t, i) => opts[i].indexOf(t) >= 0), opts.join(' | '));
  ok('only option (D) is marked, by the engine', await E(() => [...document.querySelectorAll('#opts li.correct')].map(e => e.getAttribute('data-o')).join()) === 'D');
  ok('the answer is visible from load: (D) with the computed match', (await p.textContent('#ansval')).trim() === '(D)' && /P→3, Q→4, R→5, S→2/.test(await p.textContent('#ansexpr')));
  ok('PX.answer() gives the registry answer', await E(() => PX.answer()) === 'D');
  ok('the engine: first maxima 0.508, 0.290, 0.1305, 1.1864 m (to 1e-6)', await E(lm => ['P', 'Q', 'R', 'S'].every(c => Math.abs(PX.QRUN.l[c] - lm[c]) < 1e-6), LM));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(D)');
  ok('ready state: tube P at l = 0.3 m', await E(() => PX.state().cfg === 'P' && Math.abs(PX.state().l - 0.3) < 1e-12 && PX.state().phase === 'ready'));
  ok('the canvas reports its smallest label, >= 13 px on the desktop', await E(() => PX.minLabelPx()) >= 13, await E(() => PX.minLabelPx()));

  /* ------------------------------------------------ one START runs the whole experiment */
  await p.click('#gobtn');
  ok('START runs it and the button becomes PAUSE', await E(() => PX.state().state) === 'running' && /PAUSE/.test(await p.textContent('#gobtn')));
  await p.click('#gobtn');
  const samples = await runToEnd(p, 3);
  const order = []; samples.forEach(s => { const k = s.phase + (s.phase === 'done' ? '' : ':' + s.cfg); if (order[order.length - 1] !== k) order.push(k); });
  ok('with no further clicks it sweeps and holds P, Q, R, S, then matches', order.slice(order.indexOf('sweep:P')).join(',') === 'sweep:P,hold:P,sweep:Q,hold:Q,sweep:R,hold:R,sweep:S,hold:S,done', order.join(','));
  ok('every sweep only lengthens the tube', ['P', 'Q', 'R', 'S'].every(c => { const w = samples.filter(s => s.phase === 'sweep' && s.cfg === c); return w.length > 5 && w.every((s, i) => i === 0 || s.l >= w[i - 1].l - 1e-12); }));
  ok('in every sweep the detector falls silent (half a wavelength) before the maximum', ['P', 'Q', 'R', 'S'].every(c => Math.min.apply(null, samples.filter(s => s.phase === 'sweep' && s.cfg === c).map(s => s.amp)) < 0.5));
  ok('the path difference is (detour - 1) l at every instant', samples.every(s => Math.abs(s.delta - (PX_DETOUR[s.cfg] - 1) * s.l) < 1e-9));
  const holds = samples.filter(s => s.phase === 'hold');
  ok('at every hold the path difference is one wavelength and the amplitude is 2', holds.length > 3 && holds.every(s => Math.abs(s.delta - 0.29) < 1e-6 && s.amp > 1.99999));
  const narrs = [...new Set(samples.map(s => s.narr))];
  ok('the narration names each stage', ['Tube P: lengthening', 'Tube P: first maximum at l = 0.508 m', 'Tube S: first maximum at l = 1.186 m', 'Matched: P→3 (0.508 m), Q→4 (0.290 m), R→5 (0.131 m), S→2 (1.186 m): option (D).'].every(t => narrs.some(x => x.indexOf(t) === 0)), narrs.map(x => x.slice(0, 24)).join(' | '));
  const last = samples[samples.length - 1], m = last.measured;
  ok('measured: first maxima 0.508, 0.290, 0.131, 1.186 m; map P3 Q4 R5 S2; option (D)', m && ['P', 'Q', 'R', 'S'].every(c => Math.abs(m.l[c] - LM[c]) < 1e-6)
     && m.map.P === 3 && m.map.Q === 4 && m.map.R === 5 && m.map.S === 2 && m.option === 'D');
  ok('the run confirms the answer line', last.confirmed && (await p.textContent('#anssub')) === 'Confirmed by the run: first maxima at l = 0.508, 0.290, 0.131, 1.186 m match (3), (4), (5), (2).');
  ok('the answer blinks as it is confirmed', samples.some(s => s.blink) || await E(() => document.getElementById('keyline').classList.contains('blink')));
  await sleep(2200);
  ok('...and stops blinking', await E(() => !document.getElementById('keyline').classList.contains('blink')));
  ok('the button offers RUN AGAIN', /RUN AGAIN/.test(await p.textContent('#gobtn')));

  /* ------------------------------------------------ controls */
  await p.click('#cQ'); await sleep(60);
  ok('a tube button selects it and leaves the finished run', await E(() => PX.state().cfg === 'Q' && PX.state().state === 'setup' && !PX.state().done) && await E(() => document.getElementById('cQ').getAttribute('aria-pressed')) === 'true');
  await E(() => PX.setL(0.145));
  ok('tube Q at l = 0.145 m: half a wavelength of path difference, the detector is silent', await E(() => PX.state().amp) < 1e-9 && /Δ = 0\.145 m = 0\.50 λ/.test(await p.textContent('#narr')));
  await p.$eval('#in_l', el => { el.value = '0.29'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('dragging the length slider to 0.29 m gives the maximum', await E(() => Math.abs(PX.state().l - 0.29) < 1e-9 && PX.state().amp > 1.99999) && (await p.textContent('#lout')) === '0.290 m');
  await E(() => PX.setL(9)); ok('the length is clamped to 1.5 m', await E(() => PX.state().l) === 1.5);
  await E(() => PX.setL('x')); ok('a non-number falls back to 0.3 m', await E(() => PX.state().l) === 0.3);
  await E(() => PX.setCfg('Z')); ok('an unknown tube falls back to P', await E(() => PX.state().cfg) === 'P');
  await E(() => PX.speed(1)); await p.click('#replaybtn'); await sleep(250);
  ok('REPLAY reruns from tube P', await E(() => PX.state().state === 'running' && PX.state().measured === null && PX.state().phase === 'sweep' && PX.state().cfg === 'P'));
  await sleep(700); await p.click('#gobtn'); const t0 = await E(() => PX.state().l); await sleep(500);
  ok('PAUSE freezes the run', await E(() => PX.state().l) === t0 && /RESUME/.test(await p.textContent('#gobtn')) && /^Paused/.test(await p.textContent('#narr')));
  await p.click('#gobtn'); await sleep(200);
  ok('RESUME carries on', await E(() => PX.state().state) === 'running');
  await p.click('#resetbtn'); await sleep(150);
  ok('RESET returns to the ready state: tube P, l = 0.3 m, nothing found', await E(() => PX.state().state === 'setup' && PX.state().phase === 'ready' && PX.state().cfg === 'P' && PX.state().l === 0.3 && Object.keys(PX.state().found).length === 0) && /Press START/.test(await p.textContent('#narr')));
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
    ok('portrait scene at ' + w + ' px: the canvas re-lays itself out (720 x 1300), labels >= 11 px on screen',
       await mp.evaluate(() => { const c = document.getElementById('labcv'); return c.width === 720 && c.height === 1300 && PX.minLabelPx() * c.getBoundingClientRect().width / c.width >= 11; }));
    const ms2 = await runToEnd(mp, 6);
    const ov1 = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const taps = await mp.evaluate(() => [...document.querySelectorAll('#controls button, #controls input')].map(e => e.getBoundingClientRect().height));
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('44 px touch targets at ' + w + ' px', Math.min.apply(null, taps) >= 44, Math.round(Math.min.apply(null, taps)));
    ok('the run matches option (D) at ' + w + ' px too', ms2[ms2.length - 1].measured && ms2[ms2.length - 1].measured.option === 'D' && ms2[ms2.length - 1].confirmed);
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await mc.close();
  }

  /* ------------------------------------------------ reduced motion */
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.click('#gobtn'); await sleep(150);
  const rs = await rp.evaluate(() => PX.state());
  ok('reduced motion: one press shows all four first maxima and the match at once, no blinking',
     rs.done && rs.measured && rs.measured.option === 'D' && rs.confirmed && rs.phase === 'done'
     && await rp.evaluate(() => { const k = document.getElementById('keyline'); k.classList.add('blink'); const a = getComputedStyle(k).animationName; k.classList.remove('blink'); return a === 'none'; }) && re.length === 0, JSON.stringify(rs) + ' ' + re.join('|'));
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Physics, Q.13',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Physics' && e.questionNumber === 13);
  ok('status script_verified - automated pipeline, no human review', e && e.status === 'script_verified');
  ok('chapter Waves', e && e.chapter === 'Waves');
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
  const T = __dirname + '/apptest-p1phyq13';
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
    await a.fill('#q', 'sound tube'); await sleep(700);
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
