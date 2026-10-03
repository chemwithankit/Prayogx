const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { spawn } = require('child_process');
const fs = require('fs'), net = require('net'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   The NCERT Explorer page shell (/ncert/, docs/NCERT.md Phase 2).

   Browse (class -> subject -> book -> chapter), the chapter outline, deep links,
   back / forward, the loading / empty / error / not-found states, noindex, phone /
   tablet / desktop layouts, and that the JEE library does not know the page
   exists yet. Feed failures are simulated by intercepting requests, so the tree
   under test is never modified.

   NCERT_SHOTS=<dir> also saves a screenshot of every state.
   --------------------------------------------------------------------------- */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

const freePort = () => new Promise(res => { const sv = net.createServer();
  sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });

const SHOTS = process.env.NCERT_SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (pg, name) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true }); };

(async () => {
  const cat = JSON.parse(fs.readFileSync(ROOT + '/content/ncert/catalog.json', 'utf8'));
  const book = cat.books[0], ch = book.chapters[0];
  const feed = JSON.parse(fs.readFileSync(ROOT + '/content/ncert/' + ch.id + '.json', 'utf8'));
  const CH = '#/11/chemistry/part-1/ch05';

  const P = await freePort();
  const site = spawn('python3', ['-m', 'http.server', String(P), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  let srv = false;
  for (let i = 0; i < 50 && !srv; i++) {
    srv = await new Promise(r => { const s = net.connect(P, '127.0.0.1', () => { s.end(); r(true); }); s.on('error', () => r(false)); });
    if (!srv) await sleep(100);
  }
  const BASE = 'http://127.0.0.1:' + P + '/ncert/';
  const b = await launch();

  // settled = the page has rendered the CURRENT hash (not just "something other than loading",
  // which is still true for the old view in the instant between a click and its hashchange)
  const settle = pg => pg.waitForFunction(() => window.NCERT && NCERT.state().status !== 'loading'
    && NCERT.state().route === (location.hash || '#/'), null, { timeout: 15000 });
  const state = pg => pg.evaluate(() => NCERT.state());
  async function page(opts) {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts || {}));
    const pg = await ctx.newPage();
    pg.errs = []; pg.reqs = [];
    pg.on('pageerror', e => pg.errs.push(e.message));
    pg.on('console', m => { if (m.type() === 'error') pg.errs.push(m.text()); });
    pg.on('request', r => pg.reqs.push(r.url()));
    return pg;
  }
  async function go(pg, hash) { await pg.goto(BASE + hash); await settle(pg); return state(pg); }

  try {
    // ----------------------------------------------------------- browse
    console.log('=== browse');
    const pg = await page();
    let s = await go(pg, '#/');
    ok('the page loads the catalogue and shows browse', s.status === 'ready' && s.view === 'browse', JSON.stringify(s));
    const robots = await pg.getAttribute('meta[name="robots"]', 'content');
    ok('the page is noindex', /noindex/.test(robots || ''), robots);
    ok('every class in the feed is a group', (await pg.$$eval('.nx-class', e => e.length)) === new Set(cat.books.map(x => x.class)).size);
    const links = await pg.$$eval('a.nx-chapter', e => e.map(a => a.getAttribute('href')));
    ok('every catalogued chapter is listed with its route', links.length === cat.books.reduce((k, x) => k + x.chapters.length, 0)
      && links.indexOf(CH) >= 0, links.join(' '));
    const row = await pg.$eval('a.nx-chapter', a => a.innerText.replace(/\s+/g, ' '));
    ok('the chapter row shows number, title, pages, sections and JEE links from the feed',
      row.indexOf(ch.title) >= 0 && row.indexOf('136–167') >= 0 && row.indexOf(ch.counts.sections + ' sections') >= 0
      && row.indexOf(ch.counts.apply + ' related JEE problems') >= 0, row);
    ok('the book shows its subject and title', (await pg.innerText('.nx-book')).indexOf(book.title) >= 0
      && /chemistry/i.test(await pg.innerText('.nx-subj')));
    await shot(pg, 'browse-1280');

    // ---------------------------------------------------- browse -> chapter
    console.log('=== chapter');
    await pg.click('a.nx-chapter'); await settle(pg);
    s = await state(pg);
    ok('clicking the chapter opens the chapter screen', s.view === 'chapter' && s.route === CH, JSON.stringify(s));
    ok('the chapter heading and title name the chapter', (await pg.innerText('h1')).indexOf(ch.title) >= 0
      && (await pg.title()).indexOf(ch.title) >= 0, await pg.title());
    const secs = await pg.$$eval('.nx-sec', e => e.map(x => x.getAttribute('data-section')));
    ok('every section is listed, in feed order', JSON.stringify(secs) === JSON.stringify(feed.sections.map(x => x.id)), secs.length);
    const hess = await pg.$eval('[data-section="5.4e"]', e => e.innerText.replace(/\s+/g, ' '));
    ok('a section shows its number, title and printed pages', /5\.4 \(e\)/.test(hess) && /Hess/.test(hess) && /151–152/.test(hess), hess);
    ok('level-2 sections are nested visually', (await pg.$$eval('.nx-sec.nx-l2', e => e.length)) === feed.sections.filter(x => x.level === 2).length);
    const facts = await pg.innerText('.nx-facts');
    ok('the chapter facts come from the feed (pages, sections, edition)', facts.indexOf('136–167') >= 0
      && facts.indexOf(feed.sections.length + ' sections') >= 0 && facts.indexOf(ch.id ? 'Reprint 2026-27' : '') >= 0, facts.replace(/\s+/g, ' '));
    const crumbs = await pg.$$eval('.nx-crumbs li', e => e.map(x => x.innerText));
    ok('the breadcrumb runs NCERT > Class 11 > Chemistry > Chemistry Part I > Chapter 5',
      crumbs.join('>') === 'NCERT>Class 11>Chemistry>Chemistry Part I>Chapter 5', crumbs.join('>'));
    ok('only the generated feed is read (never data/ncert/ or the manifest)',
      pg.reqs.some(u => /content\/ncert\/catalog\.json/.test(u)) && pg.reqs.some(u => /content\/ncert\/NCERT-11-CHE-P1-CH05\.json\?v=/.test(u))
      && !pg.reqs.some(u => /data\/(ncert|manifest)/.test(u)));
    ok('no PDF, no simulation and no PDF.js are requested in this phase',
      !pg.reqs.some(u => /\.pdf|simulations\/|pdfjs|\.mjs/.test(u)));
    await shot(pg, 'chapter-1280');

    // ---------------------------------------------------- back / forward
    console.log('=== history');
    await pg.goBack(); await settle(pg);
    ok('Back returns to browse', (await state(pg)).view === 'browse');
    await pg.goForward(); await settle(pg);
    ok('Forward returns to the chapter', (await state(pg)).view === 'chapter');
    await pg.click('.nx-crumbs a[href="#/11/chemistry/part-1"]'); await settle(pg);
    ok('the breadcrumb opens the book', (await state(pg)).view === 'book' && (await pg.innerText('h1')) === book.title);
    await pg.click('.nx-crumbs a[href="#/11"]'); await settle(pg);
    ok('...and the class', (await state(pg)).view === 'class');
    await pg.goBack(); await pg.goBack(); await settle(pg);
    ok('Back twice returns to the chapter', (await state(pg)).view === 'chapter');
    ok('no page or console errors in normal use', pg.errs.length === 0, pg.errs.join(' | '));

    // ------------------------------------------------------- deep links
    console.log('=== deep links');
    const dl = await page();
    s = await go(dl, CH);
    ok('a deep link opens the chapter directly', s.status === 'ready' && s.view === 'chapter');
    s = await go(dl, '#/11/Chemistry/Part-1/CH05');
    ok('route segments are case-insensitive', s.view === 'chapter');
    s = await go(dl, '#/11/chemistry/part-1/ch05/');
    ok('a trailing slash is accepted', s.view === 'chapter');
    for (const [h, v] of [['#/11', 'class'], ['#/11/chemistry', 'subject'], ['#/11/chemistry/part-1', 'book'], ['', 'browse'], ['#', 'browse']]) {
      s = await go(dl, h);
      ok('deep link ' + (h || '(none)') + ' shows ' + v, s.status === 'ready' && s.view === v, JSON.stringify(s));
    }
    ok('no errors across deep links', dl.errs.length === 0, dl.errs.join(' | '));

    // ------------------------------------------------------- not found
    console.log('=== not found');
    for (const h of ['#/12', '#/11/physics', '#/11/chemistry/part-2', '#/11/chemistry/part-1/ch99', '#/11/chemistry/part-1/ch05/extra', '#/nonsense']) {
      s = await go(dl, h);
      ok('not found: ' + h, s.status === 'notfound', JSON.stringify(s));
    }
    await shot(dl, 'notfound-1280');
    await dl.click('.nx-state a[href="#/"]'); await settle(dl);
    ok('"Browse" leaves the not-found page', (await state(dl)).view === 'browse');
    ok('not-found states raise no errors', dl.errs.length === 0, dl.errs.join(' | '));

    // ------------------------------------------------- loading / empty / error
    console.log('=== states');
    const ld = await page();
    let release;
    const gate = new Promise(r => { release = r; });
    await ld.route('**/content/ncert/catalog.json', async rt => { await gate; await rt.continue(); });
    await ld.goto(BASE + '#/');
    await ld.waitForSelector('main[data-state="loading"] .loading');
    ok('loading: shown while the catalogue is on its way', /Loading the NCERT library/.test(await ld.innerText('main')));
    await shot(ld, 'loading-1280');
    release(); await settle(ld);
    ok('loading: replaced by browse when it arrives', (await state(ld)).view === 'browse');

    const em = await page();
    await em.route('**/content/ncert/catalog.json', rt => rt.fulfill({ contentType: 'application/json',
      body: JSON.stringify({ schemaVersion: '1.0.0', version: 'x', books: [] }) }));
    s = await go(em, '#/');
    ok('empty: a catalogue with no books shows the empty state', s.status === 'empty', JSON.stringify(s));
    ok('empty: it points to the JEE library', (await em.getAttribute('main .nx-btn', 'href')) === '../');
    await shot(em, 'empty-1280');
    await em.unroute('**/content/ncert/catalog.json');
    await em.route('**/content/ncert/catalog.json', rt => rt.fulfill({ contentType: 'application/json',
      body: JSON.stringify({ schemaVersion: '1.0.0', version: 'x', books: [{ id: 'NCERT-11-CHE-P1', class: 11, subject: 'Chemistry', title: 'X', chapters: [] }] }) }));
    s = await go(em, '#/');
    ok('empty: books without chapters also count as empty', s.status === 'empty');

    const cases = [
      ['network failure', rt => rt.abort()],
      ['HTTP 500', rt => rt.fulfill({ status: 500, body: 'no' })],
      ['unreadable JSON', rt => rt.fulfill({ contentType: 'application/json', body: '{not json' })],
      ['an incompatible schema (2.x)', rt => rt.fulfill({ contentType: 'application/json', body: JSON.stringify({ schemaVersion: '2.0.0', books: [] }) })],
    ];
    for (const [label, handler] of cases) {
      const er = await page();
      await er.route('**/content/ncert/catalog.json', handler);
      s = await go(er, CH);
      ok('error: ' + label + ' shows the error state', s.status === 'error' && (await er.$('[role="alert"]')) !== null, JSON.stringify(s));
      if (label === 'network failure') {
        await shot(er, 'error-1280');
        await er.unroute('**/content/ncert/catalog.json');
        await er.click('#nx-retry'); await settle(er);
        ok('error: "Try again" recovers once the feed is back', (await state(er)).view === 'chapter');
      }
      await er.context().close();
    }
    const ce = await page();
    await ce.route('**/content/ncert/NCERT-11-CHE-P1-CH05.json*', rt => rt.abort());
    s = await go(ce, CH);
    ok('error: a chapter feed that fails shows the error state, naming the chapter',
      s.status === 'error' && /Thermodynamics/.test(await ce.innerText('h1')), JSON.stringify(s));
    await ce.unroute('**/content/ncert/NCERT-11-CHE-P1-CH05.json*');
    await ce.route('**/content/ncert/NCERT-11-CHE-P1-CH05.json*', rt => rt.fulfill({ contentType: 'application/json',
      body: JSON.stringify(Object.assign({}, feed, { chapter: Object.assign({}, feed.chapter, { id: 'NCERT-11-CHE-P1-CH06' }) })) }));
    s = await go(ce, '#/');
    s = await go(ce, CH);
    ok('error: a feed for the wrong chapter is refused', s.status === 'error');

    // ------------------------------------------------- layout and devices
    console.log('=== layout');
    for (const [w, h] of [[360, 780], [390, 844], [768, 1024], [1280, 900]]) {
      const lp = await page({ viewport: { width: w, height: h } });
      for (const [name, hash] of [['browse', '#/'], ['chapter', CH], ['notfound', '#/12']]) {
        await go(lp, hash);
        const m = await lp.evaluate(() => {
          const vw = window.innerWidth;
          const out = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 0.5; });
          return { over: document.documentElement.scrollWidth - vw, outside: out.length,
                   lib: (() => { const a = document.querySelector('.nx-lib'); const r = a && a.getBoundingClientRect(); return !!(r && r.width && r.right <= vw); })() };
        });
        ok(w + ' px ' + name + ': no horizontal overflow, nothing past the edge', m.over <= 0 && m.outside === 0, JSON.stringify(m));
        if (name === 'browse') ok(w + ' px: the link back to the JEE library is visible', m.lib);
        if (SHOTS && w !== 1280) await shot(lp, name + '-' + w);
      }
      ok(w + ' px: no errors', lp.errs.length === 0, lp.errs.join(' | '));
      await lp.context().close();
    }
    const tp = await page({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await go(tp, '#/');
    const tgt = await tp.$eval('a.nx-chapter', a => a.getBoundingClientRect().height);
    ok('the chapter row is a comfortable touch target (>= 44 px)', tgt >= 44, tgt);
    await tp.tap('a.nx-chapter'); await settle(tp);
    ok('tapping the chapter on a phone opens it', (await state(tp)).view === 'chapter');

    const rm = await page({ reducedMotion: 'reduce' });
    await go(rm, '#/');
    const tr = await rm.$eval('a.nx-chapter', a => getComputedStyle(a).transitionDuration);
    ok('reduced motion: no transitions', /^0s/.test(tr), tr);

    const dk = await page({ colorScheme: 'dark' });
    await go(dk, CH);
    const bg = await dk.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok('dark mode follows the system, with the library\'s tokens', bg === 'rgb(17, 17, 16)', bg);
    await shot(dk, 'chapter-dark-1280');
    await dk.click('#themebtn');
    const theme = await dk.evaluate(() => [document.documentElement.getAttribute('data-theme'), localStorage.getItem('jee-sim-theme')]);
    ok('the theme button switches and shares the library\'s saved choice', theme[0] === 'light' && theme[1] === 'light', theme.join(','));
    const keys = await pg.evaluate(() => Object.keys(localStorage));
    ok('nothing is stored apart from the shared theme (no progress yet)', keys.length === 0, keys.join(','));

    // ------------------------------------- the JEE library does not know about it
    console.log('=== JEE library untouched');
    const idx = fs.readFileSync(ROOT + '/index.html', 'utf8'), sitejs = fs.readFileSync(ROOT + '/site/site.js', 'utf8');
    ok('the library page does not link to /ncert/', !/ncert/i.test(idx));
    ok('site.js does not mention the NCERT Explorer', !/ncert/i.test(sitejs));
    const sitemap = fs.readFileSync(ROOT + '/sitemap.xml', 'utf8');
    ok('/ncert/ is not in the sitemap', !/ncert/i.test(sitemap));
    ok('robots.txt is unchanged in shape (no NCERT rule)', !/ncert/i.test(fs.readFileSync(ROOT + '/robots.txt', 'utf8')));
    ok('the service worker does not precache the NCERT page', !/ncert/i.test(fs.readFileSync(ROOT + '/sw.js', 'utf8')));
    const lib = await page();
    await lib.goto('http://127.0.0.1:' + P + '/');
    await lib.waitForSelector('article.card', { timeout: 15000 });
    const libText = await lib.evaluate(() => document.body.innerHTML);
    ok('the JEE library renders and shows no NCERT link', !/ncert/i.test(libText));
    ok('the JEE library loads without errors', lib.errs.length === 0, lib.errs.join(' | '));
    const js = fs.readFileSync(ROOT + '/ncert/ncert.js', 'utf8');
    ok('ncert.js is plain ES5 (no let / const / arrow / template / class)',
      !/(^|[^\w.])(let|const|class)\s|=>|`/.test(js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""')));
  } catch (e) {
    ok('suite ran to the end', false, e && e.stack);
  } finally {
    await b.close();
    site.kill();
  }
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  process.exit(bad ? 1 : 0);
})();
