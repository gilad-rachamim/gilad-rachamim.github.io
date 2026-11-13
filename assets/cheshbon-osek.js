// בדיקת ח.פ / מספר עוסק / ת.ז: ספרת ביקורת בדפדפן, ושם + סטטוס מהמאגרים הפתוחים של data.gov.il.
(function () {
  'use strict';
  var CH = window.CH; if (!CH || !CH.$('osek')) return;
  var $ = CH.$, TOOL = 'cheshbon_osek', KEY = 'kelim-cheshbon-osek';
  var API = 'https://data.gov.il/api/3/action/datastore_search?resource_id=';
  var RES_CO = 'f004176c-b85f-4542-8901-7b3176f9a054';   // רשם החברות
  var RES_AM = 'be5b7935-3922-45d4-9638-08871b17ec95';   // רשם העמותות
  var cache = {};

  // ---------- ספרת ביקורת ----------
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function check(raw) {
    var d = digits(raw);
    if (!d) return { ok: false, why: 'אין ספרות' };
    if (d.length > 9) return { ok: false, n: d, why: 'יותר מ-9 ספרות' };
    if (d.length < 5) return { ok: false, n: d, why: 'קצר מדי' };
    var n = ('000000000' + d).slice(-9), sum = 0;
    for (var i = 0; i < 9; i++) { var x = +n[i] * (i % 2 + 1); sum += x > 9 ? x - 9 : x; }
    var ok = sum % 10 === 0, r = { ok: ok, n: n, kind: kind(n) };
    if (!ok) {
      // מה הספרה האחרונה הייתה צריכה להיות
      var s8 = sum - (+n[8]); r.should = (10 - s8 % 10) % 10;
      r.why = 'ספרת הביקורת לא מתאימה';
    }
    return r;
  }
  function kind(n) {
    var p = n.slice(0, 2);
    if (n[0] !== '5') return { k: 'p', t: 'תעודת זהות של אדם (וגם מספר העוסק שלו)' };
    return ({
      '50': { k: 'g', t: 'גוף ציבורי או רשות (לפי הקידומת)' },
      '51': { k: 'c', t: 'חברה בע"מ (לפי הקידומת)' },
      '52': { k: 'c', t: 'חברה (לפי הקידומת)' },
      '53': { k: 'c', t: 'תאגיד (לפי הקידומת)' },
      '54': { k: 'c', t: 'תאגיד (לפי הקידומת)' },
      '55': { k: 's', t: 'שותפות רשומה (לפי הקידומת)' },
      '56': { k: 'c', t: 'חברת חוץ (לפי הקידומת)' },
      '57': { k: 'c', t: 'אגודה שיתופית (לפי הקידומת)' },
      '58': { k: 'a', t: 'עמותה (לפי הקידומת)' },
      '59': { k: 'c', t: 'תאגיד (לפי הקידומת)' }
    })[p] || { k: 'c', t: 'תאגיד' };
  }

  // ---------- חיפוש במאגר הפתוח ----------
  function q(res, field, n) {
    var f = {}; f[field] = +n;
    return fetch(API + res + '&filters=' + encodeURIComponent(JSON.stringify(f)) + '&limit=1')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { return j && j.result && j.result.records && j.result.records[0] || null; });
  }
  function lookup(n) {
    if (cache[n]) return cache[n];
    var k = kind(n).k, p;
    if (k === 'p') p = Promise.resolve(null);
    else if (k === 'a') p = q(RES_AM, 'מספר עמותה', n).then(function (r) { return r ? am(r) : q(RES_CO, 'מספר חברה', n).then(function (c) { return c ? co(c) : null; }); });
    else p = q(RES_CO, 'מספר חברה', n).then(function (r) { return r ? co(r) : null; });
    cache[n] = p.catch(function () { delete cache[n]; return { err: 1 }; });
    return cache[n];
  }
  function clean(s) { return String(s || '').replace(/~/g, '"').replace(/\s+/g, ' ').trim(); }
  function co(r) {
    return { name: clean(r['שם חברה']), en: clean(r['שם באנגלית']), status: clean(r['סטטוס חברה']) + (r['תת סטטוס'] ? ' – ' + clean(r['תת סטטוס']) : ''),
      type: clean(r['סוג תאגיד']), city: clean(r['שם עיר']), since: clean(r['תאריך התאגדות']), rep: r['שנה אחרונה של דוח שנתי (שהוגש)'] || '',
      gov: r['חברה ממשלתית'] === 'כן', bad: clean(r['מפרה']), src: 'רשם החברות' };
  }
  function am(r) {
    return { name: clean(r['שם עמותה בעברית']), status: clean(r['סטטוס עמותה']), type: 'עמותה' + (r['סיווג פעילות ענפי'] ? ' · ' + clean(r['סיווג פעילות ענפי']) : ''),
      city: clean(r['כתובת - ישוב']), since: clean(r['תאריך רישום עמותה']), rep: r['שנת דיווח דוח כספי אחרון'] || '', src: 'רשם העמותות' };
  }
  function active(st) { return /פעיל|רשומה/.test(st) && !/לא פעיל|מחוק|פירוק|פורק/.test(st); }

  // ---------- מספר אחד ----------
  var inp = $('os-in'), res = $('os-res'), timer, lastShown = '';
  function showOne() {
    var v = inp.value.trim();
    // הודבקו כמה מספרים (למשל מסימון בתוסף) -> עוברים לרשימה
    var many = (v.match(/\d[\d\- ]{6,}\d/g) || []).filter(function (x) { return digits(x).length >= 7 && digits(x).length <= 9; });
    if (many.length > 1) { $('os-list').value = many.map(digits).join('\n'); setMode('many'); runMany(); return; }
    if (many.length === 1) v = many[0];
    if (!digits(v)) { res.innerHTML = ''; return; }
    var c = check(v);
    if (!c.n || c.why === 'קצר מדי') { res.innerHTML = '<p class="hint">ממשיכים להקליד… (5 עד 9 ספרות)</p>'; return; }
    var h = '<h3>' + (c.ok ? '<span class="ok">✓ המספר תקין</span>' : '<span class="bad">✗ המספר לא תקין</span>') + '</h3>';
    h += '<div class="big" dir="ltr" style="text-align:right">' + CH.esc(c.n) + '</div>';
    if (!c.ok) h += '<p class="hint">' + CH.esc(c.why) + (c.should != null && c.n.length === 9 ? '. אם 8 הספרות הראשונות נכונות, הספרה האחרונה צריכה להיות <b>' + c.should + '</b>.' : '') + ' בדקו אם הוקלדה ספרה לא נכונה או שתי ספרות התחלפו.</p>';
    if (c.kind) h += '<dl><dt>סוג</dt><dd>' + CH.esc(c.kind.t) + '</dd></dl>';
    h += '<div id="os-reg-one"></div>';
    res.innerHTML = h;
    if (lastShown !== c.n) { lastShown = c.n; CH.used(TOOL, 'check'); }
    if (c.ok && c.kind.k !== 'p') {
      var box = $('os-reg-one'); box.innerHTML = '<p class="hint">מחפש ברשם…</p>';
      lookup(c.n).then(function (r) { if (inp.value.trim() && digits(inp.value).slice(-9) && lastShown === c.n) box.innerHTML = regHtml(r, c.n); });
    } else if (c.ok) {
      $('os-reg-one').innerHTML = '<p class="hint">לבדוק אם הוא רשום כעוסק מורשה: <a class="gold" href="https://www.misim.gov.il/emosek/wHzanatTik.aspx" target="_blank" rel="noopener">בדיקת עוסק ברשות המסים</a>.</p>';
    }
  }
  function regHtml(r, n) {
    if (!r) return '<p class="hint">לא נמצא במאגר הפתוח. אפשר לבדוק ב<a class="gold" href="https://ica.justice.gov.il/GenericCorporarionInfo/SearchCorporation?unit=8" target="_blank" rel="noopener">רשם החברות</a>.</p>';
    if (r.err) return '<p class="hint">המאגר לא ענה כרגע. נסו שוב בעוד רגע.</p>';
    var a = active(r.status);
    return '<dl>' +
      '<dt>שם</dt><dd><b>' + CH.esc(r.name) + '</b>' + (r.en ? '<br><span dir="ltr">' + CH.esc(r.en) + '</span>' : '') + '</dd>' +
      '<dt>סטטוס</dt><dd class="' + (a ? 'ok' : 'warn') + '">' + CH.esc(r.status || '—') + '</dd>' +
      (r.type ? '<dt>סוג תאגיד</dt><dd>' + CH.esc(r.type) + (r.gov ? ' · חברה ממשלתית' : '') + '</dd>' : '') +
      (r.city ? '<dt>עיר</dt><dd>' + CH.esc(r.city) + '</dd>' : '') +
      (r.since ? '<dt>נרשמה</dt><dd>' + CH.esc(r.since) + '</dd>' : '') +
      (r.rep ? '<dt>דוח שנתי אחרון</dt><dd>' + CH.esc(r.rep) + '</dd>' : '') +
      (r.bad ? '<dt>שימו לב</dt><dd class="warn">חברה מפרה לפי רשם החברות (למשל לא שילמה אגרה שנתית או לא הגישה דוח)</dd>' : '') +
      '</dl><p class="hint">מקור: ' + r.src + ', המאגר הפתוח ב-data.gov.il.</p>';
  }
  inp.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(showOne, 250); });
  $('os-one').addEventListener('submit', function (e) { e.preventDefault(); showOne(); });

  // ---------- רשימה ----------
  var out = $('os-out'), msg = $('os-msg'), lastRows = [], busy = false;
  function runMany() {
    if (busy) return;
    var rows = CH.rows($('os-list').value).slice(0, 2000), list = [];
    rows.forEach(function (r) {
      // התא הראשון שיש בו 5-9 ספרות הוא המספר; השאר – תיאור
      var idx = -1; r.some(function (c, i) { var d = digits(c); if (d.length >= 5 && d.length <= 9 && /^[\d\-\s]+$/.test(c)) { idx = i; return true; } return false; });
      if (idx < 0) { if (r.join('').trim() && !/מספר|ח\.?פ|עוסק|ת\.?ז/.test(r.join(' '))) list.push({ raw: r.join(' '), note: '', c: { ok: false, why: 'לא נמצא מספר' } }); return; }
      list.push({ raw: r[idx], note: r.filter(function (_, i) { return i !== idx; }).join(' ').trim(), c: check(r[idx]) });
    });
    if (!list.length) { msg.textContent = 'לא מצאתי מספרים. מדביקים עמודה מאקסל, מספר בכל שורה.'; return; }
    CH.save(KEY, { list: $('os-list').value.slice(0, 50000), reg: $('os-reg').checked });
    render(list);
    CH.used(TOOL, 'batch');
    if (!$('os-reg').checked) { msg.textContent = 'נבדקו ' + list.length + ' מספרים.'; return; }
    var todo = list.filter(function (x) { return x.c.ok && x.c.kind.k !== 'p'; }), done = 0, i = 0;
    if (!todo.length) { msg.textContent = 'נבדקו ' + list.length + ' מספרים.'; return; }
    busy = true; msg.textContent = 'מחפש ברשם: 0 מתוך ' + todo.length + '…';
    function next() {
      if (i >= todo.length) return;
      var x = todo[i++];
      lookup(x.c.n).then(function (r) {
        x.reg = r; done++;
        msg.textContent = done < todo.length ? 'מחפש ברשם: ' + done + ' מתוך ' + todo.length + '…' : 'נבדקו ' + list.length + ' מספרים, ' + todo.length + ' מהם ברשם.';
        if (done === todo.length || done % 10 === 0) render(list);
        if (done === todo.length) busy = false; else next();
      });
    }
    for (var k = 0; k < 4; k++) next();
  }
  function render(list) {
    var bad = list.filter(function (x) { return !x.c.ok; }).length;
    var h = '<div class="res"><h3>' + list.length + ' מספרים · <span class="ok">' + (list.length - bad) + ' תקינים</span>' + (bad ? ' · <span class="bad">' + bad + ' לא תקינים</span>' : '') + '</h3>';
    h += '<div class="btns no-print"><button class="btn btn-gold btn-sm" type="button" id="os-csv">להוריד לאקסל</button><button class="btn btn-line btn-sm" type="button" id="os-bad">להעתיק רק את הלא תקינים</button><button class="btn btn-line btn-sm" type="button" onclick="window.print()">להדפיס</button></div>';
    h += '<div class="tbl-wrap"><table><thead><tr><th>מספר</th><th>תקין?</th><th>סוג</th><th>שם ברשם</th><th>סטטוס</th><th>הערה</th></tr></thead><tbody>';
    lastRows = [['מספר', 'תקין', 'סוג', 'שם ברשם', 'סטטוס', 'סוג תאגיד', 'עיר', 'דוח שנתי אחרון', 'הערה']];
    list.forEach(function (x) {
      var r = x.reg && !x.reg.err ? x.reg : null, st = r ? r.status : (x.reg && x.reg.err ? 'המאגר לא ענה' : (x.reg === null && x.c.ok && x.c.kind.k !== 'p' ? 'לא נמצא' : ''));
      var okTxt = x.c.ok ? 'תקין' : 'לא תקין' + (x.c.should != null && x.c.n && x.c.n.length === 9 ? ' (צריך ' + x.c.should + ' בסוף?)' : '');
      h += '<tr class="' + (x.c.ok ? 'is-ok' : 'is-bad') + '"><td class="n">' + CH.esc(x.c.n || x.raw) + '</td><td>' + (x.c.ok ? '<span class="ok">✓</span>' : '<span class="bad">' + CH.esc(okTxt) + '</span>') + '</td><td>' + CH.esc(x.c.kind ? x.c.kind.t.replace(/ \(.*\)/, '') : '') + '</td><td>' + CH.esc(r ? r.name : '') + '</td><td' + (r && !active(r.status) ? ' class="warn"' : '') + '>' + CH.esc(st) + '</td><td>' + CH.esc(x.note) + '</td></tr>';
      lastRows.push([x.c.n || x.raw, okTxt, x.c.kind ? x.c.kind.t : '', r ? r.name : '', st, r ? r.type : '', r ? r.city : '', r ? r.rep : '', x.note]);
    });
    h += '</tbody></table></div></div>';
    out.innerHTML = h;
    $('os-csv').onclick = function () { CH.csv('bdikat-osek-' + CH.iso(new Date()) + '.csv', lastRows); CH.used(TOOL, 'csv'); };
    $('os-bad').onclick = function () { CH.copy(list.filter(function (x) { return !x.c.ok; }).map(function (x) { return (x.c.n || x.raw) + (x.note ? '\t' + x.note : ''); }).join('\n') || '—', msg); };
  }
  $('os-go').addEventListener('click', runMany);
  $('os-many').addEventListener('submit', function (e) { e.preventDefault(); runMany(); });

  function setMode(m) {
    CH.pick($('os-mode'), m);
    $('os-one').hidden = res.hidden = m !== 'one';
    $('os-many').hidden = out.hidden = m !== 'many';
  }
  CH.seg($('os-mode'), setMode);

  // ---------- כניסה: דוגמה מלאה או מה שנשמר ----------
  var sv = CH.load(KEY, null);
  $('os-list').value = sv && sv.list ? sv.list : '510529068\tלקוח א (דוגמה)\n580094068\tעמותה (דוגמה)\n123456782\tעוסק פטור (דוגמה)\n510529069\tספק – הוקלד לא נכון';
  if (sv && sv.reg === false) $('os-reg').checked = false;
  var qs = (location.search.match(/[?&]n=(\d{5,9})/) || [])[1];
  inp.value = qs || inp.value || '510529068';
  showOne();
})();
