// מיונים בתנועה: מקליטים מראש את כל הצעדים של המיון (השוואה / החלפה / כתיבה), ומנגנים אותם בקצב שבוחרים.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_miunim', $ = function (id) { return document.getElementById(id); };
  var INFO = {
    bubble: ['Bubble sort', 'עוברים שוב ושוב, ומחליפים כל שני שכנים שלא בסדר. הגדול "מבעבע" לסוף.', 'O(n²)'],
    insertion: ['Insertion sort', 'כמו לסדר קלפים ביד: לוקחים את הבא ומכניסים אותו למקום הנכון בחלק הממוין.', 'O(n²), ו-O(n) כשכמעט ממוין'],
    selection: ['Selection sort', 'מוצאים את הקטן ביותר ושמים בהתחלה, ואז את הבא, וכן הלאה.', 'O(n²) תמיד'],
    merge: ['Merge sort', 'מחלקים לחצאים עד איבר בודד, ואז ממזגים זוגות של רשימות ממוינות.', 'O(n log n) תמיד, עם זיכרון נוסף'],
    quick: ['Quick sort', 'בוחרים pivot, מעבירים קטנים לשמאל וגדולים לימין, וחוזרים על כל צד.', 'O(n log n) בממוצע, O(n²) בגרוע']
  };
  var st = T.load(KEY, { alg: 'bubble', n: 24, speed: 60, start: 'random' });
  var arr = [], steps = [], pos = 0, timer = null, view = [], cmp = 0, sw = 0;

  function make() {
    var n = st.n, a = [];
    for (var i = 1; i <= n; i++) a.push(Math.round(i * 100 / n));
    if (st.start === 'random') for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; }
    else if (st.start === 'reversed') a.reverse();
    else if (st.start === 'nearly') for (var m = 0; m < Math.max(1, n / 8); m++) { var x = Math.floor(Math.random() * (n - 1)); var y = a[x]; a[x] = a[x + 1]; a[x + 1] = y; }
    return a;
  }
  function record(a0) {
    var a = a0.slice(), S = [];
    function c(i, j) { S.push(['c', i, j]); return a[i] > a[j]; }
    function s(i, j) { var t = a[i]; a[i] = a[j]; a[j] = t; S.push(['s', i, j]); }
    function w(i, v) { a[i] = v; S.push(['w', i, v]); }
    var n = a.length;
    if (st.alg === 'bubble') { for (var i = 0; i < n - 1; i++) { var any = false; for (var j = 0; j < n - 1 - i; j++) if (c(j, j + 1)) { s(j, j + 1); any = true; } S.push(['d', n - 1 - i]); if (!any) break; } }
    else if (st.alg === 'insertion') { for (var i2 = 1; i2 < n; i2++) { var j2 = i2; while (j2 > 0 && c(j2 - 1, j2)) { s(j2 - 1, j2); j2--; } } }
    else if (st.alg === 'selection') { for (var i3 = 0; i3 < n - 1; i3++) { var mn = i3; for (var j3 = i3 + 1; j3 < n; j3++) if (c(mn, j3)) mn = j3; if (mn !== i3) s(i3, mn); S.push(['d', i3]); } }
    else if (st.alg === 'merge') {
      (function ms(lo, hi) {
        if (hi - lo < 1) return; var mid = (lo + hi) >> 1; ms(lo, mid); ms(mid + 1, hi);
        var L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1), p = 0, q = 0, k = lo;
        while (p < L.length && q < R.length) { S.push(['c', lo + p, mid + 1 + q]); w(k++, L[p] <= R[q] ? L[p++] : R[q++]); }
        while (p < L.length) w(k++, L[p++]); while (q < R.length) w(k++, R[q++]);
      })(0, n - 1);
    } else {
      (function qs(lo, hi) {
        if (lo >= hi) return; var p = lo;
        for (var j = lo; j < hi; j++) if (!c(j, hi)) { if (p !== j) s(p, j); p++; }
        if (p !== hi) s(p, hi); S.push(['d', p]); qs(lo, p - 1); qs(p + 1, hi);
      })(0, n - 1);
    }
    S.push(['end']);
    return S;
  }
  function draw(hl, kind) {
    var max = 100, html = '';
    for (var i = 0; i < view.length; i++) {
      var cls = hl && hl.indexOf(i) > -1 ? kind : (done[i] ? 'dn' : '');
      html += '<i class="' + cls + '" style="height:' + (view[i] / max * 100) + '%"></i>';
    }
    $('mu-bars').innerHTML = html;
    $('mu-cmp').textContent = cmp; $('mu-sw').textContent = sw;
    $('mu-step').textContent = Math.min(pos, steps.length - 1) + ' / ' + (steps.length - 1);
  }
  var done = {};
  function step() {
    if (pos >= steps.length) { stop(); return false; }
    var x = steps[pos++];
    if (x[0] === 'c') { cmp++; draw([x[1], x[2]], 'cm'); }
    else if (x[0] === 's') { var t = view[x[1]]; view[x[1]] = view[x[2]]; view[x[2]] = t; sw++; draw([x[1], x[2]], 'sw'); }
    else if (x[0] === 'w') { view[x[1]] = x[2]; sw++; draw([x[1]], 'sw'); }
    else if (x[0] === 'd') { done[x[1]] = 1; draw(); }
    else { for (var i = 0; i < view.length; i++) done[i] = 1; draw(); stop(); $('mu-play').textContent = '▶ שוב'; return false; }
    return true;
  }
  function play() {
    if (timer) { stop(); return; }
    if (pos >= steps.length) reset(false);
    $('mu-play').textContent = '⏸ עצירה';
    var ms = Math.max(5, 400 - st.speed * 4);
    timer = setInterval(function () { for (var k = 0; k < (st.speed > 90 ? 4 : 1); k++) if (!step()) return; }, ms);
    T.used('tichnut_miunim', st.alg);
  }
  function stop() { clearInterval(timer); timer = null; if (pos < steps.length) $('mu-play').textContent = '▶ להמשיך'; }
  function reset(newArr) {
    stop(); if (newArr || !arr.length) arr = make();
    view = arr.slice(); steps = record(arr); pos = 0; cmp = 0; sw = 0; done = {};
    var I = INFO[st.alg]; $('mu-name').textContent = I[0]; $('mu-desc').textContent = I[1]; $('mu-big').textContent = I[2];
    $('mu-play').textContent = '▶ להתחיל'; draw(); T.save(KEY, st);
  }
  $('mu-alg').value = st.alg; $('mu-n').value = st.n; $('mu-speed').value = st.speed; $('mu-start').value = st.start;
  $('mu-alg').addEventListener('change', function () { st.alg = $('mu-alg').value; reset(false); });
  $('mu-start').addEventListener('change', function () { st.start = $('mu-start').value; reset(true); });
  $('mu-n').addEventListener('change', function () { st.n = Math.max(5, Math.min(60, +$('mu-n').value || 24)); $('mu-n').value = st.n; reset(true); });
  $('mu-speed').addEventListener('input', function () { st.speed = +$('mu-speed').value; if (timer) { stop(); play(); } T.save(KEY, st); });
  $('mu-play').addEventListener('click', play);
  $('mu-next').addEventListener('click', function () { stop(); step(); });
  $('mu-new').addEventListener('click', function () { reset(true); });
  reset(true);
  window.TICHNUT.miunimRecord = function (a, alg) { var o = st.alg; st.alg = alg; var s = record(a); st.alg = o; return s; };
})();
