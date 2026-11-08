// רשימת ציוד דת לשטח: סימונים ופריטים אישיים נשמרים בטלפון (localStorage), שיתוף בווטסאפ.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var box = $('tz-list');
  if (!box) return;
  // דף אחר יכול לתת רשימה משלו: <script type="application/json" id="tz-data">, ו-data-key / data-title / data-tool על #tz-list
  var KEY = box.getAttribute('data-key') || 'kodesh-tziyud', TITLE = box.getAttribute('data-title') || 'רשימת ציוד דת לשטח', TOOL = box.getAttribute('data-tool') || 'tziyud';
  var UNIT = box.getAttribute('data-unit') || 'ארוזים', DONE = box.getAttribute('data-done') || 'הכול ארוז ✓ צאתכם לשלום';
  var GROUPS = [
    ['תפילה', [
      ['tfilin', 'תפילין', 'בשקית אטומה למים'], ['tzitzit', 'ציצית (טלית קטן) + זוג להחלפה'], ['talit', 'טלית'],
      ['kipa', 'כיפה + כיפה רזרבית', 'גם כובע מצחייה שמכסה את הראש'], ['sidur', 'סידור כיס'], ['tehilim', 'תהילים כיס'],
      ['tfiladerech', 'דף תפילת הדרך', 'אפשר להדפיס בכלי "דף לחייל"']]],
    ['שבת בשטח', [
      ['nerot', 'נרות שבת + גפרורים', 'נרות בכוסית, עמידים לרוח'], ['yayin', 'מיץ ענבים או יין לקידוש'], ['kos', 'כוס לקידוש'],
      ['lechem', 'שתי חלות או לחמניות (לחם משנה)'], ['havdala', 'נר הבדלה ובשמים'], ['shaon', 'שעון יד רגיל', 'שלא צריך טלפון כדי לדעת את השעה בשבת'],
      ['ochel', 'אוכל מוכן לשבת', 'לא צריך בישול בשבת'], ['panas', 'פנס שדולק מערב שבת או מקלון זוהר']]],
    ['כשרות', [
      ['manot', 'מנות קרב / אוכל בהכשר מוכר'], ['kelim', 'כלים חד-פעמיים', 'צלחות, כוסות וסכו״ם'], ['netila', 'כוס לנטילת ידיים'],
      ['bracha', 'ברכון / ברכת המזון בכיס']]],
    ['לימוד וחיזוק', [
      ['sefer', 'ספר קטן ללימוד', 'משנה, חומש או ספר הלכה'], ['alon', 'עלוני שבת לחלוקה'], ['tzedaka', 'מטבעות לצדקה']]]
  ];
  var custom = document.getElementById('tz-data');
  if (custom) try { GROUPS = JSON.parse(custom.textContent); } catch (e) {}
  var st = { on: {}, mine: [] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) { st.on = sv.on || {}; st.mine = sv.mine || []; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function all() {
    var g = GROUPS.map(function (x) { return [x[0], x[1].map(function (i) { return { id: i[0], name: i[1], note: i[2] || '' }; })]; });
    if (st.mine.length) g.push(['הפריטים שלי', st.mine.map(function (m) { return { id: m.id, name: m.name, note: '', mine: 1 }; })]);
    return g;
  }
  function li(i) {
    return '<li><label><input type="checkbox" data-id="' + i.id + '"' + (st.on[i.id] ? ' checked' : '') + '><span>' + esc(i.name) + (i.note ? '<small>' + esc(i.note) + '</small>' : '') + '</span>' +
      (i.mine ? '<button class="x" type="button" data-del="' + i.id + '" aria-label="למחוק">×</button>' : '<i></i>') + '</label></li>';
  }
  function draw() {
    box.innerHTML = all().map(function (g) {
      var n = g[1].filter(function (i) { return st.on[i.id]; }).length;
      return '<div class="tz-g"><h2>' + g[0] + ' <small>' + n + '/' + g[1].length + '</small></h2><ul class="tz">' + g[1].map(li).join('') + '</ul></div>';
    }).join('');
    meter();
  }
  function items() { return all().reduce(function (a, g) { return a.concat(g[1]); }, []); }
  function meter() {
    var it = items(), n = it.filter(function (i) { return st.on[i.id]; }).length;
    $('tz-bar').style.width = (it.length ? n / it.length * 100 : 0) + '%';
    $('tz-txt').textContent = n === it.length && n ? DONE : n + ' מתוך ' + it.length + ' ' + UNIT;
    var link = '\n\n' + location.origin + location.pathname;
    var miss = all().map(function (g) { var m = g[1].filter(function (i) { return !st.on[i.id]; }); return m.length ? '*' + g[0] + '*\n' + m.map(function (i) { return '▫️ ' + i.name; }).join('\n') : ''; }).filter(Boolean).join('\n\n');
    var full = all().map(function (g) { return '*' + g[0] + '*\n' + g[1].map(function (i) { return '▫️ ' + i.name; }).join('\n'); }).join('\n\n');
    $('tz-wa-miss').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent((miss ? 'מה עוד חסר לי (' + TITLE + '):\n\n' + miss : DONE) + link);
    $('tz-wa-all').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(TITLE + ':\n\n' + full + '\n\n' + (box.getAttribute('data-mark') || 'לסמן בטלפון מה ארוז:') + link);
  }
  box.addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-id'); if (!id) return;
    if (e.target.checked) st.on[id] = 1; else delete st.on[id];
    save(); draw();
    if (window.toolUsed && !used) { used = 1; window.toolUsed(TOOL, { how: 'check' }); }
  });
  var used = 0;
  box.addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'); if (!d) return;
    e.preventDefault();
    var id = d.getAttribute('data-del');
    st.mine = st.mine.filter(function (m) { return m.id !== id; }); delete st.on[id]; save(); draw();
  });
  $('tz-add').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('tz-new').value.trim(); if (!v) return;
    st.mine.push({ id: 'm' + Date.now(), name: v }); $('tz-new').value = ''; save(); draw();
  });
  $('tz-reset').addEventListener('click', function () { if (confirm('לנקות את כל הסימונים? הפריטים שהוספתם יישארו.')) { st.on = {}; save(); draw(); } });
  ['tz-wa-miss', 'tz-wa-all'].forEach(function (id) { $(id).addEventListener('click', function () { if (window.toolUsed) window.toolUsed(TOOL, { how: id }); }); });
  draw();
})();
