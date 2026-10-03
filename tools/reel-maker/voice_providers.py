#!/usr/bin/env python3
"""PrayogX Reel Maker - voice provider adapters (voice layer Phase 2B).

Every provider implements the same contract, so the rest of PrayogX never depends on a provider's CLI or API:

    provider.id                                 "higgsfield"
    provider.estimate(text, profile) -> float   the credits one generation would cost; spends nothing
    provider.balance() -> float or None         the account's credits, when the provider can tell
    provider.generate(text, profile, out_dir, name) -> {audioPath, provider, model, voiceId, voiceName, jobId, createdAt,
                                                        cost, rawResponsePath, format, request}
    errors: VoiceProviderError(kind, message), kind in auth | config | api | malformed | no_audio | timeout | network

The provider receives exactly the reviewed spoken text and nothing else. It never retries, never writes credentials
anywhere and never logs them. Only voice.py calls generate(), after narration.authorize_generation() has passed.
"""
import json
import os
import re
import subprocess
import urllib.parse
import urllib.request


class VoiceProviderError(Exception):
    def __init__(self, kind, message):
        super().__init__(message)
        self.kind = kind


def redact(text):
    """no e-mail addresses, bearer tokens or long secrets in anything we print or store"""
    text = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "<email>", text or "")
    text = re.sub(r"(?i)(bearer|token|authorization|api[_-]?key)\S*\s*[:=]?\s*\S+", r"\1 <redacted>", text)
    return re.sub(r"\b[A-Za-z0-9_-]{40,}\b", "<redacted>", text)


class VoiceProvider:
    id = None

    def estimate(self, text, profile):
        raise NotImplementedError

    def balance(self):
        return None

    def generate(self, text, profile, out_dir, name):
        raise NotImplementedError


class HiggsfieldProvider(VoiceProvider):
    """Higgsfield through its official CLI (`higgsfield`), exactly as qualified in the Media Lab: model elevenlabs_v4 with
    --dialogue [{text, voice_type, voice_id}]. The CLI keeps its own login; stdin is always closed so it never waits for
    input (the CLI reads a prompt from a non-terminal stdin)."""
    id = "higgsfield"
    MODELS = {"elevenlabs_v4", "elevenlabs_v4_turbo"}       # the dialogue request shape; other models are not qualified here

    def __init__(self, cli="higgsfield", runner=None, fetch=None, timeout=900):
        self.cli, self.timeout = cli, timeout
        self.run = runner or self._run
        self.fetch = fetch or self._fetch

    def _run(self, args, timeout):
        try:
            r = subprocess.run([self.cli] + args, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=timeout)
        except FileNotFoundError:
            raise VoiceProviderError("config", "the higgsfield CLI is not installed or not on PATH")
        except subprocess.TimeoutExpired:
            raise VoiceProviderError("timeout", "higgsfield %s did not finish in %d s" % (args[:2], timeout))
        return r.returncode, r.stdout, r.stderr

    @staticmethod
    def _fetch(url, path):
        u = urllib.parse.urlparse(url)
        if u.scheme != "https" or not u.netloc:
            raise VoiceProviderError("malformed", "result URL is not https: %r" % redact(url)[:120])
        try:
            with urllib.request.urlopen(url, timeout=120) as resp, open(path, "wb") as f:
                f.write(resp.read())
        except OSError as e:
            raise VoiceProviderError("network", "could not download the generated audio: %s" % redact(str(e))[:200])

    def _check(self, profile):
        if profile.get("provider") != self.id:
            raise VoiceProviderError("config", "profile %r is for provider %r, not %s" % (profile.get("profileId"), profile.get("provider"), self.id))
        if profile.get("model") not in self.MODELS:
            raise VoiceProviderError("config", "model %r is not supported by the Higgsfield adapter (qualified: %s)" % (profile.get("model"), ", ".join(sorted(self.MODELS))))
        for k in ("voiceId", "voiceType"):
            if not profile.get(k):
                raise VoiceProviderError("config", "profile %r has no %s" % (profile.get("profileId"), k))

    def request(self, text, profile):
        """the exact request: model, the dialogue payload and the voice settings that are set (null settings are omitted)"""
        self._check(profile)
        args = {"model": profile["model"], "dialogue": [{"text": text, "voice_type": profile["voiceType"], "voice_id": profile["voiceId"]}]}
        for k, v in (profile.get("settings") or {}).items():
            if v is not None:
                args[k] = v
        return args

    def _argv(self, cmd, req, payload_path):
        with open(payload_path, "w", encoding="utf-8") as f:
            json.dump(req["dialogue"], f, ensure_ascii=False)
        argv = ["generate", cmd, req["model"], "--dialogue", "@" + payload_path]
        for k, v in req.items():
            if k not in ("model", "dialogue"):
                argv += ["--" + k, str(v)]
        return argv

    @staticmethod
    def _auth_or_api(rc, out, err):
        msg = redact((err or out or "").strip())[-400:]
        if re.search(r"(?i)session expired|not authenticated|auth login|unauthori[sz]ed|no workspace", msg):
            return VoiceProviderError("auth", "Higgsfield is not signed in (run `higgsfield auth login` yourself): " + msg)
        return VoiceProviderError("api", "higgsfield exited %s: %s" % (rc, msg))

    def estimate(self, text, profile, work_dir=None):
        req = self.request(text, profile)
        work_dir = work_dir or os.getcwd()
        rc, out, err = self.run(self._argv("cost", req, os.path.join(work_dir, ".estimate-payload.json")), 120)
        if rc != 0:
            raise self._auth_or_api(rc, out, err)
        m = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*credits?", out or "")
        if not m:
            raise VoiceProviderError("malformed", "no credit amount in the cost estimate: %r" % redact(out)[:120])
        return float(m.group(1))

    def balance(self):
        rc, out, err = self.run(["account", "status"], 60)
        if rc != 0:
            raise self._auth_or_api(rc, out, err)
        m = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*credits", out or "")
        return float(m.group(1)) if m else None

    def generate(self, text, profile, out_dir, name):
        req = self.request(text, profile)
        os.makedirs(out_dir, exist_ok=True)
        payload = os.path.join(out_dir, name + ".request.json")
        before = self.balance()
        rc, out, err = self.run(self._argv("create", req, payload) + ["--wait", "--wait-timeout", "10m", "--json"], self.timeout)
        raw = os.path.join(out_dir, name + ".response.json")
        with open(raw, "w", encoding="utf-8") as f:
            f.write(redact(out or ""))
        if rc != 0:
            raise self._auth_or_api(rc, out, err)
        try:
            data = json.loads(out)
        except ValueError:
            raise VoiceProviderError("malformed", "the provider's response is not JSON (kept in %s)" % raw)
        job = data[0] if isinstance(data, list) and data else data
        if not isinstance(job, dict) or not job.get("id"):
            raise VoiceProviderError("malformed", "no job in the provider's response (kept in %s)" % raw)
        if job.get("status") != "completed":
            raise VoiceProviderError("api", "job %s ended %r (no audio)" % (job.get("id"), job.get("status")))
        url = job.get("result_url")
        if not url:
            raise VoiceProviderError("no_audio", "job %s completed without an audio URL" % job.get("id"))
        ext = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower() or ".mp3"
        audio = os.path.join(out_dir, name + ext)
        self.fetch(url, audio)
        if not os.path.isfile(audio) or os.path.getsize(audio) < 1000:
            raise VoiceProviderError("no_audio", "job %s: the downloaded audio is missing or empty" % job.get("id"))
        after = self.balance()
        cost = round(before - after, 4) if before is not None and after is not None else None
        return {"audioPath": os.path.abspath(audio), "provider": self.id, "model": req["model"], "voiceId": profile["voiceId"],
                "voiceName": profile.get("voiceName"), "jobId": job["id"], "createdAt": job.get("created_at"), "cost": cost,
                "rawResponsePath": os.path.abspath(raw), "format": ext.lstrip("."),
                "request": {"model": req["model"], "dialogue": req["dialogue"], "payloadFile": os.path.abspath(payload),
                            "settings": {k: v for k, v in req.items() if k not in ("model", "dialogue")}}}


PROVIDERS = {"higgsfield": HiggsfieldProvider}


def get_provider(provider_id):
    if provider_id not in PROVIDERS:
        raise VoiceProviderError("config", "no adapter for voice provider %r (have: %s)" % (provider_id, ", ".join(sorted(PROVIDERS))))
    return PROVIDERS[provider_id]()
