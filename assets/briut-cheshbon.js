/* מחשבון BMI ומחשבון קלוריות – הכלים של גילעד רחמים. הערכה בלבד */
(function () {
  function $(id) { return document.getElementById(id); }
  function num(id) { var v = parseFloat(String($(id).value).replace(',', '.')); return isFinite(v) ? v : NaN; }
  function used(t, how) { try { window.toolUsed && window.toolUsed(t, { how: how }); } catch (e) {} }
  function keep(k, ids) {
    try { var o = JSON.parse(localStorage.getItem(k) || 'null'); if (o) ids.forEach(function (i) { if (o[i] != null && $(i)) $(i).value = o[i]; }); } catch (e) {}
    return function () { try { var o = {}; ids.forEach(function (i) { o[i] = $(i).value; }); localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} };
  }
  /* BMI */
  if ($('bmi-go')) {
    var save1 = keep('briut-bmi', ['bmi-h', 'bmi-w']), n1 = 0;
    function bmi() {
      var h = num('bmi-h'), w = num('bmi-w'), out = $('bmi-res');
      if (!(h > 80 && h < 250 && w > 20 && w < 350)) { out.hidden = false; out.innerHTML = '<p>כותבים גובה בסנטימטרים (למשל 170) ומשקל בקילו (למשל 70).</p>'; return; }
      var m = h / 100, b = w / (m * m), cat, cls;
      if (b < 18.5) { cat = 'תת-משקל'; cls = 'lo'; } else if (b < 25) { cat = 'משקל תקין'; cls = 'ok'; } else if (b < 30) { cat = 'עודף משקל'; cls = 'mid'; } else { cat = 'השמנה'; cls = 'hi'; }
      var lo = 18.5 * m * m, hi = 24.9 * m * m, pos = Math.max(0, Math.min(100, (b - 15) / (40 - 15) * 100));
      out.hidden = false;
      out.innerHTML = '<h3>ה-BMI שלכם</h3><p class="big">' + b.toFixed(1) + ' <span class="bm-cat ' + cls + '">' + cat + '</span></p>' +
        '<div class="bm-scale" aria-hidden="true"><i style="inset-inline-start:' + pos + '%"></i></div>' +
        '<div class="bm-legend" aria-hidden="true"><span>תת-משקל</span><span>תקין</span><span>עודף</span><span>השמנה</span></div>' +
        '<ul><li>בגובה ' + h + ' ס"מ, טווח המשקל שנחשב תקין הוא בערך <b>' + Math.round(lo) + '–' + Math.round(hi) + ' ק"ג</b>.</li>' +
        '<li>BMI מתחת ל-18.5 = תת-משקל · 18.5 עד 24.9 = תקין · 25 עד 29.9 = עודף משקל · 30 ומעלה = השמנה.</li></ul>';
      save1(); if (n1++ === 0) used('briut_bmi', 'calc');
    }
    $('bmi-go').addEventListener('click', bmi);
    ['bmi-h', 'bmi-w'].forEach(function (i) { $(i).addEventListener('keydown', function (e) { if (e.key === 'Enter') bmi(); }); });
    if (!$('bmi-h').value) { $('bmi-h').value = 170; $('bmi-w').value = 70; }
    bmi(); n1 = 0;
  }
  /* קלוריות: נוסחת מיפלין-סנט ג'ור */
  if ($('kl-go')) {
    var save2 = keep('briut-kaloriot', ['kl-sex', 'kl-age', 'kl-h', 'kl-w', 'kl-act']), n2 = 0;
    function kal() {
      var sex = $('kl-sex').value, a = num('kl-age'), h = num('kl-h'), w = num('kl-w'), act = parseFloat($('kl-act').value), out = $('kl-res');
      if (!(a >= 18 && a < 100 && h > 120 && h < 230 && w > 35 && w < 300)) { out.hidden = false; out.innerHTML = '<p>המחשבון למבוגרים מגיל 18. כותבים גיל, גובה בס"מ ומשקל בק"ג.</p>'; return; }
      var bmr = 10 * w + 6.25 * h - 5 * a + (sex === 'f' ? -161 : 5), tdee = bmr * act, r = function (x) { return Math.round(x / 10) * 10; };
      var minK = sex === 'f' ? 1200 : 1500, lose = Math.max(minK, tdee - 500);
      out.hidden = false;
      out.innerHTML = '<h3>כמה קלוריות ביום</h3><p class="big">' + r(tdee).toLocaleString('he-IL') + ' <span class="g">קלוריות לשמירה על המשקל</span></p>' +
        '<ul><li>לירידה הדרגתית במשקל (בערך חצי קילו בשבוע): <b>' + r(lose).toLocaleString('he-IL') + '</b> ביום.</li>' +
        '<li>לעלייה הדרגתית במשקל: <b>' + r(tdee + 300).toLocaleString('he-IL') + '</b> ביום.</li>' +
        '<li>הגוף שורף במנוחה מלאה (BMR) בערך <b>' + r(bmr).toLocaleString('he-IL') + '</b> ביום.</li></ul>';
      save2(); if (n2++ === 0) used('briut_kaloriot', 'calc');
    }
    $('kl-go').addEventListener('click', kal);
    if (!$('kl-age').value) { $('kl-age').value = 35; $('kl-h').value = 170; $('kl-w').value = 70; }
    kal(); n2 = 0;
  }
})();
