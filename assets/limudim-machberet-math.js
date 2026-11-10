/* המחברת – מנוע הבדיקה (בלי בינה מלאכותית, בחינם, רץ בטלפון).
   קורא שורה בכתיב מחשבון (2x^2-3, sqrt(x), sin(30°), f(x)=..., f'(x)=..., x=2 או x=3),
   הופך אותה לעץ, מחשב אותה במספרים ומצייר אותה ב-LaTeX.
   הבדיקה: כל שלב מושווה לשלב הקודם במספרים – ביטוי מול ביטוי (שווים לכל x),
   משוואה מול משוואה (אותם פתרונות), נגזרת מול הפונקציה. מבוסס על tools/poter-worker/check.js. */
(function (root) {
  'use strict';

  // ---------------- פונקציות ----------------
  var FN1 = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, tg: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan, cot: function (x) { return 1 / Math.tan(x); },
    ln: Math.log, log: Math.log10, lg: Math.log10, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp
  };
  var DEG = { sin: 1, cos: 1, tan: 1, tg: 1, cot: 1 }, DEGI = { asin: 1, acos: 1, atan: 1, arcsin: 1, arccos: 1, arctan: 1 };
  var FN2 = { logb: 1, root: 1, ncr: 1 };
  function Err(m) { this.message = m; }

  // ---------------- ניקוי כתיב ----------------
  function clean(s) {
    return String(s == null ? '' : s)
      .replace(/[‎‏‪-‮]/g, '')
      .replace(/\\left|\\right|\\,|\\;|\\!/g, '')
      .replace(/\\cdot|\\times|·|×|∙|⋅/g, '*').replace(/÷|:(?=\s*[\d(a-z])/g, '/').replace(/[−–—]/g, '-').replace(/≈/g, '=').replace(/\+-|\+\/-/g, '±')
      .replace(/\\pi|π/g, 'pi').replace(/∛/g, 'cbrt').replace(/√/g, 'sqrt').replace(/²/g, '^2').replace(/³/g, '^3')
      .replace(/∠\s*([A-Z]{1,3})/g, 'ang_$1').replace(/∞/g, 'inf')
      .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)').replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
      .replace(/\\(sin|cos|tan|ln|log|exp|arcsin|arccos|arctan)/g, '$1')
      .replace(/\{/g, '(').replace(/\}/g, ')').replace(/\*\*/g, '^').replace(/[’ʹ′]/g, "'")
      .trim();
  }

  function tokenize(src) {
    var s = src, t = [], i = 0, m;
    while (i < s.length) {
      var ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '°') { t.push({ k: '°' }); i++; continue; }
      if ((m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)/))) { t.push({ k: 'n', v: parseFloat(m[1]), s: m[1] }); i += m[1].length; continue; }
      if ((m = s.slice(i).match(/^[A-Za-z_][A-Za-z_0-9]*/))) { pushId(t, m[0]); i += m[0].length; continue; }
      if ('+-*/^!(),|'.indexOf(ch) >= 0) { t.push({ k: ch }); i++; continue; }
      if (ch === '[') { t.push({ k: '(' }); i++; continue; }
      if (ch === ']') { t.push({ k: ')' }); i++; continue; }
      throw new Err('תו לא מוכר: ' + ch);
    }
    return t;
  }
  // xy -> x*y ; AB (קטע) נשאר שם אחד ; sinx -> sin x ; 2pi
  var KNOWN = ['arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan', 'sqrt', 'cbrt', 'logb', 'root', 'ncr', 'sin', 'cos', 'tan', 'cot', 'abs', 'exp', 'log', 'ln', 'lg', 'tg', 'pi', 'int', 'inf'];
  function pushId(t, w) {
    var lw = w.toLowerCase();
    if (KNOWN.indexOf(lw) >= 0 || /^ang_/.test(w) || /_/.test(w)) { t.push({ k: 'id', v: w }); return; }
    if (/^[A-Z]{2,3}$/.test(w)) { t.push({ k: 'id', v: w }); return; } // AB, ABC – שם של קטע
    if (w.length === 1) { t.push({ k: 'id', v: w }); return; }
    // פירוק: מילה שמתחילה בשם פונקציה (sinx, lnx, xsin...) או אותיות צמודות (xy, ab)
    var i = 0;
    while (i < w.length) {
      var hit = null;
      for (var k = 0; k < KNOWN.length; k++) if (w.substr(i, KNOWN[k].length).toLowerCase() === KNOWN[k]) { hit = KNOWN[k]; break; }
      if (hit) { t.push({ k: 'id', v: hit }); i += hit.length; continue; }
      if (/\d/.test(w[i])) { var d = w.slice(i).match(/^\d+/)[0]; t.push({ k: 'n', v: +d, s: d }); i += d.length; continue; }
      t.push({ k: 'id', v: w[i], imp: true }); i++;
    }
  }

  // ---------------- עץ ----------------
  // {t:'n',v} {t:'v',n} {t:'c',n} {t:'+'/'-'/'*'/'/',a,b,imp} {t:'neg',a} {t:'^',a,b} {t:'f',n,args} {t:'()',a} {t:'!',a} {t:'abs',a} {t:'deg',a}
  function parse(src) {
    var src2 = clean(src)
      .replace(/log_?(\d+(?:\.\d+)?)\s*\(/g, 'logb($1,')                                   // log_2(8), log2(8)
      .replace(/\b([a-zA-Z])('+)\s*\(/g, function (m, a, q) { return a + '_' + new Array(q.length + 1).join('d') + '('; }); // f'(2) -> f_d(2)
    var t = tokenize(src2), p = 0;
    if (!t.length) throw new Err('ריק');
    function peek() { return t[p] || { k: 'end' }; }
    function eat(k) { if (peek().k !== k) throw new Err('חסר ' + (k === ')' ? 'סוגר )' : k)); p++; }
    function startsAtom(tk) { return tk.k === 'n' || tk.k === 'id' || tk.k === '('; }
    function expr() {
      var a = term();
      while (peek().k === '+' || peek().k === '-') { var op = t[p++].k; a = { t: op, a: a, b: term() }; }
      return a;
    }
    function term() {
      var a = unary();
      for (;;) {
        var k = peek().k;
        if (k === '*' || k === '/') { p++; a = { t: k, a: a, b: unary() }; continue; }
        if (startsAtom(peek())) { a = { t: '*', a: a, b: power(), imp: true }; continue; }
        return a;
      }
    }
    function unary() {
      if (peek().k === '-') { p++; return { t: 'neg', a: unary() }; }
      if (peek().k === '+') { p++; return unary(); }
      return power();
    }
    function power() {
      var b = postfix();
      if (peek().k === '^') { p++; return { t: '^', a: b, b: unary() }; }
      return b;
    }
    function postfix() {
      var a = atom();
      for (;;) {
        if (peek().k === '!') { p++; a = { t: '!', a: a }; continue; }
        if (peek().k === '°') { p++; a = { t: 'deg', a: a }; continue; }
        return a;
      }
    }
    function atom() {
      var tk = t[p++];
      if (!tk) throw new Err('השורה נגמרה באמצע');
      if (tk.k === 'n') return { t: 'n', v: tk.v, s: tk.s };
      if (tk.k === '(') { var a = expr(); eat(')'); return { t: '()', a: a }; }
      if (tk.k === '|') { var b = expr(); eat('|'); return { t: 'abs', a: b }; }
      if (tk.k === 'id') {
        var name = tk.v, ln = name.toLowerCase();
        if (ln === 'pi') return { t: 'c', n: 'pi' };
        if (ln === 'inf') return { t: 'c', n: 'inf' };
        if (name === 'e' && peek().k !== '(') return { t: 'c', n: 'e' };
        if (ln === 'int') {
          eat('('); var f = expr(); eat(','); var lo = expr(); eat(','); var hi = expr(); eat(')');
          return { t: 'f', n: 'int', args: [f, lo, hi] };
        }
        if (FN1[ln] || FN2[ln]) {
          var args = [];
          if (peek().k === '(') {
            p++; args.push(expr());
            while (peek().k === ',') { p++; args.push(expr()); }
            eat(')');
          } else if (FN1[ln]) {
            if (peek().k === '^') { p++; var ex = unary(); var inner = power(); return { t: '^', a: { t: 'f', n: ln, args: [inner], bare: true }, b: ex, fpow: true }; }
            args.push(power());
            return { t: 'f', n: ln, args: args, bare: true };
          } else throw new Err('חסרים סוגריים אחרי ' + name);
          if (FN2[ln] && args.length !== 2) throw new Err(name + ' צריך שני מספרים');
          if (ln === 'log' && args.length === 2) return { t: 'f', n: 'logb', args: args };
          if (FN1[ln] && args.length !== 1) throw new Err(name + ' צריך מספר אחד');
          return { t: 'f', n: ln, args: args };
        }
        return { t: 'v', n: name };
      }
      throw new Err('לא צפוי כאן: ' + tk.k);
    }
    var out = expr();
    if (p < t.length) throw new Err(t[p].k === ')' ? 'יש סוגר ) מיותר' : 'משהו לא ברור בסוף השורה');
    return out;
  }

  // ---------------- חישוב ----------------
  function fact(n) { if (n < 0 || n !== Math.floor(n) || n > 170) return NaN; var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; }
  function ncr(n, k) { if (k < 0 || k > n) return 0; var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
  function pw(b, x) {
    if (b < 0 && Math.abs(x - Math.round(x)) > 1e-12) { var inv = 1 / x, n = Math.round(inv); if (Math.abs(inv - n) < 1e-9 && n % 2 !== 0) return -Math.pow(-b, x); }
    return Math.pow(b, x);
  }
  function ev(n, e) {
    switch (n.t) {
      case 'n': return n.v;
      case 'c': return n.n === 'pi' ? Math.PI : n.n === 'e' ? Math.E : Infinity;
      case 'v':
        if (Object.prototype.hasOwnProperty.call(e, n.n)) return e[n.n];
        throw new Err('לא ידוע: ' + n.n);
      case '+': return ev(n.a, e) + ev(n.b, e);
      case '-': return ev(n.a, e) - ev(n.b, e);
      case '*': return ev(n.a, e) * ev(n.b, e);
      case '/': return ev(n.a, e) / ev(n.b, e);
      case '^': return pw(ev(n.a, e), ev(n.b, e));
      case 'neg': return -ev(n.a, e);
      case '()': return ev(n.a, e);
      case 'abs': return Math.abs(ev(n.a, e));
      case '!': return fact(ev(n.a, e));
      case 'deg': return e.$deg ? ev(n.a, e) : ev(n.a, e) * Math.PI / 180;
      case 'f':
        if (n.n === 'int') {
          var a = ev(n.args[1], e), b = ev(n.args[2], e), N = 600, h = (b - a) / N, s = 0;
          var g = function (x) { var o = {}; for (var k in e) o[k] = e[k]; o.x = x; return ev(n.args[0], o); };
          s = g(a) + g(b); for (var i = 1; i < N; i++) s += g(a + i * h) * (i % 2 ? 4 : 2);
          return s * h / 3;
        }
        if (n.n === 'logb') return Math.log(ev(n.args[1], e)) / Math.log(ev(n.args[0], e));
        if (n.n === 'root') { var rn = ev(n.args[0], e), rx = ev(n.args[1], e); return rx < 0 && rn % 2 === 1 ? -Math.pow(-rx, 1 / rn) : Math.pow(rx, 1 / rn); }
        if (n.n === 'ncr') return ncr(ev(n.args[0], e), ev(n.args[1], e));
        var v = ev(n.args[0], e), f = FN1[n.n];
        if (e.$deg && DEG[n.n]) return f(v * Math.PI / 180);
        if (e.$deg && DEGI[n.n]) return f(v) * 180 / Math.PI;
        return f(v);
    }
    throw new Err('?');
  }
  function vars(n, out) {
    out = out || {};
    if (!n) return out;
    if (n.t === 'v') out[n.n] = 1;
    if (n.t === 'f' && n.n === 'int') { vars(n.args[1], out); vars(n.args[2], out); var inner = vars(n.args[0], {}); for (var k in inner) if (k !== 'x') out[k] = 1; return out; }
    if (n.a) vars(n.a, out); if (n.b) vars(n.b, out);
    if (n.args) n.args.forEach(function (x) { vars(x, out); });
    return out;
  }
  function has(n, pred) {
    if (!n) return false;
    if (pred(n)) return true;
    return has(n.a, pred) || has(n.b, pred) || (n.args || []).some(function (x) { return has(x, pred); });
  }

  // ---------------- LaTeX ----------------
  var TEXFN = { sin: '\\sin', cos: '\\cos', tan: '\\tan', tg: '\\tan', cot: '\\cot', ln: '\\ln', log: '\\log', lg: '\\lg', exp: '\\exp',
    asin: '\\sin^{-1}', acos: '\\cos^{-1}', atan: '\\tan^{-1}', arcsin: '\\arcsin', arccos: '\\arccos', arctan: '\\arctan' };
  function strip(n) { return n.t === '()' ? n.a : n; }
  function varTex(name) {
    if (/^ang_/.test(name)) return '\\angle ' + name.slice(4);
    if (/^[A-Z]{2,3}$/.test(name)) return name;
    if (name.length > 1) return '\\mathrm{' + name.replace(/_/g, '\\_') + '}';
    return name;
  }
  function tex(n) {
    switch (n.t) {
      case 'n': return n.s || String(n.v);
      case 'c': return n.n === 'pi' ? '\\pi' : n.n === 'e' ? 'e' : '\\infty';
      case 'v': return varTex(n.n);
      case '+': return tex(n.a) + '+' + tex(n.b);
      case '-': return tex(n.a) + '-' + tex(n.b);
      case '*':
        if (n.imp && !(n.b.t === 'n' || (n.b.t === '^' && n.b.a.t === 'n'))) return tex(n.a) + (n.b.t === 'f' && n.a.t !== 'n' ? '\\,' : '') + tex(n.b);
        return tex(n.a) + '\\cdot ' + tex(n.b);
      case '/': return '\\frac{' + tex(strip(n.a)) + '}{' + tex(strip(n.b)) + '}';
      case '^':
        if (n.fpow) return TEXFN[n.a.n] + '^{' + tex(strip(n.b)) + '}' + argTex(n.a.args[0], n.a.bare);
        var base = n.a, bt = tex(base);
        if (/^[+\-*/^]$|^neg$/.test(base.t) || (base.t === 'f' && base.n !== 'sqrt' && base.n !== 'root')) bt = '\\left(' + bt + '\\right)';
        return '{' + bt + '}^{' + tex(strip(n.b)) + '}';
      case 'neg': return '-' + tex(n.a);
      case '()': return '\\left(' + tex(n.a) + '\\right)';
      case 'abs': return '\\left|' + tex(n.a) + '\\right|';
      case '!': return tex(n.a) + '!';
      case 'deg': return tex(n.a) + '^{\\circ}';
      case 'f':
        if (n.n === 'sqrt') return '\\sqrt{' + tex(strip(n.args[0])) + '}';
        if (n.n === 'cbrt') return '\\sqrt[3]{' + tex(strip(n.args[0])) + '}';
        if (n.n === 'abs') return '\\left|' + tex(strip(n.args[0])) + '\\right|';
        if (n.n === 'root') return '\\sqrt[' + tex(strip(n.args[0])) + ']{' + tex(strip(n.args[1])) + '}';
        if (n.n === 'logb') return '\\log_{' + tex(strip(n.args[0])) + '}' + argTex(n.args[1]);
        if (n.n === 'ncr') return '\\binom{' + tex(n.args[0]) + '}{' + tex(n.args[1]) + '}';
        if (n.n === 'int') return '\\int_{' + tex(strip(n.args[1])) + '}^{' + tex(strip(n.args[2])) + '}' + tex(strip(n.args[0])) + '\\,dx';
        return TEXFN[n.n] + argTex(n.args[0], n.bare);
    }
    return '';
  }
  function argTex(a, bare) {
    var s = tex(strip(a));
    return bare && /^(n|v|c|deg)$/.test(a.t) ? '{' + s + '}' : '\\left(' + s + '\\right)';
  }

  // ---------------- קריאת שורה ----------------
  // kind: text | expr | eq | chain | sol | def | deriv | ineq | empty | bad
  var REL = /≤|≥|<=|>=|<|>|≠|!=/;
  function relTex(s) { return s.replace(/<=|≤/g, '\\le ').replace(/>=|≥/g, '\\ge ').replace(/!=|≠/g, '\\ne '); }
  function readLine(raw, opt) {
    opt = opt || {};
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return { kind: 'empty' };
    if (/[א-ת]/.test(s.replace(/\s(או|וגם)\s/g, ' ')) ) return { kind: 'text', text: s };
    s = clean(s);
    var deg = opt.deg || /°/.test(s);
    try {
      // פתרונות: x=2 או x=-3 / x=2, x=3 / x1=2 ; x2=3
      // גם x=±3, x=(5±1)/2, x=2,-3, ופתרון כללי עם k: x=30°+360°k או x=150°+360°k
      var sol = readSol(s);
      if (sol) { sol.deg = deg; return sol; }
      var ors = s.split(/\s+או\s+|\s*∨\s*/);
      if (ors.length > 1 && ors.every(function (q) { return q.split('=').length === 2 && !REL.test(q); })) {
        var prod = null, txs = [];
        ors.forEach(function (q) {
          var lr = q.split('='), L = parse(lr[0]), R = parse(lr[1]);
          var f = { t: '()', a: { t: '-', a: L, b: { t: '()', a: R } } };
          prod = prod ? { t: '*', a: prod, b: f } : f; txs.push(tex(L) + '=' + tex(R));
        });
        return { kind: 'eq', L: prod, R: { t: 'n', v: 0, s: '0' }, deg: deg, tex: txs.join('\\quad\\text{או}\\quad ') };
      }
      if (REL.test(s)) {
        var bits = s.split(/(≤|≥|<=|>=|<|>|≠|!=)/), tx = '';
        for (var b = 0; b < bits.length; b++) tx += b % 2 ? relTex(bits[b]) : tex(parse(bits[b]));
        return { kind: 'ineq', tex: tx };
      }
      var m;
      if ((m = s.match(/^([a-zA-Z])\s*('+)\s*\(\s*([a-z])\s*\)\s*=(.+)$/)) || (m = s.match(/^(y)\s*('+)()\s*=(.+)$/))) {
        var d = parse(m[4]);
        return { kind: 'deriv', name: m[1], order: m[2].length, v: m[3] || 'x', ast: d, deg: deg, tex: m[1] + m[2].replace(/'/g, "'") + (m[3] ? '(' + m[3] + ')' : '') + '=' + tex(d) };
      }
      if ((m = s.match(/^([a-zA-Z])\s*\(\s*([a-z])\s*\)\s*=([^=]+)$/))) {
        var f = parse(m[3]);
        return { kind: 'def', name: m[1], v: m[2], ast: f, deg: deg, tex: m[1] + '(' + m[2] + ')=' + tex(f) };
      }
      var cont = /^=/.test(s);
      var parts = s.replace(/^=/, '').split('=');
      var asts = parts.map(function (q) { if (!q.trim()) throw new Err('חסר צד במשוואה'); return parse(q); });
      var tx2 = (cont ? '=' : '') + asts.map(tex).join('=');
      if (asts.length === 1) return cont ? { kind: 'chain', parts: asts, cont: true, deg: deg, tex: tx2 } : { kind: 'expr', ast: asts[0], deg: deg, tex: tx2 };
      if (asts.length === 2 && !cont) return { kind: 'eq', L: asts[0], R: asts[1], deg: deg, tex: tx2 };
      return { kind: 'chain', parts: asts, cont: cont, deg: deg, tex: tx2 };
    } catch (e) {
      return { kind: 'bad', msg: e && e.message ? e.message : 'לא הצלחתי לקרוא את השורה' };
    }
  }

  function readSol(s) {
    var parts = s.split(/\s+או\s+|\s*(?:∨|;|,(?![^()]*\)))\s*/), v0 = null, vals = [], hasK = false, lhss = [], general = false;
    for (var i = 0; i < parts.length; i++) {
      var q = parts[i].trim(), mm = q.match(/^([a-zA-Z])(?:_?[12])?\s*=([^=]+)$/), rhs, lhs = null;
      if (mm) { if (v0 && v0 !== mm[1]) return null; v0 = mm[1]; rhs = mm[2]; }
      else if (i > 0 && v0 && q && q.indexOf('=') < 0) rhs = q;
      else {
        var me = q.match(/^([^=]+)=([^=]+)$/); if (!me || !/±|k/.test(q)) return null;
        try { lhs = parse(me[1]); } catch (e) { return null; }
        var lv = Object.keys(vars(lhs)); if (lv.length !== 1 || lv[0] === 'k' || (v0 && v0 !== lv[0])) return null;
        v0 = lv[0]; rhs = me[2]; general = true;
      }
      var alts = rhs.indexOf('±') >= 0 ? [rhs.replace('±', '+'), rhs.replace('±', '-')] : [rhs];
      for (var a = 0; a < alts.length; a++) {
        var ast; try { ast = parse(alts[a]); } catch (e) { return null; }
        var vs = Object.keys(vars(ast));
        if (vs.some(function (z) { return z !== 'k'; })) return null;
        if (vs.length) hasK = true;
        vals.push(ast); lhss.push(lhs);
      }
    }
    if (!v0 || !vals.length || v0 === 'k') return null;
    var L0 = function (j) { return lhss[j] || { t: 'v', n: v0 }; };
    return { kind: 'sol', v: v0, vals: vals, lhs: general ? vals.map(function (a, j) { return L0(j); }) : null, param: hasK ? 'k' : null,
      tex: vals.map(function (a, k) { return (general ? tex(L0(k)) : v0 + (vals.length > 1 ? '_{' + (k + 1) + '}' : '')) + '=' + tex(a); }).join(',\\quad ') };
  }

  // ---------------- השוואות במספרים ----------------
  var PTS = [1, 2, -1, 3, 0.5, -2, 1.7, -0.6, 2.9, 0.23, -3.4, 4.1];
  function env(base, extra) { var o = {}, k; for (k in base) o[k] = base[k]; for (k in extra) o[k] = extra[k]; return o; }
  function close(a, b, tol) { if (!isFinite(a) || !isFinite(b)) return false; return Math.abs(a - b) <= (tol || 1e-7) * Math.max(1, Math.abs(a), Math.abs(b)); }
  function assignments(names, deg, count) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var o = { $deg: !!deg };
      names.forEach(function (n, j) {
        var x = PTS[(i + 3 * j) % PTS.length];
        if (deg) x = x * 17 + 7; // מעלות: 24°, 41°...
        if (i >= PTS.length) x = (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453 % 1) * 6 - 3;
        o[n] = x;
      });
      out.push(o);
    }
    return out;
  }
  function namesOf() { var all = {}; for (var i = 0; i < arguments.length; i++) vars(arguments[i], all); return Object.keys(all).sort(); }
  function safe(fn) { try { var v = fn(); return typeof v === 'number' ? v : NaN; } catch (e) { if (e instanceof Err) throw e; return NaN; } }

  // שני ביטויים שווים לכל ערך? מחזיר {ok, at, a, b} או {skip}
  function sameExpr0(A, B, deg) {
    var names = namesOf(A, B), ok = 0, bad = null;
    var envs = names.length ? assignments(names, deg, 24) : [{ $deg: !!deg }];
    for (var i = 0; i < envs.length; i++) {
      var a = safe(function () { return ev(A, envs[i]); }), b = safe(function () { return ev(B, envs[i]); });
      if (!isFinite(a) || !isFinite(b) || Math.abs(a) > 1e9) continue;
      if (close(a, b, 1e-7)) ok++; else if (!bad) bad = { at: envs[i], a: a, b: b };
      if (!names.length) break;
    }
    if (bad) return { ok: false, at: bad.at, a: bad.a, b: bad.b, names: names };
    if (!ok) return { skip: true };
    if (names.length && ok < 3) return { skip: true };
    return { ok: true };
  }

  // שורשים של g(v) בטווח (סריקה + חציה). מחזיר מערך ממוין (עד 60).
  function roots(g, deg) {
    var R = [], grids = deg ? [[-720, 720, 0.25]] : [[-12, 12, 0.004], [-400, 400, 0.13]];
    function add(x) {
      for (var k = 0; k < R.length; k++) if (Math.abs(R[k] - x) <= 1e-6 * Math.max(1, Math.abs(x))) return;
      R.push(x);
    }
    grids.forEach(function (gr) {
      var lo = gr[0], hi = gr[1], st = gr[2], px = lo, pv = g(lo), ppx = null, ppv = NaN;
      for (var x = lo + st; x <= hi + 1e-9 && R.length < 80; x += st) {
        var v = g(x);
        if (isFinite(v) && isFinite(pv)) {
          if (v === 0) add(x);
          else if ((v < 0) !== (pv < 0) && pv !== 0) {
            var a = px, b = x, fa = pv;
            for (var it = 0; it < 70; it++) { var m = (a + b) / 2, fm = g(m); if (!isFinite(fm)) break; if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m; }
            var r = (a + b) / 2, fr = g(r);
            if (isFinite(fr) && Math.abs(fr) < 1e-6 * Math.max(1, Math.abs(pv), Math.abs(v))) add(r);
          } else if (ppx !== null && isFinite(ppv) && Math.abs(pv) <= Math.abs(ppv) && Math.abs(pv) < Math.abs(v)) {
            // מינימום של |g| – שורש כפול שלא מחליף סימן, כמו (x-2)^2
            var a2 = ppx, b2 = x, gr2 = 0.381966;
            for (var j = 0; j < 80; j++) {
              var c = a2 + gr2 * (b2 - a2), d = b2 - gr2 * (b2 - a2);
              if (Math.abs(g(c)) < Math.abs(g(d))) b2 = d; else a2 = c;
            }
            var r2 = (a2 + b2) / 2, f2 = g(r2);
            if (isFinite(f2) && Math.abs(f2) < 1e-9) add(r2);
          }
        }
        ppx = px; ppv = pv; px = x; pv = v;
      }
    });
    return R.sort(function (a, b) { return a - b; });
  }
  function inSet(x, S) { for (var i = 0; i < S.length; i++) if (Math.abs(S[i] - x) <= 1e-5 * Math.max(1, Math.abs(x))) return true; return false; }
  function within(S, deg) { return S.filter(function (x) { return deg ? Math.abs(x) <= 700 : Math.abs(x) <= 390; }); }

  // שתי משוואות (g1=0, g2=0) – אותם פתרונות?
  var MEMO = {}, MEMO_N = 0;
  function memo(name, fn) {
    return function () {
      var key; try { key = name + JSON.stringify(Array.prototype.slice.call(arguments)); } catch (e) { return fn.apply(null, arguments); }
      if (Object.prototype.hasOwnProperty.call(MEMO, key)) return MEMO[key];
      if (++MEMO_N > 800) { MEMO = {}; MEMO_N = 0; }
      return (MEMO[key] = fn.apply(null, arguments));
    };
  }
  function isTrig(n) { return (n.t === 'f' && /^(sin|cos|tan|tg|cot|asin|acos|atan|arc)/.test(n.n)) || n.t === 'deg'; }
  function sameEq0(g1, g2, deg) {
    var names = namesOf(g1, g2);
    if (deg && !has(g1, isTrig) && !has(g2, isTrig)) deg = false; // מעלות משנות רק כשיש sin/cos
    if (!names.length) {
      var a = safe(function () { return ev(g1, { $deg: deg }); }), b = safe(function () { return ev(g2, { $deg: deg }); });
      return { ok: (Math.abs(a) < 1e-9) === (Math.abs(b) < 1e-9), truth: Math.abs(b) < 1e-9 };
    }
    // 1) פרופורציה: g2 = k·g1 (כפל/חילוק של שני האגפים במספר, העברת אגפים)
    var envs = assignments(names, deg, 16), k = null, prop = true, n = 0;
    for (var i = 0; i < envs.length && prop; i++) {
      var p = safe(function () { return ev(g1, envs[i]); }), q = safe(function () { return ev(g2, envs[i]); });
      if (!isFinite(p) || !isFinite(q) || Math.abs(p) < 1e-9 || Math.abs(p) > 1e9) continue;
      var r = q / p; n++;
      if (k === null) k = r; else if (!close(k, r, 1e-7)) prop = false;
    }
    if (prop && n >= 4 && k !== 0 && isFinite(k)) return { ok: true };
    // 2) משווים את קבוצת הפתרונות לפי משתנה אחד (x אם יש), בכמה הצבות של השאר
    var v = names.indexOf('x') >= 0 ? 'x' : names[names.length - 1], rest = names.filter(function (z) { return z !== v; });
    var tries = rest.length ? assignments(rest, deg, 3) : [{ $deg: !!deg }];
    for (var t = 0; t < tries.length; t++) {
      var base = tries[t];
      var f1 = function (x) { var o = env(base, {}); o[v] = x; return safe(function () { return ev(g1, o); }); };
      var f2 = function (x) { var o = env(base, {}); o[v] = x; return safe(function () { return ev(g2, o); }); };
      var A = within(roots(f1, deg), deg), B = within(roots(f2, deg), deg);
      if (isLen(v)) { A = A.filter(function (x) { return x > 0; }); B = B.filter(function (x) { return x > 0; }); } // אורך וזווית – רק חיוביים
      var lost = A.filter(function (x) { return !inSet(x, B) && !(Math.abs(f2(x)) < 1e-7); });
      var added = B.filter(function (x) { return !inSet(x, A) && !(Math.abs(f1(x)) < 1e-7); });
      if (lost.length || added.length) return { ok: false, v: v, lost: lost.slice(0, 3), added: added.slice(0, 3), A: A, B: B };
      if (t === tries.length - 1) return { ok: true, v: v, A: A, B: B };
    }
    return { skip: true };
  }
  function eqFn(L, R) { return { t: '-', a: L, b: { t: '()', a: R } }; }
  function solFn(v, vals) { // (v-a)(v-b)... = 0
    var acc = null;
    vals.forEach(function (a) { var f = { t: '()', a: { t: '-', a: { t: 'v', n: v }, b: { t: '()', a: a } } }; acc = acc ? { t: '*', a: acc, b: f } : f; });
    return acc;
  }
  function deriv(F, v, deg) { // נגזרת מספרית כפונקציה
    return function (o) {
      var x = o[v], h = 1e-4 * Math.max(1, Math.abs(x));
      var at = function (d) { var e = env(o, {}); e[v] = x + d; return ev(F, e); };
      return (8 * (at(h) - at(-h)) - (at(2 * h) - at(-2 * h))) / (12 * h);
    };
  }
  function sameFn(fnA, B, names, deg, tol) { // fnA(env) מול ביטוי B
    var envs = assignments(names.length ? names : ['x'], deg, 20), ok = 0, bad = null;
    for (var i = 0; i < envs.length; i++) {
      var a = safe(function () { return fnA(envs[i]); }), b = safe(function () { return ev(B, envs[i]); });
      if (!isFinite(a) || !isFinite(b) || Math.abs(a) > 1e8) continue;
      if (close(a, b, tol || 1e-5)) ok++; else if (!bad) bad = { at: envs[i], a: a, b: b };
    }
    if (bad) return { ok: false, at: bad.at, a: bad.a, b: bad.b };
    return ok >= 3 ? { ok: true } : { skip: true };
  }

  // ---------------- בדיקת המחברת כולה ----------------
  // rows: [{text}] ; q: התרגיל (שורה 0). מחזיר לכל שורה {info, mark:'ok'|'warn'|'', msg}
  function nice(x) {
    if (!isFinite(x)) return String(x);
    var r = Math.round(x * 1000) / 1000;
    return String(r).replace('-', '−');
  }
  function atText(at) {
    if (!at) return '';
    var ks = Object.keys(at).filter(function (k) { return k[0] !== '$'; });
    return ks.map(function (k) { return k + '=' + nice(at[k]); }).join(', ');
  }
  function lastExpr(info) {
    if (!info) return null;
    if (info.kind === 'expr') return info.ast;
    if (info.kind === 'chain') return info.parts[info.parts.length - 1];
    if (info.kind === 'sol' && !info.param && info.vals.length === 1) return info.vals[0]; // S=20/2*(...) ואז =670
    return null;
  }
  function eqOf(info) {
    if (!info) return null;
    if (info.kind === 'eq') return eqFn(info.L, info.R);
    if (info.kind === 'sol' && !info.param) return solFn(info.v, info.vals);
    return null;
  }
  function tolOf(a) { // תשובה מעוגלת: 2.41 -> 0.0051
    var n = a.t === 'neg' ? a.a : a, m = n.t === 'n' && String(n.s || '').match(/\.(\d+)$/);
    return m ? 0.51 * Math.pow(10, -m[1].length) : 0;
  }
  function isLen(v) { return /^([A-Z]{2,3}|ang_)/.test(v); }
  // פתרונות שהתלמיד כתב מול משוואה G: כולם מקיימים, ואף פתרון לא חסר. כולל עיגול, ופתרון כללי עם k.
  function solCheck0(G, I, deg) {
    var names = namesOf(G);
    if (names.length !== 1 || names[0] !== I.v) return I.param ? { skip: true } : sameEq(G, solFn(I.v, I.vals), deg);
    if (deg && !has(G, isTrig)) deg = false;
    var v = I.v, f = function (x) { var o = { $deg: deg }; o[v] = x; return safe(function () { return ev(G, o); }); };
    var A = within(roots(f, deg), deg);
    if (isLen(v)) A = A.filter(function (x) { return x > 0; });
    var pts = []; // [ערך, סבולת]
    if (I.lhs) {
      var R2 = I.param ? (deg ? 720 : 12.6) : 1e9;
      if (I.param) A = A.filter(function (x) { return Math.abs(x) <= R2; });
      I.vals.forEach(function (a, j) {
        var L = I.lhs[j], Lf = function (x) { var o = { $deg: deg }; o[v] = x; return safe(function () { return ev(L, o); }); };
        var l0 = Lf(0), l1 = Lf(1), l2 = Lf(2), lin = isFinite(l0) && isFinite(l2) && Math.abs((l2 - l1) - (l1 - l0)) < 1e-9 && Math.abs(l1 - l0) > 1e-12;
        for (var k = I.param ? -12 : 0; k <= (I.param ? 12 : 0); k++) {
          var rv = safe(function () { return ev(a, { $deg: deg, k: k }); });
          if (!isFinite(rv)) continue;
          if (lin) { var xl = (rv - l0) / (l1 - l0); if (Math.abs(xl) <= R2) pts.push([xl, 1e-6 * Math.max(1, Math.abs(xl))]); continue; } // 2x=60+360k – בלי סריקה
          roots(function (x) { var o = { $deg: deg, k: k }; o[v] = x; return safe(function () { return ev(L, o); }) - rv; }, deg)
            .forEach(function (x) { if (Math.abs(x) <= R2) pts.push([x, 1e-6 * Math.max(1, Math.abs(x))]); });
        }
      });
    } else if (I.param) {
      var R = deg ? 720 : 12.6;
      A = A.filter(function (x) { return Math.abs(x) <= R; });
      I.vals.forEach(function (a) { for (var k = -12; k <= 12; k++) { var x = safe(function () { return ev(a, { $deg: deg, k: k }); }); if (isFinite(x) && Math.abs(x) <= R + 1e-9) pts.push([x, 1e-6 * Math.max(1, Math.abs(x)), k]); } });
    } else I.vals.forEach(function (a) { var x = safe(function () { return ev(a, { $deg: deg }); }); pts.push([x, Math.max(tolOf(a), 1e-6 * Math.max(1, Math.abs(x)))]); });
    var lost = A.filter(function (r) { return !pts.some(function (p) { return Math.abs(p[0] - r) <= p[1] + 1e-9; }); });
    var added = pts.filter(function (p) {
      if (!isFinite(p[0])) return true;
      if (A.some(function (r) { return Math.abs(p[0] - r) <= p[1] + 1e-9; })) return false;
      return !(Math.abs(f(p[0])) < 1e-7);
    }).map(function (p) { return p[0]; });
    if (lost.length || added.length) return { ok: false, v: v, lost: lost.slice(0, 3), added: added.slice(0, 3), A: A };
    return { ok: true, v: v };
  }
  // f(2), f'(1) בתוך שורה: מציבים את ההגדרה שכבר נכתבה
  function substVar(n, v, by) {
    if (!n || typeof n !== 'object') return n;
    if (n.t === 'v' && n.n === v) return { t: '()', a: by };
    var o = {}; for (var k in n) o[k] = n[k];
    if (n.a) o.a = substVar(n.a, v, by); if (n.b) o.b = substVar(n.b, v, by);
    if (n.args) o.args = n.args.map(function (x) { return substVar(x, v, by); });
    return o;
  }
  function applyDefs(n, defs) {
    if (!n || typeof n !== 'object') return n;
    if (n.t === '*' && n.imp && n.a.t === 'v' && n.b.t === '()') {
      var m = n.a.n.match(/^([a-zA-Z])(?:_(d+))?$/), key = m ? m[1] + (m[2] ? new Array(m[2].length + 1).join("'") : '') : null;
      if (key && defs[key]) return { t: '()', a: substVar(defs[key].ast, defs[key].v || 'x', applyDefs(n.b.a, defs)) };
    }
    var o = {}; for (var k in n) o[k] = n[k];
    if (n.a) o.a = applyDefs(n.a, defs); if (n.b) o.b = applyDefs(n.b, defs);
    if (n.args) o.args = n.args.map(function (x) { return applyDefs(x, defs); });
    return o;
  }

  function checkAll(lines, opt) {
    opt = opt || {};
    var deg0 = !!opt.deg && !(lines.some(function (l) { return /pi|π/.test(l); }) && !lines.some(function (l) { return /°/.test(l); })), infos = lines.map(function (l) { return readLine(l, { deg: deg0 }); });
    var res = [], prev = null, firstEq = null, defs = {};
    for (var i = 0; i < infos.length; i++) {
      var I = infos[i], deg = deg0 || !!I.deg, r = { info: I, mark: '', msg: '' };
      try {
        if (I.kind === 'def' || I.kind === 'deriv') deg = /°/.test(lines[i]); // חדו"א – תמיד ברדיאנים (אלא אם כתבו °)
        if (Object.keys(defs).length) {
          if (I.ast) I.ast = applyDefs(I.ast, defs);
          if (I.L) { I.L = applyDefs(I.L, defs); I.R = applyDefs(I.R, defs); }
          if (I.parts) I.parts = I.parts.map(function (x) { return applyDefs(x, defs); });
        }
        // f'(x)=0 – משוואה על הנגזרת שכבר נכתבה (לא נגזרת חדשה)
        var dk = I.kind === 'deriv' ? I.name + new Array(I.order + 1).join("'") : '';
        if (dk && defs[dk] && !namesOf(I.ast).length) { I = { kind: 'eq', L: defs[dk].ast, R: I.ast, tex: I.tex }; r.info = I; deg = deg0; }
        // y=... (בלי y בצד ימין) – מגדיר את y, כדי ש-y' ייבדק מולו
        if (I.kind === 'eq' && I.L.t === 'v' && I.L.n === 'y' && !vars(I.R).y && vars(I.R).x) defs.y = { ast: I.R, v: 'x', name: 'y' };
        if (I.kind === 'empty' || I.kind === 'text') { res.push(r); continue; }
        if (I.kind === 'bad') { r.mark = 'bad'; r.msg = I.msg; res.push(r); continue; }
        if (I.kind === 'ineq') { r.msg = 'אי-שוויון או תחום הגדרה: נשמר כהערה, והבדיקה ממשיכה מהשורה שלפניו.'; res.push(r); continue; } // תחום הגדרה באמצע – לא שובר את הרצף
        if (I.kind === 'def') {
          firstEq = null;
          var pd = defs[I.name];
          if (pd) {
            var c = sameExpr(pd.ast, I.ast, deg);
            mark(r, c, 'שווה להגדרה הקודמת של ' + I.name + '(x)', 'זו לא אותה פונקציה כמו קודם');
          }
          defs[I.name] = I;
          // F(x) אחרי f(x): פונקציה קדומה?
          var low = I.name.toLowerCase();
          if (!pd && I.name !== low && defs[low]) {
            var ff = defs[low], dF = deriv(I.ast, I.v, deg);
            var c2 = sameFn(dF, ff.ast, namesOf(I.ast, ff.ast), deg, 1e-4);
            if (c2.ok) { r.mark = 'ok'; r.msg = 'הנגזרת של ' + I.name + ' יוצאת ' + low + '. פונקציה קדומה נכונה.'; }
            else if (c2.ok === false) { r.mark = 'warn'; r.msg = 'אם ' + I.name + ' היא פונקציה קדומה של ' + low + ', הנגזרת שלה צריכה לצאת ' + low + '(x). כש-' + atText(c2.at) + ' יוצא ' + nice(c2.a) + ' במקום ' + nice(c2.b) + '.'; }
          }
          res.push(r); prev = I; continue;
        }
        if (I.kind === 'deriv') {
          var base = defs[I.name];
          if (I.order === 1 && base) {
            var dfn = deriv(base.ast, base.v, deg);
            var c3 = sameFn(dfn, I.ast, namesOf(base.ast, I.ast), deg, 1e-4);
            mark(r, c3, 'הנגזרת נכונה', 'הנגזרת לא יוצאת נכונה');
          } else if (prev && prev.kind === 'deriv' && prev.name === I.name && prev.order === I.order) {
            mark(r, sameExpr(prev.ast, I.ast, deg), 'שווה לשורה הקודמת', 'לא שווה לשורה הקודמת');
          } else if (I.order === 2 && defs[I.name + "'"]) {
            mark(r, sameFn(deriv(defs[I.name + "'"].ast, I.v, deg), I.ast, namesOf(I.ast), deg, 1e-3), 'הנגזרת השנייה נכונה', 'הנגזרת השנייה לא יוצאת נכונה');
          }
          if (I.order <= 2) defs[I.name + new Array(I.order + 1).join("'")] = I;
          res.push(r); prev = I; continue;
        }
        if (I.kind === 'chain') {
          var ps = I.parts, from = I.cont ? lastExpr(prev) : null;
          var seq = from ? [from].concat(ps) : ps, badAt = -1, cx = null;
          for (var k = 1; k < seq.length; k++) { var cc = sameExpr(seq[k - 1], seq[k], deg); if (cc.ok === false) { badAt = k; cx = cc; break; } }
          if (badAt > 0) { r.mark = 'warn'; r.msg = 'כדאי לבדוק כאן: ' + counter(cx, seq[badAt - 1], seq[badAt]); }
          else if (seq.length > 1) { r.mark = 'ok'; r.msg = 'שווה ' + (from ? 'לשורה הקודמת' : 'לאורך כל השורה'); }
          if (!from && !I.cont && seq.length === 2 && namesOf(seq[0], seq[1]).length && badAt < 0) r.msg = 'זהות: שני הצדדים שווים לכל ערך.';
          res.push(r); prev = I; continue;
        }
        if (I.kind === 'expr') {
          var pe = lastExpr(prev);
          if (pe) { var ce = sameExpr(pe, I.ast, deg); if (ce.ok === false) { r.mark = 'warn'; r.msg = 'כדאי לבדוק כאן: ' + counter(ce, pe, I.ast); } else if (ce.ok) { r.mark = 'ok'; r.msg = 'שווה לשורה הקודמת'; } }
          else if (!namesOf(I.ast).length) { var val = safe(function () { return ev(I.ast, { $deg: deg }); }); if (isFinite(val)) r.msg = '= ' + nice(val); }
          res.push(r); prev = I; continue;
        }
        if (I.kind === 'eq') {
          var g = eqFn(I.L, I.R), names = namesOf(g);
          // זהות (שני צדדים שווים תמיד) – כמו שרשרת
          if (names.length) {
            var id = sameExpr(I.L, I.R, deg);
            if (id.ok) {
              var pe2 = lastExpr(prev);
              if (pe2) { var ci = sameExpr(pe2, I.L, deg); mark(r, ci.ok === false ? ci : id, 'שווה לשורה הקודמת', 'הצד השמאלי לא שווה לשורה הקודמת'); }
              else { r.mark = 'ok'; r.msg = 'זהות: שני הצדדים שווים לכל ערך.'; }
              res.push(r); prev = { kind: 'chain', parts: [I.L, I.R] }; continue;
            }
          } else {
            var lv = safe(function () { return ev(I.L, { $deg: deg }); }), rv = safe(function () { return ev(I.R, { $deg: deg }); });
            if (close(lv, rv, 1e-6) || roundedOk(I.R, lv)) { r.mark = 'ok'; r.msg = 'החישוב נכון'; }
            else { r.mark = 'warn'; r.msg = 'כדאי לבדוק כאן: השמאל יוצא ' + nice(lv) + ' והימין ' + nice(rv) + '.'; }
            res.push(r); continue;
          }
          var pq = prev && prev.kind === 'sol' ? null : eqOf(prev);
          if (pq) eqMark(r, sameEq(pq, g, deg));
          else if (prev && prev.kind === 'deriv' && I.R.t === 'n' && I.R.v === 0) {
            var cd = sameExpr(prev.ast, I.L, false);
            if (cd.ok) { r.mark = 'ok'; r.msg = 'משווים את הנגזרת ל-0. נכון.'; }
            else if (cd.ok === false) { r.mark = 'warn'; r.msg = 'כדאי לבדוק כאן: זו לא הנגזרת מהשורה הקודמת.'; }
          }
          if (!pq && !(r.mark)) firstEq = g; // תחילת תרגיל חדש
          else if (!firstEq) firstEq = g;
          res.push(r); prev = I; continue;
        }
        if (I.kind === 'sol') {
          var pq2 = eqOf(prev) || (prev && prev.kind === 'sol' && prev.param ? firstEq : null), cmp = function (G) { return solCheck(G, I, deg); };
          if (pq2) eqMark(r, cmp(pq2), true);
          if (r.mark === 'warn' && firstEq && pq2 !== firstEq && cmp(firstEq).ok) { r.mark = 'ok'; r.msg = 'הגעתם לפתרון, והוא מתאים לתרגיל המקורי' + (I.param ? '' : ' (ופסלתם את הפתרון הזר, נכון)') + '. 🎉'; }
          else if (r.mark === 'ok' && firstEq && pq2 !== firstEq) {
            var fin = cmp(firstEq);
            if (fin.ok) r.msg = 'הגעתם לפתרון, והוא מתאים לתרגיל המקורי. 🎉';
            else if (fin.ok === false) {
              r.mark = 'warn';
              if (fin.added && fin.added.length && !(fin.lost && fin.lost.length)) r.msg = I.v + '≈' + fin.added.map(nice).join(', ') + ' לא מקיים את התרגיל המקורי. זה פתרון זר (קורה אחרי העלאה בריבוע), ולכן פוסלים אותו. כל השאר נכון.';
              else r.msg = 'השורה מתאימה לקודמת, אבל הפתרון לא מתאים לתרגיל המקורי. הטעות קרתה באחת השורות שלמעלה, כדאי לחפש את הסימן הצהוב.';
            }
          } else if (r.mark === 'ok') r.msg = 'הגעתם לפתרון, והוא מתאים לתרגיל. 🎉';
          res.push(r); prev = I; continue;
        }
      } catch (e) {
        r.mark = 'bad'; r.msg = e && e.message ? e.message : 'לא הצלחתי לבדוק';
      }
      res.push(r);
    }
    return res;
  }
  function roundedOk(Rast, v) {
    if (Rast.t !== 'n' && !(Rast.t === 'neg' && Rast.a.t === 'n')) return false;
    var s = Rast.t === 'n' ? Rast.s : Rast.a.s, m = String(s || '').match(/\.(\d+)$/);
    var want = Rast.t === 'n' ? Rast.v : -Rast.a.v;
    return !!m && Math.abs(v - want) <= 0.51 * Math.pow(10, -m[1].length) + 1e-12;
  }
  function mark(r, c, okMsg, badMsg) {
    if (c.ok) { r.mark = 'ok'; r.msg = okMsg; }
    else if (c.ok === false) { r.mark = 'warn'; r.msg = 'כדאי לבדוק כאן: ' + badMsg + (c.at ? '. למשל כש-' + atText(c.at) + ': יוצא ' + nice(c.b) + ' במקום ' + nice(c.a) + '.' : '.'); }
  }
  function counter(c, A, B) {
    return 'השורה לא שווה לקודמת' + (c.at && atText(c.at) ? '. למשל כש-' + atText(c.at) + ': קודם יצא ' + nice(c.a) + ', ועכשיו ' + nice(c.b) + '.' : '.');
  }
  function eqMark(r, c, isSol) {
    if (c.skip) return;
    if (c.ok) { r.mark = 'ok'; r.msg = c.truth === false ? 'שקול לשורה הקודמת' : 'שקול לשורה הקודמת: אותם פתרונות'; return; }
    var v = c.v || 'x', parts = [];
    if (!isSol && c.added && c.added.length && !(c.lost && c.lost.length)) { // העלאה בריבוע / הרחבת תחום – צעד מותר
      r.mark = 'ok';
      r.msg = 'נכון. רק שימו לב: בשלב הזה נוסף פתרון אפשרי (⁦' + v + '≈' + c.added.map(nice).join(', ') + '⁩). זה קורה בהעלאה בריבוע, בכפל במכנה או באיחוד לוגריתמים. בסוף בודקים בהצבה ופוסלים אותו.';
      return;
    }
    r.mark = 'warn';
    if (!isSol && c.lost && c.added && c.lost.length === 1 && c.added.length === 1 && c.A && c.A.length === 1 && c.B && c.B.length === 1) {
      r.msg = 'כדאי לבדוק כאן: קודם הפתרון היה ⁦' + v + '=' + nice(c.lost[0]) + '⁩, ועכשיו יוצא ⁦' + v + '=' + nice(c.added[0]) + '⁩. כנראה טעות קטנה במעבר הזה.';
      return;
    }
    if (c.lost && c.lost.length) parts.push('הלך לאיבוד פתרון (' + '⁦' + v + '≈' + c.lost.map(nice).join(', ') + '⁩)' + (isSol ? '.' : '. אולי חילקתם בביטוי עם ' + v + '?'));
    if (c.added && c.added.length) parts.push((isSol ? 'יש כאן פתרון שלא מתאים (' : 'נוסף פתרון שלא היה קודם (') + '⁦' + v + '≈' + c.added.map(nice).join(', ') + '⁩)' + (isSol ? '.' : '. אם העליתם בריבוע, זה קורה. בסוף בודקים בהצבה.'));
    if (!parts.length) parts.push('המשוואה השתנתה.');
    r.msg = 'כדאי לבדוק כאן: ' + parts.join(' ');
  }

  // ---------------- זיהוי נושא (לנוסחאות שקופצות ולרמז) ----------------
  function topics(info) {
    var out = {};
    if (!info) return out;
    var nodes = [info.ast, info.L, info.R].concat(info.parts || [], info.vals || []).filter(Boolean);
    function any(pred) { return nodes.some(function (n) { return has(n, pred); }); }
    if (any(function (n) { return n.t === 'f' && /^(sin|cos|tan|tg|cot|asin|acos|atan|arc)/.test(n.n); }) || any(function (n) { return n.t === 'deg'; })) out.trig = 1;
    if (any(function (n) { return n.t === 'f' && /^(ln|log|logb|lg)$/.test(n.n); })) out.log = 1;
    if (any(function (n) { return n.t === '^' && namesOf(n.b).length; }) || any(function (n) { return n.t === 'c' && n.n === 'e'; }) || any(function (n) { return n.t === 'f' && n.n === 'exp'; })) out.exp = 1;
    if (info.kind === 'deriv' || info.kind === 'def') out.deriv = 1;
    if (any(function (n) { return n.t === 'f' && n.n === 'int'; })) out.integ = 1;
    if (any(function (n) { return n.t === 'f' && /sqrt|root|cbrt/.test(n.n); })) out.root = 1;
    if (any(function (n) { return n.t === '/' && namesOf(n.b).length; })) out.frac = 1;
    if (any(function (n) { return n.t === '^' && n.b.t === 'n' && n.b.v === 2 && namesOf(n.a).length; })) out.quad = 1;
    if (any(function (n) { return n.t === 'v' && /^([A-Z]{2,3}|ang_)/.test(n.n); })) out.geo = 1;
    return out;
  }
  // דרגת פולינום במשתנה אחד (הפרשים סופיים), או -1
  function polyDeg(g, v) {
    var ys = [];
    for (var i = 0; i < 9; i++) { var o = { $deg: false }; o[v] = i - 3.5; var y = safe(function () { return ev(g, o); }); if (!isFinite(y)) return -1; ys.push(y); }
    for (var d = 0; d < 8; d++) {
      var sc = Math.max(1, Math.max.apply(null, ys.map(Math.abs)));
      if (ys.every(function (y) { return Math.abs(y) < 1e-7 * sc; })) return d - 1;
      var nx = []; for (var k = 1; k < ys.length; k++) nx.push(ys[k] - ys[k - 1]); ys = nx;
    }
    return -1;
  }

  var sameExpr = memo('x', sameExpr0), sameEq = memo('e', sameEq0), solCheck = memo('s', solCheck0);
  var API = { readLine: readLine, checkAll: checkAll, parse: parse, tex: tex, ev: ev, vars: vars, namesOf: namesOf, has: has, sameExpr: sameExpr, sameEq: sameEq,
    roots: roots, eqFn: eqFn, topics: topics, polyDeg: polyDeg, nice: nice, clean: clean, Err: Err };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.MbMath = API;
})(typeof window !== 'undefined' ? window : this);
