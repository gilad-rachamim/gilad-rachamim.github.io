// אוכל ונשנושים לטיול: כמה אנשים, כמה ימים ואיך מבשלים -> תפריט לכל יום ורשימת קניות עם כמויות.
// הכמויות הן הערכה. הכול נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('oc-form')) return;
  var KEY = 'kelim-tiyulim-ochel', TOOL = 'tiyulim_ochel';
  // [שם, יחידה, כמות למבוגר לארוחה, קטגוריה, 'trip' = פעם אחת לכל הטיול / 'meal' = לכל הקבוצה בכל ארוחה]
  var F = {
    pita: ['פיתות', 'יח׳', 1.5, 'lechem'], lechem: ['לחם', 'כיכרות', 0.25, 'lechem'], lachm: ['לחמניות', 'יח׳', 1.5, 'lechem'],
    beitzim: ['ביצים', 'יח׳', 2, 'chalavi'], gvina: ['גבינה לבנה', 'גביעים', 0.35, 'chalavi'], tzhuba: ['גבינה צהובה', 'פרוסות', 3, 'chalavi'],
    chalav: ['חלב', 'ליטר', 0.2, 'chalavi'], dganim: ['דגני בוקר', 'קופסאות', 0.1, 'yavesh'],
    yerakot: ['ירקות לסלט (עגבניות, מלפפונים, פלפלים)', 'ק"ג', 0.15, 'yerek'], perot: ['פירות (תפוחים, בננות)', 'יח׳', 1, 'yerek'],
    tuna: ['טונה', 'קופסאות', 0.5, 'yavesh'], mamrach: ['ממרחים (חומוס, טחינה, מטבוחה)', 'קופסאות', 0.3, 'yavesh'],
    basar: ['בשר לעל האש (סטייקים, קבבים, כנפיים)', 'ק"ג', 0.35, 'basar'], nakni: ['נקניקיות', 'יח׳', 2, 'basar'],
    schnitzel: ['שניצלים מוכנים', 'יח׳', 2, 'basar'], pasta: ['פסטה', 'ק"ג', 0.12, 'yavesh'], rotev: ['רוטב עגבניות', 'צנצנות', 0.25, 'yavesh'],
    ptitim: ['פתיתים', 'ק"ג', 0.1, 'yavesh'], shakshuka: ['רסק ועגבניות לשקשוקה', 'קופסאות', 0.25, 'yavesh'],
    bamba: ['במבה וביסלי', 'שקיות', 1, 'nishnush'], yevesh: ['פירות יבשים ואגוזים', 'ק"ג', 0.05, 'nishnush'],
    vafel: ['ופלים ועוגיות', 'חבילות', 0.5, 'nishnush'], energia: ['חטיפי אנרגיה או גרנולה', 'יח׳', 1, 'nishnush'],
    chatuch: ['ירקות חתוכים לנשנוש (גזר, מלפפון)', 'ק"ג', 0.15, 'nishnush'],
    mayim: ['מים (3 ליטר למבוגר ביום)', 'ליטר', 3, 'shtiya'], kafe: ['קפה, תה וסוכר', 'ערכה', 1, 'shtiya', 'trip'],
    pachamim: ['פחמים ומצית', 'שקים', 1, 'klei', 'meal'], chadpami: ['חד-פעמי: צלחות, כוסות, סכו"ם', 'סטים', 1, 'klei'],
    ashpa: ['שקיות אשפה ומגבונים', 'חבילה', 1, 'klei', 'trip'], gaz: ['גזייה וגז', 'ערכה', 1, 'klei', 'trip']
  };
  var CATS = [['lechem', 'לחם'], ['chalavi', 'חלבי וביצים'], ['basar', 'בשר'], ['yerek', 'ירקות ופירות'], ['yavesh', 'מזווה'], ['nishnush', 'נשנושים'], ['shtiya', 'שתייה'], ['klei', 'כלים וציוד']];
  var STYLES = [['bli', 'בלי בישול'], ['esh', 'על האש'], ['gaz', 'גזייה בשטח'], ['tzimer', 'צימר עם מטבח']];
  var MEALS = [['boker', 'בוקר'], ['tzohorayim', 'צהריים'], ['erev', 'ערב'], ['nishnush', 'נשנושים']];
  // לכל סגנון ולכל ארוחה: אפשרויות [שם המנה, מוצרים]. כל יום לוקח את האפשרות הבאה, כדי שלא יאכלו אותו דבר.
  var MENU = {
    bli: { boker: [['לחמניות עם גבינות וסלט', 'lachm gvina tzhuba yerakot']], tzohorayim: [['פיתות עם טונה וממרחים', 'pita tuna mamrach yerakot'], ['פיתות עם שניצל וסלט', 'pita schnitzel yerakot mamrach']], erev: [['פיתות עם ממרחים, טונה וסלט', 'pita mamrach tuna yerakot']] },
    esh: { boker: [['פיתות עם גבינה וסלט', 'pita gvina tzhuba yerakot']], tzohorayim: [['פיתות עם טונה וממרחים', 'pita tuna mamrach yerakot']], erev: [['על האש: בשר ונקניקיות בפיתה', 'basar nakni pita mamrach yerakot pachamim'], ['נקניקיות על האש בפיתה', 'nakni pita mamrach yerakot pachamim']] },
    gaz: { boker: [['שקשוקה בגזייה עם לחם', 'beitzim shakshuka lechem gvina yerakot'], ['חביתות ולחם עם גבינה', 'beitzim lechem gvina tzhuba yerakot']], tzohorayim: [['פיתות עם טונה וממרחים', 'pita tuna mamrach yerakot']], erev: [['פסטה ברוטב עם גבינה צהובה', 'pasta rotev tzhuba yerakot'], ['פתיתים עם נקניקיות', 'ptitim nakni yerakot']] },
    tzimer: { boker: [['ארוחת בוקר ישראלית', 'beitzim lechem gvina tzhuba yerakot chalav dganim']], tzohorayim: [['פיתות עם שניצל וסלט', 'pita schnitzel mamrach yerakot']], erev: [['על האש בחצר', 'basar pita mamrach yerakot pachamim'], ['פסטה ברוטב וסלט', 'pasta rotev tzhuba yerakot']] }
  };
  var SNACKS = 'bamba yevesh vafel energia perot chatuch';
  // בכניסה הראשונה: דוגמה מלאה.
  var st = { demo: 1, title: 'קמפינג בגולן עם משפחת לוי', adults: 4, kids: 3, days: 2, style: 'esh', meals: { boker: 1, tzohorayim: 1, erev: 1, nishnush: 1 }, off: {}, on: { pita: 1, mayim: 1 }, mine: [{ id: 'm1', name: 'מרשמלו למדורה' }], theme: 'lavan' };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.meals) st = sv; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  function undemo() { if (st.demo) { st.demo = 0; $('oc-demo').hidden = true; } }
  function clampN(v, lo, hi) { v = parseInt(v, 10); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo; }
  function plan() {
    var people = st.adults + st.kids * 0.6, heads = st.adults + st.kids, days = [], qty = {};
    function add(id, servings, kind) {
      var f = F[id]; if (!f) return;
      var k = f[4], q = k === 'trip' ? 1 : k === 'meal' ? servings : f[2] * people * servings;
      if (id === 'chadpami') q = heads * servings;
      qty[id] = (qty[id] || 0) + q;
    }
    var menu = MENU[st.style] || MENU.esh;
    for (var d = 0; d < st.days; d++) {
      var day = [];
      MEALS.forEach(function (m) {
        if (!st.meals[m[0]]) return;
        if (m[0] === 'nishnush') { day.push([m[1], 'חטיפים, פירות וירקות חתוכים']); SNACKS.split(' ').forEach(function (id) { add(id, 1); }); return; }
        var opts = menu[m[0]], o = opts[d % opts.length];
        day.push([m[1], o[0]]);
        o[1].split(' ').forEach(function (id) { add(id, 1); });
        if (st.style !== 'tzimer') add('chadpami', 1);
      });
      add('mayim', 1);
      days.push(day);
    }
    if (st.meals.boker) add('kafe', 1);
    if (st.style !== 'tzimer') add('ashpa', 1);
    if (st.style === 'gaz' || (st.style !== 'bli' && st.style !== 'tzimer' && st.meals.boker)) add('gaz', 1);
    // מים: ילד שותה כ-2 ליטר ביום
    if (qty.mayim) qty.mayim = (st.adults * 3 + st.kids * 2) * st.days;
    var list = CATS.map(function (c) {
      var its = Object.keys(qty).filter(function (id) { return F[id][3] === c[0] && !st.off[id]; }).map(function (id) {
        var f = F[id], q = qty[id], u = f[1];
        q = /ק"ג|ליטר/.test(u) && q < 10 ? Math.ceil(q * 2) / 2 : Math.ceil(q - 0.05);
        if (q < 1 && !/ק"ג/.test(u)) q = 1;
        return { id: id, name: f[0], q: q, u: u };
      });
      return [c[1], its];
    }).filter(function (c) { return c[1].length; });
    if (st.mine.length) list.push(['הוספתי בעצמי', st.mine.map(function (m) { return { id: m.id, name: m.name, q: '', u: '', mine: 1 }; })]);
    var off = Object.keys(st.off).filter(function (id) { return qty[id]; }).map(function (id) { return { id: id, name: F[id][0] }; });
    return { days: days, list: list, off: off };
  }
  var tShop = '', tMenu = '';
  function draw() {
    $('oc-demo').hidden = !st.demo;
    [].forEach.call($('oc-style').children, function (b) { b.classList.toggle('on', b.getAttribute('data-k') === st.style); });
    [].forEach.call($('oc-meals').children, function (b) { b.classList.toggle('on', !!st.meals[b.getAttribute('data-k')]); });
    [].forEach.call($('oc-theme').children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === st.theme); });
    var p = plan(), title = st.title || 'אוכל לטיול', sub = st.adults + ' מבוגרים' + (st.kids ? ', ' + st.kids + ' ילדים' : '') + ' · ' + (st.days === 1 ? 'יום אחד' : st.days + ' ימים');
    $('oc-menu').innerHTML = p.days.length && p.days[0].length ? p.days.map(function (d, i) {
      return '<div class="ty-item"><div class="top"><b>יום ' + (i + 1) + '</b></div>' + d.map(function (m) { return '<p><span class="lbl">' + esc(m[0]) + ':</span> ' + esc(m[1]) + '</p>'; }).join('') + '</div>';
    }).join('') : '<p class="ty-empty">בוחרים לפחות ארוחה אחת.</p>';
    var all = p.list.reduce(function (a, c) { return a.concat(c[1]); }, []), n = all.filter(function (i) { return st.on[i.id]; }).length;
    $('oc-bar').style.width = (all.length ? n / all.length * 100 : 0) + '%';
    $('oc-txt').textContent = n === all.length && n ? 'הכול נקנה ✓ בתיאבון!' : n + ' מתוך ' + all.length + ' נקנו';
    $('oc-list').innerHTML = p.list.map(function (c) {
      return '<div class="ty-grp"><h2>' + esc(c[0]) + '</h2><ul class="ty-ck">' + c[1].map(function (i) {
        return '<li><label><input type="checkbox" data-id="' + i.id + '"' + (st.on[i.id] ? ' checked' : '') + '><span>' + esc(i.name) + (i.q !== '' ? '<small>' + esc(i.q + ' ' + i.u) + '</small>' : '') + '</span>' +
          '<button class="x" type="button" data-' + (i.mine ? 'del' : 'off') + '="' + i.id + '" aria-label="להוריד מהרשימה">×</button></label></li>';
      }).join('') + '</ul></div>';
    }).join('');
    $('oc-offbox').hidden = !p.off.length;
    $('oc-off').innerHTML = p.off.map(function (i) { return '<button type="button" data-back="' + i.id + '">+ ' + esc(i.name) + '</button>'; }).join('');
    var link = '\n\n' + location.origin + location.pathname;
    tMenu = '*' + title + ' – התפריט*\n' + sub + '\n\n' + p.days.map(function (d, i) { return '*יום ' + (i + 1) + '*\n' + d.map(function (m) { return m[0] + ': ' + m[1]; }).join('\n'); }).join('\n\n') + '\n\nבתיאבון!';
    var miss = p.list.map(function (c) { var m = c[1].filter(function (i) { return !st.on[i.id]; }); return m.length ? '*' + c[0] + '*\n' + m.map(function (i) { return '▫️ ' + i.name + (i.q !== '' ? ' – ' + i.q + ' ' + i.u : ''); }).join('\n') : ''; }).filter(Boolean).join('\n\n');
    tShop = miss ? '*רשימת קניות – ' + title + '*\n' + sub + '\n\n' + miss + link : title + ': הכול נקנה ✓ בתיאבון!' + link;
    $('oc-wa-shop').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(tShop);
    $('oc-wa-menu').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(tMenu + link);
    var c = $('oc-card'); c.className = 'ty-card t-' + (st.theme || 'lavan');
    c.innerHTML = '<h3>' + esc(title) + '</h3><p class="s2">' + esc(sub) + '</p>' +
      '<table><thead><tr><th>יום</th><th>ארוחה</th><th>מה אוכלים</th></tr></thead><tbody>' + p.days.map(function (d, i) { return d.map(function (m, j) { return '<tr>' + (j ? '' : '<td class="rl" rowspan="' + d.length + '">יום ' + (i + 1) + '</td>') + '<td>' + esc(m[0]) + '</td><td>' + esc(m[1]) + '</td></tr>'; }).join(''); }).join('') + '</tbody></table>' +
      '<h4>רשימת קניות</h4><div class="cols">' + p.list.map(function (cc) { return cc[1].map(function (i) { return '<div><span>☐ ' + esc(i.name) + '</span><b>' + esc(i.q !== '' ? i.q + ' ' + i.u : '') + '</b></div>'; }).join(''); }).join('') + '</div>' +
      '<p class="ft">בתיאבון, ודרך צלחה בעזרת ה׳</p>';
  }
  function fill() { $('oc-title').value = st.title || ''; $('oc-adults').value = st.adults; $('oc-kids').value = st.kids; $('oc-days').value = st.days; }
  $('oc-form').addEventListener('submit', function (e) { e.preventDefault(); });
  $('oc-title').addEventListener('input', function () { st.title = this.value.trim(); undemo(); save(); draw(); });
  [['adults', 1, 60], ['kids', 0, 60], ['days', 1, 14]].forEach(function (a) {
    $('oc-' + a[0]).addEventListener('input', function () { if (this.value === '') return; st[a[0]] = clampN(this.value, a[1], a[2]); undemo(); save(); draw(); used('count'); });
    $('oc-' + a[0]).addEventListener('change', function () { this.value = st[a[0]]; });
  });
  $('oc-style').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.style = b.getAttribute('data-k'); undemo(); save(); draw(); used('style'); });
  $('oc-meals').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var k = b.getAttribute('data-k'); if (st.meals[k]) delete st.meals[k]; else st.meals[k] = 1; undemo(); save(); draw(); });
  $('oc-theme').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.theme = b.getAttribute('data-t'); save(); draw(); });
  $('oc-list').addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-id'); if (!id) return;
    if (e.target.checked) st.on[id] = 1; else delete st.on[id];
    undemo(); save(); draw(); used('check');
  });
  $('oc-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-off],[data-del]'); if (!b) return;
    e.preventDefault();
    var off = b.getAttribute('data-off'), del = b.getAttribute('data-del');
    if (off) st.off[off] = 1;
    if (del) { st.mine = st.mine.filter(function (m) { return m.id !== del; }); delete st.on[del]; }
    undemo(); save(); draw();
  });
  $('oc-off').addEventListener('click', function (e) { var b = e.target.closest('[data-back]'); if (!b) return; delete st.off[b.getAttribute('data-back')]; save(); draw(); });
  $('oc-add').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('oc-new').value.trim(); if (!v) return;
    st.mine.push({ id: 'm' + Date.now(), name: v }); $('oc-new').value = ''; undemo(); save(); draw(); used('add');
  });
  $('oc-reset').addEventListener('click', function () { if (confirm('לנקות את הסימונים של מה שנקנה, לטיול הבא?')) { st.on = {}; save(); draw(); } });
  $('oc-demo-x').addEventListener('click', function () { st = { demo: 0, title: '', adults: 2, kids: 0, days: 1, style: 'bli', meals: { tzohorayim: 1, nishnush: 1 }, off: {}, on: {}, mine: [], theme: st.theme }; save(); fill(); draw(); });
  $('oc-print').addEventListener('click', function () { used('print'); window.print(); });
  ['oc-wa-shop', 'oc-wa-menu'].forEach(function (id) { $(id).addEventListener('click', function () { used('wa'); }); });
  fill(); draw();
})();
