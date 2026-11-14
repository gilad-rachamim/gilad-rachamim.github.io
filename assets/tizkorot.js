// תזכורות לתרופות ולכל מה שאסור לשכוח.
// הדרך העיקרית: קובץ יומן (.ics) עם חזרה (RRULE) והתראה בזמן (VALARM), או קישור ליומן גוגל – כך ההתראה מגיעה גם כשהדף סגור.
// בדף עצמו: תצוגת "היום" עם סימון, והתראה בדפדפן כל עוד הדף פתוח. הכול נשמר רק בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('tz-form');
  if (!form) return;
  // שני דפים, מנוע אחד ורשימה אחת: תזכורת לתרופות (בריאות) ותזכורת כללית (מחשב וטלפון)
  var GEN = (form.closest('[data-tz-mode]') || form).getAttribute('data-tz-mode') === 'klali';
  var KEY = 'kelim-tizkorot', TOOL = GEN ? 'tizkoret' : 'tizkorot', PAGE = GEN ? 'hakelim.com/kelim/machshev/tizkoret/' : 'hakelim.com/kelim/briut/tizkorot/';
  var KINDS = GEN ? [['📋', 'משימה'], ['📞', 'להתקשר'], ['🎂', 'יום הולדת או אירוע'], ['💳', 'תשלום'], ['💧', 'לשתות'], ['💊', 'תרופה'], ['⭐', 'אחר']]
    : [['💊', 'תרופה'], ['💧', 'לשתות'], ['🩺', 'בדיקה או תור'], ['📋', 'משימה'], ['⭐', 'אחר']];
  var KIND0 = KINDS[0][0];
  var PRESETS = [['08:00', 'בוקר'], ['13:00', 'צהריים'], ['19:00', 'ערב'], ['22:00', 'לפני השינה']];
  var DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'], BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  var TZ = 'Asia/Jerusalem';
  try { TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || TZ; } catch (e) {}

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function dnum(s) { var p = s.split('-'); return Math.round(Date.UTC(+p[0], p[1] - 1, +p[2]) / 864e5); }
  function fromNum(n) { var d = new Date(n * 864e5); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function heDate(s) { var p = s.split('-'); return +p[2] + '.' + +p[1] + '.' + p[0]; }

  // ---------- מצב ושמירה ----------
  var st = { items: [], day: '', took: {}, sent: {}, notif: false, started: false, hist: {}, big: false, voice: false };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  if (!st.hist || typeof st.hist !== 'object') st.hist = {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function fresh() {
    if (st.day === today()) return;
    if (st.day) st.hist[st.day] = st.took; // היסטוריה: מה סומן בכל יום
    var keep = dnum(today()) - 30; Object.keys(st.hist).forEach(function (d) { if (dnum(d) < keep) delete st.hist[d]; });
    st.day = today(); st.took = {}; st.sent = {}; save();
  }
  if (!st.started) { // דוגמה מלאה בכניסה הראשונה
    var t0 = today(), nx = function (dow) { var n = dnum(t0); while (new Date(n * 864e5).getUTCDay() !== dow) n++; return fromNum(n); };
    st.items = GEN ? [
      { id: 'ex1', k: '📋', n: 'להוציא את הזבל', w: '', times: ['20:00'], r: 'w', days: [0, 3], every: 2, s: t0, e: '', o: '', ex: 1 },
      { id: 'ex2', k: '📞', n: 'להתקשר לאמא', w: '', times: ['12:00'], r: 'w', days: [5], every: 2, s: nx(5), e: '', o: 'לפני שבת', ex: 1 },
      { id: 'ex3', k: '💳', n: 'לשלם ועד בית', w: '', times: ['09:00'], r: 'm', days: [], every: 2, s: t0.slice(0, 8) + '10', e: '', o: '', pre: 'P1D', ex: 1 },
      { id: 'ex4', k: '💧', n: 'לשתות כוס מים', w: '', times: ['10:00', '13:00', '16:00'], r: 'd', days: [], every: 2, s: t0, e: '', o: '', ex: 1 }
    ] : [
      { id: 'ex1', k: '💊', n: 'אומפרדקס 20 מ״ג', w: '', times: ['08:00'], r: 'd', days: [], every: 2, s: t0, e: '', o: 'חצי שעה לפני ארוחת הבוקר', stock: 9, again: 1, ex: 1 },
      { id: 'ex2', k: '💧', n: 'לשתות כוס מים', w: 'אבא', times: ['10:00', '13:00', '16:00'], r: 'd', days: [], every: 2, s: t0, e: '', o: '', ex: 1 },
      { id: 'ex3', k: '💊', n: 'ויטמין D', w: '', times: ['20:00'], r: 'w', days: [0, 3], every: 2, s: t0, e: '', o: 'עם האוכל', ex: 1 }
    ];
    st.started = true; save();
  }

  // ---------- חישוב: מתי כל תזכורת פעילה ----------
  function activeOn(it, ds) {
    var n = dnum(ds), s = dnum(it.s);
    if (n < s) return false;
    if (it.e && n > dnum(it.e)) return false;
    if (it.r === 'w') return it.days.indexOf(new Date(n * 864e5).getUTCDay()) >= 0;
    if (it.r === 'n') return (n - s) % Math.max(1, it.every) === 0;
    if (it.r === 'o') return n === s;
    if (it.r === 'm' || it.r === 'y') {
      var a = new Date(n * 864e5), b = new Date(s * 864e5);
      return a.getUTCDate() === b.getUTCDate() && (it.r === 'm' || a.getUTCMonth() === b.getUTCMonth());
    }
    return true;
  }
  function firstDay(it) { // יום ההתחלה האמיתי (בימים מסוימים: היום הראשון שמתאים)
    var s = dnum(it.s);
    if (it.r === 'w' && it.days.length) { for (var i = 0; i < 7; i++) if (it.days.indexOf(new Date((s + i) * 864e5).getUTCDay()) >= 0) return fromNum(s + i); }
    return it.s;
  }
  function whenText(it) {
    var t = 'ב-' + it.times.map(function (x) { return '<bdi dir="ltr">' + x + '</bdi>'; }).join(', ');
    var r = it.r === 'w' ? 'בימים ' + it.days.slice().sort().map(function (d) { return DAYS[d]; }).join(' ') :
      it.r === 'n' ? 'כל ' + it.every + ' ימים' : it.r === 'o' ? 'פעם אחת, ' + heDate(it.s) :
      it.r === 'm' ? 'כל חודש ב-' + +it.s.split('-')[2] + ' בחודש' : it.r === 'y' ? 'כל שנה ב-' + +it.s.split('-')[2] + '.' + +it.s.split('-')[1] : 'כל יום';
    var PRE = { PT15M: 'רבע שעה', PT1H: 'שעה', P1D: 'יום', P7D: 'שבוע' };
    if (it.pre && PRE[it.pre]) t += ' · וגם ' + PRE[it.pre] + ' לפני';
    var range = it.r === 'o' ? '' : (dnum(it.s) > dnum(today()) ? ' · מתחיל ' + heDate(it.s) : '') + (it.e ? ' · עד ' + heDate(it.e) : '');
    return r + ' ' + t + range;
  }
  function title(it) { return it.k + ' ' + it.n + (it.w ? ' – ' + it.w : ''); }
  function doneWord(it) { return it.k === '💊' ? 'נלקח' : 'בוצע'; }

  // ---------- קובץ יומן (ics) ----------
  var VTZ_IL = ['BEGIN:VTIMEZONE', 'TZID:Asia/Jerusalem',
    'BEGIN:STANDARD', 'DTSTART:19701025T020000', 'TZOFFSETFROM:+0300', 'TZOFFSETTO:+0200', 'TZNAME:IST', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'BEGIN:DAYLIGHT', 'DTSTART:19700327T020000', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0300', 'TZNAME:IDT', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=23,24,25,26,27,28,29;BYDAY=FR', 'END:DAYLIGHT',
    'END:VTIMEZONE'];
  var IL = TZ === 'Asia/Jerusalem';
  function icsText(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) { // שורה בקובץ יומן: עד 75 בתים, המשך מתחיל ברווח
    var out = [], cur = '', bytes = 0;
    for (var ch of line) {
      var c = ch.codePointAt(0), b = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
      if (bytes + b > (out.length ? 73 : 74)) { out.push(cur); cur = ''; bytes = 0; }
      cur += ch; bytes += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  }
  function stamp(ds, hm) { return ds.replace(/-/g, '') + 'T' + hm.replace(':', '') + '00'; }
  function plusMin(ds, hm, m) { var p = ds.split('-'), q = hm.split(':'); var d = new Date(+p[0], p[1] - 1, +p[2], +q[0], +q[1] + m); return ymd(d).replace(/-/g, '') + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function until(it) { // RFC 5545: כשיש אזור זמן – UNTIL ב-UTC
    var p = it.e.split('-'), d = new Date(+p[0], p[1] - 1, +p[2], 23, 59, 59);
    return IL ? d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '') : it.e.replace(/-/g, '') + 'T235959';
  }
  function rrule(it) {
    if (it.r === 'o') return '';
    var r = it.r === 'w' ? 'FREQ=WEEKLY;BYDAY=' + it.days.slice().sort().map(function (d) { return BYDAY[d]; }).join(',') :
      it.r === 'n' ? 'FREQ=DAILY;INTERVAL=' + Math.max(1, it.every) :
      it.r === 'm' ? 'FREQ=MONTHLY;BYMONTHDAY=' + +it.s.split('-')[2] : it.r === 'y' ? 'FREQ=YEARLY' : 'FREQ=DAILY';
    return 'RRULE:' + r + (it.e ? ';UNTIL=' + until(it) : '');
  }
  function dt(prop, val) { return IL ? prop + ';TZID=Asia/Jerusalem:' + val : prop + ':' + val; }
  function events(it) {
    var fd = firstDay(it), now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var desc = (it.o ? it.o + '\n' : '') + 'תזכורת מ-' + PAGE;
    return it.times.map(function (hm) {
      var L = ['BEGIN:VEVENT', 'UID:' + it.id + '-' + hm.replace(':', '') + '@hakelim.com', 'DTSTAMP:' + now,
        dt('DTSTART', stamp(fd, hm)), dt('DTEND', plusMin(fd, hm, 5))];
      var rr = rrule(it); if (rr) L.push(rr);
      L.push('SUMMARY:' + icsText(title(it)), 'DESCRIPTION:' + icsText(desc), 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(title(it)), 'TRIGGER:-PT0M', 'END:VALARM');
      if (it.pre && /^P(T\d+[MH]|\d+D)$/.test(it.pre)) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText('בקרוב: ' + title(it)), 'TRIGGER:-' + it.pre, 'END:VALARM'); // תזכורת מראש
      if (it.again) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText('שוב: ' + title(it)), 'TRIGGER:PT10M', 'END:VALARM'); // תזכורת שנייה אחרי 10 דקות
      L.push('END:VEVENT');
      return L;
    }).reduce(function (a, b) { return a.concat(b); }, []).concat(it.refill ? [ // אירוע חד-פעמי: לחדש מרשם
      'BEGIN:VEVENT', 'UID:' + it.id + '-refill@hakelim.com', 'DTSTAMP:' + now, dt('DTSTART', stamp(it.refill, '10:00')), dt('DTEND', plusMin(it.refill, '10:00', 15)),
      'SUMMARY:' + icsText('🧾 לחדש מרשם: ' + it.n + (it.w ? ' – ' + it.w : '')), 'DESCRIPTION:' + icsText('לבקש מרשם חדש מהרופא או בקופה. תזכורת מ-' + PAGE), 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText('לחדש מרשם: ' + it.n), 'TRIGGER:-PT0M', 'END:VALARM', 'END:VEVENT'] : []);
  }
  function ics(items) {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//tizkorot//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    if (IL) L = L.concat(VTZ_IL);
    items.forEach(function (it) { L = L.concat(events(it)); });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  window.tzIcs = function () { return ics(st.items); }; // לבדיקה
  var IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function download(items, name) {
    var body = ics(items);
    if (IOS) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body); return; } // באייפון נפתח ישר "להוסיף ליומן"
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
    a.download = name + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function gcal(it, hm) {
    var fd = firstDay(it), rr = rrule(it);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title(it)) +
      '&dates=' + stamp(fd, hm) + '/' + plusMin(fd, hm, 5) + '&ctz=' + encodeURIComponent(TZ) +
      '&details=' + encodeURIComponent((it.o ? it.o + '\n' : '') + 'תזכורת מ-' + PAGE) + (rr ? '&recur=' + encodeURIComponent(rr) : '');
  }

  // ---------- הטופס ----------
  var kind = KIND0, times = [], editId = null;
  $('tz-kinds').innerHTML = KINDS.map(function (k) { return '<button type="button" data-kind="' + k[0] + '" aria-pressed="false">' + k[0] + ' ' + k[1] + '</button>'; }).join('');
  $('tz-presets').innerHTML = PRESETS.map(function (p) { return '<button type="button" data-hm="' + p[0] + '" aria-pressed="false">' + p[1] + ' <bdi dir="ltr">' + p[0] + '</bdi></button>'; }).join('');
  $('tz-days').innerHTML = DAYS.map(function (d, i) { return '<button type="button" data-day="' + i + '" aria-pressed="false" aria-label="יום ' + d + '">' + d + '</button>'; }).join('');
  function paintForm() {
    form.querySelectorAll('[data-kind]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-kind') === kind ? 'true' : 'false'); });
    form.querySelectorAll('[data-hm]').forEach(function (b) { b.setAttribute('aria-pressed', times.indexOf(b.getAttribute('data-hm')) >= 0 ? 'true' : 'false'); });
    times.sort();
    $('tz-picked').innerHTML = times.length ? times.map(function (t) { return '<span><bdi dir="ltr">' + t + '</bdi><button type="button" data-unhm="' + t + '" aria-label="להוריד את השעה ' + t + '">×</button></span>'; }).join('') : '<small class="note">עוד לא נבחרה שעה</small>';
    var r = $('tz-rep').value;
    $('tz-days-f').classList.toggle('tz-hide', r !== 'w');
    $('tz-every-f').classList.toggle('tz-hide', r !== 'n');
    $('tz-end-f').classList.toggle('tz-hide', r === 'o');
    $('tz-start-l').textContent = r === 'o' ? 'באיזה תאריך?' : r === 'm' ? 'מתאריך (היום בחודש נקבע לפיו)' : r === 'y' ? 'איזה תאריך בשנה?' : 'מתחילים מתאריך';
  }
  function resetForm() {
    editId = null; kind = KIND0; times = []; $('tz-pre').value = '';
    ['tz-name', 'tz-who', 'tz-note', 'tz-end', 'tz-time', 'tz-stock', 'tz-refill'].forEach(function (id) { $(id).value = ''; });
    $('tz-again').checked = false;
    $('tz-rep').value = 'd'; $('tz-every').value = '2'; $('tz-start').value = today();
    form.querySelectorAll('[data-day]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    $('tz-save').textContent = 'לשמור את התזכורת'; $('tz-cancel').classList.add('tz-hide');
    paintForm();
  }
  form.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-kind')) { kind = b.getAttribute('data-kind'); paintForm(); }
    else if (b.hasAttribute('data-hm')) { var h = b.getAttribute('data-hm'), i = times.indexOf(h); if (i >= 0) times.splice(i, 1); else times.push(h); paintForm(); }
    else if (b.hasAttribute('data-unhm')) { times.splice(times.indexOf(b.getAttribute('data-unhm')), 1); paintForm(); }
    else if (b.hasAttribute('data-day')) { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }
    else if (b.id === 'tz-addtime') { var v = $('tz-time').value; if (/^\d\d:\d\d$/.test(v) && times.indexOf(v) < 0) times.push(v); $('tz-time').value = ''; paintForm(); }
    else if (b.id === 'tz-cancel') { resetForm(); }
  });
  $('tz-rep').addEventListener('change', paintForm);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('tz-fmsg'), n = $('tz-name').value.trim(), r = $('tz-rep').value;
    var tv = $('tz-time').value; if (/^\d\d:\d\d$/.test(tv) && times.indexOf(tv) < 0) { times.push(tv); $('tz-time').value = ''; }
    var days = []; form.querySelectorAll('[data-day]').forEach(function (b) { if (b.getAttribute('aria-pressed') === 'true') days.push(+b.getAttribute('data-day')); });
    var s = $('tz-start').value || today(), en = r === 'o' ? '' : $('tz-end').value;
    if (!n) { msg.textContent = 'חסר: מה להזכיר?'; $('tz-name').focus(); return; }
    if (!times.length) { msg.textContent = 'חסרה שעה. בוחרים בוקר / צהריים / ערב, או שעה אחרת.'; return; }
    if (r === 'w' && !days.length) { msg.textContent = 'חסר: באילו ימים בשבוע?'; return; }
    if (en && dnum(en) < dnum(s)) { msg.textContent = 'תאריך הסיום לפני תאריך ההתחלה.'; return; }
    var it = { id: editId || 't' + Date.now().toString(36), k: kind, n: n, w: $('tz-who').value.trim(), times: times.slice().sort(), r: r, days: days,
      every: Math.min(60, Math.max(2, +$('tz-every').value || 2)), s: s, e: en, o: $('tz-note').value.trim(),
      again: $('tz-again').checked ? 1 : 0, refill: $('tz-refill').value || '', pre: $('tz-pre').value || '' };
    var sk = $('tz-stock').value.trim(); if (sk !== '' && +sk >= 0) it.stock = Math.min(9999, Math.round(+sk));
    var hadEx = st.items.some(function (x) { return x.ex; });
    st.items = st.items.filter(function (x) { return !x.ex && x.id !== it.id; }); // הדוגמה יורדת כשמוסיפים תזכורת אמיתית
    st.items.push(it);
    save(); draw();
    msg.textContent = (editId ? 'עודכן ✓ ' : 'נשמר ✓ ') + n + (hadEx ? ' (הדוגמה ירדה)' : '') + '. עכשיו מוסיפים ליומן – הכפתורים ליד התזכורת למטה.';
    if (!editId) use('add');
    resetForm();
    var li = document.querySelector('[data-item="' + it.id + '"]'); if (li) li.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  // ---------- תצוגה ----------
  function nowHm() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function occToday() {
    var ds = today(), out = [];
    st.items.forEach(function (it) { if (activeOn(it, ds)) it.times.forEach(function (hm) { out.push({ it: it, hm: hm, key: it.id + '@' + hm }); }); });
    return out.sort(function (a, b) { return a.hm < b.hm ? -1 : a.hm > b.hm ? 1 : 0; });
  }
  var waText = '';
  function draw() {
    fresh();
    var occ = occToday(), now = nowHm(), done = 0, next = null;
    var rows = occ.map(function (o) {
      var ok = !!st.took[o.key], due = !ok && o.hm <= now;
      if (ok) done++; else if (!due && !next) next = o;
      var stt = ok ? '✓ ' + doneWord(o.it) : due ? '⏰ הגיע הזמן' : '';
      return '<li class="' + (ok ? 'done' : due ? 'due' : '') + '"><label><input type="checkbox" data-took="' + esc(o.key) + '"' + (ok ? ' checked' : '') + ' aria-label="' + esc(doneWord(o.it) + ': ' + o.it.n + ' ב-' + o.hm) + '"><span class="tm">' + o.hm + '</span><span><b>' + esc(title(o.it)) + '</b>' + (stt || o.it.o ? '<small>' + esc([stt, o.it.o].filter(Boolean).join(' · ')) + '</small>' : '') + '</span></label></li>';
    }).join('');
    var ex = st.items.some(function (x) { return x.ex; });
    $('tz-today').innerHTML = '<h3>היום, ' + new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' }) + (occ.length ? ' · ' + done + ' מתוך ' + occ.length + (done === occ.length ? ' ✓' : '') : '') + '</h3>' +
      (ex ? '<p class="tz-banner">זו דוגמה, כדי לראות איך זה נראה. <button type="button" id="tz-clear-ex">למחוק את הדוגמה ולהתחיל</button></p>' : '') +
      (rows ? '<ul>' + rows + '</ul>' : '<p class="note">היום אין תזכורות. מוסיפים למטה.</p>') +
      (next ? '<p class="note">הבאה: <bdi dir="ltr">' + next.hm + '</bdi> – ' + esc(title(next.it)) + '</p>' : '');
    // הרשימה
    $('tz-items').innerHTML = st.items.length ? st.items.map(function (it) {
      var g = it.times.map(function (hm) { return '<a class="btn btn-line btn-sm" href="' + esc(gcal(it, hm)) + '" target="_blank" rel="noopener" data-gcal="1">📅 ליומן גוגל' + (it.times.length > 1 ? ' <bdi dir="ltr">' + hm + '</bdi>' : '') + '</a>'; }).join('');
      var left = daysLeft(it);
      var stock = it.stock == null ? '' : '<div class="o' + (left != null && left <= 7 ? ' low' : '') + '">' + (it.stock === 0 ? '⚠️ נגמרה הקופסה' : '📦 נשארו ' + it.stock + (left != null ? ' · מספיק לעוד כ-' + left + ' ימים' : '')) + (left != null && left <= 7 ? ' – זה הזמן לקנות או לחדש מרשם' : '') + '</div>';
      var refill = it.refill ? '<div class="o">🧾 לחדש מרשם: ' + heDate(it.refill) + ' (נכנס ליומן עם התזכורת)</div>' : '';
      return '<li data-item="' + it.id + '"><div class="t">' + esc(title(it)) + '</div><div class="w">' + whenText(it) + (it.again ? ' · ושוב אחרי 10 דקות' : '') + '</div>' + (it.o ? '<div class="o">' + esc(it.o) + '</div>' : '') + stock + refill +
        '<div class="tz-acts"><button type="button" class="btn btn-gold btn-sm" data-ics="' + it.id + '">📲 להוסיף ליומן בטלפון</button>' + g +
        '<button type="button" class="lnk" data-edit="' + it.id + '">לערוך</button><button type="button" class="lnk" data-del="' + it.id + '">למחוק</button></div></li>';
    }).join('') : '<li><p class="note">אין עדיין תזכורות.</p></li>';
    $('tz-all').classList.toggle('tz-hide', st.items.length < 2);
    var who = st.items.length && st.items.every(function (x) { return x.w && x.w === st.items[0].w; }) ? st.items[0].w : '';
    waText = '⏰ התזכורות' + (who ? ' של ' + who : '') + '\n\n' + st.items.map(function (it) {
      return '▫️ ' + title(it) + ' – ' + whenText(it).replace(/<[^>]+>/g, '') + (it.o ? ' (' + it.o + ')' : '');
    }).join('\n') + '\n\nלהוסיף ליומן עם התראה: https://' + PAGE;
    $('tz-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(waText);
    // עדכון למשפחה: מה כבר נלקח היום ומה עוד לא
    var fam = '✅ עדכון להיום' + (who ? ' (' + who + ')' : '') + '\n\n' + (occ.length ? occ.map(function (o) {
      return (st.took[o.key] ? '✓ ' : '⏳ ') + o.hm + ' ' + o.it.n + (st.took[o.key] ? ' – ' + doneWord(o.it) : ' – עוד לא');
    }).join('\n') : 'היום אין תזכורות.') + '\n\n' + done + ' מתוך ' + occ.length;
    $('tz-fam').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(fam);
    $('tz-fam').classList.toggle('tz-hide', !occ.length);
    drawHist(); drawSheet();
    paintNotif(); paintPrefs();
  }
  function perDay(it) { // כמה מנות ביום, בממוצע
    var n = it.times.length;
    return it.r === 'w' ? n * it.days.length / 7 : it.r === 'n' ? n / Math.max(1, it.every) : it.r === 'o' ? 0 : it.r === 'm' ? n / 30 : it.r === 'y' ? n / 365 : n;
  }
  function daysLeft(it) { var p = perDay(it); return it.stock == null || !p ? null : Math.floor(it.stock / p); }
  function dayStat(ds) { // כמה היו וכמה סומנו ביום מסוים
    var marks = ds === today() ? st.took : (st.hist[ds] || {}), tot = 0, ok = 0;
    st.items.forEach(function (it) { if (!it.ex && activeOn(it, ds)) it.times.forEach(function (hm) { tot++; if (marks[it.id + '@' + hm]) ok++; }); });
    return [ok, tot];
  }
  function drawHist() {
    var first = Object.keys(st.hist).concat([today()]).reduce(function (a, b) { return dnum(a) < dnum(b) ? a : b; });
    var t = dnum(today()), rows = [], sOk = 0, sTot = 0;
    for (var n = t; n > t - 14 && n >= dnum(first); n--) {
      var ds = fromNum(n), r = dayStat(ds); if (!r[1]) continue;
      if (n < t) { sOk += r[0]; sTot += r[1]; }
      var full = r[0] === r[1];
      rows.push('<li class="' + (full ? 'full' : r[0] ? 'part' : 'none') + '"><span>' + (n === t ? 'היום' : new Date(n * 864e5).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' })) + '</span><b>' + r[0] + '/' + r[1] + (full ? ' ✓' : '') + '</b></li>');
    }
    $('tz-hist').innerHTML = rows.length > 1 ? '<p class="note">' + (sTot ? 'בימים שעברו סומנו ' + sOk + ' מתוך ' + sTot + ' (' + Math.round(100 * sOk / sTot) + '%). כל יום הוא התחלה חדשה.' : '') + '</p><ul class="tz-hist">' + rows.join('') + '</ul>'
      : '<p class="note">כאן יופיע מה סומן בכל יום, ב-14 הימים האחרונים. ההיסטוריה נשמרת רק בטלפון הזה.</p>';
  }
  function drawSheet() { // לוח שבועי להדפסה למקרר
    var t = dnum(today()), ds = []; for (var i = 0; i < 7; i++) ds.push(fromNum(t + i));
    var rows = [];
    st.items.forEach(function (it) { it.times.forEach(function (hm) {
      if (!ds.some(function (d) { return activeOn(it, d); })) return;
      rows.push([hm, '<tr><th><b>' + hm + '</b> ' + esc(title(it)) + (it.o ? '<small>' + esc(it.o) + '</small>' : '') + '</th>' + ds.map(function (d) { return '<td>' + (activeOn(it, d) ? '☐' : '–') + '</td>'; }).join('') + '</tr>']);
    }); });
    rows.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
    $('tz-sheet').innerHTML = '<h2>⏰ התזכורות לשבוע' + (who0() ? ' – ' + esc(who0()) : '') + '</h2><p>מסמנים ✓ בכל פעם שלוקחים. ' + heDate(ds[0]) + ' עד ' + heDate(ds[6]) + '</p>' +
      '<table><tr><th></th>' + ds.map(function (d) { return '<th>' + DAYS[new Date(dnum(d) * 864e5).getUTCDay()] + '<br><small>' + +d.split('-')[2] + '.' + +d.split('-')[1] + '</small></th>'; }).join('') + '</tr>' + rows.map(function (r) { return r[1]; }).join('') + '</table>' +
      '<p class="ft">hakelim.com/kelim/briut/tizkorot · הכלי עוזר לזכור ולא נותן ייעוץ רפואי</p>';
  }
  function who0() { return st.items.length && st.items.every(function (x) { return x.w && x.w === st.items[0].w; }) ? st.items[0].w : ''; }
  function use(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }

  $('tz-today').addEventListener('change', function (e) {
    var k = e.target.getAttribute('data-took'); if (!k) return;
    var it = st.items.filter(function (x) { return x.id === k.split('@')[0]; })[0];
    if (e.target.checked) { st.took[k] = 1; if (it && it.stock != null && it.stock > 0) it.stock--; }
    else { delete st.took[k]; if (it && it.stock != null) it.stock++; }
    save(); draw();
    if (e.target.checked) { var f = document.querySelector('[data-took="' + k.replace(/"/g, '') + '"]'); if (f) f.focus(); }
  });
  $('tz-today').addEventListener('click', function (e) {
    if (e.target.id !== 'tz-clear-ex') return;
    st.items = st.items.filter(function (x) { return !x.ex; }); save(); draw(); $('tz-name').focus();
  });
  $('tz-items').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ics],[data-edit],[data-del],[data-gcal]'); if (!b) return;
    var id = b.getAttribute('data-ics') || b.getAttribute('data-edit') || b.getAttribute('data-del');
    var it = st.items.filter(function (x) { return x.id === id; })[0];
    if (b.hasAttribute('data-gcal')) { use('gcal'); return; }
    if (!it) return;
    if (b.hasAttribute('data-ics')) { download([it], 'tizkoret'); use('ics'); $('tz-after').classList.remove('tz-hide'); }
    else if (b.hasAttribute('data-del')) { if (confirm('למחוק את התזכורת "' + it.n + '"?\nאם הוספתם אותה ליומן, מוחקים אותה גם שם.')) { st.items = st.items.filter(function (x) { return x.id !== id; }); save(); draw(); } }
    else if (b.hasAttribute('data-edit')) {
      editId = it.id; kind = it.k; times = it.times.slice();
      $('tz-name').value = it.n; $('tz-who').value = it.w; $('tz-note').value = it.o; $('tz-rep').value = it.r;
      $('tz-every').value = it.every; $('tz-start').value = it.s; $('tz-end').value = it.e;
      $('tz-stock').value = it.stock == null ? '' : it.stock; $('tz-refill').value = it.refill || ''; $('tz-again').checked = !!it.again; $('tz-pre').value = it.pre || '';
      if (it.stock != null || it.refill || it.again || it.pre) $('tz-more').open = true;
      form.querySelectorAll('[data-day]').forEach(function (x) { x.setAttribute('aria-pressed', it.days.indexOf(+x.getAttribute('data-day')) >= 0 ? 'true' : 'false'); });
      $('tz-save').textContent = 'לשמור את השינוי'; $('tz-cancel').classList.remove('tz-hide');
      paintForm(); form.scrollIntoView({ behavior: 'smooth' }); $('tz-name').focus();
    }
  });
  $('tz-all').addEventListener('click', function () { download(st.items, 'tizkorot'); use('ics_all'); $('tz-after').classList.remove('tz-hide'); });
  $('tz-wa').addEventListener('click', function () { use('wa'); });

  // ---------- ייבוא מ"התרופות שלי" ----------
  (function () {
    var tf = null; try { tf = JSON.parse(localStorage.getItem('kelim-trufot') || 'null'); } catch (e) {}
    if (!tf || !tf.meds || !tf.meds.length || !$('tz-import')) return;
    var MAP = { b: '08:00', c: '13:00', e: '19:00', l: '22:00' };
    $('tz-import').classList.remove('tz-hide');
    $('tz-import-n').textContent = tf.meds.length;
    $('tz-import-b').addEventListener('click', function () {
      var have = {}; st.items.forEach(function (x) { have[x.n] = 1; });
      var add = tf.meds.filter(function (m) { return m.t && !have[m.n + (m.d ? ' ' + m.d : '')]; }).map(function (m, i) {
        return { id: 'f' + Date.now().toString(36) + i, k: '💊', n: m.n + (m.d ? ' ' + m.d : ''), w: '', times: m.t.split('').map(function (c) { return MAP[c]; }).filter(Boolean),
          r: 'd', days: [], every: 2, s: today(), e: '', o: m.o || '' };
      });
      if (add.length) st.items = st.items.filter(function (x) { return !x.ex; }).concat(add);
      save(); draw(); use('import');
      $('tz-import-msg').textContent = add.length ? (add.length === 1 ? 'נוספה תרופה אחת' : 'נוספו ' + add.length + ' תרופות') + ' ✓ השעות לפי בוקר 08:00, צהריים 13:00, ערב 19:00, לילה 22:00 – אפשר לערוך.' : 'כל התרופות כבר כאן.';
    });
  })();

  // ---------- התראה בדפדפן כשהדף פתוח ----------
  var hasN = 'Notification' in window;
  function paintNotif() {
    var b = $('tz-notif'), m = $('tz-nmsg');
    if (!hasN) { b.classList.add('tz-hide'); m.textContent = 'הדפדפן הזה לא תומך בהתראות. ההתראה תגיע מהיומן.'; return; }
    var on = st.notif && Notification.permission === 'granted';
    b.textContent = on ? '🔔 ההתראות בדף פועלות' : '🔔 להפעיל התראות כשהדף פתוח';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    m.textContent = Notification.permission === 'denied' ? 'ההתראות חסומות בדפדפן. אפשר לפתוח אותן בהגדרות האתר (המנעול ליד הכתובת).' : on ? 'כל עוד הדף פתוח, תקפוץ התראה בשעה. כשהדף סגור – ההתראה מגיעה מהיומן.' : '';
  }
  $('tz-notif').addEventListener('click', function () {
    if (!hasN) return;
    if (st.notif && Notification.permission === 'granted') { st.notif = false; save(); paintNotif(); return; }
    Notification.requestPermission().then(function (p) {
      st.notif = p === 'granted'; save(); paintNotif();
      if (st.notif) { use('notif'); show('🔔 ההתראות פועלות', 'כך תיראה תזכורת. כשהדף סגור – ההתראה מגיעה מהיומן.', 'tz-test'); }
    });
  });
  function show(t, body, tag) {
    var opt = { body: body, tag: tag, icon: '/assets/icon-kelim-192.png', badge: '/assets/icon-kelim-192.png', requireInteraction: true };
    if (navigator.vibrate) try { navigator.vibrate([300, 150, 300]); } catch (e) {}
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(function (r) { return r.showNotification(t, opt); }).catch(function () { try { new Notification(t, opt); } catch (e) {} });
    } else { try { new Notification(t, opt); } catch (e) {} }
  }
  function tick() {
    fresh();
    var now = nowHm(), d = new Date(), mins = d.getHours() * 60 + d.getMinutes(), changed = false;
    occToday().forEach(function (o) {
      var q = o.hm.split(':'), m = +q[0] * 60 + +q[1];
      if (m <= mins && mins - m <= 15 && !st.took[o.key] && !st.sent[o.key]) { // בשעה, ועד רבע שעה אחריה
        st.sent[o.key] = 1; changed = true;
        if (st.voice) speak('הגיע הזמן: ' + o.it.n + (o.it.w ? ', ל' + o.it.w : ''));
        if (st.notif && hasN && Notification.permission === 'granted') show('⏰ ' + title(o.it), 'עכשיו ' + o.hm + (o.it.o ? ' · ' + o.it.o : '') + '. מסמנים בדף כש' + doneWord(o.it) + '.', o.key);
      }
    });
    if (changed) save();
    draw();
  }
  // ---------- הקראה בקול, כתב גדול, הדפסה ----------
  var hasV = 'speechSynthesis' in window;
  function heVoice() { try { return speechSynthesis.getVoices().filter(function (v) { return /^(he|iw)/i.test(v.lang); })[0] || null; } catch (e) { return null; } }
  function speak(text) {
    if (!hasV) return;
    try { var u = new SpeechSynthesisUtterance(text), v = heVoice(); u.lang = 'he-IL'; if (v) u.voice = v; u.rate = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
  }
  function paintPrefs() {
    document.documentElement.classList.toggle('tz-big', !!st.big);
    $('tz-big').setAttribute('aria-pressed', st.big ? 'true' : 'false');
    $('tz-big').textContent = st.big ? '🔠 כתב גדול: פועל' : '🔠 כתב גדול';
    var vb = $('tz-voice');
    if (!hasV) { vb.classList.add('tz-hide'); return; }
    vb.setAttribute('aria-pressed', st.voice ? 'true' : 'false');
    vb.textContent = st.voice ? '🔊 הקראה בקול: פועלת' : '🔊 להקריא בקול';
  }
  $('tz-big').addEventListener('click', function () { st.big = !st.big; save(); paintPrefs(); if (st.big) use('big'); });
  $('tz-voice').addEventListener('click', function () {
    st.voice = !st.voice; save(); paintPrefs();
    var m = $('tz-vmsg'); m.textContent = '';
    if (st.voice) {
      use('voice'); speak('שלום. כך תישמע התזכורת: הגיע הזמן לקחת את הכדור.');
      m.textContent = (heVoice() ? '' : 'במכשיר הזה אין קול בעברית, אז ההקראה עלולה להישמע לא טוב. ') + 'ההקראה פועלת כל עוד הדף פתוח. כשהדף סגור – ההתראה מגיעה מהיומן.';
    }
  });
  $('tz-print').addEventListener('click', function () { drawSheet(); use('print'); window.print(); });
  $('tz-fam').addEventListener('click', function () { use('family'); });
  try { if (hasV) speechSynthesis.onvoiceschanged = function () {}; } catch (e) {}

  setInterval(tick, 20000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });

  resetForm();
  draw();
  // התראות של הדוגמה לא קופצות
  occToday().forEach(function (o) { if (o.it.ex) st.sent[o.key] = 1; });
})();
