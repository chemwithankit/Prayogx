# Instagram Reel publishing

`tools/instagram_publish.py` publishes a PrayogX reel to Instagram through Meta's **official Instagram Graph
API**, and only after a person has watched the reel and approved it. Nothing is ever published because a reel was
generated, validated, committed or pushed. A production-mode authorisation for a simulation does not cover its
reel.

> **Status (2026-10-01): not configured.** No Meta app, account ID or token is set up in this repository, and the
> publisher has been tested only against a mocked API (`tests/test_instagram_publish.py`). The first real publish
> is an opt-in step for the owner (see "First live publish").

## 1. What Meta requires

| Need | Detail |
|---|---|
| Account | An Instagram **professional** account (Business or Creator). |
| Meta app | A Meta developer app with the Instagram product added. |
| Login flavour | **Instagram Login** (host `graph.instagram.com`): permissions `instagram_business_basic` and `instagram_business_content_publish`. Or **Facebook Login** (host `graph.facebook.com`, the account linked to a Facebook Page): `instagram_basic`, `instagram_content_publish` and `pages_read_engagement` (plus `ads_management` / `ads_read` if the user's Page role was granted through Business Manager). |
| Access | Publishing to the owner's own account works while the account's user has a role on the app. Publishing for other accounts needs Meta's App Review (Advanced Access). |
| Token | A **long-lived** user access token. It expires after about 60 days: refresh or replace it before then. An expired token fails the preflight (code 190). |
| Limit | 100 API-published posts per 24 hours per account (checked before every publish: `content_publishing_limit`). |

Reels media spec (checked by the reel validator and again by the preflight): MP4 with the moov atom first and no
edit lists; H.264, progressive, closed GOP, 4:2:0; 23–60 fps; at most 1920 px wide; video ≤ 25 Mbps; AAC ≤ 48 kHz
mono/stereo (128 kbps); 3 s–15 min; ≤ 300 MB; 9:16. Caption ≤ 2,200 characters, ≤ 30 hashtags, ≤ 20 mentions.
Cover image (optional): JPEG ≤ 8 MB.

## 2. Configuration

Copy `.env.example` to `.env` at the repository root (it is git-ignored), fill it in and run `chmod 600 .env`.
Environment variables override the file.

| Variable | Meaning |
|---|---|
| `IG_USER_ID` | The professional account's numeric Instagram ID. |
| `IG_ACCESS_TOKEN` | The long-lived token. Never commit it, paste it into a story, caption, issue or chat, or put it in a URL you share. |
| `IG_API_HOST` | `graph.instagram.com` (Instagram Login, default) or `graph.facebook.com` (Facebook Login). |
| `IG_API_VERSION` | Default `v25.0`. |
| `PRAYOGX_MEDIA_BASE_URL` | Optional: an `https://` folder where `<ID>/thumbnail.jpg` is publicly hosted; it becomes the cover (`cover_url`). Empty: the cover is a frame of the video (`thumb_offset`). |
| `IG_THUMB_OFFSET_MS`, `IG_SHARE_TO_FEED`, `IG_POLL_INTERVAL_S`, `IG_POLL_TIMEOUT_S` | Cover frame (ms), also show on the profile grid, processing poll interval and timeout. |

**Hosting:** none is needed for the video. It is sent straight to Meta with the resumable upload
(`rupload.facebook.com`), so the reel never has to be put on prayogx.co.in or any public server. Only a designed
cover needs a public URL.

## 3. The workflow

```bash
# 1. generate and validate (automatic for a new simulation; on request for an existing one)
node tools/reel-maker/generate-reel.js ADV-2026-P1-PHY-Q15          # ends 30 / 30 checks, READY_FOR_REVIEW

# 2. review: watch reel.mp4 end to end WITH SOUND, look at thumbnail.jpg, read caption.txt
python3 tools/instagram_publish.py review ADV-2026-P1-PHY-Q15 --open

# 3. a person approves (asks you to type the ID) - or rejects with a reason
python3 tools/instagram_publish.py approve ADV-2026-P1-PHY-Q15 --reviewer "Ankit"
python3 tools/instagram_publish.py reject  ADV-2026-P1-PHY-Q15 --reason "the aha text overlaps the board"

# 4. dry run: the full preflight checklist and the exact calls, nothing posted (--online adds read-only checks)
python3 tools/instagram_publish.py publish ADV-2026-P1-PHY-Q15 --dry-run --online
#    (also: python3 tools/instagram_publish.py --reel ADV-2026-P1-PHY-Q15 --dry-run)

# 5. publish (asks you to type the ID again), then it verifies by itself
python3 tools/instagram_publish.py publish ADV-2026-P1-PHY-Q15

# 6. re-verify any time, or resolve an uncertain attempt
python3 tools/instagram_publish.py verify ADV-2026-P1-PHY-Q15
python3 tools/instagram_publish.py status
```

Approve and publish are different commands and both need a person: each asks for the simulation ID to be typed
(or `--confirm <ID>` without a terminal). Approval is refused in CI and for reviewer names such as "auto", "bot"
or "claude".

### States (`tools/reel-maker/output/<ID>/reel.json`)

```
GENERATED → VALIDATED → READY_FOR_REVIEW → APPROVED → PUBLISHING → PUBLISHED → VERIFIED
                │              │               │            │            │
       VALIDATION_FAILED   REJECTED        NOT_READY   PUBLISH_FAILED  VERIFICATION_FAILED
GENERATION_FAILED (the build stopped)
```

- Only `approve` moves READY_FOR_REVIEW → APPROVED. The approval records the reviewer, the time, a note and the
  sha256 of `reel.mp4`, `thumbnail.jpg` and `caption.txt` as validated. If any of them changes, the approval is
  void and the reel becomes NOT_READY: regenerate and review again.
- A reel is PUBLISHED only when Instagram returned a media ID, and VERIFIED only when the post was read back with
  its permalink, the Reels type and the same caption. A failure is never recorded as published.
- Every transition is appended to `statusHistory` with who and when.

### The preflight (blocking)

The reel is approved by a person · the approval covers exactly these files · every reel check passed, including
the 11 audio checks · audio licensing re-checked against `audio_library.json` · the Reels media spec (codec,
1080 × 1920, fps, duration, size, AAC ≤ 48 kHz, moov first, no edit lists) · caption limits and no secret in it ·
the cover · **not already published** (the ledger) · the simulation is in the library and not a draft · no other
publish running · the configuration · (live) the token works and belongs to `IG_USER_ID` · (live) under the
24-hour limit. Any failure: nothing is posted.

### What a publish does

1. `POST /<IG_USER_ID>/media` with `media_type=REELS`, `upload_type=resumable`, the caption, `share_to_feed`, and
   `cover_url` or `thumb_offset` → a container ID (saved at once).
2. `POST https://rupload.facebook.com/ig-api-upload/<version>/<container>` with `Authorization: OAuth <token>`,
   `offset: 0`, `file_size` and the MP4 bytes.
3. `GET /<container>?fields=status_code` until `FINISHED` (`ERROR` / `EXPIRED` / timeout → PUBLISH_FAILED).
4. `POST /<IG_USER_ID>/media_publish` with `creation_id` → the media ID → PUBLISHED, written to the ledger.
5. `GET /<media>?fields=id,permalink,media_product_type,caption` → VERIFIED with the permalink (retried a few
   times), or VERIFICATION_FAILED.

If step 4 itself fails in a way that may have reached Instagram (a network error or timeout), the attempt is
marked **uncertain** and is never retried blindly. `verify` reads the container: if it is `PUBLISHED`, it finds
the post and records it; if not, the attempt is cleared and a new `publish` is safe.

### Duplicates

`tools/reel-maker/publications.json` (tracked; public facts only: simulation ID, media ID, permalink, times,
reviewer, the reel's sha256, forced or not) records every publication. A simulation that has been published is
refused, even after its reel is regenerated and re-approved. To publish it again on purpose:

```bash
python3 tools/instagram_publish.py publish <ID> --force-republish --confirm-republish <ID> --reason "why"
```

A lock file stops two publishes of the same reel at once.

## 4. Errors and troubleshooting

| Error kind | Meaning | What to do |
|---|---|---|
| `config` / preflight "configuration" | A variable is missing or malformed, or `.env` is readable by others | Fill `.env` from `.env.example`; `chmod 600 .env` |
| `auth` (code 190) | Token invalid or expired | Make a new long-lived token |
| `permission` (code 10, 200–299) | The token lacks the publish permission, or the account has no role on the app | Add `instagram_business_content_publish` (or `instagram_content_publish`); check app roles / App Review |
| `rate_limit` (4, 17, 32, 613, 2207042) | API or the 24-hour publishing limit | Wait; the dry run shows the quota |
| `upload` (9004, 2207026, 2207052) | The upload failed or Instagram rejected the file | Re-run the reel validation; check the spec; retry |
| `processing` | The container ended `ERROR` or `EXPIRED` | Regenerate if the reel changed; otherwise retry the publish |
| `timeout` | Processing took longer than `IG_POLL_TIMEOUT_S` | Run `verify` later; raise the timeout |
| `network` | Could not reach Meta | Retry; if it happened at media_publish, run `verify` first |
| `verification` | Published, but the post could not be confirmed | Run `verify` again; check the account by hand. Never republish to "fix" it |
| `duplicate` | Already published, or a forced republish without confirmation | Only `--force-republish` with confirmation, on purpose |
| `security` | A request outside the official hosts, or a secret about to be written | Never bypass; find where the secret came from |

The publish log is `tools/reel-maker/output/<ID>/publish/publish.log` (git-ignored, redacted).

## 5. Security

- Official API only. The HTTP layer refuses any host except `graph.instagram.com`, `graph.facebook.com` and
  `rupload.facebook.com`, and any non-https URL. No browser automation, Playwright login, passwords, cookies,
  scraping, private or reverse-engineered endpoints.
- The token comes only from the environment or the git-ignored `.env`. It is redacted from every message and
  log; `reel.json`, the ledger and logs are scanned before they are written, and a write that would contain it is
  refused. The caption is scanned too.
- `.gitignore` keeps out `.env*` (except `.env.example`), keys, certificates, `*credentials*.json`,
  `*client_secret*.json`, `*.token` and `tools/reel-maker/output/` (approvals, attempts, logs, locks).
- `tests/test_instagram_publish.py` H5 scans every tracked and new file for tokens and private keys.

## 6. Audio licensing

Every reel's music and effects are PrayogX's own: composed by `tools/reel-maker/music.py`, listed in
`tools/reel-maker/audio_library.json` and recorded per track in `reel.json` → `audio.tracks`. Never use film or film
songs, chart music, trending Instagram audio, YouTube or "free music" downloads, or any track whose commercial
social-media licence cannot be verified. An outside asset can be used only when it is listed with
`licenseVerified: true`, commercial and Instagram use, its sha256 and a licence document kept in the repository;
otherwise the build stops. Instagram labels the sound as original audio.

## 7. First live publish (opt-in)

1. Set up the app, permissions and token (§1–2). Run `python3 tools/instagram_publish.py --reel <ID> --dry-run
   --online`: every item must PASS, including the two live checks.
2. Review and approve the reel yourself, then run `publish`. Watch the console to VERIFIED and open the permalink.
3. If anything fails, read the error kind (§4). Do not retry a media_publish failure without `verify`.

No automated test calls the real API. Real-API testing happens only when the owner runs these commands.
