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
  $('ko-new').addEventListener('click', function () { if (st.demo || confirm('לנקות את כל קורות החיים?')) clear(); });
  $('ko-print').addEventListener('click', function () { used('print'); window.print(); });
  $('ko-wa').addEventListener('click', function () { used('wa'); });
  fill(); draw();
})();
