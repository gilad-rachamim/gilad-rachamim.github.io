/* מטרונום: תזמון מדויק ב-Web Audio, הקשת קצב, משקלים */
(function () {
  var $ = function (i) { return document.getElementById(i); };
  var bpm = 100, beats = 4, ctx = null, on = false, next = 0, n = 0, timer = null, lock = null, taps = [];
  var NAMES = [[40, 'גראבה: איטי מאוד'], [60, 'לרגו: איטי ורחב'], [76, 'אדג\'ו: איטי ורגוע'], [108, 'אנדנטה: קצב הליכה'], [120, 'מודראטו: בינוני'], [156, 'אלגרו: מהיר ועליז'], [176, 'ויואצ\'ה: מהיר ותוסס'], [400, 'פרסטו: מהיר מאוד']];
  try { var s = JSON.parse(localStorage.getItem('kelim_metronom') || '{}'); if (s.bpm) bpm = s.bpm; if (s.beats) beats = s.beats; } catch (e) {}
  function save() { try { localStorage.setItem('kelim_metronom', JSON.stringify({ bpm: bpm, beats: beats })); } catch (e) {} }
  function name() { for (var i = 0; i < NAMES.length; i++) if (bpm <= NAMES[i][0]) return NAMES[i][1]; return ''; }
  function dots() { var h = ''; for (var i = 0; i < beats; i++) h += '<i></i>'; $('mt-dots').innerHTML = h; }
  function show() {
    $('mt-bpm').textContent = bpm; $('mt-range').value = bpm; $('mt-name').textContent = name();
    [].forEach.call(document.querySelectorAll('#mt-sig button'), function (b) { b.setAttribute('aria-pressed', String(+b.dataset.b === beats)); });
  }
  function set(v) { bpm = Math.max(30, Math.min(240, Math.round(v))); show(); save(); }
  function click(t, first) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = first ? 1500 : 1000; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(first ? 0.9 : 0.6, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.start(t); o.stop(t + 0.07);
  }
  function light(i, delay) {
    setTimeout(function () {
      var d = $('mt-dots').children; for (var k = 0; k < d.length; k++) d[k].className = '';
      if (d[i]) d[i].className = 'on' + (i === 0 ? ' first' : '');
    }, Math.max(0, delay * 1000));
  }
  function sched() {
    while (next < ctx.currentTime + 0.12) {
      var i = n % beats; click(next, i === 0 && beats > 1); light(i, next - ctx.currentTime);
      next += 60 / bpm; n++;
    }
  }
  function start() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    on = true; n = 0; next = ctx.currentTime + 0.08; timer = setInterval(sched, 25); sched();
    $('mt-go').textContent = '⏸ לעצור'; $('mt-go').setAttribute('aria-pressed', 'true');
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {});
  }
  function stop() {
    on = false; clearInterval(timer); $('mt-go').textContent = '▶ להפעיל'; $('mt-go').setAttribute('aria-pressed', 'false');
    if (lock) { lock.release().catch(function () {}); lock = null; }
    var d = $('mt-dots').children; for (var k = 0; k < d.length; k++) d[k].className = '';
  }
  $('mt-go').addEventListener('click', function () { on ? stop() : start(); });
  $('mt-range').addEventListener('input', function () { set(+this.value); });
  [].forEach.call(document.querySelectorAll('[data-d]'), function (b) { b.addEventListener('click', function () { set(bpm + (+b.dataset.d)); }); });
  [].forEach.call(document.querySelectorAll('#mt-sig button'), function (b) {
    b.addEventListener('click', function () { beats = +b.dataset.b; n = 0; dots(); show(); save(); });
  });
  $('mt-tap').addEventListener('click', function () {
    var t = performance.now(); if (taps.length && t - taps[taps.length - 1] > 2500) taps = [];
    taps.push(t); if (taps.length > 6) taps.shift();
    if (taps.length >= 2) set(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
    $('mt-name').textContent = taps.length < 2 ? 'עוד הקשה…' : name();
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    if (e.code === 'Space') { e.preventDefault(); on ? stop() : start(); }
  });
  document.addEventListener('visibilitychange', function () { if (on && !document.hidden && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {}); });
  dots(); show();
})();
