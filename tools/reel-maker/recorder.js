/* PrayogX Reel Maker - recorder.

   Opens the ACTUAL simulation page in Chromium (the project's Playwright, tests/_browser.js) and records it
   deterministically: requestAnimationFrame, performance.now and Date.now are replaced by a manual clock, so
   every frame is the real page's own engine and drawing, advanced exactly 1/fps seconds at a time - the same
   footage on any machine, at any speed. Nothing in the page is modified.

   Output (into workDir):
     footage/f00000.png ...   the hero canvas, one PNG per frame (device pixels)
     footage.json             per frame: the page's PX.state() summary, plus canvas size and fps
     question.json            the question as the page shows it: text, lists, options
     stills/*.png             element screenshots asked for by the reel spec (e.g. the revealed target)

   The page contract it relies on (layout v3 pages): canvas#labcv, section#question, window.PX with start()
   and RUN.done. Anything else is named in the reel spec.                                                  */
const fs = require('fs');
const path = require('path');
const { launch } = require('../../tests/_browser');

const CLOCK = () => {
  let now = 0, q = [];
  window.__pxClock = { step(ms) { now += ms; const run = q; q = []; run.forEach(f => { try { f(now); } catch (e) { console.error(e); } }); return now; }, now: () => now };
  window.requestAnimationFrame = f => { q.push(f); return q.length; };
  window.cancelAnimationFrame = () => {};
  performance.now = () => now;
  const d0 = Date.now(); Date.now = () => d0 + now;
};

/* the question as rendered on the page (the actual text, not a copy) */
const QUESTION = () => {
  const t = e => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : '');
  return {
    text: t(document.querySelector('#question .qtext')),
    lists: [...document.querySelectorAll('#question .mlist')].map(m => ({ title: t(m.querySelector('h3')), items: [...m.querySelectorAll('li')].map(t) })),
    options: [...document.querySelectorAll('#opts li')].map(li => ({ key: li.getAttribute('data-o'), text: t(li.querySelector('span')) || t(li) })),
    title: t(document.querySelector('header h1')),
    meta: t(document.querySelector('header .meta'))
  };
};

async function record(spec, pageFile, workDir, log) {
  const rec = spec.record || {};
  const fps = spec.fps || 30;
  const vp = rec.viewport || { width: 420, height: 860, deviceScaleFactor: 2.6 };
  const dir = path.join(workDir, 'footage');
  fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(path.join(workDir, 'stills'), { recursive: true });
  const b = await launch();
  const errors = [];
  try {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: true, hasTouch: true });
    await ctx.addInitScript(CLOCK);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto('file://' + pageFile.split('/').map(encodeURIComponent).join('/'));
    for (let i = 0; i < 5; i++) await p.evaluate(ms => __pxClock.step(ms), 1000 / fps);
    const ready = await p.evaluate(() => !!(window.PX && PX.start && PX.RUN && document.getElementById('labcv')));
    if (!ready) throw new Error('the page does not expose the layout v3 contract (canvas#labcv, PX.start, PX.RUN)');
    const question = await p.evaluate(QUESTION);
    fs.writeFileSync(path.join(workDir, 'question.json'), JSON.stringify(question, null, 1));

    /* run the experiment: the spec's actions (default: PX.start()), then frames until done + a tail */
    for (const a of rec.actions || [{ eval: 'PX.start()' }]) await p.evaluate(a.eval);
    const cv = await p.$('#labcv');
    const frames = [];
    const maxF = Math.round((rec.maxSeconds || 120) * fps), tailF = Math.round((rec.tailSeconds || 2) * fps);
    let doneAt = -1;
    for (let f = 0; f < maxF; f++) {
      await p.evaluate(ms => __pxClock.step(ms), 1000 / fps);
      const st = await p.evaluate(() => { const s = PX.state ? PX.state() : {}; return { phase: s.phase, cfg: s.cfg, state: s.state, done: !!(PX.RUN && PX.RUN.done), x: s.x }; });
      const file = 'f' + String(f).padStart(5, '0') + '.png';
      await cv.screenshot({ path: path.join(dir, file) });
      frames.push(Object.assign({ file: file, t: +(f / fps).toFixed(4) }, st));
      if (st.done && doneAt < 0) doneAt = f;
      if (doneAt >= 0 && f - doneAt >= tailF) break;
      if (log && f % 60 === 0) log('  recorded ' + (f / fps).toFixed(1) + ' s (' + st.cfg + ' ' + st.phase + ')');
    }
    if (doneAt < 0) throw new Error('the experiment did not finish within ' + (rec.maxSeconds || 120) + ' s of simulation time');
    const box = await cv.boundingBox();
    const size = await p.evaluate(() => ({ w: document.getElementById('labcv').width, h: document.getElementById('labcv').height }));
    /* element stills taken at the end of the run, e.g. the page's own revealed target line */
    for (const s of rec.stills || []) {
      const el = await p.$(s.selector);
      if (!el) throw new Error('still ' + s.name + ': no element ' + s.selector);
      await el.screenshot({ path: path.join(workDir, 'stills', s.name + '.png') });
    }
    const meta = { fps: fps, frames: frames, doneAt: doneAt, canvas: size, cssBox: { w: box.width, h: box.height }, dpr: vp.deviceScaleFactor,
      imagePx: { w: Math.round(box.width * vp.deviceScaleFactor), h: Math.round(box.height * vp.deviceScaleFactor) }, pageErrors: errors };
    fs.writeFileSync(path.join(workDir, 'footage.json'), JSON.stringify(meta));
    return { question: question, footage: meta };
  } finally { await b.close(); }
}

module.exports = { record };
