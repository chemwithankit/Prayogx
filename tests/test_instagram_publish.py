#!/usr/bin/env python3
"""tools/instagram_publish.py and the reel audio - approval, publishing (mocked), verification, audio and security.

No live API: every Graph API call goes to a scripted fake transport, and every reel is a synthetic fixture in a
temporary directory. Sections: A config, B approval, C duplicates, D preflight, E audio, F publishing,
G verification, H security.

Run:  tests/.venv/bin/python tests/test_instagram_publish.py
"""
import contextlib
import copy
import io
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import urllib.parse

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
sys.path.insert(0, os.path.join(ROOT, "tools", "reel-maker"))
import instagram_publish as P  # noqa: E402
import audio as AU  # noqa: E402
import audio_check as AC  # noqa: E402
import mp4tools as MP  # noqa: E402

ok, fail = [], []
SID = "ADV-2026-P1-PHY-Q15"                       # a real library entry, so the manifest check is real
TOKEN = "IGAAFakeTokenForTests0123456789abcdefghijklmnop"
ENV = {"IG_USER_ID": "17841400000000000", "IG_ACCESS_TOKEN": TOKEN, "IG_API_HOST": "graph.instagram.com", "IG_API_VERSION": "v25.0"}
CAPTION = "Four loops spin through half a field... which one makes no current?\n\nJEE Advanced 2026 · Paper 1 · Physics · Q.15\n\n#JEEAdvanced #PrayogX\n"


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


def raises(fn, *a, **k):
    try:
        fn(*a, **k)
    except P.PublishError as e:
        return e
    return None


def quiet(fn, *a, **k):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
        try:
            r = fn(*a, **k)
        except P.PublishError as e:
            r = e
    OUTPUT.append(buf.getvalue())
    return r


OUTPUT = []


# ------------------------------------------------------------------ fixtures
def box(t, payload):
    return struct.pack(">I", 8 + len(payload)) + t + payload


def fake_mp4(edit_lists=False, mdat_bytes=4000):
    """a structurally real MP4: ftyp, moov (two tracks, optional edit lists, chunk offsets into mdat), mdat"""
    def trak(handler, off):
        e = box(b"edts", box(b"elst", b"\0\0\0\0" + struct.pack(">I", 1) + struct.pack(">IiI", 1000, 2112 if handler == b"soun" else 0, 0x10000))) if edit_lists else b""
        hd = box(b"hdlr", b"\0" * 8 + handler + b"\0" * 13)
        st = box(b"stbl", box(b"stco", b"\0\0\0\0" + struct.pack(">I", 2) + struct.pack(">II", off, off + 100)))
        return box(b"trak", box(b"tkhd", b"\0" * 84) + e + box(b"mdia", hd + box(b"minf", st)))
    ftyp = box(b"ftyp", b"isom\0\0\x02\0isomavc1")
    moov = box(b"moov", box(b"mvhd", b"\0" * 100) + trak(b"vide", 0) + trak(b"soun", 0))
    base = len(ftyp) + len(moov) + 8
    moov = box(b"moov", box(b"mvhd", b"\0" * 100) + trak(b"vide", base) + trak(b"soun", base + 200))
    return ftyp + moov + box(b"mdat", bytes(range(256)) * (mdat_bytes // 256))


PROBE = {"duration": 39.6, "width": 1080, "height": 1920, "fps": 30.0, "video": "avc1", "audio": "aac ", "channels": 2, "sampleRate": 48000.0,
         "audioBitRate": 122000, "videoBitRate": 9.0e6, "audioDuration": 39.56, "playable": True}


def make_reel(out, status="READY_FOR_REVIEW", edit_lists=False, caption=CAPTION):
    d = os.path.join(out, SID)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "reel.mp4"), "wb").write(fake_mp4(edit_lists))
    open(os.path.join(d, "thumbnail.jpg"), "wb").write(b"\xff\xd8\xff\xe0" + b"\0" * 30000)
    open(os.path.join(d, "caption.txt"), "w", encoding="utf-8").write(caption)
    lib = AU.load_library()
    checks = [{"name": "check %d" % i, "ok": True, "detail": ""} for i in range(19)] + [{"name": "audio: check %d" % i, "ok": True, "detail": ""} for i in range(11)]
    m = {"simulationId": SID, "origin": "new-simulation", "status": status, "statusHistory": [{"status": status, "at": P.now(), "by": "generate-reel.js"}],
         "video": {"seconds": 39.6}, "validation": {"passed": 30, "checks": checks, "probe": dict(PROBE)},
         "audio": {"tracks": [AU.check_asset(lib, "prayogx-score-v2", "music"), AU.check_asset(lib, "prayogx-sfx-v1", "sfx")]},
         "hashes": {f: P.sha256(os.path.join(d, f)) for f in ("reel.mp4", "thumbnail.jpg", "caption.txt")}}
    json.dump(m, open(os.path.join(d, "reel.json"), "w"), indent=2)
    return d


class Fake:
    """scripted Graph API: routes by (method, path) to a handler; records every request"""

    def __init__(self, **over):
        self.calls = []
        self.status_codes = list(over.pop("status_codes", ["IN_PROGRESS", "FINISHED"]))
        self.over = over

    def request(self, method, url, headers=None, body=None, timeout=60):
        u = urllib.parse.urlparse(url)
        if u.hostname not in P.ALLOWED_HOSTS or u.scheme != "https":
            raise AssertionError("request to a host outside the allow-list: " + url)
        q = dict(urllib.parse.parse_qsl(u.query))
        form = dict(urllib.parse.parse_qsl(body.decode())) if body and method == "POST" and u.hostname != P.UPLOAD_HOST else {}
        path = u.path
        self.calls.append({"method": method, "host": u.hostname, "path": path, "query": q, "form": form, "headers": dict(headers or {}), "bytes": len(body or b"")})
        key = method + " " + re.sub(r"/v\d+\.\d+", "", path)
        for pat, h in self.over.items():
            if re.search(pat, key):
                r = h(self, q, form) if callable(h) else h
                if isinstance(r, Exception):
                    raise r
                return r[0], json.dumps(r[1]).encode()
        return self.default(key, q, form)

    def default(self, key, q, form):
        if key == "GET /17841400000000000" and q.get("fields") == "id,username":
            return 200, json.dumps({"id": "17841400000000000", "username": "prayogx"}).encode()
        if key.endswith("/content_publishing_limit"):
            return 200, json.dumps({"data": [{"quota_usage": 3, "config": {"quota_total": 100}}]}).encode()
        if key == "POST /17841400000000000/media":
            return 200, json.dumps({"id": "c-555"}).encode()
        if key.startswith("POST /ig-api-upload/c-555"):
            return 200, json.dumps({"success": True, "message": "Upload successful"}).encode()
        if key == "GET /c-555":
            code = self.status_codes.pop(0) if len(self.status_codes) > 1 else self.status_codes[0]
            return 200, json.dumps({"status_code": code, "id": "c-555"}).encode()
        if key == "POST /17841400000000000/media_publish":
            return 200, json.dumps({"id": "m-777"}).encode()
        if key == "GET /m-777":
            return 200, json.dumps({"id": "m-777", "permalink": "https://www.instagram.com/reel/ABC123/", "media_type": "VIDEO",
                                    "media_product_type": "REELS", "caption": CAPTION.strip(), "timestamp": "2026-10-01T10:00:00+0000"}).encode()
        if key == "GET /17841400000000000/media":
            return 200, json.dumps({"data": [{"id": "m-777", "caption": CAPTION.strip(), "timestamp": "2099-01-01T00:00:00+0000"}]}).encode()
        return 404, json.dumps({"error": {"message": "no route " + key, "code": 100}}).encode()

    def posts(self):
        return [c for c in self.calls if c["method"] == "POST"]


def graph_error(code, msg="err", status=400, sub=None):
    e = {"message": msg, "code": code, "type": "OAuthException"}
    if sub:
        e["error_subcode"] = sub
    return status, {"error": e}


class Clock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t

    def sleep(self, s):
        self.t += s


def fresh(tmp, **kw):
    out = os.path.join(tmp, "out-%d" % len(os.listdir(tmp)))
    os.makedirs(out)
    P.OUT_DIR = out
    P.LEDGER = os.path.join(out, "publications.json")
    make_reel(out, **kw)
    return out


def cfg(**over):
    e = dict(ENV); e.update(over)
    return P.load_config(e, env_file="")


def approve(**kw):
    return quiet(P.cmd_approve, SID, "Ankit", "watched with sound", confirm=SID, environ={}, **kw)


def publish(fake, clock=None, **kw):
    clock = clock or Clock()
    c = kw.pop("config", None) or cfg()
    return quiet(P.cmd_publish, SID, c, fake, confirm=kw.pop("confirm", SID), sleep=clock.sleep, clock=clock, **kw)


def state():
    return P.load_reel(SID)


def main():
    tmp = tempfile.mkdtemp(prefix="igpub-")
    try:
        run(tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print()
    print("%d passed, %d failed" % (len(ok), len(fail)))
    sys.exit(1 if fail else 0)


def run(tmp):
    # ============================================================ A. configuration
    c0 = P.load_config({}, env_file="")
    pr = c0.problems()
    chk("A1 missing IG_USER_ID and IG_ACCESS_TOKEN are reported, not guessed", any("IG_USER_ID" in p for p in pr) and any("IG_ACCESS_TOKEN" in p for p in pr), pr)
    chk("A2 a complete configuration has no problems", cfg().problems() == [], cfg().problems())
    bad = cfg(IG_API_HOST="i.instagram.com", IG_API_VERSION="25", IG_USER_ID="@prayogx").problems()
    chk("A3 an unofficial host, a malformed version and a non-numeric account ID are refused", len(bad) == 3, bad)
    envf = os.path.join(tmp, ".env")
    open(envf, "w").write("# comment\nexport IG_USER_ID=111\nIG_ACCESS_TOKEN='%s'\nOTHER_SECRET=x\n" % TOKEN)
    os.chmod(envf, 0o644)
    cf = P.load_config({"IG_USER_ID": "17841400000000000"}, env_file=envf)
    chk("A4 .env is read (IG_/PRAYOGX_ keys only) and the environment overrides it", cf.token == TOKEN and cf.ig_user_id == "17841400000000000" and not hasattr(cf, "OTHER_SECRET"))
    chk("A5 a .env readable by other users is a configuration problem (chmod 600)", any("chmod 600" in p for p in cf.problems()), cf.problems())
    os.chmod(envf, 0o600)
    chk("A6 with chmod 600 the .env is accepted", P.load_config({}, env_file=envf).problems() == [] or all("chmod" not in p for p in P.load_config({}, env_file=envf).problems()))
    chk("A7 describe() never shows the token", TOKEN not in json.dumps(cfg().describe()) and "REDACTED" in json.dumps(cfg().describe()))
    e = raises(P.HttpTransport().request, "GET", "https://i.instagram.com/api/v1/users/")
    chk("A8 the HTTP layer refuses any host outside graph.instagram.com / graph.facebook.com / rupload.facebook.com", e is not None and e.kind == "security", e)
    e = raises(P.HttpTransport().request, "GET", "http://graph.instagram.com/v25.0/me")
    chk("A9 plain http is refused", e is not None and e.kind == "security", e)

    # ============================================================ B. approval
    fresh(tmp)
    e = quiet(P.cmd_approve, SID, "Ankit", None, confirm="ADV-2026-P1-PHY-Q14", environ={})
    chk("B1 approval with the wrong ID typed is refused and changes nothing", isinstance(e, P.PublishError) and state()["status"] == "READY_FOR_REVIEW", e)
    for who in ("claude", "auto", "CI", ""):
        e = quiet(P.cmd_approve, SID, who, None, confirm=SID, environ={})
        if not isinstance(e, P.PublishError):
            break
    chk("B2 an automated or empty reviewer cannot approve", isinstance(e, P.PublishError) and state()["status"] == "READY_FOR_REVIEW", e)
    e = quiet(P.cmd_approve, SID, "Ankit", None, confirm=SID, environ={"CI": "true"})
    chk("B3 approval is refused in CI", isinstance(e, P.PublishError) and "CI" in str(e) and state()["status"] == "READY_FOR_REVIEW", e)
    old_tty = sys.stdin
    sys.stdin = io.StringIO("")
    e = quiet(P.cmd_approve, SID, "Ankit", None, confirm=None, environ={})
    sys.stdin = old_tty
    chk("B4 without a terminal, approval needs --confirm <ID> (never implied)", isinstance(e, P.PublishError) and "--confirm" in str(e), e)
    m = approve()
    chk("B5 a person's approval moves READY_FOR_REVIEW -> APPROVED, bound to the validated hashes",
        state()["status"] == "APPROVED" and state()["approval"]["hashes"] == state()["hashes"] and state()["approval"]["reviewer"] == "Ankit", getattr(m, "args", m))
    e = approve()
    chk("B6 an approved reel cannot be approved twice", isinstance(e, P.PublishError) and e.kind == "state", e)
    fresh(tmp, status="VALIDATION_FAILED")
    e = approve()
    chk("B7 a reel that failed validation cannot be approved", isinstance(e, P.PublishError) and state()["status"] == "VALIDATION_FAILED", e)
    out = fresh(tmp)
    open(os.path.join(out, SID, "caption.txt"), "a").write("edited after validation\n")
    e = approve()
    chk("B8 files changed after validation: approval refused and the reel is NOT_READY", isinstance(e, P.PublishError) and state()["status"] == "NOT_READY", e)
    fresh(tmp)
    quiet(P.cmd_reject, SID, "the aha text overlaps the board", "Ankit")
    e = approve()
    chk("B9 reject -> REJECTED with the reason; a rejected reel cannot be approved", state()["status"] == "REJECTED" and isinstance(e, P.PublishError)
        and state()["statusHistory"][-1]["note"] == "the aha text overlaps the board", e)
    reach = {"VALIDATED"}
    for _ in range(5):
        reach |= {n for s in list(reach) for n in P.TRANSITIONS[s] if n != "APPROVED"}
    chk("B10 the state machine has no route to APPROVED except the approve command (READY_FOR_REVIEW -> APPROVED only)",
        [s for s, n in P.TRANSITIONS.items() if "APPROVED" in n] == ["READY_FOR_REVIEW"])
    gen = open(os.path.join(ROOT, "tools", "reel-maker", "generate-reel.js")).read() + open(os.path.join(ROOT, "tools", "reel-maker", "validate.js")).read()
    fac = open(os.path.join(ROOT, "tools", "auto_sim.py")).read()
    chk("B11 the generator, the validator and the factory never approve or publish (no APPROVED, no instagram_publish call)",
        "'APPROVED'" not in gen and '"APPROVED"' not in gen and not re.search(r"(import|subprocess\.[a-z]+\([^)]*)instagram_publish", fac) and "media_publish" not in gen + fac)

    # ============================================================ C. duplicates
    fresh(tmp); approve()
    f = Fake()
    m = publish(f)
    chk("C1 (setup) a mocked publish succeeds", getattr(m, "get", lambda k: None)("status") == "VERIFIED", m)
    led = json.load(open(P.LEDGER))
    chk("C2 the publication is recorded in the ledger (media ID, permalink, reviewer, reel sha256)",
        len(led["publications"]) == 1 and led["publications"][0]["permalink"] == "https://www.instagram.com/reel/ABC123/" and led["publications"][0]["approvedBy"] == "Ankit"
        and led["publications"][0]["reelSha256"] == state()["hashes"]["reel.mp4"], led)
    f2 = Fake()
    e = publish(f2)
    chk("C3 publishing the same reel again is refused, with no POST sent", isinstance(e, P.PublishError) and f2.posts() == [], e)
    # regenerate (a new READY_FOR_REVIEW record) and approve again: the ledger still blocks it
    P.OUT_DIR, keep = P.OUT_DIR, P.LEDGER
    make_reel(P.OUT_DIR)
    approve()
    f3 = Fake()
    e = publish(f3)
    chk("C4 a regenerated and re-approved reel of a published simulation is still refused (the ledger)", isinstance(e, P.PublishError) and f3.posts() == [], e)
    f4 = Fake()
    e = publish(f4, force_republish=True, confirm_republish=None, reason="corrected caption")
    chk("C5 --force-republish without --confirm-republish <ID> is refused", isinstance(e, P.PublishError) and e.kind == "duplicate" and f4.posts() == [], e)
    e = publish(f4, force_republish=True, confirm_republish=SID, reason="")
    chk("C6 --force-republish without a reason is refused", isinstance(e, P.PublishError) and f4.posts() == [], e)
    f5 = Fake()
    m = publish(f5, force_republish=True, confirm_republish=SID, reason="corrected caption")
    led = json.load(open(P.LEDGER))
    chk("C7 a confirmed forced republish goes through and is recorded as forced", getattr(m, "get", lambda k: None)("status") == "VERIFIED"
        and any(p.get("forced") for p in led["publications"]), led)
    fresh(tmp); approve()
    os.makedirs(os.path.join(P.OUT_DIR, SID, "publish"), exist_ok=True)
    open(os.path.join(P.OUT_DIR, SID, "publish", "publish.lock"), "w").write("x")
    f6 = Fake()
    e = publish(f6)
    chk("C8 a second publish while one is running is refused (lock)", isinstance(e, P.PublishError) and f6.posts() == [], e)

    # ============================================================ D. preflight and dry run
    fresh(tmp)
    f = Fake()
    items = quiet(P.cmd_dry_run, SID, cfg(), f, online=False)
    chk("D1 an offline dry run sends no request at all", f.calls == [] and isinstance(items, list))
    names = {n: o for n, o, d in items}
    chk("D2 the dry run of an unapproved reel reports it as not approved", names[[n for n in names if n.startswith("the reel is approved")][0]] is False)
    approve()
    f = Fake()
    items = quiet(P.cmd_dry_run, SID, cfg(), f, online=True)
    chk("D3 an online dry run only reads (GETs: the account and the publishing limit) - no POST", f.calls and all(c["method"] == "GET" for c in f.calls), [c["path"] for c in f.calls])
    chk("D4 an approved, valid reel with a working configuration passes every preflight item", all(o is True for n, o, d in items), [(n, d) for n, o, d in items if o is not True])
    e = quiet(P.cmd_dry_run, SID, cfg(IG_ACCESS_TOKEN=""), Fake(), online=True)
    chk("D5 missing credentials fail the preflight", any(o is False and "configuration" in n for n, o, d in e))
    f = Fake(**{r"content_publishing_limit": (200, {"data": [{"quota_usage": 100, "config": {"quota_total": 100}}]})})
    items = quiet(P.cmd_dry_run, SID, cfg(), f, online=True)
    chk("D6 the 24-hour publishing limit reached fails the preflight", any(o is False and "publishing limit" in n for n, o, d in items))
    long_cap = "x" * 2201
    probs = P.caption_problems(long_cap) + P.caption_problems(" ".join("#t%d" % i for i in range(31))) + P.caption_problems(" ".join("@u%d" % i for i in range(21))) + P.caption_problems("token " + TOKEN, [TOKEN])
    chk("D7 caption limits: > 2200 characters, > 30 hashtags, > 20 mentions and a token in the caption are each caught", len(probs) == 4, probs)
    fresh(tmp, edit_lists=True); approve()
    items = quiet(P.cmd_dry_run, SID, cfg(), Fake(), online=True)
    chk("D8 an MP4 with edit lists fails the Reels-spec item", any(o is False and "Reels spec" in n for n, o, d in items))
    b = fake_mp4(edit_lists=True)
    p_ = os.path.join(tmp, "e.mp4"); open(p_, "wb").write(b)
    before = MP.inspect(b)
    after = MP.strip_edits(p_, 2112)
    raw = open(p_, "rb").read()
    mo = [o for t, o, s, h in MP.boxes(raw, 0, len(raw)) if t == b"moov"][0]
    offs = [struct.unpack(">I", raw[o + 16:o + 20])[0] for t, o, s, h, d, pth in MP.walk(raw, mo + 8, len(raw)) if t == b"stco"]
    mdat = [o for t, o, s, h in MP.boxes(raw, 0, len(raw)) if t == b"mdat"][0]
    chk("D9 mp4tools strips the edit lists, keeps moov first and repoints every chunk offset into mdat",
        before["editLists"] == 2 and after["editLists"] == 0 and after["moovBeforeMdat"] and offs == [mdat + 8, mdat + 8 + 200], (before, after, offs, mdat))
    open(p_, "wb").write(fake_mp4(edit_lists=True))
    try:
        MP.strip_edits(p_, 1024); refused = False
    except ValueError:
        refused = True
    chk("D10 mp4tools refuses when the audio edit does not match the expected AAC priming (sync unknown)", refused)
    fresh(tmp); approve()
    m = state(); m["simulationId"] = SID
    real_manifest = P.MANIFEST
    P.MANIFEST = os.path.join(tmp, "nomanifest.json")
    items = quiet(P.cmd_dry_run, SID, cfg(), Fake(), online=True)
    P.MANIFEST = real_manifest
    chk("D11 a simulation that is not in the library fails the preflight", any(o is False and "library" in n for n, o, d in items))

    # ============================================================ E. audio
    lib = AU.load_library()
    chk("E1 the library's generated score and effects pass the provenance check", AU.check_asset(lib, "prayogx-score-v2", "music")["licenseVerified"] is True
        and AU.check_asset(lib, "prayogx-sfx-v1", "sfx")["commercialUse"] is True)
    bad = {"x-unverified": dict(lib["prayogx-score-v2"], assetId="x-unverified", licenseVerified=False),
           "x-noncommercial": dict(lib["prayogx-score-v2"], assetId="x-noncommercial", commercialUse=False),
           "x-noinsta": dict(lib["prayogx-score-v2"], assetId="x-noinsta", permittedUse=["web"]),
           "x-file": dict(lib["prayogx-score-v2"], assetId="x-file", source="file", file="tests/README.md", sha256="0" * 64, licenseDocument="tests/README.md"),
           "x-attrib": dict(lib["prayogx-score-v2"], assetId="x-attrib", attributionRequired=True, attributionText="")}
    lib2 = dict(lib, **bad)
    refused = []
    for k in list(bad) + ["not-listed-trending-song"]:
        try:
            AU.check_asset(lib2, k, "music")
        except AU.ProvenanceError:
            refused.append(k)
    chk("E2 unverified, non-commercial, not-for-Instagram, hash-mismatched, unattributed and unlisted assets are all refused", len(refused) == 6, refused)
    beats = [("hook", 0, 2.4), ("context", 2.4, 1.25), ("question", 3.65, 4.5), ("problem", 8.15, 2.6), ("curiosity", 10.75, 1.6),
             ("moment-A", 12.35, 3.5), ("moment-B", 15.85, 6.2), ("answer", 22.05, 4.4), ("payoff", 26.45, 3.0)]
    plan = {"simulationId": "TEST-AUDIO", "subject": "Chemistry", "chapter": "Organic Chemistry", "duration": 29.45, "fps": 30,
            "beats": [{"id": a, "t0": b, "dur": c} for a, b, c in beats],
            "cues": [{"t": 0.12, "type": "pop", "gain": 0.8}, {"t": 0.5, "type": "pop", "gain": 0.8}, {"t": 1.2, "type": "whoosh", "gain": 0.7},
                     {"t": 12.35, "type": "whoosh", "gain": 0.6}, {"t": 14.0, "type": "ping", "gain": 0.6}, {"t": 15.2, "type": "ding", "gain": 0.7},
                     {"t": 15.85, "type": "whoosh", "gain": 0.6}, {"t": 18.85, "type": "hit", "gain": 1}, {"t": 22.05, "type": "whoosh", "gain": 0.6},
                     {"t": 22.5, "type": "riser", "gain": 0.9}, {"t": 23.4, "type": "reveal", "gain": 1}, {"t": 23.8, "type": "impact", "gain": 0.7},
                     {"t": 26.45, "type": "hit", "gain": 0.9}, {"t": 27.75, "type": "shimmer", "gain": 0.8}],
            "marks": {"aha": {"t0": 18.85, "t1": 22.05}, "answer": {"t0": 22.05, "t1": 26.45, "reveal": 23.4}}}
    wav = os.path.join(tmp, "a.wav")
    rep = AU.render(plan, wav, music_out=os.path.join(tmp, "music.wav"))
    x, sr = AU.read_wav(wav)
    st = AU.stats(x)
    chk("E3 an organic-chemistry plan gets the organic groove (marimba hook, pizzicato, piano, congas) and its own key and progression",
        rep["score"]["style"] == "organic" and rep["score"]["identityInstrument"] == "marimba" and rep["score"]["key"].endswith("(resolving to major)")
        and {"marimba", "pizz", "piano", "conga"} <= set(rep["score"]["instruments"]) and rep["score"]["instrumentCount"] >= 12,
        {k: rep["score"][k] for k in ("style", "identityInstrument", "instrumentCount")})
    chk("E4 the score follows the arc HOOK > QUESTION > PROBLEM > SIM_START > AHA > ANSWER > BRAND, the groove's downbeat on the simulation start",
        [s["id"] for s in rep["arc"]] == ["HOOK", "QUESTION", "PROBLEM", "SIM_START", "AHA", "ANSWER", "BRAND"] and rep["score"]["simStartDownbeat"] == 12.35)
    chk("E5 the master is -14 LUFS (+-0.5), true peak <= -1 dBTP, no clipped sample, 48 kHz stereo",
        abs(st["integratedLufs"] + 14) <= 0.5 and st["truePeakDbtp"] <= -0.95 and st["clippedSamples"] == 0 and sr == 48000 and x.shape[1] == 2, st)
    g = rep["mix"]["musicGainDbBySection"]
    chk("E6 the music ducks under the question (-6 dB) and the answer text, not in the simulation", g["QUESTION@3.65"] <= -5.5 and g["ANSWER@22.05"] <= -3 and g["SIM_START@12.35"] > -2, g)
    rep2 = AU.render(plan, os.path.join(tmp, "b.wav"))
    chk("E7 the soundtrack is deterministic (same plan, same samples)", np.array_equal(AU.read_wav(os.path.join(tmp, "b.wav"))[0], x))
    plan_c = dict(plan, simulationId="TEST-AUDIO-2")
    rep3 = AU.render(plan_c, os.path.join(tmp, "c.wav"))
    chk("E8 another question gets different music (the seed comes from the simulation ID)", not np.array_equal(AU.read_wav(os.path.join(tmp, "c.wav"))[0], x))
    repf = os.path.join(tmp, "a.json"); json.dump(rep, open(repf, "w"))
    probe = dict(PROBE, duration=29.45, audioDuration=29.45)
    base = {"decoded": wav, "rendered": wav, "music": os.path.join(tmp, "music.wav"), "report": repf, "probe": probe, "beats": plan["beats"], "marks": plan["marks"], "seconds": 29.45, "fps": 30}
    r = AC.check(base)
    chk("E9 the audio validator passes a good track (all %d audio checks)" % len(r["checks"]), all(c["ok"] for c in r["checks"]) and len(r["checks"]) == 11,
        [(c["name"], c["detail"]) for c in r["checks"] if not c["ok"]])

    def variant(name, fn):
        y = fn(x.copy())
        p = os.path.join(tmp, name + ".wav"); AU.write_wav(p, y)
        return {c["name"]: c["ok"] for c in AC.check(dict(base, decoded=p))["checks"]}
    v = variant("clip", lambda y: np.clip(y * 4, -1, 1))
    chk("E10 a clipped track fails 'no clipping' and 'loudness'", not v[[k for k in v if k.startswith("no clipping")][0]] and not v[[k for k in v if k.startswith("loudness")][0]])
    v = variant("gap", lambda y: np.concatenate([y[:sr * 5], np.zeros((sr * 2, 2)), y[sr * 7:]]))
    chk("E11 two seconds of dead air fail 'no dead air'", not v[[k for k in v if k.startswith("no dead air")][0]])
    v = variant("late", lambda y: np.concatenate([np.zeros((int(sr * 0.08), 2)), y[: -int(sr * 0.08)]]))
    chk("E12 a track 80 ms out of sync fails the waveform-sync check", not v[[k for k in v if k.startswith("the MP4 carries")][0]])
    v = variant("cut", lambda y: np.concatenate([y[: -sr], y[-sr:] * 0 + y[-sr - 1:-sr]]))
    chk("E13 an abrupt end (no fade, no silent last frame) fails 'clean start and end'", not v[[k for k in v if k.startswith("clean start")][0]])
    flat = dict(rep, sfxCues=[c for c in rep["sfxCues"] if abs(c["t"] - 23.4) > 0.06])
    json.dump(flat, open(os.path.join(tmp, "flat.json"), "w"))
    r = AC.check(dict(base, report=os.path.join(tmp, "flat.json")))
    chk("E14 no cue at the answer reveal fails the sync check", not [c for c in r["checks"] if c["name"].startswith("music and sound effects")][0]["ok"])
    badrep = dict(rep, tracks=[dict(rep["tracks"][0], assetId="not-listed-trending-song"), rep["tracks"][1]])
    json.dump(badrep, open(os.path.join(tmp, "badrep.json"), "w"))
    r = AC.check(dict(base, report=os.path.join(tmp, "badrep.json")))
    chk("E15 the validator re-checks provenance against the library: an unlisted track fails even if the report says verified",
        not [c for c in r["checks"] if c["name"].startswith("every sound is licensed")][0]["ok"])
    mu, _ = AU.read_wav(os.path.join(tmp, "music.wav"))
    one = mu[int(12.35 * sr): int(12.35 * sr + 4 * 60 / rep["score"]["bpm"] * sr)]
    loop = np.tile(one, (len(mu) // len(one) + 1, 1))[: len(mu)]
    AU.write_wav(os.path.join(tmp, "loop.wav"), loop)
    r = AC.check(dict(base, music=os.path.join(tmp, "loop.wav")))
    mc = [c for c in r["checks"] if c["name"].startswith("the music is composed")][0]
    chk("E18 a one-bar loop repeated for the whole reel fails the musicality check (no arc, no stage changes)", not mc["ok"], mc["detail"])
    for style, subj, chap in (("edm", "Physics", "Current Electricity"), ("synthwave", "Physics", "Ray Optics"), ("cinematic", "Chemistry", "Chemical Kinetics"),
                              ("crystal", "Chemistry", "Coordination Compounds")):
        rs = AU.render(dict(plan, subject=subj, chapter=chap, simulationId="TEST-" + style), os.path.join(tmp, style + ".wav"), music_out=os.path.join(tmp, "m_" + style + ".wav"))
        ms = AC.musicality(AU.read_wav(os.path.join(tmp, "m_" + style + ".wav"))[0], rs, plan["beats"])
        chk("E19 %s (%s) composes a %s track: arc, beat %.2f, %d/%d stage changes, hook in %d sections, %d instruments, -14 LUFS"
            % (chap, subj, rs["score"]["style"], ms["beat"], ms["stageChanges"], ms["stagesExpected"], ms["hookSections"], rs["score"]["instrumentCount"]),
            rs["score"]["style"] == style and ms["arc_ok"] and ms["beat"] >= 0.25 and ms["stageChanges"] >= ms["stagesExpected"] and ms["hookSections"] >= 3
            and rs["score"]["instrumentCount"] >= 10 and abs(rs["stats"]["integratedLufs"] + 14) <= 0.5 and rs["stats"]["truePeakDbtp"] <= -0.95, ms)
    tl = os.path.join(tmp, "lib.json")
    json.dump({"assets": [dict(lib["prayogx-score-v2"], licenseVerified=False), lib["prayogx-sfx-v1"]]}, open(tl, "w"))
    try:
        AU.render(plan, os.path.join(tmp, "d.wav"), library=tl); stopped = False
    except AU.ProvenanceError:
        stopped = True
    chk("E16 rendering stops (no track written) when the score's licence is not verified", stopped and not os.path.exists(os.path.join(tmp, "d.wav")))
    pf = os.path.join(tmp, "plan.json"); json.dump(dict(plan, audio={"music": "not-listed-trending-song"}), open(pf, "w"))
    rc = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "reel-maker", "audio.py"), "--plan", pf, "--out", os.path.join(tmp, "e.wav"), "--report", os.path.join(tmp, "e.json")],
                        capture_output=True, text=True)
    chk("E17 audio.py exits 3 (GENERATION_FAILED upstream) for an unlisted asset", rc.returncode == 3 and "PROVENANCE" in rc.stderr, rc.returncode)

    # ============================================================ F. publishing (mocked)
    fresh(tmp); approve()
    f = Fake()
    m = publish(f)
    seq = [(c["method"], re.sub(r"/v\d+\.\d+", "", c["path"])) for c in f.calls]
    want = [("GET", "/17841400000000000"), ("GET", "/17841400000000000/content_publishing_limit"), ("POST", "/17841400000000000/media"),
            ("POST", "/ig-api-upload/c-555"), ("GET", "/c-555"), ("GET", "/c-555"), ("POST", "/17841400000000000/media_publish"), ("GET", "/m-777")]
    chk("F1 the documented call sequence: account, limit, create container, resumable upload, poll, media_publish, verify", seq == want, seq)
    cr = f.calls[2]["form"]
    chk("F2 the container is a REELS resumable upload with the caption from caption.txt and a thumb_offset cover",
        cr.get("media_type") == "REELS" and cr.get("upload_type") == "resumable" and cr.get("caption") == CAPTION.strip() and cr.get("thumb_offset") == "0" and "video_url" not in cr, cr)
    up = f.calls[3]
    chk("F3 the upload sends the MP4 bytes to rupload.facebook.com with OAuth, offset 0 and file_size",
        up["host"] == "rupload.facebook.com" and up["headers"].get("offset") == "0" and int(up["headers"].get("file_size")) == up["bytes"] == os.path.getsize(os.path.join(P.OUT_DIR, SID, "reel.mp4"))
        and up["headers"]["Authorization"].startswith("OAuth "), {k: v for k, v in up["headers"].items() if k != "Authorization"})
    hist = [h["status"] for h in state()["statusHistory"]]
    chk("F4 the states go READY_FOR_REVIEW > APPROVED > PUBLISHING > PUBLISHED > VERIFIED", hist[-4:] == ["APPROVED", "PUBLISHING", "PUBLISHED", "VERIFIED"] and "READY_FOR_REVIEW" in hist, hist)
    fresh(tmp); approve()
    f = Fake(status_codes=["IN_PROGRESS", "ERROR"])
    e = publish(f)
    chk("F5 the container fails processing (ERROR): PUBLISH_FAILED (processing), media_publish never called",
        isinstance(e, P.PublishError) and e.kind == "processing" and state()["status"] == "PUBLISH_FAILED" and not any("media_publish" in c["path"] for c in f.calls), e)
    fresh(tmp); approve()
    f = Fake(status_codes=["IN_PROGRESS"])
    e = publish(f, config=cfg(IG_POLL_TIMEOUT_S="30", IG_POLL_INTERVAL_S="5"))
    chk("F6 processing never finishes: PUBLISH_FAILED (timeout) after the configured wait, no media_publish",
        isinstance(e, P.PublishError) and e.kind == "timeout" and state()["status"] == "PUBLISH_FAILED" and not any("media_publish" in c["path"] for c in f.calls), e)
    fresh(tmp); approve()
    f = Fake(**{r"^POST /17841400000000000/media$": graph_error(10, "Application does not have permission for this action", 403)})
    e = publish(f)
    chk("F7 a permission error: PUBLISH_FAILED (permission) naming the publish permission", isinstance(e, P.PublishError) and e.kind == "permission"
        and "content_publish" in str(e) and state()["status"] == "PUBLISH_FAILED", e)
    fresh(tmp); approve()
    f = Fake(**{r"^GET /17841400000000000$": graph_error(190, "Error validating access token: Session has expired", 401)})
    e = publish(f)
    chk("F8 an expired token stops at the preflight: nothing posted, still APPROVED", isinstance(e, P.PublishError) and e.kind == "preflight" and f.posts() == [] and state()["status"] == "APPROVED", e)
    fresh(tmp); approve()
    f = Fake(**{r"ig-api-upload": (500, {"debug_info": {"message": "ProcessingFailedError"}})})
    e = publish(f)
    chk("F9 an upload failure: PUBLISH_FAILED (upload), no media_publish", isinstance(e, P.PublishError) and e.kind in ("upload", "network")
        and state()["status"] == "PUBLISH_FAILED" and not any("media_publish" in c["path"] for c in f.calls), e)
    f = Fake()
    m = publish(f)
    chk("F10 after a clean failure (not uncertain) a retry publishes", getattr(m, "get", lambda k: None)("status") == "VERIFIED", m)
    fresh(tmp); approve()
    f = Fake(**{r"media_publish": P.PublishError("network", "network error: timed out")})
    e = publish(f)
    s = state()
    chk("F11 media_publish times out: PUBLISH_FAILED marked uncertain, never retried, never marked PUBLISHED",
        isinstance(e, P.PublishError) and s["status"] == "PUBLISH_FAILED" and s["publish"]["uncertain"] is True and sum("media_publish" in c["path"] for c in f.calls) == 1, s.get("publish"))
    f2 = Fake()
    e = publish(f2)
    chk("F12 an uncertain attempt blocks a new publish until verify resolves it", isinstance(e, P.PublishError) and f2.posts() == [], e)

    # ============================================================ G. verification
    f = Fake(status_codes=["PUBLISHED"])
    m = quiet(P.cmd_verify, SID, cfg(), f, sleep=lambda s: None)
    chk("G1 verify resolves an uncertain attempt: the container is PUBLISHED, the post is found -> PUBLISHED -> VERIFIED with the permalink",
        state()["status"] == "VERIFIED" and state()["publish"]["permalink"].startswith("https://www.instagram.com/") and not any(c["method"] == "POST" for c in f.calls),
        [h["status"] for h in state()["statusHistory"]][-3:])
    fresh(tmp); approve()
    publish(Fake(**{r"media_publish": P.PublishError("network", "timed out")}))
    f = Fake(status_codes=["FINISHED"])
    quiet(P.cmd_verify, SID, cfg(), f, sleep=lambda s: None)
    chk("G2 verify of an attempt that never posted (container FINISHED) clears the doubt and leaves it PUBLISH_FAILED", state()["status"] == "PUBLISH_FAILED" and state()["publish"]["uncertain"] is False)
    fresh(tmp); approve()
    wrong = lambda self, q, form: (200, {"id": "m-777", "permalink": "https://www.instagram.com/reel/ABC123/", "media_product_type": "REELS", "caption": "a different caption"})
    m = publish(Fake(**{r"^GET /m-777$": wrong}))
    chk("G3 a post whose caption differs is VERIFICATION_FAILED, never VERIFIED", state()["status"] == "VERIFICATION_FAILED", state()["status"])
    nolink = lambda self, q, form: (200, {"id": "m-777", "media_product_type": "REELS", "caption": CAPTION.strip()})
    quiet(P.cmd_verify, SID, cfg(), Fake(**{r"^GET /m-777$": nolink}), sleep=lambda s: None)
    chk("G4 no permalink yet: still VERIFICATION_FAILED", state()["status"] == "VERIFICATION_FAILED")
    quiet(P.cmd_verify, SID, cfg(), Fake(), sleep=lambda s: None)
    led = json.load(open(P.LEDGER))
    chk("G5 a later verify that succeeds -> VERIFIED, and the ledger carries the permalink", state()["status"] == "VERIFIED" and led["publications"][-1]["status"] == "VERIFIED"
        and led["publications"][-1]["permalink"] == "https://www.instagram.com/reel/ABC123/", led)
    fresh(tmp); approve()
    publish(Fake(**{r"^POST /17841400000000000/media$": graph_error(10, "no permission", 403)}))
    chk("G6 a failed publish is never recorded as published (no ledger entry, no media ID)", not os.path.exists(P.LEDGER) and "mediaId" not in state()["publish"])

    # ============================================================ H. security
    red = P.Redactor([TOKEN])
    s = red("GET https://graph.instagram.com/v25.0/1?fields=id&access_token=%s  Authorization: OAuth %s  EAAB%s  IGAA%s" % (TOKEN, TOKEN, "x" * 30, "y" * 40))
    chk("H1 the redactor removes the token, access_token=, Authorization headers and token-shaped strings", TOKEN not in s and "EAAB" + "x" * 30 not in s and "y" * 40 not in s and s.count("REDACTED") >= 4, s)
    e = raises(P.save_json, os.path.join(tmp, "leak.json"), {"note": TOKEN}, [TOKEN])
    chk("H2 a record that would contain the token is refused before it is written", e is not None and e.kind == "security" and not os.path.exists(os.path.join(tmp, "leak.json")), e)
    alltext = "\n".join(OUTPUT)
    logs = "".join(open(os.path.join(r, f_), encoding="utf-8").read() for r, _, fs in os.walk(tmp) for f_ in fs if f_ == "publish.log")
    recs = "".join(open(os.path.join(r, f_), encoding="utf-8").read() for r, _, fs in os.walk(tmp) for f_ in fs if f_ in ("reel.json", "publications.json"))
    chk("H3 across every test above: the token never reached the console, a publish log, reel.json or the ledger",
        TOKEN not in alltext and TOKEN not in logs and TOKEN not in recs and len(logs) > 0, (TOKEN in alltext, TOKEN in logs, TOKEN in recs))
    gi = subprocess.run(["git", "-C", ROOT, "check-ignore", ".env", ".env.production", "client_secret.json", "app-credentials.json", "page.token", "key.pem",
                         "tools/reel-maker/output/X/publish/publish.log", "tools/reel-maker/output/X/reel.json"], capture_output=True, text=True).stdout.split()
    ne = subprocess.run(["git", "-C", ROOT, "check-ignore", ".env.example", "tools/reel-maker/publications.json", "tools/instagram_publish.py"], capture_output=True, text=True).stdout.split()
    chk("H4 .gitignore keeps out .env files, credentials, keys, tokens and the private publishing state; .env.example and the ledger stay tracked", len(gi) == 8 and ne == [], (gi, ne))
    files = subprocess.run(["git", "-C", ROOT, "ls-files", "-co", "--exclude-standard"], capture_output=True, text=True).stdout.split("\n")
    hits = []
    for f_ in files:
        p = os.path.join(ROOT, f_)
        if not f_ or not os.path.isfile(p) or os.path.getsize(p) > 3e6 or f_.endswith((".png", ".jpg", ".pdf", ".mp4", ".woff2", ".ico", ".webp", ".gz", ".zip")):
            continue
        try:
            t = open(p, encoding="utf-8").read()
        except (UnicodeDecodeError, OSError):
            continue
        for pat in (P.SECRET_PATTERNS[0], P.SECRET_PATTERNS[4], re.compile(r"IG_ACCESS_TOKEN=[A-Za-z0-9_-]{20,}"), re.compile(r"(?<![\w.])IGAA[A-Za-z0-9_-]{30,}")):
            for mm in pat.finditer(t):
                if "FakeToken" not in mm.group(0):
                    hits.append("%s: %s…" % (f_, mm.group(0)[:12]))
    chk("H5 no access token, private key or filled IG_ACCESS_TOKEN in any tracked or new file of the repository", hits == [], hits[:5])
    src = open(os.path.join(ROOT, "tools", "instagram_publish.py")).read()
    hosts = set(re.findall(r"https?://([a-z0-9.-]+)", src)) - {"www.instagram.com", "instagram.com"}
    banned = [w for w in ("playwright", "selenium", "puppeteer", "webdriver", "i.instagram.com", "/api/v1/", "sessionid", "csrftoken", "getpass", "password=", "cookie") if w in src.lower()]
    chk("H6 the publisher only knows the official hosts and has no browser automation, cookies, passwords or private API", hosts <= P.ALLOWED_HOSTS and banned == [], (hosts, banned))


if __name__ == "__main__":
    main()
