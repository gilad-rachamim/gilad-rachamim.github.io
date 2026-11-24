// לוח בריתות מיוחדות לשנה – כלי קודש למוהלים (08.11.2026).
// לכל יום לידה: מתי חל היום השמיני בשבת, ביום טוב, ביום כיפור, בתשעה באב, בחנוכה, בפורים או בצום,
// ומה ההלכה בקצרה עם מקורות. גם מחשבון "נולד ב..." והדפסה של השנה כולה.
// החישוב מ-@hebcal/core (jsdelivr), הכול בטלפון. המנוע (makeEngine) נבדק גם ב-node.
(function (root) {
  'use strict';

  // ---------- שפות: ru / en (עברית היא ברירת המחדל, בלי שינוי) ----------
  var PARSHA_RU = { bereshit: 'Берешит', noach: 'Ноах', lechlecha: 'Лех-леха', vayera: 'Вайера', chayeisara: 'Хаей Сара', toldot: 'Толдот', vayetzei: 'Вайеце', vayishlach: 'Вайишлах', vayeshev: 'Вайешев', miketz: 'Микец', vayigash: 'Вайигаш', vayechi: 'Вайехи',
    shemot: 'Шмот', vaera: 'Ваэра', bo: 'Бо', beshalach: 'Бешалах', yitro: 'Итро', mishpatim: 'Мишпатим', terumah: 'Трума', tetzaveh: 'Тецаве', kitisa: 'Ки тиса', vayakhel: 'Ваякхель', pekudei: 'Пекудей',
    vayikra: 'Ваикра', tzav: 'Цав', shmini: 'Шмини', tazria: 'Тазриа', metzora: 'Мецора', achreimot: 'Ахарей мот', kedoshim: 'Кдошим', emor: 'Эмор', behar: 'Бехар', bechukotai: 'Бехукотай',
    bamidbar: 'Бемидбар', nasso: 'Насо', behaalotcha: 'Беаалотха', shlach: 'Шлах', korach: 'Корах', chukat: 'Хукат', balak: 'Балак', pinchas: 'Пинхас', matot: 'Матот', masei: 'Масъей',
    devarim: 'Дварим', vaetchanan: 'Ваэтханан', eikev: 'Экев', reeh: 'Рее', shoftim: 'Шофтим', kiteitzei: 'Ки теце', kitavo: 'Ки таво', nitzavim: 'Ницавим', vayeilech: 'Вайелех', haazinu: 'Гаазину' };
  var ENG_I18N = {
    ru: {
      days: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
      monN: { tishrei: 'Тишрей', cheshvan: 'Хешван', kislev: 'Кислев', tevet: 'Тевет', shvat: 'Шват', adar: 'Адар', 'adar i': 'Адар I', 'adar ii': 'Адар II', nisan: 'Нисан', iyyar: 'Ияр', sivan: 'Сиван', tamuz: 'Тамуз', av: 'Ав', elul: 'Элул' },
      monG: { tishrei: 'тишрея', cheshvan: 'хешвана', kislev: 'кислева', tevet: 'тевета', shvat: 'швата', adar: 'адара', 'adar i': 'адара I', 'adar ii': 'адара II', nisan: 'нисана', iyyar: 'ияра', sivan: 'сивана', tamuz: 'тамуза', av: 'ава', elul: 'элула' },
      yk: 'Йом-Кипур', tb: 'Девятое ава', tbN: 'Девятое ава (перенесено)', purim: 'Пурим', shushan: 'Шушан-Пурим (Пурим в Иерусалиме)', sat: 'Суббота', tbS: '9 ава в субботу',
      shab: function (p) { return 'Суббота (глава ' + p + ')'; }, chan: function (n) { return 'Ханука, ' + n + '-й день'; }, dayN: function (n) { return ', ' + n + '-й день'; },
      chag: { 'Rosh Hashana': 'Рош а-Шана', 'Sukkot': 'Суккот', 'Shmini Atzeret': 'Шмини Ацерет', 'Simchat Torah': 'Симхат Тора', 'Pesach': 'Песах', 'Shavuot': 'Шавуот' },
      fast: { tzomgedaliah: 'Пост Гедалии', asarabtevet: 'Пост 10 тевета', taanitesther: 'Пост Эстер', tzomtammuz: 'Пост 17 тамуза' },
      g: function (d) { return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear(); },
      gs: function (d) { return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2); }
    },
    en: {
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      monN: { tishrei: 'Tishrei', cheshvan: 'Cheshvan', kislev: 'Kislev', tevet: 'Tevet', shvat: 'Shevat', adar: 'Adar', 'adar i': 'Adar I', 'adar ii': 'Adar II', nisan: 'Nisan', iyyar: 'Iyar', sivan: 'Sivan', tamuz: 'Tammuz', av: 'Av', elul: 'Elul' },
      monG: { tishrei: 'Tishrei', cheshvan: 'Cheshvan', kislev: 'Kislev', tevet: 'Tevet', shvat: 'Shevat', adar: 'Adar', 'adar i': 'Adar I', 'adar ii': 'Adar II', nisan: 'Nisan', iyyar: 'Iyar', sivan: 'Sivan', tamuz: 'Tammuz', av: 'Av', elul: 'Elul' },
      yk: 'Yom Kippur', tb: 'Tisha B\'Av', tbN: 'Tisha B\'Av (postponed)', purim: 'Purim', shushan: 'Shushan Purim (Purim in Jerusalem)', sat: 'Shabbat', tbS: '9 Av on Shabbat',
      shab: function (p) { return 'Shabbat ' + p; }, chan: function (n) { return 'Chanukah, day ' + n; }, dayN: function (n) { return ', day ' + n; },
      chag: { 'Rosh Hashana': 'Rosh Hashanah', 'Sukkot': 'Sukkot', 'Shmini Atzeret': 'Shemini Atzeret', 'Simchat Torah': 'Simchat Torah', 'Pesach': 'Pesach', 'Shavuot': 'Shavuot' },
      fast: { tzomgedaliah: 'Fast of Gedaliah', asarabtevet: 'Fast of the Tenth of Tevet', taanitesther: 'Fast of Esther', tzomtammuz: 'Fast of the 17th of Tammuz' },
      g: function (d) { return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getFullYear(); },
      gs: function (d) { return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]; }
    }
  };
  var ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };

  // ---------- המנוע: בלי DOM ----------
  function makeEngine(H, LG) {
    var F = H.flags;
    var X = ENG_I18N[LG] || null;
    function mk(t) { return String(t).toLowerCase().replace(/[^a-z ]/g, '').trim(); }
    function monN(hd) { return X.monN[mk(hd.getMonthName())] || hd.getMonthName(); }
    function monG(hd) { return X.monG[mk(hd.getMonthName())] || hd.getMonthName(); }
    function chagName(desc) {
      var t = desc.replace(/\s*\d{4}$/, '').replace(/\s*\(.*\)$/, ''), m = /^(.*?)(?: ([IVX]+))?$/.exec(t), base = m[1], n = m[2] ? ROMAN[m[2]] : 0;
      return (X.chag[base] || base) + (n ? X.dayN(n) : '');
    }
    function fastName(desc) { return X.fast[desc.toLowerCase().replace(/[^a-z]/g, '')] || desc; }
    function parshaName(desc) {
      var n = desc.replace(/^Parashat\s+/, '');
      if (LG === 'en') return n;
      var k = n.toLowerCase().replace(/[^a-z]/g, '');
      if (PARSHA_RU[k]) return PARSHA_RU[k];
      return n.split('-').map(function (p) { return PARSHA_RU[p.toLowerCase().replace(/[^a-z]/g, '')] || p; }).join(' – ');
    }
    var DAYS = X ? X.days : ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    var cache = {};

    function key(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function noon(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }
    function addDays(d, n) { var x = noon(d); x.setDate(x.getDate() + n); return x; }

    // כל האירועים של שנה עברית (וגם החודש שלפניה ואחריה, בשביל לידות בסוף אלול), לפי תאריך לועזי
    function yearEvents(hy, il) {
      var ck = hy + (il ? 'i' : 'd');
      if (cache[ck]) return cache[ck];
      var by = {};
      var start = addDays(new H.HDate(1, H.months.TISHREI, hy).greg(), -40);
      var end = addDays(new H.HDate(29, H.months.ELUL, hy).greg(), 40);
      H.HebrewCalendar.calendar({ start: start, end: end, il: il, sedrot: true, noMinorFast: false, noModern: true,
        noRoshChodesh: true, noSpecialShabbat: true }).forEach(function (e) {
        var k = key(e.getDate().greg());
        (by[k] = by[k] || []).push(e);
      });
      cache[ck] = by;
      return by;
    }

    // מה מיוחד ביום הזה (d = תאריך לועזי של היום, ביום עצמו)
    function dayInfo(d, il) {
      d = noon(d);
      var hd = new H.HDate(d), r = { d: d, hd: hd, tags: [], names: [] };
      var evs = yearEvents(hd.getFullYear(), il)[key(d)] || [];
      // אירועים של סוף השנה שעברה או תחילת הבאה
      if (!evs.length) {
        var o = yearEvents(hd.getFullYear() + (hd.getMonth() === H.months.ELUL ? 1 : -1), il)[key(d)];
        if (o) evs = o;
      }
      r.shabbat = d.getDay() === 6;
      evs.forEach(function (e) {
        var f = e.getFlags(), desc = e.getDesc(), he = e.render('he-x-NoNikud');
        if (f & F.PARSHA_HASHAVUA) { r.parsha = X ? parshaName(desc) : he; return; }
        if (desc === 'Yom Kippur') { r.yk = true; r.names.push(X ? X.yk : 'יום כיפור'); }
        else if (f & F.CHAG) { r.yt = true; r.names.push(X ? chagName(desc) : he.replace(/\s*\d{4}$/, '')); if (/ II$|VIII$|Simchat Torah/.test(desc) && !il && !/Rosh Hashana/.test(desc)) r.ytSheni = true; }
        else if (/^Tish'a B'Av/.test(desc)) { r.tb = true; r.tbNidche = /observed/i.test(desc); r.names.push(X ? (r.tbNidche ? X.tbN : X.tb) : (r.tbNidche ? 'תשעה באב נדחה' : 'תשעה באב')); }
        else if ((f & F.MINOR_FAST) && !/Bechorot/.test(desc)) { r.fast = true; r.fastName = he; r.esther = /Esther/.test(desc); r.names.push(X ? fastName(desc) : he); }
        else if (desc === 'Purim') { r.purim = true; r.names.push(X ? X.purim : 'פורים'); }
        else if (desc === 'Shushan Purim') { r.shushan = true; r.names.push(X ? X.shushan : 'שושן פורים (פורים בירושלים)'); }
      });
      // חנוכה: מכ"ה בכסלו, שמונה ימים
      var c = new H.HDate(25, H.months.KISLEV, hd.getFullYear()).greg();
      var cd = Math.round((noon(d) - noon(c)) / 864e5);
      if (cd >= 0 && cd < 8) { r.chanuka = cd + 1; r.names.push(X ? X.chan(cd + 1) : 'חנוכה, יום ' + H.gematriya(cd + 1)); }
      // ט' באב שחל בשבת: הצום נדחה למחר, והברית בשבת כרגיל
      if (r.shabbat && hd.getMonth() === H.months.AV && hd.getDate() === 9) { r.tbShabbat = true; r.names.push(X ? X.tbS : 'ט׳ באב שחל בשבת'); }
      if (r.shabbat) r.names.unshift(X ? (r.parsha ? X.shab(r.parsha) : X.sat) : (r.parsha ? 'שבת ' + r.parsha : 'שבת'));
      ['shabbat', 'yt', 'yk', 'tb', 'tbShabbat', 'chanuka', 'purim', 'shushan', 'fast'].forEach(function (t) { if (r[t]) r.tags.push(t); });
      r.special = r.tags.length > 0;
      r.blocked = !!(r.shabbat || r.yt || r.yk); // ימים שספק או ברית שלא בזמנה לא דוחה
      return r;
    }

    // היום הראשון מ-d והלאה שאינו שבת, יום טוב או יום כיפור
    function firstAllowed(d, il) {
      var x = noon(d), n = 0;
      while (dayInfo(x, il).blocked && n < 6) { x = addDays(x, 1); n++; }
      return x;
    }

    // מחשבון: birth = יום לידה לועזי; when = 'day' | 'night' | 'bh'; cs = ניתוח קיסרי
    function compute(birth, when, cs, il) {
      birth = noon(birth);
      var hebDay = when === 'day' ? birth : addDays(birth, 1); // אחרי השקיעה – כבר היום העברי הבא
      var eighth = addDays(hebDay, 7);
      var info = dayInfo(eighth, il), res = { hebBirth: new H.HDate(hebDay), eighth: eighth, info: info, notes: [] };
      if (when === 'bh') {
        // ספק: מונים מהלילה, ונימול לתשיעי שהוא ספק שמיני (יו"ד רסב ד; רסו ח)
        res.hebBirth = new H.HDate(birth);
        res.hebBirth2 = new H.HDate(hebDay);
        res.brit = firstAllowed(eighth, il);
        res.doubt = true;
      } else if (cs) {
        res.brit = firstAllowed(eighth, il);
      } else {
        res.brit = eighth;
      }
      res.moved = key(res.brit) !== key(eighth);
      // בספק מונים מהיום הראשון: "נימול לתשיעי, שהוא ספק שמיני"
      res.dayNum = (res.doubt ? 9 : 8) + Math.round((res.brit - eighth) / 864e5);
      res.britInfo = res.moved ? dayInfo(res.brit, il) : info;
      return res;
    }

    // כל ימי השמיני המיוחדים בשנה עברית (היום השמיני בתוך השנה)
    function year(hy, il) {
      var s = noon(new H.HDate(1, H.months.TISHREI, hy).greg()), e = noon(new H.HDate(29, H.months.ELUL, hy).greg());
      var out = [];
      for (var d = s; d <= e; d = addDays(d, 1)) {
        var inf = dayInfo(d, il);
        if (!inf.special) continue;
        var born = addDays(d, -7);
        out.push({ eighth: inf, born: born, bornPrevEve: addDays(born, -1), alt: inf.blocked ? firstAllowed(d, il) : null });
      }
      return out;
    }

    function hebStr(hd) { return X ? hd.getDate() + ' ' + monG(hd) : hd.renderGematriya(true).replace(/\s[^\s]+$/, ''); }
    function hebFull(hd) { return X ? hd.getDate() + ' ' + monG(hd) + ' ' + hd.getFullYear() : hd.renderGematriya(true); }
    function monthTitle(hd) { return X ? monN(hd) + ' ' + hd.getFullYear() : new H.HDate(1, hd.getMonth(), hd.getFullYear()).renderGematriya(true).split(' ').slice(1).join(' '); }
    function g(d) { return X ? X.g(d) : d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
    function gs(d) { return X ? X.gs(d) : d.getDate() + '.' + (d.getMonth() + 1); }
    function dayName(d) { return X ? DAYS[d.getDay()] : d.getDay() === 6 ? 'שבת' : 'יום ' + DAYS[d.getDay()]; }

    return { dayInfo: dayInfo, compute: compute, year: year, firstAllowed: firstAllowed, addDays: addDays, noon: noon, key: key,
      hebStr: hebStr, hebFull: hebFull, monthTitle: monthTitle, g: g, gs: gs, dayName: dayName, DAYS: DAYS };
  }

  // ---------- ההלכות בקצרה, עם מקורות ----------
  var HAL = {
    shabbat: { t: 'ברית בשבת', p: [
      'ברית ביום השמיני דוחה שבת: המילה, הפריעה והמציצה, ונותנים תחבושת.',
      'כל מה שאפשר להכין מערב שבת מכינים מערב שבת: האיזמל, התחבושות והאבקה, ומביאים אותם למקום הברית לפני שבת (במקום בלי עירוב).',
      'ברית שנדחתה (לא ביום השמיני) לא נעשית בשבת.',
      'נולד בין השמשות או בניתוח קיסרי – לא נימול בשבת (ראו למטה).',
      'מי שלא מל מעולם לא ימול לראשונה בשבת.',
      'שעת הברית: לפני השקיעה, עם מרווח ביטחון.'],
      s: 'שו"ע יו"ד רסו ב–ג, ז–י; או"ח שלא א, ד–ו' },
    yt: { t: 'ברית ביום טוב', p: [
      'ברית ביום השמיני דוחה גם יום טוב, כמו שבת.',
      'מכשירי מילה שאפשר להכין מערב יום טוב לא דוחים יום טוב.',
      'ספק (נולד בין השמשות) לא נימול ביום טוב, ואפילו ביום טוב שני של גלויות.'],
      s: 'שו"ע יו"ד רסו ב, ו, ח' },
    yk: { t: 'ברית ביום כיפור', p: [
      'מלים בין שחרית למוסף, אחרי קריאת התורה, ואחר כך אומרים אשרי (ברמ"א: המנהג למול אחרי אשרי).',
      'הכוס: לשולחן ערוך מברכים בלי כוס. לרמ"א מברכים על הכוס ונותנים לתינוק הנימול, וכן נוהגים.',
      'הסעודה לא ביום הצום. יש שנוהגים לעשות את הברית סמוך יחסית לשקיעה, ואת סעודת המצווה בערב, אחרי הצום.'],
      s: 'שו"ע או"ח תרכא ב–ג; יו"ד רסה ד' },
    tb: { t: 'ברית בתשעה באב', p: [
      'מלים אחרי שגומרים את הקינות (יש שממתינים עד אחרי חצות). מברכים בלי בשמים.',
      'הכוס: אם היולדת נמצאת ושומעת את הברכה – היא שותה ממנו. אם לא – נותנים לתינוקות.',
      'בעלי הברית (אבי הבן, המוהל והסנדק) לובשים בגדי שבת אחרי הקינות, אבל לא בגדים לבנים ממש.',
      'הסעודה לא ביום הצום. יש שנוהגים לעשות את הברית סמוך יחסית לשקיעה, ואת סעודת המצווה בערב, אחרי הצום.'],
      s: 'שו"ע או"ח תקנט ז–ח; יו"ד רסה ד' },
    tbNidche: { t: 'תשעה באב שנדחה ליום ראשון', p: [
      'כשתשעה באב חל בשבת ונדחה ליום ראשון: בעל הברית מתפלל מנחה כשהיום עוד גדול, רוחץ ואוכל, ואינו משלים את התענית, כי זה יום טוב שלו.'],
      s: 'שו"ע או"ח תקנט ט' },
    tbShabbat: { t: 'ט׳ באב שחל בשבת', p: [
      'הצום נדחה ליום ראשון, והברית בשבת כמו בכל שבת.'],
      s: 'שו"ע או"ח תקנט א, ט' },
    fast: { t: 'ברית ביום צום', p: [
      'מתפללים סליחות ואומרים וידוי כרגיל, אבל לא אומרים "והוא רחום" ולא נופלים על פניהם.',
      'הכוס: בצומות שהיולדת לא מתענה, היא יכולה לשתות אם שמעה את הברכה. לרמ"א מברכים על הכוס ונותנים לתינוקות.',
      'הסעודה לא ביום הצום. יש שנוהגים לעשות את הברית סמוך יחסית לשקיעה, ואת סעודת המצווה בערב, אחרי הצום.'],
      s: 'שו"ע יו"ד רסה ד, יג' },
    chanuka: { t: 'ברית בחנוכה', p: [
      'אין שינוי בדיני הברית.',
      'על סעודות חנוכה כתב הרמ"א שיש בהן קצת מצווה, ובשירות ותשבחות הן סעודת מצווה. סעודת ברית בחנוכה – שמחה כפולה.'],
      s: 'רמ"א או"ח תרע ב' },
    purim: { t: 'ברית בפורים', p: [
      'כשיש מילה בפורים, מלים את התינוק לפני קריאת המגילה.',
      '"וששון" – זו מילה.'],
      s: 'רמ"א או"ח תרצג ד; מגילה טז ב' },
    shushan: { t: 'שושן פורים', p: [
      'בירושלים זה יום הפורים. בשאר הארץ יום רגיל.'],
      s: '' },
    bh: { t: 'נולד בין השמשות', p: [
      'ספק יום ספק לילה: מונים מהלילה, ונימול ביום התשיעי, שהוא ספק שמיני.',
      'אם זה יוצא בשבת או ביום טוב (גם יום טוב שני בחו"ל) – לא מלים, כי לא דוחים שבת מספק. לכן לפעמים נימול ביום העשירי או האחד עשר.',
      'בשיעור בין השמשות יש מחלוקת. לשאול את הרב.'],
      s: 'שו"ע יו"ד רסב ד; רסו ח–ט' },
    cs: { t: 'נולד בניתוח קיסרי', p: [
      'נימול ביום השמיני, אבל לא בשבת, לא ביום טוב ולא ביום כיפור. אם השמיני חל באחד מהם – ביום הראשון שאחריו שאינו שבת או חג.'],
      s: 'שו"ע יו"ד רסב ג; רסו י; או"ח שלא ה' },
    sick: { t: 'תינוק שאינו בריא', p: [
      'לא מלים עד שיבריא. בחולי של כל הגוף ממתינים שבעה ימים מעת לעת מההחלמה. ברית כזו לא נעשית בשבת וביום טוב.'],
      s: 'שו"ע יו"ד רסב ב; רסו ב' }
  };


  var HAL_L = {
    ru: {
      shabbat: { t: 'Брит-мила в субботу', p: [
        'Брит-мила на восьмой день проводится и в субботу: мила, прия и мецица, затем накладывают повязку.',
        'Всё, что можно подготовить в пятницу, готовят в пятницу: инструмент, повязки и порошок. Их приносят на место брит-милы до начала субботы (там, где нет эрува).',
        'Брит-мила, которая была отложена (не на восьмой день), в субботу не совершается.',
        'Если младенец родился в сумерки или путём кесарева сечения – в субботу ему милу не делают (см. ниже).',
        'Моэль, который ещё ни разу не делал милу, не должен делать её впервые в субботу.',
        'Время брит-милы: до заката, с запасом времени.'],
        s: 'Шулхан арух, Йоре деа 266:2–3, 7–10; Орах хаим 331:1, 4–6' },
      yt: { t: 'Брит-мила в праздник', p: [
        'Брит-мила на восьмой день проводится и в праздник, как и в субботу.',
        'Инструменты для милы, которые можно подготовить с вечера перед праздником, праздник не отодвигают.',
        'В случае сомнения (родился в сумерки) милу в праздник не делают, даже во второй день праздника в диаспоре.'],
        s: 'Шулхан арух, Йоре деа 266:2, 6, 8' },
      yk: { t: 'Брит-мила в Йом-Кипур', p: [
        'Милу делают между шахарит и мусаф, после чтения Торы, а потом говорят «Ашрей» (у Рамы: обычай – делать милу после «Ашрей»).',
        'Бокал: по Шулхан аруху благословение произносят без бокала. По Раме – над бокалом, и его дают младенцу, которому сделали милу; так и принято.',
        'Трапезы в день поста нет. Некоторые делают брит-милу ближе к закату, а трапезу по случаю заповеди – вечером, после поста.'],
        s: 'Шулхан арух, Орах хаим 621:2–3; Йоре деа 265:4' },
      tb: { t: 'Брит-мила в Девятое ава', p: [
        'Милу делают после того, как закончили читать кинот (некоторые ждут до полудня). Благословение произносят без благовоний.',
        'Бокал: если роженица присутствует и слышит благословение, она пьёт из него. Если нет – дают детям.',
        'Участники брит-милы (отец, моэль и сандак) надевают субботнюю одежду после кинот, но не совсем белую.',
        'Трапезы в день поста нет. Некоторые делают брит-милу ближе к закату, а трапезу по случаю заповеди – вечером, после поста.'],
        s: 'Шулхан арух, Орах хаим 559:7–8; Йоре деа 265:4' },
      tbNidche: { t: 'Девятое ава, перенесённое на воскресенье', p: [
        'Когда Девятое ава приходится на субботу и переносится на воскресенье, хозяин брит-милы молится минху, пока день ещё не клонится к вечеру, омывается и ест, и не завершает пост, потому что для него это праздник.'],
        s: 'Шулхан арух, Орах хаим 559:9' },
      tbShabbat: { t: '9 ава в субботу', p: [
        'Пост переносится на воскресенье, а брит-мила в субботу проходит как в любую другую субботу.'],
        s: 'Шулхан арух, Орах хаим 559:1, 9' },
      fast: { t: 'Брит-мила в день поста', p: [
        'Читают слихот и произносят видуй как обычно, но не говорят «Ве-ху рахум» и не падают ниц.',
        'Бокал: в посты, которые роженица не соблюдает, она может пить, если слышала благословение. По Раме благословляют над бокалом и дают детям.',
        'Трапезы в день поста нет. Некоторые делают брит-милу ближе к закату, а трапезу по случаю заповеди – вечером, после поста.'],
        s: 'Шулхан арух, Йоре деа 265:4, 13' },
      chanuka: { t: 'Брит-мила в Хануку', p: [
        'Правила брит-милы не меняются.',
        'О ханукальных трапезах Рама писал, что в них есть доля заповеди, а с песнями и хвалой они становятся трапезой заповеди. Трапеза по случаю брит-милы в Хануку – двойная радость.'],
        s: 'Рама, Орах хаим 670:2' },
      purim: { t: 'Брит-мила в Пурим', p: [
        'Если мила приходится на Пурим, младенцу делают милу до чтения Свитка Эстер.',
        'Слово «ве-сасон» (וששון) в Свитке Эстер означает милу.'],
        s: 'Рама, Орах хаим 693:4; Мегила 16б' },
      shushan: { t: 'Шушан-Пурим', p: [
        'В Иерусалиме это день Пурима. В остальной части страны – обычный день.'],
        s: '' },
      bh: { t: 'Родился в сумерки', p: [
        'Сомнение, день или ночь: считают от ночи, и милу делают на девятый день, который является сомнительным восьмым.',
        'Если этот день приходится на субботу или праздник (в том числе второй день праздника в диаспоре), милу не делают, потому что из-за сомнения субботу не отодвигают. Поэтому иногда милу делают на десятый или одиннадцатый день.',
        'О продолжительности сумерек есть разногласие. Спросите раввина.'],
        s: 'Шулхан арух, Йоре деа 262:4; 266:8–9' },
      cs: { t: 'Родился путём кесарева сечения', p: [
        'Милу делают на восьмой день, но не в субботу, не в праздник и не в Йом-Кипур. Если восьмой день приходится на один из них – в первый следующий день, который не суббота и не праздник.'],
        s: 'Шулхан арух, Йоре деа 262:3; 266:10; Орах хаим 331:5' },
      sick: { t: 'Младенец нездоров', p: [
        'Милу не делают, пока он не выздоровеет. При болезни всего тела ждут семь полных суток после выздоровления. Такую милу не делают в субботу и в праздник.'],
        s: 'Шулхан арух, Йоре деа 262:2; 266:2' }
    },
    en: {
      shabbat: { t: 'Brit on Shabbat', p: [
        'A brit on the eighth day overrides Shabbat: the milah, the peri\'ah and the metzitzah, and a dressing is applied.',
        'Whatever can be prepared on Friday is prepared on Friday: the knife, the dressings and the powder, brought to the place of the brit before Shabbat (where there is no eruv).',
        'A brit that was postponed (not on the eighth day) is not performed on Shabbat.',
        'A baby born at twilight or by cesarean section is not circumcised on Shabbat (see below).',
        'A mohel who has never performed a brit should not perform his first one on Shabbat.',
        'Time of the brit: before sunset, with a safety margin.'],
        s: 'Shulchan Aruch, Yoreh De\'ah 266:2–3, 7–10; Orach Chayim 331:1, 4–6' },
      yt: { t: 'Brit on a festival', p: [
        'A brit on the eighth day overrides a festival as well, like Shabbat.',
        'Tools for the milah that could have been prepared before the festival do not override the festival.',
        'In a case of doubt (born at twilight), the baby is not circumcised on a festival, even on the second festival day in the diaspora.'],
        s: 'Shulchan Aruch, Yoreh De\'ah 266:2, 6, 8' },
      yk: { t: 'Brit on Yom Kippur', p: [
        'The milah is performed between Shacharit and Musaf, after the Torah reading, and then Ashrei is said (the Rema: the custom is to perform the milah after Ashrei).',
        'The cup: according to the Shulchan Aruch the blessing is said without a cup. According to the Rema it is said over a cup, which is given to the baby who was circumcised, and this is the custom.',
        'There is no meal on the fast day. Some hold the brit relatively close to sunset, and the festive meal in the evening, after the fast.'],
        s: 'Shulchan Aruch, Orach Chayim 621:2–3; Yoreh De\'ah 265:4' },
      tb: { t: 'Brit on Tisha B\'Av', p: [
        'The milah is performed after the Kinot are finished (some wait until after midday). The blessing is said without spices.',
        'The cup: if the mother is present and hears the blessing, she drinks from it. If not, it is given to children.',
        'The ones in the covenant (the father, the mohel and the sandak) put on Shabbat clothes after the Kinot, but not fully white ones.',
        'There is no meal on the fast day. Some hold the brit relatively close to sunset, and the festive meal in the evening, after the fast.'],
        s: 'Shulchan Aruch, Orach Chayim 559:7–8; Yoreh De\'ah 265:4' },
      tbNidche: { t: 'Tisha B\'Av postponed to Sunday', p: [
        'When Tisha B\'Av falls on Shabbat and is postponed to Sunday, the father of the baby prays Mincha while the day is still long, washes and eats, and does not complete the fast, because for him it is a festival.'],
        s: 'Shulchan Aruch, Orach Chayim 559:9' },
      tbShabbat: { t: '9 Av on Shabbat', p: [
        'The fast is postponed to Sunday, and the brit on Shabbat is held as on any Shabbat.'],
        s: 'Shulchan Aruch, Orach Chayim 559:1, 9' },
      fast: { t: 'Brit on a fast day', p: [
        'Selichot are said and the confession is recited as usual, but "Vehu Rachum" is not said and Tachanun is not said with falling on the face.',
        'The cup: on fasts that the mother does not keep, she may drink if she heard the blessing. According to the Rema the blessing is said over a cup and it is given to children.',
        'There is no meal on the fast day. Some hold the brit relatively close to sunset, and the festive meal in the evening, after the fast.'],
        s: 'Shulchan Aruch, Yoreh De\'ah 265:4, 13' },
      chanuka: { t: 'Brit on Chanukah', p: [
        'The laws of the brit do not change.',
        'About Chanukah meals the Rema wrote that they have some element of a mitzvah, and with songs and praise they are a mitzvah meal. A brit meal on Chanukah is a double joy.'],
        s: 'Rema, Orach Chayim 670:2' },
      purim: { t: 'Brit on Purim', p: [
        'When there is a brit on Purim, the baby is circumcised before the reading of the Megillah.',
        'The word "vesason" (וששון) in the Book of Esther refers to the milah.'],
        s: 'Rema, Orach Chayim 693:4; Megillah 16b' },
      shushan: { t: 'Shushan Purim', p: [
        'In Jerusalem it is the day of Purim. Elsewhere in the country it is an ordinary day.'],
        s: '' },
      bh: { t: 'Born at twilight', p: [
        'It is doubtful whether it is day or night: the count starts from the night, and the baby is circumcised on the ninth day, which is a doubtful eighth.',
        'If this falls on Shabbat or a festival (including the second festival day in the diaspora), the milah is not performed, because Shabbat is not overridden because of a doubt. So sometimes the baby is circumcised on the tenth or eleventh day.',
        'There is a dispute about the length of twilight. Ask the rabbi.'],
        s: 'Shulchan Aruch, Yoreh De\'ah 262:4; 266:8–9' },
      cs: { t: 'Born by cesarean section', p: [
        'The baby is circumcised on the eighth day, but not on Shabbat, a festival or Yom Kippur. If the eighth day falls on one of them, it is done on the first following day that is not a Shabbat or a festival.'],
        s: 'Shulchan Aruch, Yoreh De\'ah 262:3; 266:10; Orach Chayim 331:5' },
      sick: { t: 'A baby who is not healthy', p: [
        'The milah is not performed until he recovers. For an illness of the whole body, we wait seven full days after the recovery. Such a brit is not performed on Shabbat or a festival.'],
        s: 'Shulchan Aruch, Yoreh De\'ah 262:2; 266:2' }
    }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = { makeEngine: makeEngine, HAL: HAL, HAL_L: HAL_L }; return; }
  root.BM = { makeEngine: makeEngine, HAL: HAL };

  // ---------- הדף ----------
  var $ = function (id) { return document.getElementById(id); };
  var out = $('bm-out');
  if (!out) return;
  var CITIES = [['31.778,35.235', 'ירושלים'], ['32.08,34.78', 'תל אביב'], ['32.79,34.99', 'חיפה'], ['31.25,34.79', 'באר שבע'],
    ['32.965,35.496', 'צפת'], ['32.79,35.53', 'טבריה'], ['29.557,34.952', 'אילת'], ['31.53,35.1', 'חברון'], ['31.9,35.0', 'מודיעין'],
    ['32.09,34.88', 'פתח תקווה'], ['31.8,34.65', 'אשדוד'], ['32.33,34.86', 'נתניה'], ['31.7,35.12', 'גוש עציון'], ['32.3,35.2', 'שומרון'],
    ['31.35,34.3', 'עוטף עזה'], ['33.2,35.57', 'קריית שמונה'], ['31.68,34.57', 'אשקלון'], ['32.18,34.87', 'כפר סבא'], ['32.02,34.75', 'בת ים']];

  var L = (document.documentElement.getAttribute('lang') || 'he').slice(0, 2);
  var SP = {
    ru: {
      cities: ['Иерусалим', 'Тель-Авив', 'Хайфа', 'Беэр-Шева', 'Цфат', 'Тверия', 'Эйлат', 'Хеврон', 'Модиин', 'Петах-Тиква', 'Ашдод', 'Нетания', 'Гуш-Эцион', 'Самария', 'Приграничье Газы', 'Кирьят-Шмона', 'Ашкелон', 'Кфар-Саба', 'Бат-Ям'],
      loc: 'ru-RU', sep: ', ', year: function (y) { return String(y); },
      title: function (y) { return 'Календарь особых бритов – год ' + y; },
      sub: function (il, city) { return 'Когда восьмой день приходится на субботу, праздник, Йом-Кипур, Девятое ава, Хануку, Пурим или пост · ' + (il ? 'Земля Израиля' : 'диаспора (включая второй день праздника)') + ' · закат: ' + city; },
      th: ['Родился', 'Восьмой день', 'Что особенного'],
      alt: function (gs, day, heb, gs2) { return 'Кесарево сечение или рождение в сумерки вечером ' + gs + ': брит-мила – ' + day + ', ' + heb + ' (' + gs2 + ')'; },
      born: function (a, b) { return a + ' до заката или ' + b + ' после выхода звёзд'; },
      sunset: ' · закат ', none: 'Ничего не выбрано. Отметьте выше, что показать.', rules: 'Правила кратко',
      ask: 'Это краткая справка для изучения и подготовки. В каждом случае спрашивайте раввина.',
      foot: 'Подарок с любовью от Гилада Рахамима, сертифицированного моэля · +972-58-404-9049 · hakelim.com/kodesh/britot-meyuchadot/ru/',
      src: 'Источник: ', sat: 'в субботу', yt: 'в праздник', yk: 'Йом-Кипур', tb: 'Девятое ава', chan: 'в Хануку', purim: 'Пурим', fast: 'в дни постов',
      count: function (n, parts) { return 'Особых дней для брит-милы: ' + n + (parts.length ? ' (' + parts.join(', ') + ')' : ''); },
      needTime: 'Укажите время рождения или выберите «до заката» / «после выхода звёзд».',
      whenNote: function (city, ss, tz, t, w) { return 'Здесь (' + city + ') в этот день: закат ' + ss + ', выход звёзд ' + tz + '. Рождение в ' + t + ' – ' + (w === 'day' ? 'до заката.' : w === 'night' ? 'после выхода звёзд, то есть уже следующий еврейский день.' : 'между закатом и выходом звёзд: сомнение.'); },
      special: 'Особая брит-мила', usual: 'Обычная брит-мила', born2: 'Родился: ', doubt: function (a, b) { return 'сомнение: ' + a + ' или ' + b; }, brit: 'Брит-мила: ', dayN: function (n) { return ' · <b>' + n + '-й день</b>'; },
      why: function (day, heb, names, doubt) { return 'Восьмой день (' + day + ', ' + heb + ', ' + names + ') ' + (doubt ? 'сомнителен, а при сомнении её не проводят ни в субботу, ни в праздник.' : 'не подходит, потому что брит-мила при кесаревом сечении не проводится ни в субботу, ни в праздник, ни в Йом-Кипур.'); },
      sunDay: function (city, t) { return 'Закат (' + city + ') в день брит-милы: ' + t + '. Сделайте милу до этого, с запасом времени.'; },
      plain: 'Восьмой день не приходится на субботу, праздник, пост, Хануку или Пурим.',
      sickAsk: 'Если младенец нездоров – решают врач и моэль. В любом сомнении спрашивайте раввина.',
      stuck: 'Что-то пошло не так при расчёте. Обновите страницу.'
    },
    en: {
      cities: ['Jerusalem', 'Tel Aviv', 'Haifa', 'Beer Sheva', 'Safed', 'Tiberias', 'Eilat', 'Hebron', 'Modiin', 'Petah Tikva', 'Ashdod', 'Netanya', 'Gush Etzion', 'Samaria', 'Gaza border area', 'Kiryat Shmona', 'Ashkelon', 'Kfar Saba', 'Bat Yam'],
      loc: 'en-GB', sep: ', ', year: function (y) { return String(y); },
      title: function (y) { return 'Special brit milah calendar – year ' + y; },
      sub: function (il, city) { return 'When the eighth day falls on Shabbat, a festival, Yom Kippur, Tisha B\'Av, Chanukah, Purim or a fast · ' + (il ? 'Land of Israel' : 'diaspora (including the second festival day)') + ' · sunset in ' + city; },
      th: ['Born', 'Eighth day', 'What is special'],
      alt: function (gs, day, heb, gs2) { return 'Caesarean section, or a birth at twilight on the evening of ' + gs + ': the brit is on ' + day + ', ' + heb + ' (' + gs2 + ')'; },
      born: function (a, b) { return a + ' before sunset, or ' + b + ' after nightfall'; },
      sunset: ' · sunset ', none: 'Nothing is selected. Tick above what to show.', rules: 'The laws in brief',
      ask: 'This is a summary for study and preparation. In every case, ask the rabbi.',
      foot: 'A gift with love from Gilad Rachamim, certified mohel · +972-58-404-9049 · hakelim.com/kodesh/britot-meyuchadot/en/',
      src: 'Source: ', sat: 'on Shabbat', yt: 'on a festival', yk: 'Yom Kippur', tb: 'Tisha B\'Av', chan: 'on Chanukah', purim: 'Purim', fast: 'on fasts',
      count: function (n, parts) { return n + ' special brit days' + (parts.length ? ': ' + parts.join(', ') : ''); },
      needTime: 'Enter the time of birth, or choose "before sunset" / "after nightfall".',
      whenNote: function (city, ss, tz, t, w) { return 'In ' + city + ' on that day: sunset ' + ss + ', nightfall ' + tz + '. A birth at ' + t + ' is ' + (w === 'day' ? 'before sunset.' : w === 'night' ? 'after nightfall, which means the next Hebrew day already.' : 'between sunset and nightfall: a doubt.'); },
      special: 'A special brit', usual: 'An ordinary brit', born2: 'Born: ', doubt: function (a, b) { return 'doubtful: ' + a + ' or ' + b; }, brit: 'The brit: ', dayN: function (n) { return ' · <b>day ' + n + '</b>'; },
      why: function (day, heb, names, doubt) { return 'The eighth day (' + day + ', ' + heb + ', ' + names + ') ' + (doubt ? 'is doubtful, and a doubt does not override Shabbat or a festival.' : 'is not suitable, because a brit after a cesarean section does not override Shabbat, a festival or Yom Kippur.'); },
      sunDay: function (city, t) { return 'Sunset in ' + city + ' on the day of the brit: ' + t + '. Perform the brit before then, with a safety margin.'; },
      plain: 'The eighth day does not fall on Shabbat, a festival, a fast, Chanukah or Purim.',
      sickAsk: 'A baby who is not healthy: according to the doctor and the mohel. In any doubt, ask the rabbi.',
      stuck: 'Something went wrong in the calculation. Please refresh the page.'
    }
  };
  var S = SP[L] || null;
  var HALX = (S && HAL_L[L]) || HAL;
  var KEY = 'kodesh-britot-meyuchadot';
  var st = { y: 0, il: 1, city: CITIES[0][0], f: { shabbat: 1, yt: 1, yk: 1, tb: 1, chanuka: 1, purim: 1, fast: 1 } };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var SEP = S ? S.sep : ' ';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ev(n, p) { if (window.kelimEv) window.kelimEv(n, p || {}); }
  var H, E;

  function loc() {
    var c = CITIES.filter(function (x) { return x[0] === st.city; })[0] || CITIES[0], ll = c[0].split(',').map(Number);
    return { name: S ? S.cities[CITIES.indexOf(c)] : c[1], l: new H.Location(ll[0], ll[1], true, 'Asia/Jerusalem', c[1], 'IL', undefined, 0) };
  }
  function hm(d) { return d && !isNaN(d) ? d.toLocaleTimeString(S ? S.loc : 'he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' }) : ''; }
  function zm(d) { var z = new H.Zmanim(loc().l, d, false); return { sunset: z.sunset(), tzeit: z.tzeit(8.5) }; }

  function halBlock(tags, extra) {
    var h = '';
    tags.concat(extra || []).forEach(function (t) {
      var x = HALX[t]; if (!x) return;
      h += '<div class="bm-hal"><b>' + esc(x.t) + '</b><ul>' + x.p.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
        (x.s ? '<p class="bm-src">' + (S ? S.src : 'מקור: ') + esc(x.s) + '</p>' : '') + '</div>';
    });
    return h;
  }
  function tagsOf(inf) {
    var t = inf.tags.slice();
    if (inf.tb && inf.tbNidche) t.push('tbNidche');
    return t.filter(function (x) { return !(x === 'tb' && inf.tbShabbat); });
  }
  function want(inf) {
    return inf.tags.some(function (t) { return st.f[t === 'shushan' ? 'purim' : t === 'tbShabbat' ? 'tb' : t]; });
  }

  // ---------- הרשימה לשנה ----------
  function draw() {
    var hy = st.y, rows = E.year(hy, !!st.il).filter(function (r) { return want(r.eighth); });
    var L0 = loc(), cnt = {}, h = '';
    h += '<div class="bm-head"><span class="bsd">בס"ד</span><h2>' + (S ? esc(S.title(hy)) : 'לוח בריתות מיוחדות – שנת ' + esc(H.gematriya(hy % 1000))) + '</h2>' +
      '<p>' + (S ? esc(S.sub(!!st.il, L0.name)) : 'מתי היום השמיני חל בשבת, ביום טוב, ביום כיפור, בתשעה באב, בחנוכה, בפורים או בצום · ' + (st.il ? 'ארץ ישראל' : 'חוץ לארץ (כולל יום טוב שני)') + ' · שקיעה ב' + esc(L0.name)) + '</p></div>';
    var month = '';
    rows.forEach(function (r) {
      var inf = r.eighth, hd = inf.hd, mname = hd.getMonthName();
      if (mname !== month) {
        if (month) h += '</tbody></table>';
        month = mname;
        h += '<h3 class="bm-m">' + esc(E.monthTitle(hd)) + '</h3>' +
          '<table class="bm-t"><thead><tr><th>' + (S ? S.th[0] : 'נולד') + '</th><th>' + (S ? S.th[1] : 'היום השמיני') + '</th><th>' + (S ? S.th[2] : 'מה מיוחד') + '</th></tr></thead><tbody>';
      }
      inf.tags.forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; });
      var bornHd = new H.HDate(r.born), z = inf.blocked ? zm(inf.d) : null;
      var alt = r.alt ? '<div class="bm-alt">' + (S ? esc(S.alt(E.gs(r.bornPrevEve), E.dayName(r.alt), E.hebStr(new H.HDate(r.alt)), E.gs(r.alt))) : 'ניתוח קיסרי, או לידה בבין השמשות ב-' + E.gs(r.bornPrevEve) + ' בערב: הברית ' + esc(E.dayName(r.alt)) + ' ' + esc(E.hebStr(new H.HDate(r.alt))) + ' (' + E.gs(r.alt) + ')') + '</div>' : '';
      h += '<tr class="' + (inf.blocked ? 'bl' : '') + '"><td><b>' + esc(E.dayName(r.born)) + SEP + esc(E.hebStr(bornHd)) + '</b><small>' + (S ? esc(S.born(E.gs(r.born), E.gs(r.bornPrevEve))) : E.gs(r.born) +
        ' לפני השקיעה, או ' + E.gs(r.bornPrevEve) + ' אחרי צאת הכוכבים') + '</small></td><td><b>' + esc(E.dayName(inf.d)) + SEP + esc(E.hebStr(hd)) + '</b><small>' + E.g(inf.d) +
        (z ? (S ? S.sunset : ' · שקיעה ') + hm(z.sunset) : '') + '</small></td><td>' + inf.names.map(function (n, i) { return '<span class="bm-tag t-' + esc(inf.tags[i] || '') + '">' + esc(n) + '</span>'; }).join(' ') + alt + '</td></tr>';
    });
    if (month) h += '</tbody></table>';
    if (!rows.length) h += '<p>' + (S ? S.none : 'לא נבחר שום סוג. סמנו למעלה מה להציג.') + '</p>';
    h += '<div class="bm-rules"><h3 class="bm-m">' + (S ? S.rules : 'ההלכות בקצרה') + '</h3>' + halBlock(['shabbat', 'yt', 'yk', 'tb', 'tbNidche', 'fast', 'chanuka', 'purim', 'bh', 'cs', 'sick']) +
      '<p class="bm-ask">' + (S ? S.ask : 'זה תקציר לעיון ולהכנה. בכל מקרה לשאול את הרב.') + '</p></div>';
    h += '<p class="bm-foot">' + (S ? S.foot : 'מתנה באהבה מגילעד רחמים, מוהל מוסמך · 058-404-9049 · hakelim.com/kodesh/britot-meyuchadot') + '</p>';
    out.innerHTML = h;
    var parts = [];
    if (S) {
      if (cnt.shabbat) parts.push(cnt.shabbat + ' ' + S.sat);
      if (cnt.yt) parts.push(cnt.yt + ' ' + S.yt);
      if (cnt.yk) parts.push(S.yk);
      if (cnt.tb || cnt.tbShabbat) parts.push(S.tb);
      if (cnt.chanuka) parts.push(cnt.chanuka + ' ' + S.chan);
      if (cnt.purim || cnt.shushan) parts.push(S.purim);
      if (cnt.fast) parts.push(cnt.fast + ' ' + S.fast);
      $('bm-count').textContent = S.count(rows.length, parts);
      return;
    }
    if (cnt.shabbat) parts.push(cnt.shabbat + ' בשבת');
    if (cnt.yt) parts.push(cnt.yt + ' ביום טוב');
    if (cnt.yk) parts.push('יום כיפור');
    if (cnt.tb || cnt.tbShabbat) parts.push('תשעה באב');
    if (cnt.chanuka) parts.push(cnt.chanuka + ' בחנוכה');
    if (cnt.purim || cnt.shushan) parts.push('פורים');
    if (cnt.fast) parts.push(cnt.fast + ' בצומות');
    $('bm-count').textContent = rows.length + ' ימי ברית מיוחדים' + (parts.length ? ': ' + parts.join(', ') : '');
  }

  // ---------- המחשבון ----------
  function calc() {
    var v = $('bm-birth').value, res = $('bm-res');
    if (!v) { res.hidden = true; return; }
    var p = v.split('-'), birth = new Date(+p[0], +p[1] - 1, +p[2], 12);
    var when = $('bm-when').value, note = '';
    if (when === 'time') {
      var t = $('bm-time').value;
      if (!t) { res.hidden = false; res.innerHTML = '<p>' + (S ? S.needTime : 'כתבו את שעת הלידה, או בחרו "לפני השקיעה" / "אחרי צאת הכוכבים".') + '</p>'; return; }
      var tp = t.split(':'), z = zm(birth), bt = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate(), +tp[0], +tp[1]);
      // השוואה בשעון ישראל: בונים את שעת הלידה כשעה מקומית בטלפון; מספיק לשימוש בארץ
      when = bt < z.sunset ? 'day' : bt >= z.tzeit ? 'night' : 'bh';
      note = S ? '<p class="bm-when">' + esc(S.whenNote(loc().name, hm(z.sunset), hm(z.tzeit), t, when)) + '</p>' : '<p class="bm-when">ב' + esc(loc().name) + ' באותו יום: שקיעה ' + hm(z.sunset) + ', צאת הכוכבים ' + hm(z.tzeit) + '. הלידה ב-' + esc(t) + ' – ' +
        (when === 'day' ? 'לפני השקיעה.' : when === 'night' ? 'אחרי צאת הכוכבים, כלומר כבר היום העברי הבא.' : 'בין השקיעה לצאת הכוכבים: ספק.') + '</p>';
    }
    var cs = $('bm-cs').checked, r = E.compute(birth, when, cs, !!st.il), bi = r.britInfo, inf = r.info;
    var special = bi.special || r.moved || r.doubt || inf.special;
    var h = note;
    h += '<p class="bm-big">' + (S ? (special ? S.special : S.usual) : (special ? 'ברית מיוחדת' : 'ברית רגילה')) + '</p>';
    h += '<p>' + (S ? S.born2 : 'נולד: ') + (r.doubt ? (S ? esc(S.doubt(E.hebStr(r.hebBirth), E.hebStr(r.hebBirth2))) : 'ספק ' + esc(E.hebStr(r.hebBirth)) + ' או ' + esc(E.hebStr(r.hebBirth2))) : esc(E.hebStr(r.hebBirth))) + '</p>';
    h += '<p>' + (S ? S.brit : 'הברית: ') + '<b>' + esc(E.dayName(r.brit)) + SEP + esc(E.hebFull(new H.HDate(r.brit))) + '</b> · ' + E.g(r.brit) +
      (r.dayNum !== 8 ? (S ? S.dayN(r.dayNum) : ' · <b>היום ה-' + r.dayNum + '</b>') : '') + '</p>';
    if (bi.names.length) h += '<p>' + bi.names.map(function (n, i) { return '<span class="bm-tag t-' + esc(bi.tags[i] || '') + '">' + esc(n) + '</span>'; }).join(' ') + '</p>';
    if (r.moved) h += S ? '<p class="bm-why">' + esc(S.why(E.dayName(r.eighth), E.hebStr(new H.HDate(r.eighth)), inf.names.join(', '), r.doubt)) + '</p>' : '<p class="bm-why">היום השמיני (' + esc(E.dayName(r.eighth)) + ' ' + esc(E.hebStr(new H.HDate(r.eighth))) + ', ' + esc(inf.names.join(', ')) + ') ' +
      (r.doubt ? 'הוא ספק, וספק לא דוחה שבת ויום טוב.' : 'לא מתאים, כי ברית של ניתוח קיסרי לא דוחה שבת, יום טוב ויום כיפור.') + '</p>';
    if (bi.blocked && !r.moved) { var zz = zm(r.brit); h += S ? '<p class="bm-why">' + esc(S.sunDay(loc().name, hm(zz.sunset))) + '</p>' : '<p class="bm-why">שקיעה ב' + esc(loc().name) + ' ביום הברית: ' + hm(zz.sunset) + '. לעשות את הברית לפני כן, עם מרווח ביטחון.</p>'; }
    var extra = [];
    if (r.doubt) extra.push('bh');
    if (cs) extra.push('cs');
    h += halBlock(tagsOf(bi), extra);
    if (!special) h += '<p>' + (S ? S.plain : 'היום השמיני לא חל בשבת, ביום טוב, בצום, בחנוכה או בפורים.') + '</p>';
    h += '<p class="bm-ask">' + (S ? S.sickAsk : 'תינוק שאינו בריא – לפי הרופא והמוהל. בכל ספק לשאול את הרב.') + '</p>';
    res.hidden = false;
    res.innerHTML = h;
    ev('bm_calc', { tool: 'britot_meyuchadot' + (S ? '_' + L : ''), special: special ? 1 : 0 });
  }

  function start() {
    H = window.hebcal; E = makeEngine(H, S ? L : 'he');
    var nowY = new H.HDate(new Date()).getFullYear();
    if (!st.y || st.y < nowY - 1 || st.y > nowY + 3) st.y = nowY;
    var ys = $('bm-year');
    ys.innerHTML = [nowY - 1, nowY, nowY + 1, nowY + 2].map(function (y) { return '<option value="' + y + '">' + (S ? y : H.gematriya(y % 1000)) + ' (' + new H.HDate(1, H.months.TISHREI, y).greg().getFullYear() + '–' + new H.HDate(29, H.months.ELUL, y).greg().getFullYear() + ')</option>'; }).join('');
    ys.value = st.y;
    var cs = $('bm-city'); cs.innerHTML = CITIES.map(function (c, i) { return '<option value="' + c[0] + '">' + (S ? S.cities[i] : c[1]) + '</option>'; }).join(''); cs.value = st.city;
    $('bm-il').value = st.il ? '1' : '0';
    document.querySelectorAll('[data-f]').forEach(function (b) { b.checked = !!st.f[b.getAttribute('data-f')]; });
    var b = $('bm-birth'); if (!b.value) { var t = new Date(); b.value = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); }
    function upd() {
      st.y = +ys.value; st.city = cs.value; st.il = $('bm-il').value === '1' ? 1 : 0;
      document.querySelectorAll('[data-f]').forEach(function (x) { st.f[x.getAttribute('data-f')] = x.checked ? 1 : 0; });
      save(); draw(); calc();
    }
    $('bm-form').addEventListener('change', upd);
    $('bm-calc').addEventListener('input', calc);
    $('bm-calc').addEventListener('change', function () { $('bm-time-f').hidden = $('bm-when').value !== 'time'; calc(); });
    $('bm-print').addEventListener('click', function () { ev('bm_print', { tool: 'britot_meyuchadot' + (S ? '_' + L : '') }); window.print(); });
    $('bm-time-f').hidden = $('bm-when').value !== 'time';
    draw(); calc();
  }
  function safeStart() { try { start(); } catch (e) { out.innerHTML = '<p class="disclaimer">' + (S ? S.stuck : 'משהו נתקע בחישוב. רעננו את הדף.') + '</p>'; if (window.console) console.error(e); } }
  if (window.hebcal) safeStart(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', safeStart); }
})(typeof window !== 'undefined' ? window : this);
