// רקע בכיס (אולפן לרב, כלי קודש): טשטוש או החלפת רקע בלי מסך ירוק.
// MediaPipe Selfie Segmentation מוצא איפה האדם בכל פריים ומחזיר "מסכה". מציירים את האדם מעל הרקע שנבחר על canvas,
// ומקליטים את ה-canvas עם הקול מהמיקרופון. הכול בטלפון, שום דבר לא עולה לשרת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var startBtn = $('rk-start'); if (!startBtn) return;
  var MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/';
  var BGS = ['jeru-1', 'jeru-2', 'kotel-1', 'kotel-3', 'books-1', 'torah-1', 'torah-2', 'candles-1', 'light-1', 'olive-1', 'wheat-1', 'mount-1', 'sea-1', 'sunset-1', 'garden-1', 'desert-1'];
  var out = $('rk-out'), ctx = out.getContext('2d'), cam = $('rk-cam'), state = $('rk-state');
  var tmp = document.createElement('canvas'), tctx = tmp.getContext('2d');
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
    tmp.width = out.width; tmp.height = out.height;
  }
  // ציור "cover": ממלא את כל הפריים בלי עיוות, חותך מה שעודף
  function cover(c, src, sw, sh) {
    var W = c.canvas.width, H = c.canvas.height, r = Math.max(W / sw, H / sh), w = sw * r, h = sh * r;
    c.drawImage(src, (W - w) / 2, (H - h) / 2, w, h);
  }

  function draw(res) {
    var W = out.width, H = out.height, vw = cam.videoWidth, vh = cam.videoHeight;
    ctx.save(); ctx.clearRect(0, 0, W, H);
    if (mode === 'none') { cover(ctx, res.image, vw, vh); ctx.restore(); return; }
    // 1. האדם בלבד: המסכה, ובתוכה (source-in) הפריים מהמצלמה
    tctx.save(); tctx.clearRect(0, 0, W, H);
    tctx.filter = 'blur(' + (small ? 2 : 3) + 'px)'; cover(tctx, res.segmentationMask, vw, vh); tctx.filter = 'none';
    tctx.globalCompositeOperation = 'source-in'; cover(tctx, res.image, vw, vh); tctx.restore();
    // 2. הרקע
    if (mode === 'blur') { ctx.filter = 'blur(' + $('rk-blur').value + 'px)'; cover(ctx, res.image, vw, vh); ctx.filter = 'none'; }
    else if (mode === 'img' && bgImg) cover(ctx, bgImg, bgImg.naturalWidth, bgImg.naturalHeight);
    else { ctx.fillStyle = $('rk-color').value; ctx.fillRect(0, 0, W, H); }
    // 3. האדם מעל הרקע
    ctx.drawImage(tmp, 0, 0); ctx.restore();
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
        $('rk-wrap').hidden = false; $('rk-panel').hidden = false; $('rk-wrap').classList.toggle('mirror', mirror());
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
    running = false; startBtn.disabled = false;
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
    if (!running || !window.MediaRecorder) { say('הדפדפן הזה לא יודע להקליט וידאו.'); return; }
    var vs = out.captureStream(30), tracks = vs.getVideoTracks().concat(stream.getAudioTracks());
    var m = mime(); parts = [];
    mr = new MediaRecorder(new MediaStream(tracks), m ? { mimeType: m, videoBitsPerSecond: 2500000 } : undefined);
    mr.ondataavailable = function (e) { if (e.data.size) parts.push(e.data); };
    mr.onstop = function () {
      var type = (mr.mimeType || 'video/webm').split(';')[0];
      result = { blob: new Blob(parts, { type: type }), ext: type.indexOf('mp4') > -1 ? 'mp4' : 'webm' };
      $('rk-video').src = URL.createObjectURL(result.blob); $('rk-result').hidden = false;
      b.textContent = '● לצלם'; $('rk-recdot').hidden = true; used('recorded', { bg: bgName || mode });
      $('rk-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    mr.start(1000); b.textContent = '■ לעצור צילום'; $('rk-recdot').hidden = false;
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
  function remember() { try { localStorage.setItem('kodesh-reka', JSON.stringify({ mode: mode, bg: bgName === 'own' ? '' : bgName, blur: $('rk-blur').value, color: $('rk-color').value, face: $('rk-face').value, shape: $('rk-shape').value })); } catch (e) {} }

  gallery();
  try {
    var s = JSON.parse(localStorage.getItem('kodesh-reka') || 'null');
    if (s) {
      if (s.blur) $('rk-blur').value = s.blur; if (s.color) $('rk-color').value = s.color;
      if (s.face) $('rk-face').value = s.face; if (s.shape) $('rk-shape').value = s.shape;
      if (s.bg && BGS.indexOf(s.bg) > -1) pick(s.bg);
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
  $('rk-blur').addEventListener('change', remember); $('rk-color').addEventListener('change', remember);
  $('rk-shape').addEventListener('change', function () { if (running) size(); remember(); });
  $('rk-face').addEventListener('change', function () { remember(); if (running) { stop(); start(); } });
})();
