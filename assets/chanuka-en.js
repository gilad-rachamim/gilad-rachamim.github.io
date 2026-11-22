/* Hanukkah blessings (English) – /kodesh/chanuka/en/ : tonight's night, menorah, first-night blessing, big print. */
(function () {
  'use strict';
  // Evening of the first candle (24 Kislev), computed with Intl hebrew calendar.
  var FIRST = ['2026-12-04', '2027-12-24', '2028-12-12', '2029-12-01', '2030-12-20', '2031-12-09', '2032-11-27', '2033-12-16', '2034-12-06', '2035-12-25'];
  var ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
  var $ = function (id) { return document.getElementById(id); };
  var usedOnce = false;
  function used(how) { if (!usedOnce && window.toolUsed) { usedOnce = true; window.toolUsed('chanuka_en', { how: how }); } }
  function ymd(d) { return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); }
  function parse(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function longDate(u) { return u.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); }

  // Night lit this evening (1..8) or 0, plus the next first evening.
  function tonight() {
    var today = ymd(new Date());
    for (var i = 0; i < FIRST.length; i++) {
      var f = parse(FIRST[i]);
      var diff = Math.round((today - f) / 864e5);
      if (diff >= 0 && diff <= 7) return { n: diff + 1, first: f };
      if (diff < 0) return { n: 0, next: f };
    }
    return { n: 0 };
  }

  function drawMenorah(n) {
    var m = $('ch-men'); if (!m) return;
    var h = '';
    // Candles are placed from right to left; the shamash stands in the middle, taller.
    for (var k = 8; k >= 1; k--) {
      if (k === 4) h += '<span class="ch-c on sh" title="Shamash"></span>';
      h += '<span class="ch-c' + (k <= n ? ' on' : '') + '"></span>';
    }
    m.innerHTML = h;
    m.setAttribute('aria-label', 'Menorah with ' + n + ' candle' + (n > 1 ? 's' : '') + ' and the shamash lit');
    var c = $('ch-count');
    if (c) c.textContent = n + ' candle' + (n > 1 ? 's' : '') + ' + the shamash. Blessings: ' + (n === 1 ? 'all three, including Shehecheyanu.' : 'the first two (Shehecheyanu is said on the first night only).');
    var b3 = $('b3'); if (b3) b3.classList.toggle('off', n !== 1);
    var btns = document.querySelectorAll('#ch-pick [data-n]');
    for (var j = 0; j < btns.length; j++) btns[j].setAttribute('aria-pressed', String(+btns[j].getAttribute('data-n') === n));
  }

  function init() {
    var t = tonight(), line = $('ch-night'), n = 1;
    if (t.n) {
      n = t.n;
      line.textContent = 'Tonight light the ' + ORD[n] + ' candle of Hanukkah' + (n === 8 ? ' – the last night.' : '.');
    } else if (t.next) {
      line.textContent = 'Hanukkah begins on the evening of ' + longDate(t.next) + '. Below: the first night.';
    }
    drawMenorah(n);

    var pick = $('ch-pick');
    if (pick) pick.addEventListener('click', function (e) {
      var b = e.target.closest('[data-n]'); if (!b) return;
      drawMenorah(+b.getAttribute('data-n')); used('night');
    });
    var big = $('ch-big');
    if (big) big.addEventListener('click', function () {
      var on = document.body.classList.toggle('ch-big');
      big.setAttribute('aria-pressed', String(on));
      try { localStorage.setItem('chanuka-en-big', on ? '1' : ''); } catch (e) {}
      if (on) { var b1 = $('b1'); if (b1) b1.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      used('big');
    });
    try { if (localStorage.getItem('chanuka-en-big') === '1') { document.body.classList.add('ch-big'); big.setAttribute('aria-pressed', 'true'); } } catch (e) {}
    var wa = $('ch-wa');
    if (wa) wa.addEventListener('click', function () {
      wa.href = 'https://wa.me/?text=' + encodeURIComponent('Hanukkah blessings in Hebrew, transliteration and English: https://hakelim.com/kodesh/chanuka/en/');
      used('wa');
    });
    var pr = $('ch-print');
    if (pr) pr.addEventListener('click', function () { used('print'); window.print(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
