// English for the Hebrew calendar (/kodesh/luach-ivri/en/) and the date converter (/kodesh/taarich-ivri/en/).
// Words and date format only; all calculations stay in assets/kodesh-ivri.js (hebcal, Land of Israel custom).
// Loaded before kodesh-ivri.js in the browser and in node (tools/ivri_pages.js).
(function (root) {
  'use strict';
  var GM = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var HMN = { 1: 'Nisan', 2: 'Iyar', 3: 'Sivan', 4: 'Tammuz', 5: 'Av', 6: 'Elul', 7: 'Tishrei', 8: 'Cheshvan', 9: 'Kislev', 10: 'Tevet', 11: 'Shevat', 12: 'Adar', 13: 'Adar II' };
  // month names inside hebcal events ("Rosh Chodesh Kislev")
  var RC = { 'Cheshvan': 'Cheshvan', 'Kislev': 'Kislev', 'Tevet': 'Tevet', "Sh'vat": 'Shevat', 'Adar': 'Adar', 'Adar I': 'Adar I', 'Adar II': 'Adar II', 'Nisan': 'Nisan', 'Iyyar': 'Iyar', 'Sivan': 'Sivan', 'Tamuz': 'Tammuz', 'Av': 'Av', 'Elul': 'Elul', 'Tishrei': 'Tishrei' };
  // [short for the calendar cell, full for the list]
  var NAMES = {
    'Erev Rosh Hashana': ['Erev Rosh Hashanah', 'Erev Rosh Hashanah (eve of the Jewish New Year)'],
    'Tzom Gedaliah': ['Fast of Gedaliah', 'Fast of Gedaliah'],
    'Shabbat Shuva': ['Shabbat Shuvah', 'Shabbat Shuvah'],
    'Erev Yom Kippur': ['Erev Yom Kippur', 'Erev Yom Kippur'],
    'Yom Kippur': ['Yom Kippur', 'Yom Kippur (Day of Atonement)'],
    'Erev Sukkot': ['Erev Sukkot', 'Erev Sukkot'],
    'Shmini Atzeret': ['Simchat Torah', 'Shemini Atzeret and Simchat Torah'],
    'Yitzhak Rabin Memorial Day': ['Rabin Memorial Day', 'Yitzhak Rabin Memorial Day'],
    'Swords of Iron War Memorial Day': ['Swords of Iron Memorial', 'Swords of Iron War Memorial Day'],
    'Sigd': ['Sigd', 'Sigd'],
    "Asara B'Tevet": ['10 Tevet', 'Fast of the 10th of Tevet'],
    'Shabbat Shirah': ['Shabbat Shirah', 'Shabbat Shirah'],
    'Tu BiShvat': ['Tu BiShvat', 'Tu BiShvat, New Year of the Trees'],
    'Shabbat Shekalim': ['Shabbat Shekalim', 'Shabbat Shekalim'],
    'Family Day': ['Family Day', 'Family Day'],
    'Shabbat Zachor': ['Shabbat Zachor', 'Shabbat Zachor'],
    "Ta'anit Esther": ['Fast of Esther', 'Fast of Esther'],
    'Purim': ['Purim', 'Purim'],
    'Purim Katan': ['Purim Katan', 'Purim Katan'],
    'Shushan Purim': ['Shushan Purim', 'Shushan Purim (Purim in Jerusalem)'],
    'Shabbat Parah': ['Shabbat Parah', 'Shabbat Parah'],
    'Shabbat HaChodesh': ['Shabbat HaChodesh', 'Shabbat HaChodesh'],
    'Shabbat HaGadol': ['Shabbat HaGadol', 'Shabbat HaGadol'],
    'Yom HaAliyah': ['Yom HaAliyah', 'Yom HaAliyah (Aliyah Day)'],
    "Ta'anit Bechorot": ['Fast of the Firstborn', 'Fast of the Firstborn'],
    'Erev Pesach': ['Erev Passover', 'Erev Passover (Seder night)'],
    'Yom HaShoah': ['Yom HaShoah', 'Yom HaShoah (Holocaust Remembrance Day)'],
    'Yom HaZikaron': ['Yom HaZikaron', 'Yom HaZikaron (Israel Memorial Day)'],
    "Yom HaAtzma'ut": ['Independence Day', "Yom HaAtzma'ut (Israel Independence Day)"],
    'Pesach Sheni': ['Pesach Sheni', 'Pesach Sheni'],
    'Lag BaOmer': ['Lag BaOmer', 'Lag BaOmer'],
    'Yom Yerushalayim': ['Jerusalem Day', 'Yom Yerushalayim (Jerusalem Day)'],
    'Erev Shavuot': ['Erev Shavuot', 'Erev Shavuot'],
    'Shavuot': ['Shavuot', 'Shavuot'],
    'Tzom Tammuz': ['17 Tammuz', 'Fast of the 17th of Tammuz'],
    'Shabbat Chazon': ['Shabbat Chazon', 'Shabbat Chazon'],
    "Erev Tish'a B'Av": ["Erev Tisha B'Av", "Erev Tisha B'Av"],
    "Tish'a B'Av": ["Tisha B'Av", "Tisha B'Av (fast of the 9th of Av)"],
    'Shabbat Nachamu': ['Shabbat Nachamu', 'Shabbat Nachamu'],
    "Tu B'Av": ["Tu B'Av", "Tu B'Av"],
    'Leil Selichot': ['Selichot', 'First Selichot (Ashkenazi custom), Saturday night']
  };
  // hebcal parasha names are already English; a few common spellings
  var PARSHA = { 'Lech-Lecha': 'Lech Lecha', 'Chayei Sara': 'Chayei Sarah', 'Vezot Haberakhah': 'Vezot Haberachah' };
  // key = the Hebrew string in kodesh-ivri.js
  var T = {
    'שבת פרשת ': 'Shabbat, Torah portion ',
    'אין בחודש הזה חגים או מועדים מיוחדים.': 'No holidays or special days this month.',
    'פרשת השבוע: ': 'Torah portion of the week: ',
    'התאריך העברי מתחיל כבר בערב שלפני, עם השקיעה.': 'The Hebrew date begins the evening before, at sunset.',
    'ערב החג:': 'Holiday begins in the evening:', 'הצום נכנס בערב': 'Fast begins in the evening:', 'נר ראשון: בערב': 'First candle in the evening:', 'ליל הסדר: בערב': 'Seder night:',
    'נדחה ביום': 'moved by a day', 'השנה המועד הוזז ביום, בגלל השבת': 'this year the date moved by a day because of Shabbat',
    'חג או מועד': 'Holiday', 'תאריך לועזי': 'Date', 'שבתון': 'day off', 'יום טוב': 'Yom Tov',
    ' (אחרי השקיעה: כבר ': ' (after sunset it is already ',
    'חגים ומועדים: ': 'Holidays and special days: ', '<b>היום:</b> ': '<b>Today:</b> ',
    'עכשיו': 'Now',
    'ראש השנה': 'Rosh Hashanah (Jewish New Year)', 'צום גדליה': 'Fast of Gedaliah', 'יום הכיפורים': 'Yom Kippur (Day of Atonement)',
    'סוכות': 'Sukkot', 'חול המועד סוכות': 'Chol HaMoed Sukkot', 'שמחת תורה ושמיני עצרת': 'Simchat Torah and Shemini Atzeret',
    'חנוכה': 'Hanukkah', 'צום עשרה בטבת': 'Fast of the 10th of Tevet', 'ט״ו בשבט': 'Tu BiShvat', 'פורים קטן': 'Purim Katan',
    'תענית אסתר': 'Fast of Esther', 'פורים': 'Purim', 'שושן פורים (פורים בירושלים)': 'Shushan Purim (Purim in Jerusalem)',
    'פסח': 'Passover (Pesach)', 'חול המועד פסח': 'Chol HaMoed Pesach', 'שביעי של פסח': 'Seventh day of Passover',
    'יום הזיכרון לשואה ולגבורה': 'Yom HaShoah (Holocaust Remembrance Day)', 'יום הזיכרון לחללי מערכות ישראל': 'Yom HaZikaron (Israel Memorial Day)',
    'יום העצמאות': 'Israel Independence Day', 'ל״ג בעומר': 'Lag BaOmer', 'יום ירושלים': 'Jerusalem Day', 'שבועות': 'Shavuot',
    'שמיני עצרת': 'Shemini Atzeret', 'שמחת תורה': 'Simchat Torah', 'שביעי ואחרון של פסח': 'Last days of Passover',
    'צום י״ז בתמוז': 'Fast of the 17th of Tammuz', 'תשעה באב': "Tisha B'Av (fast of the 9th of Av)", 'ט״ו באב': "Tu B'Av"
  };
  function mon(m, leap) { return m === 12 && leap ? 'Adar I' : HMN[m]; }
  function ord(n) { var b = n % 100, a = n % 10; return n + (b > 10 && b < 14 ? 'th' : a === 1 ? 'st' : a === 2 ? 'nd' : a === 3 ? 'rd' : 'th'); }
  var L = {
    lang: 'en', GM: GM, WD: WD, COL: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], PARSHA: PARSHA, T: T,
    cap: function (s) { return s.charAt(0).toUpperCase() + s.slice(1); },
    mon: mon,
    heb: function (d, m, leap, y, noYear) { return d + ' ' + mon(m, leap) + (noYear ? '' : ' ' + y); },
    hspan: function (a, b, m, leap) { return a + '–' + b + ' ' + mon(m, leap); },
    greg: function (d) { return GM[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); },
    // short dates in US style: "Dec 19", "Dec 19, 2026", "Dec 5–12, 2026"
    dm: function (d) { return GM[d.getMonth()].slice(0, 3) + ' ' + d.getDate(); },
    dmy: function (d) { return GM[d.getMonth()].slice(0, 3) + ' ' + d.getDate() + ', ' + d.getFullYear(); },
    dspan: function (a, b) { return GM[a.getMonth()].slice(0, 3) + ' ' + a.getDate() + '–' + b.getDate() + ', ' + b.getFullYear(); },
    inDays: function (n) { return n === 1 ? 'Tomorrow' : 'In ' + n + ' days'; },
    label: function (ds, moved, kind) {
      var m, n, nm, mv = moved ? ' (moved)' : '';
      if ((m = /^Chanukah: (\d) Candles?$/.exec(ds))) {
        n = +m[1];
        return n === 1 ? { kind: 'holiday', short: 'Erev Hanukkah', txt: 'Erev Hanukkah: the first candle is lit tonight' }
          : { kind: 'holiday', short: 'Hanukkah, day ' + (n - 1), txt: 'Hanukkah, ' + ord(n - 1) + ' day: ' + ord(n) + ' candle tonight' };
      }
      if (ds === 'Chanukah: 8th Day') return { kind: 'holiday', short: 'Hanukkah, day 8', txt: 'Hanukkah, 8th day (Zot Hanukkah)' };
      if (/^Rosh Hashana \d+$/.test(ds)) return { kind: 'chag', short: 'Rosh Hashanah', txt: 'Rosh Hashanah, day 1' };
      if (ds === 'Rosh Hashana II') return { kind: 'chag', short: 'Rosh Hashanah', txt: 'Rosh Hashanah, day 2' };
      if ((m = /^(Sukkot|Pesach) (I|VII)$/.exec(ds))) {
        if (m[2] === 'I') return { kind: 'chag', short: m[1] === 'Pesach' ? 'Passover' : 'Sukkot', txt: m[1] === 'Pesach' ? 'Passover, first day' : 'Sukkot, first day' };
        return { kind: 'chag', short: '7th day of Passover', txt: 'Seventh day of Passover' };
      }
      if (/Hoshana Raba/.test(ds)) return { kind: 'moed', short: 'Hoshana Rabbah', txt: 'Hoshana Rabbah (Chol HaMoed Sukkot)' };
      if ((m = /^(Sukkot|Pesach) .*CH''M/.exec(ds))) return { kind: 'moed', short: 'Chol HaMoed', txt: 'Chol HaMoed ' + (m[1] === 'Pesach' ? 'Pesach' : 'Sukkot') + ' (intermediate days)' };
      if ((m = /^Rosh Chodesh (.+)$/.exec(ds))) return { kind: 'rc', short: 'Rosh Chodesh', txt: 'Rosh Chodesh ' + (RC[m[1]] || m[1]) + ' (new month)' };
      nm = NAMES[ds];
      return nm ? { kind: kind, short: nm[0], txt: nm[1] + mv } : { kind: kind, short: ds, txt: ds + mv };
    },
    yearLabel: function (mode) { return mode === 'h' ? 'Hebrew year' : 'Year'; },
    yearMsg: function (mode, a, b) { return (mode === 'h' ? 'Hebrew year from ' : 'Year from ') + a + ' to ' + b + '.'; },
    hagH: function (name, yrs, first) { return 'Jewish holidays ' + name + ': holidays ' + yrs + (first ? ' and days off in Israel' : ''); },
    printTitle: 'Hebrew calendar ', printFoot: 'hakelim.com/kodesh/luach-ivri/en · Land of Israel custom'
  };
  // Date converter (/kodesh/taarich-ivri/en/): words for assets/kodesh-taarich-l.js
  L.TI = {
    CITY: { 'yerushalaim': ['Jerusalem', 'in Jerusalem'], 'tel-aviv': ['Tel Aviv', 'in Tel Aviv'], 'haifa': ['Haifa', 'in Haifa'], 'beer-sheva': ['Beersheba', 'in Beersheba'],
      'netanya': ['Netanya', 'in Netanya'], 'ashdod': ['Ashdod', 'in Ashdod'], 'tveria': ['Tiberias', 'in Tiberias'], 'tzfat': ['Safed', 'in Safed'],
      'kiryat-shmona': ['Kiryat Shmona', 'in Kiryat Shmona'], 'eilat': ['Eilat', 'in Eilat'] },
    here: 'where you are',
    at: function (time, city) { return ' (' + time + ' ' + city + ')'; },
    shabbat: 'Shabbat',
    kStat: function (wd, g) { return 'Hebrew date: ' + wd + ', ' + g; },
    kToday: function (wd, g) { return 'Today, ' + wd + ', ' + g; },
    subTom: function (where, h) { return 'After sunset' + where + ', ' + h + ' begins.'; },
    kNow: function (where) { return 'Now, after sunset' + where; },
    subNow: function (wdNext, wd, dm, h) { return 'The evening that begins ' + wdNext + ' has already started: the Hebrew date changed at sunset. Today, ' + wd + ' ' + dm + ', until sunset it was ' + h + '.'; },
    txtToday: function (after) { return after ? 'Hebrew date now (after sunset)' : 'Hebrew date today'; },
    txtUrl: 'Hebrew date and date converter',
    thDay: 'Day', thHeb: 'Hebrew date', todayP: 'Today, ', tomP: 'Tomorrow, ',
    range: function (a, b) { return 'The converter works for dates from ' + a + ' to ' + b + '.'; },
    afterK: ', after sunset', afterT: 'after sunset',
    afterNote: function (wd) { return 'After sunset the next Hebrew day has already begun, so this is the date of ' + wd + '.'; },
    julian: 'Note: before 1582 Europe used the Julian calendar. This converter uses the modern Gregorian calendar.',
    errYear: function (a, b) { return 'Type a Hebrew year from ' + a + ' to ' + b + ', in numbers (for example 5787) or in Hebrew letters (תשפ״ז).'; },
    errAdar2: function (y) { return y + ' has no Adar II: it is a regular year with one Adar.'; },
    err30: function (m, y) { return m + ' ' + y + ' has only 29 days.'; },
    eve: function (wd, dm) { return 'The Hebrew date begins the evening before: ' + wd + ', ' + dm + ', at sunset.'; },
    bmRange: 'The calculator works for birth dates from 1900, and up to 14 years before 2099.',
    ex: function (girl, d) { return 'Example: a ' + (girl ? 'girl' : 'boy') + ' born on ' + d + '. Enter the birth date and the result updates.'; },
    hBirth: 'Hebrew birthday',
    afterBirth: ', after sunset (so the Hebrew date of the next day)',
    what: function (girl) { return girl ? 'Bat Mitzvah (age 12)' : 'Bar Mitzvah (age 13)'; },
    oblig: function (wd, dm) { return 'The obligation of the mitzvot begins the evening before, at nightfall: ' + wd + ', ' + dm + '.'; },
    satSame: function (sh) { return 'This day is Shabbat: ' + sh + '.'; },
    satNext: function (sh, d) { return 'The Shabbat after it: ' + sh + ', ' + d + '. This is usually the Shabbat of the aliyah to the Torah.'; },
    satAfterT: 'The Shabbat after it',
    hList: 'Hebrew birthdays in the coming years', thAge: 'Age', thG: 'Date',
    n30adar: 'The birth was on 30 Adar I, and a regular year has no such day. By the common calculation the day moves to 1 Nisan, but there are different opinions – ask a rabbi.',
    n30: function (m) { return 'This year ' + m + ' has no 30th day, so the date moves to the 1st of the next month.'; },
    nAdarToLeap: 'The birth was in Adar of a regular year. In a leap year the day falls in Adar II.',
    nAdar1: 'The birth was in Adar I. A regular year has one Adar, and the day falls in it.',
    nAdar2: 'The birth was in Adar II. A regular year has one Adar, and the day falls in it.',
    yzH: 'Hebrew date of passing', yzList: 'Yahrzeit in the coming years', yzNext: 'Next yahrzeit',
    yzEve: function (wd, dm) { return 'begins the evening before: ' + wd + ', ' + dm; },
    M: { gps: 'By my location', noGeo: 'This device does not share a location. Choose a city from the list.', locating: 'Locating…',
      found: 'Found ✓ Sunset is calculated for where you are.', geoFail: 'No location received. Allow location in the browser, or choose a city.',
      pickG: 'Choose a date.', shareG: 'Convert a date to the Hebrew calendar: ', leap: ', leap year',
      yearErr: 'Type the Hebrew year in numbers (5787) or in Hebrew letters (תשפ״ז).', shareH: 'Convert a Hebrew date to a regular date: ',
      shareB: 'Hebrew birthday and Bar Mitzvah date: ', shareBdef: 'Hebrew birthday, Bar Mitzvah and Bat Mitzvah calculator – free: ',
      shareY: 'Yahrzeit calculator: ', copied: 'Copied ✓' }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = L; else root.KODESH_IVRI_L = L;
})(this);
