/* חיפוש בראש כל דף באתר: טקסט חופשי בעברית על כל הדפים והכלים.
   אין תוצאה? מציעים לשלוח בקשה לכלי חדש (השרת kelim-bakasha, אותו שרת של /kelim/bakasha/). */
(function () {
  'use strict';
  var box = document.getElementById('hk-search');
  if (!box) return;
  var API = 'https://kelim-bakasha.gilad4049.workers.dev';
  var idx = null, loading = null;
  // שפת הדף: דפי אנגלית/רוסית מקבלים ממשק וחיפוש בשפה שלהם (ואם אין תוצאה - תוצאות בעברית עם כותרת)
  var LANG = (document.documentElement.lang || 'he').slice(0, 2);
  if (LANG !== 'en' && LANG !== 'ru') LANG = 'he';
  var UI = {
    he: { label: 'חיפוש כלי או דף באתר', ph: 'חפשו כלי: מה אתם רוצים לעשות?', go: 'חיפוש', hint: 'כלים בעברית', none: 'לא מצאנו כלי כזה אצלנו.', hebrew: '', all: '' },
    en: { label: 'Search tools on this site', ph: 'Search a tool: what do you need to do?', go: 'Search', hint: 'Tools in English', none: 'No tool in English matches. These Hebrew pages may help:', hebrew: ' (Hebrew)', all: 'No tool found.' },
    ru: { label: 'Поиск инструментов на сайте', ph: 'Найдите инструмент: что вам нужно сделать?', go: 'Найти', hint: 'Инструменты на русском', none: 'На русском ничего не найдено. Возможно, подойдут страницы на иврите:', hebrew: ' (иврит)', all: 'Ничего не найдено.' }
  }[LANG];
  function pageLang(u) { var m = /\/(en|ru)(\/|$)/.exec(u); return m ? m[1] : 'he'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[֑-ׇ]/g, '').replace(/[׳'"”“״]/g, '').replace(/[^א-תa-z0-9а-яё ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  // מורידים קידומת דקדוקית (ה/ב/ל/ו/כ/מ/ש) כדי ש"לתרגם" ימצא "תרגום"
  function stem(w) { return w.length > 3 && /^[הבלוכמש]/.test(w) ? w.slice(1) : w; }
  function track(name, extra) { try { if (window.toolUsed) window.toolUsed(name, extra || {}); } catch (e) {} }
  box.innerHTML = '<form class="hk-s" role="search" autocomplete="off"><label class="hk-s-l" for="hk-q">' + UI.label + '</label>' +
    '<div class="hk-s-row"><input id="hk-q" type="search" inputmode="search" enterkeyhint="search" placeholder="' + UI.ph + '" maxlength="80">' +
    '<button type="submit">' + UI.go + '</button></div><div class="hk-s-out" aria-live="polite"></div></form>';
  var form = box.firstChild, q = form.querySelector('input'), out = form.querySelector('.hk-s-out');
  function load() {
    if (idx) return Promise.resolve(idx);
    if (!loading) loading = fetch('/assets/search-index.json').then(function (r) { return r.json(); }).then(function (j) {
      j.forEach(function (it) { it._n = norm(it.n + ' ' + it.t); it._d = norm(it.d); it._u = norm(it.u.replace(/[\/-]+/g, ' ')); });
      return (idx = j);
    }).catch(function () { loading = null; return []; });
    return loading;
  }
  function score(it, words) {
    var s = 0, hit = 0;
    words.forEach(function (w) {
      var st = stem(w), a = 0;
      if (it._n.indexOf(w) > -1) a = 6; else if (it._n.indexOf(st) > -1) a = 5;
      else if (it._d.indexOf(w) > -1) a = 3; else if (it._d.indexOf(st) > -1) a = 2;
      else if (it._u.indexOf(st) > -1) a = 1;
      if (a) { hit++; s += a; }
    });
    if (!hit) return 0;
    if (words.length > 1 && hit < Math.ceil(words.length / 2)) return 0;
    return s + hit * 2;
  }
  function suggest(text) {
    if (LANG !== 'he') { out.innerHTML = '<div class="hk-none"><p>' + UI.all + '</p></div>'; return; }
    out.innerHTML = '<div class="hk-none"><p>לא מצאנו כלי כזה אצלנו. אפשר להציע אותו, וגילעד יראה את ההצעה.</p>' +
      '<div class="hk-sg"><textarea rows="2" maxlength="160" aria-label="מה הכלי שחסר">' + esc(text) + '</textarea>' +
      '<input type="email" placeholder="מייל, אם רוצים הודעה כשהכלי מוכן (לא חובה)" maxlength="120" dir="ltr">' +
      '<input class="hk-hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button type="button">שלחו את ההצעה</button><p class="hk-msg" role="status"></p></div>' +
      '<p class="hk-bot">🤖 אפשר גם לכתוב לבוט הכלים בטלגרם, במילים שלכם: <a href="https://t.me/HakelimBot?start=search" target="_blank" rel="noopener">לפתוח את הבוט</a></p></div>';
    var d = out.querySelector('.hk-sg'), ta = d.querySelector('textarea'), em = d.querySelector('input[type=email]'), hp = d.querySelector('.hk-hp'), b = d.querySelector('button'), m = d.querySelector('.hk-msg');
    b.onclick = function () {
      var what = ta.value.trim();
      if (what.length < 4) { m.textContent = 'כתבו בכמה מילים איזה כלי חסר.'; return; }
      b.disabled = true; m.textContent = 'שולחים…';
      fetch(API + '/req', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ what: what, who: '', dom: '', email: em.value.trim(), hp: hp.value }) })
        .then(function (r) { return r.json(); }).then(function (j) {
          if (j && j.error) { m.textContent = j.error; b.disabled = false; return; }
          track('hakelim_search', { how: 'suggest_sent' });
          d.innerHTML = '<p class="hk-ok">תודה! ההצעה התקבלה' + (j && j.no ? ' (בקשה ' + j.no + ')' : '') + ', וגילעד יראה אותה. <a href="/kelim/bakasha/">לוח הבקשות</a></p>';
        }).catch(function () { m.textContent = 'השליחה לא הצליחה כרגע. נסו שוב בעוד רגע.'; b.disabled = false; });
    };
  }
  // 22.11.2026 (גילעד): בלחיצה על השורה, לפני שמקלידים, מראים כלים מובילים ונושאים - למי שלא יודע מה להקליד
  var TOP = [['/kodesh/zmanim/', 'זמני היום לפי המיקום'], ['/kodesh/shabat/', 'כניסת שבת וצאת שבת'], ['/kodesh/birkat-hamazon/', 'ברכת המזון'],
    ['/kodesh/tefillin/', 'הנחת תפילין'], ['/kodesh/tehillim/', 'סיום תהילים בקישור'], ['/kelim/tamlul/', 'תמלול הקלטות בעברית'],
    ['/kelim/android/', 'מקליט שיחות לאנדרואיד'], ['/kesef/bruto-neto/', 'ברוטו נטו'], ['/limudim/poter/', 'הפותר: שאלות בגרות'], ['/kodesh/gimatria/', 'מחשבון גימטריה']];
  var TOPICS = [['/kodesh/', 'קודש ותפילה'], ['/kesef/', 'כסף'], ['/limudim/', 'לימודים'], ['/bait/', 'בית ומשפחה'], ['/esek/', 'עסק קטן'],
    ['/kelim/machshev/', 'מחשב וטלפון'], ['/kelim/tochen/', 'יצירת תוכן'], ['/kelim/shir/', 'שירים וקריוקי'], ['/kelim/briut/', 'בריאות'],
    ['/kelim/eruim/', 'אירועים ושמחות'], ['/kelim/tiyulim/', 'טיולים'], ['/nefesh/', 'נפש'], ['/kelim/apps/', 'אפליקציות לאנדרואיד'], ['/kelim/', 'כל הכלים']];
  function home() {
    if (LANG !== 'he') {
      load().then(function (list) {
        var mine = list.filter(function (it) { return pageLang(it.u) === LANG; }).slice(0, 14);
        out.innerHTML = '<div class="hk-home"><p class="hk-h">' + UI.hint + '</p><ul class="hk-top">' +
          mine.map(function (it) { return '<li><a href="' + esc(it.u) + '" data-p="' + esc(it.u) + '">' + esc(it.n) + '</a></li>'; }).join('') + '</ul></div>';
        out.onclick = function (e) { var a = e.target.closest && e.target.closest('a[data-p]'); if (a) track('hakelim_search', { how: 'home_pick', to: a.getAttribute('data-p') }); };
      });
      return;
    }
    out.innerHTML = '<div class="hk-home"><p class="hk-h">כלים מובילים</p><ul class="hk-top">' +
      TOP.map(function (x) { return '<li><a href="' + x[0] + '" data-p="' + x[0] + '">' + esc(x[1]) + '</a></li>'; }).join('') +
      '</ul><p class="hk-h">נושאים</p><ul class="hk-topics">' +
      TOPICS.map(function (x) { return '<li><a href="' + x[0] + '" data-p="' + x[0] + '">' + esc(x[1]) + '</a></li>'; }).join('') + '</ul></div>';
    out.onclick = function (e) { var a = e.target.closest && e.target.closest('a[data-p]'); if (a) track('hakelim_search', { how: 'home_pick', to: a.getAttribute('data-p') }); };
  }
  function run(text) {
    var n = norm(text);
    if (n.length < 2) { home(); return; }
    var words = n.split(' ').filter(function (w) { return w.length > 1; });
    load().then(function (list) {
      function rank(l) { return list.filter(function (it) { return pageLang(it.u) === l; }).map(function (it) { return [score(it, words), it]; }).filter(function (x) { return x[0] > 0; })
        .sort(function (a, b) { return b[0] - a[0]; }).slice(0, 8); }
      var res = rank(LANG), note = '';
      if (!res.length && LANG !== 'he') { res = rank('he'); note = res.length ? '<p class="hk-note">' + UI.none + '</p>' : ''; }
      if (!res.length) { track('hakelim_search', { how: 'no_result' }); suggest(text.trim()); return; }
      out.innerHTML = note + '<ul class="hk-res">' + res.map(function (x) { return '<li><a href="' + esc(x[1].u) + '"><b>' + esc(x[1].n) + '</b>' + (x[1].d ? '<span>' + esc(x[1].d) + '</span>' : '') + '</a></li>'; }).join('') +
        '</ul>' + (LANG === 'he' ? '<p class="hk-miss">לא זה? <a href="#" data-sg>הציעו כלי חדש</a></p>' : '');
      var sg = out.querySelector('[data-sg]'); if (sg) sg.onclick = function (e) { e.preventDefault(); suggest(text.trim()); };
    });
  }
  var t; q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { run(q.value); }, 180); });
  q.addEventListener('focus', load, { once: true });
  function showHome() { if (norm(q.value).length < 2 && !out.querySelector('.hk-home')) home(); }
  q.addEventListener('focus', showHome);
  q.addEventListener('click', showHome);
  // כפתור 🔍 בסרגל הנדבק וקיצור "/": קופצים לשורת החיפוש ושמים בה פוקוס (שורת החיפוש עצמה לא נדבקת, כדי לא לכסות כלים)
  function goSearch(e) {
    if (e) e.preventDefault();
    box.scrollIntoView({ block: 'start', behavior: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    q.focus({ preventScroll: true });
    showHome();
    track('hakelim_search', { how: 'btn_open' });
  }
  var sb = document.querySelector('.hk-sbtn'); if (sb) sb.addEventListener('click', goSearch);
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    goSearch(e);
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); track('hakelim_search', { how: 'submit' }); run(q.value); });
})();
