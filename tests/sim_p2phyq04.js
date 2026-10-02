/* ADV-2026-P2-PHY-Q04 - the orbit wobble lab (revision 2: a charged puck on an air table around a charged sphere,
   a real-time stopwatch - one simulated second is one real second): a body on a circular orbit under F = -k/r^2 is
   nudged outward
   with its angular momentum unchanged; Newton's second law is integrated, the radial period is measured from the
   maxima of r(t) and compared with the options: 2 pi l^3/(m k^2), option A, equal to the orbital period, so the
   orbit closes; then the sliders, the nudge size and the force-law what-if (rosettes for k/r^1.5 and k/r^2.5).

   Layout v3 (G5) with the target display. Drives the finished page headlessly: the file itself, the question and
   options (none marked before the run), every target check (tests/target_gate.js), one START through orbit,
   nudge, wobble and the comparison with the reasoning in order, angular momentum conserved, the measured period,
   the reveal, the what-if, the sliders, pause / replay / reset, classroom mode, the measured visual gates A-K,
   phone widths, reduced motion, the library and feed entries, and the real app shell.

   Run:  node tests/sim_p2phyq04.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { targetChecks } = require('./target_gate');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P2-PHY-Q04';
const REL = 'simulations/2026/paper-2/physics/adv-2026-p2-phy-q04/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const SYM = 'TARGET: period of the radial oscillation Tr';
const TA = 2 * Math.PI * 1000 / 2500;                            /* 2 pi l^3/(m k^2) at l = 10, m = 1, k = 50 */
const kep = d => { const a = 2 * (1 + d) * (1 + d) / (1 + 2 * d); return 2 * Math.PI * Math.sqrt(a * a * a / 50); };

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
  ok('the answer is not written into the script: the option is the one the measured radial period matches',
     /var ANS = QRUN\.answer/.test(src) && /function simulate/.test(js) && /function maxima/.test(js) && /pick\(m\.T, s\.p\)/.test(js) && !/ANS\s*=\s*["']|["']\(A\)["']/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('layout v3 contract: question, lab (canvas + controls), solution, how to use - in that order',
     ['<section id="question"', '<section id="lab"', '<canvas id="labcv"', '<div id="controls"', '<section id="solution"', '<section id="howto"']
       .map(t => src.indexOf(t)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])));
  ok('no dashboards on the page: no rail, gauges, badges, log, evidence table or audit cards', !/class="(rail|gz|badge|badges|calc)"|id="(calclist|log|logbox)"/.test(src));
  ok('no dropdowns anywhere', !/<select/.test(src));
  ok('the target area is in the experiment: #target (option) with a symbol and an empty value',
     /<section id="lab"[\s\S]*<p class="keyres" id="target" data-kind="option"[^>]*><span class="lbl">Target:<\/span><span class="sym">[\s\S]+?<\/span><span class="val" id="ansval"><\/span><\/p>/.test(src));
  ok('the solution derives Ueff, its curvature, the period, the closed orbit and explains every option',
     /Understand the concept/.test(src) && /Key takeaways/.test(src) && /Stiffness of the well/.test(src) && /closes on itself/.test(src) && /spring formula/.test(src));
  ok('the representative values and the small-nudge limit are stated on the page', /representative SI values/.test(src) && /small-nudge limit/.test(src));
  ok('the apparatus is stated: a charged puck on an air table, Coulomb attraction k/r^2, time in real time', /air table/.test(src) && /Coulomb/.test(src) && /real time/.test(src));
  ok('no speed control on the page: the motion always runs in real time', !/id="sp1"|id="sp2"/.test(src));

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
  ok('the question is reproduced verbatim', qt === 'Q.4 A particle of mass m, and angular momentum ℓ is moving in a circular orbit of radius r0 under the influence of an attractive force F(r) = − k r2 r̂. Keeping its angular momentum unchanged, the particle is displaced radially by a small distance δr ≪ r0, due to which its radial distance varies periodically. The corresponding time period is:', qt.slice(0, 140));
  ok('the force is shown as a vector (an arrow over F)', await E(() => getComputedStyle(document.querySelector('#question .vec'), '::after').content.indexOf('→') >= 0));
  const opts = await E(() => [...document.querySelectorAll('#opts li')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('the four options verbatim', opts.join(' | ') === '(A)2πℓ3mk2 | (B)2π√mk | (C)2πℓ33mk2 | (D)2πℓ35mk2', opts.join(' | '));
  ok('no option is marked before the experiment', await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  ok('the target shows only its symbol at load', (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === SYM);
  ok('PX.answer() gives the registry answer', await E(() => PX.answer()) === 'A');
  ok('the engine: r0 = 2 m, orbital period 2.513 s, measured Tr equal to the Kepler period for dr = 0.05 (1e-6), angular momentum conserved',
     await E(k => { const q = PX.ENGINE.run(), L = q.sim.rec.map(x => x[4]); return Math.abs(q.sim.r0 - 2) < 1e-12 && Math.abs(q.sim.Tc - 2 * Math.PI * 1000 / 2500) < 1e-12 && Math.abs(q.m.T - k) / k < 1e-6 && Math.max.apply(null, L) - Math.min.apply(null, L) < 1e-9; }, kep(0.05)));
  ok('the engine: as the nudge shrinks the period approaches 2 pi l^3/(mk^2) (dr = 0.01: within 0.03 %)', await E(a => Math.abs(PX.ENGINE.run({ dr: 0.01 }).m.T / a - 1) < 3e-4, TA));
  ok('the engine: options evaluated with the same values - A 2.513 s, B 0.889 s, C 0.838 s, D 0.503 s', await E(() => { const p0 = PX.ENGINE.params(), O = PX.ENGINE.OPTS;
     return Math.abs(O.A(p0) - 2.5133) < 1e-4 && Math.abs(O.B(p0) - 0.8886) < 1e-4 && Math.abs(O.C(p0) - 0.8378) < 1e-4 && Math.abs(O.D(p0) - 0.5027) < 1e-4; }));
  ok('the engine: K/r^2.5 (same circle) gives Tr/Torbit = sqrt(2) - the orbit would not close', await E(() => { const v = PX.ENGINE.run({ n: 2.5 }, 6.5); return Math.abs(v.m.T / v.sim.Tc - Math.SQRT2) < 0.01 && v.answer === null; }));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(A)');
  ok('ready state: on the circle, nothing measured, no what-if yet', await E(() => PX.state().phase === 'ready' && Math.abs(PX.state().r - 2) < 1e-12 && PX.state().T === null && document.getElementById('wigroup').hidden) && /Ready/.test(await p.textContent('#narr')));
  ok('the canvas reports its smallest label, >= 13 px on the desktop', await E(() => PX.minLabelPx()) >= 13, await E(() => PX.minLabelPx()));

  /* ------------------------------------------------ one START runs the whole experiment */
  await p.click('#gobtn');
  ok('START runs it and the button becomes PAUSE', await E(() => PX.state().state) === 'running' && /PAUSE/.test(await p.textContent('#gobtn')));
  await p.click('#gobtn');
  const samples = await runToEnd(p, 3);
  const order = []; samples.forEach(s => { if (order[order.length - 1] !== s.phase) order.push(s.phase); });
  ok('with no further clicks it runs one orbit, the wobble (instant nudge), the comparison, then the result', order.slice(order.indexOf('orbit')).join(',') === 'orbit,wobble,compare,done', order.join(','));
  ok('the stopwatch is the motion\'s own time: it reads the time since START during the orbit and the wobble, the circle lasting exactly one orbit',
     samples.filter(s => s.phase === 'orbit' || s.phase === 'wobble').every(s => Math.abs(s.clock - s.st) < 1e-9) && samples.filter(s => s.phase === 'wobble').every(s => Math.abs(s.ts - (s.st - s.tOrbit)) < 1e-9 || s.ts === s.st - s.tOrbit)
     && Math.abs(samples[samples.length - 1].tOrbit - TA) < 1e-9);
  ok('the target shows only its symbol all through the run', samples.filter(s => !s.done).every(s => s.tgt === SYM) && samples.filter(s => !s.done).length > 20);
  ok('on the circle the distance stays r0; the instant nudge puts the puck at r0(1 + dr) at the start of the wobble', samples.filter(s => s.phase === 'orbit').every(s => Math.abs(s.r - 2) < 1e-12) && samples.filter(s => s.phase === 'wobble' && s.ts < 0.05).every(s => s.r > 2.09));
  ok('during the wobble the distance swings below and above r0 and angular momentum stays 10 kg m^2/s', samples.some(s => s.phase === 'wobble' && s.r < 1.95) && samples.some(s => s.phase === 'wobble' && s.r > 2.05)
     && samples.filter(s => s.phase === 'wobble' && s.L !== null).every(s => Math.abs(s.L - 10) < 1e-9));
  ok('the reasoning appears in order: Ueff once a period is measured, the curvature, then the period', samples.filter(s => s.phase === 'orbit').every(s => s.lines === 0)
     && samples.filter(s => s.phase === 'wobble' && s.maxima >= 2).every(s => s.lines >= 1) && samples.filter(s => s.phase === 'compare').some(s => s.lines === 3));
  const tr = await E(() => PX.trace());
  ok('the r(t) trace is a steady oscillation around r0 with farthest points at r0(1 + dr)', tr.length > 100 && Math.max.apply(null, tr.map(x => x[1])) < 2.1 + 1e-9 && Math.min.apply(null, tr.map(x => x[1])) < 1.92);
  const end = samples[samples.length - 1];
  ok('measured: Tr = 2.522 s (Kepler, 1e-6), matched to option (A); the farthest point returns after 360 deg', end.measured && Math.abs(end.measured.T - kep(0.05)) / kep(0.05) < 1e-6 && end.measured.option === 'A' && Math.abs(end.measured.apsis - 360) < 0.5);
  ok('the run reveals the period, the formula and the option in the target and marks option (A) only', end.confirmed && (await p.innerText('#ansval')) === 'Tr = 2.522 s = 2πℓ³/(mk²) → (A)'
     && await E(() => [...document.querySelectorAll('#opts li.correct')].map(e => e.getAttribute('data-o')).join()) === 'A');
  ok('the narration gives the formula value, the small-nudge drift and the closed orbit', /2πℓ³\/\(mk²\) = 2\.513 s \(0\.3 % above it/.test(await p.textContent('#narr')) && /orbit closes/.test(await p.textContent('#narr')), await p.textContent('#narr'));
  ok('the target pulses as it is revealed', samples.some(s => s.pulse) || await E(() => document.getElementById('target').classList.contains('pulse')));
  await sleep(2200);
  ok('...and stops pulsing, the value kept', await E(() => !document.getElementById('target').classList.contains('pulse')) && (await p.innerText('#ansval')).indexOf('(A)') > 0);
  ok('after the run the What if… appears and the button offers RUN AGAIN', await E(() => !document.getElementById('wigroup').hidden) && /RUN AGAIN/.test(await p.textContent('#gobtn')));

  /* ------------------------------------------------ what if, the sliders */
  await p.click('#f25'); await sleep(200);
  ok('What if K/r^2.5: same circle (r0 = 2 m), Tr = 1.42 x the revolution, the farthest point advances about 149 deg - a rosette', await E(() => PX.state().view.n === 2.5 && Math.abs(PX.state().view.Tc - 2 * Math.PI * 1000 / 2500) < 1e-9 && Math.abs(PX.state().view.T / PX.state().view.Tc - Math.SQRT2) < 0.01 && Math.abs(PX.state().view.apsis - 149.2) < 2)
     && /rosette/.test(await p.textContent('#narr')) && await E(() => document.getElementById('f25').getAttribute('aria-pressed')) === 'true' && (await p.innerText('#ansval')).indexOf('(A)') > 0);
  await p.click('#f15'); await sleep(200);
  ok('What if K/r^1.5: Tr = 0.82 x the revolution', await E(() => Math.abs(PX.state().view.T / PX.state().view.Tc - 1 / Math.sqrt(1.5)) < 0.01));
  await p.click('#f20'); await sleep(200);
  ok('back to k/r^2: the orbit closes again and (A) fits', await E(() => PX.state().view.n === 2 && PX.state().view.answer === 'A' && Math.abs(PX.state().view.apsis - 360) < 0.5));
  await p.$eval('#in_l', el => { el.value = '11'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('l = 11: the orbit runs again; Tr scales as l^3 and still matches (A)', await E(() => PX.state().view.answer === 'A' && Math.abs(PX.state().view.Tc - 2 * Math.PI * 1331 / 2500) < 1e-9) && (await p.textContent('#out_l')) === '11.0 kg m² s⁻¹');
  await p.$eval('#in_k', el => { el.value = '45'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.$eval('#in_m', el => { el.value = '1.1'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('k = 45, m = 1.1: still (A), the period from the new values', await E(() => PX.state().view.answer === 'A' && Math.abs(PX.state().view.Tc - 2 * Math.PI * 1331 / (1.1 * 2025)) < 1e-9) && (await p.textContent('#out_k')) === '45 N m²' && (await p.textContent('#out_m')) === '1.10 kg');
  await p.$eval('#in_d', el => { el.value = '0.2'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('a large nudge (0.2 r0): the period drifts above the small-oscillation value and honestly matches no option', await E(() => PX.state().view.answer === null) && /no longer small/.test(await p.textContent('#narr')));
  await E(() => PX.set('l', 99)); ok('l is clamped to 11 (one orbit never takes more than 4.6 s of real time)', await E(() => PX.state().p.l) === 11);
  await E(() => PX.set('k', 'x')); ok('a non-number falls back to the default (k = 50)', await E(() => PX.state().p.k) === 50);

  /* ------------------------------------------------ real time: the stopwatch against the wall clock */
  await E(() => { PX.set('l', 10); PX.set('k', 50); PX.set('m', 1); PX.set('dr', 0.05); PX.set('n', 2); PX.speed(1); });
  await p.click('#replaybtn'); await sleep(200);
  const w0 = await E(() => [performance.now(), PX.state().clock]); await sleep(3000); const w1 = await E(() => [performance.now(), PX.state().clock]);
  const wall = (w1[0] - w0[0]) / 1000, watch = w1[1] - w0[1];
  ok('real time: over 3 s of wall-clock time the stopwatch advances the same (within 3 %)', Math.abs(watch / wall - 1) < 0.03, watch.toFixed(3) + ' s on the watch, ' + wall.toFixed(3) + ' s on the wall clock');

  /* ------------------------------------------------ pause, replay, reset */
  await E(() => { PX.set('l', 10); PX.set('m', 1); PX.set('dr', 0.05); });
  await p.click('#replaybtn'); await sleep(250);
  ok('REPLAY reruns on the slider values with the target back to its symbol', await E(() => PX.state().state === 'running' && PX.state().measured === null && PX.state().p.l === 10 && PX.state().p.n === 2)
     && (await p.innerText('#target')).replace(/\s+/g, ' ').trim() === SYM && await E(() => document.querySelectorAll('#opts li.correct').length) === 0);
  await sleep(900); await p.click('#gobtn'); const t0 = await E(() => PX.RUN.st); await sleep(500);
  ok('PAUSE freezes the run', await E(() => PX.RUN.st) === t0 && /RESUME/.test(await p.textContent('#gobtn')) && /^Paused/.test(await p.textContent('#narr')));
  await p.click('#gobtn'); await sleep(200);
  ok('RESUME carries on', await E(() => PX.state().state) === 'running');
  await p.click('#resetbtn'); await sleep(150);
  ok('RESET returns to the ready state on the default values: nothing measured, the target symbol only, What if hidden', await E(() => PX.state().state === 'setup' && PX.state().phase === 'ready' && PX.state().T === null
     && PX.state().p.l === 10 && PX.state().p.k === 50 && PX.state().p.m === 1 && PX.state().p.dr === 0.05 && PX.state().p.n === 2 && document.getElementById('wigroup').hidden) && /Ready/.test(await p.textContent('#narr')) && (await p.innerText('#ansval')) === '');
  await p.$eval('#in_l', el => { el.value = '9'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('a slider moved before START sets up the next run (r0 = l^2/(mk) = 1.62 m)', /1\.62 m from its centre/.test(await p.textContent('#narr')) && await E(() => PX.state().state) === 'setup');
  await p.click('#resetbtn'); await sleep(100);

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
  ok('reduced motion: one press runs every measurement and shows the answer at once, no blinking',
     rs.done && rs.measured && rs.measured.maxima >= 3 && rs.measured.option === 'A' && rs.confirmed && rs.phase === 'done'
     && await rp.evaluate(() => { const k = document.getElementById('target'); k.classList.add('pulse'); const a = getComputedStyle(k).animationName; k.classList.remove('pulse'); return a === 'none'; }) && re.length === 0, JSON.stringify(rs).slice(0, 200) + ' ' + re.join('|'));
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 2, Physics, Q.4',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 2' && e.paperNumber === 2 && e.subject === 'Physics' && e.questionNumber === 4);
  ok('status script_verified - automated pipeline, no human review', e && e.status === 'script_verified');
  ok('chapter Gravitation', e && e.chapter === 'Gravitation');
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
  const T = __dirname + '/apptest-p2phyq04';
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
    await a.fill('#q', 'orbit wobble'); await sleep(700);
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
