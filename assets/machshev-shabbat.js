/* מה קרה בשבת – מציג את סיכום מוצאי שבת האחרון מהשרת kelim-news. */
(function () {
  'use strict';
  var API = 'https://kelim-news.gilad4049.workers.dev';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function init() {
    fetch(API + '/latest?kind=shabbat&from=web', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (ed) {
      if (!ed || ed.empty) {
        $('ms-ed').textContent = 'הסיכום של מוצאי שבת יוצא כשעה אחרי צאת השבת';
        $('ms-body').innerHTML = '<p class="nw-wait">עד אז אפשר לראות את <a class="gold" href="/kelim/machshev/chadashot/">הסיכום של היום</a>.</p>';
        return;
      }
      $('ms-ed').textContent = 'סיכום ' + ed.name + ' – ' + ed.date.he;
      $('ms-when').textContent = 'יצא ב-' + ed.time;
      var html = '';
      [['main', 'העיקר'], ['haredi', 'ציבור חרדי'], ['economy', 'כלכלה וכיס']].forEach(function (s) {
        var pts = (ed.sections && ed.sections[s[0]]) || [];
        if (!pts.length) return;
        html += '<h3>' + s[1] + '</h3><ol class="ms-list">';
        pts.forEach(function (p) {
          html += '<li>' + esc(p.text) + '<div class="ms-src">' + p.sources.map(function (x) {
            return '<a href="' + esc(x.link) + '" target="_blank" rel="noopener nofollow">' + esc(x.name) + '</a>';
          }).join('') + '</div></li>';
        });
        html += '</ol>';
      });
      $('ms-body').innerHTML = html;
      if (window.toolUsed) window.toolUsed('chadashot', { how: 'shabbat_view' });
    }).catch(function () {
      $('ms-ed').textContent = 'הסיכום לא נטען';
      $('ms-body').innerHTML = '<p class="nw-wait">אפשר לשמוע אותו בטלפון כשר: 077-2253345, שלוחה 8.</p>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
