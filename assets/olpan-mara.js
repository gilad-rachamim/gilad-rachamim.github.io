// מראה חכמה (אולפן לרב): בודקת תאורה, תאורה מאחור, צד חשוך, אזורים שרופים, עוצמת דיבור ורעש רקע. הכול בטלפון, בלי הקלטה.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('mr-start')) return;
  var video = $('mr-video'), grid = $('mr-grid'), tips = $('mr-tips');
  var stream = null, ac = null, an = null, buf = null, timer = null, levels = [], noise = null, quietRun = null;
  var small = document.createElement('canvas'); small.width = 64; small.height = 48;
  var sctx = small.getContext('2d', { willReadFrequently: true });

  function drawGrid() {
    var w = grid.clientWidth, h = grid.clientHeight; grid.width = w; grid.height = h;
    var g = grid.getContext('2d'); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.setLineDash([6, 6]);
    [1 / 3, 2 / 3].forEach(function (f) { g.beginPath(); g.moveTo(w * f, 0); g.lineTo(w * f, h); g.stroke(); g.beginPath(); g.moveTo(0, h * f); g.lineTo(w, h * f); g.stroke(); });
    g.setLineDash([]); g.strokeStyle = 'rgba(230,197,126,.6)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(w / 2, h * 0.45, w * 0.2, h * 0.22, 0, 0, Math.PI * 2); g.stroke();
  }

  function analyzeImage() {
    if (!video.videoWidth) return null;
    sctx.drawImage(video, 0, 0, 64, 48);
    var d = sctx.getImageData(0, 0, 64, 48).data, sum = 0, n = 0, c = 0, cn = 0, edge = 0, en = 0, left = 0, right = 0, burn = 0;
    for (var y = 0; y < 48; y++) for (var x = 0; x < 64; x++) {
      var i = (y * 64 + x) * 4, L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      sum += L; n++; if (L > 250) burn++;
      var inC = x > 18 && x < 46 && y > 8 && y < 36;
      if (inC) { c += L; cn++; } else if (x < 8 || x > 55 || y < 6) { edge += L; en++; }
      if (x < 32) left += L; else right += L;
    }
    // התמונה במסך הפוכה כמו מראה: הצד השמאלי במצלמה הוא הצד הימני שלכם
    return { mean: sum / n, center: c / cn, edge: edge / en, camLeft: left / (n / 2), camRight: right / (n / 2), burn: burn / n };
  }
  function db() {
    if (!an) return -100;
    an.getFloatTimeDomainData(buf);
    var s = 0; for (var i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return 20 * Math.log10(Math.sqrt(s / buf.length) + 1e-9);
  }

  function tip(kind, icon, text) { var li = document.createElement('li'); li.className = kind; li.innerHTML = '<b>' + icon + '</b><span></span>'; li.lastChild.textContent = text; tips.appendChild(li); }
  function update() {
    var im = analyzeImage(), now = db();
    levels.push(now); if (levels.length > 30) levels.shift();
    var peak = Math.max.apply(null, levels);
    $('mr-meter').firstChild.style.width = Math.max(0, Math.min(100, (now + 60) / 60 * 100)) + '%';
    $('mr-db').textContent = '(' + Math.round(now) + ' dB)';
    if (quietRun) quietRun.push(now);
    tips.innerHTML = '';
    if (im) {
      if (im.mean < 70) tip('warn', '💡', 'חשוך מדי. כדאי לשבת מול חלון או להדליק מנורה מולכם.');
      else if (im.mean > 200) tip('warn', '☀️', 'בהיר מדי. כדאי להתרחק קצת מהאור או לסגור חלק מהווילון.');
      else tip('ok', '✓', 'כמות האור טובה.');
      if (im.edge - im.center > 35) tip('warn', '🪟', 'האור מאחוריכם, והפנים יוצאות כהות. כדאי להסתובב כך שהחלון יהיה מולכם.');
      var side = im.camLeft - im.camRight;
      if (Math.abs(side) > 40) tip('warn', '◐', 'צד אחד של הפנים חשוך. כדאי אור גם מצד ' + (side > 0 ? 'שמאל' : 'ימין') + ' שלכם, או להסתובב קצת לכיוון האור.');
      if (im.burn > 0.12) tip('warn', '⚪', 'יש אזור לבן "שרוף" בתמונה. כדאי להזיז את המצלמה כך שלא תראה חלון או מנורה ישירה.');
      var st = stream && stream.getVideoTracks()[0] && stream.getVideoTracks()[0].getSettings();
      if (st && st.width && st.height) tip('ok', '▭', (st.height > st.width ? 'הטלפון לגובה: מתאים לסטטוס ולשורטים.' : 'הטלפון לרוחב: מתאים ליוטיוב. לסטטוס – להחזיק לגובה.') + ' (' + st.width + '×' + st.height + ')');
    }
    if (peak < -38) tip('warn', '🎙', 'כשאתם מדברים הקול חלש. כדאי להתקרב לטלפון או לדבר קצת יותר חזק.');
    else if (peak > -4) tip('warn', '📢', 'הקול חזק מדי ועלול להישמע צורם. כדאי להתרחק מעט מהטלפון.');
    else if (peak > -30) tip('ok', '✓', 'עוצמת הדיבור טובה.');
    if (noise !== null) {
      if (noise > -48) tip('warn', '🌀', 'יש רעש ברקע (' + Math.round(noise) + ' dB). מזגן, מאוורר או חלון פתוח? כדאי לכבות או לסגור.');
      else tip('ok', '✓', 'החדר שקט (' + Math.round(noise) + ' dB).');
    } else tip('', 'ⓘ', 'לבדיקת רעש: לוחצים על "5 שניות של שקט" ולא מדברים.');
  }

  function start() {
    stop();
    navigator.mediaDevices.getUserMedia({ video: { facingMode: $('mr-face').value, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .then(function (s) {
        stream = s; video.srcObject = s; video.play();
        video.style.transform = $('mr-face').value === 'user' ? 'scaleX(-1)' : 'none';
        $('mr-wrap').hidden = false; $('mr-panel').hidden = false;
        var A = window.AudioContext || window.webkitAudioContext;
        if (A) { ac = new A(); an = ac.createAnalyser(); an.fftSize = 2048; buf = new Float32Array(an.fftSize); ac.createMediaStreamSource(s).connect(an); }
        video.onloadedmetadata = drawGrid; setTimeout(drawGrid, 500);
        timer = setInterval(update, 150);
        if (window.toolUsed) window.toolUsed('mara', { how: 'start' });
      })
      .catch(function () { tips.innerHTML = ''; $('mr-panel').hidden = false; tip('warn', '⚠', 'המצלמה או המיקרופון לא נפתחו. צריך לאשר גישה בדפדפן (בסמל המנעול ליד הכתובת).'); });
  }
  function stop() {
    clearInterval(timer); timer = null;
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null;
    if (ac) { ac.close(); ac = null; an = null; }
  }
  $('mr-start').addEventListener('click', start);
  $('mr-face').addEventListener('change', function () { if (stream) start(); });
  $('mr-stop').addEventListener('click', function () { stop(); $('mr-wrap').hidden = true; $('mr-panel').hidden = true; });
  $('mr-quiet').addEventListener('click', function () {
    var b = this; quietRun = []; b.disabled = true; b.textContent = 'שקט… 5';
    var n = 5, t = setInterval(function () {
      n--; b.textContent = n ? 'שקט… ' + n : 'לבדוק רעש: 5 שניות של שקט';
      if (!n) {
        clearInterval(t); b.disabled = false;
        var a = quietRun.slice().sort(function (x, y) { return x - y; }); quietRun = null;
        noise = a.length ? a[Math.floor(a.length * 0.5)] : null;
        if (window.toolUsed) window.toolUsed('mara', { how: 'noise', db: Math.round(noise) });
      }
    }, 1000);
  });
  window.addEventListener('resize', function () { if (stream) drawGrid(); });
})();
