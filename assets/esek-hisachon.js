// מחשבון "כמה חוסכים בשנה": הנתונים נשארים בדפדפן.
(function () {
  'use strict';
  var f = document.getElementById('hs-form'); if (!f) return;
  function n(v) { v = parseFloat(String(v || '').replace(',', '.').replace(/[^\d.]/g, '')); return isFinite(v) ? v : 0; }
  function m(x) { return Math.round(x).toLocaleString('he-IL') + ' ₪'; }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var tot = 0; [].forEach.call(f.querySelectorAll('input[data-m]'), function (i) { tot += n(i.value); });
    var once = n(document.getElementById('hs-once').value) || 290, yr = tot * 12, r = document.getElementById('hs-res');
    r.hidden = false;
    r.innerHTML = tot <= 0 ? '<p>כתבו לפחות מנוי אחד שאתם משלמים היום.</p>' :
      '<p>היום אתם משלמים <b>' + m(yr) + '</b> בשנה.</p><p>בתשלום חד-פעמי של ' + m(once) + ' החיסכון בשנה הראשונה הוא <b>' + m(yr - once) + '</b>, ובכל שנה אחריה כמעט ' + m(yr) + ' (עם חידוש אופציונלי של 190 ₪).</p>';
    if (window.toolUsed) window.toolUsed('esek_hisachon', { action: 'calc' });
  });
})();
