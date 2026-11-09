// מסלול יומי לטיול: ימים, תחנות עם שעה, מה לוקחים ומי נוהג. דף להדפסה בשלושה סגנונות, ווטסאפ.
// הכול נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('ms-form')) return;
  var KEY = 'kelim-tiyulim-maslul', TOOL = 'tiyulim_maslul';
  function inDays(n) { var d = new Date(Date.now() + n * 86400000); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  var uid = 0; function nid(p) { uid++; return p + Date.now().toString(36) + uid; }
  function stops(a) { return a.map(function (r) { return { id: nid('s'), t: r[0], what: r[1], note: r[2] || '' }; }); }
  // בכניסה הראשונה: דוגמה מלאה עם שמות בדויים.
  var st = { demo: 1, theme: 'zayit', title: 'טיול משפחות לגליל', days: [
    { id: 'd1', title: 'היום הראשון: נחל עמוד', date: inDays(21), driver: 'משה (רכב 7 מקומות), דנה', bring: 'מים, כובע, בגד ים, ארוחת צהריים', items: stops([
      ['07:00', 'יציאה מהבית', 'חניון המתנ"ס'], ['09:30', 'עצירת קפה ותפילת הדרך', 'תחנת הדלק בצומת'], ['10:30', 'מסלול נחל עמוד התחתון', 'כ-3 שעות, מתאים לילדים'],
      ['13:30', 'ארוחת צהריים ליד המים', ''], ['16:00', 'כניסה לצימר', 'הטלפון של המקום בקבוצה'], ['19:30', 'על האש וערב שירה', 'השירון מודפס']]) },
    { id: 'd2', title: 'היום השני: צפת וחזרה', date: inDays(22), driver: 'דנה, אבי', bring: 'בגדים צנועים לעיר העתיקה, כסף קטן', items: stops([
      ['08:30', 'ארוחת בוקר ופינוי הצימר', ''], ['10:00', 'העיר העתיקה בצפת', 'סמטת הגלריות ובתי הכנסת'], ['13:00', 'צהריים בעיר', ''],
      ['15:00', 'יוצאים הביתה', ''], ['18:00', 'מגיעים הביתה, בעזרת ה׳', '']]) }
  ] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.days) st = sv; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function heb(s) { if (!s) return ''; var p = s.split('-'); return +p[2] + '.' + +p[1] + '.' + p[0]; }
  var DOW = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function dow(s) { if (!s) return ''; var p = s.split('-'); return 'יום ' + DOW[new Date(+p[0], +p[1] - 1, +p[2]).getDay()]; }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  function undemo() { if (st.demo) { st.demo = 0; $('ms-demo').hidden = true; } }
  function sortDay(d) { d.items.sort(function (a, b) { return (a.t || '99') < (b.t || '99') ? -1 : (a.t || '99') > (b.t || '99') ? 1 : 0; }); }
  function day(id) { for (var i = 0; i < st.days.length; i++) if (st.days[i].id === id) return st.days[i]; }
  function drawList() {
    $('ms-days').innerHTML = st.days.length ? st.days.map(function (d, i) {
      sortDay(d);
      return '<div class="ty-day" data-day="' + d.id + '"><div class="hd"><input type="text" data-f="title" maxlength="60" value="' + esc(d.title) + '" placeholder="יום ' + (i + 1) + ' בטיול" aria-label="שם היום">' +
        '<input type="date" data-f="date" value="' + esc(d.date) + '" aria-label="תאריך"><button class="ty-mini" type="button" data-dday="1" aria-label="למחוק את היום">✕</button></div>' +
        '<div class="meta"><input type="text" data-f="driver" maxlength="80" value="' + esc(d.driver) + '" placeholder="מי נוהג" aria-label="מי נוהג"><input type="text" data-f="bring" maxlength="120" value="' + esc(d.bring) + '" placeholder="מה לוקחים היום" aria-label="מה לוקחים"></div>' +
        d.items.map(function (r) {
          return '<div class="ty-row" data-id="' + r.id + '"><input type="time" data-s="t" value="' + esc(r.t) + '" aria-label="שעה">' +
            '<input type="text" data-s="what" maxlength="70" value="' + esc(r.what) + '" placeholder="תחנה: לאן ומה עושים" aria-label="תחנה">' +
            '<span></span><input class="who" type="text" data-s="note" maxlength="70" value="' + esc(r.note) + '" placeholder="הערה (לא חובה)" aria-label="הערה">' +
            '<div class="acts"><button type="button" data-del="1">למחוק</button></div></div>';
        }).join('') +
        '<div class="ty-tools" style="margin-top:.3rem"><button class="btn btn-line btn-sm" type="button" data-addstop="1">+ תחנה</button></div></div>';
    }).join('') : '<p class="ty-empty">עוד אין ימים. מוסיפים את היום הראשון.</p>';
  }
  var text = '';
  function drawCard() {
    $('ms-demo').hidden = !st.demo;
    var c = $('ms-card');
    c.className = 'ty-card t-' + (st.theme || 'lavan');
    [].forEach.call($('ms-theme').children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === st.theme); });
    var days = st.days.filter(function (d) { return d.title || d.items.some(function (r) { return r.what; }); });
    c.innerHTML = '<h3>' + esc(st.title || 'המסלול שלנו') + '</h3><p class="s2">' + (days.length ? days.length + ' ימים' : 'המסלול') + (days[0] && days[0].date ? ' · ' + heb(days[0].date) + (days.length > 1 && days[days.length - 1].date ? '–' + heb(days[days.length - 1].date) : '') : '') + '</p>' +
      (days.length ? days.map(function (d, i) {
        var items = d.items.filter(function (r) { return r.what; });
        var mt = [d.driver ? '🚗 נוהגים: ' + d.driver : '', d.bring ? '🎒 לוקחים: ' + d.bring : ''].filter(Boolean);
        return '<div class="day"><h4>' + esc(d.title || 'יום ' + (i + 1) + ' בטיול') + (d.date ? ' <small>(' + esc(dow(d.date)) + ', ' + heb(d.date) + ')</small>' : '') + '</h4>' +
          (mt.length ? '<p class="mt">' + mt.map(esc).join(' · ') + '</p>' : '') +
          '<table><tbody>' + (items.length ? items.map(function (r) { return '<tr><td class="rl">' + esc(r.t) + '</td><td>' + esc(r.what) + '</td><td class="nt">' + esc(r.note) + '</td></tr>'; }).join('') : '<tr><td colspan="3">עוד אין תחנות</td></tr>') + '</tbody></table></div>';
      }).join('') : '<p class="s2">עוד אין ימים</p>') +
      '<p class="ft">נסיעה טובה, ודרך צלחה בעזרת ה׳</p>';
    text = '*' + (st.title || 'המסלול שלנו') + '*\n' +
      days.map(function (d, i) {
        var items = d.items.filter(function (r) { return r.what; });
        return '\n*' + (d.title || 'יום ' + (i + 1) + ' בטיול') + '*' + (d.date ? ' (' + dow(d.date) + ', ' + heb(d.date) + ')' : '') +
          (d.driver ? '\n🚗 נוהגים: ' + d.driver : '') + (d.bring ? '\n🎒 לוקחים: ' + d.bring : '') + '\n' +
          items.map(function (r) { return (r.t ? r.t + ' – ' : '') + r.what + (r.note ? ' (' + r.note + ')' : ''); }).join('\n');
      }).join('\n') + '\n\nנסיעה טובה, ודרך צלחה בעזרת ה׳';
    $('ms-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  function draw() { drawList(); drawCard(); }
  $('ms-title').value = st.title || '';
  $('ms-title').addEventListener('input', function () { st.title = this.value.trim(); undemo(); save(); drawCard(); });
  $('ms-form').addEventListener('submit', function (e) { e.preventDefault(); });
  var box = $('ms-days');
  box.addEventListener('input', function (e) {
    var dEl = e.target.closest('[data-day]'); if (!dEl) return;
    var d = day(dEl.getAttribute('data-day')); if (!d) return;
    var f = e.target.getAttribute('data-f'), s = e.target.getAttribute('data-s');
    if (f) d[f] = e.target.value;
    else if (s) { var row = e.target.closest('[data-id]'), id = row && row.getAttribute('data-id'); d.items.forEach(function (r) { if (r.id === id) r[s] = e.target.value; }); }
    else return;
    undemo(); save(); drawCard();
  });
  box.addEventListener('change', function (e) { if (e.target.getAttribute('data-s') === 't') drawList(); });
  box.addEventListener('click', function (e) {
    var dEl = e.target.closest('[data-day]'); if (!dEl) return;
    var d = day(dEl.getAttribute('data-day')); if (!d) return;
    if (e.target.closest('[data-dday]')) {
      if (d.items.some(function (r) { return r.what; }) && !confirm('למחוק את "' + (d.title || 'היום') + '" עם כל התחנות?')) return;
      st.days = st.days.filter(function (x) { return x !== d; });
    } else if (e.target.closest('[data-addstop]')) {
      var last = d.items.length ? d.items[d.items.length - 1].t : '', t = '';
      if (last) { var p = last.split(':'), m = (+p[0]) * 60 + (+p[1]) + 60; t = ('0' + Math.floor(m / 60) % 24).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
      var id = nid('s'); d.items.push({ id: id, t: t, what: '', note: '' }); undemo(); save(); draw();
      var el = document.querySelector('#ms-days [data-id="' + id + '"] [data-s="what"]'); if (el) el.focus();
      used('add'); return;
    } else if (e.target.closest('[data-del]')) {
      var row = e.target.closest('[data-id]'), sid = row && row.getAttribute('data-id');
      d.items = d.items.filter(function (r) { return r.id !== sid; });
    } else return;
    undemo(); save(); draw();
  });
  $('ms-dadd').addEventListener('click', function () {
    var prev = st.days[st.days.length - 1], date = '';
    if (prev && prev.date) { var p = prev.date.split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2] + 1); date = dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2); }
    var id = nid('d');
    st.days.push({ id: id, title: '', date: date, driver: '', bring: '', items: [{ id: nid('s'), t: '08:00', what: '', note: '' }] }); undemo(); save(); draw();
    var el = document.querySelector('#ms-days [data-day="' + id + '"] [data-f="title"]'); if (el) el.focus();
    used('add_day');
  });
  $('ms-demo-x').addEventListener('click', function () { st = { demo: 0, theme: st.theme, title: '', days: [{ id: nid('d'), title: '', date: '', driver: '', bring: '', items: [{ id: nid('s'), t: '08:00', what: '', note: '' }] }] }; $('ms-title').value = ''; save(); draw(); });
  $('ms-theme').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.theme = b.getAttribute('data-t'); save(); drawCard(); });
  $('ms-print').addEventListener('click', function () { used('print'); window.print(); });
  $('ms-wa').addEventListener('click', function () { used('wa'); });
  $('ms-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
  });
  draw();
})();
