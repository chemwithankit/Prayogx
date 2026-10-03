#!/usr/bin/env python3
"""tools/reel-maker/narration.py - the offline narration foundation (voice layer Phase 1), with fake data only.

No provider, no network, no credentials, no credits: every profile and library here is an in-memory fixture, and the
real repository files are only read. Sections: A profiles, B narration structure, C spoken-form notation, D beats,
E disclosure, F silent reels, G the generation gate (credit cap), H the real repository files, I no provider calls.

Run:  python3 tests/test_narration.py
"""
import copy
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RM = os.path.join(ROOT, "tools", "reel-maker")
sys.path.insert(0, RM)
import narration as N  # noqa: E402

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or not detail else "  -> " + str(detail)))


def raises(fn, *a, **k):
    try:
        fn(*a, **k)
    except N.NarrationError as e:
        return str(e)
    return None


# ------------------------------------------------------------------ fixtures (fake provider, fake asset)
PROFILES = {
    "test-voice-a": {"profileId": "test-voice-a", "status": "provisional", "provider": "fakeprov", "model": "fake-model-1",
                     "voiceId": "voice-123", "voiceName": "Testa", "language": "en", "libraryAsset": "voice-fake"},
    "test-voice-b": {"profileId": "test-voice-b", "status": "provisional", "provider": "otherprov", "model": "other-2",
                     "voiceId": "v-9", "voiceName": "Bee", "language": "en", "libraryAsset": "voice-other"},
}
ASSET = {"assetId": "voice-fake", "role": "voice", "source": "external-tts", "provider": "fakeprov", "voiceProfiles": ["test-voice-a"],
         "license": "test", "licenseDocument": "x.md", "licenseVerified": True, "commercialUse": True,
         "permittedUse": ["instagram", "youtube"], "disclosureRequired": True, "disclosureText": "Narration: test disclosure."}
LIBRARY = {"voice-fake": ASSET,
           "voice-other": dict(ASSET, assetId="voice-other", provider="otherprov", voiceProfiles=["test-voice-b"]),
           "prayogx-score-v2": {"assetId": "prayogx-score-v2", "role": "music", "source": "generated"}}
STORY = {"story": {"moments": [{"id": "A"}, {"id": "B"}]}}


def spec(segments=None, profile="test-voice-a", reviewed=True, **extra):
    s = copy.deepcopy(STORY)
    s["narration"] = {"voiceProfile": profile, "segments": segments if segments is not None else [
        {"beat": "hook", "text": "Can you solve this?", "spoken": "Can you solve this?"},
        {"beat": "moment-A", "text": "ΔG° = ΔH° − TΔS°",
         "spoken": "delta G naught equals delta H naught minus T delta S naught"}]}
    if reviewed:
        s["narration"].update(reviewedBy="Tester", reviewedAt="2026-10-03")
    s["narration"].update(extra)
    return s


def V(s, profiles=PROFILES, library=LIBRARY):
    return N.validate(s, profiles, library)


def main():
    # ============================================================ A. profiles
    p, a, why = N.resolve_profile("test-voice-a", PROFILES, LIBRARY)
    chk("A1 a valid voice profile resolves to its voice asset with no problems", why == [] and a["assetId"] == "voice-fake", why)
    v = V(spec(profile="no-such-voice"))
    chk("A2 a missing (unknown) voice profile is an error", not v["ok"] and any("not in voice_profiles.json" in e for e in v["errors"]), v["errors"])
    v = V(spec(profile=None))
    chk("A3 a narrated reel without voiceProfile is an error", not v["ok"] and any("voiceProfile is missing" in e for e in v["errors"]), v["errors"])
    bad = dict(PROFILES, broken={"profileId": "broken", "provider": "fakeprov", "model": "m", "voiceId": "v", "language": "en",
                                 "status": "provisional", "libraryAsset": "voice-missing"})
    v = V(spec(profile="broken"), profiles=bad)
    chk("A4 a profile whose library asset is missing is an error", not v["ok"] and any("not in audio_library.json" in e for e in v["errors"]), v["errors"])
    lib2 = dict(LIBRARY, **{"voice-fake": dict(ASSET, licenseVerified=False)})
    v = V(spec(), library=lib2)
    chk("A5 a voice asset whose licence is not verified is an error", not v["ok"] and any("licence not verified" in e for e in v["errors"]), v["errors"])
    lib3 = dict(LIBRARY, **{"voice-fake": dict(ASSET, role="music")})
    chk("A6 a profile pointing at a non-voice asset is an error", any("not voice" in e for e in V(spec(), library=lib3)["errors"]))
    va, vb = V(spec(profile="test-voice-a")), V(spec(profile="test-voice-b"))
    chk("A7 provider-neutral: two profiles from different providers validate the same narration identically",
        va["ok"] and vb["ok"] and va["asset"] == "voice-fake" and vb["asset"] == "voice-other", (va["errors"], vb["errors"]))

    # ============================================================ B. narration structure
    v = V(spec())
    chk("B1 a valid narration validates: beats, text and spoken forms, no review items", v["ok"] and v["review"] == [] and v["segments"] == 2, (v["errors"], v["review"]))
    v = V(spec([{"beat": "hook", "text": "Can you solve this?"}]))
    chk("B2 a segment without a spoken form is an error", not v["ok"] and any("no spoken form" in e for e in v["errors"]), v["errors"])
    v = V(spec([{"beat": "hook", "text": "Can you solve this?", "spoken": "   "}]))
    chk("B3 an empty spoken form is an error", not v["ok"] and any("spoken form is empty" in e for e in v["errors"]), v["errors"])
    v = V(spec([{"beat": "hook", "spoken": "Can you solve this?"}]))
    chk("B4 a segment without text is an error", not v["ok"] and any("no text" in e for e in v["errors"]), v["errors"])
    v = V(spec([{"text": "x", "spoken": "x"}]))
    chk("B5 a segment without a beat is an error", not v["ok"] and any("no beat" in e for e in v["errors"]), v["errors"])
    v = V(spec([]))
    chk("B6 narration with no segments is an error (remove narration for a silent reel)", not v["ok"] and any("non-empty list" in e for e in v["errors"]), v["errors"])
    v = V(spec([{"beat": "hook", "text": "TODO: the hook", "spoken": "Can you solve this?"},
                {"beat": "payoff", "text": "Done.", "spoken": "{{closing line}}"}]))
    chk("B7 unresolved placeholders (TODO, {{...}}) are errors in text and spoken", not v["ok"] and sum("placeholder" in e for e in v["errors"]) == 2, v["errors"])
    v = V(spec([{"beat": "moment-A", "text": "[H+] rises", "spoken": "the hydrogen ion concentration rises"}]))
    chk("B8 chemistry brackets in the on-screen text are not mistaken for placeholders", v["ok"], v["errors"])

    # ============================================================ C. spoken-form notation
    cases = {"H2SO4": "digit", "ΔG°": "Greek", "Fe²⁺": "superscript", "x = 3": "math or unit symbol",
             "A → B": "arrow", "E°cell": "math or unit symbol", "10^-9": "math or unit symbol", "f(x)": "brackets"}
    res = {raw: V(spec([{"beat": "moment-A", "text": raw, "spoken": raw}])) for raw in cases}
    bad_c = [raw for raw, want in cases.items() if res[raw]["ok"] or not any(want in e for e in res[raw]["errors"])]
    chk("C1 raw notation left in the spoken form is an error (digits, Greek, sub/superscripts, symbols, arrows, brackets)", bad_c == [],
        {k: res[k]["errors"] for k in bad_c})
    v = V(spec([{"beat": "moment-A", "text": "H₂SO₄", "spoken": "For sulfuric acid, H two S O four, the first ionization is complete."}]))
    chk("C2 the reviewed spoken form 'H two S O four' passes and its letter run goes to review, not error",
        v["ok"] and any("H two S O four" in r or "'H'" in r or "S O" in r for r in v["review"]), (v["errors"], v["review"]))
    v = V(spec([{"beat": "hook", "text": "NaCl", "spoken": "Is NaCl ionic?"}]))
    chk("C3 a formula-like token (NaCl) is flagged for human review, never auto-rewritten", v["ok"] and any("NaCl" in r for r in v["review"])
        and v.get("errors") == [], v["review"])
    v = V(spec([{"beat": "hook", "text": "JEE", "spoken": "A JEE classic.", "acknowledge": ["JEE"]}]))
    chk("C4 a token a person acknowledged is no longer a review item", v["ok"] and v["review"] == [], v["review"])
    chk("C5 hyphenated number words and apostrophes are allowed ('ninety-six', wire's)",
        V(spec([{"beat": "hook", "text": "96 485", "spoken": "ninety-six thousand four hundred eighty-five; the wire's area"}]))["ok"])
    chk("C6 the validator never derives or changes the spoken form", spec()["narration"]["segments"][1]["spoken"] == "delta G naught equals delta H naught minus T delta S naught"
        and "spoken" not in json.dumps(V(spec())).replace('"segments"', ""))

    # ============================================================ D. beats
    v = V(spec([{"beat": "moment-Z", "text": "x", "spoken": "x"}]))
    chk("D1 a segment on a beat the story does not have is an error", not v["ok"] and any("not in this story" in e for e in v["errors"]), v["errors"])
    chk("D2 the story's beats are the composer's: hook, context, question, problem, curiosity, moment-<id>..., answer, payoff",
        N.story_beats(STORY) == ["hook", "context", "question", "problem", "curiosity", "moment-A", "moment-B", "answer", "payoff"], N.story_beats(STORY))

    # ============================================================ E. disclosure
    lib4 = dict(LIBRARY, **{"voice-fake": dict(ASSET, disclosureText="")})
    v = V(spec(), library=lib4)
    chk("E1 a voice asset without disclosureText is an error", not v["ok"] and any("disclosureText" in e for e in v["errors"]), v["errors"])
    chk("E2 the disclosure comes from the voice asset (one place), not the story", V(spec())["disclosureText"] == "Narration: test disclosure.")

    # ============================================================ F. silent reels
    v = V(copy.deepcopy(STORY))
    chk("F1 a silent reel (no narration) is valid, needs no profile and has no disclosure", v["ok"] and not v["narrated"] and v["disclosureText"] is None, v)
    chk("F2 a silent reel never authorises generation", "silent reel" in (raises(N.authorize_generation, copy.deepcopy(STORY), 1.0, 5.0, PROFILES, LIBRARY) or ""))
    chk("F3 a narrated reel requires a valid voice profile before anything else", "not in voice_profiles.json" in (raises(N.authorize_generation, spec(profile="nope"), 1.0, 5.0, PROFILES, LIBRARY) or ""))

    # ============================================================ G. the generation gate (credit cap)
    g = lambda s, est, cap: raises(N.authorize_generation, s, est, cap, PROFILES, LIBRARY)  # noqa: E731
    chk("G1 a missing explicit credit cap blocks authorisation (there is no default)", "no credit cap" in (g(spec(), 1.0, None) or ""))
    chk("G2 a zero, negative or non-numeric cap is refused", all("positive number" in (g(spec(), 1.0, c) or "") for c in (0, -3, "10", True)))
    chk("G3 an estimate above the cap stops before generation", "exceeds the cap" in (g(spec(), 12.0, 10.0) or ""))
    chk("G4 no estimate (no provider adapter in Phase 1) blocks authorisation", "no cost estimate" in (g(spec(), None, 10.0) or ""))
    chk("G5 unreviewed spoken forms (no reviewedBy / reviewedAt) block authorisation", "reviewedBy" in (g(spec(reviewed=False), 1.0, 10.0) or ""))
    chk("G6 open review items block authorisation until acknowledged",
        "human review" in (g(spec([{"beat": "hook", "text": "NaCl", "spoken": "Is NaCl ionic?"}]), 1.0, 10.0) or ""))
    r = N.authorize_generation(spec(), 3.22, 10.0, PROFILES, LIBRARY)
    chk("G7 valid, reviewed narration with an estimate within an explicit cap is authorised (and nothing is generated)",
        r["authorized"] and r["estimateCredits"] == 3.22 and r["capCredits"] == 10.0 and set(r) == {"authorized", "profile", "asset", "segments", "estimateCredits", "capCredits"}, r)

    # ============================================================ H. the real repository files (read only)
    real_p, real_l = N.load_profiles(), N.load_library()
    p, a, why = N.resolve_profile("prayogx-en-emily-v1", real_p, real_l)
    chk("H1 voice_profiles.json: prayogx-en-emily-v1 is provisional higgsfield / elevenlabs_v4 / Emily / en, and usable",
        why == [] and p["status"] == "provisional" and (p["provider"], p["model"], p["voiceName"], p["language"]) == ("higgsfield", "elevenlabs_v4", "Emily", "en"), why)
    chk("H2 audio_library.json: one voice asset with the standard disclosure line and a licence document in the repository",
        a["disclosureText"] == "Narration: AI-generated voice reading a script written and checked by PrayogX."
        and os.path.isfile(os.path.join(ROOT, a["licenseDocument"])) and a["role"] == "voice" and a["source"] == "external-tts")
    lib_text = open(os.path.join(RM, "audio_library.json"), encoding="utf-8").read()
    code = "".join(open(f, encoding="utf-8").read() for f in [os.path.join(RM, x) for x in ("audio.py", "generate-reel.js", "narration.py", "audio_check.py", "validate.js")])
    chk("H3 the disclosure string is stored once (audio_library.json), not duplicated in code or profiles",
        lib_text.count("Narration: AI-generated voice") == 1 and "Narration: AI-generated voice" not in code
        and "Narration: AI-generated voice" not in open(os.path.join(RM, "voice_profiles.json"), encoding="utf-8").read())
    import audio as AU  # noqa: E402  (the existing mixer: music and effects must still pass its provenance check)
    chk("H4 the existing music and effects assets still pass audio.py's provenance check unchanged",
        AU.check_asset(AU.load_library(), "prayogx-score-v2", "music")["assetId"] == "prayogx-score-v2"
        and AU.check_asset(AU.load_library(), "prayogx-sfx-v1", "sfx")["assetId"] == "prayogx-sfx-v1")
    allf = sorted(glob.glob(os.path.join(RM, "reels", "*.json")))
    stories = [f for f in allf if "." not in os.path.basename(f)[:-5]]                      # reels/<ID>.json: the published silent reels
    variants = [f for f in allf if f not in stories]                                        # reels/<ID>.<variant>.json
    silent = [os.path.basename(f) for f in stories if N.validate(json.load(open(f, encoding="utf-8")))["narrated"] is False]
    chk("H5 every base reel story (reels/<ID>.json) is still a valid silent reel (%d of %d)" % (len(silent), len(stories)), len(silent) == len(stories) > 0)
    bad_v = [os.path.basename(f) for f in variants if not N.validate(json.load(open(f, encoding="utf-8")))["ok"]]
    chk("H5b every variant story (reels/<ID>.<variant>.json) validates (%d variant(s))" % len(variants), bad_v == [], bad_v)
    chk("H6 the mixer and builder name no provider or profile (provider-neutral)",
        not re.search(r"higgsfield|elevenlabs|emily|prayogx-en-", open(os.path.join(RM, "audio.py"), encoding="utf-8").read(), re.I)
        and not re.search(r"higgsfield|elevenlabs|emily|prayogx-en-", open(os.path.join(RM, "generate-reel.js"), encoding="utf-8").read(), re.I))
    gr = open(os.path.join(RM, "generate-reel.js"), encoding="utf-8").read()
    guard = gr.split("if (spec.narration && !o.draft && !o.preview)")[1][:1200] if "if (spec.narration && !o.draft && !o.preview)" in gr else ""
    chk("H7 generate-reel.js never drops narration silently: a narrated story without a VERIFIED voice record stops the build; silent stories are untouched",
        "vr.status !== 'VERIFIED'" in guard and "process.exit(2)" in guard)

    # ============================================================ I. no provider calls, no spending, no publishing
    src = open(os.path.join(RM, "narration.py"), encoding="utf-8").read()
    banned = [w for w in ("urllib", "requests", "http.client", "socket", "subprocess", "os.system", "higgsfield generate",
                          "instagram_publish", "youtube_publish", "publish(") if w in src]
    chk("I1 narration.py makes no network or provider call, runs no command and imports no publisher", banned == [], banned)


def narration_model():
    """J. the narration model: narrate the story, not the screen (README -> Voiceover, Narration model)"""
    LONGQ = ("A metal wire of cross-sectional area half a square millimetre and length one hundred metres is connected across a battery "
             "of e m f two volts and internal resistance one ohm and we are asked for the drift velocity of the electrons in the wire")
    full = [{"beat": "hook", "text": "How fast do the electrons move?", "spoken": "Electrons move incredibly slowly. So how can a current flow through the wire?", "mode": "explanation"},
            {"beat": "context", "text": "JEE ADVANCED 2026", "spoken": "Let's look inside a copper wire carrying current.", "mode": "explanation"},
            {"beat": "question", "text": "(the full question, on screen)", "spoken": "We want to know how one ampere can flow when the electrons barely move.", "mode": "condensed"},
            {"beat": "curiosity", "text": "Can we SEE the electrons drift?", "spoken": "Let's watch what the electrons are actually doing.", "mode": "interpretation"},
            {"beat": "moment-A", "text": "CLOSE THE SWITCH", "spoken": "The battery's internal resistance takes half the voltage, so only one ampere flows.", "mode": "explanation"},
            {"beat": "moment-B", "text": "ZOOM INTO THE WIRE", "spoken": "Watch a single electron. Its drift is astonishingly slow.", "mode": "interpretation"},
            {"beat": "answer", "text": "OPTION C", "spoken": "So the drift speed is about a fifth of a millimetre per second.", "mode": "explanation", "offset": 1.5, "deliberate": True},
            {"beat": "payoff", "text": "DON'T JUST SOLVE IT.", "spoken": "A huge number of slowly drifting electrons is enough to carry the current.", "mode": "explanation"}]
    v = V(spec(full))
    chk("J1 end-to-end narration: hook, context, question (condensed), curiosity, moments, answer and payoff all validate",
        v["ok"] and v["review"] == [] and v["segments"] == 8, (v["errors"], v["review"]))
    chk("J2 narration is optional per beat: a story narrating only some beats (problem and moment-B silent here) is valid",
        V(spec([full[0], full[4], full[7]]))["ok"])
    v = V(spec([{"beat": "question", "text": LONGQ, "spoken": LONGQ}]))
    chk("J3 a long problem statement read word for word goes to review (condense it or skip the beat)",
        v["ok"] and any("condense it" in r for r in v["review"]) and any("narrate the story, not the screen" in r for r in v["review"]), v["review"])
    v = V(spec([{"beat": "problem", "text": "Current feels instant, but the battery hides a catch.", "spoken": "Current feels instant, but the battery hides a catch.", "mode": "spoken-text"}]))
    chk("J4 a short problem line may be spoken naturally (no review item)", v["ok"] and v["review"] == [], v["review"])
    v = V(spec([{"beat": "question", "text": LONGQ, "spoken": "We want to know how one ampere can flow when the electrons barely move.", "mode": "condensed"}]))
    chk("J5 a long problem condensed into one conceptual sentence passes", v["ok"] and v["review"] == [], v["review"])
    v = V(spec([{"beat": "question", "text": LONGQ, "spoken": LONGQ, "acknowledge": ["long", "reads-screen"]}]))
    chk("J6 a deliberate full reading is possible only by acknowledging it explicitly", v["ok"] and v["review"] == [], v["review"])
    s14 = "The battery's internal resistance takes half the voltage, so only one ampere flows into the copper wire"
    v = V(spec([{"beat": "moment-A", "text": s14, "spoken": s14}]))
    chk("J7 any beat that repeats long on-screen text verbatim goes to review (narrate the story, not the screen)",
        any("narrate the story, not the screen" in r for r in v["review"]), v["review"])
    v = V(spec([{"beat": "moment-A", "text": "ΔV = IR", "spoken": "The voltage across the resistor depends on both the current and the resistance.", "mode": "interpretation"}]))
    chk("J8 text and spoken are independent: on-screen notation with a natural spoken interpretation passes", v["ok"] and v["review"] == [], v)
    v = V(spec([{"beat": "moment-A", "text": "ΔV = IR", "spoken": "ΔV = IR"}]))
    chk("J9 notation is never spoken as-is: a spoken line copied from a formula fails the spoken-form check", not v["ok"], v["errors"])
    v = V(spec([dict(full[0], mode="screen-reader")]))
    chk("J10 an unknown mode is an error (explanation, condensed, spoken-text, interpretation)", not v["ok"] and any("mode" in e for e in v["errors"]), v["errors"])
    v = V(spec([full[0], dict(full[0], spoken="A second line on the same beat.")]))
    chk("J11 two segments on the same beat at the same offset are an error; a different offset is allowed",
        not v["ok"] and V(spec([full[0], dict(full[0], spoken="A second line on the same beat.", offset=2.5)]))["ok"], v["errors"])
    s = spec([full[0]]); s["story"]["beatSeconds"] = {"hook": 4.0, "payoff": 5.5, "answer": 6.0}
    chk("J12 story.beatSeconds may lengthen fixed beats", V(s)["ok"], V(s)["errors"])
    s = spec([full[0]]); s["story"]["beatSeconds"] = {"moment-A": 9, "payoff": -1}
    chk("J13 story.beatSeconds rejects non-fixed beats and non-positive values", sum(("beatSeconds" in e) for e in V(s)["errors"]) == 2, V(s)["errors"])
    chk("J14 nothing derives spoken from text automatically (the validator only reports)",
        "def derive" not in open(os.path.join(RM, "narration.py")).read() and spec([full[2]])["narration"]["segments"][0]["spoken"] == full[2]["spoken"])
    comp = open(os.path.join(RM, "composer", "composer.js"), encoding="utf-8").read()
    chk("J15 the composer lengthens fixed beats only on request and never shortens them (defaults unchanged for silent reels)",
        "lenOf = (k, d) => Math.max(d, +BS[k] || 0)" in comp and all(x in comp for x in ("lenOf('hook', 0.34 * hb.length + 1.75)", "lenOf('context', 1.25)",
                                                                                         "lenOf('problem', 2.3)", "lenOf('curiosity', 2.0)", "lenOf('answer', 4.4)", "lenOf('payoff', 3.0)"))
        and "t1: +(ab.t0 + ansDur)" in comp and "add('answer', 4.4" not in comp)
    chk("J17 aha footage: frozen on the last frame by default (silent reels unchanged); aha.footage 'continue' keeps the moment's own footage playing through the aha",
        "const span = m.aha && m.aha.footage === 'continue' ? dur + m.aha.seconds : dur;" in comp
        and "fr[Math.min(fr.length - 1, Math.floor(clamp(t / span) * (fr.length - 1)))]" in comp
        and "footage(frameAt(t), zr," in comp and "return [frameAt(t)];" in comp)
    q01 = json.load(open(os.path.join(RM, "reels", "ADV-2026-P2-PHY-Q01.narrated.json"), encoding="utf-8"))
    vq = N.validate(q01)
    chk("J16 the Q01 narrated variant validates under the narration model with no review items (text = on-screen, spoken = narration)",
        vq["ok"] and vq["review"] == [] and all(s["text"] != s["spoken"] for s in q01["narration"]["segments"]), (vq["errors"], vq["review"]))


main()
narration_model()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
