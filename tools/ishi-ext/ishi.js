// מצב אישי: מדבר עם הסקריפט בחשבון הגוגל של גילעד (config.js: ISHI.url + ISHI.token, לא בריפו).
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var CFG = self.ISHI || {};
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var CLEAN = [['promo1m', '📰 קידומי מכירות ישנים מחודש'], ['social1m', '👥 רשתות חברתיות ישנות מחודש'], ['updates3m', '🔔 עדכונים ישנים מ-3 חודשים'], ['forums3m', '💬 פורומים ישנים מ-3 חודשים'], ['big1y', '📦 מיילים גדולים מ-10MB, ישנים משנה']];
  var COLORS = { '#': '' };
  var loaded = {};

  if (location.search.indexOf('wide') >= 0 || window.innerWidth > 500) document.body.classList.add('wide');
  function say(t) { $('msg').textContent = t || ''; }
  function api(a, d) {
    if (!CFG.url || !CFG.token) return Promise.reject(new Error('setup'));
    var u = CFG.url + '?a=' + encodeURIComponent(a) + '&t=' + encodeURIComponent(CFG.token) + '&d=' + encodeURIComponent(JSON.stringify(d || {}));
    return fetch(u, { credentials: 'omit', redirect: 'follow' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.err || 'שגיאה'); return j.r;
    });
  }
  function fail(e) {
    var m = String(e && e.message || e);
    say(m === 'setup' ? 'חסר חיבור לסקריפט (config.js).' : m === 'auth' ? 'המפתח לא מתאים לסקריפט.' : /Failed to fetch|NetworkError/.test(m) ? 'אין חיבור לגוגל כרגע. לנסות שוב בעוד רגע.' : 'לא הצלחתי: ' + m);
  }
  function el(tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hm(t) { var d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dayName(t) {
    var d = new Date(t), today = new Date(); today.setHours(0, 0, 0, 0);
    var diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - today) / 864e5);
    var s = diff === 0 ? 'היום' : diff === 1 ? 'מחר' : 'יום ' + DAYS[d.getDay()];
    return s + ' · ' + d.getDate() + '.' + (d.getMonth() + 1);
  }
  function fmt(b) { return b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : b >= 1048576 ? (b / 1048576).toFixed(0) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function spin(box) { box.textContent = ''; box.appendChild(el('p', 'spin', 'טוען…')); }

  // ---------- לשוניות ----------
  function show(tab) {
    [].forEach.call(document.querySelectorAll('nav [data-tab]'), function (b) { b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false'); });
    [].forEach.call(document.querySelectorAll('[data-pane]'), function (s) { s.hidden = s.dataset.pane !== tab; });
    try { localStorage.setItem('ishiTab', tab); } catch (e) {}
    if (!loaded[tab]) { loaded[tab] = 1; LOAD[tab](); }
  }
  [].forEach.call(document.querySelectorAll('nav [data-tab]'), function (b) { b.addEventListener('click', function () { say(''); show(b.dataset.tab); }); });

  // ---------- יומן ----------
  function loadCal() {
    spin($('cal'));
    api('cal', { days: 7 }).then(function (list) {
      var box = $('cal'), last = ''; box.textContent = '';
      if (!list.length) box.appendChild(el('p', 'empty', 'אין אירועים בשבוע הקרוב.'));
      list.forEach(function (ev) {
        var dn = dayName(ev.s); if (dn !== last) { box.appendChild(el('div', 'day', dn)); last = dn; }
        var r = el('div', 'row');
        r.appendChild(el('span', 'tm', ev.ad ? 'כל היום' : hm(ev.s) + '–' + hm(ev.e)));
        var dot = el('span', 'dot'); dot.style.background = ev.col || '#d9b25f'; r.appendChild(dot);
        var tx = el('span', 'tx'); tx.appendChild(el('b', '', ev.t || '(בלי שם)')); tx.appendChild(el('small', '', [ev.loc, ev.cal].filter(Boolean).join(' · '))); r.appendChild(tx);
        box.appendChild(r);
      });
    }).catch(fail);
  }
  function evPre() { var v = $('ev-q').value.trim(); if (!v) { $('ev-pre').textContent = ''; return null; } var w = HKWhen.parse(v); $('ev-pre').textContent = '📅 ' + (w.title || 'אירוע') + ' · ' + HKWhen.describe(w); return w; }
  $('ev-q').addEventListener('input', evPre);
  $('ev').addEventListener('submit', function (e) {
    e.preventDefault(); var w = evPre(); if (!w) return;
    if (!w.start) { say('חסר תאריך. למשל: "מחר ב-10", "ביום שלישי", "20.11".'); return; }
    say('שומר ביומן…');
    api('calAdd', { title: w.title || 'אירוע', start: w.start.getTime(), end: w.end.getTime(), allDay: w.allDay }).then(function () {
      say('✓ נוסף ליומן: ' + (w.title || 'אירוע') + ' · ' + HKWhen.describe(w)); $('ev-q').value = ''; $('ev-pre').textContent = ''; loadCal();
    }).catch(fail);
  });

  // ---------- משימות ----------
  function loadTasks() {
    spin($('tasks'));
    api('tasks').then(function (r) {
      var box = $('tasks'); box.textContent = '';
      if (!r.items.length) box.appendChild(el('p', 'empty', 'אין משימות פתוחות 🎉'));
      r.items.forEach(function (t) {
        var row = el('label', 'row'); var c = el('input'); c.type = 'checkbox';
        c.addEventListener('change', function () { row.style.opacity = .4; api('taskDone', { id: t.id }).then(function () { row.remove(); say('✓ סומן כבוצע'); }).catch(function (e) { row.style.opacity = 1; c.checked = false; fail(e); }); });
        var tx = el('span', 'tx'); tx.appendChild(el('b', '', t.t)); if (t.due) tx.appendChild(el('small', '', 'עד ' + dayName(Date.parse(t.due)))); row.appendChild(c); row.appendChild(tx); box.appendChild(row);
      });
    }).catch(fail);
  }
  function tkPre() { var v = $('tk-q').value.trim(); if (!v) { $('tk-pre').textContent = ''; return null; } var w = HKWhen.parse(v); $('tk-pre').textContent = '✅ ' + (w.title || v) + (w.start ? ' · עד ' + dayName(w.start.getTime()) : ''); return w; }
  $('tk-q').addEventListener('input', tkPre);
  $('tk').addEventListener('submit', function (e) {
    e.preventDefault(); var w = tkPre(); if (!w) return;
    api('taskAdd', { title: w.title || $('tk-q').value.trim(), due: w.start ? w.start.getTime() : 0 }).then(function () { say('✓ נוספה משימה'); $('tk-q').value = ''; $('tk-pre').textContent = ''; loadTasks(); }).catch(fail);
  });

  // ---------- ג'ימייל ----------
  function loadMail() {
    spin($('clean')); $('unread').textContent = '';
    api('gmail').then(function (r) {
      $('unread').textContent = '✉ ' + r.unread + ' מיילים שלא נקראו בתיבה';
      var box = $('clean'); box.textContent = '';
      CLEAN.forEach(function (c) {
        var n = r.counts[c[0]] || 0, row = el('div', 'row');
        var tx = el('span', 'tx'); tx.appendChild(el('b', '', c[1])); tx.appendChild(el('small', '', n >= 500 ? '500 ומעלה שיחות' : n + ' שיחות')); row.appendChild(tx);
        var b = el('button', 'line act', '🗑 לנקות'); b.type = 'button'; b.disabled = !n;
        b.addEventListener('click', function () {
          if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'בטוח? ללחוץ שוב'; return; }
          b.disabled = true; b.textContent = 'מנקה…';
          api('gmailClean', { key: c[0] }).then(function (x) { say('🧹 ' + x.moved + ' שיחות עברו לאשפה (30 יום אפשר לשחזר).' + (x.left ? ' נשארו עוד ' + x.left + ' – ללחוץ שוב.' : '')); loadMail(); }).catch(function (e) { b.disabled = false; b.textContent = '🗑 לנקות'; fail(e); });
        });
        row.appendChild(b); box.appendChild(row);
      });
    }).catch(fail);
  }

  // ---------- דרייב ----------
  function fileRow(f) {
    var r = el('div', 'row'), a = el('a', 'tx'); a.href = f.u; a.target = '_blank'; a.rel = 'noopener';
    a.appendChild(el('b', '', f.n)); var d = new Date(f.d); a.appendChild(el('small', '', d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear()));
    r.appendChild(a); if (f.s) r.appendChild(el('span', 'sz', fmt(f.s))); return r;
  }
  function fileList(box, list, empty) { box.textContent = ''; if (!list.length) box.appendChild(el('p', 'empty', empty)); list.forEach(function (f) { box.appendChild(fileRow(f)); }); }
  function loadDrive() {
    spin($('drive'));
    api('drive').then(function (r) {
      var q = $('quota'); q.textContent = '';
      if (r.limit > 0) { q.appendChild(document.createTextNode('💾 ' + fmt(r.used) + ' מתוך ' + fmt(r.limit) + ' (' + Math.round(r.used / r.limit * 100) + '%)')); var bar = el('div', 'bar'), i = el('i'); i.style.width = Math.min(100, r.used / r.limit * 100) + '%'; bar.appendChild(i); q.appendChild(bar); }
      $('drive').textContent = ''; $('drive').appendChild(el('h3', '', '🕘 עודכנו לאחרונה'));
      var box = el('div'); $('drive').appendChild(box); fileList(box, r.recent, 'אין קבצים חדשים.');
    }).catch(fail);
  }
  $('ds').addEventListener('submit', function (e) {
    e.preventDefault(); var q = $('ds-q').value.trim(); if (!q) return; spin($('drive'));
    api('driveSearch', { q: q }).then(function (list) { $('drive').textContent = ''; $('drive').appendChild(el('h3', '', 'נמצאו ' + list.length)); var b = el('div'); $('drive').appendChild(b); fileList(b, list, 'לא נמצא.'); }).catch(fail);
  });
  $('dbig').addEventListener('click', function () {
    spin($('drive')); say('בודק את כל הקבצים שלך בדרייב, זה לוקח עד דקה…');
    api('driveBig').then(function (r) { say(''); $('drive').textContent = ''; $('drive').appendChild(el('h3', '', '🐘 הכי גדולים (מתוך ' + r.scanned + ' קבצים)')); var b = el('div'); $('drive').appendChild(b); fileList(b, r.files, 'אין קבצים גדולים.'); }).catch(fail);
  });

  // ---------- אנשי קשר ----------
  $('ps').addEventListener('submit', function (e) {
    e.preventDefault(); var q = $('ps-q').value.trim(); if (!q) return; spin($('ppl'));
    api('contacts', { q: q }).then(function (list) {
      var box = $('ppl'); box.textContent = '';
      if (!list.length) box.appendChild(el('p', 'empty', 'לא נמצא.'));
      list.forEach(function (p) {
        var r = el('div', 'row'), tx = el('span', 'tx'); tx.appendChild(el('b', '', p.n || '(בלי שם)')); tx.appendChild(el('small', '', p.ph.concat(p.em).join(' · '))); r.appendChild(tx);
        if (p.ph[0]) {
          var num = p.ph[0].replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^0/, '972');
          var w = el('a', 'line act', '💬'); w.href = 'https://web.whatsapp.com/send?phone=' + num; w.target = '_blank'; w.title = 'ווטסאפ'; r.appendChild(w);
          var c = el('button', 'line act', '📋'); c.type = 'button'; c.title = 'להעתיק מספר'; c.addEventListener('click', function () { navigator.clipboard.writeText(p.ph[0]).then(function () { say('✓ המספר הועתק'); }); }); r.appendChild(c);
        }
        box.appendChild(r);
      });
    }).catch(fail);
  });
  $('pa').addEventListener('submit', function (e) {
    e.preventDefault();
    api('contactAdd', { name: $('pa-n').value.trim(), phone: $('pa-p').value.trim(), email: $('pa-e').value.trim() }).then(function () { say('✓ נשמר באנשי הקשר: ' + $('pa-n').value.trim()); $('pa').reset(); }).catch(fail);
  });

  var LOAD = { cal: loadCal, tasks: loadTasks, mail: loadMail, drive: loadDrive, ppl: function () {} };
  $('big').addEventListener('click', function () { chrome.tabs.create({ url: chrome.runtime.getURL('ishi.html?wide') }); window.close(); });
  $('side').addEventListener('click', function () { chrome.windows.getCurrent(function (w) { try { chrome.sidePanel.open({ windowId: w.id }); } catch (e) {} window.close(); }); });

  if (!CFG.url || !CFG.token) { $('setup').hidden = false; [].forEach.call(document.querySelectorAll('[data-pane]'), function (s) { s.hidden = true; }); return; }
  api('ping').then(function (r) { $('who').textContent = r.me || ''; }).catch(function () {});
  var t = 'cal'; try { t = localStorage.getItem('ishiTab') || 'cal'; } catch (e) {}
  show(LOAD[t] ? t : 'cal');
})();
