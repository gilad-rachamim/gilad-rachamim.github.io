// קורות חיים: טופס → דף אחד להדפסה (שלושה סגנונות) או לווטסאפ. נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('ko-form'), card = $('ko-card');
  if (!form || !card) return;
  var KEY = 'kelim-avoda-korot', TOOL = 'avoda_korot';
  var FIELDS = ['name', 'role', 'phone', 'mail', 'city', 'about', 'army', 'skills', 'lang', 'extra'];
  // בכניסה הראשונה: דוגמה מלאה (אדם בדוי), כדי שיהיה ברור איך הדף נראה.
  var EX = { demo: 1, theme: 'lavan', name: 'יוסי כהן', role: 'מחסנאי או נהג חלוקה, משרה מלאה', phone: '050-0000000', mail: 'yossi@example.com', city: 'אשקלון',
    about: 'אחראי, דייקן ואוהב לעבוד עם אנשים. רגיל לעבודה פיזית ולשעות גמישות. מחפש מקום יציב לאורך זמן.',
    jobs: [
      { yr: '2023 – היום', t: 'מחסנאי', at: 'רשת חנויות לבית, אשקלון', d: 'קבלת סחורה, ספירת מלאי וסידור המחסן. אחראי על שני עובדים חדשים.' },
      { yr: '2020 – 2023', t: 'שליח', at: 'חברת משלוחים, אזור הדרום', d: 'חלוקה של 60–80 משלוחים ביום, עבודה מול לקוחות.' }
    ],
    edu: [
      { yr: '2024', t: 'קורס מלגזה', at: 'מכללה מקצועית' },
      { yr: '2016 – 2019', t: 'תעודת בגרות', at: 'תיכון מקיף' }
    ],
    army: 'שירות קרבי, 2019–2022. סמל, מפקד צוות.',
    skills: 'רישיון נהיגה B ומלגזה\nעבודה בצוות ופיקוד על אנשים\nאקסל ווורד ברמה בסיסית',
    lang: 'עברית – שפת אם, אנגלית – טובה', extra: 'מתנדב בבנק מזון פעם בשבוע' };
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  var st;
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null') || copy(EX); } catch (e) { st = copy(EX); }
  st.jobs = st.jobs || []; st.edu = st.edu || [];
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function v(k) { return String(st[k] || '').trim(); }
  function lines(s) { return String(s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how, theme: st.theme }); }
  // שורות שחוזרות: ניסיון והשכלה
  var ROWS = {
    jobs: { box: 'ko-jobs', f: [['yr', 'מתי', '2023 – היום'], ['t', 'התפקיד', 'מחסנאי'], ['at', 'איפה', 'שם המקום, עיר'], ['d', 'מה עשיתי', 'שורה או שתיים', 1]] },
    edu: { box: 'ko-edu', f: [['yr', 'מתי', '2024'], ['t', 'מה למדתי', 'קורס, תעודה או תואר'], ['at', 'איפה', 'שם המקום']] }
  };
  function rowsHtml(kind) {
    var R = ROWS[kind];
    return st[kind].map(function (r, i) {
      return '<div class="av-row"><button type="button" class="x" data-rm="' + kind + '" data-i="' + i + '">להסיר</button>' +
        R.f.map(function (f) {
          var id = 'ko-' + kind + '-' + i + '-' + f[0];
          var inp = f[3] ? '<textarea id="' + id + '" data-k="' + kind + '" data-i="' + i + '" data-f="' + f[0] + '" maxlength="300" placeholder="' + f[2] + '">' + esc(r[f[0]]) + '</textarea>'
            : '<input id="' + id + '" type="text" data-k="' + kind + '" data-i="' + i + '" data-f="' + f[0] + '" maxlength="80" placeholder="' + f[2] + '" value="' + esc(r[f[0]]) + '">';
          return '<div class="field"><label for="' + id + '">' + f[1] + '</label>' + inp + '</div>';
        }).join('') + '</div>';
    }).join('');
  }
  function fillRows() { $('ko-jobs').innerHTML = rowsHtml('jobs'); $('ko-edu').innerHTML = rowsHtml('edu'); }
  function fill() { FIELDS.forEach(function (k) { form.querySelector('[name=' + k + ']').value = st[k] || ''; }); fillRows(); }
  function filled(r) { return (r.t || '').trim() || (r.at || '').trim(); }
  var text = '';
  function draw() {
    $('ko-demo').hidden = !st.demo;
    var th = st.theme || 'lavan';
    card.className = 'av-card t-' + th;
    [].forEach.call($('ko-theme').children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === th); });
    var ct = [v('phone'), v('mail'), v('city')].filter(Boolean);
    var jobs = st.jobs.filter(filled), edu = st.edu.filter(filled), sk = lines(st.skills);
    var h = '<h3>' + esc(v('name') || 'השם שלי') + '</h3>' + (v('role') ? '<p class="s2">' + esc(v('role')) + '</p>' : '') +
      (ct.length ? '<p class="ct">' + ct.map(esc).join(' · ') + '</p>' : '');
    if (v('about')) h += '<h4>עליי</h4><p class="nt">' + esc(v('about')) + '</p>';
    if (jobs.length) h += '<h4>ניסיון בעבודה</h4>' + jobs.map(function (r) {
      return '<div class="job"><div class="hd"><b>' + esc(r.t) + (r.at ? ' – ' + esc(r.at) : '') + '</b><span class="yr">' + esc(r.yr) + '</span></div>' + (r.d ? '<p>' + esc(r.d) + '</p>' : '') + '</div>';
    }).join('');
    if (edu.length) h += '<h4>השכלה וקורסים</h4>' + edu.map(function (r) {
      return '<div class="job"><div class="hd"><b>' + esc(r.t) + (r.at ? ' – ' + esc(r.at) : '') + '</b><span class="yr">' + esc(r.yr) + '</span></div></div>';
    }).join('');
    if (v('army')) h += '<h4>שירות</h4><p class="nt">' + esc(v('army')) + '</p>';
    if (sk.length) h += '<h4>כישורים</h4><ul>' + sk.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    if (v('lang')) h += '<h4>שפות</h4><p class="nt">' + esc(v('lang')) + '</p>';
    if (v('extra')) h += '<h4>התנדבות ותחביבים</h4><p class="nt">' + esc(v('extra')) + '</p>';
    card.innerHTML = h;
    text = '*' + (v('name') || 'קורות חיים') + '*' + (v('role') ? '\n' + v('role') : '') + (ct.length ? '\n' + ct.join(' · ') : '') +
      (v('about') ? '\n\n*עליי*\n' + v('about') : '') +
      (jobs.length ? '\n\n*ניסיון בעבודה*\n' + jobs.map(function (r) { return '▫️ ' + r.t + (r.at ? ' – ' + r.at : '') + (r.yr ? ' (' + r.yr + ')' : '') + (r.d ? '\n' + r.d : ''); }).join('\n') : '') +
      (edu.length ? '\n\n*השכלה וקורסים*\n' + edu.map(function (r) { return '▫️ ' + r.t + (r.at ? ' – ' + r.at : '') + (r.yr ? ' (' + r.yr + ')' : ''); }).join('\n') : '') +
      (v('army') ? '\n\n*שירות*\n' + v('army') : '') + (sk.length ? '\n\n*כישורים*\n' + sk.map(function (x) { return '▫️ ' + x; }).join('\n') : '') +
      (v('lang') ? '\n\n*שפות*\n' + v('lang') : '') + (v('extra') ? '\n\n*התנדבות ותחביבים*\n' + v('extra') : '');
    $('ko-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  form.addEventListener('input', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-k')) st[t.getAttribute('data-k')][+t.getAttribute('data-i')][t.getAttribute('data-f')] = t.value;
    else if (t.name && FIELDS.indexOf(t.name) > -1) st[t.name] = t.value;
    st.demo = 0; save(); draw();
  });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]'); if (!b) return;
    st[b.getAttribute('data-rm')].splice(+b.getAttribute('data-i'), 1); st.demo = 0; save(); fillRows(); draw();
  });
  $('ko-add-job').addEventListener('click', function () { st.jobs.push({ yr: '', t: '', at: '', d: '' }); save(); fillRows(); draw(); used('add'); });
  $('ko-add-edu').addEventListener('click', function () { st.edu.push({ yr: '', t: '', at: '' }); save(); fillRows(); draw(); used('add'); });
  $('ko-theme').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]'); if (!b) return;
    st.theme = b.getAttribute('data-t'); save(); draw();
  });
  function clear() { st = { demo: 0, theme: st.theme, jobs: [{ yr: '', t: '', at: '', d: '' }], edu: [{ yr: '', t: '', at: '' }] }; save(); fill(); draw(); }
  $('ko-clear').addEventListener('click', clear);
  // 13.11.2026: "קורות חיים לדוגמא" – דוגמה מלאה לפי מקצוע (אנשים בדויים). נטענת רק אחרי אישור אם יש כבר פרטים אמיתיים.
  var EXS = {
    machsan: EX,
    student: { name: 'נועה לוי', role: 'סטודנטית לחינוך, מחפשת משרה חלקית', phone: '050-0000000', mail: 'noa@example.com', city: 'באר שבע',
      about: 'סטודנטית שנה ב׳ לחינוך. אחראית, מסודרת ואוהבת לעבוד עם אנשים. זמינה בערבים ובסופי שבוע.',
      jobs: [{ yr: '2023 – היום', t: 'מלצרית', at: 'בית קפה, באר שבע', d: 'שירות ל-30 שולחנות במשמרת, קופה וסגירת משמרת.' }, { yr: '2018 – 2020', t: 'מדריכה (התנדבות)', at: 'תנועת נוער', d: 'הדרכת קבוצה של 25 ילדים, תכנון פעולות וטיולים.' }],
      edu: [{ yr: '2024 – היום', t: 'תואר ראשון בחינוך (בלימודים)', at: 'מכללה אקדמית' }, { yr: '2017 – 2020', t: 'תעודת בגרות מלאה', at: 'תיכון עירוני' }],
      army: 'שירות לאומי, 2020–2022, סייעת בבית ספר יסודי.', skills: 'עבודה מול קהל\nסבלנות וסדר\nוורד, אקסל ו-Canva', lang: 'עברית – שפת אם, אנגלית – טובה מאוד', extra: '' },
    mazkira: { name: 'מיכל אברהם', role: 'מזכירה רפואית / פקידת קבלה', phone: '050-0000000', mail: 'michal@example.com', city: 'פתח תקווה',
      about: 'מזכירה עם 6 שנות ניסיון במרפאה עמוסה. שירותית, מדויקת ורגועה גם בלחץ.',
      jobs: [{ yr: '2019 – היום', t: 'מזכירה רפואית', at: 'מרפאה ראשונית, פתח תקווה', d: 'זימון תורים, קבלת מטופלים, תיאום בדיקות והפניות, ניהול יומן לשלושה רופאים.' }, { yr: '2016 – 2019', t: 'נציגת קבלה', at: 'מלון בתל אביב', d: 'צ׳ק-אין וצ׳ק-אאוט, טיפול בפניות אורחים בעברית ובאנגלית.' }],
      edu: [{ yr: '2018', t: 'קורס מזכירות רפואית', at: 'מכללה מקצועית' }, { yr: '2011 – 2014', t: 'תעודת בגרות', at: 'תיכון מקיף' }],
      army: 'שירות צבאי, 2014–2016, פקידת משאבי אנוש.', skills: 'מערכות זימון תורים\nאופיס ברמה גבוהה\nהקלדה מהירה', lang: 'עברית – שפת אם, אנגלית – טובה, רוסית – טובה', extra: '' },
    sherut: { name: 'דניאל מזרחי', role: 'נציג שירות ומכירות', phone: '050-0000000', mail: 'daniel@example.com', city: 'חיפה',
      about: 'נציג שירות עם יכולת שכנוע ויחס אישי. עמדתי ביעדי המכירות 10 חודשים ברציפות.',
      jobs: [{ yr: '2021 – היום', t: 'נציג שירות ומכירות', at: 'חברת תקשורת, מוקד חיפה', d: 'מענה ל-60 שיחות ביום, שימור לקוחות ומכירת שדרוגים.' }, { yr: '2019 – 2021', t: 'מוכר', at: 'חנות אלקטרוניקה', d: 'ייעוץ ללקוחות, סידור תצוגה וספירת מלאי.' }],
      edu: [{ yr: '2022', t: 'קורס מכירות ושירות', at: 'מכללה מקצועית' }, { yr: '2013 – 2016', t: 'תעודת בגרות', at: 'תיכון מקיף' }],
      army: 'שירות צבאי, 2016–2019, נהג.', skills: 'שירות לקוחות ומכירה\nמערכות CRM\nעבודה במשמרות', lang: 'עברית – שפת אם, ערבית – טובה, אנגלית – בסיסית', extra: '' },
    mitachnet: { name: 'איתי פרץ', role: 'מפתח Full Stack ג׳וניור', phone: '050-0000000', mail: 'itay@example.com', city: 'רמת גן',
      about: 'בוגר קורס פיתוח עם פרויקט אישי שעלה לאוויר. אוהב ללמוד לבד ולפתור בעיות. מחפש תפקיד ראשון בצוות פיתוח.',
      jobs: [{ yr: '2024', t: 'פרויקט גמר: אתר הזמנות למסעדה', at: 'React, Node.js, MongoDB', d: 'בניית ממשק, שרת ובסיס נתונים, עלה לאוויר ומשמש מסעדה אמיתית.' }, { yr: '2021 – 2023', t: 'טכנאי מחשבים', at: 'מעבדת תיקונים', d: 'אבחון ותיקון תקלות, התקנות רשת ושירות ללקוחות.' }],
      edu: [{ yr: '2023 – 2024', t: 'קורס פיתוח Full Stack', at: 'מכללה טכנולוגית' }, { yr: '2014 – 2017', t: 'בגרות 5 יח"ל מתמטיקה ומחשבים', at: 'תיכון מדעי' }],
      army: 'שירות צבאי, 2017–2020, תמיכה טכנית ביחידת תקשוב.', skills: 'JavaScript, React, Node.js\nGit ועבודה בצוות\nSQL בסיסי', lang: 'עברית – שפת אם, אנגלית – טובה מאוד', extra: 'קוד הפרויקטים ב-GitHub (קישור)' },
    gan: { name: 'רחל ביטון', role: 'סייעת בגן ילדים', phone: '050-0000000', mail: 'rachel@example.com', city: 'נתיבות',
      about: 'סייעת חמה וסבלנית עם 8 שנות ניסיון בגני ילדים. אוהבת יצירה ושירים, ושומרת על סדר ובטיחות.',
      jobs: [{ yr: '2018 – היום', t: 'סייעת', at: 'גן עירוני, נתיבות', d: 'עזרה לגננת, ארוחות, פעילויות יצירה וליווי ילדים עם צרכים מיוחדים.' }, { yr: '2015 – 2018', t: 'מטפלת', at: 'מעון יום', d: 'טיפול בפעוטות בגילאי שנה עד שלוש.' }],
      edu: [{ yr: '2017', t: 'קורס סייעות', at: 'משרד החינוך' }, { yr: '2016', t: 'קורס עזרה ראשונה', at: 'מד״א' }],
      army: '', skills: 'עבודה עם ילדים\nיצירה ומוזיקה\nעזרה ראשונה', lang: 'עברית – שפת אם, צרפתית – טובה', extra: 'אמא לשלושה' }
  };
  if ($('ko-ex')) $('ko-ex').addEventListener('change', function () {
    var k = this.value; this.value = '';
    if (!EXS[k] || (!st.demo && !confirm('לטעון דוגמה במקום מה שכתבתם? מה שכתבתם יימחק.'))) return;
    var t = st.theme; st = copy(EXS[k]); st.demo = 1; st.theme = t || 'lavan'; save(); fill(); draw(); used('example');
  });
  $('ko-new').addEventListener('click', function () { if (st.demo || confirm('לנקות את כל קורות החיים?')) clear(); });
  $('ko-print').addEventListener('click', function () { used('print'); window.print(); });
  $('ko-wa').addEventListener('click', function () { used('wa'); });
  fill(); draw();
})();
