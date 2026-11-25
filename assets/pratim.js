// "הפרטים שהמוהל צריך": בונה הודעת ווטסאפ מסודרת. שום דבר לא נשמר ולא נשלח לשרת,
// והפרטים מופיעים רק בקישור wa.me שנפתח אצל ההורה (לא בכתובת הדף ולא ב-href).
(function () {
  var form = document.getElementById('pt-form');
  if (!form) return;
  var calc = document.getElementById('pt-calc');
  var err = document.getElementById('pt-err');
  var moed = document.getElementById('pt-moed');
  var bw = document.getElementById('pt-bw'), lw = document.getElementById('pt-lw');
  // שפת הדף (he/ru/en): בעברית הכול נשאר בדיוק כמו קודם
  var L = (document.documentElement.getAttribute('lang') || 'he').slice(0, 2);
  var T = function (d) { return d[L] || d.he; };
  // תוויות השדות (data-d נשאר בעברית ב-HTML) בשפת הדף
  var KEYS = {
    'תאריך לידה': { ru: 'Дата родов', en: 'Date of birth' },
    'שעת לידה': { ru: 'Время родов', en: 'Time of birth' },
    'סמוך לשקיעה': { ru: 'Близко к закату', en: 'Close to sunset' },
    'סוג לידה': { ru: 'Тип родов', en: 'Type of birth' },
    'שבוע לידה': { ru: 'Неделя родов', en: 'Week of birth' },
    'משקל לידה': { ru: 'Вес при рождении', en: 'Birth weight' },
    'משקל אחרון': { ru: 'Последний вес', en: 'Latest weight' },
    'אכילה': { ru: 'Питание', en: 'Feeding' },
    'צהבת': { ru: 'Желтуха', en: 'Jaundice' },
    'הערות': { ru: 'Заметки', en: 'Notes' },
    'עיר': { ru: 'Город', en: 'City' },
    'שם': { ru: 'Имя', en: 'Name' }
  };
  function key(k) { return KEYS[k] ? T({ he: k, ru: KEYS[k].ru, en: KEYS[k].en }) : k; }
  function dec(n) { var t = (Math.round(n * 10) / 10).toString(); return L === 'en' ? t : t.replace('.', ','); }

  function num(el) { var n = parseFloat(el.value); return isFinite(n) && n > 0 ? n : 0; }

  function weightText() {
    var a = num(bw), b = num(lw);
    if (!a || !b) return '';
    var pct = (a - b) * 100 / a;
    if (pct <= 0) return T({ he: 'המשקל האחרון שווה למשקל הלידה או גבוה ממנו. מצוין.', ru: 'Последний вес равен весу при рождении или больше него. Отлично.', en: 'The latest weight is equal to or above the birth weight. Excellent.' });
    var p = dec(pct);
    var s = T({ he: 'ירידה של ' + p + '% מאז הלידה. ירידה של עד כ-7% בימים הראשונים רגילה בדרך כלל; טיפת חלב והרופא עוקבים אחריו.', ru: 'Снижение на ' + p + '% с момента рождения. Снижение примерно до 7% в первые дни обычно нормально; за весом следят врач и детская консультация (Типат халав).', en: 'A drop of ' + p + '% since birth. A drop of up to about 7% in the first days is usually normal; the doctor and the well-baby clinic (Tipat Chalav) follow it.' });
    if (pct > 7) s = T({ he: 'ירידה של ' + p + '% מאז הלידה. אין צורך להילחץ: את המשקל עוקבים הרופא וטיפת חלב, ואשמח לראות את המכתב ולהתייעץ איתם.', ru: 'Снижение на ' + p + '% с момента рождения. Не волнуйтесь: за весом следят врач и Типат халав, а я с радостью посмотрю выписку и посоветуюсь с ними.', en: 'A drop of ' + p + '% since birth. No need to worry: the doctor and Tipat Chalav follow the weight, and I will gladly look at the letter and consult with them.' });
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
      if (el.id === 'pt-bw' || el.id === 'pt-lw') v += T({ he: ' גרם', ru: ' г', en: ' g' });
      lines.push(key(k) + ': ' + v);
    });
    var w = weightText();
    if (w && num(bw) && num(lw)) {
      var pct = (num(bw) - num(lw)) * 100 / num(bw);
      if (pct > 0) lines.push(T({ he: 'ירידת משקל', ru: 'Снижение веса', en: 'Weight drop' }) + ': ' + dec(pct) + '%');
    }
    return { count: lines.length, text: T({ he: 'שלום גילעד 🙂 אלה הפרטים לפני הברית:', ru: 'Здравствуйте, Гилад 🙂 Вот данные перед брит-милой:', en: 'Hi Gilad 🙂 Here are the details before the brit:' }) + '\n' + lines.join('\n') };
  }

  form.addEventListener('input', showCalc);
  form.addEventListener('change', showCalc);

  document.getElementById('pt-send').addEventListener('click', function () {
    var m = build();
    this.setAttribute('data-ready', m.count ? '1' : '0');
    this.setAttribute('data-count', String(m.count));
    if (!m.count) { err.textContent = T({ he: 'עדיין לא מילאתם שום פרט.', ru: 'Вы пока не заполнили ни одного поля.', en: "You haven't filled in any details yet." }); return; }
    err.textContent = '';
    var url = 'https://wa.me/972584049049?text=' + encodeURIComponent(m.text);
    var w = window.open(url, '_blank');
    if (w) w.opener = null; else location.href = url;
  });
  showCalc();
})();
