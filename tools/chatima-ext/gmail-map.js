// מפת שולחים בג׳ימייל (תוסף "הכלים של גילעד רחמים", 3.5.0).
// נכנס לדף רק בלחיצה על "🗺 מפת שולחים" בחלון התוסף. עובר על דפי התוצאות של חיפוש בג׳ימייל
// וסופר לפי שולח: כמה מיילים, כמה לא נפתחו ומתי האחרון. קורא רק את שם השולח, הכתובת והתאריך –
// לא נושאים ולא תוכן. שום דבר לא נשמר ולא נשלח לשרת. כל פעולה (תווית, ארכיון, הסרה) נעשית
// במסכים של ג׳ימייל עצמו, בלחיצה של המשתמש.
(function () {
  'use strict';
  if (window.__hkGm) { window.__hkGm.toggle(true); return; }
  var api = window.__hkGm = {};
  var SCOPES = [
    ['in:inbox', 'דואר נכנס (כל הלשוניות)'], ['in:inbox is:unread', 'רק מה שלא נפתח'], ['category:promotions', 'קידומי מכירות'],
    ['category:updates', 'עדכונים'], ['in:inbox newer_than:90d', '3 חודשים אחרונים'], ['-in:sent -in:chats', 'כל המיילים']
  ];
  var S = { scope: SCOPES[0][0], pages: 10, map: {}, mails: 0, busy: false, stop: false, sort: 'c', only: false };
  function base() { var m = location.pathname.match(/^\/mail\/u\/\d+\//); return location.origin + (m ? m[0] : '/mail/u/0/'); }
  function myEmail() { var m = document.title.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/); return m ? m[0].toLowerCase() : ''; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rows() { return [].slice.call(document.querySelectorAll('tr.zA')).filter(function (r) { return r.offsetParent; }); }
  function sig() { return rows().map(function (r) { var e = r.querySelector('span[email]'); var d = r.querySelector('td.xW span[title]'); return (e ? e.getAttribute('email') : '') + (d ? d.getAttribute('title') : ''); }).join('|'); }
  function pager() { var t = [].slice.call(document.querySelectorAll('span.Dj')).filter(function (e) { return e.offsetParent; }).map(function (e) { return e.textContent; })[0] || ''; var m = t.replace(/,/g, '').match(/(\d+)\s*[–-]\s*(\d+)(?:\D+(\d+))?/); return m ? { a: +m[1], b: +m[2], n: m[3] ? +m[3] : Infinity } : null; }
  function readPage(me) {
    var n = 0;
    rows().forEach(function (r) {
      var who = [].slice.call(r.querySelectorAll('span[email]')).map(function (s) { return { e: (s.getAttribute('email') || '').toLowerCase(), n: (s.getAttribute('name') || s.textContent || '').trim() }; })
        .filter(function (x) { return x.e; });
      var other = who.filter(function (x) { return x.e !== me; })[0];
      // מייל ששלחתם לעצמכם – שורה אחת "אני (לעצמי)"
      who = other || (who[0] ? { e: who[0].e, n: 'אני (לעצמי)' } : null);
      if (!who) return;
      var d = r.querySelector('td.xW span[title]'), unread = r.classList.contains('zE');
      var o = S.map[who.e] || (S.map[who.e] = { e: who.e, n: who.n, c: 0, u: 0, last: '', me: !other });
      o.c++; if (unread) o.u++; if (!o.last && d) o.last = d.getAttribute('title') || ''; if (!o.n && who.n) o.n = who.n;
      n++;
    });
    S.mails += n; return rows().length;
  }
  async function scan() {
    if (S.busy) return; S.busy = true; S.stop = false; S.map = {}; S.mails = 0; draw();
    var keep = location.hash, me = myEmail(), q = encodeURIComponent(S.scope).replace(/%20/g, '+'), prev = sig(), size = 0;
    for (var p = 1; p <= S.pages && !S.stop; p++) {
      location.hash = '#search/' + q + (p > 1 ? '/p' + p : '');
      var ok = false;
      for (var w = 0; w < 60; w++) { await sleep(120); var s = sig(); if (s && s !== prev) { ok = true; break; } if (w > 25 && !rows().length) break; }
      if (!ok) { if (p === 1 && rows().length) { /* אותן שורות כמו המסך הקודם – כנראה זה באמת הדף הראשון */ } else break; }
      // ג׳ימייל מצייר את הדף בהדרגה: מחכים שהשורות יפסיקו להשתנות (עד 4 שניות)
      var last = sig(), still = 0;
      for (var z = 0; z < 40 && still < 4; z++) { await sleep(100); var s2 = sig(); if (s2 === last) still++; else { still = 0; last = s2; } }
      prev = last;
      var got = readPage(me);
      setMsg('קורא… ' + S.mails + ' מיילים, ' + Object.keys(S.map).length + ' שולחים');
      var pg = pager();
      if ((pg && pg.b >= pg.n) || got === 0 || (size && got < size)) break;   // הדף האחרון (got = מספר השורות בדף)
      size = Math.max(size, got);
    }
    location.hash = keep;
    S.busy = false;
    setMsg('נקראו ' + S.mails + ' מיילים מ-' + Object.keys(S.map).length + ' שולחים. לא נשמר כלום.');
    draw();
  }

  // ---------- ממשק בתוך shadow root ----------
  var host = document.createElement('div'); host.id = 'hk-gm-host';
  var root = host.attachShadow({ mode: 'open' });
  var css = document.createElement('style');
  css.textContent = [
    ':host{all:initial}', '*{box-sizing:border-box;font-family:Arial,Segoe UI,sans-serif}',
    '.pan{position:fixed;left:12px;top:70px;bottom:16px;z-index:2147483000;width:min(520px,calc(100vw - 24px));background:#fff;color:#1b1b1b;border:1px solid #d9cfb8;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.3);display:flex;flex-direction:column;direction:rtl;font-size:14px;overflow:hidden}',
    '@media (prefers-color-scheme:dark){.pan{background:#1f1f1f;color:#e8eaed;border-color:#444}tr:hover td{background:#2a2a2a!important}.mut{color:#bbb!important}select{background:#111;color:#eee}}',
    'header{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1f1a12;color:#e9c46a}', 'header h2{font-size:15px;margin:0;flex:1}',
    'header button{background:transparent;border:0;color:#e9c46a;font-size:18px;cursor:pointer}',
    '.bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:8px 12px;border-bottom:1px solid #e6dcc6}',
    '.btn{border:1px solid #c9a45c;background:transparent;color:inherit;border-radius:10px;padding:5px 9px;cursor:pointer;font-size:13px;text-decoration:none;display:inline-block}',
    '.btn.g{background:#e9c46a;color:#1f1a12;border-color:#e9c46a}', '.btn.s{padding:2px 6px;font-size:12px}',
    'button:focus-visible,select:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #e9c46a;outline-offset:2px}',
    'select{border:1px solid #d9cfb8;border-radius:8px;padding:4px 6px;font-size:13px}',
    '.body{flex:1;overflow:auto;padding:6px 8px}', '.mut{color:#6b6252;font-size:12px}',
    '.sum{padding:6px 4px 8px;line-height:1.6}',
    'table{width:100%;border-collapse:collapse;font-size:13px}', 'th,td{padding:5px 4px;border-bottom:1px solid #eee;text-align:right;vertical-align:middle}',
    'th{position:sticky;top:0;background:#f7f3ea;cursor:pointer;font-size:12px}', '@media (prefers-color-scheme:dark){th{background:#2a2a2a}}',
    'td.nm{max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}', 'td.nm small{display:block;color:#6b6252;font-size:11px;direction:ltr;text-align:right}',
    '.tag{font-size:11px;border-radius:999px;padding:1px 7px;background:#fde7c8;color:#7a4b00;white-space:nowrap}',
    '.msg{padding:6px 12px;min-height:22px;font-size:12px;color:#6b6252;border-top:1px solid #e6dcc6}',
    '.empty{padding:18px;color:#6b6252;text-align:center;line-height:1.7}'
  ].join('\n');
  root.appendChild(css);
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'on') Object.keys(attrs.on).forEach(function (ev) { e.addEventListener(ev, attrs.on[ev]); });
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var pan = el('section', { class: 'pan', role: 'dialog', 'aria-label': 'מפת שולחים' });
  var msgEl = el('div', { class: 'msg', role: 'status' });
  root.appendChild(pan); (document.body || document.documentElement).appendChild(host);
  function setMsg(t) { msgEl.textContent = t || ''; }
  var open = true;
  function bulk(o) { return !o.me && ((o.c >= 3 && o.u / o.c >= 0.9) || /no-?reply|newsletter|news@|mailer|marketing|promo|info@|deals|offers/i.test(o.e)); }
  function go(hash) { location.hash = hash; }
  function list() {
    var L = Object.keys(S.map).map(function (k) { return S.map[k]; });
    if (S.only) L = L.filter(bulk);
    var k = S.sort;
    L.sort(function (a, b) { return k === 'n' ? (a.n || a.e).localeCompare(b.n || b.e, 'he') : k === 'u' ? (b.u - a.u) || (b.c - a.c) : (b.c - a.c) || (b.u - a.u); });
    return L;
  }
  function exportCsv() {
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [['שולח', 'כתובת', 'מיילים', 'לא נפתחו', 'אחרון', 'כנראה דיוור'].join(',')];
    list().forEach(function (o) { lines.push([o.n, o.e, o.c, o.u, o.last, bulk(o) ? 'כן' : ''].map(q).join(',')); });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'מפת שולחים בגימייל - ' + new Date().toLocaleDateString('he-IL').replace(/\./g, '-') + '.csv';
    root.appendChild(a); a.click(); a.remove();
    setMsg('נשמר קובץ לאקסל עם ' + (lines.length - 1) + ' שולחים. בלי נושאים ובלי תוכן.');
  }
  function draw() {
    pan.textContent = '';
    pan.appendChild(el('header', null, [el('h2', { text: '🗺 מפת שולחים בג׳ימייל' }),
      el('button', { type: 'button', title: 'סגירה', 'aria-label': 'סגירה', on: { click: function () { toggle(false); } } }, ['✕'])]));
    var sc = el('select', { 'aria-label': 'איפה לספור' });
    SCOPES.forEach(function (s) { var o = el('option', { value: s[0], text: s[1] }); if (S.scope === s[0]) o.selected = true; sc.appendChild(o); });
    sc.addEventListener('change', function () { S.scope = sc.value; });
    var pg = el('select', { 'aria-label': 'כמה מיילים' });
    [[4, '200 אחרונים'], [10, '500 אחרונים'], [20, '1,000 אחרונים'], [40, '2,000 אחרונים']].forEach(function (x) { var o = el('option', { value: String(x[0]), text: x[1] }); if (S.pages === x[0]) o.selected = true; pg.appendChild(o); });
    pg.addEventListener('change', function () { S.pages = +pg.value; });
    pan.appendChild(el('div', { class: 'bar' }, [sc, pg,
      S.busy ? el('button', { class: 'btn', type: 'button', on: { click: function () { S.stop = true; } } }, ['⏹ לעצור'])
             : el('button', { class: 'btn g', type: 'button', on: { click: scan } }, [Object.keys(S.map).length ? '🔄 לספור שוב' : '▶ לספור'])]));
    var body = el('div', { class: 'body' });
    var L = list(), all = Object.keys(S.map).length;
    if (!all) {
      body.appendChild(el('div', { class: 'empty' }, ['בוחרים איפה לספור ולוחצים "לספור". המפה עוברת על דפי התוצאות של ג׳ימייל וסופרת מי שולח לכם הכי הרבה – ומי שאתם אף פעם לא פותחים.', el('br'), el('span', { class: 'mut', text: 'קוראים רק שם, כתובת ותאריך. לא נושאים, לא תוכן, ושום דבר לא נשמר.' })]));
    } else {
      var bulkN = Object.keys(S.map).map(function (k) { return S.map[k]; }).filter(bulk);
      var bulkMails = bulkN.reduce(function (a, o) { return a + o.c; }, 0);
      body.appendChild(el('div', { class: 'sum' }, [
        el('b', { text: S.mails + ' מיילים מ-' + all + ' שולחים. ' }),
        bulkN.length ? el('span', { text: '🔕 ' + bulkN.length + ' שולחים כנראה דיוור (' + bulkMails + ' מיילים) – רובם לא נפתחים. ' }) : null,
        (function () { var m = Object.keys(S.map).map(function (k) { return S.map[k]; }).filter(function (o) { return o.me; })[0]; return m && m.c >= 10 ? el('span', { text: '✉ ' + m.c + ' מיילים ששלחתם לעצמכם (התראות?) – אפשר להעביר אותם לתווית עם 🏷. ' }) : null; })(),
        el('br'),
        el('label', { class: 'mut' }, [(function () { var c = el('input', { type: 'checkbox' }); c.checked = S.only; c.addEventListener('change', function () { S.only = c.checked; draw(); }); return c; })(), ' רק דיוור']),
        ' ',
        el('a', { class: 'btn s', href: base() + '#sub', on: { click: function (e) { e.preventDefault(); go('#sub'); } } }, ['🔕 ניהול מינויים של ג׳ימייל']), ' ',
        el('button', { class: 'btn s', type: 'button', on: { click: exportCsv } }, ['⬇ לאקסל'])
      ]));
      var tb = el('table'), hr = el('tr');
      [['n', 'שולח'], ['c', 'מיילים'], ['u', 'לא נפתחו'], ['', 'לעשות']].forEach(function (h) {
        hr.appendChild(el('th', h[0] ? { scope: 'col', tabindex: '0', 'aria-sort': S.sort === h[0] ? 'descending' : 'none', on: { click: function () { S.sort = h[0]; draw(); } } } : { scope: 'col' }, [h[1]]));
      });
      tb.appendChild(el('thead', null, [hr]));
      var tbody = el('tbody');
      L.slice(0, 400).forEach(function (o) {
        var from = encodeURIComponent('from:' + o.e);
        tbody.appendChild(el('tr', null, [
          el('td', { class: 'nm', title: o.n + ' <' + o.e + '>' + (o.last ? '\nאחרון: ' + o.last : '') }, [o.n || o.e, el('small', { text: o.e })]),
          el('td', { text: String(o.c) }),
          el('td', null, [String(o.u), bulk(o) ? el('span', { class: 'tag', text: ' דיוור' }) : null]),
          el('td', null, [
            el('button', { class: 'btn s', type: 'button', title: 'להציג את כל המיילים מהשולח (משם אפשר לסמן הכול ולמחוק או לארכב)', on: { click: function () { go('#search/' + from); } } }, ['🔎']), ' ',
            el('button', { class: 'btn s', type: 'button', title: 'מסנן של ג׳ימייל לשולח: תווית, ארכיון אוטומטי או מחיקה – גם למה שכבר הגיע', on: { click: function () { go('#create-filter/from=' + encodeURIComponent(o.e)); setMsg('נפתח המסנן של ג׳ימייל עם "' + o.e + '". בוחרים: להחיל תווית / לדלג על תיבת הדואר הנכנס, ומסמנים "להחיל גם על שיחות תואמות".'); } } }, ['🏷'])
          ])
        ]));
      });
      tb.appendChild(tbody); body.appendChild(tb);
      if (L.length > 400) body.appendChild(el('div', { class: 'mut', text: 'מוצגים 400 הראשונים. הקובץ לאקסל כולל את כולם.' }));
    }
    pan.appendChild(body); pan.appendChild(msgEl);
  }
  function toggle(force) { open = typeof force === 'boolean' ? force : !open; pan.hidden = !open; if (open) draw(); }
  api.toggle = toggle;
  api._t = { S: S, scan: scan, readPage: readPage, bulk: bulk };
  draw();
})();
