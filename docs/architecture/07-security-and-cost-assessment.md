# 07 — Security and Cost Assessment

Status: assessment 2026-11-21. No keys were created or read; `.env` contents were not opened.

## 1. Current security posture (checked)

| Item | Finding |
|---|---|
| Secrets storage | `.env` is git-ignored in both repos (checked with `git check-ignore`). `.env.example` holds placeholders (IG, YT, FB, whisper, media host). |
| Token handling in code | Publishers and `ig_track.py` read tokens from `.env` and state they never print/store them. |
| Publishing | official APIs only; hash-bound approval; YouTube private by default; unaudited project private-only. |
| Cross-repo coupling | studio scripts read the main repo's `.env` by absolute path (`ig_track.py`) and import `tools/reel-maker/audio.py`. Works, but two repos now depend on one file path. |
| Third-party generation | Higgsfield and Sarvam keys in `.env`; paid voice is a separate command under a credit cap (good). |

## 2. Risks for PrayogX 2.0

| Risk | Likelihood | Impact | Control |
|---|---|---|---|
| New Google keys leak (in a log, prompt or commit) | M | H | one key per purpose; API restrictions (only Generative Language API); key in `.env` or Keychain; router never logs headers; pre-commit secret scan (e.g. a grep gate) |
| Runaway spend on Veo / image loops | M | M | router budget caps, `estimate()` before `generate()`, no auto-retry on paid calls, Cloud budget alert at 50/90/100 % |
| Unpublished content used for model training | M | L–M | use paid tier (free tiers may use data to improve products) or Vertex |
| Third-party "Flow API" wrappers | — | H | prohibited (unofficial, needs the owner's Google session) |
| MCP servers with write power (Firebase can create projects) | L | M | install only when a phase needs it; read-only scopes where possible |
| AI images with wrong science or watermark issues | M | M | Visual Asset Designer reference check; provenance registry; SynthID is acceptable |
| Licensing of generated media | L | M | provenance rows; original music only (unchanged) |
| Analytics tag privacy (GA4 on a student site) | M | M | prefer Search Console first; if GA4, consent and minimal data, owner approval |
| Over-automation weakening human gates | L | H | the router and runner never call `approve` / `publish`; End-to-End mode unchanged |

## 3. Cost model (estimates; confirm on pricing pages)

Per **complete reel** (one concept), assuming current practice plus the recommended additions:

| Item | Usage | Est. cost |
|---|---|---|
| Claude (orchestration, script, code, QA subagent) | existing Claude plan | unchanged |
| Gemini grounded fact check | ~50–150k tokens | < US$0.50 |
| Gemini video review of MP4 (2 min) | ~1 pass | < US$1 |
| Nano Banana plates / cover | 0–6 images × ~US$0.13 | ≤ US$0.80 |
| Sarvam voice | existing | unchanged |
| TTS bake-off (one-off) | 3 scripts × 3 voices | < US$5 total |
| Veo (only if approved) | 8 s Fast ≈ US$1; Standard ≈ US$3.20 | per clip |
| Analytics | YouTube/IG/Search Console APIs | free |
| BigQuery sandbox | ≤ 10 GiB | free |

**Indicative:** ~US$1–3 per reel without Veo; at 20 reels/month ≈ US$20–60/month. Google AI Pro (~₹1,950/month,
reported) is **separate** and pays for none of this.

## 4. Controls to put in place before any paid API

1. New Cloud project "prayogx-media", billing account with budget alert; owner creates it and the key (Claude does not).
2. Key restricted to the needed API; stored only in `.env` / Keychain.
3. `router.policy.json`: monthly cap, per-concept cap, per-call cap, Veo disabled.
4. Monthly cost report from `router-log.jsonl`.
