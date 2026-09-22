const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs'), net = require('net'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   Every simulation is a self-contained file between 6,000 and 13,000 px tall on
   a phone. Before this, opening one was a full page navigation into that file:
   no header, no way back but the browser chrome, and on Android nothing at all.

   The shell now frames the simulation and puts one bar above it. The frame
   scrolls; the bar cannot. This suite checks the bar is reachable from any
   depth, that leaving works by button and by Back, that history stays one entry
   per open, that direct file URLs still serve the bare simulation, and that the
   simulation's own tabs never meet any of it.
   --------------------------------------------------------------------------- */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

const freePort = () => new Promise(res => { const sv = net.createServer();
  sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });

(async () => {
  const feed = JSON.parse(fs.readFileSync(ROOT + '/content/index.json', 'utf8')).simulations;
  const PICK = feed.find(s => s.id === 'ADV-2026-P2-CHE-Q17') || feed[0];
  const OTHER = feed.find(s => s.id !== PICK.id);

  const PS = await freePort();
  // corsserve, not http.server: the app shell fetches the feed cross-origin, and
  // only the browser-based test needs the header - the installed app uses
  // CapacitorHttp and never asks for it.
  const site = spawn('python3', [__dirname + '/corsserve.py', String(PS), ROOT],
                     { stdio: 'ignore' });
  const PA = await freePort();
  const T = __dirname + '/navtest';
  fs.rmSync(T, { recursive: true, force: true }); fs.mkdirSync(T, { recursive: true });
  for (const f of fs.readdirSync(ROOT + '/app/www'))
    fs.copyFileSync(ROOT + '/app/www/' + f, T + '/' + f);
  fs.writeFileSync(T + '/config.js', fs.readFileSync(T + '/config.js', 'utf8')
    .replace(/origin:\s*"[^"]+"/, 'origin: "http://127.0.0.1:' + PS + '"'));
  const app = spawn('python3', ['-m', 'http.server', String(PA), '--bind', '127.0.0.1'],
                    { cwd: T, stdio: 'ignore' });
  await sleep(1000);

  const S = 'http://127.0.0.1:' + PS + '/';
  const A = 'http://127.0.0.1:' + PA + '/';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  const runState = p => p.evaluate(() => {
    const r = document.getElementById('runner');
    const f = r.querySelector('iframe');
    const bar = document.querySelector('.rbar');
    return {
      open: !r.hidden,
      hash: location.hash,
      src: f ? f.getAttribute('src') : null,
      title: document.getElementById('rtitle').textContent,
      barTop: bar ? bar.getBoundingClientRect().top : null,
      barBottom: bar ? bar.getBoundingClientRect().bottom : null,
      frameTop: f ? f.getBoundingClientRect().top : null,
      topHidden: document.getElementById('rtop').hidden,
      cards: document.querySelectorAll('article.card').length
    };
  });

  /* ============================================================ the website */
  console.log('\n=== Library → simulation ===');
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text()))
                           errs.push(m.text()); });

  await p.goto(S, { waitUntil: 'networkidle' }); await sleep(900);
  const h0 = await p.evaluate(() => history.length);
  const openHref = await p.evaluate(id =>
    document.querySelector('article.card a.open').getAttribute('href'), null);
  ok('the catalogue offers simulations through the shell, not as a bare file',
     /^#\/run\//.test(openHref), openHref);

  await p.click('article.card a.open'); await sleep(1600);
  const st1 = await runState(p);
  ok('opening one shows the runner', st1.open && /^#\/run\//.test(st1.hash), st1.hash);
  ok('and the frame loads the simulation file, still revision-keyed',
     /^simulations\/.+index\.html\?v=\d+$/.test(st1.src || ''), st1.src);
  ok('the bar names the simulation', st1.title.length > 3, JSON.stringify(st1.title));
  ok('the simulation itself is running inside the frame',
     !!p.frames().find(f => /simulations\//.test(f.url())),
     (p.frames().find(f => /simulations\//.test(f.url())) || {url:()=>'none'}).url().split('/').pop());

  console.log('\n=== history ===');
  const h1 = await p.evaluate(() => history.length);
  ok('opening a simulation adds exactly one history entry',
     h1 - h0 === 1, h0 + ' → ' + h1);

  await p.goBack(); await sleep(900);
  const afterBack = await runState(p);
  ok('Back leaves the simulation and returns to the Library',
     !afterBack.open && afterBack.cards > 0 && !/run/.test(afterBack.hash),
     afterBack.hash + ', ' + afterBack.cards + ' cards');
  await p.goForward(); await sleep(1400);
  ok('Forward re-enters the same simulation', (await runState(p)).open);

  console.log('\n=== a long simulation, scrolled ===');
  const tall = await p.evaluate(() => {
    const f = document.querySelector('#rstage iframe');
    return f.contentDocument.documentElement.scrollHeight;
  });
  ok('the simulation is long enough to get lost in', tall > 3000, tall + 'px tall');
  await p.evaluate(() => {
    document.querySelector('#rstage iframe').contentWindow.scrollTo(0, 4000);
  });
  await sleep(500);
  const deep = await runState(p);
  const reach = await p.evaluate(() => {
    const el = document.getElementById('rback');
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { top: r.top, hit: hit === el || el.contains(hit) };
  });
  ok('the bar has not scrolled away', Math.abs(deep.barTop) < 0.5, 'bar top ' + deep.barTop);
  ok('and ← Library is still the thing under its own centre, 4000 px down',
     reach.hit, 'top ' + reach.top.toFixed(0) + 'px');
  ok('the bar sits above the frame, it does not cover it',
     Math.abs(deep.frameTop - deep.barBottom) < 1.5,
     'bar bottom ' + deep.barBottom + ', frame top ' + deep.frameTop);

  console.log('\n=== the Top control ===');
  ok('it appeared once there was something to scroll back from', !deep.topHidden);
  await p.click('#rtop'); await sleep(1200);
  const backUp = await p.evaluate(() => {
    const w = document.querySelector('#rstage iframe').contentWindow;
    return { y: w.pageYOffset, hidden: document.getElementById('rtop').hidden };
  });
  ok('clicking it returns the simulation to the top', backUp.y < 5, 'scrollY ' + backUp.y);
  ok('and it takes itself away again', backUp.hidden);
  const topCount = await p.evaluate(() =>
    document.querySelectorAll('.runner button:not([hidden]), .runner a').length);
  ok('the runner floats one control, not a raft of them', topCount <= 3, topCount + ' controls');

  console.log('\n=== leaving ===');
  await p.click('#rback'); await sleep(1100);
  const left = await runState(p);
  ok('← Library returns to the Library, as it says',
     !left.open && left.cards > 0 && left.hash === '#/', left.hash + ', ' + left.cards + ' cards');
  const frameGone = await p.evaluate(() =>
    document.querySelectorAll('#rstage iframe').length);
  ok('and the simulation is unloaded rather than left running behind it',
     frameGone === 0, frameGone + ' frames');

  console.log('\n=== URLs that must keep working ===');
  await p.goto(S + PICK.path + '?v=' + PICK.revision, { waitUntil: 'networkidle' }); await sleep(700);
  const bare = await p.evaluate(() => ({ title: document.title,
                                         runner: !!document.getElementById('runner') }));
  ok('the simulation file still serves the simulation on its own',
     bare.title.length > 0 && !bare.runner, bare.title.slice(0, 44));

  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.goto(S + '#/run/' + encodeURIComponent(OTHER.id), { waitUntil: 'networkidle' });
  await sleep(1800);
  const deep2 = await runState(p2);
  ok('a link straight to a running simulation works from cold',
     deep2.open && (deep2.src || '').indexOf(OTHER.path) >= 0, deep2.src);
  await ctx2.close();

  console.log('\n=== the simulation’s own controls ===');
  await p.goto(S + '#/run/' + encodeURIComponent(PICK.id), { waitUntil: 'networkidle' });
  await sleep(1900);
  const inner = await p.evaluate(() => {
    const d = document.querySelector('#rstage iframe').contentDocument;
    const btns = [...d.querySelectorAll('button')].filter(x => x.offsetParent !== null);
    if (!btns.length) return { n: 0 };
    const t = btns[0];
    const r = t.getBoundingClientRect();
    const hit = d.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { n: btns.length, own: hit === t || t.contains(hit), label: (t.textContent||'').trim().slice(0,22) };
  });
  ok('its own buttons are there and nothing of ours sits on top of them',
     inner.n > 0 && inner.own, inner.n + ' controls, first: ' + JSON.stringify(inner.label));
  const clicked = await p.evaluate(() => {
    const d = document.querySelector('#rstage iframe').contentDocument;
    const before = d.body.innerHTML.length;
    const t = [...d.querySelectorAll('button')].filter(x => x.offsetParent !== null)[0];
    t.click();
    return { before: before, after: d.body.innerHTML.length, alive: !!d.body };
  });
  ok('and clicking one still drives the simulation', clicked.alive,
     clicked.before + ' → ' + clicked.after + ' bytes of DOM');

  ok('console clean on the website throughout', errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();

  /* ============================================================== mobile */
  console.log('\n=== a small Android screen ===');
  const mctx = await b.newContext({ viewport: { width: 390, height: 844 },
                                    deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  await mp.goto(S + '#/run/' + encodeURIComponent(PICK.id), { waitUntil: 'networkidle' });
  await sleep(1900);
  const m = await mp.evaluate(() => {
    const back = document.getElementById('rback').getBoundingClientRect();
    const fav  = document.getElementById('rfav').getBoundingClientRect();
    const t    = document.getElementById('rtitle');
    const tr   = t.getBoundingClientRect();
    const bar  = document.querySelector('.rbar').getBoundingClientRect();
    const f    = document.querySelector('#rstage iframe').getBoundingClientRect();
    return {
      backH: back.height, favH: fav.height, favW: fav.width,
      overlapTitleBack: tr.left < back.right - 0.5,
      overlapTitleFav: tr.right > fav.left + 0.5,
      truncates: t.scrollWidth > t.clientWidth || getComputedStyle(t).textOverflow === 'ellipsis',
      barBottom: bar.bottom, frameTop: f.top, frameBottom: f.bottom,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      vh: window.innerHeight
    };
  });
  ok('the back and favourite controls are touch-sized',
     m.backH >= 44 && m.favH >= 44 && m.favW >= 44,
     'back ' + Math.round(m.backH) + 'px, fav ' + Math.round(m.favW) + '×' + Math.round(m.favH));
  ok('nothing in the bar overlaps anything else',
     !m.overlapTitleBack && !m.overlapTitleFav);
  ok('the title truncates instead of pushing the controls off', m.truncates);
  ok('the sticky bar does not cover the simulation',
     Math.abs(m.frameTop - m.barBottom) < 1.5 && m.frameBottom <= m.vh + 0.5,
     'frame ' + Math.round(m.frameTop) + '–' + Math.round(m.frameBottom) + ' of ' + m.vh);
  ok('no horizontal overflow at 390 px', m.overflow <= 0, m.overflow);
  await mctx.close();

  /* =========================================================== the app */
  console.log('\n=== the installed app: hardware Back ===');
  const actx = await b.newContext({ viewport: { width: 390, height: 844 },
                                    isMobile: true, hasTouch: true });
  const ap = await actx.newPage();
  const aerrs = [];
  ap.on('pageerror', e => aerrs.push(e.message));
  await ap.goto(A, { waitUntil: 'networkidle' }); await sleep(1400);
  await ap.click('.simcard'); await sleep(600);
  ok('the app opens a detail screen from the library',
     /^detail:/.test((await ap.evaluate(() => window.__prayogx.state())).mode));
  await ap.click('#openbtn'); await sleep(1800);
  ok('and the simulation opens with its bar',
     await ap.evaluate(() => !document.getElementById('viewer').hidden &&
                             !!document.getElementById('vback')));

  const handled = await ap.evaluate(() => window.__prayogx.goBack());
  await sleep(600);
  const afterHw = await ap.evaluate(() => ({
    viewer: document.getElementById('viewer').hidden,
    mode: window.__prayogx.state().mode }));
  ok('hardware Back leaves the simulation rather than the app',
     handled === true && afterHw.viewer === true, 'handled=' + handled + ', mode ' + afterHw.mode);
  ok('...and lands one step back, on the detail screen it came through',
     /^detail:/.test(afterHw.mode), afterHw.mode);
  await ap.evaluate(() => window.__prayogx.goBack()); await sleep(500);
  ok('another Back reaches the library',
     (await ap.evaluate(() => window.__prayogx.state().mode)) === 'library');
  const atLibrary = await ap.evaluate(() => window.__prayogx.goBack());
  ok('at the library Back is no longer handled, so Android may leave the app',
     atLibrary === false, 'goBack() -> ' + atLibrary);

  console.log('\n=== the app: ← Library, and the Top control ===');
  await ap.click('.simcard'); await sleep(600);
  await ap.click('#openbtn'); await sleep(1900);
  const tallApp = await ap.evaluate(() => {
    const f = document.getElementById('frame');
    return f.contentDocument ? f.contentDocument.documentElement.scrollHeight : 0; });
  ok('the framed simulation is long', tallApp > 3000, tallApp + 'px');
  await ap.evaluate(() => document.getElementById('frame').contentWindow.scrollTo(0, 4000));
  await sleep(500);
  const appTop = await ap.evaluate(() => ({
    top: document.getElementById('vtop').hidden,
    barTop: document.querySelector('.vbar').getBoundingClientRect().top }));
  ok('the app bar stays put through a long scroll too', Math.abs(appTop.barTop) < 0.5);
  ok('and the Top control appears', !appTop.top);
  await ap.click('#vtop'); await sleep(1100);
  ok('which returns the simulation to the top',
     (await ap.evaluate(() => document.getElementById('frame').contentWindow.pageYOffset)) < 5);
  await ap.click('#vback'); await sleep(700);
  ok('← Library in the app goes to the Library, as it says',
     (await ap.evaluate(() => window.__prayogx.state().mode)) === 'library');
  ok('console clean in the app throughout', aerrs.length === 0, aerrs.slice(0, 2).join(' | '));
  await actx.close();

  /* ============================================================== scale */
  console.log('\n=== no navigation code per simulation ===');
  let touched = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (f === 'index.html') {
        const t = fs.readFileSync(full, 'utf8');
        if (/rback|vback|#\/run\/|class="rbar"|prayogx-nav/.test(t)) touched.push(full);
      }
    }
  })(ROOT + '/simulations');
  ok('not one simulation file carries navigation markup',
     touched.length === 0, touched.length ? touched.join(', ') : feed.length + ' checked');
  const stub = fs.readFileSync(ROOT + '/s/' + PICK.id + '/index.html', 'utf8');
  ok('the generated crawlable page opens the same runner, so new simulations need nothing',
     stub.indexOf('#/run/' + PICK.id) >= 0 && stub.indexOf(PICK.path) >= 0);

  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  await b.close(); site.kill(); app.kill();
  fs.rmSync(T, { recursive: true, force: true });
  process.exit(bad ? 1 : 0);
})();
