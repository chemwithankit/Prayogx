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
   and RUN.done. The spec can name another element, another done test and other start actions.
   Read-only: the page file is opened from disk and never written.                                       */
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

/* every simple field of PX.state() (and PX.stage()'s name, if the page has one) - what moments select on */
const STATE = (doneExpr) => {
  const out = {};
  try { const s = PX.state ? PX.state() : {}; for (const k in s) { const v = s[k]; if (v === null || ['number', 'string', 'boolean'].indexOf(typeof v) >= 0) out[k] = typeof v === 'number' ? +v.toFixed(5) : (typeof v === 'string' ? v.slice(0, 60) : v); } } catch (e) { out.stateError = String(e).slice(0, 80); }
  try { if (typeof PX.stage === 'function') { const st = PX.stage(); out.stage = typeof st === 'string' ? st : (st && st.name) || null; } } catch (e) { /* no stage */ }
  out.done = !!(new Function('return (' + doneExpr + ')'))();
  return out;
};

/* the question as rendered on the page (the actual text, not a copy) */
const QUESTION = () => {
  /* innerText flattens <sup>/<sub> (10<sup>8</sup> -> "108"), so a copy maps them to Unicode first */
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '−': '⁻', '+': '⁺', '(': '⁽', ')': '⁾', 'n': 'ⁿ' };
  const SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '-': '₋', '−': '₋', '+': '₊', '(': '₍', ')': '₎' };
  const script = (s, map, mark) => [...s].every(c => map[c]) ? [...s].map(c => map[c]).join('') : mark + '(' + s + ')';
  const t = e => {
    if (!e) return '';
    const c = e.cloneNode(true);
    c.querySelectorAll('sup').forEach(s => s.replaceWith(script(s.textContent.trim(), SUP, '^')));
    c.querySelectorAll('sub').forEach(s => s.replaceWith(script(s.textContent.trim(), SUB, '_')));
    /* innerText needs a rendered node; the detached copy is laid out off-screen just long enough to read it */
    c.style.cssText += ';position:absolute;left:-99999px;top:0';
    document.body.appendChild(c);
    const out = (c.innerText || '').replace(/\s+/g, ' ').trim();
    c.remove();
    return out;
  };
  return {
    text: t(document.querySelector('#question .qtext')),
    lists: [...document.querySelectorAll('#question .mlist')].map(m => ({ title: t(m.querySelector('h3')), items: [...m.querySelectorAll('li')].map(t) })),
    options: [...document.querySelectorAll('#opts li')].map(li => ({ key: li.getAttribute('data-o'), text: t(li.querySelector('span')) || t(li) })),
    title: t(document.querySelector('header h1')),
    meta: t(document.querySelector('header .meta')),
    hasFigure: !!document.querySelector('#question .qfig svg, #question .qfig img'),
    resultLine: document.getElementById('target') ? '#target' : document.getElementById('keyline') ? '#keyline' : null
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
    const sel = rec.element || '#labcv', doneExpr = rec.done || '!!(PX.RUN && PX.RUN.done)';
    const ready = await p.evaluate(s => !!(window.PX && PX.start && document.querySelector(s)), sel);
    if (!ready) throw new Error('the page does not expose what the recorder needs (' + sel + ' and window.PX.start); name another element or actions in the reel spec');
    const question = await p.evaluate(QUESTION);
    fs.writeFileSync(path.join(workDir, 'question.json'), JSON.stringify(question, null, 1));

    /* run the experiment: the spec's actions (default: PX.start()), then frames until done + a tail */
    for (const a of rec.actions || [{ eval: 'PX.start()' }]) await p.evaluate(a.eval);
    const cv = await p.$(sel);
    const frames = [];
    const maxF = Math.round((rec.maxSeconds || 120) * fps), tailF = Math.round((rec.tailSeconds || 2) * fps);
    let doneAt = -1;
    for (let f = 0; f < maxF; f++) {
      await p.evaluate(ms => __pxClock.step(ms), 1000 / fps);
      const st = await p.evaluate(STATE, doneExpr);
      const file = 'f' + String(f).padStart(5, '0') + '.png';
      await cv.screenshot({ path: path.join(dir, file) });
      frames.push(Object.assign({ file: file, t: +(f / fps).toFixed(4) }, st));
      if (st.done && doneAt < 0) doneAt = f;
      if (doneAt >= 0 && f - doneAt >= tailF) break;
      if (log && f % 60 === 0) log('  recorded ' + (f / fps).toFixed(1) + ' s (' + st.cfg + ' ' + st.phase + ')');
    }
    if (doneAt < 0) throw new Error('the experiment did not finish within ' + (rec.maxSeconds || 120) + ' s of simulation time');
    const box = await cv.boundingBox();
    /* canvas units: the canvas's own resolution, or CSS pixels for any other element */
    const size = await p.evaluate(s => { const e = document.querySelector(s), r = e.getBoundingClientRect(); return e.tagName === 'CANVAS' ? { w: e.width, h: e.height } : { w: r.width, h: r.height }; }, sel);
    /* element stills taken at the end of the run: the page's own result line (found automatically) and any the spec names */
    const stills = (rec.stills || []).slice();
    if (!stills.some(s => s.name === 'result') && question.resultLine) stills.push({ name: 'result', selector: question.resultLine });
    if (question.hasFigure && !stills.some(s => s.name === 'figure')) stills.push({ name: 'figure', selector: '#question .qfig' });
    for (const s of stills.filter(x => !x.wide)) {
      const el = await p.$(s.selector);
      if (!el) throw new Error('still ' + s.name + ': no element ' + s.selector);
      await el.screenshot({ path: path.join(workDir, 'stills', s.name + '.png') });
    }
    /* static stills taken at a desktop width (e.g. lists of figures that a phone stacks into a tall strip) */
    const wide = stills.filter(x => x.wide);
    if (wide.length) {
      const wc = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
      const wp = await wc.newPage();
      await wp.goto('file://' + pageFile.split('/').map(encodeURIComponent).join('/'));
      for (const s of wide) {
        const el = await wp.$(s.selector);
        if (!el) throw new Error('still ' + s.name + ': no element ' + s.selector);
        await el.screenshot({ path: path.join(workDir, 'stills', s.name + '.png') });
      }
      await wc.close();
    }
    const meta = { fps: fps, frames: frames, doneAt: doneAt, canvas: size, cssBox: { w: box.width, h: box.height }, dpr: vp.deviceScaleFactor,
      imagePx: { w: Math.round(box.width * vp.deviceScaleFactor), h: Math.round(box.height * vp.deviceScaleFactor) }, pageErrors: errors };
    fs.writeFileSync(path.join(workDir, 'footage.json'), JSON.stringify(meta));
    return { question: question, footage: meta };
  } finally { await b.close(); }
}

module.exports = { record };
