#!/usr/bin/env python3
"""PrayogX - YouTube Shorts publishing of an approved reel (official YouTube Data API v3 only).

The same validated, reviewed tools/reel-maker/output/<ID>/reel.mp4 (its original PrayogX music and effects
untouched) is uploaded as a YouTube Short - only when a person asks for the YouTube destination explicitly:

    python3 tools/youtube_publish.py auth                                    one-time sign-in (OAuth, desktop + PKCE)
    python3 tools/youtube_publish.py status [<ID>]                           YouTube state of every reel
    python3 tools/youtube_publish.py metadata <ID>                           write / show the YouTube title, description, tags
    python3 tools/youtube_publish.py publish <ID> --dry-run [--online]       the checklist and the exact request; uploads nothing
    python3 tools/youtube_publish.py publish <ID> --privacy private          upload (asks you to type the ID)
    python3 tools/youtube_publish.py publish <ID> --privacy public --confirm-public <ID>
    python3 tools/youtube_publish.py verify <ID>                             re-check, or resolve an unknown upload state

Approval is the Instagram publisher's (tools/instagram_publish.py approve): one approval system, bound to the
sha256 of the reel, thumbnail and caption that were validated. YouTube's state is separate (reel.json ->
platforms.youtube) and so is its ledger entry (tools/reel-maker/publications.json, platform "youtube"):
Instagram and YouTube never block or mark each other.

YouTube states: PUBLISHING -> PUBLISHED (uploaded, video ID known) -> VERIFIED (read back: our channel, our title
and description, the privacy asked for, upload status processed); failures PUBLISH_FAILED, VERIFICATION_FAILED;
UPLOAD_STATUS_UNKNOWN when the upload may have reached YouTube without a reply - no retry until verify resolves it.

Official endpoints only (allow-listed hosts oauth2.googleapis.com and www.googleapis.com): the resumable upload
(POST /upload/youtube/v3/videos?uploadType=resumable, then PUT), thumbnails.set, playlistItems.insert (only when
configured), videos.list, channels.list, playlistItems.list. No browser automation, passwords, cookies or
private endpoints; the sign-in opens Google's own consent page in your browser and receives the code on
127.0.0.1. The refresh token is kept outside the repository (YT_TOKEN_FILE, default
~/.config/prayogx/youtube-token.json, mode 600) and never printed, logged or written to a record.

Restrictions verified 2026-10-02 (docs/YOUTUBE_SHORTS_PUBLISHING.md): uploads from API projects created after
28 July 2020 that have not passed Google's audit are locked to private; a project in OAuth "Testing" status gets
refresh tokens that expire after 7 days; vertical or square videos up to 3 minutes are Shorts.
"""
import argparse
import base64
import datetime
import hashlib
import http.server
import json
import os
import re
import secrets as pysecrets
import stat
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import instagram_publish as IP  # noqa: E402  - shared reel record, approval, integrity, ledger, redaction

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
API = "https://www.googleapis.com/youtube/v3"
UPLOAD = "https://www.googleapis.com/upload/youtube/v3"
ALLOWED_HOSTS = {"oauth2.googleapis.com", "www.googleapis.com"}
SCOPES_BASE = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"]
SCOPE_PLAYLIST = "https://www.googleapis.com/auth/youtube.force-ssl"
PRIVACY = ("private", "unlisted", "public")
SHORTS_MAX_S = 180
TITLE_MAX, DESC_MAX_BYTES, TAGS_MAX = 100, 5000, 500
YT_STATES = ["PUBLISHING", "PUBLISHED", "VERIFIED", "PUBLISH_FAILED", "VERIFICATION_FAILED", "UPLOAD_STATUS_UNKNOWN"]
YT_TRANSITIONS = {
    None: {"PUBLISHING"},
    "PUBLISH_FAILED": {"PUBLISHING"},
    "PUBLISHING": {"PUBLISHED", "PUBLISH_FAILED", "UPLOAD_STATUS_UNKNOWN"},
    "UPLOAD_STATUS_UNKNOWN": {"PUBLISHED", "PUBLISH_FAILED"},
    "PUBLISHED": {"VERIFIED", "VERIFICATION_FAILED", "PUBLISHED"},
    "VERIFICATION_FAILED": {"VERIFIED", "VERIFICATION_FAILED"},
    "VERIFIED": {"VERIFIED", "VERIFICATION_FAILED", "PUBLISHING"},       # PUBLISHING again only by a forced re-upload
}
SECRET_RE = [re.compile(r"\bya29\.[A-Za-z0-9_\-.]{20,}"), re.compile(r"\b1//[A-Za-z0-9_\-]{20,}"), re.compile(r"\bGOCSPX-[A-Za-z0-9_\-]{10,}"),
             re.compile(r"(refresh_token|access_token|client_secret|code_verifier)[\"']?\s*[:=]\s*[\"']?([^\"'&\s,}]{8,})", re.I),
             re.compile(r"(Authorization:\s*Bearer\s+)(\S+)", re.I)]

PublishError = IP.PublishError
now = IP.now


# ------------------------------------------------------------------ secrets
class Redactor(IP.Redactor):
    def __call__(self, text):
        text = IP.Redactor.__call__(self, text)
        text = SECRET_RE[0].sub("[REDACTED]", text)
        text = SECRET_RE[1].sub("[REDACTED]", text)
        text = SECRET_RE[2].sub("[REDACTED]", text)
        text = SECRET_RE[3].sub(lambda m: m.group(1) + "=[REDACTED]", text)
        return SECRET_RE[4].sub(lambda m: m.group(1) + "[REDACTED]", text)


def find_secrets(text, known=()):
    found = IP.find_secrets(text, known)
    for p, name in zip(SECRET_RE, ["a Google access token", "a Google refresh token", "a Google client secret", "a token parameter", "an Authorization header"]):
        if p.search(text):
            found.append(name)
    return found


def save_json(path, data, known=()):
    """write a record only after scanning it for Google and Meta secrets"""
    leaks = find_secrets(json.dumps(data, ensure_ascii=False), known)
    if leaks:
        raise PublishError("security", "refusing to write %s: it would contain %s" % (os.path.basename(path), ", ".join(sorted(set(leaks)))))
    IP.save_json(path, data, known)


def save_reel(sid, m, known=()):
    save_json(os.path.join(IP.reel_dir(sid), "reel.json"), m, known)


# ------------------------------------------------------------------ configuration
class Config:
    def __init__(self, v):
        self.client_id = v.get("YT_CLIENT_ID", "").strip()
        self.client_secret = v.get("YT_CLIENT_SECRET", "").strip()
        self.channel_id = v.get("YT_CHANNEL_ID", "").strip()
        self.token_file = os.path.expanduser(v.get("YT_TOKEN_FILE", "").strip() or "~/.config/prayogx/youtube-token.json")
        self.default_privacy = v.get("YT_DEFAULT_PRIVACY", "private").strip().lower() or "private"
        self.category_id = v.get("YT_CATEGORY_ID", "").strip()
        self.playlist_id = v.get("YT_PLAYLIST_ID", "").strip()
        self.made_for_kids = v.get("YT_MADE_FOR_KIDS", "false").strip().lower() == "true"
        self.notify = v.get("YT_NOTIFY_SUBSCRIBERS", "false").strip().lower() == "true"
        self.set_thumbnail = v.get("YT_SET_THUMBNAIL", "true").strip().lower() != "false"
        self.project_audited = v.get("YT_PROJECT_AUDITED", "false").strip().lower() == "true"
        self.poll_interval = float(v.get("YT_POLL_INTERVAL_S", "10") or 10)
        self.poll_timeout = float(v.get("YT_POLL_TIMEOUT_S", "300") or 300)
        self.env_file_mode = v.get("_ENV_FILE_MODE")

    def scopes(self):
        return SCOPES_BASE + ([SCOPE_PLAYLIST] if self.playlist_id else [])

    def problems(self, need_token=True):
        p = []
        if not self.client_id:
            p.append("YT_CLIENT_ID is not set (an OAuth client of type Desktop app in Google Cloud)")
        elif not self.client_id.endswith(".apps.googleusercontent.com"):
            p.append("YT_CLIENT_ID does not look like a Google OAuth client ID")
        if not self.client_secret:
            p.append("YT_CLIENT_SECRET is not set (shown with the Desktop OAuth client)")
        if not re.fullmatch(r"UC[A-Za-z0-9_-]{22}", self.channel_id or ""):
            p.append("YT_CHANNEL_ID must be the target channel's ID (UC... 24 characters) - 'auth' prints it")
        if self.default_privacy not in PRIVACY:
            p.append("YT_DEFAULT_PRIVACY must be private, unlisted or public")
        if self.category_id and not self.category_id.isdigit():
            p.append("YT_CATEGORY_ID must be a number (27 is Education)")
        if self.env_file_mode is not None and self.env_file_mode & 0o077:
            p.append(".env is readable by other users - run: chmod 600 .env")
        if need_token:
            if not os.path.exists(self.token_file):
                p.append("not signed in: run python3 tools/youtube_publish.py auth")
            elif stat.S_IMODE(os.stat(self.token_file).st_mode) & 0o077:
                p.append("the token file is readable by other users - run: chmod 600 " + self.token_file)
            elif os.path.realpath(self.token_file).startswith(os.path.realpath(ROOT) + os.sep):
                p.append("the token file is inside the repository - set YT_TOKEN_FILE outside it")
        return p

    def describe(self):
        return {"YT_CLIENT_ID": "set" if self.client_id else "NOT SET", "YT_CLIENT_SECRET": "set" if self.client_secret else "NOT SET",
                "YT_CHANNEL_ID": self.channel_id or "NOT SET", "token": ("present" if os.path.exists(self.token_file) else "absent (run auth)") + " at " + self.token_file,
                "YT_DEFAULT_PRIVACY": self.default_privacy, "YT_CATEGORY_ID": self.category_id or "not set (YouTube's default)",
                "YT_PLAYLIST_ID": self.playlist_id or "not set", "YT_PROJECT_AUDITED": self.project_audited, "YT_MADE_FOR_KIDS": self.made_for_kids}


def load_config(environ=None, env_file=None):
    environ = os.environ if environ is None else environ
    env_file = IP.ENV_FILE if env_file is None else env_file
    vals = {}
    if env_file and os.path.isfile(env_file):
        vals["_ENV_FILE_MODE"] = stat.S_IMODE(os.stat(env_file).st_mode)
        for line in open(env_file, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip().replace("export ", "")
                if k.startswith("YT_"):
                    vals[k] = v.strip().strip("'\"")
    vals.update({k: v for k, v in environ.items() if k.startswith("YT_")})
    return Config(vals)


# ------------------------------------------------------------------ HTTP (Google's official hosts only)
class HttpTransport:
    def request(self, method, url, headers=None, body=None, timeout=120):
        u = urllib.parse.urlparse(url)
        if u.scheme != "https" or u.hostname not in ALLOWED_HOSTS:
            raise PublishError("security", "refusing a request to %s: only %s" % (u.hostname, ", ".join(sorted(ALLOWED_HOSTS))))
        req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, dict(r.headers), r.read()
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers or {}), e.read()
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            raise PublishError("network", "network error: %s" % getattr(e, "reason", e))


def classify(status, payload):
    err = (payload or {}).get("error") or {}
    if isinstance(err, str):                                        # the token endpoint: {"error": "invalid_grant", ...}
        d = (payload or {}).get("error_description", "")
        if err in ("invalid_grant", "unauthorized_client", "invalid_client"):
            return "auth", "the sign-in is no longer valid (%s: %s) - run python3 tools/youtube_publish.py auth (projects in OAuth 'Testing' get 7-day refresh tokens)" % (err, d)
        return "auth", "OAuth error %s: %s" % (err, d)
    reasons = [e.get("reason") for e in err.get("errors", []) if isinstance(e, dict)]
    msg = err.get("message") or ("HTTP %s" % status)
    if status == 401:
        return "auth", "not authorised (401): run python3 tools/youtube_publish.py auth - " + msg
    if any(r in ("quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded", "userRateLimitExceeded", "uploadLimitExceeded") for r in reasons):
        return "quota", "YouTube quota or upload limit reached (%s): try again tomorrow or raise the quota in Google Cloud - %s" % (",".join(reasons), msg)
    if status == 403:
        return "permission", "permission refused (%s): the channel or the OAuth scopes do not allow this - %s" % (",".join(r for r in reasons if r) or "403", msg)
    if status == 400 and any(r in ("invalidTitle", "invalidDescription", "invalidTags", "invalidCategoryId", "mediaBodyRequired", "invalidVideoMetadata") for r in reasons):
        return "metadata", "YouTube refused the metadata (%s) - %s" % (",".join(reasons), msg)
    if status and status >= 500:
        return "network", "YouTube server error HTTP %s - %s" % (status, msg)
    return "api", "YouTube API error (HTTP %s, %s): %s" % (status, ",".join(r for r in reasons if r) or "-", msg)


# ------------------------------------------------------------------ OAuth: tokens
def load_token(cfg):
    try:
        return json.load(open(cfg.token_file, encoding="utf-8"))
    except (OSError, ValueError):
        return None


def save_token(cfg, data):
    os.makedirs(os.path.dirname(cfg.token_file), exist_ok=True)
    tmp = cfg.token_file + ".tmp"
    fd = os.open(tmp, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f)
    os.chmod(tmp, 0o600)
    os.replace(tmp, cfg.token_file)


class YouTube:
    def __init__(self, cfg, transport, log=print, sleep=time.sleep):
        self.cfg, self.t, self.log, self.sleep = cfg, transport, log, sleep
        self._access = None

    def _json(self, raw):
        try:
            return json.loads(raw.decode("utf-8") or "{}")
        except (ValueError, UnicodeDecodeError, AttributeError):
            return {}

    def access_token(self):
        if self._access:
            return self._access
        tok = load_token(self.cfg)
        if not tok or not tok.get("refresh_token"):
            raise PublishError("auth", "not signed in: run python3 tools/youtube_publish.py auth")
        body = urllib.parse.urlencode({"client_id": self.cfg.client_id, "client_secret": self.cfg.client_secret, "refresh_token": tok["refresh_token"],
                                       "grant_type": "refresh_token"}).encode()
        st, _, raw = self.t.request("POST", TOKEN_URL, {"Content-Type": "application/x-www-form-urlencoded"}, body, timeout=60)
        d = self._json(raw)
        if st != 200 or not d.get("access_token"):
            kind, msg = classify(st, d)
            raise PublishError(kind, msg)
        self._access = d["access_token"]
        return self._access

    def _auth(self, extra=None):
        h = {"Authorization": "Bearer " + self.access_token()}
        h.update(extra or {})
        return h

    def get(self, path, params, retries=3):
        url = API + path + "?" + urllib.parse.urlencode(params)
        for i in range(retries):
            try:
                st, _, raw = self.t.request("GET", url, self._auth(), timeout=60)
            except PublishError as e:
                if e.kind == "network" and i < retries - 1:
                    self.sleep(2 * (i + 1)); continue
                raise
            d = self._json(raw)
            if st == 200:
                return d
            kind, msg = classify(st, d)
            if kind == "network" and i < retries - 1:
                self.sleep(2 * (i + 1)); continue
            raise PublishError(kind, msg, d.get("error"))

    def post_json(self, path, params, body):
        url = API + path + "?" + urllib.parse.urlencode(params)
        st, _, raw = self.t.request("POST", url, self._auth({"Content-Type": "application/json; charset=UTF-8"}), json.dumps(body).encode(), timeout=60)
        d = self._json(raw)
        if st not in (200, 201):
            kind, msg = classify(st, d)
            raise PublishError(kind, msg, d.get("error"))
        return d

    # the documented calls
    def my_channel(self):
        d = self.get("/channels", {"part": "snippet,contentDetails", "mine": "true"})
        items = d.get("items") or []
        if not items:
            raise PublishError("permission", "the signed-in Google account has no YouTube channel")
        return items[0]

    def start_upload(self, resource, size, notify):
        url = UPLOAD + "/videos?" + urllib.parse.urlencode({"uploadType": "resumable", "part": "snippet,status", "notifySubscribers": "true" if notify else "false"})
        st, hd, raw = self.t.request("POST", url, self._auth({"Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Length": str(size),
                                                              "X-Upload-Content-Type": "video/mp4"}), json.dumps(resource).encode(), timeout=60)
        loc = {k.lower(): v for k, v in hd.items()}.get("location")
        if st != 200 or not loc:
            kind, msg = classify(st, self._json(raw))
            raise PublishError(kind, "the upload session was not opened: " + msg)
        if urllib.parse.urlparse(loc).hostname not in ALLOWED_HOSTS:
            raise PublishError("security", "the upload session points outside Google's API host")
        return loc

    def send(self, session, data, start=0):
        h = self._auth({"Content-Type": "video/mp4", "Content-Length": str(len(data) - start)})
        if start:
            h["Content-Range"] = "bytes %d-%d/%d" % (start, len(data) - 1, len(data))
        st, hd, raw = self.t.request("PUT", session, h, data[start:], timeout=1800)
        return st, {k.lower(): v for k, v in hd.items()}, self._json(raw)

    def upload_progress(self, session, size):
        """(status, received bytes or None, body): 200/201 = done, 308 = incomplete with Range"""
        st, hd, raw = self.t.request("PUT", session, self._auth({"Content-Range": "bytes */%d" % size, "Content-Length": "0"}), b"", timeout=60)
        hd = {k.lower(): v for k, v in hd.items()}
        rng = re.match(r"bytes=0-(\d+)", hd.get("range", ""))
        return st, (int(rng.group(1)) + 1 if rng else (0 if st == 308 else None)), self._json(raw)

    def set_thumbnail(self, video_id, path):
        data = open(path, "rb").read()
        url = UPLOAD + "/thumbnails/set?" + urllib.parse.urlencode({"videoId": video_id, "uploadType": "media"})
        st, _, raw = self.t.request("POST", url, self._auth({"Content-Type": "image/jpeg", "Content-Length": str(len(data))}), data, timeout=120)
        if st != 200:
            kind, msg = classify(st, self._json(raw))
            raise PublishError(kind, msg)

    def add_to_playlist(self, video_id, playlist_id):
        return self.post_json("/playlistItems", {"part": "snippet"}, {"snippet": {"playlistId": playlist_id, "resourceId": {"kind": "youtube#video", "videoId": video_id}}})

    def video(self, video_id):
        d = self.get("/videos", {"part": "snippet,status,contentDetails,processingDetails", "id": video_id})
        items = d.get("items") or []
        return items[0] if items else None

    def recent_uploads(self, uploads_playlist):
        d = self.get("/playlistItems", {"part": "snippet,contentDetails", "playlistId": uploads_playlist, "maxResults": "10"})
        return d.get("items") or []


# ------------------------------------------------------------------ metadata: YouTube's own, from the question and the simulation
def entry_of(sid):
    man = json.load(open(IP.MANIFEST, encoding="utf-8"))
    return next((s for s in man["simulations"] if s["id"] == sid), None)


_ROMAN = {"XI": "11", "XII": "12", "IX": "9", "X": "10"}


def ncert_context(e):
    """An NCERT concept's source, from its registry entry: class, subject, chapter and its own page (the Python twin of
    tools/reel-maker/context.js reelContext for kind "concept"). Missing metadata is an error naming the field."""
    src = e.get("source") or {}
    miss = [f for f, v in (("subject", e.get("subject")), ("chapter", e.get("chapter")), ("folder", e.get("folder")),
                           ("source.title", src.get("title")), ("source.chapter", src.get("chapter"))) if not v]
    if miss:
        raise PublishError("state", "%s: YouTube metadata needs %s in data/manifest.json" % (e.get("id"), ", ".join(miss)))
    m = re.search(r"Class\s+(XII|XI|X|IX|\d{1,2})\b", src["title"], re.I)
    c = re.match(r"\s*(\d+)\b", src["chapter"])
    if not m or not c:
        raise PublishError("state", "%s: source.title must name the NCERT class and source.chapter start with its number" % e.get("id"))
    cls = _ROMAN.get(m.group(1).upper(), m.group(1))
    return {"cls": cls, "chapterNo": c.group(1), "link": "https://prayogx.co.in/" + e["folder"].lstrip("/"),
            "line": "NCERT Class %s %s, Chapter %s %s" % (cls, e["subject"], c.group(1), e["chapter"])}


def build_metadata(sid, m=None):
    e = entry_of(sid)
    if not e:
        raise PublishError("state", "%s is not in data/manifest.json" % sid)
    spec_p = os.path.join(IP.REEL_DIR, "reels", sid + ".json")
    spec = json.load(open(spec_p, encoding="utf-8")) if os.path.exists(spec_p) else {}
    cap = spec.get("caption") or {}
    short = re.sub(r"[<>]", "", e.get("shortTitle") or e["title"]).strip()
    hook = re.sub(r"[<>]", "", cap.get("hook", "")).strip()
    lines = [hook] if hook else []
    if e.get("kind") == "concept" or sid.startswith("CON-"):
        # an NCERT concept: its book, class and chapter, and its own page - never a JEE year, paper or question
        nc = ncert_context(e)
        tail = " | NCERT Class %s %s" % (nc["cls"], e["subject"])
        link = nc["link"]
        lines += ["", "A virtual experiment for %s (%s). The footage is the real PrayogX simulation, run step by step."
                  % (nc["line"], e.get("shortTitle") or e["title"])]
        head_tags = ["PrayogX", "NCERT", "NCERT Class %s" % nc["cls"], "Class %s %s" % (nc["cls"], e["subject"])]
    else:
        tail = " | JEE Advanced %s %s Q%s" % (e["year"], e["subject"], e["questionNumber"])
        link = "https://prayogx.co.in/s/%s/" % sid
        lines += ["", "A virtual experiment built from JEE Advanced %s Paper %s, %s Q.%s (%s). The footage is the real PrayogX simulation, run step by step."
                  % (e["year"], e["paperNumber"], e["subject"], e["questionNumber"], e["chapter"])]
        head_tags = ["PrayogX", "JEE Advanced", "JEE Advanced %s" % e["year"]]
    title = short[: TITLE_MAX - len(tail)].rstrip() + tail
    lines += ["", "Try the full experiment free: " + link,
              "", "Music and sound effects: original, made by PrayogX."]
    tags_src = (cap.get("hashtags") or [])[:3]
    if tags_src:
        lines += ["", " ".join(t if t.startswith("#") else "#" + t for t in tags_src)]
    desc = "\n".join(lines).replace("<", "").replace(">", "")
    tags, n = [], 0
    for t in head_tags + [e["subject"], e["chapter"]] + list(e.get("tags") or []):
        t = re.sub(r"[<>,]", "", str(t)).strip()
        if t and t.lower() not in [x.lower() for x in tags] and n + len(t) + (1 if tags else 0) <= TAGS_MAX:
            tags.append(t); n += len(t) + (1 if len(tags) > 1 else 0)
    return {"title": title, "description": desc, "tags": tags, "source": "data/manifest.json + tools/reel-maker/reels/%s.json" % sid, "link": link}


def metadata_problems(md, answer=None, known=()):
    p = []
    if not md.get("title") or len(md["title"]) > TITLE_MAX or re.search(r"[<>]", md["title"]):
        p.append("title must be 1-%d characters without < or >" % TITLE_MAX)
    if len(md.get("description", "").encode("utf-8")) > DESC_MAX_BYTES or re.search(r"[<>]", md.get("description", "")):
        p.append("description must be at most %d bytes without < or >" % DESC_MAX_BYTES)
    if len(",".join(md.get("tags", []))) > TAGS_MAX:
        p.append("tags exceed %d characters" % TAGS_MAX)
    text = md.get("title", "") + "\n" + md.get("description", "")
    if answer and re.search(r"\boption\s*\(?%s\)?\b|\banswer\s*(is|:)\s*\(?%s\b" % (re.escape(str(answer)), re.escape(str(answer))), text, re.I):
        p.append("the metadata gives the answer away")
    leaks = find_secrets(text + " " + " ".join(md.get("tags", [])), known)
    if leaks:
        p.append("the metadata contains " + ", ".join(sorted(set(leaks))))
    return p


def metadata_path(sid):
    return os.path.join(IP.reel_dir(sid), "youtube.json")


def load_metadata(sid, write=True):
    """the reviewed metadata file if present (edits are kept), else generated and written for review"""
    p = metadata_path(sid)
    if os.path.exists(p):
        return json.load(open(p, encoding="utf-8"))
    md = build_metadata(sid)
    if write:
        save_json(p, md)
    return md


def md_sha(md):
    return hashlib.sha256(json.dumps({k: md[k] for k in ("title", "description", "tags")}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


# ------------------------------------------------------------------ state and ledger (independent of Instagram)
def yt_state(m):
    return (m.get("platforms") or {}).get("youtube") or {}


def yt_transition(m, new, note=None, force=False):
    y = m.setdefault("platforms", {}).setdefault("youtube", {})
    old = y.get("status")
    if new not in YT_STATES or new not in YT_TRANSITIONS.get(old, set()):
        raise PublishError("state", "YouTube state cannot go from %s to %s" % (old, new))
    if old == "VERIFIED" and new == "PUBLISHING" and not force:
        raise PublishError("duplicate", "already on YouTube - a re-upload needs --force-reupload")
    y["status"] = new
    e = {"status": new, "at": now(), "by": "youtube_publish.py"}
    if note:
        e["note"] = note
    y.setdefault("history", []).append(e)
    return y


def yt_ledger(sid):
    return [p for p in IP.load_ledger().get("publications", []) if p.get("simulationId") == sid and p.get("platform") == "youtube"]


def yt_record(entry, known=()):
    led = IP.load_ledger()
    pubs = led.setdefault("publications", [])
    for p in pubs:
        if p.get("platform") == "youtube" and p.get("videoId") == entry["videoId"]:
            p.update(entry); break
    else:
        pubs.append(entry)
    led["publications"] = sorted(pubs, key=lambda p: (p.get("simulationId", ""), p.get("platform", "instagram"), p.get("publishedAt") or ""))
    save_json(IP.LEDGER, led, known)


def ledger_entry(sid, m):
    y, a = yt_state(m), m.get("approval") or {}
    return {"simulationId": sid, "platform": "youtube", "status": y.get("status"), "videoId": y.get("videoId"), "url": y.get("url"),
            "privacyStatus": y.get("privacyStatus"), "publishedAt": y.get("publishedAt"), "verifiedAt": y.get("verifiedAt"),
            "reelSha256": (m.get("hashes") or {}).get("reel.mp4"), "approvedBy": a.get("reviewer"), "approvedAt": a.get("at"), "forced": bool(y.get("forced"))}


# ------------------------------------------------------------------ preflight
def approval_ok(sid, m):
    """the shared approval: recorded, for exactly these files, and not withdrawn"""
    if m.get("status") in ("REJECTED", "NOT_READY", "GENERATION_FAILED", "VALIDATION_FAILED", "READY_FOR_REVIEW", "GENERATED", "VALIDATED"):
        return ["the reel is %s - it needs an approval (python3 tools/instagram_publish.py approve %s --reviewer NAME)" % (m.get("status"), sid)]
    return IP.approval_problems(sid, m)


def preflight(sid, cfg, yt=None, privacy=None, force=False):
    items = []
    add = lambda n, ok, d="": items.append((n, None if ok is None else bool(ok), str(d)))
    known = [cfg.client_secret]
    try:
        m = IP.load_reel(sid)
    except PublishError as e:
        add("the reel exists", False, e)
        return items, None, None
    ap = approval_ok(sid, m)
    add("approved by a person (the shared approval), for exactly this reel, thumbnail and caption", not ap,
        "; ".join(ap) or "approved by %s at %s, files unchanged" % (m["approval"]["reviewer"], m["approval"]["at"]))
    v = m.get("validation") or {}
    checks = v.get("checks") or []
    audio = [c for c in checks if c["name"].startswith("audio: ")]
    add("every reel check passed, including the audio and its licensing", bool(checks) and v.get("passed") == len(checks) and len(audio) >= 10, "%s/%s checks, %d audio" % (v.get("passed"), len(checks), len(audio)))
    try:
        sys.path.insert(0, IP.REEL_DIR)
        import audio as AU
        lib = AU.load_library()
        recs = [AU.check_asset(lib, t["assetId"], t["role"]) for t in (m.get("audio") or {}).get("tracks", [])]
        add("the music and effects are PrayogX's own, licensed for commercial YouTube use", len(recs) >= 2 and all("youtube" in r.get("permittedUse", []) for r in recs),
            ", ".join("%s: %s" % (r["assetId"], r["source"]) for r in recs))
    except Exception as e:  # noqa: BLE001
        add("the music and effects are PrayogX's own, licensed for commercial YouTube use", False, e)
    pr = v.get("probe") or {}
    mp4 = os.path.join(IP.reel_dir(sid), "reel.mp4")
    w, h, dur = pr.get("width", 0), pr.get("height", 0), pr.get("duration", 0)
    add("a Short: vertical or square, at most 3 minutes (the same validated reel.mp4)", os.path.exists(mp4) and h >= w > 0 and 0 < dur <= SHORTS_MAX_S,
        "%sx%s, %.1f s, sha256 %s" % (w, h, dur, (m.get("hashes") or {}).get("reel.mp4", "")[:12]))
    try:
        md = load_metadata(sid)
        mp = metadata_problems(md, (entry_of(sid) or {}).get("answer"), known)
    except PublishError as e:
        md, mp = None, [str(e)]
    add("YouTube metadata (its own title, description and tags): limits, no < >, no answer, no secret", not mp,
        "; ".join(mp) or "title %d chars, description %d bytes, %d tags" % (len(md["title"]), len(md["description"].encode()), len(md["tags"])))
    pv = privacy or cfg.default_privacy
    pv_ok = pv in PRIVACY and (pv != "public" or cfg.project_audited)
    add(("privacy: %s (stated)" % pv) if privacy else ("privacy: %s (the default YT_DEFAULT_PRIVACY - an upload must state --privacy)" % pv), pv_ok, ("public needs YT_PROJECT_AUDITED=true: uploads from unaudited API projects are locked private" if pv == "public" and not cfg.project_audited else
                                                       "" if pv in PRIVACY else "private, unlisted or public"))
    y = yt_state(m)
    prior = [p for p in yt_ledger(sid) if p.get("status") in ("PUBLISHED", "VERIFIED", "VERIFICATION_FAILED")]
    add("not already on YouTube" + (" - forced re-upload" if force else ""), (not prior and y.get("status") not in ("PUBLISHED", "VERIFIED", "VERIFICATION_FAILED")) or force,
        "; ".join("%s %s" % (p.get("status"), p.get("url")) for p in prior) or "no earlier upload")
    add("no unknown upload state", y.get("status") != "UPLOAD_STATUS_UNKNOWN", "an earlier upload may have reached YouTube - run verify %s first" % sid if y.get("status") == "UPLOAD_STATUS_UNKNOWN" else "")
    e = entry_of(sid)
    add("the simulation is in the library and not a draft", bool(e) and e.get("status") != "draft", (e or {}).get("status", "not in data/manifest.json"))
    cp = cfg.problems()
    add("configuration and sign-in (YT_CLIENT_ID, YT_CLIENT_SECRET, YT_CHANNEL_ID, the token file outside the repo, mode 600)", not cp, "; ".join(cp) or cfg.token_file)
    if yt is None:
        add("live: the token works and its channel is YT_CHANNEL_ID", None, "not checked (offline; add --online)")
    elif cp:
        add("live: the token works and its channel is YT_CHANNEL_ID", False, "not checked: fix the configuration first")
    else:
        try:
            ch = yt.my_channel()
            add("live: the token works and its channel is YT_CHANNEL_ID", ch.get("id") == cfg.channel_id, "%s (%s)" % (ch.get("snippet", {}).get("title"), ch.get("id")))
        except PublishError as er:
            add("live: the token works and its channel is YT_CHANNEL_ID", False, "%s: %s" % (er.kind, er))
    return items, m, md


def confirm_upload(sid, given, privacy, ask=input):
    """the person types the simulation ID (or passes --confirm ID when there is no terminal)"""
    if given is not None:
        if given != sid:
            raise PublishError("approval", "--confirm %s does not match %s" % (given, sid))
        return
    if not sys.stdin.isatty():
        raise PublishError("approval", "a YouTube upload needs a person: run it in a terminal, or pass --confirm %s" % sid)
    if ask("Type %s to upload it to YouTube (%s): " % (sid, privacy)).strip() != sid:
        raise PublishError("approval", "not confirmed - nothing changed")


def print_checklist(items, red):
    IP.print_checklist(items, red)


def ai_narration(m):
    """True when the approved reel's soundtrack contains AI-generated narration (reel.json -> audio.aiNarration,
    written by generate-reel.js from the verified voice record). Silent reels have none."""
    return ((m or {}).get("audio") or {}).get("aiNarration") is True


def video_resource(md, cfg, privacy, synthetic=False):
    """containsSyntheticMedia: true for a reel with AI-generated narration (decided 2026-10-03, tools/reel-maker/README.md ->
    Voiceover), false for every silent reel, as before."""
    sn = {"title": md["title"], "description": md["description"], "tags": md["tags"]}
    if cfg.category_id:
        sn["categoryId"] = cfg.category_id
    return {"snippet": sn, "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": cfg.made_for_kids, "containsSyntheticMedia": bool(synthetic)}}


# ------------------------------------------------------------------ commands
def client_fingerprint(client_id):
    """a short one-way label for the OAuth client (no characters of the ID itself)"""
    return "sha256:" + hashlib.sha256(client_id.encode()).hexdigest()[:12]


def cmd_auth(cfg, transport=None, open_browser=webbrowser.open, wait=300, port=0, show_url=False):
    """the one-time sign-in: Google's consent page in your browser, the code back on 127.0.0.1, PKCE.
    The sign-in URL carries the client ID, so it goes to the browser only; it is printed only with --show-url."""
    pr = cfg.problems(need_token=False)
    pr = [x for x in pr if "YT_CHANNEL_ID" not in x]
    if pr:
        raise PublishError("config", "; ".join(pr))
    verifier = pysecrets.token_urlsafe(64)[:96]
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = pysecrets.token_urlsafe(24)
    got = {}

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(self.path).query))
            got.update(q)
            self.send_response(200); self.send_header("Content-Type", "text/plain; charset=utf-8"); self.end_headers()
            self.wfile.write(("PrayogX: sign-in received - you can close this tab." if "code" in q else "PrayogX: sign-in was not completed.").encode())

        def log_message(self, *a):
            pass
    srv = http.server.HTTPServer(("127.0.0.1", port), H)
    redirect = "http://127.0.0.1:%d" % srv.server_address[1]
    url = AUTH_URL + "?" + urllib.parse.urlencode({"client_id": cfg.client_id, "redirect_uri": redirect, "response_type": "code", "scope": " ".join(cfg.scopes()),
                                                   "code_challenge": challenge, "code_challenge_method": "S256", "state": state, "access_type": "offline", "prompt": "consent"})
    if show_url:
        print("Sign-in link (--show-url; it contains your OAuth client ID - do not share it):\n  " + url)
    else:
        print("Opening Google's sign-in page in your browser …")
    opened = open_browser(url)
    if opened is False and not show_url:
        print("The browser did not open. Run again with --show-url to print the sign-in link and open it yourself.")
    th = threading.Thread(target=srv.handle_request, daemon=True)
    srv.timeout = wait
    th.start(); th.join(wait + 5)
    srv.server_close()
    if got.get("state") != state:
        raise PublishError("auth", "the sign-in was not completed (or its state did not match) - run auth again")
    if "code" not in got:
        raise PublishError("auth", "Google returned no code (%s) - run auth again" % got.get("error", "no response"))
    t = transport or HttpTransport()
    body = urllib.parse.urlencode({"client_id": cfg.client_id, "client_secret": cfg.client_secret, "code": got["code"], "code_verifier": verifier,
                                   "grant_type": "authorization_code", "redirect_uri": redirect}).encode()
    st, _, raw = t.request("POST", TOKEN_URL, {"Content-Type": "application/x-www-form-urlencoded"}, body, timeout=60)
    try:
        d = json.loads(raw.decode() or "{}")
    except ValueError:
        d = {}
    if st != 200 or not d.get("refresh_token"):
        kind, msg = classify(st, d) if st != 200 else ("auth", "Google issued no refresh token - remove the app's access at myaccount.google.com/permissions and run auth again")
        raise PublishError(kind, msg)
    save_token(cfg, {"refresh_token": d["refresh_token"], "scope": d.get("scope"), "obtainedAt": now(), "client": client_fingerprint(cfg.client_id)})
    yt = YouTube(cfg, t)
    yt._access = d.get("access_token")
    try:
        ch = yt.my_channel()
        print("Signed in. Channel: %s - YT_CHANNEL_ID=%s" % (ch.get("snippet", {}).get("title"), ch.get("id")))
    except PublishError as e:
        print("Signed in; the channel could not be read (%s: %s)" % (e.kind, e))
    print("Token saved to %s (mode 600, outside the repository). It is never printed or logged." % cfg.token_file)
    return True


def cmd_status(sid=None):
    ids = [sid] if sid else sorted(x for x in os.listdir(IP.OUT_DIR) if os.path.exists(os.path.join(IP.OUT_DIR, x, "reel.json"))) if os.path.isdir(IP.OUT_DIR) else []
    rows = []
    for i in ids:
        m = IP.load_reel(i)
        y = yt_state(m)
        rows.append("%-22s reel %-18s YouTube %-22s %s" % (i, m.get("status"), y.get("status") or "-", y.get("url") or ""))
    print("\n".join(rows) if rows else "no reels")
    return rows


def cmd_metadata(sid, regenerate=False):
    p = metadata_path(sid)
    if regenerate and os.path.exists(p):
        os.remove(p)
    md = load_metadata(sid)
    print("YouTube metadata for %s (%s - edit it to change it; it is shown again at the dry run)" % (sid, os.path.relpath(p, ROOT)))
    print("  title:       " + md["title"])
    print("  description:\n" + "\n".join("     | " + x for x in md["description"].split("\n")))
    print("  tags:        " + ", ".join(md["tags"]))
    return md


def cmd_dry_run(sid, cfg, transport=None, online=False, privacy=None, force=False):
    red = Redactor([cfg.client_secret])
    yt = YouTube(cfg, transport or HttpTransport()) if online else None
    items, m, md = preflight(sid, cfg, yt, privacy, force)
    pv = privacy or cfg.default_privacy
    print("YOUTUBE DRY RUN - %s - nothing will be uploaded" % sid)
    print("configuration: " + red(json.dumps(cfg.describe())))
    print_checklist(items, red)
    if md:
        print("metadata (%s):\n  title: %s\n  privacy: %s%s\n  description:\n%s\n  tags: %s" % (os.path.relpath(metadata_path(sid), ROOT), md["title"], pv,
              "" if not cfg.category_id else ", category %s" % cfg.category_id, "\n".join("     | " + x for x in md["description"].split("\n")), ", ".join(md["tags"])))
        steps = ["POST %s/videos?uploadType=resumable&part=snippet,status  (snippet + status.privacyStatus=%s)" % (UPLOAD, pv),
                 "PUT  <session>  reel.mp4 (%d bytes, the approved file)" % os.path.getsize(os.path.join(IP.reel_dir(sid), "reel.mp4")),
                 "POST %s/thumbnails/set  thumbnail.jpg%s" % (UPLOAD, "" if cfg.set_thumbnail else " (off: YT_SET_THUMBNAIL=false)")]
        if cfg.playlist_id:
            steps.append("POST %s/playlistItems  (playlist %s)" % (API, cfg.playlist_id))
        steps.append("GET  %s/videos?part=snippet,status,processingDetails  (verification)" % API)
        print("the calls an upload would make:")
        for i, st in enumerate(steps, 1):
            print("  %d. %s" % (i, st))
    blocking = [i for i in items if i[1] is False]
    skipped = any(i[1] is None for i in items)
    print("\nRESULT: " + ("READY TO UPLOAD (%s)" % pv if not blocking and not skipped else "READY, except the live check (add --online)" if not blocking else "NOT READY - %d check(s) failed" % len(blocking)))
    return items


def cmd_publish(sid, cfg, privacy, transport=None, confirm=None, confirm_public=None, force=False, confirm_reupload=None, reason=None,
                ask=input, sleep=time.sleep, clock=time.monotonic):
    if privacy not in PRIVACY:
        raise PublishError("config", "--privacy must be private, unlisted or public (stated explicitly)")
    if privacy == "public" and confirm_public != sid:
        raise PublishError("approval", "a public upload needs --confirm-public %s" % sid)
    if force and (confirm_reupload != sid or not (reason or "").strip()):
        raise PublishError("duplicate", "a forced re-upload needs --confirm-reupload %s and --reason" % sid)
    red = Redactor([cfg.client_secret])
    known = [cfg.client_secret]
    log = IP.Log(sid, red)
    yt = YouTube(cfg, transport or HttpTransport(), log, sleep)
    items, m, md = preflight(sid, cfg, yt, privacy, force)
    failed = [i for i in items if i[1] is not True]
    if failed:
        print_checklist(items, red)
        raise PublishError("preflight", "preflight failed (%d): %s - nothing was uploaded" % (len(failed), "; ".join(i[0] for i in failed)))
    confirm_upload(sid, confirm, privacy, ask)
    path = os.path.join(IP.reel_dir(sid), "reel.mp4")
    data = open(path, "rb").read()
    if hashlib.sha256(data).hexdigest() != m["approval"]["hashes"]["reel.mp4"]:
        raise PublishError("state", "reel.mp4 changed after approval - nothing was uploaded")
    lock = os.path.join(IP.reel_dir(sid), "publish", "youtube.lock")
    os.makedirs(os.path.dirname(lock), exist_ok=True)
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(fd)
    except FileExistsError:
        raise PublishError("state", "another YouTube upload of %s is running (%s)" % (sid, os.path.relpath(lock, ROOT)))
    try:
        return _upload(sid, cfg, privacy, m, md, data, yt, log, red, known, force, reason, sleep, clock)
    finally:
        os.remove(lock)


def _upload(sid, cfg, privacy, m, md, data, yt, log, red, known, force, reason, sleep, clock):
    y = yt_transition(m, "PUBLISHING", "forced re-upload: " + reason.strip() if force else None, force=force)
    y.update(attemptId=uuid.uuid4().hex[:12], startedAt=now(), privacyRequested=privacy, metadataSha256=md_sha(md), title=md["title"], forced=bool(force),
             videoId=None, url=None, error=None, uncertain=False)
    save_reel(sid, m, known)

    def fail(e, unknown=False):
        y.update(error={"kind": e.kind, "message": red(str(e))}, failedAt=now())
        yt_transition(m, "UPLOAD_STATUS_UNKNOWN" if unknown else "PUBLISH_FAILED", "%s: %s" % (e.kind, red(str(e))))
        save_reel(sid, m, known)
        log("YOUTUBE %s (%s): %s" % ("UPLOAD_STATUS_UNKNOWN" if unknown else "PUBLISH_FAILED", e.kind, e))
        return e

    try:
        log("1/4 opening the upload session …")
        session = yt.start_upload(video_resource(md, cfg, privacy, ai_narration(m)), len(data), cfg.notify)
    except PublishError as e:
        raise fail(e)
    log("2/4 uploading reel.mp4 (%d bytes) …" % len(data))
    body, start = None, 0
    for attempt in range(4):
        try:
            st, hd, body = yt.send(session, data, start)
        except PublishError as e:
            st, body = None, None
            if e.kind != "network":
                raise fail(e)
        if st in (200, 201) and (body or {}).get("id"):
            break
        if st is not None and st not in (308,) and st < 500:
            kind, msg = classify(st, body)
            raise fail(PublishError(kind, "the upload was refused: " + msg))
        # interrupted or a server error: ask the session how far it got (the resumable protocol), then resume
        try:
            pst, got, pbody = yt.upload_progress(session, len(data))
        except PublishError:
            pst, got, pbody = None, None, None
        if pst in (200, 201) and (pbody or {}).get("id"):
            body = pbody
            break
        if pst == 308 and got is not None:
            start = got
            sleep(2 ** attempt)
            continue
        raise fail(PublishError("network", "the upload's outcome is unknown (no reply, and the session could not be read) - run verify %s before anything else" % sid), unknown=True)
    else:
        raise fail(PublishError("network", "the upload did not complete after resuming - run verify %s" % sid), unknown=True)
    vid = body["id"]
    y.update(videoId=vid, url="https://www.youtube.com/shorts/" + vid, publishedAt=now(), privacyStatus=(body.get("status") or {}).get("privacyStatus", privacy))
    yt_transition(m, "PUBLISHED", "video " + vid)
    save_reel(sid, m, known)
    yt_record(ledger_entry(sid, m), known)
    log("UPLOADED: %s (%s)" % (y["url"], y["privacyStatus"]))
    if cfg.set_thumbnail:
        try:
            log("3/4 setting the PrayogX thumbnail …")
            yt.set_thumbnail(vid, os.path.join(IP.reel_dir(sid), "thumbnail.jpg"))
            y["thumbnail"] = "set"
        except PublishError as e:
            y["thumbnail"] = "not set (%s: %s) - YouTube may not allow custom thumbnails on this channel or on Shorts" % (e.kind, red(str(e))[:160])
            log("thumbnail " + y["thumbnail"])
    if cfg.playlist_id:
        try:
            yt.add_to_playlist(vid, cfg.playlist_id)
            y["playlist"] = cfg.playlist_id
        except PublishError as e:
            y["playlist"] = "not added (%s: %s)" % (e.kind, red(str(e))[:160])
            log("playlist " + y["playlist"])
    save_reel(sid, m, known)
    return _verify(sid, m, md, yt, cfg, log, known, sleep, clock)


def _verify(sid, m, md, yt, cfg, log, known, sleep=time.sleep, clock=time.monotonic, wait=True):
    y = yt_state(m)
    log("4/4 verifying video %s …" % y["videoId"])
    t0 = clock()
    why = ""
    while True:
        try:
            v = yt.video(y["videoId"])
        except PublishError as e:
            v, why = None, "%s: %s" % (e.kind, e)
        if v is not None:
            sn, st = v.get("snippet") or {}, v.get("status") or {}
            up = st.get("uploadStatus")
            checks = {"id": v.get("id") == y["videoId"], "channel": sn.get("channelId") == cfg.channel_id, "title": sn.get("title") == md["title"],
                      "description": (sn.get("description") or "").strip() == md["description"].strip(), "privacy": st.get("privacyStatus") == y.get("privacyRequested")}
            y.update(uploadStatus=up, privacyStatus=st.get("privacyStatus"), channelId=sn.get("channelId"), youtubePublishedAt=sn.get("publishedAt"),
                     processingStatus=(v.get("processingDetails") or {}).get("processingStatus"))
            if up in ("failed", "rejected", "deleted"):
                why = "upload %s (%s)" % (up, st.get("failureReason") or st.get("rejectionReason") or "-")
                break
            if not all(checks.values()):
                why = "mismatch: " + ", ".join(k for k, ok in checks.items() if not ok)
                if checks["privacy"] is False and st.get("privacyStatus") == "private" and y.get("privacyRequested") != "private":
                    why += " (YouTube kept it private: an unaudited API project, or a policy lock)"
                break
            if up == "processed":
                y.update(verifiedAt=now())
                yt_transition(m, "VERIFIED", y["url"])
                save_reel(sid, m, known)
                yt_record(ledger_entry(sid, m), known)
                log("VERIFIED: %s (%s)" % (y["url"], y["privacyStatus"]))
                return m
            why = "still processing (uploadStatus %s)" % up
        if not wait or clock() - t0 > cfg.poll_timeout:
            break
        sleep(cfg.poll_interval)
    if why.startswith("still processing") or why.startswith("network") or why.startswith("api"):
        y["verificationNote"] = why + " - run verify %s later" % sid
        save_reel(sid, m, known)
        log("NOT YET VERIFIED: " + y["verificationNote"])
        return m
    y["verificationError"] = why
    yt_transition(m, "VERIFICATION_FAILED", why)
    save_reel(sid, m, known)
    yt_record(ledger_entry(sid, m), known)
    log("VERIFICATION_FAILED: " + why)
    return m


def cmd_verify(sid, cfg, transport=None, sleep=time.sleep, clock=time.monotonic, wait=False):
    red = Redactor([cfg.client_secret])
    known = [cfg.client_secret]
    cp = cfg.problems()
    if cp:
        raise PublishError("config", "; ".join(cp))
    log = IP.Log(sid, red)
    yt = YouTube(cfg, transport or HttpTransport(), log, sleep)
    m = IP.load_reel(sid)
    y = yt_state(m)
    md = json.load(open(metadata_path(sid), encoding="utf-8")) if os.path.exists(metadata_path(sid)) else {"title": y.get("title"), "description": ""}
    if y.get("status") == "UPLOAD_STATUS_UNKNOWN":
        ch = yt.my_channel()
        up = ((ch.get("contentDetails") or {}).get("relatedPlaylists") or {}).get("uploads")
        hits = [i for i in yt.recent_uploads(up) if (i.get("snippet") or {}).get("title") == y.get("title")
                and ((i.get("contentDetails") or {}).get("videoPublishedAt") or (i.get("snippet") or {}).get("publishedAt") or "") >= (y.get("startedAt") or "")[:19]] if up else []
        if not hits:
            y["uncertain"] = False
            yt_transition(m, "PUBLISH_FAILED", "verify: no upload with this title since the attempt - safe to upload again")
            save_reel(sid, m, known)
            log("not on the channel: it is safe to run publish %s --youtube again" % sid)
            return m
        vid = (hits[0].get("contentDetails") or {}).get("videoId") or ((hits[0].get("snippet") or {}).get("resourceId") or {}).get("videoId")
        y.update(videoId=vid, url="https://www.youtube.com/shorts/" + vid, publishedAt=now())
        yt_transition(m, "PUBLISHED", "resolved by verify: video " + vid)
        save_reel(sid, m, known)
        yt_record(ledger_entry(sid, m), known)
    if y.get("status") not in ("PUBLISHED", "VERIFIED", "VERIFICATION_FAILED") or not y.get("videoId"):
        raise PublishError("state", "%s has no YouTube upload to verify (YouTube state %s)" % (sid, y.get("status")))
    return _verify(sid, m, md, yt, cfg, log, known, sleep, clock, wait)


# ------------------------------------------------------------------ CLI
def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    ap = argparse.ArgumentParser(prog="youtube_publish.py", description="YouTube Shorts publishing of an approved PrayogX reel (official YouTube Data API v3).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("auth"); p.add_argument("--show-url", action="store_true", help="also print the sign-in link (it contains the OAuth client ID)")
    p = sub.add_parser("status"); p.add_argument("id", nargs="?")
    p = sub.add_parser("metadata"); p.add_argument("id"); p.add_argument("--regenerate", action="store_true")
    p = sub.add_parser("publish"); p.add_argument("id"); p.add_argument("--dry-run", action="store_true"); p.add_argument("--online", action="store_true")
    p.add_argument("--privacy", choices=PRIVACY); p.add_argument("--confirm"); p.add_argument("--confirm-public")
    p.add_argument("--force-reupload", action="store_true"); p.add_argument("--confirm-reupload"); p.add_argument("--reason")
    p = sub.add_parser("verify"); p.add_argument("id"); p.add_argument("--wait", action="store_true")
    a = ap.parse_args(argv)
    cfg = load_config()
    red = Redactor([cfg.client_secret])
    try:
        if a.cmd == "auth":
            cmd_auth(cfg, show_url=a.show_url)
        elif a.cmd == "status":
            cmd_status(a.id)
        elif a.cmd == "metadata":
            cmd_metadata(a.id, a.regenerate)
        elif a.cmd == "publish" and a.dry_run:
            items = cmd_dry_run(a.id, cfg, online=a.online, privacy=a.privacy, force=a.force_reupload)
            return 1 if any(i[1] is False for i in items) else 0
        elif a.cmd == "publish":
            if not a.privacy:
                raise PublishError("config", "state the privacy explicitly: --privacy private | unlisted | public")
            m = cmd_publish(a.id, cfg, a.privacy, confirm=a.confirm, confirm_public=a.confirm_public, force=a.force_reupload, confirm_reupload=a.confirm_reupload, reason=a.reason)
            y = yt_state(m)
            print("\n%s YouTube %s %s" % (a.id, y.get("status"), y.get("url") or ""))
            return 0 if y.get("status") in ("VERIFIED", "PUBLISHED") else 1
        elif a.cmd == "verify":
            m = cmd_verify(a.id, cfg, wait=a.wait)
            y = yt_state(m)
            print("%s YouTube %s %s" % (a.id, y.get("status"), y.get("url") or ""))
            return 0 if y.get("status") == "VERIFIED" else 1
        return 0
    except PublishError as e:
        print(red("ERROR (%s): %s" % (e.kind, e)), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
