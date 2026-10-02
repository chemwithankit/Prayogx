# YouTube Shorts publishing

`tools/youtube_publish.py` uploads an **approved** PrayogX reel to YouTube as a Short, through the official
**YouTube Data API v3** only. It is the same validated `tools/reel-maker/output/<ID>/reel.mp4`, byte for byte,
with its original PrayogX music and effects; nothing is re-encoded and no other audio is added. Nothing goes to
YouTube unless a person runs the upload with `--youtube` (or `youtube_publish.py publish`) and a stated privacy.

> **Status (2026-10-02): configured and in use, private only.** The owner signed in to the PrayogX channel and
> uploaded Q15 as a private Short (`QL5Wb8jtLME`, VERIFIED). Uploads stay private until the Google Cloud project
> passes YouTube's API audit. The test suite (`tests/test_youtube_publish.py`, 70 checks) uses a mocked API only.

## 1. What Google requires (checked against Google's documentation on 2026-10-02)

| Topic | Current rule |
|---|---|
| Upload | `videos.insert` through the resumable protocol: `POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status` (headers `X-Upload-Content-Length`, `X-Upload-Content-Type`), then `PUT` the bytes to the session URI; `201`/`200` with the video resource when done; after an interruption `PUT` with `Content-Range: bytes */<size>` returns `308` and a `Range` header to resume from. |
| Quota | `videos.insert` costs **1 unit in the "Video Uploads" quota bucket**; `thumbnails.set` about 50 units; `videos.list`, `channels.list`, `playlistItems.list` 1 unit each. See your project's quotas in Google Cloud. |
| **Audit** | **Videos uploaded through `videos.insert` from unverified API projects created after 28 July 2020 are restricted to private viewing.** To publish public (or unlisted) videos through the API, the project must pass YouTube's API compliance audit. Until then, use private and change the visibility in YouTube Studio by hand. |
| OAuth | Desktop ("installed") app: Google's consent page in the system browser and a **loopback redirect to `http://127.0.0.1:<port>`** with **PKCE (S256)**. The old copy-and-paste (OOB) flow is no longer supported. Desktop clients cannot keep a secret confidential; it is still kept out of git. |
| Refresh tokens | A project whose OAuth consent screen is **External** and in **Testing** status gets refresh tokens that **expire after 7 days**: run `auth` again, or publish the consent screen to Production. Tokens also stop working after 6 months unused, on revocation or a password change. |
| Scopes | `youtube.upload` (upload, thumbnails) and `youtube.readonly` (read the channel and the video back to verify); `youtube.force-ssl` only when a playlist is configured. |
| Shorts | **Square or vertical videos up to 3 minutes** are Shorts (for uploads since 15 October 2024). No `#Shorts` tag is required, and the publisher adds none. PrayogX reels are 1080 × 1920, 20–40 s. |
| Metadata | Title ≤ 100 characters, description ≤ 5,000 bytes, neither may contain `<` or `>`; tags ≤ 500 characters in total (commas count). |
| Status | `uploadStatus`: uploaded, processed, failed, rejected, deleted (with `failureReason` / `rejectionReason`); `privacyStatus`: private, unlisted, public; `selfDeclaredMadeForKids`, `containsSyntheticMedia` are set on upload. |
| Thumbnails | `thumbnails.set` (`POST https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=…`): JPEG or PNG ≤ 50 MB. Google's page says nothing about Shorts; custom thumbnails may need a verified channel. The publisher tries the PrayogX thumbnail and records "not set (reason)" if YouTube refuses - it never fails the upload for it. |

## 2. One-time setup

1. In **Google Cloud Console**: create (or pick) a project, enable **YouTube Data API v3**, configure the **OAuth
   consent screen** (add your Google account as a test user while it is in Testing), and create an **OAuth client
   ID** of type **Desktop app**.
2. Put its values in `.env` (git-ignored; `chmod 600 .env`):

   | Variable | Meaning |
   |---|---|
   | `YT_CLIENT_ID`, `YT_CLIENT_SECRET` | the Desktop OAuth client |
   | `YT_CHANNEL_ID` | the target channel (`UC…`); `auth` prints it |
   | `YT_TOKEN_FILE` | where the refresh token is kept (default `~/.config/prayogx/youtube-token.json`, mode 600, outside the repository - inside it is refused) |
   | `YT_DEFAULT_PRIVACY` | `private` (default) - used by the dry run; an upload always needs `--privacy` |
   | `YT_CATEGORY_ID` | optional (27 = Education); empty = YouTube's default |
   | `YT_PLAYLIST_ID` | optional: add each upload to this playlist (asks for the `youtube.force-ssl` scope) |
   | `YT_PROJECT_AUDITED` | set `true` only after Google has approved the project's audit - public uploads are refused otherwise |
   | `YT_MADE_FOR_KIDS`, `YT_NOTIFY_SUBSCRIBERS`, `YT_SET_THUMBNAIL` | `false`, `false`, `true` by default |

3. Sign in once:

   ```bash
   python3 tools/youtube_publish.py auth
   ```

   Your browser opens Google's consent page; after you allow it, the page on `127.0.0.1` says the sign-in was
   received. Only the refresh token is stored (never printed or logged); the channel name and ID are shown.

## 3. The workflow

The approval is the **same** one as for Instagram (one approval system, bound to the sha256 of the validated
`reel.mp4`, `thumbnail.jpg` and `caption.txt`); if any of them changes, the approval is void for both platforms.

```bash
python3 tools/publish.py review  ADV-2026-P1-PHY-Q15                  # watch it with sound
python3 tools/publish.py approve ADV-2026-P1-PHY-Q15 --reviewer "Ankit"
python3 tools/youtube_publish.py metadata ADV-2026-P1-PHY-Q15         # YouTube's own title, description, tags
python3 tools/youtube_publish.py publish  ADV-2026-P1-PHY-Q15 --dry-run --online
python3 tools/youtube_publish.py publish  ADV-2026-P1-PHY-Q15 --privacy private
python3 tools/youtube_publish.py verify   ADV-2026-P1-PHY-Q15 [--wait]
python3 tools/publish.py status ADV-2026-P1-PHY-Q15                   # Instagram and YouTube side by side
```

Choosing destinations explicitly (an approval is never "publish everywhere"):

```bash
python3 tools/publish.py publish ADV-2026-P1-PHY-Q15 --youtube --privacy private
python3 tools/publish.py publish ADV-2026-P1-PHY-Q15 --instagram
python3 tools/publish.py publish ADV-2026-P1-PHY-Q15 --instagram --youtube --privacy unlisted
python3 tools/publish.py publish ADV-2026-P1-PHY-Q15 --instagram --youtube --dry-run --online
```

`publish.py publish` without `--instagram`/`--youtube` is refused, and so is a YouTube upload without `--privacy`.
Each platform runs on its own; a failure on one never marks or blocks the other.

**Public**: `--privacy public --confirm-public <ID>`, and only with `YT_PROJECT_AUDITED=true`. If YouTube still
keeps the video private (the audit lock or a policy), verification reports VERIFICATION_FAILED with that reason -
it is never reported public.

### Metadata

`metadata` writes `tools/reel-maker/output/<ID>/youtube.json` from the registry and the reel story: the
simulation's short title plus "| JEE Advanced <year> <subject> Q<n>", a description with the story's hook, what the
experiment is, the link to `https://prayogx.co.in/s/<ID>/` and "Music and sound effects: original, made by PrayogX",
three of the story's hashtags, and tags from the registry. It never gives the answer. Edit the file to change it;
the dry run shows exactly what will be sent, and the upload records the metadata's sha256. `--regenerate` rebuilds it.

### States (`reel.json` → `platforms.youtube`, separate from Instagram's `status`)

```
PUBLISHING → PUBLISHED (uploaded, video ID known) → VERIFIED
     │              │
PUBLISH_FAILED   VERIFICATION_FAILED          UPLOAD_STATUS_UNKNOWN (no reply; verify first)
```

- **VERIFIED** only when `videos.list` returns our video on `YT_CHANNEL_ID` with the same title and description,
  the privacy asked for, and `uploadStatus` **processed**. Still processing after `YT_POLL_TIMEOUT_S` → stays
  PUBLISHED with a note; run `verify` (or `verify --wait`) later.
- **Interrupted upload**: the publisher asks the session how far it got (`308` + `Range`) and resumes from that
  byte (up to 4 times). If neither the upload nor the session answers, the state is **UPLOAD_STATUS_UNKNOWN** and a
  new upload is refused until `verify`, which looks for the video in the channel's uploads (same title, after
  the attempt): found → PUBLISHED → verified; not found → PUBLISH_FAILED (a new upload is then safe).
- **Duplicates**: a reel already PUBLISHED / VERIFIED on YouTube (state or ledger) is refused;
  `--force-reupload --confirm-reupload <ID> --reason "…"` re-uploads on purpose and is recorded as forced.

### The publication record

`tools/reel-maker/publications.json` gets one entry per upload with `"platform": "youtube"`: `videoId`, `url`
(`https://www.youtube.com/shorts/<id>`), `privacyStatus`, `status`, `publishedAt`, `verifiedAt`, the reel's sha256,
the reviewer and whether it was forced. Instagram entries have no `platform` field (or `"instagram"`); each
platform's duplicate check reads only its own entries. No token is ever stored there or in `reel.json`.

## 4. Errors and troubleshooting

| Kind | Meaning | What to do |
|---|---|---|
| `config` | A `YT_` variable is missing or malformed; the token file is missing, readable by others or inside the repo | Fill `.env`; `chmod 600`; run `auth` |
| `auth` | Refresh token expired or revoked (`invalid_grant`; 7 days in OAuth Testing), or 401 | `python3 tools/youtube_publish.py auth` |
| `permission` | 403: wrong channel, missing scope, or the account cannot upload | Check the account and channel; run `auth` again |
| `quota` | `quotaExceeded`, `uploadLimitExceeded`, rate limits | Wait (daily quotas reset at midnight Pacific) or ask for more quota |
| `metadata` | YouTube refused the title, description, tags or category | Edit `youtube.json`; the dry run checks the limits |
| `network` | No connection or a 5xx | Re-run; an interrupted upload resumes; an unknown state needs `verify` first |
| VERIFICATION_FAILED "kept it private" | Public asked for, private returned | The project is not audited (or a policy lock): keep private, or finish the audit |
| thumbnail "not set" | YouTube refused the custom thumbnail | Often a channel that is not verified for custom thumbnails, or a Short; the upload itself stands |

Logs: `tools/reel-maker/output/<ID>/publish/publish.log` (git-ignored, redacted).

## 5. Security

- Official endpoints only: requests may go only to `oauth2.googleapis.com` and `www.googleapis.com` (sign-in opens
  `accounts.google.com` in your own browser). No browser automation, YouTube Studio, cookies, passwords or private
  endpoints.
- The client secret stays in `.env`; the refresh token in `YT_TOKEN_FILE` (mode 600, outside the repo); the access
  token only in memory. Every message is redacted (`ya29.…`, `1//…`, `GOCSPX-…`, `Authorization: Bearer …`), and
  `reel.json`, `youtube.json` and the ledger are scanned before they are written.
- `.gitignore` keeps out `.env*`, `*client_secret*.json`, `*credentials*.json`, `*.token`, `*youtube-token*`.
- `tests/test_youtube_publish.py` J5 scans every tracked and new file for Google tokens and client secrets.

## 6. Audio and copyright

The upload is the approved `reel.mp4` itself: its music is PrayogX's own score and its effects PrayogX's own
synthesis (`tools/reel-maker/audio_library.json`, `permittedUse` includes `youtube`). The preflight re-checks that
provenance; no YouTube library music or other audio is ever added. Content ID should find nothing to claim.

## 7. Tests

`tests/test_youtube_publish.py`: mocked Google API and a fake browser for the sign-in - configuration, OAuth
(PKCE, loopback, state check, token storage), approval and hash binding, metadata, dry run, destinations, a
successful upload, quota/auth/upload failures, resume after interruption, the unknown state and its resolution,
verification (processing, mismatch, rejection), duplicates and forced re-upload, privacy (unlisted, public and the
audit lock), and secret scans. **Real API tests are opt-in**: `RUN_REAL_YOUTUBE_TESTS=1` runs the read-only live
check (token and channel); the suite never uploads - a real private upload is a command you run yourself.

## 8. First real use (private)

```bash
python3 tools/youtube_publish.py auth
python3 tools/youtube_publish.py publish ADV-2026-P1-PHY-Q15 --dry-run --online
python3 tools/youtube_publish.py publish ADV-2026-P1-PHY-Q15 --privacy private
python3 tools/youtube_publish.py verify ADV-2026-P1-PHY-Q15 --wait
```

Open the Short in YouTube Studio, check it, and change its visibility there by hand until the project is audited.
