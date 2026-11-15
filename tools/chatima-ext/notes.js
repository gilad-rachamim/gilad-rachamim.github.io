// פתקים וטקסטים מוכנים. נשמר רק בכרום: הפתקים ב-storage.local, הטקסטים המוכנים ב-storage.sync
// (כדי שיופיעו גם בתפריט הלחיצה הימנית ובווטסאפ ווב, ובמחשבים אחרים של אותו משתמש בכרום).
// סוגי פתקים: רגיל, רשימת משימות (כל שורה = משימה עם ✓), ועם תאריך (מזוהה מהטקסט, וכפתור "ליומן").
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var DEF_SNIPS = ['תודה רבה! 🙏', 'קיבלתי, אחזור אליך בהקדם.', 'אפשר לתאם שיחה? מתי נוח לך?', 'מצורף הקובץ. אשמח לאישור שהתקבל.', 'אני בדרך, אגיע בעוד כמה דקות', 'שבת שלום ומבורך! 🕯🕯', 'מזל טוב! 🎉 שתזכו לרוב נחת'];
  var snips = [], notes = [], kind = 'note', undo = null;

  function say(t) { $('msg').textContent = t || ''; if (t) setTimeout(function () { if ($('msg').textContent === t) $('msg').textContent = ''; }, 5000); }
  function copy(text) { return navigator.clipboard.writeText(text).then(function () { say('✓ הועתק – Ctrl+V כדי להדביק'); }, function () { say('לא הצלחתי להעתיק'); }); }
  function saveSnips() { return chrome.storage.sync.set({ snips: snips.slice(0, 60) }).catch(function () { return chrome.storage.local.set({ snips: snips }); }); }
  function saveNotes() { return chrome.storage.local.set({ notes: notes.slice(0, 1000) }); }

  // ---------- טקסטים מוכנים ----------
  function drawSnips() {
    var box = $('snips'); box.textContent = '';
    snips.forEach(function (t, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'snip'; b.textContent = t; b.title = 'להעתיק';
      b.addEventListener('click', function (e) { if (e.target.classList.contains('x')) return; copy(t); });
      var x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = '✕'; x.setAttribute('aria-label', 'למחוק את הטקסט: ' + t.slice(0, 30));
      x.addEventListener('click', function () { snips.splice(i, 1); saveSnips(); drawSnips(); say('הטקסט נמחק'); });
      b.appendChild(x); box.appendChild(b);
    });
    if (!snips.length) { var p = document.createElement('p'); p.className = 'empty'; p.textContent = 'אין עדיין. "➕ טקסט" מוסיף.'; box.appendChild(p); }
  }
  $('sn-add-btn').addEventListener('click', function () { $('sn-form').hidden = false; $('sn-new').focus(); });
  $('sn-cancel').addEventListener('click', function () { $('sn-form').hidden = true; });
  $('sn-form').addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('sn-new').value.trim(); if (!v) return;
    snips.unshift(v); saveSnips(); $('sn-new').value = ''; $('sn-form').hidden = true; drawSnips(); say('נשמר. הוא מופיע גם בלחיצה הימנית בכל שדה.');
  });

  // ---------- פתקים ----------
  function lines(n) { return n.text.split('\n'); }
  function noteEl(n) {
    var d = document.createElement('article'); d.className = 'note' + (n.pin ? ' pin' : ''); d.dataset.c = n.c || 0;
    if (n.kind === 'list') {
      lines(n).forEach(function (l, i) {
        if (!l.trim()) return;
        var done = /^\[x\]\s?/i.test(l), txt = l.replace(/^\[(x| )\]\s?/i, '');
        var row = document.createElement('label'); row.className = 'chk' + (done ? ' done' : '');
        var c = document.createElement('input'); c.type = 'checkbox'; c.checked = done;
        c.addEventListener('change', function () { var L = lines(n); L[i] = (c.checked ? '[x] ' : '[ ] ') + txt; n.text = L.join('\n'); n.at = Date.now(); saveNotes(); draw(); });
        var s = document.createElement('span'); s.textContent = txt; row.appendChild(c); row.appendChild(s); d.appendChild(row);
      });
    } else {
      var body = document.createElement('div'); body.className = 'body'; body.contentEditable = 'plaintext-only'; body.textContent = n.text;
      body.setAttribute('aria-label', 'הפתק');
      body.addEventListener('blur', function () { var v = body.innerText.replace(/\n$/, ''); if (v !== n.text) { n.text = v; n.at = Date.now(); saveNotes(); draw(); } });
      d.appendChild(body);
    }
    var w = n.kind === 'date' ? HKWhen.parse(n.text.split('\n')[0]) : null;
    if (w && w.start) { var wh = document.createElement('div'); wh.className = 'when'; wh.textContent = '📅 ' + HKWhen.describe(w); d.appendChild(wh); }
    var meta = document.createElement('div'); meta.className = 'meta'; var dt = new Date(n.at); meta.textContent = dt.getDate() + '.' + (dt.getMonth() + 1) + ' ' + dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); d.appendChild(meta);
    var t = document.createElement('div'); t.className = 'tools';
    function btn(icon, label, fn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = icon; b.title = label; b.setAttribute('aria-label', label); b.addEventListener('click', fn); t.appendChild(b); }
    btn('📋', 'להעתיק', function () { copy(n.kind === 'list' ? n.text.replace(/^\[x\]\s?/gim, '✓ ').replace(/^\[ \]\s?/gm, '• ') : n.text); });
    btn(n.pin ? '📍' : '📌', n.pin ? 'לבטל נעיצה' : 'לנעוץ למעלה', function () { n.pin = !n.pin; saveNotes(); draw(); });
    btn('🎨', 'צבע', function () { n.c = ((n.c || 0) + 1) % 6; saveNotes(); draw(); });
    btn(n.kind === 'list' ? '🗒' : '✅', n.kind === 'list' ? 'להפוך לפתק רגיל' : 'להפוך לרשימת משימות', function () {
      if (n.kind === 'list') { n.kind = 'note'; n.text = n.text.replace(/^\[(x| )\]\s?/gim, ''); }
      else { n.kind = 'list'; n.text = lines(n).filter(function (l) { return l.trim(); }).map(function (l) { return '[ ] ' + l.replace(/^[-•*]\s?/, ''); }).join('\n'); }
      saveNotes(); draw();
    });
    btn('📅', 'להוסיף ליומן גוגל', function () { var ww = HKWhen.parse(n.text.split('\n')[0]); chrome.tabs.create({ url: HKWhen.calendarUrl(ww, n.text) }); });
    btn('⭐', 'לשמור כטקסט מוכן להדבקה', function () { if (snips.indexOf(n.text) < 0) { snips.unshift(n.text); saveSnips(); drawSnips(); } say('נוסף לטקסטים המוכנים'); });
    btn('🗑', 'למחוק', function () {
      undo = { n: n, i: notes.indexOf(n) }; notes = notes.filter(function (x) { return x !== n; }); saveNotes(); draw();
      $('msg').textContent = ''; var u = document.createElement('button'); u.type = 'button'; u.className = 'line sm'; u.textContent = '↩ לבטל מחיקה';
      u.addEventListener('click', function () { if (undo) { notes.splice(undo.i, 0, undo.n); undo = null; saveNotes(); draw(); } $('msg').textContent = ''; });
      $('msg').appendChild(u);
    });
    d.appendChild(t);
    return d;
  }
  function draw() {
    var q = $('nt-q').value.trim().toLowerCase(), box = $('notes'); box.textContent = '';
    var list = notes.filter(function (n) { return !q || n.text.toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.at - a.at; });
    list.forEach(function (n) { box.appendChild(noteEl(n)); });
    if (!list.length) { var p = document.createElement('p'); p.className = 'empty'; p.textContent = q ? 'לא נמצא פתק.' : 'עוד אין פתקים. כותבים למעלה ושומרים.'; box.appendChild(p); }
  }
  [].forEach.call(document.querySelectorAll('[data-kind]'), function (b) {
    b.addEventListener('click', function () {
      kind = b.dataset.kind;
      [].forEach.call(document.querySelectorAll('[data-kind]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      $('nt-new').placeholder = kind === 'list' ? 'כל שורה = משימה. למשל:\nלקנות חלב\nלהתקשר לרופא' : kind === 'date' ? 'למשל: אסיפת הורים ביום שלישי ב-19:00' : 'פתק חדש… (Ctrl+Enter לשמירה)';
      $('nt-new').focus();
    });
  });
  function addNote() {
    var v = $('nt-new').value.replace(/\s+$/, ''); if (!v.trim()) return;
    if (kind === 'list') v = v.split('\n').filter(function (l) { return l.trim(); }).map(function (l) { return '[ ] ' + l.replace(/^[-•*]\s?/, ''); }).join('\n');
    notes.unshift({ id: Date.now(), text: v, kind: kind, c: kind === 'date' ? 3 : kind === 'list' ? 2 : 0, pin: false, at: Date.now() });
    saveNotes(); $('nt-new').value = ''; draw(); say('נשמר ✓');
  }
  $('nt-save').addEventListener('click', addNote);
  $('nt-new').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addNote(); } });
  $('nt-q').addEventListener('input', draw);
  $('nt-export').addEventListener('click', function () {
    var txt = '﻿' + notes.map(function (n) { var d = new Date(n.at); return '— ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + ' —\r\n' + n.text.replace(/\n/g, '\r\n'); }).join('\r\n\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); a.download = 'הפתקים שלי.txt'; document.body.appendChild(a); a.click(); a.remove();
  });

  Promise.all([chrome.storage.sync.get('snips').catch(function () { return {}; }), chrome.storage.local.get(['notes', 'snips'])]).then(function (r) {
    snips = Array.isArray(r[0].snips) ? r[0].snips : Array.isArray(r[1].snips) ? r[1].snips : DEF_SNIPS.slice();
    notes = Array.isArray(r[1].notes) ? r[1].notes : [];
    drawSnips(); draw();
  });
  // עדכון כשמשנים מחלון אחר (למשל החלון הקטן או חלון הצד)
  chrome.storage.onChanged.addListener(function (ch) {
    if (ch.snips && ch.snips.newValue) { snips = ch.snips.newValue; drawSnips(); }
    if (ch.notes && ch.notes.newValue && document.activeElement && !document.activeElement.isContentEditable) { notes = ch.notes.newValue; draw(); }
  });
})();
