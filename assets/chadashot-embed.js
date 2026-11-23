/* החדשות ב-3 דקות – רכיב הטמעה לאתרי קהילות (בתי כנסת, יישובים, עמותות).
   שימוש: <script src="https://hakelim.com/assets/chadashot-embed.js" async></script>
   אופציונלי: data-count="3" (כמה נקודות), data-theme="dark". הרכיב נכנס במקום התג, בתוך Shadow DOM. */
(function () {
  'use strict';
  var API = 'https://kelim-news.gilad4049.workers.dev';
  var PAGE = 'https://hakelim.com/kelim/machshev/chadashot/?utm_source=embed';
  var me = document.currentScript;
  var n = Math.max(1, Math.min(5, parseInt(me && me.getAttribute('data-count'), 10) || 3));
  var dark = me && me.getAttribute('data-theme') === 'dark';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var host = document.createElement('div');
  var tgt = me && me.getAttribute('data-target') && document.getElementById(me.getAttribute('data-target'));
  if (tgt) tgt.appendChild(host); else if (me && me.parentNode) me.parentNode.insertBefore(host, me); else document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  var bg = dark ? '#16211f' : '#fffdf7', fg = dark ? '#f4efe2' : '#1d1a14', gold = dark ? '#e0b85a' : '#8a6a14', line = dark ? '#33423f' : '#e4d8b8';
  root.innerHTML = '<style>.b{direction:rtl;font:16px/1.6 system-ui,Arial,sans-serif;background:' + bg + ';color:' + fg + ';border:1px solid ' + line + ';border-radius:14px;padding:14px 16px;max-width:560px;box-sizing:border-box}' +
    '.h{margin:0 0 2px;font-size:18px;font-weight:700}.d{margin:0 0 8px;font-size:13px;opacity:.75}ol{margin:0;padding-inline-start:20px}li{margin:6px 0}' +
    'a{color:' + gold + ';text-decoration:none;font-weight:600}a:hover{text-decoration:underline}.f{margin:10px 0 0;font-size:13px;border-top:1px solid ' + line + ';padding-top:8px}</style>' +
    '<div class="b"><p class="h">📰 החדשות ב-3 דקות</p><p class="d" id="d">טוען…</p><ol id="l"></ol>' +
    '<p class="f"><a href="' + PAGE + '" target="_blank" rel="noopener">לכל הנקודות ולמקורות</a> · מיזם חסד, בלי כוונת רווח</p></div>';
  var q = function (id) { return root.getElementById ? root.getElementById(id) : host.querySelector('#' + id); };
  fetch(API + '/latest?from=embed', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (ed) {
    if (!ed || ed.empty) { q('d').textContent = 'המהדורה הבאה בדרך'; return; }
    q('d').textContent = ed.name + ' – ' + ed.date.he + ' · ' + ed.time;
    var pts = (ed.sections && ed.sections.main) || [];
    q('l').innerHTML = pts.slice(0, n).map(function (p) { return '<li>' + esc(p.text) + '</li>'; }).join('');
  }).catch(function () { q('d').textContent = 'הסיכום לא נטען כרגע'; });
})();
