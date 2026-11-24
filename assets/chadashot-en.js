/* Israel News in 3 Minutes (English) – shows the latest English edition from the kelim-news server. */
(function () {
  'use strict';
  var API = 'https://kelim-news.gilad4049.workers.dev';
  var PAGE = 'https://hakelim.com/kelim/machshev/chadashot/en/';
  var SECTIONS = [['main', 'Top stories'], ['haredi', 'Haredi (ultra-Orthodox) community'], ['economy', 'Economy and cost of living'], ['good', 'Good news of the week']];
  var $ = function (id) { return document.getElementById(id); };
  var plain = '';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render(ed) {
    $('nw-ed').textContent = ed.name + ' – ' + ed.date;
    $('nw-when').textContent = 'Published at ' + ed.time + ' Israel time';
    var html = '', lines = ['Israel News in 3 Minutes – ' + ed.name + ', ' + ed.date, ''];
    SECTIONS.forEach(function (s) {
      var pts = (ed.sections && ed.sections[s[0]]) || [];
      if (!pts.length) return;
      html += '<section class="nw-sec"><h2>' + s[1] + '</h2><ol class="nw-list">';
      lines.push(s[1]);
      pts.forEach(function (p, i) {
        html += '<li>' + esc(p.text) + '<div class="nw-src">' + (p.sources || []).map(function (x) {
          return '<a href="' + esc(x.link) + '" target="_blank" rel="noopener nofollow">' + esc(x.name) + '</a>';
        }).join('') + '</div></li>';
        lines.push((i + 1) + '. ' + p.text);
      });
      html += '</ol></section>';
      lines.push('');
    });
    $('nw-body').innerHTML = html;
    plain = lines.join('\n') + '\nRead it with sources: ' + PAGE + '?utm_source=share';
    var wa = $('nw-wa'); if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent(plain);
    var fr = $('nw-friend'); if (fr) fr.href = 'https://wa.me/?text=' + encodeURIComponent('A calm Israel news digest in English, three times a day, free: ' + PAGE + '?utm_source=friend');
    if (window.toolUsed) window.toolUsed('chadashot_en', { how: 'view' });
  }
  function channels(links) {
    if (!links) return;
    if (links.wa) { $('nw-chan-a').href = links.wa + (links.wa.indexOf('?') < 0 ? '?utm_source=en_web' : ''); $('nw-chan').hidden = false; }
    if (links.tg) { $('nw-tg-a').href = links.tg + '?utm_source=en_web'; $('nw-tg').hidden = false; }
  }
  function init() {
    var copy = $('nw-copy');
    if (copy) copy.addEventListener('click', function () {
      if (!plain) return;
      (navigator.clipboard ? navigator.clipboard.writeText(plain) : Promise.reject()).then(function () { copy.textContent = 'Copied ✓'; }, function () { copy.textContent = 'Copy failed'; });
      setTimeout(function () { copy.textContent = 'Copy the digest'; }, 2500);
    });
    fetch(API + '/latest?lang=en&from=en', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (ed) {
      if (!ed || ed.empty || !ed.sections) {
        $('nw-ed').textContent = 'The first English edition is on its way';
        $('nw-body').innerHTML = '<p class="nw-wait">English editions appear at 7:00, 13:00 and 20:00 Israel time, except on Shabbat and holidays. Please check back soon.</p>';
        channels(ed && ed.links);
        return;
      }
      render(ed);
      channels(ed.links);
    }).catch(function () {
      $('nw-ed').textContent = 'The digest could not be loaded';
      $('nw-body').innerHTML = '<p class="nw-wait">Please refresh the page in a minute.</p>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
