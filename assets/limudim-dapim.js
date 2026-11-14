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
  var ORD = ['meunach', 'kefel', 'seder', 'hiluk', 'shetach', 'hashvaat-shvarim', 'shvarim', 'asroni', 'kefel-shvarim', 'memutza', 'achuzim', 'yachas', 'igul', 'gufim', 'mechuvanim', 'tzirim', 'zaviot', 'bituyim', 'shchiut', 'histabrut', 'pilug', 'mishvaa', 'chezkot', 'pitagoras', 'grafim', 'kav', 'i-shivyon', 'hafifa', 'maarechet', 'kefel-mekutzar', 'gorem-meshutaf', 'trinom', 'mechanim', 'shorashim', 'i-shivyon-ribui', 'parabola-tavla', 'merubaim'];
  var T = MX.T.concat(EXTRA), byId = {};
  T.forEach(function (t) { byId[t.id] = t; });
  T.sort(function (x, y) { var i = ORD.indexOf(x.id), j = ORD.indexOf(y.id); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); }); // יציב: נושאי הבגרות נשארים בסדר שלהם
  // באיזו כיתה לומדים כל נושא, לפי פריסות ההוראה של משרד החינוך (נבדק 14.11.2026):
  //  ב׳–ו׳: הצעות הפריסה של מדריכות המתמטיקה במחוז מרכז, לפי תוכנית הלימודים (meyda .../Merkaz/Mathematics/peiluyot/math[b,c,d,h,v]2022.pdf)
  //  ז׳–ט׳: פריסות ההוראה הארציות תשפ"ז (meyda .../matmatika/Chativat-Beynayim/tashpaz/prisa_7, prisa_8, prisa_9A, prisa_9B)
  //  י׳–י״ב: המלצות ההוראה תשפ"ז, תוכנית הלימודים החדשה (meyda .../Chativa-Elyona/mafmar/3-points, 4-points, 5-points-tashpaz.pdf)
  // מערך = הכיתות (לכל רמות היחידות). אובייקט = 0: כיתות ב׳–ט׳, 3/4/5: הכיתות בתיכון לפי מספר היחידות.
  var GR = { peulot: { 4: [10], 5: [10] }, regresia: { 4: [11] }, 'trig-yechida': { 5: [10, 11] }, thales: { 5: [10] }, 'chatchei-charut': { 5: [12] }, bernoulli: { 5: [11] }, 'tichnun-lineari': { 3: [12] }, 'i-shivyon-ribui': { 0: [9], 4: [10], 5: [10] },
    meunach: [2, 3, 4], 'hashvaat-shvarim': [4, 5], shchiut: { 0: [7, 8], 3: [10] }, grafim: { 0: [8, 9], 3: [10] }, hafifa: [8, 9], 'gorem-meshutaf': { 0: [9], 4: [10], 5: [10] }, igul: [6, 7], gufim: [6, 7, 8], mechuvanim: [7], tzirim: [7], zaviot: [7, 8], bituyim: [7], 'i-shivyon': [8, 9], 'kefel-mekutzar': { 0: [9], 4: [10], 5: [10] }, mechanim: [9], merubaim: { 0: [9], 3: [11] },
    kefel: [2, 3], seder: [3, 4, 5, 6], hiluk: [4, 5], shetach: [4, 5, 6, 7], shvarim: [4, 5, 6], asroni: [5, 6], 'kefel-shvarim': [6], memutza: [5, 6, 8],
    achuzim: { 0: [6, 8], 3: [10] }, yachas: { 0: [6, 8], 3: [11] }, histabrut: { 0: [7, 8, 9], 3: [10] }, pilug: [7, 9], mishvaa: [7, 8], chezkot: [7, 9], pitagoras: { 0: [7, 8, 9], 3: [10] },
    kav: { 0: [8, 9], 3: [10, 12] }, maarechet: [8, 9], tnua: { 0: [8, 9], 3: [10] }, dimyon: { 0: [8, 9], 3: [11], 4: [10], 5: [10] }, stiya: { 0: [8], 3: [10, 11], 4: [10, 11] },
    trinom: { 0: [9], 4: [10], 5: [10] }, shorashim: { 0: [9], 3: [10], 4: [10], 5: [10] }, 'parabola-tavla': { 0: [9], 3: [12], 4: [10], 5: [10] }, parabola: { 0: [9], 3: [12], 4: [10], 5: [10] }, etz: { 0: [9], 3: [11], 4: [10, 11], 5: [11] },
    // תיכון
    merchak: { 4: [10], 5: [10, 12] }, trigo: { 3: [11], 4: [10], 5: [10] }, nigzeret: { 4: [10], 5: [10] }, mashik: { 4: [10], 5: [10] }, kitzon: { 4: [10], 5: [10] }, 'shoresh-f': { 4: [10, 11], 5: [10] },
    maagal: { 4: [11], 5: [10, 12] }, 'zaviot-maagal': { 4: [11], 5: [10] }, sinusim: { 4: [11], 5: [10, 11] }, rationalit: { 4: [11], 5: [10, 11] }, integral: { 4: [11], 5: [11] }, normalit: { 3: [12], 4: [11] }, parametr: { 4: [11], 5: [11] },
    gdila: { 3: [11], 4: [12], 5: [12] }, sidra: { 4: [12], 5: [11] }, handasit: { 4: [12], 5: [11] }, induktzia: { 5: [11] }, 'trig-nigzeret': { 5: [11] },
    logaritm: { 4: [12], 5: [12] }, 'exp-ln': { 4: [12], 5: [12] }, vektor: { 4: [12], 5: [12] }, piramida: { 4: [12], 5: [12] }, merchav: { 4: [12], 5: [12] }, merukav: { 5: [12] },
    'nefach-sivuv': {} }; // לא מופיע בתוכנית החדשה: רק תחת "כל הנושאים"
  var GRN = { 2: 'ב׳', 3: 'ג׳', 4: 'ד׳', 5: 'ה׳', 6: 'ו׳', 7: 'ז׳', 8: 'ח׳', 9: 'ט׳', 10: 'י׳', 11: 'י״א', 12: 'י״ב' };
  // כל הכיתות של נושא (u: רק ברמת יחידות אחת)
  function grsOf(t, u) {
    var r = GR[t.id] || {}; if (Array.isArray(r)) return r;
    var a = (r[0] || []).slice(); [3, 4, 5].forEach(function (k) { if (!u || k === u) a = a.concat(r[k] || []); });
    return a.filter(function (g, i) { return a.indexOf(g) === i; }).sort(function (x, y) { return x - y; });
  }
  function grOf(t) { var a = grsOf(t); return a.length ? [a[0], a[a.length - 1]] : [12, 12]; }
  function fits(t, g, u) {
    var r = GR[t.id] || {}; if (Array.isArray(r)) return r.indexOf(g) > -1;
    return ((g < 10 ? r[0] : r[u]) || []).indexOf(g) > -1;
  }
  // מה כתוב בפריסה של משרד החינוך על כל נושא (מוצג מתחת לבחירת הנושא)
  var OFF = { peulot: 'י׳ 4–5 יח״ל: פעולות על פונקציות (הזזה, מתיחה, כיווץ, שיקוף), פונקציית ערך מוחלט', regresia: 'י״א 4 יח״ל: רגרסיה לינארית, דיאגרמת פיזור, מקדם מתאם',
    'trig-yechida': 'י׳–י״א 5 יח״ל: מעגל היחידה, זהויות ומשוואות טריגונומטריות, תכונות הפונקציות', thales: 'י׳ 5 יח״ל: משפט תאלס והרחבותיו, משפט חוצה זווית במשולש',
    'chatchei-charut': 'י״ב 5 יח״ל: פרבולה, אליפסה והיפרבולה כמקום גאומטרי', bernoulli: 'י״א 5 יח״ל: מאורעות רב שלביים ונוסחת ברנולי', 'tichnun-lineari': 'י״ב 3 יח״ל: תכנון לינארי (אשכול פיננסי-כלכלי)',
    'i-shivyon-ribui': 'ט׳: אי שוויון ריבועי בהקשר של פונקציה ריבועית · י׳ 4–5 יח״ל: פתרון אי שוויונות',
    'hashvaat-shvarim': 'ד׳: משמעויות השבר, שמות שונים לשבר, השוואה · ה׳: השוואת שברים בדרכים שונות, הרחבה וצמצום',
    shchiut: 'ז׳: איסוף, ייצוג וקריאת מידע, שכיחות, שכיחות יחסית (בלי ועם אחוזים) · ח׳: שכיחות יחסית, טווח ומדדי מרכז · י׳ 3 יח״ל: טבלת שכיחויות',
    grafim: 'ז׳: נקודות על גרף · ח׳: מבוא לפונקציות, פונקציות בייצוגים שונים, עלייה וירידה · ט׳ מצומצמת: קריאת גרפים',
    hafifa: 'ח׳: חפיפת משולשים, צלעות ותיכון במשולש, משולש שווה שוקיים · ט׳: משפטים הפוכים למשולש שווה שוקיים',
    'gorem-meshutaf': 'ט׳: פירוק לגורמים בעזרת הוצאת גורם משותף, פתרון משוואות ריבועיות בסיסיות בפירוק',
    meunach: 'ב׳: חיבור וחיסור במאונך · ג׳: בתחום הרבבה, כפל במאונך · ד׳: כפל במאונך',
    igul: 'ו׳: מעגל ועיגול, היקף המעגל ושטח העיגול · ז׳: שטח עיגול והיקף מעגל (ח׳: להשלים אם לא נלמד)',
    gufim: 'ו׳: נפח תיבה, גליל, חרוט, מנסרה · ז׳: קובייה ותיבה, מנסרה משולשת · ח׳: גליל וחרוט',
    mechuvanim: 'ז׳: הכרת השליליים ומספרים נגדיים, חיבור וחיסור, כפל וחילוק מספרים מכוונים',
    tzirim: 'ז׳: מערכת צירים ברביע הראשון, הרחבת מערכת הצירים, קטעים ושטחים במערכת צירים',
    zaviot: 'ז׳: סימון ומדידה, חוצה זווית, צמודות וקודקודיות, סכום זוויות במשולש ובמרובע · ח׳: מתחלפות ומתאימות בין מקבילים',
    bituyim: 'ז׳: המשתנה, ביטויים אלגבריים, הצבה, שוויון בין ביטויים (זהות)',
    'i-shivyon': 'ח׳: אי שוויונות · ט׳: אי שוויון ריבועי בהקשר של פונקציה ריבועית',
    'kefel-mekutzar': 'ט׳: חוק הפילוג המורחב, נוסחאות הכפל המקוצר, פירוק בהוצאת גורם משותף',
    mechanim: 'ט׳: שברים אלגבריים, משוואות עם פירוק לגורמים במכנה ותחום הצבה · ט׳ מצומצמת: משוואה עם מכנה מספרי',
    merubaim: 'ט׳: דלתון, טרפז, מקבילית, מלבן, מעוין וריבוע: תכונות ומשפטים הפוכים · י״א 3 יח״ל: תכונות מרובעים',
    kefel: 'ב׳: משמעות הכפל והחילוק, לוח הכפל עד 10×10 · ג׳: השלמה וביסוס של לוח הכפל',
    seder: 'ג׳–ד׳: סדר הפעולות והשימוש בסוגריים · ה׳–ו׳: סדר פעולות וחוקי הפעולות',
    hiluk: 'ד׳: חילוק ארוך כשהמחלק חד־ספרתי או עשרת שלמה · ה׳: ארבע הפעולות במספרים גדולים, חילוק עם שארית',
    shetach: 'ד׳: נוסחאות שטח והיקף מלבן · ה׳: שטח משולש ושטחי מצולעים · ו׳: מעגל ועיגול · ז׳: שטחים, חישוב היקפים',
    shvarim: 'ד׳: מכנים שווים או קרובים · ה׳: כשמכנה אחד כפולה של השני · ו׳: חיבור וחיסור שברים',
    asroni: 'ה׳: משמעות השבר העשרוני, חיבור וחיסור, השוואה · ו׳: כפל וחילוק מספרים עשרוניים',
    'kefel-shvarim': 'ו׳: כפל שבר בשבר כולל מספרים מעורבים, חילוק שברים פשוטים',
    memutza: 'ה׳–ו׳: חקר נתונים, משמעות הממוצע ותכונותיו · ח׳: טווח נתונים ומדדי מרכז',
    achuzim: 'ו׳: הכרת האחוז, חישוב ערך האחוז וחישוב האחוז · ח׳: אחוזים ושאלות מילוליות · י׳ 3 יח״ל: אחוזים',
    yachas: 'ו׳: יחס וקנה מידה · ח׳: יחס, פרופורציה וקנה מידה · י״א 3 יח״ל: יחס, פרופורציה, קנה מידה',
    histabrut: 'ז׳: הסתברות בהקשר של שכיחות יחסית · ח׳: הסתברות א׳–ב׳ · ט׳: מאורע משלים, מאורעות דו־שלביים',
    pilug: 'ז׳: כינוס איברים דומים וחוק הפילוג · ט׳: חוק הפילוג המורחב (עדיין לא במחולל)',
    mishvaa: 'ז׳: משוואה ממעלה ראשונה ושאלות בהקשרים · ח׳: משוואות ושאלות מילוליות (אחוזים, תנועה)',
    chezkot: 'ז׳: חזקות עם מעריך טבעי ושורש ריבועי · ט׳: חוקי חזקות (מעריך טבעי או אפס), חוקי שורש',
    pitagoras: 'ז׳: משפט פיתגורס ושימושיו (חדש בתוכנית תשפ״ז) · ח׳: פיתגורס, ופיתגורס במרחב · ט׳ מצומצמת',
    kav: 'ח׳: מבוא לפונקציות, שיפוע, ייצוג אלגברי של פונקציה קווית · ט׳ מצומצמת: פונקציה קווית',
    maarechet: 'ח׳: מערכת משוואות (רמה בסיסית), שאלות מילוליות · ט׳: מערכת משוואות ממעלה שנייה',
    tnua: 'ח׳–ט׳: שאלות מילוליות, כולל תנועה · י׳ 3 יח״ל: מהירות, זמן ודרך',
    dimyon: 'ח׳: דמיון משולשים · ט׳: יחסי שטחים במשולשים דומים · י׳ 4–5 יח״ל: שלושת משפטי הדמיון',
    stiya: 'ח׳: טווח ומדדי מרכז (ממוצע, שכיח, חציון) · י׳ 4 יח״ל, י״א 3 יח״ל: סטיית תקן',
    trinom: 'ט׳: פירוק טרינום (מקדם 1), נוסחאות הכפל המקוצר, משוואות בפירוק לגורמים',
    shorashim: 'ט׳: משוואה ריבועית בנוסחת השורשים',
    'parabola-tavla': 'ט׳: פונקציה ריבועית, קודקוד, הזזות, חיתוך עם הצירים',
    parabola: 'ט׳: פונקציה ריבועית בהצגה סטנדרטית ובהצגת מכפלה · י׳ 4–5 יח״ל: חזרה בקדם־אנליזה',
    etz: 'ט׳: מאורעות דו־שלביים, טבלה ודיאגרמת עץ · י׳ 4 יח״ל: הסתברות מותנית ועץ',
    merchak: 'י׳ 4–5 יח״ל: גאומטריה אנליטית, נקודות, קטעים וישרים', trigo: 'י׳ 4–5 יח״ל, י״א 3 יח״ל: סינוס, קוסינוס וטנגנס במשולש ישר זווית',
    nigzeret: 'י׳ 4–5 יח״ל: מושג הנגזרת, נגזרת פולינום', mashik: 'י׳ 4–5 יח״ל: משוואת משיק', kitzon: 'י׳ 4–5 יח״ל: חקירה ובעיות קיצון בפולינום',
    'shoresh-f': 'י׳ 4–5 יח״ל: פונקציית שורש ונגזרתה', maagal: 'י״א 4 יח״ל, י׳ 5 יח״ל: משוואת מעגל', 'zaviot-maagal': 'י״א 4 יח״ל, י׳ 5 יח״ל: זוויות מרכזיות והיקפיות',
    sinusim: 'י״א 4 יח״ל: משפט הסינוסים · י׳ 5 יח״ל: הסינוסים, הקוסינוסים ושטח משולש', rationalit: 'י״א 4 יח״ל, י׳ 5 יח״ל: פונקציה רציונלית',
    integral: 'י״א 4–5 יח״ל: פונקציה קדומה, אינטגרל וחישובי שטחים', normalit: 'י״א 4 יח״ל, י״ב 3 יח״ל: התפלגות נורמלית וציון תקן', parametr: 'י״א 4–5 יח״ל: משפחות פרמטריות של פונקציות',
    gdila: 'י״א 3 יח״ל, י״ב 4–5 יח״ל: גדילה ודעיכה', sidra: 'י״ב 4 יח״ל: סדרה חשבונית · י״א 5 יח״ל: מבוא לסדרות', handasit: 'י״ב 4 יח״ל, י״א 5 יח״ל: סדרה הנדסית',
    induktzia: 'י״א 5 יח״ל: אינדוקציה מתמטית', 'trig-nigzeret': 'י״א 5 יח״ל: נגזרת של פונקציות טריגונומטריות', logaritm: 'י״ב 4–5 יח״ל: לוגריתמים ומשוואות מעריכיות',
    'exp-ln': 'י״ב 4–5 יח״ל: נגזרת של פונקציה מעריכית ולוגריתמית', vektor: 'י״ב 4–5 יח״ל: וקטורים', piramida: 'י״ב 4–5 יח״ל: גופים במרחב, מנסרה ופירמידה',
    merchav: 'י״ב 4–5 יח״ל: גופים במרחב', merukav: 'י״ב 5 יח״ל: מספרים מרוכבים', 'nefach-sivuv': 'לא מופיע בהמלצות ההוראה של התוכנית החדשה (תשפ״ז)' };
  function offNote(id) { return OFF[id] ? 'בפריסת משרד החינוך: ' + OFF[id] : ''; }
  // נושאים קודמים שכדאי להזכיר בכל נושא (עד שלושה, מהקרוב לרחוק)
  var PRE = { peulot: ['parabola', 'kav', 'mechuvanim'], regresia: ['kav', 'stiya', 'memutza'], 'trig-yechida': ['trigo', 'pitagoras', 'sinusim'], thales: ['dimyon', 'yachas', 'mishvaa'], 'chatchei-charut': ['maagal', 'merchak', 'pitagoras'], bernoulli: ['etz', 'histabrut', 'chezkot'], 'tichnun-lineari': ['kav', 'maarechet', 'i-shivyon'], 'i-shivyon-ribui': ['shorashim', 'parabola', 'i-shivyon'], 'hashvaat-shvarim': ['kefel', 'hiluk'], shchiut: ['achuzim', 'shvarim', 'memutza'], grafim: ['tzirim', 'mishvaa', 'mechuvanim'], hafifa: ['zaviot', 'mishvaa', 'shetach'], 'gorem-meshutaf': ['kefel-mekutzar', 'pilug', 'chezkot'], meunach: ['kefel', 'seder'], igul: ['shetach', 'asroni', 'kefel-shvarim'], gufim: ['shetach', 'kefel', 'asroni'], mechuvanim: ['seder', 'asroni', 'shvarim'], tzirim: ['mechuvanim', 'shetach', 'seder'], zaviot: ['shetach', 'seder', 'mishvaa'], bituyim: ['seder', 'chezkot', 'mechuvanim'], 'i-shivyon': ['mishvaa', 'mechuvanim', 'pilug'], 'kefel-mekutzar': ['pilug', 'chezkot', 'mechuvanim'], mechanim: ['mishvaa', 'shvarim', 'pilug'], merubaim: ['zaviot', 'pitagoras', 'shetach'], hiluk: ['kefel'], seder: ['kefel', 'hiluk'], shetach: ['kefel', 'seder'], asroni: ['hiluk', 'seder', 'kefel'], shvarim: ['kefel', 'hiluk', 'seder'], 'kefel-shvarim': ['shvarim', 'kefel', 'hiluk'], memutza: ['hiluk', 'asroni', 'seder'], achuzim: ['asroni', 'kefel-shvarim', 'shvarim'], yachas: ['kefel-shvarim', 'shvarim', 'achuzim'], histabrut: ['shvarim', 'achuzim', 'yachas'], pilug: ['bituyim', 'mechuvanim', 'seder'], mishvaa: ['pilug', 'bituyim', 'mechuvanim'], chezkot: ['seder', 'kefel', 'pilug'], kav: ['tzirim', 'mishvaa', 'yachas'], pitagoras: ['chezkot', 'shetach', 'mishvaa'], maarechet: ['mishvaa', 'pilug', 'kav'], trinom: ['kefel-mekutzar', 'pilug', 'chezkot'], shorashim: ['trinom', 'chezkot', 'mishvaa'], 'parabola-tavla': ['chezkot', 'kav', 'mishvaa'], parabola: ['parabola-tavla', 'shorashim', 'kav'], sidra: ['mishvaa', 'pilug', 'memutza'], merchak: ['pitagoras', 'kav', 'memutza'], trigo: ['pitagoras', 'yachas', 'mishvaa'], gdila: ['achuzim', 'chezkot', 'asroni'], stiya: ['memutza', 'chezkot', 'achuzim'], nigzeret: ['chezkot', 'kav', 'pilug'], mashik: ['nigzeret', 'kav', 'mishvaa'], kitzon: ['nigzeret', 'shorashim', 'parabola'], integral: ['nigzeret', 'chezkot', 'shetach'], maagal: ['merchak', 'pitagoras', 'shorashim'], normalit: ['stiya', 'achuzim', 'memutza'], handasit: ['sidra', 'chezkot', 'yachas'], sinusim: ['trigo', 'pitagoras', 'shetach'], etz: ['histabrut', 'kefel-shvarim', 'shvarim'], tnua: ['mishvaa', 'maarechet', 'shorashim'], rationalit: ['nigzeret', 'shorashim', 'kitzon'], 'shoresh-f': ['nigzeret', 'chezkot', 'kitzon'], merchav: ['trigo', 'pitagoras', 'sinusim'], 'trig-nigzeret': ['nigzeret', 'trigo', 'kitzon'], piramida: ['merchav', 'trigo', 'pitagoras'], vektor: ['merchak', 'pitagoras', 'trigo'], merukav: ['shorashim', 'pilug', 'chezkot'], logaritm: ['chezkot', 'gdila', 'mishvaa'], 'exp-ln': ['nigzeret', 'logaritm', 'kitzon'], dimyon: ['yachas', 'pitagoras', 'mishvaa'], 'zaviot-maagal': ['dimyon', 'maagal', 'mishvaa'], parametr: ['shorashim', 'nigzeret', 'kitzon'], induktzia: ['sidra', 'pilug', 'chezkot'], 'nefach-sivuv': ['integral', 'chezkot', 'shetach'] };
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
  // גרסה רחבה: כל רצף בלי עברית שיש בו פעולה (y = x² − 6x, f(x) = ...) נשאר משמאל לימין בתוך משפט בעברית
  function mwx(h) { return h.replace(/[^֐-׿·:?!׳״]+/g, function (m) { var c = m.trim(); if (!c || !(/[=+\-−×÷^²³√∫\/]/.test(c) || /^\(.+,.+\)$/.test(c)) || !/[0-9a-zA-Z]/.test(c)) return m; var a = m.indexOf(c); return m.slice(0, a) + '<bdi dir="ltr">' + c + '</bdi>' + m.slice(a + c.length); }); }
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
          return { k: 'ex', own: true, mc: true, guided: false, lv: 1, min: x.m, p: { ex: '<span class="dp-own" dir="rtl">' + mwx(esc(x.t.trim())) + '</span>', fin: '<bdi>' + esc(op[at]) + '</bdi>',
            steps: [{ show: '', q: 'בוחרים את התשובה:', opts: op.map(function (z) { return '<bdi>' + esc(z) + '</bdi>'; }), a: at, hint: 'קוראים שוב את השאלה, לאט, ובודקים כל אחת מהתשובות.' }] } };
        }
        return { k: 'ex', own: true, guided: false, lv: 1, min: x.m, p: { ex: '<span class="dp-own" dir="rtl">' + mwx(esc(x.t.trim())) + '</span>', fin: x.a ? '<bdi>' + esc(x.a) + '</bdi>' : '',
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
  //  "דף לפי התיאור": המורה מתארת דף במילים שלה, השרת מחזיר בלוקים, וכאן בונים את הדף.
  //  את ערכי הטבלאות ואת הגרפים מחשבים כאן מהפונקציה עצמה, כך שאין בדף מספר שהדגם המציא.
  // =====================================================================
  // ביטוי בכתיב מחשב ("-x^2+3", "2(x-1)^2") -> פונקציה. רק x, מספרים, + - * / ^ וסוגריים.
  function fx(src) {
    var s = String(src || '').replace(/²/g, '^2').replace(/³/g, '^3').replace(/[−–]/g, '-').replace(/[·×]/g, '*').replace(/\s+/g, '').replace(/^y=/, '');
    if (!/^[x0-9+\-*/^().]{1,40}$/.test(s)) return null;
    var tk = s.match(/\d+(?:\.\d+)?|[x+\-*/^()]/g) || [], i = 0;
    function peek() { return tk[i]; }
    function expr() { var a = term(); while (peek() === '+' || peek() === '-') { var op = tk[i++], b = term(); a = (function (a, b, op) { return function (x) { return op === '+' ? a(x) + b(x) : a(x) - b(x); }; })(a, b, op); } return a; }
    function term() {
      var a = unary();
      while (peek() === '*' || peek() === '/' || peek() === 'x' || peek() === '(' || /^\d/.test(peek() || '')) {
        var op = peek() === '*' || peek() === '/' ? tk[i++] : '*', b = unary();
        a = (function (a, b, op) { return function (x) { return op === '*' ? a(x) * b(x) : a(x) / b(x); }; })(a, b, op);
      }
      return a;
    }
    function unary() { if (peek() === '-') { i++; var a = unary(); return function (x) { return -a(x); }; } if (peek() === '+') { i++; return unary(); } return power(); }
    function power() { var a = atom(); if (peek() === '^') { i++; var b = unary(); return function (x) { return Math.pow(a(x), b(x)); }; } return a; }
    function atom() {
      var t = tk[i++];
      if (t === 'x') return function (x) { return x; };
      if (t === '(') { var a = expr(); if (tk[i++] !== ')') throw 0; return a; }
      if (/^\d/.test(t || '')) { var v = +t; return function () { return v; }; }
      throw 0;
    }
    try { var f = expr(); return i === tk.length ? f : null; } catch (e) { return null; }
  }
  function fxNum(v) { var r = Math.round(v * 100) / 100; return r === 0 ? '0' : num(r); }
  // כתיב מחשב -> כתיב של דף: x^2 -> x², 2*x -> 2x, מינוס אמיתי
  function pm(s) {
    return String(s).replace(/\^2(?![0-9])/g, '²').replace(/\^3(?![0-9])/g, '³').replace(/\^\(([^()]{1,12})\)/g, '<sup>$1</sup>').replace(/\^(-?[0-9a-z]+)/g, '<sup>$1</sup>')
      .replace(/(\d)\s*\*\s*(?=[a-z(])/g, '$1').replace(/\s*\*\s*/g, ' · ');
  }
  function fnShow(f) { return 'y = ' + pm(String(f).replace(/([+\-])/g, ' $1 ').replace(/^\s*-\s*/, '-').replace(/\(\s*-\s*/g, '(-').replace(/\s+/g, ' ').trim()).replace(/-/g, '−'); }
  // טקסט מהדגם -> HTML בטוח: בורחים, כתיב מתמטי, וכיוון שמאל-לימין לקטעי מתמטיקה בתוך עברית
  // מפרק טקסט לקטעי עברית וקטעי מתמטיקה (קטע מתמטיקה נכתב משמאל לימין, בלי לגנוב סוגריים או נקודה מהמשפט)
  function mruns(raw, seg) { // מפרק טקסט לקטעי עברית וקטעי מתמטיקה; seg(text, isMath)
    var s = String(raw), out = '', at = 0, re = /[A-Za-z0-9()+\-−=·×÷*\/^²³√<>≤≥≠.,|→←∞π_ ]+/g, m;
    while ((m = re.exec(s))) {
      var a = m.index, b = a + m[0].length, t;
      while (a < b && /[\s.,:;!?]/.test(s[a])) a++;
      while (b > a && /[\s.,:;!?(]/.test(s[b - 1])) b--;
      if (a < b && s[a] === '-' && a > 0 && /[\u0590-\u05FF]/.test(s[a - 1])) a++;
      for (var k = 0; k < 3; k++) {
        t = s.slice(a, b);
        var o = (t.match(/\(/g) || []).length, c = (t.match(/\)/g) || []).length;
        if (c > o && t[t.length - 1] === ')') b--; else if (c > o && t[0] === ')') a++; else if (o > c && t[0] === '(') a++; else if (o > c && t[t.length - 1] === '(') b--; else break;
      }
      t = s.slice(a, b);
      if (!t || !(/[=+×÷^²³√<>≤≥≠→·]/.test(t) || /.-./.test(t) || /^-?\d/.test(t) && /[a-z]/i.test(t) || /^\(.+,.+\)$/.test(t))) continue;
      out += seg(s.slice(at, a), false) + seg(t, true); at = b;
    }
    return out + seg(s.slice(at), false);
  }
  function tx(s) { return mruns(s, function (t, m) { return m ? '<bdi dir="ltr">' + pm(esc(t)) + '</bdi>' : pm(esc(t)); }); }
  function mline(s) { return String(s).split(/\s;\s/).map(function (z) { return '<div class="dp-xm" dir="ltr">' + pm(esc(z.trim())).replace(/-/g, '−') + '</div>'; }).join(''); }
  // מערכת צירים בטווח נתון; draw = פונקציות שמצוירות
  function axesSvg(g, draw) {
    var x0 = Math.min(0, Math.floor(g.xmin)), x1 = Math.max(0, Math.ceil(g.xmax)), y0 = Math.min(0, Math.floor(g.ymin)), y1 = Math.max(0, Math.ceil(g.ymax));
    var sy = y1 - y0 <= 16 ? 1 : y1 - y0 <= 32 ? 2 : 5; y0 = Math.floor(y0 / sy); y1 = Math.ceil(y1 / sy);
    var sx = x1 - x0 <= 16 ? 1 : 2;
    var C = 22, mx = 22, my = 18, W = (x1 - x0) * C + mx * 2, H = (y1 - y0) * C + my * 2;
    var X = function (x) { return mx + (x - x0) * C; }, Y = function (y) { return my + (y1 - y / sy) * C; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dp-grid" direction="ltr" style="max-width:' + Math.round(W * 1.15) + 'px" role="img" aria-label="מערכת צירים">', k;
    for (k = x0; k <= x1; k++) s += '<path d="M' + X(k) + ' ' + my + ' V' + (H - my) + '" class="gl"/>' + (k && k % sx === 0 ? '<text x="' + X(k) + '" y="' + (Y(0) + 12) + '" class="gt" text-anchor="middle">' + num(k) + '</text>' : '');
    for (k = y0; k <= y1; k++) s += '<path d="M' + mx + ' ' + Y(k * sy) + ' H' + (W - mx) + '" class="gl"/>' + (k && k < y1 ? '<text x="' + (X(0) - 4) + '" y="' + (Y(k * sy) + 3.5) + '" class="gt" text-anchor="end">' + num(k * sy) + '</text>' : '');
    s += '<path d="M' + mx + ' ' + Y(0) + ' H' + (W - mx) + ' M' + X(0) + ' ' + my + ' V' + (H - my) + '" class="ga"/><text x="' + (W - mx + 5) + '" y="' + (Y(0) + 4) + '" class="gt">x</text><text x="' + X(0) + '" y="' + (my - 5) + '" class="gt" text-anchor="middle">y</text>';
    var cols = ['#3f8fc4', '#c0552b', '#2e8b57', '#8a4fbf', '#c9972f', '#555'];
    (draw || []).forEach(function (src, j) {
      var f = fx(src); if (!f) return;
      var d = '', on = false;
      for (var x = x0; x <= x1 + 1e-9; x += 0.05) {
        var y = f(x), ok = isFinite(y) && y / sy >= y0 - 0.02 && y / sy <= y1 + 0.02;
        if (ok) { d += (on ? ' L' : ' M') + X(x).toFixed(1) + ' ' + Y(y).toFixed(1); on = true; } else on = false;
      }
      s += '<path d="' + d + '" class="gc" style="stroke:' + cols[j % cols.length] + '"/>';
    });
    return s + '</svg>';
  }
  // "שרטטו את y = x² + 1" -> ["x^2+1"]: כשהדגם לא מילא key, לוקחים את הפונקציות מתוך ההוראה
  function fnsInText(t) {
    var out = [], m, re = /y\s*=\s*([−\-+x0-9²³^*·().\s]{1,30})/g;
    while ((m = re.exec(String(t || '')))) { var f = m[1].replace(/[\s.]+$/, '').trim(); if (/x/.test(f) && fx(f)) out.push(f.replace(/\s+/g, '')); }
    return out;
  }
  var HEL = 'אבגדהוזחטיכלמנסעפצקרשת';
  function dafTblHtml(b, full) {
    var f = fx(b.fn);
    return '<table class="dp-tbl fill" dir="ltr"><tr><th>x</th>' + b.xs.map(function (x) { return '<td>' + fxNum(x) + '</td>'; }).join('') + '</tr><tr><th>y</th>' + b.xs.map(function (x, j) {
      return '<td>' + (full || j < b.given ? (j < b.given && !full ? '<b>' : '') + fxNum(f(x)) + (j < b.given && !full ? '</b>' : '') : '') + '</td>';
    }).join('') + '</tr></table>';
  }
  // בלוקים -> רשימת פריטים לדף: טבלה ואחריה גרף באותה פונקציה נכנסים לאותה תיבה, עם מספר אחד
  function dafItems(doc) {
    var items = [], n = 0, bs = doc.blocks || [];
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.type === 'table' && !fx(b.fn)) continue;
      if (b.type === 'table') {
        var g = bs[i + 1] && bs[i + 1].type === 'graph' ? bs[++i] : null;
        if (g && !g.key.length && !g.fns.length) g = Object.assign({}, g, { key: fnsInText(g.text).length ? fnsInText(g.text) : [b.fn] });
        items.push({ k: 'table', b: b, g: g, n: ++n }); continue;
      }
      if (b.type === 'graph') {
        var key = b.key.length ? b.key : b.fns.length ? [] : fnsInText(b.text);
        items.push({ k: 'graph', b: b, key: key, n: (key.length || !b.fns.length) ? ++n : 0 }); continue;
      }
      if (b.type === 'task' || b.type === 'fill' || b.type === 'lines') { items.push({ k: b.type, b: b, n: ++n }); continue; }
      items.push({ k: b.type, b: b });
    }
    // כמה גרפים לשרטוט ברצף -> רשת של שניים בשורה
    return items;
  }
  function dafQ(it, inner) { return '<section class="dp-q dp-xq">' + (it.n ? '<div class="dp-qh"><span class="dp-n">' + it.n + '</span>' + (it.b.text ? '<span class="dp-xt">' + tx(it.b.text) + '</span>' : '') + '</div>' : it.b.text ? '<p class="dp-xt">' + tx(it.b.text) + '</p>' : '') + inner + '</section>'; }
  function dafPaperHtml(doc, o) {
    var items = dafItems(doc), nq = items.filter(function (x) { return x.n; }).length, h = '<article class="dp-paper dp-xpaper st-' + o.style + (o.font ? ' big' : '') + '"' + (o.edit ? ' contenteditable="true" spellcheck="false"' : '') + '>';
    h += '<header class="dp-ph"><div class="dp-pt"><span class="dp-kind">דף עבודה · מתמטיקה' + (doc.grade ? ' · כיתה ' + esc(doc.grade) : '') + '</span><h2>' + tx(doc.title) + '</h2>' + (o.title ? '<p class="dp-sub">' + esc(o.title) + '</p>' : '') +
      '<p class="dp-name">שם: <span class="sb w"></span> תאריך: <span class="sb"></span></p></div></header>';
    h += '<div class="dp-strip">' + (doc.minutes && o.time ? '<span>⏱ כ-' + doc.minutes + ' דקות</span>' : '') + '<span>' + nq + ' משימות</span>' + (o.stars ? '<span class="dp-stars" aria-label="כוכב לכל משימה">' + items.filter(function (x) { return x.n; }).map(function () { return '☆'; }).join('') + '</span><span class="dp-strip-n">צובעים כוכב אחרי כל משימה</span>' : '') + '</div>';
    if (doc.intro) h += '<p class="dp-xintro">' + tx(doc.intro) + '</p>';
    for (var i = 0; i < items.length; i++) {
      var it = items[i], b = it.b;
      if (it.k === 'part') h += '<h3 class="dp-xpart">' + tx(b.text || '') + '</h3>';
      else if (it.k === 'explain') h += '<div class="dp-xexp">' + (b.text ? '<p>' + tx(b.text) + '</p>' : '') + (b.math ? mline(b.math) : '') + '</div>';
      else if (it.k === 'note') h += '<div class="dp-xnote"><span aria-hidden="true">⚠️</span><div>' + (b.text ? '<p>' + tx(b.text) + '</p>' : '') + (b.math ? mline(b.math) : '') + '</div></div>';
      else if (it.k === 'task') h += dafQ(it, '<ol class="dp-xitems">' + b.items.map(function (x, j) {
        return '<li><span class="dp-xl">' + HEL[j % HEL.length] + '.</span><span class="dp-xiq">' + tx(x.q.replace(/_{3,}/g, '﹍')).replace(/﹍/g, '<span class="sb"></span>') + (b.n ? '' : (/_{3,}/.test(x.q) ? '' : ' <span class="sb w"></span>')) + '</span>' + (b.n ? '<div class="dp-xlines" style="height:' + b.n * 8.5 + 'mm"></div>' : '') + '</li>';
      }).join('') + '</ol>');
      else if (it.k === 'fill') h += dafQ(it, '<ol class="dp-xitems">' + b.items.map(function (x, j) {
        return '<li><span class="dp-xl">' + HEL[j % HEL.length] + '.</span><span class="dp-xiq">' + tx(x.q.replace(/_{2,}/g, '﹍')).replace(/﹍/g, '<span class="sb"></span>') + (/_{2,}/.test(x.q) ? '' : ' <span class="sb w"></span>') + '</span></li>';
      }).join('') + '</ol>');
      else if (it.k === 'lines') h += dafQ(it, '<div class="dp-xlines" style="height:' + b.n * 8.5 + 'mm"></div>');
      else if (it.k === 'table') h += dafQ(it, (it.g && it.g.text ? '<p class="dp-eg">' + tx(it.g.text) + '</p>' : '') + '<div class="dp-tw">' + dafTblHtml(b, false) + (it.g ? axesSvg(it.g, it.g.fns) : '') + '</div>');
      else if (it.k === 'graph') {
        // גרפים לשרטוט ברצף: שניים בשורה
        var run = [it]; while (items[i + 1] && items[i + 1].k === 'graph' && items[i + 1].n && it.n) run.push(items[++i]);
        if (run.length > 1) h += '<div class="dp-xgrid">' + run.map(function (r) { return dafQ(r, axesSvg(r.b, r.b.fns)); }).join('') + '</div>';
        else h += dafQ(it, axesSvg(b, b.fns));
      }
    }
    if (o.feel) h += '<section class="dp-feel"><b>איך הרגשתי עם הדף?</b><span>😀 הבנתי הכול</span><span>🙂 הבנתי את הרוב</span><span>🤔 צריך עוד הסבר</span><span class="dp-feel-q">מה עוד לא ברור לי: <span class="sb w"></span></span></section>';
    h += '<footer class="dp-pf">טעות היא חלק מהלימוד. ממשיכים הלאה 💪 &nbsp;·&nbsp; דף מ"הכלים של גילעד רחמים", חינם: <bdi dir="ltr">hakelim.com/limudim/dapim</bdi></footer></article>';
    if (o.key) {
      h += '<article class="dp-paper dp-keyp dp-xpaper st-' + o.style + '"' + (o.edit ? ' contenteditable="true" spellcheck="false"' : '') + '><header class="dp-ph"><div class="dp-pt"><span class="dp-kind">דף תשובות למורה</span><h2>' + tx(doc.title) + '</h2></div></header><ol class="dp-key dp-xkey">';
      items.forEach(function (it) {
        if (!it.n) return;
        var b = it.b, a = '';
        if (it.k === 'task' || it.k === 'fill') a = b.items.map(function (x, j) { return '<span class="dp-xka"><b>' + HEL[j % HEL.length] + '.</b> ' + (x.a ? tx(x.a) : '—') + '</span>'; }).join('');
        else if (it.k === 'table') a = dafTblHtml(b, true) + (it.g && it.g.key.length ? axesSvg(it.g, it.g.fns.concat(it.g.key)) : '');
        else if (it.k === 'graph') a = (it.key.length ? '<span class="dp-xka">' + it.key.map(function (f) { return '<bdi dir="ltr">' + fnShow(f) + '</bdi>'; }).join(' , ') + '</span>' : '') + axesSvg(b, b.fns.concat(it.key));
        else a = '<span class="dp-xka">תשובה פתוחה</span>';
        h += '<li class="dp-xk' + (it.k === 'graph' || it.k === 'table' ? ' g' : '') + '"><b>' + it.n + '.</b> ' + a + '</li>';
      });
      h += '</ol></article>';
    }
    return h;
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
    // שלוש קבוצות לכל כיתה: השנה, שנה שעברה (לחזרה) ושנה הבאה (לתלמידים חזקים). "כל הנושאים" פותח את כל השאר
    function groups(g, u) {
      var now = T.filter(function (t) { return fits(t, g, u); });
      var prev = g > 2 ? T.filter(function (t) { return now.indexOf(t) < 0 && fits(t, g - 1, u); }) : [];
      var next = g < 12 ? T.filter(function (t) { return now.indexOf(t) < 0 && prev.indexOf(t) < 0 && fits(t, g + 1, g === 9 ? 4 : u); }) : []; // אחרי ט׳: הנושאים של י׳ ברמת 4 יח״ל, אליה מכוונת פריסת ט׳ הרגילה
      var near = now.concat(prev, next);
      return { now: now, prev: prev, next: next, near: near, rest: T.filter(function (t) { return near.indexOf(t) < 0; }) };
    }
    function fillTopics(keep) {
      var g = +gs.value, u = +$('dp-units').value; $('dp-units-w').hidden = g < 10;
      var G = groups(g, u), sel = $('dp-topic'), was = keep || sel.value, all = $('dp-all');
      if (keep && byId[keep] && G.near.indexOf(byId[keep]) < 0) all.checked = true; // דף שמור או קישור בנושא רחוק: לא מאבדים אותו
      var nowL = 'הנושאים של כיתה ' + GRN[g] + (g >= 10 ? ', ' + u + ' יח״ל' : '');
      sel.innerHTML = (G.now.length ? '<optgroup label="' + nowL + '">' + G.now.map(opt).join('') + '</optgroup>' : '') +
        (G.prev.length ? '<optgroup label="מכיתה ' + GRN[g - 1] + ', לחזרה">' + G.prev.map(opt).join('') + '</optgroup>' : '') +
        (G.next.length ? '<optgroup label="מכיתה ' + GRN[g + 1] + ', למתקדמים">' + G.next.map(opt).join('') + '</optgroup>' : '') +
        (all.checked && G.rest.length ? '<optgroup label="כל שאר הנושאים">' + G.rest.map(opt).join('') + '</optgroup>' : '');
      var shown = all.checked ? T : G.near;
      if (was && byId[was] && shown.indexOf(byId[was]) > -1 && (keep || all.checked || G.near.indexOf(byId[was]) > -1)) sel.value = was; else sel.value = (G.now[G.now.length - 1] || G.near[0] || T[0]).id;
      $('dp-topic-note').textContent = all.checked ? 'מוצגים כל ' + T.length + ' הנושאים: קודם של כיתה ' + GRN[g] + ', שנה לפני ושנה אחרי, ואחריהם כל השאר.' :
        'מוצגים הנושאים של כיתה ' + GRN[g] + ' לפי פריסת ההוראה של משרד החינוך, ולצידם נושאים של שנה לפני (לחזרה) ושל שנה אחרי (למתקדמים). רוצים נושא אחר? מסמנים "להציג את כל הנושאים".';
      offShow();
    }
    // מתחת לבחירת הנושא: מה כתוב עליו בפריסת משרד החינוך
    function offShow() {
      var n = $('dp-topic-off'), w = $('dp-topic-note');
      if (!n && w) { n = document.createElement('p'); n.id = 'dp-topic-off'; n.className = w.className; n.style.marginTop = '.25rem'; w.parentNode.insertBefore(n, w.nextSibling); }
      if (n) { var s = offNote($('dp-topic').value); n.textContent = s ? '📘 ' + s : ''; n.hidden = !s; }
    }
    function fillRevs(keep, keepX) {
      var g = +gs.value, tid = $('dp-topic').value, pre = PRE[tid] || [];
      var G = groups(g, +$('dp-units').value), allOn = $('dp-all').checked;
      var pool = T.filter(function (t) { return t.id !== tid && (allOn || G.near.indexOf(t) > -1 || pre.indexOf(t.id) > -1 || (keep && keep.indexOf(t.id) > -1) || (keepX && keepX.indexOf(t.id) > -1)); });
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
    // 5 שאלות מוצעות לבחירה, מכל נושא: תרגילים מהמחולל, ובנושאים שיש להם בנק בכיתה משחקת (assets/kita-bank.json) גם שאלות אמריקאיות משם
    var bank = null, sug = [], BANK_OF = { shvarim: 'shevarim', achuzim: 'achuzim', mishvaa: 'mishvaot', kefel: 'kefel', shetach: 'shetach', chezkot: 'chezkot' };
    function plain(h) { // שבר -> 3/4 (או (x+1)/2), חזקה -> ^, ואז טקסט
      var d = document.createElement('div'); d.innerHTML = String(h || '').replace(/<br\s*\/?>/gi, ' · ');
      [].slice.call(d.querySelectorAll('.fr')).reverse().forEach(function (f) { /* מהפנימי החוצה */ var p = f.children, w = function (s) { s = s.trim(); return /^[−-]?[\w.]+$/.test(s) ? s : '(' + s + ')'; }; if (p.length === 2) f.textContent = w(p[0].textContent) + '/' + w(p[1].textContent); });
      d.querySelectorAll('sub').forEach(function (s) { var t = s.textContent.trim(); s.textContent = /^\d+$/.test(t) ? t.replace(/\d/g, function (c) { return '₀₁₂₃₄₅₆₇₈₉'[c]; }) : '_' + t; });
      d.querySelectorAll('sup').forEach(function (s) { var t = s.textContent.trim(), m = { '2': '²', '3': '³' }[t]; s.textContent = m || '^' + (/^\w+$/.test(t) ? t : '(' + t + ')'); });
      return d.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').replace(/^ · | · $/g, '').trim(); }
    function genQ(tp, lv) { // תרגיל מהמחולל -> שאלה משלי (טקסט פשוט, תשובה מלאה לדף המורה)
      var p = tp.gen(lv), last = p.steps && p.steps[p.steps.length - 1];
      var a = plain(p.fin) || (last ? plain(String(last.a)) : '');
      var t = plain(p.ex); if (!/[֐-׿]/.test(t)) t = 'פתרו: ' + t;
      return { t: t.slice(0, 300), a: a.slice(0, 80), m: Math.min(20, cost(p, false)), o: [] };
    }
    function bankTopics() { // אותה רשימה כמו בבחירת הנושא: השנה, שנה לפני, שנה אחרי (או הכול)
      var g = +gs.value, G = groups(g, +$('dp-units').value), list = $('dp-all').checked ? G.near.concat(G.rest) : G.near, cur = $('dp-bank-t').value || $('dp-topic').value;
      $('dp-bank-t').innerHTML = list.map(opt).join('');
      $('dp-bank-t').value = list.indexOf(byId[cur]) > -1 ? cur : list[0].id;
    }
    function suggest() {
      var tp = byId[$('dp-bank-t').value]; if (!tp) return;
      var lv = +$('dp-bank-lv').value, have = ownQ.map(function (x) { return x.t; }), out = [], seen = {}, i;
      var bt = bank && BANK_OF[tp.id] && bank.topics.filter(function (x) { return x.id === BANK_OF[tp.id]; })[0];
      if (bt) {
        var pool = bt.q.map(lineQ).filter(function (x) { return x && have.indexOf(x.t) < 0; });
        for (i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
        pool.slice(0, 2).forEach(function (x) { x.src = 'bank'; out.push(x); seen[x.t] = 1; });
      }
      for (i = 0; out.length < 5 && i < 40; i++) { var q = genQ(tp, lv); if (q.t && !seen[q.t] && have.indexOf(q.t) < 0) { seen[q.t] = 1; out.push(q); } }
      sug = out;
      $('dp-sug').innerHTML = '<legend class="sr-only">שאלות מוצעות על ' + esc(tp.name) + '</legend>' + sug.map(function (x, k) {
        return '<label class="dp-sq"><input type="checkbox" data-k="' + k + '" checked><span><span class="q" dir="rtl">' + '<b>' + (k + 1) + '.</b> <bdi>' + mwx(esc(x.t)) + '</bdi>' +(x.src ? '<span class="tg">אמריקאית</span>' : '') + '</span>' +
          (x.a ? '<span class="a" dir="rtl">תשובה: ' + mwx(esc(x.a)) +'</span>' : '') + '</span></label>';
      }).join('');
      $('dp-bank-msg').textContent = 'כל 5 השאלות מסומנות. מורידים את הסימון ממה שלא מתאים, ולוחצים "להוסיף את המסומנות לדף".';
    }
    $('dp-bank-open').addEventListener('click', function () {
      var b = this; b.disabled = true;
      function show() { $('dp-bank').hidden = false; b.hidden = true; bankTopics(); suggest(); $('dp-bank-t').focus(); used('suggest_open'); }
      fetch('/assets/kita-bank.json').then(function (r) { if (!r.ok) throw new Error('bank'); return r.json(); }).then(function (j) { bank = j; show(); }).catch(show); // בלי הבנק עדיין יש תרגילים מהמחולל
    });
    $('dp-bank-t').addEventListener('change', suggest);
    $('dp-bank-lv').addEventListener('change', suggest);
    $('dp-bank-more').addEventListener('click', function () { suggest(); used('suggest_more'); });
    $('dp-bank-allq').addEventListener('click', function () { var bx = $('dp-sug').querySelectorAll('input'), on = [].some.call(bx, function (x) { return !x.checked; }); bx.forEach(function (x) { x.checked = on; }); this.textContent = on ? 'להוריד את כל הסימונים' : 'לסמן הכול'; });
    $('dp-bank-go').addEventListener('click', function () {
      var pick = [].filter.call($('dp-sug').querySelectorAll('input'), function (x) { return x.checked; }).map(function (x) { var s = sug[+x.dataset.k]; return { t: s.t, a: s.a, m: s.m, o: s.o || [] }; });
      if (!pick.length) { $('dp-bank-msg').textContent = 'לא סומנה אף שאלה. מסמנים לפחות אחת.'; return; }
      var n = addMany(pick, 'suggest_add'), tp = byId[$('dp-bank-t').value];
      if (!n) { $('dp-bank-msg').textContent = 'אין מקום לעוד שאלות (עד ' + OWN_MAX + '). מסירים כמה ומנסים שוב.'; return; }
      suggest();
      $('dp-bank-msg').textContent = '✓ נוספו ' + n + ' שאלות על ' + tp.name + '. הן בסוף הדף, עם התשובות בדף המורה, ואפשר לערוך אותן למעלה. למטה עוד 5 הצעות חדשות.';
    });
    $('dp-only').addEventListener('change', render);

    // ---------------------------------------------------------------------
    //  "ספרו במילים שלכם": תיאור חופשי (כתוב או מוקלט) -> 3 דפים לבחירה. הכול בדפדפן, בלי שרת
    // ---------------------------------------------------------------------
    var SYN = { peulot: ['הזזה', 'הזזות', 'שיקוף', 'מתיחה', 'ערך מוחלט', 'פעולות על פונקציות'], regresia: ['רגרסיה', 'מתאם', 'דיאגרמת פיזור', 'קו רגרסיה'],
      'trig-yechida': ['מעגל היחידה', 'זהויות טריגונומטריות', 'משוואות טריגונומטריות', 'פונקציות טריגונומטריות'], thales: ['תאלס', 'משפט תאלס', 'חוצה זווית'],
      'chatchei-charut': ['אליפסה', 'היפרבולה', 'חתכי חרוט', 'מוקד', 'מדריך'], bernoulli: ['ברנולי', 'נוסחת ברנולי', 'התפלגות בינומית'], 'tichnun-lineari': ['תכנון לינארי', 'תכנון ליניארי', 'רווח מקסימלי'],
      'i-shivyon-ribui': ['אי שוויון ריבועי', 'אי שוויונות ריבועיים'],
      'hashvaat-shvarim': ['השוואת שברים', 'צמצום', 'הרחבה', 'שבר גדול', 'צמצום שברים'], shchiut: ['שכיחות', 'שכיחות יחסית', 'שכיח', 'טבלת שכיחויות'],
      grafim: ['קריאת גרפים', 'קריאת גרף', 'מבוא לפונקציות', 'טבלת ערכים', 'עלייה וירידה'], hafifa: ['חפיפה', 'חפיפת משולשים', 'משולשים חופפים', 'שווה שוקיים', 'משולש שווה שוקיים'],
      'gorem-meshutaf': ['גורם משותף', 'הוצאת גורם משותף', 'פירוק לגורמים'],
      mechuvanim: ['מספרים מכוונים', 'מכוונים', 'מספרים שליליים', 'שליליים', 'מספר נגדי', 'ערך מוחלט'], zaviot: ['זוויות', 'זווית', 'צמודות', 'קודקודיות', 'מתחלפות', 'מתאימות', 'סכום זוויות'],
      bituyim: ['ביטויים אלגבריים', 'ביטוי אלגברי', 'הצבה', 'הצבות', 'משתנה'], tzirim: ['מערכת צירים', 'צירים', 'נקודות במישור', 'שיעורי נקודה', 'רביע'], 'kefel-mekutzar': ['כפל מקוצר', 'נוסחאות הכפל המקוצר', 'פילוג מורחב', 'חוק הפילוג המורחב'],
      'i-shivyon': ['אי שוויון', 'אי שוויונות', 'אי-שוויון', 'אי-שוויונות'], mechanim: ['משוואות עם מכנה', 'משוואה עם מכנה', 'מכנים', 'שברים אלגבריים', 'משוואה עם שברים', 'תחום הצבה'],
      gufim: ['נפח', 'תיבה', 'מנסרה', 'גליל', 'חרוט', 'גופים', 'שטח פנים', 'קובייה'], merubaim: ['מרובעים', 'מקבילית', 'מעוין', 'מעויין', 'טרפז', 'דלתון', 'ריבוע'],
      igul: ['היקף מעגל', 'שטח עיגול', 'עיגול', 'פאי', 'רדיוס', 'קוטר'], meunach: ['במאונך', 'חיבור במאונך', 'חיסור במאונך', 'כפל במאונך', 'פריטה', 'המרה'],
      kefel: ['לוח הכפל', 'לוח כפל', 'כפל'], hiluk: ['חילוק ארוך', 'חילוק'], seder: ['סדר פעולות'], shetach: ['שטח', 'היקף'], asroni: ['עשרוני'],
      shvarim: ['חיבור שברים', 'חיסור שברים', 'שברים', 'שבר', 'מכנה משותף'], 'kefel-shvarim': ['כפל שברים', 'חילוק שברים'], memutza: ['ממוצע'], achuzim: ['אחוז', 'הנחה'],
      yachas: ['יחס', 'פרופורציה'], histabrut: ['הסתברות', 'קובי', 'מטבע'], pilug: ['סוגריים', 'כינוס', 'חוק הפילוג', 'פילוג'], mishvaa: ['משוואה עם נעלם', 'משוואות', 'משוואה', 'נעלם'],
      chezkot: ['חזקה', 'חזקות'], kav: ['פונקציה קווית', 'שיפוע', 'קו ישר', 'גרף'], pitagoras: ['פיתגורס', 'פיטגורס'], maarechet: ['מערכת משוואות', 'שני נעלמים', 'מערכת'],
      trinom: ['טרינום', 'פירוק לגורמים', 'פירוק'], shorashim: ['נוסחת השורשים', 'משוואה ריבועית', 'ריבועית'], 'parabola-tavla': ['פרבולה', 'טבלת ערכים'], parabola: ['פרבולה', 'פונקציה ריבועית', 'קודקוד'],
      sidra: ['סדרה חשבונית', 'סדרות'], handasit: ['סדרה הנדסית'], merchak: ['מרחק בין נקודות', 'אמצע קטע'], trigo: ['טריגונומטריה', 'טריגו', 'סינוס', 'קוסינוס', 'טנגנס'],
      gdila: ['גדילה', 'דעיכה', 'ריבית'], stiya: ['חציון', 'שכיח', 'סטיית תקן', 'סטטיסטיקה'], normalit: ['נורמלית', 'התפלגות'], nigzeret: ['נגזרת', 'נגזרות', 'גזירה'], mashik: ['משיק'],
      kitzon: ['קיצון', 'מקסימום', 'מינימום', 'חקירה'], integral: ['אינטגרל'], maagal: ['משוואת מעגל', 'מעגל'], sinusim: ['משפט הסינוסים', 'משפט הקוסינוסים'], tnua: ['בעיות תנועה', 'תנועה', 'הספק'],
      merchav: ['טריגונומטריה במרחב', 'תיבה'], rationalit: ['רציונלית', 'אסימפטוט'], 'shoresh-f': ['פונקציית שורש'], etz: ['הסתברות מותנית', 'עץ'], 'trig-nigzeret': ['נגזרת של סינוס'],
      vektor: ['וקטור'], merukav: ['מרוכב'], logaritm: ['לוגריתם', 'לוג', 'מעריכית'], 'exp-ln': ['ln', 'e בחזקת'], piramida: ['פירמידה'], dimyon: ['דמיון', 'משולשים דומים'],
      'zaviot-maagal': ['זוויות במעגל', 'זווית היקפית', 'זווית מרכזית'], parametr: ['פרמטר'], induktzia: ['אינדוקציה'], 'nefach-sivuv': ['נפח גוף סיבוב', 'גוף סיבוב'] };
    var GL = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'יא': 11, 'יב': 12 };
    var HEB_NUM = { 'עשר': 10, 'עשרה': 10, 'חמש עשרה': 15, 'רבע שעה': 15, 'עשרים': 20, 'חצי שעה': 30, 'שלושים': 30, 'ארבעים וחמש': 45, 'שעה וחצי': 90, 'שעה': 60, 'שישים': 60, 'תשעים': 90 };
    function reEsc(w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function has(s, list) { // מילה שלמה, עם אות שימוש אחת לפניה (ו/ה/ב/ל/ש/מ/כ): "מתקשה" זה לא "קשה", "פירוק" זה לא "ירוק"
      return list.some(function (w) { return new RegExp('(^|[\\s,.;:!?()\\-])[והבלשמכ]?' + reEsc(w.trim())).test(s); });
    }
    function aiParse(raw) {
      var s = ' ' + String(raw || '').replace(/[׳'`]/g, '׳').replace(/["״]/g, '״').replace(/\s+/g, ' ') + ' ', r = { said: [] }, m;
      // כיתה
      m = s.match(/כית(?:ה|ות)\s*([א-י]{1,2})[׳״]?(?=[\s\d,.!?-]|$)/) || s.match(/(?:^|\s)[לבו]?([א-י]{1,2})[׳״](?=[\s\d,.]|$)/);
      if (m && GL[m[1].replace(/[׳״]/g, '')]) r.g = GL[m[1].replace(/[׳״]/g, '')];
      if (!r.g && (m = s.match(/כית(?:ה|ות)\s*(\d{1,2})/))) r.g = Math.min(12, Math.max(2, +m[1]));
      if (!r.g && has(s, ['תיכון', 'בגרות'])) r.g = 11;
      if ((m = s.match(/(\d)\s*(?:יח|יחידות)/)) || (m = s.match(/(שלוש|ארבע|חמש)\s*יחידות/))) { r.u = { 'שלוש': 3, 'ארבע': 4, 'חמש': 5 }[m[1]] || +m[1]; if (!r.g) r.g = 11; }
      // זמן
      if ((m = s.match(/(\d{1,3})\s*(?:דק|ד׳)/))) r.m = +m[1];
      else if (has(s, ['שיעור כפול', 'שעתיים'])) r.m = 90;
      else Object.keys(HEB_NUM).sort(function (a, b) { return b.length - a.length; }).some(function (k) { if (s.indexOf(k) > -1 && (k.indexOf('שעה') > -1 || s.indexOf(k + ' דק') > -1)) { r.m = HEB_NUM[k]; return true; } });
      if (!r.m && has(s, ['שיעור שלם', 'שיעור אחד', 'לשיעור'])) r.m = 45;
      if (r.m) r.m = [10, 15, 20, 30, 45, 60, 90].reduce(function (a, b) { return Math.abs(b - r.m) < Math.abs(a - r.m) ? b : a; });
      // סוג, רמה, עזרה
      if (has(s, ['חזרה', 'לחזור', 'לפני מבחן', 'לפני המבחן', 'לפני בוחן', 'חזרות', 'תרגול', 'לתרגל', 'בוחן'])) r.k = 'z';
      if (has(s, ['הקנייה', 'נושא חדש', 'מתחילים', 'להכיר', 'ללמד', 'פעם ראשונה', 'היכרות'])) r.k = 'h';
      if (has(s, ['מתקשים', 'מתקשה', 'חלשים', 'חלשה', 'קל ', 'קלים', 'קלות', 'בסיס', 'פשוט', 'ליקויי', 'לקויות'])) r.lv = 1;
      if (has(s, ['מאתגר', 'אתגר', 'קשה', 'קשים', 'חזקים', 'חזקה', 'מצטיינים', 'מתקדמים', 'מחוננים', 'מצוינות'])) r.lv = 3;
      if (has(s, ['הרבה עזרה', 'מודרך', 'צעד אחרי צעד', 'צעד צעד', 'מתקשים', 'מתקשה', 'רמזים', 'לקויות', 'ליקויי'])) r.a = 2;
      if (has(s, ['בלי עזרה', 'בלי רמזים', 'בוחן', 'מבחן קצר', 'לבד', 'עצמאי', 'בלי הסברים'])) r.a = 0;
      // עיצוב
      if (has(s, ['צבעוני', 'שמח', 'צבעים'])) r.style = 'tzivoni';
      if (has(s, ['חוסך דיו', 'חסכוני', 'שחור לבן', 'שחור-לבן', 'פשוט להדפסה'])) r.style = 'lavan';
      if (has(s, ['קלף'])) r.style = 'klaf';
      if (has(s, ['זית', 'ירוק'])) r.style = 'zayit';
      if (has(s, ['כתב גדול', 'גדול', 'נגיש', 'ראייה', 'לקות'])) r.font = 1;
      if (has(s, ['אמריקא', 'רב ברירה', 'רב-ברירה', 'סימון תשובה'])) r.mc = 1;
      if (has(s, ['מילולי', 'בעיות מילוליות', 'סיפור'])) r.words = 1;
      if ((m = s.match(/(?:כותרת|לכתוב למעלה|שם הכיתה)\s*[:-]?\s*([^,.\n]{2,30})/))) r.title = m[1].trim();
      else if ((m = s.match(/(?:^|\s)[לבו]?([א-י]{1,2}[׳״]?\d{1,2})(?=[\s,.]|$)/)) && GL[m[1].replace(/[׳״\s\d]/g, '')]) r.title = m[1].trim(); // ט׳2
      // נושאים: ניקוד לכל נושא לפי מילים נרדפות ומילים מהשם; ביטוי ארוך גובר על קצר
      var sc = T.map(function (t) {
        var n = 0, list = (SYN[t.id] || []).slice();
        t.name.split(/[\s:,()]+/).forEach(function (w) { if (w.length >= 5 && ['פונקציה', 'משוואה', 'משוואות', 'נקודות', 'ושטח', 'מתחת', 'לגרף', 'חקירה', 'פרמטר', 'טבלת', 'ערכים', 'זוויות', 'צירים:', 'מכוונים:', 'מרובעים:', 'קטעים', 'ושטחים'].indexOf(w) < 0) list.push(w); });
        list.forEach(function (w) { if (has(s, [w])) n = Math.max(n, w.split(' ').length * 2 + w.length / 10); });
        return { t: t, n: n };
      }).filter(function (x) { return x.n > 0; });
      var G = groups(r.g || +gs.value, r.u || +$('dp-units').value);
      sc.forEach(function (x) { if (G.now.indexOf(x.t) > -1) x.n += 0.6; else if (G.near.indexOf(x.t) > -1) x.n += 0.3; });
      sc.sort(function (a, b) { return b.n - a.n; });
      r.ts = [];
      sc.forEach(function (x) { if (r.ts.length < 3 && x.n >= sc[0].n - 2.5 && !r.ts.some(function (y) { return (SYN[y.id] || []).join() === (SYN[x.t.id] || []).join(); })) r.ts.push(x.t); });
      // שני נושאי פרבולה תמיד נתפסים יחד: משאירים את המתאים לכיתה
      var pb = r.ts.filter(function (t) { return t.id.indexOf('parabola') === 0; });
      if (pb.length === 2) { var gg = r.g || +gs.value, drop = byId[gg >= 10 && G.now.indexOf(byId.parabola) > -1 ? 'parabola-tavla' : 'parabola']; r.ts.splice(r.ts.indexOf(drop), 1); }
      // לא נאמרה כיתה: לוקחים את הכיתה שבה לומדים את הנושא (אלא אם הנושא כבר מתאים לכיתה שבחרו למעלה)
      if (!r.g && r.ts.length && G.near.indexOf(r.ts[0]) < 0) r.gAuto = Math.max(2, grOf(r.ts[0])[0]);
      if (r.gAuto >= 10 && !r.u) { var uu = [4, 5, 3].filter(function (k) { return fits(r.ts[0], r.gAuto, k); })[0]; if (uu) r.u = uu; }
      return r;
    }
    function aiCfgs(r) {
      var g = r.g || r.gAuto || +gs.value, u = r.u || +$('dp-units').value, G = groups(g, u), base;
      var ts = r.ts.length ? r.ts : [G.now[G.now.length - 1] || G.near[0]];
      base = { g: g, u: u, t: ts[0].id, x: ts.slice(1).map(function (t) { return t.id; }), k: r.k || 'h', m: r.m || 30, lv: r.lv || 2, a: r.a === undefined ? 1 : r.a, style: r.style, font: r.font, title: r.title, mc: r.mc };
      var easy = Object.assign({}, base, { lv: Math.max(1, base.lv - 1), a: 2, name: '🤝 עם יותר עזרה', why: 'לתלמידים שמתקשים: כל תרגיל מפורק לצעדים קטנים, ברמה קלה יותר.' });
      var hard = Object.assign({}, base, { lv: Math.min(3, base.lv + 1), a: base.a === 2 ? 1 : 0, name: '🚀 עם יותר אתגר', why: 'לכיתה חזקה או לבוחן: פחות עזרה ותרגילים קשים יותר.' });
      if (base.x.length === 0) { // דף משולב עם נושא קרוב, לחזרה
        var near = (PRE[base.t] || []).filter(function (id) { return byId[id] && G.near.indexOf(byId[id]) > -1; })[0] || (PRE[base.t] || [])[0];
        if (near && base.lv >= 2) hard = Object.assign({}, base, { k: 'z', x: [near], a: Math.min(base.a, 1), name: '🔁 חזרה משולבת', why: 'אותו נושא, משולב עם ' + byId[near].name + '. מתאים לחזרה לפני מבחן.' });
      }
      base.name = '🎯 בדיוק מה שביקשתם'; base.why = 'הדף לפי התיאור שלכם.';
      [base, easy, hard].forEach(function (c) { if (c.a === 2 && c.lv === 3) c.lv = 2; });
      if (easy.lv === base.lv && easy.a === base.a) easy = Object.assign({}, base, { k: base.k === 'h' ? 'z' : 'h', name: base.k === 'h' ? '🔁 כדף חזרה' : '📘 כדף הקנייה', why: base.k === 'h' ? 'אותו נושא, כדף חזרה: תזכורת קצרה בראש הדף ותרגול שעולה בהדרגה.' : 'אותו נושא, כדף הקנייה: הסברים קצרים ותרגיל מודרך.' });
      if (hard.lv === base.lv && hard.a === base.a && hard.k === base.k && hard.x.join() === base.x.join()) hard = Object.assign({}, base, { m: base.m >= 45 ? 20 : 45, name: base.m >= 45 ? '⏱ גרסה קצרה, 20 דקות' : '⏱ גרסה לשיעור שלם, 45 דקות', why: 'אותו דף, באורך אחר.' });
      return [base, easy, hard];
    }
    var LVN = { 1: 'בסיס', 2: 'רגילה', 3: 'מאתגרת' }, HELPN = { 0: 'בלי עזרה', 1: 'עזרה רגילה', 2: 'הרבה עזרה' };
    var aiLast = [];
    function aiShow() {
      var txt = $('dp-ai-t').value.trim(), out = $('dp-ai-res');
      if (txt.length < 3) { out.innerHTML = '<p class="dp-ai-heard">כתבו כמה מילים על הדף שאתם צריכים: כיתה, נושא, כמה זמן, ואיך הכיתה.</p>'; $('dp-ai-t').focus(); return; }
      var r = aiParse(txt), cs = aiCfgs(r); aiLast = cs;
      var exact = detailed(txt); aiReq++; dafLast();
      var heard = [];
      heard.push(r.g ? 'כיתה ' + GRN[r.g] + (r.u ? ', ' + r.u + ' יח״ל' : '') : 'לא נאמרה כיתה, אז לקחתי ' + GRN[cs[0].g]);
      heard.push(r.ts.length ? 'נושא: ' + r.ts.map(function (t) { return t.name; }).join(' + ') : 'לא זיהיתי נושא, אז בחרתי ' + byId[cs[0].t].name + ' (אפשר לשנות למטה)');
      if (r.m) heard.push(r.m + ' דקות'); if (r.k) heard.push(r.k === 'z' ? 'דף חזרה' : 'דף הקנייה');
      if (r.lv) heard.push('רמה ' + LVN[r.lv]); if (r.a !== undefined) heard.push(HELPN[r.a]);
      if (r.mc) heard.push('עם שאלות אמריקאיות'); if (r.style) heard.push('עיצוב ' + $('dp-style').querySelector('[value="' + r.style + '"]').textContent);
      if (r.font) heard.push('כתב גדול'); if (r.title) heard.push('כותרת: ' + r.title);
      out.innerHTML = '<p class="dp-ai-heard"><b>מה הבנתי:</b> ' + heard.map(esc).join(' · ') + '</p><div class="dp-ai-opts">' + cs.map(function (c, j) {
        var tp = byId[c.t], ex = [];
        for (var i = 0; i < 6 && ex.length < 2; i++) { var q = seeded(c.lv * 1000 + i + j * 7, function () { return genQ(tp, c.lv); }); if (q.t && ex.indexOf(q.t) < 0) ex.push(q.t); }
        return '<div class="dp-ai-opt"><h3>' + c.name + '</h3><p class="why">' + esc(c.why) + '</p><div class="chips"><span>' + GRN[c.g] + '</span><span>' + esc([c.t].concat(c.x).map(function (id) { return byId[id].name; }).join(' + ')) + '</span><span>' + (c.k === 'z' ? 'חזרה' : 'הקנייה') + '</span><span>' + c.m + ' דק׳</span><span>' + LVN[c.lv] + '</span><span>' + HELPN[c.a] + '</span></div>' +
          '<p class="why">לדוגמה מהדף:</p><ol>' + ex.map(function (t) { return '<li dir="rtl">' + mwx(esc(t)) + '</li>'; }).join('') + '</ol>' +
          '<button class="btn ' + (j || exact ? 'btn-line' : 'btn-gold') + ' btn-sm" type="button" data-ai="' + j + '">✓ לבחור את הדף הזה</button></div>';
      }).join('') + '</div>';
      if (exact) { out.innerHTML = '<details class="dp-ai-more"><summary>או: 3 דפים מוכנים מהמחולל, עם תרגילים מתחלפים</summary>' + out.innerHTML + '</details>'; dafAsk(txt); }
      else out.innerHTML += '<p class="dp-ai-exact"><button class="btn btn-line btn-sm" type="button" data-daf>🪄 לבנות דף מדויק לפי מה שכתבתי, סעיף אחרי סעיף</button></p>';
      used('ai_suggest', { topic: cs[0].t, found: r.ts.length, exact: exact });
    }
    function aiApply(c) {
      dafOff();
      gs.value = c.g; $('dp-units').value = c.u;
      var G = groups(c.g, c.u); $('dp-all').checked = [c.t].concat(c.x).some(function (id) { return G.near.indexOf(byId[id]) < 0; });
      fillTopics(c.t); fillRevs(null, [c.x[0] || '', c.x[1] || '']);
      setKind(c.k); $('dp-min').value = c.m; $('dp-lv').value = c.lv; $('dp-help').value = c.a;
      if (c.style) $('dp-style').value = c.style; if (c.font) $('dp-font').value = c.font; if (c.title) $('dp-title').value = c.title.slice(0, 40);
      var done = function () { render(); var p = $('dp-paper'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      if (c.mc && BANK_OF[c.t]) { // שאלות אמריקאיות מהבנק, כשיש לנושא
        var go = function () { var bt = bank && bank.topics.filter(function (x) { return x.id === BANK_OF[c.t]; })[0]; if (bt) { var have = ownQ.map(function (x) { return x.t; }), pool = bt.q.map(lineQ).filter(function (x) { return x && have.indexOf(x.t) < 0; }).slice(0, 4); addMany(pool, 'ai_mc'); } done(); };
        if (bank) go(); else fetch('/assets/kita-bank.json').then(function (r) { return r.json(); }).then(function (j) { bank = j; go(); }).catch(done);
      } else done();
      used('ai_pick', { topic: c.t });
    }
    $('dp-ai-go').addEventListener('click', aiShow);
    $('dp-ai-t').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); aiShow(); } });
    $('dp-ai-res').addEventListener('click', function (e) { var b = e.target.closest('[data-ai]'); if (b) aiApply(aiLast[+b.dataset.ai]); });
    // ---------- "דף לפי התיאור": תיאור מפורט -> השרת בונה את הדף מבלוקים ----------
    var POTER = (function () { try { var o = localStorage.getItem('poter-api'); if (o) return o; } catch (e) {} return 'https://limudim-poter.gilad4049.workers.dev'; })();
    var DKEY = 'limudim-dapim-daf', aiDoc = null, aiOn = false, aiReq = 0, aiBase = '', aiHist = [], aiFixed = '';
    function detailed(s) { // תיאור של מבנה (מה קודם, מה מסבירים, אילו תרגילים) -> דף מדויק. בקשה קצרה וכללית -> המחולל הרגיל
      var mk = ['אחר כך', 'אחרי זה', 'ואז', 'מתחילים', 'בסוף', 'סיכום', 'טבלת ערכים', 'שרטוט', 'לשרטט', 'להסביר', 'הסבר', 'דוגמאות', 'להדגיש', 'מדגישים', 'קודם', 'חלק ', 'סעיף', 'שלב', 'מכונה', 'להציב', 'מציבים', 'להשלמה', 'משימה', 'תרגילי', 'למידה עצמית'];
      var n = mk.filter(function (w) { return s.indexOf(w) > -1; }).length;
      return s.length >= 220 || n >= 3 || (s.length >= 110 && n >= 2);
    }
    function dafAsk(txt, fresh) {
      var id = ++aiReq, t0 = Date.now(), box = $('dp-ai-daf');
      box.innerHTML = '<div class="dp-ai-wait" role="status"><span class="dp-ai-spin" aria-hidden="true"></span><span>🪄 בונים את הדף לפי התיאור שלכם, סעיף אחרי סעיף… <b id="dp-ai-sec">0</b> שנ׳<br><small>בדרך כלל חצי דקה עד דקה. הטבלאות והגרפים מחושבים מהפונקציה עצמה, כך שהמספרים נכונים.</small></span></div>';
      var tick = setInterval(function () { var e = $('dp-ai-sec'); if (e && id === aiReq) e.textContent = Math.round((Date.now() - t0) / 1000); else clearInterval(tick); }, 1000);
      used('daf_ask', { len: txt.length, fresh: !!fresh });
      var ac = window.AbortController ? new AbortController() : null; setTimeout(function () { if (ac) ac.abort(); }, 210000); // השרת עונה עד כ-3 דקות; אחר כך מוותרים בנימוס
      fetch(POTER + '/daf', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: txt, grade: GRN[+gs.value], fresh: fresh ? 1 : 0 }), signal: ac ? ac.signal : undefined })
        .then(function (r) { return r.text(); }).then(function (t) { return JSON.parse(t.trim()); })
        .then(function (d) {
          clearInterval(tick); if (id !== aiReq) return;
          if (!d || d.error || !d.blocks || !d.blocks.length) throw d || {};
          aiDoc = d; aiBase = txt; aiHist = []; aiFixed = ''; save(DKEY, { t: txt, d: d }); dafCard(d, true); dafOn();
          used('daf_ok', { blocks: d.blocks.length, sec: Math.round((Date.now() - t0) / 1000), cached: !!d.cached });
        })
        .catch(function (e) {
          clearInterval(tick); if (id !== aiReq) return;
          box.innerHTML = '<p class="dp-ai-heard dp-ai-err">' + (e && e.error === 'quota' ? 'הגעתם למכסה של היום לדפים לפי תיאור. מחר אפשר שוב, ובינתיים יש כאן דפים מוכנים מהמחולל.' : 'לא הצלחנו לבנות את הדף הפעם (השרת עמוס). אפשר לנסות שוב בעוד דקה, או לבחור אחד מהדפים המוכנים.') + ' <button class="linkish" type="button" data-daf>לנסות שוב</button></p>';
          var m = $('dp-ai-res').querySelector('details'); if (m) m.open = true;
          used('daf_fail', { why: (e && e.error) || 'net' });
        });
    }
    function dafCard(d, fresh) {
      var it = dafItems(d), c = function (f) { return it.filter(f).length; };
      var nt = c(function (x) { return x.k === 'table'; }), ng = c(function (x) { return x.k === 'graph' || (x.k === 'table' && x.g); }), nq = c(function (x) { return x.n; });
      var parts = d.blocks.filter(function (b) { return b.type === 'part'; });
      var chips = [d.grade ? 'כיתה ' + esc(d.grade) : '', d.minutes ? 'כ-' + d.minutes + ' דק׳' : '', nq + ' משימות', nt ? nt + ' טבלאות ערכים' : '', ng ? ng + ' מערכות צירים' : '', 'דף תשובות'].filter(Boolean);
      $('dp-ai-daf').innerHTML = '<div class="dp-ai-opt dp-ai-mine"><h3>🎯 הדף שתיארתם, סעיף אחרי סעיף</h3><p class="dp-ai-ttl">' + tx(d.title) + '</p><div class="chips">' + chips.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
        (parts.length ? '<ol>' + parts.map(function (b) { return '<li>' + tx(b.text) + '</li>'; }).join('') + '</ol>' : '') +
        '<p class="why">' + (fresh ? '✓ הדף מוכן למטה. ' : '') + 'אפשר ללחוץ על כל טקסט בדף ולתקן אותו לפני ההדפסה.</p>' +
        '<div class="btns"><button class="btn btn-gold btn-sm" type="button" data-daf-see>👁 לראות את הדף</button><button class="btn btn-line btn-sm" type="button" data-daf-again>🔄 לבנות גרסה אחרת</button></div>' +
        '<div class="dp-ai-fix">' + (aiFixed ? '<p class="dp-ai-done">✓ הדף עודכן לפי: "' + esc(aiFixed) + '"</p>' : '') +
        '<label for="dp-ai-fix-t"><b>✏️ רוצים לשנות, להוסיף או לדייק? כתבו או הקליטו במילים שלכם</b></label>' +
        '<textarea id="dp-ai-fix-t" rows="3" maxlength="1500" placeholder="למשל: תוסיפי בסוף עוד 2 תרגילי שרטוט עם מינוס x בריבוע, תקצרי את ההסבר על המכונה, ובסיכום תוסיפי שורה על ציר הסימטריה."></textarea>' +
        '<div class="btns"><button class="btn btn-gold btn-sm" type="button" data-daf-fix>✏️ לתקן את הדף</button><button class="btn btn-line btn-sm" type="button" data-daf-mic aria-pressed="false">🎤 להקליט</button>' +
        (aiHist.length ? '<button class="btn btn-line btn-sm" type="button" data-daf-undo>↶ לחזור לגרסה הקודמת</button>' : '') + '</div>' +
        '<p class="note" id="dp-ai-fix-note" aria-live="polite">אפשר לתקן כמה פעמים, ותמיד לחזור אחורה. תיקון קטן של מילה אפשר לעשות גם ישר על הדף, בלחיצה עליה (עדיף בסוף, אחרי התיקונים במילים).</p></div></div>';
    }
    // תיקון במילים של המורה: הדף הנוכחי + מה לשנות -> השרת מחזיר את הדף המלא המעודכן
    function dafFix(change) {
      if (!aiDoc || change.length < 3) return;
      var id = ++aiReq, t0 = Date.now(), note = $('dp-ai-fix-note'), btn = $('dp-ai-daf').querySelector('[data-daf-fix]');
      btn.disabled = true; btn.textContent = 'מתקנים…';
      note.innerHTML = '<span class="dp-ai-wait"><span class="dp-ai-spin" aria-hidden="true"></span><span>✏️ מתקנים את הדף לפי מה שביקשתם… <b id="dp-ai-sec">0</b> שנ׳ <small>(בדרך כלל חצי דקה עד דקה)</small></span></span>';
      var tick = setInterval(function () { var e = $('dp-ai-sec'); if (e && id === aiReq) e.textContent = Math.round((Date.now() - t0) / 1000); else clearInterval(tick); }, 1000);
      used('daf_fix', { len: change.length });
      var doc = { title: aiDoc.title, grade: aiDoc.grade, minutes: aiDoc.minutes, intro: aiDoc.intro, blocks: aiDoc.blocks };
      var ac = window.AbortController ? new AbortController() : null; setTimeout(function () { if (ac) ac.abort(); }, 210000);
      fetch(POTER + '/daf', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: aiBase || $('dp-ai-t').value.trim() || aiDoc.title, doc: doc, change: change }), signal: ac ? ac.signal : undefined })
        .then(function (r) { return r.text(); }).then(function (t) { return JSON.parse(t.trim()); })
        .then(function (d) {
          clearInterval(tick); if (id !== aiReq) return;
          if (!d || d.error || !d.blocks || !d.blocks.length) throw d || {};
          aiHist.push(aiDoc); if (aiHist.length > 10) aiHist.shift();
          aiDoc = d; aiFixed = change; save(DKEY, { t: aiBase, d: d }); dafCard(d); dafOn();
          used('daf_fix_ok', { blocks: d.blocks.length, sec: Math.round((Date.now() - t0) / 1000) });
        })
        .catch(function (e) {
          clearInterval(tick); if (id !== aiReq) return;
          btn.disabled = false; btn.textContent = '✏️ לתקן את הדף';
          note.innerHTML = '<span class="dp-ai-err">' + (e && e.error === 'quota' ? 'הגעתם למכסה של היום לתיקונים. מחר אפשר שוב, ובינתיים אפשר לתקן ישר על הדף.' : 'לא הצלחנו לתקן הפעם (השרת עמוס). הבקשה נשארה בתיבה: לוחצים שוב בעוד דקה.') + '</span>';
          used('daf_fail', { why: (e && e.error) || 'net', fix: 1 });
        });
    }
    // הקלטה לתיבת התיקון (אותו זיהוי דיבור של הדפדפן)
    var fixRec = null;
    function fixMic(btn) {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition, ta = $('dp-ai-fix-t'), note = $('dp-ai-fix-note');
      if (!SR) { note.textContent = 'הדפדפן הזה לא מקליט. אפשר ללחוץ על המיקרופון שבמקלדת של הטלפון ולדבר.'; ta.focus(); return; }
      if (fixRec) { try { fixRec.stop(); } catch (_) {} return; }
      var before = ta.value.trim(); fixRec = new SR(); fixRec.lang = 'he-IL'; fixRec.interimResults = true; fixRec.continuous = true;
      btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); btn.textContent = '⏹ לעצור'; note.textContent = '🎙️ מקשיבה… אומרים מה לשנות, ולוחצים "לעצור".';
      fixRec.onresult = function (e) { var t = ''; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + ' '; ta.value = (before ? before + ' ' : '') + t.trim(); };
      fixRec.onerror = function (e) { note.textContent = e.error === 'not-allowed' ? 'צריך לאשר לדפדפן גישה למיקרופון, ואז ללחוץ שוב.' : 'ההקלטה נעצרה. אפשר ללחוץ שוב, או לכתוב.'; };
      fixRec.onend = function () { fixRec = null; btn.classList.remove('on'); btn.setAttribute('aria-pressed', 'false'); btn.textContent = '🎤 להקליט'; if (ta.value.trim().length > 3) note.textContent = '✓ נקלט. אפשר לתקן את הטקסט, ואז "לתקן את הדף".'; };
      try { fixRec.start(); used('daf_fix_mic'); } catch (_) { fixRec = null; }
    }
    function dafOn() { aiOn = true; app.classList.add('dp-aimode'); render(); }
    function dafOff() { if (!aiOn) return; aiOn = false; app.classList.remove('dp-aimode'); }
    function renderDaf() {
      var o = { style: $('dp-style').value, font: +$('dp-font').value, title: $('dp-title').value.trim(), key: $('dp-key').checked, edit: true };
      ['time', 'stars', 'feel'].forEach(function (k) { o[k] = $('dp-o-' + k).checked; });
      $('dp-paper').innerHTML = dafPaperHtml(aiDoc, o);
      var nq = dafItems(aiDoc).filter(function (x) { return x.n; }).length;
      cur = { t: { id: 'daf', name: aiDoc.title }, name: aiDoc.title, only: true, cfg: { k: 'h', m: aiDoc.minutes || 0 }, daf: 1 };
      $('dp-sum').innerHTML = '<b>📝 דף לפי התיאור שלכם: ' + tx(aiDoc.title) + '</b> · ' + nq + ' משימות' + (aiDoc.minutes ? ' · כ-' + aiDoc.minutes + ' דקות' : '') +
        '<br><small>✏️ אפשר ללחוץ על כל טקסט בדף ולתקן אותו. שולחים לכיתה עם "PDF לקבוצת ווטסאפ". שינוי של עיצוב או של כתב מחזיר את הנוסח המקורי.</small><br><button class="linkish" type="button" id="dp-ai-exit">↩ לחזור למחולל הרגיל</button>';
      pdfReset();
    }
    $('dp-sum').addEventListener('click', function (e) { if (e.target.id === 'dp-ai-exit') { dafOff(); render(); used('daf_exit'); } });
    function dafClick(e) {
      var t = e.target.closest('[data-daf],[data-daf-see],[data-daf-again],[data-daf-open],[data-daf-fix],[data-daf-mic],[data-daf-undo]'); if (!t) return;
      if (t.hasAttribute('data-daf-fix')) { var ch = $('dp-ai-fix-t').value.trim(); if (ch.length < 3) { $('dp-ai-fix-note').textContent = 'כתבו או הקליטו מה לשנות בדף.'; $('dp-ai-fix-t').focus(); } else dafFix(ch); return; }
      if (t.hasAttribute('data-daf-mic')) { fixMic(t); return; }
      if (t.hasAttribute('data-daf-undo')) { if (aiHist.length) { aiDoc = aiHist.pop(); aiFixed = ''; save(DKEY, { t: aiBase, d: aiDoc }); dafCard(aiDoc); dafOn(); used('daf_undo'); } return; }
      if (t.hasAttribute('data-daf')) { var v = $('dp-ai-t').value.trim(); if (v.length > 3) dafAsk(v); }
      else if (t.hasAttribute('data-daf-again')) { var v2 = $('dp-ai-t').value.trim() || (load(DKEY, {}).t || ''); if (v2.length > 3) dafAsk(v2, true); }
      else if (t.hasAttribute('data-daf-open')) { var sv = load(DKEY, null); if (sv && sv.d) { aiDoc = sv.d; aiBase = sv.t || ''; aiHist = []; aiFixed = ''; if (!$('dp-ai-t').value.trim()) $('dp-ai-t').value = sv.t || ''; dafCard(sv.d); dafOn(); used('daf_reopen'); } }
      if (t.hasAttribute('data-daf-see') || t.hasAttribute('data-daf-open')) { var p = $('dp-paper'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
    $('dp-ai-res').addEventListener('click', dafClick);
    $('dp-ai-daf').addEventListener('click', dafClick);
    $('dp-ai-daf').addEventListener('keydown', function (e) { if (e.target.id === 'dp-ai-fix-t' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); var ch = e.target.value.trim(); if (ch.length > 2) dafFix(ch); } });
    function dafLast() { var sv = load(DKEY, null); $('dp-ai-daf').innerHTML = sv && sv.d && sv.d.title ? '<p class="dp-ai-last">הדף האחרון שבניתם לפי תיאור: <b>' + tx(sv.d.title) + '</b> <button class="linkish" type="button" data-daf-open>לפתוח אותו שוב</button></p>' : ''; }
    dafLast();

    (function () { // הקלטה: זיהוי דיבור של הדפדפן (כרום, אדג׳, אנדרואיד, ספארי חדש)
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition, btn = $('dp-ai-mic'), note = $('dp-ai-mic-note'), rec = null, before = '';
      if (!SR) { btn.addEventListener('click', function () { note.hidden = false; note.textContent = 'הדפדפן הזה לא מקליט. אפשר ללחוץ על המיקרופון שבמקלדת של הטלפון ולדבר, או לפתוח את הדף בכרום.'; $('dp-ai-t').focus(); }); return; }
      function stop() { if (rec) { try { rec.stop(); } catch (_) {} } }
      btn.addEventListener('click', function () {
        if (rec) { stop(); return; }
        rec = new SR(); rec.lang = 'he-IL'; rec.interimResults = true; rec.continuous = true; before = $('dp-ai-t').value.trim();
        btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); btn.textContent = '⏹ לעצור את ההקלטה'; note.hidden = false; note.textContent = '🎙️ מקשיבה… מדברים בחופשיות, ולוחצים "לעצור" בסוף.';
        rec.onresult = function (e) { var t = ''; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + ' '; $('dp-ai-t').value = (before ? before + ' ' : '') + t.trim(); };
        rec.onerror = function (e) { note.textContent = e.error === 'not-allowed' ? 'צריך לאשר לדפדפן גישה למיקרופון, ואז ללחוץ שוב.' : 'ההקלטה נעצרה. אפשר ללחוץ שוב, או לכתוב.'; };
        rec.onend = function () { rec = null; btn.classList.remove('on'); btn.setAttribute('aria-pressed', 'false'); btn.textContent = '🎤 להקליט במקום לכתוב'; if ($('dp-ai-t').value.trim().length > 3) { note.textContent = '✓ נקלט. אפשר לתקן את הטקסט, ואז "להציע לי דפים".'; aiShow(); } };
        try { rec.start(); used('ai_mic'); } catch (_) { rec = null; }
      });
    })();
    drawOwn();
    var curMsg = '', curLink = '';
    function readCfg() {
      var r = [1, 2, 3].map(function (k) { return $('dp-r' + k).value; }).filter(function (x, j, a) { return x && a.indexOf(x) === j; });
      var xs = [1, 2].map(function (k) { return $('dp-x' + k).value; }).filter(function (x, j, a) { return x && x !== $('dp-topic').value && a.indexOf(x) === j; });
      return { t: $('dp-topic').value, x: xs, q: ownQ.filter(function (x) { return x.t.trim(); }), only: $('dp-only').checked && ownQ.some(function (x) { return x.t.trim(); }), k: kind, m: +$('dp-min').value, lv: +$('dp-lv').value, r: r, s: seed, a: +$('dp-help').value };
    }
    function render() {
      if (aiOn && aiDoc) { renderDaf(); return; }
      offShow();
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
      var keep = { g: gs.value, u: $('dp-units').value, k: kind, s: seed, t: cfg.t, x: [$('dp-x1').value, $('dp-x2').value], own: ownQ, only: $('dp-only').checked, all: $('dp-all').checked, r: [1, 2, 3].map(function (k) { return $('dp-r' + k).value; }), title: o.title, key: o.key };
      ['min', 'lv', 'help', 'style', 'font'].forEach(function (k) { keep[k] = $('dp-' + k).value; });
      ['time', 'stars', 'bonus', 'feel', 'grid', 'qr'].forEach(function (k) { keep['o' + k] = o[k]; });
      save(CKEY, keep);
    }
    function setKind(k) { kind = k; app.querySelectorAll('[data-kind]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.kind === k ? 'true' : 'false'); }); }
    if (st.all) $('dp-all').checked = true;
    fillTopics(st.t || 'parabola-tavla'); fillRevs(st.r, st.x || ['', '']); setKind(kind); render();
    function regrade() { dafOff(); fillTopics(); fillRevs(); if (!$('dp-bank').hidden) { bankTopics(); suggest(); } render(); }
    gs.addEventListener('change', regrade);
    $('dp-units').addEventListener('change', regrade);
    $('dp-all').addEventListener('change', function () { regrade(); used('all_topics', { on: this.checked }); });
    $('dp-topic').addEventListener('change', function () { dafOff(); fillRevs(); render(); used('build', { topic: $('dp-topic').value }); });
    $('dp-form').addEventListener('change', function (e) { if (['dp-grade', 'dp-units', 'dp-topic'].indexOf(e.target.id) < 0 && !e.target.closest('#dp-own')) render(); });
    $('dp-title').addEventListener('input', render);
    $('dp-form').addEventListener('submit', function (e) { e.preventDefault(); });
    app.querySelectorAll('[data-kind]').forEach(function (b) { b.addEventListener('click', function () { dafOff(); setKind(b.dataset.kind); render(); }); });
    // הצעת שדרוג ובקשת כלי אישי: נשלחות לגילעד בווטסאפ
    [['dp-idea', 'הצעה לשדרוג מחולל דפי העבודה'], ['dp-ishi', 'בקשה לכלי אישי למורה']].forEach(function (q) {
      var b = $(q[0] + '-wa'); if (!b) return;
      b.addEventListener('click', function () {
        var txt = $(q[0]).value.trim();
        b.href = 'https://wa.me/972584049049?text=' + encodeURIComponent('שלום גילעד, ' + q[1] + ':\n' + (txt || '...'));
        used(q[0] === 'dp-idea' ? 'idea' : 'personal_tool');
      });
    });
    $('dp-new').addEventListener('click', function () { dafOff(); seed = R(1000, 99999); render(); used('new'); });
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
