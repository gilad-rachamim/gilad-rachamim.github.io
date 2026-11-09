// הקטנת PDF (/kelim/machshev/pdf/).
// הכול בדפדפן: PDF.js מצייר כל עמוד על canvas, שומרים אותו כ-JPEG, ו-pdf-lib בונה ממנו PDF חדש.
// הספריות הן עותק מקומי ב-assets/vendor ונטענות רק כשבוחרים קובץ. שום דבר לא עולה לשרת.
// נשמרים בטלפון רק הגודל והאיכות שבחרו (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var inp = $('pd-file');
  if (!inp) return;
  var KEY = 'kelim-machshev-pdf';
  var V = '/assets/vendor/';
  var NOTES = { 90: 'הכי קל. טוב לטופס באינטרנט שמגביל גודל (למשל עד 2 מגה).', 130: 'מספיק כמעט לכל מסמך: קריא, ועדיין קל.', 180: 'לאותיות קטנות ולחתימות. שוקל יותר.' };
  var st = { d: 130, q: 65, l: 0 };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) { if (NOTES[sv.d]) st.d = sv.d; if (sv.q >= 40 && sv.q <= 90) st.q = sv.q; if ([0, 1, 2, 5].indexOf(sv.l) > -1) st.l = sv.l; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var file = null, result = null, url = null, busy = false, run = 0;

  function mb(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' מ״ב' : Math.max(1, Math.round(b / 1024)) + ' ק״ב'; }
  function script(src) {
    return new Promise(function (ok, bad) {
      if (document.querySelector('script[src="' + src + '"]')) { ok(); return; }
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error('load')); };
      document.head.appendChild(s);
    });
  }
  var libs = null;
  function loadLibs() {
    if (!libs) libs = Promise.all([script(V + 'pdfjs/pdf.min.js'), script(V + 'pdf-lib/pdf-lib.min.js')]).then(function () {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = V + 'pdfjs/pdf.worker.min.js';
    });
    libs.catch(function () { libs = null; });
    return libs;
  }
  function msg(t, cls) { var m = $('pd-msg'); m.textContent = t; m.className = cls || ''; }
  function bar(p) { $('pd-barw').hidden = p < 0; $('pd-bar').style.width = Math.max(0, p) + '%'; }
  function drawUI() {
    [].forEach.call($('pd-size').children, function (b) { b.setAttribute('aria-selected', String(+b.getAttribute('data-d') === st.d)); });
    $('pd-snote').textContent = NOTES[st.d];
    [].forEach.call($('pd-lim').children, function (b) { b.setAttribute('aria-selected', String(+b.getAttribute('data-l') === st.l)); });
    $('pd-q').value = st.q; $('pd-qv').textContent = st.q;
    $('pd-go').disabled = !file || busy;
    $('pd-go').textContent = busy ? 'מקטין…' : (result ? 'להקטין שוב בהגדרות האלה' : 'להקטין');
  }
  function toBlob(c, q) { return new Promise(function (ok, bad) { c.toBlob(function (b) { b ? ok(b) : bad(new Error('blob')); }, 'image/jpeg', q); }); }
  function readBuf(b) {
    if (b.arrayBuffer) return b.arrayBuffer();
    return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = bad; r.readAsArrayBuffer(b); });
  }

  // מדרגות [DPI, איכות] כשיש מגבלת גודל: מתחילים ממה שבחרו ויורדים עד שהקובץ נכנס.
  var LADDER = [[180, 80], [150, 70], [130, 65], [110, 55], [90, 50], [75, 42], [60, 35], [50, 30]];
  function build(src, n, d, q, my, tryNo) {
    var out;
    return window.PDFLib.PDFDocument.create().then(function (o) {
      out = o;
      var i = 0;
      return (function next() {
        if (my !== run) throw new Error('stop');
        if (++i > n) return;
        msg((tryNo > 1 ? 'מקטין עוד כדי להיכנס במגבלה (ניסיון ' + tryNo + ') – ' : '') + 'עמוד ' + i + ' מתוך ' + n + '…');
        var page;
        return src.getPage(i).then(function (p) {
          page = p;
          var v1 = p.getViewport({ scale: 1 });
          var k = d / 72, lim = 4200 / Math.max(v1.width, v1.height); // תקרה כדי שטלפון לא ייתקע בעמוד ענק
          var vp = p.getViewport({ scale: Math.min(k, lim) });
          var c = document.createElement('canvas');
          c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
          return p.render({ canvasContext: x, viewport: vp }).promise.then(function () { return toBlob(c, q / 100); }).then(function (b) {
            c.width = c.height = 0; // משחררים זיכרון בטלפון
            return readBuf(b);
          }).then(function (jb) { return out.embedJpg(jb); }).then(function (img) {
            var pg = out.addPage([v1.width, v1.height]);
            pg.drawImage(img, { x: 0, y: 0, width: v1.width, height: v1.height });
            page.cleanup(); bar(Math.round(i / n * 100));
          });
        }).then(next);
      })();
    }).then(function () { return out.save(); });
  }
  function shrink() {
    if (!file || busy) return;
    busy = true; var my = ++run; result = null; $('pd-out').hidden = true;
    if (url) { URL.revokeObjectURL(url); url = null; }
    drawUI(); bar(0); msg('טוען…');
    var src, n = 0, bytes, tryNo = 0, used = [st.d, st.q];
    var limB = st.l ? st.l * 1048576 * 0.97 : 0;
    var steps = [[st.d, st.q]].concat(LADDER.filter(function (s) { return s[0] <= st.d && (s[0] < st.d || s[1] < st.q); }));
    loadLibs().then(function () { return readBuf(file); }).then(function (buf) {
      return window.pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
    }).then(function (doc) {
      src = doc; n = doc.numPages;
      return (function attempt() {
        var s = steps[tryNo++]; used = s;
        return build(src, n, s[0], s[1], my, tryNo).then(function (b) {
          bytes = b;
          if (limB && b.length > limB && tryNo < steps.length) {
            // קפיצה חכמה: גודל JPEG בערך יחסי לשטח (DPI בריבוע) ולאיכות. מדלגים ישר למדרגה שאמורה להיכנס.
            var j = tryNo;
            while (j < steps.length - 1 && b.length * Math.pow(steps[j][0] / s[0], 2) * (steps[j][1] / s[1]) > limB * 0.9) j++;
            tryNo = j;
            return attempt();
          }
        });
      })();
    }).then(function () {
      src.destroy();
      var name = (file.name || 'mismach').replace(/\.pdf$/i, '') + '-katan.pdf';
      var blob = new Blob([bytes], { type: 'application/pdf' });
      result = { blob: blob, file: new File([blob], name, { type: 'application/pdf' }), n: n };
      url = URL.createObjectURL(blob);
      $('pd-dl').href = url; $('pd-dl').setAttribute('download', name);
      $('pd-share').hidden = !canShare([result.file]);
      $('pd-out').hidden = false; bar(-1);
      var a = file.size, b = blob.size;
      $('pd-size-out').innerHTML = '<s>' + mb(a) + '</s> ← ' + mb(b);
      if (limB && b > limB) msg('גם בגודל הכי קטן הקובץ יצא ' + mb(b) + '. אפשר לשלוח בשני חלקים, או לבחור מגבלה גדולה יותר.', 'pd-err');
      else if (b < a) msg(n + ' עמודים. חיסכון של ' + Math.round((1 - b / a) * 100) + '%.' + (limB ? ' נכנס במגבלה של ' + st.l + ' מ״ב.' + (tryNo > 1 ? ' (הכלי הוריד חדות לבד כדי להיכנס.)' : '') : (b > 2 * 1048576 && st.d !== 90 ? ' עדיין כבד לטופס? לבחור למעלה "עד 2 מ״ב".' : '')), 'pd-ok');
      else msg('הקובץ המקורי כבר היה קל יותר. עדיף לשלוח אותו כמו שהוא.', 'pd-err');
      if (window.toolUsed) window.toolUsed('machshev_pdf', { how: 'shrink', pages: n, d: used[0], q: used[1], l: st.l, tries: tryNo, pct: Math.round((1 - b / a) * 100) });
    }).catch(function (e) {
      if (my !== run) return;
      bar(-1);
      var t = String(e && (e.name || '') + ' ' + (e.message || ''));
      if (/Password/i.test(t)) msg('הקובץ נעול בסיסמה. צריך לפתוח אותו קודם, ואז להקטין.', 'pd-err');
      else if (/load/.test(t)) msg('לא הצלחתי לטעון את הכלי. לבדוק שיש אינטרנט ולנסות שוב.', 'pd-err');
      else if (/Invalid|PDF/i.test(t)) msg('זה לא נראה כמו קובץ PDF תקין. לנסות לבחור אותו שוב.', 'pd-err');
      else msg('משהו נתקע באמצע (אולי הקובץ גדול מדי לטלפון). לנסות "קטן", או במחשב.', 'pd-err');
    }).then(function () { if (my === run) { busy = false; drawUI(); } });
  }
  function canShare(fl) { try { return !!(navigator.canShare && navigator.canShare({ files: fl })); } catch (e) { return false; } }

  inp.addEventListener('change', function () {
    var f = inp.files && inp.files[0];
    if (!f) return;
    run++; busy = false; file = f; result = null;
    $('pd-box').hidden = false; $('pd-out').hidden = true; bar(-1);
    $('pd-name').textContent = f.name;
    $('pd-size-out').textContent = mb(f.size);
    msg('');
    loadLibs().catch(function () {});
    shrink();
  });
  $('pd-go').addEventListener('click', shrink);
  $('pd-lim').addEventListener('click', function (e) { var b = e.target.closest('[data-l]'); if (!b) return; st.l = +b.getAttribute('data-l'); save(); drawUI(); if (file && result) shrink(); });
  $('pd-size').addEventListener('click', function (e) { var b = e.target.closest('[data-d]'); if (!b) return; st.d = +b.getAttribute('data-d'); save(); drawUI(); if (file && result) shrink(); });
  $('pd-q').addEventListener('input', function () { st.q = +this.value; $('pd-qv').textContent = st.q; save(); });
  $('pd-q').addEventListener('change', function () { if (file && result) shrink(); });
  $('pd-dl').addEventListener('click', function () { if (window.toolUsed) window.toolUsed('machshev_pdf', { how: 'download' }); });
  $('pd-share').addEventListener('click', function () {
    if (!result) return;
    navigator.share({ files: [result.file] }).catch(function () {});
    if (window.toolUsed) window.toolUsed('machshev_pdf', { how: 'share' });
  });
  drawUI();
})();
