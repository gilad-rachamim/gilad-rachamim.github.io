// service worker של תת-אתר בהכלים של גילעד רחמים (נוצר ע"י build.py, לא לערוך את העותק בתיקיית האתר).
// דפים: קודם רשת, ואם אין אינטרנט – מהשמור. קבצים קבועים (css/js/גופנים): קודם שמור.
// בקשות לשרתים אחרים (התמלול, גוגל) לא נוגעים בהן.
var CACHE = 'kesef-202611181913';
var PRECACHE = ["/kesef/achuzim/hanacha/", "/kesef/achuzim/", "/kesef/ashrai/", "/kesef/bruto-neto/", "/kesef/gil/", "/kesef/halvaa/", "/kesef/hechzer/", "/kesef/", "/kesef/kranot/", "/kesef/maam/", "/kesef/mechir/", "/kesef/minuyim/", "/kesef/mismachim/", "/kesef/mivtza/", "/kesef/ribit-dribit/", "/kesef/shana/", "/kesef/shaot-avoda/", "/kesef/taktziv/", "/kesef/tlush/", "/kesef/yeladim/", "/assets/site.css?v=b4546dc2", "/assets/kelim.css?v=56115877", "/assets/kelim.js?v=00dd7db9", "/assets/track.js?v=b4642baf", "/assets/fonts/FrankRuhlLibre-wght.woff", "/assets/fonts/Assistant-wght.woff", "/assets/icon-kesef-192.png", "/assets/kesef.css?v=b790a201", "/assets/kesef.js?v=27f16432"];
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
  // קבצים ששותפו מאפליקציה אחרת (share_target ב-manifest של הכלים): שומרים רגע ב-Cache ופותחים את הכלי המתאים.
  // קובץ אחד של שמע או וידאו (הודעה קולית מווטסאפ) – כלי התמלול. PDF אחד – מילוי וחתימה. כל השאר (תמונות, כמה קבצים) – מסדר התיקיות, כמו תמיד.
  if (req.method === 'POST' && /\/machshev\/sader\/$/.test(new URL(req.url).pathname)) {
    e.respondWith(req.formData().then(function (fd) {
      var files = fd.getAll('files').filter(function (f) { return f && typeof f !== 'string'; });
      // טקסט ששותף בלי קבצים (הודעה עם קוד אימות): שומרים רגע ב-Cache ופותחים את כלי קוד האימות. לא נשלח לשום שרת.
      if (!files.length) {
        var shared = [fd.get('title'), fd.get('text'), fd.get('url')].filter(function (v) { return v && typeof v === 'string'; }).join('\n');
        return caches.delete('kod-share').then(function () { return caches.open('kod-share'); }).then(function (c) {
          return c.put('/kod-share/0', new Response(shared, { headers: { 'content-type': 'text/plain; charset=utf-8' } }));
        }).then(function () { return Response.redirect('/kelim/machshev/kod-imut/?share=1', 303); });
      }
      var AVX = { opus: 'audio/ogg', ogg: 'audio/ogg', oga: 'audio/ogg', m4a: 'audio/mp4', mp3: 'audio/mpeg', aac: 'audio/aac', amr: 'audio/amr', wav: 'audio/wav', flac: 'audio/flac', mp4: 'video/mp4', '3gp': 'video/3gpp', webm: 'video/webm', mov: 'video/quicktime' };
      var ext = files.length === 1 ? (/\.([a-z0-9]+)$/i.exec(files[0].name || '') || [])[1] : '';
      var byExt = ext ? AVX[ext.toLowerCase()] : '';
      var av = files.length === 1 && (/^(audio|video)\//.test(files[0].type || '') || !!byExt);
      // קובץ PDF בודד – הכלי למילוי וחתימה על PDF
      var pdf = files.length === 1 && (/pdf$/i.test(files[0].type || '') || /\.pdf$/i.test(files[0].name || ''));
      if (pdf) return caches.delete('chatima-share').then(function () { return caches.open('chatima-share'); }).then(function (c) {
        return c.put('/chatima-share/0', new Response(files[0], { headers: { 'content-type': 'application/pdf', 'x-name': encodeURIComponent(files[0].name || 'מסמך.pdf') } }));
      }).then(function () { return Response.redirect('/kelim/machshev/chatima/?share=1', 303); });
      // הקלטת שיחה (לפי שם הקובץ: Call recording..., call_rec, מספר טלפון ותאריך) – ליומן השיחות. הודעה קולית מווטסאפ (PTT/AUD, opus) – לתמלול כרגיל.
      var nm = av ? String(files[0].name || '') : '';
      var call = av && !/^(PTT|AUD)-/i.test(nm) && !/^(opus|ogg|oga)$/i.test(ext) && /(call|rec_|record|הקלט|שיחה|\+?\d{9,}|\d{8}[_-]?\d{6})/i.test(nm);
      var box = av ? 'tamlul-share' : 'sader-share';
      return caches.delete(box).then(function () { return caches.open(box); }).then(function (c) {
        return Promise.all(files.map(function (f, i) {
          var type = f.type && (!av || /^(audio|video)\//.test(f.type)) ? f.type : (av && byExt) || 'application/octet-stream';
          return c.put('/' + box + '/' + i, new Response(f, { headers: { 'content-type': type, 'x-name': encodeURIComponent(f.name), 'x-mod': String(f.lastModified || '') } }));
        }));
      }).then(function () { return Response.redirect(call ? '/kelim/android/yoman-sichot/?share=1' : av ? '/kelim/tamlul/?share=1' : '/kelim/machshev/sader/?share=1', 303); });
    }));
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
