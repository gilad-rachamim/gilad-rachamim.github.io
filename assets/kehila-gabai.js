/* גבאי בית כנסת (/kelim/kehila/gabai/): פרשת השבת הקרובה, שבת מברכים, יארצייטים בשמונת הימים הקרובים
   (מתוך הרשימה של /kelim/kehila/azkarot/, מפתח kelim-kehila-azkarot), רשימת משימות לפני שבת,
   ובאפליקציה – תזכורת שבועית (HakelimApp.setEvents). הכול נשמר במכשיר בלבד. */
(function () {
  'use strict';
  var H = window.hebcal, $ = function (id) { return document.getElementById(id); };
  if (!$('gabai')) return;
  var KEY = 'kelim-gabai', AZ = 'kelim-kehila-azkarot';
  var DEF = ['לבדוק מי ביארצייט השבוע ולהודיע למשפחה', 'להכין את רשימת העולים לתורה', 'לוודא שיש קורא בתורה ומפטיר', 'לקבוע שליחי ציבור לקבלת שבת, שחרית ומוסף',
    'לאסוף שמות למי שברך לחולים', 'לבדוק שמחות בקהילה: בר מצווה, חתן, לידה', 'יין לקידוש, נרות וכיבוד', 'להכין את ההכרזות ואת זמני התפילות'];
  var st = { items: null, on: false, h: 10, m: 0, day: 4 };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) for (var k in sv) st[k] = sv[k]; } catch (e) {}
  if (!st.items) st.items = DEF.map(function (t, i) { return { id: 'd' + i, t: t, done: false }; });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function used(how) { if (window.toolUsed) window.toolUsed('kehila_gabai', { how: how }); }
  function heName(n) { var t = H.Locale.gettext(n, 'he-x-NoNikud'); return t && t !== n ? t : n; }
  function gdate(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  // ---- השבת הקרובה ----
  var weeks = [];
  function week(sat) {
    var r = H.getSedra(sat.getFullYear(), true).lookup(sat);
    var name = r.parsha.map(heName).join('-'), rc = null, d = sat;
    for (var i = 0; i < 7; i++) { d = d.next(); if (d.getDate() === 1 && d.getMonth() !== 7) { rc = d; break; } }
    return { sat: sat, greg: sat.greg(), chag: !!r.chag, name: name, rc: rc };
  }
  function renderShabat() {
    if (!H) return;
    var sat = new H.HDate(new Date()).onOrAfter(6);
    for (var n = 0; n < 60; n++) { weeks.push(week(sat)); sat = sat.add(7); }
    var w = weeks[0], hd = w.sat;
    var html = '<h2>' + (w.chag ? 'שבת ' + esc(w.name) : 'שבת פרשת ' + esc(w.name)) + '</h2>' +
      '<p class="pr-when">' + esc(H.gematriya(hd.getDate()) + ' ב' + heName(hd.getMonthName()) + ' ' + H.gematriya(hd.getFullYear() % 1000)) + ' · ' + esc(gdate(w.greg)) + '</p>';
    if (hd.getDate() === 1 || hd.getDate() === 30) html += '<p><b>שבת ראש חודש.</b> קריאה מיוחדת למפטיר והפטרת "השמים כסאי", לפי מנהג המקום.</p>';
    if (w.rc) html += '<p><b>שבת מברכים.</b> ראש חודש ' + esc(heName(w.rc.getMonthName())) + ' יחול ביום ' + DAYS[w.rc.greg().getDay()] + (w.rc.getDate() === 1 && w.rc.prev().getDate() === 30 ? ' (ויום ' + DAYS[w.rc.prev().greg().getDay()] + ' שלפניו)' : '') + '.</p>';
    if (w.chag) html += '<p>השבת קוראים קריאה של החג ולא את פרשת השבוע.</p>';
    else html += '<div class="pr-nav"><a class="btn btn-line" href="/kodesh/parasha/">הפרשה בקצרה ורעיון לדבר תורה</a><a class="btn btn-line" href="/kelim/kehila/aliyot/">לוח העליות</a></div>';
    $('gb-shabat').innerHTML = html;
  }

  // ---- יארצייטים ----
  function renderYz() {
    var items = [], HF = null;
    try { var a = JSON.parse(localStorage.getItem(AZ) || 'null'); if (a && a.items && !a.demo) items = a.items; } catch (e) {}
    if (!items.length) return;
    try { HF = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', timeZone: 'UTC' }); } catch (e) {}
    if (!HF) return;
    var now = new Date(), rows = [];
    for (var i = 0; i < 8; i++) {
      var g = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + i)), day = 0, mon = '';
      HF.formatToParts(g).forEach(function (p) { if (p.type === 'day') day = +p.value; if (p.type === 'month') mon = p.value; });
      items.forEach(function (it) {
        var m = String(it.m || '');
        var same = m === mon || (mon === 'Adar' && /^Adar/.test(m)) || (m === 'Adar' && mon === 'Adar II');
        if (+it.d === day && same) rows.push({ it: it, g: g, i: i });
      });
    }
    var box = $('gb-yz');
    if (!rows.length) { box.innerHTML = '<p class="kh-hint">אין יארצייטים בשמונת הימים הקרובים, מתוך ' + items.length + ' שמות ברשימה. <a href="/kelim/kehila/azkarot/">לרשימה המלאה</a></p>'; return; }
    box.innerHTML = '<ul class="pr-next">' + rows.map(function (r) {
      return '<li><b>' + esc(r.it.name || '') + '</b><span>' + (r.i === 0 ? 'היום' : 'יום ' + DAYS[r.g.getUTCDay()]) + ' · ' + r.g.getUTCDate() + '.' + (r.g.getUTCMonth() + 1) + (r.it.fam ? ' · ' + esc(r.it.fam) : '') + '</span></li>';
    }).join('') + '</ul><p class="kh-hint"><a href="/kelim/kehila/azkarot/">להודעה למשפחה ולרשימה המלאה</a></p>';
  }

  // ---- רשימה לפני שבת ----
  function renderList() {
    var ul = $('gb-list');
    ul.innerHTML = st.items.map(function (it) {
      return '<li class="' + (it.done ? 'done' : '') + '" data-id="' + esc(it.id) + '"><input type="checkbox" ' + (it.done ? 'checked' : '') + ' aria-label="בוצע"><span>' + esc(it.t) + '</span><button type="button" aria-label="למחוק">✕</button></li>';
    }).join('') || '<li><span>הרשימה ריקה. הוסיפו משימה למטה.</span></li>';
    var open = st.items.filter(function (i) { return !i.done; });
    var txt = 'רשימה לפני שבת' + (weeks[0] && !weeks[0].chag ? ' פרשת ' + weeks[0].name : '') + ':\n' +
      st.items.map(function (i) { return (i.done ? '✅ ' : '▫️ ') + i.t; }).join('\n') + '\n\nדף הגבאי: https://hakelim.com/kelim/kehila/gabai/?utm_source=share';
    $('gb-wa').href = 'https://wa.me/?text=' + encodeURIComponent(txt);
    return open.length;
  }
  $('gb-list').addEventListener('click', function (e) {
    var li = e.target.closest('li[data-id]'); if (!li) return;
    var id = li.getAttribute('data-id');
    if (e.target.tagName === 'BUTTON') { st.items = st.items.filter(function (i) { return i.id !== id; }); used('delete'); }
    else if (e.target.tagName === 'INPUT') { st.items.forEach(function (i) { if (i.id === id) i.done = e.target.checked; }); used('check'); }
    else return;
    save(); renderList();
  });
  $('gb-add').addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('gb-new').value.trim(); if (!v) return;
    st.items.push({ id: 'u' + Date.now(), t: v, done: false }); $('gb-new').value = ''; save(); renderList(); used('add');
  });
  $('gb-reset').addEventListener('click', function () { st.items.forEach(function (i) { i.done = false; }); save(); renderList(); used('reset'); });
  $('gb-wa').addEventListener('click', function () { used('share'); });

  // ---- תזכורת באפליקציה ----
  function push() {
    var A = window.HakelimApp; if (!A || !A.setEvents) return;
    var ev = [];
    if (st.on) weeks.forEach(function (w) {
      var d = new Date(w.greg.getTime()); d.setDate(d.getDate() - (6 - st.day));
      ev.push({ date: iso(d), title: 'גבאי: ' + (w.chag ? 'שבת ' : 'שבת פרשת ') + w.name, text: (w.rc ? 'שבת מברכים. ' : '') + 'לבדוק יארצייטים, עליות ומי שברך לפני שבת.' });
    });
    try { A.setEvents(JSON.stringify(ev)); A.setReminder(!!st.on, st.h, st.m); } catch (e) {}
  }
  function initRem() {
    var box = $('gb-rem'), A = window.HakelimApp; if (!box || !A || !A.setEvents) return;
    box.hidden = false;
    var on = $('gb-rem-on'), tm = $('gb-rem-time'), dy = $('gb-rem-day');
    on.checked = !!st.on; tm.value = ('0' + st.h).slice(-2) + ':' + ('0' + st.m).slice(-2); dy.value = String(st.day);
    function ch() { var p = (tm.value || '10:00').split(':'); st.on = on.checked; st.h = +p[0] || 0; st.m = +p[1] || 0; st.day = +dy.value; save(); push(); used('reminder'); }
    on.addEventListener('change', ch); tm.addEventListener('change', ch); dy.addEventListener('change', ch);
    push();
  }

  try { renderShabat(); } catch (e) {}
  try { renderYz(); } catch (e) {}
  renderList(); initRem();
})();
