// מגירת דוח המע"מ בפורטל הלקוחות של רואה החשבון. נטען אחרי cheshbon-maam.js (המנוע) ו-cheshbon-tik.js (החיבור).
// אצל הלקוח (/kelim/cheshbon/tik/ עם קישור אישי): בוחרים תקופה, מצלמים חשבוניות ומסמנים הכנסה / הוצאה / ציוד.
// אצל רואה החשבון (/kelim/cheshbon/tik/cheder/): סיכום לכל לקוח לתקופה, מי לא העלה, מה לבדוק, ZIP ואקסל.
// הקבצים עוברים ישר לגוגל דרייב של המשרד; פרטי החשבונית נשמרים בשדה "הערה" בגיליון שלו.
(function () {
  'use strict';
  var CH = window.CH, M = window.MAAM;
  if (!CH || !M) return;
  // החשבוניות של תקופה: לפי התאריך שבחשבונית, ובלי תאריך – לפי שם התקופה שנבחרה בהעלאה
  M.mine = function (all, key, freq) {
    var rg = M.range(key, freq), L = M.label(key, freq);
    var out = all.filter(function (d) { return d.drawer === M.DRAWER; }).map(function (d) {
      var r = M.decode(d.note) || M.fix({ k: 'exp', tot: d.amount || 0 }); r.doc = d; return r;
    }).filter(function (r) { return r.d ? r.d >= rg[0] && r.d <= rg[1] : (r.doc.month === L || L.indexOf(String(r.doc.month).split(' ')[0]) >= 0); });
    return M.sort(out);
  };
  M.recent = function (freq, n) { var t = CH.iso(new Date()); return M.periods(freq).filter(function (k) { return M.range(k, freq)[0] <= t; }).slice(-n).reverse(); };
})();

// =================== אצל הלקוח ===================
(function () {
  'use strict';
  var CH = window.CH, M = window.MAAM, T = window.TIK;
  var box = CH && CH.$('tik-vat');
  if (!box || !M || !T) return;
  var esc = CH.esc, TOOL = 'cheshbon_tik', info = null, docs = [], pend = null, busy = 0;
  var st = CH.load('tik-vat', null) || { freq: 2, kind: 'exp' };
  st.key = M.current(st.freq);
  function save() { CH.save('tik-vat', { freq: st.freq, kind: st.kind }); }
  function lab() { return M.label(st.key, st.freq); }
  function year() { return st.key.split('-')[0]; }
  function msg(t) { var m = CH.$('tik-vat-msg'); if (m) m.textContent = t; }

  function load() {
    var c = T.conn; if (!c) return;
    T.call(c.u, { a: 'cInfo', t: c.t, year: year() }).then(function (r) { if (r.ok) { docs = r.docs || []; render(); } }).catch(function () {});
  }
  function render() {
    var L = M.mine(docs, st.key, st.freq), o = M.calc(L), due = M.due(st.key), O = M.recent(st.freq, 6);
    if (O.indexOf(st.key) < 0) O.unshift(st.key);
    var s = '<h2>🧾 חשבוניות לדוח מע"מ</h2><p class="hint">מצלמים כל חשבונית של התקופה ומסמנים אם היא הכנסה או הוצאה. הקובץ נכנס ישר לרואה החשבון, והוא רואה את הסיכום.</p>';
    s += '<div class="tk-up"><label class="tk-m">מדווחים<select data-v-freq><option value="2"' + (st.freq === 2 ? ' selected' : '') + '>דו חודשי</option><option value="1"' + (st.freq === 1 ? ' selected' : '') + '>חודשי</option></select></label>' +
      '<label class="tk-m">תקופה<select data-v-per>' + O.map(function (k) { return '<option value="' + k + '"' + (k === st.key ? ' selected' : '') + '>' + esc(M.label(k, st.freq)) + '</option>'; }).join('') + '</select></label></div>';
    if (due) s += '<p class="hint">מועד הדיווח של ' + esc(lab()) + ': <b>' + CH.heDate(due) + '</b></p>';
    if (pend) s += card();
    else {
      s += '<div class="seg" role="group" aria-label="סוג החשבונית" data-v-kind>' + M.KINDS.map(function (k) { return '<button type="button" data-v="' + k.k + '" aria-pressed="' + (st.kind === k.k) + '">' + esc(k.t) + '</button>'; }).join('') + '</div>' +
        '<p class="hint">' + esc(M.kind(st.kind).h) + '</p>' +
        '<label class="btn btn-gold btn-sm tk-file">📷 לצלם חשבונית או לבחור קובץ<input type="file" accept="image/*,application/pdf" multiple data-v-file></label>';
    }
    if (L.length) {
      s += '<ul class="tk-files">' + L.map(function (r) {
        var w = M.checks(r, st.key, st.freq, L);
        return '<li><span><b>' + esc(M.kind(r.k).t) + '</b> · ' + esc(r.who || r.doc.name) + (r.tot ? ' · <bdi>' + CH.money(r.tot) + '</bdi>' : '') + (r.d ? ' · ' + CH.heDate(CH.date(r.d)) : '') +
          (w.length ? '<br><small class="mm-w">⚠ ' + w.map(esc).join(' · ') + '</small>' : '') + '</span><button type="button" data-v-del="' + esc(r.doc.id) + '" aria-label="למחוק את ' + esc(r.doc.name) + '">✕</button></li>';
      }).join('') + '</ul>';
      if (o.saleVat || o.inVat) s += '<div class="res">' + M.resHtml(o, 'הסיכום שלכם ל' + lab(), null) + '<p class="hint">רואה החשבון בודק וקובע את הסכום הסופי.</p></div>';
      s += '<div class="btns"><button class="btn btn-line btn-sm" type="button" data-v-done>✓ סיימתי לתקופה הזאת (' + L.length + ' חשבוניות)</button></div>';
    } else s += '<p class="hint">עוד לא העליתם חשבוניות ל' + esc(lab()) + '.</p>';
    s += '<p class="msg" id="tik-vat-msg" aria-live="polite"></p>';
    box.innerHTML = s;
  }
  function card() {
    var p = pend, r = p.r, s = '<div class="tk-ai" role="group" aria-label="פרטי החשבונית"><p class="tk-ai-f">📄 ' + esc(p.file.name || 'צילום') + ' · ' + esc(M.kind(r.k).t) + '</p>';
    if (p.stage === 'ask') return s + '<p><b>לקרוא את הסכום, התאריך והספק מהחשבונית?</b></p><p class="hint">התמונה נשלחת לקריאה אוטומטית ולא נשמרת. לפני ההעלאה בודקים את מה שנקרא.</p><div class="btns"><button class="btn btn-gold btn-sm" type="button" data-v-ai="yes">כן, לקרוא</button><button class="btn btn-line btn-sm" type="button" data-v-ai="no">לא, אכתוב בעצמי</button><button class="btn btn-line btn-sm" type="button" data-v-ai="cancel">ביטול</button></div></div>';
    if (p.stage === 'read') return s + '<p class="tk-ai-wait">קורא את החשבונית…</p></div>';
    var exp = r.k === 'exp' || r.k === 'eq';
    function f(k, l, attr) { return '<label class="tk-m' + (k === 'who' ? ' tk-m-w' : '') + '">' + l + '<input ' + attr + ' data-v-f="' + k + '" value="' + esc(r[k] == null || (k === 'vat' && r.auto) ? '' : r[k]) + '" autocomplete="off"></label>'; }
    s += (p.note ? '<p class="hint">' + esc(p.note) + '</p>' : '') + '<div class="tk-up">' +
      f('tot', 'סכום כולל מע"מ', 'type="text" inputmode="decimal" maxlength="12"') + f('d', 'תאריך', 'type="date"') +
      (r.k !== 'zero' ? f('vat', 'מע"מ (ריק = אוטומטי)', 'type="text" inputmode="decimal" maxlength="12"') : '') +
      f('who', r.k === 'sale' ? 'לקוח' : 'ספק', 'type="text" maxlength="60"') +
      (exp ? f('osek', 'ח.פ של הספק', 'type="text" inputmode="numeric" maxlength="12" dir="ltr"') : '') +
      f('no', 'מספר חשבונית', 'type="text" maxlength="20" dir="ltr"') +
      (exp ? f('hk', 'מספר הקצאה (אם יש)', 'type="text" inputmode="numeric" maxlength="9" dir="ltr"') : '') + '</div>' +
      '<p class="hint">לא חובה למלא הכול. כל פרט שתכתבו חוסך לרואה החשבון הקלדה.</p><div class="btns"><button class="btn btn-gold btn-sm" type="button" data-v-ai="up">להעלות לרואה החשבון</button><button class="btn btn-line btn-sm" type="button" data-v-ai="cancel">ביטול</button></div></div>';
    return s;
  }
  function vals() { [].forEach.call(box.querySelectorAll('[data-v-f]'), function (el) { pend.r[el.getAttribute('data-v-f')] = el.value.trim(); }); }

  function upload(list) { // [{file, r}]
    var c = T.conn, i = 0, okN = 0; busy++;
    function next() {
      if (i >= list.length) { busy--; if (okN) { CH.used(TOOL, 'vat_upload'); load(); msg((okN === 1 ? 'החשבונית עלתה' : 'עלו ' + okN + ' חשבוניות') + ' ✓ היא כבר אצל רואה החשבון.'); } return; }
      var it = list[i++], r = it.r;
      msg('מעלה ' + i + ' מתוך ' + list.length + '…');
      r.tot = CH.num(r.tot); if (!(r.tot > 0)) r.tot = 0;
      r.vat = r.vat === '' || r.vat == null ? '' : CH.num(r.vat); if (r.vat !== '' && !isFinite(r.vat)) r.vat = '';
      r.osek = String(r.osek || '').replace(/\D/g, ''); r.hk = String(r.hk || '').replace(/\D/g, '');
      if (r.tot) M.fix(r); else r.vat = 0;
      T.prep(it.file).then(function (x) {
        if (!x) { msg('לא הצלחנו לקרוא את הקובץ ' + (it.file.name || '')); return next(); }
        return T.call(c.u, { a: 'cUp', t: c.t, year: year(), drawer: M.DRAWER, month: lab(), amount: r.tot || '', note: M.encode(r), name: x.name, mime: x.mime, data: x.data })
          .then(function (res) { if (res.ok) okN++; else msg(T.err(res.err)); next(); });
      }).catch(function () { msg(T.err('net')); busy--; });
    }
    next();
  }

  box.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-v-freq]')) { st.freq = +t.value; st.key = M.current(st.freq); save(); render(); load(); }
    else if (t.matches('[data-v-per]')) { var y0 = year(); st.key = t.value; render(); if (year() !== y0) load(); }
    else if (t.matches('[data-v-file]') && t.files && t.files.length) {
      var fs = [].slice.call(t.files); t.value = '';
      if (fs.length > 1) { upload(fs.map(function (f) { return { file: f, r: { k: st.kind } }; })); return; }
      pend = { file: fs[0], r: { k: st.kind }, stage: info && info.ai && T.canRead(fs[0]) ? 'ask' : 'edit', note: '' }; render();
    }
  });
  box.addEventListener('click', function (e) {
    var kb = e.target.closest('[data-v-kind] button[data-v]');
    if (kb) { st.kind = kb.getAttribute('data-v'); save(); render(); return; }
    var a = e.target.closest('[data-v-ai]');
    if (a && pend) {
      var act = a.getAttribute('data-v-ai'), p = pend;
      if (act === 'cancel') { pend = null; render(); }
      else if (act === 'no') { p.stage = 'edit'; render(); }
      else if (act === 'up') { vals(); pend = null; render(); upload([{ file: p.file, r: p.r }]); }
      else if (act === 'yes') {
        p.stage = 'read'; render(); CH.used(TOOL, 'vat_ai_read');
        T.read(info.ai, p.file).then(function (res) {
          if (pend !== p) return; p.stage = 'edit';
          if (res.found) { var o = M.fromRead(res); Object.keys(o).forEach(function (k) { p.r[k] = o[k]; }); p.note = 'נקרא מהחשבונית. בדקו שהפרטים נכונים, ותקנו אם צריך.'; }
          else p.note = res.error === 'quota' ? 'הקריאה האוטומטית הגיעה למכסה של היום. אפשר לכתוב כאן.' : 'לא הצלחנו לקרוא את החשבונית. אפשר לכתוב כאן, או להעלות בלי.';
          render();
        }).catch(function () { if (pend !== p) return; p.stage = 'edit'; p.note = 'אין חיבור לקריאה האוטומטית. אפשר לכתוב כאן.'; render(); });
      }
      return;
    }
    var d = e.target.closest('[data-v-del]');
    if (d && !busy) {
      if (!confirm('למחוק את החשבונית מהתיק אצל רואה החשבון?')) return;
      T.call(T.conn.u, { a: 'cDel', t: T.conn.t, id: d.getAttribute('data-v-del') }).then(load);
      return;
    }
    if (e.target.closest('[data-v-done]')) {
      var n = M.mine(docs, st.key, st.freq).length;
      T.call(T.conn.u, { a: 'cVatDone', t: T.conn.t, label: lab(), n: n }).then(function (r) {
        if (r.ok) { msg('שלחנו לרואה החשבון שסיימתם את ' + lab() + ' ✓'); CH.used(TOOL, 'vat_done'); return; }
        // הקוד אצל רואה החשבון עוד בגרסה ישנה (לפני 6): הודעה בווטסאפ במקום
        var u = CH.wa('שלום, סיימתי להעלות את החשבוניות לדוח המע"מ של ' + lab() + ' (' + n + ' חשבוניות) בתיק המסמכים.');
        CH.$('tik-vat-msg').innerHTML = 'אפשר להודיע לרואה החשבון בווטסאפ: <a class="gold" href="' + esc(u) + '" target="_blank" rel="noopener">לשלוח הודעה</a>';
      }).catch(function () { msg(T.err('net')); });
    }
  });

  document.addEventListener('tik:info', function (e) {
    info = e.detail || {};
    var keys = String(info.drawers || '').split(',').filter(Boolean);
    var on = keys.length ? keys.indexOf('hotzaot') >= 0 || keys.indexOf('hachnasot') >= 0 : info.type === 'osek';
    box.hidden = !on;
    if (on && !busy) load();
  });
})();

// =================== בחדר של רואה החשבון ===================
(function () {
  'use strict';
  var CH = window.CH, M = window.MAAM, T = window.TIK;
  var box = CH && CH.$('cd-vat');
  if (!box || !M || !T) return;
  var esc = CH.esc, TOOL = 'cheshbon_tik_cheder';
  var st = { freq: CH.load('cd-vat-freq', 2) }, data = null, open = {}, loading = 0, R = [];
  st.key = M.current(st.freq);
  function cfg() { return CH.load('tik-cheder', null); }
  function lab() { return M.label(st.key, st.freq); }
  function link(c) { return 'https://hakelim.com/kelim/cheshbon/tik/#u=' + encodeURIComponent(cfg().u) + '&t=' + c.t; }
  function goWa(text) { location.href = 'https://wa.me/?text=' + encodeURIComponent(text); }

  function load() {
    var k = cfg(); if (!k) return;
    loading++; draw();
    var y = st.key.split('-')[0], no = function () { return {}; };
    Promise.all([T.call(k.u, { a: 'mClients', key: k.key }), T.call(k.u, { a: 'mDocs', key: k.key, year: y }), T.call(k.u, { a: 'mVat', key: k.key }).catch(no), T.call(k.u, { a: 'mInfo', key: k.key }).catch(no)])
      .then(function (r) {
        loading--;
        data = r[0].ok ? { clients: r[0].clients || [], docs: (r[1] && r[1].docs) || [], done: r[2] && r[2].ok ? r[2].done : [], ver: (r[3] && r[3].ver) || 1 } : { err: T.err(r[0].err) };
        draw();
      })
      .catch(function () { loading--; data = { err: T.err('net') }; draw(); });
  }
  function rows() {
    var out = [];
    data.clients.filter(function (c) { return c.on; }).forEach(function (c) {
      var L = M.mine(data.docs.filter(function (d) { return d.t === c.t; }), st.key, st.freq);
      if (c.type !== 'osek' && !L.length) return;
      var done = data.done.filter(function (x) { return x.t === c.t && x.label === lab(); }).pop();
      out.push({ c: c, L: L, o: M.calc(L), bad: L.filter(function (r) { return M.checks(r, st.key, st.freq, L).length; }).length, done: done });
    });
    return out;
  }
  function draw() {
    var O = M.recent(st.freq, 8); if (O.indexOf(st.key) < 0) O.unshift(st.key);
    var s = '<h2 id="cd-vat-h">🧾 דוח מע"מ לכל הלקוחות</h2><p class="hint">לקוחות עוסקים מעלים חשבוניות במגירת "חשבוניות לדוח מע"מ" בדף שלהם. כאן רואים לכל לקוח את התקופה: לתשלום או להחזר, מי עוד לא העלה, ומה צריך בדיקה לפני ההקלדה.</p>' +
      '<div class="tk-up"><label class="tk-m">מדווחים<select data-c-freq><option value="2"' + (st.freq === 2 ? ' selected' : '') + '>דו חודשי</option><option value="1"' + (st.freq === 1 ? ' selected' : '') + '>חודשי</option></select></label>' +
      '<label class="tk-m">תקופה<select data-c-per>' + O.map(function (k) { return '<option value="' + k + '"' + (k === st.key ? ' selected' : '') + '>' + esc(M.label(k, st.freq)) + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn btn-line btn-sm" type="button" data-c-reload>לרענן</button></div>';
    var due = M.due(st.key); if (due) s += '<p class="hint">מועד הדיווח של ' + esc(lab()) + ': <b>' + CH.heDate(due) + '</b></p>';
    R = [];
    if (loading) s += '<p class="msg">טוען מהדרייב…</p>';
    else if (data && data.err) s += '<p class="msg">' + esc(data.err) + '</p>';
    else if (data) {
      if (data.ver < 6) s += '<p class="hint">⬆ כדאי לעדכן את הקוד בגוגל לגרסה 6: מעתיקים שוב את הקוד מלמעלה, מדביקים במקום הישן ושומרים, ואז פריסה ← ניהול פריסות ← עריכה ← גרסה חדשה ← פריסה. כך הלקוחות יכולים ללחוץ "סיימתי" לכל תקופה, וה-ZIP כולל רק את התקופה.</p>';
      R = rows();
      if (!R.length) s += '<p class="hint">עוד אין לקוחות עוסקים. לקוח שנפתח כ"עוסק" רואה את מגירת המע"מ בדף שלו.</p>';
      else {
        var miss = R.filter(function (x) { return !x.L.length; });
        s += '<div class="tbl-wrap"><table class="cd-vat"><thead><tr><th>לקוח</th><th>חשבוניות</th><th>עסקאות לפני מע"מ</th><th>מע"מ עסקאות</th><th>מע"מ תשומות</th><th>לתשלום / להחזר</th></tr></thead><tbody>' + R.map(function (x, i) {
          var has = x.L.length > 0;
          var h = '<tr class="cd-vat-row ' + (!has ? '' : x.bad ? 'is-bad' : 'is-ok') + '"><td><button type="button" class="cd-vlink" data-c-open="' + i + '" aria-expanded="' + !!open[x.c.t] + '">' + esc(x.c.name) + '</button>' +
            (x.done ? ' <span class="badge-done">✓ סיים</span>' : '') + (x.bad ? ' <span class="warn">⚠ ' + x.bad + ' לבדוק</span>' : '') + '</td>' +
            '<td class="n">' + (has ? x.L.length : '<span class="hint">עוד לא העלה</span>') + '</td>' +
            '<td class="n">' + (has ? CH.money(x.o.saleNet) : '') + '</td><td class="n">' + (has ? CH.money(x.o.saleVat) : '') + '</td><td class="n">' + (has ? CH.money(x.o.inVat) : '') + '</td>' +
            '<td class="n ' + (x.o.pay >= 0 ? 'pay' : 'ref') + '">' + (has ? (x.o.pay >= 0 ? '' : 'החזר ') + CH.money(Math.abs(x.o.pay)) : '') + '</td></tr>';
          if (open[x.c.t]) {
            h += '<tr><td colspan="6">' + (has ? '<ul class="tk-files">' + x.L.map(function (r) {
              var w = M.checks(r, st.key, st.freq, x.L);
              return '<li><span><b>' + esc(M.kind(r.k).t) + '</b> · <a class="gold" href="' + esc(r.doc.url) + '" target="_blank" rel="noopener">' + esc(r.who || r.doc.name) + '</a>' + (r.no ? ' #' + esc(r.no) : '') +
                (r.osek ? ' · ח.פ ' + esc(r.osek) : '') + (r.d ? ' · ' + CH.heDate(CH.date(r.d)) : '') + ' · <bdi>' + CH.money(r.tot) + '</bdi> (מע"מ ' + CH.money(r.vat) + ')' +
                (w.length ? '<br><small class="mm-w">⚠ ' + w.map(esc).join(' · ') + '</small>' : '') + '</span></li>';
            }).join('') + '</ul>' : '') +
              '<div class="btns">' + (has ? '<button class="btn btn-gold btn-sm" type="button" data-c-zip="' + i + '">📦 ZIP של התקופה</button><button class="btn btn-line btn-sm" type="button" data-c-sum="' + i + '">סיכום ללקוח בווטסאפ</button>' : '') +
              '<button class="btn btn-line btn-sm" type="button" data-c-rem="' + i + '">תזכורת בווטסאפ</button></div><p class="msg" id="cd-vm-' + i + '"></p></td></tr>';
          }
          return h;
        }).join('') + '</tbody></table></div>';
        if (miss.length) s += '<p class="hint">עוד לא העלו ל' + esc(lab()) + ': ' + miss.map(function (x) { return esc(x.c.name); }).join(', ') + '.</p>';
        s += '<div class="btns"><button class="btn btn-gold btn-sm" type="button" data-c-csv>⬇ כל החשבוניות של התקופה לאקסל</button></div>';
      }
    }
    box.innerHTML = s;
  }

  box.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-c-freq]')) { st.freq = +t.value; CH.save('cd-vat-freq', st.freq); st.key = M.current(st.freq); load(); }
    else if (t.matches('[data-c-per]')) { var y0 = st.key.split('-')[0]; st.key = t.value; if (st.key.split('-')[0] !== y0) load(); else draw(); }
  });
  box.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var x;
    if (b.hasAttribute('data-c-reload')) load();
    else if (b.hasAttribute('data-c-open')) { x = R[+b.getAttribute('data-c-open')]; open[x.c.t] = !open[x.c.t]; draw(); }
    else if (b.hasAttribute('data-c-rem')) {
      x = R[+b.getAttribute('data-c-rem')]; CH.used(TOOL, 'vat_remind');
      var due = M.due(st.key);
      goWa('שלום ' + x.c.name + ', תזכורת לדוח המע"מ של ' + lab() + (due ? ' (מועד הדיווח ' + CH.heDate(due) + ')' : '') + '.\n' + (x.L.length ? 'קיבלתי ' + x.L.length + ' חשבוניות. אם יש עוד, ' : '') +
        'מצלמים כל חשבונית במגירת "חשבוניות לדוח מע"מ" ומסמנים הכנסה או הוצאה:\n' + link(x.c) + '\nתודה!\n' + (cfg().office || ''));
    }
    else if (b.hasAttribute('data-c-sum')) { x = R[+b.getAttribute('data-c-sum')]; CH.used(TOOL, 'vat_summary'); goWa('שלום ' + x.c.name + ',\n' + M.text(x.o, lab(), M.due(st.key)) + '\n\n' + (cfg().office || '')); }
    else if (b.hasAttribute('data-c-zip')) {
      var i = +b.getAttribute('data-c-zip'), m = CH.$('cd-vm-' + i); x = R[i]; m.textContent = 'אורז את החשבוניות…';
      T.call(cfg().u, { a: 'mBundle', key: cfg().key, t: x.c.t, year: st.key.split('-')[0], ids: x.L.map(function (r) { return r.doc.id; }), label: 'מעמ ' + lab() }).then(function (r) {
        m.innerHTML = r.ok ? 'מוכן (' + r.files + ' קבצים' + (r.sel ? '' : ', כל השנה – הקוד בגוגל בגרסה ישנה') + '): <a class="gold" href="' + esc(r.url) + '" target="_blank" rel="noopener">לפתוח בדרייב ולהוריד</a>' : esc(T.err(r.err));
        if (r.ok) CH.used(TOOL, 'vat_zip');
      }).catch(function () { m.textContent = T.err('net'); });
    }
    else if (b.hasAttribute('data-c-csv')) {
      var out = [['לקוח'].concat(M.HEAD).concat(['קישור'])];
      R.forEach(function (y) { y.L.forEach(function (r) { out.push([y.c.name].concat(M.row(r, M.checks(r, st.key, st.freq, y.L))).concat([r.doc.url])); }); });
      out.push([]); out.push(['לקוח', 'עסקאות לפני מע"מ', 'מע"מ עסקאות', 'פטורות / אפס', 'מע"מ תשומות ציוד', 'מע"מ תשומות אחרות', 'לתשלום (+) / להחזר (-)', 'חשבוניות']);
      R.forEach(function (y) { if (y.L.length) out.push([y.c.name, y.o.saleNet, y.o.saleVat, y.o.zeroNet, y.o.eqVat, y.o.expVat, y.o.pay, y.L.length]); });
      CH.csv('דוח-מעמ-' + lab().replace(/\s+/g, '-') + '-כל-הלקוחות.csv', out); CH.used(TOOL, 'vat_csv');
    }
  });
  document.addEventListener('cheder:on', function () { box.hidden = false; load(); });
  document.addEventListener('cheder:off', function () { box.hidden = true; data = null; });
})();
