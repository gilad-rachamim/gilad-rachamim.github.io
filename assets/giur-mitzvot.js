/* המצוות שלי: מעקב לפי תחומים, נשמר בטלפון */
(function () {
  'use strict';
  var G = window.GIUR, box = G.$('mz-box'); if (!box) return;
  var NAMES = { shabat: 'שבת', kashrut: 'כשרות', brachot: 'ברכות', tefila: 'תפילה', chagim: 'חגים', bein: 'בין אדם לחברו' };
  if (G.lang === 'en') NAMES = { shabat: 'Shabbat', kashrut: 'Kashrut', brachot: 'Blessings', tefila: 'Prayer', chagim: 'Holidays', bein: 'Between people' };
  if (G.lang === 'ru') NAMES = { shabat: 'Шаббат', kashrut: 'Кашрут', brachot: 'Благословения', tefila: 'Молитва', chagim: 'Праздники', bein: 'Между людьми' };
  var T = G.t({ he: { all: 'סימנתם הכול, כל הכבוד! אפשר לשתף את הרב המלווה ולשאול מה הצעד הבא.', a: 'שלום, זה מצב ההתקדמות שלי במצוות (', b: ' צעדים):', f: 'מעקב בחינם: ', r: 'לאפס את כל הסימונים?' },
    en: { all: 'You marked everything, well done! You can share it with your accompanying rabbi and ask what the next step is.', a: 'Hello, this is my progress with the mitzvot (', b: ' steps):', f: 'Free tracker: ', r: 'Reset all the marks?' },
    ru: { all: 'Вы отметили всё, молодец! Можно поделиться с сопровождающим раввином и спросить, какой следующий шаг.', a: 'Здравствуйте, вот мой прогресс в заповедях (', b: ' шагов):', f: 'Бесплатный трекер: ', r: 'Сбросить все отметки?' } });
  var KEY = 'mitzvot';
  function all() { return [].slice.call(box.querySelectorAll('input[type=checkbox][data-k]')); }
  function refresh(boxes) {
    var done = boxes.filter(function (c) { return c.checked; }).length;
    G.bar(G.$('mz-pf'), G.$('mz-pc'), done, boxes.length);
    G.$('mz-pb').setAttribute('aria-valuenow', Math.round(done * 100 / boxes.length));
    var next = boxes.filter(function (c) { return !c.checked; })[0], w = G.$('mz-week');
    if (next) { w.hidden = false; G.$('mz-weekt').textContent = next.parentNode.textContent.trim() + ' (' + NAMES[next.closest('.gr-area').getAttribute('data-area')] + ')'; }
    else { w.hidden = false; G.$('mz-weekt').textContent = T.all; }
  }
  G.checklist(box, KEY, refresh);
  [].forEach.call(document.querySelectorAll('[data-tab]'), function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-tab');
      [].forEach.call(document.querySelectorAll('[data-tab]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      [].forEach.call(box.querySelectorAll('.gr-area'), function (a) { a.hidden = a.getAttribute('data-area') !== k; });
      G.used('giur_mitzvot_tab', { area: k });
    });
  });
  G.$('mz-share').addEventListener('click', function () {
    var boxes = all(), done = boxes.filter(function (c) { return c.checked; }).length;
    var l = [T.a + done + G.of() + boxes.length + T.b];
    Object.keys(NAMES).forEach(function (k) {
      var bs = boxes.filter(function (c) { return c.closest('.gr-area').getAttribute('data-area') === k; });
      l.push(NAMES[k] + ': ' + bs.filter(function (c) { return c.checked; }).length + G.of() + bs.length);
    });
    l.push('', T.f + G.url());
    G.wa(l.join('\n'));
  });
  G.$('mz-reset').addEventListener('click', function () {
    if (!confirm(T.r)) return;
    G.set(KEY, {}); all().forEach(function (c) { c.checked = false; }); refresh(all());
  });
})();
