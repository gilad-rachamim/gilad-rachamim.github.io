// עריכת PDF וחתימה (/kelim/machshev/chatima/) – הכול בדפדפן, שום קובץ לא עולה לשרת.
// PDF.js מצייר כל עמוד על canvas. מעל כל עמוד יש שכבה של פריטים (טקסט, חתימה, תאריך, וי, מחיקה בלבן),
// שנשמרים בנקודות PDF (pt). מקומות למילוי מזוהים לבד: קווים ריקים, תיבות סימון קטנות ושדות של טופס PDF.
// בשמירה כל פריט מצויר כתמונה שקופה (כך העברית יוצאת נכונה בלי גופן מוטמע) ו-pdf-lib מניח אותה על העמוד
// המקורי – הטקסט המקורי של הקובץ נשאר כמו שהוא. קובץ נעול לעריכה נשמר כתמונות של העמודים.
// הקובץ מגיע מ: בחירת קובץ / גרירה, שיתוף מאפליקציה אחרת (sw.js -> ?share=1), "פתח באמצעות" במחשב
// (file_handlers + launchQueue), או מתוסף הכרום (postMessage מסוג hakelim-chatima-pdf).
(function () {
  'use strict';
  var TOOL = 'machshev_chatima', V = '/assets/vendor/', SAMPLE = '/assets/machshev-chatima-dugma.pdf';
  var $ = function (id) { return document.getElementById(id); };
  var root = $('ch-app'); if (!root) return;
  var sent = {};
  function used(how, x) { if (!window.toolUsed) return; var k = how + (x && x.type || ''); if (sent[k] && Date.now() - sent[k] < 30000) return; sent[k] = Date.now(); window.toolUsed(TOOL, Object.assign({ how: how }, x || {})); }
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
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }

  var S = { bytes: null, name: '', doc: null, pages: [], items: [], mode: 'text', zoom: 1, dirty: false, sample: false, sel: null, color: '#111111', id: 1, busy: false, pending: null, out: null };
  var MODES = { text: 'לחצו על קו ריק או בכל מקום בדף – ומקלידים.', sig: 'לחצו במקום שבו צריך לחתום.', date: 'לחצו איפה לכתוב את התאריך של היום.', check: 'לחצו על תיבה או במקום שבו צריך וי.', white: 'לחצו על מה שצריך להסתיר – יופיע מלבן לבן שאפשר להגדיל.' };
  function msg(t, cls) { var m = $('ch-msg'); m.textContent = t || ''; m.className = 'ch-msg ' + (cls || ''); }
  function hint() { $('ch-hint').textContent = MODES[S.mode]; }
  function today() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function isHeb(t) { return /[֐-׿]/.test(t); }

  // ---------- טעינת קובץ ----------
  function loadFile(file, how) {
    if (!file) return;
    if (!/pdf$/i.test(file.type || '') && !/\.pdf$/i.test(file.name || '')) { msg('זה לא קובץ PDF. בחרו קובץ שהשם שלו נגמר ב-‎.pdf', 'bad'); return; }
    if (S.dirty && !S.sample && !confirm('יש שינויים שלא נשמרו בקובץ הקודם. לפתוח קובץ חדש בכל זאת?')) return;
    file.arrayBuffer().then(function (buf) { open(new Uint8Array(buf), file.name || 'מסמך.pdf', false, how); });
  }
  function open(bytes, name, sample, how) {
    msg('פותחים את הקובץ…');
    return loadLibs().then(function () {
      return window.pdfjsLib.getDocument({ data: bytes.slice(0), isEvalSupported: false }).promise;
    }).then(function (doc) {
      if (S.doc) try { S.doc.destroy(); } catch (e) {}
      S.doc = doc; S.bytes = bytes; S.name = name; S.sample = sample; S.items = []; S.sel = null; S.dirty = false; S.out = null;
      $('ch-out').hidden = true; $('ch-sample').hidden = !sample; $('ch-fname').textContent = sample ? '' : name;
      root.classList.add('has-doc');
      return renderAll();
    }).then(function () {
      msg(sample ? '' : 'הקובץ פתוח. ' + MODES[S.mode], sample ? '' : 'ok');
      if (!sample) { used('open', { src: how || 'file' }); }
      if (sample && !ls('chatima-seen')) { demo(); ls('chatima-seen', '1'); }
    }).catch(function (e) {
      var pw = e && e.name === 'PasswordException';
      msg(pw ? 'הקובץ מוגן בסיסמה. פתחו אותו קודם עם הסיסמה ושמרו עותק בלי סיסמה.' : 'לא הצלחנו לפתוח את הקובץ. אולי הוא פגום, או שזה לא PDF.', 'bad');
    });
  }

  // ---------- ציור העמודים ----------
  function pagesWidth() { var w = $('ch-pages').clientWidth || root.clientWidth || 360; return Math.min(w - 4, 860); }
  function renderAll(keep) {
    var box = $('ch-pages'), y = window.scrollY; box.textContent = ''; S.pages = []; S.lastW = pagesWidth();
    var chain = Promise.resolve();
    for (var i = 1; i <= S.doc.numPages; i++) (function (i) {
      chain = chain.then(function () { return S.doc.getPage(i).then(function (page) { return renderPage(page, i, keep ? keep[i - 1] : null); }); });
    })(i);
    return chain.then(function () { S.items.forEach(drawItem); if (keep) window.scrollTo(0, y); });
  }
  function renderPage(page, num, blanks) {
    var vp1 = page.getViewport({ scale: 1 }), k = pagesWidth() * S.zoom / vp1.width, dpr = Math.min(window.devicePixelRatio || 1, 2), px = Math.min(k * dpr, 3600 / vp1.width);
    var el = document.createElement('div'); el.className = 'ch-page'; el.style.width = Math.round(vp1.width * k) + 'px'; el.style.height = Math.round(vp1.height * k) + 'px';
    var cv = document.createElement('canvas'), vp = page.getViewport({ scale: px }); cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'עמוד ' + num + ' מתוך ' + S.doc.numPages);
    var layer = document.createElement('div'); layer.className = 'ch-layer'; el.appendChild(cv); el.appendChild(layer);
    var tag = document.createElement('span'); tag.className = 'ch-pn'; tag.setAttribute('aria-hidden', 'true'); tag.textContent = num + ' / ' + S.doc.numPages; el.appendChild(tag);
    $('ch-pages').appendChild(el);
    var P = { num: num, el: el, layer: layer, vp: vp1, k: k, blanks: blanks || null, page: page }; S.pages.push(P);
    layer.addEventListener('click', function (e) { onLayerClick(P, e); });
    if (blanks) drawBlanks(P);
    return page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise.then(function () {
      if (!blanks) return findBlanks(P, page).then(function () { drawBlanks(P); });
    });
  }

  // ---------- זיהוי מקומות למילוי ----------
  function findBlanks(P, page) {
    if (P.blanks) return Promise.resolve();
    var vp = P.vp, s = 1.5, cv = document.createElement('canvas'), v2 = page.getViewport({ scale: s });
    cv.width = Math.floor(v2.width); cv.height = Math.floor(v2.height);
    var g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    var fields = [];
    return page.getAnnotations({ intent: 'display' }).then(function (anns) {
      anns.forEach(function (a) {
        if (a.subtype !== 'Widget' || a.readOnly || !a.rect) return;
        var r = vp.convertToViewportRectangle(a.rect), x = Math.min(r[0], r[2]), y = Math.min(r[1], r[3]), w = Math.abs(r[2] - r[0]), h = Math.abs(r[3] - r[1]);
        if (w < 4 || h < 4) return;
        if (a.fieldType === 'Tx') fields.push({ type: 'tx', x: x, y: y, w: w, h: h, field: a.fieldName, value: a.fieldValue || '' });
        else if (a.fieldType === 'Btn' && a.checkBox) fields.push({ type: 'cb', x: x, y: y, w: w, h: h, field: a.fieldName });
      });
    }).catch(function () {}).then(function () {
      return page.render({ canvasContext: g, viewport: v2, annotationMode: window.pdfjsLib.AnnotationMode ? window.pdfjsLib.AnnotationMode.DISABLE : 0 }).promise;
    }).then(function () {
      var found = scan(g.getImageData(0, 0, cv.width, cv.height), s, vp);
      found = found.filter(function (b) { return !fields.some(function (f) { return overlap(f, b) > 0.3; }); });
      P.blanks = fields.concat(found).slice(0, 160);
    }).catch(function () { P.blanks = fields; });
  }
  function overlap(a, b) {
    var x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return (x * y) / Math.min(a.w * a.h, b.w * b.h);
  }
  // סריקת פיקסלים: קווים אופקיים דקים שמעליהם רווח ריק = מקום לכתוב. ריבועים קטנים = תיבת סימון.
  function scan(img, s, vp) {
    var W = img.width, H = img.height, d = img.data, out = [];
    var dark = new Uint8Array(W * H);
    for (var i = 0, p = 0; i < W * H; i++, p += 4) dark[i] = (d[p] * 0.3 + d[p + 1] * 0.59 + d[p + 2] * 0.11) < 160 ? 1 : 0;
    function rowDark(y, x0, x1) { var c = 0; for (var x = x0; x <= x1; x++) c += dark[y * W + x]; return c; }
    var minLen = Math.max(28 * s, W * 0.045), maxLen = W * 0.9, runs = [];
    for (var y = 0; y < H; y++) {
      var x = 0;
      while (x < W) {
        if (!dark[y * W + x]) { x++; continue; }
        var x0 = x; while (x < W && dark[y * W + x]) x++;
        var len = x - x0;
        if (len >= 7 * s && len <= maxLen) runs.push({ y: y, x0: x0, x1: x - 1 });
      }
    }
    // מאחדים שורות צמודות (קו בעובי 1-3 פיקסלים)
    var lines = [];
    runs.forEach(function (r) {
      for (var j = lines.length - 1; j >= 0 && lines[j].y1 >= r.y - 1; j--) {
        var L = lines[j];
        if (L.y1 === r.y - 1 && Math.abs(L.x0 - r.x0) <= 3 && Math.abs(L.x1 - r.x1) <= 3) { L.y1 = r.y; return; }
      }
      lines.push({ y0: r.y, y1: r.y, x0: r.x0, x1: r.x1 });
    });
    lines = lines.filter(function (L) { return L.y1 - L.y0 <= 3.2 * s; });
    var used2 = {};
    // תיבות סימון: קו עליון וקו תחתון באותו רוחב, במרחק של בערך הרוחב
    lines.forEach(function (T, ti) {
      var len = T.x1 - T.x0; if (len < 7 * s || len > 22 * s) return;
      lines.forEach(function (B, bi) {
        if (bi === ti || used2[bi] || used2[ti]) return;
        var gap = B.y0 - T.y1;
        if (gap < len * 0.7 || gap > len * 1.3) return;
        if (Math.abs(B.x0 - T.x0) > 3 || Math.abs(B.x1 - T.x1) > 3) return;
        var mid = Math.round((T.y1 + B.y0) / 2);
        if (!dark[mid * W + T.x0] && !dark[mid * W + T.x0 + 1]) return;
        if (!dark[mid * W + T.x1] && !dark[mid * W + T.x1 - 1]) return;
        if (rowDark(mid, T.x0 + 3, T.x1 - 3) > 1) return;
        used2[ti] = used2[bi] = 1;
        out.push({ type: 'cb', x: T.x0 / s, y: T.y0 / s, w: (T.x1 - T.x0 + 1) / s, h: (B.y1 - T.y0 + 1) / s });
      });
    });
    lines.forEach(function (L, li) {
      if (used2[li]) return;
      var len = L.x1 - L.x0 + 1; if (len < minLen) return;
      var a = L.x0 + 2, b = L.x1 - 2, space = 0, limit = Math.round(30 * s);
      for (var y = L.y0 - 2; y >= 0 && space < limit; y--) { if (rowDark(y, a, b) > Math.max(1, len * 0.01)) break; space++; }
      if (space < 9 * s) return;
      var h = Math.min(space - 1 * s, 24 * s), w = len / s;
      out.push({ type: 'ln', x: L.x0 / s, y: (L.y0 - 1 * s - h) / s, w: w, h: h / s });
    });
    // קווים כמעט באותו מקום (קו שבור לחלקים) – רק אחד
    return out.filter(function (b, i) { return !out.some(function (c, j) { return j < i && overlap(b, c) > 0.6; }); });
  }
  function drawBlanks(P) {
    (P.blanks || []).forEach(function (b, i) {
      var el = document.createElement('button'); el.type = 'button'; el.className = 'ch-blank ch-b-' + b.type;
      el.setAttribute('aria-label', b.type === 'cb' ? 'תיבת סימון – לסמן וי' : 'מקום למילוי – לכתוב כאן');
      // אזור לחיצה של 24 פיקסלים לפחות (נגישות לאצבע), והמסגרת שרואים בגודל האמיתי של הקו
      var w = b.w * P.k, h = b.h * P.k, W = Math.max(24, w), H = Math.max(24, h);
      el.style.left = (b.x * P.k - (W - w) / 2) + 'px'; el.style.top = (b.y * P.k - (H - h) / 2) + 'px'; el.style.width = W + 'px'; el.style.height = H + 'px';
      var vis = document.createElement('span'); vis.className = 'ch-bv'; vis.style.left = ((W - w) / 2) + 'px'; vis.style.top = ((H - h) / 2) + 'px'; vis.style.width = w + 'px'; vis.style.height = h + 'px';
      el.appendChild(vis); el.dataset.i = i; b.el = el;
      el.addEventListener('click', function (e) { e.stopPropagation(); onBlank(P, b); });
      P.layer.appendChild(el);
    });
    syncBlanks();
  }
  function place(el, r, k) { el.style.left = (r.x * k) + 'px'; el.style.top = (r.y * k) + 'px'; el.style.width = (r.w * k) + 'px'; el.style.height = (r.h * k) + 'px'; }
  function syncBlanks() {
    var show = $('ch-showb').checked;
    S.pages.forEach(function (P) { (P.blanks || []).forEach(function (b) { if (b.el) b.el.hidden = !show || !!b.taken; }); });
  }

  // ---------- פריטים ----------
  function add(it, focus) {
    if (!it.color && it.type !== 'sig' && it.type !== 'white') it.color = S.color;
    it.id = S.id++; S.items.push(it); S.dirty = true; S.out = null; $('ch-out').hidden = true;
    drawItem(it); select(it, focus);
    used('add', { type: it.type });
    return it;
  }
  function onBlank(P, b) {
    if (b.type === 'cb') { add({ page: P.num - 1, type: 'check', x: b.x, y: b.y, w: b.w, h: b.h, blank: b }); b.taken = 1; syncBlanks(); return; }
    var h = b.h, w = b.w;
    if (S.mode === 'sig') return askSig({ page: P.num - 1, x: b.x, y: b.y, w: w, h: h, blank: b, fit: true });
    if (S.mode === 'check') { var c = Math.min(h, 16); add({ page: P.num - 1, type: 'check', x: b.x + w - c - 4, y: b.y + h - c, w: c, h: c }); return; }
    if (S.mode === 'white') { add({ page: P.num - 1, type: 'white', x: b.x, y: b.y, w: w, h: h }); return; }
    var size = Math.max(7, Math.min(13, h * 0.72));
    var t = S.mode === 'date' ? today() : (b.value || '');
    add({ page: P.num - 1, type: 'text', x: b.x, y: b.y, w: w, h: h, text: t, size: size, base: size, blank: b }, true);
    b.taken = 1; syncBlanks();
  }
  function onLayerClick(P, e) {
    if (e.target !== P.layer) return;
    var r = P.layer.getBoundingClientRect(), x = (e.clientX - r.left) / P.k, y = (e.clientY - r.top) / P.k, pw = P.vp.width;
    if (S.sel) { select(null); return; }
    if (S.mode === 'sig') return askSig({ page: P.num - 1, x: x - 60, y: y - 25, w: 120, h: 50 });
    if (S.mode === 'check') return add({ page: P.num - 1, type: 'check', x: x - 7, y: y - 7, w: 14, h: 14 });
    if (S.mode === 'white') return add({ page: P.num - 1, type: 'white', x: x - 40, y: y - 8, w: 80, h: 16 });
    var w = Math.min(170, pw - 8), xr = Math.min(pw - 4, x + 8), x0 = Math.max(4, xr - w);
    add({ page: P.num - 1, type: 'text', x: x0, y: y - 9, w: xr - x0, h: 18, text: S.mode === 'date' ? today() : '', size: 12, base: 12 }, true);
  }
  function fitText(it) {
    if (it.type !== 'text') return;
    var g = fitText.g || (fitText.g = document.createElement('canvas').getContext('2d')), size = it.base;
    for (; size > 5; size -= 0.5) { g.font = size + 'px Assistant, Arial, sans-serif'; if (g.measureText(it.text || '').width <= it.w - 4) break; }
    it.size = size;
  }
  function drawItem(it) {
    var P = S.pages[it.page]; if (!P) return;
    if (it.el) it.el.remove();
    var el = document.createElement('div'); el.className = 'ch-it ch-' + it.type; it.el = el;
    if (it.type === 'text') {
      var inp = document.createElement('input'); inp.type = 'text'; inp.dir = 'auto'; inp.value = it.text || ''; inp.setAttribute('aria-label', 'טקסט על הדף');
      inp.style.color = it.color || S.color;
      inp.addEventListener('input', function () { it.text = inp.value; fitText(it); inp.style.fontSize = (it.size * S.pages[it.page].k) + 'px'; S.dirty = true; S.out = null; $('ch-out').hidden = true; });
      inp.addEventListener('focus', function () { select(it); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); select(null); } });
      el.appendChild(inp); fitText(it); inp.style.fontSize = (it.size * P.k) + 'px';
    } else if (it.type === 'sig') {
      var im = new Image(); im.src = it.img; im.alt = 'חתימה'; im.draggable = false; el.appendChild(im);
    } else if (it.type === 'check') {
      el.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10.5l4.5 4.5L17 4.5" fill="none" stroke="' + (it.color || S.color) + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'סימון וי');
    }
    place(el, it, P.k);
    var bar = document.createElement('div'); bar.className = 'ch-bar';
    bar.innerHTML = '<button type="button" class="mv" aria-label="להזיז">✥</button>' +
      (it.type === 'text' ? '<button type="button" data-a="-" aria-label="להקטין אותיות">א-</button><button type="button" data-a="+" aria-label="להגדיל אותיות">א+</button>' : '<button type="button" data-a="-" aria-label="להקטין">−</button><button type="button" data-a="+" aria-label="להגדיל">+</button>') +
      '<button type="button" data-a="x" aria-label="למחוק">🗑</button>';
    el.appendChild(bar);
    var rs = document.createElement('span'); rs.className = 'ch-rs'; rs.setAttribute('aria-hidden', 'true'); el.appendChild(rs);
    bar.addEventListener('click', function (e) {
      var a = e.target.closest('button'); if (!a || !a.dataset.a) return; e.stopPropagation();
      if (a.dataset.a === 'x') return remove(it);
      var f = a.dataset.a === '+' ? 1.15 : 1 / 1.15;
      if (it.type === 'text') { it.base = Math.max(6, Math.min(40, it.base * f)); if (f > 1 && it.h < it.base * 1.4) { it.y -= (it.base * 1.4 - it.h) / 2; it.h = it.base * 1.4; } fitText(it); }
      else { var cx = it.x + it.w / 2, cy = it.y + it.h / 2; it.w *= f; it.h *= f; it.x = cx - it.w / 2; it.y = cy - it.h / 2; }
      S.dirty = true; S.out = null; drawItem(it); select(it);
    });
    drag(el.querySelector('.mv'), it, 'move');
    if (it.type !== 'text') drag(el, it, 'move');
    drag(rs, it, 'size');
    el.addEventListener('click', function (e) { e.stopPropagation(); if (S.sel !== it) select(it); });
    P.layer.appendChild(el);
    if (S.sel === it) el.classList.add('sel');
  }
  function drag(h, it, kind) {
    var st = null;
    h.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.ch-bar button[data-a]')) return;
      if (kind === 'move' && h === it.el && e.target.closest('.ch-rs')) return;
      st = { x: e.clientX, y: e.clientY, ox: it.x, oy: it.y, ow: it.w, oh: it.h, moved: false };
      try { h.setPointerCapture(e.pointerId); } catch (x) {}
      select(it); e.preventDefault(); e.stopPropagation();
    });
    h.addEventListener('pointermove', function (e) {
      if (!st) return; var k = S.pages[it.page].k, dx = (e.clientX - st.x) / k, dy = (e.clientY - st.y) / k, P = S.pages[it.page];
      if (Math.abs(dx) + Math.abs(dy) > 1) st.moved = true;
      if (kind === 'move') { it.x = Math.max(-it.w / 2, Math.min(P.vp.width - it.w / 2, st.ox + dx)); it.y = Math.max(-it.h / 2, Math.min(P.vp.height - it.h / 2, st.oy + dy)); }
      else {
        var ratio = st.oh / st.ow;
        it.w = Math.max(8, st.ow - dx); it.x = st.ox + st.ow - it.w;
        it.h = it.type === 'sig' || it.type === 'check' ? it.w * ratio : Math.max(6, st.oh + dy);
        if (it.type === 'text') fitText(it);
      }
      place(it.el, it, k);
      if (it.type === 'text') it.el.querySelector('input').style.fontSize = (it.size * k) + 'px';
      e.preventDefault();
    });
    function end() { if (st && st.moved) { S.dirty = true; S.out = null; $('ch-out').hidden = true; } st = null; }
    h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
  }
  function select(it, focus) {
    S.items.forEach(function (x) { if (x.el) x.el.classList.toggle('sel', x === it); });
    S.sel = it || null;
    if (it && focus && it.type === 'text') { var i = it.el.querySelector('input'); try { i.focus({ preventScroll: true }); var n = i.value.length; i.setSelectionRange(n, n); } catch (e) {} }
  }
  function remove(it) {
    S.items = S.items.filter(function (x) { return x !== it; });
    if (it.el) it.el.remove();
    if (it.blank) { it.blank.taken = 0; syncBlanks(); }
    if (S.sel === it) S.sel = null; S.dirty = S.items.length > 0; S.out = null; $('ch-out').hidden = true;
  }

  // ---------- חתימה ----------
  var pad = $('ch-pad'), pg = pad.getContext('2d'), inked = false, pen = '#1b3a8f';
  function padSize() { var r = pad.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3); pad.width = Math.max(300, r.width * dpr); pad.height = Math.max(140, r.height * dpr); pg.lineCap = pg.lineJoin = 'round'; pg.lineWidth = 2.6 * dpr; pg.strokeStyle = pen; pg.fillStyle = pen; inked = false; }
  (function () {
    var down = false, last = null;
    function pt(e) { var r = pad.getBoundingClientRect(); return { x: (e.clientX - r.left) * pad.width / r.width, y: (e.clientY - r.top) * pad.height / r.height }; }
    pad.addEventListener('pointerdown', function (e) { down = true; last = pt(e); try { pad.setPointerCapture(e.pointerId); } catch (x) {} pg.beginPath(); pg.arc(last.x, last.y, pg.lineWidth / 2, 0, 7); pg.fill(); inked = true; e.preventDefault(); });
    pad.addEventListener('pointermove', function (e) { if (!down) return; var p = pt(e); pg.beginPath(); pg.moveTo(last.x, last.y); pg.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2); pg.lineTo(p.x, p.y); pg.stroke(); last = p; e.preventDefault(); });
    function up() { down = false; }
    pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
  })();
  function trimmed(cv) {
    var g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data, x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
    for (var y = 0; y < cv.height; y++) for (var x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    var m = 6, w = x1 - x0 + 1 + 2 * m, h = y1 - y0 + 1 + 2 * m, o = document.createElement('canvas'); o.width = w; o.height = h;
    o.getContext('2d').drawImage(cv, x0 - m, y0 - m, w, h, 0, 0, w, h);
    return { url: o.toDataURL('image/png'), ratio: h / w };
  }
  function savedSigs() { try { return JSON.parse(ls('chatima-sigs') || '[]'); } catch (e) { return []; } }
  function drawSaved() {
    var box = $('ch-saved'), list = savedSigs(); box.textContent = '';
    $('ch-saved-w').hidden = !list.length;
    list.forEach(function (s, i) {
      var b = document.createElement('span'); b.className = 'ch-sv';
      b.innerHTML = '<button type="button" class="use" aria-label="להשתמש בחתימה השמורה"><img alt="" src="' + s.url + '"></button><button type="button" class="del" aria-label="למחוק את החתימה השמורה">×</button>';
      b.querySelector('.use').addEventListener('click', function () { useSig(s); });
      b.querySelector('.del').addEventListener('click', function () { var l = savedSigs(); l.splice(i, 1); ls('chatima-sigs', l.length ? JSON.stringify(l) : null); drawSaved(); });
      box.appendChild(b);
    });
  }
  function askSig(where) {
    S.pending = where;
    var dlg = $('ch-sigdlg');
    drawSaved(); $('ch-typed').value = '';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    padSize(); pg.clearRect(0, 0, pad.width, pad.height);
  }
  function closeSig() { var d = $('ch-sigdlg'); if (d.close) d.close(); else d.removeAttribute('open'); }
  function useSig(s) {
    var w = S.pending; closeSig(); if (!w) return;
    var W = w.w, H = W * s.ratio;
    if (w.fit) { H = Math.min(w.h * 1.6, 60); W = H / s.ratio; if (W > w.w) { W = w.w; H = W * s.ratio; } }
    var x = w.fit ? w.x + w.w - W - 4 : w.x + (w.w - W) / 2, y = w.fit ? w.y + w.h - H + H * 0.18 : w.y + (w.h - H) / 2;
    add({ page: w.page, type: 'sig', x: x, y: y, w: W, h: H, img: s.url, blank: w.blank });
    if (w.blank) { w.blank.taken = 1; syncBlanks(); }
    used('sign'); S.pending = null;
  }
  $('ch-sig-ok').addEventListener('click', function () {
    var typed = $('ch-typed').value.trim(), s;
    if (typed) {
      var c = document.createElement('canvas'), g = c.getContext('2d'); c.width = 900; c.height = 220;
      g.font = 'italic 600 110px "Frank Ruhl Libre", serif'; g.fillStyle = pen; g.direction = isHeb(typed) ? 'rtl' : 'ltr'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(typed, 450, 115); s = trimmed(c);
    } else s = inked ? trimmed(pad) : null;
    if (!s) { $('ch-sig-msg').textContent = 'חתמו באצבע או בעכבר בתוך המסגרת, או כתבו את השם.'; return; }
    $('ch-sig-msg').textContent = '';
    if ($('ch-keep').checked) { var l = savedSigs(); l.unshift(s); ls('chatima-sigs', JSON.stringify(l.slice(0, 3))); }
    useSig(s);
  });
  $('ch-sig-clear').addEventListener('click', function () { pg.clearRect(0, 0, pad.width, pad.height); inked = false; });
  $('ch-sig-cancel').addEventListener('click', function () { S.pending = null; closeSig(); });
  [].forEach.call(document.querySelectorAll('#ch-pen button'), function (b) {
    b.addEventListener('click', function () { pen = b.dataset.c; pg.strokeStyle = pg.fillStyle = pen; [].forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); });
  });

  // ---------- שמירה ----------
  function itemPng(it, ppp) {
    var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(it.w * ppp)); c.height = Math.max(1, Math.round(it.h * ppp));
    var g = c.getContext('2d');
    if (it.type === 'text') {
      var t = it.text || '', rtl = isHeb(t); g.font = (it.size * ppp) + 'px Assistant, Arial, sans-serif'; g.fillStyle = it.color || '#111';
      g.direction = rtl ? 'rtl' : 'ltr'; g.textAlign = rtl ? 'right' : 'left'; g.textBaseline = 'middle';
      g.fillText(t, rtl ? c.width - 2 * ppp : 2 * ppp, c.height / 2 + it.size * ppp * 0.06);
    } else if (it.type === 'white') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
    else if (it.type === 'check') {
      var u = c.width / 20; g.strokeStyle = it.color || '#111'; g.lineWidth = 2.6 * u; g.lineCap = g.lineJoin = 'round';
      g.beginPath(); g.moveTo(3 * u, 10.5 * c.height / 20); g.lineTo(7.5 * u, 15 * c.height / 20); g.lineTo(17 * u, 4.5 * c.height / 20); g.stroke();
    } else if (it.type === 'sig') { g.drawImage(it.imgEl, 0, 0, c.width, c.height); }
    return new Promise(function (ok) { c.toBlob(function (b) { b.arrayBuffer().then(ok); }, 'image/png'); });
  }
  function loadImg(it) { return it.type !== 'sig' ? Promise.resolve() : new Promise(function (ok) { var im = new Image(); im.onload = function () { it.imgEl = im; ok(); }; im.onerror = ok; im.src = it.img; }); }
  function save() {
    if (S.busy || !S.doc) return;
    var items = S.items.filter(function (it) { return it.type !== 'text' || (it.text || '').trim(); });
    if (!items.length) { msg('עוד לא הוספתם כלום לדף. לחצו על קו ריק כדי לכתוב, או על "חתימה".', 'bad'); return; }
    S.busy = true; $('ch-save').disabled = true; msg('מכינים את הקובץ…');
    var PL, pdf, flat = false;
    loadLibs().then(function () { return document.fonts && document.fonts.load ? Promise.all([document.fonts.load('20px Assistant'), document.fonts.load('italic 20px "Frank Ruhl Libre"')]).catch(function () {}) : null; })
      .then(function () { return Promise.all(items.map(loadImg)); })
      .then(function () {
        PL = window.PDFLib;
        return PL.PDFDocument.load(S.bytes.slice(0), { updateMetadata: false }).catch(function () { flat = true; return flatten(PL); });
      }).then(function (d) {
        pdf = d;
        if (!flat) {
          var names = {}; items.forEach(function (it) { if (it.blank && it.blank.field) names[it.blank.field] = 1; });
          if (Object.keys(names).length) try { var form = pdf.getForm(); Object.keys(names).forEach(function (n) { try { form.removeField(form.getField(n)); } catch (e) {} }); } catch (e) {}
        }
        var pages = pdf.getPages(), chain = Promise.resolve();
        items.forEach(function (it) {
          chain = chain.then(function () {
            var ppp = it.type === 'white' ? 1 : Math.min(5, 2400 / Math.max(it.w, 1));
            return itemPng(it, ppp).then(function (buf) { return pdf.embedPng(buf); }).then(function (img) {
              var P = S.pages[it.page], page = pages[it.page];
              var rot = flat ? 0 : (P.vp.rotation || 0) % 360, a;
              if (flat) { var ph = page.getHeight(); a = [it.x, ph - it.y - it.h]; }
              else a = P.vp.convertToPdfPoint(it.x, it.y + it.h);
              page.drawImage(img, { x: a[0], y: a[1], width: it.w, height: it.h, rotate: PL.degrees(rot) });
            });
          });
        });
        return chain;
      }).then(function () { return pdf.save(); })
      .then(function (out) {
        var nm = (S.sample ? 'טופס-לדוגמה' : S.name.replace(/\.pdf$/i, '')) + '-חתום.pdf';
        var blob = new Blob([out], { type: 'application/pdf' });
        S.out = new File([blob], nm, { type: 'application/pdf' });
        var a = $('ch-dl'); if (a.href && a.href.indexOf('blob:') === 0) URL.revokeObjectURL(a.href);
        a.href = URL.createObjectURL(blob); a.download = nm;
        $('ch-share').hidden = !(navigator.canShare && navigator.canShare({ files: [S.out] }));
        $('ch-out').hidden = false; S.dirty = false;
        msg((flat ? 'הקובץ היה נעול לעריכה, אז שמרנו כל עמוד כתמונה. ' : '') + 'מוכן! הקובץ החתום: ' + nm + ' (' + Math.max(1, Math.round(out.length / 1024)) + ' ק״ב).', 'ok');
        used('save', { n: items.length, flat: flat ? 1 : 0, sample: S.sample ? 1 : 0 });
        $('ch-out').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }).catch(function () { msg('משהו נתקע בשמירה. נסו שוב, ואם זה חוזר – ספרו לי בבקשת כלי.', 'bad'); })
      .then(function () { S.busy = false; $('ch-save').disabled = false; });
  }
  // קובץ שאי אפשר לערוך (נעול/פגום): בונים PDF חדש מתמונות של העמודים, באותו גודל
  function flatten(PL) {
    return PL.PDFDocument.create().then(function (nd) {
      var chain = Promise.resolve();
      S.pages.forEach(function (P) {
        chain = chain.then(function () {
          var v = P.page.getViewport({ scale: 2 }), c = document.createElement('canvas'); c.width = v.width; c.height = v.height;
          var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          return P.page.render({ canvasContext: g, viewport: v }).promise.then(function () {
            return new Promise(function (ok) { c.toBlob(function (b) { b.arrayBuffer().then(ok); }, 'image/jpeg', 0.85); });
          }).then(function (buf) { return nd.embedJpg(buf); }).then(function (img) {
            var pg2 = nd.addPage([P.vp.width, P.vp.height]); pg2.drawImage(img, { x: 0, y: 0, width: P.vp.width, height: P.vp.height });
          });
        });
      });
      return chain.then(function () { return nd; });
    });
  }

  // ---------- כפתורים ----------
  [].forEach.call(document.querySelectorAll('#ch-modes button'), function (b) {
    b.addEventListener('click', function () {
      S.mode = b.dataset.m; [].forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); hint();
      if (S.mode === 'sig' && S.sel && S.sel.type === 'sig') return;
    });
  });
  [].forEach.call(document.querySelectorAll('#ch-color button'), function (b) {
    b.addEventListener('click', function () { S.color = b.dataset.c; [].forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); if (S.sel && S.sel.type !== 'sig' && S.sel.type !== 'white') { S.sel.color = S.color; drawItem(S.sel); } });
  });
  $('ch-zin').addEventListener('click', function () { zoom(1.25); });
  $('ch-zout').addEventListener('click', function () { zoom(1 / 1.25); });
  function zoom(f) { if (!S.doc) return; var z = Math.max(0.6, Math.min(3, S.zoom * f)); S.zoom = z; var keep = S.pages.map(function (P) { (P.blanks || []).forEach(function (b) { b.el = null; }); return P.blanks; }); renderAll(keep); }
  $('ch-showb').addEventListener('change', syncBlanks);
  $('ch-undo').addEventListener('click', function () { var it = S.items[S.items.length - 1]; if (it) remove(it); });
  $('ch-save').addEventListener('click', save);
  $('ch-share').addEventListener('click', function () {
    if (!S.out) return;
    navigator.share({ files: [S.out], title: S.out.name }).then(function () { used('share'); }).catch(function () {});
  });
  $('ch-dl').addEventListener('click', function () { used('download'); });
  $('ch-file').addEventListener('change', function () { loadFile(this.files[0], 'file'); this.value = ''; });
  $('ch-file2').addEventListener('change', function () { loadFile(this.files[0], 'file'); this.value = ''; });
  ['dragover', 'drop'].forEach(function (t) {
    root.addEventListener(t, function (e) { e.preventDefault(); if (t === 'drop' && e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0], 'drop'); });
  });
  window.addEventListener('beforeunload', function (e) { if (S.dirty && !S.sample) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Delete') && S.sel && S.sel.type !== 'text') remove(S.sel);
    if (e.key === 'Escape' && S.sel) select(null);
  });
  var rT; window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { if (S.doc && Math.abs(pagesWidth() - (S.lastW || 0)) > 40) { S.lastW = pagesWidth(); zoom(1); } }, 300); });

  // דוגמה מלאה בכניסה הראשונה
  function demo() {
    var P = S.pages[0]; if (!P || !P.blanks) return;
    var lines = P.blanks.filter(function (b) { return b.type === 'ln'; }).sort(function (a, b) { return a.y - b.y || b.x - a.x; });
    var cbs = P.blanks.filter(function (b) { return b.type === 'cb'; });
    if (lines[0]) { onBlank(P, lines[0]); var it = S.items[S.items.length - 1]; it.text = 'ישראל ישראלי'; fitText(it); drawItem(it); }
    if (cbs[0]) onBlank(P, cbs[0]);
    select(null); S.dirty = false;
  }

  // ---------- מאיפה מגיע קובץ ----------
  var got = false, lastExt = null;
  function fromBytes(buf, name, how) { got = true; open(new Uint8Array(buf), name || 'מסמך.pdf', false, how); }
  window.addEventListener('message', function (e) {
    if (e.source !== window || e.origin !== location.origin) return;
    var d = e.data; if (!d || d.type !== 'hakelim-chatima-pdf' || !d.data) return;
    if (d.id && d.id === lastExt) return; lastExt = d.id;
    fromBytes(d.data, d.name, 'ext');
    window.postMessage({ type: 'hakelim-chatima-got', id: d.id }, location.origin);
  });
  window.postMessage({ type: 'hakelim-chatima-ready' }, location.origin);
  if ('launchQueue' in window) window.launchQueue.setConsumer(function (p) {
    if (p.files && p.files[0]) p.files[0].getFile().then(function (f) { got = true; loadFile(f, 'open_with'); });
  });
  var q = new URLSearchParams(location.search), boot = Promise.resolve();
  if (q.has('share') && window.caches) boot = caches.open('chatima-share').then(function (c) {
    return c.match('/chatima-share/0').then(function (r) {
      if (!r) return;
      var name = decodeURIComponent(r.headers.get('x-name') || 'מסמך.pdf');
      return r.arrayBuffer().then(function (b) { caches.delete('chatima-share'); fromBytes(b, name, 'share'); });
    });
  }).catch(function () {});
  var tb = document.querySelector('.topbar'); if (tb) root.style.setProperty('--chtop', (tb.offsetHeight || 56) + 'px');
  hint();
  boot.then(function () {
    setTimeout(function () {
      if (got || S.doc) return;
      fetch(SAMPLE).then(function (r) { return r.arrayBuffer(); }).then(function (b) { if (!got && !S.doc) open(new Uint8Array(b), 'טופס לדוגמה.pdf', true); }).catch(function () {});
    }, q.has('ext') ? 1500 : 150);
  });
})();
