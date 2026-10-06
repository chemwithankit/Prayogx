#!/usr/bin/env node
/* PrayogX concept explainer - a calm, teacher-paced explanation of one NCERT concept, filmed from the concept's own
   3-D experience (not a question reel: no hook, question, answer or reveal).

     node tools/reel-maker/generate-explainer.js CON-CHE-CALORIMETER-01                 the 16:9 visual master (1920 x 1080)
     node tools/reel-maker/generate-explainer.js CON-CHE-CALORIMETER-01 --format tall   the 9:16 version (1080 x 1920)
     node tools/reel-maker/generate-explainer.js ID --reuse-footage                     re-encode and re-check a recording
     node tools/reel-maker/generate-explainer.js CON-CHE-CALORIMETER-01 --reel A        one vertical reel from the spec's reels
                                                                                        (its own scenes, format and 20-60 s limits)

   Inputs:  tools/reel-maker/explainers/<ID>.json (template, formats, scene order, duration limits), data/manifest.json
            (the concept's entry: its NCERT context via context.js), and the page's explainer mode (PX.explainMode).
   Output:  tools/reel-maker/output/<ID>/explainer/<format>/  explainer.mp4, poster.jpg, explainer.json   (git-ignored)

   Stages: recorder.js (unchanged: the page on a manual clock, switched into explainer mode by its own actions) ->
   encode.swift (H.264 + AAC) -> mp4tools.py (no edit lists, moov first) -> the explainer checks below. The visual
   master has a silent track; narration and music are added later from a VERIFIED voice record (README -> Voiceover).
   Narration (a reel whose spec names a narration story, unless --silent): the story's lines must have a VERIFIED voice
   record (tools/reel-maker/voice.py; generated and paid for separately, never here). Each scene is then as long as its
   line needs (never shorter than the storyboard), captions are timed word by word inside each line, the soundtrack is
   the existing audio.py mix (voice over a calm music bed, plan kind "explainer") and the audio and voice checks of
   audio_check.py run on the MP4's own decoded track. captions.srt is written beside the video.
   Status (explainer.json): VISUAL_MASTER (silent, all checks passed), READY_FOR_REVIEW (narrated, all checks passed)
   or CHECKS_FAILED. Nothing here approves or publishes anything. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { record } = require('./recorder');
const { reelContext } = require('./context');

const HERE = __dirname, ROOT = path.resolve(HERE, '..', '..');
const PY = fs.existsSync(path.join(ROOT, 'tests/.venv/bin/python3')) ? path.join(ROOT, 'tests/.venv/bin/python3') : 'python3';
const AAC_PRIMING = 2112;
const log = s => console.log(s);
const sha256 = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

function args() {
  const a = process.argv.slice(2), o = { id: null, format: 'wide', reuse: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--format') o.format = a[++i];
    else if (a[i] === '--reel') o.reel = a[++i];
    else if (a[i] === '--silent') o.silent = true;
    else if (a[i] === '--reuse-footage') o.reuse = true;
    else if (!o.id) o.id = a[i];
  }
  if (!o.id) { console.error('usage: node tools/reel-maker/generate-explainer.js <CONCEPT-ID> [--format wide|tall] [--reuse-footage]'); process.exit(2); }
  return o;
}

/* every file of the concept's folder, hashed: the proof that filming only read the page */
function folderHash(dir) {
  const h = crypto.createHash('sha256'), walk = d => fs.readdirSync(d).sort().forEach(f => {
    const p = path.join(d, f), st = fs.statSync(p);
    if (st.isDirectory()) walk(p); else { h.update(path.relative(dir, p)); h.update(fs.readFileSync(p)); }
  });
  walk(dir);
  return h.digest('hex');
}

function encoder() {
  const src = path.join(HERE, 'encode.swift'), hash = crypto.createHash('sha1').update(fs.readFileSync(src)).digest('hex').slice(0, 10);
  const bin = path.join(HERE, '.cache', 'encode-' + hash);
  if (!fs.existsSync(bin)) { fs.mkdirSync(path.dirname(bin), { recursive: true }); execFileSync('swiftc', ['-O', '-suppress-warnings', src, '-o', bin], { stdio: 'inherit' }); }
  return bin;
}

/* a silent stereo 48 kHz track for the visual master (the encoder always writes an audio track) */
function silence(file, seconds) {
  execFileSync(PY, ['-c', 'import sys, wave\nw = wave.open(sys.argv[1], "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(48000)\nw.writeframes(b"\\x00\\x00\\x00\\x00" * int(round(float(sys.argv[2]) * 48000))); w.close()', file, String(seconds)]);
}

/* luminance statistics of frames, and mean differences of pairs (PIL + numpy), as validate.js does for reels */
function imageStats(files, pairs) {
  const code = 'import json, sys\nimport numpy as np\nfrom PIL import Image\nd = json.loads(sys.stdin.read())\n' +
    'def arr(f): return np.asarray(Image.open(f).convert("L").resize((160, 90)), dtype=float)\n' +
    'print(json.dumps({"stats": [[float(a.mean()), float(a.std())] for a in map(arr, d["files"])], "diffs": [float(np.abs(arr(a) - arr(b)).mean()) for a, b in d["pairs"]]}))';
  return JSON.parse(execFileSync(PY, ['-c', code], { input: JSON.stringify({ files: files, pairs: pairs }), maxBuffer: 64 << 20 }).toString());
}

function check(m, spec, work, outDir, bin, footage) {
  const checks = [], ok = (name, cond, detail) => checks.push({ name: name, ok: !!cond, detail: detail === undefined ? '' : String(detail) });
  const mp4 = path.join(outDir, 'explainer.mp4'), F = spec.formats[m.format], fps = spec.fps;
  const pr = JSON.parse(execFileSync(bin, ['probe', mp4]).toString());
  const lim = spec.durationLimits;
  ok('concept explainer: an NCERT concept, its context from the registry (no JEE field)', m.context.kind === 'concept' && m.context.template === spec.template && /^NCERT Class \d+ · /.test(m.context.captionLine), m.context.captionLine + ' · registry status ' + m.sourceStatus);
  ok('duration ' + lim[0] + '-' + lim[1] + ' s', pr.duration >= lim[0] && pr.duration <= lim[1], pr.duration.toFixed(2) + ' s');
  ok(m.format + ' ' + F.width + ' x ' + F.height, pr.width === F.width && pr.height === F.height, pr.width + ' x ' + pr.height);
  ok('H.264 video at ' + fps + ' fps with an AAC stereo track, playable', pr.video === 'avc1' && Math.abs(pr.fps - fps) < 0.5 && pr.audio === 'aac ' && pr.channels === 2 && pr.playable, pr.video + ' ' + pr.fps + ' fps, ' + pr.audio + ' x' + pr.channels);
  const box = JSON.parse(execFileSync(PY, [path.join(HERE, 'mp4tools.py'), 'inspect', mp4]).toString());
  ok('container: moov atom first, no edit lists, video under 25 Mbps', box.moovBeforeMdat && box.editLists === 0 && pr.videoBitRate > 0 && pr.videoBitRate <= 25e6, 'moov first ' + box.moovBeforeMdat + ', edit lists ' + box.editLists + ', video ' + (pr.videoBitRate / 1e6).toFixed(1) + ' Mbps');
  /* the story: every scene of the design, in order, each on screen */
  const seen = []; footage.frames.forEach(f => { if (f.explainScene && seen[seen.length - 1] !== f.explainScene) seen.push(f.explainScene); });
  ok('every scene of the design, in order: ' + spec.scenes.join(' > '), JSON.stringify(seen) === JSON.stringify(spec.scenes), seen.join(' > '));
  ok('the footage is the real concept page in explainer mode, played to its end with no page errors', footage.doneAt >= 0 && footage.pageErrors.length === 0 && footage.frames.length > fps * lim[0], footage.frames.length + ' frames, errors ' + footage.pageErrors.length);
  /* the science on screen happened in the lab's own model: the ignition starts after the opening, only ever moves
     forward, finishes before the closing scene and leaves the sample ignited - never a label over an apparatus that did
     nothing; where the story has a "measure" scene, the temperature rise completes inside it */
  const ig = footage.frames.map(f => f.explainIgnition || 0), first = ig.findIndex(v => v > 0), full = ig.findIndex(v => v >= 1);
  const lastStart = footage.frames.findIndex(f => f.explainScene === spec.scenes[spec.scenes.length - 1]), fwd = ig.every((v, k) => k === 0 || v >= ig[k - 1] - 1e-9);
  const mFr = footage.frames.filter(f => f.explainScene === 'measure'), mOk = !mFr.length || mFr[mFr.length - 1].explainIgnition === 1;
  ok('the experiment ran in the model: ignition after the opening, only forward, complete before the closing scene' + (mFr.length ? ' (the temperature rise inside "measure")' : '') + ', sample ignited at the end',
     first > 0 && full > first && full < lastStart && fwd && mOk && footage.frames[footage.frames.length - 1].ignited === true,
     'starts ' + (first / fps).toFixed(2) + ' s, complete ' + (full / fps).toFixed(2) + ' s, closing scene ' + (lastStart / fps).toFixed(2) + ' s');
  const errs = footage.frames.filter(f => f.explainError);
  ok('the explainer reported no error', errs.length === 0, errs.length ? errs[0].explainError : '');
  /* the decoded video against the recorded frames, at the middle of every scene; no black or empty frame */
  const frames = fs.readdirSync(path.join(work, 'footage')).filter(f => f.endsWith('.png')).sort();
  const mids = [], idx = [];
  spec.scenes.forEach(id => { const fr = footage.frames.map((f, i) => [f, i]).filter(x => x[0].explainScene === id); if (fr.length) { const k = fr[Math.floor(fr.length / 2)][1]; idx.push(k); mids.push((k + 0.25) / fps); } });
  const pdir = path.join(work, 'probe'); fs.rmSync(pdir, { recursive: true, force: true });
  execFileSync(bin, ['frames', mp4, pdir, mids.map(x => x.toFixed(4)).join(',')]);
  const sample = frames.filter((f, i) => i % 5 === 0).map(f => path.join(work, 'footage', f));
  const S = imageStats(sample, mids.map((t, i) => [path.join(pdir, 'probe' + i + '.png'), path.join(work, 'footage', frames[idx[i]])]));
  const worst = Math.max.apply(null, S.diffs);
  ok('the decoded video matches the recorded frames in every scene (mean difference < 6 of 255)', worst < 6, 'worst ' + worst.toFixed(2));
  const dark = S.stats.filter(s => s[0] < 6 || s[1] < 3);
  ok('no black or empty frame (' + sample.length + ' frames sampled)', dark.length === 0, dark.length + ' dark');
  ok('rendered on the GPU as requested (no silent fallback to software SwiftShader), canvas captured losslessly',
     m.rendering.gpu && m.rendering.renderer && !/swiftshader|no webgl|error/i.test(m.rendering.renderer) && m.rendering.capture === 'canvas-png', m.rendering.renderer + ' · ' + m.rendering.capture);
  ok('the concept page was only read: its folder is byte-identical before and after', m.sourceIntegrity.unchanged === true, m.sourceIntegrity.folder + ' sha256 ' + m.sourceIntegrity.sha256After.slice(0, 12));
  return checks;
}

(async () => {
  const o = args(), t0 = Date.now();
  const specFile = path.join(HERE, 'explainers', o.id + '.json');
  if (!fs.existsSync(specFile)) { console.error('no explainer spec: ' + path.relative(ROOT, specFile)); process.exit(2); }
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  if (o.reel){
    const R = (spec.reels || {})[o.reel];
    if (!R){ console.error('no reel ' + o.reel + ' in ' + path.relative(ROOT, specFile) + ' (have ' + Object.keys(spec.reels || {}).join(', ') + ')'); process.exit(2); }
    Object.assign(spec, { scenes: R.scenes, durationLimits: R.durationLimits, title: R.title, design: R.storyboard || spec.design, durations: R.durations, narration: R.narration }); o.format = R.format;
  }
  if (!spec.formats[o.format]) { console.error('--format must be one of ' + Object.keys(spec.formats).join(', ')); process.exit(2); }
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'manifest.json'), 'utf8'));
  const entry = man.simulations.find(s => s.id === o.id);
  if (!entry) { console.error(o.id + ' is not in data/manifest.json'); process.exit(2); }
  let ctx;
  try { ctx = reelContext(entry); } catch (e) { console.error(e.message); process.exit(2); }
  if (ctx.kind !== 'concept' || spec.template !== ctx.template) { console.error(o.id + ': explainers are made for NCERT concepts (template ' + ctx.template + ')'); process.exit(2); }
  if (process.platform !== 'darwin') { console.error('encoding needs macOS (encode.swift)'); process.exit(2); }

  /* a caption shows the written form of a spoken line ("q V equals minus C delta T" -> "q_V = −C ΔT", as the reel's labels
     write it); each written word keeps the count of spoken words it stands for, so its timing stays on the voice */
  const written = sw => { const out = []; for (let i = 0; i < sw.length; i++){ const x = sw[i], nx = sw[i + 1] || '', lo = x.toLowerCase();
    if (lo === 'delta' && nx){ out.push({ w: 'Δ' + nx, n: 2 }); i++; }
    else if (x === 'q' && /^V[.,:;?]?$/.test(nx)){ out.push({ w: 'q_' + nx, n: 2 }); i++; }
    else if (lo === 'minus' && nx && lo !== nx.toLowerCase() && !/^delta$/i.test(nx)){ out.push({ w: '−' + nx, n: 2 }); i++; }
    else if (lo === 'equals' || lo === 'plus' || lo === 'minus') out.push({ w: { equals: '=', plus: '+', minus: '−' }[lo], n: 1 });
    else out.push({ w: x, n: 1 }); } return out; };
  /* the narration: a VERIFIED voice record decides each scene's length and the captions */
  let nar = null;
  if (spec.narration && !o.silent){
    const story = JSON.parse(fs.readFileSync(path.join(ROOT, spec.narration), 'utf8'));
    const recFile = path.join(HERE, 'output', '_variants', o.id + '.reel' + o.reel.toLowerCase(), 'voice', 'voice.json');
    let rec = null; try { rec = JSON.parse(fs.readFileSync(recFile, 'utf8')); } catch (e) { rec = null; }
    if (!rec || rec.status !== 'VERIFIED'){ console.error('reel ' + o.reel + ' has narration but no VERIFIED voice record (' + path.relative(ROOT, recFile) + ': ' + (rec ? rec.status : 'missing') + ').\n'
      + 'Generate it explicitly first: python3 tools/reel-maker/voice.py generate ' + o.id + ' --variant reel' + o.reel.toLowerCase() + ' --cap <CREDITS> --confirm ' + o.id + '   (or render --silent)'); process.exit(2); }
    const hash = t => crypto.createHash('sha256').update(t.split(/\s+/).filter(Boolean).join(' ')).digest('hex');
    const PAUSE = 0.4, END_CARD = 1.5;                          /* a breath after each line (0.7 s between lines with the lead-in); the end card's 1.5 s */
    const lines = story.narration.segments.map(sg => {
      const r = rec.segments.find(x => x.beat === sg.beat && x.spokenSha256 === hash(sg.spoken));
      if (!r){ console.error('no verified audio for the line of scene ' + sg.beat + ' (spoken form changed since generation?)'); process.exit(2); }
      return { beat: sg.beat, spoken: sg.spoken, seconds: r.decoded.seconds, offset: +(r.offset !== undefined ? r.offset : 0.3) };
    });
    const durations = spec.scenes.map((id, k) => { const l = lines.find(x => x.beat === id); if (!l) return spec.durations[k];
      return Math.max(spec.durations[k], +(l.offset + l.seconds + PAUSE + (k === spec.scenes.length - 1 ? END_CARD : 0)).toFixed(2)); });
    /* captions: each line in chunks of about seven words, timed in proportion to their words inside the spoken audio */
    const captions = [], t0s = []; let acc = 0; durations.forEach(d => { t0s.push(acc); acc += d; });
    lines.forEach(l => { const sw = l.spoken.split(/\s+/).filter(Boolean), w = written(sw), chunks = []; let cur = [], n = 0;
      w.forEach((x, k) => { cur.push(x); n += x.n; const nx = w[k + 1], math = nx && (/^[=+]$/.test(x.w) || /^[=+]$/.test(nx.w) || /^−/.test(nx.w));
        if (!nx || (!math && ((/[.,:;?]$/.test(x.w) && n >= 3) || n >= 8))){ chunks.push(cur); cur = []; n = 0; } });
      if (chunks.length > 1 && chunks[chunks.length - 1].length === 1) chunks[chunks.length - 2].push(chunks.pop()[0]);   /* no one-word orphan */
      let done = 0; const start = t0s[spec.scenes.indexOf(l.beat)] + l.offset, line = [];
      chunks.forEach(c => { const a = start + l.seconds * done / sw.length; done += c.reduce((q, x) => q + x.n, 0); const b = start + l.seconds * done / sw.length;
        line.push({ t0: +a.toFixed(3), t1: +b.toFixed(3), text: c.map(x => x.w).join(' ') }); });
      line[line.length - 1].t1 = +(line[line.length - 1].t1 + 0.3).toFixed(3);      /* the last words stay up a moment after they are said */
      captions.push.apply(captions, line); });
    nar = { story: story, storyFile: spec.narration, record: recFile, lines: lines, durations: durations, captions: captions, total: acc };
    if (acc + 1.4 > spec.durationLimits[1]) log('note: the narrated reel runs ' + (acc + 1.4).toFixed(1) + ' s (limit ' + spec.durationLimits[1] + ' s)');
  }
  const F = spec.formats[o.format], outDir = path.join(HERE, 'output', o.id, 'explainer', o.reel ? 'reel-' + o.reel : o.format), work = path.join(outDir, '.work');
  const pageFile = path.join(ROOT, entry.path), simDir = path.dirname(pageFile), before = folderHash(simDir);
  fs.mkdirSync(work, { recursive: true });
  let footage;
  if (o.reuse && fs.existsSync(path.join(work, 'footage.json'))) footage = JSON.parse(fs.readFileSync(path.join(work, 'footage.json'), 'utf8'));
  else {
    log('filming ' + entry.path + ' in explainer mode (' + o.format + ', ' + F.width + ' x ' + F.height + ') …');
    fs.rmSync(path.join(work, 'footage'), { recursive: true, force: true });
    const rec = { fps: spec.fps, record: { viewport: { width: F.width, height: F.height, deviceScaleFactor: 1 }, element: '#labcv', maxSeconds: spec.durationLimits[1] + 10, tailSeconds: 0.5,
      actions: [{ eval: 'PX.explainMode("' + o.format + '")' }, { eval: 'PX.explainer.play(' + JSON.stringify(o.reel ? Object.assign({ reel: o.reel }, nar ? { durations: nar.durations, captions: nar.captions } : {}) : {}) + ')' }], done: 'PX.explainer.done()',
      stills: [{ name: 'result', selector: '#labcv' }, { name: 'figure', selector: '#labcv' }],
      /* the machine's GPU and the canvas's own pixels, lossless (docs/RENDERING_PIPELINE_RESEARCH.md) */
      gpu: true, capture: 'canvas-png' } };
    ({ footage } = await record(rec, pageFile, work, log));
  }
  const after = folderHash(simDir);
  const seconds = footage.frames.length / spec.fps;

  /* the scenes as filmed (frame-exact): the beats the soundtrack follows */
  const beats = spec.scenes.map(id => { const k = footage.frames.findIndex(f => f.explainScene === id); return { id: id, t0: +(k / spec.fps).toFixed(4) }; });
  beats.forEach((b, k) => { b.dur = +(((k + 1 < beats.length ? beats[k + 1].t0 : seconds) - b.t0)).toFixed(4); });
  let wav = path.join(work, 'silence.wav'), audioRep = null;
  if (nar){
    log('soundtrack: verified voice over a calm original bed …');
    const ig = footage.frames.findIndex(f => (f.explainIgnition || 0) > 0);
    const plan = { kind: 'explainer', simulationId: o.id + '-reel' + o.reel, subject: entry.subject, chapter: entry.chapter, topic: entry.topic, duration: seconds, fps: spec.fps,
      beats: beats, cues: ig > 0 ? [{ t: +(ig / spec.fps).toFixed(3), type: 'pop', gain: 0.5 }] : [], marks: {}, audio: {},
      voice: { record: nar.record, narration: nar.story.narration } };
    fs.writeFileSync(path.join(work, 'audio-plan.json'), JSON.stringify(plan, null, 1));
    wav = path.join(work, 'audio.wav');
    execFileSync(PY, [path.join(HERE, 'audio.py'), '--plan', path.join(work, 'audio-plan.json'), '--out', wav, '--report', path.join(work, 'audio.json')], { stdio: 'inherit' });
    audioRep = JSON.parse(fs.readFileSync(path.join(work, 'audio.json'), 'utf8'));
    /* captions.srt: the same timings the video burns in */
    const ts = t => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s2 = Math.floor(ms / 1000) % 60;
      return [h, m, s2].map(x => String(x).padStart(2, '0')).join(':') + ',' + String(ms % 1000).padStart(3, '0'); };
    fs.writeFileSync(path.join(outDir, 'captions.srt'), nar.captions.map((c, k) => (k + 1) + '\n' + ts(c.t0) + ' --> ' + ts(c.t1) + '\n' + c.text + '\n').join('\n'));
  } else silence(wav, seconds);
  log('encoding …');
  const bin = encoder(), mp4 = path.join(outDir, 'explainer.mp4');
  execFileSync(bin, ['encode', path.join(work, 'footage'), wav, mp4, String(spec.fps), String(F.width), String(F.height)], { stdio: 'inherit' });
  execFileSync(PY, [path.join(HERE, 'mp4tools.py'), 'strip-edits', mp4, '--audio-priming', String(AAC_PRIMING)]);
  /* the poster: the takeaway scene's settled frame */
  const lastScene = spec.scenes[spec.scenes.length - 1], last = footage.frames.map((f, i) => [f, i]).filter(x => x[0].explainScene === lastScene && x[1] < footage.frames.length - spec.fps * 2.2);
  execFileSync(PY, ['-c', 'import sys\nfrom PIL import Image\nImage.open(sys.argv[1]).convert("RGB").save(sys.argv[2], quality=92)',
    path.join(work, 'footage', 'f' + String(last.length ? last[last.length - 1][1] : footage.frames.length - 1).padStart(5, '0') + '.png'), path.join(outDir, 'poster.jpg')]);

  let commit = ''; try { commit = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD']).toString().trim(); } catch (e) { commit = ''; }
  const m = { simulationId: o.id, kind: 'concept-explainer', template: spec.template, reel: o.reel || null, format: o.format, title: spec.title, design: spec.design, context: ctx,
    sourcePage: entry.path, sourceRevision: entry.revision, sourceStatus: entry.status, repoCommit: commit,
    sourceIntegrity: { folder: path.relative(ROOT, simDir), sha256Before: before, sha256After: after, unchanged: before === after },
    rendering: { renderer: footage.renderer || null, gpu: !!footage.gpu, capture: footage.capture || 'element' },
    video: { file: 'explainer.mp4', width: F.width, height: F.height, fps: spec.fps, seconds: +seconds.toFixed(3), frames: footage.frames.length },
    scenes: spec.scenes.map(id => { const fr = footage.frames.map((f, i) => [f, i]).filter(x => x[0].explainScene === id); return { id: id, t0: fr.length ? +(fr[0][1] / spec.fps).toFixed(3) : null, t1: fr.length ? +((fr[fr.length - 1][1] + 1) / spec.fps).toFixed(3) : null }; }),
    audio: nar ? { summary: 'a verified, licensed AI voiceover (' + ((audioRep.mix || {}).voice || {}).assetId + ') over an original PrayogX score, generated by tools/reel-maker/audio.py',
        aiNarration: true, narration: nar.storyFile, voiceRecord: path.relative(ROOT, nar.record), captions: 'captions.srt', disclosureText: ((audioRep.mix || {}).voice || {}).disclosureText,
        score: audioRep.score && { style: audioRep.score.style, bpm: audioRep.score.bpm, key: audioRep.score.key }, durations: nar.durations }
      : { summary: 'silent track (visual master): narration and music not added yet', aiNarration: false },
    created: new Date().toISOString() };
  log('checking …');
  const checks = check(m, spec, work, outDir, bin, footage);
  if (nar){
    try {
      const dec = path.join(work, 'decoded.wav'); execFileSync(bin, ['audio', mp4, dec]);
      const input = path.join(work, 'audio-check.json');
      fs.writeFileSync(input, JSON.stringify({ kind: 'explainer', decoded: dec, rendered: path.join(work, 'audio.wav'), music: path.join(work, 'music.wav'), report: path.join(work, 'audio.json'),
        probe: JSON.parse(execFileSync(bin, ['probe', mp4]).toString()), beats: beats, marks: {}, seconds: seconds, fps: spec.fps,
        voice: path.join(work, 'voice.wav'), musicBed: path.join(work, 'music-bed.wav'), narration: nar.story.narration, story: null }));
      const r = JSON.parse(execFileSync(PY, [path.join(HERE, 'audio_check.py'), input], { maxBuffer: 16 << 20 }).toString());
      r.checks.forEach(c => checks.push({ name: 'audio: ' + c.name, ok: c.ok, detail: c.detail })); m.audio.measured = r.measured;
    } catch (e) { checks.push({ name: 'audio: the MP4\'s audio track could be decoded and analysed', ok: false, detail: String(e.message || e).split('\n')[0] }); }
    checks.push({ name: 'captions: every spoken line is captioned, in the safe area, and written to captions.srt', ok: nar.captions.length >= nar.lines.length && fs.existsSync(path.join(outDir, 'captions.srt')),
      detail: nar.captions.length + ' caption chunks for ' + nar.lines.length + ' lines' });
  }
  const passed = checks.filter(c => c.ok).length;
  m.checks = checks;
  m.status = passed !== checks.length ? 'CHECKS_FAILED' : nar ? 'READY_FOR_REVIEW' : 'VISUAL_MASTER';
  if (m.status !== 'CHECKS_FAILED') m.hashes = Object.assign({ 'explainer.mp4': sha256(mp4), 'poster.jpg': sha256(path.join(outDir, 'poster.jpg')) }, nar ? { 'captions.srt': sha256(path.join(outDir, 'captions.srt')) } : {});
  fs.writeFileSync(path.join(outDir, 'explainer.json'), JSON.stringify(m, null, 2) + '\n');
  checks.forEach(c => log((c.ok ? 'PASS  ' : 'FAIL  ') + c.name + (c.detail ? '   ' + c.detail : '')));
  log('\n' + passed + ' / ' + checks.length + ' explainer checks passed · ' + seconds.toFixed(2) + ' s · ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s to build');
  log(m.status + ': ' + path.relative(ROOT, mp4));
  process.exit(m.status === 'CHECKS_FAILED' ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
