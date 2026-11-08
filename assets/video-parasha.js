// סרטון שבועי לפרשה (כלי קודש): הפרשה מזוהה לבד (hebcal 6.14.7), פסוק פותח מספריא, דבר התורה של הרב,
// וחתימה עם שבת שלום וזמני השבת לפי עיר או GPS. המנוע (שקופיות, תמונות CC0, מנגינה, MediaRecorder) כמו ב-/kodesh/video/.
// החתימה, היחידה, העיר וההעדפות נשמרות בטלפון (localStorage), כדי שבשבוע הבא רק מדביקים את דבר התורה.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('vp-form'), cv = $('vd-canvas');
  if (!form || !cv) return;
  var ctx = cv.getContext('2d'), H = null;
  var SERIF = '"Frank Ruhl Libre", "David Libre", David, serif', SANS = '"Assistant", Arial, sans-serif';
  var SIZES = { story: [720, 1280], square: [720, 720] };
  var GOLD = '#e6c57e', KEY = 'kodesh-video-parasha';

  // ---------- פרשות וחגים ----------
  // הסדר של hebcal (getSedra), והפסוק הראשון של כל פרשה בהפניה של ספריא
  var PAR = [
    ['Bereshit', 'Genesis 1:1'], ['Noach', 'Genesis 6:9'], ['Lech-Lecha', 'Genesis 12:1'], ['Vayera', 'Genesis 18:1'], ['Chayei Sara', 'Genesis 23:1'], ['Toldot', 'Genesis 25:19'],
    ['Vayetzei', 'Genesis 28:10'], ['Vayishlach', 'Genesis 32:4'], ['Vayeshev', 'Genesis 37:1'], ['Miketz', 'Genesis 41:1'], ['Vayigash', 'Genesis 44:18'], ['Vayechi', 'Genesis 47:28'],
    ['Shemot', 'Exodus 1:1'], ['Vaera', 'Exodus 6:2'], ['Bo', 'Exodus 10:1'], ['Beshalach', 'Exodus 13:17'], ['Yitro', 'Exodus 18:1'], ['Mishpatim', 'Exodus 21:1'],
    ['Terumah', 'Exodus 25:1'], ['Tetzaveh', 'Exodus 27:20'], ['Ki Tisa', 'Exodus 30:11'], ['Vayakhel', 'Exodus 35:1'], ['Pekudei', 'Exodus 38:21'],
    ['Vayikra', 'Leviticus 1:1'], ['Tzav', 'Leviticus 6:1'], ['Shmini', 'Leviticus 9:1'], ['Tazria', 'Leviticus 12:1'], ['Metzora', 'Leviticus 14:1'], ['Achrei Mot', 'Leviticus 16:1'],
    ['Kedoshim', 'Leviticus 19:1'], ['Emor', 'Leviticus 21:1'], ['Behar', 'Leviticus 25:1'], ['Bechukotai', 'Leviticus 26:3'],
    ['Bamidbar', 'Numbers 1:1'], ['Nasso', 'Numbers 4:21'], ['Beha\'alotcha', 'Numbers 8:1'], ['Sh\'lach', 'Numbers 13:1'], ['Korach', 'Numbers 16:1'], ['Chukat', 'Numbers 19:1'],
    ['Balak', 'Numbers 22:2'], ['Pinchas', 'Numbers 25:10'], ['Matot', 'Numbers 30:2'], ['Masei', 'Numbers 33:1'],
    ['Devarim', 'Deuteronomy 1:1'], ['Vaetchanan', 'Deuteronomy 3:23'], ['Eikev', 'Deuteronomy 7:12'], ['Re\'eh', 'Deuteronomy 11:26'], ['Shoftim', 'Deuteronomy 16:18'],
    ['Ki Teitzei', 'Deuteronomy 21:10'], ['Ki Tavo', 'Deuteronomy 26:1'], ['Nitzavim', 'Deuteronomy 29:9'], ['Vayeilech', 'Deuteronomy 31:1'], ['Ha\'azinu', 'Deuteronomy 32:1'],
    ['Vezot Haberakhah', 'Deuteronomy 33:1']
  ];
  // חג: [מפתח, שם, פסוק, חודש עברי, יום, ימי יום טוב בארץ (0 = לא יום טוב), ברכה, שם ב-hebcal כשהחג חל בשבת]
  var CHAG = [
    ['rh', 'ראש השנה', 'Leviticus 23:24', 'TISHREI', 1, 2, 'שנה טובה ומתוקה', 'Rosh Hashana'],
    ['yk', 'יום הכיפורים', 'Leviticus 16:30', 'TISHREI', 10, 1, 'גמר חתימה טובה', 'Yom Kippur'],
    ['sukkot', 'סוכות', 'Leviticus 23:42', 'TISHREI', 15, 1, 'חג שמח', 'Sukkot'],
    ['simchat', 'שמחת תורה', 'Deuteronomy 33:4', 'TISHREI', 22, 1, 'חג שמח', 'Shmini Atzeret'],
    ['chanukah', 'חנוכה', 'Zechariah 4:6', 'KISLEV', 25, 0, 'חנוכה שמח', 'Chanukah'],
    ['purim', 'פורים', 'Esther 8:16', 'ADAR', 14, 0, 'פורים שמח', 'Purim'],
    ['pesach', 'פסח', 'Exodus 12:14', 'NISAN', 15, 1, 'חג כשר ושמח', 'Pesach'],
    ['shavuot', 'שבועות', 'Exodus 20:2', 'SIVAN', 6, 1, 'חג שמח', 'Shavuot']
  ];
  var CITIES = [['31.778,35.235', 'ירושלים', 40], ['32.08,34.78', 'תל אביב', 20], ['32.79,34.99', 'חיפה', 30], ['31.25,34.79', 'באר שבע', 20], ['32.965,35.496', 'צפת', 20], ['32.79,35.53', 'טבריה', 20], ['29.557,34.952', 'אילת', 20], ['31.89,34.81', 'רחובות', 20], ['32.09,34.88', 'פתח תקווה', 20], ['31.8,34.65', 'אשדוד', 20], ['32.33,34.86', 'נתניה', 20], ['31.53,35.1', 'חברון', 20], ['31.35,34.3', 'עוטף עזה', 20], ['33.2,35.57', 'גבול הצפון (קריית שמונה)', 20], ['32.3,35.2', 'שומרון', 20], ['31.0,34.8', 'הנגב (צאלים)', 20], ['32.9,35.75', 'רמת הגולן', 20]];

  // ---------- תמונות (כמו ב-/kodesh/video/) ----------
  var IMGS = { kotel: 3, jeru: 2, light: 3, mount: 4, desert: 4, sea: 4, stars: 2, sunset: 4, wheat: 3, olive: 2, path: 2, torah: 3, books: 1, candles: 2, flowers: 2 };
  var KEYS = {
    kotel: ['כותל', 'מקדש', 'חורבן', 'גלות', 'ציון', 'תשעה באב', 'הר הבית', 'קרבן', 'כהן', 'אבן', 'אבנים', 'משכן', 'מכפלה'],
    jeru: ['ירושלים', 'עיר', 'שער', 'חומה', 'בית', 'עם ישראל', 'כנסת ישראל', 'שיבה', 'עלייה לרגל'],
    light: ['אור', 'הארה', 'נשמה', 'שכינה', 'אמונה', 'קדושה', 'רוח', 'הקב"ה', 'הקב״ה', 'בורא', 'אלוקים', 'ה\'', 'השם', 'חסד', 'רחמים', 'תשובה'],
    mount: ['הר', 'סיני', 'עלייה', 'לעלות', 'מעלה', 'גבוה', 'זריחה', 'בוקר', 'שמש', 'התחלה', 'חדש', 'מתן תורה', 'שבועות', 'עקדה', 'מוריה'],
    desert: ['מדבר', 'ענווה', 'ניסיון', 'נסיון', 'קושי', 'קשה', 'צרה', 'בדידות', 'יציאת מצרים', 'מצרים', 'עבדות', 'חירות', 'שממה', 'צמא'],
    sea: ['ים', 'מים', 'נהר', 'מבול', 'נח', 'קריעת', 'גלים', 'כנרת', 'מעיין', 'באר', 'נס', 'ניסים', 'יונה', 'גמלים'],
    stars: ['כוכב', 'כוכבים', 'לילה', 'חלום', 'אברהם', 'זרעך', 'שמים', 'שמיים', 'הבטחה', 'לבנה', 'ירח', 'יעקב'],
    sunset: ['שבת', 'ערב', 'שקיעה', 'מנוחה', 'סוף', 'סיום', 'זיכרון', 'געגוע', 'תפילה', 'מנחה', 'יום כיפור', 'שלום', 'פטירה'],
    wheat: ['שדה', 'קציר', 'לחם', 'ברכה', 'פרנסה', 'חיטה', 'עומר', 'ביכורים', 'זרע', 'צמיחה', 'פרי', 'יבול', 'רות', 'שפע', 'תודה', 'הודיה'],
    olive: ['זית', 'שורש', 'שורשים', 'אבות', 'עץ', 'שמן', 'חנוכה', 'דורות', 'מסורת', 'סבא', 'ותיק', 'יציבות'],
    path: ['דרך', 'הליכה', 'ללכת', 'לך לך', 'מסע', 'צעד', 'בחירה', 'כיוון', 'הולך', 'הלך', 'מטרה', 'שליחות'],
    torah: ['תורה', 'פסוק', 'פרשה', 'ספר תורה', 'מצווה', 'מצוה', 'מצוות', 'כתוב', 'קריאה', 'משה', 'הלכה', 'חומש'],
    books: ['ספר', 'ספרים', 'לימוד', 'ללמוד', 'חכמה', 'בית מדרש', 'גמרא', 'משנה', 'שיעור', 'חכמים', 'רבי', 'תלמיד', 'מדרש', 'רש"י', 'רש״י'],
    candles: ['נר', 'נרות', 'להבה', 'הדלקה', 'נשמת', 'לעילוי', 'אזכרה', 'חושך', 'ניצוץ', 'אש'],
    flowers: ['אביב', 'פסח', 'פריחה', 'פורח', 'חיים', 'שמחה', 'ארץ ישראל', 'הארץ', 'גאולה', 'תקווה', 'תקוה', 'משיח', 'לידה', 'ילד', 'ילדים', 'נישואין', 'חתן', 'כלה']
  };
  var DEFAULT_ORDER = ['light', 'mount', 'sunset', 'path', 'wheat', 'sea', 'olive', 'stars', 'flowers', 'desert'];
  var ALL = [];
  Object.keys(IMGS).forEach(function (c) { for (var i = 1; i <= IMGS[c]; i++) ALL.push(c + '-' + i); });

  var KEEP = ['mode', 'rav', 'unit', 'foot', 'place', 'size', 'pace', 'music', 'look', 'pon', 'ton'];
  var cache = {}, slides = [], seed = 0, playing = null, recording = false;
  var week = null;   // { label, sat (Date), chag (מפתח או null), ref, greet }
  var cur = null;    // הבחירה הנוכחית אחרי חישוב: { label, ref, greet, times: {in, out, inLbl, outLbl} | null }
  var gps = null;    // [lat, lng] אחרון שנמדד

  function field(n) { return form.querySelector('[name=' + n + ']'); }
  function val(n) {
    if (n === 'mode') { var r = form.querySelector('[name=mode]:checked'); return r ? r.value : 'kehila'; }
    var el = field(n); if (!el) return '';
    return el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value.trim();
  }
  function img(name) {
    if (!cache[name]) cache[name] = new Promise(function (res) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { res(im); }; im.onerror = function () { res(null); };
      setTimeout(function () { res(im.complete && im.naturalWidth ? im : null); }, 20000);
      im.src = '/assets/video/' + name + '.jpg';
    });
    return cache[name];
  }

  // ---------- תאריכים וזמנים ----------
  var tf = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
  function hm(d) { return d && !isNaN(d) ? tf.format(d) : ''; }
  function add(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function noon(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }
  function down(d) { return new Date(Math.floor(d.getTime() / 60000) * 60000); }
  function up(d) { return new Date(Math.ceil(d.getTime() / 60000) * 60000); }
  function heName(en) { try { return H.Locale.gettext(en, 'he-x-NoNikud'); } catch (e) { return en; } }
  function nextSat(from) { var d = noon(from); return add(d, (6 - d.getDay() + 7) % 7); }
  function sedra(sat) { var hd = new H.HDate(sat); return H.getSedra(hd.getFullYear(), true).lookup(hd); }
  function parIdx(en) { for (var i = 0; i < PAR.length; i++) if (PAR[i][0] === en) return i; return -1; }

  function place() {
    var p = val('place');
    if (p === 'gps' && gps) return { ll: gps, name: 'לפי המיקום', mins: 20 };
    var c = CITIES.filter(function (x) { return x[0] === p; })[0] || CITIES[0];
    var ll = c[0].split(',').map(Number);
    return { ll: ll, name: c[1], mins: c[2] };
  }
  function geo(pl) { return new H.GeoLocation(pl.name, pl.ll[0], pl.ll[1], 0, 'Asia/Jerusalem'); }
  function sunset(gl, d) { return new H.Zmanim(gl, noon(d), false).sunset(); }
  function tzeit(gl, d) { return new H.Zmanim(gl, noon(d), false).tzeit(8.5); }

  // השבת הקרובה, ואם היא חג – החג
  function findWeek() {
    var sat = nextSat(new Date()), sd = sedra(sat);
    if (sd.chag) {
      var en = String(sd.parsha[0] || ''), c = CHAG.filter(function (x) { return en.indexOf(x[7]) === 0; })[0];
      if (c) return { sel: 'c:' + c[0], sat: sat };
      // שבת שהיא חג שלא ברשימה (חול המועד) – השבוע שאחריה
      sat = add(sat, 7); sd = sedra(sat);
    }
    return { sel: 'p:' + parIdx(sd.parsha[0]), sat: sat };
  }
  // התאריך הקרוב (מהיום והלאה) של פרשה או חג
  function parshaDate(idx) {
    var sat = nextSat(new Date());
    for (var w = 0; w < 60; w++, sat = add(sat, 7)) {
      var sd = sedra(sat);
      if (!sd.chag && sd.parsha.indexOf(PAR[idx][0]) > -1) return { sat: sat, names: sd.parsha };
    }
    return { sat: null, names: [PAR[idx][0]] };
  }
  function chagDate(c) {
    var today = noon(new Date()), hy = new H.HDate(today).getFullYear();
    for (var y = hy; y <= hy + 1; y++) {
      var m = H.months[c[3]];
      if (c[3] === 'ADAR' && H.HDate.isLeapYear(y)) m = H.months.ADAR_II;
      var d = noon(new H.HDate(c[4], m, y).greg());
      if (d >= add(today, -1)) return d;
    }
    return null;
  }

  function compute() {
    if (!H) return;
    var s = val('par') || (week && week.sel), pl = place(), gl = geo(pl), mins = pl.mins;
    var mode = val('mode');
    if (s.indexOf('c:') === 0) {
      var c = CHAG.filter(function (x) { return 'c:' + x[0] === s; })[0];
      var d = chagDate(c), times = null;
      if (d && c[5]) {
        var last = add(d, c[5] - 1), eve = add(d, -1);
        times = { inT: hm(down(new Date(sunset(gl, eve).getTime() - mins * 60000))), outT: hm(up(tzeit(gl, last))), inL: 'כניסת החג', outL: 'צאת החג' };
        // חג שמתחיל במוצאי שבת: מדליקים אחרי צאת השבת
        if (eve.getDay() === 6) { times.inT = hm(up(tzeit(gl, eve))); times.inL = 'הדלקה במוצאי שבת'; }
        // חג שנגמר ביום שישי: השבת נכנסת מיד אחריו, ויוצאים במוצאי שבת
        if (last.getDay() === 5) { times.outT = hm(up(tzeit(gl, add(last, 1)))); times.outL = 'צאת החג והשבת'; }
      }
      cur = { label: c[1], sub: c[1], ref: c[2], greet: c[6], times: times, date: d, kind: 'chag' };
    } else {
      var idx = +s.slice(2); if (!(idx >= 0)) idx = 0;
      var pd = parshaDate(idx), sat = pd.sat;
      var name = 'פרשת ' + pd.names.map(heName).join('-');
      var tm = null;
      if (sat) {
        var fri = add(sat, -1);
        tm = { inT: hm(down(new Date(sunset(gl, fri).getTime() - mins * 60000))), outT: hm(up(tzeit(gl, sat))), inL: 'כניסת השבת', outL: 'צאת השבת' };
      }
      cur = { label: name, sub: name, ref: PAR[parIdx(pd.names[0])][1], greet: mode === 'tzava' ? 'שבת שלום ובשורות טובות' : 'שבת שלום ומבורך', times: tm, date: sat, kind: 'par' };
    }
    cur.place = pl.name;
    weekLine();
  }
  function weekLine() {
    var w = $('vp-week'), d = cur.date;
    var ds = d ? new H.HDate(cur.kind === 'par' ? d : d).renderGematriya(true) + ' · ' + d.getDate() + '.' + (d.getMonth() + 1) : '';
    var t = cur.times && val('ton') ? ' · ' + cur.times.inL + ' ' + cur.times.inT + ', ' + cur.times.outL + ' ' + cur.times.outT + ' (' + cur.place + ')' : '';
    w.innerHTML = '';
    var b = document.createElement('b'); b.textContent = cur.label;
    w.appendChild(document.createTextNode(val('par') === (week && week.sel) ? 'השבוע: ' : 'נבחר: '));
    w.appendChild(b);
    w.appendChild(document.createTextNode((ds ? ' · ' + ds : '') + t));
  }

  // ---------- פסוק מספריא, בלי ניקוד ----------
  var pcache = {}, pasukFor = '';
  function plain(t) {
    return String(t).replace(/<[^>]+>/g, '').replace(/&nbsp;|&thinsp;/g, ' ').replace(/\{[פס]\}/g, '')
      .replace(/[־׀]/g, ' ').replace(/[֑-ֽֿׁׂׄ-ׇ]/g, '').replace(/\s+/g, ' ').trim()
      // השם לא נכתב במלואו בדף שנשלח: ה' ואלוקים
      .replace(/(^|[\s(])([והבלמכש]{0,2})יהוה/g, '$1$2ה\'')
      .replace(/(^|[\s(])([והבלמכש]{0,2})אלה(ים|יך|יכם|ינו|יו|יה|יהם|י)(?=[\s׃,.;:)]|$)/g, '$1$2אלוק$3');
  }
  function getJson(u, tries) {
    return fetch(u).then(function (r) { return r.ok ? r.json() : null; }, function (err) {
      if (tries > 0) return new Promise(function (ok) { setTimeout(ok, 1200); }).then(function () { return getJson(u, tries - 1); });
      throw err;
    });
  }
  function loadPasuk() {
    var ref = cur && cur.ref; if (!ref || ref === pasukFor) return;
    pasukFor = ref;
    var ta = $('vp-pasuk'), lab = $('vp-ref');
    function put(r) {
      if (pasukFor !== ref) return;
      ta.value = r ? r.text : ''; lab.textContent = r ? r.he : 'לא הצלחתי להביא את הפסוק מספריא. אפשר להקליד אותו כאן.';
      ta.dataset.ref = r ? r.he : '';
      upd();
    }
    if (pcache[ref]) return put(pcache[ref]);
    lab.textContent = 'מביא את הפסוק מספריא…'; ta.value = ''; ta.dataset.ref = '';
    getJson('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(ref) + '?version=hebrew', 2).then(function (d) {
      if (!d || !d.versions || !d.versions.length) return put(null);
      var t = d.versions[0].text; if (Array.isArray(t)) t = t.join(' ');
      var r = { text: plain(t), he: plain(d.heRef || ref) };
      pcache[ref] = r; put(r);
    }).catch(function () { put(null); });
  }

  // ---------- חלוקה לשקופיות (כמו ב-/kodesh/video/) ----------
  function sentences(p) {
    var out = [], m = p.match(/[^.!?׃]+[.!?׃]*["'״”׳)\]]*\s*/g) || [p];
    m.forEach(function (s) { s = s.trim(); if (s) out.push(s); });
    return out;
  }
  function chunkLong(s, max) {
    if (s.length <= max) return [s];
    var parts = [], c = '';
    s.split(/(?<=,|،|;)\s+|\s+/).forEach(function (w) {
      var t = c ? c + ' ' + w : w;
      if (t.length > max && c) { parts.push(c); c = w; } else c = t;
    });
    if (c) parts.push(c);
    return parts;
  }
  function split(body) {
    var MAX = 130, out = [];
    body.replace(/\r/g, '').split(/\n+/).forEach(function (para) {
      para = para.trim(); if (!para) return;
      var c = '', n = 0;
      sentences(para).forEach(function (s) {
        chunkLong(s, MAX).forEach(function (x) {
          if (c && (c.length + x.length + 1 > MAX || n >= 2)) { out.push(c); c = ''; n = 0; }
          c = c ? c + ' ' + x : x; n++;
        });
      });
      if (c) out.push(c);
    });
    return out.slice(0, 30);
  }

  function topics(text) {
    var t = ' ' + text.replace(/[^֐-׿'"״ ]/g, ' ') + ' ', sc = [];
    Object.keys(KEYS).forEach(function (c) {
      var s = 0;
      KEYS[c].forEach(function (k) {
        var re = new RegExp('[ ]([והבלמשכ]{0,2})' + k.replace(/["'״]/g, '.') + '(ים|ות|ה|ו|י|ך|נו|כם)?[ ]', 'g');
        var m = t.match(re); if (m) s += m.length * (k.length > 3 ? 2 : 1);
      });
      if (s) sc.push([c, s]);
    });
    sc.sort(function (a, b) { return b[1] - a[1]; });
    return sc.map(function (x) { return x[0]; });
  }
  function freeIn(cat, used, last) {
    var n = IMGS[cat]; if (!n) return null;
    for (var j = 0; j < n; j++) { var nm = cat + '-' + ((j + seed) % n + 1); if (!used[nm] && nm !== last) return nm; }
    return null;
  }
  function assign() {
    var used = {}, last = '', di = seed;
    slides.forEach(function (sl, i) {
      if (sl.fixed) { used[sl.img] = 1; last = sl.img; return; }
      var cats = sl.kind === 'end' ? ['sunset', 'candles', 'light'] : sl.kind === 'title' ? ['torah', 'books', 'light'] : sl.kind === 'pasuk' ? ['torah', 'mount', 'light'] : topics(sl.text);
      var pick = null;
      for (var k = 0; k < cats.length && !pick; k++) pick = freeIn(cats[k], used, last);
      while (!pick) { pick = freeIn(DEFAULT_ORDER[di % DEFAULT_ORDER.length], used, last); di++; if (di > seed + 40) pick = ALL[(i + seed) % ALL.length]; }
      sl.img = pick; used[pick] = 1; last = pick;
    });
  }

  // ---------- בניית הרצף ----------
  function build() {
    if (!cur) return;
    var body = val('body') || $('vp-body').placeholder, pace = parseFloat(val('pace')) || 1, tz = val('mode') === 'tzava';
    var old = slides;
    var list = [{ kind: 'title', text: val('title') || cur.label, sub: val('title') ? cur.label : (cur.kind === 'par' ? 'דבר תורה לשבת' : 'דבר תורה לחג') }];
    if (val('pon') && val('pasuk')) list.push({ kind: 'pasuk', text: val('pasuk'), sub: $('vp-pasuk').dataset.ref || '' });
    if (val('body')) split(body).forEach(function (s) { list.push({ kind: 'text', text: s }); });
    else list.push({ kind: 'text', text: 'כאן יופיע דבר התורה שלכם. מדביקים אותו בתיבה למעלה.' });
    list.push({ kind: 'end', text: cur.greet, rav: val('rav'), unit: tz ? val('unit') : '', foot: tz ? '' : val('foot'), times: val('ton') ? cur.times : null, place: cur.place });
    list.forEach(function (sl, i) { if (old[i] && old[i].fixed && old[i].kind === sl.kind && old[i].text === sl.text) { sl.fixed = true; sl.img = old[i].img; } });
    slides = list;
    assign();
    var t = 0;
    slides.forEach(function (sl) {
      var d = sl.kind === 'title' ? 4 : sl.kind === 'end' ? (sl.times ? 6 : 4.5) : sl.kind === 'pasuk' ? Math.min(10, Math.max(5, 2 + sl.text.length / 11)) : Math.min(11, Math.max(3.8, 1.6 + sl.text.length / 12));
      if (sl.kind === 'text' || sl.kind === 'pasuk') d *= pace;
      sl.start = t; sl.dur = d; t += d;
    });
    renderList();
    var secs = Math.round(total());
    $('vd-info').textContent = slides.length + ' שקופיות · כ-' + secs + ' שניות' + (secs > 60 ? ' · בסטטוס של ווטסאפ סרטון ארוך מדקה מתחלק לחלקים' : '');
  }
  function total() { var l = slides[slides.length - 1]; return l ? l.start + l.dur : 0; }
  var KIND = { title: 'פתיחה', pasuk: 'פסוק', end: 'סיום' };
  function renderList() {
    var ol = $('vd-slides'); ol.innerHTML = '';
    slides.forEach(function (sl, i) {
      var li = document.createElement('li'), im = document.createElement('img'), sp = document.createElement('span');
      im.src = '/assets/video/' + sl.img + '.jpg'; im.alt = 'להחליף את התמונה של שקופית ' + (i + 1); im.loading = 'lazy'; im.title = 'להחליף תמונה';
      im.addEventListener('click', function () {
        var k = ALL.indexOf(sl.img); sl.img = ALL[(k + 1) % ALL.length]; sl.fixed = true; im.src = '/assets/video/' + sl.img + '.jpg'; img(sl.img).then(function (x) { loaded[sl.img] = x; frame(sl.start + 1.2); });
      });
      var line = sl.kind === 'end' ? [sl.text, sl.rav, sl.unit].filter(Boolean).join(' · ') : sl.text;
      sp.textContent = line;
      var sm = document.createElement('small'); sm.textContent = (i + 1) + ' · ' + (KIND[sl.kind] || Math.round(sl.dur) + ' שנ\'');
      sp.prepend(sm);
      li.appendChild(im); li.appendChild(sp); ol.appendChild(li);
    });
  }

  // ---------- ציור ----------
  var loaded = {};
  function preload() { return Promise.all(slides.map(function (s) { return img(s.img).then(function (im) { loaded[s.img] = im; }); })); }
  function wrap(text, font, maxW) {
    ctx.font = font; var out = [], line = '';
    text.split(/\s+/).filter(Boolean).forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    });
    if (line) out.push(line);
    return out;
  }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function drawBg(sl, p, alpha, idx) {
    var im = loaded[sl.img], W = cv.width, H2 = cv.height;
    ctx.globalAlpha = alpha;
    if (!im) { ctx.fillStyle = '#0e1628'; ctx.fillRect(0, 0, W, H2); ctx.globalAlpha = 1; return; }
    var z = 1.04 + 0.12 * (idx % 2 ? 1 - p : p);
    var s = Math.max(W / im.width, H2 / im.height) * z, w = im.width * s, h = im.height * s;
    var dx = (W - w) / 2 + (idx % 3 - 1) * (w - W) * 0.25 * (p - 0.5), dy = (H2 - h) / 2;
    ctx.drawImage(im, dx, dy, w, h);
    ctx.globalAlpha = 1;
  }
  function shade(strong) {
    var W = cv.width, H2 = cv.height, g = ctx.createLinearGradient(0, 0, 0, H2), k = strong ? 0.12 : 0;
    g.addColorStop(0, 'rgba(0,0,0,' + (0.45 + k) + ')'); g.addColorStop(0.3, 'rgba(0,0,0,' + (0.5 + k) + ')'); g.addColorStop(0.7, 'rgba(0,0,0,' + (0.55 + k) + ')'); g.addColorStop(1, 'rgba(0,0,0,.72)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H2);
  }
  function txt(s, x, y, color) {
    ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 2;
    ctx.fillStyle = color; ctx.fillText(s, x, y);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }
  function fit(text, weight, family, from, to, maxW, box, lhK) {
    var fs, lines, lh;
    for (fs = from; fs >= to; fs -= 2) { lh = fs * lhK; lines = wrap(text, weight + ' ' + Math.round(fs) + 'px ' + family, maxW); if (lines.length * lh <= box) break; }
    ctx.font = weight + ' ' + Math.round(fs) + 'px ' + family;
    return { fs: fs, lines: lines, lh: lh };
  }
  function drawText(sl, a, rise) {
    var W = cv.width, H2 = cv.height, u = W / 720, gold = val('look') !== 'white' ? GOLD : '#ffffff', tall = H2 > W;
    ctx.globalAlpha = a; ctx.direction = 'rtl'; ctx.textAlign = 'center';
    var maxW = W * 0.84, cy = H2 / 2 + rise * u;
    if (sl.kind === 'title') {
      // "פרשת ___" בזהב, והכותרת בגדול
      var big = fit(sl.text, '700', SERIF, 74 * u, 40 * u, maxW, H2 * 0.32, 1.22);
      var y = cy - (big.lines.length - 1) * big.lh / 2 + big.fs * 0.3;
      if (sl.sub) { ctx.font = '700 ' + Math.round(38 * u) + 'px ' + SERIF; txt(sl.sub, W / 2, y - big.fs * 0.95 - 34 * u, gold); }
      ctx.font = '700 ' + Math.round(big.fs) + 'px ' + SERIF;
      big.lines.forEach(function (l, i) { txt(l, W / 2, y + i * big.lh, '#ffffff'); });
      ctx.fillStyle = gold; ctx.fillRect(W / 2 - 60 * u, y + (big.lines.length - 1) * big.lh + 38 * u, 120 * u, 3 * u);
    } else if (sl.kind === 'pasuk') {
      var pz = fit(sl.text, '500', SERIF, 52 * u, 26 * u, maxW * 0.95, H2 * (tall ? 0.46 : 0.56), 1.5);
      var py = cy - (pz.lines.length - 1) * pz.lh / 2 + pz.fs * 0.3;
      ctx.font = '700 ' + Math.round(60 * u) + 'px ' + SERIF; txt('״', W / 2, py - pz.fs - 30 * u, gold);
      ctx.font = '500 ' + Math.round(pz.fs) + 'px ' + SERIF;
      pz.lines.forEach(function (l, i) { txt(l, W / 2, py + i * pz.lh, '#ffffff'); });
      if (sl.sub) { ctx.font = '600 ' + Math.round(26 * u) + 'px ' + SANS; txt('(' + sl.sub + ')', W / 2, py + (pz.lines.length - 1) * pz.lh + 58 * u, gold); }
    } else if (sl.kind === 'end') {
      var parts = [], g = 30 * u;
      parts.push({ t: sl.text, f: '700 ' + Math.round((tall ? 58 : 50) * u) + 'px ' + SERIF, c: gold, h: (tall ? 70 : 60) * u });
      if (sl.rav) parts.push({ t: sl.rav, f: '600 ' + Math.round(32 * u) + 'px ' + SANS, c: '#ffffff', h: 44 * u, gap: g * 0.6 });
      if (sl.unit) parts.push({ t: sl.unit, f: '600 ' + Math.round(28 * u) + 'px ' + SANS, c: gold, h: 40 * u });
      if (sl.foot) parts.push({ t: sl.foot, f: '400 ' + Math.round(26 * u) + 'px ' + SANS, c: '#ffffff', h: 38 * u });
      var boxH = sl.times ? 150 * u : 0;
      var lines = [];
      parts.forEach(function (p) { wrap(p.t, p.f, maxW).forEach(function (l, i) { lines.push({ t: l, f: p.f, c: p.c, h: p.h, gap: i ? 0 : (p.gap || 0) }); }); });
      var hh = lines.reduce(function (s, l) { return s + l.h + l.gap; }, 0) + (boxH ? boxH + g * 1.4 : 0);
      var yy = cy - hh / 2 + lines[0].h * 0.75;
      lines.forEach(function (l) { yy += l.gap; ctx.font = l.f; txt(l.t, W / 2, yy, l.c); yy += l.h; });
      if (sl.times) {
        var bw = Math.min(maxW, 560 * u), bx = (W - bw) / 2, by = yy - lines[lines.length - 1].h * 0.75 + g * 1.4;
        ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.strokeStyle = 'rgba(230,197,126,.75)'; ctx.lineWidth = 2 * u;
        rr(bx, by, bw, boxH, 18 * u); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(230,197,126,.5)'; ctx.fillRect(W / 2 - 1 * u, by + 22 * u, 2 * u, boxH - 44 * u);
        [[sl.times.inL, sl.times.inT, bx + bw * 0.75], [sl.times.outL, sl.times.outT, bx + bw * 0.25]].forEach(function (c) {
          ctx.font = '600 ' + Math.round(24 * u) + 'px ' + SANS; txt(c[0], c[2], by + 48 * u, '#ffffff');
          ctx.font = '700 ' + Math.round(50 * u) + 'px ' + SERIF; ctx.direction = 'ltr'; txt(c[1], c[2], by + 106 * u, gold); ctx.direction = 'rtl';
        });
        ctx.font = '400 ' + Math.round(22 * u) + 'px ' + SANS; txt('לפי ' + sl.place.replace(/^לפי /, ''), W / 2, by + boxH + 34 * u, 'rgba(255,255,255,.85)');
      }
      ctx.font = '400 ' + Math.round(20 * u) + 'px ' + SANS; txt('נוצר בחינם בכלי קודש', W / 2, H2 - 50 * u, 'rgba(255,255,255,.75)');
    } else {
      var tb = fit(sl.text, '600', SANS, 58 * u, 26 * u, maxW, H2 * (tall ? 0.5 : 0.62), 1.5);
      var y0 = cy - (tb.lines.length - 1) * tb.lh / 2 + tb.fs * 0.35;
      tb.lines.forEach(function (l, i) { txt(l, W / 2, y0 + i * tb.lh, '#ffffff'); });
    }
    ctx.font = '600 ' + Math.round(20 * u) + 'px ' + SANS; ctx.textAlign = 'right';
    txt('בס"ד', W - 26 * u, 44 * u, 'rgba(255,255,255,.8)');
    if (sl.kind !== 'title' && sl.kind !== 'end' && cur) { ctx.textAlign = 'left'; txt(cur.label, 26 * u, 44 * u, 'rgba(230,197,126,.85)'); }
    ctx.globalAlpha = 1;
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  var FADE = 0.9;
  function frame(t) {
    var W = cv.width, H2 = cv.height, i = 0;
    while (i < slides.length - 1 && t >= slides[i + 1].start) i++;
    var sl = slides[i]; if (!sl) return;
    var local = t - sl.start, p = Math.min(1, (local + FADE) / (sl.dur + FADE));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H2);
    if (i > 0 && local < FADE) { drawBg(slides[i - 1], 1, 1, i - 1); drawBg(sl, p, ease(local / FADE), i); }
    else drawBg(sl, p, 1, i);
    shade(sl.kind === 'end' || sl.kind === 'pasuk');
    var a = ease((local - 0.25) / 0.7), out = sl.dur - local;
    if (i < slides.length - 1 && out < 0.5) a *= ease(out / 0.5);
    if (i === slides.length - 1 && out < 0.8) a *= ease(out / 0.8);
    drawText(sl, a, 18 * (1 - ease((local - 0.25) / 0.7)));
    if (i === slides.length - 1 && out < 0.8) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - out / 0.8) + ')'; ctx.fillRect(0, 0, W, H2); }
  }

  // ---------- מוזיקה (WebAudio, נוצרת כאן) ----------
  var CH = [[50, 54, 57, 62], [47, 50, 54, 59], [43, 47, 50, 55], [45, 49, 52, 57]];
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function music(ac, dest, dur, lead) {
    var t0 = ac.currentTime + (lead || 0.05), master = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1500;
    master.gain.setValueAtTime(0, t0); master.gain.linearRampToValueAtTime(0.65, t0 + 2);
    master.gain.setValueAtTime(0.65, t0 + Math.max(2.1, dur - 3)); master.gain.linearRampToValueAtTime(0, t0 + dur);
    lp.connect(master); dest.forEach(function (d) { master.connect(d); });
    var dl = ac.createDelay(), fb = ac.createGain(); dl.delayTime.value = 0.42; fb.gain.value = 0.35;
    dl.connect(fb); fb.connect(dl); dl.connect(lp);
    var nodes = [];
    for (var b = 0, t = t0; t < t0 + dur; b++, t += 4) {
      var ch = CH[b % 4];
      ch.forEach(function (m) {
        ['sine', 'triangle'].forEach(function (type, j) {
          var o = ac.createOscillator(), g = ac.createGain();
          o.type = type; o.frequency.value = hz(m) * (j ? 1.003 : 1);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(j ? 0.035 : 0.06, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 4.6);
          o.connect(g); g.connect(lp); o.start(t); o.stop(t + 4.7); nodes.push(o);
        });
      });
      [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12].forEach(function (m, k) {
        var tt = t + k + 0.5; if (tt > t0 + dur - 1) return;
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = hz(m);
        g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.05, tt + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, tt + 1.6);
        o.connect(g); g.connect(lp); g.connect(dl); o.start(tt); o.stop(tt + 1.7); nodes.push(o);
      });
    }
    var stop = function () { nodes.forEach(function (o) { try { o.stop(); } catch (e) {} }); try { master.disconnect(); } catch (e) {} };
    stop.t0 = t0;
    return stop;
  }

  // ---------- ניגון והקלטה ----------
  function size() { var s = SIZES[val('size')] || SIZES.story; if (cv.width !== s[0] || cv.height !== s[1]) { cv.width = s[0]; cv.height = s[1]; } }
  function run(onFrame) {
    return new Promise(function (res) {
      var T = total(), st = performance.now();
      function tick() {
        if (!playing) return res(false);
        var t = (performance.now() - st) / 1000;
        if (t >= T) { frame(T - 0.001); return res(true); }
        frame(t); onFrame && onFrame(t / T);
        // requestAnimationFrame נעצר כשהחלון מוסתר; לכן גם טיימר גיבוי, ומה שמגיע ראשון מצייר
        var done = false, go = function () { if (!done) { done = true; tick(); } };
        requestAnimationFrame(go); setTimeout(go, 40);
      }
      tick();
    });
  }
  function stopAll() { if (playing && playing.stop) playing.stop(); playing = null; }
  function ac() { var A = window.AudioContext || window.webkitAudioContext; return A ? new A() : null; }

  $('vd-play').addEventListener('click', function () {
    var b = this;
    if (playing) { stopAll(); b.textContent = '▶ לצפות לפני'; return; }
    if (recording || !cur) return;
    build(); size();
    preload().then(function () {
      var a = val('music') !== 'none' ? ac() : null, st = null;
      if (a) st = music(a, [a.destination], total());
      playing = { stop: function () { st && st(); a && a.close(); } };
      b.textContent = '■ לעצור';
      run().then(function () { stopAll(); b.textContent = '▶ לצפות לפני'; });
      used('preview');
    });
  });

  function mime() {
    var list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    if (!window.MediaRecorder) return null;
    for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  var result = null;
  $('vd-make').addEventListener('click', function () {
    if (recording || !cur) return;
    if (!val('body')) { field('body').reportValidity(); field('body').focus(); return; }
    var m = mime();
    if (m === null || !cv.captureStream) { $('vd-info').textContent = 'הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום, בטלפון אנדרואיד או במחשב.'; return; }
    stopAll(); build(); size();
    var b = this, pg = $('vd-prog');
    recording = true; b.disabled = true; b.textContent = 'יוצר סרטון…';
    $('vd-result').hidden = true; pg.hidden = false; pg.value = 0;
    preload().then(function () {
      frame(0);
      var stream = cv.captureStream(30), a = null, st = null, d = null, ready = false;
      if (val('music') !== 'none') {
        a = ac();
        if (a) { d = a.createMediaStreamDestination(); try { var keep = a.createConstantSource(); keep.offset.value = 0; keep.connect(d); keep.start(); } catch (e) {} d.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); }); }
      }
      var rec = new MediaRecorder(stream, m ? { mimeType: m, videoBitsPerSecond: 2500000 } : { videoBitsPerSecond: 2500000 }), parts = [];
      rec.ondataavailable = function (e) { ready = true; if (e.data && e.data.size) parts.push(e.data); };
      rec.onstop = function () {
        var type = (rec.mimeType || m || 'video/webm').split(';')[0];
        result = { blob: new Blob(parts, { type: type }), ext: type.indexOf('mp4') > -1 ? 'mp4' : 'webm' };
        window.__vpResult = result;
        var v = $('vd-video'); v.src = URL.createObjectURL(result.blob);
        $('vd-result').hidden = false; pg.hidden = true;
        $('vd-fmt').textContent = result.ext === 'mp4' ? 'הסרטון בפורמט MP4, מתאים לווטסאפ.' : 'הסרטון נשמר בפורמט WebM. ווטסאפ בטלפון מעדיף MP4: כדאי ליצור אותו בכרום מעודכן או באייפון.';
        recording = false; b.disabled = false; b.textContent = 'ליצור את הסרטון';
        $('vd-info').textContent = 'הסרטון מוכן (' + Math.round(result.blob.size / 1048576 * 10) / 10 + ' MB). אפשר לצפות, לשמור ולשתף.';
        a && a.close();
        $('vd-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
        used('create', { fmt: result.ext, slides: slides.length, secs: Math.round(total()) });
      };
      playing = { stop: function () { st && st(); } };
      rec.start(250);
      // המקליט מתחיל לקבל תמונות רק אחרי רגע, ומה שמצויר לפני כן לא נכנס לסרטון: מחכים לחלק הראשון שלו, ורק אז מתחילים
      var began = performance.now();
      (function wait() {
        if (!playing) return;
        if (!ready || performance.now() - began < 300) { frame(0); return setTimeout(wait, 30); }
        if (d && !st) st = music(a, [d], total(), 0.5);
        if (st && a.currentTime < st.t0) { frame(0); return setTimeout(wait, 20); }
        run(function (p) { pg.value = p; }).then(function () {
          setTimeout(function () { playing = null; rec.stop(); stream.getTracks().forEach(function (tr) { tr.stop(); }); }, 250);
        });
      })();
    });
  });

  function fname() { return ((cur ? cur.label : 'פרשה') + (val('title') ? ' – ' + val('title') : '')).replace(/[\\/:*?"<>|]/g, '').slice(0, 50) + '.' + (result ? result.ext : 'mp4'); }
  function download() { var x = document.createElement('a'); x.href = URL.createObjectURL(result.blob); x.download = fname(); document.body.appendChild(x); x.click(); x.remove(); }
  $('vd-dl').addEventListener('click', function () { if (result) { download(); used('download'); } });
  $('vd-share').addEventListener('click', function () {
    if (!result) return;
    var f = new File([result.blob], fname(), { type: result.blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], text: cur.label + (val('title') ? ' – ' + val('title') : '') }).then(function () { used('share'); }).catch(function () {});
    } else { download(); $('vd-tip').hidden = false; used('download_fallback'); }
  });
  $('vd-shuffle').addEventListener('click', function () {
    seed++; slides.forEach(function (s) { s.fixed = false; }); build(); preload().then(function () { frame(slides[0] ? 1.5 : 0); });
  });

  function used(how, extra) {
    if (!window.toolUsed) return;
    var o = { how: how, mode: val('mode'), par: cur ? cur.label : '', size: val('size') };
    if (extra) for (var k in extra) o[k] = extra[k];
    window.toolUsed('video-parasha', o);
  }

  // ---------- מצב (רב קהילה / רבנות צבאית) ----------
  function modeUI() {
    var tz = val('mode') === 'tzava';
    $('vp-unit-f').hidden = !tz; $('vp-foot-f').hidden = tz;
    $('vp-place-l').textContent = tz ? 'מיקום הבסיס לזמנים' : 'העיר לזמנים';
    field('rav').placeholder = tz ? 'הרב משה כהן · רב החטיבה' : 'הרב משה כהן · בית הכנסת אהל יצחק';
    $('vp-loc-f').hidden = !val('ton');
  }

  // ---------- שמירה ותצוגה חיה ----------
  function saveState() {
    var o = {}; KEEP.forEach(function (k) { o[k] = val(k); });
    if (gps) o.gps = gps;
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
  }
  var tmr;
  function upd() {
    saveState(); modeUI();
    if (playing || recording || !cur) return;
    clearTimeout(tmr);
    tmr = setTimeout(function () { build(); size(); preload().then(function () { frame(1.5); }); }, 250);
  }
  form.addEventListener('input', function (e) {
    if (e.target.name === 'pasuk') $('vp-pasuk').dataset.ref = $('vp-pasuk').dataset.ref || '';
    upd();
  });
  form.addEventListener('change', function (e) {
    var n = e.target.name;
    if (n === 'par' || n === 'place' || n === 'mode' || n === 'ton') { compute(); if (n === 'par') loadPasuk(); }
    $('vp-pasuk-f').hidden = !val('pon');
    upd();
  });
  $('vp-gps').addEventListener('click', function () {
    var s = $('vp-gps-st');
    if (!navigator.geolocation) { s.textContent = 'הטלפון לא נותן מיקום. אפשר לבחור מהרשימה.'; return; }
    s.textContent = 'מאתר…';
    navigator.geolocation.getCurrentPosition(function (p) {
      gps = [+p.coords.latitude.toFixed(4), +p.coords.longitude.toFixed(4)];
      var o = field('place').querySelector('option[value=gps]'); o.hidden = false; field('place').value = 'gps';
      s.textContent = 'נמצא ✓'; compute(); upd(); used('gps');
    }, function () { s.textContent = 'לא קיבלתי מיקום. צריך לאשר מיקום לדפדפן, או לבחור מהרשימה.'; }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  });

  function fillSelects() {
    var ps = field('par'), html = '<optgroup label="פרשות השבוע">';
    PAR.forEach(function (p, i) { html += '<option value="p:' + i + '">פרשת ' + heName(p[0]) + '</option>'; });
    html += '</optgroup><optgroup label="חגים">';
    CHAG.forEach(function (c) { html += '<option value="c:' + c[0] + '">' + c[1] + '</option>'; });
    ps.innerHTML = html + '</optgroup>';
    field('place').innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '<option value="gps" hidden>המיקום שלי (GPS)</option>';
  }
  function restore() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    if (s.gps) { gps = s.gps; field('place').querySelector('option[value=gps]').hidden = false; }
    // קישור מכרטיס "לרבנות הצבאית": ?tzava=1
    if (/[?&]tzava=1/.test(location.search)) s.mode = 'tzava';
    KEEP.forEach(function (k) {
      if (!(k in s)) return;
      if (k === 'mode') { var r = form.querySelector('[name=mode][value=' + s.mode + ']'); if (r) r.checked = true; return; }
      var el = field(k); if (!el) return;
      if (el.type === 'checkbox') el.checked = !!s[k]; else if (s[k]) el.value = s[k];
    });
    if (field('place').value === 'gps' && !gps) field('place').value = CITIES[0][0];
    $('vp-pasuk-f').hidden = !val('pon');
    modeUI();
  }

  function start() {
    H = window.hebcal;
    if (!H) { $('vp-week').textContent = 'לא הצלחתי לטעון את לוח השנה. בודקים את האינטרנט ומרעננים את הדף.'; return; }
    fillSelects(); restore();
    week = findWeek();
    var q = (location.search.match(/[?&]par=([^&]+)/) || [])[1];
    field('par').value = q && field('par').querySelector('option[value="' + decodeURIComponent(q) + '"]') ? decodeURIComponent(q) : week.sel;
    compute(); loadPasuk();
    var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px "Frank Ruhl Libre"'), document.fonts.load('500 40px "Frank Ruhl Libre"'), document.fonts.load('600 40px "Assistant"'), document.fonts.load('400 40px "Assistant"')]).catch(function () {}) : Promise.resolve();
    fontsReady.then(function () { build(); size(); return preload(); }).then(function () { frame(1.5); });
  }
  if (window.hebcal) start(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', start); else start(); }
  // לבדיקה: הזמן בסרטון שאפשר לצייר אליו
  window.__vpFrame = function (t) { frame(t); return slides.map(function (s) { return [s.kind, s.start]; }); };

  fetch('/assets/video/credits.json').then(function (r) { return r.json(); }).then(function (list) {
    var ul = $('vd-credits'); if (!ul) return;
    list.forEach(function (c) {
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = c.page; a.target = '_blank'; a.rel = 'noopener'; a.textContent = c.title; a.dir = 'ltr';
      li.appendChild(a); li.appendChild(document.createTextNode(' – ' + (c.artist || 'צלם לא ידוע') + ' (' + c.lic + ')'));
      ul.appendChild(li);
    });
  }).catch(function () {});
})();
