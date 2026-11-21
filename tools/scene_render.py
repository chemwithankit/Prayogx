#!/usr/bin/env python3
"""Scene-level render with reuse, for NEW reels (owner approved 2026-11-22; docs/architecture/10-smart-qa-render.md).

    python3 tools/scene_render.py <slug> <Comp>                 render only the scenes that changed, then assemble
    python3 tools/scene_render.py <slug> <Comp> --scenes 4 7    also force these scenes
    python3 tools/scene_render.py <slug> <Comp> --all           render every scene (first render, or to be safe)

Each scene of src/<slug>/timing.ts is rendered video-only (`remotion render --frames=a-b --muted`) into
jobs/<slug>/renders/scenes/, the audio once per audio change (Remotion's AAC), and the segments are joined with ffmpeg (stream copy)
into the usual renders/prayogx_<slug>.mp4, so qa_reel.py and everything after it work unchanged.

A scene is re-rendered when: it is new or its frame window moved; it is named with --scenes; or its stills changed
(0.25-scale stills from `qa_auto.mjs <job> --stills`, compared with the stills of the last scene render). Stills must
be newer than the code. Frames must be a pure function of the frame number: Math.random / Date in src/<slug>/ forces
--all. Checks every segment's frame count and the joined total, runs qa_reel.py, records the re-rendered scenes in
the QA ledger as changed. The thumbnail and the release copy are NOT made here: make them once, after approval
(scripts/session-helpers/render.sh or jobs/<slug>/release.sh). The old render.sh is unchanged.
"""
import argparse, glob, hashlib, json, os, shutil, subprocess, sys

sys.path.insert(0, os.path.dirname(__file__))
from px2_common import REPO, STUDIO, load, save  # noqa: E402
import qa_ledger as Q  # noqa: E402

PY = os.path.join(REPO, 'tests', '.venv', 'bin', 'python')
AUDIO_INPUTS = ('Soundtrack.tsx', 'cues.ts', 'timing.ts', 'voice.json', 'holds.json')


def sh(cmd, **kw):
    r = subprocess.run(cmd, cwd=STUDIO, capture_output=True, text=True, **kw)
    if r.returncode:
        sys.exit(f'failed: {" ".join(cmd[:4])} …\n{(r.stderr or r.stdout)[-1500:]}')
    return r.stdout


def nframes(mp4):
    return int(sh(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
                   'stream=nb_read_frames', '-of', 'csv=p=0', mp4]).strip())


def entry_args(slug):
    e = os.path.join('src', slug, 'entry.tsx')
    return [e] if os.path.exists(os.path.join(STUDIO, e)) else []


def audio_key(slug):
    h = hashlib.sha256()
    for f in AUDIO_INPUTS:
        p = os.path.join(STUDIO, 'src', slug, f)
        if os.path.exists(p):
            h.update(open(p, 'rb').read())
    for p in sorted(glob.glob(os.path.join(STUDIO, 'public', slug, '**', '*.*'), recursive=True)):
        if p.lower().endswith(('.wav', '.mp3', '.aac', '.m4a')):
            st = os.stat(p)
            h.update(f'{p}{st.st_size}{int(st.st_mtime)}'.encode())
    return h.hexdigest()[:16]


def newest_code(slug):
    fs = glob.glob(os.path.join(STUDIO, 'src', slug, '**', '*'), recursive=True)
    return max(os.path.getmtime(f) for f in fs if os.path.isfile(f))


def still_diff(a, b):
    from PIL import Image, ImageChops
    ia, ib = Image.open(a).convert('L'), Image.open(b).convert('L')
    if ia.size != ib.size:
        return 255.0
    h = ImageChops.difference(ia, ib).histogram()
    return sum(i * n for i, n in enumerate(h)) / max(1, sum(h))


def changed_by_stills(sc, stills, base, thr):
    """Scenes whose current stills differ from the baseline stills of the last scene render."""
    dirty = set()
    for p in glob.glob(os.path.join(stills, 'f_*.jpg')):
        f = int(os.path.basename(p)[2:7])
        s = Q.scene_at(sc, f)
        q = os.path.join(base, os.path.basename(p))
        if s is not None and (not os.path.exists(q) or still_diff(p, q) > thr):
            dirty.add(s)
    return dirty


def plan(sc, manifest, forced, by_stills):
    """Pure decision (tested): which scenes to render."""
    old = manifest.get('scenes', {})
    out = set(forced) | set(by_stills)
    for s in sc:
        m = old.get(str(s['n']))
        if not m or (m['from'], m['to']) != (s['from'], s['to']) or not m.get('file'):
            out.add(s['n'])
    return sorted(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('slug'); ap.add_argument('comp')
    ap.add_argument('--scenes', nargs='*', type=int, default=[])
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--out', help='write the cache and the joined render here instead of the job (pilots)')
    ap.add_argument('--no-qa', action='store_true')
    a = ap.parse_args()
    slug = a.slug
    jobdir = os.path.join(STUDIO, 'jobs', slug)
    if not os.path.exists(os.path.join(jobdir, 'package.ref')) and not a.out:
        sys.exit(f'{slug}: not a PrayogX 2.0 job (no package.ref). Past jobs are never re-rendered.')
    R = Q.RULES
    sc = Q.scenes(slug)
    total = sc[-1]['to']
    base = os.path.abspath(a.out) if a.out else os.path.join(jobdir, 'renders')
    cache = os.path.join(base, 'scenes')
    os.makedirs(cache, exist_ok=True)
    mpath = os.path.join(cache, 'manifest.json')
    manifest = load(mpath, {'scenes': {}})

    every = a.all or not manifest['scenes']
    if Q.eval_code(slug):
        print('note: Math.random / Date in the scene code: every scene is re-rendered (no reuse).')
        every = True
    stills = os.path.join(jobdir, 'qa', 'auto', 'stills')
    by_stills = set()
    if not every:
        lay = os.path.join(jobdir, 'qa', 'auto', 'layout.json')
        if a.out and not glob.glob(os.path.join(stills, 'f_*.jpg')):
            print('pilot (--out): no stills, so only moved or --scenes scenes are rendered')
        elif not glob.glob(os.path.join(stills, 'f_*.jpg')) or os.path.getmtime(lay) < newest_code(slug):
            sys.exit('stills are missing or older than the code: run `node scripts/session-helpers/qa_auto.mjs '
                     f'{slug} --stills` first (it is Round 0 anyway), or pass --all')
        by_stills = changed_by_stills(sc, stills, os.path.join(cache, 'stills'), R['stillsDiffThreshold'])
    todo = [s['n'] for s in sc] if every else plan(sc, manifest, a.scenes, by_stills)
    print(f'{len(todo)} of {len(sc)} scenes to render: {todo}' + (f' (stills changed: {sorted(by_stills)})' if by_stills else ''))

    for s in sc:
        if s['n'] not in todo:
            continue
        out = os.path.join(cache, f's{s["n"]:02d}.mp4')
        sh(['npx', 'remotion', 'render', *entry_args(slug), a.comp, out, f'--frames={s["from"]}-{s["to"] - 1}', '--muted',
            '--codec=h264', '--crf=18', '--concurrency=100%', '--log=error'])
        got = nframes(out)
        if got != s['to'] - s['from']:
            sys.exit(f'scene {s["n"]}: {got} frames, expected {s["to"] - s["from"]}')
        manifest['scenes'][str(s['n'])] = {'from': s['from'], 'to': s['to'], 'file': os.path.basename(out)}
        print(f'  scene {s["n"]}: frames {s["from"]}–{s["to"] - 1} rendered')
    for k in [k for k in manifest['scenes'] if int(k) not in {s['n'] for s in sc}]:
        manifest['scenes'].pop(k)

    wav = os.path.join(cache, 'audio.m4a')  # Remotion's own AAC encode, exactly as a full render (true peak kept)
    ak = audio_key(slug)
    if manifest.get('audioKey') != ak or not os.path.exists(wav) or every:
        sh(['npx', 'remotion', 'render', *entry_args(slug), a.comp, wav, '--codec=aac', '--log=error'])
        manifest['audioKey'] = ak
        print('  audio rendered')
    else:
        print('  audio reused')

    lst = os.path.join(cache, 'concat.txt')
    with open(lst, 'w') as f:
        for s in sc:
            f.write(f"file '{os.path.join(cache, manifest['scenes'][str(s['n'])]['file'])}'\n")
    video = os.path.join(cache, 'joined-video.mp4')
    sh(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', video])
    final = os.path.join(base, f'prayogx_{slug.replace("-", "_")}.mp4')
    sh(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-movflags', '+faststart', final])
    got = nframes(final)
    if got != total:
        sys.exit(f'joined render has {got} frames, the composition {total}: fall back to render.sh')
    print(f'joined: {final} ({got} frames = composition)')

    if os.path.isdir(stills) and glob.glob(os.path.join(stills, 'f_*.jpg')):
        shutil.rmtree(os.path.join(cache, 'stills'), ignore_errors=True)
        shutil.copytree(stills, os.path.join(cache, 'stills'))
    save(mpath, manifest)
    if not a.out:
        Q.cmd_changed(slug, todo)
    if not a.no_qa:
        qa_out = os.path.join(base, 'qa_check.json') if a.out else os.path.join(jobdir, 'qa', 'qa_check.json')
        r = subprocess.run([PY if os.path.exists(PY) else sys.executable, 'scripts/qa_reel.py', slug, final, qa_out],
                           cwd=STUDIO, capture_output=True, text=True)
        print('qa_reel:', ((r.stdout + r.stderr).strip().splitlines() or [''])[-1])


if __name__ == '__main__':
    main()
