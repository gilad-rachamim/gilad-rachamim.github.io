// הקטנת סרטון (/kelim/machshev/video/).
// בלי ffmpeg ובלי שרת: מנגנים את הסרטון בשקט, מציירים כל פריים על canvas קטן יותר,
// ומקליטים את ה-canvas (וגם את הקול, דרך AudioContext) עם MediaRecorder בקצב סיביות נמוך.
// לכן זה לוקח בערך כמו אורך הסרטון. WebCodecs היה מהיר יותר, אבל דורש פירוק ובנייה של קובץ MP4
// (ספריות נוספות) ולא נתמך בכל האייפונים, אז נשארנו עם הדרך שעובדת הכי רחב.
// נשמר בטלפון רק הגודל שבחרו (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var inp = $('vd-file');
  if (!inp) return;
  var KEY = 'kelim-machshev-video';
  var SIZES = { 480: { vb: 900000, note: 'הכי קל. מספיק לצפייה בטלפון ולטופס שמגביל גודל.' }, 720: { vb: 1800000, note: 'ברור גם במחשב. שוקל בערך פי שניים מ"קטן".' } };
  var AB = 96000;
  var st = { h: 480, l: 0 };
  var LIMS = [0, 10, 25, 50];
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && SIZES[sv.h]) st.h = sv.h; if (sv && LIMS.indexOf(sv.l) > -1) st.l = sv.l; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  var MIMES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  var mime = null;
  var ok = !!(window.MediaRecorder && window.HTMLCanvasElement && HTMLCanvasElement.prototype.captureStream);
  if (ok) {
    for (var i = 0; i < MIMES.length; i++) { try { if (MediaRecorder.isTypeSupported(MIMES[i])) { mime = MIMES[i]; break; } } catch (e) {} }
    if (!mime) ok = false;
  }
  if (!ok) {
    $('vd-no').hidden = false;
    $('vd-no').textContent = 'הדפדפן הזה לא יודע להקליט סרטון, ולכן הכלי לא יעבוד כאן. ' +
      (/iPhone|iPad/.test(navigator.userAgent) ? 'באייפון זה קורה בגרסאות ישנות של iOS. אפשר לנסות במחשב, בכרום או ב-Edge.' : 'אפשר לנסות בכרום או ב-Edge מעודכנים.');
  }

  var file = null, meta = null, job = null, url = null, result = null;
  function mb(b) { return b >= 1048576 ? (b / 1048576).toFixed(b >= 104857600 ? 0 : 1) + ' מ״ב' : Math.max(1, Math.round(b / 1024)) + ' ק״ב'; }
  function dur(s) { s = Math.round(s); var m = Math.floor(s / 60), r = s % 60; return m ? m + ':' + (r < 10 ? '0' : '') + r + ' דקות' : s + ' שניות'; }
  function msg(t, cls) { var m = $('vd-msg'); m.textContent = t; m.className = cls || ''; }
  function bar(p) { $('vd-barw').hidden = p < 0; $('vd-bar').style.width = Math.max(0, p) + '%'; }
  // תוכנית: גובה, קצב וידאו וקצב קול. עם מגבלה – מחשבים קצב שייכנס, ומורידים רזולוציה אם הקצב נמוך.
  function plan() {
    var p = { h: st.h, vb: SIZES[st.h].vb, ab: AB, tight: false, over: false };
    if (!st.l || !meta) return p;
    var total = st.l * 1048576 * 8 * 0.9 / (meta.d * 1.05);
    if (total < p.vb + p.ab) {
      p.tight = true;
      if (total < 400000) p.ab = 48000;
      p.vb = Math.round(total - p.ab);
      if (p.vb < 500000 && p.h > 480) p.h = 480;
      if (p.vb < 300000) p.h = 360;
      if (p.vb < 120000) { p.vb = 120000; p.over = true; }
    }
    return p;
  }
  function dims(w, h) {
    var short = Math.min(w, h), k = Math.min(1, plan().h / short);
    return { w: Math.round(w * k / 2) * 2, h: Math.round(h * k / 2) * 2 };
  }
  function est() { var p = plan(); return meta ? (p.vb + p.ab) * meta.d / 8 * 1.05 : 0; }
  function drawUI() {
    [].forEach.call($('vd-size').children, function (b) { b.setAttribute('aria-selected', String(+b.getAttribute('data-h') === st.h)); });
    [].forEach.call($('vd-lim').children, function (b) { b.setAttribute('aria-selected', String(+b.getAttribute('data-l') === st.l)); });
    var pl = plan();
    $('vd-snote').textContent = SIZES[st.h].note + (meta ? ' (' + dims(meta.w, meta.h).w + '×' + dims(meta.w, meta.h).h + ')' : '') +
      (pl.over ? ' ⚠️ הסרטון ארוך מדי למגבלה של ' + st.l + ' מ״ב. כדאי לבחור מגבלה גדולה יותר, או לחלק אותו.' : (pl.tight ? ' כדי להיכנס ב-' + st.l + ' מ״ב האיכות תהיה נמוכה יותר.' : ''));
    $('vd-go').hidden = !!job; $('vd-stop').hidden = !job;
    $('vd-go').disabled = !ok || !meta;
    $('vd-go').textContent = result ? 'להקטין שוב' : 'להקטין';
    if (meta) {
      $('vd-time').textContent = dur(meta.d * 1.05 + 2);
      var e = est();
      $('vd-sz').textContent = mb(e);
    }
  }

  function probe(f) {
    return new Promise(function (res, rej) {
      var v = document.createElement('video'), u = URL.createObjectURL(f);
      v.preload = 'metadata'; v.muted = true; v.playsInline = true;
      v.onloadedmetadata = function () {
        var d = v.duration;
        var m = { w: v.videoWidth, h: v.videoHeight, d: d };
        URL.revokeObjectURL(u);
        if (!m.w || !isFinite(d) || !d) rej(new Error('meta')); else res(m);
      };
      v.onerror = function () { URL.revokeObjectURL(u); rej(new Error('decode')); };
      v.src = u;
    });
  }

  function start() {
    if (!ok || !meta || job) return;
    if (url) { URL.revokeObjectURL(url); url = null; }
    result = null; $('vd-out').hidden = true;
    var j = job = { stop: false };
    var u = URL.createObjectURL(file);
    var v = document.createElement('video');
    v.src = u; v.playsInline = true; v.preload = 'auto';
    var sz = dims(meta.w, meta.h), cv = $('vd-cv');
    cv.width = sz.w; cv.height = sz.h; cv.hidden = false;
    var cx = cv.getContext('2d');
    var stream = cv.captureStream(30);
    var ac = null;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      ac = new AC();
      var srcN = ac.createMediaElementSource(v), dest = ac.createMediaStreamDestination();
      srcN.connect(dest); // לא מחברים לרמקולים: הסרטון מתנגן בשקט
      dest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
      if (ac.resume) ac.resume();
    } catch (e) { ac = null; }
    var rec, chunks = [];
    var pl = plan();
    try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: pl.vb, audioBitsPerSecond: pl.ab }); }
    catch (e) { rec = new MediaRecorder(stream); }
    j.rec = rec; j.v = v;
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    function paint() {
      if (j.stop) return;
      if (v.readyState >= 2) cx.drawImage(v, 0, 0, sz.w, sz.h);
      bar(Math.min(99, Math.round(v.currentTime / meta.d * 100)));
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(paint); else requestAnimationFrame(paint);
    }
    function cleanup() {
      document.removeEventListener('visibilitychange', vis);
      try { v.pause(); } catch (e) {}
      v.removeAttribute('src'); v.load(); URL.revokeObjectURL(u);
      stream.getTracks().forEach(function (t) { t.stop(); });
      if (ac && ac.close) ac.close();
      j.stop = true; if (job === j) job = null;
    }
    function vis() {
      if (j.stop) return;
      if (document.hidden) { v.pause(); if (rec.state === 'recording') rec.pause(); msg('הדף ברקע, ההקטנה עצרה. לחזור לדף כדי להמשיך.', 'pd-err'); }
      else { if (rec.state === 'paused') rec.resume(); v.play().catch(function () {}); msg('מקטין… להשאיר את הדף פתוח.'); }
    }
    document.addEventListener('visibilitychange', vis);
    rec.onstop = function () {
      var canceled = j.canceled;
      cleanup(); bar(-1);
      if (canceled) { msg('עצרתי. הסרטון המקורי לא השתנה.'); drawUI(); return; }
      if (j.failed || !chunks.length) { if (!j.failed) msg('ההקלטה לא הצליחה בדפדפן הזה. לנסות במחשב, בכרום או ב-Edge.', 'pd-err'); drawUI(); return; }
      var type = (rec.mimeType || mime).split(';')[0];
      var ext = /mp4/.test(type) ? 'mp4' : 'webm';
      var blob = new Blob(chunks, { type: type });
      var name = (file.name || 'sirton').replace(/\.[^.]+$/, '') + '-katan.' + ext;
      result = { blob: blob, file: new File([blob], name, { type: type }) };
      url = URL.createObjectURL(blob);
      $('vd-dl').href = url; $('vd-dl').setAttribute('download', name);
      $('vd-share').hidden = !canShare([result.file]);
      $('vd-out').hidden = false;
      $('vd-now').innerHTML = '<s>' + mb(file.size) + '</s> ← ' + mb(blob.size);
      var a = file.size, b = blob.size;
      if (st.l && b > st.l * 1048576) msg('הסרטון יצא ' + mb(b) + ', יותר מ-' + st.l + ' מ״ב. כדאי לבחור "קטן", או לחלק את הסרטון לשניים.', 'pd-err');
      else if (b < a) msg('מוכן. חיסכון של ' + Math.round((1 - b / a) * 100) + '%.' + (ext === 'webm' ? ' הקובץ בפורמט WebM: נפתח במחשב ובאנדרואיד, אבל אייפון ישן לא תמיד יפתח אותו.' : ''), 'pd-ok');
      else msg('הסרטון המקורי כבר היה קל יותר. עדיף לשלוח אותו כמו שהוא, או לנסות "קטן".', 'pd-err');
      if (window.toolUsed) window.toolUsed('machshev_video', { how: 'shrink', h: st.h, l: st.l, sec: Math.round(meta.d), ext: ext, pct: Math.round((1 - b / a) * 100) });
      drawUI();
    };
    v.onended = function () { if (rec.state !== 'inactive') { cx.drawImage(v, 0, 0, sz.w, sz.h); setTimeout(function () { try { rec.stop(); } catch (e) {} }, 250); } };
    v.onerror = function () { j.failed = true; try { rec.stop(); } catch (e) {} msg('הדפדפן לא הצליח לנגן את הסרטון הזה, ולכן אי אפשר להקטין אותו כאן.', 'pd-err'); };
    drawUI(); bar(0); msg('מקטין… להשאיר את הדף פתוח והמסך דלוק.');
    v.play().then(function () {
      if (j.stop) return;
      rec.start(1000); paint();
    }).catch(function () {
      cleanup(); bar(-1); drawUI();
      msg('הדפדפן לא נתן לנגן את הסרטון. ללחוץ שוב על "להקטין".', 'pd-err');
    });
  }
  function canShare(fl) { try { return !!(navigator.canShare && navigator.canShare({ files: fl })); } catch (e) { return false; } }

  inp.addEventListener('change', function () {
    var f = inp.files && inp.files[0];
    if (!f) return;
    if (job) { job.canceled = true; try { job.rec.stop(); } catch (e) {} }
    file = f; meta = null; result = null;
    $('vd-box').hidden = false; $('vd-out').hidden = true; $('vd-cv').hidden = true; bar(-1);
    $('vd-name').textContent = f.name; $('vd-now').textContent = mb(f.size);
    $('vd-time').textContent = '–'; $('vd-sz').textContent = '–';
    msg('בודק את הסרטון…');
    probe(f).then(function (m) {
      if (file !== f) return;
      meta = m;
      var e = est();
      msg(dur(m.d) + ', ' + m.w + '×' + m.h + '.' + (e >= f.size * 0.9 ? ' הסרטון כבר די קל, ייתכן שלא יהיה חיסכון.' : '') + (m.d > 900 ? ' סרטון ארוך: עדיף במחשב, והמסך חייב להישאר דלוק כל הזמן.' : ''));
      drawUI();
    }).catch(function () {
      if (file !== f) return;
      msg('הדפדפן לא מצליח לפתוח את הסרטון הזה. ' + (/\.(mov|hevc)$/i.test(f.name) ? 'סרטון MOV מאייפון נפתח לפעמים רק בספארי או במחשב Mac.' : 'לנסות סרטון אחר, או בדפדפן אחר.'), 'pd-err');
      drawUI();
    });
  });
  $('vd-go').addEventListener('click', start);
  $('vd-stop').addEventListener('click', function () { if (job) { job.canceled = true; try { job.rec.stop(); } catch (e) {} } });
  $('vd-size').addEventListener('click', function (e) { var b = e.target.closest('[data-h]'); if (!b || job) return; st.h = +b.getAttribute('data-h'); save(); drawUI(); });
  $('vd-lim').addEventListener('click', function (e) { var b = e.target.closest('[data-l]'); if (!b || job) return; st.l = +b.getAttribute('data-l'); save(); drawUI(); });
  $('vd-dl').addEventListener('click', function () { if (window.toolUsed) window.toolUsed('machshev_video', { how: 'download' }); });
  $('vd-share').addEventListener('click', function () {
    if (!result) return;
    navigator.share({ files: [result.file] }).catch(function () {});
    if (window.toolUsed) window.toolUsed('machshev_video', { how: 'share' });
  });
  drawUI();
})();
