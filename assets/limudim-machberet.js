/* המחברת – פותרים לבד שלב אחרי שלב (/limudim/machberet/)
   הבדיקה של כל שורה: assets/limudim-machberet-math.js (במכשיר, בלי בינה מלאכותית).
   "רמז חכם" ו"בדיקה חכמה": השרת של הפותר (tools/poter-worker, נתיבים /hint ו-/check-proof). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('mb-app') || !window.MbMath) return;
  var M = window.MbMath;

  var API = 'https://limudim-poter.gilad4049.workers.dev';
  try { var qa = new URLSearchParams(location.search).get('api'); if (qa && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(qa)) API = qa; } catch (_) {}

  var usedOnce = {};
  function used(a) { if (usedOnce[a]) return; usedOnce[a] = 1; if (window.toolUsed) window.toolUsed('machberet', { action: a }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (_) { return null; } }
  function load(k, d) { try { var s = store(k); return s ? JSON.parse(s) : d; } catch (_) { return d; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tex(el, s, display) {
    if (window.katex) { try { window.katex.render(String(s), el, { throwOnError: false, displayMode: !!display, output: 'html' }); return; } catch (_) {} }
    el.textContent = s;
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // =====================================================================
  //  לשוניות
  // =====================================================================
  var tabA = $('mb-t-alg'), tabP = $('mb-t-prf');
  function showTab(p) {
    tabA.setAttribute('aria-selected', p ? 'false' : 'true'); tabP.setAttribute('aria-selected', p ? 'true' : 'false');
    $('mb-t-hw').setAttribute('aria-selected', 'false'); $('mb-hw').hidden = true;
    $('mb-alg').hidden = !!p; $('mb-prf').hidden = !p; store('mb-tab', p ? 'p' : 'a');
    $('mb-kb').hidden = true;
    if (p) { used('proof_tab'); dDraw(); }
  }
  tabA.addEventListener('click', function () { showTab(false); });
  tabP.addEventListener('click', function () { showTab(true); });

  // =====================================================================
  //  נוסחאות ומשפטים (כרטיסים)
  // =====================================================================
  var F = {
    alg: ['אלגברה', [
      ['נוסחת השורשים', 'ax^2+bx+c=0 \\;\\Rightarrow\\; x_{1,2}=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}'],
      ['ויאטה', 'x_1+x_2=-\\frac{b}{a}\\qquad x_1\\cdot x_2=\\frac{c}{a}'],
      ['כפל מקוצר', '(a\\pm b)^2=a^2\\pm 2ab+b^2'],
      ['הפרש ריבועים', 'a^2-b^2=(a-b)(a+b)'],
      ['חזקה שלישית', '(a\\pm b)^3=a^3\\pm 3a^2b+3ab^2\\pm b^3'],
      ['סכום והפרש חזקות שלישיות', 'a^3\\pm b^3=(a\\pm b)(a^2\\mp ab+b^2)'],
      ['ערך מוחלט', '|x|<a \\iff -a<x<a\\qquad |x|>a \\iff x>a \\text{ או } x<-a'],
      ['משוואה עם שורש', '\\sqrt{A}=B \\;\\Rightarrow\\; A=B^2,\\; B\\ge 0 \\;(\\text{בודקים בהצבה})']
    ]],
    log: ['חזקות ולוגריתמים', [
      ['כפל וחילוק חזקות', 'a^m\\cdot a^n=a^{m+n}\\qquad \\frac{a^m}{a^n}=a^{m-n}'],
      ['חזקה של חזקה', '(a^m)^n=a^{mn}\\qquad (ab)^n=a^nb^n'],
      ['חזקה שלילית ושבר', 'a^{-n}=\\frac{1}{a^n}\\qquad a^{\\frac{m}{n}}=\\sqrt[n]{a^m}'],
      ['הגדרת הלוגריתם', '\\log_a b=c \\iff a^c=b\\qquad (a>0,\\;a\\ne1,\\;b>0)'],
      ['כפל וחילוק', '\\log_a(xy)=\\log_a x+\\log_a y\\qquad \\log_a\\frac{x}{y}=\\log_a x-\\log_a y'],
      ['חזקה', '\\log_a x^n=n\\log_a x'],
      ['מעבר בסיס', '\\log_a b=\\frac{\\log b}{\\log a}=\\frac{\\ln b}{\\ln a}'],
      ['e ו-ln', '\\ln e=1\\qquad e^{\\ln x}=x\\qquad \\ln e^{x}=x']
    ]],
    trig: ['טריגונומטריה', [
      ['במשולש ישר זווית', '\\sin\\alpha=\\frac{\\text{ניצב מול}}{\\text{יתר}}\\quad \\cos\\alpha=\\frac{\\text{ניצב ליד}}{\\text{יתר}}\\quad \\tan\\alpha=\\frac{\\text{מול}}{\\text{ליד}}'],
      ['זהות היסוד', '\\sin^2\\alpha+\\cos^2\\alpha=1\\qquad \\tan\\alpha=\\frac{\\sin\\alpha}{\\cos\\alpha}'],
      ['זווית משלימה', '\\sin(180^\\circ-\\alpha)=\\sin\\alpha\\qquad \\cos(180^\\circ-\\alpha)=-\\cos\\alpha'],
      ['זווית משלימה ל-90°', '\\sin(90^\\circ-\\alpha)=\\cos\\alpha'],
      ['סכום והפרש זוויות', '\\sin(\\alpha\\pm\\beta)=\\sin\\alpha\\cos\\beta\\pm\\cos\\alpha\\sin\\beta'],
      ['', '\\cos(\\alpha\\pm\\beta)=\\cos\\alpha\\cos\\beta\\mp\\sin\\alpha\\sin\\beta'],
      ['זווית כפולה', '\\sin 2\\alpha=2\\sin\\alpha\\cos\\alpha'],
      ['', '\\cos 2\\alpha=\\cos^2\\alpha-\\sin^2\\alpha=1-2\\sin^2\\alpha=2\\cos^2\\alpha-1'],
      ['פתרון כללי – סינוס', '\\sin x=\\sin\\alpha \\Rightarrow x=\\alpha+360^\\circ k \\;\\text{ או }\\; x=180^\\circ-\\alpha+360^\\circ k'],
      ['פתרון כללי – קוסינוס', '\\cos x=\\cos\\alpha \\Rightarrow x=\\pm\\alpha+360^\\circ k'],
      ['פתרון כללי – טנגנס', '\\tan x=\\tan\\alpha \\Rightarrow x=\\alpha+180^\\circ k'],
      ['ברדיאנים', '180^\\circ=\\pi\\qquad 360^\\circ k=2\\pi k']
    ]],
    tri: ['משולש: סינוסים וקוסינוסים', [
      ['משפט הסינוסים', '\\frac{a}{\\sin\\alpha}=\\frac{b}{\\sin\\beta}=\\frac{c}{\\sin\\gamma}=2R'],
      ['משפט הקוסינוסים', 'c^2=a^2+b^2-2ab\\cos\\gamma'],
      ['שטח משולש', 'S=\\frac{1}{2}ab\\sin\\gamma=\\frac{a\\cdot h_a}{2}'],
      ['פיתגורס', 'a^2+b^2=c^2\\quad(\\text{c היתר})'],
      ['מתי איזה משפט?', null, 'שתי צלעות והזווית שביניהן, או שלוש צלעות: משפט הקוסינוסים. צלע והזווית שמולה (ועוד נתון): משפט הסינוסים. R הוא רדיוס המעגל החוסם.']
    ]],
    deriv: ['נגזרות', [
      ['חזקה', '(x^n)\'=nx^{n-1}\\qquad (c)\'=0'],
      ['שורש ושבר', '(\\sqrt{x})\'=\\frac{1}{2\\sqrt{x}}\\qquad \\left(\\frac{1}{x}\\right)\'=-\\frac{1}{x^2}'],
      ['מעריכית ולוגריתם', '(e^x)\'=e^x\\qquad (a^x)\'=a^x\\ln a\\qquad (\\ln x)\'=\\frac{1}{x}'],
      ['טריגונומטריות', '(\\sin x)\'=\\cos x\\qquad (\\cos x)\'=-\\sin x\\qquad (\\tan x)\'=\\frac{1}{\\cos^2x}'],
      ['מכפלה', '(u\\cdot v)\'=u\'v+uv\''],
      ['מנה', '\\left(\\frac{u}{v}\\right)\'=\\frac{u\'v-uv\'}{v^2}'],
      ['שרשרת (פונקציה מורכבת)', '\\big(f(g(x))\\big)\'=f\'(g(x))\\cdot g\'(x)'],
      ['משוואת משיק', 'y-y_1=m(x-x_1)\\qquad m=f\'(x_1)'],
      ['חקירה', null, 'נקודות חשודות לקיצון: f\'(x)=0. עלייה כש-f\'(x)>0, ירידה כש-f\'(x)<0. פיתול: f\'\'(x)=0 והחלפת סימן.']
    ]],
    integ: ['אינטגרלים', [
      ['חזקה', '\\int x^n\\,dx=\\frac{x^{n+1}}{n+1}+C\\quad(n\\ne-1)'],
      ['1/x ו-e', '\\int\\frac{1}{x}\\,dx=\\ln|x|+C\\qquad \\int e^x\\,dx=e^x+C'],
      ['טריגונומטריות', '\\int\\sin x\\,dx=-\\cos x+C\\qquad \\int\\cos x\\,dx=\\sin x+C'],
      ['פונקציה ליניארית בפנים', '\\int f(ax+b)\\,dx=\\frac{1}{a}F(ax+b)+C'],
      ['אינטגרל מסוים', '\\int_a^b f(x)\\,dx=F(b)-F(a)'],
      ['שטח בין שני גרפים', 'S=\\int_a^b\\big(f(x)-g(x)\\big)\\,dx\\quad(f\\ \\text{מעל}\\ g)'],
      ['נפח גוף סיבוב', 'V=\\pi\\int_a^b f^2(x)\\,dx']
    ]],
    seq: ['סדרות', [
      ['חשבונית – איבר', 'a_n=a_1+(n-1)d'],
      ['חשבונית – סכום', 'S_n=\\frac{n(a_1+a_n)}{2}=\\frac{n\\big(2a_1+(n-1)d\\big)}{2}'],
      ['הנדסית – איבר', 'a_n=a_1\\cdot q^{n-1}'],
      ['הנדסית – סכום', 'S_n=\\frac{a_1(q^n-1)}{q-1}'],
      ['הנדסית אינסופית', 'S=\\frac{a_1}{1-q}\\quad(|q|<1)'],
      ['ריבית דריבית', 'M_n=M_0\\cdot\\left(1+\\frac{p}{100}\\right)^n']
    ]],
    anal: ['גאומטריה אנליטית', [
      ['מרחק בין נקודות', 'd=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}'],
      ['אמצע קטע', 'M=\\left(\\frac{x_1+x_2}{2},\\;\\frac{y_1+y_2}{2}\\right)'],
      ['שיפוע', 'm=\\frac{y_2-y_1}{x_2-x_1}\\qquad m_1=m_2 \\;(\\parallel)\\qquad m_1\\cdot m_2=-1\\;(\\perp)'],
      ['ישר', 'y-y_1=m(x-x_1)'],
      ['מעגל', '(x-a)^2+(y-b)^2=R^2']
    ]],
    prob: ['הסתברות', [
      ['הסתברות מותנית', 'P(A|B)=\\frac{P(A\\cap B)}{P(B)}'],
      ['איחוד', 'P(A\\cup B)=P(A)+P(B)-P(A\\cap B)'],
      ['ברנולי (בינומית)', 'P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}'],
      ['מאורעות בלתי תלויים', 'P(A\\cap B)=P(A)\\cdot P(B)']
    ]],
    geo: ['משפטים בגאומטריה', null] // נבנה מרשימת הנימוקים
  };
  var REASONS = [
    ['בסיס', ['נתון', 'הגדרה', 'שורות קודמות (כלל המעבר)', 'חיבור או חיסור של שוויונות', 'חישוב', 'צלע משותפת', 'זווית משותפת']],
    ['זוויות וישרים מקבילים', ['זוויות קודקודיות שוות', 'זוויות צמודות משלימות ל-180°', 'זוויות מתחלפות בין ישרים מקבילים שוות', 'זוויות מתאימות בין ישרים מקבילים שוות', 'זוויות חד-צדדיות בין ישרים מקבילים משלימות ל-180°', 'אם זוויות מתחלפות (או מתאימות) שוות, הישרים מקבילים']],
    ['משולשים', ['סכום הזוויות במשולש הוא 180°', 'זווית חיצונית למשולש שווה לסכום שתי הזוויות הפנימיות שאינן צמודות לה', 'במשולש שווה שוקיים זוויות הבסיס שוות', 'מול צלעות שוות מונחות זוויות שוות (ולהפך)', 'במשולש שווה שוקיים חוצה זווית הראש הוא גם תיכון וגם גובה', 'מול הצלע הגדולה מונחת הזווית הגדולה', 'קטע אמצעים במשולש מקביל לצלע השלישית ושווה למחציתה', 'משפט פיתגורס', 'במשולש ישר זווית התיכון ליתר שווה למחצית היתר', 'במשולש ישר זווית, מול זווית של 30° מונח ניצב השווה למחצית היתר', 'חוצה זווית במשולש מחלק את הצלע שמולה ביחס הצלעות הכולאות אותה']],
    ['חפיפה ודמיון', ['חפיפת משולשים לפי צ.ז.צ', 'חפיפת משולשים לפי ז.צ.ז', 'חפיפת משולשים לפי צ.צ.צ', 'חפיפת משולשים לפי צ.צ.ז (מול הצלע הגדולה)', 'במשולשים חופפים מול זוויות שוות מונחות צלעות שוות', 'במשולשים חופפים מול צלעות שוות מונחות זוויות שוות', 'דמיון משולשים לפי ז.ז', 'דמיון משולשים לפי צ.ז.צ', 'דמיון משולשים לפי צ.צ.צ', 'במשולשים דומים יחס הצלעות המתאימות שווה ליחס הדמיון', 'משפט תאלס (ישרים מקבילים חותכים קטעים פרופורציוניים)']],
    ['מרובעים', ['במקבילית צלעות נגדיות שוות', 'במקבילית זוויות נגדיות שוות', 'במקבילית האלכסונים חוצים זה את זה', 'מרובע שבו זוג צלעות נגדיות שוות ומקבילות הוא מקבילית', 'במלבן האלכסונים שווים', 'במעוין האלכסונים מאונכים זה לזה וחוצים את הזוויות', 'בטרפז שווה שוקיים זוויות הבסיס שוות', 'קטע אמצעים בטרפז מקביל לבסיסים ושווה לחצי סכומם']],
    ['מעגל', ['רדיוסים במעגל שווים', 'זוויות היקפיות הנשענות על אותה קשת שוות', 'זווית מרכזית שווה לפעמיים זווית היקפית הנשענת על אותה קשת', 'זווית היקפית הנשענת על קוטר היא זווית ישרה (90°)', 'משיק למעגל מאונך לרדיוס בנקודת ההשקה', 'שני משיקים למעגל היוצאים מאותה נקודה שווים זה לזה', 'במרובע חסום במעגל סכום זוויות נגדיות הוא 180°', 'אנך מהמרכז למיתר חוצה את המיתר', 'מיתרים שווים נמצאים במרחקים שווים מהמרכז', 'זווית בין משיק למיתר שווה לזווית ההיקפית הנשענת על המיתר מהצד השני']],
    ['טריגונומטריה', ['משפט הסינוסים', 'משפט הקוסינוסים', 'שטח משולש: חצי מכפלת שתי צלעות בסינוס הזווית שביניהן', 'הגדרת סינוס, קוסינוס או טנגנס במשולש ישר זווית', 'זהות: sin²α+cos²α=1', 'זהות: tanα=sinα/cosα', 'sin(180°−α)=sinα', 'cos(180°−α)=−cosα', 'סינוס או קוסינוס של סכום זוויות', 'זווית כפולה']]
  ];
  F.geo[1] = [];
  REASONS.slice(1, 6).forEach(function (g) { F.geo[1].push(['— ' + g[0] + ' —', null, '']); g[1].forEach(function (r) { F.geo[1].push(['', null, r]); }); });
  var FORDER = ['alg', 'log', 'trig', 'tri', 'deriv', 'integ', 'seq', 'geo', 'anal', 'prob'];

  var dlg = $('mb-dlg'), fcur = 'alg';
  function fillTabs() {
    var t = $('mb-ftabs'); t.innerHTML = '';
    FORDER.forEach(function (k) {
      var b = el('button', '', esc(F[k][0])); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', k === fcur ? 'true' : 'false');
      b.addEventListener('click', function () { openF(k); }); t.appendChild(b);
    });
  }
  function openF(k) {
    fcur = F[k] ? k : 'alg'; fillTabs();
    var body = $('mb-fbody'); body.innerHTML = '';
    F[fcur][1].forEach(function (it) {
      var d = el('div', 'mb-f' + (it[0] && it[0][0] === '—' ? ' mb-fg' : ''));
      if (it[0]) d.appendChild(el('b', '', esc(it[0])));
      if (it[1]) { var m = el('div', 'mb-fm'); m.setAttribute('dir', 'ltr'); tex(m, it[1], true); d.appendChild(m); }
      if (it[2]) d.appendChild(el('p', '', esc(it[2])));
      body.appendChild(d);
    });
    if (!dlg.open) { try { dlg.showModal(); } catch (_) { dlg.setAttribute('open', ''); } }
    used('formulas');
  }
  $('mb-dlg-x').addEventListener('click', function () { try { dlg.close(); } catch (_) { dlg.removeAttribute('open'); } });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) { try { dlg.close(); } catch (_) {} } });
  function topicTab(tp) {
    if (tp.integ) return 'integ'; if (tp.deriv) return 'deriv'; if (tp.trig) return 'trig'; if (tp.log || tp.exp) return 'log'; if (tp.geo) return 'geo';
    if (tp.quad || tp.root || tp.frac) return 'alg'; return null;
  }

  // =====================================================================
  //  מקלדת סימנים
  // =====================================================================
  // [תווית, מה נכנס (| = איפה הסמן), סוג]
  var KEYS_ALG = [
    ['x', 'x'], ['y', 'y'], ['(', '('], [')', ')'], ['=', '='], ['⌫', '{bs}', 'd'],
    ['x²', '^2'], ['xⁿ', '^'], ['a/b', '(|)/()'], ['√', 'sqrt(|)'], ['π', 'pi'], ['°', '°'],
    ['sin', 'sin(|)', 'f'], ['cos', 'cos(|)', 'f'], ['tan', 'tan(|)', 'f'], ['ln', 'ln(|)', 'f'], ['log', 'log(|)', 'f'], ['eˣ', 'e^(|)', 'f'],
    ['f(x)=', 'f(x)=', 'f'], ["f′(x)=", "f'(x)=", 'f'], ['∫', 'int(|,0,1)', 'f'], ['|x|', 'abs(|)', 'f'], ['≤', '≤'], ['≥', '≥'],
    ['·', '*'], ['או', ' או '], ['◀', '{l}', 'o'], ['▶', '{r}', 'o'], ['↵', '{enter}', 'eq'], ['🎤', '{mic}', 'o'],
    ['<', '<'], ['>', '>'], ['≠', '≠'], [';', ' ; '], ['±', '±'], ['וגם', ' וגם ']
  ];
  var KEYS_NUM = [
    ['7', '7', 'n'], ['8', '8', 'n'], ['9', '9', 'n'], ['+', '+'], ['−', '-'], ['⌨', '{kb}', 'o'],
    ['4', '4', 'n'], ['5', '5', 'n'], ['6', '6', 'n'], ['×', '*'], ['÷', '/'], ['k', 'k'],
    ['1', '1', 'n'], ['2', '2', 'n'], ['3', '3', 'n'], ['0', '0', 'n'], ['.', '.', 'n'], [',', ',']
  ];
  var KEYS_PRF = [
    ['∠', '∠'], ['△', '△'], ['≅', '≅'], ['∼', '∼'], ['∥', '∥'], ['⊥', '⊥'],
    ['=', '='], ['°', '°'], ['²', '^2'], ['√', 'sqrt(|)'], ['sin', 'sin(|)', 'f'], ['cos', 'cos(|)', 'f'],
    ['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['O', 'O'], ['⌫', '{bs}', 'd'],
    ['·', '*'], ['/', '/'], ['◀', '{l}', 'o'], ['▶', '{r}', 'o'], ['↵', '{enter}', 'eq'], ['🎤', '{mic}', 'o']
  ];
  var kb = $('mb-kb'), keysEl = $('mb-keys'), active = null, kbMode = '';
  var kbOnly = store('mb-kbonly') != null ? store('mb-kbonly') === '1' : !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
  function applyKbOnly() {
    $('mb-kbonly').checked = kbOnly;
    Array.prototype.forEach.call(document.querySelectorAll('.mb-in'), function (i) { i.setAttribute('inputmode', kbOnly ? 'none' : 'text'); });
    kbMode = '';
    if (active && !kb.hidden) buildKeys(active.classList.contains('mb-claim') ? 'p' : 'a');
  }
  function buildKeys(mode) {
    var key = mode + (kbOnly ? '1' : '0');
    if (kbMode === key) return; kbMode = key;
    keysEl.innerHTML = '';
    (mode === 'p' ? KEYS_PRF : (kbOnly ? KEYS_NUM.concat(KEYS_ALG) : KEYS_ALG)).forEach(function (k) {
      var b = el('button', k[2] || ''); b.type = 'button'; b.textContent = k[0]; b.setAttribute('data-k', k[1]);
      b.setAttribute('aria-label', k[1] === '{bs}' ? 'מחיקה' : k[1] === '{enter}' ? 'שורה חדשה' : k[1] === '{mic}' ? 'להגיד בקול' : k[1] === '{l}' ? 'שמאלה' : k[1] === '{r}' ? 'ימינה' : k[0]);
      keysEl.appendChild(b);
    });
  }
  keysEl.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) e.preventDefault(); }); // לא לאבד את הסמן
  keysEl.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
  keysEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !active) return;
    var k = b.getAttribute('data-k'), inp = active, s = inp.selectionStart == null ? inp.value.length : inp.selectionStart, en = inp.selectionEnd == null ? s : inp.selectionEnd;
    used('keys');
    if (k === '{bs}') { if (s === en && s > 0) s--; inp.value = inp.value.slice(0, s) + inp.value.slice(en); setCaret(inp, s); }
    else if (k === '{l}' || k === '{r}') { var p = Math.max(0, Math.min(inp.value.length, s + ((k === '{r}') === (inp.getAttribute('dir') !== 'rtl') ? 1 : -1))); setCaret(inp, p); return; }
    else if (k === '{enter}') { inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return; }
    else if (k === '{kb}') { kbOnly = false; store('mb-kbonly', '0'); applyKbOnly(); inp.blur(); setTimeout(function () { inp.focus(); }, 60); used('kb_native'); return; }
    else if (k === '{mic}') { var mb = inp.closest('li') && inp.closest('li').querySelector('.mb-mic'); if (mb) mb.click(); return; }
    else {
      var sel = inp.value.slice(s, en), ins = k, cur = ins.indexOf('|');
      if (cur >= 0) { ins = ins.replace('|', sel); cur += sel.length; } else cur = ins.length;
      inp.value = inp.value.slice(0, s) + ins + inp.value.slice(en); setCaret(inp, s + cur);
    }
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  function setCaret(inp, p) { try { inp.focus({ preventScroll: true }); inp.setSelectionRange(p, p); } catch (_) {} }
  var hideT = null;
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (t && t.classList && (t.classList.contains('mb-in') || t.classList.contains('mb-claim'))) {
      clearTimeout(hideT); active = t; buildKeys(t.classList.contains('mb-claim') ? 'p' : 'a'); kb.hidden = false;
    }
  });
  document.addEventListener('focusout', function () {
    clearTimeout(hideT);
    hideT = setTimeout(function () { var a = document.activeElement; if (!a || !(a.classList.contains('mb-in') || a.classList.contains('mb-claim'))) kb.hidden = true; }, 250);
  });

  // =====================================================================
  //  דיבור
  // =====================================================================
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, recBtn = null;
  function speechToLine(t) {
    t = String(t || '').trim();
    var pre = '', m = t.match(/^(?:אף|f)\s*(תג|גרש|נגזרת)?\s*(?:של\s*)?(?:איקס|x)\s*(?:שווה|=)\s*/);
    if (m) { pre = m[1] ? "f'(x)=" : 'f(x)='; t = t.slice(m[0].length); }
    if (!window.HeDibur) return pre + t;
    try {
      var parts = t.split(/\s+או\s+/);
      return pre + parts.map(function (p) { return window.HeDibur.heToExpr(p).replace(/\s+/g, ' ').replace(/\s*\^\s*/g, '^').replace(/ \( /g, '(').replace(/ \)/g, ')'); }).join(' או ');
    } catch (e) { return null; }
  }
  function micFor(btn, inp, onDone) {
    if (!SR) { btn.hidden = true; return; }
    btn.addEventListener('click', function () {
      if (rec) { try { rec.stop(); } catch (_) {} if (recBtn === btn) return; }
      rec = new SR(); rec.lang = 'he-IL'; rec.interimResults = false; rec.continuous = false; recBtn = btn;
      btn.classList.add('on'); btn.textContent = '⏹';
      rec.onresult = function (e) {
        var t = e.results[0][0].transcript, line = onDone.conv ? speechToLine(t) : t;
        if (line == null) { inp.value = t; onDone(t, true); } else { inp.value = line; onDone(line, false); }
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      };
      rec.onend = function () { btn.classList.remove('on'); btn.textContent = '🎤'; rec = null; recBtn = null; };
      rec.onerror = function (e) { if (e.error === 'not-allowed') flash('צריך לאשר גישה למיקרופון בדפדפן.'); };
      try { rec.start(); used('voice'); } catch (_) { btn.classList.remove('on'); btn.textContent = '🎤'; rec = null; }
    });
  }
  function flash(msg) { var s = $('mb-saved'); s.textContent = msg; setTimeout(function () { if (s.textContent === msg) s.textContent = ''; }, 4000); }

  // =====================================================================
  //  תרגיל: שורות
  // =====================================================================
  var A = load('mb-alg', null) || { rows: ['', ''], deg: true };
  if (!A.rows || !A.rows.length) A.rows = ['', ''];
  var rowsEl = $('mb-rows'), checkT = null, saveT = null;
  var degBtn = $('mb-deg');
  function setDeg(d) { A.deg = d; var s = degBtn.querySelectorAll('span'); s[0].classList.toggle('on', d); s[1].classList.toggle('on', !d); degBtn.classList.toggle('rad', !d); }
  degBtn.addEventListener('click', function () { setDeg(!A.deg); recheck(); save(); });
  setDeg(A.deg !== false);

  function renderRows(focusI) {
    var ak = $('mb-ask'); ak.hidden = !A.ask; ak.textContent = A.ask ? '📝 ' + A.ask : '';
    rowsEl.innerHTML = '';
    A.rows.forEach(function (v, i) { rowsEl.appendChild(rowEl(v, i)); });
    recheck(true);
    if (focusI != null) { var inp = rowsEl.children[focusI] && rowsEl.children[focusI].querySelector('.mb-in'); if (inp) setCaret(inp, inp.value.length); }
  }
  function rowEl(v, i) {
    var li = el('li', 'mb-row' + (i === 0 ? ' mb-q' : ''));
    li.innerHTML = '<span class="mb-n">' + (i === 0 ? 'התרגיל' : i) + '</span>' +
      '<div class="mb-cell"><input class="mb-in" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="next" inputmode="' + (kbOnly ? 'none' : 'text') + '">' +
      '<div class="mb-prev" dir="ltr"></div><p class="mb-msg"></p><div class="mb-chip"></div></div>' +
      '<span class="mb-mk" aria-live="polite"></span>' +
      '<span class="mb-rb no-print"><button type="button" class="mb-mic" aria-label="להגיד את השורה בקול">🎤</button><button type="button" class="mb-del" aria-label="למחוק את השורה">✕</button></span>';
    var inp = li.querySelector('.mb-in');
    inp.value = v;
    if (i === 0 && HW) { inp.readOnly = true; inp.title = 'התרגיל מהמורה'; }
    inp.placeholder = i === 0 ? 'התרגיל, למשל: 2(x+3)=x+10' : i === 1 ? 'השלב הראשון, למשל: 2x+6=x+10' : 'השלב הבא';
    inp.setAttribute('aria-label', i === 0 ? 'התרגיל' : 'שלב ' + i);
    var done = function (line, failed) { if (failed) flash('לא הבנתי הכול. אפשר לתקן בכתב.'); };
    done.conv = true;
    micFor(li.querySelector('.mb-mic'), inp, done);
    li.querySelector('.mb-del').addEventListener('click', function () {
      var k = idx(li); if (A.rows.length <= 1) { A.rows[0] = ''; } else A.rows.splice(k, 1);
      renderRows(Math.max(0, k - 1)); save();
    });
    return li;
  }
  function idx(li) { return Array.prototype.indexOf.call(rowsEl.children, li); }
  rowsEl.addEventListener('input', function (e) {
    if (!e.target.classList.contains('mb-in')) return;
    var li = e.target.closest('li'); A.rows[idx(li)] = e.target.value;
    clearTimeout(checkT); checkT = setTimeout(recheck, 220); save(); used('write');
  });
  rowsEl.addEventListener('keydown', function (e) {
    if (!e.target.classList.contains('mb-in')) return;
    var li = e.target.closest('li'), k = idx(li);
    if (e.key === 'Enter') { e.preventDefault(); A.rows.splice(k + 1, 0, ''); renderRows(k + 1); save(); }
    else if (e.key === 'Backspace' && !e.target.value && k > 0 && A.rows.length > 1) { e.preventDefault(); A.rows.splice(k, 1); renderRows(k - 1); save(); }
    else if (e.key === 'ArrowUp' && k > 0) { e.preventDefault(); var u = rowsEl.children[k - 1].querySelector('.mb-in'); setCaret(u, u.value.length); }
    else if (e.key === 'ArrowDown' && k < A.rows.length - 1) { e.preventDefault(); var d = rowsEl.children[k + 1].querySelector('.mb-in'); setCaret(d, d.value.length); }
  });
  rowsEl.addEventListener('focusin', function (e) { if (e.target.classList.contains('mb-in')) showChip(e.target.closest('li')); });
  $('mb-add').addEventListener('click', function () { A.rows.push(''); renderRows(A.rows.length - 1); save(); });

  var lastRes = [];
  function recheck() {
    var res = M.checkAll(A.rows, { deg: A.deg });
    lastRes = res;
    Array.prototype.forEach.call(rowsEl.children, function (li, i) {
      var r = res[i] || { info: { kind: 'empty' } }, I = r.info, pv = li.querySelector('.mb-prev'), msg = li.querySelector('.mb-msg'), mk = li.querySelector('.mb-mk');
      var key = (I.tex || I.text || '') + '|' + I.kind;
      if (pv.getAttribute('data-k') !== key) {
        pv.setAttribute('data-k', key);
        if (I.tex) { pv.setAttribute('dir', 'ltr'); pv.style.fontSize = ''; tex(pv, I.tex); pv.className = 'mb-prev'; fit(pv); }
        else if (I.kind === 'text') { pv.setAttribute('dir', 'rtl'); pv.textContent = I.text; pv.className = 'mb-prev mb-txt'; }
        else { pv.textContent = ''; pv.className = 'mb-prev'; }
      }
      li.classList.toggle('ok', r.mark === 'ok'); li.classList.toggle('warn', r.mark === 'warn'); li.classList.toggle('bad', r.mark === 'bad');
      mk.textContent = r.mark === 'ok' ? '✓' : r.mark === 'warn' ? '?' : '';
      mk.setAttribute('aria-label', r.mark === 'ok' ? 'נכון' : r.mark === 'warn' ? 'כדאי לבדוק כאן' : '');
      msg.textContent = r.mark === 'bad' ? (I.kind === 'bad' && li.querySelector('.mb-in') !== document.activeElement ? 'לא הצלחתי לקרוא: ' + r.msg : '') : (r.msg || '');
      if (r.mark === 'warn') used('warn');
      if (r.mark === 'ok' && /🎉/.test(r.msg || '')) { used('solved'); showSupport(); }
    });
    var a = document.activeElement; if (a && a.classList.contains('mb-in')) showChip(a.closest('li'));
  }
  // נוסחה ארוכה: מקטינים עד שנכנסת ברוחב (לא פחות מ-60%), ואם עדיין לא – גוללים לצד
  function fit(pv) {
    var w = pv.clientWidth, k = pv.scrollWidth;
    if (w && k && k > w) pv.style.fontSize = Math.max(0.55, w / k) * parseFloat(getComputedStyle(pv).fontSize) / 16 + 'rem';
  }
  function fitAll() { Array.prototype.forEach.call(document.querySelectorAll('#mb-rows .mb-prev'), function (pv) { if (pv.querySelector('.katex')) { pv.style.fontSize = ''; fit(pv); } }); }
  try { document.fonts.ready.then(fitAll); } catch (_) {}
  window.addEventListener('load', fitAll);
  var fitT = null; window.addEventListener('resize', function () { clearTimeout(fitT); fitT = setTimeout(fitAll, 200); });
  // נוסחה שקופצת לפי מה שכותבים בשורה
  function showChip(li) {
    Array.prototype.forEach.call(rowsEl.querySelectorAll('.mb-chip'), function (c) { if (c.parentNode.parentNode !== li) c.innerHTML = ''; });
    if (!li) return;
    var r = lastRes[idx(li)], c = li.querySelector('.mb-chip'); if (!r) { c.innerHTML = ''; return; }
    var tab = topicTab(M.topics(r.info));
    if (!tab) { c.innerHTML = ''; return; }
    if (c.getAttribute('data-t') === tab && c.innerHTML) return;
    c.setAttribute('data-t', tab);
    c.innerHTML = '<button type="button" class="mb-chipb no-print">📐 נוסחאות שיכולות לעזור: ' + esc(F[tab][0]) + '</button>';
    c.firstChild.addEventListener('mousedown', function (e) { e.preventDefault(); });
    c.firstChild.addEventListener('click', function () { openF(tab); used('formula_chip'); });
  }

  function showSupport() { var s = $('mb-support'); if (s.hidden && !shared) { s.hidden = false; used('support_shown'); } }
  $('mb-support').addEventListener('click', function (e) { if (e.target.closest('[data-support]')) used('support_click'); });
  function save() {
    if (shared) return;
    if (HW) { hwSave(); return; }
    clearTimeout(saveT);
    saveT = setTimeout(function () { store('mb-alg', JSON.stringify(A)); $('mb-saved').textContent = '✓ נשמר בטלפון'; }, 400);
  }

  // דוגמאות
  var EXA = {
    lin: ['3(x-2)+4=2x+5', ''], quad: ['x^2-5x+6=0', ''], simp: ['(x+3)^2-(x-3)^2', ''], der: ['f(x)=x^3-3x^2+4', ''],
    trig: ['2sin(x)-1=0', ''], sqrt: ['sqrt(x+2)=x', ''], exp: ['e^(2x)=5', ''], ineq: ['x^2-5x+6<0', ''], sys: ['x+y=5 ; x-y=1', '']
  };
  Array.prototype.forEach.call(document.querySelectorAll('#mb-alg [data-ex]'), function (b) {
    b.addEventListener('click', function () {
      var x = EXA[b.getAttribute('data-ex')]; if (!x) return;
      archive(); A.rows = x.slice(); A.ask = ''; if (b.getAttribute('data-ex') === 'trig') setDeg(true);
      renderRows(1); save(); hideHint(); used('example');
    });
  });

  // דפים קודמים
  function archive() {
    if (!A.rows.some(function (r) { return r.trim(); })) return;
    var old = load('mb-old', []);
    old.unshift({ t: Date.now(), rows: A.rows.slice(), deg: A.deg, ask: A.ask || '' });
    store('mb-old', JSON.stringify(old.slice(0, 30)));
    showOld();
  }
  function showOld() {
    var old = load('mb-old', []), ul = $('mb-oldl');
    $('mb-old').hidden = !old.length; ul.innerHTML = '';
    old.forEach(function (o, k) {
      var li = el('li'), b = el('button', 'linkish'), d = new Date(o.t);
      b.type = 'button'; b.textContent = (o.rows[0] || '(בלי תרגיל)') + ' · ' + d.toLocaleDateString('he-IL') + ' · ' + o.rows.filter(function (r) { return r.trim(); }).length + ' שורות';
      b.setAttribute('dir', 'auto');
      b.addEventListener('click', function () {
        var all = load('mb-old', []), it = all.splice(k, 1)[0];
        store('mb-old', JSON.stringify(all)); archive();
        A.rows = it.rows; A.ask = it.ask || ''; setDeg(it.deg !== false); renderRows(); save(); showOld(); hideHint();
        window.scrollTo({ top: $('mb-sheet').offsetTop - 60, behavior: 'smooth' });
      });
      li.appendChild(b); ul.appendChild(li);
    });
  }
  $('mb-new').addEventListener('click', function () { archive(); A.rows = ['', '']; A.ask = ''; renderRows(0); save(); hideHint(); used('new'); });
  $('mb-print').addEventListener('click', function () { used('print'); window.print(); });
  $('mb-formb').addEventListener('click', function () {
    var last = null; for (var i = lastRes.length - 1; i >= 0 && !last; i--) if (lastRes[i] && lastRes[i].info.kind !== 'empty') last = lastRes[i];
    openF((last && topicTab(M.topics(last.info))) || 'alg');
  });

  // =====================================================================
  //  רמז (בלי בינה מלאכותית קודם, ואז "רמז חכם")
  // =====================================================================
  var hintEl = $('mb-hint');
  function hideHint() { hintEl.hidden = true; hintEl.innerHTML = ''; }
  // שלושה שלבים: רמז קטן (t), רמז גדול יותר (t2), ורק בסוף "הראו לי את הצעד הבא" (M.nextStep)
  function localHint() {
    var res = lastRes, rows = A.rows, lastI = -1;
    for (var i = rows.length - 1; i >= 0; i--) if (rows[i].trim()) { lastI = i; break; }
    if (lastI < 0) return { t: 'כותבים את התרגיל בשורה הראשונה. אפשר גם ללחוץ על אחת הדוגמאות למעלה, או לצלם תרגיל מהדף.', end: true };
    for (var w = 1; w < res.length; w++) if (res[w].mark === 'warn' && !/פתרון זר/.test(res[w].msg)) {
      return { t: 'בשורה ' + w + ' יש סימן שאלה: משהו השתנה במעבר מהשורה שלפניה. מה עשיתם שם?', t2: 'נסו להציב מספר קטן (למשל x=1) בשורה ' + w + ' ובשורה שלפניה, ולראות איפה זה מתפרק. טעויות נפוצות: סימן שהתהפך בהעברת אגף, כפל שלא הגיע לכל האיברים בסוגריים, או חילוק רק של חלק מהאגף.', fix: w };
    }
    var r = res[lastI], I = r.info, tp = M.topics(I);
    if (I.kind === 'bad') return { t: 'המחברת לא הצליחה לקרוא את ' + (lastI ? 'שורה ' + lastI : 'שורת התרגיל') + ' (' + r.msg + '). בודקים שכל סוגר נסגר, ושיש כפל בין מספר לסוגריים, למשל 2*(x+1) או 2(x+1).', end: true };
    if (I.kind === 'sol' && r.mark === 'ok' && /🎉/.test(r.msg || '')) return { t: 'סיימתם! 🎉 בדיקה אחרונה, כמו בבגרות: מציבים את הפתרון בתרגיל המקורי ורואים ששני הצדדים יוצאים שווים.', end: true };
    if (I.kind === 'text') return { t: 'שורה במילים זה מצוין להסבר. את השלב הבא כותבים בנוסחה, כדי שהמחברת תוכל לבדוק אותו.', end: true };
    if (I.kind === 'ineq') {
      var quadI = I.groups && I.groups.length === 1 && I.groups[0].length === 1 && (function (a) { var g = M.eqFn(a.L, a.R), nm = M.namesOf(g); return nm.length === 1 && M.polyDeg(g, nm[0]) === 2; })(I.groups[0][0]);
      if (quadI) return { t: 'אי-שוויון ריבועי. איפה הביטוי מתאפס?', t2: 'כותבים משוואת עזר: מחליפים את הסימן ב-= ופותרים. אחר כך מציירים פרבולה (או טבלת סימנים) ובודקים באיזה תחום הביטוי חיובי ובאיזה שלילי.', f: 'alg' };
      return { t: 'פותרים אי-שוויון כמו משוואה: אותם צעדים בדיוק.', t2: 'רק לזכור: כשכופלים או מחלקים במספר שלילי, הסימן מתהפך (< הופך ל->). בסוף כותבים את התשובה כמו x<3 או -1<x≤4.' };
    }
    if (I.kind === 'sys') return { t: 'מערכת של שתי משוואות. איך נפטרים מאחד הנעלמים?', t2: 'שתי דרכים: מבודדים נעלם באחת המשוואות (למשל y=…) ומציבים בשנייה, או מחברים/מחסירים את המשוואות כך שנעלם אחד ייעלם. אחר כך מציבים חזרה ומוצאים את הנעלם השני.' };
    if (I.kind === 'def') return { t: 'רוצים לחקור את הפונקציה? מה עושים קודם?', t2: 'מתחילים בתחום ההגדרה, ואז גוזרים: כותבים בשורה הבאה f\'(x)= ואחריו הנגזרת. גוזרים כל איבר לבד: (xⁿ)′=n·xⁿ⁻¹.', f: 'deriv' };
    if (I.kind === 'deriv') return { t: 'יש נגזרת. מה עושים איתה כדי למצוא נקודות קיצון?', t2: 'משווים אותה ל-0: כותבים בשורה הבאה את הנגזרת ואחריה =0, ופותרים.', f: 'deriv' };
    if (I.kind === 'expr' || I.kind === 'chain') {
      if (tp.frac) return { t: 'יש כאן שברים. מה צריך כדי לחבר אותם?', t2: 'מביאים למכנה משותף: כופלים כל שבר במה שחסר לו במכנה.', f: 'alg' };
      if (tp.trig) return { t: 'חפשו זהות טריגונומטרית שמתאימה לביטוי.', t2: 'בביטוי עם sin ו-cos כדאי לחפש: sin²x+cos²x=1, או זווית כפולה.', f: 'trig' };
      return { t: 'אפשר לפתוח סוגריים או לכנס איברים?', t2: 'פותחים סוגריים (בעזרת כפל מקוצר אם צריך) וכונסים איברים דומים. מתחילים את השורה הבאה ב-= ואחריו הביטוי החדש.', f: 'alg' };
    }
    if (I.kind === 'eq' || I.kind === 'sol') {
      var g = I.kind === 'eq' ? M.eqFn(I.L, I.R) : null, names = g ? M.namesOf(g) : [];
      if (names.length > 1) return { t: 'יש כאן יותר מנעלם אחד. איזה מהם הכי קל לבודד?', t2: 'מבודדים נעלם אחד (למשל y) באגף אחד, ומציבים אותו במשוואה השנייה.' };
      var v = names[0] || 'x';
      if (tp.trig) return { t: 'מה צריך להיות לבד באגף אחד?', t2: 'מבודדים את sin (או cos) באגף אחד: sin(x)=מספר. אחר כך משתמשים בפתרון הכללי, ולא שוכחים את הפתרון השני (180° פחות הזווית).', f: 'trig' };
      if (tp.log) return { t: 'איך נפטרים מהלוגריתם?', t2: 'לוגריתם הופכים לחזקה: log_a(b)=c זה כמו a^c=b. ולפני הכול: מה שבתוך הלוגריתם חייב להיות חיובי.', f: 'log' };
      if (tp.exp) return { t: 'ה-' + v + ' נמצא במעריך. איך מורידים אותו משם?', t2: 'מביאים את שני האגפים לאותו בסיס, או לוקחים ln לשני האגפים.', f: 'log' };
      if (tp.root) return { t: 'איך נפטרים מהשורש?', t2: 'מבודדים את השורש באגף אחד, ואז מעלים את שני האגפים בריבוע. בסוף חייבים לבדוק בהצבה, כי העלאה בריבוע יכולה להוסיף פתרון זר.', f: 'alg' };
      if (tp.frac) return { t: 'יש ' + v + ' במכנה. איך נפטרים מהשבר?', t2: 'כופלים את שני האגפים במכנה המשותף. אבל קודם רושמים מתי המכנה מתאפס, כי הערך הזה לא יכול להיות פתרון.', f: 'alg' };
      var d = g ? M.polyDeg(g, v) : -1, hasParen = g && (M.has(I.L, function (n) { return n.t === '*' && (n.b.t === '()' || n.a.t === '()'); }) || M.has(I.R, function (n) { return n.t === '*' && (n.b.t === '()' || n.a.t === '()'); }));
      var lv = g ? M.namesOf(I.L).length : 0, rv = g ? M.namesOf(I.R).length : 0;
      if (hasParen && d === 1) return { t: 'מה הצעד הראשון כשיש סוגריים?', t2: 'פותחים את הסוגריים: כופלים את מה שבחוץ בכל איבר שבפנים. שימו לב לסימנים.' };
      if (d === 1) {
        if (lv && rv) return { t: 'איפה צריכים להיות כל האיברים עם ' + v + '?', t2: 'מעבירים את כל האיברים עם ' + v + ' לאגף אחד ואת המספרים לאגף השני. מי שעובר אגף, הסימן שלו מתהפך.' };
        return { t: 'כמעט שם! נשאר צעד אחד.', t2: 'מחלקים את שני האגפים במקדם של ' + v + ' (המספר שצמוד אליו).' };
      }
      if (d === 2) {
        var R0 = I.R.t === 'n' && I.R.v === 0, L0 = I.L.t === 'n' && I.L.v === 0;
        if (!R0 && !L0) return { t: 'זו משוואה ריבועית. מה עושים קודם במשוואה כזאת?', t2: 'מעבירים הכול לאגף אחד, כך שבאגף השני יישאר 0. מסדרים מהחזקה הגבוהה לנמוכה.', f: 'alg' };
        if (I.L.t === '*' || I.L.t === '^') return { t: 'מכפלה שווה 0. מה זה אומר על הגורמים?', t2: 'מכפלה שווה 0 כשאחד הגורמים שווה 0. משווים כל סוגריים ל-0, וכותבים את הפתרונות עם "או" ביניהם.', f: 'alg' };
        var z = {}; z[v] = 0; var c0 = NaN; try { z.$deg = false; c0 = M.ev(g, z); } catch (_) {}
        if (Math.abs(c0) < 1e-12) return { t: 'שימו לב: אין כאן מספר חופשי. מה משותף לכל האיברים?', t2: 'מוציאים ' + v + ' כגורם משותף: ' + v + '(…)=0. ומכפלה שווה 0 כשאחד הגורמים שווה 0.', f: 'alg' };
        return { t: 'משוואה ריבועית שאגף אחד שלה 0. איזו דרך פתרון מתאימה?', t2: 'מזהים את a, b ו-c ומציבים בנוסחת השורשים. אפשר גם לנסות פירוק לגורמים: שני מספרים שהמכפלה שלהם c והסכום שלהם b (כש-a=1).', f: 'alg' };
      }
      if (d >= 3) return { t: 'משוואה ממעלה ' + d + '. אפשר להוציא משהו משותף?', t2: 'מנסים להוציא גורם משותף, או לנחש פתרון שלם קטן (1, −1, 2) ולהציב. משוואה דו-ריבועית (x⁴ ו-x²): מציבים t=x².' };
    }
    return { t: 'מה הצעד הקטן הבא שאפשר לעשות?', t2: 'פתיחת סוגריים, העברת אגף, או הצבה. כותבים אותו בשורה חדשה, והמחברת תבדוק.' };
  }
  function hintBtn(bt, cls, label, fn) { var b = el('button', 'btn btn-sm ' + cls, label); b.type = 'button'; b.addEventListener('click', fn); bt.appendChild(b); return b; }
  // רמז לתרגיל בשלבים
  function showAlgHint() {
    var h = localHint(), box = hintEl;
    box.hidden = false; box.innerHTML = '';
    box.appendChild(el('p', 'mb-ht', '💡 ' + esc(h.t)));
    var bt = el('div', 'btns'); box.appendChild(bt);
    var nb = null, ab = null;
    function addF() { if (h.f && !bt.querySelector('.mb-fb')) { var fb = hintBtn(bt, 'mb-fb', '📐 ' + esc(F[h.f][0]), function () { openF(h.f); }); bt.insertBefore(fb, bt.firstChild); } }
    function step3() {
      used('hint_next');
      var s = null; try { s = M.nextStep(A.rows, { deg: A.deg }); } catch (_) {}
      nb.remove();
      if (s && s.fix) { box.insertBefore(el('p', 'mb-ht', '👀 קודם מתקנים את שורה ' + s.fix + ' (עם סימן השאלה). אחרי התיקון אפשר לבקש שוב את הצעד הבא.'), bt); return; }
      if (s && s.done) { box.insertBefore(el('p', 'mb-ht', s.simp ? '👀 הביטוי כבר מפושט עד הסוף. כל הכבוד!' : '👀 אין צעד נוסף: הגעתם לסוף. 🎉'), bt); return; }
      if (s && s.line) { showStep(s.line, s.why, !!s.text); return; }
      // אין צעד מקומי – העזרה החכמה כותבת את השורה הבאה
      var wait = el('p', 'mb-ht', '⏳ מחפש את הצעד הבא…'); box.insertBefore(wait, bt);
      var lines = [], marks = [];
      A.rows.forEach(function (r, i) { if (r.trim()) { lines.push(r); marks.push((lastRes[i] && lastRes[i].mark) || ''); } });
      post('/hint', { mode: 'alg', level: 'next', question: lines[0] + (A.ask ? '  (' + A.ask + ')' : ''), lines: lines.slice(1), marks: marks.slice(1) }).then(function (x) {
        wait.remove(); var j = x.j || {};
        if (x.s !== 200 || j.error) { box.insertBefore(el('p', 'mb-aierr', esc(aiErr(x))), bt); return; }
        if (j.step) showStep(j.step, j.hint, false, true);
        else if (j.hint) box.insertBefore(el('div', 'mb-aih', '<p>🤖 ' + esc(j.hint) + '</p>'), bt);
      }).catch(function () { wait.remove(); box.insertBefore(el('p', 'mb-aierr', 'אין חיבור לאינטרנט. הבדיקה של כל שורה עובדת גם בלי.'), bt); });
    }
    function showStep(line, why, isText, ai) {
      var d = el('div', 'mb-next');
      d.appendChild(el('p', 'mb-ht', (ai ? '🤖 ' : '👀 ') + 'הצעד הבא' + (why ? ': ' + esc(why) : ':')));
      var m = el('div', 'mb-fm');
      if (isText) { m.textContent = line; }
      else { m.setAttribute('dir', 'ltr'); var RI = M.readLine(line, { deg: A.deg }); if (RI.tex) tex(m, RI.tex, true); else m.textContent = line; }
      d.appendChild(m);
      if (!isText) {
        var ins = el('button', 'btn btn-sm', '✏️ לכתוב את זה בשורה הבאה'); ins.type = 'button';
        ins.addEventListener('click', function () {
          var k = A.rows.length; while (k > 1 && !A.rows[k - 1].trim()) k--;
          A.rows.splice(k, 0, line); if (A.rows[A.rows.length - 1].trim()) A.rows.push('');
          renderRows(k + 1); save(); hideHint(); used('hint_insert');
        });
        d.appendChild(ins);
      }
      box.insertBefore(d, bt);
    }
    if (h.end) { addF(); return; }
    var mb = hintBtn(bt, 'mb-more', '💡 עוד רמז', function () {
      used('hint2'); mb.remove(); addF();
      box.insertBefore(el('p', 'mb-ht', '💡💡 ' + esc(h.t2 || h.t)), bt);
      nb = hintBtn(bt, 'mb-nextb', '👀 הראו לי את הצעד הבא', step3);
      ab = hintBtn(bt, 'mb-ai', '🤖 רמז חכם יותר', function () { aiHintAlg(box, ab); });
    });
    if (!h.t2) mb.click();
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function showHint(h, box, aiFn) {
    box.hidden = false; box.innerHTML = '';
    box.appendChild(el('p', 'mb-ht', '💡 ' + esc(h.t)));
    var bt = el('div', 'btns');
    if (h.f) { var fb = el('button', 'btn btn-sm', '📐 ' + esc(F[h.f][0])); fb.type = 'button'; fb.addEventListener('click', function () { openF(h.f); }); bt.appendChild(fb); }
    if (aiFn) { var ab = el('button', 'btn btn-sm mb-ai', '🤖 רמז חכם יותר'); ab.type = 'button'; ab.addEventListener('click', function () { aiFn(box, ab); }); bt.appendChild(ab); }
    box.appendChild(bt);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  $('mb-hintb').addEventListener('click', function () { used('hint'); showAlgHint(); });

  // ---------- בינה מלאכותית (השרת של הפותר) ----------
  function post(path, body) {
    return fetch(API + path, { method: 'POST', headers: (function (h) { try { var c = localStorage.getItem('kelim-partner'); if (c) h['x-kelim-partner'] = c; } catch (e) {} return h; })({ 'content-type': 'application/json' }), body: JSON.stringify(body) })
      .then(function (r) { return r.text().then(function (t) { var j = {}; try { j = JSON.parse(t.trim() || '{}'); } catch (_) {} return { s: r.status, j: j }; }); });
  }
  function aiErr(x) {
    var j = x.j || {};
    if (x.s === 429 || j.error === 'quota') return 'הגעתם למכסה היומית של העזרה החכמה. מחר אפשר שוב. הרמז הרגיל והבדיקה של כל שורה עובדים תמיד.';
    if (j.name && !j.error) return 'העזרה החכמה עוד לא פעילה. הרמז הרגיל והבדיקה של כל שורה עובדים תמיד.';
    return j.busy ? 'העזרה החכמה עמוסה כרגע. אפשר לנסות שוב בעוד כמה דקות.' : 'העזרה החכמה לא זמינה כרגע. אפשר לנסות שוב בעוד רגע.';
  }
  function aiBox(box, btn, path, body, render) {
    btn.disabled = true; btn.textContent = '⏳ חושב…';
    used('ai_' + path.slice(1));
    post(path, body).then(function (x) {
      btn.remove();
      var j = x.j || {};
      if (x.s !== 200 || j.error || !render(j)) { box.appendChild(el('p', 'mb-aierr', esc(aiErr(x)))); }
    }).catch(function () { btn.disabled = false; btn.textContent = '🤖 לנסות שוב'; box.appendChild(el('p', 'mb-aierr', 'אין חיבור לאינטרנט. הבדיקה של כל שורה עובדת גם בלי.')); });
  }
  function aiHintAlg(box, btn) {
    var lines = [], marks = [];
    A.rows.forEach(function (r, i) { if (r.trim()) { lines.push(r); marks.push((lastRes[i] && lastRes[i].mark) || ''); } });
    if (!lines.length) return;
    aiBox(box, btn, '/hint', { mode: 'alg', question: lines[0] + (A.ask ? '  (' + A.ask + ')' : ''), lines: lines.slice(1), marks: marks.slice(1) }, function (j) {
      if (!j.hint) return false;
      var d = el('div', 'mb-aih');
      d.appendChild(el('p', '', '🤖 ' + esc(j.hint)));
      if (j.formula) { var m = el('div', 'mb-fm'); m.setAttribute('dir', 'ltr'); tex(m, j.formula, true); d.appendChild(m); }
      box.appendChild(d); return true;
    });
  }

  // ---------- להתחיל מצילום: מעתיקים תרגיל מדף או מספר לשורה הראשונה (השרת של הפותר, /read) ----------
  var camB = $('mb-cam'), camF = $('mb-camf');
  (function () { // הכפתור מופיע רק כשהשרת כבר יודע לקרוא צילומים
    var c = null; try { c = sessionStorage.getItem('mb-read'); } catch (_) {}
    if (c === '1') { camB.hidden = false; return; }
    if (c === '0') return;
    fetch(API + '/ping').then(function (r) { return r.json(); }).then(function (j) {
      try { sessionStorage.setItem('mb-read', j.read ? '1' : '0'); } catch (_) {}
      if (j.read) camB.hidden = false;
    }).catch(function () {});
  })();
  camB.addEventListener('click', function () { camF.click(); });
  camF.addEventListener('change', function () { readPhoto(this.files && this.files[0]); this.value = ''; });
  rowsEl.addEventListener('paste', function (e) { // הדבקת צילום מסך בשורת התרגיל
    if (camB.hidden || HW || !e.target.classList.contains('mb-in')) return;
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var j = 0; j < items.length; j++) if (items[j].kind === 'file' && /^image\//.test(items[j].type)) { e.preventDefault(); readPhoto(items[j].getAsFile()); return; }
  });
  function readPhoto(file) {
    if (!file || !/^image\//.test(file.type)) return;
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var max = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      var d = c.toDataURL('image/jpeg', 0.85); URL.revokeObjectURL(url);
      sendPhoto(d);
    };
    img.onerror = function () { URL.revokeObjectURL(url); flash('לא הצלחתי לפתוח את התמונה. אפשר לנסות צילום אחר.'); };
    img.src = url;
  }
  function sendPhoto(dataUrl) {
    hintEl.hidden = false; hintEl.innerHTML = '';
    var top = el('div', 'mb-camp'), im = el('img'); im.src = dataUrl; im.alt = 'הצילום'; top.appendChild(im);
    var st = el('p', 'mb-ht', '⏳ קורא את התרגיל מהצילום…'); top.appendChild(st); hintEl.appendChild(top);
    hintEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    camB.disabled = true; used('photo');
    post('/read', { image: { mime: 'image/jpeg', data: dataUrl.split(',')[1] } }).then(function (x) {
      camB.disabled = false;
      var j = x.j || {};
      if (x.s === 429 || j.error === 'quota') { st.textContent = 'הגעתם למכסה היומית של הצילומים. מחר אפשר שוב, ובינתיים מקלידים את התרגיל בשורה הראשונה.'; return; }
      if (x.s !== 200 || j.error) { st.textContent = j.busy ? 'הקריאה מצילום עמוסה כרגע. אפשר לנסות שוב בעוד כמה דקות, או להקליד את התרגיל.' : 'לא הצלחתי לקרוא את הצילום כרגע. אפשר לנסות שוב, או להקליד את התרגיל.'; return; }
      var its = j.items || [];
      if (!j.readable || !its.length) { st.textContent = (j.why ? j.why + ' ' : '') + 'לא מצאתי תרגיל בצילום. מצלמים מקרוב, ישר מעל הדף ועם אור טוב. אפשר גם להקליד.'; return; }
      if (its.length === 1) { useRead(its[0]); return; }
      st.textContent = 'מצאתי ' + its.length + ' תרגילים. על איזה עובדים?';
      var list = el('div', 'mb-pick');
      its.forEach(function (it) {
        var b = el('button', ''); b.type = 'button';
        b.innerHTML = (it.label ? '<small>' + esc(it.label) + '.</small>' : '') + '<bdi dir="ltr">' + esc(it.line) + '</bdi>' + (it.ask ? '<small>' + esc(it.ask) + '</small>' : '');
        var RI = M.readLine(it.line, { deg: A.deg }); if (RI.tex) tex(b.querySelector('bdi'), RI.tex);
        b.addEventListener('click', function () { useRead(it); });
        list.appendChild(b);
      });
      hintEl.appendChild(list);
    }).catch(function () { camB.disabled = false; st.textContent = 'אין חיבור לאינטרנט. אפשר להקליד את התרגיל, והבדיקה של כל שורה עובדת גם בלי.'; });
  }
  function useRead(it) {
    archive(); A.rows = [it.line, '']; A.ask = it.ask || ''; renderRows(1); save(); used('photo_used');
    var bad = M.readLine(it.line, { deg: A.deg }).kind === 'bad';
    hintEl.hidden = false; hintEl.innerHTML = '';
    hintEl.appendChild(el('p', 'mb-ht', esc(bad ? '📷 התרגיל הועתק, אבל משהו בו לא נקרא טוב. מתקנים את שורת התרגיל לפי הדף.' : '📷 ✓ התרגיל הועתק מהצילום' + (it.ask ? ' (' + it.ask + ')' : '') + '. בודקים שהוא כמו בדף, ומתחילים לפתור בשורה הבאה.')));
  }

  // ---------- תרגיל מהבגרות בלחיצה: המחוללים של "המסלול שלי" (window.MX מ-limudim-math.js, נטען רק כשצריך) ----------
  // רק נושאים שאפשר לפתור בהם שורה אחרי שורה, ורק השלבים שהמחברת יודעת לקרוא (נבדק ב-test-tricky.js)
  var BAG = { mishvaa: [2, 3], pilug: [2, 3], shorashim: [1, 2, 3], maarechet: [1, 2, 3], chezkot: [2, 3], nigzeret: [1, 2, 3], mashik: [1, 2, 3], kitzon: [1, 2, 3],
    integral: [2, 3], logaritm: [1, 2, 3], parabola: [1, 2, 3], maagal: [1, 3], parametr: [1, 2, 3], 'exp-ln': [1, 2, 3], 'trig-nigzeret': [1, 2, 3], 'shoresh-f': [2, 3], rationalit: [1, 2, 3] };
  var mxWait = null;
  function loadMx() {
    if (window.MX) return Promise.resolve(window.MX);
    if (mxWait) return mxWait;
    mxWait = new Promise(function (ok, no) {
      var sc = document.createElement('script'); sc.src = $('mb-mxsrc').getAttribute('href');
      sc.onload = function () { window.MX ? ok(window.MX) : no(); }; sc.onerror = function () { mxWait = null; no(); };
      document.head.appendChild(sc);
    });
    return mxWait;
  }
  function bagTopics(MX, q) {
    return MX.T.filter(function (t) { return BAG[t.id] && (q === '*' || (q === 'base' ? !t.bg : (t.q || []).indexOf(q) >= 0)); });
  }
  function bagPanel() {
    used('bagrut_open');
    hintEl.hidden = false; hintEl.innerHTML = '<p class="mb-ht">⏳ טוען את מאגר התרגילים…</p>';
    hintEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    loadMx().then(function (MX) {
      var qs = MX.QN.filter(function (q) { return bagTopics(MX, q[0]).length; });
      var cur = store('mb-bq') || '*';
      hintEl.innerHTML = '';
      hintEl.appendChild(el('p', 'mb-ht', '🎓 תרגיל מהבגרות: בוחרים שאלון ונושא, והתרגיל נכנס לשורה הראשונה.'));
      var row = el('div', 'mb-bagsel');
      var sq = el('select'); sq.setAttribute('aria-label', 'שאלון');
      sq.innerHTML = '<option value="*">כל השאלונים</option><option value="base">יסודות: משוואות, סוגריים ומערכות</option>' + qs.map(function (q) { return '<option value="' + q[0] + '">' + esc(q[1]) + '</option>'; }).join('');
      sq.value = cur; if (sq.value !== cur) sq.value = '*';
      var stp = el('select'); stp.setAttribute('aria-label', 'נושא');
      function fillT() { stp.innerHTML = '<option value="*">כל הנושאים</option>' + bagTopics(MX, sq.value).map(function (t) { return '<option value="' + t.id + '">' + esc(t.em + ' ' + t.name) + '</option>'; }).join(''); var lt = store('mb-bt'); if (lt) { stp.value = lt; if (stp.value !== lt) stp.value = '*'; } }
      fillT();
      sq.addEventListener('change', function () { store('mb-bq', sq.value); fillT(); });
      stp.addEventListener('change', function () { store('mb-bt', stp.value); });
      row.appendChild(sq); row.appendChild(stp); hintEl.appendChild(row);
      var bt = el('div', 'btns'); hintEl.appendChild(bt);
      hintBtn(bt, 'btn-gold', '✏️ לתרגיל', function () { bagGo(MX, sq.value, stp.value); });
    }).catch(function () { hintEl.innerHTML = '<p class="mb-aierr">לא הצלחתי לטעון את מאגר התרגילים. בודקים את החיבור לאינטרנט ומנסים שוב.</p>'; });
  }
  function bagGo(MX, q, tid) {
    var pool = bagTopics(MX, q).filter(function (t) { return tid === '*' || t.id === tid; });
    if (!pool.length) pool = bagTopics(MX, '*');
    for (var k = 0; k < 12; k++) {
      var t = pool[Math.floor(Math.random() * pool.length)], lvs = BAG[t.id], lv = lvs[Math.floor(Math.random() * lvs.length)], g;
      try { g = t.gen(lv); } catch (_) { continue; }
      var c = M.fromMx(g.ex), I = M.readLine(c.line, { deg: A.deg });
      if (!c.line || I.kind === 'bad' || I.kind === 'text') continue;
      archive(); A.rows = [c.line, '']; A.ask = (t.em + ' ' + t.name) + (c.ask ? ' · ' + c.ask : ''); renderRows(1); save();
      hintEl.hidden = false; hintEl.innerHTML = '';
      hintEl.appendChild(el('p', 'mb-ht', '🎓 ' + esc(t.name) + (c.ask ? ': ' + esc(c.ask) : '. פותרים שורה אחרי שורה.')));
      var bt = el('div', 'btns'); hintEl.appendChild(bt);
      hintBtn(bt, '', '🎲 תרגיל אחר', function () { bagGo(MX, q, tid); });
      hintBtn(bt, '', '⚙️ שאלון ונושא', bagPanel);
      used('bagrut_ex');
      return;
    }
    flash('לא מצאתי תרגיל מתאים. נסו נושא אחר.');
  }
  $('mb-bag').addEventListener('click', bagPanel);

  // =====================================================================
  //  הוכחה: טענה | נימוק
  // =====================================================================
  var P = load('mb-prf', null) || { given: '', prove: '', rows: [{ c: '', r: '', o: '' }] };
  if (!P.rows || !P.rows.length) P.rows = [{ c: '', r: '', o: '' }];
  var prowsEl = $('mb-prows'), pres = $('mb-presult'), psaveT = null;
  function psave() { if (shared) return; clearTimeout(psaveT); psaveT = setTimeout(function () { store('mb-prf', JSON.stringify(P)); }, 400); }
  $('mb-given').value = P.given || ''; $('mb-prove').value = P.prove || '';
  $('mb-given').addEventListener('input', function () { P.given = this.value; psave(); });
  $('mb-prove').addEventListener('input', function () { P.prove = this.value; psave(); });

  function reasonSelect() {
    var s = el('select', 'mb-reason'), h = '<option value="">בוחרים נימוק…</option>';
    REASONS.forEach(function (g) { h += '<optgroup label="' + esc(g[0]) + '">' + g[1].map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('') + '</optgroup>'; });
    h += '<option value="__o">נימוק אחר (לכתוב)</option>';
    s.innerHTML = h; s.setAttribute('aria-label', 'נימוק'); return s;
  }
  function prenderRows(focusI) {
    prowsEl.innerHTML = '';
    P.rows.forEach(function (row, i) { prowsEl.appendChild(prowEl(row, i)); });
    if (focusI != null) { var c = prowsEl.children[focusI] && prowsEl.children[focusI].querySelector('.mb-claim'); if (c) setCaret(c, c.value.length); }
  }
  function prowEl(row, i) {
    var li = el('li', 'mb-prow');
    li.innerHTML = '<span class="mb-n">' + (i + 1) + '</span><div class="mb-pc"><input class="mb-claim" dir="auto" autocomplete="off" spellcheck="false" aria-label="טענה ' + (i + 1) + '" placeholder="טענה, למשל: AB=AC"><div class="mb-prev" dir="ltr"></div></div>' +
      '<div class="mb-pr"></div><span class="mb-mk"></span><span class="mb-rb no-print"><button type="button" class="mb-mic" aria-label="להגיד את הטענה בקול">🎤</button><button type="button" class="mb-del" aria-label="למחוק את השורה">✕</button></span><p class="mb-msg"></p>';
    var c = li.querySelector('.mb-claim'), sel = reasonSelect(), oth = el('input', 'mb-other'), pr = li.querySelector('.mb-pr');
    c.value = row.c || '';
    oth.placeholder = 'הנימוק במילים שלך'; oth.setAttribute('aria-label', 'נימוק אחר'); oth.hidden = true;
    if (row.r === '__o') { sel.value = '__o'; oth.hidden = false; oth.value = row.o || ''; }
    else if (row.r) { sel.value = row.r; if (sel.value !== row.r) { sel.value = '__o'; oth.hidden = false; oth.value = row.r; } }
    pr.appendChild(sel); pr.appendChild(oth);
    claimPrev(li);
    c.addEventListener('input', function () { P.rows[pidx(li)].c = c.value; claimPrev(li); psave(); used('proof_write'); });
    sel.addEventListener('change', function () { var k = pidx(li); P.rows[k].r = sel.value; oth.hidden = sel.value !== '__o'; if (!oth.hidden) oth.focus(); psave(); });
    oth.addEventListener('input', function () { P.rows[pidx(li)].o = oth.value; psave(); });
    c.addEventListener('keydown', function (e) {
      var k = pidx(li);
      if (e.key === 'Enter') { e.preventDefault(); P.rows.splice(k + 1, 0, { c: '', r: '', o: '' }); prenderRows(k + 1); psave(); }
      else if (e.key === 'Backspace' && !c.value && P.rows.length > 1 && k > 0) { e.preventDefault(); P.rows.splice(k, 1); prenderRows(k - 1); psave(); }
    });
    var done = function () {}; micFor(li.querySelector('.mb-mic'), c, done);
    li.querySelector('.mb-del').addEventListener('click', function () { var k = pidx(li); if (P.rows.length <= 1) P.rows[0] = { c: '', r: '', o: '' }; else P.rows.splice(k, 1); prenderRows(); psave(); });
    return li;
  }
  function pidx(li) { return Array.prototype.indexOf.call(prowsEl.children, li); }
  function claimPrev(li) {
    var c = li.querySelector('.mb-claim').value, pv = li.querySelector('.mb-prev');
    pv.textContent = '';
    if (!/[\^√]|sqrt|sin|cos|tan|\/|\*/.test(c) || /[א-ת]/.test(c)) return; // רק כשיש נוסחה של ממש
    var I = M.readLine(c.replace(/[△≅∼∥⊥]/g, ' '), { deg: true });
    if (I.tex) tex(pv, I.tex);
  }
  $('mb-padd').addEventListener('click', function () { P.rows.push({ c: '', r: '', o: '' }); prenderRows(P.rows.length - 1); psave(); });

  // ---------- שרטוט להוכחה: קווים, יד חופשית ואותיות. נשמר עם ההוכחה (P.draw), במידות 1000×600 ----------
  var DW = 1000, DH = 600, LETTERS = 'ABCDEFGHKMNOP';
  var dcv = $('mb-dcv'), dctx = dcv.getContext('2d'), dTool = 'line', dLet = 'A', dCur = null, dBox = $('mb-draw');
  function dItems() { if (!P.draw || !Array.isArray(P.draw.i)) P.draw = { i: [] }; return P.draw.i; }
  function dSize() {
    var w = dcv.clientWidth; if (!w) return false;
    var r = window.devicePixelRatio || 1, h = Math.round(w * DH / DW);
    if (dcv.width !== Math.round(w * r)) { dcv.width = Math.round(w * r); dcv.height = Math.round(h * r); }
    return true;
  }
  function dDraw() {
    if (!dSize()) return;
    var k = dcv.width / DW, g = dctx;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, dcv.width, dcv.height); g.setTransform(k, 0, 0, k, 0, 0);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1d2738'; g.fillStyle = '#1d2738';
    var all = dItems().concat(dCur ? [dCur] : []);
    all.forEach(function (it) {
      if (it.t === 'a') { g.font = 'bold 40px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.c, it.p[0], it.p[1]); return; }
      g.lineWidth = it.t === 'l' ? 4 : 3.5; g.beginPath();
      it.p.forEach(function (q, j) { if (j) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
      g.stroke();
      if (it.t === 'l') it.p.forEach(function (q) { g.beginPath(); g.arc(q[0], q[1], 5, 0, 7); g.fill(); });
    });
    dBox.classList.toggle('has', !!dItems().length);
  }
  function dPt(e) { var b = dcv.getBoundingClientRect(); return [Math.round((e.clientX - b.left) * DW / b.width), Math.round((e.clientY - b.top) * DH / b.height)]; }
  function dSnap(q) { // נצמדים לקצה של קו קיים
    var best = null, bd = 30;
    dItems().forEach(function (it) { if (it.t === 'l') it.p.forEach(function (z) { var d = Math.hypot(z[0] - q[0], z[1] - q[1]); if (d < bd) { bd = d; best = z; } }); });
    return best ? best.slice() : q;
  }
  function dSave() { psave(); dDraw(); used('proof_draw'); }
  dcv.addEventListener('pointerdown', function (e) {
    if (shared) return;
    e.preventDefault(); try { dcv.setPointerCapture(e.pointerId); } catch (_) {}
    var q = dPt(e);
    if (dTool === 'txt') {
      dItems().push({ t: 'a', c: dLet, p: q });
      var used2 = dItems().filter(function (it) { return it.t === 'a'; }).map(function (it) { return it.c; });
      var nx = LETTERS.split('').filter(function (c) { return used2.indexOf(c) < 0; })[0]; if (nx) setLet(nx);
      dSave(); return;
    }
    dCur = dTool === 'line' ? { t: 'l', p: [dSnap(q), q] } : { t: 'f', p: [q] };
    dDraw();
  });
  dcv.addEventListener('pointermove', function (e) {
    if (!dCur) return;
    var q = dPt(e);
    if (dCur.t === 'l') dCur.p[1] = q;
    else { var l = dCur.p[dCur.p.length - 1]; if (Math.hypot(l[0] - q[0], l[1] - q[1]) >= 4) dCur.p.push(q); }
    dDraw();
  });
  function dEnd() {
    if (!dCur) return;
    var it = dCur; dCur = null;
    if (it.t === 'l') { it.p[1] = dSnap(it.p[1]); if (Math.hypot(it.p[0][0] - it.p[1][0], it.p[0][1] - it.p[1][1]) < 12) { dDraw(); return; } }
    else if (it.p.length < 2) { dDraw(); return; }
    dItems().push(it); dSave();
  }
  dcv.addEventListener('pointerup', dEnd); dcv.addEventListener('pointercancel', dEnd);
  function setLet(c) { dLet = c; $('mb-dlet').textContent = c; }
  function setTool(t) { dTool = t; Array.prototype.forEach.call(document.querySelectorAll('.mb-dtools [data-tool]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tool') === t ? 'true' : 'false'); }); }
  Array.prototype.forEach.call(document.querySelectorAll('.mb-dtools [data-tool]'), function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-tool');
      if (t === 'txt' && dTool === 'txt') setLet(LETTERS[(LETTERS.indexOf(dLet) + 1) % LETTERS.length]); // לחיצה נוספת – האות הבאה
      setTool(t);
    });
  });
  $('mb-dtri').addEventListener('click', function () {
    if (shared) return;
    var A1 = [500, 70], B1 = [140, 520], C1 = [860, 520];
    dItems().push({ t: 'l', p: [A1, B1] }, { t: 'l', p: [B1, C1] }, { t: 'l', p: [C1, A1] },
      { t: 'a', c: 'A', p: [500, 32] }, { t: 'a', c: 'B', p: [100, 555] }, { t: 'a', c: 'C', p: [900, 555] });
    setLet('D'); setTool('line'); dSave();
  });
  $('mb-dundo').addEventListener('click', function () { if (dItems().length) { dItems().pop(); dSave(); } });
  $('mb-dclr').addEventListener('click', function () { if (dItems().length && confirm('למחוק את כל השרטוט?')) { P.draw = { i: [] }; setLet('A'); dSave(); } });
  dBox.addEventListener('toggle', function () { if (dBox.open) { dDraw(); used('proof_draw_open'); } });
  window.addEventListener('beforeprint', function () { if (dItems().length) { dBox.open = true; dDraw(); } });
  var dResT = null; window.addEventListener('resize', function () { clearTimeout(dResT); dResT = setTimeout(dDraw, 150); });
  function dLoad() { // אחרי שהוכחה נטענת או מתחלפת
    var has = !!(P.draw && P.draw.i && P.draw.i.length);
    if (has) dBox.open = true;
    var ls = dItems().filter(function (it) { return it.t === 'a'; }).map(function (it) { return it.c; });
    setLet(LETTERS.split('').filter(function (c) { return ls.indexOf(c) < 0; })[0] || 'A');
    dDraw();
  }

  // ---------- בדיקה מקומית ----------
  function normSeg(s) {
    return String(s || '').replace(/\s+/g, '').replace(/[״"׳']/g, '')
      .replace(/(∠|△|זווית|משולש)?([A-Z])([A-Z])([A-Z])?/g, function (m, pre, a, b, c) {
        if (pre === '∠' || pre === 'זווית') return '∠' + (c ? (a < c ? a + b + c : c + b + a) : a + b);
        if (pre === '△' || pre === 'משולש') return '△' + [a, b, c].filter(Boolean).sort().join('');
        if (!c) return [a, b].sort().join('');
        return m;
      }).replace(/°/g, '');
  }
  function sameClaim(a, b) {
    var x = normSeg(a), y = normSeg(b);
    if (!x || !y) return false;
    if (x === y) return true;
    var xs = x.split(/=|≅|∼|∥|⊥/).sort().join('|'), ys = y.split(/=|≅|∼|∥|⊥/).sort().join('|');
    return xs === ys && x.replace(/[^=≅∼∥⊥]/g, '') === y.replace(/[^=≅∼∥⊥]/g, '');
  }
  function inGiven(claim, given) {
    var g = normSeg(given), parts = String(given || '').split(/[.,;:\n]|\sו(?=[A-Z∠△])|\s+וגם\s+|\s+נתון\s+/);
    if (g.indexOf(normSeg(claim)) >= 0) return true;
    return parts.some(function (p) { return sameClaim(p.replace(/^.*?(?=[A-Z∠△])/, ''), claim); });
  }
  function numericProof(rows) { // טענות עם מספרים: מחשבים לפי מה שכבר ידוע
    var known = {}, out = [];
    rows.forEach(function (row) {
      var r = { mark: '', msg: '' }, c = String(row.c || '').replace(/≈/g, '=').replace(/[△≅∼∥⊥]/g, '#');
      out.push(r);
      if (!c.trim() || /#|[א-ת]/.test(c) || c.indexOf('=') < 0) return;
      var sides;
      try { sides = c.split('=').map(function (s) { return M.parse(s.replace(/∠\s*([A-Z]{1,3})/g, function (m, n) { return 'ang_' + angKey(n); }).replace(/\b([A-Z])([A-Z])\b/g, function (m, a, b) { return [a, b].sort().join(''); })); }); } catch (e) { return; }
      if (sides.length < 2) return;
      var names = M.namesOf.apply(null, sides).filter(function (n) { return !(n in known); });
      var env = { $deg: true }; for (var k in known) env[k] = known[k];
      if (!names.length) {
        var vals = sides.map(function (s) { try { return M.ev(s, env); } catch (_) { return NaN; } });
        if (vals.some(function (v) { return !isFinite(v); })) return;
        var ok = vals.every(function (v) { return Math.abs(v - vals[0]) <= 1e-6 * Math.max(1, Math.abs(v)) || roundedClose(sides, vals); });
        r.mark = ok ? 'ok' : 'warn'; r.msg = ok ? 'החישוב נכון.' : 'כדאי לבדוק את החישוב: יוצא ' + vals.map(M.nice).join(' מול ') + '.';
        return;
      }
      if (names.length === 1 && sides.length === 2) {
        var u = names[0], g = M.eqFn(sides[0], sides[1]);
        var rs = posRoots(function (x) { var e = {}; for (var q in env) e[q] = env[q]; e[u] = x; try { return M.ev(g, e); } catch (_) { return NaN; } });
        if (rs.length === 1) { known[u] = rs[0]; if (sides[0].t !== 'v' || M.namesOf(sides[1]).length) r.msg = 'מכאן: ⁦' + varName(u) + ' ≈ ' + M.nice(rs[0]) + '⁩.'; }
        else if (rs.length > 1) r.msg = 'יש כאן יותר מפתרון אחד (' + rs.slice(0, 3).map(M.nice).join(', ') + '). כדאי לבדוק איזה מתאים.';
      }
    });
    return out;
  }
  // שורשים חיוביים בלבד (אורכים וזוויות), סריקה לוגריתמית מהירה מ-0.001 עד 100000
  function posRoots(f) {
    var R = [], px = 0.001, pv = f(px);
    for (var i = 1; i <= 1600 && R.length < 6; i++) {
      var x = Math.pow(10, -3 + 8 * i / 1600), v = f(x);
      if (isFinite(v) && isFinite(pv)) {
        if (v === 0) R.push(x);
        else if ((v < 0) !== (pv < 0) && pv !== 0) {
          var a = px, b = x, fa = pv;
          for (var it = 0; it < 80; it++) { var m = (a + b) / 2, fm = f(m); if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m; }
          var r = (a + b) / 2;
          if (Math.abs(f(r)) < 1e-6 * Math.max(1, Math.abs(pv), Math.abs(v))) R.push(r);
        }
      }
      px = x; pv = v;
    }
    return R;
  }
  function plural(n, one, many) { return n === 1 ? one : n + ' ' + many; }
  function angKey(n) { return n.length === 3 ? (n[0] < n[2] ? n : n[2] + n[1] + n[0]) : n; }
  function varName(u) { return /^ang_/.test(u) ? '∠' + u.slice(4) : u; }
  function roundedClose(sides, vals) {
    var last = sides[sides.length - 1], m = last.t === 'n' && String(last.s || '').match(/\.(\d+)$/);
    return !!m && Math.abs(vals[0] - last.v) <= 0.51 * Math.pow(10, -m[1].length);
  }
  function reasonOf(row) { return row.r === '__o' ? (row.o || '') : (row.r || ''); }
  function localProof() {
    var rows = P.rows.filter(function (r) { return (r.c || '').trim() || reasonOf(r); }), notes = rows.map(function () { return { mark: '', msg: '' }; });
    var num = numericProof(rows), anyCong = -1, anySim = -1, ok = 0, warn = 0;
    rows.forEach(function (row, i) {
      var n = notes[i], rs = reasonOf(row), msgs = [];
      if (!(row.c || '').trim()) { n.mark = 'warn'; msgs.push('חסרה הטענה.'); }
      if (!rs) { n.mark = 'warn'; msgs.push('חסר נימוק. בבגרות כל טענה צריכה נימוק.'); }
      if (rs === 'נתון' && (row.c || '').trim() && P.given.trim() && !inGiven(row.c, P.given)) msgs.push('לא מצאתי את זה בנתונים. אם זה לא כתוב בנתון, צריך נימוק אחר.');
      if (/^חפיפת משולשים/.test(rs)) { if (i < 3) msgs.push('לחפיפה צריך שלושה נתונים (צלעות או זוויות) בשורות שלפני.'); anyCong = i; }
      if (/^דמיון משולשים/.test(rs)) { if (i < 2) msgs.push('לדמיון צריך לפחות שתי זוויות שוות (או יחס צלעות) בשורות שלפני.'); anySim = i; }
      if (/במשולשים חופפים/.test(rs) && anyCong < 0) { n.mark = 'warn'; msgs.push('קודם צריך שורה שמוכיחה שהמשולשים חופפים.'); }
      if (/במשולשים דומים/.test(rs) && anySim < 0) { n.mark = 'warn'; msgs.push('קודם צריך שורה שמוכיחה שהמשולשים דומים.'); }
      // נימוק שלא מתאים לצורת הנוסחה (סינוסים מול קוסינוסים)
      var cc = String(row.c || '');
      if (rs === 'משפט הסינוסים' && /cos/.test(cc) && !/sin/.test(cc)) { n.mark = 'warn'; msgs.push('בטענה יש cos של זווית וריבועי צלעות. זה משפט הקוסינוסים, לא הסינוסים.'); }
      if (rs === 'משפט הקוסינוסים' && /sin/.test(cc) && !/cos/.test(cc)) { n.mark = 'warn'; msgs.push('בטענה יש יחס של צלע ל-sin. זה משפט הסינוסים, לא הקוסינוסים.'); }
      if (rs === 'משפט פיתגורס' && /sin|cos/.test(cc)) { n.mark = 'warn'; msgs.push('בפיתגורס אין sin או cos. אולי התכוונתם למשפט הקוסינוסים?'); }
      if (num[i].mark) { if (num[i].mark === 'warn') n.mark = 'warn'; else if (!n.mark) n.mark = 'ok'; }
      if (num[i].msg) msgs.push(num[i].msg);
      if (!n.mark && (row.c || '').trim() && rs) n.mark = 'ok';
      n.msg = msgs.join(' ');
      if (n.mark === 'ok') ok++; else if (n.mark === 'warn') warn++;
    });
    var last = rows[rows.length - 1], reached = !!(last && P.prove.trim() && sameClaim(last.c, P.prove));
    return { rows: rows, notes: notes, reached: reached, ok: ok, warn: warn };
  }
  function paintProof(res, ai) {
    var map = [], k = 0;
    P.rows.forEach(function (r, i) { if ((r.c || '').trim() || reasonOf(r)) map.push(i); });
    Array.prototype.forEach.call(prowsEl.children, function (li) { li.classList.remove('ok', 'warn'); li.querySelector('.mb-mk').textContent = ''; li.querySelector('.mb-msg').textContent = ''; });
    res.notes.forEach(function (n, j) {
      var li = prowsEl.children[map[j]]; if (!li) return;
      var a = ai && ai[j], mark = n.mark, msg = n.msg;
      if (a) { if (a.ok === false) mark = 'warn'; if (a.note) msg = (msg ? msg + ' ' : '') + '🤖 ' + a.note; }
      li.classList.toggle('ok', mark === 'ok'); li.classList.toggle('warn', mark === 'warn');
      li.querySelector('.mb-mk').textContent = mark === 'ok' ? '✓' : mark === 'warn' ? '?' : '';
      li.querySelector('.mb-msg').textContent = msg;
    });
  }
  $('mb-pcheck').addEventListener('click', function () {
    used('proof_check');
    var res = localProof();
    paintProof(res);
    pres.hidden = false; pres.innerHTML = '';
    if (!res.rows.length) { pres.appendChild(el('p', 'mb-ht', 'עוד אין שורות בהוכחה. מתחילים מהנתונים: כל נתון בשורה משלו, עם הנימוק "נתון".')); return; }
    if (res.reached && !res.warn) showSupport();
    var head = res.reached && !res.warn ? '🎉 כל הכבוד! הגעתם למה שצריך להוכיח, ולכל שורה יש נימוק.' :
      res.reached ? 'הגעתם למה שצריך להוכיח. ' + (res.warn === 1 ? 'נשארה שורה אחת עם סימן שאלה, כדאי לעבור עליה.' : 'נשארו ' + res.warn + ' שורות עם סימן שאלה, כדאי לעבור עליהן.') :
      P.prove.trim() ? 'השורה האחרונה עוד לא מה שצריך להוכיח (' + P.prove.trim() + '). ' + (res.warn ? 'ויש ' + plural(res.warn, 'שורה אחת', 'שורות') + ' עם סימן שאלה.' : 'עד כאן נראה מסודר, ממשיכים.') :
      'כותבים למעלה מה צריך להוכיח, כדי שאוכל לבדוק אם הגעתם.';
    pres.appendChild(el('p', 'mb-ht', esc(head)));
    pres.appendChild(el('p', 'note', 'הבדיקה כאן בודקת מבנה, נימוקים וחישובים. היא לא מבינה שרטוט. "בדיקה חכמה" קוראת את כל ההוכחה ובודקת את ההיגיון.'));
    var bt = el('div', 'btns'), ab = el('button', 'btn btn-sm mb-ai', '🤖 בדיקה חכמה של ההוכחה'); ab.type = 'button';
    ab.addEventListener('click', function () {
      aiBox(pres, ab, '/check-proof', { given: P.given, prove: P.prove, rows: res.rows.map(function (r) { return { claim: r.c, reason: reasonOf(r) }; }) }, function (j) {
        if (!j.rows && !j.summary) return false;
        paintProof(res, j.rows || []);
        var d = el('div', 'mb-aih');
        var localWarn = res.notes.some(function (n) { return n.mark === 'warn'; });
        if (j.ok && localWarn) d.appendChild(el('p', '', '🤖 ההיגיון של ההוכחה נראה טוב. אבל בדף נשארו שורות עם סימן שאלה (למשל נימוק שלא מתאים לנוסחה). כדאי לתקן אותן, כי בבגרות נותנים ניקוד גם על הנימוק.'));
        else d.appendChild(el('p', '', (j.ok ? '🤖 ✓ ' : '🤖 ') + esc(j.summary || '')));
        if (j.missing) d.appendChild(el('p', 'note', 'מה חסר: ' + esc(j.missing)));
        pres.appendChild(d); return true;
      });
    });
    bt.appendChild(ab); pres.appendChild(bt);
    pres.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  function localProofHint() {
    var res = localProof(), rows = res.rows, prove = P.prove || '', last = rows[rows.length - 1];
    if (!P.given.trim()) return { t: 'כותבים קודם את הנתון ואת מה שצריך להוכיח. אפשר גם ללחוץ על אחת הדוגמאות.' };
    if (!rows.length) return { t: 'מתחילים מהנתונים: כל נתון בשורה משלו, עם הנימוק "נתון". אחר כך שואלים: מה אפשר להסיק מהם?' };
    if (res.reached) return { t: 'הגעתם למה שצריך להוכיח! 🎉 לוחצים "בדיקת ההוכחה" כדי לוודא שלכל שורה יש נימוק.' };
    var cong = rows.some(function (r) { return /^חפיפת/.test(reasonOf(r)); }), sim = rows.some(function (r) { return /^דמיון/.test(reasonOf(r)); });
    if (cong) return { t: 'המשולשים חופפים. עכשיו מסיקים מה שצריך: "במשולשים חופפים מול זוויות שוות מונחות צלעות שוות" (או להפך).', f: 'geo' };
    if (sim) return { t: 'המשולשים דומים. עכשיו כותבים את יחס הצלעות המתאימות, ומציבים את מה שידוע.', f: 'geo' };
    if (/sin|cos|[0-9]/.test(prove) && /[0-9]/.test(P.given)) return { t: 'יש כאן מספרים: שתי צלעות והזווית שביניהן או שלוש צלעות? משפט הקוסינוסים. צלע והזווית שמולה? משפט הסינוסים. כותבים את המשפט כטענה עם המספרים.', f: 'tri' };
    if (/∥/.test(prove)) return { t: 'כדי להוכיח שישרים מקבילים, מחפשים זוויות מתחלפות או מתאימות שוות.', f: 'geo' };
    if (/∠|90|⊥/.test(prove)) return { t: 'כדי להוכיח שזוויות שוות או ישרות: משולשים חופפים, זוויות בסיס במשולש שווה שוקיים, ישרים מקבילים, או זוויות היקפיות במעגל.', f: 'geo' };
    if (/[A-Z]{2}\s*=\s*[A-Z]{2}/.test(prove)) return { t: 'כדי להוכיח ששני קטעים שווים, מחפשים שני משולשים שהקטעים האלה צלעות בהם, ומוכיחים שהם חופפים (צ.ז.צ, ז.צ.ז או צ.צ.צ).', f: 'geo' };
    return { t: 'מה אפשר להסיק מהשורה האחרונה (' + (last && last.c || '') + ')? מחפשים משפט שמחבר אותה למה שצריך להוכיח.', f: 'geo' };
  }
  function aiHintProof(box, btn) {
    var rows = P.rows.filter(function (r) { return (r.c || '').trim(); }).map(function (r) { return { claim: r.c, reason: reasonOf(r) }; });
    aiBox(box, btn, '/hint', { mode: 'proof', question: 'נתון: ' + P.given + '\nצריך להוכיח: ' + P.prove, rows: rows }, function (j) {
      if (!j.hint) return false;
      box.appendChild(el('div', 'mb-aih', '<p>🤖 ' + esc(j.hint) + '</p>')); return true;
    });
  }
  $('mb-phint').addEventListener('click', function () { used('proof_hint'); showHint(localProofHint(), pres, aiHintProof); });
  $('mb-pform').addEventListener('click', function () { openF(/sin|cos|[0-9]/.test(P.given + P.prove) ? 'tri' : 'geo'); });
  $('mb-pprint').addEventListener('click', function () { used('print'); window.print(); });
  $('mb-pnew').addEventListener('click', function () { P = { given: '', prove: '', rows: [{ c: '', r: '', o: '' }], draw: { i: [] } }; $('mb-given').value = ''; $('mb-prove').value = ''; prenderRows(); psave(); pres.hidden = true; dLoad(); });
  var EXP = {
    shok: ['במשולש ABC נתון AB=AC. AD חוצה את הזווית BAC, והנקודה D על הצלע BC.', 'BD=DC'],
    kos: ['במשולש ABC נתון: AB=8, AC=5, ∠A=60°.', 'BC=7'],
    makbilit: ['ABCD מקבילית. האלכסונים AC ו-BD נחתכים בנקודה O.', 'AO=OC'],
    maagal: ['AB קוטר במעגל שמרכזו O. הנקודה C על המעגל (שונה מ-A ומ-B).', '∠ACB=90°']
  };
  Array.prototype.forEach.call(document.querySelectorAll('[data-px]'), function (b) {
    b.addEventListener('click', function () {
      var x = EXP[b.getAttribute('data-px')]; if (!x) return;
      P = { given: x[0], prove: x[1], rows: [{ c: '', r: '', o: '' }], draw: { i: [] } };
      $('mb-given').value = x[0]; $('mb-prove').value = x[1]; prenderRows(0); psave(); pres.hidden = true; dLoad(); used('proof_example');
    });
  });

  // =====================================================================
  //  התחלה
  // =====================================================================
  // ?demo=1 – מחברת לדוגמה (גם לקישור ששולחים לחבר). לא נשמרת עד שמשנים משהו.
  if (/[?&]demo=1/.test(location.search)) {
    A = { rows: ['2(x+3)=x+10', '2x+6=x+10', '2x-x=10+6', 'x=16'], deg: true };
    P = { given: EXP.kos[0], prove: EXP.kos[1], rows: [{ c: 'AB=8', r: 'נתון' }, { c: 'AC=5', r: 'נתון' }, { c: '∠A=60°', r: 'נתון' }, { c: 'BC^2=AB^2+AC^2-2*AB*AC*cos(∠A)', r: 'משפט הקוסינוסים' }, { c: 'BC^2=49', r: 'חישוב' }, { c: 'BC=7', r: 'חישוב' }] };
    $('mb-given').value = P.given; $('mb-prove').value = P.prove; used('demo');
  }
  // ---------- שיעורי בית מהמורה (השרת של "כיתה משחקת": kelim-kita) ----------
  var KAPI = (function () { try { var o = localStorage.getItem('kita-api'); if (o) return o; } catch (e) {} return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8796' : 'https://kelim-kita.gilad4049.workers.dev'; })();
  function kcall(path, body) {
    return fetch(KAPI + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { d._s = r.status; if (r.status === 404 && d.error === 'לא נמצא') d.error = 'שיעורי הבית במחברת יופעלו ממש בקרוב.'; return d; }); })
      .catch(function () { return { _s: 0, error: 'אין חיבור לאינטרנט. מה שכתבתם נשמר בטלפון, ויישלח למורה כשיחזור החיבור.' }; });
  }
  var HW = null, KME = load('kita-me', null), HWD = null, hwSaveT = null, hwPoll = null, ownA = null, seenMsg = {};
  var kq = (location.search.match(/[?&]kita=(\d{6})/) || [])[1];
  var tabH = $('mb-t-hw');
  function showHwTab() {
    tabA.setAttribute('aria-selected', 'false'); tabP.setAttribute('aria-selected', 'false'); tabH.setAttribute('aria-selected', 'true');
    $('mb-alg').hidden = true; $('mb-prf').hidden = true; $('mb-hw').hidden = false; $('mb-kb').hidden = true;
    if (KME && (!kq || kq === KME.code)) { $('mb-hwjoin').hidden = true; hwLoad(); }
    else { $('mb-hwjoin').hidden = false; $('mb-hwlist').hidden = true; if (kq) $('mb-jcode').value = kq; }
    used('hw_tab');
  }
  tabH.addEventListener('click', showHwTab);
  $('mb-join').addEventListener('click', function () {
    var code = $('mb-jcode').value.trim(), b = this, e = $('mb-jerr');
    if (!/^\d{6}$/.test(code)) { e.hidden = false; e.textContent = 'קוד הכיתה הוא 6 ספרות, כמו שהמורה שלחה.'; return; }
    b.disabled = true;
    kcall('/c/' + code + '/join', { nick: $('mb-jnick').value }).then(function (d) {
      b.disabled = false;
      if (!d.ok) { e.hidden = false; e.textContent = d.error; return; }
      e.hidden = true;
      KME = { code: code, sid: d.sid, token: d.token, nick: d.nick, name: d.name, teacher: d.teacher };
      store('kita-me', JSON.stringify(KME)); used('hw_join'); kq = code; showHwTab();
    });
  });
  function hwLoad(cb) {
    kcall('/c/' + KME.code + '/hw', { sid: KME.sid, token: KME.token }).then(function (d) {
      if (!d.ok) {
        if (d.gone) { try { localStorage.removeItem('kita-me'); } catch (e) {} KME = null; showHwTab(); return; }
        $('mb-hwlist').hidden = false; $('mb-hwul').innerHTML = '<li class="pt-err">' + esc(d.error) + '</li>'; return;
      }
      HWD = d;
      $('mb-hwlist').hidden = false; $('mb-hwcls').textContent = '📚 ' + d.name + (d.teacher ? ' · ' + d.teacher : '');
      $('mb-hwme').textContent = 'הכינוי שלי: ' + KME.nick;
      d.hw = d.hw.filter(function (h) { return h.ex && h.ex.length; }); // "הכנה לשיעור" (סרטון) נמצאת בפורטל הכיתה, לא במחברת
      $('mb-hwul').innerHTML = d.hw.length ? d.hw.map(function (h) {
        var mine = d.work.filter(function (w) { return w.hw === h.id; }), done = mine.filter(function (w) { return w.done; }).length;
        return '<li><button type="button" class="kh-hw" data-hw="' + h.id + '"><b>' + esc(h.title) + '</b><span>' + h.ex.length + ' תרגילים · ' + (done === h.ex.length ? 'הכול נפתר ✓' : done + ' ✓') + '</span></button></li>';
      }).join('') : '<li class="note">עוד אין מטלות מהמורה. כשתהיה, היא תופיע כאן.</li>';
      if (cb) cb(d);
    });
  }
  $('mb-hwul').addEventListener('click', function (e) { var b = e.target.closest('[data-hw]'); if (b) hwOpen(b.getAttribute('data-hw'), 0); });
  function hwLocal() { return load('mb-hw-' + KME.code, {}); }
  function hwOpen(id, ex) {
    var h = HWD && HWD.hw.filter(function (x) { return x.id === id; })[0]; if (!h) return;
    if (!HW) ownA = A;
    var loc = hwLocal(), key = id + ':' + ex, srv = HWD.work.filter(function (w) { return w.hw === id && w.ex === ex; })[0];
    var fromPage = !!h.ex[ex].pg; // שאלה מדף העבודה שהמורה העלתה: התלמיד/ה מעתיק/ה את התרגיל לשורה הראשונה
    var rows = (loc[key] && loc[key].rows) || (srv && srv.rows && srv.rows.length ? srv.rows : null) || (fromPage ? ['', ''] : [h.ex[ex].q, '']);
    if (!fromPage) rows[0] = h.ex[ex].q;
    HW = { id: id, ex: ex, h: h, stuck: !!(srv && srv.stuck), done: !!(srv && srv.done) };
    A = { rows: rows.slice(), deg: ownA ? ownA.deg : true };
    showTab(false);
    $('mb-hwbar').hidden = false; $('mb-ex') && ($('mb-ex').hidden = true);
    document.querySelector('#mb-alg .mb-ex').hidden = true; $('mb-new').hidden = true; $('mb-share').hidden = true;
    $('mb-hwtitle').textContent = '📚 ' + h.title + ' · תרגיל ' + (ex + 1) + ' מתוך ' + h.ex.length + (fromPage ? ' · ' + h.ex[ex].q + ' (עמוד ' + h.ex[ex].pg + ') – מעתיקים את התרגיל לשורה הראשונה' : '');
    $('mb-hwex').innerHTML = h.ex.map(function (q, i) {
      var w = HWD.work.filter(function (x) { return x.hw === id && x.ex === i; })[0];
      return '<button type="button" data-ex="' + i + '"' + (i === ex ? ' aria-current="true" class="on"' : '') + '>' + (i + 1) + (w && w.done ? ' ✓' : '') + '</button>';
    }).join('');
    setStuck(HW.stuck);
    renderRows(1); hwMsgs(); $('mb-hwsaved').textContent = '';
    clearInterval(hwPoll); hwPoll = setInterval(function () { if (!document.hidden && HW) hwLoad(function () { hwMsgs(); }); }, 15000);
    window.scrollTo({ top: $('mb-hwbar').offsetTop - 70, behavior: 'smooth' });
    used('hw_open');
  }
  $('mb-hwex').addEventListener('click', function (e) { var b = e.target.closest('[data-ex]'); if (b && HW) { hwFlush(); hwOpen(HW.id, +b.getAttribute('data-ex')); } });
  function hwMsgs() {
    if (!HW || !HWD) return;
    var ms = HWD.msgs.filter(function (m) { return m.hw === HW.id && m.ex === HW.ex; }), box = $('mb-hwmsgs');
    box.innerHTML = ms.map(function (m) { return '<p class="mb-hwm ' + m.kind + '">' + (m.kind === 'answer' ? '🔓 התשובה מהמורה: ' : '💬 המורה' + (m.sid === '*' ? ' (לכל הכיתה)' : '') + ': ') + '<span dir="auto">' + esc(m.text) + '</span></p>'; }).join('');
    var fresh = ms.filter(function (m) { return !seenMsg[m.id]; });
    fresh.forEach(function (m) { seenMsg[m.id] = 1; });
    if (fresh.length && hwPoll) { flash(fresh[fresh.length - 1].kind === 'answer' ? '🔓 המורה שחררה תשובה' : '💬 המורה שלחה רמז'); setStuck(false); }
  }
  function setStuck(on) { if (!HW) return; HW.stuck = on; var b = $('mb-stuck'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? '🙋 המורה יודעת שנתקעתי (לבטל)' : '🙋 נתקעתי, צריך עזרה'; }
  $('mb-stuck').addEventListener('click', function () { setStuck(!HW.stuck); used('hw_stuck'); hwSave(true); });
  function hwState() {
    var ok = 0, w = 0, done = false;
    lastRes.forEach(function (r) { if (r.mark === 'ok') ok++; else if (r.mark === 'warn') w++; if (r.mark === 'ok' && /🎉/.test(r.msg || '')) done = true; });
    return { ok: ok, warn: w, done: done };
  }
  function hwSave(now) {
    if (!HW || !KME) return;
    var loc = hwLocal(); loc[HW.id + ':' + HW.ex] = { rows: A.rows.slice(), t: Date.now() }; store('mb-hw-' + KME.code, JSON.stringify(loc));
    $('mb-hwsaved').textContent = '✓ נשמר בטלפון';
    clearTimeout(hwSaveT); hwSaveT = setTimeout(hwFlush, now ? 50 : 2500);
  }
  function hwFlush() {
    clearTimeout(hwSaveT); if (!HW || !KME) return;
    var s = hwState(), cur = HW;
    kcall('/c/' + KME.code + '/hwsave', { sid: KME.sid, token: KME.token, hw: cur.id, ex: cur.ex, rows: A.rows, ok: s.ok, warn: s.warn, done: s.done, stuck: cur.stuck }).then(function (d) {
      if (!d.ok) { $('mb-hwsaved').textContent = d.error; return; }
      $('mb-hwsaved').textContent = '✓ המורה רואה את העבודה';
      if (d.pts) flash('⭐ +' + d.pts + ' נקודות לכיתה! כל הכבוד');
      if (s.done && !cur.done) { cur.done = true; showSupport(); used('hw_done'); }
    });
  }
  $('mb-hwexit').addEventListener('click', function () {
    hwFlush(); HW = null; clearInterval(hwPoll); hwPoll = null;
    A = ownA || load('mb-alg', null) || { rows: ['', ''], deg: true }; ownA = null;
    $('mb-hwbar').hidden = true; document.querySelector('#mb-alg .mb-ex').hidden = false; $('mb-new').hidden = false; $('mb-share').hidden = false;
    renderRows(); showHwTab();
  });
  if (KME || kq) tabH.hidden = false;

  // ---------- שליחה למורה: כל המחברת בתוך הקישור (#s=...), בלי שרת ובלי הרשמה ----------
  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return JSON.parse(decodeURIComponent(escape(atob(s)))); }
  var shared = false, sharedTab = null;
  try {
    var hs = location.hash.match(/[#&]s=([A-Za-z0-9_-]+)/);
    if (hs) {
      var so = dec(hs[1]);
      if (so.t === 'p' && so.rows) { P = { given: String(so.g || ''), prove: String(so.v || ''), rows: so.rows.map(function (r) { return { c: String(r[0] || ''), r: String(r[1] || ''), o: String(r[2] || '') }; }), draw: { i: Array.isArray(so.dr) ? so.dr.slice(0, 200) : [] } }; $('mb-given').value = P.given; $('mb-prove').value = P.prove; sharedTab = 'p'; }
      else if (so.rows) { A = { rows: so.rows.map(String).slice(0, 80), deg: so.d !== 0, ask: String(so.q || '').slice(0, 200) }; setDeg(A.deg); sharedTab = 'a'; }
      if (sharedTab) { shared = true; $('mb-shared').hidden = false; if (so.n) $('mb-shared-t').textContent = 'שלחו לכם: "⁨' + String(so.n).slice(0, 80) + '⁩". רואים את הפתרון כמו שנכתב, עם הבדיקה של כל שורה. מה שמשנים כאן לא נשמר.'; used('shared_open'); }
    }
  } catch (e) { flash('הקישור לא נפתח. אולי הוא נחתך בהעתקה.'); }
  $('mb-keep').addEventListener('click', function () {
    shared = false;
    if (sharedTab === 'p') { store('mb-prf', JSON.stringify(P)); } else { var me = load('mb-alg', null); if (me) { A2 = A; A = me; archive(); A = A2; } store('mb-alg', JSON.stringify(A)); }
    $('mb-shared').hidden = true; history.replaceState(null, '', location.pathname); flash('✓ נשמר במחברת שלך'); used('shared_keep');
  });
  var A2 = null;
  function shareLink(proof) {
    var o = proof ? { t: 'p', g: P.given, v: P.prove, rows: P.rows.filter(function (r) { return (r.c || '').trim() || r.r; }).map(function (r) { return [r.c, r.r, r.o || '']; }), dr: shareDraw() }
      : { t: 'a', d: A.deg ? 1 : 0, rows: A.rows.filter(function (r, i) { return r.trim() || i === 0; }), q: A.ask || undefined };
    if (!(o.rows.length && (proof ? o.rows.length : o.rows[0].trim()))) { flash(proof ? 'עוד אין שורות בהוכחה.' : 'עוד אין תרגיל במחברת.'); return; }
    var name = proof ? (P.prove ? 'הוכחה: ' + P.prove : 'הוכחה') : 'תרגיל: ' + A.rows[0];
    o.n = name.slice(0, 80);
    var url = location.origin + '/limudim/machberet/#s=' + enc(o);
    var marks = proof ? '' : (function () { var ok = 0, w = 0; lastRes.forEach(function (r) { if (r.mark === 'ok') ok++; else if (r.mark === 'warn') w++; }); return ' (' + ok + ' ✓' + (w ? ', ' + w + ' ?' : '') + ')'; })();
    var text = 'הפתרון שלי במחברת' + marks + ' – ' + name + '\n' + url;
    used(proof ? 'share_proof' : 'share');
    if (navigator.share && window.matchMedia && matchMedia('(pointer:coarse)').matches) { navigator.share({ title: 'המחברת', text: 'הפתרון שלי במחברת' + marks + ' – ' + name, url: url }).catch(function () {}); return; }
    var done = function () { flash('✓ הקישור הועתק. מדביקים אותו בווטסאפ או במייל למורה.'); };
    try { navigator.clipboard.writeText(text).then(done, function () { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); }); }
    catch (e) { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); }
  }
  function shareDraw() { // השרטוט נכנס לקישור; יד חופשית ארוכה מדוללת כדי שהקישור לא יתארך מדי
    var it = dItems(), step = 1, out;
    do { out = it.map(function (x) { return x.t === 'f' ? { t: 'f', p: x.p.filter(function (q, j) { return j % step === 0 || j === x.p.length - 1; }) } : x; }); step++; } while (JSON.stringify(out).length > 3000 && step < 8);
    return out.length ? out : undefined;
  }
  $('mb-share').addEventListener('click', function () { shareLink(false); });
  $('mb-pshare').addEventListener('click', function () { shareLink(true); });
  $('mb-kbonly').addEventListener('change', function () { kbOnly = this.checked; store('mb-kbonly', kbOnly ? '1' : '0'); applyKbOnly(); used(kbOnly ? 'kb_only' : 'kb_native'); });

  renderRows(); showOld(); prenderRows(); applyKbOnly(); dLoad();
  if (sharedTab) { showTab(sharedTab === 'p'); if (sharedTab === 'p') $('mb-pcheck').click(); }
  else if (kq) {
    showHwTab();
    var hh = location.hash.match(/hw=([a-z0-9]{8})(?:&ex=(\d+))?/); // מגיעים מפורטל הכיתה ישר לתרגיל
    if (hh && KME && KME.code === kq) hwLoad(function () { hwOpen(hh[1], Math.max(0, +(hh[2] || 0))); });
  }
  else {
    if (/[?&]demo=1/.test(location.search)) $('mb-pcheck').click();
    if (store('mb-tab') === 'p' || /[?&]tab=proof/.test(location.search)) showTab(true);
  }
})();
