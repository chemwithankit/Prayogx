#!/usr/bin/env python3
"""PrayogX Reel Maker - generated sound design (royalty-free: every sample is synthesized here with numpy).

    python3 tools/reel-maker/audio.py CUES.json DURATION OUT.wav

CUES.json is the composer's cue sheet: [{"t": seconds, "type": "whoosh" | "pop" | ..., "gain": 0..1}].
The track is a soft evolving pad (a quiet bed so the reel is never dead silent) plus one synthesized effect per
cue, mixed to 44.1 kHz stereo 16-bit with a gentle limiter. Deterministic: a fixed random seed.
"""
import json
import sys
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def env(n, a, d, curve=4.0):
    """attack a seconds, then exponential decay over the rest."""
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    dec = np.exp(-curve * np.clip(t - a, 0, None) / max(d, 1e-4))
    return att * dec


def lowpass(x, a):
    """one-pole low-pass, a in (0, 1): smaller is darker."""
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def sweep_noise(dur, f0, f1):
    """noise through a moving band: the core of a whoosh."""
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    a = np.linspace(f0, f1, n) / SR * 2 * np.pi
    a = np.clip(a, 0.001, 0.9)
    out = np.empty(n)
    lp = hp = 0.0
    for i in range(n):
        lp += a[i] * (noise[i] - lp)
        hp += 0.02 * (lp - hp)
        out[i] = lp - hp
    return out


def tone(freq, dur, kind="sine"):
    t = np.arange(int(dur * SR)) / SR
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(freq, t.shape)) / SR if np.ndim(freq) else 2 * np.pi * freq * t
    return np.sin(ph) if kind == "sine" else np.sign(np.sin(ph)) * 0.3 + np.sin(ph) * 0.7


def fx(kind):
    if kind == "whoosh":
        d = 0.55; x = sweep_noise(d, 300, 5000) * np.hanning(int(d * SR)) ** 1.5; return x * 0.5
    if kind == "riser":
        d = 0.9; n = int(d * SR); f = np.linspace(180, 900, n)
        x = 0.35 * tone(f, d) + 0.25 * sweep_noise(d, 200, 7000)
        return x * np.linspace(0, 1, n) ** 2
    if kind == "impact":
        d = 0.8; n = int(d * SR); f = 90 * np.exp(-np.arange(n) / SR * 6) + 38
        return 0.9 * tone(f, d) * env(n, 0.003, 0.5, 5) + 0.25 * lowpass(rng.standard_normal(n), 0.08) * env(n, 0.001, 0.12, 6)
    if kind == "hit":
        d = 0.7; n = int(d * SR); f = 120 * np.exp(-np.arange(n) / SR * 9) + 45
        return 0.8 * tone(f, d) * env(n, 0.002, 0.4, 5) + 0.35 * sweep_noise(d, 4000, 600) * env(n, 0.001, 0.2, 5)
    if kind == "pop":
        d = 0.18; n = int(d * SR); f = 900 * np.exp(-np.arange(n) / SR * 30) + 300
        return 0.5 * tone(f, d) * env(n, 0.001, 0.12, 6)
    if kind == "tick":
        d = 0.06; n = int(d * SR)
        return 0.35 * tone(2400, d) * env(n, 0.0005, 0.04, 8)
    if kind == "ping":
        d = 0.7; n = int(d * SR)
        return 0.32 * (tone(1318.5, d) + 0.4 * tone(2637, d)) * env(n, 0.002, 0.6, 5)
    if kind == "ding":
        d = 0.9; n = int(d * SR)
        return 0.3 * (tone(880, d) + 0.6 * tone(1318.5, d) + 0.25 * tone(1760, d)) * env(n, 0.002, 0.8, 4)
    if kind == "reveal":
        d = 2.2; n = int(d * SR); out = np.zeros(n)
        for k, f in enumerate([523.25, 659.25, 783.99, 1046.5]):        # C major, arpeggiated
            s = int(k * 0.07 * SR); m = n - s
            out[s:] += 0.22 * (tone(f, m / SR) + 0.3 * tone(2 * f, m / SR)) * env(m, 0.004, 1.9, 3)
        return out + 0.3 * sweep_noise(d, 6000, 2000) * env(n, 0.001, 0.4, 6)
    if kind == "shimmer":
        d = 1.6; n = int(d * SR); out = np.zeros(n)
        for k, f in enumerate([1567.98, 2093.0, 2637.0, 3135.96]):
            s = int(k * 0.09 * SR); m = n - s
            out[s:] += 0.12 * tone(f, m / SR) * env(m, 0.003, 1.2, 4)
        return out
    raise ValueError("unknown cue " + kind)


def pad(dur):
    """a quiet, slowly moving chord bed (Am - F - C - G), low-passed."""
    n = int(dur * SR); t = np.arange(n) / SR
    chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 261.63, 329.63], [196.0, 246.94, 293.66]]
    out = np.zeros(n); seg = 4.0
    for i, ch in enumerate(chords * int(dur // (seg * 4) + 2)):
        s = int(i * seg * SR)
        if s >= n: break
        m = min(n - s, int((seg + 1.0) * SR)); tt = np.arange(m) / SR
        w = np.sin(np.pi * np.clip(tt / (seg + 1.0), 0, 1)) ** 2
        for f in ch:
            out[s:s + m] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt + 0.5)) * w
    out = lowpass(out, 0.06)
    fade = np.minimum(1, np.minimum(t / 1.5, (dur - t) / 1.5))
    return 0.05 * out / (np.abs(out).max() + 1e-9) * np.clip(fade, 0, 1)


def main():
    cues = json.load(open(sys.argv[1]))
    dur = float(sys.argv[2])
    n = int(dur * SR)
    L = pad(dur); R = L.copy()
    for c in cues:
        x = fx(c["type"]) * float(c.get("gain", 1))
        s = int(float(c["t"]) * SR)
        if s >= n: continue
        m = min(len(x), n - s)
        pan = 0.15 * np.sin(s)                                     # a little width, deterministic
        L[s:s + m] += x[:m] * (1 - pan); R[s:s + m] += x[:m] * (1 + pan)
    st = np.stack([L, R], 1)
    peak = np.abs(st).max()
    st = np.tanh(st / max(peak, 1e-9) * 1.2) * 0.85                   # gentle limiter
    pcm = (st * 32767).astype("<i2")
    with wave.open(sys.argv[3], "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(json.dumps({"seconds": round(dur, 3), "cues": len(cues), "out": sys.argv[3]}))


if __name__ == "__main__":
    main()
