// service worker של תת-אתר בהכלים של גילעד רחמים (נוצר ע"י build.py, לא לערוך את העותק בתיקיית האתר).
// דפים: קודם רשת, ואם אין אינטרנט – מהשמור. קבצים קבועים (css/js/גופנים): קודם שמור.
// בקשות לשרתים אחרים (התמלול, גוגל) לא נוגעים בהן.
var CACHE = 'kelim-202611240131';
var PRECACHE = ["/claude-kvutza/", "/kelim/android/hakltat-sichot/", "/kelim/android/", "/kelim/android/maklit-sichot/", "/kelim/android/xiaomi/", "/kelim/android/yoman-sichot/", "/kelim/apps/", "/kelim/asakim/", "/kelim/avoda/", "/kelim/avoda/korot/", "/kelim/avoda/misrot/", "/kelim/avoda/reayon/", "/kelim/bakasha/", "/kelim/bakasha/sheli/", "/kelim/bonei-atarim/", "/kelim/botim/", "/kelim/briut/bmi/", "/kelim/briut/", "/kelim/briut/kaloriot/", "/kelim/briut/madadim/", "/kelim/briut/rofe/", "/kelim/briut/tizkorot/", "/kelim/briut/trufot/", "/kelim/chashiva/avanim/", "/kelim/chashiva/bingo/", "/kelim/chashiva/bingo/yeladim/", "/kelim/chashiva/blackjack/", "/kelim/chashiva/chidon/", "/kelim/chashiva/chidon/sheelot/", "/kelim/chashiva/damka/", "/kelim/chashiva/galgal/", "/kelim/chashiva/galgal/ken-o-lo/", "/kelim/chashiva/galgal/sheelot/", "/kelim/chashiva/galgal-shemot/", "/kelim/chashiva/gil-shlishi/", "/kelim/chashiva/hagrala/", "/kelim/chashiva/", "/kelim/chashiva/kita/beit-sefer/", "/kelim/chashiva/kita/horim/", "/kelim/chashiva/kita/", "/kelim/chashiva/kita/more/", "/kelim/chashiva/klafim/", "/kelim/chashiva/kubiya/", "/kelim/chashiva/lishnayim/", "/kelim/chashiva/luach/", "/kelim/chashiva/matbea/", "/kelim/chashiva/mila/", "/kelim/chashiva/mokshim/", "/kelim/chashiva/poker/", "/kelim/chashiva/reviiot/", "/kelim/chashiva/shachmat/", "/kelim/chashiva/shachor/", "/kelim/chashiva/shesh-besh/", "/kelim/chashiva/snake/", "/kelim/chashiva/solitaire/", "/kelim/chashiva/sudoku/beinoni/", "/kelim/chashiva/sudoku/", "/kelim/chashiva/sudoku/kal/", "/kelim/chashiva/sudoku/kashe/", "/kelim/chashiva/sudoku/lehadpasa/", "/kelim/chashiva/sudoku/pitaron/", "/kelim/chashiva/sudoku/yeladim/", "/kelim/chashiva/tashbetz/", "/kelim/chashiva/tashchetz/", "/kelim/chashiva/tifzoret/", "/kelim/chashiva/tzviya-misparim/", "/kelim/chashiva/yaniv/", "/kelim/chashiva/yeladim/", "/kelim/cheshbon/doch-maam/", "/kelim/cheshbon/hakzaa/", "/kelim/cheshbon/hamara/fahrenheit-letzelzius/", "/kelim/cheshbon/hamara/inch-lesm/", "/kelim/cheshbon/hamara/pound-lekilo/", "/kelim/cheshbon/hatzaa/", "/kelim/cheshbon/", "/kelim/cheshbon/mikdamot/", "/kelim/cheshbon/moadim/", "/kelim/cheshbon/osek/", "/kelim/cheshbon/shaar/dolar-leshekel/", "/kelim/cheshbon/shaar/euro/", "/kelim/cheshbon/shaar/", "/kelim/cheshbon/tik/cheder/", "/kelim/cheshbon/tik/", "/kelim/claude/", "/kelim/claude/kod-lamatchilim/", "/kelim/claude/mecholel/", "/kelim/claude/skilim/", "/kelim/eruim/hachana/", "/kelim/eruim/hazmana/bar-mitzva/", "/kelim/eruim/hazmana/bat-mitzva/", "/kelim/eruim/hazmana/chalake/", "/kelim/eruim/hazmana/chanukat-bayit/", "/kelim/eruim/hazmana/chatuna/", "/kelim/eruim/hazmana/china/", "/kelim/eruim/hazmana/erusin/", "/kelim/eruim/hazmana/", "/kelim/eruim/hazmana/m/", "/kelim/eruim/hazmana/sefer-torah/", "/kelim/eruim/hazmana/sheva-brachot/", "/kelim/eruim/hazmana/v/", "/kelim/eruim/hazmana/yom-huledet/", "/kelim/eruim/hoshava/", "/kelim/eruim/", "/kelim/eruim/ishurim/a/", "/kelim/eruim/ishurim/", "/kelim/eruim/sfira/", "/kelim/eruim/tochnit/", "/kelim/g/", "/kelim/hadpasa/dapei-tzvia/", "/kelim/hadpasa/", "/kelim/hadpasa/maarechet-shaot/", "/kelim/hadpasa/mavoch/", "/kelim/herayon/biyutz/", "/kelim/herayon/", "/kelim/herayon/shavua-10/", "/kelim/herayon/shavua-11/", "/kelim/herayon/shavua-12/", "/kelim/herayon/shavua-13/", "/kelim/herayon/shavua-14/", "/kelim/herayon/shavua-15/", "/kelim/herayon/shavua-16/", "/kelim/herayon/shavua-17/", "/kelim/herayon/shavua-18/", "/kelim/herayon/shavua-19/", "/kelim/herayon/shavua-20/", "/kelim/herayon/shavua-21/", "/kelim/herayon/shavua-22/", "/kelim/herayon/shavua-23/", "/kelim/herayon/shavua-24/", "/kelim/herayon/shavua-25/", "/kelim/herayon/shavua-26/", "/kelim/herayon/shavua-27/", "/kelim/herayon/shavua-28/", "/kelim/herayon/shavua-29/", "/kelim/herayon/shavua-30/", "/kelim/herayon/shavua-31/", "/kelim/herayon/shavua-32/", "/kelim/herayon/shavua-33/", "/kelim/herayon/shavua-34/", "/kelim/herayon/shavua-35/", "/kelim/herayon/shavua-36/", "/kelim/herayon/shavua-37/", "/kelim/herayon/shavua-38/", "/kelim/herayon/shavua-39/", "/kelim/herayon/shavua-4/", "/kelim/herayon/shavua-40/", "/kelim/herayon/shavua-41/", "/kelim/herayon/shavua-42/", "/kelim/herayon/shavua-5/", "/kelim/herayon/shavua-6/", "/kelim/herayon/shavua-7/", "/kelim/herayon/shavua-8/", "/kelim/herayon/shavua-9/", "/kelim/hitkadmut/", "/kelim/", "/kelim/iphone/hakltat-sichot/", "/kelim/iphone/hatraot-cherum/", "/kelim/iphone/", "/kelim/iphone/kizurei-derech/", "/kelim/iphone/maavar/", "/kelim/iphone/nikud/", "/kelim/iphone/sricat-mismachim/", "/kelim/iphone/widgetim/", "/kelim/iphone/zman-masach/", "/kelim/kehila/aliyot/", "/kelim/kehila/azkarot/", "/kelim/kehila/gabai/", "/kelim/kehila/", "/kelim/kehila/kvutzot-whatsapp/", "/kelim/kehila/kvutzot-whatsapp/nihul/", "/kelim/kehila/trempim/", "/kelim/kehila/trempim/luz/", "/kelim/kehila/trempim/pratiut/", "/kelim/kehila/trumot/", "/kelim/kesharim/bracha-lechag/chanuka/", "/kelim/kesharim/bracha-lechag/", "/kelim/kesharim/bracha-lechag/pesach/", "/kelim/kesharim/bracha-lechag/purim/", "/kelim/kesharim/bracha-lechag/rosh-hashana/", "/kelim/kesharim/bracha-lechag/shavuot/", "/kelim/kesharim/bracha-lechag/sukot/", "/kelim/kesharim/hodaot/", "/kelim/kesharim/", "/kelim/kesharim/ishurim/", "/kelim/kesharim/sidur/", "/kelim/kesharim/yomulda/", "/kelim/machshev/achsun-google/", "/kelim/machshev/anshei-kesher/", "/kelim/machshev/chadashot/hatmaa/", "/kelim/machshev/chadashot/", "/kelim/machshev/chadashot/ma-kara-beshabat/", "/kelim/machshev/chadashot/moda/", "/kelim/machshev/chadashot/telefon-kasher/", "/kelim/machshev/chatima/", "/kelim/machshev/chatima/tosaf/", "/kelim/machshev/chatima/tosaf/lehitraot/", "/kelim/machshev/chrome-iti/", "/kelim/machshev/fax/", "/kelim/machshev/gibui/", "/kelim/machshev/gilayon-rtl/", "/kelim/machshev/gmail/hasara/", "/kelim/machshev/gmail/", "/kelim/machshev/gmail/shichzur/", "/kelim/machshev/haavarat-kvatzim/", "/kelim/machshev/historia/", "/kelim/machshev/ichud-pdf/", "/kelim/machshev/", "/kelim/machshev/kartisiot/", "/kelim/machshev/kasher/", "/kelim/machshev/kav/", "/kelim/machshev/kitzur-kishurim/bechinam/", "/kelim/machshev/kitzur-kishurim/bitly/", "/kelim/machshev/kitzur-kishurim/", "/kelim/machshev/kitzur-kishurim/link/", "/kelim/machshev/kitzur-kishurim/url/", "/kelim/machshev/kitzur-kishurim/whatsapp/", "/kelim/machshev/kod-bamachshev/", "/kelim/machshev/kod-imut/", "/kelim/machshev/lens/", "/kelim/machshev/makom-bamachshev/", "/kelim/machshev/mi-mitkasher/chul/", "/kelim/machshev/mi-mitkasher/", "/kelim/machshev/mi-mitkasher/kidomot/", "/kelim/machshev/pdf/", "/kelim/machshev/ptakim/", "/kelim/machshev/sader/", "/kelim/machshev/sidur-mailim/", "/kelim/machshev/sisma/", "/kelim/machshev/sismaot/", "/kelim/machshev/tizkoret/", "/kelim/machshev/tmuna/", "/kelim/machshev/tzilumim/", "/kelim/machshev/video/", "/kelim/machshev/whatsapp-kvutza-excel/", "/kelim/machshev/whatsapp-lo-shamur/", "/kelim/machshev/whatsapp-pratiut/", "/kelim/machshev/whatsapp-shmirat-chat/", "/kelim/machshev/whatsapp-sidur/", "/kelim/machshev/whatsapp-tizmun/", "/kelim/machshev/whatsapp-web/", "/kelim/machshev/yoman-ivri/", "/kelim/miluim/bait/", "/kelim/miluim/gibush/", "/kelim/miluim/gibush/ma-lakachat/", "/kelim/miluim/gibush/pachad/", "/kelim/miluim/", "/kelim/miluim/ru/", "/kelim/miluim/tziyud/", "/kelim/miluim/yamim/", "/kelim/mishpacha/", "/kelim/mishpacha/kniyot/", "/kelim/mishpacha/shabbat/", "/kelim/mishpacha/toranut/", "/kelim/negishut/ani-lo-robot/", "/kelim/negishut/ani-lo-robot/nvda/", "/kelim/negishut/ani-lo-robot/talkback/", "/kelim/negishut/ani-lo-robot/voiceover-iphone/", "/kelim/negishut/ani-lo-robot/voiceover-mac/", "/kelim/negishut/imutim-baplikatsiot/", "/kelim/negishut/", "/kelim/pratiut/", "/kelim/shemot/banim/", "/kelim/shemot/banot/", "/kelim/shemot/", "/kelim/shichva/", "/kelim/shichva/merchav/", "/kelim/shikum/", "/kelim/shikum/shaot/", "/kelim/shikum/tik/", "/kelim/shikum/vaada/", "/kelim/shikum/yoman/", "/kelim/shipurim/", "/kelim/shir/clip/", "/kelim/shir/haklata/", "/kelim/shir/", "/kelim/shir/karaoke/chadashim/", "/kelim/shir/karaoke/erev/", "/kelim/shir/karaoke/", "/kelim/shir/karaoke/shirim/", "/kelim/shir/kivun-gitara/", "/kelim/shir/lachan/", "/kelim/shir/metronom/", "/kelim/shir/milim/", "/kelim/shir/ulpan/", "/kelim/shutafim/", "/kelim/tamlul/haalaa/", "/kelim/tamlul/", "/kelim/tamlul/nahalat-avot/", "/kelim/tamlul/shiur/", "/kelim/tamlul/sicha/", "/kelim/tamlul/sirton/", "/kelim/tamlul/telegram/", "/kelim/tamlul/whatsapp/", "/kelim/tamlul/yutub/", "/kelim/tichnut/base64/", "/kelim/tichnut/bits/", "/kelim/tichnut/emet/", "/kelim/tichnut/git/", "/kelim/tichnut/gpu/", "/kelim/tichnut/hagdarot/", "/kelim/tichnut/imun/", "/kelim/tichnut/", "/kelim/tichnut/json/", "/kelim/tichnut/maslul/", "/kelim/tichnut/mehirut/", "/kelim/tichnut/miunim/", "/kelim/tichnut/occupancy/", "/kelim/tichnut/pkudot/", "/kelim/tichnut/reayon-tech/", "/kelim/tichnut/regex/", "/kelim/tichnut/shgiot/", "/kelim/tichnut/sibuchiyut/", "/kelim/tichnut/simulator/", "/kelim/tichnut/sql/", "/kelim/tichnut/tzaad/", "/kelim/tichnut/vram/", "/kelim/tiyulim/hotzaot/", "/kelim/tiyulim/", "/kelim/tiyulim/maslul/", "/kelim/tiyulim/ochel/", "/kelim/tiyulim/tziyud/", "/kelim/tochen/chatimat-mail/dugmaot/", "/kelim/tochen/chatimat-mail/gmail/", "/kelim/tochen/chatimat-mail/", "/kelim/tochen/chatimat-mail/outlook/", "/kelim/tochen/chatimat-mail/telefon/", "/kelim/tochen/chaye/", "/kelim/tochen/gdalim/", "/kelim/tochen/hakraa/", "/kelim/tochen/hakraa/kraynut/", "/kelim/tochen/hakraa/makri-tekstim/", "/kelim/tochen/hakraa/pdf/", "/kelim/tochen/hakraa/sfarim-muklatim/", "/kelim/tochen/hakraa/tekst-ledibur/", "/kelim/tochen/", "/kelim/tochen/kishur-wa/", "/kelim/tochen/ktav-yad/digitalit/", "/kelim/tochen/ktav-yad/", "/kelim/tochen/ktav-yad/yafa/", "/kelim/tochen/mail/anglit/", "/kelim/tochen/mail/hamlatza/", "/kelim/tochen/mail/hatraa/", "/kelim/tochen/mail/hitpatrut/", "/kelim/tochen/mail/", "/kelim/tochen/mail/michutz-lamisrad/", "/kelim/tochen/mail/pitturim/", "/kelim/tochen/matzeget/", "/kelim/tochen/moda/", "/kelim/tochen/sfirat-milim/", "/kelim/tochen/shiron/", "/kelim/tochen/studio/", "/kelim/tochen/tirgum/amharit-ivrit/", "/kelim/tochen/tirgum/aravit-ivrit/", "/kelim/tochen/tirgum/atar/", "/kelim/tochen/tirgum/", "/kelim/tochen/tirgum/ivrit-anglit/", "/kelim/tochen/tirgum/ivrit-aravit/", "/kelim/tochen/tirgum/ivrit-rusit/", "/kelim/tochen/tirgum/koli/", "/kelim/tochen/tirgum/mismachim/", "/kelim/tochen/tirgum/mitzlema/", "/kelim/tochen/tirgum/rusit-ivrit/", "/kelim/tochen/tirgum/sfaradit-ivrit/", "/kelim/tochen/tirgum/tzarfatit-ivrit/", "/kelim/tochen/tirgum/youtube/", "/kelim/tochen/wa/", "/mapa/", "/assets/site.css?v=cb1a2bbb", "/assets/kelim.css?v=c7eb113d", "/assets/kelim.js?v=53f855ae", "/assets/hakraa-daf.js?v=5b6fd0b2", "/assets/track.js?v=ca51c9e7", "/assets/discover.js?v=5d955931", "/assets/discover2.js?v=a963d315", "/assets/fonts/FrankRuhlLibre-wght.woff", "/assets/fonts/Assistant-wght.woff", "/assets/icon-kelim-192.png"];
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
