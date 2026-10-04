const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { makePdf } = require('./ncert_pdf_fixture');
const { spawn } = require('child_process');
const crypto = require('crypto'), fs = require('fs'), net = require('net'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   NCERT Explorer: the student's own PDF (docs/NCERT.md, Phase 3B).

   The student downloads the official chapter from NCERT and picks it here; the
   bytes go from the file input straight into PDF.js. Every PDF in this suite is
   synthetic (tests/ncert_pdf_fixture.js), built in memory and handed to the real
   <input type="file"> through the browser's own file chooser.

   A  the file picker        F  readable but unverified (and no Web Crypto)
   B  a local load            G  navigation
   P  privacy: it stays here  H  zoom and the canvas clamp
   C  invalid files           I  cleanup
   D  corrupt / unsupported   PC the page context contract, EM the ExperienceMapper seam
   E  an exact edition match  J  phone, tablet, desktop

   NCERT_SHOTS=<dir> saves screenshots of the main states.
   --------------------------------------------------------------------------- */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };
const freePort = () => new Promise(res => { const sv = net.createServer();
  sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
const SHOTS = process.env.NCERT_SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (pg, name, full) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: !!full }); };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const pdfFile = (name, buf, type) => ({ name, mimeType: type === undefined ? 'application/pdf' : type, buffer: buf });

(async () => {
  const CH = '#/11/chemistry/part-1/ch05';
  const FEED = '/content/ncert/NCERT-11-CHE-P1-CH05.json';
  const feed = JSON.parse(fs.readFileSync(ROOT + FEED, 'utf8'));
  const MARK = 'PRAYOGX-PRIVACY-MARKER-7f3a';                       // a string only the PDF bytes contain
  const GOOD = makePdf(3, { marker: MARK }), FIVE = makePdf(5), OTHER = makePdf(4);

  const P = await freePort();
  const site = spawn('python3', ['-m', 'http.server', String(P), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    const up = await new Promise(r => { const s = net.connect(P, '127.0.0.1', () => { s.end(); r(true); }); s.on('error', () => r(false)); });
    if (up) break; await sleep(100);
  }
  const BASE = 'http://127.0.0.1:' + P + '/ncert/';
  const b = await launch();

  async function page(opts, init) {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts || {}));
    await ctx.addInitScript(() => {
      const W = window.Worker; window.__w = { made: 0, ended: 0 };
      window.Worker = function (u, o) { const w = new W(u, o); window.__w.made++;
        const t = w.terminate.bind(w); w.terminate = () => { window.__w.ended++; t(); }; return w; };
      window.Worker.prototype = W.prototype;
      const c = URL.createObjectURL; window.__u = 0;
      URL.createObjectURL = function (x) { window.__u++; return c.call(URL, x); };
      // record what the reader hands to PDF.js, without changing it
      window.__opened = [];
      let real;
      Object.defineProperty(window, 'NCERTPDF', { configurable: true,
        get() { return real; },
        set(v) { const o = v.open; v.open = function (src) {
          window.__opened.push(src && src.data ? { kind: 'data', type: Object.prototype.toString.call(src.data), bytes: src.data.byteLength }
                                               : { kind: 'url', url: src && src.url });
          return o.call(this, src); }; real = v; } });
    });
    if (init) await ctx.addInitScript(init);
    const pg = await ctx.newPage();
    pg.errs = []; pg.reqs = []; pg.logs = [];
    pg.on('pageerror', e => pg.errs.push(e.message));
    pg.on('console', m => { pg.logs.push(m.text()); if (m.type() === 'error') pg.errs.push(m.text()); });
    pg.on('request', r => pg.reqs.push({ m: r.method(), u: r.url(), body: r.postData() }));
    return pg;
  }
  const settled = pg => pg.waitForFunction(() => window.NCERT && NCERT.state().status !== 'loading'
    && NCERT.state().route === (location.hash || '#/'), null, { timeout: 15000 });
  const rs = pg => pg.evaluate(() => NCERT.reader.state());
  const idle = ['ready', 'invalid_file', 'corrupt_pdf', 'unsupported_pdf', 'error', 'no_hosted_pdf'];
  async function settle(pg, mark) {
    // wait until the reader has finished with this pick: its LATEST step is a resting one and
    // nothing is drawing. (With a document already open the state stays "ready" while a new
    // file is checked, so the state alone would say "done" too early.)
    await pg.waitForFunction(([idle, mark]) => { const s = NCERT.reader.state(), t = NCERT.reader.stats();
      const last = s && s.history[s.history.length - 1];
      return s && s.history.length > mark && idle.indexOf(last) >= 0 && idle.indexOf(s.state) >= 0 && !t.rendering; },
      [idle, mark], { timeout: 60000 });
    return rs(pg);
  }
  async function choose(pg, file, via) {
    const mark = (await rs(pg)).history.length;
    const fc = pg.waitForEvent('filechooser');
    await pg.click(via || '#nx-reader [data-choose], #nx-choose-card:visible');
    await (await fc).setFiles(file);
    return settle(pg, mark);
  }
  async function chapter(pg) {
    await pg.goto(BASE + CH); await settled(pg);
    await pg.waitForSelector('#nx-reader[data-reader-state="no_hosted_pdf"]');
  }
  // UX-1: once a PDF is open the verification details sit in the source card's collapsed
  // "Details"; open it, as a student would, before reading the wording
  const verifyText = async pg => {
    await pg.evaluate(() => { const d = document.getElementById('nx-srcmore'); if (d) d.open = true; });
    return pg.innerText('#nx-verify');
  };
  const squares = pg => pg.$eval('#nx-rpage canvas', c => {
    const x = c.getContext('2d'), w = c.width, h = c.height, H = 842;
    const dark = i => { const d = x.getImageData(Math.floor(w * (85 + i * 70) / 595), Math.floor(h * (H - 585) / H), 1, 1).data; return d[0] < 60; };
    let k = 0; while (k < 8 && dark(k)) k++; return k;
  });

  try {
    // ---------------------------------------------------------------- A
    console.log('=== A. the file picker');
    const a = await page();
    await chapter(a);
    const inp = await a.$eval('#nx-file', e => ({ type: e.type, accept: e.getAttribute('accept'), form: !!e.form, name: e.name,
      multiple: e.multiple, inDoc: document.body.contains(e) }));
    ok('a standard <input type="file" accept="application/pdf">', inp.type === 'file' && inp.accept === 'application/pdf' && inp.inDoc, JSON.stringify(inp));
    ok('...not in any form, so nothing can ever submit it', !inp.form && !inp.name && !inp.multiple);
    const btn = await a.$eval('#nx-reader [data-choose]', e => ({ tag: e.tagName, type: e.type, text: e.innerText, h: e.getBoundingClientRect().height }));
    ok('"Choose PDF" is a real button, touch-sized', btn.tag === 'BUTTON' && btn.type === 'button' && /Choose PDF/.test(btn.text) && btn.h >= 40, JSON.stringify(btn));
    const steps = await a.innerText('#nx-reader .nx-steps');
    ok('the two steps read: download the official PDF, then choose it', /Download the official chapter PDF/.test(steps) && /Already downloaded it\?/.test(steps));
    ok('nothing says PrayogX hosts the PDF', /does not host/.test(await a.innerText('#nx-reader')) && !/hosted by PrayogX/i.test(await a.innerText('main')));
    await a.focus('#nx-reader [data-choose]');
    const kb = a.waitForEvent('filechooser', { timeout: 5000 }).then(() => true, () => false);
    await a.keyboard.press('Enter');
    ok('the picker opens from the keyboard too (Enter on the button)', await kb);
    await shot(a, 'local-home-1280');
    await a.context().close();

    // ---------------------------------------------------------------- B + P
    console.log('=== B. a local PDF');
    const bp = await page();
    await chapter(bp);
    const before = bp.reqs.length;
    let s = await choose(bp, pdfFile('kech105.pdf', GOOD));
    ok('the chosen PDF opens: READY', s.state === 'ready', JSON.stringify(s.history));
    ok('it went file_selected -> validating -> loading -> ready', JSON.stringify(s.history.filter((x, i, l) => l[i - 1] !== x))
      === JSON.stringify(['no_hosted_pdf', 'file_selected', 'validating', 'loading', 'ready']), s.history.join(' > '));
    ok('its page count is detected (3) and page 1 is drawn', s.pages === 3 && s.page === 1 && s.drawn.pageNumber === 1);
    ok('the canvas really shows page 1 (blue band, one square)', (await squares(bp)) === 1);
    const opened = await bp.evaluate(() => window.__opened);
    ok('PDF.js was given the bytes themselves ({data: Uint8Array}), not a URL',
      opened.length === 1 && opened[0].kind === 'data' && opened[0].type === '[object Uint8Array]' && opened[0].bytes === GOOD.length, JSON.stringify(opened));
    ok('the source is recorded as local, with name, size and SHA-256',
      s.source === 'local' && s.file.name === 'kech105.pdf' && s.file.size === GOOD.length && s.file.sha256 === sha(GOOD));
    console.log('=== P. privacy: the PDF stays in the browser');
    const after = bp.reqs.slice(before);
    ok('choosing the file made no request except loading the reader\'s own scripts',
      after.every(r => r.m === 'GET' && /\/ncert\/(reader\.mjs|vendor\/pdfjs-6\.3\.289\/pdf(\.worker)?\.min\.mjs)$/.test(r.u)),
      after.map(r => r.m + ' ' + r.u.replace(/^https?:\/\/[^/]+/, '')).join(' | '));
    ok('no upload: no POST / PUT, and no request carries a body', bp.reqs.every(r => r.m === 'GET' && !r.body));
    ok('no request mentions the file name or any PDF', !bp.reqs.some(r => /kech105|\.pdf/i.test(r.u)));
    await bp.click('#nx-t-next'); await bp.click('#nx-t-in'); await settle(bp, 0);
    const store = await bp.evaluate(async () => ({ ls: Object.keys(localStorage), ss: Object.keys(sessionStorage),
      idb: indexedDB.databases ? (await indexedDB.databases()).map(d => d.name) : 'n/a',
      caches: window.caches ? await caches.keys() : [], urls: window.__u, sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller) }));
    ok('nothing is stored: no localStorage, sessionStorage or IndexedDB entry, no cache', store.ls.length === 0 && store.ss.length === 0
      && Array.isArray(store.idb) && store.idb.length === 0 && store.caches.length === 0, JSON.stringify(store));
    ok('no object URL was ever made for it', store.urls === 0);
    ok('no service worker controls this page in the test (and the page registers none)', !store.sw
      && !/serviceWorker/.test(fs.readFileSync(ROOT + '/ncert/ncert.js', 'utf8')));
    ok('the file\'s contents never reach the console or a URL', !bp.logs.some(l => l.indexOf(MARK) >= 0) && !bp.reqs.some(r => r.u.indexOf(MARK) >= 0));
    ok('the reader keeps no copy of the bytes (PDF.js holds them; the state has none)',
      !/"data"|Uint8Array/.test(JSON.stringify(await rs(bp))) && (await bp.evaluate(() => NCERT.reader.state().source)) === 'local');
    ok('no errors', bp.errs.length === 0, bp.errs.join(' | '));
    await shot(bp, 'local-ready-1280');
    await bp.context().close();

    // ---------------------------------------------------------------- C
    console.log('=== C. invalid files');
    const c = await page();
    await chapter(c);
    s = await choose(c, pdfFile('notes.txt', Buffer.from('These are my notes.\n'), 'text/plain'));
    ok('a text file: INVALID_FILE, "not a PDF"', s.state === 'invalid_file' && s.notice.kind === 'not_pdf' && /not a PDF/.test(s.notice.message), JSON.stringify(s.notice));
    ok('...the message is actionable and offers another choice', /Choose the chapter PDF/.test(await c.innerText('#nx-rbody'))
      && (await c.$('#nx-rbody [data-choose]')) !== null);
    ok('...said once, in the reader (not repeated in the source card)', (await c.$('#nx-verify [data-notice]')) === null);
    await shot(c, 'local-invalid-1280');
    s = await choose(c, pdfFile('photo.pdf', Buffer.from('\x89PNG\r\n\x1a\nnot a pdf at all', 'latin1')));
    ok('a PNG claiming to be application/pdf: refused by its signature, not trusted by MIME', s.state === 'invalid_file' && s.notice.kind === 'not_pdf');
    s = await choose(c, pdfFile('empty.pdf', Buffer.alloc(0)));
    ok('an empty file: refused', s.state === 'invalid_file' && s.notice.kind === 'empty');
    const old = await c.evaluate(() => NCERT.reader._setMaxFileBytes(100));
    s = await choose(c, pdfFile('big.pdf', GOOD));
    await c.evaluate(o => NCERT.reader._setMaxFileBytes(o), old);
    ok('a file over the size limit: refused, saying the size and the limit', s.state === 'invalid_file' && s.notice.kind === 'too_large'
      && /KB/.test(s.notice.message) && /up to/.test(s.notice.message), s.notice && s.notice.message);
    ok('the real limit is 150 MB', old === 150 * 1024 * 1024, old);
    s = await choose(c, pdfFile('download', GOOD, 'application/octet-stream'));
    ok('a real PDF with a generic MIME type is accepted (the signature decides)', s.state === 'ready');
    s = await choose(c, pdfFile('junk-first.pdf', makePdf(2, { prefix: 'garbage before the header\n' })));
    ok('"%PDF-" after a little leading junk is accepted, as the PDF specification allows', s.state === 'ready' && s.pages === 2, s.state);
    ok('no PDF.js was involved in refusing the invalid files', (await c.evaluate(() => window.__opened.length)) === 2);
    ok('no errors', c.errs.length === 0, c.errs.join(' | '));
    await c.context().close();

    // ---------------------------------------------------------------- D
    console.log('=== D. corrupt and unsupported PDFs');
    const d = await page();
    await chapter(d);
    s = await choose(d, pdfFile('broken.pdf', Buffer.from('%PDF-1.4\nthis is not a real PDF body\n%%EOF\n')));
    ok('a corrupt PDF: CORRUPT_PDF, named by PDF.js', s.state === 'corrupt_pdf' && /InvalidPDF/.test(s.detail.name), JSON.stringify(s.detail));
    ok('...with Try again and Choose another PDF', (await d.$('#nx-rretry')) !== null && (await d.$('#nx-rbody [data-choose]')) !== null);
    await shot(d, 'local-corrupt-1280');
    const m0 = (await rs(d)).history.length;
    await d.click('#nx-rretry'); s = await settle(d, m0);
    ok('Try again re-reads the same file and fails the same way (stable, no crash)', s.state === 'corrupt_pdf');
    s = await choose(d, pdfFile('kech105.pdf', GOOD));
    ok('choosing a good file recovers: READY', s.state === 'ready' && s.pages === 3);
    s = await choose(d, pdfFile('locked.pdf', makePdf(2, { encrypted: true })));
    ok('a password-protected PDF: UNSUPPORTED_PDF', s.state === 'unsupported_pdf' && /Password/.test(s.detail.name), JSON.stringify(s.detail));
    ok('...without a pointless Try again', (await d.$('#nx-rretry')) === null);
    ok('no page errors (PDF.js failures are handled)', d.errs.length === 0, d.errs.join(' | '));
    await d.context().close();

    // ---------------------------------------------------------------- E
    console.log('=== E. an exact edition match');
    const e = await page();
    const fp = sha(GOOD);
    await e.route('**' + FEED + '*', r => {
      const f = JSON.parse(JSON.stringify(feed));
      f.chapter.source.editions = [{ label: 'Test edition', sha256: fp, pdfPages: 3, pageLabels: 'index', verified: '2026-10-03' }];
      r.fulfill({ contentType: 'application/json', body: JSON.stringify(f) });
    });
    await chapter(e);
    s = await choose(e, pdfFile('kech105.pdf', GOOD));
    ok('when the SHA-256 matches a catalogued edition: EXACT_MATCH', s.verification.status === 'exact_match' && s.verification.edition === 'Test edition',
      JSON.stringify(s.verification));
    const ve = await verifyText(e);
    ok('...shown as "Verified NCERT edition · Test edition"', /Verified NCERT edition · Test edition/.test(ve), ve.replace(/\n/g, ' | '));
    await shot(e, 'local-verified-1280');
    await e.context().close();

    // ---------------------------------------------------------------- F
    console.log('=== F. readable but unverified');
    const f = await page();
    await chapter(f);
    s = await choose(f, pdfFile('kech105.pdf', GOOD));
    ok('a readable PDF that does not match: READABLE_BUT_UNVERIFIED, and the reader still opens', s.state === 'ready' && s.verification.status === 'unverified');
    const vf = await verifyText(f);
    ok('...shown as "PDF loaded — edition could not be verified"', /PDF loaded — edition could not be verified/.test(vf));
    ok('...without claiming the 2026-27 edition', !/2026-27/.test(vf) && !/Verified NCERT/.test(vf), vf.replace(/\n/g, ' | '));
    ok('...and with what could be checked (the page count)', /3 pages; the catalogued edition has 32/.test(vf));
    await f.context().close();
    const nc = await page(undefined, () => { Object.defineProperty(Crypto.prototype, 'subtle', { get() { return undefined; } }); });
    await chapter(nc);
    s = await choose(nc, pdfFile('kech105.pdf', GOOD));
    ok('without Web Crypto the PDF still opens, marked unverified (fingerprint unavailable)', s.state === 'ready'
      && s.verification.status === 'unavailable' && /cannot fingerprint/.test(await verifyText(nc)));
    await nc.context().close();

    // ---------------------------------------------------------------- G
    console.log('=== G. navigation');
    const g = await page();
    await chapter(g);
    s = await choose(g, pdfFile('five.pdf', FIVE));
    const at = async () => { const t = await settle(g, 0); return [t.page, t.drawn.pageNumber, await g.inputValue('#nx-pageno')]; };
    ok('starts on page 1 of 5, with First / Previous disabled', JSON.stringify(await at()) === '[1,1,"1"]'
      && await g.$eval('#nx-t-first', x => x.disabled) && await g.$eval('#nx-t-prev', x => x.disabled) && (await g.innerText('#nx-pagetotal')) === '/ 5');
    await g.click('#nx-t-next');
    ok('Next -> page 2, showing two squares', JSON.stringify(await at()) === '[2,2,"2"]' && (await squares(g)) === 2);
    await g.click('#nx-t-prev');
    ok('Previous -> page 1', (await at())[0] === 1);
    await g.click('#nx-t-last');
    ok('Last -> page 5, with Next / Last disabled', (await at())[0] === 5 && await g.$eval('#nx-t-next', x => x.disabled) && await g.$eval('#nx-t-last', x => x.disabled));
    await g.click('#nx-t-first');
    ok('First -> page 1', (await at())[0] === 1);
    await g.fill('#nx-pageno', '4'); await g.press('#nx-pageno', 'Enter');
    ok('typing 4 + Enter -> page 4, showing four squares', (await at())[0] === 4 && (await squares(g)) === 4);
    await g.fill('#nx-pageno', '99'); await g.press('#nx-pageno', 'Enter');
    ok('typing 99 is held to the last page', (await at())[0] === 5);
    await g.fill('#nx-pageno', '0'); await g.press('#nx-pageno', 'Enter');
    ok('typing 0 is held to the first page', (await at())[0] === 1);
    await g.focus('#nx-rpage');
    await g.keyboard.press('ArrowRight'); ok('ArrowRight on the page -> next', (await at())[0] === 2);
    await g.keyboard.press('End'); ok('End -> last', (await at())[0] === 5);
    await g.keyboard.press('Home'); ok('Home -> first', (await at())[0] === 1);
    for (let i = 0; i < 4; i++) await g.click('#nx-t-next');
    const rapid = await at();
    ok('four quick Nexts land on page 5 with one canvas (stale draws cancelled)', rapid[0] === 5 && rapid[1] === 5
      && (await g.$$eval('#nx-rpage canvas', x => x.length)) === 1);
    const labels = await g.$$eval('#nx-tools button', x => x.map(e => e.getAttribute('aria-label') || e.innerText));
    ok('every toolbar button is named for assistive technology', labels.length === 7 && labels.every(Boolean), labels.join(', '));
    ok('no errors', g.errs.length === 0, g.errs.join(' | '));

    // ---------------------------------------------------------------- H
    console.log('=== H. zoom');
    await g.click('#nx-t-fit');
    let t = await settle(g, 0);
    const fitW = await g.$eval('#nx-rpage', h => h.clientWidth);
    ok('Fit: the page fills the reader\'s width, Fit pressed', Math.abs(t.drawn.cssWidth - fitW) <= 1 && t.zoom === 1
      && (await g.getAttribute('#nx-t-fit', 'aria-pressed')) === 'true', t.drawn.cssWidth + ' / ' + fitW);
    await g.click('#nx-t-in'); t = await settle(g, 0);
    ok('Zoom in: 125 %, the page wider than the reader and scrollable inside it', t.zoom === 1.25 && Math.abs(t.drawn.cssWidth - Math.floor(fitW * 1.25)) <= 1
      && (await g.$eval('#nx-rpage', h => h.scrollWidth > h.clientWidth)) && /125%/.test(await g.innerText('#nx-rstatus')));
    ok('...and the site itself does not scroll sideways', (await g.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    await g.click('#nx-t-out'); await g.click('#nx-t-out'); t = await settle(g, 0);
    ok('Zoom out twice: 80 %', t.zoom === 0.8);
    for (let i = 0; i < 6; i++) if (!(await g.$eval('#nx-t-out', x => x.disabled))) await g.click('#nx-t-out');
    t = await settle(g, 0);
    ok('Zoom out stops at 50 % and disables itself', t.zoom === 0.5 && await g.$eval('#nx-t-out', x => x.disabled));
    for (let i = 0; i < 12; i++) if (!(await g.$eval('#nx-t-in', x => x.disabled))) await g.click('#nx-t-in');
    t = await settle(g, 0);
    ok('Zoom in stops at 300 % and disables itself', t.zoom === 3 && await g.$eval('#nx-t-in', x => x.disabled));
    ok('...handing keyboard focus to the page rather than dropping it', (await g.evaluate(() => document.activeElement && document.activeElement.id)) === 'nx-rpage');
    await g.keyboard.press('0'); t = await settle(g, 0);
    ok('the 0 key returns to Fit', t.zoom === 1);
    await g.context().close();
    const tall = await page({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    await chapter(tall);
    s = await choose(tall, pdfFile('tall.pdf', makePdf(1, { height: 20000 })));
    const cap = await tall.evaluate(() => NCERTPDF.maxCanvasPixels);
    ok('a page too big for a safe canvas is clamped: <= 16.7 M pixels, even at 2x', s.state === 'ready' && s.drawn.clamped
      && s.drawn.canvasPixels <= cap && s.drawn.pixelRatio >= 1, JSON.stringify(s.drawn));
    ok('...zoom reports the clamped value, (max) is shown and Zoom in is disabled', s.maxed && s.zoom < 1
      && /\(max\)/.test(await tall.innerText('#nx-rstatus')) && await tall.$eval('#nx-t-in', x => x.disabled));
    await tall.focus('#nx-rpage'); await tall.keyboard.press('+'); await sleep(300);
    const t2 = await rs(tall);
    ok('...and the + key changes nothing (stable UI)', t2.zoom === s.zoom && t2.drawn.canvasPixels === s.drawn.canvasPixels);
    const hd = await choose(tall, pdfFile('a4.pdf', GOOD));
    ok('an ordinary page at 2x is drawn at 2 device pixels per CSS pixel, within the cap', hd.drawn.pixelRatio === 2 && hd.drawn.canvasPixels <= cap
      && !hd.drawn.clamped, JSON.stringify(hd.drawn));
    ok('no errors', tall.errs.length === 0, tall.errs.join(' | '));
    await tall.context().close();

    // ---------------------------------------------------------------- I
    console.log('=== I. cleanup');
    const i = await page();
    await chapter(i);
    const live = async () => i.evaluate(() => window.__w.made - window.__w.ended);
    await choose(i, pdfFile('a.pdf', GOOD));
    ok('one document open: one live worker', (await live()) === 1);
    await choose(i, pdfFile('b.pdf', OTHER), '#nx-choose-card');
    let w = await i.evaluate(() => window.__w);
    ok('choosing another PDF ends the old document and its worker first', w.made === 2 && w.ended === 1, JSON.stringify(w));
    s = await choose(i, pdfFile('notes.txt', Buffer.from('not a pdf'), 'text/plain'), '#nx-choose-card');
    ok('a refused file while a PDF is open leaves that PDF exactly as it was', s.state === 'ready' && s.file.name === 'b.pdf' && s.pages === 4
      && (await live()) === 1 && (await i.$('#nx-rpage canvas')) !== null, JSON.stringify({ state: s.state, file: s.file && s.file.name }));
    ok('...and says why the new file was refused', /“notes\.txt” was not opened/.test(await verifyText(i)));
    await shot(i, 'local-refused-while-open-1280');
    s = await choose(i, pdfFile('broken.pdf', Buffer.from('%PDF-1.4 nothing\n')), '#nx-choose-card');
    w = await i.evaluate(() => window.__w);
    ok('a corrupt PDF after a good one: the good one is released, no worker left alive', s.state === 'corrupt_pdf' && w.made === w.ended
      && !(await i.evaluate(() => NCERT.reader.stats().hasDoc)), JSON.stringify(w));
    await choose(i, pdfFile('c.pdf', FIVE));
    for (let k = 0; k < 3; k++) await i.click('#nx-t-next');
    await i.evaluate(() => { location.hash = '#/'; }); await settled(i); await sleep(400);
    const gone = await i.evaluate(() => ({ r: NCERT.reader.state(), st: NCERT.reader.stats(), w: window.__w, canvases: document.querySelectorAll('canvas').length }));
    ok('leaving the chapter: no document, no worker, no render, no canvas', gone.r === null && !gone.st.hasDoc && !gone.st.rendering
      && gone.w.made === gone.w.ended && gone.canvases === 0, JSON.stringify(gone));
    ok('no errors', i.errs.length === 0, i.errs.join(' | '));
    await i.context().close();

    // ---------------------------------------------------------------- PC
    console.log('=== PC. page context contract');
    const LAB = makePdf(5, { labels: 136 });                 // printed pages 136-140, like the real chapter
    const CHID = feed.chapter.id;
    const pc = await page();
    await pc.route('**' + FEED + '*', r => {
      const f2 = JSON.parse(JSON.stringify(feed));
      f2.chapter.source.editions = [{ label: 'Test edition', sha256: sha(LAB), pdfPages: 5, pageLabels: 'book', verified: '2026-10-03' }];
      r.fulfill({ contentType: 'application/json', body: JSON.stringify(f2) });
    });
    await chapter(pc);
    await pc.evaluate(() => { window.__ctx = []; window.__off = NCERT.reader.onPageChange(c => window.__ctx.push(c)); });
    const ev = () => pc.evaluate(() => window.__ctx);
    const cur = () => pc.evaluate(() => NCERT.reader.getCurrentPageContext());
    const want = (p, pr, st) => ({ pdfPage: p, printedPage: pr, chapterId: CHID, editionStatus: st });
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const quiet = async () => { await settle(pc, 0); await sleep(300); };   // let any (wrong) late event arrive
    const turn = async sel => { await pc.click(sel); await quiet(); };
    ok('no page context before a PDF is chosen', (await cur()) === null && (await ev()).length === 0);

    await choose(pc, pdfFile('kech105.pdf', LAB)); await quiet();
    let E = await ev();
    ok('A. initial load: exactly one event, for page 1 / printed 136, this chapter, exact_match',
      E.length === 1 && same(E[0], want(1, 136, 'exact_match')), JSON.stringify(E));
    ok('...chapterId comes from the chapter feed', E[0].chapterId === CHID && CHID === 'NCERT-11-CHE-P1-CH05');
    ok('K. getCurrentPageContext() returns the most recent event\'s context', same(await cur(), E[0]));
    const shape = await pc.evaluate(() => { const c = NCERT.reader.getCurrentPageContext(); let mutated = false;
      try { c.pdfPage = 99; } catch (e) { /* frozen */ } mutated = NCERT.reader.getCurrentPageContext().pdfPage === 99;
      return { keys: Object.keys(c).sort(), frozen: Object.isFrozen(c), mutated,
               primitives: Object.keys(c).every(k => c[k] === null || ['number', 'string'].indexOf(typeof c[k]) >= 0) }; });
    ok('...metadata only: exactly pdfPage, printedPage, chapterId, editionStatus, all primitives, frozen',
      same(shape.keys, ['chapterId', 'editionStatus', 'pdfPage', 'printedPage']) && shape.primitives && shape.frozen && !shape.mutated, JSON.stringify(shape));

    await turn('#nx-t-next'); E = await ev();
    ok('B. Next: exactly one more event, page 2 / printed 137, chapter and edition unchanged',
      E.length === 2 && same(E[1], want(2, 137, 'exact_match')), JSON.stringify(E.slice(1)));
    ok('N. ...a real change: page 1 -> 2, never 2 -> 2', E[0].pdfPage === 1 && E[1].pdfPage === 2);
    await turn('#nx-t-prev'); E = await ev();
    ok('C. Previous: exactly one more event, page 1 / printed 136', E.length === 3 && same(E[2], want(1, 136, 'exact_match')));
    await pc.fill('#nx-pageno', '5'); await pc.press('#nx-pageno', 'Enter'); await quiet(); E = await ev();
    ok('D. direct jump 1 -> 5 (Enter, which also fires change): exactly one event, page 5 / printed 140',
      E.length === 4 && same(E[3], want(5, 140, 'exact_match')), JSON.stringify(E.slice(3)));

    const draws0 = await pc.evaluate(() => NCERT.reader.stats().draws);
    await turn('#nx-t-in'); await turn('#nx-t-in'); await turn('#nx-t-out'); await turn('#nx-t-fit');
    await pc.focus('#nx-rpage'); await pc.keyboard.press('+'); await quiet(); await pc.keyboard.press('0'); await quiet();
    await pc.setViewportSize({ width: 1100, height: 900 }); await sleep(600); await quiet();
    await pc.setViewportSize({ width: 1280, height: 900 }); await sleep(600); await quiet();
    await pc.fill('#nx-pageno', '5'); await pc.press('#nx-pageno', 'Enter'); await quiet();
    await pc.focus('#nx-rpage'); await pc.keyboard.press('End'); await quiet();   // already on the last page
    const draws1 = await pc.evaluate(() => NCERT.reader.stats().draws);
    E = await ev();
    ok('E. zoom in/out, fit, keys, two resizes, re-entering the same page, End on the last page: redrawn ' +
      (draws1 - draws0) + ' times, no page-change event', draws1 - draws0 >= 6 && E.length === 4, 'events ' + E.length);

    await turn('#nx-t-first');
    for (let k = 0; k < 4; k++) await pc.click('#nx-t-next');
    await quiet(); await sleep(300);
    E = await ev();
    const last5 = E.slice(4).map(c => c.pdfPage);
    ok('F. First then four quick Nexts: one event per real turn (1, 2, 3, 4, 5), none from cancelled draws',
      E.length === 9 && same(last5, [1, 2, 3, 4, 5]), JSON.stringify(last5));
    ok('...the final context is the final page, with no repeat of it', same(E[8], want(5, 140, 'exact_match'))
      && same(await cur(), E[8]) && E.every((c, k) => k === 0 || c.pdfPage !== E[k - 1].pdfPage));

    await choose(pc, pdfFile('notes.txt', Buffer.from('not a pdf'), 'text/plain'), '#nx-choose-card'); await quiet();
    ok('a refused file while a PDF is open: no event, context unchanged', (await ev()).length === 9 && same(await cur(), E[8]));

    await choose(pc, pdfFile('other.pdf', FIVE), '#nx-choose-card'); await quiet();
    E = await ev();
    ok('G/I. another PDF (no labels, unverified): exactly one new event, page 1, printed null, unverified',
      E.length === 10 && same(E[9], want(1, null, 'unverified')), JSON.stringify(E.slice(9)));
    ok('...nothing leaks from the old document (its page 5 / printed 140 / exact_match)', same(await cur(), E[9]));
    await turn('#nx-t-next'); E = await ev();
    ok('J. no page labels: printedPage stays null while pdfPage is correct (page 2)', E.length === 11 && same(E[10], want(2, null, 'unverified')));
    await choose(pc, pdfFile('front-matter.pdf', makePdf(3, { labels: 'roman' })), '#nx-choose-card'); await quiet();
    E = await ev();
    ok('J. roman-numeral labels are not page numbers: printedPage null', E.length === 12 && same(E[11], want(1, null, 'unverified')), JSON.stringify(E[11]));

    await choose(pc, pdfFile('broken.pdf', Buffer.from('%PDF-1.4 nothing\n')), '#nx-choose-card'); await quiet();
    ok('a PDF that fails to open leaves no context and sends no event', (await cur()) === null && (await ev()).length === 12);
    await choose(pc, pdfFile('kech105.pdf', LAB), '#nx-choose-card'); await quiet();
    E = await ev();
    ok('H. choosing the verified PDF again: page 1 / printed 136 / exact_match', E.length === 13 && same(E[12], want(1, 136, 'exact_match')));

    await pc.evaluate(() => { window.__boom = 0; window.__offBoom = NCERT.reader.onPageChange(() => { window.__boom++; throw new Error('listener boom'); }); });
    await turn('#nx-t-next');
    const iso = await pc.evaluate(() => ({ boom: window.__boom, n: window.__ctx.length, page: NCERT.reader.state().page }));
    ok('a listener that throws does not stop the reader or the other listeners', iso.boom === 1 && iso.n === 14 && iso.page === 2, JSON.stringify(iso));
    await pc.evaluate(() => { window.__offBoom(); window.__off(); });
    await turn('#nx-t-next');
    ok('unsubscribing stops the events', (await ev()).length === 14 && (await pc.evaluate(() => window.__boom)) === 1);

    console.log('=== EM. ExperienceMapper');
    const em = await pc.evaluate(() => {
      const M = NCERT.ExperienceMapper;
      const ctxs = [
        Object.freeze({ pdfPage: 9, printedPage: 144, chapterId: 'NCERT-11-CHE-P1-CH05', editionStatus: 'exact_match' }),
        Object.freeze({ pdfPage: 9, printedPage: 144, chapterId: 'NCERT-11-CHE-P1-CH05', editionStatus: 'unverified' }),
        Object.freeze({ pdfPage: 3, printedPage: null, chapterId: 'NCERT-11-CHE-P1-CH05', editionStatus: 'unverified' }),
        { pdfPage: 1, printedPage: 136, chapterId: 'X', editionStatus: null },
        NCERT.reader.getCurrentPageContext()
      ];
      const before = JSON.stringify(ctxs);
      const out = ctxs.map(c => M.getExperiencesForPage(c));
      return { api: Object.keys(M), arrays: out.every(Array.isArray), empty: out.every(a => a.length === 0),
               fresh: out[0] !== out[1], untouched: JSON.stringify(ctxs) === before,
               odd: [M.getExperiencesForPage(null), M.getExperiencesForPage(undefined), M.getExperiencesForPage('x')].every(a => Array.isArray(a) && !a.length) };
    });
    ok('L. getExperiencesForPage(context) returns [] for exact_match, unverified and printedPage null', em.arrays && em.empty, JSON.stringify(em));
    ok('M. it never mutates the context (frozen and plain contexts unchanged), and returns a new array each time', em.untouched && em.fresh);
    ok('...and tolerates a missing context', em.odd);
    ok('NCERT.ExperienceMapper offers getExperiencesForPage and only the UX-2 companions (getLearningContext, setChapterData)',
      same(em.api.slice().sort(), ['getExperiencesForPage', 'getLearningContext', 'setChapterData']), em.api.join());
    const msrc = fs.readFileSync(ROOT + '/ncert/experience-mapper.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    ok('the mapper fetches, imports and launches nothing, and names no chapter or simulation',
      !/fetch|XMLHttpRequest|import|require\(|simulations|ncert\.nic|NCERT-1|innerHTML|window\.location|location\.(hash|href)|localStorage|indexedDB/.test(msrc));
    ok('the mapper is plain ES5', !/(^|[^\w.$])(let|const|class)\s|=>|`/.test(msrc));
    ok('no experience UI was added (no cards, buttons or hotspots)', (await pc.$('[data-experience], .nx-experience, .nx-hotspot')) === null
      && !/Explore|Try this/.test(await pc.innerText('#nx-chlayout')));
    await pc.evaluate(() => { location.hash = '#/'; }); await settled(pc);
    ok('leaving the chapter: no page context', (await cur()) === null);
    const expectedErr = e => /listener boom/.test(e);
    ok('no errors (apart from the deliberately throwing listener)', pc.errs.filter(e => !expectedErr(e)).length === 0
      && pc.errs.some(expectedErr), pc.errs.join(' | '));
    await pc.context().close();

    // ---------------------------------------------------------------- J
    console.log('=== J. phone, tablet, desktop');
    for (const [wd, ht] of [[360, 780], [390, 844], [768, 1024], [1280, 900]]) {
      const j = await page({ viewport: { width: wd, height: ht } });
      await chapter(j);
      const check = async label => {
        const m = await j.evaluate(() => {
          const vw = innerWidth, out = [...document.querySelectorAll('body *')].filter(e => {
            if (e.closest('#nx-rpage')) return false;              // a zoomed page scrolls inside its own box
            const r = e.getBoundingClientRect(); return r.width && r.right > vw + 0.5; });
          const R = document.getElementById('nx-reader').getBoundingClientRect(), C = document.querySelector('.nx-context').getBoundingClientRect(),
            L = document.getElementById('nx-chlayout').getBoundingClientRect();
          const ctl = [...document.querySelectorAll('#nx-tools:not([hidden]) button, #nx-tools:not([hidden]) input, #nx-reader [data-choose], #nx-choose-card')]
            .filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return { h: r.height, right: r.right, left: r.left }; });
          return { over: document.documentElement.scrollWidth - vw, outside: out.length, share: R.width / L.width,
                   readerFirst: R.top < C.top, beside: Math.abs(R.top - C.top) < 2,
                   minH: ctl.length ? Math.min.apply(null, ctl.map(x => x.h)) : 0, ctlInside: ctl.every(x => x.left >= 0 && x.right <= vw + 0.5) };
        });
        ok(wd + ' px ' + label + ': no horizontal overflow; every control on screen and >= 40 px tall',
          m.over <= 0 && m.outside === 0 && m.ctlInside && m.minH >= 40, JSON.stringify(m));
        if (wd >= 960) ok(wd + ' px ' + label + ': reader beside the context, about 70 %', m.beside && m.share > 0.65 && m.share < 0.75, m.share.toFixed(3));
        else ok(wd + ' px ' + label + ': the reader comes first, full width', m.readerFirst && m.share > 0.99);
      };
      await check('no PDF yet');
      if (wd !== 1280) await shot(j, 'local-home-' + wd);
      await choose(j, pdfFile('kech105.pdf', FIVE));
      await check('reading');
      await j.click('#nx-t-in'); await j.click('#nx-t-in'); await settle(j, 0);
      await check('zoomed 150 %');
      if (wd !== 1280) await shot(j, 'local-zoom-' + wd);
      await j.click('#nx-t-fit'); await settle(j, 0);
      if (wd !== 1280) await shot(j, 'local-ready-' + wd);
      ok(wd + ' px: no errors', j.errs.length === 0, j.errs.join(' | '));
      await j.context().close();
    }
  } catch (err) {
    ok('suite ran to the end', false, err && err.stack);
  } finally {
    await b.close();
    site.kill();
  }
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  process.exit(bad ? 1 : 0);
})();
