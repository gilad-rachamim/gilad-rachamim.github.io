// רשימת קניות: מוצרים לפי קטגוריה, סימון "בעגלה", שליחת מה שחסר בווטסאפ. נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var list = $('kn-list');
  if (!list) return;
  var KEY = 'kelim-kniyot';
  var CATS = [
    ['ירקות ופירות', ['עגבניות', 'מלפפונים', 'בצל', 'תפוחי אדמה', 'גזר', 'פלפלים', 'חסה', 'בננות', 'תפוחים', 'לימון']],
    ['מקרר', ['חלב', 'ביצים', 'גבינה לבנה', 'גבינה צהובה', 'קוטג׳', 'יוגורט', 'חמאה', 'שמנת']],
    ['לחם ומזווה', ['לחם', 'פיתות', 'אורז', 'פסטה', 'קמח', 'סוכר', 'שמן', 'טונה', 'קפה', 'תה', 'דגני בוקר']],
    ['בשר ודגים', ['עוף', 'בשר טחון', 'שניצל', 'דג']],
    ['לשבת', ['חלות', 'יין או מיץ ענבים', 'נרות שבת', 'פתיליות', 'סלטים']],
    ['ניקיון ובית', ['נייר טואלט', 'מגבות נייר', 'סבון כלים', 'אבקת כביסה', 'שקיות אשפה', 'סבון ידיים', 'שמפו', 'משחת שיניים']],
    ['לתינוק', ['טיטולים', 'מגבונים', 'מטרנה', 'משחה לתינוק']]
  ];
  var st = [];
  try { st = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function catOf(name) { var n = name.trim(); for (var i = 0; i < CATS.length; i++) if (CATS[i][1].some(function (x) { return n.indexOf(x) >= 0; })) return CATS[i][0]; return 'אחר'; }
  function add(name, cat) {
    name = name.trim(); if (!name) return;
    if (st.some(function (x) { return x.n === name && !x.d; })) return;
    st.push({ id: 'k' + Date.now() + Math.floor(Math.random() * 999), n: name, c: cat || catOf(name), d: 0 });
    save(); draw();
    if (window.toolUsed && !used) { used = 1; window.toolUsed('kniyot', { how: 'add' }); }
  }
  var used = 0, text = '';
  $('kn-chips').innerHTML = CATS.map(function (c) {
    return '<p class="mp-cat">' + c[0] + '</p><div class="mp-chips">' + c[1].map(function (x) { return '<button type="button" data-chip="' + esc(x) + '" data-cat="' + c[0] + '">+ ' + esc(x) + '</button>'; }).join('') + '</div>';
  }).join('');
  function draw() {
    var order = CATS.map(function (c) { return c[0]; }).concat(['אחר']);
    var html = order.map(function (cat) {
      var items = st.filter(function (x) { return x.c === cat; }).sort(function (a, b) { return a.d - b.d; });
      if (!items.length) return '';
      return '<p class="mp-cat">' + cat + '</p><ul class="mp-list">' + items.map(function (x) {
        return '<li><label><input type="checkbox" data-id="' + x.id + '"' + (x.d ? ' checked' : '') + '><span>' + esc(x.n) + '</span><button class="x" type="button" data-del="' + x.id + '" aria-label="למחוק">×</button></label></li>';
      }).join('') + '</ul>';
    }).join('');
    list.innerHTML = html || '<p class="mp-empty">הרשימה ריקה. מקלידים למעלה, או פותחים "הוספה מהירה".</p>';
    var miss = order.map(function (cat) { var m = st.filter(function (x) { return x.c === cat && !x.d; }); return m.length ? '*' + cat + '*\n' + m.map(function (x) { return '▫️ ' + x.n; }).join('\n') : ''; }).filter(Boolean).join('\n\n');
    text = miss ? '🛒 רשימת קניות\n\n' + miss : '';
    $('kn-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent((text || 'הכול נקנה ✓') + '\n\n' + location.origin + location.pathname);
  }
  $('kn-add').addEventListener('submit', function (e) { e.preventDefault(); var v = $('kn-new').value; v.split(/[,\n]/).forEach(function (x) { add(x); }); $('kn-new').value = ''; $('kn-new').focus(); });
  $('kn-chips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-chip]'); if (!b) return;
    add(b.getAttribute('data-chip'), b.getAttribute('data-cat'));
    b.textContent = '✓ ' + b.getAttribute('data-chip');
  });
  list.addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-id'); if (!id) return;
    st.forEach(function (x) { if (x.id === id) x.d = e.target.checked ? 1 : 0; }); save(); draw();
  });
  list.addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'); if (!d) return;
    e.preventDefault(); var id = d.getAttribute('data-del');
    st = st.filter(function (x) { return x.id !== id; }); save(); draw();
  });
  $('kn-clean').addEventListener('click', function () { st = st.filter(function (x) { return !x.d; }); save(); draw(); });
  $('kn-all').addEventListener('click', function () { if (confirm('למחוק את כל הרשימה?')) { st = []; save(); draw(); } });
  $('kn-wa').addEventListener('click', function () { if (window.toolUsed) window.toolUsed('kniyot', { how: 'wa' }); });
  $('kn-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(text || 'הכול נקנה ✓') : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
  });
  draw();
})();
