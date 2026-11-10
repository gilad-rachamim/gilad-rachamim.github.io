// מחשבון סיבוכיות: לכל O(...) – כמה פעולות וכמה זמן עבור n, ועד איזה n עוד נכנסים במגבלת זמן.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_sibuchiyut', $ = function (id) { return document.getElementById(id); };
  var C = [
    ['O(1)', function () { return 1; }, 'גישה למערך לפי אינדקס, חיפוש ב-hash'],
    ['O(log n)', function (n) { return Math.log2(Math.max(n, 1)); }, 'חיפוש בינארי, פעולה בעץ מאוזן'],
    ['O(√n)', function (n) { return Math.sqrt(n); }, 'בדיקת ראשוניות נאיבית'],
    ['O(n)', function (n) { return n; }, 'מעבר אחד על המערך'],
    ['O(n log n)', function (n) { return n * Math.log2(Math.max(n, 2)); }, 'מיון טוב (merge, heap, quick בממוצע)'],
    ['O(n²)', function (n) { return n * n; }, 'שתי לולאות מקוננות, bubble sort'],
    ['O(n³)', function (n) { return n * n * n; }, 'כפל מטריצות נאיבי, Floyd–Warshall'],
    ['O(2ⁿ)', function (n) { return Math.pow(2, n); }, 'כל תת-הקבוצות'],
    ['O(n!)', function (n) { var r = 1; for (var i = 2; i <= n && r < 1e300; i++) r *= i; return r; }, 'כל הסידורים (פרמוטציות)']
  ];
  var st = T.load(KEY, { n: 100000, ops: 1e8, lim: 1 });
  function fmt(x) {
    if (!isFinite(x) || x > 1e300) return '∞';
    if (x < 1000) return (Math.round(x * 10) / 10).toLocaleString('en');
    var e = Math.floor(Math.log10(x)); return e < 7 ? Math.round(x).toLocaleString('en') : (x / Math.pow(10, e)).toFixed(1) + '×10^' + e;
  }
  function dur(s) {
    if (!isFinite(s) || s > 1e15 * 3.15e7) return 'יותר מגיל היקום';
    if (s < 1e-6) return 'פחות ממיקרו-שנייה';
    if (s < 1e-3) return Math.round(s * 1e6) + ' מיקרו-שניות';
    if (s < 1) return Math.round(s * 1000) + ' מילי-שניות';
    if (s < 60) return s.toFixed(1) + ' שניות';
    if (s < 3600) return Math.round(s / 60) + ' דקות';
    if (s < 86400) return Math.round(s / 3600) + ' שעות';
    if (s < 3.15e7) return Math.round(s / 86400) + ' ימים';
    return fmt(s / 3.15e7) + ' שנים';
  }
  function maxN(f) { // חיפוש בינארי על n: הכי גדול שעוד עומד במגבלה
    var budget = st.ops * st.lim; if (f(1) > budget) return 0;
    var lo = 1, hi = 1; while (hi < 1e18 && f(hi) <= budget) hi *= 2;
    if (hi >= 1e18) return Infinity;
    for (var it = 0; it < 200 && hi - lo > Math.max(1, hi * 1e-12); it++) { /* מעל 2^53 אין דיוק של 1 – עוצרים בדיוק יחסי */ var mid = Math.floor((lo + hi) / 2); if (f(mid) <= budget) lo = mid; else hi = mid; }
    return lo;
  }
  function render() {
    $('sb-n-v').textContent = Number(st.n).toLocaleString('en');
    $('sb-rows').innerHTML = C.map(function (c) {
      var ops = c[1](st.n), s = ops / st.ops, ok = s <= st.lim, mx = maxN(c[1]);
      return '<tr class="' + (ok ? 'ok' : 'bad') + '"><th dir="ltr">' + c[0] + '</th><td dir="ltr">' + fmt(ops) + '</td><td>' + (ok ? '✓ ' : '✗ ') + dur(s) + '</td><td dir="ltr">' + (mx === Infinity ? '∞' : fmt(mx)) + '</td></tr>' +
        '<tr class="ex"><td colspan="4">' + c[2] + '</td></tr>';
    }).join('');
    $('sb-lim-l').textContent = st.lim;
    T.save(KEY, st);
  }
  function fill() { $('sb-n').value = Math.log10(st.n).toFixed(2); $('sb-nn').value = st.n; $('sb-ops').value = String(st.ops); $('sb-lim').value = st.lim; }
  fill(); render();
  $('sb-print').addEventListener('click', function () { T.used('tichnut_sibuchiyut', 'print'); window.print(); });
  $('sb-n').addEventListener('input', function () { st.n = Math.round(Math.pow(10, +$('sb-n').value)); $('sb-nn').value = st.n; render(); });
  $('sb-nn').addEventListener('input', function () { var v = parseInt($('sb-nn').value, 10); if (v > 0) { st.n = v; $('sb-n').value = Math.log10(v).toFixed(2); render(); } });
  $('sb-ops').addEventListener('change', function () { st.ops = +$('sb-ops').value; render(); });
  $('sb-lim').addEventListener('input', function () { var v = parseFloat($('sb-lim').value); if (v > 0) { st.lim = v; render(); } });
  ['sb-n', 'sb-nn', 'sb-ops', 'sb-lim'].forEach(function (id) { $(id).addEventListener('change', function () { T.used('tichnut_sibuchiyut', 'add'); }); });
})();
