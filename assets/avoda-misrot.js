// מעקב משרות: כל משרה (איפה, תפקיד, מתי, סטטוס, הצעד הבא) נשמרת בטלפון (localStorage).
// צעדים פתוחים עולים ל"מחכה לי", עם תזכורת ביומן גוגל ושליחה בווטסאפ.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('mi-form');
  if (!form) return;
  var KEY = 'kelim-avoda-misrot', TOOL = 'avoda_misrot', DAY = 86400000;
  var STS = ['נשלח', 'חזרו אליי', 'נקבע ראיון', 'הייתי בראיון', 'מחכה לתשובה', 'התקבלתי', 'לא הפעם'];
  var WIN = 'התקבלתי', NO = 'לא הפעם';
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function ago(n) { return iso(new Date(Date.now() - n * DAY)); }
  // בכניסה הראשונה: דוגמה (מקומות בדויים). נמחקת במשרה הראשונה שנשמרת.
  var st = { demo: 1, items: [
    { id: 'd1', at: 'מרכז לוגיסטי בדרום', role: 'מחסנאי', date: ago(9), st: 'נקבע ראיון', src: 'חבר המליץ', who: 'שרית, משאבי אנוש', note: 'ביקשו להביא קורות חיים מודפסים.', next: 'ראיון ביום שלישי ב-10:00', due: ago(-2) },
    { id: 'd2', at: 'רשת סופרמרקטים', role: 'סדרן', date: ago(14), st: 'נשלח', src: 'אתר דרושים', who: '', note: '', next: 'להתקשר לשאול אם קיבלו', due: ago(1) },
    { id: 'd3', at: 'חברת הובלות', role: 'נהג חלוקה', date: ago(25), st: 'לא הפעם', src: 'קבוצת ווטסאפ', who: '', note: 'אמרו שישמרו את קורות החיים.', next: '', due: '' }
  ] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.items) st = sv; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function heb(s) { if (!s) return ''; var p = s.split('-'); return +p[2] + '.' + +p[1] + '.' + p[0]; }
  function today() { return iso(new Date()); }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  function closed(r) { return r.st === WIN || r.st === NO; }
  function open(r) { return r.next && !closed(r); }
  function title(r) { return (r.role ? r.role + ' – ' : '') + r.at; }
  function one(r) {
    return title(r) + '\nנשלח ' + heb(r.date) + ' · ' + r.st + (r.src ? ' · ' + r.src : '') + (r.who ? '\nאיש קשר: ' + r.who : '') +
      (r.note ? '\n' + r.note : '') + (r.next ? '\nהצעד הבא: ' + r.next + (r.due ? ' (עד ' + heb(r.due) + ')' : '') : '');
  }
  function gcal(r) {
    var a = r.due.replace(/-/g, ''), d = new Date(r.due + 'T12:00:00'); d.setDate(d.getDate() + 1);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(r.next + ' – ' + r.at) +
      '&dates=' + a + '/' + iso(d).replace(/-/g, '') + '&details=' + encodeURIComponent(one(r) + '\n\n' + location.origin + location.pathname);
  }
  function opts(sel) { return STS.map(function (s) { return '<option' + (s === sel ? ' selected' : '') + '>' + s + '</option>'; }).join(''); }
  function card(r) {
    var late = open(r) && r.due && r.due < today();
    var cls = r.st === WIN ? ' win' : r.st === NO ? ' no' : '';
    return '<div class="av-item' + (late ? ' late' : '') + (closed(r) ? ' closed' : '') + '"><div class="top"><b>' + esc(title(r)) + '</b><span>נשלח ' + heb(r.date) + (r.src ? ' · ' + esc(r.src) : '') + '</span></div>' +
      '<span class="st' + cls + '">' + esc(r.st) + '</span>' +
      (r.who ? '<p><span class="lbl">איש קשר:</span> ' + esc(r.who) + '</p>' : '') + (r.note ? '<p>' + esc(r.note) + '</p>' : '') +
      (r.next && !closed(r) ? '<p class="next"><span class="lbl">הצעד הבא:</span> ' + esc(r.next) + (r.due ? ' <span class="' + (late ? 'due' : 'lbl') + '">(עד ' + heb(r.due) + (late ? ', עבר התאריך' : '') + ')</span>' : '') + '</p>' : '') +
      '<div class="acts"><select data-st="' + r.id + '" aria-label="לשנות סטטוס">' + opts(r.st) + '</select>' +
      (open(r) && r.due ? '<a href="' + gcal(r) + '" target="_blank" rel="noopener" data-cal="1">תזכורת ביומן</a>' : '') +
      '<a href="https://api.whatsapp.com/send?text=' + encodeURIComponent(one(r)) + '" target="_blank" rel="noopener" data-wa1="1">ווטסאפ</a>' +
      '<button type="button" data-del="' + r.id + '">למחוק</button></div></div>';
  }
  var text = '';
  function draw() {
    st.items.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    $('mi-demo').hidden = !st.demo;
    var cnt = {}; st.items.forEach(function (r) { cnt[r.st] = (cnt[r.st] || 0) + 1; });
    $('mi-sum').innerHTML = st.items.length ? '<span>סך הכול <b>' + st.items.length + '</b></span>' + STS.filter(function (s) { return cnt[s]; }).map(function (s) { return '<span>' + s + ' <b>' + cnt[s] + '</b></span>'; }).join('') : '';
    var wait = st.items.filter(open).sort(function (a, b) { return (a.due || '9') < (b.due || '9') ? -1 : 1; });
    $('mi-wait-s').hidden = !wait.length;
    $('mi-wait').innerHTML = wait.map(card).join('');
    $('mi-list').innerHTML = st.items.length ? st.items.map(card).join('') : '<p class="av-empty">עוד אין משרות. רושמים את הראשונה למעלה.</p>';
    text = 'המשרות ששלחתי אליהן\n\n' + st.items.map(one).join('\n\n');
    $('mi-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  function find(id) { for (var i = 0; i < st.items.length; i++) if (st.items[i].id === id) return i; return -1; }
  $('mi-st').innerHTML = opts('נשלח');
  $('mi-date').value = today();
  $('mi-chips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    $('mi-src').value = b.textContent;
    [].forEach.call(this.children, function (c) { c.classList.toggle('on', c === b); });
  });
  $('mi-src').addEventListener('input', function () { [].forEach.call($('mi-chips').children, function (c) { c.classList.remove('on'); }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var at = $('mi-at').value.trim(), msg = $('mi-msg');
    if (!at) { msg.textContent = 'חסר איפה (שם המקום).'; $('mi-at').focus(); return; }
    if (st.demo) { st.items = []; st.demo = 0; }
    var nx = $('mi-next').value.trim();
    st.items.push({ id: 'm' + Date.now(), at: at, role: $('mi-role').value.trim(), date: $('mi-date').value || today(), st: $('mi-st').value,
      src: $('mi-src').value.trim(), who: $('mi-who').value.trim(), note: $('mi-note').value.trim(), next: nx, due: nx ? $('mi-due').value : '' });
    save(); draw();
    msg.textContent = 'נוסף לרשימה ✓';
    ['mi-at', 'mi-role', 'mi-src', 'mi-who', 'mi-note', 'mi-next', 'mi-due'].forEach(function (id) { $(id).value = ''; });
    $('mi-st').value = 'נשלח';
    [].forEach.call($('mi-chips').children, function (c) { c.classList.remove('on'); });
    used('add');
  });
  $('mi-demo-x').addEventListener('click', function () { st = { demo: 0, items: [] }; save(); draw(); });
  var tool = document.querySelector('.tool');
  tool.addEventListener('change', function (e) {
    var s = e.target.closest('[data-st]'); if (!s) return;
    var i = find(s.getAttribute('data-st')); if (i < 0) return;
    st.items[i].st = s.value; save(); draw(); used('status');
  });
  tool.addEventListener('click', function (e) {
    var t = e.target.closest('[data-del],[data-cal],[data-wa1]'); if (!t) return;
    if (t.hasAttribute('data-cal')) { used('calendar'); return; }
    if (t.hasAttribute('data-wa1')) { used('wa'); return; }
    var i = find(t.getAttribute('data-del')); if (i < 0) return;
    if (!confirm('למחוק את המשרה הזאת מהרשימה?')) return;
    st.items.splice(i, 1); save(); draw();
  });
  $('mi-wa').addEventListener('click', function () { used('wa'); });
  $('mi-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
  });
  draw();
})();
