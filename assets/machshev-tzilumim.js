// מצילומים ל-PDF אחד (/kelim/machshev/tzilumim/).
// הכול בדפדפן: כל תמונה מצוירת על canvas (עם הסיבוב שבחרו), נשמרת כ-JPEG ונכנסת לעמוד A4 ב-pdf-lib.
// יש "מגבלת גודל": אם הקובץ יוצא גדול מהמגבלה, בונים שוב במדרגה קטנה יותר, עד שהוא נכנס.
// pdf-lib הוא עותק מקומי ב-assets/vendor ונטען רק כשבונים. נשמרים בטלפון רק המגבלה והחדות (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('tz-file')) return;
  var KEY = 'kelim-machshev-tzilumim';
  var LIB = '/assets/vendor/pdf-lib/pdf-lib.min.js';
  // מדרגות: [הצד הארוך בנקודות, איכות JPEG]. "חדה" מתחילה ב-1, "רגילה" ב-3.
  var LEVELS = [[2200, 0.8], [1800, 0.72], [1600, 0.66], [1400, 0.6], [1200, 0.55], [1000, 0.5], [850, 0.45], [700, 0.4], [560, 0.35]];
  var A4 = [595.28, 841.89], MARGIN = 14;
  var st = { l: 2, q: 3 };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) { if ([0, 1, 2, 5].indexOf(sv.l) > -1) st.l = sv.l; if (sv.q === 1 || sv.q === 3) st.q = sv.q; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var items = [], busy = false, run = 0, url = null, result = null, seq = 0;

  function mb(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' מ״ב' : Math.max(1, Math.round(b / 1024)) + ' ק״ב'; }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function msg(t, cls) { var m = $('tz-msg'); m.textContent = t; m.className = cls || ''; }
  function bar(p) { $('tz-barw').hidden = p < 0; $('tz-bar').style.width = Math.max(0, p) + '%'; }
  function script(src) {
    return new Promise(function (ok, bad) {
      if (window.PDFLib) { ok(); return; }
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error('load')); };
      document.head.appendChild(s);
    });
  }
  function load(f) {
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
  function readBuf(b) {
    if (b.arrayBuffer) return b.arrayBuffer();
    return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = bad; r.readAsArrayBuffer(b); });
  }
  // תמונה אחת -> JPEG מוקטן ומסובב
  function jpeg(it, side, q) {
    return load(it.f).then(function (im) {
      var w0 = im.width || im.naturalWidth, h0 = im.height || im.naturalHeight;
      var k = Math.min(1, side / Math.max(w0, h0)), w = Math.round(w0 * k), h = Math.round(h0 * k);
      var rot = it.rot % 360, swap = rot === 90 || rot === 270;
      var c = document.createElement('canvas'); c.width = swap ? h : w; c.height = swap ? w : h;
      var x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.translate(c.width / 2, c.height / 2); x.rotate(rot * Math.PI / 180);
      x.imageSmoothingQuality = 'high';
      x.drawImage(im, -w / 2, -h / 2, w, h);
      if (im.close) im.close();
      return new Promise(function (ok, bad) {
        c.toBlob(function (b) { var cw = c.width, ch = c.height; c.width = c.height = 0; b ? ok({ b: b, w: cw, h: ch }) : bad(new Error('blob')); }, 'image/jpeg', q);
      });
    });
  }
  function build(lv, my, tryNo) {
    var L = window.PDFLib, side = LEVELS[lv][0], q = LEVELS[lv][1], doc;
    return L.PDFDocument.create().then(function (d) {
      doc = d; var i = 0;
      return (function next() {
        if (my !== run) throw new Error('stop');
        if (i >= items.length) return;
        var it = items[i];
        msg((tryNo > 1 ? 'מקטין עוד כדי להיכנס במגבלה (ניסיון ' + tryNo + ') – ' : '') + 'עמוד ' + (i + 1) + ' מתוך ' + items.length + '…');
        return jpeg(it, side, q).then(function (r) {
          return readBuf(r.b).then(function (buf) { return doc.embedJpg(buf); }).then(function (img) {
            var land = r.w > r.h, pw = land ? A4[1] : A4[0], ph = land ? A4[0] : A4[1];
            var k = Math.min((pw - 2 * MARGIN) / r.w, (ph - 2 * MARGIN) / r.h), dw = r.w * k, dh = r.h * k;
            doc.addPage([pw, ph]).drawImage(img, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
            i++; bar(Math.round(i / items.length * 100));
          });
        }).then(next);
      })();
    }).then(function () { return doc.save(); });
  }
  function go() {
    if (!items.length || busy) return;
    busy = true; var my = ++run; result = null;
    if (url) { URL.revokeObjectURL(url); url = null; }
    $('tz-box').hidden = false; $('tz-out').hidden = true; $('tz-size').textContent = '';
    drawUI(); bar(0); msg('מכין…');
    var lim = st.l ? st.l * 1048576 * 0.97 : 0, lv = st.q, tryNo = 0, bytes;
    script(LIB).then(function attempt() {
      tryNo++;
      return build(lv, my, tryNo).then(function (b) {
        bytes = b;
        if (lim && b.length > lim && lv < LEVELS.length - 1) {
          // קפיצה חכמה: גודל JPEG בערך יחסי לשטח ולאיכות, אז מדלגים ישר למדרגה שאמורה להיכנס.
          var j = lv + 1, s0 = LEVELS[lv];
          while (j < LEVELS.length - 1 && b.length * Math.pow(LEVELS[j][0] / s0[0], 2) * (LEVELS[j][1] / s0[1]) > lim * 0.9) j++;
          lv = j; return attempt();
        }
      });
    }).then(function () {
      var d = new Date(), stamp = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      var name = 'mismach-' + stamp + '.pdf';
      var blob = new Blob([bytes], { type: 'application/pdf' });
      result = { blob: blob, file: new File([blob], name, { type: 'application/pdf' }) };
      url = URL.createObjectURL(blob);
      $('tz-dl').href = url; $('tz-dl').setAttribute('download', name);
      $('tz-share').hidden = !canShare([result.file]);
      $('tz-out').hidden = false; bar(-1);
      $('tz-size').textContent = items.length + ' עמודים · ' + mb(blob.size);
      if (lim && blob.size > lim) msg('גם בגודל הכי קטן הקובץ יצא ' + mb(blob.size) + '. אפשר לשלוח בשני חלקים: חצי מהעמודים בכל קובץ.', 'pd-err');
      else msg((lim ? 'נכנס במגבלה של ' + st.l + ' מ״ב. ' : '') + 'מוכן לשליחה.' + (lv > st.q ? ' (הכלי הוריד קצת חדות כדי להיכנס.)' : ''), 'pd-ok');
      if (window.toolUsed) window.toolUsed('machshev_tzilumim', { how: 'build', pages: items.length, l: st.l, lv: lv, tries: tryNo });
    }).catch(function (e) {
      if (my !== run) return;
      bar(-1);
      if (/load/.test(e && e.message)) msg('לא הצלחתי לטעון את הכלי. לבדוק שיש אינטרנט ולנסות שוב.', 'pd-err');
      else if (/decode/.test(e && e.message)) msg('אחת התמונות לא נפתחה. אם זו תמונת HEIC מאייפון – לבחור אותה דרך "ספריית התמונות".', 'pd-err');
      else msg('משהו נתקע באמצע (אולי יותר מדי תמונות לטלפון). לנסות עם פחות עמודים, או במחשב.', 'pd-err');
    }).then(function () { if (my === run) { busy = false; drawUI(); } });
  }
  function canShare(fl) { try { return !!(navigator.canShare && navigator.canShare({ files: fl })); } catch (e) { return false; } }
  function stale() { if (result || busy) { run++; busy = false; result = null; $('tz-out').hidden = true; $('tz-size').textContent = ''; msg('שיניתם משהו – ללחוץ שוב על "ליצור PDF אחד".'); } }

  function drawUI() {
    [].forEach.call($('tz-lim').children, function (b) { b.setAttribute('aria-selected', String(+b.getAttribute('data-l') === st.l)); });
    [].forEach.call($('tz-q').children, function (b) { b.setAttribute('aria-selected', String(+b.getAttribute('data-q') === st.q)); });
    $('tz-go').disabled = !items.length || busy;
    $('tz-go').textContent = busy ? 'יוצר…' : (items.length ? 'ליצור PDF אחד (' + items.length + ' עמודים)' : 'ליצור PDF אחד');
    var n = items.length;
    $('tz-list').innerHTML = items.map(function (it, i) {
      return '<li><span class="tz-th"><img src="' + it.u + '" alt="" style="transform:rotate(' + it.rot + 'deg)"></span><span><span class="pg">עמוד ' + (i + 1) + '</span><span class="nm">' + esc(it.f.name) + '</span>' +
        '<span class="tz-bt"><button type="button" data-a="up" data-i="' + i + '" aria-label="להזיז למעלה"' + (i ? '' : ' disabled') + '>▲</button>' +
        '<button type="button" data-a="down" data-i="' + i + '" aria-label="להזיז למטה"' + (i < n - 1 ? '' : ' disabled') + '>▼</button>' +
        '<button type="button" data-a="rot" data-i="' + i + '" aria-label="לסובב">⟳ לסובב</button>' +
        '<button type="button" data-a="del" data-i="' + i + '" aria-label="להוריד">✕</button></span></span></li>';
    }).join('');
  }
  function add(list) {
    [].slice.call(list || []).filter(function (f) { return /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name); })
      .forEach(function (f) { items.push({ f: f, u: URL.createObjectURL(f), rot: 0, id: ++seq }); });
    stale(); drawUI();
  }
  $('tz-file').addEventListener('change', function () { add(this.files); this.value = ''; });
  $('tz-cam').addEventListener('change', function () { add(this.files); this.value = ''; });
  $('tz-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var i = +b.getAttribute('data-i'), a = b.getAttribute('data-a'), t;
    if (a === 'up' && i > 0) { t = items[i - 1]; items[i - 1] = items[i]; items[i] = t; }
    else if (a === 'down' && i < items.length - 1) { t = items[i + 1]; items[i + 1] = items[i]; items[i] = t; }
    else if (a === 'rot') items[i].rot = (items[i].rot + 90) % 360;
    else if (a === 'del') { URL.revokeObjectURL(items[i].u); items.splice(i, 1); }
    stale(); drawUI();
  });
  $('tz-lim').addEventListener('click', function (e) { var b = e.target.closest('[data-l]'); if (!b) return; st.l = +b.getAttribute('data-l'); save(); stale(); drawUI(); });
  $('tz-q').addEventListener('click', function (e) { var b = e.target.closest('[data-q]'); if (!b) return; st.q = +b.getAttribute('data-q'); save(); stale(); drawUI(); });
  $('tz-go').addEventListener('click', go);
  $('tz-dl').addEventListener('click', function () { if (window.toolUsed) window.toolUsed('machshev_tzilumim', { how: 'download' }); });
  $('tz-share').addEventListener('click', function () {
    if (!result) return;
    navigator.share({ files: [result.file] }).catch(function () {});
    if (window.toolUsed) window.toolUsed('machshev_tzilumim', { how: 'share' });
  });
  drawUI();
})();
