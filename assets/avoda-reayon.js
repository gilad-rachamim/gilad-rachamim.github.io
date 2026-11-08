// הכנה לראיון עבודה: שאלות נפוצות + התשובות שלי + מה אני רוצה לשאול → דף אחד להדפסה (שלושה סגנונות) או לווטסאפ.
// נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('re-form'), card = $('re-card');
  if (!form || !card) return;
  var KEY = 'kelim-avoda-reayon', TOOL = 'avoda_reayon';
  var QS = [
    ['q1', 'ספר לי קצת על עצמך'],
    ['q2', 'למה אתה רוצה לעבוד דווקא כאן?'],
    ['q3', 'מה עשית בעבודה האחרונה?'],
    ['q4', 'במה אתה חזק?'],
    ['q5', 'מה פחות קל לך, ואיך אתה מתמודד עם זה?'],
    ['q6', 'ספר על פעם שפתרת בעיה בעבודה'],
    ['q7', 'איך אתה מסתדר בעבודה עם אחרים ועם מנהל?'],
    ['q8', 'למה עזבת את העבודה הקודמת?'],
    ['q9', 'מתי אתה יכול להתחיל, ובאילו שעות?'],
    ['q10', 'למה שנבחר דווקא בך?']
  ];
  var FIELDS = ['at', 'when', 'where', 'ask', 'bring'].concat(QS.map(function (q) { return q[0]; }));
  var EX = { demo: 1, theme: 'lavan', blank: 0, at: 'מרכז לוגיסטי, תפקיד מחסנאי', when: 'יום שלישי, 10:00', where: 'אזור התעשייה, קומה 2. לשאול על שרית ממשאבי אנוש.',
    q1: 'בן 27, גר באשקלון. עבדתי שלוש שנים כשליח ושנתיים במחסן. אני אוהב עבודה מסודרת ופיזית.',
    q2: 'שמעתי מחבר שעובד פה שיש סדר ויחס טוב לעובדים. אני מחפש מקום יציב לאורך זמן.',
    q3: 'קבלת סחורה, ספירת מלאי וסידור המחסן. בשנה האחרונה גם חפפתי עובדים חדשים.',
    q4: 'אחריות ודייקנות. כשאני אומר שאני מגיע, אני מגיע.',
    q5: 'לפעמים קשה לי עם הרבה רעש ובלגן. אני עובד עם רשימה ומסדר את המקום כדי שיהיה שקט וברור.',
    q6: 'פעם הגיעה משאית עם הזמנה לא נכונה. עצרתי, בדקתי מול החשבונית, והתקשרתי לספק לפני שהסחורה נכנסה.',
    q7: 'טוב. אני מקשיב, שואל כשלא ברור, ולא נעלב מהערה.',
    q8: 'המחסן עבר לעיר אחרת, ורציתי לעבוד קרוב לבית.',
    q9: 'אפשר בעוד שבועיים. בוקר ואחר הצהריים, משמרות לילה פחות.',
    q10: 'כי יש לי ניסיון בדיוק בזה, ואני בא לעבוד לאורך זמן.',
    ask: 'איך נראה יום עבודה רגיל בתפקיד?\nמי יהיה המנהל הישיר שלי?\nאיך נראית ההכשרה בהתחלה?\nמתי אפשר לצפות לתשובה?',
    bring: 'קורות חיים מודפסים, תעודת קורס מלגזה, מכתב המלצה' };
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  var st;
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null') || copy(EX); } catch (e) { st = copy(EX); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function v(k) { return String(st[k] || '').trim(); }
  function lines(k) { return v(k).split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how, theme: st.theme }); }
  $('re-qs').innerHTML = QS.map(function (q) {
    return '<div class="field"><label for="re-' + q[0] + '">' + q[1] + '</label><textarea id="re-' + q[0] + '" name="' + q[0] + '" maxlength="500"></textarea></div>';
  }).join('');
  var text = '';
  function draw() {
    $('re-demo').hidden = !st.demo;
    var th = st.theme || 'lavan';
    card.className = 'av-card t-' + th;
    [].forEach.call($('re-theme').children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === th); });
    var shown = QS.filter(function (q) { return v(q[0]) || st.blank; });
    var ask = lines('ask');
    var h = '<h3>הכנה לראיון</h3><p class="s2">' + esc(v('at') || 'איפה ולאיזה תפקיד') + '</p>' +
      ((v('when') || v('where')) ? '<p class="ct">' + [v('when'), v('where')].filter(Boolean).map(esc).join(' · ') + '</p>' : '');
    if (shown.length) h += '<h4>מה אני רוצה להגיד</h4>' + shown.map(function (q) {
      return '<div class="qa"><b>' + q[1] + '</b><p class="ans' + (v(q[0]) ? '' : ' blank') + '">' + esc(v(q[0])) + '</p></div>';
    }).join('');
    if (ask.length) h += '<h4>מה אני רוצה לשאול</h4><ol>' + ask.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
    if (v('bring')) h += '<h4>מה להביא</h4><p class="nt">' + esc(v('bring')) + '</p>';
    if (!shown.length && !ask.length) h += '<p class="s2">ממלאים למעלה, והדף נבנה כאן.</p>';
    h += '<p class="ft">לנשום, לחייך, ולדבר במילים שלי.</p>';
    card.innerHTML = h;
    text = '*הכנה לראיון*' + (v('at') ? '\n' + v('at') : '') + (v('when') ? '\n' + v('when') : '') + (v('where') ? '\n' + v('where') : '') +
      QS.filter(function (q) { return v(q[0]); }).map(function (q) { return '\n\n*' + q[1] + '*\n' + v(q[0]); }).join('') +
      (ask.length ? '\n\n*מה אני רוצה לשאול*\n' + ask.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n') : '') +
      (v('bring') ? '\n\n*מה להביא*\n' + v('bring') : '');
    $('re-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  function fill() { FIELDS.forEach(function (k) { form.querySelector('[name=' + k + ']').value = st[k] || ''; }); $('re-blank').checked = !!st.blank; }
  form.addEventListener('input', function (e) {
    if (e.target.id === 're-blank') { st.blank = e.target.checked ? 1 : 0; save(); draw(); return; }
    FIELDS.forEach(function (k) { st[k] = form.querySelector('[name=' + k + ']').value; });
    st.demo = 0; save(); draw();
  });
  $('re-theme').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]'); if (!b) return;
    st.theme = b.getAttribute('data-t'); save(); draw();
  });
  function clear() { st = { demo: 0, theme: st.theme, blank: 1 }; save(); fill(); draw(); }
  $('re-clear').addEventListener('click', clear);
  $('re-new').addEventListener('click', function () { if (st.demo || confirm('לנקות את כל הדף?')) clear(); });
  $('re-print').addEventListener('click', function () { used('print'); window.print(); });
  $('re-wa').addEventListener('click', function () { used('wa'); });
  fill(); draw();
})();
