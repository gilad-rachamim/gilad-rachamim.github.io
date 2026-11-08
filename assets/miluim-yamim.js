// מונה ימי מילואים: סבבים (מתאריך–עד תאריך) נשמרים בטלפון (localStorage). ימים נספרים כולל שני הקצוות;
// סבב שחוצה שנה נחלק בין השנים, ויום שמופיע בשני סבבים נספר פעם אחת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('ym-form');
  if (!form) return;
  var KEY = 'kelim-miluim-yamim', DAY = 86400000;
  var st = [];
  try { st = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function utc(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function heb(s) { var p = s.split('-'); return +p[2] + '.' + +p[1] + '.' + p[0]; }
  function len(r) { return Math.round((utc(r.to) - utc(r.from)) / DAY) + 1; }
  // כל הימים הייחודיים, לפי שנה
  function count() {
    var days = {};
    st.forEach(function (r) { for (var t = utc(r.from); t <= utc(r.to); t += DAY) days[t] = 1; });
    var by = {}, total = 0;
    Object.keys(days).forEach(function (t) { var y = new Date(+t).getUTCFullYear(); by[y] = (by[y] || 0) + 1; total++; });
    return { by: by, total: total };
  }
  var text = '';
  function draw() {
    st.sort(function (a, b) { return utc(b.from) - utc(a.from); });
    var c = count(), y = new Date().getFullYear();
    $('ym-year').textContent = c.by[y] || 0;
    $('ym-year-l').textContent = 'ימים ב-' + y;
    $('ym-total').textContent = c.total;
    var years = Object.keys(c.by).sort().reverse();
    $('ym-years').innerHTML = years.length > 1 ? years.map(function (k) { return '<span>' + k + ': <b>' + c.by[k] + '</b></span>'; }).join('') : '';
    $('ym-list').innerHTML = st.length ? st.map(function (r, i) {
      return '<li><span>' + heb(r.from) + ' – ' + heb(r.to) + (r.note ? '<small>' + esc(r.note) + '</small>' : '') + '</span><span class="d">' + len(r) + ' ימים</span><button class="x" type="button" data-del="' + i + '" aria-label="למחוק את הסבב">×</button></li>';
    }).join('') : '<li><span>עוד לא נרשמו סבבים. מוסיפים את הראשון למעלה.</span></li>';
    text = 'ימי המילואים שלי\n' + years.map(function (k) { return k + ': ' + c.by[k] + ' ימים'; }).join('\n') + '\nסך הכול: ' + c.total + ' ימים\n\n' +
      st.map(function (r) { return '▫️ ' + heb(r.from) + ' – ' + heb(r.to) + ' (' + len(r) + ')' + (r.note ? ' ' + r.note : ''); }).join('\n');
    $('ym-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = $('ym-from').value, t = $('ym-to').value, msg = $('ym-msg');
    if (!f) { msg.textContent = 'חסר תאריך התחלה.'; return; }
    if (!t) t = f;
    if (utc(t) < utc(f)) { msg.textContent = 'תאריך הסיום לפני תאריך ההתחלה. כדאי לבדוק.'; return; }
    if (len({ from: f, to: t }) > 400) { msg.textContent = 'זה יותר מ-400 ימים בסבב אחד. כדאי לבדוק את השנה.'; return; }
    st.push({ from: f, to: t, note: $('ym-note').value.trim() });
    save(); draw();
    msg.textContent = 'נוסף ✓ ' + len({ from: f, to: t }) + ' ימים';
    $('ym-note').value = '';
    if (window.toolUsed) window.toolUsed('miluim_yamim', { how: 'add' });
  });
  $('ym-from').addEventListener('change', function () { if (!$('ym-to').value || utc($('ym-to').value) < utc(this.value)) $('ym-to').value = this.value; });
  $('ym-list').addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'); if (!d) return;
    if (confirm('למחוק את הסבב הזה?')) { st.splice(+d.getAttribute('data-del'), 1); save(); draw(); }
  });
  $('ym-wa').addEventListener('click', function () { if (window.toolUsed) window.toolUsed('miluim_yamim', { how: 'wa' }); });
  $('ym-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
  });
  draw();
})();
