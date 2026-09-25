/* ADV-2026-P1-CHE-Q01 - the two-step compression bench.

   Drives the finished page headlessly: the physics in the page, the optional
   inputs and their fallbacks, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q01.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q01';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q01/';
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
     !/ANS\s*=\s*["']B["']|answer\s*:\s*["']B["']/.test(src) && /matchOption\(QMIN\.W\)/.test(src));
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
  ok('the question is reproduced verbatim',
     /An ideal gas \(0\.5 mol\), initially at 2 bar pressure, is compressed at a constant temperature of 600 K in two steps/.test(qt)
     && /the minimum value of \|W\| \(in J\) is/.test(qt));
  ok('the four printed options', (await p.textContent('#opts')).replace(/\s+/g, '') === '(A)207R(B)600R(C)630R(D)900R');

  /* ------------------------------------------------ the physics in the page */
  const sci = await E(() => {
    const M = PX.model({ n: 0.5, T: 600, P1: 2, P2: 8 }), s = PX.searchMin(M), o = {};
    o.P = s.P; o.W = s.W; o.rev = M.WrevR; o.one = M.WoneR;
    o.m4 = M.measureR(4); o.m32 = M.measureR(3.2).W; o.m5 = M.measureR(5).W;
    o.V1 = M.V1; o.V2 = M.V2;
    o.lim2 = M.measureR(2.0000001).W; o.lim8 = M.measureR(7.9999999).W;
    return o;
  });
  ok('the page\'s own search finds the minimum at P = 4 bar', Math.abs(sci.P - 4) < 1e-5, sci.P.toFixed(6));
  ok('...where the measured work is 600R', Math.abs(sci.W - 600) < 1e-6, sci.W.toFixed(6));
  ok('...and the two steps cost the same, 300R each', Math.abs(sci.m4.w1 - 300) < 1e-9 && Math.abs(sci.m4.w2 - 300) < 1e-9);
  ok('volumes 12.47 L and 3.118 L', Math.abs(sci.V1 - 12.472) < 1e-3 && Math.abs(sci.V2 - 3.118) < 1e-3);
  ok('reversible limit 415.9R and one-step 900R', Math.abs(sci.rev - 415.888) < 1e-2 && Math.abs(sci.one - 900) < 1e-9);
  ok('(C) 630R is a two-step run at P = 3.2 or 5 bar', Math.abs(sci.m32 - 630) < 1e-6 && Math.abs(sci.m5 - 630) < 1e-6);
  ok('(D) 900R is the one-step limit at either end', Math.abs(sci.lim2 - 900) < 1e-3 && Math.abs(sci.lim8 - 900) < 1e-3);
  ok('the page picks (B) at run time', await E(() => PX.answer()) === 'B');
  ok('and would pick nothing for a value that is not printed', JSON.stringify(await E(() => PX.matchOption(415.9))) === '[]');
  ok('only (B) matches 600R', JSON.stringify(await E(() => PX.matchOption(600))) === '["B"]');

  /* ------------------------------------------------ before the run */
  ok('the header answer starts locked', (await p.textContent('#ansval')).trim() === 'Run the experiment');
  ok('the answer is shown nowhere before the run', !/OPTION \(B\)|600R J|ANSWER FOUND/.test(await E(() => document.body.innerText)));
  ok('the solution is locked', await E(() => document.getElementById('solbody').hidden && !document.getElementById('solgate').hidden));
  const vals = await E(() => ['n', 'T', 'P1', 'P2'].map(k => document.getElementById('in_' + k).value));
  ok('every input is pre-filled with the question value', vals.join(',') === '0.5,600,2,8', vals.join(','));
  ok('status reads USING QUESTION VALUES', /USING QUESTION VALUES/.test(await p.textContent('#status')));
  ok('START reads START EXPERIMENT', /START EXPERIMENT/.test(await p.textContent('#gobtn')));
  ok('guidance says to set values or use the defaults', /Set your values or use the question defaults/.test(await p.textContent('#guide')));

  /* ------------------------------------------------ optional input */
  await E(() => PX.typeField('T', ''));
  ok('an empty box falls back to the question value', await E(() => PX.ST.T) === 600 && /empty — using the question value 600/.test(await p.textContent('#fh_T')));
  await E(() => PX.typeField('n', 'abc'));
  ok('text is refused with the friendly message', /Please enter a valid positive value/.test(await p.textContent('#fh_n')) && await E(() => PX.ST.n) === 0.5);
  await E(() => PX.typeField('n', '-1'));
  ok('a negative value is refused the same way', /Please enter a valid positive value/.test(await p.textContent('#fh_n')) && await E(() => PX.ST.n) === 0.5);
  await E(() => PX.typeField('n', '0.5'));
  await E(() => PX.typeField('P2', '1.5'));
  ok('a "compression" to a lower pressure is refused and both pressures fall back',
     /must be above/.test(await p.textContent('#fh_P2')) && await E(() => PX.ST.P1 === 2 && PX.ST.P2 === 8));
  await E(() => PX.typeField('P2', '8'));
  await E(() => PX.typeField('T', '1/2'));
  ok('fractions are read, and out-of-range values refused', /between 100 and 2000/.test(await p.textContent('#fh_T')));
  await E(() => PX.typeField('T', '300'));
  ok('changing one value flips the status to CUSTOM', /USING CUSTOM VALUES/.test(await p.textContent('#status')));
  ok('...and only that value changes', await E(() => PX.ST.n === 0.5 && PX.ST.P1 === 2 && PX.ST.P2 === 8 && PX.ST.T === 300));
  ok('START becomes RUN WITH CUSTOM VALUES', /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  await p.click('#fld_n button.up');
  ok('the + stepper moves to the next round value', await E(() => PX.ST.n) === 0.75);
  await p.click('#resetq');
  ok('RESET TO QUESTION VALUES restores all four',
     (await E(() => ['n', 'T', 'P1', 'P2'].map(k => document.getElementById('in_' + k).value))).join(',') === '0.5,600,2,8'
     && /USING QUESTION VALUES/.test(await p.textContent('#status')));
  await E(() => ['n', 'T', 'P1', 'P2'].forEach(k => { document.getElementById('in_' + k).value = ''; }));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('START works with every box empty, on the question values', await E(() => PX.RUN.state) === 'running'
     && await E(() => { const D = PX.RUN.D; return D.n === 0.5 && D.T === 600 && D.P1 === 2 && D.P2 === 8; }));
  ok('status: preparing experiment', /Preparing experiment/.test(await p.textContent('#xstattxt')));
  ok('inputs lock while it runs', await E(() => document.getElementById('in_n').disabled));
  await sleep(3400);
  ok('the start volumes are written up', (await E(() => PX.calcKeys())).includes('vol'));
  /* the slow first run: watch the piston go down */
  const pts = [];
  for (let i = 0; i < 12; i++){ pts.push(await E(() => { const s = PX.now(); return { name: s.name, V: s.V, Pe: s.Pext, w: s.wL, P: s.P }; })); await sleep(350); }
  const s1 = pts.filter(x => x.name === 's1');
  ok('a weight lands and the piston goes down in step 1', s1.length >= 2 && s1[s1.length - 1].V < s1[0].V, s1.map(x => x.V.toFixed(2)).join(' '));
  ok('against a constant external pressure P', s1.length && s1.every(x => Math.abs(x.Pe - s1[0].P) < 1e-9));
  ok('the work grows as P_ext x volume swept', s1.every(x => Math.abs(x.w - x.Pe * (PX_V1(x) - x.V)) < 1e-6));
  function PX_V1(){ return 0.5 * 0.0831446 * 600 / 2; }
  ok('status: experiment running', /Experiment running/.test(await p.textContent('#xstattxt')));
  const gp = await E(() => parseFloat(document.getElementById('g_pg').textContent));
  ok('the live gas pressure has risen above 2 bar', gp > 2.05, gp);
  ok('molecules hit the piston (the live hit rate is counted)', await E(() => PX.hitRate()) > 0);
  await sleep(4200);
  ok('the first run is logged with w1 + w2 = W', await E(() => { const t = PX.trials()[0]; return t && Math.abs(t.w1 + t.w2 - t.W) < 1e-9; }));
  ok('its step-by-step calculation appears', (await E(() => PX.calcKeys())).join(',').includes('w1,w2'));
  const log1 = await E(() => PX.trials()[0]);
  ok('the slow demo run is at a P well inside the range', log1.P > 4.5 && log1.P < 7.5, log1.P.toFixed(3));
  /* let the rest run without touching anything, faster */
  await p.click('#spd button[data-s="2"]');
  let sawAnalyse = false, sawBest = false;
  for (let i = 0; i < 90; i++){
    const st = await E(() => PX.stage());
    if (st === 'analyse') sawAnalyse = true;
    if (st === 'best') sawBest = true;
    if (await E(() => PX.RUN.done)) break;
    await sleep(300);
  }
  ok('with no further clicks it sweeps P, analyses and runs the best P', sawAnalyse && sawBest);
  ok('seven sweep runs and one best run', await E(() => PX.trials().length) === 8 && await E(() => PX.trials().filter(t => t.best).length) === 1);
  ok('the sweep covers P1 < P < P2', await E(() => PX.trials().every(t => t.P > 2 && t.P < 8)));
  ok('the best run is the cheapest', await E(() => { const T = PX.trials(), b = T.find(t => t.best); return T.every(t => t.W >= b.W - 1e-9); }));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('calculation lines appear in order', (await E(() => PX.calcKeys())).join(',') === 'vol,w1,w2,sweep,probe,min,law,bestw1,equal,wmin,bounds,match',
     (await E(() => PX.calcKeys())).join(','));
  ok('the write-up ends at 600R J', /600R J/.test(await p.textContent('#calclist')) && /printed option \(B\)/.test(await p.textContent('#calclist')));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  ok('the W-P graph plots every run and the minimum', await E(() => document.querySelectorAll('#wp circle').length) >= 8 && /minimum 600\.0R at P = 4\.00 bar/.test(await p.textContent('#wp')));
  ok('the indicator diagram shows the reversible limit', /reversible: 415\.9R/.test(await p.textContent('#pv')));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: CONGRATULATIONS, ANSWER FOUND, OPTION (B)', /CONGRATULATIONS/.test(rv) && /ANSWER FOUND/.test(rv) && /OPTION \(B\)/.test(rv), rv.slice(0, 70));
  ok('...with the value and where it is reached', /600R J/.test(rv) && /P = 4 bar/.test(rv));
  ok('the header unlocks to (B)', (await p.textContent('#ansval')).trim() === '(B)');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution unlocks with the answer', await E(() => !document.getElementById('solbody').hidden) && /\(B\)/.test(await p.textContent('#solans')));
  ok('the options are marked, (B) correct', await E(() => document.querySelector('#opts li[data-k="B"]').classList.contains('correct') && document.querySelectorAll('#opts li.wrong').length === 3));
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));
  ok('the piston stays down with the full load after the run', await E(() => { const s = PX.now(); return s.name === 'rest' && Math.abs(s.Pext - 8) < 1e-9; }));

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.trials().length) === 0);
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ a custom experiment */
  await E(() => PX.typeField('P2', '18'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 60 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const cf = await E(() => PX.found());
  ok('custom P2 = 18 bar: the minimum moves to sqrt(2 x 18) = 6 bar', Math.abs(cf.P - 6) < 1e-4, cf.P.toFixed(4));
  ok('...and the work to 2nRT(3 - 1) = 1200R', Math.abs(cf.W - 1200) < 1e-4, cf.W.toFixed(3));
  const crv = await E(() => document.getElementById('revealhost').textContent);
  ok('a custom result is revealed as a number, not a printed option', /1200R J/.test(crv) && !/OPTION/.test(crv));
  ok('the header still answers the question itself: (B)', (await p.textContent('#ansval')).trim() === '(B)');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  ok('and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 19);
  await p.click('#classbtn');
  await p.click('#revealnow'); await sleep(100);
  ok('Reveal anyway opens the answer without the run', (await p.textContent('#ansval')).trim() === '(B)');
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
    for (let i = 0; i < 60 && !(await m.evaluate(() => PX.RUN.done)); i++) await sleep(250);
    await sleep(1300);
    const ov1 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.querySelector('#fld_n button.up').getBoundingClientRect().height]);
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('touch-sized buttons at ' + w + ' px', tap[0] >= 34 && tap[1] >= 32, tap.map(Math.round).join('/'));
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await m.close();
  }
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.evaluate(() => { PX.speed(20); PX.start(); });
  for (let i = 0; i < 60 && !(await rp.evaluate(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1300);
  ok('reduced motion: complete answer, no animation', (await rp.textContent('#ansval')).trim() === '(B)'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; }) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.1',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 1);
  ok('chapter Thermodynamics', e && e.chapter === 'Thermodynamics');
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
  const T = __dirname + '/apptest-q01';
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
  await a.fill('#q', 'isothermal compression'); await sleep(700);
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
