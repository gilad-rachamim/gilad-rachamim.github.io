// בודק מספר הקצאה (חשבוניות ישראל): לפי תאריך החשבונית, הסכום לפני מע"מ וסוג הלקוח.
// הרפים: הודעת רשות המסים 24.5.2026 (gov.il/he/pages/pa240525-1). "עולה על" = יותר מהרף.
(function () {
  'use strict';
  var CH = window.CH; if (!CH || !CH.$('hakzaa')) return;
  var $ = CH.$, TOOL = 'cheshbon_hakzaa', KEY = 'kelim-cheshbon-hakzaa';
  var STEPS = [ // [מתאריך, רף לפני מע"מ]
    ['2026-06-01', 5000], ['2026-01-01', 10000], ['2025-01-01', 20000], ['2024-05-05', 25000]
  ];
  function limit(d) { var s = CH.iso(d); for (var i = 0; i < STEPS.length; i++) if (s >= STEPS[i][0]) return STEPS[i][1]; return null; }
  function vat(d) { return CH.iso(d) >= '2025-01-01' ? 0.18 : 0.17; }
  function judge(amt, d, incl, buyer) {
    var rate = vat(d), ex = incl ? CH.r2(amt / (1 + rate)) : amt, lim = limit(d);
    var r = { ex: ex, lim: lim, rate: rate };
    if (buyer === 'p') { r.need = false; r.why = 'לקוח פרטי או עוסק פטור לא מקזז מע"מ, ולכן לא צריך מספר הקצאה.'; return r; }
    if (lim == null) { r.need = false; r.why = 'בתאריך הזה עוד לא הייתה חובת מספר הקצאה (התחילה ב-5.5.2024).'; return r; }
    r.need = ex > lim;
    r.why = r.need ? 'הסכום לפני מע"מ (' + CH.money(ex) + ') עולה על הרף של ' + CH.money(lim, 0) + '.' : 'הסכום לפני מע"מ (' + CH.money(ex) + ') לא עולה על הרף של ' + CH.money(lim, 0) + '.';
    return r;
  }

  // ---------- חשבונית אחת ----------
  var amtIn = $('hk-amt'), dateIn = $('hk-date'), res = $('hk-res');
  var st = CH.load(KEY, null) || { vat: 'ex', buy: 'm', mvat: 'ex', list: '' };
  function pickedAmt() {
    var v = amtIn.value, n = CH.num(v);
    if (isNaN(n)) { var m = String(v).match(/-?\d[\d,]*(\.\d+)?/); n = m ? CH.num(m[0]) : NaN; }
    return n;
  }
  var lastKey = '';
  function showOne() {
    var n = pickedAmt(), d = dateIn.value ? CH.date(dateIn.value) : new Date();
    if (!isFinite(n) || n <= 0) { res.innerHTML = '<p class="hint">מקלידים סכום, למשל 7,500.</p>'; return; }
    var r = judge(n, d, st.vat === 'in', st.buy);
    var h = '<h3>' + (r.need ? '<span class="bad">צריך מספר הקצאה</span>' : '<span class="ok">לא צריך מספר הקצאה</span>') + '</h3>';
    h += '<p class="g" style="margin-top:.4rem">' + CH.esc(r.why) + '</p><div class="sum">';
    if (st.vat === 'in') h += '<div>סכום כולל מע"מ<b>' + CH.money(n) + '</b></div><div>מע"מ ' + Math.round(r.rate * 100) + '%<b>' + CH.money(CH.r2(n - r.ex)) + '</b></div>';
    h += '<div>לפני מע"מ<b>' + CH.money(r.ex) + '</b></div>';
    if (r.lim) h += '<div>הרף בתאריך ' + CH.heDate(d) + '<b>' + CH.money(r.lim, 0) + '</b></div>';
    h += '</div>';
    if (r.need) h += '<p class="hint">מי שמוציא את החשבונית מבקש את המספר מתוכנת החשבוניות, או ב<a class="gold" href="https://www.gov.il/he/service/request-assignment-number-for-tax-invoice" target="_blank" rel="noopener">שירות של רשות המסים</a>. בלי מספר הקצאה הלקוח לא יוכל לקזז את המע"מ.</p>';
    else if (r.lim && st.buy === 'm') h += '<p class="hint">עד ' + CH.money(r.lim * (1 + r.rate), 0) + ' כולל מע"מ – בלי מספר הקצאה.</p>';
    res.innerHTML = h;
    var k = [n, dateIn.value, st.vat, st.buy].join('|'); if (k !== lastKey) { lastKey = k; CH.used(TOOL, 'check'); }
  }
  var t; amtIn.addEventListener('input', function () { clearTimeout(t); t = setTimeout(showOne, 200); });
  dateIn.addEventListener('change', showOne);
  CH.seg($('hk-vat'), function (v) { st.vat = v; CH.save(KEY, st); showOne(); });
  CH.seg($('hk-buy'), function (v) { st.buy = v; CH.save(KEY, st); showOne(); });
  $('hk-one').addEventListener('submit', function (e) { e.preventDefault(); showOne(); });

  // ---------- רשימה ----------
  var out = $('hk-out'), msg = $('hk-msg');
  function runMany() {
    var rows = CH.rows($('hk-list').value).slice(0, 5000), list = [], skipped = 0;
    rows.forEach(function (r) {
      var d = null, nums = [], txt = [];
      r.forEach(function (c) {
        var dd = !d && /[./\-]/.test(c) ? CH.date(c) : null;
        if (dd) { d = dd; return; }
        var n = CH.num(c); if (isFinite(n) && c !== '') nums.push([c, n]); else if (c) txt.push(c);
      });
      if (!d || !nums.length) { if (r.join('').trim() && !/תאריך|סכום/.test(r.join(' '))) skipped++; return; }
      var amt = nums[nums.length - 1][1];              // הסכום = המספר האחרון בשורה
      var other = nums.slice(0, -1).map(function (x) { return x[0]; }); // מספר חשבונית וכו'
      list.push({ d: d, amt: amt, note: other.concat(txt).join(' · '), r: judge(amt, d, st.mvat === 'in', 'm') });
    });
    if (!list.length) { msg.textContent = 'לא מצאתי שורות עם תאריך וסכום. מדביקים מאקסל: תאריך וסכום בכל שורה.'; out.innerHTML = ''; return; }
    st.list = $('hk-list').value.slice(0, 60000); CH.save(KEY, st);
    var need = list.filter(function (x) { return x.r.need; }), sum = 0;
    need.forEach(function (x) { sum += x.r.ex; });
    msg.textContent = skipped ? skipped + ' שורות דילגתי (בלי תאריך או סכום).' : '';
    var h = '<div class="res"><h3>' + list.length + ' חשבוניות · <span class="bad">' + need.length + ' צריכות מספר הקצאה</span> · <span class="ok">' + (list.length - need.length) + ' לא</span></h3>';
    if (need.length) h += '<p class="hint">סך החשבוניות שצריכות מספר הקצאה: ' + CH.money(CH.r2(sum)) + ' לפני מע"מ.</p>';
    h += '<div class="btns no-print"><button class="btn btn-gold btn-sm" type="button" id="hk-csv">להוריד לאקסל</button><button class="btn btn-line btn-sm" type="button" onclick="window.print()">להדפיס</button></div>';
    h += '<div class="tbl-wrap"><table><thead><tr><th>תאריך</th><th>סכום</th><th>לפני מע"מ</th><th>רף</th><th>מספר הקצאה?</th><th>פרטים</th></tr></thead><tbody>';
    var csv = [['תאריך', 'סכום', 'לפני מע"מ', 'רף', 'צריך מספר הקצאה', 'פרטים']];
    list.forEach(function (x) {
      h += '<tr class="' + (x.r.need ? 'is-bad' : 'is-ok') + '"><td class="n">' + CH.heDate(x.d) + '</td><td class="n">' + CH.money(x.amt) + '</td><td class="n">' + CH.money(x.r.ex) + '</td><td class="n">' + (x.r.lim ? CH.money(x.r.lim, 0) : '—') + '</td><td>' + (x.r.need ? '<span class="bad">צריך</span>' : '<span class="ok">לא</span>') + '</td><td>' + CH.esc(x.note) + '</td></tr>';
      csv.push([CH.heDate(x.d), x.amt, x.r.ex, x.r.lim || '', x.r.need ? 'כן' : 'לא', x.note]);
    });
    h += '</tbody></table></div></div>';
    out.innerHTML = h;
    $('hk-csv').onclick = function () { CH.csv('mispar-hakzaa-' + CH.iso(new Date()) + '.csv', csv); CH.used(TOOL, 'csv'); };
    CH.used(TOOL, 'batch');
  }
  $('hk-go').addEventListener('click', runMany);
  CH.seg($('hk-mvat'), function (v) { st.mvat = v; CH.save(KEY, st); if ($('hk-list').value.trim()) runMany(); });

  function setMode(m) {
    CH.pick($('hk-mode'), m);
    $('hk-one').hidden = res.hidden = m !== 'one';
    $('hk-many').hidden = out.hidden = m !== 'many';
    if (m === 'many' && !out.innerHTML) runMany();
  }
  CH.seg($('hk-mode'), setMode);

  // ---------- כניסה: דוגמה מלאה ----------
  CH.pick($('hk-vat'), st.vat); CH.pick($('hk-buy'), st.buy); CH.pick($('hk-mvat'), st.mvat);
  dateIn.value = CH.iso(new Date());
  $('hk-list').value = st.list || '15/05/2026\t1040\tלקוח א\t8,500\n03/06/2026\t1041\tלקוח א\t8,500\n10/06/2026\t1042\tלקוח ב\t4,999\n21/06/2026\t1043\tלקוח ג\t5,000.01\n02/11/2026\t1044\tלקוח ד\t12,300';
  var qs = (location.search.match(/[?&]s=([\d.,]+)/) || [])[1];
  amtIn.value = qs ? decodeURIComponent(qs) : '7,500';
  showOne();
})();
