/* Калькулятор зарплаты Израиль 2026 (/kesef/bruto-neto/ru/): брутто↔нетто, по часам, стоимость для работодателя.
   Расчёт удержаний – TLUSH_RU.calc из /assets/kesef-tlush-ru.js (тот же, что в /kesef/bruto-neto/).
   Работодатель: Битуах леуми 4,51% до 7 703 ₪ и 7,6% выше, до 51 910 ₪ (btl.gov.il); пенсия 6,5% + пицуим 6%.
   Всё считается в браузере, ничего не отправляется. */
(function (root, f) {
  var api = f(root.TLUSH_RU || (typeof require === 'function' ? require('./kesef-tlush-ru.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api; else root.BRUTO_RU = api;
})(this, function (T) {
  var BL_LOW = 7703, BL_MAX = 51910;
  function employer(gross, penOn) {
    var base = Math.min(gross, BL_MAX), low = Math.min(base, BL_LOW), high = Math.max(0, base - BL_LOW);
    var bl = low * .0451 + high * .076, pen = penOn ? gross * .065 : 0, pit = penOn ? gross * .06 : 0;
    return { bl: bl, pen: pen, pit: pit, total: gross + bl + pen + pit };
  }
  function fromNet(net, pts, penPct, ksPct) {
    var lo = net, hi = net * 3 + 1000;
    for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (T.calc(mid, pts, penPct, ksPct, 100).net < net) lo = mid; else hi = mid; }
    return hi;
  }
  return { employer: employer, fromNet: fromNet, calc: T.calc };
});

(function () {
  if (typeof document === 'undefined') return;
  var box = document.getElementById('br-calc'); if (!box) return;
  function $(i) { return document.getElementById(i); }
  function num(e) { var v = parseFloat(String(e.value).replace(/[\s,]/g, '').replace(/₪/g, '')); return isFinite(v) && v > 0 ? v : 0; }
  function sh(v) { return Math.round(v).toLocaleString('ru-RU') + ' ₪'; }
  var mode = 'g', used = false, KEY = 'kelim_bruto_ru';
  var LBL = { g: 'Брутто в месяц (₪)', n: 'Нетто на руки в месяц (₪)', h: 'Ставка за час (₪)' };
  function setMode(m) {
    mode = m;
    [].forEach.call(document.querySelectorAll('[data-mode]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === m ? 'true' : 'false'); });
    $('br-v-l').textContent = LBL[m];
    $('br-hrs-f').hidden = m !== 'h';
    run();
  }
  function run() {
    var v = num($('br-v')), pts = num($('br-p')), pen = num($('br-pen')), ks = num($('br-ks'));
    if (!v) { $('br-out').hidden = true; return; }
    var gross = mode === 'n' ? BRUTO_RU.fromNet(v, pts, pen, ks) : mode === 'h' ? v * (num($('br-hrs')) || 182) : v;
    var r = BRUTO_RU.calc(gross, pts, pen, ks, 100), e = BRUTO_RU.employer(gross, pen > 0);
    $('br-gross').textContent = sh(gross); $('br-net').textContent = sh(r.net);
    $('br-pct').textContent = Math.round(r.net / gross * 100) + '% от брутто остаётся на руки';
    $('br-t').textContent = sh(r.tax); $('br-bl').textContent = sh(r.bl); $('br-he').textContent = sh(r.he);
    $('br-penv').textContent = sh(r.pen); $('br-ksv').textContent = sh(r.ks);
    $('br-ny').textContent = sh(r.net * 12); $('br-gy').textContent = sh(gross * 12);
    $('br-ebl').textContent = sh(e.bl); $('br-epen').textContent = sh(e.pen); $('br-epit').textContent = sh(e.pit); $('br-etot').textContent = sh(e.total);
    var hrs = num($('br-hrs')) || 182; $('br-hr').textContent = (Math.round(r.net / hrs * 100) / 100).toLocaleString('ru-RU') + ' ₪';
    var m = $('br-min'), mw = 6443.85;
    if (gross < mw - 0.5) { m.className = 'tr-warn'; m.textContent = '⚠️ Брутто ниже минимальной зарплаты за полную ставку (' + sh(mw) + '). При неполной ставке минимум меньше пропорционально.'; }
    else { m.className = 'tr-ok'; m.textContent = '✓ Брутто не ниже минимальной зарплаты за полную ставку (' + sh(mw) + ').'; }
    $('br-out').hidden = false;
    if (!used && window.toolUsed) { used = true; try { toolUsed('bruto_ru', { how: mode }); } catch (x) {} }
    try { localStorage.setItem(KEY, JSON.stringify({ m: mode, v: $('br-v').value, p: $('br-p').value, pen: $('br-pen').value, ks: $('br-ks').value, h: $('br-hrs').value })); } catch (x) {}
  }
  try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { $('br-v').value = s.v || ''; $('br-p').value = s.p || '2.25'; $('br-pen').value = s.pen || '6'; $('br-ks').value = s.ks || '0'; $('br-hrs').value = s.h || '182'; mode = s.m || 'g'; } } catch (x) {}
  ['br-v', 'br-p', 'br-pen', 'br-ks', 'br-hrs'].forEach(function (i) { $(i).addEventListener('input', run); });
  [].forEach.call(document.querySelectorAll('[data-mode]'), function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
  [].forEach.call(document.querySelectorAll('[data-set]'), function (b) {
    b.addEventListener('click', function () { if (b.hasAttribute('data-m')) setMode(b.getAttribute('data-m')); $(b.getAttribute('data-set')).value = b.getAttribute('data-v'); run(); });
  });
  setMode(mode);
})();
