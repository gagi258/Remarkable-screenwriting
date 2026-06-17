/* Scene Studio service worker — offline app shell cache */
var CACHE = "scene-studio-v2";
var ASSETS = ["./", "index.html", "scene-studio.html", "manifest.webmanifest", "icon-512.png"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (a) { return c.add(a).catch(function () {}); }));
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  // never cache Dropbox API traffic
  if (/dropboxapi\.com$/.test(url.hostname) || url.hostname.indexOf("dropbox.com") !== -1) return;
  // network-first for same-origin navigations so updates land; fall back to cache offline
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(function (r) {
      var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return r;
    }).catch(function () { return caches.match(req).then(function (m) { return m || caches.match("scene-studio.html") || caches.match("./"); }); }));
    return;
  }
  // cache-first for other same-origin assets
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(function (m) {
      return m || fetch(req).then(function (r) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return r; }).catch(function () { return m; });
    }));
  }
});
