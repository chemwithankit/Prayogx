const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { makePdf } = require('./ncert_pdf_fixture');
const { spawn } = require('child_process');
const crypto = require('crypto'), fs = require('fs'), net = require('net'), os = require('os'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   NCERT Explorer reader foundation (docs/NCERT.md, Phase 3A spike).

   A  the pinned PDF.js runtime and its worker
   B  a chapter with no hosted PDF: NO_HOSTED_PDF, the official link, and no
      PDF.js download at all
   C  a same-origin synthetic PDF (tests/ncert_pdf_fixture.js, built in memory):
      opens, counts its pages, really draws page 1
   D  a cross-origin source the browser refuses (a second local server with no
      CORS header): SOURCE_BLOCKED. With NCERT_ONLINE=1 the REAL official NCERT
      chapter is tried too, and the evidence printed.
   E  ERROR and RETRY
   F  cleanup: document, worker, render task, resize hook, object URLs
   G  layout: phone, tablet, desktop
   --------------------------------------------------------------------------- */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };
const freePort = () => new Promise(res => { const sv = net.createServer();
  sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
async function waitPort(p) {
  for (let i = 0; i < 50; i++) {
    const up = await new Promise(r => { const s = net.connect(p, '127.0.0.1', () => { s.end(); r(true); }); s.on('error', () => r(false)); });
    if (up) return; await sleep(100);
  }
}
const SHOTS = process.env.NCERT_SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (pg, name) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: false }); };

(async () => {
  const VDIR = ROOT + '/ncert/vendor/pdfjs-6.3.289';
  const feed = JSON.parse(fs.readFileSync(ROOT + '/content/ncert/NCERT-11-CHE-P1-CH05.json', 'utf8'));
  const OFFICIAL = feed.chapter.source.official;
  const CH = '#/11/chemistry/part-1/ch05';
  const FIX = '__test__/fixture.pdf';             // never on disk: served by request interception

  // the site, and a SECOND origin (different port) serving the fixture without any CORS header
  const P = await freePort(), P2 = await freePort();
  const site = spawn('python3', ['-m', 'http.server', String(P), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ncert-reader-'));
  fs.writeFileSync(path.join(tmp, 'other.pdf'), makePdf(2));
  const other = spawn('python3', ['-m', 'http.server', String(P2), '--bind', '127.0.0.1'], { cwd: tmp, stdio: 'ignore' });
  await waitPort(P); await waitPort(P2);
  const BASE = 'http://127.0.0.1:' + P + '/ncert/';
  const CROSS = 'http://localhost:' + P2 + '/other.pdf';   // localhost != 127.0.0.1: a different origin
  const b = await launch();

  async function page(opts, fixture) {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts || {}));
    // count workers and object URLs, so leaks are measured rather than assumed
    await ctx.addInitScript(() => {
      const W = window.Worker; window.__w = { made: 0, ended: 0 };
      window.Worker = function (u, o) { const w = new W(u, o); window.__w.made++;
        const t = w.terminate.bind(w); w.terminate = () => { window.__w.ended++; t(); }; return w; };
      window.Worker.prototype = W.prototype;
      const c = URL.createObjectURL, rv = URL.revokeObjectURL; window.__u = { made: 0, revoked: 0 };
      URL.createObjectURL = function (x) { window.__u.made++; return c.call(URL, x); };
      URL.revokeObjectURL = function (x) { window.__u.revoked++; return rv.call(URL, x); };
    });
    const pg = await ctx.newPage();
    pg.errs = []; pg.reqs = []; pg.allErrs = [];
    pg.on('pageerror', e => { pg.errs.push(e.message); pg.allErrs.push(e.message); });
    pg.on('console', m => { if (m.type() === 'error') { pg.allErrs.push(m.text()); if (!pg.expectNetErrors) pg.errs.push(m.text()); } });
    pg.on('request', r => pg.reqs.push(r.url()));
    if (fixture !== false) await pg.route('**/ncert/' + FIX, rt => rt.fulfill({ contentType: 'application/pdf', body: makePdf(3) }));
    return pg;
  }
  const settled = pg => pg.waitForFunction(() => window.NCERT && NCERT.state().status !== 'loading'
    && NCERT.state().route === (location.hash || '#/'), null, { timeout: 15000 });
  const rsettled = pg => pg.waitForFunction(() => { const s = NCERT.reader.state(); return s && s.state !== 'loading'; }, null, { timeout: 60000 });
  const rstate = pg => pg.evaluate(() => NCERT.reader.state());
  const open = async (pg, src) => { await pg.evaluate(s => NCERT.reader.open(s), src); await rsettled(pg); return rstate(pg); };

  try {
    // ---------------------------------------------------------------- A
    console.log('=== A. PDF.js runtime');
    const ver = fs.readFileSync(VDIR + '/VERSION.txt', 'utf8');
    for (const f of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
      const h = crypto.createHash('sha256').update(fs.readFileSync(VDIR + '/' + f)).digest('hex');
      ok('vendored ' + f + ' is unmodified (matches VERSION.txt)', ver.indexOf(h + '  ' + f) >= 0, h.slice(0, 12));
    }
    ok('the PDF.js licence ships beside it (Apache-2.0)', /Apache License/.test(fs.readFileSync(VDIR + '/LICENSE', 'utf8')));
    const a = await page();
    await a.goto(BASE + CH); await settled(a);
    const st0 = await open(a, { url: FIX });
    const rt = await a.evaluate(() => ({ v: NCERTPDF.version, w: NCERTPDF.workerSrc }));
    ok('the runtime reports the pinned version 6.3.289', rt.v === '6.3.289' && st0.version === '6.3.289', rt.v);
    ok('the worker is the vendored one, same origin', rt.w === BASE + 'vendor/pdfjs-6.3.289/pdf.worker.min.mjs', rt.w);
    const wres = await a.evaluate(u => fetch(u).then(r => [r.status, r.headers.get('content-type')]), rt.w);
    ok('the worker file is served as JavaScript', wres[0] === 200 && /javascript/.test(wres[1]), wres.join(' '));
    ok('a module worker was started for the document', (await a.evaluate(() => window.__w.made)) === 1);
    await a.context().close();

    // ---------------------------------------------------------------- B
    console.log('=== B. no hosted PDF');
    const bp = await page();
    await bp.goto(BASE + '#/'); await settled(bp);
    ok('browse never loads PDF.js', !bp.reqs.some(u => /\.mjs|pdfjs/.test(u)));
    await bp.click('a.nx-chapter'); await settled(bp);
    await bp.waitForSelector('#nx-reader[data-reader-state="no_hosted_pdf"]');
    let s = await rstate(bp);
    ok('a chapter without a hosted PDF says so: NO_HOSTED_PDF', s.state === 'no_hosted_pdf', JSON.stringify(s));
    ok('...and never loads PDF.js or requests any PDF', !bp.reqs.some(u => /\.mjs|pdfjs|\.pdf/.test(u))
      && (await bp.evaluate(() => NCERT.reader.stats().bridgeLoads)) === 0);
    const links = await bp.$$eval('#nx-chlayout a[href]', e => e.map(x => [x.getAttribute('href'), x.target, x.rel]));
    ok('the official NCERT PDF is offered (reader step and source card), opening in a new tab',
      links.length === 2 && links.every(l => l[0] === OFFICIAL && l[1] === '_blank' && /noopener/.test(l[2])), JSON.stringify(links));
    ok('the official link is the catalogue\'s source, on ncert.nic.in', /^https:\/\/ncert\.nic\.in\/textbook\/pdf\/kech105\.pdf$/.test(OFFICIAL));
    ok('no canvas is shown when there is no PDF', (await bp.$('#nx-reader canvas')) === null);
    ok('no errors', bp.errs.length === 0, bp.errs.join(' | '));
    await shot(bp, 'reader-no-hosted-1280');

    // ---------------------------------------------------------------- C
    console.log('=== C. same-origin synthetic PDF');
    s = await open(bp, { url: FIX });
    ok('the synthetic PDF opens: READY', s.state === 'ready', JSON.stringify(s));
    ok('its page count is detected (3)', s.pages === 3);
    ok('the toolbar says page 1 of 3', (await bp.inputValue('#nx-pageno')) === '1' && (await bp.innerText('#nx-pagetotal')) === '/ 3');
    const hold = await bp.$eval('#nx-rpage canvas', c => c.parentNode.clientWidth);
    ok('page 1 is drawn at the reader\'s width, aspect kept (A4)', s.drawn && s.drawn.pageNumber === 1
      && Math.abs(s.drawn.cssWidth - hold) <= 1 && Math.abs(s.drawn.cssHeight / s.drawn.cssWidth - 842 / 595) < 0.01, JSON.stringify(s.drawn));
    const px = await bp.$eval('#nx-rpage canvas', c => {
      const x = c.getContext('2d'), w = c.width, h = c.height;
      const at = (fx, fy) => Array.from(x.getImageData(Math.floor(w * fx), Math.floor(h * fy), 1, 1).data);
      return { band: at(0.5, (842 - 760) / 842), square: at((60 + 25) / 595, (842 - 585) / 842), blank: at(0.5, 0.5) };
    });
    ok('the pixels really are the fixture: blue band, dark square, white page',
      px.band[2] > 180 && px.band[0] < 80 && px.square[0] < 60 && px.blank[0] > 240 && px.blank[2] > 240, JSON.stringify(px));
    ok('no errors while opening and drawing', bp.errs.length === 0, bp.errs.join(' | '));
    await shot(bp, 'reader-ready-1280');

    // ---------------------------------------------------------------- D
    console.log('=== D. a source the browser refuses');
    bp.expectNetErrors = true;
    s = await open(bp, { url: CROSS });
    ok('a cross-origin PDF without CORS headers: SOURCE_BLOCKED', s.state === 'source_blocked', JSON.stringify(s.detail));
    ok('...classified from evidence: cross-origin, no HTTP status', s.detail && s.detail.crossOrigin === true && !s.detail.status);
    ok('...the browser itself reported the CORS refusal', bp.allErrs.some(e => /blocked by CORS policy/.test(e)));
    ok('...nothing from the previous document remains', s.pages === 0 && s.drawn === null && (await bp.$('#nx-rpage canvas')) === null);
    ok('...the official link and Try again are offered', (await bp.$('#nx-rbody a.nx-btn[href="' + OFFICIAL + '"]')) !== null
      && (await bp.$('#nx-rretry')) !== null);
    await shot(bp, 'reader-blocked-1280');
    if (process.env.NCERT_ONLINE === '1') {
      console.log('--- the real official NCERT chapter (NCERT_ONLINE=1)');
      const before = bp.allErrs.length;
      const fails = []; bp.on('requestfailed', r => { if (r.url() === OFFICIAL) fails.push(r.failure() && r.failure().errorText); });
      s = await open(bp, { url: OFFICIAL });
      const cors = bp.allErrs.slice(before).filter(e => /ncert\.nic\.in/.test(e) && /CORS/.test(e));
      console.log('      PDF.js result: ' + JSON.stringify(s.detail));
      console.log('      browser:       ' + (cors[0] || '(no CORS message)'));
      console.log('      requests:      ' + fails.length + ' failed (' + [...new Set(fails)].join(', ') + ')');
      ok('OFFICIAL NCERT PDF through PDF.js: SOURCE_BLOCKED by CORS (no Access-Control-Allow-Origin)',
        s.state === 'source_blocked' && cors.length > 0 && /No 'Access-Control-Allow-Origin' header/.test(cors[0]), s.state);
      const xhr = await bp.evaluate(u => new Promise(r => { const x = new XMLHttpRequest(); x.open('GET', u);
        x.onloadend = () => r(x.status); x.send(); }), OFFICIAL);
      ok('a plain XMLHttpRequest from the page is refused the same way (status 0)', xhr === 0, xhr);
      // the fallback: a top-level browser navigation to the official file
      const nav = await b.newContext({ acceptDownloads: true });
      const np = await nav.newPage();
      const got = new Promise(r => np.on('response', x => { if (x.url() === OFFICIAL) r(x); }));
      np.goto(OFFICIAL).catch(() => {});
      const resp = await Promise.race([got, sleep(30000).then(() => null)]);
      const h = resp ? resp.headers() : {};
      console.log('      top-level:     HTTP ' + (resp && resp.status()) + ', ' + h['content-type'] + ', ' +
        (h['content-length'] || '?') + ' bytes, ACAO ' + (h['access-control-allow-origin'] || 'absent') +
        ', X-Frame-Options ' + (h['x-frame-options'] || 'absent').replace(/\s*\n\s*/g, ', '));
      ok('opening the official link directly works: HTTP 200, application/pdf',
        resp && resp.status() === 200 && /application\/pdf/.test(h['content-type'] || ''), resp && resp.status());
      ok('...and it carries no Access-Control-Allow-Origin header (why PDF.js cannot read it)', !h['access-control-allow-origin']);
      await nav.close();
    } else {
      console.log('      (set NCERT_ONLINE=1 to try the real official NCERT chapter too)');
    }
    bp.expectNetErrors = false;

    // ---------------------------------------------------------------- E
    console.log('=== E. error and retry');
    const e = await page(undefined, false);
    await e.goto(BASE + CH); await settled(e);
    e.expectNetErrors = true;
    await e.route('**/ncert/' + FIX, r => r.fulfill({ status: 404, body: 'gone' }));
    s = await open(e, { url: FIX });
    ok('a same-origin 404: ERROR (not blocked), with the HTTP status', s.state === 'error' && s.detail.status === 404, JSON.stringify(s.detail));
    await e.unroute('**/ncert/' + FIX);
    await e.route('**/ncert/' + FIX, r => r.fulfill({ contentType: 'application/pdf', body: Buffer.from('%PDF-1.4 not really') }));
    s = await open(e, { url: FIX });
    ok('a corrupt PDF: CORRUPT_PDF (Phase 3B), named by PDF.js', s.state === 'corrupt_pdf' && /InvalidPDF/.test(s.detail.name), JSON.stringify(s.detail));
    await shot(e, 'reader-error-1280');
    await e.unroute('**/ncert/' + FIX);
    await e.route('**/ncert/' + FIX, r => r.fulfill({ contentType: 'application/pdf', body: makePdf(3) }));
    e.expectNetErrors = false;
    await e.click('#nx-rretry'); await rsettled(e);
    s = await rstate(e);
    ok('Try again recovers once the source is good: READY', s.state === 'ready' && s.pages === 3, JSON.stringify(s));
    ok('no stray errors after recovery', e.errs.length === 0, e.errs.join(' | '));
    const bl = await page(undefined, false);
    await bl.route('**/ncert/reader.mjs', r => r.abort());
    await bl.goto(BASE + CH); await settled(bl);
    bl.expectNetErrors = true;
    s = await open(bl, { url: FIX });
    ok('the reader module failing to load: ERROR, not a hang', s.state === 'error' && s.detail.name === 'BridgeError', JSON.stringify(s.detail));
    await bl.unroute('**/ncert/reader.mjs');
    await bl.route('**/ncert/' + FIX, r => r.fulfill({ contentType: 'application/pdf', body: makePdf(1) }));
    await bl.click('#nx-rretry'); await rsettled(bl);
    ok('...and Try again loads it the second time', (await rstate(bl)).state === 'ready');
    await bl.context().close();

    // ---------------------------------------------------------------- F
    console.log('=== F. cleanup');
    let w = await e.evaluate(() => window.__w);
    ok('one live worker for the one open document', w.made - w.ended === 1, JSON.stringify(w));
    s = await open(e, { url: FIX });
    w = await e.evaluate(() => window.__w);
    ok('opening another document ends the previous worker first', s.state === 'ready' && w.made - w.ended === 1, JSON.stringify(w));
    await e.setViewportSize({ width: 1100, height: 900 }); await sleep(600);
    s = await rstate(e);
    const hold2 = await e.$eval('#nx-rpage canvas', c => c.parentNode.clientWidth);
    ok('a resize redraws page 1 at the new width, without a new worker',
      Math.abs(s.drawn.cssWidth - hold2) <= 1 && (await e.evaluate(() => window.__w.made - window.__w.ended)) === 1, JSON.stringify(s.drawn));
    await e.evaluate(() => { location.hash = '#/'; }); await settled(e); await sleep(300);
    const after = await e.evaluate(() => ({ r: NCERT.reader.state(), st: NCERT.reader.stats(), w: window.__w, u: window.__u }));
    ok('leaving the chapter destroys the document and terminates every worker',
      after.r === null && !after.st.hasDoc && after.w.made === after.w.ended, JSON.stringify(after));
    ok('no render task is left running', after.st.rendering === false);
    ok('no object URL was ever created (bytes are passed directly, nothing to revoke)', after.u.made === 0 && after.u.revoked === 0);
    const slow = await page(undefined, false);
    let release; const gate = new Promise(r => { release = r; });
    await slow.route('**/ncert/' + FIX, async r => { await gate; await r.fulfill({ contentType: 'application/pdf', body: makePdf(3) }); });
    await slow.goto(BASE + CH); await settled(slow);
    await slow.evaluate(s2 => NCERT.reader.open(s2), { url: FIX });
    await slow.waitForFunction(() => window.__w.made === 1);
    await slow.evaluate(() => { location.hash = '#/'; }); await settled(slow);
    release(); await sleep(800);
    const late = await slow.evaluate(() => ({ r: NCERT.reader.state(), w: window.__w, canvases: document.querySelectorAll('canvas').length }));
    ok('leaving while a PDF is still loading: it is abandoned, its worker ended, nothing drawn later',
      late.r === null && late.w.made === late.w.ended && late.canvases === 0, JSON.stringify(late));
    ok('no errors in the cleanup runs', e.errs.length === 0 && slow.errs.length === 0, e.errs.concat(slow.errs).join(' | '));
    await slow.context().close();
    await e.context().close();

    // ---------------------------------------------------------------- G
    console.log('=== G. layout');
    for (const [wd, ht] of [[360, 780], [390, 844], [768, 1024], [1280, 900]]) {
      const lp = await page({ viewport: { width: wd, height: ht } });
      for (const mode of ['no_hosted_pdf', 'ready']) {
        await lp.goto(BASE + CH); await settled(lp);
        await lp.waitForSelector('#nx-reader[data-reader-state="no_hosted_pdf"]');
        if (mode === 'ready') await open(lp, { url: FIX });
        const m = await lp.evaluate(() => {
          const vw = window.innerWidth, r = document.getElementById('nx-reader').getBoundingClientRect(),
            o = document.querySelector('.nx-context').getBoundingClientRect(), l = document.querySelector('.nx-chlayout').getBoundingClientRect();
          const out = [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.right > vw + 0.5; });
          const btn = [...document.querySelectorAll('#nx-reader .nx-btn, #nx-reader a.nx-rofficial')].map(x => x.getBoundingClientRect().height);
          return { over: document.documentElement.scrollWidth - vw, outside: out.length, share: r.width / l.width,
                   readerFirst: r.top < o.top, beside: Math.abs(r.top - o.top) < 2, minTarget: btn.length ? Math.min.apply(null, btn) : 0 };
        });
        const label = wd + ' px ' + mode;
        ok(label + ': no horizontal overflow, nothing past the edge', m.over <= 0 && m.outside === 0, JSON.stringify(m));
        if (wd >= 960) ok(label + ': reader beside the context column, about 70 % of the width', m.beside && m.share > 0.65 && m.share < 0.75, m.share.toFixed(3));
        else ok(label + ': the reader comes first, full width', m.readerFirst && m.share > 0.99, JSON.stringify(m));
        if (mode === 'no_hosted_pdf') ok(label + ': links and buttons are touch-sized (>= 32 px)', m.minTarget >= 32, m.minTarget);
        if (wd !== 1280) await shot(lp, 'reader-' + mode + '-' + wd);
      }
      ok(wd + ' px: no errors', lp.errs.length === 0, lp.errs.join(' | '));
      await lp.context().close();
    }
  } catch (err) {
    ok('suite ran to the end', false, err && err.stack);
  } finally {
    await b.close();
    site.kill(); other.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  process.exit(bad ? 1 : 0);
})();
