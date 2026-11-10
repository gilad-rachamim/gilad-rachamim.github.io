// ממיר Base64 / URL / JWT: קידוד ופענוח שתומכים בעברית (UTF-8), ופענוח JWT עם תאריך התפוגה. שום דבר לא נשמר ולא נשלח.
(function () {
  var T = window.TICHNUT, $ = function (id) { return document.getElementById(id); };
  var EX = {
    b64e: 'שלום עולם! Hello GPU 🚀',
    b64d: '16nXnNeV150g16LXldec150hIEhlbGxvIEdQVSDwn5qA',
    urle: 'https://hakelim.com/kelim/?q=כלים למתכנתים&gpu=RTX 4090',
    urld: 'q%3D%D7%9B%D7%9C%D7%99%D7%9D%20%D7%9C%D7%9E%D7%AA%D7%9B%D7%A0%D7%AA%D7%99%D7%9D',
    jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwibmFtZSI6ImRlbW8iLCJyb2xlIjoiZGV2IiwiaWF0IjoxNzYyNjAwMDAwLCJleHAiOjE4MzAwMDAwMDB9.c2lnbmF0dXJlLWRlbW8'
  };
  var mode = 'b64e';
  function utf8b64(s) { var b = new TextEncoder().encode(s), r = ''; for (var i = 0; i < b.length; i++) r += String.fromCharCode(b[i]); return btoa(r); }
  function b64utf8(s) {
    s = s.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(b);
  }
  function date(sec) { var d = new Date(sec * 1000); return d.toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' }); }
  function jwt(t) {
    var p = t.trim().split('.');
    if (p.length < 2) throw new Error('JWT בנוי משלושה חלקים עם נקודות ביניהם.');
    var h = JSON.parse(b64utf8(p[0])), b = JSON.parse(b64utf8(p[1])), info = [];
    if (b.exp) {
      var left = b.exp * 1000 - Date.now();
      info.push((left > 0 ? '✓ בתוקף עד ' : '✗ פג תוקף ב-') + date(b.exp) + (left > 0 ? ' (עוד ' + Math.round(left / 86400000) + ' ימים)' : ''));
    }
    if (b.iat) info.push('נוצר ב-' + date(b.iat));
    if (h.alg) info.push('אלגוריתם חתימה: ' + h.alg + (h.alg === 'none' ? ' – בלי חתימה! לא לסמוך עליו' : ''));
    return { out: '// header\n' + JSON.stringify(h, null, 2) + '\n\n// payload\n' + JSON.stringify(b, null, 2), info: info.join('\n') };
  }
  function run() {
    var v = $('b6-in').value, out = '', info = '', ok = true;
    try {
      if (!v) out = '';
      else if (mode === 'b64e') out = utf8b64(v);
      else if (mode === 'b64d') out = b64utf8(v);
      else if (mode === 'urle') out = encodeURIComponent(v);
      else if (mode === 'urld') out = decodeURIComponent(v.replace(/\+/g, ' '));
      else { var j = jwt(v); out = j.out; info = j.info; }
    } catch (e) {
      ok = false;
      out = mode === 'jwt' && /JWT/.test(e.message) ? e.message : 'לא הצלחתי לפענח. ' + (mode === 'b64d' || mode === 'jwt' ? 'בדקו שהטקסט הוא Base64 שלם (A-Z, a-z, 0-9, + / =).' : 'בדקו שאין סימן % שבור.');
    }
    $('b6-out').textContent = out; $('b6-out').classList.toggle('bad', !ok);
    $('b6-info').textContent = info; $('b6-info').hidden = !info;
    $('b6-len').textContent = v ? v.length + ' תווים ← ' + (ok ? out.length : 0) + ' תווים' : '';
  }
  function setMode(m, ex) {
    mode = m;
    [].forEach.call(document.querySelectorAll('#b6-tabs button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-m') === m); });
    if (ex) $('b6-in').value = EX[m];
    run();
  }
  $('b6-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-m]'); if (!b) return;
    setMode(b.getAttribute('data-m'), true); T.used('tichnut_base64', 'mode');
  });
  $('b6-in').addEventListener('input', run);
  $('b6-in').addEventListener('change', function () { T.used('tichnut_base64', 'add'); });
  $('b6-swap').addEventListener('click', function () {
    var pair = { b64e: 'b64d', b64d: 'b64e', urle: 'urld', urld: 'urle' };
    if (!pair[mode] || $('b6-out').classList.contains('bad')) return;
    $('b6-in').value = $('b6-out').textContent; setMode(pair[mode], false);
  });
  $('b6-copy').addEventListener('click', function () {
    try { navigator.clipboard.writeText($('b6-out').textContent); $('b6-copy').textContent = 'הועתק ✓'; setTimeout(function () { $('b6-copy').textContent = 'להעתיק'; }, 1500); } catch (e) {}
    T.used('tichnut_base64', 'copy');
  });
  $('b6-clear').addEventListener('click', function () { $('b6-in').value = ''; run(); $('b6-in').focus(); });
  setMode('b64e', true);
})();
