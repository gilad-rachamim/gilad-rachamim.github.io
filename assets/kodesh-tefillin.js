// סדר הנחת תפילין + תזכורת לפני השקיעה (כלי קודש, /kodesh/tefillin/).
// הכול בטלפון: המיקום, השעות ומה שסימנתם נשמרים ב-localStorage ולא נשלחים לשום מקום.
// השקיעה ומשיכיר מ-@hebcal/core (אותו קובץ כמו /kodesh/zmanim/).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var root = $('tf');
  if (!root) return;
  var H = window.hebcal, KEY = 'kodesh-tefillin', TZ = 'Asia/Jerusalem';
  var CITIES = [['31.778,35.235', 'ירושלים'], ['32.08,34.78', 'תל אביב'], ['32.79,34.99', 'חיפה'], ['31.25,34.79', 'באר שבע'], ['32.09,34.88', 'פתח תקווה'], ['31.97,34.79', 'ראשון לציון'], ['32.32,34.85', 'נתניה'], ['31.8,34.65', 'אשדוד'], ['31.67,34.57', 'אשקלון'], ['32.08,34.83', 'בני ברק'], ['31.9,35.0', 'מודיעין'], ['31.71,35.0', 'בית שמש'], ['31.89,34.81', 'רחובות'], ['32.17,34.84', 'הרצליה'], ['32.965,35.496', 'צפת'], ['32.79,35.53', 'טבריה'], ['29.557,34.952', 'אילת'], ['31.53,35.1', 'חברון וקריית ארבע'], ['32.3,35.2', 'שומרון'], ['33.2,35.57', 'קריית שמונה'], ['32.6,35.29', 'עפולה']];
  var st = { place: '31.778,35.235', name: 'ירושלים', done: {}, morningOn: true, morning: '07:30', noonOn: false, noon: '13:00', before: 30, lock: false, checked: '' };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function used(how) { try { if (window.toolUsed) window.toolUsed('tefillin', { how: how }); } catch (e) {} }

  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function add(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function noon(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }
  var tf = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function t(d) { return d && !isNaN(d) ? tf.format(d) : '—'; }
  function hm(s, d) { var p = String(s || '').split(':'); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), +p[0] || 0, +p[1] || 0); }
  function left(ms) { var m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60); m = m % 60; return (h ? h + ' שע׳' + (m ? ' ו-' : '') : '') + (m || !h ? m + ' דק׳' : ''); }
  function ll() { var a = String(st.place).split(',').map(Number); return (a.length === 2 && !isNaN(a[0]) && !isNaN(a[1])) ? a : [31.778, 35.235]; }
  function zm(d) { var a = ll(); return new H.Zmanim(new H.GeoLocation(st.name || '', a[0], a[1], 0, TZ), noon(d), false); }
  function he(s) { try { return H.Locale.gettext(s, 'he-x-NoNikud'); } catch (e) { return s; } }

  // יום בלי תפילין: שבת ויום טוב. חול המועד – לפי המנהג (בארץ רוב הנוהגים לא מניחים). תשעה באב – רק במנחה.
  function dayKind(d) {
    if (d.getDay() === 6) return { off: true, why: 'שבת' };
    try {
      var ev = H.HebrewCalendar.getHolidaysOnDate(new H.HDate(noon(d)), true) || [];
      for (var i = 0; i < ev.length; i++) {
        var f = ev[i].getFlags();
        if (f & H.flags.CHAG) return { off: true, why: he(ev[i].basename()) };
        if (f & H.flags.CHOL_HAMOED) return { off: false, moed: true, why: 'חול המועד ' + he(ev[i].basename()) };
        if (/^Tish'a B'Av/.test(ev[i].getDesc())) return { off: false, av: true, why: 'תשעה באב' };
      }
    } catch (e) {}
    return { off: false };
  }
  function streak() {
    var n = 0, d = new Date(), k = 0;
    if (!st.done[iso(d)]) d = add(d, -1);
    while (k++ < 400) {
      if (dayKind(d).off) { d = add(d, -1); continue; }
      if (!st.done[iso(d)]) break;
      n++; d = add(d, -1);
    }
    return n;
  }

  // ---- המקום ----
  var sel = $('tf-city');
  sel.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '<option value="gps" hidden>המיקום שלי</option>';
  function syncSel() { sel.value = CITIES.some(function (c) { return c[0] === st.place; }) ? st.place : 'gps'; }
  sel.addEventListener('change', function () {
    var c = CITIES.filter(function (x) { return x[0] === sel.value; })[0];
    if (c) { st.place = c[0]; st.name = c[1]; save(); draw(); plan(); }
  });
  $('tf-gps').addEventListener('click', function () {
    var s = $('tf-gps-msg');
    if (!navigator.geolocation) { s.textContent = 'הדפדפן הזה לא נותן מיקום. בחרו עיר מהרשימה.'; return; }
    s.textContent = 'מחפש מיקום…';
    navigator.geolocation.getCurrentPosition(function (p) {
      st.place = p.coords.latitude.toFixed(3) + ',' + p.coords.longitude.toFixed(3); st.name = 'המיקום שלי';
      save(); syncSel(); s.textContent = 'המיקום נשמר בטלפון בלבד ✓'; draw(); plan(); used('gps');
    }, function () { s.textContent = 'לא קיבלתי מיקום. צריך לאשר מיקום לדפדפן, או לבחור עיר מהרשימה.'; }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  });

  // ---- המצב של היום ----
  function today() {
    var d = new Date(), z = zm(d), k = dayKind(d);
    return { d: d, k: k, ss: z.sunset(), msh: z.misheyakir(), done: st.done[iso(d)] };
  }
  function draw() {
    if (!H) return;
    var x = today(), now = new Date(), box = $('tf-status'), tm = $('tf-times'), btn = $('tf-done');
    box.className = 'tf-status';
    if (x.k.off) {
      box.classList.add('off'); box.innerHTML = '<b>היום ' + x.k.why + '</b><span>לא מניחים תפילין. שבת שלום, חג שמח.</span>';
      btn.hidden = true;
    } else if (x.done) {
      box.classList.add('ok'); box.innerHTML = '<b>✓ הנחת תפילין היום</b><span>סומן בשעה ' + x.done + '. יישר כוח!</span>';
      btn.hidden = false; btn.textContent = 'לבטל את הסימון'; btn.classList.add('ghost');
    } else if (now > x.ss) {
      box.classList.add('late'); box.innerHTML = '<b>השקיעה עברה (' + t(x.ss) + ')</b><span>מחר בבוקר מתחילים מחדש. מי שלא הספיק – שואלים רב מה עושים אחרי השקיעה.</span>';
      btn.hidden = false; btn.textContent = 'הנחתי היום ✓'; btn.classList.remove('ghost');
    } else {
      var m = x.ss - now;
      box.classList.add(m < 3600000 ? 'urgent' : 'todo');
      box.innerHTML = '<b>היום עוד לא הנחת תפילין</b><span>עד השקיעה נשארו <strong>' + left(m) + '</strong></span>' +
        (x.k.av ? '<span>בתשעה באב מניחים תפילין במנחה, לא בבוקר.</span>' : '') +
        (x.k.moed ? '<span>' + x.k.why + ': בארץ ישראל רוב הנוהגים לא מניחים. כל אחד לפי מנהגו.</span>' : '');
      btn.hidden = false; btn.textContent = 'הנחתי תפילין ✓'; btn.classList.remove('ghost');
    }
    tm.innerHTML = '<span>' + (st.name || 'המקום') + '</span><span>מאיזו שעה (משיכיר): <bdi>' + t(x.msh) + '</bdi></span><span>שקיעה: <bdi>' + t(x.ss) + '</bdi></span>';
    // שבוע אחרון
    var w = '', d0 = add(new Date(), -6), names = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    for (var i = 0; i < 7; i++) {
      var d = add(d0, i), off = dayKind(d).off, ok = st.done[iso(d)], isT = i === 6;
      w += '<span class="tf-d' + (off ? ' off' : ok ? ' ok' : isT ? ' now' : ' miss') + '" title="' + iso(d) + '"><i>' + names[d.getDay()] + '</i>' + (off ? '–' : ok ? '✓' : isT ? '•' : '') + '</span>';
    }
    $('tf-week').innerHTML = w;
    var s = streak();
    $('tf-streak').textContent = s ? 'רצף: ' + s + (s === 1 ? ' יום' : ' ימים') + ' (שבתות וחגים לא שוברים את הרצף)' : 'כל יום שמסמנים נכנס לרצף. שבתות וחגים לא שוברים אותו.';
    lockCheck();
  }
  $('tf-done').addEventListener('click', function () {
    var k = iso(new Date());
    if (st.done[k]) { delete st.done[k]; } else { st.done[k] = t(new Date()); used('done'); }
    save(); draw(); unlock();
  });

  // ---- הגדרות התזכורת ----
  var F = { morningOn: 'tf-m-on', morning: 'tf-m', noonOn: 'tf-n-on', noon: 'tf-n', before: 'tf-before', lock: 'tf-lock-on', checked: 'tf-checked' };
  Object.keys(F).forEach(function (k) {
    var el = $(F[k]); if (!el) return;
    if (el.type === 'checkbox') el.checked = !!st[k]; else el.value = st[k];
    el.addEventListener('change', function () {
      st[k] = el.type === 'checkbox' ? el.checked : (k === 'before' ? +el.value : el.value);
      save(); plan(); drawCheck(); if (k === 'lock') { if (el.checked) used('lock'); lockCheck(); }
    });
  });
  function drawCheck() {
    var o = $('tf-check-msg'); if (!o) return;
    if (!st.checked) { o.textContent = ''; return; }
    var p = st.checked.split('-'), due = new Date(+p[0], +p[1] - 1 + 42, 1);
    o.textContent = 'הבדיקה הבאה (פעמיים בשבע שנים): בערך ' + (due.getMonth() + 1) + '/' + due.getFullYear() + (due < new Date() ? ' – כבר הגיע הזמן ✋' : '');
  }

  // ---- יומן: קובץ ics לחצי שנה, לפי השקיעה במקום שבחרתם ----
  function z2(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function esc(s) { return String(s).replace(/([,;\\])/g, '\\$1'); }
  function ev(uid, start, mins, title, note) {
    return ['BEGIN:VEVENT', 'UID:' + uid + '@hakelim.com', 'DTSTAMP:' + z2(new Date()), 'DTSTART:' + z2(start), 'DTEND:' + z2(new Date(start.getTime() + mins * 60000)),
      'SUMMARY:' + esc(title), 'DESCRIPTION:' + esc(note) + '\\n' + esc('הסדר המלא: https://hakelim.com/kodesh/tefillin/'), 'URL:https://hakelim.com/kodesh/tefillin/', 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(title), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].join('\r\n');
  }
  function ics() {
    var out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//tefillin//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:תזכורת תפילין'], d = new Date(), n = 0;
    for (var i = 0; i < 183; i++) {
      var day = add(d, i), k = dayKind(day);
      if (k.off) continue;
      var ss = zm(day).sunset(), id = iso(day).replace(/-/g, '');
      if (st.morningOn && !k.av) { var m = hm(st.morning, day); if (m > d) { out.push(ev('tf-m-' + id, m, 10, 'תפילין 🙏', 'בוקר טוב! הנחתם תפילין? השקיעה היום ב-' + t(ss))); n++; } }
      if (st.noonOn) { var nn = hm(st.noon, day); if (nn > d && nn < ss) { out.push(ev('tf-n-' + id, nn, 10, 'תפילין – תזכורת צהריים', 'אם עוד לא הנחתם, יש זמן עד ' + t(ss))); n++; } }
      var b = new Date(ss.getTime() - (+st.before || 30) * 60000);
      if (b > d) { out.push(ev('tf-s-' + id, b, 15, 'תפילין – ' + (+st.before || 30) + ' דק׳ לשקיעה (' + t(ss) + ')', 'עוד לא הנחתם? זה הזמן. השקיעה ב-' + t(ss))); n++; }
    }
    var end = hm('20:00', add(d, 180));
    out.push(ev('tf-renew-' + iso(end), end, 10, 'לחדש את תזכורת התפילין', 'נגמרה חצי שנה. נכנסים לדף ולוחצים שוב "להוסיף ליומן".'));
    out.push('END:VCALENDAR');
    return { text: out.join('\r\n'), n: n };
  }
  $('tf-ics').addEventListener('click', function () {
    var r = ics(), blob = new Blob([r.text], { type: 'text/calendar;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'tefillin-tizkoret.ics'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    $('tf-ics-msg').textContent = 'נוצרו ' + r.n + ' תזכורות לחצי שנה, לפי השקיעה ב' + (st.name || 'מקום שבחרתם') + '. פותחים את הקובץ שירד, ו"להוסיף הכול" ליומן.';
    used('ics');
  });

  // ---- התראות בזמן שהדף פתוח (או מותקן במסך הבית) ----
  var timers = [];
  function notify(title, body) {
    var opt = { body: body, icon: '/assets/apple-touch-icon.png', tag: 'tefillin', renotify: true, data: { url: '/kodesh/tefillin/' } };
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.showNotification(title, opt); else new Notification(title, opt); }).catch(function () { try { new Notification(title, opt); } catch (e) {} });
      else new Notification(title, opt);
    } catch (e) {}
  }
  function plan() {
    timers.forEach(clearTimeout); timers = [];
    if (!H || !('Notification' in window) || Notification.permission !== 'granted') return;
    var x = today(); if (x.k.off) return;
    var now = Date.now(), list = [];
    if (st.morningOn) list.push([hm(st.morning, x.d), 'בוקר טוב! הנחת תפילין?']);
    if (st.noonOn) list.push([hm(st.noon, x.d), 'תזכורת צהריים: תפילין']);
    list.push([new Date(x.ss.getTime() - (+st.before || 30) * 60000), 'עוד ' + (+st.before || 30) + ' דק׳ לשקיעה – תפילין']);
    list.forEach(function (it) {
      var ms = it[0] - now; if (ms <= 0 || ms > 86400000) return;
      timers.push(setTimeout(function () { if (!st.done[iso(new Date())]) { notify(it[1], 'השקיעה היום ב-' + t(x.ss) + '. הסדר המלא בדף.'); lockCheck(); } draw(); }, ms));
    });
  }
  var nb = $('tf-notif');
  if (!('Notification' in window)) { nb.hidden = true; } else {
    function nbUi() { nb.textContent = Notification.permission === 'granted' ? '🔔 התראות פועלות ✓' : '🔔 להפעיל התראות בטלפון'; }
    nbUi();
    nb.addEventListener('click', function () {
      Notification.requestPermission().then(function (p) { nbUi(); plan(); if (p === 'granted') { used('notif'); notify('תזכורת התפילין פועלת ✓', 'כשהאתר פתוח או מותקן במסך הבית, תקבלו כאן התראה.'); } else $('tf-ics-msg').textContent = 'ההתראות חסומות בדפדפן. אפשר להשתמש ביומן – הוא עובד תמיד.'; });
    });
  }

  // ---- מסך "נעילה": כשנכנסים לדף/לאפליקציה בזמן שבחרתם ועוד לא הנחתם ----
  var lk = $('tf-lock'), snoozeUntil = 0;
  function lockWanted() {
    if (!st.lock || !H) return false;
    var x = today(), now = new Date();
    if (x.k.off || x.done || now > x.ss || now < snoozeUntil) return false;
    var from = st.morningOn ? hm(st.morning, x.d) : x.msh;
    return now >= from;
  }
  function lockCheck() {
    if (!lk) return;
    var on = lockWanted();
    if (on && lk.hidden) {
      var x = today();
      $('tf-lock-ss').textContent = 'השקיעה היום ב-' + t(x.ss) + ' · נשארו ' + left(x.ss - new Date());
      lk.hidden = false; document.documentElement.classList.add('tf-locked');
      setTimeout(function () { var b = $('tf-lock-done'); if (b) b.focus(); }, 50);
    } else if (!on && !lk.hidden) unlock();
  }
  function unlock() { if (!lk) return; lk.hidden = true; document.documentElement.classList.remove('tf-locked'); }
  if (lk) {
    $('tf-lock-done').addEventListener('click', function () { st.done[iso(new Date())] = t(new Date()); save(); used('done'); unlock(); draw(); });
    $('tf-lock-read').addEventListener('click', function () { unlock(); snoozeUntil = Date.now() + 20 * 60000; var s = $('tefillin'); if (s) s.scrollIntoView({ behavior: 'instant', block: 'start' }); });
    // "לא עכשיו": צריך להחזיק 3 שניות – כדי שזה יהיה החלטה, לא לחיצה בטעות
    var hold = $('tf-lock-later'), ht = null;
    function hStart(e) { e.preventDefault(); hold.classList.add('holding'); ht = setTimeout(function () { snoozeUntil = Date.now() + 30 * 60000; hold.classList.remove('holding'); unlock(); used('snooze'); }, 3000); }
    function hEnd() { clearTimeout(ht); hold.classList.remove('holding'); }
    hold.addEventListener('pointerdown', hStart); ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { hold.addEventListener(n, hEnd); });
    hold.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { snoozeUntil = Date.now() + 30 * 60000; unlock(); } });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { draw(); plan(); } });
  setInterval(draw, 60000);

  // ---- נוסח, גודל אות ומסך שלא נכבה (כמו בדף הבוקר) ----
  var paper = $('bk-paper'), nst = { n: 'ash', fs: 1.3 };
  try { var bk = JSON.parse(localStorage.getItem('kodesh-boker') || 'null'); if (bk && bk.n) nst.n = bk.n; if (bk && bk.fs) nst.fs = bk.fs; } catch (e) {}
  var seg = [].slice.call(document.querySelectorAll('[data-set-n]'));
  function napply() { paper.setAttribute('data-nusach', nst.n); paper.style.setProperty('--fs', nst.fs + 'rem'); seg.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-set-n') === nst.n ? 'true' : 'false'); }); [].slice.call(document.querySelectorAll('[data-sid]')).forEach(function (a) { a.hidden = a.getAttribute('data-sid') !== nst.n && a.getAttribute('data-sid') !== 'all'; }); }
  function nsave() { try { var bk = JSON.parse(localStorage.getItem('kodesh-boker') || '{}') || {}; bk.n = nst.n; bk.fs = nst.fs; localStorage.setItem('kodesh-boker', JSON.stringify(bk)); } catch (e) {} }
  seg.forEach(function (b) { b.addEventListener('click', function () { nst.n = b.getAttribute('data-set-n'); napply(); nsave(); }); });
  $('bk-plus').addEventListener('click', function () { nst.fs = Math.min(2.4, +(nst.fs + 0.15).toFixed(2)); napply(); nsave(); });
  $('bk-minus').addEventListener('click', function () { nst.fs = Math.max(1, +(nst.fs - 0.15).toFixed(2)); napply(); nsave(); });
  $('bk-dark').addEventListener('click', function () { var on = !paper.classList.contains('dark'); paper.classList.toggle('dark', on); this.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  napply();
  var wakeBtn = $('bk-wake');
  if ('wakeLock' in navigator && wakeBtn) {
    var wl = null, want = false; wakeBtn.hidden = false;
    function wUi() { wakeBtn.setAttribute('aria-pressed', wl ? 'true' : 'false'); wakeBtn.textContent = wl ? '✓ המסך דולק' : 'המסך לא ייכבה'; }
    function req() { navigator.wakeLock.request('screen').then(function (l) { wl = l; wUi(); l.addEventListener('release', function () { wl = null; wUi(); }); }).catch(function () { wl = null; wUi(); }); }
    wakeBtn.addEventListener('click', function () { want = !want; if (want) req(); else if (wl) wl.release(); });
    document.addEventListener('visibilitychange', function () { if (want && !wl && document.visibilityState === 'visible') req(); });
  }

  function start() { H = window.hebcal; syncSel(); draw(); plan(); drawCheck(); }
  if (H) start(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', start); }
  // לבדיקות ב-node / בדף בדיקה
  window.__tf = { ics: ics, dayKind: function (d) { return dayKind(d); }, st: st };
})();
