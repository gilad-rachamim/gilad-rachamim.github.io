// נר של חסד: מעשה טוב משפחתי קטן לכל לילה של חנוכה. בכל לילה שלוש הצעות לבחירה,
// מסמנים "עשינו" ונר נדלק בחנוכייה. הכול נשמר בטלפון בלבד.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('ch-app')) return;
  var KEY = 'kodesh-chanuka-chesed';
  var NUM = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'שמיני'];
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  // [נושא הלילה, [שלוש הצעות]]
  var N = [
    ['אור בבית', ['כל אחד אומר תודה לכל אחד מבני הבית, במשפט אחד.', 'עוזרים יחד לסדר את השולחן ולהכין את ההדלקה.', 'כותבים פתק קטן "אני אוהב/ת אותך" ומחביאים לאחד מבני הבית.']],
    ['סבא וסבתא', ['מתקשרים לסבא ולסבתא ושרים להם שיר חנוכה.', 'שולחים להם תמונה של החנוכייה הדולקת עם ברכה.', 'מציירים להם ציור ושולחים או מביאים בביקור הבא.']],
    ['שכנים', ['מביאים לשכן סופגנייה או לביבה עם פתק "חנוכה מבורכת".', 'שואלים שכן מבוגר אם הוא צריך עזרה בקניות.', 'מכינים כרטיס ברכה לבניין ותולים בכניסה.']],
    ['מי שלבד', ['מתקשרים למישהו שגר לבד ושואלים מה שלומו.', 'מזמינים מישהו שלבד להדלקה או לארוחה.', 'שולחים הודעה חמה למישהו שלא דיברנו איתו הרבה זמן.']],
    ['צדקה', ['כל אחד שם מטבע מדמי החנוכה בקופת הצדקה.', 'בוחרים יחד משחק או בגד שלא משתמשים בו, ומוסרים למי שצריך.', 'קונים מוצר מזון אחד ומביאים לאיסוף של הקהילה.']],
    ['חיילים ומשפחותיהם', ['כותבים מכתב תודה לחייל או לחיילת.', 'מציירים ציור לחיילים ושולחים דרך בית הספר או הקהילה.', 'עוזרים למשפחה שהאבא או האמא במילואים: עוגה, משחק עם הילדים, הודעה חמה.']],
    ['מילה טובה', ['כל אחד מפרגן בכתב למורה, לגננת או למדריך.', 'ערב בלי מילה רעה על אף אחד – מי שמצליח מקבל סופגנייה.', 'כל אחד אומר משהו טוב על מי שיושב לידו.']],
    ['אור לעולם', ['יוצאים יחד לאסוף לכלוך בגינה או ברחוב.', 'משתפים מתכון משפחתי עם חברים או עם השכנים.', 'יושבים יחד ומספרים: איזה חסד מהשבוע הכי אהבנו?']]
  ];
  var st = { done: {}, pick: {} };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) { st.done = sv.done || {}; st.pick = sv.pick || {}; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function noon(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }
  function add(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var first = null;
  function firstEvening(H, now) {
    var hy = new H.HDate(now).getFullYear();
    var f = noon(new H.HDate(24, H.months.KISLEV, hy).greg());
    if (add(f, 8) < noon(now)) f = noon(new H.HDate(24, H.months.KISLEV, hy + 1).greg());
    return f;
  }
  function tonight() {
    if (!first) return 0;
    var d = Math.round((noon(new Date()) - first) / 864e5) + 1;
    return d >= 1 && d <= 8 ? d : 0;
  }
  function menorah() {
    var h = '<div class="cn-menorah" aria-hidden="true">';
    for (var i = 1; i <= 8; i++) h += '<span class="c' + (st.done[i] ? ' lit' : '') + '"></span>' + (i === 4 ? '<span class="c sh lit"></span>' : '');
    return h + '</div>';
  }
  function count() { var c = 0; for (var i = 1; i <= 8; i++) if (st.done[i]) c++; return c; }

  function draw() {
    var t = tonight(), c = count();
    $('ch-top').innerHTML = menorah() + '<p class="ch-cnt"><b>' + c + '</b> מתוך 8 נרות של חסד' + (c === 8 ? ' – כל הכבוד! 🕎' : '') + '</p>' +
      (t ? '<p class="cn-sm">הלילה: נר ' + NUM[t] + '</p>' : (first && noon(new Date()) < first ? '<p class="cn-sm">מתחילים בנר הראשון, יום ' + DAYS[first.getDay()] + ' ' + first.getDate() + '.' + (first.getMonth() + 1) + ' בערב</p>' : ''));
    var h = '';
    for (var n = 1; n <= 8; n++) {
      var p = st.pick[n] || 0, idea = N[n - 1][1][p], dt = first ? add(first, n - 1) : null;
      h += '<article class="ch-n' + (n === t ? ' now' : '') + (st.done[n] ? ' done' : '') + '" id="n' + n + '">' +
        '<p class="ch-k">נר ' + NUM[n] + (dt ? ' · ' + DAYS[dt.getDay()] + ' ' + dt.getDate() + '.' + (dt.getMonth() + 1) : '') + (n === t ? ' · <b>הלילה</b>' : '') + '</p>' +
        '<h3>' + esc(N[n - 1][0]) + '</h3><p class="ch-idea">' + esc(idea) + '</p>' +
        '<div class="ch-act no-print"><button type="button" class="btn btn-sm ' + (st.done[n] ? 'btn-gold' : 'btn-line') + '" data-done="' + n + '">' + (st.done[n] ? '✓ עשינו!' : 'עשינו') + '</button>' +
        '<button type="button" class="btn btn-sm btn-line" data-next="' + n + '">רעיון אחר</button>' +
        '<a class="btn btn-sm btn-line" target="_blank" rel="noopener" data-wa="' + n + '" href="https://wa.me/?text=' + encodeURIComponent('נר של חסד – נר ' + NUM[n] + ' של חנוכה 🕎\n' + idea + '\n\nמעשה טוב קטן לכל לילה, למשפחה:\n' + location.origin + '/kodesh/chanuka/chesed/') + '"><svg class="ic"><use href="#wa"/></svg> לשתף</a></div></article>';
    }
    $('ch-app').innerHTML = h;
    [].forEach.call(document.querySelectorAll('[data-done]'), function (b) {
      b.onclick = function () { var n = +b.getAttribute('data-done'); st.done[n] = !st.done[n]; save(); draw(); if (st.done[n] && window.toolUsed) window.toolUsed('chanuka_chesed', { how: 'add' }); };
    });
    [].forEach.call(document.querySelectorAll('[data-next]'), function (b) {
      b.onclick = function () { var n = +b.getAttribute('data-next'); st.pick[n] = ((st.pick[n] || 0) + 1) % 3; save(); draw(); };
    });
    [].forEach.call(document.querySelectorAll('[data-wa]'), function (a) { a.onclick = function () { if (window.toolUsed) window.toolUsed('chanuka_chesed', { how: 'wa' }); }; });
  }
  $('ch-print').onclick = function () { if (window.toolUsed) window.toolUsed('chanuka_chesed', { how: 'print' }); window.print(); };
  $('ch-reset').onclick = function () { if (confirm('לאפס את הסימונים ולהתחיל מחדש?')) { st = { done: {}, pick: {} }; save(); draw(); } };

  draw();
  (function wait() {
    if (window.hebcal) { try { first = firstEvening(window.hebcal, new Date()); } catch (e) {} draw(); var m = /^#n(\d)$/.exec(location.hash); var t = m ? +m[1] : tonight(); if (t && $('n' + t) && location.hash) $('n' + t).scrollIntoView(); }
    else setTimeout(wait, 120);
  })();
})();
