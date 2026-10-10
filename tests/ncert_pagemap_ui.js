const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { makePdf } = require('./ncert_pdf_fixture');
const { spawn } = require('child_process');
const fs = require('fs'), net = require('net');
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* NCERT Explorer MVP, end to end in a browser: Chapter 5 -> read a page -> the panel shows ONLY what is
   mapped to that printed page -> the panel follows page changes -> deep links. The fixture PDF has 12
   pages labelled 136-147 (pdf page n = printed n+135), so real Chapter 5 page mappings resolve. */
let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };
const freePort = () => new Promise(res => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
(async () => {
  const CH = '#/11/chemistry/part-1/ch05';
  const feed = JSON.parse(fs.readFileSync(ROOT + '/content/ncert/NCERT-11-CHE-P1-CH05.json', 'utf8'));
  const LAB = makePdf(12, { labels: 136 });
  const P = await freePort();
  const site = spawn('python3', ['-m', 'http.server', String(P), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { if (await new Promise(r => { const s = net.connect(P, '127.0.0.1', () => { s.end(); r(true); }); s.on('error', () => r(false)); })) break; await sleep(100); }
  const BASE = 'http://127.0.0.1:' + P + '/ncert/';
  const b = await launch();
  const newPage = async vp => { const c = await b.newContext({ viewport: vp || { width: 1280, height: 900 } }); const pg = await c.newPage();
    pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') pg.errs.push(m.text()); }); return pg; };
  const settled = pg => pg.waitForFunction(() => window.NCERT && NCERT.state().status !== 'loading' && NCERT.state().route === (location.hash || '#/'), null, { timeout: 15000 });
  const choose = async pg => { const fc = pg.waitForEvent('filechooser'); await pg.click('#nx-reader [data-choose]');
    await (await fc).setFiles({ name: 'kech105.pdf', mimeType: 'application/pdf', buffer: LAB });
    await pg.waitForFunction(() => { const s = NCERT.reader.state(); return s && s.state === 'ready' && NCERT.reader.getCurrentPageContext(); }, null, { timeout: 60000 }); await sleep(200); };
  const go = async (pg, printed) => { const pdf = printed - 135; await pg.fill('#nx-pageno', String(pdf)); await pg.press('#nx-pageno', 'Enter');
    await pg.waitForFunction(p => { const c = NCERT.reader.getCurrentPageContext(); return c && c.pdfPage === p && !NCERT.reader.stats().rendering; }, pdf); await sleep(150); };
  const shown = pg => pg.evaluate(() => ({
    understand: [...document.querySelectorAll('#nx-understand:not([hidden]) .nx-applink')].map(a => a.getAttribute('data-sim')),
    apply: [...document.querySelectorAll('#nx-apply:not([hidden]) .nx-applink')].map(a => a.getAttribute('data-sim')) }));
  const want = p => { const m = feed.pageMap[String(p)] || { understand: [], apply: [] }; return { understand: m.understand, apply: m.apply }; };
  const same = (a, b2) => JSON.stringify(a) === JSON.stringify(b2);
  try {
    const pg = await newPage();
    await pg.goto(BASE + CH); await settled(pg); await pg.waitForSelector('#nx-reader[data-reader-state="no_hosted_pdf"]');
    await choose(pg);
    ok('Chapter 5 opens and the reader reports a printed page', (await pg.evaluate(() => NCERT.reader.getCurrentPageContext().printedPage)) === 136);
    for (const p of [143, 144, 145, 146, 147, 140, 137]) {
      await go(pg, p);
      const got = await shown(pg);
      ok('p.' + p + ' shows exactly its mapped resources', same(got, want(p)), JSON.stringify(got));
    }
    await go(pg, 143);
    ok('p.143 does not show the calorimeter page (mapped to 144-146 only)', (await shown(pg)).understand.indexOf('CON-CHE-CALORIMETER-01') < 0);
    ok('the address bar follows the page (deep link)', (await pg.evaluate(() => location.hash)) === CH + '/p143');
    ok('...and Chapter 5 mapped concept pages open the existing experience', await pg.evaluate(() => { const a = document.querySelector('#nx-understand .nx-applink'); return !!a && /con-che-delta-u-vs-delta-h/.test(a.getAttribute('href')); }));

    // reload with the deep link: before a PDF is open the panel already knows the page
    await pg.goto(BASE + CH + '/p145'); await pg.reload(); await settled(pg);
    await pg.waitForSelector('#nx-reader[data-reader-state="no_hosted_pdf"]');
    ok('deep link without a PDF: the panel shows page 145 resources', same(await shown(pg), want(145)), JSON.stringify(await shown(pg)));
    await choose(pg);
    ok('deep link then PDF: the reader opens at printed page 145', (await pg.evaluate(() => NCERT.reader.getCurrentPageContext().printedPage)) === 145);
    ok('...and the panel still matches', same(await shown(pg), want(145)));
    await pg.goto(BASE + CH + '/pabc'); await sleep(300);
    ok('a malformed page segment is not found, not a crash', (await pg.evaluate(() => NCERT.state().status)) === 'notfound');
    ok('no console errors (desktop)', pg.errs.length === 0, pg.errs.join(' | '));

    // phone
    const ph = await newPage({ width: 390, height: 844 });
    await ph.goto(BASE + CH); await settled(ph); await ph.waitForSelector('#nx-reader[data-reader-state="no_hosted_pdf"]');
    await choose(ph); await go(ph, 144);
    ok('phone: panel content for p.144 matches', same(await shown(ph), want(144)));
    ok('phone: no horizontal overflow at 390px', await ph.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    ok('phone: the context bar appears for a page with resources', await ph.evaluate(() => !document.getElementById('nx-ctxbar').hidden));
    await go(ph, 147);
    ok('phone: the context bar disappears on a page with none', await ph.evaluate(() => document.getElementById('nx-ctxbar').hidden));
    ok('no console errors (phone)', ph.errs.length === 0, ph.errs.join(' | '));
  } catch (e) { bad++; console.log('FAIL  exception: ' + (e && e.stack || e)); }
  await b.close(); site.kill();
  console.log('\n' + (n - bad) + '/' + n + ' passed'); process.exit(bad ? 1 : 0);
})();
