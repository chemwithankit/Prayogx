#!/usr/bin/env python3
"""PrayogX - approval-gated Instagram Reel publishing (official Instagram Graph API only).

A reel is published only by a person, in two separate steps, after reviewing it:

    python3 tools/instagram_publish.py status                              every reel and its state
    python3 tools/instagram_publish.py review  <ID> [--open]               what to look at; changes nothing
    python3 tools/instagram_publish.py approve <ID> --reviewer NAME        READY_FOR_REVIEW -> APPROVED (asks to type the ID)
    python3 tools/instagram_publish.py reject  <ID> --reason TEXT          -> REJECTED
    python3 tools/instagram_publish.py publish <ID> --dry-run [--online]   the preflight checklist and the planned calls; posts nothing
    python3 tools/instagram_publish.py publish <ID>                        APPROVED -> PUBLISHING -> PUBLISHED -> VERIFIED (asks to type the ID)
    python3 tools/instagram_publish.py verify  <ID>                        re-check a published reel (or resolve an uncertain publish)
    python3 tools/instagram_publish.py --reel <ID> --dry-run               the same as publish <ID> --dry-run

States (tools/reel-maker/output/<ID>/reel.json): GENERATED -> VALIDATED -> READY_FOR_REVIEW -> APPROVED -> PUBLISHING
-> PUBLISHED -> VERIFIED; failures GENERATION_FAILED, VALIDATION_FAILED, REJECTED, NOT_READY, PUBLISH_FAILED,
VERIFICATION_FAILED. Only `approve`, run by a person, moves READY_FOR_REVIEW -> APPROVED: never validation, file
existence, a commit, a push or the factory. An approval is bound to the sha256 of the reel, thumbnail and caption
that were validated; any change voids it (NOT_READY).

Publishing uses only Meta's documented endpoints: POST /<IG_ID>/media (media_type=REELS, upload_type=resumable), the
resumable upload to rupload.facebook.com, GET /<container>?fields=status_code, POST /<IG_ID>/media_publish, and GET
/<media>?fields=permalink for verification. No browser automation, scraping, passwords or private APIs; requests
can go only to graph.instagram.com, graph.facebook.com and rupload.facebook.com.

Configuration comes from the environment (or a git-ignored .env at the repository root): see .env.example. The
access token is never written to reel.json, logs, the ledger or the console - every message is redacted.

Publications are recorded in tools/reel-maker/publications.json (public facts only: media ID, permalink, times,
reviewer). A simulation that is already published is refused unless --force-republish and --confirm-republish <ID>.
"""
import argparse
import datetime
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REEL_DIR = os.path.join(HERE, "reel-maker")
OUT_DIR = os.path.join(REEL_DIR, "output")
LEDGER = os.path.join(REEL_DIR, "publications.json")
ENV_FILE = os.path.join(ROOT, ".env")
MANIFEST = os.path.join(ROOT, "data", "manifest.json")
sys.path.insert(0, REEL_DIR)

API_HOSTS = ("graph.instagram.com", "graph.facebook.com")
UPLOAD_HOST = "rupload.facebook.com"
ALLOWED_HOSTS = set(API_HOSTS) | {UPLOAD_HOST}
DEFAULT_VERSION = "v25.0"

STATES = ["GENERATED", "VALIDATED", "READY_FOR_REVIEW", "APPROVED", "PUBLISHING", "PUBLISHED", "VERIFIED",
          "GENERATION_FAILED", "VALIDATION_FAILED", "REJECTED", "NOT_READY", "PUBLISH_FAILED", "VERIFICATION_FAILED"]
TRANSITIONS = {
    "GENERATED": {"VALIDATED", "VALIDATION_FAILED", "GENERATION_FAILED"},
    "VALIDATED": {"READY_FOR_REVIEW", "VALIDATION_FAILED"},
    "READY_FOR_REVIEW": {"APPROVED", "REJECTED", "NOT_READY"},
    "APPROVED": {"PUBLISHING", "REJECTED", "NOT_READY"},
    "PUBLISHING": {"PUBLISHED", "PUBLISH_FAILED"},
    "PUBLISH_FAILED": {"PUBLISHING", "PUBLISHED", "REJECTED", "NOT_READY"},
    "PUBLISHED": {"VERIFIED", "VERIFICATION_FAILED"},
    "VERIFICATION_FAILED": {"VERIFIED", "VERIFICATION_FAILED"},
    "VERIFIED": {"VERIFIED", "VERIFICATION_FAILED", "PUBLISHING"},   # PUBLISHING again only through a forced republish
    "GENERATION_FAILED": set(), "VALIDATION_FAILED": set(), "REJECTED": set(), "NOT_READY": set(),
}
AUTOMATED_REVIEWERS = {"auto", "automatic", "bot", "ci", "claude", "system", "factory", "pipeline", "script", "validator"}
REELS = dict(max_bytes=300 * 1000 * 1000, min_s=3, max_s=15 * 60, min_fps=23, max_fps=60, max_vbr=25e6, max_audio_hz=48000,
             caption_chars=2200, hashtags=30, mentions=20, cover_bytes=8 * 1000 * 1000)


class PublishError(Exception):
    """kind: config | auth | permission | rate_limit | upload | processing | timeout | network | api | verification |
    duplicate | state | preflight | security | approval"""

    def __init__(self, kind, message, detail=None):
        super().__init__(message)
        self.kind, self.detail = kind, detail


def now():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


# ------------------------------------------------------------------ secrets
SECRET_PATTERNS = [
    re.compile(r"\bEAA[A-Za-z0-9]{20,}"),                         # Facebook user / page tokens
    re.compile(r"\bIG[A-Za-z0-9_-]{30,}"),                         # Instagram Login tokens (IGAA..., IGQV...)
    re.compile(r"(access_token|client_secret|app_secret|appsecret_proof)=([^&\s\"']+)", re.I),
    re.compile(r"(Authorization:\s*(?:OAuth|Bearer)\s+)(\S+)", re.I),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
]


class Redactor:
    def __init__(self, secrets=()):
        self.secrets = sorted({s for s in secrets if s and len(s) >= 8}, key=len, reverse=True)

    def __call__(self, text):
        text = str(text)
        for s in self.secrets:
            text = text.replace(s, "[REDACTED]")
        text = SECRET_PATTERNS[0].sub("[REDACTED]", text)
        text = SECRET_PATTERNS[1].sub("[REDACTED]", text)
        text = SECRET_PATTERNS[2].sub(lambda m: m.group(1) + "=[REDACTED]", text)
        text = SECRET_PATTERNS[3].sub(lambda m: m.group(1) + "[REDACTED]", text)
        return SECRET_PATTERNS[4].sub("[REDACTED PRIVATE KEY]", text)


def find_secrets(text, secrets=()):
    """names of what looks like a secret in text (for captions, records and logs before they are written)"""
    found = [("the configured access token" if len(s) > 12 else "a configured secret") for s in secrets if s and len(s) >= 8 and s in text]
    for p, name in zip(SECRET_PATTERNS, ["a Facebook token", "an Instagram token", "a token parameter", "an Authorization header", "a private key"]):
        if p.search(text):
            found.append(name)
    return found


# ------------------------------------------------------------------ configuration
class Config:
    def __init__(self, values):
        self.ig_user_id = values.get("IG_USER_ID", "").strip()
        self.token = values.get("IG_ACCESS_TOKEN", "").strip()
        self.host = values.get("IG_API_HOST", "graph.instagram.com").strip()
        self.version = values.get("IG_API_VERSION", DEFAULT_VERSION).strip()
        self.media_base_url = values.get("PRAYOGX_MEDIA_BASE_URL", "").strip().rstrip("/")
        self.share_to_feed = values.get("IG_SHARE_TO_FEED", "true").strip().lower() != "false"
        self.thumb_offset_ms = int(values.get("IG_THUMB_OFFSET_MS", "0") or 0)
        self.poll_interval = float(values.get("IG_POLL_INTERVAL_S", "5") or 5)
        self.poll_timeout = float(values.get("IG_POLL_TIMEOUT_S", "600") or 600)
        self.env_file_mode = values.get("_ENV_FILE_MODE")
        # how the video reaches Meta: Instagram Login (graph.instagram.com) accepts only a public video_url; the direct
        # (resumable) upload to rupload.facebook.com is for Facebook Login for Business (graph.facebook.com)
        self.upload_mode = values.get("IG_UPLOAD_MODE", "").strip() or ("resumable" if self.host == "graph.facebook.com" else "video_url")
        self.cover_hosted = False

    def video_url(self, sid):
        return "%s/%s/reel.mp4" % (self.media_base_url, sid) if self.media_base_url else None

    def media_host(self):
        return urllib.parse.urlparse(self.media_base_url).hostname if self.media_base_url else None

    def problems(self):
        p = []
        if not self.ig_user_id:
            p.append("IG_USER_ID is not set (the Instagram professional account's ID)")
        elif not self.ig_user_id.isdigit():
            p.append("IG_USER_ID must be the numeric Instagram account ID")
        if not self.token:
            p.append("IG_ACCESS_TOKEN is not set")
        elif re.search(r"\s", self.token) or len(self.token) < 20:
            p.append("IG_ACCESS_TOKEN does not look like a token")
        if self.host not in API_HOSTS:
            p.append("IG_API_HOST must be graph.instagram.com (Instagram Login) or graph.facebook.com (Facebook Login)")
        if not re.fullmatch(r"v\d+\.\d+", self.version):
            p.append("IG_API_VERSION must look like v25.0")
        if self.media_base_url and not self.media_base_url.startswith("https://"):
            p.append("PRAYOGX_MEDIA_BASE_URL must be an https:// URL")
        if self.upload_mode not in ("video_url", "resumable"):
            p.append("IG_UPLOAD_MODE must be video_url or resumable")
        elif self.upload_mode == "resumable" and self.host == "graph.instagram.com":
            p.append("the direct (resumable) upload works only with Facebook Login (IG_API_HOST=graph.facebook.com); with Instagram Login "
                     "the video must be at a public URL: set PRAYOGX_MEDIA_BASE_URL and leave IG_UPLOAD_MODE unset")
        elif self.upload_mode == "video_url" and not self.media_base_url:
            p.append("Instagram Login publishes from a public URL: set PRAYOGX_MEDIA_BASE_URL (https) and host <ID>/reel.mp4 there "
                     "(or use Facebook Login: IG_API_HOST=graph.facebook.com, which uploads directly)")
        if self.env_file_mode is not None and self.env_file_mode & 0o077:
            p.append(".env is readable by other users - run: chmod 600 .env")
        return p

    def describe(self):
        return {"IG_USER_ID": ("set (%d digits)" % len(self.ig_user_id)) if self.ig_user_id else "NOT SET",
                "IG_ACCESS_TOKEN": "set ([REDACTED], %d characters)" % len(self.token) if self.token else "NOT SET",
                "IG_API_HOST": self.host, "IG_API_VERSION": self.version,
                "PRAYOGX_MEDIA_BASE_URL": self.media_base_url or "not set", "upload": self.upload_mode,
                "IG_SHARE_TO_FEED": self.share_to_feed}


def load_config(environ=None, env_file=None):
    environ = os.environ if environ is None else environ
    env_file = ENV_FILE if env_file is None else env_file
    vals = {}
    if env_file and os.path.isfile(env_file):
        vals["_ENV_FILE_MODE"] = stat.S_IMODE(os.stat(env_file).st_mode)
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip().replace("export ", "")
                if k.startswith(("IG_", "PRAYOGX_")):
                    vals[k] = v.strip().strip("'\"")
    vals.update({k: v for k, v in environ.items() if k.startswith(("IG_", "PRAYOGX_"))})
    return Config(vals)


# ------------------------------------------------------------------ HTTP (official hosts only)
class HttpTransport:
    def __init__(self, media_host=None):
        self.media_host = media_host                     # PRAYOGX_MEDIA_BASE_URL's host: plain GETs only, never credentials

    def request(self, method, url, headers=None, body=None, timeout=120):
        host = urllib.parse.urlparse(url).hostname
        if self.media_host and host == self.media_host and method == "GET" and not headers and urllib.parse.urlparse(url).scheme == "https":
            pass
        elif urllib.parse.urlparse(url).scheme != "https" or host not in ALLOWED_HOSTS:
            raise PublishError("security", "refusing a request to %s: only %s" % (host, ", ".join(sorted(ALLOWED_HOSTS))))
        req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            raise PublishError("network", "network error: %s" % getattr(e, "reason", e))


def classify(status, payload):
    """(kind, message) for a Graph API error response"""
    err = (payload or {}).get("error") or {}
    code, sub, msg = err.get("code"), err.get("error_subcode"), err.get("error_user_msg") or err.get("message") or ("HTTP %s" % status)
    if "video_url" in str(msg):
        return "config", ("Instagram needs the video at a public URL (%s): with Instagram Login (graph.instagram.com) set PRAYOGX_MEDIA_BASE_URL "
                          "and host <ID>/reel.mp4 there, or use Facebook Login (graph.facebook.com) for the direct upload" % msg)
    if code == 190 or status == 401:
        return "auth", "the access token is invalid or expired (code 190): create a new long-lived token - " + msg
    if code in (10, 3) or (isinstance(code, int) and 200 <= code <= 299) or status == 403:
        return "permission", "permission missing (code %s): the token needs instagram_business_content_publish (Instagram Login) or instagram_content_publish (Facebook Login) - %s" % (code, msg)
    if code in (4, 17, 32, 613) or sub == 2207042 or status == 429:
        return "rate_limit", "rate or publishing limit reached (code %s/%s): try later - %s" % (code, sub, msg)
    if code == 9007 or sub in (2207027,):
        return "processing", "the media is not ready yet (code %s/%s) - %s" % (code, sub, msg)
    if code == 9004 or sub in (2207026, 2207052):
        return "upload", "Instagram could not use the video (code %s/%s): check the format - %s" % (code, sub, msg)
    if status and status >= 500:
        return "network", "Instagram server error HTTP %s - %s" % (status, msg)
    return "api", "Graph API error (HTTP %s, code %s/%s): %s" % (status, code, sub, msg)


class Graph:
    def __init__(self, cfg, transport, log, sleep=time.sleep):
        self.cfg, self.t, self.log, self.sleep = cfg, transport, log, sleep

    def _url(self, path, query=None):
        q = ("?" + urllib.parse.urlencode(query)) if query else ""
        return "https://%s/%s/%s%s" % (self.cfg.host, self.cfg.version, path.lstrip("/"), q)

    def _json(self, status, raw):
        try:
            return json.loads(raw.decode("utf-8") or "{}")
        except (ValueError, UnicodeDecodeError):
            return {"error": {"message": "non-JSON response (%d bytes)" % len(raw)}}

    def get(self, path, fields, retries=3):
        url = self._url(path, {"fields": fields, "access_token": self.cfg.token})
        for i in range(retries):
            try:
                status, raw = self.t.request("GET", url, timeout=60)
            except PublishError as e:
                if e.kind == "network" and i < retries - 1:
                    self.log("GET /%s: %s - retrying" % (path, e)); self.sleep(2 * (i + 1)); continue
                raise
            data = self._json(status, raw)
            if status == 200 and "error" not in data:
                return data
            kind, msg = classify(status, data)
            if kind == "network" and i < retries - 1:
                self.log("GET /%s: %s - retrying" % (path, msg)); self.sleep(2 * (i + 1)); continue
            raise PublishError(kind, msg, data.get("error"))

    def post(self, path, params):
        body = urllib.parse.urlencode(dict(params, access_token=self.cfg.token)).encode()
        status, raw = self.t.request("POST", self._url(path), {"Content-Type": "application/x-www-form-urlencoded"}, body, timeout=120)
        data = self._json(status, raw)
        if status == 200 and "error" not in data:
            return data
        kind, msg = classify(status, data)
        raise PublishError(kind, msg, data.get("error"))

    # the documented calls
    def account(self):
        return self.get(self.cfg.ig_user_id, "id,username")

    def publishing_limit(self):
        d = self.get("%s/content_publishing_limit" % self.cfg.ig_user_id, "quota_usage,config")
        row = (d.get("data") or [{}])[0]
        return int(row.get("quota_usage", 0)), int((row.get("config") or {}).get("quota_total", 100))

    def create_container(self, caption, cover_url=None, thumb_offset_ms=0, video_url=None):
        p = {"media_type": "REELS", "caption": caption, "share_to_feed": "true" if self.cfg.share_to_feed else "false"}
        if video_url:
            p["video_url"] = video_url
        else:
            p["upload_type"] = "resumable"
        if cover_url:
            p["cover_url"] = cover_url
        else:
            p["thumb_offset"] = str(int(thumb_offset_ms))
        d = self.post("%s/media" % self.cfg.ig_user_id, p)
        if not d.get("id"):
            raise PublishError("api", "the container was not created: no id in the response")
        return d["id"]

    def fetch_public(self, url):
        """the hosted file as Meta will download it: a plain GET, no token"""
        try:
            status, raw = self.t.request("GET", url, timeout=600)
        except PublishError as e:
            return None, str(e)
        return (raw, "") if status == 200 else (None, "HTTP %s" % status)

    def upload(self, container_id, video_path):
        size = os.path.getsize(video_path)
        with open(video_path, "rb") as f:
            body = f.read()
        url = "https://%s/ig-api-upload/%s/%s" % (UPLOAD_HOST, self.cfg.version, container_id)
        status, raw = self.t.request("POST", url, {"Authorization": "OAuth " + self.cfg.token, "offset": "0", "file_size": str(size),
                                                    "Content-Type": "application/octet-stream"}, body, timeout=900)
        data = self._json(status, raw)
        if status != 200 or data.get("success") is not True:
            kind, msg = classify(status, data)
            raise PublishError("upload" if kind in ("api", "network") else kind, "the video upload failed: " + msg, data.get("error"))
        return size

    def container_status(self, container_id):
        return self.get(container_id, "status_code,status")

    def media_publish(self, container_id):
        d = self.post("%s/media_publish" % self.cfg.ig_user_id, {"creation_id": container_id})
        if not d.get("id"):
            raise PublishError("api", "media_publish returned no media id")
        return d["id"]

    def media(self, media_id):
        return self.get(media_id, "id,permalink,media_type,media_product_type,timestamp,caption,username")

    def recent_media(self):
        return self.get("%s/media" % self.cfg.ig_user_id, "id,caption,timestamp,permalink,media_product_type").get("data", [])


# ------------------------------------------------------------------ the reel record and the ledger
def reel_dir(sid):
    if not re.fullmatch(r"[A-Z0-9-]+", sid or ""):
        raise PublishError("state", "not a simulation ID: %r" % sid)
    return os.path.join(OUT_DIR, sid)


def load_reel(sid):
    p = os.path.join(reel_dir(sid), "reel.json")
    if not os.path.exists(p):
        raise PublishError("state", "no reel for %s: generate it first (node tools/reel-maker/generate-reel.js %s)" % (sid, sid))
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data, secrets=()):
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    leaks = find_secrets(text, secrets)
    if leaks:
        raise PublishError("security", "refusing to write %s: it would contain %s" % (os.path.basename(path), ", ".join(sorted(set(leaks)))))
    tmp = path + ".tmp-" + uuid.uuid4().hex[:6]
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


def save_reel(sid, m, secrets=()):
    save_json(os.path.join(reel_dir(sid), "reel.json"), m, secrets)


def transition(m, new, by, note=None, force=False):
    old = m.get("status")
    if new not in STATES:
        raise PublishError("state", "unknown state " + new)
    if new not in TRANSITIONS.get(old, set()):
        raise PublishError("state", "%s cannot go from %s to %s" % (m.get("simulationId"), old, new))
    if old == "VERIFIED" and new == "PUBLISHING" and not force:
        raise PublishError("duplicate", "%s is already published and verified - a republish needs --force-republish" % m.get("simulationId"))
    m["status"] = new
    e = {"status": new, "at": now(), "by": by}
    if note:
        e["note"] = note
    m.setdefault("statusHistory", []).append(e)
    return m


def load_ledger():
    if not os.path.exists(LEDGER):
        return {"publications": []}
    with open(LEDGER, encoding="utf-8") as f:
        return json.load(f)


def ledger_entries(sid):
    return [p for p in load_ledger().get("publications", []) if p.get("simulationId") == sid]


def record_publication(entry, secrets=()):
    led = load_ledger()
    pubs = led.setdefault("publications", [])
    for p in pubs:
        if p.get("mediaId") == entry["mediaId"]:
            p.update(entry); break
    else:
        pubs.append(entry)
    led["publications"] = sorted(pubs, key=lambda p: (p.get("simulationId", ""), p.get("publishedAt", "")))
    save_json(LEDGER, led, secrets)


class Log:
    def __init__(self, sid, redact, echo=True):
        self.redact, self.echo = redact, echo
        d = os.path.join(reel_dir(sid), "publish")
        os.makedirs(d, exist_ok=True)
        self.path = os.path.join(d, "publish.log")

    def __call__(self, msg):
        line = self.redact(msg)
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(now() + "  " + line + "\n")
        if self.echo:
            print(line)


# ------------------------------------------------------------------ integrity and preflight
def integrity(sid, m):
    """problems with the reel's files against what was validated (empty = intact)"""
    d, p = reel_dir(sid), []
    H = m.get("hashes") or {}
    for f in ("reel.mp4", "thumbnail.jpg", "caption.txt"):
        fp = os.path.join(d, f)
        if not os.path.exists(fp):
            p.append(f + " is missing")
        elif not H.get(f):
            p.append(f + " has no validated hash")
        elif sha256(fp) != H[f]:
            p.append(f + " changed after validation")
    return p


def approval_problems(sid, m):
    a = m.get("approval")
    if not a:
        return ["no approval recorded: a person must run approve after reviewing the reel"]
    if a.get("hashes") != m.get("hashes"):
        return ["the approval was given for different files"]
    return integrity(sid, m)


def caption_problems(text, secrets=()):
    p = []
    if not text.strip():
        p.append("caption is empty")
    if len(text) > REELS["caption_chars"]:
        p.append("caption is %d characters (max %d)" % (len(text), REELS["caption_chars"]))
    if len(re.findall(r"(?<!\w)#\w+", text)) > REELS["hashtags"]:
        p.append("more than %d hashtags" % REELS["hashtags"])
    if len(re.findall(r"(?<!\w)@\w+", text)) > REELS["mentions"]:
        p.append("more than %d mentions" % REELS["mentions"])
    leaks = find_secrets(text, secrets)
    if leaks:
        p.append("the caption contains " + ", ".join(sorted(set(leaks))))
    return p


def preflight(sid, cfg, graph=None, for_publish=True, force_republish=False):
    """the checklist: [(name, ok, detail)]; graph=None means offline (the live checks are reported as not run)"""
    items = []
    add = lambda name, ok, detail="": items.append((name, None if ok is None else bool(ok), str(detail)))
    secrets = [cfg.token]
    try:
        m = load_reel(sid)
    except PublishError as e:
        add("the reel exists", False, e)
        return items, None
    d = reel_dir(sid)
    st = m.get("status")
    ready = {"APPROVED", "PUBLISH_FAILED"} | ({"VERIFIED", "VERIFICATION_FAILED", "PUBLISHED"} if force_republish else set())
    add("the reel is approved by a person (state %s)" % st, st in ready, "approved by %s at %s" % (m["approval"]["reviewer"], m["approval"]["at"]) if m.get("approval") else "no approval")
    if st == "PUBLISH_FAILED" and (m.get("publish") or {}).get("uncertain"):
        add("no unresolved publish attempt", False, "the last attempt may have posted - run verify %s first" % sid)
    ap = approval_problems(sid, m)
    add("the approval covers exactly these files (sha256 of reel.mp4, thumbnail.jpg, caption.txt)", not ap, "; ".join(ap) or "unchanged since validation")
    v = m.get("validation") or {}
    checks = v.get("checks") or []
    audio = [c for c in checks if c["name"].startswith("audio: ")]
    add("every reel check passed, including the audio", bool(checks) and v.get("passed") == len(checks) and len(audio) >= 11,
        "%s/%s checks, %d audio" % (v.get("passed"), len(checks), len(audio)))
    try:
        import audio as AU
        lib = AU.load_library()
        recs = [AU.check_asset(lib, t["assetId"], t["role"]) for t in (m.get("audio") or {}).get("tracks", [])]
        add("audio licensing verified for commercial Instagram use (re-checked against audio_library.json)", len(recs) >= 2,
            ", ".join("%s: %s" % (r["assetId"], r["source"]) for r in recs))
    except Exception as e:  # noqa: BLE001 - any failure here blocks
        add("audio licensing verified for commercial Instagram use (re-checked against audio_library.json)", False, e)
    pr = v.get("probe") or {}
    mp4 = os.path.join(d, "reel.mp4")
    size = os.path.getsize(mp4) if os.path.exists(mp4) else 0
    vok = (pr.get("video") == "avc1" and pr.get("width") == 1080 and pr.get("height") == 1920 and REELS["min_fps"] <= pr.get("fps", 0) <= REELS["max_fps"]
           and REELS["min_s"] <= pr.get("duration", 0) <= REELS["max_s"] and 0 < size <= REELS["max_bytes"] and pr.get("audio") == "aac "
           and 0 < pr.get("sampleRate", 0) <= REELS["max_audio_hz"] and pr.get("channels") in (1, 2) and 0 < pr.get("videoBitRate", 0) <= REELS["max_vbr"])
    try:
        import mp4tools
        box = mp4tools.inspect(open(mp4, "rb").read()) if size else {}
    except Exception as e:  # noqa: BLE001
        box = {"error": str(e)}
    vok = bool(vok and box.get("moovBeforeMdat") and box.get("editLists") == 0)
    add("the video meets the Reels spec (H.264 1080x1920, 23-60 fps, 3 s-15 min, <= 300 MB, AAC <= 48 kHz, moov first, no edit lists)", vok,
        "%s %sx%s %.0f fps %.1f s %.1f MB, %s %s Hz, moov first %s, edit lists %s" % (pr.get("video"), pr.get("width"), pr.get("height"), pr.get("fps", 0),
                                                                                  pr.get("duration", 0), size / 1e6, pr.get("audio"), pr.get("sampleRate"), box.get("moovBeforeMdat"), box.get("editLists")))
    cap = open(os.path.join(d, "caption.txt"), encoding="utf-8").read() if os.path.exists(os.path.join(d, "caption.txt")) else ""
    cp = caption_problems(cap, secrets)
    add("the caption meets the limits (<= 2200 characters, 30 hashtags, 20 mentions) and holds no secret", not cp, "; ".join(cp) or "%d characters" % len(cap))
    th = os.path.join(d, "thumbnail.jpg")
    tb = open(th, "rb").read(3) if os.path.exists(th) else b""
    add("the cover: thumbnail.jpg is a JPEG under 8 MB (sent as cover_url when PRAYOGX_MEDIA_BASE_URL hosts it, else a frame via thumb_offset)",
        tb == b"\xff\xd8\xff" and os.path.getsize(th) <= REELS["cover_bytes"],
        ("cover_url %s/%s/thumbnail.jpg if it is hosted there unchanged, else thumb_offset" % (cfg.media_base_url, sid)) if cfg.media_base_url
        else "thumb_offset %d ms (no public cover host configured)" % cfg.thumb_offset_ms)
    prior = [p for p in ledger_entries(sid) if p.get("status") in ("PUBLISHED", "VERIFIED", "VERIFICATION_FAILED")]
    add("not already published (tools/reel-maker/publications.json)" + (" - forced republish" if force_republish else ""), not prior or force_republish,
        "; ".join("%s %s %s" % (p.get("status"), p.get("publishedAt"), p.get("permalink") or p.get("mediaId")) for p in prior) or "no earlier publication")
    try:
        man = json.load(open(MANIFEST, encoding="utf-8"))
        e = next((s for s in man["simulations"] if s["id"] == sid), None)
    except (OSError, ValueError, KeyError):
        e = None
    add("the simulation is in the library (data/manifest.json) and not a draft", bool(e) and e.get("status") != "draft" and os.path.exists(os.path.join(ROOT, e["path"])),
        "%s, %s" % (e.get("status"), e.get("path")) if e else "not in data/manifest.json")
    lock = os.path.join(d, "publish", "publish.lock")
    add("no other publish of this reel is running", not os.path.exists(lock), "lock " + os.path.relpath(lock, ROOT) if os.path.exists(lock) else "")
    cprob = cfg.problems()
    if cfg.upload_mode == "video_url":
        name = "the hosted reel is public and byte-identical to the approved reel (Instagram Login downloads it from PRAYOGX_MEDIA_BASE_URL)"
        if not cfg.media_base_url:
            add(name, False, "PRAYOGX_MEDIA_BASE_URL is not set")
        elif graph is None:
            add(name, None, "not checked (offline; add --online): %s" % cfg.video_url(sid))
        else:
            raw, why = graph.fetch_public(cfg.video_url(sid))
            want = (m.get("approval") or {}).get("hashes", m.get("hashes") or {}).get("reel.mp4")
            got = hashlib.sha256(raw).hexdigest() if raw is not None else None
            add(name, raw is not None and got == want, "%s: %s" % (cfg.video_url(sid), why if raw is None else
                ("%d bytes, sha256 matches" % len(raw)) if got == want else "a different file (sha256 %s, approved %s)" % (got[:12], str(want)[:12])))
            th, _ = graph.fetch_public("%s/%s/thumbnail.jpg" % (cfg.media_base_url, sid))
            cfg.cover_hosted = th is not None and hashlib.sha256(th).hexdigest() == (m.get("hashes") or {}).get("thumbnail.jpg")
    add("configuration: IG_USER_ID, IG_ACCESS_TOKEN, IG_API_HOST, IG_API_VERSION", not cprob, "; ".join(cprob) or "%s %s" % (cfg.host, cfg.version))
    if graph is None:
        add("live: the token works and belongs to IG_USER_ID", None, "not checked (offline; add --online)")
        add("live: under the 24-hour publishing limit", None, "not checked (offline; add --online)")
    elif cprob:
        add("live: the token works and belongs to IG_USER_ID", False, "not checked: fix the configuration first")
        add("live: under the 24-hour publishing limit", False, "not checked: fix the configuration first")
    else:
        try:
            acc = graph.account()
            add("live: the token works and belongs to IG_USER_ID", str(acc.get("id")) == cfg.ig_user_id, "@%s" % acc.get("username", "?"))
        except PublishError as e:
            add("live: the token works and belongs to IG_USER_ID", False, "%s: %s" % (e.kind, e))
        try:
            used, total = graph.publishing_limit()
            add("live: under the 24-hour publishing limit", used < total, "%d of %d used" % (used, total))
        except PublishError as e:
            add("live: under the 24-hour publishing limit", False, "%s: %s" % (e.kind, e))
    return items, m


def print_checklist(items, redact):
    for name, ok, detail in items:
        mark = "PASS " if ok else ("SKIP " if ok is None else "FAIL ")
        print(redact("  %s %s%s" % (mark, name, ("   " + detail) if detail else "")))


def confirm_id(sid, given, action, ask=input):
    """the person types the simulation ID (or passes --confirm ID when there is no terminal)"""
    if given is not None:
        if given != sid:
            raise PublishError("approval", "--confirm %s does not match %s" % (given, sid))
        return
    if not sys.stdin.isatty():
        raise PublishError("approval", "%s needs a person: run it in a terminal, or pass --confirm %s" % (action, sid))
    if ask("Type %s to %s it: " % (sid, action)).strip() != sid:
        raise PublishError("approval", "not confirmed - nothing changed")


# ------------------------------------------------------------------ commands
def cmd_status(sid=None):
    ids = [sid] if sid else sorted(x for x in os.listdir(OUT_DIR) if os.path.exists(os.path.join(OUT_DIR, x, "reel.json"))) if os.path.isdir(OUT_DIR) else []
    rows = []
    for i in ids:
        m = load_reel(i)
        v = m.get("validation") or {}
        intact = ("" if m.get("status") in ("GENERATION_FAILED", "VALIDATION_FAILED") else
                  "legacy record: regenerate before review" if m.get("status") not in STATES else
                  "files intact" if not integrity(i, m) else "FILES CHANGED")
        pubs = ledger_entries(i)
        rows.append("%-22s %-20s %5s checks  %-13s %s" % (i, m.get("status"), "%s/%s" % (v.get("passed", 0), len(v.get("checks", []))), intact,
                                                        ("; published " + ", ".join(p.get("permalink") or p.get("mediaId") for p in pubs)) if pubs else ""))
    print("\n".join(rows) if rows else "no reels in " + os.path.relpath(OUT_DIR, ROOT))
    return rows


def cmd_review(sid, open_files=False):
    m = load_reel(sid)
    d = reel_dir(sid)
    v = m.get("validation") or {}
    au = m.get("audio") or {}
    print("%s  -  %s" % (sid, m.get("status")))
    print("  look at:   %s\n             %s\n             %s" % tuple(os.path.relpath(os.path.join(d, f), ROOT) for f in ("reel.mp4", "thumbnail.jpg", "caption.txt")))
    print("  video:     %s s, %s/%s checks passed" % ((m.get("video") or {}).get("seconds"), v.get("passed"), len(v.get("checks", []))))
    for c in v.get("checks", []):
        if not c["ok"]:
            print("  FAIL       " + c["name"] + "   " + c.get("detail", ""))
    if au.get("score"):
        s, me = au["score"], au.get("measured") or {}
        print("  music:     original PrayogX score - %s palette, %s BPM, %s, lead %s" % (s["palette"], s["bpm"], s["key"], s["lead"]))
        print("  audio:     %s LUFS, true peak %s dBTP, sync %s ms, accents %s" % (me.get("integratedLufs"), me.get("truePeakDbtp"), me.get("syncLagMs"), me.get("accentsDb")))
        for t in au.get("tracks", []):
            print("  licence:   %s (%s) - %s" % (t["assetId"], t["source"], "verified" if t.get("licenseVerified") else "NOT VERIFIED"))
    if os.path.exists(os.path.join(d, "caption.txt")):
        print("  caption:\n" + "\n".join("     | " + x for x in open(os.path.join(d, "caption.txt"), encoding="utf-8").read().rstrip().split("\n")))
    ip = integrity(sid, m)
    print("  files:     " + ("; ".join(ip) if ip else "unchanged since validation"))
    if m.get("status") == "READY_FOR_REVIEW":
        print("\n  Watch it with sound, end to end. If it is right:\n    python3 tools/instagram_publish.py approve %s --reviewer \"<your name>\"" % sid)
        print("  If not:\n    python3 tools/instagram_publish.py reject %s --reason \"<what is wrong>\"" % sid)
    if open_files and sys.platform == "darwin":
        subprocess.run(["open", os.path.join(d, "reel.mp4"), os.path.join(d, "thumbnail.jpg")])
    return m


def cmd_approve(sid, reviewer, note=None, confirm=None, ask=input, environ=None):
    environ = os.environ if environ is None else environ
    if environ.get("CI"):
        raise PublishError("approval", "approval is refused in CI: only a person approves a reel")
    if not reviewer or reviewer.strip().lower() in AUTOMATED_REVIEWERS:
        raise PublishError("approval", "approve needs --reviewer with the name of the person who watched the reel")
    m = load_reel(sid)
    if m.get("status") != "READY_FOR_REVIEW":
        raise PublishError("state", "%s is %s - only a READY_FOR_REVIEW reel can be approved" % (sid, m.get("status")))
    v = m.get("validation") or {}
    if not v.get("checks") or v.get("passed") != len(v["checks"]):
        raise PublishError("state", "%s has failing checks - it cannot be approved" % sid)
    ip = integrity(sid, m)
    if ip:
        transition(m, "NOT_READY", "instagram_publish.py", "; ".join(ip))
        save_reel(sid, m)
        raise PublishError("state", "%s: %s - regenerate and review it again" % (sid, "; ".join(ip)))
    confirm_id(sid, confirm, "approve", ask)
    m["approval"] = {"reviewer": reviewer.strip(), "at": now(), "note": note or "", "hashes": dict(m["hashes"])}
    transition(m, "APPROVED", reviewer.strip(), note)
    save_reel(sid, m)
    print("%s APPROVED by %s. Nothing is published yet. Next:\n  python3 tools/instagram_publish.py publish %s --dry-run --online\n  python3 tools/instagram_publish.py publish %s" % (sid, reviewer.strip(), sid, sid))
    return m


def cmd_reject(sid, reason, reviewer=None):
    if not reason or not reason.strip():
        raise PublishError("approval", "reject needs --reason")
    m = load_reel(sid)
    transition(m, "REJECTED", (reviewer or "reviewer").strip(), reason.strip())
    m.pop("approval", None)
    save_reel(sid, m)
    print("%s REJECTED: %s\nFix the reel story (tools/reel-maker/reels/%s.json) and regenerate it." % (sid, reason.strip(), sid))
    return m


def cover_url(cfg, sid):
    return "%s/%s/thumbnail.jpg" % (cfg.media_base_url, sid) if cfg.media_base_url and cfg.cover_hosted else None


def cmd_dry_run(sid, cfg, transport=None, online=False, force_republish=False):
    red = Redactor([cfg.token])
    graph = Graph(cfg, transport or HttpTransport(cfg.media_host()), print) if online else None
    items, m = preflight(sid, cfg, graph, force_republish=force_republish)
    print(red("DRY RUN - %s - nothing will be posted" % sid))
    print("configuration: " + json.dumps(cfg.describe()))
    print_checklist(items, red)
    blocking = [i for i in items if i[1] is False]
    if m is not None:
        size = os.path.getsize(os.path.join(reel_dir(sid), "reel.mp4")) if os.path.exists(os.path.join(reel_dir(sid), "reel.mp4")) else 0
        cu = cover_url(cfg, sid)
        print("the calls a publish would make (%s, %s):" % (cfg.host, cfg.version))
        vu = cfg.video_url(sid) if cfg.upload_mode == "video_url" else None
        print("  1. POST /<IG_USER_ID>/media  media_type=REELS %s share_to_feed=%s %s caption=<caption.txt>"
              % ("video_url=" + str(vu) if cfg.upload_mode == "video_url" else "upload_type=resumable", str(cfg.share_to_feed).lower(),
                 ("cover_url=" + cu) if cu else "thumb_offset=%d" % cfg.thumb_offset_ms))
        if cfg.upload_mode == "video_url":
            print("  2. (Instagram downloads reel.mp4 from that URL - %d bytes)" % size)
        else:
            print("  2. POST https://%s/ig-api-upload/%s/<container>  offset=0 file_size=%d  (reel.mp4)" % (UPLOAD_HOST, cfg.version, size))
        print("  3. GET  /<container>?fields=status_code  every %.0f s until FINISHED (at most %.0f s)" % (cfg.poll_interval, cfg.poll_timeout))
        print("  4. POST /<IG_USER_ID>/media_publish  creation_id=<container>")
        print("  5. GET  /<media>?fields=id,permalink,media_product_type,caption  (verification)")
    live_skipped = any(i[1] is None for i in items)
    print("\nRESULT: " + ("READY TO PUBLISH" if not blocking and not live_skipped else
                         "READY, except the live checks (run with --online)" if not blocking else
                         "NOT READY - %d check(s) failed" % len(blocking)))
    return items


def _lock(sid):
    d = os.path.join(reel_dir(sid), "publish")
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, "publish.lock")
    try:
        fd = os.open(p, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        raise PublishError("state", "another publish of %s is running (%s)" % (sid, os.path.relpath(p, ROOT)))
    os.write(fd, now().encode()); os.close(fd)
    return p


def cmd_publish(sid, cfg, transport=None, confirm=None, force_republish=False, confirm_republish=None, reason=None,
                ask=input, sleep=time.sleep, clock=time.monotonic):
    red = Redactor([cfg.token])
    secrets = [cfg.token]
    log = Log(sid, red)
    graph = Graph(cfg, transport or HttpTransport(cfg.media_host()), log, sleep)
    if force_republish:
        if confirm_republish != sid or not (reason or "").strip():
            raise PublishError("duplicate", "a forced republish needs --confirm-republish %s and --reason" % sid)
    items, m = preflight(sid, cfg, graph, force_republish=force_republish)
    failed = [i for i in items if i[1] is not True]
    if failed:
        print_checklist(items, red)
        if m is not None and m.get("approval") and integrity(sid, m) and "NOT_READY" in TRANSITIONS.get(m.get("status"), set()):
            transition(m, "NOT_READY", "instagram_publish.py", "files changed after approval: " + "; ".join(integrity(sid, m)))
            save_reel(sid, m, secrets)
        raise PublishError("preflight", "preflight failed (%d): %s - nothing was posted" % (len(failed), "; ".join(i[0] for i in failed)))
    confirm_id(sid, confirm, "publish", ask)
    lock = _lock(sid)
    try:
        attempt = {"attemptId": uuid.uuid4().hex[:12], "startedAt": now(), "host": cfg.host, "version": cfg.version, "forced": bool(force_republish)}
        if force_republish:
            attempt["forceReason"] = reason.strip()
        m["publish"] = attempt
        transition(m, "PUBLISHING", "instagram_publish.py", "forced republish: " + reason.strip() if force_republish else None, force=force_republish)
        save_reel(sid, m, secrets)
        cap = open(os.path.join(reel_dir(sid), "caption.txt"), encoding="utf-8").read().strip()

        def fail(e, uncertain=False):
            attempt.update(error={"kind": e.kind, "message": red(str(e))}, failedAt=now(), uncertain=uncertain)
            transition(m, "PUBLISH_FAILED", "instagram_publish.py", "%s: %s" % (e.kind, red(str(e))))
            save_reel(sid, m, secrets)
            log("PUBLISH_FAILED (%s): %s" % (e.kind, e))
            return e

        try:
            log("1/5 creating the Reels container …")
            vu = cfg.video_url(sid) if cfg.upload_mode == "video_url" else None
            cid = graph.create_container(cap, cover_url(cfg, sid), cfg.thumb_offset_ms, vu)
            attempt.update(containerId=cid, upload=cfg.upload_mode)
            save_reel(sid, m, secrets)
            if vu:
                log("2/5 Instagram fetches the video from %s" % vu)
            else:
                log("2/5 uploading reel.mp4 (%d bytes) …" % os.path.getsize(os.path.join(reel_dir(sid), "reel.mp4")))
                graph.upload(cid, os.path.join(reel_dir(sid), "reel.mp4"))
            log("3/5 waiting for Instagram to process it …")
            t0 = clock()
            while True:
                s = graph.container_status(cid)
                code = s.get("status_code")
                attempt["containerStatus"] = code
                if code == "FINISHED":
                    break
                if code in ("ERROR", "EXPIRED"):
                    raise PublishError("processing", "Instagram could not process the video: %s %s" % (code, s.get("status", "")))
                if code == "PUBLISHED":
                    raise PublishError("duplicate", "the container is already published")
                if clock() - t0 > cfg.poll_timeout:
                    raise PublishError("timeout", "processing did not finish in %.0f s (last status %s) - run verify %s later" % (cfg.poll_timeout, code, sid))
                sleep(cfg.poll_interval)
        except PublishError as e:
            raise fail(e)
        try:
            log("4/5 publishing …")
            media_id = graph.media_publish(cid)
        except PublishError as e:
            # the request may have reached Instagram: never retry blindly - verify resolves it from the container's status
            raise fail(e, uncertain=e.kind in ("network", "timeout", "api"))
        attempt.update(mediaId=media_id, publishedAt=now())
        transition(m, "PUBLISHED", "instagram_publish.py", "media " + media_id)
        save_reel(sid, m, secrets)
        record_publication(_ledger_entry(sid, m), secrets)
        log("PUBLISHED: media %s" % media_id)
        return _verify(sid, m, graph, log, secrets, sleep)
    finally:
        os.remove(lock)


def _ledger_entry(sid, m):
    p, a = m.get("publish") or {}, m.get("approval") or {}
    return {"simulationId": sid, "status": m["status"], "mediaId": p.get("mediaId"), "permalink": p.get("permalink"),
            "publishedAt": p.get("publishedAt"), "verifiedAt": p.get("verifiedAt"), "reelSha256": (m.get("hashes") or {}).get("reel.mp4"),
            "approvedBy": a.get("reviewer"), "approvedAt": a.get("at"), "origin": m.get("origin"), "forced": bool(p.get("forced"))}


def _verify(sid, m, graph, log, secrets, sleep, tries=4):
    p = m["publish"]
    cap = open(os.path.join(reel_dir(sid), "caption.txt"), encoding="utf-8").read().strip()
    norm = lambda s: re.sub(r"\s+", " ", s or "").strip()
    why = ""
    for i in range(tries):
        log("5/5 verifying media %s …" % p["mediaId"])
        try:
            md = graph.media(p["mediaId"])
            ok_id = str(md.get("id")) == str(p["mediaId"])
            ok_type = md.get("media_product_type") == "REELS" or md.get("media_type") in ("VIDEO", "REELS")
            ok_link = bool(re.match(r"https://(www\.)?instagram\.com/", md.get("permalink") or ""))
            ok_cap = norm(md.get("caption")) == norm(cap)
            if ok_id and ok_type and ok_link and ok_cap:
                p.update(permalink=md["permalink"], verifiedAt=now(), timestamp=md.get("timestamp"))
                transition(m, "VERIFIED", "instagram_publish.py", md["permalink"])
                save_reel(sid, m, secrets)
                record_publication(_ledger_entry(sid, m), secrets)
                log("VERIFIED: %s" % md["permalink"])
                return m
            why = "id %s, type %s, permalink %s, caption %s" % (ok_id, md.get("media_product_type") or md.get("media_type"), bool(ok_link), "matches" if ok_cap else "differs")
        except PublishError as e:
            why = "%s: %s" % (e.kind, e)
        if i < tries - 1:
            sleep(5 * (i + 1))
    p["verificationError"] = why
    transition(m, "VERIFICATION_FAILED", "instagram_publish.py", why)
    save_reel(sid, m, secrets)
    record_publication(_ledger_entry(sid, m), secrets)
    log("VERIFICATION_FAILED: %s - the post exists (media %s) but could not be confirmed; run verify %s again" % (why, p["mediaId"], sid))
    return m


def cmd_verify(sid, cfg, transport=None, sleep=time.sleep):
    red = Redactor([cfg.token])
    secrets = [cfg.token]
    if cfg.problems():
        raise PublishError("config", "; ".join(cfg.problems()))
    log = Log(sid, red)
    graph = Graph(cfg, transport or HttpTransport(cfg.media_host()), log, sleep)
    m = load_reel(sid)
    p = m.get("publish") or {}
    st = m.get("status")
    if st in ("PUBLISHED", "VERIFICATION_FAILED") and p.get("mediaId"):
        return _verify(sid, m, graph, log, secrets, sleep, tries=1)
    if st == "VERIFIED" and p.get("mediaId"):
        return _reverify(sid, m, graph, log, secrets)
    if st == "PUBLISH_FAILED" and p.get("containerId"):
        s = graph.container_status(p["containerId"])
        code = s.get("status_code")
        log("container %s: %s" % (p["containerId"], code))
        if code != "PUBLISHED":
            p["uncertain"] = False
            p["containerStatus"] = code
            save_reel(sid, m, secrets)
            log("not published (container %s): it is safe to run publish %s again" % (code, sid))
            return m
        cap = open(os.path.join(reel_dir(sid), "caption.txt"), encoding="utf-8").read().strip()
        norm = lambda x: re.sub(r"\s+", " ", x or "").strip()
        hit = [x for x in graph.recent_media() if norm(x.get("caption")) == norm(cap) and (x.get("timestamp") or "") >= p.get("startedAt", "")[:19]]
        if not hit:
            p["uncertain"] = True
            save_reel(sid, m, secrets)
            raise PublishError("verification", "the container is PUBLISHED but its post was not found among the recent media - check the account by hand; do not republish")
        p.update(mediaId=hit[0]["id"], publishedAt=hit[0].get("timestamp") or now(), uncertain=False)
        transition(m, "PUBLISHED", "instagram_publish.py", "resolved by verify: media " + hit[0]["id"])
        save_reel(sid, m, secrets)
        record_publication(_ledger_entry(sid, m), secrets)
        return _verify(sid, m, graph, log, secrets, sleep, tries=1)
    raise PublishError("state", "%s is %s - nothing to verify" % (sid, st))


def _reverify(sid, m, graph, log, secrets):
    md = graph.media(m["publish"]["mediaId"])
    ok = str(md.get("id")) == str(m["publish"]["mediaId"]) and bool(md.get("permalink"))
    transition(m, "VERIFIED" if ok else "VERIFICATION_FAILED", "instagram_publish.py", md.get("permalink") or "media not found")
    save_reel(sid, m, secrets)
    record_publication(_ledger_entry(sid, m), secrets)
    log(("VERIFIED: " + md.get("permalink")) if ok else "VERIFICATION_FAILED")
    return m


# ------------------------------------------------------------------ CLI
def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if argv and argv[0] == "--reel":                                 # instagram_publish.py --reel <ID> --dry-run
        argv = ["publish"] + argv[1:]
    ap = argparse.ArgumentParser(prog="instagram_publish.py", description="Approval-gated Instagram Reel publishing (official Graph API).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("status"); p.add_argument("id", nargs="?")
    p = sub.add_parser("review"); p.add_argument("id"); p.add_argument("--open", action="store_true")
    p = sub.add_parser("approve"); p.add_argument("id"); p.add_argument("--reviewer", required=True); p.add_argument("--note"); p.add_argument("--confirm")
    p = sub.add_parser("reject"); p.add_argument("id"); p.add_argument("--reason", required=True); p.add_argument("--reviewer")
    p = sub.add_parser("publish"); p.add_argument("id"); p.add_argument("--dry-run", action="store_true"); p.add_argument("--online", action="store_true")
    p.add_argument("--confirm"); p.add_argument("--force-republish", action="store_true"); p.add_argument("--confirm-republish"); p.add_argument("--reason")
    p = sub.add_parser("preflight"); p.add_argument("id"); p.add_argument("--online", action="store_true")
    p = sub.add_parser("verify"); p.add_argument("id")
    a = ap.parse_args(argv)
    cfg = load_config()
    red = Redactor([cfg.token])
    try:
        if a.cmd == "status":
            cmd_status(a.id)
        elif a.cmd == "review":
            cmd_review(a.id, a.open)
        elif a.cmd == "approve":
            cmd_approve(a.id, a.reviewer, a.note, a.confirm)
        elif a.cmd == "reject":
            cmd_reject(a.id, a.reason, a.reviewer)
        elif a.cmd == "preflight" or (a.cmd == "publish" and a.dry_run):
            items = cmd_dry_run(a.id, cfg, online=a.online, force_republish=getattr(a, "force_republish", False))
            return 1 if any(i[1] is False for i in items) else 0
        elif a.cmd == "publish":
            m = cmd_publish(a.id, cfg, confirm=a.confirm, force_republish=a.force_republish, confirm_republish=a.confirm_republish, reason=a.reason)
            print("\n%s %s %s" % (a.id, m["status"], (m.get("publish") or {}).get("permalink") or ""))
            return 0 if m["status"] == "VERIFIED" else 1
        elif a.cmd == "verify":
            m = cmd_verify(a.id, cfg)
            print("%s %s %s" % (a.id, m["status"], (m.get("publish") or {}).get("permalink") or ""))
            return 0 if m["status"] == "VERIFIED" else 1
        return 0
    except PublishError as e:
        print(red("ERROR (%s): %s" % (e.kind, e)), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
