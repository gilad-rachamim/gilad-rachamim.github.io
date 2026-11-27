/* דף פרשה (/kodesh/parasha/<slug>/): שליחת דבר תורה או רשימת הנושאים בווטסאפ, ופתיחת נושא לפי העוגן. */
(function () {
  'use strict';
  // מסתיר שבתות שעברו; בעמוד המרכז מוצגות שמונה הקרובות
  var today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  [['.pr-reads li', 99], ['.pr-tbl tbody tr', 8]].forEach(function (c) {
    var all = [].slice.call(document.querySelectorAll(c[0]));
    var next = all.filter(function (el) { return el.getAttribute('data-date') >= today; });
    if (!next.length) return;
    all.forEach(function (el) { el.hidden = next.indexOf(el) < 0 || next.indexOf(el) >= c[1]; });
  });
  var root = document.getElementById('parasha');
  if (!root || !root.getAttribute('data-name')) return;
  var name = root.getAttribute('data-name'), url = 'https://hakelim.com' + location.pathname;
  function send(text, how) {
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    if (window.toolUsed) window.toolUsed('parasha', { how: how });
  }
  function topic(d) {
    var s = d.querySelector('summary');
    var t = 'פרשת ' + name + ': ' + s.querySelector('h3').textContent.trim() + ' (' + s.querySelector('small').textContent.trim() + ')';
    [].forEach.call(d.querySelectorAll('.pr-dt > p, .pr-dt > blockquote'), function (el) { t += '\n\n' + el.textContent.trim(); });
    return t + '\n\nעוד דברי תורה לפרשה: ' + url + '?utm_source=share_dt#' + d.id;
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('pr-tw')) send(topic(b.closest('.pr-t')), 'share_dt');
    else if (b.id === 'pr-all-share') {
      var a = [].map.call(root.querySelectorAll('.pr-t h3'), function (h) { return h.textContent.trim(); });
      send('שבת פרשת ' + name + '\n\nנושאי הפרשה:\n• ' + a.join('\n• ') + '\n\nדבר תורה לכל נושא: ' + url + '?utm_source=share', 'share');
    }
  });
  function openHash() {
    var d = /^#t-\d+-\d+$/.test(location.hash) && document.getElementById(location.hash.slice(1));
    if (!d) return;
    d.open = true;
    setTimeout(function () { d.scrollIntoView({ block: 'start', behavior: 'instant' }); }, 150);
  }
  openHash();
  window.addEventListener('hashchange', openHash);
})();
