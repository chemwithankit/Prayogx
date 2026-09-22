/* ==========================================================================
   Where the app gets its content.

   The app bundle contains NO simulations and NO catalogue. Both are fetched
   from the same published feed the website serves, so adding a simulation to
   data/manifest.json and deploying makes it appear in the installed app with
   no rebuild and no store release. Content is data, never executable code,
   which is what keeps remote updating inside App Store policy.
   ========================================================================== */
window.PRAYOGX = {
  /* Change this one line to point the app at a different deployment. */
  origin: "https://chemwithankit.github.io/Prayogx",
  feed: {
    catalog: "content/catalog.json",
    index: "content/index.json",
    search: "content/search.json",
    detail: "content/sims/{id}.json"
  },
  /* How many opened simulations to keep on the device. */
  offlineCap: 30,

  /* ----------------------------------------------------------------- ads
     One anchored adaptive banner, Android only, library screen only. It is
     hidden for as long as a simulation is open.

     enabled:false switches the whole feature off - no native change needed.

     testing:true serves Google's official test banner and registers the
     device as a test device. The production unit below is never requested
     until this is explicitly false. Do not flip it just to see "a real ad":
     tapping your own live ads is what gets an AdMob account suspended. */
  ads: {
    enabled: true,
    testing: true,
    bannerId: "ca-app-pub-3980851000523907/6881959261",
    testBannerId: "ca-app-pub-3940256099942544/9214589741"
  }
};

/* NOTE ON CORS
   In the installed app this does not matter: capacitor.config.json enables
   CapacitorHttp, which patches fetch() to go out through native HTTP rather
   than the WebView, so the content host is never asked for CORS headers.
   Browser-based testing of this shell DOES need them - serve the site with
   Access-Control-Allow-Origin during development. */
