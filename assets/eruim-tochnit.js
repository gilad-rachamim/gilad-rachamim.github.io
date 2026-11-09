// תוכנית האירוע: שלבים עם שעה ומי אחראי, אנשי צוות, דף להדפסה בשלושה סגנונות ושליחה בווטסאפ.
// הכול נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('tc-form')) return;
  var KEY = 'kelim-eruim-tochnit', TOOL = 'eruim_tochnit';
  var TPL = {
    chatuna: [['18:30', 'קבלת פנים', 'צלם: תמונות משפחה'], ['19:30', 'כיסוי הכלה (בדקן)', 'הורי החתן והכלה'], ['19:45', 'חופה וקידושין', 'הרב המסדר'], ['20:30', 'כניסת החתן והכלה ורחבה ראשונה', 'די-ג\'יי'], ['21:15', 'מנה עיקרית', 'האולם'], ['21:45', 'ברכות ונאומים', 'אחי הכלה מנחה'], ['22:15', 'רחבה שנייה', 'די-ג\'יי'], ['23:15', 'קינוח וברכת המזון', ''], ['23:45', 'סיום ופינוי', 'האולם']],
    bar: [['19:00', 'קבלת פנים', 'צלם'], ['19:45', 'כניסת בר המצווה', 'די-ג\'יי'], ['20:00', 'מנה ראשונה', 'האולם'], ['20:20', 'דרשת בר המצווה', ''], ['20:40', 'סרטון ומצגת', 'דוד מקרין'], ['21:00', 'ריקודים', 'די-ג\'יי'], ['21:45', 'דברי ההורים', ''], ['22:15', 'קינוח וברכת המזון', '']],
    brit: [['07:30', 'תפילת שחרית', 'בית הכנסת'], ['08:30', 'ברית מילה', 'המוהל, הסנדק'], ['08:50', 'קריאת השם', ''], ['09:00', 'סעודת מצווה', 'הקייטרינג'], ['09:30', 'דברי תורה וברכות', 'סבא'], ['10:00', 'ברכת המזון', '']],
    erusin: [['19:30', 'הגעת המשפחות', ''], ['20:00', 'כיבוד', ''], ['20:30', 'שבירת הצלחת', 'האמהות'], ['20:45', 'דברי ברכה', 'האבות'], ['21:15', 'תמונות משפחה', 'צלם']],
    erev: [['19:30', 'התכנסות', ''], ['20:00', 'ארוחה', ''], ['20:45', 'ברכות ומצגת', ''], ['21:30', 'קינוח', '']]
  };
  function rows(k) { return TPL[k].map(function (r, i) { return { id: k + i + '-' + Date.now(), t: r[0], what: r[1], who: r[2] }; }); }
  function inDays(n) { var d = new Date(Date.now() + n * 86400000); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  // בכניסה הראשונה: דוגמה מלאה עם שמות בדויים.
  var st = { demo: 1, theme: 'klaf', title: 'החתונה של נועה ואביתר', date: inDays(40), place: 'אולמי הגן, נתיבות', items: rows('chatuna'), team: [
    { id: 'm1', role: 'מנהלת האירוע', name: 'שירה (דודה)', phone: '050-1111111' },
    { id: 'm2', role: 'צלם', name: 'אלי', phone: '052-2222222' },
    { id: 'm3', role: 'די-ג\'יי', name: 'רועי', phone: '054-3333333' },
    { id: 'm4', role: 'האולם', name: 'מנהל המשמרת', phone: '08-4444444' }
  ] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.items) st = sv; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function heb(s) { if (!s) return ''; var p = s.split('-'); return +p[2] + '.' + +p[1] + '.' + p[0]; }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  function undemo() { if (st.demo) { st.demo = 0; $('tc-demo').hidden = true; } }
  function sort() { st.items.sort(function (a, b) { return (a.t || '99') < (b.t || '99') ? -1 : (a.t || '99') > (b.t || '99') ? 1 : 0; }); }
  function drawList() {
    sort();
    $('tc-list').innerHTML = st.items.length ? st.items.map(function (r) {
      return '<div class="er-row" data-id="' + r.id + '"><input type="time" data-f="t" value="' + esc(r.t) + '" aria-label="שעה">' +
        '<input type="text" data-f="what" maxlength="70" value="' + esc(r.what) + '" placeholder="מה קורה" aria-label="מה קורה">' +
        '<span></span><input class="who" type="text" data-f="who" maxlength="60" value="' + esc(r.who) + '" placeholder="מי אחראי (לא חובה)" aria-label="מי אחראי">' +
        '<div class="acts"><button type="button" data-del="1">למחוק</button></div></div>';
    }).join('') : '<p class="er-empty">עוד אין שלבים. בוחרים תבנית למעלה, או מוסיפים שלב.</p>';
    $('tc-team').innerHTML = st.team.map(function (m) {
      return '<div class="er-team" data-id="' + m.id + '"><input type="text" data-f="role" maxlength="40" value="' + esc(m.role) + '" placeholder="תפקיד" aria-label="תפקיד">' +
        '<input type="text" data-f="name" maxlength="40" value="' + esc(m.name) + '" placeholder="שם" aria-label="שם">' +
        '<input type="tel" data-f="phone" maxlength="20" value="' + esc(m.phone) + '" placeholder="טלפון" aria-label="טלפון" dir="ltr">' +
        '<button class="er-mini" type="button" data-del="1" aria-label="למחוק">✕</button></div>';
    }).join('');
  }
  var text = '';
  function drawCard() {
    $('tc-demo').hidden = !st.demo;
    var c = $('tc-card');
    c.className = 'er-card t-' + (st.theme || 'lavan');
    [].forEach.call($('tc-theme').children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === st.theme); });
    var sub = [st.date ? heb(st.date) : '', st.place || ''].filter(Boolean).join(' · ');
    var items = st.items.filter(function (r) { return r.what; });
    var team = st.team.filter(function (m) { return m.role || m.name; });
    c.innerHTML = '<h3>' + esc(st.title || 'תוכנית האירוע') + '</h3>' + (sub ? '<p class="s2">' + esc(sub) + '</p>' : '<p class="s2">תוכנית האירוע</p>') +
      '<table><thead><tr><th>שעה</th><th>מה קורה</th><th>מי אחראי</th></tr></thead><tbody>' +
      (items.length ? items.map(function (r) { return '<tr><td class="rl">' + esc(r.t) + '</td><td>' + esc(r.what) + '</td><td>' + esc(r.who) + '</td></tr>'; }).join('') : '<tr><td colspan="3">עוד אין שלבים</td></tr>') +
      '</tbody></table>' +
      (team.length ? '<h4>אנשי הצוות</h4><table><tbody>' + team.map(function (m) { return '<tr><td class="rl">' + esc(m.role) + '</td><td>' + esc(m.name) + '</td><td dir="ltr">' + esc(m.phone) + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
      '<p class="ft">בשעה טובה ומוצלחת!</p>';
    text = '*' + (st.title || 'תוכנית האירוע') + '*' + (sub ? '\n' + sub : '') + '\n\n' +
      items.map(function (r) { return (r.t ? r.t + ' – ' : '') + r.what + (r.who ? ' (' + r.who + ')' : ''); }).join('\n') +
      (team.length ? '\n\n*אנשי הצוות*\n' + team.map(function (m) { return [m.role, m.name, m.phone].filter(Boolean).join(' – '); }).join('\n') : '') +
      '\n\nבשעה טובה ומוצלחת!';
    $('tc-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  function draw() { drawList(); drawCard(); }
  function fill() { $('tc-title').value = st.title || ''; $('tc-date').value = st.date || ''; $('tc-place').value = st.place || ''; }
  ['title', 'date', 'place'].forEach(function (k) {
    $('tc-' + k).addEventListener('input', function () { st[k] = this.value.trim(); undemo(); save(); drawCard(); });
  });
  $('tc-form').addEventListener('submit', function (e) { e.preventDefault(); });
  $('tc-tpl').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var k = b.getAttribute('data-k');
    if (st.items.length && !st.demo && !confirm('להחליף את השלבים שברשימה בתבנית "' + b.textContent + '"?')) return;
    st.items = rows(k); undemo(); save(); draw();
    $('tc-msg').textContent = 'התבנית נטענה. משנים שעות ושמות לפי השמחה שלכם.';
    used('template');
  });
  function onEdit(listId, arr) {
    var box = $(listId);
    box.addEventListener('input', function (e) {
      var inp = e.target.closest('[data-f]'), row = e.target.closest('[data-id]'); if (!inp || !row) return;
      var id = row.getAttribute('data-id');
      arr().forEach(function (r) { if (r.id === id) r[inp.getAttribute('data-f')] = inp.value; });
      undemo(); save(); drawCard();
    });
    box.addEventListener('change', function (e) { if (e.target.getAttribute('data-f') === 't') { drawList(); } });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]'), row = e.target.closest('[data-id]'); if (!b || !row) return;
      var id = row.getAttribute('data-id');
      if (listId === 'tc-list') st.items = st.items.filter(function (r) { return r.id !== id; });
      else st.team = st.team.filter(function (r) { return r.id !== id; });
      undemo(); save(); draw();
    });
  }
  onEdit('tc-list', function () { return st.items; });
  onEdit('tc-team', function () { return st.team; });
  $('tc-add').addEventListener('click', function () {
    var last = st.items.length ? st.items[st.items.length - 1].t : '';
    var t = '';
    if (last) { var p = last.split(':'), m = (+p[0]) * 60 + (+p[1]) + 30; t = ('0' + Math.floor(m / 60) % 24).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
    var id = 's' + Date.now();
    st.items.push({ id: id, t: t, what: '', who: '' }); undemo(); save(); draw();
    var el = document.querySelector('#tc-list [data-id="' + id + '"] [data-f="what"]'); if (el) el.focus();
    used('add');
  });
  $('tc-tadd').addEventListener('click', function () {
    var id = 'm' + Date.now();
    st.team.push({ id: id, role: '', name: '', phone: '' }); undemo(); save(); draw();
    var el = document.querySelector('#tc-team [data-id="' + id + '"] [data-f="role"]'); if (el) el.focus();
  });
  $('tc-demo-x').addEventListener('click', function () { st = { demo: 0, theme: st.theme, title: '', date: '', place: '', items: [], team: [] }; save(); fill(); draw(); });
  $('tc-theme').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.theme = b.getAttribute('data-t'); save(); drawCard(); });
  $('tc-print').addEventListener('click', function () { used('print'); window.print(); });
  $('tc-wa').addEventListener('click', function () { used('wa'); });
  $('tc-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
  });
  fill(); draw();
})();
