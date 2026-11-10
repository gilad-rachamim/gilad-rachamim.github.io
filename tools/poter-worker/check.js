// בדיקה מספרית של פתרון – בלי בינה מלאכותית.
// הבינה כותבת "בדיקות" (ביטויים בכתיב ASCII), והקוד כאן מחשב אותן בעצמו:
//   equal       – expr שווה ל-expr2 (אחרי הצבת vars). למשל הצבת פתרון במשוואה.
//   identity    – expr שווה ל-expr2 לכל ערך של var (פישוט, פירוק).
//   derivative  – expr2 היא הנגזרת של expr לפי var (בודקים בכמה נקודות).
//   integral    – האינטגרל של expr מ-a עד b לפי var שווה ל-expr2.
// כל בדיקה מחזירה pass=true/false, או skip כשאי אפשר לחשב (ביטוי שלא הבנו).

const FN1 = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan, cot: x => 1 / Math.tan(x),
  ln: Math.log, log: Math.log10, lg: Math.log10, log2: Math.log2, sqrt: Math.sqrt, cbrt: Math.cbrt,
  abs: Math.abs, exp: Math.exp, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh
};
const DEG = { sin: 1, cos: 1, tan: 1, cot: 1 };
const DEGI = { asin: 1, acos: 1, atan: 1, arcsin: 1, arccos: 1, arctan: 1 };
const FN2 = { logb: (b, x) => Math.log(x) / Math.log(b), root: (n, x) => (x < 0 && n % 2 === 1 ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n)), ncr: ncr, max: Math.max, min: Math.min };

function ncr(n, k) { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
function fact(n) { if (n < 0 || n !== Math.floor(n) || n > 170) return NaN; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }

export class CheckErr extends Error {}

// ניקוי כתיב: LaTeX קל, סימני יוניקוד, כפל סמוי
export function clean(s) {
  return String(s == null ? '' : s)
    .replace(/\\left|\\right|\\,|\\;|\\!|\\ /g, '')
    .replace(/\\cdot|\\times|·|×|∙/g, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-')
    .replace(/\\pi|π/g, 'pi').replace(/√/g, 'sqrt').replace(/²/g, '^2').replace(/³/g, '^3')
    .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)').replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
    .replace(/\\(sin|cos|tan|ln|log|exp|arcsin|arccos|arctan)/g, '$1')
    .replace(/\{/g, '(').replace(/\}/g, ')').replace(/\*\*/g, '^').replace(/°/g, '')
    .trim();
}

export function tokenize(src) {
  const s = clean(src), t = [];
  let i = 0, m;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if ((m = s.slice(i).match(/^(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+)/i))) { t.push({ k: 'n', v: parseFloat(m[1]) }); i += m[1].length; continue; }
    if ((m = s.slice(i).match(/^[A-Za-z_][A-Za-z_0-9]*/))) { t.push({ k: 'id', v: m[0] }); i += m[0].length; continue; }
    if ('+-*/^!(),|'.includes(ch)) { t.push({ k: ch }); i++; continue; }
    if (ch === '[') { t.push({ k: '(' }); i++; continue; }
    if (ch === ']') { t.push({ k: ')' }); i++; continue; }
    throw new CheckErr('תו לא מוכר: ' + ch);
  }
  return t;
}

// מחזיר פונקציה (env) => מספר. env = {x: 2, ...}, ו-env.$deg למעלות.
export function compile(src) {
  const t = tokenize(src);
  let p = 0;
  const peek = () => t[p] || { k: 'end' };
  const eat = k => { if (peek().k !== k) throw new CheckErr('חסר ' + k); p++; };
  const startsAtom = tk => tk.k === 'n' || tk.k === 'id' || tk.k === '(';
  function expr() {
    let a = term();
    while (peek().k === '+' || peek().k === '-') { const op = t[p++].k, b = term(), l = a; a = op === '+' ? e => l(e) + b(e) : e => l(e) - b(e); }
    return a;
  }
  function term() {
    let a = unary();
    for (;;) {
      const k = peek().k;
      if (k === '*' || k === '/') { p++; const b = unary(), l = a; a = k === '*' ? e => l(e) * b(e) : e => l(e) / b(e); continue; }
      if (startsAtom(peek())) { const b = power(), l = a; a = e => l(e) * b(e); continue; } // כפל סמוי: 2x, 3(x+1), x sin(x)
      return a;
    }
  }
  function unary() {
    if (peek().k === '-') { p++; const a = unary(); return e => -a(e); }
    if (peek().k === '+') { p++; return unary(); }
    return power();
  }
  function power() {
    const b = postfix();
    if (peek().k === '^') { p++; const x = unary(); return e => pow(b(e), x(e)); }
    return b;
  }
  function postfix() {
    let a = atom();
    while (peek().k === '!') { p++; const l = a; a = e => fact(l(e)); }
    return a;
  }
  function atom() {
    const tk = t[p++];
    if (!tk) throw new CheckErr('הביטוי נגמר באמצע');
    if (tk.k === 'n') return () => tk.v;
    if (tk.k === '(') { const a = expr(); eat(')'); return a; }
    if (tk.k === '|') { const a = expr(); eat('|'); return e => Math.abs(a(e)); }
    if (tk.k === 'id') {
      const name = tk.v.toLowerCase();
      if (name === 'pi') return () => Math.PI;
      if (name === 'e' && peek().k !== '(') return () => Math.E;
      if (FN1[name] || FN2[name]) {
        let args = [];
        if (peek().k === '(') {
          p++; args.push(expr());
          while (peek().k === ',') { p++; args.push(expr()); }
          eat(')');
        } else if (FN1[name]) {
          // sin x, ln x – ארגומנט בלי סוגריים (רק גורם אחד)
          if (peek().k === '^') { // sin^2(x)
            p++; const ex = unary(); const inner = atomArg(); const f = FN1[name];
            return e => pow(f1(name, f, inner(e), e), ex(e));
          }
          args.push(atomArg());
        } else throw new CheckErr('חסרים סוגריים אחרי ' + name);
        if (FN2[name]) { if (args.length !== 2) throw new CheckErr(name + ' צריך 2'); const f = FN2[name]; return e => f(args[0](e), args[1](e)); }
        if (name === 'log' && args.length === 2) return e => Math.log(args[1](e)) / Math.log(args[0](e));
        const f = FN1[name], a = args[0];
        return e => f1(name, f, a(e), e);
      }
      return e => {
        if (e && Object.prototype.hasOwnProperty.call(e, tk.v)) return e[tk.v];
        if (e && Object.prototype.hasOwnProperty.call(e, name)) return e[name];
        throw new CheckErr('לא ידוע: ' + tk.v);
      };
    }
    throw new CheckErr('לא צפוי: ' + tk.k);
  }
  function atomArg() { return power(); }
  const out = expr();
  if (p < t.length) throw new CheckErr('נשאר משהו בסוף');
  return out;
}
function f1(name, f, v, e) {
  if (e && e.$deg) { if (DEG[name]) return f(v * Math.PI / 180); if (DEGI[name]) return f(v) * 180 / Math.PI; }
  return f(v);
}
function pow(b, x) {
  if (b < 0 && Math.abs(x - Math.round(x)) > 1e-12) { // שורש אי-זוגי של שלילי: (-8)^(1/3)
    const inv = 1 / x, n = Math.round(inv);
    if (Math.abs(inv - n) < 1e-9 && n % 2 !== 0) return -Math.pow(-b, x);
  }
  return Math.pow(b, x);
}

// "x=2; y=-1/3" -> {x:2, y:-0.333}
export function parseVars(s, deg) {
  const env = { $deg: !!deg };
  if (!s) return env;
  for (const part of String(s).split(/[;\n]|,(?![^()]*\))/)) {
    const m = part.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.+?)\s*$/);
    if (!m) continue;
    env[m[1]] = compile(m[2])(env);
  }
  return env;
}

// כמה ספרות אחרי הנקודה יש במספר שנכתב (תשובה מעוגלת)
function decimals(s) { const m = String(s).trim().match(/^-?\d+\.(\d+)$/); return m ? m[1].length : null; }
function close(a, b, rel, roundedStr) {
  if (!isFinite(a) || !isFinite(b)) return false;
  const d = Math.abs(a - b), sc = Math.max(1, Math.abs(a), Math.abs(b));
  if (d <= (rel || 1e-6) * sc) return true;
  const dec = roundedStr == null ? null : decimals(roundedStr);
  if (dec != null && d <= 0.51 * Math.pow(10, -dec) + 1e-12) return true; // תשובה מעוגלת (2.83)
  return false;
}

function samplePoints(lo, hi) {
  const pts = [];
  for (let i = 0; i < 9; i++) pts.push(lo + (hi - lo) * (0.07 + 0.86 * ((i * 0.618034) % 1)));
  return pts;
}

function simpson(f, a, b, n) {
  n = n || 4000; const h = (b - a) / n; let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return s * h / 3;
}

// בדיקה אחת. c = {kind, expr, expr2, vars, var, a, b, deg}
export function runCheck(c) {
  try {
    const kind = c.kind, v = (c.var || 'x').trim() || 'x';
    const base = parseVars(c.vars, c.deg);
    const f = compile(c.expr);
    const g = c.expr2 != null && String(c.expr2).trim() !== '' ? compile(c.expr2) : null;
    if (kind === 'equal') {
      if (!g) return { skip: 'חסר צד שני' };
      const a = f(base), b = g(base);
      return { pass: close(a, b, 1e-6, c.expr2) || close(a, b, 1e-6, c.expr), got: a, want: b };
    }
    if (kind === 'identity' || kind === 'derivative') {
      if (!g) return { skip: 'חסר צד שני' };
      const lo = c.a != null && c.a !== '' ? compile(String(c.a))(base) : -3;
      const hi = c.b != null && c.b !== '' ? compile(String(c.b))(base) : 3;
      let ok = 0, bad = 0, firstBad = null;
      const pts = samplePoints(lo, hi).concat(lo >= 0 ? [] : samplePoints(0.15, 3.5));
      for (const x of pts) {
        const env = Object.assign({}, base, { [v]: x });
        let want, got;
        try {
          got = g(env);
          if (kind === 'identity') want = f(env);
          else {
            const h = 1e-5 * Math.max(1, Math.abs(x));
            const p1 = f(Object.assign({}, env, { [v]: x + h })), m1 = f(Object.assign({}, env, { [v]: x - h }));
            const p2 = f(Object.assign({}, env, { [v]: x + 2 * h })), m2 = f(Object.assign({}, env, { [v]: x - 2 * h }));
            want = (8 * (p1 - m1) - (p2 - m2)) / (12 * h);
          }
        } catch (e) { if (e instanceof CheckErr) throw e; continue; }
        if (!isFinite(want) || !isFinite(got) || Math.abs(want) > 1e8) continue;
        if (close(want, got, kind === 'derivative' ? 1e-5 : 1e-8)) ok++; else { bad++; if (!firstBad) firstBad = { at: x, got, want }; }
      }
      if (ok + bad < 3) return { skip: 'לא נמצאו מספיק נקודות לבדיקה' };
      return bad ? Object.assign({ pass: false }, firstBad) : { pass: true, n: ok };
    }
    if (kind === 'integral') {
      if (!g) return { skip: 'חסר צד שני' };
      const a = compile(String(c.a))(base), b = compile(String(c.b))(base);
      const got = simpson(x => f(Object.assign({}, base, { [v]: x })), a, b);
      const want = g(base);
      if (!isFinite(got)) return { skip: 'האינטגרל לא חושב (נקודה לא מוגדרת)' };
      return { pass: close(got, want, 1e-5, c.expr2), got, want };
    }
    return { skip: 'סוג בדיקה לא מוכר' };
  } catch (e) {
    if (e instanceof CheckErr) return { skip: e.message };
    return { skip: 'שגיאה בחישוב' };
  }
}

export function runChecks(list) {
  return (Array.isArray(list) ? list : []).slice(0, 30).map(c => Object.assign({ part: c.part || '', what: c.what || '', kind: c.kind }, runCheck(c)));
}
