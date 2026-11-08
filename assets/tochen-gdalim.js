// תמונה אחת לכל המסכים – /kelim/tochen/gdalim/
// הכול בדפדפן: התמונה לא עולה לשום שרת. נשמרים רק ההעדפות (מצב, צבע, קבוצות) ב-localStorage.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tochen_gdalim_v1';
  var GROUPS = { ig: 'אינסטגרם', story: 'סטורי / סטטוס', fb: 'פייסבוק', profile: 'תמונת פרופיל', video: 'יוטיוב ולינקדאין', print: 'הדפסה ועיתון', custom: 'גודל משלכם' };
  var FORMATS = [
    { id: 'ig_square', g: 'ig', name: 'פוסט מרובע', w: 1080, h: 1080 },
    { id: 'ig_portrait', g: 'ig', name: 'פוסט לאורך (הכי בולט בפיד)', w: 1080, h: 1350 },
    { id: 'story', g: 'story', name: 'סטורי, רילס, טיקטוק וסטטוס בווטסאפ', w: 1080, h: 1920 },
    { id: 'fb_post', g: 'fb', name: 'פוסט לרוחב', w: 1200, h: 630 },
    { id: 'fb_cover', g: 'fb', name: 'תמונת נושא (קאבר)', w: 1640, h: 624, note: 'בטלפון נחתכים הצדדים' },
    { id: 'fb_event', g: 'fb', name: 'תמונת אירוע', w: 1920, h: 1005 },
    { id: 'profile', g: 'profile', name: 'פרופיל לכל הרשתות', w: 1080, h: 1080, circle: 1, note: 'מוצגת בעיגול' },
    { id: 'wa_profile', g: 'profile', name: 'פרופיל בווטסאפ', w: 640, h: 640, circle: 1 },
    { id: 'yt_thumb', g: 'video', name: 'תמונה ממוזערת ליוטיוב', w: 1280, h: 720 },
    { id: 'li_post', g: 'video', name: 'פוסט ללינקדאין ול-X', w: 1200, h: 627 },
    { id: 'a4', g: 'print', name: 'דף A4', w: 2480, h: 3508, note: 'חד להדפסה' },
    { id: 'a5', g: 'print', name: 'פלאייר A5', w: 1748, h: 2480, note: 'חד להדפסה' },
    { id: 'photo', g: 'print', name: 'תמונה 10×15', w: 1772, h: 1181, note: 'חד להדפסה' }
  ];
  var MNOTE = {
    crop: 'התמונה ממלאת את כל המסגרת, והכלי חותך את השוליים הפחות חשובים.',
    blur: 'רואים את כל התמונה בלי לחתוך כלום, ומאחוריה אותה תמונה מטושטשת.',
    color: 'רואים את כל התמונה בלי לחתוך כלום, על רקע בצבע שבוחרים.'
  };
  var S = { img: null, name: 'tmuna', sal: null, focus: null, per: {}, smart: {}, demo: true,
    mode: 'crop', bg: '#ffffff', off: [] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (sv) { if (MNOTE[sv.mode]) S.mode = sv.mode; if (/^#[0-9a-f]{6}$/i.test(sv.bg)) S.bg = sv.bg; if (Array.isArray(sv.off)) S.off = sv.off; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ mode: S.mode, bg: S.bg, off: S.off })); } catch (e) {} }
  var used = 0;
  function track(how, extra) { if (window.toolUsed) { var o = extra || {}; o.how = how; window.toolUsed('tochen_gdalim', o); } }
  function on(f) { return S.off.indexOf(f.g) < 0; }

  /* ---------- טעינה ---------- */
  var pick = $('gd-pick'), inp = $('gd-file');
  inp.addEventListener('change', function () { if (inp.files[0]) load(inp.files[0]); });
  ['dragenter', 'dragover'].forEach(function (ev) { pick.addEventListener(ev, function (e) { e.preventDefault(); pick.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { pick.addEventListener(ev, function (e) { e.preventDefault(); pick.classList.remove('over'); }); });
  pick.addEventListener('drop', function (e) { var f = e.dataTransfer.files[0]; if (f) load(f); });
  document.addEventListener('paste', function (e) {
    var it = [].slice.call((e.clipboardData || {}).items || []).filter(function (i) { return /^image\//.test(i.type); })[0];
    if (it) load(it.getAsFile());
  });

  function load(f, demo) {
    if (!demo && !/^image\//.test(f.type) && !/\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name || '')) { say('זה לא קובץ תמונה'); return; }
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () {
      S.img = img; S.demo = !!demo; S.focus = null; S.per = {}; S.smart = {};
      S.name = demo ? 'dugma' : ((f.name || 'tmuna').replace(/\.[^.]+$/, '') || 'tmuna');
      S.sal = saliency(img);
      $('gd-img').src = url; $('gd-mk').hidden = true;
      $('gd-demo-note').hidden = !demo;
      build();
      if (!demo) { say(''); if (!used) { used = 1; track('load', { w: img.naturalWidth, h: img.naturalHeight }); } }
    };
    img.onerror = function () { say('לא הצלחתי לפתוח את התמונה. אם היא מאייפון (HEIC), אפשר לשלוח אותה לעצמכם בווטסאפ ולנסות שוב.'); };
    img.src = url;
  }
  function say(t) { $('gd-sum').textContent = t; }

  /* ---------- חיתוך חכם: איפה הדבר המעניין ---------- */
  function saliency(img) {
    var k = 160 / Math.max(img.naturalWidth, img.naturalHeight);
    var w = Math.max(8, Math.round(img.naturalWidth * k)), h = Math.max(8, Math.round(img.naturalHeight * k));
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
    var d = x.getImageData(0, 0, w, h).data, L = new Float32Array(w * h), sc = new Float32Array(w * h), i, X, y;
    for (i = 0; i < w * h; i++) L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    for (y = 0; y < h; y++) for (X = 0; X < w; X++) {
      i = y * w + X; var r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      var gx = L[y * w + Math.min(w - 1, X + 1)] - L[y * w + Math.max(0, X - 1)];
      var gy = L[Math.min(h - 1, y + 1) * w + X] - L[Math.max(0, y - 1) * w + X];
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      var s = Math.abs(gx) + Math.abs(gy) + (mx - mn) * 0.25;
      var Yc = 0.299 * r + 0.587 * g + 0.114 * b, Cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b, Cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;
      if (Yc > 60 && Yc < 230 && Cb > 85 && Cb < 127 && Cr > 135 && Cr < 173) s += 520; // גוון עור (YCbCr) – פנים חשובות, בלי שקיעה כתומה
      sc[i] = s;
    }
    var I = new Float64Array((w + 1) * (h + 1));
    for (y = 0; y < h; y++) { var row = 0; for (X = 0; X < w; X++) { row += sc[y * w + X]; I[(y + 1) * (w + 1) + X + 1] = I[y * (w + 1) + X + 1] + row; } }
    return { w: w, h: h, I: I, k: k };
  }
  function smartCenter(vw, vh) {
    var s = S.sal, w = s.w, h = s.h, I = s.I, W = w + 1;
    var bw = Math.min(w, Math.max(1, Math.round(vw * s.k))), bh = Math.min(h, Math.max(1, Math.round(vh * s.k)));
    var best = -1, bx = (w - bw) / 2, by = (h - bh) / 2;
    for (var y = 0; y <= h - bh; y++) for (var x = 0; x <= w - bw; x++) {
      var sum = I[(y + bh) * W + x + bw] - I[y * W + x + bw] - I[(y + bh) * W + x] + I[y * W + x];
      var v = sum * (1 - 0.2 * Math.hypot((x + bw / 2) / w - 0.5, (y + bh / 2) / h - 0.5));
      if (v > best) { best = v; bx = x; by = y; }
    }
    return { x: (bx + bw / 2) / w, y: (by + bh / 2) / h };
  }

  /* ---------- ציור ---------- */
  function layout(f, W, H) {
    var sw = S.img.naturalWidth, sh = S.img.naturalHeight, p = S.per[f.id] || {}, z = p.z || 1;
    var fit = S.mode !== 'crop';
    var s = (fit ? Math.min(W / sw, H / sh) : Math.max(W / sw, H / sh)) * z, dw = sw * s, dh = sh * s;
    var c = p.c || S.focus;
    if (!c) {
      if (fit) c = { x: 0.5, y: 0.5 };
      else { var key = f.id + '|' + z; c = S.smart[key] || (S.smart[key] = smartCenter(W / s, H / s)); }
    }
    function pos(D, V, cc) { return D <= V ? (V - D) / 2 : Math.min(0, Math.max(V - D, V / 2 - cc * D)); }
    return { dw: dw, dh: dh, dx: pos(dw, W, c.x), dy: pos(dh, H, c.y) };
  }
  function render(ctx, f, W, H, forJpg) {
    var Lo = layout(f, W, H), sw = S.img.naturalWidth, sh = S.img.naturalHeight;
    ctx.clearRect(0, 0, W, H);
    if (forJpg || S.mode === 'color') { ctx.fillStyle = S.mode === 'color' ? S.bg : '#ffffff'; ctx.fillRect(0, 0, W, H); }
    if (S.mode === 'blur') {
      var cs = Math.max(W / sw, H / sh) * 1.1;
      ctx.save(); ctx.filter = 'blur(' + Math.round(Math.max(W, H) / 40) + 'px) brightness(.8)';
      ctx.drawImage(S.img, (W - sw * cs) / 2, (H - sh * cs) / 2, sw * cs, sh * cs); ctx.restore();
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(S.img, Lo.dx, Lo.dy, Lo.dw, Lo.dh);
    return Lo;
  }

  /* ---------- כרטיסים ---------- */
  function buildGroups() {
    var box = $('gd-groups'); box.innerHTML = '';
    var have = {}; FORMATS.forEach(function (f) { have[f.g] = 1; });
    Object.keys(GROUPS).filter(function (g) { return have[g]; }).forEach(function (g) {
      var l = document.createElement('label');
      l.innerHTML = '<input type="checkbox"' + (S.off.indexOf(g) < 0 ? ' checked' : '') + '> ' + GROUPS[g];
      l.querySelector('input').addEventListener('change', function (e) {
        if (e.target.checked) S.off = S.off.filter(function (x) { return x !== g; }); else S.off.push(g);
        save(); build();
      });
      box.appendChild(l);
    });
  }
  function build() {
    buildGroups(); syncTabs();
    var out = $('gd-out'); out.innerHTML = '';
    var grid = null, last = null;
    FORMATS.filter(on).forEach(function (f) {
      if (f.g !== last) {
        last = f.g; var t = document.createElement('h2'); t.className = 'gd-grp'; t.textContent = GROUPS[f.g]; out.appendChild(t);
        grid = document.createElement('div'); grid.className = 'gd-grid'; out.appendChild(grid);
      }
      var card = document.createElement('div'); card.className = 'gd-card';
      card.innerHTML = '<b>' + f.name + '</b><span class="nt">' + f.w + '×' + f.h + (f.note ? ' · ' + f.note : '') + '</span>' +
        '<div class="gd-st' + (f.circle ? ' circ' : '') + '"><canvas tabindex="0" role="img"></canvas></div>' +
        '<div class="gd-ctl"><label for="z-' + f.id + '">זום</label><input id="z-' + f.id + '" type="range" min="1" max="3" step="0.05" value="' + ((S.per[f.id] || {}).z || 1) + '">' +
        '<button class="btn btn-line btn-sm" type="button" data-dl>להוריד</button>' +
        (f.g === 'custom' ? '<button class="btn btn-line btn-sm" type="button" data-rm aria-label="להסיר את הגודל">✕</button>' : '') + '</div>';
      var cv = card.querySelector('canvas'), k = 480 / Math.max(f.w, f.h);
      cv.width = Math.round(f.w * k); cv.height = Math.round(f.h * k);
      cv.setAttribute('aria-label', 'תצוגה של ' + f.name + '. אפשר להזיז עם החיצים');
      var ctx = cv.getContext('2d');
      f.draw = function () { render(ctx, f, cv.width, cv.height); };
      f.draw();
      var rng = card.querySelector('input[type=range]');
      rng.addEventListener('input', function () { (S.per[f.id] = S.per[f.id] || {}).z = +rng.value; f.draw(); });
      card.querySelector('[data-dl]').addEventListener('click', function () { downloadOne(f); });
      var rm = card.querySelector('[data-rm]');
      if (rm) rm.addEventListener('click', function () { FORMATS.splice(FORMATS.indexOf(f), 1); build(); });
      // גרירה להזזה
      var drag = null;
      function center() { var Lo = layout(f, cv.width, cv.height); return { Lo: Lo, c: { x: (cv.width / 2 - Lo.dx) / Lo.dw, y: (cv.height / 2 - Lo.dy) / Lo.dh } }; }
      function setC(x, y) { var p = S.per[f.id] = S.per[f.id] || {}; p.c = { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }; f.draw(); }
      cv.addEventListener('pointerdown', function (e) {
        cv.setPointerCapture(e.pointerId); var r = cv.getBoundingClientRect(), m = center();
        drag = { x: e.clientX, y: e.clientY, Lo: m.Lo, c: m.c, ratio: cv.width / r.width };
      });
      cv.addEventListener('pointermove', function (e) {
        if (!drag) return;
        setC(drag.c.x - (e.clientX - drag.x) * drag.ratio / drag.Lo.dw, drag.c.y - (e.clientY - drag.y) * drag.ratio / drag.Lo.dh);
      });
      cv.addEventListener('pointerup', function () { drag = null; });
      cv.addEventListener('pointercancel', function () { drag = null; });
      cv.addEventListener('dblclick', function () { S.per[f.id] = {}; rng.value = 1; f.draw(); });
      cv.addEventListener('keydown', function (e) {
        var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (!d) return; e.preventDefault();
        var m = center(); setC(m.c.x + d[0] * 0.03, m.c.y + d[1] * 0.03);
      });
      grid.appendChild(card);
    });
    var n = FORMATS.filter(on).length;
    $('gd-share').disabled = $('gd-dl').disabled = !n;
  }
  function redraw() { FORMATS.forEach(function (f) { if (f.draw && on(f)) f.draw(); }); }

  /* ---------- נקודת מיקוד ---------- */
  function setFocus(x, y) {
    S.focus = { x: x, y: y };
    Object.keys(S.per).forEach(function (k) { delete S.per[k].c; });
    var m = $('gd-mk'); m.style.left = (x * 100) + '%'; m.style.top = (y * 100) + '%'; m.hidden = false;
    redraw();
  }
  $('gd-orig').addEventListener('click', function (e) {
    var r = $('gd-img').getBoundingClientRect();
    setFocus((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });
  $('gd-orig').addEventListener('keydown', function (e) {
    var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return; e.preventDefault();
    var f = S.focus || { x: 0.5, y: 0.5 };
    setFocus(Math.min(1, Math.max(0, f.x + d[0] * 0.05)), Math.min(1, Math.max(0, f.y + d[1] * 0.05)));
  });
  $('gd-auto').addEventListener('click', function () { S.focus = null; S.per = {}; $('gd-mk').hidden = true; build(); });

  /* ---------- מצב ורקע ---------- */
  function syncTabs() {
    [].forEach.call($('gd-mode').children, function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-m') === S.mode)); });
    [].forEach.call($('gd-bg').children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-c') === S.bg)); b.setAttribute('aria-selected', String(b.getAttribute('data-c') === S.bg)); });
    $('gd-mnote').textContent = MNOTE[S.mode];
    $('gd-colors').hidden = S.mode !== 'color';
  }
  $('gd-mode').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; S.mode = b.getAttribute('data-m'); save(); syncTabs(); redraw(); });
  $('gd-bg').addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (!b) return; S.bg = b.getAttribute('data-c'); save(); syncTabs(); redraw(); });

  $('gd-add').addEventListener('click', function () {
    var w = +$('gd-cw').value, h = +$('gd-ch').value, cm = $('gd-cu').value === 'cm';
    if (!(w > 0 && h > 0)) { say('צריך רוחב וגובה'); return; }
    var name = cm ? w + '×' + h + ' ס״מ' : w + '×' + h + ' פיקסלים';
    if (cm) { w = Math.round(w / 2.54 * 300); h = Math.round(h / 2.54 * 300); }
    if (w * h > 40e6) { say('הגודל גדול מדי לטלפון. נסו מידה קטנה יותר.'); return; }
    FORMATS.push({ id: 'custom_' + Date.now(), g: 'custom', name: name, w: w, h: h, note: cm ? 'חד להדפסה' : '' });
    S.off = S.off.filter(function (x) { return x !== 'custom'; });
    build(); say('נוסף גודל: ' + name); track('custom', { cm: cm ? 1 : 0 });
  });

  /* ---------- שמירה ---------- */
  function makeFile(f) {
    return new Promise(function (res) {
      var c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
      render(c.getContext('2d'), f, f.w, f.h, true);
      c.toBlob(function (b) {
        var nm = S.name + '-' + f.name.replace(/[\\/:*?"<>|()]/g, '').replace(/\s+/g, '-') + '-' + f.w + 'x' + f.h + '.jpg';
        res(new File([b], nm, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    });
  }
  function dl(file) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }
  function downloadOne(f) { makeFile(f).then(dl); track('download', { f: f.id, mode: S.mode }); }
  function all() {
    var list = FORMATS.filter(on); say('מכין ' + list.length + ' תמונות…');
    return list.reduce(function (p, f) { return p.then(function (arr) { return makeFile(f).then(function (x) { arr.push(x); return arr; }); }); }, Promise.resolve([]));
  }
  $('gd-dl').addEventListener('click', function () {
    all().then(function (files) {
      files.forEach(function (x, i) { setTimeout(function () { dl(x); }, i * 400); });
      say('ירדו ' + files.length + ' תמונות'); track('download_all', { n: files.length, mode: S.mode, demo: S.demo ? 1 : 0 });
    });
  });
  $('gd-share').addEventListener('click', function () {
    all().then(function (files) {
      var ok = false; try { ok = !!(navigator.canShare && navigator.canShare({ files: files })); } catch (e) {}
      if (ok) { navigator.share({ files: files }).then(function () { say(''); }).catch(function () { say(''); }); track('share', { n: files.length, mode: S.mode }); }
      else { files.forEach(function (x, i) { setTimeout(function () { dl(x); }, i * 400); }); say('ירדו ' + files.length + ' תמונות'); track('download_all', { n: files.length, mode: S.mode }); }
    });
  });

  /* ---------- דוגמה בכניסה הראשונה ---------- */
  (function demo() {
    var c = document.createElement('canvas'); c.width = 2000; c.height = 1200; var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, 1200); g.addColorStop(0, '#f2b766'); g.addColorStop(0.55, '#e98b5a'); g.addColorStop(1, '#7a4b6e');
    x.fillStyle = g; x.fillRect(0, 0, 2000, 1200);
    x.fillStyle = 'rgba(255,240,200,.9)'; x.beginPath(); x.arc(520, 560, 120, 0, 7); x.fill();
    x.fillStyle = '#3d5a3a'; x.beginPath(); x.moveTo(0, 900); x.quadraticCurveTo(700, 760, 2000, 880); x.lineTo(2000, 1200); x.lineTo(0, 1200); x.fill();
    x.fillStyle = '#e0a37c'; x.beginPath(); x.arc(1420, 560, 120, 0, 7); x.fill();
    x.fillStyle = '#2b2b2b'; x.beginPath(); x.arc(1380, 540, 13, 0, 7); x.arc(1460, 540, 13, 0, 7); x.fill();
    x.strokeStyle = '#2b2b2b'; x.lineWidth = 9; x.beginPath(); x.arc(1420, 585, 45, 0.2, Math.PI - 0.2); x.stroke();
    x.fillStyle = '#25466e'; x.beginPath(); x.moveTo(1250, 1200); x.lineTo(1290, 720); x.lineTo(1550, 720); x.lineTo(1590, 1200); x.fill();
    c.toBlob(function (b) { load(new File([b], 'dugma.jpg', { type: 'image/jpeg' }), true); }, 'image/jpeg', 0.9);
  })();
})();
