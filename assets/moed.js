// מחשבון מועד הברית – גילעד רחמים המוהל
// בלי ספריות: תאריך עברי דרך Intl (מובנה בדפדפן), שקיעה בירושלים לפי נוסחת NOAA.
(function () {
  'use strict';
  var L = (document.documentElement.getAttribute('lang') || 'he').slice(0, 2);
  var T = function (d) { return d[L] || d.he; };
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var DAYS_I = {
    ru: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
    ruAcc: ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  };
  // שם היום לתצוגה: בעברית "יום X" כמו תמיד; ברוסית acc = יחסה למשפט "на ..."
  function dayW(d, acc, cap) {
    var i = d.getDay();
    if (L === 'ru') { var s = (acc ? DAYS_I.ruAcc : DAYS_I.ru)[i]; return cap ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
    if (L === 'en') return DAYS_I.en[i];
    return 'יום ' + DAYS[i];
  }
  // חודש עברי בתעתיק, לרוסית ולאנגלית
  var MONTHS_T = {
    ru: { tishri: 'тишрея', tishrei: 'тишрея', heshvan: 'хешвана', cheshvan: 'хешвана', kislev: 'кислева', tevet: 'тевета', shevat: 'швата', 'adar i': 'адара I', 'adar ii': 'адара II', adar: 'адара', nisan: 'нисана', iyar: 'ияра', sivan: 'сивана', tamuz: 'тамуза', av: 'ава', elul: 'элуля' },
    en: { tishri: 'Tishrei', tishrei: 'Tishrei', heshvan: 'Cheshvan', cheshvan: 'Cheshvan', kislev: 'Kislev', tevet: 'Tevet', shevat: 'Shevat', 'adar i': 'Adar I', 'adar ii': 'Adar II', adar: 'Adar', nisan: 'Nisan', iyar: 'Iyar', sivan: 'Sivan', tamuz: 'Tammuz', av: 'Av', elul: 'Elul' }
  };
  var HOL = {
    'ראש השנה': ['Рош а-Шана', 'Rosh Hashanah'], 'יום הכיפורים': ['Йом-Кипур', 'Yom Kippur'], 'סוכות': ['Суккот', 'Sukkot'],
    'שמחת תורה': ['Симхат Тора', 'Simchat Torah'], 'חול המועד סוכות': ['Хол а-моэд Суккот', 'Chol Hamoed Sukkot'],
    'פסח': ['Песах', 'Pesach'], 'שביעי של פסח': ['седьмой день Песаха', 'the seventh day of Pesach'],
    'חול המועד פסח': ['Хол а-моэд Песах', 'Chol Hamoed Pesach'], 'שבועות': ['Шавуот', 'Shavuot']
  };
  function holName(h) { var x = HOL[h]; return L === 'ru' && x ? x[0] : (L === 'en' && x ? x[1] : h); }
  var CITY = {
    'ירושלים': ['Иерусалим', 'Jerusalem'], 'תל אביב': ['Тель-Авив', 'Tel Aviv'], 'רמת גן': ['Рамат-Ган', 'Ramat Gan'],
    'פתח תקווה': ['Петах-Тиква', 'Petah Tikva'], 'צריפין': ['Црифин', 'Tzrifin'], 'רחובות': ['Реховот', 'Rehovot'],
    'כפר סבא': ['Кфар-Саба', 'Kfar Saba'], 'נתניה': ['Нетания', 'Netanya'], 'חדרה': ['Хадера', 'Hadera'],
    'אשדוד': ['Ашдод', 'Ashdod'], 'אשקלון': ['Ашкелон', 'Ashkelon'], 'באר שבע': ['Беэр-Шева', 'Beersheba'],
    'חיפה': ['Хайфа', 'Haifa'], 'נהריה': ['Нагария', 'Nahariya'], 'נצרת': ['Назарет', 'Nazareth'],
    'עפולה': ['Афула', 'Afula'], 'טבריה': ['Тверия', 'Tiberias'], 'צפת': ['Цфат', 'Safed'], 'אילת': ['Эйлат', 'Eilat']
  };
  function cityName(c) { var x = CITY[c]; return L === 'ru' && x ? x[0] : (L === 'en' && x ? x[1] : c); }
  // קישור פנימי לגרסת השפה של הדף
  function P(path) { return L === 'he' ? path : path.replace('/mohel/', '/mohel/' + L + '/'); }
  var LAT = 31.778, LON = 35.235; // ירושלים

  // ---------- תאריך עברי ----------
  var enFmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
  var MONTHS = { tishri: 'תשרי', tishrei: 'תשרי', heshvan: 'חשוון', cheshvan: 'חשוון', kislev: 'כסלו', tevet: 'טבת', shevat: 'שבט', 'adar i': 'אדר א׳', 'adar ii': 'אדר ב׳', adar: 'אדר', nisan: 'ניסן', iyar: 'אייר', sivan: 'סיוון', tamuz: 'תמוז', av: 'אב', elul: 'אלול' };
  // גימטריה: 19 → י״ט, 5784 → תשפ״ד
  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hunds = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    s += hunds[Math.floor(n / 100)]; n %= 100;
    if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else { s += tens[Math.floor(n / 10)]; s += ones[n % 10]; }
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  function hebrew(d) {
    var h = heParts(d);
    var mon = MONTHS[h.month] || h.month;
    return gem(h.day) + ' ב' + mon + ' ' + gem(h.year % 1000);
  }
  // תאריך עברי בתעתיק (רוסית/אנגלית): "19 кислева 5787"
  function hebLat(d) {
    var h = heParts(d), m = MONTHS_T[L] || {};
    return h.day + ' ' + (m[h.month] || h.month) + ' ' + h.year;
  }
  // לתצוגה ב-HTML: בעברית כמו תמיד; ברוסית/אנגלית העברית עטופה ב-lang="he" ואחריה תעתיק
  function hebHtml(d) { return L === 'he' ? hebrew(d) : '<span lang="he" dir="rtl">' + hebrew(d) + '</span> (' + hebLat(d) + ')'; }
  // לטקסט פשוט (ווטסאפ, יומן)
  function hebText(d) { return L === 'he' ? hebrew(d) : hebLat(d); }
  function heParts(d) {
    var o = {};
    enFmt.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return { day: parseInt(o.day, 10), month: (o.month || '').toLowerCase(), year: parseInt(o.year, 10) };
  }
  // חגים שבהם ברית בזמנה נעשית אבל יש מה לתאם
  function holiday(d) {
    var h = heParts(d), m = h.month, n = h.day;
    if (/^tishri|^tishrei/.test(m)) {
      if (n === 1 || n === 2) return 'ראש השנה';
      if (n === 10) return 'יום הכיפורים';
      if (n === 15) return 'סוכות';
      if (n === 22) return 'שמחת תורה';
      if (n >= 16 && n <= 21) return 'חול המועד סוכות';
    }
    if (/^nisan/.test(m)) {
      if (n === 15) return 'פסח';
      if (n === 21) return 'שביעי של פסח';
      if (n >= 16 && n <= 20) return 'חול המועד פסח';
    }
    if (/^sivan/.test(m) && n === 6) return 'שבועות';
    return '';
  }
  function isYomTov(name) { return name && !/חול המועד/.test(name); }

  // ---------- שקיעה (NOAA) ----------
  function israelOffset(d) { // שעון קיץ: משישי שלפני יום ראשון האחרון של מרץ עד יום ראשון האחרון של אוקטובר
    var y = d.getFullYear();
    function lastSunday(month) { var x = new Date(Date.UTC(y, month + 1, 0)); return new Date(Date.UTC(y, month, x.getUTCDate() - x.getUTCDay())); }
    var start = lastSunday(2); start = new Date(start.getTime() - 2 * 864e5); start.setUTCHours(0, 0, 0, 0); // שישי
    var end = lastSunday(9); end.setUTCHours(23, 0, 0, 0); // 2:00 בשעון ישראל = 23:00 UTC ביום שלפני... מקורב ליום
    var t = Date.UTC(y, d.getMonth(), d.getDate(), 12);
    return (t >= start.getTime() && t < end.getTime()) ? 3 : 2;
  }
  function sunset(d, lat, lon) {
    if (lat == null) { lat = LAT; lon = LON; }
    var rad = Math.PI / 180;
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    var jd = day + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    var n = jd - 2451545 + 0.0008 - lon / 360;
    var M = (357.5291 + 0.98560028 * n) % 360;
    var C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    var L = (M + C + 180 + 102.9372) % 360;
    var Jt = 2451545 + n + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    var dec = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
    var cosw = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
    var w = Math.acos(cosw) / rad;
    var Jset = Jt + w / 360;
    var hoursUTC = ((Jset - Math.floor(Jset)) * 24 + 12) % 24; // שעה UTC
    var local = hoursUTC + israelOffset(d);
    var hh = Math.floor(local), mi = Math.round((local - hh) * 60);
    if (mi === 60) { hh++; mi = 0; }
    return { h: hh, m: mi, text: (hh < 10 ? '0' : '') + hh + ':' + (mi < 10 ? '0' : '') + mi };
  }

  // ---------- עזרים ----------
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function fmtG(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parseDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }

  // חישוב מועד הברית מיום לידה הלכתי
  function compute(halachicBirth, caesarean) {
    var brit = addDays(halachicBirth, 7);
    var flags = [];
    var hol = holiday(brit);
    var shabbat = brit.getDay() === 6;
    var postponed = null;
    if (caesarean && (shabbat || isYomTov(hol))) {
      // ברית שלא בזמנה (אחרי קיסרי) אינה דוחה שבת ויום טוב – ליום החול הבא
      var x = addDays(brit, 1);
      while (x.getDay() === 6 || isYomTov(holiday(x))) x = addDays(x, 1);
      postponed = x;
    }
    return { brit: brit, shabbat: shabbat, holiday: hol, postponed: postponed };
  }

  // ---------- ממשק ----------
  var form = document.getElementById('moed-form');
  if (!form) return;
  var out = document.getElementById('moed-out');
  var dateIn = form.querySelector('[name=date]');
  var timeIn = form.querySelector('[name=time]');
  var sunsetNote = document.getElementById('sunset-note');
  var placeIn = form.querySelector('[name=place]');
  var whenRow = document.getElementById('when-row');
  var birthInfo = { state: '', sunset: '', city: 'ירושלים' };

  function updateSunset() {
    birthInfo.state = ''; birthInfo.sunset = '';
    if (form.querySelector('[name=mode]:checked').value === 'born') whenRow.hidden = false;
    if (!dateIn.value) { sunsetNote.textContent = ''; return; }
    var d = parseDate(dateIn.value);
    var pl = placeIn.value.split(','), opt = placeIn.options[placeIn.selectedIndex];
    var s = sunset(d, +pl[0], +pl[1]);
    birthInfo.city = opt.getAttribute('data-city'); birthInfo.sunset = s.text;
    var cd = cityName(birthInfo.city);
    var txt = T({ he: 'השקיעה ב' + birthInfo.city + ' בתאריך הזה: ', ru: 'Закат в эту дату (' + cd + '): ', en: 'Sunset on this date (' + cd + '): ' }) + s.text;
    if (timeIn.value) {
      var t = timeIn.value.split(':'), mins = (+t[0]) * 60 + (+t[1]);
      var sm = s.h * 60 + s.m;
      if (mins >= sm - 20 && mins <= sm + 25) { birthInfo.state = 'near'; txt += T({ he: ' · הלידה סמוכה לשקיעה (בין השמשות) – כדאי שנדבר על זה', ru: ' · роды близко к закату (бейн а-шмашот) – об этом стоит поговорить', en: ' · the birth was close to sunset (bein hashmashot) – worth talking about' }); }
      else if (mins > sm) { birthInfo.state = 'after'; txt += T({ he: ' · הלידה הייתה אחרי השקיעה', ru: ' · роды были после заката', en: ' · the birth was after sunset' }); form.querySelector('[name=when][value=after]').checked = true; whenRow.hidden = true; }
      else { birthInfo.state = 'before'; txt += T({ he: ' · הלידה הייתה לפני השקיעה', ru: ' · роды были до заката', en: ' · the birth was before sunset' }); form.querySelector('[name=when][value=before]').checked = true; whenRow.hidden = true; }
    }
    sunsetNote.textContent = txt;
  }
  dateIn.addEventListener('change', updateSunset);
  timeIn.addEventListener('change', updateSunset);
  placeIn.addEventListener('change', updateSunset);

  function renderResult(born, halachic, r, mode) {
    var lines = [];
    var britHe = hebHtml(r.brit);
    var main = r.postponed || r.brit;
    var cd = cityName(birthInfo.city);
    var sunThat = T({ he: 'השקיעה ב' + birthInfo.city + ' באותו יום: ', ru: 'закат в тот день (' + cd + '): ', en: 'sunset that day (' + cd + '): ' });
    var html = '<div class="res">';
    html += '<div class="res-k">' + (mode === 'born' ? T({ he: 'הברית, בעזרת ה\':', ru: 'Брит-мила, с помощью Всевышнего:', en: 'The brit, with God\'s help:' }) : T({ he: 'אם הבן ייוולד ב-' + fmtG(born) + ', הברית:', ru: 'Если сын родится ' + fmtG(born) + ', брит-мила:', en: 'If your son is born on ' + fmtG(born) + ', the brit:' })) + '</div>';
    html += '<div class="res-d">' + dayW(r.brit, false, true) + ', ' + britHe + '</div>';
    html += '<div class="res-g">' + fmtG(r.brit) + '</div>';
    if (r.shabbat) lines.push(T({ he: 'הברית חלה בשבת. ברית בזמנה נעשית גם בשבת (חוץ מאחרי ניתוח קיסרי). יש הכנות מיוחדות – נדבר.', ru: 'Брит-мила выпадает на шабат. Брит-милу в свой срок делают и в шабат (кроме как после кесарева сечения). Есть особые приготовления – поговорим.', en: 'The brit falls on Shabbat. A brit on its proper day is held even on Shabbat (except after a Caesarean). There are special preparations – we will talk.' }));
    if (r.holiday) lines.push(T({ he: 'הברית חלה ב' + r.holiday + '. ', ru: 'Брит-мила выпадает на ' + holName(r.holiday) + '. ', en: 'The brit falls on ' + holName(r.holiday) + '. ' }) + (isYomTov(r.holiday) ? T({ he: 'ברית בזמנה נעשית גם ביום טוב (חוץ מאחרי ניתוח קיסרי). נתאם את הפרטים.', ru: 'Брит-милу в свой срок делают и в йом тов (кроме как после кесарева сечения). Согласуем детали.', en: 'A brit on its proper day is held even on Yom Tov (except after a Caesarean). We will coordinate the details.' }) : T({ he: 'אפשר לערוך ברית בחול המועד, בשמחה.', ru: 'В Хол а-моэд брит-милу можно провести, в радости.', en: 'A brit can be held on Chol Hamoed, with joy.' })));
    if (r.postponed) lines.push(T({ he: 'אחרי ניתוח קיסרי הברית לא דוחה שבת ויום טוב, ולכן היא נדחית ל', ru: 'После кесарева сечения брит-мила не отменяет шабат и йом тов, поэтому она переносится на ', en: 'After a Caesarean the brit does not override Shabbat and Yom Tov, so it is moved to ' }) + '<b>' + dayW(r.postponed, true) + ', ' + hebHtml(r.postponed) + ' (' + fmtG(r.postponed) + ')</b>.');
    if (mode === 'born' && birthInfo.state === 'near') lines.push('<b>' + T({ he: 'הלידה סמוכה לשקיעה', ru: 'Роды близко к закату', en: 'The birth was close to sunset' }) + '</b> (' + sunThat + birthInfo.sunset + '). ' + T({ he: 'המועד תלוי בבדיקה מדויקת, אז כתבו לי ונברר יחד.', ru: 'Дата зависит от точной проверки, поэтому напишите мне, и мы выясним вместе.', en: 'The date depends on an exact check, so write to me and we will look into it together.' }));
    else if (mode === 'born' && birthInfo.state) lines.push('<b>' + T({ he: 'הלידה הייתה ' + (birthInfo.state === 'after' ? 'אחרי' : 'לפני') + ' השקיעה', ru: 'Роды были ' + (birthInfo.state === 'after' ? 'после' : 'до') + ' заката', en: 'The birth was ' + (birthInfo.state === 'after' ? 'after' : 'before') + ' sunset' }) + '</b> (' + sunThat + birthInfo.sunset + ').');
    if (mode === 'born') lines.push(T({ he: 'יום הלידה ההלכתי: ', ru: 'Галахический день рождения: ', en: 'Halachic day of birth: ' }) + dayW(halachic) + ', ' + hebHtml(halachic) + T({ he: '. הברית ביום השמיני – שבוע אחרי, באותו יום בשבוע.', ru: '. Брит-мила – на восьмой день: через неделю, в тот же день недели.', en: '. The brit is on the eighth day – one week later, on the same weekday.' }));
    lines.push(T({ he: 'כל זה בתנאי שהתינוק בריא וכשיר לברית. בדיקת צהבת והבדיקה שלי לפני הברית יקבעו סופית.', ru: 'Всё это – при условии, что малыш здоров и готов к брит-миле. Анализ на желтуху и моя проверка перед брит-милой решат окончательно.', en: 'All this assumes the baby is healthy and fit for the brit. The jaundice test and my check before the brit will make the final decision.' }));
    html += '<ul class="res-notes">' + lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>';

    var aft = halachic.getTime() !== born.getTime();
    var wa = T({
      he: 'שלום גילעד 🙂 ' + (mode === 'born' ? 'הבן נולד ב-' + fmtG(born) : 'הלידה צפויה ב-' + fmtG(born)) +
      (mode === 'born' ? (aft ? ' אחרי השקיעה' : ' לפני השקיעה') : '') +
      ', ולפי המחשבון הברית יוצאת ביום ' + DAYS[main.getDay()] + ', ' + hebrew(main) + ' (' + fmtG(main) + '). אשמח לדבר על הברית.',
      ru: 'Здравствуйте, Гилад 🙂 ' + (mode === 'born' ? 'Сын родился ' + fmtG(born) : 'Роды ожидаются ' + fmtG(born)) +
      (mode === 'born' ? (aft ? ' после заката' : ' до заката') : '') +
      ', и по калькулятору брит-мила выпадает на ' + dayW(main, true) + ', ' + hebText(main) + ' (' + fmtG(main) + '). Хотелось бы поговорить о брит-миле.',
      en: 'Hello Gilad 🙂 ' + (mode === 'born' ? 'Our son was born on ' + fmtG(born) : 'The birth is expected on ' + fmtG(born)) +
      (mode === 'born' ? (aft ? ' after sunset' : ' before sunset') : '') +
      ', and according to the calculator the brit falls on ' + dayW(main) + ', ' + hebText(main) + ' (' + fmtG(main) + '). I would love to talk about the brit.'
    });
    html += '<div class="actions" style="margin-top:1.4rem">';
    html += '<a class="btn btn-gold" href="https://wa.me/972584049049?text=' + encodeURIComponent(wa) + '"><svg class="ic"><use href="#wa"/></svg> ' + T({ he: 'שלחו לי את התאריך בווטסאפ', ru: 'Отправьте мне дату в WhatsApp', en: 'Send me the date on WhatsApp' }) + '</a>';
    html += '<button class="btn btn-line" type="button" id="ics"><svg class="ic"><use href="#cal"/></svg> ' + T({ he: 'הוסיפו ליומן', ru: 'Добавить в календарь', en: 'Add to calendar' }) + '</button>';
    html += '</div>';
    html += '<p class="note" style="margin-top:1rem;text-align:center">' + T({ he: 'רוצים שאשמור לכם את התאריך? שלחו לי אותו, ואחזור אליכם עם כל מה שצריך לדעת.', ru: 'Хотите, чтобы я сохранил вашу дату? Пришлите её мне, и я вернусь к вам со всем, что нужно знать.', en: 'Want me to keep the date for you? Send it to me, and I will get back to you with everything you need to know.' }) + '</p>';
    if (mode === 'born') html += '<p class="note" style="margin-top:.6rem;text-align:center">' + T({ he: 'יש תאריך? ', ru: 'Есть дата? ', en: 'Have a date? ' }) + '<a class="gold" href="' + P('/mohel/hazmana/') + '">' + T({ he: 'מכינים הזמנה מעוצבת לברית, עם אישורי הגעה ומעקב מוזמנים, בחינם, תוך דקה', ru: 'Сделайте красивое приглашение на брит-милу с подтверждением прихода и списком гостей – бесплатно, за минуту', en: 'Make a designed brit invitation with RSVPs and guest tracking – free, in a minute' }) + '</a></p>';
    html += '</div>';
    out.innerHTML = html;
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });

    document.getElementById('ics').addEventListener('click', function () {
      var d1 = iso(main).replace(/-/g, ''), d2 = iso(addDays(main, 1)).replace(/-/g, '');
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//moed//HE', 'BEGIN:VEVENT',
        'UID:brit-' + d1 + '@hakelim.com', 'DTSTAMP:' + iso(new Date()).replace(/-/g, '') + 'T090000',
        'DTSTART;VALUE=DATE:' + d1, 'DTEND;VALUE=DATE:' + d2,
        'SUMMARY:' + T({ he: 'ברית מילה בעז"ה – ', ru: 'Брит-мила с помощью Всевышнего – ', en: 'Brit milah, with God\'s help – ' }) + hebText(main),
        'DESCRIPTION:' + T({ he: 'חושב במחשבון מועד הברית של גילעד רחמים המוהל. לתיאום: 058-404-9049 (ווטסאפ) wa.me/972584049049 · https://hakelim.com/mohel/', ru: 'Рассчитано в калькуляторе даты брит-милы Гилада Рахамима, сертифицированного моэля. Для согласования: 058-404-9049 (WhatsApp) wa.me/972584049049 · https://hakelim.com/mohel/ru/moed/', en: 'Calculated with the brit milah date calculator of Gilad Rachamim, a certified mohel. To arrange: 058-404-9049 (WhatsApp) wa.me/972584049049 · https://hakelim.com/mohel/en/moed/' }),
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + T({ he: 'מחר הברית בעז"ה', ru: 'Завтра брит-мила, с помощью Всевышнего', en: 'The brit is tomorrow, with God\'s help' }), 'END:VALARM',
        'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'brit-mila.ics'; document.body.appendChild(a); a.click(); a.remove();
    });
  }

  function renderRange(expected, caesarean) {
    var html = '<div class="res"><div class="res-k">' + T({ he: 'הברית לפי תאריך הלידה (אם הלידה לפני השקיעה):', ru: 'Брит-мила по дате рождения (если роды до заката):', en: 'The brit by date of birth (if born before sunset):' }) + '</div><table class="rng"><thead><tr><th>' + T({ he: 'אם ייוולד ב', ru: 'Если родится', en: 'If born on' }) + '</th><th>' + T({ he: 'הברית', ru: 'Брит-мила', en: 'The brit' }) + '</th></tr></thead><tbody>';
    for (var i = -3; i <= 3; i++) {
      var b = addDays(expected, i);
      var r = compute(b, caesarean);
      var m = r.postponed || r.brit;
      var flag = r.postponed ? ' <small>(' + T({ he: 'נדחית אחרי קיסרי', ru: 'перенос после кесарева', en: 'moved after Caesarean' }) + ')</small>' : (r.shabbat ? ' <small>(' + T({ he: 'שבת', ru: 'шабат', en: 'Shabbat' }) + ')</small>' : (r.holiday ? ' <small>(' + holName(r.holiday) + ')</small>' : ''));
      html += '<tr' + (i === 0 ? ' class="now"' : '') + '><td>' + dayW(b, false, true) + ' ' + fmtG(b) + '</td><td>' + dayW(m, false, true) + ', ' + hebHtml(m) + '<br><span>' + fmtG(m) + '</span>' + flag + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<ul class="res-notes"><li>' + T({ he: 'לידה אחרי השקיעה נחשבת ליום המחרת, והברית מתאחרת ביום.', ru: 'Роды после заката считаются следующим днём, и брит-мила сдвигается на день.', en: 'A birth after sunset counts as the next day, and the brit moves one day later.' }) + '</li><li>' + T({ he: 'ברגע שהבן ייוולד, חזרו לכאן עם התאריך המדויק, או פשוט כתבו לי.', ru: 'Как только сын родится, вернитесь сюда с точной датой или просто напишите мне.', en: 'Once your son is born, come back here with the exact date, or just write to me.' }) + '</li></ul>';
    var wa = T({ he: 'שלום גילעד 🙂 הלידה צפויה בסביבות ' + fmtG(expected) + '. אשמח להכיר ולדבר על הברית מראש.', ru: 'Здравствуйте, Гилад 🙂 Роды ожидаются около ' + fmtG(expected) + '. Хотелось бы познакомиться и заранее поговорить о брит-миле.', en: 'Hello Gilad 🙂 The birth is expected around ' + fmtG(expected) + '. I would love to get acquainted and talk about the brit in advance.' });
    html += '<div class="actions" style="margin-top:1.4rem"><a class="btn btn-gold" href="https://wa.me/972584049049?text=' + encodeURIComponent(wa) + '"><svg class="ic"><use href="#wa"/></svg> ' + T({ he: 'נדבר כבר עכשיו', ru: 'Поговорим уже сейчас', en: 'Let\'s talk now' }) + '</a><a class="btn btn-line" href="' + P('/mohel/madrich/') + '">' + T({ he: 'המדריך להכנה', ru: 'Руководство по подготовке', en: 'The preparation guide' }) + '</a></div></div>';
    out.innerHTML = html; out.hidden = false; out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!dateIn.value) { dateIn.focus(); return; }
    var born = parseDate(dateIn.value);
    var mode = form.querySelector('[name=mode]:checked').value;
    var caesarean = form.querySelector('[name=cs]').checked;
    if (mode === 'expected') { renderRange(born, caesarean); return; }
    var when = (form.querySelector('[name=when]:checked') || {}).value || 'before';
    var halachic = when === 'after' ? addDays(born, 1) : born;
    renderResult(born, halachic, compute(halachic, caesarean), 'born');
  });

  form.querySelectorAll('[name=mode]').forEach(function (r) {
    r.addEventListener('change', function () {
      var born = r.value === 'born';
      whenRow.hidden = !born;
      document.getElementById('time-row').hidden = !born;
      form.querySelector('button[type=submit]').textContent = born ? T({ he: 'מתי הברית?', ru: 'Когда брит-мила?', en: 'When is the brit?' }) : T({ he: 'הראו לי את התאריכים', ru: 'Покажите даты', en: 'Show me the dates' });
      if (born) updateSunset();
    });
  });

  // לבדיקות אוטומטיות
  window.__moed = { compute: compute, hebrew: hebrew, sunset: sunset, holiday: holiday, hebHtml: hebHtml, dayW: dayW, holName: holName, cityName: cityName, lang: L };
})();
