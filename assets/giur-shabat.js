/* שבת ראשונה: רשימת הכנות שנשמרת בטלפון */
(function () {
  'use strict';
  var G = window.GIUR, box = G.$('sr-box'); if (!box) return;
  var T = G.t({ he: { a: 'שלום, אני מתכונן לשבת הראשונה שלי (', b: ' הכנות):', f: 'רשימה בחינם: ', r: 'לאפס את כל הסימונים?' },
    en: { a: 'Hello, I am preparing for my first Shabbat (', b: ' preparations):', f: 'Free checklist: ', r: 'Reset all the marks?' },
    ru: { a: 'Здравствуйте, я готовлюсь к своему первому шаббату (', b: ' пунктов):', f: 'Бесплатный список: ', r: 'Сбросить все отметки?' } });
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
    var l = [T.a + done + G.of() + boxes.length + T.b];
    boxes.forEach(function (c) { l.push((c.checked ? '✅ ' : '⬜ ') + c.parentNode.textContent.trim()); });
    l.push('', T.f + G.url());
    G.wa(l.join('\n'));
  });
  G.$('sr-reset').addEventListener('click', function () {
    if (!confirm(T.r)) return;
    G.set(KEY, {}); all().forEach(function (c) { c.checked = false; }); refresh(all());
  });
})();
