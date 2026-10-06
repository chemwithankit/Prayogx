#!/usr/bin/env python3
"""PrayogX Reel Maker - narration: offline validation and the generation gate (Phase 1, no provider calls).

    python3 tools/reel-maker/narration.py check <SIMULATION-ID>     validate reels/<ID>.json's narration (or report silent)
    python3 tools/reel-maker/narration.py profiles                  list the voice profiles and their library assets

A story spec may carry, beside "story":

    "narration": {
      "voiceProfile": "prayogx-en-emily-v1",              a profile in voice_profiles.json
      "reviewedBy": "Ankit", "reviewedAt": "2026-10-03",   who reviewed the spoken forms (needed to authorise generation)
      "segments": [
        {"beat": "hook",     "text": "Can you solve this?", "spoken": "Can you solve this?"},
        {"beat": "moment-A", "text": "ΔG° = ΔH° − TΔS°",
         "spoken": "delta G naught equals delta H naught minus T delta S naught",
         "acknowledge": ["JEE"]}                           optional: tokens a person checked (see review findings)
      ]
    }

"text" is the on-screen, exact scientific form. "spoken" is the exact, human-reviewed form the voice says. Nothing
here derives "spoken" from "text": notation left in "spoken" is an error, and suspicious tokens go to review.

No narration means a silent reel: valid, nothing to generate, no disclosure. This module never calls a provider,
spends credits, builds a reel or publishes; authorize_generation() only decides whether a later, explicit
generation step may run (tools/reel-maker/README.md -> Voiceover).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROFILES = os.path.join(HERE, "voice_profiles.json")
LIBRARY = os.path.join(HERE, "audio_library.json")
REELS = os.path.join(HERE, "reels")

FIXED_BEATS = ["hook", "context", "question", "problem", "curiosity", "answer", "payoff"]   # composer.js add(...)

# notation that must never reach a voice: digits, sub/superscripts, Greek, operators and arrows, markup
NOTATION = [
    (re.compile(r"[0-9]"), "digit (write the number in words)"),
    (re.compile(r"[⁰-₟²³¹]"), "superscript or subscript character"),
    (re.compile(r"[Ͱ-Ͽ]"), "Greek letter (write its name, e.g. delta)"),
    (re.compile(r"[=+−×÷*/^_<>≤≥≈≠∝√∑∫°%~|\\]"), "math or unit symbol"),
    (re.compile(r"[←-⇿⟶⟷]|->|<-|<=>"), "arrow (write it in words)"),
    (re.compile(r"[\[\]{}()`]"), "brackets or markup (say it, or leave it on screen)"),
]
# placeholders: TODO/TBD/FIXME/XXX, "??", {{...}}, <word ...> and [lower-case words] - but not chemistry such as [H+], [OH-]
PLACEHOLDER = re.compile(r"\bTODO\b|\bTBD\b|\bFIXME\b|XXX|\?\?|\{\{|\}\}|<[A-Za-z_][A-Za-z_ ]{2,}>|\[\s*[a-z][a-z ]{3,}\]|lorem ipsum")
# tokens a person must check: chemical-looking or acronym-like (two or more capitals, e.g. NaCl, CO, JEE),
# or a run of single capital letters that may be a formula read letter by letter (e.g. "K p", "O H")
MULTICAP = re.compile(r"\b(?=[A-Za-z]*[A-Z][a-z]*[A-Z])[A-Za-z]{2,}\b")
LETTER_RUN = re.compile(r"\b[A-Z](?:\s+[A-Z])+\b")

# "Narrate the story, not the screen" (README -> Voiceover, Narration model). A segment's optional mode says how its
# spoken line relates to the beat; a beat with no segment is silent, which is always valid.
MODES = ("explanation", "condensed", "spoken-text", "interpretation")
PROBLEM_BEATS = ("question", "problem")
LONG_PROBLEM_WORDS = 30      # a question/problem narration longer than this should be condensed or skipped
SCREEN_READ_WORDS = 12       # a spoken line repeating more on-screen text than this reads the screen
BEAT_DEFAULTS = {"hook": None, "context": 1.25, "problem": 2.3, "curiosity": 2.0, "answer": 4.4, "payoff": 3.0}   # story.beatSeconds (lengthen only)


def words(t):
    return re.findall(r"[a-z0-9']+", (t or "").lower())


class NarrationError(Exception):
    pass


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_profiles(path=PROFILES):
    return load_json(path).get("profiles", {})


def load_library(path=LIBRARY):
    return {a["assetId"]: a for a in load_json(path)["assets"]}


def story_beats(spec):
    """the beat ids the composer will build for this story: fixed beats plus one per moment. A concept explainer
    (template concept-explainer-v1, tools/reel-maker/generate-explainer.js) has no question beats: its beats are its
    own scenes, in order."""
    if (spec or {}).get("template") == "concept-explainer-v1":
        return list((spec or {}).get("scenes") or [])
    moments = ((spec or {}).get("story") or {}).get("moments") or []
    return FIXED_BEATS[:5] + ["moment-" + str(m.get("id")) for m in moments if m.get("id") is not None] + FIXED_BEATS[5:]


def resolve_profile(profile_id, profiles, library):
    """(profile, asset, problems): the profile, its library asset, and why it cannot be used (empty when usable)"""
    why = []
    p = profiles.get(profile_id) if profile_id else None
    if not profile_id:
        return None, None, ["narration.voiceProfile is missing"]
    if not p:
        return None, None, ["voice profile %r is not in voice_profiles.json" % profile_id]
    for k in ("provider", "model", "voiceId", "language", "libraryAsset", "status"):
        if not p.get(k):
            why.append("profile %r has no %s" % (profile_id, k))
    a = library.get(p.get("libraryAsset"))
    if not a:
        why.append("profile %r: library asset %r is not in audio_library.json" % (profile_id, p.get("libraryAsset")))
        return p, None, why
    if a.get("role") != "voice":
        why.append("asset %r has role %r, not voice" % (a["assetId"], a.get("role")))
    if a.get("source") != "external-tts":
        why.append("asset %r has source %r, not external-tts" % (a["assetId"], a.get("source")))
    if a.get("licenseVerified") is not True or a.get("commercialUse") is not True:
        why.append("asset %r: licence not verified for commercial use" % a["assetId"])
    if not a.get("licenseDocument"):
        why.append("asset %r: no licence document" % a["assetId"])
    if profile_id not in (a.get("voiceProfiles") or []):
        why.append("asset %r does not list profile %r" % (a["assetId"], profile_id))
    if a.get("disclosureRequired") is not False and not (a.get("disclosureText") or "").strip():
        why.append("asset %r: no disclosureText" % a["assetId"])
    return p, a, why


def spoken_findings(spoken, acknowledged=()):
    """(errors, review) for one spoken form: notation is an error; acronym- or formula-like tokens need review"""
    errors, review = [], []
    for rx, what in NOTATION:
        hits = sorted(set(m.group(0) for m in rx.finditer(spoken)))
        if hits:
            errors.append("%s in spoken form: %s" % (what, " ".join(hits)))
    ack = set(acknowledged or ())
    for tok in sorted(set(MULTICAP.findall(spoken)) - ack):
        review.append("check how %r is spoken (acronym or formula?)" % tok)
    for run in sorted(set(LETTER_RUN.findall(spoken)) - ack):
        review.append("check the letter sequence %r (spelled letter by letter?)" % run)
    return errors, review


def validate(spec, profiles=None, library=None):
    """{"narrated", "ok", "errors", "review", "profile", "asset", "disclosureText", "segments"} for a story spec.
    A spec without narration is a valid silent reel. Never raises for content problems; they are listed."""
    profiles = load_profiles() if profiles is None else profiles
    library = load_library() if library is None else library
    nar = (spec or {}).get("narration")
    if nar is None:
        return {"narrated": False, "ok": True, "errors": [], "review": [], "profile": None, "asset": None,
                "disclosureText": None, "segments": 0}
    errors, review = [], []
    if not isinstance(nar, dict):
        return {"narrated": True, "ok": False, "errors": ["narration must be an object"], "review": [], "profile": None,
                "asset": None, "disclosureText": None, "segments": 0}
    p, a, why = resolve_profile(nar.get("voiceProfile"), profiles, library)
    errors += why
    segs = nar.get("segments")
    if not isinstance(segs, list) or not segs:
        errors.append("narration.segments must be a non-empty list (remove narration for a silent reel)")
        segs = []
    beats = set(story_beats(spec))
    bs = ((spec or {}).get("story") or {}).get("beatSeconds") or {}
    if not isinstance(bs, dict):
        errors.append("story.beatSeconds must be an object of beat -> seconds")
        bs = {}
    for k, val in bs.items():
        if k not in BEAT_DEFAULTS:
            errors.append("story.beatSeconds: %r is not a fixed beat (%s; moments and the question use their own seconds)" % (k, ", ".join(BEAT_DEFAULTS)))
        elif isinstance(val, bool) or not isinstance(val, (int, float)) or val <= 0 or val > 30:
            errors.append("story.beatSeconds.%s must be a number of seconds (0-30], got %r" % (k, val))
    seen = set()
    for i, s in enumerate(segs):
        tag = "segment %d" % (i + 1)
        if not isinstance(s, dict):
            errors.append(tag + ": not an object"); continue
        beat, text, spoken = s.get("beat"), s.get("text"), s.get("spoken")
        tag += " (%s)" % beat if beat else ""
        if not beat:
            errors.append(tag + ": no beat")
        elif beat not in beats:
            errors.append(tag + ": beat %r is not in this story (beats: %s)" % (beat, ", ".join(story_beats(spec))))
        if not isinstance(text, str) or not text.strip():
            errors.append(tag + ": no text")
        elif PLACEHOLDER.search(text):
            errors.append(tag + ": unresolved placeholder in text: %r" % PLACEHOLDER.search(text).group(0))
        if spoken is None:
            errors.append(tag + ": no spoken form")
        elif not isinstance(spoken, str) or not spoken.strip():
            errors.append(tag + ": spoken form is empty")
        else:
            if PLACEHOLDER.search(spoken):
                errors.append(tag + ": unresolved placeholder in spoken form: %r" % PLACEHOLDER.search(spoken).group(0))
            e, r = spoken_findings(spoken, s.get("acknowledge"))
            errors += [tag + ": " + x for x in e]
            review += [tag + ": " + x for x in r]
            ack = set(s.get("acknowledge") or ())
            sw, tw = words(spoken), words(text if isinstance(text, str) else "")
            if beat in PROBLEM_BEATS and len(sw) > LONG_PROBLEM_WORDS and "long" not in ack:
                review.append(tag + ": %d spoken words on the %s - condense it to one conceptual sentence, or leave this beat silent "
                                     "(acknowledge 'long' only if the full reading is intended)" % (len(sw), beat))
            if sw and sw == tw and len(tw) > SCREEN_READ_WORDS and "reads-screen" not in ack:
                review.append(tag + ": the spoken line repeats %d words of on-screen text verbatim - narrate the story, not the screen "
                                     "(acknowledge 'reads-screen' only if that is intended)" % len(tw))
        mode = s.get("mode")
        if mode is not None and mode not in MODES:
            errors.append(tag + ": mode %r is not one of %s" % (mode, ", ".join(MODES)))
        key = (beat, float(s.get("offset", 0.3)))
        if beat and key in seen:
            errors.append(tag + ": a second segment on the same beat at the same offset (give it its own offset)")
        seen.add(key)
    disclosure = (a or {}).get("disclosureText") if a else None
    return {"narrated": True, "ok": not errors, "errors": errors, "review": review,
            "profile": nar.get("voiceProfile"), "asset": (a or {}).get("assetId"), "disclosureText": disclosure,
            "segments": len(segs)}


def authorize_generation(spec, estimate_credits, cap_credits, profiles=None, library=None):
    """Decide whether a paid generation may run. Returns the authorisation record or raises NarrationError.
    Never generates. There is no default cap: the caller must pass one explicitly for the run."""
    v = validate(spec, profiles, library)
    if not v["narrated"]:
        raise NarrationError("silent reel: no narration, nothing to generate")
    if not v["ok"]:
        raise NarrationError("narration is not valid: " + "; ".join(v["errors"]))
    if v["review"]:
        raise NarrationError("spoken forms need human review (add the checked tokens to 'acknowledge'): " + "; ".join(v["review"]))
    nar = spec["narration"]
    if not (nar.get("reviewedBy") and nar.get("reviewedAt")):
        raise NarrationError("narration.reviewedBy and narration.reviewedAt are required: a person must review the spoken forms first")
    if cap_credits is None:
        raise NarrationError("no credit cap: pass an explicit per-run cap (there is no default)")
    if isinstance(cap_credits, bool) or not isinstance(cap_credits, (int, float)) or cap_credits <= 0:
        raise NarrationError("credit cap must be a positive number, got %r" % (cap_credits,))
    if estimate_credits is None:
        raise NarrationError("no cost estimate: a provider adapter must estimate before generation (none exists in Phase 1)")
    if isinstance(estimate_credits, bool) or not isinstance(estimate_credits, (int, float)) or estimate_credits < 0:
        raise NarrationError("invalid cost estimate %r" % (estimate_credits,))
    if estimate_credits > cap_credits:
        raise NarrationError("estimate %.2f credits exceeds the cap %.2f - stopped before any generation" % (estimate_credits, cap_credits))
    return {"authorized": True, "profile": v["profile"], "asset": v["asset"], "segments": v["segments"],
            "estimateCredits": estimate_credits, "capCredits": cap_credits}


def main(argv):
    if len(argv) >= 1 and argv[0] == "profiles":
        lib = load_library()
        for pid, p in load_profiles().items():
            _, a, why = resolve_profile(pid, load_profiles(), lib)
            print("%s  %s/%s/%s  %s  %s  %s" % (pid, p.get("provider"), p.get("model"), p.get("voiceName"), p.get("language"),
                                             p.get("status"), "usable" if not why else "NOT USABLE: " + "; ".join(why)))
        return 0
    if len(argv) == 2 and argv[0] == "check":
        f = os.path.join(REELS, argv[1] + ".json")
        if not os.path.exists(f):
            print("no reel story: " + f, file=sys.stderr); return 2
        v = validate(load_json(f))
        if not v["narrated"]:
            print("%s: silent reel (no narration) - valid, nothing to generate" % argv[1]); return 0
        for e in v["errors"]:
            print("ERROR   " + e)
        for r in v["review"]:
            print("REVIEW  " + r)
        print("%s: %d segments, profile %s - %s" % (argv[1], v["segments"], v["profile"],
                                                     "valid" if v["ok"] else "INVALID") + ("" if not v["review"] else ", %d items need review" % len(v["review"])))
        return 0 if v["ok"] else 1
    print(__doc__.split("\n\n")[1])
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
