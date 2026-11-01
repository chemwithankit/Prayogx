// PrayogX Learn worksheets: data/learn/worksheets/<slug>.json -> learn/<slug>/worksheet.pdf (A4, print-ready).
// Sections: fill in the blanks, single correct, short answer, match the columns; answer space under each question;
// detailed solutions at the end. Usage: node tools/build_worksheets.js [slug ...]   (no slug = every worksheet)
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { launch } = require(path.join(ROOT, 'tests', '_browser'));
const DIR = path.join(ROOT, 'data', 'learn', 'worksheets');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const L = 'ABCDEFGH';

function html(w) {
  const lines = n => '<div class="lines">' + '<i></i>'.repeat(n) + '</div>';
  let q = 0;
  const fill = w.fill.map(x => `<li><span class="n">${++q}.</span> ${esc(x.q)}</li>`).join('');
  const tf = (w.tf || []).map(x => `<li><span class="n">${++q}.</span> ${esc(x.q)} <span class="tf">True / False</span></li>`).join('');
  const AR = ['Both A and R are true, and R explains A', 'Both A and R are true, but R does not explain A', 'A is true, R is false', 'A is false, R is true'];
  const ar = (w.ar || []).map(x => `<li><span class="n">${++q}.</span> <b>Assertion (A):</b> ${esc(x.a)}<br><b>Reason (R):</b> ${esc(x.r)}<div class="opts">${AR.map((o, i) =>
    `<span>(${L[i].toLowerCase()}) ${o}</span>`).join('')}</div><div class="ans">Answer: ______</div></li>`).join('');
  const mcq = w.mcq.map(x => `<li><span class="n">${++q}.</span> ${esc(x.q)}<div class="opts">${x.options.map((o, i) =>
    `<span>(${L[i].toLowerCase()}) ${esc(o)}</span>`).join('')}</div><div class="ans">Answer: ______</div></li>`).join('');
  const num = (w.num || []).map(x => `<li><span class="n">${++q}.</span> ${esc(x.q)}${lines(6)}</li>`).join('');
  const short = w.short.map(x => `<li><span class="n">${++q}.</span> ${esc(x.q)}${lines(x.lines || 4)}</li>`).join('');
  const mq = ++q;
  const m = w.match;
  const match = `<p class="n">${mq}. Match each item in Column A with the correct item in Column B.</p><table class="match">
    <tr><th>Column A</th><th>Column B</th><th>Your answer</th></tr>${m.left.map((a, i) =>
    `<tr><td>${i + 1}. ${esc(a)}</td><td>(${L[i].toLowerCase()}) ${esc(m.right[i])}</td><td>${i + 1} → ____</td></tr>`).join('')}</table>`;
  const secs = list => list.filter(x => x[1]).map((x, k) => `<h2>${'BCDEFGH'[k]}. ${x[0]}</h2>${x[1]}`).join('');
  let s = 0;
  const sol = [
    ...w.fill.map(x => `<li><b>${++s}.</b> ${esc(x.a)}</li>`),
    ...(w.tf || []).map(x => `<li><b>${++s}.</b> ${x.a ? 'True' : 'False'}. ${esc(x.explain)}</li>`),
    ...(w.ar || []).map(x => `<li><b>${++s}.</b> (${L[x.answer].toLowerCase()}) ${esc(x.explain)}</li>`),
    ...w.mcq.map(x => `<li><b>${++s}.</b> (${L[x.answer].toLowerCase()}) ${esc(x.options[x.answer])}. ${esc(x.explain)}</li>`),
    ...(w.num || []).map(x => `<li><b>${++s}.</b> ${x.steps.map(esc).join('; ')}. <b>Answer: ${esc(x.answer)}</b></li>`),
    ...w.short.map(x => `<li><b>${++s}.</b> ${esc(x.solution)}</li>`),
    `<li><b>${++s}.</b> ${m.answer.map((r, i) => `${i + 1} → (${L[r].toLowerCase()})`).join(', ')}. ${esc(m.explain)}</li>`].join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:A4;margin:14mm 14mm 16mm}
  body{font:10.5pt/1.45 Arial,Helvetica,sans-serif;color:#111;margin:0}
  header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #2a78d6;padding-bottom:6px}
  .brand{font:800 20pt Arial;letter-spacing:2px}.brand b{color:#2a78d6}
  .meta{text-align:right;font-size:9pt;color:#444}
  h1{font-size:15pt;margin:10px 0 2px}.obj{color:#444;margin:0 0 6px}
  .who{display:flex;gap:18px;font-size:9.5pt;margin:6px 0 4px}.who span{flex:1;border-bottom:1px solid #999;padding-bottom:2px}
  h2{font-size:11.5pt;background:#eaf2fc;color:#1a4f91;padding:4px 8px;margin:14px 0 6px;border-left:4px solid #2a78d6}
  ol{list-style:none;padding:0;margin:0}li{margin:0 0 9px;break-inside:avoid}.n{font-weight:700}.tf{float:right;color:#555;border:1px solid #bbb;border-radius:4px;padding:0 6px;font-size:9pt}
  .opts{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;margin:4px 0 2px 18px}.ans{margin-left:18px;color:#555}
  .lines i{display:block;border-bottom:1px solid #bbb;height:22px}
  table.match{width:100%;border-collapse:collapse;break-inside:avoid}.match td,.match th{border:1px solid #bbb;padding:5px 7px;text-align:left;vertical-align:top}
  .match th{background:#f3f6fa}.match td:last-child{width:22%}
  .sol{break-before:page}.sol li{margin-bottom:6px}
  h2{break-after:avoid}
  </style></head><body>
  <header><div class="brand">PRAYOG<b>X</b> <span style="font:600 10pt Arial;letter-spacing:0;color:#555">Workbook</span></div>
  <div class="meta">Class ${esc(w.class)} · ${esc(w.subject)}<br>${esc(w.chapter)}</div></header>
  <h1>${esc(w.title)}</h1><p class="obj">${esc(w.objective)}</p>
  <div class="who"><span>Name:</span><span>Date:</span><span>Score: ____ / ${q}</span></div>
  <h2>A. Fill in the blanks</h2><ol>${fill}</ol>
  ${secs([['True or False', tf ? `<ol>${tf}</ol>` : ''], ['Assertion and reason', ar ? `<ol>${ar}</ol>` : ''], ['Choose the correct option', `<ol>${mcq}</ol>`],
    ['Numerical problems', num ? `<ol>${num}</ol>` : ''], ['Short answer questions', `<ol>${short}</ol>`], ['Match the columns', match]])}
  <section class="sol"><h2>Detailed solutions</h2><ol>${sol}</ol></section>
  </body></html>`;
}

(async () => {
  const want = process.argv.slice(2);
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json') && (!want.length || want.includes(f.slice(0, -5))));
  const browser = await launch();
  const page = await browser.newPage();
  for (const f of files) {
    const w = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    await page.setContent(html(w), { waitUntil: 'load' });
    const out = path.join(ROOT, 'learn', w.slug, 'worksheet.pdf');
    await page.pdf({ path: out, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: `<div style="font:8px Arial;color:#777;width:100%;padding:0 14mm;display:flex;justify-content:space-between">
        <span>PrayogX · prayogx.co.in/learn/${w.slug}/</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' } });
    console.log('wrote', path.relative(ROOT, out));
  }
  await browser.close();
})();
