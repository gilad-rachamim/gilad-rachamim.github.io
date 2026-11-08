// מסדר תיקיות – הכול בדפדפן. הקבצים לא עולים לשום שרת.
// הכלל: שום דבר לא נמחק ולא זז. הכלי רק קורא את המקור ומעתיק לתיקייה חדשה (או ל-ZIP).
// מה שלא ברור הולך ל"למיון – להחליט", וכפולים (אותו גודל ואותו hash) ל"כפולים – לבדוק".
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  // ---------- הקטגוריות (שם התיקייה הראשית) ----------
  var CATS = [
    { id: 'personal', name: '1. מסמכים אישיים', hint: 'תעודות, דרכון, רישיון' },
    { id: 'money', name: '2. קבלות, חשבוניות ותלושים', hint: 'לפי שנה' },
    { id: 'torah', name: '3. שיעורים ותורה', hint: 'הקלטות, מסמכים וסרטונים של שיעורים' },
    { id: 'photos', name: '4. תמונות', hint: 'לפי שנה וחודש' },
    { id: 'shots', name: '5. צילומי מסך', hint: 'לפי שנה' },
    { id: 'videos', name: '6. סרטונים', hint: 'לפי שנה' },
    { id: 'audio', name: '7. הקלטות ושמע', hint: 'לפי שנה' },
    { id: 'docs', name: '8. מסמכים', hint: 'PDF, וורד, טבלאות, מצגות' },
    { id: 'arch', name: '9. קבצים דחוסים ותוכנות', hint: 'zip, rar, התקנות' },
    { id: 'unsure', name: 'למיון – להחליט', hint: 'מה שלא היה ברור. אתם מחליטים' },
    { id: 'dups', name: 'כפולים – לבדוק', hint: 'עותק זהה כבר נמצא בתיקייה אחרת' }
  ];
  var CAT = {}; CATS.forEach(function (c) { CAT[c.id] = c; });

  var EXT = {
    img: 'jpg jpeg png gif heic heif webp bmp tif tiff dng cr2 nef arw raw svg',
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

  // מילים בשם הקובץ או בשם התיקייה שלו
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

  function isJunk(name) {
    var n = name.toLowerCase();
    return /^~\$/.test(n) || /^\._/.test(n) || /\.(tmp|crdownload|part|partial|lnk|ini|db)$/.test(n) || n === '.ds_store' || n === 'thumbs.db' || n === 'desktop.ini';
  }
  function extOf(name) { var i = name.lastIndexOf('.'); return i > 0 ? name.slice(i + 1).toLowerCase() : ''; }

  // ---------- תאריך: EXIF, שם הקובץ, ואז תאריך השינוי ----------
  var THIS_YEAR = new Date().getFullYear();
  function okDate(y, m, d) { return y >= 1990 && y <= THIS_YEAR + 1 && m >= 1 && m <= 12 && d >= 1 && d <= 31; }
  function dateFromName(n) {
    var m = n.match(/(?:^|\D)((?:19|20)\d\d)[-_. ]?(0[1-9]|1[0-2])[-_. ]?(0[1-9]|[12]\d|3[01])(?:\D|$)/);
    if (m && okDate(+m[1], +m[2], +m[3])) return { y: +m[1], m: +m[2], src: 'שם הקובץ' };
    m = n.match(/(?:^|\D)(0?[1-9]|[12]\d|3[01])[-_.](0?[1-9]|1[0-2])[-_.]((?:19|20)\d\d)(?:\D|$)/);
    if (m && okDate(+m[3], +m[2], +m[1])) return { y: +m[3], m: +m[2], src: 'שם הקובץ' };
    m = n.match(/(?:^|\D)((?:19|20)\d\d)[-_.](0[1-9]|1[0-2])(?:\D|$)/); // שנה-חודש, בלי יום (למשל תלוש 2023-11)
    if (m && okDate(+m[1], +m[2], 1)) return { y: +m[1], m: +m[2], src: 'שם הקובץ' };
    return null;
  }
  function exifDate(buf) {
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
    var le = v.getUint16(t) === 0x4949;
    var u16 = function (p) { return v.getUint16(p, le); }, u32 = function (p) { return v.getUint32(p, le); };
    var best = null;
    function ifd(p, depth) {
      if (depth > 2 || p + 2 > v.byteLength) return;
      var n = u16(p);
      for (var i = 0; i < n; i++) {
        var e = p + 2 + i * 12; if (e + 12 > v.byteLength) return;
        var tag = u16(e);
        if (tag === 0x8769) ifd(t + u32(e + 8), depth + 1);
        else if (tag === 0x9003 || tag === 0x0132) {
          var s = '', off = t + u32(e + 8);
          for (var k = 0; k < 19 && off + k < v.byteLength; k++) s += String.fromCharCode(v.getUint8(off + k));
          var m = s.match(/^(\d{4}):(\d\d):(\d\d)/);
          if (m && okDate(+m[1], +m[2], +m[3]) && (tag === 0x9003 || !best)) best = { y: +m[1], m: +m[2], src: 'נתוני המצלמה' };
        }
      }
    }
    ifd(t + u32(t + 4), 0);
    return best;
  }
  function modDate(f) { var d = new Date(f.lastModified || Date.now()); return { y: d.getFullYear(), m: d.getMonth() + 1, src: 'תאריך שינוי הקובץ' }; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function monthFolder(d) { return pad(d.m) + ' ' + MONTHS[d.m - 1]; }

  // ---------- סיווג קובץ אחד ----------
  async function classify(it) {
    var name = it.name, ext = extOf(name), kind = KIND[ext] || '';
    var low = it.path.toLowerCase().replace(/[_]+/g, ' ');
    var base = name.toLowerCase().replace(/[_]+/g, ' ');
    var f = it.file;
    if (isJunk(name)) return set(it, 'unsure', 'קבצי מערכת וזמניים', 'קובץ זמני או קובץ מערכת. בדרך כלל לא צריך אותו');
    if (!ext) return set(it, 'unsure', 'בלי סיומת', 'אין לקובץ סיומת, אז לא ברור מה הוא');
    var docLike = kind === 'pdf' || kind === 'word' || kind === 'sheet' || kind === 'img';
    if (docLike && hasKw('personal', base)) return set(it, 'personal', kind === 'img' ? 'צילומים' : '', 'מילה בשם: מסמך אישי');
    if (docLike && hasKw('money', base)) return set(it, 'money', String((dateFromName(name) || modDate(f)).y), 'מילה בשם: קבלה או חשבונית');
    if ((kind === 'aud' || kind === 'vid' || kind === 'pdf' || kind === 'word' || kind === 'slide') && hasKw('torah', low)) {
      return set(it, 'torah', kind === 'aud' ? 'הקלטות' : kind === 'vid' ? 'סרטונים' : 'מסמכים', 'מילה בשם: שיעור או תורה');
    }
    if (docLike && hasKw('personal', low)) return set(it, 'personal', kind === 'img' ? 'צילומים' : '', 'שם התיקייה: מסמכים אישיים');
    if (docLike && hasKw('money', low)) return set(it, 'money', String((dateFromName(name) || modDate(f)).y), 'שם התיקייה: קבלות');
    if (kind === 'img') {
      var d = dateFromName(name);
      if (/screenshot|screen shot|צילום מסך|screencapture/.test(base)) return set(it, 'shots', String((d || modDate(f)).y), 'צילום מסך');
      if (!d && (ext === 'jpg' || ext === 'jpeg')) { try { d = exifDate(await f.slice(0, 131072).arrayBuffer()); } catch (e) {} }
      if (!d) d = modDate(f);
      it.dateSrc = d.src;
      return set(it, 'photos', d.y + '/' + monthFolder(d), 'תמונה, לפי ' + d.src);
    }
    if (kind === 'vid') {
      var dv = dateFromName(name) || modDate(f); it.dateSrc = dv.src;
      if (/screenrecord|screen recording|הקלטת מסך/.test(base)) return set(it, 'shots', String(dv.y), 'הקלטת מסך');
      return set(it, 'videos', String(dv.y), 'סרטון, לפי ' + dv.src);
    }
    if (kind === 'aud') { var da = dateFromName(name) || modDate(f); it.dateSrc = da.src; return set(it, 'audio', String(da.y), 'הקלטה, לפי ' + da.src); }
    if (DOC_SUB[kind]) return set(it, 'docs', DOC_SUB[kind], 'מסמך');
    if (kind === 'arch' || kind === 'app') return set(it, 'arch', kind === 'app' ? 'תוכנות והתקנות' : 'דחוסים', 'קובץ דחוס או תוכנה');
    return set(it, 'unsure', 'סוג לא מוכר', 'סוג קובץ לא מוכר (.' + ext + ')');
  }
  function set(it, cat, sub, why) { it.cat = cat; it.sub = sub || ''; it.why = why; return it; }

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
  function keepScore(it) { // הקובץ שנשאר במקום: בלי "(1)"/"עותק" בשם, ואז נתיב קצר
    var n = it.name.toLowerCase(), s = 0;
    if (/\(\d+\)|copy|עותק|העתק| - \d+\./.test(n)) s += 1000;
    return s + it.path.length;
  }
  async function findDups(items, prog) {
    var bySize = {};
    items.forEach(function (it) { if (it.size > 0) (bySize[it.size] = bySize[it.size] || []).push(it); });
    var groups = Object.keys(bySize).map(function (k) { return bySize[k]; }).filter(function (g) { return g.length > 1; });
    var total = groups.reduce(function (a, g) { return a + g.length; }, 0), done = 0, n = 0;
    for (var gi = 0; gi < groups.length; gi++) {
      var byHash = {};
      for (var i = 0; i < groups[gi].length; i++) {
        var it = groups[gi][i];
        try { it.hash = await hashFile(it.file); } catch (e) { it.hash = 'x' + Math.random(); }
        (byHash[it.hash] = byHash[it.hash] || []).push(it);
        prog('בודק כפולים', ++done, total);
      }
      Object.keys(byHash).forEach(function (h) {
        var g = byHash[h]; if (g.length < 2) return;
        g.sort(function (a, b) { return keepScore(a) - keepScore(b); });
        for (var j = 1; j < g.length; j++) { g[j].dupOf = g[0]; g[j].origCat = g[j].cat; g[j].origSub = g[j].sub; set(g[j], 'dups', '', 'זהה לגמרי ל: ' + g[0].path); n++; }
      });
    }
    return n;
  }

  // ---------- מצב ----------
  var S = { items: [], root: 'הקבצים שלי', srcHandle: null, remap: {}, skip: {}, fileCat: {} };
  window.__sader = S;

  function finalCat(it) {
    if (S.fileCat[it.id]) return S.fileCat[it.id];
    return S.remap[it.cat] || it.cat;
  }
  function targetPath(it) { // נתיב יחסי בתוך התיקייה החדשה (בלי שם הקובץ)
    var c = finalCat(it);
    if (c === 'skip') return null;
    var sub = (S.fileCat[it.id] || (S.remap[it.cat] && S.remap[it.cat] !== it.cat)) ? '' : it.sub;
    return CAT[c].name + (sub ? '/' + sub : '');
  }
  function safe(n) { return n.replace(/[<>:"\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '') || '_'; }
  function buildPlan() { // מחשב לכל קובץ יעד סופי, ושם ייחודי אם יש התנגשות
    var used = {}, plan = [];
    S.items.forEach(function (it) {
      var dir = targetPath(it);
      if (dir === null) { it.dest = null; return; }
      var nm = safe(it.name), key = (dir + '/' + nm).toLowerCase(), k = 2;
      var dot = nm.lastIndexOf('.'), stem = dot > 0 ? nm.slice(0, dot) : nm, ex = dot > 0 ? nm.slice(dot) : '';
      while (used[key]) { nm = stem + ' (' + (k++) + ')' + ex; key = (dir + '/' + nm).toLowerCase(); }
      used[key] = 1; it.dest = dir + '/' + nm; plan.push(it);
    });
    return plan;
  }

  // ---------- איסוף קבצים ----------
  async function walkHandle(dir, prefix, out, prog) {
    for await (var entry of dir.values()) {
      var p = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.kind === 'file') { out.push({ file: await entry.getFile(), path: p }); prog('קורא את הקבצים', out.length); }
      else await walkHandle(entry, p, out, prog);
    }
  }
  function readAllEntries(reader) {
    return new Promise(function (res, rej) {
      var all = [];
      (function more() { reader.readEntries(function (b) { if (!b.length) res(all); else { all = all.concat(Array.from(b)); more(); } }, rej); })();
    });
  }
  async function walkEntry(entry, out, prog) {
    if (entry.isFile) {
      var f = await new Promise(function (res, rej) { entry.file(res, rej); });
      out.push({ file: f, path: entry.fullPath.replace(/^\//, '') }); prog('קורא את הקבצים', out.length);
    } else if (entry.isDirectory) {
      var list = await readAllEntries(entry.createReader());
      for (var i = 0; i < list.length; i++) await walkEntry(list[i], out, prog);
    }
  }

  async function analyze(list) {
    show('work');
    S.items = []; S.remap = {}; S.skip = {}; S.fileCat = {};
    for (var i = 0; i < list.length; i++) {
      var it = { id: i, file: list[i].file, path: list[i].path, name: list[i].file.name, size: list[i].file.size };
      await classify(it); S.items.push(it);
      if (i % 25 === 0) { prog('ממיין לפי סוג ותאריך', i + 1, list.length); await tick(); }
    }
    var d = await findDups(S.items, prog);
    if (window.toolUsed) window.toolUsed('sader', { step: 'scan', files: S.items.length, dups: d });
    renderPreview();
    show('preview');
  }
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  // ---------- תצוגה ----------
  function show(step) { ['pick', 'work', 'preview', 'done'].forEach(function (s) { var el = $('#sd-' + s); if (el) el.hidden = s !== step; }); window.scrollTo({ top: $('#sd-top').offsetTop - 70, behavior: 'smooth' }); }
  var lastProg = 0;
  function prog(label, n, total) {
    var now = Date.now(); if (now - lastProg < 120 && n !== total) return; lastProg = now;
    $('#sd-prog-l').textContent = label + (total ? ' · ' + n.toLocaleString('he-IL') + ' מתוך ' + total.toLocaleString('he-IL') : ' · ' + n.toLocaleString('he-IL'));
    $('#sd-bar').style.width = total ? Math.round(n / total * 100) + '%' : '100%';
    $('#sd-bar').classList.toggle('ind', !total);
  }
  function fmt(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(0) + ' KB'; if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB'; return (b / 1073741824).toFixed(2) + ' GB'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function n(x) { return x.toLocaleString('he-IL'); }

  function catOptions(sel, self, withSkip) {
    var h = CATS.filter(function (c) { return c.id !== 'dups' || self === 'dups'; }).map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + (c.id === self ? 'להשאיר כאן' : 'להעביר אל: ' + esc(c.name)) + '</option>';
    }).join('');
    return h + (withSkip ? '<option value="skip"' + (sel === 'skip' ? ' selected' : '') + '>לא להעתיק (נשאר רק במקור)</option>' : '');
  }

  function renderPreview() {
    var plan = buildPlan(), byCat = {};
    S.items.forEach(function (it) { (byCat[it.cat] = byCat[it.cat] || []).push(it); });
    var total = S.items.reduce(function (a, it) { return a + it.size; }, 0);
    var dups = (byCat.dups || []).length, uns = (byCat.unsure || []).length, skipped = S.items.length - plan.length;
    $('#sd-sum').innerHTML = '<b>' + n(S.items.length) + '</b> קבצים (' + fmt(total) + ') מתוך "' + esc(S.root) + '". ' +
      (dups ? '<b>' + n(dups) + '</b> כפולים יישמו בצד לבדיקה. ' : 'לא נמצאו כפולים. ') +
      (uns ? '<b>' + n(uns) + '</b> קבצים לא ברורים מחכים לכם ב"למיון – להחליט". ' : '') +
      (skipped ? '<b>' + n(skipped) + '</b> לא יועתקו (בחרתם). ' : '');
    var html = '';
    CATS.forEach(function (c) {
      var list = byCat[c.id]; if (!list) return;
      var subs = {}; list.forEach(function (it) { var k = it.sub || ''; (subs[k] = subs[k] || []).push(it); });
      var size = list.reduce(function (a, it) { return a + it.size; }, 0);
      var to = S.remap[c.id] || c.id;
      html += '<details class="sd-cat' + (c.id === 'unsure' || c.id === 'dups' ? ' sd-warn' : '') + (to === 'skip' ? ' sd-off' : '') + '" data-cat="' + c.id + '"' + (c.id === 'unsure' ? ' open' : '') + '>' +
        '<summary><span class="sd-ic">📁</span><b>' + esc(c.name) + '</b><span class="sd-n">' + n(list.length) + ' קבצים · ' + fmt(size) + '</span>' +
        (to !== c.id ? '<span class="sd-to">' + (to === 'skip' ? 'לא יועתק' : '← ' + esc(CAT[to].name)) + '</span>' : '') + '</summary>' +
        '<p class="sd-hint">' + esc(c.hint) + '</p>' +
        '<div class="field sd-move"><label>מה לעשות עם כל התיקייה</label><select data-remap="' + c.id + '">' + catOptions(to, c.id, true) + '</select></div>';
      Object.keys(subs).sort().forEach(function (s) {
        var fl = subs[s];
        html += '<details class="sd-sub"><summary>' + (s ? '📁 ' + esc(s) : '📄 ישר בתיקייה') + ' <span class="sd-n">' + n(fl.length) + '</span></summary><ul class="sd-files">';
        fl.slice(0, 300).forEach(function (it) {
          var perFile = c.id === 'unsure' || c.id === 'dups';
          html += '<li><span class="sd-fn" title="' + esc(it.path) + '">' + esc(it.name) + '</span><span class="sd-why">' + esc(it.why) + ' · ' + fmt(it.size) + '</span>' +
            (perFile ? '<select class="sd-fsel" data-file="' + it.id + '" aria-label="לאן להעביר את ' + esc(it.name) + '">' + catOptions(S.fileCat[it.id] || c.id, c.id, true) + '</select>' : '') + '</li>';
        });
        if (fl.length > 300) html += '<li class="sd-more">ועוד ' + n(fl.length - 300) + ' קבצים…</li>';
        html += '</ul></details>';
      });
      html += '</details>';
    });
    $('#sd-tree').innerHTML = html;
    $('#sd-newname').textContent = S.root + ' – מסודר';
  }

  document.addEventListener('change', function (e) {
    var r = e.target.closest('[data-remap]');
    if (r) { var c = r.getAttribute('data-remap'); if (r.value === c) delete S.remap[c]; else S.remap[c] = r.value; keepOpen(renderPreview); return; }
    var f = e.target.closest('[data-file]');
    if (f) { var id = +f.getAttribute('data-file'), it = S.items[id]; if (f.value === it.cat) delete S.fileCat[id]; else S.fileCat[id] = f.value; keepOpen(renderPreview); }
  });
  function keepOpen(fn) {
    var open = Array.from(document.querySelectorAll('#sd-tree details[open]')).map(pathOf), y = window.scrollY;
    fn();
    document.querySelectorAll('#sd-tree details').forEach(function (d) { d.open = open.indexOf(pathOf(d)) >= 0; });
    window.scrollTo(0, y);
  }
  function pathOf(d) { var p = d.closest('.sd-cat'); return (p ? p.getAttribute('data-cat') : '') + '|' + (d.classList.contains('sd-sub') ? d.querySelector('summary').textContent : ''); }

  // ---------- העתקה לתיקייה במחשב (File System Access) ----------
  async function copyToFolder() {
    var parent;
    try { parent = await window.showDirectoryPicker({ id: 'sader-dest', mode: 'readwrite', startIn: 'documents' }); }
    catch (e) { return; }
    if (S.srcHandle && await isInside(parent)) {
      if (!confirm('בחרתם מקום בתוך התיקייה שמסדרים. זה בסדר (כלום לא יימחק), אבל עדיף מקום אחר, למשל "מסמכים" או שולחן העבודה. להמשיך בכל זאת?')) return;
    }
    var plan = buildPlan(), outName = S.root + ' – מסודר', k = 2, out;
    while (true) { try { await parent.getDirectoryHandle(safe(outName)); outName = S.root + ' – מסודר (' + (k++) + ')'; } catch (e) { break; } }
    out = await parent.getDirectoryHandle(safe(outName), { create: true });
    show('work');
    var dirs = {}, bad = [], ok = 0;
    async function dirFor(p) {
      if (dirs[p]) return dirs[p];
      var parts = p.split('/'), h = out, acc = '';
      for (var i = 0; i < parts.length; i++) { acc += (acc ? '/' : '') + parts[i]; if (!dirs[acc]) dirs[acc] = await h.getDirectoryHandle(safe(parts[i]), { create: true }); h = dirs[acc]; }
      return h;
    }
    for (var i = 0; i < plan.length; i++) {
      var it = plan[i], cut = it.dest.lastIndexOf('/');
      try {
        var d = await dirFor(it.dest.slice(0, cut));
        var fh = await d.getFileHandle(it.dest.slice(cut + 1), { create: true });
        var w = await fh.createWritable(); await w.write(it.file); await w.close();
        var chk = await fh.getFile();
        if (chk.size !== it.size) throw new Error('הגודל לא תואם');
        ok++;
      } catch (e) { bad.push({ it: it, err: e.message || String(e) }); }
      prog('מעתיק לתיקייה החדשה', i + 1, plan.length);
    }
    var rep = report(plan, bad, outName);
    try {
      await writeText(out, 'דוח הסידור.html', rep.html);
      await writeText(out, 'מה עבר לאן.csv', rep.csv);
    } catch (e) {}
    finish(rep, ok, bad, 'folder', outName);
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
  async function crc32(blob, onChunk) {
    var c = 0xFFFFFFFF, step = 4194304;
    for (var o = 0; o < blob.size; o += step) {
      var b = new Uint8Array(await blob.slice(o, o + step).arrayBuffer());
      for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
      if (onChunk) onChunk(b.length);
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
    plan.forEach(function (it) { if (badSet[it.id]) return; var top = it.dest.split('/').slice(0, -1).join('/'); counts[top] = (counts[top] || 0) + 1; });
    var skipped = S.items.filter(function (it) { return !it.dest; });
    var rows = Object.keys(counts).sort(function (a, b) { return a.localeCompare(b, 'he', { numeric: true }); });
    var csv = '\ufeff' + ['מקור', 'יעד', 'גודל', 'סיבה', 'הערה'].join(',') + '\n' + S.items.map(function (it) {
      return [it.path, it.dest ? it.dest : '(לא הועתק – נשאר רק במקור)', it.size, it.why, badSet[it.id] ? 'שגיאה: ' + badSet[it.id] : ''].map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var when = new Date().toLocaleString('he-IL');
    var tbl = rows.map(function (r) { return '<tr><td>' + esc(r) + '</td><td>' + n(counts[r]) + '</td></tr>'; }).join('');
    var list = plan.map(function (it) { return '<tr><td>' + esc(it.path) + '</td><td>' + esc(it.dest) + '</td><td>' + esc(it.why) + (badSet[it.id] ? ' · <b>שגיאה: ' + esc(badSet[it.id]) + '</b>' : '') + '</td></tr>'; }).join('');
    var html = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>דוח הסידור</title>' +
      '<style>body{font-family:Assistant,Arial,sans-serif;max-width:960px;margin:1.5rem auto;padding:0 1rem;color:#1d1a15;line-height:1.5}h1{font-size:1.5rem}table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.92rem}td,th{border:1px solid #d9cfb8;padding:.35rem .5rem;text-align:right;vertical-align:top;word-break:break-word}th{background:#f4ecd8}.ok{background:#eef7ee;border:1px solid #9cc79c;padding:.7rem 1rem;border-radius:10px}</style></head><body>' +
      '<h1>דוח הסידור – ' + esc(outName) + '</h1><p>' + esc(when) + ' · <a href="https://gilad-rachamim.github.io/kelim/machshev/sader/">מסדר התיקיות</a> של הכלים של גילעד רחמים</p>' +
      '<p class="ok"><b>שום קובץ לא נמחק ולא הוזז.</b> התיקייה המקורית נשארה בדיוק כמו שהייתה. כאן יש עותקים מסודרים: ' + n(plan.length - bad.length) + ' קבצים.' +
      (skipped.length ? ' ' + n(skipped.length) + ' קבצים לא הועתקו לפי הבחירה שלכם, והם עדיין במקור.' : '') + '</p>' +
      '<p>מה לעשות עכשיו: לעבור על "למיון – להחליט" ועל "כפולים – לבדוק". כשהכול נראה טוב, אפשר להחליט בעצמכם מה לעשות עם התיקייה הישנה.</p>' +
      '<h2>כמה קבצים בכל תיקייה</h2><table><tr><th>תיקייה</th><th>קבצים</th></tr>' + tbl + '</table>' +
      (bad.length ? '<h2>לא הועתקו בגלל שגיאה (' + n(bad.length) + ')</h2><p>הם עדיין במקור. אפשר לנסות שוב.</p>' : '') +
      '<h2>מה עבר לאן</h2><table><tr><th>מקור</th><th>יעד</th><th>למה</th></tr>' + list + '</table></body></html>';
    return { html: html, csv: csv, counts: counts, rows: rows, skipped: skipped.length };
  }

  function finish(rep, ok, bad, how, outName, links) {
    S.last = { rep: rep, ok: ok, bad: bad.length, how: how, outName: outName };
    if (window.toolUsed) window.toolUsed('sader', { step: how, files: ok, errors: bad.length });
    $('#sd-done-h').textContent = bad.length ? 'כמעט הכול הועתק' : 'הכול מסודר';
    $('#sd-done-p').innerHTML = (how === 'folder'
      ? 'בתיקייה החדשה <b>"' + esc(outName) + '"</b> יש עכשיו ' + n(ok) + ' קבצים מסודרים. בתוכה גם "דוח הסידור" ו"מה עבר לאן".'
      : 'ה-ZIP מוכן: ' + n(ok) + ' קבצים מסודרים, ובתוכו גם "דוח הסידור". פותחים אותו ומחלצים לאן שרוצים.') +
      ' <b>המקור לא השתנה, ושום דבר לא נמחק.</b>' + (bad.length ? ' ' + n(bad.length) + ' קבצים לא הועתקו בגלל שגיאה, והם עדיין במקור.' : '');
    $('#sd-zips').innerHTML = (links || []).map(function (l) { return '<a class="btn btn-gold btn-sm" href="' + l.url + '" download="' + esc(l.name) + '">⬇ ' + esc(l.name) + ' (' + fmt(l.size) + ')</a>'; }).join('');
    $('#sd-rep').innerHTML = '<table class="sd-tbl"><thead><tr><th>תיקייה</th><th>קבצים</th></tr></thead><tbody>' +
      rep.rows.map(function (r) { return '<tr' + (/למיון|כפולים/.test(r) ? ' class="sd-hl"' : '') + '><td>📁 ' + esc(r) + '</td><td>' + n(rep.counts[r]) + '</td></tr>'; }).join('') + '</tbody></table>';
    S.repBlob = new Blob([rep.html], { type: 'text/html;charset=utf-8' });
    show('done');
  }

  // ---------- כפתורים ----------
  function init() {
    var canPick = 'showDirectoryPicker' in window;
    document.body.classList.toggle('sd-fs', canPick);
    $('#sd-pick-dir').hidden = !canPick;
    $('#sd-to-folder').hidden = !canPick;
    $('#sd-dir-in').parentElement.hidden = canPick || !('webkitdirectory' in document.createElement('input'));
    $('#sd-pick-dir').addEventListener('click', async function () {
      var h; try { h = await window.showDirectoryPicker({ id: 'sader-src', mode: 'read' }); } catch (e) { return; }
      S.srcHandle = h; S.root = h.name; show('work');
      var out = []; await walkHandle(h, '', out, prog); await analyze(out);
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
        for (var i = 0; i < items.length; i++) await walkEntry(items[i], out, prog);
        if (items.length === 1 && items[0].isDirectory) out.forEach(function (o) { o.path = o.path.slice(items[0].name.length + 1); });
      } else Array.from(e.dataTransfer.files).forEach(function (f) { out.push({ file: f, path: f.name }); });
      await analyze(out);
    });
    $('#sd-to-folder').addEventListener('click', copyToFolder);
    $('#sd-to-zip').addEventListener('click', downloadZip);
    $('#sd-back').addEventListener('click', function () { show('pick'); });
    $('#sd-again').addEventListener('click', function () { show('pick'); });
    $('#sd-rep-dl').addEventListener('click', function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(S.repBlob); a.download = 'דוח הסידור.html'; a.click();
    });
  }
  // לבדיקות: להריץ את הכלי על רשימת קבצים בלי חלון בחירה
  window.__saderRun = analyze;
  window.__saderZip = downloadZip;
  window.__saderCopy = copyToFolder;
  window.__saderPlan = buildPlan;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
