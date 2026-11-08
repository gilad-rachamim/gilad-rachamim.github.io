// T4 – כיבודים וסדר לאירוע ביחידה (כלי קודש). בחירת סוג האירוע ממלאת סדר וכיבודים לדוגמה,
// והרב משנה כרצונו. הדף עצמו נבנה ב-daf-print.js (נטען אחרי הקובץ הזה).
(function () {
  'use strict';
  var T = {
    siyum: ['סיום מסכת',
      'פתיחה ודברי ברכה\nסיום המסכת בידי הלומד\nהדרן וקדיש דרבנן\nדבר תורה\nסעודת מצווה וברכת המזון',
      'סיום המסכת – [שם]\nקדיש דרבנן – [שם]\nדבר תורה – [שם]\nדברי ברכה מהמפקד – [שם]\nזימון בברכת המזון – [שם]'],
    azkara: ['אזכרה',
      'התכנסות ודקת דומייה\nפרקי תהילים\nמשניות לפי אותיות השם\nדברים לזכרו\nאל מלא רחמים\nקדיש',
      'פרקי תהילים – [שם]\nמשניות – [שם]\nדברים לזכרו – [שם]\nדברים מהמשפחה – [שם]\nאל מלא רחמים – [שם]\nקדיש – [שם]'],
    sefer: ['הכנסת ספר תורה',
      'כתיבת האותיות האחרונות\nתהלוכה עם חופה, שירה וריקודים\nהכנסה להיכל ואמירת "אתה הראית"\nהקפות\nדברי ברכה\nסעודת מצווה',
      'כתיבת אות – [שם]\nנשיאת הספר בתהלוכה – [שם]\nהחזקת החופה – [שם]\nפתיחת ההיכל – [שם]\nהקפה ראשונה – [שם]\nדברי ברכה – [שם]'],
    mezuza: ['חנוכת בית כנסת וקביעת מזוזות',
      'קביעת מזוזה בברכה\nמזמור שיר חנוכת הבית (תהילים ל)\nדברי ברכה\nכיבוד קל',
      'קביעת המזוזה – [שם]\nמזמור שיר חנוכת הבית – [שם]\nדברי ברכה – [שם]\nתפילה לשלום החיילים – [שם]'],
    other: ['אירוע ביחידה',
      'פתיחה\nדבר תורה\nדברי ברכה\nתפילה לשלום החיילים\nכיבוד',
      'פתיחה – [שם]\nדבר תורה – [שם]\nדברי ברכה – [שם]\nתפילה לשלום החיילים – [שם]']
  };
  var form = document.querySelector('form[data-key]');
  if (!form) return;
  var type = form.elements.type, title = form.elements.title, order = form.elements.order, kib = form.elements.kib;
  var saved = {}; try { saved = JSON.parse(localStorage.getItem(form.dataset.key) || '{}') || {}; } catch (e) {}
  function isTpl(el, i) { var v = el.value.trim(); return !v || Object.keys(T).some(function (k) { return T[k][i].trim() === v; }); }
  function fill(force) {
    var t = T[type.value] || T.other;
    if (force || isTpl(title, 0)) title.value = t[0];
    if (force || isTpl(order, 1)) order.value = t[1];
    if (force || isTpl(kib, 2)) kib.value = t[2];
  }
  if (saved.type) type.value = saved.type;
  if (!saved.order) fill(true);
  type.addEventListener('change', function () { fill(false); form.dispatchEvent(new Event('input')); });
  var r = document.getElementById('kb-reset');
  if (r) r.addEventListener('click', function () { fill(true); form.dispatchEvent(new Event('input')); });
})();
