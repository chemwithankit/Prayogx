#!/usr/bin/env python3
"""PrayogX 2.0 content package: one roadmap ID = one source of truth for a NEW reel's deliverables.

    python3 tools/content_package.py init  RM-12-CHE-08-012 [--slug my-topic]
    python3 tools/content_package.py check RM-12-CHE-08-012 [--artefact script.md notes.md ...]
    python3 tools/content_package.py export RM-12-CHE-08-012      -> exports/quiz.json (10), workbook.json (25)

Folder: <studio>/packages/<RM-ID>/ with package, facts, glossary, coverage, questions, equations (.json).
New reels only: `init` refuses a slug whose studio job already has a render.
"""
import argparse, csv, glob, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
from px2_common import PACKAGES, ROADMAP, RM_ID, STUDIO, load, save, schema, validate  # noqa: E402
from maths_validator import check_equation  # noqa: E402

FILES = ('package', 'facts', 'glossary', 'coverage', 'questions', 'equations')


def roadmap_row(rm):
    for f in glob.glob(os.path.join(ROADMAP, '*.csv')):
        for row in csv.DictReader(open(f, encoding='utf-8')):
            if row.get('id') == rm:
                return row
    return {}


def init(rm, slug=None):
    if not RM_ID.match(rm):
        sys.exit(f'not a roadmap ID: {rm}')
    d = os.path.join(PACKAGES, rm)
    if os.path.exists(os.path.join(d, 'package.json')):
        sys.exit(f'package already exists: {d}')
    row = roadmap_row(rm)
    title = row.get('title') or rm
    slug = slug or re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:60]
    job = os.path.join(STUDIO, 'jobs', slug)
    if glob.glob(os.path.join(job, 'renders', '*.mp4')):
        sys.exit(f'refused: jobs/{slug} already has a render (past reels are never changed)')
    cls, subj = rm.split('-')[1:3]
    save(os.path.join(d, 'package.json'), {
        'id': rm, 'version': 1, 'title': title, 'class': cls, 'subject': row.get('subject', subj),
        'ncertRef': row.get('ncert_ref', ''), 'status': 'draft',
        'aliases': {'slug': slug, 'reelId': 'STUDIO-' + slug.upper()},
        'simulation': {'decision': 'UNDECIDED', 'reason': ''}})
    save(os.path.join(d, 'facts.json'), {'conceptId': rm, 'facts': []})
    save(os.path.join(d, 'glossary.json'), {'terms': []})
    save(os.path.join(d, 'coverage.json'), {'items': []})
    save(os.path.join(d, 'questions.json'), {'questions': []})
    save(os.path.join(d, 'equations.json'), {'equations': []})
    os.makedirs(job, exist_ok=True)
    open(os.path.join(job, 'package.ref'), 'w').write(rm + '\n')
    print(f'created {d}  (linked from jobs/{slug}/package.ref)')


def check(rm, artefacts=()):
    d = os.path.join(PACKAGES, rm)
    errs, data = [], {}
    for n in FILES:
        p = os.path.join(d, n + '.json')
        if not os.path.exists(p):
            errs.append(f'missing {n}.json'); continue
        data[n] = load(p)
        errs += [f'{n}: {e}' for e in validate(data[n], schema(n))]
    fids = {f['id'] for f in data.get('facts', {}).get('facts', [])}
    qs = data.get('questions', {}).get('questions', [])
    for q in qs:
        errs += [f'question {q.get("id")}: unknown fact {r}' for r in q.get('factRefs', []) if r not in fids]
    for use, n in (('quiz', 10), ('workbook', 25)):
        got = sum(use in q.get('use', []) for q in qs)
        if got != n:
            errs.append(f'{use} has {got} questions, needs exactly {n}')
    for c in data.get('coverage', {}).get('items', []):
        if c.get('kind') in ('preparation', 'reaction') and c.get('where') != 'video':
            errs.append(f'coverage "{c["item"]}": {c["kind"]} must be shown in the video')
        if c.get('where') == 'notes-only' and not c.get('reason'):
            errs.append(f'coverage "{c["item"]}": notes-only needs a reason')
    for e in data.get('equations', {}).get('equations', []):
        ok, msg = check_equation(e)
        if not ok:
            errs.append(f'equation {e.get("id")}: {msg}')
    for p in artefacts:  # same words everywhere: a forbidden variant of a locked term is an error
        text = open(p, encoding='utf-8').read()
        for t in data.get('glossary', {}).get('terms', []):
            for bad in t.get('forbidden', []):
                if re.search(r'(?<!\w)' + re.escape(bad) + r'(?!\w)', text, re.I):
                    errs.append(f'{os.path.basename(p)}: "{bad}" should be "{t["term"]}"')
    return errs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['init', 'check', 'export'])
    ap.add_argument('id')
    ap.add_argument('--slug')
    ap.add_argument('--artefact', nargs='*', default=[])
    a = ap.parse_args()
    if a.cmd == 'init':
        return init(a.id, a.slug)
    errs = check(a.id, a.artefact)
    for e in errs:
        print('ERROR', e)
    if errs:
        sys.exit(f'FAIL {a.id}: {len(errs)} errors')
    if a.cmd == 'export':
        d = os.path.join(PACKAGES, a.id)
        qs = load(os.path.join(d, 'questions.json'))['questions']
        for use in ('quiz', 'workbook'):
            save(os.path.join(d, 'exports', use + '.json'), [q for q in qs if use in q.get('use', [])])
        print(f'exported quiz.json and workbook.json to {d}/exports')
    print(f'PASS {a.id}')


if __name__ == '__main__':
    main()
