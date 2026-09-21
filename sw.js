/* ==========================================================================
   PrayogX service worker

   Three caches, three lifetimes, because the three kinds of content behave
   completely differently:

     shell    the app itself. Small, changes when the site is deployed.
              Cache-first, revalidated on activate.
     feed     content/*.json. Changes whenever a simulation is added or
              revised. Stale-while-revalidate, so the catalogue paints
              instantly and corrects itself a moment later.
     sims     simulation HTML. Large (100-140 KB each) and immutable for a
              given ?v=<revision>. Cached on first open, bounded by an LRU cap
              so a student who browses fifty simulations does not silently fill
              their phone.

   The whole library is NEVER pre-cached. A simulation is stored because
   someone opened it.
   ========================================================================== */
var VERSION = "33505a9321bd";
var SHELL = "prayogx-shell-" + VERSION;
var FEED  = "prayogx-feed-"  + VERSION;

/* The simulations cache is deliberately NOT named after the feed version.
   Shell and feed must be replaced when the site is deployed, so they carry it.
   Simulations must not: each entry is already keyed by a URL carrying
   ?v=<revision>, so a revised simulation is a different entry and a superseded
   one is simply never requested again. Naming this cache after the feed version
   meant that adding a simulation renamed it, and the activate sweep below then
   deleted it - throwing away every simulation a student had saved for offline
   use, every time the library grew. The name below changes only if the shape of
   what is stored changes. */
var SIMS  = "prayogx-sims-v1";
var SIM_CAP = 40;                       /* simulations kept offline */

var SHELL_URLS = [
  "./",
  "index.html",
  "offline.html",
  "site/site.css",
  "site/site.js",
  "manifest.webmanifest",
  "site/icons/mark.svg",
  "site/icons/icon-192.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      return c.addAll(SHELL_URLS.map(function (u) { return new Request(u, { cache: "reload" }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

/* Before the stable name, this cache was called prayogx-sims-<feed version>.
   A returning visitor still has one under the old name, and the sweep below
   would delete it - so carry what is in it across first. This is a one-off for
   the upgrade; after it there are no version-named simulation caches left. */
function adoptLegacySims(keys) {
  var legacy = keys.filter(function (k) {
    return k.indexOf("prayogx-sims-") === 0 && k !== SIMS;
  });
  if (!legacy.length) return Promise.resolve();
  return caches.open(SIMS).then(function (dest) {
    return Promise.all(legacy.map(function (name) {
      return caches.open(name).then(function (src) {
        return src.keys().then(function (reqs) {
          return Promise.all(reqs.map(function (req) {
            return dest.match(req).then(function (already) {
              if (already) return;
              return src.match(req).then(function (res) {
                if (res) return dest.put(req, res);
              });
            });
          }));
        });
      });
    }));
  }).then(function () { return trim(SIMS, SIM_CAP); });
}

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return adoptLegacySims(keys).then(function () {
        return Promise.all(keys.map(function (k) {
          if (k.indexOf("prayogx-") !== 0) return;      // not ours
          if (k === SIMS) return;                       // stable: never swept
          // everything else is version-keyed, plus any old version-named
          // simulations cache now emptied into SIMS above
          if (k.indexOf("prayogx-sims-") === 0 || k.indexOf(VERSION) < 0) {
            return caches.delete(k);
          }
        }));
      });
    }).then(function () { return self.clients.claim(); })
  );
});

/* keep a cache to a maximum number of entries, oldest evicted first */
function trim(cacheName, max) {
  return caches.open(cacheName).then(function (c) {
    return c.keys().then(function (keys) {
      if (keys.length <= max) return;
      return Promise.all(keys.slice(0, keys.length - max).map(function (k) { return c.delete(k); }));
    });
  });
}

function isFeed(url) { return url.pathname.indexOf("/content/") >= 0; }
function isSim(url) { return url.pathname.indexOf("/simulations/") >= 0; }

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* ---- feed: stale-while-revalidate ---- */
  if (isFeed(url)) {
    e.respondWith(
      caches.open(FEED).then(function (c) {
        return c.match(req).then(function (hit) {
          var net = fetch(req).then(function (res) {
            if (res && res.ok) c.put(req, res.clone());
            return res;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  /* ---- simulations: cache on open, immutable per ?v=<revision> ---- */
  if (isSim(url)) {
    e.respondWith(
      caches.open(SIMS).then(function (c) {
        return c.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            if (res && res.ok) {
              c.put(req, res.clone());
              trim(SIMS, SIM_CAP);
            }
            return res;
          }).catch(function () {
            return caches.match("offline.html");
          });
        });
      })
    );
    return;
  }

  /* ---- shell: cache first, refresh in the background ---- */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && (req.mode === "navigate" || url.pathname.indexOf("/site/") >= 0)) {
          caches.open(SHELL).then(function (c) { c.put(req, res.clone()); });
        }
        return res;
      }).catch(function () {
        return hit || (req.mode === "navigate" ? caches.match("offline.html") : undefined);
      });
      return hit || net;
    })
  );
});

self.addEventListener("message", function (e) {
  if (e.data === "skip-waiting") self.skipWaiting();
  if (e.data === "clear-sims") caches.delete(SIMS);
});
