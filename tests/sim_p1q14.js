/* ADV-2026-P1-CHE-Q14 - the VSEPR shape lab: lone pairs counted, domains relaxed, shapes read from angles, tallied and matched.

   Drives the finished page headlessly: the chemistry engine in the page, the
   optional reaction conditions and their honest warnings, the automatic run from START to the reveal with
   no further clicks, what the run measures, the gates on the answer, replay,
   reset, custom values, classroom mode, phone widths, reduced motion, the
   library and feed entries, and the real app shell discovering and opening it.

   Run:  node tests/sim_p1q14.js                                            */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium, launch } = require('./_browser');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'ADV-2026-P1-CHE-Q14';
const REL = 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q14/';
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
  ok('the answer is not written into the script: it is computed at run time',
     /var ANS = QRUN\.answer/.test(src) && /answer = hits\.length === 1 \? hits\[0\]/.test(js) && !/ANS\s*=\s*["']|answer:\s*["'][A-D]["']|\bmap\s*=\s*\[2/.test(js));
  ok('no prediction stage anywhere', !/predict|guess the answer|what do you think/i.test(src.replace(/<script>[\s\S]*<\/script>/, '')));
  ok('sections: mission brief, interactive experiment, VSEPR builder, detailed solution, how to use',
     /Mission brief/.test(src) && /Interactive experiment/.test(src) && /VSEPR builder/.test(src) && /Detailed solution/.test(src) && /How to use this simulation/.test(src));
  ok('the detailed solution counts all eight species, draws the shapes and tests every option',
     (src.match(/<tr><td>(SOCl₂|XeOF₄|ClF₃|ClF₅|XeF₅⁺|SO₃²⁻|XeF₃⁺|SF₄)<\/td>/g) || []).length === 8 && /SF₄ — see-saw/.test(src) && /ClF₃ — T-shaped/.test(src) && /rejected/.test(src));

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
  ok('the question is reproduced verbatim', qt.indexOf('Q.14 Consider the following species: SOCl2, XeOF4, ClF3, ClF5, XeF5+, SO32–, XeF3+, SF4 List-I contains different molecular shapes and List-II contains total number of species with the same molecular shapes from the given species. Match each entry in List-I with the appropriate entry in List-II and choose the correct option.') === 0, qt.slice(0, 120));
  ok('List-I, List-II and all four options as printed', ['(P) See-saw', '(Q) T-Shaped', '(R) Trigonal Planar', '(S) Square Pyramidal', '(1) one', '(2) two', '(3) three', '(4) four', '(5) zero',
     'P → 1; Q → 2; R → 5; S → 3', 'P → 5; Q → 4; R → 2; S → 3', 'P → 3; Q → 2; R → 1; S → 4', 'P → 1; Q → 3; R → 5; S → 4'].every(t => qt.indexOf(t) >= 0));

  /* ------------------------------------------------ the VSEPR engine in the page */
  const sci = await E(() => {
    const o = {}, q = PX.qrun();
    o.ans = PX.answer(); o.map = q.map.join(','); o.counts = q.counts.join(','); o.hits = q.hits.join(',');
    o.lp = q.sp.map(s => s.e.lp).join(','); o.sn = q.sp.map(s => s.e.sn).join(','); o.shapes = q.sp.map(s => s.shape).join('|');
    o.clf3 = Math.min.apply(null, q.sp[2].angles); o.sf4 = q.sp[7].tried.length;
    o.aud = ['A', 'B', 'C', 'D'].map(k => q.audit[k].v).join(',');
    const r = D => { const R = PX.run(D); return { m: R.map.join(','), a: R.answer, c: R.complete, sh: R.sp.map(s => s.shape).slice(5).join('|') }; };
    o.so3 = r({ s6: 'SO3', s7: 'XeF3+', s8: 'SF4' }); o.xef4 = r({ s6: 'SO3-2', s7: 'XeF4', s8: 'SF4' }); o.sf6 = r({ s6: 'SO3-2', s7: 'XeF3+', s8: 'SF6' });
    return o;
  });
  ok('the page finds option A at run time', sci.ans === 'A' && sci.hits === 'A', sci.ans);
  ok('lone pairs 1,1,2,1,1,1,2,1 and steric numbers 4,6,5,6,6,4,5,5', sci.lp === '1,1,2,1,1,1,2,1' && sci.sn === '4,6,5,6,6,4,5,5', sci.lp + ' / ' + sci.sn);
  ok('shapes read from the relaxed models', sci.shapes === 'trigonal pyramidal|square pyramidal|T-shaped|square pyramidal|square pyramidal|trigonal pyramidal|T-shaped|see-saw', sci.shapes);
  ok('counts 1, 2, 0, 3 → P1 Q2 R5 S3', sci.counts === '1,2,0,3' && sci.map === '1,2,5,3');
  ok('lone pairs squeeze their neighbours (ClF3 axial–equatorial below 90°)', sci.clf3 < 90, sci.clf3.toFixed(1));
  ok('every lone-pair placement is tried (5 for SF4)', sci.sf4 === 5);
  ok('option audit: only (A) matches', sci.aud === 'true,false,false,false', sci.aud);
  ok('controls: SO3 planar, XeF4 square planar, SF6 octahedral — none is the question', sci.so3.sh.split('|')[0] === 'trigonal planar' && sci.xef4.sh.split('|')[1] === 'square planar' && sci.sf6.sh.split('|')[2] === 'octahedral' && !sci.so3.c && !sci.xef4.c && !sci.sf6.c);

  /* ------------------------------------------------ layout v2 */
  const lay = await E(() => {
    const s = document.getElementById('ansstrip'), g = document.querySelector('.grid1'), d = document.getElementById('dock'), go = document.getElementById('gobtn');
    return { strip: !!s && s.getBoundingClientRect().bottom <= g.getBoundingClientRect().top + 1, dock: !!d && d.getBoundingClientRect().top >= g.getBoundingClientRect().bottom - 1 && d.contains(go), val: document.getElementById('ansstripv').textContent };
  });
  ok('the final answer is visible above the experiment screen from the start', lay.strip && lay.val === 'A', lay.val);
  ok('START EXPERIMENT and the whole control bar sit below the experiment screen', lay.dock);
  ok('the full solution is open (no gate)', await E(() => !document.getElementById('solbody').hidden && document.getElementById('solgate').hidden));
  ok('the five tiles start as ?', await E(() => ['P', 'Q', 'R', 'S', 'O'].every(k => document.querySelector('#u_' + k + ' .v').textContent === '?')));
  const vals = await E(() => ['s6', 's7', 's8'].map(k => document.getElementById('in_' + k).value));
  ok('every value is pre-set to the question', vals.join(',') === 'SO3-2,XeF3+,SF4', vals.join(','));

  /* ------------------------------------------------ optional conditions */
  await E(() => PX.setField('s6', 'SO3'));
  ok('changing a species switches to USING CUSTOM VALUES, with an honest warning', /USING CUSTOM VALUES/.test(await p.textContent('#status')) && /no lone pair/.test(await p.textContent('#condwarn')));
  await p.click('#resetq');
  ok('RESTORE QUESTION CONDITIONS restores every field', (await E(() => ['s6', 's7', 's8'].map(k => document.getElementById('in_' + k).value))).join(',') === 'SO3-2,XeF3+,SF4' && await E(() => document.getElementById('condwarn').hidden));

  /* ------------------------------------------------ the automatic run */
  await p.click('#gobtn'); await sleep(400);
  ok('one START runs the question values', await E(() => PX.RUN.state) === 'running');
  ok('values lock while it runs', await E(() => document.getElementById('in_s6').disabled));
  await p.click('#spd button[data-s="2"]');
  const seen = new Set(), live = [], msgs = new Set();
  for (let i = 0; i < 900; i++){
    const s = await E(() => ({ st: PX.stage(), now: PX.now(), msg: document.getElementById('ansstrips').textContent, sp: document.getElementById('g_sp').textContent, lp: document.getElementById('g_lp').textContent, sh: document.getElementById('g_sh').textContent, tp: document.querySelector('#u_P .v').textContent, to: document.querySelector('#u_O .v').textContent }));
    seen.add(s.st); live.push(s); msgs.add(s.msg);
    if (await E(() => PX.RUN.done)) break;
    await sleep(110);
  }
  ok('with no further clicks it runs all eight stages', ['load', 'count', 'relax', 'shape', 'tally', 'list2', 'test', 'answer'].every(x => seen.has(x)), [...seen].join(','));
  ok('the answer strip steps through every message', ['Loading eight species', 'Counting valence electrons', 'Relaxing electron domains', 'Reading shapes', 'Tallying', 'Matching counts', 'Testing options', 'Calculating final result'].every(m => [...msgs].some(x => x.indexOf(m) >= 0)));
  ok('the gauges walk through the species while counting (XeF₃⁺: 2 lone pairs)', live.some(s => s.now && s.now.name === 'count' && s.sp === 'XeF₃⁺' && s.lp === '2'));
  ok('the shape gauge names each species in turn (SF₄: see-saw)', live.some(s => s.now && s.now.name === 'shape' && s.sp === 'SF₄' && s.sh === 'see-saw'));
  ok('tiles fill at the List-II step; the option only after the test', live.some(s => s.now && s.now.name === 'tally' && s.tp === '?') && live.some(s => s.now && s.now.name === 'test' && s.tp === '→ 1' && s.to === '?'));
  ok('the experiment finishes by itself', await E(() => PX.RUN.done));
  ok('the reasoning log is written in order', (await E(() => PX.calcKeys())).join(',') === 'load,count,relax,shape,tally,list2,oA,oB,oC,oD,match', (await E(() => PX.calcKeys())).join(','));
  ok('the case file: → 1, → 2, → 5, → 3, (A)', await E(() => ['P', 'Q', 'R', 'S', 'O'].map(k => document.querySelector('#u_' + k + ' .v').textContent).join(',')) === '→ 1,→ 2,→ 5,→ 3,(A)');
  ok('the evidence table has one row per species (8)', await E(() => document.querySelectorAll('#log tbody tr').length) === 8);
  const cards = await E(() => { const c = PX.cards(), o = {}; for (const k in c) o[k] = c[k] && c[k].v; return o; });
  ok('option board: A matches; B, C, D fail', cards.A === true && cards.B === false && cards.C === false && cards.D === false, JSON.stringify(cards));
  ok('all six badges are earned', await E(() => ['e', 'dom', 'lp', 'shape', 'tally', 'mas'].every(k => PX.badges()[k])) && await E(() => document.querySelectorAll('.badge.on').length) === 6);
  ok('both charts are drawn from the models: 48 angles, 5 bars', await E(() => document.querySelectorAll('#curve circle').length === 48 && document.querySelectorAll('#bars rect').length === 5));
  const cl = (await p.textContent('#calclist')).replace(/\s+/g, ' ');
  ok('the write-up: lone pairs, placements, shapes, counts, (A)', /XeF₃⁺: 2 LP, SN 5/.test(cl) && /lowest energy/.test(cl) && /SF₄ see-saw/.test(cl) && /Square Pyramidal: 3/.test(cl) && /\(A\)/.test(cl));
  await sleep(1300);
  const rv = await E(() => document.getElementById('revealhost').textContent);
  ok('the reveal: ANSWER FOUND, CONGRATULATIONS, OPTION (A)', /ANSWER FOUND/.test(rv) && /CONGRATULATIONS/.test(rv) && /OPTION \(A\)/.test(rv), rv.slice(0, 80));
  ok('...with LP–LP > LP–BP and the mapping as graffiti', /LP–LP > LP–BP/.test(rv) && /P → 1 · Q → 2 · R → 5 · S → 3/.test(rv));
  ok('the header reads A and blinks as it lands', (await p.textContent('#ansval')).trim() === 'A' && await E(() => document.getElementById('ansval').classList.contains('blink')));
  await sleep(2500);
  ok('...and stops blinking', await E(() => !document.getElementById('ansval').classList.contains('blink')));
  ok('the solution shows the computed answer', (await p.textContent('#solans')) === 'A');

  /* ------------------------------------------------ tools and the VSEPR builder */
  await p.click('#t_eq'); await p.click('#t_why'); await sleep(150);
  ok('SHOW EQUATION and SHOW WHY? toggle', await E(() => document.getElementById('t_eq').getAttribute('aria-pressed') === 'true' && document.getElementById('t_why').getAttribute('aria-pressed') === 'true'));
  await p.click('#t_eq'); await p.click('#t_why');
  await p.click('#t_cmp'); ok('SLOW MOTION sets half speed', await E(() => PX.RUN.speed) === 0.5); await p.click('#t_cmp');
  const xi = () => E(() => document.getElementById('xinfo').innerHTML);
  ok('builder starts on XeF₃⁺: 2 lone pairs, T-shaped', /XeF₃⁺/.test(await xi()) && /Lone pairs<\/th><td><b>2/.test(await xi()) && /<b>T-shaped/.test(await xi()));
  await p.selectOption('#x_q', '0'); await p.selectOption('#x_nf', '4'); await sleep(200);
  ok('XeF₄ in the builder: square planar', /<b>square planar/.test(await xi()));
  await p.selectOption('#x_c', 'S'); await sleep(200);
  ok('SF₄ in the builder: see-saw, 5 placements tried', /<b>see-saw/.test(await xi()) && /placements tried<\/th><td>5/.test(await xi()));
  await p.selectOption('#x_nf', '5'); await sleep(100);
  ok('an impossible species is refused honestly (SF₅, odd electron)', /Not a valid VSEPR species/.test(await xi()));
  await p.click('#x_reset');
  ok('builder reset returns to XeF₃⁺', /XeF₃⁺/.test(await xi()) && await E(() => document.getElementById('x_c').value) === 'Xe');

  /* ------------------------------------------------ replay, reset, pause */
  await p.click('#replaybtn'); await sleep(300);
  ok('REPLAY reruns the same experiment from the start', await E(() => PX.RUN.state) === 'running' && await E(() => PX.calcKeys().length) === 0);
  await p.click('#pausebtn'); const t0 = await E(() => PX.RUN.u + '/' + PX.RUN.si); await sleep(600);
  ok('Pause freezes the timeline', await E(() => PX.RUN.u + '/' + PX.RUN.si) === t0);
  await p.click('#pausebtn'); await p.click('#resetbtn'); await sleep(200);
  ok('RESET returns to the ready state', await E(() => PX.RUN.state) === 'setup' && /Ready/.test(await p.textContent('#xstattxt')));

  /* ------------------------------------------------ custom experiments */
  await E(() => PX.setField('s6', 'SO3'));
  await E(() => PX.speed(20)); await p.click('#gobtn');
  for (let i = 0; i < 80 && !(await E(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1400);
  const krv = await E(() => document.getElementById('revealhost').textContent);
  ok('SO3 in place of SO3²⁻: R → 1, no option fits, said plainly', /R → 1/.test(krv) && /not the question/.test(krv) && !/ANSWER FOUND/.test(krv), krv.slice(0, 70));
  ok('...every option card fails honestly', await E(() => ['A', 'B', 'C', 'D'].every(k => PX.cards()[k].v === false)) && await E(() => document.getElementById('u_O').classList.contains('warn')));
  ok('the header still answers the question itself', (await p.textContent('#ansval')).trim() === 'A' && (await p.textContent('#ansstripv')).trim() === 'A');
  await p.click('#resetq'); await E(() => PX.speed(1));

  /* ------------------------------------------------ classroom, theme, a11y */
  await p.click('#classbtn'); await sleep(200);
  ok('CLASSROOM MODE hides the inputs and other sections', await E(() => getComputedStyle(document.querySelector('.rail .inputs')).display === 'none' && getComputedStyle(document.getElementById('solution')).display === 'none'));
  await p.click('#classbtn');
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
    const tap = await m.evaluate(() => [document.getElementById('replaybtn').getBoundingClientRect().height, document.getElementById('in_s6').getBoundingClientRect().height, document.getElementById('x_reset').getBoundingClientRect().height, document.getElementById('x_c').getBoundingClientRect().height]);
    ok('no horizontal overflow at ' + w + ' px, before and after the run', ov0 <= 0 && ov1 <= 0, ov0 + ' / ' + ov1);
    ok('touch-sized controls at ' + w + ' px', tap[0] >= 34 && tap[1] >= 32 && tap[2] >= 32 && tap[3] >= 32, tap.map(Math.round).join('/'));
    ok('no errors at ' + w + ' px', me.length === 0, me[0]);
    await m.close();
  }
  const rc = await b.newContext({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage(); const re = []; rp.on('pageerror', e => re.push(e.message));
  await rp.goto(URL); await sleep(300);
  await rp.evaluate(() => { PX.speed(20); PX.start(); });
  for (let i = 0; i < 80 && !(await rp.evaluate(() => PX.RUN.done)); i++) await sleep(250);
  await sleep(1300);
  ok('reduced motion: complete answer, no animation, no confetti', (await rp.textContent('#ansval')).trim() === 'A'
     && await rp.evaluate(() => { const e = document.getElementById('ansval'); e.classList.add('blink'); return getComputedStyle(e).animationName === 'none'; })
     && await rp.evaluate(() => document.querySelectorAll('#revealhost rect[width="8"]').length === 0) && re.length === 0);
  await rc.close();

  /* ------------------------------------------------ the library and the feed */
  const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
  const e = man.simulations.find(s => s.id === ID);
  ok('the manifest carries it, once', !!e && man.simulations.filter(s => s.id === ID).length === 1);
  ok('question metadata: JEE Advanced 2026, Paper 1, Chemistry, Q.14',
     e && e.exam === 'JEE Advanced' && e.year === 2026 && e.paper === 'Paper 1' && e.paperNumber === 1 && e.subject === 'Chemistry' && e.questionNumber === 14);
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
  const T = __dirname + '/apptest-q14';
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
  await a.fill('#q', 'see-saw'); await sleep(700);
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
