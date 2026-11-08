// תיק מסמכים לפני פנייה או ועדה: סימונים ומסמכים אישיים נשמרים בטלפון (localStorage), שיתוף בווטסאפ.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var box = $('tk-list');
  if (!box) return;
  var KEY = 'kelim-shikum-tik', TITLE = 'תיק מסמכים לפנייה או לוועדה', TOOL = 'shikum_tik';
  var GROUPS = [];
  try { GROUPS = JSON.parse($('tk-data').textContent); } catch (e) {}
  var st = { on: {}, mine: [] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) { st.on = sv.on || {}; st.mine = sv.mine || []; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function plain(s) { return String(s || '').replace(/<[^>]+>/g, ''); }
  function all() {
    var g = GROUPS.map(function (x) { return [x[0], x[1].map(function (i) { return { id: i[0], name: i[1], note: i[2] || '' }; })]; });
    if (st.mine.length) g.push(['המסמכים שלי', st.mine.map(function (m) { return { id: m.id, name: m.name, note: '', mine: 1 }; })]);
    return g;
  }
  // הערות מהרשימה הקבועה יכולות להכיל קישור לכלי אחר באתר (טקסט שלנו); פריטים של המשתמש תמיד עוברים esc
  function li(i) {
    return '<li><label><input type="checkbox" data-id="' + esc(i.id) + '"' + (st.on[i.id] ? ' checked' : '') + '><span>' + esc(i.name) + (i.note ? '<small>' + i.note + '</small>' : '') + '</span>' +
      (i.mine ? '<button class="x" type="button" data-del="' + esc(i.id) + '" aria-label="למחוק">×</button>' : '<i></i>') + '</label></li>';
  }
  function draw() {
    box.innerHTML = all().map(function (g) {
      var n = g[1].filter(function (i) { return st.on[i.id]; }).length;
      return '<div class="sk-g"><h2>' + esc(g[0]) + ' <small>' + n + '/' + g[1].length + '</small></h2><ul class="sk-list">' + g[1].map(li).join('') + '</ul></div>';
    }).join('');
    meter();
  }
  function items() { return all().reduce(function (a, g) { return a.concat(g[1]); }, []); }
  function meter() {
    var it = items(), n = it.filter(function (i) { return st.on[i.id]; }).length;
    $('tk-bar').style.width = (it.length ? n / it.length * 100 : 0) + '%';
    $('tk-txt').textContent = n === it.length && n ? 'הכול בתיק ✓ בהצלחה' : n + ' מתוך ' + it.length + ' כבר בתיק';
    var link = '\n\n' + location.origin + location.pathname;
    var miss = all().map(function (g) { var m = g[1].filter(function (i) { return !st.on[i.id]; }); return m.length ? '*' + g[0] + '*\n' + m.map(function (i) { return '▫️ ' + plain(i.name); }).join('\n') : ''; }).filter(Boolean).join('\n\n');
    var full = all().map(function (g) { return '*' + g[0] + '*\n' + g[1].map(function (i) { return (st.on[i.id] ? '✅ ' : '▫️ ') + plain(i.name); }).join('\n'); }).join('\n\n');
    $('tk-wa-miss').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent((miss ? 'מה עוד חסר לי בתיק המסמכים:\n\n' + miss : 'כל המסמכים בתיק ✓') + link);
    $('tk-wa-all').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(TITLE + ':\n\n' + full + '\n\nלסמן בטלפון מה כבר יש:' + link);
  }
  var used = 0;
  box.addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-id'); if (!id) return;
    if (e.target.checked) st.on[id] = 1; else delete st.on[id];
    save(); draw();
    if (window.toolUsed && !used) { used = 1; window.toolUsed(TOOL, { how: 'check' }); }
  });
  box.addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'); if (!d) return;
    e.preventDefault();
    var id = d.getAttribute('data-del');
    st.mine = st.mine.filter(function (m) { return m.id !== id; }); delete st.on[id]; save(); draw();
  });
  $('tk-add').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('tk-new').value.trim(); if (!v) return;
    st.mine.push({ id: 'm' + Date.now(), name: v }); $('tk-new').value = ''; save(); draw();
    if (window.toolUsed) window.toolUsed(TOOL, { how: 'add' });
  });
  $('tk-reset').addEventListener('click', function () { if (confirm('לנקות את כל הסימונים? המסמכים שהוספתם יישארו.')) { st.on = {}; save(); draw(); } });
  ['tk-wa-miss', 'tk-wa-all'].forEach(function (id) { $(id).addEventListener('click', function () { if (window.toolUsed) window.toolUsed(TOOL, { how: 'wa' }); }); });
  draw();
})();
