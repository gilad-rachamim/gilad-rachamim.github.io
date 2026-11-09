// רשימת ציוד לטיול: בוחרים סוג טיול (אפשר כמה), מסמנים מה ארוז, מוסיפים פריטים, ושולחים בווטסאפ.
// הכול נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var box = $('ty-list');
  if (!box) return;
  var KEY = 'kelim-tiyulim-tziyud', TOOL = 'tiyulim_tziyud';
  var TYPES = [['yom', 'טיול יום'], ['laila', 'לילה בשטח'], ['tzimer', 'צימר או מלון'], ['chul', 'חו"ל'], ['yeladim', 'עם ילדים']];
  // לכל סוג: קבוצות של [שם קבוצה, [[מזהה, פריט, הערה]]]. "base" תמיד מופיע.
  var LISTS = {
    base: [['תמיד', [
      ['mayim', 'מים, לפחות 3 ליטר לאדם', 'בקיץ יותר'], ['kova', 'כובע וקרם הגנה'], ['naalayim', 'נעליים נוחות וסגורות'],
      ['telefon', 'טלפון טעון וסוללה ניידת'], ['mapa', 'מפה או מסלול שמור בטלפון', 'לפעמים אין קליטה'], ['ezra', 'ערכת עזרה ראשונה קטנה'],
      ['trufot', 'תרופות קבועות', 'גם ליום אחד'], ['ochel', 'אוכל וחטיפים'], ['sakit', 'שקית לאשפה', 'משאירים את השטח נקי'],
      ['tfila', 'תפילת הדרך', 'בכיס או בטלפון']]]],
    yom: [['טיול יום', [
      ['tik', 'תיק גב קטן'], ['magvonim', 'מגבונים וטישו'], ['bgadim', 'חולצה להחלפה'], ['mishkafei', 'משקפי שמש'],
      ['dmei', 'כסף קטן לחנייה או לכניסה'], ['mayim2', 'בגד ים ומגבת', 'אם יש מים במסלול']]]],
    laila: [['לילה בשטח', [
      ['ohel', 'אוהל ויתדות'], ['sakshina', 'שק שינה ומזרן'], ['panas', 'פנס ראש וסוללות'], ['chamim', 'בגדים חמים לערב', 'גם בקיץ הלילה קר'],
      ['gaz', 'גזייה, גז ומצית'], ['sir', 'סיר, כלים וסכו"ם'], ['kafe', 'קפה, תה וסוכר'], ['tzidanit', 'צידנית וקרח'],
      ['kisot', 'כיסאות מתקפלים'], ['chevel', 'חבל ואטבים'], ['niyar', 'נייר טואלט ואת חפירה קטן']]]],
    tzimer: [['צימר או מלון', [
      ['ishur', 'אישור ההזמנה והטלפון של המקום'], ['mitanim', 'מטענים לכל המכשירים'], ['bgadim2', 'בגדים לכל יום ועוד סט'],
      ['pijama', 'פיג\'מה ובגד ים לג\'קוזי'], ['hygiena', 'מברשת שיניים ותיק רחצה'], ['ochel2', 'קניות לבוקר', 'אם אין ארוחת בוקר'],
      ['shabat', 'לשבת: נרות, יין, חלות ופלטה', 'לבדוק מה יש במקום']]]],
    chul: [['חו"ל', [
      ['darkon', 'דרכון בתוקף', 'בודקים תוקף חודשים לפני'], ['kartis', 'כרטיסי טיסה ואישורי מלון בטלפון ובהדפסה'], ['bituach', 'ביטוח נסיעות'],
      ['matbea', 'מטבע מקומי וכרטיס אשראי'], ['mataem', 'מתאם לשקע'], ['sim', 'חבילת גלישה או סים מקומי'],
      ['trufot2', 'תרופות לכל הימים ומרשם באנגלית'], ['kasher', 'אוכל כשר לימים הראשונים', 'ובודקים מראש איפה יש'],
      ['tzilum', 'צילום של הדרכון בטלפון ובמייל']]]],
    yeladim: [['עם ילדים', [
      ['bgadimy', 'בגדים להחלפה לכל ילד'], ['chatifimy', 'חטיפים ושתייה לכל ילד'], ['mischakim', 'משחק או ספר לדרך'],
      ['agala', 'עגלה או מנשא'], ['chitulim', 'חיתולים ומגבונים'], ['shem', 'פתק עם הטלפון של ההורים בכיס של הילד'],
      ['kova2', 'כובע לכל ילד'], ['tikenot', 'פלסטרים ומשחה לעקיצות']]]]
  };
  var st = null;
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  // בכניסה הראשונה: דוגמה מלאה עם שמות בדויים.
  if (!st || !st.types) st = { demo: 1, title: 'קמפינג בגולן עם משפחת לוי', types: ['laila', 'yeladim'], on: { mayim: 1, kova: 1, telefon: 1, ohel: 1, sakshina: 1, panas: 1, bgadimy: 1 }, mine: [{ id: 'm1', name: 'מנגל ופחמים' }, { id: 'm2', name: 'גיטרה' }] };
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  function undemo() { if (st.demo) { st.demo = 0; $('ty-demo').hidden = true; } }
  function groups() {
    var g = [];
    ['base'].concat(TYPES.map(function (t) { return t[0]; }).filter(function (k) { return st.types.indexOf(k) > -1; })).forEach(function (k) {
      LISTS[k].forEach(function (x) { g.push([x[0], x[1].map(function (i) { return { id: i[0], name: i[1], note: i[2] || '' }; })]); });
    });
    if (st.mine.length) g.push(['הפריטים שלי', st.mine.map(function (m) { return { id: m.id, name: m.name, note: '', mine: 1 }; })]);
    return g;
  }
  function li(i) {
    return '<li><label><input type="checkbox" data-id="' + i.id + '"' + (st.on[i.id] ? ' checked' : '') + '><span>' + esc(i.name) + (i.note ? '<small>' + esc(i.note) + '</small>' : '') + '</span>' +
      (i.mine ? '<button class="x" type="button" data-del="' + i.id + '" aria-label="למחוק">×</button>' : '<i></i>') + '</label></li>';
  }
  function draw() {
    $('ty-demo').hidden = !st.demo;
    [].forEach.call($('ty-types').children, function (b) { b.classList.toggle('on', st.types.indexOf(b.getAttribute('data-k')) > -1); });
    var gs = groups();
    box.innerHTML = gs.map(function (g) {
      var n = g[1].filter(function (i) { return st.on[i.id]; }).length;
      return '<div class="ty-grp"><h2>' + esc(g[0]) + ' <small>' + n + '/' + g[1].length + '</small></h2><ul class="ty-ck">' + g[1].map(li).join('') + '</ul></div>';
    }).join('');
    var it = gs.reduce(function (a, g) { return a.concat(g[1]); }, []), n = it.filter(function (i) { return st.on[i.id]; }).length;
    $('ty-bar').style.width = (it.length ? n / it.length * 100 : 0) + '%';
    $('ty-txt').textContent = n === it.length && n ? 'הכול ארוז ✓ דרך צלחה!' : n + ' מתוך ' + it.length + ' ארוזים';
    var title = st.title || 'רשימת ציוד לטיול', link = '\n\n' + location.origin + location.pathname;
    var miss = gs.map(function (g) { var m = g[1].filter(function (i) { return !st.on[i.id]; }); return m.length ? '*' + g[0] + '*\n' + m.map(function (i) { return '▫️ ' + i.name; }).join('\n') : ''; }).filter(Boolean).join('\n\n');
    var full = gs.map(function (g) { return '*' + g[0] + '*\n' + g[1].map(function (i) { return (st.on[i.id] ? '✅ ' : '▫️ ') + i.name; }).join('\n'); }).join('\n\n');
    $('ty-wa-miss').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(miss ? 'מה עוד חסר (' + title + '):\n\n' + miss + link : title + ': הכול ארוז ✓ דרך צלחה!' + link);
    $('ty-wa-all').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent('*' + title + '*\n\n' + full + '\n\nמסמנים בטלפון מה ארוז:' + link);
  }
  $('ty-types').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var k = b.getAttribute('data-k'), i = st.types.indexOf(k);
    if (i > -1) st.types.splice(i, 1); else st.types.push(k);
    undemo(); save(); draw(); used('type');
  });
  $('ty-title').addEventListener('input', function () { st.title = this.value.trim(); undemo(); save(); draw(); });
  box.addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-id'); if (!id) return;
    if (e.target.checked) st.on[id] = 1; else delete st.on[id];
    undemo(); save(); draw();
    if (!checked) { checked = 1; used('check'); }
  });
  var checked = 0;
  box.addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'); if (!d) return;
    e.preventDefault();
    var id = d.getAttribute('data-del');
    st.mine = st.mine.filter(function (m) { return m.id !== id; }); delete st.on[id]; save(); draw();
  });
  $('ty-add').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('ty-new').value.trim(); if (!v) return;
    st.mine.push({ id: 'm' + Date.now(), name: v }); $('ty-new').value = ''; undemo(); save(); draw(); used('add');
  });
  $('ty-reset').addEventListener('click', function () { if (confirm('לנקות את כל הסימונים לטיול הבא? הפריטים שהוספתם יישארו.')) { st.on = {}; save(); draw(); } });
  $('ty-demo-x').addEventListener('click', function () { st = { demo: 0, title: '', types: ['yom'], on: {}, mine: [] }; save(); $('ty-title').value = ''; draw(); });
  ['ty-wa-miss', 'ty-wa-all'].forEach(function (id) { $(id).addEventListener('click', function () { used('wa'); }); });
  $('ty-title').value = st.title || '';
  draw();
})();
