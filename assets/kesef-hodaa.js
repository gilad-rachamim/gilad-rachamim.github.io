/* מחשבון הודעה מוקדמת: משתמש בליבה של kesef-pitzuyim.js (window.PZ) */
(function () {
  'use strict';
  var root = document.getElementById('hd');
  if (!root) return;
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function heb(d) { return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function parse(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function run() {
    var PZ = window.PZ, out = $('hd-res');
    if (!PZ) { out.innerHTML = '<p class="pz-hint">טוען…</p>'; return; }
    var s = parse($('hd-start').value), n = parse($('hd-notice').value);
    if (!s || !n) { out.innerHTML = '<p class="pz-hint">ממלאים תאריך תחילת עבודה ותאריך מסירת ההודעה.</p>'; return; }
    if (n < s) { out.innerHTML = '<p class="pz-hint">תאריך ההודעה לפני תחילת העבודה. כדאי לבדוק את התאריכים.</p>'; return; }
    var monthly = $('hd-type').value === 'monthly';
    var p = PZ.period(iso(s), iso(n));
    var days = PZ.noticeDays(p.months, monthly);
    var last = new Date(n.getTime()); last.setDate(last.getDate() + Math.ceil(days));
    var h = '<p>ההודעה המוקדמת שמגיעה:</p><div class="pz-big">' + (Math.round(days * 10) / 10) + ' ימים</div>';
    h += '<table class="ns-tbl"><tbody>';
    h += '<tr><td>ותק במועד ההודעה</td><td>' + p.y + ' שנים, ' + p.m + ' חודשים, ' + p.d + ' ימים</td></tr>';
    h += '<tr><td>חודשים מלאים</td><td>' + p.months + '</td></tr>';
    h += '<tr><td>יום העבודה האחרון (אם ההודעה נמסרת היום)</td><td>' + heb(last) + '</td></tr>';
    var given = parseFloat($('hd-given').value), sal = parseFloat($('hd-sal').value);
    if (isFinite(given) && given >= 0 && given < days) {
      var miss = days - given;
      h += '<tr><td>ימים חסרים</td><td>' + (Math.round(miss * 10) / 10) + '</td></tr>';
      if (isFinite(sal) && sal > 0) {
        var pay = sal / 30 * miss;
        h += '<tr class="pz-strong"><td>תשלום עבור הימים החסרים (הערכה)</td><td>₪' + Math.round(pay).toLocaleString('he-IL') + '</td></tr>';
      }
    } else if (isFinite(given) && given >= days) {
      h += '<tr><td>ימים חסרים</td><td>אין, ניתנה הודעה מלאה</td></tr>';
    }
    h += '</tbody></table>';
    h += '<div class="pz-steps"><b>איך חישבנו:</b><ol><li>ותק עד יום ההודעה: ' + p.months + ' חודשים מלאים.</li><li>' +
      (monthly ? 'שכר חודשי: יום לכל חודש עד שישה חודשים, 2.5 ימים לכל חודש אחריהם, חודש שלם (30 יום) משנת ותק.' :
        'שכר יומי או שעתי: עד שנה יום לכל חודש, בשנה השנייה 14 ימים ועוד יום לכל שני חודשים, בשנה השלישית 21 ימים ועוד יום לכל שני חודשים, משלוש שנים 30 יום.') +
      '</li><li>הימים נספרים קלנדרית, כולל שבתות.</li></ol></div>';
    h += '<p class="pz-hint">הערכה כללית ואינה ייעוץ משפטי.</p>';
    out.innerHTML = h;
    if (window.gtag) try { gtag('event', 'calc_result', { tool: 'hodaa_mukdemet' }); } catch (e) {}
  }
  root.addEventListener('input', run); root.addEventListener('change', run);
  $('hd-today').addEventListener('click', function () { $('hd-notice').value = iso(new Date()); run(); });
  $('hd-clear').addEventListener('click', function () { ['hd-start', 'hd-notice', 'hd-given', 'hd-sal'].forEach(function (i) { $(i).value = ''; }); run(); });
  window.addEventListener('load', run);
})();
