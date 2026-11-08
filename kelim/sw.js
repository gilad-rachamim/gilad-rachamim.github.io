// service worker של תת-אתר בהכלים של גילעד רחמים (נוצר ע"י build.py, לא לערוך את העותק בתיקיית האתר).
// דפים: קודם רשת, ואם אין אינטרנט – מהשמור. קבצים קבועים (css/js/גופנים): קודם שמור.
// בקשות לשרתים אחרים (התמלול, גוגל) לא נוגעים בהן.
var CACHE = 'kelim-202611082112';
var PRECACHE = ["/kelim/avoda/", "/kelim/avoda/korot/", "/kelim/avoda/misrot/", "/kelim/avoda/reayon/", "/kelim/briut/", "/kelim/briut/madadim/", "/kelim/briut/rofe/", "/kelim/briut/trufot/", "/kelim/", "/kelim/kesharim/hodaot/", "/kelim/kesharim/", "/kelim/kesharim/ishurim/", "/kelim/kesharim/yomulda/", "/kelim/machshev/gibui/", "/kelim/machshev/", "/kelim/machshev/pdf/", "/kelim/machshev/sader/", "/kelim/machshev/sisma/", "/kelim/machshev/tmuna/", "/kelim/machshev/video/", "/kelim/miluim/bait/", "/kelim/miluim/", "/kelim/miluim/tziyud/", "/kelim/miluim/yamim/", "/kelim/mishpacha/", "/kelim/mishpacha/kniyot/", "/kelim/mishpacha/shabbat/", "/kelim/mishpacha/toranut/", "/kelim/shikum/", "/kelim/shikum/tik/", "/kelim/shikum/vaada/", "/kelim/shikum/yoman/", "/kelim/shipurim/", "/kelim/tamlul/", "/kelim/tochen/", "/kelim/tochen/matzeget/", "/kelim/tochen/moda/", "/kelim/tochen/shiron/", "/kelim/tochen/wa/", "/assets/site.css?v=14c6afff", "/assets/kelim.css?v=162946d4", "/assets/kelim.js?v=f6406678", "/assets/track.js?v=928f9743", "/assets/fonts/FrankRuhlLibre-wght.woff", "/assets/fonts/Assistant-wght.woff", "/assets/icon-kelim-192.png"];
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
  // קבצים ששותפו מהגלריה (share_target ב-manifest של הכלים): שומרים רגע ב-Cache ופותחים את מסדר התיקיות
  if (req.method === 'POST' && /\/machshev\/sader\/$/.test(new URL(req.url).pathname)) {
    e.respondWith(req.formData().then(function (fd) {
      var files = fd.getAll('files');
      return caches.delete('sader-share').then(function () { return caches.open('sader-share'); }).then(function (c) {
        return Promise.all(files.map(function (f, i) {
          return c.put('/sader-share/' + i, new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name), 'x-mod': String(f.lastModified || '') } }));
        }));
      });
    }).then(function () { return Response.redirect('/kelim/machshev/sader/?share=1', 303); }));
    return;
  }
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
