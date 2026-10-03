#!/usr/bin/env python3
"""PrayogX Reel Maker - local, provider-independent verification of narration audio (voice layer Phase 2A).

    python3 tools/reel-maker/voice_verify.py verify --profile PROFILE --beat BEAT --audio SOURCE.mp3 \
        --spoken-file SPOKEN.txt --out DIR [--offset 0.3] [--job-id ID] [--created-at T] [--deliberate]

Transcribes the audio locally with whisper.cpp (the Media Lab settings: ggml-small.en, -l en -t 4 -bs 5 -bo 5
-tp 0.0 -nf), compares it word for word with the reviewed spoken form, and writes DIR/voice.json: the voice record
that audio.py requires before a voice may enter the mix. It also decodes the source to a WAV for the mixer by
format conversion only (macOS afconvert): no resampling, no time-stretching, no edit.

whisper.cpp and its model live outside the repository: --whisper-bin / --whisper-model, or WHISPER_CPP_BIN and
WHISPER_MODEL in the environment (.env.example). Nothing here calls a voice provider or the network.

Rules (tools/reel-maker/README.md -> Voiceover): a missing, added, substituted, repeated or reordered word fails.
A transcriber spelling passes only through transcript_equivalences.json, and every use is listed. A low word
probability is a listening flag with its timestamp, never a failure; human listening remains the final gate.
"""
import argparse
import datetime
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
EQUIVALENCES = os.path.join(HERE, "transcript_equivalences.json")
VERIFIER = "prayogx-voice-verify/1"
WHISPER_FLAGS = ["-l", "en", "-t", "4", "-bs", "5", "-bo", "5", "-tp", "0.0", "-nf"]
LOW_P = 0.5
RECORD_SCHEMA = "prayogx-voice-record/1"


class VerifyError(Exception):
    pass


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def spoken_sha256(spoken):
    """the spoken form's hash, whitespace collapsed (line breaks in a script file do not change the words)"""
    return hashlib.sha256(" ".join(spoken.split()).encode("utf-8")).hexdigest()


def load_equivalences(path=EQUIVALENCES):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ------------------------------------------------------------------ words
_ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
_TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def int_words(n):
    """English words for 0 <= n <= 999999: no 'and', hyphenated tens (96485 -> ninety-six thousand four hundred eighty-five)"""
    if n < 20:
        return _ONES[n]
    if n < 100:
        return _TENS[n // 10] + ("-" + _ONES[n % 10] if n % 10 else "")
    if n < 1000:
        return _ONES[n // 100] + " hundred" + (" " + int_words(n % 100) if n % 100 else "")
    return int_words(n // 1000) + " thousand" + (" " + int_words(n % 1000) if n % 1000 else "")


def ref_words(text):
    return re.findall(r"[a-z0-9]+(?:['\-][a-z0-9]+)*", text.lower().replace("’", "'"))


def strict_token(raw):
    t = raw.lower().strip()
    t = re.sub(r"^[\"'(]+", "", t)
    return re.sub(r"[.,;:!?\"')]+$", "", t)        # trailing punctuation only: keeps "h+", "oh-", "96,485"


def whisper_words(data):
    """words from whisper.cpp -ojf tokens: raw text, start/end ms, p = min over word pieces (punctuation excluded)"""
    out, cur = [], None
    for seg in data["transcription"]:
        for tok in seg["tokens"]:
            t = tok["text"]
            if t.startswith("[_") or t.startswith("<|"):
                continue
            word_piece = bool(re.search(r"[A-Za-z0-9]", t))
            if t.startswith(" ") or cur is None:
                if cur:
                    out.append(cur)
                cur = {"raw": t.strip(), "from_ms": tok["offsets"]["from"], "to_ms": tok["offsets"]["to"],
                       "p": tok["p"] if word_piece else None}
            else:
                cur["raw"] += t
                cur["to_ms"] = tok["offsets"]["to"]
                if word_piece:
                    cur["p"] = tok["p"] if cur["p"] is None else min(cur["p"], tok["p"])
    if cur:
        out.append(cur)
    return [w for w in out if strict_token(w["raw"])]


def expand(words, table):
    """transcript tokens after the declared rules only: [(token, word index, rule text or None)]"""
    toks = []
    rng = (table.get("integers") or {})
    lo, hi = (rng.get("range") or [0, -1])
    for i, w in enumerate(words):
        s = strict_token(w["raw"])
        rule = (table.get("tokens") or {}).get(s)
        if rule:
            for part in rule["spoken"].split():
                toks.append((part, i, 'token "%s" -> "%s" (v%s)' % (w["raw"], rule["spoken"], table.get("version"))))
            continue
        if rng.get("enabled") and re.fullmatch(r"\d{1,3}(?:,\d{3})+|\d+", s) and lo <= int(s.replace(",", "")) <= hi:
            words_ = int_words(int(s.replace(",", "")))
            for part in words_.split():
                toks.append((part, i, 'integer "%s" -> "%s" (v%s)' % (w["raw"], words_, table.get("version"))))
            continue
        dm = re.fullmatch(r"(\d{1,6})\.(\d{1,6})", s)
        if (table.get("decimals") or {}).get("enabled") and dm and int(dm.group(1)) <= hi:
            words_ = int_words(int(dm.group(1))) + " point " + " ".join(_ONES[int(c)] for c in dm.group(2))   # every digit, in order
            for part in words_.split():
                toks.append((part, i, 'decimal "%s" -> "%s" (v%s)' % (w["raw"], words_, table.get("version"))))
            continue
        canon = spelling(table).get(s)
        if canon:
            toks.append((canon, i, 'spelling "%s" -> "%s" (v%s)' % (w["raw"], canon, table.get("version"))))
            continue
        toks.append((s, i, None))
    return toks


def spelling(table):
    """the declared spelling map (American -> canonical British), empty when the table has none"""
    return ((table.get("spelling") or {}).get("canonical")) or {}


def align(ref, hyp):
    n, m = len(ref), len(hyp)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]))
    ops, i, j = [], n, m
    while i or j:
        if i and j and d[i][j] == d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]):
            ops.append(("equal" if ref[i - 1] == hyp[j - 1] else "sub", i - 1, j - 1)); i, j = i - 1, j - 1
        elif i and d[i][j] == d[i - 1][j] + 1:
            ops.append(("del", i - 1, None)); i -= 1
        else:
            ops.append(("ins", None, j - 1)); j -= 1
    return ops[::-1]


def compare(spoken, whisper_data, table):
    """the word-for-word comparison of a reviewed spoken form with a whisper.cpp transcript (pure, no I/O)"""
    sp = spelling(table)
    ref0 = ref_words(spoken)
    ref = [sp.get(w, w) for w in ref0]                                          # compared in the canonical spelling (listed below)
    ref_respelled = [{"expected": a, "comparedAs": b, "rule": 'spelling "%s" -> "%s" (v%s)' % (a, b, table.get("version"))}
                     for a, b in zip(ref0, ref) if a != b]
    words = whisper_words(whisper_data)
    toks = expand(words, table)
    hyp = [t[0] for t in toks]
    ops = align(ref, hyp)
    at = lambda j: round(words[toks[j][1]]["from_ms"] / 1000, 2)  # noqa: E731
    subs = [{"expected": ref[i], "heard": hyp[j], "at_s": at(j)} for o, i, j in ops if o == "sub"]
    missing = [{"expected": ref[i], "after": ref[i - 1] if i else None} for o, i, j in ops if o == "del"]
    added = [{"heard": hyp[j], "at_s": at(j)} for o, i, j in ops if o == "ins"]
    # an inserted word next to the same word is a repetition (the aligner may keep either copy)
    repeated = [{"heard": hyp[j], "at_s": at(j)} for o, i, j in ops
                if o == "ins" and ((j > 0 and hyp[j] == hyp[j - 1]) or (j + 1 < len(hyp) and hyp[j] == hyp[j + 1]))]
    # words both expected-but-not-heard and heard-but-not-expected where they stand are reordered (the minimum-edit
    # alignment reports a swap as substitutions or a deletion plus an insertion; this names it)
    reordered = sorted(({s["expected"] for s in subs} | {m["expected"] for m in missing}) & ({s["heard"] for s in subs} | {a["heard"] for a in added}))
    applied, seen = [], set()
    for t, i, rule in toks:
        if rule and i not in seen:
            seen.add(i)
            applied.append({"transcript": words[i]["raw"], "rule": rule, "at_s": round(words[i]["from_ms"] / 1000, 2)})
    low = [{"word": w["raw"], "p": round(w["p"], 4), "at_s": round(w["from_ms"] / 1000, 2), "flag": "listen"}
           for w in words if w["p"] is not None and w["p"] < LOW_P]
    errors = len(subs) + len(missing) + len(added)
    return {
        "expectedSpoken": " ".join(spoken.split()),
        "expectedWords": len(ref),
        "rawTranscript": " ".join(w["raw"] for w in words),
        "normalizedTranscript": " ".join(hyp),
        "equivalencesApplied": applied,
        "expectedRespelled": ref_respelled,
        "missing": missing, "added": added, "substituted": subs, "repeated": repeated, "reordered": reordered,
        "wordErrorRate": round(errors / max(1, len(ref)), 4),
        "listeningFlags": low,
        "status": "VERIFIED" if errors == 0 else "FAILED",
    }


# ------------------------------------------------------------------ local tools (afconvert, whisper.cpp)
def tool_paths(whisper_bin=None, whisper_model=None):
    b = whisper_bin or os.environ.get("WHISPER_CPP_BIN")
    m = whisper_model or os.environ.get("WHISPER_MODEL")
    if not b or not os.path.isfile(b):
        raise VerifyError("whisper.cpp not found: pass --whisper-bin or set WHISPER_CPP_BIN (got %r)" % b)
    if not m or not os.path.isfile(m):
        raise VerifyError("whisper model not found: pass --whisper-model or set WHISPER_MODEL (got %r)" % m)
    if not shutil.which("afconvert"):
        raise VerifyError("afconvert not found: verification decodes audio with macOS afconvert (run on a Mac)")
    return b, m


def afconvert(src, dst, fmt):
    subprocess.run(["afconvert", "-f", "WAVE"] + fmt + [src, dst], check=True, capture_output=True)


def transcribe(audio, work, whisper_bin, whisper_model):
    """whisper.cpp on a 16 kHz mono WAV of the audio (format conversion only); returns (whisper json, settings)"""
    os.makedirs(work, exist_ok=True)
    wav16 = os.path.join(work, "transcribe-16k.wav")
    afconvert(audio, wav16, ["-d", "LEI16@16000", "-c", "1"])
    base = os.path.join(work, "whisper")
    r = subprocess.run([whisper_bin, "-m", whisper_model, "-f", wav16] + WHISPER_FLAGS + ["-otxt", "-ojf", "-of", base],
                       capture_output=True, text=True)
    if r.returncode != 0 or not os.path.isfile(base + ".json"):
        raise VerifyError("whisper.cpp failed (exit %s): %s" % (r.returncode, (r.stderr or "")[-400:]))
    with open(base + ".json", encoding="utf-8") as f:
        data = json.load(f)
    settings = {"engine": "whisper.cpp", "binary": whisper_bin, "model": os.path.basename(whisper_model),
                "modelSha256": sha256_file(whisper_model), "flags": " ".join(WHISPER_FLAGS),
                "input": "16 kHz mono 16-bit WAV (afconvert, format conversion only)", "rawOutput": os.path.abspath(base + ".json")}
    return data, settings


def decode_for_mix(src, dst):
    """the source as 16-bit PCM WAV at its own rate and channels: format conversion only (the mixer resamples)"""
    afconvert(src, dst, ["-d", "LEI16"])
    with wave.open(dst, "rb") as w:
        return {"path": os.path.abspath(dst), "sha256": sha256_file(dst), "sampleRate": w.getframerate(), "channels": w.getnchannels(),
                "frames": w.getnframes(), "seconds": round(w.getnframes() / w.getframerate(), 6)}


# ------------------------------------------------------------------ the voice record
def build_record(profile_id, segments, out_dir, whisper_bin=None, whisper_model=None, profiles=None, library=None,
                 transcriber=None, decoder=None):
    """Verify each segment and write out_dir/voice.json. segments: [{beat, spoken, source, offset?, jobId?, createdAt?,
    deliberate?}]. transcriber(audio, work) -> (whisper json, settings) and decoder(src, dst) -> dict can be replaced
    in tests; by default they are whisper.cpp and afconvert."""
    sys.path.insert(0, HERE)
    import narration as NA
    profiles = NA.load_profiles() if profiles is None else profiles
    library = NA.load_library() if library is None else library
    p, a, why = NA.resolve_profile(profile_id, profiles, library)
    if why:
        raise VerifyError("voice profile not usable: " + "; ".join(why))
    if transcriber is None:
        wb, wm = tool_paths(whisper_bin, whisper_model)
        transcriber = lambda audio, work: transcribe(audio, work, wb, wm)  # noqa: E731
    decoder = decoder or decode_for_mix
    table = load_equivalences()
    os.makedirs(out_dir, exist_ok=True)
    segs, settings = [], None
    for k, s in enumerate(segments, 1):
        seg, settings = verify_segment(k, s, p, out_dir, transcriber, decoder, table)
        segs.append(seg)
    return write_record(out_dir, profile_id, p, a, segs, settings, table)


def verify_segment(k, s, p, out_dir, transcriber, decoder, table, work_name=None):
    """(segment record, transcriber settings) for one source file: transcribe, compare, decode for the mix.
    s: {beat, spoken, source, offset?, deliberate?, jobId?, createdAt?, cost?, request?, rawResponse?}.
    work_name names the working folder (default seg-NN); generation passes a unique one so reused files are never overwritten."""
    src = s["source"]
    if not os.path.isfile(src):
        raise VerifyError("segment %d: source audio missing: %s" % (k, src))
    work = os.path.join(out_dir, work_name or "seg-%02d" % k)
    os.makedirs(work, exist_ok=True)
    data, settings = transcriber(src, work)
    res = compare(s["spoken"], data, table)
    dec = decoder(src, os.path.join(work, "decoded.wav"))
    seg = {
        "index": k, "beat": s["beat"], "offset": float(s.get("offset", 0.3)), "deliberate": bool(s.get("deliberate", False)),
        "spokenSha256": spoken_sha256(s["spoken"]),
        "source": {"path": os.path.abspath(src), "sha256": sha256_file(src), "format": os.path.splitext(src)[1].lstrip(".").lower(),
                   "provider": p["provider"], "model": p["model"], "voiceId": p["voiceId"],
                   "jobId": s.get("jobId"), "createdAt": s.get("createdAt"), "cost": s.get("cost"),
                   "request": s.get("request"), "rawResponse": s.get("rawResponse")},
        "decoded": dec,
        "verification": res,
        "status": res["status"],
    }
    return seg, settings


def write_record(out_dir, profile_id, p, a, segs, settings, table, extra=None):
    """write out_dir/voice.json: VERIFIED only when every segment is VERIFIED and, for a generation run, the run itself
    finished VERIFIED (a run stopped after some verified segments is FAILED, never a partial VERIFIED record)"""
    status = "VERIFIED" if segs and all(x["status"] == "VERIFIED" for x in segs) else "FAILED"
    if ((extra or {}).get("generation") or {}).get("result", "VERIFIED") != "VERIFIED":
        status = "FAILED"
    rec = {
        "schema": RECORD_SCHEMA, "status": status,
        "verifiedAt": datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat(),
        "assetId": a["assetId"], "voiceProfile": profile_id, "qualificationStatus": a.get("qualificationStatus"),
        "profileSnapshot": {k: p.get(k) for k in ("provider", "engine", "model", "voiceId", "voiceName", "voiceType", "language", "settings", "status")},
        "verifier": {"version": VERIFIER, "equivalenceTable": "transcript_equivalences.json", "equivalenceVersion": table.get("version"),
                     "equivalenceSha256": sha256_file(EQUIVALENCES), "lowProbabilityFlag": LOW_P, "transcriber": settings},
        "segments": segs,
    }
    rec.update(extra or {})
    with open(os.path.join(out_dir, "voice.json"), "w", encoding="utf-8") as f:
        json.dump(rec, f, indent=2, ensure_ascii=False); f.write("\n")
    return rec


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("verify", help="verify one narration segment and write DIR/voice.json")
    v.add_argument("--profile", required=True); v.add_argument("--beat", required=True)
    v.add_argument("--audio", required=True); v.add_argument("--spoken-file", required=True); v.add_argument("--out", required=True)
    v.add_argument("--offset", type=float, default=0.3); v.add_argument("--job-id"); v.add_argument("--created-at")
    v.add_argument("--deliberate", action="store_true", help="the narration deliberately overlaps a protected moment")
    v.add_argument("--whisper-bin"); v.add_argument("--whisper-model")
    a = ap.parse_args(argv)
    with open(a.spoken_file, encoding="utf-8") as f:
        spoken = f.read()
    try:
        rec = build_record(a.profile, [{"beat": a.beat, "spoken": spoken, "source": a.audio, "offset": a.offset,
                                        "jobId": a.job_id, "createdAt": a.created_at, "deliberate": a.deliberate}],
                           a.out, a.whisper_bin, a.whisper_model)
    except VerifyError as e:
        print("VOICE VERIFY: " + str(e), file=sys.stderr)
        return 3
    for s in rec["segments"]:
        r = s["verification"]
        print("segment %d (%s): %s  WER %.4f  missing %d  added %d  substituted %d  repeated %d  reordered %d  equivalences %d  listening flags %d"
              % (s["index"], s["beat"], s["status"], r["wordErrorRate"], len(r["missing"]), len(r["added"]), len(r["substituted"]),
                 len(r["repeated"]), len(r["reordered"]), len(r["equivalencesApplied"]), len(r["listeningFlags"])))
    print("voice record: %s -> %s" % (os.path.join(a.out, "voice.json"), rec["status"]))
    return 0 if rec["status"] == "VERIFIED" else 1


if __name__ == "__main__":
    sys.exit(main())
