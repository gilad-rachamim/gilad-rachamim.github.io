// חלוקת הוצאות בין חברים: מי שילם כמה, על מי מתחלקת כל הוצאה, ומי מעביר למי במינימום העברות.
// הסכומים הם רק מה שהמשתמש מקליד. הכול נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('hz-form')) return;
  var KEY = 'kelim-tiyulim-hotzaot', TOOL = 'tiyulim_hotzaot';
  // בכניסה הראשונה: דוגמה מלאה עם שמות בדויים.
  var st = { demo: 1, title: 'סוף שבוע בצפון', people: [{ id: 'p1', name: 'אורי' }, { id: 'p2', name: 'נועם' }, { id: 'p3', name: 'טל' }, { id: 'p4', name: 'יעל' }], ex: [
    { id: 'e1', what: 'הצימר', amt: '2400', payer: 'p1', among: [] },
    { id: 'e2', what: 'דלק', amt: '360', payer: 'p2', among: [] },
    { id: 'e3', what: 'קניות בסופר', amt: '520', payer: 'p3', among: [] },
    { id: 'e4', what: 'ארוחת ערב במסעדה', amt: '480', payer: 'p4', among: ['p1', 'p2', 'p4'] }
  ] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.people) st = sv; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  function undemo() { if (st.demo) { st.demo = 0; $('hz-demo').hidden = true; } }
  function num(v) { var n = parseFloat(String(v || '').replace(/[^\d.]/g, '')); return isFinite(n) && n > 0 ? n : 0; }
  function money(a) { var r = Math.round(a * 100) / 100; return (r % 1 ? r.toFixed(2) : String(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ₪'; }
  function name(id) { for (var i = 0; i < st.people.length; i++) if (st.people[i].id === id) return st.people[i].name || 'בלי שם'; return '?'; }
  function drawPeople() {
    $('hz-people').innerHTML = st.people.map(function (p) {
      return '<div class="ty-pp" data-id="' + p.id + '"><input type="text" data-f="name" maxlength="30" value="' + esc(p.name) + '" placeholder="שם" aria-label="שם"><button class="ty-mini" type="button" data-del="1" aria-label="למחוק">✕</button></div>';
    }).join('');
  }
  function drawEx() {
    var opts = function (sel) { return st.people.map(function (p) { return '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.name || 'בלי שם') + '</option>'; }).join(''); };
    $('hz-list').innerHTML = st.ex.length ? st.ex.map(function (x) {
      var all = !x.among || !x.among.length;
      return '<div class="ty-ex" data-id="' + x.id + '"><input type="text" data-f="what" maxlength="50" value="' + esc(x.what) + '" placeholder="על מה" aria-label="על מה">' +
        '<input type="number" inputmode="decimal" min="0" step="any" data-f="amt" value="' + esc(x.amt) + '" placeholder="סכום ₪" aria-label="סכום">' +
        '<label class="full" style="color:var(--muted);font-size:.9rem">מי שילם <select data-f="payer" aria-label="מי שילם">' + opts(x.payer) + '</select></label>' +
        '<div class="who full"><span>מתחלק על:</span>' + st.people.map(function (p) {
          return '<label><input type="checkbox" data-am="' + p.id + '"' + (all || x.among.indexOf(p.id) > -1 ? ' checked' : '') + '>' + esc(p.name || 'בלי שם') + '</label>';
        }).join('') + '</div>' +
        '<div class="acts"><button class="ty-mini" type="button" data-del="1">למחוק</button></div></div>';
    }).join('') : '<p class="ty-empty">עוד אין הוצאות. מוסיפים את הראשונה.</p>';
  }
  var text = '';
  function calc() {
    var bal = {}, total = 0;
    st.people.forEach(function (p) { bal[p.id] = 0; });
    st.ex.forEach(function (x) {
      var a = num(x.amt); if (!a || bal[x.payer] == null) return;
      var who = (x.among && x.among.length ? x.among : st.people.map(function (p) { return p.id; })).filter(function (id) { return bal[id] != null; });
      if (!who.length) return;
      total += a; bal[x.payer] += a;
      who.forEach(function (id) { bal[id] -= a / who.length; });
    });
    // מינימום העברות: כל פעם מי שחייב הכי הרבה מעביר למי שמגיע לו הכי הרבה.
    var cr = [], dr = [], tr = [];
    Object.keys(bal).forEach(function (id) { var v = Math.round(bal[id] * 100) / 100; if (v > 0.009) cr.push([id, v]); else if (v < -0.009) dr.push([id, -v]); });
    while (cr.length && dr.length) {
      cr.sort(function (a, b) { return b[1] - a[1]; }); dr.sort(function (a, b) { return b[1] - a[1]; });
      var m = Math.min(cr[0][1], dr[0][1]);
      tr.push([dr[0][0], cr[0][0], Math.round(m * 100) / 100]);
      cr[0][1] -= m; dr[0][1] -= m;
      if (cr[0][1] < 0.01) cr.shift();
      if (dr[0][1] < 0.01) dr.shift();
    }
    return { bal: bal, total: total, tr: tr };
  }
  function drawRes() {
    $('hz-demo').hidden = !st.demo;
    var r = calc(), n = st.people.length;
    $('hz-sum').innerHTML = '<span>סך הכול <b>' + money(r.total) + '</b></span><span><b>' + n + '</b> חברים</span><span><b>' + r.tr.length + '</b> העברות</span>';
    $('hz-tr').innerHTML = r.tr.length ? r.tr.map(function (t) { return '<div><span>' + esc(name(t[0])) + ' ← ל' + esc(name(t[1])) + '</span><b>' + money(t[2]) + '</b></div>'; }).join('') : '<p class="ty-empty" style="padding:0">' + (r.total ? 'הכול מאוזן, אף אחד לא צריך להעביר.' : 'מוסיפים הוצאות, וכאן יופיע מי מעביר למי.') + '</p>';
    $('hz-bal').innerHTML = st.people.map(function (p) {
      var v = Math.round((r.bal[p.id] || 0) * 100) / 100;
      return '<span><span>' + esc(p.name || 'בלי שם') + '</span><b class="' + (v > 0 ? 'p' : v < 0 ? 'm' : '') + '">' + (v > 0 ? '+' : v < 0 ? '−' : '') + money(Math.abs(v)) + '</b></span>';
    }).join('');
    var title = st.title || 'חלוקת הוצאות';
    text = '*' + title + '* – חלוקת הוצאות\n\n' +
      st.ex.filter(function (x) { return num(x.amt); }).map(function (x) { return '▫️ ' + (x.what || 'הוצאה') + ': ' + money(num(x.amt)) + ' (שולם על ידי ' + name(x.payer) + (x.among && x.among.length ? ', מתחלק על ' + x.among.map(name).join(', ') : '') + ')'; }).join('\n') +
      '\n\nסך הכול: ' + money(r.total) + '\n\n*מי מעביר למי*\n' +
      (r.tr.length ? r.tr.map(function (t) { return '💸 ' + name(t[0]) + ' ← ל' + name(t[1]) + ': ' + money(t[2]); }).join('\n') : 'הכול מאוזן ✓') +
      '\n\nחושב בכלי חינמי: ' + location.origin + location.pathname;
    $('hz-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  function draw() { drawPeople(); drawEx(); drawRes(); }
  $('hz-title').value = st.title || '';
  $('hz-title').addEventListener('input', function () { st.title = this.value.trim(); undemo(); save(); drawRes(); });
  $('hz-form').addEventListener('submit', function (e) { e.preventDefault(); });
  $('hz-people').addEventListener('input', function (e) {
    var row = e.target.closest('[data-id]'); if (!row) return;
    var id = row.getAttribute('data-id');
    st.people.forEach(function (p) { if (p.id === id) p.name = e.target.value; });
    undemo(); save(); drawRes();
  });
  $('hz-people').addEventListener('change', function () { drawEx(); });
  $('hz-people').addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]'), row = e.target.closest('[data-id]'); if (!b || !row) return;
    var id = row.getAttribute('data-id');
    if (st.ex.some(function (x) { return x.payer === id; }) && !confirm('יש הוצאות ששולמו על ידי ' + name(id) + '. למחוק גם אותן?')) return;
    st.people = st.people.filter(function (p) { return p.id !== id; });
    st.ex = st.ex.filter(function (x) { return x.payer !== id; });
    st.ex.forEach(function (x) { if (x.among) x.among = x.among.filter(function (a) { return a !== id; }); });
    undemo(); save(); draw();
  });
  $('hz-padd').addEventListener('click', function () {
    var id = 'p' + Date.now();
    st.people.push({ id: id, name: '' }); undemo(); save(); draw();
    var el = document.querySelector('#hz-people [data-id="' + id + '"] input'); if (el) el.focus();
  });
  var box = $('hz-list');
  box.addEventListener('input', function (e) {
    var f = e.target.getAttribute('data-f'), row = e.target.closest('[data-id]'); if (!f || !row) return;
    var id = row.getAttribute('data-id');
    st.ex.forEach(function (x) { if (x.id === id) x[f] = e.target.value; });
    undemo(); save(); drawRes();
  });
  box.addEventListener('change', function (e) {
    var am = e.target.getAttribute('data-am'), row = e.target.closest('[data-id]'); if (!row) return;
    var id = row.getAttribute('data-id');
    if (e.target.getAttribute('data-f') === 'payer') { st.ex.forEach(function (x) { if (x.id === id) x.payer = e.target.value; }); }
    else if (am) {
      var ids = [].map.call(row.querySelectorAll('[data-am]:checked'), function (c) { return c.getAttribute('data-am'); });
      if (!ids.length) { e.target.checked = true; return; }
      st.ex.forEach(function (x) { if (x.id === id) x.among = ids.length === st.people.length ? [] : ids; });
    } else return;
    undemo(); save(); drawRes();
  });
  box.addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]'), row = e.target.closest('[data-id]'); if (!b || !row) return;
    var id = row.getAttribute('data-id');
    st.ex = st.ex.filter(function (x) { return x.id !== id; }); undemo(); save(); draw();
  });
  $('hz-add').addEventListener('click', function () {
    if (!st.people.length) { $('hz-msg').textContent = 'קודם מוסיפים את החברים.'; return; }
    $('hz-msg').textContent = '';
    var id = 'e' + Date.now();
    st.ex.push({ id: id, what: '', amt: '', payer: st.people[0].id, among: [] }); undemo(); save(); draw();
    var el = document.querySelector('#hz-list [data-id="' + id + '"] [data-f="what"]'); if (el) el.focus();
    used('add');
  });
  $('hz-demo-x').addEventListener('click', function () { st = { demo: 0, title: '', people: [{ id: 'p1', name: '' }, { id: 'p2', name: '' }], ex: [] }; $('hz-title').value = ''; save(); draw(); });
  $('hz-wa').addEventListener('click', function () { used('wa'); });
  $('hz-copy').addEventListener('click', function () {
    var b = this; used('copy');
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
  });
  draw();
})();
