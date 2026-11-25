/* שו"ת לגרים – חיפוש חי, סינון לפי שלב, פתיחה לפי עוגן, שיתוף בווטסאפ. הכול בדפדפן. */
(function () {
  'use strict';
  var box = document.getElementById('sh-box');
  if (!box) return;
  var G = window.GIUR || { lang: 'he', t: function (d) { return d.he; }, used: function () {}, wa: function (t) { window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener'); } };
  var items = [].slice.call(box.querySelectorAll('details.sh-q'));
  var cats = [].slice.call(box.querySelectorAll('section.sh-cat'));
  var input = document.getElementById('sh-search');
  var count = document.getElementById('sh-count');
  var none = document.getElementById('sh-none');
  var tabs = [].slice.call(document.querySelectorAll('.gr-tabs [data-cat]'));
  var stage = 'all', term = '', timer = null, sentSearch = false;

  function norm(s) {
    return String(s || '').replace(/[֑-ׇ]/g, '').replace(/[׳‘’']/g, '').replace(/[״“”"]/g, '').replace(/ё/g, 'е').replace(/[-־–—]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  items.forEach(function (d) { d._t = norm(d.textContent); });

  function apply() {
    var words = norm(term).split(' ').filter(Boolean);
    var shown = 0;
    items.forEach(function (d) {
      var ok = (stage === 'all' || d.getAttribute('data-cat') === stage) && words.every(function (w) { return d._t.indexOf(w) > -1; });
      d.hidden = !ok;
      if (ok) shown++;
      if (words.length && ok && shown <= 8) d.open = true; else if (!words.length && d.hasAttribute('data-auto')) { d.open = false; d.removeAttribute('data-auto'); }
      if (words.length && ok && shown <= 8) d.setAttribute('data-auto', '1');
    });
    cats.forEach(function (s) { s.hidden = !s.querySelector('details.sh-q:not([hidden])'); });
    if (count) count.textContent = (words.length || stage !== 'all') ? G.t({ he: 'מוצגות ' + shown + ' מתוך ' + items.length + ' שאלות', en: 'Showing ' + shown + ' of ' + items.length + ' questions', ru: 'Показано ' + shown + ' из ' + items.length + ' вопросов' }) : G.t({ he: items.length + ' שאלות ותשובות', en: items.length + ' questions and answers', ru: items.length + ' вопросов и ответов' });
    if (none) none.hidden = shown !== 0;
  }

  if (input) {
    input.addEventListener('input', function () {
      term = input.value; apply();
      clearTimeout(timer);
      timer = setTimeout(function () { if (norm(term).length > 1 && !sentSearch) { sentSearch = true; G.used('giur_shut_search'); } }, 900);
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
  }
  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      stage = b.getAttribute('data-cat');
      tabs.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      apply(); G.used('giur_shut_stage', { stage: stage });
      var first = box.querySelector('section.sh-cat:not([hidden])');
      if (first && stage !== 'all') first.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  document.addEventListener('click', function (e) {
    var ps = e.target.closest && e.target.closest('[data-pshare]');
    if (ps) { G.used('giur_shut_pshare'); G.wa(document.title.split(' | ')[0] + '\n' + 'https://hakelim.com' + location.pathname); }
  });
  box.addEventListener('click', function (e) {
    var s = e.target.closest && e.target.closest('[data-share]');
    if (s) {
      var d = s.closest('details');
      G.used('giur_shut_share');
      var q = d.querySelector('summary').textContent.trim();
      G.wa(G.t({ he: 'שאלה ותשובה לגרים: ', en: 'Question and answer for converts: ', ru: 'Вопрос и ответ о гиюре: ' }) + q + '\n' + 'https://hakelim.com' + location.pathname + '#' + d.id);
    }
  });
  box.addEventListener('toggle', function (e) {
    var d = e.target;
    if (d.open && d.classList && d.classList.contains('sh-q') && !d.hasAttribute('data-auto')) G.used('giur_shut_open', { q: d.id });
  }, true);

  function openHash() {
    var h = decodeURIComponent((location.hash || '').slice(1));
    if (!h) return;
    var d = document.getElementById(h);
    if (d && d.classList.contains('sh-q')) { d.hidden = false; d.open = true; setTimeout(function () { d.scrollIntoView({ block: 'start' }); }, 60); }
  }
  window.addEventListener('hashchange', openHash);
  window.addEventListener('beforeprint', function () { items.forEach(function (d) { d.hidden = false; d.open = true; }); cats.forEach(function (s) { s.hidden = false; }); });
  apply(); openHash();
})();
