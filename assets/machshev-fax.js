// חלופה לפקס, בחינם (/kelim/machshev/fax/).
// הכול בדפדפן: דף שער מצויר על canvas (עברית מימין לשמאל), כל צילום עובר "מצב סריקה" (שחור-לבן חד)
// ונכנס לעמוד A4 ב-pdf-lib, ו-PDF שהועלה מועתק כמו שהוא. אין שרת: השליחה היא שיתוף מהטלפון, מייל,
// או העלאה באתר הרשמי של המשרד. ת"ז לא נשמרת; שאר פרטי דף השער נשמרים בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('fx-go')) return;
  var KEY = 'kelim-machshev-fax';
  var LIB = '/assets/vendor/pdf-lib/pdf-lib.min.js';
  var A4 = [595.28, 841.89], MARGIN = 14, LIMIT = 4.5 * 1048576;
  var LEVELS = [[1750, 0.72], [1450, 0.62], [1150, 0.52], [900, 0.45], [700, 0.4]];

  // רק כתובות שנבדקו באתרים הרשמיים (09.11.2026).
  var TO = [
    { k: 'btl', n: 'ביטוח לאומי', s: 'שליחה ישירה לפקיד', dest: 'המוסד לביטוח לאומי', url: 'https://b2b.btl.gov.il/BTL.ILG.Payments/DocumentsInfo.aspx', go: 'לאתר ביטוח לאומי: שליחת מסמכים',
      how: 'בביטוח לאומי יש שירות "שליחת מסמכים באינטרנט ישירות לפקיד", בלי קוד ובלי סיסמה. מכינים כאן את הקובץ, נכנסים לשירות ומעלים אותו. בחינם.' },
    { k: 'shikum', n: 'אגף השיקום', s: 'משרד הביטחון', dest: 'משרד הביטחון – אגף השיקום', url: 'https://shikum.mod.gov.il/', go: 'לאתר אגף השיקום',
      how: 'באתר אגף השיקום לוחצים על "פנייה לאגף", מזדהים ומצרפים את הקובץ שהכלי מכין. אם הרכז או הפקיד נתנו לכם מייל, אפשר לשלוח גם אליו.' },
    { k: 'clalit', n: 'כללית', s: 'קופת חולים', dest: 'שירותי בריאות כללית', url: 'https://www.clalit.co.il/he/info/Pages/contact.aspx', go: 'לדף הפניות של כללית',
      how: 'בכללית שולחים מסמך דרך דף "יצירת קשר ופניות הציבור" או באפליקציה, ומצרפים את הקובץ שהכלי מכין.' },
    { k: 'maccabi', n: 'מכבי', s: 'קופת חולים', dest: 'מכבי שירותי בריאות', url: 'https://www.maccabi4u.co.il/', go: 'לאתר מכבי',
      how: 'במכבי נכנסים לאתר או לאפליקציה, לאזור האישי, ושם פונים ומצרפים את הקובץ שהכלי מכין.' },
    { k: 'meuhedet', n: 'מאוחדת', s: 'קופת חולים', dest: 'קופת חולים מאוחדת', url: 'https://www.meuhedet.co.il/', go: 'לאתר מאוחדת',
      how: 'במאוחדת נכנסים לאתר או לאפליקציה, לאזור האישי, ושם פונים ומצרפים את הקובץ שהכלי מכין.' },
    { k: 'leumit', n: 'לאומית', s: 'קופת חולים', dest: 'לאומית שירותי בריאות', url: 'https://www.leumit.co.il/', go: 'לאתר לאומית',
      how: 'בלאומית נכנסים לאתר או לאפליקציה, לאזור האישי, ושם פונים ומצרפים את הקובץ שהכלי מכין.' },
    { k: 'other', n: 'עירייה או משרד אחר', s: 'במייל', dest: '', url: '', go: '',
      how: 'רוב המשרדים והעיריות מקבלים מסמכים במייל. מבקשים מהפקיד כתובת מייל במקום מספר פקס, כותבים אותה למטה, והכלי פותח מייל מוכן.' }
  ];
  var DEMO = { to: 'btl', dest: 'המוסד לביטוח לאומי', subj: 'אישור מחלה לתביעה', name: 'ישראל ישראלי', phone: '050-0000000', ref: '', note: 'מצורף אישור מהרופא. אשמח לאישור שהמסמך התקבל. תודה!', email: '' };
  var FIELDS = ['dest', 'subj', 'name', 'phone', 'ref', 'note', 'email'];

  var st = null, first = false;
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!st || !st.to) { st = { to: 'btl', dest: DEMO.dest }; first = true; }
  // בכניסה הראשונה הדוגמה רק בתצוגה (placeholder), לא נשמרת כפרטים של המשתמש.
  function v(f) { return st[f] || (first ? DEMO[f] || '' : ''); }
  st.scan = st.scan !== false;
  function save() { if (first) return; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function cur() {
    if (st.to === 'hit' && st.hit) return hitTarget(st.hit);
    for (var i = 0; i < TO.length; i++) if (TO[i].k === st.to) return TO[i]; return TO[0];
  }
  // יעד שנמצא במאגר הפקסים (assets/machshev-fax-list.json)
  function hitTarget(h) {
    if (h.cat === 'btl') { var b = TO[0]; return { k: 'hit', n: h.n, s: '', dest: h.n, url: b.url, go: b.go, how: 'זה פקס של ' + h.n + '. ' + b.how }; }
    var how = 'זה פקס של ' + h.n + '. ';
    if (h.email) how += 'במקור הרשמי מופיע גם מייל: ' + h.email + '. הכלי יפתח מייל מוכן אליו.';
    else if (h.url) how += 'במקור הרשמי אין מייל, אבל יש אתר. שולחים דרכו, או מתקשרים ומבקשים מייל במקום פקס.';
    else how += 'במקור הרשמי מופיע רק פקס. מתקשרים ושואלים: "לאיזה מייל אפשר לשלוח במקום פקס?" ואם אין ברירה – FaxZero למטה.';
    return { k: 'hit', n: h.n, s: '', dest: h.n, url: h.url || '', go: 'לאתר הרשמי', how: how };
  }

  var items = [], busy = false, run = 0, url = null, result = null;
  function mb(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' מ״ב' : Math.max(1, Math.round(b / 1024)) + ' ק״ב'; }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function msg(t, cls) { var m = $('fx-msg'); m.textContent = t; m.className = cls || ''; }
  function bar(p) { $('fx-barw').hidden = p < 0; $('fx-bar').style.width = Math.max(0, p) + '%'; }
  function used(how, x) { if (window.toolUsed) { var d = { how: how, to: st.to }; for (var k in x || {}) d[k] = x[k]; window.toolUsed('machshev_fax', d); } }
  function today() { var d = new Date(); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function script(src) {
    return new Promise(function (ok, bad) {
      if (window.PDFLib) { ok(); return; }
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error('load')); };
      document.head.appendChild(s);
    });
  }
  function readBuf(b) {
    if (b.arrayBuffer) return b.arrayBuffer();
    return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = bad; r.readAsArrayBuffer(b); });
  }
  function toBlob(c, q) { return new Promise(function (ok, bad) { c.toBlob(function (b) { b ? ok(b) : bad(new Error('blob')); }, 'image/jpeg', q); }); }

  // ---------- דף השער ----------
  function wrap(x, text, maxW) {
    var words = String(text || '').split(/\s+/), lines = [], line = '';
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    return lines;
  }
  function pagesCount() { var n = 1; items.forEach(function (it) { n += it.pages || 1; }); return n; }
  function drawCover(c, W) {
    var H = Math.round(W * 1.4142), s = W / 620, x = c.getContext('2d');
    c.width = W; c.height = H;
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.direction = 'rtl'; x.textAlign = 'right'; x.textBaseline = 'alphabetic'; x.fillStyle = '#111';
    var R = W - 48 * s, L = 48 * s, F = 'Arial, "Segoe UI", sans-serif';
    x.font = 'bold ' + 40 * s + 'px ' + F; x.fillText('דף שער', R, 92 * s);
    x.font = 18 * s + 'px ' + F; x.fillStyle = '#555'; x.fillText('מסמכים לשליחה · ' + today(), R, 124 * s);
    x.fillStyle = '#111'; x.fillRect(L, 142 * s, R - L, 3 * s);
    var rows = [['אל', v('dest')], ['מאת', v('name')], ['ת״ז', idv()], ['טלפון לחזרה', v('phone')], ['מספר תיק', v('ref')], ['נושא', v('subj')], ['מספר עמודים', pagesCount() + ' (כולל דף זה)']];
    var y = 196 * s;
    rows.forEach(function (r) {
      if (!r[1] && r[0] !== 'ת״ז') return;
      x.font = 'bold ' + 21 * s + 'px ' + F; x.fillStyle = '#111'; x.fillText(r[0] + ':', R, y);
      x.font = 23 * s + 'px ' + F; x.fillText(r[1] || '_______________', R - 150 * s, y);
      x.fillStyle = '#ccc'; x.fillRect(L, y + 14 * s, R - L, 1 * s);
      y += 54 * s;
    });
    if (v('note')) {
      y += 14 * s;
      x.fillStyle = '#111'; x.font = 'bold ' + 21 * s + 'px ' + F; x.fillText('הודעה:', R, y); y += 36 * s;
      x.font = 22 * s + 'px ' + F;
      wrap(x, v('note'), R - L - 20 * s).slice(0, 8).forEach(function (l) { x.fillText(l, R, y); y += 34 * s; });
    }
    x.fillStyle = '#777'; x.font = 15 * s + 'px ' + F; x.textAlign = 'center';
    x.fillText('הוכן בחינם ב"הכלים של גילעד רחמים" · hakelim.com/kelim', W / 2, H - 34 * s);
    return c;
  }
  function idv() { return ($('fx-id').value || '').replace(/[^\d]/g, '').slice(0, 9); }
  function preview() { drawCover($('fx-cover'), 620); }

  // ---------- עמוד דוגמה ----------
  function demoPage() {
    var c = document.createElement('canvas'), W = 1240, H = 1754, x = c.getContext('2d'), F = 'Arial, sans-serif';
    c.width = W; c.height = H; x.fillStyle = '#f4f1ea'; x.fillRect(0, 0, W, H);
    x.direction = 'rtl'; x.textAlign = 'right'; x.fillStyle = '#222';
    x.font = 'bold 64px ' + F; x.fillText('אישור רפואי', 1140, 200);
    x.font = '36px ' + F; x.fillStyle = '#444';
    ['זו דוגמה בלבד.', 'כאן יופיע הצילום של המסמך שלכם:', 'אישור מחלה, טופס, קבלה או מכתב.', '', 'מוחקים את הדוגמה (✕)', 'ומצלמים את העמודים שלכם.'].forEach(function (l, i) { x.fillText(l, 1140, 330 + i * 70); });
    x.strokeStyle = '#999'; x.lineWidth = 4; x.strokeRect(100, 900, 1040, 500);
    x.textAlign = 'center'; x.fillStyle = '#999'; x.font = '40px ' + F; x.fillText('חתימה וחותמת', 620, 1170);
    return c;
  }

  // ---------- עמודים ----------
  function loadImg(f) {
    if (window.createImageBitmap) return createImageBitmap(f, { imageOrientation: 'from-image' }).catch(function () { return viaImg(f); });
    return viaImg(f);
  }
  function viaImg(f) {
    return new Promise(function (ok, bad) {
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () { ok(im); }; im.onerror = function () { URL.revokeObjectURL(u); bad(new Error('decode')); };
      im.src = u;
    });
  }
  // "מצב סריקה": אפור, ואז מתיחת ניגודיות כך שהרקע נהיה לבן והכתב שחור.
  function scanify(x, w, h) {
    var d = x.getImageData(0, 0, w, h), p = d.data, hist = new Uint32Array(256), n = w * h, i, v;
    for (i = 0; i < p.length; i += 4) { v = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) | 0; p[i] = v; hist[v]++; }
    var acc = 0, lo = 0, hi = 255;
    for (i = 0; i < 256; i++) { acc += hist[i]; if (acc > n * 0.02) { lo = i; break; } }
    acc = 0; for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc > n * 0.35) { hi = i; break; } }
    if (hi - lo < 40) { lo = Math.max(0, hi - 120); }
    var k = 255 / Math.max(1, (hi - 12) - lo);
    for (i = 0; i < p.length; i += 4) { v = (p[i] - lo) * k; v = v < 0 ? 0 : v > 255 ? 255 : v; p[i] = p[i + 1] = p[i + 2] = v; }
    x.putImageData(d, 0, 0);
  }
  function jpeg(it, side, q) {
    var src = it.demo ? Promise.resolve(demoPage()) : loadImg(it.f);
    return src.then(function (im) {
      var w0 = im.width || im.naturalWidth, h0 = im.height || im.naturalHeight;
      var k = Math.min(1, side / Math.max(w0, h0)), w = Math.round(w0 * k), h = Math.round(h0 * k);
      var rot = it.rot % 360, swap = rot === 90 || rot === 270;
      var c = document.createElement('canvas'); c.width = swap ? h : w; c.height = swap ? w : h;
      var x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.save(); x.translate(c.width / 2, c.height / 2); x.rotate(rot * Math.PI / 180);
      x.imageSmoothingQuality = 'high'; x.drawImage(im, -w / 2, -h / 2, w, h); x.restore();
      if (im.close) im.close();
      if (st.scan && !it.demo) scanify(x, c.width, c.height);
      return toBlob(c, q).then(function (b) { var r = { b: b, w: c.width, h: c.height }; c.width = c.height = 0; return r; });
    });
  }
  function addJpg(doc, blob, w, h) {
    return readBuf(blob).then(function (buf) { return doc.embedJpg(buf); }).then(function (img) {
      var land = w > h, pw = land ? A4[1] : A4[0], ph = land ? A4[0] : A4[1];
      var k = Math.min((pw - 2 * MARGIN) / w, (ph - 2 * MARGIN) / h), dw = w * k, dh = h * k;
      doc.addPage([pw, ph]).drawImage(img, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
    });
  }
  function build(lv, my, tryNo) {
    var L = window.PDFLib, side = LEVELS[lv][0], q = LEVELS[lv][1], doc, cv = document.createElement('canvas');
    return L.PDFDocument.create().then(function (d) {
      doc = d; drawCover(cv, 1240);
      return toBlob(cv, 0.85).then(function (b) { cv.width = cv.height = 0; return addJpg(doc, b, 1240, 1754); });
    }).then(function () {
      var i = 0;
      return (function next() {
        if (my !== run) throw new Error('stop');
        if (i >= items.length) return;
        var it = items[i];
        msg((tryNo > 1 ? 'מקטין עוד כדי שהקובץ ייכנס (ניסיון ' + tryNo + ') – ' : '') + 'מסמך ' + (i + 1) + ' מתוך ' + items.length + '…');
        var step = it.pdf ? readBuf(it.f).then(function (buf) { return L.PDFDocument.load(buf, { ignoreEncryption: true }); }).then(function (src) {
          return doc.copyPages(src, src.getPageIndices()).then(function (pp) { pp.forEach(function (p) { doc.addPage(p); }); });
        }) : jpeg(it, side, q).then(function (r) { return addJpg(doc, r.b, r.w, r.h); });
        return step.then(function () { i++; bar(Math.round(i / items.length * 100)); }).then(next);
      })();
    }).then(function () { return doc.save(); });
  }

  function go() {
    if (busy) return;
    if (!items.length) { msg('צריך להוסיף לפחות עמוד אחד (שלב 3).', 'pd-err'); $('fx-box').hidden = false; return; }
    busy = true; var my = ++run; result = null;
    if (url) { URL.revokeObjectURL(url); url = null; }
    $('fx-box').hidden = false; $('fx-out').hidden = true; drawUI(); bar(0); msg('מכין…');
    var lv = 0, tryNo = 0, bytes;
    script(LIB).then(function attempt() {
      tryNo++;
      return build(lv, my, tryNo).then(function (b) {
        bytes = b;
        if (b.length > LIMIT && lv < LEVELS.length - 1 && items.some(function (it) { return !it.pdf; })) { lv++; return attempt(); }
      });
    }).then(function () {
      var d = new Date(), name = 'mismach-' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + '.pdf';
      var blob = new Blob([bytes], { type: 'application/pdf' });
      result = { blob: blob, file: new File([blob], name, { type: 'application/pdf' }), name: name };
      url = URL.createObjectURL(blob);
      bar(-1); $('fx-out').hidden = false;
      $('fx-size').textContent = 'הקובץ מוכן: ' + pagesCount() + ' עמודים · ' + mb(blob.size);
      msg(items.some(function (it) { return it.demo; }) ? 'זה קובץ דוגמה. כדי לשלוח באמת: מוחקים את הדוגמה ומצלמים את המסמך שלכם.' : 'מה עכשיו? לבחור איך לשלוח:', 'pd-ok');
      sendButtons();
      used('build', { pages: pagesCount(), mb: +(blob.size / 1048576).toFixed(1), lv: lv, demo: items.some(function (it) { return it.demo; }) ? 1 : 0 });
    }).catch(function (e) {
      if (my !== run) return;
      bar(-1);
      var m = e && e.message || '';
      if (/load/.test(m)) msg('לא הצלחתי לטעון את הכלי. לבדוק שיש אינטרנט ולנסות שוב.', 'pd-err');
      else if (/decode/.test(m)) msg('אחת התמונות לא נפתחה. אם זו תמונת HEIC מאייפון – לבחור אותה דרך "ספריית התמונות".', 'pd-err');
      else if (/encrypt|password|parse|PDF/i.test(m)) msg('אחד מקובצי ה-PDF נעול או פגום. לצלם אותו מהמסך או להדפיס ולצלם.', 'pd-err');
      else msg('משהו נתקע באמצע (אולי יותר מדי עמודים לטלפון). לנסות עם פחות עמודים, או במחשב.', 'pd-err');
    }).then(function () { if (my === run) { busy = false; drawUI(); } });
  }
  function canShare(f) { try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [f] })); } catch (e) { return false; } }
  function mailBody() {
    return 'שלום,\n\nמצורף מסמך' + (st.subj ? ' בנושא: ' + st.subj : '') + '.\n' + (st.ref ? 'מספר תיק: ' + st.ref + '\n' : '') +
      (st.name ? 'שם: ' + st.name + '\n' : '') + (st.phone ? 'טלפון לחזרה: ' + st.phone + '\n' : '') + (st.note ? '\n' + st.note + '\n' : '') + '\nתודה.';
  }
  function copy(t) { try { if (navigator.clipboard) return navigator.clipboard.writeText(t).catch(function () {}); } catch (e) {} return Promise.resolve(); }
  function sendButtons() {
    var t = cur(), em = (st.email || '').trim(), h = [];
    if (canShare(result.file)) h.push('<button class="btn btn-gold" type="button" data-s="share">📤 לשלוח מהטלפון (מייל, ווטסאפ…)</button>');
    if (t.url) h.push('<a class="btn ' + (h.length ? 'btn-line' : 'btn-gold') + '" data-s="site" href="' + t.url + '" target="_blank" rel="noopener">🏛️ ' + esc(t.go) + '</a>');
    if (em) h.push('<a class="btn btn-line" data-s="mail" href="mailto:' + encodeURIComponent(em).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(st.subj || 'מסמכים לשליחה') + '&body=' + encodeURIComponent(mailBody()) + '">✉️ לפתוח מייל מוכן ל-' + esc(em) + '</a>');
    h.push('<a class="btn btn-line" data-s="download" href="' + url + '" download="' + result.name + '">⬇️ להוריד את הקובץ</a>');
    $('fx-send').innerHTML = h.join('') + '<p class="note">' + (em ? 'במייל: להוריד קודם את הקובץ, ואז לצרף אותו (📎). ' : '') +
      (t.url ? 'באתר: להוריד את הקובץ, ובאתר לבחור אותו בכפתור ההעלאה.' : (em ? '' : 'אין מייל? לכתוב בשלב 1 את המייל שהפקיד נתן, והכלי יפתח מייל מוכן.')) + '</p>';
  }
  $('fx-send').addEventListener('click', function (e) {
    var b = e.target.closest('[data-s]'); if (!b || !result) return;
    var s = b.getAttribute('data-s');
    if (s === 'share') {
      var em = (st.email || '').trim();
      copy(em).then(function () {
        navigator.share({ files: [result.file], title: st.subj || 'מסמכים', text: mailBody() }).catch(function () {});
      });
      if (em) msg('כתובת המייל הועתקה – להדביק אותה בשדה "אל".', 'pd-ok');
    }
    used(s);
  });
  $('fx-fz').addEventListener('click', function () { used('faxzero'); });

  // ---------- ממשק ----------
  function stale() { if (result || busy) { run++; busy = false; result = null; $('fx-out').hidden = true; msg('שיניתם משהו – ללחוץ שוב על "להכין קובץ לשליחה".'); } }
  function drawTo() {
    $('fx-to').innerHTML = TO.map(function (t) { return '<button type="button" data-k="' + t.k + '" aria-pressed="' + (t.k === st.to) + '"><b>' + t.n + '</b><small>' + t.s + '</small></button>'; }).join('');
    var t = cur();
    $('fx-how').innerHTML = esc(t.how) + (t.url ? ' <a href="' + esc(t.url) + '" target="_blank" rel="noopener">' + esc(t.go) + ' ←</a>' : '') +
      (st.to === 'hit' && st.hit && st.hit.src ? '<br><span class="fx-src">המקור: <a href="' + esc(st.hit.src) + '" target="_blank" rel="noopener">הדף הרשמי</a> · נבדק ' + esc(st.hit.checked || '') + '</span>' : '');
  }

  // ---------- חיפוש לפי מספר הפקס ----------
  var DB = null, dbP = null, hits = [], lookSent = '';
  function loadDB() {
    if (!dbP) dbP = fetch('/assets/machshev-fax-list.json').then(function (r) { if (!r.ok) throw new Error('db'); return r.json(); })
      .then(function (d) { DB = d; return d; }).catch(function (e) { dbP = null; throw e; });
    return dbP;
  }
  function onlyDigits(s) { var d = String(s || '').replace(/\D/g, ''); if (d.indexOf('972') === 0) d = '0' + d.slice(3); return d; }
  function norm(s) { return String(s || '').replace(/["'״׳\-–,.()]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function search(q) {
    var d = onlyDigits(q), out = [];
    if (d.length >= 5) {
      DB.forEach(function (r) {
        var best = 0;
        r.fax.forEach(function (f) { if (f === d) best = 3; else if (best < 2 && f.indexOf(d) === 0) best = 2; else if (best < 1 && f.indexOf(d) > 0) best = 1; });
        if (best) out.push([best, r]);
      });
    } else {
      var words = norm(q).split(' ').filter(function (w) { return w.length > 1; });
      if (!words.length) return [];
      DB.forEach(function (r) { var n = norm(r.n); if (words.every(function (w) { return n.indexOf(w) >= 0; })) out.push([1, r]); });
    }
    out.sort(function (a, b) { return b[0] - a[0]; });
    return out.map(function (x) { return x[1]; });
  }
  function drawHits() {
    var q = $('fx-fax').value, d = onlyDigits(q), box = $('fx-hits');
    if (!q.trim() || (d.length && d.length < 5 && d.length === q.replace(/[\s\-]/g, '').length)) { box.innerHTML = ''; return; }
    if (!DB) { box.innerHTML = '<p class="note">מחפש במאגר…</p>'; return; }
    hits = search(q);
    var full = d.length >= 9;
    askLink();
    if (!hits.length) {
      if (!full) { box.innerHTML = d.length >= 5 ? '' : '<div class="fx-miss"><b>לא מצאתי משרד בשם הזה.</b> נסו לכתוב את מספר הפקס עצמו.</div>'; return; }
      var g = 'https://www.google.com/search?q=' + encodeURIComponent('"' + pretty(d) + '" מייל OR דוא"ל');
      box.innerHTML = '<div class="fx-miss"><b>המספר ' + pretty(d) + ' עוד לא במאגר.</b> ככה ממשיכים:<ol>' +
        '<li><b>מחפשים באינטרנט את המייל.</b><br><a class="btn btn-line" data-s="google" href="' + g + '" target="_blank" rel="noopener">🔎 לחפש בגוגל מייל למספר הזה</a><br>' +
        '<span class="note">להעתיק מייל רק מהאתר הרשמי של המשרד (למשל gov.il, ‎.muni.il, האתר של הקופה או החברה), לא מאתרי מדריכים.</span>' +
        '<div class="field"><label for="fx-paste">מצאתם? הדביקו כאן את המייל</label><input id="fx-paste" type="email" dir="ltr" maxlength="80" placeholder="name@example.gov.il"></div></li>' +
        '<li><b>לא מצאתם?</b> מתקשרים למשרד ושואלים: "לאיזה מייל אפשר לשלוח במקום פקס?"</li>' +
        '<li><b>אין מייל בכלל?</b> <a href="#fx-back" data-s="tofax">שולחים פקס אמיתי ↓</a></li></ol></div>';
      track(d, 0);
      return;
    }
    var more = hits.length > 8 ? '<p class="note">יש עוד ' + (hits.length - 8) + ' – להמשיך להקליד כדי לצמצם.</p>' : '';
    box.innerHTML = hits.slice(0, 8).map(function (r, i) {
      var how = r.cat === 'btl' ? esc('שליחה בחינם באתר ביטוח לאומי') : r.email ? '✉️ <bdi dir="ltr">' + esc(r.email) + '</bdi>' : r.url ? 'יש אתר רשמי' : 'במקור רק פקס';
      return '<button type="button" class="fx-hit" data-h="' + i + '" aria-pressed="' + (st.to === 'hit' && st.hit && st.hit.n === r.n) + '"><b>' + esc(r.n) + '</b><small>' + how + ' · פקס <bdi dir="ltr">' + esc(r.fax.map(pretty).join(', ')) + '</bdi></small></button>';
    }).join('') + more;
    if (full) track(d, 1);
  }
  function pretty(f) { return f.length === 10 ? f.slice(0, 3) + '-' + f.slice(3) : f.slice(0, 2) + '-' + f.slice(2); }
  // הכפתור "לכתוב לגילעד" בסעיף הפקס האמיתי, עם המספר שהוקלד
  function askLink() {
    var d = onlyDigits($('fx-fax').value), a = $('fx-ask'); if (!a) return;
    var t = 'שלום גילעד, אני צריך לשלוח פקס דחוף ל-' + (d.length >= 9 ? pretty(d) : '____') + ', ולא מצאתי מייל.\nעד מתי זה צריך להגיע: ____';
    a.href = 'https://wa.me/972584049049?text=' + encodeURIComponent(t);
  }
  function track(d, found) { if (lookSent === d) return; lookSent = d; used('lookup', { found: found }); }
  $('fx-fax').addEventListener('input', function () {
    if (!DB) loadDB().then(drawHits, function () { $('fx-hits').innerHTML = '<p class="pd-err">לא הצלחתי לטעון את המאגר. לבדוק שיש אינטרנט ולנסות שוב.</p>'; });
    drawHits();
  });
  $('fx-hits').addEventListener('input', function (e) {
    if (e.target.id !== 'fx-paste') return;
    var em = e.target.value.trim();
    st.email = em; $('fx-email').value = em; first = false; save(); stale();
    if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(em) && st.pasteSent !== em) { st.pasteSent = em; used('paste_email'); }
  });
  if ($('fx-ask')) { askLink(); $('fx-ask').addEventListener('click', function () { used('ask_gilad'); }); }
  $('fx-hits').addEventListener('click', function (e) {
    var s = e.target.closest('[data-s]'); if (s) { used(s.getAttribute('data-s')); return; }
    var b = e.target.closest('[data-h]'); if (!b) return;
    var r = hits[+b.getAttribute('data-h')]; if (!r) return;
    var old = cur();
    st.to = 'hit'; st.hit = { n: r.n, cat: r.cat, email: r.email, url: r.url, src: r.src, checked: r.checked };
    if (!st.dest || st.dest === old.dest) { st.dest = r.n; $('fx-dest').value = r.n; }
    if (r.email) { st.email = r.email; $('fx-email').value = r.email; }
    first = false; save(); stale(); drawTo(); drawHits(); preview();
    used('pick', { found: 1, cat: r.cat });
    $('fx-how').scrollIntoView({ block: 'nearest' });
  });
  function drawUI() {
    $('fx-go').disabled = busy;
    $('fx-go').textContent = busy ? 'מכין…' : 'להכין קובץ לשליחה (' + pagesCount() + ' עמודים)';
    var n = items.length;
    $('fx-list').innerHTML = items.map(function (it, i) {
      var th = it.pdf || it.demo ? '<span class="tz-th">' + (it.demo ? '📝' : '📄') + '</span>' : '<span class="tz-th"><img src="' + it.u + '" alt="" style="transform:rotate(' + it.rot + 'deg)"></span>';
      return '<li>' + th + '<span><span class="pg">' + (it.pdf ? 'קובץ PDF' : 'עמוד') + ' ' + (i + 1) + '</span>' +
        (it.demo ? '<span class="fx-demo">דוגמה – למחוק ולצלם את שלכם</span>' : '<span class="nm">' + esc(it.f.name) + '</span>') +
        '<span class="tz-bt"><button type="button" data-a="up" data-i="' + i + '" aria-label="להזיז למעלה"' + (i ? '' : ' disabled') + '>▲</button>' +
        '<button type="button" data-a="down" data-i="' + i + '" aria-label="להזיז למטה"' + (i < n - 1 ? '' : ' disabled') + '>▼</button>' +
        (it.pdf ? '' : '<button type="button" data-a="rot" data-i="' + i + '" aria-label="לסובב">⟳ לסובב</button>') +
        '<button type="button" data-a="del" data-i="' + i + '" aria-label="להוריד">✕</button></span></span></li>';
    }).join('');
    preview();
  }
  function add(list) {
    var fl = [].slice.call(list || []), got = 0;
    items = items.filter(function (it) { return !it.demo; });
    fl.forEach(function (f) {
      if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
        got++; var it = { f: f, pdf: true, pages: 1, rot: 0 }; items.push(it);
        // מספר העמודים לדף השער
        script(LIB).then(function () { return readBuf(f); }).then(function (b) { return window.PDFLib.PDFDocument.load(b, { ignoreEncryption: true }); })
          .then(function (d) { it.pages = d.getPageCount(); drawUI(); }).catch(function () {});
      } else if (/^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name)) {
        got++; items.push({ f: f, u: URL.createObjectURL(f), rot: 0, pages: 1 });
      }
    });
    if (got) { if (first) { first = false; save(); } used('add', { n: got }); }
    stale(); drawUI();
  }
  function fill() {
    FIELDS.forEach(function (f) { $('fx-' + f).value = st[f] || ''; if (DEMO[f] && f !== 'dest' && f !== 'note') $('fx-' + f).placeholder = 'למשל: ' + DEMO[f]; });
    $('fx-scan').checked = st.scan;
  }
  FIELDS.forEach(function (f) {
    $('fx-' + f).addEventListener('input', function () { st[f] = this.value; first = false; save(); stale(); preview(); if (f === 'email' && result) sendButtons(); });
  });
  $('fx-id').addEventListener('input', function () { stale(); preview(); });
  $('fx-scan').addEventListener('change', function () { st.scan = this.checked; save(); stale(); });
  $('fx-to').addEventListener('click', function (e) {
    var b = e.target.closest('[data-k]'); if (!b) return;
    var old = cur(); st.to = b.getAttribute('data-k'); var t = cur();
    if (!st.dest || st.dest === old.dest) { st.dest = t.dest; $('fx-dest').value = t.dest; }
    save(); stale(); drawTo(); preview();
    used('to');
    if (t.k === 'other') $('fx-email').focus();
  });
  $('fx-file').addEventListener('change', function () { add(this.files); this.value = ''; });
  $('fx-cam').addEventListener('change', function () { add(this.files); this.value = ''; });
  $('fx-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var i = +b.getAttribute('data-i'), a = b.getAttribute('data-a'), t;
    if (a === 'up' && i > 0) { t = items[i - 1]; items[i - 1] = items[i]; items[i] = t; }
    else if (a === 'down' && i < items.length - 1) { t = items[i + 1]; items[i + 1] = items[i]; items[i] = t; }
    else if (a === 'rot') items[i].rot = (items[i].rot + 90) % 360;
    else if (a === 'del') { if (items[i].u) URL.revokeObjectURL(items[i].u); items.splice(i, 1); }
    stale(); drawUI();
  });
  $('fx-go').addEventListener('click', go);

  if (first) items.push({ demo: true, rot: 0, pages: 1 });
  fill(); drawTo(); drawUI();
})();
