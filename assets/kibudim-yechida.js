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
  var L = (document.documentElement.getAttribute('lang') || 'he').slice(0, 2);
  var TL = {
    ru: {
      siyum: ['Сиюм масехет',
        'Открытие и слова приветствия\nСиюм трактата тем, кто его изучал\nХадран и кадиш дерабанан\nСлово Торы\nТрапеза по случаю заповеди и благословение после еды',
        'Сиюм трактата – [имя]\nКадиш дерабанан – [имя]\nСлово Торы – [имя]\nСлова приветствия от командира – [имя]\nЗимун в благословении после еды – [имя]'],
      azkara: ['Азкара',
        'Сбор и минута молчания\nПсалмы\nМишнайот по буквам имени\nСлова в память о нём\nЭль мале рахамим\nКадиш',
        'Псалмы – [имя]\nМишнайот – [имя]\nСлова в память о нём – [имя]\nСлова от семьи – [имя]\nЭль мале рахамим – [имя]\nКадиш – [имя]'],
      sefer: ['Внесение свитка Торы',
        'Дописывание последних букв\nШествие с хупой, песнями и танцами\nВнесение в ковчег и чтение «Ата хораета»\nХакафот\nСлова приветствия\nТрапеза по случаю заповеди',
        'Дописывание буквы – [имя]\nНесение свитка в шествии – [имя]\nДержание хупы – [имя]\nОткрытие ковчега – [имя]\nПервая хакафа – [имя]\nСлова приветствия – [имя]'],
      mezuza: ['Освящение синагоги и установка мезуз',
        'Установка мезузы с благословением\nПсалом 30 (песнь на освящение дома)\nСлова приветствия\nНебольшое угощение',
        'Установка мезузы – [имя]\nПсалом 30 – [имя]\nСлова приветствия – [имя]\nМолитва о мире для солдат – [имя]'],
      other: ['Событие в части',
        'Открытие\nСлово Торы\nСлова приветствия\nМолитва о мире для солдат\nУгощение',
        'Открытие – [имя]\nСлово Торы – [имя]\nСлова приветствия – [имя]\nМолитва о мире для солдат – [имя]']
    },
    en: {
      siyum: ['Siyum (completing a tractate)',
        'Opening and words of welcome\nThe learner completes the tractate\nHadran and Kaddish d\'Rabbanan\nA short Torah talk\nFestive meal and Birkat Hamazon',
        'Completing the tractate – [name]\nKaddish d\'Rabbanan – [name]\nTorah talk – [name]\nWords from the commander – [name]\nLeading the zimun at Birkat Hamazon – [name]'],
      azkara: ['Azkara (memorial service)',
        'Gathering and a moment of silence\nPsalms\nMishnayot by the letters of the name\nWords in his memory\nEl Maleh Rachamim\nKaddish',
        'Psalms – [name]\nMishnayot – [name]\nWords in his memory – [name]\nWords from the family – [name]\nEl Maleh Rachamim – [name]\nKaddish – [name]'],
      sefer: ['Torah scroll dedication',
        'Writing the last letters\nProcession with a canopy, singing and dancing\nBringing it into the ark and saying "Atah Hareita"\nHakafot (circling the platform)\nWords of blessing\nFestive meal',
        'Writing a letter – [name]\nCarrying the scroll in the procession – [name]\nHolding the canopy – [name]\nOpening the ark – [name]\nFirst hakafa – [name]\nWords of blessing – [name]'],
      mezuza: ['Synagogue dedication and mezuzot',
        'Affixing a mezuzah with a blessing\nPsalm 30 (a song for the dedication of the house)\nWords of blessing\nLight refreshments',
        'Affixing the mezuzah – [name]\nPsalm 30 – [name]\nWords of blessing – [name]\nPrayer for the safety of the soldiers – [name]'],
      other: ['Unit event',
        'Opening\nTorah talk\nWords of blessing\nPrayer for the safety of the soldiers\nRefreshments',
        'Opening – [name]\nTorah talk – [name]\nWords of blessing – [name]\nPrayer for the safety of the soldiers – [name]']
    }
  };
  if (TL[L]) T = TL[L];
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
