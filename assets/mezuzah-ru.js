/* Мезуза (русский) – /kodesh/mezuzah/en/ : what to show, big print, share, print. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var usedOnce = false;
  function used(how) { if (!usedOnce && window.toolUsed) { usedOnce = true; window.toolUsed('mezuzah_ru', { how: how }); } }
  var MODES = { all: [], tr: ['kd-nohe', 'kd-noen'], he: ['kd-notr', 'kd-noen'], en: ['kd-nohe', 'kd-notr'] };
  function setMode(m) {
    if (!MODES[m]) m = 'all';
    var b = document.body;
    ['kd-nohe', 'kd-notr', 'kd-noen'].forEach(function (c) { b.classList.remove(c); });
    MODES[m].forEach(function (c) { b.classList.add(c); });
    var btns = document.querySelectorAll('#kd-mode [data-m]');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', String(btns[i].getAttribute('data-m') === m));
    try { localStorage.setItem('mezuzah-ru-mode', m); } catch (e) {}
  }
  function init() {
    var mode = $('kd-mode');
    if (mode) mode.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      setMode(b.getAttribute('data-m')); used('mode');
    });
    try { var m = localStorage.getItem('mezuzah-ru-mode'); if (m) setMode(m); } catch (e) {}
    var big = $('kd-big');
    if (big) big.addEventListener('click', function () {
      var on = document.body.classList.toggle('kd-big');
      big.setAttribute('aria-pressed', String(on));
      try { localStorage.setItem('mezuzah-ru-big', on ? '1' : ''); } catch (e) {}
      if (on) { var k = $('kd-text-h'); if (k) k.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      used('big');
    });
    try { if (big && localStorage.getItem('mezuzah-ru-big') === '1') { document.body.classList.add('kd-big'); big.setAttribute('aria-pressed', 'true'); } } catch (e) {}
    var wa = $('kd-wa');
    if (wa) wa.addEventListener('click', function () {
      wa.href = 'https://wa.me/?text=' + encodeURIComponent("Благословение на мезузу на иврите, с транслитерацией русскими буквами: https://hakelim.com/kodesh/mezuzah/ru/");
      used('wa');
    });
    var pr = $('kd-print');
    if (pr) pr.addEventListener('click', function () { used('print'); window.print(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
