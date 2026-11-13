// טיימר חופשי לכל משך ושעון עצר (/limudim/timer/ ו-/limudim/shaon-etzer/).
// טיימר הפומודורו עצמו נשאר ב-limudim.js (studyTimer). כאן: לשוניות, טיימר, שעון עצר.
// הכול מחושב לפי השעון (Date.now), ולכן הזמן נכון גם אם הדף "נרדם" או נטען מחדש. המצב נשמר ב-localStorage.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function load(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function used(extra) { if (window.toolUsed) window.toolUsed(document.body.getAttribute('data-tool') || 'timer', extra); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var BASE_TITLE = window.__baseTitle = window.__baseTitle || document.title, audio = null, wakeLock = null;
  function ctx() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {} return audio; }
  function beep(times) {
    var a = ctx(); if (!a) return;
    try {
      for (var i = 0; i < times; i++) {
        [0, .22, .44].forEach(function (t, j) {
          var at = a.currentTime + i * 1.1 + t, o = a.createOscillator(), g = a.createGain();
          o.type = 'sine'; o.frequency.value = [880, 880, 1175][j];
          g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.4, at + .02); g.gain.exponentialRampToValueAtTime(0.0001, at + .2);
          o.connect(g); g.connect(a.destination); o.start(at); o.stop(at + .22);
        });
      }
    } catch (e) {}
  }
  function wake(on) {
    try {
      if (on && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        if (!wakeLock) navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; w.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {});
      } else if (!on && wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
    } catch (e) {}
  }
  function notify(title, text) {
    if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var opt = { body: text, icon: '/assets/icon-limudim-192.png', tag: 'limudim-shaon', renotify: true };
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.showNotification(title, opt); else new Notification(title, opt); }).catch(function () {});
      else new Notification(title, opt);
    } catch (e) {}
  }
  function fullBtn(b) {
    if (!b) return;
    b.addEventListener('click', function () {
      var on = document.body.classList.toggle('focus-mode');
      document.querySelectorAll('[data-full]').forEach(function (x) { x.textContent = on ? 'לצאת ממסך מלא' : 'מסך מלא'; });
      if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
      else if (!on && document.fullscreenElement) document.exitFullscreen().catch(function () {});
      window.scrollTo(0, 0);
    });
  }
  var running = { ft: false, sw: false };
  var titled = false;  // מחזירים את כותרת הדף רק אם אנחנו שינינו אותה (גם הפומודורו כותב בה את הזמן)
  function title(txt) {
    if (txt) { document.title = txt + ' · ' + BASE_TITLE.split(/[:|]/)[0].trim(); titled = true; }
    else if (titled) { document.title = BASE_TITLE; titled = false; }
  }

  // =====================================================================
  // 1. טיימר חופשי
  // =====================================================================
  function freeTimer() {
    var K = 'limudim-ft', st = load(K, null), tick = null;
    if (!st || !st.len) st = { len: 5 * 60000, left: 5 * 60000, endAt: 0, running: false, done: false, label: '', sound: true };
    var clock = $('ft-clock'), go = $('ft-go');
    function persist() { save(K, st); }
    function remaining() { return st.running ? Math.max(0, st.endAt - Date.now()) : st.left; }
    function fmt(ms) {
      var s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
      return h ? h + ':' + pad(m) + ':' + pad(s % 60) : pad(m) + ':' + pad(s % 60);
    }
    function words(ms) {
      var s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60, a = [];
      if (h) a.push(h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : h + ' שעות');
      if (m) a.push(m === 1 ? 'דקה' : m + ' דקות');
      if (x) a.push(x === 1 ? 'שנייה' : x + ' שניות');
      return a.join(' ו') .replace(/ ו(\d)/g, ' ו-$1') || '0 שניות';
    }
    function fields() {
      var s = Math.round(st.len / 1000);
      $('ft-h').value = Math.floor(s / 3600) || ''; $('ft-m').value = Math.floor(s % 3600 / 60) || ''; $('ft-s').value = s % 60 || '';
      document.querySelectorAll('[data-mins]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-mins') * 60000 === st.len); });
    }
    function paint() {
      var ms = remaining(), txt = fmt(ms);
      $('ft-t').textContent = txt;
      $('ft-t').classList.toggle('long', txt.length > 5);
      clock.classList.toggle('brk', !!st.done);
      $('ft-lbl').textContent = st.done ? '⏰ הזמן נגמר!' : (st.label || 'טיימר של ' + words(st.len));
      $('ft-ring').style.width = (st.len ? 100 - ms * 100 / st.len : 0) + '%';
      go.textContent = st.running ? 'להשהות ⏸' : st.done ? 'עוד פעם ▶' : (ms < st.len ? 'להמשיך ▶' : 'להתחיל ▶');
      running.ft = st.running;
      if (st.running) title(txt); else if (st.done) title('⏰ הזמן נגמר'); else if (!running.sw) title('');
    }
    function finish() {
      st.running = false; st.left = 0; st.done = true; persist(); wake(false);
      if (st.sound) beep(4);
      notify('הטיימר נגמר', st.label || 'עברו ' + words(st.len) + '.');
      $('ft-live').textContent = 'הזמן נגמר' + (st.label ? ': ' + st.label : '');
      used({ action: 'ft_done', mins: Math.round(st.len / 60000) });
    }
    function loop() { if (st.running && remaining() <= 0) finish(); paint(); }
    function start() {
      if (st.done || st.left <= 0) { st.left = st.len; st.done = false; }
      st.endAt = Date.now() + st.left; st.running = true; persist(); wake(true); ctx();
      if (!tick) tick = setInterval(loop, 250);
      $('ft-live').textContent = 'הטיימר התחיל: ' + words(st.left);
    }
    function pause() { st.left = remaining(); st.running = false; persist(); wake(false); }
    function setLen(ms, keepFields) {
      ms = Math.max(1000, Math.min(ms, 99 * 3600000));
      st.len = ms; st.left = ms; st.running = false; st.done = false; st.endAt = 0; persist(); wake(false);
      if (!keepFields) fields(); else document.querySelectorAll('[data-mins]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-mins') * 60000 === st.len); });
      paint();
    }
    go.addEventListener('click', function () {
      if (st.running) pause(); else { var fresh = st.done || remaining() >= st.len; start(); if (fresh) used({ action: 'ft_start', mins: Math.round(st.len / 60000) }); }
      paint();
    });
    $('ft-reset').addEventListener('click', function () { setLen(st.len); $('ft-live').textContent = 'הטיימר אופס'; });
    $('ft-plus').addEventListener('click', function () {
      if (st.running) { st.endAt += 60000; st.len += 60000; } else { st.left = (st.done ? 0 : st.left) + 60000; st.len = Math.max(st.len, st.left); st.done = false; }
      persist(); paint();
    });
    document.querySelectorAll('[data-mins]').forEach(function (b) {
      b.addEventListener('click', function () { setLen(+b.getAttribute('data-mins') * 60000); });
    });
    ['ft-h', 'ft-m', 'ft-s'].forEach(function (id) {
      $(id).addEventListener('input', function () {
        var ms = ((+$('ft-h').value || 0) * 3600 + (+$('ft-m').value || 0) * 60 + (+$('ft-s').value || 0)) * 1000;
        if (ms > 0) setLen(ms, true);
      });
    });
    $('ft-label').value = st.label || '';
    $('ft-label').addEventListener('input', function () { st.label = this.value.trim().slice(0, 60); persist(); paint(); });
    $('ft-sound').checked = st.sound !== false;
    $('ft-sound').addEventListener('change', function () { st.sound = this.checked; persist(); if (this.checked) beep(1); });
    var nb = $('ft-notif');
    if (nb) {
      if (!('Notification' in window)) nb.hidden = true;
      else if (Notification.permission === 'granted') nb.textContent = 'התראות פעילות ✓';
      nb.addEventListener('click', function () { Notification.requestPermission().then(function (p) { nb.textContent = p === 'granted' ? 'התראות פעילות ✓' : 'ההתראות חסומות. אפשר לאשר בהגדרות הדפדפן'; }); });
    }
    // קישור עם משך מוכן: /limudim/timer/#t=10 (דקות) או #t=1:30 (דקה וחצי)
    var hm = /[#&]t=(\d{1,3})(?::(\d{1,2}))?/.exec(location.hash);
    if (hm && !st.running) setLen((+hm[1] * 60 + (+hm[2] || 0)) * 1000);
    // דפי משך קבוע (/limudim/timer/5-dakot/ וכו', 13.11.2026): data-preset בשניות על #ft-clock
    var pre = +($('ft-clock').getAttribute('data-preset') || 0);
    if (pre && !hm && !st.running) setLen(pre * 1000);
    fields(); paint();
    if (st.running) { if (remaining() <= 0) finish(); else { tick = setInterval(loop, 250); wake(true); } paint(); }
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { if (st.running) wake(true); loop(); } });
  }

  // =====================================================================
  // 2. שעון עצר
  // =====================================================================
  function stopwatch() {
    var K = 'limudim-sw', st = load(K, null), raf = 0, iv = null;
    if (!st) st = { acc: 0, startAt: 0, running: false, laps: [] };
    function persist() { save(K, st); }
    function elapsed() { return st.acc + (st.running ? Date.now() - st.startAt : 0); }
    function parts(ms) {
      var cs = Math.floor(ms / 10), s = Math.floor(cs / 100), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
      return [(h ? h + ':' : '') + pad(m) + ':' + pad(s % 60), pad(cs % 100)];
    }
    function fmt(ms) { var p = parts(ms); return p[0] + '.' + p[1]; }
    function paintTime() {
      var ms = elapsed(), p = parts(ms);
      $('sw-main').textContent = p[0]; $('sw-cs').textContent = '.' + p[1];
      if (st.running) title(p[0]);
    }
    function paint() {
      paintTime();
      var ms = elapsed();
      $('sw-go').textContent = st.running ? 'לעצור ⏸' : (ms ? 'להמשיך ▶' : 'להתחיל ▶');
      $('sw-lap').disabled = !st.running;
      $('sw-reset').disabled = st.running || !ms;
      $('sw-lbl').textContent = st.running ? 'רץ…' : (ms ? 'נעצר' : 'שעון עצר');
      var box = $('sw-laps');
      if (!st.laps.length) box.innerHTML = '';
      else {
        var prev = 0, rows = st.laps.map(function (t, i) { var r = '<tr><th scope="row">' + (i + 1) + '</th><td>' + fmt(t - prev) + '</td><td>' + fmt(t) + '</td></tr>'; prev = t; return r; });
        box.innerHTML = '<table class="sw-tbl"><thead><tr><th scope="col">הקפה</th><th scope="col">זמן ההקפה</th><th scope="col">זמן כולל</th></tr></thead><tbody>' + rows.reverse().join('') + '</tbody></table>';
      }
      $('sw-share').hidden = st.running || !ms;
      running.sw = st.running;
      if (!st.running && !running.ft) title('');
    }
    function frame() { if (!st.running) return; paintTime(); raf = requestAnimationFrame(frame); }
    function run() { cancelAnimationFrame(raf); clearInterval(iv); if (st.running) { raf = requestAnimationFrame(frame); iv = setInterval(paintTime, 200); } }
    $('sw-go').addEventListener('click', function () {
      if (st.running) { st.acc = elapsed(); st.running = false; wake(false); $('sw-live').textContent = 'שעון העצר נעצר על ' + fmt(st.acc); }
      else { if (!st.acc) used({ action: 'sw_start' }); st.startAt = Date.now(); st.running = true; wake(true); $('sw-live').textContent = 'שעון העצר רץ'; }
      persist(); run(); paint();
    });
    $('sw-lap').addEventListener('click', function () {
      if (!st.running || st.laps.length >= 200) return;
      st.laps.push(elapsed()); persist(); paint();
      $('sw-live').textContent = 'הקפה ' + st.laps.length + ': ' + fmt(st.laps[st.laps.length - 1] - (st.laps[st.laps.length - 2] || 0));
      if (st.laps.length === 1) used({ action: 'sw_lap' });
    });
    $('sw-reset').addEventListener('click', function () { st = { acc: 0, startAt: 0, running: false, laps: [] }; persist(); run(); paint(); $('sw-live').textContent = 'שעון העצר אופס'; });
    function text() {
      var prev = 0, t = 'שעון עצר: ' + fmt(elapsed());
      if (st.laps.length) t += '\n' + st.laps.map(function (x, i) { var r = 'הקפה ' + (i + 1) + ': ' + fmt(x - prev) + ' (סה״כ ' + fmt(x) + ')'; prev = x; return r; }).join('\n');
      return t + '\n\nשעון עצר בחינם: ' + location.origin + '/limudim/shaon-etzer/';
    }
    $('sw-wa').addEventListener('click', function () { this.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text()); used({ action: 'sw_wa' }); });
    $('sw-copy').addEventListener('click', function () {
      var b = this;
      (navigator.clipboard ? navigator.clipboard.writeText(text()) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
    });
    run(); paint();
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { if (st.running) wake(true); paint(); } });
  }

  // =====================================================================
  // 3. לשוניות: טיימר / שעון עצר / פומודורו
  // =====================================================================
  function tabs() {
    var btns = document.querySelectorAll('[data-kind]');
    if (!btns.length) return;
    var kinds = ['ft', 'sw', 'pomo'], K = 'limudim-timer-kind';
    function show(k, user) {
      if (kinds.indexOf(k) < 0) k = 'ft';
      kinds.forEach(function (x) { var el = $('tk-' + x); if (el) el.hidden = x !== k; });
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-kind') === k); });
      if (user) { save(K, k); used({ action: 'kind', kind: k }); try { history.replaceState(null, '', location.pathname + location.search + (k === 'ft' ? '' : '#' + (k === 'sw' ? 'shaon-etzer' : 'pomodoro'))); } catch (e) {} }
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-kind'), true); }); });
    var h = location.hash, first = load(K, null);
    // מי שכבר לומד עם הפומודורו (יש לו סבבים שמורים) ממשיך לראות אותו ראשון
    if (!first) first = (load('limudim-timer-log', null) || (load('limudim-timer', null) || {}).running) ? 'pomo' : 'ft';
    if ($('ft-clock') && $('ft-clock').getAttribute('data-preset')) first = 'ft';
    if (/shaon-etzer|stopwatch/.test(h)) first = 'sw'; else if (/pomodoro/.test(h)) first = 'pomo'; else if (/[#&]t=\d/.test(h)) first = 'ft';
    show(first, false);
  }

  if ($('ft-clock')) freeTimer();
  if ($('sw-clock')) stopwatch();
  tabs();
  document.querySelectorAll('[data-full]').forEach(fullBtn);
})();
