# Android release readiness

Review date: 2026-09-28, against `main` after commit `ce4e133`.
**Review only: nothing in the Android configuration was changed.**

Sources inspected:

- `app/android/app/build.gradle`, `variables.gradle`, root `build.gradle`,
  `gradle-wrapper.properties`
- `AndroidManifest.xml`, `res/values/strings.xml`, `res/xml/file_paths.xml`
- `app/www/config.js`, `app/www/ads.js`, `app/capacitor.config.json`, `app/package.json`
- the merged release manifest and the existing signed bundle in the git-ignored
  `app/android/app/build/`
- `privacy-policy.html`, the live `https://prayogx.co.in/`, and `docs/DEPLOYMENT.md`

Legend: **READY**, **NEEDS ACTION**, **NOT APPLICABLE YET**.

## Summary

| # | Item | Status |
|---|---|---|
| 1 | Package name / applicationId | READY |
| 2 | targetSdk / compileSdk / minSdk | READY |
| 3 | Build toolchain (AGP, Gradle, Kotlin, JDK, SDK) | READY |
| 4 | `ads.enabled` / `ads.testing` | NEEDS ACTION |
| 5 | AdMob app ID and banner unit | READY |
| 6 | `app-ads.txt` on the developer website | NEEDS ACTION |
| 7 | User consent (UMP) for ads | NEEDS ACTION |
| 8 | Advertising ID declaration | NEEDS ACTION |
| 9 | versionCode / versionName | NEEDS ACTION |
| 10 | Signing configuration and upload key | NEEDS ACTION |
| 11 | Existing signed bundle in `build/` | NEEDS ACTION |
| 12 | Content origin baked into the build | NEEDS ACTION |
| 13 | Privacy policy | NEEDS ACTION |
| 14 | Permissions | READY |
| 15 | Code shrinking (`minifyEnabled`) | READY |
| 16 | Play Console listing, Data safety, content rating, target audience | NEEDS ACTION |
| 17 | Release build process | READY |
| 18 | iOS | NOT APPLICABLE YET |
| 19 | Firebase / google-services.json | NOT APPLICABLE YET |

---

## Details

### 1. Package name: READY
`applicationId "com.prayogx.app"` and `namespace "com.prayogx.app"` in
`app/build.gradle`; `appId` matches in `capacitor.config.json`. **It is permanent once
uploaded to Play. Do not change it.**

### 2. SDK levels: READY
In `variables.gradle`: `compileSdkVersion = 36`, `targetSdkVersion = 36`,
`minSdkVersion = 22`. This meets the Play API-36 floor, and the merged release manifest
confirms `targetSdkVersion="36"`. `production_audit.py` enforces these values.

### 3. Toolchain: READY
AGP 8.10.0, Gradle wrapper 8.11.1, Kotlin Gradle plugin 2.2.0 (matches `kotlin_version`),
Capacitor 6.2.2, `@capacitor-community/admob` 6.2.0, `play-services-ads` 23.0.0.
On this Mac: OpenJDK 17.0.20.1, Android SDK platform `android-36`, and Android Studio are
installed. The existing `build/outputs` shows a release bundle has been built here before.

### 4. `ads.enabled` / `ads.testing`: NEEDS ACTION
`app/www/config.js` has `ads.enabled: true` and `ads.testing: true`. While `testing` is
true, only Google's test unit (`ca-app-pub-3940256099942544/9214589741`) is requested, so a
build shipped like this **earns nothing**. Flipping `testing` to `false` is a deliberate
release decision; see the warning in `config.js` about tapping your own live ads. It only
takes effect in a new store build, because `app/www` is bundled.

### 5. AdMob IDs: READY
The app ID `ca-app-pub-3980851000523907~9663733959` is in `strings.xml`, and
`AndroidManifest.xml` references it through `com.google.android.gms.ads.APPLICATION_ID`.
The production banner unit `ca-app-pub-3980851000523907/6881959261` is in `config.js`.
The publisher ID matches the website's AdSense client (`ca-pub-3980851000523907`).
Whether these units are approved and active can only be confirmed in the AdMob console.

### 6. `app-ads.txt`: NEEDS ACTION
`https://prayogx.co.in/app-ads.txt` returns **404**. AdMob verifies app inventory against
`app-ads.txt` on the developer website listed in the Play Store. Without it, ad serving can
be limited. `https://prayogx.co.in/ads.txt` (for the website's AdSense) is also 404.
Adding either file is a production-site change, so it needs the owner's approval. The line
to use comes from the AdMob / AdSense console.

### 7. Consent (UMP): NEEDS ACTION
`app/www/ads.js` never calls a consent API. Google requires a certified consent message
before serving ads to users in the EEA, the UK and Switzerland. The installed plugin
already exposes `requestConsentInfo` / `showConsentForm`, so this is a JS change in
`ads.js` plus a consent message configured in AdMob → Privacy & messaging. The alternative
is to limit distribution to countries outside those regions in the Play Console. **This is
a decision for the owner.**

### 8. Advertising ID: NEEDS ACTION
The merged release manifest contains `com.google.android.gms.permission.AD_ID` and the
`ACCESS_ADSERVICES_*` permissions, added by `play-services-ads`. The Play Console
"Advertising ID" declaration must say **yes, used for advertising**, and the Data safety
form must match.

### 9. versionCode / versionName: NEEDS ACTION
`versionCode 1`, `versionName "1.0"`. That is fine for a first upload. **If the
2026-09-23 bundle (item 11) was already uploaded to any Play track, the next upload must
be `versionCode 2` or higher.** It is unknown from the repository whether it was uploaded.

### 10. Signing: NEEDS ACTION
- `app/build.gradle` has **no `signingConfigs`**, which is intended: signing happens
  interactively in Android Studio (DEPLOYMENT.md §3). That keeps passwords out of the
  repository. `*.keystore` and `*.jks` are git-ignored.
- **The docs don't match the machine.** DEPLOYMENT.md tells you to use
  `~/prayogx-upload.keystore` with alias `prayogx`. That file does not exist. The key
  actually present is `~/prayogx-upload-key.jks`. The existing bundle's signature files are
  named `PRAYOGX-.SF/.RSA`, which suggests an alias beginning `prayogx-` rather than
  `prayogx`. The alias was not read from the keystore (that needs its password).
- The signing certificate on the existing bundle: `CN=Ankit Chouksey, OU=PrayogX,
  O=PrayogX`, valid until 2054-02-08, SHA-256
  `CC:58:1A:B0:41:DD:DD:B4:12:AB:97:76:DD:0A:36:10:F1:06:24:38:81:49:4B:C8:1F:E8:C1:31:70:0D:6B:55`.
- Actions:
  1. Confirm `~/prayogx-upload-key.jks` is backed up somewhere off this Mac.
  2. Confirm Play App Signing is enabled (Google holds the app signing key, and this is the
     upload key).
  3. Correct the path and alias in DEPLOYMENT.md.

### 11. Existing signed bundle: NEEDS ACTION
`app/android/app/build/outputs/bundle/release/app-release.aab`, built 2026-09-23 13:46,
6.0 MB, signed with the key above. Its bundled `config.js` has the **old origin**
(`chemwithankit.github.io/Prayogx`) and `ads.testing: true`. **Do not upload this file.**
Rebuild after the decisions above. (It still works if installed; it just takes the extra
redirect hop on every request.)

### 12. Content origin: NEEDS ACTION (build step only)
`app/www/config.js` now points at `https://prayogx.co.in` (commit `ba6fd0c`). The copy
inside the Android project (`app/android/app/src/main/assets/public/`, git-ignored) is
refreshed only by `npx cap sync android`. That copy still has the old origin. Running the
sync is the first step of the release build (item 17).

### 13. Privacy policy: NEEDS ACTION
`https://prayogx.co.in/privacy-policy.html` is live (200), last updated 2026-09-22. It covers
the website and the Android app, names Google AdMob, states the audience as 13+, and gives a
contact email. Gaps:

- It does **not mention Google AdSense**, which the website loads.
- It lists AdMob as the only third-party service, so hosting (GitHub Pages) is not named.

The Play Console privacy-policy URL should be the `prayogx.co.in` address. Editing the
policy is a legal/content decision for the owner.

### 14. Permissions: READY
The source manifest declares only `INTERNET`. Everything else in the merged manifest comes
from the ads SDK: `ACCESS_NETWORK_STATE`, `AD_ID`, `ACCESS_ADSERVICES_*`, `WAKE_LOCK`,
`FOREGROUND_SERVICE` and the dynamic-receiver permission. None is a dangerous (runtime)
permission.

Two minor template defaults to note:

- `allowBackup="true"`. The app stores only cached public content, so this is harmless.
- `res/xml/file_paths.xml` exposes `external-path "."` to a non-exported FileProvider that
  the app doesn't use.

### 15. Code shrinking: READY
`minifyEnabled false` in `release`. This is acceptable for a WebView shell with very little
Java/Kotlin, and it isn't a Play requirement. Enabling R8 later is optional; test it first,
because it can strip classes that plugins reach by reflection.

### 16. Play Console items: NEEDS ACTION (outside the repository)
None of these can be checked from the repository; they need to be confirmed in the Play
Console:

- store listing, with the developer website set to `https://prayogx.co.in`
- Data safety form, consistent with items 7, 8 and 13
- content rating questionnaire
- target audience, consistent with the policy's 13+
- ads declaration: "Contains ads" = yes
- the privacy-policy URL

### 17. Release build process: READY (documented, with fixes)
From DEPLOYMENT.md §3, and valid as written apart from the keystore path/alias in item 10:

```bash
cd app && npx cap sync android          # copies app/www (new origin) into the project
npx cap open android                    # Build ▸ Generate Signed App Bundle ▸ release
# or: cd app/android && ./gradlew bundleRelease   (unsigned unless a signingConfig is supplied)
python3 tools/check_library.py && python3 tools/production_audit.py
```

The output goes to `app/android/app/release/app-release.aab` (Studio) or
`app/android/app/build/outputs/bundle/release/` (Gradle). Both are git-ignored. The
Playwright suites that check the app shell (`appcheck_prod.js`, `adsgate.js`,
`edgetoedge.js`) can't currently run on this Mac; see `docs/TESTING_PORTABILITY.md`.

### 18. iOS: NOT APPLICABLE YET
`app/ios` has not been generated (`npx cap add ios`). `capacitor.config.json` already has an
`ios` block. Not in scope for this review.

### 19. Firebase: NOT APPLICABLE YET
`app/build.gradle` applies `google-services` only if `google-services.json` exists, and it
doesn't. No Firebase features are used.

---

## Decisions needed from the owner before a release build

1. **Consent:** implement UMP in `ads.js`, or restrict distribution away from EEA/UK/CH?
2. **Live ads:** when to set `ads.testing` to `false`?
3. **ads.txt / app-ads.txt:** may these be added to the production site (lines from the
   AdMob/AdSense consoles)?
4. **Version:** was `versionCode 1` (the 2026-09-23 bundle) uploaded to any Play track?
5. **Keystore:** is `~/prayogx-upload-key.jks` backed up, and is Play App Signing on?
6. **Privacy policy:** add AdSense (and hosting) to the third-party list?
