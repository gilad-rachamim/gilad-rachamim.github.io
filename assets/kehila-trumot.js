// נדרים ותרומות לבית הכנסת: מי, על מה, כמה, מה שולם. כרטיס לכל מתפלל, תזכורת עדינה בווטסאפ ודף להדפסה.
// בלי חישובי מס. הכול נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('tr-form');
  if (!form) return;
  var KEY = 'kelim-kehila-trumot', TOOL = 'kehila_trumot', DAY = 86400000;
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function ago(n) { return iso(new Date(Date.now() - n * DAY)); }
  // בכניסה הראשונה: דוגמה עם שמות בדויים. נמחקת בנדר הראשון שנשמר.
  var st = { demo: 1, shul: 'בית הכנסת אוהל משה', sig: 'הגבאי', how: 'מזומן לגבאי, או ביט', f: 'open', items: [
    { id: 'd1', name: 'דוד מימון', phone: '', what: 'עלייה לתורה', date: ago(10), sum: 180, paid: 180 },
    { id: 'd2', name: 'דוד מימון', phone: '', what: 'קידוש', date: ago(3), sum: 360, paid: 0 },
    { id: 'd3', name: 'יוסף אוחיון', phone: '', what: 'מפטיר', date: ago(17), sum: 100, paid: 50 },
    { id: 'd4', name: 'שלמה עמר', phone: '', what: 'קרן הבניין', date: ago(40), sum: 1000, paid: 400 },
    { id: 'd5', name: 'רפאל אלמוג', phone: '', what: 'פתיחת ההיכל', date: ago(3), sum: 52, paid: 0 }
  ] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.items) st = sv; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function heb(s) { if (!s) return ''; var p = s.split('-'); return +p[2] + '.' + +p[1] + '.' + p[0]; }
  function nis(n) { return '₪' + Math.round(n).toLocaleString('he-IL'); }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  function rem(r) { return Math.max(0, (+r.sum || 0) - (+r.paid || 0)); }
  function groups() {
    var g = {}, order = [];
    st.items.forEach(function (r) { if (!g[r.name]) { g[r.name] = []; order.push(r.name); } g[r.name].push(r); });
    return order.map(function (n) {
      var it = g[n].sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var sum = 0, paid = 0, phone = '';
      it.forEach(function (r) { sum += +r.sum || 0; paid += Math.min(+r.paid || 0, +r.sum || 0); if (r.phone) phone = r.phone; });
      return { name: n, items: it, sum: sum, paid: paid, left: sum - paid, phone: phone };
    }).sort(function (a, b) { return b.left - a.left || (a.name < b.name ? -1 : 1); });
  }
  function waNum(p) { var d = String(p || '').replace(/\D/g, ''); if (!d) return ''; if (d[0] === '0') d = '972' + d.slice(1); return d; }
  function remind(g) {
    var open = g.items.filter(function (r) { return rem(r) > 0; });
    var t = 'שלום ' + g.name + ', שבוע טוב!\nתודה רבה על הנדבה ל' + (st.shul || 'בית הכנסת') + ':\n' +
      open.map(function (r) { return '• ' + r.what + ' (' + heb(r.date) + ') – ' + nis(rem(r)); }).join('\n') +
      '\n\nרק תזכורת קטנה: נשאר ' + nis(g.left) + '.' + (st.how ? ' אפשר לשלם ' + st.how + ',' : '') + ' מתי שנוח.\nתזכו למצוות!' + (st.sig ? '\n' + st.sig : '');
    var n = waNum(g.phone);
    return (n ? 'https://wa.me/' + n : 'https://api.whatsapp.com/send') + '?text=' + encodeURIComponent(t);
  }
  var text = '';
  function draw() {
    $('tr-demo').hidden = !st.demo;
    var gs = groups(), S = 0, P = 0;
    gs.forEach(function (g) { S += g.sum; P += g.paid; });
    var openN = gs.filter(function (g) { return g.left > 0; }).length;
    $('tr-sum-row').innerHTML = st.items.length ? '<span>נדרים <b>' + nis(S) + '</b></span><span>שולם <b>' + nis(P) + '</b></span><span>נשאר <b>' + nis(S - P) + '</b></span><span>עוד לא סיימו <b>' + openN + '</b></span>' : '';
    [].forEach.call($('tr-filter').children, function (b) { b.classList.toggle('on', b.getAttribute('data-f') === st.f); });
    var show = st.f === 'all' ? gs : gs.filter(function (g) { return g.left > 0; });
    $('tr-list').innerHTML = show.length ? show.map(function (g) {
      var pc = g.sum ? Math.round(g.paid / g.sum * 100) : 100;
      return '<div class="kh-item' + (g.left ? '' : ' done') + '"><div class="top"><b>' + esc(g.name) + '</b><span>' + (g.left ? 'נשאר ' + nis(g.left) + ' מתוך ' + nis(g.sum) : 'שולם הכול ✓ ' + nis(g.sum)) + '</span></div>' +
        '<div class="kh-bar"><i style="width:' + pc + '%"></i></div>' +
        g.items.map(function (r) {
          var l = rem(r);
          return '<p><span class="lbl">' + esc(r.what) + '</span> · ' + heb(r.date) + ' · ' + nis(+r.sum || 0) + (l ? (r.paid ? ' (שולם ' + nis(r.paid) + ')' : '') : ' ✓') + '</p>' +
            '<div class="acts">' + (l ? '<input type="number" min="0" step="1" inputmode="numeric" placeholder="כמה שולם" aria-label="כמה שולם" data-in="' + r.id + '"><button type="button" data-pay="' + r.id + '">נרשם תשלום</button><button type="button" data-full="' + r.id + '">שולם הכול</button>' : '') +
            '<button type="button" data-del="' + r.id + '">למחוק</button></div>';
        }).join('') +
        (g.left ? '<div class="acts"><a href="' + remind(g) + '" target="_blank" rel="noopener" data-wa1="1">תזכורת עדינה בווטסאפ' + (g.phone ? '' : ' (בלי מספר – בוחרים איש קשר)') + '</a></div>' : '') + '</div>';
    }).join('') : '<p class="kh-empty">' + (st.items.length ? 'כולם סיימו לשלם. תזכו למצוות!' : 'עוד אין נדרים. רושמים את הראשון למעלה.') + '</p>';
    var rows = [];
    show.forEach(function (g) { g.items.forEach(function (r) { if (st.f === 'all' || rem(r) > 0) rows.push(r); }); });
    $('tr-card').innerHTML = '<h3>נדרים ותרומות' + (st.shul ? ' – ' + esc(st.shul) : '') + '</h3><p class="s2">' + (st.f === 'all' ? 'כל הרשימה' : 'מה שעוד פתוח') + ' · נכון ל-' + heb(iso(new Date())) + '</p>' +
      '<table><thead><tr><th>שם</th><th>על מה</th><th>תאריך</th><th>נדר</th><th>שולם</th><th>נשאר</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td class="rl">' + esc(r.name) + '</td><td>' + esc(r.what) + '</td><td>' + heb(r.date) + '</td><td>' + nis(+r.sum || 0) + '</td><td>' + nis(Math.min(+r.paid || 0, +r.sum || 0)) + '</td><td>' + nis(rem(r)) + '</td></tr>'; }).join('') +
      '</tbody></table><p class="ft">' + (st.sig ? esc(st.sig) + ' · ' : '') + 'תזכו למצוות!</p>';
    text = 'נדרים ותרומות' + (st.shul ? ' – ' + st.shul : '') + '\n\n' + rows.map(function (r) { return r.name + ' – ' + r.what + ' (' + heb(r.date) + '): ' + nis(+r.sum || 0) + ', נשאר ' + nis(rem(r)); }).join('\n');
    $('tr-names').innerHTML = gs.map(function (g) { return '<option value="' + esc(g.name) + '">'; }).join('');
  }
  function find(id) { for (var i = 0; i < st.items.length; i++) if (st.items[i].id === id) return st.items[i]; return null; }
  function fill() { $('tr-shul').value = st.shul || ''; $('tr-sig').value = st.sig || ''; $('tr-how').value = st.how || ''; }
  $('tr-date').value = iso(new Date());
  ['shul', 'sig', 'how'].forEach(function (k) { $('tr-' + k).addEventListener('input', function () { st[k] = this.value.trim(); save(); draw(); }); });
  $('tr-chips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    $('tr-what').value = b.textContent;
    [].forEach.call(this.children, function (c) { c.classList.toggle('on', c === b); });
  });
  $('tr-name').addEventListener('change', function () {
    var n = this.value.trim(); if ($('tr-phone').value) return;
    st.items.forEach(function (r) { if (r.name === n && r.phone) $('tr-phone').value = r.phone; });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('tr-name').value.trim(), what = $('tr-what').value.trim(), sum = +$('tr-sum').value, msg = $('tr-msg');
    if (!name) { msg.textContent = 'חסר שם.'; $('tr-name').focus(); return; }
    if (!what) { msg.textContent = 'חסר על מה (למשל: עלייה לתורה).'; $('tr-what').focus(); return; }
    if (!(sum > 0)) { msg.textContent = 'חסר סכום.'; $('tr-sum').focus(); return; }
    if (st.demo) { st.items = []; st.demo = 0; }
    var ph = $('tr-phone').value.trim();
    if (ph) st.items.forEach(function (r) { if (r.name === name && !r.phone) r.phone = ph; });
    st.items.push({ id: 't' + Date.now(), name: name, phone: ph, what: what, date: $('tr-date').value || iso(new Date()), sum: sum, paid: 0 });
    save(); draw();
    msg.textContent = 'נוסף לרשימה ✓';
    ['tr-name', 'tr-phone', 'tr-what', 'tr-sum'].forEach(function (id) { $(id).value = ''; });
    [].forEach.call($('tr-chips').children, function (c) { c.classList.remove('on'); });
    used('add');
  });
  $('tr-demo-x').addEventListener('click', function () { st.items = []; st.demo = 0; save(); draw(); });
  $('tr-filter').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.f = b.getAttribute('data-f'); save(); draw(); });
  $('tr-list').addEventListener('click', function (e) {
    var t = e.target.closest('[data-pay],[data-full],[data-del],[data-wa1]'); if (!t) return;
    if (t.hasAttribute('data-wa1')) { used('wa'); return; }
    var id = t.getAttribute('data-pay') || t.getAttribute('data-full') || t.getAttribute('data-del'), r = find(id); if (!r) return;
    if (t.hasAttribute('data-del')) {
      if (!confirm('למחוק את "' + r.what + '" של ' + r.name + '?')) return;
      st.items = st.items.filter(function (x) { return x !== r; });
    } else if (t.hasAttribute('data-full')) { r.paid = +r.sum; used('pay'); }
    else {
      var inp = document.querySelector('[data-in="' + id + '"]'), v = +(inp && inp.value);
      if (!(v > 0)) { if (inp) inp.focus(); return; }
      r.paid = Math.min(+r.sum, (+r.paid || 0) + v); used('pay');
    }
    save(); draw();
  });
  $('tr-print').addEventListener('click', function () { used('print'); window.print(); });
  $('tr-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
  });
  fill(); draw();
})();
