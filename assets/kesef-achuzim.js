// מחשבון אחוזים (/kesef/achuzim/) – חמישה חישובים, הכול בטלפון, בלי שרת. נשמר רק ב-localStorage במפתח kesef-achuzim.
// 1 כמה זה X% מ-N · 2 X הוא כמה אחוז מ-N · 3 שינוי באחוזים מ-A ל-B · 4 להוסיף/להוריד X% · 5 מחיר לפני הנחה.
// כל מספר עובר דרך num(): ריק = null, לא מספר = NaN. התוצאה ב-innerHTML בנויה רק ממספרים מעוצבים, לא מטקסט של המשתמש.
// מדידה: window.toolUsed(tool, {action}) מ-kelim.js – m1..m5 / copy / wa / reset, פעם אחת לכל פעולה בביקור.
(function () {
  'use strict';
  var root = document.getElementById('achuzim');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'kesef-achuzim';
  var TOOL = document.body.getAttribute('data-tool') || 'achuzim';
  var LINK = 'https://hakelim.com/kesef/achuzim/';
  var DEF = { a1p: '12', a1n: '250', a2x: '30', a2n: '250', a3a: '250', a3b: '280', a4n: '250', a4p: '18', a4d: 'add', a5f: '280', a5p: '20' };
  var IDS = { a1p: 'a1-p', a1n: 'a1-n', a2x: 'a2-x', a2n: 'a2-n', a3a: 'a3-a', a3b: 'a3-b', a4n: 'a4-n', a4p: 'a4-p', a5f: 'a5-f', a5p: 'a5-p' };

  function load() { try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var sent = {};
  function used(a) { if (sent[a]) return; sent[a] = 1; if (window.toolUsed) window.toolUsed(TOOL, { action: a }); }

  // "1,250.5" / "-12" / "12%" / "₪ 300" / "−5" → מספר. ריק → null. לא מספר → NaN.
  function num(v) {
    var s = String(v == null ? '' : v).trim().replace(/[−–‒]/g, '-').replace(/[,\s ₪%‎‏]/g, '');
    if (s === '') return null;
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }
  // מספר לתצוגה: עד 4 ספרות אחרי הנקודה (6 למספרים קטנים מ-1), פסיק בין אלפים, מינוס רגיל
  function fmt(n) {
    if (!isFinite(n)) return '—';
    n = Number(n.toPrecision(12));
    if (Object.is(n, -0) || Math.abs(n) < 1e-12) n = 0;
    var a = Math.abs(n), d = a >= 1 || a === 0 ? 4 : 6;
    var s = a.toLocaleString('en-US', { maximumFractionDigits: d });
    if (s === '0' && a > 0) s = a.toExponential(2);
    return (n < 0 ? '-' : '') + s;
  }
  function par(n) { return n < 0 ? '(' + fmt(n) + ')' : fmt(n); }
  function b(s) { return '<bdi>' + s + '</bdi>'; }
  function way(ex) { return '<span class="t">הדרך:</span><span class="ex">' + ex + '</span>'; }

  var saved = load();
  var st = Object.assign({}, DEF, saved || {});
  var texts = {};

  function show(k, o) {
    var res = $('a' + k + '-r'), box = res.parentNode;
    box.classList.toggle('empty', !!o.msg);
    res.className = 'big' + (o.cls ? ' ' + o.cls : '');
    res.textContent = o.msg || o.big;
    $('a' + k + '-m').innerHTML = o.more || '';
    $('a' + k + '-w').innerHTML = o.way ? way(o.way) : '';
    texts[k] = o.msg ? '' : o.text;
    var wa = root.querySelector('[data-az-wa="' + k + '"]');
    wa.href = 'https://wa.me/?text=' + encodeURIComponent((texts[k] ? texts[k] + '\n\n' : '') + 'מחשבון אחוזים בחינם, בלי הרשמה:\n' + LINK);
    root.querySelector('[data-az-copy="' + k + '"]').disabled = !texts[k];
  }
  function bad(a, bb) {
    if (a === null || bb === null) return 'ממלאים את שני המספרים';
    if (isNaN(a) || isNaN(bb)) return 'אפשר להקליד רק מספרים';
    return '';
  }

  // 1 כמה זה P% מ-N
  function m1() {
    var p = num(st.a1p), n = num(st.a1n), e = bad(p, n);
    if (e) return show(1, { msg: e });
    var r = n * p / 100;
    show(1, {
      big: fmt(r),
      more: 'אם מוסיפים: <b>' + b(fmt(n + r)) + '</b> · אם מורידים: <b>' + b(fmt(n - r)) + '</b>',
      way: fmt(n) + ' × ' + par(p) + ' ÷ 100 = ' + fmt(n) + ' × ' + par(p / 100) + ' = ' + fmt(r),
      text: fmt(p) + '% מתוך ' + fmt(n) + ' = ' + fmt(r)
    });
  }
  // 2 X הוא כמה אחוז מ-N
  function m2() {
    var x = num(st.a2x), n = num(st.a2n), e = bad(x, n);
    if (e) return show(2, { msg: e });
    if (n === 0) return show(2, { msg: 'אי אפשר לחשב אחוז מתוך אפס' });
    var r = x / n * 100;
    show(2, {
      big: fmt(r) + '%',
      more: r >= 0 && r <= 100 ? 'והשאר: ' + b(fmt(100 - r) + '%') + ' (' + b(fmt(n - x)) + ')' : (r > 100 ? 'יותר מהשלם: פי ' + b(fmt(Math.round(x / n * 1000) / 1000)) : ''),
      way: (fmt(x) + ' ÷ ' + par(n) + ' × 100 = ' + fmt(r) + '%'),
      text: fmt(x) + ' הוא ' + fmt(r) + '% מתוך ' + fmt(n)
    });
  }
  // 3 שינוי באחוזים מ-A ל-B (מחלקים בערך המוחלט של A, כדי שכיוון השינוי יהיה נכון גם במספרים שליליים)
  function m3() {
    var a = num(st.a3a), c = num(st.a3b), e = bad(a, c);
    if (e) return show(3, { msg: e });
    if (a === 0) return show(3, { msg: 'אי אפשר לחשב שינוי באחוזים מאפס' });
    var r = (c - a) / Math.abs(a) * 100, rr = Number(r.toPrecision(12)), diff = c - a;
    var word = rr > 0 ? 'עלייה' : rr < 0 ? 'ירידה' : 'אין שינוי';
    show(3, {
      big: (rr > 0 ? '+' : '') + fmt(r) + '%',
      cls: rr > 0 ? 'up' : rr < 0 ? 'down' : '',
      more: rr === 0 ? 'אין שינוי' : '<b>' + word + ' של ' + b(fmt(Math.abs(r)) + '%') + '</b> · הפרש: ' + b((diff > 0 ? '+' : '') + fmt(diff)) + (a > 0 && c > a ? ' · פי ' + b(fmt(Math.round(c / a * 1000) / 1000)) : ''),
      way: ('(' + fmt(c) + ' − ' + par(a) + ') ÷ ' + fmt(Math.abs(a)) + ' × 100 = ' + fmt(r) + '%'),
      text: 'שינוי מ-' + fmt(a) + ' ל-' + fmt(c) + ': ' + (rr === 0 ? 'אין שינוי' : word + ' של ' + fmt(Math.abs(r)) + '%')
    });
  }
  // 4 להוסיף או להוריד P% מ-N
  function m4() {
    var add = st.a4d !== 'sub', n = num(st.a4n), p = num(st.a4p), e = bad(n, p);
    $('a4-sign').textContent = add ? 'ועוד' : 'פחות';
    Array.prototype.forEach.call(root.querySelectorAll('#a4-chips button'), function (x) { x.setAttribute('aria-pressed', p !== null && Number(x.getAttribute('data-p')) === p ? 'true' : 'false'); });
    $('a4-l').textContent = add ? (p === 18 ? 'המחיר עם מע״מ' : 'אחרי ההוספה') : 'המחיר אחרי ההנחה';
    if (e) return show(4, { msg: e });
    var f = add ? 1 + p / 100 : 1 - p / 100, r = n * f, amt = n * p / 100;
    show(4, {
      big: fmt(r),
      more: add ? (p === 18 ? 'המע״מ: ' : 'התוספת: ') + '<b>' + b(fmt(amt)) + '</b>' : 'ההנחה: <b>' + b(fmt(amt)) + '</b>' + (p > 100 ? ' (יותר מהמחיר כולו)' : ''),
      way: (fmt(n) + ' × (1 ' + (add ? '+' : '−') + ' ' + fmt(p / 100) + ') = ' + fmt(n) + ' × ' + fmt(f) + ' = ' + fmt(r)),
      text: fmt(n) + (add ? ' ועוד ' : ' פחות ') + fmt(p) + '%' + (add && p === 18 ? ' (מע״מ)' : !add ? ' (הנחה)' : '') + ' = ' + fmt(r)
    });
  }
  // 5 מחיר לפני הנחה: F אחרי P% הנחה
  function m5() {
    var f = num(st.a5f), p = num(st.a5p), e = bad(f, p);
    if (e) return show(5, { msg: e });
    if (p >= 100) return show(5, { msg: 'אחוז ההנחה צריך להיות פחות מ-100' });
    var k = 1 - p / 100, r = f / k;
    show(5, {
      big: fmt(r),
      more: (p >= 0 ? 'ההנחה הייתה: ' : 'התוספת הייתה: ') + '<b>' + b(fmt(Math.abs(r - f))) + '</b>',
      way: (fmt(f) + ' ÷ (1 − ' + par(p / 100) + ') = ' + fmt(f) + ' ÷ ' + fmt(k) + ' = ' + fmt(r)),
      text: 'שילמתי ' + fmt(f) + ' אחרי הנחה של ' + fmt(p) + '%. המחיר המקורי: ' + fmt(r)
    });
  }
  var MODES = [null, m1, m2, m3, m4, m5];
  function all() { for (var i = 1; i <= 5; i++) MODES[i](); }

  Object.keys(IDS).forEach(function (k) {
    var el = $(IDS[k]); el.value = st[k];
    var m = Number(k.charAt(1));
    el.addEventListener('input', function () { st[k] = el.value; store(); used('m' + m); MODES[m](); });
  });
  var segBtns = root.querySelectorAll('#a4-d button');
  function markSeg() { Array.prototype.forEach.call(segBtns, function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === st.a4d ? 'true' : 'false'); }); }
  Array.prototype.forEach.call(segBtns, function (x) {
    x.addEventListener('click', function () { st.a4d = x.getAttribute('data-v'); markSeg(); store(); used('m4'); m4(); });
  });
  markSeg();
  root.querySelector('#a4-chips').addEventListener('click', function (ev) {
    var c = ev.target.closest('button[data-p]'); if (!c) return;
    st.a4p = c.getAttribute('data-p'); $('a4-p').value = st.a4p; store(); used('m4'); m4();
  });
  root.addEventListener('click', function (ev) {
    var cp = ev.target.closest('[data-az-copy]');
    if (cp) {
      var t = texts[cp.getAttribute('data-az-copy')]; if (!t) return;
      used('copy');
      if (window.kelimCopy) window.kelimCopy(t, cp, 'הועתק ✓');
      else if (navigator.clipboard) navigator.clipboard.writeText(t);
      return;
    }
    if (ev.target.closest('[data-az-wa]')) used('wa');
  });
  $('az-reset').addEventListener('click', function () {
    st = Object.assign({}, DEF); store(); used('reset');
    Object.keys(IDS).forEach(function (k) { $(IDS[k]).value = st[k]; });
    markSeg(); all();
  });
  all();
})();
