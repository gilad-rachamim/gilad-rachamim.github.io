// חדר לרואה חשבון (/kelim/cheshbon/tik/cheder/): התקנה, לקוחות, קישור אישי לכל לקוח וטבלה שנתית.
// החיבור (כתובת הקוד + מפתח המשרד) נשמר רק בדפדפן הזה. הקבצים והטבלה – בגוגל דרייב של המשרד.
// קישורי הלקוחות לא עוברים דרך מקצר הקישורים של האתר: הם נשלחים בהעברה ישירה (location) ובהעתקה ישנה.
(function () {
  'use strict';
  var root = document.getElementById('cheder');
  if (!root || !window.TIK) return;
  var CH = window.CH, T = window.TIK, $ = CH.$, esc = CH.esc;
  var KEY = 'tik-cheder';
  var cfg = CH.load(KEY, null); // {u, key, office, sheet, folder}
  var clients = [], docs = [], year = new Date().getFullYear(), open = {};

  function msg(t) { $('cd-msg').textContent = t || ''; }
  function link(c) { return 'https://hakelim.com/kelim/cheshbon/tik/#u=' + encodeURIComponent(cfg.u) + '&t=' + c.t; }
  function copyRaw(text, el) { // בלי navigator.clipboard, כדי שהקישור לא יקוצר בשרת של האתר
    var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); if (el) { el.textContent = 'הקישור הועתק ✓'; } } catch (e) {} ta.remove();
  }
  function invite(c) {
    return 'שלום ' + c.name + ',\nפתחתי לך תיק מסמכים אישי לדוח השנתי. מצלמים כל קבלה ומסמך כשהם מגיעים, והם נכנסים ישר אליי למשרד:\n' + link(c) + '\n\nהקישור אישי, לא להעביר אותו לאחרים.\n' + (cfg.office || '');
  }
  function remind(c) {
    var L = T.forClient(c), mine = docs.filter(function (d) { return d.t === c.t; });
    var miss = L.filter(function (d) { return !mine.some(function (x) { return x.drawer === d.t; }); });
    return 'שלום ' + c.name + ', תזכורת קטנה לדוח ' + year + '. עוד לא הגיעו אליי:\n' + miss.map(function (d) { return '☐ ' + d.t; }).join('\n') + '\n\nמעלים כאן: ' + link(c) + '\nתודה!\n' + (cfg.office || '');
  }
  function goWa(text) { location.href = 'https://wa.me/?text=' + encodeURIComponent(text); }

  function show() {
    var on = !!cfg;
    $('cd-setup').hidden = on; $('cd-room').hidden = !on;
    if (!on) return;
    $('cd-office').textContent = cfg.office || 'המשרד';
    $('cd-links').innerHTML = (cfg.sheet ? '<a class="gold" href="' + esc(cfg.sheet) + '" target="_blank" rel="noopener">הטבלה בגוגל שיטס</a> · ' : '') + (cfg.folder ? '<a class="gold" href="' + esc(cfg.folder) + '" target="_blank" rel="noopener">התיקייה בדרייב</a>' : '');
    $('cd-year').innerHTML = [year + 1, year, year - 1, year - 2].filter(function (y) { return y <= new Date().getFullYear(); }).map(function (y) { return '<button type="button" data-v="' + y + '" aria-pressed="' + (y === year) + '">' + y + '</button>'; }).join('');
    refresh(); office();
  }

  function refresh() {
    msg('טוען מהדרייב…');
    Promise.all([T.call(cfg.u, { a: 'mClients', key: cfg.key }), T.call(cfg.u, { a: 'mDocs', key: cfg.key, year: year })]).then(function (r) {
      if (!r[0].ok) { msg(T.err(r[0].err)); return; }
      clients = r[0].clients || []; docs = (r[1] && r[1].docs) || []; msg(''); table();
    }).catch(function () { msg(T.err('net')); });
  }

  function table() {
    var act = clients.filter(function (c) { return c.on; });
    if (!act.length) { $('cd-table').innerHTML = '<p class="hint">עוד אין לקוחות. מוסיפים לקוח למעלה, ושולחים לו את הקישור בווטסאפ.</p>'; return; }
    var P = isPartner();
    $('cd-table').innerHTML = act.map(function (c, i) {
      var L = T.forClient(c), mine = docs.filter(function (d) { return d.t === c.t; });
      var have = L.filter(function (d) { return mine.some(function (x) { return x.drawer === d.t; }); }).length;
      var sum = mine.reduce(function (s, d) { return s + (d.amount === '' ? 0 : +d.amount); }, 0);
      var hashes = {}; mine.forEach(function (d) { if (d.hash) hashes[d.hash] = (hashes[d.hash] || 0) + 1; });
      var s = '<div class="cd-c' + (open[c.t] ? ' is-open' : '') + '"><button type="button" class="cd-h" data-open="' + c.t + '" aria-expanded="' + !!open[c.t] + '"><b>' + esc(c.name) + (c.done ? '<span class="badge-done">✓ סיים להעלות</span>' : '') + '</b><span>' + (c.type === 'osek' ? 'עוסק' : 'שכיר / פרטי') + ' · ' + mine.length + ' קבצים · ' + have + '/' + L.length + ' מגירות</span><span class="tk-bar"><i style="width:' + Math.round(100 * have / L.length) + '%"></i></span></button>';
      if (open[c.t]) {
        s += '<div class="cd-body"><div class="btns"><button class="btn btn-gold btn-sm" type="button" data-inv="' + i + '">שליחת הקישור בווטסאפ</button><button class="btn btn-line btn-sm" type="button" data-rem="' + i + '">תזכורת על מה שחסר</button><button class="btn btn-line btn-sm" type="button" data-cp="' + i + '">להעתיק קישור</button><button class="btn btn-line btn-sm" type="button" data-off="' + i + '">לסגור את התיק</button></div><p class="msg" id="cd-cpm-' + i + '"></p>';
        s += '<div class="tbl-wrap"><table><thead><tr><th>מגירה</th><th>קבצים</th><th>סכום</th></tr></thead><tbody>' + L.map(function (d) {
          var f = mine.filter(function (x) { return x.drawer === d.t; }), a = f.reduce(function (s2, x) { return s2 + (x.amount === '' ? 0 : +x.amount); }, 0);
          return '<tr class="' + (f.length ? 'is-ok' : '') + '"><td>' + esc(d.t) + '</td><td>' + (f.length ? f.map(function (x) { return '<a class="gold" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.name) + '</a>' + (x.hash && hashes[x.hash] > 1 ? ' <span class="warn">⚠ כפול</span>' : ''); }).join('<br>') : '<span class="hint">חסר</span>') + '</td><td class="n">' + (a ? CH.money(a) : '') + '</td></tr>';
        }).join('') + (sum ? '<tr><td><b>סה"כ סכומים שהלקוח רשם</b></td><td></td><td class="n"><b>' + CH.money(sum) + '</b></td></tr>' : '') + '</tbody></table></div>' + adv(c, i, P) + '</div>';
      }
      return s + '</div>';
    }).join('');
  }

  // ---- כלים מתקדמים לכל לקוח (לשותפים) ----
  function adv(c, i, P) {
    if (!P) return '<p class="hint cd-adv">🤝 לשותפים במיזם: מייל ללקוח ותזכורות אוטומטיות, מגירות אישיות ובקשות מיוחדות, תיק מלא בלחיצה, ומסמכים לחתימה. <a class="gold" href="#cd-partner-h">פרטים למטה</a></p>';
    var keys = String(c.drawers || '').split(',').filter(Boolean), def = T.list(c.type).map(function (d) { return d.k; });
    return '<div class="cd-adv"><h3>הגדרות ללקוח</h3>' +
      '<div class="field"><label for="cd-em-' + i + '">המייל של הלקוח (לתזכורות)</label><input id="cd-em-' + i + '" type="email" dir="ltr" value="' + esc(c.email || '') + '" autocomplete="off"></div>' +
      '<p class="hint">המגירות שהלקוח רואה:</p><div class="chips" id="cd-dr-' + i + '">' + T.DRAWERS.map(function (d) { var on = keys.length ? keys.indexOf(d.k) >= 0 : def.indexOf(d.k) >= 0; return '<label><input type="checkbox" value="' + d.k + '"' + (on ? ' checked' : '') + '> ' + esc(d.t) + '</label>'; }).join('') + '</div>' +
      '<div class="field"><label for="cd-rq-' + i + '">בקשות מיוחדות, שורה לכל אחת (למשל: אישור מהמעסיק השני)</label><textarea id="cd-rq-' + i + '">' + esc(c.requests || '') + '</textarea></div>' +
      '<div class="btns"><button class="btn btn-gold btn-sm" type="button" data-save="' + i + '">לשמור הגדרות</button>' + (c.email ? '<button class="btn btn-line btn-sm" type="button" data-mail="' + i + '">לשלוח עכשיו תזכורת במייל</button>' : '') +
      '<button class="btn btn-line btn-sm" type="button" data-zip="' + i + '">📦 תיק מלא (ZIP) לשנת ' + year + '</button>' + (c.done ? '<button class="btn btn-line btn-sm" type="button" data-undone="' + i + '">לפתוח את התיק מחדש</button>' : '') + '</div>' +
      '<p class="hint">מסמך לחתימה (ייפוי כוח, טופס): הלקוח יראה אותו בדף שלו, יוריד, יחתום ויעלה בחזרה.</p><label class="btn btn-line btn-sm tk-file">📝 להעלות מסמך לחתימה<input type="file" accept="application/pdf,image/*" data-attach="' + i + '"></label>' +
      '<p class="msg" id="cd-am-' + i + '"></p></div>';
  }
  function isPartner() { try { return /^\d{3}-?\d{5}$/.test((localStorage.getItem('kelim-partner') || '').replace(/\s/g, '')); } catch (e) { return false; } }

  root.addEventListener('change', function (e) {
    var inp = e.target.closest('[data-attach]'); if (!inp || !inp.files || !inp.files[0]) return;
    var i = +inp.getAttribute('data-attach'), c = clients.filter(function (x) { return x.on; })[i], m = $('cd-am-' + i);
    m.textContent = 'מעלה…';
    T.prep(inp.files[0]).then(function (x) {
      return T.call(cfg.u, { a: 'mAttach', key: cfg.key, t: c.t, name: x.name, mime: x.mime, data: x.data });
    }).then(function (r) { m.textContent = r.ok ? 'נוסף ✓ הלקוח יראה אותו בדף שלו.' : T.err(r.err); if (r.ok) CH.used('cheshbon_tik_cheder', 'attach'); })
      .catch(function () { m.textContent = T.err('net'); });
    inp.value = '';
  });

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var act = clients.filter(function (c) { return c.on; });
    if (b.hasAttribute('data-open')) { var t = b.getAttribute('data-open'); open[t] = !open[t]; table(); }
    else if (b.hasAttribute('data-inv')) { CH.used('cheshbon_tik_cheder', 'invite'); goWa(invite(act[+b.getAttribute('data-inv')])); }
    else if (b.hasAttribute('data-rem')) { CH.used('cheshbon_tik_cheder', 'remind'); goWa(remind(act[+b.getAttribute('data-rem')])); }
    else if (b.hasAttribute('data-cp')) { var i = +b.getAttribute('data-cp'); copyRaw(link(act[i]), $('cd-cpm-' + i)); }
    else if (b.hasAttribute('data-save')) {
      var si = +b.getAttribute('data-save'), sc = act[si], sm = $('cd-am-' + si);
      var drs = [].slice.call($('cd-dr-' + si).querySelectorAll('input:checked')).map(function (x) { return x.value; });
      var def = T.list(sc.type).map(function (d) { return d.k; });
      var same = drs.length === def.length && drs.every(function (k) { return def.indexOf(k) >= 0; });
      var upd = { a: 'mClient', key: cfg.key, t: sc.t, email: $('cd-em-' + si).value.trim(), drawers: same ? '' : drs.join(','), requests: $('cd-rq-' + si).value };
      sm.textContent = 'שומר…';
      T.call(cfg.u, upd).then(function (r) { if (!r.ok) { sm.textContent = T.err(r.err); return; } CH.used('cheshbon_tik_cheder', 'settings'); refresh(); }).catch(function () { sm.textContent = T.err('net'); });
    }
    else if (b.hasAttribute('data-mail')) {
      var mi = +b.getAttribute('data-mail'), mm = $('cd-am-' + mi); mm.textContent = 'שולח…';
      T.call(cfg.u, { a: 'mRemindNow', key: cfg.key, t: act[mi].t }).then(function (r) { mm.textContent = r.ok ? (r.sent ? 'נשלח מייל ✓' : 'לא נשלח: חסר מייל, או שאין מה להזכיר.') : T.err(r.err); }).catch(function () { mm.textContent = T.err('net'); });
    }
    else if (b.hasAttribute('data-zip')) {
      var zi = +b.getAttribute('data-zip'), zm = $('cd-am-' + zi); zm.textContent = 'אורז את התיק…';
      T.call(cfg.u, { a: 'mBundle', key: cfg.key, t: act[zi].t, year: year }).then(function (r) {
        zm.innerHTML = r.ok ? 'התיק מוכן (' + r.files + ' קבצים): <a class="gold" href="' + esc(r.url) + '" target="_blank" rel="noopener">לפתוח בדרייב ולהוריד</a>' : esc(T.err(r.err));
        if (r.ok) CH.used('cheshbon_tik_cheder', 'zip');
      }).catch(function () { zm.textContent = T.err('net'); });
    }
    else if (b.hasAttribute('data-undone')) {
      T.call(cfg.u, { a: 'mUndone', key: cfg.key, t: act[+b.getAttribute('data-undone')].t }).then(refresh);
    }
    else if (b.hasAttribute('data-off')) {
      var c = act[+b.getAttribute('data-off')];
      if (!confirm('לסגור את התיק של ' + c.name + '? הקישור שלו יפסיק לעבוד. הקבצים נשארים בדרייב.')) return;
      T.call(cfg.u, { a: 'mClient', key: cfg.key, t: c.t, on: false }).then(refresh);
    }
  });

  CH.seg($('cd-year'), function (v) { year = +v; refresh(); });

  // ---- כלים למשרד כולו (לשותפים): גרסת הקוד, תזכורות חודשיות, ייבוא מאקסל ----
  function office() {
    var P = isPartner();
    $('cd-office-adv').hidden = !P;
    if (!cfg) return;
    T.call(cfg.u, { a: 'mInfo', key: cfg.key }).then(function (r) {
      if (!r.ok) return;
      var old = (r.ver || 1) < 5;
      $('cd-upgrade').hidden = !old;
      $('cd-remind').checked = !!r.remind; $('cd-remind').disabled = (r.ver || 1) < 4;
    }).catch(function () {});
  }
  $('cd-remind').addEventListener('change', function () {
    var on = this.checked, m = $('cd-om');
    m.textContent = 'מעדכן…';
    T.call(cfg.u, { a: 'mRemind', key: cfg.key, on: on }).then(function (r) {
      m.textContent = r.ok ? (r.remind ? 'פועל ✓ ב-1 לכל חודש, ב-10:00, יוצא מייל לכל לקוח שחסר לו משהו (רק למי שיש מייל ועוד לא סיים).' : 'התזכורות כבויות.') : T.err(r.err);
      if (r.ok) CH.used('cheshbon_tik_cheder', 'auto_remind');
    }).catch(function () { m.textContent = T.err('net'); });
  });
  $('cd-import').addEventListener('click', function () {
    var rows = CH.rows($('cd-paste').value), m = $('cd-om');
    var list = rows.map(function (r) {
      var email = (r.filter(function (x) { return /@/.test(x); })[0] || '').trim();
      var type = r.some(function (x) { return /עוסק|osek/i.test(x); }) ? 'osek' : 'sachir';
      return { name: r[0], type: type, email: email };
    }).filter(function (x) { return x.name && !/^שם/.test(x.name); });
    if (!list.length) { m.textContent = 'לא מצאנו שמות. מדביקים עמודה של שמות מאקסל (אפשר גם מייל וסוג באותה שורה).'; return; }
    m.textContent = 'פותח ' + list.length + ' תיקים…';
    T.call(cfg.u, { a: 'mAddMany', key: cfg.key, list: list }).then(function (r) {
      if (!r.ok) { m.textContent = T.err(r.err); return; }
      m.textContent = 'נפתחו ' + r.clients.length + ' תיקים ✓'; $('cd-paste').value = ''; CH.used('cheshbon_tik_cheder', 'import'); refresh();
    }).catch(function () { m.textContent = T.err('net'); });
  });

  $('cd-add').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('cd-name').value.trim(); if (!name) { msg('כתבו את שם הלקוח'); return; }
    msg('פותח תיק…');
    T.call(cfg.u, { a: 'mAdd', key: cfg.key, name: name, type: $('cd-type').value }).then(function (r) {
      if (!r.ok) { msg(T.err(r.err)); return; }
      $('cd-name').value = ''; CH.used('cheshbon_tik_cheder', 'add');
      clients.push(r.client); open = {}; open[r.client.t] = 1; table();
      msg('נפתח תיק ל' + r.client.name + '. עכשיו שולחים לו את הקישור ↓');
    }).catch(function () { msg(T.err('net')); });
  });

  // ---- התקנה וחיבור ----
  $('cd-copy-code').addEventListener('click', function () {
    var el = $('cd-code-msg'); el.textContent = 'טוען…';
    fetch('/assets/cheshbon-tik-script.txt').then(function (r) { return r.text(); }).then(function (t) { $('cd-code').value = t; $('cd-code').hidden = false; CH.copy(t, el); CH.used('cheshbon_tik_cheder', 'code'); })
      .catch(function () { el.textContent = 'לא הצלחנו לטעון. פתחו את הקובץ בקישור שמתחת.'; });
  });
  $('cd-connect').addEventListener('submit', function (e) {
    e.preventDefault();
    var u = $('cd-url').value.trim().replace(/\?.*$/, ''), office = $('cd-oname').value.trim(), key = $('cd-key').value.trim();
    if (!T.okUrl(u)) { $('cd-cmsg').textContent = 'הכתובת צריכה להתחיל ב-https://script.google.com/ ולהסתיים ב-/exec'; return; }
    $('cd-cmsg').textContent = 'בודק את החיבור…';
    var p = key ? T.call(u, { a: 'mInfo', key: key }).then(function (r) { if (r.ok) r.key = key; return r; }) : T.call(u, { a: 'init', office: office || 'המשרד' });
    p.then(function (r) {
      if (!r.ok) { $('cd-cmsg').textContent = T.err(r.err); return; }
      cfg = { u: u, key: r.key, office: r.office, sheet: r.sheet, folder: r.folder };
      CH.save(KEY, cfg); CH.used('cheshbon_tik_cheder', 'connect');
      $('cd-cmsg').textContent = ''; show();
      if (!key) $('cd-keybox').hidden = false, $('cd-keyval').textContent = r.key;
    }).catch(function () { $('cd-cmsg').textContent = 'אין תשובה מהכתובת. בדקו שבפריסה בחרתם "כולם" (Anyone) ושהעתקתם את כתובת ה-Web app.'; });
  });
  $('cd-showkey').addEventListener('click', function () { $('cd-keybox').hidden = false; $('cd-keyval').textContent = cfg.key; });
  $('cd-logout').addEventListener('click', function () {
    if (!confirm('לנתק את הדפדפן הזה מהחדר? הקבצים והלקוחות נשארים בדרייב. כדי להתחבר שוב צריך את מפתח המשרד.')) return;
    CH.save(KEY, null); cfg = null; show();
  });
  $('cd-csv').addEventListener('click', function () {
    var rows = [['לקוח', 'שנה', 'מגירה', 'חודש', 'סכום', 'הערה', 'קובץ', 'קישור', 'הועלה']];
    docs.forEach(function (d) { rows.push([d.client, d.year, d.drawer, d.month, d.amount, d.note, d.name, d.url, d.at.slice(0, 10)]); });
    CH.csv('תיק-מסמכים-' + year + '.csv', rows); CH.used('cheshbon_tik_cheder', 'csv');
  });

  // ---- שותפים: קוד שותף פותח מיתוג (לוגו + צבע). אותו מפתח כמו בשאר האתר ----
  var COLORS = ['#c9a24d', '#5fbfa6', '#7aa7e0', '#e08a72', '#b48ad6', '#e0c35a'];
  var brand = { logo: '', color: '' };
  function getP() { try { return localStorage.getItem('kelim-partner') || ''; } catch (e) { return ''; } }
  function goodP(v) { return /^\d{3}-?\d{5}$/.test(String(v || '').replace(/\s/g, '')); }
  function colors() {
    $('cd-colors').innerHTML = COLORS.map(function (c) { return '<button type="button" data-color="' + c + '" aria-pressed="' + (brand.color === c) + '" aria-label="צבע ' + c + '" style="background:' + c + '"></button>'; }).join('');
    var pv = $('cd-logo-prev'); pv.hidden = !brand.logo; if (brand.logo) pv.src = brand.logo;
  }
  function brandOn() {
    var on = goodP(getP()); $('cd-brand').hidden = !on;
    if (cfg && $('cd-office-adv').hidden === on) { office(); table(); }
    if (on) { $('cd-pcode').value = getP(); colors(); if (cfg) T.call(cfg.u, { a: 'mInfo', key: cfg.key }).then(function (r) { if (r.ok && r.brand) { brand = r.brand; colors(); } if (r.ok) aiShow(!!r.ai); }).catch(function () {}); }
  }
  // קריאת סכום מהקבלה: קוד השותף מוחלף בשרת במפתח קריאה, והמפתח נשמר בקוד של המשרד בגוגל
  function aiShow(on) { $('cd-ai-on').hidden = on; $('cd-ai-off').hidden = !on; if (on) $('cd-aimsg').textContent = 'פעיל ✓ הלקוחות יתבקשו לאשר בכל קבלה.'; }
  function aiErr(r) { return r.err === 'action' ? 'צריך לעדכן את הקוד בגוגל לגרסה 4: מעתיקים שוב את הקוד, מדביקים במקום הישן, ופריסה ← ניהול פריסות ← עריכה ← גרסה חדשה.' : T.err(r.err); }
  $('cd-ai-on').addEventListener('click', function () {
    if (!cfg) { $('cd-aimsg').textContent = 'קודם פותחים את החדר (למעלה), ואז מפעילים.'; return; }
    $('cd-aimsg').textContent = 'מפעיל…';
    fetch(T.AI + '/key', { method: 'POST', headers: { 'x-kelim-partner': getP() } }).then(function (r) { return r.json(); }).then(function (k) {
      if (!k.key) { $('cd-aimsg').textContent = k.error === 'blocked' ? 'יותר מדי ניסיונות היום. נסו מחר.' : 'קוד השותף לא נכון. בדקו את הספרות.'; return; }
      return T.call(cfg.u, { a: 'mAi', key: cfg.key, ai: k.key }).then(function (r) {
        if (!r.ok) { $('cd-aimsg').textContent = aiErr(r); return; }
        aiShow(true); CH.used('cheshbon_tik_cheder', 'ai_on');
      });
    }).catch(function () { $('cd-aimsg').textContent = T.err('net'); });
  });
  $('cd-ai-off').addEventListener('click', function () {
    T.call(cfg.u, { a: 'mAi', key: cfg.key, ai: '' }).then(function (r) {
      if (!r.ok) { $('cd-aimsg').textContent = aiErr(r); return; }
      aiShow(false); $('cd-aimsg').textContent = 'כובה. הלקוחות ימשיכו להעלות כרגיל, בלי קריאה.'; CH.used('cheshbon_tik_cheder', 'ai_off');
    }).catch(function () { $('cd-aimsg').textContent = T.err('net'); });
  });
  $('cd-pcode').addEventListener('input', function () {
    var v = this.value.replace(/\s/g, '');
    if (goodP(v)) { try { localStorage.setItem('kelim-partner', v); } catch (e) {} CH.used('cheshbon_tik_cheder', 'partner'); }
    brandOn();
  });
  $('cd-colors').addEventListener('click', function (e) { var b = e.target.closest('[data-color]'); if (b) { brand.color = b.getAttribute('data-color'); colors(); } });
  $('cd-logo').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    var img = new Image(), u = URL.createObjectURL(f);
    img.onload = function () {
      var s = Math.min(1, 360 / img.width, 144 / img.height), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      var d = c.toDataURL('image/png'); if (d.length > 45000) d = c.toDataURL('image/webp', 0.85); if (d.length > 45000) d = c.toDataURL('image/jpeg', 0.8);
      if (d.length > 45000) { $('cd-bmsg').textContent = 'הלוגו גדול מדי. נסו קובץ פשוט יותר.'; return; }
      brand.logo = d; colors(); $('cd-bmsg').textContent = '';
    };
    img.onerror = function () { $('cd-bmsg').textContent = 'לא הצלחנו לפתוח את התמונה.'; };
    img.src = u;
  });
  $('cd-brand-save').addEventListener('click', function () {
    if (!cfg) { $('cd-bmsg').textContent = 'קודם פותחים את החדר (למעלה), ואז שומרים מיתוג.'; return; }
    $('cd-bmsg').textContent = 'שומר…';
    T.call(cfg.u, { a: 'mBrand', key: cfg.key, logo: brand.logo, color: brand.color }).then(function (r) {
      $('cd-bmsg').textContent = r.ok ? 'נשמר ✓ הלקוחות יראו את הלוגו והצבע בכניסה הבאה.' : (r.err === 'action' ? 'צריך לעדכן את הקוד בגוגל לגרסה 4: מעתיקים שוב את הקוד, מדביקים, ופריסה ← ניהול פריסות ← גרסה חדשה.' : T.err(r.err));
      if (r.ok) CH.used('cheshbon_tik_cheder', 'brand');
    }).catch(function () { $('cd-bmsg').textContent = T.err('net'); });
  });
  if (goodP(getP())) { $('cd-partner').open = true; }
  brandOn();

  // ---- הודעה לכל הלקוחות: להעתיק את כולם עם הקישורים (טאבים), ולהדביק ב"רשימת תפוצה" (/esek/tfutsa/) ----
  (function () {
    var tbl = $('cd-table'); if (!tbl || $('cd-all')) return;
    tbl.insertAdjacentHTML('beforebegin', '<div class="btns" id="cd-all"><button class="btn btn-line btn-sm" type="button" id="cd-all-copy">📋 להעתיק את כל הלקוחות עם הקישורים</button>' +
      '<a class="btn btn-line btn-sm" href="/esek/tfutsa/" target="_blank" rel="noopener">✉️ הודעה לכל הלקוחות</a><span class="hint" id="cd-all-msg" role="status"></span></div>');
    $('cd-all-copy').addEventListener('click', function () {
      var act = clients.filter(function (c) { return c.on; });
      if (!act.length) { $('cd-all-msg').textContent = 'עוד אין לקוחות.'; return; }
      var clean = function (v) { return String(v || '').replace(/[\t\r\n]+/g, ' ').trim(); };
      var rows = ['שם\tטלפון\tמייל\tקישור'].concat(act.map(function (c) { return [clean(c.name), clean(c.phone), clean(c.email), link(c)].join('\t'); }));
      copyRaw(rows.join('\n'), $('cd-all-msg'));
      $('cd-all-msg').textContent = act.length + ' לקוחות הועתקו ✓ מדביקים ב"רשימת תפוצה" ושולחים לכל אחד את הקישור שלו.';
      CH.used('cheshbon_tik_cheder', 'copy_all');
    });
  })();

  show();
})();
