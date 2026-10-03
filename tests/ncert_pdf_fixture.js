/* ---------------------------------------------------------------------------
   A tiny synthetic PDF, built in memory for the NCERT reader tests.

   PDFs never enter the repository (CLAUDE.md), so the fixture is generated at
   test time and served to the browser by request interception - nothing is
   written to disk and nothing can reach the deployed site.

   It contains no text and no NCERT material: A4 pages, each with a blue band
   across the top and k dark squares on page k, so a test can prove a page was
   really drawn by sampling the canvas. Deterministic: same input, same bytes.
   --------------------------------------------------------------------------- */
/* options: {encrypted: true} adds a standard security handler whose check fails for the
   empty password, so PDF.js asks for one (the "unsupported, password protected" path);
   {prefix: "..."} puts bytes before "%PDF-" (allowed within the first 1024 bytes);
   {height: n} makes every page n points tall (595 wide), e.g. to force the canvas clamp;
   {marker: "..."} adds a PDF comment, so a test can prove the bytes never leave the page;
   {labels: 136} gives the pages printed-page labels 136, 137, ... (as NCERT chapter PDFs
   have); {labels: "roman"} gives i, ii, iii, ... instead. */
function makePdf(pageCount, options) {
  pageCount = pageCount || 2;
  options = options || {};
  const objs = [];                       // objs[i] is object number i + 1
  const pageIds = [];
  const labels = options.labels === undefined ? ''
    : ' /PageLabels << /Nums [0 << /S ' + (options.labels === 'roman' ? '/r' : '/D /St ' + options.labels) + ' >>] >>';
  objs.push('<< /Type /Catalog /Pages 2 0 R' + labels + ' >>');
  objs.push(null);                       // the page tree, filled in below
  for (let k = 1; k <= pageCount; k++) {
    const H = options.height || 842, top = H - 842;   // the drawing keeps its place at the top
    let draw = '0.165 0.471 0.839 rg 40 ' + (720 + top) + ' 515 80 re f\n0.1 0.1 0.1 rg\n';
    for (let i = 0; i < k; i++) draw += (60 + i * 70) + ' ' + (560 + top) + ' 50 50 re f\n';
    objs.push('<< /Length ' + draw.length + ' >>\nstream\n' + draw + 'endstream');
    const content = objs.length;
    objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ' + (options.height || 842) + '] /Contents ' + content + ' 0 R /Resources << >> >>');
    pageIds.push(objs.length);
  }
  objs[1] = '<< /Type /Pages /Kids [' + pageIds.map(i => i + ' 0 R').join(' ') + '] /Count ' + pageCount + ' >>';

  let encrypt = '';
  if (options.encrypted) {
    const h32 = c => c.repeat(64);       // 32 bytes as hex: not derived from any password
    objs.push('<< /Filter /Standard /V 1 /R 2 /Length 40 /O <' + h32('a') + '> /U <' + h32('b') + '> /P -44 >>');
    encrypt = ' /Encrypt ' + objs.length + ' 0 R /ID [<' + '0'.repeat(32) + '> <' + '0'.repeat(32) + '>]';
  }

  const prefix = options.prefix || '';
  let out = prefix + '%PDF-1.4\n' + (options.marker ? '%' + options.marker + '\n' : '');
  const offsets = [];
  objs.forEach((body, i) => { offsets.push(out.length - prefix.length); out += (i + 1) + ' 0 obj\n' + body + '\nendobj\n'; });
  const xref = out.length - prefix.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  offsets.forEach(o => { out += String(o).padStart(10, '0') + ' 00000 n \n'; });
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R' + encrypt + ' >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(out, 'latin1');
}

module.exports = { makePdf };
