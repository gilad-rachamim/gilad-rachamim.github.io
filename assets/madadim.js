// יומן מדדים: רישום מדידות לפי סוג, רשימה מהחדש לישן, שליחה בווטסאפ. נשמר בטלפון (localStorage). לא מפרש ערכים.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('md-form');
  if (!form) return;
  var KEY = 'kelim-madadim';
  // [מפתח, שם, שדות: [מפתח, תווית, מינימום, מקסימום]]
  var TYPES = [
    ['bp', 'לחץ דם', [['a', 'עליון', 50, 260], ['b', 'תחתון', 30, 160], ['p', 'דופק (לא חובה)', 30, 220]]],
    ['sug', 'סוכר', [['a', 'מ״ג/ד״ל', 20, 600]]],
    ['kg', 'משקל', [['a', 'ק״ג', 2, 300]]],
    ['hr', 'דופק', [['a', 'פעימות לדקה', 30, 220]]],
    ['tmp', 'חום', [['a', 'מעלות', 34, 43]]]
  ];
  var st = { type: 'bp', list: [] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function type() { return TYPES.filter(function (t) { return t[0] === st.type; })[0] || TYPES[0]; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function nowLocal() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmt(s) { var d = new Date(s); return d.getDate() + '.' + (d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function val(e) { return e.k === 'bp' ? e.a + '/' + e.b + (e.p ? ' · דופק ' + e.p : '') : String(e.a); }
  function tabs() {
    $('md-type').innerHTML = TYPES.map(function (t) { return '<button type="button" role="tab" data-type="' + t[0] + '" aria-selected="' + (t[0] === st.type) + '">' + t[1] + '</button>'; }).join('');
    var t = type();
    $('md-vals').style.gridTemplateColumns = 'repeat(' + t[2].length + ',1fr)';
    $('md-vals').innerHTML = t[2].map(function (f) { return '<div class="field"><label for="md-' + f[0] + '">' + f[1] + '</label><input id="md-' + f[0] + '" type="number" inputmode="decimal" step="any" min="' + f[2] + '" max="' + f[3] + '" dir="ltr"></div>'; }).join('');
  }
  var text = '';
  function draw() {
    var t = type(), items = st.list.filter(function (e) { return e.k === st.type; }).sort(function (a, b) { return a.w < b.w ? 1 : -1; });
    $('md-h').textContent = t[1] + ' · ' + items.length + ' מדידות';
    $('md-list').innerHTML = items.length ? items.map(function (e) {
      return '<li><span class="v">' + esc(val(e)) + '</span><span>' + fmt(e.w) + (e.n ? '<small>' + esc(e.n) + '</small>' : '') + '</span><button class="x" type="button" data-del="' + e.id + '" aria-label="למחוק">×</button></li>';
    }).join('') : '<li><span></span><span>עוד אין מדידות של ' + t[1] + '.</span><i></i></li>';
    text = 'יומן מדדים – ' + t[1] + '\n\n' + items.map(function (e) { return fmt(e.w) + '  ' + val(e) + (e.n ? ' (' + e.n + ')' : ''); }).join('\n');
    $('md-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  $('md-type').addEventListener('click', function (e) { var b = e.target.closest('[data-type]'); if (!b) return; st.type = b.getAttribute('data-type'); save(); tabs(); draw(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = type(), msg = $('md-msg'), en = { id: 'e' + Date.now(), k: t[0], w: $('md-when').value || nowLocal(), n: $('md-note').value.trim() };
    for (var i = 0; i < t[2].length; i++) {
      var f = t[2][i], raw = $('md-' + f[0]).value, num = parseFloat(raw);
      if (f[0] === 'p' && raw === '') continue;
      if (isNaN(num)) { msg.textContent = 'חסר מספר ב"' + f[1] + '".'; return; }
      if (num < f[2] || num > f[3]) { msg.textContent = 'המספר ב"' + f[1] + '" נראה לא סביר (' + num + '). כדאי לבדוק.'; return; }
      en[f[0]] = num;
    }
    st.list.push(en); save(); draw();
    msg.textContent = 'נרשם ✓ ' + val(en);
    t[2].forEach(function (f) { $('md-' + f[0]).value = ''; }); $('md-note').value = ''; $('md-when').value = nowLocal();
    if (window.toolUsed) window.toolUsed('madadim', { how: 'add', type: t[0] });
  });
  $('md-list').addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'); if (!d) return;
    if (confirm('למחוק את המדידה?')) { var id = d.getAttribute('data-del'); st.list = st.list.filter(function (x) { return x.id !== id; }); save(); draw(); }
  });
  $('md-wa').addEventListener('click', function () { if (window.toolUsed) window.toolUsed('madadim', { how: 'wa' }); });
  $('md-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
  });
  $('md-when').value = nowLocal();
  tabs(); draw();
})();
