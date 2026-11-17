/* המרת יחידות: שני שדות שמתעדכנים זה מזה */
(function () {
  var el = document.getElementById('hm'); if (!el) return;
  var K = { inch: [function (x) { return x * 2.54; }, function (y) { return y / 2.54; }],
            pound: [function (x) { return x * 0.45359237; }, function (y) { return y / 0.45359237; }],
            temp: [function (x) { return (x - 32) * 5 / 9; }, function (y) { return y * 9 / 5 + 32; }] }[el.dataset.kind];
  var a = document.getElementById('hm-a'), b = document.getElementById('hm-b'), out = document.getElementById('hm-out');
  var ua = el.dataset.ua, ub = el.dataset.ub;
  function fmt(v) { if (!isFinite(v)) return ''; var r = Math.round(v * 100) / 100; return String(r); }
  function nice(v) { return (Math.round(v * 100) / 100).toLocaleString('he-IL', { maximumFractionDigits: 2 }); }
  function num(s) { s = String(s).replace(',', '.').trim(); return s === '' || s === '-' ? NaN : Number(s); }
  function say(x, y) { out.innerHTML = isFinite(x) && isFinite(y) ? '<b>' + nice(x) + ' ' + ua + ' = ' + nice(y) + ' ' + ub + '</b>' : '<span>כותבים מספר באחד השדות</span>'; }
  a.addEventListener('input', function () { var x = num(a.value), y = K[0](x); b.value = fmt(y); say(x, y); });
  b.addEventListener('input', function () { var y = num(b.value), x = K[1](y); a.value = fmt(x); say(x, y); });
  [].forEach.call(document.querySelectorAll('#hm-quick button'), function (q) {
    q.addEventListener('click', function () { a.value = q.dataset.v; a.dispatchEvent(new Event('input')); });
  });
  document.getElementById('hm-copy').addEventListener('click', function () {
    var t = out.textContent, btn = this; if (!navigator.clipboard || !b.value) return;
    navigator.clipboard.writeText(t).then(function () { btn.textContent = '✓ הועתק'; setTimeout(function () { btn.textContent = '📋 להעתיק את התוצאה'; }, 1500); });
  });
  a.dispatchEvent(new Event('input'));
})();
