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
    var L = T.list(c.type), mine = docs.filter(function (d) { return d.t === c.t; });
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
    refresh();
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
    $('cd-table').innerHTML = act.map(function (c, i) {
      var L = T.list(c.type), mine = docs.filter(function (d) { return d.t === c.t; });
      var have = L.filter(function (d) { return mine.some(function (x) { return x.drawer === d.t; }); }).length;
      var sum = mine.reduce(function (s, d) { return s + (d.amount === '' ? 0 : +d.amount); }, 0);
      var s = '<div class="cd-c' + (open[c.t] ? ' is-open' : '') + '"><button type="button" class="cd-h" data-open="' + c.t + '" aria-expanded="' + !!open[c.t] + '"><b>' + esc(c.name) + '</b><span>' + (c.type === 'osek' ? 'עוסק' : 'שכיר / פרטי') + ' · ' + mine.length + ' קבצים · ' + have + '/' + L.length + ' מגירות</span><span class="tk-bar"><i style="width:' + Math.round(100 * have / L.length) + '%"></i></span></button>';
      if (open[c.t]) {
        s += '<div class="cd-body"><div class="btns"><button class="btn btn-gold btn-sm" type="button" data-inv="' + i + '">שליחת הקישור בווטסאפ</button><button class="btn btn-line btn-sm" type="button" data-rem="' + i + '">תזכורת על מה שחסר</button><button class="btn btn-line btn-sm" type="button" data-cp="' + i + '">להעתיק קישור</button><button class="btn btn-line btn-sm" type="button" data-off="' + i + '">לסגור את התיק</button></div><p class="msg" id="cd-cpm-' + i + '"></p>';
        s += '<div class="tbl-wrap"><table><thead><tr><th>מגירה</th><th>קבצים</th><th>סכום</th></tr></thead><tbody>' + L.map(function (d) {
          var f = mine.filter(function (x) { return x.drawer === d.t; }), a = f.reduce(function (s2, x) { return s2 + (x.amount === '' ? 0 : +x.amount); }, 0);
          return '<tr class="' + (f.length ? 'is-ok' : '') + '"><td>' + esc(d.t) + '</td><td>' + (f.length ? f.map(function (x) { return '<a class="gold" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.name) + '</a>'; }).join('<br>') : '<span class="hint">חסר</span>') + '</td><td class="n">' + (a ? CH.money(a) : '') + '</td></tr>';
        }).join('') + (sum ? '<tr><td><b>סה"כ סכומים שהלקוח רשם</b></td><td></td><td class="n"><b>' + CH.money(sum) + '</b></td></tr>' : '') + '</tbody></table></div></div>';
      }
      return s + '</div>';
    }).join('');
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var act = clients.filter(function (c) { return c.on; });
    if (b.hasAttribute('data-open')) { var t = b.getAttribute('data-open'); open[t] = !open[t]; table(); }
    else if (b.hasAttribute('data-inv')) { CH.used('cheshbon_tik_cheder', 'invite'); goWa(invite(act[+b.getAttribute('data-inv')])); }
    else if (b.hasAttribute('data-rem')) { CH.used('cheshbon_tik_cheder', 'remind'); goWa(remind(act[+b.getAttribute('data-rem')])); }
    else if (b.hasAttribute('data-cp')) { var i = +b.getAttribute('data-cp'); copyRaw(link(act[i]), $('cd-cpm-' + i)); }
    else if (b.hasAttribute('data-off')) {
      var c = act[+b.getAttribute('data-off')];
      if (!confirm('לסגור את התיק של ' + c.name + '? הקישור שלו יפסיק לעבוד. הקבצים נשארים בדרייב.')) return;
      T.call(cfg.u, { a: 'mClient', key: cfg.key, t: c.t, on: false }).then(refresh);
    }
  });

  CH.seg($('cd-year'), function (v) { year = +v; refresh(); });

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
    }).catch(function () { $('cd-cmsg').textContent = 'אין תשובה מהכתובת. בדקו שבפריסה בחרתם "כל אחד" (Anyone) ושהעתקתם את כתובת ה-Web app.'; });
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

  show();
})();
