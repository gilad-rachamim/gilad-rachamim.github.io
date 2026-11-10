// מסדר תיקיות – הכול בדפדפן. הקבצים לא עולים לשום שרת.
// הכלל: שום דבר לא נמחק ולא זז. הכלי רק קורא את המקור ומעתיק לתיקייה חדשה (או ל-ZIP).
// מה שלא ברור הולך ל"למיון – להחליט", כפולים (אותו גודל ואותו hash) ל"כפולים – לבדוק",
// ותמונות כמעט זהות (טביעת תמונה dHash) ל"דומים – לבדוק".
// שני שלבים: scan() אוסף עובדות על כל קובץ (סוג, תאריך, מילים) – איטי, פעם אחת.
//            assign() מחליט לאן כל קובץ הולך לפי העובדות וההגדרות – מהיר, רץ שוב בכל שינוי.
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  // ---------- הקטגוריות (שם התיקייה הראשית) ----------
  var CATS = [
    { id: 'custom', name: '', label: 'הכללים שלי', hint: 'לפי המילים שהגדרתם' },
    { id: 'personal', name: '1. מסמכים אישיים', hint: 'תעודות, דרכון, רישיון' },
    { id: 'money', name: '2. קבלות, חשבוניות ותלושים', hint: 'לפי שנה' },
    { id: 'torah', name: '3. שיעורים ותורה', hint: 'לפי פרשה ומסכת כשזה כתוב בשם, אחרת לפי סוג' },
    { id: 'photos', name: '4. תמונות', hint: 'לפי שנה וחודש, אירועים ותיקיות עם שם' },
    { id: 'shots', name: '5. צילומי מסך', hint: 'לפי שנה' },
    { id: 'videos', name: '6. סרטונים', hint: 'לפי שנה' },
    { id: 'audio', name: '7. הקלטות ושמע', hint: 'לפי שנה' },
    { id: 'docs', name: '8. מסמכים', hint: 'PDF, וורד, טבלאות, מצגות' },
    { id: 'arch', name: '9. קבצים דחוסים ותוכנות', hint: 'zip, rar, התקנות' },
    { id: 'unsure', name: 'למיון – להחליט', hint: 'מה שלא היה ברור. אתם מחליטים' },
    { id: 'similar', name: 'דומים – לבדוק', hint: 'תמונה כמעט זהה לתמונה אחרת (צילום רצף, עריכה). הגדולה מביניהן נשארה במקום' },
    { id: 'dups', name: 'כפולים – לבדוק', hint: 'עותק זהה לגמרי כבר נמצא בתיקייה אחרת' }
  ];
  var CAT = {}; CATS.forEach(function (c) { CAT[c.id] = c; });
  function catLabel(id) { return CAT[id].name || CAT[id].label; }

  var EXT = {
    img: 'jpg jpeg png gif heic heif webp bmp tif tiff dng cr2 cr3 nef arw raw svg',
    vid: 'mp4 mov avi mkv wmv m4v 3gp webm mts m2ts mpg mpeg flv',
    aud: 'mp3 m4a wav ogg oga opus aac amr flac wma 3ga',
    pdf: 'pdf',
    word: 'doc docx odt rtf txt pages md dot dotx',
    sheet: 'xls xlsx xlsm csv ods numbers',
    slide: 'ppt pptx pps ppsx odp key',
    book: 'epub mobi azw3 djvu',
    web: 'html htm mht mhtml url',
    contact: 'vcf ics',
    arch: 'zip rar 7z tar gz tgz bz2 iso',
    app: 'exe msi apk dmg pkg appx msix'
  };
  var KIND = {};
  Object.keys(EXT).forEach(function (k) { EXT[k].split(' ').forEach(function (e) { KIND[e] = k; }); });
  var DOC_SUB = { pdf: 'PDF', word: 'וורד וטקסט', sheet: 'טבלאות', slide: 'מצגות', book: 'ספרים', web: 'דפי אינטרנט שמורים', contact: 'אנשי קשר ויומן' };

  // ---------- מילים ----------
  var KW = {
    personal: ['תעודת', 'תעודה', 'ת"ז', 'ת.ז', 'תז ', 'ספח', 'דרכון', 'רישיון', 'רשיון', 'פנקס', 'passport', 'id card', 'license', 'licence', 'birth certificate'],
    money: ['קבלה', 'קבלות', 'חשבונית', 'חשבוניות', 'אישור תשלום', 'תשלום', 'תלוש', 'תלושים', 'ארנונה', 'חשבון חשמל', 'חשבון מים', 'הוראת קבע', 'טופס 106', 'invoice', 'receipt', 'payment', 'bill', 'payslip', 'payroll'],
    torah: ['שיעור', 'שיעורים', 'דרשה', 'דרשות', 'פרשת', 'פרשה', 'הלכה', 'הלכות', 'גמרא', 'דף יומי', 'מסכת', 'משנה', 'תהילים', 'שו"ת', 'שות ', 'מוסר', 'חסידות', 'דבר תורה', 'shiur', 'drasha', 'parasha', 'gemara', 'halacha']
  };
  function kwRe(list) {
    return list.map(function (w) {
      w = w.toLowerCase();
      if (/^[a-z ]+$/.test(w.trim())) return new RegExp('(^|[^a-z])' + w.trim().replace(/ /g, '[ _-]') + '([^a-z]|$)');
      return { test: function (s) { return s.indexOf(w) >= 0; } };
    });
  }
  var KWR = {}; Object.keys(KW).forEach(function (k) { KWR[k] = kwRe(KW[k]); });
  function hasKw(k, s) { return KWR[k].some(function (r) { return r.test(s); }); }

  // מילה עברית שלמה, עם אות שימוש אפשרית לפניה (בפסחים, והלכות...)
  function heWord(name) { return '(?:^|[^א-ת])[והבלמש]{0,2}' + name.replace(/ /g, '[ _\\-]+') + '(?=$|[^א-ת])'; }
  // 54 הפרשות לפי הסדר. * = שם שהוא גם מילה רגילה: נתפס רק עם "פרשת" לפניו
  var PARASHOT = ['בראשית*', 'נח*', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ', 'ויגש', 'ויחי',
    'שמות*', 'וארא', 'בא*', 'בשלח', 'יתרו', 'משפטים*', 'תרומה*', 'תצוה|תצווה', 'כי תשא', 'ויקהל', 'פקודי',
    'ויקרא*', 'צו*', 'שמיני', 'תזריע', 'מצורע', 'אחרי מות', 'קדושים*', 'אמור*', 'בהר*', 'בחוקותי|בחקתי|בחקותי',
    'במדבר*', 'נשא*', 'בהעלותך', 'שלח*|שלח לך', 'קרח|קורח', 'חוקת|חקת', 'בלק', 'פנחס|פינחס', 'מטות', 'מסעי',
    'דברים*', 'ואתחנן', 'עקב*', 'ראה*', 'שופטים*', 'כי תצא', 'כי תבוא', 'נצבים|ניצבים', 'וילך', 'האזינו', 'וזאת הברכה'];
  var MASECHTOT = ['ברכות*', 'שבת*', 'עירובין', 'פסחים', 'שקלים*', 'יומא*', 'סוכה*', 'ביצה*', 'ראש השנה*', 'תענית*', 'מגילה*',
    'מועד קטן', 'חגיגה', 'יבמות', 'כתובות', 'נדרים', 'נזיר', 'סוטה*', 'גיטין', 'קידושין', 'בבא קמא', 'בבא מציעא', 'בבא בתרא',
    'סנהדרין', 'מכות*', 'שבועות*', 'עבודה זרה', 'הוריות', 'זבחים', 'מנחות', 'חולין', 'בכורות', 'ערכין', 'תמורה*', 'כריתות',
    'מעילה', 'תמיד*', 'נדה*'];
  function buildList(list, prefix) {
    return list.map(function (raw, i) {
      var amb = raw.slice(-1) === '*', names = raw.replace('*', '').split('|'), canon = names[0];
      var alt = names.map(function (n) { return n.replace(/ /g, '[ _\\-]+'); }).join('|');
      var strong = new RegExp(prefix + '[ _\\-]*(?:' + alt + ')(?=$|[^א-ת])');
      var weak = amb ? null : new RegExp(names.map(heWord).join('|'));
      return { n: i + 1, name: canon, strong: strong, weak: weak };
    });
  }
  var PAR = buildList(PARASHOT, 'פרש(?:ת|ה)'), MAS = buildList(MASECHTOT, 'מסכת');
  function findIn(list, s) {
    for (var i = 0; i < list.length; i++) if (list[i].strong.test(s)) return list[i];
    for (i = 0; i < list.length; i++) if (list[i].weak && list[i].weak.test(s)) return list[i];
    return null;
  }

  function isJunk(name) {
    var n = name.toLowerCase();
    return /^~\$/.test(n) || /^\._/.test(n) || /\.(tmp|crdownload|part|partial|lnk|ini|db)$/.test(n) || n === '.ds_store' || n === 'thumbs.db' || n === 'desktop.ini';
  }
  function extOf(name) { var i = name.lastIndexOf('.'); return i > 0 ? name.slice(i + 1).toLowerCase() : ''; }

  // שם תיקייה "כללי" (DCIM, הורדות, תמונות מהטלפון...) לא נשמר. שם עם משמעות (טיול באילת) כן.
  var GENERIC = /dcim|camera|\d+apple|\d+andro|pictures?|photos?|images?|imgs?|videos?|movies?|downloads?|documents?|docs|files?|desktop|misc|other|backup|old|new|folder|temp|tmp|sent|private|screenshots?|whatsapp|telegram|media|android|iphone|phone|תמונות|תמונה|סרטונים|הורדות|מסמכים|קבצים|שונות|אחר|גיבוי|ישן|ישנות|ישנים|חדש|חדשה|חדשות|תיקייה|תיקיה|טלפון|מהטלפון|מחשב|מהמחשב|שולחן|העבודה|כללי|מצלמה|מהמצלמה|גלריה|צילומים|וואטסאפ|ווטסאפ|סרטים|ממוין|מסודר|לא|ממוינים|של|copy|עותק/g;
  function meaningfulDir(d) {
    if (!d) return false;
    var rest = d.toLowerCase().replace(GENERIC, ' ').replace(/[\d_\-.()\[\]\s]+/g, ' ').trim();
    return rest.replace(/\s/g, '').length >= 2;
  }

  // ---------- תאריך: נתוני המצלמה, נתוני הסרטון, שם הקובץ, ואז תאריך השינוי ----------
  var THIS_YEAR = new Date().getFullYear();
  function okDate(y, m, d) { return y >= 1990 && y <= THIS_YEAR + 1 && m >= 1 && m <= 12 && d >= 1 && d <= 31; }
  function dateFromName(n) {
    var m = n.match(/(?:^|\D)((?:19|20)\d\d)[-_. ]?(0[1-9]|1[0-2])[-_. ]?(0[1-9]|[12]\d|3[01])(?:\D|$)/);
    if (m && okDate(+m[1], +m[2], +m[3])) return { y: +m[1], m: +m[2], d: +m[3], src: 'שם הקובץ' };
    m = n.match(/(?:^|\D)(0?[1-9]|[12]\d|3[01])[-_.](0?[1-9]|1[0-2])[-_.]((?:19|20)\d\d)(?:\D|$)/);
    if (m && okDate(+m[3], +m[2], +m[1])) return { y: +m[3], m: +m[2], d: +m[1], src: 'שם הקובץ' };
    m = n.match(/(?:^|\D)((?:19|20)\d\d)[-_.](0[1-9]|1[0-2])(?:\D|$)/); // שנה-חודש, בלי יום (למשל תלוש 2023-11)
    if (m && okDate(+m[1], +m[2], 1)) return { y: +m[1], m: +m[2], d: 0, src: 'שם הקובץ' };
    return null;
  }
  function jpegExif(buf) {
    try {
      var v = new DataView(buf);
      if (v.getUint16(0) !== 0xFFD8) return null;
      var o = 2;
      while (o + 4 < v.byteLength) {
        var mk = v.getUint16(o), len = v.getUint16(o + 2);
        if (mk === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) return tiffDate(v, o + 10);
        if ((mk & 0xFF00) !== 0xFF00) return null;
        o += 2 + len;
      }
    } catch (e) {}
    return null;
  }
  function tiffDate(v, t) {
    try {
      var le = v.getUint16(t) === 0x4949;
      var u16 = function (p) { return v.getUint16(p, le); }, u32 = function (p) { return v.getUint32(p, le); };
      var best = null;
      var ifd = function (p, depth) {
        if (depth > 2 || p + 2 > v.byteLength) return;
        var n = u16(p);
        for (var i = 0; i < n && i < 400; i++) {
          var e = p + 2 + i * 12; if (e + 12 > v.byteLength) return;
          var tag = u16(e);
          if (tag === 0x8769) ifd(t + u32(e + 8), depth + 1);
          else if (tag === 0x9003 || tag === 0x0132) {
            var s = '', off = t + u32(e + 8);
            for (var k = 0; k < 19 && off + k < v.byteLength; k++) s += String.fromCharCode(v.getUint8(off + k));
            var m = s.match(/^(\d{4}):(\d\d):(\d\d)/);
            if (m && okDate(+m[1], +m[2], +m[3]) && (tag === 0x9003 || !best)) best = { y: +m[1], m: +m[2], d: +m[3], src: 'נתוני המצלמה' };
          }
        }
      };
      ifd(t + u32(t + 4), 0);
      return best;
    } catch (e) { return null; }
  }
  function findBytes(b, pat, from) {
    outer: for (var i = from || 0; i <= b.length - pat.length; i++) {
      for (var j = 0; j < pat.length; j++) if (b[i + j] !== pat[j]) continue outer;
      return i;
    }
    return -1;
  }
  var EXIF_SIG = [0x45, 0x78, 0x69, 0x66, 0, 0];
  // HEIC, RAW ו-TIFF: מחפשים את בלוק ה-Exif בתחילת הקובץ ובסופו. אם אין – תאריך בכתב "2023:05:12 10:00:00"
  async function looseExif(f) {
    var parts = [[0, Math.min(f.size, 1048576)]];
    if (f.size > 1048576) parts.push([Math.max(1048576, f.size - 262144), f.size]);
    for (var p = 0; p < parts.length; p++) {
      var buf = await f.slice(parts[p][0], parts[p][1]).arrayBuffer(), b = new Uint8Array(buf), v = new DataView(buf);
      if (p === 0 && ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2A) || (b[0] === 0x4D && b[1] === 0x4D && b[3] === 0x2A))) { var t0 = tiffDate(v, 0); if (t0) return t0; }
      var i = findBytes(b, EXIF_SIG);
      while (i >= 0) { var r = tiffDate(v, i + 6); if (r) return r; i = findBytes(b, EXIF_SIG, i + 6); }
      var txt = ''; for (var k = 0; k < Math.min(b.length, 262144); k++) txt += String.fromCharCode(b[k] < 128 ? b[k] : 32);
      var m = txt.match(/((?:19|20)\d\d):(\d\d):(\d\d) \d\d:\d\d:\d\d/);
      if (m && okDate(+m[1], +m[2], +m[3])) return { y: +m[1], m: +m[2], d: +m[3], src: 'נתוני המצלמה' };
    }
    return null;
  }
  // MP4/MOV: התאריך שהמצלמה כתבה בתיבת mvhd שבתוך moov (שניות מ-1904, שעון עולמי)
  async function mp4Date(f) {
    try {
      var off = 0;
      for (var n = 0; n < 200 && off + 8 <= f.size; n++) {
        var h = new DataView(await f.slice(off, off + 16).arrayBuffer());
        var size = h.getUint32(0), type = String.fromCharCode(h.getUint8(4), h.getUint8(5), h.getUint8(6), h.getUint8(7));
        if (size === 1) size = h.getUint32(8) * 4294967296 + h.getUint32(12);
        else if (size === 0) size = f.size - off;
        if (size < 8) return null;
        if (type === 'moov') {
          var mb = new Uint8Array(await f.slice(off, off + Math.min(size, 8388608)).arrayBuffer());
          var i = findBytes(mb, [0x6d, 0x76, 0x68, 0x64]); // 'mvhd'
          if (i < 0) return null;
          var dv = new DataView(mb.buffer), ver = mb[i + 4];
          var secs = ver === 1 ? dv.getUint32(i + 8) * 4294967296 + dv.getUint32(i + 12) : dv.getUint32(i + 8);
          if (!secs) return null;
          var d = new Date((secs - 2082844800) * 1000);
          if (!okDate(d.getFullYear(), d.getMonth() + 1, d.getDate())) return null;
          return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), src: 'נתוני הסרטון' };
        }
        off += size;
      }
    } catch (e) {}
    return null;
  }
  function modDate(f) { var d = new Date(f.lastModified || Date.now()); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), src: 'תאריך שינוי הקובץ' }; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function monthFolder(d) { return pad(d.m) + ' ' + MONTHS[d.m - 1]; }
  function dayKey(d) { return d.y + '-' + pad(d.m) + '-' + pad(d.d); }

  // ---------- שלב 1: עובדות על קובץ אחד ----------
  async function scanOne(it) {
    var name = it.name, ext = extOf(name), kind = KIND[ext] || '', f = it.file;
    it.ext = ext; it.kind = kind;
    it.low = it.path.toLowerCase().replace(/_+/g, ' ');
    it.base = name.toLowerCase().replace(/_+/g, ' ');
    var segs = it.path.split('/'); it.dir = segs.length > 1 ? segs[segs.length - 2] : ''; it.dirPath = segs.slice(0, -1).join('/');
    it.junk = isJunk(name);
    it.shot = /screenshot|screen shot|צילום מסך|screencapture|screenrecord|screen recording|הקלטת מסך/.test(it.base);
    it.wa = /-wa\d{3,}|whatsapp/.test(it.base);
    if (it.junk || !ext) return;
    var d = dateFromName(name);
    if (kind === 'img' && (!d || !d.d)) {
      var e = null;
      if (ext === 'jpg' || ext === 'jpeg') { try { e = jpegExif(await f.slice(0, 131072).arrayBuffer()); } catch (x) {} }
      else if (/^(heic|heif|tif|tiff|dng|cr2|cr3|nef|arw|raw|png|webp)$/.test(ext)) { try { e = await looseExif(f); } catch (x) {} }
      if (e) d = e;
    }
    if (kind === 'vid' && (!d || !d.d) && /^(mp4|mov|m4v|3gp)$/.test(ext)) { var mv = await mp4Date(f); if (mv) d = mv; }
    it.date = d || modDate(f);
    it.reliable = !!d && !!d.d;
    if (kind === 'aud' || kind === 'vid' || kind === 'pdf' || kind === 'word' || kind === 'slide') {
      it.parasha = findIn(PAR, it.base) || findIn(PAR, it.low);
      if (!it.parasha) it.masechet = findIn(MAS, it.base) || findIn(MAS, it.low);
    }
  }

  // ---------- כפולים: אותו גודל, ואז SHA-256 ----------
  async function hashFile(f) {
    var buf;
    if (f.size <= 268435456) buf = await f.arrayBuffer();
    else { // קובץ ענק: תחילה, אמצע וסוף (8MB כל אחד) + הגודל. מספיק כדי לשים בצד לבדיקה, וממילא כלום לא נמחק
      var c = 8388608, mid = Math.floor(f.size / 2);
      var parts = await Promise.all([f.slice(0, c), f.slice(mid, mid + c), f.slice(f.size - c)].map(function (b) { return b.arrayBuffer(); }));
      var all = new Uint8Array(c * 3 + 16); parts.forEach(function (p, i) { all.set(new Uint8Array(p), i * c); });
      new DataView(all.buffer).setFloat64(c * 3, f.size); buf = all.buffer;
    }
    var h = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(h)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  async function hashOf(it) { if (!it.hash) it.hash = await hashFile(it.file); return it.hash; }
  function keepScore(it) { // הקובץ שנשאר במקום: בלי "(1)"/"עותק" בשם, ואז נתיב קצר
    var n = it.name.toLowerCase(), s = 0;
    if (/\(\d+\)|copy|עותק|העתק| - \d+\./.test(n)) s += 1000;
    return s + it.path.length;
  }
  async function findDups(items) {
    var bySize = {};
    items.forEach(function (it) { if (it.size > 0) (bySize[it.size] = bySize[it.size] || []).push(it); });
    var groups = Object.keys(bySize).map(function (k) { return bySize[k]; }).filter(function (g) { return g.length > 1; });
    var total = groups.reduce(function (a, g) { return a + g.length; }, 0), done = 0, n = 0;
    for (var gi = 0; gi < groups.length; gi++) {
      var byHash = {};
      for (var i = 0; i < groups[gi].length; i++) {
        var it = groups[gi][i];
        try { await hashOf(it); } catch (e) { it.hash = 'x' + Math.random(); }
        (byHash[it.hash] = byHash[it.hash] || []).push(it);
        prog('בודק כפולים', ++done, total);
      }
      Object.keys(byHash).forEach(function (h) {
        var g = byHash[h]; if (g.length < 2) return;
        g.sort(function (a, b) { return keepScore(a) - keepScore(b); });
        for (var j = 1; j < g.length; j++) { g[j].dupOf = g[0]; n++; }
      });
    }
    return n;
  }

  // ---------- תמונות דומות: טביעת תמונה (dHash 64 ביט) ----------
  var canv = null;
  async function dhash(f) {
    var bmp = await createImageBitmap(f, { resizeWidth: 9, resizeHeight: 8, resizeQuality: 'medium' });
    if (!canv) { canv = document.createElement('canvas'); canv.width = 9; canv.height = 8; }
    var cx = canv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(bmp, 0, 0, 9, 8); bmp.close && bmp.close();
    var px = cx.getImageData(0, 0, 9, 8).data, g = [], a = 0, b = 0;
    for (var i = 0; i < 72; i++) g.push(px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114);
    var flat = true;
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
      var bit = g[y * 9 + x] > g[y * 9 + x + 1] ? 1 : 0, k = y * 8 + x;
      if (Math.abs(g[y * 9 + x] - g[y * 9 + x + 1]) > 2) flat = false;
      if (k < 32) a = (a | (bit << k)) >>> 0; else b = (b | (bit << (k - 32))) >>> 0;
    }
    return flat ? null : [a, b]; // תמונה חלקה לגמרי (שחור, לבן) – לא משווים, כדי לא לקבל "דומים" סתם
  }
  function pop(x) { x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; }
  function dayNum(d) { return Date.UTC(d.y, d.m - 1, d.d || 1) / 86400000; }
  var SIM_MAX = 4000, SIM_DIST = 6;
  async function findSimilar(items) {
    var imgs = items.filter(function (it) { return it.kind === 'img' && !it.dupOf && !it.shot && /^(jpe?g|png|webp|gif|bmp)$/.test(it.ext) && it.size < 41943040; });
    S.simSkipped = imgs.length > SIM_MAX;
    if (S.simSkipped) return 0;
    for (var i = 0; i < imgs.length; i++) {
      try { imgs[i].ph = await dhash(imgs[i].file); } catch (e) { imgs[i].ph = null; }
      prog('מחפש תמונות דומות', i + 1, imgs.length);
    }
    imgs = imgs.filter(function (it) { return it.ph; });
    var parent = imgs.map(function (_, i) { return i; });
    function root(i) { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; }
    for (i = 0; i < imgs.length; i++) for (var j = i + 1; j < imgs.length; j++) {
      var A = imgs[i], B = imgs[j];
      if (pop(A.ph[0] ^ B.ph[0]) + pop(A.ph[1] ^ B.ph[1]) > SIM_DIST) continue;
      if (A.reliable && B.reliable && Math.abs(dayNum(A.date) - dayNum(B.date)) > 1) continue;
      parent[root(j)] = root(i);
    }
    var groups = {}, n = 0;
    imgs.forEach(function (it, i) { (groups[root(i)] = groups[root(i)] || []).push(it); });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k]; if (g.length < 2) return;
      g.sort(function (a, b) { return b.size - a.size; }); // הגדולה (האיכותית) נשארת במקום
      for (var j = 1; j < g.length; j++) { g[j].simOf = g[0]; n++; }
    });
    return n;
  }

  // ---------- אירועים: יום עם הרבה תמונות וסרטונים ----------
  var EV_DAY = 12, EV_MIN = 12;
  function findEvents(items) {
    var byDay = {};
    items.forEach(function (it) {
      if ((it.kind === 'img' || it.kind === 'vid') && it.reliable && !it.shot && !it.wa && !it.junk && !it.dupOf) {
        var k = dayNum(it.date); (byDay[k] = byDay[k] || []).push(it);
      }
    });
    var days = Object.keys(byDay).map(Number).filter(function (k) { return byDay[k].length >= EV_DAY; }).sort(function (a, b) { return a - b; });
    var evs = [], cur = null;
    days.forEach(function (k) {
      if (cur && k - cur.last <= 1) { cur.last = k; cur.days.push(k); }
      else { cur = { first: k, last: k, days: [k] }; evs.push(cur); }
    });
    S.events = {};
    evs.forEach(function (ev) {
      var list = []; ev.days.forEach(function (k) { list = list.concat(byDay[k]); });
      if (list.length < EV_MIN) return;
      var d0 = new Date(ev.first * 86400000), key = d0.getUTCFullYear() + '-' + pad(d0.getUTCMonth() + 1) + '-' + pad(d0.getUTCDate());
      S.events[key] = { key: key, y: d0.getUTCFullYear(), first: ev.first, last: ev.last, count: list.length, name: holidayName(ev.first, ev.last) };
      list.forEach(function (it) { it.ev = key; });
    });
  }
  function holidayName(first, last) {
    var H = window.hebcal; if (!H) return '';
    var names = [];
    for (var k = first; k <= last + 1; k++) { // +1: ערב חג נחשב לחג
      var d = new Date(k * 86400000), gd = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      var evs = []; try { evs = H.HebrewCalendar.getHolidaysOnDate(new H.HDate(gd), true) || []; } catch (e) {}
      evs.forEach(function (e) {
        var f = e.getFlags(), F = H.flags;
        if (!(f & (F.CHAG | F.CHOL_HAMOED | F.MINOR_HOLIDAY | F.MODERN_HOLIDAY))) return;
        if (f & F.EREV && k > last) return;
        var t = e.render('he-x-NoNikud').replace(/\s*\(.*?\)/g, '').replace(/:.*$/, '').replace(/\s+[א-ת]{1,2}[׳']+\s*$/, '').replace(/^ערב\s+/, '').trim();
        if (t && names.indexOf(t) < 0) names.push(t);
      });
    }
    return names.slice(0, 2).join(' ו');
  }
  function loadHebcal() {
    return new Promise(function (res) {
      if (window.hebcal) return res();
      var s = document.createElement('script');
      s.src = '/assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js';
      s.onload = function () { res(); }; s.onerror = function () { res(); };
      setTimeout(res, 6000);
      document.head.appendChild(s);
    });
  }

  // ---------- הגדרות וכללים ----------
  var S = { items: [], root: 'הקבצים שלי', srcHandle: null, remap: {}, fileCat: {}, events: {}, evNames: {},
    opt: { keepDirs: true, events: true, rename: false, similar: true }, rules: [] };
  window.__sader = S;
  try { var sv = JSON.parse(localStorage.getItem('sader-opt') || 'null'); if (sv) Object.keys(S.opt).forEach(function (k) { if (k in sv) S.opt[k] = !!sv[k]; }); } catch (e) {}
  try { S.rulesText = localStorage.getItem('sader-rules') || ''; } catch (e) { S.rulesText = ''; }
  function parseRules(t) { // כל שורה: "מילה = תיקייה" (אפשר גם "מילה, מילה = תיקייה/תת-תיקייה")
    return t.split(/\n/).map(function (l) {
      var m = l.split(/=|→|->/); if (m.length < 2) return null;
      var words = m[0].split(/[,،]/).map(function (w) { return w.trim().toLowerCase().replace(/_+/g, ' '); }).filter(Boolean);
      var target = m.slice(1).join('=').split('/').map(function (p) { return safe(p.trim()); }).filter(function (p) { return p && p !== '_'; }).join('/');
      return words.length && target ? { words: words, target: target, raw: l.trim() } : null;
    }).filter(Boolean);
  }
  S.rules = parseRules(S.rulesText);

  // ---------- שלב 2: לאן כל קובץ הולך ----------
  function set(it, cat, sub, why) { it.cat = cat; it.sub = sub || ''; it.why = why; }
  function dirYear(it) { // השנה הנפוצה בתיקייה המקורית
    var c = S.dirYears[it.dirPath]; if (!c) return it.date.y;
    var best = it.date.y, n = 0; Object.keys(c).forEach(function (y) { if (c[y] > n) { n = c[y]; best = y; } }); return best;
  }
  function evFolder(key) { var e = S.events[key], nm = (S.evNames[key] != null ? S.evNames[key] : e.name) || 'אירוע'; return e.y + '/' + key + ' ' + safe(nm); }
  function assign(it) {
    var k = it.kind, o = S.opt, keep = o.keepDirs && meaningfulDir(it.dir);
    if (it.dupOf) return set(it, 'dups', '', 'זהה לגמרי ל: ' + it.dupOf.path);
    if (it.junk) return set(it, 'unsure', 'קבצי מערכת וזמניים', 'קובץ זמני או קובץ מערכת. בדרך כלל לא צריך אותו');
    for (var r = 0; r < S.rules.length; r++) {
      var ru = S.rules[r];
      if (ru.words.some(function (w) { return it.low.indexOf(w) >= 0; })) return set(it, 'custom', ru.target, 'הכלל שלכם: ' + ru.raw);
    }
    if (!it.ext) return set(it, 'unsure', 'בלי סיומת', 'אין לקובץ סיומת, אז לא ברור מה הוא');
    if (o.similar && it.simOf) return set(it, 'similar', '', 'כמעט זהה ל: ' + it.simOf.path);
    var docLike = k === 'pdf' || k === 'word' || k === 'sheet' || k === 'img';
    var yr = String(it.date.y);
    if (docLike && hasKw('personal', it.base)) return set(it, 'personal', k === 'img' ? 'צילומים' : '', 'מילה בשם: מסמך אישי');
    if (docLike && hasKw('money', it.base)) return set(it, 'money', yr, 'מילה בשם: קבלה או חשבונית');
    var torahKind = k === 'aud' || k === 'vid' || k === 'pdf' || k === 'word' || k === 'slide';
    if (torahKind && it.parasha) return set(it, 'torah', 'פרשות/' + pad(it.parasha.n) + ' ' + it.parasha.name, 'פרשת ' + it.parasha.name);
    if (torahKind && it.masechet) return set(it, 'torah', 'מסכתות/' + it.masechet.name, 'מסכת ' + it.masechet.name);
    if (torahKind && hasKw('torah', it.low)) return set(it, 'torah', k === 'aud' ? 'הקלטות' : k === 'vid' ? 'סרטונים' : 'מסמכים', 'מילה בשם: שיעור או תורה');
    if (docLike && hasKw('personal', it.low)) return set(it, 'personal', k === 'img' ? 'צילומים' : '', 'שם התיקייה: מסמכים אישיים');
    if (docLike && hasKw('money', it.low)) return set(it, 'money', yr, 'שם התיקייה: קבלות');
    if ((k === 'img' || k === 'vid') && it.shot) return set(it, 'shots', yr, k === 'vid' ? 'הקלטת מסך' : 'צילום מסך');
    if (k === 'img' || k === 'vid') {
      var cat = k === 'img' ? 'photos' : 'videos', what = k === 'img' ? 'תמונה' : 'סרטון';
      if (keep) return set(it, cat, dirYear(it) + '/' + safe(it.dir), what + ', נשאר עם התיקייה "' + it.dir + '"');
      if (o.events && it.ev && S.events[it.ev]) return set(it, cat, evFolder(it.ev), what + ' מאירוע (' + S.events[it.ev].count + ' באותו יום)');
      return set(it, cat, k === 'img' ? yr + '/' + monthFolder(it.date) : yr, what + ', לפי ' + it.date.src);
    }
    if (k === 'aud') return set(it, 'audio', keep ? safe(it.dir) : yr, keep ? 'הקלטה, נשארה עם התיקייה "' + it.dir + '"' : 'הקלטה, לפי ' + it.date.src);
    if (DOC_SUB[k]) return set(it, 'docs', keep ? safe(it.dir) : DOC_SUB[k], keep ? 'מסמך, נשאר עם התיקייה "' + it.dir + '"' : 'מסמך');
    if (k === 'arch' || k === 'app') return set(it, 'arch', k === 'app' ? 'תוכנות והתקנות' : 'דחוסים', 'קובץ דחוס או תוכנה');
    return set(it, 'unsure', 'סוג לא מוכר', 'סוג קובץ לא מוכר (.' + it.ext + ')');
  }
  function assignAll() {
    S.dirYears = {};
    S.items.forEach(function (it) {
      if ((it.kind === 'img' || it.kind === 'vid') && it.date) { var c = S.dirYears[it.dirPath] = S.dirYears[it.dirPath] || {}; c[it.date.y] = (c[it.date.y] || 0) + 1; }
    });
    S.items.forEach(assign);
  }

  function finalCat(it) { return S.fileCat[it.id] || S.remap[it.cat] || it.cat; }
  function targetPath(it) { // נתיב יחסי בתוך התיקייה החדשה (בלי שם הקובץ)
    var c = finalCat(it);
    if (c === 'skip') return null;
    var moved = S.fileCat[it.id] || (S.remap[it.cat] && S.remap[it.cat] !== it.cat);
    var sub = moved ? '' : it.sub;
    var top = c === 'custom' ? '' : CAT[c].name;
    if (c === 'custom' && moved) top = 'הכללים שלי';
    return [top, sub].filter(Boolean).join('/') || 'הכללים שלי';
  }
  function safe(n) { return String(n).replace(/[<>:"\\|?*\x00-\x1f\/]/g, '_').replace(/[. ]+$/, '') || '_'; }
  function newName(it) {
    var nm = safe(it.name);
    if (S.opt.rename && it.reliable && it.date.d && !/^(19|20)\d\d[-_.]?\d\d[-_.]?\d\d/.test(nm)) nm = dayKey(it.date) + ' – ' + nm;
    return nm;
  }
  function buildPlan() { // מחשב לכל קובץ יעד סופי, ושם ייחודי אם יש התנגשות
    var used = {}, plan = [];
    S.items.forEach(function (it) {
      delete it.already; // סימון מהעתקה קודמת לא עובר לסבב הבא
      var dir = targetPath(it);
      if (dir === null) { it.dest = null; return; }
      var nm = newName(it), key = (dir + '/' + nm).toLowerCase(), k = 2;
      var dot = nm.lastIndexOf('.'), stem = dot > 0 ? nm.slice(0, dot) : nm, ex = dot > 0 ? nm.slice(dot) : '';
      while (used[key]) { nm = stem + ' (' + (k++) + ')' + ex; key = (dir + '/' + nm).toLowerCase(); }
      used[key] = 1; it.dest = dir + '/' + nm; plan.push(it);
    });
    return plan;
  }

  // ---------- איסוף קבצים ----------
  async function walkHandle(dir, prefix, out) {
    for await (var entry of dir.values()) {
      var p = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.kind === 'file') { out.push({ file: await entry.getFile(), path: p }); prog('קורא את הקבצים', out.length); }
      else await walkHandle(entry, p, out);
    }
  }
  function readAllEntries(reader) {
    return new Promise(function (res, rej) {
      var all = [];
      (function more() { reader.readEntries(function (b) { if (!b.length) res(all); else { all = all.concat(Array.from(b)); more(); } }, rej); })();
    });
  }
  async function walkEntry(entry, out) {
    if (entry.isFile) {
      var f = await new Promise(function (res, rej) { entry.file(res, rej); });
      out.push({ file: f, path: entry.fullPath.replace(/^\//, '') }); prog('קורא את הקבצים', out.length);
    } else if (entry.isDirectory) {
      var list = await readAllEntries(entry.createReader());
      for (var i = 0; i < list.length; i++) await walkEntry(list[i], out);
    }
  }

  async function analyze(list) {
    if (S.busy) return; // לחיצה כפולה: לא מריצים שתי סריקות במקביל
    S.busy = true;
    try { await analyzeNow(list); } finally { S.busy = false; }
  }
  async function analyzeNow(list) {
    show('work');
    S.items = []; S.remap = {}; S.fileCat = {}; S.evNames = {}; S.events = {};
    for (var i = 0; i < list.length; i++) {
      var it = { id: i, file: list[i].file, path: list[i].path, name: list[i].file.name, size: list[i].file.size };
      try { await scanOne(it); } catch (e) { it.date = modDate(it.file); }
      S.items.push(it);
      if (i % 25 === 0) { prog('קורא סוג ותאריך', i + 1, list.length); await tick(); }
    }
    var d = await findDups(S.items);
    var sm = 0; try { sm = await findSimilar(S.items); } catch (e) {}
    var hasDays = S.items.some(function (it) { return (it.kind === 'img' || it.kind === 'vid') && it.reliable; });
    if (hasDays) { prog('מחפש אירועים וחגים', 1, 0); await loadHebcal(); }
    findEvents(S.items);
    assignAll();
    if (window.toolUsed) window.toolUsed('sader', { step: 'scan', files: S.items.length, dups: d, similar: sm, events: Object.keys(S.events).length });
    renderOptions();
    renderPreview();
    show('preview');
  }
  // מפנים רגע לדפדפן (כדי שפס ההתקדמות יתעדכן) בלי setTimeout: בכרטיסייה ברקע setTimeout מואט לשנייה ויותר,
  // והודעה ב-MessageChannel לא מואטת. כך סריקה גדולה ממשיכה במהירות גם כשעוברים לכרטיסייה אחרת.
  var mc = new MessageChannel(), waiters = [];
  mc.port1.onmessage = function () { var w = waiters.shift(); if (w) w(); };
  function tick() { return new Promise(function (r) { waiters.push(r); mc.port2.postMessage(0); }); }

  // ---------- תצוגה ----------
  function show(step) { ['pick', 'work', 'preview', 'done'].forEach(function (s) { var el = $('#sd-' + s); if (el) el.hidden = s !== step; }); window.scrollTo({ top: $('#sd-top').offsetTop - 70, behavior: 'smooth' }); }
  var lastProg = 0;
  function prog(label, n, total) {
    var now = Date.now(); if (now - lastProg < 120 && n !== total) return; lastProg = now;
    $('#sd-prog-l').textContent = label + (total ? ' · ' + num(n) + ' מתוך ' + num(total) : '');
    $('#sd-bar').style.width = total ? Math.round(n / total * 100) + '%' : '100%';
    $('#sd-bar').classList.toggle('ind', !total);
  }
  function fmt(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(0) + ' KB'; if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB'; return (b / 1073741824).toFixed(2) + ' GB'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(x) { return x.toLocaleString('he-IL'); }

  function catOptions(sel, self, withSkip) {
    var h = CATS.filter(function (c) { return (c.id !== 'dups' && c.id !== 'similar' && c.id !== 'custom') || self === c.id; }).map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + (c.id === self ? 'להשאיר כאן' : 'להעביר אל: ' + esc(catLabel(c.id))) + '</option>';
    }).join('');
    return h + (withSkip ? '<option value="skip"' + (sel === 'skip' ? ' selected' : '') + '>לא להעתיק (נשאר רק במקור)</option>' : '');
  }

  function renderOptions() {
    var o = S.opt;
    $('#sd-o-keep').checked = o.keepDirs; $('#sd-o-ev').checked = o.events; $('#sd-o-ren').checked = o.rename; $('#sd-o-sim').checked = o.similar;
    $('#sd-o-sim').disabled = !!S.simSkipped;
    $('#sd-o-sim-note').textContent = S.simSkipped ? '(יותר מ-' + num(SIM_MAX) + ' תמונות – כבוי כדי שלא ייקח שעות)' : '';
    var evs = Object.keys(S.events).sort();
    $('#sd-events').hidden = !evs.length || !o.events;
    $('#sd-ev-list').innerHTML = evs.map(function (k) {
      var e = S.events[k], nm = S.evNames[k] != null ? S.evNames[k] : e.name;
      var days = e.last - e.first + 1;
      return '<li><span class="sd-evd">' + k.split('-').reverse().join('.') + (days > 1 ? ' (' + days + ' ימים)' : '') + ' · ' + num(e.count) + ' קבצים</span>' +
        '<input type="text" class="sd-evn" data-ev="' + k + '" value="' + esc(nm) + '" placeholder="שם לאירוע, למשל: בר המצווה של יוסי" aria-label="שם לאירוע מ-' + k + '"></li>';
    }).join('');
  }

  function renderPreview() {
    var plan = buildPlan(), byCat = {};
    S.items.forEach(function (it) { (byCat[it.cat] = byCat[it.cat] || []).push(it); });
    var total = S.items.reduce(function (a, it) { return a + it.size; }, 0);
    var dups = (byCat.dups || []).length, sim = (byCat.similar || []).length, uns = (byCat.unsure || []).length, skipped = S.items.length - plan.length;
    $('#sd-sum').innerHTML = '<b>' + num(S.items.length) + '</b> קבצים (' + fmt(total) + ') מתוך "' + esc(S.root) + '". ' +
      (dups ? '<b>' + num(dups) + '</b> כפולים יישמו בצד לבדיקה. ' : 'לא נמצאו כפולים. ') +
      (sim ? '<b>' + num(sim) + '</b> תמונות דומות בצד. ' : '') +
      (uns ? '<b>' + num(uns) + '</b> קבצים לא ברורים מחכים לכם ב"למיון – להחליט". ' : '') +
      (skipped ? '<b>' + num(skipped) + '</b> לא יועתקו (בחרתם). ' : '');
    var html = '';
    CATS.forEach(function (c) {
      var list = byCat[c.id]; if (!list) return;
      var subs = {}; list.forEach(function (it) { var k = it.sub || ''; (subs[k] = subs[k] || []).push(it); });
      var size = list.reduce(function (a, it) { return a + it.size; }, 0);
      var to = S.remap[c.id] || c.id;
      var warn = c.id === 'unsure' || c.id === 'dups' || c.id === 'similar';
      html += '<details class="sd-cat' + (warn ? ' sd-warn' : '') + (to === 'skip' ? ' sd-off' : '') + '" data-cat="' + c.id + '"' + (c.id === 'unsure' ? ' open' : '') + '>' +
        '<summary><span class="sd-ic">📁</span><b>' + esc(catLabel(c.id)) + '</b><span class="sd-n">' + num(list.length) + ' קבצים · ' + fmt(size) + '</span>' +
        (to !== c.id ? '<span class="sd-to">' + (to === 'skip' ? 'לא יועתק' : '← ' + esc(catLabel(to))) + '</span>' : '') + '</summary>' +
        '<p class="sd-hint">' + esc(c.hint) + '</p>' +
        '<div class="field sd-move"><label>מה לעשות עם כל התיקייה</label><select data-remap="' + c.id + '">' + catOptions(to, c.id, true) + '</select></div>';
      Object.keys(subs).sort(function (a, b) { return a.localeCompare(b, 'he', { numeric: true }); }).forEach(function (s) {
        var fl = subs[s];
        html += '<details class="sd-sub"><summary>' + (s ? '📁 ' + esc(s) : '📄 ישר בתיקייה') + ' <span class="sd-n">' + num(fl.length) + '</span></summary><ul class="sd-files">';
        fl.slice(0, 300).forEach(function (it) {
          html += '<li><span class="sd-fn" title="' + esc(it.path) + '">' + esc(it.name) + '</span><span class="sd-why">' + esc(it.why) + ' · ' + fmt(it.size) + '</span>' +
            (warn ? '<select class="sd-fsel" data-file="' + it.id + '" aria-label="לאן להעביר את ' + esc(it.name) + '">' + catOptions(S.fileCat[it.id] || c.id, c.id, true) + '</select>' : '') + '</li>';
        });
        if (fl.length > 300) html += '<li class="sd-more">ועוד ' + num(fl.length - 300) + ' קבצים…</li>';
        html += '</ul></details>';
      });
      html += '</details>';
    });
    $('#sd-tree').innerHTML = html;
    $('#sd-newname').textContent = S.root + ' – מסודר';
    // 20 הקבצים הכי גדולים
    var big = S.items.slice().sort(function (a, b) { return b.size - a.size; }).slice(0, 20);
    $('#sd-big-list').innerHTML = big.map(function (it) {
      return '<li><b>' + fmt(it.size) + '</b><span class="sd-fn" title="' + esc(it.path) + '">' + esc(it.path) + '</span><span class="sd-why">' + (it.dest ? '← ' + esc(it.dest.split('/').slice(0, -1).join('/')) : 'לא יועתק') + '</span></li>';
    }).join('');
    var bigSum = big.reduce(function (a, it) { return a + it.size; }, 0);
    $('#sd-big-sum').textContent = total ? '(' + fmt(bigSum) + ', שהם ' + Math.round(bigSum / total * 100) + '% מכל המקום)' : '';
  }

  function refresh() { assignAll(); keepOpen(renderPreview); }
  // מונים אנונימיים: מה אנשים משנים בהצעה של הכלי. בלי שמות קבצים – רק סוג השינוי.
  // אירוע GA אחד: sader_change, והפרטים בפרמטר tool (כבר רשום כממד ב-GA). כל שינוי נספר פעם אחת לביקור.
  var sent = {};
  function track(what) { if (sent[what]) return; sent[what] = 1; if (window.kelimEv) window.kelimEv('sader_change', { tool: what }); }
  function saveOpt() { try { localStorage.setItem('sader-opt', JSON.stringify(S.opt)); } catch (e) {} }
  document.addEventListener('change', function (e) {
    var t = e.target;
    var r = t.closest('[data-remap]');
    if (r) { var c = r.getAttribute('data-remap'); if (r.value === c) delete S.remap[c]; else { S.remap[c] = r.value; track('move:' + c + '>' + r.value); } keepOpen(renderPreview); return; }
    var f = t.closest('[data-file]');
    if (f) { var id = +f.getAttribute('data-file'), it = S.items[id]; if (f.value === it.cat) delete S.fileCat[id]; else { S.fileCat[id] = f.value; track('file:' + it.cat + '>' + f.value); } keepOpen(renderPreview); return; }
    var map = { 'sd-o-keep': 'keepDirs', 'sd-o-ev': 'events', 'sd-o-ren': 'rename', 'sd-o-sim': 'similar' };
    if (map[t.id]) { S.opt[map[t.id]] = t.checked; saveOpt(); track('option:' + map[t.id] + ':' + (t.checked ? 'on' : 'off')); $('#sd-events').hidden = !Object.keys(S.events).length || !S.opt.events; refresh(); return; }
    if (t.classList && t.classList.contains('sd-evn')) { S.evNames[t.getAttribute('data-ev')] = t.value.trim(); track('event_name'); refresh(); }
  });
  function applyRules() {
    S.rulesText = $('#sd-rules').value; S.rules = parseRules(S.rulesText);
    try { localStorage.setItem('sader-rules', S.rulesText); } catch (e) {}
    if (S.rules.length) track('rules:' + Math.min(S.rules.length, 5));
    $('#sd-rules-n').textContent = S.rules.length ? S.rules.length + ' כללים פעילים. הם נשמרים בדפדפן הזה לפעם הבאה.' : 'אין כללים.';
    refresh();
  }
  function keepOpen(fn) {
    var open = Array.from(document.querySelectorAll('#sd-tree details[open]')).map(pathOf), y = window.scrollY;
    fn();
    document.querySelectorAll('#sd-tree details').forEach(function (d) { d.open = open.indexOf(pathOf(d)) >= 0; });
    window.scrollTo(0, y);
  }
  function pathOf(d) { var p = d.closest('.sd-cat'); return (p ? p.getAttribute('data-cat') : '') + '|' + (d.classList.contains('sd-sub') ? d.querySelector('summary').textContent : ''); }

  // ---------- העתקה לתיקייה במחשב (File System Access) ----------
  async function pickDest(msg) {
    try { return await window.showDirectoryPicker({ id: 'sader-dest', mode: 'readwrite', startIn: 'documents' }); } catch (e) { return null; }
  }
  async function exists(dir, name) { try { await dir.getFileHandle(name); return true; } catch (e) { return false; } }
  async function copyToFolder(addMode) {
    var parent = await pickDest(); if (!parent) return;
    if (S.srcHandle && await isInside(parent)) {
      if (!confirm('בחרתם מקום בתוך התיקייה שמסדרים. זה בסדר (כלום לא יימחק), אבל עדיף מקום אחר, למשל "מסמכים" או שולחן העבודה. להמשיך בכל זאת?')) return;
    }
    var plan = buildPlan(), out, outName;
    if (addMode) { out = parent; outName = parent.name; }
    else {
      outName = S.root + ' – מסודר'; var k = 2;
      while (true) { try { await parent.getDirectoryHandle(safe(outName)); outName = S.root + ' – מסודר (' + (k++) + ')'; } catch (e) { break; } }
      out = await parent.getDirectoryHandle(safe(outName), { create: true });
    }
    show('work');
    // במצב "להוסיף": קודם בודקים מה כבר נמצא בתיקייה המסודרת, כדי לא להעתיק פעמיים
    var existing = {}, already = {};
    if (addMode) {
      var have = []; await walkHandle(out, '', have);
      var havePath = {};
      have.forEach(function (h) { (existing[h.file.size] = existing[h.file.size] || []).push(h); havePath[h.path.toLowerCase()] = h.file.size; });
      for (var i = 0; i < plan.length; i++) {
        if (plan[i].size === 0 && havePath[plan[i].dest.toLowerCase()] === 0) { already[plan[i].id] = plan[i].dest; continue; } // קובץ ריק שכבר שם
        var cand = existing[plan[i].size];
        if (cand && plan[i].size > 0) {
          var hh = await hashOf(plan[i]);
          for (var c = 0; c < cand.length; c++) {
            if (!cand[c].hash) cand[c].hash = await hashFile(cand[c].file);
            if (cand[c].hash === hh) { already[plan[i].id] = cand[c].path; break; }
          }
        }
        prog('בודק מה כבר נמצא בתיקייה המסודרת', i + 1, plan.length);
      }
    }
    var dirs = {}, bad = [], ok = 0;
    async function dirFor(p) {
      if (dirs[p]) return dirs[p];
      var parts = p.split('/'), h = out, acc = '';
      for (var i = 0; i < parts.length; i++) { acc += (acc ? '/' : '') + parts[i]; if (!dirs[acc]) dirs[acc] = await h.getDirectoryHandle(safe(parts[i]), { create: true }); h = dirs[acc]; }
      return h;
    }
    for (i = 0; i < plan.length; i++) {
      var it = plan[i];
      if (already[it.id]) { it.already = already[it.id]; prog('מעתיק', i + 1, plan.length); continue; }
      var cut = it.dest.lastIndexOf('/');
      try {
        var d = await dirFor(it.dest.slice(0, cut)), nm = it.dest.slice(cut + 1);
        if (addMode && await exists(d, nm)) { // שם תפוס בתיקייה הקיימת: מוסיפים (2)
          var dot = nm.lastIndexOf('.'), stem = dot > 0 ? nm.slice(0, dot) : nm, ex = dot > 0 ? nm.slice(dot) : '', n = 2;
          while (await exists(d, stem + ' (' + n + ')' + ex)) n++;
          nm = stem + ' (' + n + ')' + ex; it.dest = it.dest.slice(0, cut + 1) + nm;
        }
        var fh = await d.getFileHandle(nm, { create: true });
        var w = await fh.createWritable(); await w.write(it.file); await w.close();
        var chk = await fh.getFile();
        if (chk.size !== it.size) throw new Error('הגודל לא תואם');
        ok++;
      } catch (e) { bad.push({ it: it, err: e.message || String(e) }); }
      prog('מעתיק', i + 1, plan.length);
    }
    var rep = report(plan, bad, outName);
    var nw = new Date(), stamp = addMode ? ' ' + nw.getFullYear() + '-' + pad(nw.getMonth() + 1) + '-' + pad(nw.getDate()) + ' ' + pad(nw.getHours()) + '-' + pad(nw.getMinutes()) : '';
    try {
      await writeText(out, 'דוח הסידור' + stamp + '.html', rep.html);
      await writeText(out, 'מה עבר לאן' + stamp + '.csv', rep.csv);
    } catch (e) {}
    finish(rep, ok, bad, addMode ? 'add' : 'folder', outName);
  }
  async function isInside(parent) {
    try { if (await S.srcHandle.isSameEntry(parent)) return true; return !!(await S.srcHandle.resolve(parent)); } catch (e) { return false; }
  }
  async function writeText(dir, name, text) {
    var fh = await dir.getFileHandle(name, { create: true }), w = await fh.createWritable();
    await w.write(new Blob([text], { type: 'text/plain;charset=utf-8' })); await w.close();
  }

  // ---------- ZIP (בלי דחיסה, כדי שיהיה מהיר וגם בטלפון) ----------
  var CRC = (function () { var t = new Uint32Array(256); for (var i = 0; i < 256; i++) { var c = i; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
  async function crc32(blob) {
    var c = 0xFFFFFFFF, step = 4194304;
    for (var o = 0; o < blob.size; o += step) {
      var b = new Uint8Array(await blob.slice(o, o + step).arrayBuffer());
      for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function dosTime(ms) {
    var d = new Date(ms || Date.now()); if (d.getFullYear() < 1980) d = new Date(1980, 0, 1);
    return { t: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), d: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
  }
  var enc = new TextEncoder();
  async function makeZip(entries, label) { // entries: [{path, blob, mtime}]
    var parts = [], central = [], off = 0;
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i], name = enc.encode(e.path), crc = await crc32(e.blob), dt = dosTime(e.mtime), sz = e.blob.size;
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dt.t, true); h.setUint16(12, dt.d, true); h.setUint32(14, crc, true); h.setUint32(18, sz, true); h.setUint32(22, sz, true);
      h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(h.buffer, name, e.blob);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, dt.t, true); c.setUint16(14, dt.d, true); c.setUint32(16, crc, true); c.setUint32(20, sz, true); c.setUint32(24, sz, true);
      c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(c.buffer, name);
      off += 30 + name.length + sz;
      if (label) prog(label, i + 1, entries.length);
    }
    var cdSize = central.reduce(function (a, p) { return a + p.byteLength; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
  }
  var ZIP_MAX = 1800 * 1048576; // חלקים של עד 1.8GB, ועד 60,000 קבצים בחלק (ZIP רגיל, בלי zip64)
  async function downloadZip() {
    var plan = buildPlan(), outName = safe(S.root + ' – מסודר');
    show('work');
    var chunks = [[]], size = 0;
    plan.forEach(function (it) {
      if ((size + it.size > ZIP_MAX || chunks[chunks.length - 1].length >= 60000) && chunks[chunks.length - 1].length) { chunks.push([]); size = 0; }
      chunks[chunks.length - 1].push(it); size += it.size;
    });
    var rep = report(plan, [], outName), links = [];
    S.zips = [];
    for (var z = 0; z < chunks.length; z++) {
      var entries = chunks[z].map(function (it) { return { path: outName + '/' + it.dest, blob: it.file, mtime: it.file.lastModified }; });
      if (z === 0) {
        entries.push({ path: outName + '/דוח הסידור.html', blob: new Blob([rep.html]), mtime: Date.now() });
        entries.push({ path: outName + '/מה עבר לאן.csv', blob: new Blob([rep.csv]), mtime: Date.now() });
      }
      var blob = await makeZip(entries, 'אורז ל-ZIP' + (chunks.length > 1 ? ' (חלק ' + (z + 1) + ' מתוך ' + chunks.length + ')' : ''));
      var fn = outName + (chunks.length > 1 ? ' – חלק ' + (z + 1) : '') + '.zip';
      S.zips.push({ name: fn, blob: blob });
      links.push({ name: fn, url: URL.createObjectURL(blob), size: blob.size });
    }
    finish(rep, plan.length, [], 'zip', outName, links);
    if (links.length === 1 && !window.__saderTest) $('#sd-zips a').click();
  }

  // ---------- דוח ----------
  function report(plan, bad, outName) {
    var counts = {}, badSet = {};
    bad.forEach(function (b) { badSet[b.it.id] = b.err; });
    var copied = plan.filter(function (it) { return !badSet[it.id] && !it.already; });
    var already = plan.filter(function (it) { return it.already; });
    copied.forEach(function (it) { var top = it.dest.split('/').slice(0, -1).join('/'); counts[top] = (counts[top] || 0) + 1; });
    var skipped = S.items.filter(function (it) { return !it.dest; });
    var rows = Object.keys(counts).sort(function (a, b) { return a.localeCompare(b, 'he', { numeric: true }); });
    var csv = '\ufeff' + ['מקור', 'יעד', 'גודל', 'סיבה', 'הערה'].join(',') + '\n' + S.items.map(function (it) {
      var note = badSet[it.id] ? 'שגיאה: ' + badSet[it.id] : it.already ? 'כבר היה בתיקייה: ' + it.already : '';
      return [it.path, it.dest ? (it.already ? '(לא הועתק – כבר היה)' : it.dest) : '(לא הועתק – נשאר רק במקור)', it.size, it.why, note].map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var when = new Date().toLocaleString('he-IL');
    var tbl = rows.map(function (r) { return '<tr><td>' + esc(r) + '</td><td>' + num(counts[r]) + '</td></tr>'; }).join('');
    var list = plan.map(function (it) { return '<tr><td>' + esc(it.path) + '</td><td>' + (it.already ? 'כבר היה: ' + esc(it.already) : esc(it.dest)) + '</td><td>' + esc(it.why) + (badSet[it.id] ? ' · <b>שגיאה: ' + esc(badSet[it.id]) + '</b>' : '') + '</td></tr>'; }).join('');
    var html = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>דוח הסידור</title>' +
      '<style>body{font-family:Assistant,Arial,sans-serif;max-width:960px;margin:1.5rem auto;padding:0 1rem;color:#1d1a15;line-height:1.5}h1{font-size:1.5rem}table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.92rem}td,th{border:1px solid #d9cfb8;padding:.35rem .5rem;text-align:right;vertical-align:top;word-break:break-word}th{background:#f4ecd8}.ok{background:#eef7ee;border:1px solid #9cc79c;padding:.7rem 1rem;border-radius:10px}</style></head><body>' +
      '<h1>דוח הסידור – ' + esc(outName) + '</h1><p>' + esc(when) + ' · <a href="https://hakelim.com/kelim/machshev/sader/">מסדר התיקיות</a> של הכלים של גילעד רחמים</p>' +
      '<p class="ok"><b>שום קובץ לא נמחק ולא הוזז.</b> התיקייה המקורית נשארה בדיוק כמו שהייתה. הועתקו ' + num(copied.length) + ' קבצים.' +
      (already.length ? ' ' + num(already.length) + ' קבצים לא הועתקו כי עותק זהה כבר היה בתיקייה.' : '') +
      (skipped.length ? ' ' + num(skipped.length) + ' קבצים לא הועתקו לפי הבחירה שלכם, והם עדיין במקור.' : '') + '</p>' +
      '<p>מה לעשות עכשיו: לעבור על "למיון – להחליט", "כפולים – לבדוק" ו"דומים – לבדוק". כשהכול נראה טוב, אפשר להחליט בעצמכם מה לעשות עם התיקייה הישנה.</p>' +
      '<h2>כמה קבצים בכל תיקייה</h2><table><tr><th>תיקייה</th><th>קבצים</th></tr>' + tbl + '</table>' +
      (bad.length ? '<h2>לא הועתקו בגלל שגיאה (' + num(bad.length) + ')</h2><p>הם עדיין במקור. אפשר לנסות שוב.</p>' : '') +
      '<h2>מה עבר לאן</h2><table><tr><th>מקור</th><th>יעד</th><th>למה</th></tr>' + list + '</table></body></html>';
    return { html: html, csv: csv, counts: counts, rows: rows, skipped: skipped.length, already: already.length, copied: copied.length };
  }

  function finish(rep, ok, bad, how, outName, links) {
    S.last = { rep: rep, ok: ok, bad: bad.length, how: how, outName: outName };
    if (window.toolUsed) window.toolUsed('sader', { step: how, files: ok, errors: bad.length });
    var nf = Object.keys(S.fileCat).length, nr = Object.keys(S.remap).length;
    track('done:' + how + ':' + (nr || nf ? 'changed' : 'as_is')); // השאירו את ההצעה כמו שהיא, או שינו משהו
    $('#sd-done-h').textContent = bad.length ? 'כמעט הכול הועתק' : 'הכול מסודר';
    var msg = how === 'folder' ? 'בתיקייה החדשה <b>"' + esc(outName) + '"</b> יש עכשיו ' + num(ok) + ' קבצים מסודרים. בתוכה גם "דוח הסידור" ו"מה עבר לאן".'
      : how === 'add' ? 'נוספו ' + num(ok) + ' קבצים לתיקייה <b>"' + esc(outName) + '"</b>.' + (rep.already ? ' ' + num(rep.already) + ' קבצים כבר היו שם (עותק זהה), ולא הועתקו שוב.' : '')
      : 'ה-ZIP מוכן: ' + num(ok) + ' קבצים מסודרים, ובתוכו גם "דוח הסידור". פותחים אותו ומחלצים לאן שרוצים.';
    $('#sd-done-p').innerHTML = msg + ' <b>המקור לא השתנה, ושום דבר לא נמחק.</b>' + (bad.length ? ' ' + num(bad.length) + ' קבצים לא הועתקו בגלל שגיאה, והם עדיין במקור.' : '');
    $('#sd-zips').innerHTML = (links || []).map(function (l) { return '<a class="btn btn-gold btn-sm" href="' + l.url + '" download="' + esc(l.name) + '">⬇ ' + esc(l.name) + ' (' + fmt(l.size) + ')</a>'; }).join('');
    $('#sd-rep').innerHTML = '<table class="sd-tbl"><thead><tr><th>תיקייה</th><th>קבצים</th></tr></thead><tbody>' +
      rep.rows.map(function (r) { return '<tr' + (/למיון|כפולים|דומים/.test(r) ? ' class="sd-hl"' : '') + '><td>📁 ' + esc(r) + '</td><td>' + num(rep.counts[r]) + '</td></tr>'; }).join('') + '</tbody></table>';
    S.repBlob = new Blob([rep.html], { type: 'text/html;charset=utf-8' });
    show('done');
  }

  // ---------- קבצים ששותפו מהגלריה (share_target – ה-service worker שומר אותם רגע ב-Cache) ----------
  async function fromShare() {
    try {
      var c = await caches.open('sader-share'), keys = await c.keys(), out = [];
      for (var i = 0; i < keys.length; i++) {
        var r = await c.match(keys[i]), b = await r.blob();
        var nm = decodeURIComponent(r.headers.get('x-name') || 'קובץ'), mod = +r.headers.get('x-mod') || Date.now();
        out.push({ file: new File([b], nm, { type: b.type, lastModified: mod }), path: nm });
      }
      await caches.delete('sader-share');
      history.replaceState(null, '', location.pathname);
      if (out.length) { S.root = 'קבצים ששיתפתי'; await analyze(out); }
    } catch (e) {}
  }

  // ---------- כפתורים ----------
  function init() {
    var canPick = 'showDirectoryPicker' in window;
    document.body.classList.toggle('sd-fs', canPick);
    $('#sd-pick-dir').hidden = !canPick;
    $('#sd-to-folder').hidden = !canPick;
    $('#sd-to-add').hidden = !canPick;
    $('#sd-dir-in').parentElement.hidden = canPick || !('webkitdirectory' in document.createElement('input'));
    $('#sd-pick-dir').addEventListener('click', async function () {
      if (S.busy) return;
      var h; try { h = await window.showDirectoryPicker({ id: 'sader-src', mode: 'read' }); } catch (e) { return; }
      S.srcHandle = h; S.root = h.name; show('work');
      var out = []; await walkHandle(h, '', out); await analyze(out);
    });
    $('#sd-files-in').addEventListener('change', function () { var fs = Array.from(this.files); if (!fs.length) return; S.srcHandle = null; S.root = 'הקבצים שלי'; analyze(fs.map(function (f) { return { file: f, path: f.name }; })); this.value = ''; });
    $('#sd-dir-in').addEventListener('change', function () {
      var fs = Array.from(this.files); if (!fs.length) return; S.srcHandle = null;
      var first = (fs[0].webkitRelativePath || '').split('/')[0]; S.root = first || 'הקבצים שלי';
      analyze(fs.map(function (f) { var p = f.webkitRelativePath || f.name; return { file: f, path: first ? p.slice(first.length + 1) : p }; })); this.value = '';
    });
    var dz = $('#sd-drop');
    ['dragenter', 'dragover'].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.add('on'); }); });
    ['dragleave', 'drop'].forEach(function (t) { dz.addEventListener(t, function () { dz.classList.remove('on'); }); });
    dz.addEventListener('drop', async function (e) {
      e.preventDefault(); S.srcHandle = null;
      var items = Array.from(e.dataTransfer.items || []).map(function (i) { return i.webkitGetAsEntry && i.webkitGetAsEntry(); }).filter(Boolean);
      show('work'); var out = [];
      if (items.length) {
        S.root = items.length === 1 && items[0].isDirectory ? items[0].name : 'הקבצים שלי';
        for (var i = 0; i < items.length; i++) await walkEntry(items[i], out);
        if (items.length === 1 && items[0].isDirectory) out.forEach(function (o) { o.path = o.path.slice(items[0].name.length + 1); });
      } else Array.from(e.dataTransfer.files).forEach(function (f) { out.push({ file: f, path: f.name }); });
      await analyze(out);
    });
    $('#sd-to-folder').addEventListener('click', function () { copyToFolder(false); });
    $('#sd-to-add').addEventListener('click', function () { copyToFolder(true); });
    $('#sd-to-zip').addEventListener('click', downloadZip);
    $('#sd-rules-apply').addEventListener('click', applyRules);
    $('#sd-back').addEventListener('click', function () { show('pick'); });
    $('#sd-again').addEventListener('click', function () { show('pick'); });
    $('#sd-rep-dl').addEventListener('click', function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(S.repBlob); a.download = 'דוח הסידור.html'; a.click();
    });
    $('#sd-rules').value = S.rulesText;
    if (/[?&]share=1/.test(location.search)) fromShare();
  }
  // לבדיקות: להריץ את הכלי על רשימת קבצים בלי חלון בחירה
  window.__saderRun = analyze;
  window.__saderZip = downloadZip;
  window.__saderCopy = copyToFolder;
  window.__saderPlan = buildPlan;
  window.__saderRules = applyRules;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
