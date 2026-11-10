// לוח פעילות לחופשת חנוכה – /kodesh/chanuka/chufsha/
// רעיון לכל יום, בבית ובחינם, לשלוש קבוצות גיל. מסמנים "עשינו" (נשמר בטלפון).
(function () {
  'use strict';
  var TOOL = 'chanuka_chufsha', KEY = 'kodesh-chanuka-chufsha';
  function $(id) { return document.getElementById(id); }
  var AGES = ['קטנים (3–6)', 'בגיל בית הספר (7–10)', 'גדולים (11 ומעלה)'];
  var DAYS = [
    { t: 'בונים חנוכייה', a: [
      'חנוכייה מבצק משחק או מפלסטלינה: שמונה גושים בשורה ואחד גבוה לשמש.',
      'חנוכייה מפקקים, קרטון ונייר כסף. מדביקים, צובעים, ומניחים ליד החלון (בלי אש).',
      'חנוכייה מלגו או מקרטון, עם תוכנית על נייר לפני הבנייה. מצלמים ושולחים לסבא וסבתא.'] },
    { t: 'צובעים ומספרים', a: [
      'דפי צביעה לחנוכה – בטלפון או מודפסים. <a href="/kodesh/chanuka/tzviya/">לדפי הצביעה</a>',
      'תיאטרון בובות מגרביים: מספרים את סיפור החשמונאים, וכל ילד מדבב דמות.',
      'קומיקס של ארבעה ריבועים על נס פך השמן. מי שרוצה – מוסיף בועות דיבור.'] },
    { t: 'יום הסביבון', a: [
      'מירוץ סביבונים על השולחן: מי מסתובב הכי הרבה זמן? <a href="/kodesh/chanuka/sevivon/">סביבון בטלפון</a>',
      'משחק סביבון עם קופה של סוכריות או קטניות, לפי החוקים האמיתיים.',
      'מכינים סביבון מקרטון ומקל, ובודקים איך הצורה משנה את הסיבוב.'] },
    { t: 'מטבח של חנוכה', a: [
      'מקשטים עוגיות או פרוסות לחם בצורת סביבון, עם ממרח וסוכריות.',
      'לשים בצק ומכינים כדורים לסופגניות יחד עם מבוגר (את הטיגון עושה רק המבוגר).',
      'מכינים לבד לביבות לכל המשפחה, עם מבוגר ליד המחבת. <a href="/kodesh/chanuka/matkonim/">למתכונים</a>'] },
    { t: 'חסד קטן', a: [
      'מציירים ציור "חנוכה שמח" לשכן או לסבתא, ומביאים אותו ביחד.',
      'מכינים פתק תודה לגננת, למורה או לשומר, ומוסיפים סוכרייה.',
      'מתקשרים לאדם מבוגר או בודד ומאחלים חנוכה שמח. <a href="/kodesh/chanuka/chesed/">עוד רעיונות לחסד</a>'] },
    { t: 'סיור חנוכיות', a: [
      'אחרי ההדלקה יוצאים לטיול קצר בשכונה וסופרים חנוכיות בחלונות.',
      'מי מוצא הכי הרבה חנוכיות בחלונות? כל אחד רושם, ובסוף משווים.',
      'מצלמים את החנוכייה הכי יפה בשכונה (מהרחוב, בלי להיכנס), ובונים אלבום משפחתי של החג.'] },
    { t: 'ערב שירה', a: [
      'שרים יחד ליד הנרות, עם תנועות ידיים לכל שיר.',
      'כל ילד בוחר שיר ומלמד את כל המשפחה. <a href="/kodesh/chanuka/shiron/">לשירון</a>',
      'מקליטים את המשפחה שרה מעוז צור, ושולחים לסבא וסבתא.'] },
    { t: 'זאת חנוכה', a: [
      'כל אחד מספר נס קטן שקרה לו השנה, ומדליקים יחד.',
      'חידון משפחתי בשני צוותים, ופרס קטן למנצחים. <a href="/kodesh/chanuka/chidon/">לחידון</a>',
      'כותבים לעצמם מכתב "מה אני רוצה להוסיף בשנה הבאה" ושומרים אותו עד חנוכה הבא.'] }
  ];
  var st = { done: {}, cur: 0 }, first = null;
  try { var sv = JSON.parse(localStorage.getItem(KEY) || '{}'); if (sv.done) st.done = sv.done; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ done: st.done })); } catch (e) {} }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how, day: st.cur + 1 }); }
  var NUM = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'];

  function tabs() {
    $('cf-tabs').innerHTML = DAYS.map(function (d, i) {
      return '<button type="button" role="tab" data-i="' + i + '" aria-selected="' + (i === st.cur) + '"' + (st.done[i] ? ' class="done"' : '') + '>יום ' + NUM[i] + (st.done[i] ? ' ✓' : '') + '</button>';
    }).join('');
    $('cf-tabs').querySelectorAll('button').forEach(function (b) { b.onclick = function () { st.cur = +b.getAttribute('data-i'); show(); used('day'); }; });
  }
  function show() {
    var d = DAYS[st.cur];
    $('cf-title').textContent = 'יום ' + NUM[st.cur] + ' של חנוכה: ' + d.t;
    $('cf-ideas').innerHTML = d.a.map(function (x, j) { return '<li><b>' + AGES[j] + '</b><span>' + x + '</span></li>'; }).join('');
    $('cf-done').textContent = st.done[st.cur] ? '✓ עשינו! (לבטל)' : 'עשינו היום ✓';
    $('cf-done').className = 'btn ' + (st.done[st.cur] ? 'btn-line' : 'btn-gold');
    var plain = d.a.map(function (x, j) { return '• ' + AGES[j] + ': ' + x.replace(/<[^>]+>.*?<\/a>/g, '').replace(/<[^>]+>/g, '').trim(); }).join('\n');
    $('cf-wa').href = 'https://wa.me/?text=' + encodeURIComponent('רעיון לחופשת חנוכה – יום ' + NUM[st.cur] + ': ' + d.t + '\n' + plain + '\n\nרעיון לכל יום, בבית ובחינם:\n' + location.origin + '/kodesh/chanuka/chufsha/');
    var sh = '';
    if (first) {
      var dd = new Date(first.getFullYear(), first.getMonth(), first.getDate() + st.cur);
      sh = (dd.getDay() === 6 ? '🕯️ השנה היום הזה חל בשבת: בוחרים רק מה שמותר בשבת (בלי בצק משחק, הדבקה, כתיבה, צילום או הקלטה). ' : '') + 'השנה: ' + dd.getDate() + '.' + (dd.getMonth() + 1) + '.';
    }
    $('cf-shabbat').textContent = sh;
    var n = Object.keys(st.done).filter(function (k) { return st.done[k]; }).length;
    $('cf-count').textContent = n ? 'עשיתם ' + n + ' מתוך 8 ימים' + (n === 8 ? ' – כל הכבוד! 🎉' : '') : '';
    tabs();
  }
  $('cf-done').onclick = function () { st.done[st.cur] = st.done[st.cur] ? 0 : 1; save(); show(); if (st.done[st.cur]) used('done'); };
  $('cf-wa').addEventListener('click', function () { used('wa'); });
  $('cf-print').onclick = function () {
    $('cf-all').innerHTML = DAYS.map(function (d, i) {
      return '<div class="cf-p"><h3>יום ' + NUM[i] + ': ' + d.t + '</h3><ul>' + d.a.map(function (x, j) { return '<li><b>' + AGES[j] + ':</b> ' + x.replace(/<a [^>]*>.*?<\/a>/g, '') + '</li>'; }).join('') + '</ul></div>';
    }).join('');
    used('print'); window.print();
  };

  // היום הנוכחי של חנוכה, אם אנחנו בתוך החג
  function today() {
    var H = window.hebcal; if (!H) return;
    var now = new Date(), hy = new H.HDate(now).getFullYear();
    var f = new H.HDate(25, H.months.KISLEV, hy).greg(), d = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(f.getFullYear(), f.getMonth(), f.getDate())) / 864e5);
    first = f;
    if (d >= 0 && d < 8) st.cur = d;
    show();
    if (d >= 0 && d < 8) return;
    else if (d < 0) $('cf-when').textContent = 'יום א של חנוכה השנה: ' + f.getDate() + '.' + (f.getMonth() + 1) + ' (הנר הראשון בערב שלפני).';
  }
  show();
  (function wait(n) { if (window.hebcal) today(); else if (n < 40) setTimeout(function () { wait(n + 1); }, 120); })(0);
})();
