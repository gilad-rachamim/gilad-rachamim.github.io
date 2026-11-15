// ניסוח מייל רשמי: בוחרים סוג מייל, ממלאים פרטים, ומקבלים 3 נושאים וגוף מייל בעברית או באנגלית.
// הנוסחים ב-/assets/tochen-mail.json (אותו קובץ משמש גם את התוסף לכרום), המילוי ב-tochen-mail-fill.js.
// הכול בדפדפן. הפרטים נשמרים רק בטלפון/במחשב (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var root = $('ml-app');
  if (!root || !window.HKMail) return;
  var KEY = 'kelim-mail-nusach';
  var st = { t: 'pnia', lang: 'he', gd: '', cat: '', vals: null, sub: 0 };
  try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o) for (var k in o) st[k] = o[k]; } catch (e) {}
  var D = null, edited = false, firstVisit = !st.vals;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function used(how) { try { if (window.toolUsed) window.toolUsed('mail_nusach', { how: how, t: st.t }); } catch (e) {} }
  function type() { for (var i = 0; i < D.types.length; i++) if (D.types[i].id === st.t) return D.types[i]; return D.types[0]; }

  // קישור ישיר לסוג: /kelim/tochen/mail/#hitpatrut
  function fromHash() {
    var h = decodeURIComponent((location.hash || '').slice(1));
    if (!h || !D) return false;
    for (var i = 0; i < D.types.length; i++) if (D.types[i].id === h) { st.t = h; st.cat = D.types[i].cat; return true; }
    return false;
  }

  function drawCats() {
    var html = '<button type="button" data-c=""' + (st.cat ? '' : ' aria-pressed="true"') + '>הכול</button>';
    D.cats.forEach(function (c) { html += '<button type="button" data-c="' + c.id + '"' + (st.cat === c.id ? ' aria-pressed="true"' : '') + '>' + esc(c.n) + '</button>'; });
    $('ml-cats').innerHTML = html;
    var th = '';
    D.types.forEach(function (t) {
      if (st.cat && t.cat !== st.cat) return;
      th += '<button type="button" class="ml-type" data-t="' + t.id + '"' + (t.id === st.t ? ' aria-pressed="true"' : '') + '><span aria-hidden="true">' + t.i + '</span> ' + esc(t.n) + '</button>';
    });
    $('ml-types').innerHTML = th;
  }
  function drawFields() {
    var t = type(), fs = HKMail.fields(D, t), html = '';
    if (!st.vals) { st.vals = {}; }
    fs.forEach(function (f) {
      // בכניסה הראשונה: דוגמה מלאה, כדי שיראו מייל שלם ולא טופס ריק
      if (firstVisit && st.vals[f.k] == null) st.vals[f.k] = f.ex || '';
      var id = 'ml-f-' + f.k, v = st.vals[f.k] || '';
      html += '<label class="ml-fld' + (f.long ? ' ml-long' : '') + '" for="' + id + '"><span>' + esc(f.l) + '</span>' +
        (f.long ? '<textarea id="' + id + '" data-k="' + f.k + '" rows="2" placeholder="' + esc('למשל: ' + (f.ex || '')) + '">' + esc(v) + '</textarea>'
          : '<input id="' + id + '" data-k="' + f.k + '" value="' + esc(v) + '" placeholder="' + esc('למשל: ' + (f.ex || '')) + '" autocomplete="off">') + '</label>';
    });
    $('ml-fields').innerHTML = html;
    $('ml-note').hidden = !t.note; $('ml-note').textContent = t.note ? '⚖ ' + t.note : '';
    $('ml-gd').hidden = st.lang !== 'he';
  }
  function drawOut() {
    var t = type(), r = HKMail.fill(D, t, st.lang, st.vals, st.gd);
    if (st.sub > 2) st.sub = 0;
    var sh = '';
    r.subjects.forEach(function (s, i) {
      sh += '<label class="ml-sub"><input type="radio" name="ml-sub" value="' + i + '"' + (i === st.sub ? ' checked' : '') + '><span dir="auto">' + esc(s) + '</span></label>';
    });
    $('ml-subs').innerHTML = sh;
    if (!edited) $('ml-body').value = r.body;
    $('ml-body').dir = st.lang === 'en' ? 'ltr' : 'rtl';
    $('ml-reset').hidden = !edited;
    $('ml-title').textContent = t.i + ' ' + t.n;
    $('ml-empty').hidden = !/\[[^\]\n]{2,40}\]/.test($('ml-body').value + r.subjects[st.sub]);
  }
  function seg(id, key, val) {
    [].forEach.call($(id).querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === val ? 'true' : 'false'); });
  }
  function all() { drawCats(); drawFields(); drawOut(); seg('ml-lang', 'lang', st.lang); seg('ml-gd', 'gd', st.gd); save(); }
  function subject() { var r = HKMail.fill(D, type(), st.lang, st.vals, st.gd); return r.subjects[st.sub] || r.subjects[0]; }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-c')) { st.cat = b.getAttribute('data-c'); drawCats(); save(); return; }
    if (b.hasAttribute('data-t')) {
      st.t = b.getAttribute('data-t'); st.sub = 0; edited = false; all();
      try { history.replaceState(null, '', '#' + st.t); } catch (er) {}
      var top = $('ml-form'); if (top && top.scrollIntoView && window.innerWidth < 760) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (b.closest('#ml-lang')) { st.lang = b.getAttribute('data-v'); edited = false; all(); return; }
    if (b.closest('#ml-gd')) { st.gd = b.getAttribute('data-v'); edited = false; all(); return; }
  });
  root.addEventListener('input', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-k');
    if (k) { st.vals[k] = e.target.value; firstVisit = false; drawOut(); save(); return; }
    if (e.target.id === 'ml-body') { edited = true; $('ml-reset').hidden = false; return; }
  });
  root.addEventListener('change', function (e) {
    if (e.target.name === 'ml-sub') { st.sub = +e.target.value; save(); drawOut(); }
  });
  $('ml-reset').addEventListener('click', function () { edited = false; drawOut(); });
  $('ml-clear').addEventListener('click', function () {
    var t = type(); HKMail.fields(D, t).forEach(function (f) { if (f.k !== 'name' || st.vals.name === f.ex) st.vals[f.k] = ''; });
    firstVisit = false; edited = false; drawFields(); drawOut(); save();
    var first = $('ml-fields').querySelector('input,textarea'); if (first) first.focus();
  });

  function msg(t) { $('ml-msg').textContent = t; clearTimeout(msg.t); msg.t = setTimeout(function () { $('ml-msg').textContent = ''; }, 4000); }
  function copy(text, done) {
    var ok = function () { msg(done); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { msg('לא הצלחתי להעתיק. מסמנים ומעתיקים ידנית.'); } ta.remove(); }
  }
  $('ml-copy').addEventListener('click', function () { copy((st.lang === 'en' ? 'Subject: ' : 'נושא: ') + subject() + '\n\n' + $('ml-body').value, '✓ הנושא והמייל הועתקו'); used('copy'); });
  $('ml-copy-body').addEventListener('click', function () { copy($('ml-body').value, '✓ גוף המייל הועתק'); used('copy_body'); });
  $('ml-copy-sub').addEventListener('click', function () { copy(subject(), '✓ הנושא הועתק'); used('copy_sub'); });
  $('ml-gmail').addEventListener('click', function () {
    var to = $('ml-to').value.trim();
    var u = 'https://mail.google.com/mail/?view=cm&fs=1' + (to ? '&to=' + encodeURIComponent(to) : '') + '&su=' + encodeURIComponent(subject()) + '&body=' + encodeURIComponent($('ml-body').value);
    window.open(u, '_blank', 'noopener'); used('gmail');
  });
  $('ml-mailto').addEventListener('click', function () {
    var to = $('ml-to').value.trim();
    location.href = 'mailto:' + encodeURIComponent(to).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(subject()) + '&body=' + encodeURIComponent($('ml-body').value.replace(/\n/g, '\r\n'));
    used('mailto');
  });
  // הדפסה וקובץ Word: המכתב לבד, בדף נקי
  function letterHtml() {
    var dir = st.lang === 'en' ? 'ltr' : 'rtl', body = $('ml-body').value;
    var paras = body.split(/\n{2,}/).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
    return '<!doctype html><html dir="' + dir + '" lang="' + (st.lang === 'en' ? 'en' : 'he') + '"><head><meta charset="utf-8"><title>' + esc(subject()) +
      '</title><style>body{font-family:Arial,"David",sans-serif;font-size:13pt;line-height:1.6;max-width:16cm;margin:2cm auto;color:#000}p{margin:0 0 .9em}.d{text-align:' + (dir === 'rtl' ? 'left' : 'right') + ';margin-bottom:1.5em}</style></head><body><div class="d">' +
      new Date().toLocaleDateString(st.lang === 'en' ? 'en-GB' : 'he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div>' + paras + '</body></html>';
  }
  $('ml-print').addEventListener('click', function () {
    var w = window.open('', '_blank');
    if (!w) { msg('הדפדפן חסם חלון חדש. מאשרים חלונות קופצים ומנסים שוב.'); return; }
    w.document.open(); w.document.write(letterHtml()); w.document.close(); w.focus();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 300); used('print');
  });
  $('ml-word').addEventListener('click', function () {
    var blob = new Blob(['﻿' + letterHtml()], { type: 'application/msword' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = type().n.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').slice(0, 60) + '.doc';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    msg('✓ הקובץ ירד. פותחים ב-Word, משנים מה שרוצים ושומרים.'); used('word');
  });
  try { $('ml-to').value = localStorage.getItem(KEY + '-to') || ''; } catch (e) {}
  $('ml-to').addEventListener('input', function () { try { localStorage.setItem(KEY + '-to', $('ml-to').value); } catch (e) {} });

  fetch('/assets/tochen-mail.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
    D = j;
    // דף נחיתה (למשל /kelim/tochen/mail/hitpatrut/) פותח את הנוסח שלו
    if (!fromHash() && root.getAttribute('data-t')) {
      var pt = root.getAttribute('data-t');
      for (var i = 0; i < D.types.length; i++) if (D.types[i].id === pt) { st.t = pt; st.cat = root.getAttribute('data-cat') || D.types[i].cat; }
      if (root.getAttribute('data-lang')) st.lang = root.getAttribute('data-lang');
      st.sub = 0;
    }
    all();
    window.addEventListener('hashchange', function () { if (fromHash()) { edited = false; all(); } });
  }).catch(function () { $('ml-msg').textContent = 'הנוסחים לא נטענו. בודקים את החיבור ומרעננים את הדף.'; });
})();
