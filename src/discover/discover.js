/* גילוי כלים לפי עונה: פס בבית, שורה בחיפוש, כרטיס בכלים קשורים, פס דק בדפי התחום (assets/discover.js, נבנה ע"י build.py) */
(function () {
  'use strict';
  var SEASONS = /*SEASONS*/[];
  function today() {
    var m = /[?&]hk-date=(\d{4})-(\d\d)-(\d\d)/.exec(location.search);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date();
  }
  function heb(d) {
    try {
      var p = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long' }).formatToParts(d), r = {};
      p.forEach(function (x) { r[x.type] = x.value; });
      return { m: r.month, d: +r.day };
    } catch (e) { return null; }
  }
  function ord(h) { return { Kislev: 1, Tevet: 2 }[h.m] * 100 + h.d; }
  function active() {
    var h = heb(today());
    if (!h) return null;
    for (var i = 0; i < SEASONS.length; i++) {
      var s = SEASONS[i];
      var a = { m: s.start[0], d: s.start[1] }, b = { m: s.end[0], d: s.end[1] }, o = ord(h);
      if ({ Kislev: 1, Tevet: 2 }[h.m] && o >= ord(a) && o <= ord(b)) return s;
    }
    return null;
  }
  function track(src, to) {
    if (window.gtag) window.gtag('event', 'discover_click', { src: src, to: to });
  }
  var S = active();
  window.hkNow = function () { return S ? S.tools.slice(0, 4).map(function (t) { return t.u; }) : []; };
  if (!S) return;
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function links(n, src) {
    return S.tools.slice(0, n).map(function (t) { return '<a href="' + t.u + '" data-dc="' + src + '">' + esc(t.n) + '</a>'; }).join('');
  }
  function ready() {
    var path = location.pathname, home = document.getElementById('hk-season');
    if (home) {
      home.className = 'hk-season no-print';
      home.innerHTML = '<p class="hk-se-h"><span aria-hidden="true">' + S.emoji + '</span> <b>' + esc(S.name) + '</b> <span>' + esc(S.line) + '</span></p><p class="hk-se-l">' +
        links(6, 'home') + '<a class="hk-se-all" href="' + S.hub + '" data-dc="home">לכל כלי ' + esc(S.name) + ' ←</a></p>';
      home.hidden = false;
    } else if (path === '/kodesh/' || path === '/kodesh/index.html') {
      var bar = document.querySelector('.newsbar') || document.querySelector('main');
      if (bar) {
        var d = document.createElement('div');
        d.className = 'hk-season hk-thin no-print';
        d.innerHTML = '<p class="hk-se-h"><span aria-hidden="true">' + S.emoji + '</span> <b>' + esc(S.name) + '</b> ' + links(3, 'hub') +
          '<a class="hk-se-all" href="' + S.hub + '" data-dc="hub">עוד ←</a></p>';
        if (bar.className.indexOf('newsbar') > -1) bar.parentNode.insertBefore(d, bar.nextSibling); else bar.insertBefore(d, bar.firstChild);
      }
    }
    var card = document.querySelector('.rel-v2 .rc[data-slot="new"]');
    if (card && path.indexOf(S.hub) !== 0) {
      var t = S.tools[0], cur = card.querySelector('a');
      for (var i = 0; i < S.tools.length; i++) {
        if (!document.querySelector('.rel-v2 a[href="' + S.tools[i].u + '"]')) { t = S.tools[i]; break; }
      }
      card.innerHTML = '<a href="' + t.u + '" data-dc="related">' + esc(t.n) + '</a><span class="badge">' + esc(S.name) + '</span><span>' + esc(t.d) + '</span>';
      card.setAttribute('data-slot', 'season');
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-dc]');
      if (a) track(a.getAttribute('data-dc'), a.getAttribute('href'));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
