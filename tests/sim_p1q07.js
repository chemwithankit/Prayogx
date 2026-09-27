/* ADV-2026-P1-CHE-Q07 - Bartlett's electron-transfer lab: O2+[PtF6]-.

   Drives the finished page headlessly: the chemistry engine in the page, the
   optional reaction conditions and their honest warnings, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q07.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q07';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q07/';
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
     !/ANS\s*=\s*["'][^"']*\(A\)|QTRUE\s*=\s*\[/.test(src) && /QTRUE = QRUN\.truth/.test(src));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('sections: mission brief, interactive experiment, electron explorer, detailed solution, how to use',
     /Mission brief/.test(src) && /Interactive experiment/.test(src) && /Electron explorer/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));

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
  const qt = (await p.textContent('#question .qtext')).replace(/\s+/g, ' ').trim();
  ok('the question is reproduced verbatim', qt === 'Q.7 Reaction of PtF6 with oxygen (O2) gas results in the formation of an ionic compound, X+Y–. Correct statement(s) is(are)', qt);
  const opts = (await p.textContent('#opts')).replace(/\s+/g, '');
  ok('the four printed options', opts === '(A)ThebondorderofX+is1.5.(B)Valenced-orbitalsofthemetalioninX+Y–has5electrons.(C)PtF6actsasanoxidantinthisreaction.(D)PtF6actsasafluorinatingagentinthisreaction.', opts);

  /* ------------------------------------------------ the chemistry in the page */
  const sci = await E(() => {
    const o = {}, bo = (b, q) => PX.fillMO(PX.electronsOf(b, q)).bo;
    o.truth = PX.qtrue(); o.r = PX.qrun().r;
    o.series = [bo('O2', 2), bo('O2', 1), bo('O2', 0), bo('O2', -1), bo('O2', -2), bo('N2', 0), bo('NO', 1)];
    const x = PX.fillMO(PX.electronsOf('O2', 1)); o.x = [x.n, x.nb, x.na, x.unpaired];
    o.pt5 = PX.ptIon(5); o.pt6 = PX.ptIon(6);
    const r = D => { const R = PX.run(D); return { T: R.truth.join(''), c: R.complete, X: R.ids.X, ion: R.r.ionic }; };
    o.no = r({ gas: 'NO', ox: 'PtF6' }); o.n2 = r({ gas: 'N2', ox: 'PtF6' }); o.f2 = r({ gas: 'O2', ox: 'F2' });
    return o;
  });
  ok('the engine forms X+ = O2+ and Y- = [PtF6]-', sci.r.ionic && sci.r.X === 'O2+' && sci.r.Y === 'PtF6-');
  ok('MO filling in the page: O2+ has 15 e, 10 bonding, 5 antibonding, 1 unpaired', sci.x.join(',') === '15,10,5,1', sci.x.join(','));
  ok('bond orders: O2 2+ 3, O2+ 2.5, O2 2, O2- 1.5, O2 2- 1, N2 3, NO+ 3', sci.series.join(',') === '3,2.5,2,1.5,1,3,3', sci.series.join(','));
  ok('Pt(+5) is 5d5 (t2g5, 1 unpaired); Pt(+6) is 5d4', sci.pt5.d === 5 && sci.pt5.t2g === 5 && sci.pt5.unpaired === 1 && sci.pt6.d === 4);
  ok('the page finds (B), (C) at run time', sci.truth.join(',') === 'B,C' && await E(() => PX.answer()) === '(B), (C)');
  ok('NO instead of O2: NO+[PtF6]-, still (B), (C), but flagged as not the question', sci.no.ion && sci.no.X === 'NO+' && sci.no.T === 'BC' && !sci.no.c);
  ok('N2 instead: IE too high, no salt', !sci.n2.ion && sci.n2.T === '');
  ok('F2 instead of PtF6: no ionic compound', !sci.f2.ion && !sci.f2.c);

  /* ------------------------------------------------ before the run */
  ok('the header answer starts locked', /Investigating X⁺ and Y⁻/.test(await p.textContent('#ansval')) && await E(() => document.getElementById('answerbox').classList.contains('locked')));
  ok('the answer is shown nowhere before the run', !/CORRECT OPTIONS|ANSWER FOUND|Supported statements/.test(await E(() => document.body.innerText)));
  ok('the solution is locked', await E(() => document.getElementById('solbody').hidden && !document.getElementById('solgate').hidden));
  ok('the unknowns start as ?', await E(() => ['X', 'Y', 'P'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['gas', 'ox'].map(k => document.getElementById('in_' + k).value));
  ok('every condition is pre-set to the question', vals.join(',') === 'O2,PtF6', vals.join(','));
  ok('status reads QUESTION VALUES LOADED', /QUESTION VALUES LOADED/.test(await p.textContent('#status')));
  ok('START reads START EXPERIMENT', /START EXPERIMENT/.test(await p.textContent('#gobtn')));
  ok('guidance says to set values or use the defaults', /Set your values or use the question defaults/.test(await p.textContent('#guide')));

  /* ------------------------------------------------ optional conditions */
  await E(() => PX.setField('gas', 'NO'));
  ok('changing a condition switches to USING CUSTOM VALUES', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /RUN WITH CUSTOM VALUES/.test(await p.textContent('#gobtn')));
  ok('...with an honest warning that the question pathway changes', /passes <?b?>?O₂|passes O₂/.test(await p.textContent('#condwarn')) && await E(() => !document.getElementById('condwarn').hidden));
  await E(() => PX.setField('ox', 'F2'));
  ok('each changed condition adds its own warning', (await p.textContent('#condwarn')).split('⚠').length - 1 >= 2);
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['gas', 'ox'].map(k => document.getElementById('in_' + k).value))).join(',') === 'O2,PtF6'
     && /QUESTION VALUES LOADED/.test(await p.textContent('#status')) && await E(() => document.getElementById('condwarn').hidden));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question conditions', await E(() => PX.RUN.state) === 'running' && await E(() => PX.RUN.D.gas === 'O2' && PX.RUN.D.ox === 'PtF6'));
  ok('status: preparing experiment', /Preparing experiment/.test(await p.textContent('#xstattxt')));
  ok('conditions lock while it runs', await E(() => document.getElementById('in_gas').disabled));
  ok('the answer panel narrates: Mixing O₂ with PtF₆', /Mixing O₂ with PtF₆/.test(await p.textContent('#ansval')));
  await sleep(2600);
  ok('status: experiment running; IE of the gas shown', /Experiment running/.test(await p.textContent('#xstattxt')) && /12\.07 eV/.test(await p.textContent('#g_ie')));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [], msgs = new Set();
  for (let i = 0; i < 700; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansval').textContent, bo: document.getElementById('g_bo').textContent, d: document.getElementById('g_d').textContent, f: document.getElementById('g_f').textContent, x: document.querySelector('#u_X .v').textContent, prod: document.getElementById('g_prod').textContent }));
    seen.add(s.st); live.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all ten stages', ['mix', 'xfer', 'redox', 'mo', 'bo', 'pt', 'dorb', 'faud', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer panel steps through every investigation message', ['Mixing O₂', 'Identifying X⁺ and Y⁻', 'Tracking electrons', 'Building the MO diagram', 'Calculating bond order', 'Counting Pt d-electrons', 'Filling the d-orbitals', 'Auditing fluorine', 'Testing statements', 'Calculating final result'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)), [...msgs].join(' / ').slice(0, 160));
  ok('live data: the product O₂⁺[PtF₆]⁻ appears during mixing', live.some(s => s.now && s.now.name === 'mix' && /O₂⁺\[PtF₆\]⁻/.test(s.prod)));
  ok('live data: bond order 2.5, 5d⁵, F 6 / 0 are measured in turn', live.some(s => s.bo === '2.5') && live.some(s => s.d === '5d⁵') && live.some(s => s.f === '6 / 0'));
  ok('X⁺ is unknown until the electron has moved', live.some(s => s.now && s.now.name === 'mix' && s.x === '?') && live.some(s => s.now && s.now.name === 'redox' && s.x === 'O₂⁺'));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'r,x,c,mo,a,pt,b,d,board,match', (await E(() => PX.calcKeys())).join(','));
  ok('the case file: X⁺ = O₂⁺, Y⁻ = [PtF₆]⁻, Pt +6 → +5', await E(() => ['X', 'Y', 'P'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(',')) === 'O₂⁺,[PtF₆]⁻,+6 → +5'
     && await E(() => ['X', 'Y', 'P'].every(k => document.getElementById('u_' + k).classList.contains('found'))));
  ok('evidence table: two rows', await E(() => document.querySelectorAll('#log tbody tr').length) === 2);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('option board: A not, B supported, C supported, D not', cards.A === false && cards.B === true && cards.C === true && cards.D === false, JSON.stringify(cards));
  ok('the board cards are coloured by verdict', await E(() => document.getElementById('oc_A').classList.contains('no') && document.getElementById('oc_B').classList.contains('yes') && document.getElementById('oc_C').classList.contains('yes') && document.getElementById('oc_D').classList.contains('no')));
  ok('all six badges are earned', await E(() => ['det', 'red', 'mo', 'd', 'f', 'mas'].every(k => PX.badges()[k])) && await E(() => document.querySelectorAll('.badge.on').length) === 6);
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: O₂⁺, (10 − 5)/2 = 2.5, Pt +5 5d⁵, no F moved, answer', /X⁺ = O₂⁺/.test(cl) && /\(10 − 5\)\/2 = 2\.5/.test(cl) && /5d⁵/.test(cl) && /No fluorine is transferred/.test(cl) && /Supported statements: \(B\), \(C\)/.test(cl));
  ok('status: experiment complete', /Experiment complete/.test(await p.textContent('#xstattxt')));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, CORRECT OPTIONS (B), (C)', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /CORRECT OPTIONS/.test(rv) && /\(B\), \(C\)/.test(rv), rv.slice(0, 80));
  ok('...with X⁺, Y⁻ and the bond order', /X⁺ = O₂⁺/.test(rv) && /\[PtF₆\]⁻/.test(rv) && /BO = 2\.5/.test(rv));
  ok('the header unlocks to (B), (C)', (await p.textContent('#ansval')).trim() === '(B), (C)');
  ok('the answer blinks as it lands', await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution unlocks with the answer', await E(() => !document.getElementById('solbody').hidden) && /\(B\), \(C\)/.test(await p.textContent('#solans')) && /\(10 − 5\)\/2 = 2\.5/.test(await p.textContent('#solbody')));
  ok('the options are marked: B, C correct; A, D not', await E(() => ['B', 'C'].every(k => document.querySelector('#opts li[data-k="' + k + '"]').classList.contains('correct')) && ['A', 'D'].every(k => document.querySelector('#opts li[data-k="' + k + '"]').classList.contains('wrong'))));
  ok('REPLAY is offered', await E(() => !document.getElementById('replaybtn').hidden));

  /* ------------------------------------------------ tools and the electron explorer */
  await p.click('#t_eq'); await p.click('#t_why'); await sleep(150);
  ok('SHOW EQUATION and SHOW WHY? toggle', await E(() => document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_why').getAttribute('aria-pressed') === 'true'));
  await p.click('#t_eq'); await p.click('#t_why');
  await p.click('#t_cmp'); await sleep(150);
  ok('COMPARE O₂ vs O₂⁺ opens the explorer on O₂⁺ side by side with O₂', await E(() => PX.explorer.cmp && PX.explorer.m === 'O2' && PX.explorer.q === 1) && /2\.5/.test(await p.textContent('#xinfo')));
  await p.click('#x_plus'); await p.click('#x_plus'); await sleep(100);
  ok('adding electrons walks O₂⁺ → O₂ → O₂⁻: bond order 1.5', (await p.textContent('#x_species')) === 'O₂⁻' && /1\.5/.test(await p.textContent('#xinfo')));
  await p.click('.xpick button[data-m="N2"]'); await sleep(100);
  ok('N₂: 14 electrons, bond order 3.0, diamagnetic', /14/.test(await p.textContent('#xinfo')) && /3\.0/.test(await p.textContent('#xinfo')) && /diamagnetic/.test(await p.textContent('#xinfo')));
  await p.click('#p_plus'); await sleep(100);
  ok('platinum stepper: Pt(+6) has 5d⁴', /Pt\(\+6\)/.test(await p.textContent('#p_ox')) && /4 d-electrons/.test(await p.textContent('#pinfo')));
  await p.click('#p_minus'); await p.click('.xpick button[data-m="O2"]');

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0 && await E(() => document.querySelector('#u_X .v').textContent) === '?');
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn');
  await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ custom experiments */
  await E(() => PX.setField('gas', 'NO'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const nrv = await E(() => document.getElementById('revealhost').textContent);
  ok('NO run: NO⁺[PtF₆]⁻ with bond order 3.0, reported as not the question\'s reaction', /NO⁺\[PtF₆\]⁻/.test(nrv) && /3\.0/.test(nrv) && !/ANSWER FOUND/.test(nrv), nrv.slice(0, 60));
  await p.click('#resetq');
  await E(() => PX.setField('gas', 'N2'));
  await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const crv = await E(() => document.getElementById('revealhost').textContent);
  ok('N₂ run: the reveal says the reaction does not happen', /DOES NOT HAPPEN/.test(crv) && !/ANSWER FOUND/.test(crv), crv.slice(0, 60));
  ok('...X⁺ is flagged, not claimed', await E(() => document.getElementById('u_X').classList.contains('warn')) && await E(() => !PX.badges().mas));
  ok('the header still answers the question itself', (await p.textContent('#ansval')).trim() === '(B), (C)');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  ok('and enlarges the narration for a projector', await E(() => parseFloat(getComputedStyle(document.getElementById('narr')).fontSize)) >= 19);
  await p.click('#classbtn');
  await p.click('#revealnow'); await sleep(100);
  ok('Reveal anyway opens the answer without the run', (await p.textContent('#ansval')).trim() === '(B), (C)');
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
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_gas').getBoundingClientRect().height, document.getElementById('x_plus').getBoundingClientRect().height]);
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('touch-sized controls at ' + w + ' px', tap[0] >= 34 && tap[1] >= 32 && tap[2] >= 32, tap.map(Math.round).join('/'));
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await m.close();
  }
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.evaluate(() => { PX.speed(20); PX.start(); });
  for (let i = 0; i < 80 && !(await rp.evaluate(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1300);
  ok('reduced motion: complete answer, no animation, no confetti', (await rp.textContent('#ansval')).trim() === '(B), (C)'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && await rp.evaluate(() => document.querySelectorAll('#revealhost rect[width="8"]').length === 0) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.7',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 7);
  ok('chapter Chemical Bonding and Molecular Structure, topic Molecular orbital theory', e && e.chapter === 'Chemical Bonding and Molecular Structure' && e.topic === 'Molecular orbital theory');
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
  const T = __dirname + '/apptest-q07';
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
  await a.fill('#q', 'dioxygenyl'); await sleep(700);
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
