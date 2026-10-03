#!/usr/bin/env python3
"""PrayogX Reel Maker - the reel's soundtrack: an original cinematic score, synchronized sound effects and the mix.

    python3 tools/reel-maker/audio.py --plan PLAN.json --out AUDIO.wav --report AUDIO.json

PLAN.json (written by generate-reel.js) holds the reel's beats, the composer's sound-effect cues, its sync marks (the
aha and the answer reveal), the subject and chapter, and optional spec.audio settings.

Every sound is made here, by code: oscillators, additive partials and filtered noise. No samples, loops or recordings
are used, so the music and the effects are PrayogX's own work (audio_library.json records that provenance; an asset
that is not listed there with a verified licence is refused, exit 3).

The music is composed by music.py (score v2): a style from the subject and chapter (EDM, synthwave, cinematic
hybrid, organic groove, crystal 2-step), a seeded melodic hook, voice-led 7th chords and an arrangement that follows
the reel - intro, verse under the question, build, a groove that lands on the simulation start and changes at
every moment, a breakdown on the aha, the drop on the answer reveal, and a resolution on the tonic major.

The mix has three stems with priority VOICE > MUSIC > SFX for ducking: the music ducks under on-screen text
(question, problem, aha, answer) and under each effect; a voice stem (none yet) would duck both. Then: loudness
normalized to -14 LUFS integrated (ITU-R BS.1770-4), a true-peak limiter at -1 dBTP, a fade in, a fade out and
a silent last frame. 48 kHz stereo 16-bit, deterministic.
"""
import argparse
import hashlib
import json
import math
import os
import re
import sys
import wave

import numpy as np
from scipy.ndimage import maximum_filter1d, minimum_filter1d
from scipy.signal import butter, fftconvolve, lfilter, resample_poly, sosfilt

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LIBRARY = os.path.join(HERE, "audio_library.json")
TARGET_LUFS = -14.0
CEILING_DBTP = -1.0


# ------------------------------------------------------------------ provenance
class ProvenanceError(Exception):
    pass


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def load_library(path=LIBRARY):
    with open(path, encoding="utf-8") as f:
        return {a["assetId"]: a for a in json.load(f)["assets"]}


def check_asset(lib, asset_id, role, root=ROOT):
    """The asset's provenance record, or ProvenanceError. Unlisted, unverified or non-commercial assets are refused."""
    a = lib.get(asset_id)
    if not a:
        raise ProvenanceError("audio asset %r is not in audio_library.json - unknown provenance, not used" % asset_id)
    why = []
    if a.get("role") != role:
        why.append("role %r, wanted %r" % (a.get("role"), role))
    if a.get("licenseVerified") is not True:
        why.append("licence not verified")
    if a.get("commercialUse") is not True:
        why.append("commercial use not permitted")
    if "instagram" not in (a.get("permittedUse") or []):
        why.append("Instagram use not permitted")
    if not a.get("license") or not a.get("sourceReference"):
        why.append("no licence text or source reference")
    if a.get("attributionRequired") and not a.get("attributionText"):
        why.append("attribution required but no attribution text")
    if a.get("source") == "file":
        f, doc = os.path.join(root, a.get("file", "")), os.path.join(root, a.get("licenseDocument", ""))
        if not a.get("file") or not os.path.isfile(f):
            why.append("file missing")
        elif sha256_file(f) != a.get("sha256"):
            why.append("file sha256 does not match the licensed file")
        if not a.get("licenseDocument") or not os.path.isfile(doc):
            why.append("no licence document kept with the file")
    elif a.get("source") == "external-tts":                                     # a licensed voice, generated per reel
        if a.get("role") != "voice":
            why.append("external-tts is only for the voice role")
        if not a.get("licenseDocument") or not os.path.isfile(os.path.join(root, a.get("licenseDocument", ""))):
            why.append("no licence document kept in the repository")
        if a.get("disclosureRequired") is not False and not (a.get("disclosureText") or "").strip():
            why.append("no disclosureText")
    elif a.get("source") != "generated":
        why.append("unknown source %r" % a.get("source"))
    if why:
        raise ProvenanceError("audio asset %r refused: %s" % (asset_id, "; ".join(why)))
    keys = ["assetId", "role", "source", "generator", "owner", "license", "licenseVerified", "sourceReference",
            "permittedUse", "commercialUse", "attributionRequired", "attributionText", "file", "sha256",
            "provider", "engine", "model", "voiceProfiles", "licenseDocument", "disclosureRequired", "disclosureText",
            "qualificationStatus", "qualificationScope"]
    return {k: a[k] for k in keys if k in a}


# ------------------------------------------------------------------ loudness (ITU-R BS.1770-4)
def _k_weighting(sr):
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196          # the BS.1770 pre-filter (shelf)
    K = math.tan(math.pi * f0 / sr); Vh = 10 ** (G / 20); Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b1 = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a1 = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    f0, Q = 38.13547087602444, 0.5003270373238773                                 # the RLB high-pass
    K = math.tan(math.pi * f0 / sr)
    b2 = [1, -2, 1]
    a2 = [1, 2 * (K * K - 1) / (1 + K / Q + K * K), (1 - K / Q + K * K) / (1 + K / Q + K * K)]
    return (b1, a1), (b2, a2)


def _kw(x, sr):
    (b1, a1), (b2, a2) = _k_weighting(sr)
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)


def _blocks(x, sr):
    """400 ms blocks, 75 % overlap: (start times, summed mean square of the K-weighted channels)."""
    y = _kw(np.atleast_2d(x.T).T, sr)
    n, step = int(0.4 * sr), int(0.1 * sr)
    if len(y) < n:
        return np.array([0.0]), np.array([1e-12])
    p2 = np.cumsum(np.concatenate([np.zeros((1, y.shape[1])), y ** 2]), axis=0)
    starts = np.arange(0, len(y) - n + 1, step)
    return starts / sr, ((p2[starts + n] - p2[starts]) / n).sum(axis=1)


def block_loudness(x, sr=SR):
    """(block start times, momentary loudness of each 400 ms block in LUFS)"""
    t, z = _blocks(x, sr)
    return t, -0.691 + 10 * np.log10(np.maximum(z, 1e-12))


def integrated_lufs(x, sr=SR):
    t, z = _blocks(x, sr)
    L = -0.691 + 10 * np.log10(np.maximum(z, 1e-12))
    g = z[L > -70]                                                               # absolute gate
    if not len(g):
        return -120.0
    rel = -0.691 + 10 * math.log10(g.mean()) - 10                                # relative gate
    g = z[(L > -70) & (L > rel)]
    return float(-0.691 + 10 * math.log10(g.mean())) if len(g) else -120.0


def true_peak_db(x):
    up = resample_poly(np.atleast_2d(x.T).T, 4, 1, axis=0)
    return float(20 * math.log10(max(np.abs(up).max(), np.abs(x).max(), 1e-12)))


def limit(x, ceiling_db=CEILING_DBTP, radius=0.004):
    """True-peak limiter: the gain each sample needs (from the 4x oversampled peak), held over +-radius and smoothed
    with a box no wider than the hold, so the gain never exceeds what any nearby peak needs."""
    c = 10 ** (ceiling_db / 20)
    up = np.abs(resample_poly(x, 4, 1, axis=0)).max(axis=1)
    pk = np.maximum(up[: 4 * len(x)].reshape(-1, 4).max(axis=1), np.abs(x).max(axis=1))
    need = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    r = max(1, int(radius * SR))
    g = minimum_filter1d(need, 2 * r + 1)
    g = box(g, r)
    return x * np.minimum(g, need)[:, None]


def box(v, r):
    """moving average over 2r+1 samples (edges padded with the end values)."""
    p = np.concatenate([np.full(r, v[0]), v, np.full(r + 1, v[-1])])
    c = np.cumsum(p)
    return (c[2 * r + 1:] - c[: -2 * r - 1])[: len(v)] / (2 * r + 1)


# ------------------------------------------------------------------ the music (music.py) and its building blocks
sys.path.insert(0, HERE)
from music import SR as _MSR, Score, bp, env_ad, hp, lp, midi_hz, palette_for, partials, sweep_noise  # noqa: E402,F401
assert _MSR == SR


# ------------------------------------------------------------------ sound effects (the composer's cue sheet)
def fx(kind, rng):
    if kind == "whoosh":
        d = 0.55; return sweep_noise(rng, d, 300, 5000) * np.hanning(int(d * SR)) ** 1.5 * 1.2
    if kind == "riser":
        d = 0.9; n = int(d * SR); f = np.linspace(180, 900, n)
        x = 0.35 * np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.6 * sweep_noise(rng, d, 200, 7000)
        return x * np.linspace(0, 1, n) ** 2
    if kind == "impact":
        d = 0.8; n = int(d * SR); tt = np.arange(n) / SR; f = 90 * np.exp(-tt * 6) + 38
        return 0.9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(n, 0.003, 0.1) + 0.25 * lp(rng.standard_normal(n), 900) * env_ad(n, 0.001, 0.02)
    if kind == "hit":
        d = 0.7; n = int(d * SR); tt = np.arange(n) / SR; f = 120 * np.exp(-tt * 9) + 45
        return 0.8 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(n, 0.002, 0.08) + 0.6 * sweep_noise(rng, d, 4000, 600) * env_ad(n, 0.001, 0.04)
    if kind == "pop":
        d = 0.18; n = int(d * SR); tt = np.arange(n) / SR; f = 900 * np.exp(-tt * 30) + 300
        return 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(n, 0.001, 0.02)
    if kind == "tick":
        d = 0.06; n = int(d * SR)
        return 0.35 * np.sin(2 * np.pi * 2400 * np.arange(n) / SR) * env_ad(n, 0.0005, 0.005)
    if kind == "ping":
        d = 0.7; n = int(d * SR)
        return 0.32 * partials(1318.5, n, [(1, 1, 7), (2, .4, 9)])
    if kind == "ding":
        d = 0.9; n = int(d * SR)
        return 0.3 * partials(880, n, [(1, 1, 5), (1.5, .6, 6), (2, .25, 8)])
    if kind == "reveal":
        d = 2.2; n = int(d * SR); out = np.zeros(n)
        for k, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
            s = int(k * 0.07 * SR)
            out[s:] += 0.22 * partials(f, n - s, [(1, 1, 1.6), (2, .3, 2.5)])
        return out + 0.5 * sweep_noise(rng, d, 6000, 2000) * env_ad(n, 0.001, 0.07)
    if kind == "shimmer":
        d = 1.6; n = int(d * SR); out = np.zeros(n)
        for k, f in enumerate([1567.98, 2093.0, 2637.0, 3135.96]):
            s = int(k * 0.09 * SR)
            out[s:] += 0.12 * partials(f, n - s, [(1, 1, 3.3)])
        return out
    raise ValueError("unknown cue " + kind)


def sfx_stem(cues, n, rng):
    st = np.zeros((n, 2))
    for i, c in enumerate(cues):
        x = fx(c["type"], rng) * float(c.get("gain", 1))
        s = int(round(float(c["t"]) * SR))
        if s >= n:
            continue
        m = min(len(x), n - s)
        pan = 0.15 * math.sin(i * 2.3)
        st[s:s + m, 0] += x[:m] * (1 - pan); st[s:s + m, 1] += x[:m] * (1 + pan)
    return st


# ------------------------------------------------------------------ the mix
def text_windows(plan):
    """on-screen text the music ducks under: (t0, t1, dB, what)"""
    B = {b["id"]: b for b in plan["beats"]}
    M = plan.get("marks") or {}
    w = [(B["question"]["t0"], B["question"]["t0"] + B["question"]["dur"], -6.0, "question text"),
         (B["problem"]["t0"], B["problem"]["t0"] + B["problem"]["dur"] + B["curiosity"]["dur"], -4.0, "problem and curiosity lines")]
    if M.get("aha"):
        w.append((M["aha"]["t0"] + 0.5, M["aha"]["t1"], -6.0, "aha text"))
    a = M.get("answer") or {}
    if a:
        w.append((a["reveal"] + 0.35, a["t1"], -5.0, "answer text"))
    w.append((B["payoff"]["t0"], B["payoff"]["t0"] + 1.3, -3.0, "payoff lines"))
    return [{"t0": round(x[0], 3), "t1": round(x[1], 3), "duckDb": x[2], "what": x[3]} for x in w]


def envelope(x, win):
    return np.sqrt(box((x ** 2).mean(axis=1), max(1, int(win * SR / 2))))


def sidechain(trigger, depth_db, thr, hold=0.15, smooth=0.05):
    """gain (linear) that dips by up to depth_db while the trigger stem is loud."""
    e = np.clip(envelope(trigger, 0.01) / thr, 0, 1)
    e = box(maximum_filter1d(e, int(hold * SR)), int(smooth * SR))
    return 10 ** (depth_db * e / 20)


def mix(plan, music, sfx, voice=None):
    n = len(music)
    text = text_windows(plan)
    duck_db = np.zeros(n)
    for w in text:
        duck_db[int(w["t0"] * SR): int(w["t1"] * SR)] = np.minimum(duck_db[int(w["t0"] * SR): int(w["t1"] * SR)], w["duckDb"])
    duck_db = box(duck_db, int(0.15 * SR))                                     # 0.3 s ramps in and out
    g_text = 10 ** (duck_db / 20)
    g_sfx = sidechain(sfx, -4.5, 0.12)                                           # music under each effect
    g_mus = g_text * g_sfx
    g_pre = g_mus                                                               # the music's level before any voice ducking
    g_fx = np.ones(n)
    if voice is not None and np.abs(voice).max() > 0:                            # VOICE > MUSIC > SFX
        g_mus = g_mus * sidechain(voice, -10.0, 0.05, 0.3, 0.1)
        g_fx = sidechain(voice, -6.0, 0.05, 0.3, 0.1)
    out = music * g_mus[:, None] + sfx * g_fx[:, None] + (voice if voice is not None else 0)
    return out, {"text": text, "musicGainDb": 20 * np.log10(np.maximum(g_mus, 1e-6)), "textDuckDb": duck_db,
                 "musicGainDbPreVoice": 20 * np.log10(np.maximum(g_pre, 1e-6))}


# ------------------------------------------------------------------ the voice stem (narrated reels only)
VOICE_TARGET_LUFS = -16.0          # each narration segment, before the mix and the master
VOICE_RECORD_SCHEMA = "prayogx-voice-record/1"
REVEAL_PROTECT_S = 1.5             # the answer reveal stays clear of narration for this long (README -> Voiceover)


class VoiceError(ProvenanceError):
    pass


def spoken_sha256(spoken):
    return hashlib.sha256(" ".join(spoken.split()).encode("utf-8")).hexdigest()


def protected_windows(plan):
    """moments narration must not cover unless a segment is marked deliberate: the aha and the answer reveal"""
    M, w = plan.get("marks") or {}, []
    if M.get("aha"):
        w.append((M["aha"]["t0"], M["aha"]["t1"], "the aha"))
    if (M.get("answer") or {}).get("reveal") is not None:
        w.append((M["answer"]["reveal"], M["answer"]["reveal"] + REVEAL_PROTECT_S, "the answer reveal"))
    return w


def voice_stem(plan, n, lib, root=ROOT):
    """(stereo stem at SR, report) from the plan's verified voice record, or VoiceError. Only VERIFIED segments whose
    source, decoded audio and spoken form match the record enter; each is loudness-normalized, placed at its beat
    (offset after the beat starts) and never time-stretched: a segment longer than its beat window fails."""
    pv = plan["voice"]
    with open(pv["record"], encoding="utf-8") as f:
        rec = json.load(f)
    if rec.get("schema") != VOICE_RECORD_SCHEMA:
        raise VoiceError("voice record schema %r, wanted %r" % (rec.get("schema"), VOICE_RECORD_SCHEMA))
    if rec.get("status") != "VERIFIED":
        raise VoiceError("voice record is %s, not VERIFIED - unverified narration never enters the mix" % rec.get("status"))
    asset = check_asset(lib, rec["assetId"], "voice", root)
    if rec.get("voiceProfile") not in (asset.get("voiceProfiles") or []):
        raise VoiceError("voice profile %r is not licensed by asset %r" % (rec.get("voiceProfile"), rec["assetId"]))
    nar = pv.get("narration") or {}
    if nar.get("voiceProfile") != rec.get("voiceProfile"):
        raise VoiceError("the story's voice profile %r is not the verified one %r" % (nar.get("voiceProfile"), rec.get("voiceProfile")))
    B = {b["id"]: b for b in plan["beats"]}
    by_beat = {}
    for s in rec.get("segments", []):
        by_beat.setdefault(s["beat"], []).append(s)
    st, placed = np.zeros((n, 2)), []
    for k, ns in enumerate(nar.get("segments") or [], 1):
        cands = [s for s in by_beat.get(ns["beat"], []) if s.get("spokenSha256") == spoken_sha256(ns["spoken"])]
        if not cands:
            raise VoiceError("segment %d (%s): no verified audio for this spoken form (spoken-form hash mismatch)" % (k, ns["beat"]))
        s = cands[0]
        if s.get("status") != "VERIFIED" or (s.get("verification") or {}).get("status") != "VERIFIED":
            raise VoiceError("segment %d (%s): audio not VERIFIED" % (k, ns["beat"]))
        for what in ("source", "decoded"):
            p = s[what]["path"]
            if not os.path.isfile(p):
                raise VoiceError("segment %d (%s): %s audio missing: %s" % (k, ns["beat"], what, p))
            if sha256_file(p) != s[what]["sha256"]:
                raise VoiceError("segment %d (%s): %s audio sha256 does not match the verified record" % (k, ns["beat"], what))
        if ns["beat"] not in B:
            raise VoiceError("segment %d: beat %r is not in this reel" % (k, ns["beat"]))
        x, sr = read_wav(s["decoded"]["path"])                                 # mono -> stereo here
        if sr != SR:
            g = math.gcd(SR, sr); x = resample_poly(x, SR // g, sr // g, axis=0)
        secs = len(x) / SR
        if abs(secs - s["decoded"]["seconds"]) > 0.002:
            raise VoiceError("segment %d (%s): %.4f s after resampling, %.4f s verified - refusing a time change" % (k, ns["beat"], secs, s["decoded"]["seconds"]))
        b = B[ns["beat"]]
        t0 = b["t0"] + float(s.get("offset", 0.3))
        t1, end = t0 + secs, b["t0"] + b["dur"]
        if t1 > end + 1e-6:
            raise VoiceError("segment %d (%s) does not fit its beat: %.2f s of speech from %.2f s ends at %.2f s, the beat ends at %.2f s "
                             "(needs %.2f s more). Lengthen the beat in the story; speech is never time-stretched or cut."
                             % (k, ns["beat"], secs, t0, t1, end, t1 - end))
        for w0, w1, what in protected_windows(plan):
            if t0 < w1 and t1 > w0 and not s.get("deliberate"):
                raise VoiceError("segment %d (%s) covers %s (%.2f-%.2f s); mark it deliberate in the story only if that is intended" % (k, ns["beat"], what, w0, w1))
        L = integrated_lufs(x)
        gain_db = VOICE_TARGET_LUFS - L
        a, m = int(round(t0 * SR)), len(x)
        if a + m > n:
            raise VoiceError("segment %d (%s) runs past the end of the reel" % (k, ns["beat"]))
        st[a:a + m] += x * 10 ** (gain_db / 20)
        placed.append({"beat": ns["beat"], "t0": round(t0, 3), "t1": round(t1, 3), "seconds": round(secs, 4), "samples": m,
                       "sourceLufs": round(L, 2), "gainDb": round(gain_db, 2), "spokenSha256": s["spokenSha256"],
                       "sourceSha256": s["source"]["sha256"], "decodedSha256": s["decoded"]["sha256"], "jobId": s["source"].get("jobId"),
                       "deliberate": bool(s.get("deliberate")), "listeningFlags": len((s.get("verification") or {}).get("listeningFlags") or [])})
    if not placed:
        raise VoiceError("the narration has no segments")
    order = sorted(placed, key=lambda p: p["t0"])
    for a_, b_ in zip(order, order[1:]):                                        # one narrator: lines never talk over each other
        if b_["t0"] < a_["t1"] - 1e-6:
            raise VoiceError("narration segments overlap: %s ends at %.2f s but %s starts at %.2f s" % (a_["beat"], a_["t1"], b_["beat"], b_["t0"]))
    info = {"assetId": rec["assetId"], "voiceProfile": rec["voiceProfile"], "qualificationStatus": rec.get("qualificationStatus"),
            "record": os.path.abspath(pv["record"]), "recordSha256": sha256_file(pv["record"]), "recordStatus": rec["status"],
            "segments": placed, "targetLufs": VOICE_TARGET_LUFS, "duckMusicDb": -10.0, "duckSfxDb": -6.0,
            "disclosureText": asset.get("disclosureText"), "aiNarration": True, "syntheticMedia": True}
    return st, info, asset


def master(x, fade_in=0.05, fade_out=1.1, tail_silence=0.06):
    n = len(x)
    x = hp(x, 25)
    for _ in range(4):                                                         # normalize, limit, measure again
        L = integrated_lufs(x)
        x = limit(x * 10 ** ((TARGET_LUFS - L) / 20))
        if abs(integrated_lufs(x) - TARGET_LUFS) < 0.2:
            break
    t = np.arange(n) / SR
    T = n / SR
    fade = np.clip(t / fade_in, 0, 1) * np.clip((T - tail_silence - t) / fade_out, 0, 1) ** 1.6
    x = x * fade[:, None]
    x[int((T - tail_silence) * SR):] = 0
    return x


def write_wav(path, x):
    pcm = np.round(np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def read_wav(path):
    with wave.open(path, "rb") as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), dtype="<i2").astype(float).reshape(-1, ch) / 32768.0
    if ch == 1:
        x = np.repeat(x, 2, axis=1)
    return x, sr


def load_file_asset(rec, n):
    x, sr = read_wav(os.path.join(ROOT, rec["file"]))
    if sr != SR:
        g = math.gcd(SR, sr); x = resample_poly(x, SR // g, sr // g, axis=0)
    if len(x) < n:
        x = np.concatenate([x, np.zeros((n - len(x), 2))])
    return x[:n]


def render(plan, out_wav, library=LIBRARY, music_out=None):
    lib = load_library(library)
    au = plan.get("audio") or {}
    music_id, sfx_id = au.get("music", "prayogx-score-v2"), au.get("sfx", "prayogx-sfx-v1")
    tracks = [check_asset(lib, music_id, "music"), check_asset(lib, sfx_id, "sfx")]
    sc = Score(plan)
    if tracks[0]["source"] == "generated":
        music = sc.compose()
    else:
        music = load_file_asset(tracks[0], sc.n)
    music = music / max(np.abs(music).max(), 1e-9) * 0.5
    music *= np.clip(np.arange(sc.n) / (0.25 * SR), 0, 1)[:, None]               # a short fade in under the first hook word
    if music_out:
        write_wav(music_out, music)                                              # the music stem, for the arrangement checks
    sfx = sfx_stem(plan["cues"], sc.n, np.random.default_rng(sc.seed + 1))
    sfx = sfx / max(np.abs(sfx).max(), 1e-9) * 0.62
    voice, vinfo = None, None
    if plan.get("voice"):                                                       # narrated reels only; silent reels skip this
        voice, vinfo, vasset = voice_stem(plan, sc.n, lib)
        tracks.append(vasset)
    mixed, auto = mix(plan, music, sfx, voice)
    if voice is not None:                                                       # the stems the voice checks measure
        stem_dir = os.path.dirname(os.path.abspath(music_out or out_wav))
        write_wav(os.path.join(stem_dir, "voice.wav"), voice)
        write_wav(os.path.join(stem_dir, "music-bed.wav"), music * (10 ** (auto["musicGainDb"] / 20))[:, None])
        vinfo.update(stem="voice.wav", musicBed="music-bed.wav")
    final = master(mixed)
    write_wav(out_wav, final)
    st = stats(final)
    score = dict(sc.describe(), assetId=music_id) if tracks[0]["source"] == "generated" else {"assetId": music_id, "simStartDownbeat": sc.sim0}
    rep = {
        "file": os.path.basename(out_wav), "sampleRate": SR, "channels": 2, "bitDepth": 16, "seconds": round(sc.n / SR, 3),
        "tracks": tracks, "score": score, "musicStem": os.path.basename(music_out) if music_out else None,
        "arc": sc.sections, "syncEvents": sorted(sc.events, key=lambda e: e["t"]),
        "sfxCues": plan["cues"], "marks": plan.get("marks") or {},
        "mix": {"priority": ["voice", "music", "sfx"], "voice": vinfo, "textDucking": auto["text"], "sfxDuckingDb": -4.5,
                "musicGainDbBySection": {s["id"] + "@" + str(s["t0"]): round(float(np.median(auto["musicGainDb"][int(s["t0"] * SR): max(int(s["t0"] * SR) + 1, int(s["t1"] * SR))])), 2) for s in sc.sections},
                "targetLufs": TARGET_LUFS, "ceilingDbtp": CEILING_DBTP, "fadeIn": 0.05, "fadeOut": 1.1, "tailSilence": 0.06},
        "stats": st,
    }
    if voice is not None:                                                       # narrated reels only: the music before voice ducking
        rep["mix"]["musicGainDbBySectionPreVoice"] = {s["id"] + "@" + str(s["t0"]): round(float(np.median(auto["musicGainDbPreVoice"][int(s["t0"] * SR): max(int(s["t0"] * SR) + 1, int(s["t1"] * SR))])), 2)
                                                      for s in sc.sections}
    return rep


def stats(x):
    return {"integratedLufs": round(integrated_lufs(x), 2), "truePeakDbtp": round(true_peak_db(x), 2),
            "samplePeakDbfs": round(float(20 * np.log10(max(np.abs(x).max(), 1e-12))), 2),
            "clippedSamples": int((np.abs(x) >= 0.9999).sum())}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--plan", required=True); ap.add_argument("--out", required=True); ap.add_argument("--report", required=True)
    a = ap.parse_args()
    with open(a.plan, encoding="utf-8") as f:
        plan = json.load(f)
    try:
        rep = render(plan, a.out, music_out=os.path.join(os.path.dirname(os.path.abspath(a.out)), "music.wav"))
    except ProvenanceError as e:
        print("AUDIO PROVENANCE: " + str(e), file=sys.stderr)
        sys.exit(3)
    with open(a.report, "w", encoding="utf-8") as f:
        json.dump(rep, f, indent=2)
    s = rep["stats"]
    print(json.dumps({"seconds": rep["seconds"], "style": rep["score"].get("style"), "bpm": rep["score"].get("bpm"), "key": rep["score"].get("key"),
                      "instruments": rep["score"].get("instrumentCount"),
                      "lufs": s["integratedLufs"], "truePeak": s["truePeakDbtp"], "cues": len(plan["cues"])}))


if __name__ == "__main__":
    main()
