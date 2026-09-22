/* ==========================================================================
   AdMob banner — Android only, library screen only.

   WHY THIS FILE EXISTS AT ALL
   The banner is a NATIVE view. @capacitor-community/admob adds it to the
   activity's root CoordinatorLayout with Gravity.BOTTOM, so it floats OVER
   the WebView; nothing resizes the web layer. Left alone it would sit on top
   of the tab bar. The plugin does report its height, so this file feeds that
   height into --adh, and app.css lifts every bottom edge by it — the same
   shape as --safe-b, which is why no layout rule had to be rewritten.

   NO IMPORT, NO BUNDLER
   Capacitor registers every plugin on window.Capacitor.Plugins at runtime, so
   this stays a plain ES5 script and the app keeps its no-build-step promise.

   TO TURN ADS OFF
   Set ads.enabled to false in config.js. Nothing native has to change and
   every function below becomes a no-op. Removing the feature entirely is this
   file, its <script> tag, four calls in app.js and --adh in app.css.
   ========================================================================== */
(function () {
  "use strict";

  var CFG  = (window.PRAYOGX && window.PRAYOGX.ads) || {};
  var LIVE = false;   /* a native AdView exists and has loaded */
  var WANT = false;   /* the library — not the viewer — is on screen */
  var UP   = false;   /* start() has run */

  /* Null unless this really is the Android app with the plugin present and the
     feature switched on. Every entry point begins here, which is what makes
     browser testing, the website and a disabled config all no-ops. */
  function admob() {
    var C = window.Capacitor;
    if (CFG.enabled !== true) return null;
    if (!C || !C.Plugins || !C.Plugins.AdMob) return null;
    if (typeof C.getPlatform === "function" && C.getPlatform() !== "android") return null;
    return C.Plugins.AdMob;
  }

  /* Testing is the default in both directions: the production unit is used
     only when ads.testing is explicitly false. Tapping your own live ads is
     what gets an AdMob account suspended. */
  function testing() { return CFG.testing !== false; }
  function unit() { return testing() ? CFG.testBannerId : CFG.bannerId; }

  function adh(px) {
    var n = (typeof px === "number" && px > 0) ? Math.round(px) : 0;
    try { document.documentElement.style.setProperty("--adh", n + "px"); } catch (e) {}
  }

  /* Several of the plugin's calls reject by design — hideBanner() rejects with
     "you tried to hide a banner that was never shown" — and one never settles
     at all (showBanner returns early when an AdView already exists). So every
     call is fire-and-forget with its rejection swallowed, and nothing in the
     app is ever chained onto one. */
  function hush(p) {
    if (p && typeof p.catch === "function") p.catch(function () {});
  }

  function raise() {
    var A = admob();
    if (!A || !WANT || !unit()) return;
    if (LIVE) { hush(A.resumeBanner()); return; }
    hush(A.showBanner({
      adId: unit(),
      adSize: "ADAPTIVE_BANNER",
      position: "BOTTOM_CENTER",
      margin: 0,
      isTesting: testing()
    }));
  }

  function start() {
    var A = admob();
    if (!A || UP) return;
    UP = true;

    /* The height arrives on the way up AND on the way down: the plugin reports
       0 on hide, on failure and on removal. Guarding on WANT closes the one
       race that matters — an ad that finishes loading after the viewer has
       already opened must not pad a layout whose banner is hidden. */
    hush(A.addListener("bannerAdSizeChanged", function (info) {
      adh(WANT ? (info && info.height) : 0);
    }));
    hush(A.addListener("bannerAdLoaded", function () { LIVE = true; }));

    /* A failed request destroys the native AdView, so the next show() has to
       build a new one. No timer, no retry: a failure costs the user nothing
       and a retry loop would cost them battery. */
    hush(A.addListener("bannerAdFailedToLoad", function () { LIVE = false; adh(0); }));

    WANT = true;
    var boot = A.initialize({ initializeForTesting: testing() });
    if (boot && typeof boot.then === "function") boot.then(raise, function () {});
    else raise();
  }

  function show() {
    if (!admob()) return;
    WANT = true;
    raise();
  }

  function hide() {
    WANT = false;
    adh(0);                       /* immediately, so the layout never lags */
    var A = admob();
    if (A) hush(A.hideBanner());
  }

  window.PrayogXAds = { start: start, show: show, hide: hide };
})();
