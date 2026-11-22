/* שבת ראשונה: רשימת הכנות שנשמרת בטלפון */
(function () {
  'use strict';
  var G = window.GIUR, box = G.$('sr-box'); if (!box) return;
  var KEY = 'shabat';
  function all() { return [].slice.call(box.querySelectorAll('input[type=checkbox][data-k]')); }
  function refresh(boxes) {
    var done = boxes.filter(function (c) { return c.checked; }).length;
    G.bar(G.$('sr-pf'), G.$('sr-pc'), done, boxes.length);
    G.$('sr-pb').setAttribute('aria-valuenow', Math.round(done * 100 / boxes.length));
  }
  G.checklist(box, KEY, refresh);
  G.$('sr-share').addEventListener('click', function () {
    var boxes = all(), done = boxes.filter(function (c) { return c.checked; }).length;
    var l = ['שלום, אני מתכונן לשבת הראשונה שלי (' + done + ' מתוך ' + boxes.length + ' הכנות):'];
    boxes.forEach(function (c) { l.push((c.checked ? '✅ ' : '⬜ ') + c.parentNode.textContent); });
    l.push('', 'רשימה בחינם: https://hakelim.com/kodesh/giur/shabat-rishona/');
    G.wa(l.join('\n'));
  });
  G.$('sr-reset').addEventListener('click', function () {
    if (!confirm('לאפס את כל הסימונים?')) return;
    G.set(KEY, {}); all().forEach(function (c) { c.checked = false; }); refresh(all());
  });
})();
