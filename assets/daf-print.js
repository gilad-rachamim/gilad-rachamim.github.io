// דף להדפסה מטופס (כלי קודש): T3 דף מידע לחג בבסיס, R6 סיכום הלכה "ממקור לפסק".
// כל שדה בטופס עם data-out="מפתח" נכנס לאלמנט [data-in="מפתח"] בדף. textarea עם data-lines: כל שורה – פסקה,
// ושורה עם "שעה – מה" (או "שעה - מה") נהיית שורת טבלה. נשמר בטלפון לפי data-key של הטופס.
(function () {
  'use strict';
  var form = document.querySelector('form[data-key]'), sheet = document.getElementById('dp-sheet');
  if (!form || !sheet) return;
  var KEY = form.dataset.key, st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  var fields = [].slice.call(form.querySelectorAll('[data-out]'));
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function block(v, mode) {
    var lines = v.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (mode === 'times') {
      return '<table class="dp-times">' + lines.map(function (l) {
        var m = l.match(/^(\d{1,2}[:.]\d{2}|\S+)\s*[–\-:]\s*(.+)$/);
        return m ? '<tr><td class="dp-t">' + esc(m[1]) + '</td><td>' + esc(m[2]) + '</td></tr>' : '<tr><td colspan="2">' + esc(l) + '</td></tr>';
      }).join('') + '</table>';
    }
    if (mode === 'pairs') {
      return '<table class="dp-times dp-pairs">' + lines.map(function (l, i) {
        var m = l.match(/^(.+?)\s+[–\-]\s+(.+)$/);
        return '<tr><td class="dp-n">' + (i + 1) + '</td>' + (m ? '<td>' + esc(m[1]) + '</td><td class="dp-who">' + esc(m[2]) + '</td>' : '<td colspan="2">' + esc(l) + '</td>') + '</tr>';
      }).join('') + '</table>';
    }
    if (mode === 'list') return '<ol>' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol>';
    return lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('');
  }
  function draw() {
    fields.forEach(function (f) {
      var v = (f.value || '').trim(), k = f.dataset.out;
      [].forEach.call(sheet.querySelectorAll('[data-in="' + k + '"]'), function (el) {
        var box = el.closest('[data-opt]');
        if (box) box.hidden = !v;
        if (f.dataset.lines) el.innerHTML = block(v || f.placeholder || '', f.dataset.lines);
        else el.textContent = v || (el.dataset.def || f.placeholder || '');
      });
    });
    var th = form.querySelector('[name=theme]');
    if (th) sheet.dataset.theme = th.value;
  }
  fields.concat([].slice.call(form.querySelectorAll('[name=theme]'))).forEach(function (f) {
    if (st[f.name] != null) f.value = st[f.name];
  });
  form.addEventListener('input', function () {
    [].forEach.call(form.elements, function (f) { if (f.name) st[f.name] = f.value; });
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    draw();
  });
  form.addEventListener('change', function () { form.dispatchEvent(new Event('input')); });
  function asText() { return sheet.innerText.replace(/\n{3,}/g, '\n\n').trim(); }
  var b;
  if ((b = document.getElementById('dp-print'))) b.addEventListener('click', function () { window.print(); });
  if ((b = document.getElementById('dp-wa'))) b.addEventListener('click', function () { window.open('https://wa.me/?text=' + encodeURIComponent(asText()), '_blank', 'noopener'); });
  if ((b = document.getElementById('dp-copy'))) b.addEventListener('click', function () {
    var t = asText(), me = this;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { var o = me.textContent; me.textContent = 'הועתק ✓'; setTimeout(function () { me.textContent = o; }, 1800); }, function () {});
  });
  draw();
})();
