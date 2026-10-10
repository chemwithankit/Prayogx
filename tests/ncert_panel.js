const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { makePdf } = require('./ncert_pdf_fixture');
const { spawn } = require('child_process');
const crypto = require('crypto'), fs = require('fs'), net = require('net'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   NCERT Explorer UX-1: learning paths, the contextual learning panel and the
   phone context bar / sheet (docs/NCERT_UX.md).

   Synthetic PDFs only (tests/ncert_pdf_fixture.js). LAB carries printed-page
   labels 136-147, as NCERT chapter PDFs do, so real Chapter 5 sections and their
   existing JEE links resolve; NOLAB has none. No concept or experience data
   exists in production feeds: here Explore is shown only by stubbing
   getLearningContext inside a test (tests/ncert_learning.js covers real data).

   NCERT_SHOTS=<dir> saves screenshots.
   --------------------------------------------------------------------------- */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };
const freePort = () => new Promise(res => { const sv = net.createServer();
  sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
const SHOTS = process.env.NCERT_SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (pg, name) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); };

(async () => {
  const CH = '#/11/chemistry/part-1/ch05';
  const FEED = '/content/ncert/NCERT-11-CHE-P1-CH05.json';
  const feed = JSON.parse(fs.readFileSync(ROOT + FEED, 'utf8'));
  const LAB = makePdf(12, { labels: 136 }), NOLAB = makePdf(5);
  const P = await freePort();
  const site = spawn('python3', ['-m', 'http.server', String(P), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    const up = await new Promise(r => { const s = net.connect(P, '127.0.0.1', () => { s.end(); r(true); }); s.on('error', () => r(false)); });
    if (up) break; await sleep(100);
  }
  const BASE = 'http://127.0.0.1:' + P + '/ncert/';
  const b = await launch();

  async function page(opts, routeExact) {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts || {}));
    const pg = await ctx.newPage();
    pg.errs = [];
    pg.on('pageerror', e => pg.errs.push(e.message));
    pg.on('console', m => { if (m.type() === 'error') pg.errs.push(m.text()); });
    if (routeExact) await pg.route('**' + FEED + '*', r => {
      const f = JSON.parse(JSON.stringify(feed));
      f.chapter.source.editions = [{ label: 'Test edition', sha256: crypto.createHash('sha256').update(LAB).digest('hex'),
                                     pdfPages: 12, pageLabels: 'book', verified: '2026-10-03' }];
      r.fulfill({ contentType: 'application/json', body: JSON.stringify(f) });
    });
    return pg;
  }
  const settled = pg => pg.waitForFunction(() => window.NCERT && NCERT.state().status !== 'loading'
    && NCERT.state().route === (location.hash || '#/'), null, { timeout: 15000 });
  async function chapter(pg) { await pg.goto(BASE + CH); await settled(pg); await pg.waitForSelector('#nx-reader[data-reader-state="no_hosted_pdf"]'); }
  async function choose(pg, buf) {
    const fc = pg.waitForEvent('filechooser');
    await pg.click('#nx-reader [data-choose]');
    await (await fc).setFiles({ name: 'kech105.pdf', mimeType: 'application/pdf', buffer: buf });
    await pg.waitForFunction(() => { const s = NCERT.reader.state(); return s && s.state === 'ready' && NCERT.reader.getCurrentPageContext(); }, null, { timeout: 60000 });
    await sleep(200);
  }
  async function go(pg, pdfPage) {
    await pg.fill('#nx-pageno', String(pdfPage)); await pg.press('#nx-pageno', 'Enter');
    await pg.waitForFunction(p => { const c = NCERT.reader.getCurrentPageContext(); return c && c.pdfPage === p && !NCERT.reader.stats().rendering; }, pdfPage);
    await sleep(150);
  }
  const panel = pg => pg.evaluate(() => {
    const t = id => { const e = document.getElementById(id); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').trim() : null; };
    const secs = [...document.querySelectorAll('#nx-here-body .nx-heresecs li')].map(li => li.querySelector('.nx-heresecno').textContent);
    const apply = [...document.querySelectorAll('#nx-apply:not([hidden]) .nx-applink')].map(a => a.getAttribute('data-sim'));
    return { here: t('nx-here'), secs, concept: t('nx-concept'), explore: t('nx-explore'), quiet: t('nx-quiet'), apply,
             bar: document.getElementById('nx-ctxbar').hidden ? null : document.getElementById('nx-ctxbar').textContent,
             warn: !!document.querySelector('#nx-here-body .nx-pwarn'), live: document.getElementById('nx-live').textContent,
             current: [...document.querySelectorAll('#nx-map .nx-sec[aria-current]')].map(e => e.getAttribute('data-section')),
             reading: document.getElementById('nx').getAttribute('data-reading'), mapOpen: document.getElementById('nx-map').open,
             srcOpen: document.getElementById('nx-srcmore').open };
  });
  const visible = (pg, sel) => pg.evaluate(s => { const e = document.querySelector(s); if (!e) return false;
    // checkVisibility() also sees content hidden by a closed <details> (content-visibility), which keeps its box
    if (e.checkVisibility && !e.checkVisibility({ visibilityProperty: true })) return false;
    const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; }, sel);

  try {
    // ---------------------------------------------------------------- paths
    console.log('=== learning paths');
    const a = await page();
    await chapter(a);
    const paths = await a.$$eval('.nx-paths a', x => x.map(e => [e.textContent.replace(/ /g, ' '), e.getAttribute('href'), e.getAttribute('aria-current')]));
    ok('the header offers both learning paths: Questions and NCERT Explorer (current)',
      JSON.stringify(paths) === JSON.stringify([['Questions', '../', null], ['NCERT Explorer', '#/', 'page']]), JSON.stringify(paths));
    ok('...inside a labelled navigation', (await a.getAttribute('.nx-nav', 'aria-label')) === 'PrayogX learning paths');
    ok('the main JEE site links here with one header link (owner, 2026-10-10); site.js is unchanged and the page stays noindex',
      (fs.readFileSync(ROOT + '/index.html', 'utf8').match(/href="ncert\/"/g) || []).length === 1 && !/ncert/i.test(fs.readFileSync(ROOT + '/site/site.js', 'utf8'))
      && (await a.getAttribute('meta[name="robots"]', 'content')).indexOf('noindex') >= 0);

    // ---------------------------------------------------------------- no PDF
    console.log('=== before a PDF is open (desktop)');
    let s = await panel(a);
    ok('the hero stays and the panel does not repeat the chapter identity', await visible(a, '.nx-chhero') && !(await visible(a, '.nx-identity')));
    ok('the PDF source leads the panel; the chapter map is open', await a.evaluate(() => {
      const src = document.querySelector('.nx-source').getBoundingClientRect(), map = document.getElementById('nx-map').getBoundingClientRect();
      return src.top < map.top; }) && s.mapOpen && s.srcOpen);
    ok('no page context: On this page, Concept, Explore, Apply, the quiet line and the bar are all hidden',
      s.here === null && s.concept === null && s.explore === null && s.apply.length === 0 && s.quiet === null && s.bar === null, JSON.stringify(s));
    await a.click('#nx-map [data-go="5.2.1"]'); await sleep(150);
    s = await panel(a);
    ok('choosing a section in the chapter map without a PDF shows it, and its JEE practice',
      /Section 5\.2\.1/.test(s.here) && JSON.stringify(s.apply) === JSON.stringify(feed.sections.find(x => x.id === '5.2.1').apply)
      && JSON.stringify(s.current) === '["5.2.1"]', JSON.stringify(s));
    ok('...and no context bar appears without a PDF', s.bar === null);
    await shot(a, 'panel-nopdf-1280');

    // ---------------------------------------------------------------- reading
    console.log('=== reading (desktop, unverified edition)');
    await choose(a, LAB);
    s = await panel(a);
    ok('once a PDF is open the hero folds into the panel identity, and the map and source details close',
      !(await visible(a, '.nx-chhero')) && await visible(a, '.nx-identity') && await visible(a, '.nx-crumbs') && s.reading === '1' && !s.mapOpen && !s.srcOpen);
    const src = await a.evaluate(() => ({ h: document.querySelector('.nx-source').getBoundingClientRect().height,
      sum: document.getElementById('nx-srcstate').textContent, detailsOpen: document.getElementById('nx-srcmore').open }));
    ok('the source card is compact once a PDF is open: file, status and "Choose another PDF" on one summary, details closed',
      src.h < 150 && /kech105\.pdf/.test(src.sum) && /Edition not verified/.test(src.sum) && !src.detailsOpen
      && await visible(a, '#nx-srcsum') && await visible(a, '#nx-choose-card') && !(await visible(a, '#nx-verify')), JSON.stringify(src));
    await a.click('#nx-srcmore > summary');
    ok('...and its details (verification, official source, privacy) open on demand',
      await visible(a, '#nx-verify .nx-vbadge') && await visible(a, '#nx-srcmore .nx-rofficial') && await visible(a, '#nx-srcmore .nx-privacy'));
    await a.click('#nx-srcmore > summary');
    {
      const fc = a.waitForEvent('filechooser'); await a.click('#nx-choose-card');
      await (await fc).setFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a pdf') }); await sleep(400);
      ok('a refused file opens the details to say why, and the open PDF stays', await visible(a, '#nx-verify [data-notice]')
        && (await a.evaluate(() => NCERT.reader.state().state)) === 'ready');
      await a.click('#nx-srcmore > summary');
    }
    ok('page 1 is printed p. 136: Introduction, nothing to apply, the quiet line', /p\. 136/.test(s.here) && JSON.stringify(s.secs) === '[""]'
      && s.apply.length === 0 && s.quiet === 'Nothing to explore on this page yet.', JSON.stringify(s));
    await go(a, 3);
    s = await panel(a);
    ok('p. 138 lies in three sections: 5.1.3 and 5.1.4 (both start here), then 5.1.2; their parent 5.1 is not repeated',
      JSON.stringify(s.secs) === '["5.1.3","5.1.4","5.1.2"]', JSON.stringify(s.secs));
    ok('...Apply lists the chapter\'s existing JEE link for 5.1.4', JSON.stringify(s.apply) === '["ADV-2026-P1-PHY-Q07"]');
    ok('...the chapter map marks those sections', JSON.stringify(s.current.sort()) === '["5.1.2","5.1.3","5.1.4"]');
    ok('an unverified edition is matched by printed page, with the approved note (never presented as exact)',
      s.warn && /could not be verified — page matching may be approximate/.test(s.here));
    ok('Concept stays empty (no inventory yet) and Explore is hidden while the mapper returns []',
      s.concept === null && s.explore === null && s.quiet !== null);
    const link = await a.$eval('#nx-apply .nx-applink', e => ({ href: e.getAttribute('href'), target: e.target, rel: e.rel, label: e.getAttribute('aria-label') }));
    ok('the JEE link opens the Questions library in a new tab, so the PDF stays open',
      link.href === '../#/run/ADV-2026-P1-PHY-Q07' && link.target === '_blank' && /noopener/.test(link.rel) && /new tab/.test(link.label), JSON.stringify(link));
    await go(a, 6);
    s = await panel(a);
    ok('p. 141: only 5.2.1 (its parent 5.2 is not repeated), with its JEE link', JSON.stringify(s.secs) === '["5.2.1"]'
      && JSON.stringify(s.apply) === '["ADV-2026-P1-CHE-Q01"]', JSON.stringify(s));
    ok('...announced once, politely', /p\.\s141 · Work · 1 to apply/.test(s.live), s.live);
    await go(a, 10);
    const und = await a.evaluate(() => [...document.querySelectorAll('#nx-understand:not([hidden]) .nx-applink')].map(e => ({ sim: e.getAttribute('data-sim'),
      href: e.getAttribute('href'), target: e.target, rel: e.rel, label: e.getAttribute('aria-label') })));
    ok('p. 145 (5.2.2 and 5.3): Understand offers each published concept page once, in a new tab, so the PDF stays open',
      und.length === 2 && und[0].sim === 'CON-CHE-DELTA-U-VS-DELTA-H' && und[0].href === '../simulations/concepts/chemistry/con-che-delta-u-vs-delta-h/'
      && und[1].sim === 'CON-CHE-CALORIMETER-01' && und[1].href === '../simulations/concepts/chemistry/con-che-calorimeter-01/'
      && und.every(u => u.target === '_blank' && /noopener/.test(u.rel) && /new tab/.test(u.label)), JSON.stringify(und));
    await go(a, 3);
    ok('...and Understand is hidden where no section maps a concept (p. 138)', await a.evaluate(() => document.getElementById('nx-understand').hidden));
    await go(a, 5);
    s = await panel(a);
    ok('p. 140 (a boundary page): 5.2.1 starts here so it comes first, then 5.1.4', JSON.stringify(s.secs) === '["5.2.1","5.1.4"]', JSON.stringify(s.secs));
    const before = JSON.stringify(await panel(a));
    await a.click('#nx-t-in'); await a.click('#nx-t-fit'); await a.setViewportSize({ width: 1100, height: 900 }); await sleep(500);
    await a.setViewportSize({ width: 1280, height: 900 }); await sleep(500);
    ok('zoom, fit and resize leave the panel exactly as it was (it follows page changes only)', JSON.stringify(await panel(a)) === before);
    await shot(a, 'panel-reading-1280');

    // map jumps
    await a.click('#nx-map > summary');
    await a.click('#nx-map [data-go="5.2.2"]');
    await a.waitForFunction(() => NCERT.reader.getCurrentPageContext().printedPage === 143);
    s = await panel(a);
    ok('a chapter-map section turns the PDF to its first printed page (5.2.2 -> p. 143)',
      (await a.evaluate(() => NCERT.reader.getCurrentPageContext().pdfPage)) === 8 && s.secs.indexOf('5.2.2') >= 0);
    ok('the reader\'s chapter title focuses the chapter map on desktop', await (async () => {
      await a.evaluate(() => { document.getElementById('nx-map').open = false; });
      await a.click('#nx-rtitle');
      return a.evaluate(() => document.getElementById('nx-map').open && document.activeElement === document.querySelector('#nx-map > summary'));
    })());
    ok('the reading context API is unchanged (four fields)', JSON.stringify(Object.keys(await a.evaluate(() => NCERT.reader.getCurrentPageContext())).sort())
      === '["chapterId","editionStatus","pdfPage","printedPage"]');
    ok('no errors', a.errs.length === 0, a.errs.join(' | '));
    await a.context().close();

    console.log('=== verified edition');
    const v = await page(undefined, true);
    await chapter(v); await choose(v, LAB); await go(v, 3);
    s = await panel(v);
    ok('an exactly matched edition shows no edition note', !s.warn && JSON.stringify(s.secs) === '["5.1.3","5.1.4","5.1.2"]', JSON.stringify(s));
    ok('...and the compact source summary says "Verified edition"', /\u2713 Verified edition/.test(await v.$eval('#nx-srcstate', e => e.textContent)));
    await v.context().close();

    // ---------------------------------------------------------------- no printed page labels
    console.log('=== a PDF without printed page numbers');
    const nl = await page();
    await chapter(nl); await choose(nl, NOLAB);
    s = await panel(nl);
    ok('without labels: "PDF page 1" and a prompt to choose a section', /PDF page 1/.test(s.here) && /no printed page numbers\. Choose a section/.test(s.here)
      && s.secs.length === 0 && s.apply.length === 0);
    await nl.click('#nx-map > summary'); await nl.click('#nx-map [data-go="5.6c"]'); await sleep(200);
    s = await panel(nl);
    ok('...choosing a section uses it as the context (stated), without moving the PDF', JSON.stringify(s.secs) === '["5.6 (c)"]'
      && /showing the chosen section/.test(s.here) && JSON.stringify(s.apply) === '["ADV-2026-P1-CHE-Q13"]'
      && (await nl.evaluate(() => NCERT.reader.getCurrentPageContext().pdfPage)) === 1, JSON.stringify(s));
    await nl.context().close();

    // ---------------------------------------------------------------- the mapper seam
    console.log('=== the ExperienceMapper seam');
    const m = await page();
    await chapter(m);
    ok('the mapper still returns [] (backward compatible)', JSON.stringify(await m.evaluate(() => NCERT.ExperienceMapper.getExperiencesForPage({
      pdfPage: 1, printedPage: 136, chapterId: 'NCERT-11-CHE-P1-CH05', editionStatus: 'exact_match' }))) === '[]');
    await choose(m, LAB);
    await m.evaluate(() => { window.__seen = []; const M = NCERT.ExperienceMapper, orig = M.getLearningContext;
      window.__restore = () => { M.getLearningContext = orig; };
      M.getLearningContext = (c, o) => { window.__seen.push(c); const lc = orig(c, o);
        if (lc && c && c.printedPage === 137) lc.concepts.push({ concept: { id: 'CPT-CHE-TEST-STUB', title: 'Test-only concept', description: null },
          objectives: [], experiences: [{ id: 'EXP-CHE-TEST-STUB', type: 'virtual-lab', title: 'Test-only stub', objectives: [], libraryId: null }] });
        return lc; }; });
    await go(m, 2);
    s = await panel(m);
    const seen = await m.evaluate(() => window.__seen[window.__seen.length - 1]);
    ok('the panel asks the mapper with the page context itself', seen && seen.printedPage === 137 && seen.chapterId === 'NCERT-11-CHE-P1-CH05');
    ok('when the learning context has experiences (a test-only stub), Explore appears and the quiet line goes',
      /Explore.*virtual lab.*Test-only stub/i.test(s.explore) && s.quiet === null, JSON.stringify(s));
    await go(m, 1);
    s = await panel(m);
    ok('...and leaves again on a page with none', s.explore === null && s.quiet !== null);
    await m.evaluate(() => window.__restore());
    await m.context().close();

    // ---------------------------------------------------------------- phones / tablets
    console.log('=== phone: context bar and sheet');
    const p = await page({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await chapter(p);
    ok('no permanent sidebar on a phone: the panel is off-screen and the reader is full width', !(await visible(p, '#nx-panel'))
      && await p.evaluate(() => Math.abs(document.getElementById('nx-reader').getBoundingClientRect().width - document.getElementById('nx-chlayout').getBoundingClientRect().width) < 1));
    await choose(p, LAB);
    s = await panel(p);
    ok('p. 136 has nothing to explore or apply: no context bar, the PDF stays clean', s.bar === null && !(await visible(p, '#nx-ctxbar')));
    await go(p, 3);
    s = await panel(p);
    ok('p. 138 has something to apply: the context bar appears', /p\.\s138 · The State of the System · 1 to apply/.test(s.bar), s.bar);
    ok('...without covering the reader controls', await p.evaluate(() => {
      const bar = document.getElementById('nx-ctxbar').getBoundingClientRect();
      return [...document.querySelectorAll('#nx-tools button, #nx-pageno')].every(e => { const r = e.getBoundingClientRect(); return r.bottom <= bar.top || r.top >= bar.bottom; }); }));
    await shot(p, 'panel-bar-390');
    await p.click('#nx-ctxbar'); await sleep(350);
    ok('tapping it opens the sheet with the same blocks, focused, with the bar marked expanded',
      await visible(p, '#nx-panel') && await visible(p, '#nx-here') && await visible(p, '#nx-apply')
      && (await p.evaluate(() => document.activeElement.id)) === 'nx-sheetclose' && (await p.getAttribute('#nx-ctxbar', 'aria-expanded')) === 'true');
    await shot(p, 'panel-sheet-390');
    await p.keyboard.press('Escape'); await sleep(300);
    ok('Esc closes it and returns focus to the bar', !(await visible(p, '#nx-panel')) && (await p.evaluate(() => document.activeElement.id)) === 'nx-ctxbar');
    await p.click('#nx-ctxbar'); await sleep(300); await p.click('#nx-scrim', { position: { x: 20, y: 20 } }); await sleep(300);
    ok('tapping outside closes it', !(await visible(p, '#nx-panel')));
    await p.click('#nx-rtitle'); await sleep(350);
    ok('the reader\'s chapter title opens the sheet at the chapter map', await visible(p, '#nx-panel')
      && (await p.evaluate(() => document.getElementById('nx-map').open && document.activeElement === document.querySelector('#nx-map > summary'))));
    await p.click('#nx-map [data-go="5.2.1"]');
    await p.waitForFunction(() => NCERT.reader.getCurrentPageContext().printedPage === 140); await sleep(350);
    ok('choosing a section there turns the PDF and closes the sheet', !(await visible(p, '#nx-panel')));
    const ours = () => p.evaluate(() => !!(history.state && history.state.nxSheet));
    ok('every close so far (Esc, tap outside, a chapter-map choice) left no sheet entry behind', !(await ours()));
    ok('the sheet source summary is compact too', await p.evaluate(() => document.getElementById('nx-srcsum').hidden === false));

    // ---------------------------------------------------------------- browser Back
    console.log('=== browser Back and the sheet');
    const hb = await page({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await hb.goto(BASE + '#/'); await settled(hb);
    await hb.click('a.nx-chapter'); await settled(hb); await hb.waitForSelector('#nx-reader[data-reader-state="no_hosted_pdf"]');
    await choose(hb, LAB); await go(hb, 3);
    await hb.click('#nx-t-in'); await hb.click('#nx-t-in');
    await hb.waitForFunction(() => NCERT.reader.state().zoom === 1.5 && !NCERT.reader.stats().rendering); await sleep(200);
    const keep = async () => hb.evaluate(() => ({ route: location.hash, view: NCERT.state().view, state: NCERT.reader.state().state,
      page: NCERT.reader.getCurrentPageContext().pdfPage, zoom: NCERT.reader.state().zoom, hasDoc: NCERT.reader.stats().hasDoc,
      opened: NCERT.reader.stats().opened }));
    const k0 = await keep();
    await hb.click('#nx-ctxbar'); await sleep(350);
    ok('opening the sheet adds one history entry of its own (same address)', await visible(hb, '#nx-panel')
      && (await hb.evaluate(() => !!(history.state && history.state.nxSheet))) && (await hb.evaluate(() => location.hash)) === k0.route);
    await hb.goBack(); await sleep(400);
    let k1 = await keep();
    ok('browser Back closes the sheet and stays on the chapter', !(await visible(hb, '#nx-panel')) && k1.route === k0.route && k1.view === 'chapter');
    ok('...the same PDF, page and zoom, never reopened (page 3, 150 %)', JSON.stringify(k1) === JSON.stringify(k0), JSON.stringify([k0, k1]));
    ok('...and focus is back on the context bar', (await hb.evaluate(() => document.activeElement.id)) === 'nx-ctxbar');
    await hb.click('#nx-ctxbar'); await sleep(350);
    await hb.click('#nx-sheetclose'); await sleep(450);
    ok('closing with the x consumes the sheet entry', !(await visible(hb, '#nx-panel')) && !(await hb.evaluate(() => !!(history.state && history.state.nxSheet)))
      && JSON.stringify(await keep()) === JSON.stringify(k0));
    await hb.goBack(); await settled(hb);
    ok('...so the next Back leaves the chapter in one step, as normal (to browse)', (await hb.evaluate(() => NCERT.state().view)) === 'browse');
    ok('no errors', hb.errs.length === 0, hb.errs.join(' | '));
    await hb.context().close();
    const p2 = await page({ viewport: { width: 390, height: 844 } });
    await p2.goto(BASE + '#/'); await settled(p2);
    await p2.click('a.nx-chapter'); await settled(p2);
    await p2.goBack(); await settled(p2);
    ok('with no sheet open, browser Back navigates normally', (await p2.evaluate(() => NCERT.state().view)) === 'browse');
    await p2.context().close();
    const wide = await page({ viewport: { width: 1280, height: 900 } });
    await chapter(wide); await choose(wide, LAB);
    const len0 = await wide.evaluate(() => history.length);
    await wide.click('#nx-rtitle'); await wide.click('#nx-map [data-go="5.2.1"]'); await sleep(300);
    ok('on desktop there is no sheet and no extra history entry', (await wide.evaluate(() => history.length)) === len0
      && !(await wide.evaluate(() => !!(history.state && history.state.nxSheet))));
    await wide.context().close();
    ok('no errors', p.errs.length === 0, p.errs.join(' | '));
    await p.context().close();

    // ---------------------------------------------------------------- widths
    console.log('=== widths');
    for (const [w, h] of [[360, 780], [390, 844], [768, 1024], [960, 800], [1280, 900]]) {
      const lp = await page({ viewport: { width: w, height: h } });
      await chapter(lp);
      const meas = async () => lp.evaluate(() => {
        const vw = innerWidth, outside = [...document.querySelectorAll('body *')].filter(e => {
          if (e.closest('#nx-rpage') || e.closest('#nx-panel')) return false;     // a zoomed page scrolls in its box; the sheet is checked when open
          const r = e.getBoundingClientRect(); return r.width && r.right > vw + 0.5; });
        const lib = document.querySelector('.nx-lib').getBoundingClientRect(), cur = document.querySelector('.nx-path[aria-current]').getBoundingClientRect();
        const R = document.getElementById('nx-reader').getBoundingClientRect(), L = document.getElementById('nx-chlayout').getBoundingClientRect();
        return { over: document.documentElement.scrollWidth - vw, outside: outside.length, paths: lib.right <= vw && cur.right <= vw && lib.width > 0,
                 share: +(R.width / L.width).toFixed(3) };
      });
      let mm = await meas();
      ok(w + ' px, no PDF: no horizontal overflow; both learning paths on screen', mm.over <= 0 && mm.outside === 0 && mm.paths, JSON.stringify(mm));
      await choose(lp, LAB); await go(lp, 3);
      mm = await meas();
      ok(w + ' px, reading: no horizontal overflow', mm.over <= 0 && mm.outside === 0, JSON.stringify(mm));
      if (w >= 960) ok(w + ' px: the panel sits beside the reader (~70 / 30) and the bar is not shown', mm.share > 0.6 && mm.share < 0.75
        && await visible(lp, '#nx-panel') && !(await visible(lp, '#nx-ctxbar')), mm.share);
      else {
        ok(w + ' px: the reader takes the width and the bar offers the panel', mm.share > 0.99 && await visible(lp, '#nx-ctxbar'));
        await lp.click('#nx-ctxbar'); await sleep(350);
        const sh = await lp.evaluate(() => { const r = document.getElementById('nx-panel').getBoundingClientRect(); return { left: r.left, right: r.right, vw: innerWidth }; });
        ok(w + ' px: the open sheet fits the screen', sh.left >= 0 && sh.right <= sh.vw + 0.5, JSON.stringify(sh));
      }
      if (SHOTS && (w === 768 || w === 960)) await shot(lp, 'panel-reading-' + w);
      ok(w + ' px: no errors', lp.errs.length === 0, lp.errs.join(' | '));
      await lp.context().close();
    }

    // ---------------------------------------------------------------- keyboard
    console.log('=== keyboard');
    const k = await page();
    await chapter(k); await choose(k, LAB);
    await k.focus('#nx-map > summary'); await k.keyboard.press('Enter'); await sleep(100);
    ok('the chapter map opens from the keyboard', await k.evaluate(() => document.getElementById('nx-map').open));
    await k.focus('#nx-map [data-go="5.2.1"]'); await k.keyboard.press('Enter');
    await k.waitForFunction(() => NCERT.reader.getCurrentPageContext().printedPage === 140);
    ok('a section is a real button: Enter turns the PDF to it', (await k.evaluate(() => NCERT.reader.getCurrentPageContext().pdfPage)) === 5);
    await k.focus('#nx-rpage'); await k.keyboard.press('ArrowRight');
    await k.waitForFunction(() => NCERT.reader.getCurrentPageContext().pdfPage === 6);
    ok('the reader\'s keys still work with the panel in place', (await panel(k)).secs.join() === '5.2.1');
    ok('the panel\'s re-renders are silent; one polite line announces each change of place',
      (await k.getAttribute('#nx-panel', 'aria-live')) === 'off' && (await k.getAttribute('#nx-live', 'aria-live')) === 'polite');
    ok('the panel is a labelled landmark', (await k.getAttribute('#nx-panel', 'aria-label')) === 'Learning for this page'
      && (await k.evaluate(() => document.getElementById('nx-panel').tagName)) === 'ASIDE');
    await k.context().close();

    // ---------------------------------------------------------------- the JEE library still works
    console.log('=== the JEE library');
    const j = await page();
    await j.goto('http://127.0.0.1:' + P + '/'); await j.waitForSelector('article.card', { timeout: 15000 });
    const id = await j.$eval('article.card a.open', e => e.getAttribute('href'));
    await j.click('article.card a.open');
    await j.waitForFunction(() => { const f = document.querySelector('#rstage iframe'); return f && f.getAttribute('src'); });
    ok('the JEE library lists its simulations and opens one in its runner', /^#\/run\//.test(id) && /#\/run\//.test(await j.evaluate(() => location.hash)));
    ok('...without errors', j.errs.length === 0, j.errs.join(' | '));
    await j.context().close();
  } catch (err) {
    ok('suite ran to the end', false, err && err.stack);
  } finally {
    await b.close();
    site.kill();
  }
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  process.exit(bad ? 1 : 0);
})();
