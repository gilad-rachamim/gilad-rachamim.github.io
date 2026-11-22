/* מערכת שעות: מזינים פעם אחת, שמור במכשיר, נפתח על היום, כמה ילדים וכיתות, שיתוף והדפסה.
   באפליקציית אנדרואיד (window.HakelimApp) המערכת נשלחת גם להתראת הבוקר "מה יש היום". */
(function () {
  var host = document.getElementById('ms-host'); if (!host) return;
  var OLD = 'kelim_maarechet_shaot', KEY = 'kelim_maarechet_v2';
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function blank(name) { return { name: name || '', rows: 8, fri: true, hours: false, color: '#e8f0ff', c: {} }; }
  var S = { v: 2, cur: 0, ps: [blank()], rem: { on: false, h: 7, m: 0 } };
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && s.ps && s.ps.length) { S = s; if (!S.rem) S.rem = { on: false, h: 7, m: 0 }; return; }
      var o = JSON.parse(localStorage.getItem(OLD) || 'null');
      if (o) { var p = blank(); for (var k in o) p[k] = o[k]; S.ps = [p]; }
    } catch (e) {}
  }
  load();
  function P() { return S.ps[S.cur] || S.ps[0]; }
  function esc(v) { return String(v || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function used(how) { try { window.toolUsed && window.toolUsed('maarechet_shaot', { how: how }); } catch (e) {} }

  // ---------- שיעורים של יום ----------
  function lessons(p, d) {
    var out = [];
    if (d > 5 || (d === 5 && !p.fri)) return out;
    for (var r = 0; r < p.rows; r++) {
      var v = (p.c[r + '_' + d] || '').trim();
      if (v) out.push({ n: r + 1, t: v, h: (p.c['h' + r] || '').trim() });
    }
    return out;
  }
  var todayD = new Date().getDay(); // 0 = ראשון
  var view = todayD;
  function nextStudyDay(d) {
    var p = P(), guard = 0;
    while (guard++ < 7 && (d > 5 || (d === 5 && !p.fri))) d = (d + 1) % 7;
    return d;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    pushToApp();
  }

  // ---------- גשר לאפליקציה ----------
  function pushToApp() {
    var A = window.HakelimApp; if (!A || !A.setSchedule) return;
    try {
      var data = { profiles: S.ps.map(function (p) {
        var days = {};
        for (var d = 0; d < 6; d++) days[d] = lessons(p, d).map(function (l) { return l.t; }).join(' · ');
        return { name: p.name || '', days: days };
      }) };
      A.setSchedule(JSON.stringify(data));
    } catch (e) {}
  }

  // ---------- ציור ----------
  var tabsEl = document.getElementById('ms-views'), todayEl = document.getElementById('ms-today');
  var profEl = document.getElementById('ms-profiles');

  function drawProfiles() {
    var h = '';
    S.ps.forEach(function (p, i) {
      h += '<button type="button" data-i="' + i + '" aria-pressed="' + (i === S.cur) + '">' + esc(p.name || ('מערכת ' + (i + 1))) + '</button>';
    });
    h += '<button type="button" data-add="1" class="ms-add" aria-label="הוספת ילד או כיתה">+ עוד ילד / כיתה</button>';
    profEl.innerHTML = h;
  }
  profEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.add) {
      if (S.ps.length >= 8) return;
      S.ps.push(blank()); S.cur = S.ps.length - 1; save(); used('profile_add'); syncControls(); drawAll(); setTab('week'); return;
    }
    S.cur = +b.dataset.i; save(); syncControls(); drawAll();
  });
  var delBtn = document.getElementById('ms-del');
  delBtn.addEventListener('click', function () {
    if (S.ps.length < 2) return;
    if (!confirm('למחוק את המערכת "' + (P().name || 'ללא שם') + '"?')) return;
    S.ps.splice(S.cur, 1); S.cur = 0; save(); syncControls(); drawAll();
  });

  function drawToday() {
    var p = P(), d = view, L = lessons(p, d), label = DAYS[d];
    var isToday = d === todayD;
    var h = '<div class="ms-daynav"><button type="button" class="btn btn-line btn-sm" data-go="1" aria-label="היום הבא">היום הבא ›</button>' +
      '<div class="ms-dayname"><b>' + (isToday ? 'היום · ' : '') + 'יום ' + label + '</b>' + (p.name ? '<span>' + esc(p.name) + '</span>' : '') + '</div>' +
      '<button type="button" class="btn btn-line btn-sm" data-go="-1" aria-label="היום הקודם">‹ היום הקודם</button></div>';
    if (d > 5 || (d === 5 && !p.fri)) {
      h += '<p class="ms-empty">אין לימודים ביום ' + label + '. <button type="button" class="btn btn-gold btn-sm" data-go="next">להראות את היום הבא עם לימודים</button></p>';
    } else if (!L.length) {
      h += '<p class="ms-empty">עוד לא כתבתם מקצועות ליום ' + label + '. <button type="button" class="btn btn-gold btn-sm" data-edit="1">למלא את המערכת</button></p>';
    } else {
      h += '<ol class="ms-list">';
      L.forEach(function (l) { h += '<li><span class="ms-ln">' + l.n + '</span><b>' + esc(l.t) + '</b>' + (l.h ? '<em dir="ltr">' + esc(l.h) + '</em>' : '') + '</li>'; });
      h += '</ol>';
    }
    todayEl.innerHTML = h;
  }
  todayEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) { setTab('week'); return; }
    if (b.dataset.go === 'next') { view = nextStudyDay((view + 1) % 7); drawToday(); return; }
    if (b.dataset.go) { view = (view + (+b.dataset.go) + 7) % 7; drawToday(); }
  });

  function drawTable() {
    var p = P(), days = p.fri ? DAYS.slice(0, 6) : DAYS.slice(0, 5);
    var h = '<table class="ms-tbl" style="--ms-c:' + p.color + '"><thead><tr><th style="width:34px">#</th>';
    if (p.hours) h += '<th style="width:70px">שעה</th>';
    days.forEach(function (d) { h += '<th>' + d + '</th>'; });
    h += '</tr></thead><tbody>';
    for (var r = 0; r < p.rows; r++) {
      h += '<tr><td class="ms-n">' + (r + 1) + '</td>';
      if (p.hours) h += '<td><input data-k="h' + r + '" value="' + esc(p.c['h' + r]) + '" aria-label="שעה, שיעור ' + (r + 1) + '" dir="ltr"></td>';
      days.forEach(function (d, i) { h += '<td><input data-k="' + r + '_' + i + '" value="' + esc(p.c[r + '_' + i]) + '" aria-label="יום ' + d + ', שיעור ' + (r + 1) + '"></td>'; });
      h += '</tr>';
    }
    host.innerHTML = h + '</tbody></table>';
  }
  host.addEventListener('input', function (e) {
    var k = e.target.dataset.k; if (k) { P().c[k] = e.target.value; save(); }
  });

  function drawAll() { drawProfiles(); drawToday(); drawTable(); delBtn.hidden = S.ps.length < 2; }

  function setTab(t) {
    document.getElementById('ms-pane-today').hidden = t !== 'today';
    document.getElementById('ms-pane-week').hidden = t !== 'week';
    [].forEach.call(tabsEl.querySelectorAll('button'), function (b) { b.setAttribute('aria-selected', b.dataset.t === t); });
    if (t === 'today') drawToday();
  }
  tabsEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setTab(b.dataset.t); });

  // ---------- בקרות ----------
  var nm = document.getElementById('ms-name'), rw = document.getElementById('ms-rows'),
      fr = document.getElementById('ms-fri'), hr = document.getElementById('ms-hours');
  function syncControls() {
    var p = P(); nm.value = p.name; rw.value = p.rows; fr.checked = p.fri; hr.checked = p.hours;
    [].forEach.call(document.querySelectorAll('#ms-colors button'), function (b) { b.setAttribute('aria-pressed', b.dataset.v === p.color); });
  }
  nm.addEventListener('input', function () { P().name = nm.value; save(); drawProfiles(); });
  rw.addEventListener('change', function () { P().rows = +rw.value; save(); drawTable(); });
  fr.addEventListener('change', function () { P().fri = fr.checked; save(); drawTable(); });
  hr.addEventListener('change', function () { P().hours = hr.checked; save(); drawTable(); });
  [].forEach.call(document.querySelectorAll('#ms-colors button'), function (b) {
    b.style.background = b.dataset.v;
    b.addEventListener('click', function () { P().color = b.dataset.v; save(); syncControls(); drawTable(); });
  });
  document.getElementById('ms-print').addEventListener('click', function () { used('print'); window.print(); });
  document.getElementById('ms-clear').addEventListener('click', function () {
    if (confirm('למחוק את כל מה שכתבתם במערכת הזאת?')) { var p = P(); p.c = {}; p.name = ''; save(); syncControls(); drawAll(); }
  });

  // ---------- שיתוף בווטסאפ ----------
  function shareText(whole) {
    var p = P(), t = '🗓️ ' + (p.name || 'מערכת שעות') + '\n';
    var from = whole ? 0 : view, to = whole ? (p.fri ? 5 : 4) : view;
    for (var d = from; d <= to; d++) {
      var L = lessons(p, d); if (!L.length) continue;
      t += '\nיום ' + DAYS[d] + ':\n' + L.map(function (l) { return l.n + '. ' + l.t + (l.h ? ' (' + l.h + ')' : ''); }).join('\n') + '\n';
    }
    return t + '\nhttps://hakelim.com/kelim/hadpasa/maarechet-shaot/';
  }
  function wa(whole) {
    used(whole ? 'wa_week' : 'wa_day');
    window.open('https://wa.me/?text=' + encodeURIComponent(shareText(whole)), '_blank', 'noopener');
  }
  document.getElementById('ms-wa-day').addEventListener('click', function () { wa(false); });
  document.getElementById('ms-wa-week').addEventListener('click', function () { wa(true); });

  // ---------- התראת בוקר (באפליקציה בלבד) ----------
  var remBox = document.getElementById('ms-rem');
  if (remBox && window.HakelimApp && window.HakelimApp.setReminder) {
    remBox.hidden = false;
    var on = document.getElementById('ms-rem-on'), tm = document.getElementById('ms-rem-time');
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    on.checked = !!S.rem.on; tm.value = pad(S.rem.h) + ':' + pad(S.rem.m);
    var applyRem = function () {
      var p = (tm.value || '07:00').split(':');
      S.rem = { on: on.checked, h: +p[0] || 0, m: +p[1] || 0 };
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
      try { window.HakelimApp.setReminder(S.rem.on, S.rem.h, S.rem.m); } catch (e) {}
      used(on.checked ? 'reminder_on' : 'reminder_off');
    };
    on.addEventListener('change', applyRem); tm.addEventListener('change', applyRem);
    try { window.HakelimApp.setReminder(S.rem.on, S.rem.h, S.rem.m); } catch (e) {}
  }

  syncControls(); drawAll(); pushToApp();
  var has = Object.keys(P().c).some(function (k) { return (P().c[k] || '').trim(); });
  setTab(has ? 'today' : 'week');
})();
