// הסרת רקע מתמונה (/kelim/machshev/hasarat-reka/) – כולה בדפדפן, בלי להעלות את התמונה לשום שרת.
// המנוע: assets/studio-bg-worker.js (ISNet מכומת, onnxruntime-web) – אותו מנוע של הסטודיו. המודל (46MB) נשמר ב-Cache Storage אחרי הפעם הראשונה.
// כמה תמונות: כל אחת נכנסת לרשימה ומעובדת בתור. מכחול: למחוק עוד או להחזיר חלק. רקע: שקוף (PNG), לבן, צבע, או טשטוש (JPG).
// מדידה: window.toolUsed(tool, {action}) – add / remove / brush / download / download_all, פעם אחת לכל פעולה בביקור.
(function () {
  'use strict';
  var root = document.getElementById('rk');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var TOOL = document.body.getAttribute('data-tool') || 'machshev_hasarat_reka';
  var N = 1024;
  var sent = {};
  function used(a) { if (sent[a]) return; sent[a] = 1; if (window.toolUsed) window.toolUsed(TOOL, { action: a }); }

  var items = [], cur = -1, busy = false, nextId = 1;
  var bg = { type: root.getAttribute('data-bg') === 'white' ? 'white' : 'transparent', color: '#ffffff' };
  var brush = { mode: 'erase', size: 30 };

  var drop = $('rk-drop'), file = $('rk-file'), msg = $('rk-msg'), prog = $('rk-prog'), bar = $('rk-bar');
  function say(t, cls) { msg.textContent = t || ''; msg.className = 'rk-msg' + (cls ? ' ' + cls : ''); }

  // ---------- worker ----------
  var worker = null, waiters = {};
  function getWorker() {
    if (worker) return worker;
    worker = new Worker('/assets/studio-bg-worker.js', { type: 'module' });
    worker.onmessage = function (ev) {
      var m = ev.data || {};
      if (m.type === 'progress') {
        if (m.stage === 'run') { say('מזהה מה ברקע ומה בתמונה… (כמה שניות)'); prog.hidden = true; }
        else if (!m.cached) { prog.hidden = false; bar.style.width = Math.round(m.p * 100) + '%'; say('מוריד את הכלי להסרת רקע, רק בפעם הראשונה: ' + Math.round(m.p * 100) + '%'); }
      } else if (m.type === 'mask' && waiters[m.id]) { waiters[m.id].res(m.mask); delete waiters[m.id]; }
      else if (m.type === 'error') { Object.keys(waiters).forEach(function (k) { waiters[k].rej(new Error(m.msg)); delete waiters[k]; }); }
    };
    worker.onerror = function () { Object.keys(waiters).forEach(function (k) { waiters[k].rej(new Error('worker')); delete waiters[k]; }); worker = null; };
    return worker;
  }

  function loadImg(f) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () { res({ im: im, url: u }); };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('img')); };
      im.src = u;
    });
  }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  async function cutout(it) {
    var im = it.im, iw = im.naturalWidth, ih = im.naturalHeight;
    var c = mk(N, N), x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, N, N); x.drawImage(im, 0, 0, N, N);
    var px = x.getImageData(0, 0, N, N).data, input = new Float32Array(3 * N * N);
    for (var i = 0, j = 0; i < N * N; i++, j += 4) { input[i] = px[j] / 255 - 0.5; input[N * N + i] = px[j + 1] / 255 - 0.5; input[2 * N * N + i] = px[j + 2] / 255 - 0.5; }
    var id = 'r' + (nextId++);
    var mask = await new Promise(function (res, rej) { waiters[id] = { res: res, rej: rej }; getWorker().postMessage({ type: 'run', id: id, input: input }, [input.buffer]); });
    var mc = mk(N, N), mx = mc.getContext('2d'), md = mx.createImageData(N, N);
    for (var k = 0; k < N * N; k++) { var a = Math.min(1, Math.max(0, (mask[k] - 0.08) / 0.84)); md.data[k * 4 + 3] = Math.round(a * 255); }
    mx.putImageData(md, 0, 0);
    var out = mk(iw, ih), ox = out.getContext('2d');
    ox.drawImage(im, 0, 0); ox.globalCompositeOperation = 'destination-in'; ox.imageSmoothingQuality = 'high'; ox.drawImage(mc, 0, 0, iw, ih);
    var ad = ox.getImageData(0, 0, iw, ih).data, any = false;
    for (var q = 3; q < ad.length; q += 4) if (ad[q] > 10) { any = true; break; }
    if (!any) throw new Error('empty');
    return out;
  }

  // ---------- תצוגה והרכבה ----------
  function bbox(c) {
    var w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? { x: 0, y: 0, w: w, h: h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  function blurred(im, w, h) {
    var s = 1 / 14, a = mk(Math.max(2, Math.round(w * s)), Math.max(2, Math.round(h * s))), ax = a.getContext('2d');
    ax.imageSmoothingQuality = 'high'; ax.drawImage(im, 0, 0, a.width, a.height);
    var o = mk(w, h), ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(a, 0, 0, w, h); return o;
  }
  function compose(it, maxSide, forExport) {
    var w = it.cut.width, h = it.cut.height, sc = 1;
    if (maxSide && Math.max(w, h) > maxSide) sc = maxSide / Math.max(w, h);
    var cw = Math.round(w * sc), ch = Math.round(h * sc), c = mk(cw, ch), x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    if (bg.type === 'white') { x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch); }
    else if (bg.type === 'color') { x.fillStyle = bg.color; x.fillRect(0, 0, cw, ch); }
    else if (bg.type === 'blur') { x.drawImage(blurred(it.im, cw, ch), 0, 0); }
    x.drawImage(it.cut, 0, 0, cw, ch);
    if (forExport && bg.type === 'transparent') {
      var b = it.box || (it.box = bbox(it.cut)), pad = 2;
      var bx = Math.max(0, b.x - pad), by = Math.max(0, b.y - pad), bw = Math.min(w - bx, b.w + 2 * pad), bh = Math.min(h - by, b.h + 2 * pad);
      var f = mk(Math.round(bw * sc), Math.round(bh * sc));
      f.getContext('2d').drawImage(c, bx * sc, by * sc, bw * sc, bh * sc, 0, 0, f.width, f.height);
      return f;
    }
    return c;
  }
  var view = $('rk-view'), vx = view.getContext('2d');
  function draw() {
    var it = items[cur];
    if (!it || !it.cut) { view.hidden = true; return; }
    view.hidden = false;
    var c = compose(it, 900, false);
    view.width = c.width; view.height = c.height; vx.drawImage(c, 0, 0);
    view.classList.toggle('chk', bg.type === 'transparent');
  }

  // ---------- רשימה ----------
  function renderList() {
    var ul = $('rk-list'); ul.innerHTML = '';
    items.forEach(function (it, i) {
      var li = document.createElement('li'); li.className = i === cur ? 'on' : '';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'rk-th';
      var im = document.createElement('img'); im.alt = ''; im.src = it.url; b.appendChild(im);
      var s = document.createElement('span'); s.textContent = it.state === 'done' ? '✓' : it.state === 'work' ? '…' : it.state === 'err' ? '!' : '·';
      b.appendChild(s); b.title = it.name; b.setAttribute('aria-label', it.name);
      b.addEventListener('click', function () { cur = i; renderList(); draw(); ui(); });
      li.appendChild(b); ul.appendChild(li);
    });
    $('rk-listwrap').hidden = !items.length;
    var done = items.filter(function (i) { return i.state === 'done'; }).length;
    $('rk-all').hidden = done < 2;
  }
  function ui() {
    var it = items[cur], ready = it && it.state === 'done';
    $('rk-edit').hidden = !ready;
    $('rk-dl').disabled = !ready;
    $('rk-rm').disabled = !it;
    $('rk-nm').textContent = it ? it.name : '';
  }

  async function addFiles(fl) {
    var list = Array.prototype.slice.call(fl).filter(function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|bmp|gif)$/i.test(f.name); });
    if (!list.length) { say('בחרו קובץ תמונה: JPG, PNG או WebP.', 'warn'); return; }
    for (var i = 0; i < list.length; i++) {
      try {
        var r = await loadImg(list[i]);
        items.push({ name: list[i].name, im: r.im, url: r.url, state: 'wait', cut: null });
      } catch (e) { say('לא הצלחתי לפתוח את ' + list[i].name + '. נסו קובץ אחר.', 'warn'); }
    }
    used('add');
    if (cur < 0 || (items[cur] && items[cur].state !== 'wait' && cur === items.length - list.length - 1)) cur = Math.max(0, items.length - list.length);
    renderList(); ui(); pump();
  }
  async function pump() {
    if (busy) return; busy = true;
    for (;;) {
      var it = items.filter(function (i) { return i.state === 'wait'; })[0];
      if (!it) break;
      it.state = 'work'; renderList();
      say(items.length > 1 ? 'מעבד את ' + it.name + '…' : 'מכין את הסרת הרקע…');
      try { it.cut = await cutout(it); it.state = 'done'; it.box = null; say('✓ הרקע הוסר. אפשר לתקן במכחול, לבחור רקע, ולהוריד.', 'ok'); }
      catch (e) {
        it.state = 'err';
        say(/empty/.test(e && e.message) ? 'לא מצאתי בתמונה הזו דמות או חפץ ברורים. נסו תמונה שבה הנושא בולט מהרקע.' : 'הסרת הרקע לא הצליחה במכשיר הזה (חסר זיכרון?). נסו תמונה קטנה יותר.', 'warn');
      }
      prog.hidden = true; renderList(); if (items[cur] === it || !items[cur] || !items[cur].cut) { if (items[cur] !== it && it.state === 'done') cur = items.indexOf(it); } draw(); ui();
    }
    busy = false;
  }

  // ---------- מכחול ----------
  var drawing = false, last = null;
  function pt(ev) {
    var r = view.getBoundingClientRect(), it = items[cur];
    return { x: (ev.clientX - r.left) / r.width * it.cut.width, y: (ev.clientY - r.top) / r.height * it.cut.height, k: it.cut.width / r.width };
  }
  function stroke(a, b) {
    var it = items[cur], cx = it.cut.getContext('2d'), rad = brush.size * a.k / 2;
    var dx = b.x - a.x, dy = b.y - a.y, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (rad / 3)));
    for (var i = 0; i <= n; i++) {
      var px = a.x + dx * i / n, py = a.y + dy * i / n;
      cx.save(); cx.beginPath(); cx.arc(px, py, rad, 0, 6.2832); cx.clip();
      if (brush.mode === 'erase') cx.clearRect(px - rad, py - rad, rad * 2, rad * 2);
      else cx.drawImage(it.im, 0, 0);
      cx.restore();
    }
    it.box = null;
  }
  view.addEventListener('pointerdown', function (ev) {
    if (!items[cur] || !items[cur].cut) return;
    drawing = true; view.setPointerCapture(ev.pointerId); last = pt(ev); stroke(last, last); draw(); used('brush'); ev.preventDefault();
  });
  view.addEventListener('pointermove', function (ev) { if (!drawing) return; var p = pt(ev); stroke(last, p); last = p; draw(); });
  ['pointerup', 'pointercancel'].forEach(function (n) { view.addEventListener(n, function () { drawing = false; }); });

  // ---------- הורדה ----------
  function baseName(n) { return (n || 'תמונה').replace(/\.[^.]+$/, ''); }
  function blobOf(it, cb) {
    var c = compose(it, 0, true), png = bg.type === 'transparent';
    c.toBlob(function (b) { cb(b, baseName(it.name) + (png ? ' - בלי רקע.png' : ' - רקע חדש.jpg')); }, png ? 'image/png' : 'image/jpeg', 0.95);
  }
  function save(b, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  $('rk-dl').addEventListener('click', function () { var it = items[cur]; if (!it || it.state !== 'done') return; blobOf(it, save); used('download'); });
  $('rk-all').addEventListener('click', async function () {
    var d = items.filter(function (i) { return i.state === 'done'; });
    for (var i = 0; i < d.length; i++) { await new Promise(function (r) { blobOf(d[i], function (b, n) { save(b, n); setTimeout(r, 500); }); }); }
    used('download_all');
  });
  $('rk-rm').addEventListener('click', function () {
    if (!items[cur]) return; URL.revokeObjectURL(items[cur].url); items.splice(cur, 1); cur = items.length ? Math.min(cur, items.length - 1) : -1;
    renderList(); draw(); ui(); say(''); used('remove');
  });
  $('rk-redo').addEventListener('click', async function () {
    var it = items[cur]; if (!it || busy) return; it.state = 'wait'; it.cut = null; renderList(); ui(); draw(); pump();
  });

  // ---------- בקרות ----------
  function seg(ids, cb) {
    ids.forEach(function (id) { $(id).addEventListener('click', function () { ids.forEach(function (o) { $(o).setAttribute('aria-pressed', o === id ? 'true' : 'false'); }); cb(id); }); });
  }
  seg(['rk-b-t', 'rk-b-w', 'rk-b-c', 'rk-b-b'], function (id) {
    bg.type = { 'rk-b-t': 'transparent', 'rk-b-w': 'white', 'rk-b-c': 'color', 'rk-b-b': 'blur' }[id];
    $('rk-color').hidden = bg.type !== 'color'; draw();
  });
  seg(['rk-m-e', 'rk-m-r'], function (id) { brush.mode = id === 'rk-m-e' ? 'erase' : 'restore'; });
  $('rk-color').addEventListener('input', function () { bg.color = this.value; draw(); });
  $('rk-size').addEventListener('input', function () { brush.size = +this.value; });

  file.addEventListener('change', function () { if (file.files.length) addFiles(file.files); file.value = ''; });
  ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('on'); }); });
  ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('on'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
  document.addEventListener('paste', function (e) {
    var fs = e.clipboardData && e.clipboardData.files; if (fs && fs.length) addFiles(fs);
  });
  window.addEventListener('beforeunload', function () { items.forEach(function (i) { URL.revokeObjectURL(i.url); }); });
  renderList(); ui();
})();
