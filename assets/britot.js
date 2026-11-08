// יומן הבריתות שלי – כלי קודש למוהלים. הכול נשמר בטלפון (localStorage), שום פרט לא נשלח לשרת.
// בקשה של יעקב מפורום המוהלים (08.11.2026): שם ההורים, תאריך, מקום, שעה, ראיתי את התינוק, הורדתי תחבושת למחרת.
(function () {
  'use strict';
  var KEY = 'kodesh-britot', BKEY = 'kodesh-britot-backup';
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var fmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
  var MON = { tishri: 'תשרי', tishrei: 'תשרי', heshvan: 'חשוון', cheshvan: 'חשוון', kislev: 'כסלו', tevet: 'טבת', shevat: 'שבט', 'adar i': 'אדר א׳', 'adar ii': 'אדר ב׳', adar: 'אדר', nisan: 'ניסן', iyar: 'אייר', sivan: 'סיוון', tamuz: 'תמוז', av: 'אב', elul: 'אלול' };
  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hunds = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    s += hunds[Math.floor(n / 100)]; n %= 100;
    if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else { s += tens[Math.floor(n / 10)]; s += ones[n % 10]; }
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  function parse(s) { if (!s) return null; var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function heb(d) {
    var o = {};
    fmt.formatToParts(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)).forEach(function (p) { o[p.type] = p.value; });
    var m = (o.month || '').toLowerCase();
    return gem(+o.day) + ' ב' + (MON[m] || m) + ' ' + gem(+o.year % 1000);
  }
  function g(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function add(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function today() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function diff(a, b) { return Math.round((a - b) / 864e5); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function when(d) { var n = diff(d, today()); return n === 0 ? 'היום' : n === 1 ? 'מחר' : n === -1 ? 'אתמול' : n > 1 ? 'בעוד ' + n + ' ימים' : 'לפני ' + (-n) + ' ימים'; }
  function intl(p) { p = (p || '').replace(/\D/g, ''); if (!p) return ''; return p.charAt(0) === '0' ? '972' + p.slice(1) : p; }
  function ev(n, p) { if (window.kelimEv) window.kelimEv(n, Object.assign({ tool: 'britot' }, p || {})); }

  var list = [];
  function load() { try { list = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { list = []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { alert('לא הצלחתי לשמור בטלפון. כדאי לגבות לקובץ עכשיו.'); } }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});

  var $ = function (id) { return document.getElementById(id); };
  var form = $('bt-form'), box = $('bt-formbox');

  // ---------- טופס ----------
  function showHeb() {
    var d = parse(form.date.value);
    $('bt-heb').textContent = d ? 'יום ' + DAYS[d.getDay()] + ', ' + heb(d) : '';
  }
  function openForm(b) {
    form.reset();
    form.id_.value = b ? b.id : '';
    form.date.value = b ? b.date : iso(today());
    ['baby', 'parents', 'phone', 'time', 'place', 'sandak', 'birth', 'notes'].forEach(function (k) { if (b) form[k].value = b[k] || ''; });
    ['saw', 'bandage', 'bechor'].forEach(function (k) { form[k].checked = !!(b && b[k]); });
    $('bt-form-h').textContent = b ? 'עריכת ברית' : 'ברית חדשה';
    box.hidden = false; showHeb();
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { form.parents.focus(); }, 300);
  }
  form.date.addEventListener('input', showHeb);
  $('bt-new').addEventListener('click', function () { openForm(null); });
  $('bt-cancel').addEventListener('click', function () { box.hidden = true; });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.parents.value.trim() && !form.baby.value.trim()) { alert('כתבו לפחות את שם ההורים או את שם התינוק.'); return; }
    var id = form.id_.value, old = id && list.filter(function (x) { return x.id === id; })[0];
    var b = old || { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created: new Date().toISOString() };
    ['baby', 'parents', 'phone', 'time', 'place', 'sandak', 'birth', 'notes', 'date'].forEach(function (k) { b[k] = form[k].value.trim(); });
    ['saw', 'bandage', 'bechor'].forEach(function (k) { b[k] = form[k].checked; });
    if (!old) list.push(b);
    save(); box.hidden = true; render();
    if (!old && window.toolUsed) window.toolUsed('britot');
    var el = document.querySelector('[data-id="' + b.id + '"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ---------- תצוגה ----------
  function name(b) { return b.baby ? b.baby + (b.parents ? ' (' + b.parents + ')' : '') : b.parents; }
  function pidyon(b) {
    if (!b.bechor) return null;
    var birth = parse(b.birth) || add(parse(b.date), -7);
    return add(birth, 30); // היום ה-31 ללידה
  }
  function summary(b) {
    var d = parse(b.date), t = [];
    t.push('ברית: ' + name(b));
    t.push('תאריך: יום ' + DAYS[d.getDay()] + ', ' + heb(d) + ' · ' + g(d) + (b.time ? ' · ' + b.time : ''));
    if (b.place) t.push('מקום: ' + b.place);
    if (b.sandak) t.push('סנדק: ' + b.sandak);
    if (b.phone) t.push('טלפון: ' + b.phone);
    t.push('ראיתי את התינוק: ' + (b.saw ? 'כן' : 'עדיין לא'));
    t.push('הורדתי את התחבושת למחרת: ' + (b.bandage ? 'כן' : 'עדיין לא'));
    var p = pidyon(b); if (p) t.push('פדיון הבן: ' + heb(p) + ' · ' + g(p));
    if (b.notes) t.push('הערות: ' + b.notes);
    return t.join('\n');
  }
  function cal(title, d, details) {
    var a = iso(d).replace(/-/g, ''), z = iso(add(d, 1)).replace(/-/g, '');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + a + '/' + z + '&details=' + encodeURIComponent(details || '');
  }
  function todo() {
    var t = today(), items = [];
    list.forEach(function (b) {
      var d = parse(b.date); if (!d || d > add(t, 1)) return;
      var nm = esc(name(b));
      if (!b.bandage) items.push({ d: add(d, 1), h: '<b>להוריד תחבושת</b> · ' + nm + ' · <span class="due">' + when(add(d, 1)) + '</span>', id: b.id, k: 'bandage' });
      if (!b.saw) items.push({ d: d, h: '<b>לראות את התינוק</b> · ' + nm, id: b.id, k: 'saw' });
    });
    list.forEach(function (b) {
      var p = pidyon(b); if (!p) return;
      var n = diff(p, t);
      if (n >= -1 && n <= 30) items.push({ d: p, h: '<b>פדיון הבן</b> · ' + esc(name(b)) + ' · ' + heb(p) + ' · <span class="due">' + when(p) + '</span>', id: b.id, k: '' });
    });
    items.sort(function (a, b) { return a.d - b.d; });
    $('bt-todo').hidden = !items.length;
    $('bt-todo-list').innerHTML = items.map(function (i) {
      return '<li>' + i.h + (i.k ? ' <button class="mini" type="button" data-done="' + i.id + '" data-k="' + i.k + '">✓ סימנתי</button>' : '') + '</li>';
    }).join('');
  }
  function stats() {
    var t = today(), y = 0, m = 0;
    list.forEach(function (b) { var d = parse(b.date); if (!d || d > t) return; if (d.getFullYear() === t.getFullYear()) { y++; if (d.getMonth() === t.getMonth()) m++; } });
    $('bt-stats').hidden = !list.length;
    $('bt-stats').innerHTML = '<span><b>' + m + '</b> החודש</span><span><b>' + y + '</b> השנה</span><span><b>' + list.length + '</b> ביומן</span>';
  }
  function render() {
    list.sort(function (a, b) { return (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')); });
    var q = ($('bt-q').value || '').trim();
    var rows = list.filter(function (b) { return !q || JSON.stringify(b).indexOf(q) > -1; });
    $('bt-empty').hidden = !!list.length;
    $('bt-tools').hidden = !list.length;
    $('bt-list').innerHTML = rows.map(function (b) {
      var d = parse(b.date), p = pidyon(b), ph = intl(b.phone);
      var meta = ['יום ' + DAYS[d.getDay()] + ', ' + heb(d) + ' · ' + g(d) + (b.time ? ' · ' + esc(b.time) : '')];
      if (b.place) meta.push('📍 ' + esc(b.place));
      if (b.sandak) meta.push('סנדק: ' + esc(b.sandak));
      if (p) meta.push('פדיון הבן: ' + heb(p) + ' · ' + g(p));
      if (b.notes) meta.push('📝 ' + esc(b.notes));
      var hi = 'שלום' + (b.parents ? ' ' + b.parents.split(/[ ,ו]/)[0] : '') + ', מה שלום ' + (b.baby || 'התינוק') + '? רציתי לשמוע איך הוא מרגיש אחרי הברית.';
      return '<article class="bt-card" data-id="' + b.id + '">' +
        '<h3>' + esc(b.baby || b.parents) + (b.baby && b.parents ? ' <small>' + esc(b.parents) + '</small>' : '') + '</h3>' +
        '<p class="bt-meta">' + meta.join('<br>') + '</p>' +
        '<div class="bt-chips">' +
        '<button type="button" class="chip' + (b.saw ? ' on' : '') + '" data-tog="saw">' + (b.saw ? '✓' : '○') + ' ראיתי את התינוק</button>' +
        '<button type="button" class="chip' + (b.bandage ? ' on' : '') + '" data-tog="bandage">' + (b.bandage ? '✓' : '○') + ' הורדתי תחבושת</button></div>' +
        '<div class="bt-acts">' +
        (ph ? '<a class="btn btn-line btn-sm" target="_blank" rel="noopener" data-act="parents" href="https://wa.me/' + ph + '?text=' + encodeURIComponent(hi) + '"><svg class="ic"><use href="#wa"/></svg> להורים</a>' +
              '<a class="btn btn-line btn-sm" data-act="call" href="tel:' + esc(b.phone) + '">📞 להתקשר</a>' : '') +
        '<a class="btn btn-line btn-sm" target="_blank" rel="noopener" data-act="summary" href="https://api.whatsapp.com/send?text=' + encodeURIComponent(summary(b)) + '"><svg class="ic"><use href="#wa"/></svg> סיכום</a>' +
        (!b.bandage ? '<a class="btn btn-line btn-sm" target="_blank" rel="noopener" data-act="cal" href="' + cal('להוריד תחבושת – ' + name(b), add(d, 1), summary(b)) + '">📅 תזכורת</a>' : '') +
        (p ? '<a class="btn btn-line btn-sm" target="_blank" rel="noopener" data-act="pidyon" href="' + cal('פדיון הבן – ' + name(b), p, summary(b)) + '">📅 פדיון הבן</a>' : '') +
        '<button class="btn btn-line btn-sm" type="button" data-edit>עריכה</button>' +
        '<button class="btn btn-line btn-sm bt-del" type="button" data-del>מחיקה</button></div></article>';
    }).join('') || (list.length ? '<p class="bt-none">לא נמצא. נסו מילה אחרת.</p>' : '');
    todo(); stats(); backupNote();
  }
  function byId(id) { return list.filter(function (x) { return x.id === id; })[0]; }
  document.addEventListener('click', function (e) {
    var c = e.target.closest('.bt-card'), b = c && byId(c.getAttribute('data-id'));
    var t = e.target.closest('[data-tog]');
    if (t && b) { var k = t.getAttribute('data-tog'); b[k] = !b[k]; save(); render(); return; }
    var dn = e.target.closest('[data-done]');
    if (dn) { var x = byId(dn.getAttribute('data-done')); if (x) { x[dn.getAttribute('data-k')] = true; save(); render(); } return; }
    if (e.target.closest('[data-edit]') && b) { openForm(b); return; }
    if (e.target.closest('[data-del]') && b) {
      if (confirm('למחוק את הברית של ' + name(b) + '? אי אפשר לשחזר, אלא מקובץ גיבוי.')) { list = list.filter(function (x) { return x !== b; }); save(); render(); }
      return;
    }
    var a = e.target.closest('[data-act]'); if (a) ev('britot_action', { what: a.getAttribute('data-act') });
  });
  $('bt-q').addEventListener('input', render);

  // ---------- ייצוא, הדפסה וגיבוי ----------
  var COLS = [['תאריך לועזי', function (b) { return g(parse(b.date)); }], ['תאריך עברי', function (b) { return heb(parse(b.date)); }], ['שעה', 'time'], ['שם התינוק', 'baby'], ['שם ההורים', 'parents'], ['טלפון', 'phone'], ['מקום', 'place'], ['סנדק', 'sandak'],
    ['ראיתי את התינוק', function (b) { return b.saw ? 'כן' : 'לא'; }], ['הורדתי תחבושת למחרת', function (b) { return b.bandage ? 'כן' : 'לא'; }], ['פדיון הבן', function (b) { var p = pidyon(b); return p ? g(p) : ''; }], ['הערות', 'notes']];
  function cell(b, c) { return typeof c[1] === 'function' ? c[1](b) : (b[c[1]] || ''); }
  function rowsAsc() { return list.slice().sort(function (a, b) { return (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')); }); }
  function download(name, type, data) {
    var url = URL.createObjectURL(new Blob([data], { type: type })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function stamp() { return iso(today()); }
  function table() {
    return '<table dir="rtl" border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-family:Arial;font-size:11pt"><tr>' + COLS.map(function (c) { return '<th style="background:#eee">' + c[0] + '</th>'; }).join('') + '</tr>' +
      rowsAsc().map(function (b) { return '<tr>' + COLS.map(function (c) { return '<td>' + esc(cell(b, c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  }
  $('bt-csv').addEventListener('click', function () {
    var q = function (s) { s = String(s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var csv = [COLS.map(function (c) { return c[0]; }).join(',')].concat(rowsAsc().map(function (b) { return COLS.map(function (c) { return q(cell(b, c)); }).join(','); })).join('\r\n');
    download('בריתות-' + stamp() + '.csv', 'text/csv;charset=utf-8', '﻿' + csv); ev('britot_export', { how: 'excel' });
  });
  $('bt-doc').addEventListener('click', function () {
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>@page{size:landscape}body{direction:rtl}</style></head><body dir="rtl"><h2 style="font-family:Arial">יומן הבריתות שלי</h2>' + table() + '</body></html>';
    download('בריתות-' + stamp() + '.doc', 'application/msword', '﻿' + html); ev('britot_export', { how: 'word' });
  });
  $('bt-print').addEventListener('click', function () {
    $('bt-printarea').innerHTML = '<h2>יומן הבריתות שלי</h2>' + table();
    ev('britot_export', { how: 'print' }); window.print();
  });
  $('bt-backup').addEventListener('click', function () {
    download('גיבוי-בריתות-' + stamp() + '.json', 'application/json', JSON.stringify({ v: 1, britot: list }, null, 1));
    try { localStorage.setItem(BKEY, String(Date.now())); } catch (e) {}
    ev('britot_export', { how: 'backup' }); backupNote();
  });
  $('bt-restore').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result), arr = Array.isArray(data) ? data : data.britot, n = 0;
        arr.forEach(function (b) { if (b && b.id && b.date && !byId(b.id)) { list.push(b); n++; } });
        save(); render(); alert('נוספו ' + n + ' בריתות מהגיבוי.');
      } catch (e) { alert('הקובץ לא נראה כמו גיבוי של היומן.'); }
    };
    r.readAsText(f); this.value = '';
  });
  function backupNote() {
    var last = 0; try { last = +localStorage.getItem(BKEY) || 0; } catch (e) {}
    $('bt-bnote').hidden = !(list.length >= 3 && Date.now() - last > 30 * 864e5);
  }

  // ---------- ברית שהגיעה מ"טופס פרטי הברית" (?add=…) ----------
  // ההורים ממלאים את הטופס ב-/kodesh/tofes-brit/, ובסוף ההודעה למוהל יש קישור עם הפרטים (JSON ב-base64url).
  function fromLink() {
    var m = /[?&]add=([A-Za-z0-9_-]+)/.exec(location.search);
    if (!m) return;
    var clean = function () { try { history.replaceState(null, '', location.pathname); } catch (e) {} };
    var o;
    try {
      var s = m[1].replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      o = JSON.parse(decodeURIComponent(escape(atob(s))));
    } catch (e) { clean(); alert('הקישור לא שלם. אפשר להעתיק את הפרטים מההודעה ולהוסיף ידנית.'); return; }
    var str = function (v, n) { return String(v == null ? '' : v).trim().slice(0, n); };
    var isoOk = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : ''; };
    var b = { parents: str(o.p, 80), phone: str(o.ph, 20), place: str(o.pl, 100), sandak: str(o.s, 60), time: /^\d{2}:\d{2}$/.test(o.t || '') ? o.t : '', birth: isoOk(o.b), date: isoOk(o.d), notes: str(o.n, 500), baby: '' };
    if (!b.date && b.birth) b.date = iso(add(parse(b.birth), 7));
    if (!b.date) { clean(); alert('בקישור אין תאריך ברית. אפשר להוסיף את הברית ידנית.'); return; }
    var same = list.filter(function (x) { return x.date === b.date && (x.parents || '') === b.parents; })[0];
    clean();
    if (same) { render(); var el = document.querySelector('[data-id="' + same.id + '"]'); if (el) el.scrollIntoView({ block: 'center' }); alert('הברית הזאת כבר ביומן.'); return; }
    var d = parse(b.date);
    var q = 'להוסיף ליומן את הברית הזאת?\n\n' + (b.parents || 'בלי שם') + '\nיום ' + DAYS[d.getDay()] + ', ' + heb(d) + ' · ' + g(d) + (b.time ? ' · ' + b.time : '') + (b.place ? '\n' + b.place : '');
    if (!confirm(q)) return;
    b.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    b.created = new Date().toISOString(); b.saw = false; b.bandage = false; b.bechor = false; b.from = 'tofes';
    list.push(b); save(); render();
    ev('britot_action', { what: 'add_from_tofes' });
    if (window.toolUsed) window.toolUsed('britot', { how: 'tofes' });
    var el2 = document.querySelector('[data-id="' + b.id + '"]');
    if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  load(); render();
  if (/[?&]new\b/.test(location.search)) openForm(null);
  fromLink();
})();
