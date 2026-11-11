// מחולל הזמנות לכל אירוע – הכלים של גילעד רחמים (/kelim/eruim/hazmana/)
// חתונה, בר ובת מצווה, אירוסין, חינה, שבע ברכות, יום הולדת, חלאקה, הכנסת ספר תורה וחנוכת בית.
// בלי הרשמה ובלי שרת: הפרטים נשמרים רק בטלפון (localStorage), והקישור לאורחים נושא אותם בתוך הכתובת (#d=...).
// שני מצבים באותו קובץ: המחולל (#eh-app) ודף האורחים (#eh-guest). הציור על canvas ‏1080×1350.
// מבוסס על מחולל הברית של המוהל (assets/hazmana.js), שנשאר כמו שהוא.
(function () {
  'use strict';
  var W = 1080, H = 1350;
  var SERIF = '"Frank Ruhl Libre", "David Libre", serif', SANS = '"Assistant", system-ui, sans-serif';
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var STORE = 'eruim-hazmana';
  var BASE_PATH = '/kelim/eruim/hazmana/';
  var CREDIT = 'הזמנה כזאת בחינם: hakelim.com/kelim/eruim/hazmana';

  // אישורי הגעה ולוח מעקב: Worker נפרד (tools/eruim-rsvp-worker). מקומית – wrangler dev על 8788.
  var API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:8788' : 'https://eruim-rsvp.gilad4049.workers.dev';
  var EV_STORE = 'eruim-hazmana-ev'; // {סוג: {id, tok, sig}} – האירוע ברשת, רק בטלפון של בעלי השמחה
  function api(path, body, method) {
    var o = { method: method || (body ? 'POST' : 'GET'), headers: {} };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(API + path, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ('שגיאה ' + r.status)); return j; }); });
  }
  var evts = {};
  try { evts = JSON.parse(localStorage.getItem(EV_STORE) || '{}') || {}; } catch (e) { evts = {}; }
  function saveEvts() { try { localStorage.setItem(EV_STORE, JSON.stringify(evts)); } catch (e) {} }
  function used(how, k) { try { if (window.toolUsed) window.toolUsed('eruim_hazmana', { how: how, kind: k }); } catch (e) {} }

  // ---------- תאריך עברי ----------
  var enFmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
  var MONTHS = { tishri: 'תשרי', tishrei: 'תשרי', heshvan: 'חשוון', cheshvan: 'חשוון', kislev: 'כסלו', tevet: 'טבת', shevat: 'שבט', 'adar i': 'אדר א׳', 'adar ii': 'אדר ב׳', adar: 'אדר', nisan: 'ניסן', iyar: 'אייר', sivan: 'סיוון', tamuz: 'תמוז', av: 'אב', elul: 'אלול' };
  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hunds = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    s += hunds[Math.floor(n / 100)]; n %= 100;
    if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else { s += tens[Math.floor(n / 10)]; s += ones[n % 10]; }
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  function hebrew(d) {
    var o = {};
    enFmt.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    var mon = MONTHS[(o.month || '').toLowerCase()] || o.month;
    return gem(parseInt(o.day, 10)) + ' ב' + mon + ' ' + gem(parseInt(o.year, 10) % 1000);
  }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null;
  }
  function greg(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function dateText(d, fm) {
    if (fm === 'greg') return greg(d);
    if (fm === 'heb') return hebrew(d);
    return hebrew(d) + ' (' + greg(d) + ')';
  }
  function hm(t) { return (t || '').replace(/^0(\d)/, '$1'); }
  function whenOf(s, fm) {
    var dt = parseDate(s);
    if (!dt) return '';
    return (dt.getDay() === 6 ? 'בשבת קודש, ' : 'ביום ' + DAYS[dt.getDay()] + ', ') + dateText(dt, fm);
  }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stripB(s) { return (s || '').replace(/^ב(?=בית|אולם)/, ''); }
  function clean(s) { return (s || '').trim(); }

  // ---------- פסוקים: כל אחד נבדק מול ספריא (tools/check_eruim_psukim.py, המקור ב-tools/eruim-hazmana-psukim-source.json) ----------
  // [טקסט בניקוד, איפה כתוב, ההפניה בספריא]. שם ה׳ נכתב ה׳.
  var PSUKIM = {
    kol: ['קוֹל שָׂשׂוֹן וְקוֹל שִׂמְחָה קוֹל חָתָן וְקוֹל כַּלָּה', 'ירמיהו לג, יא', 'Jeremiah 33:11'],
    matza: ['מָצָא אִשָּׁה מָצָא טוֹב', 'משלי יח, כב', 'Proverbs 18:22'],
    zehayom: ['זֶה הַיּוֹם עָשָׂה ה׳ נָגִילָה וְנִשְׂמְחָה בוֹ', 'תהלים קיח, כד', 'Psalms 118:24'],
    dodi: ['זֶה דוֹדִי וְזֶה רֵעִי', 'שיר השירים ה, טז', 'Song of Songs 5:16'],
    kechatan: ['כֶּחָתָן יְכַהֵן פְּאֵר וְכַכַּלָּה תַּעְדֶּה כֵלֶיהָ', 'ישעיהו סא, י', 'Isaiah 61:10'],
    achim: ['הִנֵּה מַה טּוֹב וּמַה נָּעִים שֶׁבֶת אַחִים גַּם יָחַד', 'תהלים קלג, א', 'Psalms 133:1'],
    torah: ['תּוֹרָה צִוָּה לָנוּ מֹשֶׁה מוֹרָשָׁה קְהִלַּת יַעֲקֹב', 'דברים לג, ד', 'Deuteronomy 33:4'],
    etz: ['עֵץ חַיִּים הִיא לַמַּחֲזִיקִים בָּהּ', 'משלי ג, יח', 'Proverbs 3:18'],
    chanoch: ['חֲנֹךְ לַנַּעַר עַל פִּי דַרְכּוֹ', 'משלי כב, ו', 'Proverbs 22:6'],
    lekach: ['כִּי לֶקַח טוֹב נָתַתִּי לָכֶם תּוֹרָתִי אַל תַּעֲזֹבוּ', 'משלי ד, ב', 'Proverbs 4:2'],
    kvuda: ['כָּל כְּבוּדָּה בַת מֶלֶךְ פְּנִימָה', 'תהלים מה, יד', 'Psalms 45:14'],
    bruchah: ['בְּרוּכָה אַתְּ לַה׳ בִּתִּי', 'רות ג, י', 'Ruth 3:10'],
    rabot: ['רַבּוֹת בָּנוֹת עָשׂוּ חָיִל וְאַתְּ עָלִית עַל כֻּלָּנָה', 'משלי לא, כט', 'Proverbs 31:29'],
    higdil: ['הִגְדִּיל ה׳ לַעֲשׂוֹת עִמָּנוּ הָיִינוּ שְׂמֵחִים', 'תהלים קכו, ג', 'Psalms 126:3'],
    banim: ['וּרְאֵה בָנִים לְבָנֶיךָ שָׁלוֹם עַל יִשְׂרָאֵל', 'תהלים קכח, ו', 'Psalms 128:6'],
    baruch: ['בָּרוּךְ הַבָּא בְּשֵׁם ה׳', 'תהלים קיח, כו', 'Psalms 118:26'],
    mizmor: ['מִזְמוֹר שִׁיר חֲנֻכַּת הַבַּיִת לְדָוִד', 'תהלים ל, א', 'Psalms 30:1'],
    chochma: ['בְּחָכְמָה יִבָּנֶה בָּיִת וּבִתְבוּנָה יִתְכּוֹנָן', 'משלי כד, ג', 'Proverbs 24:3'],
    imhashem: ['אִם ה׳ לֹא יִבְנֶה בַיִת שָׁוְא עָמְלוּ בוֹנָיו בּוֹ', 'תהלים קכז, א', 'Psalms 127:1']
  };

  // ---------- השדות ----------
  // [תווית, דוגמה בשדה, סוג]. כל סוג אירוע בוחר שדות ויכול לשנות תווית (lab) או דוגמה (ph).
  var FIELDS = {
    nm1: ['שם', 'דניאל', 'text'], nm2: ['שם', 'נועה', 'text'],
    p1: ['שמות ההורים', 'רינה ויוסי', 'text'], p2: ['הורים', 'מיכל ודוד לוי', 'text'],
    fam: ['שם המשפחה', 'כהן', 'text'], gp: ['הסבים והסבתות', 'משפחות כהן, לוי ואברהם', 'text'],
    host: ['מי מזמין', 'משפחת כהן', 'text'], age: ['גיל', '40', 'text'], lzn: ['לעילוי נשמת / לזכות', 'לעילוי נשמת אבינו ר׳ משה בן שרה ז״ל', 'text'],
    dt: ['תאריך', '', 'date'], tm: ['שעה', '', 'time'], t2: ['שעה נוספת', '', 'time'],
    pl: ['המקום', 'אולמי הגן', 'text'], pl2: ['מקום נוסף', '', 'text'], ad: ['כתובת', 'רחוב הרב קוק 5, ירושלים', 'text'],
    a_dt: ['תאריך העלייה לתורה', '', 'date'], a_par: ['פרשת השבוע', 'וירא', 'text'], a_pl: ['בית הכנסת', 'אוהל יצחק', 'text']
  };
  var OPT = { gp: 1, age: 1, lzn: 1, t2: 1, pl2: 1, host: 1 };

  function names2(a, b) { a = clean(a); b = clean(b); return a && b ? a + ' ו' + b : a || b; }
  function famSign(d) {
    var par = clean(d.p1), fam = clean(d.fam);
    if (par && fam) return par + ' ' + fam;
    if (fam) return 'משפחת ' + fam;
    return par;
  }
  function timeLine(a, ta, b, tb) {
    if (ta && tb) return a + ' ' + hm(ta) + ' · ' + b + ' ' + hm(tb);
    if (tb) return b + ' בשעה ' + hm(tb);
    return ta ? 'בשעה ' + hm(ta) : 'בשעה ___';
  }
  var BLESS = 'בשבח והודיה לה׳ יתברך';

  // ---------- סוגי האירועים ----------
  // open: שורות לפני השם הגדול · big: השם הגדול · after: שורות מתחתיו · time/place: שורות המועד · sign: חתימה
  var KINDS = {
    chatuna: {
      name: 'חתונה', of: 'לחתונה', the: 'החתונה', hours: 5,
      f: ['nm1', 'nm2', 'p1', 'p2', 'gp', 'dt', 'tm', 't2', 'pl', 'ad'],
      lab: { nm1: 'שם החתן', nm2: 'שם הכלה', p1: 'הורי החתן', p2: 'הורי הכלה', dt: 'תאריך החתונה', tm: 'קבלת פנים', t2: 'חופה וקידושין', pl: 'האולם' },
      ph: { nm1: 'אביתר', nm2: 'נועה', p1: 'רינה ויוסי כהן' },
      vs: ['kol', 'matza', 'zehayom', 'kechatan'], v0: 1,
      open: function () { return [BLESS, 'אנו מתכבדים להזמינכם לשמחת נישואי ילדינו']; },
      big: function (d) { return names2(d.nm1, d.nm2) || 'החתונה'; },
      time: function (d) { return timeLine('קבלת פנים', d.tm, 'חופה', d.t2); },
      sign: function (d) { return [clean(d.p1), clean(d.p2)].filter(String); },
      end: 'נשמח לראותכם בשמחתנו',
      demo: { nm1: 'אביתר', nm2: 'נועה', p1: 'רינה ויוסי כהן', p2: 'מיכל ודוד לוי', tm: '19:00', t2: '20:00', pl: 'אולמי הגן', ad: 'דרך חברון 101, ירושלים', st: 'zahav' }
    },
    'bar-mitzva': {
      name: 'בר מצווה', of: 'לבר מצווה', the: 'בר המצווה', hours: 4,
      f: ['nm1', 'p1', 'fam', 'dt', 'tm', 'pl', 'ad', 'a_dt', 'a_par', 'a_pl'],
      lab: { nm1: 'שם חתן בר המצווה', dt: 'תאריך המסיבה', tm: 'שעת המסיבה', pl: 'מקום המסיבה' },
      ph: { nm1: 'יהונתן' },
      vs: ['torah', 'etz', 'lekach', 'chanoch'], v0: 1,
      open: function () { return [BLESS, 'אנו שמחים להזמינכם לשמחת בר המצווה של בננו']; },
      big: function (d) { return clean(d.nm1) || 'בר מצווה'; },
      after: function (d) {
        var a = [], w = whenOf(d.a_dt, d.fm);
        if (w || d.a_par || d.a_pl) {
          a.push('העלייה לתורה' + (d.a_par ? ' בפרשת ' + clean(d.a_par) : ''));
          var x = [w, d.a_pl ? 'בבית הכנסת ' + clean(d.a_pl).replace(/^בית הכנסת\s*/, '') : ''].filter(String).join(', ');
          if (x) a.push(x);
        }
        return a;
      },
      afterSlot: 'end',
      time: function (d) { return timeLine('', d.tm); },
      sign: function (d) { var s = famSign(d); return s ? [s] : []; },
      end: 'נשמח לראותכם בשמחתנו',
      demo: { nm1: 'יהונתן', p1: 'שירה ואלעד', fam: 'אברהם', tm: '19:30', pl: 'אולם השמחות "ברכת שלום"', ad: 'הנביאים 20, בית שמש', a_pl: 'אוהל יצחק', st: 'sfaradi' }
    },
    'bat-mitzva': {
      name: 'בת מצווה', of: 'לבת מצווה', the: 'בת המצווה', hours: 4,
      f: ['nm1', 'p1', 'fam', 'dt', 'tm', 'pl', 'ad'],
      lab: { nm1: 'שם כלת בת המצווה', dt: 'תאריך המסיבה', tm: 'שעת המסיבה', pl: 'מקום המסיבה' },
      ph: { nm1: 'הדס' },
      vs: ['kvuda', 'bruchah', 'rabot'], v0: 1,
      open: function () { return [BLESS, 'אנו שמחים להזמינכם לשמחת בת המצווה של בתנו']; },
      big: function (d) { return clean(d.nm1) || 'בת מצווה'; },
      time: function (d) { return timeLine('', d.tm); },
      sign: function (d) { var s = famSign(d); return s ? [s] : []; },
      end: 'נשמח לראותכם בשמחתנו',
      demo: { nm1: 'הדס', p1: 'אורית ואבי', fam: 'מזרחי', tm: '18:30', pl: 'גן האירועים "שקד"', ad: 'הרימון 4, מודיעין', st: 'prachim' }
    },
    erusin: {
      name: 'אירוסין', of: 'לאירוסין', the: 'האירוסין', hours: 3,
      vr: ['שמחת האירוסין', 'ווארט', 'מסיבת האירוסין'],
      f: ['nm1', 'nm2', 'p1', 'p2', 'dt', 'tm', 'pl', 'ad'],
      lab: { nm1: 'שם החתן', nm2: 'שם הכלה', p1: 'הורי החתן', p2: 'הורי הכלה', vr: 'איך קוראים לשמחה?' },
      vs: ['matza', 'dodi', 'zehayom'], v0: 1,
      open: function (d) { return [BLESS, 'אנו שמחים להזמינכם ל' + (d.vr || 'שמחת האירוסין') + ' של ילדינו']; },
      big: function (d) { return names2(d.nm1, d.nm2) || 'אירוסין'; },
      time: function (d) { return timeLine('', d.tm); },
      sign: function (d) { return [clean(d.p1), clean(d.p2)].filter(String); },
      end: 'נשמח לראותכם',
      demo: { nm1: 'אליה', nm2: 'תהילה', p1: 'משפחת פרץ', p2: 'משפחת ביטון', tm: '20:00', pl: 'בבית משפחת ביטון', ad: 'הדקל 12, אשדוד', st: 'modern' }
    },
    china: {
      name: 'חינה', of: 'לחינה', the: 'החינה', hours: 4,
      f: ['nm1', 'nm2', 'p1', 'p2', 'dt', 'tm', 'pl', 'ad'],
      lab: { nm1: 'שם החתן', nm2: 'שם הכלה', p1: 'הורי החתן', p2: 'הורי הכלה', dt: 'תאריך החינה', tm: 'שעת החינה' },
      vs: ['kol', 'kechatan', 'zehayom'], v0: 1,
      open: function () { return [BLESS, 'אנו שמחים להזמינכם לערב החינה של']; },
      big: function (d) { return names2(d.nm1, d.nm2) || 'ערב החינה'; },
      time: function (d) { return timeLine('', d.tm); },
      sign: function (d) { return [clean(d.p1), clean(d.p2)].filter(String); },
      end: 'נשמח לשמוח איתכם',
      demo: { nm1: 'שלום', nm2: 'אורטל', p1: 'משפחת אוחיון', p2: 'משפחת דהן', tm: '20:00', pl: 'אולם "אור החיים"', ad: 'שדרות ירושלים 30, נתיבות', st: 'sfaradi' }
    },
    'sheva-brachot': {
      name: 'שבע ברכות', of: 'לשבע ברכות', the: 'שבע הברכות', hours: 3,
      vr: ['סעודת שבע ברכות', 'שבת חתן', 'שבת כלה', 'שבת שבע ברכות'],
      f: ['nm1', 'nm2', 'host', 'dt', 'tm', 'pl', 'ad'],
      lab: { nm1: 'שם החתן', nm2: 'שם הכלה', host: 'המארחים', vr: 'איזו שמחה?' },
      ph: { host: 'משפחת אברהם' },
      vs: ['kol', 'kechatan', 'achim'], v0: 1,
      open: function (d) { return [BLESS, 'אנו שמחים להזמינכם ל' + (d.vr || 'סעודת שבע ברכות') + ' לכבוד החתן והכלה']; },
      big: function (d) { return names2(d.nm1, d.nm2) || 'שבע ברכות'; },
      time: function (d) { return timeLine('', d.tm); },
      sign: function (d) { return d.host ? [clean(d.host)] : []; },
      end: 'נשמח לראותכם',
      demo: { nm1: 'אביתר', nm2: 'נועה', host: 'משפחת שטרן', tm: '19:30', pl: 'בבית משפחת שטרן', ad: 'האלה 7, אלון שבות', st: 'yerushalmi' }
    },
    'yom-huledet': {
      name: 'יום הולדת', of: 'ליום הולדת', the: 'יום ההולדת', hours: 3,
      f: ['nm1', 'age', 'host', 'dt', 'tm', 'pl', 'ad'],
      lab: { nm1: 'של מי יום ההולדת?', age: 'בן / בת כמה?', host: 'מי מזמין' },
      ph: { nm1: 'סבתא רחל', age: '80', host: 'הילדים והנכדים' },
      vs: ['zehayom', 'higdil', 'baruch'], v0: 0,
      open: function () { return ['בואו לשמוח איתנו', 'במסיבת יום ההולדת']; },
      big: function (d) { return clean(d.nm1) || 'יום הולדת'; },
      after: function (d) { var a = clean(d.age); return [a ? 'חוגגים ' + a + '!' : 'חוגגים יום הולדת שמח']; },
      will: 'ניפגש בעזרת ה׳',
      time: function (d) { return timeLine('', d.tm); },
      sign: function (d) { return d.host ? [clean(d.host)] : []; },
      end: 'מחכים לכם!',
      demo: { nm1: 'סבתא רחל', age: '80', host: 'הילדים, הנכדים והנינים', tm: '18:00', pl: 'מסעדת "הגפן"', ad: 'יפו 50, ירושלים', st: 'zayit' }
    },
    chalake: {
      name: 'חלאקה', of: 'לחלאקה', the: 'החלאקה', hours: 3,
      vr: ['חלאקה', 'חאלקה', 'תספורת', 'אפשערניש'],
      f: ['nm1', 'p1', 'fam', 'dt', 'tm', 'pl', 'ad'],
      lab: { nm1: 'שם הילד', vr: 'איך קוראים לשמחה אצלכם?', dt: 'תאריך', tm: 'שעה' },
      ph: { nm1: 'שמואל' },
      vs: ['chanoch', 'torah', 'banim'], v0: 1,
      open: function (d) { return [BLESS, 'אנו שמחים להזמינכם ל' + (d.vr || 'חלאקה') + ' של בננו']; },
      big: function (d) { return clean(d.nm1) || 'חלאקה'; },
      after: function () { return ['במלאת לו שלוש שנים']; },
      time: function (d) { return timeLine('', d.tm); },
      sign: function (d) { var s = famSign(d); return s ? [s] : []; },
      end: 'נשמח לראותכם',
      demo: { nm1: 'שמואל', p1: 'אסתר ונתנאל', fam: 'גבאי', tm: '17:00', pl: 'בבית הכנסת "אהבת ציון"', ad: 'הרב קוק 8, רחובות', st: 'lavan' }
    },
    'sefer-torah': {
      name: 'הכנסת ספר תורה', of: 'להכנסת ספר תורה', the: 'הכנסת ספר התורה', hours: 4,
      f: ['host', 'lzn', 'dt', 'tm', 'pl', 'pl2', 'ad'],
      lab: { host: 'המזמינים', tm: 'יציאת התהלוכה', pl: 'מאיפה יוצאים', pl2: 'לאיזה בית כנסת', ad: 'כתובת היציאה' },
      ph: { host: 'משפחת כהן וקהילת "אוהל משה"', pl: 'מבית משפחת כהן, רחוב הגפן 3', pl2: 'בית הכנסת "אוהל משה"' },
      vs: ['etz', 'torah', 'lekach'], v0: 1,
      open: function () { return [BLESS, 'אנו מתכבדים להזמינכם לשמחת']; },
      big: function () { return 'הכנסת ספר תורה'; },
      after: function (d) { return d.lzn ? [clean(d.lzn)] : []; },
      time: function (d) { return d.tm ? 'יציאת התהלוכה בשעה ' + hm(d.tm) : 'בשעה ___'; },
      place: function (d) {
        var a = [];
        if (d.pl) a.push('יציאה ' + (/^מ/.test(clean(d.pl)) ? '' : 'מ') + clean(d.pl));
        if (d.pl2) a.push('אל ' + clean(d.pl2));
        return a.length ? a : ['המקום ___'];
      },
      sign: function (d) { return d.host ? [clean(d.host)] : []; },
      end: 'נשמח לראותכם ולשמוח יחד בשמחת התורה',
      demo: { host: 'משפחת כהן וקהילת "אוהל משה"', lzn: 'לעילוי נשמת אבינו ר׳ משה בן שרה ז״ל', tm: '16:30', pl: 'מבית משפחת כהן, הגפן 3', pl2: 'בית הכנסת "אוהל משה"', ad: 'הגפן 3, פתח תקווה', st: 'yerushalmi' }
    },
    'chanukat-bayit': {
      name: 'חנוכת בית', of: 'לחנוכת בית', the: 'חנוכת הבית', hours: 3,
      f: ['host', 'dt', 'tm', 'pl', 'ad'],
      lab: { host: 'מי מזמין', pl: 'איפה' },
      ph: { host: 'משפחת לוי', pl: 'בביתנו החדש' },
      vs: ['mizmor', 'chochma', 'imhashem'], v0: 1,
      open: function () { return [BLESS, 'אנו שמחים להזמינכם לשמחת']; },
      big: function () { return 'חנוכת הבית'; },
      time: function (d) { return timeLine('', d.tm); },
      sign: function (d) { return d.host ? [clean(d.host)] : []; },
      end: 'נשמח לראותכם בביתנו',
      demo: { host: 'יעל ואורי לוי', tm: '19:30', pl: 'בביתנו החדש', ad: 'הזית 14, חריש', st: 'layla' }
    }
  };
  var ORDER_K = ['chatuna', 'bar-mitzva', 'bat-mitzva', 'erusin', 'china', 'sheva-brachot', 'yom-huledet', 'chalake', 'sefer-torah', 'chanukat-bayit'];
  function kindOf(d) { return KINDS[d && d.k] || KINDS.chatuna; }

  // ---------- הנוסח ----------
  function whenText(d) { return whenOf(d.dt, d.fm) || 'ביום ___'; }
  function placeLines(d) {
    var K = kindOf(d);
    if (K.place) return K.place(d);
    return [d.pl ? stripB(clean(d.pl)) : 'המקום ___'];
  }
  function verseOf(d) {
    var K = kindOf(d), v = d.vs === undefined || d.vs === '' ? K.v0 : +d.vs;
    var key = v ? K.vs[v - 1] : null;
    return key ? PSUKIM[key] : null;
  }
  function endText(d) { return d.end === undefined ? kindOf(d).end : clean(d.end); }
  function signLines(d) { return kindOf(d).sign(d); }
  function titleOf(d) { var K = kindOf(d), b = K.big(d); return K.name + (b && b !== K.name && b !== 'ה' + K.name ? ' – ' + b : ''); }

  function blocks(d, th) {
    var b = [], K = kindOf(d), T = th.titleFont, B = th.bodyFont;
    var v = verseOf(d);
    if (v) { b.push({ t: v[0], size: 36, w: 400, f: SERIF, c: th.accent, gap: 0 }); b.push({ t: v[1], size: 24, w: 400, f: SANS, c: th.muted, gap: 6 }); }
    K.open(d).forEach(function (t, i) { b.push({ t: t, size: 40, w: i ? 400 : 500, f: B, c: th.text, gap: i ? 8 : (v ? 40 : 0) }); });
    var big = K.big(d);
    b.push({ t: big, size: big.length > 16 ? 96 : 116, w: 700, f: T, c: th.title, gap: 30, lh: 1.15 });
    var after = K.after && K.afterSlot !== 'end' ? K.after(d) : [];
    after.forEach(function (t, i) { b.push({ t: t, size: i ? 34 : 46, w: i ? 400 : 600, f: T, c: th.title, gap: i ? 4 : 6, lh: 1.2 }); });
    b.push({ sep: true, gap: 12 });
    b.push({ t: K.will || 'שתתקיים בעזרת ה׳', size: 38, w: 400, f: B, c: th.text, gap: 18 });
    b.push({ t: whenText(d), size: 50, w: 600, f: B, c: th.strong, gap: 8 });
    b.push({ t: K.time(d), size: 46, w: 600, f: B, c: th.strong, gap: 6 });
    placeLines(d).forEach(function (t, i) { b.push({ t: t, size: i ? 40 : 46, w: 500, f: B, c: th.text, gap: i ? 4 : 28 }); });
    if (d.ad) b.push({ t: clean(d.ad), size: 34, w: 400, f: SANS, c: th.muted, gap: 4 });
    if (K.after && K.afterSlot === 'end') K.after(d).forEach(function (t, i) { b.push({ t: t, size: 34, w: i ? 400 : 600, f: B, c: th.text, gap: i ? 4 : 26 }); });
    if (d.fr) b.push({ t: clean(d.fr), size: 34, w: 400, f: B, c: th.text, gap: 24 });
    var end = endText(d);
    if (end) b.push({ t: end, size: 38, w: 500, f: B, c: th.text, gap: 30 });
    var sg = signLines(d);
    sg.forEach(function (t, i) { b.push({ t: t, size: sg.length > 1 ? 44 : 50, w: 600, f: T, c: th.title, gap: i ? 6 : 36 }); });
    if (d.gp) b.push({ t: clean(d.gp), size: 30, w: 400, f: B, c: th.muted, gap: 10 });
    return b;
  }

  // ---------- עיצובים ----------
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function diamond(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill(); }
  function star8(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 16; i++) { var a = Math.PI / 8 * i, r2 = i % 2 ? r * 0.55 : r; ctx.lineTo(x + r2 * Math.cos(a), y + r2 * Math.sin(a)); }
    ctx.closePath();
  }
  function star5(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + Math.PI / 5 * i, r2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + r2 * Math.cos(a), y + r2 * Math.sin(a)); }
    ctx.closePath(); ctx.fill();
  }
  function leaf(ctx, x, y, len, ang, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.28, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.28, 0, 0); ctx.fill();
    ctx.restore();
  }
  function sprig(ctx, x, y, ang, scale) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(scale, scale);
    ctx.strokeStyle = '#8fa58b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(120, 30, 260, 10); ctx.stroke();
    for (var i = 0; i < 6; i++) {
      var t = 30 + i * 40;
      leaf(ctx, t, 8 + i * 1.5, 70 - i * 6, -0.9 + (i % 2) * 0.15, i % 2 ? '#a9bda4' : '#9db39a');
      leaf(ctx, t + 18, 12, 62 - i * 6, 0.85, '#b7c8b2');
    }
    [[80, -40], [175, -30], [250, 36], [140, 58]].forEach(function (p, k) {
      for (var j = 0; j < 5; j++) { var a = j * 2 * Math.PI / 5; ctx.fillStyle = k % 2 ? '#efc9c2' : '#e7b7b0'; ctx.beginPath(); ctx.arc(p[0] + 13 * Math.cos(a), p[1] + 13 * Math.sin(a), 11, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#d9a35c'; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 7); ctx.fill();
    });
    ctx.restore();
  }
  function olive(ctx, x, y, ang, scale) { // ענף זית: עלים צרים ושני זיתים
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(scale, scale);
    ctx.strokeStyle = '#6f7a46'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(140, 20, 280, 0); ctx.stroke();
    for (var i = 0; i < 7; i++) {
      var t = 25 + i * 36;
      leaf(ctx, t, 2, 64 - i * 4, -0.7, i % 2 ? '#7f8b52' : '#8e9a5e');
      leaf(ctx, t + 14, 4, 58 - i * 4, 0.7, '#9aa66a');
    }
    ctx.fillStyle = '#4a5230'; ctx.beginPath(); ctx.ellipse(120, 26, 11, 15, 0.3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(205, -22, 10, 14, -0.3, 0, 7); ctx.fill();
    ctx.restore();
  }

  var THEMES = {
    zahav: {
      name: 'קלאסי זהב', titleFont: SERIF, bodyFont: SERIF,
      title: '#dcbb74', text: '#efe6d2', strong: '#fbf5e7', muted: '#a99c82', accent: '#c9a55c', box: [130, 150, 130, 150],
      bg: function (ctx) {
        ctx.fillStyle = '#16130f'; ctx.fillRect(0, 0, W, H);
        var g = ctx.createRadialGradient(W * 0.75, 0, 50, W * 0.75, 0, 1100); g.addColorStop(0, 'rgba(201,165,92,.22)'); g.addColorStop(1, 'rgba(201,165,92,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#c9a55c'; ctx.lineWidth = 3; ctx.strokeRect(46, 46, W - 92, H - 92);
        ctx.lineWidth = 1.5; ctx.strokeRect(62, 62, W - 124, H - 124);
        ctx.fillStyle = '#c9a55c';
        [[46, 46], [W - 46, 46], [46, H - 46], [W - 46, H - 46]].forEach(function (p) { diamond(ctx, p[0], p[1], 14); });
      },
      sep: function (ctx, y) {
        var g = ctx.createLinearGradient(W / 2 - 220, 0, W / 2 + 220, 0); g.addColorStop(0, 'rgba(201,165,92,0)'); g.addColorStop(0.5, '#c9a55c'); g.addColorStop(1, 'rgba(201,165,92,0)');
        ctx.fillStyle = g; ctx.fillRect(W / 2 - 220, y, 440, 2); ctx.fillStyle = '#c9a55c'; diamond(ctx, W / 2, y + 1, 8);
      }
    },
    modern: {
      name: 'מודרני נקי', titleFont: SANS, bodyFont: SANS,
      title: '#111111', text: '#2a2a2a', strong: '#111111', muted: '#7a7a7a', accent: '#a8843f', box: [200, 150, 160, 150], creditY: H - 116, bsd: [W / 2, 145, 'center'],
      bg: function (ctx) {
        ctx.fillStyle = '#fbfaf7'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#111'; ctx.fillRect(W / 2 - 40, 84, 80, 4); ctx.fillRect(W / 2 - 40, H - 88, 80, 4);
      },
      sep: function (ctx, y) { ctx.fillStyle = '#a8843f'; ctx.fillRect(W / 2 - 60, y, 120, 3); }
    },
    yerushalmi: {
      name: 'ירושלמי', titleFont: SERIF, bodyFont: SERIF,
      title: '#7a5426', text: '#4a3a24', strong: '#3a2c18', muted: '#7d6a4c', accent: '#8a6a3a', box: [250, 150, 130, 150], bsd: [W / 2, 182, 'center'],
      bg: function (ctx) {
        var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f1e6cc'); g.addColorStop(1, '#e3d1aa');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(122,84,38,.08)'; ctx.lineWidth = 2;
        for (var row = 0, y = 0; y < H; row++, y += 90) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
          for (var x = (row % 2) * 90; x < W; x += 180) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 90); ctx.stroke(); }
        }
        ctx.fillStyle = 'rgba(251,245,231,.82)';
        var L = 70, R = W - 70, top = 70, bot = H - 70, cx = W / 2;
        ctx.beginPath(); ctx.moveTo(L, bot); ctx.lineTo(L, 380); ctx.quadraticCurveTo(L, top, cx, top); ctx.quadraticCurveTo(R, top, R, 380); ctx.lineTo(R, bot); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(L + 16, bot - 16); ctx.lineTo(L + 16, 384); ctx.quadraticCurveTo(L + 16, top + 16, cx, top + 16); ctx.quadraticCurveTo(R - 16, top + 16, R - 16, 384); ctx.lineTo(R - 16, bot - 16); ctx.closePath();
        ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = '#8a6a3a'; diamond(ctx, cx, top + 50, 10);
      },
      sep: function (ctx, y) { ctx.fillStyle = '#8a6a3a'; ctx.fillRect(W / 2 - 150, y, 300, 2); diamond(ctx, W / 2 - 160, y + 1, 6); diamond(ctx, W / 2 + 160, y + 1, 6); }
    },
    prachim: {
      name: 'פרחוני עדין', titleFont: SERIF, bodyFont: SERIF,
      title: '#a2645d', text: '#4b4a45', strong: '#34332f', muted: '#86837a', accent: '#8fa58b', box: [230, 150, 210, 150], bsd: [W / 2, 130, 'center'],
      bg: function (ctx) {
        ctx.fillStyle = '#fdf8f3'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(162,100,93,.35)'; ctx.lineWidth = 2; rr(ctx, 50, 50, W - 100, H - 100, 40); ctx.stroke();
        sprig(ctx, W - 60, 70, Math.PI * 0.8, 1.15);
        sprig(ctx, 60, H - 70, -Math.PI * 0.2, 1.15);
      },
      sep: function (ctx, y) {
        ctx.fillStyle = '#e7b7b0';
        for (var j = 0; j < 5; j++) { var a = j * 2 * Math.PI / 5; ctx.beginPath(); ctx.arc(W / 2 + 9 * Math.cos(a), y + 9 * Math.sin(a), 8, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#d9a35c'; ctx.beginPath(); ctx.arc(W / 2, y, 4, 0, 7); ctx.fill();
        ctx.fillStyle = '#9db39a'; ctx.fillRect(W / 2 - 170, y - 1, 140, 2); ctx.fillRect(W / 2 + 30, y - 1, 140, 2);
      }
    },
    sfaradi: {
      name: 'ספרדי', titleFont: SERIF, bodyFont: SERIF,
      title: '#e6c27a', text: '#efe6d6', strong: '#fff8ea', muted: '#b9c4c0', accent: '#e6c27a', box: [170, 170, 190, 170], creditY: H - 132, bsd: [W - 140, 168, 'right'],
      bg: function (ctx) {
        var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0e4552'); g.addColorStop(1, '#0a2f3a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#d6b066'; ctx.lineWidth = 2;
        var step = 66, m = 66;
        for (var x = m; x <= W - m + 1; x += (W - 2 * m) / Math.round((W - 2 * m) / step)) { star8(ctx, x, m, 20); ctx.stroke(); star8(ctx, x, H - m, 20); ctx.stroke(); }
        for (var y = m; y <= H - m + 1; y += (H - 2 * m) / Math.round((H - 2 * m) / step)) { star8(ctx, m, y, 20); ctx.stroke(); star8(ctx, W - m, y, 20); ctx.stroke(); }
        ctx.lineWidth = 1.5; ctx.strokeRect(112, 112, W - 224, H - 224);
        ctx.fillStyle = 'rgba(214,176,102,.12)';
        [[112, 112], [W - 112, 112], [112, H - 112], [W - 112, H - 112]].forEach(function (p) { star8(ctx, p[0], p[1], 34); ctx.fill(); });
      },
      sep: function (ctx, y) { ctx.fillStyle = '#e6c27a'; star8(ctx, W / 2, y, 14); ctx.fill(); ctx.fillRect(W / 2 - 180, y - 1, 150, 2); ctx.fillRect(W / 2 + 30, y - 1, 150, 2); }
    },
    lavan: { // לבן חוסך דיו – להדפסה בבית
      name: 'לבן חוסך דיו', titleFont: SERIF, bodyFont: SERIF,
      title: '#1a1a1a', text: '#2b2b2b', strong: '#111111', muted: '#6b6b6b', accent: '#4a4a4a', box: [150, 140, 140, 140], bsd: [W - 110, 120, 'right'],
      bg: function (ctx) {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#9a9a9a'; ctx.lineWidth = 2; ctx.strokeRect(56, 56, W - 112, H - 112);
        ctx.lineWidth = 1; ctx.strokeRect(68, 68, W - 136, H - 136);
      },
      sep: function (ctx, y) { ctx.fillStyle = '#777'; ctx.fillRect(W / 2 - 120, y, 240, 1.5); ctx.fillStyle = '#444'; diamond(ctx, W / 2, y + 1, 6); }
    },
    zayit: { // ירוק זית
      name: 'ירוק זית', titleFont: SERIF, bodyFont: SERIF,
      title: '#3d5a1e', text: '#2f3a22', strong: '#1f2a16', muted: '#66704e', accent: '#5f7a32', box: [220, 150, 210, 150], bsd: [W / 2, 128, 'center'],
      bg: function (ctx) {
        ctx.fillStyle = '#f4f6ec'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(95,122,50,.45)'; ctx.lineWidth = 2; rr(ctx, 48, 48, W - 96, H - 96, 26); ctx.stroke();
        olive(ctx, W - 70, 80, Math.PI * 0.82, 1.1);
        olive(ctx, 70, H - 80, -Math.PI * 0.18, 1.1);
      },
      sep: function (ctx, y) { ctx.fillStyle = '#5f7a32'; ctx.fillRect(W / 2 - 160, y, 120, 2); ctx.fillRect(W / 2 + 40, y, 120, 2); leaf(ctx, W / 2 - 22, y + 1, 44, 0, '#7f8b52'); }
    },
    layla: { // לילה וכוכבים
      name: 'לילה וכוכבים', titleFont: SERIF, bodyFont: SERIF,
      title: '#f1d48a', text: '#e7e9f3', strong: '#ffffff', muted: '#a9b0c8', accent: '#f1d48a', box: [160, 150, 150, 150],
      bg: function (ctx) {
        var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#141a3a'); g.addColorStop(1, '#0b0f24');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        var seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
        for (var i = 0; i < 90; i++) { ctx.globalAlpha = 0.25 + rnd() * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 1 + rnd() * 2.2, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#f1d48a';
        [[150, 150, 18], [W - 170, 210, 12], [W - 140, H - 170, 16], [180, H - 220, 10]].forEach(function (s) { star5(ctx, s[0], s[1], s[2]); });
        ctx.strokeStyle = 'rgba(241,212,138,.55)'; ctx.lineWidth = 1.5; rr(ctx, 60, 60, W - 120, H - 120, 30); ctx.stroke();
      },
      sep: function (ctx, y) { ctx.fillStyle = '#f1d48a'; star5(ctx, W / 2, y, 12); ctx.fillRect(W / 2 - 170, y - 1, 140, 1.5); ctx.fillRect(W / 2 + 30, y - 1, 140, 1.5); }
    }
  };
  var ORDER = ['zahav', 'modern', 'yerushalmi', 'prachim', 'sfaradi', 'lavan', 'zayit', 'layla'];

  // ---------- ציור ----------
  function wrap(ctx, text, maxW) {
    var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  // מסדר את הבלוקים בתוך גובה נתון: מקטין עד שהכול נכנס, וגם עד שאף מילה ארוכה לא יוצאת מהרוחב
  function layout(ctx, bl, maxW, availH, lhDef) {
    var k = 1, laid, total;
    for (var tries = 0; tries < 24; tries++) {
      total = 0; laid = []; var wide = false;
      bl.forEach(function (b, i) {
        var gap = (i ? b.gap : 0) * k;
        if (b.sep) { laid.push({ sep: true, y: total + gap + 14 * k }); total += gap + 30 * k; return; }
        var size = b.size * k;
        ctx.font = b.w + ' ' + size + 'px ' + b.f;
        var lines = wrap(ctx, b.t, maxW), lh = size * (b.lh || lhDef);
        lines.forEach(function (l) { if (ctx.measureText(l).width > maxW) wide = true; });
        laid.push({ b: b, size: size, lines: lines, y: total + gap, lh: lh });
        total += gap + lines.length * lh;
      });
      if (total <= availH && !wide) break;
      k *= 0.94;
    }
    return { laid: laid, total: total };
  }
  function paint(ctx, th, L, y0) {
    L.laid.forEach(function (l) {
      if (l.sep) { th.sep(ctx, y0 + l.y); return; }
      ctx.font = l.b.w + ' ' + l.size + 'px ' + l.b.f;
      ctx.fillStyle = l.b.c;
      l.lines.forEach(function (line, j) { ctx.fillText(line, W / 2, y0 + l.y + l.lh * j + l.size * 0.95); });
    });
  }
  function bsd(ctx, th) {
    var b = th.bsd || [W - 100, 118, 'right'];
    ctx.textAlign = b[2]; ctx.fillStyle = th.muted; ctx.font = '400 30px ' + SERIF; ctx.fillText('בס״ד', b[0], b[1]);
    ctx.textAlign = 'center';
  }
  function draw(canvas, d) {
    var th = THEMES[d.st] || THEMES.zahav, px = canvas.width / W, ctx = canvas.getContext('2d');
    ctx.setTransform(px, 0, 0, px, 0, 0);
    ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    th.bg(ctx);
    if (!d.nobsd) bsd(ctx, th);
    var box = th.box, maxW = W - box[1] - box[3], availH = H - box[0] - box[2];
    var L = layout(ctx, blocks(d, th), maxW, availH, 1.4);
    ctx.font = '400 22px ' + SANS; ctx.fillStyle = th.muted; ctx.globalAlpha = 0.75;
    ctx.fillText(CREDIT, W / 2, th.creditY || H - 92);
    ctx.globalAlpha = 1;
    paint(ctx, th, L, box[0] + (availH - L.total) / 2);
    return L;
  }
  var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([
    document.fonts.load('700 40px "Frank Ruhl Libre"'), document.fonts.load('400 40px "Frank Ruhl Libre"'),
    document.fonts.load('400 40px "Assistant"'), document.fonts.load('700 40px "Assistant"')
  ]).catch(function () {}) : Promise.resolve();

  // ---------- קישורים: אורחים, Waze, יומן, ווטסאפ ----------
  function enc(d) {
    var bytes = new TextEncoder().encode(JSON.stringify(d)), bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function dec(s) {
    var bin = atob(s.replace(/-/g, '+').replace(/_/g, '/')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  var PUB = ['k', 'vr', 'nm1', 'nm2', 'p1', 'p2', 'fam', 'gp', 'host', 'age', 'lzn', 'dt', 'tm', 't2', 'pl', 'pl2', 'ad', 'a_dt', 'a_par', 'a_pl', 'fm', 'vs', 'fr', 'end', 'st', 'tel', 'nobsd'];
  function pubOf(d) { var o = {}; PUB.forEach(function (k) { if (d[k] !== undefined && d[k] !== '' && d[k] !== 0) o[k] = d[k]; }); if (d.end === '') o.end = ''; return o; }
  function sigOf(d) { var o = pubOf(d); delete o.tel; return JSON.stringify(o); }
  function shortUrl(id) { return location.origin + BASE_PATH + 'v/?e=' + id; }
  function adminUrl(e) { return location.origin + BASE_PATH + 'm/?e=' + e.id + '&t=' + e.tok; }
  function hashUrl(d) { return location.origin + BASE_PATH + 'v/#d=' + enc(pubOf(d)); }
  function guestUrl(d) { var e = evts[d.k]; return e && e.sig === sigOf(d) ? shortUrl(e.id) : hashUrl(d); }
  function placeQuery(d) { return [stripB(clean(d.pl)).replace(/^מ(?=בית)/, ''), clean(d.ad)].filter(String).join(', '); }
  function navQuery(d) { return clean(d.ad) || placeQuery(d); }
  function wazeUrl(d) { return 'https://waze.com/ul?q=' + encodeURIComponent(navQuery(d)) + '&navigate=yes'; }
  function mapsUrl(d) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(navQuery(d)); }
  function israelToUtc(dt, tm) {
    var p = dt.split('-').map(Number), t = (tm || '19:00').split(':').map(Number);
    var guess = Date.UTC(p[0], p[1] - 1, p[2], t[0], t[1]);
    var f = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    var o = {}; f.formatToParts(new Date(guess)).forEach(function (x) { o[x.type] = x.value; });
    var asIl = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute);
    return new Date(guess - (asIl - guess));
  }
  function utcStamp(x) { return x.getUTCFullYear() + pad(x.getUTCMonth() + 1) + pad(x.getUTCDate()) + 'T' + pad(x.getUTCHours()) + pad(x.getUTCMinutes()) + '00Z'; }
  function calTimes(d) { var a = israelToUtc(d.dt, d.tm || d.t2); return [a, new Date(a.getTime() + kindOf(d).hours * 3600e3)]; }
  function calDetails(d) { return kindOf(d).time(d) + '\n' + guestUrl(d) + '\n\nהזמנה כזאת לשמחה שלכם, בחינם: ' + location.origin + BASE_PATH; }
  function gcalUrl(d) {
    var t = calTimes(d);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(titleOf(d)) +
      '&dates=' + utcStamp(t[0]) + '/' + utcStamp(t[1]) + '&location=' + encodeURIComponent(placeQuery(d)) +
      '&details=' + encodeURIComponent(calDetails(d));
  }
  function icsText(d) {
    var t = calTimes(d), esc = function (s) { return s.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n'); };
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim//eruim-hazmana//HE', 'BEGIN:VEVENT',
      'UID:' + Date.now() + '@hakelim.com', 'DTSTAMP:' + utcStamp(new Date()),
      'DTSTART:' + utcStamp(t[0]), 'DTEND:' + utcStamp(t[1]),
      'SUMMARY:' + esc(titleOf(d)), 'LOCATION:' + esc(placeQuery(d)), 'DESCRIPTION:' + esc(calDetails(d)),
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function icsData(d) { return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsText(d)); }
  function waText(d) {
    var K = kindOf(d), L = [], big = K.big(d);
    if (!d.nobsd) L.push('בס״ד');
    var open = K.open(d);
    L.push(open.join(', ') + (big ? ' ' + big : '') + ' 🎉');
    if (K.after && K.afterSlot !== 'end') K.after(d).forEach(function (t) { L.push(t); });
    L.push((K.will || 'שתתקיים בעזרת ה׳') + ' ' + whenText(d) + ', ' + K.time(d) + '.');
    L.push('📍 ' + placeLines(d).join(', ') + (d.ad ? ' (' + clean(d.ad) + ')' : ''));
    if (K.after && K.afterSlot === 'end') { var a = K.after(d); if (a.length) L.push(a.join(', ') + '.'); }
    if (d.fr) L.push(clean(d.fr));
    var end = endText(d); if (end) L.push(end);
    L.push('');
    if (d.pl || d.ad) L.push('ניווט: ' + wazeUrl(d));
    L.push('ההזמנה המלאה' + (d.tel || (evts[d.k] && evts[d.k].sig === sigOf(d)) ? ', אישור הגעה' : '') + ' והוספה ליומן: ' + guestUrl(d));
    var s = signLines(d); if (s.length) { L.push(''); L.push(s.join(' · ')); }
    return L.join('\n');
  }
  function telIntl(t) {
    var n = (t || '').replace(/[^\d+]/g, '');
    if (!n) return '';
    if (n[0] === '+') return n.slice(1);
    if (/^0\d{8,9}$/.test(n)) return '972' + n.slice(1);
    return n;
  }

  // ---------- מודעה A4 עם QR ----------
  var PH = Math.round(W * 1.4142);
  var qrCache = {};
  function qrCanvas(url, size) {
    if (!window.QRCode) return null;
    var key = url + '|' + size;
    if (qrCache[key]) return qrCache[key];
    var div = document.createElement('div');
    new window.QRCode(div, { text: url, width: size, height: size, correctLevel: window.QRCode.CorrectLevel.L });
    var c = div.querySelector('canvas');
    if (c) qrCache[key] = c;
    return c;
  }
  function drawPoster(canvas, d, url) {
    var th = THEMES[d.st] || THEMES.zahav, px = canvas.width / W, ctx = canvas.getContext('2d');
    ctx.setTransform(px, 0, 0, px, 0, 0);
    ctx.direction = 'rtl'; ctx.textBaseline = 'alphabetic';
    var H0 = H; H = PH; try { th.bg(ctx); } finally { H = H0; }
    ctx.textAlign = 'center';
    if (!d.nobsd) bsd(ctx, th);
    var bl = blocks(d, th).map(function (b) { return b.sep ? b : Object.assign({}, b, { size: b.size * 1.08 }); });
    var qs = 300, box = th.box, maxW = W - box[1] - box[3], top = box[0] + 10, qrTop = PH - box[2] - qs - 90, availH = qrTop - top - 40;
    var L = layout(ctx, bl, maxW, availH, 1.35);
    paint(ctx, th, L, top + (availH - L.total) / 2);
    var qx = W / 2 - qs / 2, qy = qrTop;
    ctx.fillStyle = '#fff'; rr(ctx, qx - 16, qy - 16, qs + 32, qs + 32, 18); ctx.fill();
    var qc = qrCanvas(url, qs);
    if (qc) ctx.drawImage(qc, qx, qy, qs, qs);
    ctx.font = '600 34px ' + SANS; ctx.fillStyle = th.strong; ctx.fillText(/[?&]e=/.test(url) ? 'סורקים: ניווט, יומן ואישור הגעה' : 'סורקים: ההזמנה, ניווט והוספה ליומן', W / 2, qy + qs + 66);
    ctx.font = '400 22px ' + SANS; ctx.fillStyle = th.muted; ctx.globalAlpha = 0.75;
    ctx.fillText(CREDIT, W / 2, PH - (th.creditY ? H - th.creditY : 92));
    ctx.globalAlpha = 1;
    return { x: qx - 16, y: qy - 16, w: qs + 32, h: qs + 32 };
  }

  // ---------- PDF (jsPDF מקומי; העברית היא תמונה, הקישורים מעליה) ----------
  var CREDIT_URL = 'https://hakelim.com/kelim/eruim/hazmana/?utm_source=pdf&utm_medium=eruim_hazmana';
  function jsPdf() { return window.jspdf && window.jspdf.jsPDF ? new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true }) : null; }
  function linkStrip(th, bgColor, items) {
    var c = document.createElement('canvas'); c.width = W; c.height = 130;
    var ctx = c.getContext('2d'); ctx.fillStyle = bgColor; ctx.fillRect(0, 0, W, 130);
    ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 30px ' + SANS;
    var gap = 24, pd = 44, widths = items.map(function (it) { return ctx.measureText(it.label).width + pd * 2; });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) + gap * (items.length - 1), x = W / 2 + total / 2, rects = [];
    items.forEach(function (it, i) {
      var w = widths[i]; x -= w;
      ctx.strokeStyle = th.accent; ctx.lineWidth = 3; rr(ctx, x, 25, w, 80, 40); ctx.stroke();
      ctx.fillStyle = th.strong; ctx.fillText(it.label, x + w / 2, 66);
      rects.push({ x: x, y: 25, w: w, h: 80, url: it.url });
      x -= gap;
    });
    return { canvas: c, rects: rects };
  }
  function pixelAt(canvas, x, y) { var p = canvas.getContext('2d').getImageData(x, y, 1, 1).data; return 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')'; }
  function messagePdf(canvas, d) {
    var doc = jsPdf(); if (!doc) return null;
    var th = THEMES[d.st] || THEMES.zahav, px = canvas.width / W;
    var mx = 20, my = 12, iw = 170, ih = iw * H / W, s = iw / W;
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', mx, my, iw, ih);
    doc.link(mx, my + (th.creditY || H - 92) * s - 7, iw, 9, { url: CREDIT_URL });
    var items = [{ label: 'ליומן גוגל', url: gcalUrl(d) }, { label: 'הקישור לאורחים', url: guestUrl(d) }];
    if (d.pl || d.ad) items.unshift({ label: 'ניווט ב-Waze', url: wazeUrl(d) });
    var strip = linkStrip(th, pixelAt(canvas, Math.round(canvas.width / 2), canvas.height - 10 * px), items);
    var sy = my + ih + 4, sh = 130 * s;
    doc.addImage(strip.canvas.toDataURL('image/jpeg', 0.92), 'JPEG', mx, sy, iw, sh);
    strip.rects.forEach(function (r) { doc.link(mx + r.x * s, sy + r.y * s, r.w * s, r.h * s, { url: r.url }); });
    return doc;
  }
  function posterPdf(d, url) {
    var doc = jsPdf(); if (!doc) return null;
    var c = document.createElement('canvas'); c.width = 1240; c.height = Math.round(1240 * PH / W);
    var q = drawPoster(c, d, url), s = 210 / W;
    doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
    doc.link(q.x * s, q.y * s, q.w * s, q.h * s, { url: url });
    doc.link(0, 297 - 10, 210, 9, { url: CREDIT_URL });
    return doc;
  }

  // ---------- עזרים ----------
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function copy(text, btn) {
    var done = function () { if (!btn) return; var o = btn.innerHTML; btn.textContent = 'הועתק ✓'; setTimeout(function () { btn.innerHTML = o; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); }
  }
  // כפתורי "העתקה" ליד הנוסחים המוכנים בדפי האירוע
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy-nusach]');
    if (!b) return;
    var box = b.closest('.eh-nusach'), t = box && box.querySelector('.eh-ntext');
    if (t) { copy(t.innerText.trim(), b); used('nusach', (document.body.getAttribute('data-tool') || '').replace('eruim_hazmana_', '') || 'hub'); }
  });

  window.__eh = { KINDS: KINDS, ORDER_K: ORDER_K, THEMES: THEMES, PSUKIM: PSUKIM, hebrew: hebrew, draw: draw, drawPoster: drawPoster, enc: enc, dec: dec, waText: waText,
    guestUrl: guestUrl, icsText: icsText, gcalUrl: gcalUrl, wazeUrl: wazeUrl, blocks: blocks, layout: layout, fontsReady: fontsReady, messagePdf: messagePdf, posterPdf: posterPdf };

  // =========================================================
  // דף האורחים
  // =========================================================
  var guest = $('#eh-guest');
  if (guest) {
    var eid = '';
    try { eid = (new URLSearchParams(location.search).get('e') || '').replace(/[^a-z0-9]/g, ''); } catch (e) {}
    if (eid) {
      api('/ev/' + eid).then(function (j) { showGuest(j.d, eid); }, function () { $('#eh-missing').hidden = false; });
      return;
    }
    var gd0 = null;
    try { gd0 = dec((location.hash.match(/d=([^&]+)/) || [])[1] || ''); } catch (e) {}
    showGuest(gd0, '');
    return;
  }
  function showGuest(gd, eid) {
    if (!gd || !gd.dt) { $('#eh-missing').hidden = false; return; }
    var K = kindOf(gd), gc = $('#eh-guest-canvas'), slug = KINDS[gd.k] ? gd.k : 'chatuna';
    var bd = parseDate(gd.dt), today = new Date(); today.setHours(0, 0, 0, 0);
    var after = bd && bd < today;
    document.title = titleOf(gd) + ' – ההזמנה, ניווט והוספה ליומן';
    gc.setAttribute('aria-label', 'ההזמנה ' + K.of + ': ' + K.big(gd));
    fontsReady.then(function () { draw(gc, gd); });
    if (gd.pl || gd.ad) { $('#g-waze').href = wazeUrl(gd); $('#g-maps').href = mapsUrl(gd); } else $('#g-nav').hidden = true;
    $('#g-gcal').href = gcalUrl(gd);
    $('#g-ics').href = icsData(gd); $('#g-ics').setAttribute('download', slug + '.ics');
    var tel = telIntl(gd.tel);
    if (eid && !after) rsvpForm(gd, eid);
    else if (tel && !after) {
      var who = K.big(gd), base = 'שלום! קיבלנו את ההזמנה ' + K.of + (who && who !== K.name ? ' של ' + who : '') + ', ' + whenText(gd) + '. ';
      $('#g-yes').href = 'https://wa.me/' + tel + '?text=' + encodeURIComponent(base + 'מגיעים בשמחה 🎉 נהיה ___ אנשים.');
      $('#g-no').href = 'https://wa.me/' + tel + '?text=' + encodeURIComponent(base + 'לצערנו לא נוכל להגיע. מזל טוב ושמחות!');
      $('#g-rsvp').hidden = false;
    }
    if (after) { $('#eh-after').hidden = false; ['#g-nav', '#g-gcal', '#g-ics'].forEach(function (s) { $(s).hidden = true; }); }
    $('#g-credit').href = BASE_PATH + slug + '/?utm_source=guest&utm_medium=eruim_hazmana';
    $('#g-credit').textContent = 'הזמנה ' + K.of + ' בחינם ←';
    guest.hidden = false;
  }
  // "מגיעים? כמה?" – כשההזמנה נפתחה מהקישור הקצר (יש אירוע בשרת)
  function rsvpForm(gd, eid) {
    var gq = new URLSearchParams(location.search), gcode = /^[a-z0-9]{3,10}$/.test(gq.get('g') || '') ? gq.get('g') : '';
    var box = $('#g-form-box'), f = $('#g-form'), done = $('#g-done'), KEY = 'eruim-rsvp-' + eid + (gcode ? '-' + gcode : ''), mine = null;
    try { mine = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    var sg = signLines(gd).join(' ו');
    $('#g-hi').textContent = (sg ? sg + ' ישמחו' : 'בעלי השמחה ישמחו') + ' לדעת אם תגיעו.';
    function toggle() { var ok = f.querySelector('input[name=ok]:checked'); $('#g-cwrap').hidden = !(ok && ok.value === '1'); }
    function fill(a) { f.elements.n.value = a.n || ''; f.elements.note.value = a.note || ''; f.elements.c.value = a.c || 1; var r = f.querySelector('input[name=ok][value="' + (a.ok ? 1 : 0) + '"]'); if (r) r.checked = true; }
    function showDone(a) { f.hidden = true; done.hidden = false; $('#g-done-txt').textContent = a.ok ? 'תודה! נרשם: ' + (a.c > 1 ? a.c + ' מגיעים' : 'מגיעים') + '. נתראה בשמחה 🎉' : 'תודה שעדכנתם. נתראה בשמחות!'; }
    f.addEventListener('change', toggle);
    if (mine) { fill(mine); showDone(mine); } else { if (gq.get('n')) f.elements.n.value = gq.get('n').slice(0, 60); toggle(); }
    $('#g-edit').addEventListener('click', function () { done.hidden = true; f.hidden = false; toggle(); f.elements.n.focus(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = f.querySelector('input[name=ok]:checked'), err = $('#g-err');
      if (!ok) { err.textContent = 'סמנו אם אתם מגיעים'; err.hidden = false; return; }
      if (!f.reportValidity()) return;
      var btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'שולח…'; err.hidden = true;
      var body = { aid: mine && mine.aid, n: f.elements.n.value.trim(), c: f.elements.c.value, ok: ok.value === '1' ? 1 : 0, note: f.elements.note.value.trim(), website: f.elements.website.value };
      if (gcode) body.g = gcode;
      api('/ev/' + eid + '/rsvp', body).then(function (j) {
        mine = { aid: j.aid, n: body.n, c: +body.c, ok: body.ok, note: body.note };
        try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch (x) {}
        showDone(mine); used('rsvp_answer', gd.k);
      }, function (x) { err.textContent = x.message || 'לא הצלחנו לשלוח. נסו שוב.'; err.hidden = false; }).then(function () { btn.disabled = false; btn.textContent = 'שליחת התשובה'; });
    });
    box.hidden = false;
  }
  if (guest) return;

  // =========================================================
  // לוח המעקב לבעלי השמחה (/kelim/eruim/hazmana/m/?e=ID&t=TOK)
  // =========================================================
  var adm = $('#eh-admin');
  if (adm) { adminPage(); return; }
  function adminPage() {
    var q = new URLSearchParams(location.search), id = (q.get('e') || '').replace(/[^a-z0-9]/g, ''), tok = q.get('t') || '', ev = null, filter = 'all';
    if (!id || !tok) { $('#ad-missing').hidden = false; return; }
    function load() {
      $('#ad-err').hidden = true;
      return api('/ev/' + id + '/admin?t=' + encodeURIComponent(tok)).then(function (j) { ev = j; show(); }, function (x) { $('#ad-err').textContent = x.message; $('#ad-err').hidden = false; $('#ad-missing').hidden = !/403|404|לא נמצא|לא תקין/.test(x.message); });
    }
    function rows() { return Object.keys(ev.answers).map(function (k) { return Object.assign({ id: k }, ev.answers[k]); }).sort(function (a, b) { return a.ts < b.ts ? 1 : -1; }); }
    function show() {
      var d = ev.d, K = kindOf(d), all2 = rows(), yes = all2.filter(function (a) { return a.ok === 1 || a.ok === true; }), no = all2.filter(function (a) { return !a.ok; });
      var people = yes.reduce(function (s, a) { return s + (+a.c || 1); }, 0);
      document.title = 'לוח המעקב – ' + titleOf(d);
      $('#ad-title').textContent = titleOf(d);
      $('#ad-when').textContent = whenText(d) + ', ' + K.time(d);
      $('#st-people').textContent = people; $('#st-yes').textContent = yes.length; $('#st-no').textContent = no.length; $('#st-all').textContent = all2.length;
      var list = filter === 'yes' ? yes : filter === 'no' ? no : all2, ul = $('#ad-list');
      ul.innerHTML = list.length ? list.map(function (a) {
        var t = new Date(a.ts);
        return '<li class="eh-row"><span class="who">' + esc(a.n) + '</span><span class="chip ' + (a.ok === 2 ? 'maybe' : a.ok ? 'yes' : 'no') + '">' + (a.ok === 2 ? 'אולי' : a.ok ? 'מגיעים' + (a.c > 1 ? ' · ' + a.c : '') : 'לא מגיעים') + '</span>' +
          (a.note ? '<span class="meta">💬 ' + esc(a.note) + '</span>' : '') + '<span class="meta">' + t.getDate() + '.' + (t.getMonth() + 1) + ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes()) + '</span></li>';
      }).join('') : '<li class="eh-empty">' + (all2.length ? 'אין תשובות בסינון הזה.' : 'עוד אין תשובות. שלחו את הקישור לאורחים, והתשובות יופיעו כאן.') + '</li>';
      $('#ad-ishurim').href = '/kelim/eruim/ishurim/?e=' + id + '&t=' + encodeURIComponent(tok) + '&src=h&ttl=' + encodeURIComponent(titleOf(d));
      $('#ad-guest').href = shortUrl(id); $('#ad-short').textContent = shortUrl(id).replace(/^https?:\/\//, '');
      $('#ad-remind').href = 'https://wa.me/?text=' + encodeURIComponent('תזכורת ' + K.of + ' ' + K.big(d) + ', ' + whenText(d) + ' 🎉\nעוד לא עניתם? כאן מאשרים הגעה בלחיצה: ' + shortUrl(id));
      adm.hidden = false;
    }
    document.querySelectorAll('#ad-tabs button').forEach(function (b) {
      b.addEventListener('click', function () { filter = b.getAttribute('data-f'); document.querySelectorAll('#ad-tabs button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); show(); });
    });
    $('#ad-refresh').addEventListener('click', function () { load(); });
    $('#ad-copy-link').addEventListener('click', function (e) { copy(shortUrl(id), e.currentTarget); });
    $('#ad-copy').addEventListener('click', function (e) {
      if (!ev) return;
      var L = rows().map(function (a) { return a.n + ' – ' + (a.ok === 2 ? 'אולי' : a.ok ? 'מגיעים' + (a.c > 1 ? ' (' + a.c + ')' : '') : 'לא מגיעים') + (a.note ? ' – ' + a.note : ''); });
      copy(titleOf(ev.d) + '\n' + L.join('\n'), e.currentTarget);
    });
    $('#ad-csv').addEventListener('click', function () {
      if (!ev) return;
      var q2 = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
      var csv = '\ufeff' + ['שם,מגיעים,כמה,הערה,מתי'].concat(rows().map(function (a) { return [a.n, a.ok === 2 ? 'אולי' : a.ok ? 'כן' : 'לא', a.c, a.note, a.ts].map(q2).join(','); })).join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'ishurim-' + id + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 1000);
    });
    $('#ad-del').addEventListener('click', function () {
      if (!confirm('למחוק את האירוע ואת כל התשובות עכשיו? אי אפשר לשחזר.')) return;
      api('/ev/' + id + '/delete?t=' + encodeURIComponent(tok), {}).then(function () { adm.hidden = true; $('#ad-deleted').hidden = false; }, function (x) { alert(x.message); });
    });
    load();
  }

  // =========================================================
  // המחולל
  // =========================================================
  var app = $('#eh-app');
  if (!app) return;
  var fixed = app.getAttribute('data-kind'); // בדף אירוע: הסוג קבוע. בדף המרכזי: בוחרים.
  var all = {}, cur = fixed || 'chatuna';
  try { all = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { all = {}; }
  if (!all.by) all = { by: {} };
  if (!fixed) {
    var qk = null; try { qk = new URLSearchParams(location.search).get('k'); } catch (e) {}
    cur = KINDS[qk] ? qk : KINDS[all.last] ? all.last : 'chatuna';
  }
  function save() { try { all.last = cur; localStorage.setItem(STORE, JSON.stringify(all)); } catch (e) {} }

  // דוגמה מלאה בכניסה הראשונה (כלי ריק נראה שבור): תאריך בעוד כחודשיים
  function demoOf(k) {
    var K = KINDS[k], d = Object.assign({ k: k, fm: 'both', vs: String(K.v0) }, K.demo);
    var t = new Date(); t.setDate(t.getDate() + 60);
    if (k === 'sheva-brachot' || k === 'bar-mitzva') { while (t.getDay() !== 4) t.setDate(t.getDate() + 1); }
    else { while (t.getDay() === 5 || t.getDay() === 6) t.setDate(t.getDate() + 1); }
    d.dt = iso(t);
    if (k === 'bar-mitzva') { var s = new Date(t); while (s.getDay() !== 6) s.setDate(s.getDate() + 1); d.a_dt = iso(s); }
    d._demo = 1;
    return d;
  }
  function dataOf(k) { return all.by[k] || demoOf(k); }

  // ---------- בניית הטופס לפי הסוג ----------
  function field(K, key, d) {
    var f = FIELDS[key], lab = (K.lab && K.lab[key]) || f[0], ph = (K.ph && K.ph[key]) || f[1], id = 'eh-' + key;
    var opt = OPT[key] ? ' <span class="opt">(לא חובה)</span>' : key === 'ad' ? ' <span class="opt">(בשביל כפתור הניווט)</span>' : '';
    var v = d[key] == null ? '' : d[key];
    return '<div class="field"><label for="' + id + '">' + esc(lab) + opt + '</label><input id="' + id + '" name="' + key + '" type="' + f[2] + '"' +
      (ph && f[2] === 'text' ? ' placeholder="' + esc(ph) + '"' : '') + ' value="' + esc(v) + '"' + (f[2] === 'text' ? ' maxlength="90"' : '') + '></div>';
  }
  function pairs(K, keys, d) { // שני שדות קצרים בשורה
    var h = '', row = [];
    keys.forEach(function (k) {
      var short = /^(dt|tm|t2|a_dt|age|a_par)$/.test(k) || (/^(nm1|nm2|p1|p2)$/.test(k) && K.f.indexOf('nm2') >= 0) || k === 'fam' || (k === 'p1' && K.f.indexOf('fam') >= 0);
      if (short) { row.push(field(K, k, d)); if (row.length === 2) { h += '<div class="eh-two">' + row.join('') + '</div>'; row = []; } }
      else { if (row.length) { h += row[0]; row = []; } h += field(K, k, d); }
    });
    if (row.length) h += row[0];
    return h;
  }
  function formHtml(k, d) {
    var K = KINDS[k], f = K.f;
    var who = f.filter(function (x) { return /^(nm1|nm2|p1|p2|fam|gp|host|age|lzn)$/.test(x); });
    var when = f.filter(function (x) { return /^(dt|tm|t2|pl|pl2|ad)$/.test(x); });
    var aliya = f.filter(function (x) { return /^a_/.test(x); });
    var h = '';
    if (!fixed) {
      h += '<fieldset class="eh-step"><legend>איזו שמחה?</legend><div class="eh-kinds" role="radiogroup" aria-label="סוג האירוע">';
      ORDER_K.forEach(function (x) { h += '<label><input type="radio" name="k" value="' + x + '"' + (x === k ? ' checked' : '') + '><span>' + KINDS[x].name + '</span></label>'; });
      h += '<a class="eh-kind-out" href="/mohel/hazmana/?utm_source=eruim_hazmana">ברית, זבד הבת, פדיון הבן ←</a></div></fieldset>';
    }
    if (K.vr) {
      h += '<fieldset class="eh-step"><legend>' + esc(K.lab.vr || 'איך קוראים לשמחה?') + '</legend><div class="radios">';
      K.vr.forEach(function (x, i) { h += '<label><input type="radio" name="vr" value="' + esc(x) + '"' + ((d.vr || K.vr[0]) === x ? ' checked' : '') + '> ' + esc(x) + '</label>'; });
      h += '</div></fieldset>';
    }
    h += '<fieldset class="eh-step"><legend>מי שמח</legend>' + pairs(K, who, d) + '</fieldset>';
    h += '<fieldset class="eh-step"><legend>מתי ואיפה</legend>' + pairs(K, when, d) +
      '<div class="field"><span class="label">איך לכתוב את התאריך?</span><div class="radios">' +
      [['both', 'עברי ולועזי'], ['heb', 'עברי'], ['greg', 'לועזי']].map(function (o) { return '<label><input type="radio" name="fm" value="' + o[0] + '"' + ((d.fm || 'both') === o[0] ? ' checked' : '') + '> ' + o[1] + '</label>'; }).join('') +
      '</div></div></fieldset>';
    if (aliya.length) h += '<fieldset class="eh-step"><legend>העלייה לתורה <span class="opt">(לא חובה)</span></legend>' + pairs(K, aliya, d) + '</fieldset>';
    var vsel = '<option value="0">בלי פסוק</option>' + K.vs.map(function (key, i) { return '<option value="' + (i + 1) + '">' + esc(PSUKIM[key][0].replace(/[֑-ׇ]/g, '')) + ' (' + PSUKIM[key][1] + ')</option>'; }).join('');
    h += '<fieldset class="eh-step"><legend>תוספות</legend>' +
      '<div class="field"><label for="eh-vs">פסוק בראש ההזמנה</label><select id="eh-vs" name="vs">' + vsel + '</select></div>' +
      '<div class="field"><label for="eh-fr">שורה משלכם <span class="opt">(לא חובה)</span></label><input id="eh-fr" name="fr" type="text" maxlength="120" placeholder="למשל: הכניסה מהחניון התחתון"></div>' +
      '<div class="field"><label for="eh-end">שורת הסיום</label><input id="eh-end" name="end" type="text" maxlength="80" placeholder="' + esc(K.end) + '"></div>' +
      '<label class="check"><input type="checkbox" name="nobsd"> <span>בלי בס״ד בפינה</span></label>' +
      '<div class="field"><label for="eh-tel">הטלפון שלכם, לאישורי הגעה בווטסאפ <span class="opt">(לא חובה)</span></label><input id="eh-tel" name="tel" type="tel" inputmode="tel" dir="ltr" style="text-align:right" placeholder="050-0000000" maxlength="20">' +
      '<p class="eh-hint">אם תמלאו, בקישור לאורחים יופיעו כפתורי "מגיעים" ו"לא נוכל", שנפתחים אצלכם בווטסאפ. המספר נשמר רק בקישור, לא אצלנו.</p></div>' +
      '</fieldset>';
    h += '<fieldset class="eh-step"><legend>העיצוב</legend><div class="eh-styles" role="radiogroup" aria-label="סגנון העיצוב">' +
      ORDER.map(function (s) { return '<label class="eh-mini"><input type="radio" name="st" value="' + s + '"' + ((d.st || 'zahav') === s ? ' checked' : '') + '><canvas width="216" height="270" data-st="' + s + '" aria-hidden="true"></canvas>' + THEMES[s].name + '</label>'; }).join('') +
      '</div></fieldset>';
    return h;
  }

  app.innerHTML =
    '<div class="er-note" id="eh-demo" hidden><span>זו דוגמה עם שמות בדויים, כדי שיהיה ברור איך זה נראה. משנים לשמחה שלכם, או מנקים ומתחילים.</span><button class="btn btn-line btn-sm" type="button" id="eh-clear">לנקות ולהתחיל</button></div>' +
    '<form id="eh-form" class="panel eh-form" novalidate></form>' +
    '<div class="eh-preview"><canvas id="eh-canvas" width="1080" height="1350" role="img" aria-label="תצוגה של ההזמנה"></canvas></div>' +
    '<div class="panel eh-acts" id="eh-acts">' +
    '<h2>ההזמנה מוכנה. בחינם, בלי הרשמה</h2>' +
    '<div class="eh-btns">' +
    '<button class="btn btn-gold wide" type="button" id="a-share"><svg class="ic"><use href="#wa"/></svg> שליחת התמונה בווטסאפ</button>' +
    '<button class="btn btn-line" type="button" id="a-down"><svg class="ic"><use href="#down"/></svg> הורדת התמונה</button>' +
    '<button class="btn btn-line" type="button" id="a-pdf"><svg class="ic"><use href="#down"/></svg> PDF עם קישורים</button>' +
    '<a class="btn btn-line" id="a-wa" href="#" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> טקסט לווטסאפ</a>' +
    '<button class="btn btn-line" type="button" id="a-text">העתקת הטקסט</button>' +
    '<button class="btn btn-line" type="button" id="a-link"><svg class="ic"><use href="#share"/></svg> העתקת הקישור לאורחים</button>' +
    '<a class="btn btn-line" id="a-view" href="#" target="_blank" rel="noopener">איך האורחים יראו?</a>' +
    '<a class="btn btn-line" id="a-gcal" href="#" target="_blank" rel="noopener"><svg class="ic"><use href="#cal"/></svg> ליומן גוגל</a>' +
    '<a class="btn btn-line" id="a-ics" href="#" download="hazmana.ics"><svg class="ic"><use href="#cal"/></svg> ליומן בטלפון</a>' +
    '</div>' +
    '<p class="eh-hint">בקישור לאורחים: ההזמנה, ניווט ב-Waze והוספה ליומן.</p>' +
    '<div class="eh-rsvp-panel" id="eh-rsvp-panel"><h3>אישורי הגעה ולוח מעקב, בחינם</h3>' +
    '<p class="eh-hint" id="r-off-txt">האורחים לוחצים בקישור "מגיעים? כמה?", ואתם רואים בלוח מי אישר, כמה מגיעים בסך הכול ומי לא יגיע. התשובות נשמרות בשרת שלנו ונמחקות מעצמן 30 יום אחרי האירוע.</p>' +
    '<button class="btn btn-gold btn-block" type="button" id="r-on">להפעיל אישורי הגעה</button>' +
    '<div id="r-live" hidden><p class="eh-short">הקישור לאורחים: <bdi dir="ltr" id="r-short"></bdi> <button class="btn btn-line" type="button" id="r-copy">העתקה</button></p>' +
    '<a class="btn btn-gold btn-block" id="r-dash" href="#" target="_blank" rel="noopener">ללוח המעקב שלי</a>' +
    '<a class="btn btn-line btn-block" id="r-ishurim" href="#" target="_blank" rel="noopener">ניהול אישורי הגעה ורשימת מוזמנים</a>' +
    '<p class="eh-hint">הלוח פרטי: רק מי שיש לו את הקישור הזה רואה את התשובות. הוא שמור בטלפון הזה, ושווה לשמור אותו גם בצד (למשל לשלוח לעצמכם בווטסאפ). <a class="gold" href="#" id="r-self" target="_blank" rel="noopener">לשלוח לעצמי</a></p></div>' +
    '<p class="eh-err" id="r-err" hidden></p></div>' +
    '<div class="eh-poster-box"><h3>מודעה A4 עם קוד QR</h3><p class="eh-hint">לתלות בבית הכנסת, בעבודה או בבניין. מי שסורק מקבל את ההזמנה, ניווט והוספה ליומן.</p>' +
    '<div class="eh-poster"><canvas id="eh-poster" width="540" height="764" role="img" aria-label="תצוגה של המודעה"></canvas></div>' +
    '<button class="btn btn-gold btn-block" type="button" id="a-poster"><svg class="ic"><use href="#down"/></svg> הורדת המודעה (PDF)</button></div>' +
    '<div class="eh-soft" id="eh-soft" hidden><p><strong>מזל טוב!</strong> הכלי הזה בחינם, ונבנה כדי לעזור. מכירים עוד מישהו שמתכנן שמחה? שלחו לו את הקישור.</p>' +
    '<a class="btn btn-line" id="a-tell" href="#" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח את הכלי לחבר</a></div>' +
    '</div>';

  var form = $('#eh-form'), big = $('#eh-canvas'), poster = $('#eh-poster'), data = {}, cached = null, timer = null, softShown = false;

  function build() {
    data = Object.assign({}, dataOf(cur), { k: cur });
    form.innerHTML = formHtml(cur, data);
    if (data.vs !== undefined) form.elements.vs.value = String(data.vs);
    ['fr', 'end', 'tel'].forEach(function (k) { if (data[k] != null && form.elements[k]) form.elements[k].value = data[k]; });
    form.elements.nobsd.checked = !!data.nobsd;
    $('#eh-demo').hidden = !data._demo;
    $('#a-ics').setAttribute('download', cur + '.ics');
    render(true);
  }
  function read() {
    var d = { k: cur };
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.name === 'k') return;
      if (el.type === 'radio') { if (el.checked) d[el.name] = el.value; }
      else if (el.type === 'checkbox') d[el.name] = el.checked ? 1 : 0;
      else d[el.name] = el.value.trim();
    });
    if (d.end === '' ) delete d.end; // ריק = שורת הסיום הרגילה של הסוג
    return d;
  }
  function render(first) {
    if (!first) {
      data = read();
      all.by[cur] = data; save();
      $('#eh-demo').hidden = true;
    }
    clearTimeout(timer);
    timer = setTimeout(function () {
      fontsReady.then(function () {
        draw(big, data);
        cached = null; try { big.toBlob(function (b) { cached = b; }, 'image/png'); } catch (e) {}
        form.querySelectorAll('.eh-mini canvas').forEach(function (c) { draw(c, Object.assign({}, data, { st: c.getAttribute('data-st') })); });
        drawPoster(poster, data, guestUrl(data));
      });
    }, first ? 0 : 140);
  }
  form.addEventListener('input', function () { render(); });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'k') { cur = e.target.value; save(); build(); try { history.replaceState(null, '', location.pathname + '?k=' + cur + location.hash); } catch (er) {} return; }
    render();
  });
  $('#eh-clear').addEventListener('click', function () {
    var K = KINDS[cur], keep = { k: cur, fm: 'both', vs: String(K.v0), st: data.st || 'zahav' };
    all.by[cur] = keep; save(); build();
    var first = form.querySelector('input[type=text]'); if (first) first.focus();
  });

  // ---------- פעולות ----------
  function fileName(ext) { return 'hazmana-' + cur + '-' + (data.dt || '') + '.' + ext; }
  function blob() { return cached ? Promise.resolve(cached) : new Promise(function (res) { big.toBlob(res, 'image/png'); }); }
  function download(b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fileName('png'); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
  function soft() { // הצעה רכה אחרי הפעולה הראשונה, לא חוסמת כלום
    if (softShown) return; softShown = true;
    var s = $('#eh-soft'); s.hidden = false;
    var page = location.origin + (fixed ? BASE_PATH + fixed + '/' : BASE_PATH);
    $('#a-tell').href = 'https://wa.me/?text=' + encodeURIComponent('מחולל הזמנות בחינם, בלי הרשמה ובלי פרסומות. הזמנה מעוצבת לווטסאפ תוך דקה: ' + page);
  }
  function on(id, how, fn) { $(id).addEventListener('click', function (e) { fn(e); if (how) { used(how, cur); soft(); } }); }
  on('#a-share', 'img', function () {
    var go = function (b) {
      var file = new File([b], fileName('png'), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], text: waText(data) }).catch(function () {});
      else { download(b); window.open('https://wa.me/?text=' + encodeURIComponent(waText(data)), '_blank'); }
    };
    if (cached) go(cached); else blob().then(go);
  });
  on('#a-down', 'img', function () { blob().then(download); });
  on('#a-pdf', 'pdf', function () {
    var doc = messagePdf(big, data);
    if (doc) doc.save(fileName('pdf')); else alert('ה-PDF לא נטען. רעננו את הדף ונסו שוב.');
  });
  on('#a-poster', 'pdf', function () {
    var doc = posterPdf(data, guestUrl(data));
    if (doc) doc.save('modaa-' + fileName('pdf')); else alert('ה-PDF לא נטען. רעננו את הדף ונסו שוב.');
  });
  on('#a-wa', 'wa', function (e) { e.currentTarget.href = 'https://wa.me/?text=' + encodeURIComponent(waText(data)); });
  on('#a-text', 'wa', function (e) { copy(waText(data), e.currentTarget); });
  on('#a-link', 'link', function (e) { copy(guestUrl(data), e.currentTarget); });
  on('#a-view', 'link', function (e) { e.currentTarget.href = guestUrl(data); });
  on('#a-gcal', 'cal', function (e) { e.currentTarget.href = gcalUrl(data); });
  on('#a-ics', 'cal', function (e) { e.currentTarget.href = icsData(data); });

  // ---------- אישורי הגעה: יצירת האירוע בשרת ועדכונו כשהפרטים משתנים ----------
  var evBusy = null, evTimer = null;
  function rsvpUi() {
    var e = evts[cur], on2 = !!e;
    $('#r-on').hidden = on2; $('#r-live').hidden = !on2; $('#r-off-txt').hidden = on2;
    if (on2) {
      $('#r-short').textContent = shortUrl(e.id).replace(/^https?:\/\//, '');
      $('#r-dash').href = adminUrl(e);
      $('#r-ishurim').href = '/kelim/eruim/ishurim/?e=' + e.id + '&t=' + encodeURIComponent(e.tok) + '&src=h&ttl=' + encodeURIComponent(titleOf(data));
      $('#r-self').href = 'https://wa.me/?text=' + encodeURIComponent('לוח אישורי ההגעה ' + kindOf(data).of + ' (לשמור, לא להעביר): ' + adminUrl(e));
    }
  }
  function syncEvent() {
    var e = evts[cur];
    if (!e || evBusy || data._demo || !data.dt) return;
    var sig = sigOf(data); if (e.sig === sig) return;
    var k = cur;
    evBusy = api('/ev/' + e.id + '/update?t=' + encodeURIComponent(e.tok), { d: Object.assign(pubOf(data), { tel: undefined }) }).then(function () {
      evts[k].sig = sig; saveEvts(); if (k === cur) render(true);
    }, function (x) { if (/לא נמצא|לא תקין/.test(x.message)) { delete evts[k]; saveEvts(); rsvpUi(); } }).then(function () { evBusy = null; });
  }
  $('#r-on').addEventListener('click', function () {
    var err = $('#r-err'); err.hidden = true;
    if (data._demo) { err.textContent = 'קודם משנים את הפרטים לשמחה שלכם (או "לנקות ולהתחיל"), ואז מפעילים.'; err.hidden = false; return; }
    if (!data.dt) { err.textContent = 'חסר תאריך. ממלאים תאריך ואז מפעילים.'; err.hidden = false; $('#eh-dt') && $('#eh-dt').focus(); return; }
    var btn = $('#r-on'), k = cur; btn.disabled = true; btn.textContent = 'רגע…';
    var pub = pubOf(data); delete pub.tel;
    api('/ev', { d: pub }).then(function (j) {
      evts[k] = { id: j.id, tok: j.tok, sig: sigOf(data) }; saveEvts(); used('rsvp_on', k); rsvpUi(); render(true);
    }, function (x) { err.textContent = x.message || 'לא הצלחנו להתחבר. בדקו את האינטרנט ונסו שוב.'; err.hidden = false; }).then(function () { btn.disabled = false; btn.textContent = 'להפעיל אישורי הגעה'; });
  });
  $('#r-copy').addEventListener('click', function (e) { if (evts[cur]) { copy(shortUrl(evts[cur].id), e.currentTarget); used('link', cur); } });
  $('#r-dash').addEventListener('click', function () { used('rsvp_dash', cur); });
  form.addEventListener('input', function () { clearTimeout(evTimer); evTimer = setTimeout(syncEvent, 1500); });
  form.addEventListener('change', function () { rsvpUi(); clearTimeout(evTimer); evTimer = setTimeout(syncEvent, 1500); });

  build();
  rsvpUi(); syncEvent();
  // השרת לא זמין (עוד לא פרוס, או חסום ברשת): מסתירים את אישורי ההגעה, וכל השאר עובד כרגיל
  if (!evts[cur]) fetch(API + '/ev/ping00').then(function (r) { if (!/json/.test(r.headers.get('Content-Type') || '')) throw 0; }).catch(function () { $('#eh-rsvp-panel').hidden = true; });
  window.__eh.read = read;
  window.__eh.data = function () { return data; };
  window.__eh.setKind = function (k) { cur = k; build(); rsvpUi(); };
  window.__eh.evts = function () { return evts; };
})();
