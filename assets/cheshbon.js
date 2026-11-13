// עזרים משותפים לכלים של רואי חשבון ויועצי מס (/kelim/cheshbon/).
// הכול רץ בדפדפן: מספרים, טבלה מאקסל, ייצוא CSV שנפתח באקסל בעברית, העתקה ושמירה מקומית.
(function () {
  'use strict';
  var CH = window.CH = {};
  CH.$ = function (id) { return document.getElementById(id); };
  CH.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  // "1,234.50 ₪" / "‎-1234" / "(1,234)" -> מספר. ריק או לא מספר -> NaN
  CH.num = function (s) {
    if (typeof s === 'number') return s;
    s = String(s == null ? '' : s).replace(/[‎‏‪-‮\s₪]/g, '').replace(/ש"ח|שח|NIS|ILS/gi, '');
    var neg = /^\(.*\)$/.test(s); if (neg) s = s.slice(1, -1);
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,50
    else s = s.replace(/,/g, '');
    if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
    var n = parseFloat(s); return neg ? -n : n;
  };
  CH.r2 = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  CH.money = function (n, dec) {
    if (!isFinite(n)) return '—';
    return (n < 0 ? '-' : '') + '₪' + Math.abs(n).toLocaleString('he-IL', { minimumFractionDigits: dec === 0 ? 0 : 2, maximumFractionDigits: dec === 0 ? 0 : 2 });
  };
  CH.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  // תאריך מכל צורה נפוצה: 15/06/2026, 15.6.26, 2026-06-15 -> Date (חצות מקומי) או null
  CH.date = function (s) {
    s = String(s || '').trim(); var m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], m[2] - 1, +m[3]);
    if ((m = s.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/))) { var y = +m[3]; if (y < 100) y += 2000; return new Date(y, m[2] - 1, +m[1]); }
    if (/^\d{5}$/.test(s)) { var d = new Date(Date.UTC(1899, 11, 30) + (+s) * 864e5); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); } // מספר סידורי של אקסל
    return null;
  };
  CH.heDate = function (d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); };
  CH.iso = function (d) { return d.getFullYear() + '-' + CH.pad(d.getMonth() + 1) + '-' + CH.pad(d.getDate()); };
  // טקסט שהודבק מאקסל / גוגל שיטס / CSV -> מערך שורות של תאים
  CH.rows = function (text) {
    return String(text || '').replace(/\r/g, '').split('\n').map(function (l) { return l.trim() ? l : null; }).filter(Boolean).map(function (l) {
      if (l.indexOf('\t') >= 0) return l.split('\t').map(function (c) { return c.trim(); });
      if (l.indexOf(';') >= 0) return l.split(';').map(function (c) { return c.trim(); });
      // פסיק מפריד רק כשאין מספרים עם פסיקי אלפים: "a, b" או "a,b,c"
      var q = l.match(/("([^"]|"")*"|[^,]+)/g) || [l];
      return q.length > 1 && !/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(l.trim()) ? q.map(function (c) { return c.replace(/^"|"$/g, '').replace(/""/g, '"').trim(); }) : [l.trim()];
    });
  };
  // ייצוא לאקסל: CSV עם BOM כדי שהעברית תיפתח נכון
  CH.csv = function (name, rows) {
    var t = rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + t], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
  CH.copy = function (text, msgEl) {
    function ok() { if (msgEl) { msgEl.textContent = 'הועתק ✓'; setTimeout(function () { msgEl.textContent = ''; }, 2500); } }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { fallback(); });
    else fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) {} ta.remove(); }
  };
  CH.wa = function (text) { return 'https://wa.me/?text=' + encodeURIComponent(text); };
  CH.load = function (k, def) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? def : v; } catch (e) { return def; } };
  CH.save = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  // אירוע מדידה אחד לכל פעולה, לא יותר מפעם ב-20 שניות לאותו סוג
  var last = {};
  CH.used = function (tool, how) {
    var k = tool + '|' + how, t = Date.now();
    if (last[k] && t - last[k] < 20000) return; last[k] = t;
    if (window.toolUsed) window.toolUsed(tool, { how: how });
  };
  // לחצני מצב (seg): aria-pressed + קריאה חוזרת
  CH.seg = function (box, onPick) {
    if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]'); if (!b) return;
      [].forEach.call(box.querySelectorAll('button[data-v]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      onPick(b.getAttribute('data-v'));
    });
  };
  // ---------- מועדי דיווח ותשלום (רשות המסים) ----------
  // לכל חודש דיווח: [מע"מ תקופתי + מקדמות מס הכנסה, ניכויים מס הכנסה (102), דוח מפורט מע"מ (874)]
  // מקור 2026: gov.il/he/pages/pa151025-2 · מקור 2027: gov.il/he/pages/pa131026-1 (פורסם 13.10.2026)
  CH.DATES = {
    2026: [['16.2.2026', '16.2.2026', '23.2.2026'], ['16.3.2026', '16.3.2026', '26.3.2026'], ['27.4.2026', '27.4.2026', '27.4.2026'], ['18.5.2026', '18.5.2026', '26.5.2026'],
      ['15.6.2026', '16.6.2026', '23.6.2026'], ['15.7.2026', '16.7.2026', '27.7.2026'], ['17.8.2026', '17.8.2026', '24.8.2026'], ['24.9.2026', '24.9.2026', '24.9.2026'],
      ['19.10.2026', '19.10.2026', '26.10.2026'], ['16.11.2026', '16.11.2026', '23.11.2026'], ['15.12.2026', '16.12.2026', '23.12.2026'], ['18.1.2027', '18.1.2027', '26.1.2027']],
    2027: [['15.2.2027', '16.2.2027', '23.2.2027'], ['18.3.2027', '18.3.2027', '25.3.2027'], ['15.4.2027', '19.4.2027', '29.4.2027'], ['24.5.2027', '24.5.2027', '24.5.2027'],
      ['17.6.2027', '17.6.2027', '23.6.2027'], ['15.7.2027', '19.7.2027', '26.7.2027'], ['16.8.2027', '16.8.2027', '23.8.2027'], ['15.9.2027', '16.9.2027', '23.9.2027'],
      ['28.10.2027', '28.10.2027', '28.10.2027'], ['15.11.2027', '16.11.2027', '23.11.2027'], ['15.12.2027', '16.12.2027', '23.12.2027'], ['17.1.2028', '17.1.2028', '24.1.2028']]
  };
  CH.MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  CH.TYPES = [{ k: 'vat', i: 0, t: 'דוח מע"מ ומקדמות מס הכנסה' }, { k: 'nik', i: 1, t: 'ניכויים מס הכנסה (102)' }, { k: 'mef', i: 2, t: 'דוח מפורט מע"מ (874)' }];
  // כל המועדים מתאריך מסוים: type = vat/nik/mef, freq = 1 (חודשי) או 2 (דו-חודשי, על החודש הזוגי)
  CH.deadlines = function (type, freq, from) {
    var T = CH.TYPES.filter(function (x) { return x.k === type; })[0], out = [];
    if (!T) return out;
    Object.keys(CH.DATES).forEach(function (y) {
      CH.DATES[y].forEach(function (row, m) {
        if (freq === 2 && m % 2 === 0) return;
        var d = CH.date(row[T.i]);
        if (from && d < from) return;
        var per = freq === 2 ? CH.MONTHS[m - 1] + '–' + CH.MONTHS[m] + ' ' + y : CH.MONTHS[m] + ' ' + y;
        out.push({ d: d, type: type, t: T.t, per: per, y: +y, m: m });
      });
    });
    return out.sort(function (a, b) { return a.d - b.d; });
  };
  CH.LAST_DATE = CH.date('17.1.2028');
  CH.pick = function (box, v) {
    if (!box) return;
    [].forEach.call(box.querySelectorAll('button[data-v]'), function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === v ? 'true' : 'false'); });
  };
})();
