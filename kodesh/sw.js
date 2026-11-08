// service worker של תת-אתר בהכלים של גילעד רחמים (נוצר ע"י build.py, לא לערוך את העותק בתיקיית האתר).
// דפים: קודם רשת, ואם אין אינטרנט – מהשמור. קבצים קבועים (css/js/גופנים): קודם שמור.
// בקשות לשרתים אחרים (התמלול, גוגל) לא נוגעים בהן.
var CACHE = 'kodesh-202611081825';
var PRECACHE = ["/kodesh/azkara/", "/kodesh/beit-knesset/", "/kodesh/brachot/", "/kodesh/britot/", "/kodesh/britot-meyuchadot/", "/kodesh/chag-basis/", "/kodesh/chayal/", "/kodesh/dapei-tefila/", "/kodesh/dvar-torah/", "/kodesh/hachlama/", "/kodesh/hodaot/", "/kodesh/", "/kodesh/kartis/", "/kodesh/kartis-mohel/", "/kodesh/kibudim-yechida/", "/kodesh/luach/", "/kodesh/luach-shana/", "/kodesh/masach/", "/kodesh/mekorot/", "/kodesh/misheberach/", "/kodesh/mohalim/bli-atar/", "/kodesh/mohalim/", "/kodesh/post/", "/kodesh/psak/", "/kodesh/qr/", "/kodesh/shiur/", "/kodesh/shut/", "/kodesh/simcha/", "/kodesh/sipur/", "/kodesh/sipurim/", "/kodesh/taarichim/", "/kodesh/tehillim/", "/kodesh/tehillim/shem/", "/kodesh/teuda/", "/kodesh/tziyud/", "/kodesh/video/", "/kodesh/video-parasha/", "/kodesh/zmanim/", "/assets/site.css", "/assets/kelim.css", "/assets/kelim.js", "/assets/track.js", "/assets/fonts/FrankRuhlLibre-wght.woff", "/assets/fonts/Assistant-wght.woff", "/assets/icon-kodesh-192.png"];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).catch(function () {}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    var site = CACHE.split('-')[0] + '-';
    return Promise.all(keys.filter(function (k) { return k.indexOf(site) === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) {
      var copy = r.clone();
      caches.open(CACHE).then(function (c) { c.put(url.pathname, copy); });
      return r;
    }).catch(function () {
      return caches.match(url.pathname).then(function (r) { return r || caches.match(self.registration.scope); });
    }));
    return;
  }
  if (/^\/assets\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (r) {
        if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return r;
      });
      return hit || net;
    }));
  }
});
