/* מילון מושגים עם חיפוש + רשימת מסמכים שנשמרת בטלפון */
(function () {
  'use strict';
  var G = window.GIUR, list = G.$('ms-list'); if (!list) return;
  var terms = [].slice.call(list.querySelectorAll('.gr-term')), q = G.$('ms-q'), used = false;
  function filter() {
    var v = q.value.trim(), n = 0;
    terms.forEach(function (t) { var ok = !v || t.getAttribute('data-t').indexOf(v) >= 0; t.hidden = !ok; if (ok) n++; });
    G.$('ms-none').hidden = n > 0;
    G.$('ms-c').textContent = v ? 'נמצאו ' + n + ' מושגים' : '';
    if (v && !used) { used = true; G.used('giur_musagim_search'); }
  }
  q.addEventListener('input', filter);
  var box = G.$('ms-docs-box');
  function all() { return [].slice.call(box.querySelectorAll('input[type=checkbox][data-k]')); }
  function refresh(boxes) {
    var done = boxes.filter(function (c) { return c.checked; }).length;
    G.bar(G.$('ms-pf'), G.$('ms-pc'), done, boxes.length);
    G.$('ms-pb').setAttribute('aria-valuenow', Math.round(done * 100 / boxes.length));
  }
  G.checklist(box, 'docs', refresh);
  G.$('ms-share').addEventListener('click', function () {
    var l = ['רשימת מסמכים לפתיחת בקשה לגיור (לפי האתר הרשמי gov.il):'];
    all().forEach(function (c) { l.push((c.checked ? '✅ ' : '⬜ ') + c.parentNode.textContent); });
    l.push('', 'https://hakelim.com/kodesh/giur/musagim/#docs');
    G.wa(l.join('\n'));
  });
  G.$('ms-reset').addEventListener('click', function () {
    if (!confirm('לאפס את הסימונים?')) return;
    G.set('docs', {}); all().forEach(function (c) { c.checked = false; }); refresh(all());
  });
})();
