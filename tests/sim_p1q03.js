/* ADV-2026-P1-CHE-Q03 - the dipole bench (BF3, NH4+, NF3, NH3).

   Drives the finished page headlessly: the physics in the page, the optional
   inputs and their fallbacks, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q03.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q03';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q03/';
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
     !/ANS\s*=\s*["']A["']|answer\s*:\s*["']A["']/.test(src) && /matchOption\(QGROUPS\)/.test(src));
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
  ok('the question is reproduced verbatim', /Q\.3 The correct order of dipole moments for the given species is/.test(qt), qt.trim());
  const opts = (await p.textContent('#opts')).replace(/\s+/g, '');
  ok('the four printed options', opts === '(A)BF3=NH4+<NF3<NH3(B)BF3<NH4+<NF3<NH3(C)NH4+<BF3<NH3<NF3(D)BF3<NH4+<NH3<NF3', opts);

  /* ------------------------------------------------ the science in the page */
  const sci = await E(() => {
    const M = PX.model(Object.assign({}, PX.Q)), o = {};
    for (const s of M.list) o[s.sp.k] = { mu: s.mu, mb: s.mb, sumBz: s.sumBz, tau: s.tau22, sum: s.sum, cosb: s.cosb };
    const W = PX.model(Object.assign({}, PX.Q, { xB: 1.0, xH: 2.9, L: 0.3, aH: 95 }));
    o.weird = { BF3: W.s.BF3.mu, NH4: W.s.NH4.mu };
    const Z = PX.model(Object.assign({}, PX.Q, { L: 0 }));
    o.noLP = PX.rankGroups({ BF3: Z.s.BF3.mu, NH4: Z.s.NH4.mu, NF3: Z.s.NF3.mu, NH3: Z.s.NH3.mu });
    return o;
  });
  ok('BF3: three B-F moments of 1.94 D sum to exactly 0', sci.BF3.mu === 0 && Math.abs(sci.BF3.mb - 1.94) < 1e-9);
  ok('NH4+: four N-H moments of 0.84 D sum to exactly 0', sci.NH4.mu === 0 && Math.abs(sci.NH4.mb - 0.84) < 1e-9);
  ok('...and both stay 0 whatever the electronegativities', sci.weird.BF3 === 0 && sci.weird.NH4 === 0);
  ok('NH3: bonds 0.938 D + lone pair 1.00 D = 1.938 D, the same way', Math.abs(sci.NH3.mu - 1.9376) < 1e-3 && sci.NH3.sumBz > 0, sci.NH3.mu.toFixed(4));
  ok('NF3: |1.00 - 1.244| = 0.244 D, bonds against the lone pair', Math.abs(sci.NF3.mu - 0.2444) < 1e-3 && sci.NF3.sumBz < 0, sci.NF3.mu.toFixed(4));
  ok('cos(beta) from the bond angle: 0.372 (107 deg), 0.441 (102 deg)', Math.abs(sci.NH3.cosb - 0.37205) < 1e-4 && Math.abs(sci.NF3.cosb - 0.44128) < 1e-4);
  ok('sideways parts cancel: the resultants lie on the axis', Math.abs(sci.NH3.sum[0]) < 1e-9 && Math.abs(sci.NH3.sum[1]) < 1e-9 && Math.abs(sci.NF3.sum[0]) < 1e-9);
  ok('peak torque = muE: NH3 6.463 x 10^-22 N m', Math.abs(sci.NH3.tau - 1.9376 * 3.33564) < 2e-3, sci.NH3.tau.toFixed(3));
  ok('the page orders them BF3 = NH4+ < NF3 < NH3', JSON.stringify(await E(() => PX.qgroups())) === '[["BF3","NH4"],["NF3"],["NH3"]]');
  ok('the page picks (A) at run time', await E(() => PX.answer()) === 'A');
  ok('with no lone pair it would order NH3 < NF3 - no printed option', JSON.stringify(sci.noLP) === '[["BF3","NH4"],["NH3"],["NF3"]]'
     && JSON.stringify(await E(g => PX.matchOption(g), sci.noLP)) === '[]');
  ok('(B) needs BF3 < NH4+: only a strict order would match it', JSON.stringify(await E(() => PX.matchOption([["BF3"], ["NH4"], ["NF3"], ["NH3"]]))) === '["B"]');

  /* ------------------------------------------------ before the run */
  ok('the header answer starts locked', (await p.textContent('#ansval')).trim() === 'Run the experiment');
  ok('the answer is shown nowhere before the run', !/OPTION \(A\)|ANSWER FOUND|printed option/.test(await E(() => document.body.innerText)));
  ok('the solution is locked', await E(() => document.getElementById('solbody').hidden && !document.getElementById('solgate').hidden));
  const KEYS = ['xH', 'xB', 'xN', 'xF', 'L', 'aH', 'aF'];
  const vals = await E(K => K.map(k => document.getElementById('in_' + k).value), KEYS);
  ok('every input is pre-filled with the standard value', vals.join(',') === '2.2,2.04,3.04,3.98,1,107,102', vals.join(','));
  ok('status reads USING QUESTION VALUES', /USING QUESTION VALUES/.test(await p.textContent('#status')));
  ok('START reads START EXPERIMENT', /START EXPERIMENT/.test(await p.textContent('#gobtn')));
  ok('guidance says to set values or use the defaults', /Set your values or use the question defaults/.test(await p.textContent('#guide')));

  /* ------------------------------------------------ optional input */
  await E(() => PX.typeField('L', ''));
  ok('an empty box falls back to the standard value', await E(() => PX.ST.L) === 1 && /empty — using the standard value 1/.test(await p.textContent('#fh_L')));
  await E(() => PX.typeField('xH', 'abc'));
  ok('text is refused with the friendly message', /Please enter a valid positive value/.test(await p.textContent('#fh_xH')) && await E(() => PX.ST.xH) === 2.2);
  await E(() => PX.typeField('aF', '-5'));
  ok('a negative value is refused the same way', /Please enter a valid positive value/.test(await p.textContent('#fh_aF')) && await E(() => PX.ST.aF) === 102);
  await E(() => PX.typeField('aH', '130'));
  ok('out-of-range values are refused', /between 90 and 119.5/.test(await p.textContent('#fh_aH')) && await E(() => PX.ST.aH) === 107);
  await E(() => { PX.typeField('xH', '2.2'); PX.typeField('aF', '102'); PX.typeField('aH', '107'); PX.typeField('L', '0'); });
  ok('a lone-pair moment of 0 is allowed (switch it off)', await E(() => PX.ST.L) === 0 && !/Please/.test(await p.textContent('#fh_L')));
  ok('changing one value flips the status to CUSTOM', /USING CUSTOM VALUES/.test(await p.textContent('#status')));
  ok('...and only that value changes', await E(() => PX.ST.xH === 2.2 && PX.ST.xN === 3.04 && PX.ST.aH === 107 && PX.ST.L === 0));
  ok('START becomes RUN WITH CUSTOM VALUES', /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  await p.click('#fld_L button.up');
  ok('the + stepper moves to the next round value', await E(() => PX.ST.L) === 0.1);
  await p.click('#resetq');
  ok('RESET TO QUESTION VALUES restores all seven',
     (await E(K => K.map(k => document.getElementById('in_' + k).value), KEYS)).join(',') === '2.2,2.04,3.04,3.98,1,107,102'
     && /USING QUESTION VALUES/.test(await p.textContent('#status')));
  await E(K => K.forEach(k => { document.getElementById('in_' + k).value = ''; }), KEYS);

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('START works with every box empty, on the standard values', await E(() => PX.RUN.state) === 'running'
     && await E(() => { const D = PX.RUN.D; return D.xH === 2.2 && D.xF === 3.98 && D.L === 1 && D.aH === 107 && D.aF === 102; }));
  ok('status: preparing experiment', /Preparing experiment/.test(await p.textContent('#xstattxt')));
  ok('inputs lock while it runs', await E(() => document.getElementById('in_L').disabled));
  await sleep(2600);
  ok('the bond-moment rule is written up first', (await E(() => PX.calcKeys())).join(',') === 'rule', (await E(() => PX.calcKeys())).join(','));
  await sleep(1800);
  ok('BF3 is built and its bond dipoles appear', await E(() => { const s = PX.now(); return s.key === 'BF3' && (s.name === 'bonds' || s.name === 'intro'); }), await E(() => PX.now().name));
  ok('status: experiment running', /Experiment running/.test(await p.textContent('#xstattxt')));
  ok('live data: species and bond moment', /BF₃/.test(await p.textContent('#g_sp')) && /1\.94/.test(await p.textContent('#g_mb')));
  /* let it run, faster, sampling what the bench does */
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), samp = [];
  for (let i = 0; i < 400; i++){
    const s = await E(() => { const n = PX.now(); return { st: PX.stage(), k: n.key, nm: n.name, tau: n.tau, th: n.th, E: n.E }; });
    seen.add(s.st); samp.push(s);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it builds, draws dipoles, adds, applies the field, ranks and calculates',
     ['build', 'dipoles', 'add', 'field', 'analyse', 'calc'].every(x => seen.has(x)), [...seen].join(','));
  const fld = k => samp.filter(s => s.k === k && s.nm === 'field' && s.E >= 1);
  ok('BF3 and NH4+ feel no torque in the field', fld('BF3').length > 2 && fld('NH4').length > 2 && fld('BF3').concat(fld('NH4')).every(s => s.tau === 0 && Math.abs(s.th) === 90));
  ok('NH3 twists: torque up to muE, and it swings toward the field', fld('NH3').length > 2 && Math.max(...fld('NH3').map(s => s.tau)) > 3 && fld('NH3').some(s => Math.abs(s.th) < 60),
     Math.max(...fld('NH3').map(s => s.tau)).toFixed(2));
  ok('NF3 twists far less than NH3', Math.max(...fld('NF3').map(s => s.tau)) < 0.9 && Math.max(...fld('NF3').map(s => s.tau)) > 0);
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  const meas = await E(() => { const m = PX.meas(), o = {}; for (const k in m) o[k] = { mu: m[k].mu, tau: m[k].tau22, vec: m[k].S.mu }; return o; });
  ok('four readings logged', Object.keys(meas).join(',') === 'BF3,NH4,NF3,NH3');
  ok('each reading mu = tau_max/E agrees with its vector sum', Object.values(meas).every(m => Math.abs(m.mu - m.vec) < 1e-9));
  ok('measured: 0, 0, 0.244, 1.938 D', meas.BF3.mu === 0 && meas.NH4.mu === 0 && Math.abs(meas.NF3.mu - 0.2444) < 1e-3 && Math.abs(meas.NH3.mu - 1.9376) < 1e-3);
  ok('the run ranks them BF3 = NH4+ < NF3 < NH3', JSON.stringify(await E(() => PX.groups())) === '[["BF3","NH4"],["NF3"],["NH3"]]');
  ok('calculation lines appear in order', (await E(() => PX.calcKeys())).join(',') === 'rule,BF3,NH4,NF3,tau,NH3,rank,lit,match',
     (await E(() => PX.calcKeys())).join(','));
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up shows each vector sum and the order', /μ = 0\.000 D/.test(cl) && /0\.244 D/.test(cl) && /1\.938 D/.test(cl) && /printed option \(A\)/.test(cl));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  ok('the bar chart lines the bars up with "=" and "<"', await E(() => { const t = document.getElementById('bars').textContent; return t.indexOf('=') >= 0 && (t.match(/</g) || []).length >= 2; }));
  ok('the torque graph has a curve per species', await E(() => document.querySelectorAll('#tq path').length) >= 5);
  ok('the measurement log has four rows', await E(() => document.querySelectorAll('#log tbody tr').length) === 4);
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: CONGRATULATIONS, ANSWER FOUND, OPTION (A)', /CONGRATULATIONS/.test(rv) && /ANSWER FOUND/.test(rv) && /OPTION \(A\)/.test(rv), rv.slice(0, 70));
  ok('...with the order itself', /BF₃ = NH₄⁺ < NF₃ < NH₃/.test(rv));
  ok('the header unlocks to (A)', (await p.textContent('#ansval')).trim() === '(A)');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution unlocks with the answer', await E(() => !document.getElementById('solbody').hidden) && /\(A\)/.test(await p.textContent('#solans')));
  ok('the solution quotes the page\'s own numbers', /1\.938 D/.test(await p.textContent('#solmodel')) && /0\.244 D/.test(await p.textContent('#solmodel')));
  ok('the options are marked, (A) correct', await E(() => document.querySelector('#opts li[data-k="A"]').classList.contains('correct') && document.querySelectorAll('#opts li.wrong').length === 3));
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => Object.keys(PX.meas()).length) === 0);
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ a custom experiment: switch the lone pair off */
  await E(() => PX.typeField('L', '0'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  ok('lone pair off: NF3 (1.244 D) overtakes NH3 (0.938 D)', JSON.stringify(await E(() => PX.groups())) === '[["BF3","NH4"],["NH3"],["NF3"]]');
  const crv = await E(() => document.getElementById('revealhost').textContent);
  ok('a custom order that is not printed is revealed as such', /NO OPTION MATCHES/.test(crv) && /NH₃ < NF₃/.test(crv) && !/OPTION \(/.test(crv));
  ok('the header still answers the question itself: (A)', (await p.textContent('#ansval')).trim() === '(A)');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  ok('and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 19);
  await p.click('#classbtn');
  await p.click('#revealnow'); await sleep(100);
  ok('Reveal anyway opens the answer without the run', (await p.textContent('#ansval')).trim() === '(A)');
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
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.querySelector('#fld_L button.up').getBoundingClientRect().height]);
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('touch-sized buttons at ' + w + ' px', tap[0] >= 34 && tap[1] >= 32, tap.map(Math.round).join('/'));
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    if (w === 390) await m.screenshot({ path: '/tmp/q03/phone.png', fullPage: false });
    await m.close();
  }
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.evaluate(() => { PX.speed(20); PX.start(); });
  for (let i = 0; i < 80 && !(await rp.evaluate(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1300);
  ok('reduced motion: complete answer, no animation', (await rp.textContent('#ansval')).trim() === '(A)'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; }) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.3',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 3);
  ok('chapter Chemical Bonding and Molecular Structure', e && e.chapter === 'Chemical Bonding and Molecular Structure');
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
  const T = __dirname + '/apptest-q03';
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
  await a.fill('#q', 'dipole moment'); await sleep(700);
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
