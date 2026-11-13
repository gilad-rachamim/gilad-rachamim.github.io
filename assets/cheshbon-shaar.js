// שער יציג של בנק ישראל: היום, לכל תאריך, ממיר, הפרשי שער ורשימה מאקסל.
// הנתונים מה-Worker kelim-shaar (tools/shaar-worker), שמביא מבנק ישראל ושומר במטמון.
(function () {
  'use strict';
  var CH = window.CH; if (!CH || !CH.$('shaar')) return;
  var $ = CH.$, TOOL = 'cheshbon_shaar', KEY = 'kelim-cheshbon-shaar';
  var API = 'https://kelim-shaar.gilad4049.workers.dev/';
  try { var o = localStorage.getItem('kelim-shaar-api'); if (o && /^http:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(o)) API = o; } catch (e) {}
  var NAMES = { USD: 'דולר ארה"ב', EUR: 'יורו', GBP: 'לירה שטרלינג', CHF: 'פרנק שווייצרי', JPY: 'ין יפני', CAD: 'דולר קנדי', AUD: 'דולר אוסטרלי',
    SEK: 'כתר שוודי', NOK: 'כתר נורווגי', DKK: 'כתר דני', JOD: 'דינר ירדני', EGP: 'לירה מצרית', LBP: 'לירה לבנונית', ZAR: 'ראנד דרום אפריקאי' };
  var SYM = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', 'דולר': 'USD', 'יורו': 'EUR', 'אירו': 'EUR', 'פאונד': 'GBP', 'שטרלינג': 'GBP', 'פרנק': 'CHF', 'ין': 'JPY' };
  var cache = {}, st = CH.load(KEY, null) || { cur: 'USD', dir: 'to' };

  function today() { var d = new Date(); return CH.iso(new Date(d.getFullYear(), d.getMonth(), d.getDate())); }
  function getDay(d) {
    d = d || today();
    if (!cache[d]) cache[d] = fetch(API + '?date=' + d).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { var m = {}; (j.rates || []).forEach(function (x) { m[x.c] = x; }); return m; })
      .catch(function (e) { delete cache[d]; throw e; });
    return cache[d];
  }
  function per1(x) { return x.v / x.u; } // שקלים ליחידה אחת
  function rateTxt(x) { return x.v.toLocaleString('he-IL', { maximumFractionDigits: 4 }) + ' ₪' + (x.u > 1 ? ' ל-' + x.u + ' ' + (NAMES[x.c] || x.c) : ''); }
  function dTxt(s) { var p = s.split('-'); return +p[2] + '.' + +p[1] + '.' + p[0]; }
  function fail(el) { el.innerHTML = '<p class="hint">לא הצלחתי להביא את השער מבנק ישראל כרגע. נסו שוב בעוד רגע.</p>'; }

  // ---------- היום ----------
  function showToday() {
    var box = $('sh-today');
    getDay().then(function (m) {
      var u = m.USD, e = m.EUR;
      if (!u) { fail(box); return; }
      var all = Object.keys(m).map(function (k) { return m[k]; });
      box.innerHTML = '<h3>השער היציג האחרון · ' + dTxt(u.d) + '</h3>' +
        '<div class="sum"><div>דולר ארה"ב<b>' + rateTxt(u) + '</b></div>' + (e ? '<div>יורו<b>' + rateTxt(e) + '</b></div>' : '') + '</div>' +
        '<details style="margin-top:.6rem"><summary>כל ' + all.length + ' המטבעות</summary><div class="tbl-wrap"><table><thead><tr><th>מטבע</th><th>שער יציג</th><th>תאריך</th></tr></thead><tbody>' +
        all.map(function (x) { return '<tr><td>' + CH.esc(NAMES[x.c] || x.c) + ' (' + x.c + ')</td><td class="n">' + rateTxt(x) + '</td><td class="n">' + dTxt(x.d) + '</td></tr>'; }).join('') +
        '</tbody></table></div></details>';
      fillCur(all.map(function (x) { return x.c; }));
    }, function () { fail(box); fillCur(Object.keys(NAMES)); });
  }
  var filled = false;
  function fillCur(list) {
    if (filled) return; filled = true;
    var h = list.map(function (c) { return '<option value="' + c + '">' + CH.esc(NAMES[c] || c) + ' (' + c + ')</option>'; }).join('');
    ['sh-cur', 'sd-cur'].forEach(function (id) { $(id).innerHTML = h; $(id).value = st.cur; if (!$(id).value) $(id).value = 'USD'; });
    conv(); diff();
  }

  // ---------- ממיר ----------
  function pickAmt(el, curEl) {
    var v = el.value, n = CH.num(v);
    if (isNaN(n)) { var m = String(v).match(/-?\d[\d,]*(\.\d+)?/); n = m ? CH.num(m[0]) : NaN; }
    // סימן מטבע בטקסט שסומן בתוסף: "$1,200" / "1,200 יורו"
    if (curEl) Object.keys(SYM).some(function (s) { if (v.indexOf(s) >= 0 && curEl.querySelector('option[value="' + SYM[s] + '"]')) { curEl.value = SYM[s]; return true; } return false; });
    var code = String(v).match(/\b(USD|EUR|GBP|CHF|JPY|CAD|AUD|SEK|NOK|DKK|JOD|EGP|ZAR)\b/i);
    if (curEl && code && curEl.querySelector('option[value="' + code[1].toUpperCase() + '"]')) curEl.value = code[1].toUpperCase();
    return n;
  }
  var lastK = '';
  function conv() {
    var res = $('sh-res'), n = pickAmt($('sh-amt'), $('sh-cur')), c = $('sh-cur').value, d = $('sh-date').value || today(), dir = $('sh-dir').value;
    if (!c) return;
    st.cur = c; st.dir = dir; CH.save(KEY, st);
    if (!isFinite(n)) { res.innerHTML = ''; return; }
    getDay(d).then(function (m) {
      var x = m[c]; if (!x) { res.innerHTML = '<p class="hint">אין שער יציג למטבע הזה בתאריך הזה.</p>'; return; }
      var r = per1(x), out = dir === 'to' ? n * r : n / r;
      var a = dir === 'to' ? n.toLocaleString('he-IL', { maximumFractionDigits: 2 }) + ' ' + (NAMES[c] || c) : CH.money(n);
      var b = dir === 'to' ? CH.money(CH.r2(out)) : out.toLocaleString('he-IL', { maximumFractionDigits: 2 }) + ' ' + (NAMES[c] || c);
      res.innerHTML = '<h3>' + CH.esc(a) + ' =</h3><div class="big">' + CH.esc(b) + '</div><p class="g" style="margin-top:.4rem">לפי השער היציג של ' + dTxt(x.d) + ': ' + rateTxt(x) + '</p>' +
        (x.d !== d ? '<p class="hint">ב-' + dTxt(d) + ' לא פורסם שער, ולכן נלקח השער האחרון שפורסם לפניו.</p>' : '');
      var k = [n, c, d, dir].join('|'); if (k !== lastK) { lastK = k; CH.used(TOOL, 'convert'); }
    }, function () { fail(res); });
  }
  var t1; $('sh-conv').addEventListener('input', function () { clearTimeout(t1); t1 = setTimeout(conv, 250); });
  $('sh-conv').addEventListener('change', conv);
  $('sh-conv').addEventListener('submit', function (e) { e.preventDefault(); conv(); });

  // ---------- הפרשי שער ----------
  function diff() {
    var res = $('sd-res'), n = pickAmt($('sd-amt'), $('sd-cur')), c = $('sd-cur').value, d1 = $('sd-d1').value, d2 = $('sd-d2').value;
    if (!c || !isFinite(n) || !d1 || !d2) { res.innerHTML = ''; return; }
    Promise.all([getDay(d1), getDay(d2)]).then(function (mm) {
      var x1 = mm[0][c], x2 = mm[1][c]; if (!x1 || !x2) { res.innerHTML = '<p class="hint">אין שער יציג למטבע הזה באחד התאריכים.</p>'; return; }
      var a1 = CH.r2(n * per1(x1)), a2 = CH.r2(n * per1(x2)), df = CH.r2(a2 - a1);
      res.innerHTML = '<div class="sum"><div>בחשבונית (' + dTxt(x1.d) + ', ' + rateTxt(x1) + ')<b>' + CH.money(a1) + '</b></div>' +
        '<div>בתשלום (' + dTxt(x2.d) + ', ' + rateTxt(x2) + ')<b>' + CH.money(a2) + '</b></div>' +
        '<div class="tot">' + (df > 0 ? 'רווח מהפרשי שער' : df < 0 ? 'הפסד מהפרשי שער' : 'אין הפרש') + '<b>' + CH.money(Math.abs(df)) + '</b></div></div>' +
        '<p class="hint">מנקודת המבט של מי שקיבל את התשלום במטבע. אצל מי ששילם – להפך.</p>';
      CH.used(TOOL, 'diff');
    }, function () { fail(res); });
  }
  var t2; $('sh-diff').addEventListener('input', function () { clearTimeout(t2); t2 = setTimeout(diff, 300); });
  $('sh-diff').addEventListener('change', diff);
  $('sh-diff').addEventListener('submit', function (e) { e.preventDefault(); diff(); });

  // ---------- רשימה ----------
  var busy = false;
  function runMany() {
    if (busy) return;
    var msg = $('sm-msg'), out = $('sm-out'), rows = CH.rows($('sm-list').value).slice(0, 1000), list = [];
    rows.forEach(function (r) {
      var d = null, n = NaN, c = null, txt = [];
      r.forEach(function (cell) {
        var dd = !d && /[./\-]/.test(cell) ? CH.date(cell) : null; if (dd) { d = dd; return; }
        var up = cell.toUpperCase().trim();
        if (!c && NAMES[up]) { c = up; return; }
        if (!c && SYM[cell.trim()]) { c = SYM[cell.trim()]; return; }
        var k = Object.keys(SYM).filter(function (s) { return cell.indexOf(s) >= 0; })[0];
        var num = CH.num(cell.replace(/[$€£¥]/g, '').replace(/[A-Za-z]{3}/, ''));
        if (isFinite(num) && isNaN(n)) { n = num; if (!c && k) c = SYM[k]; return; }
        if (cell) txt.push(cell);
      });
      if (d && isFinite(n)) list.push({ d: CH.iso(d), n: n, c: c || 'USD', note: txt.join(' · '), guess: !c });
    });
    if (!list.length) { msg.textContent = 'לא מצאתי שורות עם תאריך וסכום.'; out.innerHTML = ''; return; }
    CH.save(KEY + '-list', $('sm-list').value.slice(0, 60000));
    var days = []; list.forEach(function (x) { if (days.indexOf(x.d) < 0) days.push(x.d); });
    busy = true; msg.textContent = 'מביא שערים ל-' + days.length + ' תאריכים…';
    var i = 0, done = 0;
    function next() {
      if (i >= days.length) return;
      var d = days[i++];
      getDay(d).then(null, function () { return null; }).then(function () { done++; if (done === days.length) finish(); else next(); });
    }
    for (var k = 0; k < Math.min(4, days.length); k++) next();
    function finish() {
      Promise.all(days.map(function (d) { return getDay(d).catch(function () { return {}; }); })).then(function (maps) {
        var M = {}; days.forEach(function (d, j) { M[d] = maps[j]; });
        var sum = 0, bad = 0, csv = [['תאריך', 'סכום', 'מטבע', 'שער יציג', 'יחידה', 'תאריך השער', 'בשקלים', 'פרטים']];
        var h = '<div class="res"><h3>' + list.length + ' שורות</h3><div class="btns no-print"><button class="btn btn-gold btn-sm" type="button" id="sm-csv">להוריד לאקסל</button><button class="btn btn-line btn-sm" type="button" onclick="window.print()">להדפיס</button></div><div class="tbl-wrap"><table><thead><tr><th>תאריך</th><th>סכום</th><th>שער</th><th>בשקלים</th><th>פרטים</th></tr></thead><tbody>';
        list.forEach(function (x) {
          var r = M[x.d] && M[x.d][x.c];
          if (!r) { bad++; h += '<tr class="is-bad"><td class="n">' + dTxt(x.d) + '</td><td class="n">' + x.n + ' ' + x.c + '</td><td colspan="2">אין שער</td><td>' + CH.esc(x.note) + '</td></tr>'; csv.push([dTxt(x.d), x.n, x.c, '', '', '', '', x.note]); return; }
          var ils = CH.r2(x.n * per1(r)); sum += ils;
          h += '<tr><td class="n">' + dTxt(x.d) + '</td><td class="n">' + x.n.toLocaleString('he-IL') + ' ' + x.c + (x.guess ? '*' : '') + '</td><td class="n">' + rateTxt(r).replace(/ ל-.*/, r.u > 1 ? ' /' + r.u : '') + (r.d !== x.d ? ' (' + dTxt(r.d) + ')' : '') + '</td><td class="n"><b>' + CH.money(ils) + '</b></td><td>' + CH.esc(x.note) + '</td></tr>';
          csv.push([dTxt(x.d), x.n, x.c, r.v, r.u, dTxt(r.d), ils, x.note]);
        });
        h += '<tr><th colspan="3">סה"כ בשקלים</th><th class="n">' + CH.money(CH.r2(sum)) + '</th><th></th></tr></tbody></table></div>';
        if (list.some(function (x) { return x.guess; })) h += '<p class="hint">* לא נמצא מטבע בשורה, ולכן הונח דולר.</p>';
        out.innerHTML = h + '</div>';
        $('sm-csv').onclick = function () { CH.csv('shaar-yatzig-' + today() + '.csv', csv); CH.used(TOOL, 'csv'); };
        msg.textContent = bad ? bad + ' שורות בלי שער (מטבע לא מוכר או תאריך מוקדם מדי).' : '';
        busy = false; CH.used(TOOL, 'batch');
      });
    }
  }
  $('sm-go').addEventListener('click', runMany);

  function setMode(m) {
    CH.pick($('sh-mode'), m);
    $('sh-conv').hidden = $('sh-res').hidden = m !== 'conv';
    $('sh-diff').hidden = $('sd-res').hidden = m !== 'diff';
    $('sh-many').hidden = $('sm-out').hidden = m !== 'many';
    if (m === 'many' && !$('sm-out').innerHTML) runMany();
    if (m === 'diff') diff();
  }
  CH.seg($('sh-mode'), setMode);

  // ---------- כניסה: דוגמה מלאה ----------
  var t = today(), d30 = new Date(); d30.setDate(d30.getDate() - 30);
  $('sh-date').value = t; $('sh-dir').value = st.dir || 'to';
  $('sh-amt').value = '1,000';
  $('sd-amt').value = '5,000'; $('sd-d1').value = CH.iso(d30); $('sd-d2').value = t;
  var d1 = new Date(); d1.setDate(d1.getDate() - 45); var d2 = new Date(); d2.setDate(d2.getDate() - 20);
  $('sm-list').value = CH.load(KEY + '-list', '') || (CH.heDate(d1).replace(/\./g, '/') + '\t2,400\tUSD\tחשבונית 1201\n' + CH.heDate(d2).replace(/\./g, '/') + '\t€1,150\t\tחשבונית 1202\n' + CH.heDate(new Date()).replace(/\./g, '/') + '\t3,000\tGBP\tחשבונית 1203');
  showToday();
})();
