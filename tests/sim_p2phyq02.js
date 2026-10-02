/* ADV-2026-P2-PHY-Q02 - the reactor heat lab: a reactor makes nuclei of X at a constant rate alpha, they decay at
   random in a holding tank, every decay heats a liquid; the thermometer's rate of rise is measured against time and
   the four options are fitted to the measured points; dT/dt = (alpha E0/ms)(1 - e^-lambda t), option A; then the
   reactor-off what-if and the sliders.

   Layout v3 (G5) with the target display. Drives the finished page headlessly: the file itself, the question and
   options (none marked before the run), every target check (tests/target_gate.js), one START through start, build,
   steady and the fit with the reasoning lines appearing in order, the measured points against (A), conservation of
   nuclei, the reveal, the reactor-off what-if, the sliders (a fresh run of the lab on new values), pause / replay /
   reset, classroom mode, the measured visual gates A-K, phone widths, reduced motion, the library and feed entries,
   and the real app shell.

   Run:  node tests/sim_p2phyq02.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { targetChecks } = require('./target_gate');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P2-PHY-Q02';
const REL = 'simulations/2026/paper-2/physics/adv-2026-p2-phy-q02/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const SYM = 'TARGET: rate of temperature rise dT/dt';
const SAT = 2e12 * 8e-13 / (0.2 * 4200);                         /* alpha E0/(m s) at the default values, K/s */
const LAM = Math.LN2 / 2;
const fA = t => SAT * (1 - Math.exp(-LAM * t));

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

async function runToEnd(p, speed){
  const samples = [];
  await p.evaluate(s => { PX.speed(s); PX.start(); }, speed);
  for (let i = 0; i < 4000; i++){
    const s = await p.evaluate(() => Object.assign(PX.state(), { narr: document.getElementById('narr').textContent, pulse: document.getElementById('target').classList.contains('pulse'), tgt: document.getElementById('target').innerText.replace(/\s+/g, ' ').trim(), mt: PX.RUN.mt }));
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
  ok('the answer is not written into the script: the option is the one that fits the measured points',
     /var ANS = QRUN\.answer/.test(src) && /function match/.test(js) && /answer: m\.option/.test(js) && !/ANS\s*=\s*["']|["']\(A\)["']/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('layout v3 contract: question, lab (canvas + controls), solution, how to use - in that order',
     ['<section id="question"', '<section id="lab"', '<canvas id="labcv"', '<div id="controls"', '<section id="solution"', '<section id="howto"']
       .map(t => src.indexOf(t)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])));
  ok('no dashboards on the page: no rail, gauges, badges, log, evidence table or audit cards', !/class="(rail|gz|badge|badges|calc)"|id="(calclist|log|logbox)"/.test(src));
  ok('no dropdowns anywhere', !/<select/.test(src));
  ok('the target area is in the experiment: #target (option) with a symbol and an empty value',
     /<section id="lab"[\s\S]*<p class="keyres" id="target" data-kind="option"[^>]*><span class="lbl">Target:<\/span><span class="sym">[\s\S]+?<\/span><span class="val" id="ansval"><\/span><\/p>/.test(src));
  ok('the solution solves the rate equation, checks both limits and explains every option and decay heat',
     /Understand the concept/.test(src) && /Key takeaways/.test(src) && /Check the limits/.test(src) && /The other options/.test(src) && /decay heat/.test(src));
  ok('the representative values are stated on the page: the question has no numbers, the dots are a sample',
     /representative values/.test(src) && /random sample/.test(src) && /Time runs\s+at its real rate/.test(src));

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
  ok('the question is reproduced verbatim', qt === 'Q.2 A nuclear reactor starts producing a radioactive nuclide X from t = 0, at a constant rate of α per second. Each decay of X produces energy E0, which is utilized to heat a liquid of mass m and specific heat s. Assuming no heat loss from the liquid and taking λ as the decay constant of X, the rate of increase in the temperature of the liquid is:', qt.slice(0, 140));
  const opts = await E(() => [...document.querySelectorAll('#opts li')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('the four options verbatim', opts.join(' | ') === '(A)αE0m s(1 − e−λt) | (B)αE0m s(eλt − 1) | (C)λE0m s(1 − e−λt) | (D)E0m s(α − λe−λt)', opts.join(' | '));
  ok('no option is marked before the experiment', await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  ok('the target shows only its symbol at load', (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === SYM);
  ok('PX.answer() gives the registry answer', await E(() => PX.answer()) === 'A');
  ok('the engine: 40 thermometer readings; (A) fits within 0.1 %, the others miss by more than 30 %',
     await E(() => { const r = PX.ENGINE.run(), e = r.match.err; return r.lab.pts.length === 40 && e.A < 1e-3 && e.B > 0.3 && e.C > 0.3 && e.D > 0.3; }));
  ok('the engine responds to every input: doubling alpha doubles the readings; doubling m halves them; a longer half-life slows the rise',
     await E(() => { const R = o => PX.ENGINE.run(o).lab.pts, a = R(), b2 = R({ alpha: 4e12 }), c = R({ m: 0.4 }), d = PX.ENGINE.simulate({ thalf: 4 }, 10).pts;
       return Math.abs(b2[10][1] / a[10][1] - 2) < 1e-9 && Math.abs(c[10][1] / a[10][1] - 0.5) < 1e-9 && d[10][1] < a[10][1]; }));
  ok('the fit rejects a wrong law: readings that grow without limit are matched to no option', await E(() => {
    const p0 = PX.ENGINE.params(), pts = []; for (let i = 0; i < 40; i++){ const t = 0.125 + 0.25 * i; pts.push([t, 1e-3 * t * t, true]); } return PX.ENGINE.match(pts, p0).option === null; }));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(A)');
  ok('ready state: no nuclei yet, nothing measured, no what-if yet', await E(() => PX.state().phase === 'ready' && PX.state().pts === 0 && PX.state().N === 0 && document.getElementById('wigroup').hidden) && /Ready/.test(await p.textContent('#narr')));
  ok('the canvas reports its smallest label, >= 13 px on the desktop', await E(() => PX.minLabelPx()) >= 13, await E(() => PX.minLabelPx()));

  /* ------------------------------------------------ one START runs the whole experiment */
  await p.click('#gobtn');
  ok('START runs it and the button becomes PAUSE', await E(() => PX.state().state) === 'running' && /PAUSE/.test(await p.textContent('#gobtn')));
  await p.click('#gobtn');
  const samples = await runToEnd(p, 3);
  const order = []; samples.forEach(s => { if (order[order.length - 1] !== s.phase) order.push(s.phase); });
  ok('with no further clicks it runs start, build, steady, the fit, then the result', order.slice(order.indexOf('start')).join(',') === 'start,build,steady,match,done', order.join(','));
  ok('the target shows only its symbol all through the run', samples.filter(s => !s.done).every(s => s.tgt === SYM) && samples.filter(s => !s.done).length > 20);
  ok('the reasoning appears in order: none at the start, the rate equation while building, the steady state, then the heat', samples.filter(s => s.phase === 'start').every(s => s.lines === 0)
     && samples.filter(s => s.phase === 'build').every(s => s.lines === 1) && samples.filter(s => s.phase === 'steady').every(s => s.lines === 2) && samples.filter(s => s.phase === 'match').every(s => s.lines === 3));
  const firstRate = samples.find(s => s.rate !== null);
  ok('the heating starts at zero: the first thermometer reading is under 10 % of the final level', firstRate && firstRate.rate < 0.1 * SAT, firstRate && firstRate.rate);
  ok('nuclei are conserved: made = alpha t, and decayed = made - present stays >= 0', samples.filter(s => s.t > 0).every(s => Math.abs(s.made - 2e12 * s.t) / (2e12 * s.t) < 1e-9 && s.made >= s.N));
  ok('the thermometer only rises while the reactor runs', samples.every((s, i) => i === 0 || s.T >= samples[i - 1].T - 1e-15));
  const pts = await E(() => PX.points());
  ok('every measured point lies on (A) within 0.1 % of the level', pts.length === 40 && pts.every(q => Math.abs(q[1] - fA(q[0])) < 1e-3 * SAT), pts.length);
  const end = samples[samples.length - 1];
  ok('measured: the fit picks (A), misfit < 0.1 %', end.measured && end.measured.option === 'A' && end.measured.err.A < 1e-3);
  ok('the run reveals the law and the option in the target and marks option (A) only', end.confirmed && (await p.innerText('#ansval')) === 'dT/dt = (αE₀/ms)(1 − e^(−λt)) → (A)'
     && await E(() => [...document.querySelectorAll('#opts li.correct')].map(e => e.getAttribute('data-o')).join()) === 'A');
  ok('the narration gives the misfit, the steady level and how far the others miss', /misfit of 0\.01 %/.test(await p.textContent('#narr')) && /1\.90 mK\/s/.test(await p.textContent('#narr')) && /39 % or more/.test(await p.textContent('#narr')), await p.textContent('#narr'));
  ok('the fit was narrated option by option', ['(A)', '(B)', '(C)', '(D)'].every(k => samples.some(s => s.phase === 'match' && s.narr.indexOf(k) >= 0)));
  ok('the target pulses as it is revealed', samples.some(s => s.pulse) || await E(() => document.getElementById('target').classList.contains('pulse')));
  await sleep(2200);
  ok('...and stops pulsing, the value kept', await E(() => !document.getElementById('target').classList.contains('pulse')) && (await p.innerText('#ansval')).indexOf('(A)') > 0);
  ok('after the run the What if… appears and the button offers RUN AGAIN', await E(() => !document.getElementById('wigroup').hidden) && /RUN AGAIN/.test(await p.textContent('#gobtn')));

  /* ------------------------------------------------ what if: the reactor off */
  await E(() => PX.speed(4));
  await p.click('#wi_off'); await sleep(300);
  const o1 = await E(() => PX.state());
  ok('What if the reactor is switched off: production stops but the liquid keeps warming (decay heat)', o1.phase === 'off' && o1.off && !o1.on && o1.rate > 0 && /still decaying/.test(await p.textContent('#narr')));
  for (let i = 0; i < 300 && !(await E(() => PX.state().off.done)); i++) await sleep(50);
  const o2 = await E(() => PX.state()), opts2 = await E(() => PX.points().filter(q => !q[2]));
  ok('...over four half-lives the heating rate halves every half-life (falls to about 6 %)', o2.off.done && opts2.length === 32
     && opts2.every(q => Math.abs(q[1] - SAT * (1 - Math.exp(-LAM * 10)) * Math.exp(-LAM * (q[0] - 10))) < 5e-3 * SAT) && /6 %/.test(await p.textContent('#narr')), await p.textContent('#narr'));
  ok('...and the answer stays revealed', (await p.innerText('#ansval')).indexOf('(A)') > 0 && await E(() => document.getElementById('wi_off').disabled));

  /* ------------------------------------------------ the sliders run the lab again */
  await E(() => PX.speed(1));
  await p.$eval('#in_h', el => { el.value = '4'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('half-life 4 s: the lab runs again on the new value and (A) still fits', await E(() => PX.state().phase === 'explore' && PX.state().p.thalf === 4 && PX.state().view.best === 'A' && PX.state().view.option === 'A')
     && (await p.textContent('#out_h')) === '4.0 s' && /still fits/.test(await p.textContent('#narr')));
  await p.$eval('#in_a', el => { el.value = '3'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('alpha 3 × 10¹² s⁻¹: the steady level grows by 1.5', await E(() => Math.abs(PX.state().sat / (2e12 * 8e-13 / 840) - 1.5) < 1e-12 && PX.state().view.option === 'A') && (await p.textContent('#out_a')) === '3.0 × 10¹² s⁻¹');
  await p.$eval('#in_m', el => { el.value = '0.4'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('m = 0.4 kg: the level halves and (A) still fits', await E(() => Math.abs(PX.state().sat / (3e12 * 8e-13 / (0.4 * 4200)) - 1) < 1e-12 && PX.state().view.option === 'A') && (await p.textContent('#out_m')) === '0.40 kg');
  await E(() => PX.set('a', 99)); ok('alpha is clamped to 4 × 10¹² s⁻¹', await E(() => PX.state().p.a) === 4);
  await E(() => PX.set('m', 'x')); ok('a non-number falls back to the default (m = 0.2 kg)', await E(() => PX.state().p.m) === 0.2);

  /* ------------------------------------------------ pause, replay, reset */
  await p.click('#replaybtn'); await sleep(250);
  ok('REPLAY reruns on the slider values with the target back to its symbol', await E(() => PX.state().state === 'running' && PX.state().measured === null && PX.state().p.thalf === 4 && PX.state().p.a === 4)
     && (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === SYM && await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  await sleep(700); await p.click('#gobtn'); const t0 = await E(() => PX.state().t); await sleep(500);
  ok('PAUSE freezes the run', await E(() => PX.state().t) === t0 && /RESUME/.test(await p.textContent('#gobtn')) && /^Paused/.test(await p.textContent('#narr')));
  await p.click('#gobtn'); await sleep(200);
  ok('RESUME carries on', await E(() => PX.state().state) === 'running' && await E(() => PX.state().t) > t0);
  await p.click('#resetbtn'); await sleep(150);
  ok('RESET returns to the ready state on the default values: nothing measured, the target symbol only, What if hidden', await E(() => PX.state().state === 'setup' && PX.state().phase === 'ready' && PX.state().pts === 0
     && PX.state().p.a === 2 && PX.state().p.thalf === 2 && PX.state().p.m === 0.2 && document.getElementById('wigroup').hidden) && /Ready/.test(await p.textContent('#narr')) && (await p.innerText('#ansval')) === '');
  await p.$eval('#in_a', el => { el.value = '1.5'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('a slider moved before START sets up the next run', /1\.5 × 10¹² per second/.test(await p.textContent('#narr')) && await E(() => PX.state().state) === 'setup');
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
    ok('portrait scene at ' + w + ' px: the canvas re-lays itself out (720 x 1520), labels >= 11 px on screen',
       await mp.evaluate(() => { const c = document.getElementById('labcv'); return c.width === 720 && c.height === 1520 && PX.minLabelPx() * c.getBoundingClientRect().width / c.width >= 11; }));
    ok('the options stack in one column at ' + w + ' px', await mp.evaluate(() => getComputedStyle(document.getElementById('opts')).gridTemplateColumns.split(' ').length) === 1);
    const ms2 = await runToEnd(mp, 6);
    const ov1 = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const taps = await mp.evaluate(() => [...document.querySelectorAll('#controls button, #controls input')].map(e => e.getBoundingClientRect().height));
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('44 px touch targets at ' + w + ' px', Math.min.apply(null, taps) >= 44, Math.round(Math.min.apply(null, taps)));
    ok('the run fits option (A) at ' + w + ' px too', ms2[ms2.length - 1].measured && ms2[ms2.length - 1].measured.option === 'A' && ms2[ms2.length - 1].confirmed);
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await mc.close();
  }

  /* ------------------------------------------------ reduced motion */
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.click('#gobtn'); await sleep(150);
  const rs = await rp.evaluate(() => PX.state());
  ok('reduced motion: one press runs the lab to the end and shows the fit and the answer at once, no blinking',
     rs.done && rs.pts === 40 && rs.measured && rs.measured.option === 'A' && rs.confirmed && rs.phase === 'done'
     && await rp.evaluate(() => { const k = document.getElementById('target'); k.classList.add('pulse'); const a = getComputedStyle(k).animationName; k.classList.remove('pulse'); return a === 'none'; }) && re.length === 0, JSON.stringify(rs).slice(0, 200) + ' ' + re.join('|'));
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 2, Physics, Q.2',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 2' && e.paperNumber === 2 && e.subject === 'Physics' && e.questionNumber === 2);
  ok('status script_verified - automated pipeline, no human review', e && e.status === 'script_verified');
  ok('chapter Nuclei', e && e.chapter === 'Nuclei');
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
  const T = __dirname + '/apptest-p2phyq02';
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
    await a.fill('#q', 'reactor heat'); await sleep(700);
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
