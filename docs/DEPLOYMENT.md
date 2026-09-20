# PrayogX — production deployment

One canonical library, four clients. Nothing below duplicates simulation content.

```
data/manifest.json  ──►  tools/build_content.py  ──►  content/  ──►  GitHub Pages
      (you edit this)          (generated)                               │
                                                     ┌──────────┬────────┴────────┐
                                                  Website      PWA           Mobile app
                                                                          Android + iOS
```

---

## 0. The only workflow you need day to day

Adding a simulation, or revising one, is always these steps and nothing else:

```bash
cd ~/Documents/"Project simulation"

# 1. create simulations/<year>/<paper>/<subject>/<slug>/{index.html,meta.json,question.md}
# 2. add or update that meta.json object in data/manifest.json
#    — a REVISED simulation must have its `revision` incremented, or the check fails

./publish.sh "Add ADV-2026-P2-CHE-Q18"
```

`publish.sh` runs, in order: `sync_manifest.py` → `build_content.py` → `check_library.py`,
and refuses to push if anything is stale or broken. GitHub Actions then re-runs the whole
pipeline and refuses to deploy if what you committed does not match what the tools produce.

Within about a minute the new simulation is live on the website, the PWA, the iOS app and
the Android app. **No app rebuild, no store release.**

---

## 1. Web and PWA — GitHub Pages

```bash
cd ~/Documents/"Project simulation"
git checkout main
./publish.sh                       # validate, commit, push
```

Then watch the deploy: <https://github.com/chemwithankit/Prayogx/actions>

Production URL: <https://chemwithankit.github.io/Prayogx/>

**One-time settings check** — GitHub → repo → Settings → Pages → Source must be
**GitHub Actions** (not "Deploy from a branch").

Verify after a deploy:

```bash
curl -sI https://chemwithankit.github.io/Prayogx/content/catalog.json | head -1
curl -s  https://chemwithankit.github.io/Prayogx/content/catalog.json | head -c 200
```

---

## 2. Mobile — first-time setup

```bash
cd ~/Documents/"Project simulation"/app
npm install
npx cap sync
```

`app/www/config.js` holds the one line that points the apps at the content host. Change it
only if you move the site.

### Add the platforms

```bash
cd ~/Documents/"Project simulation"/app
npx cap add ios          # macOS only — generates app/ios/, run once
npx cap add android      # already committed; only needed on a fresh clone
npx cap sync
```

### After ANY change to app/www

```bash
cd ~/Documents/"Project simulation"/app
npx cap sync
```

Adding or revising a **simulation** needs none of this — that is content, not app code.

---

## 3. Android — signed AAB for Play

```bash
cd ~/Documents/"Project simulation"/app
npx cap sync android
npx cap open android            # opens Android Studio
```

**First release only — create the upload keystore** and keep it somewhere safe and backed
up. Play ties the app to it permanently; losing it means you cannot update the app.

```bash
keytool -genkey -v -keystore ~/prayogx-upload.keystore \
  -alias prayogx -keyalg RSA -keysize 2048 -validity 10000
```

Store it **outside** the repository. `*.keystore` and `*.jks` are gitignored, but do not
rely on that.

In Android Studio:

1. **Build ▸ Generate Signed App Bundle / APK ▸ Android App Bundle ▸ Next**
2. Choose `~/prayogx-upload.keystore`, enter the passwords, alias `prayogx`
3. Build variant **release** ▸ **Create**
4. The bundle lands at `app/android/app/release/app-release.aab`

Command line alternative:

```bash
cd ~/Documents/"Project simulation"/app/android
./gradlew bundleRelease
```

**Every upload must increase `versionCode`** in `app/android/app/build.gradle`:

```gradle
versionCode 2          // must be higher than the last upload
versionName "1.0.1"    // what users see
```

---

## 4. iOS — archive for TestFlight and the App Store

```bash
cd ~/Documents/"Project simulation"/app
npx cap sync ios
npx cap open ios                # opens Xcode
```

In Xcode:

1. Select the **App** target ▸ **Signing & Capabilities**
   - Team: your Apple Developer team
   - Bundle Identifier: `com.prayogx.app`
   - Automatically manage signing: on
2. **General ▸ Identity**: set **Version** (e.g. `1.0`) and **Build** (must increase every
   upload)
3. Destination: **Any iOS Device (arm64)** — archiving is disabled for a simulator target
4. **Product ▸ Archive**
5. In the Organizer: **Distribute App ▸ App Store Connect ▸ Upload**

Safe areas, the 16 px inputs that stop iOS zooming, and swipe-back mapped to history are
already handled in `app/www/app.css` and `app.js`.

---

## 5. App icons and splash screens

The icons currently in `site/icons/` are flat placeholder tiles. Before shipping to either
store, put real artwork in `app/resources/` and generate every density:

```bash
cd ~/Documents/"Project simulation"/app
mkdir -p resources
# resources/icon.png    1024x1024, no transparency, no rounded corners
# resources/splash.png  2732x2732, artwork centred in the middle third
npm i -D @capacitor/assets
npx capacitor-assets generate
npx cap sync
```

---

## 6. Release checklist

Run before every store submission:

```bash
cd ~/Documents/"Project simulation"
python3 tools/check_library.py        # library is coherent
python3 tools/production_audit.py     # single-source promise holds
```

Both must exit 0.

---

## 7. What needs a store release, and what does not

| Change | Store release? |
|---|---|
| New simulation | **No** — push the site |
| Revised simulation (revision bumped) | **No** — push the site |
| Catalogue metadata, tags, chapters | **No** — push the site |
| Website or PWA code | **No** — push the site |
| `app/www/*` (the mobile shell itself) | **Yes** |
| Capacitor plugins, native config, icons | **Yes** |

Content updates are data — JSON and HTML rendered in a WebView — never executable native
code, and the app's own behaviour does not change. That is the distinction both stores
draw.

---

## 8. Rollback

The feed is generated, so rolling back content is a git revert:

```bash
git revert <commit>
./publish.sh
```

Every client notices because `content/catalog.json` carries a new version and each
simulation carries its `revision`.
