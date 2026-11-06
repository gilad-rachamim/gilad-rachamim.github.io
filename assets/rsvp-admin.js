// אישורי הגעה – לוח המעקב להורים (/mohel/hazmana/m/) ודף ההדפסה עם QR (/mohel/hazmana/p/).
// נשען על window.__hz מ-assets/hazmana.js (ציור, נוסחים, API).
(function () {
  'use strict';
  var H = window.__hz;
  if (!H) return;
  function $(s, r) { return (r || document).querySelector(s); }
  var q = new URLSearchParams(location.search), eid = q.get('e') || '', tok = q.get('t') || '';
  var ev = H.ev;

  // טלפון ישראלי → wa.me (0501234567 → 972501234567)
  function waNum(p) {
    p = (p || '').replace(/[^\d+]/g, '');
    if (!p) return '';
    if (p.charAt(0) === '+') p = p.slice(1);
    if (p.indexOf('00') === 0) p = p.slice(2);
    if (p.charAt(0) === '0') p = '972' + p.slice(1);
    return /^\d{9,15}$/.test(p) ? p : '';
  }
  function waLink(p, text) { var n = waNum(p); return 'https://wa.me/' + (n ? n : '') + '?text=' + encodeURIComponent(text); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // =========================================================
  // דף ההדפסה
  // =========================================================
  var sheet = $('#p-sheet');
  if (sheet) {
    if (!eid) { $('#p-err').textContent = 'הקישור לא שלם.'; $('#p-err').hidden = false; return; }
    H.api('/ev/' + encodeURIComponent(eid)).then(function (j) {
      var url = H.shortUrl(eid);
      H.fontsReady.then(function () { H.draw($('#p-canvas'), j.d); });
      $('#p-url').textContent = url.replace(/^https?:\/\//, '');
      if (window.QRCode) new window.QRCode($('#p-qr'), { text: url, width: 512, height: 512, correctLevel: window.QRCode.CorrectLevel.M });
      sheet.hidden = false;
      document.title = H.kindOf(j.d).name + ' – להדפסה';
      $('#p-canvas').setAttribute('aria-label', 'ההודעה על ' + H.kindOf(j.d).full);
    }, function (e) { $('#p-err').textContent = e.message; $('#p-err').hidden = false; });
    $('#p-print').addEventListener('click', function () { ev('rsvp_print'); window.print(); });
    return;
  }

  // =========================================================
  // לוח המעקב
  // =========================================================
  var main = $('#m-main');
  if (!main) return;
  var state = null, filter = 'all', remind = 'ask';
  function fail(msg) { $('#m-loading').hidden = true; $('#m-err').textContent = msg; $('#m-err').hidden = false; }
  if (!eid || !tok) { fail('הקישור ללוח לא שלם. פתחו אותו מהכפתור "ללוח המעקב שלי" במחולל ההזמנות.'); return; }
  var adminQ = '?t=' + encodeURIComponent(tok);
  function load() {
    return H.api('/ev/' + encodeURIComponent(eid) + '/admin' + adminQ).then(function (j) {
      state = j; $('#m-loading').hidden = true; main.hidden = false; render();
    }, function (e) { fail(e.message || 'לא הצלחנו לטעון את הלוח.'); });
  }

  // שורה לכל מוזמן ברשימה + שורה לכל תשובה חופשית מהקישור הכללי
  function rows() {
    var out = [], g = state.guests, a = state.answers;
    Object.keys(g).forEach(function (id) { out.push({ id: id, n: g[id].n, p: g[id].p, a: a[id] || null, personal: true }); });
    Object.keys(a).forEach(function (id) { if (!g[id]) out.push({ id: id, n: a[id].n, p: '', a: a[id], personal: false }); });
    out.sort(function (x, y) { return st(x) === st(y) ? x.n.localeCompare(y.n, 'he') : order[st(x)] - order[st(y)]; });
    return out;
  }
  var order = { none: 0, yes: 1, no: 2 };
  function st(r) { return r.a ? (r.a.ok ? 'yes' : 'no') : 'none'; }

  function remText(r) {
    var d = state.d, sign = H.signText(d), first = r.n, K = H.kindOf(d); // השם כמו שההורים כתבו אותו ("סבתא רחל", "משפחת לוי")
    if (remind === 'tomorrow') {
      return 'שלום ' + first + ', מחכים לכם מחר ב' + K.full.replace(/^ה/, '') + '! 🎉\n' + H.timeText(d) + ', ' + H.placeQuery(d) + '.\nניווט: ' + H.wazeUrl(d) + (sign ? '\n\n' + sign : '');
    }
    return 'שלום ' + first + '! בעזרת ה׳ ' + K.full + ' ' + H.whenText(d) + ', ' + H.timeText(d) + ', ' + H.placeQuery(d) + '.\nנשמח לדעת אם תגיעו, בלחיצה כאן: ' + (r.personal ? H.shortUrl(eid, r.id) : H.shortUrl(eid)) + ' 🙏' + (sign ? '\n\n' + sign : '');
  }

  function render() {
    var rs = rows(), yes = 0, fam = 0, no = 0, none = 0;
    rs.forEach(function (r) { var s = st(r); if (s === 'yes') { yes += r.a.c || 1; fam++; } else if (s === 'no') no++; else none++; });
    $('#s-yes').textContent = yes; $('#s-fam').textContent = fam; $('#s-no').textContent = no; $('#s-none').textContent = none;
    document.querySelectorAll('#m-stats .stat').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-f') === filter); });
    document.querySelectorAll('#m-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === filter ? 'true' : 'false'); });
    var sign = H.signText(state.d), K = H.kindOf(state.d);
    $('#m-sub').textContent = K.full + ' ' + H.whenText(state.d) + (sign ? ' · ' + sign : '');
    document.title = 'לוח המעקב – אישורי הגעה ל' + K.name;
    $('#m-rem-tomorrow').textContent = 'למי שאישר: "מחר ' + K.the + '" עם Waze';
    $('#m-bl-note').textContent = 'מה שהאורחים כתבו לכם, באישור ההגעה או אחרי ' + K.the + '.';
    $('#m-bl-h').textContent = 'ברכות ' + K.baby;
    var url = H.shortUrl(eid);
    $('#m-short').textContent = url.replace(/^https?:\/\//, '');
    $('#m-wa').href = 'https://wa.me/?text=' + encodeURIComponent(H.waText(state.d));
    $('#m-print').href = '/mohel/hazmana/p/?e=' + encodeURIComponent(eid);
    renderGift(); renderBrachot();
    var list = $('#m-list'); list.innerHTML = '';
    var shown = rs.filter(function (r) { return filter === 'all' || (filter === 'fam' ? st(r) === 'yes' : st(r) === filter); });
    $('#m-empty').hidden = shown.length > 0 || rs.length > 0;
    if (!shown.length && rs.length) { $('#m-empty').hidden = false; $('#m-empty').textContent = 'אין אף אחד בסינון הזה.'; }
    else $('#m-empty').textContent = 'עוד אין כאן אף אחד. הוסיפו מוזמנים, או שלחו את הקישור הכללי.';
    shown.forEach(function (r) {
      var s = st(r), li = document.createElement('li'); li.className = 'hz-row';
      var chip = s === 'yes' ? '<span class="chip yes">מגיעים' + (r.a.c > 1 ? ' · ' + r.a.c : '') + '</span>' : s === 'no' ? '<span class="chip no">לא מגיעים</span>' : '<span class="chip none">עוד לא ענו</span>';
      var meta = [];
      if (r.a && r.a.note) meta.push('„' + esc(r.a.note) + '”');
      if (!r.personal) meta.push('ענו מהקישור הכללי');
      else if (r.p) meta.push('<span dir="ltr">' + esc(r.p) + '</span>');
      var showRem = remind === 'ask' ? s === 'none' : s === 'yes';
      var acts = '';
      if (showRem && (r.personal || remind === 'tomorrow')) acts += '<a class="btn btn-gold" data-rem="' + r.id + '" href="' + esc(waLink(r.p, remText(r))) + '" target="_blank" rel="noopener">' + (remind === 'ask' ? 'תזכורת בווטסאפ' : '"מחר ' + K.the + '" בווטסאפ') + '</a>';
      if (r.personal) acts += '<button class="btn btn-line" type="button" data-link="' + r.id + '">הקישור האישי</button>';
      acts += '<button class="btn btn-line" type="button" data-del="' + r.id + '" aria-label="הסרה">✕</button>';
      li.innerHTML = '<span class="who">' + esc(r.n) + '</span>' + chip + (meta.length ? '<span class="meta">' + meta.join(' · ') + '</span>' : '') + '<span class="acts">' + acts + '</span>';
      list.appendChild(li);
    });
  }

  // ---------- מתנה להורים וברכות ----------
  var giftShown = null;
  function renderGift() {
    if (giftShown === state.gift) return; // לא לדרוס מה שההורה מקליד
    giftShown = state.gift || '';
    $('#m-gift').value = giftShown; $('#m-gift-del').hidden = !giftShown;
  }
  function renderBrachot() {
    var all = [], ul = $('#m-bl');
    Object.keys(state.answers).forEach(function (id) { var a = state.answers[id]; if (a.bl) all.push({ n: a.n, bl: a.bl, ts: a.ts }); });
    Object.keys(state.brachot || {}).forEach(function (id) { var b = state.brachot[id]; all.push({ n: b.n, bl: b.bl, ts: b.ts }); });
    all.sort(function (x, y) { return (y.ts || '').localeCompare(x.ts || ''); });
    ul.innerHTML = all.map(function (b) { return '<li><q>' + esc(b.bl) + '</q><small>' + esc(b.n) + '</small></li>'; }).join('');
    $('#m-bl-empty').hidden = all.length > 0;
  }
  function saveGift(url) {
    var msg = $('#m-gift-msg'), btn = $('#m-gift-save'); btn.disabled = true; msg.hidden = true;
    H.api('/ev/' + encodeURIComponent(eid) + '/gift' + adminQ, { url: url }).then(function (j) {
      state.gift = j.gift || ''; giftShown = null; renderGift();
      msg.textContent = j.gift ? 'נשמר. הכפתור "מתנה להורים" מופיע עכשיו בדף ההודעה.' : 'הכפתור הוסר מדף ההודעה.'; msg.className = 'note small'; msg.hidden = false;
      ev('rsvp_gift_set', { on: j.gift ? 1 : 0 });
    }, function (e) { msg.textContent = e.message; msg.className = 'note small hz-err'; msg.hidden = false; }).then(function () { btn.disabled = false; });
  }
  $('#m-gift-save').addEventListener('click', function () { var v = $('#m-gift').value.trim(); if (!v) { $('#m-gift').focus(); return; } saveGift(v); });
  $('#m-gift-del').addEventListener('click', function () { if (confirm('להסיר את כפתור המתנה מדף ההודעה?')) saveGift(''); });

  // ---------- הוספת מוזמנים ----------
  function parseLines(text) {
    var out = [];
    text.split(/\r?\n/).forEach(function (line) {
      line = line.trim(); if (!line) return;
      var m = line.match(/(\+?\d[\d\s\-()]{7,}\d)/);
      var p = m ? m[1] : '', n = line.replace(p, '').replace(/[,\t;:|]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (n.length >= 2) out.push({ n: n, p: p.replace(/[^\d+]/g, '') });
    });
    return out;
  }
  function addGuests(add) {
    if (!add.length) return Promise.resolve();
    var btn = $('#m-add'); btn.disabled = true; btn.textContent = 'מוסיף…';
    return H.api('/ev/' + encodeURIComponent(eid) + '/guests' + adminQ, { add: add }).then(function (j) {
      state.guests = j.guests; $('#m-paste').value = ''; render(); ev('rsvp_guests_add', { count: add.length });
    }, function (e) { alert(e.message); }).then(function () { btn.disabled = false; btn.textContent = 'הוספה לרשימה'; });
  }
  $('#m-add').addEventListener('click', function () {
    var add = parseLines($('#m-paste').value);
    if (!add.length) { $('#m-paste').focus(); return; }
    addGuests(add);
  });
  if (navigator.contacts && navigator.contacts.select) {
    $('#m-pick').hidden = false;
    $('#m-pick').addEventListener('click', function () {
      navigator.contacts.select(['name', 'tel'], { multiple: true }).then(function (cs) {
        addGuests(cs.map(function (c) { return { n: (c.name || [])[0] || '', p: ((c.tel || [])[0] || '').replace(/[^\d+]/g, '') }; }).filter(function (g) { return g.n.length >= 2; }));
      }).catch(function () {});
    });
  }

  // ---------- לחיצות ברשימה ----------
  $('#m-list').addEventListener('click', function (e) {
    var t = e.target.closest('[data-rem],[data-link],[data-del]'); if (!t) return;
    if (t.hasAttribute('data-rem')) { ev('rsvp_reminder', { kind: remind }); return; }
    var id = t.getAttribute('data-link') || t.getAttribute('data-del');
    if (t.hasAttribute('data-link')) { H.copy(H.shortUrl(eid, id), t); return; }
    var r = rows().filter(function (x) { return x.id === id; })[0];
    if (!r || !confirm('להסיר את ' + r.n + ' מהרשימה?')) return;
    H.api('/ev/' + encodeURIComponent(eid) + '/guests' + adminQ, { del: [id] }).then(function (j) { state.guests = j.guests; delete state.answers[id]; render(); }, function (err) { alert(err.message); });
  });
  document.querySelectorAll('#m-tabs button, #m-stats .stat').forEach(function (b) {
    b.addEventListener('click', function () { filter = b.getAttribute('data-f'); render(); });
  });
  document.querySelectorAll('#m-rem button').forEach(function (b) {
    b.addEventListener('click', function () {
      remind = b.getAttribute('data-r');
      document.querySelectorAll('#m-rem button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      filter = remind === 'ask' ? 'none' : 'yes';
      render();
      $('#m-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  $('#m-short-copy').addEventListener('click', function (e) { H.copy(H.shortUrl(eid), e.currentTarget); });
  $('#m-copy-admin').addEventListener('click', function (e) { H.copy(location.href, e.currentTarget); });
  $('#m-delete').addEventListener('click', function () {
    if (!confirm('למחוק עכשיו את כל הנתונים: הרשימה, התשובות והקישור הקצר? אי אפשר לשחזר.')) return;
    H.api('/ev/' + encodeURIComponent(eid) + '/delete' + adminQ, {}).then(function () {
      try { localStorage.removeItem('mohel-hazmana-ev'); } catch (e) {}
      main.hidden = true; fail('הנתונים נמחקו. ההודעה עצמה עדיין שמורה במחולל, ואפשר ליצור קישור חדש.');
    }, function (e) { alert(e.message); });
  });

  ev('rsvp_dashboard', { from: 'page' });
  load();
})();
