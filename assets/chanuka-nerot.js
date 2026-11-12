// לוח שמונה נרות: זמני הדלקה לפי מקום (@hebcal/core מקומי), הנר של הלילה, הברכות והשירים מהמקור,
// וקובץ יומן עם תזכורת לכל לילה (בשישי – לפני כניסת שבת). המקום נשמר בטלפון בלבד.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var H = window.hebcal, KEY = 'kodesh-chanuka-nerot';
  if (!$('cn-place')) return;
  var CITIES = [['31.778,35.235', 'ירושלים', 40], ['32.08,34.78', 'תל אביב', 20], ['32.79,34.99', 'חיפה', 30], ['31.25,34.79', 'באר שבע', 20], ['32.965,35.496', 'צפת', 20], ['32.79,35.53', 'טבריה', 20], ['29.557,34.952', 'אילת', 20], ['31.8,34.65', 'אשדוד', 20], ['31.67,34.57', 'אשקלון', 20], ['31.9,35.0', 'מודיעין', 20], ['32.18,34.87', 'נתניה והשרון', 20], ['32.08,34.83', 'בני ברק ופתח תקווה', 20], ['31.53,35.1', 'חברון וקריית ארבע', 20], ['32.3,35.2', 'שומרון', 20], ['32.9,35.75', 'רמת הגולן', 20]];
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var NUM = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'שמיני'];
  var st = { place: CITIES[0][0], name: 'ירושלים' };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) { st.place = sv.place || st.place; st.name = sv.name || st.name; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  var tf = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
  function t(d) { return d && !isNaN(d) ? tf.format(d) : '—'; }
  function down(d) { return new Date(Math.floor(d.getTime() / 60000) * 60000); }
  function up(d) { return new Date(Math.ceil(d.getTime() / 60000) * 60000); }
  function noon(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }
  function add(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); }
  function dm(d) { return d.getDate() + '.' + (d.getMonth() + 1); }

  // ---------- המקום ----------
  var sel = $('cn-place');
  sel.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '<option value="gps" hidden>המיקום שלי</option>';
  function syncSel() { sel.value = CITIES.some(function (c) { return c[0] === st.place; }) ? st.place : 'gps'; }
  syncSel();
  sel.onchange = function () { st.place = sel.value; st.name = sel.options[sel.selectedIndex].text; save(); draw(); };
  $('cn-gps').onclick = function () {
    var s = $('cn-st');
    if (!navigator.geolocation) { s.textContent = 'הטלפון לא נותן מיקום. אפשר לבחור עיר מהרשימה.'; return; }
    s.textContent = 'מאתר…';
    navigator.geolocation.getCurrentPosition(function (p) {
      st.place = p.coords.latitude.toFixed(4) + ',' + p.coords.longitude.toFixed(4); st.name = 'המיקום שלי';
      save(); syncSel(); s.textContent = 'נמצא ✓'; draw();
      if (window.toolUsed) window.toolUsed('chanuka_nerot', { how: 'gps' });
    }, function () { s.textContent = 'לא קיבלתי מיקום. צריך לאשר מיקום לדפדפן, או לבחור עיר מהרשימה.'; }, { timeout: 15000, maximumAge: 600000 });
  };

  // ---------- החישוב ----------
  // הלילה הראשון = הערב של כ"ד בכסלו. אחרי ג' בטבת עוברים לשנה הבאה.
  function firstEvening(now) {
    var hy = new H.HDate(now).getFullYear();
    var f = noon(new H.HDate(24, H.months.KISLEV, hy).greg());
    if (add(f, 8) < noon(now)) f = noon(new H.HDate(24, H.months.KISLEV, hy + 1).greg());
    return f;
  }
  function nights() {
    var ll = String(st.place).split(',').map(Number);
    if (ll.length !== 2 || isNaN(ll[0])) ll = [31.778, 35.235];
    var gl = new H.GeoLocation(st.name || '', ll[0], ll[1], 0, 'Asia/Jerusalem');
    var city = CITIES.filter(function (c) { return c[0] === st.place; })[0], mins = city ? city[2] : 20;
    var f = firstEvening(new Date()), out = [];
    for (var n = 1; n <= 8; n++) {
      var d = add(f, n - 1), z = new H.Zmanim(gl, d, false);
      var o = { n: n, d: d, sunset: z.sunset(), tzeit: up(z.tzeit(7.083)), kind: 'chol',
        heb: new H.HDate(add(d, 1)).renderGematriya(true).replace(/ תש.*$|\s*\d+$/, '') };
      if (d.getDay() === 5) { o.kind = 'erev'; o.candle = down(new Date(z.sunset().getTime() - mins * 60000)); o.mins = mins; }
      if (d.getDay() === 6) { o.kind = 'motzash'; o.havdala = up(z.tzeit(8.5)); }
      out.push(o);
    }
    return { list: out, where: city ? city[1] : 'המיקום שלי', first: f };
  }
  function when(o) {
    if (o.kind === 'erev') return { big: 'לפני ' + t(o.candle), small: 'ערב שבת: מדליקים נרות חנוכה לפני נרות שבת (' + t(o.candle) + ')' };
    if (o.kind === 'motzash') return { big: 'אחרי ' + t(o.havdala), small: 'מוצאי שבת: מדליקים אחרי צאת השבת (' + t(o.havdala) + ')' };
    return { big: t(o.tzeit), small: 'צאת הכוכבים · השקיעה ' + t(o.sunset) };
  }
  function candles(n) {
    var h = '<div class="cn-menorah" role="img" aria-label="' + n + ' נרות ושמש">';
    // בדף מימין לשמאל: הנר הראשון בימין, השמש באמצע וגבוה יותר
    for (var i = 1; i <= 8; i++) h += '<span class="c' + (i <= n ? ' lit' : '') + '"></span>' + (i === 4 ? '<span class="c sh lit"></span>' : '');
    return h + '</div>';
  }

  var data, lastText = '';
  function draw() {
    if (!H) return;
    data = nights();
    var today = noon(new Date()), L = data.list, cur = null;
    L.forEach(function (o) { if (+o.d === +today) cur = o; });
    var top;
    if (cur) {
      var w = when(cur);
      top = '<p class="cn-k">הלילה</p><h2>נר ' + NUM[cur.n] + ' של חנוכה</h2>' + candles(cur.n) +
        '<p class="cn-time">' + w.big + '</p><p class="cn-sm">' + w.small + '</p>' +
        (cur.n === 1 ? '<p class="cn-sm">בלילה הראשון מברכים גם "שהחיינו".</p>' : '');
    } else if (today < L[0].d) {
      var days = Math.round((L[0].d - today) / 864e5), w1 = when(L[0]);
      top = '<p class="cn-k">' + (days === 1 ? 'מחר בערב' : 'עוד ' + days + ' ימים') + '</p><h2>נר ראשון של חנוכה</h2>' + candles(1) +
        '<p class="cn-sm">יום ' + DAYS[L[0].d.getDay()] + ', ' + dm(L[0].d) + ' בערב · ' + w1.small + '</p>';
    } else {
      top = '<p class="cn-k">חנוכה הסתיים</p><h2>חנוכה מבורכת!</h2><p class="cn-sm">הלוח לשנה הבאה יופיע כאן.</p>';
    }
    var sn = cur ? cur.n : 1;
    if (!(today > L[7].d)) top += '<p class="cn-sm"><a class="gold" href="/kodesh/chanuka/sipurim/?n=' + sn + '">📖 הסיפור ' + (cur ? 'של הלילה' : 'של הלילה הראשון') + ', להקראה אחרי ההדלקה</a></p>';
    $('cn-today').innerHTML = top;
    $('cn-where').textContent = data.where;
    $('cn-rows').innerHTML = L.map(function (o) {
      var w = when(o);
      return '<tr' + (cur && cur.n === o.n ? ' class="now"' : '') + '><td><b>נר ' + NUM[o.n] + '</b><small>' + (o.n === 1 ? 'נר אחד' : o.n + ' נרות') + ' ושמש</small><a class="cn-sp" href="/kodesh/chanuka/sipurim/?n=' + o.n + '">📖 סיפור ללילה</a></td>' +
        '<td>יום ' + DAYS[o.d.getDay()] + ' ' + dm(o.d) + '<small>ליל ' + o.heb + '</small></td><td class="t">' + w.big + '</td></tr>';
    }).join('');
    lastText = 'חנוכה – זמני הדלקה (' + data.where + ')\n\n' + L.map(function (o) {
      return 'נר ' + NUM[o.n] + ' – יום ' + DAYS[o.d.getDay()] + ' ' + dm(o.d) + ': ' + when(o).big;
    }).join('\n') + '\n\nחנוכה מבורכת! הלוח המלא, הברכות ותזכורת ביומן:\n' + location.origin + '/kodesh/chanuka/nerot/';
    $('cn-wa').href = 'https://wa.me/?text=' + encodeURIComponent(lastText);
  }

  // ---------- הנוסח ----------
  var N = window.CHANUKA_NUSACH;
  if (N) {
    ['brachot', 'halalu', 'mizmor', 'maoz'].forEach(function (k) {
      var el = $('cn-' + k); if (el) el.innerHTML = N.parts[k].map(function (s) { return '<p>' + s.h + '</p>'; }).join('');
    });
    $('cn-src').textContent = 'הנוסח: ' + N.src + '. שם ה׳ נכתב ה׳.';
  }

  // ---------- קובץ יומן ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n'); }
  function fold(line) { var out = [], s = line; while (s.length > 30) { out.push(s.slice(0, 30)); s = ' ' + s.slice(30); } out.push(s); return out.join('\r\n'); }
  function buildIcs() {
    var url = location.origin + '/kodesh/chanuka/nerot/', dst = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kodesh//chanuka//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:הדלקת נרות חנוכה', 'X-WR-TIMEZONE:Asia/Jerusalem'];
    data.list.forEach(function (o) {
      var at, title, desc = 'מדליקים ' + (o.n === 1 ? 'נר אחד' : o.n + ' נרות') + ' ושמש.' + (o.n === 1 ? ' הלילה מברכים גם שהחיינו.' : '');
      if (o.kind === 'erev') { at = new Date(o.candle.getTime() - 30 * 60000); title = 'נר ' + NUM[o.n] + ' של חנוכה – לפני כניסת שבת'; desc += '\nבערב שבת מדליקים נרות חנוכה לפני נרות שבת (' + t(o.candle) + ').'; }
      else if (o.kind === 'motzash') { at = o.havdala; title = 'נר ' + NUM[o.n] + ' של חנוכה – מוצאי שבת'; desc += '\nמדליקים אחרי צאת השבת.'; }
      else { at = o.tzeit; title = 'הדלקת נר ' + NUM[o.n] + ' של חנוכה'; }
      var end = new Date(at.getTime() + 15 * 60000);
      L.push('BEGIN:VEVENT', 'UID:chanuka-' + o.n + '-' + data.first.getFullYear() + '@kodesh', 'DTSTAMP:' + dst, 'DTSTART:' + stamp(at), 'DTEND:' + stamp(end),
        fold('SUMMARY:' + icsEsc(title)), fold('DESCRIPTION:' + icsEsc(desc + '\n' + url)), 'URL:' + url,
        'BEGIN:VALARM', 'ACTION:DISPLAY', fold('DESCRIPTION:' + icsEsc(title)), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.join('\r\n');
  }
  $('cn-ics').onclick = function () {
    if (!data) return;
    var blob = new Blob([buildIcs()], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chanuka-' + data.first.getFullYear() + '.ics';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    $('cn-ics-note').innerHTML = '<b>הקובץ ירד.</b> פותחים אותו מההורדות, בוחרים "יומן Google" או "לוח שנה" ומאשרים "הוספה". כל שמונה הלילות נכנסים בבת אחת.';
    if (window.toolUsed) window.toolUsed('chanuka_nerot', { how: 'ics' });
  };
  $('cn-wa').onclick = function () { if (window.toolUsed) window.toolUsed('chanuka_nerot', { how: 'wa' }); };
  $('cn-print').onclick = function () { if (window.toolUsed) window.toolUsed('chanuka_nerot', { how: 'print' }); window.print(); };

  function start() { H = window.hebcal; if (H) draw(); else setTimeout(start, 120); }
  start();
})();
