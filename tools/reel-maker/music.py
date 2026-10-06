#!/usr/bin/env python3
"""PrayogX Reel Maker - the composer: an original, arranged soundtrack for each reel (score v2).

Everything is synthesized here: band-limited (polyBLEP) saw oscillators, supersaws, additive piano, marimba, bells
and plucks, a bowed/pizzicato string section, and a drum kit made of tuned sines and filtered noise. No samples,
loops or recordings.

How a track is made
- A STYLE from the subject and chapter (EDM / synthwave / cinematic hybrid / organic groove / crystal 2-step),
  overridable per reel with spec.audio.style. Each style has its tempo, kit, bass line, chord rhythm, arpeggio and
  lead instruments; the chapter palette keeps its identity instrument for the hook and the breakdown.
- HARMONY: a seeded four-chord progression with 7ths and 9ths, voice-led (each chord takes the inversion nearest the
  last one). The ending resolves to the tonic major.
- A MELODIC HOOK: a seeded two-bar motif (a syncopated rhythm and a stepwise contour, chord tones on the strong
  beats) and its answer phrase, which resolves. It comes back through the reel on different instruments and
  octaves, so the track has a theme rather than a loop.
- The ARRANGEMENT follows the reel: intro (the hook on the identity instrument, filtered) -> verse under the question
  (chords, sub bass, light percussion) -> build (drums enter, filter sweep, accelerating snare roll, riser, a gap)
  -> the groove lands on a downbeat as the simulation starts, and CHANGES at every simulation moment (new drum
  pattern, strings, the hook an octave up, the supersaw lead; a fill and a crash at each change) -> the aha stops
  the groove (breakdown: strings and the hook, half speed) -> pre-reveal roll and riser -> the DROP on the answer
  reveal (everything, the hook on the supersaw lead) -> outro on the tonic major, the hook's answer phrase, a clean
  ring-out.
- PRODUCTION: kick-keyed sidechain pumping, filter automation, swing and humanized velocity and timing, stereo
  supersaws, a synthetic room, and an automatic per-instrument level balance (BS.1770 loudness of each stem).
Deterministic: a seed from the simulation ID.
"""
import hashlib
import math

import numpy as np
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

SR = 48000


# ------------------------------------------------------------------ DSP
def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos"), x, axis=0)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, f1, f2, order=2):
    return sosfilt(butter(order, [f1, min(f2, SR * 0.45)], "band", fs=SR, output="sos"), x, axis=0)


def env_ad(n, a, d):
    """linear attack over a seconds, exponential decay with time constant d."""
    t = np.arange(n) / SR
    return np.clip(t / max(a, 1e-4), 0, 1) * np.exp(-np.clip(t - a, 0, None) / max(d, 1e-4))


def adsr(n, a, d, s, dur, r):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    return e * np.where(t > dur, np.clip(1 - (t - dur) / max(r, 1e-4), 0, 1), 1.0)


def partials(f, n, spec):
    """sum of sinusoids: spec = [(ratio, amp, decay per second)]; partials above 16 kHz are dropped."""
    t = np.arange(n) / SR
    out = np.zeros(n)
    for r, a, d in spec:
        if f * r < 16000:
            out += a * np.sin(2 * np.pi * f * r * t) * np.exp(-d * t)
    return out


def sweep_noise(rng, dur, f0, f1, q=1.2):
    """noise through a band that moves from f0 to f1 (blockwise, so it is fast)."""
    n = int(dur * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    zi = None
    for s in range(0, n, 1024):
        fc = f0 * (f1 / f0) ** (s / max(n - 1, 1))
        sos = butter(2, [max(30, fc / q), min(SR * 0.45, fc * q)], "band", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[s:s + 1024], zi = sosfilt(sos, x[s:s + 1024], zi=zi)
    return out


def blep_saw(f, n, ph0=0.0):
    """band-limited sawtooth (polyBLEP); f is a frequency or an array of n frequencies"""
    dt = np.broadcast_to(np.asarray(f, float) / SR, (n,))
    ph = (ph0 + np.cumsum(dt) - dt[0]) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    u = ph[m] / dt[m]
    y[m] -= u + u - u * u - 1
    m = ph > 1 - dt
    u = (ph[m] - 1) / dt[m]
    y[m] -= u * u + u + u + 1
    return y


def supersaw(f, n, rng, voices=7, cents=20.0, vib=None):
    """detuned saw stack, spread in stereo: (n, 2)"""
    out = np.zeros((n, 2))
    for i in range(voices):
        d = (i / (voices - 1) - 0.5) * 2 * cents if voices > 1 else 0
        fr = f * 2 ** (d / 1200) * (vib if vib is not None else 1)
        y = blep_saw(fr, n, rng.random())
        pan = (i / (voices - 1) - 0.5) * 1.6 if voices > 1 else 0
        out[:, 0] += y * (1 - pan) / 2
        out[:, 1] += y * (1 + pan) / 2
    return out / math.sqrt(voices)


def rbj_lp(fc, q):
    w0 = 2 * math.pi * min(max(fc, 25.0), SR * 0.45) / SR
    c, al = math.cos(w0), math.sin(w0) / (2 * q)
    b = np.array([(1 - c) / 2, 1 - c, (1 - c) / 2])
    a = np.array([1 + al, -2 * c, 1 - al])
    return b / a[0], a / a[0]


def sweep_filter(x, cutoff, q=0.85, blk=512):
    """resonant low-pass whose cutoff follows a per-sample curve (updated every block)"""
    two = x.ndim == 2
    x2 = x if two else x[:, None]
    out = np.empty_like(x2)
    zi = np.zeros((2, x2.shape[1]))
    for s in range(0, len(x2), blk):
        b, a = rbj_lp(float(cutoff[min(s + blk // 2, len(cutoff) - 1)]), q)
        out[s:s + blk], zi = lfilter(b, a, x2[s:s + blk], axis=0, zi=zi)
    return out if two else out[:, 0]


# ------------------------------------------------------------------ instruments (mono unless noted)
def vib_curve(n, rate=5.2, depth=0.0035, delay=0.25):
    t = np.arange(n) / SR
    return 1 + depth * np.sin(2 * np.pi * rate * t) * np.clip((t - delay) / 0.3, 0, 1)


def i_piano(f, dur, vel, rng):
    n = int((dur + 1.4) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    B, br = 0.00035, 0.55 + 0.6 * vel
    for k in range(1, 15):
        fk = f * k * math.sqrt(1 + B * k * k)
        if fk > 15000:
            break
        a = (1 / k ** 1.1) * math.exp(-k / (5.5 * br))
        d = (0.45 + 0.28 * k) * (f / 262) ** 0.35
        out += a * (np.sin(2 * np.pi * fk * t) + 0.55 * np.sin(2 * np.pi * fk * 1.0006 * t + k)) * np.exp(-d * t)
    out += 0.12 * vel * hp(rng.standard_normal(n), 1800) * np.exp(-t * 90)
    out *= np.where(t > dur, np.clip(1 - (t - dur) / 0.3, 0, 1), 1.0)
    return out * 0.3


def i_pluck(f, dur, vel, rng, bright=1.0):
    n = int((dur + 0.5) * SR)
    x = partials(f, n, [(k, 1 / k ** 1.25, (5 + 2.8 * k) / bright) for k in range(1, 16)])
    x += 0.15 * partials(f * 2.002, n, [(1, 1, 12)])
    return x * np.clip(np.arange(n) / (0.002 * SR), 0, 1) * 0.45


def i_marimba(f, dur, vel, rng):
    n = int((dur + 0.7) * SR)
    x = partials(f, n, [(1, 1, 5.5), (3.98, .32, 15), (9.1, .09, 34), (0.5, 0.0, 1)])
    click = bp(rng.standard_normal(n), 1800, 6000) * np.exp(-np.arange(n) / SR * 400) * 0.25
    return (x + click) * 0.55


def i_bell(f, dur, vel, rng):
    n = int((dur + 1.6) * SR)
    return partials(f, n, [(1, 1, 1.4), (2.0, .45, 2.2), (2.76, .35, 2.8), (4.07, .2, 4), (5.4, .12, 6)]) * 0.4


def i_glass(f, dur, vel, rng):
    n = int((dur + 1.3) * SR)
    return partials(f, n, [(1, 1, 1.8), (2.32, .38, 2.6), (4.25, .2, 4), (6.63, .08, 7)]) * 0.42


def i_crystal(f, dur, vel, rng):
    n = int((dur + 1.0) * SR)
    return partials(f, n, [(1, 1, 2.2), (3.0, .3, 3.5), (5.2, .18, 6), (8.1, .06, 9)]) * 0.42


def i_pizz(f, dur, vel, rng):
    n = int((min(dur, 0.25) + 0.45) * SR)
    x = partials(f, n, [(k, 1 / k ** 1.6, 9 + 6 * k) for k in range(1, 10)])
    return lp(x, 2600) * 0.6


def i_saw_pluck(f, dur, vel, rng):
    """EDM pluck: two detuned saws through a low-pass that closes fast"""
    n = int((dur + 0.35) * SR)
    x = blep_saw(f * 1.003, n, rng.random()) + blep_saw(f * 0.997, n, rng.random())
    cut = 900 + (7000 * vel) * np.exp(-np.arange(n) / SR * 14)
    return sweep_filter(x, cut, 1.1) * adsr(n, 0.002, 0.18, 0.15, dur, 0.15) * 0.35


def i_saw_lead(f, dur, vel, rng):
    """synthwave lead: a mono saw with delayed vibrato and an octave-down saw"""
    n = int((dur + 0.25) * SR)
    v = vib_curve(n)
    x = blep_saw(f * v, n, rng.random()) + 0.5 * blep_saw(f * 0.5 * v * 1.002, n, rng.random())
    x = lp(x, 4200)
    return x * adsr(n, 0.01, 0.25, 0.7, dur, 0.15) * 0.3


INSTR = {"piano": i_piano, "pluck": i_pluck, "marimba": i_marimba, "bell": i_bell, "glass": i_glass, "crystal": i_crystal,
         "pizz": i_pizz, "saw_pluck": i_saw_pluck, "saw_lead": i_saw_lead, "saw": i_saw_pluck}


# drums
def d_kick(rng, vel=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 47 + 115 * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5)
    click = hp(rng.standard_normal(n), 3000) * np.exp(-t * 420) * 0.35
    return np.tanh(1.6 * (body + click)) * vel


def d_snare(rng, vel=1.0):
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    tone = (np.sin(2 * np.pi * 185 * t) + 0.5 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t * 22)
    noise = bp(rng.standard_normal(n), 1400, 9000) * np.exp(-t * 15)
    return (0.5 * tone + 0.8 * noise) * vel


def d_clap(rng, vel=1.0):
    n = int(0.35 * SR)
    x = np.zeros(n)
    for k, o in enumerate((0, 0.011, 0.022)):
        s = int(o * SR)
        x[s:] += bp(rng.standard_normal(n - s), 900, 3400) * env_ad(n - s, 0.0008, 0.05 if k < 2 else 0.14)
    return x * 0.7 * vel


def d_hat(rng, vel=1.0, open_=False):
    n = int((0.42 if open_ else 0.09) * SR)
    t = np.arange(n) / SR
    metal = sum(np.sign(np.sin(2 * np.pi * fq * t)) for fq in (3410, 5120, 6770, 8230)) * 0.15
    x = hp(rng.standard_normal(n) + metal, 7000) * np.exp(-t * (7 if open_ else 60))
    return x * 0.38 * vel


def d_shaker(rng, vel=1.0):
    n = int(0.08 * SR)
    return bp(rng.standard_normal(n), 5000, 13000) * env_ad(n, 0.006, 0.022) * 0.35 * vel


def d_tom(rng, vel=1.0, pitch=110.0):
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    f = pitch * (1 + 0.45 * np.exp(-t * 20))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8) + 0.1 * rng.standard_normal(n) * np.exp(-t * 60)) * 0.8 * vel


def d_taiko(rng, vel=1.0):
    n = int(0.8 * SR)
    t = np.arange(n) / SR
    f = 62 * (1 + 0.6 * np.exp(-t * 18))
    return (np.tanh(1.8 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)) + 0.25 * lp(rng.standard_normal(n), 900) * np.exp(-t * 25)) * vel


def d_rim(rng, vel=1.0):
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) + bp(rng.standard_normal(n), 2000, 6000)) * np.exp(-t * 90) * 0.35 * vel


def d_conga(rng, vel=1.0, pitch=210.0):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    f = pitch * (1 + 0.15 * np.exp(-t * 40))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12) + 0.2 * bp(rng.standard_normal(n), 1500, 5000) * np.exp(-t * 200)) * 0.55 * vel


def d_crash(rng, vel=1.0):
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    e = np.exp(-t * 1.9)
    x = np.stack([hp(rng.standard_normal(n), 3800) * e, hp(rng.standard_normal(n), 3800) * e], 1)
    return x * 0.33 * vel


DRUM = {"kick": d_kick, "snare": d_snare, "clap": d_clap, "hat": d_hat, "ohat": lambda r, v: d_hat(r, v, True), "shaker": d_shaker,
        "tom": d_tom, "taiko": d_taiko, "rim": d_rim, "conga": d_conga}
DRUM_PAN = {"kick": 0, "snare": 0.05, "clap": -0.05, "hat": 0.3, "ohat": -0.3, "shaker": -0.45, "tom": 0.2, "taiko": 0, "rim": 0.35, "conga": -0.35}


# ------------------------------------------------------------------ the musical material
def pat(s):
    """'X...x...o...' -> {step: velocity}; X 1.0, x 0.75, o 0.45"""
    return {i: {"X": 1.0, "x": 0.75, "o": 0.45}[c] for i, c in enumerate(s) if c in "Xxo"}


KITS = {
    "four": {
        "light": {"hat": "..o...o...o...o.", "shaker": "o.o.o.o.o.o.o.o."},
        "A": {"kick": "X...X...X...X...", "clap": "....X.......X...", "hat": "..x...x...x...x.", "shaker": "o.o.o.o.o.o.o.o."},
        "A2": {"kick": "X...X...X...X...", "clap": "....X.......X...", "hat": "oxoxoxoxoxoxoxox", "ohat": "..x...x...x...x."},
        "B": {"kick": "X.....x...X.....", "snare": "....X.......X..o", "hat": "xoxoxoxoxoxoxoxo", "ohat": "..............x."},
        "peak": {"kick": "X...X...X...X...", "clap": "....X.......X...", "snare": "....x.......x...", "hat": "oxoxoxoxoxoxoxox",
                 "ohat": "..x...x...x...x.", "shaker": "oooooooooooooooo"},
    },
    "synthwave": {
        "light": {"hat": "x.o.x.o.x.o.x.o."},
        "A": {"kick": "X.......X.......", "snare": "....X.......X...", "hat": "x.o.x.o.x.o.x.o."},
        "A2": {"kick": "X.......X.x.....", "snare": "....X.......X...", "hat": "xoxoxoxoxoxoxoxo", "ohat": "..............x."},
        "B": {"kick": "X.....x.X.......", "snare": "....X.......X...", "hat": "xoxoxoxoxoxoxoxo", "tom": "............x.xo"},
        "peak": {"kick": "X...X...X...X...", "snare": "....X.......X...", "clap": "....x.......x...", "hat": "xoxoxoxoxoxoxoxo", "ohat": "..x...x...x...x."},
    },
    "cinematic": {
        "light": {"shaker": "o.o.o.o.o.o.o.o.", "taiko": "X..............."},
        "A": {"taiko": "X..x....X.x.....", "snare": "........X.......", "shaker": "oooooooooooooooo", "hat": "x.x.x.x.x.x.x.x."},
        "A2": {"taiko": "X..x....X.x.....", "kick": "X.......X.......", "snare": "....X.......X...", "shaker": "oooooooooooooooo", "hat": "xoxoxoxoxoxoxoxo"},
        "B": {"taiko": "X..x..x.X..x..x.", "tom": "......x.......x.", "snare": "....X.......X...", "shaker": "oooooooooooooooo"},
        "peak": {"kick": "X...X...X...X...", "taiko": "X..x....X.x.....", "snare": "....X.......X...", "hat": "xoxoxoxoxoxoxoxo", "ohat": "..x...x...x...x."},
    },
    "organic": {
        "light": {"shaker": "oxoooxoooxoooxoo", "rim": "......x.......x."},
        "A": {"kick": "X......x..x.....", "clap": "....X.......X...", "shaker": "oxoooxoooxoooxoo", "conga": "...x..x....x..x.", "rim": "......o.......o."},
        "A2": {"kick": "X......x..x.....", "clap": "....X.......X...", "shaker": "oxoxoxoxoxoxoxox", "conga": "...x..x....x..x.", "hat": "..x...x...x...x."},
        "B": {"kick": "X..x......x..x..", "clap": "....X.......X...", "shaker": "oxoxoxoxoxoxoxox", "conga": "..x..x.x..x..xx.", "hat": "..x...x...x...x."},
        "peak": {"kick": "X...X..xX...X...", "clap": "....X.......X...", "shaker": "oxoxoxoxoxoxoxox", "conga": "...x..x....x..x.",
                 "ohat": "..x...x...x...x.", "hat": "x.x.x.x.x.x.x.x."},
    },
    "twostep": {
        "light": {"hat": "..x...x...x..x.x"},
        "A": {"kick": "X......x..x.....", "snare": "....X.......X...", "hat": "x.ox.xo.x.ox.xox", "rim": "...x.......x...."},
        "A2": {"kick": "X......x..x.....", "snare": "....X.......X...", "hat": "xoxoxoxoxoxoxoxo", "rim": "...x..x....x....", "ohat": "......x.......x."},
        "B": {"kick": "X.........x..x..", "snare": "....X.......X...", "hat": "xoxoxoxoxoxoxoxo", "rim": "...x..x....x...."},
        "peak": {"kick": "X...X...X...X...", "snare": "....X.......X...", "clap": "....x.......x...", "hat": "xoxoxoxoxoxoxoxo", "ohat": "..x...x...x...x."},
    },
}
for _k in KITS.values():                      # the verse: the light kit plus a soft kick on 1 and 3
    _k["verse"] = dict(_k["light"], kick="o.......o.......")
KITS = {k: {s: {i: pat(p) for i, p in d.items()} for s, d in v.items()} for k, v in KITS.items()}

# bass lines: (step, length in 16ths, semitones above the chord root)
BASS = {
    "reese": [(2, 2, 0), (6, 2, 0), (10, 2, 0), (14, 2, 12)],
    "octave": [(i, 2, 0 if (i // 2) % 2 == 0 else 12) for i in range(0, 16, 2)],
    "pulse": [(i, 2, 7 if i == 12 else 0) for i in range(0, 16, 2)],
    "pluckbass": [(0, 3, 0), (3, 2, 7), (6, 2, 12), (10, 2, 0), (12, 3, 7)],
    "sub": [(0, 6, 0), (7, 3, 0), (10, 6, 0)],
    "long": [(0, 7, 0), (8, 5, 0), (13, 3, 7)],
}
CHORD_RHYTHM = {"stabs": [(2, 2), (6, 2), (10, 2), (14, 2)], "pad": [(0, 16)], "spiccato": [(i, 1) for i in range(0, 16, 2)],
                "piano": [(0, 3), (3, 3), (6, 4), (10, 2), (12, 4)], "crystal": [(0, 3), (3, 3), (6, 4), (10, 6)]}
ARPS = [[0, 1, 2, 3, 4, 3, 2, 1] * 2, [0, 2, 1, 3, 2, 4, 3, 5] * 2, [0, 1, 2, 0, 1, 2, 3, 4, 0, 1, 2, 0, 1, 2, 3, 5], [4, 3, 2, 1, 0, 1, 2, 3] * 2]

STYLES = {
    "edm": dict(bpm=126, swing=0.0, kit="four", bass="reese", chords="stabs", chord_inst="supersaw", arp="saw_pluck", groove_lead="saw_pluck",
                drop_lead="supersaw", strings="sus", pump=0.7, desc="EDM / electro house: four-on-the-floor, offbeat reese bass, sidechained supersaw stabs, plucked arpeggios, a supersaw drop"),
    "synthwave": dict(bpm=104, swing=0.0, kit="synthwave", bass="octave", chords="pad", chord_inst="supersaw", arp="pluck", groove_lead="saw_lead",
                      drop_lead="saw_lead", strings=None, pump=0.4, desc="synthwave: gated snare on 2 and 4, octave-bouncing bass, wide supersaw pads, a vibrato saw lead"),
    "cinematic": dict(bpm=112, swing=0.0, kit="cinematic", bass="pulse", chords="spiccato", chord_inst="strings", arp="piano", groove_lead="piano",
                      drop_lead="supersaw", strings="sus", pump=0.3, desc="cinematic hybrid: taiko and toms, spiccato string ostinato, piano theme, pulsing bass, a supersaw lift"),
    "organic": dict(bpm=108, swing=0.14, kit="organic", bass="pluckbass", chords="piano", chord_inst="piano", arp="marimba", groove_lead="marimba",
                    drop_lead="supersaw", strings="pizz", pump=0.3, desc="organic groove: swung shaker and congas, marimba ostinato, pizzicato strings, piano chords, plucked bass, an electronic lift"),
    "crystal": dict(bpm=120, swing=0.08, kit="twostep", bass="sub", chords="crystal", chord_inst="supersaw", arp="crystal", groove_lead="bell",
                    drop_lead="supersaw", strings=None, pump=0.55, desc="crystalline 2-step: shuffled hats, sub bass, bell and crystal arpeggios, supersaw chords"),
}
STYLE_OF = {"electric": "edm", "modern": "edm", "mechanics": "edm", "optics": "synthwave", "thermal": "cinematic", "physical": "cinematic",
            "organic": "organic", "inorganic": "crystal"}
# the chapter's identity: the instrument that carries the hook in the intro and the breakdown, and the tonic choices
PALETTES = {"electric": ("saw_pluck", [50, 52, 45]), "optics": ("glass", [45, 47, 52]), "mechanics": ("pluck", [45, 48, 50]),
            "thermal": ("piano", [47, 50, 52]), "modern": ("crystal", [49, 52, 45]), "organic": ("marimba", [52, 47, 50]),
            "physical": ("piano", [50, 45, 48]), "inorganic": ("crystal", [48, 52, 47])}

QUAL = {"m": [0, 3, 7], "m7": [0, 3, 7, 10], "m9": [0, 3, 7, 10, 14], "M": [0, 4, 7], "M7": [0, 4, 7, 11], "add9": [0, 4, 7, 14], "sus4": [0, 5, 7]}
PROGRESSIONS = [
    ([(0, "m9"), (8, "M7"), (3, "add9"), (10, "M")], "i9 - VImaj7 - III(add9) - VII"),
    ([(0, "m7"), (5, "m7"), (10, "M"), (3, "M7")], "i7 - iv7 - VII - IIImaj7"),
    ([(8, "M7"), (10, "add9"), (0, "m7"), (0, "m9")], "VImaj7 - VII(add9) - i7 - i9"),
    ([(0, "m9"), (10, "M"), (8, "M7"), (7, "sus4")], "i9 - VII - VImaj7 - Vsus4"),
]
SCALE = [0, 2, 3, 5, 7, 8, 10]
# melodic contours (scale degrees): arches, waves and climbs that make a singable hook
CONTOURS = [[4, 4, 3, 4, 6, 4, 3, 2], [0, 2, 4, 2, 5, 4, 2, 1], [4, 2, 4, 5, 4, 2, 0, 1], [7, 6, 4, 6, 4, 3, 2, 4],
            [2, 4, 7, 6, 4, 2, 4, 3], [4, 5, 4, 2, 4, 7, 6, 4], [0, 4, 3, 4, 7, 6, 4, 2]]
CADENCES = [[4, 2, 1, 0], [2, 1, 0, 0], [5, 4, 2, 0], [3, 2, 1, 0]]
RHYTHMS = [[(0, 2), (3, 1), (4, 2), (6, 2), (8, 3), (11, 1), (12, 2), (14, 2)],
           [(0, 3), (3, 3), (6, 2), (8, 2), (10, 2), (12, 4)],
           [(0, 1), (2, 2), (4, 1), (6, 3), (10, 1), (12, 2), (14, 2)],
           [(0, 2), (2, 1), (3, 3), (8, 2), (10, 1), (11, 3), (14, 2)],
           [(0, 3), (3, 3), (6, 3), (9, 3), (12, 2), (14, 2)]]
NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def palette_for(subject, chapter, topic=""):
    import re
    s, c = (subject or "").lower(), ((chapter or "") + " " + (topic or "")).lower()
    if s.startswith("chem"):
        if re.search(r"organic|hydrocarbon|alcohol|carbonyl|amine|biomolec|polymer|aromatic|isomer|reaction mech", c) and "inorganic" not in c:
            return "organic"
        if re.search(r"inorganic|coordination|block|metallurg|periodic|bonding|salt|qualitative", c):
            return "inorganic"
        return "physical"
    if re.search(r"electro|magnet|induct|current|capacit|charge|circuit|field|emf", c):
        return "electric"
    if re.search(r"optic|light|lens|mirror|wave|interfer|diffract|sound|prism|refract", c):
        return "optics"
    if re.search(r"thermo|heat|gas|kinetic theory|calorim", c):
        return "thermal"
    if re.search(r"modern|nucle|atom|photo|semicond|quantum|radioact", c):
        return "modern"
    return "mechanics"


class Grid:
    """the 16th-note grid, anchored so that a downbeat falls on `anchor`"""

    def __init__(self, anchor, spb, swing=0.0):
        self.anchor, self.spb, self.swing = anchor, spb, swing

    def t(self, k):
        return self.anchor + k * self.spb / 4 + (self.swing * self.spb / 4 if k % 2 else 0)

    def ticks(self, t0, t1):
        k = math.ceil((t0 - self.anchor) / (self.spb / 4) - 1e-9)
        while self.t(k) < t1 - 1e-9:
            if self.t(k) >= t0 - 1e-9:
                yield self.t(k), k
            k += 1

    def nearest_beat(self, t):
        return self.anchor + round((t - self.anchor) / self.spb) * self.spb


# ------------------------------------------------------------------ the composer
class Score:
    LAYERS = ("drums", "perc", "bass", "sub", "pad", "chords", "strings", "arp", "motif", "lead", "fx")
    # the static mix: each stem's loudness relative to the drums (LU), measured where it plays
    BALANCE = {"drums": 0, "perc": -8, "bass": -2.5, "sub": -6, "pad": -11, "chords": -6.5, "strings": -9, "arp": -8.5, "motif": -4, "lead": -3, "fx": -5}

    def __init__(self, plan):
        self.plan = plan
        self.T = float(plan["duration"])
        self.n = int(round(self.T * SR))
        self.seed = int(hashlib.sha256(plan["simulationId"].encode()).hexdigest()[:8], 16)
        self.rng = np.random.default_rng(self.seed)
        au = plan.get("audio") or {}
        self.pname = au.get("palette") or palette_for(plan.get("subject"), plan.get("chapter"), plan.get("topic"))
        self.style_name = au.get("style") or STYLE_OF[self.pname]
        self.S = STYLES[self.style_name]
        self.energy = au.get("energy", "normal")
        self.identity, roots = PALETTES[self.pname]
        self.root = roots[self.seed % len(roots)]
        self.prog, self.prog_name = PROGRESSIONS[(self.seed >> 4) % len(PROGRESSIONS)]
        self.bpm = self.S["bpm"] + ((self.seed >> 8) % 5) - 2
        self.spb = 60.0 / self.bpm
        self.layers = {k: np.zeros((self.n, 2)) for k in self.LAYERS}
        self.used = {k: set() for k in self.LAYERS}
        self.kicks = []
        self.events = []
        self.arr = []
        self.motif = self._make_motif()
        # a concept explainer (plan kind "explainer", generate-explainer.js) gets a calm teaching bed, not the reel arc
        self.explainer = plan.get("kind") == "explainer"
        self.variations = []
        self.sections = self._sections_explainer() if self.explainer else self._sections()
        S = {s["id"]: s for s in self.sections}
        self.sim0 = S["BODY"]["t0"] if self.explainer else S["SIM_START"]["t0"]
        self.g1 = Grid(self.sim0, self.spb, self.S["swing"])
        M = plan.get("marks") or {}
        self.reveal = S["OUTRO"]["t0"] if self.explainer else (M.get("answer") or {}).get("reveal", S["ANSWER"]["t0"] + 1.35)
        self.g2 = Grid(self.reveal, self.spb, self.S["swing"])
        self._last_voicing = {}

    # ---- the arc, from the reel's own beats and marks
    def _sections(self):
        B = {b["id"]: b for b in self.plan["beats"]}
        mom = [b for b in self.plan["beats"] if b["id"].startswith("moment-")]
        M = self.plan.get("marks") or {}
        end = lambda b: b["t0"] + b["dur"]
        aha = M.get("aha")
        ans = M.get("answer") or {"t0": B["answer"]["t0"]}
        sec = [("HOOK", 0.0, B["question"]["t0"], "intro: the hook on the chapter's instrument over a filtered pad, a riser into the question"),
               ("QUESTION", B["question"]["t0"], B["problem"]["t0"], "verse under the question: chords, sub bass, light percussion"),
               ("PROBLEM", B["problem"]["t0"], mom[0]["t0"], "build: drums enter, filter sweep, accelerating snare roll, riser, a gap"),
               ("SIM_START", mom[0]["t0"], aha["t0"] if aha else end(mom[-1]), "the groove lands on a downbeat as the simulation starts and changes at every moment")]
        if aha:
            sec.append(("AHA", aha["t0"], aha["t1"], "breakdown: the groove stops on the aha; strings and the hook at half speed"))
            if aha["t1"] < end(mom[-1]) - 0.05:
                sec.append(("SIM_START", aha["t1"], end(mom[-1]), "the groove returns for the remaining moments"))
        sec += [("ANSWER", ans["t0"], end(B["answer"]), "a snare roll and riser, then the drop on the reveal: the hook on the lead, everything in"),
                ("BRAND", B["payoff"]["t0"], self.T, "outro: the hook's answer phrase over the tonic major, a clean ring-out")]
        return [{"id": a, "t0": round(b, 3), "t1": round(c, 3), "role": d} for a, b, c, d in sec]

    def _sections_explainer(self):
        """a concept explainer's arc, from its scenes: the opening scene, the explanation, the closing takeaway"""
        sc = self.plan["beats"]
        if len(sc) < 3:
            raise ValueError("an explainer needs at least three scenes (opening, explanation, takeaway)")
        sec = [("INTRO", 0.0, sc[1]["t0"], "intro: the chapter's instrument over a pad that slowly opens, under the title"),
               ("BODY", sc[1]["t0"], sc[-1]["t0"], "a calm teaching bed under the narration: soft chords and a light pulse that change gently at each scene"),
               ("OUTRO", sc[-1]["t0"], self.T, "outro: the hook's answer phrase resolving on the tonic major under the takeaway, a clean ring-out")]
        return [{"id": a, "t0": round(b, 3), "t1": round(c, 3), "role": d} for a, b, c, d in sec]

    # ---- material
    def _make_motif(self):
        """a four-bar hook in phrase form A A' | A C: an idea, the idea a step lower (a sequence), the idea again,
        and a cadence onto the tonic. Contour and rhythm are chosen by the seed; repetition makes it memorable."""
        r = np.random.default_rng(self.seed + 11)
        rh = RHYTHMS[r.integers(len(RHYTHMS))]
        con = CONTOURS[r.integers(len(CONTOURS))]
        cad = CADENCES[r.integers(len(CADENCES))]
        fit = lambda c, k: [c[round(i * (len(c) - 1) / max(k - 1, 1))] for i in range(k)]
        A = [(s, l, d) for (s, l), d in zip(rh, fit(con, len(rh)))]
        A2 = [(s, l, d - 1) for s, l, d in A]
        A2[-1] = (A2[-1][0], A2[-1][1], A2[-1][2] + (2 if A2[-1][2] < 3 else -1))      # end the sequence open
        crh = rh[: max(3, len(rh) - 3)] + [(12, 4)] if rh[-1][0] < 12 else rh[: len(rh) - 2]
        crh = sorted({s: (s, l) for s, l in crh}.values())
        C = [(s, l, d) for (s, l), d in zip(crh, fit(con[:3], len(crh) - len(cad)) + cad if len(crh) > len(cad) else cad[-len(crh):])]
        C[-1] = (C[-1][0], max(C[-1][1], 4), 0)                                      # the cadence lands on the tonic
        call = A + [(16 + s, l, d) for s, l, d in A2]
        answer = A + [(16 + s, l, d) for s, l, d in C]
        return {"call": call, "answer": answer, "contour": con, "rhythm": rh}

    def chord_at(self, k, final=False, shift=0):
        if final:
            return 0, "M"
        return self.prog[(k // 16 + shift) % 4]

    def voicing(self, deg, q, center=62):
        """the chord's notes near the last voicing (voice leading)"""
        pcs = [(self.root + deg + iv) % 12 for iv in QUAL[q]]
        best, cost = None, 1e9
        for inv in range(len(pcs)):
            v, lo = [], center - 7
            for p in pcs[inv:] + pcs[:inv]:
                m = lo + ((p - lo) % 12)
                while v and m <= v[-1]:
                    m += 12
                v.append(m)
            ref = self._last_voicing.get(center) or [center - 3, center, center + 4, center + 7]
            c = sum(abs(a - b) for a, b in zip(sorted(v), sorted(ref))) + abs(np.mean(v) - center) * 0.5
            if c < cost:
                best, cost = v, c
        self._last_voicing[center] = best
        return best

    def scale_note(self, deg, octave):
        return self.root + 12 * octave + SCALE[deg % 7] + 12 * (deg // 7)

    def snap(self, m, deg, q):
        pcs = {(self.root + deg + iv) % 12 for iv in QUAL[q]}
        for d in (0, -1, 1, -2, 2):
            if (m + d) % 12 in pcs:
                return m + d
        return m

    # ---- placing sound
    def add(self, layer, x, t0, pan=0.0, gain=1.0, inst=None):
        s = int(round(t0 * SR))
        if s >= self.n or len(x) == 0:
            return
        if s < 0:
            x = x[-s:]
            s = 0
        m = min(len(x), self.n - s)
        if x.ndim == 1:
            L, R = math.cos((pan + 1) * math.pi / 4) * math.sqrt(2), math.sin((pan + 1) * math.pi / 4) * math.sqrt(2)
            self.layers[layer][s:s + m, 0] += x[:m] * L * gain
            self.layers[layer][s:s + m, 1] += x[:m] * R * gain
        else:
            self.layers[layer][s:s + m] += x[:m] * gain
        if inst:
            self.used[layer].add(inst)

    def human(self, v, t, amt=0.06, tj=0.004):
        return max(0.05, v * getattr(self, "dyn", 1.0) * (1 + self.rng.normal(0, amt))), t + self.rng.normal(0, tj)

    def note(self, layer, inst, midi, t, dur, vel, pan=0.0):
        v, t = self.human(vel, t, tj=0.003 if inst in ("piano", "marimba", "pizz", "pluck") else 0.0)
        f = midi_hz(midi)
        if inst == "supersaw":
            n = int((dur + 0.3) * SR)
            x = supersaw(f, n, self.rng, 7, 18) + 0.35 * supersaw(f * 2, n, self.rng, 3, 10)
            x *= adsr(n, 0.006, 0.3, 0.75, dur, 0.22)[:, None] * 0.3 * v
            self.add(layer, lp(x, 9000), t, inst=inst)
        elif inst == "strings":
            n = int((dur + 0.5) * SR)
            vib = vib_curve(n, 5.0, 0.004, 0.3)
            x = supersaw(f, n, self.rng, 5, 7, vib)
            a = 0.012 if dur < 0.3 else 0.22
            x = lp(x, 3800) * adsr(n, a, 0.4, 0.8, dur, 0.35 if dur > 0.3 else 0.12)[:, None] * 0.4 * v
            self.add(layer, x, t, inst=inst)
        elif inst == "stab":
            n = int((dur + 0.2) * SR)
            x = supersaw(f, n, self.rng, 7, 25) * adsr(n, 0.003, 0.12, 0.35, dur, 0.1)[:, None] * 0.3 * v
            self.add(layer, x, t, inst="supersaw stab")
        else:
            self.add(layer, INSTR[inst](f, dur, v, self.rng) * v, t, pan, inst=inst)

    def drum(self, name, t, vel, layer="drums"):
        v, t = self.human(vel, t, 0.07, 0.002)
        x = d_crash(self.rng, v) if name == "crash" else DRUM[name](self.rng, v)
        self.add(layer if name in ("kick", "snare", "clap", "tom", "taiko") else "perc", x, t, DRUM_PAN.get(name, 0), inst=name)
        if name in ("kick", "taiko"):
            self.kicks.append(t)

    def pad(self, t0, t1, notes, inst="supersaw", vel=0.6, layer="pad"):
        if t1 - t0 < 0.05:
            return
        n = int((t1 - t0 + 0.9) * SR)
        if inst == "strings":
            x = sum(supersaw(midi_hz(m), n, self.rng, 5, 8, vib_curve(n, 4.8, 0.003, 0.4)) for m in notes)
            x = lp(x, 3500)
        else:
            x = sum(supersaw(midi_hz(m), n, self.rng, 7, 22) for m in notes)
        x *= adsr(n, min(0.35, (t1 - t0) / 3), 0.6, 0.85, t1 - t0, 0.8)[:, None] * 0.12 * vel
        self.add(layer, x, t0, inst=inst + (" pad" if inst == "supersaw" else ""))

    def riser(self, t_end, dur, vel=1.0):
        n = int(dur * SR)
        u = np.arange(n) / n
        x = sweep_noise(self.rng, dur, 300, 10000) * u ** 2 * 0.7
        f = midi_hz(self.root + 12) * 2 ** (u * 1.0)
        x = x[:, None] + supersaw(f, n, self.rng, 5, 30) * (u ** 2.5 * 0.35)[:, None]
        self.add("fx", x * vel, t_end - dur, inst="riser")

    def impact(self, t, vel=1.0):
        n = int(1.8 * SR)
        tt = np.arange(n) / SR
        boom = np.sin(2 * np.pi * np.cumsum(32 + 55 * np.exp(-tt * 5)) / SR) * np.exp(-tt * 2.4)
        self.add("fx", boom * vel, t, inst="impact")
        self.drum("crash", t, vel)
        self.drum("kick", t, vel)

    def roll(self, t0, t1, grid, inst="snare"):
        """an accelerating roll that ends at t1: eighths, then sixteenths, then thirty-seconds, rising"""
        L = t1 - t0
        t = t0
        while t < t1 - 0.01:
            u = (t - t0) / max(L, 1e-3)
            step = grid.spb / (2 if u < 0.4 else 4 if u < 0.75 else 8)
            self.drum(inst, t, 0.25 + 0.7 * u)
            t += step

    # ---- one section of music on a grid
    def play(self, t0, t1, grid, kit=None, bass=None, chords=None, chord_inst=None, arp=None, arp_pat=0, motif=None, motif_oct=0,
             motif_vel=0.8, pad=None, strings=None, final=False, fill=False, gap=0.0, label="", motif_phrase=None, half=False, kit_vel=1.0, prog_shift=0, dyn=1.0):
        self.arr.append({"t0": round(t0, 3), "t1": round(t1, 3), "label": label, "kit": kit, "bass": bass, "chords": chords and chord_inst,
                         "arp": arp, "motif": motif, "pad": pad, "strings": strings, "progShift": prog_shift})
        stop = t1 - gap
        pad_start = None
        self.dyn = dyn
        if chords == "pad" and not pad:
            pad = "supersaw"
        for t, k in grid.ticks(t0, stop):
            step, bar = k % 16, k // 16
            deg, q = self.chord_at(k, final, prog_shift)
            in_fill = fill and t >= t1 - grid.spb - 1e-6
            # drums
            if kit and not in_fill:
                for name, p in KITS[self.S["kit"]][kit].items():
                    if step in p:
                        self.drum(name, t, p[step] * kit_vel * (1.0 if self.energy != "high" else 1.08))
            if in_fill:
                fname = "tom" if self.S["kit"] in ("cinematic", "organic") else "snare"
                if fname == "tom":
                    self.add("drums", d_tom(self.rng, 0.5 + 0.12 * (step % 4), 180 - 25 * (step % 4)), t, 0.2, inst="tom")
                else:
                    self.drum("snare", t, 0.45 + 0.15 * (step % 4))
            # bass
            if bass:
                for s, l, off in BASS[bass if bass in BASS else self.S["bass"]]:
                    if s == step:
                        base = self.root - 24 + (deg % 12)
                        if base >= self.root - 12:
                            base -= 12
                        self.bass_note(base + off, t, l * grid.spb / 4)
            # chords
            if chords and chords != "pad":
                for s, l in CHORD_RHYTHM[chords]:
                    if s == step:
                        v = self.voicing(deg, q)
                        for m in v:
                            self.note("chords", chord_inst if chord_inst != "supersaw" else "stab", m, t, l * grid.spb / 4 * 0.9,
                                      0.55 if chords != "pad" else 0.4)
            # arpeggio
            if arp:
                tones = sorted(self.voicing(deg, q, 70))
                ext = tones + [x + 12 for x in tones] + [x + 24 for x in tones]
                idx = ARPS[arp_pat % len(ARPS)][step]
                self.note("arp", arp, ext[idx % len(ext)], t, grid.spb / 4 * 0.9, 0.5 if step % 4 else 0.7, 0.35 if step % 2 else -0.35)
            # the hook
            if motif:
                ph = motif_phrase or ("call" if (bar % 4) < 2 else "answer")
                pos = (bar % 2) * 16 + step
                if half:
                    pos = ((bar % 4) * 16 + step) // 2 if step % 2 == 0 else -1
                for s, l, d in self.motif[ph]:
                    if s == pos:
                        m = self.snap(self.scale_note(d, 1 + motif_oct), deg, q) if s % 8 == 0 else self.scale_note(d, 1 + motif_oct)
                        dur = l * grid.spb / 4 * (2 if half else 1) * 0.95
                        layer = "lead" if motif in ("supersaw", "saw_lead") else "motif"
                        self.note(layer, motif, m, t, dur, motif_vel)
                        if motif == "supersaw":
                            self.note("motif", "pluck", m + 12, t, dur, motif_vel * 0.6)
            # pad / sustained strings: one chord per bar
            if (pad or strings == "sus") and (step == 0 or pad_start is None):
                pad_start = t
                bar_end = min(stop, grid.t((bar + 1) * 16))
                v = self.voicing(deg, q, 60)
                if pad:
                    self.pad(t, bar_end, v, pad, 0.7 if pad == "supersaw" else 0.9)
                if strings == "sus":
                    self.pad(t, bar_end, [v[0] - 12] + v[:3], "strings", 0.8, "strings")
            if strings == "pizz" and step % 4 == 0:
                v = self.voicing(deg, q, 64)
                self.note("strings", "pizz", v[(step // 4) % len(v)], t, 0.2, 0.7)
            if strings == "spiccato" and step % 2 == 0:
                v = self.voicing(deg, q, 60)
                self.note("strings", "strings", v[(step // 2) % len(v)], t, grid.spb / 4 * 0.8, 0.6)
        self.dyn = 1.0

    def bass_note(self, m, t, dur):
        b = self.S["bass"]
        n = int((dur + 0.12) * SR)
        f = midi_hz(m)
        if b in ("reese", "octave"):
            x = blep_saw(f * 1.004, n, self.rng.random()) + blep_saw(f * 0.996, n, self.rng.random())
            x = lp(x, 900 if b == "reese" else 1400) * 0.5
        elif b == "pluckbass":
            x = partials(f, n, [(k, 1 / k ** 1.4, 6 + 4 * k) for k in range(1, 8)]) * 0.9
        else:
            x = partials(f, n, [(1, 1, 0.5), (2, 0.25, 2), (3, 0.1, 4)]) * 0.9
        x *= adsr(n, 0.004, 0.2, 0.75, dur, 0.06)
        self.add("bass", x, t, inst=b + " bass")
        sub = np.sin(2 * np.pi * f * np.arange(n) / SR) * adsr(n, 0.004, 0.3, 0.9, dur, 0.06) * 0.8
        self.add("sub", sub, t, inst="sub")

    # ---- a concept explainer: a calm bed (no riser, roll, impact or drop - the voice carries the lesson)
    def compose_explainer(self):
        st, g, ident = self.S, self.g1, self.identity
        S = {s["id"]: s for s in self.sections}
        intro, body, outro = S["INTRO"], S["BODY"], S["OUTRO"]
        motif = ident if ident not in ("saw_pluck",) else "piano"
        self.play(intro["t0"], intro["t1"], Grid(0.0, self.spb), pad="supersaw", motif=motif, motif_vel=0.55, label="intro: the hook, soft", dyn=0.7)
        self.events.append({"t": 0.0, "what": "intro under the title"})
        # every explanation scene after the first is a cut (section bounds are rounded to the millisecond, so compare loosely)
        cuts = [body["t0"]] + [g.nearest_beat(b["t0"]) for b in self.plan["beats"] if body["t0"] + 0.6 < b["t0"] < body["t1"] - 0.6] + [body["t1"]]
        textures = [dict(bass="sub", chords=None, arp=None, strings="sus" if st["strings"] else None, label="bed A: pad and sustained strings"),
                    dict(bass="sub", chords=st["chords"], arp=None, strings=None, label="bed B: soft chords"),
                    dict(bass="sub", chords=None, arp=st["arp"], strings=None, label="bed C: a quiet arpeggio")]
        for i in range(len(cuts) - 1):
            z = textures[i % len(textures)]
            self.play(cuts[i], cuts[i + 1], g, kit="light", kit_vel=0.45, bass=z["bass"], chords=z["chords"], chord_inst=st["chord_inst"], arp=z["arp"], arp_pat=3,
                      pad="supersaw", strings=z["strings"], dyn=0.6, label=z["label"])
            self.variations.append({"t0": round(cuts[i], 3), "t1": round(cuts[i + 1], 3), "stage": "ABC"[i % 3], "kit": "light", "lead": None})
            self.events.append({"t": round(cuts[i], 3), "what": "scene change: " + z["label"]})
        self.play(outro["t0"], self.T - 0.15, Grid(outro["t0"], self.spb), pad="supersaw", strings="sus" if st["strings"] else None, motif=motif,
                  motif_vel=0.6, final=True, motif_phrase="answer", label="outro: resolution", dyn=0.7)
        self.events.append({"t": outro["t0"], "what": "takeaway: resolution on the tonic major"})
        return self.mixdown()

    # ---- the arrangement of the whole reel
    def compose(self):
        if self.explainer:
            return self.compose_explainer()
        S, st = self.sections, self.S
        sec = lambda i: [s for s in S if s["id"] == i]
        hook, q, pr, ans, brand = sec("HOOK")[0], sec("QUESTION")[0], sec("PROBLEM")[0], sec("ANSWER")[0], sec("BRAND")[0]
        g1, g2 = self.g1, self.g2
        ident = self.identity

        # INTRO: the hook on the chapter's instrument over a pad that opens; light percussion in the second half
        self.play(hook["t0"], hook["t1"], g1, pad="supersaw", motif=ident, motif_vel=0.85, label="intro: the hook, filtered pad", gap=0.0)
        self.play((hook["t0"] + hook["t1"]) / 2, hook["t1"], g1, kit="light", label="intro percussion")
        self.riser(hook["t1"], min(1.4, hook["t1"] - hook["t0"]), 0.55)
        self.events.append({"t": round(hook["t1"], 3), "what": "riser into the question"})

        # VERSE under the question: chords, bass, light percussion (the mix ducks it under the text)
        qm = g1.nearest_beat((q["t0"] + q["t1"]) / 2)
        self.play(q["t0"], qm, g1, kit="light", bass="sub", chords=st["chords"], chord_inst=st["chord_inst"], pad="supersaw",
                  label="verse (sparse)", dyn=0.75)
        self.play(qm, q["t1"], g1, kit="verse", bass=st["bass"], chords=st["chords"], chord_inst=st["chord_inst"], pad="supersaw",
                  strings="pizz" if st["strings"] == "pizz" else None, arp=st["arp"], arp_pat=3, label="verse (pulse)", dyn=0.82)

        # BUILD: kick enters, arpeggio through an opening filter, the roll, a riser, a gap before the downbeat
        mid = (pr["t0"] + pr["t1"]) / 2
        self.play(pr["t0"], pr["t1"], g1, kit="A" if st["kit"] != "cinematic" else "light", bass=st["bass"], arp=st["arp"], arp_pat=0,
                  pad="supersaw", gap=self.spb / 2, label="build")
        self.roll(max(mid, pr["t1"] - 4 * self.spb), pr["t1"] - self.spb / 2, g1)
        self.riser(pr["t1"], min(2.4, pr["t1"] - pr["t0"]), 1.0)
        self.events.append({"t": round(pr["t1"], 3), "what": "roll, riser and a half-beat gap into the simulation start"})

        # GROOVE: changes at every simulation moment
        mom = [b for b in self.plan["beats"] if b["id"].startswith("moment-")]
        # A lean (drums, bass, arpeggio, the hook) / B full (chords, strings, the hook an octave up) / C broken beat, held
        # bass, the harmony moved on, the hook on the big lead, no arpeggio / D peak (everything)
        stages = [dict(kit="A", bass=st["bass"], chords=None, arp=st["arp"], arp_pat=0, motif=st["groove_lead"], motif_oct=0, strings=None, shift=0),
                  dict(kit="A2", bass=st["bass"], chords=st["chords"], arp=st["arp"], arp_pat=1, motif=st["groove_lead"], motif_oct=1, strings=st["strings"], shift=0),
                  dict(kit="B", bass="long", chords=st["chords"], arp=None, arp_pat=2, motif=st["drop_lead"], motif_oct=0,
                       strings="spiccato" if st["strings"] else None, shift=2),
                  dict(kit="peak", bass=st["bass"], chords=st["chords"], arp=st["arp"], arp_pat=3, motif=st["drop_lead"], motif_oct=1, strings=st["strings"], shift=0)]
        shift = 1 if self.energy == "high" else 0
        self.variations = []
        for s in sec("SIM_START"):
            cuts = [s["t0"]] + [g1.nearest_beat(b["t0"]) for b in mom if s["t0"] + 0.6 < b["t0"] < s["t1"] - 0.6] + [s["t1"]]
            first = s is sec("SIM_START")[0]
            self.impact(s["t0"], 0.9 if first else 0.7)
            self.events.append({"t": s["t0"], "what": "downbeat: the simulation starts" if first else "downbeat: the groove returns"})
            for i in range(len(cuts) - 1):
                idx = min(len(stages) - 1, i + shift + (0 if first else 2))
                z = stages[idx]
                last = i == len(cuts) - 2
                self.play(cuts[i], cuts[i + 1], g1, kit=z["kit"], bass=z["bass"], chords=z["chords"], chord_inst=st["chord_inst"], arp=z["arp"],
                          arp_pat=z["arp_pat"], motif=z["motif"], motif_oct=z["motif_oct"], strings=z["strings"], prog_shift=z["shift"], dyn=(0.78, 0.88, 0.95, 1.06)[idx],
                          pad="supersaw" if (st["chords"] == "pad" or z["chords"] is None) else None, fill=not last, label="groove %s" % "ABCD"[idx])
                self.variations.append({"t0": round(cuts[i], 3), "t1": round(cuts[i + 1], 3), "stage": "ABCD"[idx], "kit": z["kit"], "lead": z["motif"]})
                if i > 0:
                    self.drum("crash", cuts[i], 0.7)
                    self.events.append({"t": round(cuts[i], 3), "what": "new moment: groove %s, fill and crash" % "ABCD"[idx]})

        # BREAKDOWN on the aha: the groove stops dead; strings and the hook at half speed, the bass falls away
        for a in sec("AHA"):
            self.impact(a["t0"], 0.75)
            self.play(a["t0"] + 0.05, a["t1"], g1, strings="sus", pad="supersaw", motif=ident if ident not in ("saw_pluck",) else "piano",
                      motif_vel=0.75, half=True, label="breakdown")
            self.events.append({"t": a["t0"], "what": "aha: the groove stops, breakdown with the hook at half speed"})

        # PRE-REVEAL: the V chord, a roll and a riser, a short gap - then the DROP on the reveal
        self.play(ans["t0"], self.reveal, g2, pad="supersaw", strings="sus" if st["strings"] else None, gap=self.spb / 4, label="pre-reveal")
        self.roll(ans["t0"], self.reveal - self.spb / 4, g2)
        self.riser(self.reveal, max(0.6, self.reveal - ans["t0"]), 1.0)
        self.impact(self.reveal, 1.0)
        self.play(self.reveal, brand["t0"], g2, kit="peak", bass=st["bass"], chords=st["chords"], chord_inst=st["chord_inst"], arp=st["arp"], arp_pat=1,
                  motif=st["drop_lead"], motif_oct=1, motif_vel=0.95, strings=st["strings"], pad="supersaw", label="drop", motif_phrase="call")
        self.events.append({"t": round(self.reveal, 3), "what": "answer reveal: the drop - the hook on the lead, everything in"})

        # OUTRO: the tonic major, the hook's answer phrase, a ring-out
        self.drum("crash", brand["t0"], 0.6)
        self.drum("kick", brand["t0"], 0.9)
        self.play(brand["t0"], self.T - 0.15, Grid(brand["t0"], self.spb), pad="supersaw", strings="sus" if st["strings"] else None, motif=ident if ident != "saw_pluck" else "piano",
                  motif_vel=0.8, final=True, motif_phrase="answer", label="outro")
        self.events.append({"t": brand["t0"], "what": "brand: resolution on the tonic major"})
        return self.mixdown()

    # ---- production
    def automation(self):
        """filter cutoffs (Hz) per sample for the pad/chord/arp layers: the intro and the build open, the breakdown closes"""
        pts = []
        S = {s["id"]: s for s in self.sections}
        if self.explainer:                                                     # a slow opening, a steady body, a softer close
            pts = [(0, 500), (S["INTRO"]["t1"], 2400), (S["OUTRO"]["t0"], 2800), (self.T, 1800)]
            t = np.arange(self.n) / SR
            return np.exp(np.interp(t, [p[0] for p in pts], np.log([p[1] for p in pts])))
        pts += [(0, 450), (S["HOOK"]["t1"], 2600), (S["QUESTION"]["t1"], 3200), (S["PROBLEM"]["t0"], 900), (S["PROBLEM"]["t1"] - 0.05, 13000),
                (S["PROBLEM"]["t1"], 14000)]
        for s in self.sections:
            if s["id"] == "AHA":
                pts += [(s["t0"] - 0.01, 14000), (s["t0"], 1200), (s["t1"], 3500)]
        a = S["ANSWER"]["t0"]
        pts += [(a, 1500), (self.reveal - 0.01, 14000), (self.reveal, 15000), (S["BRAND"]["t0"], 9000), (self.T, 2500)]
        pts.sort()
        t = np.arange(self.n) / SR
        return np.exp(np.interp(t, [p[0] for p in pts], np.log([p[1] for p in pts])))

    def pump(self, depth):
        if not self.kicks or depth <= 0:
            return np.ones(self.n)
        imp = np.zeros(self.n)
        for t in self.kicks:
            s = int(t * SR)
            if 0 <= s < self.n:
                imp[s] = 1
        L = int(0.22 * SR)
        k = (1 - np.arange(L) / L) ** 2
        k[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
        c = np.minimum(1, fftconvolve(imp, k)[: self.n])
        return 1 - depth * c

    def mixdown(self):
        import audio as AU                                                     # loudness meter (BS.1770)
        Ly = self.layers
        cut = self.automation()
        for k in ("pad", "chords", "arp"):
            if np.abs(Ly[k]).max() > 0:
                Ly[k] = sweep_filter(Ly[k], cut, 0.9)
        for k in ("pad", "chords", "arp", "strings", "motif", "lead", "perc", "drums"):
            Ly[k] = hp(Ly[k], 120 if k not in ("drums",) else 30)
        Ly["drums"] = np.tanh(1.2 * Ly["drums"] / max(np.abs(Ly["drums"]).max(), 1e-9)) * np.abs(Ly["drums"]).max()
        g = self.pump(0 if self.explainer else self.S["pump"])           # no side-chain pumping under a teacher's voice
        for k in ("bass", "pad", "chords", "strings"):
            Ly[k] = Ly[k] * g[:, None]
        Ly["sub"] = Ly["sub"] * (1 - (1 - g) * 0.9)[:, None]
        # static mix: each stem to its target loudness relative to the drums
        ref = AU.integrated_lufs(Ly["drums"]) if np.abs(Ly["drums"]).max() > 0 else -20.0
        self.gains = {}
        out = np.zeros((self.n, 2))
        for k in self.LAYERS:
            if np.abs(Ly[k]).max() == 0:
                continue
            L = AU.integrated_lufs(Ly[k])
            gdb = (ref + self.BALANCE[k]) - L if L > -70 else 0
            self.gains[k] = round(gdb, 1)
            out += Ly[k] * 10 ** (gdb / 20)
            Ly[k] = Ly[k] * 10 ** (gdb / 20)
        # a synthetic room on the melodic stems
        ir_n = int(1.6 * SR)
        tt = np.arange(ir_n) / SR
        ir = np.stack([lp(self.rng.standard_normal(ir_n), 7000) * np.exp(-tt / 0.42) for _ in range(2)], 1)
        ir /= np.sqrt((ir ** 2).sum(axis=0))
        wet = 0.5 * Ly["pad"] + 0.35 * Ly["chords"] + 0.45 * Ly["strings"] + 0.4 * Ly["motif"] + 0.3 * Ly["lead"] + 0.25 * Ly["arp"] + 0.12 * Ly["drums"]
        rev = np.stack([fftconvolve(wet[:, c], ir[:, c])[: self.n] for c in range(2)], 1)
        return hp(out + 0.28 * rev, 25)

    def describe(self):
        ins = sorted({i for v in self.used.values() for i in v})
        return {"engine": "prayogx-score-v2", "style": self.style_name, "styleDescription": self.S["desc"], "palette": self.pname, "identityInstrument": self.identity,
                "energy": self.energy, "bpm": self.bpm, "key": "%s minor (resolving to major)" % NAMES[self.root % 12], "progression": self.prog_name,
                "motif": {"call": self.motif["call"], "answer": self.motif["answer"]}, "instruments": ins, "instrumentCount": len(ins),
                "layers": {k: sorted(v) for k, v in self.used.items() if v}, "arrangement": self.arr, "grooveVariations": self.variations,
                "stemGainsDb": self.gains, "seed": self.seed, "simStartDownbeat": self.sim0, "revealDownbeat": self.reveal}
