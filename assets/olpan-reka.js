// רקע בכיס (אולפן לרב, כלי קודש): טשטוש או החלפת רקע בלי מסך ירוק.
// MediaPipe Selfie Segmentation מוצא איפה האדם בכל פריים ומחזיר "מסכה". מציירים את האדם מעל הרקע שנבחר על canvas,
// ומקליטים את ה-canvas עם הקול מהמיקרופון. הכול בטלפון, שום דבר לא עולה לשרת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var startBtn = $('rk-start'); if (!startBtn) return;
  var MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/';
  var BGS = ['jeru-1', 'jeru-2', 'kotel-1', 'kotel-3', 'books-1', 'torah-1', 'torah-2', 'candles-1', 'light-1', 'olive-1', 'wheat-1', 'mount-1', 'sea-1', 'sunset-1', 'garden-1', 'desert-1'];
  var out = $('rk-out'), ctx = out.getContext('2d'), view = $('rk-view'), vctx = view.getContext('2d'), FONT = getComputedStyle(document.body).fontFamily || 'sans-serif', count = 0, recT = 0, timer = null, cam = $('rk-cam'), state = $('rk-state');
  var tmp = document.createElement('canvas'), tctx = tmp.getContext('2d');
  var mask = document.createElement('canvas'), mctx = mask.getContext('2d'), prev = document.createElement('canvas'), pctx = prev.getContext('2d'), hasPrev = false;
  var seg = null, stream = null, running = false, busy = false, mode = 'blur', bgImg = null, bgName = '';
  var mr = null, parts = [], result = null, frames = 0, fpsT = 0, slow = 0, small = false, wake = null;

  function say(t) { state.textContent = t; }
  function used(how, extra) { if (window.toolUsed) { var o = { how: how, mode: mode }; for (var k in extra || {}) o[k] = extra[k]; window.toolUsed('reka', o); } }

  function loadMP() {
    if (window.SelfieSegmentation) return Promise.resolve();
    return new Promise(function (ok, bad) {
      var s = document.createElement('script'); s.src = MP + 'selfie_segmentation.js'; s.crossOrigin = 'anonymous';
      s.onload = ok; s.onerror = function () { bad(new Error('mp')); }; document.head.appendChild(s);
    });
  }

  function size() {
    var h = $('rk-shape').value === 'h', w = small ? (h ? 640 : 360) : (h ? 960 : 540);
    out.width = w; out.height = Math.round(h ? w * 9 / 16 : w * 4 / 3);
    [tmp, mask, prev, view].forEach(function (c) { c.width = out.width; c.height = out.height; }); hasPrev = false;
  }
  // ציור "cover": ממלא את כל הפריים בלי עיוות, חותך מה שעודף
  function cover(c, src, sw, sh) {
    var W = c.canvas.width, H = c.canvas.height, r = Math.max(W / sw, H / sh), w = sw * r, h = sh * r;
    c.drawImage(src, (W - w) / 2, (H - h) / 2, w, h);
  }

  function draw(res) {
    var W = out.width, H = out.height, vw = cam.videoWidth, vh = cam.videoHeight;
    ctx.save(); ctx.clearRect(0, 0, W, H);
    if (mode === 'none') { cover(ctx, res.image, vw, vh); ctx.restore(); finish(); return; }
    // 1. האדם בלבד: המסכה, ובתוכה (source-in) הפריים מהמצלמה
    // החלקה בזמן: המסכה החדשה מעורבבת עם הקודמת (40%), כדי שהשוליים לא ירצדו מפריים לפריים
    mctx.clearRect(0, 0, W, H);
    if (hasPrev) { mctx.globalAlpha = 0.4; mctx.drawImage(prev, 0, 0); }
    mctx.globalAlpha = hasPrev ? 0.6 : 1; mctx.filter = 'blur(' + (small ? 2 : 3) + 'px)';
    cover(mctx, res.segmentationMask, vw, vh); mctx.filter = 'none'; mctx.globalAlpha = 1;
    pctx.clearRect(0, 0, W, H); pctx.drawImage(mask, 0, 0); hasPrev = true;
    tctx.save(); tctx.clearRect(0, 0, W, H); tctx.drawImage(mask, 0, 0);
    tctx.globalCompositeOperation = 'source-in'; cover(tctx, res.image, vw, vh); tctx.restore();
    // 2. הרקע
    if (mode === 'blur') { ctx.filter = 'blur(' + $('rk-blur').value + 'px)'; cover(ctx, res.image, vw, vh); ctx.filter = 'none'; }
    else if (mode === 'img' && bgImg) cover(ctx, bgImg, bgImg.naturalWidth, bgImg.naturalHeight);
    else { ctx.fillStyle = $('rk-color').value; ctx.fillRect(0, 0, W, H); }
    // 3. האדם מעל הרקע
    ctx.drawImage(tmp, 0, 0); ctx.restore(); finish();
  }
  // מה שמוקלט (out) יוצא ישר; מה שרואים על המסך (view) הפוך כמו מראה במצלמה הקדמית, אבל הכיתוב תמיד קריא
  function finish() {
    var W = out.width, H = out.height;
    vctx.setTransform(1, 0, 0, 1, 0, 0); vctx.clearRect(0, 0, W, H);
    if (mirror()) { vctx.translate(W, 0); vctx.scale(-1, 1); }
    vctx.drawImage(out, 0, 0); vctx.setTransform(1, 0, 0, 1, 0, 0);
    title(ctx); title(vctx);
    if (count) { // ספירה לאחור – רק על המסך, לא בסרטון
      vctx.fillStyle = 'rgba(0,0,0,.35)'; vctx.fillRect(0, 0, W, H);
      vctx.fillStyle = '#fff'; vctx.textAlign = 'center'; vctx.textBaseline = 'middle';
      vctx.font = '700 ' + Math.round(H * 0.28) + 'px ' + FONT; vctx.fillText(String(count), W / 2, H / 2);
    }
  }
  // כיתוב תחתון: שם ושורה שנייה, בפס כהה עם קו זהב, בצד ימין
  function title(c) {
    var name = $('rk-name').value.trim(), sub = $('rk-sub').value.trim();
    if (!name && !sub) return;
    var W = c.canvas.width, H = c.canvas.height, u = Math.min(W, H) / 20, pad = u * 0.7;
    c.save(); c.direction = 'rtl'; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    var f1 = '700 ' + Math.round(u * 1.15) + 'px ' + FONT, f2 = Math.round(u * 0.8) + 'px ' + FONT;
    c.font = f1; var w1 = name ? c.measureText(name).width : 0;
    c.font = f2; var w2 = sub ? c.measureText(sub).width : 0;
    var bw = Math.min(W - u * 2, Math.max(w1, w2) + pad * 2 + u * 0.25), bh = pad * 1.4 + (name ? u * 1.3 : 0) + (sub ? u * 1.05 : 0);
    var x = W - u, y = H - u * 2.6 - bh; // מעל הכפתורים שווטסאפ מציג בתחתית
    c.fillStyle = 'rgba(12,18,32,.78)'; c.fillRect(x - bw, y, bw, bh);
    c.fillStyle = '#e6c57e'; c.fillRect(x - u * 0.22, y, u * 0.22, bh);
    var ty = y + pad * 0.7;
    if (name) { ty += u * 1.15; c.font = f1; c.fillStyle = '#fff'; c.fillText(name, x - pad, ty, bw - pad * 1.5); }
    if (sub) { ty += u * 1.05; c.font = f2; c.fillStyle = '#e6c57e'; c.fillText(sub, x - pad, ty, bw - pad * 1.5); }
    c.restore();
  }
  function mirror() { return $('rk-face').value === 'user'; }

  function fps() {
    frames++; var now = performance.now();
    if (now - fpsT < 2000) return;
    var f = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now;
    $('rk-fps').textContent = f + ' פריימים בשנייה';
    // טלפון חלש: אם פחות מ-12 פריימים פעמיים ברצף, מקטינים את הצילום (לא באמצע הקלטה)
    if (f < 12 && !small && !(mr && mr.state === 'recording')) { if (++slow >= 2) { small = true; size(); say('הטלפון עמוס, עברנו לאיכות קלה יותר כדי שהצילום יהיה חלק.'); } }
    else slow = 0;
  }

  function tick() {
    if (!running) return;
    if (!busy && cam.readyState >= 2) {
      busy = true;
      seg.send({ image: cam }).then(function () { busy = false; fps(); }, function () { busy = false; });
    }
    if (cam.requestVideoFrameCallback) cam.requestVideoFrameCallback(tick); else requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('הדפדפן הזה לא נותן גישה למצלמה. נסו בכרום או בספארי.'); return; }
    startBtn.disabled = true; say('פותחים מצלמה…');
    var h = $('rk-shape').value === 'h';
    navigator.mediaDevices.getUserMedia({ video: { facingMode: $('rk-face').value, width: { ideal: h ? 1280 : 720 }, height: { ideal: h ? 720 : 1280 } }, audio: { echoCancellation: true, noiseSuppression: true } })
      .catch(function () { return navigator.mediaDevices.getUserMedia({ video: { facingMode: $('rk-face').value }, audio: false }); })
      .then(function (s) {
        stream = s; cam.srcObject = s; return cam.play();
      })
      .then(function () { say('טוענים את זיהוי הרקע (בפעם הראשונה זה לוקח כמה שניות)…'); return loadMP(); })
      .then(function () {
        if (!seg) {
          seg = new window.SelfieSegmentation({ locateFile: function (f) { return MP + f; } });
          // מודל 1 ("landscape") קל ומהיר יותר, מתאים לטלפון
          seg.setOptions({ modelSelection: 1, selfieMode: false });
          seg.onResults(draw);
        }
        return seg.initialize ? seg.initialize() : null;
      })
      .then(function () {
        size(); running = true; fpsT = performance.now(); frames = 0;
        $('rk-wrap').hidden = false; $('rk-panel').hidden = false; 
        if (!stream.getAudioTracks().length) say('המצלמה פתוחה, אבל בלי מיקרופון: הסרטון ייצא בלי קול.'); else say('');
        if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {});
        tick(); used('start', { face: $('rk-face').value, shape: $('rk-shape').value });
      })
      .catch(function (e) {
        startBtn.disabled = false;
        say(e && e.message === 'mp' ? 'לא הצלחנו לטעון את זיהוי הרקע. בדקו את החיבור לאינטרנט ונסו שוב.' : 'המצלמה לא נפתחה. צריך לאשר גישה למצלמה בדפדפן.');
        if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      });
  }
  function stop() {
    if (mr && mr.state === 'recording') mr.stop();
    running = false; startBtn.disabled = false; count = 0; clearInterval(timer); $('rk-rec').textContent = '● לצלם';
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    $('rk-wrap').hidden = true; $('rk-panel').hidden = true;
    if (wake) { wake.release().catch(function () {}); wake = null; }
  }

  function mime() {
    var l = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
    for (var i = 0; i < l.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(l[i])) return l[i];
    return '';
  }
  function toggleRec() {
    var b = $('rk-rec');
    if (mr && mr.state === 'recording') { mr.stop(); return; }
    if (count) { count = 0; clearInterval(timer); b.textContent = '● לצלם'; return; } // ביטול באמצע הספירה
    if (!running || !window.MediaRecorder) { say('הדפדפן הזה לא יודע להקליט וידאו.'); return; }
    // ספירה לאחור 3-2-1, כדי שיהיה זמן להתיישב ולהסתכל למצלמה
    count = 3; b.textContent = '✕ לבטל';
    timer = setInterval(function () { if (--count <= 0) { clearInterval(timer); count = 0; record(); } }, 1000);
  }
  function clock() { var t = Math.floor((Date.now() - recT) / 1000); $('rk-recdot').textContent = '● ' + Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
  function record() {
    var b = $('rk-rec');
    if (!running) { b.textContent = '● לצלם'; return; }
    var vs = out.captureStream(30), tracks = vs.getVideoTracks().concat(stream.getAudioTracks());
    var m = mime(); parts = [];
    mr = new MediaRecorder(new MediaStream(tracks), m ? { mimeType: m, videoBitsPerSecond: 2500000 } : undefined);
    mr.ondataavailable = function (e) { if (e.data.size) parts.push(e.data); };
    mr.onstop = function () {
      var type = (mr.mimeType || 'video/webm').split(';')[0];
      result = { blob: new Blob(parts, { type: type }), ext: type.indexOf('mp4') > -1 ? 'mp4' : 'webm' };
      $('rk-video').src = URL.createObjectURL(result.blob); $('rk-result').hidden = false;
      clearInterval(timer); b.textContent = '● לצלם'; $('rk-recdot').hidden = true;
      used('recorded', { bg: bgName || mode, sec: Math.round((Date.now() - recT) / 1000), title: !!($('rk-name').value.trim() || $('rk-sub').value.trim()) });
      $('rk-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    mr.start(1000); b.textContent = '■ לעצור צילום'; $('rk-recdot').hidden = false;
    recT = Date.now(); clock(); timer = setInterval(clock, 500);
  }

  function fname(ext) { return 'שיעור-רקע-בכיס.' + ext; }
  function save(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function share(blob, name, how) {
    var f = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).then(function () { used(how); }).catch(function () {});
    else { save(blob, name); used('download'); }
  }

  // ---------- בחירת רקע ----------
  function setMode(m) {
    mode = m;
    [].forEach.call(document.querySelectorAll('[data-mode]'), function (b) { b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'); });
    $('rk-blurrow').hidden = m !== 'blur'; $('rk-colorrow').hidden = m !== 'color'; $('rk-gal').hidden = m !== 'img';
    if (m === 'img' && !bgImg) pick(BGS[0]);
    remember();
  }
  function pick(name, src) {
    var im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = function () { bgImg = im; };
    im.src = src || '/assets/video/' + name + '.jpg'; bgName = src ? 'own' : name;
    [].forEach.call($('rk-gal').querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.dataset.bg === bgName ? 'true' : 'false'); });
    remember();
  }
  function gallery() {
    var g = $('rk-gal');
    BGS.forEach(function (n) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.bg = n; b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', 'רקע ' + n);
      b.innerHTML = '<img loading="lazy" alt="" src="/assets/video/' + n + '.jpg">';
      b.addEventListener('click', function () { pick(n); });
      g.appendChild(b);
    });
    var l = document.createElement('label'); l.innerHTML = '📁 תמונה שלי<input type="file" accept="image/*" hidden>';
    l.querySelector('input').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      pick('own', URL.createObjectURL(f)); used('own_bg');
    });
    g.appendChild(l);
  }
  function remember() { try { localStorage.setItem('kodesh-reka', JSON.stringify({ mode: mode, bg: bgName === 'own' ? '' : bgName, blur: $('rk-blur').value, color: $('rk-color').value, name: $('rk-name').value, sub: $('rk-sub').value, face: $('rk-face').value, shape: $('rk-shape').value })); } catch (e) {} }

  gallery();
  try {
    var s = JSON.parse(localStorage.getItem('kodesh-reka') || 'null');
    if (s) {
      if (s.blur) $('rk-blur').value = s.blur; if (s.color) $('rk-color').value = s.color;
      if (s.face) $('rk-face').value = s.face; if (s.shape) $('rk-shape').value = s.shape;
      if (s.bg && BGS.indexOf(s.bg) > -1) pick(s.bg);
      if (s.name) $('rk-name').value = s.name; if (s.sub) $('rk-sub').value = s.sub;
      if (s.mode) setMode(s.mode);
    }
  } catch (e) {}

  startBtn.addEventListener('click', start);
  $('rk-stop').addEventListener('click', stop);
  $('rk-rec').addEventListener('click', toggleRec);
  $('rk-snap').addEventListener('click', function () {
    if (!running) return;
    out.toBlob(function (b) { if (b) share(b, 'רקע-בכיס.png', 'snap'); }, 'image/png');
  });
  $('rk-dl').addEventListener('click', function () { if (result) { save(result.blob, fname(result.ext)); used('download'); } });
  $('rk-share').addEventListener('click', function () { if (result) share(result.blob, fname(result.ext), 'share'); });
  [].forEach.call(document.querySelectorAll('[data-mode]'), function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });
  $('rk-name').addEventListener('change', remember); $('rk-sub').addEventListener('change', remember);
  $('rk-blur').addEventListener('change', remember); $('rk-color').addEventListener('change', remember);
  $('rk-shape').addEventListener('change', function () { if (running) size(); remember(); });
  $('rk-face').addEventListener('change', function () { remember(); if (running) { stop(); start(); } });
})();
