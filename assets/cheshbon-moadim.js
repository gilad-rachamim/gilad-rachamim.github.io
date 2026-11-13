// לוח מועדי דיווח ותשלום לרשות המסים (2026–2027): לעוסק אחד או לכל לקוחות המשרד, עם קובץ יומן (ics).
(function () {
  'use strict';
  var CH = window.CH; if (!CH || !CH.$('moadim')) return;
  var $ = CH.$, TOOL = 'cheshbon_moadim', KEY = 'kelim-cheshbon-moadim';
  var st = CH.load(KEY, null) || { vat: '2', nik: '1', mef: false, clients: null };
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function days(d) { return Math.round((d - today()) / 864e5); }
  function inDays(n) { return n === 0 ? 'היום!' : n === 1 ? 'מחר' : 'בעוד ' + n + ' ימים'; }

  function mine(from) {
    var L = [];
    if (+st.vat) L = L.concat(CH.deadlines('vat', +st.vat, from));
    if (+st.nik) L = L.concat(CH.deadlines('nik', +st.nik, from));
    if (st.mef) L = L.concat(CH.deadlines('mef', 1, from));
    return L.sort(function (a, b) { return a.d - b.d || a.type.localeCompare(b.type); });
  }
  // מאחדים מועדים באותו יום לשורה אחת
  function byDay(L) {
    var out = [], m = {};
    L.forEach(function (x) { var k = CH.iso(x.d); if (!m[k]) { m[k] = { d: x.d, items: [] }; out.push(m[k]); } m[k].items.push(x); });
    return out;
  }

  function render() {
    var L = mine(today()), G = byDay(L), nx = G[0];
    var box = $('md-next');
    if (!nx) box.innerHTML = '<h3>אין מועדים קרובים בלוח</h3><p class="hint">הלוח כולל את 2026 ו-2027. בחרו מה מדווחים.</p>';
    else {
      var n = days(nx.d);
      box.innerHTML = '<h3>המועד הקרוב</h3><div class="big">' + CH.heDate(nx.d) + ' <span class="g">· ' + inDays(n) + '</span></div><ul>' +
        nx.items.map(function (x) { return '<li>' + CH.esc(x.t) + ' – על ' + CH.esc(x.per) + '</li>'; }).join('') + '</ul>';
    }
    $('md-list').innerHTML = G.slice(0, 14).map(function (g, i) {
      var n = days(g.d);
      return '<li class="' + (i === 0 || n <= 7 ? 'soon' : '') + '"><span><b>' + CH.heDate(g.d) + '</b><br>' + g.items.map(function (x) { return CH.esc(x.t) + ' – ' + CH.esc(x.per); }).join('<br>') + '</span><span class="d">' + inDays(n) + '</span></li>';
    }).join('');
    if (nx) {
      var t = nx.items.map(function (x) { return x.t; }).join(' + '), d = nx.d, e = new Date(d.getTime() + 864e5);
      $('md-gcal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('מועד אחרון: ' + t) + '&dates=' + CH.iso(d).replace(/-/g, '') + '/' + CH.iso(e).replace(/-/g, '') + '&details=' + encodeURIComponent(nx.items.map(function (x) { return x.t + ' – על ' + x.per; }).join('\n') + '\nhakelim.com/kelim/cheshbon/moadim/');
    }
    CH.save(KEY, st);
    renderClients();
  }

  // ---------- קובץ יומן ----------
  function ics(groups, title) {
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//moadim//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + title];
    groups.forEach(function (g, i) {
      var d = CH.iso(g.d).replace(/-/g, ''), e = CH.iso(new Date(g.d.getTime() + 864e5)).replace(/-/g, '');
      var sum = 'מועד אחרון: ' + g.items.map(function (x) { return x.t; }).join(' + ');
      var desc = g.items.map(function (x) { return x.t + ' – על ' + x.per + (x.who ? ': ' + x.who : ''); }).join('\\n');
      L.push('BEGIN:VEVENT', 'UID:moadim-' + d + '-' + i + '@hakelim.com', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + e,
        'SUMMARY:' + sum.replace(/[,;]/g, '\\$&'), 'DESCRIPTION:' + desc.replace(/[,;]/g, '\\$&') + '\\nhakelim.com/kelim/cheshbon/moadim/', 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + sum.replace(/[,;]/g, '\\$&'), 'TRIGGER:-PT39H', 'END:VALARM', 'END:VEVENT'); // יומיים לפני, ב-09:00
    });
    L.push('END:VCALENDAR');
    // קיפול שורות ל-75 בתים (RFC 5545), בלי לחתוך תו עברי באמצע
    var enc = new TextEncoder();
    L = L.map(function (line) {
      if (enc.encode(line).length <= 75) return line;
      var parts = [], cur = '', lim = 75;
      Array.from(line).forEach(function (ch) { if (enc.encode(cur + ch).length > lim) { parts.push(cur); cur = ch; lim = 74; } else cur += ch; });
      parts.push(cur); return parts.join('\r\n ');
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'moadei-divuach.ics'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  $('md-ics').addEventListener('click', function () { ics(byDay(mine(today())), 'מועדי דיווח לרשות המסים'); CH.used(TOOL, 'ics'); });
  $('md-gcal').addEventListener('click', function () { CH.used(TOOL, 'gcal'); });

  // ---------- הגדרות ----------
  $('md-vat').value = st.vat; $('md-nik').value = st.nik; $('md-mef').checked = !!st.mef;
  $('md-form').addEventListener('change', function () { st.vat = $('md-vat').value; st.nik = $('md-nik').value; st.mef = $('md-mef').checked; render(); CH.used(TOOL, 'set'); });

  // ---------- לקוחות המשרד ----------
  if (!st.clients) st.clients = [{ n: 'לקוח א (דוגמה)', v: 1, k: 1 }, { n: 'לקוח ב (דוגמה)', v: 2, k: 0 }, { n: 'לקוח ג (דוגמה)', v: 2, k: 2 }];
  function fq(s) { s = String(s || ''); return /דו|2|bi/i.test(s) ? 2 : /חוד|1|^m/i.test(s) ? 1 : 0; }
  function clientDeadlines(from) {
    var all = [];
    st.clients.forEach(function (c) {
      if (+c.v) CH.deadlines('vat', +c.v, from).forEach(function (x) { x.who = c.n; all.push(x); });
      if (+c.k) CH.deadlines('nik', +c.k, from).forEach(function (x) { x.who = c.n; all.push(x); });
    });
    return all.sort(function (a, b) { return a.d - b.d; });
  }
  function renderClients() {
    var fl = { 0: 'לא', 1: 'חודשי', 2: 'דו-חודשי' };
    $('mc-list').innerHTML = st.clients.map(function (c, i) { return '<li><span><b>' + CH.esc(c.n) + '</b> · מע"מ: ' + fl[c.v] + ' · ניכויים: ' + fl[c.k] + '</span><button type="button" data-del="' + i + '" aria-label="להסיר את ' + CH.esc(c.n) + '">✕</button></li>'; }).join('');
    var out = $('mc-out');
    if (!st.clients.length) { out.innerHTML = ''; return; }
    var G = byDay(clientDeadlines(today())).slice(0, 6);
    out.innerHTML = '<div class="res"><h3>מי מדווח בכל מועד</h3>' + G.map(function (g) {
      var vat = g.items.filter(function (x) { return x.type === 'vat'; }).map(function (x) { return x.who; });
      var nik = g.items.filter(function (x) { return x.type === 'nik'; }).map(function (x) { return x.who; });
      return '<p style="margin-top:.8rem"><b class="g">' + CH.heDate(g.d) + '</b> · ' + inDays(days(g.d)) + '</p><ul>' +
        (vat.length ? '<li>מע"מ ומקדמות (' + vat.length + '): ' + CH.esc(vat.join(', ')) + '</li>' : '') +
        (nik.length ? '<li>ניכויים (' + nik.length + '): ' + CH.esc(nik.join(', ')) + '</li>' : '') + '</ul>';
    }).join('') + '<div class="btns no-print"><button class="btn btn-gold btn-sm" type="button" id="mc-ics">📅 כל מועדי הלקוחות ליומן</button></div></div>';
    $('mc-ics').onclick = function () { ics(byDay(clientDeadlines(today())), 'מועדי דיווח – לקוחות המשרד'); CH.used(TOOL, 'ics_office'); };
  }
  $('mc-list').addEventListener('click', function (e) { var b = e.target.closest('[data-del]'); if (!b) return; st.clients.splice(+b.getAttribute('data-del'), 1); render(); });
  $('md-clients').addEventListener('submit', function (e) {
    e.preventDefault(); var n = $('mc-name').value.trim(); if (!n) { $('mc-name').focus(); return; }
    st.clients = st.clients.filter(function (c) { return !/\(דוגמה\)$/.test(c.n); });
    st.clients.push({ n: n.slice(0, 50), v: +$('mc-vat').value, k: +$('mc-nik').value }); $('mc-name').value = ''; render(); CH.used(TOOL, 'client');
  });
  $('mc-add-paste').addEventListener('click', function () {
    var rows = CH.rows($('mc-paste').value); if (!rows.length) return;
    st.clients = st.clients.filter(function (c) { return !/\(דוגמה\)$/.test(c.n); });
    rows.forEach(function (r) { if (!r[0] || /^שם/.test(r[0])) return; st.clients.push({ n: r[0].slice(0, 50), v: r.length > 1 ? fq(r[1]) : 1, k: r.length > 2 ? fq(r[2]) : 0 }); });
    $('mc-paste').value = ''; render(); CH.used(TOOL, 'client_paste');
  });
  $('mc-csv').addEventListener('click', function () {
    var rows = [['תאריך', 'דוח', 'תקופה', 'לקוח']];
    clientDeadlines(today()).forEach(function (x) { rows.push([CH.heDate(x.d), x.t, x.per, x.who]); });
    CH.csv('moadei-divuach-lakochot.csv', rows); CH.used(TOOL, 'csv');
  });

  render();
})();
