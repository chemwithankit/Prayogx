/* Live smoke test of one published simulation, in a real browser, against the deployed site.
   Read-only: it opens pages and presses the page's own START; it changes nothing anywhere.

     node tests/live_smoke.js ADV-2026-P1-CHE-Q16 [https://prayogx.co.in]

   Desktop (1280 px) and phone (390 px): the page loads with zero uncaught errors, carries the
   right sim-id, has no horizontal overflow, and - for pages with window.PX hooks (Paper 1) - the
   page's computed answer equals the registry's, one START runs to the end, the answer is
   visible and the detailed solution is on the page. Paper 2 pages (no hooks) get the load,
   error and overflow checks only. The library (/) must list the item.              */
const fs = require('fs');
const path = require('path');
const { launch } = require('./_browser');

const ROOT = path.join(__dirname, '..');
const ID = process.argv[2];
const BASE = (process.argv[3] || 'https://prayogx.co.in').replace(/\/+$/, '');
if (!ID) { console.error('usage: node tests/live_smoke.js <SIM-ID> [base-url]'); process.exit(2); }
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'manifest.json'), 'utf8'));
const sim = man.simulations.find(s => s.id === ID);
if (!sim) { console.error(ID + ' is not in data/manifest.json'); process.exit(2); }

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) pass++; else fail++;
  console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (cond || detail === undefined ? '' : '  -> ' + detail));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await launch();
  try {
    const url = BASE + '/' + sim.path + '?smoke=' + Date.now();
    for (const vp of [{ w: 1280, h: 900, mobile: false }, { w: 390, h: 800, mobile: true }]) {
      const p = await b.newPage({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.mobile, hasTouch: vp.mobile });
      const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      const resp = await p.goto(url, { waitUntil: 'load', timeout: 45000 });
      await sleep(800);
      const tag = ' (' + vp.w + ' px)';
      ok('page responds' + tag, resp && resp.status() === 200, resp && resp.status());
      ok('sim-id is ' + ID + tag, await p.evaluate(() => (document.querySelector('meta[name="sim-id"]') || {}).content) === ID);
      const hasPX = await p.evaluate(() => !!(window.PX && PX.start && PX.answer));
      if (hasPX) {
        const a = await p.evaluate(() => PX.answer());
        ok('computed answer equals the registry (' + sim.answer + ')' + tag, String(a) === String(sim.answer), a);
        await p.evaluate(() => { if (PX.speed) PX.speed(20); PX.start(); });
        let done = false;
        for (let i = 0; i < 240 && !done; i++) { await sleep(250); done = await p.evaluate(() => PX.RUN ? !!PX.RUN.done : PX.stage() === 'answer'); }
        ok('START runs the experiment to the end' + tag, done);
        const shown = await p.evaluate(() => { const e = document.getElementById('ansval'); if (!e) return null;
          const r = e.getBoundingClientRect(); return { t: e.textContent, vis: r.width > 0 && r.height > 0 }; });
        ok('answer box (#ansval) shows ' + sim.answer + tag, shown && shown.vis && shown.t.indexOf(String(sim.answer)) >= 0, JSON.stringify(shown));
        const sol = await p.evaluate(() => { const h = Array.from(document.querySelectorAll('h2,h3,summary')).find(x => /detailed solution/i.test(x.textContent));
          return h ? (h.parentElement.innerText || '').length : 0; });
        ok('detailed solution section present and filled' + tag, sol > 400, sol);
      } else {
        ok('no window.PX hooks (older generation): load checks only' + tag, true);
      }
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok('no horizontal overflow' + tag, ov <= 0, ov);
      ok('no console errors' + tag, errs.length === 0, errs[0]);
      await p.close();
    }
    const home = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await home.goto(BASE + '/?smoke=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    /* The grid draws cards in batches (site.js PAGE) behind a "Show N more" button (#more), so a
       newer item may not be in the first render. Look in the first render, then page through with
       #more, then search (#q) by its short title. Each route needs a real link in the live UI. */
    const linked = () => home.evaluate(id => !!document.querySelector('a[href*="' + id + '"], a[href*="' + id.toLowerCase() + '"]'), ID);
    let listed = false, via = 'first render';
    for (let i = 0; i < 40 && !listed; i++) { await sleep(250); listed = await linked(); }
    for (let i = 0; i < 100 && !listed; i++) {
      const more = await home.$('#more');
      if (!more) break;
      via = 'Show more x' + (i + 1);
      await more.click();
      for (let j = 0; j < 8 && !listed; j++) { await sleep(125); listed = await linked(); }
    }
    if (!listed && await home.$('#q')) {
      via = 'search "' + (sim.shortTitle || sim.title) + '"';
      await home.fill('#q', sim.shortTitle || sim.title);
      for (let i = 0; i < 40 && !listed; i++) { await sleep(250); listed = await linked(); }
    }
    ok('the library page links to the item (' + via + ')', listed, 'no link after first render, #more and search');
    await home.close();
  } finally {
    await b.close();
  }
  console.log('\n' + pass + ' / ' + (pass + fail) + ' passed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
