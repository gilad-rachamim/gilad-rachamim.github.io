// ימי הולדת ותאריכים: רשימה ממוינת לפי הקרוב הבא, ספירה לאחור, קובץ יומן (ICS) עם חזרה שנתית. נשמר בטלפון.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('yd-form');
  if (!form) return;
  var KEY = 'kelim-yomulda', DAY = 86400000;
  var ICON = { 'יום הולדת': '🎂', 'יום נישואין': '💍', 'יום זיכרון': '🕯️', 'אחר': '📅' };
  var st = [];
  try { st = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  // e: {n, m, d, y (0 = לא ידוע), k}
  function next(e) {
    var t = today(), x = new Date(t.getFullYear(), e.m - 1, e.d);
    if (x < t) x = new Date(t.getFullYear() + 1, e.m - 1, e.d);
    return x;
  }
  function info(e) {
    var nx = next(e), left = Math.round((nx - today()) / DAY), yrs = e.y ? nx.getFullYear() - e.y : 0;
    var what = e.k === 'יום הולדת' ? (yrs ? 'בן/בת ' + yrs : 'יום הולדת') : e.k === 'יום נישואין' ? (yrs ? yrs + ' שנות נישואין' : 'יום נישואין') : e.k === 'יום זיכרון' ? (yrs ? yrs + ' שנים' : 'יום זיכרון') : e.k;
    return { nx: nx, left: left, what: what };
  }
  var text = '';
  function draw() {
    var rows = st.map(function (e) { return { e: e, i: info(e) }; }).sort(function (a, b) { return a.i.left - b.i.left; });
    $('yd-list').innerHTML = rows.length ? rows.map(function (r) {
      var e = r.e, i = r.i, when = i.left === 0 ? 'היום!' : i.left === 1 ? 'מחר' : i.left;
      return '<li' + (i.left <= 7 ? ' class="now"' : '') + '><span class="d">' + when + (i.left > 1 ? '<small>ימים</small>' : '') + '</span><span>' + (ICON[e.k] || '') + ' ' + esc(e.n) +
        '<small>' + e.d + '.' + e.m + (e.y ? '.' + e.y : '') + ' · ' + esc(i.what) + (i.left === 0 && e.k !== 'יום זיכרון' ? ' · <a class="gold" href="/kodesh/brachot/">לשלוח ברכה</a>' : '') + '</small></span>' +
        '<button class="x" type="button" data-del="' + e.id + '" aria-label="למחוק">×</button></li>';
    }).join('') : '<li><span></span><span>הרשימה ריקה. מוסיפים את הראשון למעלה.</span><i></i></li>';
    text = '📅 ימי הולדת ותאריכים\n\n' + rows.map(function (r) { return '▫️ ' + r.e.d + '.' + r.e.m + ' ' + r.e.n + ' – ' + r.i.what; }).join('\n');
    $('yd-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var n = $('yd-name').value.trim(), v = $('yd-date').value, msg = $('yd-msg');
    if (!n) { msg.textContent = 'חסר שם.'; return; }
    if (!v) { msg.textContent = 'חסר תאריך.'; return; }
    var p = v.split('-');
    st.push({ id: 'y' + Date.now(), n: n, y: $('yd-noyear').checked ? 0 : +p[0], m: +p[1], d: +p[2], k: $('yd-kind').value });
    save(); draw();
    msg.textContent = 'נוסף ✓ ' + n;
    $('yd-name').value = ''; $('yd-date').value = ''; $('yd-name').focus();
    if (window.toolUsed) window.toolUsed('yomulda', { how: 'add' });
  });
  $('yd-list').addEventListener('click', function (ev) {
    var d = ev.target.closest('[data-del]'); if (!d) return;
    if (confirm('למחוק מהרשימה?')) { var id = d.getAttribute('data-del'); st = st.filter(function (x) { return x.id !== id; }); save(); draw(); }
  });
  function pad(n) { return String(n).padStart(2, '0'); }
  function icsEsc(s) { return String(s).replace(/[\\;,]/g, function (c) { return '\\' + c; }); }
  $('yd-ics').addEventListener('click', function () {
    if (!st.length) { $('yd-msg').textContent = 'הרשימה ריקה. מוסיפים קודם.'; return; }
    var stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//gilad-rachamim//yomulda//HE', 'CALSCALE:GREGORIAN'];
    st.forEach(function (e) {
      var y = e.y || 2000, s = y + pad(e.m) + pad(e.d), nd = new Date(y, e.m - 1, e.d + 1);
      lines.push('BEGIN:VEVENT', 'UID:' + e.id + '@hakelim.com', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + s,
        'DTEND;VALUE=DATE:' + nd.getFullYear() + pad(nd.getMonth() + 1) + pad(nd.getDate()), 'RRULE:FREQ=YEARLY',
        'SUMMARY:' + icsEsc((ICON[e.k] || '') + ' ' + e.k + ' – ' + e.n),
        'BEGIN:VALARM', 'TRIGGER:-PT15H', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc('מחר: ' + e.k + ' – ' + e.n), 'END:VALARM', 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    var b = new Blob([lines.join('\r\n')], { type: 'text/calendar' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'ימי הולדת.ics'; document.body.appendChild(a); a.click(); a.remove();
    if (window.toolUsed) window.toolUsed('yomulda', { how: 'ics', n: st.length });
  });
  $('yd-wa').addEventListener('click', function () { if (window.toolUsed) window.toolUsed('yomulda', { how: 'wa' }); });
  draw();
})();
