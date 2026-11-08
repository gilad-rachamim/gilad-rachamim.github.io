// תכנון שבת: תפריט, אורחים ומשימות. נשמר בטלפון (localStorage), נשלח בווטסאפ או מודפס.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('sp-form'), card = $('sp-card'), box = $('sp-tasks');
  if (!form) return;
  var KEY = 'kelim-shabbat-plan', F = ['title', 'guests', 'm1', 'm2', 'm3'];
  var MEALS = [['m1', 'ליל שבת'], ['m2', 'סעודת שבת בבוקר'], ['m3', 'סעודה שלישית']];
  function blank() { return { title: '', guests: '', m1: '', m2: '', m3: '', t: [['', ''], ['', ''], ['', '']] }; }
  var st = blank();
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rows() {
    box.innerHTML = st.t.map(function (r, i) {
      return '<div class="mp-row"><input type="text" maxlength="50" data-t="' + i + '" data-k="0" placeholder="מה? (סלטים, יין, לסדר שולחן)" value="' + esc(r[0]) + '" aria-label="משימה"><input type="text" maxlength="30" data-t="' + i + '" data-k="1" placeholder="מי?" value="' + esc(r[1]) + '" aria-label="מי"><button class="x" type="button" data-del="' + i + '" aria-label="למחוק">×</button></div>';
    }).join('');
  }
  function fill() { F.forEach(function (k) { form.querySelector('[name=' + k + ']').value = st[k] || ''; }); rows(); }
  function read() {
    F.forEach(function (k) { st[k] = form.querySelector('[name=' + k + ']').value; });
    box.querySelectorAll('[data-t]').forEach(function (el) { st.t[+el.getAttribute('data-t')][+el.getAttribute('data-k')] = el.value; });
  }
  function has(s) { return !!(s || '').trim(); }
  var text = '';
  function draw() {
    var ts = st.t.filter(function (r) { return has(r[0]) || has(r[1]); });
    var title = has(st.title) ? st.title.trim() : 'תכנון שבת';
    card.innerHTML = '<h3>' + esc(title) + '</h3>' + (has(st.guests) ? '<p class="s2">מגיעים: ' + esc(st.guests) + '</p>' : '<p class="s2">שבת שלום!</p>') +
      MEALS.filter(function (m) { return has(st[m[0]]); }).map(function (m) { return '<h4>' + m[1] + '</h4><p class="nt">' + esc(st[m[0]]) + '</p>'; }).join('') +
      (ts.length ? '<h4>מי מביא ועושה מה</h4><table>' + ts.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="who">' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>' : '') +
      '<p class="ft">שבת שלום ומבורך</p>';
    text = '🕯️ ' + title + (has(st.guests) ? '\nמגיעים: ' + st.guests.trim() : '') + '\n\n' +
      MEALS.filter(function (m) { return has(st[m[0]]); }).map(function (m) { return '*' + m[1] + '*\n' + st[m[0]].trim(); }).join('\n\n') +
      (ts.length ? '\n\n*מי מביא ועושה מה*\n' + ts.map(function (r) { return '▫️ ' + r[0].trim() + (has(r[1]) ? ' – ' + r[1].trim() : ''); }).join('\n') : '') + '\n\nשבת שלום!';
    $('sp-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  form.addEventListener('input', function () { read(); save(); draw(); });
  box.addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'); if (!d) return;
    read(); st.t.splice(+d.getAttribute('data-del'), 1); if (!st.t.length) st.t.push(['', '']); save(); rows(); draw();
  });
  $('sp-addt').addEventListener('click', function () { read(); st.t.push(['', '']); save(); rows(); draw(); var l = box.querySelectorAll('input[data-k="0"]'); l[l.length - 1].focus(); });
  $('sp-new').addEventListener('click', function () { if (confirm('לנקות את כל התכנון ולהתחיל שבת חדשה?')) { st = blank(); save(); fill(); draw(); } });
  function used(how) { if (window.toolUsed) window.toolUsed('shabbat_plan', { how: how }); }
  $('sp-wa').addEventListener('click', function () { used('wa'); });
  $('sp-print').addEventListener('click', function () { used('print'); window.print(); });
  fill(); draw();
})();
