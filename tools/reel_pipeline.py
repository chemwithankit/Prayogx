#!/usr/bin/env python3
"""PrayogX 2.0 gate runner for a NEW reel: each stage passes only if the one before it did.

    python3 tools/reel_pipeline.py check <slug>      run every gate in order, stop at the first failure
    python3 tools/reel_pipeline.py status <slug>     show the saved state

Only jobs created with `content_package.py init` (they have jobs/<slug>/package.ref) are managed. Past jobs are
never checked, changed or migrated. Writes jobs/<slug>/state.json. Never renders, approves or publishes anything.
"""
import glob, json, os, subprocess, sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from px2_common import SKILL, STUDIO, load, save, schema, validate  # noqa: E402
import content_package  # noqa: E402

PY = sys.executable
HOOK_LOG = os.path.join(STUDIO, 'packages', 'hook-log.json')


def job(slug, *p):
    return os.path.join(STUDIO, 'jobs', slug, *p)


def need(slug, *files):
    miss = [f for f in files if not os.path.exists(job(slug, f))]
    return (not miss, 'missing ' + ', '.join(miss) if miss else 'ok')


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    last = (r.stdout + r.stderr).strip().splitlines()
    return r.returncode == 0, last[-1] if last else ''


def g_package(slug, rm):
    errs = content_package.check(rm)
    return (not errs, f'{len(errs)} package errors, first: {errs[0]}' if errs else 'package valid')


def g_research(slug, rm):
    return need(slug, 'research.md')


def g_hook(slug, rm):
    ok, msg = need(slug, 'hooks.json')
    if not ok:
        return ok, msg
    h = load(job(slug, 'hooks.json'))
    errs = validate(h, schema('hooks'))
    if errs:
        return False, errs[0]
    chosen = h['candidates'][h['chosen']] if h['chosen'] < len(h['candidates']) else None
    if not chosen:
        return False, 'chosen index out of range'
    recent = [x for x in load(HOOK_LOG, []) if x.get('slug') != slug][-3:]
    if any(x.get('type') == chosen['type'] for x in recent):
        return False, f'hook type "{chosen["type"]}" was used in the last 3 reels'
    return True, f'hook: {chosen["type"]}'


def g_script(slug, rm):
    ok, msg = need(slug, 'script.md', 'pronounce.json')
    if not ok:
        return ok, msg
    return run([PY, os.path.join(SKILL, 'tools', 'hinglish_lint.py'), job(slug, 'script.md')])


def g_plan(slug, rm):
    return need(slug, 'creative.md', 'production-plan.md', 'sound-plan.md', 'visual-design.md')


def g_build(slug, rm):
    if not os.path.exists(os.path.join(STUDIO, 'src', slug, 'Stage.tsx')):
        return False, f'missing src/{slug}/Stage.tsx'
    ok, msg = need(slug, 'voice/align.json')
    if not ok:
        return ok, msg
    return run([PY, os.path.join(SKILL, 'tools', 'reuse_check.py'), slug, '--studio', STUDIO])


def g_render(slug, rm):
    if not glob.glob(job(slug, 'renders', '*.mp4')):
        return False, 'no render'
    ok, msg = need(slug, 'qa/qa_check.json')
    if not ok:
        return ok, msg
    bad = [r['check'] for r in load(job(slug, 'qa/qa_check.json')).get('results', []) if not r.get('pass')]
    return (not bad, 'qa_reel.py failed: ' + '; '.join(bad[:3]) if bad else 'qa_reel.py all pass')


def g_qa(slug, rm):
    ok, msg = need(slug, 'qa.json')
    if not ok:
        return ok, msg
    q = load(job(slug, 'qa.json'))
    errs = validate(q, schema('qa'))
    if errs:
        return False, errs[0]
    no = [c['n'] for c in q['checks'] if c['answer'] != 'yes']
    if no or q['criticalFailures'] or q['score'] < 90:
        return False, f'score {q["score"]}, checks answered no: {no}, critical: {q["criticalFailures"][:2]}'
    return True, f'independent QA {q["score"]}/100, ten checks yes'


def g_deliverables(slug, rm):
    ok, msg = need(slug, 'publish/caption.txt', 'publish/cover.jpg')
    if not ok:
        return ok, msg
    exp = os.path.join(STUDIO, 'packages', rm, 'exports')
    for f in ('quiz.json', 'workbook.json'):
        if not os.path.exists(os.path.join(exp, f)):
            return False, f'run content_package.py export {rm}'
    arte = [job(slug, 'script.md'), job(slug, 'publish/caption.txt')]
    errs = content_package.check(rm, arte)
    return (not errs, errs[0] if errs else 'deliverables present, terms consistent')


STAGES = [('PACKAGE', g_package), ('RESEARCHED', g_research), ('HOOKED', g_hook), ('SCRIPTED', g_script),
          ('PLANNED', g_plan), ('BUILT', g_build), ('RENDERED', g_render), ('QA_PASSED', g_qa),
          ('READY_FOR_REVIEW', g_deliverables)]


def check(slug):
    ref = job(slug, 'package.ref')
    if not os.path.exists(ref):
        sys.exit(f'{slug}: not a PrayogX 2.0 job (no package.ref). Past jobs are not managed.')
    rm = open(ref).read().strip()
    reached, report = 'NONE', []
    for name, gate in STAGES:
        ok, msg = gate(slug, rm)
        print(f'{"PASS" if ok else "FAIL"}  {name:<17} {msg}')
        report.append({'stage': name, 'pass': ok, 'detail': msg})
        if not ok:
            break
        reached = name
    save(job(slug, 'state.json'), {'slug': slug, 'package': rm, 'reached': reached,
                                    'checkedAt': datetime.now().isoformat(timespec='seconds'), 'gates': report})
    names = [s[0] for s in STAGES]
    if reached in names and names.index(reached) >= names.index('HOOKED'):  # remember the hook type
        h = load(job(slug, 'hooks.json'))
        log = [x for x in load(HOOK_LOG, []) if x.get('slug') != slug]
        log.append({'slug': slug, 'type': h['candidates'][h['chosen']]['type'],
                    'line': h['candidates'][h['chosen']]['line']})
        save(HOOK_LOG, log[-50:])
    print(f'{slug}: reached {reached}')
    return reached


if __name__ == '__main__':
    if len(sys.argv) != 3 or sys.argv[1] not in ('check', 'status'):
        sys.exit(__doc__)
    if sys.argv[1] == 'status':
        print(json.dumps(load(job(sys.argv[2], 'state.json'), {}), indent=2, ensure_ascii=False))
    else:
        sys.exit(0 if check(sys.argv[2]) == 'READY_FOR_REVIEW' else 1)
