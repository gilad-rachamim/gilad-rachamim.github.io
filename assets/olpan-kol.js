// קול נקי (אולפן לרב): הקלטה או קובץ → מסנן נמוכים/גבוהים → שער רעש עדין בין משפטים → קומפרסור → נרמול → WAV מונו 24kHz.
// הכול בדפדפן (Web Audio + חישוב על הדגימות), בלי שרת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('kn-form')) return;
  var RATE = 24000, src = null, out = null, mr = null, recStream = null, t0 = 0, tick = null;
  var A = window.AudioContext || window.webkitAudioContext, OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  function msg(t) { $('kn-msg').textContent = t; }
  function used(how, extra) { if (window.toolUsed) window.toolUsed('kol_naki', Object.assign({ how: how }, extra || {})); }

  function setSource(blob, name) {
    src = { blob: blob, name: (name || 'הקלטה').replace(/\.[^.]+$/, '') };
    $('kn-go').disabled = false; $('kn-out').hidden = true;
    msg('ההקלטה מוכנה (' + Math.round(blob.size / 1048576 * 10) / 10 + ' MB). לוחצים "לנקות את הקול".');
  }
  $('kn-file').addEventListener('change', function () { var f = this.files[0]; if (f) setSource(f, f.name); });

  // ---------- הקלטה ----------
  function mime() { var l = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']; for (var i = 0; i < l.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(l[i])) return l[i]; return ''; }
  $('kn-rec').addEventListener('click', function () {
    var b = this;
    if (mr && mr.state === 'recording') { mr.stop(); return; }
    navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true, channelCount: 1 } }).then(function (s) {
      recStream = s; var parts = [], m = mime();
      mr = new MediaRecorder(s, m ? { mimeType: m } : undefined);
      mr.ondataavailable = function (e) { if (e.data.size) parts.push(e.data); };
      mr.onstop = function () {
        clearInterval(tick); $('kn-time').hidden = true; b.textContent = '● להקליט כאן';
        recStream.getTracks().forEach(function (t) { t.stop(); });
        setSource(new Blob(parts, { type: (mr.mimeType || 'audio/webm').split(';')[0] }), 'הקלטה');
        used('recorded', { secs: Math.round((Date.now() - t0) / 1000) });
      };
      mr.start(1000); t0 = Date.now(); b.textContent = '■ לעצור הקלטה'; $('kn-time').hidden = false;
      tick = setInterval(function () { var s2 = Math.floor((Date.now() - t0) / 1000); $('kn-time').textContent = String(Math.floor(s2 / 60)).padStart(2, '0') + ':' + String(s2 % 60).padStart(2, '0'); }, 500);
    }).catch(function () { msg('המיקרופון לא נפתח. צריך לאשר גישה בדפדפן.'); });
  });

  // ---------- עיבוד ----------
  function filterPass(buffer) {
    var len = Math.ceil(buffer.duration * RATE), oc = new OAC(1, len, RATE), s = oc.createBufferSource();
    s.buffer = buffer;
    var hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 85; hp.Q.value = 0.7;
    var hum = oc.createBiquadFilter(); hum.type = 'notch'; hum.frequency.value = 50; hum.Q.value = 8;   // זמזום חשמל (50Hz בישראל)
    var lp = oc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9500;
    var pres = oc.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3000; pres.gain.value = 2.5; pres.Q.value = 0.9; // בהירות בדיבור
    s.connect(hp); hp.connect(hum); hum.connect(lp); lp.connect(pres); pres.connect(oc.destination);
    s.start();
    return oc.startRendering();
  }
  function gate(data, strength) {
    var F = Math.round(RATE * 0.02), n = Math.floor(data.length / F), dbs = new Float32Array(n);
    for (var f = 0; f < n; f++) { var s = 0; for (var i = f * F; i < (f + 1) * F; i++) s += data[i] * data[i]; dbs[f] = 10 * Math.log10(s / F + 1e-12); }
    var sorted = Array.prototype.slice.call(dbs).sort(function (a, b) { return a - b; });
    var floor = sorted[Math.floor(n * 0.1)] || -80, thr = floor + [0, 6, 8, 10][strength], cut = [0, 8, 14, 22][strength];
    var g = new Float32Array(n), cur = 1;
    for (f = 0; f < n; f++) {
      var target = dbs[f] >= thr ? 1 : Math.pow(10, -cut * Math.min(1, (thr - dbs[f]) / 6) / 20);
      // פתיחה מהירה (דיבור לא נחתך), סגירה איטית (בלי "נשימות" קטועות)
      cur = target > cur ? cur + (target - cur) * 0.7 : cur + (target - cur) * 0.08;
      g[f] = cur;
    }
    for (f = 0; f < n; f++) {
      var a = g[f], b = g[Math.min(n - 1, f + 1)];
      for (i = 0; i < F; i++) data[f * F + i] *= a + (b - a) * (i / F);
    }
    return { floor: floor };
  }
  function compress(buffer) {
    var oc = new OAC(1, buffer.length, RATE), s = oc.createBufferSource(); s.buffer = buffer;
    var c = oc.createDynamicsCompressor(); c.threshold.value = -26; c.knee.value = 8; c.ratio.value = 3.5; c.attack.value = 0.006; c.release.value = 0.25;
    s.connect(c); c.connect(oc.destination); s.start();
    return oc.startRendering();
  }
  function normalize(d) { var p = 0; for (var i = 0; i < d.length; i++) { var v = Math.abs(d[i]); if (v > p) p = v; } var k = p ? 0.89 / p : 1; for (i = 0; i < d.length; i++) d[i] *= k; }
  function wav(d) {
    var b = new ArrayBuffer(44 + d.length * 2), v = new DataView(b), w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + d.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, d.length * 2, true);
    for (var i = 0, o = 44; i < d.length; i++, o += 2) { var x = Math.max(-1, Math.min(1, d[i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
    return new Blob([b], { type: 'audio/wav' });
  }

  $('kn-go').addEventListener('click', function () {
    if (!src || !A || !OAC) { msg('הדפדפן הזה לא תומך בעיבוד קול. נסו בכרום.'); return; }
    var b = this, pg = $('kn-prog'), strength = parseInt($('kn-strength').value, 10) || 2, ac = new A();
    b.disabled = true; pg.hidden = false; pg.value = 0.1; msg('קורא את ההקלטה…');
    src.blob.arrayBuffer().then(function (ab) { return ac.decodeAudioData(ab); })
      .then(function (buf) { pg.value = 0.35; msg('מסנן זמזום ורעש… (' + Math.round(buf.duration / 60) + ' דק\')'); return filterPass(buf); })
      .then(function (f) { pg.value = 0.6; var info = gate(f.getChannelData(0), strength); msg('משווה עוצמות…'); return compress(f).then(function (c) { return { c: c, info: info }; }); })
      .then(function (r) {
        pg.value = 0.9; var d = r.c.getChannelData(0); normalize(d);
        out = wav(d);
        $('kn-before').src = URL.createObjectURL(src.blob); $('kn-after').src = URL.createObjectURL(out);
        $('kn-out').hidden = false; pg.hidden = true; b.disabled = false; ac.close();
        msg('מוכן. שומעים "לפני" ו"אחרי", ושומרים. (רעש רקע מקורי: ' + Math.round(r.info.floor) + ' dB)');
        used('clean', { strength: strength, mins: Math.round(r.c.duration / 60) });
      })
      .catch(function (e) { pg.hidden = true; b.disabled = false; msg('לא הצלחתי לקרוא את הקובץ. נסו קובץ אחר (mp3, m4a, wav, או סרטון mp4).'); try { ac.close(); } catch (x) {} });
  });

  function fname() { return src.name + ' - קול נקי.wav'; }
  function download() { var a = document.createElement('a'); a.href = URL.createObjectURL(out); a.download = fname(); document.body.appendChild(a); a.click(); a.remove(); }
  $('kn-dl').addEventListener('click', function () { if (out) { download(); used('download'); } });
  $('kn-share').addEventListener('click', function () {
    if (!out) return;
    var f = new File([out], fname(), { type: 'audio/wav' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).then(function () { used('share'); }).catch(function () {});
    else download();
  });
})();
