/* ADV-2026-P1-CHE-Q05 - the atom chamber: 2s and 2p energies of H and Li.

   Drives the finished page headlessly: the physics in the page, the optional
   inputs and their fallbacks, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q05.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q05';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q05/';
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
     !/ANS\s*=\s*["'][^"']*\(A\)|QTRUE\s*=\s*\[/.test(src) && /truthOf\(QE\)/.test(src));
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
  ok('the question is reproduced verbatim', /Q\.5 The 2s and the 2p orbital energies of hydrogen atom are E2s\(H\) and E2p\(H\), respectively\. The 2s and the 2p orbital energies of lithium atom are E2s\(Li\) and E2p\(Li\), respectively\. The correct option\(s\) about the orbital energies is\(are\)/.test(qt), qt.trim().slice(0, 90));
  const opts = (await p.textContent('#opts')).replace(/\s+/g, '');
  ok('the four printed options', opts === '(A)E2s(Li)<E2p(Li)(B)E2s(H)=E2p(H)(C)E2p(H)<E2s(Li)(D)E2s(H)>E2s(Li)', opts);

  /* ------------------------------------------------ the science in the page */
  const sci = await E(() => {
    const o = {}, q = PX.qe();
    o.E = q; o.truth = PX.qtrue();
    const M = PX.qmodel(); o.zeff = {}; o.inside = {}; o.pen = {};
    for (const k in M.s){ o.zeff[k] = M.s[k].zeff; o.inside[k] = M.s[k].inside; o.pen[k] = M.s[k].pen; }
    const run = D => PX.truthOf(PX.energies(PX.model(D))).join('');
    o.noCore = run({ Z: 3, nc: 0 }); o.be = run({ Z: 4, nc: 2 }); o.one = run({ Z: 3, nc: 1 });
    const nc0 = PX.energies(PX.model({ Z: 3, nc: 0 })); o.nc0 = [nc0.Li2s, nc0.Li2p];
    return o;
  });
  ok('the solver gives H 2s = H 2p = -13.6/4 = -3.401 eV', Math.abs(sci.E.H2s + 3.4014) < 2e-3 && Math.abs(sci.E.H2p - sci.E.H2s) < 1e-4, sci.E.H2s.toFixed(4) + ' / ' + sci.E.H2p.toFixed(4));
  ok('Li 2s = -4.76 eV, Li 2p = -3.43 eV (nucleus + 1s2 core)', Math.abs(sci.E.Li2s + 4.763) < 0.01 && Math.abs(sci.E.Li2p + 3.426) < 0.01);
  ok('Zeff: H 1.000, Li 2s 1.18, Li 2p 1.00', Math.abs(sci.zeff.H2s - 1) < 1e-3 && Math.abs(sci.zeff.Li2s - 1.183) < 0.01 && Math.abs(sci.zeff.Li2p - 1.004) < 0.01);
  ok('penetration: Li 2s is inside the core ~6x as often as Li 2p', sci.inside.Li2s > 5 * sci.inside.Li2p, (sci.inside.Li2s * 100).toFixed(1) + '% vs ' + (sci.inside.Li2p * 100).toFixed(1) + '%');
  ok('...and gets an extra pull of about -1.8 eV against -0.03 eV', sci.pen.Li2s < -1.5 && sci.pen.Li2p > -0.1);
  ok('the page finds (A), (B), (D) true at run time', sci.truth.join(',') === 'A,B,D' && await E(() => PX.answer()) === '(A), (B), (D)');
  ok('remove the core: 2s and 2p degenerate again, (A) false', sci.noCore === 'BD' && Math.abs(sci.nc0[0] - sci.nc0[1]) < 1e-3, sci.noCore);
  ok('Be+ and a one-electron core keep (A), (B), (D)', sci.be === 'ABD' && sci.one === 'ABD');

  /* ------------------------------------------------ before the run */
  ok('the header answer starts locked', (await p.textContent('#ansval')).trim() === 'Run the experiment');
  ok('the answer is shown nowhere before the run', !/OPTIONS \(A\)|ANSWER FOUND|True statements/.test(await E(() => document.body.innerText)));
  ok('the solution is locked', await E(() => document.getElementById('solbody').hidden && !document.getElementById('solgate').hidden));
  const vals = await E(() => ['Z', 'nc'].map(k => document.getElementById('in_' + k).value));
  ok('every input is pre-filled with the question value', vals.join(',') === '3,2', vals.join(','));
  ok('status reads USING QUESTION VALUES', /USING QUESTION VALUES/.test(await p.textContent('#status')));
  ok('START reads START EXPERIMENT', /START EXPERIMENT/.test(await p.textContent('#gobtn')));
  ok('guidance says to set values or use the defaults', /Set your values or use the question defaults/.test(await p.textContent('#guide')));

  /* ------------------------------------------------ optional input */
  await E(() => PX.typeField('Z', ''));
  ok('an empty box falls back to the question value', await E(() => PX.ST.Z) === 3 && /empty — using the question value 3/.test(await p.textContent('#fh_Z')));
  await E(() => PX.typeField('Z', 'abc'));
  ok('text is refused with the friendly message', /Please enter a valid positive value/.test(await p.textContent('#fh_Z')) && await E(() => PX.ST.Z) === 3);
  await E(() => PX.typeField('Z', '-2'));
  ok('a negative value is refused the same way', /Please enter a valid positive value/.test(await p.textContent('#fh_Z')));
  await E(() => PX.typeField('Z', '3.5'));
  ok('a fractional nuclear charge is refused', /whole number/.test(await p.textContent('#fh_Z')) && await E(() => PX.ST.Z) === 3);
  await E(() => { PX.typeField('Z', '2'); PX.typeField('nc', '2'); });
  ok('a core as big as the nucleus is refused, both fall back', /more protons than core electrons/.test(await p.textContent('#fh_nc')) && await E(() => PX.ST.Z === 3 && PX.ST.nc === 2));
  await E(() => { PX.typeField('Z', '3'); PX.typeField('nc', '0'); });
  ok('0 core electrons is allowed', await E(() => PX.ST.nc) === 0 && /USING CUSTOM VALUES/.test(await p.textContent('#status')));
  ok('START becomes RUN WITH CUSTOM VALUES', /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  await p.click('#fld_nc button.up');
  ok('the + stepper moves to the next value', await E(() => PX.ST.nc) === 1);
  await p.click('#resetq');
  ok('RESET TO QUESTION VALUES restores both', (await E(() => ['Z', 'nc'].map(k => document.getElementById('in_' + k).value))).join(',') === '3,2' && /USING QUESTION VALUES/.test(await p.textContent('#status')));
  await E(() => ['Z', 'nc'].forEach(k => { document.getElementById('in_' + k).value = ''; }));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('START works with every box empty, on the question values', await E(() => PX.RUN.state) === 'running' && await E(() => PX.RUN.D.Z === 3 && PX.RUN.D.nc === 2));
  ok('status: preparing experiment', /Preparing experiment/.test(await p.textContent('#xstattxt')));
  ok('inputs lock while it runs', await E(() => document.getElementById('in_Z').disabled));
  await sleep(2400);
  ok('the equation being solved is written up first', (await E(() => PX.calcKeys())).join(',') === 'rule', (await E(() => PX.calcKeys())).join(','));
  await sleep(1500);
  ok('the solver is homing in on H 2s', await E(() => { const s = PX.now(); return s.key === 'H2s' && s.name === 'solve'; }), JSON.stringify(await E(() => PX.now())));
  ok('status: experiment running', /Experiment running/.test(await p.textContent('#xstattxt')));
  ok('live data: the solver step and the trial energy', /\/ 14|converged/.test(await p.textContent('#g_step')) && /-?\d/.test(await p.textContent('#g_e')));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [];
  for (let i = 0; i < 400; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), inn: document.getElementById('g_in').textContent }));
    seen.add(s.st); live.push(s);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it solves, draws each cloud, fills the ladder, tests the options and calculates',
     ['solve', 'cloud', 'ladder', 'test', 'calc'].every(x => seen.has(x)), [...seen].join(','));
  ok('the live "inside the core" reading appears for lithium', live.some(s => s.now && s.now.key === 'Li2s' && s.now.name === 'cloud' && /\d/.test(s.inn)));
  ok('each option is tested in turn', ['A', 'B', 'C', 'D'].every(k => live.some(s => s.now && s.now.opt === k)));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('calculation lines appear in order', (await E(() => PX.calcKeys())).join(',') === 'rule,H2s,H2p,deg,Li2s,Li2p,pen,lit,optA,optB,optC,optD,match',
     (await E(() => PX.calcKeys())).join(','));
  ok('four orbitals solved and logged', Object.keys(await E(() => PX.meas())).join(',') === 'H2s,H2p,Li2s,Li2p' && await E(() => document.querySelectorAll('#log tbody tr').length) === 4);
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: degenerate H, penetration in Li, (C) false, answer', /degenerate/.test(cl) && /penetration/.test(cl) && /\(C\).*FALSE/.test(cl) && /True statements: \(A\), \(B\), \(D\)/.test(cl));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  ok('the radial graph has four curves and the core', await E(() => document.querySelectorAll('#rad path').length) === 5);
  ok('the Zeff chart has four bars', await E(() => document.querySelectorAll('#zbar rect').length) === 4);
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: CONGRATULATIONS, ANSWER FOUND, OPTIONS (A), (B), (D)', /CONGRATULATIONS/.test(rv) && /ANSWER FOUND/.test(rv) && /OPTIONS \(A\), \(B\), \(D\)/.test(rv), rv.slice(0, 80));
  ok('...with the energy order', /E₂ₛ\(Li\) < E₂ₚ\(Li\) < E₂ₛ\(H\) = E₂ₚ\(H\)/.test(rv));
  ok('the header unlocks to (A), (B), (D)', (await p.textContent('#ansval')).trim() === '(A), (B), (D)');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution unlocks with the answer and the page\'s own numbers', await E(() => !document.getElementById('solbody').hidden)
     && /\(A\), \(B\), \(D\)/.test(await p.textContent('#solans')) && /-4\.763/.test(await p.textContent('#solnums')));
  ok('the options are marked: A, B, D correct; C not', await E(() => ['A', 'B', 'D'].every(k => document.querySelector('#opts li[data-k="' + k + '"]').classList.contains('correct')) && document.querySelector('#opts li[data-k="C"]').classList.contains('wrong')));
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => Object.keys(PX.meas()).length) === 0);
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ a custom experiment: take the core away */
  await E(() => PX.typeField('nc', '0'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  ok('no core: Li2+ 2s and 2p come out equal, so only (B) and (D) are true', JSON.stringify(await E(() => PX.truth())) === '["B","D"]');
  const crv = await E(() => document.getElementById('revealhost').textContent);
  ok('...and the reveal says so, for the custom atom', /OPTIONS \(B\), \(D\)/.test(crv) && /your custom atom/.test(crv));
  ok('the header still answers the question itself', (await p.textContent('#ansval')).trim() === '(A), (B), (D)');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  ok('and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 19);
  await p.click('#classbtn');
  await p.click('#revealnow'); await sleep(100);
  ok('Reveal anyway opens the answer without the run', (await p.textContent('#ansval')).trim() === '(A), (B), (D)');
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
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.querySelector('#fld_Z button.up').getBoundingClientRect().height]);
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('touch-sized buttons at ' + w + ' px', tap[0] >= 34 && tap[1] >= 32, tap.map(Math.round).join('/'));
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await m.close();
  }
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.evaluate(() => { PX.speed(20); PX.start(); });
  for (let i = 0; i < 80 && !(await rp.evaluate(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1300);
  ok('reduced motion: complete answer, no animation', (await rp.textContent('#ansval')).trim() === '(A), (B), (D)'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; }) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.5',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 5);
  ok('chapter Atomic Structure', e && e.chapter === 'Atomic Structure');
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
  const T = __dirname + '/apptest-q05';
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
  await a.fill('#q', 'orbital energies'); await sleep(700);
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
