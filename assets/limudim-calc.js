// כלים ללימודים – מחשבון לבגרות (/limudim/machshevon/).
// מחשבון מדעי בעברית ללימוד בבית: מעלות/רדיאנים בולט, הסבר לכל מקש, פירוק החישוב, שבר ועיגול, היסטוריה, הקראה.
// ועוד: פותר משוואות עם שלבים, גרף ללמידה, מדריך "במחשבון שלכם" וטעויות נפוצות.
// ?mini=1 = רק המקשים (נפתח מתוך התרגול במתמטיקה). הכול נשמר רק בטלפון.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('cx-app') || !window.HeDibur) return;
  var KEY = 'limudim-calc';
  function load() { try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var st = load();
  st.ang = st.ang === 'rad' ? 'rad' : 'deg';
  if (st.fix == null) st.fix = 2;
  st.hist = Array.isArray(st.hist) ? st.hist.slice(0, 30) : [];
  st.model = st.model || 'es';
  var usedOnce = {};
  function used(action) { if (usedOnce[action]) return; usedOnce[action] = 1; if (window.toolUsed) window.toolUsed('machshevon', { action: action }); }
  var MINI = /[?&]mini=1/.test(location.search);
  if (MINI) document.body.classList.add('cx-mini');

  // =====================================================================
  //  מנוע החישוב: קורא תרגיל, בונה עץ, ומחשב (עם רישום של כל פעולה)
  // =====================================================================
  var Err = window.HeDibur.Err; // אותה מחלקת שגיאה כמו בממיר הדיבור
  var FN = { sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, ln: 1, log: 1, sqrt: 1, cbrt: 1, abs: 1, exp: 1, logb: 2, root: 2, ncr: 2 };
  var NAMES = ['arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan', 'sqrt', 'cbrt', 'root', 'logb', 'log', 'ln', 'sin', 'cos', 'tan', 'abs', 'exp', 'ans', 'ncr', 'pi', 'a', 'b', 'c', 'e', 'x', 'y'];
  function norm(s) {
    return String(s)
      .replace(/sin⁻¹/g, 'asin').replace(/cos⁻¹/g, 'acos').replace(/tan⁻¹/g, 'atan')
      .replace(/⁻¹/g, '^(-1)').replace(/²/g, '^2').replace(/³/g, '^3')
      .replace(/[×·∙]/g, '*').replace(/[÷:]/g, '/').replace(/[−–—]/g, '-')
      .replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/°/g, '')
      .replace(/Ans/g, 'ans').replace(/nCr/g, 'ncr').replace(/;/g, ',')
      .toLowerCase();
  }
  function tokenize(s) {
    var t = [], i = 0, m;
    s = norm(s);
    while (i < s.length) {
      var ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if ((m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)/))) { t.push({ k: 'n', v: parseFloat(m[1]) }); i += m[1].length; continue; }
      if (/[a-z]/.test(ch)) {
        var hit = null;
        for (var j = 0; j < NAMES.length; j++) if (s.substr(i, NAMES[j].length) === NAMES[j]) { hit = NAMES[j]; break; }
        if (!hit) throw new Err('לא הכרתי את "' + s.slice(i).match(/^[a-z]+/)[0] + '"');
        i += hit.length;
        t.push({ k: 'id', v: { arcsin: 'asin', arccos: 'acos', arctan: 'atan', c: 'ncr' }[hit] || hit });
        continue;
      }
      if ('+-*/^!(),'.indexOf(ch) >= 0) { t.push({ k: ch }); i++; continue; }
      throw new Err('התו "' + ch + '" לא מוכר למחשבון');
    }
    return t;
  }
  function parse(src) {
    var t = tokenize(src), p = 0, open = 0;
    if (!t.length) throw new Err('');
    function peek() { return t[p] || { k: 'end' }; }
    function eat(k) { if (peek().k === k) { p++; return true; } return false; }
    function startsValue(tk) { return tk.k === 'n' || tk.k === 'id' || tk.k === '('; }
    function expr() {
      var a = term();
      for (;;) {
        if (eat('+')) a = { t: 'op', op: '+', a: a, b: term() };
        else if (eat('-')) a = { t: 'op', op: '-', a: a, b: term() };
        else return a;
      }
    }
    function term() {
      var a = unary();
      for (;;) {
        if (eat('*')) a = { t: 'op', op: '*', a: a, b: unary() };
        else if (eat('/')) a = { t: 'op', op: '/', a: a, b: unary() };
        else if (startsValue(peek())) a = { t: 'op', op: '*', a: a, b: unary(), imp: 1 };
        else return a;
      }
    }
    function unary() {
      if (eat('-')) return { t: 'neg', a: unary() };
      if (eat('+')) return unary();
      return power();
    }
    function power() {
      var a = postfix();
      if (eat('^')) { if (peek().k === 'end') throw new Err('חסר מספר אחרי החזקה'); return { t: 'op', op: '^', a: a, b: unary() }; }
      return a;
    }
    function postfix() {
      var a = primary();
      while (peek().k === '!') { p++; a = { t: 'fact', a: a }; }
      return a;
    }
    function close() {
      if (eat(')')) { open--; return; }
      if (peek().k === 'end') return; // כמו במחשבון: סוגר שחסר בסוף נסגר לבד
      throw new Err('חסר סוגר ")"');
    }
    function primary() {
      var tk = peek();
      if (tk.k === 'n') { p++; return { t: 'num', v: tk.v }; }
      if (tk.k === '(') { p++; open++; var e = expr(); close(); return { t: 'par', a: e }; }
      if (tk.k === 'id') {
        p++;
        if (tk.v === 'pi') return { t: 'const', n: 'pi', v: Math.PI };
        if (tk.v === 'e') return { t: 'const', n: 'e', v: Math.E };
        if (tk.v === 'ans') return { t: 'ans' };
        if (tk.v === 'x' || tk.v === 'y') return { t: 'var', n: tk.v };
        if (tk.v === 'a' || tk.v === 'b') return { t: 'mem', n: tk.v };
        var n = FN[tk.v], args = [];
        if (eat('(')) {
          open++;
          if (peek().k !== 'end') {
            args.push(expr());
            while (eat(',')) args.push(expr());
          }
          close();
        } else {
          if (peek().k === 'end') throw new Err('חסר מספר אחרי ' + shown(tk.v));
          args.push(power());
        }
        if (args.length !== n) throw new Err(n === 2 ? shown(tk.v) + ' צריך שני מספרים עם פסיק ביניהם, למשל ' + ({ logb: 'logb(2, 8)', root: 'root(3, 8)', ncr: 'C(5, 2)' })[tk.v] : 'חסר מספר בתוך ' + shown(tk.v) + '( )');
        return { t: 'fn', f: tk.v, args: args };
      }
      if (tk.k === 'end') throw new Err('התרגיל לא גמור');
      if (tk.k === ')') throw new Err('יש סוגר ")" בלי סוגר פותח');
      throw new Err('חסר מספר לפני "' + ({ '*': '×', '/': '÷' }[tk.k] || tk.k) + '"');
    }
    var tree = expr();
    if (p < t.length) throw new Err(t[p].k === ')' ? 'יש סוגר ")" בלי סוגר פותח' : 'משהו לא במקום בתרגיל');
    return tree;
  }
  function shown(f) { return { asin: 'sin⁻¹', acos: 'cos⁻¹', atan: 'tan⁻¹', sqrt: '√', cbrt: '∛', ncr: 'nCr', logb: 'log', root: 'ⁿ√', exp: 'e^' }[f] || f; }
  function clean(v) { if (!isFinite(v)) return v; if (Math.abs(v) < 1e-11) return 0; return +v.toPrecision(12); }
  function fact(n) { var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; }

  // מחשב עץ. env: { ang, ans, x, rec } – rec אוסף "איך הגעתי לזה"
  function ev(n, env) {
    var v, a, b;
    switch (n.t) {
      case 'num': return n.v;
      case 'const': return n.v;
      case 'ans': return env.ans || 0;
      case 'mem': if (!st.mem || st.mem[n.n] == null) throw new Err('עוד לא שמרתם כלום ב-' + n.n.toUpperCase() + '. מחשבים, ואז לוחצים →' + n.n.toUpperCase()); return st.mem[n.n];
      case 'var': if (env.x == null) throw new Err('יש כאן ' + (n.n || 'x') + '. כדי לפתור, כותבים משוואה עם =, למשל 2x + 3 = 7'); return n.n === 'y' ? (env.y || 0) : env.x;
      case 'par': return ev(n.a, env);
      case 'neg': return -ev(n.a, env);
      case 'fact':
        a = ev(n.a, env);
        if (a < 0 || a !== Math.round(a)) throw new Err('עצרת (!) רק למספר שלם וחיובי');
        if (a > 170) throw new Err('המספר גדול מדי לעצרת');
        v = fact(a); rec(env, n, v, a); return v;
      case 'op':
        a = ev(n.a, env); b = ev(n.b, env);
        if (n.op === '/' && b === 0) throw new Err('אי אפשר לחלק ב-0');
        if (n.op !== '^') { v = clean(n.op === '+' ? a + b : n.op === '-' ? a - b : n.op === '*' ? a * b : a / b); rec(env, n, v, a, b); return v; }
        if (n.op === '^') {
          if (a < 0 && b !== Math.round(b)) {
            var q = 1 / b, qi = Math.round(q);
            if (Math.abs(q - qi) < 1e-9 && qi % 2) v = -Math.pow(-a, b);
            else throw new Err('אין חזקה כזאת למספר שלילי (במספרים ממשיים)');
          } else v = Math.pow(a, b);
          if (a === 0 && b < 0) throw new Err('אי אפשר לחלק ב-0 (0 בחזקה שלילית)');
          v = clean(v);
          rec(env, n, v, a, b);
          return v;
        }
        break;
      case 'fn':
        var x = ev(n.args[0], env), y = n.args[1] ? ev(n.args[1], env) : null, deg = env.ang === 'deg', f = n.f;
        var toR = deg ? Math.PI / 180 : 1;
        if (f === 'sin') v = Math.sin(x * toR);
        else if (f === 'cos') v = Math.cos(x * toR);
        else if (f === 'tan') {
          if (deg && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-9) throw new Err('tan של ' + fmtN(x) + '° לא מוגדר (cos שם שווה 0)');
          v = Math.tan(x * toR); if (Math.abs(v) > 1e13) throw new Err('tan לא מוגדר כאן (cos שווה 0)');
        }
        else if (f === 'asin' || f === 'acos') {
          if (x < -1 - 1e-12 || x > 1 + 1e-12) throw new Err(shown(f) + ' מקבל רק מספר בין 1- ל-1. קיבל ' + fmtN(x));
          x = Math.max(-1, Math.min(1, x)); v = (f === 'asin' ? Math.asin(x) : Math.acos(x)) / toR;
        }
        else if (f === 'atan') v = Math.atan(x) / toR;
        else if (f === 'ln' || f === 'log') {
          if (x <= 0) throw new Err(f + ' רק למספר חיובי. ' + f + '(' + fmtN(x) + ') לא קיים');
          v = f === 'ln' ? Math.log(x) : Math.log10(x);
        }
        else if (f === 'logb') {
          if (x <= 0 || x === 1) throw new Err('בסיס הלוג חייב להיות חיובי ושונה מ-1');
          if (y <= 0) throw new Err('log רק למספר חיובי');
          v = Math.log(y) / Math.log(x);
        }
        else if (f === 'sqrt') { if (x < 0) throw new Err('אין שורש ריבועי למספר שלילי (במספרים ממשיים)'); v = Math.sqrt(x); }
        else if (f === 'cbrt') v = Math.cbrt(x);
        else if (f === 'root') {
          if (x === 0) throw new Err('שורש מסדר 0 לא קיים');
          if (y < 0) { if (x === Math.round(x) && Math.abs(x) % 2 === 1) v = -Math.pow(-y, 1 / x); else throw new Err('שורש זוגי של מספר שלילי לא קיים'); }
          else v = Math.pow(y, 1 / x);
        }
        else if (f === 'abs') v = Math.abs(x);
        else if (f === 'exp') v = Math.exp(x);
        else if (f === 'ncr') {
          if (x !== Math.round(x) || y !== Math.round(y) || x < 0 || y < 0) throw new Err('nCr רק למספרים שלמים וחיוביים');
          if (y > x) throw new Err('ב-C(n, k) צריך k קטן או שווה ל-n');
          v = 1; for (var i = 1; i <= y; i++) v = v * (x - y + i) / i; v = Math.round(v);
        }
        v = clean(v);
        if (!isFinite(v)) throw new Err('המספר יצא גדול מדי');
        rec(env, n, v, x, y);
        return v;
    }
    throw new Err('משהו לא במקום בתרגיל');
  }
  function rec(env, n, v, x, y) { if (env.rec && env.rec.length < 14) env.rec.push({ n: n, v: v, x: x, y: y }); }

  // הצגת עץ בחזרה כטקסט קריא
  function fmtN(v) {
    if (typeof v !== 'number') return String(v);
    if (!isFinite(v)) return '∞';
    var s = Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-6 && v !== 0) ? v.toExponential(6).replace(/\.?0+e/, 'e') : String(+v.toPrecision(10));
    return s.replace(/^-/, '−');
  }
  function show(n, ang) {
    switch (n.t) {
      case 'num': return fmtN(n.v);
      case 'const': return n.n === 'pi' ? 'π' : 'e';
      case 'ans': return 'Ans';
      case 'var': return n.n || 'x';
      case 'mem': return n.n.toUpperCase();
      case 'par': return '(' + show(n.a, ang) + ')';
      case 'neg': return '−' + show(n.a, ang);
      case 'fact': return show(n.a, ang) + '!';
      case 'op':
        if (n.op === '^') return show(n.a, ang) + (n.b.t === 'num' && n.b.v === 2 ? '²' : n.b.t === 'neg' && n.b.a.t === 'num' && n.b.a.v === 1 ? '⁻¹' : '^' + show(n.b, ang));
        if (n.imp && n.b.t !== 'num') return show(n.a, ang) + show(n.b, ang);
        return show(n.a, ang) + ' ' + { '+': '+', '-': '−', '*': '×', '/': '÷' }[n.op] + ' ' + show(n.b, ang);
      case 'fn':
        var deg = ang === 'deg' && /^(sin|cos|tan)$/.test(n.f) ? '°' : '';
        if (n.f === 'ncr') return 'C(' + show(n.args[0], ang) + ', ' + show(n.args[1], ang) + ')';
        if (n.f === 'logb') return 'log' + sub(show(n.args[0], ang)) + '(' + show(n.args[1], ang) + ')';
        if (n.f === 'root') return show(n.args[0], ang) + '√(' + show(n.args[1], ang) + ')';
        return shown(n.f) + '(' + show(n.args[0], ang) + deg + ')';
    }
    return '';
  }
  function sub(s) { var m = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' }; return /^\d+$/.test(s) ? s.replace(/\d/g, function (d) { return m[d]; }) : '_' + s; }
  function words(n) { // תיאור במילים לשורת "איך הגעתי לזה"
    var f = n.t === 'fn' ? n.f : n.t === 'fact' ? '!' : n.op;
    return { sin: 'סינוס', cos: 'קוסינוס', tan: 'טנגנס', asin: 'הזווית שהסינוס שלה', acos: 'הזווית שהקוסינוס שלה', atan: 'הזווית שהטנגנס שלה', ln: 'לוגריתם טבעי', log: 'לוגריתם בבסיס 10', logb: 'לוגריתם', sqrt: 'שורש', cbrt: 'שורש שלישי', root: 'שורש', abs: 'ערך מוחלט', exp: 'e בחזקה', ncr: 'צירופים', '!': 'עצרת', '^': 'חזקה' }[f] || '';
  }

  // שבר מתוך מספר עשרוני (שברים משולבים), עד מכנה 1000
  function toFrac(v) {
    if (!isFinite(v) || v === Math.round(v) || Math.abs(v) > 1e6) return null;
    var s = v < 0 ? -1 : 1, x = Math.abs(v), h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
    for (var i = 0; i < 20; i++) {
      var a = Math.floor(b), h2 = a * h1 + h0, k2 = a * k1 + k0;
      if (k2 > 1000) break;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (Math.abs(x - h1 / k1) < 1e-9 * Math.max(1, x)) return [s * h1, k1];
      b = 1 / (b - a); if (!isFinite(b)) break;
    }
    return null;
  }
  function evalStr(src, env) { return ev(parse(src), env); }

  // תרגיל במילים (מדיבור או מהקלדה): בקובץ המשותף /assets/limudim-dibur.js
  var heToExpr = window.HeDibur.heToExpr, hasHe = window.HeDibur.hasHe;

  // =====================================================================
  //  מסך המחשבון
  // =====================================================================
  var inp = $('cx-in'), res = $('cx-res'), extra = $('cx-extra'), why = $('cx-why');
  var ans = typeof st.ans === 'number' ? st.ans : 0, justEval = false, lastTree = null, lastVal = null;

  // הסבר לכל מקש + איפה הוא במחשבון רגיל [כותרת, הסבר, קסיו ES, קסיו ClassWiz, TI]
  var INFO = {
    'sin(': ['sin – סינוס', 'במשולש ישר זווית: הניצב שמול הזווית חלקי היתר. נותנים זווית, ומקבלים מספר בין 1- ל-1. sin(30°) = 0.5.', 'sin', 'sin', 'SIN'],
    'cos(': ['cos – קוסינוס', 'הניצב שליד הזווית חלקי היתר. cos(60°) = 0.5.', 'cos', 'cos', 'COS'],
    'tan(': ['tan – טנגנס', 'הניצב שמול הזווית חלקי הניצב שליד. tan(45°) = 1. ב-90° הוא לא מוגדר.', 'tan', 'tan', 'TAN'],
    'sin⁻¹(': ['sin⁻¹ – הזווית שהסינוס שלה הוא המספר', 'ההפך מ-sin: נותנים מספר בין 1- ל-1, ומקבלים זווית. sin⁻¹(0.5) = 30°. זה לא "1 חלקי sin".', 'SHIFT ואז sin', 'SHIFT ואז sin', '2nd ואז SIN'],
    'cos⁻¹(': ['cos⁻¹ – הזווית שהקוסינוס שלה הוא המספר', 'ההפך מ-cos. cos⁻¹(0.5) = 60°. ככה מוצאים זווית ממשפט הקוסינוסים.', 'SHIFT ואז cos', 'SHIFT ואז cos', '2nd ואז COS'],
    'tan⁻¹(': ['tan⁻¹ – הזווית שהטנגנס שלה הוא המספר', 'ההפך מ-tan. מקבל כל מספר. tan⁻¹(1) = 45°. ככה מוצאים זווית משיפוע של ישר.', 'SHIFT ואז tan', 'SHIFT ואז tan', '2nd ואז TAN'],
    'ln(': ['ln – לוגריתם טבעי', 'באיזו חזקה צריך להעלות את e (בערך 2.718) כדי לקבל את המספר. ln(e) = 1, ו-ln(1) = 0. רק למספר חיובי.', 'ln', 'ln', 'LN'],
    'log(': ['log – לוגריתם בבסיס 10', 'באיזו חזקה צריך להעלות את 10 כדי לקבל את המספר. log(1000) = 3.', 'log', 'log', 'LOG'],
    'logb(': ['לוגריתם בכל בסיס', 'כותבים קודם את הבסיס, פסיק, ואז את המספר: logb(2, 8) = 3, כי 2³ = 8. אם אין מקש כזה: log(8) ÷ log(2).', 'המקש log■□ (ב-fx-82MS: log(8) ÷ log(2))', 'המקש log■□', 'LOG(8) ÷ LOG(2)'],
    'e^(': ['eˣ – e בחזקת', 'ההפך מ-ln. e^(1) = 2.718..., ו-e^(ln 5) = 5. משמש בגדילה ודעיכה.', 'SHIFT ואז ln', 'SHIFT ואז ln', '2nd ואז LN'],
    '√(': ['√ – שורש ריבועי', 'המספר שבריבוע נותן את מה שבתוך השורש. √(16) = 4. כשיש תרגיל בתוך השורש, הכול בתוך הסוגריים.', '√■', '√■', '2nd ואז x²'],
    '²': ['x² – בריבוע', 'כופל את המספר בעצמו. שימו לב: ‎−3² = ‎−9, אבל (‎−3)² = 9.', 'x²', 'x²', 'x²'],
    '^': ['xʸ – חזקה', 'כל חזקה: 2^5 = 32. חזקה שלילית היא "אחד חלקי": 2^(−1) = 0.5. חזקה של חצי היא שורש.', 'x■ (ב-fx-82MS: ^)', 'x■', '^'],
    'root(': ['ⁿ√ – שורש מסדר n', 'כותבים את סדר השורש, פסיק, ואז את המספר: root(3, 8) = 2, כי 2³ = 8.', 'SHIFT ואז x■ (יוצא ■√□)', 'SHIFT ואז x■', '2nd ואז ^ (ˣ√)'],
    '⁻¹': ['x⁻¹ – אחד חלקי', '5⁻¹ = 1 ÷ 5 = 0.2. טוב להפוך שבר.', 'x⁻¹', 'x⁻¹', 'x⁻¹'],
    '(': ['סוגריים', 'מה שבתוך הסוגריים מחושב קודם. כל סוגר שנפתח צריך להיסגר.', '( )', '( )', '( )'],
    ')': ['סוגר', 'סוגר את מה שנפתח. אם שוכחים אותו בסוף התרגיל, המחשבון סוגר לבד. באמצע התרגיל זה כבר משנה את התשובה.', ')', ')', ')'],
    'π': ['π – פאי', 'היחס בין היקף המעגל לקוטר שלו, בערך 3.14159. שטח מעגל: πr². עדיף המקש מאשר 3.14, כדי לא לאבד דיוק.', 'SHIFT ואז ×10ˣ', 'SHIFT ואז ×10ˣ', 'π'],
    'e': ['e – מספר אוילר', 'בערך 2.71828. הבסיס של ln ושל eˣ.', 'SHIFT ln ואז 1 (כלומר e¹)', 'SHIFT ln ואז 1, או ALPHA ×10ˣ', '2nd LN ואז 1'],
    'C(': ['nCr – מספר צירופים', 'בכמה דרכים אפשר לבחור k מתוך n, כשהסדר לא משנה. כותבים C(n, k): C(5, 2) = 10. משמש בהתפלגות בינומית.', 'n, ואז SHIFT ÷ (nCr), ואז k', 'n, ואז SHIFT ÷ (nCr), ואז k', 'n, ואז PRB ← nCr, ואז k'],
    '!': ['x! – עצרת', '4! = 4·3·2·1 = 24. כמה סידורים יש ל-4 דברים בשורה.', 'SHIFT ואז x⁻¹ (x!)', 'SHIFT ואז x⁻¹ (x!)', 'PRB ← !'],
    'Ans': ['Ans – התוצאה הקודמת', 'ממשיכים מהתוצאה המלאה, בלי להעתיק ובלי לעגל באמצע. כך לא מאבדים דיוק.', 'Ans', 'Ans', '2nd ואז (−) (ANS)'],
    '×': ['× – כפול', 'כפל. אפשר גם לכתוב 2π או 3sin(30) בלי סימן כפל.', '×', '×', '×'],
    '÷': ['÷ – חלקי', 'חילוק. כשבמכנה יש תרגיל, שמים אותו בסוגריים: 1 ÷ (2 × 4).', '÷ (או מקש השבר ■/□)', '÷ (או מקש השבר)', '÷ (או n/d)'],
    '−': ['− – פחות', 'חיסור. למספר שלילי (כמו ‎−3) יש במחשבון רגיל מקש נפרד: (−).', '− לחיסור, (−) למספר שלילי', '− לחיסור, (−) למספר שלילי', '− לחיסור, (−) למספר שלילי'],
    '+': ['+ – ועוד', 'חיבור.', '+', '+', '+'],
    '=': ['= – לחשב', 'מחשב את התרגיל ושומר את התוצאה ב-Ans ובהיסטוריה.', '=', 'EXE', 'enter'],
    'del': ['⌫ – למחוק', 'מוחק את התו או הפעולה שלפני הסמן.', 'DEL', 'DEL', 'delete'],
    'ac': ['AC – לנקות', 'מנקה את התרגיל. Ans וההיסטוריה נשארים.', 'AC', 'AC', 'clear']
  };
  var MODELS = { es: 2, ex: 3, ti: 4 }, whyKey = null;
  var MODEL_NAME = { es: 'בקסיו (fx-82ES / fx-991ES)', ex: 'בקסיו ClassWiz', ti: 'ב-Texas TI-30' };
  function showWhy(k) {
    var i = INFO[k]; if (!i) return; whyKey = k;
    why.innerHTML = '<b>' + esc(i[0]) + '</b> ' + esc(i[1]) + '<span class="cx-mk">' + MODEL_NAME[st.model] + ': <kbd>' + esc(i[MODELS[st.model]]) + '</kbd></span>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var MULTI = ['sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'sin(', 'cos(', 'tan(', 'logb(', 'log(', 'ln(', 'root(', 'e^(', '√(', 'C(', 'Ans', '⁻¹'];
  function caret() { var s = inp.selectionStart, e = inp.selectionEnd; if (s == null) s = e = inp.value.length; return [s, e]; }
  function put(txt) {
    var c = caret(), v = inp.value;
    inp.value = v.slice(0, c[0]) + txt + v.slice(c[1]);
    var pos = c[0] + txt.length;
    try { inp.setSelectionRange(pos, pos); } catch (e) {}
  }
  function del() {
    var c = caret(), v = inp.value;
    if (c[0] !== c[1]) { inp.value = v.slice(0, c[0]) + v.slice(c[1]); try { inp.setSelectionRange(c[0], c[0]); } catch (e) {} return; }
    if (!c[0]) return;
    var before = v.slice(0, c[0]), cut = 1;
    for (var i = 0; i < MULTI.length; i++) if (before.slice(-MULTI[i].length) === MULTI[i]) { cut = MULTI[i].length; break; }
    inp.value = v.slice(0, c[0] - cut) + v.slice(c[0]);
    try { inp.setSelectionRange(c[0] - cut, c[0] - cut); } catch (e) {}
  }
  function press(k) {
    if ((k !== '=' && k !== ')') || !whyKey) showWhy(k);
    if (k === '=') return commit();
    if (k === 'ac') { inp.value = ''; justEval = false; preview(); return; }
    if (k === 'del') { if (justEval) { justEval = false; inp.setSelectionRange(inp.value.length, inp.value.length); } del(); preview(); return; }
    if (justEval) {
      // אחרי "=": פעולה ממשיכה מהתוצאה, ומספר מתחיל תרגיל חדש
      if (/^[+−×÷^²!]$|^⁻¹$/.test(k)) inp.value = 'Ans';
      else inp.value = '';
      try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {}
      justEval = false;
    }
    if (k === 'logb(' || k === 'root(' || k === 'C(') { put(k + ', )'); var c = caret(); try { inp.setSelectionRange(c[0] - 3, c[0] - 3); } catch (e) {} }
    else put(k);
    preview();
  }
  function compute(src) {
    var env = { ang: st.ang, ans: ans, rec: [] };
    if (hasHe(src)) src = heToExpr(src);
    src = src.replace(/=\s*$/, '');
    var tree = parse(src), v = ev(tree, env);
    return { tree: tree, v: v, rec: env.rec };
  }
  function fixed(v) {
    if (st.fix < 0 || v === Math.round(v)) return null;
    var r = +v.toFixed(st.fix);
    if (r === v) return null;
    return r.toFixed(st.fix).replace(/^-/, '−');
  }
  function isAngleOut(tree) { return tree.t === 'fn' && /^a(sin|cos|tan)$/.test(tree.f) && st.ang === 'deg'; }
  function trigHints(tree) {
    var h = [];
    (function walk(n) {
      if (!n || typeof n !== 'object') return;
      if (n.t === 'fn' && /^(sin|cos|tan)$/.test(n.f)) {
        var a = n.args[0], hasPi = JSON.stringify(a).indexOf('"pi"') >= 0;
        if (st.ang === 'rad' && a.t === 'num' && a.v >= 15 && a.v <= 360 && a.v % 15 === 0) h.push('rad');
        if (st.ang === 'deg' && hasPi) h.push('deg');
      }
      ['a', 'b'].forEach(function (k) { walk(n[k]); }); (n.args || []).forEach(walk);
    })(tree);
    return h;
  }
  function preview() {
    var src = inp.value.trim();
    res.classList.remove('err'); res.classList.add('soft');
    extra.innerHTML = '';
    if (!src) { res.textContent = ''; return; }
    try { var r = compute(src); res.textContent = '= ' + fmtN(r.v) + (isAngleOut(r.tree) ? '°' : ''); }
    catch (e) { res.textContent = ''; }
  }
  function commit(byVoice) {
    if (!byVoice) lastHeard = null;
    var src = inp.value.trim();
    if (!src) return;
    res.classList.remove('soft');
    try {
      if (trySolve(src, byVoice)) { if (!byVoice) lastHeard = null; return; }
      var r = compute(src), said = hasHe(src) ? src : null;
      if (said) { src = show(r.tree, st.ang); inp.value = src; }
      ans = r.v; st.ans = ans; lastTree = r.tree; lastVal = r.v;
      var deg = isAngleOut(r.tree) ? '°' : '';
      res.classList.remove('err');
      res.textContent = '= ' + fmtN(r.v) + deg;
      var ex = [], fr = toFrac(r.v), fx = fixed(r.v);
      if (fx && (MINI || EXAM)) ex.push('<span>מעוגל ל-' + (st.fix === 1 ? 'ספרה אחת' : st.fix + ' ספרות') + ': <b dir="ltr">' + fx + deg + '</b></span>'); void fr;
      trigHints(r.tree).forEach(function (h) {
        ex.push(h === 'rad'
          ? '<span class="cx-alert">⚠️ המחשבון במצב <b>רדיאנים</b>. אם התכוונתם למעלות (כמו ברוב הבגרות), התשובה אחרת. <button type="button" class="linkish" data-setang="deg">לעבור למעלות</button></span>'
          : '<span class="cx-alert">⚠️ יש π בתוך זווית, וזה בדרך כלל ברדיאנים. המחשבון במצב <b>מעלות</b>. <button type="button" class="linkish" data-setang="rad">לעבור לרדיאנים</button></span>');
      });
      if (said) ex.unshift('<span>' + (byVoice ? '🎤 שמעתי' : '✍️ הבנתי') + ': "' + esc(said) + '"</span>');
      extra.innerHTML = ex.join('');
      if (byVoice) speak(sayExpr(src) + ' שווה ' + sayNum(r.v) + (deg ? ' מעלות' : ''));
      steps(r);
      afterCommit(r, byVoice);
      st.hist.unshift({ e: src, r: fmtN(r.v) + deg, a: st.ang });
      st.hist = st.hist.slice(0, 30); save(); hist();
      justEval = true;
      try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {}
      used('calc');
    } catch (e) {
      if (!(e instanceof Err)) throw e;
      res.classList.add('err');
      res.textContent = e.msg || '';
      extra.innerHTML = '';
      $('cx-steps-p').hidden = true;
      afterError(e.msg);
    }
  }
  function hist() {
    var ol = $('cx-hist');
    ol.innerHTML = st.hist.map(function (h, i) {
      return '<li><button type="button" data-h="' + i + '"><span dir="ltr" class="e">' + esc(h.e) + '</span><span dir="ltr" class="r">= ' + esc(h.r) + '</span>' + (h.a === 'rad' ? '<small>RAD</small>' : '') + '</button></li>';
    }).join('');
    $('cx-hempty').hidden = st.hist.length > 0;
    $('cx-hclear').hidden = !st.hist.length;
  }
  $('cx-hist').addEventListener('click', function (e) {
    var b = e.target.closest('[data-h]'); if (!b) return;
    var h = st.hist[+b.dataset.h]; if (!h) return;
    inp.value = h.e; justEval = false; preview();
    $('cx-app').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('cx-hclear').addEventListener('click', function () { st.hist = []; save(); hist(); });

  $('cx-keys').addEventListener('click', function (e) {
    var b = e.target.closest('[data-k]'); if (!b) return;
    press(b.dataset.k);
  });
  inp.addEventListener('input', function () { justEval = false; preview(); });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); press('ac'); }
  });
  extra.addEventListener('click', function (e) { var b = e.target.closest('[data-setang]'); if (b) { setAng(b.dataset.setang); commit(); } });

  // מעלות / רדיאנים
  function setAng(a) {
    st.ang = a; save();
    var b = $('cx-ang');
    b.querySelectorAll('[data-a]').forEach(function (s) { s.classList.toggle('on', s.dataset.a === a); });
    b.classList.toggle('rad', a === 'rad');
    b.setAttribute('aria-label', 'מצב זוויות: ' + (a === 'deg' ? 'מעלות' : 'רדיאנים') + '. לחיצה מחליפה');
    $('cx-ang-d').textContent = a === 'deg' ? 'בבגרות כמעט תמיד מעלות' : 'רדיאנים: לפונקציות כמו sin(x) בחקירה';
    preview();
  }
  $('cx-ang').addEventListener('click', function () {
    setAng(st.ang === 'deg' ? 'rad' : 'deg');
    why.innerHTML = '<b>מעלות או רדיאנים.</b> זו הטעות הכי נפוצה בבגרות: sin(30) במעלות הוא 0.5, וברדיאנים ‎−0.988. בשאלות על משולשים תמיד מעלות.<span class="cx-mk">' + MODEL_NAME[st.model] + ': <kbd>' + esc(GUIDE[0][2 + MODELS[st.model] - 2]) + '</kbd></span>';
    if (inp.value.trim() && !justEval) preview(); else if (justEval) commit();
  });
  $('cx-fix').value = String(st.fix);
  $('cx-fix').addEventListener('change', function () { st.fix = +this.value; save(); if (justEval) commit(); });
  $('cx-kb').addEventListener('click', function () {
    var on = inp.getAttribute('inputmode') === 'none';
    inp.setAttribute('inputmode', on ? 'text' : 'none');
    this.setAttribute('aria-pressed', on ? 'true' : 'false');
    inp.blur(); inp.focus();
  });

  // ---------- הקראה ----------
  var voice = null;
  function pickVoice() { try { var v = speechSynthesis.getVoices().filter(function (x) { return /^he|^iw/i.test(x.lang); }); voice = v[0] || null; } catch (e) {} }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } else $('cx-say').hidden = true;
  function sayNum(v) { return fmtN(v).replace('−', 'מינוס ').replace('.', ' נקודה '); }
  function sayExpr(s) {
    return ' ' + s.replace(/sin⁻¹/g, ' הזווית שהסינוס שלה ').replace(/cos⁻¹/g, ' הזווית שהקוסינוס שלה ').replace(/tan⁻¹/g, ' הזווית שהטנגנס שלה ')
      .replace(/sin/g, ' סינוס ').replace(/cos/g, ' קוסינוס ').replace(/tan/g, ' טנגנס ').replace(/ln/g, ' לוגריתם טבעי של ').replace(/log/g, ' לוג ')
      .replace(/√/g, ' שורש ').replace(/²/g, ' בריבוע ').replace(/⁻¹/g, ' בחזקת מינוס אחת ').replace(/\^/g, ' בחזקת ').replace(/×|\*/g, ' כפול ')
      .replace(/÷|\//g, ' חלקי ').replace(/[−-]/g, ' פחות ').replace(/\+/g, ' ועוד ').replace(/π/g, ' פאי ').replace(/Ans/g, ' התוצאה הקודמת ')
      .replace(/\(/g, ' ').replace(/\)/g, ' ').replace(/\./g, ' נקודה ').replace(/!/g, ' עצרת ').replace(/C/g, ' צירופים ');
  }
  $('cx-say').addEventListener('click', function () {
    if (!('speechSynthesis' in window)) return;
    var t = inp.value.trim() ? sayExpr(inp.value) : '';
    if (lastVal != null && justEval) t += ' שווה ' + sayNum(lastVal) + (isAngleOut(lastTree) ? ' מעלות' : '');
    else if (!t) t = why.textContent;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(t.replace(/\s+/g, ' ')); u.lang = 'he-IL'; if (voice) u.voice = voice; u.rate = 0.95;
    speechSynthesis.speak(u);
    used('say');
  });


  // ---------- להגיד תרגיל בקול (זיהוי דיבור של הדפדפן, עברית) ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, recog = null, listening = false, mic = $('cx-mic');
  function speak(t) {
    if (!('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(t.replace(/\s+/g, ' ')); u.lang = 'he-IL'; if (voice) u.voice = voice; u.rate = 0.95;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function micUi(on) {
    listening = on; mic.classList.toggle('on', on); mic.setAttribute('aria-pressed', on ? 'true' : 'false');
    mic.textContent = on ? '⏹ מקשיב… לעצור' : '🎤 להגיד בקול';
  }
  function heard(alts) {
    // עוברים על האפשרויות שהדפדפן שמע, עד אחת שהיא תרגיל תקין
    var firstErr = null;
    lastHeard = alts[0] || ''; alts = alts.map(applyFix);
    for (var i = 0; i < alts.length; i++) {
      try { var e0 = (hasHe(alts[i]) ? heToExpr(alts[i]) : alts[i]).replace(/=\s*$/, ''), v0 = varsIn(e0); if (!(v0.x || v0.y || e0.indexOf('=') >= 0)) compute(alts[i]); inp.value = alts[i]; justEval = false; commit(true); return; }
      catch (e) { if (!(e instanceof Err)) throw e; if (!firstErr) firstErr = e; }
    }
    inp.value = alts[0] || ''; justEval = false;
    res.classList.remove('soft'); res.classList.add('err');
    res.textContent = (firstErr && firstErr.msg) || 'לא הבנתי. נסו שוב';
    extra.innerHTML = '<span>🎤 שמעתי: "' + esc(alts[0] || '') + '". אפשר לתקן בכתב וללחוץ =</span><span><button type="button" class="linkish" data-vfix>✏️ לתקן ולזכור לפעם הבאה</button></span>';
  }
  mic.addEventListener('click', function () {
    used('voice');
    if (!SR) {
      why.innerHTML = '<b>אין כאן זיהוי דיבור.</b> בכרום בטלפון אנדרואיד או במחשב זה עובד. בינתיים אפשר לכתוב את התרגיל במילים, למשל <span dir="rtl">"שורש של 16 ועוד 3"</span>, או ללחוץ "⌨ מקלדת הטלפון" ולהשתמש במיקרופון של המקלדת.';
      return;
    }
    if (listening && recog) { recog.stop(); return; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    recog = new SR(); recog.lang = 'he-IL'; recog.interimResults = true; recog.maxAlternatives = 4; recog.continuous = false;
    var got = false;
    recog.onresult = function (e) {
      var r = e.results[e.results.length - 1];
      if (!r.isFinal) { res.classList.remove('err'); res.classList.add('soft'); res.textContent = '🎤 ' + r[0].transcript; return; }
      got = true;
      var alts = []; for (var i = 0; i < r.length; i++) alts.push(r[i].transcript.trim());
      heard(alts);
    };
    recog.onerror = function (e) {
      var m = { 'not-allowed': 'צריך לאשר למחשבון להשתמש במיקרופון (בחלון שנפתח, או בהגדרות האתר).', 'service-not-allowed': 'צריך לאשר למחשבון להשתמש במיקרופון.', 'no-speech': 'לא שמעתי. לוחצים שוב על 🎤 ומדברים.', 'network': 'זיהוי הדיבור צריך אינטרנט.', 'audio-capture': 'לא מצאתי מיקרופון.' }[e.error];
      if (m) { res.classList.remove('soft'); res.classList.add('err'); res.textContent = m; }
      got = true;
    };
    recog.onend = function () { micUi(false); if (!got && /^🎤/.test(res.textContent)) res.textContent = ''; };
    try { recog.start(); micUi(true); res.classList.remove('err'); res.classList.add('soft'); res.textContent = '🎤 מקשיב… אמרו את התרגיל'; extra.innerHTML = ''; }
    catch (e) { micUi(false); }
  });

  // =====================================================================
  //  לשוניות
  // =====================================================================
  var TABS = ['calc', 'solve', 'stat', 'tri', 'cv', 'graph', 'bank', 'guide', 'err'];
  function tab(name) {
    TABS.forEach(function (t) {
      var on = t === name;
      $('cx-p-' + t).hidden = !on;
      var b = $('cx-t-' + t); b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
    });
    if (name === 'graph') setTimeout(plot, 0);
    if (name !== 'calc') used('tab_' + name);
  }
  document.querySelector('.cx-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) { tab(b.dataset.tab); history.replaceState(null, '', b.dataset.tab === 'calc' ? location.pathname + location.search : '#' + b.dataset.tab); } });
  document.querySelector('.cx-tabs').addEventListener('keydown', function (e) {
    var i = TABS.indexOf((e.target.dataset || {}).tab); if (i < 0) return;
    var d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; if (!d) return;
    var n = TABS[(i + d + TABS.length) % TABS.length]; tab(n); $('cx-t-' + n).focus(); e.preventDefault();
  });
  function tryIt(expr, ang) {
    if (ang) setAng(ang);
    tab('calc'); inp.value = expr; justEval = false; commit();
    $('cx-app').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // =====================================================================
  //  משוואות
  // =====================================================================
  function numIn(id) {
    var s = $(id).value.trim(); if (!s) return NaN;
    try { return evalStr(s, { ang: st.ang, ans: ans }); } catch (e) { return NaN; }
  }
  function P(v) { return v < 0 ? '(' + fmtN(v) + ')' : fmtN(v); }
  function F(v) { var f = toFrac(v); return f && f[1] <= 100 ? fmtN(v) + ' <small>(' + (f[0] < 0 ? '−' : '') + Math.abs(f[0]) + '/' + f[1] + ')</small>' : fmtN(v); }
  function L(s) { return '<span dir="ltr">' + s + '</span>'; }
  $('sq-go').addEventListener('click', function () {
    var a = numIn('sq-a'), b = numIn('sq-b'), c = numIn('sq-c'), out = [], o = $('sq-out');
    if ([a, b, c].some(isNaN)) { o.innerHTML = '<li class="bad">צריך מספר בכל אחת מהתיבות (אפשר גם 0, שבר כמו 1/2 או מינוס).</li>'; return; }
    used('solve_quad');
    out.push('מזהים את המקדמים: ' + L('a = ' + fmtN(a) + ',  b = ' + fmtN(b) + ',  c = ' + fmtN(c)));
    if (a === 0) {
      if (b === 0) { out.push(c === 0 ? 'כל x מתאים (0 = 0).' : 'אין פתרון: יוצא ' + L(fmtN(c) + ' = 0') + '.'); o.innerHTML = out.map(li).join(''); return; }
      out.push('a = 0, אז זו בכלל משוואה קווית: ' + L(fmtN(b) + 'x + ' + P(c) + ' = 0'));
      out.push('מעבירים אגף ומחלקים: ' + L('x = ' + fmtN(-c) + ' ÷ ' + P(b) + ' = ' + '<b>' + F(clean(-c / b)) + '</b>'));
      o.innerHTML = out.map(li).join(''); return;
    }
    var D = clean(b * b - 4 * a * c);
    out.push('מחשבים את הדיסקרימיננטה (מה שבתוך השורש): ' + L('Δ = b² − 4ac = ' + P(b) + '² − 4·' + P(a) + '·' + P(c) + ' = ' + fmtN(clean(b * b)) + ' − ' + P(clean(4 * a * c)) + ' = ' + '<b>' + fmtN(D) + '</b>'));
    if (D < 0) { out.push('Δ שלילי, ואין שורש למספר שלילי. לכן <b>אין פתרון</b> (הפרבולה לא חותכת את ציר x).'); }
    else if (D === 0) {
      var x0 = clean(-b / (2 * a));
      out.push('Δ = 0, לכן יש <b>פתרון אחד</b>: ' + L('x = −b ÷ 2a = ' + fmtN(-b) + ' ÷ ' + fmtN(2 * a) + ' = ' + '<b>' + F(x0) + '</b>'));
    } else {
      var s = Math.sqrt(D), x1 = clean((-b + s) / (2 * a)), x2 = clean((-b - s) / (2 * a));
      out.push('Δ חיובי, לכן יש <b>שני פתרונות</b>. ' + L('√Δ = √' + fmtN(D) + ' = ' + fmtN(clean(s))));
      out.push('נוסחת השורשים: ' + L('x₁,₂ = (−b ± √Δ) ÷ 2a = (' + fmtN(-b) + ' ± ' + fmtN(clean(s)) + ') ÷ ' + fmtN(2 * a)));
      out.push(L('x₁ = <b>' + F(x1) + '</b>, &nbsp; x₂ = <b>' + F(x2) + '</b>'));
      var chk = clean(a * x1 * x1 + b * x1 + c);
      out.push('בדיקה: מציבים ' + L('x = ' + fmtN(x1)) + ' ומקבלים ' + L(fmtN(chk)) + (Math.abs(chk) < 1e-6 ? ' ✓' : ' (בערך 0 בגלל עיגול)'));
    }
    o.innerHTML = out.map(li).join('');
  });
  function li(s) { return '<li>' + s + '</li>'; }
  $('sys-go').addEventListener('click', function () {
    var a1 = numIn('s-a1'), b1 = numIn('s-b1'), c1 = numIn('s-c1'), a2 = numIn('s-a2'), b2 = numIn('s-b2'), c2 = numIn('s-c2'), o = $('sys-out'), out = [];
    if ([a1, b1, c1, a2, b2, c2].some(isNaN)) { o.innerHTML = '<li class="bad">צריך מספר בכל אחת מהתיבות.</li>'; return; }
    used('solve_sys');
    function co(v) { return v === 1 ? '' : v === -1 ? '−' : fmtN(v); }
    function eq(a, b, c) { return L(co(a) + 'x ' + (b < 0 ? '− ' + co(-b) : '+ ' + co(b)) + 'y = ' + fmtN(c)); }
    out.push('המשוואות: (1) ' + eq(a1, b1, c1) + ' &nbsp; (2) ' + eq(a2, b2, c2));
    var D = clean(a1 * b2 - a2 * b1);
    if (D === 0) {
      var same = clean(a1 * c2 - a2 * c1) === 0 && clean(b1 * c2 - b2 * c1) === 0;
      out.push(same ? 'שתי המשוואות הן בעצם אותו ישר, ולכן יש <b>אינסוף פתרונות</b>.' : 'הישרים מקבילים ולא נפגשים, ולכן <b>אין פתרון</b>.');
      o.innerHTML = out.map(li).join(''); return;
    }
    if (a1 === 0 || a2 === 0) {
      // אחת המשוואות בלי x: מוצאים y ממנה ישר
      var oneY = a1 === 0 ? [b1, c1, 1] : [b2, c2, 2];
      var y0 = clean(oneY[1] / oneY[0]);
      out.push('במשוואה (' + oneY[2] + ') אין x, לכן מוצאים ממנה ישר את y: ' + L('y = ' + fmtN(oneY[1]) + ' ÷ ' + P(oneY[0]) + ' = ' + '<b>' + F(y0) + '</b>'));
      var o2 = a1 === 0 ? [a2, b2, c2, 2] : [a1, b1, c1, 1], x0 = clean((o2[2] - o2[1] * y0) / o2[0]);
      out.push('מציבים במשוואה (' + o2[3] + '): ' + L('x = (' + fmtN(o2[2]) + ' − ' + P(o2[1]) + '·' + P(y0) + ') ÷ ' + P(o2[0]) + ' = ' + '<b>' + F(x0) + '</b>'));
      out.push('הפתרון: ' + L('(x, y) = (' + fmtN(x0) + ', ' + fmtN(y0) + ')'));
      o.innerHTML = out.map(li).join(''); return;
    }
    out.push('מבטלים את x: כופלים את (1) ב-' + fmtN(a2) + ' ואת (2) ב-' + fmtN(a1) + ', ואז מחסרים.');
    out.push(eq(clean(a1 * a2), clean(b1 * a2), clean(c1 * a2)) + ' &nbsp;פחות&nbsp; ' + eq(clean(a2 * a1), clean(b2 * a1), clean(c2 * a1)));
    var ky = clean(b1 * a2 - b2 * a1), kc = clean(c1 * a2 - c2 * a1), y = clean(kc / ky);
    out.push('נשאר: ' + L(fmtN(ky) + 'y = ' + fmtN(kc)) + ', לכן ' + L('y = <b>' + F(y) + '</b>'));
    var x = clean((c1 - b1 * y) / a1);
    out.push('מציבים את y במשוואה (1): ' + L(fmtN(a1) + 'x = ' + fmtN(c1) + ' − ' + P(b1) + '·' + P(y)) + ', לכן ' + L('x = <b>' + F(x) + '</b>'));
    out.push('בדיקה במשוואה (2): ' + L(fmtN(a2) + '·' + P(x) + ' + ' + P(b2) + '·' + P(y) + ' = ' + fmtN(clean(a2 * x + b2 * y))) + (Math.abs(clean(a2 * x + b2 * y) - c2) < 1e-6 ? ' ✓' : ''));
    o.innerHTML = out.map(li).join('');
  });
  // פתרון מספרי של כל משוואה: סורקים את הטווח ומחפשים מעבר סימן
  function makeF(src, ang) {
    var tree = parse(src);
    return function (x) { try { return ev(tree, { ang: ang, ans: ans, x: x }); } catch (e) { return NaN; } };
  }
  function roots(f, a, b) {
    var N = 4000, h = (b - a) / N, out = [], x0 = a, y0 = f(a);
    function add(r) { r = clean(+r.toPrecision(10)); if (!out.some(function (q) { return Math.abs(q - r) < h; })) out.push(r); }
    if (y0 === 0) add(a);
    for (var i = 1; i <= N && out.length < 20; i++) {
      var x1 = a + i * h, y1 = f(x1);
      if (isFinite(y0) && isFinite(y1)) {
        if (y1 === 0) add(x1);
        else if (y0 * y1 < 0) {
          var lo = x0, hi = x1, flo = y0;
          for (var k = 0; k < 80; k++) { var m = (lo + hi) / 2, fm = f(m); if (!isFinite(fm)) break; if (flo * fm <= 0) hi = m; else { lo = m; flo = fm; } }
          var r = (lo + hi) / 2;
          if (Math.abs(f(r)) < 1e-6 * Math.max(1, Math.abs(y0), Math.abs(y1))) add(r); // לא קפיצה של אסימפטוטה
        } else if (i > 1) {
          // נגיעה בציר (בלי מעבר סימן): מינימום של |f| קרוב ל-0
          var yp = f(x0 - h);
          if (Math.abs(y0) < Math.abs(yp) && Math.abs(y0) < Math.abs(y1) && Math.abs(y0) < 1e-3) {
            var l2 = x0 - h, r2 = x1;
            for (var j = 0; j < 80; j++) { var m1 = l2 + (r2 - l2) / 3, m2 = r2 - (r2 - l2) / 3; if (Math.abs(f(m1)) < Math.abs(f(m2))) r2 = m2; else l2 = m1; }
            if (Math.abs(f((l2 + r2) / 2)) < 1e-9) add((l2 + r2) / 2);
          }
        }
      }
      x0 = x1; y0 = y1;
    }
    return out.sort(function (p, q) { return p - q; });
  }
  $('g-go').addEventListener('click', function () {
    var s = $('g-eq').value.trim(), o = $('g-out'), from = numIn('g-from'), to = numIn('g-to');
    if (!s) return;
    if (isNaN(from) || isNaN(to) || from >= to) { o.innerHTML = '<p class="bad">הטווח לא תקין: צריך "מ-" קטן מ"עד".</p>'; return; }
    var parts = s.split('=');
    if (parts.length > 2) { o.innerHTML = '<p class="bad">צריך סימן = אחד בלבד.</p>'; return; }
    var src = parts.length === 2 ? '(' + parts[0] + ')-(' + parts[1] + ')' : s;
    try { var f = makeF(src, st.ang); parse(src); } catch (e) { o.innerHTML = '<p class="bad">' + esc(e.msg || 'לא הצלחתי לקרוא את המשוואה') + '</p>'; return; }
    used('solve_any');
    var r = roots(f, from, to), mode = /sin|cos|tan/.test(s) ? ' (הזוויות ב' + (st.ang === 'deg' ? 'מעלות' : 'רדיאנים') + ', לפי המצב במחשבון)' : '';
    if (!r.length) { o.innerHTML = '<p>לא מצאתי פתרון בין ' + fmtN(from) + ' ל-' + fmtN(to) + mode + '. אפשר להרחיב את הטווח.</p>'; return; }
    o.innerHTML = '<p>מצאתי ' + (r.length === 1 ? 'פתרון אחד' : r.length + ' פתרונות') + mode + ':</p><ul class="cx-roots">' + r.map(function (x) { return '<li dir="ltr">x ≈ ' + fmtN(+x.toFixed(6)) + '</li>'; }).join('') + '</ul>' +
      (r.length >= 20 ? '<p class="note">יש עוד. אפשר לצמצם את הטווח.</p>' : '') + '<p class="note">הפתרונות מעוגלים. בבגרות כותבים את הדרך, והמחשבון רק בודק.</p>';
  });

  // =====================================================================
  //  גרף (ללמידה)
  // =====================================================================
  // הגרף מצויר ביחידות של פיקסל CSS (setTransform מטפל במסכים חדים)
  var cv = $('gr-cv'), ctx = cv.getContext('2d'), view = { cx: 2, cy: 0, s: 0 }, fns = [], marks = [], cw = 0, chh = 0;
  function sx(x) { return cw / 2 + (x - view.cx) * view.s; } function sy(y) { return chh / 2 - (y - view.cy) * view.s; }
  function wx(px) { return (px - cw / 2) / view.s + view.cx; }
  function niceStep() { var raw = 45 / view.s, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 2 ? 2 : m < 5 ? 5 : 10) * p; }
  function buildFns() {
    fns = []; var err = [];
    [['gr-f', '#dcb769'], ['gr-g', '#86c5e6']].forEach(function (q) {
      var s = $(q[0]).value.trim(); if (!s) return;
      s = s.replace(/^y\s*=\s*/i, '');
      try { parse(s); fns.push({ f: makeF(s, 'rad'), c: q[1], s: s }); } catch (e) { err.push(esc(e.msg || 'לא הצלחתי לקרוא')); }
    });
    return err;
  }
  function draw() {
    var r = cv.getBoundingClientRect(); if (!r.width) return false;
    var dpr = window.devicePixelRatio || 1;
    cw = r.width; chh = Math.round(r.width * 0.75);
    if (!view.s) view.s = cw / 12;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(chh * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(chh * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0f1522'; ctx.fillRect(0, 0, cw, chh);
    var step = niceStep(), x0 = wx(0), x1 = wx(cw), yTop = view.cy + chh / 2 / view.s, yBot = view.cy - chh / 2 / view.s, gx, gy;
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.font = '12px Assistant, Arial'; ctx.direction = 'ltr'; ctx.fillStyle = '#a1abc2';
    for (gx = Math.ceil(x0 / step) * step; gx <= x1; gx += step) { ctx.beginPath(); ctx.moveTo(sx(gx), 0); ctx.lineTo(sx(gx), chh); ctx.stroke(); }
    for (gy = Math.ceil(yBot / step) * step; gy <= yTop; gy += step) { ctx.beginPath(); ctx.moveTo(0, sy(gy)); ctx.lineTo(cw, sy(gy)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(238,241,248,.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, sy(0)); ctx.lineTo(cw, sy(0)); ctx.moveTo(sx(0), 0); ctx.lineTo(sx(0), chh); ctx.stroke();
    var ay = Math.min(Math.max(sy(0) + 15, 14), chh - 4), ax = Math.min(Math.max(sx(0) + 4, 4), cw - 36);
    ctx.textAlign = 'center';
    for (gx = Math.ceil(x0 / step) * step; gx <= x1; gx += step) if (Math.abs(gx) > step / 2) ctx.fillText(fmtN(+gx.toPrecision(6)), sx(gx), ay);
    ctx.textAlign = 'left';
    for (gy = Math.ceil(yBot / step) * step; gy <= yTop; gy += step) if (Math.abs(gy) > step / 2) ctx.fillText(fmtN(+gy.toPrecision(6)), ax, sy(gy) + 4);
    fns.forEach(function (F) {
      ctx.strokeStyle = F.c; ctx.lineWidth = 2.6; ctx.beginPath();
      var pen = false, prev = null;
      for (var px = 0; px <= cw; px += 0.5) {
        var y = F.f(wx(px)), py = sy(y);
        if (!isFinite(y) || Math.abs(py) > chh * 20 || (prev != null && Math.abs(py - prev) > chh * 2)) { pen = false; prev = isFinite(y) ? py : null; continue; }
        if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
        prev = py;
      }
      ctx.stroke();
    });
    ctx.fillStyle = '#eef1f8';
    marks.forEach(function (m) { ctx.beginPath(); ctx.arc(sx(m.x), sy(m.y), 4.5, 0, 7); ctx.fill(); });
    return true;
  }
  function analyse() {
    marks = []; var rows = [];
    if (!fns.length) { $('gr-pts').innerHTML = ''; $('gr-tbl').innerHTML = ''; return; }
    var span = cw / view.s, a = view.cx - span / 2, b = view.cx + span / 2, F0 = fns[0], f = F0.f;
    function pt(x, y) { return '(' + fmtN(+x.toFixed(3)) + ', ' + fmtN(+y.toFixed(3)) + ')'; }
    var z = roots(f, a, b).slice(0, 8);
    z.forEach(function (x) { marks.push({ x: x, y: 0 }); });
    rows.push('<li>חיתוך עם ציר x: ' + (z.length ? L(z.map(function (x) { return pt(x, 0); }).join('  ')) : 'אין על המסך') + '</li>');
    var y0 = f(0); if (isFinite(y0)) { marks.push({ x: 0, y: y0 }); rows.push('<li>חיתוך עם ציר y: ' + L(pt(0, y0)) + '</li>'); }
    var hh = 1e-5, d = function (x) { return (f(x + hh) - f(x - hh)) / (2 * hh); };
    roots(d, a, b).filter(function (x) { return isFinite(f(x)); }).slice(0, 6).forEach(function (x) {
      var y = f(x), c = (f(x + 1e-3) + f(x - 1e-3) - 2 * y);
      if (Math.abs(c) < 1e-12) return;
      marks.push({ x: x, y: y }); rows.push('<li>' + (c > 0 ? 'נקודת מינימום' : 'נקודת מקסימום') + ': ' + L(pt(x, y)) + '</li>');
    });
    if (fns[1]) {
      var g = fns[1].f, cut = roots(function (x) { return f(x) - g(x); }, a, b).slice(0, 6);
      cut.forEach(function (x) { marks.push({ x: x, y: f(x) }); });
      rows.push('<li>חיתוך בין שני הגרפים: ' + (cut.length ? L(cut.map(function (x) { return pt(x, f(x)); }).join('  ')) : 'אין על המסך') + '</li>');
    }
    $('gr-pts').innerHTML = '<p class="note">הנקודות שעל המסך (מעוגלות):</p><ul class="cx-roots">' + rows.join('') + '</ul>' + (/sin|cos|tan/.test(F0.s) ? '<p class="note">בגרף, sin ו-cos הם ברדיאנים, כמו בחקירת פונקציות.</p>' : '');
    var tb = '<table class="plan"><tr><td>x</td>' + fns.map(function (q) { return '<td dir="ltr">' + esc(q.s) + '</td>'; }).join('') + '</tr>';
    for (var x = -5; x <= 5; x++) tb += '<tr><td>' + fmtN(x) + '</td>' + fns.map(function (q) { var v = q.f(x); return '<td dir="ltr">' + (isFinite(v) ? fmtN(+v.toFixed(4)) : 'לא מוגדר') + '</td>'; }).join('') + '</tr>';
    $('gr-tbl').innerHTML = tb + '</table>';
  }
  function plot() {
    var err = buildFns();
    if (err.length) { $('gr-pts').innerHTML = '<p class="bad">' + err.join('<br>') + '</p>'; marks = []; draw(); return; }
    if (!draw()) return;
    analyse(); draw();
    cv.setAttribute('aria-label', 'גרף של ' + fns.map(function (q) { return 'y = ' + q.s; }).join(' ושל ') + '. הנקודות החשובות כתובות מתחת לגרף.');
  }
  $('gr-go').addEventListener('click', function () { plot(); used('graph'); });
  ['gr-f', 'gr-g'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); plot(); used('graph'); } }); });
  function zoom(k) { view.s *= k; draw(); analyse(); draw(); }
  $('gr-in').addEventListener('click', function () { zoom(1.5); });
  $('gr-out').addEventListener('click', function () { zoom(1 / 1.5); });
  $('gr-home').addEventListener('click', function () { view.cx = 0; view.cy = 0; view.s = cw / 12; draw(); analyse(); draw(); });
  var drag = null, tip = $('gr-tip');
  cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
    if (drag.moved) { view.cx = drag.cx - dx / view.s; view.cy = drag.cy + dy / view.s; tip.hidden = true; draw(); }
  });
  cv.addEventListener('pointerup', function (e) {
    if (!drag) return;
    if (drag.moved) { analyse(); draw(); }
    else if (fns.length) {
      var r = cv.getBoundingClientRect(), x = wx(e.clientX - r.left), y = fns[0].f(x);
      if (isFinite(y)) { tip.hidden = false; tip.textContent = '(' + fmtN(+x.toFixed(2)) + ', ' + fmtN(+y.toFixed(3)) + ')'; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = Math.max(0, Math.min(chh, sy(y))) + 'px'; }
    }
    drag = null;
  });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2); }, { passive: false });
  window.addEventListener('resize', function () { if (!$('cx-p-graph').hidden) { draw(); } });

  // =====================================================================
  //  במחשבון שלכם
  // =====================================================================
  // [כותרת, מה זה, קסיו ES, קסיו ClassWiz, TI-30, תרגיל לנסות, מצב]
  var GUIDE = [
    ['מצב מעלות (DEG)', 'לפני כל שאלה על משולשים. בודקים שלמעלה במסך כתוב D או DEG.', 'SHIFT ואז MODE (SETUP), ואז 3 (Deg). ב-fx-82MS: MODE כמה פעמים עד Deg, ואז 1', 'SHIFT ואז MENU (SETUP) ← Angle Unit ← Degree', 'MODE, בוחרים DEG בחצים, ואז enter', 'sin(30)', 'deg'],
    ['מצב רדיאנים (RAD)', 'רק כשהשאלה ברדיאנים, למשל חקירה של sin(x) או זווית כמו π/3. בסוף חוזרים למעלות.', 'SHIFT ואז MODE (SETUP), ואז 4 (Rad)', 'SHIFT ואז MENU (SETUP) ← Angle Unit ← Radian', 'MODE, בוחרים RAD בחצים, ואז enter', 'sin(π÷6)', 'rad'],
    ['זווית מתוך sin', 'sin⁻¹. למשל sin x = 0.6, ומחפשים את x.', 'SHIFT ואז sin, ואז 0.6 ו-=', 'SHIFT ואז sin, ואז 0.6 ו-EXE', '2nd ואז SIN, ואז 0.6 ו-enter', 'sin⁻¹(0.6)', 'deg'],
    ['זווית מתוך tan (שיפוע)', 'tan⁻¹. למשל זווית של ישר עם שיפוע 2.', 'SHIFT ואז tan', 'SHIFT ואז tan', '2nd ואז TAN', 'tan⁻¹(2)', 'deg'],
    ['שורש ריבועי', 'כשיש תרגיל בתוך השורש, כל התרגיל נכנס לתוכו.', '√■ ואז התרגיל, ואז חץ ימינה כדי לצאת מהשורש', '√■ ואז התרגיל, ואז חץ ימינה', '2nd ואז x² (√), ואז סוגר בסוף', '√(3²+4²)'],
    ['חזקה', 'כל חזקה, גם שבר ושלילית.', 'x■ ואז החזקה, ואז חץ ימינה', 'x■ ואז החזקה', '^ ואז החזקה', '1.05^10'],
    ['שורש מסדר n', 'למשל השורש החמישי של 32.', 'SHIFT ואז x■ (■√□)', 'SHIFT ואז x■', '2nd ואז ^ (ˣ√)', 'root(5, 32)'],
    ['לוגריתם (ln ו-log)', 'ln בבסיס e, ו-log בבסיס 10. בכל בסיס אחר: log של המספר חלקי log של הבסיס.', 'ln או log. בסיס אחר: log■□', 'ln או log. בסיס אחר: log■□', 'LN או LOG. בסיס אחר: LOG(b) ÷ LOG(a)', 'logb(2, 50)'],
    ['e בחזקת', 'בגדילה ודעיכה ובחקירת eˣ.', 'SHIFT ואז ln', 'SHIFT ואז ln', '2nd ואז LN', 'e^(0.3×5)'],
    ['מספר צירופים nCr', 'בהתפלגות בינומית. למשל C(10, 3).', '10, SHIFT ואז ÷ (nCr), ואז 3', '10, SHIFT ואז ÷ (nCr), ואז 3', '10, PRB ← nCr, ואז 3', 'C(10, 3)×0.2^3×0.8^7'],
    ['משבר לעשרוני ובחזרה', 'כשהתשובה יוצאת שבר ורוצים עשרוני, או הפוך.', 'S⇔D', 'S⇔D (או FORMAT)', 'מקש ◄► (n/d ↔ עשרוני)', '3÷8'],
    ['התוצאה הקודמת (Ans)', 'ממשיכים חישוב בלי לעגל באמצע.', 'Ans', 'Ans', '2nd ואז (−)', ''],
    ['מספר שלילי', 'בתחילת תרגיל או אחרי חזקה, משתמשים במקש (−), לא במקש החיסור.', '(−)', '(−)', '(−)', '(-3)²'],
    ['ממוצע וסטיית תקן', 'מכניסים רשימת נתונים ומקבלים ממוצע וסטיית תקן. בבגרות בדרך כלל σx (של כל האוכלוסייה).', 'MODE ← STAT ← 1-VAR, מכניסים נתונים, AC, ואז SHIFT 1 (STAT) ← Var', 'MENU ← Statistics ← 1-Variable, ואז OPTN', 'DATA להזנה, ואז 2nd DATA (STATVAR)', ''],
    ['עיגול קבוע (Fix)', 'לא חובה. עדיף לעגל רק את התשובה הסופית.', 'SHIFT ואז MODE (SETUP), ואז 6 (Fix)', 'SHIFT ואז MENU ← Number Format ← Fix', 'MODE ← FLOAT, ובוחרים מספר ספרות', ''],
    ['איפוס (כשמשהו נראה מוזר)', 'מחזיר את המחשבון להגדרות הרגילות. אחרי איפוס בודקים שוב שהוא במעלות.', 'SHIFT ואז 9 (CLR) ← 3 (All) ← = ← AC', 'SHIFT ואז 9 (RESET) ← Initialize All', 'ON ו-CLEAR יחד', '']
  ];
  function guide() {
    var col = MODELS[st.model];
    $('cx-guide').innerHTML = GUIDE.map(function (g, i) {
      return '<div class="cx-g"><b>' + esc(g[0]) + '</b><p>' + esc(g[1]) + '</p><p class="k">🔑 ' + esc(g[col]) + '</p>' +
        (g[5] ? '<button type="button" class="linkish" data-try="' + i + '">לנסות כאן: <span dir="ltr">' + esc(g[5]) + '</span></button>' : '') + '</div>';
    }).join('') + '<p class="note">המקשים נבדקו מול המדריכים של היצרנים, אבל דגמים שונים קצת שונים. אם משהו לא מסתדר, כדאי לבדוק בחוברת של המחשבון או לשאול את המורה, לפני הבחינה.</p>';
    document.querySelectorAll('.cx-model [data-m]').forEach(function (b) { b.classList.toggle('on', b.dataset.m === st.model); b.setAttribute('aria-pressed', b.dataset.m === st.model ? 'true' : 'false'); });
  }
  document.querySelector('.cx-model').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; st.model = b.dataset.m; save(); guide(); });
  $('cx-guide').addEventListener('click', function (e) { var b = e.target.closest('[data-try]'); if (!b) return; var g = GUIDE[+b.dataset.try]; tryIt(g[5], g[6]); });

  // =====================================================================
  //  טעויות נפוצות
  // =====================================================================
  var ERRS = [
    ['מצב רדיאנים במקום מעלות', 'sin(30) צריך לצאת 0.5. אם יצא ‎−0.988, המחשבון במצב רדיאנים. כדאי לבדוק את זה בתחילת כל בחינה.', [['sin(30) במעלות', 'sin(30)', 'deg'], ['sin(30) ברדיאנים', 'sin(30)', 'rad']]],
    ['מינוס וחזקה', 'המחשבון מעלה בחזקה לפני שהוא שם מינוס. כשמציבים מספר שלילי בחזקה, שמים אותו בסוגריים.', [['−3²', '−3²'], ['(−3)²', '(−3)²']]],
    ['שבר בלי סוגריים במכנה', 'כדי לחשב 1 חלקי (2 כפול 4), חייבים סוגריים. בלעדיהם המחשבון מחלק ב-2 ואז כופל ב-4.', [['1÷2×4', '1÷2×4'], ['1÷(2×4)', '1÷(2×4)']]],
    ['שורש בלי סוגריים', 'השורש חל רק על מה שבתוכו. √9+16 הוא 3 ועוד 16.', [['√(9)+16', '√(9)+16'], ['√(9+16)', '√(9+16)']]],
    ['sin בריבוע', 'sin²(30) פירושו (sin 30)². זה לא sin של 30 בריבוע.', [['sin(30)²', 'sin(30)²', 'deg'], ['sin(30²)', 'sin(30²)', 'deg']]],
    ['sin⁻¹ הוא לא 1 חלקי sin', 'sin⁻¹ מחזיר זווית. 1 חלקי sin הוא מספר אחר לגמרי.', [['sin⁻¹(0.5)', 'sin⁻¹(0.5)', 'deg'], ['1÷sin(0.5)', '1÷sin(0.5)', 'deg']]],
    ['עיגול באמצע הדרך', 'מעגלים רק את התשובה הסופית. עיגול בשלב ביניים מזיז את התוצאה. ממשיכים עם Ans.', [['1.41²', '1.41²'], ['√(2)²', '√(2)²']]],
    ['log או ln', 'log הוא בבסיס 10, ו-ln בבסיס e. הם לא אותו דבר.', [['log(100)', 'log(100)'], ['ln(100)', 'ln(100)']]],
    ['אחוז כגורם', 'עלייה של 5% היא כפל ב-1.05, וירידה של 5% היא כפל ב-0.95, ולא ב-0.05.', [['1000×1.05^3', '1000×1.05^3'], ['1000×0.05^3', '1000×0.05^3']]]
  ];
  $('cx-errs').innerHTML = ERRS.map(function (er, i) {
    return '<div class="cx-g"><b>' + esc(er[0]) + '</b><p>' + esc(er[1]) + '</p><div class="btns">' + er[2].map(function (t, j) {
      return '<button type="button" class="btn btn-line btn-sm" data-err="' + i + ',' + j + '"><span dir="ltr">' + esc(t[0].replace(/ (במעלות|ברדיאנים)$/, '')) + '</span>' + (/ (במעלות|ברדיאנים)$/.test(t[0]) ? ' ' + t[0].match(/(במעלות|ברדיאנים)$/)[0] : '') + '</button>';
    }).join('') + '</div></div>';
  }).join('');
  $('cx-errs').addEventListener('click', function (e) { var b = e.target.closest('[data-err]'); if (!b) return; var ij = b.dataset.err.split(','), t = ERRS[+ij[0]][2][+ij[1]]; tryIt(t[1], t[2]); });


  // =====================================================================
  //  תוספות: צורה מדויקת, מקשים לפי הסדר, שיעור מתאים, זיכרון, שיתוף,
  //  מצב בחינה, מצב נגיש, יחידות, תיקוני דיבור, סטטיסטיקה, משולשים, מרוכבים ווקטורים
  // =====================================================================
  function gcdI(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a; }
  function sqrtSimp(n) { var k = 1; for (var i = 2; i * i <= n; i++) while (n % (i * i) === 0) { n /= i * i; k *= i; } return [k, n]; }
  // צורה מדויקת: √3/2, 2√2, π/3
  function exact(v) {
    if (!isFinite(v) || v === Math.round(v) || toFrac(v) || Math.abs(v) > 1e6) return null;
    var s = v < 0 ? '−' : '', a = Math.abs(v), f = toFrac(a * a);
    if (f && f[1] <= 200) {
      var p = f[0], q = f[1], km = sqrtSimp(p * q);
      if (km[1] > 1) {
        var k = km[0], g = gcdI(k, q); k /= g; q /= g;
        return s + (k === 1 ? '' : k) + '√' + km[1] + (q > 1 ? '/' + q : '');
      }
    }
    f = toFrac(a / Math.PI);
    if (f && f[1] <= 12 && f[0] <= 50) return s + (f[0] === 1 ? '' : f[0]) + 'π' + (f[1] > 1 ? '/' + f[1] : '');
    return null;
  }

  // רצף המקשים במחשבון של התלמיד
  var KS = {
    es: { pi: 'SHIFT ×10ˣ', e: 'ALPHA ×10ˣ', ans: 'Ans', neg: '(−)', fact: 'SHIFT x⁻¹', sq: 'x²', inv: 'x⁻¹', pow: 'x■', out: '→', sqrt: '√■', root: 'SHIFT x■', logb: 'log■□', ncr: 'SHIFT ÷', exp: 'SHIFT ln', a: 'ALPHA (−)', b: 'ALPHA °′″', eq: '=', inv2: 'SHIFT' },
    ex: { pi: 'SHIFT ×10ˣ', e: 'ALPHA ×10ˣ', ans: 'Ans', neg: '(−)', fact: 'SHIFT x⁻¹', sq: 'x²', inv: 'x⁻¹', pow: 'x■', out: '→', sqrt: '√■', root: 'SHIFT x■', logb: 'log■□', ncr: 'SHIFT ÷', exp: 'SHIFT ln', a: 'ALPHA (−)', b: 'ALPHA °′″', eq: 'EXE', inv2: 'SHIFT' },
    ti: { pi: 'π', e: '2nd LN', ans: '2nd (−)', neg: '(−)', fact: 'PRB ← !', sq: 'x²', inv: 'x⁻¹', pow: '^', out: '→', sqrt: '2nd x²', root: '2nd ^', logb: null, ncr: 'PRB ← nCr', exp: '2nd LN', a: 'x yzt abc ← A', b: 'x yzt abc ← B', eq: 'enter', inv2: '2nd' }
  };
  function keySeq(n, m) {
    var K = KS[m], o = [];
    function go(n) {
      switch (n.t) {
        case 'num': o.push(fmtN(n.v).replace('−', '')); if (n.v < 0) o.splice(o.length - 1, 0, K.neg); break;
        case 'const': if (n.n === 'pi') o.push(K.pi); else if (m === 'ti') { o.push(K.e, '1', ')'); } else o.push(K.e); break;
        case 'ans': o.push(K.ans); break;
        case 'mem': o.push(K[n.n]); break;
        case 'par': o.push('('); go(n.a); o.push(')'); break;
        case 'neg': o.push(K.neg); go(n.a); break;
        case 'fact': go(n.a); o.push(K.fact); break;
        case 'op':
          if (n.op === '^') {
            go(n.a);
            if (n.b.t === 'num' && n.b.v === 2) o.push(K.sq);
            else if (n.b.t === 'neg' && n.b.a.t === 'num' && n.b.a.v === 1) o.push(K.inv);
            else { o.push(K.pow); go(n.b); o.push(K.out); }
            break;
          }
          go(n.a); if (!n.imp) o.push({ '+': '+', '-': '−', '*': '×', '/': '÷' }[n.op]); go(n.b); break;
        case 'fn':
          var f = n.f, A = n.args;
          if (/^(sin|cos|tan)$/.test(f)) { o.push(m === 'ti' ? f.toUpperCase() : f); go(A[0]); o.push(')'); }
          else if (/^a(sin|cos|tan)$/.test(f)) { o.push(K.inv2 + ' ' + (m === 'ti' ? f.slice(1).toUpperCase() : f.slice(1))); go(A[0]); o.push(')'); }
          else if (f === 'ln' || f === 'log') { o.push(m === 'ti' ? f.toUpperCase() : f); go(A[0]); o.push(')'); }
          else if (f === 'sqrt') { o.push(K.sqrt); go(A[0]); o.push(m === 'ti' ? ')' : K.out); }
          else if (f === 'root') { if (m === 'ti') { go(A[0]); o.push(K.root); go(A[1]); } else { o.push(K.root); go(A[0]); o.push(K.out); go(A[1]); o.push(K.out); } }
          else if (f === 'logb') { if (m === 'ti') { o.push('LOG'); go(A[1]); o.push(')', '÷', 'LOG'); go(A[0]); o.push(')'); } else { o.push(K.logb); go(A[0]); o.push(K.out); go(A[1]); o.push(K.out); } }
          else if (f === 'ncr') { go(A[0]); o.push(K.ncr); go(A[1]); }
          else if (f === 'exp') { o.push(K.exp); go(A[0]); o.push(m === 'ti' ? ')' : K.out); }
          else { o.push(f); go(A[0]); o.push(')'); }
          break;
        default: o.push('?');
      }
    }
    go(n); o.push(K.eq);
    // מספרים צמודים (2 ואז 5) מתאחדים לכרטיס אחד
    var r = [];
    o.forEach(function (k) { if (r.length && /^[\d.]+$/.test(k) && /^[\d.]+$/.test(r[r.length - 1]) && false) r[r.length - 1] += k; else r.push(k); });
    return r;
  }
  function usesTrig(n) { return JSON.stringify(n).search(/"f":"a?(sin|cos|tan)"/) >= 0; }
  function showKeys(tree) {
    var box = $('cx-keyseq'); if (!box) return;
    var seq = keySeq(tree, st.model);
    box.innerHTML = '<p><b>🔑 ' + MODEL_NAME[st.model] + ' מקלידים:</b> <button type="button" class="linkish" data-gotab="guide">להחליף דגם</button></p>' +
      (usesTrig(tree) ? '<p class="note">קודם בודקים שלמעלה במסך כתוב ' + (st.ang === 'deg' ? 'D (מעלות)' : 'R (רדיאנים)') + '.</p>' : '') +
      '<div class="cx-kbd" dir="ltr">' + seq.map(function (k) { return '<kbd>' + esc(k) + '</kbd>'; }).join('') + '</div>';
  }

  // שיעור מתאים בתרגול המתמטיקה
  var LESSON = { trig: ['trigo', 'טריגונומטריה במשולש ישר זווית'], log: ['logaritm', 'לוגריתמים ומשוואות מעריכיות'], pow: ['chezkot', 'חזקות'], prob: ['histabrut', 'הסתברות'], sq: ['shorashim', 'משוואה ריבועית ונוסחת השורשים'], frac: ['shvarim', 'שברים'], order: ['seder', 'סדר פעולות חשבון'], stat: ['stiya', 'חציון, שכיח וסטיית תקן'], norm: ['normalit', 'התפלגות נורמלית'], sin: ['sinusim', 'משפט הסינוסים והקוסינוסים'], z: ['merukav', 'מספרים מרוכבים'], vec: ['vektor', 'וקטורים'], pit: ['pitagoras', 'משפט פיתגורס'], eq: ['mishvaa', 'משוואה עם נעלם אחד'], sys: ['maarechet', 'מערכת משוואות'] };
  function lessonKey(tree) {
    var j = JSON.stringify(tree);
    if (/"f":"a?(sin|cos|tan)"/.test(j)) return 'trig';
    if (/"f":"(ln|log|logb|exp)"/.test(j)) return 'log';
    if (/"f":"ncr"|"t":"fact"/.test(j)) return 'prob';
    if (/"op":"\^"|"f":"(sqrt|root)"/.test(j)) return 'pow';
    if (/"op":"\/"/.test(j)) return 'frac';
    return 'order';
  }
  function lessonLink(key, lead) {
    var L2 = LESSON[key]; if (!L2) return '';
    return '<p class="cx-lessn">📚 ' + (lead || 'רוצים לחזור על הבסיס?') + ' <a class="gold" href="/limudim/matematika/#' + L2[0] + '" target="_blank" rel="noopener">שיעור קצר: ' + esc(L2[1]) + '</a></p>';
  }
  function errLesson(msg) {
    if (/tan|sin|cos/.test(msg)) return lessonLink('trig', 'כדאי לחזור על זה:');
    if (/log|ln|לוג/.test(msg)) return lessonLink('log', 'כדאי לחזור על זה:');
    if (/שורש|חזקה/.test(msg)) return lessonLink('pow', 'כדאי לחזור על זה:');
    if (/סוגר|לא גמור|לא במקום/.test(msg)) return lessonLink('order', 'כדאי לחזור על זה:');
    if (/עצרת|nCr/.test(msg)) return lessonLink('prob', 'כדאי לחזור על זה:');
    return '';
  }

  // אחרי כל חישוב: צורה מדויקת, מקשים, שיעור, דיבור במצב נגיש
  function afterCommit(r, byVoice) {

    if (byVoice) extra.insertAdjacentHTML('beforeend', '<span><button type="button" class="linkish" data-vfix>✏️ שמעתי לא נכון? לתקן ולזכור</button></span>');
    if (/rad/.test(trigHints(r.tree).join())) extra.insertAdjacentHTML('beforeend', lessonLink('trig', 'מבלבל בין מעלות לרדיאנים?'));
    showKeys(r.tree);
    $('cx-lesson').innerHTML = lessonLink(lessonKey(r.tree));
    if (MINI || EXAM) $('cx-steps-p').hidden = true;
    if (st.big && !byVoice) speak('שווה ' + sayNum(r.v) + (isAngleOut(r.tree) ? ' מעלות' : ''));
  }
  function afterError(msg) {
    var l = errLesson(msg || '');
    if (l) extra.innerHTML = l;
    if (lastHeard) extra.insertAdjacentHTML('beforeend', '<span><button type="button" class="linkish" data-vfix>✏️ שמעתי לא נכון? לתקן ולזכור</button></span>');
    if (st.big) speak(msg || '');
  }

  // ---------- זיכרון A ו-B ----------
  st.mem = st.mem || {};
  function memShow() {
    var s = ['a', 'b'].filter(function (k) { return st.mem[k] != null; }).map(function (k) { return k.toUpperCase() + ' = ' + fmtN(st.mem[k]); });
    $('cx-memv').textContent = s.join('   ');
  }
  document.querySelector('.cx-mem').addEventListener('click', function (e) {
    var b = e.target.closest('[data-sto]'); if (!b) { var k = e.target.closest('[data-k]'); if (k) press(k.dataset.k); return; }
    if (!justEval) commit();
    if (lastVal == null) return;
    st.mem[b.dataset.sto] = lastVal; save(); memShow();
    why.innerHTML = '<b>נשמר ב-' + b.dataset.sto.toUpperCase() + '.</b> אפשר להשתמש בו בכל תרגיל. ' + MODEL_NAME[st.model] + ': <kbd>' + (st.model === 'ti' ? 'sto→' : 'SHIFT RCL (STO)') + '</kbd> ואז ' + b.dataset.sto.toUpperCase() + '.';
    used('mem');
  });

  // ---------- לשתף תרגיל בקישור ----------
  $('cx-share').addEventListener('click', function () {
    var e = inp.value.trim(); if (!e) { why.innerHTML = '<b>אין עדיין תרגיל.</b> כותבים תרגיל, ואז משתפים.'; return; }
    var url = location.origin + location.pathname + '?e=' + encodeURIComponent(e) + '&a=' + st.ang;
    var text = 'תרגיל במחשבון לבגרות: ' + e + (lastVal != null && justEval ? ' = ' + fmtN(lastVal) : '');
    used('share');
    if (navigator.share) { navigator.share({ title: 'מחשבון לבגרות', text: text, url: url }).catch(function () {}); return; }
    try { navigator.clipboard.writeText(text + '\n' + url).then(function () { why.innerHTML = '<b>הקישור הועתק.</b> מדביקים בווטסאפ, ומי שפותח רואה את התרגיל עם כל השלבים.'; }); }
    catch (er) { prompt('הקישור לתרגיל:', url); }
  });

  // ---------- מצב בחינה ----------
  var EXAM = false, exT0 = 0, exTimer = null;
  function examSet(on) {
    EXAM = on;
    document.body.classList.toggle('cx-exammode', on);
    $('cx-exambar').hidden = !on || MINI;
    $('cx-exam-on').setAttribute('aria-pressed', on ? 'true' : 'false');
    clearInterval(exTimer);
    if (on) {
      tab('calc'); extra.innerHTML = ''; $('cx-steps-p').hidden = true;
      why.textContent = '';
      exT0 = Date.now(); exTick(); exTimer = setInterval(exTick, 1000);
      used('exam_mode');
    }
  }
  function exTick() {
    var dur = +$('cx-dur').value * 60, s = Math.floor((Date.now() - exT0) / 1000), o = $('cx-time');
    var show2 = dur ? Math.max(0, dur - s) : s;
    o.textContent = (show2 >= 3600 ? Math.floor(show2 / 3600) + ':' + ('0' + Math.floor(show2 % 3600 / 60)).slice(-2) : Math.floor(show2 / 60)) + ':' + ('0' + show2 % 60).slice(-2);
    o.classList.toggle('end', !!dur && s >= dur);
    if (dur && s === dur) { o.textContent = '⏰ נגמר הזמן'; try { navigator.vibrate && navigator.vibrate([300, 200, 300]); } catch (e) {} }
  }
  $('cx-exam-on').addEventListener('click', function () { examSet(!EXAM); });
  $('cx-exam-off').addEventListener('click', function () { examSet(false); });
  $('cx-dur').addEventListener('change', function () { exT0 = Date.now(); exTick(); });

  // ---------- מצב גדול ונגיש ----------
  function bigSet(on) {
    st.big = on ? 1 : 0; save();
    document.body.classList.toggle('cx-bigmode', on);
    $('cx-big').setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  $('cx-big').addEventListener('click', function () { bigSet(!st.big); if (st.big) speak('מצב גדול ונגיש. כל מקש נקרא בקול'); used('big'); });
  $('cx-keys').addEventListener('click', function (e) {
    if (!st.big) return;
    var b = e.target.closest('[data-k]'); if (!b || b.dataset.k === '=') return;
    speak(b.getAttribute('aria-label') || b.textContent);
  });

  // ---------- כמה יחידות ----------
  var QS = { 3: '35172, 35371, 35372', 4: '35471, 35472', 5: '35571, 35572' };
  function lvSet(lv) {
    st.lv = lv; save();
    document.querySelectorAll('.cx-lv [data-lv]').forEach(function (b) { var on = +b.dataset.lv === lv; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    $('cx-t-cv').hidden = lv !== 5;
    if (lv !== 5 && !$('cx-p-cv').hidden) tab('calc');
    var n = $('cx-lvnote');
    if (lv) { n.hidden = false; n.innerHTML = 'השאלונים שלך: <b dir="ltr">' + QS[lv] + '</b>. <a class="gold" href="/limudim/matematika/">לתרגול ולמבחן לדוגמה לפי השאלון</a>' + (lv === 5 ? ' · נוספה לשונית מרוכבים ווקטורים' : ''); }
  }
  document.querySelector('.cx-lv').addEventListener('click', function (e) { var b = e.target.closest('[data-lv]'); if (b) { lvSet(+b.dataset.lv); used('lv_' + b.dataset.lv); } });

  // ---------- תיקוני דיבור שנשמרים בטלפון ----------
  st.vfix = st.vfix || { w: {}, p: {} };
  var lastHeard = null;
  function applyFix(t) {
    var key = t.trim();
    if (st.vfix.p[key]) return st.vfix.p[key];
    return key.split(/\s+/).map(function (w) { return st.vfix.w[w] || (st.gfix && st.gfix[w]) || w; }).join(' ');
  }
  extra.addEventListener('click', function (e) {
    if (!e.target.closest('[data-vfix]') || !lastHeard) return;
    extra.innerHTML = '<div class="cx-vfix"><label for="cx-vfx">מה אמרתם? מתקנים את המילים:</label><input id="cx-vfx" type="text" value="' + esc(lastHeard) + '"><button type="button" class="btn btn-gold btn-sm" id="cx-vfs">לחשב ולזכור</button></div>';
    var f = $('cx-vfx'); f.focus(); f.select();
    f.addEventListener('keydown', function (k) { if (k.key === 'Enter') { k.preventDefault(); $('cx-vfs').click(); } });
    $('cx-vfs').addEventListener('click', function () {
      var nw = f.value.trim(); if (!nw) return;
      var a = lastHeard.trim().split(/\s+/), b = nw.split(/\s+/), learned = [];
      var pairs = [];
      if (a.length === b.length) a.forEach(function (w, i) { if (w !== b[i]) { st.vfix.w[w] = b[i]; pairs.push([w, b[i]]); learned.push('"' + w + '" ← "' + b[i] + '"'); } });
      else { st.vfix.p[lastHeard.trim()] = nw; learned.push('"' + lastHeard.trim() + '" ← "' + nw + '"'); }
      sendFixes(pairs);
      save(); used('voice_fix');
      inp.value = nw; justEval = false; var h = lastHeard; lastHeard = null; commit();
      if (learned.length) extra.insertAdjacentHTML('afterbegin', '<span>✓ זכרתי: ' + esc(learned.join(', ')) + '. בפעם הבאה אבין. (נשמר רק בטלפון הזה)</span>');
      lastHeard = null; void h;
    });
  });
  extra.addEventListener('click', function (e) { var g = e.target.closest('[data-gotab]'); if (g) tab(g.dataset.gotab); });
  $('cx-keyseq').addEventListener('click', function (e) { var g = e.target.closest('[data-gotab]'); if (g) { tab(g.dataset.gotab); $('cx-app').scrollIntoView({ behavior: 'smooth' }); } });

  // =====================================================================
  //  סטטיסטיקה
  // =====================================================================
  function nums(s) {
    var p = String(s).replace(/[−–]/g, '-').split(/[\s,;]+/).filter(Boolean), out = [];
    for (var i = 0; i < p.length; i++) { var v = Number(p[i]); if (!isFinite(v)) throw new Err('"' + p[i] + '" הוא לא מספר'); out.push(v); }
    return out;
  }
  function r4(v) { return fmtN(+v.toFixed(4)); }
  function err(o, e) { $(o).innerHTML = '<li class="bad">' + esc(e.msg || 'משהו לא תקין') + '</li>'; }
  $('st-go').addEventListener('click', function () {
    var o = $('st-out'), out = [];
    try {
      var x = nums($('st-x').value), f = $('st-f').value.trim() ? nums($('st-f').value) : null;
      if (!x.length) throw new Err('צריך לפחות מספר אחד');
      if (f && f.length !== x.length) throw new Err('צריך מספר שכיחות לכל נתון (' + x.length + ' נתונים, ' + f.length + ' שכיחויות)');
      if (f && f.some(function (q) { return q < 0 || q !== Math.round(q); })) throw new Err('שכיחות היא מספר שלם וחיובי');
      used('stat');
      var pairs = x.map(function (v, i) { return [v, f ? f[i] : 1]; }), N = 0, S = 0;
      pairs.forEach(function (p) { N += p[1]; S += p[0] * p[1]; });
      if (!N) throw new Err('סכום השכיחויות הוא 0');
      var mean = S / N;
      out.push('מספר הנתונים: <b>' + L('N = ' + N) + '</b>');
      out.push('ממוצע: מחברים ' + (f ? 'כל ערך כפול השכיחות שלו' : 'את כל הנתונים') + ' ומחלקים במספרם. ' + L('x̄ = ' + fmtN(clean(S)) + ' ÷ ' + N + ' = <b>' + r4(mean) + '</b>'));
      // חציון
      var srt = pairs.slice().sort(function (a, b) { return a[0] - b[0]; }), flat = [];
      if (N <= 400) srt.forEach(function (p) { for (var j = 0; j < p[1]; j++) flat.push(p[0]); });
      if (flat.length) {
        var med = N % 2 ? flat[(N - 1) / 2] : (flat[N / 2 - 1] + flat[N / 2]) / 2;
        out.push('חציון: מסדרים מהקטן לגדול' + (N <= 30 ? ' (' + L(flat.map(fmtN).join(', ')) + ')' : '') + ' ולוקחים את ' + (N % 2 ? 'האמצעי, במקום ה-' + ((N + 1) / 2) : 'הממוצע של שני האמצעיים, במקומות ' + N / 2 + ' ו-' + (N / 2 + 1)) + ': <b>' + L(r4(med)) + '</b>');
      }
      // שכיח
      var cnt = {}; srt.forEach(function (p) { cnt[p[0]] = (cnt[p[0]] || 0) + p[1]; });
      var mx = Math.max.apply(null, Object.keys(cnt).map(function (k) { return cnt[k]; })), modes = Object.keys(cnt).filter(function (k) { return cnt[k] === mx; });
      out.push(modes.length === Object.keys(cnt).length && Object.keys(cnt).length > 1 ? 'שכיח: <b>אין</b> (כל ערך מופיע אותו מספר פעמים)' : 'שכיח (הערך שמופיע הכי הרבה, ' + mx + ' פעמים): <b>' + L(modes.map(function (k) { return fmtN(+k); }).join(', ')) + '</b>');
      out.push('טווח: הגדול פחות הקטן: ' + L(fmtN(srt[srt.length - 1][0]) + ' − ' + P(srt[0][0]) + ' = <b>' + fmtN(clean(srt[srt.length - 1][0] - srt[0][0])) + '</b>'));
      // סטיית תקן
      var SS = 0; pairs.forEach(function (p) { SS += p[1] * (p[0] - mean) * (p[0] - mean); });
      var vr = SS / N, sd = Math.sqrt(vr);
      var keysU = Object.keys(cnt).map(Number).sort(function (a, b) { return a - b; });
      if (keysU.length <= 12) {
        out.push('לכל ערך: כמה הוא רחוק מהממוצע, בריבוע' + (f ? ', כפול השכיחות' : '') + ':<table class="plan cx-tb"><tr><td>x</td>' + (f ? '<td>f</td>' : '') + '<td dir="ltr">x − x̄</td><td dir="ltr">(x − x̄)²</td></tr>' + keysU.map(function (k) {
          return '<tr><td dir="ltr">' + fmtN(k) + '</td>' + (f ? '<td>' + cnt[k] + '</td>' : '') + '<td dir="ltr">' + r4(k - mean) + '</td><td dir="ltr">' + r4((k - mean) * (k - mean)) + (cnt[k] > 1 && !f ? ' ×' + cnt[k] : '') + '</td></tr>';
        }).join('') + '</table>');
      }
      out.push('שונות: הסכום חלקי N. ' + L('σ² = ' + r4(SS) + ' ÷ ' + N + ' = ' + r4(vr)));
      out.push('סטיית תקן: שורש השונות. ' + L('σ = √' + r4(vr) + ' = <b>' + r4(sd) + '</b>'));
      if (N > 1) out.push('<small>אם מבקשים סטיית תקן של מדגם (s), מחלקים ב-N − 1: ' + L('s = ' + r4(Math.sqrt(SS / (N - 1)))) + '. בבגרות בדרך כלל σ.</small>');
      out.push(lessonLink('stat'));
      o.innerHTML = out.map(li).join('');
    } catch (e) { if (!(e instanceof Err)) throw e; err('st-out', e); }
  });
  // התפלגות נורמלית: Φ לפי קירוב erf (דיוק של 7 ספרות)
  function erf(x) { var s = x < 0 ? -1 : 1; x = Math.abs(x); var t = 1 / (1 + 0.3275911 * x), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
  function Phi(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
  function PhiInv(p) { var lo = -8, hi = 8; for (var i = 0; i < 80; i++) { var m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
  $('nm-t').addEventListener('change', function () { var t = this.value; $('nm-bw').hidden = t !== 'bt'; $('nm-al').textContent = t === 'inv' ? 'האחוז (למשל 90)' : 'a'; if (t === 'inv' && +$('nm-a').value > 100) $('nm-a').value = '90'; });
  $('nm-go').addEventListener('click', function () {
    var o = $('nm-out'), out = [], mu = numIn('nm-mu'), sg = numIn('nm-s'), a = numIn('nm-a'), b = numIn('nm-b'), t = $('nm-t').value;
    if ([mu, sg, a].some(isNaN) || (t === 'bt' && isNaN(b))) { o.innerHTML = '<li class="bad">צריך מספר בכל תיבה.</li>'; return; }
    if (sg <= 0) { o.innerHTML = '<li class="bad">סטיית התקן חייבת להיות חיובית.</li>'; return; }
    used('normal');
    function z(x) { var v = (x - mu) / sg; out.push('ציון תקן: ' + L('Z = (x − μ) ÷ σ = (' + fmtN(x) + ' − ' + P(mu) + ') ÷ ' + fmtN(sg) + ' = <b>' + r4(v) + '</b>')); return Math.round(v * 100) / 100; }
    function ph(zz) { var v = Phi(zz); out.push('בטבלה של ההתפלגות הנורמלית: ' + L('Φ(' + zz.toFixed(2) + ') = ' + v.toFixed(4))); return v; }
    if (t === 'inv') {
      var p = a > 1 ? a / 100 : a;
      if (p <= 0 || p >= 1) { o.innerHTML = '<li class="bad">האחוז צריך להיות בין 0 ל-100.</li>'; return; }
      var zz = PhiInv(p);
      out.push('מחפשים בטבלה את Z ש-' + L('Φ(Z) = ' + fmtN(+p.toFixed(4))) + ': ' + L('Z ≈ <b>' + zz.toFixed(2) + '</b>'));
      out.push('חוזרים מ-Z לערך: ' + L('x = μ + Z·σ = ' + fmtN(mu) + ' + ' + P(+zz.toFixed(2)) + '·' + fmtN(sg) + ' = <b>' + r4(mu + +zz.toFixed(2) * sg) + '</b>'));
      out.push('כלומר ' + fmtN(+(p * 100).toFixed(2)) + '% מהערכים קטנים מ-' + L(r4(mu + +zz.toFixed(2) * sg)) + '.');
    } else if (t === 'bt') {
      if (b < a) { var tt = a; a = b; b = tt; }
      var za = z(a), zb = z(b), pa = ph(za), pb = ph(zb);
      out.push('הסיכוי בין שני הערכים הוא ההפרש: ' + L(pb.toFixed(4) + ' − ' + pa.toFixed(4) + ' = <b>' + (pb - pa).toFixed(4) + '</b>') + ' (' + fmtN(+((pb - pa) * 100).toFixed(2)) + '%)');
    } else {
      var p1 = ph(z(a));
      if (t === 'lt') out.push('הסיכוי לפחות מ-' + fmtN(a) + ' הוא <b>' + L(p1.toFixed(4)) + '</b> (' + fmtN(+(p1 * 100).toFixed(2)) + '%)');
      else out.push('ליותר מ-' + fmtN(a) + ' מחסירים מ-1: ' + L('1 − ' + p1.toFixed(4) + ' = <b>' + (1 - p1).toFixed(4) + '</b>') + ' (' + fmtN(+((1 - p1) * 100).toFixed(2)) + '%)');
    }
    out.push(lessonLink('norm'));
    o.innerHTML = out.map(li).join('');
  });
  // בינומית
  function nCr(n, k) { var v = 1; for (var i = 1; i <= k; i++) v = v * (n - k + i) / i; return Math.round(v); }
  $('bn-go').addEventListener('click', function () {
    var o = $('bn-out'), out = [], n = numIn('bn-n'), p = numIn('bn-p'), k = numIn('bn-k'), t = $('bn-t').value;
    if ([n, p, k].some(isNaN)) { o.innerHTML = '<li class="bad">צריך מספר בכל תיבה.</li>'; return; }
    if (n !== Math.round(n) || k !== Math.round(k) || n < 1 || k < 0 || k > n || n > 200) { o.innerHTML = '<li class="bad">n ו-k הם מספרים שלמים, ו-k בין 0 ל-n.</li>'; return; }
    if (p < 0 || p > 1) { o.innerHTML = '<li class="bad">p הוא סיכוי, מספר בין 0 ל-1.</li>'; return; }
    used('binom');
    var q = clean(1 - p);
    function term(j, showIt) {
      var c = nCr(n, j), v = c * Math.pow(p, j) * Math.pow(q, n - j);
      if (showIt) out.push(L('P(X = ' + j + ') = C(' + n + ', ' + j + ') · ' + fmtN(p) + '^' + j + ' · ' + fmtN(q) + '^' + (n - j) + ' = ' + c + ' · ' + r4(Math.pow(p, j)) + ' · ' + r4(Math.pow(q, n - j)) + ' = <b>' + v.toFixed(4) + '</b>'));
      return v;
    }
    out.push('הנוסחה: ' + L('P(X = k) = C(n, k) · pᵏ · (1 − p)ⁿ⁻ᵏ') + ', ו-' + L('1 − p = ' + fmtN(q)));
    if (t === 'eq') { term(k, true); }
    else {
      var js = []; for (var j = (t === 'le' ? 0 : k); j <= (t === 'le' ? k : n); j++) js.push(j);
      var useC = js.length > n / 2 + 1 && js.length > 6, total = 0;
      if (useC) {
        var cj = []; for (var i2 = (t === 'le' ? k + 1 : 0); i2 <= (t === 'le' ? n : k - 1); i2++) cj.push(i2);
        out.push('קצר יותר דרך המשלים: ' + L('1 − P(X ' + (t === 'le' ? '> ' : '< ') + k + ')'));
        var sc = 0; cj.forEach(function (j2) { sc += term(j2, cj.length <= 8); });
        total = 1 - sc;
        out.push(L('1 − ' + sc.toFixed(4) + ' = <b>' + total.toFixed(4) + '</b>'));
      } else {
        js.forEach(function (j2) { total += term(j2, js.length <= 8); });
        out.push('מחברים: <b>' + L(total.toFixed(4)) + '</b>');
      }
    }
    out.push(lessonLink('prob'));
    o.innerHTML = out.map(li).join('');
  });

  // =====================================================================
  //  פותר משולשים
  // =====================================================================
  var D2R = Math.PI / 180;
  function triSolve(S, A) {
    // S = [a,b,c], A = [α,β,γ] במעלות, null = לא ידוע. מחזיר רשימת פתרונות, לכל אחד שלבים
    var nm = ['a', 'b', 'c'], an = ['α', 'β', 'γ'];
    var ns = S.filter(function (v) { return v != null; }).length, na = A.filter(function (v) { return v != null; }).length;
    if (S.some(function (v) { return v != null && v <= 0; })) throw new Err('צלע חייבת להיות חיובית');
    if (A.some(function (v) { return v != null && (v <= 0 || v >= 180); })) throw new Err('זווית במשולש היא בין 0° ל-180°');
    if (ns + na < 3) throw new Err('צריך 3 נתונים לפחות');
    if (!ns) throw new Err('עם זוויות בלבד יש אינסוף משולשים דומים. צריך לפחות צלע אחת');
    if (ns + na > 3) throw new Err('יש יותר מ-3 נתונים. משאירים רק 3, כדי לא לסתור');
    var sol = [{ S: S.slice(), A: A.slice(), st: [] }];
    function third(o) {
      var k = o.A.indexOf(null), sum = o.A.reduce(function (s, v) { return s + (v || 0); }, 0);
      if (sum >= 180) throw new Err('סכום הזוויות כבר ' + fmtN(sum) + '°, ובמשולש הסכום הוא 180°');
      o.A[k] = 180 - sum; o.st.push('סכום הזוויות במשולש 180°: ' + L(an[k] + ' = 180° − ' + o.A.filter(function (v, i) { return i !== k; }).map(r4).join('° − ') + '° = <b>' + r4(o.A[k]) + '°</b>'));
    }
    var o = sol[0];
    if (na === 2) third(o);
    if (ns === 3) {
      var a = S[0], b = S[1], c = S[2];
      if (a + b <= c || a + c <= b || b + c <= a) throw new Err('אין משולש כזה: כל צלע צריכה להיות קטנה מסכום שתי האחרות');
      [0, 1].forEach(function (k) {
        var x = S[k], y = S[(k + 1) % 3], z = S[(k + 2) % 3], cs = (y * y + z * z - x * x) / (2 * y * z);
        o.A[k] = Math.acos(cs) / D2R;
        o.st.push('משפט הקוסינוסים: ' + L(nm[k] + '² = ' + nm[(k + 1) % 3] + '² + ' + nm[(k + 2) % 3] + '² − 2·' + nm[(k + 1) % 3] + '·' + nm[(k + 2) % 3] + '·cos ' + an[k]) + ', לכן ' + L('cos ' + an[k] + ' = (' + fmtN(y) + '² + ' + fmtN(z) + '² − ' + fmtN(x) + '²) ÷ (2·' + fmtN(y) + '·' + fmtN(z) + ') = ' + r4(cs)) + ', ו-' + L(an[k] + ' = cos⁻¹(' + r4(cs) + ') = <b>' + r4(o.A[k]) + '°</b>'));
      });
      o.A[2] = null; third(o);
    } else if (ns === 2) {
      var miss = S.indexOf(null);
      if (o.A[miss] != null) {
        // שתי צלעות והזווית שביניהן
        var i1 = (miss + 1) % 3, i2 = (miss + 2) % 3, g = o.A[miss], x2 = S[i1] * S[i1] + S[i2] * S[i2] - 2 * S[i1] * S[i2] * Math.cos(g * D2R);
        o.S[miss] = Math.sqrt(x2);
        o.st.push('יש שתי צלעות והזווית שביניהן, לכן משפט הקוסינוסים: ' + L(nm[miss] + '² = ' + fmtN(S[i1]) + '² + ' + fmtN(S[i2]) + '² − 2·' + fmtN(S[i1]) + '·' + fmtN(S[i2]) + '·cos ' + fmtN(g) + '° = ' + r4(x2)) + ', לכן ' + L(nm[miss] + ' = <b>' + r4(o.S[miss]) + '</b>'));
        if (Math.abs(g - 90) < 1e-9) o.st.push('<small>הזווית ישרה, אז זה בדיוק משפט פיתגורס.</small>');
        if (na === 1) {
          var k2 = S[i1] <= S[i2] ? i1 : i2, sn = S[k2] * Math.sin(g * D2R) / o.S[miss];
          o.A[k2] = Math.asin(Math.min(1, sn)) / D2R;
          o.st.push('משפט הסינוסים, מול הצלע הקטנה (כך הזווית בטוח חדה): ' + L('sin ' + an[k2] + ' = ' + fmtN(S[k2]) + '·sin ' + fmtN(g) + '° ÷ ' + r4(o.S[miss]) + ' = ' + r4(sn)) + ', ' + L(an[k2] + ' = <b>' + r4(o.A[k2]) + '°</b>'));
          third(o);
        }
      } else {
        // צלע-צלע-זווית שלא ביניהן: אולי שני משולשים
        var ka = o.A.findIndex(function (v) { return v != null; });
        if (o.S[ka] == null) throw new Err('צריך את הצלע שמול הזווית הידועה, או את הזווית שבין שתי הצלעות');
        var kb = [0, 1, 2].filter(function (i) { return i !== ka && S[i] != null; })[0];
        var sb = S[kb] * Math.sin(o.A[ka] * D2R) / S[ka];
        o.st.push('משפט הסינוסים: ' + L(nm[kb] + ' ÷ sin ' + an[kb] + ' = ' + nm[ka] + ' ÷ sin ' + an[ka]) + ', לכן ' + L('sin ' + an[kb] + ' = ' + fmtN(S[kb]) + '·sin ' + fmtN(o.A[ka]) + '° ÷ ' + fmtN(S[ka]) + ' = ' + r4(sb)));
        if (sb > 1 + 1e-12) throw new Err('יוצא sin ' + an[kb] + ' = ' + r4(sb) + ', יותר מ-1. אין משולש כזה');
        var b1 = Math.asin(Math.min(1, sb)) / D2R, b2 = 180 - b1, base = JSON.parse(JSON.stringify(o));
        o.A[kb] = b1; o.st.push(L(an[kb] + ' = sin⁻¹(' + r4(sb) + ') = <b>' + r4(b1) + '°</b>'));
        if (b2 + o.A[ka] < 180 - 1e-9 && Math.abs(b1 - 90) > 1e-9) {
          var o2 = base; o2.A[kb] = b2; o2.st.push('גם ' + L(an[kb] + ' = 180° − ' + r4(b1) + '° = <b>' + r4(b2) + '°</b>') + ' מתאים (לסינוס יש שתי זוויות), לכן יש <b>שני משולשים</b>.');
          sol.push(o2);
        }
        sol.forEach(function (q) { third(q); });
      }
    } else {
      // צלע אחת ושתי זוויות (כבר השלמנו את השלישית)
    }
    // משלימים צלעות חסרות במשפט הסינוסים
    sol.forEach(function (q) {
      var kk = [0, 1, 2].filter(function (i) { return q.S[i] != null && q.A[i] != null; })[0];
      if (kk == null) return;
      var ratio = q.S[kk] / Math.sin(q.A[kk] * D2R);
      [0, 1, 2].forEach(function (i) {
        if (q.S[i] != null) return;
        q.S[i] = ratio * Math.sin(q.A[i] * D2R);
        q.st.push('משפט הסינוסים: ' + L(nm[i] + ' = ' + nm[kk] + '·sin ' + an[i] + ' ÷ sin ' + an[kk] + ' = ' + r4(q.S[kk]) + '·sin ' + r4(q.A[i]) + '° ÷ sin ' + r4(q.A[kk]) + '° = <b>' + r4(q.S[i]) + '</b>'));
      });
      var ar = 0.5 * q.S[0] * q.S[1] * Math.sin(q.A[2] * D2R);
      q.st.push('שטח: ' + L('S = ½·a·b·sin γ = ½·' + r4(q.S[0]) + '·' + r4(q.S[1]) + '·sin ' + r4(q.A[2]) + '° = <b>' + r4(ar) + '</b>'));
      q.st.push('רדיוס המעגל החוסם: ' + L('R = a ÷ (2 sin α) = <b>' + r4(q.S[0] / (2 * Math.sin(q.A[0] * D2R))) + '</b>'));
    });
    return sol;
  }
  function triSvg(q) {
    var a = q.S[0], b = q.S[1], c = q.S[2], al = q.A[0] * D2R;
    var P1 = [0, 0], P2 = [c, 0], P3 = [b * Math.cos(al), b * Math.sin(al)];
    var xs = [P1[0], P2[0], P3[0]], ys = [P1[1], P2[1], P3[1]], mnx = Math.min.apply(null, xs), mxx = Math.max.apply(null, xs), mxy = Math.max.apply(null, ys);
    var sc = Math.min(250 / (mxx - mnx), 150 / mxy), tr = function (p) { return [30 + (p[0] - mnx) * sc, 175 - p[1] * sc]; };
    var A1 = tr(P1), B1 = tr(P2), C1 = tr(P3);
    function mid(p, r, dx, dy) { return [(p[0] + r[0]) / 2 + (dx || 0), (p[1] + r[1]) / 2 + (dy || 0)]; }
    var mc = mid(A1, B1, 0, 16), ma = mid(B1, C1, 10, 0), mb = mid(A1, C1, -14, 0);
    return '<svg viewBox="0 0 310 200" class="cx-trisvg" role="img" aria-label="שרטוט המשולש"><path d="M' + A1 + 'L' + B1 + 'L' + C1 + 'Z" fill="rgba(134,197,230,.12)" stroke="#86c5e6" stroke-width="2.5"/>' +
      '<g fill="#eef1f8" font-size="14" text-anchor="middle"><text x="' + (A1[0] - 10) + '" y="' + (A1[1] + 14) + '">A</text><text x="' + (B1[0] + 10) + '" y="' + (B1[1] + 14) + '">B</text><text x="' + C1[0] + '" y="' + (C1[1] - 8) + '">C</text></g>' +
      '<g fill="#ecca83" font-size="13" text-anchor="middle"><text x="' + mc[0] + '" y="' + mc[1] + '">c=' + r4(c) + '</text><text x="' + ma[0] + '" y="' + ma[1] + '" text-anchor="start">a=' + r4(a) + '</text><text x="' + mb[0] + '" y="' + mb[1] + '" text-anchor="end">b=' + r4(b) + '</text></g>' +
      '<g fill="#a1abc2" font-size="11" text-anchor="middle"><text x="' + (A1[0] + 22) + '" y="' + (A1[1] - 6) + '">α=' + r4(q.A[0]) + '°</text><text x="' + (B1[0] - 24) + '" y="' + (B1[1] - 6) + '">β=' + r4(q.A[1]) + '°</text><text x="' + C1[0] + '" y="' + (C1[1] + 20) + '">γ=' + r4(q.A[2]) + '°</text></g></svg>';
  }
  $('tr-go').addEventListener('click', function () {
    var o = $('tr-out');
    function g(id) { var s = $(id).value.trim(); if (!s) return null; var v = numIn(id); if (isNaN(v)) throw new Err('"' + s + '" הוא לא מספר'); return v; }
    try {
      var sol = triSolve([g('tr-a'), g('tr-b'), g('tr-c')], [g('tr-A'), g('tr-B'), g('tr-C')]);
      used('triangle');
      o.innerHTML = sol.map(function (q, i) {
        return (sol.length > 1 ? '<h4 class="cx-h4">משולש ' + (i + 1) + '</h4>' : '') + triSvg(q) + '<ol class="cx-steps">' + q.st.map(li).join('') + '</ol>';
      }).join('') + lessonLink('sin');
    } catch (e) { if (!(e instanceof Err)) throw e; o.innerHTML = '<p class="bad">' + esc(e.msg) + '</p>'; }
  });
  $('tr-clr').addEventListener('click', function () { ['tr-a', 'tr-b', 'tr-c', 'tr-A', 'tr-B', 'tr-C'].forEach(function (id) { $(id).value = ''; }); $('tr-out').innerHTML = ''; $('tr-a').focus(); });

  // =====================================================================
  //  מספרים מרוכבים ווקטורים (5 יח"ל)
  // =====================================================================
  function parseZ(s) {
    s = String(s).replace(/\s+/g, '').replace(/[−–]/g, '-').replace(/j/g, 'i');
    if (!s) throw new Err('חסר מספר מרוכב');
    var re = 0, im = 0, terms = s.match(/[+-]?[^+-]+/g);
    if (!terms || terms.join('') !== s.replace(/^\+/, '') && terms.join('') !== s) throw new Err('לא הבנתי את "' + s + '". כותבים כמו 3+4i');
    terms.forEach(function (t) {
      if (/i$/.test(t)) { var c = t.slice(0, -1).replace(/\*$/, ''); var v = c === '' || c === '+' ? 1 : c === '-' ? -1 : Number(c); if (!isFinite(v)) throw new Err('לא הבנתי את "' + t + '"'); im += v; }
      else { var w = Number(t); if (!isFinite(w)) throw new Err('לא הבנתי את "' + t + '"'); re += w; }
    });
    return [re, im];
  }
  function fz(z) { var a = clean(+z[0].toFixed(6)), b = clean(+z[1].toFixed(6)); if (!b) return fmtN(a); return (a ? fmtN(a) + (b < 0 ? ' − ' : ' + ') : (b < 0 ? '−' : '')) + (Math.abs(b) === 1 ? '' : fmtN(Math.abs(b))) + 'i'; }
  function argD(z) { return Math.atan2(z[1], z[0]) / D2R; }
  $('z-go').addEventListener('click', function () {
    var o = $('z-out'), out = [];
    try {
      var z1 = parseZ($('z-1').value), z2 = parseZ($('z-2').value), n = numIn('z-n');
      var a = z1[0], b = z1[1], c = z2[0], d = z2[1];
      used('complex');
      out.push('חיבור: ממשי עם ממשי, מדומה עם מדומה. ' + L('z₁ + z₂ = <b>' + fz([a + c, b + d]) + '</b>') + ', &nbsp;' + L('z₁ − z₂ = <b>' + fz([a - c, b - d]) + '</b>'));
      out.push('כפל: כל איבר בכל איבר, ו-' + L('i² = −1') + ': ' + L('(' + fz(z1) + ')(' + fz(z2) + ') = ' + fmtN(clean(a * c)) + ' + ' + P(clean(a * d)) + 'i + ' + P(clean(b * c)) + 'i + ' + P(clean(b * d)) + 'i² = <b>' + fz([a * c - b * d, a * d + b * c]) + '</b>'));
      var m2 = c * c + d * d;
      if (m2) out.push('חילוק: כופלים מונה ומכנה בצמוד של z₂, ' + L('z̄₂ = ' + fz([c, -d])) + ': המכנה ' + L(fmtN(c) + '² + ' + P(d) + '² = ' + fmtN(clean(m2))) + ', לכן ' + L('z₁ ÷ z₂ = <b>' + fz([(a * c + b * d) / m2, (b * c - a * d) / m2]) + '</b>'));
      var r = Math.sqrt(a * a + b * b), th = argD(z1);
      out.push('גודל: ' + L('|z₁| = √(' + P(a) + '² + ' + P(b) + '²) = <b>' + r4(r) + '</b>') + (exact(r) ? ' ' + L('= ' + exact(r)) : ''));
      out.push('זווית: ' + L('θ = ' + r4(th) + '°') + ' <small>(' + (a < 0 ? 'ברביע ' + (b >= 0 ? 'השני' : 'השלישי') + ', לכן לא מספיק tan⁻¹(b/a): מוסיפים או מחסירים 180°' : 'tan⁻¹(b ÷ a)') + ')</small>');
      out.push('בהצגה קוטבית: ' + L('z₁ = <b>' + r4(r) + ' cis ' + r4(th) + '°</b>'));
      if (!isNaN(n) && n === Math.round(n) && Math.abs(n) <= 50) {
        var rn = Math.pow(r, n), tn = th * n, zn = [rn * Math.cos(tn * D2R), rn * Math.sin(tn * D2R)];
        out.push('דה-מואבר: ' + L('z₁^' + fmtN(n) + ' = ' + r4(r) + '^' + fmtN(n) + ' cis(' + fmtN(n) + '·' + r4(th) + '°) = ' + r4(rn) + ' cis ' + r4(tn) + '° = <b>' + fz(zn) + '</b>'));
      }
      out.push(lessonLink('z'));
      o.innerHTML = out.map(li).join('');
    } catch (e) { if (!(e instanceof Err)) throw e; err('z-out', e); }
  });
  function parseV(s) {
    var p = String(s).replace(/[()\[\]{}]/g, '').replace(/[−–]/g, '-').split(/[,;\s]+/).filter(Boolean).map(Number);
    if (p.length < 2 || p.length > 3 || p.some(function (v) { return !isFinite(v); })) throw new Err('כותבים וקטור כמו (1, 2, 2)');
    return p;
  }
  $('v-go').addEventListener('click', function () {
    var o = $('v-out'), out = [];
    try {
      var u = parseV($('v-1').value), v = parseV($('v-2').value);
      if (u.length !== v.length) throw new Err('לשני הווקטורים צריך אותו מספר רכיבים');
      used('vector');
      function vs(x) { return '(' + x.map(function (q) { return fmtN(clean(q)); }).join(', ') + ')'; }
      function len(x, nm2) { var s2 = x.reduce(function (s, q) { return s + q * q; }, 0), l = Math.sqrt(s2); out.push('אורך: ' + L('|' + nm2 + '| = √(' + x.map(function (q) { return P(q) + '²'; }).join(' + ') + ') = √' + fmtN(clean(s2)) + ' = <b>' + r4(l) + '</b>')); return l; }
      out.push(L('u + v = <b>' + vs(u.map(function (q, i) { return q + v[i]; })) + '</b>') + ', &nbsp;' + L('u − v = <b>' + vs(u.map(function (q, i) { return q - v[i]; })) + '</b>'));
      var lu = len(u, 'u'), lv = len(v, 'v'), dot = clean(u.reduce(function (s, q, i) { return s + q * v[i]; }, 0));
      out.push('מכפלה סקלרית: רכיב כפול רכיב, ומחברים. ' + L('u·v = ' + u.map(function (q, i) { return P(q) + '·' + P(v[i]); }).join(' + ') + ' = <b>' + fmtN(dot) + '</b>'));
      if (lu && lv) {
        var cs = dot / (lu * lv), ang = Math.acos(Math.max(-1, Math.min(1, cs))) / D2R;
        out.push('הזווית ביניהם: ' + L('cos θ = u·v ÷ (|u|·|v|) = ' + fmtN(dot) + ' ÷ (' + r4(lu) + '·' + r4(lv) + ') = ' + r4(cs)) + ', ' + L('θ = <b>' + r4(ang) + '°</b>') + (dot === 0 ? ' — <b>הם מאונכים</b> (המכפלה הסקלרית 0).' : ''));
      }
      out.push(lessonLink('vec'));
      o.innerHTML = out.map(li).join('');
    } catch (e) { if (!(e instanceof Err)) throw e; err('v-out', e); }
  });


  // =====================================================================
  //  מאגר משותף: תרגילים שתלמידים משתפים (שרת limudim-calc). התשובה מחושבת כאן בטלפון.
  // =====================================================================
  var API = 'https://limudim-calc.gilad4049.workers.dev';
  if (/^(localhost|127.0.0.1)$/.test(location.hostname) && /[?&]api=/.test(location.search)) API = decodeURIComponent(location.search.match(/[?&]api=([^&]+)/)[1]); // בדיקה מקומית
  if (!st.uid) { st.uid = ''; var abc = 'abcdefghijklmnopqrstuvwxyz0123456789'; for (var ui = 0; ui < 20; ui++) st.uid += abc[Math.floor(Math.random() * abc.length)]; save(); }
  var TOPICS = [['trigo', 'טריגונומטריה'], ['sinusim', 'משפט הסינוסים והקוסינוסים'], ['chezkot', 'חזקות ושורשים'], ['logaritm', 'לוגריתמים'], ['gdila', 'גדילה ודעיכה'], ['histabrut', 'הסתברות'], ['stiya', 'סטטיסטיקה'], ['normalit', 'התפלגות נורמלית'], ['shorashim', 'משוואה ריבועית'], ['seder', 'סדר פעולות'], ['shvarim', 'שברים'], ['other', 'אחר']];
  var TOPIC_OF = { trig: 'trigo', log: 'logaritm', pow: 'chezkot', prob: 'histabrut', frac: 'shvarim', order: 'seder' };
  function tName(id) { for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i][0] === id) return TOPICS[i][1]; return 'אחר'; }
  function api(path, body) {
    var o = body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ uid: st.uid }, body)) } : {};
    return fetch(API + path, o).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Err(j.error || 'משהו השתבש'); return j; }); }, function () { throw new Err('אין חיבור למאגר כרגע. אפשר לנסות שוב בעוד רגע.'); });
  }
  // תשובה מחושבת מקומית, במצב הזוויות של התרגיל
  function answerOf(e, ang) {
    try { var save0 = st.ang; st.ang = ang; var r = compute(e); st.ang = save0; return fmtN(r.v) + (isAngleOut(r.tree) ? '°' : ''); }
    catch (er) { st.ang = save0; return '?'; }
  }
  // ---------- לשלוח למאגר ----------
  $('cx-tobank').addEventListener('click', function () {
    var e = inp.value.trim();
    if (!e || !justEval || lastVal == null) { why.innerHTML = '<b>קודם מחשבים.</b> כותבים תרגיל, לוחצים =, ואז משתפים אותו במאגר.'; return; }
    if (/Ans|\bA\b|\bB\b/.test(e)) { why.innerHTML = '<b>Ans, A ו-B שמורים רק בטלפון שלכם.</b> כדי לשתף, כותבים את התרגיל עם המספרים עצמם.'; return; }
    var guess = TOPIC_OF[lessonKey(lastTree)] || 'other';
    extra.innerHTML = '<div class="cx-vfix"><b>📤 לשתף במאגר של כולם</b>' +
      '<label for="bk-topic">נושא</label><select id="bk-topic">' + TOPICS.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === guess ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select>' +
      '<label for="bk-title">כותרת קצרה <span class="opt">(לא חובה, למשל "זווית במשולש")</span></label><input id="bk-title" type="text" maxlength="60" autocomplete="off">' +
      '<button type="button" class="btn btn-gold btn-sm" id="bk-send">לשתף</button><small>משותף רק התרגיל, בלי שם ובלי פרטים. התשובה מחושבת מחדש אצל כל אחד.</small></div>';
    $('bk-send').addEventListener('click', function () {
      var btn = this; btn.disabled = true;
      api('/add', { e: e, ang: st.ang, topic: $('bk-topic').value, lv: st.lv || 0, title: $('bk-title').value.trim() }).then(function (j) {
        used('bank_add');
        extra.innerHTML = '<span>✓ ' + (j.dup ? 'התרגיל הזה כבר במאגר. תודה!' : 'נוסף למאגר. תודה שעזרתם לכולם!') + ' <button type="button" class="linkish" data-gotab="bank">לראות את המאגר</button></span>';
      }).catch(function (er) { btn.disabled = false; extra.insertAdjacentHTML('beforeend', '<span class="bad">' + esc(er.msg || '') + '</span>'); });
    });
  });
  // ---------- לשונית המאגר ----------
  var ADMIN = (location.search.match(/[?&]admin=([^&]+)/) || [])[1] || '';
  $('bk-topic-f').innerHTML = '<option value="">כל הנושאים</option>' + TOPICS.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('');
  var bankItems = [];
  function bankLoad() {
    var box = $('bk-list'), q = '?topic=' + $('bk-topic-f').value + '&sort=' + $('bk-sort').value + ($('bk-mine').checked && st.lv ? '&lv=' + st.lv : '');
    box.innerHTML = '<p class="note">טוען…</p>';
    api('/list' + q).then(function (j) {
      bankItems = j.items || [];
      $('bk-count').textContent = j.total ? 'במאגר יש ' + j.total + ' תרגילים' : '';
      if (!bankItems.length) { box.innerHTML = '<p class="note">עוד אין כאן תרגילים. אפשר להיות הראשונים: מחשבים תרגיל ולוחצים "📤 למאגר".</p>'; return; }
      box.innerHTML = bankItems.map(function (it, i) {
        return '<div class="cx-g cx-bk"><div class="cx-bkh"><span class="pill">' + esc(tName(it.topic)) + (it.lv ? ' · ' + it.lv + ' יח"ל' : '') + '</span>' + (it.ang === 'rad' ? '<span class="pill">רדיאנים</span>' : '') + '</div>' +
          (it.title ? '<b>' + esc(it.title) + '</b>' : '') +
          '<p dir="ltr" class="cx-bke">' + esc(it.e) + ' = <b>' + esc(answerOf(it.e, it.ang)) + '</b></p>' +
          '<div class="btns"><button type="button" class="btn btn-line btn-sm" data-bk="open" data-i="' + i + '">🧮 לפתוח עם השלבים</button><button type="button" class="linkish" data-bk="like" data-i="' + i + '" aria-label="אהבתי">👍 ' + (it.likes || 0) + '</button><button type="button" class="linkish" data-bk="report" data-i="' + i + '">🚩 לדווח</button></div></div>';
      }).join('');
    }).catch(function (er) { box.innerHTML = '<p class="note">' + esc(er.msg || '') + '</p>'; });
  }
  $('bk-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-bk]'); if (!b) return;
    var it = bankItems[+b.dataset.i]; if (!it) return;
    if (b.dataset.bk === 'open') { tryIt(it.e, it.ang); used('bank_open'); return; }
    if (b.dataset.bk === 'report' && !confirm('לדווח על התרגיל הזה? אחרי כמה דיווחים הוא יורד מהמאגר.')) return;
    b.disabled = true;
    api('/' + b.dataset.bk, { id: it.id }).then(function (j) {
      if (b.dataset.bk === 'like') { if (!j.again) it.likes = (it.likes || 0) + 1; b.textContent = '👍 ' + it.likes; }
      else b.textContent = '✓ תודה, דווח';
    }).catch(function () { b.disabled = false; });
  });
  ['bk-topic-f', 'bk-sort', 'bk-mine'].forEach(function (id) { $(id).addEventListener('change', bankLoad); });
  $('cx-t-bank').addEventListener('click', function () { if (!bankItems.length) bankLoad(); });
  // ניהול (רק עם המפתח של גילעד בקישור): התרגילים שדווחו
  if (ADMIN) {
    $('bk-admin').hidden = false;
    var adm = function () {
      fetch(API + '/admin/list?key=' + encodeURIComponent(ADMIN)).then(function (r) { return r.json(); }).then(function (j) {
        $('bk-admin').innerHTML = '<h3>ניהול: תרגילים שדווחו</h3><p class="note">סה"כ במאגר: ' + (j.total || 0) + '</p>' + ((j.items || []).map(function (it) {
          return '<div class="cx-g"><p dir="ltr">' + esc(it.e) + '</p><p>' + esc(it.title || '') + ' · ' + it.reports + ' דיווחים' + (it.hidden ? ' · מוסתר' : '') + '</p><div class="btns"><button type="button" class="btn btn-line btn-sm" data-adm="keep" data-id="' + it.id + '">להשאיר</button><button type="button" class="btn btn-no btn-sm" data-adm="delete" data-id="' + it.id + '">למחוק</button></div></div>';
        }).join('') || '<p>אין דיווחים. 🙂</p>');
      });
    };
    $('bk-admin').addEventListener('click', function (e) {
      var b = e.target.closest('[data-adm]'); if (!b) return;
      fetch(API + '/admin/' + b.dataset.adm, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ uid: st.uid, key: ADMIN, id: b.dataset.id }) }).then(adm);
    });
    adm();
  }
  // ---------- תיקוני דיבור של כולם ----------
  st.gfix = st.gfix || {};
  function sendFixes(pairs) { if (pairs.length) api('/fix', { pairs: pairs }).catch(function () {}); }
  if (SR) fetch(API + '/fixes').then(function (r) { return r.json(); }).then(function (j) { if (j && j.w) { st.gfix = j.w; save(); } }).catch(function () {});


  // =====================================================================
  //  דף פתרון כמו בבגרות + משוואות עם x ו-y + פירוק לגורמים (גם בקול)
  // =====================================================================
  function fS(v) { return fmtN(+(+v).toPrecision(7)); }
  function recLine(s) {
    var n = s.n, x = s.x, y = s.y, f = n.f, deg = st.ang === 'deg';
    var left;
    if (n.t === 'op') left = n.op === '^' ? (y === 2 ? P(x) + '²' : P(x) + '^' + P(y)) : P(x) + ' ' + { '+': '+', '-': '−', '*': '×', '/': '÷' }[n.op] + ' ' + P(y);
    else if (n.t === 'fact') left = fS(x) + '!';
    else if (/^(sin|cos|tan)$/.test(f)) left = f + '(' + fS(x) + (deg ? '°' : '') + ')';
    else if (/^a(sin|cos|tan)$/.test(f)) left = shown(f) + '(' + fS(x) + ')';
    else if (f === 'sqrt') left = '√' + P(x);
    else if (f === 'root') left = fS(x) + '√' + P(y);
    else if (f === 'logb') left = 'log' + sub(fS(x)) + '(' + fS(y) + ')';
    else if (f === 'ncr') left = 'C(' + fS(x) + ', ' + fS(y) + ')';
    else if (f === 'exp') left = 'e^' + P(x);
    else left = shown(f) + '(' + fS(x) + ')';
    var degOut = n.t === 'fn' && /^a(sin|cos|tan)$/.test(f) && deg ? '°' : '';
    var w = words(n);
    return '<span dir="ltr">' + esc(left) + ' = ' + fS(s.v) + degOut + '</span>' + (w ? ' <small>' + w + '</small>' : '');
  }
  function P(v) { return typeof v === 'number' && v < 0 ? '(' + fS(v) + ')' : fS(v); }
  // הדף עצמו: שורות ממוספרות + תיבת "תשובה"
  function sheet(lines, finalHtml, lessonK, noKeys) {
    $('cx-steps').innerHTML = lines.map(function (l) { return '<li>' + l + '</li>'; }).join('');
    $('cx-final').innerHTML = finalHtml || '';
    $('cx-final').hidden = !finalHtml;
    $('cx-steps-p').hidden = MINI || EXAM || (!lines.length && !finalHtml);
    if (noKeys) $('cx-keyseq').innerHTML = '<p class="note">🔑 במחשבון רגיל אין פתרון משוואות. בבחינה כותבים את השלבים האלה בעצמכם, ומשתמשים במחשבון רק לחישובים.</p>';
    if (lessonK) $('cx-lesson').innerHTML = lessonLink(lessonK);
  }
  function finalBox(main, more) { return '<div class="cx-ans"><span>תשובה:</span> <b dir="ltr">' + main + '</b></div>' + (more || ''); }
  // שלבים לחישוב רגיל
  function steps(r) {
    var lines = [];
    if (r.rec.length > 1 || (r.rec.length === 1 && r.rec[0].n !== r.tree && !(r.tree.t === 'par' && r.tree.a === r.rec[0].n))) {
      lines.push('התרגיל: ' + L(esc(show(r.tree, st.ang))));
      r.rec.forEach(function (s, i) { lines.push('שלב ' + (i + 1) + ': ' + recLine(s)); });
      if (r.rec.length >= 14) lines.push('<small>ועוד שלבים באותה שיטה…</small>');
    } else if (r.rec.length === 1) lines.push(recLine(r.rec[0]));
    var deg = isAngleOut(r.tree) ? '°' : '', fx = fixed(r.v), ex = exact(r.v), fr = toFrac(r.v);
    var more = '';
    if (fx) more += '<p>מעוגל ל-' + (st.fix === 1 ? 'ספרה אחת' : st.fix + ' ספרות') + ' אחרי הנקודה: <b dir="ltr">' + fx + deg + '</b></p>';
    if (ex) more += '<p>בצורה מדויקת: <b dir="ltr">' + ex + '</b></p>';
    else if (fr) more += '<p>כשבר: <b dir="ltr">' + (fr[0] < 0 ? '−' : '') + Math.abs(fr[0]) + '/' + fr[1] + '</b></p>';
    if (lines.length > 1) more += '<p class="note">💡 כמו בבגרות: כותבים את התרגיל, מציבים, ומעגלים רק את התשובה הסופית.</p>';
    sheet(lines, lines.length ? finalBox(fmtN(r.v) + deg, more) : '', null, false);
  }

  // ---------- משוואות ופירוק ----------
  function varsIn(s) {
    var vs = {};
    try { tokenize(s.replace(/[=;]/g, '+')).forEach(function (t) { if (t.k === 'id' && (t.v === 'x' || t.v === 'y')) vs[t.v] = 1; }); } catch (e) { }
    return vs;
  }
  function side(s) {
    var tree = parse(s);
    return { tree: tree, f: function (x, y) { try { return ev(tree, { ang: st.ang, ans: ans, x: x, y: y == null ? 0 : y }); } catch (e) { return NaN; } } };
  }
  function near(a, b) { return Math.abs(a - b) <= 1e-7 * (1 + Math.abs(a) + Math.abs(b)); }
  // מקדמים של פולינום עד מעלה 2 במשתנה אחד, או null
  function snap(v) { var r = Math.round(v); if (Math.abs(v - r) < 1e-8) return r; var f = toFrac(v); if (f && Math.abs(v - f[0] / f[1]) < 1e-8 * (1 + Math.abs(v))) return f[0] / f[1]; return clean(v); }
  function poly2(g) {
    // אינטרפולציה בשלוש נקודות שלא נופלות על מכנה 0, ובדיקה בעוד ארבע
    var T = [0.37, 1.93, -1.21], Y = T.map(g);
    if (!Y.every(isFinite)) { T = [0.53, 2.47, -2.71]; Y = T.map(g); if (!Y.every(isFinite)) return null; }
    var a = 0, b = 0, c = 0;
    for (var i = 0; i < 3; i++) {
      var j = (i + 1) % 3, k = (i + 2) % 3, den = (T[i] - T[j]) * (T[i] - T[k]), w = Y[i] / den;
      a += w; b += -w * (T[j] + T[k]); c += w * T[j] * T[k];
    }
    a = snap(a); b = snap(b); c = snap(c);
    var ok = [2, 3.3, -2.5, 7.1, 0].every(function (t) { var v = g(t); return !isFinite(v) || near(v, a * t * t + b * t + c); }) && [2, 3.3, -2.5].some(function (t) { return isFinite(g(t)); });
    return ok ? [a, b, c] : null;
  }
  function coef(k, v, first) { // 3x, −x, + 2x
    var s = k < 0 ? (first ? '−' : ' − ') : (first ? '' : ' + '), m = Math.abs(k);
    return s + (m === 1 && v ? '' : fmtN(m)) + v;
  }
  function polyS(a, b, c, v) {
    var out = '', first = true;
    if (a) { out += coef(a, v + '²', first); first = false; }
    if (b) { out += coef(b, v, first); first = false; }
    if (c || first) out += first ? fmtN(c) : (c < 0 ? ' − ' : ' + ') + fmtN(Math.abs(c));
    return out;
  }
  function fracS(v) { var f = toFrac(v); return f && f[1] > 1 ? (f[0] < 0 ? '−' : '') + Math.abs(f[0]) + '/' + f[1] : fmtN(v); }
  function ratRoot(r) { if (r === Math.round(r)) return [r, 1]; var f = toFrac(r); return f && f[1] <= 50 ? f : null; }
  function linF(q, p, v) { // (q·v − p)
    var g = gcdI(q, p) || 1; q /= g; p /= g;
    return (q === 1 ? '' : q === -1 ? '−' : fmtN(q)) + v + (p === 0 ? '' : p > 0 ? ' − ' + fmtN(p) : ' + ' + fmtN(-p));
  }
  // פירוק פולינום ריבועי/קווי לגורמים. מחזיר { s: מחרוזת, how: הסבר } או null
  function factorPoly(a, b, c, v) {
    if (!a) {
      if (!b) return null;
      var ints = [b, c].every(function (k) { return k === Math.round(k); }), g = ints ? gcdI(b, c) : 1;
      if (b < 0 && g) g = -g;
      if (ints && Math.abs(g) > 1) return { s: fmtN(g) + '(' + polyS(0, b / g, c / g, v) + ')', how: 'מוציאים גורם משותף ' + fmtN(g) };
      return null;
    }
    if (!c) {
      var g2 = [a, b].every(function (k) { return k === Math.round(k); }) ? gcdI(a, b) : 1; if (a < 0) g2 = -g2;
      var pre = (Math.abs(g2) === 1 ? (g2 < 0 ? '−' : '') : fmtN(g2)) + v;
      return { s: pre + '(' + polyS(0, a / g2, b / g2, v) + ')', how: 'בכל האיברים יש ' + v + ', לכן מוציאים ' + pre + ' כגורם משותף' };
    }
    var D = b * b - 4 * a * c;
    if (D < 0) return null;
    var r1 = (-b + Math.sqrt(D)) / (2 * a), r2 = (-b - Math.sqrt(D)) / (2 * a);
    if (r1 > r2) { var tq = r1; r1 = r2; r2 = tq; }
    var f1 = ratRoot(clean(r1)), f2 = ratRoot(clean(r2));
    if (!f1 || !f2) return null;
    var k = clean(a / (f1[1] * f2[1]));
    var A = linF(f1[1], f1[0], v), B = linF(f2[1], f2[0], v);
    var lead = k === 1 ? '' : k === -1 ? '−' : fmtN(k);
    var s = D === 0 ? lead + '(' + A + ')²' : lead + '(' + A + ')(' + B + ')';
    var how = a === 1 && D > 0 && [b, c].every(function (q) { return q === Math.round(q); })
      ? 'מחפשים שני מספרים שמכפלתם ' + L(fmtN(c)) + ' וסכומם ' + L(fmtN(b)) + ': ' + L(fmtN(clean(-r1))) + ' ו-' + L(fmtN(clean(-r2)))
      : (!b && a > 0 && c < 0 ? 'זה הפרש ריבועים: ' + L('A² − B² = (A − B)(A + B)') : 'מוצאים את השורשים בנוסחה, ' + L(v + ' = ' + fracS(clean(r1)) + (D ? ', ' + fracS(clean(r2)) : '')) + ', ואז ' + L(polyS(a, b, c, v) + ' = a(' + v + ' − ' + v + '₁)(' + v + ' − ' + v + '₂)'));
    return { s: s, how: how };
  }
  function solveOne(Ls, Rs, v) {
    var Ls2 = side(Ls), Rs2 = side(Rs), g = function (t) { return v === 'y' ? Ls2.f(0, t) - Rs2.f(0, t) : Ls2.f(t) - Rs2.f(t); };
    var lines = ['המשוואה: ' + L(esc(show(Ls2.tree, st.ang)) + ' = ' + esc(show(Rs2.tree, st.ang)))], pc = poly2(g), ansS, lk = 'eq';
    if (pc) {
      var a = pc[0], b = pc[1], c = pc[2];
      if (!a && !b) { lines.push('אחרי שמסדרים, ה-' + v + ' מתבטל ונשאר ' + L(fmtN(-c) + ' = 0') + '.'); ansS = c ? 'אין פתרון' : 'כל ' + v + ' מתאים'; sheet(lines, finalBox(ansS), lk, true); return ansS; }
      if (!a) {
        lines.push('מעבירים אגפים: האיברים עם ' + v + ' לצד אחד, והמספרים לצד השני: ' + L(coef(b, v, true) + ' = ' + fmtN(-c)));
        var x0 = clean(-c / b);
        lines.push('מחלקים ב-' + fmtN(b) + ': ' + L(v + ' = ' + fmtN(-c) + ' ÷ ' + P(b) + ' = <b>' + fracS(x0) + '</b>'));
        lines.push('בדיקה: מציבים ' + L(v + ' = ' + fmtN(x0)) + ' בשני האגפים ומקבלים ' + L(fS(v === 'y' ? Ls2.f(0, x0) : Ls2.f(x0)) + ' = ' + fS(v === 'y' ? Rs2.f(0, x0) : Rs2.f(x0))) + ' ✓');
        ansS = v + ' = ' + fracS(x0);
        sheet(lines, finalBox(ansS, x0 !== Math.round(x0) ? '<p>בעשרוני: <b dir="ltr">' + fS(x0) + '</b></p>' : ''), lk, true); return ansS;
      }
      lk = 'sq';
      lines.push('מעבירים הכול לאגף אחד ומסדרים: ' + L(polyS(a, b, c, v) + ' = 0'));
      var D = clean(b * b - 4 * a * c), fp = factorPoly(a, b, c, v);
      if (D < 0) {
        lines.push('הדיסקרימיננטה: ' + L('Δ = b² − 4ac = ' + P(b) + '² − 4·' + P(a) + '·' + P(c) + ' = ' + fmtN(D)) + '. היא שלילית, ולכן אין פתרון.');
        ansS = 'אין פתרון'; sheet(lines, finalBox(ansS, '<p class="note">הפרבולה לא חותכת את ציר ' + v + '.</p>'), lk, true); return ansS;
      }
      var r1 = clean((-b + Math.sqrt(D)) / (2 * a)), r2 = clean((-b - Math.sqrt(D)) / (2 * a)), lo = Math.min(r1, r2), hi = Math.max(r1, r2);
      if (fp) {
        lines.push('מפרקים לגורמים. ' + fp.how + ':');
        lines.push(L(fp.s + ' = 0'));
        lines.push('מכפלה שווה 0 כשאחד הגורמים שווה 0, ולכן:');
      } else {
        lines.push('אין פירוק פשוט, ולכן משתמשים בנוסחת השורשים. ' + L('a = ' + fmtN(a) + ', b = ' + fmtN(b) + ', c = ' + fmtN(c)));
        lines.push(L('Δ = b² − 4ac = ' + P(b) + '² − 4·' + P(a) + '·' + P(c) + ' = ' + fmtN(D)));
        lines.push(L(v + '₁,₂ = (−b ± √Δ) ÷ 2a = (' + fmtN(-b) + ' ± √' + fmtN(D) + ') ÷ ' + fmtN(2 * a)));
      }
      var irr = !fp && !(ratRoot(lo) && ratRoot(hi)), r3 = function (q) { return irr ? fmtN(+q.toFixed(3)) : fracS(q); }, eqs = irr ? ' ≈ ' : ' = ';
      ansS = D === 0 ? v + eqs + r3(r1) : v + '₁' + eqs + r3(lo) + ',  ' + v + '₂' + eqs + r3(hi);
      lines.push(L('<b>' + ansS + '</b>'));
      var km = sqrtSimp(Math.round(D)), sq = D === Math.round(D) ? (km[0] === 1 ? '' : km[0]) + '√' + km[1] : '√' + fmtN(D);
      var more = irr ? '<p>בצורה מדויקת: <b dir="ltr">' + v + ' = (' + fmtN(-b) + ' ± ' + sq + ') ÷ ' + fmtN(2 * a) + '</b></p><p class="note">מעוגל ל-3 ספרות. בבגרות מעגלים לפי מה שמבקשים, ורק בסוף.</p>' : '';
      sheet(lines, finalBox(ansS, more), lk, true); return ansS;
    }
    // יש x במכנה: מכפילים במכנים (תחום הגדרה: מכנה ≠ 0)
    var dens = [], seen = {};
    [Ls2.tree, Rs2.tree].forEach(function walk(n) {
      if (!n || typeof n !== 'object') return;
      if (n.t === 'op' && n.op === '/' && JSON.stringify(n.b).indexOf('"t":"var"') >= 0) { var k = show(n.b, st.ang); if (!seen[k]) { seen[k] = 1; dens.push(n.b); } }
      ['a', 'b'].forEach(function (q) { walk(n[q]); }); (n.args || []).forEach(walk);
    });
    if (dens.length) {
      var dv = function (t) { return dens.reduce(function (m, d) { try { return m * ev(d, { ang: st.ang, ans: ans, x: v === 'y' ? 0 : t, y: v === 'y' ? t : 0 }); } catch (e) { return NaN; } }, 1); };
      var hc = poly2(function (t) { return g(t) * dv(t); });
      if (hc && (hc[0] || hc[1])) {
        // מקדמים שלמים, כמו בבגרות: כופלים גם במכנה המספרי, ומקדם מוביל חיובי
        var lc = hc.reduce(function (m, q) { var f = toFrac(q); return f ? m / gcdI(m, f[1]) * f[1] : m; }, 1);
        hc = hc.map(function (q) { return clean(q * lc); });
        if (hc[0] < 0 || (!hc[0] && hc[1] < 0)) hc = hc.map(function (q) { return -q || 0; });
        var gg = hc.reduce(function (m, q) { return q === Math.round(q) ? gcdI(m, q) : 1; }, 0);
        if (gg > 1) hc = hc.map(function (q) { return q / gg; });
        lines.push('יש ' + v + ' במכנה. תחום ההגדרה: ' + dens.map(function (d) { return L(esc(show(d, st.ang)) + ' ≠ 0'); }).join(', ') + '.');
        lines.push('מכפילים את שני האגפים ב' + (dens.length > 1 ? 'מכנה המשותף ' : 'מכנה ') + L(dens.map(function (d) { var q = show(d, st.ang); return /^\(.*\)$/.test(q) ? esc(q) : '(' + esc(q) + ')'; }).join('')) + ' ומסדרים: ' + L(polyS(hc[0], hc[1], hc[2], v) + ' = 0'));
        var A2 = hc[0], B2 = hc[1], C2 = hc[2], cand = [];
        if (!A2) cand = [clean(-C2 / B2)];
        else { var DD = clean(B2 * B2 - 4 * A2 * C2); if (DD >= 0) { cand = [clean((-B2 - Math.sqrt(DD)) / (2 * A2)), clean((-B2 + Math.sqrt(DD)) / (2 * A2))].sort(function (p, q) { return p - q; }); if (DD === 0) cand = [cand[0]]; } lines.push(L('Δ = ' + fmtN(DD)) + (DD < 0 ? ', שלילית: אין פתרון.' : ', ולכן ' + L(cand.map(function (c) { return v + ' = ' + fracS(c); }).join(', ')))); }
        var good = cand.filter(function (c) { return Math.abs(dv(c)) > 1e-9; }), bad = cand.filter(function (c) { return Math.abs(dv(c)) <= 1e-9; });
        if (bad.length) lines.push('פוסלים את ' + L(bad.map(function (c) { return v + ' = ' + fracS(c); }).join(', ')) + ', כי הוא מאפס מכנה (מחוץ לתחום).');
        ansS = good.length ? good.map(function (c, i) { return v + (good.length > 1 ? '₁₂'[i] : '') + ' = ' + fracS(c); }).join(',  ') : 'אין פתרון';
        lines.push(L('<b>' + ansS + '</b>'));
        sheet(lines, finalBox(ansS, '<p class="note">💡 תמיד בודקים שהפתרון לא מאפס מכנה.</p>'), 'eq', true); return ansS;
      }
    }
    // לא קווית ולא ריבועית: פתרון מספרי
    var trig = /sin|cos|tan/.test(Ls + Rs), from = trig && st.ang === 'deg' ? 0 : -100, to = trig && st.ang === 'deg' ? 360 : 100;
    var rs = roots(g, from, to).slice(0, 8);
    lines.push('זו לא משוואה קווית או ריבועית. המחשבון מחפש פתרונות מספריים בין ' + fmtN(from) + ' ל-' + fmtN(to) + (trig ? ' (במעלות, בסיבוב אחד)' : '') + '.');
    if (/\^/.test(Ls + Rs) && !trig) lines.push('<small>במשוואה מעריכית כמו ' + L('aˣ = b') + ', בבגרות כותבים ' + L('x = log(b) ÷ log(a)') + '.</small>');
    if (trig) lines.push('<small>בבגרות כותבים את הפתרון הכללי, למשל ' + L('x = α + 360°k') + ' או ' + L('x = 180° − α + 360°k') + '.</small>');
    ansS = rs.length ? rs.map(function (r, i) { var rr = ratRoot(clean(+r.toPrecision(9))), ex = rr && Math.abs(g(rr[0] / rr[1])) < 1e-9; return v + (rs.length > 1 ? '₁₂₃₄₅₆₇₈'[i] : '') + (ex ? ' = ' + fracS(rr[0] / rr[1]) : ' ≈ ' + fmtN(+r.toFixed(4))); }).join(',  ') : 'לא נמצא פתרון בטווח';
    sheet(lines, finalBox(ansS), 'eq', true); return ansS;
  }
  function linCoef(eq) {
    var pr = eq.split('='), A = side(pr[0]), B = side(pr[1]), g = function (x, y) { return A.f(x, y) - B.f(x, y); };
    var c0 = g(0, 0), a = clean(g(1, 0) - c0), b = clean(g(0, 1) - c0);
    var ok = isFinite(c0) && [[2, 3], [-1.5, 0.5], [4, -2]].every(function (p) { var v = g(p[0], p[1]); return isFinite(v) && near(v, a * p[0] + b * p[1] + c0); });
    return { ok: ok && (a || b), a: a, b: b, c: clean(-c0), g: g, txt: show(A.tree, st.ang) + ' = ' + show(B.tree, st.ang) };
  }
  function linS(m, k, v) { // m·v + k עם שברים
    var s = m ? (m === 1 ? '' : m === -1 ? '−' : fracS(m)) + v : '';
    if (k) s += s ? (k < 0 ? ' − ' + fracS(-k) : ' + ' + fracS(k)) : fracS(k);
    return s || '0';
  }
  function solveSubst(L1, Q, iL) {
    var lines = ['המשוואות: (1) ' + L(esc(iL === 0 ? L1.txt : Q.txt)) + ' &nbsp; (2) ' + L(esc(iL === 0 ? Q.txt : L1.txt))];
    var byY = L1.b !== 0, m, k, other, h;
    if (byY) { m = clean(-L1.a / L1.b); k = clean(L1.c / L1.b); lines.push('משוואה (' + (iL + 1) + ') קווית. מבודדים ממנה את y: ' + L('y = ' + linS(m, k, 'x'))); h = function (t) { return Q.g(t, m * t + k); }; }
    else { k = clean(L1.c / L1.a); lines.push('ממשוואה (' + (iL + 1) + '): ' + L('x = ' + fracS(k))); h = function (t) { return Q.g(k, t); }; }
    var u = byY ? 'x' : 'y', pc = poly2(h);
    if (!pc) throw new Err('אחרי ההצבה יוצאת משוואה ממעלה גבוהה מ-2. כאן פותרים מערכת שבה ההצבה נותנת משוואה קווית או ריבועית');
    lines.push('מציבים במשוואה (' + (2 - iL) + ') ומסדרים. יוצאת משוואה עם נעלם אחד: ' + L(polyS(pc[0], pc[1], pc[2], u) + ' = 0'));
    var sols = [], A = pc[0], B = pc[1], C = pc[2];
    if (!A) { if (!B) throw new Err(C ? 'אין פתרון למערכת' : 'יש אינסוף פתרונות'); sols = [clean(-C / B)]; lines.push(L(u + ' = ' + fracS(sols[0]))); }
    else {
      var D = clean(B * B - 4 * A * C), fp = factorPoly(A, B, C, u);
      if (D < 0) { lines.push(L('Δ = ' + fmtN(D)) + ', שלילית: למערכת <b>אין פתרון</b> (הישר לא חותך את העקומה).'); sheet(lines, finalBox('אין פתרון'), 'sys', true); return 'אין פתרון'; }
      sols = D === 0 ? [clean(-B / (2 * A))] : [clean((-B - Math.sqrt(D)) / (2 * A)), clean((-B + Math.sqrt(D)) / (2 * A))].sort(function (p, q) { return p - q; });
      lines.push(fp ? 'מפרקים לגורמים: ' + L(fp.s + ' = 0') : 'בנוסחת השורשים: ' + L('Δ = ' + fmtN(D)));
      lines.push(L(sols.map(function (x, i) { return u + (sols.length > 1 ? '₁₂'[i] : '') + ' = ' + fracS(x); }).join(',  ')));
    }
    var pts = sols.map(function (t) { return byY ? [t, clean(m * t + k)] : [k, t]; });
    lines.push('מציבים כל ' + u + ' במשוואה הקווית כדי למצוא את ' + (byY ? 'y' : 'x') + ': ' + pts.map(function (p) { return L(byY ? 'x = ' + fracS(p[0]) + ' ⇐ y = ' + fracS(p[1]) : 'y = ' + fracS(p[1]) + ' ⇐ x = ' + fracS(p[0])); }).join(' ; '));
    var bad = pts.filter(function (p) { return Math.abs(Q.g(p[0], p[1])) > 1e-6; });
    lines.push('בדיקה בשתי המשוואות' + (bad.length ? ': יש נקודה שלא מתאימה, והיא נפסלת.' : ' ✓'));
    pts = pts.filter(function (p) { return Math.abs(Q.g(p[0], p[1])) <= 1e-6; });
    var ansS = pts.length ? pts.map(function (p) { return '(' + fracS(p[0]) + ', ' + fracS(p[1]) + ')'; }).join('  ') : 'אין פתרון';
    sheet(lines, finalBox(ansS, '<p class="note">' + (pts.length > 1 ? 'שתי נקודות החיתוך' : 'נקודת החיתוך') + ' של הישר והעקומה, בצורה (x, y).</p>'), 'sys', true);
    return ansS;
  }
  function solveSys(e1, e2) {
    var c1 = linCoef(e1), c2 = linCoef(e2);
    if (!c1.ok && !c2.ok) throw new Err('שתי המשוואות לא קוויות. כאן פותרים מערכת שבה לפחות משוואה אחת קווית (כמו ברוב הבגרויות)');
    if (!c1.ok || !c2.ok) return c1.ok ? solveSubst(c1, c2, 0) : solveSubst(c2, c1, 1);
    function lin(eq, i) {
      var pr = eq.split('=');
      var A = side(pr[0]), B = side(pr[1]), g = function (x, y) { return A.f(x, y) - B.f(x, y); };
      var c0 = g(0, 0), a = clean(g(1, 0) - c0), b = clean(g(0, 1) - c0);
      var ok = [[2, 3], [-1.5, 0.5], [4, -2]].every(function (p) { var v = g(p[0], p[1]); return isFinite(v) && near(v, a * p[0] + b * p[1] + c0); });
      if (!ok) throw new Err('משוואה ' + (i + 1) + ' לא קווית. כאן פותרים מערכת של שתי משוואות קוויות');
      return { a: a, b: b, c: clean(-c0), txt: show(A.tree, st.ang) + ' = ' + show(B.tree, st.ang) };
    }
    var q1 = lin(e1, 0), q2 = lin(e2, 1), lines = [];
    function eqS(q) { return L((q.a ? coef(q.a, 'x', true) : '') + (q.b ? coef(q.b, 'y', !q.a) : '') + ' = ' + fmtN(q.c)); }
    lines.push('המשוואות: (1) ' + L(esc(q1.txt)) + ' &nbsp; (2) ' + L(esc(q2.txt)));
    lines.push('מסדרים כל משוואה: (1) ' + eqS(q1) + ' &nbsp; (2) ' + eqS(q2));
    var D = clean(q1.a * q2.b - q2.a * q1.b), ansS;
    if (D === 0) {
      var same = clean(q1.a * q2.c - q2.a * q1.c) === 0 && clean(q1.b * q2.c - q2.b * q1.c) === 0;
      ansS = same ? 'אינסוף פתרונות' : 'אין פתרון';
      lines.push(same ? 'שתי המשוואות הן אותו ישר.' : 'הישרים מקבילים ולא נפגשים.');
      sheet(lines, finalBox(ansS), 'sys', true); return ansS;
    }
    var x, y;
    if (q1.a && q2.a) {
      lines.push('מבטלים את x: כופלים את (1) ב-' + fmtN(q2.a) + ' ואת (2) ב-' + fmtN(q1.a) + ', ומחסרים.');
      var ky = clean(q1.b * q2.a - q2.b * q1.a), kc = clean(q1.c * q2.a - q2.c * q1.a);
      y = clean(kc / ky);
      lines.push('נשאר: ' + L(coef(ky, 'y', true) + ' = ' + fmtN(kc)) + ', לכן ' + L('y = <b>' + fracS(y) + '</b>'));
      x = clean((q1.c - q1.b * y) / q1.a);
      lines.push('מציבים את y במשוואה (1): ' + L(coef(q1.a, 'x', true) + ' = ' + fmtN(q1.c) + ' − ' + P(q1.b) + '·' + P(y)) + ', לכן ' + L('x = <b>' + fracS(x) + '</b>'));
    } else {
      var qa = q1.a ? q2 : q1, qb = q1.a ? q1 : q2; // qa בלי x
      y = clean(qa.c / qa.b);
      lines.push('באחת המשוואות אין x, אז מוצאים ממנה את y: ' + L('y = ' + fmtN(qa.c) + ' ÷ ' + P(qa.b) + ' = <b>' + fracS(y) + '</b>'));
      x = clean((qb.c - qb.b * y) / qb.a);
      lines.push('מציבים בשנייה: ' + L('x = (' + fmtN(qb.c) + ' − ' + P(qb.b) + '·' + P(y) + ') ÷ ' + P(qb.a) + ' = <b>' + fracS(x) + '</b>'));
    }
    lines.push('בדיקה במשוואה (2): ' + L(fS(q2.a * x + q2.b * y) + ' = ' + fmtN(q2.c)) + ' ✓');
    ansS = 'x = ' + fracS(x) + ',  y = ' + fracS(y);
    sheet(lines, finalBox(ansS, '<p class="note">נקודת החיתוך של שני הישרים: <b dir="ltr">(' + fracS(x) + ', ' + fracS(y) + ')</b></p>'), 'sys', true);
    return ansS;
  }
  function factorExpr(e, v) {
    var S = side(e), g = function (t) { return v === 'y' ? S.f(0, t) : S.f(t); }, pc = poly2(g);
    var lines = ['הביטוי: ' + L(esc(show(S.tree, st.ang)))];
    if (!pc || (!pc[0] && !pc[1])) throw new Err('אפשר לפרק לגורמים ביטוי קווי או ריבועי ב-' + v + '. כדי לפתור, כותבים משוואה עם =');
    var a = pc[0], b = pc[1], c = pc[2];
    lines.push('מסדרים: ' + L(polyS(a, b, c, v)));
    var fp = factorPoly(a, b, c, v), ansS;
    if (fp) { lines.push(fp.how + '.'); ansS = fp.s; lines.push('בדיקה: פותחים סוגריים וחוזרים ל-' + L(polyS(a, b, c, v)) + ' ✓'); }
    else {
      var D = clean(b * b - 4 * a * c);
      lines.push(a ? 'הדיסקרימיננטה ' + L('Δ = ' + fmtN(D)) + (D < 0 ? ' שלילית, ולכן אין פירוק לגורמים.' : ' היא לא ריבוע של מספר רציונלי, ולכן אין פירוק פשוט.') : 'אין גורם משותף.');
      ansS = 'לא מתפרק';
    }
    sheet(lines, finalBox(ansS), 'sq', true);
    return ansS;
  }
  // נקרא מ-commit: אם יש x / y / = מטפלים כאן ומחזירים true
  function trySolve(src, byVoice) {
    var said = hasHe(src) ? src : null, e = said ? heToExpr(src) : src;
    e = e.replace(/=\s*$/, '').trim();
    var vs = varsIn(e), hasEq = e.indexOf('=') >= 0;
    if (!vs.x && !vs.y && !hasEq) return false;
    var parts = e.split(/\s*[,;]\s*(?![^()]*\))/).filter(Boolean), ansS, shownE;
    if (!vs.x && !vs.y) {
      if (parts.length > 1 || e.split('=').length !== 2) throw new Err('לא הבנתי את התרגיל');
      var pr0 = e.split('='), A0 = side(pr0[0]), B0 = side(pr0[1]), va = A0.f(0), vb = B0.f(0);
      var okEq = near(va, vb);
      sheet([L(esc(show(A0.tree, st.ang)) + ' = ' + fS(va)), L(esc(show(B0.tree, st.ang)) + ' = ' + fS(vb))], finalBox(okEq ? '✓ נכון' : '✗ לא שווה'), null, false);
      ansS = okEq ? '✓ נכון, שני הצדדים שווים' : '✗ לא שווה: ' + fS(va) + ' ≠ ' + fS(vb);
      shownE = show(A0.tree, st.ang) + ' = ' + show(B0.tree, st.ang);
    } else if (vs.x && vs.y) {
      if (parts.length !== 2 || parts.some(function (p) { return p.split('=').length !== 2; })) throw new Err('עם x ו-y צריך שתי משוואות, עם פסיק ביניהן. למשל: 2x + 3y = 12, x − y = 1');
      ansS = solveSys(parts[0], parts[1]);
      shownE = parts.map(function (p) { var q = p.split('='); return show(side(q[0]).tree, st.ang) + ' = ' + show(side(q[1]).tree, st.ang); }).join(',  ');
      used('solve_sys_inline');
    } else {
      var v = vs.x ? 'x' : 'y';
      if (parts.length !== 1) throw new Err('עם נעלם אחד כותבים משוואה אחת');
      if (hasEq) {
        var pr = e.split('=');
        if (pr.length !== 2) throw new Err('צריך סימן = אחד');
        ansS = solveOne(pr[0], pr[1], v);
        shownE = show(side(pr[0]).tree, st.ang) + ' = ' + show(side(pr[1]).tree, st.ang);
        used('solve_inline');
      } else {
        ansS = factorExpr(e, v);
        shownE = show(side(e).tree, st.ang);
        used('factor_inline');
      }
    }
    inp.value = shownE;
    res.classList.remove('err', 'soft');
    res.textContent = ansS;
    extra.innerHTML = said ? '<span>' + (byVoice ? '🎤 שמעתי' : '✍️ הבנתי') + ': "' + esc(said) + '"</span>' : '';
    if (byVoice) { extra.insertAdjacentHTML('beforeend', '<span><button type="button" class="linkish" data-vfix>✏️ שמעתי לא נכון? לתקן ולזכור</button></span>'); speak(sayExpr(ansS.replace(/[₁₂]/g, ''))); }
    else if (st.big) speak(sayExpr(ansS.replace(/[₁₂]/g, '')));
    lastVal = null; lastTree = null; justEval = true;
    st.hist.unshift({ e: shownE, r: ansS, a: st.ang }); st.hist = st.hist.slice(0, 30); save(); hist();
    return true;
  }

  // ---------- התחלה ----------
  setAng(st.ang); hist(); guide(); memShow(); bigSet(!!st.big); lvSet(st.lv || 0);
  var h = location.hash.slice(1);
  tab(TABS.indexOf(h) >= 0 && !MINI ? h : 'calc');
  var q = location.search.match(/[?&]e=([^&]+)/);
  var qa = location.search.match(/[?&]a=(deg|rad)/); if (qa) setAng(qa[1]);
  if (q) { try { inp.value = decodeURIComponent(q[1].replace(/\+/g, ' ')); commit(); used('shared_open'); } catch (e) {} }
  if (/[?&]exam=1/.test(location.search)) examSet(true);
})();
