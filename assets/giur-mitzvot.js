/* המצוות שלי: מעקב לפי תחומים, נשמר בטלפון */
(function () {
  'use strict';
  var G = window.GIUR, box = G.$('mz-box'); if (!box) return;
  var NAMES = { shabat: 'שבת', kashrut: 'כשרות', brachot: 'ברכות', tefila: 'תפילה', chagim: 'חגים', bein: 'בין אדם לחברו' };
  var KEY = 'mitzvot';
  function all() { return [].slice.call(box.querySelectorAll('input[type=checkbox][data-k]')); }
  function refresh(boxes) {
    var done = boxes.filter(function (c) { return c.checked; }).length;
    G.bar(G.$('mz-pf'), G.$('mz-pc'), done, boxes.length);
    G.$('mz-pb').setAttribute('aria-valuenow', Math.round(done * 100 / boxes.length));
    var next = boxes.filter(function (c) { return !c.checked; })[0], w = G.$('mz-week');
    if (next) { w.hidden = false; G.$('mz-weekt').textContent = next.parentNode.textContent + ' (' + NAMES[next.closest('.gr-area').getAttribute('data-area')] + ')'; }
    else { w.hidden = false; G.$('mz-weekt').textContent = 'סימנתם הכול, כל הכבוד! אפשר לשתף את הרב המלווה ולשאול מה הצעד הבא.'; }
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
    var l = ['שלום, זה מצב ההתקדמות שלי במצוות (' + done + ' מתוך ' + boxes.length + ' צעדים):'];
    Object.keys(NAMES).forEach(function (k) {
      var bs = boxes.filter(function (c) { return c.closest('.gr-area').getAttribute('data-area') === k; });
      l.push(NAMES[k] + ': ' + bs.filter(function (c) { return c.checked; }).length + ' מתוך ' + bs.length);
    });
    l.push('', 'מעקב בחינם: https://hakelim.com/kodesh/giur/mitzvot/');
    G.wa(l.join('\n'));
  });
  G.$('mz-reset').addEventListener('click', function () {
    if (!confirm('לאפס את כל הסימונים?')) return;
    G.set(KEY, {}); all().forEach(function (c) { c.checked = false; }); refresh(all());
  });
})();
