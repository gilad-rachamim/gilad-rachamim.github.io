// תקציב ומשימות לאירוע: הוצאות וספקים (עולה / שולם / נשאר), ומשימות לפי חודש, שבוע, יום לפני וביום עצמו,
// עם התאריכים לפי יום השמחה. הסכומים רק מה שהמשתמש כותב, בלי ייעוץ. נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('hc-form')) return;
  var KEY = 'kelim-eruim-hachana', TOOL = 'eruim_hachana', DAY = 86400000;
  var PH = [['m', 'חודש לפני', 30], ['w', 'שבוע לפני', 7], ['d', 'יום לפני', 1], ['h', 'ביום עצמו', 0]];
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(s) { var p = String(s || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
  function heb(d) { return d ? d.getDate() + '.' + (d.getMonth() + 1) : ''; }
  function t(id, ph, what, done) { return { id: id, ph: ph, what: what, done: !!done }; }
  // בכניסה הראשונה: דוגמה מלאה עם שמות וסכומים בדויים.
  var st = { demo: 1, title: 'החתונה של נועה ואביתר', date: iso(new Date(Date.now() + 40 * DAY)), budget: 60000, items: [
    { id: 'e1', what: 'אולם וקייטרינג', who: 'אולמי הגן', cost: 32000, paid: 10000 },
    { id: 'e2', what: 'צלם', who: 'סטודיו אור', cost: 6500, paid: 2000 },
    { id: 'e3', what: 'די-ג\'יי ומוזיקה', who: 'רועי', cost: 4800, paid: 1000 },
    { id: 'e4', what: 'הזמנות', who: 'דפוס השכונה', cost: 900, paid: 900 },
    { id: 'e5', what: 'שמלה וחליפה', who: '', cost: 5200, paid: 0 },
    { id: 'e6', what: 'פרחים ועיצוב', who: 'פרחי השרון', cost: 3000, paid: 0 }
  ], tasks: [
    t('k1', 'm', 'לשלוח הזמנות ולפתוח רשימת אישורי הגעה', 1), t('k2', 'm', 'לסגור צלם ודי-ג\'יי', 1), t('k3', 'm', 'לבחור טבעות'),
    t('k4', 'w', 'לשלוח לאולם את מספר האורחים הסופי'), t('k5', 'w', 'לסגור סידור הושבה ולהדפיס דף לכניסה'), t('k6', 'w', 'לשלוח לצוות את תוכנית האירוע'),
    t('k7', 'd', 'להכין מעטפות לתשלום לספקים'), t('k8', 'd', 'לטעון טלפונים ומטענים'), t('k9', 'd', 'לארוז תיק לאולם: בגדים להחלפה, תרופות, מים'),
    t('k10', 'h', 'לאכול משהו בבוקר'), t('k11', 'h', 'לתת למישהו אחראי את הטלפונים של הספקים')
  ] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.items) st = sv; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nis(n) { return '₪' + Math.round(+n || 0).toLocaleString('he-IL'); }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  function undemo() { if (st.demo) { st.demo = 0; $('hc-demo').hidden = true; } }
  function left(r) { return Math.max(0, (+r.cost || 0) - (+r.paid || 0)); }
  function daysTo() { var d = parse(st.date); if (!d) return null; var n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((d - n) / DAY); }
  function nowPh() { var n = daysTo(); if (n == null || n < 0) return ''; return n > 7 ? 'm' : n > 1 ? 'w' : n === 1 ? 'd' : 'h'; }
  var text = '';
  function draw() {
    $('hc-demo').hidden = !st.demo;
    var C = 0, P = 0;
    st.items.forEach(function (r) { C += +r.cost || 0; P += Math.min(+r.paid || 0, +r.cost || 0); });
    var B = +st.budget || 0;
    $('hc-sum').innerHTML = (B ? '<span>התקציב שקבעתם <b>' + nis(B) + '</b></span>' : '') + '<span>סך ההוצאות <b>' + nis(C) + '</b></span><span>שולם <b>' + nis(P) + '</b></span><span>נשאר לשלם <b>' + nis(C - P) + '</b></span>' +
      (B ? (C > B ? '<span>מעל התקציב <b>' + nis(C - B) + '</b></span>' : '<span>עוד פנוי בתקציב <b>' + nis(B - C) + '</b></span>') : '');
    $('hc-list').innerHTML = st.items.length ? st.items.map(function (r) {
      var l = left(r), pc = +r.cost ? Math.round(Math.min(+r.paid || 0, +r.cost) / +r.cost * 100) : 100;
      return '<div class="er-item' + (l ? '' : ' done') + '"><div class="top"><b>' + esc(r.what) + (r.who ? ' · ' + esc(r.who) : '') + '</b><span>' + (l ? 'נשאר ' + nis(l) + ' מתוך ' + nis(r.cost) : 'שולם הכול ✓ ' + nis(r.cost)) + '</span></div>' +
        '<div class="er-bar"><i style="width:' + pc + '%"></i></div>' +
        '<div class="acts">' + (l ? '<input type="number" min="0" step="1" inputmode="numeric" placeholder="כמה שולם" aria-label="כמה שולם" data-in="' + r.id + '"><button type="button" data-pay="' + r.id + '">נרשם תשלום</button><button type="button" data-full="' + r.id + '">שולם הכול</button>' : '') +
        '<button type="button" data-del="' + r.id + '">למחוק</button></div></div>';
    }).join('') : '<p class="er-empty">עוד אין הוצאות. מוסיפים את הראשונה למעלה.</p>';
    var d = parse(st.date), n = daysTo(), np = nowPh();
    $('hc-when').textContent = d ? (n > 0 ? 'עוד ' + n + ' ימים לשמחה. התאריכים כאן מחושבים לפי יום השמחה.' : n === 0 ? 'היום השמחה – מזל טוב!' : 'השמחה כבר הייתה – מזל טוב! אפשר לנקות ולהתחיל אירוע חדש.') : 'כותבים למעלה את תאריך השמחה, והתאריכים יופיעו כאן.';
    $('hc-phases').innerHTML = PH.map(function (p) {
      var ts = st.tasks.filter(function (x) { return x.ph === p[0]; }), dn = ts.filter(function (x) { return x.done; }).length;
      var when = d ? (p[2] ? 'עד ' + heb(new Date(d - p[2] * DAY)) : heb(d)) : '';
      return '<div class="er-phase' + (np === p[0] ? ' now' : '') + '"><h3>' + p[1] + (np === p[0] ? ' – עכשיו' : '') + '<span>' + [when, ts.length ? dn + '/' + ts.length + ' בוצעו' : ''].filter(Boolean).join(' · ') + '</span></h3>' +
        (ts.length ? ts.map(function (x) {
          return '<label class="er-task' + (x.done ? ' done' : '') + '"><input type="checkbox" data-tk="' + x.id + '"' + (x.done ? ' checked' : '') + '><span class="tx">' + esc(x.what) + '</span><button type="button" data-tdel="' + x.id + '" aria-label="למחוק">✕</button></label>';
        }).join('') : '<p class="er-hint">אין משימות כאן עדיין.</p>') + '</div>';
    }).join('');
    var openT = st.tasks.filter(function (x) { return !x.done; });
    $('hc-card').innerHTML = '<h3>' + esc(st.title || 'הכנות לשמחה') + '</h3><p class="s2">' + (d ? 'השמחה ב-' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + ' · ' : '') + 'נכון ל-' + heb(new Date()) + '</p>' +
      '<table><thead><tr><th>מה</th><th>ממי</th><th>עולה</th><th>שולם</th><th>נשאר</th></tr></thead><tbody>' +
      st.items.map(function (r) { return '<tr><td class="rl">' + esc(r.what) + '</td><td>' + esc(r.who) + '</td><td>' + nis(r.cost) + '</td><td>' + nis(Math.min(+r.paid || 0, +r.cost || 0)) + '</td><td>' + nis(left(r)) + '</td></tr>'; }).join('') +
      '<tr><th>סך הכול</th><th></th><th>' + nis(C) + '</th><th>' + nis(P) + '</th><th>' + nis(C - P) + '</th></tr></tbody></table>' +
      '<h4>מה עוד נשאר לעשות</h4><table><tbody>' + PH.map(function (p) {
        var ts = openT.filter(function (x) { return x.ph === p[0]; }); if (!ts.length) return '';
        return '<tr><td class="rl">' + p[1] + '</td><td style="text-align:start">' + ts.map(function (x) { return '☐ ' + esc(x.what); }).join('<br>') + '</td></tr>';
      }).join('') + '</tbody></table><p class="ft">בשעה טובה ומוצלחת!</p>';
    text = '*' + (st.title || 'הכנות לשמחה') + '*' + (d && n >= 0 ? '\nעוד ' + n + ' ימים' : '') + '\n\n*כסף*\nסך הכול ' + nis(C) + ', שולם ' + nis(P) + ', נשאר ' + nis(C - P) +
      st.items.filter(function (r) { return left(r); }).map(function (r) { return '\n• ' + r.what + (r.who ? ' (' + r.who + ')' : '') + ': נשאר ' + nis(left(r)); }).join('') +
      (openT.length ? '\n\n*מה עוד נשאר לעשות*' + PH.map(function (p) {
        var ts = openT.filter(function (x) { return x.ph === p[0]; }); return ts.length ? '\n_' + p[1] + '_\n' + ts.map(function (x) { return '☐ ' + x.what; }).join('\n') : '';
      }).join('') : '\n\nכל המשימות בוצעו ✓');
    $('hc-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  function fill() { $('hc-title').value = st.title || ''; $('hc-date').value = st.date || ''; $('hc-budget').value = st.budget || ''; }
  ['title', 'date', 'budget'].forEach(function (k) {
    $('hc-' + k).addEventListener('input', function () { st[k] = k === 'budget' ? (+this.value || 0) : this.value.trim(); undemo(); save(); draw(); });
  });
  $('hc-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var what = $('hc-what').value.trim(), cost = +$('hc-cost').value, paid = +$('hc-paid').value || 0, msg = $('hc-msg');
    if (!what) { msg.textContent = 'חסר מה (למשל: צלם).'; $('hc-what').focus(); return; }
    if (!(cost >= 0) || $('hc-cost').value === '') { msg.textContent = 'חסר כמה עולה.'; $('hc-cost').focus(); return; }
    if (st.demo) { st.items = []; st.demo = 0; }
    st.items.push({ id: 'e' + Date.now(), what: what, who: $('hc-who').value.trim(), cost: cost, paid: Math.min(paid, cost) });
    ['hc-what', 'hc-who', 'hc-cost', 'hc-paid'].forEach(function (id) { $(id).value = ''; });
    save(); draw(); msg.textContent = 'נוסף ✓'; used('add');
  });
  $('hc-tform').addEventListener('submit', function (e) {
    e.preventDefault();
    var w = $('hc-task').value.trim(); if (!w) { $('hc-task').focus(); return; }
    st.tasks.push(t('k' + Date.now(), $('hc-phase').value, w)); $('hc-task').value = ''; undemo(); save(); draw(); used('task');
  });
  $('hc-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pay],[data-full],[data-del]'); if (!b) return;
    var id = b.getAttribute('data-pay') || b.getAttribute('data-full') || b.getAttribute('data-del'), r = null;
    st.items.forEach(function (x) { if (x.id === id) r = x; }); if (!r) return;
    if (b.hasAttribute('data-del')) { if (!confirm('למחוק את "' + r.what + '"?')) return; st.items = st.items.filter(function (x) { return x !== r; }); }
    else if (b.hasAttribute('data-full')) { r.paid = +r.cost; used('pay'); }
    else { var inp = document.querySelector('[data-in="' + id + '"]'), v = +(inp && inp.value); if (!(v > 0)) { if (inp) inp.focus(); return; } r.paid = Math.min(+r.cost, (+r.paid || 0) + v); used('pay'); }
    undemo(); save(); draw();
  });
  $('hc-phases').addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-tk'); if (!id) return;
    st.tasks.forEach(function (x) { if (x.id === id) x.done = e.target.checked; }); undemo(); save(); draw(); used('done');
  });
  $('hc-phases').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tdel]'); if (!b) return; e.preventDefault();
    var id = b.getAttribute('data-tdel'); st.tasks = st.tasks.filter(function (x) { return x.id !== id; }); undemo(); save(); draw();
  });
  $('hc-demo-x').addEventListener('click', function () {
    st = { demo: 0, title: '', date: '', budget: 0, items: [], tasks: st.tasks.map(function (x) { return t(x.id, x.ph, x.what); }) };
    save(); fill(); draw();
  });
  $('hc-print').addEventListener('click', function () { used('print'); window.print(); });
  $('hc-wa').addEventListener('click', function () { used('wa'); });
  fill(); draw();
})();
