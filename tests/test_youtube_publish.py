#!/usr/bin/env python3
"""tools/youtube_publish.py and tools/publish.py - YouTube Shorts publishing of an approved reel, mocked.

No real request: Google's token, Data API and upload endpoints are a scripted fake, the sign-in's browser is a fake
that calls the local redirect, and every reel is a synthetic fixture in a temporary directory (the same fixture as
tests/test_instagram_publish.py). Sections: A config, B sign-in, C approval and the reel's hash, D metadata,
E dry run and destinations, F upload, G failures and the unknown state, H verification and duplicates,
I privacy, J secrets, K real API (only with RUN_REAL_YOUTUBE_TESTS=1, private only).

Run:  tests/.venv/bin/python tests/test_youtube_publish.py
"""
import contextlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
import instagram_publish as IP  # noqa: E402
import youtube_publish as Y  # noqa: E402
import publish as PUB  # noqa: E402
import test_instagram_publish as T  # noqa: E402  - the shared reel fixture

ok, fail = [], []
SID = T.SID
# fake credentials, assembled at run time so that no token-shaped string appears in the source (secret scanners)
SECRET = "GOCSPX" + "-" + "FakeClientSecretForTests1234"
REFRESH = "1/" + "/0" + "FakeRefreshTokenForTests0123456789abcdef"
ACCESS = "ya29" + "." + "FakeAccessTokenForTests0123456789abcdef"
EXTRA_SECRET = "GOCSPX" + "-" + "abcdefghijklmnop"
CHAN = "UC" + "A" * 22
OUT = []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or detail == "" else "  -> " + str(detail)))


def quiet(fn, *a, **k):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
        try:
            r = fn(*a, **k)
        except Y.PublishError as e:
            r = e
    OUT.append(buf.getvalue())
    return r


class Fake:
    """Google, scripted: token refresh, channels, resumable upload, thumbnails, videos.list, playlistItems"""

    def __init__(self, **over):
        self.calls = []
        self.over = over
        self.processing = list(over.pop("processing", ["processed"]))

    def request(self, method, url, headers=None, body=None, timeout=60):
        u = urllib.parse.urlparse(url)
        if u.scheme != "https" or u.hostname not in Y.ALLOWED_HOSTS:
            raise AssertionError("request outside the allow-list: " + url)
        q = dict(urllib.parse.parse_qsl(u.query))
        self.calls.append({"method": method, "path": u.path, "q": q, "headers": dict(headers or {}), "body": body or b""})
        key = method + " " + u.path
        for pat, h in self.over.items():
            if re.search(pat, key):
                r = h(self, q, headers or {}, body) if callable(h) else h
                if isinstance(r, Exception):
                    raise r
                if r is not None:
                    st, hd, data = r
                    return st, hd, (data if isinstance(data, bytes) else json.dumps(data).encode())
        return self.default(key, q, headers or {}, body)

    def default(self, key, q, h, body):
        J = lambda st, d, hd=None: (st, hd or {}, json.dumps(d).encode())
        if key == "POST /token":
            return J(200, {"access_token": ACCESS, "expires_in": 3599, "token_type": "Bearer"})
        if key == "GET /youtube/v3/channels":
            return J(200, {"items": [{"id": CHAN, "snippet": {"title": "PrayogX"}, "contentDetails": {"relatedPlaylists": {"uploads": "UU" + "A" * 22}}}]})
        if key == "POST /upload/youtube/v3/videos":
            self.resource = json.loads(body.decode())
            return J(200, {}, {"Location": "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=SESSION1"})
        if key == "PUT /upload/youtube/v3/videos":
            if h.get("Content-Range", "").startswith("bytes */"):
                return J(308, {}, {"Range": "bytes=0-99"})
            return J(200, {"id": "vid123", "status": {"privacyStatus": self.resource["status"]["privacyStatus"]}})
        if key == "POST /upload/youtube/v3/thumbnails/set":
            return J(200, {"items": [{"default": {}}]})
        if key == "GET /youtube/v3/videos":
            st = self.processing.pop(0) if len(self.processing) > 1 else self.processing[0]
            r = self.resource
            return J(200, {"items": [{"id": q.get("id"), "snippet": {"channelId": CHAN, "title": r["snippet"]["title"], "description": r["snippet"]["description"],
                                                                      "publishedAt": "2026-10-02T10:00:00Z"},
                                      "status": {"uploadStatus": st, "privacyStatus": r["status"]["privacyStatus"]}, "processingDetails": {"processingStatus": "succeeded"}}]})
        if key == "GET /youtube/v3/playlistItems":
            return J(200, {"items": [{"snippet": {"title": getattr(self, "resource", {}).get("snippet", {}).get("title", ""), "publishedAt": "2099-01-01T00:00:00Z"},
                                      "contentDetails": {"videoId": "vidFOUND", "videoPublishedAt": "2099-01-01T00:00:00Z"}}]})
        return J(404, {"error": {"code": 404, "message": "no route " + key}})

    def puts(self):
        return [c for c in self.calls if c["method"] == "PUT"]

    def uploads(self):
        return [c for c in self.calls if c["path"].startswith("/upload/")]


def gerr(status, reason, msg="err"):
    return (status, {}, {"error": {"code": status, "message": msg, "errors": [{"reason": reason, "message": msg}]}})


class Clock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t

    def sleep(self, s):
        self.t += s


def setup(tmp, approve=True, **kw):
    out = T.fresh(tmp, **kw)
    if approve:
        T.approve()
    return out


def ycfg(tmp, **over):
    tok = os.path.join(tmp, "yt-token.json")
    if not os.path.exists(tok):
        Y.save_token(Y.Config({"YT_TOKEN_FILE": tok}), {"refresh_token": REFRESH, "scope": " ".join(Y.SCOPES_BASE), "obtainedAt": "x"})
    e = {"YT_CLIENT_ID": "1234-abc.apps.googleusercontent.com", "YT_CLIENT_SECRET": SECRET, "YT_CHANNEL_ID": CHAN, "YT_TOKEN_FILE": tok, "YT_POLL_INTERVAL_S": "10", "YT_POLL_TIMEOUT_S": "60"}
    e.update(over)
    return Y.load_config(e, env_file="")


def publish(tmp, fake, privacy="private", clock=None, **kw):
    clock = clock or Clock()
    c = kw.pop("config", None) or ycfg(tmp)
    return quiet(Y.cmd_publish, SID, c, privacy, fake, confirm=kw.pop("confirm", SID), sleep=clock.sleep, clock=clock, **kw)


def ystate():
    return Y.yt_state(IP.load_reel(SID))


def main():
    tmp = tempfile.mkdtemp(prefix="ytpub-")
    try:
        run(tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print()
    print("%d passed, %d failed" % (len(ok), len(fail)))
    sys.exit(1 if fail else 0)


def run(tmp):
    # ============================================================ A. configuration
    c0 = Y.load_config({"YT_TOKEN_FILE": os.path.join(tmp, "no-token.json")}, env_file="")   # never the real token at the default path
    pr = c0.problems()
    chk("A1 missing client ID, client secret, channel and sign-in are each reported", all(any(k in p for p in pr) for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_CHANNEL_ID", "not signed in")), pr)
    chk("A2 a complete configuration has no problems", ycfg(tmp).problems() == [], ycfg(tmp).problems())
    inside = ycfg(tmp, YT_TOKEN_FILE=os.path.join(ROOT, ".tmp", "yt-test-token.json"))
    os.makedirs(os.path.join(ROOT, ".tmp"), exist_ok=True)
    Y.save_token(inside, {"refresh_token": "x"})
    pin = inside.problems()
    os.remove(os.path.join(ROOT, ".tmp", "yt-test-token.json"))
    chk("A3 a token file inside the repository is refused", any("inside the repository" in p for p in pin), pin)
    loose = os.path.join(tmp, "loose.json"); open(loose, "w").write("{}"); os.chmod(loose, 0o644)
    chk("A4 a token file readable by others is refused (chmod 600)", any("chmod 600" in p for p in ycfg(tmp, YT_TOKEN_FILE=loose).problems()))
    chk("A5 describe() never shows the client secret", SECRET not in json.dumps(ycfg(tmp).describe()))
    e = None
    try:
        Y.HttpTransport().request("GET", "https://studio.youtube.com/x")
    except Y.PublishError as x:
        e = x
    chk("A6 the HTTP layer refuses anything but oauth2.googleapis.com and www.googleapis.com (no Studio, no scraping)", e is not None and e.kind == "security")
    chk("A7 invalid privacy and category values are configuration problems", any("YT_DEFAULT_PRIVACY" in p for p in ycfg(tmp, YT_DEFAULT_PRIVACY="secret").problems())
        and any("YT_CATEGORY_ID" in p for p in ycfg(tmp, YT_CATEGORY_ID="edu").problems()))

    # ============================================================ B. sign-in (OAuth for desktop apps: loopback + PKCE)
    seen = {}

    def browser(url):
        seen["url"] = url
        q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(url).query))
        def go():
            urllib.request.urlopen(q["redirect_uri"] + "/?" + urllib.parse.urlencode({"code": "4/FAKECODE", "state": q["state"]}), timeout=10).read()
        threading.Thread(target=go, daemon=True).start()
        return True
    tokf = os.path.join(tmp, "auth-token.json")
    cauth = ycfg(tmp, YT_TOKEN_FILE=tokf)
    f = Fake(**{r"^POST /token$": lambda s, q, h, b: (200, {}, {"access_token": ACCESS, "refresh_token": REFRESH, "scope": " ".join(Y.SCOPES_BASE)})
                if b"grant_type=authorization_code" in b and b"code_verifier=" in b else (400, {}, {"error": "invalid_request"})})
    r = quiet(Y.cmd_auth, cauth, f, browser, 20)
    aq = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(seen.get("url", "")).query))
    chk("B1 sign-in uses Google's consent page with PKCE (S256), a 127.0.0.1 redirect and the upload + read-only scopes",
        seen.get("url", "").startswith(Y.AUTH_URL) and aq.get("code_challenge_method") == "S256" and len(aq.get("code_challenge", "")) >= 43
        and aq.get("redirect_uri", "").startswith("http://127.0.0.1:") and set(aq.get("scope", "").split()) == set(Y.SCOPES_BASE), aq)
    tok = json.load(open(tokf)) if os.path.exists(tokf) else {}
    chk("B2 the refresh token is stored (mode 600, outside the repo) and the access token is not", r is True and tok.get("refresh_token") == REFRESH and "access_token" not in tok
        and oct(os.stat(tokf).st_mode & 0o777) == "0o600", (r, list(tok)))
    chk("B3 the sign-in prints neither the secret, the code verifier nor any token", SECRET not in OUT[-1] and REFRESH not in OUT[-1] and ACCESS not in OUT[-1] and "Signed in" in OUT[-1])

    cid = ycfg(tmp).client_id
    tokraw = open(tokf).read()
    chk("B7 the client ID never appears in the auth output, and the token file keeps only a SHA-256 fingerprint (no ID, no secret)",
        cid not in OUT[-1] and cid.split(".")[0] not in OUT[-1] and "accounts.google.com" not in OUT[-1] and cid.split(".")[0] not in tokraw and cid not in tokraw
        and SECRET not in tokraw and tok.get("client") == Y.client_fingerprint(cid) and re.fullmatch(r"sha256:[0-9a-f]{12}", tok.get("client", "")), (OUT[-1][-200:], tok.get("client")))
    r = quiet(Y.cmd_auth, ycfg(tmp, YT_TOKEN_FILE=os.path.join(tmp, "t3.json")), f, browser, 20, 0, True)
    chk("B8 --show-url prints the sign-in link on request (with a warning), and still never the secret", cid.split(".")[0] in OUT[-1] and "--show-url" in OUT[-1] and SECRET not in OUT[-1])
    r = quiet(Y.cmd_auth, ycfg(tmp, YT_TOKEN_FILE=os.path.join(tmp, "t4.json")), f, lambda u: False, 1)
    chk("B9 a browser that cannot open: the link is not printed; it says to use --show-url", cid.split(".")[0] not in OUT[-1] and "--show-url" in OUT[-1] and isinstance(r, Y.PublishError))

    def bad_state(url):
        q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(url).query))
        threading.Thread(target=lambda: urllib.request.urlopen(q["redirect_uri"] + "/?code=4/X&state=forged", timeout=10).read(), daemon=True).start()
    r = quiet(Y.cmd_auth, ycfg(tmp, YT_TOKEN_FILE=os.path.join(tmp, "t2.json")), f, bad_state, 20)
    chk("B4 a redirect with a forged state is refused and nothing is stored", isinstance(r, Y.PublishError) and r.kind == "auth" and not os.path.exists(os.path.join(tmp, "t2.json")), r)
    pl = ycfg(tmp, YT_PLAYLIST_ID="PL123")
    chk("B5 the playlist scope is asked for only when a playlist is configured", Y.SCOPE_PLAYLIST in pl.scopes() and Y.SCOPE_PLAYLIST not in ycfg(tmp).scopes())
    f = Fake(**{r"^POST /token$": (400, {}, {"error": "invalid_grant", "error_description": "Token has been expired or revoked."})})
    try:
        Y.YouTube(ycfg(tmp), f).access_token(); kind = None
    except Y.PublishError as x:
        kind, msg = x.kind, str(x)
    chk("B6 an expired or revoked refresh token says: run auth again (7-day tokens in OAuth Testing)", kind == "auth" and "auth" in msg and "7-day" in msg)

    # ============================================================ C. approval and the reel's hash (the shared approval)
    setup(tmp, approve=False)
    f = Fake()
    e = publish(tmp, f)
    chk("C1 a reel that is not approved is not uploaded (no upload request at all)", isinstance(e, Y.PublishError) and e.kind == "preflight" and f.uploads() == [], e)
    out = setup(tmp)
    open(os.path.join(out, SID, "reel.mp4"), "ab").write(b"tampered")
    f = Fake()
    e = publish(tmp, f)
    chk("C2 reel.mp4 changed after approval: refused before any upload", isinstance(e, Y.PublishError) and f.uploads() == [], e)
    out = setup(tmp)
    m = IP.load_reel(SID); m["status"] = "REJECTED"; IP.save_reel(SID, m)
    e = publish(tmp, Fake())
    chk("C3 a rejected reel is refused", isinstance(e, Y.PublishError) and e.kind == "preflight", e)
    chk("C4 there is one approval system: YouTube reads the Instagram publisher's approval and hashes", "IP.approval_problems" in open(os.path.join(ROOT, "tools", "youtube_publish.py")).read()
        and "def cmd_approve" not in open(os.path.join(ROOT, "tools", "youtube_publish.py")).read())

    # ============================================================ D. metadata (YouTube's own)
    setup(tmp)
    md = Y.build_metadata(SID)
    cap = open(os.path.join(IP.OUT_DIR, SID, "caption.txt"), encoding="utf-8").read()
    chk("D1 the title is YouTube's own, from the registry (<= 100 characters, no < >), not the Instagram caption",
        len(md["title"]) <= 100 and "JEE Advanced 2026 Physics Q15" in md["title"] and "<" not in md["title"] and md["title"] not in cap and md["description"] != cap.strip(), md["title"])
    chk("D2 the description links the experiment and states the original music; tags fit 500 characters",
        "https://prayogx.co.in/s/%s/" % SID in md["description"] and "original, made by PrayogX" in md["description"] and len(",".join(md["tags"])) <= 500 and "PrayogX" in md["tags"])
    chk("D3 the metadata does not force Shorts with misleading text (no #Shorts) and makes no claim beyond the registry", "#Shorts" not in md["description"] and "#shorts" not in md["title"].lower())
    bad = dict(md, title="x" * 101)
    bad2 = dict(md, description=md["description"] + "\nThe answer is (C).")
    bad3 = dict(md, description=md["description"] + " <b>")
    chk("D4 limits, angle brackets and an answer giveaway are caught", Y.metadata_problems(bad) and Y.metadata_problems(bad2, "C") and Y.metadata_problems(bad3) and not Y.metadata_problems(md, "C"))
    p = Y.metadata_path(SID)
    edited = dict(Y.load_metadata(SID), title="Edited title | JEE Advanced 2026 Physics Q15")
    IP.save_json(p, edited)
    chk("D5 an edited youtube.json is kept (the reviewed text is what is uploaded)", Y.load_metadata(SID)["title"] == "Edited title | JEE Advanced 2026 Physics Q15")
    os.remove(p)

    # ============================================================ E. dry run and destinations
    setup(tmp)
    f = Fake()
    items = quiet(Y.cmd_dry_run, SID, ycfg(tmp), f, online=False)
    chk("E1 an offline dry run makes no request", f.calls == [] and isinstance(items, list))
    f = Fake()
    items = quiet(Y.cmd_dry_run, SID, ycfg(tmp), f, online=True, privacy="private")
    chk("E2 an online dry run refreshes the token and reads the channel - nothing else, no upload", [c["method"] + " " + c["path"] for c in f.calls] == ["POST /token", "GET /youtube/v3/channels"], [c["path"] for c in f.calls])
    chk("E3 an approved, valid reel with a working sign-in passes every item", all(o is True for n, o, d in items), [(n, d) for n, o, d in items if o is not True])
    cidE = ycfg(tmp).client_id
    chk("E4b the dry run never shows any character of the client ID or the secret (only 'set')", cidE.split(".")[0] not in OUT[-1] and cidE not in OUT[-1] and SECRET not in OUT[-1]
        and '"YT_CLIENT_ID": "set"' in OUT[-1])
    calls_lines = re.findall(r"^  (\d)\. (POST|PUT|GET)", OUT[-1], re.M)
    chk("E4c the configuration line reads cleanly ('YT_CLIENT_SECRET': 'set', not mangled) and the calls are numbered 1, 2, 3, 4",
        '"YT_CLIENT_SECRET": "set"' in OUT[-1] and "CLIENT_SECRET=" not in OUT[-1] and [n for n, _ in calls_lines] == ["1", "2", "3", "4"], [n for n, _ in calls_lines])
    quiet(Y.cmd_dry_run, SID, ycfg(tmp, YT_PLAYLIST_ID="PLx"), Fake(), online=False)
    chk("E4d with a playlist configured the calls are numbered 1 to 5 with no gap", [n for n, _ in re.findall(r"^  (\d)\. (POST|PUT|GET)", OUT[-1], re.M)] == ["1", "2", "3", "4", "5"])
    quiet(Y.cmd_dry_run, SID, ycfg(tmp), f, online=True, privacy="private")
    chk("E4 the dry run shows the title, the privacy, the description and the exact calls", "title:" in OUT[-1] and "privacy: private" in OUT[-1] and "uploadType=resumable" in OUT[-1] and "READY TO UPLOAD (private)" in OUT[-1])
    f = Fake(**{r"GET /youtube/v3/channels": (200, {}, {"items": [{"id": "UC" + "B" * 22, "snippet": {"title": "Someone else"}}]})})
    items = quiet(Y.cmd_dry_run, SID, ycfg(tmp), f, online=True)
    chk("E5 signed in to a different channel than YT_CHANNEL_ID: blocked", any(o is False and "channel" in n for n, o, d in items))
    r = quiet(PUB.main, ["publish", SID])
    chk("E6 tools/publish.py refuses to publish without --instagram or --youtube (approval is not 'everywhere')", r == 2 and "--instagram and/or --youtube" in OUT[-1])
    r = quiet(PUB.main, ["publish", SID, "--youtube"])
    chk("E7 a YouTube upload without --privacy is refused", r == 2 and "--privacy" in OUT[-1])
    chk("E8 the factory never authenticates or uploads: auto_sim.py and generate-reel.js have no YouTube call",
        not re.search(r"youtube_publish|googleapis", open(os.path.join(ROOT, "tools", "auto_sim.py")).read() + open(os.path.join(ROOT, "tools", "reel-maker", "generate-reel.js")).read()))

    # ============================================================ F. a successful upload (private)
    setup(tmp)
    f = Fake()
    mm = publish(tmp, f)
    seq = [c["method"] + " " + c["path"] for c in f.calls]
    chk("F1 the documented sequence: token, channel, resumable session, PUT the file, thumbnail, verify",
        seq == ["POST /token", "GET /youtube/v3/channels", "POST /upload/youtube/v3/videos", "PUT /upload/youtube/v3/videos", "POST /upload/youtube/v3/thumbnails/set", "GET /youtube/v3/videos"], seq)
    init = [c for c in f.calls if c["method"] == "POST" and c["path"] == "/upload/youtube/v3/videos"][0]
    data = open(os.path.join(IP.OUT_DIR, SID, "reel.mp4"), "rb").read()
    res = json.loads(init["body"].decode())
    chk("F2 the session asks for snippet + status, private, not made for kids, notifySubscribers false, the exact byte count",
        init["q"].get("uploadType") == "resumable" and init["q"].get("part") == "snippet,status" and init["q"].get("notifySubscribers") == "false"
        and res["status"]["privacyStatus"] == "private" and res["status"]["selfDeclaredMadeForKids"] is False and init["headers"].get("X-Upload-Content-Length") == str(len(data)), (init["q"], res["status"]))
    chk("F3 the uploaded bytes are exactly the approved reel.mp4 (no re-encode, no second soundtrack)", f.puts()[0]["body"] == data and IP.sha256(os.path.join(IP.OUT_DIR, SID, "reel.mp4")) == IP.load_reel(SID)["approval"]["hashes"]["reel.mp4"])
    y = ystate()
    chk("F4 the YouTube state goes PUBLISHING > PUBLISHED > VERIFIED, with the video ID, URL and privacy", [h["status"] for h in y["history"]] == ["PUBLISHING", "PUBLISHED", "VERIFIED"]
        and y["videoId"] == "vid123" and y["url"] == "https://www.youtube.com/shorts/vid123" and y["privacyStatus"] == "private" and y.get("thumbnail") == "set", y)
    led = IP.load_ledger()["publications"]
    yl = [p for p in led if p.get("platform") == "youtube"]
    chk("F5 the ledger has a YouTube entry (videoId, url, privacy, times, reel sha256, reviewer) - and no token", len(yl) == 1 and yl[0]["videoId"] == "vid123" and yl[0]["status"] == "VERIFIED"
        and yl[0]["privacyStatus"] == "private" and yl[0]["reelSha256"] and ACCESS not in json.dumps(led) and REFRESH not in json.dumps(led))
    chk("F6 Instagram is untouched: its state stays APPROVED and its duplicate check does not see the YouTube entry",
        IP.load_reel(SID)["status"] == "APPROVED" and IP.ledger_entries(SID) == [])
    ig = T.Fake()
    mi = quiet(IP.cmd_publish, SID, T.cfg(), ig, confirm=SID, sleep=lambda s: None, clock=T.Clock())
    chk("F7 Instagram can still publish the same approved reel afterwards (independent platforms)", getattr(mi, "get", lambda k: None)("status") == "VERIFIED" and ystate()["status"] == "VERIFIED")

    # ============================================================ G. failures and the unknown state
    setup(tmp)
    f = Fake(**{r"POST /upload/youtube/v3/videos": gerr(403, "quotaExceeded", "The request cannot be completed because you have exceeded your quota.")})
    e = publish(tmp, f)
    chk("G1 quota exceeded when opening the session: PUBLISH_FAILED (quota), no bytes sent", isinstance(e, Y.PublishError) and e.kind == "quota" and f.puts() == [] and ystate()["status"] == "PUBLISH_FAILED", e)
    f = Fake()
    mm = publish(tmp, f)
    chk("G2 after a clean failure a new upload is allowed and succeeds", ystate()["status"] == "VERIFIED", ystate().get("status"))
    setup(tmp)
    f = Fake(**{r"^POST /token$": (400, {}, {"error": "invalid_grant", "error_description": "expired"})})
    e = publish(tmp, f)
    chk("G3 an expired sign-in stops at the preflight: no upload, the YouTube state untouched", isinstance(e, Y.PublishError) and e.kind == "preflight" and f.uploads() == [] and ystate() == {}, e)
    setup(tmp)
    f = Fake(**{r"PUT /upload/youtube/v3/videos": lambda s, q, h, b: gerr(400, "invalidVideoMetadata", "bad") if not h.get("Content-Range") else None})
    e = publish(tmp, f)
    chk("G4 YouTube refuses the upload (400): PUBLISH_FAILED with the reason, not unknown", isinstance(e, Y.PublishError) and ystate()["status"] == "PUBLISH_FAILED", e)
    setup(tmp)
    state = {"n": 0}

    def flaky(s, q, h, b):
        if h.get("Content-Range", "").startswith("bytes */"):
            return (308, {"Range": "bytes=0-1999"}, b"")
        state["n"] += 1
        if state["n"] == 1:
            return Y.PublishError("network", "network error: timed out")
        return (200, {}, {"id": "vid777", "status": {"privacyStatus": "private"}})
    f = Fake(**{r"PUT /upload/youtube/v3/videos": flaky, r"GET /youtube/v3/videos": lambda s, q, h, b: (200, {}, {"items": [{"id": "vid777", "snippet": {"channelId": CHAN,
        "title": Y.load_metadata(SID)["title"], "description": Y.load_metadata(SID)["description"]}, "status": {"uploadStatus": "processed", "privacyStatus": "private"}}]})})
    mm = publish(tmp, f)
    resumed = [c for c in f.puts() if c["headers"].get("Content-Range", "").startswith("bytes 2000-")]
    chk("G5 an interrupted upload asks the session how far it got (308 Range) and resumes from that byte", len(resumed) == 1 and resumed[0]["body"] == data[2000:] and ystate()["status"] == "VERIFIED", [c["headers"].get("Content-Range") for c in f.puts()])
    setup(tmp)
    f = Fake(**{r"PUT /upload/youtube/v3/videos": Y.PublishError("network", "network error: connection reset")})
    e = publish(tmp, f)
    chk("G6 no reply and the session cannot be read: UPLOAD_STATUS_UNKNOWN - never marked published", isinstance(e, Y.PublishError) and ystate()["status"] == "UPLOAD_STATUS_UNKNOWN" and not ystate().get("videoId"), ystate())
    f2 = Fake()
    e = publish(tmp, f2)
    chk("G7 an unknown state blocks a new upload until verify", isinstance(e, Y.PublishError) and f2.uploads() == [], e)
    f3 = Fake()
    f3.resource = {"snippet": {"title": Y.load_metadata(SID)["title"], "description": Y.load_metadata(SID)["description"]}, "status": {"privacyStatus": "private"}}
    quiet(Y.cmd_verify, SID, ycfg(tmp), f3, sleep=lambda s: None)
    chk("G8 verify finds the upload on the channel (same title, after the attempt): PUBLISHED, then checked", ystate()["videoId"] == "vidFOUND" and ystate()["status"] in ("VERIFIED", "VERIFICATION_FAILED", "PUBLISHED"), ystate().get("status"))
    setup(tmp)
    publish(tmp, Fake(**{r"PUT /upload/youtube/v3/videos": Y.PublishError("network", "reset")}))
    f4 = Fake(**{r"GET /youtube/v3/playlistItems": (200, {}, {"items": []})})
    quiet(Y.cmd_verify, SID, ycfg(tmp), f4, sleep=lambda s: None)
    chk("G9 verify finds nothing: PUBLISH_FAILED, and a new upload is allowed", ystate()["status"] == "PUBLISH_FAILED" and not any(c["method"] == "PUT" for c in f4.calls))

    # ============================================================ H. verification and duplicates
    setup(tmp)
    cl = Clock()
    f = Fake(processing=["uploaded", "uploaded", "processed"])
    publish(tmp, f, clock=cl)
    chk("H1 still processing: it polls videos.list until uploadStatus is processed, then VERIFIED", ystate()["status"] == "VERIFIED" and len([c for c in f.calls if c["path"] == "/youtube/v3/videos"]) == 3)
    setup(tmp)
    f = Fake(processing=["uploaded"])
    publish(tmp, f, clock=Clock())
    chk("H2 never processed within the wait: stays PUBLISHED (not VERIFIED), with a note to verify later", ystate()["status"] == "PUBLISHED" and "verify" in ystate().get("verificationNote", ""))
    setup(tmp)
    f = Fake(**{r"GET /youtube/v3/videos": lambda s, q, h, b: (200, {}, {"items": [{"id": "vid123", "snippet": {"channelId": CHAN, "title": "different", "description": ""},
                                                                                     "status": {"uploadStatus": "processed", "privacyStatus": "private"}}]})})
    publish(tmp, f)
    chk("H3 a video whose title differs is VERIFICATION_FAILED, never VERIFIED", ystate()["status"] == "VERIFICATION_FAILED" and "title" in ystate().get("verificationError", ""))
    setup(tmp)
    f = Fake(**{r"GET /youtube/v3/videos": lambda s, q, h, b: (200, {}, {"items": [{"id": "vid123", "snippet": {"channelId": CHAN, "title": s.resource["snippet"]["title"],
        "description": s.resource["snippet"]["description"]}, "status": {"uploadStatus": "rejected", "rejectionReason": "duplicate", "privacyStatus": "private"}}]})})
    publish(tmp, f)
    chk("H4 a rejected upload is VERIFICATION_FAILED with YouTube's reason", ystate()["status"] == "VERIFICATION_FAILED" and "duplicate" in ystate().get("verificationError", ""))
    setup(tmp)
    publish(tmp, Fake())
    f = Fake()
    e = publish(tmp, f)
    chk("H5 the same reel is not uploaded twice (state and ledger)", isinstance(e, Y.PublishError) and f.uploads() == [], e)
    e = publish(tmp, Fake(), force=True, confirm_reupload=None, reason="fix")
    chk("H6 a forced re-upload without --confirm-reupload <ID> is refused", isinstance(e, Y.PublishError) and e.kind == "duplicate")
    f = Fake()
    mm = publish(tmp, f, force=True, confirm_reupload=SID, reason="better title")
    chk("H7 a confirmed forced re-upload goes through and is marked forced", ystate()["status"] == "VERIFIED" and ystate().get("forced") is True and len(f.puts()) == 1)

    # ============================================================ I. privacy
    setup(tmp)
    f = Fake()
    publish(tmp, f, privacy="unlisted")
    chk("I1 unlisted is uploaded as unlisted and verified as unlisted", ystate()["privacyStatus"] == "unlisted" and ystate()["status"] == "VERIFIED")
    setup(tmp)
    e = publish(tmp, Fake(), privacy="public")
    chk("I2 public needs --confirm-public <ID>", isinstance(e, Y.PublishError) and "--confirm-public" in str(e))
    f = Fake()
    e = publish(tmp, f, privacy="public", confirm_public=SID)
    chk("I3 public from an unaudited project (YT_PROJECT_AUDITED not true) is refused before any upload", isinstance(e, Y.PublishError) and f.uploads() == [], e)
    f = Fake(**{r"GET /youtube/v3/videos": lambda s, q, h, b: (200, {}, {"items": [{"id": "vid123", "snippet": {"channelId": CHAN, "title": s.resource["snippet"]["title"],
        "description": s.resource["snippet"]["description"]}, "status": {"uploadStatus": "processed", "privacyStatus": "private"}}]})})
    publish(tmp, f, privacy="public", confirm_public=SID, config=ycfg(tmp, YT_PROJECT_AUDITED="true"))
    chk("I4 public requested but YouTube kept it private: VERIFICATION_FAILED, explained (the audit lock) - never reported public",
        ystate()["status"] == "VERIFICATION_FAILED" and "kept it private" in ystate().get("verificationError", ""), ystate().get("verificationError"))
    e = quiet(Y.cmd_publish, SID, ycfg(tmp), "secret", Fake(), confirm=SID)
    chk("I5 an invalid privacy value is refused", isinstance(e, Y.PublishError) and e.kind == "config")

    # ============================================================ J. secrets
    red = Y.Redactor([SECRET])
    s = red("refresh_token=%s access_token: %s Authorization: Bearer %s client_secret=%s %s" % (REFRESH, ACCESS, ACCESS, SECRET, EXTRA_SECRET))
    chk("J1 the redactor removes refresh and access tokens, Bearer headers and client secrets", REFRESH not in s and ACCESS not in s and SECRET not in s and EXTRA_SECRET not in s and s.count("REDACTED") >= 4, s)
    e = None
    try:
        Y.save_json(os.path.join(tmp, "leak.json"), {"x": REFRESH}, [])
    except Y.PublishError as x:
        e = x
    chk("J2 a record that would hold a Google refresh token is refused before it is written", e is not None and e.kind == "security" and not os.path.exists(os.path.join(tmp, "leak.json")))
    blob = "\n".join(OUT)
    logs = "".join(open(os.path.join(r_, f_), encoding="utf-8").read() for r_, _, fs in os.walk(tmp) for f_ in fs if f_ == "publish.log")
    recs = "".join(open(os.path.join(r_, f_), encoding="utf-8").read() for r_, _, fs in os.walk(tmp) for f_ in fs if f_ in ("reel.json", "publications.json", "youtube.json"))
    chk("J3 across every test: no token or client secret on the console, in a publish log, reel.json, youtube.json or the ledger",
        all(x not in blob + logs + recs for x in (SECRET, REFRESH, ACCESS)) and len(logs) > 0)
    gi = subprocess.run(["git", "-C", ROOT, "check-ignore", ".env", "client_secret_123.apps.googleusercontent.com.json", "youtube-token.json"], capture_output=True, text=True).stdout.split()
    chk("J4 .gitignore keeps out .env, Google client-secret JSON files and token files", len(gi) == 3, gi)
    files = subprocess.run(["git", "-C", ROOT, "ls-files", "-co", "--exclude-standard"], capture_output=True, text=True).stdout.split("\n")
    hits = []
    for f_ in files:
        pth = os.path.join(ROOT, f_)
        if not f_ or not os.path.isfile(pth) or os.path.getsize(pth) > 3e6 or f_.endswith((".png", ".jpg", ".mp4", ".pdf", ".woff2", ".webp")):
            continue
        try:
            t = open(pth, encoding="utf-8").read()
        except (UnicodeDecodeError, OSError):
            continue
        for pat in (Y.SECRET_RE[0], Y.SECRET_RE[1], Y.SECRET_RE[2], re.compile(r'"client_secret"\s*:\s*"[^"]{10,}"'), re.compile(r'"refresh_token"\s*:\s*"1//')):
            for mt in pat.finditer(t):
                if "Fake" not in mt.group(0) and "abcdefghijklmnop" not in mt.group(0):
                    hits.append("%s: %s…" % (f_, mt.group(0)[:14]))
    chk("J5 no Google access token, refresh token or client secret in any tracked or new file", hits == [], hits[:5])
    src = open(os.path.join(ROOT, "tools", "youtube_publish.py")).read()
    banned = [w for w in ("playwright", "selenium", "studio.youtube", "cookiejar", "set-cookie", "password=", "getpass", "youtubei/") if w in src.lower()]
    hosts = set(re.findall(r"https://([a-z0-9.-]+)", src)) - {"www.youtube.com", "prayogx.co.in", "accounts.google.com"}
    chk("J6 only Google's official API hosts; no browser automation, Studio, cookies, passwords or private API", banned == [] and hosts <= Y.ALLOWED_HOSTS, (banned, hosts))

    # ============================================================ K. the real API - opt-in only, private only
    if os.environ.get("RUN_REAL_YOUTUBE_TESTS") == "1":
        rc = Y.load_config()
        items = quiet(Y.cmd_dry_run, os.environ.get("RUN_REAL_YOUTUBE_ID", SID), rc, None, online=True, privacy="private")
        chk("K1 real API (opt-in): the online dry run's live check passes", any(n.startswith("live:") and o for n, o, d in items), [(n, d) for n, o, d in items if n.startswith("live")])
        if os.environ.get("RUN_REAL_YOUTUBE_UPLOAD"):
            sid = os.environ["RUN_REAL_YOUTUBE_UPLOAD"]
            print("K2: a real PRIVATE upload of %s was requested with RUN_REAL_YOUTUBE_UPLOAD - run it yourself: python3 tools/youtube_publish.py publish %s --privacy private" % (sid, sid))
    else:
        print("SKIP  K real YouTube API tests (set RUN_REAL_YOUTUBE_TESTS=1 to run the read-only live check; uploads are never made by this suite)")


if __name__ == "__main__":
    main()
