/* ADV-2026-P2-PHY-Q05 - the twin-prism mirror bench: two isosceles prisms with vertical facing sides and a mirror; the
   beam is traced exactly (Snell's law at four faces, reflection at the mirror) and the four statements are tested by
   measurement: (D) prism 1 at minimum deviation, (B) a counter-example, (A) both at minimum deviation, (C) thin prisms
   with theta between the apex-angle bisectors; the correct set (A), (C), (D).

   Layout v3 (G5) with the target display. Drives the finished page headlessly: the file itself, the question, its
   redrawn figure and the options (none marked before the run), every target check (tests/target_gate.js), one START
   through trace and the four tests with the board filling in order, the reveal, the presets and sliders, pause /
   replay / reset, classroom mode, the measured visual gates A-K, phone widths, reduced motion, the library and feed
   entries, and the real app shell.

   Run:  node tests/sim_p2phyq05.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { targetChecks } = require('./target_gate');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P2-PHY-Q05';
const REL = 'simulations/2026/paper-2/physics/adv-2026-p2-phy-q05/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const SYM = 'TARGET: the correct statement(s)';
const D2R = Math.PI / 180;

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
  ok('the answer is not written into the script: the set is built from the four measured verdicts',
     /var ANS = QRUN\.answer/.test(src) && /function testA/.test(js) && /function testB/.test(js) && /function testC/.test(js) && /function testD/.test(js) && /letters\.join/.test(js) && !/["']\(A\), \(C\), \(D\)["']/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('layout v3 contract: question, lab (canvas + controls), solution, how to use - in that order',
     ['<section id="question"', '<section id="lab"', '<canvas id="labcv"', '<div id="controls"', '<section id="solution"', '<section id="howto"']
       .map(t => src.indexOf(t)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])));
  ok('no dashboards on the page: no rail, gauges, badges, log, evidence table or audit cards', !/class="(rail|gz|badge|badges|calc)"|id="(calclist|log|logbox)"/.test(src));
  ok('no dropdowns anywhere', !/<select/.test(src));
  ok('the target area is in the experiment: #target (option) with a symbol and an empty value',
     /<section id="lab"[\s\S]*<p class="keyres" id="target" data-kind="option"[^>]*><span class="lbl">Target:<\/span><span class="sym">[\s\S]+?<\/span><span class="val" id="ansval"><\/span><\/p>/.test(src));
  ok('the solution proves each statement, explains theta from the bisectors and names the trap',
     /Understand the concept/.test(src) && /Key takeaways/.test(src) && /\(B\) is false/.test(src) && /bisector of the prism angle/.test(src) && /A trap/.test(src));
  ok('the figure is redrawn in the question with an accessible description', /<div class="qfig" role="img" aria-label="Figure:/.test(src));

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
  ok('the question is reproduced verbatim', qt === "Q.5 Consider two isosceles prisms 1 and 2 with prism angles A1 and A2 and refractive indices n1 and n2, respectively, as shown in the figure. The faces a1b1 and a2b2 are parallel to each other and perpendicular to the mirror M. If a ray of light is incident on the face a1c1 and emerges from the face a2c2, then the correct statement(s) is/are:", qt.slice(0, 140));
  const opts = await E(() => [...document.querySelectorAll('#opts li')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('the four options verbatim', JSON.stringify(opts) === JSON.stringify(["(A)If both the prisms are at minimum deviation condition, then n2n1 = sin(A12) / sin(A22).", "(B)If prism 2 is at minimum deviation condition, then sin i1 = n2 sin(A22) is always true.", "(C)If both the prisms 1 and 2 are thin and are at minimum deviation condition with angles of deviation δm1 and δm2, respectively, then θ = δm12(n1 − 1) + δm22(n2 − 1).", "(D)If prism 1 is at minimum deviation condition, then sin i2 = n1 sin(A12) is always true."]), opts.join(' | '));
  ok('no option is marked before the experiment', await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  ok('the target shows only its symbol at load', (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === SYM);
  ok('PX.answer() gives the registry answer', await E(() => PX.answer()) === '(A), (C), (D)');
  ok('the trace: at i1 = 40 deg the mirror gives i2 = e1, and the traced deviation equals the prism formula',
     await E(() => { const t = PX.ENGINE.trace({ i1: 40 }); return t.ok && Math.abs(t.i2 - t.e1) < 1e-9 && Math.abs(t.dev1 - PX.ENGINE.dev1({}, 40)) < 1e-9; }));
  ok('the minimum deviation of prism 1 is the symmetric path: i1 = e1 = asin(n1 sin(A1/2))', await E(() => { const i = PX.ENGINE.minDev1({}), t = PX.ENGINE.trace({ i1: i }); return Math.abs(i - Math.asin(1.5 * Math.sin(Math.PI / 6)) * 180 / Math.PI) < 1e-6 && Math.abs(t.e1 - i) < 1e-5; }));
  ok('the engine verdicts: A true, B false, C true, D true', await E(() => { const v = PX.QRUN.verdicts; return v.A && !v.B && v.C && v.D; }));
  ok('theta is the angle between the apex bisectors, (A1 + A2)/2; between the faces it would be A1 + A2', await E(() => Math.abs(PX.ENGINE.theta({}) - 55) < 1e-9 && Math.abs(PX.ENGINE.faceAngle({}) - 110) < 1e-9));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(A), (C), (D)');
  ok('ready state: nothing tested yet, no presets yet', await E(() => PX.state().phase === 'ready' && PX.state().tested.length === 0 && document.getElementById('wigroup').hidden) && /Ready/.test(await p.textContent('#narr')));
  ok('the canvas reports its smallest label, >= 13 px on the desktop', await E(() => PX.minLabelPx()) >= 13, await E(() => PX.minLabelPx()));

  /* ------------------------------------------------ one START runs the whole experiment */
  await p.click('#gobtn');
  ok('START runs it and the button becomes PAUSE', await E(() => PX.state().state) === 'running' && /PAUSE/.test(await p.textContent('#gobtn')));
  await p.click('#gobtn');
  const samples = await runToEnd(p, 3);
  const order = []; samples.forEach(s => { if (order[order.length - 1] !== s.phase) order.push(s.phase); });
  ok('with no further clicks it traces, tests D, B, A, C, gives the verdict, then the result', order.slice(order.indexOf('trace')).join(',') === 'trace,testD,testB,testA,testC,verdict,done', order.join(','));
  ok('the target shows only its symbol all through the run', samples.filter(s => !s.done).every(s => s.tgt === SYM) && samples.filter(s => !s.done).length > 20);
  ok('the board fills in order: nothing while tracing, D first, then B, A, C', samples.filter(s => s.phase === 'trace' || s.phase === 'testD').every(s => s.tested.length === 0)
     && samples.filter(s => s.phase === 'testB').every(s => s.tested.join() === 'D') && samples.filter(s => s.phase === 'testC').every(s => s.tested.join() === 'D,B,A'));
  ok('while tracing, every sample has i2 = e1 (the mirror link)', samples.filter(s => s.phase === 'trace' && s.ok).every(s => Math.abs(s.i2 - s.e1) < 1e-9) && samples.filter(s => s.phase === 'trace' && s.ok).length > 5);
  ok('test D scans the incidence and records a deviation curve', samples.some(s => s.phase === 'testD' && s.scan > 10));
  ok('test B ends at prism 2 symmetric (e2 = i2) with n2 = 1.6 and i1 not equal to e1', samples.filter(s => s.phase === 'testB').slice(-1).every(s => Math.abs(s.e2 - s.i2) < 1e-3 && Math.abs(s.cfg.n2 - 1.6) < 1e-12 && Math.abs(s.cfg.i1 - s.e1) > 1));
  ok('test A ends with both prisms symmetric (i1 = e1, i2 = e2)', samples.filter(s => s.phase === 'testA').slice(-1).every(s => Math.abs(s.cfg.i1 - s.e1) < 1e-4 && Math.abs(s.e2 - s.i2) < 1e-4));
  ok('test C ends on thin prisms (5 deg and 4.5 deg) at minimum deviation', samples.filter(s => s.phase === 'testC').slice(-1).every(s => Math.abs(s.cfg.A1 - 5) < 1e-9 && Math.abs(s.cfg.A2 - 4.5) < 1e-9 && Math.abs(s.e2 - s.i2) < 1e-3));
  const end = samples[samples.length - 1];
  ok('measured: the correct set is (A), (C), (D)', end.measured && end.measured.answer === '(A), (C), (D)' && end.measured.verdicts.A && !end.measured.verdicts.B && end.measured.verdicts.C && end.measured.verdicts.D);
  ok('the run reveals the set in the target and marks options A, C and D only', end.confirmed && (await p.innerText('#ansval')) === '(A), (C), (D) are correct'
     && await E(() => [...document.querySelectorAll('#opts li.correct')].map(e => e.getAttribute('data-o')).join()) === 'A,C,D');
  ok('the narration gives the result and the mirror link', /\(A\), \(C\), \(D\)/.test(await p.textContent('#narr')) && /i₂ = e₁ always/.test(await p.textContent('#narr')));
  ok('the narration during test C shows theta 4.750 deg against the formula and the face angle', samples.some(s => s.phase === 'testC' && /4\.750°/.test(s.narr) && /9\.50°/.test(s.narr)));
  ok('the target pulses as it is revealed', samples.some(s => s.pulse) || await E(() => document.getElementById('target').classList.contains('pulse')));
  await sleep(2200);
  ok('...and stops pulsing, the value kept', await E(() => !document.getElementById('target').classList.contains('pulse')) && (await p.innerText('#ansval')).indexOf('(C)') > 0);
  ok('after the run the presets appear and the button offers RUN AGAIN', await E(() => !document.getElementById('wigroup').hidden) && /RUN AGAIN/.test(await p.textContent('#gobtn')));

  /* ------------------------------------------------ presets and sliders */
  await p.click('#wi_thin'); await sleep(200);
  ok('Set thin prisms: A1 5 deg, A2 4.5 deg, at minimum deviation, theta = 4.750 deg = (A1 + A2)/2', await E(() => PX.state().p.A1 === 5 && PX.state().p.A2 === 4.5 && Math.abs(PX.state().e1 - PX.state().p.i1) < 1e-4) && /θ = 4\.750° = \(A₁ \+ A₂\)\/2/.test(await p.textContent('#narr')) && (await p.textContent('#out_i')) === (await E(() => PX.state().p.i1.toFixed(1))) + '°');
  await E(() => { PX.set('A1', 60); PX.set('A2', 50); PX.set('n1', 1.5); PX.set('n2', 1.6); PX.set('i1', 40); });
  await p.click('#wi_min1'); await sleep(150);
  ok('Set prism 1 at min deviation: i1 = e1, and sin i2 = n1 sin(A1/2) with n2 = 1.6', await E(() => { const s = PX.state(); return Math.abs(s.e1 - s.p.i1) < 1e-4 && Math.abs(Math.sin(s.i2 * Math.PI / 180) - 0.75) < 1e-6 && s.p.n2 === 1.6; }));
  await p.click('#wi_both'); await sleep(150);
  ok('Set both at min deviation: n2 becomes 1.775 and prism 2 is symmetric too', await E(() => { const s = PX.state(); return Math.abs(s.p.n2 - 1.7746511834873537) < 1e-6 && Math.abs(s.e2 - s.i2) < 1e-4; }));
  await p.$eval('#in_i', el => { el.value = '30'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('the incidence slider re-traces the beam at once, i2 still equal to e1', await E(() => PX.state().p.i1 === 30 && Math.abs(PX.state().i2 - PX.state().e1) < 1e-9) && (await p.textContent('#out_i')) === '30.0°');
  await p.$eval('#in_a1', el => { el.value = '45'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('the prism-angle slider reshapes prism 1', await E(() => PX.state().p.A1 === 45) && (await p.textContent('#out_a1')) === '45.0°');
  await E(() => PX.set('n1', 9)); ok('n1 is clamped to 1.9', await E(() => PX.state().p.n1) === 1.9);
  await E(() => PX.set('A2', 'x')); ok('a non-number falls back to the default (A2 = 50 deg)', await E(() => PX.state().p.A2) === 50);
  await E(() => { PX.set('A1', 70); PX.set('n1', 1.9); PX.set('i1', 80); });
  ok('a setting with no path through both prisms is said so, not drawn as if it worked', await E(() => !PX.state().ok) && /does not reach prism 2/.test(await p.textContent('#narr')));

  /* ------------------------------------------------ pause, replay, reset */
  await p.click('#replaybtn'); await sleep(250);
  ok('REPLAY with settings that give no path falls back to the bench prisms and says so', await E(() => PX.state().state === 'running' && PX.state().p.A1 === 60 && PX.state().p.n1 === 1.5) && /no beam path through both prisms/.test(await p.textContent('#narr'))
     && (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === SYM && await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  await sleep(700); await p.click('#gobtn'); const t0 = await E(() => PX.RUN.st); await sleep(500);
  ok('PAUSE freezes the run', await E(() => PX.RUN.st) === t0 && /RESUME/.test(await p.textContent('#gobtn')) && /^Paused/.test(await p.textContent('#narr')));
  await p.click('#gobtn'); await sleep(200);
  ok('RESUME carries on', await E(() => PX.state().state) === 'running');
  await p.click('#resetbtn'); await sleep(150);
  ok('RESET returns to the ready state on the bench values: nothing tested, the target symbol only, presets hidden', await E(() => PX.state().state === 'setup' && PX.state().phase === 'ready' && PX.state().tested.length === 0
     && PX.state().p.A1 === 60 && PX.state().p.A2 === 50 && PX.state().p.n2 === 1.775 && PX.state().p.i1 === 40 && document.getElementById('wigroup').hidden) && /Ready/.test(await p.textContent('#narr')) && (await p.innerText('#ansval')) === '');

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
    ok('the run finds (A), (C), (D) at ' + w + ' px too', ms2[ms2.length - 1].measured && ms2[ms2.length - 1].measured.answer === '(A), (C), (D)' && ms2[ms2.length - 1].confirmed);
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
     rs.done && rs.tested.length === 4 && rs.measured && rs.measured.answer === '(A), (C), (D)' && rs.confirmed && rs.phase === 'done'
     && await rp.evaluate(() => { const k = document.getElementById('target'); k.classList.add('pulse'); const a = getComputedStyle(k).animationName; k.classList.remove('pulse'); return a === 'none'; }) && re.length === 0, JSON.stringify(rs).slice(0, 200) + ' ' + re.join('|'));
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 2, Physics, Q.5',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 2' && e.paperNumber === 2 && e.subject === 'Physics' && e.questionNumber === 5);
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
  const T = __dirname + '/apptest-p2phyq05';
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
    await a.fill('#q', 'twin-prism mirror'); await sleep(700);
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
