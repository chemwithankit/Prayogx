/* ADV-2026-P1-PHY-Q16 - the spin-up lab: four planar rod frames turned about an axis OCO' in their own plane by
   the same constant torque; I = tau / alpha matched to List-II, option A.

   Layout v3 (G5) with the target display. Drives the finished page headlessly: the file itself, the question,
   List-I figures, List-II and the options (none marked before the run), every target check (tests/target_gate.js),
   one START spinning P, Q, R, S with omega = alpha t at every instant, the measured I and its List-II entry, the
   match and the option, the frame buttons and the turn slider, pause / replay / reset, classroom mode, the
   measured visual gates A-K, phone widths, reduced motion, the library and feed entries, and the real app shell.

   Run:  node tests/sim_p1phyq16.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { targetChecks } = require('./target_gate');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-PHY-Q16';
const REL = 'simulations/2026/paper-1/physics/adv-2026-p1-phy-q16/';
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
  ok('the answer is not written into the script: the option is the one whose map matches the computed moments of inertia',
     /var ANS = QRUN\.answer/.test(src) && /function rodI/.test(js) && /function classify/.test(js) && /answer: hits\.length === 1 \? hits\[0\] : null/.test(js)
     && !/ANS\s*=\s*["']|["']\(A\)["']|P→5, Q→1/.test(js));
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
  ok('the solution derives (ml²/3) sin² θ and md², works each frame, and says why (3) is nobody\'s',
     /Understand the concept/.test(src) && /Key takeaways/.test(src) && /sin² <i>θ<\/i><\/b>/.test(src) && /<i>I<\/i> = <i>md<\/i>²/.test(src) && /no frame here has it/.test(src));
  ok('List-I is redrawn as four labelled figures and List-II lists its five values', (src.match(/aria-label="Figure [PQRS]:/g) || []).length === 4 && (src.match(/<ol class="l2">[\s\S]*?<\/ol>/) || [''])[0].split('<li>').length === 6);

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
  ok('the question is reproduced verbatim', qt === "Q.16 List-I shows four planar structures made of uniform solid rods each of mass m and length l. In the List-II the possible moment of inertia of these structures about an axis OCO′, which lies in the plane of the structures, are given. Choose the option that describes the correct match between the entries in List-I to those in List-II.", qt.slice(0, 120));
  const l2 = await E(() => [...document.querySelectorAll('ol.l2 li')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('List-II verbatim: 5/4, 1/6, 1/12, 2/3, 1/3 ml²', l2.join(' | ') === '(1) 5⁄4 ml² | (2) 1⁄6 ml² | (3) 1⁄12 ml² | (4) 2⁄3 ml² | (5) 1⁄3 ml²', l2.join(' | '));
  const opts = await E(() => [...document.querySelectorAll('#opts li')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('the four options verbatim', opts.length === 4 && ['P→5, Q→1, R→4, S→2', 'P→1, Q→3, R→4, S→2', 'P→5, Q→3, R→2, S→1', 'P→5, Q→4, R→2, S→1'].every((t, i) => opts[i].indexOf(t) >= 0), opts.join(' | '));
  ok('no option is marked before the experiment', await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  ok('the target shows only its symbol at load', (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === 'TARGET: the match P, Q, R, S → List-II');
  ok('PX.answer() gives the registry answer', await E(() => PX.answer()) === 'A');
  ok('the engine: every rod has length l, and the frames are those of the figures (angles 45, 60, 45, 30 to the axis)',
     await E(() => { const E = PX.ENGINE, F = E.FRAMES, ang = (c, r) => { const p = F[c].pts[r[0]], q = F[c].pts[r[1]]; return Math.round(Math.abs(Math.atan2(q[1] - p[1], q[0] - p[0])) * 180 / Math.PI); };
       return E.CFGS.every(c => F[c].rods.every(r => Math.abs(E.rodLen(c, r) - 1) < 1e-12))
         && ang('P', ['C', 'A']) === 135 && ang('P', ['C', 'B']) === 45 && ang('Q', ['C', 'A']) === 120 && ang('Q', ['A', 'B']) === 0
         && F.R.rods.every(r => [45, 135].indexOf(ang('R', r)) >= 0) && ang('S', ['C', 'A']) === 150 && ang('S', ['C', 'B']) === 150; }));
  ok('the engine: I = 1/3, 5/4, 2/3, 1/6 ml² (exact to 1e-12), each rod its integral of v² dm',
     await E(() => { const I = PX.ENGINE.inertia; return Math.abs(I('P') - 1 / 3) < 1e-12 && Math.abs(I('Q') - 5 / 4) < 1e-12 && Math.abs(I('R') - 2 / 3) < 1e-12 && Math.abs(I('S') - 1 / 6) < 1e-12
       && Math.abs(PX.ENGINE.rodI('Q', ['A', 'B']) - 3 / 4) < 1e-12 && Math.abs(PX.ENGINE.rodI('S', ['C', 'A']) - 1 / 12) < 1e-12; }));
  ok('the classifier: a value off every List-II entry matches none', await E(() => PX.ENGINE.classify(0.5).k === null && PX.ENGINE.classify(1 / 12).k === 3));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(A)');
  ok('ready state: frame P at rest, nothing measured', await E(() => PX.state().cfg === 'P' && PX.state().omega === 0 && PX.state().phase === 'ready' && Object.keys(PX.state().found).length === 0) && /Ready/.test(await p.textContent('#narr')));
  ok('the canvas reports its smallest label, >= 13 px on the desktop', await E(() => PX.minLabelPx()) >= 13, await E(() => PX.minLabelPx()));

  /* ------------------------------------------------ one START runs the whole experiment */
  await p.click('#gobtn');
  ok('START runs it and the button becomes PAUSE', await E(() => PX.state().state) === 'running' && /PAUSE/.test(await p.textContent('#gobtn')));
  await p.click('#gobtn');
  const samples = await runToEnd(p, 3);
  const order = []; samples.forEach(s => { const k = s.phase + (s.phase === 'done' ? '' : ':' + s.cfg); if (order[order.length - 1] !== k) order.push(k); });
  ok('with no further clicks it spins P, Q, R, S once each, then matches', order.slice(order.indexOf('spin:P')).join(',') === 'spin:P,hold:P,spin:Q,hold:Q,spin:R,hold:R,spin:S,hold:S,done', order.join(','));
  ok('the target shows only its symbol all through the run', samples.filter(s => !s.done).every(s => s.tgt === 'TARGET: the match P, Q, R, S → List-II') && samples.filter(s => !s.done).length > 20);
  ok('every spin-up only gains speed and time', ['P', 'Q', 'R', 'S'].every(c => { const w = samples.filter(s => s.phase === 'spin' && s.cfg === c); return w.length > 5 && w.every((s, i) => i === 0 || (s.omega >= w[i - 1].omega - 1e-12 && s.t >= w[i - 1].t - 1e-12)); }));
  ok('at every instant omega = (tau / I) t: the same torque on every frame', samples.filter(s => s.phase === 'spin').every(s => Math.abs(s.omega - 0.5 / s.I * s.t) < 1e-9));
  const end = samples[samples.length - 1];
  ok('each frame is measured as I = tau / alpha and matched: P 5, Q 1, R 4, S 2', ['P', 'Q', 'R', 'S'].every((c, i) => end.found[c] && end.found[c].k === [5, 1, 4, 2][i] && Math.abs(end.found[c].I - [1 / 3, 5 / 4, 2 / 3, 1 / 6][i]) < 1e-9));
  const narrs = [...new Set(samples.map(s => s.narr))];
  ok('the narration reports each frame', ['Frame P: α = 1.50 rad/s², so I = τ/α = 1/3 ml²', 'Frame Q: α = 0.40 rad/s², so I = τ/α = 5/4 ml²', 'Frame R: α = 0.75 rad/s², so I = τ/α = 2/3 ml²', 'Frame S: α = 3.00 rad/s², so I = τ/α = 1/6 ml²'].every(t => narrs.some(x => x.indexOf(t) === 0)), narrs.map(x => x.slice(0, 40)).join(' | '));
  ok('measured: map P5 Q1 R4 S2; option A', end.measured && end.measured.map.P === 5 && end.measured.map.Q === 1 && end.measured.map.R === 4 && end.measured.map.S === 2 && end.measured.option === 'A');
  ok('the run reveals the match in the target and marks option (A) only', end.confirmed && (await p.innerText('#ansval')) === 'P→5, Q→1, R→4, S→2 → (A)'
     && await E(() => [...document.querySelectorAll('#opts li.correct')].map(e => e.getAttribute('data-o')).join()) === 'A');
  ok('the target pulses as it is revealed', samples.some(s => s.pulse) || await E(() => document.getElementById('target').classList.contains('pulse')));
  await sleep(2200);
  ok('...and stops pulsing, the value kept', await E(() => !document.getElementById('target').classList.contains('pulse')) && (await p.innerText('#ansval')).indexOf('(A)') > 0);
  ok('the button offers RUN AGAIN', /RUN AGAIN/.test(await p.textContent('#gobtn')));

  /* ------------------------------------------------ controls */
  await p.click('#cQ'); await sleep(60);
  ok('after the run a frame button explores it and keeps the discovered result', await E(() => PX.state().cfg === 'Q' && PX.state().done && PX.state().phase === 'explore') && (await p.innerText('#ansval')).indexOf('(A)') > 0);
  ok('exploring Q names each rod\'s share: CA 1/4, CB 1/4, AB 3/4', /I = 5\/4 ml² \(CA 1\/4, CB 1\/4, AB 3\/4\)/.test(await p.textContent('#narr')), await p.textContent('#narr'));
  await p.$eval('#in_x', el => { el.value = '120'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('dragging the slider turns the frame to 120 deg and I does not change with the view', await E(() => PX.state().x === 120 && Math.abs(PX.state().I - 5 / 4) < 1e-12) && (await p.textContent('#xout')) === '120°');
  await E(() => PX.setX(999)); ok('the angle is clamped to 360 deg', await E(() => PX.state().x) === 360);
  await E(() => PX.setX('x')); ok('a non-number falls back to 0 deg', await E(() => PX.state().x) === 0);
  await E(() => PX.setCfg('Z')); ok('an unknown frame falls back to P', await E(() => PX.state().cfg) === 'P');
  await E(() => PX.speed(1)); await p.click('#replaybtn'); await sleep(250);
  ok('REPLAY reruns from frame P with the target back to its symbol', await E(() => PX.state().state === 'running' && PX.state().measured === null && PX.state().phase === 'spin' && PX.state().cfg === 'P')
     && (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === 'TARGET: the match P, Q, R, S → List-II' && await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  await sleep(700); await p.click('#gobtn'); const t0 = await E(() => PX.state().t); await sleep(500);
  ok('PAUSE freezes the run', await E(() => PX.state().t) === t0 && /RESUME/.test(await p.textContent('#gobtn')) && /^Paused/.test(await p.textContent('#narr')));
  await p.click('#gobtn'); await sleep(200);
  ok('RESUME carries on', await E(() => PX.state().state) === 'running');
  await p.click('#resetbtn'); await sleep(150);
  ok('RESET returns to the ready state: frame P at rest, nothing measured, the target symbol only', await E(() => PX.state().state === 'setup' && PX.state().phase === 'ready' && PX.state().cfg === 'P' && PX.state().omega === 0 && Object.keys(PX.state().found).length === 0)
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
  ok('reduced motion: one press shows all four moments of inertia and the match at once, no blinking',
     rs.done && rs.measured && rs.measured.option === 'A' && rs.confirmed && rs.phase === 'done'
     && await rp.evaluate(() => { const k = document.getElementById('target'); k.classList.add('pulse'); const a = getComputedStyle(k).animationName; k.classList.remove('pulse'); return a === 'none'; }) && re.length === 0, JSON.stringify(rs) + ' ' + re.join('|'));
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Physics, Q.16',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Physics' && e.questionNumber === 16);
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
  const T = __dirname + '/apptest-p1phyq16';
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
    await a.fill('#q', 'spin-up lab'); await sleep(700);
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
