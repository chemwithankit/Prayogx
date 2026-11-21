#!/usr/bin/env python3
"""PrayogX 2.0 Maths Validator: Python, not a model, decides whether an equation or number is right.

    python3 tools/maths_validator.py "2 KMnO4 -> K2MnO4 + MnO2 + O2"        balanced chemical equation? (atoms + charge)
    python3 tools/maths_validator.py --numeric "6.022e23 * 2" --expected 1.2044e24 [--tol 1e-3]

Chemical syntax: coefficients, formulas with ( ), ·/. hydrates, charges as ^2- / ^+ / {2-}, '->' or '→' arrow,
states like (aq) (s) (l) (g) ignored, conditions ignored ('->[Δ]').
"""
import argparse, math, re, sys
from collections import Counter

STATE = re.compile(r'\((aq|s|l|g)\)')


def _formula(f):
    f = STATE.sub('', f.strip())
    charge = 0
    m = re.search(r'(?:\^|\{)?(\d*)([+-])\}?$', f) if re.search(r'[\^{][0-9]*[+-]\}?$|[+-]$', f) else None
    if m:
        charge = (int(m.group(1)) if m.group(1) else 1) * (1 if m.group(2) == '+' else -1)
        f = f[:m.start()]
    total = Counter()
    for part in re.split(r'[·.*]', f):
        mult = 1
        mm = re.match(r'^(\d+)(.*)', part)
        if mm:
            mult, part = int(mm.group(1)), mm.group(2)
        total.update({k: v * mult for k, v in _parse(part).items()})
    return total, charge


def _parse(s):
    stack, i = [Counter()], 0
    while i < len(s):
        c = s[i]
        if c in '([':
            stack.append(Counter()); i += 1
        elif c in ')]':
            i += 1; n = re.match(r'\d*', s[i:]).group(); i += len(n)
            top = stack.pop()
            stack[-1].update({k: v * (int(n) if n else 1) for k, v in top.items()})
        else:
            m = re.match(r'([A-Z][a-z]?)(\d*)', s[i:])
            if not m:
                raise ValueError(f'cannot read "{s}" at "{s[i:]}"')
            stack[-1][m.group(1)] += int(m.group(2)) if m.group(2) else 1
            i += len(m.group())
    return stack[0]


def _side(side):
    atoms, charge = Counter(), 0
    for term in re.split(r'\s+\+\s+', side.strip()):
        m = re.match(r'^(\d+(?:\.\d+)?)\s*(.*)', term.strip())
        k, f = (float(m.group(1)), m.group(2)) if m else (1.0, term)
        if re.fullmatch(r'e\^?\{?-\}?|e⁻', f.strip()):  # electron
            charge -= k
            continue
        a, c = _formula(f)
        atoms.update({el: n * k for el, n in a.items()}); charge += c * k
    return atoms, charge


def balanced(eq):
    eq = re.sub(r'\[[^\]]*\]', '', eq)
    parts = re.split(r'\s*(?:->|→|⟶|=)\s*', eq)
    if len(parts) != 2:
        return False, 'needs exactly one arrow'
    (la, lc), (ra, rc) = _side(parts[0]), _side(parts[1])
    diff = {el: (la.get(el, 0), ra.get(el, 0)) for el in set(la) | set(ra) if abs(la.get(el, 0) - ra.get(el, 0)) > 1e-9}
    if diff:
        return False, 'atoms not balanced: ' + ', '.join(f'{k} {l:g}→{r:g}' for k, (l, r) in sorted(diff.items()))
    if abs(lc - rc) > 1e-9:
        return False, f'charge not balanced: {lc:g} → {rc:g}'
    return True, 'balanced'


def numeric(expr, expected, tol=1e-3):
    val = eval(expr, {'__builtins__': {}}, {k: getattr(math, k) for k in dir(math) if not k.startswith('_')})
    ok = math.isclose(val, expected, rel_tol=tol, abs_tol=tol * 1e-6)
    return ok, f'{val:.6g} vs expected {expected:.6g}'


def check_equation(e):
    try:
        if e.get('kind') == 'chemical':
            return balanced(e['expr'])
        if e.get('expected') is None:
            return False, 'numeric check needs "expected"'
        return numeric(e['expr'], e['expected'], e.get('tolerance', 1e-3))
    except Exception as ex:  # a malformed equation is a failure, never a crash
        return False, str(ex)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('expr')
    ap.add_argument('--numeric', action='store_true')
    ap.add_argument('--expected', type=float)
    ap.add_argument('--tol', type=float, default=1e-3)
    a = ap.parse_args()
    ok, msg = check_equation({'kind': 'numeric' if a.numeric else 'chemical', 'expr': a.expr,
                              'expected': a.expected, 'tolerance': a.tol})
    print(('PASS ' if ok else 'FAIL ') + msg)
    sys.exit(0 if ok else 1)
