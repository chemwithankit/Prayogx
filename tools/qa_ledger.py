#!/usr/bin/env python3
"""Smart QA ledger for NEW reels (owner approved 2026-11-22; docs/architecture/10-smart-qa-render.md).

One issue ledger per reel (jobs/<slug>/qa/issues.json) carries every QA finding across rounds, with a severity
(critical / major / minor), a scene, a status (open, fixed, verified, reopened, backlog, waived) and its history.
The score is computed from the ledger with the fixed deductions in tools/qa_rules.json, so the same issues always
give the same score. The ≥ 90 gate and the owner's ten checks are unchanged.

    python3 tools/qa_ledger.py auto   <slug> [--layout F]   Round 0: measured rules (layout, numbers, stills, code)
    python3 tools/qa_ledger.py review <slug> <round.json>   add an independent review (schema qa-round)
    python3 tools/qa_ledger.py fix    <slug> ID... [--scenes 3 4]   the author marks issues fixed
    python3 tools/qa_ledger.py changed <slug> 3 4            scenes changed since the last review (scene_render.py)
    python3 tools/qa_ledger.py waive  <slug> ID --note "..." only on the owner's word
    python3 tools/qa_ledger.py status <slug>                 table, score, decision (PASS / FIX / ESCALATE)

Rules of the rounds: review 1 may raise anything. Review 2 may raise items not fixed, regressions in scenes changed
since review 1, and new CRITICAL issues anywhere; any other new issue goes to the backlog (does not block). Review 3
is verification only (same rule). A fourth review is refused: the reel is escalated to the owner (qa/escalation.md).
Writes jobs/<slug>/qa.json (schema qa) for tools/reel_pipeline.py. Never renders, approves or publishes.
"""
import argparse, glob, json, math, os, re, sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from px2_common import PACKAGES, REPO, STUDIO, load, save, schema, validate  # noqa: E402

RULES = load(os.path.join(REPO, 'tools', 'qa_rules.json'))
COUNTED = ('open', 'reopened', 'fixed')          # fixed but not yet verified still counts against the score
MAX_REVIEWS = RULES['maxCorrectionRounds'] + 1   # review 1, review 2, verification review


def job(slug, *p):
    return os.path.join(STUDIO, 'jobs', slug, *p)


def now():
    return datetime.now().isoformat(timespec='seconds')


# ---------------------------------------------------------------- scenes (mirror of the studio's timing.ts)
def scenes(slug):
    """[{n, from, to, vo, voFrames}] computed exactly as src/<slug>/timing.ts does (LEAD + voice + TAIL + hold)."""
    ts = open(os.path.join(STUDIO, 'src', slug, 'timing.ts'), encoding='utf-8').read()
    const = {k: int(re.search(rf'export const {k} = (\d+)', ts).group(1)) for k in ('FPS', 'LEAD', 'TAIL', 'END_HOLD')}
    clips = load(os.path.join(STUDIO, 'src', slug, 'voice.json'))
    hp = os.path.join(STUDIO, 'src', slug, 'holds.json')
    holds = load(hp) if os.path.exists(hp) else {}
    out, f = [], 0
    for i, c in enumerate(clips):
        vo = math.ceil(c['seconds'] * const['FPS'])
        n = const['LEAD'] + vo + const['TAIL'] + holds.get(str(c['scene']), 0) + (const['END_HOLD'] if i == len(clips) - 1 else 0)
        out.append({'n': c['scene'], 'from': f, 'to': f + n, 'vo': f + const['LEAD'], 'voFrames': vo})
        f += n
    return out


def scene_at(sc, frame):
    for s in sc:
        if s['from'] <= frame < s['to']:
            return s['n']
    return None


def tc(frame, fps=30):
    s = frame / fps
    return f'{int(s // 60):02d}:{s % 60:04.1f}'


def frame_of(t, fps=30):
    m = re.match(r'^(\d+):(\d+(?:\.\d+)?)', str(t))
    return round((int(m.group(1)) * 60 + float(m.group(2))) * fps) if m else None


# ---------------------------------------------------------------- ledger
def ledger(slug):
    return load(job(slug, 'qa', 'issues.json'), {'slug': slug, 'reviews': [], 'changedSinceReview': [], 'items': []})


def put(slug, L):
    save(job(slug, 'qa', 'issues.json'), L)


def hist(item, status, note=''):
    item['status'] = status
    item.setdefault('history', []).append({'at': now(), 'status': status, 'note': note})


def new_id(L, prefix):
    n = 1 + sum(1 for i in L['items'] if i['id'].startswith(prefix))
    return f'{prefix}{n}'


def score(L):
    ded = RULES['deductions']
    areas = {a: float(m) for a, m in RULES['areas'].items()}
    minor = {a: 0.0 for a in areas}
    for i in L['items']:
        if i['status'] not in COUNTED:
            continue
        a = i['area'] if i['area'] in areas else 'polish'
        if i['severity'] == 'minor':
            minor[a] += ded['minor']
        else:
            areas[a] -= ded[i['severity']]
    for a in areas:
        areas[a] = max(0.0, areas[a] - min(minor[a], ded['minorCapPerArea']))
    return round(sum(areas.values())), {a: round(v, 1) for a, v in areas.items()}


def blocking(L):
    return [i for i in L['items'] if i['status'] in COUNTED and i['severity'] in RULES['blocking']]


# ---------------------------------------------------------------- Round 0: measured rules
NUM = re.compile(r'\d[\d,]*(?:\.\d+)?')


def nums(text):
    return {t.replace(',', '').rstrip('.') for t in NUM.findall(text)}


def sources_numbers(slug):
    txt = ''
    for f in ('research.md', 'script.md', 'visual-design.md', 'production-plan.md'):
        p = job(slug, f)
        if os.path.exists(p):
            txt += open(p, encoding='utf-8').read()
    ref = job(slug, 'package.ref')
    if os.path.exists(ref):
        for p in glob.glob(os.path.join(PACKAGES, open(ref).read().strip(), '*.json')):
            txt += open(p, encoding='utf-8').read()
    return nums(txt)


def eval_layout(layout, sc, allowed, rules=RULES):
    """Turn raw measurements (qa_auto.mjs) into findings: [(rule, scene, key text, frame, detail)]."""
    W, H = layout.get('width', 1080), layout.get('height', 1920)
    T, M, C = rules['text'], rules['safeArea']['marginPx'], rules['collision']['minOverlapShare']
    out = []
    for smp in layout['samples']:
        f, vis = smp['f'], []
        for it in smp['items']:
            if it.get('op', 1) < T['minOpacity'] or it.get('decor'):
                continue
            x, y, w, h = it['rect']
            if w <= 0 or h <= 0 or x >= W or y >= H or x + w <= 0 or y + h <= 0:
                continue  # fully off the canvas: not on screen
            vis.append(it)
            txt, px, s = it['text'][:60], it['px'], scene_at(sc, f)
            if x < 0 or y < 0 or x + w > W or y + h > H:
                out.append(('text-clipped', s, txt, f, f'runs off the frame ({x:.0f},{y:.0f} {w:.0f}×{h:.0f})'))
            elif x < M or y < M or x + w > W - M or y + h > H - M:
                out.append(('safe-area', s, txt, f, f'inside the {M} px edge margin'))
            if px < T['criticalBelowPx']:
                out.append(('text-tiny', s, txt, f, f'{px:.0f} px (< {T["criticalBelowPx"]})'))
            elif px < T['minPx']:
                out.append(('text-small', s, txt, f, f'{px:.0f} px (< {T["minPx"]})'))
            elif it.get('eq') and px < T['equationMinPx']:
                out.append(('equation-small', s, txt, f, f'equation {px:.0f} px (< {T["equationMinPx"]})'))
            for n in nums(it['text']):
                if len(n.replace('.', '')) >= 2 and n not in allowed:
                    out.append(('number-unsourced', s, n, f, f'"{n}" in "{txt}" is not in the package or script'))
        for a in range(len(vis)):
            for b in range(a + 1, len(vis)):
                ra, rb = vis[a]['rect'], vis[b]['rect']
                ix = max(0, min(ra[0] + ra[2], rb[0] + rb[2]) - max(ra[0], rb[0]))
                iy = max(0, min(ra[1] + ra[3], rb[1] + rb[3]) - max(ra[1], rb[1]))
                small = min(ra[2] * ra[3], rb[2] * rb[3])
                if small > 0 and ix * iy / small >= C:
                    k = ' | '.join(sorted([vis[a]['text'][:30], vis[b]['text'][:30]]))
                    out.append(('text-collision', scene_at(sc, f), k, f, f'{ix * iy / small:.0%} overlap'))
    return out


def eval_stills(qa_check, sc, rules=RULES):
    runs = next((r['detail'] for r in qa_check.get('results', []) if r['check'].startswith('static stretches')), [])
    lim, out = rules['still']['maxSecondsUnderNarration'] * 30, []
    for a, b in runs:
        for s in sc:
            ov = min(b, s['vo'] + s['voFrames']) - max(a, s['vo'])
            if ov > lim:
                out.append(('still-under-narration', s['n'], f'{tc(a)}', a, f'{ov / 30:.1f} s still under narration'))
    return out


def eval_code(slug):
    out = []
    for p in glob.glob(os.path.join(STUDIO, 'src', slug, '**', '*.ts*'), recursive=True):
        for ln, line in enumerate(open(p, encoding='utf-8'), 1):
            if re.search(r'Math\.random\(|Date\.now\(|new Date\(', line):
                out.append(('nondeterministic-code', None, f'{os.path.basename(p)}:{ln}', 0,
                            'frames must be a pure function of the frame number (use remotion random(seed))'))
    return out


def merge_auto(L, findings):
    """Findings → ledger. A fixed or verified issue that fires again is REOPENED (regression guard)."""
    seen = {}
    for rule, s, key, f, detail in findings:
        k = f'{rule}|{s}|{key}'
        seen.setdefault(k, (rule, s, key, f, detail))
    by_key = {i.get('key'): i for i in L['items'] if i.get('key')}
    for k, (rule, s, key, f, detail) in seen.items():
        r = RULES['autoRules'][rule]
        it = by_key.get(k)
        if it is None:
            it = {'id': new_id(L, 'A'), 'key': k, 'source': 'auto', 'round': 0, 'severity': r['severity'],
                  'area': r['area'], 'check': r['check'], 'scene': s, 't': tc(f), 'issue': f'{rule}: {key} ({detail})',
                  'fix': '', 'evidence': f'qa_auto at {tc(f)}'}
            L['items'].append(it)
            hist(it, 'open', 'Round 0')
        elif it['status'] in ('fixed', 'verified'):
            hist(it, 'reopened', f'fires again at {tc(f)}: {detail}')
    for it in L['items']:
        if it.get('source') == 'auto' and it['status'] in COUNTED and it['key'] not in seen:
            hist(it, 'verified', 'Round 0: no longer fires')
    return L


def cmd_auto(slug, layout_path=None):
    sc, L = scenes(slug), ledger(slug)
    findings = eval_code(slug)
    lp = layout_path or job(slug, 'qa', 'auto', 'layout.json')
    if os.path.exists(lp):
        findings += eval_layout(load(lp), sc, sources_numbers(slug))
    else:
        print(f'note: no layout measurements ({lp}); run scripts/session-helpers/qa_auto.mjs first')
    qp = job(slug, 'qa', 'qa_check.json')
    if os.path.exists(qp):
        findings += eval_stills(load(qp), sc)
    merge_auto(L, findings)
    put(slug, L)
    open_auto = [i for i in L['items'] if i.get('source') == 'auto' and i['status'] in ('open', 'reopened')]
    save(job(slug, 'qa', 'round-0.json'), {'round': 0, 'at': now(), 'layout': os.path.exists(lp), 'issues': open_auto})
    for i in open_auto:
        print(f'{i["severity"].upper():<8} {i["id"]:<5} scene {i["scene"]}  {i["t"]}  {i["issue"]}')
    bad = [i for i in open_auto if i['severity'] in RULES['blocking']]
    print(f'Round 0: {len(open_auto)} open ({len(bad)} blocking). ' + ('FIX before review.' if bad else 'clean: ready for review.'))
    return 1 if bad else 0


# ---------------------------------------------------------------- reviews
def cmd_review(slug, path):
    R, L = load(path), ledger(slug)
    errs = validate(R, schema('qa-round'))
    if errs:
        sys.exit('round file invalid: ' + '; '.join(errs[:5]))
    n = len(L['reviews']) + 1
    if n > MAX_REVIEWS:
        write_escalation(slug, L, 'a fourth review was requested')
        sys.exit(f'refused: {MAX_REVIEWS} reviews done; escalated to the owner (qa/escalation.md)')
    sc, changed = scenes(slug), set(L['changedSinceReview'])
    ids = {i['id']: i for i in L['items']}
    for x in R.get('verified', []):
        if x in ids:
            hist(ids[x], 'verified', f'review {n}')
    for x in R.get('reopened', []):
        if x in ids:
            hist(ids[x], 'reopened', f'review {n}: not fixed')
    added = []
    for p in R['issues']:
        f = frame_of(p['t'])
        s = p.get('scene', scene_at(sc, f) if f is not None else None)
        it = {'id': new_id(L, f'R{n}-'), 'source': 'review', 'round': n, 'severity': p['severity'], 'area': p['area'],
              'check': p['check'], 'scene': s, 't': p['t'], 'issue': p['issue'], 'fix': p.get('fix', ''),
              'evidence': p.get('evidence', '')}
        late = n > 1 and p['severity'] != 'critical' and s not in changed
        L['items'].append(it)
        hist(it, 'backlog' if late else 'open',
             f'review {n}: new non-critical issue in an unchanged scene (backlog, does not block)' if late else f'review {n}')
        added.append(it)
    sc_now, areas = score(L)
    L['reviews'].append({'round': n, 'at': now(), 'reviewer': R['reviewer'], 'render': R['render'], 'score': sc_now,
                         'impression': R.get('impression'), 'checks': R['checks'], 'changedBefore': sorted(changed, key=str)})
    L['changedSinceReview'] = []
    put(slug, L)
    write_qa(slug, L)
    print(f'review {n}: {len(added)} new ({sum(1 for a in added if a["status"] == "backlog")} to backlog), score {sc_now}')
    return report(slug, L)


def write_qa(slug, L):
    last = L['reviews'][-1]
    sc_now, areas = score(L)
    blk = blocking(L)
    checks = []
    for c in last['checks']:
        hit = [i['id'] for i in blk if i['check'] == c['n']]
        checks.append({'n': c['n'], 'answer': 'no' if hit else c['answer'],
                       'evidence': (f'open {", ".join(hit)}; ' if hit else '') + c['evidence']})
    save(job(slug, 'qa.json'), {
        'reviewer': last['reviewer'], 'independent': True, 'render': last['render'], 'checks': checks,
        'score': sc_now, 'areas': areas, 'scoring': 'computed from qa/issues.json (tools/qa_rules.json deductions)',
        'criticalFailures': [f'{i["id"]} {i["issue"]}' for i in blk if i['severity'] == 'critical'],
        'problems': [{'id': i['id'], 'severity': i['severity'], 't': i['t'], 'issue': i['issue'], 'fix': i['fix']} for i in blk],
        'decision': decide(L)[0]})


def decide(L):
    if not L['reviews']:
        return 'NEEDS_REVIEW', 'no independent review yet'
    sc_now, _ = score(L)
    blk = blocking(L)
    no = [c['n'] for c in L['reviews'][-1]['checks'] if c['answer'] != 'yes' or any(i['check'] == c['n'] for i in blk)]
    if not blk and not no and sc_now >= RULES['passScore']:
        return 'PASS', f'score {sc_now}, no blocking issue, ten checks yes'
    n, crit = len(L['reviews']), [i for i in blk if i['severity'] == 'critical']
    stalled = n >= 2 and L['reviews'][-1]['score'] <= L['reviews'][-2]['score']
    if n >= MAX_REVIEWS or (n >= 2 and crit) or (stalled and blk):
        why = 'critical issue open after review 2' if crit and n >= 2 else 'score did not improve' if stalled else 'review limit reached'
        return 'ESCALATE', why
    return 'FIX', f'score {sc_now}; {len(blk)} blocking open; checks no: {no}; fix pass {n} of {RULES["maxCorrectionRounds"]}'


def write_escalation(slug, L, why):
    sc_now, areas = score(L)
    rows = '\n'.join(f'| {i["id"]} | {i["severity"]} | {i["scene"]} | {i["t"]} | {i["issue"]} | {i["fix"]} |'
                     for i in blocking(L))
    hist_ = ' → '.join(str(r['score']) for r in L['reviews'])
    open(job(slug, 'qa', 'escalation.md'), 'w', encoding='utf-8').write(
        f'# {slug}: QA escalated to the owner ({now()})\n\nWhy: {why}. Scores by review: {hist_}. Computed now: {sc_now}.\n\n'
        f'| ID | Severity | Scene | Time | Issue | Proposed fix |\n|---|---|---|---|---|---|\n{rows}\n\n'
        'Options for the owner: (1) one more targeted fix pass on the listed scenes; (2) waive named items '
        '(`qa_ledger.py waive <slug> ID --note "..."`); (3) stop here. The reel stays below the gate until then; '
        'nothing is approved or published by this file.\n')


def report(slug, L=None):
    L = L or ledger(slug)
    sc_now, areas = score(L)
    for i in L['items']:
        if i['status'] not in ('verified',):
            print(f'  {i["status"]:<9} {i["severity"]:<8} {i["id"]:<6} sc {str(i["scene"]):<4} {i["t"]:<8} {i["issue"][:90]}')
    d, why = decide(L)
    if d == 'ESCALATE':
        write_escalation(slug, L, why)
    print(f'{d}: {why}  (score {sc_now}; areas {areas})')
    return 0 if d == 'PASS' else 1


def cmd_fix(slug, ids, extra):
    L = ledger(slug)
    by = {i['id']: i for i in L['items']}
    ch = set(L['changedSinceReview'])
    for x in ids:
        if x not in by:
            sys.exit(f'no issue {x}')
        hist(by[x], 'fixed', 'author')
        if by[x]['scene'] is not None:
            ch.add(by[x]['scene'])
    ch.update(extra)
    L['changedSinceReview'] = sorted(ch, key=str)
    put(slug, L)
    print(f'fixed {", ".join(ids)}; scenes changed since the last review: {L["changedSinceReview"]}')


def cmd_changed(slug, sc_list):
    L = ledger(slug)
    L['changedSinceReview'] = sorted(set(L['changedSinceReview']) | set(sc_list), key=str)
    put(slug, L)


def cmd_waive(slug, x, note):
    L = ledger(slug)
    it = next((i for i in L['items'] if i['id'] == x), None)
    if not it:
        sys.exit(f'no issue {x}')
    hist(it, 'waived', 'owner: ' + note)
    put(slug, L)
    if L['reviews']:
        write_qa(slug, L)
    print(f'{x} waived (owner).')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    a = sub.add_parser('auto'); a.add_argument('slug'); a.add_argument('--layout')
    r = sub.add_parser('review'); r.add_argument('slug'); r.add_argument('file')
    f = sub.add_parser('fix'); f.add_argument('slug'); f.add_argument('ids', nargs='+'); f.add_argument('--scenes', nargs='*', type=int, default=[])
    c = sub.add_parser('changed'); c.add_argument('slug'); c.add_argument('scenes', nargs='+', type=int)
    w = sub.add_parser('waive'); w.add_argument('slug'); w.add_argument('id'); w.add_argument('--note', required=True)
    s = sub.add_parser('status'); s.add_argument('slug')
    x = ap.parse_args()
    if not os.path.exists(job(x.slug, 'package.ref')):
        sys.exit(f'{x.slug}: not a PrayogX 2.0 job (no package.ref). Past jobs are not managed.')
    if x.cmd == 'auto':
        sys.exit(cmd_auto(x.slug, x.layout))
    if x.cmd == 'review':
        sys.exit(cmd_review(x.slug, x.file))
    if x.cmd == 'fix':
        cmd_fix(x.slug, x.ids, x.scenes)
    if x.cmd == 'changed':
        cmd_changed(x.slug, x.scenes)
    if x.cmd == 'waive':
        cmd_waive(x.slug, x.id, x.note)
    if x.cmd == 'status':
        sys.exit(report(x.slug))


if __name__ == '__main__':
    main()
