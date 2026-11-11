// דוח שעות חודשי למטפל: פרטים + סידור קבוע + שעות לפי ימים נשמרים בטלפון (localStorage).
// חתימות באצבע (לא נשמרות), ומהדף נוצר PDF (html-to-image + jsPDF מקומיים) לשליחה במייל / ווטסאפ.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sh-days')) return;
  var KEY = 'kelim-shikum-shaot', TOOL = 'shikum_shaot';
  var DN = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'], DS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  var NOTES = ['חופש', 'מחלה', 'חג', 'לא עבד/ה'];
  function pad(n) { return ('0' + n).slice(-2); }
  function defMonth() { var d = new Date(); if (d.getDate() <= 7) d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function blankWeek() { var w = []; for (var i = 0; i < 7; i++) w.push({ on: 0, a: '08:00', b: '14:00' }); return w; }
  function demoState() {
    var w = blankWeek(); for (var i = 0; i < 5; i++) w[i].on = 1; w[5] = { on: 1, a: '08:00', b: '12:00' };
    var s = { demo: 1, d: { emp: 'משה כהן', empId: '', empAddr: 'הרצל 12, רחובות', empTel: '050-0000000', wrk: 'מריה סנטוס', wrkId: '', wrkAddr: 'הרצל 12, רחובות', wrkTel: '052-0000000', to: 'אגף השיקום', mail: '' }, week: w, month: defMonth(), m: {} };
    s.m[s.month] = fillFrom(w, s.month); var k = Object.keys(s.m[s.month]);
    if (k[3]) s.m[s.month][k[3]] = { a: '', b: '', n: 'חופש' };
    var lng = k.filter(function (d) { return +d > 6 && s.m[s.month][d].a; })[0];
    if (lng) s.m[s.month][lng].b = '16:30'; // יום אחד ארוך יותר, כדי שיראו שמתקנים יום
    return s;
  }
  function used(how, x) { if (window.toolUsed) window.toolUsed(TOOL, Object.assign({ how: how }, x || {})); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function days(mo) { var p = mo.split('-'); return new Date(+p[0], +p[1], 0).getDate(); }
  function wd(mo, d) { var p = mo.split('-'); return new Date(+p[0], +p[1] - 1, d).getDay(); }
  function monthName(mo) { var p = mo.split('-'); try { return new Date(+p[0], +p[1] - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }); } catch (e) { return p[1] + '/' + p[0]; } }
  function fillFrom(w, mo) { var r = {}; for (var d = 1; d <= days(mo); d++) { var x = w[wd(mo, d)]; r[d] = x.on ? { a: x.a, b: x.b, n: '' } : { a: '', b: '', n: '' }; } return r; }
  function mins(t) { if (!t) return null; var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function dur(r) { var a = mins(r.a), b = mins(r.b); if (a === null || b === null) return 0; var m = b - a; if (m <= 0) m += 1440; return m; }
  function hm(m) { return Math.floor(m / 60) + ':' + pad(m % 60); }
  function hdec(m) { var h = Math.round(m / 6) / 10; return String(h).replace(/\.0$/, ''); }

  var st = null;
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!st || !st.week) st = demoState();
  if (!st.m) st.m = {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function cur() { if (!st.m[st.month]) st.m[st.month] = fillFrom(st.week, st.month); return st.m[st.month]; }

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
  $('sh-month').addEventListener('change', function () { if (!this.value) return; st.month = this.value; save(); renderDays(); used('month'); });
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
    var c = st.m[st.month], any = c && Object.keys(c).some(function (k) { return c[k].a || c[k].n; });
    if (any && !confirm('למלא מחדש את כל ' + monthName(st.month) + ' לפי הסידור? השינויים שעשיתם בחודש הזה יימחקו.')) return;
    st.m[st.month] = fillFrom(st.week, st.month); save(); renderDays(); used('fill');
  });

  // ---------- ימים ----------
  function renderDays() {
    var c = cur(), n = days(st.month), h = '';
    for (var d = 1; d <= n; d++) {
      var r = c[d] || (c[d] = { a: '', b: '', n: '' }), w = wd(st.month, d), m = dur(r);
      var dl = 'יום ' + DN[w] + ' ' + d + '.' + +st.month.split('-')[1];
      h += '<div class="ts-day' + (m ? ' work' : '') + (w === 6 ? ' sat' : '') + '" data-d="' + d + '" role="group" aria-label="' + dl + '"><div class="d" aria-hidden="true"><b>' + d + '.' + +st.month.split('-')[1] + '</b><small>יום ' + DS[w] + '</small></div>' +
        '<input type="time" value="' + (r.a || '') + '" data-k="a" aria-label="' + dl + ', משעה"><input type="time" value="' + (r.b || '') + '" data-k="b" aria-label="' + dl + ', עד שעה">' +
        '<span class="h"><span class="vh">שעות: </span>' + (m ? hm(m) : '–') + '</span>' +
        '<div class="nt">' + NOTES.map(function (t) { return '<button type="button" data-n="' + t + '" aria-pressed="' + (r.n === t) + '" aria-label="' + t + ' ב' + dl + '"' + (r.n === t ? ' class="on"' : '') + '>' + t + '</button>'; }).join('') + '</div></div>';
    }
    $('sh-days').innerHTML = h; summary(); renderPaper();
  }
  $('sh-days').addEventListener('change', function (e) {
    var row = e.target.closest('.ts-day'); if (!row || e.target.type !== 'time') return;
    var r = cur()[+row.dataset.d]; r[e.target.dataset.k] = e.target.value; if (r.a && r.b) r.n = '';
    var m = dur(r); row.querySelector('.h').innerHTML = '<span class="vh">שעות: </span>' + (m ? hm(m) : '–'); row.classList.toggle('work', !!m);
    row.querySelectorAll('.nt button').forEach(function (b) { b.classList.toggle('on', b.dataset.n === r.n); b.setAttribute('aria-pressed', String(b.dataset.n === r.n)); });
    save(); summary(); renderPaper();
  });
  $('sh-days').addEventListener('click', function (e) {
    var b = e.target.closest('.nt button'); if (!b) return; var row = b.closest('.ts-day'), r = cur()[+row.dataset.d];
    if (r.n === b.dataset.n) r.n = ''; else { r.n = b.dataset.n; r.a = ''; r.b = ''; }
    var d = row.dataset.d, n = b.dataset.n;
    save(); renderDays();
    var nb = document.querySelector('.ts-day[data-d="' + d + '"] .nt button[data-n="' + n + '"]'); if (nb) nb.focus(); // הפוקוס נשאר על הכפתור אחרי שהרשימה נבנית מחדש
  });
  function totals() { var c = cur(), t = 0, dd = 0; Object.keys(c).forEach(function (k) { var m = dur(c[k]); if (m) { t += m; dd++; } }); return { m: t, d: dd }; }
  function summary() { var t = totals(); $('sh-sum').innerHTML = '<div><b>' + hm(t.m) + '</b><span>שעות בחודש</span></div><div><b>' + t.d + '</b><span>ימי עבודה</span></div>'; }

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
    var c = cur(), n = days(st.month), t = totals(), mo = +st.month.split('-')[1], rows = '';
    for (var d = 1; d <= n; d++) {
      var r = c[d] || {}, w = wd(st.month, d), m = dur(r);
      rows += '<tr' + (w === 6 ? ' class="sat"' : '') + '><td>' + d + '.' + mo + '</td><td>' + DN[w] + '</td><td>' + (m ? r.a : '') + '</td><td>' + (m ? r.b : '') + '</td><td>' + (m ? hm(m) : '') + '</td><td class="nt">' + esc(r.n || '') + '</td></tr>';
    }
    var D = st.d;
    function who(title, n, id, addr, tel, idl) {
      return '<div class="pp"><h4>' + title + '</h4><div><b>שם:</b> ' + esc(n) + '</div>' + (id ? '<div><b>' + idl + ':</b> ' + esc(id) + '</div>' : '') +
        '<div><b>כתובת:</b> ' + esc(addr) + '</div><div><b>טלפון:</b> <span dir="ltr">' + esc(tel) + '</span></div></div>';
    }
    $('sh-paper').innerHTML = '<h3>דוח שעות עבודה חודשי – עובד/ת סיעודי/ת</h3><p class="mon">חודש הדיווח: ' + esc(monthName(st.month)) + '</p>' + (D.to ? '<p class="sub">אל: ' + esc(D.to) + '</p>' : '') +
      '<div class="info">' + who('פרטי המעסיק', D.emp, D.empId, D.empAddr, D.empTel, 'ת"ז') + who('פרטי העובד/ת', D.wrk, D.wrkId, D.wrkAddr, D.wrkTel, 'ת"ז / דרכון') +
      '<div class="tot"><b>ימי עבודה:</b> ' + t.d + ' &nbsp;·&nbsp; <b>סה"כ שעות:</b> ' + hm(t.m) + ' (' + hdec(t.m) + ')</div></div>' +
      '<table><thead><tr><th scope="col">תאריך</th><th scope="col">יום</th><th scope="col">משעה</th><th scope="col">עד שעה</th><th scope="col">שעות</th><th scope="col">הערה</th></tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td colspan="4">סה"כ בחודש</td><td>' + hm(t.m) + '</td><td class="nt">' + t.d + ' ימי עבודה</td></tr></tfoot></table>' +
      '<p class="decl">אנו מאשרים שהשעות בדוח הן השעות שבהן העובד/ת עבד/ה בפועל בחודש זה.</p>' +
      '<div class="sigs"><div>' + sigImg('sh-sig1', 'חתימת המעסיק') + '<div class="ln">חתימת המעסיק' + (D.emp ? ': ' + esc(D.emp) : '') + '</div></div><div>' + sigImg('sh-sig2', 'חתימת העובד/ת') + '<div class="ln">חתימת העובד/ת' + (D.wrk ? ': ' + esc(D.wrk) : '') + '</div></div></div>' +
      '<p class="sub" style="margin-top:6px">תאריך: ' + today() + '</p><p class="ft">הופק בכלי "דוח שעות חודשי למטפל" · hakelim.com</p>';
    pdfReset();
  }

  // ---------- PDF ושליחה ----------
  var pdfFile = null, pdfUrl = '';
  function pdfReset() { pdfFile = null; if (pdfUrl) { URL.revokeObjectURL(pdfUrl); pdfUrl = ''; } $('sh-out').hidden = true; var b = $('sh-pdf'); b.disabled = false; b.textContent = '📄 להכין PDF'; }
  function fname() { return ('דוח שעות - ' + (st.d.wrk || 'מטפל') + ' - ' + monthName(st.month)).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() + '.pdf'; }
  function mailText() { var t = totals(); return 'שלום,\nמצורף דוח השעות' + (st.d.wrk ? ' של ' + st.d.wrk : '') + ' לחודש ' + monthName(st.month) + ', חתום על ידי המעסיק והעובד/ת.\nסה"כ ' + hm(t.m) + ' שעות ב-' + t.d + ' ימי עבודה.\n\nבברכה,\n' + (st.d.emp || ''); }
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
    var miss = [];
    if (!st.d.emp) miss.push('שם המעסיק'); if (!st.d.wrk) miss.push('שם העובד/ת');
    if (!st.d.empAddr || !st.d.empTel) miss.push('כתובת וטלפון של המעסיק'); if (!st.d.wrkAddr || !st.d.wrkTel) miss.push('כתובת וטלפון של העובד/ת'); if (!totals().m) miss.push('שעות');
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
      $('sh-msg').textContent = '✓ ה-PDF מוכן (' + Math.max(1, Math.round(blob.size / 1024)) + ' KB). ' + (can ? 'לוחצים "לשלוח" ובוחרים מייל או ווטסאפ – הקובץ כבר מצורף.' : 'מורידים את הקובץ, ואז פותחים מייל עם הנוסח ומצרפים אותו (📎).');
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
  fillFields(); showDemo(); names(); renderWeek(); renderDays(); fitPaper();
})();
