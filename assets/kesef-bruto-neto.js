/* מחשבון שכר ברוטו נטו 2026 - הערכה בלבד. הכול מחושב בדפדפן. */
(function () {
  var g = document.getElementById('bn-g'); if (!g) return;
  function $(i) { return document.getElementById(i); }
  var BR = [[7010, .10], [10060, .14], [19000, .20], [25100, .31], [46690, .35], [60130, .47], [Infinity, .50]];
  var POINT = 242, BL_LOW = 7703, BL_MAX = 51910, BL_R1 = .0427, BL_R2 = .1217, BL1 = .0104, BL2 = .07, H1 = .0323, H2 = .0517;
  function num(e) { var v = parseFloat(String(e.value).replace(/,/g, '')); return isFinite(v) && v > 0 ? v : 0; }
  function sh(v) { return '₪' + Math.round(v).toLocaleString('he-IL'); }
  function tax(x) { var t = 0, prev = 0; for (var i = 0; i < BR.length; i++) { if (x > prev) t += (Math.min(x, BR[i][0]) - prev) * BR[i][1]; prev = BR[i][0]; } return t; }
  function run() {
    var gross = num($('bn-g')), pts = num($('bn-p')), pen = num($('bn-pen')) / 100, ks = num($('bn-ks')) / 100;
    if (!gross) { $('bn-out').hidden = true; return; }
    var base = Math.min(gross, BL_MAX), low = Math.min(base, BL_LOW), high = Math.max(0, base - BL_LOW);
    var bl = low * BL1 + high * BL2, he = low * H1 + high * H2;
    var penAmt = gross * pen, ksAmt = gross * ks;
    var penCredit = Math.min(penAmt, Math.min(gross, 9700) * .07) * .35;
    var t0 = tax(gross), t = Math.max(0, t0 - pts * POINT - penCredit);
    var net = gross - t - bl - he - penAmt - ksAmt;
    $('bn-net').textContent = sh(net);
    $('bn-pct').textContent = Math.round(net / gross * 100) + '% מהברוטו';
    $('bn-t').textContent = sh(t); $('bn-bl').textContent = sh(bl); $('bn-he').textContent = sh(he);
    $('bn-penv').textContent = sh(penAmt); $('bn-ksv').textContent = sh(ksAmt);
    $('bn-year').textContent = sh(net * 12);
    $('bn-out').hidden = false;
    try { localStorage.setItem('kelim_bruto_neto', JSON.stringify({ g: $('bn-g').value, p: $('bn-p').value, pen: $('bn-pen').value, ks: $('bn-ks').value })); } catch (e) {}
  }
  try { var s = JSON.parse(localStorage.getItem('kelim_bruto_neto') || 'null'); if (s) { $('bn-g').value = s.g; $('bn-p').value = s.p; $('bn-pen').value = s.pen; $('bn-ks').value = s.ks; } } catch (e) {}
  ['bn-g', 'bn-p', 'bn-pen', 'bn-ks'].forEach(function (i) { $(i).addEventListener('input', run); });
  [].forEach.call(document.querySelectorAll('#bn-pts button'), function (b) { b.addEventListener('click', function () { $('bn-p').value = b.dataset.v; run(); }); });
  [].forEach.call(document.querySelectorAll('#bn-quick button'), function (b) { b.addEventListener('click', function () { $('bn-g').value = b.dataset.v; run(); }); });
  run();
})();
