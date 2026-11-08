// לוח תורנויות: מטלה i בשבוע w הולכת לאדם (i + w) % n. השבוע נספר מיום ראשון, כך שהחלוקה מתחלפת לבד.
// "שבוע הבא/קודם" מזיז הצגה בלבד. נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('tr-form'), card = $('tr-card');
  if (!form) return;
  var KEY = 'kelim-toranut', WEEK = 7 * 86400000;
  var st = { people: '', tasks: 'לשטוף כלים\nלערוך ולפנות שולחן\nלהוריד זבל\nלתלות ולקפל כביסה\nלסדר את הסלון\nלהשקות עציצים' };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lines(s) { return String(s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function sunday(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; }
  var shift = 0, text = '';
  function draw() {
    var ppl = lines(st.people), tasks = lines(st.tasks);
    var sun = sunday(new Date()); sun.setDate(sun.getDate() + shift * 7);
    var w = Math.floor((sun.getTime() + 3 * 86400000) / WEEK); // מספר שבוע קבוע מאז 1970
    var sat = new Date(sun); sat.setDate(sat.getDate() + 6);
    var range = sun.getDate() + '.' + (sun.getMonth() + 1) + '–' + sat.getDate() + '.' + (sat.getMonth() + 1);
    $('tr-week').textContent = (shift === 0 ? 'השבוע' : shift === 1 ? 'שבוע הבא' : shift === -1 ? 'שבוע שעבר' : 'שבוע') + ': ' + range;
    if (!ppl.length || !tasks.length) {
      card.innerHTML = '<h3>לוח תורנויות</h3><p class="s2">כותבים למעלה מי בבית ומה צריך לעשות, והלוח יופיע כאן.</p>';
      text = ''; $('tr-wa').href = '#'; return;
    }
    var rows = tasks.map(function (t, i) { return [t, ppl[(i + w) % ppl.length]]; });
    card.innerHTML = '<h3>לוח תורנויות</h3><p class="s2">' + range + '</p><table>' + rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="who">' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>' +
      (ppl.length > tasks.length ? '<p class="ft">השבוע בחופש: ' + esc(ppl.filter(function (p) { return !rows.some(function (r) { return r[1] === p; }); }).join(', ')) + '</p>' : '') +
      '<p class="ft">כל יום ראשון מתחלפים. תודה לכולם ❤</p>';
    text = '🧹 לוח תורנויות ' + range + '\n\n' + rows.map(function (r) { return '▫️ ' + r[0] + ' – ' + r[1]; }).join('\n');
    $('tr-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  function fill() { form.querySelector('[name=people]').value = st.people; form.querySelector('[name=tasks]').value = st.tasks; }
  form.addEventListener('input', function () { st.people = form.querySelector('[name=people]').value; st.tasks = form.querySelector('[name=tasks]').value; save(); draw(); });
  $('tr-next').addEventListener('click', function () { shift++; draw(); });
  $('tr-prev').addEventListener('click', function () { shift--; draw(); });
  function used(how) { if (window.toolUsed) window.toolUsed('toranut', { how: how }); }
  $('tr-print').addEventListener('click', function () { used('print'); window.print(); });
  $('tr-wa').addEventListener('click', function (e) { if (!text) { e.preventDefault(); return; } used('wa'); });
  fill(); draw();
})();
