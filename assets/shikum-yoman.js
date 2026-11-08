// יומן פניות: כל פנייה (מתי, למי, מה נאמר, הצעד הבא) נשמרת בטלפון (localStorage).
// צעדים פתוחים עולים ל"מחכה לי", עם תזכורת ביומן גוגל ושליחה בווטסאפ.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('yo-form');
  if (!form) return;
  var KEY = 'kelim-shikum-yoman', TOOL = 'shikum_yoman', DAY = 86400000;
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function ago(n) { return iso(new Date(Date.now() - n * DAY)); }
  // בכניסה הראשונה: דוגמה, כדי שיהיה ברור איך זה נראה. נמחקת בפנייה הראשונה שנשמרת.
  var st = { demo: 1, items: [
    { id: 'd1', date: ago(12), how: 'טלפון', to: 'אגף השיקום', who: 'רונית, מוקד', what: 'שאלתי איפה עומד הטופס ששלחתי. אמרו שהוא התקבל ושצריך לשלוח עוד מכתב מהרופא.', ref: '', next: 'לבקש מכתב מהרופא ולשלוח', due: ago(-3), done: 0 },
    { id: 'd2', date: ago(20), how: 'מייל', to: 'ביטוח לאומי', who: '', what: 'שלחתי את הטפסים במייל. קיבלתי אישור קבלה אוטומטי.', ref: '12345', next: '', due: '', done: 0 }
  ] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.items) st = sv; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function heb(s) { if (!s) return ''; var p = s.split('-'); return +p[2] + '.' + +p[1] + '.' + p[0]; }
  function today() { return iso(new Date()); }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  function one(r) {
    return heb(r.date) + ' · ' + r.how + ' · ' + r.to + (r.who ? ' (' + r.who + ')' : '') +
      (r.what ? '\n' + r.what : '') + (r.ref ? '\nמספר פנייה: ' + r.ref : '') +
      (r.next ? '\nהצעד הבא: ' + r.next + (r.due ? ' (עד ' + heb(r.due) + ')' : '') + (r.done ? ' ✓ בוצע' : '') : '');
  }
  function gcal(r) {
    var a = r.due.replace(/-/g, ''), d = new Date(r.due + 'T12:00:00'); d.setDate(d.getDate() + 1);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(r.next + ' – ' + r.to) +
      '&dates=' + a + '/' + iso(d).replace(/-/g, '') + '&details=' + encodeURIComponent(one(r) + '\n\n' + location.origin + location.pathname);
  }
  function card(r) {
    var late = r.next && !r.done && r.due && r.due < today();
    return '<div class="sk-item' + (late ? ' late' : '') + '"><div class="top"><b>' + esc(r.to) + '</b><span>' + heb(r.date) + ' · ' + esc(r.how) + (r.who ? ' · ' + esc(r.who) : '') + '</span></div>' +
      (r.what ? '<p>' + esc(r.what) + '</p>' : '') + (r.ref ? '<p><span class="lbl">מספר פנייה:</span> ' + esc(r.ref) + '</p>' : '') +
      (r.next ? '<p class="next' + (r.done ? ' done' : '') + '"><span class="lbl">הצעד הבא:</span> ' + esc(r.next) + (r.due ? ' <span class="' + (late ? 'due' : 'lbl') + '">(עד ' + heb(r.due) + (late ? ', עבר התאריך' : '') + ')</span>' : '') + '</p>' : '') +
      '<div class="acts">' + (r.next ? '<button type="button" data-done="' + r.id + '">' + (r.done ? 'להחזיר לפתוח' : 'בוצע ✓') + '</button>' : '') +
      (r.next && r.due && !r.done ? '<a href="' + gcal(r) + '" target="_blank" rel="noopener" data-cal="1">תזכורת ביומן</a>' : '') +
      '<a href="https://api.whatsapp.com/send?text=' + encodeURIComponent(one(r)) + '" target="_blank" rel="noopener" data-wa1="1">ווטסאפ</a>' +
      '<button type="button" data-del="' + r.id + '">למחוק</button></div></div>';
  }
  var text = '';
  function draw() {
    st.items.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    $('yo-demo').hidden = !st.demo;
    var wait = st.items.filter(function (r) { return r.next && !r.done; }).sort(function (a, b) { return (a.due || '9') < (b.due || '9') ? -1 : 1; });
    $('yo-wait-s').hidden = !wait.length;
    $('yo-wait').innerHTML = wait.map(card).join('');
    $('yo-list').innerHTML = st.items.length ? st.items.map(card).join('') : '<p class="sk-empty">עוד אין פניות. רושמים את הראשונה למעלה.</p>';
    text = 'יומן הפניות שלי\n\n' + st.items.map(one).join('\n\n');
    $('yo-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  function find(id) { for (var i = 0; i < st.items.length; i++) if (st.items[i].id === id) return i; return -1; }
  $('yo-date').value = today();
  $('yo-chips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    $('yo-to').value = b.textContent;
    [].forEach.call(this.children, function (c) { c.classList.toggle('on', c === b); });
  });
  $('yo-to').addEventListener('input', function () { [].forEach.call($('yo-chips').children, function (c) { c.classList.remove('on'); }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var to = $('yo-to').value.trim(), msg = $('yo-msg');
    if (!to) { msg.textContent = 'חסר למי פניתי.'; $('yo-to').focus(); return; }
    if (st.demo) { st.items = []; st.demo = 0; }
    st.items.push({ id: 'p' + Date.now(), date: $('yo-date').value || today(), how: $('yo-how').value, to: to, who: $('yo-who').value.trim(),
      what: $('yo-what').value.trim(), ref: $('yo-ref').value.trim(), next: $('yo-next').value.trim(), due: $('yo-next').value.trim() ? $('yo-due').value : '', done: 0 });
    save(); draw();
    msg.textContent = 'נשמר ביומן ✓';
    ['yo-who', 'yo-what', 'yo-ref', 'yo-next', 'yo-due'].forEach(function (id) { $(id).value = ''; });
    used('add');
  });
  $('yo-demo-x').addEventListener('click', function () { st = { demo: 0, items: [] }; save(); draw(); });
  document.querySelector('.tool').addEventListener('click', function (e) {
    var t = e.target.closest('[data-done],[data-del],[data-cal],[data-wa1]'); if (!t) return;
    if (t.hasAttribute('data-cal')) { used('calendar'); return; }
    if (t.hasAttribute('data-wa1')) { used('wa'); return; }
    var i = find(t.getAttribute('data-done') || t.getAttribute('data-del')); if (i < 0) return;
    if (t.hasAttribute('data-done')) { st.items[i].done = st.items[i].done ? 0 : 1; if (st.items[i].done) used('done'); }
    else if (confirm('למחוק את הפנייה הזאת מהיומן?')) st.items.splice(i, 1);
    else return;
    save(); draw();
  });
  $('yo-wa').addEventListener('click', function () { used('wa'); });
  $('yo-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
  });
  draw();
})();
