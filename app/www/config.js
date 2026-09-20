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
  offlineCap: 30
};

/* NOTE ON CORS
   In the installed app this does not matter: capacitor.config.json enables
   CapacitorHttp, which patches fetch() to go out through native HTTP rather
   than the WebView, so the content host is never asked for CORS headers.
   Browser-based testing of this shell DOES need them - serve the site with
   Access-Control-Allow-Origin during development. */
