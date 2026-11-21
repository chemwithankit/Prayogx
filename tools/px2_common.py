"""PrayogX 2.0 shared helpers: paths, JSON I/O and a small JSON-schema subset validator (no extra packages).

Applies to NEW reels only (owner, 2026-11-21): nothing here reads, rewrites or migrates a past reel, video,
Learn page or the website. See docs/architecture/.
"""
import json
import os
import re

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STUDIO = os.path.expanduser(os.environ.get('PRAYOGX_STUDIO', '~/Documents/motion-design-studio/motion-studio'))
PACKAGES = os.path.join(STUDIO, 'packages')
ROADMAP = os.path.join(STUDIO, 'cbse-series', 'roadmap')
SCHEMAS = os.path.join(REPO, 'tools', 'schemas')
SKILL = os.path.join(REPO, '.claude', 'skills', 'prayogx-reel-studio')
RM_ID = re.compile(r'^RM-(9|10|11|12)-(PHY|CHE|MAT|BIO|SUP)-\d{2}-\d{3}$')


def load(path, default=None):
    if default is not None and not os.path.exists(path):
        return default
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    os.replace(tmp, path)


def schema(name):
    return load(os.path.join(SCHEMAS, name + '.schema.json'))


_TYPES = {'object': dict, 'array': list, 'string': str, 'boolean': bool, 'null': type(None)}


def validate(data, sch, where='$'):
    """Validate against a subset of JSON Schema: type, required, properties, items, enum, minItems, maxItems,
    minimum, maximum, minLength, pattern, const. Returns a list of error strings (empty = valid)."""
    errs = []
    t = sch.get('type')
    if t:
        types = t if isinstance(t, list) else [t]
        ok = False
        for ty in types:
            if ty == 'integer':
                ok |= isinstance(data, int) and not isinstance(data, bool)
            elif ty == 'number':
                ok |= isinstance(data, (int, float)) and not isinstance(data, bool)
            else:
                ok |= isinstance(data, _TYPES[ty])
        if not ok:
            return [f'{where}: expected {t}, got {type(data).__name__}']
    if 'const' in sch and data != sch['const']:
        errs.append(f'{where}: must be {sch["const"]!r}')
    if 'enum' in sch and data not in sch['enum']:
        errs.append(f'{where}: {data!r} not in {sch["enum"]}')
    if isinstance(data, str):
        if len(data) < sch.get('minLength', 0):
            errs.append(f'{where}: shorter than {sch["minLength"]}')
        if 'pattern' in sch and not re.search(sch['pattern'], data):
            errs.append(f'{where}: does not match {sch["pattern"]}')
    if isinstance(data, (int, float)) and not isinstance(data, bool):
        if 'minimum' in sch and data < sch['minimum']:
            errs.append(f'{where}: {data} < {sch["minimum"]}')
        if 'maximum' in sch and data > sch['maximum']:
            errs.append(f'{where}: {data} > {sch["maximum"]}')
    if isinstance(data, dict):
        for k in sch.get('required', []):
            if k not in data:
                errs.append(f'{where}: missing "{k}"')
        for k, sub in sch.get('properties', {}).items():
            if k in data:
                errs += validate(data[k], sub, f'{where}.{k}')
    if isinstance(data, list):
        if len(data) < sch.get('minItems', 0):
            errs.append(f'{where}: {len(data)} items, need ≥ {sch["minItems"]}')
        if 'maxItems' in sch and len(data) > sch['maxItems']:
            errs.append(f'{where}: {len(data)} items, max {sch["maxItems"]}')
        if 'items' in sch:
            for i, it in enumerate(data):
                errs += validate(it, sch['items'], f'{where}[{i}]')
    return errs


def read_env(path=os.path.join(REPO, '.env')):
    """Read KEY=VALUE pairs from the git-ignored .env. Values are never printed or logged by callers."""
    env = {}
    if os.path.exists(path):
        for line in open(path, encoding='utf-8'):
            m = re.match(r'\s*([A-Z0-9_]+)\s*=\s*(.*)', line)
            if m:
                env[m.group(1)] = m.group(2).strip().strip('"\'')
    for k, v in os.environ.items():
        if k.isupper():
            env.setdefault(k, v)
    return env
