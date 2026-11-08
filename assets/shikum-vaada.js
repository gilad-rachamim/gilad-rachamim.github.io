// הכנה לוועדה: טופס → דף אחד להדפסה (שלושה סגנונות) או לווטסאפ. נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('va-form'), card = $('va-card');
  if (!form || !card) return;
  var KEY = 'kelim-shikum-vaada', TOOL = 'shikum_vaada';
  var F = [['what', ''], ['name', ''], ['sheina', 'שינה'], ['avoda', 'עבודה או לימודים'], ['bait', 'בבית ובמשפחה'], ['yetzia', 'יציאה מהבית, נהיגה, מקומות הומים'],
    ['rikuz', 'ריכוז וזיכרון'], ['guf', 'גוף וכאבים'], ['yom', 'יום רגיל אצלי'], ['ozer', 'מה ומי עוזר לי'], ['q', 'שאלות שאני רוצה לשאול'], ['lehavi', 'מה הבאתי']];
  var HARD = ['sheina', 'avoda', 'bait', 'yetzia', 'rikuz', 'guf'];
  // בכניסה הראשונה: דוגמה מלאה, כדי שיהיה ברור איך הדף נראה. מוחקים וכותבים במקום.
  var EX = { demo: 1, theme: 'lavan', what: 'ועדה רפואית, יום שני 9:00', name: '',
    sheina: 'מתעורר שלוש-ארבע פעמים בלילה. קם עייף כמעט כל בוקר.',
    avoda: 'קשה לי להחזיק יום עבודה מלא. אחרי שעתיים אני צריך הפסקה ארוכה.',
    bait: 'רעש חזק מקפיץ אותי. לפעמים אני מתפרץ על הילדים ומצטער אחר כך.',
    yetzia: 'נמנע מקניונים ומאירועים גדולים. נוהג רק בדרכים שאני מכיר.',
    rikuz: 'שוכח פגישות אם אני לא רושם. קשה לי לקרוא מכתב ארוך עד הסוף.',
    guf: 'כאבי גב אחרי ישיבה של יותר משעה.',
    yom: 'קם אחרי לילה קשה, מנסה לעבוד כמה שעות, חוזר הביתה ונח. בערב אין לי כוח לצאת.',
    ozer: 'טיפול פעם בשבוע. הליכה בבוקר. מישהו מהמשפחה מזכיר לי תורים.',
    q: 'מה השלב הבא אחרי הוועדה, ומתי תגיע תשובה?\nאפשר לקבל את ההחלטה בכתב?\nלמי פונים אם יש שאלה על ההחלטה?',
    lehavi: 'הזימון, מכתבים מהרופאים, רשימת תרופות' };
  var st = {};
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); st = sv || JSON.parse(JSON.stringify(EX)); } catch (e) { st = JSON.parse(JSON.stringify(EX)); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function v(k) { return String(st[k] || '').trim(); }
  function lines(k) { return v(k).split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  var text = '';
  function draw() {
    $('va-demo').hidden = !st.demo;
    card.className = 'sk-card t-' + (st.theme || 'lavan');
    [].forEach.call($('va-theme').children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === (st.theme || 'lavan')); });
    var title = 'הכנה לוועדה' + (v('name') ? ' – ' + v('name') : '');
    var hard = HARD.filter(function (k) { return v(k); });
    var rest = F.slice(8).filter(function (f) { return v(f[0]); });
    var html = '<h3>' + esc(title) + '</h3><p class="s2">' + (v('what') ? esc(v('what')) : 'מה חשוב לי לספר ולשאול') + '</p>';
    if (hard.length) html += '<h4>מה קשה לי ביום-יום</h4><ul>' + hard.map(function (k) { var f = F.filter(function (x) { return x[0] === k; })[0]; return '<li><b>' + f[1] + ':</b> ' + esc(v(k)) + '</li>'; }).join('') + '</ul>';
    html += rest.map(function (f) {
      if (f[0] === 'q') return '<h4>' + f[1] + '</h4><ol>' + lines('q').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
      return '<h4>' + f[1] + '</h4><p class="nt">' + esc(v(f[0])) + '</p>';
    }).join('');
    if (!hard.length && !rest.length) html += '<p class="s2">ממלאים למעלה, והדף נבנה כאן.</p>';
    html += '<p class="ft">כתבתי בבית, כדי לא לשכוח בוועדה.</p>';
    card.innerHTML = html;
    text = title + (v('what') ? '\n' + v('what') : '') +
      (hard.length ? '\n\n*מה קשה לי ביום-יום*\n' + hard.map(function (k) { var f = F.filter(function (x) { return x[0] === k; })[0]; return '▫️ ' + f[1] + ': ' + v(k); }).join('\n') : '') +
      rest.map(function (f) { return '\n\n*' + f[1] + '*\n' + (f[0] === 'q' ? lines('q').map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n') : v(f[0])); }).join('');
    $('va-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  function fill() { F.forEach(function (f) { form.querySelector('[name=' + f[0] + ']').value = st[f[0]] || ''; }); }
  form.addEventListener('input', function () {
    F.forEach(function (f) { st[f[0]] = form.querySelector('[name=' + f[0] + ']').value; });
    st.demo = 0; save(); draw();
  });
  $('va-theme').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]'); if (!b) return;
    st.theme = b.getAttribute('data-t'); save(); draw();
  });
  function clear() { var t = st.theme; st = { demo: 0, theme: t }; save(); fill(); draw(); }
  $('va-clear').addEventListener('click', clear);
  $('va-new').addEventListener('click', function () { if (st.demo || confirm('לנקות את כל הדף?')) clear(); });
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how, theme: st.theme }); }
  $('va-print').addEventListener('click', function () { used('print'); window.print(); });
  $('va-wa').addEventListener('click', function () { used('wa'); });
  fill(); draw();
})();
