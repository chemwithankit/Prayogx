/* ADV-2026-P2-PHY-Q01 - the electron drift lab: a wire across a battery with internal resistance; the switch sets
   up the field at once, the magnifier shows random motion against a slow real drift, and R, I, n and vd are measured
   in turn; vd = I/(neA) = sigma E/(ne) = 0.208 mm/s, option C; then the what-if tests and the race.

   Layout v3 (G5) with the target display. Drives the finished page headlessly: the file itself, the question and
   options (none marked before the run), every target check (tests/target_gate.js), one START through switch, zoom,
   count and measure with the lines appearing in order, the real-speed tracer, the reveal, the sliders and the
   free-electron count, the what-if tests (r = 0, thicker wire, the race), the optional guess, pause / replay / reset,
   classroom mode, the measured visual gates A-K, phone widths, reduced motion, the library and feed entries, and
   the real app shell.

   Run:  node tests/sim_p2phyq01.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { targetChecks } = require('./target_gate');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P2-PHY-Q01';
const REL = 'simulations/2026/paper-2/physics/adv-2026-p2-phy-q01/';
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
  ok('the answer is not written into the script: the option is the one the measured drift velocity matches',
     /var ANS = QRUN\.answer/.test(src) && /function circuit/.test(js) && /function pick/.test(js) && /answer: pick\(c\.vd\)/.test(js) && !/ANS\s*=\s*["']|["']\(C\)["']|0\.208 mm/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('the guess is optional and never gates the run (START works with no guess)', /function setGuess/.test(js) && !/guess[^;]{0,40}return/.test(js.slice(js.indexOf('function start'), js.indexOf('function resetRun'))));
  ok('layout v3 contract: question, lab (canvas + controls), solution, how to use - in that order',
     ['<section id="question"', '<section id="lab"', '<canvas id="labcv"', '<div id="controls"', '<section id="solution"', '<section id="howto"']
       .map(t => src.indexOf(t)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])));
  ok('no dashboards on the page: no rail, gauges, badges, log, evidence table or audit cards', !/class="(rail|gz|badge|badges|calc)"|id="(calclist|log|logbox)"/.test(src));
  ok('no dropdowns anywhere', !/<select/.test(src));
  ok('the target area is in the experiment: #target (option) with a symbol and an empty value',
     /<section id="lab"[\s\S]*<p class="keyres" id="target" data-kind="option"[^>]*><span class="lbl">Target:<\/span><span class="sym">[\s\S]+?<\/span><span class="val" id="ansval"><\/span><\/p>/.test(src));
  ok('the solution works every step, checks through the field, explains the options and the instant current',
     /Understand the concept/.test(src) && /Key takeaways/.test(src) && /Check through the field/.test(src) && /0\.417 mm s/.test(src) && /current appears immediately/.test(src));
  ok('the scale honesty is stated on the page: particles drawn huge, the drift shown at its real speed, the race time-lapse labelled',
     /drawn far larger than real/.test(src) && /real speed/.test(src) && /time-lapse/.test(src));

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
  ok('the question is reproduced verbatim', qt === 'Q.1 A metal wire of cross-sectional area 0.5 mm2 and length 100 m is connected across a battery of e.m.f. 2 V and internal resistance 1 Ω. The density, atomic mass and electrical conductivity of the metal are 6.35 × 103 kg m−3, 63.5 gm/mole and 2 × 108 mho m−1, respectively. Assuming one conduction electron per atom of the metal, the drift velocity (in mm s−1) of the electrons in the wire is: [Take Avogadro’s number as 6 × 1023 and charge of the electron as 1.6 × 10−19 C.]', qt.slice(0, 140));
  const opts = await E(() => [...document.querySelectorAll('#opts li')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('the four options verbatim', opts.join(' | ') === '(A)0.052 | (B)0.104 | (C)0.208 | (D)0.156', opts.join(' | '));
  ok('no option is marked before the experiment', await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  ok('the target shows only its symbol at load', (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === 'TARGET: drift velocity vd (mm s−1)');
  ok('PX.answer() gives the registry answer', await E(() => PX.answer()) === 'C');
  ok('the engine: R = 1 Ω, I = 1 A, V = 1 V, E = 0.01 V/m, n = 6e28, vd = 1/4800 m/s; both routes agree',
     await E(() => { const c = PX.ENGINE.circuit(); return Math.abs(c.R - 1) < 1e-12 && Math.abs(c.I - 1) < 1e-12 && Math.abs(c.V - 1) < 1e-12 && Math.abs(c.E - 0.01) < 1e-15
       && Math.abs(c.n - 6e28) < 1e16 && Math.abs(c.vd - 1 / 4800) < 1e-15 && Math.abs(c.vdField - c.vd) < 1e-18; }));
  ok('the engine responds to every input: r = 0 doubles I; doubling free electrons halves vd; 2 x L halves vd with an ideal battery',
     await E(() => { const C = PX.ENGINE.circuit, b = C().vd; return Math.abs(C({ r: 0 }).I - 2) < 1e-12 && Math.abs(C({ z: 2 }).vd - b / 2) < 1e-18 && Math.abs(C({ r: 0, L: 200 }).vd - C({ r: 0 }).vd / 2) < 1e-18; }));
  ok('the option matcher: 0.417 mm/s (r = 0) matches no option; 0.2083 matches C', await E(() => PX.ENGINE.pick(PX.ENGINE.circuit({ r: 0 }).vd) === null && PX.ENGINE.pick(1 / 4800) === 'C'));
  ok('the graph is computed: flat for r = 0, falling for r = 1 Ω', await E(() => { const f = PX.ENGINE.curve(0, {}, 0.1, 2, 10).map(x => x[1]), g = PX.ENGINE.curve(1, {}, 0.1, 2, 10).map(x => x[1]);
     return Math.max.apply(null, f) - Math.min.apply(null, f) < 1e-15 && g.every((v, i) => i === 0 || v < g[i - 1]); }));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(C)');
  ok('ready state: switch open, nothing measured, no what-if yet', await E(() => PX.state().phase === 'ready' && !PX.state().on && PX.state().lines === 0 && document.getElementById('wigroup').hidden) && /Ready/.test(await p.textContent('#narr')));
  ok('the canvas reports its smallest label, >= 13 px on the desktop', await E(() => PX.minLabelPx()) >= 13, await E(() => PX.minLabelPx()));

  /* ------------------------------------------------ one START runs the whole experiment */
  await p.click('#g3');
  ok('the optional guess can be chosen before the run (and changes nothing in the physics)', await E(() => PX.state().guess === 'g3' && Math.abs(PX.state().vd - 1 / 4800) < 1e-15));
  await p.click('#gobtn');
  ok('START runs it and the button becomes PAUSE', await E(() => PX.state().state) === 'running' && /PAUSE/.test(await p.textContent('#gobtn')));
  await p.click('#gobtn');
  const samples = await runToEnd(p, 3);
  const order = []; samples.forEach(s => { if (order[order.length - 1] !== s.phase) order.push(s.phase); });
  ok('with no further clicks it runs switch, zoom, count, measure, then the result', order.slice(order.indexOf('switch')).join(',') === 'switch,zoom,count,measure,done', order.join(','));
  ok('the target shows only its symbol all through the run', samples.filter(s => !s.done).every(s => s.tgt === 'TARGET: drift velocity vd (mm s−1)') && samples.filter(s => !s.done).length > 20);
  ok('the switch closes during the switch stage and the current is there at once (before the magnifier opens)', samples.some(s => s.phase === 'switch' && s.on) && samples.filter(s => s.phase === 'zoom').every(s => s.on));
  ok('the calculation fills in order: R and I while counting, n while measuring, vd at the end', samples.filter(s => s.phase === 'count').some(s => s.lines === 2) && samples.filter(s => s.phase === 'switch' || s.phase === 'zoom').every(s => s.lines === 0)
     && samples.filter(s => s.phase === 'measure').some(s => s.lines === 3) && samples.filter(s => !s.done).every(s => s.lines < 4));
  ok('the tracer moves at the real drift speed: displacement / time = vd at every sample (mm, s)', samples.filter(s => s.phase === 'measure' && s.tracerT > 0).every(s => Math.abs(s.tracer / s.tracerT - s.vd * 1e3) < 1e-9)
     && samples.filter(s => s.phase === 'measure' && s.tracerT > 0).length > 5);
  ok('the magnifier names the drift but gives no value until the timing step has measured it',
     samples.filter(s => s.on && !s.done && s.driftLabel).every(s => s.driftLabel === '← electrons drift') && samples.filter(s => s.on && !s.done && s.driftLabel).length > 10
     && /^← electrons drift 0\.208 mm\/s$/.test(await (async () => { await sleep(150); return E(() => PX.state().driftLabel); })()));
  const end = samples[samples.length - 1];
  ok('measured: vd = tracer displacement / time = 0.2083 mm/s, matched to option C', end.measured && Math.abs(end.measured.vd - 1 / 4800) < 1e-12 && end.measured.option === 'C');
  ok('the run reveals the value and option in the target and marks option (C) only', end.confirmed && (await p.innerText('#ansval')) === '0.208 mm s⁻¹ → (C)'
     && await E(() => [...document.querySelectorAll('#opts li.correct')].map(e => e.getAttribute('data-o')).join()) === 'C');
  ok('the narration reports the 5.6-day journey and answers the guess', /5\.6 days/.test(await p.textContent('#narr')) && /slower than a snail” - right/.test(await p.textContent('#narr')), await p.textContent('#narr'));
  ok('the target pulses as it is revealed', samples.some(s => s.pulse) || await E(() => document.getElementById('target').classList.contains('pulse')));
  await sleep(2200);
  ok('...and stops pulsing, the value kept', await E(() => !document.getElementById('target').classList.contains('pulse')) && (await p.innerText('#ansval')).indexOf('(C)') > 0);
  ok('after the run the What if… tests appear and the button offers RUN AGAIN', await E(() => !document.getElementById('wigroup').hidden) && /RUN AGAIN/.test(await p.textContent('#gobtn')));

  /* ------------------------------------------------ what if, the sliders, the race */
  await E(() => PX.speed(1));                                       /* the run above played at 3x; the what-if tests run at 1x */
  await p.click('#wi_r0'); await sleep(80);
  ok('What if r = 0: I = 2 A, V = 2 V, vd = 0.417 mm/s - and the narration says it matches no option', await E(() => PX.state().p.r === 0 && Math.abs(PX.state().I - 2) < 1e-12 && Math.abs(PX.state().V - 2) < 1e-12 && Math.abs(PX.state().vd * 1e3 - 0.41667) < 1e-4)
     && /matches no option/.test(await p.textContent('#narr')) && (await p.innerText('#ansval')).indexOf('(C)') > 0);
  await p.$eval('#in_A', el => { el.value = '1'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('r = 0 and a slider to A = 1 mm²: twice the current, the same drift velocity', await E(() => PX.state().p.Amm2 === 1 && Math.abs(PX.state().I - 4) < 1e-12 && Math.abs(PX.state().vd * 1e3 - 0.41667) < 1e-4) && (await p.textContent('#out_A')) === '1.00 mm²');
  await p.$eval('#in_r', el => { el.value = '1'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('r back to 1 Ω at A = 1 mm²: vd falls (I/(neA) with the internal resistance)', await E(() => Math.abs(PX.state().vd * 1e3 - (2 / 1.5) / (6e28 * 1.6e-19 * 1e-6) * 1e3) < 1e-9 && PX.state().vd * 1e3 < 0.208));
  await p.$eval('#in_L', el => { el.value = '200'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('the length slider recalculates R, E and vd', await E(() => PX.state().p.L === 200 && Math.abs(PX.state().R - 200 / (2e8 * 1e-6)) < 1e-9) && (await p.textContent('#out_L')) === '200 m');
  await p.click('#z2'); await sleep(60);
  ok('two free electrons per atom: n doubles', await E(() => PX.state().p.z === 2 && Math.abs(PX.state().n - 1.2e29) < 1e17));
  await E(() => PX.set('Amm2', 99)); ok('the cross-section is clamped to 2 mm²', await E(() => PX.state().p.Amm2) === 2);
  await E(() => PX.set('r', 'x')); ok('a non-number falls back to the question (r = 1 Ω)', await E(() => PX.state().p.r) === 1);
  await p.click('#wi_thick'); await sleep(1400);
  const mid = await E(() => PX.state().p.Amm2);
  ok('What if thicker wire: the cross-section sweeps from the question values (a genuine recalculation)', mid > 0.3 && mid < 2 && await E(() => PX.state().p.L === 100 && PX.state().p.z === 1) && /graph/.test(await p.textContent('#narr')), mid);
  await sleep(2200);
  ok('...and ends back at A = 0.5 mm² with the conclusion', await E(() => PX.state().p.Amm2 === 0.5) && /flat/.test(await p.textContent('#narr')));
  await p.click('#tl5'); await p.click('#wi_race'); await sleep(1500);
  const r1 = await E(() => PX.state());
  ok('the race starts from the question: the field arrives at once; the electron drifts at the real vd in a labelled time-lapse',
     r1.phase === 'race' && r1.race && r1.race.t > 0 && r1.tl === 100000 && Math.abs(r1.p.r - 1) < 1e-12 && /microsecond/.test(await p.textContent('#narr')) && /×100,000/.test(await p.textContent('#narr')));
  await sleep(5200);
  ok('...and finishes after 480 000 s of real time (5.6 days)', await E(() => PX.state().race.done && Math.abs(PX.state().race.t - 480000) < 1e-6) && /5\.6 days/.test(await p.textContent('#narr')));

  /* ------------------------------------------------ pause, replay, reset */
  await E(() => PX.speed(1)); await p.click('#replaybtn'); await sleep(250);
  ok('REPLAY reruns from the question values with the target back to its symbol', await E(() => PX.state().state === 'running' && PX.state().measured === null && PX.state().p.Amm2 === 0.5 && PX.state().p.r === 1 && PX.state().p.L === 100 && PX.state().p.z === 1)
     && (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === 'TARGET: drift velocity vd (mm s−1)' && await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  await sleep(700); await p.click('#gobtn'); const t0 = await E(() => PX.RUN.st); await sleep(500);
  ok('PAUSE freezes the run', await E(() => PX.RUN.st) === t0 && /RESUME/.test(await p.textContent('#gobtn')) && /^Paused/.test(await p.textContent('#narr')));
  await p.click('#gobtn'); await sleep(200);
  ok('RESUME carries on', await E(() => PX.state().state) === 'running');
  await p.click('#resetbtn'); await sleep(150);
  ok('RESET returns to the ready state: switch open, nothing measured, the target symbol only, What if hidden', await E(() => PX.state().state === 'setup' && PX.state().phase === 'ready' && !PX.state().on && PX.state().lines === 0 && document.getElementById('wigroup').hidden)
     && /Ready/.test(await p.textContent('#narr')) && (await p.innerText('#ansval')) === '');
  await p.$eval('#in_r', el => { el.value = '2'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('a slider moved before START previews the circuit and says START uses the question', /question's own values/.test(await p.textContent('#narr')));
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
    const ms2 = await runToEnd(mp, 6);
    const ov1 = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const taps = await mp.evaluate(() => [...document.querySelectorAll('#controls button, #controls input')].map(e => e.getBoundingClientRect().height));
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('44 px touch targets at ' + w + ' px', Math.min.apply(null, taps) >= 44, Math.round(Math.min.apply(null, taps)));
    ok('the run matches option (C) at ' + w + ' px too', ms2[ms2.length - 1].measured && ms2[ms2.length - 1].measured.option === 'C' && ms2[ms2.length - 1].confirmed);
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await mc.close();
  }

  /* ------------------------------------------------ reduced motion */
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.click('#gobtn'); await sleep(150);
  const rs = await rp.evaluate(() => PX.state());
  ok('reduced motion: one press shows every measured line and the answer at once, no blinking',
     rs.done && rs.measured && rs.measured.option === 'C' && rs.confirmed && rs.phase === 'done'
     && await rp.evaluate(() => { const k = document.getElementById('target'); k.classList.add('pulse'); const a = getComputedStyle(k).animationName; k.classList.remove('pulse'); return a === 'none'; }) && re.length === 0, JSON.stringify(rs) + ' ' + re.join('|'));
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 2, Physics, Q.1',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 2' && e.paperNumber === 2 && e.subject === 'Physics' && e.questionNumber === 1);
  ok('status script_verified - automated pipeline, no human review', e && e.status === 'script_verified');
  ok('chapter Current Electricity', e && e.chapter === 'Current Electricity');
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
  const T = __dirname + '/apptest-p2phyq01';
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
    await a.fill('#q', 'electron drift'); await sleep(700);
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
