// כלים ללימודים – תרגול מתמטיקה צעד אחרי צעד (/limudim/matematika/).
// לכל נושא: שיעור קצר שמתנגן כמו סרטון (שלבים + קריינות), ותרגול שבו פותרים פעולה אחת בכל פעם.
// שלושה שלבי קושי. שלושה תרגילים נכונים ברצף מעלים שלב. ההתקדמות נשמרת רק בטלפון.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('mx-app')) return;
  function load(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function used(extra) { if (window.toolUsed) window.toolUsed('matematika', extra); }
  function R(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function nz(a, b) { var x; do { x = R(a, b); } while (x === 0); return x; }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }
  function num(n) { return typeof n === 'number' && n < 0 ? '−' + (-n) : String(n); }
  function p(n) { return n < 0 ? '(' + num(n) + ')' : num(n); }
  function F(n, d) { return '<span class="fr"><span>' + num(n) + '</span><span>' + num(d) + '</span></span>'; }
  function M(s) { return '<mark>' + s + '</mark>'; }
  function he(s) { return '<span class="he" dir="rtl">' + s + '</span>'; }
  function heB(s) { return '<div class="he" dir="rtl">' + s + '</div>'; }
  function fracVal(n, d) { var g = gcd(n, d); n /= g; d /= g; if (d < 0) { n = -n; d = -d; } return d === 1 ? num(n) : F(n, d); }
  function lin(a, b, v) {
    v = v || 'x'; var s = '';
    if (a) s = (a === 1 ? '' : a === -1 ? '−' : num(a)) + v;
    if (b) s += s ? (b < 0 ? ' − ' + (-b) : ' + ' + b) : num(b);
    return s || '0';
  }
  function quad(a, b, c) {
    var s = (a === 1 ? '' : a === -1 ? '−' : num(a)) + 'x²';
    if (b) s += (b < 0 ? ' − ' : ' + ') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'x';
    if (c) s += (c < 0 ? ' − ' : ' + ') + Math.abs(c);
    return s + ' = 0';
  }
  function r1(x) { return Math.round(x * 10) / 10; }
  // קריאת תשובה: 7, −3, 2.5, 3/4, 1 1/2, x=4, 25%
  function parseVal(s) {
    s = String(s).trim().replace(/[−–—]/g, '-').replace(/^[a-zA-Zא-ת₁₂]+\s*=\s*/, '').replace(/%$/, '').trim();
    var m = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (m) { var w = +m[1]; return (w < 0 ? -1 : 1) * (Math.abs(w) + (+m[2]) / (+m[3])); }
    s = s.replace(/\s+/g, '').replace(/,/g, '.');
    m = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
    if (m) return +m[2] === 0 ? NaN : (+m[1]) / (+m[2]);
    if (/^-?\d*\.?\d+$/.test(s)) return +s;
    return NaN;
  }

  // ---------- ציורים לשיעורים ----------
  function bars(parts) { // [[n,d,'צבע'],...]
    return '<div class="mx-bars">' + parts.map(function (q) {
      var c = ''; for (var i = 0; i < q[1]; i++) c += '<i' + (i < q[0] ? ' class="on' + (q[2] || '') + '"' : '') + '></i>';
      return '<div class="mx-bar">' + c + '</div><div class="mx-bar-l">' + F(q[0], q[1]) + '</div>';
    }).join('') + '</div>';
  }
  function grid100(n) { var c = ''; for (var i = 0; i < 100; i++) c += '<i' + (i < n ? ' class="on"' : '') + '></i>'; return '<div class="mx-grid">' + c + '</div>'; }
  var TRI = '<svg viewBox="0 0 220 170" class="mx-svg" aria-hidden="true"><path d="M30 140 L190 140 L30 20 Z" fill="rgba(134,197,230,.12)" stroke="#86c5e6" stroke-width="3"/><path d="M30 124 h16 v16" fill="none" stroke="#dcb769" stroke-width="2"/><text x="110" y="162" fill="#eef1f8" font-size="18" text-anchor="middle">b = 4</text><text x="8" y="85" fill="#eef1f8" font-size="18">a = 3</text><text x="122" y="70" fill="#ecca83" font-size="18">c = ?</text><text x="100" y="40" fill="#a1abc2" font-size="12">יתר</text></svg>';
  var SQ = '<svg viewBox="0 0 260 250" class="mx-svg" aria-hidden="true"><g transform="translate(60,40)"><path d="M0 120 L80 120 L0 60 Z" fill="none" stroke="#86c5e6" stroke-width="2.5"/><rect x="-60" y="60" width="60" height="60" fill="rgba(127,209,168,.25)" stroke="#7fd1a8"/><text x="-30" y="96" fill="#eef1f8" font-size="15" text-anchor="middle">9</text><rect x="0" y="120" width="80" height="80" fill="rgba(134,197,230,.22)" stroke="#86c5e6"/><text x="40" y="165" fill="#eef1f8" font-size="15" text-anchor="middle">16</text><path d="M0 60 L80 120 L140 40 L60 -20 Z" fill="rgba(220,183,105,.22)" stroke="#dcb769"/><text x="70" y="55" fill="#ecca83" font-size="16" text-anchor="middle">25</text></g></svg>';

  // =====================================================================
  //  הנושאים
  // =====================================================================
  var T = [];

  // ---------- 1. סדר פעולות חשבון ----------
  T.push({ id: 'seder', em: '🧮', name: 'סדר פעולות חשבון', grade: 'כיתות ד׳–ו׳',
    lesson: [
      { m: '3 + 4 × 2 = ?', t: 'כמה זה שלוש ועוד ארבע כפול שתיים? הרבה עונים ארבע עשרה. בואו נראה למה התשובה היא אחת עשרה.' },
      { m: heB('<ol class="mx-rules"><li><b>סוגריים</b> ( )</li><li><b>כפל וחילוק</b> × ÷</li><li><b>חיבור וחיסור</b> + −</li></ol>'), t: 'יש סדר קבוע. קודם מה שבתוך הסוגריים. אחר כך כפל וחילוק. ורק בסוף חיבור וחיסור.' },
      { m: '3 + ' + M('4 × 2'), t: 'בתרגיל שלנו אין סוגריים, אז מתחילים בכפל: ארבע כפול שתיים.' },
      { m: '3 + ' + M('8'), t: 'ארבע כפול שתיים זה שמונה. מחליפים את הכפל בתוצאה שלו.' },
      { m: '3 + 8 = <b class="ok">11</b>', t: 'ורק עכשיו מחברים: שלוש ועוד שמונה, אחת עשרה.' },
      { m: M('(3 + 4)') + ' × 2 = 7 × 2 = <b class="ok">14</b>', t: 'ואם רוצים לחבר קודם? שמים סוגריים. הסוגריים אומרים: אותי מחשבים קודם. עכשיו יוצא ארבע עשרה.' },
      { m: '20 − ' + M('6 ÷ 2') + ' + 1<br>20 − 3 + 1 = <b class="ok">18</b>', t: 'עוד כלל: כשיש כמה פעולות באותה דרגה, כמו חיסור וחיבור, הולכים לפי הסדר שבו התרגיל כתוב, משמאל לימין.' },
      { m: he('תורכם! פעולה אחת בכל שלב.'), t: 'עכשיו תורכם. בכל שלב תחשבו רק פעולה אחת, והתרגיל יתקצר לבד.' }
    ],
    gen: function (lv) {
      if (lv === 1) {
        var a = R(2, 20), b = R(2, 9), c = R(2, 9);
        if (Math.random() < .5) return { ex: a + ' + ' + b + ' × ' + c, steps: [
          { show: a + ' + ' + M(b + ' × ' + c), q: 'מה מחשבים קודם? כמה זה ' + b + ' × ' + c + '?', a: b * c, hint: 'כפל בא לפני חיבור. מתחילים מ-' + b + ' × ' + c + '.' },
          { show: a + ' + ' + M(b * c), q: 'ועכשיו: ' + a + ' + ' + (b * c) + ' = ?', a: a + b * c, hint: 'נשאר רק חיבור.' }] };
        a = R(1, b * c - 1);
        return { ex: b + ' × ' + c + ' − ' + a, steps: [
          { show: M(b + ' × ' + c) + ' − ' + a, q: 'מה מחשבים קודם? כמה זה ' + b + ' × ' + c + '?', a: b * c, hint: 'כפל בא לפני חיסור.' },
          { show: M(b * c) + ' − ' + a, q: (b * c) + ' − ' + a + ' = ?', a: b * c - a, hint: 'נשאר רק חיסור.' }] };
      }
      if (lv === 2) {
        var x = R(2, 12), y = R(2, 12), z = R(2, 6), w = R(1, (x + y) * z - 1);
        return { ex: '(' + x + ' + ' + y + ') × ' + z + ' − ' + w, steps: [
          { show: M('(' + x + ' + ' + y + ')') + ' × ' + z + ' − ' + w, q: 'קודם הסוגריים: ' + x + ' + ' + y + ' = ?', a: x + y, hint: 'מה שבתוך הסוגריים תמיד ראשון.' },
          { show: M((x + y) + ' × ' + z) + ' − ' + w, q: 'עכשיו הכפל: ' + (x + y) + ' × ' + z + ' = ?', a: (x + y) * z, hint: 'כפל לפני חיסור.' },
          { show: M((x + y) * z) + ' − ' + w, q: ((x + y) * z) + ' − ' + w + ' = ?', a: (x + y) * z - w, hint: 'נשאר רק חיסור.' }] };
      }
      var e = R(2, 9), d = e * R(2, 9), bb = R(5, 15), cc = R(1, bb - 1), aa = R(2, 6);
      return { ex: aa + ' × (' + bb + ' − ' + cc + ') + ' + d + ' ÷ ' + e, steps: [
        { show: aa + ' × ' + M('(' + bb + ' − ' + cc + ')') + ' + ' + d + ' ÷ ' + e, q: 'קודם הסוגריים: ' + bb + ' − ' + cc + ' = ?', a: bb - cc, hint: 'סוגריים ראשונים.' },
        { show: M(aa + ' × ' + (bb - cc)) + ' + ' + d + ' ÷ ' + e, q: 'כפל: ' + aa + ' × ' + (bb - cc) + ' = ?', a: aa * (bb - cc), hint: 'כפל וחילוק לפני חיבור. מתחילים מהשמאלי.' },
        { show: (aa * (bb - cc)) + ' + ' + M(d + ' ÷ ' + e), q: 'חילוק: ' + d + ' ÷ ' + e + ' = ?', a: d / e, hint: 'גם החילוק בא לפני החיבור.' },
        { show: M((aa * (bb - cc)) + ' + ' + (d / e)), q: 'ובסוף: ' + (aa * (bb - cc)) + ' + ' + (d / e) + ' = ?', a: aa * (bb - cc) + d / e, hint: 'נשאר רק חיבור.' }] };
    } });

  // ---------- 2. חיבור וחיסור שברים ----------
  function simplifyStep(n, d) {
    var g = gcd(n, d);
    if (g === 1) return null;
    return { show: F(n, d), q: 'אפשר לצמצם: מחלקים מונה ומכנה ב-' + g + '. מה השבר המצומצם?', a: n / d, fr: [n / g, d / g], hint: n + ' ÷ ' + g + ' = ' + (n / g) + ', ו-' + d + ' ÷ ' + g + ' = ' + (d / g) + '. כותבים כך: ' + (n / g) + '/' + (d / g) };
  }
  T.push({ id: 'shvarim', em: '🍕', name: 'חיבור וחיסור שברים', grade: 'כיתות ה׳–ו׳',
    lesson: [
      { m: F(1, 2) + ' + ' + F(1, 3) + ' = ?', t: 'כמה זה חצי ועוד שליש? אי אפשר לחבר את המספרים כמו שהם, כי החתיכות בגדלים שונים.' },
      { m: bars([[1, 2], [1, 3, ' b']]), t: 'חצי זו חתיכה גדולה, ושליש חתיכה קטנה יותר. כדי לחבר, צריך לחתוך את שניהם לחתיכות באותו גודל.' },
      { m: bars([[3, 6], [2, 6, ' b']]) + he('מכנה משותף: <b>6</b>'), t: 'שש מתחלק גם בשתיים וגם בשלוש. זה המכנה המשותף. חצי זה שלוש שישיות, ושליש זה שתי שישיות.' },
      { m: F(1, 2) + ' = ' + F('1 × 3', '2 × 3') + ' = ' + F(3, 6), t: 'מה שעושים למכנה, עושים גם למונה. כפלנו את המכנה בשלוש, אז כופלים גם את המונה בשלוש.' },
      { m: F(3, 6) + ' + ' + F(2, 6) + ' = ' + F(M(5), 6), t: 'עכשיו החתיכות באותו גודל. מחברים רק את המונים: שלוש ועוד שתיים, חמש. המכנה נשאר שש.' },
      { m: F(2, 8) + ' = ' + F('2 ÷ 2', '8 ÷ 2') + ' = ' + F(1, 4), t: 'בסוף בודקים אם אפשר לצמצם: מחלקים את המונה ואת המכנה באותו מספר. שתי שמיניות הן רבע.' },
      { m: heB('<ol class="mx-rules"><li>מכנה משותף</li><li>להרחיב כל שבר</li><li>לחבר את המונים</li><li>לצמצם</li></ol>'), t: 'הסדר: מכנה משותף, מרחיבים כל שבר, מחברים את המונים, ומצמצמים.' }
    ],
    gen: function (lv) {
      var a, b, c, d, st = [], s;
      if (lv === 1) {
        d = R(3, 12); do { a = R(1, d - 1); c = R(1, d - 1); } while (gcd(a, d) !== 1 || gcd(c, d) !== 1);
        st.push({ show: F(a, d) + ' + ' + F(c, d), q: 'המכנה זהה. כמה זה ' + a + ' + ' + c + ' (סכום המונים)?', a: a + c, hint: 'כשהמכנים שווים, מחברים רק את המונים. המכנה נשאר ' + d + '.' });
        s = simplifyStep(a + c, d); if (s) st.push(s);
        return { ex: F(a, d) + ' + ' + F(c, d), steps: st, fin: fracVal(a + c, d) };
      }
      var minus = lv === 3 && Math.random() < .5;
      if (lv === 2) { b = R(2, 6); var k = R(2, 4); d = b * k; do { a = R(1, b - 1); c = R(1, d - 1); } while (gcd(a, b) !== 1 || gcd(c, d) !== 1); }
      else { do { b = R(2, 9); d = R(2, 9); } while (b === d || lcm(b, d) === Math.max(b, d)); do { a = R(1, b - 1); c = R(1, d - 1); } while (gcd(a, b) !== 1 || gcd(c, d) !== 1); }
      if (minus && a * d < c * b) { var t1 = a; a = c; c = t1; t1 = b; b = d; d = t1; }
      if (minus && a * d <= c * b) minus = false;
      var L = lcm(b, d), op = minus ? ' − ' : ' + ', n1 = a * L / b, n2 = c * L / d, sum = minus ? n1 - n2 : n1 + n2;
      if (lv === 2) {
        st.push({ show: F(a, b) + op + F(c, d), q: 'המכנה המשותף הוא ' + d + '. בכמה כופלים את ' + b + ' כדי לקבל ' + d + '?', a: L / b, hint: d + ' ÷ ' + b + ' = ?' });
      } else {
        st.push({ show: F(a, b) + op + F(c, d), q: 'מה המכנה המשותף הקטן ביותר של ' + b + ' ושל ' + d + '?', a: L, hint: 'המספר הקטן ביותר שמתחלק גם ב-' + b + ' וגם ב-' + d + '. נסו את הכפולות של ' + Math.max(b, d) + '.' });
      }
      st.push({ show: F(a, b) + ' = ' + F(a + ' × ' + (L / b), b + ' × ' + (L / b)), q: 'מה המונה החדש של ' + a + '/' + b + '?', a: n1, hint: 'כופלים את המונה ' + a + ' באותו מספר שכפלנו בו את המכנה: ' + (L / b) + '.' });
      if (L !== d) st.push({ show: F(c, d) + ' = ' + F(c + ' × ' + (L / d), d + ' × ' + (L / d)), q: 'ומה המונה החדש של ' + c + '/' + d + '?', a: n2, hint: 'כופלים את ' + c + ' ב-' + (L / d) + '.' });
      st.push({ show: F(n1, L) + op + F(n2, L), q: (minus ? 'מחסירים' : 'מחברים') + ' את המונים: ' + n1 + op + n2 + ' = ?', a: sum, hint: 'המכנה נשאר ' + L + '. עובדים רק על המונים.' });
      s = simplifyStep(sum, L); if (s) st.push(s);
      return { ex: F(a, b) + op + F(c, d), steps: st, fin: fracVal(sum, L) };
    } });

  // ---------- 3. אחוזים ----------
  T.push({ id: 'achuzim', em: '％', name: 'אחוזים', grade: 'כיתות ו׳–ז׳',
    lesson: [
      { m: '25% ' + he('מתוך') + ' 80 = ?', t: 'אחוז פירושו חלק ממאה. עשרים וחמישה אחוז זה עשרים וחמישה חלקים מתוך מאה.' },
      { m: grid100(25), t: 'תחשבו על המספר כמו על מאה משבצות. עשרים וחמישה אחוז זה עשרים וחמש משבצות מתוך המאה.' },
      { m: '1% = 80 ÷ 100 = ' + M('0.8'), t: 'מתחילים מאחוז אחד: מחלקים במאה. אחוז אחד משמונים זה אפס נקודה שמונה.' },
      { m: '25% = 0.8 × 25 = <b class="ok">20</b>', t: 'ועכשיו כופלים במספר האחוזים. אפס נקודה שמונה כפול עשרים וחמש, עשרים.' },
      { m: '10% → ÷10<br>50% → ÷2<br>25% → ÷4', t: 'קיצורי דרך: עשרה אחוז זה לחלק בעשר, חמישים אחוז זה חצי, ועשרים וחמישה אחוז זה רבע.' },
      { m: he('הנחה של 20% על 150 ₪') + '<br>150 − 30 = <b class="ok">120 ₪</b>', t: 'בהנחה מחשבים כמה שקלים יורדים, ומחסירים מהמחיר. עשרים אחוז ממאה וחמישים זה שלושים, ונשאר מאה עשרים.' },
      { m: he('כמה אחוז זה 12 מתוך 48?') + '<br>12 ÷ 48 = 0.25 → <b class="ok">25%</b>', t: 'ולהפך: כמה אחוז זה מספר מתוך מספר? מחלקים, וכופלים במאה.' }
    ],
    gen: function (lv) {
      if (lv === 1) {
        var X = pick([10, 20, 25, 50, 5, 15, 30, 40, 75]), Y = (100 / gcd(X, 100)) * R(1, 12);
        if (Y < 20) Y *= 10;
        return { ex: X + '% ' + he('מתוך') + ' ' + Y, steps: [
          { show: '1% = ' + Y + ' ÷ 100', q: 'כמה זה אחוז אחד מ-' + Y + '? (' + Y + ' ÷ 100)', a: Y / 100, hint: 'מחלקים במאה: מזיזים את הנקודה העשרונית שני מקומות שמאלה.' },
          { show: X + '% = ' + (Y / 100) + ' × ' + X, q: 'עכשיו כופלים ב-' + X + ': ' + (Y / 100) + ' × ' + X + ' = ?', a: Y * X / 100, hint: 'אפשר לכפול ' + Y + ' × ' + X + ' ולחלק במאה.' }] };
      }
      if (lv === 2) {
        var Xp = pick([10, 15, 20, 25, 30, 40, 50]), P = (100 / gcd(Xp, 100)) * R(2, 20), off = P * Xp / 100;
        return { ex: he('מחיר ' + P + ' ₪, הנחה של ' + Xp + '%. כמה משלמים?'), steps: [
          { show: Xp + '% ' + he('מתוך') + ' ' + P, q: 'כמה שקלים יורדים? (' + Xp + '% מתוך ' + P + ')', a: off, hint: 'אחוז אחד הוא ' + (P / 100) + '. כופלים ב-' + Xp + '.' },
          { show: P + ' − ' + off, q: 'כמה משלמים אחרי ההנחה?', a: P - off, hint: 'מחסירים את ההנחה מהמחיר.' }] };
      }
      var B = pick([20, 25, 40, 50, 80, 200, 250, 400]), pc = pick([5, 10, 15, 20, 25, 30, 40, 60, 75, 80]), A = B * pc / 100;
      if (A !== Math.round(A)) { B = 200; A = 2 * pc; }
      return { ex: he('כמה אחוז זה ' + A + ' מתוך ' + B + '?'), steps: [
        { show: A + ' ÷ ' + B, q: 'מחלקים: ' + A + ' ÷ ' + B + ' = ? (אפשר גם כשבר)', a: A / B, hint: 'אפשר לכתוב ' + A + '/' + B + ', או לחשב במספר עשרוני.' },
        { show: (A / B) + ' × 100', q: 'כופלים במאה. כמה אחוז?', a: pc, hint: 'מזיזים את הנקודה העשרונית שני מקומות ימינה.' }] };
    } });

  // ---------- 4. משוואה ממעלה ראשונה ----------
  T.push({ id: 'mishvaa', em: '⚖️', name: 'משוואה עם נעלם אחד', grade: 'כיתות ז׳–ח׳',
    lesson: [
      { m: '2x + 3 = 11', t: 'משוואה היא כמו מאזניים. מה שמשמאל לסימן השווה שוקל בדיוק כמו מה שמימין.' },
      { m: '<span class="mx-scale">⚖️</span><br>2x + 3 = 11', t: 'המטרה: להשאיר את איקס לבד. וכל מה שעושים לצד אחד, עושים גם לצד השני, כדי שהמאזניים יישארו מאוזנים.' },
      { m: '2x + 3 ' + M('− 3') + ' = 11 ' + M('− 3'), t: 'קודם נפטרים מהשלוש: מחסירים שלוש משני הצדדים.' },
      { m: '2x = 8', t: 'נשאר: שתיים איקס שווה שמונה.' },
      { m: '2x ' + M('÷ 2') + ' = 8 ' + M('÷ 2'), t: 'שתיים איקס זה שתיים כפול איקס. הפעולה ההפוכה לכפל היא חילוק, אז מחלקים את שני הצדדים בשתיים.' },
      { m: 'x = <b class="ok">4</b>', t: 'איקס שווה ארבע.' },
      { m: he('בדיקה:') + ' 2·4 + 3 = 11 ✓', t: 'תמיד אפשר לבדוק: מציבים ארבע במקום איקס, ומקבלים אחת עשרה. נכון!' },
      { m: '5x + 2 = 3x + 10<br>5x − 3x = 10 − 2<br>2x = 8', t: 'כשיש איקס בשני הצדדים, מעבירים את כל האיקסים לצד אחד, ואת כל המספרים לצד השני. מי שעובר צד, מחליף סימן.' }
    ],
    gen: function (lv) {
      var x = nz(-9, 9);
      if (lv === 1) {
        var b = nz(-15, 15), c = x + b;
        return { ex: lin(1, b) + ' = ' + num(c), steps: [
          { show: lin(1, b) + ' ' + M(b > 0 ? '− ' + b : '+ ' + (-b)) + ' = ' + num(c) + ' ' + M(b > 0 ? '− ' + b : '+ ' + (-b)), q: (b > 0 ? 'מחסירים ' + b : 'מוסיפים ' + (-b)) + ' לשני הצדדים. x = ?', a: x, hint: 'x = ' + num(c) + (b > 0 ? ' − ' + b : ' + ' + (-b)) }], fin: 'x = ' + num(x) };
      }
      if (lv === 2) {
        var a = R(2, 9) * (Math.random() < .2 ? -1 : 1), bb = nz(-15, 15), cc = a * x + bb;
        return { ex: lin(a, bb) + ' = ' + num(cc), steps: [
          { show: lin(a, bb) + ' ' + M(bb > 0 ? '− ' + bb : '+ ' + (-bb)) + ' = ' + num(cc) + ' ' + M(bb > 0 ? '− ' + bb : '+ ' + (-bb)), q: 'נפטרים מ-' + num(bb) + '. ' + lin(a, 0) + ' = ?', a: cc - bb, hint: num(cc) + (bb > 0 ? ' − ' + bb : ' + ' + (-bb)) + ' = ?' },
          { show: lin(a, 0) + ' = ' + num(cc - bb), q: 'מחלקים את שני הצדדים ב-' + num(a) + '. x = ?', a: x, hint: num(cc - bb) + ' ÷ ' + p(a) + ' = ?' }], fin: 'x = ' + num(x) };
      }
      var A, C; do { A = nz(-6, 9); C = nz(-6, 9); } while (A === C);
      var B1 = nz(-12, 12), D = (A - C) * x + B1;
      return { ex: lin(A, B1) + ' = ' + lin(C, D), steps: [
        { show: lin(A, 0) + ' ' + M(C < 0 ? '+ ' + lin(-C, 0) : '− ' + lin(C, 0)) + ' = ' + num(D) + ' ' + M(B1 < 0 ? '+ ' + (-B1) : '− ' + B1), q: 'מעבירים את האיקסים שמאלה ואת המספרים ימינה. כמה איקסים נשארים? (' + num(A) + ' − ' + p(C) + ')', a: A - C, hint: 'מחסירים את מספר האיקסים שבצד ימין מאלה שבצד שמאל.' },
        { show: lin(A - C, 0) + ' = ' + num(D) + (B1 < 0 ? ' + ' + (-B1) : ' − ' + B1), q: 'כמה זה ' + num(D) + (B1 < 0 ? ' + ' + (-B1) : ' − ' + B1) + '?', a: D - B1, hint: 'המספר ' + num(B1) + ' עבר צד והחליף סימן.' },
        { show: lin(A - C, 0) + ' = ' + num(D - B1), q: 'מחלקים ב-' + num(A - C) + '. x = ?', a: x, hint: num(D - B1) + ' ÷ ' + p(A - C) + ' = ?' }], fin: 'x = ' + num(x) };
    } });

  // ---------- 5. פתיחת סוגריים וכינוס איברים ----------
  T.push({ id: 'pilug', em: '🔓', name: 'פתיחת סוגריים וכינוס איברים', grade: 'כיתה ז׳',
    lesson: [
      { m: '3(x + 4)', t: 'מספר שצמוד לסוגריים פירושו כפל: שלוש פעמים מה שבתוך הסוגריים.' },
      { m: '(x + 4) + (x + 4) + (x + 4)', t: 'שלוש פעמים איקס ועוד ארבע. אם נספור, יש כאן שלושה איקסים, ושלוש פעמים ארבע.' },
      { m: M('3·x') + ' + ' + M('3·4') + ' = 3x + 12', t: 'זה חוק הפילוג: כופלים את המספר שבחוץ בכל אחד מהאיברים שבפנים.' },
      { m: '−2(x − 5) = −2x ' + M('+ 10'), t: 'זהירות עם מינוס: מינוס שתיים כפול מינוס חמש זה פלוס עשר. מינוס כפול מינוס נותן פלוס.' },
      { m: M('3x') + ' + 12 + ' + M('2x') + ' + 1', t: 'אחרי שפותחים, מכנסים איברים דומים: איקסים עם איקסים, ומספרים עם מספרים.' },
      { m: '= <b class="ok">5x + 13</b>', t: 'שלוש איקס ועוד שתיים איקס זה חמש איקס. שתים עשרה ועוד אחת זה שלוש עשרה.' }
    ],
    gen: function (lv) {
      var a = R(2, 9), b = nz(-9, 9);
      if (lv === 1) return { ex: num(a) + '(' + lin(1, b) + ')', steps: [
        { show: M(a + '·x') + ' + ' + a + '·' + p(b), q: 'כמה זה ' + a + ' כפול x? (המקדם של x)', a: a, hint: a + ' כפול x זה ' + a + 'x. המספר לפני ה-x הוא ' + a + '.' },
        { show: a + 'x + ' + M(a + '·' + p(b)), q: 'כמה זה ' + a + ' × ' + p(b) + '?', a: a * b, hint: b < 0 ? 'חיובי כפול שלילי נותן שלילי.' : 'כפל רגיל.' }], fin: lin(a, a * b) };
      var c = nz(-6, 9), d = nz(-12, 12);
      if (lv === 2) return { ex: a + '(' + lin(1, b) + ') ' + (c < 0 ? '− ' + lin(-c, 0) : '+ ' + lin(c, 0)) + (d < 0 ? ' − ' + (-d) : ' + ' + d), steps: [
        { show: a + 'x + ' + M(a + '·' + p(b)) + ' ' + (c < 0 ? '− ' + lin(-c, 0) : '+ ' + lin(c, 0)) + (d < 0 ? ' − ' + (-d) : ' + ' + d), q: 'פותחים סוגריים: ' + a + ' × ' + p(b) + ' = ?', a: a * b, hint: 'כופלים את ' + a + ' במספר שבתוך הסוגריים.' },
        { show: M(a + 'x') + (a * b < 0 ? ' − ' + (-a * b) : ' + ' + a * b) + ' ' + M(c < 0 ? '− ' + lin(-c, 0) : '+ ' + lin(c, 0)) + (d < 0 ? ' − ' + (-d) : ' + ' + d), q: 'מכנסים את האיקסים: ' + a + ' + ' + p(c) + ' = ?', a: a + c, hint: 'רק המספרים שלפני ה-x.' },
        { show: lin(a + c, 0) + ' ' + M((a * b < 0 ? '− ' + (-a * b) : '+ ' + a * b) + (d < 0 ? ' − ' + (-d) : ' + ' + d)), q: 'ועכשיו המספרים: ' + num(a * b) + ' + ' + p(d) + ' = ?', a: a * b + d, hint: 'רק המספרים בלי x.' }], fin: lin(a + c, a * b + d) };
      var c3 = R(2, 6), d3 = nz(-8, 8);
      return { ex: a + '(' + lin(1, b) + ') − ' + c3 + '(' + lin(1, d3) + ')', steps: [
        { show: a + 'x + ' + M(a + '·' + p(b)) + ' − ' + c3 + '(' + lin(1, d3) + ')', q: 'פותחים את הסוגריים הראשונים: ' + a + ' × ' + p(b) + ' = ?', a: a * b, hint: 'כפל רגיל.' },
        { show: lin(a, a * b) + ' ' + M('−' + c3 + 'x') + ' ' + M('−' + c3 + '·' + p(d3)), q: 'בסוגריים השניים כופלים ב-' + num(-c3) + ' (עם המינוס!). כמה זה ' + num(-c3) + ' × ' + p(d3) + '?', a: -c3 * d3, hint: d3 < 0 ? 'מינוס כפול מינוס נותן פלוס.' : 'מינוס כפול פלוס נותן מינוס.' },
        { show: M(a + 'x − ' + c3 + 'x') + (a * b < 0 ? ' − ' + (-a * b) : ' + ' + a * b) + (-c3 * d3 < 0 ? ' − ' + (c3 * d3) : ' + ' + (-c3 * d3)), q: 'מכנסים את האיקסים: ' + a + ' − ' + c3 + ' = ?', a: a - c3, hint: 'רק המקדמים של x.' },
        { show: lin(a - c3, 0) + ' ' + M((a * b < 0 ? '− ' + (-a * b) : '+ ' + a * b) + (-c3 * d3 < 0 ? ' − ' + (c3 * d3) : ' + ' + (-c3 * d3))), q: 'ועכשיו המספרים: ' + num(a * b) + ' + ' + p(-c3 * d3) + ' = ?', a: a * b - c3 * d3, hint: 'רק המספרים בלי x.' }], fin: lin(a - c3, a * b - c3 * d3) };
    } });

  // ---------- 6. משפט פיתגורס ----------
  var TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29], [9, 40, 41]];
  T.push({ id: 'pitagoras', em: '📐', name: 'משפט פיתגורס', grade: 'כיתות ח׳–ט׳',
    lesson: [
      { m: TRI, t: 'במשולש ישר זווית, הצלע הארוכה שמול הזווית הישרה נקראת יתר. שתי הצלעות האחרות נקראות ניצבים.' },
      { m: SQ, t: 'אם בונים ריבוע על כל צלע, השטח של הריבוע שעל היתר שווה בדיוק לסכום של שני הריבועים האחרים. תשע ועוד שש עשרה, עשרים וחמש.' },
      { m: 'a² + b² = c²', t: 'זה משפט פיתגורס: a בריבוע ועוד b בריבוע שווה c בריבוע. c הוא תמיד היתר.' },
      { m: '3² + 4² = 9 + 16 = ' + M('25'), t: 'בדוגמה שלנו: שלוש בריבוע זה תשע, ארבע בריבוע זה שש עשרה. ביחד עשרים וחמש.' },
      { m: 'c = √25 = <b class="ok">5</b>', t: 'c בריבוע הוא עשרים וחמש, אז c הוא השורש של עשרים וחמש: חמש.' },
      { m: he('ניצב חסר:') + '<br>b² = c² − a²', t: 'ואם חסר דווקא ניצב? מחסירים: היתר בריבוע פחות הניצב בריבוע, ואז מוציאים שורש.' }
    ],
    gen: function (lv) {
      var t = pick(TRIPLES), k = lv === 1 ? R(1, 2) : 1, a = t[0] * k, b = t[1] * k, c = t[2] * k;
      if (Math.random() < .5) { var s = a; a = b; b = s; }
      if (lv === 1) return { ex: he('ניצבים ' + a + ' ו-' + b + '. מה אורך היתר?'), steps: [
        { show: M(a + '²') + ' + ' + b + '² = c²', q: a + '² = ?', a: a * a, hint: a + ' × ' + a },
        { show: (a * a) + ' + ' + M(b + '²') + ' = c²', q: b + '² = ?', a: b * b, hint: b + ' × ' + b },
        { show: M((a * a) + ' + ' + (b * b)) + ' = c²', q: 'כמה זה c²?', a: c * c, hint: 'מחברים.' },
        { show: 'c = √' + (c * c), q: 'c = √' + (c * c) + ' = ?', a: c, hint: 'איזה מספר כפול עצמו נותן ' + (c * c) + '?' }], fin: 'c = ' + c };
      if (lv === 2) return { ex: he('יתר ' + c + ', ניצב ' + a + '. מה אורך הניצב השני?'), steps: [
        { show: 'b² = ' + M(c + '²') + ' − ' + a + '²', q: c + '² = ?', a: c * c, hint: c + ' × ' + c },
        { show: 'b² = ' + (c * c) + ' − ' + M(a + '²'), q: a + '² = ?', a: a * a, hint: a + ' × ' + a },
        { show: 'b² = ' + M((c * c) + ' − ' + (a * a)), q: 'כמה זה b²?', a: b * b, hint: 'מחסירים: היתר בריבוע פחות הניצב בריבוע.' },
        { show: 'b = √' + (b * b), q: 'b = √' + (b * b) + ' = ?', a: b, hint: 'איזה מספר כפול עצמו נותן ' + (b * b) + '?' }], fin: 'b = ' + b };
      var x = R(2, 9), y; do { y = R(2, 12); } while (TRIPLES.some(function (q) { return (q[0] === x && q[1] === y) || (q[1] === x && q[0] === y); }));
      var cc = Math.sqrt(x * x + y * y);
      return { ex: he('ניצבים ' + x + ' ו-' + y + '. מה אורך היתר? (בעיגול לספרה אחת אחרי הנקודה)'), steps: [
        { show: M(x + '²') + ' + ' + M(y + '²'), q: x + '² + ' + y + '² = ?', a: x * x + y * y, hint: (x * x) + ' + ' + (y * y) },
        { show: 'c = √' + (x * x + y * y), q: 'c = √' + (x * x + y * y) + ' ≈ ? (ספרה אחת אחרי הנקודה)', a: r1(cc), tol: 0.051, hint: 'השורש נמצא בין ' + Math.floor(cc) + ' ל-' + Math.ceil(cc) + '. אפשר להיעזר במחשבון.' }], fin: 'c ≈ ' + r1(cc) };
    } });

  // ---------- 7. נוסחת השורשים ----------
  T.push({ id: 'shorashim', em: '√', name: 'משוואה ריבועית ונוסחת השורשים', grade: 'כיתות ט׳–י׳',
    lesson: [
      { m: 'x² − 5x + 6 = 0', t: 'משוואה ריבועית היא משוואה שיש בה איקס בריבוע. כותבים אותה בצורה: a איקס בריבוע, ועוד b איקס, ועוד c, שווה אפס.' },
      { m: 'a = 1 &nbsp; b = ' + M('−5') + ' &nbsp; c = 6', t: 'קודם מזהים את המקדמים. שימו לב לסימן: b כאן הוא מינוס חמש, לא חמש.' },
      { m: 'x = ' + F('−b ± √(b² − 4ac)', '2a'), t: 'זו נוסחת השורשים. היא נראית מפחידה, אבל עושים אותה בשלבים קטנים.' },
      { m: 'Δ = b² − 4ac = 25 − 24 = ' + M('1'), t: 'שלב ראשון: מה שמתחת לשורש. קוראים לו דלתא. מינוס חמש בריבוע זה עשרים וחמש. ארבע כפול אחת כפול שש זה עשרים וארבע. דלתא שווה אחת.' },
      { m: '√Δ = √1 = 1', t: 'השורש של אחת הוא אחת.' },
      { m: 'x₁ = ' + F('5 + 1', '2') + ' = <b class="ok">3</b> &nbsp; x₂ = ' + F('5 − 1', '2') + ' = <b class="ok">2</b>', t: 'עכשיו מציבים. מינוס b זה חמש. פעם עם פלוס: חמש ועוד אחת, חלקי שתיים, שלוש. ופעם עם מינוס: חמש פחות אחת, חלקי שתיים, שתיים.' },
      { m: 'Δ < 0 → ' + he('אין פתרון') + '<br>Δ = 0 → ' + he('פתרון אחד'), t: 'אם דלתא שלילית, אין פתרון. אם דלתא אפס, יש פתרון אחד בלבד.' },
      { m: he('בדיקה:') + ' 3² − 5·3 + 6 = 0 ✓', t: 'ובודקים: שלוש בריבוע, פחות חמש כפול שלוש, ועוד שש. יוצא אפס. נכון.' }
    ],
    gen: function (lv) {
      var a, b, c, x1, x2;
      if (lv === 3) {
        var P = pick([2, 3]), m, n; do { m = nz(-7, 7); n = nz(-6, 6); } while (gcd(m, P) !== 1 || m === P * n);
        a = P; b = -(m + P * n); c = m * n;
        var ra = m / P, rb = n; x1 = Math.max(ra, rb); x2 = Math.min(ra, rb);
      } else {
        var r = nz(-8, 8), s; do { s = nz(-8, 8); } while (s === r);
        a = lv === 1 ? 1 : pick([2, -1, 3]); b = -a * (r + s); c = a * r * s;
        x1 = a > 0 ? Math.max(r, s) : Math.min(r, s); x2 = a > 0 ? Math.min(r, s) : Math.max(r, s);
      }
      var D = b * b - 4 * a * c, sq = Math.round(Math.sqrt(D));
      var st = [
        { show: quad(a, b, c), q: 'מה b? (עם הסימן)', a: b, hint: 'b הוא המספר שלפני ה-x (בלי הריבוע). אם כתוב מינוס, b שלילי.' },
        { show: 'Δ = ' + M(p(b) + '²') + ' − 4·' + p(a) + '·' + p(c), q: p(b) + '² = ?', a: b * b, hint: 'מספר בריבוע הוא תמיד חיובי.' },
        { show: 'Δ = ' + (b * b) + ' − ' + M('4·' + p(a) + '·' + p(c)), q: '4 × ' + p(a) + ' × ' + p(c) + ' = ?', a: 4 * a * c, hint: 'שימו לב לסימנים.' },
        { show: 'Δ = ' + M((b * b) + ' − ' + p(4 * a * c)), q: 'Δ = ?', a: D, hint: (b * b) + ' − ' + p(4 * a * c) },
        { show: '√Δ = √' + D, q: '√' + D + ' = ?', a: sq, hint: 'איזה מספר כפול עצמו נותן ' + D + '?' },
        { show: 'x₁ = ' + F(num(-b) + ' + ' + sq, '2·' + p(a)), q: 'x₁ = (' + num(-b) + ' + ' + sq + ') ÷ ' + p(2 * a) + ' = ?', a: (-b + sq) / (2 * a), hint: 'מינוס b הוא ' + num(-b) + '. מחברים את השורש ומחלקים ב-' + num(2 * a) + '. מותר לענות בשבר, למשל 1/2.' },
        { show: 'x₂ = ' + F(num(-b) + ' − ' + sq, '2·' + p(a)), q: 'x₂ = (' + num(-b) + ' − ' + sq + ') ÷ ' + p(2 * a) + ' = ?', a: (-b - sq) / (2 * a), hint: 'עכשיו עם מינוס לפני השורש.' }
      ];
      var fx = function (v) { return Number.isInteger(v) ? num(v) : fracVal(Math.round(v * 2 * Math.abs(a)), 2 * Math.abs(a)); };
      return { ex: quad(a, b, c), steps: st, fin: 'x₁ = ' + fx((-b + sq) / (2 * a)) + ' &nbsp; x₂ = ' + fx((-b - sq) / (2 * a)) };
    } });

  // =====================================================================
  //  המצב, הרשימה, השיעור והתרגול
  // =====================================================================
  var KEY = 'limudim-math', st = load(KEY, { t: {}, sound: 1 });
  function ts(id) { st.t[id] = st.t[id] || { lv: 1, streak: 0, done: 0, max: 0, seen: 0 }; return st.t[id]; }
  var cur = null;

  function renderList() {
    $('mx-list').innerHTML = T.map(function (t) {
      var s = st.t[t.id], stars = '';
      for (var i = 1; i <= 3; i++) stars += '<i class="' + (s && s.max >= i ? 'on' : '') + '">★</i>';
      return '<button type="button" class="mx-topic" data-topic="' + t.id + '"><span class="em" aria-hidden="true">' + t.em + '</span><span><b>' + t.name + '</b><small>' + t.grade + (s && s.done ? ' · ' + s.done + ' תרגילים' : '') + '</small></span><span class="mx-stars" aria-label="שלבים שהושלמו">' + stars + '</span></button>';
    }).join('');
  }
  $('mx-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-topic]'); if (!b) return;
    open(b.dataset.topic, true);
  });
  function open(id, scroll) {
    cur = T.filter(function (t) { return t.id === id; })[0]; if (!cur) return;
    prob = null;
    history.replaceState(null, '', '#' + id);
    $('mx-home').hidden = true; $('mx-topic').hidden = false;
    $('mx-t-name').textContent = cur.name; $('mx-t-grade').textContent = cur.grade;
    var s = ts(id);
    player.load(cur.lesson);
    if (!s.seen) { $('mx-lesson').hidden = false; $('mx-practice').hidden = true; }
    else { $('mx-lesson').hidden = true; $('mx-practice').hidden = false; newProblem(); }
    tabs();
    if (scroll) $('mx-topic').scrollIntoView({ behavior: 'smooth', block: 'start' });
    used({ action: 'open', topic: id });
  }
  function tabs() {
    $('mx-tab-l').classList.toggle('on', !$('mx-lesson').hidden);
    $('mx-tab-p').classList.toggle('on', !$('mx-practice').hidden);
  }
  $('mx-tab-l').addEventListener('click', function () { $('mx-practice').hidden = true; $('mx-lesson').hidden = false; tabs(); });
  $('mx-tab-p').addEventListener('click', function () { player.stop(); ts(cur.id).seen = 1; save(KEY, st); $('mx-lesson').hidden = true; $('mx-practice').hidden = false; tabs(); if (!prob) newProblem(); });
  $('mx-back').addEventListener('click', function () { player.stop(); history.replaceState(null, '', location.pathname); $('mx-topic').hidden = true; $('mx-home').hidden = false; prob = null; renderList(); });

  // ---------- נגן השיעור ----------
  var player = (function () {
    var frames = [], i = 0, playing = false, timer = null, voice = null, hasTTS = 'speechSynthesis' in window;
    function pickVoice() {
      if (!hasTTS) return;
      var v = speechSynthesis.getVoices().filter(function (x) { return /^he|^iw/i.test(x.lang); });
      voice = v[0] || null;
      $('mx-snd').hidden = !voice;
      $('mx-novoice').hidden = !!voice;
    }
    if (hasTTS) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } else { $('mx-snd').hidden = true; $('mx-novoice').hidden = false; }
    function show() {
      var f = frames[i];
      var stage = $('mx-stage');
      stage.classList.remove('in'); void stage.offsetWidth;
      stage.innerHTML = '<div class="mx-math" dir="ltr">' + f.m + '</div>';
      stage.classList.add('in');
      $('mx-cap').textContent = f.t;
      $('mx-prog').innerHTML = frames.map(function (x, k) { return '<i class="' + (k < i ? 'd' : k === i ? 'c' : '') + '"></i>'; }).join('');
      $('mx-prev').disabled = i === 0;
      $('mx-next').textContent = i === frames.length - 1 ? 'לתרגול ←' : 'הבא ›';
    }
    function sayThenNext() {
      clearTimeout(timer);
      if (!playing) return;
      var t = frames[i].t, done = function () { if (!playing) return; timer = setTimeout(function () { if (i < frames.length - 1) { i++; show(); sayThenNext(); } else { playing = false; btn(); } }, 900); };
      if (voice && st.sound) {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(t); u.voice = voice; u.lang = voice.lang; u.rate = 0.95;
        var guard = setTimeout(done, t.length * 110 + 4000); // אם הקול נתקע
        u.onend = function () { clearTimeout(guard); done(); };
        speechSynthesis.speak(u);
      } else timer = setTimeout(done, Math.max(2600, t.length * 62));
    }
    function btn() { $('mx-play').textContent = playing ? '⏸ עצירה' : (i === frames.length - 1 && !playing ? '↺ מההתחלה' : '▶ לנגן'); $('mx-play').setAttribute('aria-pressed', playing); }
    function stop() { playing = false; clearTimeout(timer); if (hasTTS) speechSynthesis.cancel(); btn(); }
    $('mx-play').addEventListener('click', function () {
      if (playing) { stop(); return; }
      if (i === frames.length - 1) { i = 0; show(); }
      playing = true; btn(); sayThenNext(); used({ action: 'lesson_play', topic: cur.id });
    });
    $('mx-prev').addEventListener('click', function () { var p2 = playing; stop(); if (i > 0) { i--; show(); } if (p2) { playing = true; btn(); sayThenNext(); } });
    $('mx-next').addEventListener('click', function () {
      var p2 = playing; stop();
      if (i < frames.length - 1) { i++; show(); if (p2) { playing = true; btn(); sayThenNext(); } }
      else $('mx-tab-p').click();
    });
    $('mx-snd').addEventListener('click', function () { st.sound = st.sound ? 0 : 1; save(KEY, st); sndBtn(); if (!st.sound && hasTTS) speechSynthesis.cancel(); });
    function sndBtn() { $('mx-snd').textContent = st.sound ? '🔊 קריינות' : '🔇 בלי קול'; }
    sndBtn();
    return { load: function (f) { stop(); frames = f; i = 0; show(); btn(); }, stop: stop };
  })();

  // ---------- תרגול ----------
  var prob = null, k = 0, tries = 0, clean = true, busy = false;
  function newProblem() {
    var s = ts(cur.id);
    prob = cur.gen(s.lv); k = 0; tries = 0; clean = true; busy = false;
    $('mx-lv').innerHTML = [1, 2, 3].map(function (n) { return '<button type="button" data-lv="' + n + '" class="' + (n === s.lv ? 'on' : '') + '">שלב ' + n + (s.max >= n ? ' ★' : '') + '</button>'; }).join('');
    $('mx-streak').innerHTML = s.lv === 3 && s.max >= 3 ? 'השלמתם את כל השלבים! ממשיכים לתרגל כמה שרוצים.' : '<span>עוד ' + (3 - s.streak) + ' נכונים ברצף לשלב הבא</span> ' + [0, 1, 2].map(function (n) { return '<i class="' + (n < s.streak ? 'on' : '') + '"></i>'; }).join('');
    $('mx-ex').innerHTML = '<div dir="ltr">' + prob.ex + '</div>';
    $('mx-done').innerHTML = ''; $('mx-end').hidden = true; $('mx-stepbox').hidden = false;
    step();
  }
  function step() {
    var s = prob.steps[k];
    $('mx-cur').innerHTML = '<div dir="ltr">' + s.show + '</div>';
    $('mx-q').innerHTML = '<span class="pill">צעד ' + (k + 1) + ' מתוך ' + prob.steps.length + '</span> ' + s.q;
    $('mx-in').value = ''; $('mx-fb').textContent = ''; $('mx-fb').className = 'mx-fb'; $('mx-hint').hidden = true; tries = 0;
    try { $('mx-in').focus({ preventScroll: true }); } catch (e) {}
  }
  function fmtAns(s) {
    if (s.fr) return s.fr[1] === 1 ? num(s.fr[0]) : s.fr[0] + '/' + s.fr[1];
    if (Number.isInteger(s.a)) return num(s.a);
    var a = Math.round(s.a * 1000) / 1000;
    if (Math.abs(a - s.a) < 1e-9) return num(a);
    for (var d = 2; d <= 24; d++) { var n = Math.round(s.a * d); if (Math.abs(n / d - s.a) < 1e-9) return n + '/' + d; }
    return String(a);
  }
  function finishStep(right) {
    var s = prob.steps[k];
    $('mx-done').insertAdjacentHTML('beforeend', '<li class="' + (right ? '' : 'shown') + '"><div dir="ltr">' + s.show.replace(/<\/?mark>/g, '') + '</div><span>' + (right ? '✓ ' : '👀 ') + '<bdi dir="ltr">' + esc(fmtAns(s).replace(/^-/, '−')) + '</bdi></span></li>');
    k++;
    if (k < prob.steps.length) { step(); return; }
    // סוף התרגיל
    var t = ts(cur.id), msg;
    t.done++;
    if (clean) {
      t.streak++;
      if (t.streak >= 3) {
        t.streak = 0;
        if (t.lv > t.max) t.max = t.lv;
        if (t.lv < 3) { t.lv++; msg = '🎉 עליתם לשלב ' + t.lv + '! התרגילים יהיו קצת יותר מאתגרים.'; }
        else msg = '🏆 השלמתם את השלב הכי גבוה בנושא הזה. כל הכבוד!';
        used({ action: 'level_up', topic: cur.id, lv: t.lv });
      } else msg = pick(['מצוין! פתרתם לבד.', 'יפה מאוד!', 'נכון! ככה בדיוק.', 'כל הכבוד!']);
    } else { t.streak = 0; msg = 'סיימתם את התרגיל. בתרגיל הבא ננסה לעשות את כל הצעדים לבד.'; }
    save(KEY, st);
    $('mx-stepbox').hidden = true; $('mx-end').hidden = false;
    $('mx-end-msg').innerHTML = '<div class="mx-fin" dir="ltr">' + (prob.fin || fmtAns(prob.steps[prob.steps.length - 1])) + '</div><p>' + msg + '</p>';
    try { $('mx-nextp').focus({ preventScroll: true }); } catch (e) {}
    used({ action: 'solved', topic: cur.id, clean: clean ? 1 : 0, lv: t.lv });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  $('mx-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy || !prob || k >= prob.steps.length) return;
    var s = prob.steps[k], raw = $('mx-in').value;
    if (!raw.trim()) { $('mx-fb').textContent = 'כותבים מספר בתיבה ולוחצים "לבדוק".'; return; }
    var v = parseVal(raw);
    if (isNaN(v)) { $('mx-fb').textContent = 'לא הבנתי את המספר. אפשר לכתוב למשל 12, ‎-3, 2.5 או 3/4.'; $('mx-fb').className = 'mx-fb no'; return; }
    if (Math.abs(v - s.a) <= (s.tol || 1e-6)) {
      if (s.fr && raw.indexOf('/') > -1) {
        var q = raw.replace(/\s/g, '').replace(/[−–]/g, '-').split('/');
        if (gcd(+q[0], +q[1]) !== 1) { $('mx-fb').textContent = 'נכון בערך, אבל אפשר לצמצם עוד. מחלקים שוב באותו מספר.'; $('mx-fb').className = 'mx-fb no'; return; }
      }
      finishStep(true);
    } else {
      tries++; clean = false;
      if (tries === 1) { $('mx-fb').textContent = 'עוד לא. נסו שוב, יש רמז למטה.'; $('mx-hint').hidden = false; $('mx-hint').textContent = '💡 ' + s.hint; }
      else { $('mx-fb').textContent = 'גם זה לא. הנה התשובה, וממשיכים לצעד הבא.'; busy = true; setTimeout(function () { busy = false; finishStep(false); }, 1300); }
      $('mx-fb').className = 'mx-fb no';
    }
  });
  $('mx-hintbtn').addEventListener('click', function () { clean = false; $('mx-hint').hidden = false; $('mx-hint').textContent = '💡 ' + prob.steps[k].hint; });
  $('mx-show').addEventListener('click', function () { if (busy || k >= prob.steps.length) return; clean = false; finishStep(false); });
  $('mx-nextp').addEventListener('click', newProblem);
  $('mx-lv').addEventListener('click', function (e) {
    var b = e.target.closest('[data-lv]'); if (!b) return;
    var t = ts(cur.id); t.lv = +b.dataset.lv; t.streak = 0; save(KEY, st); newProblem();
  });
  $('mx-reset').addEventListener('click', function () {
    var t = ts(cur.id); t.lv = 1; t.streak = 0; save(KEY, st); newProblem();
  });

  renderList();
  var h = location.hash.slice(1);
  if (h && T.some(function (t) { return t.id === h; })) open(h, false);
  window.__mx = { T: T, parseVal: parseVal, step: function () { return prob && prob.steps[k]; } }; // לבדיקות
})();
