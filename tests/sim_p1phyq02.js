/* ADV-2026-P1-PHY-Q02 - the flux-exclusion resonance lab: a shorted coil inside an LC circuit's coil, the resonant frequency.

   Drives the finished page headlessly: the physics engine in the page, the
   optional conditions and their honest warnings, the input parsing, the automatic
   run from START to the reveal with no further clicks, what the bench measures,
   the option audit, replay, reset, custom runs, classroom mode, phone widths,
   reduced motion, the library and feed entries, and the real app shell
   discovering and opening it.

   Run:  node tests/sim_p1phyq02.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-PHY-Q02';
const REL = 'simulations/2026/paper-1/physics/adv-2026-p1-phy-q02/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const W = 2 / Math.sqrt(3);                           /* omega sqrt(LC) of option C, for comparison only */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

(async () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const js = src.slice(src.indexOf('<script>'));
  /* ------------------------------------------------ the file itself */
  ok('the page carries its permanent ID', src.includes('<meta name="sim-id" content="' + ID + '">'));
  ok('one self-contained file: no external script, stylesheet, font or fetch',
     !/<script[^>]+src=|<link[^>]+stylesheet|@import|fetch\(|XMLHttpRequest|https?:\/\/(?!www\.w3\.org)/.test(src));
  ok('nothing stored on the device', !/localStorage|sessionStorage|indexedDB/.test(src));
  ok('ES5-safe script', !/=>|\b(let|const)\s+[A-Za-z_$][\w$]*\s*=|`|[\w\])]\?\.[A-Za-z_$]/.test(js));
  ok('the answer is not written into the script: it is the printed option that matches the computed time',
     /var ANS = QRUN\.answer/.test(src) && /R\.answer = hits\.length === 1 && q \? hits\[0\]\.key/.test(js) && !/ANS\s*=\s*["']|answer\s*[:=]\s*["'][A-D]["']|1\.1547/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('sections: mission brief, interactive experiment, coupled-coil explorer, detailed solution, how to use',
     /Mission brief/.test(src) && /Interactive experiment/.test(src) && /Coupled-coil explorer/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));
  ok('the detailed solution has 3 drawn figures with unique marker ids, concept cards and key takeaways',
     (src.match(/<div class="sol-fig">/g) || []).length === 3 && ['sfb1', 'sfb2', 'qfa'].every(k => (src.match(new RegExp('id="' + k + '"', 'g')) || []).length === 1)
     && /Understand the concept/.test(src) && /Key takeaways/.test(src));

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
  ok('the question is reproduced verbatim', qt === 'Q.2 Consider a circuit consisting of a capacitor of capacitance C and a coil with N turns per unit length, cross sectional area S and length d, where d2 ≫ S. There is another coil of length d/2, cross sectional area S/2 and 2N turns per unit length completely inside the larger coil, as shown in the figure. The ends of this smaller coil are connected with each other by an insulated conducting wire. The self-inductance of the larger coil is L. Neglecting edge effects and all the Ohmic resistances, the resonant frequency of the circuit is:', qt.slice(0, 90));
  ok('the four options as printed', (await E(() => [...document.querySelectorAll('#opts li')].map(l => l.textContent.replace(/\s+/g, ' ').trim()).join(' | '))) === '(A)4/√(15 LC) | (B)6/√(5 LC) | (C)2/√(3 LC) | (D)√(2/(3 LC))');

  /* ------------------------------------------------ the physics in the page */
  const sci = await E(() => {
    const q = PX.qrun(), r = D => { const R = PX.run(D); return { a: R.answer, c: R.complete, w: R.w, L: R.Leff, ag: R.agree }; };
    return { ans: PX.answer(), w: q.w, wNum: q.wNum, L2: q.L2, M: q.M, Leff: q.Leff, LF: q.LeffField, Bin: q.Bin, i2: q.I2ratio, k2: q.k2, agree: q.agree,
      opts: q.options.map(o => o.ok).join(','), vals: q.options.map(o => o.val.toFixed(4)).join(','), imp: q.options.map(o => o.implied.toFixed(4)).join(','),
      open: r({ m: 2, a: 0.5, l: 0.5, mode: 'open' }), m4: r({ m: 4, a: 0.5, l: 0.5, mode: 'short' }), a1: r({ m: 2, a: 1, l: 0.5, mode: 'short' }), q14: r({ m: 3, a: 0.25, l: 1, mode: 'short' }) };
  });
  ok('the page computes option C at run time', sci.ans === 'C', sci.ans);
  ok('L2 = L and M = L/2 from the coils\' geometry; k^2 = 1/4', sci.L2 === 1 && sci.M === 0.5 && Math.abs(sci.k2 - 0.25) < 1e-12);
  ok('the shorted coil: I2 = -I1/2 and B = 0 inside it', sci.i2 === -0.5 && Math.abs(sci.Bin) < 1e-12);
  ok('L_eff = 3L/4 two ways: L1 - M^2/L2 and the field-energy integral', sci.Leff === 0.75 && Math.abs(sci.LF - 0.75) < 1e-12);
  ok('omega sqrt(LC) = 2/sqrt(3); the page integrating the circuit agrees', Math.abs(sci.w - W) < 1e-12 && sci.agree && Math.abs(sci.wNum - W) < 2e-4, sci.wNum);
  ok('options judged: only C; they imply L_eff = 15/16, 5/36, 3/4, 3/2 of L', sci.opts === 'false,false,true,false' && sci.imp === '0.9375,0.1389,0.7500,1.5000', sci.imp);
  ok('variants: open coil -> 1; 4N turns -> still 3L/4 (turns do not matter); full area -> L/2; a = 1/4, l = 1 -> 3L/4 - none the question',
     Math.abs(sci.open.w - 1) < 1e-12 && !sci.open.c && sci.m4.L === 0.75 && !sci.m4.c && sci.a1.L === 0.5 && Math.abs(sci.a1.w - Math.SQRT2) < 1e-12 && sci.q14.L === 0.75 && !sci.q14.c);

  /* ------------------------------------------------ layout v2: the answer is above the experiment from the start */
  const lay = await E(() => {
    const s = document.getElementById('ansstrip'), g = document.querySelector('.grid1'), d = document.getElementById('dock'), go = document.getElementById('gobtn');
    return { strip: !!s && s.getBoundingClientRect().bottom <= g.getBoundingClientRect().top + 1, dock: !!d && d.getBoundingClientRect().top >= g.getBoundingClientRect().bottom - 1 && d.contains(go),
      val: document.getElementById('ansstripv').textContent };
  });
  ok('the final answer is visible above the experiment screen from the start', lay.strip && lay.val === '(C)', lay.val);
  ok('START EXPERIMENT and the whole control bar sit below the experiment screen', lay.dock);
  ok('the header answer shows (C) before any run', (await p.textContent('#ansval')).trim() === '(C)');
  ok('the full solution is open (no gate)', await E(() => !document.getElementById('solbody').hidden && document.getElementById('solgate').hidden) && /2\/√\(3LC\)/.test(await p.textContent('#solbody')));
  ok('the unknowns start as ?', await E(() => ['A', 'B', 'R'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['m', 'a', 'l', 'mode'].map(k => document.getElementById('in_' + k).value));
  ok('every value is pre-set to the question', vals.join(',') === '2,0.5,0.5,short', vals.join(','));
  ok('status reads QUESTION VALUES LOADED', /QUESTION VALUES LOADED/.test(await p.textContent('#status')));

  /* ------------------------------------------------ optional conditions and input parsing */
  await E(() => PX.setField('a', '0.25'));
  ok('changing a value switches to USING CUSTOM VALUES', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  ok('...with an honest warning about the area S/2', /S\/2/.test(await p.textContent('#condwarn')));
  await E(() => PX.setField('mode', 'open'));
  ok('opening the inner coil is flagged too', /joined by a wire/.test(await p.textContent('#condwarn')));
  const parse = [];
  for (const v of ['', 'abc', '-5', '0', '1/4', '7']) { await E(x => PX.setField('a', x), v); parse.push(await E(() => [PX.ST.a, document.getElementById('fh_a').textContent])); }
  ok('bad inputs fall back with a message: empty, text, negative, zero -> 0.5; "1/4" is read as 0.25; 7 -> kept to 1',
     parse[0][0] === 0.5 && /empty/.test(parse[0][1]) && parse[1][0] === 0.5 && /not a number/.test(parse[1][1]) && parse[2][0] === 0.5 && /positive/.test(parse[2][1])
     && parse[3][0] === 0.5 && parse[4][0] === 0.25 && parse[5][0] === 1 && /kept/.test(parse[5][1]), JSON.stringify(parse));
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['m', 'a', 'l', 'mode'].map(k => document.getElementById('in_' + k).value))).join(',') === '2,0.5,0.5,short'
     && /QUESTION VALUES LOADED/.test(await p.textContent('#status')) && await E(() => document.getElementById('condwarn').hidden));
  await p.click('#fld_m button.up');
  ok('the + stepper raises the turns to 2.5N', await E(() => PX.ST.m) === 2.5);
  await p.click('#resetq');

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question values', await E(() => PX.RUN.state) === 'running' && await E(() => PX.RUN.D.a === 0.5 && PX.RUN.D.mode === 'short'));
  ok('values lock while it runs', await E(() => document.getElementById('in_a').disabled && document.getElementById('in_mode').disabled));
  ok('the answer strip narrates while it runs', /Wiring the circuit/.test(await p.textContent('#ansstrips')));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), samples = [], msgs = new Set();
  for (let i = 0; i < 900; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansstrips').textContent, L: PX.live(), closed: PX.RUN.closed,
      bi: document.getElementById('g_bi').textContent, le: document.getElementById('g_leff').textContent, w: document.getElementById('g_w').textContent, rt: document.querySelector('#u_R .v').textContent }));
    seen.add(s.st); samples.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all ten stages', ['load', 'field', 'inner', 'mutual', 'short', 'leff', 'osc', 'sweep', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer strip steps through every message', ['Wiring the circuit', 'Driving current through the coil', 'Measuring the inner coil', 'Linking the two coils', 'Closing the shorting switch', 'Weighing the field', 'Timing the oscillation', 'Sweeping the drive frequency', 'Auditing the options', 'Reading the resonance'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)), [...msgs].join(' / ').slice(0, 160));
  const before = samples.filter(s => !s.closed && s.now && ['field', 'inner', 'mutual'].indexOf(s.now.name) >= 0), after = samples.filter(s => s.closed);
  ok('before the switch closes: I2 = 0 and B is the same inside and out', before.length > 3 && before.every(s => s.L.I2 === 0 && s.L.Bin === s.L.Bout));
  ok('after it closes: I2 = -I1/2 and B = 0 in the core at every instant (live state)', after.length > 3 && after.every(s => Math.abs(s.L.I2 + s.L.I1 / 2) < 1e-12 && Math.abs(s.L.Bin) < 1e-12));
  /* the gauges refresh every 0.08 s, so read them only in stages well after the closure */
  ok('...and the B-inside gauge reads 0.00 from the L_eff stage on', after.filter(s => s.now && ['leff', 'osc', 'sweep'].indexOf(s.now.name) >= 0).every(s => /0\.00/.test(s.bi))
     && after.some(s => s.now && s.now.name === 'osc'));
  ok('the switch closes during the short stage', samples.some(s => s.now && s.now.name === 'short' && s.closed) && !samples.some(s => s.now && ['load', 'field', 'inner', 'mutual'].indexOf(s.now.name) >= 0 && s.closed));
  ok('L_eff reads 1.000 until the field is weighed, then 0.750', samples.some(s => s.now && s.now.name === 'mutual' && s.le === '1.000') && samples.some(s => s.now && s.now.name === 'osc' && s.le === '0.750'));
  ok('the frequency reads 1.0000 before the short and 1.1547 after', samples.some(s => s.now && s.now.name === 'field' && s.w === '1.0000') && samples.some(s => s.now && s.now.name === 'sweep' && s.w === '1.1547'));
  ok('the answer tile is unknown until the sweep', samples.some(s => s.now && s.now.name === 'osc' && s.rt === '?') && samples.some(s => s.now && s.now.name === 'test' && s.rt === '1.1547'));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'load,field,inner,mutual,short,leff,osc,sweep,a,b,c,d,match', (await E(() => PX.calcKeys())).join(','));
  ok('the case file: L2 = L, M = L/2 · 3L/4 · 1.1547', await E(() => ['A', 'B', 'R'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(' | ')) === 'L₂ = L · M = L/2 | 3L/4 | 1.1547');
  ok('the evidence table has one row per measured stage (4)', await E(() => document.querySelectorAll('#log tbody tr').length) === 4);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('audit: only C matches the bench', cards.A === false && cards.B === false && cards.C === true && cards.D === false, JSON.stringify(cards));
  ok('the audit names each mistake', await E(() => /squared/.test(PX.cards().A.ev) && /no flux argument/.test(PX.cards().B.ev) && /exactly the bench/.test(PX.cards().C.ev) && /L \+ M/.test(PX.cards().D.ev)));
  ok('option C is marked correct in the mission brief', await E(() => document.querySelector('#opts li[data-o="C"]').classList.contains('correct') && document.querySelectorAll('#opts li.wrong').length === 3));
  ok('all six badges are earned', await E(() => ['sol', 'mut', 'flux', 'leff', 'trap', 'mas'].every(k => PX.badges()[k])) && await E(() => document.querySelectorAll('.badge.on').length) === 6);
  ok('both charts are drawn from the model: 2 charge traces; 2 resonance curves and 4 option markers',
     await E(() => document.querySelectorAll('#curve path').length === 2 && document.querySelectorAll('#reso path').length === 2 && document.querySelectorAll('#reso line').length === 7));
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: L = μ₀N²S d, L₂ = L, M = L/2, I₂ = −I₁/2, L_eff = 3L/4, 1.1547, option C',
     /L = μ₀N²S d/.test(cl) && /L₂ = μ₀\(2N\)²\(S\/2\)\(d\/2\) = L/.test(cl) && /M = L\/2/.test(cl) && /I₂ = −\(M\/L₂\) I₁ = −I₁\/2/.test(cl) && /L_eff = 3L\/4/.test(cl) && /1\.1547/.test(cl) && /option C/.test(cl));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, OPTION (C), 2/√(3LC)', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /OPTION \(C\)/.test(rv) && /2\/√\(3LC\)/.test(rv), rv.slice(0, 80));
  ok('the header still reads (C)', (await p.textContent('#ansval')).trim() === '(C)');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(C)');
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));

  /* ------------------------------------------------ tools and the coupled-coil explorer */
  await p.click('#t_eq'); await p.click('#t_fld'); await sleep(150);
  ok('SHOW EQUATION and FIELD PARTICLES toggle', await E(() => document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_fld').getAttribute('aria-pressed') === 'false'));
  await p.click('#t_eq'); await p.click('#t_fld');
  await p.click('#t_cmp');
  ok('SLOW MOTION sets half speed', await E(() => PX.RUN.speed) === 0.5);
  await p.click('#t_cmp');
  const xL = () => E(() => { const m = document.getElementById('xinfo').innerHTML.match(/Effective inductance<\/th><td><b>([\d.]+) L/); return m && m[1]; });
  ok('explorer starts on the question coil: L_eff = 0.7500 L', (await xL()) === '0.7500');
  await E(() => { const s = document.getElementById('x_m'); s.value = 4; s.dispatchEvent(new Event('input')); });
  ok('4N turns: L2 and M change, L_eff stays 0.7500 L', (await xL()) === '0.7500' && /L₂ = m²·a·ℓ · L4\.0000 L/.test(await p.textContent('#xinfo')) && /M = m·a·ℓ · L1\.0000 L/.test(await p.textContent('#xinfo')));
  await E(() => { const s = document.getElementById('x_a'); s.value = 1; s.dispatchEvent(new Event('input')); });
  ok('full area: L_eff = 0.5000 L', (await xL()) === '0.5000');
  await p.click('#x_mode');
  ok('opened: L_eff = 1.0000 L', (await xL()) === '1.0000');
  await p.click('#x_reset'); await sleep(100);
  ok('explorer reset returns to the question coil', (await xL()) === '0.7500' && await E(() => PX.explorer.mode === 'short' && PX.explorer.m === 2));

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0 && await E(() => document.querySelector('#u_R .v').textContent) === '?' && await E(() => !PX.RUN.closed));
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si + '/' + PX.RUN.ph); await sleep(600);
  ok('Pause freezes the timeline and the circuit', await E(() => PX.RUN.u + '/' + PX.RUN.si + '/' + PX.RUN.ph) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ custom experiments */
  await E(() => PX.setField('a', '1'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const krv = await E(() => document.getElementById('revealhost').textContent);
  ok('full-area inner coil: L/2, ω√(LC) = 1.4142, reported as not the question', /SET-UP CHANGED/.test(krv) && /1\.4142/.test(krv) && !/ANSWER FOUND/.test(krv), krv.slice(0, 90));
  ok('...no option matches and the tile is flagged, not claimed', await E(() => ['A', 'B', 'C', 'D'].every(k => PX.cards()[k].v === false)) && await E(() => document.getElementById('u_R').classList.contains('warn')) && await E(() => !PX.badges().mas));
  await p.click('#resetq');
  await E(() => PX.setField('mode', 'open'));
  await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  ok('open inner coil: it changes nothing, ω√(LC) = 1, said plainly', /1\.0000/.test(await E(() => document.getElementById('revealhost').textContent)) && /changes nothing/.test(await p.textContent('#calclist')) && await E(() => !PX.RUN.closed));
  ok('the header still answers the question itself', (await p.textContent('#ansval')).trim() === '(C)' && (await p.textContent('#ansstripv')).trim() === '(C)');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  ok('and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 19);
  await p.click('#classbtn');
  await p.click('#themebtn'); await sleep(150); await p.click('#themebtn'); await sleep(150);
  ok('every id is unique', await E(() => { const a = [...document.querySelectorAll('[id]')].map(e => e.id); return a.length === new Set(a).size; }));
  ok('every canvas and chart has an accessible label', await E(() => [...document.querySelectorAll('canvas, svg[role=img]')].every(e => (e.getAttribute('aria-label') || '').length > 10)));
  ok('the how-to section has all eight steps', await E(() => document.querySelectorAll('#howto .howto > div').length) === 8);
  ok('the page says script-verified, never human-verified', /script-verified/.test(src) && !/human[- ]verified/i.test(src));
  ok('console clean on the desktop run', errs.length === 0, errs.slice(0, 2).join(' | '));

  /* ------------------------------------------------ phones */
  for (const w of [390, 360]){
    const m = await b.newPage({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
    const me = []; m.on('pageerror', e => me.push(e.message));
    await m.goto(URL); await sleep(400);
    const ov0 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await m.evaluate(() => { PX.speed(20); PX.start(); });
    for (let i = 0; i < 80 && !(await m.evaluate(() => PX.RUN.done)); i++) await sleep(250);
    await sleep(1300);
    const ov1 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_a').getBoundingClientRect().height, document.getElementById('x_reset').getBoundingClientRect().height, document.getElementById('in_mode').getBoundingClientRect().height]);
    await m.evaluate(() => { PX.replay(); PX.speed(1); }); await sleep(3200);
    const cap = await m.evaluate(() => { const c = document.getElementById('capm'); return { d: getComputedStyle(c).display, fs: parseFloat(getComputedStyle(c).fontSize), t: c.textContent }; });
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('touch-sized controls at ' + w + ' px', tap[0] >= 34 && tap[1] >= 32 && tap[2] >= 32 && tap[3] >= 32, tap.map(Math.round).join('/'));
    ok('the stage caption is repeated as readable text under the canvas at ' + w + ' px', cap.d === 'block' && cap.fs >= 13 && /Stage \d of 8/.test(cap.t) && cap.t.length > 60, cap.fs + 'px');
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await m.close();
  }
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.evaluate(() => { PX.speed(20); PX.start(); });
  for (let i = 0; i < 80 && !(await rp.evaluate(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1300);
  ok('reduced motion: complete answer, no animation, no confetti', (await rp.textContent('#ansval')).trim() === '(C)'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && await rp.evaluate(() => document.querySelectorAll('#revealhost rect[width="8"]').length === 0) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed (by its publication status) */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  const published = !!e && e.status !== 'draft';
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Physics, Q.2',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Physics' && e.questionNumber === 2);
  ok('status script_verified - automated pipeline, no human review', e && e.status === 'script_verified');
  ok('chapter Electromagnetic Induction', e && e.chapter === 'Electromagnetic Induction');
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
  const T = __dirname + '/apptest-p1phyq02';
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
    await a.fill('#q', 'inductance'); await sleep(700);
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
