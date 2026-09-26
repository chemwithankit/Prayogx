/* ADV-2026-P1-CHE-Q04 - the lactone flasks and overlay bench (P, Q, R, S).

   Drives the finished page headlessly: the physics in the page, the optional
   inputs and their fallbacks, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q04.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q04';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q04/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');

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
  ok('no navigation markup of its own', !/rback|vback|#\/run\//.test(src));
  ok('ES5-safe script', !/=>|\b(let|const)\s+[A-Za-z_$][\w$]*\s*=|`|[\w\])]\?\.[A-Za-z_$]/.test(js));
  ok('the answer letter is not written into the page source',
     !/ANS\s*=\s*["']C["']|answer\s*:\s*["']C["']/.test(src) && /matchOption\(QRELS\)/.test(src));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('three sections: interactive experiment, detailed solution, how to use',
     /Interactive experiment/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [], reqs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  p.on('request', r => reqs.push(r.url()));
  await p.goto(URL); await sleep(700);
  const E = (f, a) => p.evaluate(f, a);

  ok('it loads with no request beyond the file itself', reqs.every(u => u.startsWith('file:')), reqs.length + ' requests');
  const qt = (await p.textContent('#question .qtext')).replace(/\s+/g, ' ');
  ok('the question is reproduced verbatim', /Q\.4 Considering LiBH4 reduces an ester group to the corresponding alcohol and does not reduce a carboxylic acid group, the correct statement about the major products P, Q, R and S is/.test(qt), qt.trim().slice(0, 90));
  ok('the printed scheme is drawn: two substrates, four arrows, P Q R S', await E(() => { const t = document.querySelector('#question svg.scheme').textContent; return ['P', 'Q', 'R', 'S', 'LiBH', 'BH', 'EtO', 'CO'].every(x => t.indexOf(x) >= 0) && document.querySelectorAll('#question svg.scheme polygon').length >= 6; }));
  const opts = (await p.textContent('#opts')).replace(/\s+/g, ' ').trim();
  ok('the four printed options', /\(A\) ?P & Q are identical, and R & S are diastereomers\. ?\(B\) ?P & Q are diastereomers, and R & S are identical\. ?\(C\) ?P & Q are diastereomers, and R & S are diastereomers\. ?\(D\) ?P & Q are identical, and R & S are identical\./.test(opts), opts.slice(0, 60));

  /* ------------------------------------------------ the science in the page */
  const sci = await E(() => {
    const M = PX.qmodel(), o = {};
    o.rels = PX.qrels();
    o.top = { o: M.pairs[0].R.o.rms, m: M.pairs[0].R.m.rms, c1: M.pairs[0].R.chiral1, c2: M.pairs[0].R.chiral2 };
    o.bot = { o: M.pairs[1].R.o.rms, m: M.pairs[1].R.m.rms, c1: M.pairs[1].R.chiral1, c2: M.pairs[1].R.chiral2 };
    o.selfP = PX.overlay(M.pairs[0].a, M.pairs[0].a).rms;
    o.mirR = PX.overlay(M.pairs[1].a, PX.mirrorMol(M.pairs[1].a)).rms;
    o.mirP = PX.overlay(M.pairs[0].a, PX.mirrorMol(M.pairs[0].a)).rms;
    o.Pring = M.pairs[0].a.P.bC[2]; o.Qring = M.pairs[0].b.P.bC[2]; o.Pco = M.pairs[0].a.P.aC[2]; o.Qco = M.pairs[0].b.P.aC[2];
    /* the least-squares fit recovers an arbitrary rotation exactly */
    const a = M.pairs[0].a, roles = Object.keys(a.P), th = 1.1, c = Math.cos(th), s = Math.sin(th), q = [0.3, -0.5, 0.8];
    const A = roles.map(k => a.P[k]), B = A.map(p => [c * p[0] - s * p[1] + q[0], s * p[0] + c * p[1] + q[1], p[2] + q[2]]);
    const B2 = B.map(p => { const x = p[0], z = p[2]; return [x * Math.cos(0.7) + z * Math.sin(0.7), p[1], -x * Math.sin(0.7) + z * Math.cos(0.7)]; });
    o.fit = PX.align(A, B2).rms;
    const run = D => { const X = PX.model(Object.assign({}, PX.Q, D)); const r = X.pairs.map(p => p.R.rel); return r.join(',') + '|' + PX.matchOption(r).join(''); };
    o.noTop = run({ tSite: 'none' }); o.noBot = run({ bSite: 'none' }); o.noBoth = run({ tSite: 'none', bSite: 'none' });
    o.hashTop = run({ tFace: 'h' }); o.swap = run({ tSite: 'opp', bSite: 'adj' });
    return o;
  });
  ok('the page classifies P & Q and R & S as diastereomers', sci.rels.join(',') === 'diastereomers,diastereomers');
  ok('the page picks (C) at run time', await E(() => PX.answer()) === 'C');
  ok('the least-squares fit recovers a rotated, shifted copy exactly', sci.fit < 1e-6, sci.fit.toExponential(1));
  ok('control: P lies exactly on itself', sci.selfP < 1e-6);
  ok('P on Q: no rotation makes them coincide', sci.top.o > 0.3, sci.top.o.toFixed(3) + ' A');
  ok('P on the mirror image of Q: no fit either - not enantiomers', sci.top.m > 0.3, sci.top.m.toFixed(3) + ' A');
  ok('P and Q are each chiral', sci.top.c1 && sci.top.c2 && sci.mirP > 0.3);
  ok('R on S: no fit, and the mirror does not help', sci.bot.o > 0.3 && sci.bot.m > 0.3, sci.bot.o.toFixed(3) + ' / ' + sci.bot.m.toFixed(3));
  ok('R lies exactly on its own mirror image - achiral, as is S', sci.mirR < 1e-6 && !sci.bot.c1 && !sci.bot.c2);
  ok('LiBH4 route: ring O from the wedge arm, C=O from the hash arm; BH3 the reverse',
     sci.Pring > 0 && sci.Pco < 0 && sci.Qring < 0 && sci.Qco > 0);
  ok('no CH3 on top: P & Q identical -> option (A)', sci.noTop === 'identical,diastereomers|A', sci.noTop);
  ok('no CH3 below: R & S identical -> option (B)', sci.noBot === 'diastereomers,identical|B', sci.noBot);
  ok('no CH3 on either: both identical -> option (D)', sci.noBoth === 'identical,identical|D', sci.noBoth);
  ok('the CH3 face or position does not change the answer', sci.hashTop === 'diastereomers,diastereomers|C' && sci.swap === 'diastereomers,diastereomers|C');

  /* ------------------------------------------------ before the run */
  ok('the header answer starts locked', (await p.textContent('#ansval')).trim() === 'Run the experiment');
  ok('the answer is shown nowhere before the run', !/OPTION \(C\)|ANSWER FOUND|printed option/.test(await E(() => document.body.innerText)));
  ok('the solution is locked', await E(() => document.getElementById('solbody').hidden && !document.getElementById('solgate').hidden));
  const KEYS = ['tSite', 'tFace', 'bSite', 'bFace'];
  const vals = await E(K => K.map(k => document.getElementById('in_' + k).value), KEYS);
  ok('every input is pre-set to the printed structures', vals.join(',') === 'adj,w,opp,w', vals.join(','));
  ok('status reads USING QUESTION VALUES', /USING QUESTION VALUES/.test(await p.textContent('#status')));
  ok('START reads START EXPERIMENT', /START EXPERIMENT/.test(await p.textContent('#gobtn')));
  ok('guidance says to set values or use the defaults', /Set your values or use the question defaults/.test(await p.textContent('#guide')));

  /* ------------------------------------------------ optional input */
  await p.selectOption('#in_tSite', 'none');
  ok('choosing a different structure flips the status to CUSTOM', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && await E(() => PX.ST.tSite) === 'none');
  ok('...notes the printed value beside it', /custom · printed: next to C1/.test(await p.textContent('#fh_tSite')));
  ok('...and only that value changes', await E(() => PX.ST.tFace === 'w' && PX.ST.bSite === 'opp' && PX.ST.bFace === 'w'));
  ok('START becomes RUN WITH CUSTOM VALUES', /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  await p.click('#fld_tSite button.rs');
  ok('the per-field reset restores the printed value', await E(() => PX.ST.tSite) === 'adj' && /as printed/.test(await p.textContent('#fh_tSite')));
  await p.selectOption('#in_bFace', 'h'); await p.selectOption('#in_bSite', 'adj');
  await p.click('#resetq');
  ok('RESET TO QUESTION VALUES restores all four',
     (await E(K => K.map(k => document.getElementById('in_' + k).value), KEYS)).join(',') === 'adj,w,opp,w' && /USING QUESTION VALUES/.test(await p.textContent('#status')));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('START runs on the printed structures', await E(() => PX.RUN.state) === 'running' && await E(() => { const D = PX.RUN.D; return D.tSite === 'adj' && D.bSite === 'opp'; }));
  ok('status: preparing experiment', /Preparing experiment/.test(await p.textContent('#xstattxt')));
  ok('inputs lock while it runs', await E(() => document.getElementById('in_tSite').disabled));
  await sleep(2500);
  ok('the reagent rules are written up first', (await E(() => PX.calcKeys())).join(',') === 'rules', (await E(() => PX.calcKeys())).join(','));
  await sleep(1600);
  ok('LiBH4 is at work on the top substrate', await E(() => { const s = PX.now(); return s.idx === 0 && (s.name === 'red1' || s.name === 'load'); }), JSON.stringify(await E(() => PX.now())));
  ok('status: experiment running', /Experiment running/.test(await p.textContent('#xstattxt')));
  ok('live data: the pair and the reagent', /P \/ Q/.test(await p.textContent('#g_pair')) && /LiBH|—/.test(await p.textContent('#g_reag')));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [];
  for (let i = 0; i < 400; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), rms: document.getElementById('g_rms').textContent }));
    seen.add(s.st); live.push(s);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it reduces, lactonises, overlays, mirrors, classifies and calculates',
     ['reduce', 'lactone', 'overlay', 'mirror', 'analyse', 'calc'].every(x => seen.has(x)), [...seen].join(','));
  const rmsSeen = live.filter(s => s.now && s.now.name === 'overlay' && s.now.idx === 0 && s.rms !== '—').map(s => parseFloat(s.rms));
  ok('the live RMSD falls as Q is turned onto P', rmsSeen.length >= 2 && rmsSeen[rmsSeen.length - 1] < rmsSeen[0], rmsSeen.map(x => x.toFixed(2)).join(' '));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('calculation lines appear in order', (await E(() => PX.calcKeys())).join(',') === 'rules,redtop,P,Q,topo,topm,redbot,R,S,boto,botm,ctrl,rels,match',
     (await E(() => PX.calcKeys())).join(','));
  const res = await E(() => { const r = PX.res(), o = {}; for (const k in r) o[k] = r[k].rms; return o; });
  ok('six overlay results: four comparisons and two controls', Object.keys(res).sort().join(',') === 'PQ,PmQ,RS,RmS,ctrl1,ctrl2', Object.keys(res).join(','));
  ok('the comparisons do not fit; the controls do', res.PQ > 0.3 && res.PmQ > 0.3 && res.RS > 0.3 && res.RmS > 0.3 && res.ctrl1 < 1e-6 && res.ctrl2 < 1e-6);
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up names both pairs and the option', /P & Q are diastereomers/.test(cl) && /R & S are diastereomers/.test(cl) && /printed option \(C\)/.test(cl));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  ok('the bar chart shows all six bars', await E(() => document.querySelectorAll('#bars rect').length) === 6);
  ok('the rotation graph has four curves', await E(() => document.querySelectorAll('#rot path').length) === 4);
  ok('the overlay log has four rows', await E(() => document.querySelectorAll('#log tbody tr').length) === 4);
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: CONGRATULATIONS, ANSWER FOUND, OPTION (C)', /CONGRATULATIONS/.test(rv) && /ANSWER FOUND/.test(rv) && /OPTION \(C\)/.test(rv), rv.slice(0, 70));
  ok('...with both verdicts', /P & Q: diastereomers · R & S: diastereomers/.test(rv));
  ok('the header unlocks to (C)', (await p.textContent('#ansval')).trim() === '(C)');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution unlocks with the answer', await E(() => !document.getElementById('solbody').hidden) && /\(C\)/.test(await p.textContent('#solans')));
  ok('the options are marked, (C) correct', await E(() => document.querySelector('#opts li[data-k="C"]').classList.contains('correct') && document.querySelectorAll('#opts li.wrong').length === 3));
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => Object.keys(PX.res()).length) === 0);
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ a custom experiment: take the top CH3 away */
  await p.selectOption('#in_tSite', 'none');
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  ok('no CH3 on top: the bench superimposes P and Q (RMSD 0)', await E(() => PX.res().PQ.rms) < 1e-6 && JSON.stringify(await E(() => PX.rels())) === '["identical","diastereomers"]');
  const crv = await E(() => document.getElementById('revealhost').textContent);
  ok('...and the reveal names the option that would then be right, (A)', /OPTION \(A\)/.test(crv) && /your custom structures/.test(crv));
  ok('the header still answers the question itself: (C)', (await p.textContent('#ansval')).trim() === '(C)');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  ok('and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 19);
  await p.click('#classbtn');
  await p.click('#revealnow'); await sleep(100);
  ok('Reveal anyway opens the answer without the run', (await p.textContent('#ansval')).trim() === '(C)');
  await p.click('#themebtn'); await sleep(150); await p.click('#themebtn'); await sleep(150);
  ok('every id is unique', await E(() => { const a = [...document.querySelectorAll('[id]')].map(e => e.id); return a.length === new Set(a).size; }));
  ok('every canvas and chart has an accessible label', await E(() => [...document.querySelectorAll('canvas, svg[role=img]')].every(e => (e.getAttribute('aria-label') || '').length > 10)));
  ok('the how-to section has all eight steps', await E(() => document.querySelectorAll('#howto .howto > div').length) === 8);
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
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_tSite').getBoundingClientRect().height]);
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('touch-sized controls at ' + w + ' px', tap[0] >= 34 && tap[1] >= 30, tap.map(Math.round).join('/'));
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    if (w === 390) await m.screenshot({ path: '/tmp/q03/phone4.png', fullPage: false });
    await m.close();
  }
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.evaluate(() => { PX.speed(20); PX.start(); });
  for (let i = 0; i < 80 && !(await rp.evaluate(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1300);
  ok('reduced motion: complete answer, no animation', (await rp.textContent('#ansval')).trim() === '(C)'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; }) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.4',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 4);
  ok('chapter Organic Chemistry - Some Basic Principles and Techniques', e && e.chapter === 'Organic Chemistry - Some Basic Principles and Techniques');
  ok('meta.json is the manifest entry', e && JSON.stringify(JSON.parse(fs.readFileSync(ROOT + '/' + REL + 'meta.json', 'utf8'))) === JSON.stringify(e));
  const cat = JSON.parse(fs.readFileSync(ROOT + '/content/catalog.json', 'utf8'));
  ok('the catalogue lists it at its revision', cat.revisions && cat.revisions[ID] === e.revision);
  const idx = JSON.parse(fs.readFileSync(ROOT + '/content/index.json', 'utf8'));
  ok('the card index carries it with its path', idx.simulations.some(s => s.id === ID && s.path === REL + 'index.html'));
  ok('its detail record, search text, crawlable page and sitemap entry exist', fs.existsSync(ROOT + '/content/sims/' + ID + '.json')
     && !!JSON.parse(fs.readFileSync(ROOT + '/content/search.json', 'utf8')).text[ID]
     && fs.existsSync(ROOT + '/s/' + ID + '/index.html') && fs.readFileSync(ROOT + '/sitemap.xml', 'utf8').includes('/s/' + ID + '/'));
  const lock = JSON.parse(fs.readFileSync(ROOT + '/data/revisions.json', 'utf8'));
  const sha = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex');
  ok('the revision lock records this exact file', lock[ID] && lock[ID].sha256 === sha && lock[ID].revision === e.revision);

  /* ------------------------------------------------ Android: real app shell, real feed */
  const net = require('net');
  const freePort = () => new Promise(res => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
  const PS = await freePort(), PA = await freePort();
  const site = spawn('python3', [__dirname + '/corsserve.py', String(PS), ROOT], { stdio: 'ignore' });
  const T = __dirname + '/apptest-q04';
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
  ok('the app finds the whole library in the feed', await a.evaluate(() => window.__prayogx.state().sims) === man.simulations.length, man.simulations.length);
  await a.fill('#q', 'lactone'); await sleep(700);
  const cardTxt = await a.evaluate(() => [...document.querySelectorAll('.simcard')].map(c => c.innerText).join(' | '));
  /* search can match more than one simulation as the library grows: open this one by its own title */
  const at = await a.evaluate(t => [...document.querySelectorAll('.simcard')].findIndex(c => c.innerText.indexOf(t[0]) >= 0 || c.innerText.indexOf(t[1]) >= 0), [e.title, e.shortTitle]);
  ok('app search finds its card', at >= 0, cardTxt.replace(/\s+/g, ' ').slice(0, 80));
  await a.locator('.simcard').nth(Math.max(0, at)).click(); await sleep(600);
  await a.click('#openbtn'); await sleep(2200);
  const inFrame = await a.evaluate(() => { const d = document.getElementById('frame').contentDocument; return d ? { id: (d.querySelector('meta[name=sim-id]') || {}).content, px: typeof d.defaultView.PX } : null; });
  ok('the app opens it from the feed', inFrame && inFrame.id === ID && inFrame.px === 'object', JSON.stringify(inFrame));
  ok('the banner is hidden while it is open', await a.evaluate(() => window.__ad.indexOf('hide') >= 0));
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
