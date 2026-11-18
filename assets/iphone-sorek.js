/* Document scanner in the browser: photo -> crop -> clean black & white -> multi-page PDF.
   Everything stays on the device (canvas + pdf-lib). No upload. */
(function () {
  function $(id) { return document.getElementById(id); }
  var cam = $('sk-cam'), gal = $('sk-gal'), ed = $('sk-edit'), cv = $('sk-cv'), list = $('sk-pages'), outBox = $('sk-out'), msg = $('sk-msg');
  if (!cam || !cv) return;
  var MAX = 2000;                      // longest side kept, enough for a readable A4 page
  var queue = [], src = null;          // src: canvas with the current photo (already rotated)
  var crop = { x0: .04, y0: .04, x1: .96, y1: .96 }, mode = 'bw', pages = [], used = false;
  function say(t) { msg.textContent = t || ''; }

  function loadFile(f) {
    return new Promise(function (ok, bad) {
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () {
        var s = Math.min(1, MAX / Math.max(im.naturalWidth, im.naturalHeight));
        var c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c);
      };
      im.onerror = function () { URL.revokeObjectURL(u); bad(); };
      im.src = u;
    });
  }
  function next() {
    if (!queue.length) { ed.hidden = true; return; }
    var f = queue.shift();
    loadFile(f).then(function (c) {
      src = c; crop = { x0: .04, y0: .04, x1: .96, y1: .96 }; ed.hidden = false; paint();
      try { ed.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {}
      say(queue.length ? 'עוד ' + queue.length + ' תמונות מחכות אחרי הדף הזה.' : '');
    }, function () { say('לא הצלחתי לפתוח את התמונה. נסו לצלם שוב.'); next(); });
  }
  function onPick(e) {
    var fs = [].slice.call(e.target.files || []); e.target.value = '';
    if (!fs.length) return; queue = queue.concat(fs); if (ed.hidden) next();
  }
  cam.addEventListener('change', onPick); gal.addEventListener('change', onPick);

  /* ---- image filters ---- */
  function filter(c, m) {
    if (m === 'color') return c;
    var w = c.width, h = c.height, ctx = c.getContext('2d'), d = ctx.getImageData(0, 0, w, h), p = d.data, n = w * h, g = new Float32Array(n), i;
    for (i = 0; i < n; i++) g[i] = p[i * 4] * .299 + p[i * 4 + 1] * .587 + p[i * 4 + 2] * .114;
    if (m === 'bw') {
      // divide by a blurred copy = remove shadows and uneven light, then push paper to white
      var k = 24, sw = Math.ceil(w / k), sh = Math.ceil(h / k), sm = new Float32Array(sw * sh), cnt = new Uint32Array(sw * sh), x, y, j;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) { j = ((y / k) | 0) * sw + ((x / k) | 0); sm[j] += g[y * w + x]; cnt[j]++; }
      for (j = 0; j < sm.length; j++) sm[j] /= cnt[j] || 1;
      var bl = new Float32Array(sw * sh);
      for (y = 0; y < sh; y++) for (x = 0; x < sw; x++) {
        var s = 0, c2 = 0, mx = 0;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          var yy = y + dy, xx = x + dx; if (yy < 0 || xx < 0 || yy >= sh || xx >= sw) continue;
          var v = sm[yy * sw + xx]; s += v; c2++; if (v > mx) mx = v;
        }
        bl[y * sw + x] = (s / c2 + mx) / 2;
      }
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        var fx = Math.min(sw - 1, x / k - .5), fy = Math.min(sh - 1, y / k - .5);
        var x0 = Math.max(0, fx | 0), y0 = Math.max(0, fy | 0), x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1);
        var tx = Math.max(0, fx - x0), ty = Math.max(0, fy - y0);
        var bg = (bl[y0 * sw + x0] * (1 - tx) + bl[y0 * sw + x1] * tx) * (1 - ty) + (bl[y1 * sw + x0] * (1 - tx) + bl[y1 * sw + x1] * tx) * ty;
        var r = g[y * w + x] / (bg || 1);              // 1 = paper
        var o = r > .9 ? 255 : r < .55 ? 0 : (r - .55) / .35 * 255;
        g[y * w + x] = o;
      }
    }
    for (i = 0; i < n; i++) { var q = g[i]; p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = q; }
    ctx.putImageData(d, 0, 0); return c;
  }
  function cropped(scale) {
    var w = src.width, h = src.height, x = crop.x0 * w, y = crop.y0 * h, cw = (crop.x1 - crop.x0) * w, ch = (crop.y1 - crop.y0) * h;
    var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(cw * scale)); c.height = Math.max(1, Math.round(ch * scale));
    c.getContext('2d').drawImage(src, x, y, cw, ch, 0, 0, c.width, c.height); return c;
  }

  /* ---- editor ---- */
  var R = 16;
  function paint() {
    var w = Math.min(ed.clientWidth || 340, 640), s = w / src.width; cv.width = w; cv.height = Math.round(src.height * s);
    var ctx = cv.getContext('2d'); ctx.drawImage(src, 0, 0, cv.width, cv.height);
    var x0 = crop.x0 * cv.width, y0 = crop.y0 * cv.height, x1 = crop.x1 * cv.width, y1 = crop.y1 * cv.height;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, 0, cv.width, y0); ctx.fillRect(0, y1, cv.width, cv.height - y1); ctx.fillRect(0, y0, x0, y1 - y0); ctx.fillRect(x1, y0, cv.width - x1, y1 - y0);
    ctx.strokeStyle = '#dcbb74'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = '#dcbb74';
    [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], R / 1.6, 0, 7); ctx.fill(); });
  }
  var drag = null;
  function pos(e) { var b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height }; }
  cv.addEventListener('pointerdown', function (e) {
    var p = pos(e), best = null, bd = 9;
    [['x0', 'y0'], ['x1', 'y0'], ['x0', 'y1'], ['x1', 'y1']].forEach(function (k) {
      var d = Math.hypot((crop[k[0]] - p.x) * cv.width, (crop[k[1]] - p.y) * cv.height); if (d < bd * 6 && (best === null || d < best.d)) best = { k: k, d: d };
    });
    if (best) { drag = best.k; cv.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return; var p = pos(e); p.x = Math.max(0, Math.min(1, p.x)); p.y = Math.max(0, Math.min(1, p.y));
    crop[drag[0]] = p.x; crop[drag[1]] = p.y;
    if (crop.x1 - crop.x0 < .1) { if (drag[0] === 'x0') crop.x0 = crop.x1 - .1; else crop.x1 = crop.x0 + .1; }
    if (crop.y1 - crop.y0 < .1) { if (drag[1] === 'y0') crop.y0 = crop.y1 - .1; else crop.y1 = crop.y0 + .1; }
    paint();
  });
  ['pointerup', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, function () { drag = null; }); });
  window.addEventListener('resize', function () { if (src && !ed.hidden) paint(); });

  $('sk-rot').addEventListener('click', function () {
    var c = document.createElement('canvas'); c.width = src.height; c.height = src.width;
    var x = c.getContext('2d'); x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(src, 0, 0);
    src = c; crop = { x0: .04, y0: .04, x1: .96, y1: .96 }; paint();
  });
  $('sk-full').addEventListener('click', function () { crop = { x0: 0, y0: 0, x1: 1, y1: 1 }; paint(); });
  [].forEach.call(document.querySelectorAll('#sk-mode button'), function (b) {
    b.addEventListener('click', function () {
      mode = b.getAttribute('data-m');
      [].forEach.call(document.querySelectorAll('#sk-mode button'), function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
    });
  });
  $('sk-skip').addEventListener('click', next);
  $('sk-add').addEventListener('click', function () {
    var c = filter(cropped(1), mode);
    pages.push({ c: c, bw: mode !== 'color' }); render(); next();
    if (window.toolUsed && !used) { used = true; window.toolUsed('iphone_sricat_mismachim', { mode: mode }); }
  });

  /* ---- pages list ---- */
  function render() {
    list.innerHTML = '';
    pages.forEach(function (p, i) {
      var li = document.createElement('li'), t = document.createElement('canvas'), s = 110 / p.c.width;
      t.width = 110; t.height = Math.round(p.c.height * s); t.getContext('2d').drawImage(p.c, 0, 0, t.width, t.height);
      t.setAttribute('role', 'img'); t.setAttribute('aria-label', 'דף ' + (i + 1));
      var box = document.createElement('div'); box.className = 'sk-pg';
      var cap = document.createElement('b'); cap.textContent = 'דף ' + (i + 1);
      var up = document.createElement('button'); up.type = 'button'; up.className = 'btn btn-line btn-sm'; up.textContent = '⬆ להקדים'; up.disabled = i === 0;
      up.addEventListener('click', function () { pages.splice(i - 1, 0, pages.splice(i, 1)[0]); render(); });
      var del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-line btn-sm'; del.textContent = '🗑 למחוק';
      del.addEventListener('click', function () { pages.splice(i, 1); render(); });
      box.appendChild(cap); box.appendChild(up); box.appendChild(del); li.appendChild(t); li.appendChild(box); list.appendChild(li);
    });
    outBox.hidden = !pages.length;
    $('sk-count').textContent = pages.length === 1 ? 'דף אחד מוכן' : pages.length + ' דפים מוכנים';
  }

  /* ---- PDF ---- */
  var libP = null;
  function lib() {
    if (window.PDFLib) return Promise.resolve();
    if (!libP) libP = new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = '/assets/vendor/pdf-lib/pdf-lib.min.js'; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
    return libP;
  }
  function blobOf(c, q) { return new Promise(function (ok) { c.toBlob(function (b) { b.arrayBuffer().then(ok); }, 'image/jpeg', q); }); }
  function build() {
    return lib().then(function () { return PDFLib.PDFDocument.create(); }).then(function (doc) {
      var A4 = [595.28, 841.89], chain = Promise.resolve();
      pages.forEach(function (p) {
        chain = chain.then(function () { return blobOf(p.c, p.bw ? .7 : .82); }).then(function (buf) { return doc.embedJpg(buf); }).then(function (img) {
          var land = p.c.width > p.c.height, pw = land ? A4[1] : A4[0], ph = land ? A4[0] : A4[1];
          var s = Math.min(pw / img.width, ph / img.height), w = img.width * s, h = img.height * s;
          doc.addPage([pw, ph]).drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
        });
      });
      return chain.then(function () { return doc.save(); });
    });
  }
  function fname() { var n = ($('sk-name').value || '').trim().replace(/[\\/:*?"<>|]/g, ' ') || 'מסמך סרוק'; return n + '.pdf'; }
  function make() { say('מכין את ה-PDF…'); return build().then(function (bytes) { say('ה-PDF מוכן (' + Math.max(1, Math.round(bytes.length / 1024)) + ' ק״ב).'); return new File([bytes], fname(), { type: 'application/pdf' }); }); }
  function fail() { say('משהו השתבש בהכנת ה-PDF. נסו שוב, או עם פחות דפים.'); }
  $('sk-save').addEventListener('click', function () {
    make().then(function (f) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
    }, fail);
  });
  var sh = $('sk-share');
  if (navigator.canShare && window.File) { try { if (navigator.canShare({ files: [new File([''], 'a.pdf', { type: 'application/pdf' })] })) sh.hidden = false; } catch (e) {} }
  sh.addEventListener('click', function () { make().then(function (f) { return navigator.share({ files: [f], title: f.name }); }).catch(function (e) { if (e && e.name !== 'AbortError') fail(); }); });
  window.__ipSorek = { pages: pages, filter: filter, build: build };
})();
