// service worker של תת-אתר בהכלים של גילעד רחמים (נוצר ע"י build.py, לא לערוך את העותק בתיקיית האתר).
// דפים: קודם רשת, ואם אין אינטרנט – מהשמור. קבצים קבועים (css/js/גופנים): קודם שמור.
// בקשות לשרתים אחרים (התמלול, גוגל) לא נוגעים בהן.
var CACHE = 'kodesh-202611111223';
var PRECACHE = ["/kodesh/album/", "/kodesh/alon/", "/kodesh/atar/", "/kodesh/azkara/", "/kodesh/beit-knesset/", "/kodesh/boker/", "/kodesh/brachon/", "/kodesh/brachot/", "/kodesh/brachot/yom-huledet/", "/kodesh/britot/", "/kodesh/britot-meyuchadot/", "/kodesh/chag-basis/", "/kodesh/chanuka/bracha/", "/kodesh/chanuka/chanukiya/", "/kodesh/chanuka/chesed/", "/kodesh/chanuka/chidon/", "/kodesh/chanuka/chufsha/", "/kodesh/chanuka/", "/kodesh/chanuka/kniyot/", "/kodesh/chanuka/matkonim/", "/kodesh/chanuka/nerot/", "/kodesh/chanuka/sevivon/", "/kodesh/chanuka/shiron/", "/kodesh/chanuka/sipurim/", "/kodesh/chanuka/tashbetz/", "/kodesh/chanuka/tshii/", "/kodesh/chanuka/tzviya/", "/kodesh/chayal/", "/kodesh/dapei-tefila/", "/kodesh/dvar-torah/", "/kodesh/hachlama/", "/kodesh/hodaot/", "/kodesh/", "/kodesh/kartis/", "/kodesh/kartis-mohel/", "/kodesh/kibudim-yechida/", "/kodesh/luach/", "/kodesh/luach-shana/", "/kodesh/masach/", "/kodesh/mekorot/", "/kodesh/misheberach/", "/kodesh/mohalim/bli-atar/", "/kodesh/mohalim/", "/kodesh/olpan/", "/kodesh/olpan/kol/", "/kodesh/olpan/mara/", "/kodesh/olpan/prompter/", "/kodesh/olpan/reka/", "/kodesh/omer-avot/", "/kodesh/post/", "/kodesh/psak/", "/kodesh/qr/", "/kodesh/r/", "/kodesh/shavua/", "/kodesh/shiur/", "/kodesh/shut/", "/kodesh/simcha/", "/kodesh/sipur/", "/kodesh/sipurim/", "/kodesh/taarichim/", "/kodesh/tehillim/", "/kodesh/tehillim/shem/", "/kodesh/teuda/", "/kodesh/tofes-brit/", "/kodesh/tziyud/", "/kodesh/video/", "/kodesh/video-parasha/", "/kodesh/video-shiur/", "/kodesh/zmanim/", "/assets/site.css?v=39e81fea", "/assets/kelim.css?v=95dad8f3", "/assets/kelim.js?v=c681b967", "/assets/track.js?v=b23b682b", "/assets/fonts/FrankRuhlLibre-wght.woff", "/assets/fonts/Assistant-wght.woff", "/assets/icon-kodesh-192.png"];
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
  // קבצים גדולים (מודל הסרת הרקע של הסטודיו, 46MB): הכלי שומר אותם בעצמו, בלי הורדה חוזרת ברקע בכל שימוש
  if (/^\/assets\/vendor\/(isnet|onnxruntime-web|pyodide)\//.test(url.pathname)) return;
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

// התראות "החדשות ב-3 דקות" (tools/news-worker): הדחיפה מגיעה בלי תוכן, ומביאים את הסיכום האחרון מהשרת.
self.addEventListener('push', function (e) {
  var page = '/kelim/machshev/chadashot/';
  e.waitUntil(fetch('https://kelim-news.gilad4049.workers.dev/latest?from=push', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (ed) {
    var first = ed && ed.sections && ed.sections.main && ed.sections.main[0];
    return self.registration.showNotification('החדשות ב-3 דקות – סיכום ' + ((ed && ed.name) || 'חדש'), {
      body: first ? first.text : 'הסיכום החדש מחכה לך', icon: '/assets/icon-kelim-192.png', badge: '/assets/icon-kelim-192.png',
      tag: 'kelim-news', lang: 'he', dir: 'rtl', data: { url: page }
    });
  }).catch(function () {
    return self.registration.showNotification('החדשות ב-3 דקות', { body: 'הסיכום החדש מחכה לך', icon: '/assets/icon-kelim-192.png', tag: 'kelim-news', lang: 'he', dir: 'rtl', data: { url: page } });
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/kelim/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) if (list[i].url.indexOf(url) >= 0 && 'focus' in list[i]) return list[i].focus();
    return self.clients.openWindow(url);
  }));
});
