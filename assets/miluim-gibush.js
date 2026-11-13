// הכנה לגיבוש – תוכנית יומית עד הגיבוש, מתוך "40 הודעות ל-40 יום" שבספר "המסע לסופר-על – מהדורת הגיבוש".
// התוכנית נשמרת בטלפון (localStorage). 40 יום ומעלה עד הגיבוש = כל 40 הימים, כשיום 40 הוא הערב שלפני.
// פחות מ-40 יום = המסלול מתכווץ לפי סדר חשיבות (GIBUSH.priority): ההתחלה, הערב שלפני וה"למה" נשארים,
// ימי מנוחה וימי ספירת הווים יוצאים ראשונים. 7 הימים הראשונים בחינם; השאר, הספר וההקלטה – לשותפים
// (קוד שותף אישי של כל הכלים, נבדק בשרת kelim-gibush).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('gb-form'), G = window.GIBUSH;
  if (!form || !G) return;
  var KEY = 'kelim-gibush', DAYS_KEY = 'kelim-gibush-days', FREE = 7, DAY = 86400000;
  var API = window.GIBUSH_API || 'https://kelim-gibush.gilad4049.workers.dev'; // GIBUSH_API = לבדיקה מקומית
  var st = null, full = null, used = {};
  function get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  try { st = JSON.parse(get(KEY) || 'null'); } catch (e) {}
  try { full = JSON.parse(get(DAYS_KEY) || 'null'); } catch (e) {}
  function save() { set(KEY, JSON.stringify(st)); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(how, extra) { if (used[how] && how !== 'done') return; used[how] = 1; if (window.toolUsed) window.toolUsed('miluim_gibush', Object.assign({ how: how }, extra || {})); }

  // ---------- תאריכים (בלי שעות: מספר ימים מ-1970 לפי השעון המקומי) ----------
  function dnum(s) { var p = s.split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / DAY); }
  function today() { var d = new Date(); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); }
  function iso(n) { return new Date(n * DAY).toISOString().slice(0, 10); }
  function heb(n) { var d = new Date(n * DAY); return d.getUTCDate() + '.' + (d.getUTCMonth() + 1); }
  var WD = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function wday(n) { return 'יום ' + WD[new Date(n * DAY).getUTCDay()]; }

  // ---------- המסלול ----------
  function plan(n) { return G.priority.slice(0, Math.max(1, Math.min(40, n))).sort(function (a, b) { return a - b; }); }
  function partner() { return get('kelim-partner') || get('chaye-code'); }
  function unlocked() { return !!(full && full.length === 40 && partner()); }
  function dayData(bn) {
    if (unlocked()) return full[bn - 1];
    return G.days[bn - 1];
  }
  function fill(s, left) { return String(s || '').replace('{left}', left); }

  // ---------- טופס ----------
  var gIn = $('gb-date'), hIn = $('gb-habit');
  gIn.min = iso(today() + 1);
  if (st) { gIn.value = iso(st.g); hIn.value = st.habit || ''; }
  else { gIn.value = iso(today() + 40); }  // דוגמה מלאה בכניסה הראשונה
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('gb-msg');
    if (!gIn.value) { msg.textContent = 'בחרו את תאריך הגיבוש.'; gIn.focus(); return; }
    var g = dnum(gIn.value), t = today(), left = g - t;
    if (left < 1) { msg.textContent = 'התאריך כבר עבר או שהוא היום. בהצלחה! ❤'; return; }
    var n = Math.min(40, left), start = g - n;
    var keep = st && st.g === g;
    st = { g: g, start: start, n: n, habit: hIn.value.trim(), done: keep ? st.done : {}, ans: keep ? st.ans : {}, made: t };
    save(); msg.textContent = '';
    track('add', { days: n });
    draw(true);
  });
  hIn.addEventListener('change', function () { if (st) { st.habit = hIn.value.trim(); save(); draw(); } });

  var view = null; // יום במסלול שמוצג (1..n)
  function draw(scroll) {
    var box = $('gb-out');
    if (!st) { box.hidden = true; demo(); return; }
    box.hidden = false; $('gb-demo').hidden = true;
    var t = today(), days = plan(st.n), i = t - st.start + 1; // היום הנוכחי במסלול
    var cur = Math.max(1, Math.min(st.n, i));
    if (!view) view = cur;
    var doneN = days.filter(function (b) { return st.done[b]; }).length;
    var left = st.g - t;
    $('gb-left').textContent = left > 0 ? left : 0;
    $('gb-left-l').textContent = left === 1 ? 'מחר הגיבוש' : left > 0 ? 'ימים לגיבוש' : 'הגיבוש היום';
    $('gb-donen').textContent = doneN + '/' + st.n;
    $('gb-bar').style.width = Math.round(100 * doneN / st.n) + '%';
    $('gb-habit-show').innerHTML = st.habit ? 'ההרגל שלי: <b>' + esc(st.habit) + '</b>' : 'עוד לא כתבתם את ההרגל שבחרתם. ביום 1 בוחרים הרגל אחד.';
    var head = '';
    if (i < 1) head = 'המסלול מתחיל ב' + wday(st.start) + ', ' + heb(st.start) + '. בינתיים אפשר לקרוא את יום 1 ואת המדריך למטה.';
    else if (i > st.n) head = left > 0 ? '' : 'היום הגיבוש. נתתם הכול בהכנה. עכשיו רק המשימה הבאה. בהצלחה ❤';
    else if (st.n < 40) head = 'נשארו פחות מ-40 יום, אז המסלול קוצר ל-' + st.n + ' ימים: נשארו הימים החשובים, וימי ספירה ומנוחה יצאו.';
    $('gb-head').textContent = head; $('gb-head').hidden = !head;
    card(days, Math.max(1, Math.min(st.n, view)), i);
    // רשימת הימים
    $('gb-grid').innerHTML = days.map(function (b, k) {
      var d = k + 1, lock = d > FREE && !unlocked(), date = st.start + d - 1;
      var cls = (st.done[b] ? ' ok' : '') + (d === i ? ' now' : '') + (d === view ? ' sel' : '') + (lock ? ' lock' : '') + (G.days[b - 1].r ? ' rest' : '');
      return '<button type="button" class="gb-d' + cls + '" data-d="' + d + '" aria-label="יום ' + d + ' – ' + esc(G.days[b - 1].t) + (st.done[b] ? ', עשיתי' : '') + (lock ? ', לשותפים' : '') + '">' +
        '<b>' + d + '</b><small>' + heb(date) + '</small>' + (st.done[b] ? '<i aria-hidden="true">✓</i>' : lock ? '<i aria-hidden="true">🔒</i>' : '') + '</button>';
    }).join('');
    printBoard(days);
    $('gb-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(
      'אני מתכונן לגיבוש ב-' + heb(st.g) + '. יש לי תוכנית יומית: משימה, משפט ושאלה לכל יום עד הגיבוש.' + (st.habit ? ' ההרגל שבחרתי: ' + st.habit + '.' : '') + ' עשיתי כבר ' + doneN + ' ימים מתוך ' + st.n + '.\n' + location.origin + location.pathname);
    partnerUi();
    if (scroll) $('gb-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function card(days, d, i) {
    var b = days[d - 1], x = dayData(b), lock = d > FREE && !unlocked(), date = st.start + d - 1;
    var left = st.g - date - 1; // כמה ימים נשארים אחרי היום הזה עד הערב שלפני (כמו בספר: ביום 8 "עוד 32")
    var c = $('gb-card');
    var label = d === i ? 'היום' : d === i + 1 ? 'מחר' : d < i ? 'יום שעבר' : wday(date) + ' ' + heb(date);
    var top = '<p class="gb-k">יום ' + d + ' מתוך ' + st.n + ' · ' + label + (st.n < 40 ? ' <span>(יום ' + b + ' בספר)</span>' : '') + '</p><h3>' + esc(x.t) + '</h3>';
    if (lock || !x.k) {
      c.innerHTML = top + '<div class="gb-lockbox"><p>🔒 היום הזה פתוח לשותפים במיזם. 7 הימים הראשונים בחינם לכולם.</p><a class="btn btn-gold btn-sm" href="#gb-partner">להמשיך את כל המסלול – שותפים ב-18 ₪</a></div>' + nav(d);
      return;
    }
    var ans = st.ans[b] || '', done = !!st.done[b];
    c.innerHTML = top + (x.r ? '<p class="gb-rest">יום מנוחה</p>' : '') +
      '<blockquote>' + esc(x.q) + '</blockquote>' +
      '<p class="gb-task"><b>המשימה של היום:</b> ' + esc(fill(x.k, left)) + '</p>' +
      '<label class="gb-q" for="gb-ans">שאלה להיום: <b>' + esc(x.a) + '</b></label>' +
      '<textarea id="gb-ans" rows="2" maxlength="400" placeholder="התשובה שלי (נשמרת רק בטלפון)">' + esc(ans) + '</textarea>' +
      (b === 40 ? '<div class="gb-erev" id="gb-erev-slot"></div>' : '') +
      '<button class="btn ' + (done ? 'btn-line' : 'btn-gold') + ' btn-block" type="button" id="gb-done" aria-pressed="' + done + '">' + (done ? '✓ עשיתי (ללחוץ לביטול)' : 'עשיתי ✓') + '</button>' + nav(d);
    $('gb-ans').addEventListener('input', function () { st.ans[b] = this.value; save(); });
    $('gb-done').addEventListener('click', function () {
      if (st.done[b]) delete st.done[b]; else { st.done[b] = 1; track('done', { day: d }); }
      save(); draw();
    });
    if (b === 40) erevSlot();
  }
  function nav(d) {
    return '<div class="gb-nav"><button type="button" class="btn btn-line btn-sm" data-go="' + (d - 1) + '"' + (d <= 1 ? ' disabled' : '') + '>→ יום קודם</button>' +
      '<button type="button" class="btn btn-line btn-sm" data-go="' + (d + 1) + '"' + (d >= st.n ? ' disabled' : '') + '>יום הבא ←</button></div>';
  }
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go],[data-d]');
    if (!g || !st) return;
    view = +(g.getAttribute('data-go') || g.getAttribute('data-d'));
    draw(); if (g.hasAttribute('data-d')) $('gb-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // דוגמה לפני שבונים תוכנית: יום 1 מהספר
  function demo() {
    var x = G.days[0];
    $('gb-demo').hidden = false;
    $('gb-demo').innerHTML = '<p class="gb-k">כך נראה יום בתוכנית · יום 1</p><h3>' + esc(x.t) + '</h3><blockquote>' + esc(x.q) + '</blockquote><p class="gb-task"><b>המשימה של היום:</b> ' + esc(x.k) + '</p><p class="gb-q">שאלה להיום: <b>' + esc(x.a) + '</b></p>';
  }

  // ---------- לוח להדפסה (כמו לוח 40 הימים שבסוף הספר) ----------
  function printBoard(days) {
    $('gb-print').innerHTML = '<h2>לוח ההכנה שלי לגיבוש</h2><p>' + (st.habit ? 'ההרגל שלי: <b>' + esc(st.habit) + '</b> · ' : '') + 'הגיבוש: ' + heb(st.g) + '</p><ol>' +
      days.map(function (b, k) { return '<li><span class="bx">' + (st.done[b] ? '✓' : '') + '</span><b>' + (k + 1) + '</b> ' + heb(st.start + k) + ' · ' + esc(G.days[b - 1].t) + '</li>'; }).join('') + '</ol><p class="ft">הכנה לגיבוש · hakelim.com · מתוך "המסע לסופר-על – מהדורת הגיבוש"</p>';
  }
  $('gb-printbtn').addEventListener('click', function () { track('print'); window.print(); });

  // ---------- תזכורת יומית ביומן (קובץ ics) ----------
  $('gb-ics').addEventListener('click', function () {
    if (!st) return;
    var s = st.start, stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', url = location.origin + location.pathname;
    var d8 = function (n) { return iso(n).replace(/-/g, ''); };
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim//gibush//HE', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', 'UID:gibush-day-' + st.g + '@hakelim.com', 'DTSTAMP:' + stamp, 'DTSTART:' + d8(s) + 'T070000', 'DURATION:PT10M',
      'RRULE:FREQ=DAILY;COUNT=' + st.n, 'SUMMARY:הכנה לגיבוש – המשימה של היום', 'DESCRIPTION:משימה\\, משפט ושאלה ליום: ' + url, 'URL:' + url,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:המשימה של היום', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:gibush-erev-' + st.g + '@hakelim.com', 'DTSTAMP:' + stamp, 'DTSTART:' + d8(st.g - 1) + 'T210000', 'DURATION:PT10M',
      'SUMMARY:הערב שלפני הגיבוש – ההקלטה ולישון מוקדם', 'DESCRIPTION:' + url, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'הכנה-לגיבוש.ics'; document.body.appendChild(a); a.click(); a.remove();
    track('ics');
  });
  $('gb-reset').addEventListener('click', function () {
    if (!confirm('למחוק את התוכנית ואת הסימונים ולהתחיל מחדש?')) return;
    st = null; view = null; set(KEY, null); gIn.value = iso(today() + 40); hIn.value = ''; draw();
  });

  // ---------- שותפים ----------
  function partnerUi() {
    var on = unlocked();
    $('gb-p-off').hidden = on; $('gb-p-on').hidden = !on;
    var c = partner(); if (c && !$('gb-code').value) $('gb-code').value = c;
  }
  function openCode(code, quiet) {
    var msg = $('gb-pmsg');
    if (!/^\d{3}-?\d{5}$/.test(code)) { if (!quiet) msg.textContent = 'הקוד בנוי משלוש ספרות, מקף וחמש ספרות.'; return; }
    msg.textContent = 'בודק את הקוד…';
    fetch(API + '/open', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: code }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.ok && j.days) {
          full = j.days; set(DAYS_KEY, JSON.stringify(full)); set('kelim-partner', code); set('chaye-code', code);
          msg.textContent = '✓ נפתח. תודה שאתם שותפים ❤ כל המסלול, הספר וההקלטה פתוחים, וללא הגבלה בכל הכלים.';
          track('partner_open'); if (window.gtag) gtag('event', 'partner_code_saved', { tool: 'miluim_gibush' });
          draw();
        } else msg.textContent = j.badCode ? 'הקוד לא נמצא. בדקו שהעתקתם אותו בדיוק כמו שקיבלתם.' : (j.error || 'משהו השתבש. נסו שוב.');
      })
      .catch(function () { msg.textContent = 'אין חיבור לשרת כרגע. נסו שוב בעוד רגע.'; });
  }
  $('gb-open').addEventListener('click', function () { openCode($('gb-code').value.replace(/\s/g, '')); });
  // קוד שנשמר בפס "יש לי קוד שותף" למעלה (kelim.js) – פותח גם כאן
  if (partner() && !unlocked()) openCode(partner(), true);

  function file(kind, then) {
    var code = partner(), msg = $('gb-pmsg');
    msg.textContent = 'טוען…';
    return fetch(API + '/file/' + kind, { method: 'POST', headers: { 'x-kelim-partner': code } })
      .then(function (r) { if (!r.ok) throw new Error(); return r.blob(); })
      .then(function (b) { msg.textContent = ''; then(URL.createObjectURL(b)); })
      .catch(function () { msg.textContent = 'לא הצלחתי לטעון את הקובץ. נסו שוב בעוד רגע.'; });
  }
  function dl(kind, name) {
    file(kind, function (u) { var a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); });
    track('dl_' + kind);
  }
  $('gb-book').addEventListener('click', function () { dl('book', 'המסע לסופר-על שבך - מהדורת הגיבוש.pdf'); });
  $('gb-40').addEventListener('click', function () { dl('days', '40 הודעות ל-40 יום.pdf'); });
  function play(where) {
    file('erev', function (u) {
      where.innerHTML = '<audio controls preload="auto" src="' + u + '"></audio>';
      var au = where.querySelector('audio'); au.play().catch(function () {});
    });
    track('erev');
  }
  $('gb-erev').addEventListener('click', function () { play($('gb-erev-box')); });
  function erevSlot() {
    var s = $('gb-erev-slot'); if (!s) return;
    if (unlocked()) { s.innerHTML = '<button class="btn btn-line btn-sm" type="button">▶ לשמוע את ההקלטה לערב שלפני (3 דקות)</button>'; s.firstChild.addEventListener('click', function () { play(s); }); }
    else s.innerHTML = '<p class="note">ההקלטה לערב שלפני (3 דקות, בקולי) פתוחה לשותפים. <a class="gold" href="#gb-partner">איך נהיים שותפים?</a></p>';
  }

  draw();
})();
