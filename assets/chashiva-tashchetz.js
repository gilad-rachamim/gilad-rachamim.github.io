// תשחצים (תשבץ היגיון) – /kelim/chashiva/tashchetz/
// כל ההגדרות נכתבו במיוחד לאתר. לכל הגדרה: התשובה, סוג החידה, והסבר שמופיע אחרי הפתרון.
(function () {
  'use strict';
  var CH = window.CH, TOOL = 'chashiva_tash', G = 'tash';
  function $(id) { return document.getElementById(id); }
  if (!$('ts-grid')) return;

  // [תשובה, הגדרה, סוג, הסבר]
  var POOL = [
    ['שמש', 'מאירה ביום, ובבית הכנסת דואג לסידורים', 'כפולה', 'שתי הגדרות לאותה מילה: השמש בשמיים, והשמש של בית הכנסת.'],
    ['ירח', 'ריח מבולבל מאיר בלילה', 'אנגרמה', '"מבולבל" = מסדרים מחדש את האותיות. ר-י-ח בסדר אחר נותן י-ר-ח.'],
    ['לבנה', 'מאירה בלילה, ובונים ממנה קיר', 'כפולה', 'לבנה היא הירח, ולבנה היא גם אבן בניין.'],
    ['מים', 'שותים אותם, והם נקראים אותו דבר מכל צד', 'פלינדרום', 'מ-י-ם נקרא אותו הדבר מימין לשמאל ומשמאל לימין.'],
    ['אבא', 'הורה שנקרא אותו דבר גם מהסוף', 'פלינדרום', 'א-ב-א נקרא אותו הדבר משני הכיוונים.'],
    ['ספר', 'בספרייה הוא על המדף, ובמספרה הוא עם המספריים', 'כפולה', 'סֵפֶר לקריאה, וסַפָּר שמסתפרים אצלו. אותן אותיות.'],
    ['מלך', 'כולם (בכתיב חסר) חוזרים לאחור ועולים לכס', 'הפוך', '"כולם" בכתיב חסר הוא כ-ל-ם. קוראים מהסוף: מ-ל-כ, כלומר מלך.'],
    ['רגל', 'עולים בה לירושלים, והולכים עליה', 'כפולה', 'עלייה לרגל בשלושת הרגלים, וגם הרגל שהולכים עליה.'],
    ['חלה', 'לחם של שבת, וגם הרגיש לא טוב', 'כפולה', 'חַלָּה לשבת, ו"חָלָה" = היה חולה.'],
    ['שבת', 'שב, ובראשית תנוח: יום של קדושה', 'צירוף', '"שב" + ת (האות הראשונה של "תנוח") = שבת.'],
    ['כנר', 'כמו נר, ומנגן', 'צירוף', 'כ (= כמו) + נר = כנר, מי שמנגן בכינור.'],
    ['חנוכה', 'חנו כה, ושמונה ימים מדליקים', 'צירוף', '"חנו" + "כה" = חנוכה. ויש מסבירים כך באמת את שם החג: חנו בכ"ה בכסלו.'],
    ['דגל', 'דג ולמ"ד, ומתנופף ביום העצמאות', 'צירוף', 'דג + ל = דגל.'],
    ['גשם', 'גם עוטף שי"ן, ויורד מהשמיים', 'עטיפה', 'מכניסים ש בתוך "גם": ג-ש-ם.'],
    ['שלג', 'גלש מבולבל, יורד לבן מהשמיים', 'אנגרמה', 'ג-ל-ש בסדר אחר = ש-ל-ג. ובונוס: אפשר גם לגלוש עליו.'],
    ['בית', 'גרים בו, וזה גם שם האות השנייה', 'כפולה', 'בית לגור בו, והאות ב נקראת "בית".'],
    ['אלף', 'מספר עם שלושה אפסים, וגם האות הראשונה', 'כפולה', 'אלף = 1,000, וגם שמה של האות א.'],
    ['יונה', 'נביא שנבלע, ומביאה עלה זית', 'כפולה', 'יונה הנביא שנבלע בדג, והיונה שחזרה לתיבת נח עם עלה זית.'],
    ['לחם', 'מלח מבולבל, ובלעדיו אין ארוחה', 'אנגרמה', 'מ-ל-ח בסדר אחר = ל-ח-ם.'],
    ['כסף', 'כיסא מלכות ופ"א סופית: בזה משלמים', 'צירוף', 'כס (כיסא מלכות) + ף = כסף.'],
    ['ראש', 'שאר מבולבל, יושב מעל הכתפיים', 'אנגרמה', 'ש-א-ר בסדר אחר = ר-א-ש.'],
    ['עין', 'רואים בה, וגם שותים ממנה', 'כפולה', 'עין לראות, ועין מים (מעיין), כמו עין גדי.'],
    ['חבר', 'רחב מבולבל, ותמיד לצדך', 'אנגרמה', 'ר-ח-ב בסדר אחר = ח-ב-ר.'],
    ['תורה', 'עמדתם בתור, הוספתם ה"א, וקיבלתם מה ללמוד', 'צירוף', 'תור + ה = תורה.'],
    ['ים', 'מי חוזר אחורה? הוא מלוח', 'הפוך', '"מי" קוראים מהסוף: י-ם.'],
    ['דוד', 'מלך, אח של אבא, ומחמם מים למקלחת', 'משולשת', 'דוד המלך, הדוד מהמשפחה, ודוד השמש על הגג.'],
    ['מכבי', 'ראשי התיבות של "מי כמוכה באלים" ועוד שם הקודש: כינוי ליהודה', 'ראשי תיבות', 'מ-כ-ב-י: מי, כמוכה, באלים, והי׳ של שם ה׳.'],
    ['שמן', 'הדליקו בו את המנורה, והוא לא בדיוק רזה', 'כפולה', 'שמן זית למנורה, ו"שמן" = לא רזה.'],
    ['נס', 'פלא, וגם דגל בלשון המקרא', 'כפולה', 'נס = דבר פלא, וגם "שאו נס", כלומר הרימו דגל.'],
    ['פרח', 'צומח בגינה, וגם עף לו', 'כפולה', 'פרח בגינה, ו"פָּרַח" = עף והסתלק.'],
    ['כלב', 'כמו לב, ונובח', 'צירוף', 'כ (= כמו) + לב = כלב.'],
    ['ברק', 'מבזיק בסערה, ויצא למלחמה עם דבורה', 'כפולה', 'ברק בשמיים, וברק בן אבינועם, שלחם לצד דבורה הנביאה.'],
    ['עט', 'התנפל על הטרף, וכותבים בו', 'כפולה', '"עט" = התנפל (העיט עט על הטרף), ועט לכתיבה.'],
    ['אש', 'שא! חזור אחורה, זה שורף', 'הפוך', '"שא" (= הרם) מהסוף: א-ש.'],
    ['גל', 'לוג, מידה עתיקה בלי וי"ו, חוזר ומתנפץ על החוף', 'הפוך', 'לג (הלוג, מידה מימי המקדש) מהסוף = ג-ל.'],
    ['נר', 'רן חוזר אחורה, ומאיר בחנוכה', 'הפוך', '"רן" (שר בשמחה) מהסוף = נ-ר.'],
    ['שיר', 'ישר מבולבל, והמקהלה שרה אותו', 'אנגרמה', 'י-ש-ר בסדר אחר = ש-י-ר.'],
    ['כתר', 'כמו מחפש, וחובשים אותו מלכים', 'צירוף', 'כ (= כמו) + תר (= מחפש) = כתר.'],
    ['מטריה', 'גשם, ואחריו סוף של "אנייה": כך לא נרטבים', 'צירוף', 'מטר (= גשם) + יה (שתי האותיות האחרונות של "אנייה") = מטריה.'],
    ['מחשב', 'מוח (בכתיב חסר) שחזר הביתה, ועובד מול מסך', 'צירוף', 'מח (= מוח) + שב (= חזר) = מחשב.'],
    ['פרפר', 'שני שוורים מעופפים בין הפרחים', 'צירוף', 'פר + פר = פרפר.'],
    ['תלמיד', 'גבעה עתיקה, ועכשיו! הוא לומד', 'צירוף', 'תל (גבעה עתיקה) + מיד (= עכשיו) = תלמיד.'],
    ['ברכה', 'אומרים אותה לפני האוכל, ושוחים בה', 'כפולה', 'ברכה על האוכל, וברכת מים.'],
    ['מגדל', 'בניין גבוה, וגם מה שהחקלאי עושה לעגבניות', 'כפולה', 'מִגְדָּל גבוה, והחקלאי מְגַדֵּל עגבניות.'],
    ['חלום', 'מחול מבולבל רואים בשינה', 'אנגרמה', 'מ-ח-ו-ל בסדר אחר = ח-ל-ו-ם.'],
    ['תנור', 'נותר מבולבל, ואופים בו עוגה', 'אנגרמה', 'נ-ו-ת-ר בסדר אחר = ת-נ-ו-ר.'],
    ['דלת', 'נכנסים דרכה, וזה גם שם האות הרביעית', 'כפולה', 'דלת הבית, והאות ד נקראת "דלת".'],
    ['חמה', 'שמש, וגם אמא של בעלה', 'כפולה', 'חמה היא השמש, וחמה היא גם אם הבעל.'],
    ['תמר', 'פרי מתוק שגדל על דקל, וגם שם של בת', 'כפולה', 'פרי התמר, והשם תמר.'],
    ['נח', 'בנה תיבה, ואחרי העבודה נרגע', 'כפולה', 'נֹחַ שבנה את התיבה, ו"נָח" = נרגע.'],
    ['שולחן', 'שולח ונו"ן סופית, ואוכלים עליו', 'צירוף', 'שולח + ן = שולחן.'],
    ['רכבת', 'רכב ובסוף תי"ו, נוסעת על פסים', 'צירוף', 'רכב + ת = רכבת.'],
    ['לוח', 'חול מבולבל, וכותבים עליו בכיתה', 'אנגרמה', 'ח-ו-ל בסדר אחר = ל-ו-ח.'],
    ['אדם', 'אדום בלי וי"ו, ועשוי מעפר', 'חיסור', 'מוציאים את ה-ו מ"אדום" ומקבלים אדם, שנברא מן האדמה.'],
    ['ילד', 'דלי מבולבל, ועדיין קטן', 'אנגרמה', 'ד-ל-י בסדר אחר = י-ל-ד.'],
    ['נחש', 'זוחל בעשב, וגם: נסו לענות בלי לדעת', 'כפולה', 'נָחָשׁ שזוחל, ו"נַחֵשׁ!" = תנחשו.'],
    ['קשת', 'מופיעה אחרי הגשם, ויורים בה חצים', 'כפולה', 'הקשת בענן, והקשת של הקשת והחץ.'],
    ['גמל', 'גם לבן בהתחלה: ספינת המדבר', 'צירוף', 'גם + ל (האות הראשונה של "לבן") = גמל.']
  ];
  var KIND_HELP = { 'כפולה': 'שתי הגדרות לאותה מילה', 'משולשת': 'שלוש הגדרות לאותה מילה', 'אנגרמה': 'מסדרים מחדש את האותיות', 'פלינדרום': 'נקרא אותו דבר משני הכיוונים', 'הפוך': 'קוראים מהסוף להתחלה', 'צירוף': 'מחברים חלקים למילה אחת', 'עטיפה': 'מילה אחת בתוך אחרת', 'ראשי תיבות': 'האותיות הראשונות של כמה מילים', 'חיסור': 'מורידים אות' };

  var FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }, TOFIN = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
  function norm(s) { return s.replace(/[ךםןףץ]/g, function (c) { return FIN[c]; }); }

  // ---------- בניית הלוח ----------
  // עוברים על המועמדות לפי הסדר, ומכניסים כל מילה שמצטלבת עם מה שכבר בלוח, עד want מילים.
  // הלוח מוגבל ל-9 עמודות ו-11 שורות, כדי שייכנס יפה במסך של טלפון.
  var MAXC = 9, MAXR = 11;
  function build(cands, want, rnd) {
    var best = null;
    for (var attempt = 0; attempt < 24; attempt++) {
      var order = attempt ? CH.shuffle(cands.slice(0, Math.max(want * 3, 18)), rnd) : cands.slice();
      var grid = {}, placed = [], used = {}, ext = { r0: 0, r1: 0, c0: 0, c1: 0 }, crosses = 0;
      var get = function (r, c) { return grid[r + ',' + c]; };
      var can = function (w, r, c, h) {
        var dr = h ? 0 : 1, dc = h ? 1 : 0, cross = 0;
        var r1 = r + dr * (w.length - 1), c1 = c + dc * (w.length - 1);
        if (Math.max(ext.c1, c1) - Math.min(ext.c0, c) + 1 > MAXC || Math.max(ext.r1, r1) - Math.min(ext.r0, r) + 1 > MAXR) return -1;
        if (get(r - dr, c - dc) || get(r + dr * w.length, c + dc * w.length)) return -1;
        for (var i = 0; i < w.length; i++) {
          var rr = r + dr * i, cc = c + dc * i, e = get(rr, cc);
          if (e) { if (e !== w[i]) return -1; cross++; }
          else if (get(rr + dc, cc + dr) || get(rr - dc, cc - dr)) return -1;
        }
        return cross === w.length ? -1 : cross;
      };
      var put = function (x, r, c, h) {
        var w = norm(x[0]);
        for (var i = 0; i < w.length; i++) { var rr = h ? r : r + i, cc = h ? c + i : c; grid[rr + ',' + cc] = w[i]; ext.r0 = Math.min(ext.r0, rr); ext.r1 = Math.max(ext.r1, rr); ext.c0 = Math.min(ext.c0, cc); ext.c1 = Math.max(ext.c1, cc); }
        placed.push({ x: x, w: w, r: r, c: c, h: h }); used[x[0]] = 1;
      };
      var first = order.filter(function (x) { return x[0].length >= 4; })[0] || order[0];
      put(first, 0, 0, true);
      var progress = true;
      while (placed.length < want && progress) {
        progress = false;
        for (var k = 0; k < order.length && !progress; k++) {
          if (used[order[k][0]]) continue;
          var w = norm(order[k][0]), opts = [];
          placed.forEach(function (p) {
            for (var i = 0; i < p.w.length; i++) for (var j = 0; j < w.length; j++) {
              if (p.w[i] !== w[j]) continue;
              var h = !p.h, pr = p.h ? p.r : p.r + i, pc = p.h ? p.c + i : p.c;
              var r = h ? pr : pr - j, c = h ? pc - j : pc, s = can(w, r, c, h);
              if (s > 0) opts.push([s + rnd() * .5, r, c, h, s]);
            }
          });
          if (opts.length) { opts.sort(function (a, b) { return b[0] - a[0]; }); put(order[k], opts[0][1], opts[0][2], opts[0][3]); crosses += opts[0][4]; progress = true; }
        }
      }
      var rows = ext.r1 - ext.r0 + 1, cols = ext.c1 - ext.c0 + 1;
      var downs = placed.filter(function (p) { return !p.h; }).length;
      var score = placed.length * 100 + crosses * 8 + Math.min(downs, placed.length - downs) * 15 - rows * 2;
      if (!best || score > best.score) best = { score: score, placed: placed, R0: ext.r0, C0: ext.c0, rows: rows, cols: cols };
      if (placed.length >= want && crosses > want) break;
    }
    best.placed.forEach(function (p) { p.r -= best.R0; p.c -= best.C0; });
    // מספור: לפי שורה, ובכל שורה מימין לשמאל (עמודה 0 בצד ימין)
    var starts = {}, n = 0;
    best.placed.slice().sort(function (a, b) { return a.r - b.r || a.c - b.c; }).forEach(function (p) { var k = p.r + ',' + p.c; if (!starts[k]) starts[k] = ++n; p.n = starts[k]; });
    best.starts = starts;
    return best;
  }

  // ---------- חידות ----------
  // השלבים: עוברים על המאגר בסדר קבוע, וכל חידה לוקחת 6 מילים שמצטלבות. אותו סדר לכל המשחקים.
  // האתגר היומי: 6 הגדרות לפי התאריך.
  var LEVELS = (function () {
    var left = CH.shuffle(POOL, CH.rng('tash-levels-v1')), out = [], rnd = CH.rng('tash-levels-grid-v1');
    while (left.length >= 5 && out.length < 20) {
      var b = build(left, 6, rnd);
      if (b.placed.length < 5) break;
      var used = {}; b.placed.forEach(function (p) { used[p.x[0]] = 1; });
      out.push(b);
      left = left.filter(function (x) { return !used[x[0]]; });
    }
    return out;
  })();
  var data = CH.load(G); data.lvl = data.lvl || 1; data.done = data.done || {};
  var P = null, cells = {}, vals = {}, rev = {}, cur = null, dirH = true, won = false, mode = 'daily', level = 1, hints = 0, started = false;
  var clock = CH.clock($('ts-time'));
  function say(t) { $('ts-msg').textContent = t || ''; }
  function persist() {
    var s = CH.load(G); s.lvl = data.lvl; s.done = data.done;
    s.cur = won ? null : { key: P.key, v: vals, rv: Object.keys(rev), sec: clock.sec, hints: hints };
    data.cur = s.cur; CH.save(G, s);
  }

  function start(m, lv) {
    if (m !== 'vs') CH.vsReset();
    mode = m; level = lv || 1; won = false; hints = 0; started = false; vals = {}; rev = {}; cur = null; $('ts-win').innerHTML = ''; say('');
    var seed;
    if (m === 'daily') { seed = 'tash-daily-' + CH.today(); P = build(CH.shuffle(POOL, CH.rng(seed)), 6, CH.rng(seed + '-grid')); }
    else if (m === 'vs') { if (lv.k === 'l') { level = +lv.l; seed = 'tash-level-' + level; P = LEVELS[level - 1]; } else { level = 1; seed = 'tash-daily-' + lv.d; P = build(CH.shuffle(POOL, CH.rng(seed)), 6, CH.rng(seed + '-grid')); } }
    else { seed = 'tash-level-' + level; P = LEVELS[level - 1]; }
    P.key = seed;
    cells = {};
    P.placed.forEach(function (p) { for (var i = 0; i < p.w.length; i++) { var k = (p.h ? p.r : p.r + i) + ',' + (p.h ? p.c + i : p.c); cells[k] = cells[k] || { ch: p.w[i], words: [], end: false }; cells[k].words.push(p); if (i === p.w.length - 1) cells[k].end = true; } });
    var sv = data.cur;
    if (sv && sv.key === seed) { vals = sv.v || {}; (sv.rv || []).forEach(function (k) { rev[k] = 1; }); hints = sv.hints || 0; clock.set(sv.sec); } else clock.set(0);
    clock.on = true;
    $('ts-label').textContent = m === 'vs' ? 'אתגר מחבר' : m === 'daily' ? 'האתגר היומי · ' + CH.shortDate() : 'חידה ' + level + ' מתוך ' + LEVELS.length;
    var st = CH.stats(G);
    $('ts-today').hidden = !(m === 'daily' && st.doneToday);
    if (m === 'daily' && st.doneToday) $('ts-today').textContent = 'כבר פתרתם את התשחץ של היום ב-' + CH.fmt(st.todaySec) + ' ✓ רצף: ' + st.streak + '. מחר מחכות הגדרות חדשות.';
    select(P.placed.slice().sort(function (a, b) { return a.n - b.n; })[0], 0);
    persist();
  }

  // ---------- ציור ----------
  function wordOk(p) { for (var i = 0; i < p.w.length; i++) { var k = (p.h ? p.r : p.r + i) + ',' + (p.h ? p.c + i : p.c); if (norm(vals[k] || '') !== p.w[i]) return false; } return true; }
  function keysOf(p) { var a = []; for (var i = 0; i < p.w.length; i++) a.push((p.h ? p.r : p.r + i) + ',' + (p.h ? p.c + i : p.c)); return a; }
  function shown(k) { var v = vals[k] || ''; return v && cells[k].end && TOFIN[v] ? TOFIN[v] : v; }
  function draw() {
    var g = $('ts-grid'), W = Math.min((g.parentNode.clientWidth || window.innerWidth - 32), 520); if (W < 240) W = 340;
    var size = Math.max(28, Math.min(48, Math.floor((W - (P.cols - 1) * 2) / P.cols)));
    g.style.gridTemplateColumns = 'repeat(' + P.cols + ',' + size + 'px)';
    g.style.gridAutoRows = size + 'px'; g.style.fontSize = Math.round(size * 0.55) + 'px';
    var curKeys = cur ? keysOf(cur.p) : [], okKeys = {};
    P.placed.forEach(function (p) { if (wordOk(p)) keysOf(p).forEach(function (k) { okKeys[k] = 1; }); });
    var h = '';
    for (var r = 0; r < P.rows; r++) for (var c = 0; c < P.cols; c++) {
      var k = r + ',' + c;
      if (!cells[k]) { h += '<div class="e"></div>'; continue; }
      var cls = (okKeys[k] ? 'ok ' : '') + (rev[k] ? 'rev ' : '') + (curKeys.indexOf(k) > -1 ? 'word ' : '') + (cur && curKeys[cur.i] === k ? 'cur' : '');
      h += '<button type="button" data-k="' + k + '" class="' + cls + '" aria-label="' + 'שורה ' + (r + 1) + ' טור ' + (c + 1) + (P.starts[k] ? ', מספר ' + P.starts[k] : '') + ': ' + (shown(k) || 'ריק') + '">' + (P.starts[k] ? '<sup>' + P.starts[k] + '</sup>' : '') + shown(k) + '</button>';
    }
    g.innerHTML = h;
    function li(p) {
      var ok = wordOk(p);
      return '<li data-n="' + p.n + '" data-h="' + (p.h ? 1 : 0) + '" class="' + (cur && cur.p === p ? 'on ' : '') + (ok ? 'ok' : '') + '"><b>' + p.n + '.</b> ' + p.x[1] + ' <small>(' + p.w.length + ')</small>' +
        (ok ? '<span class="why">✓ ' + p.x[0] + ' · ' + p.x[2] + ': ' + p.x[3] + '</span>' : '') + '</li>';
    }
    var acr = P.placed.filter(function (p) { return p.h; }).sort(function (a, b) { return a.n - b.n; }), dn = P.placed.filter(function (p) { return !p.h; }).sort(function (a, b) { return a.n - b.n; });
    $('ts-across').innerHTML = acr.map(li).join(''); $('ts-down').innerHTML = dn.map(li).join('');
    $('ts-down-h').hidden = !dn.length;
    $('ts-cur').innerHTML = cur ? '<b>' + cur.p.n + ' ' + (cur.p.h ? 'מאוזן' : 'מאונך') + ':</b> ' + cur.p.x[1] + ' <small>(' + cur.p.w.length + ')</small>' : '';
  }
  function select(p, i) { cur = { p: p, i: i || 0 }; dirH = p.h; draw(); }

  // ---------- קלט ----------
  $('ts-grid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-k]'); if (!b || won) return;
    var k = b.getAttribute('data-k'), ws = cells[k].words;
    var p = ws.length > 1 && cur && keysOf(cur.p).indexOf(k) > -1 && cur.i === keysOf(cur.p).indexOf(k) ? ws.filter(function (x) { return x !== cur.p; })[0] : (ws.filter(function (x) { return x.h === dirH; })[0] || ws[0]);
    select(p, keysOf(p).indexOf(k));
  });
  function onList(e) {
    var li = e.target.closest('li'); if (!li || won) return;
    var n = +li.getAttribute('data-n'), h = li.getAttribute('data-h') === '1';
    var p = P.placed.filter(function (x) { return x.n === n && x.h === h; })[0];
    var ks = keysOf(p), first = 0; for (var i = 0; i < ks.length; i++) if (!vals[ks[i]]) { first = i; break; }
    select(p, first); $('ts-grid').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  $('ts-across').addEventListener('click', onList); $('ts-down').addEventListener('click', onList);
  function type(ch) {
    if (won || !cur) return;
    if (!started) { started = true; CH.used(TOOL, 'start', { mode: mode }); }
    var ks = keysOf(cur.p), k = ks[cur.i];
    if (!rev[k] || norm(vals[k] || '') !== cells[k].ch) vals[k] = norm(ch);
    var wasOk = wordOk(cur.p);
    if (cur.i < ks.length - 1) cur.i++;
    draw(); persist();
    if (wasOk) say('✓ ' + cur.p.x[0] + '! ' + cur.p.x[3]);
    else if (ks.every(function (x) { return vals[x]; })) say('המילה מלאה, אבל משהו לא מסתדר. נסו שוב 🙂');
    else say('');
    if (P.placed.every(wordOk)) finish();
  }
  function back() {
    if (won || !cur) return;
    var ks = keysOf(cur.p);
    if (vals[ks[cur.i]] && !(rev[ks[cur.i]])) delete vals[ks[cur.i]];
    else if (cur.i > 0) { cur.i--; if (!rev[ks[cur.i]]) delete vals[ks[cur.i]]; }
    draw(); persist();
  }
  $('ts-kb').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var k = b.getAttribute('data-l'); if (k === 'del') back(); else type(k); });
  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (/^[א-ת]$/.test(e.key)) { type(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { back(); e.preventDefault(); }
  });

  // ---------- רמז, גילוי, בדיקה ----------
  $('ts-hint').onclick = function () {
    if (won || !cur) return;
    var ks = keysOf(cur.p), k = ks.filter(function (x) { return norm(vals[x] || '') !== cells[x].ch; })[0]; if (!k) return;
    vals[k] = cells[k].ch; rev[k] = 1; hints++; cur.i = ks.indexOf(k);
    CH.used(TOOL, 'hint', { mode: mode }); say('💡 גיליתי אות אחת');
    draw(); persist(); if (P.placed.every(wordOk)) finish();
  };
  $('ts-reveal').onclick = function () {
    if (won || !cur) return;
    keysOf(cur.p).forEach(function (k) { if (norm(vals[k] || '') !== cells[k].ch) { vals[k] = cells[k].ch; rev[k] = 1; hints++; } });
    CH.used(TOOL, 'reveal', { mode: mode }); say('✓ ' + cur.p.x[0] + ': ' + cur.p.x[3]);
    draw(); persist(); if (P.placed.every(wordOk)) finish();
  };
  $('ts-check').onclick = function () {
    if (won) return;
    var bad = Object.keys(vals).filter(function (k) { return vals[k] && norm(vals[k]) !== cells[k].ch; });
    CH.used(TOOL, 'check', { mode: mode });
    if (!bad.length) { say('אין טעויות עד עכשיו ✓'); return; }
    bad.forEach(function (k) { var b = $('ts-grid').querySelector('[data-k="' + k + '"]'); if (b) b.classList.add('bad'); });
    setTimeout(draw, 2000);
    say(bad.length === 1 ? 'אות אחת לא נכונה (באדום)' : bad.length + ' אותיות לא נכונות (באדום)');
  };

  // ---------- ניצחון ----------
  function finish() {
    if (won) return; won = true; clock.on = false; cur = null; draw();
    var daily = mode === 'daily', already = daily && CH.stats(G).doneToday;
    var st = CH.record(G, daily && !already, clock.sec, hints);
    if (mode === 'level') { data.done[level] = 1; data.lvl = Math.max(data.lvl, level + 1); }
    persist(); drawLevels();
    CH.used(TOOL, 'solve', { mode: mode, level: level, sec: clock.sec, hints: hints });
    var share = '🧩 תשחץ · ' + (daily ? 'אתגר יומי #' + CH.dayNum() : mode === 'vs' ? 'אתגר מחבר' : 'חידה ' + level) + '\n' + P.placed.map(function () { return '🟩'; }).join('') + '\n⏱ ' + CH.fmt(clock.sec) + (hints ? ' · 💡 ' + hints + ' רמזים' : ' · בלי רמזים') + (daily && st.streak ? '\n🔥 רצף ' + CH.days(st.streak) : '') + '\nשש הגדרות, ראש אחד. תנסו? 😉';
    var why = '<ol class="ts-why-list">' + P.placed.slice().sort(function (a, b) { return a.n - b.n; }).map(function (p) { return '<li><b>' + p.x[0] + '</b> · ' + p.x[2] + ': ' + p.x[3] + '</li>'; }).join('') + '</ol>';
    var next = [];
    if (mode === 'level' && level < LEVELS.length) next.push({ label: 'לחידה ' + (level + 1) + ' ←', fn: function () { start('level', level + 1); drawLevels(); } });
    else if (mode === 'daily') next.push({ label: 'לחידות הנוספות ←', fn: function () { tab('level'); } });
    CH.win({ tool: TOOL, el: $('ts-win'), daily: daily && !already, stats: st,
      title: hints ? 'פתרתם! 🎉' : 'פתרתם בלי רמזים! 🎉',
      line: '<span>⏱ <b>' + CH.fmt(clock.sec) + '</b></span>' + (hints ? '<span>💡 ' + hints + '</span>' : ''),
      extra: (mode === 'level' && level >= LEVELS.length ? '<p class="ch-hint">פתרתם את כל החידות שיש כרגע. התשחץ היומי ממשיך כל יום.</p>' : '') + '<details class="ch-how" open><summary>איך כל הגדרה עובדת</summary>' + why + '</details>',
      share: share, next: next,
      vs: /^tash-level-/.test(P.key) ? { g: 'tash', k: 'l', l: level } : { g: 'tash', k: 'd', d: P.key.slice(11) }, vsMine: { t: clock.sec, h: hints, q: 'time' }, vsWhat: 'אותו תשחץ',
      vsMsg: '⚔️ אתגר בתשחץ: פתרתי את התשחץ הזה ב-' + CH.fmt(clock.sec) + (hints ? ' (עם ' + hints + ' רמזים)' : '') + '. תצליחו מהר יותר?' });
  }

  // ---------- לשוניות ----------
  function drawLevels() {
    var h = '';
    for (var l = 1; l <= LEVELS.length; l++) { var open = l <= data.lvl; h += '<button type="button" data-l="' + l + '"' + (open ? '' : ' disabled') + ' class="' + (data.done[l] ? 'done' : '') + (mode === 'level' && level === l ? ' on' : '') + '">' + (open ? (data.done[l] ? '✓' + l : l) : '🔒') + '</button>'; }
    $('ts-levels').innerHTML = h;
    $('ts-levels').querySelectorAll('button').forEach(function (b) { b.onclick = function () { start('level', +b.getAttribute('data-l')); drawLevels(); }; });
  }
  function tab(m) {
    CH.vsReset();
    document.querySelectorAll('#ts-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === m); });
    $('ts-lvlbox').hidden = m !== 'level';
    if (m === 'daily') start('daily');
    else { var l = data.cur && /^tash-level-(\d+)$/.test(data.cur.key) ? +RegExp.$1 : Math.min(data.lvl, LEVELS.length); start('level', l); drawLevels(); }
  }
  document.querySelectorAll('#ts-tabs button').forEach(function (b) { b.onclick = function () { tab(b.getAttribute('data-m')); }; });
  var rs; window.addEventListener('resize', function () { clearTimeout(rs); rs = setTimeout(function () { if (P) draw(); }, 200); });
  var V = CH.vsIn && CH.vsIn.g === 'tash' && ((CH.vsIn.k === 'l' && LEVELS[CH.vsIn.l - 1]) || (CH.vsIn.k === 'd' && /^\d{4}-\d\d-\d\d$/.test(CH.vsIn.d))) ? CH.vsIn : null;
  if (V && V.k === 'd' && V.d === CH.today()) { tab('daily'); CH.vsStart(TOOL, 'התשחץ הזה'); }
  else if (V) { document.querySelectorAll('#ts-tabs button').forEach(function (b) { b.setAttribute('aria-selected', 'false'); }); start('vs', V); CH.vsStart(TOOL, 'התשחץ הזה'); }
  else tab(data.cur && /^tash-level-/.test(data.cur.key) ? 'level' : 'daily');
})();
