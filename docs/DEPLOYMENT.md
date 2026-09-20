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

### Android 16 toolchain — read this before the first build

Since **31 August 2026** Google Play rejects new apps *and updates* that target below
**API 36 (Android 16)**. `app/android/variables.gradle` is therefore set to
`compileSdkVersion = 36` / `targetSdkVersion = 36`. That is a Play floor, not a
preference — do not lower it to make a build error go away.

The Android project Capacitor 6 generated cannot compile against API 36 yet. What it
has, and what API 36 needs:

| Piece | In the repo now | API 36 needs |
|---|---|---|
| Android Gradle Plugin | 8.2.1 | **8.9.1** minimum |
| Gradle wrapper | 8.2.1 | **8.11.1** minimum |
| JDK | — | **17** |
| Android Studio | — | Meerkat 2024.3.1 Patch 1 or newer |

Until the toolchain is raised, `./gradlew` fails at configuration time with
*"the Android Gradle plugin supports only Compile Sdk Versions up to 34"*. Two ways
forward:

**Option A — raise AGP and Gradle in place** (smallest change, keeps `minSdk 22`):

```bash
cd ~/Documents/"Project simulation"/app/android
# 1. AGP: build.gradle -> classpath 'com.android.tools.build:gradle:8.9.1'
# 2. Gradle wrapper:
./gradlew wrapper --gradle-version 8.11.1
# 3. Build on JDK 17 (Android Studio > Settings > Build Tools > Gradle > Gradle JDK)
./gradlew clean assembleDebug
```

AndroidX pins in `variables.gradle` (`androidxCore 1.12.0`, `appcompat 1.6.1`) may need
raising if the build reports a library compiled against a newer SDK.

**Option B — move the platform to Capacitor 8** (what upstream ships for Android 16):

```bash
cd ~/Documents/"Project simulation"/app
npm i @capacitor/core@8 @capacitor/android@8 @capacitor/ios@8 \
      @capacitor/app@8 @capacitor/preferences@8 \
      @capacitor/splash-screen@8 @capacitor/status-bar@8
npm i -D @capacitor/cli@8
npx cap sync android
```

Capacitor 8 ships compileSdk/targetSdk 36, AGP 8.13.0 and Gradle 8.14.3 — but it also
raises **minSdkVersion to 24**, dropping Android 5.0/5.1 devices, and renames
`bridge_layout_main.xml`. Decide on the minSdk before taking this route.

Nothing here touches simulation content: the app shell fetches the same published feed
either way, so a toolchain change needs no content rebuild and no revision bump.

---

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
