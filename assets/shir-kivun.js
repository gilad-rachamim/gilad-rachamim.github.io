/* כיוון גיטרה: זיהוי גובה צליל מהמיקרופון (אוטו-קורלציה) וצלילי ייחוס */
(function () {
  var $ = function (i) { return document.getElementById(i); };
  var SETS = {
    gitara: [['E', 'מי', 82.41], ['A', 'לה', 110], ['D', 'רה', 146.83], ['G', 'סול', 196], ['B', 'סי', 246.94], ['E', 'מי', 329.63]],
    ukulele: [['G', 'סול', 392], ['C', 'דו', 261.63], ['E', 'מי', 329.63], ['A', 'לה', 440]],
    bass: [['E', 'מי', 41.2], ['A', 'לה', 55], ['D', 'רה', 73.42], ['G', 'סול', 98]]
  };
  var set = 'gitara', ctx = null, an = null, buf = null, mic = false, raf = 0, osc = null, target = -1, stream = null;
  function ac() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  function strs() {
    var S = SETS[set], h = '';
    for (var i = 0; i < S.length; i++) h += '<button type="button" data-i="' + i + '" aria-label="מיתר ' + (S.length - i) + ', ' + S[i][1] + '">' + S[i][0] + '<small>' + S[i][1] + '</small></button>';
    $('gt-strs').style.gridTemplateColumns = 'repeat(' + S.length + ',1fr)'; $('gt-strs').innerHTML = h; target = -1;
  }
  function tone(i) {
    var c = ac(); if (osc) { try { osc.stop(); } catch (e) {} }
    var o = c.createOscillator(), g = c.createGain(), f = SETS[set][i][2];
    o.type = 'triangle'; o.frequency.value = f < 100 ? f * 2 : f; o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 2.4);
    o.start(); o.stop(c.currentTime + 2.5); osc = o; target = i;
    [].forEach.call($('gt-strs').children, function (b, k) { b.className = k === i ? 'on' : ''; });
  }
  function pitch(b, sr) {
    var n = b.length, rms = 0, i, j;
    for (i = 0; i < n; i++) rms += b[i] * b[i];
    if (Math.sqrt(rms / n) < 0.012) return -1;
    var lo = Math.floor(sr / 1200), hi = Math.min(Math.floor(sr / 35), n >> 1), best = -1, bv = 0, c = new Float32Array(hi + 2);
    for (j = lo; j <= hi + 1; j++) { var s = 0; for (i = 0; i < n - j; i++) s += b[i] * b[i + j]; c[j] = s; }
    var d = lo; while (d < hi && c[d] > c[d + 1]) d++;
    for (j = d; j <= hi; j++) if (c[j] > bv) { bv = c[j]; best = j; }
    if (best < 1 || bv < 0.2 * c[lo] && bv <= 0) return -1;
    var a = c[best - 1], m = c[best], z = c[best + 1], sh = (a - z) / (2 * (a - 2 * m + z) || 1);
    return sr / (best + sh);
  }
  function loop() {
    an.getFloatTimeDomainData(buf);
    var f = pitch(buf, ctx.sampleRate), S = SETS[set], nd = $('gt-needle');
    if (f > 0) {
      var k = target, bd = 1e9;
      if (k < 0) for (var i = 0; i < S.length; i++) { var dd = Math.abs(1200 * Math.log(f / S[i][2]) / Math.LN2); if (dd < bd) { bd = dd; k = i; } }
      var cents = 1200 * Math.log(f / S[k][2]) / Math.LN2;
      if (Math.abs(cents) < 400) {
        var cl = Math.max(-50, Math.min(50, cents));
        nd.style.left = (50 + cl) + '%'; nd.className = 'gt-needle ' + (Math.abs(cents) < 5 ? 'ok' : 'off');
        $('gt-note').textContent = S[k][0] + ' · ' + S[k][1];
        $('gt-msg').textContent = Math.abs(cents) < 5 ? '✓ מכוון' : (cents < 0 ? 'נמוך מדי: למתוח את המיתר' : 'גבוה מדי: לשחרר את המיתר');
        [].forEach.call($('gt-strs').children, function (b, q) { b.className = q === k ? 'on' : ''; });
      }
    }
    raf = requestAnimationFrame(loop);
  }
  function micOn() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('gt-msg').textContent = 'הדפדפן הזה לא נותן גישה למיקרופון. אפשר לכוון לפי הצלילים למטה.'; return; }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (st) {
      stream = st; var c = ac(), src = c.createMediaStreamSource(st);
      an = c.createAnalyser(); an.fftSize = 4096; buf = new Float32Array(an.fftSize); src.connect(an);
      mic = true; $('gt-mic').textContent = '⏹ לכבות את המיקרופון'; $('gt-msg').textContent = 'מנגנים מיתר אחד, קרוב לטלפון…'; loop();
    }).catch(function () { $('gt-msg').textContent = 'אין גישה למיקרופון. מאשרים בהגדרות הדפדפן, או מכוונים לפי הצלילים למטה.'; });
  }
  function micOff() {
    mic = false; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    $('gt-mic').textContent = '🎤 לכוון עם המיקרופון'; $('gt-msg').textContent = ''; $('gt-note').textContent = '–';
  }
  $('gt-mic').addEventListener('click', function () { mic ? micOff() : micOn(); });
  $('gt-strs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) tone(+b.dataset.i); });
  [].forEach.call(document.querySelectorAll('#gt-set button'), function (b) {
    b.addEventListener('click', function () {
      set = b.dataset.s; strs();
      [].forEach.call(document.querySelectorAll('#gt-set button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    });
  });
  strs();
})();
