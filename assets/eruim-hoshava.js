// סידור הושבה: שולחנות עם מספר מקומות, אורחים עם נפשות וצד, הושבה בלחיצה (אורח ואז שולחן) או בגרירה,
// הושבה אוטומטית של מי שנשאר, ודף לכניסה לפי א-ב או לפי שולחנות בשלושה סגנונות. נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('hs-form');
  if (!form) return;
  var KEY = 'kelim-eruim-hoshava', TOOL = 'eruim_hoshava';
  function g(id, name, n, side, t) { return { id: id, name: name, n: n, side: side, t: t }; }
  // בכניסה הראשונה: דוגמה מלאה עם שמות בדויים.
  var st = { demo: 1, theme: 'zayit', view: 'ab', side: '', title: 'בר המצווה של אליה', tables: [
    { id: 't1', name: 'שולחן 1 – משפחה קרובה', seats: 10 }, { id: 't2', name: 'שולחן 2', seats: 10 },
    { id: 't3', name: 'שולחן 3', seats: 10 }, { id: 't4', name: 'שולחן 4 – חברים', seats: 14 }
  ], guests: [
    g('g1', 'סבא וסבתא אוחנה', 2, 'משפחה', 't1'), g('g2', 'משפחת אוחנה (הדוד משה)', 5, 'משפחה', 't1'), g('g3', 'דודה רחל ובעלה', 2, 'משפחה', 't1'),
    g('g4', 'משפחת ביטון', 4, 'משפחה', 't2'), g('g5', 'משפחת דהן', 5, 'משפחה', 't2'),
    g('g6', 'השכנים – משפחת לוי', 4, 'חברים', 't3'), g('g7', 'יעקב ומרים פרץ', 2, 'חברים', 't3'),
    g('g8', 'חברים מהעבודה של אבא', 6, 'עבודה', 't4'), g('g9', 'משפחת שושן', 4, 'חברים', 't4'),
    g('g10', 'הרב של בית הכנסת ורעייתו', 2, '', ''), g('g11', 'משפחת זכאי', 3, 'חברים', ''), g('g12', 'נתנאל ושירה', 2, 'חברים', '')
  ] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.guests) st = sv; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  function undemo() { if (st.demo) { st.demo = 0; } }
  var sel = '';
  function tab(id) { for (var i = 0; i < st.tables.length; i++) if (st.tables[i].id === id) return st.tables[i]; return null; }
  function guest(id) { for (var i = 0; i < st.guests.length; i++) if (st.guests[i].id === id) return st.guests[i]; return null; }
  function taken(tid) { var s = 0; st.guests.forEach(function (x) { if (x.t === tid) s += +x.n || 1; }); return s; }
  function chip(x) { return '<button type="button" class="er-g' + (x.id === sel ? ' sel' : '') + '" draggable="true" data-g="' + x.id + '">' + esc(x.name) + '<small>' + (+x.n || 1) + (x.side ? ' · ' + esc(x.side) : '') + '</small></button>'; }
  function abc(a, b) { return a.name.localeCompare(b.name, 'he'); }
  var text = '';
  function draw() {
    $('hs-demo').hidden = !st.demo;
    var free = st.guests.filter(function (x) { return !x.t || !tab(x.t); });
    var people = 0, seats = 0, seated = 0;
    st.guests.forEach(function (x) { people += +x.n || 1; if (x.t && tab(x.t)) seated += +x.n || 1; });
    st.tables.forEach(function (t) { seats += +t.seats || 0; });
    $('hs-sum').innerHTML = '<span>אורחים <b>' + people + '</b></span><span>מקומות <b>' + seats + '</b></span><span>הושבו <b>' + seated + '</b></span><span>נשארו <b>' + (people - seated) + '</b></span>' + (people > seats ? (people - seats === 1 ? '<span>חסר <b>מקום אחד</b></span>' : '<span>חסרים <b>' + (people - seats) + '</b> מקומות</span>') : '');
    $('hs-free').innerHTML = free.length ? free.sort(abc).map(chip).join('') : '<p class="er-empty" style="padding:.3rem 0">כולם יושבים ✓</p>';
    var sg = guest(sel);
    $('hs-pick').hidden = !sg;
    if (sg) $('hs-pick').innerHTML = 'נבחר: ' + esc(sg.name) + ' – עכשיו לוחצים על השולחן. ' +
      (sg.t ? '<button type="button" class="er-mini" data-unseat="1">להחזיר לרשימה</button> ' : '') +
      '<button type="button" class="er-mini" data-delg="1">למחוק</button> <button type="button" class="er-mini" data-cancel="1">ביטול</button>';
    $('hs-tables').innerHTML = st.tables.map(function (t) {
      var n = taken(t.id), s = +t.seats || 0, cls = n > s ? ' over' : n === s ? ' full' : '';
      var gs = st.guests.filter(function (x) { return x.t === t.id; }).sort(abc);
      return '<div class="er-t' + cls + '" data-t="' + t.id + '"><div class="hd"><b>' + esc(t.name) + '</b><span>' + n + '/' + s + '</span></div>' +
        (n > s ? '<div class="over-msg">יותר מדי: ' + (n - s) + ' מעל המקומות</div>' : '') +
        '<div class="er-chips2">' + (gs.length ? gs.map(chip).join('') : '<span class="er-hint">ריק – לוחצים על אורח ואז כאן</span>') + '</div>' +
        '<div class="acts" style="text-align:end"><button type="button" class="er-mini" data-delt="' + t.id + '">למחוק שולחן</button></div></div>';
    }).join('') || '<p class="er-empty">עוד אין שולחנות. מוסיפים למעלה.</p>';
    [].forEach.call($('hs-theme').children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === st.theme); });
    [].forEach.call($('hs-view').children, function (b) { b.classList.toggle('on', b.getAttribute('data-v') === st.view); });
    [].forEach.call($('hs-side').children, function (b) { b.classList.toggle('on', b.getAttribute('data-s') === (st.side || '')); });
    var c = $('hs-card');
    c.className = 'er-card t-' + (st.theme || 'lavan');
    var seatedG = st.guests.filter(function (x) { return x.t && tab(x.t); }).sort(abc);
    var head = '<h3>' + esc(st.title || 'סידור הושבה') + '</h3>';
    if (st.view === 'tables') {
      c.innerHTML = head + '<p class="s2">סידור לפי שולחנות</p><div class="tbls">' + st.tables.map(function (t) {
        var gs = st.guests.filter(function (x) { return x.t === t.id; }).sort(abc);
        return '<div><b>' + esc(t.name) + '</b>' + gs.map(function (x) { return esc(x.name) + ' (' + (+x.n || 1) + ')'; }).join('<br>') + '</div>';
      }).join('') + '</div><p class="ft">ברוכים הבאים, שמחים שבאתם!</p>';
    } else {
      c.innerHTML = head + '<p class="s2">מחפשים את השם – ולידו השולחן</p><div class="cols">' +
        (seatedG.length ? seatedG.map(function (x) { return '<div><span>' + esc(x.name) + '</span><b>' + esc(tab(x.t).name) + '</b></div>'; }).join('') : '<div><span>עוד אין אורחים בשולחנות</span></div>') +
        '</div><p class="ft">ברוכים הבאים, שמחים שבאתם!</p>';
    }
    text = '*' + (st.title || 'סידור הושבה') + '*\n\n' + st.tables.map(function (t) {
      var gs = st.guests.filter(function (x) { return x.t === t.id; }).sort(abc);
      return '*' + t.name + '* (' + taken(t.id) + '/' + t.seats + ')\n' + (gs.length ? gs.map(function (x) { return '• ' + x.name + ' (' + (+x.n || 1) + ')'; }).join('\n') : '• ריק');
    }).join('\n\n') + (free.length ? '\n\n*עוד לא הושבו*\n' + free.map(function (x) { return '• ' + x.name + ' (' + (+x.n || 1) + ')'; }).join('\n') : '');
    $('hs-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  function seat(gid, tid) {
    var x = guest(gid); if (!x) return;
    x.t = tid || ''; sel = ''; undemo(); save(); draw(); used('seat');
  }
  $('hs-title').value = st.title || '';
  $('hs-title').addEventListener('input', function () { st.title = this.value.trim(); undemo(); save(); draw(); });
  $('hs-side').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.side = b.getAttribute('data-s'); save(); draw(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var lines = $('hs-names').value.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean), msg = $('hs-msg');
    if (!lines.length) { msg.textContent = 'כותבים לפחות שם אחד.'; $('hs-names').focus(); return; }
    if (st.demo) { st.guests = []; st.demo = 0; }
    lines.forEach(function (l, i) {
      var m = l.match(/^(.*?)[\s,–-]+(\d{1,2})$/), name = m ? m[1].trim() : l, n = m ? Math.max(1, +m[2]) : 1;
      if (name) st.guests.push(g('g' + Date.now() + i, name, n, st.side || '', ''));
    });
    $('hs-names').value = ''; save(); draw();
    msg.textContent = 'נוספו ' + lines.length + ' ✓ עכשיו לוחצים על שם ואז על שולחן.';
    used('add');
  });
  $('hs-tadd').addEventListener('click', function () {
    var name = $('hs-tname').value.trim() || ('שולחן ' + (st.tables.length + 1)), s = Math.max(1, Math.min(60, +$('hs-tseats').value || 10));
    st.tables.push({ id: 't' + Date.now(), name: name, seats: s }); $('hs-tname').value = ''; undemo(); save(); draw(); used('table');
  });
  $('hs-demo-x').addEventListener('click', function () { st.guests = []; st.tables = []; st.title = ''; st.demo = 0; sel = ''; $('hs-title').value = ''; save(); draw(); });
  document.querySelector('.tool').addEventListener('click', function (e) {
    var c = e.target.closest('[data-g]');
    if (c) { e.stopPropagation(); var id = c.getAttribute('data-g'); sel = sel === id ? '' : id; draw(); return; }
    if (e.target.closest('[data-cancel]')) { sel = ''; draw(); return; }
    if (e.target.closest('[data-unseat]')) { seat(sel, ''); return; }
    if (e.target.closest('[data-delg]')) {
      var x = guest(sel); if (!x || !confirm('למחוק את ' + x.name + ' מהרשימה?')) return;
      st.guests = st.guests.filter(function (y) { return y !== x; }); sel = ''; undemo(); save(); draw(); return;
    }
    var dt = e.target.closest('[data-delt]');
    if (dt) {
      var t = tab(dt.getAttribute('data-delt')); if (!t || !confirm('למחוק את ' + t.name + '? האורחים שבו חוזרים לרשימה.')) return;
      st.guests.forEach(function (y) { if (y.t === t.id) y.t = ''; });
      st.tables = st.tables.filter(function (y) { return y !== t; }); undemo(); save(); draw(); return;
    }
    var tb = e.target.closest('[data-t].er-t');
    if (tb && sel) seat(sel, tb.getAttribute('data-t'));
  });
  // גרירה במחשב
  var box = document.querySelector('.tool');
  box.addEventListener('dragstart', function (e) { var c = e.target.closest('[data-g]'); if (!c) return; e.dataTransfer.setData('text/plain', c.getAttribute('data-g')); e.dataTransfer.effectAllowed = 'move'; });
  box.addEventListener('dragover', function (e) { var t = e.target.closest('.er-t,#hs-free'); if (!t) return; e.preventDefault(); [].forEach.call(document.querySelectorAll('.er-t.drop'), function (x) { if (x !== t) x.classList.remove('drop'); }); if (t.classList.contains('er-t')) t.classList.add('drop'); });
  box.addEventListener('dragleave', function (e) { var t = e.target.closest('.er-t'); if (t && !t.contains(e.relatedTarget)) t.classList.remove('drop'); });
  box.addEventListener('drop', function (e) {
    var t = e.target.closest('.er-t,#hs-free'); if (!t) return; e.preventDefault();
    var id = e.dataTransfer.getData('text/plain');
    seat(id, t.classList.contains('er-t') ? t.getAttribute('data-t') : '');
  });
  $('hs-auto').addEventListener('click', function () {
    var free = st.guests.filter(function (x) { return !x.t || !tab(x.t); }).sort(function (a, b) { return (+b.n || 1) - (+a.n || 1); });
    var left = 0;
    free.forEach(function (x) {
      var best = null, room = -1;
      st.tables.forEach(function (t) { var r = (+t.seats || 0) - taken(t.id); if (r >= (+x.n || 1) && r > room) { best = t; room = r; } });
      if (best) x.t = best.id; else left++;
    });
    sel = ''; undemo(); save(); draw();
    $('hs-msg').textContent = left ? left + ' לא נכנסו – אין שולחן עם מספיק מקום. מוסיפים שולחן או מגדילים.' : 'כולם הושבו ✓ אפשר להזיז ביד מה שצריך.';
    used('auto');
  });
  $('hs-theme').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.theme = b.getAttribute('data-t'); save(); draw(); });
  $('hs-view').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.view = b.getAttribute('data-v'); save(); draw(); });
  $('hs-print').addEventListener('click', function () { used('print'); window.print(); });
  $('hs-wa').addEventListener('click', function () { used('wa'); });
  draw();
})();
