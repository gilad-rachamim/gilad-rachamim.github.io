// טלפרומפטר שעוקב אחרי הקול (אולפן לרב, כלי קודש).
// זיהוי דיבור: Web Speech API (he-IL). כל תוצאה מושווית ל-5 המילים האחרונות שנאמרו, ומחפשים אותן בטקסט קצת קדימה מהמיקום הנוכחי.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('tp-form'); if (!form) return;
  var stage = $('tp-stage'), box = $('tp-words'), state = $('tp-state'), camEl = $('tp-cam');
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var words = [], spans = [], pos = 0, y = 0, ty = 0, running = false, paused = false, mode = 'voice';
  var rec = null, heard = '', stream = null, mr = null, parts = [], result = null, wake = null, lastT = 0;

  function val(n) { var el = form.querySelector('[name=' + n + ']'); return el ? (el.type === 'checkbox' ? el.checked : el.value) : ''; }
  // השוואה בין מילים: בלי ניקוד, בלי פיסוק, אותיות סופיות כרגילות
  function norm(w) {
    return w.replace(/[֑-ׇ]/g, '').replace(/[^א-תa-zA-Z0-9]/g, '')
      .replace(/ך/g, 'כ').replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ').toLowerCase();
  }
  function lev1(a, b) { // מרחק עריכה של עד 1
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, d = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++d > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return d + (a.length - i) + (b.length - j) <= 1;
  }
  function same(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.length >= 3 && b.length >= 3 && (a.indexOf(b) > -1 || b.indexOf(a) > -1)) return true; // אות שימוש בהתחלה ("והתורה" / "התורה")
    return a.length >= 4 && b.length >= 4 && lev1(a, b);
  }

  function build() {
    var text = val('text').trim() || $('tp-text').placeholder;
    box.innerHTML = ''; spans = []; words = [];
    text.split(/\n/).forEach(function (line, li) {
      if (li) box.appendChild(document.createElement('br'));
      line.split(/\s+/).filter(Boolean).forEach(function (w) {
        var s = document.createElement('span'); s.textContent = w + ' ';
        box.appendChild(s); spans.push(s); words.push(norm(w));
      });
    });
    box.style.fontSize = val('size') + 'px';
    pos = 0; y = ty = 0; mark();
  }
  function mark() {
    for (var i = 0; i < spans.length; i++) spans[i].className = i < pos ? 'done' : i === pos ? 'now' : '';
    // המילה הנוכחית עולה עד הקו המקווקו (34% מגובה המסך)
    if (mode === 'voice' && spans[pos]) ty = Math.max(0, spans[pos].offsetTop - box.offsetTop - window.innerHeight * 0.34 + 8);
  }

  // ---------- התאמה של מה שנאמר למקום בטקסט ----------
  function follow(spoken) {
    var sw = spoken.split(/\s+/).map(norm).filter(Boolean).slice(-5), k = sw.length;
    if (!k) return;
    var best = -1, bestScore = 0, from = Math.max(0, pos - 3), to = Math.min(words.length - 1, pos + 35);
    for (var e = from; e <= to; e++) {
      var sc = 0;
      for (var i = 0; i < k && e - i >= 0; i++) if (same(sw[k - 1 - i], words[e - i])) sc += 1 + (words[e - i].length > 3 ? 0.5 : 0);
      sc -= (e - pos) * 0.02; // עדיפות קלה למקום קרוב
      if (sc > bestScore) { bestScore = sc; best = e; }
    }
    var need = k >= 3 ? 1.9 : 0.9;
    if (best >= 0 && bestScore >= need && best + 1 > pos - 2) { pos = Math.min(words.length - 1, best + 1); mark(); }
  }

  function startVoice() {
    if (!SR) return false;
    rec = new SR(); rec.lang = 'he-IL'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var t = '';
      for (var i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript + ' ';
      heard = t; follow(t);
      state.textContent = '🎙 מקשיב';
    };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { state.textContent = 'אין גישה למיקרופון – עוברים לגלילה קבועה'; mode = 'fixed'; }
    };
    rec.onend = function () { if (running && !paused && mode === 'voice') setTimeout(function () { try { rec.start(); } catch (e) {} }, 250); };
    try { rec.start(); } catch (e) { return false; }
    return true;
  }
  function stopVoice() { if (rec) { var r = rec; rec = null; try { r.onend = null; r.stop(); } catch (e) {} } }

  // ---------- גלילה ----------
  function loop() {
    if (!running) return;
    var now = performance.now(), dt = Math.min(0.1, (now - (lastT || now)) / 1000); lastT = now;
    if (mode === 'fixed' && !paused) {
      ty += dt * parseFloat(val('speed')) * (parseFloat(val('size')) / 42) * 0.8; // רגילה: כ-2 מילים בשנייה
      var mk = window.innerHeight * 0.34;
      while (pos < spans.length - 1 && spans[pos + 1].offsetTop - box.offsetTop - ty < mk) pos++;
      for (var i = Math.max(0, pos - 30); i < Math.min(spans.length, pos + 3); i++) spans[i].className = i < pos ? 'done' : i === pos ? 'now' : '';
    }
    y += (ty - y) * Math.min(1, dt * 6);
    box.style.transform = 'translateY(' + (-y).toFixed(1) + 'px)' + (val('mirror') ? ' scaleX(-1)' : '');
    var done = false, go = function () { if (!done) { done = true; loop(); } };
    requestAnimationFrame(go); setTimeout(go, 40);
  }

  function camera() {
    var c = val('cam'); if (c === 'off' || !navigator.mediaDevices) return Promise.resolve();
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: c === 'rec' })
      .then(function (s) { stream = s; camEl.srcObject = s; camEl.hidden = false; camEl.play(); $('tp-rec').hidden = c !== 'rec'; })
      .catch(function () { state.textContent = 'המצלמה לא נפתחה'; });
  }
  function mime() {
    var l = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
    for (var i = 0; i < l.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(l[i])) return l[i];
    return '';
  }
  function toggleRec() {
    var b = $('tp-rec');
    if (mr && mr.state === 'recording') { mr.stop(); b.textContent = '● לצלם'; return; }
    if (!stream) return;
    parts = []; var m = mime();
    mr = new MediaRecorder(stream, m ? { mimeType: m } : undefined);
    mr.ondataavailable = function (e) { if (e.data.size) parts.push(e.data); };
    mr.onstop = function () {
      var type = (mr.mimeType || 'video/webm').split(';')[0];
      result = { blob: new Blob(parts, { type: type }), ext: type.indexOf('mp4') > -1 ? 'mp4' : 'webm' };
      $('tp-video').src = URL.createObjectURL(result.blob); $('tp-result').hidden = false;
      used('recorded');
    };
    mr.start(1000); b.textContent = '■ לעצור צילום';
  }

  function start() {
    try { localStorage.setItem('kodesh-prompter', JSON.stringify({ text: val('text'), mode: val('mode'), speed: val('speed'), size: val('size'), cam: val('cam'), mirror: val('mirror') })); } catch (e) {}
    mode = val('mode'); if (mode === 'voice' && !SR) mode = 'fixed';
    stage.classList.add('on'); build(); running = true; paused = false; lastT = 0;
    state.textContent = mode === 'voice' ? 'מתחילים לדבר…' : 'גלילה קבועה';
    if (stage.requestFullscreen) stage.requestFullscreen().catch(function () {});
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {});
    camera().then(function () { if (mode === 'voice' && !startVoice()) { mode = 'fixed'; state.textContent = 'גלילה קבועה'; } });
    loop(); used('start');
  }
  function stop() {
    running = false; stopVoice();
    if (mr && mr.state === 'recording') mr.stop();
    if (stream) setTimeout(function () { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }, 300);
    camEl.hidden = true; $('tp-rec').hidden = true; stage.classList.remove('on');
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    if (wake) { wake.release().catch(function () {}); wake = null; }
  }
  function pause() {
    paused = !paused; $('tp-pause').textContent = paused ? '▶ להמשיך' : '⏸ עצירה';
    if (mode === 'voice') { if (paused) stopVoice(); else startVoice(); }
    state.textContent = paused ? 'עצור' : (mode === 'voice' ? '🎙 מקשיב' : 'גלילה קבועה');
  }
  function jump(d) {
    if (mode === 'voice') { pos = Math.max(0, Math.min(words.length - 1, pos + d * 8)); mark(); }
    else ty = Math.max(0, ty + d * 120);
  }

  $('tp-start').addEventListener('click', start);
  $('tp-exit').addEventListener('click', stop);
  $('tp-pause').addEventListener('click', pause);
  $('tp-back').addEventListener('click', function () { jump(-1); });
  $('tp-fwd').addEventListener('click', function () { jump(1); });
  $('tp-rec').addEventListener('click', toggleRec);
  document.addEventListener('keydown', function (e) {
    if (!running) return;
    if (e.key === ' ') { e.preventDefault(); pause(); } else if (e.key === 'Escape') stop();
    else if (e.key === 'ArrowUp') jump(-1); else if (e.key === 'ArrowDown') jump(1);
  });
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && running && stage.requestFullscreen) { /* נשארים בדף גם בלי מסך מלא */ } });

  function fname() { return 'צילום-שיעור.' + (result ? result.ext : 'mp4'); }
  function download() { var a = document.createElement('a'); a.href = URL.createObjectURL(result.blob); a.download = fname(); document.body.appendChild(a); a.click(); a.remove(); }
  $('tp-dl').addEventListener('click', function () { if (result) { download(); used('download'); } });
  $('tp-share').addEventListener('click', function () {
    if (!result) return;
    var f = new File([result.blob], fname(), { type: result.blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).then(function () { used('share'); }).catch(function () {});
    else download();
  });
  function used(how) { if (window.toolUsed) window.toolUsed('prompter', { how: how, mode: mode, cam: val('cam') }); }

  try {
    var s = JSON.parse(localStorage.getItem('kodesh-prompter') || '{}');
    ['text', 'mode', 'speed', 'size', 'cam'].forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && s[k]) el.value = s[k]; });
    if (s.mirror) $('tp-mirror').checked = true;
  } catch (e) {}
  if (!SR) { $('tp-mode').value = 'fixed'; $('tp-mode').querySelector('[value=voice]').textContent = 'לפי הקול (לא נתמך בדפדפן הזה)'; }
  window.__tpFollow = function (t) { follow(t); return pos; }; // לבדיקות
  window.__tpBuild = function () { build(); return words.length; };
})();
