/* Тлуш маскорет 2026 (/kesef/tlush/ru/) – калькулятор брутто→нетто и расшифровка строк тлуша.
   Ставки: те же, что в /kesef/bruto-neto/ (Битуах леуми – btl.gov.il, 01.01.2026; балл – gov.il, 242 ₪).
   Всё считается в браузере, ничего не отправляется. */
(function (root, f) {
  var api = f();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.TLUSH_RU = api;
})(this, function () {
  var BR = [[7010, .10], [10060, .14], [19000, .20], [25100, .31], [46690, .35], [60130, .47], [Infinity, .50]];
  var POINT = 242, BL_LOW = 7703, BL_MAX = 51910, BL1 = .0104, BL2 = .07, H1 = .0323, H2 = .0517, MIN_WAGE = 6443.85;
  function tax(x) { var t = 0, prev = 0; for (var i = 0; i < BR.length; i++) { if (x > prev) t += (Math.min(x, BR[i][0]) - prev) * BR[i][1]; prev = BR[i][0]; } return t; }
  function calc(gross, pts, penPct, ksPct, jobPct) {
    var base = Math.min(gross, BL_MAX), low = Math.min(base, BL_LOW), high = Math.max(0, base - BL_LOW);
    var bl = low * BL1 + high * BL2, he = low * H1 + high * H2;
    var pen = gross * penPct / 100, ks = gross * ksPct / 100;
    var penCredit = Math.min(pen, Math.min(gross, 9700) * .07) * .35;
    var t0 = tax(gross), t = Math.max(0, t0 - pts * POINT - penCredit);
    var net = gross - t - bl - he - pen - ks;
    var minFor = MIN_WAGE * (jobPct || 100) / 100;
    return { gross: gross, tax: t, taxBefore: t0, credit: Math.min(t0, pts * POINT), bl: bl, he: he, pen: pen, ks: ks, net: net, year: net * 12, minFor: minFor, belowMin: gross < minFor - 0.5 };
  }
  return { calc: calc, MIN_WAGE: MIN_WAGE, POINT: POINT };
});

(function () {
  if (typeof document === 'undefined') return;
  var g = document.getElementById('tr-g'); if (!g) return;
  function $(i) { return document.getElementById(i); }
  function num(e) { var v = parseFloat(String(e.value).replace(/[\s,]/g, '').replace(/₪/g, '')); return isFinite(v) && v > 0 ? v : 0; }
  function sh(v) { return Math.round(v).toLocaleString('ru-RU') + ' ₪'; }
  var used = false, KEY = 'kelim_tlush_ru';
  function run() {
    var gross = num(g), pts = num($('tr-p')), pen = num($('tr-pen')), ks = num($('tr-ks')), job = num($('tr-job')) || 100;
    if (!gross) { $('tr-out').hidden = true; return; }
    var r = TLUSH_RU.calc(gross, pts, pen, ks, job);
    $('tr-net').textContent = sh(r.net);
    $('tr-pct').textContent = Math.round(r.net / gross * 100) + '% от брутто';
    $('tr-t').textContent = sh(r.tax); $('tr-cr').textContent = '−' + sh(r.credit);
    $('tr-bl').textContent = sh(r.bl); $('tr-he').textContent = sh(r.he);
    $('tr-penv').textContent = sh(r.pen); $('tr-ksv').textContent = sh(r.ks);
    $('tr-year').textContent = sh(r.year);
    var m = $('tr-min');
    if (r.belowMin) { m.className = 'tr-warn'; m.textContent = '⚠️ Брутто ниже минимальной зарплаты для ставки ' + job + '% (' + sh(r.minFor) + '). Если это полный месяц работы – стоит спросить работодателя.'; }
    else { m.className = 'tr-ok'; m.textContent = '✓ Брутто не ниже минимальной зарплаты для ставки ' + job + '% (' + sh(r.minFor) + ').'; }
    $('tr-out').hidden = false;
    if (!used && window.toolUsed) { used = true; try { toolUsed('tlush_ru', { how: 'calc' }); } catch (e) {} }
    try { localStorage.setItem(KEY, JSON.stringify({ g: g.value, p: $('tr-p').value, pen: $('tr-pen').value, ks: $('tr-ks').value, job: $('tr-job').value })); } catch (e) {}
  }
  try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { g.value = s.g || ''; $('tr-p').value = s.p || '2.25'; $('tr-pen').value = s.pen || '6'; $('tr-ks').value = s.ks || '0'; $('tr-job').value = s.job || '100'; } } catch (e) {}
  ['tr-g', 'tr-p', 'tr-pen', 'tr-ks', 'tr-job'].forEach(function (i) { $(i).addEventListener('input', run); });
  [].forEach.call(document.querySelectorAll('[data-set]'), function (b) {
    b.addEventListener('click', function () { $(b.getAttribute('data-set')).value = b.getAttribute('data-v'); run(); });
  });
  run();

  /* Расшифровка строк: поиск по ивриту, транслитерации и русскому */
  var q = $('tr-q'), rows = [].slice.call(document.querySelectorAll('#tr-dict .tr-term')), cnt = $('tr-cnt');
  function norm(s) { return String(s || '').toLowerCase().replace(/[֑-ׇ]/g, '').replace(/ё/g, 'е').replace(/["'״׳-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  rows.forEach(function (r) { r._t = norm(r.textContent); });
  function filt() {
    var v = norm(q.value), n = 0;
    rows.forEach(function (r) { var ok = !v || r._t.indexOf(v) >= 0; r.hidden = !ok; if (ok) n++; });
    cnt.textContent = v ? ('Найдено строк: ' + n) : ('Всего строк в словаре: ' + rows.length);
    if (v && !used && window.toolUsed) { used = true; try { toolUsed('tlush_ru', { how: 'dict' }); } catch (e) {} }
  }
  if (q) { q.addEventListener('input', filt); filt(); }
})();
