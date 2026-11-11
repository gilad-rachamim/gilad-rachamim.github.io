// כלים ללימודים – מחולל דפי עבודה (/limudim/dapim/).
// המורה בוחרת כיתה, נושא, סוג דף (הקנייה / חזרה), דקות, רמה וכמה עזרה – ומקבלת דף להדפסה וקישור לדף דיגיטלי.
// הנושאים והתרגילים באים מ-limudim-math.js (window.MX.T), ועוד שני נושאי "גילוי" שנכתבו כאן: טרינום, ופרבולה עם טבלת ערכים.
// אותו קישור = אותו דף בדיוק (מחולל מספרים עם זרע), כך שדף התשובות והדף הדיגיטלי תואמים לדף המודפס.
(function () {
  'use strict';
  var MX = window.MX, app = document.getElementById('dp-app');
  if (!MX || !app) return;
  var $ = function (id) { return document.getElementById(id); };
  var BASE = 'https://hakelim.com/limudim/dapim/';
  var parseVal = MX.parseVal, gcd = MX.gcd;
  function load(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var lastEv = {};
  function used(how, extra) { // לא יותר מאירוע אחד מכל סוג בחצי דקה
    var now = Date.now(); if (lastEv[how] && now - lastEv[how] < 30000) return; lastEv[how] = now;
    if (window.toolUsed) window.toolUsed('dapim', Object.assign({ how: how }, extra || {}));
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function R(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function nz(a, b) { var x; do { x = R(a, b); } while (x === 0); return x; }
  function num(n) { return typeof n === 'number' && n < 0 ? '−' + (-n) : String(n); }
  function par(n) { return n < 0 ? '(' + num(n) + ')' : num(n); }
  function M(s) { return '<mark>' + s + '</mark>'; }
  function he(s) { return '<span class="he" dir="rtl">' + s + '</span>'; }
  function mt(s) { return '<bdi dir="ltr">' + s + '</bdi>'; } // מתמטיקה בתוך משפט בעברית
  function rl(s) { return '<span class="dp-r" dir="rtl">' + s + '</span>'; } // שורה בעברית בתוך אזור של מתמטיקה
  function heB(s) { return '<div class="he" dir="rtl">' + s + '</div>'; }
  function quadS(a, b, c) {
    var s = (a === 1 ? '' : a === -1 ? '−' : num(a)) + 'x²';
    if (b) s += (b < 0 ? ' − ' : ' + ') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'x';
    if (c) s += (c < 0 ? ' − ' : ' + ') + Math.abs(c);
    return s;
  }
  function brk(n) { return '(x ' + (n < 0 ? '− ' + (-n) : '+ ' + n) + ')'; }
  // מחולל מספרים עם זרע: בזמן בניית הדף Math.random מוחלף, כדי שאותו קישור ייתן תמיד אותו דף
  function seeded(seed, fn) {
    var orig = Math.random, s = seed >>> 0;
    Math.random = function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    try { return fn(); } finally { Math.random = orig; }
  }

  // =====================================================================
  //  שני נושאי גילוי שנכתבו לדפי העבודה
  // =====================================================================
  var PSVG = '<svg viewBox="0 0 240 190" class="dp-psvg" role="img" aria-label="פרבולה עם ציר סימטריה וקודקוד"><path d="M20 150 H225 M60 12 V180" stroke="currentColor" stroke-width="1.2" opacity=".55"/><path d="M62 22 Q130 262 198 22" fill="none" stroke="#3f8fc4" stroke-width="3"/><path d="M130 12 V182" stroke="#c9972f" stroke-width="2" stroke-dasharray="6 5"/><circle cx="130" cy="142" r="5.5" fill="#c9972f"/><text x="136" y="165" font-size="13" fill="currentColor">קודקוד</text><text x="134" y="24" font-size="13" fill="currentColor">ציר סימטריה</text><text x="222" y="165" font-size="12" fill="currentColor">x</text><text x="48" y="20" font-size="12" fill="currentColor">y</text></svg>';
  function tblHtml(xs, ys, cls) {
    return '<table class="dp-tbl ' + (cls || '') + '" dir="ltr"><tr><th>x</th>' + xs.map(function (x) { return '<td>' + num(x) + '</td>'; }).join('') + '</tr><tr><th>y</th>' + ys.map(function (y) { return '<td>' + y + '</td>'; }).join('') + '</tr></table>';
  }
  var EXTRA = [
    { id: 'trinom', em: '🧩', name: 'פירוק טרינום', grade: 'כיתות ט׳–י׳',
      lesson: [
        { m: 'x² + 5x + 6', t: 'טרינום הוא ביטוי עם שלושה איברים: איקס בריבוע, איקס, ומספר. לפרק אותו זה לכתוב אותו כמכפלה של שני סוגריים.' },
        { m: '(x + 2)(x + 3) = x² + ' + M('5') + 'x + ' + M('6'), t: 'נזכרים בפתיחת סוגריים. כשפותחים את הסוגריים האלה מקבלים את הטרינום שלנו. שימו לב: חמש הוא הסכום של שתיים ושלוש, ושש הוא המכפלה שלהם.' },
        { m: heB('<ol class="mx-rules"><li>שני מספרים ש<b>המכפלה</b> שלהם היא המספר החופשי</li><li>ו<b>הסכום</b> שלהם הוא המקדם של x</li></ol>'), t: 'לכן, כדי לפרק טרינום מחפשים שני מספרים: המכפלה שלהם היא המספר החופשי, והסכום שלהם הוא המספר שלפני האיקס.' },
        { m: '2 · 3 = 6 ✓ &nbsp; 2 + 3 = 5 ✓', t: 'בטרינום שלנו: איזה שני מספרים נותנים מכפלה שש וסכום חמש? שתיים ושלוש.' },
        { m: 'x² + 5x + 6 = <b class="ok">(x + 2)(x + 3)</b>', t: 'ואת שני המספרים שמצאנו כותבים בתוך הסוגריים. זה הפירוק.' },
        { m: 'x² − x − 6 = <b class="ok">(x − 3)(x + 2)</b>', t: 'כשהמספר החופשי שלילי, אחד המספרים חיובי והשני שלילי. כאן: מינוס שלוש ושתיים. המכפלה מינוס שש, והסכום מינוס אחת.' },
        { m: he('בדיקה: פותחים סוגריים וחוזרים לטרינום.'), t: 'ותמיד אפשר לבדוק: פותחים את הסוגריים, ורואים שחזרנו לטרינום שהתחלנו ממנו.' }
      ],
      gen: function (lv) {
        var m, n;
        do {
          if (lv === 1) { m = R(1, 9); n = R(1, 9); } else { m = nz(-9, 9); n = nz(-9, 9); }
        } while (m === n || m + n === 0 || (lv > 1 && m > 0 && n > 0));
        var b = m + n, c = m * n, big = Math.max(m, n), small = Math.min(m, n), tri = quadS(1, b, c);
        var st = [
          { show: tri, q: 'מה המכפלה שמחפשים? (המספר החופשי, עם הסימן)', a: c, hint: 'המספר החופשי הוא המספר שבלי x. אם לפניו מינוס, הוא שלילי.' },
          { show: tri, q: 'ומה הסכום שמחפשים? (המספר שלפני x, עם הסימן)', a: b, hint: 'אם כתוב רק x, המקדם הוא 1. אם כתוב −x, המקדם הוא −1.' },
          { show: '? · ? = ' + num(c) + ' &nbsp; ? + ? = ' + num(b), q: 'מצאו את שני המספרים. מה הגדול מביניהם?', a: big, hint: 'עוברים על זוגות שמכפלתם ' + num(c) + ', ובודקים לאיזה זוג יש סכום ' + num(b) + '.' },
          { show: num(big) + ' · ? = ' + num(c), q: 'ומה המספר השני?', a: small, hint: mt(num(c) + ' ÷ ' + par(big)) }
        ];
        var fin = tri + ' = ' + brk(big) + brk(small);
        if (lv === 3) {
          st.push({ show: brk(big) + brk(small) + ' = 0', q: 'פותרים את המשוואה: מכפלה שווה אפס כשאחד הגורמים אפס. מה הפתרון הגדול?', a: Math.max(-big, -small), hint: 'מה צריך להציב ב-x כדי שסוגריים יתאפסו? המספר הנגדי למה שבסוגריים.' });
          st.push({ show: brk(big) + brk(small) + ' = 0', q: 'ומה הפתרון הקטן?', a: Math.min(-big, -small), hint: 'הסוגריים השניים מתאפסים במספר הנגדי.' });
          fin += ' · x = ' + num(Math.min(-big, -small)) + ', ' + num(Math.max(-big, -small));
        }
        return { ex: tri + '<br>' + he(lv === 3 ? 'מפרקים לגורמים, ופותרים את המשוואה כשהביטוי שווה אפס.' : 'מפרקים לגורמים: מכפלה של שני סוגריים.'), steps: st, fin: fin };
      } },
    { id: 'parabola-tavla', em: '🪞', name: 'פרבולה: טבלת ערכים, ציר סימטריה וקודקוד', grade: 'כיתות ט׳–י׳',
      lesson: [
        { m: 'y = x² − 4x + 3', t: 'פונקציה ריבועית היא פונקציה שיש בה איקס בריבוע. הגרף שלה נקרא פרבולה, והוא נראה כמו קערה או כמו קשת.' },
        { m: PSVG, t: 'לכל פרבולה יש ציר סימטריה: קו ישר שמחלק אותה לשני חצאים זהים, כמו מראה. הנקודה שבה הפרבולה מסתובבת נקראת קודקוד, והיא תמיד על ציר הסימטריה.' },
        { m: tblHtml([0, 1, 2, 3, 4], ['3', '?', '?', '?', '?']), t: 'איך מגלים אותם? בונים טבלת ערכים: בוחרים כמה ערכים של איקס, מציבים כל אחד בפונקציה, ומחשבים את ה-y.' },
        { m: 'x = 1 → y = 1² − 4·1 + 3 = ' + M('0'), t: 'למשל, כשאיקס שווה אחת: אחת בריבוע, פחות ארבע כפול אחת, ועוד שלוש. יוצא אפס.' },
        { m: tblHtml([0, 1, 2, 3, 4], ['3', '0', '<b class="ok">−1</b>', '0', '3']), t: 'עכשיו מסתכלים על שורת ה-y: שלוש, אפס, מינוס אחת, אפס, שלוש. הערכים חוזרים משני הצדדים, כמו במראה.' },
        { m: rl('ציר הסימטריה: ' + mt('x = 2') + ' &nbsp;·&nbsp; הקודקוד: ' + mt('(2, −1)')), t: 'שני איקסים שיש להם אותו y נמצאים באותו מרחק מציר הסימטריה. הציר בדיוק באמצע ביניהם: איקס שווה שתיים. והנקודה שעל הציר היא הקודקוד: שתיים, מינוס אחת.' },
        { m: rl(mt('a > 0') + ' ∪ מינימום &nbsp;·&nbsp; ' + mt('a < 0') + ' ∩ מקסימום'), t: 'אם המקדם של איקס בריבוע חיובי, הפרבולה מחייכת והקודקוד הוא הנקודה הכי נמוכה, מינימום. אם הוא שלילי, הפרבולה עצובה והקודקוד הוא הכי גבוה, מקסימום.' }
      ],
      gen: function (lv) {
        var a = lv === 1 ? 1 : lv === 2 ? pick([1, -1]) : pick([2, -1, -2]);
        var xv = lv === 1 ? R(1, 3) : nz(-3, 3), c = R(-4, 6), b = -2 * a * xv;
        var f = function (x) { return a * x * x + b * x + c; }, yv = f(xv), xs = [], i;
        for (i = xv - (lv === 1 ? 2 : 3); i <= xv + 2; i++) xs.push(i);
        var eq = 'y = ' + quadS(a, b, c);
        var st = xs.map(function (x, j) {
          return { tbl: j, show: 'x = ' + num(x), q: 'y = ?', a: f(x), hint: 'מציבים ' + mt('x = ' + num(x)) + '. קודם הריבוע: ' + mt(par(x) + '² = ' + x * x) + (a !== 1 ? ', וכופלים ב-' + mt(par(a)) : '') + '. אחר כך ' + mt(par(b) + ' · ' + par(x) + ' = ' + num(b * x)) + ', ומוסיפים ' + mt(par(c)) + '.' };
        });
        st.push({ show: rl('מחפשים שני ערכי ' + mt('x') + ' שיש להם אותו ' + mt('y')), q: 'מה ציר הסימטריה? ' + mt('x = ?'), a: xv, hint: 'מוצאים בטבלה שני x עם אותו y. ציר הסימטריה בדיוק באמצע ביניהם.' });
        st.push({ show: rl('הקודקוד נמצא על ציר הסימטריה: ' + mt('(' + num(xv) + ', ?)')), q: 'מה ה-y של הקודקוד?', a: yv, hint: 'מסתכלים בטבלה: מה ה-y כאשר ' + mt('x = ' + num(xv)) + ' ?' });
        st.push({ show: eq, q: 'הקודקוד הוא נקודת…', opts: ['מינימום ∪ (הכי נמוכה)', 'מקסימום ∩ (הכי גבוהה)'], a: a > 0 ? 0 : 1, hint: 'מסתכלים על הערכים בטבלה: האם ה-y של הקודקוד הוא הקטן ביותר או הגדול ביותר?' });
        if (lv > 1) st.push({ show: 'x = ' + num(xv + 3), q: 'בלי לחשב, בעזרת הסימטריה: מה ה-y כאשר ' + mt('x = ' + num(xv + 3)) + ' ?', a: f(xv + 3), hint: mt('x = ' + num(xv + 3)) + ' נמצא באותו מרחק מציר הסימטריה כמו ' + mt('x = ' + num(xv - 3)) + ', ולכן יש להם אותו y.' });
        return { ex: eq + '<br>' + he('ממלאים את טבלת הערכים, מסמנים את הנקודות, ומגלים את ציר הסימטריה ואת הקודקוד.'), steps: st, table: { a: a, b: b, c: c, xs: xs, xv: xv }, fin: rl('ציר הסימטריה: ' + mt('x = ' + num(xv)) + ' · הקודקוד: ' + mt('(' + num(xv) + ', ' + num(yv) + ')')) };
      } }
  ];

  // =====================================================================
  //  הנושאים: סדר, כיתות, ונושאים קודמים לכל נושא
  // =====================================================================
  var ORD = ['kefel', 'hiluk', 'seder', 'shetach', 'asroni', 'shvarim', 'kefel-shvarim', 'memutza', 'achuzim', 'yachas', 'histabrut', 'pilug', 'mishvaa', 'chezkot', 'kav', 'pitagoras', 'maarechet', 'trinom', 'shorashim', 'parabola-tavla'];
  var T = MX.T.concat(EXTRA), byId = {};
  T.forEach(function (t) { byId[t.id] = t; });
  T.sort(function (x, y) { var i = ORD.indexOf(x.id), j = ORD.indexOf(y.id); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); }); // יציב: נושאי הבגרות נשארים בסדר שלהם
  // לאיזה כיתות כל נושא מתאים (לפי תוכנית הלימודים המקובלת). נושאי בגרות: י׳–י״ב, לפי היחידות של השאלון.
  var GR = { kefel: [2, 4], hiluk: [4, 5], seder: [4, 6], shetach: [4, 6], asroni: [5, 6], shvarim: [5, 6], 'kefel-shvarim': [6, 7], memutza: [6, 7], achuzim: [6, 8], yachas: [6, 8], histabrut: [7, 9], pilug: [7, 8], mishvaa: [7, 8], chezkot: [7, 9], kav: [8, 9], pitagoras: [8, 9], maarechet: [8, 9], trinom: [9, 10], shorashim: [9, 10], 'parabola-tavla': [9, 10] };
  var GRN = { 2: 'ב׳', 3: 'ג׳', 4: 'ד׳', 5: 'ה׳', 6: 'ו׳', 7: 'ז׳', 8: 'ח׳', 9: 'ט׳', 10: 'י׳', 11: 'י״א', 12: 'י״ב' };
  function grOf(t) { return GR[t.id] || [10, 12]; }
  function unitsOf(t) { // ['35481', ...] -> [4]
    if (!t.q) return null;
    var u = {}; t.q.forEach(function (c) { u[c.slice(0, 3) === '355' ? 5 : c.slice(0, 3) === '354' ? 4 : 3] = 1; });
    return Object.keys(u).map(Number);
  }
  function fits(t, g, u) {
    var r = grOf(t); if (g < r[0] || g > r[1]) return false;
    var un = unitsOf(t); return !un || g < 10 || un.indexOf(u) > -1;
  }
  // נושאים קודמים שכדאי להזכיר בכל נושא (עד שלושה, מהקרוב לרחוק)
  var PRE = { hiluk: ['kefel'], seder: ['kefel', 'hiluk'], shetach: ['kefel', 'seder'], asroni: ['hiluk', 'seder', 'kefel'], shvarim: ['kefel', 'hiluk', 'seder'], 'kefel-shvarim': ['shvarim', 'kefel', 'hiluk'], memutza: ['hiluk', 'asroni', 'seder'], achuzim: ['asroni', 'kefel-shvarim', 'shvarim'], yachas: ['kefel-shvarim', 'shvarim', 'achuzim'], histabrut: ['shvarim', 'achuzim', 'yachas'], pilug: ['seder', 'kefel', 'shetach'], mishvaa: ['pilug', 'seder', 'shvarim'], chezkot: ['seder', 'kefel', 'pilug'], kav: ['mishvaa', 'pilug', 'yachas'], pitagoras: ['chezkot', 'shetach', 'mishvaa'], maarechet: ['mishvaa', 'pilug', 'kav'], trinom: ['pilug', 'chezkot', 'mishvaa'], shorashim: ['trinom', 'chezkot', 'mishvaa'], 'parabola-tavla': ['chezkot', 'kav', 'mishvaa'], parabola: ['parabola-tavla', 'shorashim', 'kav'], sidra: ['mishvaa', 'pilug', 'memutza'], merchak: ['pitagoras', 'kav', 'memutza'], trigo: ['pitagoras', 'yachas', 'mishvaa'], gdila: ['achuzim', 'chezkot', 'asroni'], stiya: ['memutza', 'chezkot', 'achuzim'], nigzeret: ['chezkot', 'kav', 'pilug'], mashik: ['nigzeret', 'kav', 'mishvaa'], kitzon: ['nigzeret', 'shorashim', 'parabola'], integral: ['nigzeret', 'chezkot', 'shetach'], maagal: ['merchak', 'pitagoras', 'shorashim'], normalit: ['stiya', 'achuzim', 'memutza'], handasit: ['sidra', 'chezkot', 'yachas'], sinusim: ['trigo', 'pitagoras', 'shetach'], etz: ['histabrut', 'kefel-shvarim', 'shvarim'], tnua: ['mishvaa', 'maarechet', 'shorashim'], rationalit: ['nigzeret', 'shorashim', 'kitzon'], 'shoresh-f': ['nigzeret', 'chezkot', 'kitzon'], merchav: ['trigo', 'pitagoras', 'sinusim'], 'trig-nigzeret': ['nigzeret', 'trigo', 'kitzon'], piramida: ['merchav', 'trigo', 'pitagoras'], vektor: ['merchak', 'pitagoras', 'trigo'], merukav: ['shorashim', 'pilug', 'chezkot'], logaritm: ['chezkot', 'gdila', 'mishvaa'], 'exp-ln': ['nigzeret', 'logaritm', 'kitzon'], dimyon: ['yachas', 'pitagoras', 'mishvaa'], 'zaviot-maagal': ['dimyon', 'maagal', 'mishvaa'], parametr: ['shorashim', 'nigzeret', 'kitzon'], induktzia: ['sidra', 'pilug', 'chezkot'], 'nefach-sivuv': ['integral', 'chezkot', 'shetach'] };
  // נושאים שהשיעור שלהם נמצא בדף "מתמטיקה צעד אחרי צעד" (לקישור מהתזכורות)
  function lessonUrl(t) { return MX.T.indexOf(t) > -1 ? 'https://hakelim.com/limudim/matematika/#' + t.id : BASE + '?d=' + [t.id, 'h', 15, 1, '', 7, 1].join('.'); }

  // =====================================================================
  //  בניית הדף
  // =====================================================================
  function fmtAns(s) {
    if (s.free) return s.txt ? esc(s.txt) : '(תשובה פתוחה)';
    if (s.opts) return s.opts[s.a];
    if (s.fr) return s.fr[1] === 1 ? num(s.fr[0]) : s.fr[0] + '/' + s.fr[1];
    if (Number.isInteger(s.a)) return num(s.a);
    var a = Math.round(s.a * 1000) / 1000;
    if (Math.abs(a - s.a) < 1e-9) return num(a);
    return num(Math.round(s.a * 100) / 100);
  }
  function cost(p, guided) { return Math.max(2, Math.round(1 + p.steps.length * (guided ? 0.6 : 0.8)) + (p.table ? 2 : 0)); }
  // cfg: {t: נושא, k: 'h' הקנייה | 'z' חזרה, m: דקות, lv: 1-3, r: [נושאי תזכורת], s: זרע, a: עזרה 0-2}
  // חשבון בתוך שאלה בעברית: עוטפים כל ביטוי עם סימן פעולה בכיוון שמאל-לימין, אחרת "1/2 + 1/3" מתהפך ל-"1/3 + 1/2"
  function mw(h) { return h.replace(/[0-9(][0-9\s+\-−×÷*\/=().,^²³√%:]*[0-9)²³%]/g, function (m) { return /[+\-−×÷*\/=^:]/.test(m) ? '<bdi dir="ltr">' + m + '</bdi>' : m; }); }
  var OWN_MAX = 20; // שאלות משלי: עד 20 (גם מיבוא מכיתה משחקת ומבנק השאלות)
  function build(cfg) {
    var t = byId[cfg.t]; if (!t) return null;
    var ts = [t].concat((cfg.x || []).map(function (id) { return byId[id]; }).filter(function (x, j, a) { return x && x !== t && a.indexOf(x) === j; })).slice(0, 3);
    return seeded(cfg.s, function () {
      var own = (cfg.q || []).filter(function (x) { return x.t && x.t.trim(); }).slice(0, OWN_MAX).map(function (x) {
        var v = parseVal(x.a || ''), isNum = !isNaN(v) && String(x.a || '').trim() !== '';
        var wr = (x.o || []).filter(function (z) { return String(z).trim(); });
        if (wr.length && String(x.a || '').trim()) { // שאלה אמריקאית: התשובה הנכונה + השגויות, בסדר מעורבב (קבוע לפי ה-seed)
          var op = [String(x.a).trim()].concat(wr.map(function (z) { return String(z).trim(); })), at = 0;
          for (var oi = op.length - 1; oi > 0; oi--) { var oj = Math.floor(Math.random() * (oi + 1)), ot = op[oi]; op[oi] = op[oj]; op[oj] = ot; if (at === oi) at = oj; else if (at === oj) at = oi; }
          return { k: 'ex', own: true, mc: true, guided: false, lv: 1, min: x.m, p: { ex: '<span class="dp-own" dir="rtl">' + mw(esc(x.t.trim())) + '</span>', fin: '<bdi>' + esc(op[at]) + '</bdi>',
            steps: [{ show: '', q: 'בוחרים את התשובה:', opts: op.map(function (z) { return '<bdi>' + esc(z) + '</bdi>'; }), a: at, hint: 'קוראים שוב את השאלה, לאט, ובודקים כל אחת מהתשובות.' }] } };
        }
        return { k: 'ex', own: true, guided: false, lv: 1, min: x.m, p: { ex: '<span class="dp-own" dir="rtl">' + mw(esc(x.t.trim())) + '</span>', fin: x.a ? '<bdi>' + esc(x.a) + '</bdi>' : '',
          steps: [isNum ? { show: '', q: 'התשובה:', a: v, hint: 'זו שאלה מהמורה. קוראים שוב את השאלה, לאט, ובודקים את החישוב.' } : { free: true, show: '', q: 'התשובה שלי:', a: 0, txt: x.a || '', hint: '' }] } };
      });
      var items = [], total = own.reduce(function (z, x) { return z + x.min; }, 0), n = 0, i = 0;
      var only = !!(cfg.only && own.length);
      var revs = only ? [] : cfg.r.map(function (id) { return byId[id]; }).filter(function (x) { return x && ts.indexOf(x) < 0; }).slice(0, 3);
      var asked = revs.length;
      function add(it) { if (it.k === 'ex') it.n = ++n; items.push(it); total += it.min || 0; }
      function guidedFor(j) { return cfg.a === 2 || (cfg.a === 1 && cfg.k === 'h' && j < 2); }
      function mkEx(j) { var tp = ts[j % ts.length], lv = Math.min(cfg.lv, 1 + Math.floor(j / (2 * ts.length))), g = guidedFor(j), p = tp.gen(lv); return { k: 'ex', p: p, lv: lv, guided: g, min: cost(p, g), tp: ts.length > 1 ? tp : null }; }
      function tryRev() {
        if (!revs.length) return;
        var rt = revs[0], p = rt.gen(1), it = { k: 'ex', p: p, lv: 1, rev: rt, guided: cfg.a === 2, min: cost(p, cfg.a === 2) };
        if (total + it.min > cfg.m + 1) return;
        revs.shift(); add(it);
      }
      var L = t.lesson, half = Math.ceil(L.length / 2);
      if (only) { /* רק השאלות של המורה */ } else if (cfg.a > 0 && cfg.k === 'h') {
        add({ k: 'learn', title: '📘 לומדים: ' + t.name, steps: L.slice(0, half), min: Math.max(2, Math.round(half * 0.6)) });
        add(mkEx(i++)); tryRev();
        add({ k: 'learn', title: '📘 ממשיכים ללמוד', steps: L.slice(half), min: Math.max(1, Math.round((L.length - half) * 0.6)) });
      } else if (cfg.a > 0) {
        var rc = []; ts.forEach(function (x) { rc = rc.concat(x.lesson.filter(function (s) { return s.m.indexOf('תורכם') < 0; }).slice(0, ts.length > 1 ? 3 : 6)); });
        add({ k: 'recap', title: '🧠 תזכורת קצרה' + (ts.length > 1 ? '' : ': ' + t.name), steps: rc, min: 1 + ts.length });
      }
      var guard = only ? 40 : 0;
      while (guard++ < 40) {
        var e = mkEx(i);
        if (total + e.min > cfg.m + 1 && i >= 1) break;
        add(e); i++; tryRev();
      }
      own.forEach(function (it) { it.n = ++n; items.push(it); });
      var bonus = only ? null : t.gen(Math.min(3, cfg.lv + 1));
      return { t: t, ts: only ? [t] : ts, only: only, em: only ? '✍️' : t.em, name: only ? 'שאלות מהמורה' : ts.map(function (x) { return x.name; }).join(' + '), cfg: cfg, items: items, total: total, nq: n, nrev: asked - revs.length, dropped: revs.length, bonus: bonus ? { k: 'ex', p: bonus, bonus: true, guided: false, min: 0, n: n + 1 } : null };
    });
  }
  function encode(cfg) { return [[cfg.t].concat(cfg.x || []).join(','), cfg.k, cfg.m, cfg.lv, cfg.r.join('~'), cfg.s, cfg.a].concat(cfg.only ? [1] : []).join('.'); }
  function decode(d) {
    var q = String(d).split('.'), tt = (q[0] || '').split(','); if (q.length < 6 || !byId[tt[0]]) return null;
    return { t: tt[0], x: tt.slice(1, 3).filter(function (x) { return byId[x]; }), k: q[1] === 'z' ? 'z' : 'h', m: Math.min(120, Math.max(5, +q[2] || 30)), lv: Math.min(3, Math.max(1, +q[3] || 2)), r: q[4] ? q[4].split('~').filter(function (x) { return byId[x]; }) : [], s: +q[5] || 1, a: q[6] === undefined ? 1 : Math.min(2, Math.max(0, +q[6] || 0)), only: q[7] === '1' };
  }
  // שאלות שהמורה כתבה: [{t: שאלה, a: תשובה (לא חובה), m: דקות}] – נכנסות לקישור כ-base64 של JSON
  function ownEnc(q) {
    if (!q || !q.length) return '';
    try { var b = new TextEncoder().encode(JSON.stringify(q.map(function (x) { return x.o && x.o.length ? [x.t, x.a || '', x.m, x.o] : [x.t, x.a || '', x.m]; }))), bin = ''; b.forEach(function (c) { bin += String.fromCharCode(c); }); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); } catch (e) { return ''; }
  }
  function ownDec(str) {
    if (!str) return [];
    try { var bin = atob(String(str).replace(/-/g, '+').replace(/_/g, '/')), b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(b)).slice(0, OWN_MAX).map(function (x) { return { t: String(x[0] || '').slice(0, 300), a: String(x[1] || '').slice(0, 80), m: Math.min(20, Math.max(1, +x[2] || 3)), o: Array.isArray(x[3]) ? x[3].slice(0, 4).map(function (z) { return String(z).slice(0, 80); }) : [] }; }).filter(function (x) { return x.t.trim(); }); } catch (e) { return []; }
  }
  function linkOf(cfg, title) { var q = ownEnc(cfg.q); return BASE + '?d=' + encodeURIComponent(encode(cfg)) + (title ? '&c=' + encodeURIComponent(title) : '') + (q ? '&q=' + q : ''); }
  var KIND = { h: 'דף הקנייה', z: 'דף חזרה' };
  // ---------- קישור קצר: /k/#קוד במקום קישור של אלפי תווים (כשיש שאלות של המורה) ----------
  var SAPI = (function () { try { var o = localStorage.getItem('dapim-api'); if (o) return o; } catch (e) {} return 'https://kartis.gilad4049.workers.dev'; })();
  var SHORT = BASE.replace(/limudim\/dapim\/$/, '') + 'k/#';
  function b64u(str) { var b = new TextEncoder().encode(str), bin = ''; b.forEach(function (c) { bin += String.fromCharCode(c); }); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(str) { var bin = atob(String(str).replace(/-/g, '+').replace(/_/g, '/')), b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return new TextDecoder().decode(b); }
  function sheetPayload(cfg, title) { var o = { d: encode(cfg) }, q = ownEnc(cfg.q); if (title) o.c = title.slice(0, 40); if (q) o.q = q; return b64u(JSON.stringify(o)); }
  function hkey(str) { var h = 5381; for (var i = 0; i < str.length; i++) h = (h * 33 + str.charCodeAt(i)) >>> 0; return h.toString(36) + '.' + str.length; }
  var shortMem = load('dapim-short', {}), shortWait = {}, shortFail = {};
  function shortGet(pl) { return shortMem[hkey(pl)] || ''; }
  function shortAsk(pl, done) { // אותו דף = אותו קוד (השרת זוכר). נכשל? נשארים עם הקישור הארוך
    var key = hkey(pl); if (shortWait[key] || shortFail[key]) return;
    shortWait[key] = 1;
    fetch(SAPI + '/s', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ d: pl, t: 'w' }) })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (j) {
        if (!j || !/^[0-9A-Za-z]{8}$/.test(j.k)) throw new Error('k');
        var ks = Object.keys(shortMem); if (ks.length > 40) delete shortMem[ks[0]];
        shortMem[key] = j.k; save('dapim-short', shortMem); used('short_link'); done();
      })
      .catch(function () { shortFail[key] = 1; done(); })
      .then(function () { delete shortWait[key]; });
  }

  // ---------- מערכת צירים לפרבולה (להדפסה: ריקה. בדיגיטלי: הנקודות מופיעות כשממלאים את הטבלה) ----------
  function gridSvg(tb, shown, curve, axis) {
    var f = function (x) { return tb.a * x * x + tb.b * x + tb.c; };
    var x0 = Math.min(0, tb.xs[0] - 1), x1 = Math.max(0, tb.xs[tb.xs.length - 1] + 2);
    var ys = tb.xs.map(f).concat([f(tb.xv + 3)]), lo = Math.min.apply(null, ys.concat([0])), hi = Math.max.apply(null, ys.concat([0]));
    var sy = hi - lo <= 14 ? 1 : hi - lo <= 28 ? 2 : 5;
    var y0 = Math.floor(lo / sy) - 1, y1 = Math.ceil(hi / sy) + 1; // ביחידות של sy
    var C = 24, mx = 26, my = 20, W = (x1 - x0) * C + mx * 2, H = (y1 - y0) * C + my * 2;
    var X = function (x) { return mx + (x - x0) * C; }, Y = function (y) { return my + (y1 - y / sy) * C; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dp-grid" direction="ltr" style="max-width:' + Math.round(W * 1.15) + 'px" role="img" aria-label="מערכת צירים לסימון הנקודות">', k;
    for (k = x0; k <= x1; k++) s += '<path d="M' + X(k) + ' ' + my + ' V' + (H - my) + '" class="gl"/>' + (k ? '<text x="' + X(k) + '" y="' + (Y(0) + 13) + '" class="gt" text-anchor="middle">' + num(k) + '</text>' : '');
    for (k = y0; k <= y1; k++) s += '<path d="M' + mx + ' ' + Y(k * sy) + ' H' + (W - mx) + '" class="gl"/>' + (k && k < y1 ? '<text x="' + (X(0) - 5) + '" y="' + (Y(k * sy) + 4) + '" class="gt" text-anchor="end">' + num(k * sy) + '</text>' : '');
    s += '<path d="M' + mx + ' ' + Y(0) + ' H' + (W - mx) + ' M' + X(0) + ' ' + my + ' V' + (H - my) + '" class="ga"/><text x="' + (W - mx + 6) + '" y="' + (Y(0) + 4) + '" class="gt">x</text><text x="' + X(0) + '" y="' + (my - 6) + '" class="gt" text-anchor="middle">y</text>';
    if (curve) { var d = ''; for (var x = tb.xs[0] - 0.4; x <= tb.xs[tb.xs.length - 1] + 0.41; x += 0.1) { var yy = f(x); if (yy / sy < y0 || yy / sy > y1) continue; d += (d ? ' L' : 'M') + X(x).toFixed(1) + ' ' + Y(yy).toFixed(1); } s += '<path d="' + d + '" class="gc"/>'; }
    if (axis) s += '<path d="M' + X(tb.xv) + ' ' + my + ' V' + (H - my) + '" class="gs"/>';
    (shown || []).forEach(function (j) { s += '<circle cx="' + X(tb.xs[j]) + '" cy="' + Y(f(tb.xs[j])) + '" r="4.5" class="gp"/>'; });
    return s + '</svg>';
  }

  // =====================================================================
  //  הדף המודפס
  // =====================================================================
  var qrJobs = [];
  function qrSpot(url, size) { qrJobs.push([url, size]); return '<span class="dp-qr" data-qr="' + (qrJobs.length - 1) + '"></span>'; }
  function runQr(root) {
    if (!window.QRCode) return;
    root.querySelectorAll('[data-qr]').forEach(function (el) {
      var j = qrJobs[+el.dataset.qr]; if (!j || el.firstChild) return;
      try { new window.QRCode(el, { text: j[0], width: j[1], height: j[1], correctLevel: window.QRCode.CorrectLevel.L }); } catch (e) {}
    });
  }
  function learnHtml(it) {
    return '<section class="dp-learn' + (it.k === 'recap' ? ' recap' : '') + '"><h3>' + it.title + '</h3>' + it.steps.map(function (s) {
      return '<div class="dp-ls"><div class="dp-lm" dir="ltr">' + s.m + '</div>' + (it.k === 'recap' ? '' : '<p>' + s.t + '</p>') + '</div>';
    }).join('') + '</section>';
  }
  function qHead(it, o) {
    return '<div class="dp-qh"><span class="dp-n">' + (it.bonus ? '⭐' : it.n) + '</span>' +
      (it.bonus ? '<span class="dp-tag">לזריזים: שאלת אתגר</span>' : it.own ? '<span class="dp-tag">✍️ שאלה מהמורה</span>' : it.rev ? '<span class="dp-tag">🔁 זוכרים? ' + it.rev.name + '</span>' : (it.tp ? '<span class="dp-tag">' + it.tp.em + ' ' + it.tp.name + '</span>' : '') + (it.guided ? '<span class="dp-tag">תרגיל מודרך</span>' : '')) +
      (o.time && it.min ? '<span class="dp-min">⏱ כ-' + it.min + ' דק׳</span>' : '') + '</div>';
  }
  function exPrint(it, o) {
    var p = it.p, h = '<section class="dp-q' + (it.rev ? ' rev' : '') + (it.bonus ? ' bonus' : '') + '">' + qHead(it, o) + '<div class="dp-ex" dir="ltr">' + p.ex + '</div>';
    var rest = p.steps;
    if (p.table) {
      var tb = p.table, f = function (x) { return tb.a * x * x + tb.b * x + tb.c; };
      h += '<div class="dp-tw">' + tblHtml(tb.xs, tb.xs.map(function (x, j) { return it.guided && j === 0 ? '<b>' + num(f(x)) + '</b>' : ''; }), 'fill') + gridSvg(tb) + '</div>';
      if (it.guided) h += '<p class="dp-eg">דוגמה: ' + p.steps[0].hint + '</p>';
      rest = p.steps.filter(function (s) { return s.tbl === undefined; });
    }
    if (it.guided || p.table) {
      h += '<ol class="dp-steps">' + rest.map(function (s) {
        return '<li><span class="sh" dir="ltr">' + s.show.replace(/<\/?mark>/g, '') + '</span><span class="sq">' + s.q + '</span>' +
          (s.opts ? '<span class="so">' + s.opts.map(function (x) { return '◯ ' + x; }).join(' &nbsp; ') + '</span>' : '<span class="sb"></span>') + '</li>';
      }).join('') + '</ol>';
    } else if (it.mc) {
      h += '<div class="dp-mc">' + p.steps[0].opts.map(function (x) { return '<span>◯ ' + x + '</span>'; }).join('') + '</div>';
    } else {
      h += '<div class="dp-work' + (o.grid ? ' grid' : '') + '" style="height:' + (it.own ? Math.min(60, 12 + it.min * 5) : Math.min(40, 10 + p.steps.length * 5)) + 'mm"></div><div class="dp-ans">תשובה: <span class="sb"></span></div>';
    }
    return h + '</section>';
  }
  function keyLine(it) {
    var p = it.p, a;
    if (p.table) a = 'y: ' + p.steps.filter(function (s) { return s.tbl !== undefined; }).map(fmtAns).join(' , ') + ' &nbsp;|&nbsp; ' + p.steps.filter(function (s) { return s.tbl === undefined; }).map(fmtAns).join(' · ');
    else if (it.guided) a = p.steps.map(function (s) { return fmtAns(s); }).join(' · ') + (p.fin ? ' &nbsp;⟵&nbsp; ' + p.fin : '');
    else a = p.fin || fmtAns(p.steps[p.steps.length - 1]);
    return '<li><b>' + (it.bonus ? '⭐' : it.n) + '.</b> <span dir="ltr">' + a + '</span></li>';
  }
  function paperHtml(sh, o) {
    qrJobs = [];
    var cfg = sh.cfg, t = sh.t, exs = sh.items.filter(function (x) { return x.k === 'ex'; }), revsIn = exs.filter(function (x) { return x.rev; });
    var h = '<article class="dp-paper st-' + o.style + (o.font ? ' big' : '') + '">';
    h += '<header class="dp-ph"><div class="dp-pt"><span class="dp-kind">' + KIND[cfg.k] + (sh.only ? '' : ' · מתמטיקה') + (o.grade ? ' · כיתה ' + o.grade : '') + '</span><h2>' + sh.em + ' ' + (sh.only ? sh.name : t.name) + '</h2>' + (sh.ts.length > 1 ? '<p class="dp-sub"><b>דף משולב</b>, יחד עם: ' + sh.ts.slice(1).map(function (x) { return x.name; }).join(' · ') + '</p>' : '') + (o.title ? '<p class="dp-sub">' + esc(o.title) + '</p>' : '') +
      '<p class="dp-name">שם: <span class="sb w"></span> תאריך: <span class="sb"></span></p></div>' +
      (o.qr && (o.short || linkOf(cfg)).length < 700 ? '<div class="dp-qrw">' + qrSpot(o.short || linkOf(cfg), 84) + '<small>הדף הדיגיטלי:<br>רמזים, בדיקה ומחשבון</small></div>' : '') + '</header>';
    h += '<div class="dp-strip"><span>⏱ כ-' + sh.total + ' דקות</span><span>' + sh.nq + ' שאלות</span>' + (o.stars ? '<span class="dp-stars" aria-label="כוכב לכל שאלה">' + exs.map(function () { return '☆'; }).join('') + '</span><span class="dp-strip-n">צובעים כוכב אחרי כל שאלה</span>' : '') + '</div>';
    sh.items.forEach(function (it) { h += it.k === 'ex' ? exPrint(it, o) : learnHtml(it); });
    if (o.bonus && sh.bonus) h += exPrint(sh.bonus, o);
    h += '<div class="dp-endw">';
    if (cfg.a > 0 && revsIn.length) {
      h += '<section class="dp-hints"><h3>💡 נתקעתם בשאלת "זוכרים?" – מציצים ברמז, או סורקים לשיעור קצר</h3><div class="dp-hl">' + revsIn.map(function (it) {
        return '<div class="dp-hi">' + qrSpot(lessonUrl(it.rev), 60) + '<p><b>שאלה ' + it.n + '</b><span class="flip">' + it.p.steps[0].hint + '</span></p></div>';
      }).join('') + '</div></section>';
    }
    if (o.feel) h += '<section class="dp-feel"><b>איך הרגשתי עם הדף?</b><span>😀 הבנתי הכול</span><span>🙂 הבנתי את הרוב</span><span>🤔 צריך עוד הסבר</span><span class="dp-feel-q">מה עוד לא ברור לי: <span class="sb w"></span></span></section>';
    h += '<footer class="dp-pf">טעות היא חלק מהלימוד. ממשיכים הלאה 💪 &nbsp;·&nbsp; דף מ"הכלים של גילעד רחמים", חינם: <bdi dir="ltr">hakelim.com/limudim/dapim</bdi></footer></div></article>';
    if (o.key) {
      h += '<article class="dp-paper dp-keyp st-' + o.style + '"><header class="dp-ph"><div class="dp-pt"><span class="dp-kind">דף תשובות למורה</span><h2>' + sh.em + ' ' + sh.name + '</h2><p class="dp-sub">' + KIND[cfg.k] + ' · כ-' + sh.total + ' דקות · רמה ' + ['', 'בסיס', 'רגילה', 'מאתגרת'][cfg.lv] + (o.title ? ' · ' + esc(o.title) : '') + '</p></div></header><ol class="dp-key">' +
        exs.concat(o.bonus && sh.bonus ? [sh.bonus] : []).map(keyLine).join('') + '</ol><p class="dp-keyn">בתרגיל מודרך התשובות מופיעות לפי סדר הצעדים, ואחרי החץ התשובה הסופית.</p></article>';
    }
    return h;
  }

  // =====================================================================
  //  המסך של המורה
  // =====================================================================
  var CKEY = 'limudim-dapim-cfg';
  function initBuilder() {
    var shortT = 0, st = load(CKEY, {}), cur = null, kind = st.k === 'z' ? 'z' : 'h', seed = st.s || R(1000, 99999);
    var gs = $('dp-grade');
    gs.innerHTML = Object.keys(GRN).map(function (g) { return '<option value="' + g + '">כיתה ' + GRN[g] + '</option>'; }).join('');
    gs.value = st.g || 9; $('dp-units').value = st.u || 4;
    ['min', 'lv', 'help', 'style', 'font'].forEach(function (k) { if (st[k] !== undefined) $('dp-' + k).value = st[k]; });
    if (st.title) $('dp-title').value = st.title;
    ['time', 'stars', 'bonus', 'feel', 'grid', 'qr'].forEach(function (k) { if (st['o' + k] === false) $('dp-o-' + k).checked = false; });
    if (st.key === false) $('dp-key').checked = false;
    function opt(t) { return '<option value="' + t.id + '">' + t.name + '</option>'; }
    function fillTopics(keep) {
      var g = +gs.value, u = +$('dp-units').value; $('dp-units-w').hidden = g < 10;
      var now = T.filter(function (t) { return fits(t, g, u); }), before = T.filter(function (t) { return grOf(t)[1] < g; }), later = T.filter(function (t) { return now.indexOf(t) < 0 && before.indexOf(t) < 0; });
      var sel = $('dp-topic'), was = keep || sel.value;
      sel.innerHTML = (now.length ? '<optgroup label="הנושאים של כיתה ' + GRN[g] + (g >= 10 ? ', ' + u + ' יח״ל' : '') + '">' + now.map(opt).join('') + '</optgroup>' : '') +
        (before.length ? '<optgroup label="מכיתות קודמות, לחזרה">' + before.map(opt).join('') + '</optgroup>' : '') +
        (later.length ? '<optgroup label="נושאים מתקדמים יותר">' + later.map(opt).join('') + '</optgroup>' : '');
      if (was && byId[was] && (keep || now.indexOf(byId[was]) > -1)) sel.value = was; else sel.value = (now[now.length - 1] || T[0]).id;
    }
    function fillRevs(keep, keepX) {
      var g = +gs.value, tid = $('dp-topic').value, pre = PRE[tid] || [];
      var pool = T.filter(function (t) { return t.id !== tid && grOf(t)[0] <= g; });
      [1, 2].forEach(function (k, j) { var s = $('dp-x' + k), was = keepX ? keepX[j] : s.value; s.innerHTML = '<option value="">בלי</option>' + pool.map(opt).join(''); s.value = was && was !== tid && byId[was] ? was : ''; });
      [1, 2, 3].forEach(function (k, j) {
        var s = $('dp-r' + k);
        s.innerHTML = '<option value="">בלי</option>' + pool.map(opt).join('');
        s.value = keep && keep[j] !== undefined ? keep[j] : (pre[j] || '');
      });
    }
    // שאלות משלי
    var ownQ = (st.own || []).slice(0, OWN_MAX).map(function (x) { return { t: String(x.t || ''), a: String(x.a || ''), m: +x.m || 3, o: Array.isArray(x.o) ? x.o : [] }; });
    if (st.only) $('dp-only').checked = true;
    function drawOwn() {
      $('dp-own').innerHTML = ownQ.map(function (x, j) {
        return '<div class="dp-ownq" data-j="' + j + '"><label>שאלה ' + (j + 1) + '<textarea rows="2" maxlength="300" data-f="t" placeholder="למשל: הסבירו במילים שלכם מהו קודקוד של פרבולה">' + esc(x.t) + '</textarea></label><div class="dp-row"><label>תשובה (לא חובה)<input type="text" maxlength="80" data-f="a" value="' + esc(x.a) + '" placeholder="מספר ייבדק לבד בדיגיטלי"></label><label>כמה דקות<select data-f="m">' +
          [1, 2, 3, 5, 8, 10, 15].map(function (m) { return '<option value="' + m + '"' + (m === x.m ? ' selected' : '') + '>' + m + ' דק׳</option>'; }).join('') + '</select></label></div><label>תשובות שגויות לבחירה (לא חובה) <small>כותבים כאן, והשאלה הופכת לאמריקאית. מפרידים ב-|</small><input type="text" maxlength="250" data-f="o" dir="auto" value="' + esc((x.o || []).join(' | ')) + '" placeholder="למשל: 2/5 | 2/6 | 1/6"></label><button class="linkish" type="button" data-del>להסיר את השאלה ✕</button></div>';
      }).join('');
      $('dp-own-add').hidden = ownQ.length >= OWN_MAX;
      $('dp-own-n').textContent = ownQ.length ? ownQ.length + ' שאלות משלי' + (ownQ.length >= OWN_MAX ? ' (המקסימום)' : '') : '';
    }
    $('dp-own').addEventListener('input', function (e) {
      var w = e.target.closest('[data-j]'), f = e.target.dataset.f; if (!w || !f) return;
      ownQ[+w.dataset.j][f] = f === 'm' ? +e.target.value : f === 'o' ? e.target.value.split('|').map(function (z) { return z.trim(); }).filter(Boolean).slice(0, 4) : e.target.value; render();
    });
    $('dp-own').addEventListener('click', function (e) { var b = e.target.closest('[data-del]'); if (!b) return; ownQ.splice(+b.closest('[data-j]').dataset.j, 1); drawOwn(); render(); });
    $('dp-own-add').addEventListener('click', function () { ownQ.push({ t: '', a: '', m: 3, o: [] }); drawOwn(); var ta = $('dp-own').querySelector('[data-j="' + (ownQ.length - 1) + '"] textarea'); if (ta) ta.focus(); used('own_add'); });
    // שורה "שאלה | נכונה | שגויה..." -> שאלה אמריקאית של דקה
    function lineQ(l) { var z = String(l).split('|').map(function (x) { return x.trim(); }).filter(Boolean); return z.length < 2 ? null : { t: z[0], a: z[1], m: 1, o: z.slice(2, 5) }; }
    function addMany(list, how) {
      var room = OWN_MAX - ownQ.length, got = list.filter(Boolean).slice(0, Math.max(0, room));
      ownQ = ownQ.concat(got); drawOwn(); render(); used(how, { n: got.length });
      return got.length;
    }
    // מכיתה משחקת: דף המורה שם את השאלות ב-localStorage ופותח /limudim/dapim/?from=kita
    if (new URLSearchParams(location.search).get('from') === 'kita') {
      var imp = load('dapim-import', null);
      try { localStorage.removeItem('dapim-import'); } catch (e) {}
      if (imp && imp.q && imp.q.length) {
        ownQ = []; addMany(imp.q.map(function (x) { return { t: String(x.t || '').slice(0, 300), a: String(x.a || '').slice(0, 80), m: 1, o: (x.o || []).slice(0, 4) }; }), 'import_kita');
        $('dp-only').checked = true; $('dp-help').value = '1'; setKind('z');
        if (imp.title) $('dp-title').value = String(imp.title).slice(0, 40);
        $('dp-imp').hidden = false; $('dp-imp').textContent = '✓ נטענו ' + ownQ.length + ' שאלות מכיתה משחקת' + (imp.title ? ' ("' + imp.title + '")' : '') + '. הדף מוכן להדפסה למטה, עם דף תשובות למורה. אפשר להוסיף תרגילים מהמחולל: מורידים את הסימון "רק השאלות שלי".';
        history.replaceState(null, '', location.pathname);
      }
    }
    // בנק השאלות המוכן של כיתה משחקת (assets/kita-bank.json), נושאי המתמטיקה. נטען רק בלחיצה
    var bank = null;
    $('dp-bank-open').addEventListener('click', function () {
      var b = this; b.disabled = true;
      fetch('/assets/kita-bank.json').then(function (r) { if (!r.ok) throw new Error('bank'); return r.json(); }).then(function (j) {
        bank = j; $('dp-bank').hidden = false; b.hidden = true;
        $('dp-bank-t').innerHTML = j.topics.filter(function (t) { return t.subj === 'math'; }).map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + '</option>'; }).join('');
      }).catch(function () { b.disabled = false; b.textContent = 'הבנק לא נטען. לנסות שוב'; });
    });
    $('dp-bank-go').addEventListener('click', function () {
      var t = bank && bank.topics.filter(function (x) { return x.id === $('dp-bank-t').value; })[0]; if (!t) return;
      var have = ownQ.map(function (x) { return x.t; }), pool = t.q.map(lineQ).filter(function (x) { return x && have.indexOf(x.t) < 0; });
      for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
      var n = addMany(pool.slice(0, +$('dp-bank-n').value), 'bank_' + t.id);
      $('dp-bank-msg').textContent = n ? '✓ נוספו ' + n + ' שאלות על ' + t.name + '. הן בסוף הדף, עם התשובות בדף המורה.' : 'אין מקום לעוד שאלות (עד ' + OWN_MAX + '). מסירים כמה ומנסים שוב.';
    });
    $('dp-only').addEventListener('change', render);
    drawOwn();
    var curMsg = '', curLink = '';
    function readCfg() {
      var r = [1, 2, 3].map(function (k) { return $('dp-r' + k).value; }).filter(function (x, j, a) { return x && a.indexOf(x) === j; });
      var xs = [1, 2].map(function (k) { return $('dp-x' + k).value; }).filter(function (x, j, a) { return x && x !== $('dp-topic').value && a.indexOf(x) === j; });
      return { t: $('dp-topic').value, x: xs, q: ownQ.filter(function (x) { return x.t.trim(); }), only: $('dp-only').checked && ownQ.some(function (x) { return x.t.trim(); }), k: kind, m: +$('dp-min').value, lv: +$('dp-lv').value, r: r, s: seed, a: +$('dp-help').value };
    }
    function render() {
      var cfg = readCfg(), sh = build(cfg); if (!sh) return; cur = sh;
      var o = { style: $('dp-style').value, font: +$('dp-font').value, title: $('dp-title').value.trim(), grade: GRN[+gs.value], key: $('dp-key').checked };
      ['time', 'stars', 'bonus', 'feel', 'grid', 'qr'].forEach(function (k) { o[k] = $('dp-o-' + k).checked; });
      var link = linkOf(cfg, o.title), pl = null, pend = false;
      if (true) { // תמיד קישור קצר: hakelim.com/k/#קוד (נעים בווטסאפ, וקוד הסריקה פשוט)
        pl = sheetPayload(cfg, o.title);
        var sk = shortGet(pl);
        if (sk) { o.short = SHORT + sk; link = o.short; }
        else { pend = !shortFail[hkey(pl)]; clearTimeout(shortT); shortT = setTimeout(function () { shortAsk(pl, render); }, 900); }
      }
      $('dp-paper').innerHTML = paperHtml(sh, o); runQr($('dp-paper'));
      var sum = '<b>' + KIND[cfg.k] + (sh.ts.length > 1 ? ' משולב' : '') + ': ' + sh.name + '</b> · כ-' + sh.total + ' דקות · ' + sh.nq + ' שאלות' + (sh.nrev ? ', מהן ' + sh.nrev + ' תזכורות' : '');
      if (sh.dropped) sum += '<br><small>בזמן שבחרתם נכנסו ' + sh.nrev + ' תזכורות מתוך ' + (sh.nrev + sh.dropped) + '. לדף ארוך יותר ייכנסו כולן.</small>';
      if (o.short) sum += '<br><small>✓ קישור קצר לדף הדיגיטלי: <bdi dir="ltr">' + o.short.replace(/^https:\/\//, '') + '</bdi>' + (o.qr ? ', והקוד לסריקה מודפס בראש הדף.' : '') + '</small>';
      else if (pend) sum += '<br><small>יוצרים קישור קצר לדף הדיגיטלי…</small>';
      else if (cfg.q.length && link.length >= 700 && o.qr) sum += '<br><small>לא הצלחנו ליצור קישור קצר, ועם השאלות שלכם הקישור ארוך מדי לקוד סריקה. שולחים לכיתה את הקישור בווטסאפ.</small>';
      if (sh.total > cfg.m + 1) sum += '<br><small>הדף הקצר ביותר בנושא הזה לוקח כ-' + sh.total + ' דקות. אפשר לקצר עם "בלי עזרה" או עם "דף חזרה".</small>';
      $('dp-sum').innerHTML = sum;
      $('dp-help-note').textContent = cfg.a === 0 ? 'בלי עזרה: אין הסברים, אין רמזים ואין צעדים מודרכים. מתאים לבוחן קצר או לבדיקת הבנה.' : cfg.a === 2 ? 'הרבה עזרה: כל תרגיל מפורק לצעדים קטנים, וגם בדף הדיגיטלי הרמזים תמיד זמינים.' : '';
      $('dp-open').href = link;
      curMsg = 'דף עבודה במתמטיקה: ' + sh.name + ' (' + KIND[cfg.k] + ', כ-' + sh.total + ' דקות)\nפותרים כאן, עם רמזים ומחשבון:\n' + link; curLink = link;
      $('dp-wa').href = 'https://wa.me/?text=' + encodeURIComponent(curMsg);
      pdfReset();
      $('dp-copy').dataset.link = link;
      var keep = { g: gs.value, u: $('dp-units').value, k: kind, s: seed, t: cfg.t, x: [$('dp-x1').value, $('dp-x2').value], own: ownQ, only: $('dp-only').checked, r: [1, 2, 3].map(function (k) { return $('dp-r' + k).value; }), title: o.title, key: o.key };
      ['min', 'lv', 'help', 'style', 'font'].forEach(function (k) { keep[k] = $('dp-' + k).value; });
      ['time', 'stars', 'bonus', 'feel', 'grid', 'qr'].forEach(function (k) { keep['o' + k] = o[k]; });
      save(CKEY, keep);
    }
    function setKind(k) { kind = k; app.querySelectorAll('[data-kind]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.kind === k ? 'true' : 'false'); }); }
    fillTopics(st.t || 'parabola-tavla'); fillRevs(st.r, st.x || ['', '']); setKind(kind); render();
    gs.addEventListener('change', function () { fillTopics(); fillRevs(); render(); });
    $('dp-units').addEventListener('change', function () { fillTopics(); fillRevs(); render(); });
    $('dp-topic').addEventListener('change', function () { fillRevs(); render(); used('build', { topic: $('dp-topic').value }); });
    $('dp-form').addEventListener('change', function (e) { if (['dp-grade', 'dp-units', 'dp-topic'].indexOf(e.target.id) < 0 && !e.target.closest('#dp-own')) render(); });
    $('dp-title').addEventListener('input', render);
    $('dp-form').addEventListener('submit', function (e) { e.preventDefault(); });
    app.querySelectorAll('[data-kind]').forEach(function (b) { b.addEventListener('click', function () { setKind(b.dataset.kind); render(); }); });
    // הצעת שדרוג ובקשת כלי אישי: נשלחות לגילעד בווטסאפ
    [['dp-idea', 'הצעה לשדרוג מחולל דפי העבודה'], ['dp-ishi', 'בקשה לכלי אישי למורה']].forEach(function (q) {
      var b = $(q[0] + '-wa'); if (!b) return;
      b.addEventListener('click', function () {
        var txt = $(q[0]).value.trim();
        b.href = 'https://wa.me/972584049049?text=' + encodeURIComponent('שלום גילעד, ' + q[1] + ':\n' + (txt || '...'));
        used(q[0] === 'dp-idea' ? 'idea' : 'personal_tool');
      });
    });
    $('dp-new').addEventListener('click', function () { seed = R(1000, 99999); render(); used('new'); });
    $('dp-print').addEventListener('click', function () { used('print', { topic: cur.t.id, kind: cur.cfg.k, min: cur.cfg.m }); window.print(); });
    $('dp-wa').addEventListener('click', function () { used('wa', { topic: cur.t.id }); });
    $('dp-open').addEventListener('click', function () { used('open_digital', { topic: cur.t.id }); });
    // ---------- PDF לקבוצת ווטסאפ / שיתוף מהטלפון ----------
    // שני שלבים: "להכין" (כמה שניות) ואז "לשלוח" – הדפדפן מרשה לפתוח שיתוף רק מיד אחרי לחיצה.
    var pdfFile = null, pdfUrl = '';
    function pdfReset() { pdfFile = null; if (pdfUrl) { URL.revokeObjectURL(pdfUrl); pdfUrl = ''; } $('dp-pdfbox').hidden = true; $('dp-pdf').disabled = false; $('dp-pdf').textContent = '📄 PDF לקבוצת ווטסאפ'; }
    if (navigator.share) $('dp-share').hidden = false;
    $('dp-share').addEventListener('click', function () {
      used('share_link', { topic: cur.t.id });
      navigator.share({ title: 'דף עבודה: ' + cur.name, text: curMsg }).catch(function () {});
    });
    $('dp-pdf').addEventListener('click', function () {
      var b = this; if (b.disabled) return;
      b.disabled = true; b.textContent = 'מכינים את ה-PDF…';
      makePdf(cur).then(function (blob) {
        var name = ('דף עבודה - ' + (cur.only ? cur.name : cur.t.name)).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) + '.pdf';
        pdfFile = new File([blob], name, { type: 'application/pdf' });
        pdfUrl = URL.createObjectURL(blob);
        var dl = $('dp-pdf-dl'); dl.href = pdfUrl; dl.setAttribute('download', name);
        var can = false; try { can = !!(navigator.canShare && navigator.canShare({ files: [pdfFile] })); } catch (e) {}
        $('dp-pdf-share').hidden = !can; dl.hidden = false;
        $('dp-pdfmsg').innerHTML = '✓ ה-PDF מוכן (' + Math.max(1, Math.round(blob.size / 1024)) + ' KB). ' + (can ? 'לוחצים "לשלוח", בוחרים ווטסאפ ואת הקבוצה. הקישור הקצר לדף הדיגיטלי נשלח איתו.' : 'מורידים אותו, ובווטסאפ במחשב גוררים את הקובץ לקבוצה (או 📎 ← מסמך).');
        $('dp-pdfbox').hidden = false; b.textContent = '✓ ה-PDF מוכן';
        used('pdf_make', { topic: cur.t.id, kb: Math.round(blob.size / 1024) });
      }).catch(function () {
        b.disabled = false; b.textContent = '📄 PDF לקבוצת ווטסאפ';
        $('dp-pdf-share').hidden = true; $('dp-pdf-dl').hidden = true;
        $('dp-pdfmsg').textContent = 'לא הצלחנו להכין PDF בדפדפן הזה. אפשר ללחוץ "להדפיס" ולבחור "שמירה כ-PDF".';
        $('dp-pdfbox').hidden = false;
      });
    });
    $('dp-pdf-share').addEventListener('click', function () {
      if (!pdfFile) return;
      used('pdf_share', { topic: cur.t.id });
      navigator.share({ files: [pdfFile], text: curMsg }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        navigator.share({ files: [pdfFile] }).catch(function () {}); // יש אפליקציות שלא מקבלות טקסט יחד עם קובץ
      });
    });
    $('dp-pdf-dl').addEventListener('click', function () { used('pdf_download', { topic: cur.t.id }); });
    $('dp-copy').addEventListener('click', function () {
      var b = this, l = b.dataset.link, done = function () { b.textContent = '✓ הקישור הועתק'; setTimeout(function () { b.textContent = '🔗 להעתיק קישור'; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(l).then(done, function () { window.prompt('הקישור לדף:', l); });
      else window.prompt('הקישור לדף:', l);
      used('copy');
    });
  }

  // ---------- יצירת PDF בדפדפן: עותק של הדף ברוחב A4, תמונה, וחיתוך לעמודים בין שאלות ----------
  function loadJs(src) { return new Promise(function (ok, no) { var x = document.createElement('script'); x.src = src; x.onload = ok; x.onerror = no; document.head.appendChild(x); }); }
  function makePdf(sh) {
    var src = $('dp-paper').querySelector('.dp-paper'); if (!src) return Promise.reject(new Error('paper'));
    var W = 711, PH = 1039, MM = 188 / W; // תוכן העמוד: 188x275 מ"מ (שוליים 11 מ"מ, כמו בהדפסה)
    var host = document.createElement('div'); host.className = 'dp-pdfhost'; host.setAttribute('aria-hidden', 'true');
    var pap = src.cloneNode(true); host.appendChild(pap); document.body.appendChild(host);
    // קוד הסריקה: קנבס לא מועתק עם התוכן שלו – מחליפים בתמונה
    var srcC = src.querySelectorAll('canvas'), dstC = pap.querySelectorAll('canvas');
    for (var ci = 0; ci < dstC.length; ci++) { try { var im = new Image(); im.src = srcC[ci].toDataURL(); im.style.cssText = srcC[ci].style.cssText; dstC[ci].parentNode.replaceChild(im, dstC[ci]); } catch (e) {} }
    var libs = [window.htmlToImage ? 0 : loadJs('/assets/vendor/html-to-image/html-to-image-1.11.11.js'), window.jspdf ? 0 : loadJs('/assets/vendor/jspdf/jspdf-2.5.1.umd.min.js')];
    return Promise.all(libs).then(function () { return document.fonts ? document.fonts.ready : 0; }).then(function () {
      var top0 = pap.getBoundingClientRect().top, H = Math.ceil(pap.scrollHeight);
      var cand = [], force = [];
      pap.querySelectorAll(':scope > *, .dp-q, .dp-learn, .dp-ls, .dp-key li, .dp-keyp > *, .dp-endw > *').forEach(function (el) {
        var y = Math.round(el.getBoundingClientRect().top - top0); if (y > 0) cand.push(y);
        if (el.classList.contains('dp-keyp')) force.push(y);
      });
      // לא חותכים מיד מתחת לכותרת של תיבה (כותרת לבד בתחתית העמוד)
      var heads = []; pap.querySelectorAll('.dp-learn, .dp-q, .dp-keyp').forEach(function (el) { heads.push(Math.round(el.getBoundingClientRect().top - top0)); });
      cand = cand.filter(function (y) { return !heads.some(function (h) { return y - h > 0 && y - h < 110; }); });
      cand.sort(function (a, b) { return a - b; });
      var cuts = [0], at = 0;
      while (true) {
        var lim = at + PH, f = force.filter(function (y) { return y > at + 40 && y <= lim && y < H; })[0];
        if (!f && H - at <= PH) break;
        var c = f || cand.filter(function (y) { return y > at + PH * 0.35 && y <= lim; }).pop() || lim;
        cuts.push(c); at = c;
      }
      cuts.push(H);
      var r = Math.min(1.5, Math.sqrt(14e6 / (W * H))); // 1.5 = כ-145 נקודות לאינץ' על A4: חד בהדפסה, קובץ קל לווטסאפ
      return window.htmlToImage.getFontEmbedCSS(pap).catch(function () { return ''; }).then(function (fc) {
        return window.htmlToImage.toCanvas(pap, { width: W, height: H, pixelRatio: r, backgroundColor: '#ffffff', fontEmbedCSS: fc || undefined, cacheBust: false });
      }).then(function (cv) {
        var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true }), pages = 0;
        for (var i = 0; i + 1 < cuts.length; i++) {
          var h = cuts[i + 1] - cuts[i]; if (h < 4) continue;
          var pc = document.createElement('canvas'); pc.width = Math.round(W * r); pc.height = Math.round(h * r);
          var g = pc.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, pc.width, pc.height);
          g.drawImage(cv, 0, Math.round(cuts[i] * r), pc.width, pc.height, 0, 0, pc.width, pc.height);
          if (pages++) doc.addPage('a4', 'p');
          doc.addImage(pc.toDataURL('image/jpeg', 0.72), 'JPEG', 11, 11, 188, h * MM);
        }
        window.__dpPdfCuts = cuts;
        return doc.output('blob');
      });
    }).then(function (b) { host.parentNode.removeChild(host); return b; }, function (e) { if (host.parentNode) host.parentNode.removeChild(host); throw e; });
  }

  // =====================================================================
  //  הדף הדיגיטלי (המסך של התלמידים)
  // =====================================================================
  function initDigital(cfg, title) {
    var sh = build(cfg); if (!sh) return false;
    document.body.classList.add('dp-student');
    $('dp-build').hidden = true; $('dp-paper').hidden = true; $('dp-foot').hidden = true; $('dp-hero').hidden = true;
    var root = $('dp-digital'); root.hidden = false;
    var items = sh.items.concat(sh.bonus ? [sh.bonus] : []), exs = items.filter(function (x) { return x.k === 'ex'; });
    var SKEY = 'limudim-dapim-s:' + encode(cfg) + (cfg.q && cfg.q.length ? '|' + ownEnc(cfg.q).slice(-16) : ''), S = load(SKEY, null) || { log: {}, t0: Date.now(), hints: 0, name: '', free: {} };
    S.free = S.free || {};
    var tries = {}, hintOpen = {};
    function logOf(ix) { return S.log[ix] || (S.log[ix] = []); }
    function isDone(it, ix) { var l = logOf(ix); return it.p.steps.every(function (s, j) { return l[j] !== undefined && l[j] !== null; }); }
    function tblDone(it, ix) { var l = logOf(ix); return it.p.steps.every(function (s, j) { return s.tbl === undefined || (l[j] !== undefined && l[j] !== null); }); }
    function curStep(it, ix) { var l = logOf(ix); for (var j = 0; j < it.p.steps.length; j++) if (it.p.steps[j].tbl === undefined && (l[j] === undefined || l[j] === null)) return j; return -1; }
    function mark(l) { return l === 1 ? '<span class="ok1">✓</span>' : l === 2 ? '<span class="ok2">✓</span>' : '<span class="ok0">✗</span>'; }

    var h = '<header class="dg-top"><span class="pill">' + KIND[cfg.k] + ' · כ-' + sh.total + ' דקות</span><h1>' + sh.em + ' ' + sh.name + '</h1>' + (title ? '<p class="sub">' + esc(title) + '</p>' : '') +
      '<p class="note">פותרים צעד אחרי צעד. ' + (cfg.a ? 'טעות היא חלק מהלימוד: אחרי טעות מקבלים רמז. ' : '') + 'ההתקדמות נשמרת במכשיר הזה, ואפשר לחזור ולהמשיך.</p></header>' +
      '<div class="dg-bar" id="dg-bar"><div class="dg-prog"><i id="dg-fill"></i></div><span id="dg-cnt"></span><span id="dg-time"></span><button class="btn btn-line btn-sm" type="button" id="dg-calc">🧮 מחשבון</button></div>';
    items.forEach(function (it, ix) {
      if (it.k !== 'ex') {
        h += '<section class="panel dg-learn"><h2>' + it.title + '</h2>' + it.steps.map(function (s) { return '<div class="dg-ls"><div class="dg-lm" dir="ltr">' + s.m + '</div>' + (it.k === 'recap' ? '' : '<p>' + s.t + '</p>') + '</div>'; }).join('') +
          (it.k !== 'recap' && window.speechSynthesis ? '<div class="btns"><button class="linkish" type="button" data-say="' + ix + '">🔊 להקריא את ההסבר</button></div>' : '') + '</section>';
      } else h += '<section class="panel dg-q' + (it.rev ? ' rev' : '') + (it.bonus ? ' bonus' : '') + '" id="dg-q' + ix + '" data-ix="' + ix + '"></section>';
    });
    h += '<section class="panel dg-end" id="dg-end"></section><p class="disclaimer">דף מ<a class="gold" href="/limudim/dapim/">מחולל דפי העבודה</a> · <a class="gold" href="/limudim/">כלים ללימודים</a> · חינם · בלי הרשמה</p>';
    root.innerHTML = h;

    function renderQ(ix, focus) {
      var it = items[ix], p = it.p, l = logOf(ix), el = $('dg-q' + ix), done = isDone(it, ix), j = curStep(it, ix);
      var s = '<div class="dp-qh"><span class="dp-n">' + (it.bonus ? '⭐' : it.n) + '</span>' + (it.bonus ? '<span class="dp-tag">לזריזים: שאלת אתגר (לא חובה)</span>' : it.own ? '<span class="dp-tag">✍️ שאלה מהמורה</span>' : it.rev ? '<span class="dp-tag">🔁 זוכרים? ' + it.rev.name + '</span>' : it.tp ? '<span class="dp-tag">' + it.tp.em + ' ' + it.tp.name + '</span>' : '') +
        (it.min ? '<span class="dp-min">⏱ כ-' + it.min + ' דק׳</span>' : '') + (done ? '<span class="dg-ok">✓ סיימתם</span>' : '') + '</div><div class="mx-ex" dir="ltr">' + p.ex + '</div>';
      if (p.table) {
        var tb = p.table, shown = [];
        s += '<div class="dg-tw"><div class="dg-ts"><table class="dp-tbl dg-tbl" dir="ltr"><tr><th>x</th>' + tb.xs.map(function (x) { return '<td>' + num(x) + '</td>'; }).join('') + '</tr><tr><th>y</th>' + p.steps.map(function (st, k) {
          if (st.tbl === undefined) return '';
          if (l[k] !== undefined && l[k] !== null) { shown.push(st.tbl); return '<td class="f' + l[k] + '">' + fmtAns(st) + '</td>'; }
          return '<td><input type="text" inputmode="text" dir="ltr" data-cell="' + k + '" aria-label="y כאשר x שווה ' + tb.xs[st.tbl] + '"></td>';
        }).join('') + '</tr></table></div>' + gridSvg(tb, shown, tblDone(it, ix), done) + '</div>';
        s += '<p class="mx-fb" id="dg-tfb' + ix + '" aria-live="polite">' + (tblDone(it, ix) ? 'הטבלה מלאה, והנקודות מחוברות לפרבולה. עכשיו השאלות.' : 'כותבים y בכל משבצת ולוחצים Enter. כל נקודה נכונה מופיעה על הגרף.') + '</p><p class="mx-hint" id="dg-thint' + ix + '" hidden></p>';
      }
      s += '<ol class="mx-done">' + p.steps.map(function (st, k) {
        if (st.tbl !== undefined || l[k] === undefined || l[k] === null) return '';
        return '<li class="' + (l[k] === 1 ? '' : 'shown') + '"><div dir="ltr">' + st.show.replace(/<\/?mark>/g, '') + '</div><span>' + (st.free ? esc(S.free[ix] || '') + ' ✓' : l[k] === 0 && cfg.a === 0 ? '✗' : fmtAns(st) + ' ' + (l[k] === 0 ? '' : '✓')) + '</span></li>';
      }).join('') + '</ol>';
      if (j > -1 && (!p.table || tblDone(it, ix))) {
        var st = p.steps[j], key = ix + ':' + j, nSeq = p.steps.filter(function (x) { return x.tbl === undefined; }).length, at = p.steps.slice(0, j + 1).filter(function (x) { return x.tbl === undefined; }).length;
        s += '<div class="mx-cur" dir="ltr">' + st.show + '</div><form class="mx-form" data-step="' + j + '" novalidate autocomplete="off"><label for="dg-in' + ix + '"><span class="pill">צעד ' + at + ' מתוך ' + nSeq + '</span> ' + st.q + '</label>';
        if (st.free) s += '<div class="dg-free"><textarea id="dg-in' + ix + '" rows="3" maxlength="400" dir="auto"></textarea><button class="btn btn-gold" type="submit">סיימתי לכתוב</button></div>';
        else if (st.opts) s += '<div class="dg-opts">' + st.opts.map(function (o, k) { return '<button class="btn btn-line" type="button" data-opt="' + k + '">' + o + '</button>'; }).join('') + '</div>';
        else s += '<div class="mx-row"><input id="dg-in' + ix + '" type="text" inputmode="text" dir="ltr" enterkeyhint="done"><button class="btn btn-gold" type="submit">לבדוק</button></div>';
        s += '<p class="mx-fb" aria-live="polite"></p>' + (cfg.a && st.hint ? '<p class="mx-hint"' + (hintOpen[key] ? '' : ' hidden') + '>💡 ' + st.hint + '</p><div class="btns"><button class="linkish" type="button" data-hint>💡 רמז</button>' + (it.rev ? '<a class="linkish" href="' + lessonUrl(it.rev).replace('https://hakelim.com', '') + '" target="_blank" rel="noopener">📺 שיעור קצר בנושא</a>' : '') + '</div>' : '') + '</form>';
      } else if (done && p.fin) s += '<p class="mx-fin" dir="ltr">' + p.fin + '</p>';
      el.innerHTML = s; el.classList.toggle('done', done);
      if (focus) { var inp = el.querySelector('input'); if (inp) try { inp.focus({ preventScroll: true }); } catch (e) {} }
    }
    function check(st, raw) { // 1 נכון, 0 לא, -1 לא מספר, 2 צריך לצמצם
      var v = parseVal(raw); if (isNaN(v)) return -1;
      var tol = st.tol || 1e-6;
      if (!st.tol && Math.abs(Math.round(st.a * 1000) / 1000 - st.a) > 1e-9 && /[.,]\d{2,}/.test(raw)) tol = 0.0051;
      if (Math.abs(v - st.a) > tol) return 0;
      if (st.fr && raw.indexOf('/') > -1) { var q = raw.replace(/\s/g, '').replace(/[−–]/g, '-').split('/'); if (gcd(+q[0], +q[1]) !== 1) return 2; }
      return 1;
    }
    function answer(ix, j, res, fbEl, hintEl) { // res: true נכון / false לא נכון. מחזיר true אם הצעד נסגר
      var key = ix + ':' + j, st = items[ix].p.steps[j], l = logOf(ix);
      if (res) { l[j] = tries[key] || hintOpen[key] ? 2 : 1; }
      else {
        tries[key] = (tries[key] || 0) + 1;
        if (tries[key] < 2) {
          fbEl.textContent = cfg.a ? 'עוד לא. יש רמז למטה, נסו שוב.' : 'עוד לא. יש עוד ניסיון אחד.'; fbEl.className = 'mx-fb no';
          if (cfg.a && hintEl) { hintEl.hidden = false; hintEl.innerHTML = '💡 ' + st.hint; if (!hintOpen[key]) { hintOpen[key] = 1; S.hints++; } }
          return false;
        }
        l[j] = 0;
      }
      save(SKEY, S); return true;
    }
    root.addEventListener('submit', function (e) {
      var f = e.target.closest('form[data-step]'); if (!f) return; e.preventDefault();
      var ix = +f.closest('[data-ix]').dataset.ix, j = +f.dataset.step, st = items[ix].p.steps[j], inp = f.querySelector('input,textarea'), fb = f.querySelector('.mx-fb');
      if (st.free) { if (!inp.value.trim()) { fb.textContent = 'כותבים תשובה בתיבה, ואז לוחצים "סיימתי לכתוב".'; return; } S.free[ix] = inp.value.trim(); logOf(ix)[j] = 3; save(SKEY, S); renderQ(ix, false); progress(); return; }
      if (!inp.value.trim()) { fb.textContent = 'כותבים מספר בתיבה ולוחצים "לבדוק".'; return; }
      var c = check(st, inp.value);
      if (c === -1) { fb.textContent = 'לא הבנתי את המספר. אפשר לכתוב למשל 12, ‎-3, 2.5 או 3/4.'; fb.className = 'mx-fb no'; return; }
      if (c === 2) { fb.textContent = 'נכון, אבל אפשר לצמצם עוד את השבר.'; fb.className = 'mx-fb no'; return; }
      if (answer(ix, j, c === 1, fb, f.querySelector('.mx-hint'))) { renderQ(ix, true); progress(); } else inp.select();
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-opt]'), f;
      if (b) { f = b.closest('form'); var ix = +f.closest('[data-ix]').dataset.ix, j = +f.dataset.step; if (answer(ix, j, +b.dataset.opt === items[ix].p.steps[j].a, f.querySelector('.mx-fb'), f.querySelector('.mx-hint'))) { renderQ(ix, true); progress(); } return; }
      b = e.target.closest('[data-hint]');
      if (b) { f = b.closest('form'); var key = f.closest('[data-ix]').dataset.ix + ':' + f.dataset.step; if (!hintOpen[key]) { hintOpen[key] = 1; S.hints++; save(SKEY, S); } f.querySelector('.mx-hint').hidden = false; return; }
      b = e.target.closest('[data-say]');
      if (b) { try { var u = new SpeechSynthesisUtterance(items[+b.dataset.say].steps.map(function (s) { return s.t; }).join(' ')); u.lang = 'he-IL'; u.rate = 0.95; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (er) {} }
    });
    function cell(inp) {
      if (!inp.value.trim()) return;
      var ix = +inp.closest('[data-ix]').dataset.ix, j = +inp.dataset.cell, st = items[ix].p.steps[j], c = check(st, inp.value), fb = $('dg-tfb' + ix);
      if (c === -1) { fb.textContent = 'לא הבנתי את המספר. כותבים למשל 3 או ‎-1.'; fb.className = 'mx-fb no'; return; }
      if (answer(ix, j, c === 1, fb, $('dg-thint' + ix))) {
        var nextJ = null; items[ix].p.steps.some(function (s2, k) { if (s2.tbl !== undefined && k > j && (logOf(ix)[k] === undefined || logOf(ix)[k] === null)) { nextJ = k; return true; } });
        renderQ(ix, false); progress();
        var nx = nextJ !== null ? $('dg-q' + ix).querySelector('[data-cell="' + nextJ + '"]') : $('dg-q' + ix).querySelector('input');
        if (nx) try { nx.focus({ preventScroll: true }); } catch (e) {}
      } else { inp.classList.add('no'); inp.select(); }
    }
    root.addEventListener('change', function (e) { if (e.target.dataset && e.target.dataset.cell !== undefined) cell(e.target); });
    root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.cell !== undefined) { e.preventDefault(); cell(e.target); } });

    var must = exs.filter(function (x) { return !x.bonus; });
    function stats() {
      var doneQ = 0, first = 0, all = 0, hard = [];
      items.forEach(function (it, ix) {
        if (it.k !== 'ex' || it.bonus) return;
        var l = logOf(ix), bad = 0; if (isDone(it, ix)) doneQ++;
        it.p.steps.forEach(function (s, j) { if (s.free) return; all++; if (l[j] === 1) first++; else if (l[j] === 0 || l[j] === 2) bad++; });
        if (bad >= 2) hard.push(it.n);
      });
      return { doneQ: doneQ, first: first, all: all, hard: hard, min: Math.max(1, Math.round((Date.now() - S.t0) / 60000)) };
    }
    var finished = false;
    function progress() {
      var z = stats(), doneSteps = 0;
      items.forEach(function (it, ix) { if (it.k === 'ex' && !it.bonus) logOf(ix).forEach(function (v) { if (v !== undefined && v !== null) doneSteps++; }); });
      $('dg-fill').style.width = Math.round(z.doneQ / must.length * 100) + '%';
      $('dg-cnt').textContent = z.doneQ + ' מתוך ' + must.length + ' שאלות';
      $('dg-time').textContent = '⏱ ' + z.min + ' דק׳ מתוך כ-' + sh.total;
      var allDone = z.doneQ === must.length;
      var txt = 'דף עבודה: ' + sh.name + ' (' + KIND[cfg.k] + ')\n' + (S.name ? 'שם: ' + S.name + '\n' : '') + 'סיימתי ' + z.doneQ + ' מתוך ' + must.length + ' שאלות\nצעדים נכונים בניסיון ראשון: ' + z.first + ' מתוך ' + z.all + '\n' + (cfg.a ? 'רמזים: ' + S.hints + '\n' : '') + 'זמן: כ-' + z.min + ' דקות' + (z.hard.length ? '\nשאלות שהיו לי קשות: ' + z.hard.join(', ') : '') + items.map(function (it, ix) { return it.own && S.free[ix] ? '\nשאלה ' + it.n + ' (מהמורה): ' + S.free[ix] : ''; }).join('');
      $('dg-end').innerHTML = '<h2>' + (allDone ? '🎉 סיימתם את הדף, כל הכבוד!' : 'לסיום') + '</h2><p>' + (allDone ? 'נכון בניסיון ראשון: <b>' + z.first + ' מתוך ' + z.all + '</b> צעדים · זמן: כ-' + z.min + ' דקות.' + (z.hard.length ? ' שווה לחזור על שאלות ' + z.hard.join(', ') + '.' : '') : 'אפשר לשלוח למורה סיכום גם באמצע: עד עכשיו ' + z.doneQ + ' מתוך ' + must.length + ' שאלות.') + '</p>' +
        '<label>השם שלי (נשלח רק בהודעה שלכם למורה)<input type="text" id="dg-name" maxlength="30" value="' + esc(S.name || '') + '"></label>' +
        '<div class="btns"><a class="btn btn-gold" id="dg-wa" href="https://wa.me/?text=' + encodeURIComponent(txt) + '" target="_blank" rel="noopener">📲 לשלוח סיכום למורה בווטסאפ</a><button class="btn btn-line btn-sm" type="button" id="dg-copy">להעתיק סיכום</button></div>';
      $('dg-name').addEventListener('change', function () { S.name = this.value.trim(); save(SKEY, S); progress(); });
      $('dg-wa').addEventListener('click', function () { used('student_wa', { topic: sh.t.id }); });
      $('dg-copy').addEventListener('click', function () { var b = this; if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { b.textContent = '✓ הועתק'; }); });
      if (allDone && !finished) { finished = true; used('student_finish', { topic: sh.t.id, kind: cfg.k }); }
    }
    items.forEach(function (it, ix) { if (it.k === 'ex') renderQ(ix, false); });
    progress(); save(SKEY, S);
    setInterval(function () { var z = stats(); $('dg-time').textContent = '⏱ ' + z.min + ' דק׳ מתוך כ-' + sh.total; }, 20000);
    $('dg-calc').addEventListener('click', function () { calc.open(this); });
    used('student_open', { topic: sh.t.id, kind: cfg.k });
    return true;
  }

  // =====================================================================
  //  מחשבון פשוט: ארבע פעולות, ריבוע, שורש וסוגריים. לא פותר משוואות.
  // =====================================================================
  var calc = (function () {
    var box = $('dc-box'), expr = '', from = null, justDone = false;
    var KEYS = ['7', '8', '9', '÷', '⌫', '4', '5', '6', '×', '(', '1', '2', '3', '−', ')', '0', '.', '±', '+', 'x²', 'C', '√', '='];
    var NAMES = { '÷': 'חלקי', '×': 'כפול', '−': 'פחות', '+': 'ועוד', '⌫': 'מחיקת תו', 'C': 'ניקוי', '±': 'פלוס מינוס', 'x²': 'בריבוע', '√': 'שורש', '=': 'שווה', '(': 'פתיחת סוגריים', ')': 'סגירת סוגריים', '.': 'נקודה' };
    $('dc-keys').innerHTML = KEYS.map(function (k) { return '<button type="button" data-k="' + k + '"' + (NAMES[k] ? ' aria-label="' + NAMES[k] + '"' : '') + ' class="' + (k === '=' ? 'eq' : /[0-9.]/.test(k) ? 'n' : 'op') + '">' + k + '</button>'; }).join('');
    function ev(s) {
      var i = 0;
      function expr0() { var v = term(); while (s[i] === '+' || s[i] === '−') { var o = s[i++], r = term(); v = o === '+' ? v + r : v - r; } return v; }
      function term() { var v = fact(); while (s[i] === '×' || s[i] === '÷' || s[i] === '(') { if (s[i] === '(') { v *= fact(); continue; } var o = s[i++], r = fact(); v = o === '×' ? v * r : v / r; } return v; }
      function fact() { if (s[i] === '−') { i++; return -fact(); } var v; if (s[i] === '√') { i++; v = Math.sqrt(base()); } else v = base(); while (s[i] === '²') { i++; v = v * v; } return v; }
      function base() { if (s[i] === '(') { i++; var v = expr0(); if (s[i] === ')') i++; return v; } var m = /^\d*\.?\d+/.exec(s.slice(i)); if (!m) throw new Error('x'); i += m[0].length; return +m[0]; }
      var v = expr0(); if (i < s.length) throw new Error('x'); return v;
    }
    function show(res) { $('dc-expr').textContent = expr || '0'; if (res !== undefined) $('dc-res').textContent = res; }
    function press(k) {
      if (k === 'C') { expr = ''; show(''); return; }
      if (k === '⌫') { expr = expr.slice(0, -1); show(''); return; }
      if (k === '=') {
        if (!expr) return;
        try { var v = ev(expr); if (!isFinite(v)) throw new Error('x'); v = +v.toPrecision(10); $('dc-res').textContent = '= ' + num(v); expr = String(v).replace('-', '−'); justDone = true; $('dc-expr').textContent = expr; used('calc'); }
        catch (e) { $('dc-res').textContent = 'התרגיל לא שלם. בודקים סוגריים וסימנים.'; }
        return;
      }
      if (justDone && /[0-9.(√]/.test(k)) expr = '';
      justDone = false;
      if (k === 'x²') expr += '²';
      else if (k === '±') expr = expr.charAt(0) === '−' ? expr.slice(1) : '−' + expr;
      else expr += k;
      show('');
    }
    $('dc-keys').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
    box.addEventListener('keydown', function (e) {
      var map = { '*': '×', '/': '÷', '-': '−', 'Enter': '=', 'Backspace': '⌫', 'Delete': 'C' }, k = map[e.key] || e.key;
      if (e.key === 'Escape') { close(); return; }
      if (KEYS.indexOf(k) > -1 && k !== 'C' || k === 'C' && e.key === 'Delete') { e.preventDefault(); press(k); }
    });
    function close() { box.hidden = true; if (from) from.focus(); }
    $('dc-x').addEventListener('click', close);
    show('');
    return { open: function (f) { from = f; box.hidden = false; box.querySelector('[data-k="7"]').focus(); }, ev: ev };
  })();

  // ---------- התחלה ----------
  var qs = new URLSearchParams(location.search), d = qs.get('d'), cfg0 = d ? decode(d) : null;
  if (cfg0) cfg0.q = ownDec(qs.get('q'));
  var kq = (qs.get('k') || '').replace(/[^0-9A-Za-z]/g, '');
  if (!cfg0 && kq.length === 8) {
    document.body.classList.add('dp-student');
    $('dp-build').hidden = true; $('dp-paper').hidden = true; $('dp-foot').hidden = true; $('dp-hero').hidden = true;
    var dg = $('dp-digital'); dg.hidden = false; dg.innerHTML = '<section class="panel"><p>פותחים את דף העבודה…</p></section>';
    fetch(SAPI + '/s/' + kq).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (j) {
      var o = JSON.parse(unb64u(j.d)), c = decode(o.d); if (!c) throw new Error('d');
      c.q = ownDec(o.q || '');
      if (!initDigital(c, String(o.c || '').slice(0, 40))) throw new Error('build');
    }).catch(function () {
      dg.innerHTML = '<section class="panel"><h2>לא הצלחנו לפתוח את הדף</h2><p>אולי אין כרגע אינטרנט, או שהקישור לא הועתק עד הסוף. נסו שוב בעוד רגע, או בקשו מהמורה לשלוח את הקישור שוב.</p><div class="btns"><a class="btn btn-gold" href="' + location.href.replace(/"/g, '') + '">לנסות שוב</a></div></section>';
    });
  } else if (!(cfg0 && initDigital(cfg0, (qs.get('c') || '').slice(0, 40)))) initBuilder();
  window.__dp = { sheetPayload: sheetPayload, unb64u: unb64u, ownEnc: ownEnc, ownDec: ownDec, linkOf: linkOf, T: T, build: build, decode: decode, encode: encode, paperHtml: paperHtml, calcEv: calc.ev, fmtAns: fmtAns, GR: GR, PRE: PRE, fits: fits }; // לבדיקות
})();
