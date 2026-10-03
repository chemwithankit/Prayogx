/* ---------------------------------------------------------------------------
   A tiny synthetic PDF, built in memory for the NCERT reader tests.

   PDFs never enter the repository (CLAUDE.md), so the fixture is generated at
   test time and served to the browser by request interception - nothing is
   written to disk and nothing can reach the deployed site.

   It contains no text and no NCERT material: A4 pages, each with a blue band
   across the top and k dark squares on page k, so a test can prove a page was
   really drawn by sampling the canvas. Deterministic: same input, same bytes.
   --------------------------------------------------------------------------- */
function makePdf(pageCount) {
  pageCount = pageCount || 2;
  const objs = [];                       // objs[i] is object number i + 1
  const pageIds = [];
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  objs.push(null);                       // the page tree, filled in below
  for (let k = 1; k <= pageCount; k++) {
    let draw = '0.165 0.471 0.839 rg 40 720 515 80 re f\n0.1 0.1 0.1 rg\n';
    for (let i = 0; i < k; i++) draw += (60 + i * 70) + ' 560 50 50 re f\n';
    objs.push('<< /Length ' + draw.length + ' >>\nstream\n' + draw + 'endstream');
    const content = objs.length;
    objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ' + content + ' 0 R /Resources << >> >>');
    pageIds.push(objs.length);
  }
  objs[1] = '<< /Type /Pages /Kids [' + pageIds.map(i => i + ' 0 R').join(' ') + '] /Count ' + pageCount + ' >>';

  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((body, i) => { offsets.push(out.length); out += (i + 1) + ' 0 obj\n' + body + '\nendobj\n'; });
  const xref = out.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  offsets.forEach(o => { out += String(o).padStart(10, '0') + ' 00000 n \n'; });
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(out, 'latin1');
}

module.exports = { makePdf };
