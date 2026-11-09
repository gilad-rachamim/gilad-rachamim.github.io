// עריכת סרטון שיעור (/kodesh/video-shiur/) – הכלים של גילעד רחמים.
// שלושה כלים על אותו סרטון, הכול בדפדפן:
//  1. חלקים לסטטוס: 30/60 שניות, עם "1/5" בפינה.
//  2. כתוביות שזזות: תמלול בענן (Worker gilad-hub /tamlul, words:true → זמן לכל מילה), עריכה, צריבה בקנבס ו-SRT.
//  3. משיעור לשורטים: בוחרים משפטים מהתמלול, וכל קטע יוצא 9:16 עם כותרת וכתוביות.
// המנוע: <video> → קנבס → captureStream + קול דרך WebAudio → MediaRecorder (MP4 כשאפשר). בזמן אמת.
// requestAnimationFrame נעצר בחלון מוסתר, ולכן יש גם טיימר גיבוי. המקליט מקבל תמונות רק אחרי רגע: מחכים לחלק הראשון שלו.
(function () {
  'use strict';
  var root = document.getElementById('vshiur');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var API = 'https://gilad-hub.gilad4049.workers.dev/tamlul';
  var RAW_MAX = 6.8e6, PIECE = 150, FREE_SEC = 3600, PAR = 4;
  var vid = $('vs-src'), cv = $('vs-cv'), ctx = cv.getContext('2d'), out = $('vs-out'), prog = $('vs-prog');
  var file = null, fileName = 'סרטון', dur = 0, busy = false, tab = 'status';
  var segs = null, groups = null; // תמלול: segs=[{start,end,text,words:[{w,s,e}]}], groups=שורות כתוביות
  var FONT = 'Assistant, "Segoe UI", Arial, sans-serif';
  // מראה קבוע (נשמר במכשיר): סגנון כתוביות, מוזיקה ושקופית סיום
  var LK = 'kelim-vs-look', TAIL = 4;
  var look = { size: 'm', bar: 'line', lines: '1', color: '#ffd84d', music: 'none', endOn: false, name: '', phone: '', link: '' };
  try { Object.assign(look, JSON.parse(localStorage.getItem(LK) || '{}')); } catch (e) {}
  function lsave() { try { localStorage.setItem(LK, JSON.stringify(look)); } catch (e) {} }
  function endOK() { return !!(look.endOn && (look.name || look.phone || look.link)); }

  // גופן Assistant לקנבס
  try {
    var ff = new FontFace('Assistant', 'url(/assets/fonts/Assistant-wght.woff)', { weight: '200 800' });
    ff.load().then(function (f) { document.fonts.add(f); }).catch(function () {});
  } catch (e) {}

  function say(t, spin) { var s = $('vs-status'); s.hidden = !t; s.innerHTML = (spin ? '<span class="spin" aria-hidden="true"></span> ' : '') + (t || ''); }
  function used(how, extra) { if (window.toolUsed) window.toolUsed('video-shiur', Object.assign({ how: how, tab: tab }, extra || {})); }
  function mmss(s) { s = Math.max(0, Math.round(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }
  function parseT(v) { v = String(v || '').trim(); if (!v) return NaN; var p = v.split(':').map(Number); if (p.some(isNaN)) return NaN; return p.reduce(function (a, b) { return a * 60 + b; }, 0); }

  // ---------- לשוניות ----------
  function setTab(t) {
    tab = t;
    Array.prototype.forEach.call(root.querySelectorAll('[data-tab]'), function (b) { b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'); });
    ['status', 'ktuviot', 'shorts'].forEach(function (k) { $('tab-' + k).hidden = k !== t; });
    if (history.replaceState) history.replaceState(null, '', '#' + t);
    if (file && !busy) still();
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab);
    if (e.target.closest('[data-unlimited]')) { e.preventDefault(); var o = q(); o.free = true; qsave(o); quota(); $('vs-limit').hidden = true; if (window.kelimEv) window.kelimEv('tamlul_unlimited', { from: 'video-shiur' }); }
  });
  if (/^#(status|ktuviot|shorts)$/.test(location.hash)) setTab(location.hash.slice(1));

  // ---------- טעינת הסרטון ----------
  $('vs-file').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    load(f);
  });
  function load(f) {
    file = f; fileName = (f.name || 'סרטון').replace(/\.[^.]+$/, '').slice(0, 40);
    segs = null; groups = null; out.innerHTML = '';
    $('kt-edit').hidden = true; $('sh-sents').hidden = true; clips = []; drawClips();
    vid.src = URL.createObjectURL(f);
    say('טוען את הסרטון…', true);
    return new Promise(function (res) {
      vid.onloadedmetadata = function () {
        dur = vid.duration;
        if (!isFinite(dur)) { vid.currentTime = 1e7; vid.ontimeupdate = function () { vid.ontimeupdate = null; dur = vid.duration; vid.currentTime = 0; ready(); res(); }; }
        else { ready(); res(); }
      };
      vid.onerror = function () { say('⚠️ הדפדפן לא מצליח לפתוח את הקובץ הזה. נסו MP4 או סרטון מהמצלמה של הטלפון.'); res(); };
    });
  }
  function ready() {
    $('vs-meta').textContent = fileName + ' · ' + mmss(dur) + ' · ' + vid.videoWidth + '×' + vid.videoHeight;
    $('st-go').disabled = false; $('sh-add').disabled = false;
    Array.prototype.forEach.call(root.querySelectorAll('[data-tamlul]'), function (b) { b.disabled = false; });
    plan(); say('');
    seek(Math.min(1, dur / 2)).then(still);
    used('load', { secs: Math.round(dur) });
  }
  function seek(t) {
    return new Promise(function (res) {
      if (Math.abs(vid.currentTime - t) < 0.01 && vid.readyState >= 2) return res();
      var done = false, fin = function () { if (!done) { done = true; vid.removeEventListener('seeked', fin); res(); } };
      vid.addEventListener('seeked', fin); setTimeout(fin, 3000);
      vid.currentTime = t;
    });
  }

  // ---------- תצוגה (מה שמצויר בקנבס) ----------
  function srcSize() { var w = vid.videoWidth || 1280, h = vid.videoHeight || 720, k = Math.min(1, 1280 / Math.max(w, h)); return [Math.round(w * k / 2) * 2, Math.round(h * k / 2) * 2]; }
  function setCanvas(w, h) { if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h; $('vs-stage').hidden = false; }
  var job = null; // מה שמצויר עכשיו: {kind, n, of, clip}
  function still() {
    if (!file) return;
    if (tab === 'shorts') { job = { kind: 'short', clip: curClip() }; setCanvas(720, 1280); }
    else { var s = srcSize(); setCanvas(s[0], s[1]); job = tab === 'status' ? { kind: 'status', n: 1, of: parts().length } : { kind: 'caps' }; }
    paint(vid.currentTime);
  }
  function paint(t) {
    var W = cv.width, H = cv.height;
    ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (job && job.kind === 'short') drawShort(t, W, H);
    else {
      try { ctx.drawImage(vid, 0, 0, W, H); } catch (e) {}
      if (job && job.kind === 'status') badge(job.n + '/' + job.of, W, H);
      if (job && job.kind === 'caps') caps(t, W, H, +$('kt-pos').value, $('kt-color').value);
    }
    ctx.restore();
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function badge(txt, W, H) {
    var pos = $('st-pos').value; if (pos === 'none') return;
    var fs = Math.round(Math.min(W, H) * 0.055), pad = fs * 0.45, m = Math.round(Math.min(W, H) * 0.035);
    ctx.font = '800 ' + fs + 'px ' + FONT; ctx.direction = 'ltr'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var w = ctx.measureText(txt).width + pad * 2, h = fs + pad * 1.2, y = pos === 'bl' ? H - m - h : m;
    ctx.fillStyle = 'rgba(10,16,30,.72)'; rr(m, y, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(230,197,126,.9)'; ctx.lineWidth = Math.max(2, fs * 0.06); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, m + w / 2, y + h / 2 + fs * 0.04);
  }

  // ---------- כתוביות: ציור מילה-מילה מימין לשמאל ----------
  function groupAt(t) {
    if (!groups) return null;
    for (var i = 0; i < groups.length; i++) { var g = groups[i]; if (t >= g.s - 0.05 && t < g.e) return g; }
    return null;
  }
  function caps(t, W, H, yk, color, maxW) {
    var g = groupAt(t); if (!g) return;
    color = color || look.color;
    var k = { s: 0.055, m: 0.07, l: 0.088 }[look.size] || 0.07, bar = look.bar === 'bar';
    var fs = Math.round(Math.min(W, H) * k), lh = fs * 1.25;
    ctx.font = '800 ' + fs + 'px ' + FONT; ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    var sp = ctx.measureText(' ').width, lim = (maxW || 0.88) * W, lines = [[]], lw = [0];
    var items = g.words.map(function (w) { return { w: w, ww: ctx.measureText(w.w).width }; });
    items.forEach(function (o) {
      var L = lines.length - 1;
      if (lines[L].length && lw[L] + sp + o.ww > lim) { lines.push([]); lw.push(0); L++; }
      lw[L] += (lines[L].length ? sp : 0) + o.ww; lines[L].push(o);
    });
    // שתי שורות: שורה ארוכה נחצית לשתיים מאוזנות
    if (look.lines === '2' && lines.length === 1 && items.length >= 4 && lw[0] > lim * 0.55) {
      var best = 1, bw = 1e9, acc = 0;
      for (var c = 1; c < items.length; c++) { acc += items[c - 1].ww + (c > 1 ? sp : 0); var m2 = Math.max(acc, lw[0] - acc - sp); if (m2 < bw) { bw = m2; best = c; } }
      lines = [items.slice(0, best), items.slice(best)];
      lw = lines.map(function (ln) { return ln.reduce(function (a, o, i) { return a + o.ww + (i ? sp : 0); }, 0); });
    }
    var y0 = yk * H - (lines.length - 1) * lh / 2;
    if (bar) {
      var mw = Math.max.apply(null, lw), pd = fs * 0.4;
      ctx.fillStyle = 'rgba(0,0,0,.62)'; rr(W / 2 - mw / 2 - pd, y0 - lh / 2 - pd * 0.35, mw + pd * 2, lines.length * lh + pd * 0.7, fs * 0.3); ctx.fill();
    }
    ctx.lineJoin = 'round'; ctx.lineWidth = bar ? Math.max(2, fs * 0.06) : Math.max(4, fs * 0.16); ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = bar ? 0 : fs * 0.25;
    lines.forEach(function (ln, i) {
      var x = W / 2 + lw[i] / 2, y = y0 + i * lh;
      ln.forEach(function (o) {
        var now = t >= o.w.s && t < o.w.e2;
        ctx.strokeText(o.w.w, x, y);
        ctx.fillStyle = now ? color : '#fff';
        ctx.fillText(o.w.w, x, y);
        x -= o.ww + sp;
      });
    });
    ctx.shadowBlur = 0;
  }

  // ---------- שורט 9:16 ----------
  var tiny = document.createElement('canvas'); tiny.width = 36; tiny.height = 64;
  function cover(c, w, h) { var vw = vid.videoWidth || 16, vh = vid.videoHeight || 9, k = Math.max(w / vw, h / vh); c.drawImage(vid, (w - vw * k) / 2, (h - vh * k) / 2, vw * k, vh * k); }
  function drawShort(t, W, H) {
    var cl = job.clip || {}, mode = cl.bg || $('sh-bg').value, vw = vid.videoWidth || 16, vh = vid.videoHeight || 9;
    var capY = 0.74;
    try {
      if (mode === 'crop') { cover(ctx, W, H); }
      else {
        var tc = tiny.getContext('2d'); cover(tc, 36, 64);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(tiny, 0, 0, W, H);
        ctx.fillStyle = 'rgba(8,12,24,.45)'; ctx.fillRect(0, 0, W, H);
        var h = W * vh / vw; if (h > H * 0.62) h = H * 0.62; var w = h * vw / vh, y = H * 0.47 - h / 2;
        ctx.drawImage(vid, (W - w) / 2, y, w, h);
        capY = Math.min(0.86, (y + h) / H + 0.1);
      }
    } catch (e) {}
    // כותרת למעלה
    var title = cl.title != null ? cl.title : $('sh-title').value.trim();
    if (title) {
      var fs = 54; ctx.font = '800 ' + fs + 'px ' + FONT; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var words = title.split(/\s+/), lines = [''], lim = W * 0.84;
      words.forEach(function (w) { var L = lines.length - 1, tst = lines[L] ? lines[L] + ' ' + w : w; if (lines[L] && ctx.measureText(tst).width > lim) lines.push(w); else lines[L] = tst; });
      lines = lines.slice(0, 3);
      var lh = fs * 1.22, bh = lines.length * lh + 44, by = 96;
      ctx.fillStyle = 'rgba(10,16,30,.78)'; rr(W * 0.05, by, W * 0.9, bh, 26); ctx.fill();
      ctx.strokeStyle = 'rgba(230,197,126,.85)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#e6c57e';
      lines.forEach(function (l, i) { ctx.fillText(l, W / 2, by + 22 + lh / 2 + i * lh); });
    }
    if ((cl.caps != null ? cl.caps : $('sh-caps').value === '1') && groups) caps(t, W, H, mode === 'crop' ? 0.78 : capY, '#ffd84d', 0.86);
  }

  // ---------- מנוע הקלטה ----------
  var AC = null, srcNode = null, dest = null, spk = null;
  function audio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return true; }
    var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return false;
    try {
      AC = new Ctx(); srcNode = AC.createMediaElementSource(vid); dest = AC.createMediaStreamDestination(); spk = AC.createGain();
      srcNode.connect(dest); srcNode.connect(spk); spk.connect(AC.destination); spk.gain.value = 0;
      try { var keep = AC.createConstantSource(); keep.offset.value = 0; keep.connect(dest); keep.start(); } catch (e) {}
      return true;
    } catch (e) { AC = null; return false; }
  }
  function mime() {
    var list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    if (!window.MediaRecorder) return null;
    for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  // מנגן את [a,b] לקנבס. rec=true מקליט ומחזיר {blob,ext}; אחרת רק תצוגה עם קול
  var stopFlag = false;
  function play(a, b, rec, onP) {
    return seek(a).then(function () {
      return new Promise(function (res) {
        var m = rec ? mime() : '';
        var hasA = audio();
        if (spk) spk.gain.value = rec ? 0 : 1;
        var stream = null, mr = null, parts = [], gotData = !rec, began = performance.now();
        if (rec) {
          stream = cv.captureStream(30);
          if (hasA && dest) dest.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); });
          mr = new MediaRecorder(stream, m ? { mimeType: m, videoBitsPerSecond: 3000000 } : { videoBitsPerSecond: 3000000 });
          mr.ondataavailable = function (e) { gotData = true; if (e.data && e.data.size) parts.push(e.data); };
          mr.onstop = function () {
            var type = (mr.mimeType || m || 'video/webm').split(';')[0];
            stream.getVideoTracks().forEach(function (tr) { tr.stop(); });
            res({ blob: new Blob(parts, { type: type }), ext: type.indexOf('mp4') > -1 ? 'mp4' : 'webm' });
          };
          mr.start(250);
        }
        paint(a);
        var ended = false;
        function finish() {
          if (ended) return; ended = true; vid.pause();
          if (spk) spk.gain.value = 0;
          if (rec) setTimeout(function () { mr.stop(); }, 200); else res(null);
        }
        function loop() {
          if (ended) return;
          var t = vid.currentTime;
          paint(t);
          if (onP) onP(Math.min(1, (t - a) / Math.max(0.1, b - a)));
          if (stopFlag || t >= b || vid.ended) return finish();
          var next = function () { if (!fired) { fired = true; loop(); } }, fired = false;
          requestAnimationFrame(next); setTimeout(next, 40);
        }
        (function wait() {
          if (stopFlag) return finish();
          if (!gotData || performance.now() - began < 300) { paint(a); return setTimeout(wait, 30); }
          vid.play().then(loop).catch(function () { vid.muted = true; vid.play().then(loop).catch(finish); });
        })();
      });
    });
  }
  function lock(on) {
    busy = on; prog.hidden = !on; prog.value = 0;
    Array.prototype.forEach.call(root.querySelectorAll('button.btn'), function (b) { if (b.dataset.stop == null) b.disabled = on; });
    $('vs-file').disabled = on;
    if (!on) { $('st-go').disabled = !file; $('sh-add').disabled = !file; drawClips(); }
  }
  function canRec() {
    if (mime() === null || !cv.captureStream) { say('⚠️ הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום, בטלפון אנדרואיד או במחשב.'); return false; }
    return true;
  }
  function addOut(r, label, name) {
    var li = document.createElement('li'), url = URL.createObjectURL(r.blob), fn = name.replace(/[\\/:*?"<>|]/g, '').slice(0, 60) + '.' + r.ext;
    li.innerHTML = '<b></b><video controls playsinline preload="metadata"></video><div class="share-row"><button class="btn btn-gold btn-sm" type="button" data-sh><svg class="ic"><use href="#wa"/></svg> לשתף בווטסאפ</button><a class="btn btn-line btn-sm" download>לשמור</a></div>';
    li.querySelector('b').textContent = label + ' · ' + (Math.round(r.blob.size / 1048576 * 10) / 10).toString() + ' מגה' + (r.ext === 'webm' ? ' · WebM' : '');
    li.querySelector('video').src = url;
    var a = li.querySelector('a'); a.href = url; a.download = fn;
    a.addEventListener('click', function () { used('download', { what: job ? job.kind : '' }); });
    li.querySelector('[data-sh]').addEventListener('click', function () {
      var f = new File([r.blob], fn, { type: r.blob.type });
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).then(function () { used('share'); }).catch(function () {});
      else { a.click(); say('הסרטון נשמר. עכשיו פותחים את הווטסאפ ומצרפים אותו מהגלריה.'); }
    });
    out.appendChild(li);
    window.__vsOut = (window.__vsOut || []).concat([{ name: fn, blob: r.blob }]);
    return li;
  }

  // ---------- 1. חלקים לסטטוס ----------
  function parts() {
    var L = +$('st-len').value, n = Math.max(1, Math.ceil((dur - 0.5) / L)), list = [];
    for (var i = 0; i < n; i++) list.push([i * L, Math.min(dur, (i + 1) * L)]);
    // חלק אחרון קצרצר (פחות מ-5 שניות) מצטרף לקודם
    if (list.length > 1 && list[n - 1][1] - list[n - 1][0] < 5) { list[n - 2][1] = list[n - 1][1]; list.pop(); }
    return list;
  }
  function plan() { if (!file) return; var p = parts(); $('st-plan').textContent = 'יוצאים ' + p.length + ' חלקים של עד ' + $('st-len').value + ' שניות. זה ייקח בערך ' + mmss(dur) + ' דקות.'; if (tab === 'status' && !busy) still(); }
  $('st-len').addEventListener('change', plan); $('st-pos').addEventListener('change', plan);
  $('st-go').addEventListener('click', function () {
    if (busy || !file || !canRec()) return;
    var p = parts(), i = 0, s = srcSize();
    setCanvas(s[0], s[1]); out.innerHTML = ''; lock(true); stopFlag = false;
    used('status_start', { parts: p.length, len: +$('st-len').value });
    (function next() {
      if (i >= p.length || stopFlag) { lock(false); say('✅ ' + p.length + ' החלקים מוכנים. שולחים כל אחד לסטטוס לפי הסדר.'); used('status_done', { parts: p.length }); return; }
      job = { kind: 'status', n: i + 1, of: p.length };
      say('יוצר חלק ' + (i + 1) + ' מתוך ' + p.length + '…', true);
      play(p[i][0], p[i][1], true, function (x) { prog.value = (i + x) / p.length; }).then(function (r) {
        addOut(r, 'חלק ' + (i + 1) + '/' + p.length, fileName + ' ' + (i + 1) + ' מתוך ' + p.length);
        i++; next();
      });
    })();
  });

  // ---------- תמלול (משותף לכתוביות ולשורטים) ----------
  function month() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1); }
  function q() { var o = {}; try { o = JSON.parse(localStorage.getItem('kelim-tamlul') || '{}'); } catch (e) {} if (o.m !== month()) o = { m: month(), used: 0, free: o.free }; return o; }
  function qsave(o) { try { localStorage.setItem('kelim-tamlul', JSON.stringify(o)); } catch (e) {} }
  function quota() { var o = q(); $('vs-quota').textContent = o.free ? '' : 'דקות תמלול שנשארו לכם החודש: ' + Math.max(0, Math.round((FREE_SEC - o.used) / 60)) + ' מתוך 60.'; }
  quota();
  function b64(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1] || ''); }; r.onerror = rej; r.readAsDataURL(blob); }); }
  function wav(pcm) {
    var b = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(b), w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
    new Int16Array(b, 44).set(pcm);
    return new Blob([b], { type: 'audio/wav' });
  }
  function pieces(blob) {
    if (blob.size <= RAW_MAX && dur <= PIECE) return Promise.resolve([{ off: 0, blob: blob }]);
    return blob.arrayBuffer().then(function (buf) {
      var Ctx = window.AudioContext || window.webkitAudioContext, c;
      try { c = new Ctx({ sampleRate: 16000 }); } catch (e) { c = new Ctx(); }
      return new Promise(function (res, rej) { c.decodeAudioData(buf, res, rej); }).then(function (ab) {
        var rate = ab.sampleRate, ch0 = ab.getChannelData(0), ch1 = ab.numberOfChannels > 1 ? ab.getChannelData(1) : null;
        var step = rate / 16000, total = Math.floor(ab.length / step), per = PIECE * 16000, list = [];
        for (var s = 0; s < total; s += per) {
          var len = Math.min(per, total - s), pcm = new Int16Array(len);
          for (var i = 0; i < len; i++) { var k = Math.floor((s + i) * step), x = ch1 ? (ch0[k] + ch1[k]) / 2 : ch0[k]; pcm[i] = x < -1 ? -32768 : x > 1 ? 32767 : x * 32767; }
          list.push({ off: s / 16000, blob: wav(pcm) });
        }
        if (c.close) c.close();
        return list;
      });
    });
  }
  function runOne(p) {
    return b64(p.blob).then(function (data) {
      return fetch(API + '/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ b64: data, lang: 'he', words: true }) });
    }).then(function (r) { if (r.status === 429) throw new Error('limit'); return r.json(); }).then(function (j) {
      if (!j.token) throw new Error(j.error || 'run');
      var t0 = Date.now();
      return new Promise(function (res, rej) {
        (function tick() {
          fetch(API + '/status/' + j.token).then(function (r) { return r.json(); }).then(function (s) {
            if (s.status === 'COMPLETED') return res((s.segments || []).map(function (x) {
              return { start: x.start + p.off, end: x.end + p.off, text: x.text, words: (x.words || []).map(function (w) { return { w: w.w, s: w.s + p.off, e: w.e + p.off }; }) };
            }));
            if (s.status === 'FAILED' || s.error) return rej(new Error('failed'));
            if (Date.now() - t0 > 20 * 60e3) return rej(new Error('timeout'));
            setTimeout(tick, 3000);
          }).catch(function () { if (Date.now() - t0 > 20 * 60e3) rej(new Error('net')); else setTimeout(tick, 5000); });
        })();
      });
    });
  }
  // בלי זמן לכל מילה מהשרת: מחלקים את זמן המשפט לפי אורך המילים
  function estimate(seg) {
    var ws = seg.text.split(/\s+/).filter(Boolean), tot = ws.reduce(function (a, w) { return a + w.length + 1; }, 0), t = seg.start, span = Math.max(0.2, seg.end - seg.start);
    return ws.map(function (w) { var d = span * (w.length + 1) / tot, o = { w: w, s: t, e: t + d }; t += d; return o; });
  }
  function regroup() {
    var all = [];
    segs.forEach(function (s) {
      var ws = s.words && s.words.length ? s.words.filter(function (w) { return w.w; }) : estimate(s);
      ws.forEach(function (w, i) { all.push({ w: w.w, s: w.s, e: w.e, end: i === ws.length - 1 }); });
    });
    groups = []; var g = null;
    all.forEach(function (w, i) {
      var prev = all[i - 1];
      if (!g || g.words.length >= 5 || g.chars + w.w.length > 24 || (prev && (prev.end || w.s - prev.e > 0.7 || /[.?!,:;]$/.test(prev.w)))) { g = { words: [], chars: 0 }; groups.push(g); }
      g.words.push(w); g.chars += w.w.length + 1;
    });
    fixTimes();
  }
  function fixTimes() {
    groups.forEach(function (g, i) {
      var nx = groups[i + 1];
      g.s = g.words[0].s;
      g.e = Math.min(g.words[g.words.length - 1].e + 0.6, nx ? nx.words[0].s : 1e9);
      g.words.forEach(function (w, k) { w.e2 = k < g.words.length - 1 ? g.words[k + 1].s : g.e; });
    });
  }
  Array.prototype.forEach.call(root.querySelectorAll('[data-tamlul]'), function (btn) {
    btn.addEventListener('click', function () {
      if (busy || !file) return;
      var o = q();
      if (!o.free && o.used + dur > FREE_SEC) { $('vs-limit').hidden = false; say('⚠️ הסרטון ארוך מהדקות שנשארו לתמלול החודש.'); return; }
      lock(true); say('מכין את הקול לתמלול…', true);
      var done = 0, n = 0;
      pieces(file).then(function (list) {
        n = list.length; say('מתמלל בענן' + (n > 1 ? ' (' + n + ' חלקים במקביל)' : '') + '… זה לוקח כדקה' + (n > 4 ? ' או שתיים' : '') + '.', true);
        var res = new Array(n), idx = 0;
        function worker() {
          if (idx >= n) return Promise.resolve();
          var k = idx++;
          return runOne(list[k]).then(function (r) { res[k] = r; done++; prog.value = done / n; say('מתמלל בענן… ' + done + ' מתוך ' + n, true); return worker(); });
        }
        var ws = []; for (var i = 0; i < Math.min(PAR, n); i++) ws.push(worker());
        return Promise.all(ws).then(function () { return [].concat.apply([], res); });
      }).then(function (all) {
        segs = all.filter(function (s) { return s.text; });
        if (!segs.length) throw new Error('empty');
        var o2 = q(); o2.used += dur; qsave(o2); quota();
        var exact = segs.some(function (s) { return s.words && s.words.length; });
        regroup(); lock(false);
        say('✅ התמלול מוכן' + (exact ? '' : ' (הזמן של כל מילה משוער לפי המשפט)') + '. עוברים על הטקסט ומתקנים מה שצריך.');
        showCaps(); showSents(); still();
        used('tamlul_done', { secs: Math.round(dur), segs: segs.length, exact: exact ? 1 : 0 });
      }).catch(function (e) {
        lock(false);
        if (e && e.message === 'limit') say('⚠️ הגעתם למספר התמלולים המקסימלי להיום. נסו שוב מחר.');
        else if (e && e.message === 'empty') say('⚠️ לא נשמע דיבור בסרטון.');
        else say('⚠️ התמלול לא הצליח. בדקו את החיבור לאינטרנט ונסו שוב.');
        used('tamlul_fail', { err: e && e.message || '' });
      });
    });
  });

  // ---------- 2. כתוביות ----------
  function showCaps() {
    var box = $('kt-caps'); box.innerHTML = '';
    groups.forEach(function (g, i) {
      var l = document.createElement('label'); l.innerHTML = '<small></small><input type="text" dir="rtl">';
      l.querySelector('small').textContent = mmss(g.s);
      var inp = l.querySelector('input'); inp.value = g.words.map(function (w) { return w.w; }).join(' ');
      inp.addEventListener('focus', function () { if (!busy) seek(g.s + 0.05).then(function () { paint(vid.currentTime); }); });
      inp.addEventListener('change', function () { edit(i, inp.value); });
      box.appendChild(l);
    });
    $('kt-edit').hidden = false;
  }
  function edit(i, txt) {
    var g = groups[i], ws = txt.split(/\s+/).filter(Boolean);
    if (!ws.length) { groups.splice(i, 1); fixTimes(); showCaps(); return; }
    if (ws.length === g.words.length) ws.forEach(function (w, k) { g.words[k].w = w; });
    else {
      var s = g.words[0].s, e = g.words[g.words.length - 1].e, tot = ws.reduce(function (a, w) { return a + w.length + 1; }, 0), t = s;
      g.words = ws.map(function (w) { var d = (e - s) * (w.length + 1) / tot, o = { w: w, s: t, e: t + d }; t += d; return o; });
    }
    fixTimes(); paint(vid.currentTime); used('caps_edit');
  }
  $('kt-color').addEventListener('change', function () { paint(vid.currentTime); });
  $('kt-pos').addEventListener('change', function () { paint(vid.currentTime); });
  $('kt-play').addEventListener('click', function () {
    if (!groups) return;
    if (busy) { stopFlag = true; return; }
    var s = srcSize(); setCanvas(s[0], s[1]); job = { kind: 'caps' };
    var b = this; lock(true); b.disabled = false; b.dataset.stop = ''; b.textContent = '■ לעצור'; stopFlag = false;
    play(0, Math.min(dur, 60), false, function (x) { prog.value = x; }).then(function () { delete b.dataset.stop; b.textContent = '▶ לצפות לפני'; lock(false); });
  });
  $('kt-go').addEventListener('click', function () {
    if (busy || !groups || !canRec()) return;
    var s = srcSize(); setCanvas(s[0], s[1]); job = { kind: 'caps' }; lock(true); stopFlag = false;
    say('צורב את הכתוביות על הסרטון… זה לוקח ' + mmss(dur) + ' דקות.', true);
    play(0, dur, true, function (x) { prog.value = x; }).then(function (r) {
      lock(false); addOut(r, 'עם כתוביות', fileName + ' – כתוביות'); say('✅ הסרטון עם הכתוביות מוכן.');
      used('caps_done', { secs: Math.round(dur), fmt: r.ext });
    });
  });
  function srtT(t) { var ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000), x = ms % 1000; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ',' + String(x).padStart(3, '0'); }
  function srt(list, off) {
    return list.map(function (g, i) { return (i + 1) + '\n' + srtT(g.s - off) + ' --> ' + srtT(g.e - off) + '\n' + g.words.map(function (w) { return w.w; }).join(' ') + '\n'; }).join('\n');
  }
  $('kt-srt').addEventListener('click', function () {
    if (!groups) return;
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + srt(groups, 0)], { type: 'application/x-subrip' }));
    a.download = fileName + '.srt'; document.body.appendChild(a); a.click(); a.remove();
    window.__vsSrt = srt(groups, 0); used('srt');
  });

  // ---------- 3. משיעור לשורטים ----------
  var pick = [-1, -1], clips = [];
  function showSents() {
    var box = $('sh-sents'); box.innerHTML = '';
    segs.forEach(function (s, i) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.i = i;
      b.innerHTML = '<small></small><span></span>'; b.querySelector('small').textContent = mmss(s.start); b.querySelector('span').textContent = s.text;
      box.appendChild(b);
    });
    box.hidden = false; marks();
  }
  $('sh-sents').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]'); if (!b || busy) return;
    var i = +b.dataset.i;
    if (pick[0] < 0 || pick[1] >= 0) pick = [i, -1];
    else pick = i < pick[0] ? [i, pick[0]] : [pick[0], i];
    var a = segs[pick[0]], z = segs[pick[1] >= 0 ? pick[1] : pick[0]];
    $('sh-from').value = mmss(a.start); $('sh-to').value = mmss(Math.ceil(z.end));
    $('sh-from').dataset.t = a.start; $('sh-to').dataset.t = z.end;
    marks(); lenInfo();
    seek(a.start + 0.05).then(still);
  });
  function marks() {
    Array.prototype.forEach.call($('sh-sents').children, function (b, i) {
      var lo = pick[0], hi = pick[1] >= 0 ? pick[1] : pick[0];
      b.classList.toggle('in', lo >= 0 && i >= lo && i <= hi); b.classList.toggle('edge', i === lo || i === hi);
    });
  }
  function range() {
    var a = +($('sh-from').dataset.t || NaN), b = +($('sh-to').dataset.t || NaN);
    if (isNaN(a)) a = parseT($('sh-from').value); if (isNaN(b)) b = parseT($('sh-to').value);
    if (isNaN(a) || isNaN(b) || b <= a) return null;
    return [Math.max(0, a), Math.min(dur, b)];
  }
  function lenInfo() { var r = range(); $('sh-len').textContent = r ? Math.round(r[1] - r[0]) + ' שניות' + (r[1] - r[0] > 90 ? ' (ארוך לשורט, עדיף עד דקה וחצי)' : '') : ''; }
  ['sh-from', 'sh-to'].forEach(function (id) { $(id).addEventListener('input', function () { delete this.dataset.t; pick = [-1, -1]; marks(); lenInfo(); }); });
  $('sh-title').addEventListener('input', function () { if (tab === 'shorts' && !busy) still(); });
  $('sh-bg').addEventListener('change', function () { if (!busy) still(); });
  $('sh-caps').addEventListener('change', function () { if (!busy) still(); });
  function curClip() { var r = range(); return { a: r ? r[0] : 0, b: r ? r[1] : 0 }; }
  $('sh-add').addEventListener('click', function () {
    var r = range();
    if (!r) { say('⚠️ בוחרים התחלה וסוף: לוחצים על משפט ועוד משפט, או כותבים זמנים כמו 1:20 ו-2:05.'); return; }
    clips.push({ a: r[0], b: r[1], title: $('sh-title').value.trim(), bg: $('sh-bg').value, caps: $('sh-caps').value === '1' });
    $('sh-title').value = ''; $('sh-from').value = ''; $('sh-to').value = ''; delete $('sh-from').dataset.t; delete $('sh-to').dataset.t;
    pick = [-1, -1]; marks(); lenInfo(); drawClips(); say('');
    used('short_add', { secs: Math.round(r[1] - r[0]) });
  });
  function drawClips() {
    var ul = $('sh-clips'); ul.innerHTML = '';
    clips.forEach(function (c, i) {
      var li = document.createElement('li'); li.innerHTML = '<span></span><button type="button" aria-label="להסיר">✕</button>';
      li.querySelector('span').textContent = (i + 1) + '. ' + mmss(c.a) + '–' + mmss(c.b) + (c.title ? ' · ' + c.title : '');
      li.querySelector('button').addEventListener('click', function () { if (!busy) { clips.splice(i, 1); drawClips(); } });
      ul.appendChild(li);
    });
    $('sh-go').disabled = busy || !clips.length; $('sh-play').disabled = busy || !file;
  }
  $('sh-play').addEventListener('click', function () {
    if (busy) { stopFlag = true; return; }
    var c = clips[clips.length - 1], r = range();
    if (r) c = { a: r[0], b: r[1] };
    if (!c) return;
    setCanvas(720, 1280); job = { kind: 'short', clip: r ? {} : c };
    var b = this; lock(true); b.disabled = false; b.dataset.stop = ''; b.textContent = '■ לעצור'; stopFlag = false;
    play(c.a, c.b, false, function (x) { prog.value = x; }).then(function () { delete b.dataset.stop; b.textContent = '▶ לצפות בקטע'; lock(false); });
  });
  $('sh-go').addEventListener('click', function () {
    if (busy || !clips.length || !canRec()) return;
    setCanvas(720, 1280); lock(true); stopFlag = false; var i = 0, n = clips.length;
    used('shorts_start', { n: n });
    (function next() {
      if (i >= n || stopFlag) { lock(false); say('✅ השורטים מוכנים. אפשר לשתף כל אחד בנפרד.'); used('shorts_done', { n: n }); return; }
      var c = clips[i]; job = { kind: 'short', clip: c };
      say('יוצר שורט ' + (i + 1) + ' מתוך ' + n + '…', true);
      play(c.a, c.b, true, function (x) { prog.value = (i + x) / n; }).then(function (r) {
        addOut(r, 'שורט ' + (i + 1) + (c.title ? ': ' + c.title : ''), (c.title || fileName) + ' – שורט ' + (i + 1));
        i++; next();
      });
    })();
  });

  // לבדיקות: טעינת קובץ מכתובת ותמלול מוכן
  window.__vs = { load: function (blob, name) { return load(new File([blob], name || 'test.mp4', { type: blob.type || 'video/mp4' })); }, setSegs: function (s) { segs = s; regroup(); showCaps(); showSents(); still(); }, get groups() { return groups; }, get segs() { return segs; }, clips: function () { return clips; }, setTab: setTab };
})();
