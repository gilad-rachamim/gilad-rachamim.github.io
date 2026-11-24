// תמונת פספורט אונליין (/kelim/machshev/pasport/).
// הכול בדפדפן: המצלמה או הקובץ, זיהוי פנים (MediaPipe מהאתר עצמו), חיתוך, רקע לבן, בדיקה, הורדה והדפסה.
// שום תמונה לא עולה לשרת. אם המודל לא נטען – חיתוך ידני עם אותה מסגרת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('pp-file')) return;
  var MP = '/assets/vendor/mediapipe/';
  var DPI = 300;
  // head = גובה ראש רצוי (סנטר עד קודקוד) במ"מ, אמצע הטווח הרשמי (בריטניה 29-34, ארה"ב 25-35)
  var SIZES = {
    il: { w: 35, h: 45, head: 33, name: '35×45 מ״מ' },
    us: { w: 51, h: 51, head: 30, name: '51×51 מ״מ (2×2 אינץ׳)' },
    usd: { w: 50.8, h: 50.8, head: 30, px: 600, name: '600×600 נקודות (דיגיטלי)' },
    ca: { w: 50, h: 70, head: 33, name: '50×70 מ״מ' },
    custom: { w: 35, h: 45, head: 33, name: 'גודל אחר' }
  };
  var st = { size: 'il', white: true, zoom: 1, dx: 0, dy: 0, copies: 0 };
  var src = null;      // canvas של התמונה המקורית (עד 1800 נקודות)
  var cut = null;      // canvas עם האדם בלבד (שקיפות מסביב) כשיש מסכה
  var face = null;     // {cx, crownY, chinY, eyeAng, ...}
  var mpState = 'idle', landmarker = null, segmenter = null, mpErr = '';
  var out = $('pp-out'), octx = out.getContext('2d');
  var lastCanvas = null, stream = null;

  function used(how) { try { if (window.toolUsed) window.toolUsed('pasport', { how: how }); } catch (e) {} }
  function msg(t, err) { var m = $('pp-msg'); m.textContent = t || ''; m.className = 'pp-msg' + (err ? ' err' : ''); m.hidden = !t; }
  function dims() {
    var s = SIZES[st.size];
    if (st.size === 'custom') {
      var w = parseFloat($('pp-cw').value) || 35, h = parseFloat($('pp-ch').value) || 45;
      w = Math.min(Math.max(w, 15), 120); h = Math.min(Math.max(h, 15), 160);
      s = { w: w, h: h, head: h * 0.73, name: w + '×' + h + ' מ״מ' };
    }
    var pw = s.px || Math.round(s.w / 25.4 * DPI), ph = s.px || Math.round(s.h / 25.4 * DPI);
    return { w: s.w, h: s.h, head: s.head, pw: pw, ph: ph, name: s.name, px: !!s.px };
  }

  // ---------- טעינת תמונה ----------
  function load(f) {
    if (window.createImageBitmap) return createImageBitmap(f, { imageOrientation: 'from-image' }).catch(function () { return viaImg(f); });
    return viaImg(f);
  }
  function viaImg(f) {
    return new Promise(function (ok, bad) {
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () { ok(im); }; im.onerror = function () { bad(new Error('decode')); };
      im.src = u;
    });
  }
  function takeFile(f) {
    if (!f) return;
    msg('קורא את התמונה…');
    load(f).then(function (im) {
      var w = im.width || im.naturalWidth, h = im.height || im.naturalHeight, k = Math.min(1, 1800 / Math.max(w, h));
      src = document.createElement('canvas'); src.width = Math.round(w * k); src.height = Math.round(h * k);
      src.getContext('2d').drawImage(im, 0, 0, src.width, src.height);
      startWork();
    }).catch(function () { msg('לא הצלחתי לקרוא את הקובץ. נסו תמונה אחרת (JPG או PNG).', true); });
  }
  function startWork() {
    cut = null; face = null; st.zoom = 1; st.dx = 0; st.dy = 0;
    $('pp-zoom').value = 1; $('pp-dy').value = 0; $('pp-dx').value = 0;
    $('pp-work').hidden = false;
    render();
    msg('מחפש את הפנים…');
    ensureModels().then(function () { return analyse(); }).then(function () {
      msg(face ? '' : 'לא זיהיתי פנים אוטומטית. מקמו את הפנים במסגרת עם ההזזה והזום (הכלי עובד גם ככה).');
      render();
    }).catch(function () { msg('הזיהוי האוטומטי לא נטען. מקמו את הפנים במסגרת עם ההזזה והזום.'); render(); });
  }

  // ---------- מודלים ----------
  var mpP = null;
  function ensureModels() {
    if (mpP) return mpP;
    mpState = 'loading';
    mpP = import(MP + 'vision_bundle.mjs').then(function (m) {
      return m.FilesetResolver.forVisionTasks(MP + 'wasm').then(function (fs) {
        var mk = function (Cls, file, extra) {
          var o = { baseOptions: { modelAssetPath: MP + file, delegate: 'CPU' }, runningMode: 'IMAGE' };
          for (var k in extra) o[k] = extra[k];
          return Cls.createFromOptions(fs, o);
        };
        return mk(m.FaceLandmarker, 'face_landmarker.task', { numFaces: 1, outputFaceBlendshapes: true }).then(function (l) {
          landmarker = l;
          return mk(m.ImageSegmenter, 'selfie_segmenter.tflite', { outputConfidenceMasks: true, outputCategoryMask: false }).then(function (s) { segmenter = s; }, function () {});
        });
      });
    }).then(function () { mpState = 'ok'; }, function (e) { mpState = 'fail'; mpErr = String(e && e.message || e); throw e; });
    return mpP;
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function analyse() {
    if (!landmarker || !src) return;
    var r = landmarker.detect(src);
    if (!r.faceLandmarks || !r.faceLandmarks.length) { face = null; return; }
    var L = r.faceLandmarks[0], W = src.width, H = src.height;
    function P(i) { return { x: L[i].x * W, y: L[i].y * H }; }
    var chin = P(152), top = P(10), eyeL = P(33), eyeR = P(263);
    // אם העין "שמאל" בתמונה היא בצד ימין – ממיינים לפי x
    var e1 = eyeL.x < eyeR.x ? eyeL : eyeR, e2 = eyeL.x < eyeR.x ? eyeR : eyeL;
    var ang = Math.atan2(e2.y - e1.y, e2.x - e1.x);
    var cx = 0; [10, 152, 234, 454].forEach(function (i) { cx += P(i).x; }); cx /= 4;
    var fh = dist(top, chin);
    var crown = { x: top.x, y: top.y - fh * 0.2 }; // הערכה: הקודקוד מעל קו השיער
    var res = { cx: cx, chinY: chin.y, chinX: chin.x, topY: top.y, crownY: crown.y, ang: ang, eyeMidX: (e1.x + e2.x) / 2, eyeMidY: (e1.y + e2.y) / 2, fh: fh, width: dist(P(234), P(454)), bs: {} };
    if (r.faceBlendshapes && r.faceBlendshapes[0]) r.faceBlendshapes[0].categories.forEach(function (c) { res.bs[c.categoryName] = c.score; });
    face = res;
    if (segmenter) {
      try {
        var sr = segmenter.segment(src), mk = sr.confidenceMasks[0];
        var arr = mk.getAsFloat32Array(), mw = mk.width, mh = mk.height;
        // מסכה -> canvas אפור -> טשטוש קל לקצה רך
        var mc = document.createElement('canvas'); mc.width = mw; mc.height = mh;
        var mctx = mc.getContext('2d'), id = mctx.createImageData(mw, mh);
        for (var i = 0; i < arr.length; i++) { var v = Math.max(0, Math.min(1, (arr[i] - 0.35) / 0.4)); id.data[i * 4] = 255; id.data[i * 4 + 1] = 255; id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = Math.round(v * 255); }
        mctx.putImageData(id, 0, 0);
        // קודקוד אמיתי לפי המסכה: השורה העליונה שבה יש אדם סביב מרכז הפנים
        var colA = Math.max(0, Math.floor((cx - res.width * 0.3) / W * mw)), colB = Math.min(mw - 1, Math.ceil((cx + res.width * 0.3) / W * mw));
        var topRow = -1;
        for (var y = 0; y < mh && topRow < 0; y++) for (var x = colA; x <= colB; x++) if (arr[y * mw + x] > 0.6) { topRow = y; break; }
        if (topRow >= 0) { var cy = topRow / mh * H; if (cy < res.topY && cy > res.topY - fh * 0.6) res.crownY = cy; }
        cut = document.createElement('canvas'); cut.width = src.width; cut.height = src.height;
        var cc = cut.getContext('2d');
        cc.drawImage(src, 0, 0);
        var soft = document.createElement('canvas'); soft.width = src.width; soft.height = src.height;
        var sc = soft.getContext('2d'); sc.filter = 'blur(' + Math.max(1, Math.round(src.width / 600)) + 'px)'; sc.drawImage(mc, 0, 0, src.width, src.height);
        cc.globalCompositeOperation = 'destination-in'; cc.drawImage(soft, 0, 0);
        mk.close && mk.close();
      } catch (e) { cut = null; }
    }
  }

  // ---------- ציור ----------
  // חלון חיתוך במערכת המקור: מרכז, רוחב, גובה, זווית
  function cropRect(d) {
    var ratio = d.head / d.h, ow = d.pw / d.ph;
    var cw, chh, cx, cy, ang = 0;
    if (face) {
      var headPx = Math.max(10, face.chinY - face.crownY);
      chh = headPx / ratio / st.zoom; cw = chh * ow;
      cx = face.cx; ang = face.ang;
      // הקודקוד: שליש מהשוליים העליונים, הסנטר: שני שלישים מהתחתונים
      var free = chh - headPx, top = face.crownY - free * 0.4;
      cy = top + chh / 2;
    } else {
      chh = Math.min(src.height, src.width / ow) / st.zoom; cw = chh * ow; cx = src.width / 2; cy = src.height / 2;
    }
    cx += st.dx * cw; cy += st.dy * chh;
    return { cx: cx, cy: cy, cw: cw, ch: chh, ang: ang };
  }
  function paint(ctx, d, w, h, whiten) {
    var r = cropRect(d);
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2); ctx.scale(w / r.cw, h / r.ch); ctx.rotate(-r.ang); ctx.translate(-r.cx, -r.cy);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(whiten && cut ? cut : src, 0, 0);
    ctx.restore();
  }
  function render() {
    if (!src) return;
    var d = dims();
    out.width = d.pw; out.height = d.ph;
    paint(octx, d, d.pw, d.ph, st.white && !!cut);
    lastCanvas = out;
    $('pp-size').textContent = d.name + ' · ' + d.pw + '×' + d.ph + ' נקודות · ' + DPI + ' נק׳ לאינץ׳';
    $('pp-white-note').hidden = !!cut || !src;
    $('pp-white-note').textContent = mpState === 'ok' && face ? '' : 'הלבנת הרקע זמינה אחרי שהזיהוי נטען. אפשר גם לצלם מול קיר לבן.';
    check(d);
    sheetInfo(d);
  }

  // ---------- בדיקת טעויות ----------
  function luma(c, x, y, w, h) {
    var d = c.getContext('2d').getImageData(Math.max(0, x | 0), Math.max(0, y | 0), Math.max(1, w | 0), Math.max(1, h | 0)).data, s = 0, n = d.length / 4;
    for (var i = 0; i < d.length; i += 4) s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return s / n;
  }
  function check(d) {
    var rows = [];
    function row(ok, good, bad, fix) { rows.push({ ok: ok, t: ok ? good : bad, fix: ok ? '' : fix }); }
    var r = cropRect(d);
    var scale = d.pw / r.cw; // קטן מ-1 = התמונה הוגדלה
    if (!face) {
      rows.push({ ok: null, t: 'הפנים לא זוהו אוטומטית, לכן אני לא יכול לבדוק גודל ראש ומרכוז.', fix: 'מקמו את הראש במסגרת לפי ההסבר למטה, ובדקו בעיניים.' });
    } else {
      var headOut = (face.chinY - face.crownY) * scale / d.ph * d.h; // במ"מ
      var tol = d.head * 0.12;
      row(Math.abs(headOut - d.head) < tol * 1.7, 'גודל הראש מתאים (בערך ' + Math.round(headOut) + ' מ״מ מהסנטר עד הקודקוד).', 'גודל הראש לא מתאים (בערך ' + Math.round(headOut) + ' מ״מ, צריך כ-' + Math.round(d.head) + ').', 'שחקו עם הזום עד שהראש ממלא את המסגרת כמו בציור.');
      var off = (face.cx - r.cx) / r.cw;
      row(Math.abs(off) < 0.06, 'הפנים במרכז.', 'הפנים לא במרכז.', 'הזיזו ימינה או שמאלה עם ההזזה.');
      var tilt = Math.abs(face.ang) * 57.3;
      row(tilt < 4, 'העיניים בגובה ישר.', 'הראש נטוי (בערך ' + Math.round(tilt) + ' מעלות).', 'צלמו שוב כשהראש ישר. הכלי יישר חלק מזה לבד.');
      if (face.crownY < 0) row(false, '', 'קודקוד הראש חתוך בתמונה המקורית.', 'צלמו שוב עם יותר מקום מעל הראש.');
      var bs = face.bs;
      if (bs.eyeBlinkLeft !== undefined) row(bs.eyeBlinkLeft < 0.5 && bs.eyeBlinkRight < 0.5, 'שתי העיניים פתוחות.', 'נראה שעין אחת או שתיהן עצומות.', 'צלמו שוב עם עיניים פתוחות ומבט ישר למצלמה.');
      if (bs.jawOpen !== undefined) row(bs.jawOpen < 0.2 && (bs.mouthSmileLeft || 0) < 0.55, 'הפה סגור והבעה ניטרלית.', 'הפה פתוח או שיש חיוך רחב.', 'רוב המדינות מבקשות פנים רגועות ופה סגור.');
      // תאורה: ימין מול שמאל של הפנים בפלט
      var fw = face.width * scale, fx = (face.cx - r.cx) * scale + d.pw / 2, fy = d.ph * 0.45;
      var a = luma(out, fx - fw * 0.45, fy - fw * 0.2, fw * 0.4, fw * 0.4), b = luma(out, fx + fw * 0.05, fy - fw * 0.2, fw * 0.4, fw * 0.4);
      var ratio = Math.min(a, b) / Math.max(1, Math.max(a, b));
      row(ratio > 0.72, 'התאורה אחידה על הפנים.', 'צד אחד של הפנים כהה יותר.', 'עמדו מול חלון או מנורה, כך שהאור על שני הצדדים.');
    }
    // רקע
    var bg = (luma(out, 0, 0, d.pw * 0.12, d.ph * 0.3) + luma(out, d.pw * 0.88, 0, d.pw * 0.12, d.ph * 0.3)) / 2;
    row(bg > 190, 'הרקע בהיר.', 'הרקע לא מספיק בהיר.', cut || !st.white ? 'הפעילו "להלבין רקע", או צלמו מול קיר לבן.' : 'צלמו מול קיר לבן, או חכו שהזיהוי ייטען ואז "להלבין רקע".');
    // רזולוציה
    var minPx = r.cw;
    row(minPx >= d.pw * 0.9, 'הרזולוציה מספיקה להדפסה.', 'התמונה קטנה, ובהדפסה היא תצא מטושטשת.', 'צלמו קרוב יותר או במצלמה האחורית של הטלפון.');
    // חדות
    var sharp = sharpness(out);
    row(sharp > 18, 'התמונה חדה.', 'התמונה מטושטשת.', 'החזיקו את הטלפון יציב, ונקו את העדשה.');
    var ul = $('pp-checks'); ul.innerHTML = '';
    rows.forEach(function (x) {
      var li = document.createElement('li'); li.className = x.ok === null ? 'na' : x.ok ? 'ok' : 'no';
      li.innerHTML = '<span aria-hidden="true">' + (x.ok === null ? '❔' : x.ok ? '✅' : '❌') + '</span><div></div>';
      li.lastChild.textContent = x.t + (x.fix ? ' ' + x.fix : '');
      ul.appendChild(li);
    });
    var bad = rows.filter(function (x) { return x.ok === false; }).length;
    $('pp-verdict').textContent = bad ? 'יש ' + bad + ' דברים לתקן לפני ההדפסה' : 'נראה טוב. בכל זאת בדקו מול הדרישות של הגוף שמקבל את התמונה.';
  }
  function sharpness(c) {
    var s = 128, t = document.createElement('canvas'); t.width = t.height = s;
    var x = t.getContext('2d'); x.drawImage(c, 0, 0, s, s);
    var d = x.getImageData(0, 0, s, s).data, g = new Float32Array(s * s);
    for (var i = 0; i < s * s; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    var sum = 0, sq = 0, n = 0;
    for (var yy = 1; yy < s - 1; yy++) for (var xx = 1; xx < s - 1; xx++) {
      var l = 4 * g[yy * s + xx] - g[yy * s + xx - 1] - g[yy * s + xx + 1] - g[(yy - 1) * s + xx] - g[(yy + 1) * s + xx];
      sum += l; sq += l * l; n++;
    }
    return Math.sqrt(sq / n - (sum / n) * (sum / n));
  }

  // ---------- קבצים ----------
  function jpegBlob(canvas, dpi, cb) {
    canvas.toBlob(function (b) {
      if (!b) return cb(null);
      var rd = new FileReader();
      rd.onload = function () {
        var u = new Uint8Array(rd.result);
        // כותרת JFIF: יחידות = נקודות לאינץ׳ ורזולוציה 300, כדי שהדפסה תצא במידות הנכונות
        if (u[2] === 0xFF && u[3] === 0xE0 && u[6] === 0x4A) { u[13] = 1; u[14] = dpi >> 8; u[15] = dpi & 255; u[16] = dpi >> 8; u[17] = dpi & 255; }
        cb(new Blob([u], { type: 'image/jpeg' }));
      };
      rd.readAsArrayBuffer(b);
    }, 'image/jpeg', 0.95);
  }
  function save(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function stamp() { var d = dims(); return 'pasport-' + (st.size === 'custom' ? d.w + 'x' + d.h : st.size) + '.jpg'; }

  // ---------- גיליון הדפסה ----------
  var GAP_MM = 2;
  function layout(sw, sh, d) {
    // כמה תמונות נכנסות בגיליון בגודל sw×sh מ"מ, כולל רווח וקצה של 4 מ"מ
    var pw = d.w, ph = d.h, m = 4;
    var c = Math.max(0, Math.floor((sw - 2 * m + GAP_MM) / (pw + GAP_MM))), r = Math.max(0, Math.floor((sh - 2 * m + GAP_MM) / (ph + GAP_MM)));
    return { cols: c, rows: r, n: c * r };
  }
  function bestSheet(sw, sh, d) {
    var a = layout(sw, sh, d), b = layout(sh, sw, d);
    return b.n > a.n ? { sw: sh, sh: sw, L: b } : { sw: sw, sh: sh, L: a };
  }
  function sheetInfo(d) {
    var s = bestSheet(100, 150, d), a = bestSheet(210, 297, d);
    var sel = $('pp-copies'), keep = st.copies;
    $('pp-sheet-note').textContent = s.L.n ? 'בגיליון 10×15 ס״מ נכנסות ' + s.L.n + ' תמונות. בדף A4 – ' + a.L.n + '.' : 'התמונה גדולה מדי לגיליון 10×15. אפשר להשתמש ב-A4.';
    $('pp-sheet-btn').disabled = !s.L.n;
    sel.dataset.max = s.L.n;
  }
  function drawSheet(sw, sh, d, copies, pxPerMm, ctx, photo) {
    var best = bestSheet(sw, sh, d), L = best.L, W = best.sw * pxPerMm, H = best.sh * pxPerMm;
    ctx.canvas.width = Math.round(W); ctx.canvas.height = Math.round(H);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    var n = Math.min(copies || L.n, L.n), tw = L.cols * d.w + (L.cols - 1) * GAP_MM, th = L.rows * d.h + (L.rows - 1) * GAP_MM;
    var x0 = (best.sw - tw) / 2, y0 = (best.sh - th) / 2, i = 0;
    ctx.strokeStyle = '#999'; ctx.lineWidth = Math.max(1, pxPerMm * 0.15);
    for (var r = 0; r < L.rows; r++) for (var c = 0; c < L.cols; c++) {
      if (i++ >= n) break;
      var x = (x0 + c * (d.w + GAP_MM)) * pxPerMm, y = (y0 + r * (d.h + GAP_MM)) * pxPerMm, w = d.w * pxPerMm, h = d.h * pxPerMm;
      ctx.drawImage(photo, x, y, w, h);
      var g = pxPerMm * 0.6; // קווי חיתוך דקים מחוץ לתמונה
      ctx.strokeRect(x - g, y - g, w + 2 * g, h + 2 * g);
    }
    return n;
  }
  function wantCopies() { var v = parseInt($('pp-copies').value, 10); return v > 0 ? v : 0; }
  function sheetJpg() {
    var d = dims(), c = document.createElement('canvas'), n = drawSheet(100, 150, d, wantCopies(), DPI / 25.4, c.getContext('2d'), out);
    jpegBlob(c, DPI, function (b) { if (b) { save(b, 'pasport-gilayon-10x15.jpg'); used('sheet'); msg('ירד גיליון ' + n + ' תמונות, 10×15 ס״מ. מדפיסים בעמדת הדפסת תמונות בגודל 10×15, בלי "התאמה למסגרת".'); } });
  }
  function sheetPdf() {
    if (!window.jspdf) { var s = document.createElement('script'); s.src = '/assets/vendor/jspdf/jspdf-2.5.1.umd.min.js'; s.onload = sheetPdf; s.onerror = function () { msg('לא הצלחתי לטעון את מחולל ה-PDF.', true); }; document.head.appendChild(s); return; }
    var d = dims(), c = document.createElement('canvas'), n = drawSheet(210, 297, d, wantCopies(), DPI / 25.4, c.getContext('2d'), out);
    var best = bestSheet(210, 297, d);
    var pdf = new window.jspdf.jsPDF({ orientation: best.sw > best.sh ? 'l' : 'p', unit: 'mm', format: 'a4' });
    pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, best.sw, best.sh);
    pdf.save('pasport-A4.pdf'); used('pdf'); msg('ירד קובץ A4 עם ' + n + ' תמונות. מדפיסים ב"גודל אמיתי" (100%), לא "התאמה לעמוד".');
  }

  // ---------- מצלמה ----------
  function camOpen() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('pp-selfie-file').click(); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false }).then(function (s) {
      stream = s; var v = $('pp-video'); v.srcObject = s; $('pp-cam').hidden = false; v.play();
      ensureModels().catch(function () {}); // מחממים את המודל בזמן שמצלמים
    }).catch(function () { $('pp-selfie-file').click(); });
  }
  function camClose() { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; $('pp-cam').hidden = true; }
  function camShot() {
    var v = $('pp-video'); if (!v.videoWidth) return;
    var c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    var k = Math.min(1, 1800 / Math.max(c.width, c.height));
    src = document.createElement('canvas'); src.width = Math.round(c.width * k); src.height = Math.round(c.height * k);
    src.getContext('2d').drawImage(c, 0, 0, src.width, src.height);
    camClose(); used('selfie'); startWork();
  }

  // ---------- חיבורים ----------
  $('pp-file').addEventListener('change', function () { takeFile(this.files[0]); used('upload'); this.value = ''; });
  $('pp-selfie-file').addEventListener('change', function () { takeFile(this.files[0]); used('selfie'); this.value = ''; });
  $('pp-selfie').addEventListener('click', camOpen);
  $('pp-snap').addEventListener('click', camShot);
  $('pp-camx').addEventListener('click', camClose);
  $('pp-sizes').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-s]'); if (!b) return;
    st.size = b.dataset.s; st.dx = 0; st.dy = 0; st.zoom = 1; $('pp-zoom').value = 1; $('pp-dy').value = 0; $('pp-dx').value = 0;
    [].forEach.call($('pp-sizes').children, function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
    $('pp-custom').hidden = st.size !== 'custom'; render();
  });
  ['pp-cw', 'pp-ch'].forEach(function (i) { $(i).addEventListener('input', render); });
  $('pp-white').addEventListener('change', function () { st.white = this.checked; render(); });
  $('pp-zoom').addEventListener('input', function () { st.zoom = parseFloat(this.value); render(); });
  $('pp-dy').addEventListener('input', function () { st.dy = parseFloat(this.value); render(); });
  $('pp-dx').addEventListener('input', function () { st.dx = parseFloat(this.value); render(); });
  $('pp-copies').addEventListener('change', function () { st.copies = wantCopies(); });
  // גרירה על התצוגה
  var drag = null;
  out.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, dx: st.dx, dy: st.dy }; out.setPointerCapture(e.pointerId); });
  out.addEventListener('pointermove', function (e) {
    if (!drag) return; var b = out.getBoundingClientRect();
    st.dx = Math.max(-0.5, Math.min(0.5, drag.dx - (e.clientX - drag.x) / b.width)); st.dy = Math.max(-0.5, Math.min(0.5, drag.dy - (e.clientY - drag.y) / b.height));
    $('pp-dx').value = st.dx; $('pp-dy').value = st.dy; render();
  });
  out.addEventListener('pointerup', function () { drag = null; });
  out.addEventListener('pointercancel', function () { drag = null; });
  $('pp-dl').addEventListener('click', function () { jpegBlob(out, DPI, function (b) { if (b) { save(b, stamp()); used('dl'); } }); });
  $('pp-share').addEventListener('click', function () {
    jpegBlob(out, DPI, function (b) {
      if (!b) return;
      var f = new File([b], stamp(), { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: 'תמונת פספורט' }).then(function () { used('share'); }).catch(function () {});
      else { save(b, stamp()); used('dl'); msg('הדפדפן הזה לא יודע לשתף קבצים, אז התמונה ירדה למכשיר.'); }
    });
  });
  $('pp-sheet-btn').addEventListener('click', sheetJpg);
  $('pp-pdf-btn').addEventListener('click', sheetPdf);
  $('pp-again').addEventListener('click', function () { $('pp-work').hidden = true; src = null; window.scrollTo(0, 0); });
  window.addEventListener('pagehide', camClose);
  // לבדיקות
  window.__pp = { state: function () { return { mp: mpState, err: mpErr, face: face, cut: !!cut, d: dims() }; } };
})();
