// קריאת שמע שעל המיטה (/kodesh/shema-al-hamita/): נוסח, מלא/קצר, גודל אות, מסך כהה ומסך שלא נכבה.
// ההעדפות נשמרות בטלפון בלבד (localStorage).
(function () {
  'use strict';
  var paper = document.getElementById('bk-paper');
  if (!paper) return;
  var KEY = 'kodesh-ksh', st = { k: 'sef', l: 'full', fs: 1.35, dark: true };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (x) { st[x] = sv[x]; }); else { var bk = JSON.parse(localStorage.getItem('kodesh-boker') || 'null'); if (bk && bk.n === 'ash') st.k = 'ash'; else if (bk && bk.n === 'em') st.k = 'em'; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function used(how) { try { if (window.toolUsed) window.toolUsed('shema-al-hamita', { how: how }); } catch (e) {} }
  var bk = [].slice.call(document.querySelectorAll('[data-set-k]')), bl = [].slice.call(document.querySelectorAll('[data-set-l]')), dk = document.getElementById('bk-dark');
  function apply() {
    paper.setAttribute('data-k', st.k); paper.setAttribute('data-l', st.l); paper.style.setProperty('--fs', st.fs + 'rem');
    paper.classList.toggle('dark', !!st.dark); dk.setAttribute('aria-pressed', st.dark ? 'true' : 'false');
    bk.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-set-k') === st.k ? 'true' : 'false'); });
    bl.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-set-l') === st.l ? 'true' : 'false'); });
  }
  bk.forEach(function (b) { b.addEventListener('click', function () { st.k = b.getAttribute('data-set-k'); apply(); save(); used('nusach-' + st.k); }); });
  bl.forEach(function (b) { b.addEventListener('click', function () { st.l = b.getAttribute('data-set-l'); apply(); save(); used(st.l); }); });
  document.getElementById('bk-plus').addEventListener('click', function () { st.fs = Math.min(2.4, +(st.fs + 0.15).toFixed(2)); apply(); save(); });
  document.getElementById('bk-minus').addEventListener('click', function () { st.fs = Math.max(1, +(st.fs - 0.15).toFixed(2)); apply(); save(); });
  dk.addEventListener('click', function () { st.dark = !st.dark; apply(); save(); });
  apply();
  var wakeBtn = document.getElementById('bk-wake');
  if ('wakeLock' in navigator && wakeBtn) {
    var wl = null, want = false; wakeBtn.hidden = false;
    function wUi() { wakeBtn.setAttribute('aria-pressed', wl ? 'true' : 'false'); wakeBtn.textContent = wl ? '✓ המסך דולק' : 'המסך לא ייכבה'; }
    function req() { navigator.wakeLock.request('screen').then(function (l) { wl = l; wUi(); l.addEventListener('release', function () { wl = null; wUi(); }); }).catch(function () { wl = null; wUi(); }); }
    wakeBtn.addEventListener('click', function () { want = !want; if (want) { req(); used('wake'); } else if (wl) wl.release(); });
    document.addEventListener('visibilitychange', function () { if (want && !wl && document.visibilityState === 'visible') req(); });
  }
})();
