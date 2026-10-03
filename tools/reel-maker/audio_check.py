#!/usr/bin/env python3
"""PrayogX Reel Maker - audio validation of a finished reel, on the sound inside the MP4.

    python3 tools/reel-maker/audio_check.py CHECK.json      ->  prints {"checks": [{name, ok, detail}], "measured": {...}}

CHECK.json: {"decoded": the MP4's audio track decoded by encode.swift audio, "rendered": the mix audio.py wrote, "music": the music stem,
"report": audio.py's report, "probe": encode.swift probe of the MP4, "beats", "marks", "seconds", "fps"}.

The checks never trust metadata alone: loudness, peaks, silence, fades, the accents at the aha and the reveal, and
the match between the MP4's waveform and the rendered mix are all measured on the decoded samples. Provenance is
re-checked against audio_library.json, not copied from the report.
"""
import json
import math
import os
import sys
import wave

import numpy as np
from scipy.signal import fftconvolve

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audio as AU  # noqa: E402

SECTIONS = ["HOOK", "QUESTION", "PROBLEM", "SIM_START", "AHA", "ANSWER", "BRAND"]


def short_rms_db(x, t0, t1, win=0.05):
    a, b = max(0, int(t0 * AU.SR)), min(len(x), int(t1 * AU.SR))
    m = x[a:b].mean(axis=1) if x.ndim == 2 else x[a:b]
    w = int(win * AU.SR)
    if len(m) < w:
        return np.array([-120.0])
    k = len(m) // w
    r = np.sqrt((m[: k * w].reshape(k, w) ** 2).mean(axis=1))
    return 20 * np.log10(np.maximum(r, 1e-9))


def check(d):
    out, meas = [], {}
    ok = lambda name, cond, detail="": out.append({"name": name, "ok": bool(cond), "detail": str(detail)})
    T, fps, pr = float(d["seconds"]), float(d["fps"]), d["probe"]
    rep = json.load(open(d["report"], encoding="utf-8"))
    x, sr = AU.read_wav(d["decoded"])
    ren, _ = AU.read_wav(d["rendered"])
    secs = len(x) / sr

    # 1. the track in the container
    ok("audio track: AAC stereo 48 kHz at about 128 kbps, as long as the video (Reels spec: AAC, <= 48 kHz)",
       pr.get("audio") == "aac " and pr.get("channels") == 2 and int(pr.get("sampleRate", 0)) == 48000 and 0 < pr.get("audioBitRate", 0) <= 170000
       and abs(pr.get("audioDuration", 0) - T) <= 0.1 and abs(secs - T) <= 0.1,
       "%s x%s %s Hz %.0f kbps, track %.2f s, decoded %.2f s, video %.2f s" % (pr.get("audio"), pr.get("channels"), pr.get("sampleRate"),
                                                                             pr.get("audioBitRate", 0) / 1000, pr.get("audioDuration", 0), secs, T))

    # 2. the decoded waveform is the rendered mix, in sync
    n = min(len(x), len(ren))
    a, b = x[:n].mean(axis=1), ren[:n].mean(axis=1)
    dec = 8                                                                     # correlate at 6 kHz: fast, 0.17 ms steps
    a8, b8 = a[: n // dec * dec].reshape(-1, dec).mean(axis=1), b[: n // dec * dec].reshape(-1, dec).mean(axis=1)
    cc = fftconvolve(a8, b8[::-1], mode="full")
    mid = len(b8) - 1
    span = int(0.25 * sr / dec)
    win = cc[mid - span: mid + span + 1]
    lag = (int(np.argmax(win)) - span) * dec / sr
    corr = float(win.max() / math.sqrt((a8 ** 2).sum() * (b8 ** 2).sum() + 1e-12))
    meas.update(syncLagMs=round(lag * 1000, 2), waveformCorrelation=round(corr, 4))
    ok("the MP4 carries the rendered soundtrack: decoded waveform matches the mix, offset under one frame",
       corr > 0.9 and abs(lag) < 1 / fps, "correlation %.3f, offset %.1f ms" % (corr, lag * 1000))

    # 3. the score and the effects, synchronized to the reel
    roles = {t["role"] for t in rep.get("tracks", [])}
    arc = rep.get("arc", [])
    ids = [s["id"] for s in arc]
    B = {b["id"]: b for b in d["beats"]}
    mom = [b for b in d["beats"] if b["id"].startswith("moment-")]
    M = d.get("marks") or {}
    want = [s for s in SECTIONS if s != "AHA" or M.get("aha")]
    contiguous = all(abs(arc[i]["t1"] - arc[i + 1]["t0"]) < 0.002 for i in range(len(arc) - 1)) and arc and arc[0]["t0"] == 0 and abs(arc[-1]["t1"] - T) < 0.05
    sync = (abs(next(s["t0"] for s in arc if s["id"] == "SIM_START") - mom[0]["t0"]) < 0.002
            and abs(next(s["t0"] for s in arc if s["id"] == "ANSWER") - B["answer"]["t0"]) < 0.002
            and abs(next(s["t0"] for s in arc if s["id"] == "BRAND") - B["payoff"]["t0"]) < 0.002
            and (not M.get("aha") or abs(next(s["t0"] for s in arc if s["id"] == "AHA") - M["aha"]["t0"]) < 0.002)
            and abs(rep["score"]["simStartDownbeat"] - mom[0]["t0"]) < 0.002)
    cues = rep.get("sfxCues", [])
    cues_ok = len(cues) >= 8 and all(0 <= c["t"] < T for c in cues)
    has_aha_cue = not M.get("aha") or any(abs(c["t"] - M["aha"]["t0"]) < 0.05 for c in cues)
    has_rev_cue = M.get("answer") and any(abs(c["t"] - M["answer"]["reveal"]) < 0.05 for c in cues)
    ok("music and sound effects present, synchronized: the arc " + " > ".join(want) + " follows the reel's beats; cues at the aha and the reveal",
       {"music", "sfx"} <= roles and [i for i in dict.fromkeys(ids)] == want and contiguous and sync and cues_ok and has_aha_cue and has_rev_cue,
       "%s; %d cues; downbeat %.3f s = simulation start %.3f s" % (" > ".join(ids), len(cues), rep["score"]["simStartDownbeat"], mom[0]["t0"]))

    # 4. provenance, re-checked against the library
    try:
        lib = AU.load_library()
        recs = [AU.check_asset(lib, t["assetId"], t["role"]) for t in rep.get("tracks", [])]
        prov = len(recs) >= 2 and all(r["licenseVerified"] and r["commercialUse"] for r in recs)
        pd = ", ".join("%s (%s, %s)" % (r["assetId"], r["source"], "verified" if r["licenseVerified"] else "UNVERIFIED") for r in recs)
    except AU.ProvenanceError as e:
        prov, pd = False, str(e)
    ok("every sound is licensed: PrayogX-generated or a verified licence for commercial Instagram use", prov, pd)

    # 5. no clipping
    peak = float(np.abs(x).max())
    tp = AU.true_peak_db(x)
    clipped = int((np.abs(x) >= 32766 / 32768).sum())
    meas.update(truePeakDbtp=round(tp, 2), samplePeakDbfs=round(20 * math.log10(max(peak, 1e-12)), 2), clippedSamples=clipped)
    ok("no clipping: decoded true peak <= -0.3 dBTP, no full-scale samples", tp <= -0.3 and clipped == 0,
       "true peak %.2f dBTP, sample peak %.2f dBFS, %d clipped" % (tp, 20 * math.log10(max(peak, 1e-12)), clipped))

    # 6. loudness
    L = AU.integrated_lufs(x)
    meas["integratedLufs"] = round(L, 2)
    ok("loudness -14 LUFS +- 1.5 (integrated, ITU-R BS.1770-4, on the decoded track)", abs(L - AU.TARGET_LUFS) <= 1.5, "%.2f LUFS" % L)

    # 7. no long silence before the fade-out
    r = short_rms_db(x, 0, T - 1.3, 0.1)
    quiet = r < -50
    run, longest, at = 0, 0, 0
    for i, q in enumerate(quiet):
        run = run + 1 if q else 0
        if run > longest:
            longest, at = run, i - run + 1
    meas["longestSilenceS"] = round(longest * 0.1, 2)
    ok("no dead air: no stretch over 1.0 s below -50 dBFS before the fade-out", longest * 0.1 <= 1.0,
       "longest %.1f s%s" % (longest * 0.1, " at %.1f s" % (at * 0.1) if longest else ""))

    # 8. fades and a clean end
    head = float(np.abs(x[: int(0.002 * sr)]).max()) if len(x) else 1
    tail = short_rms_db(x, T - 1 / fps, T, 1 / fps)
    before, last = short_rms_db(x, T - 2.4, T - 1.4, 0.4).max(), short_rms_db(x, T - 0.45, T - 0.05, 0.4).max()
    ok("clean start and end: fade in, a fade-out over the last second, a silent last frame",
       head < 0.05 and tail.max() < -60 and last < before - 6,
       "start %.3f, last frame %.0f dBFS, last 0.4 s %.1f dB under the outro" % (head, tail.max(), before - last))

    # 9. the aha and the answer reveal are heard
    def accent(t):
        hit = short_rms_db(x, t, t + 0.3).max()
        bed = np.median(short_rms_db(x, t - 1.6, t - 0.1))
        return hit - bed, hit
    acc = {}
    if M.get("aha"):
        acc["aha"] = accent(M["aha"]["t0"])
    if M.get("answer"):
        acc["reveal"] = accent(M["answer"]["reveal"])
    meas["accentsDb"] = {k: round(v[0], 1) for k, v in acc.items()}
    ok("the aha and the answer reveal land: each is at least 3 dB above the bed before it",
       "reveal" in acc and all(v[0] >= 3 for v in acc.values()),
       ", ".join("%s +%.1f dB" % (k, v[0]) for k, v in acc.items()))

    # 10. the music gives way to on-screen text
    dk, dd = ducking_check(rep)
    ok("ducking: the music dips under the question and the answer text (and under each effect)", dk, dd)
    # 11. the music itself: a composed, evolving track, measured on the music stem (before the effects and the mix)
    if d.get("music") and os.path.exists(d["music"]):
        mu, _ = AU.read_wav(d["music"])
        mv = musicality(mu, rep, d["beats"])
        meas["music"] = mv
        sc = rep.get("score") or {}
        ok("the music is composed and evolves: an energy arc (verse < groove, a breakdown on the aha, the drop the peak), "
           "a steady beat, the groove changing at the moments, a recurring hook, %d+ instruments" % MIN_INSTRUMENTS,
           mv["arc_ok"] and mv["beat"] >= 0.25 and mv["stageChanges"] >= mv["stagesExpected"] and mv["hookSections"] >= 3 and sc.get("instrumentCount", 0) >= MIN_INSTRUMENTS,
           "groove %.1f / verse %.1f / aha %.1f / drop %.1f LUFS, beat %.2f, %d of %d stage changes, hook in %d sections, %s instruments (%s, %s BPM)"
           % (mv["lufs"].get("SIM_START", -99), mv["lufs"].get("QUESTION", -99), mv["lufs"].get("AHA", -99), mv["lufs"].get("ANSWER", -99), mv["beat"],
              mv["stageChanges"], mv["stagesExpected"], mv["hookSections"], sc.get("instrumentCount"), sc.get("style"), sc.get("bpm")))
    else:
        ok("the music is composed and evolves (music stem)", False, "no music stem to measure")
    # 12. narrated reels only: the voice checks (a silent reel has no voice in its report and skips them)
    if (rep.get("mix") or {}).get("voice"):
        vc, vm = check_voice(d, rep)
        out.extend(vc)
        meas["voice"] = vm
    return {"checks": out, "measured": meas}


def ducking_check(rep):
    """(ok, detail): the music dips under the question (>= 4 dB) and the answer (>= 3 dB) text, and plays at least 3 dB louder
    in the simulation than under the question. On a narrated reel that last comparison uses the music level before the
    voice's own ducking (musicGainDbBySectionPreVoice), because the narration deliberately ducks the music while it speaks;
    the voice's margin over the music is checked separately (>= 6 LU). Silent reels use the original comparison."""
    g = rep["mix"]["musicGainDbBySection"]
    qd = min(v for k, v in g.items() if k.startswith("QUESTION@"))
    ad = min(v for k, v in g.items() if k.startswith("ANSWER@"))
    pre = rep["mix"].get("musicGainDbBySectionPreVoice") if rep["mix"].get("voice") else None
    sd = max(v for k, v in (pre or g).items() if k.startswith("SIM_START@"))
    detail = "music %.1f dB under the question, %.1f dB under the answer, %.1f dB in the simulation" % (qd, ad, sd)
    if pre:
        sd_now = max(v for k, v in g.items() if k.startswith("SIM_START@"))
        detail += " before the voice's ducking (%.1f dB with it)" % sd_now
    return qd <= -4 and ad <= -3 and sd > qd + 3, detail


VOICE_OVER_MUSIC_LU = 6.0      # the voice at least this far above the ducked music while it speaks
VOICE_IN_MIX_CORR = 0.5        # the final mix follows the voice while it speaks (it never vanishes in the mix)


def check_voice(d, rep):
    """the voice checks of a narrated reel: provenance, verification, hashes, presence, balance, format, timing,
    disclosure. Everything is re-read from the voice record and the stems, not trusted from the report."""
    import hashlib
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import narration as NA
    out, meas = [], {}
    ok = lambda name, cond, detail="": out.append({"name": "voice: " + name, "ok": bool(cond), "detail": str(detail)})
    v = rep["mix"]["voice"]
    nar = d.get("narration") or {}
    segs = nar.get("segments") or []
    ok("narration exists: a voice profile and at least one segment", bool(nar.get("voiceProfile")) and len(segs) > 0 and len(v.get("segments", [])) == len(segs),
       "%d narration segments, %d placed" % (len(segs), len(v.get("segments", []))))
    nv = NA.validate({"story": d.get("story") or {}, "narration": nar})
    ok("the voice profile and the narration are valid", nv["ok"], "; ".join(nv["errors"][:3]) or nar.get("voiceProfile"))
    try:
        a = AU.check_asset(AU.load_library(), v["assetId"], "voice")
        lic = a["licenseVerified"] and a["commercialUse"] and nar.get("voiceProfile") in (a.get("voiceProfiles") or [])
        ld = "%s (%s, %s)" % (a["assetId"], a["source"], a.get("qualificationStatus"))
    except AU.ProvenanceError as e:
        a, lic, ld = {}, False, str(e)
    ok("the voice asset is licensed for commercial use and lists this profile", lic, ld)
    try:
        rec = json.load(open(v["record"], encoding="utf-8"))
    except (OSError, ValueError) as e:
        rec = {}
        ok("the voice record can be read", False, str(e))
    ok("verification: the voice record and every segment are VERIFIED", rec.get("status") == "VERIFIED" and all(s.get("status") == "VERIFIED" for s in rec.get("segments", [])),
       "%s, %d segments" % (rec.get("status"), len(rec.get("segments", []))))
    sha = lambda p: AU.sha256_file(p) if os.path.isfile(p) else None  # noqa: E731
    bad = [s["beat"] for s in rec.get("segments", []) if sha(s["source"]["path"]) != s["source"]["sha256"] or sha(s["decoded"]["path"]) != s["decoded"]["sha256"]]
    ok("source and decoded audio match their recorded sha256", rec.get("segments") and not bad, "mismatch: " + ", ".join(bad) if bad else "all match")
    rh = {(s["beat"], s["spokenSha256"]) for s in rec.get("segments", [])}
    missing = [s["beat"] for s in segs if (s["beat"], hashlib.sha256(" ".join(s["spoken"].split()).encode("utf-8")).hexdigest()) not in rh]
    ok("every spoken form matches its verified record (spoken-form sha256)", segs and not missing, "no record for: " + ", ".join(missing) if missing else "all match")
    vx, sr = AU.read_wav(d["voice"])
    mx, _ = AU.read_wav(d["rendered"])
    mb, _ = AU.read_wav(d["musicBed"])
    quiet, corr, margin = [], [], []
    for p in v["segments"]:
        a0, a1 = int(p["t0"] * sr), int(p["t1"] * sr)
        lv = short_rms_db(vx, p["t0"], p["t1"], 0.4)
        if lv.max() < -40:
            quiet.append(p["beat"])
        vm, mm = vx[a0:a1].mean(axis=1), mx[a0:a1].mean(axis=1)
        corr.append(float(np.dot(vm, mm) / math.sqrt((vm ** 2).sum() * (mm ** 2).sum() + 1e-12)))
        tb, Lv = AU.block_loudness(vx[a0:a1]); _, Lm = AU.block_loudness(mb[a0:a1])
        act = Lv > -50
        margin.append(float(np.median(Lv[act] - Lm[act])) if act.any() else -99.0)
    meas.update(voiceInMixCorrelation=[round(c, 3) for c in corr], voiceOverMusicLu=[round(m, 1) for m in margin])
    ok("every narrated beat has voice (above -40 dBFS in its window)", not quiet, "silent: " + ", ".join(quiet) if quiet else "%d segments" % len(v["segments"]))
    ok("the voice does not vanish in the mix: the final mix follows the voice (correlation >= %.1f)" % VOICE_IN_MIX_CORR, corr and min(corr) >= VOICE_IN_MIX_CORR,
       "correlation " + ", ".join("%.2f" % c for c in corr))
    ok("the music sits at least %.0f LU under the voice while it speaks" % VOICE_OVER_MUSIC_LU, margin and min(margin) >= VOICE_OVER_MUSIC_LU,
       "voice over music " + ", ".join("%.1f LU" % m for m in margin))
    with wave.open(d["voice"], "rb") as w:
        vfmt = (w.getframerate(), w.getnchannels(), w.getsampwidth())
    ok("the voice stem is 48 kHz stereo 16-bit", vfmt == (48000, 2, 2), "%s Hz, %s ch, %s-bit" % (vfmt[0], vfmt[1], 8 * vfmt[2]))
    by = {(s["beat"], s["spokenSha256"]): s for s in rec.get("segments", [])}
    stretch = [p["beat"] for p in v["segments"] if abs(p["seconds"] - by.get((p["beat"], p["spokenSha256"]), {}).get("decoded", {}).get("seconds", -1)) > 0.002
               or abs(p["samples"] / 48000.0 - p["seconds"]) > 0.0001]
    ok("no time-stretching: every placed segment keeps its verified duration", v["segments"] and not stretch, "changed: " + ", ".join(stretch) if stretch else "all durations unchanged")
    ok("AI-voice disclosure metadata comes from the voice asset", bool(v.get("disclosureText")) and v.get("disclosureText") == a.get("disclosureText") and v.get("aiNarration") is True,
       v.get("disclosureText"))
    return out, meas


MIN_INSTRUMENTS = 10


def _stage_features(x, t0, t1, spb):
    from scipy.signal import stft
    m = x[int(t0 * AU.SR):int(t1 * AU.SR)].mean(axis=1)
    f, t, Z = stft(m, AU.SR, nperseg=4096, noverlap=3072)
    S = np.abs(Z)
    be = np.array([S[(f >= a) & (f < b)].sum() for a, b in ((20, 120), (120, 500), (500, 2000), (2000, 6000), (6000, 20000))])
    be = be / (be.sum() + 1e-12)
    flux = np.maximum(0, np.diff(np.log1p(S * 100), axis=1)).sum(axis=0)
    st = np.zeros(16)
    for v, tt in zip(flux, t[1:]):
        st[int((tt % (4 * spb)) / (spb / 4)) % 16] += v
    return np.concatenate([2 * be, st / (st.sum() + 1e-12)]), flux, t[1:]


def musicality(x, rep, beats):
    """the music stem's arc, beat and evolution"""
    sc = rep.get("score") or {}
    spb = 60.0 / sc.get("bpm", 120)
    tb, L = AU.block_loudness(x)
    lu = {}
    for s in rep["arc"]:
        sel = (tb >= s["t0"]) & (tb + 0.4 <= s["t1"])
        if sel.any() and s["id"] not in lu:
            lu[s["id"]] = float(np.median(L[sel]))
    g = lu.get("SIM_START", -99)
    arc_ok = (lu.get("QUESTION", -99) < g - 1 and lu.get("ANSWER", -99) >= g - 1.5
              and ("AHA" not in lu or lu["AHA"] <= g - 3) and lu.get("BRAND", -99) < lu.get("ANSWER", -99))
    sim = next(s for s in rep["arc"] if s["id"] == "SIM_START")
    _, flux, ft = _stage_features(x, sim["t0"], sim["t1"], spb)
    fr = 1 / (ft[1] - ft[0]) if len(ft) > 1 else 1
    fz = flux - flux.mean()
    ac = np.correlate(fz, fz, "full")[len(fz) - 1:]
    lag = int(round(spb * fr))
    beat = float(ac[lag - 1:lag + 2].max() / (ac[0] + 1e-12)) if 0 < lag < len(ac) - 2 else 0.0
    V = sc.get("grooveVariations") or []
    F = [_stage_features(x, v["t0"] + 0.25, v["t1"] - 0.25, spb)[0] for v in V if v["t1"] - v["t0"] > 1.0]
    changes = sum(1 for i in range(len(F) - 1) if np.linalg.norm(F[i] - F[i + 1]) >= 0.05)
    hook = len({a["label"].split(" ")[0] for a in sc.get("arrangement", []) if a.get("motif")})
    return {"lufs": {k: round(v, 1) for k, v in lu.items()}, "arc_ok": bool(arc_ok), "beat": round(beat, 2), "stageChanges": changes,
            "stagesExpected": max(0, len(F) - 1), "hookSections": hook}


if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8") as f:
        print(json.dumps(check(json.load(f))))
