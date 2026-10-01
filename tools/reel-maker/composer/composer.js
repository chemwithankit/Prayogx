/* PrayogX Reel Maker - composer.

   Draws every frame of the reel on one 1080 x 1920 canvas as a pure function of time t, so the same inputs
   always give the same video. generate-reel.js loads this page, calls REEL.init(data), then for each frame
   `await REEL.render(t)` and screenshots the canvas.

   data = { spec, entry, question, footage, footageBase, stillsBase }
     spec      tools/reel-maker/reels/<ID>.json        the story: hook, moments, aha, answer, payoff
     entry     the simulation's data/manifest.json entry (exam, year, paper, subject, question number, answer)
     question  the question as the page shows it (recorder.js)
     footage   footage.json from the recorder: per-frame state of the real simulation
   Templates live in TEMPLATES; the engine below them knows nothing about any one question.

   REEL.render(t) returns what was drawn - the beat, every text box and whether footage and branding were on
   screen - so validate.js can check text stays inside the Instagram-safe area.                            */
(function () {
'use strict';
const W = 1080, H = 1920;
const SAFE = { x0: 64, x1: 1016, y0: 200, y1: 1580 };          /* clear of Instagram's top bar and caption area */
const C = { accent: '#3987e5', accent2: '#7cb8ff', good: '#3fae7a', good2: '#5dffa0', warn: '#ffc94d', bad: '#ff6b7a', text: '#f4f7ff', dim: '#93a7cc', card: 'rgba(12,20,40,.88)' };
const FONT = '"Avenir Next", "SF Pro Display", system-ui, -apple-system, "Segoe UI", sans-serif';
const cv = document.getElementById('stage'), g = cv.getContext('2d');
let D = null, BEATS = [], CUES = [], DUR = 0, STILLS = [], frameBoxes = [], drew = {};
const cache = new Map(), ready = new Map();

/* ------------------------------------------------------------------ small tools */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, d) => clamp((t - a) / d);
const E = {
  out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  expo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
};
const mix = (a, b, u) => a + (b - a) * u;
function rnd(k) { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function font(px, w) { return (w || 800) + ' ' + Math.round(px) + 'px ' + FONT; }
function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function glow(x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }

function load(url) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((res, rej) => { const im = new Image(); im.onload = () => { ready.set(url, im); res(im); }; im.onerror = () => rej(new Error('cannot load ' + url)); im.src = url; });
  cache.set(url, p);
  if (cache.size > 48) { const k = [...cache.keys()].find(u => u.indexOf('/footage/') >= 0); if (k) { cache.delete(k); ready.delete(k); } }   /* stills stay loaded */
  return p;
}

/* ------------------------------------------------------------------ text: wrapping, *highlights*, kinetic words */
const plain = s => s.replace(/\*/g, '');
function wrap(text, px, w, maxW) {
  g.font = font(px, w);
  const words = text.split(/\s+/).filter(Boolean), lines = [];
  let cur = '';
  for (const wd of words) { const tr = cur ? cur + ' ' + wd : wd; if (cur && g.measureText(plain(tr)).width > maxW) { lines.push(cur); cur = wd; } else cur = tr; }
  if (cur) lines.push(cur);
  /* keep *highlights* balanced per line */
  let open = false;
  return lines.map(l => { const s = (open ? '*' : '') + l; const n = (l.match(/\*/g) || []).length; if (n % 2) open = !open; return open ? s + '*' : s; });
}
function segments(line) { const out = []; line.split('*').forEach((s, i) => { if (s) out.push({ t: s, hi: i % 2 === 1 }); }); return out; }
function record(x, y, w, px, text) { frameBoxes.push({ x: x, y: y - px * 0.9, w: w, h: px * 1.2, text: text }); }
/* one line of rich text; align: left | center | right; returns its width */
function line(text, x, y, px, opt) {
  opt = opt || {};
  g.font = font(px, opt.weight);
  if ('letterSpacing' in g) g.letterSpacing = opt.track ? opt.track + 'px' : '0px';
  const segs = segments(text), widths = segs.map(s => g.measureText(s.t).width), tw = widths.reduce((a, b) => a + b, 0);
  let cx = opt.align === 'center' ? x - tw / 2 : opt.align === 'right' ? x - tw : x;
  const x0 = cx;
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  segs.forEach((s, i) => {
    g.save();
    if (s.hi && opt.hiGlow !== false) { g.shadowColor = opt.hi || C.accent2; g.shadowBlur = 24; }
    g.fillStyle = s.hi ? (opt.hi || C.accent2) : (opt.color || C.text);
    g.fillText(s.t, cx, y); g.restore();
    cx += widths[i];
  });
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  if (opt.record !== false) record(x0, y, tw, px, plain(text));
  return tw;
}
/* words rise in one after another; t in seconds since the text started */
function kinetic(text, x, y, px, t, opt) {
  opt = opt || {};
  const st = opt.stagger || 0.07, segs = [];
  let hi = false;
  text.split(/\s+/).forEach(w => { const starts = w.startsWith('*'), ends = w.endsWith('*') && w.length > 1; if (starts) hi = true; segs.push({ w: plain(w), hi: hi }); if (ends || (starts && w.endsWith('*') && w.length > 2)) hi = false; });
  g.font = font(px, opt.weight);
  const space = g.measureText(' ').width, widths = segs.map(s => g.measureText(s.w).width);
  const tw = widths.reduce((a, b) => a + b, 0) + space * (segs.length - 1);
  let cx = opt.align === 'center' ? x - tw / 2 : opt.align === 'right' ? x - tw : x;
  const x0 = cx;
  segs.forEach((s, i) => {
    const u = E.out(prog(t, i * st, 0.38));
    g.save(); g.globalAlpha *= u; g.textBaseline = 'alphabetic';
    if (s.hi) { g.shadowColor = opt.hi || C.accent2; g.shadowBlur = 26; }
    g.fillStyle = s.hi ? (opt.hi || C.accent2) : (opt.color || C.text);
    g.fillText(s.w, cx, y + (1 - u) * px * 0.55);
    g.restore();
    cx += widths[i] + space;
  });
  record(x0, y, tw, px, plain(text));
  return tw;
}
function para(text, x, y, px, maxW, lh, opt, t) {
  const lines = wrap(text, px, (opt && opt.weight) || 800, maxW);
  lines.forEach((l, i) => { if (t === undefined) line(l, x, y + i * lh, px, opt); else kinetic(l, x, y + i * lh, px, t - i * 0.12, opt); });
  return lines.length;
}
function pill(text, x, y, px, opt) {
  opt = opt || {};
  g.font = font(px, opt.weight || 800);
  if ('letterSpacing' in g) g.letterSpacing = (opt.track || 0) + 'px';
  const tw = g.measureText(plain(text)).width;
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  const pw = tw + px * 1.3, ph = px * 1.75, x0 = opt.align === 'center' ? x - pw / 2 : opt.align === 'right' ? x - pw : x;
  g.save(); rr(x0, y - ph / 2, pw, ph, ph / 2); g.fillStyle = opt.bg || 'rgba(57,135,229,.18)'; g.fill();
  g.lineWidth = 2; g.strokeStyle = opt.border || 'rgba(124,184,255,.55)'; g.stroke(); g.restore();
  line(text, x0 + px * 0.65, y + px * 0.36, px, { weight: opt.weight || 800, color: opt.color || C.text, track: opt.track, hi: opt.hi });
  return { x: x0, w: pw, h: ph };
}

/* ------------------------------------------------------------------ the PrayogX mark (the site's flask) */
const FLASK = 'M12.5 6.5h7M13.6 6.5v7.2L7.9 24.1a1.5 1.5 0 0 0 1.3 2.3h13.6a1.5 1.5 0 0 0 1.3-2.3l-5.7-10.4V6.5';
function logo(x, y, s) {
  g.save(); g.translate(x, y); g.scale(s / 32, s / 32);
  g.fillStyle = C.accent; rr(0, 0, 32, 32, 8); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(new Path2D(FLASK)); g.stroke(new Path2D('M10.6 20.6h10.8'));
  g.restore(); drew.brand = true;
}
function wordmark(x, y, px, align) {
  g.font = font(px, 800); if ('letterSpacing' in g) g.letterSpacing = (px * 0.17) + 'px';
  const w1 = g.measureText('PRAYOG').width, w2 = g.measureText('X').width, tw = w1 + w2;
  const x0 = align === 'center' ? x - tw / 2 : x;
  g.textAlign = 'left'; g.fillStyle = C.text; g.fillText('PRAYOG', x0, y); g.fillStyle = C.accent2; g.fillText('X', x0 + w1, y);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  record(x0, y, tw, px, 'PRAYOGX'); drew.brand = true;
  return tw;
}
function watermark(a) { if (a <= 0) return; g.save(); g.globalAlpha *= a * 0.85; logo(SAFE.x0, SAFE.y0 + 8, 40); wordmark(SAFE.x0 + 54, SAFE.y0 + 38, 24); g.restore(); }

/* ------------------------------------------------------------------ the backdrop */
function backdrop(t, tint) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#03050c'); gr.addColorStop(1, '#0a1531'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  glow(W * 0.18 + 70 * Math.sin(t * 0.31), H * 0.22, 560, tint || 'rgba(57,135,229,.20)');
  glow(W * 0.88, H * 0.78 + 60 * Math.cos(t * 0.23), 640, 'rgba(93,255,160,.07)');
  g.fillStyle = 'rgba(140,170,230,.06)';
  for (let y = 48; y < H; y += 64) for (let x = 24; x < W; x += 64) g.fillRect(x, y, 2, 2);
  for (let k = 0; k < 50; k++) {
    const sp = 10 + rnd(k) * 26, x = ((rnd(k + 3) * W + t * sp * (rnd(k + 7) - 0.5) * 1.6) % W + W) % W, y = ((rnd(k + 11) * H - t * sp) % H + H) % H;
    g.fillStyle = 'rgba(170,205,255,' + (0.08 + 0.26 * rnd(k + 19)).toFixed(3) + ')'; g.beginPath(); g.arc(x, y, 1 + 2.2 * rnd(k + 23), 0, 7); g.fill();
  }
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
}
/* a diagonal light sweep, the visual "whoosh" between beats; u runs 0..1 */
function sweep(u) {
  if (u <= 0 || u >= 1) return;
  const x = mix(-W * 0.6, W * 1.6, E.inOut(u));
  g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createLinearGradient(x - 260, 0, x + 260, H * 0.25); gr.addColorStop(0, 'rgba(124,184,255,0)'); gr.addColorStop(0.5, 'rgba(160,205,255,.28)'); gr.addColorStop(1, 'rgba(124,184,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
}

/* ------------------------------------------------------------------ footage of the real simulation */
function frameUrl(i) { return D.footageBase + D.footage.frames[i].file; }
/* the recorded frames a moment uses: every field in `match` equal, `phase` (or `stage`) in `phases`, time in `window` (s) */
function framesFor(match, phases, win) {
  const out = [];
  D.footage.frames.forEach((f, i) => {
    if (match && !Object.keys(match).every(k => f[k] === match[k])) return;
    if (phases && phases.indexOf(f.phase !== undefined ? f.phase : f.stage) < 0) return;
    if (win && (f.t < win[0] || f.t > win[1])) return;
    out.push(i);
  });
  if (!out.length) throw new Error('no recorded frames match ' + JSON.stringify({ match: match, phases: phases, window: win }));
  return out;
}
/* draw the canvas region (canvas units) into box (screen px), with a zoom toward focus; returns map(cx, cy) -> screen */
function footage(i, region, box, opt) {
  opt = opt || {};
  const im = ready.get(frameUrl(i));
  if (!im) throw new Error('footage frame not loaded: ' + i);
  const k = im.width / D.footage.canvas.w;
  const [rx, ry, rw, rh] = region;
  const s0 = Math.min(box.w / rw, box.h / rh), dw = rw * s0, dh = rh * s0, dx = box.x + (box.w - dw) / 2, dy = opt.top ? box.y : box.y + (box.h - dh) / 2;
  const z = opt.zoom || 1, fx = opt.focus ? opt.focus[0] : rx + rw / 2, fy = opt.focus ? opt.focus[1] : ry + rh / 2;
  const sw = rw / z, sh = rh / z, sx = clamp(fx - sw / 2, rx, rx + rw - sw), sy = clamp(fy - sh / 2, ry, ry + rh - sh);
  g.save();
  g.shadowColor = 'rgba(57,135,229,.45)'; g.shadowBlur = 60; rr(dx, dy, dw, dh, 30); g.fillStyle = '#070b16'; g.fill(); g.shadowBlur = 0;
  rr(dx, dy, dw, dh, 30); g.clip();
  g.drawImage(im, sx * k, sy * k, sw * k, sh * k, dx, dy, dw, dh);
  g.restore();
  g.save(); rr(dx, dy, dw, dh, 30); g.lineWidth = 3; g.strokeStyle = 'rgba(124,184,255,.45)'; g.stroke(); g.restore();
  drew.footage = true;
  const m = (cx, cy) => [dx + (cx - sx) * dw / sw, dy + (cy - sy) * dh / sh];
  m.rect = { x: dx, y: dy, w: dw, h: dh };
  return m;
}
/* a callout: a pill with an arrow to a point on the footage */
function callout(text, pt, side, u, laneY) {
  if (u <= 0) return;
  const a = E.back(clamp(u * 1.4)), px = 34;
  g.font = font(px, 800);
  const tw = g.measureText(plain(text)).width, pw = tw + 48, ph = 70;
  let bx = side === 'left' ? pt[0] - pw + 40 : pt[0] - 40, by = pt[1] - 170;
  if (side === 'lane') { bx = W / 2 - pw / 2; by = laneY; }
  bx = clamp(bx, SAFE.x0, SAFE.x1 - pw); by = clamp(by, SAFE.y0 + 140, SAFE.y1 - ph);
  g.save(); g.globalAlpha *= clamp(u * 3);
  const pulse = 1 + 0.25 * Math.sin(u * 18);
  g.fillStyle = 'rgba(255,201,77,.25)'; g.beginPath(); g.arc(pt[0], pt[1], 26 * pulse, 0, 7); g.fill();
  g.fillStyle = C.warn; g.beginPath(); g.arc(pt[0], pt[1], 9, 0, 7); g.fill();
  const ax = bx + pw / 2, ay = side === 'lane' ? by : by + ph;
  g.strokeStyle = C.warn; g.lineWidth = 4; g.setLineDash([]); g.beginPath();
  if (side === 'lane') { g.moveTo(ax - 14, ay); g.lineTo(ax, ay - 18); g.lineTo(ax + 14, ay); }   /* lane: a caret; the ring marks the spot */
  else { g.moveTo(ax, ay); g.lineTo(mix(ax, pt[0], clamp(u * 2)), mix(ay, pt[1] - 12, clamp(u * 2))); }
  g.stroke();
  g.translate(ax, by + ph / 2); g.scale(a, a); g.translate(-ax, -(by + ph / 2));
  rr(bx, by, pw, ph, 18); g.fillStyle = 'rgba(10,14,28,.92)'; g.fill(); g.lineWidth = 3; g.strokeStyle = C.warn; g.stroke();
  line(text, bx + 24, by + ph / 2 + 12, px, { color: '#fff3d2' });
  g.restore();
}

/* ------------------------------------------------------------------ the story template */
const TEMPLATES = {};
TEMPLATES['question-simulation-v1'] = function build(spec, entry, q) {
  const S = spec.story, beats = [], cues = [];
  let t0 = 0;
  const add = (id, dur, draw, needs, extra) => { const b = Object.assign({ id: id, t0: t0, dur: dur, draw: draw, needs: needs || (() => []) }, extra || {}); beats.push(b); t0 += dur; return b; };
  const cue = (t, type, gain) => cues.push({ t: +t.toFixed(3), type: type, gain: gain || 1 });
  const ctxLine = [entry.exam, entry.year].join(' ').toUpperCase();
  const chipText = ['PAPER ' + entry.paperNumber, entry.subject.toUpperCase(), 'Q.' + entry.questionNumber].join('  ·  ');

  /* A. hook: rhythmic words, then the question line */
  const hb = S.hook.beats || [], hookDur = 0.34 * hb.length + 1.75;
  add('hook', hookDur, (t) => {
    backdrop(t);
    hb.forEach((w, i) => {
      const ti = 0.12 + i * 0.34, u = E.back(prog(t, ti, 0.32)), up = E.inOut(prog(t, 0.34 * hb.length + 0.25, 0.5));
      const y = mix(620 + i * 128, 430 + i * 88, up), px = mix(104, 70, up);
      g.save(); g.globalAlpha = clamp(u) * mix(1, 0.55, up);
      const cx = W / 2; g.translate(cx, y); g.scale(0.6 + 0.4 * u, 0.6 + 0.4 * u); g.translate(-cx, -y);
      line(w, cx, y, px, { align: 'center', color: (S.hook.colors || [])[i] || C.text, weight: 900 });
      g.restore();
    });
    const tl = t - (hb.length ? 0.34 * hb.length + 0.45 : 0.2);
    if (tl > 0) para(S.hook.line, W / 2, hb.length ? 1060 : 880, hb.length ? 78 : 88, 900, hb.length ? 96 : 106, { align: 'center', weight: 900, hi: C.warn }, tl);
    watermark(prog(t, 0.2, 0.5));
  });
  hb.forEach((w, i) => cue(0.12 + i * 0.34, 'pop', 0.8));
  cue(hb.length ? 0.34 * hb.length + 0.45 : 0.2, 'whoosh', 0.7);

  /* B. context: the exam badge */
  add('context', 1.25, (t) => {
    backdrop(t + 3);
    const u = E.back(prog(t, 0, 0.4));
    g.save(); g.globalAlpha = clamp(u);
    line(entry.exam.toUpperCase(), W / 2, 760 + (1 - u) * 60, 92, { align: 'center', weight: 900, track: 4 });
    const yu = E.back(prog(t, 0.12, 0.42));
    if (yu > 0) { g.save(); g.globalAlpha *= clamp(yu); g.translate(W / 2, 900); g.scale(0.7 + 0.3 * yu, 0.7 + 0.3 * yu); g.translate(-W / 2, -900);
      line(String(entry.year), W / 2, 930, 190, { align: 'center', weight: 900, color: C.accent2, hi: C.accent2 }); g.restore(); }
    const bar = E.out(prog(t, 0.2, 0.5)); g.fillStyle = C.accent; g.fillRect(W / 2 - 260 * bar, 980, 520 * bar, 8);
    pill(chipText, W / 2, 1080, 40, { align: 'center', track: 3 });
    g.restore();
    sweep(prog(t, 0, 0.6)); watermark(1);
  });
  cue(beats[beats.length - 1].t0, 'impact', 0.9);

  /* C. the question, as the page shows it: stem, figure, lists, options - scaled down until it fits */
  const lists = q.lists || [], opts = q.options || [], QS = S.question || {};
  const hl = QS.highlight || [], listLabels = QS.listLabels || [];
  const mark = s => hl.reduce((acc, h) => acc.replace(new RegExp('(' + h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i'), '*$1*'), s);
  const split = s => { const m = /^\((\w)\)\s*(.*)$/.exec(s); return m ? [m[1], m[2]] : ['', s]; };
  const stemText = q.text.replace(/^Q\.\d+\s*/, ''), figUrl = D.stillsBase + 'figure.png', hasFig = QS.figure !== false && ready.has(figUrl), figMax = QS.figureMax || 400;
  const nItems = (QS.lists === false ? 0 : lists.reduce((a2, L) => a2 + L.items.length, 0)) + opts.length;
  const qDur = QS.seconds || clamp(2.9 + 0.17 * nItems + Math.max(0, stemText.length - 200) / 120 + (hasFig ? 0.8 : 0), 4.5, 9);   /* longer stems and figures get reading time */
  const IW = W - 2 * SAFE.x0 - 20, X0 = SAFE.x0 + 10;
  function questionCard(t, dimA, sc, dry) {
    if (!dry) { g.save(); g.globalAlpha *= dimA; pill(entry.exam.toUpperCase() + ' ' + entry.year + '  ·  ' + chipText, W / 2, SAFE.y0 + 110, 28, { align: 'center', track: 2 }); }
    let y = SAFE.y0 + 200, tk = 0.6;
    const sp = 32 * sc, sl = 42 * sc, ns = wrap(stemText, sp, 600, IW).length;
    if (!dry) para(stemText, X0, y, sp, IW, sl, { weight: 600, color: '#d6e2ff' }, t < 99 ? t : undefined);
    y += ns * sl + 30 * sc;
    if (hasFig) {
      const im = ready.get(figUrl), fh = Math.min(figMax * sc, IW * im.height / im.width), fw = fh * im.width / im.height;
      if (!dry) { const u = E.out(prog(t, 0.4, 0.5)); g.save(); g.globalAlpha *= u; rr(W / 2 - fw / 2 - 14, y - 8, fw + 28, fh + 16, 18); g.fillStyle = '#f4f4f1'; g.fill(); g.drawImage(im, W / 2 - fw / 2, y, fw, fh); g.restore(); }
      y += fh + 44 * sc;
    }
    (QS.lists === false ? [] : lists).forEach((L, li) => {
      const px = (li ? 30 : 38) * sc, lh = (li ? 38 : 46) * sc, color = li ? C.good2 : C.accent2, r = 24 * sc;
      const title = (L.title || '').toUpperCase() + (listLabels[li] ? '  ·  ' + listLabels[li].toUpperCase() : '');
      if (!dry) line(title, X0, y, 26 * sc, { color: C.accent2, track: 3, weight: 900 });
      y += 46 * sc;
      L.items.forEach((it, i) => {
        const [key, txt] = split(it), n = wrap(mark(txt), px, 700, IW - 76).length;
        if (!dry) {
          const u = E.out(prog(t, tk, 0.4));
          g.save(); g.globalAlpha *= u; g.translate((1 - u) * -60, 0);
          g.fillStyle = color; g.beginPath(); g.arc(X0 + r, y - px * 0.35, r, 0, 7); g.fill();
          line(key, X0 + r, y - px * 0.35 + 11 * sc, 30 * sc, { align: 'center', color: '#06101f', weight: 900, record: false });
          para(mark(txt), X0 + 66, y, px, IW - 76, lh, { weight: 700, hi: C.warn });
          g.restore();
        }
        y += n * lh + 16 * sc; tk += 0.17;
      });
      y += 18 * sc;
    });
    /* options: two columns when every option fits on one line there, else one wrapped column */
    const op = 30 * sc, colW = (IW - 20) / 2;
    g.font = font(op, 800);
    const two = opts.every(o => g.measureText(plain('(' + o.key + ')  ' + o.text)).width <= colW - 40);
    y += 30 * sc;
    opts.forEach((o, i) => {
      const txt = '(' + o.key + ')  ' + o.text, ls = two ? [txt] : wrap(txt, op, 800, IW - 40), h = ls.length * op * 1.3 + 30 * sc;
      const x = two ? X0 + (i % 2) * (colW + 20) : X0, w = two ? colW : IW, top = y - 36 * sc;
      if (!dry) {
        const u = E.back(prog(t, tk + i * 0.12, 0.35));
        g.save(); g.globalAlpha *= clamp(u);
        rr(x, top, w, h, 16); g.fillStyle = 'rgba(255,255,255,.06)'; g.fill(); g.strokeStyle = 'rgba(147,167,204,.35)'; g.lineWidth = 2; g.stroke();
        ls.forEach((l, k) => line(l, x + 20, top + 36 * sc + 11 * sc + k * op * 1.3, op, { weight: 800 }));
        g.restore();
      }
      if (!two || i % 2 === 1 || i === opts.length - 1) y += h + 14 * sc;
    });
    if (!dry) g.restore();
    return y;
  }
  let qScale = 1;
  for (const sc of [1, 0.93, 0.86, 0.8, 0.74, 0.68, 0.62]) { qScale = sc; if (questionCard(0, 1, sc, true) <= SAFE.y1 - 10) break; }
  const drawQuestion = (t, dimA) => questionCard(t, dimA, qScale, false);
  add('question', qDur, (t) => { backdrop(t + 5); drawQuestion(t, 1); sweep(prog(t, 0, 0.5)); watermark(1); });
  for (let i = 0; i < nItems; i++) cue(beats[beats.length - 1].t0 + 0.6 + i * 0.17, 'tick', 0.35);

  /* D. the problem */
  add('problem', 2.3, (t) => {
    backdrop(t + 9);
    g.save(); const s = mix(1, 0.94, E.out(prog(t, 0, 0.5))); g.translate(W / 2, H / 2); g.scale(s, s); g.translate(-W / 2, -H / 2);
    drawQuestion(99, mix(1, 0.18, E.out(prog(t, 0, 0.5)))); g.restore();
    frameBoxes = [];                                      /* the dimmed card is background here, not text to check */
    g.fillStyle = 'rgba(3,5,12,' + (0.6 * E.out(prog(t, 0, 0.5))).toFixed(3) + ')'; g.fillRect(0, 0, W, H);   /* a scrim keeps the lines readable over a light figure */
    let py = 860;                                         /* stacked by their wrapped height */
    S.problem.forEach((l, i) => { const tl = t - 0.35 - i * 0.75, n = wrap(l, 70, 900, 900).length; if (tl > 0) para(l, W / 2, py, 70, 900, 84, { align: 'center', weight: 900, hi: C.warn }, tl); py += n * 84 + 66; });
    watermark(1);
  });
  cue(beats[beats.length - 1].t0 + 0.35, 'whoosh', 0.5);

  /* E. curiosity: can we see it? */
  const firstM = S.moments[0], firstFrames = framesFor(firstM.match, firstM.phases, firstM.window);
  add('curiosity', 2.0, (t) => {
    backdrop(t + 12, 'rgba(57,135,229,.30)');
    const u = E.out(prog(t, 0.1, 0.5)), z = E.inOut(prog(t, 1.25, 0.75));
    g.save(); g.globalAlpha = 1 - z * 0.9; const s = 1 + z * 0.6; g.translate(W / 2, 900); g.scale(s, s); g.translate(-W / 2, -900);
    para(S.curiosity, W / 2, 860, 92, 920, 112, { align: 'center', weight: 900, hi: C.warn }, t - 0.1);
    g.restore();
    if (z > 0) { g.save(); g.globalAlpha = z; const m = footage(firstFrames[0], spec.regions[firstM.region], { x: 150, y: 380, w: 780, h: 1110 }); g.restore(); }
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.max(0, 1 - Math.abs(t - 1.62) / 0.22) * 0.55; g.fillStyle = '#cfe4ff'; g.fillRect(0, 0, W, H); g.restore();
    watermark(1);
  }, () => [firstFrames[0]]);
  cue(beats[beats.length - 1].t0, 'riser', 0.8); cue(beats[beats.length - 1].t0 + 1.6, 'impact', 1);

  /* F. the simulation moments (+ the aha) */
  const done = {}, order = S.moments.map(m => m.id), showBoard = S.moments.filter(m => m.result).length >= 2;
  const kicker = S.momentKicker || 'EXPERIMENT';
  const box = showBoard ? { x: 120, y: 440, w: 840, h: 1010 } : { x: 60, y: 440, w: 960, h: 1080 };
  function board(tt, highlight) {
    const n = order.length, pw = 190, gap = 18, x0 = W / 2 - (n * pw + (n - 1) * gap) / 2, y = 1520;
    order.slice().sort().forEach((id, i) => {
      const m = S.moments.find(z => z.id === id), got = done[id] !== undefined && tt >= done[id];
      const x = x0 + i * (pw + gap);
      g.save(); rr(x, y - 34, pw, 68, 34); g.fillStyle = got ? 'rgba(63,174,122,.28)' : 'rgba(255,255,255,.06)'; g.fill();
      g.lineWidth = got && highlight === id ? 4 : 2; g.strokeStyle = got ? C.good2 : 'rgba(147,167,204,.35)'; g.stroke();
      line(got && m.result ? m.result.split('  ')[0] : id, x + pw / 2, y + 12, 34, { align: 'center', color: got ? C.good2 : C.dim, weight: 900 });
      g.restore();
    });
  }
  S.moments.forEach((m, mi) => {
    const fr = framesFor(m.match, m.phases, m.window), dur = m.seconds, region = spec.regions[m.region];
    const b = add('moment-' + m.id, dur + (m.aha ? m.aha.seconds : 0), (t, T) => {
      backdrop(T, 'rgba(57,135,229,.24)');
      const u = clamp(t / dur), idx = fr[Math.min(fr.length - 1, Math.floor(u * (fr.length - 1)))];
      const enter = E.out(prog(t, 0, 0.45));
      let mapf;
      const inAha = m.aha && t > dur;
      if (!inAha) {
        g.save(); g.globalAlpha = enter; g.translate((1 - enter) * 160, 0);
        mapf = footage(idx, region, box, { zoom: 1 + 0.05 * u, top: !showBoard });
        g.restore();
      } else {
        const ta = t - dur, zu = E.inOut(prog(ta, 0, 0.7)), A = m.aha;
        const zr = region.map((v, k) => mix(v, A.zoom[k], zu)), zh = Math.min(showBoard ? 440 : 560, 920 * A.zoom[3] / A.zoom[2]);   /* leave room for the text above the scoreboard */
        mapf = footage(fr[fr.length - 1], zr, { x: 80, y: mix(box.y, 490, zu), w: 920, h: mix(box.h, zh, zu) }, { top: true });
        const ty = 490 + zh + 110;
        g.save(); g.globalAlpha = zu; const sh = 1 + Math.sin(ta * 40) * Math.max(0, 1 - ta * 2) * 0.02;
        g.translate(W / 2, 400); g.scale(sh, sh); g.translate(-W / 2, -400);
        pill(A.kicker, W / 2, 400, 44, { align: 'center', bg: 'rgba(255,201,77,.18)', border: C.warn, color: C.warn, track: 4 });
        g.restore();
        let ly = ty;
        A.lines.forEach((l, i) => { const tl = ta - 0.6 - i * 0.45, px = i ? 58 : 72, n = wrap(l, px, 900, 920).length; if (tl > 0) para(l, W / 2, ly, px, 920, px * 1.18, { align: 'center', weight: 900, hi: C.warn }, tl); ly += n * px * 1.18 + 30; });
        (A.verdict || []).forEach((l, i) => { const vu = E.back(prog(ta, 1.7 + i * 0.3, 0.35)); if (vu > 0) { g.save(); g.globalAlpha = clamp(vu); pill(l, W / 2, ly + 40 + i * 96, 38, { align: 'center', bg: i ? 'rgba(63,174,122,.22)' : 'rgba(255,107,122,.18)', border: i ? C.good2 : C.bad, color: i ? C.good2 : '#ffc2c8' }); g.restore(); } });
      }
      if (!inAha) {
        g.save(); g.globalAlpha = enter;
        line(order.length > 1 ? kicker + ' ' + (mi + 1) + ' / ' + order.length : 'THE ' + kicker, W / 2, SAFE.y0 + 92, 26, { align: 'center', color: C.dim, track: 4, weight: 800 });
        line(m.label, W / 2, SAFE.y0 + 152, 56, { align: 'center', weight: 900, color: '#ffffff' });
        if (m.sub) line(m.sub, W / 2, SAFE.y0 + 204, 30, { align: 'center', weight: 600, color: '#c4d4f2' });
        g.restore();
        /* lane callouts sit under the footage; with a scoreboard below, they sit over the card's lower part instead */
        const laneY = showBoard ? mapf.rect.y + mapf.rect.h - 230 : Math.min(SAFE.y1 - 80, mapf.rect.y + mapf.rect.h + 90);
        if (m.callout) callout(m.callout.text, mapf(m.callout.anchor[0], m.callout.anchor[1]), m.callout.side, prog(u, m.callout.from, 0.35), laneY);
        const ru = m.result ? E.back(prog(u, 0.78, 0.18)) : 0;
        if (ru > 0) { g.save(); g.globalAlpha = clamp(ru); g.translate(W / 2, 1420); g.scale(0.8 + 0.2 * ru, 0.8 + 0.2 * ru); g.translate(-W / 2, -1420);
          pill('✓  ' + m.result, W / 2, 1420, 38, { align: 'center', bg: 'rgba(9,44,30,.97)', border: C.good2, color: '#eafff2' }); g.restore(); }
      }
      if (showBoard) board(T, m.id);
      if (t < 0.4) sweep(prog(t, 0, 0.4));
      watermark(1);
    }, (t) => {
      const u = clamp(t / dur);
      return [m.aha && t > dur ? fr[fr.length - 1] : fr[Math.min(fr.length - 1, Math.floor(u * (fr.length - 1)))]];
    });
    done[m.id] = b.t0 + dur * 0.8;
    cue(b.t0, 'whoosh', 0.6);
    if (m.callout) cue(b.t0 + dur * m.callout.from, 'ping', 0.6);
    if (m.result) cue(b.t0 + dur * 0.8, 'ding', 0.7);
    if (m.aha) { cue(b.t0 + dur, 'hit', 1); cue(b.t0 + dur + 1.7, 'pop', 0.7); cue(b.t0 + dur + 2.0, 'pop', 0.9); }
  });

  /* G. the answer */
  const A = S.answer || {}, kind = /match/i.test(entry.questionType) ? 'match' : /option|mcq|correct/i.test(entry.questionType) ? 'option' : 'value';
  const letters = String(entry.answer).match(/\b[A-D]\b/g) || [];
  const ringText = A.ring || (kind === 'value' ? String(entry.answer) : letters.join(' '));
  const headline = A.headline || (kind === 'value' ? 'ANSWER  ' + entry.answer + (entry.answerUnit ? ' ' + entry.answerUnit : '') : (letters.length > 1 ? 'OPTIONS ' + letters.join(', ') : 'OPTION ' + letters[0]));
  const subline = A.sub !== undefined ? A.sub : (kind !== 'value' && letters.length === 1 ? ((opts.find(o => o.key === letters[0]) || {}).text || '') : '');
  const stillUrl = D.stillsBase + (A.still || 'result') + '.png';
  const fitPx = (text, px, maxW, w) => { g.font = font(px, w || 900); const tw = g.measureText(plain(text)).width; return tw > maxW ? px * maxW / tw : px; };
  add('answer', 4.4, (t) => {
    backdrop(t + 20, 'rgba(63,174,122,.20)');
    para(A.lead || (kind === 'match' ? 'So the match is…' : 'So the answer is…'), W / 2, SAFE.y0 + 150, 64, 920, 76, { align: 'center', weight: 900 }, t);
    const cy = 700;
    const dots = prog(t, 0.45, 0.85);
    if (dots > 0 && dots < 1) for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.7 * Math.max(0, Math.sin((t * 6) - i))) + ')'; g.beginPath(); g.arc(W / 2 - 50 + i * 50, cy, 12, 0, 7); g.fill(); }
    const ru = prog(t, 1.3, 0.6), rb = E.back(ru);
    if (ru > 0) {
      const R = 170 * rb;
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + t * 0.4, l0 = 200, l1 = 200 + 62 * E.out(ru); g.strokeStyle = 'rgba(93,255,160,' + (0.35 * (1 - prog(t, 2.0, 1.2))).toFixed(3) + ')'; g.lineWidth = 6; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * l0, cy + Math.sin(a) * l0); g.lineTo(W / 2 + Math.cos(a) * l1, cy + Math.sin(a) * l1); g.stroke(); }
      glow(W / 2, cy, 380, 'rgba(93,255,160,' + (0.35 * clamp(ru * 2)).toFixed(3) + ')');
      g.save(); g.beginPath(); g.arc(W / 2, cy, Math.max(1, R), 0, 7); g.fillStyle = 'rgba(8,30,22,.92)'; g.fill(); g.lineWidth = 10; g.strokeStyle = C.good2; g.shadowColor = C.good2; g.shadowBlur = 40; g.stroke(); g.restore();
      if (rb > 0.5) { const rp = fitPx(ringText, 200, 270) * rb; line(ringText, W / 2, cy + rp * 0.35, rp, { align: 'center', weight: 900, color: '#eafff2' }); }
      const tu = E.out(prog(t, 1.75, 0.45));
      if (tu > 0) { g.save(); g.globalAlpha = tu; line(headline + '  ✓', W / 2, 1020 + (1 - tu) * 40, fitPx(headline + '  ✓', 84, 920), { align: 'center', weight: 900, color: C.good2 });
        if (subline) para(subline, W / 2, 1105, 44, 920, 54, { align: 'center', weight: 800, color: '#dfeaff' }); g.restore(); }
    }
    /* then the simulation's own result line confirms it */
    const su = E.out(prog(t, 2.5, 0.5)), im = ready.get(stillUrl);
    if (im && su > 0) {
      const sw = 900, sh = sw * im.height / im.width, sx = W / 2 - sw / 2, sy = 1230 + (1 - su) * 50;
      g.save(); g.globalAlpha = su; line(A.stillLabel || "THE SIMULATION'S OWN RESULT", W / 2, sy - 22, 24, { align: 'center', color: C.dim, track: 4 });
      rr(sx - 10, sy - 6, sw + 20, sh + 20, 22); g.fillStyle = '#f4f4f1'; g.fill(); g.drawImage(im, sx, sy + 4, sw, sh); g.restore(); drew.footage = true;
    }
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.max(0, 1 - Math.abs(t - 1.4) / 0.25) * 0.5; g.fillStyle = '#d8ffe9'; g.fillRect(0, 0, W, H); g.restore();
    watermark(1);
  });
  const ab = beats[beats.length - 1];
  cue(ab.t0, 'whoosh', 0.6); cue(ab.t0 + 0.45, 'riser', 0.9); cue(ab.t0 + 1.35, 'reveal', 1); cue(ab.t0 + 1.75, 'impact', 0.7); cue(ab.t0 + 2.5, 'ping', 0.5);

  /* H. the payoff */
  add('payoff', 3.0, (t) => {
    backdrop(t + 25, 'rgba(57,135,229,.30)');
    S.payoff.forEach((l, i) => { const tl = t - 0.15 - i * 0.55; if (tl > 0) para(l, W / 2, 760 + i * 130, i ? 104 : 78, 940, 110, { align: 'center', weight: 900, hi: C.accent2 }, tl); });
    const lu = E.back(prog(t, 1.3, 0.5));
    if (lu > 0) { g.save(); g.globalAlpha = clamp(lu); const s = 0.8 + 0.2 * lu; g.translate(W / 2, 1180); g.scale(s, s); g.translate(-W / 2, -1180);
      logo(W / 2 - 60, 1080, 120); wordmark(W / 2, 1290, 54, 'center'); line('prayogx.co.in', W / 2, 1360, 34, { align: 'center', color: C.dim, weight: 700 }); g.restore(); }
    sweep(prog(t, 0, 0.5));
  });
  const pb = beats[beats.length - 1];
  cue(pb.t0, 'hit', 0.9); cue(pb.t0 + 1.3, 'shimmer', 0.8);
  return { beats: beats, cues: cues, stills: [stillUrl], answer: { kind: kind, headline: headline, ring: ringText }, questionScale: qScale };
};

/* ------------------------------------------------------------------ thumbnail */
async function thumbnail() {
  const T = D.spec.thumbnail, fr = framesFor(T.frameMatch, T.phases, T.window);
  const idx = fr[Math.floor(fr.length / 2)];
  await load(frameUrl(idx));
  frameBoxes = []; drew = {};
  backdrop(2, 'rgba(57,135,229,.32)');
  const m = footage(idx, D.spec.regions[T.region], { x: 70, y: 760, w: 940, h: 720 });
  pill(T.kicker, W / 2, 330, 40, { align: 'center', track: 5 });
  T.lines.forEach((l, i) => line(l, W / 2, 480 + i * 112, i ? 104 : 92, { align: 'center', weight: 900, hi: C.warn }));
  pill('Paper ' + D.entry.paperNumber + ' · ' + D.entry.subject + ' · Q.' + D.entry.questionNumber, W / 2, 1560, 34, { align: 'center' });
  logo(W / 2 - 150, 1640, 56); wordmark(W / 2 - 80, 1680, 34);
  return { boxes: frameBoxes.slice(), drew: Object.assign({}, drew) };
}

/* ------------------------------------------------------------------ API */
window.REEL = {
  async init(data) {
    D = data;
    const tpl = TEMPLATES[D.spec.template];
    if (!tpl) throw new Error('unknown template ' + D.spec.template);
    await Promise.all([document.fonts ? document.fonts.ready : null]);
    for (const n of D.stills || []) await load(D.stillsBase + n);
    const built = tpl(D.spec, D.entry, D.question);
    BEATS = built.beats; CUES = built.cues; DUR = BEATS.reduce((a, b) => a + b.dur, 0);
    for (const u of built.stills) await load(u);
    STILLS = built.stills;
    return { duration: +DUR.toFixed(3), beats: BEATS.map(b => ({ id: b.id, t0: +b.t0.toFixed(3), dur: +b.dur.toFixed(3) })), cues: CUES, answer: built.answer, questionScale: built.questionScale };
  },
  async render(T) {
    const b = BEATS.find(z => T >= z.t0 && T < z.t0 + z.dur) || BEATS[BEATS.length - 1], t = T - b.t0;
    for (const i of b.needs(t)) await load(frameUrl(i));
    for (const u of STILLS) await load(u);
    frameBoxes = []; drew = {};
    g.save(); b.draw(t, T); g.restore();
    return { beat: b.id, boxes: frameBoxes.slice(), footage: !!drew.footage, brand: !!drew.brand };
  },
  thumbnail: thumbnail,
  SAFE: SAFE, W: W, H: H
};
})();
