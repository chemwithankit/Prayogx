#!/usr/bin/env python3
"""PrayogX 2.0 model router: one door for every non-Claude model call, with an off switch, budget caps, a cache
and a cost log. Claude Code stays the orchestrator; Claude itself is not called from here.

    python3 tools/model_router.py status
    python3 tools/model_router.py factcheck "<claim>"                   Gemini + Google Search grounding
    python3 tools/model_router.py ask "<prompt>"                         Gemini text
    python3 tools/model_router.py image "<prompt>" out.png               Nano Banana (Gemini image)
    python3 tools/model_router.py tts "<text>" out.wav [--voice Kore]    Gemini-TTS (bake-off / fallback voice)

Settings: tools/router_policy.json (no secrets). Key: GEMINI_API_KEY in the git-ignored .env, never printed.
Everything is OFF until the owner sets "enabled": true and a monthly budget. Sarvam stays the primary Hinglish voice
(motion-studio scripts); Higgsfield stays an image option. Paid calls are never retried automatically.
"""
import base64, hashlib, json, os, sys, time, urllib.error, urllib.request, wave
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from px2_common import REPO, STUDIO, load, read_env, save  # noqa: E402

POLICY = os.path.join(REPO, 'tools', 'router_policy.json')
LOG = os.path.join(STUDIO, 'packages', 'router-log.jsonl')
CACHE = os.path.join(STUDIO, 'packages', '.router-cache')
API = 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'


class RouterError(Exception):
    pass


def policy():
    return load(POLICY)


def spent_this_month():
    if not os.path.exists(LOG):
        return 0.0
    month = datetime.now().strftime('%Y-%m')
    return sum(json.loads(l).get('costUSD', 0) for l in open(LOG) if l.startswith('{') and month in l)


def _call(task, model, body, est):
    p = policy()
    if not p.get('enabled'):
        raise RouterError('router is OFF (tools/router_policy.json "enabled": false). The owner turns it on.')
    if est > p['perCallCapUSD']:
        raise RouterError(f'estimated ${est:.2f} is over the per-call cap ${p["perCallCapUSD"]}')
    if spent_this_month() + est > p['monthlyBudgetUSD']:
        raise RouterError(f'monthly budget ${p["monthlyBudgetUSD"]} would be exceeded')
    key = read_env().get('GEMINI_API_KEY')
    if not key:
        raise RouterError('GEMINI_API_KEY is not set in .env')
    h = hashlib.sha256(json.dumps([model, body], sort_keys=True).encode()).hexdigest()
    cp = os.path.join(CACHE, h + '.json')
    if os.path.exists(cp):
        return load(cp)
    req = urllib.request.Request(API.format(model=model), data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
    t0 = time.time()
    for attempt in (1, 2):  # one retry, only for a network error or 429/5xx before anything is billed
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                out = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if attempt == 2 or e.code not in (429, 500, 503):
                raise RouterError(f'{model}: HTTP {e.code}') from None
            time.sleep(5)
        except urllib.error.URLError as e:
            if attempt == 2:
                raise RouterError(f'{model}: network error {e.reason}') from None
            time.sleep(5)
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, 'a') as f:
        f.write(json.dumps({'at': datetime.now().isoformat(timespec='seconds'), 'task': task, 'model': model,
                            'costUSD': est, 'seconds': round(time.time() - t0, 1)}) + '\n')
    save(cp, out)
    return out


def _parts(out):
    try:
        return out['candidates'][0]['content']['parts']
    except (KeyError, IndexError):
        raise RouterError('empty or blocked response') from None


def ask(prompt, grounded=False):
    p = policy()
    body = {'contents': [{'parts': [{'text': prompt}]}]}
    if grounded:
        body['tools'] = [{'google_search': {}}]
    out = _call('factcheck' if grounded else 'ask', p['models']['text'], body, p['estimateUSD']['text'])
    text = ''.join(x.get('text', '') for x in _parts(out))
    srcs = [c.get('web', {}).get('uri') for c in out['candidates'][0].get('groundingMetadata', {}).get('groundingChunks', [])]
    return text, [s for s in srcs if s]


def factcheck(claim):
    text, srcs = ask('You are a strict science fact-checker for Class 9-12 / JEE / NEET content. Check this claim. '
                     'Answer on the first line with exactly TRUE, FALSE or UNSURE, then one short reason.\n\nClaim: ' + claim,
                     grounded=True)
    verdict = text.strip().split()[0].strip('.:').upper() if text.strip() else 'UNSURE'
    return {'claim': claim, 'verdict': verdict if verdict in ('TRUE', 'FALSE', 'UNSURE') else 'UNSURE',
            'reason': text.strip(), 'sources': srcs}


def image(prompt, out_path):
    p = policy()
    out = _call('image', p['models']['image'], {'contents': [{'parts': [{'text': prompt}]}]}, p['estimateUSD']['image'])
    for x in _parts(out):
        if 'inlineData' in x:
            open(out_path, 'wb').write(base64.b64decode(x['inlineData']['data']))
            return {'path': out_path, 'provider': 'google', 'model': p['models']['image'], 'prompt': prompt}
    raise RouterError('no image in response')


def tts(text, out_path, voice='Kore'):
    p = policy()
    body = {'contents': [{'parts': [{'text': text}]}],
            'generationConfig': {'responseModalities': ['AUDIO'],
                                 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}}}}
    out = _call('tts', p['models']['tts'], body, p['estimateUSD']['tts'])
    pcm = base64.b64decode(_parts(out)[0]['inlineData']['data'])
    with wave.open(out_path, 'wb') as w:  # Gemini-TTS returns 24 kHz 16-bit mono PCM
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    return {'path': out_path, 'provider': 'google', 'model': p['models']['tts'], 'voice': voice}


def main():
    a = sys.argv[1:]
    try:
        if not a or a[0] == 'status':
            p = policy()
            print(f'enabled: {p["enabled"]}  budget: ${p["monthlyBudgetUSD"]}/month  spent: ${spent_this_month():.2f}'
                  f'  key set: {"yes" if read_env().get("GEMINI_API_KEY") else "no"}')
            print('models:', p['models'])
        elif a[0] == 'factcheck':
            print(json.dumps(factcheck(a[1]), indent=2, ensure_ascii=False))
        elif a[0] == 'ask':
            print(ask(a[1])[0])
        elif a[0] == 'image':
            print(image(a[1], a[2]))
        elif a[0] == 'tts':
            print(tts(a[1], a[2], a[a.index('--voice') + 1] if '--voice' in a else 'Kore'))
        else:
            sys.exit(__doc__)
    except RouterError as e:
        sys.exit(f'router: {e}')


if __name__ == '__main__':
    main()
