// תיק מסמכים לדוח השנתי (/kelim/cheshbon/tik/).
// בלי קישור מרואה חשבון: רשימת מסמכים עם וי, נשמרת רק בטלפון.
// עם קישור אישי (#u=...&t=...): כל קובץ עולה ישר לגוגל דרייב של רואה החשבון, דרך הקוד שהוא התקין בחשבון שלו.
// שום קובץ ושום פרט לא עובר דרך אתר הכלים. הקישור נקרא מה-# ונמחק מהכתובת עוד לפני שהמדידה רצה.
(function () {
  'use strict';
  var T = window.TIK = {};
  // מגירות: k = מפתח, t = שם, h = מאיפה מביאים, m = לפי חודש, o = רק לעוסק
  T.DRAWERS = [
    { k: '106', t: 'טופס 106 מכל מעסיק', h: 'מקבלים מהמעסיק עד סוף מרץ. עבדתם בכמה מקומות? טופס מכל אחד.' },
    { k: 'truma', t: 'קבלות על תרומות (סעיף 46)', h: 'רק מעמותה שיש לה אישור לפי סעיף 46. הקבלה צריכה להיות על שמכם.' },
    { k: 'pensia', t: 'פנסיה, קופת גמל וקרן השתלמות', h: 'דוח שנתי מהקרן, באזור האישי באתר שלה. חשוב בעיקר למי שמפקיד באופן עצמאי.' },
    { k: 'bituach', t: 'ביטוח חיים ואובדן כושר עבודה', h: 'אישור שנתי מחברת הביטוח, באזור האישי או בבקשה לנציג.' },
    { k: '867', t: 'טופס 867 מהבנק ומבית ההשקעות', h: 'אישור שנתי על ריבית, רווחים ומס שנוכה. באתר הבנק, תחת "אישורים שנתיים".' },
    { k: 'bl', t: 'אישורים מביטוח לאומי', h: 'דמי לידה, מילואים, אבטלה או נכות: אישור שנתי מהאזור האישי באתר ביטוח לאומי.' },
    { k: 'zikui', t: 'נקודות זיכוי: תואר, שחרור, ילדים', h: 'תעודת תואר, תעודת שחרור, אישור על ילד עם צרכים מיוחדים, מגורים ביישוב מזכה. רואה החשבון יגיד מה רלוונטי.' },
    { k: 'refui', t: 'הוצאות רפואיות ומוסדות', h: 'קבלות על טיפול קבוע, מוסד או החזקת קרוב. שומרים הכול, רואה החשבון יבדוק.' },
    { k: 'dira', t: 'שכר דירה ונדל"ן', h: 'חוזה שכירות וקבלות, אם השכרתם דירה. מכירה או קנייה של דירה: גם את החוזה.' },
    { k: 'yipui', t: 'ייפוי כוח וטפסים חתומים', h: 'ייפוי כוח לרואה החשבון וכל טופס שהוא ביקש לחתום. חותמים בטלפון בכלי "חתימה על PDF" ומעלים לכאן.' },
    { k: 'hotzaot', t: 'חשבוניות הוצאה של העסק', h: 'כל הוצאה של העסק: ציוד, טלפון, תוכנות, שכירות משרד. מצלמים מיד כשמקבלים.', m: 1, o: 1 },
    { k: 'hachnasot', t: 'קבלות וחשבוניות הכנסה', h: 'מה שהוצאתם ללקוחות. אם יש לכם תוכנה, מספיק דוח חודשי ממנה.', m: 1, o: 1 },
    { k: 'bank', t: 'דפי בנק וכרטיסי אשראי', h: 'דף חשבון חודשי של חשבון העסק ופירוט האשראי.', m: 1, o: 1 },
    { k: 'rechev', t: 'רכב: דלק, טיפולים וביטוח', h: 'קבלות על דלק, טיפולים, ביטוח ורישיון, אם הרכב משמש לעסק.', m: 1, o: 1 },
    { k: 'tashlumim', t: 'מקדמות, מע"מ וביטוח לאומי ששילמתם', h: 'אישורי תשלום של מקדמות מס הכנסה, מע"מ ודמי ביטוח לאומי.', m: 1, o: 1 },
    { k: 'acher', t: 'מסמכים אחרים', h: 'כל מה שרואה החשבון ביקש ולא מופיע כאן: מכתב מרשות המסים, ירושה, פיצויים.' }
  ];
  T.MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  T.list = function (type) { return T.DRAWERS.filter(function (d) { return type === 'osek' || !d.o; }); };
  // המגירות של לקוח מסוים: מה שרואה החשבון בחר (או ברירת המחדל לסוג), ועוד הבקשות המיוחדות שלו
  T.forClient = function (c) {
    var keys = String(c.drawers || '').split(',').filter(Boolean);
    var L = keys.length ? T.DRAWERS.filter(function (d) { return keys.indexOf(d.k) >= 0; }) : T.list(c.type);
    String(c.requests || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (r, i) {
      L.push({ k: 'r' + i, t: r, h: 'בקשה אישית מרואה החשבון.', req: 1 });
    });
    return L;
  };
  T.byName = function (name) { return T.DRAWERS.filter(function (d) { return d.t === name; })[0]; };
  // קריאה לקוד של רואה החשבון: POST בטקסט פשוט (בלי preflight), ו-Apps Script מחזיר JSON
  T.call = function (url, body) {
    return fetch(url, { method: 'POST', body: JSON.stringify(body), redirect: 'follow' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.text(); })
      .then(function (t) { try { return JSON.parse(t); } catch (e) { throw new Error('notjson'); } });
  };
  T.okUrl = function (u) { return /^https:\/\/script\.google(usercontent)?\.com\/[\w\/.\-]+\/exec$/.test(u) || /^http:\/\/127\.0\.0\.1:\d+\/[\w\/.\-]*exec$/.test(u); };
  T.err = function (e) {
    var m = { dup: 'הקובץ הזה כבר הועלה, אז לא העלינו אותו שוב.', token: 'הקישור כבר לא פעיל. בקשו מרואה החשבון קישור חדש.', off: 'רואה החשבון סגר את התיק הזה. דברו איתו.', size: 'הקובץ גדול מדי (עד 25MB). אפשר לכווץ אותו בכלי "כיווץ PDF".', limit: 'הגעתם למספר ההעלאות המקסימלי להיום. נסו שוב מחר.', key: 'המפתח של המשרד לא נכון.', already: 'החדר כבר פתוח. כדי להתחבר ממכשיר נוסף, השתמשו במפתח המשרד.' };
    return m[e] || 'משהו השתבש בחיבור לדרייב. נסו שוב בעוד דקה.';
  };
  // כיווץ תמונה בטלפון: עד 2000 פיקסלים בצד הארוך, JPEG. PDF ושאר הקבצים עולים כמו שהם.
  T.prep = function (file) {
    return new Promise(function (res) {
      function raw() { var fr = new FileReader(); fr.onload = function () { res({ data: String(fr.result).split(',')[1], mime: file.type || 'application/octet-stream', name: file.name || 'מסמך' }); }; fr.onerror = function () { res(null); }; fr.readAsDataURL(file); }
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400000) return raw();
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        var d = c.toDataURL('image/jpeg', 0.82);
        if (d.length * 0.75 > file.size) return raw(); // הכיווץ לא הקטין – שולחים את המקור
        res({ data: d.split(',')[1], mime: 'image/jpeg', name: (file.name || 'צילום').replace(/\.\w+$/, '') + '.jpg' });
      };
      img.onerror = function () { URL.revokeObjectURL(u); raw(); };
      img.src = u;
    });
  };

  // ---- קריאת סכום מהקבלה (הטבה לשותפים) ----
  // רק אחרי שהלקוח אישר: תמונה מוקטנת (או העמוד הראשון והאחרון של PDF) נשלחת ל-Worker, וחוזרים סכום, תאריך ושם העסק.
  // שום דבר לא נשמר שם. הקובץ המקורי עולה לדרייב של רואה החשבון כמו תמיד.
  T.AI = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8841' : 'https://kelim-kabala.gilad4049.workers.dev';
  T.isPdf = function (f) { return f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''); };
  T.canRead = function (f) { return /^image\/(jpeg|png|webp)$/.test(f.type) || T.isPdf(f); };
  function shrink(src, w, h) {
    var s = Math.min(1, 1600 / Math.max(w, h)), c = document.createElement('canvas');
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height);
    return { mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.85).split(',')[1] };
  }
  function pdfLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise(function (res, rej) {
      var sc = document.createElement('script'); sc.src = '/assets/vendor/pdfjs/pdf.min.js';
      sc.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/vendor/pdfjs/pdf.worker.min.js'; res(window.pdfjsLib); };
      sc.onerror = rej; document.head.appendChild(sc);
    });
  }
  T.pages = function (f) {
    if (!T.isPdf(f)) return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(f);
      img.onload = function () { URL.revokeObjectURL(u); res([shrink(img, img.naturalWidth, img.naturalHeight)]); };
      img.onerror = function () { URL.revokeObjectURL(u); rej(new Error('img')); };
      img.src = u;
    });
    return Promise.all([pdfLib(), f.arrayBuffer()]).then(function (a) { return a[0].getDocument({ data: a[1] }).promise; }).then(function (doc) {
      var nums = doc.numPages > 1 ? [1, doc.numPages] : [1]; // הסכום הסופי בדרך כלל בעמוד האחרון
      return Promise.all(nums.map(function (n) {
        return doc.getPage(n).then(function (pg) {
          var v0 = pg.getViewport({ scale: 1 }), v = pg.getViewport({ scale: 1600 / Math.max(v0.width, v0.height) }), c = document.createElement('canvas');
          c.width = Math.round(v.width); c.height = Math.round(v.height);
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
          return pg.render({ canvasContext: x, viewport: v }).promise.then(function () { return shrink(c, c.width, c.height); });
        });
      }));
    });
  };
  T.read = function (key, f) {
    return T.pages(f).then(function (pages) {
      return fetch(T.AI + '/read', { method: 'POST', headers: { 'content-type': 'application/json', 'x-kelim-partner': key }, body: JSON.stringify({ pages: pages }) });
    }).then(function (r) { return r.json(); });
  };

  // ---------------- הדף ללקוח ----------------
  var root = document.getElementById('tik');
  if (!root) return;
  var CH = window.CH, $ = CH.$, esc = CH.esc;
  var conn = null; // {u, t}
  try {
    var h = window.__tikH || sessionStorage.getItem('tik-h') || '';
    var p = new URLSearchParams(h.replace(/^#/, ''));
    if (p.get('u') && p.get('t') && T.okUrl(p.get('u'))) { conn = { u: p.get('u'), t: p.get('t') }; CH.save('tik-conn', conn); }
  } catch (e) {}
  if (!conn) { var sv = CH.load('tik-conn', null); if (sv && sv.u && sv.t && T.okUrl(sv.u)) conn = sv; }

  var now = new Date();
  var st = CH.load('tik-local', null) || { type: 'sachir', year: now.getFullYear(), done: { '106': 1, 'truma': 1 }, ex: 1 };
  var docs = [], info = null, busy = 0;
  var pend = null; // קבלה שמחכה לאישור הקריאה: {k, file, stage: 'ask'|'read'|'edit', amount, date, vendor, note}
  function save() { CH.save('tik-local', st); }

  function years() { var y = now.getFullYear(); return [y, y - 1, y - 2]; }
  function yearSel() {
    return years().map(function (y) { return '<button type="button" data-v="' + y + '" aria-pressed="' + (st.year === y) + '">' + y + '</button>'; }).join('');
  }
  function countBy(d0) { return docs.filter(function (d) { return d.drawer === d0.t; }); }
  var LIST = [];

  function render() {
    var type = info ? info.type : st.type, L = LIST = info ? T.forClient(info) : T.list(type);
    $('tik-year').innerHTML = yearSel();
    $('tik-type').hidden = !!info;
    CH.pick($('tik-type'), st.type);
    var have = 0;
    var html = L.map(function (d) {
      var got = info ? countBy(d) : [], ok = info ? got.length > 0 : !!st.done[d.k];
      if (ok) have++;
      var s = '<li class="tk-d' + (ok ? ' is-ok' : '') + '" data-k="' + d.k + '"><div class="tk-top">';
      if (info) s += '<span class="tk-mark" aria-hidden="true">' + (ok ? '✓' : '') + '</span>';
      else s += '<label class="tk-chk"><input type="checkbox" data-done="' + d.k + '"' + (ok ? ' checked' : '') + '><span class="vh">יש לי</span></label>';
      s += '<div class="tk-txt"><b>' + esc(d.t) + '</b><span>' + esc(d.h) + '</span></div></div>';
      if (info && pend && pend.k === d.k) s += aiCard();
      else if (info) {
        s += '<div class="tk-up no-print">';
        if (d.m) s += '<label class="tk-m">חודש <select data-month="' + d.k + '"><option value="">כל השנה</option>' + T.MONTHS.map(function (m, i) { return '<option' + (i === Math.max(0, now.getMonth() - 1) && st.year === now.getFullYear() ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label>';
        s += '<label class="tk-m">סכום (לא חובה) <input type="text" inputmode="decimal" data-amount="' + d.k + '" maxlength="12" autocomplete="off"></label>';
        s += '<label class="btn btn-gold btn-sm tk-file">📷 לצלם או לבחור קובץ<input type="file" accept="image/*,application/pdf" multiple data-file="' + d.k + '"></label></div>';
        if (got.length) s += '<ul class="tk-files">' + got.map(function (f) { return '<li><span>' + esc(f.name) + (f.amount !== '' ? ' · <bdi>' + esc(CH.money(+f.amount)) + '</bdi>' : '') + '</span><button type="button" data-del="' + esc(f.id) + '" aria-label="למחוק את ' + esc(f.name) + '">✕</button></li>'; }).join('') + '</ul>';
      }
      return s + '</li>';
    }).join('');
    $('tik-list').innerHTML = html;
    $('tik-prog').innerHTML = '<b>' + have + ' מתוך ' + L.length + '</b> ' + (info ? 'מגירות עם מסמכים' : 'מסמכים כבר אצלכם') + '<span class="tk-bar"><i style="width:' + Math.round(100 * have / L.length) + '%"></i></span>';
  }

  function aiCard() {
    var s = '<div class="tk-ai no-print" role="group" aria-label="קריאת הקבלה"><p class="tk-ai-f">📄 ' + esc(pend.file.name || 'צילום') + '</p>';
    if (pend.stage === 'ask') {
      s += '<p><b>לקרוא את הסכום, התאריך ושם העסק מהקבלה?</b></p><p class="hint">התמונה תישלח לקריאה אוטומטית ולא תישמר. לפני ההעלאה בודקים את מה שנקרא. אפשר גם בלי.</p>' +
        '<div class="btns"><button class="btn btn-gold btn-sm" type="button" data-ai="yes">כן, לקרוא</button><button class="btn btn-line btn-sm" type="button" data-ai="no">לא, רק להעלות</button><button class="btn btn-line btn-sm" type="button" data-ai="cancel">ביטול</button></div>';
    } else if (pend.stage === 'read') {
      s += '<p class="tk-ai-wait">קורא את הקבלה…</p>';
    } else {
      s += (pend.note ? '<p class="hint">' + esc(pend.note) + '</p>' : '') +
        '<div class="tk-up"><label class="tk-m">סכום<input type="text" inputmode="decimal" data-ai-f="amount" maxlength="12" autocomplete="off" value="' + esc(pend.amount) + '"></label>' +
        '<label class="tk-m">תאריך<input type="date" data-ai-f="date" value="' + esc(pend.date) + '"></label>' +
        '<label class="tk-m tk-m-w">שם העסק<input type="text" data-ai-f="vendor" maxlength="60" autocomplete="off" value="' + esc(pend.vendor) + '"></label></div>' +
        '<div class="btns"><button class="btn btn-gold btn-sm" type="button" data-ai="up">להעלות לרואה החשבון</button><button class="btn btn-line btn-sm" type="button" data-ai="cancel">ביטול</button></div>';
    }
    return s + '</div>';
  }
  function aiVals() {
    ['amount', 'date', 'vendor'].forEach(function (f) { var el = root.querySelector('[data-ai-f="' + f + '"]'); if (el) pend[f] = el.value.trim(); });
  }
  function aiRead() {
    var p = pend; p.stage = 'read'; render(); $('tik-msg').textContent = 'קורא את הקבלה…';
    CH.used('cheshbon_tik', 'ai_read');
    T.read(info.ai, p.file).then(function (r) {
      if (pend !== p) return;
      p.stage = 'edit';
      if (r.found) {
        p.amount = String(r.amount); p.date = r.date || ''; p.vendor = r.vendor || '';
        p.note = 'נקרא מהקבלה. בדקו שהפרטים נכונים, ותקנו אם צריך.';
        var y = r.date ? +r.date.slice(0, 4) : 0;
        if (y && y !== st.year) p.note += ' שימו לב: הקבלה משנת ' + y + ', והתיק פתוח לשנת ' + st.year + '.';
        CH.used('cheshbon_tik', 'ai_found');
      } else p.note = (r.error === 'quota' ? 'הקריאה האוטומטית הגיעה למכסה של היום.' : r.error === 'partner' ? 'הקריאה האוטומטית כבויה כרגע.' : 'לא הצלחנו לקרוא את הסכום מהקבלה.') + ' אפשר לכתוב אותו כאן, או להעלות בלי.';
      $('tik-msg').textContent = ''; render();
      var f = root.querySelector('[data-ai-f="amount"]'); if (f) f.focus();
    }).catch(function () { if (pend !== p) return; p.stage = 'edit'; p.note = 'אין חיבור לקריאה האוטומטית. אפשר לכתוב את הסכום כאן, או להעלות בלי.'; $('tik-msg').textContent = ''; render(); });
  }

  function head() {
    if (info) {
      var br = info.brand || {};
      if (br.color && /^#[0-9a-f]{6}$/i.test(br.color)) root.style.setProperty('--gold', br.color);
      $('tik-who').innerHTML = (br.logo && /^data:image\/(png|jpeg|webp);base64,/.test(br.logo) ? '<img class="tk-logo" src="' + esc(br.logo) + '" alt="' + esc(info.office) + '">' : '') + '<b>' + esc(info.name) + '</b>, כאן מעלים את המסמכים ל<b>' + esc(info.office) + '</b>. כל קובץ נכנס ישר לתיקייה שלכם אצל רואה החשבון.';
      $('tik-who').hidden = false; $('tik-solo').hidden = true; $('tik-wa').hidden = true;
      // מסמכים שרואה החשבון ביקש לחתום
      var sg = info.sign || [];
      $('tik-sign').hidden = !sg.length;
      $('tik-sign').innerHTML = sg.length ? '<b>רואה החשבון ביקש לחתום על:</b><ul class="tk-files">' + sg.map(function (s) { return '<li><span>' + esc(s.name) + '</span><button type="button" class="btn btn-line btn-sm" data-sign="' + esc(s.id) + '">להוריד</button></li>'; }).join('') + '</ul><p class="hint">מורידים, חותמים בטלפון ב<a class="gold" href="/kelim/machshev/chatima/" target="_blank" rel="noopener">חתימה על PDF</a>, ומעלים את הקובץ החתום למגירה "ייפוי כוח וטפסים חתומים".</p>' : '';
      // סיימתי להעלות
      $('tik-done-box').hidden = false;
      $('tik-done-msg').textContent = info.done ? 'שלחתם לרואה החשבון שסיימתם ✓ אם תעלו עוד משהו, התיק ייפתח שוב לבד.' : 'העליתם הכול לשנה הזו? לחיצה אחת, ורואה החשבון מקבל הודעה שהתיק מוכן.';
      $('tik-done').hidden = !!info.done;
    }
  }

  function loadInfo() {
    $('tik-msg').textContent = 'מתחברים לתיק אצל רואה החשבון…';
    return T.call(conn.u, { a: 'cInfo', t: conn.t, year: st.year }).then(function (r) {
      if (!r.ok) { $('tik-msg').textContent = T.err(r.err); if (r.err === 'token') { CH.save('tik-conn', null); } return; }
      info = r; docs = r.docs || []; $('tik-msg').textContent = ''; head(); render();
    }).catch(function () { $('tik-msg').textContent = T.err('net'); });
  }

  function upload(k, files, ex) {
    var d = LIST.filter(function (x) { return x.k === k; })[0];
    var ms = root.querySelector('[data-month="' + k + '"]'), am = root.querySelector('[data-amount="' + k + '"]');
    var month = ms ? ms.value : '', amount = am ? CH.num(am.value) : NaN, note = '';
    if (ex) { amount = CH.num(ex.amount); note = ex.note || ''; if (d.m && ex.month) month = ex.month; }
    var list = [].slice.call(files), i = 0, okN = 0;
    if (list.length > 1) amount = NaN; // סכום שייך לקבלה אחת
    busy++;
    function next() {
      if (i >= list.length) {
        busy--; if (!okN) return;
        CH.used('cheshbon_tik', 'upload');
        return loadInfo().then(function () { $('tik-msg').textContent = (okN === 1 ? 'הקובץ עלה' : 'עלו ' + okN + ' קבצים') + ' ✓ הוא כבר אצל רואה החשבון.'; });
      }
      var f = list[i++];
      $('tik-msg').textContent = 'מעלה ' + i + ' מתוך ' + list.length + '…';
      T.prep(f).then(function (x) {
        if (!x) { $('tik-msg').textContent = 'לא הצלחנו לקרוא את הקובץ ' + (f.name || ''); return next(); }
        return T.call(conn.u, { a: 'cUp', t: conn.t, year: st.year, drawer: d.t, month: month, amount: isFinite(amount) ? amount : '', note: note, name: x.name, mime: x.mime, data: x.data })
          .then(function (r) { if (r.ok) okN++; else $('tik-msg').textContent = T.err(r.err); next(); });
      }).catch(function () { $('tik-msg').textContent = T.err('net'); busy--; });
    }
    next();
  }

  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-done]')) { st.done[t.getAttribute('data-done')] = t.checked ? 1 : 0; save(); render(); CH.used('cheshbon_tik', 'check'); }
    if (t.matches('[data-file]') && t.files && t.files.length) {
      var k = t.getAttribute('data-file');
      if (info && info.ai && t.files.length === 1 && T.canRead(t.files[0])) { // שותף: קודם שואלים אם לקרוא
        pend = { k: k, file: t.files[0], stage: 'ask', amount: '', date: '', vendor: '', note: '' }; render();
        var yb = root.querySelector('[data-ai="yes"]'); if (yb) yb.focus();
      } else upload(k, t.files);
      t.value = '';
    }
  });
  root.addEventListener('click', function (e) {
    var a = e.target.closest('[data-ai]');
    if (a && pend) {
      var act = a.getAttribute('data-ai'), p = pend;
      if (act === 'yes') return aiRead();
      if (act === 'cancel') { pend = null; render(); return; }
      if (act === 'no') { pend = null; render(); return upload(p.k, [p.file]); }
      if (act === 'up') {
        aiVals(); pend = null; render();
        var dt = p.date ? CH.date(p.date) : null;
        return upload(p.k, [p.file], { amount: p.amount, note: [p.vendor, dt ? CH.heDate(dt) : ''].filter(Boolean).join(' · '), month: dt && dt.getFullYear() === st.year ? T.MONTHS[dt.getMonth()] : '' });
      }
    }
    var sgn = e.target.closest('[data-sign]');
    if (sgn && conn) {
      $('tik-msg').textContent = 'מוריד…';
      T.call(conn.u, { a: 'cFile', t: conn.t, id: sgn.getAttribute('data-sign') }).then(function (r) {
        if (!r.ok) { $('tik-msg').textContent = T.err(r.err); return; }
        var bin = atob(r.data), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u8], { type: r.mime })); a.download = r.name;
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        $('tik-msg').textContent = 'הקובץ ירד ✓ עכשיו חותמים ומעלים בחזרה.'; CH.used('cheshbon_tik', 'sign');
      }).catch(function () { $('tik-msg').textContent = T.err('net'); });
      return;
    }
    if (e.target.closest('#tik-done') && conn) {
      $('tik-done').disabled = true;
      T.call(conn.u, { a: 'cDone', t: conn.t, year: st.year }).then(function (r) {
        $('tik-done').disabled = false;
        if (!r.ok) { $('tik-msg').textContent = T.err(r.err); return; }
        CH.used('cheshbon_tik', 'done'); loadInfo();
      }).catch(function () { $('tik-done').disabled = false; $('tik-msg').textContent = T.err('net'); });
      return;
    }
    var b = e.target.closest('[data-del]');
    if (b && conn && !busy) {
      if (!confirm('למחוק את הקובץ מהתיק אצל רואה החשבון?')) return;
      T.call(conn.u, { a: 'cDel', t: conn.t, id: b.getAttribute('data-del') }).then(function () { loadInfo(); });
    }
  });
  CH.seg($('tik-type'), function (v) { st.type = v; save(); render(); });
  CH.seg($('tik-year'), function (v) { st.year = +v; save(); if (conn) loadInfo(); else render(); });

  function missingText() {
    var L = T.list(st.type), miss = L.filter(function (d) { return !st.done[d.k]; });
    return 'רשימת מסמכים לדוח השנתי ' + st.year + ' – מה עוד חסר לי:\n' + miss.map(function (d) { return '☐ ' + d.t; }).join('\n') + '\n\nהרשימה המלאה בחינם: https://hakelim.com/kelim/cheshbon/tik/';
  }
  $('tik-wa').addEventListener('click', function (e) { e.preventDefault(); CH.used('cheshbon_tik', 'wa'); var u = CH.wa(missingText()); if (window.kelimShort) window.kelimShort.go(u); else location.href = u; });
  $('tik-print').addEventListener('click', function () { CH.used('cheshbon_tik', 'print'); window.print(); });
  $('tik-reset') && $('tik-reset').addEventListener('click', function () { st.done = {}; st.ex = 0; save(); render(); });

  render();
  if (conn) loadInfo();
  else if (st.ex) $('tik-msg').textContent = 'דוגמה: סימנו כבר 106 ותרומות. סמנו מה יש לכם, והרשימה נשמרת בטלפון.';
})();
