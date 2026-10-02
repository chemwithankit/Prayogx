/* ADV-2026-P2-PHY-Q03 - the prism spectrum lab: a thin prism whose index is n = alpha lambda + beta/lambda^2; white
   light spreads into its colours, the prism is rotated at one wavelength to find the minimum deviation, the
   wavelength is scanned and a search finds where the minimum deviation is smallest: lambda = 0.4 um, n = 1.8,
   Dm = 4.81 deg (thin prism 4.8 deg), option B; then the rotate-at-lambda-min what-if, the probe and the sliders.

   Layout v3 (G5) with the target display. Drives the finished page headlessly: the file itself, the question and
   options (none marked before the run), every target check (tests/target_gate.js), one START through beam,
   rotate, scan and the search with the reasoning in order, the measured D(i) dip, the scan against the exact
   formula, the reveal, the what-if, the probe wavelength, the sliders (a fresh measurement on new values), pause /
   replay / reset, classroom mode, the measured visual gates A-K, phone widths, reduced motion, the library and
   feed entries, and the real app shell.

   Run:  node tests/sim_p2phyq03.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { targetChecks } = require('./target_gate');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P2-PHY-Q03';
const REL = 'simulations/2026/paper-2/physics/adv-2026-p2-phy-q03/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const SYM = 'TARGET: smallest minimum deviation Dm';
const nOf = l => 3 * l + 0.096 / (l * l);
const dmExact = (n, A) => 2 * Math.asin(n * Math.sin(A * Math.PI / 360)) * 180 / Math.PI - A;
const DEX = dmExact(1.8, 6);

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

async function runToEnd(p, speed){
  const samples = [];
  await p.evaluate(s => { PX.speed(s); PX.start(); }, speed);
  for (let i = 0; i < 4000; i++){
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
  ok('the answer is not written into the script: the option is the one the measured smallest Dm matches',
     /var ANS = QRUN\.answer/.test(src) && /function minDev/.test(js) && /function search/.test(js) && /answer: pick\(s\.D\)/.test(js) && !/ANS\s*=\s*["']|["']\(B\)["']/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('layout v3 contract: question, lab (canvas + controls), solution, how to use - in that order',
     ['<section id="question"', '<section id="lab"', '<canvas id="labcv"', '<div id="controls"', '<section id="solution"', '<section id="howto"']
       .map(t => src.indexOf(t)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])));
  ok('no dashboards on the page: no rail, gauges, badges, log, evidence table or audit cards', !/class="(rail|gz|badge|badges|calc)"|id="(calclist|log|logbox)"/.test(src));
  ok('no dropdowns anywhere', !/<select/.test(src));
  ok('the target area is in the experiment: #target (option) with a symbol and an empty value',
     /<section id="lab"[\s\S]*<p class="keyres" id="target" data-kind="option"[^>]*><span class="lbl">Target:<\/span><span class="sym">[\s\S]+?<\/span><span class="val" id="ansval"><\/span><\/p>/.test(src));
  ok('the solution minimises n, checks with the exact prism formula and explains every option',
     /Understand the concept/.test(src) && /Key takeaways/.test(src) && /Check with the exact prism formula/.test(src) && /The other options/.test(src) && /0\.28 <i>μ<\/i>m and 0\.6/.test(src));
  ok('the exaggeration is stated on the page: angles drawn 4x, the scale reads real degrees, a hypothetical material',
     /four times larger than real/.test(src) && /drawn 4× real/.test(src) && /hypothetical material/.test(src));

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
  ok('the question is reproduced verbatim', qt === 'Q.3 A beam of polychromatic light passes through a thin prism of prism angle 6°. The refractive index of the material of the prism varies with wavelength (λ) as n(λ) = αλ + β λ2 , where α = 3 μm−1 and β = 0.096 μm2. If λmin is the wavelength at which the angle of minimum deviation Dm is smallest, then the correct value of Dm at λmin is', qt.slice(0, 140));
  const opts = await E(() => [...document.querySelectorAll('#opts li')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('the four options verbatim', opts.join(' | ') === '(A)6.4° | (B)4.8° | (C)3.2° | (D)2.4°', opts.join(' | '));
  ok('no option is marked before the experiment', await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  ok('the target shows only its symbol at load', (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === SYM);
  ok('PX.answer() gives the registry answer', await E(() => PX.answer()) === 'B');
  ok('the engine: lambda_min = 0.400 um, n = 1.800, Dm = 4.811 deg by ray tracing, thin prism 4.800 deg',
     await E(d => { const s = PX.ENGINE.search(); return Math.abs(s.lam - 0.4) < 1e-6 && Math.abs(s.n - 1.8) < 1e-9 && Math.abs(s.D - d) < 1e-6 && Math.abs(s.Dthin - 4.8) < 1e-9; }, DEX));
  ok('the engine: its minimum deviation equals the exact prism formula at every wavelength (0.25 - 1.0 um)',
     await E(() => PX.ENGINE.scan({}, 0.25, 1, 30).every(q => { const nn = 3 * q[0] + 0.096 / (q[0] * q[0]); return Math.abs(q[1] - (2 * Math.asin(nn * Math.sin(3 * Math.PI / 180)) * 180 / Math.PI - 6)) < 1e-6; })));
  ok('the engine responds to every input: alpha 4 moves lambda_min to (2 beta/alpha)^(1/3); a 3 deg prism halves Dm (thin)',
     await E(() => { const a = PX.ENGINE.search({ alpha: 4 }), t = PX.ENGINE.search({ A: 3 }); return Math.abs(a.lam - Math.cbrt(0.048)) < 1e-4 && Math.abs(t.Dthin - 2.4) < 1e-9; }));
  ok('the matcher: 6.4 is (A), 5.6 is nothing', await E(() => PX.ENGINE.pick(6.4) === 'A' && PX.ENGINE.pick(5.6) === null));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(B)');
  ok('ready state: nothing measured, no what-if yet', await E(() => PX.state().phase === 'ready' && PX.state().scan === 0 && PX.state().rot === 0 && document.getElementById('wigroup').hidden) && /Ready/.test(await p.textContent('#narr')));
  ok('the canvas reports its smallest label, >= 13 px on the desktop', await E(() => PX.minLabelPx()) >= 13, await E(() => PX.minLabelPx()));

  /* ------------------------------------------------ one START runs the whole experiment */
  await p.click('#gobtn');
  ok('START runs it and the button becomes PAUSE', await E(() => PX.state().state) === 'running' && /PAUSE/.test(await p.textContent('#gobtn')));
  await p.click('#gobtn');
  const samples = await runToEnd(p, 3);
  const order = []; samples.forEach(s => { if (order[order.length - 1] !== s.phase) order.push(s.phase); });
  ok('with no further clicks it runs beam, rotate, scan, the search, then the result', order.slice(order.indexOf('beam')).join(',') === 'beam,rotate,scan,zoom,done', order.join(','));
  ok('the target shows only its symbol all through the run', samples.filter(s => !s.done).every(s => s.tgt === SYM) && samples.filter(s => !s.done).length > 20);
  ok('the reasoning appears in order: none in the white beam, minimum deviation while rotating, n(lambda) while scanning, the minimum in the search',
     samples.filter(s => s.phase === 'beam').every(s => s.lines === 0) && samples.filter(s => s.phase === 'scan').every(s => s.lines >= 1 && s.lines <= 2) && samples.filter(s => s.phase === 'zoom').some(s => s.lines === 3) && samples.filter(s => !s.done).every(s => s.lines <= 3));
  const rot = await E(() => PX.rotPoints());
  const rmin = Math.min.apply(null, rot.map(q => q[1]));
  ok('rotating the prism at 0.6 um: D dips to a minimum inside the sweep, equal to the exact Dm', rot.length > 20 && rot[0][1] > rmin && rot[rot.length - 1][1] > rmin && Math.abs(rmin - dmExact(nOf(0.6), 6)) < 0.01, rot.length);
  const sc = await E(() => PX.scanPoints());
  ok('the scan: 31 wavelengths from 0.25 to 1.0 um, each Dm equal to the exact formula, lowest near 0.4 um', sc.length === 31 && sc.every(q => Math.abs(q[1] - dmExact(nOf(q[0]), 6)) < 1e-6)
     && Math.abs(sc.reduce((a, q) => q[1] < a[1] ? q : a)[0] - 0.4) < 0.03);
  const end = samples[samples.length - 1];
  ok('measured: lambda_min = 0.400 um, n = 1.800, Dm = 4.81 deg, thin-prism 4.80 deg, matched to option (B)', end.measured && Math.abs(end.measured.lam - 0.4) < 1e-6 && Math.abs(end.measured.D - DEX) < 1e-6 && end.measured.option === 'B');
  ok('the run reveals the value and option in the target and marks option (B) only', end.confirmed && (await p.innerText('#ansval')) === 'Dm = 4.81° at λ = 0.400 μm → (B)'
     && await E(() => [...document.querySelectorAll('#opts li.correct')].map(e => e.getAttribute('data-o')).join()) === 'B');
  ok('the narration gives lambda, n, Dm and the thin-prism check', /0\.400 μm, where n = 1\.800 and Dm = 4\.81°/.test(await p.textContent('#narr')) && /4\.80°/.test(await p.textContent('#narr')), await p.textContent('#narr'));
  ok('the target pulses as it is revealed', samples.some(s => s.pulse) || await E(() => document.getElementById('target').classList.contains('pulse')));
  await sleep(2200);
  ok('...and stops pulsing, the value kept', await E(() => !document.getElementById('target').classList.contains('pulse')) && (await p.innerText('#ansval')).indexOf('(B)') > 0);
  ok('after the run the What if… appears and the button offers RUN AGAIN', await E(() => !document.getElementById('wigroup').hidden) && /RUN AGAIN/.test(await p.textContent('#gobtn')));

  /* ------------------------------------------------ what if, the probe, the sliders */
  await E(() => PX.speed(3));
  await p.click('#wi_rot'); await sleep(200);
  ok('What if the prism is rotated at lambda_min: the incidence sweeps and D is measured', await E(() => PX.state().phase === 'wrot' && Math.abs(PX.state().lam - 0.4) < 1e-6));
  for (let i = 0; i < 100 && !(await E(() => PX.state().wrot.done)); i++) await sleep(50);
  const wr = await E(() => PX.rotPoints()), wmin = Math.min.apply(null, wr.map(q => q[1]));
  ok('...D is larger either side of the symmetric path; its least value is Dm = 4.81 deg', wr.length > 20 && wr[0][1] > wmin + 0.01 && wr[wr.length - 1][1] > wmin + 0.01 && Math.abs(wmin - DEX) < 0.01 && /symmetric path/.test(await p.textContent('#narr')));
  await E(() => PX.speed(1));
  await p.$eval('#in_l', el => { el.value = '0.6'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('probe 0.6 um: n = 2.067, Dm = 6.42 deg (thin prism 6.4, option A\'s value) - more than at lambda_min', await E(() => PX.state().phase === 'probe') && /n = 2\.067, Dm = 6\.42°, more than at λmin/.test(await p.textContent('#narr')) && (await p.textContent('#out_l')) === '0.600 μm', await p.textContent('#narr'));
  await p.$eval('#in_al', el => { el.value = '4'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('alpha 4: the lab measures again - lambda_min = (2 beta/alpha)^(1/3) = 0.363 um, and it matches no option', await E(() => PX.state().phase === 'explore' && Math.abs(PX.state().view.lam - Math.cbrt(0.048)) < 1e-4 && PX.state().view.answer === null)
     && /matches no option/.test(await p.textContent('#narr')) && (await p.textContent('#out_al')) === '4.0 μm⁻¹' && (await p.innerText('#ansval')).indexOf('(B)') > 0);
  await p.$eval('#in_A', el => { el.value = '3'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.$eval('#in_al', el => { el.value = '3'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('A = 3 deg at the question index law: Dm about half, 2.40 deg thin - matched to (D)', await E(() => PX.state().view.answer === 'D' && Math.abs(PX.state().view.lam - 0.4) < 1e-4) && (await p.textContent('#out_A')) === '3.0°');
  await E(() => PX.set('beta', 9)); ok('beta is clamped to 0.15 um² (keeps n >= 1.1)', await E(() => PX.state().p.beta) === 0.15);
  await E(() => PX.set('A', 'x')); ok('a non-number falls back to the default (A = 6 deg)', await E(() => PX.state().p.A) === 6);

  /* ------------------------------------------------ pause, replay, reset */
  await E(() => { PX.set('beta', 0.096); });
  await p.click('#replaybtn'); await sleep(250);
  ok('REPLAY reruns on the slider values with the target back to its symbol', await E(() => PX.state().state === 'running' && PX.state().measured === null && PX.state().p.A === 6 && PX.state().p.beta === 0.096)
     && (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === SYM && await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  await sleep(900); await p.click('#gobtn'); const t0 = await E(() => PX.RUN.st); await sleep(500);
  ok('PAUSE freezes the run', await E(() => PX.RUN.st) === t0 && /RESUME/.test(await p.textContent('#gobtn')) && /^Paused/.test(await p.textContent('#narr')));
  await p.click('#gobtn'); await sleep(200);
  ok('RESUME carries on', await E(() => PX.state().state) === 'running');
  await p.click('#resetbtn'); await sleep(150);
  ok('RESET returns to the ready state on the question values: nothing measured, the target symbol only, What if hidden', await E(() => PX.state().state === 'setup' && PX.state().phase === 'ready' && PX.state().scan === 0
     && PX.state().p.A === 6 && PX.state().p.alpha === 3 && PX.state().p.beta === 0.096 && document.getElementById('wigroup').hidden) && /Ready/.test(await p.textContent('#narr')) && (await p.innerText('#ansval')) === '');
  await p.$eval('#in_A', el => { el.value = '8'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('a slider moved before START sets up the next run', /thin 8\.0° prism/.test(await p.textContent('#narr')) && await E(() => PX.state().state) === 'setup');
  await p.click('#resetbtn'); await sleep(100);
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
    ok('the run matches option (B) at ' + w + ' px too', ms2[ms2.length - 1].measured && ms2[ms2.length - 1].measured.option === 'B' && ms2[ms2.length - 1].confirmed);
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await mc.close();
  }

  /* ------------------------------------------------ reduced motion */
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.click('#gobtn'); await sleep(150);
  const rs = await rp.evaluate(() => PX.state());
  ok('reduced motion: one press runs every measurement and shows the answer at once, no blinking',
     rs.done && rs.scan === 31 && rs.rot > 20 && rs.measured && rs.measured.option === 'B' && rs.confirmed && rs.phase === 'done'
     && await rp.evaluate(() => { const k = document.getElementById('target'); k.classList.add('pulse'); const a = getComputedStyle(k).animationName; k.classList.remove('pulse'); return a === 'none'; }) && re.length === 0, JSON.stringify(rs).slice(0, 200) + ' ' + re.join('|'));
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 2, Physics, Q.3',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 2' && e.paperNumber === 2 && e.subject === 'Physics' && e.questionNumber === 3);
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
  const T = __dirname + '/apptest-p2phyq03';
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
    await a.fill('#q', 'prism spectrum'); await sleep(700);
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
