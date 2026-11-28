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
  // הקדשת השבוע: [מיום, עד שבת, נוסח]. שבוע חדש = שורה חדשה כאן. הטבלה משמשת גם את דף "להקדיש שבוע".
  var HK = window.prHK = [
    ['2026-11-28', '2026-12-05', 'לעילוי נשמת אליהו חיים בן ארץ']
  ];
  var hkT = document.getElementById('pr-hk-t'), hkA = document.getElementById('pr-hk-a');
  if (hkT) HK.forEach(function (w) {
    if (today < w[0] || today > w[1]) return;
    hkT.textContent = 'דברי התורה השבוע מוקדשים ';
    var b = document.createElement('b'); b.textContent = w[2]; hkT.appendChild(b);
    if (hkA) hkA.textContent = 'להקדיש את השבוע הבא';
  });
  // דף "להקדיש שבוע": מוריד שבתות שעברו או תפוסות, ומציג את שורת ההקדשה תוך כדי כתיבה
  var wk = document.getElementById('hk-week');
  if (wk) {
    [].slice.call(wk.options).forEach(function (o) {
      var d = o.getAttribute('data-date');
      if (d < today || HK.some(function (w) { return d >= w[0] && d <= w[1]; })) wk.removeChild(o);
    });
    var who = document.getElementById('hk-who'), kind = document.getElementById('hk-kind'), prev = document.getElementById('hk-prev');
    var first = prev.textContent;
    var draw = function () { var n = who.value.trim(); prev.textContent = n ? kind.value + ' ' + n : first; };
    who.addEventListener('input', draw); kind.addEventListener('change', draw);
  }
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
