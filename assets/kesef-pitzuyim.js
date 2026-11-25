/* מחשבון פיצויי פיטורין: חישוב לפי חוק פיצויי פיטורים (1963) וחוק הודעה מוקדמת (2001).
   הליבה (core) נבדקת ב-tools/test_pitzuyim.js. הממשק מתחבר רק אם יש בדף #pz. */
(function (root) {
  'use strict';

  // קבועים (נכון ל-2026). לעדכן רק כאן.
  var CONST = {
    TAX_EXEMPT_CEILING: 13750,   // תקרת פטור ממס לכל שנת עבודה (הערכה)
    SEC14_FULL: 8.33,            // אחוז הפרשה שמחליף פיצויים במלואם
    SEC14_MANDATORY: 6,          // הפרשה לפיצויים לפי צו ההרחבה לפנסיית חובה
    MIN_MONTHS: 12               // זכאות לפיצויים: שנת עבודה רצופה אצל אותו מעסיק
  };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
    return d;
  }
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }

  /* תקופת ההעסקה כולל יום הסיום: שנים, חודשים וימים מלאים */
  function period(startStr, endStr) {
    var s = parseDate(startStr), e = parseDate(endStr);
    if (!s || !e) return { error: 'חסר תאריך' };
    if (e < s) return { error: 'תאריך הסיום קודם לתאריך ההתחלה' };
    var e1 = new Date(e.getTime() + 86400000); // סיום כולל
    var y = e1.getUTCFullYear() - s.getUTCFullYear();
    var m = e1.getUTCMonth() - s.getUTCMonth();
    var d = e1.getUTCDate() - s.getUTCDate();
    if (d < 0) {
      m--;
      var pm = e1.getUTCMonth() - 1, py = e1.getUTCFullYear();
      if (pm < 0) { pm = 11; py--; }
      d += daysInMonth(py, pm);
    }
    if (m < 0) { y--; m += 12; }
    var dimBase = (function () {
      var pm = e1.getUTCMonth() - 1, py = e1.getUTCFullYear();
      if (pm < 0) { pm = 11; py--; }
      return daysInMonth(py, pm);
    })();
    var years = y + (m + d / dimBase) / 12;
    return { y: y, m: m, d: d, months: y * 12 + m, years: years, totalDays: Math.round((e1 - s) / 86400000) };
  }

  /* הודעה מוקדמת בימים קלנדריים לפי חוק הודעה מוקדמת לפיטורים ולהתפטרות, התשס"א-2001 */
  function noticeDays(fullMonths, monthlyPaid) {
    var m = Math.max(0, fullMonths);
    if (monthlyPaid) {
      if (m >= 12) return 30;
      if (m <= 6) return m;
      return 6 + 2.5 * (m - 6);
    }
    if (m < 12) return m;            // עד שנה: יום לכל חודש
    if (m < 24) return 14 + Math.floor((m - 12) / 2);
    if (m < 36) return 21 + Math.floor((m - 24) / 2);
    return 30;
  }

  function avg(list) {
    var v = list.filter(function (x) { return typeof x === 'number' && isFinite(x) && x > 0; });
    if (!v.length) return 0;
    return v.reduce(function (a, b) { return a + b; }, 0) / v.length;
  }
  function r2(x) { return Math.round(x * 100) / 100; }
  function nis(x) { return '₪' + Number(r2(x)).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  function num(x, d) { return Number(Number(x).toFixed(d === undefined ? 2 : d)).toString(); }

  /* in: {reason:'fired'|'resign_equiv'|'resign', start, end, payType:'monthly'|'hourly'|'variable',
          salary, hourlyRate, hoursPerMonth, months:[..12], scopeChanged, scopeAvg, scopeLast,
          sec14:'none'|'full'|'six', sec14Start, noticeGiven} */
  function calc(inp) {
    var steps = [], out = { ok: false, steps: steps, notes: [] };
    var p = period(inp.start, inp.end);
    if (p.error) { out.error = p.error; return out; }
    out.period = p;

    // שלב 1: שכר בסיס
    var base = 0;
    if (inp.payType === 'hourly') {
      base = (+inp.hourlyRate || 0) * (+inp.hoursPerMonth || 0);
      steps.push('שכר חודשי ממוצע: ' + nis(+inp.hourlyRate || 0) + ' לשעה × ' + num(+inp.hoursPerMonth || 0, 1) + ' שעות בחודש = ' + nis(base));
    } else if (inp.payType === 'variable') {
      var list = (inp.months || []).map(Number);
      base = avg(list);
      var cnt = list.filter(function (x) { return x > 0; }).length;
      steps.push('שכר חודשי ממוצע: ממוצע של ' + cnt + ' חודשים ששכרם הוזן = ' + nis(base));
    } else {
      base = +inp.salary || 0;
      steps.push('שכר חודשי אחרון: ' + nis(base));
    }
    if (!(base > 0)) { out.error = 'חסר שכר'; return out; }

    // היקף משרה
    var scopeFactor = 1;
    if (inp.scopeChanged) {
      var sa = +inp.scopeAvg || 0, sl = +inp.scopeLast || 0;
      if (sa > 0 && sl > 0) {
        scopeFactor = sa / sl;
        steps.push('היקף המשרה השתנה: ממוצע ' + num(sa, 1) + '% מול ' + num(sl, 1) + '% בחודש האחרון, לכן מכפילים ב-' + num(scopeFactor, 3));
      }
    }
    var basis = base * scopeFactor;
    out.basis = r2(basis);

    // שלב 2: שנות ותק
    steps.push('תקופת העסקה: ' + p.y + ' שנים, ' + p.m + ' חודשים ו-' + p.d + ' ימים (כולל יום הסיום) = ' + num(p.years, 4) + ' שנות עבודה');

    // שלב 3: זכאות
    var eligibleReason = inp.reason === 'fired' || inp.reason === 'resign_equiv';
    var eligible = eligibleReason && p.months >= CONST.MIN_MONTHS;
    out.eligible = eligible;
    var full = 0;
    if (!eligibleReason) {
      steps.push('התפטרות רגילה: לפי חוק פיצויי פיטורים אין זכאות לפיצויים, אלא אם נקבע אחרת בחוזה, בהסכם קיבוצי או בהסדר הפנסיה.');
    } else if (!eligible) {
      steps.push('פחות משנת עבודה רצופה אצל אותו מעסיק: בדרך כלל אין זכאות לפיצויי פיטורים (יש חריגים, כמו עונתיים והריון).');
    } else {
      full = basis * p.years;
      steps.push('פיצויים מלאים: ' + nis(basis) + ' × ' + num(p.years, 4) + ' שנים = ' + nis(full));
    }
    out.full = r2(full);

    // שלב 4: סעיף 14
    var payable = full, deposited = 0;
    if (eligible && inp.sec14 && inp.sec14 !== 'none') {
      var ds = parseDate(inp.sec14Start) ? inp.sec14Start : inp.start;
      var dp = period(ds, inp.end);
      var depYears = dp.error ? 0 : Math.min(p.years, dp.years);
      var rate = inp.sec14 === 'full' ? 1 : CONST.SEC14_MANDATORY / CONST.SEC14_FULL;
      var coveredPart = basis * depYears * rate;
      deposited = coveredPart;
      payable = Math.max(0, full - coveredPart);
      steps.push('סעיף 14: ' + (inp.sec14 === 'full'
        ? 'הפרשות של ' + CONST.SEC14_FULL + '% בהסכמה לפי סעיף 14 מכסות את הפיצויים ' + num(depYears, 2) + ' שנים (' + nis(coveredPart) + ')'
        : 'הפרשות של ' + CONST.SEC14_MANDATORY + '% מכסות כ-72% מהפיצויים ' + num(depYears, 2) + ' שנים (' + nis(coveredPart) + '), ואת היתרה (כ-28%) המעסיק משלים'));
      steps.push('נשאר לתשלום מהמעסיק (בנוסף לכספים שנצברו בקופה): ' + nis(payable));
    } else if (eligible) {
      steps.push('אין הפרשות לפי סעיף 14, ולכן כל הסכום משולם על ידי המעסיק.');
    }
    out.payable = r2(payable);
    out.deposited = r2(deposited);

    // שלב 5: פטור ממס (הערכה)
    var exempt = 0;
    if (eligible) {
      exempt = Math.min(full, Math.min(base, CONST.TAX_EXEMPT_CEILING) * p.years);
      out.taxExempt = r2(exempt);
      out.taxable = r2(Math.max(0, full - exempt));
      steps.push('פטור ממס (הערכה): הנמוך מבין השכר האחרון והתקרה (' + nis(CONST.TAX_EXEMPT_CEILING) + ') × שנות העבודה = ' + nis(exempt));
    }

    // הודעה מוקדמת
    var monthlyPaid = inp.payType !== 'hourly';
    var nd = noticeDays(p.months, monthlyPaid);
    out.noticeDays = nd;
    var given = Math.max(0, +inp.noticeGiven || 0);
    var missing = Math.max(0, nd - given);
    out.noticeMissingDays = missing;
    out.noticePay = r2(base * missing / 30);
    steps.push('הודעה מוקדמת: ' + num(p.months, 0) + ' חודשי ותק מלאים, ' + (monthlyPaid ? 'שכר חודשי' : 'שכר שעתי או יומי') + ' = ' + num(nd, 1) + ' ימים קלנדריים');
    if (missing > 0) steps.push('לא ניתנה הודעה מוקדמת מלאה: חסרים ' + num(missing, 1) + ' ימים × (' + nis(base) + ' ÷ 30) = ' + nis(out.noticePay));

    out.ok = true;
    return out;
  }

  var api = { calc: calc, period: period, noticeDays: noticeDays, CONST: CONST, nis: nis };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.PZ = api;

  // ---------- ממשק ----------
  if (typeof document === 'undefined') return;
  var $ = function (i) { return document.getElementById(i); };
  if (!$('pz')) return;
  var PZE = document.getElementById('pz');
  var KEY = (PZE && PZE.getAttribute('data-key')) || 'kelim_pitzuyim';
  var DT = (PZE && PZE.getAttribute('data-type')) || 'monthly';
  var ids = ['pz-reason', 'pz-start', 'pz-end', 'pz-type', 'pz-salary', 'pz-rate', 'pz-hours', 'pz-scope', 'pz-sa', 'pz-sl', 'pz-s14', 'pz-s14d', 'pz-ng'];

  var mbox = $('pz-months');
  for (var i = 1; i <= 12; i++) {
    var l = document.createElement('label');
    l.innerHTML = (i === 1 ? 'חודש אחרון' : 'לפני ' + (i - 1) + ' חודשים') + '<input type="number" class="pz-m" inputmode="decimal" min="0" step="1" dir="ltr">';
    mbox.appendChild(l);
  }

  function val(id) { return $(id).type === 'checkbox' ? $(id).checked : $(id).value; }
  function toggles() {
    var t = $('pz-type').value;
    $('pz-w-monthly').hidden = t !== 'monthly';
    $('pz-w-hourly').hidden = t !== 'hourly';
    $('pz-w-var').hidden = t !== 'variable';
    $('pz-w-scope').hidden = !$('pz-scope').checked;
    $('pz-w-s14').hidden = $('pz-s14').value === 'none';
  }
  function row(a, b, strong) { return '<tr' + (strong ? ' class="pz-strong"' : '') + '><td>' + a + '</td><td>' + b + '</td></tr>'; }
  function render(r) {
    var res = $('pz-res');
    if (r.error) { res.innerHTML = '<p class="pz-hint">' + (r.error === 'חסר תאריך' || r.error === 'חסר שכר' ? 'ממלאים תאריכים ושכר ורואים את התוצאה.' : r.error) + '</p>'; return; }
    var h = '';
    if (r.eligible) {
      h += '<span>פיצויי פיטורין מגיעים לך בסך</span><br><b class="pz-big">' + nis(r.full) + '</b>';
      if (r.deposited > 0) h += '<small>מתוכם ' + nis(r.deposited) + ' כבר הופרשו לקופה (סעיף 14). נשאר לתשלום מהמעסיק: ' + nis(r.payable) + '</small>';
    } else {
      h += '<span>לפי הנתונים אין זכאות לפיצויי פיטורין</span><br><b class="pz-big">₪0</b>';
    }
    h += '<table class="ns-tbl"><tbody>';
    h += row('תקופת העסקה', r.period.y + ' שנים, ' + r.period.m + ' חודשים, ' + r.period.d + ' ימים');
    h += row('שכר בסיס לפיצויים', nis(r.basis));
    if (r.eligible) {
      h += row('פיצויים מלאים', nis(r.full), true);
      h += row('חלק פטור ממס (הערכה)', nis(r.taxExempt));
      h += row('חלק חייב במס (הערכה)', nis(r.taxable));
    }
    h += row('הודעה מוקדמת שמגיעה', num(r.noticeDays, 1) + ' ימים');
    if (r.noticeMissingDays > 0) h += row('תשלום עבור הודעה מוקדמת שלא ניתנה', nis(r.noticePay), true);
    h += '</tbody></table>';
    h += '<details class="pz-steps" open><summary>איך חישבנו, צעד אחר צעד</summary><ol>' + r.steps.map(function (s) { return '<li>' + s.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</li>'; }).join('') + '</ol></details>';
    h += '<p class="pz-hint">הערכה כללית ואינה ייעוץ משפטי. הסכם קיבוצי, חוזה אישי או צו הרחבה עשויים לשנות את התוצאה.</p>';
    res.innerHTML = h;
  }
  function run() {
    toggles();
    var months = [].map.call(document.querySelectorAll('.pz-m'), function (x) { return parseFloat(x.value) || 0; });
    var r = calc({
      reason: $('pz-reason').value, start: $('pz-start').value, end: $('pz-end').value, payType: $('pz-type').value,
      salary: parseFloat($('pz-salary').value), hourlyRate: parseFloat($('pz-rate').value), hoursPerMonth: parseFloat($('pz-hours').value),
      months: months, scopeChanged: $('pz-scope').checked, scopeAvg: parseFloat($('pz-sa').value), scopeLast: parseFloat($('pz-sl').value),
      sec14: $('pz-s14').value, sec14Start: $('pz-s14d').value, noticeGiven: parseFloat($('pz-ng').value) || 0
    });
    render(r);
    try {
      var st = {}; ids.forEach(function (id) { st[id] = val(id); });
      st.m = [].map.call(document.querySelectorAll('.pz-m'), function (x) { return x.value; });
      localStorage.setItem(KEY, JSON.stringify(st));
      if (window.gtag && r.ok && !run.sent) { run.sent = 1; window.gtag('event', 'calc_result', { tool: 'pitzuyim' }); }
    } catch (e) {}
  }
  try {
    $('pz-type').value = DT;
    var sv = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (sv) {
      ids.forEach(function (id) { if (sv[id] !== undefined) { if ($(id).type === 'checkbox') $(id).checked = !!sv[id]; else $(id).value = sv[id]; } });
      (sv.m || []).forEach(function (v, j) { var x = document.querySelectorAll('.pz-m')[j]; if (x) x.value = v; });
    }
  } catch (e) {}
  $('pz').addEventListener('input', run);
  $('pz').addEventListener('change', run);
  $('pz-clear').addEventListener('click', function () {
    [].forEach.call($('pz').querySelectorAll('input'), function (x) { if (x.type === 'checkbox') x.checked = false; else x.value = ''; });
    $('pz-type').value = DT; $('pz-reason').value = 'fired'; $('pz-s14').value = 'none';
    run();
  });
  run();
})(typeof window !== 'undefined' ? window : globalThis);
