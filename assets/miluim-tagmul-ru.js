/* Калькулятор милуим (/kelim/miluim/ru/): тагмуль за резервистскую службу.
   Правила – btl.gov.il, «סכום התגמול – מילואים» (с 01.01.2026):
   дневная ставка = брутто за 3 месяца / 90; минимум 328,76 ₪, максимум 1 730,33 ₪ в день;
   надбавка по остатку дней от деления на 7: 0, 0,4, 0,8, 1,2, 1,6, 2, 1 дня;
   полудневная служба – половина дневной ставки; самозанятому – ещё компенсация 25%.
   Всё считается в браузере, ничего не отправляется. */
(function (root, f) {
  var api = f();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.MILUIM_RU = api;
})(this, function () {
  var MIN = 328.76, MAX = 1730.33, EXTRA = [0, 0.4, 0.8, 1.2, 1.6, 2, 1];
  function extra(days) { days = Math.floor(days); return days > 0 ? EXTRA[days % 7] : 0; }
  function daily(type, monthly) {
    if (type === 'm') return MIN;
    var d = monthly * 3 / 90;
    return Math.min(MAX, Math.max(MIN, d));
  }
  function calc(type, monthly, days, half) {
    days = Math.max(0, Math.floor(days || 0)); half = Math.max(0, Math.floor(half || 0));
    var d = daily(type, monthly || 0), x = extra(days), paid = days + x;
    var tag = d * paid + d * 0.5 * half, comp = type === 'a' ? tag * 0.25 : 0;
    return { daily: d, extra: x, paid: paid, tagmul: tag, comp: comp, total: tag + comp,
             raw: type === 'm' ? MIN : (monthly || 0) / 30, min: MIN, max: MAX };
  }
  return { calc: calc, extra: extra, daily: daily, MIN: MIN, MAX: MAX };
});

(function () {
  if (typeof document === 'undefined') return;
  var box = document.getElementById('ml-calc'); if (!box) return;
  function $(i) { return document.getElementById(i); }
  function num(e) { var v = parseFloat(String(e.value).replace(/[\s,]/g, '').replace(/₪/g, '')); return isFinite(v) && v > 0 ? v : 0; }
  function sh(v) { return (Math.round(v * 100) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₪'; }
  function dn(v) { return (Math.round(v * 10) / 10).toLocaleString('ru-RU'); }
  var type = 's', used = false, KEY = 'kelim_miluim_ru';
  var LBL = { s: 'Средняя зарплата брутто в месяц за 3 месяца до службы (₪)', a: 'Месячный аванс (מקדמה) брутто: годовой доход / 12 (₪)', m: '' };
  function setType(t) {
    type = t;
    [].forEach.call(document.querySelectorAll('[data-type]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-type') === t ? 'true' : 'false'); });
    $('ml-inc-f').hidden = t === 'm';
    if (LBL[t]) $('ml-inc-l').textContent = LBL[t];
    run();
  }
  function run() {
    var inc = num($('ml-inc')), days = num($('ml-days')), half = num($('ml-half'));
    if (!days && !half) { $('ml-out').hidden = true; return; }
    if (type !== 'm' && !inc) { $('ml-out').hidden = true; return; }
    var r = MILUIM_RU.calc(type, inc, days, half);
    $('ml-total').textContent = sh(r.total);
    $('ml-daily').textContent = sh(r.daily);
    $('ml-paid').textContent = dn(r.paid);
    $('ml-extra').textContent = dn(r.extra);
    $('ml-halfv').textContent = Math.floor(half) ? Math.floor(half) + ' × ' + sh(r.daily / 2) : '—';
    $('ml-tag').textContent = sh(r.tagmul);
    $('ml-comp-r').hidden = type !== 'a'; $('ml-comp').textContent = sh(r.comp);
    var n = $('ml-note');
    if (type === 'm') { n.className = 'tr-ok'; n.textContent = 'Студент, неработающий или зарплата ниже минимума: расчёт по минимальной ставке ' + sh(r.min) + ' в день.'; }
    else if (r.raw < r.min) { n.className = 'tr-warn'; n.textContent = 'Ваш доход в день (' + sh(r.raw) + ') ниже минимума – Битуах леуми платит минимум ' + sh(r.min) + ' в день.'; }
    else if (r.raw > r.max) { n.className = 'tr-warn'; n.textContent = 'Ваш доход в день (' + sh(r.raw) + ') выше потолка – выплата ограничена максимумом ' + sh(r.max) + ' в день.'; }
    else { n.className = 'tr-ok'; n.textContent = 'Дневная ставка = зарплата за 3 месяца / 90 = ' + sh(r.daily) + '.'; }
    $('ml-out').hidden = false;
    if (!used && window.toolUsed) { used = true; try { toolUsed('miluim_ru', { how: type }); } catch (x) {} }
    try { localStorage.setItem(KEY, JSON.stringify({ t: type, i: $('ml-inc').value, d: $('ml-days').value, h: $('ml-half').value })); } catch (x) {}
  }
  try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { $('ml-inc').value = s.i || ''; $('ml-days').value = s.d || ''; $('ml-half').value = s.h || '0'; type = s.t || 's'; } } catch (x) {}
  ['ml-inc', 'ml-days', 'ml-half'].forEach(function (i) { $(i).addEventListener('input', run); });
  [].forEach.call(document.querySelectorAll('[data-type]'), function (b) { b.addEventListener('click', function () { setType(b.getAttribute('data-type')); }); });
  [].forEach.call(document.querySelectorAll('[data-set]'), function (b) {
    b.addEventListener('click', function () { $(b.getAttribute('data-set')).value = b.getAttribute('data-v'); run(); });
  });
  setType(type);
})();
