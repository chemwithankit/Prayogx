const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { spawn } = require('child_process');
const fs = require('fs'), net = require('net'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   PrayogX Learn (tools/build_learn.py): every ready topic page and the index.
   Checks, per topic and at phone (390, 360) and desktop widths: no horizontal
   overflow, no console errors, the video iframe points at the topic's YouTube
   ID, the notes PDF link resolves to a real PDF, the quiz renders every question
   from data/learn/topics/<slug>.json, selection toggles and changes before
   submission, Submit stays disabled until all are answered, answers lock after
   submission, the score equals the number of correct picks, each question shows
   its explanation, and Retry clears everything. A REQUIRED simulation marked
   pass must load in its frame with window.PX and no errors.
   --------------------------------------------------------------------------- */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };
const freePort = () => new Promise(res => { const sv = net.createServer();
  sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });

(async () => {
  const dir = path.join(ROOT, 'data', 'learn', 'topics');
  const topics = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter(t => t.status === 'ready');
  const port = await freePort();
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await sleep(700);
  const base = 'http://127.0.0.1:' + port;
  const browser = await launch();
  try {
    for (const width of [390, 360, 1280]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      // never let the suite depend on YouTube: the embed is checked by its src, not played
      await ctx.route(/youtube(-nocookie)?\.com|ytimg|googlevideo/, r => r.fulfill({ status: 200, body: '<html></html>', contentType: 'text/html' }));
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

      await page.goto(base + '/learn/', { waitUntil: 'load' });
      const cards = await page.$$eval('.lcard', a => a.map(x => x.getAttribute('href')));
      ok(`index @${width}: lists every ready topic`, cards.length === topics.length, cards.length + '/' + topics.length);
      const ovI = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`index @${width}: no horizontal overflow`, ovI <= 0, ovI);

      for (const t of topics) {
        errs.length = 0;
        await page.goto(base + '/learn/' + t.slug + '/', { waitUntil: 'load' });
        await page.waitForSelector('.qitem');
        const tag = `${t.slug} @${width}`;
        const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        ok(`${tag}: no horizontal overflow`, ov <= 0, ov);
        const src = await page.$eval('.video iframe', f => f.getAttribute('src'));
        ok(`${tag}: video embeds ${t.video.youtubeId}`, src.includes('/embed/' + t.video.youtubeId));
        const ig = await page.$eval('.video-alt a', a => a.href);
        ok(`${tag}: Instagram fallback link`, ig === t.video.instagram);
        const pdfHref = await page.$eval('a.dl', a => a.href);
        if (width === 1280) {
          const r = await page.request.get(pdfHref);
          const body = await r.body();
          ok(`${tag}: notes PDF downloads`, r.ok() && body.slice(0, 5).toString() === '%PDF-', r.status() + ' ' + body.length + ' B');
          const imgs = await page.$$eval('.sect img', a => a.map(i => i.getAttribute('src')));
          let broken = 0;
          for (const s of imgs) { const ri = await page.request.get(new URL(s, page.url()).href); if (!ri.ok()) broken++; }
          ok(`${tag}: all ${imgs.length} images load`, broken === 0, broken + ' broken');
        }

        // quiz
        const qn = await page.$$eval('.qitem', a => a.length);
        ok(`${tag}: quiz shows ${t.quiz.length} questions`, qn === t.quiz.length, qn);
        const disabled = () => page.$eval('#qsubmit', b => b.disabled);
        ok(`${tag}: submit disabled before answering`, await disabled());
        const pick = (q, o) => page.click(`.qopt[data-q="${q}"][data-o="${o}"]`);
        const pressed = (q, o) => page.$eval(`.qopt[data-q="${q}"][data-o="${o}"]`, b => b.getAttribute('aria-pressed'));
        await pick(0, 0); ok(`${tag}: selecting marks the option`, (await pressed(0, 0)) === 'true');
        await pick(0, 1); ok(`${tag}: changing moves the selection`, (await pressed(0, 0)) === 'false' && (await pressed(0, 1)) === 'true');
        await pick(0, 1); ok(`${tag}: picking again clears it`, (await pressed(0, 1)) === 'false');
        // answer: all correct except the first, which is deliberately wrong
        const wrong0 = (t.quiz[0].answer + 1) % t.quiz[0].options.length;
        for (let i = 0; i < t.quiz.length; i++) await pick(i, i === 0 ? wrong0 : t.quiz[i].answer);
        ok(`${tag}: submit enabled when all answered`, !(await disabled()));
        await page.click('#qsubmit');
        const score = await page.$eval('#qscore', e => e.textContent);
        ok(`${tag}: score counts correct answers`, score.includes(`${t.quiz.length - 1} / ${t.quiz.length}`), score);
        const exps = await page.$$eval('.qexp', a => a.map(e => e.getAttribute('data-result')));
        ok(`${tag}: every question explained, first marked wrong`, exps.length === t.quiz.length && exps[0] === 'wrong' && exps.slice(1).every(x => x === 'right'), exps.join(','));
        const rightMarked = await page.$eval(`.qopt[data-q="0"][data-o="${t.quiz[0].answer}"]`, b => b.classList.contains('right'));
        ok(`${tag}: correct option highlighted`, rightMarked);
        const locked = await page.$$eval('.qopt', a => a.every(b => b.disabled));
        ok(`${tag}: answers locked after submit`, locked);
        await page.click('#qretry');
        const cleared = await page.evaluate(() => { const s = window.PX_LEARN.state(); return !s.submitted && s.picks.every(p => p === -1); });
        ok(`${tag}: retry clears the quiz`, cleared && !(await page.$('.qexp')));

        // simulation
        const sim = t.simulation;
        const frame = await page.$('.simbox iframe');
        if (sim.decision === 'REQUIRED' && sim.status === 'pass') {
          ok(`${tag}: simulation framed`, !!frame);
          if (frame) {
            const f = await frame.contentFrame();
            await f.waitForLoadState('load');
            const hasPX = await f.evaluate(() => !!(window.PX && window.PX.state));
            ok(`${tag}: simulation exposes window.PX`, hasPX);
            const sov = await f.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            ok(`${tag}: simulation has no horizontal overflow`, sov <= 0, sov);
          }
        } else {
          ok(`${tag}: no simulation frame (${sim.decision}${sim.status ? ' ' + sim.status : ''})`, !frame);
        }
        ok(`${tag}: no console errors`, errs.length === 0, errs.join(' | '));
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(`\n${n - bad} / ${n} passed`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
