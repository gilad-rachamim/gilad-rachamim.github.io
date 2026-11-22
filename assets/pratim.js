// "הפרטים שהמוהל צריך": בונה הודעת ווטסאפ מסודרת. שום דבר לא נשמר ולא נשלח לשרת,
// והפרטים מופיעים רק בקישור wa.me שנפתח אצל ההורה (לא בכתובת הדף ולא ב-href).
(function () {
  var form = document.getElementById('pt-form');
  if (!form) return;
  var calc = document.getElementById('pt-calc');
  var err = document.getElementById('pt-err');
  var moed = document.getElementById('pt-moed');
  var bw = document.getElementById('pt-bw'), lw = document.getElementById('pt-lw');

  function num(el) { var n = parseFloat(el.value); return isFinite(n) && n > 0 ? n : 0; }

  function weightText() {
    var a = num(bw), b = num(lw);
    if (!a || !b) return '';
    var pct = (a - b) * 100 / a;
    if (pct <= 0) return 'המשקל האחרון שווה למשקל הלידה או גבוה ממנו. מצוין.';
    var p = (Math.round(pct * 10) / 10).toString().replace('.', ',');
    var s = 'ירידה של ' + p + '% מאז הלידה. ירידה של עד כ-7% בימים הראשונים רגילה בדרך כלל; טיפת חלב והרופא עוקבים אחריו.';
    if (pct > 7) s = 'ירידה של ' + p + '% מאז הלידה. אין צורך להילחץ: את המשקל עוקבים הרופא וטיפת חלב, ואשמח לראות את המכתב ולהתייעץ איתם.';
    return s;
  }

  function showCalc() {
    calc.textContent = weightText();
    moed.hidden = !document.getElementById('pt-date').value;
  }

  function fmtDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    return m ? m[3] + '.' + m[2] + '.' + m[1] : v;
  }

  function build() {
    var lines = [], seen = {};
    form.querySelectorAll('[data-d]').forEach(function (el) {
      var k = el.getAttribute('data-d'), v = '';
      if (el.type === 'radio') { if (!el.checked) return; v = el.value; }
      else v = (el.value || '').trim();
      if (!v || seen[k]) return;
      seen[k] = 1;
      if (el.type === 'date') v = fmtDate(v);
      if (el.id === 'pt-bw' || el.id === 'pt-lw') v += ' גרם';
      lines.push(k + ': ' + v);
    });
    var w = weightText();
    if (w && num(bw) && num(lw)) {
      var pct = (num(bw) - num(lw)) * 100 / num(bw);
      if (pct > 0) lines.push('ירידת משקל: ' + (Math.round(pct * 10) / 10).toString().replace('.', ',') + '%');
    }
    return { count: lines.length, text: 'שלום גילעד 🙂 אלה הפרטים לפני הברית:\n' + lines.join('\n') };
  }

  form.addEventListener('input', showCalc);
  form.addEventListener('change', showCalc);

  document.getElementById('pt-send').addEventListener('click', function () {
    var m = build();
    this.setAttribute('data-ready', m.count ? '1' : '0');
    this.setAttribute('data-count', String(m.count));
    if (!m.count) { err.textContent = 'עדיין לא מילאתם שום פרט.'; return; }
    err.textContent = '';
    var url = 'https://wa.me/972584049049?text=' + encodeURIComponent(m.text);
    var w = window.open(url, '_blank');
    if (w) w.opener = null; else location.href = url;
  });
  showCalc();
})();
