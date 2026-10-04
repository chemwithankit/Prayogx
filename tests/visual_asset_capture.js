/* Visual assets reach the reel through the page (docs/VISUAL_ASSETS.md).

   A fixture experience page, written to a temporary folder, embeds an approved-style image as a data: URI and draws
   it on its canvas. The UNCHANGED reel recorder (tools/reel-maker/recorder.js) records it; the recorded frames must
   show the image's colour. The page must also load with every network request blocked and make none.
   No provider, no network, no real asset, no simulation page touched.

   Run:  node tests/visual_asset_capture.js                                                                   */
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const { launch } = require('./_browser');
const { record } = require(path.join(ROOT, 'tools', 'reel-maker', 'recorder.js'));

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined && !c ? '   ' + x : '')); };

const RGB = [212, 30, 160];
function png(w, h, rgb) {
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.from(Array(w).fill(rgb).flat())])));
  const crc = b => { let c, t = []; for (let k = 0; k < 256; k++) { c = k; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[k] = c >>> 0; }
    let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(type), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'px-visual-capture-'));
  const DATA = png(16, 16, RGB), B64 = DATA.toString('base64');
  /* a minimal layout-v3-shaped experience: the asset is drawn on canvas#labcv by the page's own rAF loop */
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="px-visual-asset" content="vis-test-swatch">' +
    '<title>fixture</title></head><body><section id="question"><p>Fixture experience</p></section>' +
    '<canvas id="labcv" width="200" height="200"></canvas><script>(function () { "use strict";' +
    'var cv = document.getElementById("labcv"), g = cv.getContext("2d"), img = new Image(), ready = false, frames = 0;' +
    'img.onload = function () { ready = true; }; img.src = "data:image/png;base64,' + B64 + '";' +
    'var RUN = { started: false, done: false };' +
    'function draw() { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 200, 200); if (ready) g.drawImage(img, 50, 50, 100, 100);' +
    '  if (RUN.started && ready && ++frames > 3) RUN.done = true; requestAnimationFrame(draw); }' +
    'window.PX = { RUN: RUN, start: function () { RUN.started = true; }, state: function () { return { ready: ready, frames: frames }; } };' +
    'requestAnimationFrame(draw); })();</script></body></html>';
  const page = path.join(tmp, 'index.html');
  fs.writeFileSync(page, html);

  /* the Python contract agrees this page embeds the approved bytes */
  const py = execFileSync('python3', ['-c', [
    'import sys, json, hashlib; sys.path.insert(0, ' + JSON.stringify(path.join(ROOT, 'tools')) + ')',
    'import visual_assets as V',
    'html = open(' + JSON.stringify(page) + ').read()',
    'emb = [m for m in V.DATA_URI_RE.findall(html)]',
    'print(json.dumps({"declared": V.declared(html), "sha": [hashlib.sha256(__import__("base64").b64decode(b)).hexdigest() for _, b in emb]}))'].join('\n')], { encoding: 'utf8' });
  const info = JSON.parse(py);
  ok('the fixture declares its asset and embeds the exact bytes (same sha256 as the file)',
    info.declared[0] === 'vis-test-swatch' && info.sha[0] === crypto.createHash('sha256').update(DATA).digest('hex'));

  const b = await launch();
  try {
    /* 1. self-contained: loads and draws with the network blocked, and asks for nothing */
    const ctx = await b.newContext();
    const asked = [];
    await ctx.route('**/*', r => { const u = r.request().url(); if (!/^(file|data):/.test(u)) { asked.push(u); return r.abort(); } return r.continue(); });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + page);
    await p.waitForFunction(() => PX.state().ready);
    await p.waitForTimeout(100);
    const px = await p.evaluate(() => Array.from(document.getElementById('labcv').getContext('2d').getImageData(100, 100, 1, 1).data));
    ok('with the network blocked, the page draws the embedded image on its canvas', px[0] === RGB[0] && px[1] === RGB[1] && px[2] === RGB[2], px.join());
    ok('...and makes no network request at all', asked.length === 0, asked.join(' '));
    ok('...with no page errors', errs.length === 0, errs.join(' | '));
    await ctx.close();

    /* 2. the unchanged reel recorder captures it */
    const work = path.join(tmp, 'work');
    const res = await record({ fps: 30, record: { maxSeconds: 5, tailSeconds: 0.2 } }, page, work);
    const frames = res.footage.frames;
    ok('the existing recorder records the fixture page (unchanged recorder, real Playwright)', frames.length > 0 && res.footage.doneAt >= 0, JSON.stringify(res.footage).slice(0, 200));
    const last = path.join(work, 'footage', frames[frames.length - 1].file);
    const c2 = await b.newContext(); const q = await c2.newPage();
    const got = await q.evaluate(async (b64) => {
      const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      return Array.from(g.getImageData(Math.floor(im.width / 2), Math.floor(im.height / 2), 1, 1).data);
    }, fs.readFileSync(last).toString('base64'));
    await c2.close();
    ok('the recorded reel frame shows the embedded asset (centre pixel = the asset colour)',
      Math.abs(got[0] - RGB[0]) <= 2 && Math.abs(got[1] - RGB[1]) <= 2 && Math.abs(got[2] - RGB[2]) <= 2, got.join());
    ok('...so the asset reaches the reel through the page, with no separate media step', res.footage.pageErrors.length === 0);
  } catch (e) {
    ok('suite ran to the end', false, e && e.stack);
  } finally {
    await b.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const rec = fs.readFileSync(path.join(ROOT, 'tools', 'reel-maker', 'recorder.js'), 'utf8');
  ok('the recorder was not modified for this (it still captures canvas#labcv by default)', rec.includes("rec.element || '#labcv'"));
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  process.exit(bad ? 1 : 0);
})();
