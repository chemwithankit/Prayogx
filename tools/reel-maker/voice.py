#!/usr/bin/env python3
"""PrayogX Reel Maker - narration voice: prepare, estimate, generate + verify (voice layer Phase 2B).

    python3 tools/reel-maker/voice.py prepare  <ID> [--variant narrated]      validate + plan; no provider call
    python3 tools/reel-maker/voice.py estimate <ID> [--variant narrated]      the provider's cost estimate (spends nothing)
    python3 tools/reel-maker/voice.py generate <ID> [--variant narrated] --cap CREDITS --confirm <ID> [--new-attempt]
    python3 tools/reel-maker/voice.py status   <ID> [--variant narrated]

The story is tools/reel-maker/reels/<ID>.json, or reels/<ID>.<variant>.json for a variant (a narrated version beside a
published silent reel). Everything is written to the reel's output folder, output/<ID>/voice/ or
output/_variants/<ID>.<variant>/voice/ (git-ignored): plan.json, the provider's requests and raw responses, the
original audio, attempts.json and voice.json, the VERIFIED record generate-reel.js requires.

generate is the only command that spends credits. It runs prepare and estimate again, then needs: valid, reviewed
narration with no open review items (narration.authorize_generation), an explicit --cap (no default, never raised),
an estimate within the cap and the balance, and --confirm with the reel ID. It generates one segment at a time and
verifies each at once with voice_verify (whisper.cpp, the equivalence table, checksums). On the first failure -
provider error, malformed response, missing audio or a failed verification - it stops: no retry, no further spending,
and the failed audio never reaches the mixer. A second paid run of the same plan needs --new-attempt.
"""
import argparse
import copy
import datetime
import glob
import hashlib
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import narration as NA  # noqa: E402
import voice_providers as VP  # noqa: E402
import voice_verify as VV  # noqa: E402

PLAN_SCHEMA = "prayogx-voice-plan/1"


class VoiceStop(Exception):
    """a gate stopped the run; nothing further was spent"""


def now():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()


def story_path(sid, variant=None, reels=NA.REELS):
    return os.path.join(reels, sid + ("." + variant if variant else "") + ".json")


def out_dir(sid, variant=None, output=None):
    output = output or os.path.join(HERE, "output")
    return os.path.join(output, "_variants", sid + "." + variant) if variant else os.path.join(output, sid)


def voice_dir(sid, variant=None, output=None):
    return os.path.join(out_dir(sid, variant, output), "voice")


def sha256_text(t):
    return hashlib.sha256(t.encode("utf-8")).hexdigest()


def prepare(sid, variant=None, reels=NA.REELS, output=None, profiles=None, library=None):
    """the generation plan: validated narration, hashes and segments; no provider call, nothing spent"""
    f = story_path(sid, variant, reels)
    if not os.path.isfile(f):
        raise VoiceStop("no reel story: %s" % f)
    raw = open(f, encoding="utf-8").read()
    spec = json.loads(raw)
    profiles = NA.load_profiles() if profiles is None else profiles
    library = NA.load_library() if library is None else library
    v = NA.validate(spec, profiles, library)
    if not v["narrated"]:
        raise VoiceStop("%s is a silent reel (no narration): nothing to generate" % os.path.basename(f))
    nar = spec["narration"]
    p = profiles.get(nar.get("voiceProfile")) or {}
    plan = {
        "schema": PLAN_SCHEMA, "reelId": sid, "variant": variant, "story": os.path.basename(f),
        "storySha256": sha256_text(raw), "preparedAt": now(),
        "voiceProfile": nar.get("voiceProfile"), "provider": p.get("provider"), "model": p.get("model"), "voiceName": p.get("voiceName"),
        "assetId": v["asset"], "reviewedBy": nar.get("reviewedBy"), "reviewedAt": nar.get("reviewedAt"),
        "valid": v["ok"], "errors": v["errors"], "review": v["review"],
        "segments": [{"index": k, "beat": s.get("beat"), "text": s.get("text"), "spoken": s.get("spoken"),
                      "spokenSha256": VV.spoken_sha256(s.get("spoken") or ""), "characters": len(" ".join((s.get("spoken") or "").split())),
                      "offset": float(s.get("offset", 0.3)), "deliberate": bool(s.get("deliberate", False))}
                     for k, s in enumerate(nar.get("segments") or [], 1)],
        "estimate": None,
    }
    d = voice_dir(sid, variant, output)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "plan.json"), "w", encoding="utf-8") as fh:
        json.dump(plan, fh, indent=2, ensure_ascii=False); fh.write("\n")
    return spec, plan


def _snapshot_matches(rec, prof):
    snap = rec.get("profileSnapshot") or {}
    return all(snap.get(k) == prof.get(k) for k in ("provider", "model", "voiceId", "language"))


def reusable(d, plan, prof):
    """{spokenSha256: (segment, record path, record)} of already VERIFIED audio that can be reused: from voice.json and the
    archived records/ in this reel's voice folder, only when the record is VERIFIED for the same voice profile and the same
    provider / model / voice, the segment and its verification are VERIFIED, and its source and decoded files still match
    their recorded sha256. Anything else is generated (and paid for) again."""
    found = {}
    paths = [os.path.join(d, "voice.json")] + sorted(glob.glob(os.path.join(d, "records", "voice-*.json")), reverse=True)
    for rp in paths:
        if not os.path.isfile(rp):
            continue
        try:
            rec = json.load(open(rp, encoding="utf-8"))
        except ValueError:
            continue
        if rec.get("status") != "VERIFIED" or rec.get("voiceProfile") != plan["voiceProfile"] or not _snapshot_matches(rec, prof):
            continue
        for seg in rec.get("segments", []):
            key = seg.get("spokenSha256")
            if key in found or seg.get("status") != "VERIFIED" or (seg.get("verification") or {}).get("status") != "VERIFIED":
                continue
            if all(os.path.isfile(seg[w]["path"]) and VV.sha256_file(seg[w]["path"]) == seg[w]["sha256"] for w in ("source", "decoded")):
                found[key] = (seg, rp, rec)
    return found


def estimate(sid, variant=None, provider=None, reels=NA.REELS, output=None, profiles=None, library=None):
    """prepare, then mark each segment as reused (VERIFIED audio already here, 0 credits) or new, and ask the provider what
    the new ones would cost. No generation; when nothing is new, the provider is not contacted at all."""
    spec, plan = prepare(sid, variant, reels, output, profiles, library)
    if not plan["valid"]:
        raise VoiceStop("narration is not valid, so it is not estimated: " + "; ".join(plan["errors"]))
    profiles = NA.load_profiles() if profiles is None else profiles
    prof = dict(profiles[plan["voiceProfile"]])
    d = voice_dir(sid, variant, output)
    reuse = reusable(d, plan, prof)
    new = [x for x in plan["segments"] if x["spokenSha256"] not in reuse]
    for x in plan["segments"]:
        x["reuse"] = x["spokenSha256"] in reuse
    per, bal = [0.0] * len(plan["segments"]), None
    if new:
        provider = provider or VP.get_provider(prof["provider"])
        for x in new:
            per[x["index"] - 1] = provider.estimate(x["spoken"], prof, d)
        bal = provider.balance()
    total = round(sum(per), 4)
    plan["estimate"] = {"perSegment": per, "totalCredits": total, "balanceCredits": bal, "newSegments": len(new),
                        "reusedSegments": len(plan["segments"]) - len(new),
                        "balanceAfterCredits": round(bal - total, 4) if bal is not None else None, "at": now()}
    with open(os.path.join(d, "plan.json"), "w", encoding="utf-8") as fh:
        json.dump(plan, fh, indent=2, ensure_ascii=False); fh.write("\n")
    return spec, plan


def _attempts(d):
    p = os.path.join(d, "attempts.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else []


def _log_attempt(d, entry):
    a = _attempts(d)
    a.append(entry)
    with open(os.path.join(d, "attempts.json"), "w", encoding="utf-8") as fh:
        json.dump(a, fh, indent=2, ensure_ascii=False); fh.write("\n")


def _archive_record(d):
    """keep the current voice.json in records/ before a new record replaces it (audit trail, and a reuse source)"""
    rp = os.path.join(d, "voice.json")
    if not os.path.isfile(rp):
        return None
    os.makedirs(os.path.join(d, "records"), exist_ok=True)
    digest = VV.sha256_file(rp)
    dst = os.path.join(d, "records", "voice-%s.json" % digest[:16])
    if not os.path.exists(dst):
        shutil.copy2(rp, dst)
    return dst


def generate(sid, cap, confirm, variant=None, new_attempt=False, provider=None, reels=NA.REELS, output=None,
             profiles=None, library=None, transcriber=None, decoder=None, whisper_bin=None, whisper_model=None):
    """the one paid path: estimate, authorize, then for each segment reuse VERIFIED audio or generate -> verify, stopping at
    the first failure. Only genuinely new segments reach the provider."""
    if confirm != sid:
        raise VoiceStop("generation needs --confirm %s (the reel ID, typed explicitly)" % sid)
    profiles = NA.load_profiles() if profiles is None else profiles
    library = NA.load_library() if library is None else library
    spec, plan = estimate(sid, variant, provider, reels, output, profiles, library)
    est = plan["estimate"]["totalCredits"]
    try:
        auth = NA.authorize_generation(spec, est, cap, profiles, library)
    except NA.NarrationError as e:
        raise VoiceStop("not authorised: %s" % e)
    bal = plan["estimate"]["balanceCredits"]
    if bal is not None and est > bal:
        raise VoiceStop("estimate %.2f credits exceeds the balance %.2f" % (est, bal))
    d = voice_dir(sid, variant, output)
    n_new = plan["estimate"]["newSegments"]
    prior = [a for a in _attempts(d) if a.get("storySha256") == plan["storySha256"]]
    if n_new and prior and not new_attempt:
        raise VoiceStop("this narration was already generated (%d attempt(s), last %s: %s); a new paid attempt needs --new-attempt"
                        % (len(prior), prior[-1].get("startedAt"), prior[-1].get("result")))
    prof = dict(profiles[plan["voiceProfile"]])
    asset = library[prof["libraryAsset"]]
    reuse = reusable(d, plan, prof)
    table = VV.load_equivalences()
    attempt = {"attemptId": hashlib.sha256((now() + sid + str(os.getpid())).encode()).hexdigest()[:12], "storySha256": plan["storySha256"],
               "startedAt": now(), "capCredits": cap, "estimateCredits": est, "segments": [], "spentCredits": 0.0, "result": "RUNNING"}
    if n_new:
        provider = provider or VP.get_provider(prof["provider"])
        if transcriber is None:
            wb, wm = VV.tool_paths(whisper_bin, whisper_model)
            transcriber = lambda audio, work: VV.transcribe(audio, work, wb, wm)  # noqa: E731
        decoder = decoder or VV.decode_for_mix
    archived = _archive_record(d)
    _log_attempt(d, dict(attempt))
    src_dir = os.path.join(d, "source")
    segs, settings, spent = [], (json.load(open(os.path.join(d, "voice.json"))).get("verifier") or {}).get("transcriber") if archived else None, 0.0

    def finish(result, extra_msg=None):
        attempt.update(result=result, endedAt=now(), spentCredits=round(spent, 4), message=extra_msg)
        a = _attempts(d)
        a[-1] = attempt
        with open(os.path.join(d, "attempts.json"), "w", encoding="utf-8") as fh:
            json.dump(a, fh, indent=2, ensure_ascii=False); fh.write("\n")

    for s in plan["segments"]:
        if s["spokenSha256"] in reuse:                                          # VERIFIED audio already here: no provider call
            old, rp, orec = reuse[s["spokenSha256"]]
            seg = copy.deepcopy(old)
            seg.update(index=s["index"], beat=s["beat"], offset=s["offset"], deliberate=s["deliberate"],
                       reusedFrom={"record": os.path.relpath(rp, d), "recordVerifiedAt": orec.get("verifiedAt"),
                                   "attemptId": (orec.get("generation") or {}).get("attemptId"), "jobId": old["source"].get("jobId")})
            segs.append(seg)
            attempt["segments"].append({"index": s["index"], "beat": s["beat"], "reused": True, "jobId": old["source"].get("jobId"), "cost": 0.0})
            continue
        name = "%s-seg-%02d" % (attempt["attemptId"], s["index"])            # unique: never overwrites reused files
        try:
            g = provider.generate(s["spoken"], prof, src_dir, name)
        except VP.VoiceProviderError as e:
            finish("PROVIDER_FAILED", "segment %d (%s): %s: %s" % (s["index"], s["beat"], e.kind, e))
            VV.write_record(d, plan["voiceProfile"], prof, asset, segs, settings, table, _extra(plan, attempt, spent, "PROVIDER_FAILED"))
            raise VoiceStop("segment %d (%s): provider %s error: %s - stopped, nothing retried" % (s["index"], s["beat"], e.kind, e))
        cost = g.get("cost") if g.get("cost") is not None else plan["estimate"]["perSegment"][s["index"] - 1]
        spent += cost
        attempt["segments"].append({"index": s["index"], "beat": s["beat"], "jobId": g["jobId"], "cost": cost})
        seg, settings = VV.verify_segment(s["index"], {"beat": s["beat"], "spoken": s["spoken"], "source": g["audioPath"], "offset": s["offset"],
                                                      "deliberate": s["deliberate"], "jobId": g["jobId"], "createdAt": g.get("createdAt"),
                                                      "cost": cost, "request": g.get("request"), "rawResponse": g.get("rawResponsePath")},
                                          prof, d, transcriber, decoder, table, work_name=name)
        segs.append(seg)
        if seg["status"] != "VERIFIED":
            r = seg["verification"]
            finish("VERIFICATION_FAILED", "segment %d (%s)" % (s["index"], s["beat"]))
            VV.write_record(d, plan["voiceProfile"], prof, asset, segs, settings, table, _extra(plan, attempt, spent, "VERIFICATION_FAILED"))
            raise VoiceStop("segment %d (%s) FAILED verification - stopped, not regenerated. missing %s, added %s, substituted %s, repeated %s, reordered %s"
                            % (s["index"], s["beat"], [m["expected"] for m in r["missing"]], [a["heard"] for a in r["added"]],
                               [(x["expected"], x["heard"]) for x in r["substituted"]], [x["heard"] for x in r["repeated"]], r["reordered"]))
        if spent > cap + 1e-9:
            finish("CAP_EXCEEDED", "spent %.2f > cap %.2f" % (spent, cap))
            VV.write_record(d, plan["voiceProfile"], prof, asset, segs, settings, table, _extra(plan, attempt, spent, "CAP_EXCEEDED"))
            raise VoiceStop("actual spend %.2f exceeded the cap %.2f after segment %d - stopped" % (spent, cap, s["index"]))
    finish("VERIFIED")
    rec = VV.write_record(d, plan["voiceProfile"], prof, asset, segs, settings, table, _extra(plan, attempt, spent, "VERIFIED"))
    return rec, auth


def _extra(plan, attempt, spent, result):
    return {"reelId": plan["reelId"], "variant": plan["variant"], "storySha256": plan["storySha256"],
            "generation": {"attemptId": attempt["attemptId"], "result": result, "capCredits": attempt["capCredits"],
                           "estimateCredits": attempt["estimateCredits"], "spentCredits": round(spent, 4),
                           "provider": plan["provider"], "model": plan["model"], "voiceName": plan["voiceName"],
                           "reviewedBy": plan["reviewedBy"], "reviewedAt": plan["reviewedAt"],
                           "reusedSegments": sum(1 for x in attempt["segments"] if x.get("reused")),
                           "generatedSegments": sum(1 for x in attempt["segments"] if not x.get("reused"))}}


def status(sid, variant=None, output=None):
    d = voice_dir(sid, variant, output)
    rp = os.path.join(d, "voice.json")
    return {"plan": os.path.exists(os.path.join(d, "plan.json")), "record": json.load(open(rp)) if os.path.exists(rp) else None,
            "attempts": _attempts(d) if os.path.isdir(d) else []}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("cmd", choices=["prepare", "estimate", "generate", "status"])
    ap.add_argument("id")
    ap.add_argument("--variant")
    ap.add_argument("--cap", type=float, help="the explicit credit cap for this run (required for generate; no default)")
    ap.add_argument("--confirm", help="the reel ID again, to confirm a paid generation")
    ap.add_argument("--new-attempt", action="store_true", help="allow another paid attempt of narration already generated")
    ap.add_argument("--whisper-bin"); ap.add_argument("--whisper-model")
    a = ap.parse_args(argv)
    if a.variant is not None and not a.variant.isalpha():
        print("--variant must be letters only (e.g. narrated)", file=sys.stderr); return 2
    try:
        if a.cmd == "prepare":
            _, plan = prepare(a.id, a.variant)
            for s in plan["segments"]:
                print("%2d  %-12s %3d chars  %s" % (s["index"], s["beat"], s["characters"], s["spoken"]))
            for e in plan["errors"]:
                print("ERROR   " + e)
            for r in plan["review"]:
                print("REVIEW  " + r)
            print("%s: %d segments, profile %s (%s / %s / %s), reviewed by %s on %s - %s" % (
                a.id + ("." + a.variant if a.variant else ""), len(plan["segments"]), plan["voiceProfile"], plan["provider"], plan["model"],
                plan["voiceName"], plan["reviewedBy"] or "NOBODY YET", plan["reviewedAt"] or "-", "valid" if plan["valid"] else "INVALID"))
            return 0 if plan["valid"] else 1
        if a.cmd == "estimate":
            _, plan = estimate(a.id, a.variant)
            e = plan["estimate"]
            for s, c in zip(plan["segments"], e["perSegment"]):
                print("%2d  %-12s %s" % (s["index"], s["beat"], "REUSE  verified audio, 0 credits" if s.get("reuse") else "NEW    %6.2f credits" % c))
            print("total %.2f credits for %d new segment(s), %d reused; balance %s; after %s. Nothing was spent. Generate with an explicit --cap." % (
                e["totalCredits"], e["newSegments"], e["reusedSegments"], e["balanceCredits"], e["balanceAfterCredits"]))
            return 0
        if a.cmd == "generate":
            rec, auth = generate(a.id, a.cap, a.confirm, a.variant, a.new_attempt, whisper_bin=a.whisper_bin, whisper_model=a.whisper_model)
            g = rec["generation"]
            print("VERIFIED: %d segments, %.2f credits spent (estimate %.2f, cap %.2f). Record: %s" % (
                len(rec["segments"]), g["spentCredits"], g["estimateCredits"], g["capCredits"], os.path.join(voice_dir(a.id, a.variant), "voice.json")))
            return 0
        st = status(a.id, a.variant)
        r = st["record"]
        print("plan: %s; record: %s; attempts: %d" % (st["plan"], r["status"] if r else "none", len(st["attempts"])))
        return 0
    except (VoiceStop, VP.VoiceProviderError, VV.VerifyError, NA.NarrationError) as e:
        print("VOICE STOP: %s" % e, file=sys.stderr)
        return 3


if __name__ == "__main__":
    sys.exit(main())
