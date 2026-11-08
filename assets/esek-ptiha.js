// E7 – צ'ק-ליסט פתיחת עסק קטן (כלים לעסק קטן). הסימונים נשמרים בטלפון (localStorage), בלי שרת.
(function () {
  'use strict';
  var KEY = 'esek-ptiha';
  var boxes = [].slice.call(document.querySelectorAll('.ck input[type=checkbox]'));
  if (!boxes.length) return;
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  boxes.forEach(function (b) { if (saved[b.value]) b.checked = true; });
  var bar = document.getElementById('ck-bar'), txt = document.getElementById('ck-txt'), wa = document.getElementById('ck-wa');
  var first = true;

  function update() {
    var done = boxes.filter(function (b) { return b.checked; }).length, pct = Math.round(done * 100 / boxes.length);
    bar.style.width = pct + '%';
    txt.textContent = done + ' מתוך ' + boxes.length + ' סודרו' + (pct === 100 ? ' – בהצלחה גדולה בעסק!' : '');
    var o = {}; boxes.forEach(function (b) { if (b.checked) o[b.value] = 1; });
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    [].forEach.call(document.querySelectorAll('.ck-g'), function (g) {
      var all = g.querySelectorAll('input[type=checkbox]'), on = g.querySelectorAll('input:checked');
      g.querySelector('.ck-count').textContent = on.length + '/' + all.length;
    });
    var left = boxes.filter(function (b) { return !b.checked; }).map(function (b) { return '☐ ' + b.parentNode.querySelector('b').textContent; });
    var msg = left.length ? 'מה עוד נשאר לסדר בפתיחת העסק:\n' + left.join('\n') : 'סידרתי הכול ברשימת פתיחת העסק ✓';
    wa.href = 'https://wa.me/?text=' + encodeURIComponent(msg + '\n\n' + location.origin + location.pathname);
    if (!first && window.toolUsed) window.toolUsed('esek_ptiha', { action: 'check', done: done });
    first = false;
  }
  boxes.forEach(function (b) { b.addEventListener('change', update); });
  wa.addEventListener('click', function () { if (window.toolUsed) window.toolUsed('esek_ptiha', { action: 'wa_left' }); });
  document.getElementById('ck-reset').addEventListener('click', function () {
    if (!confirm('לנקות את כל הסימונים?')) return;
    boxes.forEach(function (b) { b.checked = false; }); update();
  });
  update();
})();
