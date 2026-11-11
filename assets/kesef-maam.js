// מחשבון מע"מ (/kesef/maam/) – להוסיף מע"מ (נטו ← ברוטו) או להוריד מע"מ (ברוטו ← נטו וכמה מזה מע"מ).
// הכול בטלפון, בלי שרת. נשמר רק ב-localStorage במפתח kesef-maam (data-wipe="maam" מוחק אותו דרך kesef.js).
// כסף מעוגל לאגורות: המע"מ מעוגל קודם, והסכום השני נגזר ממנו, כך שתמיד נטו + מע"מ = ברוטו בדיוק כמו בחשבונית.
// כל מספר עובר דרך num(): ריק = null, לא מספר = NaN. innerHTML נבנה רק ממספרים מעוצבים, לא מטקסט של המשתמש.
// מדידה: window.toolUsed(tool, {action}) מ-kelim.js – add / sub / rate / flip / copy / wa / reset, פעם אחת לכל פעולה בביקור.
(function () {
  'use strict';
  var root = document.getElementById('maam');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'kesef-maam';
  var TOOL = document.body.getAttribute('data-tool') || 'maam';
  var LINK = 'https://hakelim.com/kesef/maam/';
  var DEF = { d: 'add', n: '100', r: '18' };

  function load() { try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var sent = {};
  function used(a) { if (sent[a]) return; sent[a] = 1; if (window.toolUsed) window.toolUsed(TOOL, { action: a }); }

  // "1,250.5" / "-12" / "18%" / "₪ 300" / "−5" → מספר. ריק → null. לא מספר → NaN.
  function num(v) {
    var s = String(v == null ? '' : v).trim().replace(/[−–‒]/g, '-').replace(/[,\s ₪%‎‏]/g, '');
    if (s === '') return null;
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }
  // ניקוי שאריות של חישוב עשרוני במחשב (1.005 × 100 = 100.49999999999999)
  function clean(x) { return Number(x.toPrecision(12)); }
  // עיגול לאגורות, חצי למעלה, סימטרי לשליליים
  function r2(x) { var s = x < 0 ? -1 : 1; return s * Math.round(clean(Math.abs(x) * 100)) / 100; }
  // כסף לתצוגה: פסיק בין אלפים, שתי ספרות אחרי הנקודה רק כשיש אגורות
  function money(x) {
    x = r2(x); if (Object.is(x, -0)) x = 0;
    var a = Math.abs(x), frac = Math.round(a * 100) % 100 !== 0;
    var s = a.toLocaleString('en-US', { minimumFractionDigits: frac ? 2 : 0, maximumFractionDigits: 2 });
    return (x < 0 ? '-' : '') + s;
  }
  // מספר כללי (שיעור, מקדם): עד 4 ספרות אחרי הנקודה
  function fmt(x) {
    x = clean(x); if (Object.is(x, -0)) x = 0;
    return x.toLocaleString('en-US', { maximumFractionDigits: 4 });
  }
  function b(s) { return '<bdi>' + s + '</bdi>'; }
  function eq(exact) { return clean(exact) === r2(exact) ? ' = ' : ' ≈ '; }

  var saved = load();
  var st = Object.assign({}, DEF, saved || {});
  var text = '', last = null;
  var inN = $('mm-n'), inR = $('mm-r'), segBtns = root.querySelectorAll('#mm-d button');

  function setWa() {
    $('mm-wa').href = 'https://wa.me/?text=' + encodeURIComponent((text ? text + '\n\n' : '') + 'מחשבון מע"מ בחינם, בלי הרשמה:\n' + LINK);
    $('mm-copy').disabled = !text;
  }
  function empty(msg) {
    var res = root.querySelector('.mm-res');
    res.classList.add('empty');
    $('mm-b').textContent = msg;
    $('mm-w').innerHTML = '';
    text = ''; last = null; setWa();
  }

  function calc() {
    var add = st.d !== 'sub', n = num(st.n), r = num(st.r);
    Array.prototype.forEach.call(segBtns, function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === st.d ? 'true' : 'false'); });
    Array.prototype.forEach.call(root.querySelectorAll('#mm-chips button'), function (x) {
      x.setAttribute('aria-pressed', r !== null && Number(x.getAttribute('data-p')) === r ? 'true' : 'false');
    });
    $('mm-nl').textContent = add ? 'המחיר בלי מע"מ' : 'המחיר כולל מע"מ';
    $('mm-l').textContent = add ? 'המחיר כולל מע"מ' : 'המחיר לפני מע"מ';
    $('mm-flip').textContent = add ? '↕️ להפוך: להוריד מע"מ מהתוצאה' : '↕️ להפוך: להוסיף מע"מ לתוצאה';

    if (n === null) return empty('מקלידים מחיר');
    if (r === null) return empty('מקלידים את שיעור המע"מ');
    if (isNaN(n) || isNaN(r)) return empty('אפשר להקליד רק מספרים');
    if (r < 0) return empty('שיעור המע"מ לא יכול להיות שלילי');

    var f = clean(1 + r / 100), net, vat, gross, exact, way1;
    if (add) {
      net = n; vat = r2(n * r / 100); gross = r2(net + vat);
      exact = n * f;
      way1 = fmt(n) + ' × ' + fmt(f) + eq(exact) + money(gross);
    } else {
      gross = n; vat = r2(n * r / (100 + r)); net = r2(gross - vat);
      exact = n / f;
      way1 = fmt(n) + ' ÷ ' + fmt(f) + eq(exact) + money(net);
    }
    last = { add: add, net: net, gross: gross };
    var res = root.querySelector('.mm-res');
    res.classList.remove('empty');
    $('mm-b').innerHTML = b(money(add ? gross : net)) + ' ₪';
    $('mm-net').innerHTML = b(money(net)) + ' ₪';
    $('mm-vl').textContent = 'מע"מ ' + fmt(r) + '%';
    $('mm-vat').innerHTML = b(money(vat)) + ' ₪';
    $('mm-gross').innerHTML = b(money(gross)) + ' ₪';
    $('mm-w').innerHTML = '<span class="t">הדרך:</span><span class="ex">' + way1 + '</span>' +
      '<span class="t">המע"מ:</span><span class="ex">' + money(gross) + ' − ' + (net < 0 ? '(' + money(net) + ')' : money(net)) + ' = ' + money(vat) + '</span>';
    text = 'מחיר לפני מע"מ: ' + money(net) + ' ₪\nמע"מ ' + fmt(r) + '%: ' + money(vat) + ' ₪\nמחיר כולל מע"מ: ' + money(gross) + ' ₪';
    setWa();
  }

  function fill() { inN.value = st.n; inR.value = st.r; }
  fill();
  inN.addEventListener('input', function () { st.n = inN.value; store(); used(st.d === 'sub' ? 'sub' : 'add'); calc(); });
  inR.addEventListener('input', function () { st.r = inR.value; store(); used('rate'); calc(); });
  Array.prototype.forEach.call(segBtns, function (x) {
    x.addEventListener('click', function () { st.d = x.getAttribute('data-v'); store(); used(st.d); calc(); });
  });
  $('mm-chips').addEventListener('click', function (ev) {
    var c = ev.target.closest('button[data-p]'); if (!c) return;
    st.r = c.getAttribute('data-p'); inR.value = st.r; store(); used('rate'); calc();
  });
  // להפוך: התוצאה נכנסת לשדה, והכיוון מתהפך (118 כולל ← 100 לפני, ולהפך)
  $('mm-flip').addEventListener('click', function () {
    if (last) st.n = String(last.add ? last.gross : last.net);
    st.d = st.d === 'sub' ? 'add' : 'sub';
    inN.value = st.n; store(); used('flip'); calc();
  });
  $('mm-copy').addEventListener('click', function () {
    if (!text) return;
    used('copy');
    if (window.kelimCopy) window.kelimCopy(text, $('mm-copy'), 'הועתק ✓');
    else if (navigator.clipboard) navigator.clipboard.writeText(text);
  });
  $('mm-wa').addEventListener('click', function () { used('wa'); });
  $('mm-reset').addEventListener('click', function () {
    st = Object.assign({}, DEF); store(); used('reset'); fill(); calc();
  });
  calc();
})();
