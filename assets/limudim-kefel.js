// לוח הכפל (/limudim/luach-hakefel/) – לוח 10×10 (או 12×12) שמדגיש שורה ועמודה, תרגול שאלות עם ניקוד, ודף להדפסה.
// הכול בדפדפן, בלי שרת. נשמר רק ב-localStorage (kefel): גודל הלוח, השיא, והתרגילים שטעו בהם (חוזרים יותר).
// מדידה: window.toolUsed – table / quiz_start / quiz_end / print, פעם אחת לכל פעולה בביקור.
(function () {
  'use strict';
  var root = document.getElementById('kefel');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'kefel';
  var st = { n: 10, best: 0, miss: {} };
  try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) for (var k in s) st[k] = s[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var done = {};
  function used(a) { if (done[a]) return; done[a] = 1; if (window.toolUsed) window.toolUsed(document.body.getAttribute('data-tool') || 'luach_hakefel', { action: a }); }

  // ---------- הלוח ----------
  function table() {
    var n = st.n, h = '<thead><tr><th scope="col" class="kf-x">×</th>';
    for (var c = 1; c <= n; c++) h += '<th scope="col" data-c="' + c + '">' + c + '</th>';
    h += '</tr></thead><tbody>';
    for (var r = 1; r <= n; r++) {
      h += '<tr><th scope="row" data-r="' + r + '">' + r + '</th>';
      for (c = 1; c <= n; c++) h += '<td data-r="' + r + '" data-c="' + c + '" tabindex="0" aria-label="' + r + ' כפול ' + c + ' שווה ' + (r * c) + '">' + (r * c) + '</td>';
      h += '</tr>';
    }
    $('kf-tbl').innerHTML = h + '</tbody>';
    document.querySelectorAll('#kf-size button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-n') === n)); });
  }
  function mark(r, c) {
    var cells = $('kf-tbl').querySelectorAll('td,th');
    for (var i = 0; i < cells.length; i++) {
      var e = cells[i], er = +e.getAttribute('data-r'), ec = +e.getAttribute('data-c');
      e.classList.toggle('kf-line', !!r && ((er === r && (!ec || ec <= c)) || (ec === c && (!er || er <= r))));
      e.classList.toggle('kf-hit', !!r && er === r && ec === c);
    }
    $('kf-say').textContent = r ? r + ' × ' + c + ' = ' + (r * c) : 'נוגעים במשבצת, ורואים מאיפה מגיע המספר.';
  }
  $('kf-tbl').addEventListener('click', function (ev) {
    var t = ev.target.closest('td'); if (!t) return;
    mark(+t.getAttribute('data-r'), +t.getAttribute('data-c')); used('table');
  });
  $('kf-tbl').addEventListener('focusin', function (ev) {
    var t = ev.target.closest('td'); if (t) mark(+t.getAttribute('data-r'), +t.getAttribute('data-c'));
  });
  document.querySelectorAll('#kf-size button').forEach(function (b) {
    b.addEventListener('click', function () { st.n = +b.getAttribute('data-n'); save(); table(); mark(0, 0); buildRows(); });
  });

  // ---------- תרגול ----------
  var rowsBox = $('kf-rows');
  function buildRows() {
    var h = '';
    for (var i = 1; i <= st.n; i++) h += '<label><input type="checkbox" value="' + i + '"' + (i >= 2 && i <= 10 ? ' checked' : '') + '> ' + i + '</label>';
    rowsBox.innerHTML = h;
  }
  var q = null, score = 0, asked = 0, LEN = 10, t0 = 0, wrong = [];
  function pick() {
    var rows = [].map.call(rowsBox.querySelectorAll('input:checked'), function (x) { return +x.value; });
    if (!rows.length) rows = [2, 3, 4, 5, 6, 7, 8, 9, 10];
    // תרגילים שטעו בהם בעבר חוזרים יותר
    var keys = Object.keys(st.miss).filter(function (k) { return rows.indexOf(+k.split('x')[0]) >= 0 && st.miss[k] > 0; });
    if (keys.length && Math.random() < 0.35) { var kk = keys[Math.floor(Math.random() * keys.length)].split('x'); return [+kk[0], +kk[1]]; }
    return [rows[Math.floor(Math.random() * rows.length)], 1 + Math.floor(Math.random() * st.n)];
  }
  function ask() {
    q = pick(); asked++;
    $('kf-q').textContent = q[0] + ' × ' + q[1] + ' = ?';
    $('kf-prog').textContent = 'שאלה ' + asked + ' מתוך ' + LEN + ' · ' + score + ' נכונות';
    var a = $('kf-a'); a.value = ''; a.focus();
    $('kf-fb').textContent = ''; $('kf-fb').className = 'kf-fb';
  }
  function start() {
    score = 0; asked = 0; wrong = []; t0 = Date.now();
    $('kf-quiz').hidden = false; $('kf-end').hidden = true; $('kf-start').hidden = true;
    ask(); used('quiz_start');
  }
  function check(ev) {
    ev.preventDefault();
    if (!q) return;
    var v = parseInt($('kf-a').value, 10), right = q[0] * q[1], k = q[0] + 'x' + q[1], fb = $('kf-fb');
    if (isNaN(v)) return;
    if (v === right) { score++; fb.textContent = 'נכון! ' + q[0] + ' × ' + q[1] + ' = ' + right; fb.className = 'kf-fb ok'; if (st.miss[k]) st.miss[k]--; }
    else { fb.textContent = 'כמעט. ' + q[0] + ' × ' + q[1] + ' = ' + right; fb.className = 'kf-fb no'; st.miss[k] = (st.miss[k] || 0) + 2; wrong.push(q[0] + ' × ' + q[1] + ' = ' + right); }
    save(); q = null;
    setTimeout(function () { asked >= LEN ? end() : ask(); }, v === right ? 700 : 1600);
  }
  function end() {
    var sec = Math.round((Date.now() - t0) / 1000);
    if (score > st.best) { st.best = score; save(); }
    $('kf-quiz').hidden = true; $('kf-end').hidden = false; $('kf-start').hidden = false; $('kf-start').textContent = 'עוד סבב';
    $('kf-sum').innerHTML = '<b>' + score + ' מתוך ' + LEN + '</b> · ' + sec + ' שניות' + (score === LEN ? ' · מושלם! ⭐' : '') +
      '<br>השיא שלך: ' + st.best + (wrong.length ? '<br>לחזור על: ' + wrong.map(function (w) { return '<span class="kf-w">' + w + '</span>'; }).join(' ') : '');
    used('quiz_end');
  }
  $('kf-start').addEventListener('click', start);
  $('kf-form').addEventListener('submit', check);
  $('kf-print').addEventListener('click', function () { used('print'); window.print(); });

  table(); buildRows(); mark(0, 0);
})();
