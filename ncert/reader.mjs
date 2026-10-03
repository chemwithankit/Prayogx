/* ==========================================================================
   PrayogX NCERT Explorer - PDF.js bridge (Phase 3A spike)

   The one ES module in the NCERT Explorer. PDF.js 4+ ships only as ES modules,
   so this small file is the boundary: ncert.js (plain ES5) injects it with a
   <script type="module"> only when a PDF is actually to be opened, and talks to
   it through window.NCERTPDF. Browsing never loads it.

   PDF.js: pinned 6.3.289 legacy build, vendored unmodified in
   vendor/pdfjs-6.3.289/ (Apache-2.0; see VERSION.txt for hashes).
   ========================================================================== */
import * as pdfjs from "./vendor/pdfjs-6.3.289/pdf.min.mjs";

const VENDOR = new URL("./vendor/pdfjs-6.3.289/", import.meta.url);
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdf.worker.min.mjs", VENDOR).href;

// A canvas never gets more backing pixels than this (iOS Safari limits a canvas to about
// 16.7 M pixels, and a phone page at 3x would waste memory for no visible gain).
const MAX_CANVAS_PIXELS = 4096 * 4096;
const MAX_PIXEL_RATIO = 2;

/* Open a document. source is {url} (same-origin or not) or {data: Uint8Array}.
   Returns {promise, destroy}: destroy() ends the loading task and its worker,
   whether or not the document has opened. */
function open(source) {
  const params = {
    isEvalSupported: false,      // never compile code from a PDF (CVE-2024-4367 class)
    enableXfa: false,
    disableAutoFetch: true,      // fetch only what is rendered
    verbosity: 0,
  };
  if (source && source.data) params.data = source.data;
  else params.url = source.url;
  const task = pdfjs.getDocument(params);
  return {
    promise: task.promise,
    destroy: () => task.destroy(),
  };
}

/* Render one page into a canvas.
   size: {fitWidth, zoom} - the page is drawn fitWidth * zoom CSS pixels wide (zoom 1 = fit
   width); a plain number is taken as {fitWidth: n, zoom: 1}. The zoom is clamped so the
   canvas never exceeds MAX_CANVAS_PIXELS even at one device pixel per CSS pixel; the
   result reports the zoom actually used and whether it was clamped.
   Returns {promise, cancel}. The page's resources are released after drawing. */
function renderPage(doc, pageNumber, canvas, size) {
  if (typeof size === "number") size = { fitWidth: size, zoom: 1 };
  let task = null, page = null, cancelled = false;
  const promise = doc.getPage(pageNumber).then((p) => {
    page = p;
    if (cancelled) throw new Error("cancelled");
    const base = p.getViewport({ scale: 1 });
    let zoom = size.zoom || 1, clamped = false;
    let scale = (size.fitWidth * zoom) / base.width;
    const area = base.width * base.height * scale * scale;
    if (area > MAX_CANVAS_PIXELS) {
      scale *= Math.sqrt(MAX_CANVAS_PIXELS / area);
      zoom = (scale * base.width) / size.fitWidth;
      clamped = true;
    }
    const viewport = p.getViewport({ scale });
    let ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const pixels = viewport.width * viewport.height * ratio * ratio;
    if (pixels > MAX_CANVAS_PIXELS) ratio = Math.max(1, Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height)));
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height = Math.floor(viewport.height) + "px";
    task = p.render({
      canvas,
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null,
    });
    return task.promise.then(() => ({
      pageNumber,
      cssWidth: Math.floor(viewport.width),
      cssHeight: Math.floor(viewport.height),
      pixelRatio: ratio,
      canvasPixels: canvas.width * canvas.height,
      zoom,
      clamped,
    }));
  }).finally(() => { if (page) page.cleanup(); });
  return {
    promise,
    cancel: () => { cancelled = true; if (task) task.cancel(); },
  };
}

/* Was this a cross-origin source the browser refused to hand over?
   A CORS or network refusal reaches PDF.js as a failed fetch with no HTTP status;
   an HTTP error (404, 500) carries a status and is an ordinary error. */
function classify(err, source) {
  const name = (err && err.name) || "Error";
  const message = String((err && err.message) || err);
  const status = err && typeof err.status === "number" ? err.status : null;
  let crossOrigin = false;
  if (source && source.url) {
    try { crossOrigin = new URL(source.url, location.href).origin !== location.origin; } catch (e) { /* bad URL */ }
  }
  const noStatus = status === null || status === 0;
  const blocked = crossOrigin && noStatus && name !== "InvalidPDFException";
  return { kind: blocked ? "blocked" : "error", name, message, status, crossOrigin };
}

window.NCERTPDF = {
  version: pdfjs.version,
  build: pdfjs.build,
  workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
  maxCanvasPixels: MAX_CANVAS_PIXELS,
  open,
  renderPage,
  classify,
};
window.dispatchEvent(new Event("ncert-pdf-ready"));
