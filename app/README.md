# PrayogX mobile shell — Android and iOS

**This folder contains no simulations and no catalogue.** It is a native-feeling
client for the same published content feed the website reads. Add a simulation to
`data/manifest.json`, run `./publish.sh`, and it appears in every installed app on
the next launch — no rebuild, no store release.

```
data/manifest.json ──► tools/build_content.py ──► content/  ──► GitHub Pages
                                                                    │
                                    ┌───────────────┬───────────────┤
                                 website          PWA          this app
```

## How it works

- `www/config.js` holds one line: the origin to read content from.
- The app fetches `content/catalog.json` on launch and on resume. If the feed
  version has not changed, it stops there — one small request.
- `content/index.json` is kept in `localStorage`, so the app opens instantly and
  works with no connection at all.
- A simulation is **one self-contained HTML file**, so the app fetches it and
  renders it with `srcdoc`. That is why an opened simulation keeps working
  offline, and why not a line of simulation code lives in the bundle.
- Opened simulations are stored in IndexedDB, newest `offlineCap` kept (30).
- `CapacitorHttp` is enabled, so requests go out natively and the content host is
  never asked for CORS headers.

## Content updates and store policy

The app downloads **data** — JSON and HTML rendered in a WebView — never
executable native code, and the app's own behaviour does not change. That is the
distinction both stores draw, and it is why the library can grow without a
resubmission.

## First-time setup

```bash
cd app
npm install
npx cap sync
```

`app/android/` is committed. `app/ios/` is not, because generating it requires
macOS:

```bash
npx cap add ios      # run this once, on your Mac
npx cap sync ios
```

## Android — build an AAB for Play

Requires Android Studio and JDK 17.

```bash
cd app
npx cap sync android
npx cap open android            # opens Android Studio
```

In Android Studio:

1. **Build ▸ Generate Signed Bundle / APK ▸ Android App Bundle**
2. Create a keystore the first time and **keep it safe** — Play ties the app to it
   forever. Store it outside this repository; `*.keystore` and `*.jks` are
   gitignored so it is never committed by accident.
3. Choose the `release` build variant.
4. The bundle lands in `app/android/app/release/app-release.aab`.

Command line instead:

```bash
cd app/android
./gradlew bundleRelease
```

Set the version for each release in `app/android/app/build.gradle`
(`versionCode` must increase every upload, `versionName` is what people see).

Application ID: `com.prayogx.app`

## iOS — build an archive for the App Store

Requires macOS, Xcode 15+ and an Apple Developer account.

```bash
cd app
npx cap add ios                 # first time only
npx cap sync ios
npx cap open ios                # opens Xcode
```

In Xcode:

1. Select the **App** target ▸ **Signing & Capabilities**, choose your team.
   Bundle identifier: `com.prayogx.app`.
2. Set **Version** and **Build** (Build must increase every upload).
3. Choose **Any iOS Device (arm64)** as the destination.
4. **Product ▸ Archive**, then **Distribute App ▸ App Store Connect**.

Safe areas are already handled in `www/app.css` through `env(safe-area-inset-*)`,
and the viewport uses `viewport-fit=cover`.

## Icons and splash

Put a 1024×1024 `icon.png` and a 2732×2732 `splash.png` in `app/resources/`, then:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate
```

That writes every density for both platforms. The placeholder icons currently in
`site/icons/` are the website's; replace them with real artwork before you ship.

## Pointing the app at a different deployment

Change `origin` in `www/config.js` and run `npx cap sync`. Nothing else in the app
knows a URL.

## Testing

`tools/` has no mobile test, but the shell is plain web code and is tested in a
browser at phone size — 20 assertions covering the feed load, the native list and
tab bar, filters, search, the detail screen, opening a real simulation, storing it
for offline use, back navigation, and running with the content host unreachable.
Re-run it after changing `www/`.
