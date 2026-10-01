/* PrayogX Reel Maker - validation of one generated reel.

   Reads the encoded MP4 back through AVFoundation (encode.swift probe / frames), the composed frames and the
   composer's per-frame report (what was drawn, every text box). Checks: the files; 9:16 at 1080 x 1920, H.264 +
   AAC, playable, 20-40 s; the decoded video matches the composition; no black or empty stretch; every story
   beat present (question, real simulation footage, aha, answer, branding); text inside the Instagram-safe area;
   the thumbnail and the caption.                                                                          */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const PY = fs.existsSync(path.join(ROOT, 'tests/.venv/bin/python3')) ? path.join(ROOT, 'tests/.venv/bin/python3') : 'python3';

/* luminance statistics of images, and the difference between pairs, in Python (PIL + numpy) */
function imageStats(files, pairs) {
  const code = `
import json, sys
import numpy as np
from PIL import Image
d = json.loads(sys.stdin.read())
def arr(f): return np.asarray(Image.open(f).convert('L').resize((135, 240)), dtype=float)
st = [[float(a.mean()), float(a.std())] for a in map(arr, d['files'])]
df = [float(np.abs(arr(a) - arr(b)).mean()) for a, b in d['pairs']]
print(json.dumps({'stats': st, 'diffs': df}))`;
  return JSON.parse(execFileSync(PY, ['-c', code], { input: JSON.stringify({ files: files, pairs: pairs }), maxBuffer: 64 << 20 }).toString());
}

async function validate(outDir, work, manifest, bin, spec) {
  const checks = [];
  const ok = (name, cond, detail) => checks.push({ name: name, ok: !!cond, detail: detail === undefined ? '' : String(detail) });
  const mp4 = path.join(outDir, 'reel.mp4'), thumb = path.join(outDir, 'thumbnail.jpg'), cap = path.join(outDir, 'caption.txt');
  const size = f => (fs.existsSync(f) ? fs.statSync(f).size : 0);
  ok('outputs exist: reel.mp4, thumbnail.jpg, caption.txt', size(mp4) > 100000 && size(thumb) > 20000 && size(cap) > 50, [size(mp4), size(thumb), size(cap)].join(' / ') + ' bytes');

  /* the container, read back */
  const pr = JSON.parse(execFileSync(bin, ['probe', mp4]).toString());
  const lim = spec.durationLimits || [20, 40];
  ok('duration ' + lim[0] + '-' + lim[1] + ' s', pr.duration >= lim[0] && pr.duration <= lim[1], pr.duration.toFixed(2) + ' s');
  ok('vertical 9:16 at 1080 x 1920', pr.width === 1080 && pr.height === 1920, pr.width + ' x ' + pr.height);
  ok('H.264 video at ' + manifest.video.fps + ' fps, AAC stereo audio, playable', pr.video === 'avc1' && Math.abs(pr.fps - manifest.video.fps) < 0.5 && pr.audio === 'aac ' && pr.channels === 2 && pr.playable,
    pr.video + ' ' + pr.fps + ' fps, ' + pr.audio + ' x' + pr.channels + ', playable ' + pr.playable);

  /* decode the MP4 at the middle of every beat and compare with the composed frame */
  const fr = JSON.parse(fs.readFileSync(path.join(work, 'frames.json'), 'utf8')), fps = fr.fps, R = fr.report;
  const mids = manifest.beats.map(b => b.t0 + b.dur / 2), pdir = path.join(work, 'probe');
  execFileSync(bin, ['frames', mp4, pdir, mids.map(x => x.toFixed(3)).join(',')]);
  const comp = mids.map(t => path.join(work, 'frames', 'c' + String(Math.round(t * fps)).padStart(5, '0') + '.jpg'));
  const allFrames = fs.readdirSync(path.join(work, 'frames')).filter(f => f.endsWith('.jpg')).sort().map(f => path.join(work, 'frames', f));
  const S = imageStats(allFrames, mids.map((t, i) => [path.join(pdir, 'probe' + i + '.png'), comp[i]]));
  const worst = Math.max.apply(null, S.diffs);
  ok('the decoded video matches the composition at every beat (mean difference < 6 of 255)', worst < 6, 'worst ' + worst.toFixed(2));
  const dark = S.stats.map((s, i) => [i, s]).filter(x => x[1][0] < 6 || x[1][1] < 3);
  ok('no black or empty frame anywhere (' + allFrames.length + ' frames checked)', dark.length === 0, dark.length ? 'first at ' + (dark[0][0] / fps).toFixed(2) + ' s' : 'mean luminance ' + Math.min.apply(null, S.stats.map(s => s[0])).toFixed(1) + '+');

  /* the story */
  const ids = manifest.beats.map(b => b.id);
  ok('every beat present: hook, context, question, problem, curiosity, simulation, answer, payoff',
     ['hook', 'context', 'question', 'problem', 'curiosity', 'answer', 'payoff'].every(x => ids.indexOf(x) >= 0) && ids.some(x => x.startsWith('moment-')), ids.join(' > '));
  const beatOf = f => R[f] ? R[f].beat : '';
  const qText = JSON.parse(fs.readFileSync(path.join(work, 'question.json'), 'utf8'));
  const firstItem = ((qText.lists[0] || {}).items || [''])[0].replace(/^\(\w\)\s*/, '').split(' ').slice(0, 3).join(' ');
  const qFrames = R.map((r, f) => [r, f]).filter(x => x[0].beat === 'question');
  ok('the question appears, as the page states it ("' + firstItem + '…")', qFrames.length > 0 && qFrames[qFrames.length - 1][0].boxes.some(b => b.text.indexOf(firstItem) >= 0));
  const mFrames = R.filter(r => r.beat.startsWith('moment-'));
  ok('the real simulation footage is on screen through every experiment beat', mFrames.length > 0 && mFrames.every(r => r.footage), mFrames.length + ' frames, ' + (mFrames.length / fps).toFixed(1) + ' s');
  const sim = manifest.footage;
  ok('the footage is the real page, recorded to its end with no page errors', sim.frames > fps * 5 && sim.pageErrors.length === 0, sim.frames + ' frames of ' + manifest.sourcePage);
  const aha = (spec.story.moments || []).some(m => m.aha) ? R.filter(r => r.beat.startsWith('moment-')).some(r => r.boxes.some(b => b.text === spec.story.moments.find(m => m.aha).aha.kicker)) : true;
  ok('the aha moment appears', aha);
  const ans = String(manifest.answer), aFrames = R.filter(r => r.beat === 'answer');
  ok('the answer reveal appears: OPTION ' + ans, aFrames.some(r => r.boxes.some(b => b.text.indexOf('OPTION ' + ans) === 0)) && R[R.length - 1].beat === 'payoff');
  const branded = R.filter(r => r.brand).length;
  ok('PrayogX branding on screen (watermark through the reel, logo + wordmark at the end)', branded / R.length > 0.95 && R.filter(r => r.beat === 'payoff').some(r => r.boxes.some(b => b.text === 'PRAYOGX')), (100 * branded / R.length).toFixed(0) + ' % of frames');

  /* text inside the Instagram-safe area, nothing off the frame */
  const SF = fr.safe, bad = [];
  R.forEach((r, f) => r.boxes.forEach(b => { if (b.x < SF.x0 - 2 || b.x + b.w > SF.x1 + 2 || b.y < SF.y0 - 2 || b.y + b.h > SF.y1 + 2) bad.push([f, b]); }));
  ok('every caption and label stays inside the safe area (' + SF.x0 + '-' + SF.x1 + ' x ' + SF.y0 + '-' + SF.y1 + ')', bad.length === 0,
     bad.length ? bad.length + ' boxes, first "' + bad[0][1].text.slice(0, 40) + '" at ' + (bad[0][0] / fps).toFixed(2) + ' s (' + bad[0][1].x.toFixed(0) + ',' + bad[0][1].y.toFixed(0) + ' w ' + bad[0][1].w.toFixed(0) + ')' : 'all ' + R.reduce((a, r) => a + r.boxes.length, 0) + ' boxes');

  /* thumbnail and caption */
  const th = fr.thumbnail, tbad = th.boxes.filter(b => b.x < 0 || b.x + b.w > 1080 || b.y < 0 || b.y + b.h > 1920);
  ok('thumbnail: 1080 x 1920, the question hook, the exam, the brand, nothing off the frame', th.drew.brand && th.drew.footage && tbad.length === 0 && th.boxes.some(b => /JEE/.test(b.text)), th.boxes.length + ' text boxes');
  const ct = fs.readFileSync(cap, 'utf8');
  ok('caption: hook, exam context, hashtags, under 2200 characters, no spoiler', ct.length < 2200 && /#\w+/.test(ct) && /JEE Advanced/.test(ct) && !new RegExp('option\\s*\\(?' + ans + '\\)?\\b|P→5', 'i').test(ct), ct.length + ' characters');

  return { passed: checks.filter(c => c.ok).length, checks: checks, probe: pr };
}

module.exports = { validate };
