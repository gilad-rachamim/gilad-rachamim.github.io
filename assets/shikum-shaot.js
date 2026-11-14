// דוח שעות חודשי למטפל / מלווה: פרטים + סידור קבוע + שעות לפי ימים נשמרים בטלפון (localStorage).
// שני סוגי דוח: "ליווי" (זכאי ומלווה, עד 3 כניסות/יציאות ביום ונסיעות – כמו טופס חברת הליווי)
// ו"עובד סיעודי" (מעסיק ועובד). חתימות באצבע או בהקלדה (לא נשמרות), ומהדף נוצר PDF
// (html-to-image + jsPDF מקומיים) לשליחה במייל / ווטסאפ / פקס.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sh-days')) return;
  var KEY = 'kelim-shikum-shaot', TOOL = 'shikum_shaot';
  var DN = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'], DS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  var NOTES = ['חופש', 'מחלה', 'חג', 'לא עבד/ה'], ROM = ['', 'I', 'II', 'III'];
  var KIND = {
    liva: { r1: 'הזכאי/ת', r2: 'המלווה', r1s: 'זכאי/ת', r2s: 'מלווה', title: 'דו"ח שעות ליווי לחודש', id2: 'ת"ז / דרכון המלווה' },
    siud: { r1: 'המעסיק', r2: 'העובד/ת', r1s: 'מעסיק', r2s: 'עובד/ת', title: 'דוח שעות עבודה חודשי – עובד/ת סיעודי/ת', id2: 'ת"ז / דרכון העובד/ת' }
  };
  function K() { return KIND[st.kind] || KIND.siud; }
  function pad(n) { return ('0' + n).slice(-2); }
  function defMonth() { var d = new Date(); if (d.getDate() <= 7) d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function blankWeek() { var w = []; for (var i = 0; i < 7; i++) w.push({ on: 0, a: '08:00', b: '14:00' }); return w; }
  function demoState() {
    var w = blankWeek(); for (var i = 0; i < 5; i++) w[i].on = 1; w[5] = { on: 1, a: '08:00', b: '12:00' };
    var s = { demo: 1, kind: 'liva', d: { emp: 'משה כהן', empId: '', empAddr: 'הרצל 12, רחובות', empTel: '050-0000000', wrk: 'מריה סנטוס', wrkId: '', wrkAddr: 'הרצל 12, רחובות', wrkTel: '052-0000000', to: 'חברת הליווי', mail: '' }, week: w, month: defMonth(), m: {} };
    var c = s.m[s.month] = fillFrom(w, s.month), k = Object.keys(c);
    if (k[3]) c[k[3]] = { a: '', b: '', n: 'חופש' };
    var wk = k.filter(function (d) { return +d > 6 && c[d].a; });
    if (wk[0]) { c[wk[0]].b = '11:00'; c[wk[0]].a2 = '16:00'; c[wk[0]].b2 = '19:00'; } // יום מפוצל: בוקר וערב
    if (wk[2]) { c[wk[2]].tf = '09:30'; c[wk[2]].tt = '11:30'; c[wk[2]].tg = 'בית חולים קפלן, ביקורת'; c[wk[2]].trip = 1; } // נסיעה לטיפול
    return s;
  }
  function used(how, x) { if (window.toolUsed) window.toolUsed(TOOL, Object.assign({ how: how, kind: st.kind }, x || {})); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function days(mo) { var p = mo.split('-'); return new Date(+p[0], +p[1], 0).getDate(); }
  function wd(mo, d) { var p = mo.split('-'); return new Date(+p[0], +p[1] - 1, d).getDay(); }
  function monthName(mo) { var p = mo.split('-'); try { return new Date(+p[0], +p[1] - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }); } catch (e) { return p[1] + '/' + p[0]; } }
  function fillFrom(w, mo) { var r = {}; for (var d = 1; d <= days(mo); d++) { var x = w[wd(mo, d)]; r[d] = x.on ? { a: x.a, b: x.b, n: '' } : { a: '', b: '', n: '' }; } return r; }
  function mins(t) { if (!t) return null; var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function span(a, b) { a = mins(a); b = mins(b); if (a === null || b === null) return 0; var m = b - a; if (m <= 0) m += 1440; return m; }
  function pairs(r) { return [[r.a, r.b], [r.a2, r.b2], [r.a3, r.b3]]; }
  function npairs(r) { return r.a3 || r.b3 || r.x >= 3 ? 3 : r.a2 || r.b2 || r.x >= 2 ? 2 : 1; }
  function hasTrip(r) { return !!(r.trip || r.tf || r.tt || r.tg); }
  function dur(r) { return pairs(r).reduce(function (s, p) { return s + span(p[0], p[1]); }, 0); }
  function hm(m) { return Math.floor(m / 60) + ':' + pad(m % 60); }
  function hdec(m) { var h = Math.round(m / 6) / 10; return String(h).replace(/\.0$/, ''); }

  var st = null;
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!st || !st.week) st = demoState();
  if (!st.m) st.m = {};
  if (!st.kind) st.kind = 'siud'; // מי שהתחיל לפני שהיה בחירה – נשאר עם מה שהכיר
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function cur() { if (!st.m[st.month]) st.m[st.month] = fillFrom(st.week, st.month); return st.m[st.month]; }

  // ---------- סוג הדוח ושמות התפקידים ----------
  function roles() {
    var k = K();
    document.querySelectorAll('[data-role]').forEach(function (el) { el.textContent = k[el.dataset.role]; });
    $('sh-wrk-id-l').firstChild.nodeValue = k.id2 + ' ';
    $('sh-wrk-id-o').textContent = st.kind === 'liva' ? '(בטופס הליווי: חובה)' : '(אם הטופס דורש)';
    document.querySelectorAll('input[name="sh-kind"]').forEach(function (x) { x.checked = x.value === st.kind; });
    $('sh-liva-tips').hidden = st.kind !== 'liva';
  }
  document.querySelectorAll('input[name="sh-kind"]').forEach(function (x) {
    x.addEventListener('change', function () { if (!this.checked) return; st.kind = this.value; save(); roles(); names(); renderPaper(); used('kind'); });
  });

  // ---------- פרטים ----------
  var F = { emp: 'sh-emp', empId: 'sh-emp-id', empAddr: 'sh-emp-addr', empTel: 'sh-emp-tel', wrk: 'sh-wrk', wrkId: 'sh-wrk-id', wrkAddr: 'sh-wrk-addr', wrkTel: 'sh-wrk-tel', to: 'sh-to', mail: 'sh-mail' };
  function showDemo() { $('sh-demo').hidden = !st.demo; }
  function fillFields() { Object.keys(F).forEach(function (k) { $(F[k]).value = st.d[k] || ''; }); $('sh-month').value = st.month; }
  function endDemo(keep) {
    if (!st.demo) return;
    st.demo = 0;
    Object.keys(F).forEach(function (k) { if (k !== keep) { st.d[k] = ''; $(F[k]).value = ''; } });
    st.m = {}; st.month = defMonth(); $('sh-month').value = st.month;
    showDemo(); renderDays();
  }
  Object.keys(F).forEach(function (k) {
    $(F[k]).addEventListener('input', function () {
      if (st.demo && (k === 'emp' || k === 'wrk')) endDemo(k);
      st.d[k] = this.value.trim(); save(); renderPaper(); names();
    });
  });
  $('sh-demo-x').addEventListener('click', function () { endDemo(''); st.week = blankWeek(); renderWeek(); renderDays(); save(); used('clear_demo'); });
  $('sh-month').addEventListener('change', function () { if (!this.value) return; st.month = this.value; save(); renderDays(); remind(); used('month'); });
  function names() { $('sh-emp-n').textContent = st.d.emp ? '(' + st.d.emp + ')' : ''; $('sh-wrk-n').textContent = st.d.wrk ? '(' + st.d.wrk + ')' : ''; }

  // ---------- סידור קבוע ----------
  function renderWeek() {
    $('sh-week').innerHTML = st.week.map(function (x, i) {
      return '<div class="ts-wd' + (x.on ? '' : ' off') + '" data-i="' + i + '" role="group" aria-label="יום ' + DN[i] + '"><label><input type="checkbox"' + (x.on ? ' checked' : '') + ' aria-label="עובד/ת ביום ' + DN[i] + '"> ' + DN[i] + '</label>' +
        '<input type="time" value="' + x.a + '" aria-label="' + DN[i] + ' משעה" data-k="a"><input type="time" value="' + x.b + '" aria-label="' + DN[i] + ' עד שעה" data-k="b"></div>';
    }).join('');
  }
  $('sh-week').addEventListener('change', function (e) {
    var row = e.target.closest('.ts-wd'); if (!row) return; var x = st.week[+row.dataset.i];
    if (e.target.type === 'checkbox') { x.on = e.target.checked ? 1 : 0; row.classList.toggle('off', !x.on); }
    else x[e.target.dataset.k] = e.target.value;
    save();
  });
  $('sh-fill').addEventListener('click', function () {
    var c = st.m[st.month], any = c && Object.keys(c).some(function (k) { return c[k].a || c[k].n || c[k].a2 || hasTrip(c[k]); });
    if (any && !confirm('למלא מחדש את כל ' + monthName(st.month) + ' לפי הסידור? השינויים שעשיתם בחודש הזה יימחקו.')) return;
    st.m[st.month] = fillFrom(st.week, st.month); save(); renderDays(); used('fill');
  });

  // ---------- ימים ----------
  function dayLabel(d) { return 'יום ' + DN[wd(st.month, d)] + ' ' + d + '.' + +st.month.split('-')[1]; }
  function dayHtml(d) {
    var r = cur()[d], w = wd(st.month, d), m = dur(r), dl = dayLabel(d), np = npairs(r), h = '', sfx = ['', '2', '3'];
    h += '<div class="ts-day' + (m ? ' work' : '') + (w === 6 ? ' sat' : '') + '" data-d="' + d + '" role="group" aria-label="' + dl + '"><div class="d" aria-hidden="true"><b>' + d + '.' + +st.month.split('-')[1] + '</b><small>יום ' + DS[w] + '</small></div>' +
      '<input type="time" value="' + (r.a || '') + '" data-k="a" aria-label="' + dl + ', כניסה' + (np > 1 ? ' ראשונה' : '') + '"><input type="time" value="' + (r.b || '') + '" data-k="b" aria-label="' + dl + ', יציאה' + (np > 1 ? ' ראשונה' : '') + '">' +
      '<span class="h"><span class="vh">שעות: </span>' + (m ? hm(m) : '–') + '</span>';
    for (var p = 2; p <= np; p++) {
      var s = sfx[p - 1], nm = p === 2 ? 'שנייה' : 'שלישית';
      h += '<div class="ts-x"><span class="xl">' + ROM[p] + '</span><input type="time" value="' + (r['a' + s] || '') + '" data-k="a' + s + '" aria-label="' + dl + ', כניסה ' + nm + '"><input type="time" value="' + (r['b' + s] || '') + '" data-k="b' + s + '" aria-label="' + dl + ', יציאה ' + nm + '">' +
        (p === np ? '<button type="button" class="rm" data-rm="pair" aria-label="להסיר את הכניסה ה' + nm + ' ב' + dl + '">✕</button>' : '<span></span>') + '</div>';
    }
    if (hasTrip(r)) {
      h += '<div class="ts-trip"><span class="xl" aria-hidden="true">🚗</span><input type="time" value="' + (r.tf || '') + '" data-k="tf" aria-label="' + dl + ', נסיעה משעה"><input type="time" value="' + (r.tt || '') + '" data-k="tt" aria-label="' + dl + ', נסיעה עד שעה">' +
        '<button type="button" class="rm" data-rm="trip" aria-label="להסיר את הנסיעה ב' + dl + '">✕</button>' +
        '<input type="text" class="tg" maxlength="60" value="' + esc(r.tg || '') + '" data-k="tg" placeholder="לאן? (למשל: בית חולים, טיפול)" aria-label="' + dl + ', יעד הנסיעה"></div>';
    }
    h += '<div class="nt">' + NOTES.map(function (t) { return '<button type="button" data-n="' + t + '" aria-pressed="' + (r.n === t) + '" aria-label="' + t + ' ב' + dl + '"' + (r.n === t ? ' class="on"' : '') + '>' + t + '</button>'; }).join('') +
      (np < 3 ? '<button type="button" class="add" data-add="pair" aria-label="עוד כניסה ויציאה ב' + dl + '">+ כניסה</button>' : '') +
      (hasTrip(r) ? '' : '<button type="button" class="add" data-add="trip" aria-label="להוסיף נסיעה ב' + dl + '">+ נסיעה</button>') + '</div></div>';
    return h;
  }
  function renderDays() {
    var c = cur(), n = days(st.month), h = '';
    for (var d = 1; d <= n; d++) { if (!c[d]) c[d] = { a: '', b: '', n: '' }; h += dayHtml(d); }
    $('sh-days').innerHTML = h; summary(); renderPaper();
  }
  function redrawDay(d, focusSel) {
    var old = document.querySelector('.ts-day[data-d="' + d + '"]'), tmp = document.createElement('div'); tmp.innerHTML = dayHtml(d);
    old.parentNode.replaceChild(tmp.firstChild, old);
    if (focusSel) { var f = document.querySelector('.ts-day[data-d="' + d + '"] ' + focusSel); if (f) f.focus(); } // הפוקוס נשאר במקום אחרי בנייה מחדש
    summary(); renderPaper();
  }
  $('sh-days').addEventListener('change', function (e) {
    var row = e.target.closest('.ts-day'), k = e.target.dataset.k; if (!row || !k) return;
    var r = cur()[+row.dataset.d]; r[k] = e.target.type === 'text' ? e.target.value.trim() : e.target.value; if (dur(r)) r.n = '';
    var m = dur(r); row.querySelector('.h').innerHTML = '<span class="vh">שעות: </span>' + (m ? hm(m) : '–'); row.classList.toggle('work', !!m);
    row.querySelectorAll('.nt button[data-n]').forEach(function (b) { b.classList.toggle('on', b.dataset.n === r.n); b.setAttribute('aria-pressed', String(b.dataset.n === r.n)); });
    save(); summary(); renderPaper();
  });
  $('sh-days').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; var row = b.closest('.ts-day'); if (!row) return;
    var d = +row.dataset.d, r = cur()[d];
    if (b.dataset.n) {
      var n = b.dataset.n;
      if (r.n === n) r.n = ''; else { r.n = n; ['a', 'b', 'a2', 'b2', 'a3', 'b3', 'tf', 'tt', 'tg'].forEach(function (k) { r[k] = ''; }); r.x = 0; r.trip = 0; }
      save(); redrawDay(d, '.nt button[data-n="' + n + '"]'); return;
    }
    if (b.dataset.add === 'pair') { var np = npairs(r) + 1; r.x = np; save(); redrawDay(d, 'input[data-k="a' + np + '"]'); used('pair'); return; }
    if (b.dataset.add === 'trip') { r.trip = 1; save(); redrawDay(d, 'input[data-k="tf"]'); used('trip'); return; }
    if (b.dataset.rm === 'pair') { var p = npairs(r); r['a' + p] = ''; r['b' + p] = ''; r.x = p - 1; save(); redrawDay(d, '.nt .add[data-add="pair"]'); return; }
    if (b.dataset.rm === 'trip') { r.tf = ''; r.tt = ''; r.tg = ''; r.trip = 0; save(); redrawDay(d, '.nt .add[data-add="trip"]'); return; }
  });
  function totals() { var c = cur(), t = 0, dd = 0, tr = 0; Object.keys(c).forEach(function (k) { var m = dur(c[k]); if (m) { t += m; dd++; } if (hasTrip(c[k])) tr++; }); return { m: t, d: dd, tr: tr }; }
  function summary() { var t = totals(); $('sh-sum').innerHTML = '<div><b>' + hm(t.m) + '</b><span>שעות בחודש</span></div><div><b>' + t.d + '</b><span>ימי עבודה</span></div>' + (t.tr ? '<div><b>' + t.tr + '</b><span>נסיעות</span></div>' : ''); }

  // ---------- חתימות ----------
  var sig = {};
  ['sh-sig1', 'sh-sig2'].forEach(function (id) {
    var cv = $(id), g = cv.getContext('2d'), down = false, last = null;
    sig[id] = false;
    g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#0b2a6b';
    function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; }
    cv.addEventListener('pointerdown', function (e) { down = true; last = pt(e); try { cv.setPointerCapture(e.pointerId); } catch (x) {} g.beginPath(); g.arc(last.x, last.y, 1.5, 0, 7); g.fillStyle = g.strokeStyle; g.fill(); e.preventDefault(); });
    cv.addEventListener('pointermove', function (e) { if (!down) return; var p = pt(e); g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke(); last = p; e.preventDefault(); });
    function up() { if (!down) return; down = false; if (!sig[id]) used('sign'); sig[id] = true; cv.classList.add('signed'); sigState(id, 'נחתם.'); renderPaper(); }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', up);
  });
  function sigState(id, t) { $(id + '-st').textContent = t; }
  document.querySelectorAll('[data-clear]').forEach(function (b) {
    b.addEventListener('click', function () { var cv = $(b.dataset.clear); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); sig[cv.id] = false; cv.classList.remove('signed'); sigState(cv.id, 'החתימה נמחקה.'); renderPaper(); });
  });
  // חלופה לציור (WCAG 2.5.7): מקלידים את השם, והוא נכתב על משטח החתימה
  document.querySelectorAll('[data-type]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.dataset.type, cv = $(id), inp = $(id + '-t'), t = inp.value.trim();
      if (!t) { sigState(id, 'כתבו קודם את השם בשדה.'); inp.focus(); return; }
      var g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
      var fs = 78; g.font = 'italic ' + fs + 'px Arial'; while (g.measureText(t).width > cv.width - 50 && fs > 30) { fs -= 4; g.font = 'italic ' + fs + 'px Arial'; }
      g.fillStyle = '#0b2a6b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.fillText(t, cv.width / 2, cv.height / 2);
      g.strokeStyle = '#0b2a6b'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, cv.height / 2 + fs * 0.62); g.lineTo(cv.width - 40, cv.height / 2 + fs * 0.62); g.stroke(); g.lineWidth = 4;
      if (!sig[id]) used('sign_typed'); sig[id] = true; cv.classList.add('signed'); sigState(id, 'נחתם בהקלדה: ' + t); renderPaper();
    });
  });
  function sigImg(id, who) { return sig[id] ? '<img alt="' + who + '" src="' + $(id).toDataURL('image/png') + '">' : '<div class="empty"></div>'; }

  // ---------- הדף ----------
  function today() { var d = new Date(); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function renderPaper() {
    var c = cur(), n = days(st.month), t = totals(), mo = +st.month.split('-')[1], k = K(), liva = st.kind === 'liva';
    var P = 1, T = liva; // כמה זוגות כניסה/יציאה ועמודת נסיעות. בטופס הליווי: תמיד 3 ונסיעות, כמו בטופס של החברה
    Object.keys(c).forEach(function (x) { P = Math.max(P, npairs(c[x])); if (hasTrip(c[x])) T = true; });
    if (liva) P = 3;
    var head = '<th scope="col">יום</th><th scope="col">יום בשבוע</th>';
    for (var p = 1; p <= P; p++) head += P > 1 ? '<th scope="col">כניסה ' + ROM[p] + '</th><th scope="col">יציאה ' + ROM[p] + '</th>' : '<th scope="col">משעה</th><th scope="col">עד שעה</th>';
    head += '<th scope="col">סה"כ שעות</th>' + (T ? '<th scope="col">נסיעות (משעה–עד שעה, יעד)</th>' : '') + '<th scope="col">הערות</th>';
    var rows = '';
    for (var d = 1; d <= n; d++) {
      var r = c[d] || {}, w = wd(st.month, d), m = dur(r), pr = pairs(r), cells = '';
      for (var q = 0; q < P; q++) { var ok = span(pr[q][0], pr[q][1]); cells += '<td>' + (ok ? pr[q][0] : '') + '</td><td>' + (ok ? pr[q][1] : '') + '</td>'; }
      var trip = hasTrip(r) ? (r.tf || r.tt ? '<span dir="ltr">' + esc(r.tf || '') + '–' + esc(r.tt || '') + '</span> ' : '') + esc(r.tg || '') : '';
      rows += '<tr' + (w === 6 ? ' class="sat"' : '') + '><td>' + d + '</td><td>' + DN[w] + '</td>' + cells + '<td><b>' + (m ? hm(m) : '') + '</b></td>' + (T ? '<td class="nt">' + trip + '</td>' : '') + '<td class="nt">' + esc(r.n || '') + '</td></tr>';
    }
    var D = st.d, span0 = 2 + P * 2;
    function who(title, nm, id, addr, tel, idl) {
      return '<div class="pp"><h4>' + title + '</h4><div><b>שם (פרטי + משפחה):</b> ' + esc(nm) + '</div>' + (id ? '<div><b>' + idl + ':</b> ' + esc(id) + '</div>' : '') +
        '<div><b>כתובת:</b> ' + esc(addr) + '</div><div><b>טלפון:</b> <span dir="ltr">' + esc(tel) + '</span></div></div>';
    }
    var s1 = liva ? 'מאשר/ת ש' + (D.wrk ? esc(D.wrk) : 'המלווה') + ' עבד/ה בהתאם למפורט לעיל' : 'מאשר/ת שהעובד/ת עבד/ה בהתאם למפורט לעיל';
    var s2 = 'מאשר/ת שביצעתי את העבודה כמפורט';
    $('sh-paper').className = 'ts-paper' + (P > 1 || T ? ' wide' : '');
    $('sh-paper').innerHTML = '<h3>' + k.title + (liva ? ': ' + esc(monthName(st.month)) : '') + '</h3>' + (liva ? '' : '<p class="mon">חודש הדיווח: ' + esc(monthName(st.month)) + '</p>') + (D.to ? '<p class="sub">' + (liva ? 'החברה / האזור: ' : 'אל: ') + esc(D.to) + '</p>' : '') +
      '<div class="info">' + who('פרטי ' + k.r1, D.emp, D.empId, D.empAddr, D.empTel, 'ת"ז') + who('פרטי ' + k.r2, D.wrk, D.wrkId, D.wrkAddr, D.wrkTel, liva ? 'ת"ז / מס\' דרכון' : 'ת"ז / דרכון') +
      '<div class="tot"><b>ימי עבודה:</b> ' + t.d + ' &nbsp;·&nbsp; <b>סה"כ שעות:</b> ' + hm(t.m) + ' (' + hdec(t.m) + ')' + (t.tr ? ' &nbsp;·&nbsp; <b>נסיעות:</b> ' + t.tr : '') + '</div></div>' +
      '<table><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td colspan="' + span0 + '">סה"כ שעות בחודש · ' + t.d + ' ימי עבודה</td><td>' + hm(t.m) + '</td>' + (T ? '<td></td>' : '') + '<td></td></tr></tfoot></table>' +
      '<div class="sigs"><div><p class="sl">' + s1 + '</p>' + sigImg('sh-sig1', 'חתימת ' + k.r1) + '<div class="ln">חתימת ' + k.r1 + (D.emp ? ': ' + esc(D.emp) : '') + ' &nbsp; תאריך: ' + today() + '</div></div>' +
      '<div><p class="sl">' + s2 + '</p>' + sigImg('sh-sig2', 'חתימת ' + k.r2) + '<div class="ln">חתימת ' + k.r2 + (D.wrk ? ': ' + esc(D.wrk) : '') + ' &nbsp; תאריך: ' + today() + '</div></div></div>' +
      '<p class="ft">הופק בכלי "דוח שעות חודשי למטפל" · hakelim.com</p>';
    fitPaper(); pdfReset();
  }

  // ---------- תזכורת חודשית (בטופס הליווי: שולחים עד ה-25) ----------
  function remind() {
    var p = st.month.split('-'), y = +p[0], m = +p[1], dt = y + pad(m) + '23', nx = y + pad(m) + '24';
    $('sh-cal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('לשלוח את דו"ח שעות הליווי (עד ה-25)') +
      '&dates=' + dt + '/' + nx + '&recur=' + encodeURIComponent('RRULE:FREQ=MONTHLY') + '&details=' + encodeURIComponent('ממלאים, חותמים ושולחים:\n' + location.origin + location.pathname);
  }
  $('sh-cal').addEventListener('click', function () { used('calendar'); });

  // ---------- PDF ושליחה ----------
  var pdfFile = null, pdfUrl = '';
  function pdfReset() { pdfFile = null; if (pdfUrl) { URL.revokeObjectURL(pdfUrl); pdfUrl = ''; } $('sh-out').hidden = true; var b = $('sh-pdf'); b.disabled = false; b.textContent = '📄 להכין PDF'; }
  function fname() { return ((st.kind === 'liva' ? 'דוח שעות ליווי - ' : 'דוח שעות - ') + (st.d.wrk || 'מטפל') + ' - ' + monthName(st.month)).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() + '.pdf'; }
  function mailText() { var t = totals(), k = K(); return 'שלום,\nמצורף דוח השעות' + (st.d.wrk ? ' של ' + st.d.wrk : '') + ' לחודש ' + monthName(st.month) + ', חתום על ידי ' + k.r1 + ' ו' + k.r2 + '.\nסה"כ ' + hm(t.m) + ' שעות ב-' + t.d + ' ימי עבודה.\nאשמח לאישור שהדוח התקבל.\n\nבברכה,\n' + (st.d.emp || ''); }
  function loadJs(src) { return new Promise(function (ok, no) { var x = document.createElement('script'); x.src = src; x.onload = ok; x.onerror = no; document.head.appendChild(x); }); }
  function makePdf() {
    var host = document.createElement('div'); host.className = 'ts-pdfhost'; host.setAttribute('aria-hidden', 'true');
    var pap = $('sh-paper').cloneNode(true); pap.removeAttribute('id'); pap.style.zoom = ''; host.appendChild(pap); document.body.appendChild(host);
    var libs = [window.htmlToImage ? 0 : loadJs('/assets/vendor/html-to-image/html-to-image-1.11.11.js'), window.jspdf ? 0 : loadJs('/assets/vendor/jspdf/jspdf-2.5.1.umd.min.js')];
    return Promise.all(libs).then(function () { return document.fonts ? document.fonts.ready : 0; }).then(function () {
      var W = 711, H = Math.ceil(pap.scrollHeight), r = Math.min(2, Math.sqrt(16e6 / (W * H)));
      return window.htmlToImage.toCanvas(pap, { width: W, height: H, pixelRatio: r, backgroundColor: '#ffffff', cacheBust: false }).then(function (cv) {
        var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
        var w = 188, h = H * 188 / W; if (h > 275) { w = w * 275 / h; h = 275; } // עמוד אחד תמיד
        doc.addImage(cv.toDataURL('image/jpeg', 0.85), 'JPEG', 11 + (188 - w) / 2, 11, w, h);
        return doc.output('blob');
      });
    }).then(function (b) { host.parentNode.removeChild(host); return b; }, function (e) { if (host.parentNode) host.parentNode.removeChild(host); throw e; });
  }
  $('sh-pdf').addEventListener('click', function () {
    var b = this; if (b.disabled) return;
    var miss = [], k = K();
    if (!st.d.emp) miss.push('שם ' + k.r1); if (!st.d.wrk) miss.push('שם ' + k.r2);
    if (!st.d.empAddr || !st.d.empTel) miss.push('כתובת וטלפון של ' + k.r1); if (!st.d.wrkAddr || !st.d.wrkTel) miss.push('כתובת וטלפון של ' + k.r2);
    if (st.kind === 'liva' && !st.d.wrkId) miss.push('ת"ז / דרכון של המלווה (בטופס הליווי זו חובה)');
    if (!totals().m) miss.push('שעות');
    if (!sig['sh-sig1'] || !sig['sh-sig2']) miss.push('שתי החתימות');
    if (st.demo) miss.unshift('הדוגמה עדיין כאן: כתבו את השמות שלכם');
    if (miss.length && !confirm('חסר: ' + miss.join(', ') + '.\nלהכין PDF בכל זאת?')) return;
    b.disabled = true; b.textContent = 'מכינים את ה-PDF…';
    makePdf().then(function (blob) {
      var name = fname(); pdfFile = new File([blob], name, { type: 'application/pdf' }); pdfUrl = URL.createObjectURL(blob);
      var dl = $('sh-dl'); dl.href = pdfUrl; dl.setAttribute('download', name); dl.hidden = false;
      var can = false; try { can = !!(navigator.canShare && navigator.canShare({ files: [pdfFile] })); } catch (e) {}
      $('sh-share').hidden = !can;
      var ml = $('sh-mailto'); ml.href = 'mailto:' + encodeURIComponent(st.d.mail || '') + '?subject=' + encodeURIComponent(name.replace(/\.pdf$/, '')) + '&body=' + encodeURIComponent(mailText()); ml.hidden = false;
      $('sh-msg').textContent = '✓ ה-PDF מוכן (' + Math.max(1, Math.round(blob.size / 1024)) + ' KB). ' + (can ? 'לוחצים "לשלוח" ובוחרים מייל או ווטסאפ – הקובץ כבר מצורף.' : 'מורידים את הקובץ, ואז פותחים מייל עם הנוסח ומצרפים אותו (📎).') + ' שמרו עותק אצלכם.';
      $('sh-out').hidden = false; b.textContent = '✓ ה-PDF מוכן';
      used('pdf', { kb: Math.round(blob.size / 1024), hours: hdec(totals().m) });
    }).catch(function () {
      b.disabled = false; b.textContent = '📄 להכין PDF';
      $('sh-msg').textContent = 'לא הצלחנו להכין PDF בדפדפן הזה. אפשר ללחוץ "להדפיס" ולבחור "שמירה כ-PDF".';
      $('sh-share').hidden = true; $('sh-dl').hidden = true; $('sh-mailto').hidden = true; $('sh-out').hidden = false;
    });
  });
  $('sh-share').addEventListener('click', function () {
    if (!pdfFile) return; used('share');
    navigator.share({ files: [pdfFile], title: pdfFile.name.replace(/\.pdf$/, ''), text: mailText() }).catch(function (e) {
      if (e && e.name === 'AbortError') return;
      navigator.share({ files: [pdfFile] }).catch(function () {}); // יש אפליקציות שלא מקבלות טקסט יחד עם קובץ
    });
  });
  $('sh-dl').addEventListener('click', function () { used('download'); });
  $('sh-mailto').addEventListener('click', function () { used('mailto'); });
  $('sh-print').addEventListener('click', function () { used('print'); window.print(); });

  // בטלפון הדף (ברוחב A4) מוקטן כדי שייראה כולו
  function fitPaper() { var p = $('sh-paper'), w = p.parentNode.clientWidth - 4; p.style.zoom = w > 0 && w < 711 ? (w / 711).toFixed(3) : ''; }
  window.addEventListener('resize', fitPaper);
  fillFields(); showDemo(); roles(); names(); renderWeek(); renderDays(); remind();
})();
