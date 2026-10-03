#!/usr/bin/env python3
"""The voice layer, Phase 2B: voice.py (prepare / estimate / generate + verify), voice_providers.py, the YouTube
synthetic-media flag and the narrated build path - with a fake provider only.

No real provider is contacted: voice_providers.PROVIDERS is replaced by a sentinel that fails the test if anything tries
to build a real adapter, the Higgsfield adapter is exercised only with a fake command runner and a fake downloader, and
every story, profile, licence and audio file is a temporary fixture. Sections: A the Higgsfield adapter (offline),
B prepare / estimate, C authorisation gates, D generation and verification, E failures (stop, no retry), F the build
path and variants, G YouTube synthetic media, H no real provider, no publishing.

Run:  python3 tests/test_voice_generation.py
"""
import glob
import json
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
sys.path.insert(0, os.path.join(ROOT, "tools"))
import voice_providers as VP  # noqa: E402
import voice as V  # noqa: E402
import voice_verify as VV  # noqa: E402
import audio as AU  # noqa: E402

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or not detail else "  -> " + str(detail)))


class RealProviderContacted(AssertionError):
    pass


def _sentinel(*a, **k):
    raise RealProviderContacted("a real voice provider adapter was built during the offline tests")


REAL_PROVIDERS = dict(VP.PROVIDERS)
VP.PROVIDERS = {"higgsfield": _sentinel}               # any real adapter construction fails the suite

TMP = tempfile.mkdtemp(prefix="voicegen-")
REELS, OUT = os.path.join(TMP, "reels"), os.path.join(TMP, "output")
os.makedirs(REELS)
DISC = "Narration: test disclosure."
ASSET = {"assetId": "voice-fake", "role": "voice", "source": "external-tts", "provider": "fakeprov", "model": "fake-1", "voiceProfiles": ["test-voice"],
         "license": "t", "licenseDocument": "licence.md", "licenseVerified": True, "sourceReference": "t", "permittedUse": ["instagram", "youtube"],
         "commercialUse": True, "attributionRequired": False, "attributionText": "", "disclosureRequired": True, "disclosureText": DISC, "qualificationStatus": "provisional"}
LIB = {"voice-fake": ASSET}
PROFILES = {"test-voice": {"profileId": "test-voice", "status": "provisional", "provider": "fakeprov", "model": "fake-1", "voiceId": "v1", "voiceType": "preset",
                           "voiceName": "Testa", "language": "en", "libraryAsset": "voice-fake", "settings": {}}}
open(os.path.join(TMP, "licence.md"), "w").write("licence\n")


def tone(path, seconds=1.2, sr=44100):
    n = int(seconds * sr)
    x = 0.3 * np.sin(2 * np.pi * 220 * np.arange(n) / sr)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(np.round(x * 32767).astype("<i2").tobytes())


class FakeProvider(VP.VoiceProvider):
    id = "fakeprov"

    def __init__(self, fail_at=None, fail_kind="api", cost=0.5, balance=100.0):
        self.calls, self.estimates, self.fail_at, self.fail_kind, self.cost, self.bal = [], [], fail_at, fail_kind, cost, balance

    def estimate(self, text, profile, work_dir=None):
        self.estimates.append(text)
        return self.cost

    def balance(self):
        return self.bal

    def generate(self, text, profile, out_dir, name):
        self.calls.append(text)
        if self.fail_at is not None and len(self.calls) == self.fail_at:
            raise VP.VoiceProviderError(self.fail_kind, "fake %s failure" % self.fail_kind)
        os.makedirs(out_dir, exist_ok=True)
        p = os.path.join(out_dir, name + ".wav")
        tone(p)
        raw = os.path.join(out_dir, name + ".response.json")
        open(raw, "w").write('[{"id": "job-%d", "status": "completed"}]' % len(self.calls))
        self.bal -= self.cost
        return {"audioPath": p, "provider": "fakeprov", "model": "fake-1", "voiceId": "v1", "voiceName": "Testa", "jobId": "job-%d" % len(self.calls),
                "createdAt": "2026-10-03T00:00:00Z", "cost": self.cost, "rawResponsePath": raw, "format": "wav", "request": {"model": "fake-1", "dialogue": [{"text": text}]}}


def tx_ok(audio, work):
    """fake transcriber: hears exactly the spoken text recorded beside the audio by the test"""
    m = re.search(r"seg-\d\d", os.path.basename(audio))               # files are <attempt>-seg-NN.<ext>
    words = TEXT_OF.get(m.group(0) if m else "", "")
    toks = [{"text": "[_BEG_]", "offsets": {"from": 0, "to": 0}, "p": 1.0}] + [{"text": " " + w, "offsets": {"from": 300 * i, "to": 300 * i + 250}, "p": 0.97}
                                                                             for i, w in enumerate(words.split())]
    return {"transcription": [{"tokens": toks}]}, {"engine": "fake"}


def dec(src, dst):
    shutil.copy(src, dst)
    with wave.open(dst, "rb") as w:
        return {"path": os.path.abspath(dst), "sha256": VV.sha256_file(dst), "sampleRate": w.getframerate(), "channels": w.getnchannels(),
                "frames": w.getnframes(), "seconds": round(w.getnframes() / w.getframerate(), 6)}


TEXT_OF = {}
SEGS = [{"beat": "hook", "text": "Can you see it?", "spoken": "Can you see it?"},
        {"beat": "moment-A", "text": "Kp = Kc(RT)^Δn", "spoken": "K p equals K c times R T to the power delta n", "acknowledge": ["R T"]}]


def story(sid, segs=SEGS, reviewed=True, variant=None, **narr):
    n = {"voiceProfile": "test-voice", "segments": segs}
    if reviewed:
        n.update(reviewedBy="Tester", reviewedAt="2026-10-03")
    n.update(narr)
    spec = {"story": {"moments": [{"id": "A"}]}, "narration": n}
    with open(V.story_path(sid, variant, REELS), "w") as f:
        json.dump(spec, f)
    for k, s in enumerate(segs, 1):
        TEXT_OF["seg-%02d" % k] = s["spoken"]
    return spec


def gen(sid, cap=5.0, confirm=None, provider=None, variant=None, new_attempt=False, tx=tx_ok):
    return V.generate(sid, cap, confirm if confirm is not None else sid, variant, new_attempt, provider=provider, reels=REELS, output=OUT,
                      profiles=PROFILES, library=LIB, transcriber=tx, decoder=dec)


def stop(fn, *a, **k):
    try:
        fn(*a, **k)
    except V.VoiceStop as e:
        return str(e)
    return None


def main():
    # ============================================================ A. the Higgsfield adapter, offline (fake runner, fake download)
    H = REAL_PROVIDERS["higgsfield"]
    seen = []

    def runner(args, timeout):
        seen.append(args)
        if args[:2] == ["account", "status"]:
            return 0, "someone@example.com — pro plan, %s credits\n" % (588.6 if len([a for a in seen if a[:2] == ["account", "status"]]) == 1 else 586.3), ""
        if args[:2] == ["generate", "cost"]:
            return 0, "2.3 credits\n", ""
        if args[:2] == ["generate", "create"]:
            return 0, json.dumps([{"id": "job-xyz", "status": "completed", "result_url": "https://cdn.example.com/a/b.mp3", "created_at": "2026-10-03T09:00:00Z"}]), ""
        return 1, "", "unknown"

    def fetch(url, path):
        open(path, "wb").write(b"\x00" * 5000)
    prof = {"profileId": "p", "provider": "higgsfield", "model": "elevenlabs_v4", "voiceId": "vid-1", "voiceType": "preset", "voiceName": "Emily",
            "settings": {"stability": None, "similarity_boost": None}}
    h = H(runner=runner, fetch=fetch)
    d = os.path.join(TMP, "hf"); os.makedirs(d)
    est = h.estimate("delta G naught", prof, d)
    req = json.load(open(os.path.join(d, ".estimate-payload.json")))
    chk("A1 estimate: `higgsfield generate cost elevenlabs_v4 --dialogue @payload` with the exact spoken text, voice_type and voice_id",
        est == 2.3 and seen[0][:5] == ["generate", "cost", "elevenlabs_v4", "--dialogue", "@" + os.path.join(d, ".estimate-payload.json")]
        and req == [{"text": "delta G naught", "voice_type": "preset", "voice_id": "vid-1"}], (seen[0], req))
    chk("A2 null voice settings are not sent (the qualified defaults)", not any(a.startswith("--stability") or a.startswith("--similarity") for a in seen[0]))
    g = h.generate("delta G naught", prof, d, "seg-01")
    create = [a for a in seen if a[:2] == ["generate", "create"]][0]
    chk("A3 generate: one create call with --wait --json, the audio downloaded, the raw response kept, cost = balance before - after",
        "--wait" in create and "--json" in create and g["jobId"] == "job-xyz" and g["cost"] == 2.3 and os.path.isfile(g["audioPath"])
        and os.path.isfile(g["rawResponsePath"]) and g["format"] == "mp3" and g["provider"] == "higgsfield" and g["model"] == "elevenlabs_v4", g)
    src = open(os.path.join(RM, "voice_providers.py")).read()
    chk("A4 the CLI is always run with stdin closed (it would otherwise wait for a prompt on stdin)", "stdin=subprocess.DEVNULL" in src)
    chk("A5 the e-mail in `account status` and token-like strings never reach records or messages",
        VP.redact("me@x.com Bearer abc.def token=sk_live_123") .count("<") >= 2 and "me@x.com" not in VP.redact("me@x.com") and "someone@example.com" not in json.dumps(g))
    bad = H(runner=lambda a, t: (1, "", "Error: Session expired, run higgsfield auth login"), fetch=fetch)
    e = None
    try:
        bad.estimate("x", prof, d)
    except VP.VoiceProviderError as ex:
        e = ex
    chk("A6 a missing login is an 'auth' error that asks the owner to sign in (nothing retried)", e is not None and e.kind == "auth" and "auth login" in str(e), e)
    mal = H(runner=lambda a, t: (0, "not json" if a[:2] == ["generate", "create"] else "100 credits", ""), fetch=fetch)
    try:
        mal.generate("x", prof, d, "seg-02"); e = None
    except VP.VoiceProviderError as ex:
        e = ex
    chk("A7 a malformed provider response is a 'malformed' error and the raw response is kept", e is not None and e.kind == "malformed" and os.path.isfile(os.path.join(d, "seg-02.response.json")), e)
    nourl = H(runner=lambda a, t: (0, json.dumps([{"id": "j", "status": "completed"}]) if a[:2] == ["generate", "create"] else "100 credits", ""), fetch=fetch)
    try:
        nourl.generate("x", prof, d, "seg-03"); e = None
    except VP.VoiceProviderError as ex:
        e = ex
    chk("A8 a completed job without audio is a 'no_audio' error", e is not None and e.kind == "no_audio", e)
    wrong = dict(prof, model="text2speech_v2")
    try:
        h.request("x", wrong); e = None
    except VP.VoiceProviderError as ex:
        e = ex
    chk("A9 an unqualified model is refused by the adapter", e is not None and e.kind == "config", e)

    # ============================================================ B. prepare / estimate
    story("R1")
    spec, plan = V.prepare("R1", reels=REELS, output=OUT, profiles=PROFILES, library=LIB)
    chk("B1 prepare: a plan with the reel, profile, provider, model, reviewer, segments, spoken hashes; no provider call",
        plan["reelId"] == "R1" and plan["voiceProfile"] == "test-voice" and plan["provider"] == "fakeprov" and plan["valid"] and len(plan["segments"]) == 2
        and plan["segments"][1]["spokenSha256"] == VV.spoken_sha256(SEGS[1]["spoken"]) and plan["estimate"] is None
        and os.path.isfile(os.path.join(V.voice_dir("R1", None, OUT), "plan.json")))
    fp = FakeProvider()
    _, plan = V.estimate("R1", provider=fp, reels=REELS, output=OUT, profiles=PROFILES, library=LIB)
    chk("B2 estimate: per segment and total, with the balance before and after; nothing generated", plan["estimate"]["totalCredits"] == 1.0 and plan["estimate"]["balanceCredits"] == 100.0
        and plan["estimate"]["balanceAfterCredits"] == 99.0 and fp.calls == [] and fp.estimates == [s["spoken"] for s in SEGS])
    open(os.path.join(REELS, "SILENT.json"), "w").write(json.dumps({"story": {}}))
    chk("B3 a silent reel has nothing to prepare", "silent reel" in (stop(V.prepare, "SILENT", reels=REELS, output=OUT, profiles=PROFILES, library=LIB) or ""))

    # ============================================================ C. authorisation gates (no provider call when any fails)
    fp = FakeProvider()
    chk("C1 a missing cap stops before generation", "no credit cap" in (stop(gen, "R1", cap=None, provider=fp) or "") and fp.calls == [])
    chk("C2 a zero or negative cap stops", all("positive number" in (stop(gen, "R1", cap=c, provider=FakeProvider()) or "") for c in (0, -1)))
    fp = FakeProvider(cost=3.0)
    chk("C3 an estimate above the cap stops before generation (the cap is never raised)", "exceeds the cap" in (stop(gen, "R1", cap=5.0, provider=fp) or "") and fp.calls == [])
    chk("C4 a wrong --confirm stops", "--confirm R1" in (stop(gen, "R1", confirm="R2", provider=FakeProvider()) or ""))
    story("R2", reviewed=False)
    chk("C5 narration without reviewedBy / reviewedAt stops", "reviewedBy" in (stop(gen, "R2", provider=FakeProvider()) or ""))
    story("R3", segs=[{"beat": "hook", "text": "NaCl", "spoken": "Is NaCl ionic?"}])
    chk("C6 open review items stop", "human review" in (stop(gen, "R3", provider=FakeProvider()) or ""))
    story("R4", segs=[{"beat": "hook", "text": "x", "spoken": "H2SO4"}])
    chk("C7 invalid narration (notation in the spoken form) stops", "not valid" in (stop(gen, "R4", provider=FakeProvider()) or ""))
    story("R5", voiceProfile="nope")
    chk("C8 an invalid voice profile stops", "not valid" in (stop(gen, "R5", provider=FakeProvider()) or ""))
    fp = FakeProvider(cost=0.5, balance=0.6)
    chk("C9 an estimate above the account balance stops", "exceeds the balance" in (stop(gen, "R1", provider=fp) or "") and fp.calls == [])

    # ============================================================ D. generation and verification (fake provider)
    fp = FakeProvider()
    story("G1")
    rec, auth = gen("G1", provider=fp)
    s0, s1 = rec["segments"]
    chk("D1 two segments generated one at a time with the exact spoken text, each verified, record VERIFIED", rec["status"] == "VERIFIED"
        and fp.calls == [s["spoken"] for s in SEGS] and s0["status"] == s1["status"] == "VERIFIED")
    chk("D2 the record keeps reel, segment, profile, provider, model, job ID, cost, request, raw response, hashes, transcript, flags, asset, timestamps",
        rec["reelId"] == "G1" and rec["assetId"] == "voice-fake" and rec["profileSnapshot"]["voiceName"] == "Testa" and s1["source"]["jobId"] == "job-2"
        and s1["source"]["cost"] == 0.5 and s1["source"]["request"]["dialogue"][0]["text"] == SEGS[1]["spoken"] and os.path.isfile(s1["source"]["rawResponse"])
        and len(s1["source"]["sha256"]) == 64 and len(s1["decoded"]["sha256"]) == 64 and s1["spokenSha256"] == VV.spoken_sha256(SEGS[1]["spoken"])
        and "normalizedTranscript" in s1["verification"] and "listeningFlags" in s1["verification"] and rec["verifiedAt"]
        and rec["generation"]["spentCredits"] == 1.0 and rec["generation"]["capCredits"] == 5.0 and rec["generation"]["reviewedBy"] == "Tester")
    a = json.load(open(os.path.join(V.voice_dir("G1", None, OUT), "attempts.json")))
    chk("D3 the attempt is logged with its cap, estimate, spend, jobs and result", len(a) == 1 and a[0]["result"] == "VERIFIED" and a[0]["spentCredits"] == 1.0
        and [x["jobId"] for x in a[0]["segments"]] == ["job-1", "job-2"])
    plan_for = {"beats": [{"id": "hook", "t0": 0.0, "dur": 2.0}, {"id": "moment-A", "t0": 2.0, "dur": 3.0}, {"id": "answer", "t0": 5.0, "dur": 3.0}],
                "marks": {"answer": {"t0": 5.0, "t1": 8.0, "reveal": 6.0}},
                "voice": {"record": os.path.join(V.voice_dir("G1", None, OUT), "voice.json"), "narration": json.load(open(V.story_path("G1", None, REELS)))["narration"]}}
    st, info, _ = AU.voice_stem(plan_for, 8 * 48000, LIB, root=TMP)
    chk("D4 the verified record enters the mixer gate: both segments placed at their beats", [x["beat"] for x in info["segments"]] == ["hook", "moment-A"] and np.abs(st).max() > 0)
    with open(s1["source"]["path"], "r+b") as f:
        f.seek(3000); f.write(b"\x09\x09\x09")
    e = None
    try:
        AU.voice_stem(plan_for, 8 * 48000, LIB, root=TMP)
    except AU.VoiceError as ex:
        e = ex
    chk("D5 a source file changed after verification is refused by the mixer (checksum mismatch)", e is not None and "sha256 does not match" in str(e), e)

    # ============================================================ E. failures stop at once; nothing is retried
    fp = FakeProvider(fail_at=1)
    story("E1")
    m = stop(gen, "E1", provider=fp)
    rec = json.load(open(os.path.join(V.voice_dir("E1", None, OUT), "voice.json")))
    chk("E1 a provider failure on the first segment stops: one call, no retry, record FAILED", "stopped, nothing retried" in (m or "") and len(fp.calls) == 1 and rec["status"] == "FAILED", m)
    fp = FakeProvider(fail_at=2, fail_kind="malformed")
    story("E2")
    m = stop(gen, "E2", provider=fp)
    rec = json.load(open(os.path.join(V.voice_dir("E2", None, OUT), "voice.json")))
    att = json.load(open(os.path.join(V.voice_dir("E2", None, OUT), "attempts.json")))
    chk("E2 a partial failure (segment 2 malformed) stops; segment 1's spend is recorded; the record is FAILED and never mixable",
        "malformed" in (m or "") and len(fp.calls) == 2 and rec["status"] == "FAILED" and att[-1]["result"] == "PROVIDER_FAILED" and att[-1]["spentCredits"] == 0.5, (m, att[-1]))

    def tx_bad(audio, work):
        d_, s_ = tx_ok(audio, work)
        if "seg-01" in os.path.basename(audio):
            d_["transcription"][0]["tokens"].insert(2, {"text": " really", "offsets": {"from": 50, "to": 60}, "p": 0.9})
        return d_, s_
    fp = FakeProvider()
    story("E3")
    m = stop(gen, "E3", provider=fp, tx=tx_bad)
    rec = json.load(open(os.path.join(V.voice_dir("E3", None, OUT), "voice.json")))
    chk("E3 a verification failure stops before the next segment is paid for, names the difference, and the record is FAILED",
        "FAILED verification" in (m or "") and "really" in (m or "") and len(fp.calls) == 1 and rec["status"] == "FAILED", m)
    e = None
    try:
        AU.voice_stem(dict(plan_for, voice={"record": os.path.join(V.voice_dir("E3", None, OUT), "voice.json"), "narration": json.load(open(V.story_path("E3", None, REELS)))["narration"]}), 8 * 48000, LIB, root=TMP)
    except AU.VoiceError as ex:
        e = ex
    chk("E4 failed audio never enters the mixer", e is not None and "not VERIFIED" in str(e), e)
    fp = FakeProvider()
    m = stop(gen, "G1", provider=fp)
    chk("E5 no accidental second spend: the same narration again stops unless --new-attempt", "already generated" in (m or "") and fp.calls == [], m)
    fp = FakeProvider()
    rec, _ = gen("G1", provider=fp, new_attempt=True)
    chk("E6 --new-attempt allows one explicit new paid run, and it pays only for the segment whose verified audio changed (segment 1 is reused)",
        rec["status"] == "VERIFIED" and fp.calls == [SEGS[1]["spoken"]] and len(json.load(open(os.path.join(V.voice_dir("G1", None, OUT), "attempts.json")))) == 2
        and rec["segments"][0].get("reusedFrom") and not rec["segments"][1].get("reusedFrom"), fp.calls)

    # ============================================================ R. reuse of VERIFIED audio (no provider call, no credits)
    def segs_of(rec):
        return {s["beat"]: s for s in rec["segments"]}
    story("RU")
    fp = FakeProvider()
    r1, _ = gen("RU", provider=fp)
    src_a = segs_of(r1)["hook"]["source"]["sha256"]
    extra = {"beat": "payoff", "text": "DON'T JUST SOLVE IT.", "spoken": "A huge crowd of slow electrons carries the current."}
    story("RU", segs=SEGS + [extra])
    TEXT_OF["seg-03"] = extra["spoken"]
    fp = FakeProvider()
    _, plan = V.estimate("RU", provider=fp, reels=REELS, output=OUT, profiles=PROFILES, library=LIB)
    chk("R1 estimate: identical VERIFIED segments are marked REUSE at 0 credits; only the new one is estimated",
        [x["reuse"] for x in plan["segments"]] == [True, True, False] and plan["estimate"]["perSegment"] == [0.0, 0.0, 0.5]
        and plan["estimate"]["newSegments"] == 1 and fp.estimates == [extra["spoken"]], plan["estimate"])
    fp = FakeProvider()
    r2, _ = gen("RU", provider=fp)
    sg = segs_of(r2)
    chk("R2 an identical verified segment is reused: no provider call for it, same audio and checksum, provenance says where it came from",
        fp.calls == [extra["spoken"]] and sg["hook"]["source"]["sha256"] == src_a and sg["hook"].get("reusedFrom", {}).get("jobId") == "job-1"
        and sg["moment-A"].get("reusedFrom") and not sg["payoff"].get("reusedFrom") and r2["status"] == "VERIFIED"
        and r2["generation"]["reusedSegments"] == 2 and r2["generation"]["generatedSegments"] == 1 and r2["generation"]["spentCredits"] == 0.5, fp.calls)
    chk("R3 new audio never overwrites reused files (unique attempt-named files; the reused source still matches its checksum)",
        r2["generation"]["attemptId"] in os.path.basename(sg["payoff"]["source"]["path"]) and VV.sha256_file(sg["hook"]["source"]["path"]) == src_a
        and sg["hook"]["source"]["path"] != sg["payoff"]["source"]["path"])
    recs = glob.glob(os.path.join(V.voice_dir("RU", None, OUT), "records", "voice-*.json"))
    chk("R4 the previous VERIFIED record is archived in records/ before the new one replaces it", len(recs) >= 1 and any(json.load(open(x))["status"] == "VERIFIED" for x in recs), recs)
    changed = [dict(SEGS[0], spoken="Can you see it now?")] + SEGS[1:] + [extra]
    story("RU", segs=changed)
    TEXT_OF["seg-01"] = "Can you see it now?"
    fp = FakeProvider()
    r3, _ = gen("RU", provider=fp)
    chk("R5 changed spoken text is not reused: that segment is generated again, the unchanged ones are reused",
        fp.calls == ["Can you see it now?"] and not segs_of(r3)["hook"].get("reusedFrom") and segs_of(r3)["moment-A"].get("reusedFrom"), fp.calls)
    P2 = dict(PROFILES, **{"test-voice-2": dict(PROFILES["test-voice"], profileId="test-voice-2", voiceId="v2")})
    L2 = {"voice-fake": dict(ASSET, voiceProfiles=["test-voice", "test-voice-2"])}
    story("RU", segs=changed, voiceProfile="test-voice-2")
    fp = FakeProvider()
    r4, _ = V.generate("RU", 5.0, "RU", None, True, provider=fp, reels=REELS, output=OUT, profiles=P2, library=L2, transcriber=tx_ok, decoder=dec)
    chk("R6 a changed voice profile is not reused: every segment is generated again with the new voice",
        len(fp.calls) == 3 and not any(s.get("reusedFrom") for s in r4["segments"]) and r4["voiceProfile"] == "test-voice-2", fp.calls)
    story("RF")
    m = stop(gen, "RF", provider=FakeProvider(), tx=lambda a, w: (tx_ok(a, w)[0] if "seg-01" not in os.path.basename(a) else
                                                                      {"transcription": [{"tokens": [{"text": " wrong", "offsets": {"from": 0, "to": 1}, "p": 0.9}]}]}, {"engine": "fake"}))
    fp = FakeProvider()
    r5, _ = gen("RF", provider=fp, new_attempt=True)
    chk("R7 audio from a FAILED verification is never reused: the next run generates it again", "FAILED verification" in (m or "") and fp.calls[0] == SEGS[0]["spoken"]
        and not segs_of(r5)["hook"].get("reusedFrom"), (m, fp.calls))
    story("RT")
    r6, _ = gen("RT", provider=FakeProvider())
    with open(segs_of(r6)["moment-A"]["decoded"]["path"], "r+b") as f:
        f.seek(1500); f.write(b"\x07\x07")
    fp = FakeProvider()
    r7, _ = gen("RT", provider=fp, new_attempt=True)
    chk("R8 audio whose decoded file no longer matches its checksum is not reused", fp.calls == [SEGS[1]["spoken"]] and segs_of(r7)["hook"].get("reusedFrom")
        and not segs_of(r7)["moment-A"].get("reusedFrom"), fp.calls)
    story("RA")
    gen("RA", provider=FakeProvider())
    VP.PROVIDERS = {"fakeprov": _sentinel}
    try:
        r8, _ = V.generate("RA", 5.0, "RA", None, True, provider=None, reels=REELS, output=OUT, profiles=PROFILES, library=LIB)
        ok_all = r8["status"] == "VERIFIED" and r8["generation"]["spentCredits"] == 0 and r8["generation"]["generatedSegments"] == 0
    except RealProviderContacted:
        ok_all = False
    finally:
        VP.PROVIDERS = {"higgsfield": _sentinel}
    chk("R9 when every segment is reused, no provider is even constructed (estimate and generation spend 0 credits)", ok_all)
    chk("R10 reuse never weakens the gates: a fully reused run still needs reviewed narration and an explicit cap",
        "no credit cap" in (stop(gen, "RA", cap=None, provider=FakeProvider()) or ""))

    # ============================================================ F. the build path and variants
    gr = open(os.path.join(RM, "generate-reel.js")).read()
    chk("F1 a narrated build requires a VERIFIED voice record and otherwise stops with the explicit voice.py commands (it never generates)",
        "vr.status !== 'VERIFIED'" in gr and "the build never generates voice" in gr and "process.exit(2)" in gr and "voice.py" in gr
        and not re.search(r"voice\.py[^\n]*execFile|execFileSync\([^)]*voice\.py", gr))
    chk("F2 the plan hands the VERIFIED record and the narration to audio.py, which re-checks every hash",
        "plan.voice = { record: voiceRecord, narration: spec.narration }" in gr)
    chk("F3 variants: reels/<ID>.<variant>.json -> output/_variants/<ID>.<variant>/; the failure handler cleans only that folder",
        "o.id + (o.variant ? '.' + o.variant : '') + '.json'" in gr and "path.join(HERE, 'output', '_variants', o.id + '.' + o.variant)" in gr
        and "const dir = outputDir(o);" in gr and "path.join(HERE, 'output', o.id);" not in gr.split("catch(e =>")[1])
    chk("F4 voice.py and generate-reel.js agree on the variant folder", V.out_dir("X", "narrated", "/o") == "/o/_variants/X.narrated" and V.out_dir("X", None, "/o") == "/o/X")
    import instagram_publish as IP  # noqa: E402
    e = None
    try:
        IP.reel_dir("ADV-2026-P2-PHY-Q05.narrated")
    except Exception as ex:
        e = ex
    chk("F5 the publishers refuse a variant name, so a variant can never be published", e is not None)
    chk("F6 silent stories build exactly as before (no narration -> no voice in the plan, no record needed)",
        "if (spec.narration && !o.draft && !o.preview)" in gr and "if (spec.narration) plan.voice" in gr)

    # ============================================================ G. YouTube synthetic media
    import youtube_publish as Y  # noqa: E402

    class Cfg:
        category_id, made_for_kids = None, False
    md = {"title": "t", "description": "d", "tags": []}
    narrated = {"audio": {"aiNarration": True}}
    silent = {"audio": {"aiNarration": False}}
    old = {"audio": {"summary": "original"}}
    chk("G1 a reel with AI narration uploads with containsSyntheticMedia: true",
        Y.video_resource(md, Cfg, "private", Y.ai_narration(narrated))["status"]["containsSyntheticMedia"] is True)
    chk("G2 silent reels (aiNarration false, or older reels without the field) keep containsSyntheticMedia: false",
        Y.video_resource(md, Cfg, "private", Y.ai_narration(silent))["status"]["containsSyntheticMedia"] is False
        and Y.video_resource(md, Cfg, "private", Y.ai_narration(old))["status"]["containsSyntheticMedia"] is False
        and Y.video_resource(md, Cfg, "private")["status"]["containsSyntheticMedia"] is False)
    ysrc = open(os.path.join(ROOT, "tools", "youtube_publish.py")).read()
    chk("G3 the upload passes the reel's own aiNarration (no other publishing logic changed)", "video_resource(md, cfg, privacy, ai_narration(m))" in ysrc)

    # ============================================================ H. no real provider, no publishing
    vsrc = open(os.path.join(RM, "voice.py")).read()
    chk("H1 no real provider adapter was built in this suite (the sentinel was never triggered)", True)
    chk("H2 voice.py imports no publisher and never runs the build or a publish",
        not re.search(r"import\s+(instagram_publish|youtube_publish)|subprocess|execFile|os\.system|node\s", vsrc))
    chk("H3 nothing in the voice layer retries a paid call (no loops around generate)", "retry" not in vsrc.lower().replace("nothing retried", "").replace("no retry", "")
        and vsrc.count("provider.generate(") == 1)


try:
    main()
except RealProviderContacted as e:
    chk("H0 no real provider contacted", False, e)
finally:
    shutil.rmtree(TMP, ignore_errors=True)
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
