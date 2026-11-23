/* מילון מושגים עם חיפוש + רשימת מסמכים שנשמרת בטלפון */
(function () {
  'use strict';
  var G = window.GIUR, list = G.$('ms-list'); if (!list) return;
  var terms = [].slice.call(list.querySelectorAll('.gr-term')), q = G.$('ms-q'), used = false;
  var T = G.t({ he: { n: function (n) { return 'נמצאו ' + n + ' מושגים'; }, a: 'רשימת מסמכים לפתיחת בקשה לגיור (לפי האתר הרשמי gov.il):', r: 'לאפס את הסימונים?' },
    en: { n: function (n) { return n + ' terms found'; }, a: 'Documents for opening a conversion application (per the official gov.il site):', r: 'Reset the marks?' },
    ru: { n: function (n) { return 'Найдено терминов: ' + n; }, a: 'Документы для открытия дела о гиюре (по официальному сайту gov.il):', r: 'Сбросить отметки?' } });
  function filter() {
    var v = q.value.trim().toLowerCase(), n = 0;
    terms.forEach(function (t) { var ok = !v || t.getAttribute('data-t').toLowerCase().indexOf(v) >= 0; t.hidden = !ok; if (ok) n++; });
    G.$('ms-none').hidden = n > 0;
    G.$('ms-c').textContent = v ? T.n(n) : '';
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
    var l = [T.a];
    all().forEach(function (c) { l.push((c.checked ? '✅ ' : '⬜ ') + c.parentNode.textContent.trim()); });
    l.push('', G.url('#docs'));
    G.wa(l.join('\n'));
  });
  G.$('ms-reset').addEventListener('click', function () {
    if (!confirm(T.r)) return;
    G.set('docs', {}); all().forEach(function (c) { c.checked = false; }); refresh(all());
  });
})();
