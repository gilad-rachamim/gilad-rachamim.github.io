/* קיצור קישורים – מיזם הכלים של גילעד רחמים. הלקוח של השרת kelim-kishur (tools/kishur-worker). */
(function () {
  'use strict';
  var API = 'https://s.hakelim.com'; // כתובת השרת והכתובת הקצרה
  var TOOL_PAGE = 'https://hakelim.com/kelim/machshev/kitzur-kishurim/';
  var LS = 'kz_links';
  var root = document.getElementById('kz-app');
  if (!root) return;

  // בפיתוח מקומי בלבד: ?api=http://127.0.0.1:8947 מחליף את השרת
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    try {
      var qa = new URLSearchParams(location.search).get('api');
      if (qa) localStorage.setItem('kz_api', qa);
      var sa = localStorage.getItem('kz_api');
      if (sa) API = sa.replace(/\/+$/, '');
    } catch (e) { /* בלי אחסון */ }
  }

  var $ = function (id) { return document.getElementById(id); };
  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function used(how) { try { if (window.toolUsed) window.toolUsed('kitzur', { how: how }); } catch (e) { /* ריק */ } }
  function say(msg) { var l = $('kz-live'); if (l) l.textContent = msg; }
  function setErr(msg) { var e = $('kz-err'); e.textContent = msg || ''; e.hidden = !msg; }

  // ---------- אחסון מקומי: "הקישורים שלי" ----------
  function load() { try { var a = JSON.parse(localStorage.getItem(LS) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(LS, JSON.stringify(a)); } catch (e) { /* בלי אחסון */ } }
  function addLink(l) {
    var a = load().filter(function (x) { return x.code !== l.code; });
    a.unshift(l);
    save(a.slice(0, 200));
  }
  function dropLink(code) { save(load().filter(function (x) { return x.code !== code; })); }
  function setUrl(code, url) { save(load().map(function (x) { if (x.code === code) x.url = url; return x; })); }

  // ---------- שרת ----------
  function call(path, method, body) {
    var opt = { method: method || 'GET', headers: {} };
    if (body) { opt.headers['content-type'] = 'application/json'; opt.body = JSON.stringify(body); }
    return fetch(API + path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j || {} }; });
    }, function () { return { status: 0, j: { error: 'אין חיבור לשרת כרגע. בדקו את האינטרנט ונסו שוב.' } }; });
  }
  function errText(r) { return (r.j && r.j.error) || 'משהו השתבש, נסו שוב בעוד רגע.'; }

  // ---------- עזרים ----------
  function niceShort(short) { try { return decodeURIComponent(short).replace(/^https?:\/\//, ''); } catch (e) { return short.replace(/^https?:\/\//, ''); } }
  function hostOf(u) { try { return new URL(u).hostname; } catch (e) { return u; } }
  function manageLink(l) { return TOOL_PAGE + '#m=' + encodeURIComponent(l.code) + '.' + l.key; }
  function copy(text, btn, okText) {
    var done = function () {
      used('copy');
      say('הועתק');
      if (btn) { var old = btn.textContent; btn.textContent = okText || 'הועתק ✓'; setTimeout(function () { btn.textContent = old; }, 1600); }
    };
    function fallback() {
      var t = h('textarea', { style: 'position:fixed;opacity:0;top:0' }); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) { say('לא הצלחנו להעתיק, סמנו והעתיקו ידנית'); }
      document.body.removeChild(t);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }
  function waShare(text) { return 'https://wa.me/?text=' + encodeURIComponent(text); }

  // ---------- QR ----------
  function drawQr(box, text, code) {
    box.textContent = '';
    if (typeof QRCode === 'undefined') { box.textContent = 'קוד ה-QR לא נטען. רעננו את הדף.'; return; }
    var tmp = h('div');
    new QRCode(tmp, { text: text, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
    var src = tmp.querySelector('canvas');
    if (!src) { box.textContent = 'לא הצלחנו ליצור QR בדפדפן הזה.'; return; }
    var pad = 24, c = document.createElement('canvas');
    c.width = c.height = 240 + pad * 2;
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, pad, pad);
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'קוד QR של הקישור הקצר'); c.className = 'kz-qr-img';
    var a = h('a', { class: 'btn btn-line btn-sm', href: c.toDataURL('image/png'), download: 'qr-' + code + '.png', text: 'להוריד תמונת QR' });
    a.addEventListener('click', function () { used('qr'); });
    box.appendChild(c); box.appendChild(a);
  }

  // ---------- סטטיסטיקה ----------
  function renderChart(box, days, total) {
    box.textContent = '';
    var map = {}; (days || []).forEach(function (d) { map[d.day] = d.n; });
    var arr = [], max = 1, now = Date.now();
    for (var i = 29; i >= 0; i--) {
      var day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem' }).format(new Date(now - i * 86400000));
      var n = map[day] || 0; if (n > max) max = n; arr.push({ day: day, n: n });
    }
    var last7 = arr.slice(-7).reduce(function (s, d) { return s + d.n; }, 0);
    box.appendChild(h('p', { class: 'kz-count', text: total + ' לחיצות בסך הכול · ' + last7 + ' ב-7 הימים האחרונים' }));
    var chart = h('div', { class: 'kz-chart', role: 'img', 'aria-label': 'לחיצות לפי ימים, 30 הימים האחרונים. סך הכול ' + total });
    arr.forEach(function (d) {
      var b = h('i', { title: d.day + ': ' + d.n });
      b.style.height = (d.n ? Math.max(6, Math.round((d.n / max) * 100)) : 2) + '%';
      chart.appendChild(b);
    });
    box.appendChild(chart);
    box.appendChild(h('p', { class: 'kz-axis' }, [h('span', { text: '30 ימים אחורה' }), h('span', { text: 'היום' })]));
  }
  function loadStats(l, box) {
    box.textContent = 'טוען…';
    return call('/api/stats?code=' + encodeURIComponent(l.code) + '&key=' + encodeURIComponent(l.key)).then(function (r) {
      if (r.status === 200) {
        renderChart(box, r.j.days, r.j.clicks);
        if (r.j.url && r.j.url !== l.url) { l.url = r.j.url; setUrl(l.code, r.j.url); }
        if (r.j.disabled) box.appendChild(h('p', { class: 'kz-err', text: r.j.disabled === 2 ? 'הקישור הזה נמחק.' : 'הקישור הזה הושבת בגלל דיווחים או בדיקת בטיחות.' }));
      } else if (r.status === 404) { box.textContent = 'הקישור לא נמצא בשרת.'; }
      else box.textContent = errText(r);
    });
  }

  // ---------- כרטיס קישור ----------
  function card(l, opts) {
    opts = opts || {};
    var short = l.short || (API + '/' + encodeURIComponent(l.code));
    var qrBox = h('div', { class: 'kz-qr', hidden: '' });
    var statBox = h('div', { class: 'kz-stat', hidden: '' });
    var editBox = h('div', { class: 'kz-edit', hidden: '' });
    var dest = h('p', { class: 'kz-dest' }, [document.createTextNode('מוביל ל: '), h('b', { dir: 'ltr', text: hostOf(l.url) })]);
    dest.title = l.url;
    var box = h('article', { class: 'kz-card' + (opts.big ? ' kz-card-big' : ''), 'data-code': l.code });

    function toggle(el, fn) { var open = el.hidden; el.hidden = !open; if (open && fn) fn(); return open; }
    var bCopy = h('button', { type: 'button', class: 'btn btn-gold btn-sm', text: 'העתקה', onclick: function () { copy(short, bCopy); } });
    var bWa = h('a', { class: 'btn btn-line btn-sm', target: '_blank', rel: 'noopener', href: waShare(short), text: 'שיתוף בוואטסאפ', onclick: function () { used('wa_share'); } });
    var acts = [bCopy, bWa];
    if (navigator.share) acts.push(h('button', { type: 'button', class: 'btn btn-line btn-sm', text: 'שיתוף', onclick: function () { used('share'); navigator.share({ url: short }).catch(function () {}); } }));
    acts.push(h('button', { type: 'button', class: 'btn btn-line btn-sm', text: 'QR', onclick: function () { toggle(qrBox, function () { drawQr(qrBox, short, l.code); }); } }));
    acts.push(h('button', { type: 'button', class: 'btn btn-line btn-sm', text: 'לחיצות', onclick: function () { toggle(statBox, function () { loadStats(l, statBox); }); } }));
    acts.push(h('button', { type: 'button', class: 'btn btn-line btn-sm', text: 'עריכת יעד', onclick: function () {
      if (!editBox.hidden) { editBox.hidden = true; return; }
      editBox.textContent = '';
      var inp = h('input', { type: 'url', dir: 'ltr', value: l.url, 'aria-label': 'היעד החדש של הקישור', autocomplete: 'off' });
      var msg = h('p', { class: 'kz-hint', 'aria-live': 'polite' });
      editBox.appendChild(h('div', { class: 'kz-row' }, [inp, h('button', { type: 'button', class: 'btn btn-gold btn-sm', text: 'שמירה', onclick: function () {
        msg.textContent = 'שומר…';
        call('/api/edit', 'POST', { code: l.code, key: l.key, url: inp.value }).then(function (r) {
          if (r.status === 200) { l.url = r.j.url; setUrl(l.code, r.j.url); dest.lastChild.textContent = hostOf(r.j.url); dest.title = r.j.url; msg.textContent = 'נשמר. הקישור הקצר מוביל עכשיו ליעד החדש.'; used('edit'); }
          else msg.textContent = errText(r);
        });
      } })]));
      editBox.appendChild(msg); editBox.hidden = false; inp.focus();
    } }));
    acts.push(h('button', { type: 'button', class: 'btn btn-line btn-sm', text: 'מחיקה', onclick: function () {
      if (!window.confirm('למחוק את הקישור הקצר? מי שיקליק עליו יראה הודעה שהוא נמחק, ואי אפשר לשחזר.')) return;
      call('/api/delete', 'POST', { code: l.code, key: l.key }).then(function (r) {
        if (r.status === 200 || r.status === 404 || r.status === 410) { dropLink(l.code); used('delete'); box.remove(); renderMine(); say('הקישור נמחק'); }
        else say(errText(r));
      });
    } }));
    var bMan = h('button', { type: 'button', class: 'btn btn-line btn-sm', text: 'קישור ניהול', onclick: function () { copy(manageLink(l), bMan, 'הועתק – שמרו אותו'); } });
    acts.push(bMan);
    acts.push(h('a', { class: 'btn btn-line btn-sm', target: '_blank', rel: 'noopener', href: short + '+', text: 'תצוגה מקדימה' }));

    box.appendChild(h('a', { class: 'kz-short', href: short, target: '_blank', rel: 'noopener', dir: 'ltr', text: niceShort(short) }));
    box.appendChild(dest);
    box.appendChild(h('div', { class: 'kz-acts' }, acts));
    box.appendChild(qrBox); box.appendChild(statBox); box.appendChild(editBox);
    if (opts.big) {
      box.appendChild(h('p', { class: 'kz-hint', text: 'שמרתי את הקישור ברשימה "הקישורים שלי" כאן בדפדפן. כדי לנהל אותו ממכשיר אחר, העתיקו את "קישור ניהול" ושמרו אותו (הוא מכיל את מפתח הניהול הפרטי שלכם).' }));
      drawQr(qrBox, short, l.code); qrBox.hidden = false;
      loadStats(l, statBox); statBox.hidden = false;
    }
    return box;
  }

  // ---------- הקישורים שלי ----------
  function renderMine() {
    var list = $('kz-list'), a = load();
    list.textContent = '';
    $('kz-mine').hidden = !a.length;
    a.forEach(function (l, i) {
      var c = card(l);
      list.appendChild(c);
    });
  }

  // ---------- יצירה ----------
  function busy(btn, on, txt) { btn.disabled = on; if (txt) btn.dataset.t = btn.dataset.t || btn.textContent; btn.textContent = on ? (txt || 'רגע…') : (btn.dataset.t || btn.textContent); }
  function shorten(url, alias, btn, how) {
    setErr('');
    busy(btn, true, 'מקצר…');
    return call('/api/new', 'POST', alias ? { url: url, alias: alias } : { url: url }).then(function (r) {
      busy(btn, false);
      if (r.status !== 200) { setErr(errText(r)); return null; }
      var l = { code: r.j.code, short: r.j.short, key: r.j.key, url: r.j.url || url, created: Date.now() };
      addLink(l); used(how || 'one'); say('הקישור הקצר מוכן');
      return l;
    });
  }
  function showResult(l) {
    var out = $('kz-out'); out.textContent = '';
    out.appendChild(card(l, { big: true }));
    renderMine();
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ---------- שם מותאם: בדיקת זמינות תוך כדי הקלדה ----------
  var aliasTimer, aliasSeq = 0;
  function aliasInput() {
    var inp = $('kz-alias'), msg = $('kz-alias-msg'), v = inp.value.trim().normalize('NFC').toLowerCase();
    clearTimeout(aliasTimer);
    msg.className = 'kz-hint';
    if (!v) { msg.textContent = ''; return; }
    if (v.length < 3) { msg.textContent = 'לפחות 3 תווים.'; return; }
    if (!/^[a-z0-9א-ת-]+$/.test(v)) { msg.textContent = 'מותרות אותיות באנגלית, ספרות, אותיות בעברית ומקף.'; msg.className = 'kz-hint kz-bad'; return; }
    msg.textContent = 'בודק…';
    var seq = ++aliasSeq;
    aliasTimer = setTimeout(function () {
      call('/api/check?alias=' + encodeURIComponent(v)).then(function (r) {
        if (seq !== aliasSeq) return;
        if (r.status === 200 && r.j.free) { msg.textContent = '✓ השם פנוי'; msg.className = 'kz-hint kz-ok'; }
        else { msg.textContent = (r.j && r.j.reason) || errText(r); msg.className = 'kz-hint kz-bad'; }
      });
    }, 350);
  }

  // ---------- כמה קישורים ----------
  function many(ev) {
    ev.preventDefault();
    var btn = $('kz-many-go'), lines = $('kz-many-in').value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!lines.length) { setErr('הדביקו קישור אחד בכל שורה.'); return; }
    if (lines.length > 20) { setErr('אפשר לקצר עד 20 קישורים בבת אחת. יש כאן ' + lines.length + '.'); return; }
    setErr(''); busy(btn, true, 'מקצר…');
    call('/api/bulk', 'POST', { urls: lines }).then(function (r) {
      busy(btn, false);
      if (r.status !== 200) { setErr(errText(r)); return; }
      var out = $('kz-out'); out.textContent = '';
      var rows = [], shorts = [];
      r.j.results.forEach(function (x) {
        if (x.code) { addLink({ code: x.code, short: x.short, key: x.key, url: x.url, created: Date.now() }); shorts.push(x.short); }
        rows.push(h('tr', {}, [
          h('td', { dir: 'ltr', class: 'kz-orig', text: x.url }),
          x.code ? h('td', {}, [h('a', { href: x.short, target: '_blank', rel: 'noopener', dir: 'ltr', text: niceShort(x.short) })]) : h('td', { class: 'kz-bad', text: x.error || 'לא הצלחנו' }),
        ]));
      });
      var all = h('button', { type: 'button', class: 'btn btn-gold', text: 'העתק הכול', onclick: function () { copy(shorts.join('\n'), all); } });
      out.appendChild(h('div', { class: 'kz-table-wrap' }, [h('table', { class: 'kz-table' }, [h('thead', {}, [h('tr', {}, [h('th', { text: 'הקישור שהדבקתם' }), h('th', { text: 'הקישור הקצר' })])]), h('tbody', {}, rows)])]));
      if (shorts.length) out.appendChild(h('div', { class: 'kz-acts' }, [all]));
      used('many'); say(shorts.length + ' קישורים קצרים מוכנים'); renderMine();
    });
  }

  // ---------- וואטסאפ ----------
  function phoneToIntl(raw) {
    var d = String(raw || '').replace(/[^\d]/g, '');
    if (d.indexOf('972') === 0) d = d.slice(3); else if (d.charAt(0) === '0') d = d.slice(1);
    return /^[2-9]\d{7,8}$/.test(d) ? '972' + d : '';
  }
  function wa(ev) {
    ev.preventDefault();
    var btn = $('kz-wa-go'), p = phoneToIntl($('kz-wa-phone').value), msg = $('kz-wa-msg').value.trim();
    if (!p) { setErr('כתבו מספר טלפון ישראלי, למשל 050-1234567.'); return; }
    var link = 'https://wa.me/' + p + (msg ? '?text=' + encodeURIComponent(msg) : '');
    shorten(link, $('kz-wa-alias').value.trim(), btn, 'wa').then(function (l) { if (l) showResult(l); });
  }

  // ---------- דיווח ----------
  function report(ev) {
    ev.preventDefault();
    var v = $('kz-rep-code').value.trim(), m = $('kz-rep-msg');
    var code = v.replace(/^https?:\/\//i, '').replace(/^s\.hakelim\.com\//i, '').replace(/[+/]+$/, '');
    try { code = decodeURIComponent(code); } catch (e) { /* כמו שהוא */ }
    if (!code) { m.textContent = 'הדביקו את הקישור הקצר שרוצים לדווח עליו.'; return; }
    m.textContent = 'שולח…';
    call('/api/report', 'POST', { code: code, reason: 'דיווח מהדף' }).then(function (r) {
      m.textContent = r.status === 200 ? 'תודה, הדיווח התקבל. קישור שמדווחים עליו כמה פעמים מושבת עד בדיקה.' : errText(r);
    });
  }

  // ---------- קישור ניהול (#m=קוד.מפתח) ----------
  function importHash() {
    var m = /^#m=([^.]+)\.(.+)$/.exec(location.hash);
    if (!m) return;
    var code, key = m[2];
    try { code = decodeURIComponent(m[1]); } catch (e) { return; }
    call('/api/stats?code=' + encodeURIComponent(code) + '&key=' + encodeURIComponent(key)).then(function (r) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ריק */ }
      if (r.status !== 200) { setErr('קישור הניהול לא תקין או שהקישור כבר נמחק.'); return; }
      addLink({ code: code, short: API + '/' + encodeURIComponent(code), key: key, url: r.j.url, created: r.j.created || Date.now() });
      renderMine(); say('הקישור נוסף לרשימה שלכם');
      $('kz-mine').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ---------- חיבור ----------
  function setMode(mode) {
    root.setAttribute('data-mode', mode);
    Array.prototype.forEach.call(document.querySelectorAll('#kz-tabs button'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-mode') === mode ? 'true' : 'false'); });
    Array.prototype.forEach.call(document.querySelectorAll('.kz-pane'), function (p) { p.hidden = p.getAttribute('data-pane') !== mode; });
    setErr('');
  }
  Array.prototype.forEach.call(document.querySelectorAll('#kz-tabs button'), function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });

  $('kz-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var url = $('kz-url').value.trim();
    if (!url) { setErr('הדביקו קישור לקיצור.'); $('kz-url').focus(); return; }
    shorten(url, $('kz-alias').value.trim(), $('kz-go'), 'one').then(function (l) { if (l) showResult(l); });
  });
  $('kz-paste').addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) { $('kz-url').value = (t || '').trim(); $('kz-url').focus(); }, function () { $('kz-url').focus(); say('לחצו והדביקו בשדה'); });
    } else $('kz-url').focus();
  });
  $('kz-alias').addEventListener('input', aliasInput);
  $('kz-many-form').addEventListener('submit', many);
  $('kz-wa-form').addEventListener('submit', wa);
  $('kz-rep-form').addEventListener('submit', report);

  setMode(root.getAttribute('data-mode') || 'one');
  renderMine();
  importHash();
})();
