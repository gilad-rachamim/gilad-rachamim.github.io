// R8 – דפי תפילה לאירוע (כלי קודש): בוחרים דף, ממלאים כותרת, מסכת והקדשה, ומדפיסים.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var tabs = document.querySelectorAll('[data-sheet][role=tab]');
  if (!tabs.length) return;
  var NAMES = { siyum: 'סיום מסכת', havdala: 'הבדלה', gomel: 'ברכת הגומל' };
  var cur = 'siyum';

  function upd() {
    var mas = $('dt-mas').value.trim();
    var title = $('dt-title').value.trim() || (cur === 'siyum' && mas ? 'סיום מסכת ' + mas : NAMES[cur]);
    $('dt-h').textContent = title;
    var ded = $('dt-ded').value.trim();
    $('dt-dedv').textContent = ded; $('dt-dedv').hidden = !ded;
    document.querySelectorAll('.dt-m').forEach(function (b) { b.textContent = mas || '___'; });
    $('dt-print').style.setProperty('--dt-fs', $('dt-fs').value);
    try { localStorage.setItem('kodesh-dapei', JSON.stringify({ s: cur, mas: mas, ded: ded })); } catch (e) {}
  }
  function pick(s) {
    cur = s;
    tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-sheet') === s ? 'true' : 'false'); });
    document.querySelectorAll('article.dt-sheet').forEach(function (a) { a.hidden = a.getAttribute('data-sheet') !== s; });
    document.querySelectorAll('[data-only]').forEach(function (f) { f.hidden = f.getAttribute('data-only') !== s; });
    upd();
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { pick(t.getAttribute('data-sheet')); }); });
  ['dt-title', 'dt-mas', 'dt-ded', 'dt-fs'].forEach(function (id) { $(id).addEventListener('input', upd); $(id).addEventListener('change', upd); });
  $('dt-printbtn').addEventListener('click', function () {
    if (window.toolUsed) window.toolUsed('dapei_tefila', { sheet: cur });
    window.print();
  });
  var start = (location.hash.match(/#(siyum|havdala|gomel)/) || [])[1];
  try { var s = JSON.parse(localStorage.getItem('kodesh-dapei') || '{}'); if (s.mas) $('dt-mas').value = s.mas; if (s.ded) $('dt-ded').value = s.ded; if (!start && NAMES[s.s]) start = s.s; } catch (e) {}
  pick(start || 'siyum');
})();
