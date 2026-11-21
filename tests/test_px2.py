#!/usr/bin/env python3
"""Tests for the PrayogX 2.0 tools (content package, maths validator, gate runner, router, analytics scopes).
Runs against a throwaway studio folder (PRAYOGX_STUDIO), never the real one:  python3 tests/test_px2.py"""
import json, os, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = tempfile.mkdtemp(prefix='px2-')
os.environ['PRAYOGX_STUDIO'] = TMP
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import maths_validator as MV  # noqa: E402
import content_package as CP  # noqa: E402
import reel_pipeline as RP  # noqa: E402
import model_router as MR  # noqa: E402
import youtube_publish as YP  # noqa: E402
from px2_common import save, validate  # noqa: E402

ok, bad = [], []


def t(name, cond):
    (ok if cond else bad).append(name)
    print(('PASS ' if cond else 'FAIL ') + name)


RM, SLUG = 'RM-12-CHE-08-999', 'test-topic'
os.makedirs(os.path.join(TMP, 'cbse-series', 'roadmap'))
with open(os.path.join(TMP, 'cbse-series', 'roadmap', '12-chemistry.csv'), 'w') as f:
    f.write('id,subject,title,ncert_ref\n%s,Chemistry,Test Topic,12.1\n' % RM)

# maths validator
t('balanced redox with electrons', MV.balanced('MnO4^- + 8 H^+ + 5 e^- -> Mn^2+ + 4 H2O')[0])
t('unbalanced equation caught', not MV.balanced('2 H2 + O2 -> H2O')[0])
t('charge imbalance caught', not MV.balanced('Fe^3+ + e^- -> Fe')[0])
t('hydrate and conditions', MV.balanced('CuSO4·5H2O ->[Δ] CuSO4 + 5 H2O')[0])
t('numeric check', MV.check_equation({'kind': 'numeric', 'expr': '2*6.022e23', 'expected': 1.2044e24})[0])
t('malformed is a failure, not a crash', not MV.check_equation({'kind': 'chemical', 'expr': 'nonsense'})[0])

# content package
CP.init(RM, SLUG)
pk = os.path.join(TMP, 'packages', RM)
t('init creates the package and the job link', os.path.exists(os.path.join(pk, 'package.json'))
  and open(os.path.join(TMP, 'jobs', SLUG, 'package.ref')).read().strip() == RM)
t('empty package fails check', len(CP.check(RM)) > 0)
facts = [{'id': f'F{i}', 'statement': f'Fact number {i}', 'sources': ['NCERT 12.1'], 'checkedBy': ['claude', 'gemini']}
         for i in range(1, 6)]
save(os.path.join(pk, 'facts.json'), {'conceptId': RM, 'facts': facts})
save(os.path.join(pk, 'glossary.json'), {'terms': [{'term': 'precipitate', 'forbidden': ['अवक्षेप']}]})
save(os.path.join(pk, 'coverage.json'), {'items': [{'item': 'Method 1', 'kind': 'preparation', 'where': 'video'}]})
qs = [{'id': f'Q{i}', 'q': f'Question {i}?', 'answer': 'A', 'factRefs': ['F1'], 'difficulty': 'easy',
       'use': ['quiz'] if i < 10 else (['workbook'] if i < 35 else [])} for i in range(40)]
save(os.path.join(pk, 'questions.json'), {'questions': qs})
save(os.path.join(pk, 'equations.json'), {'equations': [{'id': 'E1', 'kind': 'chemical', 'expr': '2 H2 + O2 -> 2 H2O'}]})
t('complete package passes', CP.check(RM) == [])
qs[0]['use'] = []
save(os.path.join(pk, 'questions.json'), {'questions': qs})
t('quiz must be exactly 10', any('quiz has 9' in e for e in CP.check(RM)))
qs[0]['use'] = ['quiz']
save(os.path.join(pk, 'questions.json'), {'questions': qs})
save(os.path.join(pk, 'coverage.json'), {'items': [{'item': 'Method 1', 'kind': 'preparation', 'where': 'notes-only', 'reason': 'x'}]})
t('a preparation left to the notes fails', any('must be shown in the video' in e for e in CP.check(RM)))
save(os.path.join(pk, 'coverage.json'), {'items': [{'item': 'Method 1', 'kind': 'preparation', 'where': 'video'}]})
note = os.path.join(TMP, 'note.md')
open(note, 'w').write('यह अवक्षेप है')
t('glossary catches a translated term', any('अवक्षेप' in e for e in CP.check(RM, [note])))

# refuse a past reel
os.makedirs(os.path.join(TMP, 'jobs', 'old-reel', 'renders'))
open(os.path.join(TMP, 'jobs', 'old-reel', 'renders', 'x.mp4'), 'w').write('x')
r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'content_package.py'), 'init', 'RM-12-CHE-08-998',
                    '--slug', 'old-reel'], capture_output=True, text=True, env=os.environ)
t('init refuses a job that already has a render', r.returncode != 0 and 'never changed' in r.stderr)

# gate runner
r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'reel_pipeline.py'), 'check', 'old-reel'],
                   capture_output=True, text=True, env=os.environ)
t('gate runner ignores past jobs', r.returncode != 0 and 'not a PrayogX 2.0 job' in r.stderr)
open(os.path.join(TMP, 'jobs', SLUG, 'research.md'), 'w').write('# research')
t('stops at the hook gate', RP.check(SLUG) == 'RESEARCHED')
hooks = {'candidates': [{'type': ty, 'line': 'A visible surprise line', 'visual': 'beaker turns purple', 'claimCheck': 'true'}
                        for ty in ('visual-paradox', 'question', 'mystery', 'number-shock', 'real-observation')],
         'chosen': 0, 'reason': 'best fits this topic', 'first3s': {'frame0': 'clear liquid', 'byFrame30': 'turns purple'}}
save(os.path.join(TMP, 'jobs', SLUG, 'hooks.json'), hooks)
t('passes the hook gate, stops at the script', RP.check(SLUG) == 'HOOKED')
t('hook log records the type', json.load(open(RP.HOOK_LOG))[-1]['type'] == 'visual-paradox')
state = json.load(open(os.path.join(TMP, 'jobs', SLUG, 'state.json')))
t('state.json written', state['reached'] == 'HOOKED' and state['gates'][-1]['pass'] is False)

# qa schema
qa = {'reviewer': 'subagent', 'independent': True, 'render': 'x.mp4', 'score': 92, 'criticalFailures': [],
      'checks': [{'n': i, 'answer': 'yes', 'evidence': 'frame 12 s shows it'} for i in range(1, 11)]}
t('qa schema accepts a full review', validate(qa, CP.schema('qa')) == [])
t('qa schema rejects a non-independent review', validate(dict(qa, independent=False), CP.schema('qa')) != [])

# router is off by default
try:
    MR.ask('hi'); t('router off by default', False)
except MR.RouterError as e:
    t('router off by default', 'OFF' in str(e))

# analytics scopes only when switched on
t('no analytics scopes by default', not any('analytics' in s for s in YP.Config({}).scopes()))
t('read-only analytics scopes when YT_ANALYTICS=true',
  all(s in YP.Config({'YT_ANALYTICS': 'true'}).scopes() for s in YP.SCOPES_ANALYTICS))

shutil.rmtree(TMP)
print(f'\n{len(ok)} passed, {len(bad)} failed')
sys.exit(1 if bad else 0)
