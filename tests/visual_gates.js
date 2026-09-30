/* PrayogX visual QA gates for layout v3 (G5) pages - docs/SIMULATION_STANDARDS.md §4.

   node tests/visual_gates.js <page.html | URL> [--json]

   Measures the gates that can be measured, on the real page, at desktop (1280 x 800), phone
   (390 x 844 and 360 x 780) and in classroom mode, read-only:

     A  main experiment scale      the hero canvas fills the content width and most of the screen
     C  control proximity          the primary controls (#controls) sit directly above or below it
     D  no dropdowns               no <select> among the primary controls
     E  information density        no raw logs / dashboards visible; at most 2 charts, 4 readouts
     F  page simplicity            question -> experiment (+controls) -> solution -> [analysis] -> how to use
     I  mobile readability         no overflow, 44 px tap targets, canvas labels >= 11 px on screen
     J  classroom readability      classroom mode widens the experiment and enlarges narration

   B (object legibility), G (realism) and H (scientific correctness) are MANUAL: screenshots looked
   at, and the verifier. The page contract: section#question, section#lab holding canvas#labcv and
   #controls, section#solution, optional section#analysis / #explorer, section#howto; and
   window.PX.minLabelPx() - the smallest font (canvas px) drawn in the current frame.

   Exit 0: every measured gate passes. Exit 1: a gate fails. Exit 2: unusable input.   */
const fs = require('fs');
const path = require('path');
const { launch } = require('./_browser');

const GATES = {
  A: 'main experiment scale', B: 'object legibility', C: 'control proximity', D: 'no dropdowns for primary controls',
  E: 'information density', F: 'page simplicity', G: 'realism', H: 'scientific correctness', I: 'mobile readability', J: 'classroom readability'
};
const MANUAL = { B: 'screenshots of every stage at 1280 and 390 px, looked at', G: 'screenshots looked at: depth, lighting, materials, apparatus proportions', H: 'tests/verify_<id>.py and the page suite' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function measure(b, url, vp, classroom) {
  const p = await b.newPage({ viewport: { width: vp.w, height: vp.h }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
  await p.goto(url); await sleep(700);
  if (classroom) { await p.evaluate(() => { const c = document.getElementById('classbtn'); if (c) c.click(); }); await sleep(400); }
  const m = await p.evaluate(() => {
    const vis = e => { if (!e) return false; const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
    const cv = document.querySelector('#lab canvas#labcv') || document.querySelector('canvas#labcv'), ctl = document.getElementById('controls'), main = document.querySelector('.wrap') || document.body;
    const ms = getComputedStyle(main), pad = parseFloat(ms.paddingLeft) + parseFloat(ms.paddingRight);
    const r = cv ? cv.getBoundingClientRect() : null, c = ctl ? ctl.getBoundingClientRect() : null, mr = main.getBoundingClientRect();
    const secs = [...document.querySelectorAll('section[id]')].filter(vis).map(s => s.id);
    const taps = ctl ? [...ctl.querySelectorAll('button, input, [role=button], [role=radio], [role=switch]')].filter(vis).map(e => Math.round(e.getBoundingClientRect().height)) : [];
    const nar = document.getElementById('narr');
    let minLabel = null; try { minLabel = window.PX && typeof PX.minLabelPx === 'function' ? PX.minLabelPx() : null; } catch (e) { minLabel = null; }
    return {
      hasCanvas: !!cv, hasControls: !!ctl, canvasW: r ? r.width : 0, canvasH: r ? r.height : 0, canvasInternalW: cv ? cv.width : 0,
      contentW: Math.min(mr.width - pad, document.documentElement.clientWidth), vh: window.innerHeight, vw: document.documentElement.clientWidth,
      gap: r && c ? (c.top >= r.bottom ? c.top - r.bottom : r.top >= c.bottom ? r.top - c.bottom : -1) : null,
      selects: (ctl || document.getElementById('lab') || document).querySelectorAll('select').length,
      logs: ['#calclist', '#log', '.calc', '#logbox', '.badges', '.rail', '[data-internal]'].filter(s => [...document.querySelectorAll(s)].some(vis)),
      charts: [...document.querySelectorAll('svg.chart')].filter(vis).length,
      readouts: [...document.querySelectorAll('.gz, .readout')].filter(vis).length,
      sections: secs, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      taps: taps, minLabel: minLabel, narrPx: nar ? parseFloat(getComputedStyle(nar).fontSize) : null
    };
  });
  await p.close();
  return m;
}

function judge(d, ph, ph2, cl) {
  const out = [];
  const add = (g, ok, detail) => out.push({ gate: g, name: GATES[g], status: ok ? 'PASS' : 'FAIL', detail: detail });
  if (!d.hasCanvas){ add('A', false, 'no canvas#labcv'); }
  else add('A', d.canvasW >= 0.9 * d.contentW && d.canvasW >= 960 && d.canvasH >= 0.55 * d.vh && ph.canvasW >= 0.95 * ph.contentW && ph.canvasW >= 0.85 * ph.vw && ph.canvasH >= 0.45 * ph.vh,
    'desktop ' + Math.round(d.canvasW) + 'x' + Math.round(d.canvasH) + ' px of ' + Math.round(d.contentW) + ' wide / ' + d.vh + ' high; phone ' + Math.round(ph.canvasW) + 'x' + Math.round(ph.canvasH) + ' of ' + ph.vw + 'x' + ph.vh);
  if (!d.hasControls) add('C', false, 'no #controls group - primary controls are not grouped next to the experiment');
  else add('C', d.gap !== null && d.gap >= 0 && d.gap <= 48 && ph.gap !== null && ph.gap >= 0 && ph.gap <= 48, 'gap canvas-controls: desktop ' + Math.round(d.gap) + ' px, phone ' + Math.round(ph.gap) + ' px (<= 48)');
  add('D', d.selects === 0, d.selects + ' <select> among the primary controls' + (d.hasControls ? '' : ' (no #controls: counted across the experiment section)'));
  add('E', d.logs.length === 0 && d.charts <= 2 && d.readouts <= 4, (d.logs.length ? 'visible: ' + d.logs.join(', ') + '; ' : 'no raw logs; ') + d.charts + ' charts (<= 2), ' + d.readouts + ' readouts (<= 4)');
  const order = d.sections.filter(s => ['question', 'lab', 'solution', 'analysis', 'explorer', 'howto'].indexOf(s) >= 0), extra = d.sections.filter(s => ['question', 'lab', 'solution', 'analysis', 'explorer', 'howto'].indexOf(s) < 0);
  const idx = s => order.indexOf(s);
  add('F', idx('question') === 0 && idx('lab') === 1 && idx('solution') === 2 && idx('howto') === order.length - 1 && !extra.length,
    'sections: ' + d.sections.join(' > ') + (extra.length ? ' (unexpected: ' + extra.join(', ') + ')' : ''));
  const eff = m => m.minLabel ? m.minLabel * m.canvasW / m.canvasInternalW : null;
  const phones = [ph, ph2];
  add('I', phones.every(m => m.overflow <= 0 && m.taps.length && Math.min.apply(null, m.taps) >= 44 && eff(m) !== null && eff(m) >= 11),
    phones.map(m => m.vw + ' px: overflow ' + m.overflow + ', smallest tap ' + (m.taps.length ? Math.min.apply(null, m.taps) : '-') + ' px, smallest canvas label ' + (eff(m) === null ? 'unknown (no PX.minLabelPx)' : eff(m).toFixed(1) + ' px')).join('; '));
  add('J', cl.canvasW >= 0.95 * cl.vw - 40 && cl.narrPx !== null && cl.narrPx >= 22 && eff(d) !== null && eff(d) >= 13,
    'classroom canvas ' + Math.round(cl.canvasW) + ' of ' + cl.vw + ' px, narration ' + cl.narrPx + ' px (>= 22); desktop canvas label ' + (eff(d) === null ? 'unknown' : eff(d).toFixed(1)) + ' px (>= 13)');
  ['B', 'G', 'H'].forEach(g => out.push({ gate: g, name: GATES[g], status: 'MANUAL', detail: MANUAL[g] }));
  return out.sort((a, b) => a.gate < b.gate ? -1 : 1);
}

async function gates(target) {
  const url = /^https?:|^file:/.test(target) ? target : 'file://' + path.resolve(target).split('/').map(encodeURIComponent).join('/');
  const b = await launch();
  try {
    const d = await measure(b, url, { w: 1280, h: 800 });
    const ph = await measure(b, url, { w: 390, h: 844, mobile: true });
    const ph2 = await measure(b, url, { w: 360, h: 780, mobile: true });
    const cl = await measure(b, url, { w: 1280, h: 800 }, true);
    return judge(d, ph, ph2, cl);
  } finally { await b.close(); }
}

module.exports = { gates, GATES, judge };

if (require.main === module) {
  const t = process.argv[2];
  if (!t || (!/^https?:|^file:/.test(t) && !fs.existsSync(t))) { console.error('usage: node tests/visual_gates.js <page.html | URL> [--json]'); process.exit(2); }
  gates(t).then(res => {
    if (process.argv.includes('--json')) console.log(JSON.stringify(res, null, 1));
    else res.forEach(r => console.log((r.status + '  ').slice(0, 7) + r.gate + '  ' + r.name.padEnd(34) + r.detail));
    const bad = res.filter(r => r.status === 'FAIL').length;
    console.log('\n' + (bad ? 'VISUAL GATES: ' + bad + ' FAILED' : 'VISUAL GATES: all measured gates pass (B, G, H are manual)'));
    process.exit(bad ? 1 : 0);
  }).catch(e => { console.error(e); process.exit(2); });
}
