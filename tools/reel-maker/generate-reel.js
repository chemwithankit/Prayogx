#!/usr/bin/env node
/* PrayogX Reel Maker - generate an Instagram Reel from a real PrayogX simulation.

     node tools/reel-maker/generate-reel.js ADV-2026-P1-PHY-Q14            record, compose, sound, encode, validate
     node tools/reel-maker/generate-reel.js ID --reuse-footage              skip recording if footage exists
     node tools/reel-maker/generate-reel.js ID --preview 3.5,18,33          render only those moments to PNG
     node tools/reel-maker/generate-reel.js ID --keep-work                  keep the composed frames afterwards
     node tools/reel-maker/generate-reel.js ID --draft                      record, then write a first story spec to edit
     node tools/reel-maker/generate-reel.js ID --origin new-simulation      (the factory) / on-request (default)

   Any simulation in data/manifest.json can be made into a reel. The page is a read-only source: every file in
   its folder is hashed before and after, and the reel fails if anything changed.

   Inputs:  tools/reel-maker/reels/<ID>.json (the story), data/manifest.json (the simulation's entry and page).
   Output:  tools/reel-maker/output/<ID>/ reel.mp4, thumbnail.jpg, caption.txt, reel.json   (git-ignored)

   Stages: recorder.js (the real page on a manual clock) -> composer/ (every frame drawn in a 1080x1920 stage)
   -> audio.py (synthesized sound design) -> encode.swift (H.264 + AAC via AVFoundation) -> validate.js.     */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { launch } = require('../../tests/_browser');
const { record } = require('./recorder');
const { validate } = require('./validate');

const HERE = __dirname, ROOT = path.resolve(HERE, '..', '..');
const PY = fs.existsSync(path.join(ROOT, 'tests/.venv/bin/python3')) ? path.join(ROOT, 'tests/.venv/bin/python3') : 'python3';
const fileUrl = p => 'file://' + p.split('/').map(encodeURIComponent).join('/');
const log = s => console.log(s);

function args() {
  const a = process.argv.slice(2), o = { id: null, reuse: false, keep: false, preview: null, draft: false, origin: 'on-request' };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--reuse-footage') o.reuse = true;
    else if (a[i] === '--draft') o.draft = true;
    else if (a[i] === '--origin') o.origin = a[++i];
    else if (a[i] === '--keep-work') o.keep = true;
    else if (a[i] === '--preview') o.preview = a[++i].split(',').map(Number);
    else if (!o.id) o.id = a[i];
  }
  if (!o.id) { console.error('usage: node tools/reel-maker/generate-reel.js <SIMULATION-ID> [--draft] [--reuse-footage] [--preview t1,t2] [--keep-work] [--origin new-simulation|on-request]'); process.exit(2); }
  if (['new-simulation', 'on-request'].indexOf(o.origin) < 0) { console.error('--origin must be new-simulation or on-request'); process.exit(2); }
  return o;
}

/* every file of the simulation's folder, hashed: the before/after proof that the page was only read */
function folderHash(dir) {
  const h = crypto.createHash('sha256'), walk = d => fs.readdirSync(d).sort().forEach(f => {
    const p = path.join(d, f), st = fs.statSync(p);
    if (st.isDirectory()) walk(p); else { h.update(path.relative(dir, p)); h.update(fs.readFileSync(p)); }
  });
  walk(dir);
  return h.digest('hex');
}

/* the encoder needs macOS AVFoundation; say so plainly anywhere else */
function requireMac() {
  if (process.platform !== 'darwin') throw new Error('the reel encoder uses macOS AVFoundation (encode.swift); run reel generation on a Mac. Recording and --preview work anywhere.');
  try { execFileSync('swiftc', ['--version'], { stdio: 'ignore' }); } catch (e) { throw new Error('swiftc not found: install the Xcode command line tools (xcode-select --install) to encode reels'); }
}

/* a first story spec from the recording: moments cut where the page's own phase (or stage) changes */
function draftSpec(entry, question, footage) {
  const key = footage.frames.some(f => f.phase !== undefined) ? 'phase' : footage.frames.some(f => f.stage) ? 'stage' : null, runs = [];
  footage.frames.forEach(f => { const v = key ? f[key] : null, r = runs[runs.length - 1]; if (r && r.v === v) { r.t1 = f.t; r.n++; } else runs.push({ v: v, t0: f.t, t1: f.t, n: 1 }); });
  let picks = runs.filter(r => r.v && !/^(ready|idle|setup|done)$/i.test(r.v) && r.n >= 15);
  if (!picks.length) { const T = footage.frames[footage.frames.length - 1].t; picks = [0, 1, 2].map(k => ({ v: 'part ' + (k + 1), t0: T * k / 3, t1: T * (k + 1) / 3, win: true })); }
  picks = picks.sort((x, y) => (y.t1 - y.t0) - (x.t1 - x.t0)).slice(0, 4).sort((x, y) => x.t0 - y.t0);
  const W = footage.canvas.w, H = footage.canvas.h;
  const moments = picks.map((r, i) => Object.assign({ id: String.fromCharCode(65 + i), seconds: +Math.min(4.5, Math.max(2.8, (r.t1 - r.t0) * 0.8)).toFixed(1), region: 'full',
    label: String(r.v).toUpperCase(), sub: '' }, r.win ? { window: [+r.t0.toFixed(2), +r.t1.toFixed(2)] } : { phases: [r.v] }));
  moments[moments.length - 1].aha = { seconds: 2.6, zoom: [0, 0, W, Math.round(H / 2)], kicker: 'WATCH THIS', lines: ['TODO: the one thing the student should notice'] };
  const kind = /match/i.test(entry.questionType) ? 'match' : /option|mcq|correct/i.test(entry.questionType) ? 'option' : 'value';
  return {
    simulationId: entry.id, template: 'question-simulation-v1', fps: 30, draft: true,
    record: { viewport: { width: 420, height: 860, deviceScaleFactor: 2.6 }, actions: [{ eval: 'PX.start()' }], tailSeconds: 2.2, maxSeconds: 90 },
    regions: { full: [0, 0, W, H] },
    story: {
      hook: { beats: [], line: 'Can you solve this *JEE Advanced* question?' },
      question: { kind: kind, highlight: [] },
      problem: ['Looks *simple*…', 'but there is a *catch*.'],
      curiosity: 'But can we actually *SEE* it?',
      moments: moments,
      answer: {},
      payoff: ["DON'T JUST SOLVE IT.", '*EXPERIENCE* IT.']
    },
    thumbnail: { kicker: (entry.exam + ' ' + entry.year).toUpperCase(), lines: ['TODO a short', '*hook*'], region: 'full', phases: moments[0].phases, window: moments[0].window },
    caption: { hook: 'TODO: one curious line about the question', body: 'TODO: why it is interesting, without the answer', cta: 'Try the full experiment free on prayogx.co.in 🔬',
      hashtags: ['#JEEAdvanced', '#JEE' + entry.year, '#' + entry.subject, '#JEEPreparation', '#PrayogX'] },
    _recorded: { key: key, runs: runs.map(r => ({ value: r.v, from: r.t0, to: r.t1, frames: r.n })) }
  };
}

/* the AVFoundation encoder, compiled once per source version */
function encoder() {
  const src = path.join(HERE, 'encode.swift'), hash = crypto.createHash('sha1').update(fs.readFileSync(src)).digest('hex').slice(0, 10);
  const bin = path.join(HERE, '.cache', 'encode-' + hash);
  if (!fs.existsSync(bin)) {
    fs.mkdirSync(path.dirname(bin), { recursive: true });
    log('compiling the encoder (once)…');
    execFileSync('swiftc', ['-O', '-suppress-warnings', src, '-o', bin], { stdio: 'inherit' });
  }
  return bin;
}

async function compose(spec, entry, question, footage, work, outDir, preview) {
  const b = await launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(fileUrl(path.join(HERE, 'composer', 'index.html')));
    const data = { spec: spec, entry: entry, question: question, footage: footage, stills: fs.readdirSync(path.join(work, 'stills')).filter(f => f.endsWith('.png')),
      footageBase: fileUrl(path.join(work, 'footage')) + '/', stillsBase: fileUrl(path.join(work, 'stills')) + '/' };
    const tl = await p.evaluate(d => REEL.init(d), data);
    const fps = spec.fps || 30, n = Math.round(tl.duration * fps);
    const stage = await p.$('#stage');
    if (preview) {
      for (const t of preview) { await p.evaluate(x => REEL.render(x), t); await stage.screenshot({ path: path.join(outDir, 'preview-' + t.toFixed(2) + '.png') }); }
      await p.evaluate(() => REEL.thumbnail()); await stage.screenshot({ path: path.join(outDir, 'preview-thumbnail.png') });
      return { timeline: tl, errors: errs };
    }
    const fdir = path.join(work, 'frames'); fs.rmSync(fdir, { recursive: true, force: true }); fs.mkdirSync(fdir, { recursive: true });
    const report = [];
    for (let f = 0; f < n; f++) {
      const r = await p.evaluate(x => REEL.render(x), f / fps);
      await stage.screenshot({ path: path.join(fdir, 'c' + String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 93 });
      report.push(r);
      if (f % 90 === 0) log('  composed ' + (f / fps).toFixed(1) + ' / ' + tl.duration.toFixed(1) + ' s  (' + r.beat + ')');
    }
    const th = await p.evaluate(() => REEL.thumbnail());
    await stage.screenshot({ path: path.join(outDir, 'thumbnail.jpg'), type: 'jpeg', quality: 92 });
    fs.writeFileSync(path.join(work, 'frames.json'), JSON.stringify({ fps: fps, report: report, thumbnail: th, safe: await p.evaluate(() => REEL.SAFE) }));
    return { timeline: tl, frames: n, errors: errs };
  } finally { await b.close(); }
}

function caption(spec, entry) {
  const c = spec.caption || {};
  return [c.hook, '', c.body, '', 'JEE Advanced ' + entry.year + ' · Paper ' + entry.paperNumber + ' · ' + entry.subject + ' · Q.' + entry.questionNumber, '', c.cta, '', (c.hashtags || []).join(' ')]
    .filter(x => x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

(async () => {
  const o = args(), t0 = Date.now();
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'manifest.json'), 'utf8'));
  const entry = man.simulations.find(s => s.id === o.id);
  if (!entry) { console.error('simulation not found: ' + o.id + ' is not in data/manifest.json (IDs look like ADV-2026-P1-PHY-Q03)'); process.exit(2); }
  const pageFile = path.join(ROOT, entry.path), outDir = path.join(HERE, 'output', o.id), work = path.join(outDir, '.work');
  if (!fs.existsSync(pageFile)) { console.error('simulation page missing: ' + entry.path); process.exit(2); }
  const specFile = path.join(HERE, 'reels', o.id + '.json');
  if (!o.draft && !fs.existsSync(specFile)) { console.error('no reel story yet: ' + path.relative(ROOT, specFile) + '\nrun with --draft to record the page and write a first story spec, then edit it'); process.exit(2); }
  if (!o.preview && !o.draft) requireMac();
  const simDir = path.dirname(pageFile), before = folderHash(simDir);
  const spec = o.draft && !fs.existsSync(specFile) ? { record: { maxSeconds: 90, tailSeconds: 2.2 } } : JSON.parse(fs.readFileSync(specFile, 'utf8'));
  fs.mkdirSync(work, { recursive: true });

  let question, footage;
  if (o.reuse && fs.existsSync(path.join(work, 'footage.json'))) {
    question = JSON.parse(fs.readFileSync(path.join(work, 'question.json'), 'utf8')); footage = JSON.parse(fs.readFileSync(path.join(work, 'footage.json'), 'utf8'));
    log('reusing footage: ' + footage.frames.length + ' frames');
  } else {
    log('recording ' + entry.path + ' …');
    fs.rmSync(path.join(work, 'footage'), { recursive: true, force: true });
    ({ question, footage } = await record(spec, pageFile, work, log));
    log('recorded ' + footage.frames.length + ' frames (' + (footage.frames.length / footage.fps).toFixed(1) + ' s of simulation), done at ' + (footage.doneAt / footage.fps).toFixed(1) + ' s');
  }

  if (o.draft) {
    const d = draftSpec(entry, question, footage), target = fs.existsSync(specFile) ? specFile.replace(/\.json$/, '.draft.json') : specFile;
    fs.writeFileSync(target, JSON.stringify(d, null, 2) + '\n');
    log('recorded state (' + (d._recorded.key || 'no phase/stage field') + '):');
    d._recorded.runs.forEach(r => log('  ' + String(r.value).padEnd(16) + ' ' + r.from.toFixed(2) + '-' + r.to.toFixed(2) + ' s  (' + r.frames + ' frames)'));
    log('draft story: ' + path.relative(ROOT, target) + '  - edit the hook, moments, callouts, aha, thumbnail and caption, then --preview');
    if (folderHash(simDir) !== before) throw new Error('the simulation folder changed during recording - stop');
    return;
  }
  log('composing …');
  const c = await compose(spec, entry, question, footage, work, outDir, o.preview);
  if (c.errors.length) throw new Error('composer errors: ' + c.errors.join(' | '));
  if (o.preview) { log('previews in ' + outDir); return; }

  log('sound design …');
  fs.writeFileSync(path.join(work, 'cues.json'), JSON.stringify(c.timeline.cues));
  execFileSync(PY, [path.join(HERE, 'audio.py'), path.join(work, 'cues.json'), String(c.frames / (spec.fps || 30)), path.join(work, 'audio.wav')], { stdio: 'inherit' });

  log('encoding …');
  const bin = encoder();
  execFileSync(bin, ['encode', path.join(work, 'frames'), path.join(work, 'audio.wav'), path.join(outDir, 'reel.mp4'), String(spec.fps || 30), '1080', '1920'], { stdio: 'inherit' });

  fs.writeFileSync(path.join(outDir, 'caption.txt'), caption(spec, entry));
  let commit = '';
  try { commit = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD']).toString().trim(); } catch (e) { commit = ''; }
  const after = folderHash(simDir);
  const manifest = {
    simulationId: o.id, origin: o.origin, status: 'pending-validation', template: spec.template, created: new Date().toISOString(), sourcePage: entry.path, sourceRevision: entry.revision, repoCommit: commit,
    sourceIntegrity: { folder: path.relative(ROOT, simDir), sha256Before: before, sha256After: after, unchanged: before === after },
    answerReveal: c.timeline.answer, questionScale: c.timeline.questionScale,
    exam: entry.exam, year: entry.year, paper: entry.paperNumber, subject: entry.subject, chapter: entry.chapter, questionNumber: entry.questionNumber, answer: entry.answer,
    video: { file: 'reel.mp4', width: 1080, height: 1920, fps: spec.fps || 30, seconds: +(c.frames / (spec.fps || 30)).toFixed(3), frames: c.frames },
    beats: c.timeline.beats, audioCues: c.timeline.cues, audio: 'synthesized sound design (tools/reel-maker/audio.py), royalty-free',
    footage: { frames: footage.frames.length, fps: footage.fps, simulationSeconds: +(footage.frames.length / footage.fps).toFixed(2), canvas: footage.canvas, pageErrors: footage.pageErrors },
    files: ['reel.mp4', 'thumbnail.jpg', 'caption.txt', 'reel.json']
  };
  log('validating …');
  const v = await validate(outDir, work, manifest, bin, spec);
  manifest.validation = v;
  manifest.status = v.passed === v.checks.length ? 'ready-for-review' : 'validation-failed';
  fs.writeFileSync(path.join(outDir, 'reel.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (!o.keep) fs.rmSync(path.join(work, 'frames'), { recursive: true, force: true });
  v.checks.forEach(x => log((x.ok ? 'PASS  ' : 'FAIL  ') + x.name + (x.detail ? '   ' + x.detail : '')));
  log('\n' + v.passed + ' / ' + v.checks.length + ' reel checks passed · ' + manifest.video.seconds + ' s · ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s to build');
  log('reel: ' + path.relative(ROOT, path.join(outDir, 'reel.mp4')) + '   (' + o.origin + ')');
  log(manifest.status === 'ready-for-review' ? 'READY FOR MANUAL REVIEW' : 'REEL VALIDATION FAILED - fix the reel story or tooling and re-run (never the simulation)');
  process.exit(v.passed === v.checks.length ? 0 : 1);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
