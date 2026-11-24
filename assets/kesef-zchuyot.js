/* זכויות עובדים: פדיון חופשה, דמי הבראה, שעות נוספות וסיכום זכויות בפיטורין.
   הליבה (ZH) נבדקת ב-tools/test_zchuyot.js; הממשק מופעל לפי האלמנט שבדף. כל החישוב בדפדפן. */
(function (root) {
  'use strict';
  var CONST = {
    HAVRA_DAY: 451.5,          // יום הבראה במגזר הפרטי לשנת 2026 (כל זכות, עודכן 18.08.2026)
    WEEK_HOURS: 42,            // שבוע עבודה מלא במגזר הפרטי
    MONTH_HOURS: 182,          // מחלק לשכר שעתי מחודשי
    OT_DAY5: 8.6, OT_DAY6: 8, OT_FRI6: 7
  };
  function r2(x) { return Math.round(x * 100) / 100; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function fl1(x) { return Math.floor(x * 10 + 1e-9) / 10; }
  function nis(x) { return '₪' + Number(r2(x)).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  function pd(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; }
  function dim(y) { return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365; }

  /* ימי חופשה נטו לשנת ותק k (לפי כל זכות, נבדק 24.11.2026) */
  function vacDays(k, week, ext) {
    var law;
    if (week === 6) {
      law = k <= 5 ? 14 : k === 6 ? 16 : k === 7 ? 18 : k === 8 ? 19 : k === 9 ? 20 : k === 10 ? 21 : k === 11 ? 22 : k === 12 ? 23 : 24;
    } else {
      law = k <= 5 ? 12 : k === 6 ? 14 : k === 7 ? 15 : k === 8 ? 16 : k === 9 ? 17 : k === 10 ? 18 : k === 11 ? 19 : 20;
      if (ext) { var e = k <= 5 ? 12 : k <= 8 ? 17 : 23; law = Math.max(law, e); }
    }
    return law;
  }

  /* in: {start,end,week:5|6,ext:bool,used,dayValue|salary} */
  function vacation(inp) {
    var steps = [], out = { ok: false, steps: steps };
    var s = pd(inp.start), e = pd(inp.end);
    if (!s || !e) { out.error = 'חסר תאריך'; return out; }
    if (e < s) { out.error = 'תאריך הסיום קודם לתאריך ההתחלה'; return out; }
    var week = +inp.week === 6 ? 6 : 5, ext = inp.ext !== false;
    var y0 = s.getUTCFullYear(), y1 = e.getUTCFullYear(), total = 0, rows = [];
    for (var y = y0; y <= y1; y++) {
      var a = Math.max(s.getTime(), Date.UTC(y, 0, 1)), b = Math.min(e.getTime(), Date.UTC(y, 11, 31));
      var days = Math.round((b - a) / 86400000) + 1, f = days / dim(y), k = y - y0 + 1;
      var full = vacDays(k, week, ext), got = f >= 0.999 ? full : fl1(full * f);
      rows.push({ year: y, seniority: k, fraction: f, days: got, full: full });
      total += got;
      steps.push('שנת ' + y + ' (שנת ותק ' + k + '): ' + full + ' ימים' + (f >= 0.999 ? '' : ' × ' + r2(f) + ' (חלק מהשנה) = ' + got));
    }
    total = r1(total);
    var used = Math.max(0, +inp.used || 0);
    var bal = r1(total - used);
    out.rows = rows; out.accrued = total; out.used = used; out.balance = bal;
    var dv = +inp.dayValue || 0;
    if (!(dv > 0) && +inp.salary > 0) {
      var div = inp.divisor > 0 ? +inp.divisor : (week === 6 ? 25 : 21.67);
      dv = +inp.salary / div;
      steps.push('ערך יום: ' + nis(+inp.salary) + ' ÷ ' + div + ' ימי עבודה בחודש = ' + nis(dv));
    }
    out.dayValue = r2(dv);
    steps.push('צבירה כוללת: ' + total + ' ימים, נוצלו ' + used + ', יתרה ' + bal);
    out.payout = (dv > 0 && bal > 0) ? r2(bal * dv) : 0;
    if (out.payout) steps.push('פדיון: ' + bal + ' ימים × ' + nis(dv) + ' = ' + nis(out.payout));
    out.ok = true;
    return out;
  }

  function havraDays(k) { return k <= 1 ? 5 : k <= 3 ? 6 : k <= 10 ? 7 : k <= 15 ? 8 : k <= 19 ? 9 : 10; }

  /* in: {start,end,weeklyHours,dayValue,paidYears} ; period מחושב כאן בשנים עשרוניות */
  function havra(inp) {
    var steps = [], out = { ok: false, steps: steps };
    var s = pd(inp.start), e = pd(inp.end);
    if (!s || !e) { out.error = 'חסר תאריך'; return out; }
    if (e < s) { out.error = 'תאריך הסיום קודם לתאריך ההתחלה'; return out; }
    var e1 = new Date(e.getTime() + 86400000);
    var months = (e1.getUTCFullYear() - s.getUTCFullYear()) * 12 + e1.getUTCMonth() - s.getUTCMonth() - (e1.getUTCDate() < s.getUTCDate() ? 1 : 0);
    var years = Math.round((e1 - s) / 86400000 / 365.25 * 100) / 100;
    out.years = years; out.months = months;
    var val = +inp.dayValue > 0 ? +inp.dayValue : CONST.HAVRA_DAY;
    var wh = +inp.weeklyHours > 0 ? Math.min(+inp.weeklyHours, CONST.WEEK_HOURS) : CONST.WEEK_HOURS;
    var scope = wh / CONST.WEEK_HOURS;
    out.scope = scope; out.value = val;
    if (months < 12) {
      steps.push('פחות מ-12 חודשי עבודה אצל אותו מעסיק: עדיין אין זכאות לדמי הבראה. מרגע שמשלימים שנה הם מגיעים רטרואקטיבית.');
      out.days = 0; out.total = 0; out.ok = true; out.eligible = false; return out;
    }
    var paid = Math.max(0, Math.floor(+inp.paidYears || 0)), n = Math.ceil(years - 1e-9), tot = 0, rows = [];
    var from = Math.max(paid + 1, n - 6); // התיישנות: שבע שנים אחורה
    for (var i = from; i <= n; i++) {
      var f = Math.min(1, years - (i - 1));
      if (f <= 0) continue;
      var d = r2(havraDays(i) * f);
      rows.push({ year: i, days: d }); tot += d;
      steps.push('שנת עבודה ' + i + ': ' + havraDays(i) + ' ימים' + (f < 0.999 ? ' × ' + r2(f) + ' (חלק מהשנה)' : '') + ' = ' + d);
    }
    out.ok = true; out.eligible = true; out.rows = rows; out.days = r2(tot);
    out.total = r2(tot * val * scope);
    steps.push('סה"כ ' + out.days + ' ימים × ' + nis(val) + (scope < 1 ? ' × ' + r2(scope) + ' (היקף משרה)' : '') + ' = ' + nis(out.total));
    if (n - 6 > paid + 1) steps.push('נלקחו בחשבון שבע שנות העבודה האחרונות בלבד (התיישנות).');
    return out;
  }

  /* in: {week:5|6, hours:[7 ימים א..ש], rate} */
  function overtime(inp) {
    var steps = [], out = { ok: false, steps: steps };
    var week = +inp.week === 6 ? 6 : 5, rate = +inp.rate || 0;
    var hrs = (inp.hours || []).map(function (x) { return Math.max(0, +x || 0); });
    while (hrs.length < 7) hrs.push(0);
    var t125 = 0, t150 = 0, s150 = 0, s175 = 0, s200 = 0, weekdayTotal = 0, dailyOT = 0;
    for (var d = 0; d < 7; d++) {
      var h = hrs[d];
      if (d === 6) {
        var norm = week === 5 ? CONST.OT_DAY5 : CONST.OT_DAY6, base = Math.min(h, norm), ex = Math.max(0, h - norm);
        s150 += base; s175 += Math.min(2, ex); s200 += Math.max(0, ex - 2);
      } else {
        var thr = week === 5 ? CONST.OT_DAY5 : (d === 5 ? CONST.OT_FRI6 : CONST.OT_DAY6);
        var ot = Math.max(0, h - thr);
        t125 += Math.min(2, ot); t150 += Math.max(0, ot - 2); dailyOT += ot; weekdayTotal += h;
      }
    }
    var wExtra = Math.max(0, weekdayTotal - dailyOT - CONST.WEEK_HOURS);
    var w125 = Math.min(2, wExtra), w150 = Math.max(0, wExtra - 2);
    out.h125 = r2(t125 + w125); out.h150 = r2(t150 + w150);
    out.s150 = r2(s150); out.s175 = r2(s175); out.s200 = r2(s200);
    out.weekdayTotal = r2(weekdayTotal); out.weeklyExtra = r2(wExtra);
    var pay = out.h125 * rate * 1.25 + out.h150 * rate * 1.5 + s150 * rate * 1.5 + s175 * rate * 1.75 + s200 * rate * 2;
    var hoursSpecial = out.h125 + out.h150 + s150 + s175 + s200;
    out.gross = r2(pay);
    out.premium = r2(pay - hoursSpecial * rate);
    steps.push('סף יומי: ' + (week === 5 ? '8.6 שעות (8:36)' : '8 שעות, ובשישי 7') + '; סף שבועי: ' + CONST.WEEK_HOURS + ' שעות.');
    steps.push('שעות נוספות ביום חול: ' + r2(t125) + ' ב-125% ו-' + r2(t150) + ' ב-150%.');
    if (wExtra > 0) steps.push('שעות נוספות שבועיות (מעל ' + CONST.WEEK_HOURS + ' שעות ושלא נספרו כבר ביום): ' + r2(wExtra) + '.');
    if (s150 + s175 + s200 > 0) steps.push('עבודה בשבת: ' + r2(s150) + ' שעות ב-150%, ' + r2(s175) + ' ב-175%, ' + r2(s200) + ' ב-200%.');
    out.ok = rate > 0;
    if (!(rate > 0)) out.error = 'חסר שכר לשעה';
    return out;
  }

  var ZH = { CONST: CONST, vacDays: vacDays, vacation: vacation, havraDays: havraDays, havra: havra, overtime: overtime, nis: nis };
  if (typeof module !== 'undefined' && module.exports) module.exports = ZH;
  root.ZH = ZH;

  /* ===== ממשק ===== */
  if (typeof document === 'undefined') return;
  function $(id) { return document.getElementById(id); }
  function val(id) { var e = $(id); return e ? e.value : ''; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function steps(list) { return '<div class="pz-steps"><b>איך חישבנו:</b><ol>' + list.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol></div>'; }
  var HINT = '<p class="pz-hint">הערכה כללית ואינה ייעוץ משפטי. חוזה אישי או הסכם קיבוצי עשויים לשנות את התוצאה.</p>';
  function ga(tool) { if (window.gtag) try { gtag('event', 'calc_result', { tool: tool }); } catch (e) {} }
  function wire(rootId, runFn, clearIds, todayId, todayTarget) {
    var r = $(rootId); if (!r) return false;
    r.addEventListener('input', runFn); r.addEventListener('change', runFn);
    var c = $(rootId + '-clear');
    if (c) c.addEventListener('click', function () { clearIds.forEach(function (i) { var e = $(i); if (e) { if (e.type === 'checkbox') e.checked = false; else e.value = ''; } }); runFn(); });
    if (todayId && $(todayId)) $(todayId).addEventListener('click', function () { $(todayTarget).value = iso(new Date()); runFn(); });
    window.addEventListener('load', runFn);
    return true;
  }

  // פדיון חופשה
  wire('vc', function () {
    var o = $('vc-res');
    var r = vacation({ start: val('vc-start'), end: val('vc-end'), week: val('vc-week'), ext: $('vc-ext').checked,
      used: val('vc-used'), dayValue: val('vc-day'), salary: val('vc-sal') });
    if (r.error) { o.innerHTML = '<p class="pz-hint">ממלאים תאריך תחילת עבודה ותאריך סיום.</p>'; return; }
    var h = '<p>יתרת ימי החופשה:</p><div class="pz-big">' + r.balance + ' ימים</div>';
    h += '<table class="ns-tbl"><tbody><tr><td>נצברו בסך הכול</td><td>' + r.accrued + ' ימים</td></tr><tr><td>נוצלו</td><td>' + r.used + ' ימים</td></tr>';
    if (r.dayValue > 0) h += '<tr><td>ערך יום</td><td>' + nis(r.dayValue) + '</td></tr>';
    h += r.payout > 0 ? '<tr class="pz-strong"><td>פדיון חופשה (הערכה)</td><td>' + nis(r.payout) + '</td></tr>' : '<tr><td>פדיון חופשה</td><td>' + (r.dayValue > 0 ? 'אין יתרה לפדיון' : 'מוסיפים שכר חודשי או ערך יום') + '</td></tr>';
    h += '</tbody></table>' + steps(r.steps) + HINT;
    o.innerHTML = h; ga('pdyon_chufsha');
  }, ['vc-start', 'vc-end', 'vc-used', 'vc-day', 'vc-sal'], 'vc-today', 'vc-end');

  // דמי הבראה
  wire('hv', function () {
    var o = $('hv-res');
    var r = havra({ start: val('hv-start'), end: val('hv-end'), weeklyHours: val('hv-hours'), dayValue: val('hv-val'), paidYears: val('hv-paid') });
    if (r.error) { o.innerHTML = '<p class="pz-hint">ממלאים תאריך תחילת עבודה ותאריך סיום.</p>'; return; }
    var h;
    if (!r.eligible) h = '<p>עדיין אין זכאות לדמי הבראה (פחות מ-12 חודשי עבודה).</p>';
    else h = '<p>דמי ההבראה שמגיעים:</p><div class="pz-big">' + nis(r.total) + '</div><table class="ns-tbl"><tbody><tr><td>ימי הבראה</td><td>' + r.days + '</td></tr><tr><td>ערך יום</td><td>' + nis(r.value) + '</td></tr></tbody></table>';
    h += steps(r.steps) + HINT;
    o.innerHTML = h; ga('dmey_havraa');
  }, ['hv-start', 'hv-end', 'hv-hours', 'hv-val', 'hv-paid'], 'hv-today', 'hv-end');

  // שעות נוספות
  wire('ot', function () {
    var o = $('ot-res'), hrs = [];
    for (var i = 0; i < 7; i++) hrs.push(val('ot-d' + i));
    var rate = +val('ot-rate') || (+val('ot-sal') > 0 ? +val('ot-sal') / CONST.MONTH_HOURS : 0);
    var r = overtime({ week: val('ot-week'), hours: hrs, rate: rate });
    if (r.error) { o.innerHTML = '<p class="pz-hint">ממלאים שעות לכל יום ושכר לשעה (או שכר חודשי).</p>'; return; }
    var h = '<p>תשלום על שעות הגמול השבוע:</p><div class="pz-big">' + nis(r.gross) + '</div>';
    h += '<table class="ns-tbl"><tbody>';
    if (r.h125) h += '<tr><td>שעות ב-125%</td><td>' + r.h125 + '</td></tr>';
    if (r.h150) h += '<tr><td>שעות ב-150%</td><td>' + r.h150 + '</td></tr>';
    if (r.s150) h += '<tr><td>שבת עד סף יומי (150%)</td><td>' + r.s150 + '</td></tr>';
    if (r.s175) h += '<tr><td>שבת ב-175%</td><td>' + r.s175 + '</td></tr>';
    if (r.s200) h += '<tr><td>שבת ב-200%</td><td>' + r.s200 + '</td></tr>';
    h += '<tr class="pz-strong"><td>התוספת מעל שכר רגיל</td><td>' + nis(r.premium) + '</td></tr>';
    h += '<tr><td>הערכה לחודש (× 4.33 שבועות)</td><td>' + nis(r.gross * 4.33) + '</td></tr></tbody></table>';
    h += steps(r.steps) + HINT;
    o.innerHTML = h; ga('shaot_nosafot');
  }, ['ot-d0', 'ot-d1', 'ot-d2', 'ot-d3', 'ot-d4', 'ot-d5', 'ot-d6', 'ot-rate', 'ot-sal']);

  // סיכום זכויות בפיטורין
  wire('zk', function () {
    var o = $('zk-res'), PZ = window.PZ;
    if (!PZ) { o.innerHTML = '<p class="pz-hint">טוען…</p>'; return; }
    var start = val('zk-start'), end = val('zk-end'), sal = +val('zk-sal');
    if (!start || !end || !(sal > 0)) { o.innerHTML = '<p class="pz-hint">ממלאים תאריכים ושכר חודשי אחרון.</p>'; return; }
    var week = +val('zk-week') === 6 ? 6 : 5, rows = [], sum = 0, st = [];
    var p = PZ.calc({ reason: val('zk-reason'), start: start, end: end, payType: 'monthly', salary: sal, sec14: val('zk-sec14') });
    if (p.error) { o.innerHTML = '<p class="pz-hint">' + p.error + '</p>'; return; }
    var sev = p.payable !== undefined ? p.payable : (p.full || 0);
    rows.push(['פיצויי פיטורין' + (val('zk-sec14') !== 'none' ? ' (אחרי סעיף 14)' : ''), sev]); sum += sev;
    var nd = PZ.noticeDays(p.period.months, true), given = +val('zk-given') || 0, miss = Math.max(0, nd - given);
    var np = r2(sal / 30 * miss);
    rows.push(['הודעה מוקדמת: ' + r1(nd) + ' ימים מגיעים, חסרים ' + r1(miss), np]); sum += np;
    var v = vacation({ start: start, end: end, week: week, ext: true, used: val('zk-used'), salary: sal });
    var vp = v.ok ? v.payout : 0; rows.push(['פדיון חופשה (' + (v.ok ? v.balance : 0) + ' ימים)', vp]); sum += vp;
    var hv = havra({ start: start, end: end, paidYears: val('zk-paid') });
    var hp = hv.ok ? hv.total : 0; rows.push(['דמי הבראה (' + (hv.ok ? hv.days : 0) + ' ימים)', hp]); sum += hp;
    var h = '<p>הערכת סך הזכויות בסיום העבודה:</p><div class="pz-big">' + nis(sum) + '</div><table class="ns-tbl"><tbody>';
    rows.forEach(function (r) { h += '<tr><td>' + r[0] + '</td><td>' + nis(r[1]) + '</td></tr>'; });
    h += '</tbody></table>';
    if (p.steps) st = st.concat(p.steps.slice(0, 4));
    st = st.concat(v.ok ? v.steps.slice(-3) : []);
    h += steps(st) + '<p class="pz-hint">לא נכללו: שכר על ימי עבודה בחודש האחרון, גמול שעות נוספות, החזר נסיעות וכספי פנסיה שנצברו בקופה. הערכה כללית ואינה ייעוץ משפטי.</p>';
    o.innerHTML = h; ga('zchuyot_pitorin');
  }, ['zk-start', 'zk-end', 'zk-sal', 'zk-given', 'zk-used', 'zk-paid'], 'zk-today', 'zk-end');

  function r2(x) { return Math.round(x * 100) / 100; }
  function r1(x) { return Math.round(x * 10) / 10; }
})(typeof window !== 'undefined' ? window : globalThis);
