// מעקב Google Analytics 4: אירועי המרה (לידים, ווטסאפ, טלפון, איש קשר, PDF).
// נטען רק כש-GA_ID מוגדר ב-build.py. בלי gtag – לא עושה כלום.
// הכלים של גילעד רחמים (/kelim/, /kodesh/): האירועים tool_use{site,tool}, tool_install, request_tool, donate_click, share
// נשלחים מ-assets/kelim.js (window.toolUsed / window.kelimEv), שנטען רק בדפים האלה.
(function () {
  function ev(name, params) { if (window.gtag) window.gtag('event', name, params || {}); }
  // פלייליסט לברית: אירוע נפרד לכל סגנון (playlist_dati וכו'), כדי שבדוח האירועים יופיעו חמש שורות בלי שום הגדרה.
  // נמדד גם קישור לספוטיפי וגם כפתור הנגן, כי לחיצה בתוך הנגן עצמו לא נספרת.
  document.addEventListener('click', function (e) {
    var p = e.target.closest && e.target.closest('[data-playlist]');
    if (!p) return;
    ev('playlist_' + p.getAttribute('data-playlist'), { style: p.getAttribute('data-style'), action: p.tagName === 'A' ? 'open_spotify' : 'play_here', page: location.pathname });
  }, true);
  // טופס הכיבודים: נספר רק כשיש מה לשלוח. נמדדים מספר המכובדים והנוסח, בלי שמות.
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-kibudim-send]');
    if (!b || b.getAttribute('data-ready') !== '1') return;
    ev('kibudim_send', { page: location.pathname, honors: Number(b.getAttribute('data-count')), nusach: b.getAttribute('data-nusach') });
  }, true);
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href');
    var where = { page: location.pathname };
    // דף המוהלים: שליחה להורים היא לא פנייה אליי, לכן אירוע נפרד לכל כלי (share_parents_hazmana וכו') ולא whatsapp_click.
    if (a.hasAttribute('data-share')) { ev('share_parents_' + a.getAttribute('data-share'), where); return; }
    if (/wa\.me|whatsapp/.test(h)) ev('whatsapp_click', where);
    else if (/t\.me\//.test(h)) ev('telegram_click', { page: location.pathname, bot: h.split('t.me/')[1].split('?')[0] });
    else if (h.indexOf('tel:') === 0) ev('phone_click', where);
    else if (/\.vcf($|\?)/.test(h)) ev('save_contact', where);
    else if (/\.pdf($|\?)/.test(h)) ev('guide_download', { page: location.pathname, file: h.split('?')[0].split('/').pop() });
    else if (/\/mohel\/shirim\//.test(h)) ev('shirim_click', where);
  }, true);
  // ליד = הגעה לעמוד התודה עם פרטים ב-hash (אמין יותר מאירוע submit, שנחתך במעבר דף).
  // נספר פעם אחת לכל ליד, גם אם מרעננים את עמוד התודה.
  if (location.pathname === '/mohel/todah/' && /(^|[#&])n=/.test(location.hash)) {
    var key = 'mohel-lead-counted-' + location.hash;
    var seen = false;
    try { seen = sessionStorage.getItem(key); sessionStorage.setItem(key, '1'); } catch (err) {}
    if (!seen) {
      var src = '';
      try { src = (JSON.parse(sessionStorage.getItem('mohel-utm') || '{}').utm_source) || ''; } catch (err) {}
      ev('generate_lead', { page: document.referrer ? new URL(document.referrer).pathname : '', source: src });
    }
  }
})();

// דקות פעילות (נקבע 11.11.2026): גוגל סופר זמן בעיקר בדיווח אחד ביציאה מהדף, ובטלפון הוא נאבד
// הרבה (סוגרים אפליקציה, נועלים מסך). אחי של גילעד שיחק רבע שעה בשחור ופתור ובדוח יצא 0 שניות.
// לכן כל דקה שהדף גלוי ובפוקוס נשלח active_minute. כל אירוע כזה נושא איתו גם את הזמן שנצבר (_et),
// כך שגם מדד "משך ההתעניינות" של גוגל מתעדכן, ומה שנאבד ביציאה הוא לכל היותר דקה.
// בדוח: אירועים ← active_minute לפי נתיב הדף = כמה דקות אנשים היו בכל דף.
(function () {
  if (!window.gtag) return;
  var STEP = 5000, MIN = 60000, CAP = 240;
  var acc = 0, n = 0, last = Date.now();
  function active() { return document.visibilityState === 'visible' && (!document.hasFocus || document.hasFocus()); }
  function tick() {
    var now = Date.now(), d = now - last;
    last = now;
    if (!active() || d > STEP * 3) return; // מחשב שנרדם או לשונית ברקע – לא נספר
    acc += d;
    if (acc >= MIN && n < CAP) {
      acc -= MIN; n++;
      window.gtag('event', 'active_minute', { page: location.pathname, minute: n });
    }
  }
  setInterval(tick, STEP);
  document.addEventListener('visibilitychange', function () { last = Date.now(); });
})();
