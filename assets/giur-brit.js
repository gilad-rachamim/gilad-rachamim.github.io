/* ברית מילה לגר: רשימת שאלות שנשמרת בטלפון */
(function () {
  'use strict';
  var G = window.GIUR, box = G.$('bm-box'); if (!box) return;
  function all() { return [].slice.call(box.querySelectorAll('input[type=checkbox][data-k]')); }
  function refresh(boxes) {
    var done = boxes.filter(function (c) { return c.checked; }).length;
    G.bar(G.$('bm-pf'), G.$('bm-pc'), done, boxes.length);
    G.$('bm-pb').setAttribute('aria-valuenow', Math.round(done * 100 / boxes.length));
  }
  G.checklist(box, 'brit', refresh);
  G.$('bm-share').addEventListener('click', function () {
    var l = ['שלום, אלה שאלות שאני רוצה לברר לגבי שלב ברית המילה בהליך שלי:'];
    all().forEach(function (c) { l.push((c.checked ? '✅ ' : '⬜ ') + c.parentNode.textContent); });
    l.push('', 'https://hakelim.com/kodesh/giur/brit-mila-lager/');
    G.wa(l.join('\n'));
  });
  G.$('bm-reset').addEventListener('click', function () {
    if (!confirm('לאפס את הסימונים?')) return;
    G.set('brit', {}); all().forEach(function (c) { c.checked = false; }); refresh(all());
  });
  var wa = G.$('bm-wa'); if (wa) wa.addEventListener('click', function () { G.used('giur_brit_wa'); });
})();
