#!/usr/bin/env python3
"""Tests for Smart QA (qa_ledger.py, scene_render.py planning, qa_rules.json, the qa-round schema).
Runs against a throwaway studio folder (PRAYOGX_STUDIO), never the real one:  python3 tests/test_smart_qa.py"""
import json, os, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = tempfile.mkdtemp(prefix='smartqa-')
os.environ['PRAYOGX_STUDIO'] = TMP
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import qa_ledger as Q  # noqa: E402
import scene_render as SR  # noqa: E402
from px2_common import load, save, schema, validate  # noqa: E402

ok, bad = [], []


def t(name, cond):
    (ok if cond else bad).append(name)
    print(('PASS ' if cond else 'FAIL ') + name)


SLUG = 'smart-topic'
J = os.path.join(TMP, 'jobs', SLUG)
SRC = os.path.join(TMP, 'src', SLUG)
os.makedirs(J); os.makedirs(SRC)
open(os.path.join(J, 'package.ref'), 'w').write('RM-12-CHE-08-997\n')
open(os.path.join(J, 'script.md'), 'w').write('Sm melts at 1345 K; 60 ppm.')
open(os.path.join(SRC, 'timing.ts'), 'w').write(
    'export const FPS = 30;\nexport const LEAD = 4;\nexport const TAIL = 6;\nexport const END_HOLD = 110;\n')
save(os.path.join(SRC, 'voice.json'), [{'scene': 1, 'seconds': 2.0}, {'scene': 2, 'seconds': 3.0}])
save(os.path.join(SRC, 'holds.json'), {'1': 10})
open(os.path.join(SRC, 'Stage.tsx'), 'w').write('export const x = 1;\n')

# scenes mirror timing.ts
sc = Q.scenes(SLUG)
t('scenes mirror timing.ts', [(s['from'], s['to']) for s in sc] == [(0, 80), (80, 290)] and sc[1]['vo'] == 84)

# Round 0 rules
item = lambda text, px, rect, **k: dict(text=text, px=px, rect=rect, op=k.get('op', 1), eq=k.get('eq', False), decor=k.get('decor', False))
layout = {'width': 1080, 'height': 1920, 'samples': [{'f': 10, 'items': [
    item('tiny label', 20, [300, 300, 100, 20]),
    item('cut caption', 50, [-10, 600, 300, 60]),
    item('edge tag', 44, [20, 900, 200, 50]),
    item('Hf 173 pm', 50, [300, 1200, 300, 60]),
    item('Sm 1345 K', 50, [320, 1210, 300, 60]),
    item('faded', 10, [300, 1500, 100, 20], op=0.2),
    item('decor', 10, [300, 1600, 100, 20], decor=True),
    item('2Ln + 3Cl2 → 2LnCl3', 44, [100, 400, 800, 60], eq=True)]}]}
rules = {r for r, *_ in Q.eval_layout(layout, sc, Q.sources_numbers(SLUG))}
t('tiny text is found', 'text-tiny' in rules)
t('clipped text is found', 'text-clipped' in rules)
t('safe-area margin is found', 'safe-area' in rules)
t('collision is found', 'text-collision' in rules)
t('equation under 48 px is found', 'equation-small' in rules)
found = Q.eval_layout(layout, sc, Q.sources_numbers(SLUG))
t('unsourced number found, sourced one not', any(r == 'number-unsourced' and k == '173' for r, s, k, *_ in found)
  and not any(r == 'number-unsourced' and k == '1345' for r, s, k, *_ in found))
t('faded and decor text are skipped', not any('faded' in k or k == 'decor' for r, s, k, *_ in found))
stills = Q.eval_stills({'results': [{'check': 'static stretches over 2 s (info)', 'detail': [[84, 160]]}]}, sc)
t('still under narration is found', stills and stills[0][0] == 'still-under-narration' and stills[0][1] == 2)
open(os.path.join(SRC, 'Bad.tsx'), 'w').write('const r = Math.random();\n')
t('non-deterministic code is found', any(r == 'nondeterministic-code' for r, *_ in Q.eval_code(SLUG)))
os.remove(os.path.join(SRC, 'Bad.tsx'))

# ledger: regression guard
save(os.path.join(J, 'qa', 'auto', 'layout.json'), layout)
rc = Q.cmd_auto(SLUG)
L = Q.ledger(SLUG)
t('Round 0 blocks while issues are open', rc == 1 and len(L['items']) >= 5)
tiny = next(i for i in L['items'] if i['key'].startswith('text-tiny'))
Q.cmd_fix(SLUG, [tiny['id']], [])
Q.cmd_auto(SLUG)  # still fires: the fix did not work
t('a fixed issue that fires again is reopened', next(i for i in Q.ledger(SLUG)['items'] if i['id'] == tiny['id'])['status'] == 'reopened')
save(os.path.join(J, 'qa', 'auto', 'layout.json'), {'width': 1080, 'height': 1920, 'samples': [{'f': 10, 'items': []}]})
rc = Q.cmd_auto(SLUG)
t('issues that stop firing are verified and Round 0 is clean',
  rc == 0 and all(i['status'] == 'verified' for i in Q.ledger(SLUG)['items']))

# reviews: severity, computed score, backlog rule, pass
checks = [{'n': i, 'answer': 'yes', 'evidence': 'frame evidence here'} for i in range(1, 11)]
r1 = {'reviewer': 'subagent', 'independent': True, 'render': 'x.mp4', 'checks': checks, 'issues': [
    {'severity': 'major', 'area': 'typography', 'check': 7, 't': '00:01.0', 'issue': 'label collides', 'fix': 'move it'},
    {'severity': 'minor', 'area': 'camera', 'check': 9, 't': '00:05.0', 'issue': 'push could be richer', 'fix': 'longer push'}]}
t('qa-round schema accepts a round', validate(r1, schema('qa-round')) == [])
t('qa-round schema rejects an unknown severity',
  validate(dict(r1, issues=[dict(r1['issues'][0], severity='high')]), schema('qa-round')) != [])
p = os.path.join(TMP, 'r1.json'); save(p, r1)
Q.cmd_review(SLUG, p)
qa = load(os.path.join(J, 'qa.json'))
t('an open major forces its check to "no" and blocks', qa['decision'] == 'FIX' and qa['checks'][6]['answer'] == 'no')
t('score is computed from deductions (100 − 3 − 0.5)', qa['score'] in (96, 97) and qa['areas']['typography'] == 7)
t('qa.json still fits the qa schema', validate(qa, schema('qa')) == [])
maj = next(i for i in Q.ledger(SLUG)['items'] if i['round'] == 1 and i['severity'] == 'major')
Q.cmd_fix(SLUG, [maj['id']], [])          # scene 1 changed
r2 = dict(r1, verified=[maj['id']], issues=[
    {'severity': 'major', 'area': 'visuals', 'check': 5, 't': '00:05.0', 'issue': 'late find in unchanged scene 2', 'fix': 'fix it'}])
p2 = os.path.join(TMP, 'r2.json'); save(p2, r2)
rc = Q.cmd_review(SLUG, p2)
L = Q.ledger(SLUG)
late = next(i for i in L['items'] if i['round'] == 2)
t('a late non-critical issue in an unchanged scene goes to the backlog', late['status'] == 'backlog')
t('verified fix + backlog → PASS', rc == 0 and load(os.path.join(J, 'qa.json'))['decision'] == 'PASS')

# escalation: a critical still open after review 2; no fourth review
S2 = 'smart-esc'
shutil.copytree(J, os.path.join(TMP, 'jobs', S2)); shutil.copytree(SRC, os.path.join(TMP, 'src', S2))
for f in ('qa', 'qa.json'):
    p_ = os.path.join(TMP, 'jobs', S2, f)
    shutil.rmtree(p_) if os.path.isdir(p_) else os.remove(p_)
rc_ = dict(r1, issues=[{'severity': 'critical', 'area': 'accuracy', 'check': 1, 't': '00:01.0', 'issue': 'made-up number', 'fix': 'remove'}])
pc = os.path.join(TMP, 'rc.json'); save(pc, rc_)
Q.cmd_review(S2, pc)
cid = Q.ledger(S2)['items'][0]['id']
save(pc, dict(rc_, issues=[], reopened=[cid]))
Q.cmd_review(S2, pc)
t('a critical open after review 2 escalates to the owner', Q.decide(Q.ledger(S2))[0] == 'ESCALATE'
  and os.path.exists(os.path.join(TMP, 'jobs', S2, 'qa', 'escalation.md')))
Q.cmd_review(S2, pc)  # verification review (3rd) is allowed
r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'qa_ledger.py'), 'review', S2, pc],
                   capture_output=True, text=True, env=os.environ)
t('a fourth review is refused', r.returncode != 0 and 'escalated' in r.stderr)
Q.cmd_waive(S2, cid, 'owner accepts')
t('an owner waiver clears the item', Q.ledger(S2)['items'][0]['status'] == 'waived')

# past jobs are never managed
os.makedirs(os.path.join(TMP, 'jobs', 'old-job'))
r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'qa_ledger.py'), 'status', 'old-job'],
                   capture_output=True, text=True, env=os.environ)
t('ledger refuses a past job', r.returncode != 0 and 'Past jobs' in r.stderr)
r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'scene_render.py'), 'old-job', 'X'],
                   capture_output=True, text=True, env=os.environ)
t('scene renderer refuses a past job', r.returncode != 0 and 'never re-rendered' in r.stderr)

# scene render planning
man = {'scenes': {'1': {'from': 0, 'to': 80, 'file': 's01.mp4'}, '2': {'from': 80, 'to': 240, 'file': 's02.mp4'}}}
t('plan: only moved, forced or changed scenes', SR.plan(sc, man, [], set()) == [2] and SR.plan(sc, man, [1], set()) == [1, 2])
man['scenes']['2']['to'] = 290
t('plan: nothing to do when nothing changed', SR.plan(sc, man, [], set()) == [])
t('plan: a scene whose stills changed is rendered', SR.plan(sc, man, [], {1}) == [1])

# segment join keeps every frame (the mechanism scene_render uses)
d = os.path.join(TMP, 'seg')
os.makedirs(d)
for i, n in ((1, 17), (2, 23)):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'testsrc=size=108x192:rate=30', '-frames:v', str(n),
                    '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', os.path.join(d, f's{i}.mp4')], check=True)
open(os.path.join(d, 'l.txt'), 'w').write(f"file '{d}/s1.mp4'\nfile '{d}/s2.mp4'\n")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', os.path.join(d, 'l.txt'), '-c', 'copy',
                os.path.join(d, 'j.mp4')], check=True)
n = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames',
                    '-of', 'csv=p=0', os.path.join(d, 'j.mp4')], capture_output=True, text=True).stdout.strip()
t('joined segments keep every frame (17 + 23 = 40)', n == '40')

shutil.rmtree(TMP)
print(f'\n{len(ok)} passed, {len(bad)} failed')
sys.exit(1 if bad else 0)
