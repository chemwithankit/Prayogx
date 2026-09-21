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

### Android 16 toolchain — what is already done, and what you must do once

Since **31 August 2026** Google Play rejects new apps *and updates* below **API 36
(Android 16)**. The project therefore sets `compileSdkVersion = 36` and
`targetSdkVersion = 36` in `app/android/variables.gradle`. That is a Play floor, not a
preference — never lower it to clear a build error.

Capacitor 6 generated this project against AGP 8.2.1, which caps `compileSdk` at 34.
The toolchain has been raised to the smallest combination that supports API 36, keeping
**Capacitor 6** and **minSdkVersion 22**:

| Piece | Was | Now | Why this one |
|---|---|---|---|
| Android Gradle plugin | 8.2.1 | **8.10.0** | 8.9.1 is the first AGP that compiles API 36; 8.10 is the last line that still runs on Gradle 8.11.1 |
| Gradle wrapper | 8.2.1 | **8.11.1** | AGP 8.10's minimum. AGP 8.11+ would force Gradle 8.13 |
| JDK | — | **17** (21 also fine) | every AGP 8.x requires 17 or newer |
| compileSdk / targetSdk | 35 / 35 | **36 / 36** | the Play floor |
| minSdkVersion | 22 | **22** | unchanged; nothing above required raising it |
| Capacitor | 6.2.x | **6.2.x** | unchanged |
| AndroidX pins | — | unchanged | a library compiled against an *older* SDK than yours is fine; only the reverse errors |

`production_audit.py` now enforces all of this, so a later `cap sync` or a
"just-make-it-build" edit cannot quietly drop the project below the floor.

**One note on `node_modules`.** Every Capacitor 6 module still declares
`classpath 'com.android.tools.build:gradle:8.2.1'` in its own `buildscript` block. Leave
them alone. Gradle's buildscript classloaders delegate parent-first, so the root pin
above is the AGP every subproject actually applies — which is why Capacitor's own upgrade
guidance only ever mentions the root file.

`android/capacitor-cordova-android-plugins/` is gitignored — Capacitor's own template
does that, because `cap sync` recreates it. Its copy of the pin was raised here too, but
treat that as cosmetic: on a fresh clone it comes back at whatever Capacitor shipped, and
`production_audit.py` reports the mismatch as a note rather than a failure for exactly
that reason. **`android/build.gradle` is the pin that matters and the only one under
version control.**

#### What you must do once, on this Mac

These are machine settings, not repository changes, so they are not committed:

1. **Point Gradle at JDK 17 or newer.** Android Studio ▸ Settings ▸ Build, Execution,
   Deployment ▸ Build Tools ▸ Gradle ▸ **Gradle JDK**. The JetBrains Runtime bundled
   with recent Android Studio is already 17+. Check what a terminal build would use:

   ```bash
   java -version        # must report 17 or higher, or set JAVA_HOME
   ```

2. **Install the API 36 platform.** Android Studio ▸ Settings ▸ Languages & Frameworks ▸
   Android SDK ▸ **SDK Platforms** ▸ *Android 16.0 (API 36)*, and under **SDK Tools**
   ▸ *Android SDK Build-Tools 36*. Or:

   ```bash
   sdkmanager "platforms;android-36" "build-tools;36.0.0"
   ```

3. **Android Studio Meerkat 2024.3.1 Patch 1 or newer** — older versions will not open
   an AGP 8.10 project.

4. **Regenerate the wrapper scripts** (optional but tidy — only the distribution URL was
   edited by hand, which is enough to run, but this refreshes `gradlew` and the jar):

   ```bash
   cd ~/Documents/"Project simulation"/app/android
   ./gradlew wrapper --gradle-version 8.11.1 --distribution-type all
   ```

   Careful: this rewrites `gradle-wrapper.properties` from scratch and resets
   `networkTimeout` to the 10 s default, which is not long enough to start the
   download on a slow link. Put `networkTimeout=120000` back afterwards -
   `production_audit.py` will tell you if you forget.

Then the first real build, which is also the first check that any of this works:

```bash
cd ~/Documents/"Project simulation"/app
npm install                      # node_modules is not in the repo
npx cap sync android
cd android
./gradlew --version              # confirm Gradle 8.11.1 on JDK 17+
./gradlew clean assembleDebug
```

#### If it fails

| Symptom | Cause | Fix |
|---|---|---|
| `Android Gradle plugin requires Java 17 to run. You are currently using Java 11.` | Gradle JDK setting | step 1 above |
| `Failed to find Platform SDK with path: platforms;android-36` | platform not installed | step 2 above |
| `Minimum supported Gradle version is 8.11.1` | wrapper not picked up | delete `~/.gradle/caches/`, re-run |
| `Could not resolve com.android.tools.build:gradle:8.10.0` | offline / proxy | you need network to `maven.google.com` |
| `SocketTimeoutException` / `ConnectException` while downloading `gradle-8.11.1-all.zip` | the wrapper's connect timeout, or the download host | the timeout is already 120 s in `gradle-wrapper.properties`. If it still fails, see the next section - `curl -I https://services.gradle.org` returning 200 does not mean the download will work |
| `Java heap space` during dexing | `org.gradle.jvmargs=-Xmx1536m` is tight for AGP 8.10 | raise it in `app/android/gradle.properties` |
| A named AndroidX library "requires a higher compileSdk" | only happens if a dependency was compiled against 37+ | raise **that one** pin in `variables.gradle`, not all of them |

#### If the distribution download will not go through

`services.gradle.org` does not serve the zip itself - it answers with a redirect, and the
download comes from another host. So `curl -I https://services.gradle.org` returning 200
proves nothing: the first hop is fine and the second one is what fails. A stack trace with
`HttpURLConnection.followRedirect0` in it above the `ConnectException` is saying exactly
that. Find out where it is being sent:

```bash
curl -sSIL https://services.gradle.org/distributions/gradle-8.11.1-all.zip \
  | grep -iE '^HTTP|^location'
```

If curl follows it to the end, curl can fetch what Java cannot, and you can hand the
wrapper the file directly. **Prime the wrapper cache.** Gradle looks for the zip in a
directory named after a Base36 MD5 of the distribution URL, so the path is not guessable -
for the URL this project pins it is:

```bash
DIST=~/.gradle/wrapper/dists/gradle-8.11.1-all/2qik7nd48slq1ooc2496ixf4i
mkdir -p "$DIST"
curl -L -o "$DIST/gradle-8.11.1-all.zip" \
  https://services.gradle.org/distributions/gradle-8.11.1-all.zip

# worth checking before you run 200 MB of downloaded code
curl -sL https://services.gradle.org/distributions/gradle-8.11.1-all.zip.sha256
shasum -a 256 "$DIST/gradle-8.11.1-all.zip"

cd ~/Documents/"Project simulation"/app/android && ./gradlew --version
```

The wrapper finds the zip, unpacks it and never touches the network. Verified against this
project's own `gradle-wrapper.jar` in a sandbox with no route to `gradle.org` at all: it
printed no `Downloading` line and made no connection.

That hash is derived from the URL string, so **if `distributionUrl` ever changes, the
directory name changes with it** and the cache has to be primed again under the new name.

If curl cannot follow the redirect either, the block is in your network or DNS rather than
in Java, and no wrapper setting will fix it - use a different connection, or fetch the zip
elsewhere and copy it into the path above.

Android Studio is a separate escape route: it downloads distributions through its own HTTP
stack and proxy settings, and **Settings ▸ Build Tools ▸ Gradle ▸ Use Gradle from:
Specified location** bypasses the wrapper download entirely if you already have 8.11.1
unpacked somewhere.

#### Edge-to-edge, and how the app handles it

Android 16 makes **edge-to-edge compulsory** for anything targeting API 36:
`windowOptOutEdgeToEdgeEnforcement` is dead, and the WebView fills the whole screen,
status bar and navigation bar included. Capacitor 6 has no insets handling of its own -
that arrived in Capacitor 7 - so without help the app header would sit under the clock
and the tab bar under the gesture pill.

The shell already knew how to keep clear of them. `app/www/app.css` reads four custom
properties, `--safe-t`, `--safe-b`, `--safe-l` and `--safe-r`, and every surface that
touches an edge is padded by them: the header, the search row, the viewer bar, the tab
bar, the simulation frame, the filter sheet, the toast. On iOS those resolve to
`env(safe-area-inset-*)` and always have. Android WebView does not report the system bars
through `env()` - only display cutouts - so the only thing missing was the values.

`MainActivity.java` supplies them: one `ViewCompat.setOnApplyWindowInsetsListener` on the
bridge's WebView, reading `systemBars() | displayCutout()`, writing the four properties
into the page, re-published on every page load so the first paint is never unpadded.

What it deliberately does not do is move, pad or resize the WebView. The WebView stays
full-bleed, so the header's own colour paints under the status bar and the tab bar's
colour under the navigation bar, following the in-app light/dark switch for free. That is
what edge-to-edge is meant to look like.

`tests/edgetoedge.js` drives the real shell in a browser with real inset values, portrait
and landscape, and checks that nothing is covered and everything is still clickable.
`production_audit.py` pins the seam: the properties the native side writes must be the
ones the CSS reads, and no rule may override a side inset with a bare pixel padding.

**Still worth a look on a real device**, because neither can be checked from here:

- **Status bar icon contrast.** `capacitor.config.json` pins `StatusBar.style: "DARK"`,
  which means light icons. That was right when the bar had its own `#0d1524` background -
  but `StatusBar.backgroundColor` is a no-op on Android 15+, so the icons now sit on the
  header's colour, which is white in light mode. If they disappear, the fix is to let the
  icons follow the theme rather than pinning them; leave the config alone if you do it,
  since `style` is shared with iOS.
- **The software keyboard.** The listener reads system bars, not the IME. Tapping search
  with the keyboard up is worth one check.

Nothing here touches simulation content: the app shell fetches the same published feed,
so a toolchain change needs no content rebuild and no revision bump.

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
