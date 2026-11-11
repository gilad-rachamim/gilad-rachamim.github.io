// תהילים לפי שם (כלי קודש): אותיות השם → שמונת הפסוקים של כל אות בפרק קיט. לנפטר: גם אותיות נשמה.
// בלי שרת: הטקסט מספריא (tehillim-text.js), והשם נשמר רק בקישור לשיתוף (?k=&n=&bb=&par=&wp=&pre=).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('th-form'), out = $('th-out');
  if (!form) return;
  var AB = 'אבגדהוזחטיכלמנסעפצקרשת';
  var NAMES = ['אל"ף', 'בי"ת', 'גימ"ל', 'דל"ת', 'ה"א', 'וי"ו', 'זי"ן', 'חי"ת', 'טי"ת', 'יו"ד', 'כ"ף', 'למ"ד', 'מ"ם', 'נו"ן', 'סמ"ך', 'עי"ן', 'פ"א', 'צד"י', 'קו"ף', 'רי"ש', 'שי"ן', 'תי"ו'];
  var FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  var T = window.TehillimText;
  T.fill(form.querySelector('[name=k]'), true, 'בלי כותרת');
  var PRE = [33, 16, 17, 72, 91, 104, 130];
  var val = function (n) { var el = form.querySelector('[name=' + n + ']'); return el.type === 'checkbox' ? el.checked : el.value.trim(); };
  function letters(s) {
    return String(s || '').replace(/[֑-ׇ]/g, '').split('').map(function (c) { return FIN[c] || c; }).filter(function (c) { return AB.indexOf(c) >= 0; });
  }
  function title() {
    var n = val('n'), p = val('par');
    if (!n) return '';
    return T.join(T.phrase(val('k')), n + (p ? ' ' + val('bb') + ' ' + p : ''));
  }
  // רצף: [{l: אות, kind: 'n'|'p'|'s'}] – שם, הורה (אם סומן), נשמה (לנפטר)
  function seq() {
    var a = letters(val('n')).map(function (l) { return { l: l, k: 'n' }; });
    if (val('withpar') && val('par')) a = a.concat(letters(val('par')).map(function (l) { return { l: l, k: 'p' }; }));
    if (val('k') === 'niftar') a = a.concat('נשמה'.split('').map(function (l) { return { l: l, k: 's' }; }));
    return a;
  }
  function params() {
    var q = new URLSearchParams();
    q.set('k', val('k')); if (val('n')) q.set('n', val('n'));
    q.set('bb', val('bb')); if (val('par')) q.set('par', val('par'));
    if (val('withpar')) q.set('wp', '1'); if (val('pre') && val('k') === 'niftar') q.set('pre', '1');
    return q.toString();
  }
  function link() { return location.origin + '/kodesh/tehillim/shem/?' + params(); }
  function preview() {
    var s = seq();
    plain = '';
    $('th-letters').innerHTML = s.length ? s.map(function (x) { return '<span' + (x.k === 's' ? ' class="n" title="נשמה"' : '') + '>' + x.l + '</span>'; }).join('') : '';
    $('th-pre-w').hidden = val('k') !== 'niftar';
    var t = title();
    $('th-wa').href = 'https://wa.me/?text=' + encodeURIComponent((t ? '*תהילים ' + t + '*\n' : '*תהילים לפי שם*\n') + 'פסוקי פרק קיט לפי אותיות השם' + (val('k') === 'niftar' ? ' ואותיות נשמה' : '') + '. נשמח שתאמרו:\n' + link());
    try { history.replaceState(null, '', '?' + params()); } catch (e) {}
    try { localStorage.setItem('kodesh-tehillim-shem', params()); } catch (e) {}
  }
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var N = window.TehillimText.num;
  var plain = '';
  function show() {
    var s = seq();
    if (!val('n') || !s.length) { out.innerHTML = '<p class="th-wait">כתבו שם באותיות עבריות.</p>'; $('th-n').focus(); return; }
    out.innerHTML = '<p class="th-wait">טוען את הפסוקים מספריא…</p>';
    var want = ['Psalms.119'];
    if (val('pre') && val('k') === 'niftar') want = PRE.map(function (p) { return 'Psalms.' + p; }).concat(want);
    Promise.all(want.map(window.TehillimText.load)).then(function (res) {
      if (res.some(function (r) { return !r; })) { out.innerHTML = '<p class="th-wait">לא הצלחתי לטעון את הטקסט מספריא. בודקים את האינטרנט ולוחצים שוב.</p>'; return; }
      var ps = res.pop(), t = title(), h = '', tx = [];
      h += '<p class="th-head">' + esc(t || 'תהילים לפי שם') + '<small>פרק קיט לפי האותיות: ' + s.map(function (x) { return x.l; }).join(' ') + '</small></p>';
      tx.push('*' + (t || 'תהילים לפי שם') + '*');
      res.forEach(function (ch, i) {
        h += '<section class="th-sec"><h3>תהילים פרק ' + N(PRE[i]) + '</h3>' + ch.map(function (v) { return '<p><sup>' + N(v.v) + '</sup>' + esc(v.t) + '</p>'; }).join('') + '</section>';
        tx.push('\n*פרק ' + N(PRE[i]) + '*\n' + ch.map(function (v) { return v.t; }).join('\n'));
      });
      var lastK = '';
      s.forEach(function (x) {
        var i = AB.indexOf(x.l), vs = ps.slice(i * 8, i * 8 + 8);
        var note = x.k === 's' && lastK !== 's' ? ' <small>– אותיות נשמה</small>' : x.k === 'p' && lastK !== 'p' ? ' <small>– שם ההורה</small>' : '';
        h += '<section class="th-sec"><h3>' + x.l + ' · ' + NAMES[i] + note + '</h3>' + vs.map(function (v) { return '<p><sup>' + N(v.v) + '</sup>' + esc(v.t) + '</p>'; }).join('') + '</section>';
        tx.push('\n*' + x.l + '*\n' + vs.map(function (v) { return v.t; }).join('\n'));
        lastK = x.k;
      });
      h += '<p class="disclaimer">מתוך ספר תהילים, נוסח המסורה (ספריא). נוצר בכלי קודש: hakelim.com/kodesh/tehillim/shem</p>';
      out.innerHTML = h;
      plain = tx.join('\n') + '\n\n' + link();
      $('th-next').hidden = false;
      $('th-az').hidden = val('k') !== 'niftar';
      var q = new URLSearchParams({ new: '1', p: val('k') === 'other' ? 'zchut' : val('k'), n: val('n'), bb: val('bb') });
      if (val('par')) q.set('par', val('par'));
      $('th-siyum').href = '/kodesh/tehillim/?' + q.toString();
      if (window.toolUsed) window.toolUsed('tehillim_shem', { kind: val('k'), letters: s.length });
    });
  }
  // מצב התחלתי: מהקישור, ואם אין – מהביקור הקודם
  var q = new URLSearchParams(location.search);
  if (!q.get('n')) { try { q = new URLSearchParams(localStorage.getItem('kodesh-tehillim-shem') || ''); } catch (e) {} }
  ['k', 'n', 'bb', 'par'].forEach(function (k) { if (q.get(k)) form.querySelector('[name=' + k + ']').value = q.get(k); });
  $('th-withpar').checked = q.get('wp') === '1';
  $('th-pre').checked = q.get('pre') === '1';
  form.querySelector('[name=k]').addEventListener('change', function () { var d = T.defName(val('k')); if (d && !val('n')) { $('th-n').value = d; } });
  form.addEventListener('input', preview);
  form.addEventListener('change', preview);
  form.addEventListener('submit', function (e) { e.preventDefault(); show(); });
  $('th-go').addEventListener('click', show);
  $('th-print').addEventListener('click', function () {
    var go = function () { window.print(); if (window.toolUsed) window.toolUsed('tehillim_shem', { how: 'print' }); };
    if (!out.querySelector('.th-sec')) { show(); var w = setInterval(function () { if (out.querySelector('.th-sec')) { clearInterval(w); setTimeout(go, 200); } }, 300); setTimeout(function () { clearInterval(w); }, 15000); }
    else go();
  });
  $('th-copy').addEventListener('click', function () {
    var b = this;
    function copy() { navigator.clipboard.writeText(plain).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק את הטקסט'; }, 1800); }); }
    if (!plain) { show(); var w = setInterval(function () { if (plain) { clearInterval(w); copy(); } }, 300); setTimeout(function () { clearInterval(w); }, 15000); }
    else copy();
  });
  $('th-wa').addEventListener('click', function () { if (window.toolUsed) window.toolUsed('tehillim_shem', { how: 'wa' }); });
  preview();
  if (new URLSearchParams(location.search).get('n')) show();
})();
