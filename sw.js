/* Werkstatt-App: Grundgerüst offline verfügbar halten. Daten (api.github.com) werden nie hier zwischengespeichert.
   Fotos und Belege legt die App selbst im Speicher „werkstatt-belege-…“ ab; der bleibt bei Updates erhalten. */
var CACHE = 'werkstatt-26-1';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k.indexOf('werkstatt-belege') !== 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.hostname === 'api.github.com') return;
  if (req.mode === 'navigate') {
    /* Nur die App selbst landet als index.html im Speicher; andere Seiten (z. B. das Kunden-Formular) unter ihrer eigenen Adresse. */
    var isApp = /\/(index\.html)?$/.test(url.pathname), key = isApp ? './index.html' : url.origin + url.pathname;
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(key, copy); }); }
      return res;
    }).catch(function () { return caches.match(key).then(function (r) { return r || (isApp ? caches.match('./') : r); }); }));
    return;
  }
  var same = url.origin === self.location.origin;
  var lib = /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)$/.test(url.hostname);
  if (!same && !lib) return;
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
