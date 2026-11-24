// service worker של אפליקציית "טרמפים בשכונה" (טווח: /kelim/kehila/trempim/). נוצר ע"י build.py – לא לערוך את העותק בתיקיית האתר.
// נפרד מה-sw.js של כל האתר: לרישום אחד יש מינוי התראות אחד, ולטרמפים יש מפתח VAPID משלהם.
// התראות: בקשה חדשה, אישור, דחייה, ביטול, ו"מישהו נוסע בדרך שחיפשת". לחיצה פותחת את הדף (או מביאה קדימה חלון פתוח).
// דפים: קודם רשת, ואם אין אינטרנט – מהשמור. השיתוף מ-Waze/גוגל מפות מגיע ב-GET רגיל (?share=1) – אין צורך לטפל כאן.
var CACHE = 'kelim-kehila-trempim-202611241536';
var SCOPE = '/kelim/kehila/trempim/';
var PRE = [SCOPE, SCOPE + 'luz/', SCOPE + 'pratiut/', '/assets/icon-trempim-192.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRE); }).catch(function () {}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  var pre = CACHE.replace(/-\d+$/, '-');
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf(pre) === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) {
      if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(url.pathname, copy); }); }
      return r;
    }).catch(function () {
      return caches.match(url.pathname).then(function (r) { return r || caches.match(SCOPE); });
    }));
    return;
  }
  if (/^\/assets\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (r) {
        if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return r;
      });
      return hit || net.catch(function () { return hit; });
    }));
  }
});

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  var url = typeof d.url === 'string' && d.url.indexOf(SCOPE) === 0 ? d.url : SCOPE + '#inbox';
  e.waitUntil(self.registration.showNotification(d.title || 'טרמפים בשכונה', {
    body: d.body || 'יש עדכון בטרמפים',
    icon: '/assets/icon-trempim-192.png',
    badge: '/assets/icon-trempim-192.png',
    tag: d.tag || 'trempim',
    renotify: true,
    dir: 'rtl', lang: 'he',
    data: { url: url },
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || SCOPE + '#inbox';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (new URL(c.url).pathname.indexOf(SCOPE) === 0 && 'focus' in c) {
        // חלון פתוח של הטרמפים: מביאים קדימה ומעבירים לכתובת של ההתראה
        return c.focus().then(function (w) { return (w || c).navigate ? (w || c).navigate(url) : null; }).catch(function () { return self.clients.openWindow(url); });
      }
    }
    return self.clients.openWindow(url);
  }));
});

// הדפדפן החליף את המינוי (נדיר): מבקשים מהדף לרשום מחדש בפעם הבאה שייפתח
self.addEventListener('pushsubscriptionchange', function () {
  return self.clients.matchAll({ type: 'window' }).then(function (list) { list.forEach(function (c) { c.postMessage({ tp: 'resub' }); }); });
});
