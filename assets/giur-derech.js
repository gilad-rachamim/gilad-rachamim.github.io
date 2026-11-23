/* מפת דרך לגיור: סימון שלבים שנשמר בטלפון */
(function () {
  'use strict';
  var G = window.GIUR, box = G.$('gr-steps'); if (!box) return;
  var names = { s1: 'בירור ראשוני', s2: 'פתיחת בקשה ומציאת כיתה או רב מלווה', s3: 'לימוד, התנסות וקהילה', s4: 'המפגשים עם בית הדין', s5: 'קבלת מצוות בבית הדין', s6: 'ברית מילה (לגברים) וטבילה', s7: 'תעודה, חיים בקהילה ושמחה' };
  var T = G.t({ he: { a: 'שלום, זה מצב התקדמות שלי בדרך לגיור (', b: ' שלבים):', f: 'מפת דרך בחינם: ', r: 'לאפס את כל הסימונים במפה?' },
    en: { a: 'Hello, this is my progress on the way to conversion (', b: ' steps):', f: 'Free roadmap: ', r: 'Reset all the marks on the map?' },
    ru: { a: 'Здравствуйте, вот мой прогресс на пути гиюра (', b: ' этапов):', f: 'Бесплатная карта пути: ', r: 'Сбросить все отметки на карте?' } });
  var done = 0, total = 0;
  G.checklist(box, 'derech', function (boxes) {
    total = boxes.length; done = boxes.filter(function (c) { return c.checked; }).length;
    boxes.forEach(function (c) { c.closest('.gr-step').classList.toggle('done', c.checked); });
    G.bar(G.$('gr-pf'), G.$('gr-pc'), done, total);
    G.$('gr-pb').setAttribute('aria-valuenow', Math.round(done * 100 / total));
  });
  G.$('gr-share').addEventListener('click', function () {
    var l = [T.a + done + G.of() + total + T.b];
    [].forEach.call(box.querySelectorAll('input[data-k]'), function (c) { l.push((c.checked ? '✅ ' : '⬜ ') + (G.lang === 'he' ? names[c.getAttribute('data-k')] : c.parentNode.textContent.trim())); });
    l.push('', T.f + G.url());
    G.wa(l.join('\n'));
  });
  G.$('gr-reset').addEventListener('click', function () {
    if (!confirm(T.r)) return;
    G.set('derech', {}); [].forEach.call(box.querySelectorAll('input[data-k]'), function (c) { c.checked = false; c.dispatchEvent(new Event('change')); });
  });
})();
