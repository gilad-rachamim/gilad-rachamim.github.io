// הקטנת תמונה לפני שליחה (/kelim/machshev/tmuna/).
// הכול בדפדפן: קוראים את הקובץ, מציירים על canvas בגודל חדש ושומרים כ-JPEG. שום דבר לא עולה לשרת.
// ציור מחדש על canvas לא מעתיק את נתוני ה-EXIF, ולכן גם המיקום (GPS) שבתמונה לא עובר.
// נשמרים בטלפון רק הגודל והאיכות שבחרו (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var inp = $('tm-file');
  if (!inp) return;
  var KEY = 'kelim-machshev-tmuna';
  var NOTES = { 800: 'הצד הארוך 800 נקודות. הכי קל, טוב לטופס שמגביל גודל.', 1280: 'הצד הארוך 1280 נקודות. מספיק כמעט לכל דבר.', 1920: 'הצד הארוך 1920 נקודות. למסמכים ולתמונות שרוצים להדפיס קטן.', 0: 'אותו גודל, רק דחיסה. חוסך פחות.' };
  var st = { w: 1280, q: 80, l: 0 };
  var LIMS = [0, 0.5, 1, 2];
  // מדרגות [הצד הארוך, איכות] כשיש מגבלה: יורדים עד שהתמונה נכנסת.
  var LADDER = [[1920, 80], [1600, 75], [1280, 70], [1280, 60], [1024, 55], [800, 50], [640, 45], [480, 40]];
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) { if (NOTES[sv.w] !== undefined) st.w = sv.w; if (sv.q >= 40 && sv.q <= 95) st.q = sv.q; if (LIMS.indexOf(sv.l) > -1) st.l = sv.l; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var files = [], out = [], used = 0, run = 0;

  function mb(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' מ״ב' : Math.max(1, Math.round(b / 1024)) + ' ק״ב'; }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
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
  function shrink(f) {
    var lim = st.l ? st.l * 1048576 * 0.97 : 0;
    return shrinkAt(f, st.w, st.q).then(function (r) {
      if (!lim || r.blob.size <= lim) return r;
      var cur = Math.max(r.w, r.h), steps = LADDER.filter(function (s) { return s[0] <= cur && (s[0] < cur || s[1] < st.q); }), i = 0;
      return (function next(last) {
        if (last.blob.size <= lim || i >= steps.length) { last.tries = i + 1; last.over = last.blob.size > lim; return last; }
        var s = steps[i++];
        return shrinkAt(f, s[0], s[1]).then(next);
      })(r);
    });
  }
  function shrinkAt(f, W, Q) {
    return load(f).then(function (im) {
      var w0 = im.width || im.naturalWidth, h0 = im.height || im.naturalHeight, max = W || Math.max(w0, h0);
      var k = Math.min(1, max / Math.max(w0, h0)), w = Math.round(w0 * k), h = Math.round(h0 * k);
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); // רקע לבן לתמונות שקופות (PNG)
      x.imageSmoothingQuality = 'high';
      x.drawImage(im, 0, 0, w, h);
      if (im.close) im.close();
      return new Promise(function (ok, bad) {
        c.toBlob(function (b) { b ? ok({ blob: b, w: w, h: h, w0: w0, h0: h0 }) : bad(new Error('blob')); }, 'image/jpeg', Q / 100);
      });
    });
  }
  function name(f) { return (f.name || 'tmuna').replace(/\.[^.]+$/, '') + '-katan.jpg'; }
  function process() {
    var my = ++run;
    out.forEach(function (o) { if (o && o.url) URL.revokeObjectURL(o.url); });
    out = [];
    if (!files.length) { draw(); return; }
    $('tm-sum').textContent = 'מקטין…';
    var i = 0;
    (function next() {
      if (my !== run) return;
      if (i >= files.length) { draw(); return; }
      var f = files[i];
      shrink(f).then(function (r) {
        r.url = URL.createObjectURL(r.blob); r.file = new File([r.blob], name(f), { type: 'image/jpeg' }); r.src = f; out[i] = r;
      }).catch(function () { out[i] = { err: 1, src: f }; }).then(function () { i++; draw(true); next(); });
    })();
    if (!used && window.toolUsed) { used = 1; window.toolUsed('machshev_tmuna', { how: 'resize', n: files.length, w: st.w, q: st.q, l: st.l }); }
  }
  function draw(partial) {
    [].forEach.call($('tm-size').children, function (b) { b.setAttribute('aria-selected', String(+b.getAttribute('data-w') === st.w)); });
    $('tm-snote').textContent = NOTES[st.w];
    [].forEach.call($('tm-lim').children, function (b) { b.setAttribute('aria-selected', String(+b.getAttribute('data-l') === st.l)); });
    $('tm-q').value = st.q; $('tm-qv').textContent = st.q;
    $('tm-list').innerHTML = out.map(function (o, i) {
      if (!o) return '';
      if (o.err) return '<li><span></span><span><span class="nm">' + esc(o.src.name) + '</span><span class="err">לא הצלחתי לפתוח את הקובץ. אם זו תמונת HEIC מאייפון – לבחור אותה דרך "ספריית התמונות" ולא דרך "קבצים".</span></span></li>';
      var big = o.blob.size >= o.src.size;
      return '<li><img src="' + o.url + '" alt=""><span><span class="nm">' + esc(o.src.name) + '</span>' +
        '<span class="sz"><s>' + mb(o.src.size) + '</s> ← ' + mb(o.blob.size) + '</span>' +
        '<span class="nm" dir="ltr" style="display:block;text-align:right">' + o.w + '×' + o.h + '</span>' +
        (big ? '<span class="err">התמונה כבר הייתה קלה. אפשר לשלוח את המקורית.</span>' : '') +
        (o.over ? '<span class="err">גם בגודל הכי קטן לא נכנסה ב-' + st.l + ' מ״ב.</span>' : (o.tries > 1 ? '<span class="nm">הוקטנה עוד כדי להיכנס ב-' + (st.l === 0.5 ? '½' : st.l) + ' מ״ב</span>' : '')) +
        '<span class="bt"><a class="btn btn-gold btn-sm" href="' + o.url + '" download="' + esc(o.file.name) + '" data-dl="' + i + '">להוריד</a>' +
        (canShare([o.file]) ? '<button class="btn btn-line btn-sm" type="button" data-share="' + i + '">לשלוח</button>' : '') + '</span></span></li>';
    }).join('');
    var ok = out.filter(function (o) { return o && !o.err; });
    if (!partial || ok.length === files.length) {
      var a = ok.reduce(function (s, o) { return s + o.src.size; }, 0), b = ok.reduce(function (s, o) { return s + o.blob.size; }, 0);
      $('tm-sum').textContent = ok.length ? (ok.length > 1 ? ok.length + ' תמונות: ' : '') + mb(a) + ' ← ' + mb(b) + (a > b ? ' (חיסכון של ' + Math.round((1 - b / a) * 100) + '%)' : '') : '';
    }
    $('tm-all').hidden = ok.length < 2;
    $('tm-share-all').hidden = !canShare(ok.map(function (o) { return o.file; }));
  }
  function canShare(fl) { try { return !!(navigator.canShare && fl.length && navigator.canShare({ files: fl })); } catch (e) { return false; } }
  function share(fl) {
    navigator.share({ files: fl }).catch(function () {});
    if (window.toolUsed) window.toolUsed('machshev_tmuna', { how: 'share', n: fl.length });
  }
  inp.addEventListener('change', function () { files = [].slice.call(inp.files || []).filter(function (f) { return /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp|gif|bmp)$/i.test(f.name); }); process(); });
  $('tm-size').addEventListener('click', function (e) { var b = e.target.closest('[data-w]'); if (!b) return; st.w = +b.getAttribute('data-w'); save(); files.length ? process() : draw(); });
  $('tm-lim').addEventListener('click', function (e) { var b = e.target.closest('[data-l]'); if (!b) return; st.l = +b.getAttribute('data-l'); save(); files.length ? process() : draw(); });
  var qt;
  $('tm-q').addEventListener('input', function () { st.q = +this.value; $('tm-qv').textContent = st.q; save(); clearTimeout(qt); qt = setTimeout(function () { if (files.length) process(); }, 350); });
  $('tm-list').addEventListener('click', function (e) {
    var s = e.target.closest('[data-share]');
    if (s) { share([out[+s.getAttribute('data-share')].file]); return; }
    if (e.target.closest('[data-dl]') && window.toolUsed) window.toolUsed('machshev_tmuna', { how: 'download' });
  });
  $('tm-share-all').addEventListener('click', function () { share(out.filter(function (o) { return o && !o.err; }).map(function (o) { return o.file; })); });
  $('tm-dl-all').addEventListener('click', function () {
    out.filter(function (o) { return o && !o.err; }).forEach(function (o, i) {
      setTimeout(function () { var a = document.createElement('a'); a.href = o.url; a.download = o.file.name; document.body.appendChild(a); a.click(); a.remove(); }, i * 400);
    });
    if (window.toolUsed) window.toolUsed('machshev_tmuna', { how: 'download_all' });
  });
  draw();
})();
