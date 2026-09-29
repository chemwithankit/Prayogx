/* ADV-2026-P1-PHY-Q01 - the rolling-ring bench: two rollers on a fixed disk, omega and 2 omega, when do they touch again?

   Drives the finished page headlessly: the physics engine in the page, the
   optional conditions and their honest warnings, the input parsing, the automatic
   run from START to the reveal with no further clicks, what the bench measures,
   the option audit, replay, reset, custom runs, classroom mode, phone widths,
   reduced motion, the library and feed entries, and the real app shell
   discovering and opening it.

   Run:  node tests/sim_p1phyq01.js                                          */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-PHY-Q01';
const REL = 'simulations/2026/paper-1/physics/adv-2026-p1-phy-q01/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
const WT = 51 * (2 * Math.PI - 4 / 51) / 3;          /* omega tau of option C, for comparison only */

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
     /var ANS = QRUN\.answer/.test(src) && /R\.answer = hits\.length === 1 && q \? hits\[0\]\.key/.test(js) && !/ANS\s*=\s*["']|answer\s*[:=]\s*["'][A-D]["']|105\.48/.test(js));
  ok('a marked engine the verifier can extract', /\/\* ENGINE-BEGIN \*\/[\s\S]+\/\* ENGINE-END \*\//.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('sections: mission brief, interactive experiment, coin-rotation explorer, detailed solution, how to use',
     /Mission brief/.test(src) && /Interactive experiment/.test(src) && /Coin-rotation explorer/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));
  ok('the detailed solution has 3 drawn figures with unique marker ids, concept cards and key takeaways',
     (src.match(/<div class="sol-fig">/g) || []).length === 3 && ['sfa1', 'sfa2', 'sfa3', 'qfa'].every(k => (src.match(new RegExp('id="' + k + '"', 'g')) || []).length === 1)
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
  ok('the question is reproduced verbatim', qt === 'Q.1 Consider a large disk of radius R and two smaller disks, each of radius r = R/50, lying on its circumference, as shown in the figure. The smaller disks are initially in contact with each other, with an angular separation Δθ between their centers. They are made to roll without slipping in opposite directions, with constant angular velocities ω and 2ω while the large disk is held stationary. The time τ at which the smaller disks are again in contact is: [Use sin(Δθ) = Δθ and ignore gravity.]', qt.slice(0, 90));
  ok('the four options as printed', (await E(() => [...document.querySelectorAll('#opts li')].map(l => l.textContent.replace(/\s+/g, ' ').trim()).join(' | '))) === '(A)τ = 51 × (2π − 4/51)/ω | (B)τ = 51 × (2π − 2/51)/3ω | (C)τ = 51 × (2π − 4/51)/3ω | (D)τ = 51 × (2π − 2/51)/ω');

  /* ------------------------------------------------ the physics in the page */
  const sci = await E(() => {
    const q = PX.qrun(), r = D => { const R = PX.run(D); return { a: R.answer, c: R.complete, t: R.tauW, p: R.possible, ag: R.agree }; };
    return { ans: PX.answer(), tauW: q.tauW, tauNum: q.tauNum, exactT: q.exactT, agree: q.agree, Om1: q.Om1, Om2: q.Om2, dth: q.dTheta, sweep: q.sweep, spl: q.spinsPerLap,
      s1: q.spins1, s2: q.spins2, opts: q.options.map(o => o.ok).join(','), vals: q.options.map(o => o.val.toFixed(2)).join(','), meet: q.meetDeg,
      k10: r({ k: 10, n1: 1, n2: 2, dir: 'opp', geo: 'small' }), eq: r({ k: 50, n1: 1, n2: 1, dir: 'opp', geo: 'small' }),
      same12: r({ k: 50, n1: 1, n2: 2, dir: 'same', geo: 'small' }), same31: r({ k: 50, n1: 3, n2: 1, dir: 'same', geo: 'small' }),
      ex: r({ k: 50, n1: 1, n2: 2, dir: 'opp', geo: 'exact' }) };
  });
  ok('the page computes option C at run time', sci.ans === 'C', sci.ans);
  ok('omega tau = 51(2 pi - 4/51)/3 = 105.48', Math.abs(sci.tauW - WT) < 1e-9, sci.tauW);
  ok('Omega1 = omega/51, Omega2 = 2 omega/51 (from v = omega r on the circle R + r)', Math.abs(sci.Om1 - 1 / 51) < 1e-12 && Math.abs(sci.Om2 - 2 / 51) < 1e-12);
  ok('dTheta = 2/51 rad and the sweep is 2 pi - 2 dTheta', Math.abs(sci.dth - 2 / 51) < 1e-12 && Math.abs(sci.sweep - (2 * Math.PI - 4 / 51)) < 1e-12);
  ok('two independent routes agree: the formula and the page stepping the rollers by the no-slip rule', sci.agree && Math.abs(sci.tauNum - sci.exactT) < 2e-3, sci.tauNum);
  ok('coin rotation: 51 spins per lap; roller 2 spins twice as often as roller 1', sci.spl === 51 && Math.abs(sci.s2 / sci.s1 - 2) < 1e-12);
  ok('options judged: only C matches; A 316.44, B 106.15, C 105.48, D 318.44', sci.opts === 'false,false,true,false' && sci.vals === '316.44,106.15,105.48,318.44', sci.vals);
  ok('they meet on the far side (about 175.7 deg, from 55 deg)', Math.abs(sci.meet - 175.75) < 0.05, sci.meet);
  ok('variants: R/r = 10 and equal speeds give their own times, flagged as not the question',
     Math.abs(sci.k10.t - 11 * (2 * Math.PI - 4 / 11) / 3) < 1e-9 && !sci.k10.c && Math.abs(sci.eq.t - 51 * (2 * Math.PI - 4 / 51) / 2) < 1e-9 && !sci.eq.c);
  ok('same direction: roller 2 faster never separates; roller 1 at 3 omega leads away and laps', !sci.same12.p && sci.same12.a === 'never' && Math.abs(sci.same31.t - 51 * (2 * Math.PI - 4 / 51) / 2) < 1e-9 && sci.same31.ag);
  ok('exact contact angle: a hair different, and honestly not the question', !sci.ex.c && Math.abs(sci.ex.t - WT) < 0.01);

  /* ------------------------------------------------ layout v2: the answer is above the experiment from the start */
  const lay = await E(() => {
    const s = document.getElementById('ansstrip'), g = document.querySelector('.grid1'), d = document.getElementById('dock'), go = document.getElementById('gobtn');
    return { strip: !!s && s.getBoundingClientRect().bottom <= g.getBoundingClientRect().top + 1, dock: !!d && d.getBoundingClientRect().top >= g.getBoundingClientRect().bottom - 1 && d.contains(go),
      val: document.getElementById('ansstripv').textContent };
  });
  ok('the final answer is visible above the experiment screen from the start', lay.strip && lay.val === '(C)', lay.val);
  ok('START EXPERIMENT and the whole control bar sit below the experiment screen', lay.dock);
  ok('the header answer shows (C) before any run', (await p.textContent('#ansval')).trim() === '(C)');
  ok('the full solution is open (no gate)', await E(() => !document.getElementById('solbody').hidden && document.getElementById('solgate').hidden) && /51 × \(2π − 4\/51\)\/3ω/.test(await p.textContent('#solbody')));
  ok('the unknowns start as ?', await E(() => ['A', 'B', 'R'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['k', 'n1', 'n2', 'dir', 'geo'].map(k => document.getElementById('in_' + k).value));
  ok('every value is pre-set to the question', vals.join(',') === '50,1,2,opp,small', vals.join(','));
  ok('status reads QUESTION VALUES LOADED', /QUESTION VALUES LOADED/.test(await p.textContent('#status')));

  /* ------------------------------------------------ optional conditions and input parsing */
  await E(() => PX.setField('k', '10'));
  ok('changing a value switches to USING CUSTOM VALUES', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  ok('...with an honest warning about r = R/50', /r = R\/50/.test(await p.textContent('#condwarn')));
  await E(() => PX.setField('dir', 'same'));
  ok('the direction is flagged too', /opposite directions/.test(await p.textContent('#condwarn')));
  await E(() => PX.setField('geo', 'exact'));
  ok('the exact contact angle is flagged as not the question\'s rule', /sin Δθ = Δθ/.test(await p.textContent('#condwarn')));
  const parse = [];
  for (const v of ['', 'abc', '-5', '0', '2.5', '99999']) { await E(x => PX.setField('k', x), v); parse.push(await E(() => [PX.ST.k, document.getElementById('fh_k').textContent])); }
  ok('bad inputs fall back with a message: empty, text, negative, zero -> 50; 2.5 -> rounded; huge -> kept to 500',
     parse[0][0] === 50 && /empty/.test(parse[0][1]) && parse[1][0] === 50 && /not a number/.test(parse[1][1]) && parse[2][0] === 50 && /positive/.test(parse[2][1])
     && parse[3][0] === 50 && parse[4][0] === 3 && /rounded/.test(parse[4][1]) && parse[5][0] === 500 && /kept/.test(parse[5][1]), JSON.stringify(parse));
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['k', 'n1', 'n2', 'dir', 'geo'].map(k => document.getElementById('in_' + k).value))).join(',') === '50,1,2,opp,small'
     && /QUESTION VALUES LOADED/.test(await p.textContent('#status')) && await E(() => document.getElementById('condwarn').hidden));
  await p.click('#fld_n2 button.up');
  ok('the + stepper raises roller 2 to 2.5 omega', await E(() => PX.ST.n2) === 2.5);
  await p.click('#resetq');

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question values', await E(() => PX.RUN.state) === 'running' && await E(() => PX.RUN.D.k === 50 && PX.RUN.D.n2 === 2));
  ok('values lock while it runs', await E(() => document.getElementById('in_k').disabled && document.getElementById('in_dir').disabled));
  ok('the answer strip narrates while it runs', /Setting the rollers in contact/.test(await p.textContent('#ansstrips')));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [], msgs = new Set();
  for (let i = 0; i < 900; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansstrips').textContent, t: document.getElementById('g_t').textContent, d: document.getElementById('g_d').textContent,
      s1: document.getElementById('g_s1').textContent, s2: document.getElementById('g_s2').textContent, p1: document.getElementById('g_p1').textContent, rt: document.querySelector('#u_R .v').textContent }));
    seen.add(s.st); live.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all nine stages', ['load', 'roll', 'centre', 'apart', 'lap', 'meet', 'formula', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer strip steps through every message', ['Setting the rollers in contact', 'Rolling without slipping', "Tracing the centres' circle", 'Rolling apart', 'Going the long way round', 'Waiting for contact', 'Writing the formula', 'Auditing the options', 'Reading the stopwatch'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)), [...msgs].join(' / ').slice(0, 160));
  const ts = live.filter(s => s.t !== '—').map(s => +s.t);
  ok('the stopwatch only runs forward and stops at 105.48', ts.every((v, i) => !i || v >= ts[i - 1] - 1e-9) && ts[ts.length - 1] === 105.48, ts[ts.length - 1]);
  ok('the centres start exactly 2r apart, separate, and are 2r apart again at the end',
     live.some(s => s.now && s.now.name === 'load' && s.d === '1.00') && live.some(s => +s.d > 50) && live[live.length - 1].d === '1.00');
  ok('roller 2 always shows twice the spins of roller 1', live.filter(s => s.s1 !== '—' && +s.s1 > 1).every(s => Math.abs(+s.s2 / +s.s1 - 2) < 0.02));
  ok('roller 1 ends 118.5 deg on (Omega1 tau)', live[live.length - 1].p1 === '118.5°', live[live.length - 1].p1);
  ok('the time is unknown until contact again', live.some(s => s.now && s.now.name === 'lap' && s.rt === '?') && live.some(s => s.now && s.now.name === 'formula' && s.rt === '105.48'));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'load,roll,centre,apart,lap,meet,formula,a,b,c,d,match', (await E(() => PX.calcKeys())).join(','));
  ok('the case file: 2/51 rad, 3ω/51, 105.48', await E(() => ['A', 'B', 'R'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(',')) === '2/51 rad,3ω/51,105.48');
  ok('the evidence table has one row per measured stage (6)', await E(() => document.querySelectorAll('#log tbody tr').length) === 6);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('audit: only C matches the bench', cards.A === false && cards.B === false && cards.C === true && cards.D === false, JSON.stringify(cards));
  ok('the audit names each mistake', await E(() => /Ω₁ \+ Ω₂/.test(PX.cards().A.ev) && /2π − 2Δθ/.test(PX.cards().B.ev) && /exactly the bench/.test(PX.cards().C.ev)));
  ok('option C is marked correct in the mission brief', await E(() => document.querySelector('#opts li[data-o="C"]').classList.contains('correct') && document.querySelectorAll('#opts li.wrong').length === 3));
  ok('all six badges are earned', await E(() => ['geo', 'roll', 'coin', 'rel', 'trap', 'mas'].every(k => PX.badges()[k])) && await E(() => document.querySelectorAll('.badge.on').length) === 6);
  ok('both charts are drawn from the model: 3 angle curves, 4 option bars', await E(() => document.querySelectorAll('#curve path').length === 3 && document.querySelectorAll('#bars rect').length === 4));
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: Δθ = 2/51, v = ωr, Ω₁ = ω/51, 51 spins, 3ω/51, 2π − 2Δθ, option C',
     /Δθ = 2\/51/.test(cl) && /ωr/.test(cl) && /Ω₁ = ω\/51/.test(cl) && /spins per lap = 51, not 50/.test(cl) && /3ω\/51/.test(cl) && /2π − 2Δθ/.test(cl) && /option C/.test(cl));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, OPTION (C), the stopwatch reading', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /OPTION \(C\)/.test(rv) && /105\.48/.test(rv), rv.slice(0, 80));
  ok('the header still reads (C)', (await p.textContent('#ansval')).trim() === '(C)');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === '(C)');
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));

  /* ------------------------------------------------ tools and the coin-rotation explorer */
  await p.click('#t_eq'); await p.click('#t_vec'); await sleep(150);
  ok('SHOW EQUATION and VELOCITY ARROWS toggle', await E(() => document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_vec').getAttribute('aria-pressed') === 'false'));
  await p.click('#t_eq'); await p.click('#t_vec');
  await p.click('#t_cmp');
  ok('SLOW MOTION sets half speed', await E(() => PX.RUN.speed) === 0.5);
  await p.click('#t_cmp');
  ok('explorer starts at R/r = 4: 5 spins per lap', /Spins per lap<\/th><td><b>5<\/b>/.test(await E(() => document.getElementById('xinfo').innerHTML)));
  await p.click('#x_q'); await sleep(100);
  ok('the question ratio R/r = 50: 51 spins per lap, not 50', /Spins per lap<\/th><td><b>51<\/b>/.test(await E(() => document.getElementById('xinfo').innerHTML)) && /Ω = ω\/51/.test(await p.textContent('#xinfo')));
  await E(() => { const s = document.getElementById('x_ang'); s.value = 180; s.dispatchEvent(new Event('input')); });
  ok('the roll slider stops auto-roll and sets the angle', await E(() => document.getElementById('x_auto').getAttribute('aria-pressed')) === 'false' && (await p.textContent('#x_angv')) === '180°');
  await p.click('#x_reset'); await sleep(100);
  ok('explorer reset returns to R/r = 4', await E(() => PX.explorer.k) === 4 && /Spins per lap<\/th><td><b>5<\/b>/.test(await E(() => document.getElementById('xinfo').innerHTML)));

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0 && await E(() => document.querySelector('#u_R .v').textContent) === '?');
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ custom experiments */
  await E(() => PX.setField('k', '10'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const krv = await E(() => document.getElementById('revealhost').textContent);
  ok('R/r = 10: its own time, reported as not the question', /SET-UP CHANGED/.test(krv) && /ωτ = 21\.71/.test(krv) && !/ANSWER FOUND/.test(krv), krv.slice(0, 90));
  ok('...no option matches and the time tile is flagged, not claimed', await E(() => ['A', 'B', 'C', 'D'].every(k => PX.cards()[k].v === false)) && await E(() => document.getElementById('u_R').classList.contains('warn')) && await E(() => !PX.badges().mas));
  await p.click('#resetq');
  await E(() => PX.setField('dir', 'same'));
  await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  ok('same direction with roller 2 faster: they never separate, said plainly', /never/.test(await E(() => document.getElementById('revealhost').textContent)) && /never separate/.test(await p.textContent('#calclist')));
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
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_k').getBoundingClientRect().height, document.getElementById('x_reset').getBoundingClientRect().height, document.getElementById('in_dir').getBoundingClientRect().height]);
    await m.evaluate(() => { PX.replay(); PX.speed(1); }); await sleep(3200);
    const cap = await m.evaluate(() => { const c = document.getElementById('capm'); return { d: getComputedStyle(c).display, fs: parseFloat(getComputedStyle(c).fontSize), t: c.textContent }; });
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('touch-sized controls at ' + w + ' px', tap[0] >= 34 && tap[1] >= 32 && tap[2] >= 32 && tap[3] >= 32, tap.map(Math.round).join('/'));
    ok('the stage caption is repeated as readable text under the canvas at ' + w + ' px', cap.d === 'block' && cap.fs >= 13 && /Stage \d of 7/.test(cap.t) && cap.t.length > 60, cap.fs + 'px');
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
  ok('question metadata: JEE Advanced 2026, Paper 1, Physics, Q.1',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Physics' && e.questionNumber === 1);
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
  const T = __dirname + '/apptest-p1phyq01';
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
    await a.fill('#q', 'rolling'); await sleep(700);
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
