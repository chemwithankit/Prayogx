#!/usr/bin/env node
/* PrayogX Reel Maker - generate an Instagram Reel from a real PrayogX simulation.

     node tools/reel-maker/generate-reel.js ADV-2026-P1-PHY-Q14            record, compose, sound, encode, validate
     node tools/reel-maker/generate-reel.js ID --reuse-footage              skip recording if footage exists
     node tools/reel-maker/generate-reel.js ID --preview 3.5,18,33          render only those moments to PNG
     node tools/reel-maker/generate-reel.js ID --keep-work                  keep the composed frames afterwards

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
  const a = process.argv.slice(2), o = { id: null, reuse: false, keep: false, preview: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--reuse-footage') o.reuse = true;
    else if (a[i] === '--keep-work') o.keep = true;
    else if (a[i] === '--preview') o.preview = a[++i].split(',').map(Number);
    else if (!o.id) o.id = a[i];
  }
  if (!o.id) { console.error('usage: node tools/reel-maker/generate-reel.js <SIMULATION-ID> [--reuse-footage] [--preview t1,t2] [--keep-work]'); process.exit(2); }
  return o;
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
    const data = { spec: spec, entry: entry, question: question, footage: footage,
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
  const specFile = path.join(HERE, 'reels', o.id + '.json');
  if (!fs.existsSync(specFile)) { console.error('no reel spec: ' + specFile); process.exit(2); }
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'manifest.json'), 'utf8'));
  const entry = man.simulations.find(s => s.id === o.id);
  if (!entry) { console.error(o.id + ' is not in data/manifest.json'); process.exit(2); }
  const pageFile = path.join(ROOT, entry.path), outDir = path.join(HERE, 'output', o.id), work = path.join(outDir, '.work');
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
  const manifest = {
    simulationId: o.id, template: spec.template, created: new Date().toISOString(), sourcePage: entry.path, sourceRevision: entry.revision, repoCommit: commit,
    exam: entry.exam, year: entry.year, paper: entry.paperNumber, subject: entry.subject, chapter: entry.chapter, questionNumber: entry.questionNumber, answer: entry.answer,
    video: { file: 'reel.mp4', width: 1080, height: 1920, fps: spec.fps || 30, seconds: +(c.frames / (spec.fps || 30)).toFixed(3), frames: c.frames },
    beats: c.timeline.beats, audioCues: c.timeline.cues, audio: 'synthesized sound design (tools/reel-maker/audio.py), royalty-free',
    footage: { frames: footage.frames.length, fps: footage.fps, simulationSeconds: +(footage.frames.length / footage.fps).toFixed(2), canvas: footage.canvas, pageErrors: footage.pageErrors },
    files: ['reel.mp4', 'thumbnail.jpg', 'caption.txt', 'reel.json']
  };
  log('validating …');
  const v = await validate(outDir, work, manifest, bin, spec);
  manifest.validation = v;
  fs.writeFileSync(path.join(outDir, 'reel.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (!o.keep) fs.rmSync(path.join(work, 'frames'), { recursive: true, force: true });
  v.checks.forEach(x => log((x.ok ? 'PASS  ' : 'FAIL  ') + x.name + (x.detail ? '   ' + x.detail : '')));
  log('\n' + v.passed + ' / ' + v.checks.length + ' reel checks passed · ' + manifest.video.seconds + ' s · ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s to build');
  log('reel: ' + path.relative(ROOT, path.join(outDir, 'reel.mp4')));
  process.exit(v.passed === v.checks.length ? 0 : 1);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
