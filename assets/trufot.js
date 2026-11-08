// התרופות שלי: רשימה לפי שעות היום + סימון יומי (מתאפס כשהתאריך מתחלף). נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('tf-form');
  if (!form) return;
  var KEY = 'kelim-trufot';
  var T = [['b', 'בוקר', '🌅'], ['c', 'צהריים', '☀️'], ['e', 'ערב', '🌇'], ['l', 'לפני השינה', '🌙']];
  var st = { meds: [], allerg: '', day: '', took: {} };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function fresh() { if (st.day !== today()) { st.day = today(); st.took = {}; save(); } }
  $('tf-times').innerHTML = T.map(function (t) { return '<label class="check"><input type="checkbox" data-time="' + t[0] + '"> <span>' + t[1] + '</span></label>'; }).join('');
  $('tf-allerg').value = st.allerg || '';
  function when(m) { return T.filter(function (t) { return m.t.indexOf(t[0]) >= 0; }).map(function (t) { return t[1]; }).join(', '); }
  var text = '';
  function draw() {
    fresh();
    // היום
    var slots = T.map(function (t) {
      var ms = st.meds.filter(function (m) { return m.t.indexOf(t[0]) >= 0; });
      if (!ms.length) return '';
      return '<div class="tf-slot"><p class="mp-cat">' + t[2] + ' ' + t[1] + '</p><ul class="mp-list">' + ms.map(function (m) {
        var k = m.id + t[0];
        return '<li><label><input type="checkbox" data-took="' + k + '"' + (st.took[k] ? ' checked' : '') + '><span>' + esc(m.n) + (m.d ? ' · ' + esc(m.d) : '') + '</span><i></i></label></li>';
      }).join('') + '</ul></div>';
    }).join('');
    var total = 0, done = 0;
    st.meds.forEach(function (m) { m.t.split('').forEach(function (t) { total++; if (st.took[m.id + t]) done++; }); });
    $('tf-today').innerHTML = '<h3>היום' + (total ? ' · ' + done + ' מתוך ' + total + (done === total ? ' ✓' : '') : '') + '</h3>' + (slots || '<p class="note">עוד אין תרופות ברשימה. מוסיפים למטה.</p>');
    // הרשימה
    $('tf-meds').innerHTML = st.meds.map(function (m) {
      return '<li><span>' + esc(m.n) + (m.d ? ' · ' + esc(m.d) : '') + '<small>' + esc(when(m) || 'לפי הצורך') + (m.o ? ' · ' + esc(m.o) : '') + '</small></span><button class="x" type="button" data-del="' + m.id + '" aria-label="למחוק">×</button></li>';
    }).join('');
    // הדף להדפסה
    $('tf-card').innerHTML = '<h3>התרופות שלי</h3><p class="s2">עודכן ' + new Date().toLocaleDateString('he-IL') + '</p>' +
      (st.meds.length ? '<table><tr><td><b>תרופה ומינון</b></td><td class="who">מתי</td></tr>' + st.meds.map(function (m) { return '<tr><td>' + esc(m.n) + (m.d ? ' · ' + esc(m.d) : '') + (m.o ? '<br><small>' + esc(m.o) + '</small>' : '') + '</td><td class="who">' + esc(when(m) || 'לפי הצורך') + '</td></tr>'; }).join('') + '</table>' : '<p class="s2">הרשימה ריקה.</p>') +
      '<h4>אלרגיות</h4><p>' + esc((st.allerg || '').trim() || 'לא צוין') + '</p>';
    text = '💊 התרופות שלי\n\n' + st.meds.map(function (m) { return '▫️ ' + m.n + (m.d ? ' · ' + m.d : '') + ' – ' + (when(m) || 'לפי הצורך') + (m.o ? ' (' + m.o + ')' : ''); }).join('\n') + '\n\nאלרגיות: ' + ((st.allerg || '').trim() || 'לא צוין');
    $('tf-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = $('tf-name').value.trim(), msg = $('tf-msg');
    if (!n) { msg.textContent = 'חסר שם התרופה.'; return; }
    var t = ''; form.querySelectorAll('[data-time]').forEach(function (c) { if (c.checked) t += c.getAttribute('data-time'); });
    st.meds.push({ id: 'm' + Date.now(), n: n, d: $('tf-dose').value.trim(), t: t, o: $('tf-note').value.trim() });
    save(); draw();
    msg.textContent = 'נוסף ✓ ' + n;
    ['tf-name', 'tf-dose', 'tf-note'].forEach(function (id) { $(id).value = ''; });
    form.querySelectorAll('[data-time]').forEach(function (c) { c.checked = false; });
    if (window.toolUsed) window.toolUsed('trufot', { how: 'add' });
  });
  $('tf-today').addEventListener('change', function (e) {
    var k = e.target.getAttribute('data-took'); if (!k) return;
    if (e.target.checked) st.took[k] = 1; else delete st.took[k]; save(); draw();
  });
  $('tf-meds').addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'); if (!d) return;
    if (confirm('למחוק את התרופה מהרשימה?')) { var id = d.getAttribute('data-del'); st.meds = st.meds.filter(function (m) { return m.id !== id; }); save(); draw(); }
  });
  $('tf-allerg').addEventListener('input', function () { st.allerg = this.value; save(); draw(); });
  function used(how) { if (window.toolUsed) window.toolUsed('trufot', { how: how }); }
  $('tf-print').addEventListener('click', function () { used('print'); window.print(); });
  $('tf-wa').addEventListener('click', function () { used('wa'); });
  // מי שמשאיר את הדף פתוח עד הבוקר: בדיקה כשחוזרים ללשונית
  document.addEventListener('visibilitychange', function () { if (!document.hidden && st.day !== today()) draw(); });
  draw();
})();
