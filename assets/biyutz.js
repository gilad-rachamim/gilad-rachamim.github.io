// מחשבון ביוץ: ביוץ משוער (וסת אחרונה + מחזור − 14), חלון פוריות (5 ימים לפני עד יום אחרי),
// מתי להתחיל בדיקות ביוץ (יום מחזור = מחזור − 17; ל-28 ימים זה יום 11), ולוח חודשי עם תאריך עברי.
// מחזור לא סדיר: ההתחלה לפי הקצר, החלון מהקצר ועד הארוך. הכול בדפדפן; נשמר רק ב-localStorage.
(function () {
  'use strict';
  var form = document.getElementById('bz-form'); if (!form) return;
  var KEY = 'bz1', DAY = 864e5;
  var $ = function (id) { return document.getElementById(id); };
  function D(y, m, d) { return new Date(y, m, d, 12); }
  function parse(v) { var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return p ? D(+p[1], p[2] - 1, +p[3]) : null; }
  function add(d, n) { return D(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function key(d) { return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function g(d) { return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); }
  var WD = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var GM = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  var fmt; try { fmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) {}
  var MON = { tishri: 'תשרי', tishrei: 'תשרי', heshvan: 'חשוון', cheshvan: 'חשוון', kislev: 'כסלו', tevet: 'טבת', shevat: 'שבט', 'adar i': 'אדר א׳', 'adar ii': 'אדר ב׳', adar: 'אדר', nisan: 'ניסן', iyar: 'אייר', sivan: 'סיוון', tamuz: 'תמוז', av: 'אב', elul: 'אלול' };
  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hunds = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    s += hunds[Math.floor(n / 100)]; n %= 100;
    if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else { s += tens[Math.floor(n / 10)]; s += ones[n % 10]; }
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  function hp(d) { var o = {}; if (fmt) fmt.formatToParts(d).forEach(function (p) { o[p.type] = p.value; }); var m = (o.month || '').toLowerCase(); return { day: +o.day, mon: MON[m] || m, year: +o.year }; }
  function heb(d) { if (!fmt) return ''; var h = hp(d); return gem(h.day) + ' ב' + h.mon + ' ' + gem(h.year % 1000); }

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  $('bz-irr').addEventListener('change', function () { $('bz-reg').hidden = this.checked; $('bz-irrf').hidden = !this.checked; });

  function calc(st) {
    var L = parse(st.d); if (!L) return { err: 'בחרי את היום הראשון של המחזור האחרון.' };
    var s = st.irr ? +st.s : +st.c, l = st.irr ? +st.l : +st.c;
    if (!(s >= 21 && s <= 40 && l >= 21 && l <= 40)) return { err: 'אורך מחזור בין 21 ל-40 ימים.' };
    if (s > l) return { err: 'המחזור הקצר צריך להיות קצר מהארוך (או שווה לו).' };
    return { L: L, s: s, l: l, irr: !!st.irr,
      ov1: add(L, s - 14), ov2: add(L, l - 14),
      f1: add(L, s - 19), f2: add(L, l - 13),
      test: add(L, s - 18), next: add(L, s), next2: add(L, l) };
  }

  var R = null, view = null;
  function marks() {
    var m = {}, cycles = R.irr ? 1 : 6;
    function put(d, c) { var k = key(d); m[k] = m[k] ? m[k] + ' ' + c : c; }
    for (var k = 0; k < cycles; k++) {
      var o = k * R.s;
      put(add(R.L, o), 'p1');
      for (var i = R.s - 18; i < R.s - 14 + (R.l - R.s); i++) put(add(R.L, o + i), 'tst');
      for (i = R.s - 19; i <= R.l - 13; i++) put(add(R.L, o + i), 'fert');
      for (i = R.s - 14; i <= R.l - 14; i++) put(add(R.L, o + i), 'ov');
    }
    return m;
  }
  function cal() {
    var y = view.getFullYear(), mo = view.getMonth(), first = D(y, mo, 1), last = D(y, mo + 1, 0), mk = marks();
    var t = new Date(), tk = key(D(t.getFullYear(), t.getMonth(), t.getDate()));
    var h1 = hp(first), h2 = hp(last);
    var hm = h1.mon === h2.mon ? h1.mon : h1.mon + '–' + h2.mon;
    var h = ['<div class="bz-cal-h"><button type="button" class="btn btn-line btn-sm" data-nav="-1" aria-label="החודש הקודם">→</button><b>' + GM[mo] + ' ' + y + '<small>' + hm + ' ' + gem(h2.year % 1000) + '</small></b><button type="button" class="btn btn-line btn-sm" data-nav="1" aria-label="החודש הבא">←</button></div><div class="bz-grid">'];
    ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].forEach(function (x) { h.push('<span class="dn">' + x + '</span>'); });
    for (var i = 0; i < first.getDay(); i++) h.push('<span></span>');
    for (var d = 1; d <= last.getDate(); d++) {
      var dt = D(y, mo, d), k = key(dt), c = mk[k] || '';
      if (/\bov\b/.test(c)) c = c.replace(/\b(tst|fert)\b/g, '');
      else if (/\bfert\b/.test(c)) c = c.replace(/\btst\b/g, '') + ' fert';
      h.push('<span class="d ' + c + (k === tk ? ' today' : '') + '"><b>' + d + '</b><small>' + gem(hp(dt).day) + '</small></span>');
    }
    h.push('</div>');
    $('bz-cal').innerHTML = h.join('');
  }

  function render(st) {
    var r = calc(st), res = $('bz-res');
    $('bz-err').textContent = r.err || '';
    if (r.err) { res.hidden = true; return; }
    R = r; view = D(r.L.getFullYear(), r.L.getMonth(), 1);
    function day(d) { return '<b>' + g(d) + '</b> <span class="hd">יום ' + WD[d.getDay()] + ' · ' + heb(d) + '</span>'; }
    var h = [];
    h.push('<div class="bz-row bz-ov"><span class="lbl">' + (r.irr ? 'ביוץ משוער – בין' : 'ביוץ משוער') + '</span>' + (r.irr && r.s !== r.l ? day(r.ov1) + '<span class="to">עד</span>' + day(r.ov2) : day(r.ov1)) + '</div>');
    h.push('<div class="bz-row bz-fert"><span class="lbl">ימי הפוריות</span>' + day(r.f1) + '<span class="to">עד</span>' + day(r.f2) + '</div>');
    h.push('<div class="bz-row bz-tst"><span class="lbl">להתחיל בדיקות ביוץ</span>' + day(r.test) + '<span class="sub">יום ' + (r.s - 17) + ' למחזור. בודקים כל יום, באותה שעה, עד שהבדיקה חיובית – לפי הוראות הערכה.</span></div>');
    h.push('<div class="bz-row"><span class="lbl">המחזור הבא צפוי</span>' + (r.irr && r.s !== r.l ? day(r.next) + '<span class="to">עד</span>' + day(r.next2) : day(r.next)) + '</div>');
    res.querySelector('.bz-out').innerHTML = h.join('');
    res.hidden = false;
    cal();
  }
  $('bz-cal').addEventListener('click', function (e) {
    var b = e.target.closest('[data-nav]'); if (!b || !view) return;
    view = D(view.getFullYear(), view.getMonth() + +b.getAttribute('data-nav'), 1); cal();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var st = { d: $('bz-date').value, irr: $('bz-irr').checked, c: $('bz-cycle').value, s: $('bz-short').value, l: $('bz-long').value };
    save(st); render(st);
    if (!$('bz-res').hidden) $('bz-res').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.toolUsed) window.toolUsed('biyutz', { how: 'calc', irr: st.irr ? 1 : 0 });
  });

  var sv = load();
  if (sv && sv.d) {
    $('bz-date').value = sv.d; $('bz-irr').checked = !!sv.irr; $('bz-cycle').value = sv.c || 28; $('bz-short').value = sv.s || 26; $('bz-long').value = sv.l || 32;
    $('bz-reg').hidden = !!sv.irr; $('bz-irrf').hidden = !sv.irr;
    render(sv);
  }
  window.bzCalc = calc;
})();
