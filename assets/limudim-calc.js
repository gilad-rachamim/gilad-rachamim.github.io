// כלים ללימודים – מחשבון לבגרות (/limudim/machshevon/).
// מחשבון מדעי בעברית ללימוד בבית: מעלות/רדיאנים בולט, הסבר לכל מקש, פירוק החישוב, שבר ועיגול, היסטוריה, הקראה.
// ועוד: פותר משוואות עם שלבים, גרף ללמידה, מדריך "במחשבון שלכם" וטעויות נפוצות.
// ?mini=1 = רק המקשים (נפתח מתוך התרגול במתמטיקה). הכול נשמר רק בטלפון.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('cx-app')) return;
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
  function Err(msg) { this.msg = msg; }
  var FN = { sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, ln: 1, log: 1, sqrt: 1, cbrt: 1, abs: 1, exp: 1, logb: 2, root: 2, ncr: 2 };
  var NAMES = ['arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan', 'sqrt', 'cbrt', 'root', 'logb', 'log', 'ln', 'sin', 'cos', 'tan', 'abs', 'exp', 'ans', 'ncr', 'pi', 'c', 'e', 'x'];
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
        if (tk.v === 'x') return { t: 'var' };
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
      case 'var': if (env.x == null) throw new Err('יש כאן x. כדי לפתור עם x עוברים ללשונית "משוואות" או "גרף"'); return env.x;
      case 'par': return ev(n.a, env);
      case 'neg': return -ev(n.a, env);
      case 'fact':
        a = ev(n.a, env);
        if (a < 0 || a !== Math.round(a)) throw new Err('עצרת (!) רק למספר שלם וחיובי');
        if (a > 170) throw new Err('המספר גדול מדי לעצרת');
        v = fact(a); rec(env, n, v); return v;
      case 'op':
        a = ev(n.a, env); b = ev(n.b, env);
        if (n.op === '+') return clean(a + b);
        if (n.op === '-') return clean(a - b);
        if (n.op === '*') return clean(a * b);
        if (n.op === '/') { if (b === 0) throw new Err('אי אפשר לחלק ב-0'); return clean(a / b); }
        if (n.op === '^') {
          if (a < 0 && b !== Math.round(b)) {
            var q = 1 / b, qi = Math.round(q);
            if (Math.abs(q - qi) < 1e-9 && qi % 2) v = -Math.pow(-a, b);
            else throw new Err('אין חזקה כזאת למספר שלילי (במספרים ממשיים)');
          } else v = Math.pow(a, b);
          if (a === 0 && b < 0) throw new Err('אי אפשר לחלק ב-0 (0 בחזקה שלילית)');
          v = clean(v);
          if (!(n.b.t === 'num' && n.b.v === 2 && n.a.t === 'num')) rec(env, n, v);
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
  function rec(env, n, v) { if (env.rec && env.rec.length < 12) env.rec.push({ n: n, v: v }); }

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
      case 'var': return 'x';
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

  // =====================================================================
  //  תרגיל במילים (מדיבור או מהקלדה): "שורש של 16 ועוד שלוש כפול שתיים" ← sqrt 16 + 3 * 2
  // =====================================================================
  var HE_UNIT = { 'אפס': 0, 'אחת': 1, 'אחד': 1, 'שתיים': 2, 'שתים': 2, 'שניים': 2, 'שנים': 2, 'שתי': 2, 'שני': 2, 'שלוש': 3, 'שלושה': 3, 'שלושת': 3, 'שלש': 3,
    'ארבע': 4, 'ארבעה': 4, 'ארבעת': 4, 'חמש': 5, 'חמישה': 5, 'חמשה': 5, 'חמשת': 5, 'שש': 6, 'שישה': 6, 'ששה': 6, 'ששת': 6, 'שבע': 7, 'שבעה': 7, 'שבעת': 7,
    'שמונה': 8, 'שמונת': 8, 'תשע': 9, 'תשעה': 9, 'תשעת': 9 };
  var HE_TENS = { 'עשרים': 20, 'שלושים': 30, 'שלשים': 30, 'ארבעים': 40, 'חמישים': 50, 'שישים': 60, 'ששים': 60, 'שבעים': 70, 'שמונים': 80, 'תשעים': 90 };
  // צירופים של כמה מילים קודם, ואחר כך מילה בודדת
  var HE_PHRASE = [
    [['לוגריתם', 'טבעי'], 'ln'], [['לוג', 'טבעי'], 'ln'],
    [['סינוס', 'הפוך'], 'asin'], [['קוסינוס', 'הפוך'], 'acos'], [['טנגנס', 'הפוך'], 'atan'],
    [['ארק', 'סינוס'], 'asin'], [['ארק', 'קוסינוס'], 'acos'], [['ארק', 'טנגנס'], 'atan'],
    [['סינוס', 'מינוס', 'אחת'], 'asin'], [['קוסינוס', 'מינוס', 'אחת'], 'acos'], [['טנגנס', 'מינוס', 'אחת'], 'atan'],
    [['סינוס', 'מינוס', '1'], 'asin'], [['קוסינוס', 'מינוס', '1'], 'acos'], [['טנגנס', 'מינוס', '1'], 'atan'],
    [['פתח', 'סוגריים'], '('], [['פותחים', 'סוגריים'], '('], [['פותח', 'סוגריים'], '('], [['סוגר', 'פותח'], '('],
    [['סגור', 'סוגריים'], ')'], [['סוגרים', 'סוגריים'], ')'], [['סוגר', 'סוגריים'], ')'], [['סוף', 'סוגריים'], ')'], [['סוגר', 'סוגר'], ')'],
    [['לחלק', 'ב'], '/'], [['מחולק', 'ב'], '/'], [['חלקי', 'ב'], '/'],
    [['בחזקה', 'שלישית'], '^ 3'], [['בחזקה', 'שנייה'], '^ 2'], [['שורש', 'שלישי'], 'cbrt'], [['שורש', 'ריבועי'], 'sqrt'],
    [['אחוז', 'מ'], '/ 100 *'], [['אחוזים', 'מ'], '/ 100 *'], [['אחוז', 'של'], '/ 100 *'], [['אחוזים', 'של'], '/ 100 *']
  ];
  var HE_WORD = {
    'ועוד': '+', 'ו': '+', 'פלוס': '+', 'עוד': '+', 'פחות': '-', 'מינוס': '-', 'כפול': '*', 'כפל': '*', 'פעמים': '*', 'חלקי': '/', 'חלק': '/', 'לחלק': '/',
    'בחזקת': '^', 'בחזקה': '^', 'חזקה': '^', 'בריבוע': '^ 2', 'ריבוע': '^ 2', 'בשלישית': '^ 3', 'בעוקב': '^ 3',
    'שורש': 'sqrt', 'סינוס': 'sin', 'סין': 'sin', 'קוסינוס': 'cos', 'קוס': 'cos', 'טנגנס': 'tan', "טנג'נס": 'tan', 'טאנגנס': 'tan', 'טנגנט': 'tan', "טנג'נט": 'tan', 'טאן': 'tan',
    'לוג': 'log', 'לוגריתם': 'log', 'לן': 'ln', 'פאי': 'pi', 'פיי': 'pi', 'עצרת': '!', 'אחוז': '/ 100', 'אחוזים': '/ 100', 'סוגר': ')', 'התשובה': 'ans', 'אנס': 'ans'
  };
  var HE_SKIP = { 'של': 1, 'מעלות': 1, 'מעלה': 1, 'רדיאנים': 1, 'שווה': 1, 'שווים': 1, 'זה': 1, 'כמה': 1, 'את': 1, 'תחשב': 1, 'חשב': 1, 'תחשבי': 1, 'בבקשה': 1, 'ה': 1, 'ב': 1, 'מ': 1, 'יוצא': 1, 'הקודמת': 1, 'מה': 1, 'אז': 1 };
  function heToExpr(text) {
    var s = String(text).replace(/[״"׳]/g, function (c) { return c === '׳' ? "'" : ''; }).replace(/[?!,،]+(?=\s|$)/g, ' ').replace(/(\d),(\d{3})/g, '$1$2')
      .replace(/([א-ת])-(?=\d)/g, '$1 ').replace(/^([ומבלהש])(?=\d)|\s([ומבלהש])(?=\d)/g, ' $1$2 ')
      .replace(/([+\-*/×÷^()=%])/g, ' $1 ');
    var w = s.split(/\s+/).filter(Boolean), out = [], i = 0, num = null, total = 0, open = 0;
    function flush() { if (num !== null) { out.push(String(total + num)); num = null; total = 0; } }
    function addNum(v) { if (num === null) { num = 0; total = 0; } num += v; }
    function emit(t) { flush(); out.push(t); }
    while (i < w.length) {
      var x = w[i], hit = null;
      for (var p = 0; p < HE_PHRASE.length && !hit; p++) {
        var ph = HE_PHRASE[p][0], ok = true;
        for (var q = 0; q < ph.length; q++) if (w[i + q] !== ph[q]) { ok = false; break; }
        if (ok) hit = HE_PHRASE[p];
      }
      if (hit) { emit(hit[1]); if (hit[1] === '(') open++; if (hit[1] === ')') open--; i += hit[0].length; continue; }
      if (/^\d+(\.\d+)?$/.test(x)) { flush(); out.push(x); i++; continue; }
      if (/^[+\-*/×÷^()%]$/.test(x)) { emit(x === '%' ? '/ 100' : x); if (x === '(') open++; if (x === ')') open--; i++; continue; }
      if (x === '=') { i++; continue; }
      // "ושלוש", "וחצי": ו בתחילת מילה של מספר
      var y = x.length > 1 && x[0] === 'ו' && (HE_UNIT[x.slice(1)] != null || HE_TENS[x.slice(1)] != null || /^(חצי|רבע|מאה|מאתיים|אלף|אלפיים|עשר|עשרה)$/.test(x.slice(1))) ? x.slice(1) : x;
      if (HE_UNIT[y] != null) { addNum(HE_UNIT[y]); i++; continue; }
      if (HE_TENS[y] != null) { addNum(HE_TENS[y]); i++; continue; }
      if (y === 'עשר' || y === 'עשרה') { addNum(10); i++; continue; } // "שלוש עשרה" = 3 + 10
      if (y === 'מאה') { addNum(100); i++; continue; }
      if (y === 'מאתיים') { addNum(200); i++; continue; }
      if (y === 'מאות') { if (num === null) num = 1; num *= 100; i++; continue; }
      if (y === 'אלף' || y === 'אלפים') { if (num === null || num === 0) num = 1; total += num * 1000; num = 0; i++; continue; }
      if (y === 'אלפיים') { if (num === null) num = 0; total += 2000; i++; continue; }
      if (y === 'חצי') { if (num === null) { emit('0.5'); } else addNum(0.5); i++; continue; }
      if (y === 'רבע') { if (num === null) { emit('0.25'); } else addNum(0.25); i++; continue; }
      if (x === 'נקודה') {
        // ספרות אחרי הנקודה: "שתיים נקודה חמש" = 2.5
        var whole = num !== null ? total + num : 0, dec = '';
        num = null; total = 0; i++;
        while (i < w.length) {
          var d = w[i];
          if (/^\d+$/.test(d)) dec += d; else if (HE_UNIT[d] != null) dec += HE_UNIT[d]; else break;
          i++;
        }
        if (!dec) throw new Err('אחרי "נקודה" צריך ספרות');
        out.push(whole + '.' + dec); continue;
      }
      if (x === 'סוגריים') { if (open > 0 && out.length && !/^[+\-*/^(]$/.test(out[out.length - 1]) && num === null) { emit(')'); open--; } else { emit('('); open++; } i++; continue; }
      if (HE_WORD[x] != null) { emit(HE_WORD[x]); i++; continue; }
      if (HE_SKIP[x]) { i++; continue; }
      if (/^[a-zA-Z]+$/.test(x) || x === 'π' || x === '√') { emit(x); i++; continue; }
      throw new Err('לא הבנתי את המילה "' + x + '". אפשר לתקן בכתב.');
    }
    flush();
    var e = out.join(' ').trim().replace(/\/ 100 (?=[\d(a-z])/g, '/ 100 * '); // "20 אחוז מ-50"
    if (!e) throw new Err('לא שמעתי תרגיל. נסו שוב, למשל: "שורש של 16 ועוד 3"');
    return e;
  }
  function hasHe(s) { return /[א-ת]/.test(s); }

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
    var src = inp.value.trim();
    if (!src) return;
    res.classList.remove('soft');
    try {
      var r = compute(src), said = hasHe(src) ? src : null;
      if (said) { src = show(r.tree, st.ang); inp.value = src; }
      ans = r.v; st.ans = ans; lastTree = r.tree; lastVal = r.v;
      var deg = isAngleOut(r.tree) ? '°' : '';
      res.classList.remove('err');
      res.textContent = '= ' + fmtN(r.v) + deg;
      var ex = [], fr = toFrac(r.v), fx = fixed(r.v);
      if (fr) ex.push('<span>כשבר: <b dir="ltr">' + (fr[0] < 0 ? '−' : '') + Math.abs(fr[0]) + '/' + fr[1] + '</b></span>');
      if (fx) ex.push('<span>מעוגל ל-' + (st.fix === 1 ? 'ספרה אחת' : st.fix + ' ספרות') + ': <b dir="ltr">' + fx + deg + '</b></span>');
      trigHints(r.tree).forEach(function (h) {
        ex.push(h === 'rad'
          ? '<span class="cx-alert">⚠️ המחשבון במצב <b>רדיאנים</b>. אם התכוונתם למעלות (כמו ברוב הבגרות), התשובה אחרת. <button type="button" class="linkish" data-setang="deg">לעבור למעלות</button></span>'
          : '<span class="cx-alert">⚠️ יש π בתוך זווית, וזה בדרך כלל ברדיאנים. המחשבון במצב <b>מעלות</b>. <button type="button" class="linkish" data-setang="rad">לעבור לרדיאנים</button></span>');
      });
      if (said) ex.unshift('<span>' + (byVoice ? '🎤 שמעתי' : '✍️ הבנתי') + ': "' + esc(said) + '"</span>');
      extra.innerHTML = ex.join('');
      if (byVoice) speak(sayExpr(src) + ' שווה ' + sayNum(r.v) + (deg ? ' מעלות' : ''));
      steps(r);
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
    }
  }
  function steps(r) {
    var box = $('cx-steps'), rows = r.rec.map(function (s) {
      var n = s.n, deg = n.t === 'fn' && /^a(sin|cos|tan)$/.test(n.f) && st.ang === 'deg' ? '°' : '';
      var w = words(n);
      return '<li><span dir="ltr">' + esc(show(n, st.ang)) + ' = ' + fmtN(s.v) + deg + '</span>' + (w ? ' <small>' + w + '</small>' : '') + '</li>';
    });
    var whole = show(r.tree, st.ang) + ' = ' + fmtN(r.v);
    if (r.rec.length && (r.rec.length > 1 || r.rec[0].n !== r.tree)) rows.push('<li class="all"><span dir="ltr">' + esc(whole) + (isAngleOut(r.tree) ? '°' : '') + '</span> <small>ואז כל התרגיל</small></li>');
    box.innerHTML = rows.join('');
    $('cx-steps-p').hidden = !rows.length || MINI;
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
    for (var i = 0; i < alts.length; i++) {
      try { compute(alts[i]); inp.value = alts[i]; justEval = false; commit(true); return; }
      catch (e) { if (!(e instanceof Err)) throw e; if (!firstErr) firstErr = e; }
    }
    inp.value = alts[0] || ''; justEval = false;
    res.classList.remove('soft'); res.classList.add('err');
    res.textContent = (firstErr && firstErr.msg) || 'לא הבנתי. נסו שוב';
    extra.innerHTML = '<span>🎤 שמעתי: "' + esc(alts[0] || '') + '". אפשר לתקן בכתב וללחוץ =</span>';
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
  var TABS = ['calc', 'solve', 'graph', 'guide', 'err'];
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

  // ---------- התחלה ----------
  setAng(st.ang); hist(); guide();
  var h = location.hash.slice(1);
  tab(TABS.indexOf(h) >= 0 && !MINI ? h : 'calc');
  var q = location.search.match(/[?&]e=([^&]+)/);
  if (q) { try { inp.value = decodeURIComponent(q[1]); preview(); } catch (e) {} }
})();
