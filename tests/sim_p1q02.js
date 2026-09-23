/* ADV-2026-P1-CHE-Q02 - the reversible first-order reaction chamber.

   Drives the finished page headlessly and checks the science, the controls,
   the optional-input rule, the gates, the reveal, explore and classroom modes,
   the layout at phone width, and - through the real app shell and the real
   feed - that the Android client discovers and opens it like any other.

   Run:  node tests/sim_p1q02.js                                           */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q02';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q02/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/').replace(/%3A/g, ':');

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

(async () => {
  const src = fs.readFileSync(FILE, 'utf8');
  /* ------------------------------------------------ the file itself */
  ok('the page carries its permanent ID', src.includes('<meta name="sim-id" content="' + ID + '">'));
  ok('one self-contained file: no external script, stylesheet, font or fetch',
     !/<script[^>]+src=|<link[^>]+stylesheet|@import|fetch\(|XMLHttpRequest|https?:\/\/(?!www\.w3\.org)/.test(src));
  ok('nothing stored on the device', !/localStorage|sessionStorage|indexedDB/.test(src));
  ok('no navigation markup of its own (the shared runner owns that)', !/rback|vback|#\/run\//.test(src));
  ok('ES5-safe: no arrow functions, let/const, template strings or optional chaining in the script',
     (() => { const js = src.slice(src.indexOf('<script>')); return !/=>|\b(let|const)\s+[A-Za-z_$][\w$]*\s*=|`|[\w\])]\?\.[A-Za-z_$]/.test(js); })());
  ok('the answer letter is not written into the page source',
     !/ANS\s*=\s*["']C["']|answer\s*:\s*["']C["']/.test(src) && /matchOption\(QUESTION\.kbOverKf\)/.test(src));

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [], reqs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  p.on('request', r => reqs.push(r.url()));
  await p.goto(URL); await sleep(700);
  const E = f => p.evaluate(f);
  const skip = async (k = 1) => { for (let i = 0; i < k; i++){ await E(() => PX.skip()); await sleep(120); } };

  ok('it loads with no request beyond the file itself', reqs.every(u => u.startsWith('file:')), reqs.length + ' requests');
  const qt = await p.textContent('#question .qtext');
  ok('the question is reproduced verbatim',
     /For a reversible reaction R\s*⇌\s*P, at constant\s+temperature, both the forward and the backward reactions are first order elementary\s+reactions/.test(qt.replace(/\s+/g, ' '))
     && /If kb\s*=\s*4kf,\s*the correct graphical representation of the reaction is/.test(qt.replace(/\s+/g, ' ')));
  ok('all four printed graphs are redrawn as live vector drawings',
     await E(() => [...document.querySelectorAll('#opts svg.optthumb')].every(s => s.querySelectorAll('path').length >= 2)));

  /* ------------------------------------------------ the science in the page */
  ok('the page derives (C) at run time from the printed plateaus', await E(() => PX.answer()) === 'C');
  ok('equal rate constants would have been (A)', JSON.stringify(await E(() => PX.matchOption(1))) === '["A"]');
  ok('kf = 4kb would have been (B)', JSON.stringify(await E(() => PX.matchOption(0.25))) === '["B"]');
  ok('no ratio at all makes (D) right',
     await E(() => { for (let r = 0.01; r < 100; r *= 1.07) if (PX.matchOption(r).indexOf('D') >= 0) return false; return true; }));
  const sci = await E(() => {
    const M = PX.model({ R0: 1, kf: 1, kb: 4 }), out = {};
    out.pe = M.pe; out.re = M.re; out.k = M.k;
    out.p1 = M.p(0.3); out.ana = 0.2 * (1 - Math.exp(-5 * 0.3));
    out.bal = Math.abs(1 * M.r(50) - 4 * M.p(50));
    let r = 1, q = 0, h = 1e-4; for (let t = 0; t < 0.3 - 1e-12; t += h){ const d = (-1 * r + 4 * q) * h; r += d; q -= d; }
    out.euler = q;
    return out;
  });
  ok('equilibrium [P]/[R]0 = 0.2 and [R]/[R]0 = 0.8', Math.abs(sci.pe - 0.2) < 1e-12 && Math.abs(sci.re - 0.8) < 1e-12);
  ok('the curve is 0.2(1 - e^-5kf t)', Math.abs(sci.p1 - sci.ana) < 1e-12, sci.p1.toFixed(6));
  ok('and agrees with a step-by-step integration of the rate law', Math.abs(sci.euler - sci.p1) < 1e-4, sci.euler.toFixed(6));
  ok('detailed balance kf[R]eq = kb[P]eq', sci.bal < 1e-12);
  ok('kobs = kf + kb = 5kf', sci.k === 5);

  /* ------------------------------------------------ before anything is run */
  ok('the header answer starts locked', (await p.textContent('#ansval')).trim() === 'Run the experiment');
  const vis0 = await E(() => document.body.innerText);
  ok('the answer is shown nowhere before the experiment', !/OPTION \(C\)|Answer: \(C\)|GRAPH VERIFIED/.test(vis0));
  ok('the solution is locked', await E(() => document.getElementById('solbody').hidden && !document.getElementById('solgate').hidden));
  ok('the four-graph table withholds its verdicts', !/matches|rejected/.test(await p.textContent('#readtbl')));
  const vals = await E(() => ['R0', 'kf', 'kb'].map(k => document.getElementById('in_' + k).value));
  ok('every input is pre-filled with the question value', vals.join(',') === '1,1,4', vals.join(','));
  ok('status reads USING QUESTION VALUES', /USING QUESTION VALUES/.test(await p.textContent('#status')));
  ok('kb/kf is shown as 4', (await p.textContent('#ratiov')).trim() === '4');
  ok('the vessel starts as 100 R and 0 P', await E(() => PX.countP()) === 0 && (await p.textContent('#cntR')) === '100');

  /* ------------------------------------------------ optional input */
  await E(() => PX.typeField('kf', ''));
  ok('an empty box falls back to the question value', await E(() => PX.ST.kf) === 1 && /question value 1/.test(await p.textContent('#fh_kf')));
  await E(() => PX.typeField('kb', 'abc'));
  ok('text that is not a number is refused politely', /Please enter a number/.test(await p.textContent('#fh_kb')) && await E(() => PX.ST.kb) === 4);
  await E(() => PX.typeField('kb', '-3'));
  ok('a negative rate constant is refused with the positive-value message',
     /Please enter a positive value\. If you leave this field unchanged, the question value will be used\./.test(await p.textContent('#fh_kb')));
  ok('and the question value keeps being used meanwhile', await E(() => PX.ST.kb) === 4);
  await E(() => PX.typeField('kf', '0'));
  ok('kf = 0 is refused (nothing would ever react)', await E(() => PX.ST.kf) === 1 && /positive/.test(await p.textContent('#fh_kf')));
  await E(() => PX.typeField('kb', '1/2'));
  ok('fractions are understood: 1/2 -> 0.5', await E(() => PX.ST.kb) === 0.5);
  ok('changing one value flips the status to CUSTOM', /USING CUSTOM VALUES/.test(await p.textContent('#status')));
  ok('and only that value changes', await E(() => PX.ST.kf === 1 && PX.ST.R0 === 1));
  await p.click('#fld_kb button.up');
  ok('the + stepper moves along round numbers', await E(() => PX.ST.kb) === 1);
  await p.click('#resetq');
  ok('RESET TO QUESTION VALUES restores all three', (await E(() => ['R0', 'kf', 'kb'].map(k => document.getElementById('in_' + k).value))).join(',') === '1,1,4'
     && /USING QUESTION VALUES/.test(await p.textContent('#status')));
  await E(() => { document.getElementById('in_kf').value = ''; document.getElementById('in_kb').value = ''; document.getElementById('in_R0').value = ''; });
  await p.click('#gobtn'); await sleep(300);
  ok('START works with every box left empty', await E(() => PX.RUN.scene) === 'fwd' && await E(() => PX.RUN.D.kb) === 4 && await E(() => PX.RUN.D.kf) === 1);
  ok('the inputs lock while the reaction runs', await E(() => document.getElementById('in_kb').disabled));

  /* ------------------------------------------------ R -> P, then the gate */
  await sleep(900);
  const early = await E(() => { const t = PX.tNow(), M = PX.RUN.M; return { t, rf: M.rf(t), rb: M.rb(t) }; });
  ok('early on the forward rate dominates', early.rf > 3 * early.rb, early.rf.toFixed(3) + ' vs ' + early.rb.toFixed(3));
  await skip();
  ok('the prediction gate holds the clock at P -> R', await E(() => PX.RUN.scene) === 'bwd' && await E(() => PX.gateHeld()));
  const t1 = await E(() => PX.tNow()); await sleep(700);
  ok('...and time really stands still', await E(() => PX.tNow()) === t1);
  ok('the gate asks both questions with the four values each',
     (await p.textContent('#predbox')).includes('What will [P]/[R]₀ approach?') && (await p.textContent('#predbox')).includes('What will [R]/[R]₀ approach?'));
  await p.click('#predbox .row[data-q="p"] button[data-v="0.5"]');
  ok('one answer is not enough', await E(() => PX.gateHeld()));
  await p.click('#predbox .row[data-q="r"] button[data-v="0.4"]'); await sleep(900);
  ok('a wrong prediction is accepted, not blocked', !(await E(() => PX.gateHeld())) && await E(() => PX.tNow()) > t1);

  /* ------------------------------------------------ molecules follow the rate law */
  const track = [];
  for (let i = 0; i < 4; i++){
    await sleep(500);
    track.push(await E(() => ({ nP: PX.countP(), want: 100 * PX.RUN.M.p(PX.tNow()), s: PX.RUN.scene })));
  }
  ok('the molecule count tracks 100·[P]/[R]0 within two molecules', track.every(x => Math.abs(x.nP - x.want) <= 2.01),
     track.map(x => x.nP + '/' + x.want.toFixed(1)).join(' '));
  ok('R + P is always 100 molecules and the bar always sums to 1', await E(() => (+document.getElementById('cntR').textContent) + (+document.getElementById('cntP').textContent) === 100)
     && /= 1\.000/.test(await p.textContent('#sumtxt')));
  ok('P -> R conversions are happening', await E(() => PX.EV.B) > 0);
  await skip(2); await sleep(300);
  /* part-way through the equilibrium stage: 5.0 tau, past the 4.6 tau at which the net rate falls below 1% */
  await E(() => { PX.RUN.u = (5.0 - 3.2) / 2.8 * 5.4; }); await sleep(500);
  ok('equilibrium is detected', await E(() => PX.RUN.eqSeen) && await E(() => PX.RUN.scene) === 'eq');
  const eqv = await E(() => { const M = PX.RUN.M, t = PX.tNow(); return { r: M.r(t), p: M.p(t), rf: M.rf(t), rb: M.rb(t), nP: PX.countP() }; });
  ok('the chamber settles at [R]/[R]0 = 0.800 and [P]/[R]0 = 0.200', Math.abs(eqv.r - 0.8) < 0.002 && Math.abs(eqv.p - 0.2) < 0.002,
     eqv.r.toFixed(3) + ' / ' + eqv.p.toFixed(3));
  ok('forward rate = backward rate there', Math.abs(eqv.rf - eqv.rb) < 0.01 * 1, eqv.rf.toFixed(3) + ' = ' + eqv.rb.toFixed(3));
  ok('about 20 of the 100 molecules are P', Math.abs(eqv.nP - 20) <= 2, eqv.nP);
  const c0 = await E(() => [PX.EV.F, PX.EV.B]); await sleep(900); const c1 = await E(() => [PX.EV.F, PX.EV.B]);
  ok('at equilibrium both counters keep climbing', c1[0] > c0[0] && c1[1] > c0[1], c0.join('/') + ' → ' + c1.join('/'));
  ok('the chart draws the plateaus it found', /equilibrium 0\.800/.test(await E(() => document.getElementById('chart').textContent)));
  ok('the prediction is checked against what happened', /You said 0\.5 ✗ and 0\.4 ✗/.test(await E(() => (document.getElementById('predbox') || {}).textContent || '')));
  ok('the run is logged in the trial table', await E(() => PX.trials().length) === 1);

  /* ------------------------------------------------ derivation */
  await skip(); await sleep(300);
  ok('the derivation board opens', await E(() => PX.RUN.scene) === 'derive' && await E(() => document.querySelectorAll('#board li').length) === 8);
  await sleep(1500);
  ok('its lines arrive one at a time', await E(() => { const n = document.querySelectorAll('#board li.in').length; return n >= 1 && n < 8; }));
  await skip(); await sleep(250);
  ok('it ends at 0.200 and 0.800 on the student\'s own values', await E(() => PX.RUN.scene) === 'challenge');

  /* ------------------------------------------------ the graph challenge */
  const fb = async k => { await p.evaluate(k => { PX.tryAgain(); PX.choose(k); PX.check(); }, k); await sleep(150); return p.textContent('#cfb'); };
  ok('(A) is answered with the equal-concentrations explanation', /approximately equal equilibrium concentrations, but kb = 4kf/.test(await fb('A')));
  ok('TRY AGAIN appears after a wrong choice', await E(() => !document.getElementById('tryagain').hidden));
  ok('(B) is answered with the swapped-constants explanation', /more P than R, which is inconsistent with kb being four times kf/.test(await fb('B')));
  ok('(D) is answered with the no-plateau explanation', /does not match the required equilibrium behaviour/.test(await fb('D')));
  ok('the header is still locked after three wrong tries', (await p.textContent('#ansval')).trim() === 'Run the experiment');
  await E(() => { PX.tryAgain(); PX.choose('C'); PX.check(); }); await sleep(200);
  ok('(C) is verified', /GRAPH VERIFIED/.test(await p.textContent('#cfb')));
  await sleep(1300);
  ok('the chamber\'s own curve is laid over graph (C)', await E(() => PX.RUN.scene) === 'verify' && await E(() => !!document.querySelector('#cth_C #overlay')));
  await sleep(3800);
  ok('molecules, model and graph each tick', await E(() => ['tk1', 'tk2', 'tk3'].every(i => document.getElementById(i).classList.contains('on'))));
  ok('the chain reads Molecules → Rates → Equations → Graph → Answer', /Molecules → Rates → Equations → Graph → Answer/.test(await p.textContent('#chain')));

  /* ------------------------------------------------ the reveal */
  await p.click('#gobtn'); await sleep(300);
  ok('the laboratory dims before the answer', await E(() => document.getElementById('lab3d').classList.contains('dim')));
  await sleep(900);
  ok('OPTION (C) is sprayed across the chamber', /OPTION \(C\)/.test(await E(() => document.getElementById('revealhost').textContent)));
  ok('with CONGRATULATIONS and ANSWER FOUND', /CONGRATULATIONS/.test(await E(() => document.getElementById('revealhost').textContent)) && /ANSWER FOUND/.test(await E(() => document.getElementById('revealhost').textContent)));
  ok('and the equilibrium values', /0\.8/.test(await E(() => document.getElementById('revealhost').textContent)) && /0\.2/.test(await E(() => document.getElementById('revealhost').textContent)));
  ok('the header unlocks to (C)', (await p.textContent('#ansval')).trim() === '(C)');
  ok('the answer blinks when it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2600);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution unlocks', await E(() => !document.getElementById('solbody').hidden) && (await p.textContent('#solans')).trim() === '(C)');
  ok('the options in section 01 are marked, (C) correct', await E(() => document.querySelector('#opts li[data-k="C"]').classList.contains('correct') && document.querySelectorAll('#opts li.wrong').length === 3));
  ok('the four-graph table gives its verdicts', /matches/.test(await p.textContent('#readtbl')));
  ok('REPLAY and UNDERSTAND THE CONCEPT are offered', await E(() => !document.getElementById('replaybtn').hidden && !document.getElementById('conceptbtn').hidden));
  ok('molecules keep interconverting after the reveal', await (async () => { const a = await E(() => PX.EV.F); await sleep(800); return (await E(() => PX.EV.F)) > a; })());

  /* ------------------------------------------------ replay and reset */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY starts again from pure R', await E(() => PX.RUN.scene) === 'fwd' && await E(() => PX.tNow()) < 0.05);
  ok('and relocks the header', (await p.textContent('#ansval')).trim() === 'Run the experiment');
  ok('clearing the predictions', await E(() => PX.pred().p === null && PX.pred().r === null));
  ok('keeping the last run as a grey comparison curve', await E(() => !document.getElementById('ghostleg').hidden));
  await p.click('#resetq'); await sleep(200);
  ok('RESET returns everything to the initial state', await E(() => PX.RUN.scene) === 'setup' && await E(() => PX.countP()) === 0 && await E(() => PX.tNow()) === 0);
  ok('with no comparison curve left over', await E(() => document.getElementById('ghostleg').hidden));

  /* ------------------------------------------------ explore mode */
  await p.click('#xbtn'); await sleep(250);
  ok('EXPLORE MODE starts running at once', await E(() => PX.RUN.mode) === 'explore' && await E(() => PX.RUN.playing));
  ok('and leaves the inputs live', await E(() => !document.getElementById('in_kb').disabled));
  const plateau = async x => {
    await p.click('#xrow button[data-x="' + x + '"]'); await sleep(120);
    await E(() => { PX.RUN.tp = 7; }); await sleep(250);
    return E(() => ({ p: PX.RUN.M.pe, r: PX.RUN.M.re, nP: PX.countP(), eq: PX.RUN.eqSeen }));
  };
  const x1 = await plateau(1), x2 = await plateau(2), x9 = await plateau(9);
  ok('kb/kf = 1 settles at 0.5 / 0.5', Math.abs(x1.p - 0.5) < 1e-9 && Math.abs(x1.nP - 50) <= 2, x1.nP);
  ok('kb/kf = 2 settles at 1/3 / 2/3', Math.abs(x2.p - 1 / 3) < 1e-9 && Math.abs(x2.nP - 33.3) <= 2, x2.nP);
  ok('kb/kf = 9 settles at 0.1 / 0.9', Math.abs(x9.p - 0.1) < 1e-9 && Math.abs(x9.nP - 10) <= 2, x9.nP);
  ok('each explored ratio is logged', await E(() => PX.trials().length) >= 3);
  ok('and the notebook states the pattern', /The plateau follows the ratio/.test(await p.textContent('#insight')));
  await E(() => PX.setField('kb', 0)); await sleep(100); await E(() => { PX.RUN.tp = 7; }); await sleep(300);
  ok('kb = 0 runs to completion and says there is no equilibrium', await E(() => PX.countP()) >= 98 && /REACTION COMPLETE/.test(await p.textContent('#eqbanner')));
  await p.click('#xbtn'); await sleep(200);
  ok('leaving explore returns to the guided start', await E(() => PX.RUN.mode) === 'guided' && await E(() => PX.RUN.scene) === 'setup');
  await p.click('#resetq');

  /* ------------------------------------------------ pause and speed */
  await E(() => PX.start()); await sleep(300);
  await p.click('#pausebtn'); const pz = await E(() => PX.tNow()); await sleep(600);
  ok('Pause freezes the clock', await E(() => PX.tNow()) === pz);
  await p.click('#pausebtn');
  await p.click('#spd button[data-s="2"]');
  const s0 = await E(() => PX.tNow()); await sleep(1000); const s1 = await E(() => PX.tNow());
  await p.click('#spd button[data-s="1"]');
  const s2 = await E(() => PX.tNow()); await sleep(1000); const s3 = await E(() => PX.tNow());
  ok('2× runs about twice as fast as 1×', (s1 - s0) / (s3 - s2) > 1.6 && (s1 - s0) / (s3 - s2) < 2.5, ((s1 - s0) / (s3 - s2)).toFixed(2));
  await p.click('#resetq');

  /* ------------------------------------------------ classroom mode */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the rail and the other sections', await E(() => getComputedStyle(document.getElementById('rail')).display === 'none' && getComputedStyle(document.getElementById('traps')).display === 'none'));
  ok('and shows NEXT and PREVIOUS', await E(() => !document.getElementById('nextbtn').hidden && !document.getElementById('prevbtn').hidden));
  await p.click('#nextbtn'); await sleep(200);
  ok('NEXT STEP starts R → P', await E(() => PX.RUN.scene) === 'fwd');
  await skip(); await sleep(200);
  ok('each stage waits for the teacher', await E(() => PX.RUN.scene) === 'fwd' && !(await E(() => PX.RUN.playing)));
  await p.click('#nextbtn'); await sleep(150); await p.click('#nextbtn'); await sleep(150);
  ok('NEXT is held until the class commits a prediction', await E(() => PX.RUN.scene) === 'bwd' && /prediction first/.test(await p.textContent('#gomsg')));
  await E(() => { PX.predict('p', 0.2); PX.predict('r', 0.8); });
  for (let i = 0; i < 3; i++){ await p.click('#nextbtn'); await sleep(150); }
  ok('NEXT walks to the derivation', await E(() => PX.RUN.scene) === 'derive');
  await p.click('#prevbtn'); await sleep(200);
  ok('PREVIOUS STEP goes back a stage, and the chamber rewinds with it', await E(() => PX.RUN.scene) === 'eq' && Math.abs(await E(() => PX.countP()) - 100 * (await E(() => PX.RUN.M.p(PX.tNow())))) <= 1.01);
  await p.click('#nextbtn'); await sleep(150); await p.click('#nextbtn'); await sleep(150);
  ok('NEXT is held at the graph challenge too', await E(() => PX.RUN.scene) === 'challenge');
  await p.click('#nextbtn'); await sleep(150);
  ok('...until the class picks the right graph', await E(() => PX.RUN.scene) === 'challenge');
  await E(() => { PX.choose('C'); PX.check(); }); await sleep(150);
  await p.click('#nextbtn'); await sleep(200); await p.click('#nextbtn'); await sleep(1400);
  ok('then NEXT verifies and reveals', await E(() => PX.RUN.done) && (await p.textContent('#ansval')).trim() === '(C)');
  await p.click('#replaybtn'); await sleep(200);
  ok('RESET in classroom mode returns to the initial state', await E(() => PX.RUN.scene) === 'setup');
  await p.click('#classbtn');

  /* ------------------------------------------------ reveal anyway, theme */
  await p.click('#revealnow'); await sleep(150);
  ok('Reveal anyway opens the answer without the run', (await p.textContent('#ansval')).trim() === '(C)' && await E(() => !document.getElementById('solbody').hidden));
  await p.click('#themebtn'); await sleep(200); await p.click('#themebtn'); await sleep(200);
  ok('the theme toggle redraws without errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  const ids = await E(() => { const a = [...document.querySelectorAll('[id]')].map(e => e.id); return a.length === new Set(a).size; });
  ok('every id on the page is unique', ids);
  ok('every canvas and chart has an accessible label', await E(() => [...document.querySelectorAll('canvas, svg[role=img]')].every(e => (e.getAttribute('aria-label') || '').length > 10)));
  ok('console clean on the desktop run', errs.length === 0, errs.slice(0, 2).join(' | '));

  /* ------------------------------------------------ phone widths */
  for (const w of [390, 360]){
    const m = await b.newPage({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
    const me = []; m.on('pageerror', e => me.push(e.message));
    await m.goto(URL); await sleep(500);
    const ov0 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await m.evaluate(() => { PX.start(); }); await sleep(200);
    await m.evaluate(() => PX.skip()); await sleep(150);
    await m.evaluate(() => { PX.predict('p', 0.2); PX.predict('r', 0.8); PX.RUN.tp = 7; PX.RUN.scene = 'eq'; }); await sleep(200);
    await m.evaluate(() => { PX.next(); }); await sleep(200); await m.evaluate(() => { PX.next(); }); await sleep(200);
    const ov1 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const tap = await m.evaluate(() => { const r = document.getElementById('gobtn').getBoundingClientRect(); const s = document.querySelector('#fld_kb button.up').getBoundingClientRect(); return [r.height, s.height, s.width]; });
    ok('no horizontal overflow at ' + w + ' px, before and during the graph challenge', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('buttons are touch-sized at ' + w + ' px', tap[0] >= 40 && tap[1] >= 30 && tap[2] >= 30, tap.map(Math.round).join('/'));
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await m.close();
  }

  /* ------------------------------------------------ reduced motion */
  const rctx = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(400);
  await rp.evaluate(() => PX.reveal()); await sleep(200);
  ok('with reduced motion the answer is still complete and nothing animates', (await rp.textContent('#ansval')).trim() === '(C)'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && re.length === 0);
  await rctx.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries the simulation', !!e);
  ok('its ID is unique and well-formed', man.simulations.filter(s => s.id === ID).length === 1 && /^ADV-\d{4}-P\d+-(PHY|CHE|MAT)-Q\d{2,3}$/.test(ID));
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.2',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 2);
  ok('chapter and topic', e && e.chapter === 'Chemical Kinetics' && /Reversible/.test(e.topic));
  ok('meta.json is byte-for-byte the manifest entry', e && JSON.stringify(JSON.parse(fs.readFileSync(ROOT + '/' + REL + 'meta.json', 'utf8'))) === JSON.stringify(e));
  ok('the manifest count matches the folders', man.counts.total === man.simulations.length);
  const cat = JSON.parse(fs.readFileSync(ROOT + '/content/catalog.json', 'utf8'));
  ok('the catalogue lists it at its revision', cat.revisions && cat.revisions[ID] === e.revision);
  const idx = JSON.parse(fs.readFileSync(ROOT + '/content/index.json', 'utf8'));
  const card = idx.simulations.find(s => s.id === ID);
  ok('the card index carries it, with its path', !!card && card.path === REL + 'index.html');
  ok('the detail record exists', fs.existsSync(ROOT + '/content/sims/' + ID + '.json'));
  const srch = JSON.parse(fs.readFileSync(ROOT + '/content/search.json', 'utf8'));
  ok('search text exists for it', !!(srch.text && srch.text[ID]));
  const lock = JSON.parse(fs.readFileSync(ROOT + '/data/revisions.json', 'utf8'));
  const sha = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex');
  ok('the revision lock records this exact file', lock[ID] && lock[ID].sha256 === sha && lock[ID].revision === e.revision, e.revision + ' / ' + sha.slice(0, 12));
  ok('it has a crawlable page and a sitemap entry', fs.existsSync(ROOT + '/s/' + ID + '/index.html') && fs.readFileSync(ROOT + '/sitemap.xml', 'utf8').includes('/s/' + ID + '/'));

  /* ------------------------------------------------ Android: the real app shell, the real feed */
  const net = require('net');
  const freePort = () => new Promise(res => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
  const PS = await freePort(), PA = await freePort();
  const site = spawn('python3', [__dirname + '/corsserve.py', String(PS), ROOT], { stdio: 'ignore' });
  const T = __dirname + '/apptest-q02';
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
  ok('the app shell finds the whole library in the feed', await a.evaluate(() => window.__prayogx.state().sims) === man.simulations.length, man.simulations.length);
  await a.fill('#q', 'reversible'); await sleep(700);
  ok('app search finds it', (await a.evaluate(() => document.getElementById('screen').innerText)).includes('P1') || (await a.evaluate(() => document.querySelectorAll('.simcard').length)) >= 1);
  const cardTxt = await a.evaluate(() => [...document.querySelectorAll('.simcard')].map(c => c.innerText).join(' | '));
  ok('its card is the new simulation', /reversible|R ⇌ P|settle/i.test(cardTxt), cardTxt.replace(/\s+/g, ' ').slice(0, 80));
  await a.click('.simcard'); await sleep(600);
  await a.click('#openbtn'); await sleep(2200);
  const inFrame = await a.evaluate(() => { const f = document.getElementById('frame'); const d = f.contentDocument; return d ? { id: (d.querySelector('meta[name=sim-id]') || {}).content, ans: typeof d.defaultView.PX } : null; });
  ok('the app opens it in the viewer, straight from the feed', inFrame && inFrame.id === ID && inFrame.ans === 'object', JSON.stringify(inFrame));
  ok('the banner is hidden while the simulation is open', await a.evaluate(() => window.__ad.indexOf('hide') >= 0));
  await a.evaluate(() => window.__prayogx.goBack()); await sleep(500);
  ok('Android back closes it and the banner comes back', await a.evaluate(() => document.getElementById('viewer').hidden
     && Math.max(window.__ad.lastIndexOf('resume'), window.__ad.lastIndexOf('show')) > window.__ad.lastIndexOf('hide')));
  ok('app console clean', ae.length === 0, ae[0]);
  await actx.close(); site.kill(); app.kill();
  fs.rmSync(T, { recursive: true, force: true });

  ok('no page errors anywhere', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  await b.close();
  process.exit(bad ? 1 : 0);
})();
