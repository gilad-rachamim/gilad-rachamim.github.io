/* מחשבון שעות עבודה: כניסה, יציאה, הפסקה, שעות נוספות */
(function () {
  var box = document.getElementById('sa-rows'); if (!box) return;
  function $(i) { return document.getElementById(i); }
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function row(i, a, b, p) {
    var d = document.createElement('div'); d.className = 'sa-row';
    d.innerHTML = '<b>' + DAYS[i] + '</b><label>כניסה<input type="time" class="sa-in" value="' + (a || '') + '"></label><label>יציאה<input type="time" class="sa-o" value="' + (b || '') + '"></label><label>הפסקה (דק\')<input type="number" class="sa-p" inputmode="numeric" min="0" value="' + (p || 0) + '"></label><span class="sa-h" aria-live="polite">–</span>';
    box.appendChild(d);
  }
  var saved = null; try { saved = JSON.parse(localStorage.getItem('kelim_shaot_avoda') || 'null'); } catch (e) {}
  for (var i = 0; i < 7; i++) { var s = saved && saved.r && saved.r[i]; row(i, s ? s[0] : (i < 5 && !saved ? '08:00' : ''), s ? s[1] : (i < 5 && !saved ? '17:00' : ''), s ? s[2] : (i < 5 && !saved ? 30 : 0)); }
  if (saved) { $('sa-std').value = saved.std || 8.6; $('sa-w').value = saved.w || ''; }
  function mins(v) { if (!v) return null; var p = v.split(':'); return +p[0] * 60 + +p[1]; }
  function hm(m) { m = Math.round(m); return Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2); }
  function run() {
    var std = (parseFloat($('sa-std').value) || 8.6) * 60, wage = parseFloat($('sa-w').value) || 0;
    var tot = 0, reg = 0, o125 = 0, o150 = 0, days = 0, keep = [];
    [].forEach.call(box.children, function (d) {
      var a = mins(d.querySelector('.sa-in').value), b = mins(d.querySelector('.sa-o').value), p = +d.querySelector('.sa-p').value || 0, out = d.querySelector('.sa-h');
      keep.push([d.querySelector('.sa-in').value, d.querySelector('.sa-o').value, p]);
      if (a === null || b === null) { out.textContent = '–'; return; }
      var m = b - a; if (m < 0) m += 1440; m = Math.max(0, m - p);
      out.textContent = hm(m) + ' שעות'; tot += m; days++;
      var r = Math.min(m, std), ex = Math.max(0, m - std), e1 = Math.min(ex, 120), e2 = Math.max(0, ex - 120);
      reg += r; o125 += e1; o150 += e2;
    });
    $('sa-tot').textContent = hm(tot); $('sa-dec').textContent = (tot / 60).toFixed(2);
    $('sa-reg').textContent = hm(reg); $('sa-125').textContent = hm(o125); $('sa-150').textContent = hm(o150); $('sa-days').textContent = days;
    var pay = wage * (reg / 60 + o125 / 60 * 1.25 + o150 / 60 * 1.5);
    $('sa-payrow').hidden = !wage; $('sa-pay').textContent = '₪' + pay.toLocaleString('he-IL', { maximumFractionDigits: 2 });
    try { localStorage.setItem('kelim_shaot_avoda', JSON.stringify({ r: keep, std: $('sa-std').value, w: $('sa-w').value })); } catch (e) {}
  }
  box.addEventListener('input', run); $('sa-std').addEventListener('input', run); $('sa-w').addEventListener('input', run);
  $('sa-clear').addEventListener('click', function () {
    [].forEach.call(box.querySelectorAll('input'), function (x) { x.value = x.type === 'number' ? 0 : ''; }); run();
  });
  run();
})();
