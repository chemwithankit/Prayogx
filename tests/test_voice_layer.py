#!/usr/bin/env python3
"""The voice layer, Phase 2A: local verification (voice_verify.py), the voice stem gate (audio.py) and the voice checks
(audio_check.py), with fakes only.

No provider, no network, no credentials, no credits. Transcripts are fake whisper.cpp JSON, audio is synthetic tones
in a temporary directory, and licences are temporary fixtures; the real repository files are only read. Sections:
A comparison and equivalences, B the voice record, C the mixer gate, D the mix and its format, E the voice checks,
F disclosure and silent reels, G no provider calls. Z (opt-in, RUN_VOICE_INTEGRATION=1) re-runs the real Media Lab
sample through whisper.cpp and the full mixer on this Mac.

Run:  python3 tests/test_voice_layer.py
"""
import copy
import hashlib
import json
import math
import os
import re
import shutil
import sys
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RM = os.path.join(ROOT, "tools", "reel-maker")
sys.path.insert(0, RM)
import audio as AU  # noqa: E402
import audio_check as AC  # noqa: E402
import voice_verify as VV  # noqa: E402

ok, fail = [], []
TABLE = VV.load_equivalences()


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or not detail else "  -> " + str(detail)))


def wj(words, p=None):
    """a fake whisper.cpp -ojf transcript: each word one token (' word'), 0.4 s apart, p 0.95 unless given"""
    toks = [{"text": "[_BEG_]", "offsets": {"from": 0, "to": 0}, "p": 1.0}]
    for i, w in enumerate(words.split()):
        toks.append({"text": " " + w, "offsets": {"from": 400 * i, "to": 400 * i + 350}, "p": (p or {}).get(i, 0.95)})
    return {"transcription": [{"tokens": toks}]}


def tone(path, seconds, sr=44100, ch=1, freq=220.0, amp=0.3):
    n = int(round(seconds * sr))
    t = np.arange(n) / sr
    x = amp * np.sin(2 * np.pi * freq * t) * (1 + 0.5 * np.sin(2 * np.pi * 3 * t))       # a speech-like modulated tone
    pcm = np.round(np.clip(np.repeat(x[:, None], ch, axis=1), -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
    return path


TMP = tempfile.mkdtemp(prefix="voicelayer-")
LICENCE = os.path.join(TMP, "licence.md")
open(LICENCE, "w").write("test licence\n")
DISC = "Narration: test disclosure line."
ASSET = {"assetId": "voice-fake", "role": "voice", "source": "external-tts", "provider": "fakeprov", "model": "fake-1",
         "voiceProfiles": ["test-voice"], "license": "test", "licenseDocument": "licence.md", "licenseVerified": True,
         "sourceReference": "test", "permittedUse": ["instagram", "youtube"], "commercialUse": True, "attributionRequired": False,
         "attributionText": "", "disclosureRequired": True, "disclosureText": DISC, "qualificationStatus": "provisional"}
LIB = {"voice-fake": ASSET}
PROFILES = {"test-voice": {"profileId": "test-voice", "status": "provisional", "provider": "fakeprov", "model": "fake-1", "voiceId": "v1",
                           "voiceName": "Testa", "language": "en", "libraryAsset": "voice-fake"}}
SPOKEN = "K p equals K c multiplied by R T"


def make_record(name, spoken=SPOKEN, heard=None, seconds=2.0, beat="moment-A", offset=0.3, deliberate=False, sr=44100):
    """a voice record built by voice_verify.build_record with a fake transcriber and a fake decoder (a synthetic tone)"""
    out = os.path.join(TMP, name)
    os.makedirs(out, exist_ok=True)
    src = tone(os.path.join(out, "source.wav"), seconds, sr=sr)
    fake_tx = lambda audio, work: (wj(heard if heard is not None else spoken), {"engine": "fake", "model": "fake", "flags": "-"})  # noqa: E731

    def fake_dec(s, dst):
        shutil.copy(s, dst)
        with wave.open(dst, "rb") as w:
            return {"path": os.path.abspath(dst), "sha256": VV.sha256_file(dst), "sampleRate": w.getframerate(), "channels": w.getnchannels(),
                    "frames": w.getnframes(), "seconds": round(w.getnframes() / w.getframerate(), 6)}
    rec = VV.build_record("test-voice", [{"beat": beat, "spoken": spoken, "source": src, "offset": offset, "jobId": "job-" + name,
                                          "createdAt": "2026-10-03T00:00:00Z", "deliberate": deliberate}], out,
                          profiles=PROFILES, library=LIB, transcriber=fake_tx, decoder=fake_dec)
    return rec, os.path.join(out, "voice.json")


def plan_for(record_path, spoken=SPOKEN, beat="moment-A", beats=None, marks=None):
    return {"beats": beats or [{"id": "hook", "t0": 0.0, "dur": 2.0}, {"id": "moment-A", "t0": 2.0, "dur": 4.0}, {"id": "answer", "t0": 6.0, "dur": 4.0}],
            "marks": marks or {"answer": {"t0": 6.0, "t1": 10.0, "reveal": 7.0}},
            "voice": {"record": record_path, "narration": {"voiceProfile": "test-voice", "segments": [{"beat": beat, "text": "Kp = Kc(RT)^Δn", "spoken": spoken}]}}}


def stem(plan, n=int(10 * 48000)):
    return AU.voice_stem(plan, n, LIB, root=TMP)


def raises(fn, *a):
    try:
        fn(*a)
    except AU.VoiceError as e:
        return str(e)
    except AU.ProvenanceError as e:
        return "PROVENANCE: " + str(e)
    return None


def main():
    # ============================================================ A. comparison and the declared equivalences
    r = VV.compare(SPOKEN, wj(SPOKEN), TABLE)
    chk("A1 an exact match is VERIFIED with no differences and no equivalence", r["status"] == "VERIFIED" and r["wordErrorRate"] == 0 and r["equivalencesApplied"] == [], r)
    r = VV.compare("K p equals ninety-six thousand four hundred eighty-five, delta G naught, H plus", wj("Kp equals 96,485, delta G0, H+"), TABLE)
    chk("A2 approved equivalences (Kp, 96,485, G0, H+) pass and each is listed", r["status"] == "VERIFIED" and len(r["equivalencesApplied"]) == 4
        and all("(v%s)" % TABLE["version"] in e["rule"] for e in r["equivalencesApplied"]), r["equivalencesApplied"])
    r = VV.compare("K p equals K c", wj("Kq equals Kc"), TABLE)
    chk("A3 an unapproved spelling (Kq) is a failure, never normalized", r["status"] == "FAILED" and (r["substituted"] or r["missing"] or r["added"]), r)
    r = VV.compare("K p equals K c", wj("Kc equals Kc"), TABLE)
    chk("A4 an equivalence only stands for its own words: 'Kc' where 'K p' is expected fails", r["status"] == "FAILED", r)
    r = VV.compare("the current can still be one ampere", wj("the current can be 1 ampere"), TABLE)
    chk("A5 a missing word fails and is named", r["status"] == "FAILED" and [m["expected"] for m in r["missing"]] == ["still"], r["missing"])
    r = VV.compare("the current is one ampere", wj("the current is really 1 ampere"), TABLE)
    chk("A6 an added word fails and is named", r["status"] == "FAILED" and [a["heard"] for a in r["added"]] == ["really"], r["added"])
    r = VV.compare("the field makes the electrons drift", wj("the field makes the the electrons drift"), TABLE)
    chk("A7 a repeated word fails and is reported as a repetition", r["status"] == "FAILED" and [x["heard"] for x in r["repeated"]] == ["the"], r)
    r = VV.compare("delta n is zero", wj("zero is delta n"), TABLE)
    chk("A8 reordered words fail and are reported as reordered", r["status"] == "FAILED" and r["reordered"], r)
    r = VV.compare(SPOKEN, wj("Kp equals Kc multiplied by RT", p={0: 0.21}), TABLE)
    chk("A9 a low word probability is a listening flag with its timestamp, not a failure", r["status"] == "VERIFIED" and r["listeningFlags"] == [{"word": "Kp", "p": 0.21, "at_s": 0.0, "flag": "listen"}], r["listeningFlags"])
    chk("A10 the integer rule is exact: 96,485 / 1 / 0 / 115 / 1000 / 999999 in words",
        [VV.int_words(x) for x in (96485, 1, 0, 115, 1000, 999999)] == ["ninety-six thousand four hundred eighty-five", "one", "zero", "one hundred fifteen", "one thousand",
                                                                       "nine hundred ninety-nine thousand nine hundred ninety-nine"])
    r = VV.compare("ninety-five thousand", wj("96,000"), TABLE)
    chk("A11 a number with a different value fails (the rule never equates values)", r["status"] == "FAILED", r)
    chk("A12 the equivalence table is versioned and small: observed tokens, exact integer and decimal rules, the reviewed spelling pair (v5)",
        TABLE["version"] == 5 and (TABLE.get("decimals") or {}).get("enabled") and set(TABLE["tokens"]) == {"kp", "kc", "rt", "h2so4", "g0", "h0", "s0", "e0", "h+", "oh-", "oh", "qv", "w0"} and TABLE["integers"]["enabled"]
        and TABLE["spelling"]["canonical"] == {"millimeter": "millimetre", "millimeters": "millimetres"})
    r = VV.compare("a fifth of a millimetre per second", wj("a fifth of a millimeter per second"), TABLE)
    chk("A14 spelling: the reviewed millimetre / millimeter pair passes and the transcript respelling is listed",
        r["status"] == "VERIFIED" and [e["rule"] for e in r["equivalencesApplied"]] == ['spelling "millimeter" -> "millimetre" (v5)'], r["equivalencesApplied"])
    r = VV.compare("a fifth of a millimeter per second", wj("two millimetres"), TABLE)
    chk("A15 spelling works both ways, and an American-spelled script's respelling is listed too (never silent)",
        VV.compare("a fifth of a millimeter per second", wj("a fifth of a millimetre per second"), TABLE)["expectedRespelled"][0]["rule"] == 'spelling "millimeter" -> "millimetre" (v5)')
    r = VV.compare("a fifth of a millimetre per second", wj("a fifth of a meter per second"), TABLE)
    chk("A16 the spelling rule never equates different words: 'meter' for 'millimetre' fails", r["status"] == "FAILED" and r["substituted"], r)
    sp = "a fifth of a millimetre per second"
    VV.compare(sp, wj("a fifth of a millimeter per second"), TABLE)
    chk("A17 the authored spoken text is never changed by the rule (and its hash is computed from the authored text)",
        sp == "a fifth of a millimetre per second" and VV.spoken_sha256(sp) != VV.spoken_sha256("a fifth of a millimeter per second"))
    ANS = "So the drift velocity is about zero point two one millimetres per second — that's option C."
    r = VV.compare(ANS, wj("So the drift velocity is about 0.21 millimeters per second, that's option C."), TABLE)
    chk("A18 decimal: 'zero point two one' <-> 0.21 passes, and both the decimal and the spelling rule are listed (v5)",
        r["status"] == "VERIFIED" and [e["rule"] for e in r["equivalencesApplied"]] == ['decimal "0.21" -> "zero point two one" (v5)', 'spelling "millimeters" -> "millimetres" (v5)'],
        r["equivalencesApplied"])
    chk("A19 decimal: 'zero point two one' <-> 0.20 fails (a different value)", VV.compare("zero point two one", wj("0.20"), TABLE)["status"] == "FAILED")
    chk("A20 decimal: 'zero point two one' <-> 0.201 fails (an extra digit)", VV.compare("zero point two one", wj("0.201"), TABLE)["status"] == "FAILED")
    chk("A21 decimal: 'zero point twenty-one' <-> 0.21 fails (digits must be read one by one)", VV.compare("zero point twenty-one", wj("0.21"), TABLE)["status"] == "FAILED")
    chk("A22 decimal: an unrelated decimal fails (0.12, 1.21, 2.1)", all(VV.compare("zero point two one", wj(x), TABLE)["status"] == "FAILED" for x in ("0.12", "1.21", "2.1")))
    chk("A23 decimal: the authored spoken text is unchanged and its hash comes from the authored words",
        ANS.endswith("that's option C.") and VV.spoken_sha256(ANS) != VV.spoken_sha256(ANS.replace("zero point two one", "0.21")))
    r = VV.compare(SPOKEN, wj(SPOKEN), TABLE)
    chk("A13 the result keeps the expected spoken form, raw and normalized transcripts and every difference list",
        set(r) >= {"expectedSpoken", "rawTranscript", "normalizedTranscript", "equivalencesApplied", "missing", "added", "substituted", "repeated", "reordered", "listeningFlags", "status"})

    # ============================================================ B. the voice record (provenance)
    rec, rp = make_record("good")
    s = rec["segments"][0]
    chk("B1 a passing segment makes a VERIFIED record", rec["status"] == "VERIFIED" and s["status"] == "VERIFIED")
    chk("B2 the record keeps provenance: asset, profile, provider, model, job ID, source and decoded sha256, spoken-form sha256, verifier and table versions",
        rec["assetId"] == "voice-fake" and rec["voiceProfile"] == "test-voice" and s["source"]["provider"] == "fakeprov" and s["source"]["model"] == "fake-1"
        and s["source"]["jobId"] == "job-good" and len(s["source"]["sha256"]) == 64 and len(s["decoded"]["sha256"]) == 64
        and s["spokenSha256"] == hashlib.sha256(SPOKEN.encode()).hexdigest() and rec["verifier"]["version"] == VV.VERIFIER
        and rec["verifier"]["equivalenceVersion"] == TABLE["version"] and rec["qualificationStatus"] == "provisional" and rec["verifiedAt"])
    bad, _ = make_record("bad", heard="K q equals K c multiplied by R T")
    chk("B3 a failing segment makes a FAILED record", bad["status"] == "FAILED" and bad["segments"][0]["verification"]["substituted"], bad["segments"][0]["verification"]["substituted"])
    chk("B4 the spoken-form hash ignores line breaks only", VV.spoken_sha256("a b\nc") == VV.spoken_sha256("a  b c") != VV.spoken_sha256("a b d"))

    # ============================================================ C. the mixer gate (audio.voice_stem)
    st, info, asset = stem(plan_for(rp))
    chk("C1 a VERIFIED record enters the mix as a stereo stem at its beat (t0 + offset)", st.shape == (480000, 2) and info["segments"][0]["t0"] == 2.3
        and np.abs(st[: int(2.29 * 48000)]).max() == 0 and np.abs(st[int(2.4 * 48000): int(4.0 * 48000)]).max() > 0, info["segments"])
    chk("C2 the voice is normalized to the voice target loudness", abs(AU.integrated_lufs(st[int(2.3 * 48000): int(4.3 * 48000)]) - AU.VOICE_TARGET_LUFS) < 0.5)
    chk("C3 no time-stretching: 2.0 s at 44.1 kHz becomes exactly 96000 samples at 48 kHz", info["segments"][0]["samples"] == 96000 and info["segments"][0]["seconds"] == 2.0)
    chk("C4 a FAILED record is refused", "not VERIFIED" in (raises(stem, plan_for(os.path.join(TMP, "bad", "voice.json"), spoken="K p equals K c multiplied by R T")) or ""))
    _, rp2 = make_record("tamper")
    with open(json.load(open(rp2))["segments"][0]["decoded"]["path"], "r+b") as f:
        f.seek(2000); f.write(b"\x01\x02\x03\x04")
    chk("C5 a decoded file that changed after verification is refused (sha256 mismatch)", "sha256 does not match" in (raises(stem, plan_for(rp2)) or ""))
    chk("C6 a spoken form that differs from the verified one is refused (spoken-form hash mismatch)", "hash mismatch" in (raises(stem, plan_for(rp, spoken=SPOKEN + " today")) or ""))
    lib_nodisc = {"voice-fake": dict(ASSET, disclosureText="")}
    chk("C7 a voice asset without disclosureText is refused", "disclosureText" in (raises(AU.voice_stem, plan_for(rp), 480000, lib_nodisc, TMP) or ""))
    lib_unlic = {"voice-fake": dict(ASSET, licenseVerified=False)}
    chk("C8 an unlicensed voice asset is refused", "licence not verified" in (raises(AU.voice_stem, plan_for(rp), 480000, lib_unlic, TMP) or ""))
    _, rp3 = make_record("long", seconds=3.9)
    chk("C9 a segment longer than its beat window fails with the time it needs (never cut or stretched)",
        "does not fit its beat" in (raises(stem, plan_for(rp3)) or "") and "needs 0.20 s more" in (raises(stem, plan_for(rp3)) or ""), raises(stem, plan_for(rp3)))
    _, rp4 = make_record("reveal", beat="answer", seconds=1.0)
    chk("C10 narration over the answer reveal is refused unless marked deliberate", "covers the answer reveal" in (raises(stem, plan_for(rp4, beat="answer")) or ""))
    _, rp5 = make_record("reveal-ok", beat="answer", seconds=1.0, deliberate=True)
    chk("C11 a segment marked deliberate may cover a protected moment", raises(stem, plan_for(rp5, beat="answer")) is None)
    pl = plan_for(rp); pl["voice"]["narration"]["voiceProfile"] = "other-voice"
    chk("C12 the story's voice profile must be the verified one", "not the verified one" in (raises(stem, pl) or ""))
    _, rp6 = make_record("rate48", sr=48000)
    st6, info6, _ = stem(plan_for(rp6))
    chk("C13 48 kHz audio enters unchanged in length; mono becomes stereo", info6["segments"][0]["samples"] == 96000 and np.allclose(st6[:, 0], st6[:, 1]))

    # ============================================================ D. the mix and its format (existing audio.mix, VOICE > MUSIC > SFX)
    n = 480000
    t = np.arange(n) / 48000
    music = np.repeat((0.3 * np.sin(2 * np.pi * 110 * t))[:, None], 2, axis=1)
    sfx = np.zeros((n, 2)); sfx[int(8 * 48000): int(8.2 * 48000)] = 0.5
    p = plan_for(rp); p["beats"] = [{"id": "question", "t0": 0.0, "dur": 1.0}, {"id": "problem", "t0": 1.0, "dur": 0.5}, {"id": "curiosity", "t0": 1.5, "dur": 0.5},
                                    {"id": "moment-A", "t0": 2.0, "dur": 4.0}, {"id": "answer", "t0": 6.0, "dur": 3.0}, {"id": "payoff", "t0": 9.0, "dur": 1.0}]
    mixed, auto = AU.mix(p, music, sfx, st)
    g = auto["musicGainDb"]
    chk("D1 VOICE > MUSIC: the music ducks under the voice (about -10 dB while it speaks)", g[int(3.0 * 48000)] < -8 and g[int(5.9 * 48000)] > g[int(3.0 * 48000)] + 6, (g[int(3.0 * 48000)], g[int(5.9 * 48000)]))
    _, auto0 = AU.mix(p, music, sfx, None)
    chk("D2 without a voice the mix is the existing silent mix (music not ducked by voice)", auto0["musicGainDb"][int(3.0 * 48000)] > -1, auto0["musicGainDb"][int(3.0 * 48000)])
    final = AU.master(mixed)
    s_ = AU.stats(final)
    chk("D3 the existing mastering still holds: -14 LUFS +- 0.3, true peak <= -1 dBTP, no clipping", abs(s_["integratedLufs"] + 14) < 0.3 and s_["truePeakDbtp"] <= -0.99 and s_["clippedSamples"] == 0, s_)
    vp = os.path.join(TMP, "voice.wav"); AU.write_wav(vp, st)
    with wave.open(vp, "rb") as w:
        fmt = (w.getframerate(), w.getnchannels(), w.getsampwidth())
    chk("D4 the voice stem is written as 48 kHz stereo 16-bit", fmt == (48000, 2, 2), fmt)

    # ============================================================ E. the voice checks (audio_check.check_voice)
    mp, bp_ = os.path.join(TMP, "mix.wav"), os.path.join(TMP, "bed.wav")
    AU.write_wav(mp, final); AU.write_wav(bp_, music * (10 ** (auto["musicGainDb"] / 20))[:, None])
    rep = {"mix": {"voice": info}}
    narr = p["voice"]["narration"]
    saved = AU.load_library
    AU.load_library = lambda path=None: LIB
    real_check = AU.check_asset
    AU.check_asset = lambda lib, aid, role, root=TMP: real_check(lib, aid, role, TMP)
    import narration as NA
    real_val = NA.validate
    NA.validate = lambda spec, profiles=None, library=None: real_val(spec, PROFILES, LIB)
    try:
        d = {"voice": vp, "rendered": mp, "musicBed": bp_, "narration": narr, "story": {"moments": [{"id": "A"}]}}
        checks, meas = AC.check_voice(d, rep)
        failed = [c["name"] + ": " + c["detail"] for c in checks if not c["ok"]]
        chk("E1 the 12 voice checks pass on a verified, well-mixed voice", len(checks) == 12 and not failed, failed)
        quiet = os.path.join(TMP, "quiet.wav"); AU.write_wav(quiet, st * 0.001)
        c2, _ = AC.check_voice(dict(d, voice=quiet), rep)
        chk("E2 a voice that is missing from its beat fails the presence check", not next(c for c in c2 if "every narrated beat has voice" in c["name"])["ok"])
        loud = os.path.join(TMP, "loudbed.wav"); AU.write_wav(loud, music * 3)
        c3, _ = AC.check_voice(dict(d, musicBed=loud), rep)
        chk("E3 music too close to the voice fails the balance check", not next(c for c in c3 if "under the voice" in c["name"])["ok"])
        nomix = os.path.join(TMP, "nomix.wav"); AU.write_wav(nomix, AU.master(music + sfx))
        c4, _ = AC.check_voice(dict(d, rendered=nomix), rep)
        chk("E4 a mix that lost the voice fails the vanishing check", not next(c for c in c4 if "does not vanish" in c["name"])["ok"])
        rep5 = {"mix": {"voice": dict(info, segments=[dict(info["segments"][0], samples=info["segments"][0]["samples"] + 4800)])}}
        c5, _ = AC.check_voice(d, rep5)
        chk("E5 a placed segment whose length changed fails the no-time-stretch check", not next(c for c in c5 if "time-stretching" in c["name"])["ok"])
        rep6 = {"mix": {"voice": dict(info, disclosureText="")}}
        c6, _ = AC.check_voice(d, rep6)
        chk("E6 missing disclosure metadata fails", not next(c for c in c6 if "disclosure" in c["name"])["ok"])
    finally:
        AU.load_library, AU.check_asset, NA.validate = saved, real_check, real_val

    # ============================================================ F. disclosure and silent reels
    gr = open(os.path.join(RM, "generate-reel.js"), encoding="utf-8").read()
    vj = open(os.path.join(RM, "validate.js"), encoding="utf-8").read()
    cx = open(os.path.join(RM, "context.js"), encoding="utf-8").read()   # the caption lives in context.js (captionText), shared by both kinds
    chk("F1 the caption adds the voice asset's disclosure only when the reel has a voice (from audio.py's report, never a literal)",
        "voice && voice.disclosureText ? ['', voice.disclosureText] : []" in cx and "captionText(spec, entry, ctx, (audioRep.mix || {}).voice)" in gr)
    chk("F2 validate.js checks the disclosure word for word, for narrated reels only", "if (VO) ok('caption: the AI-voice disclosure line" in vj and "ct.indexOf(VO.disclosureText) >= 0" in vj)
    code = "".join(open(os.path.join(RM, f), encoding="utf-8").read() for f in ("audio.py", "audio_check.py", "generate-reel.js", "context.js", "validate.js", "voice_verify.py", "narration.py"))
    chk("F3 the disclosure string appears in no code file (it lives once, in audio_library.json)", "AI-generated voice reading a script" not in code)
    chk("F4 reel.json records aiNarration for the publishers' synthetic-media disclosure", "aiNarration: !!(audioRep.mix || {}).voice" in gr)
    ac = open(os.path.join(RM, "audio_check.py"), encoding="utf-8").read()
    chk("F5 silent reels skip every voice check (they run only when the report has a voice)", "if (rep.get(\"mix\") or {}).get(\"voice\"):" in ac)
    src = open(os.path.join(RM, "audio.py"), encoding="utf-8").read()
    chk("F6 silent reels take the old mix path: no voice in the plan -> mix(plan, music, sfx, None) and no voice files",
        "if plan.get(\"voice\"):" in src and "mix(plan, music, sfx, voice)" in src and "voice, vinfo = None, None" in src)
    chk("F7 a narrated build needs a VERIFIED voice record and never generates voice itself (Phase 2B guard)", "vr.status !== 'VERIFIED'" in gr and "the build never generates voice" in gr)

    # ============================================================ G. no provider calls, no spending, no publishing
    v_src = open(os.path.join(RM, "voice_verify.py"), encoding="utf-8").read()
    hits = [w for w in ("urllib", "requests", "http.client", "socket", "higgsfield", "elevenlabs", "instagram_publish", "youtube_publish") if w in v_src.lower()]
    cmds = set(re.findall(r'subprocess\.run\(\[\s*"?([a-z_]+)', v_src))
    chk("G1 the verifier calls no provider or network; its only commands are afconvert and the local whisper.cpp binary", hits == [] and cmds <= {"afconvert", "whisper_bin"}, (hits, cmds))
    chk("G2 audio.py and audio_check.py name no provider or voice", not re.search(r"higgsfield|elevenlabs|emily", open(os.path.join(RM, "audio.py")).read() + ac, re.I))

    # ============================================================ Q. the narrated music QA fix and one-narrator timing
    def rep_(g, pre=None, voice=True):
        m = {"musicGainDbBySection": g, "voice": {"segments": []} if voice else None}
        if pre is not None:
            m["musicGainDbBySectionPreVoice"] = pre
        return {"mix": m}
    silent_g = {"QUESTION@4": -6.0, "ANSWER@29": -5.0, "SIM_START@14": 0.0}
    narr_g = {"QUESTION@4": -6.0, "ANSWER@29": -5.0, "SIM_START@14": -10.0}
    okq, _ = AC.ducking_check(rep_(silent_g, voice=False))
    chk("Q1 silent reels keep the original music rule (simulation louder than under the question)", okq)
    bad_silent, _ = AC.ducking_check(rep_(narr_g, voice=False))
    chk("Q2 a silent reel with music ducked in the simulation still fails, even if a pre-voice field were present", not bad_silent
        and not AC.ducking_check(rep_(narr_g, pre=silent_g, voice=False))[0])
    okn, dn = AC.ducking_check(rep_(narr_g, pre=silent_g))
    chk("Q3 a narrated reel is judged on the music before the voice's ducking, and the detail shows both levels", okn and "before the voice's ducking" in dn, dn)
    chk("Q4 a narrated report without the pre-voice field falls back to the strict comparison (fails, never silently passes)", not AC.ducking_check(rep_(narr_g))[0])
    chk("Q5 a genuinely bad narrated mix still fails: music not louder in the simulation even before voice ducking",
        not AC.ducking_check(rep_(narr_g, pre=dict(silent_g, **{"SIM_START@14": -5.0})))[0])
    chk("Q6 the question and answer text ducking rules are unchanged on narrated reels",
        not AC.ducking_check(rep_(dict(narr_g, **{"QUESTION@4": -2.0}), pre=dict(silent_g, **{"QUESTION@4": -2.0})))[0]
        and not AC.ducking_check(rep_(dict(narr_g, **{"ANSWER@29": -1.0}), pre=silent_g))[0])
    m_, a_ = AU.mix(p, music, sfx, st)
    m0, a0 = AU.mix(p, music, sfx, None)
    chk("Q7 the mix's pre-voice music gain equals the silent mix's gain, and adding the field changed no audio",
        np.allclose(a_["musicGainDbPreVoice"], a0["musicGainDb"]) and np.array_equal(m0, AU.mix(p, music, sfx, None)[0]))
    _, rpa = make_record("ovl-a", seconds=3.0, beat="moment-A", offset=0.3)
    plan_o = plan_for(rpa)
    plan_o["beats"] = [{"id": "hook", "t0": 0.0, "dur": 2.0}, {"id": "moment-A", "t0": 2.0, "dur": 6.0}, {"id": "answer", "t0": 8.0, "dur": 2.0}]
    plan_o["marks"] = {"answer": {"t0": 8.0, "t1": 10.0, "reveal": 8.5}}            # both lines fit the beat; only the overlap remains
    rec_o = json.load(open(rpa))
    seg2 = copy.deepcopy(rec_o["segments"][0]); seg2.update(index=2, offset=2.0, spokenSha256=VV.spoken_sha256(SPOKEN + " again"))
    rec_o["segments"].append(seg2)
    json.dump(rec_o, open(rpa, "w"))
    plan_o["voice"]["narration"]["segments"].append({"beat": "moment-A", "text": "x", "spoken": SPOKEN + " again", "offset": 2.0})
    chk("Q8 two narration lines that would talk over each other are refused (one narrator)", "overlap" in (raises(stem, plan_o) or ""), raises(stem, plan_o))

    # ============================================================ Z. the real Media Lab sample (opt-in, this Mac only)
    if os.environ.get("RUN_VOICE_INTEGRATION") == "1":
        rec_p = os.path.join(RM, "output", "_voice-fixture-T1", "voice.json")
        plan_p = os.path.join(RM, "output", "_voice-fixture-T1", "mix", "fixture-plan.json")
        if os.path.exists(rec_p) and os.path.exists(plan_p):
            real = json.load(open(rec_p))
            chk("Z1 the existing Emily sample's record is VERIFIED (19 declared equivalences, 2 listening flags, 0 errors)",
                real["status"] == "VERIFIED" and len(real["segments"][0]["verification"]["equivalencesApplied"]) == 19 and real["segments"][0]["verification"]["wordErrorRate"] == 0)
            cwd = os.getcwd(); os.chdir(RM)
            try:
                plan = json.load(open(plan_p))
                outd = os.path.join(TMP, "z"); os.makedirs(outd)
                rep = AU.render(plan, os.path.join(outd, "audio.wav"), music_out=os.path.join(outd, "music.wav"))
                st_ = rep["stats"]
                chk("Z2 the verified sample passes through the existing mixer and mastering (-14 LUFS, <= -1 dBTP, no clipping)",
                    abs(st_["integratedLufs"] + 14) <= 0.3 and st_["truePeakDbtp"] <= -0.99 and st_["clippedSamples"] == 0, st_)
                narr = plan["voice"]["narration"]
                moments = [{"id": b["id"][7:]} for b in plan["beats"] if b["id"].startswith("moment-")]
                checks, _ = AC.check_voice({"voice": os.path.join(outd, "voice.wav"), "rendered": os.path.join(outd, "audio.wav"),
                                            "musicBed": os.path.join(outd, "music-bed.wav"), "narration": narr, "story": {"moments": moments}}, rep)
                chk("Z3 all 12 voice checks pass on the real sample", all(c["ok"] for c in checks), [c["name"] for c in checks if not c["ok"]])
            finally:
                os.chdir(cwd)
        else:
            print("SKIP  Z the Media Lab fixture record is not here (run voice_verify.py on the sample first)")
    else:
        print("SKIP  Z real-sample integration (set RUN_VOICE_INTEGRATION=1 on the Mac with the Media Lab sample and whisper.cpp)")


try:
    main()
finally:
    shutil.rmtree(TMP, ignore_errors=True)
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
