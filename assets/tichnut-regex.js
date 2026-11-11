// בודק Regex: מסמן התאמות בטקסט בזמן אמת, מציג קבוצות לכל התאמה, והחלפה. כולל תבניות מוכנות לישראל.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_regex', $ = function (id) { return document.getElementById(id); };
  var READY = [
    ['טלפון נייד ישראלי', '0(5\\d)-?(\\d{3})-?(\\d{4})', 'g'],
    ['אימייל', '[\\w.+-]+@([\\w-]+\\.)+[A-Za-z]{2,}', 'gi'],
    ['תאריך יום/חודש/שנה', '(\\d{1,2})[./](\\d{1,2})[./](\\d{2,4})', 'g'],
    ['מילים בעברית', '[\\u05D0-\\u05EA]+', 'g'],
    ['קישור', 'https?://[^\\s]+', 'gi'],
    ['מספר (גם עשרוני)', '-?\\d+(\\.\\d+)?', 'g'],
    ['כתובת IP', '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', 'g'],
    ['צבע HEX', '#(?:[0-9a-fA-F]{3}){1,2}\\b', 'g']
  ];
  var def = { p: READY[0][1], f: 'g', t: 'אפשר להתקשר אליי ב-050-1234567 או ל-0529876543.\nבמשרד: 02-6543210 (לא נייד).\nמייל: gilad@example.com', r: '0$1-$2$3', rep: false };
  var st = T.load(KEY, def);
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  var rd = $('rx-ready');
  READY.forEach(function (r, i) { var o = document.createElement('option'); o.value = i; o.textContent = r[0]; rd.appendChild(o); });

  function fill() {
    $('rx-p').value = st.p; $('rx-t').value = st.t; $('rx-r').value = st.r; $('rx-rep').checked = st.rep;
    ['g', 'i', 'm', 's', 'u'].forEach(function (f) { $('rx-f' + f).checked = st.f.indexOf(f) > -1; });
  }
  function read() {
    st.p = $('rx-p').value; st.t = $('rx-t').value; st.r = $('rx-r').value; st.rep = $('rx-rep').checked;
    st.f = ['g', 'i', 'm', 's', 'u'].filter(function (f) { return $('rx-f' + f).checked; }).join('');
  }
  function render() {
    $('rx-rbox').hidden = !st.rep;
    var re, err = '';
    try { re = new RegExp(st.p, st.f.indexOf('g') > -1 ? st.f : st.f + 'g'); } catch (e) { err = e.message; }
    $('rx-slash').textContent = '/' + st.p + '/' + st.f;
    if (err || !st.p) {
      $('rx-msg').textContent = err ? '✗ תבנית לא תקינה: ' + err : 'כתבו תבנית למעלה.';
      $('rx-msg').className = 'note bad'; $('rx-view').textContent = st.t; $('rx-list').innerHTML = ''; $('rx-out').textContent = '';
      T.save(KEY, st); return;
    }
    var ms = [], m, html = '', at = 0, guard = 0;
    re.lastIndex = 0;
    while ((m = re.exec(st.t)) && guard++ < 1000) {
      if (m[0] === '') { re.lastIndex++; continue; }
      ms.push(m);
      html += esc(st.t.slice(at, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
      at = m.index + m[0].length;
      if (st.f.indexOf('g') < 0) break;
    }
    html += esc(st.t.slice(at));
    $('rx-view').innerHTML = html;
    $('rx-msg').textContent = ms.length ? '✓ ' + ms.length + ' התאמות' : 'אין התאמות בטקסט.';
    $('rx-msg').className = 'note' + (ms.length ? ' ok' : '');
    $('rx-list').innerHTML = ms.slice(0, 50).map(function (m, i) {
      var g = m.slice(1).map(function (x, j) { return '<span>$' + (j + 1) + ' = ' + (x == null ? '—' : esc(x)) + '</span>'; }).join('');
      return '<li><b>' + (i + 1) + '</b><code>' + esc(m[0]) + '</code><small>מקום ' + m.index + '</small>' + (g ? '<div>' + g + '</div>' : '') + '</li>';
    }).join('');
    if (st.rep) { try { $('rx-out').textContent = st.t.replace(new RegExp(st.p, st.f), st.r); } catch (e) {} }
    T.save(KEY, st);
  }
  fill(); render();
  ['rx-p', 'rx-t', 'rx-r'].forEach(function (id) { $(id).addEventListener('input', function () { read(); render(); }); });
  $('rx-flags').addEventListener('change', function () { read(); render(); });
  $('rx-rep').addEventListener('change', function () { read(); render(); });
  $('rx-p').addEventListener('change', function () { T.used('tichnut_regex', 'add'); });
  rd.addEventListener('change', function () {
    if (rd.value === '') return;
    var r = READY[+rd.value]; st.p = r[1]; st.f = r[2]; fill(); render(); rd.value = ''; T.used('tichnut_regex', 'ready');
  });
  $('rx-copy').addEventListener('click', function () {
    var code = 'const re = /' + st.p + '/' + st.f + ';';
    try { navigator.clipboard.writeText(code); $('rx-copy').textContent = 'הועתק ✓'; setTimeout(function () { $('rx-copy').textContent = 'להעתיק כקוד JavaScript'; }, 1500); } catch (e) {}
    T.used('tichnut_regex', 'copy');
  });
  $('rx-reset').addEventListener('click', function () { st = JSON.parse(JSON.stringify(def)); fill(); render(); });
})();
