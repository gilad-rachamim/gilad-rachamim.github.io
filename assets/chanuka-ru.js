/* Благословения Хануки (русский) – /kodesh/chanuka/ru/ : сегодняшний вечер, ханукия, благословение первого вечера, крупный шрифт. */
(function () {
  'use strict';
  // Вечер первой свечи (24 кислева), посчитан по еврейскому календарю.
  var FIRST = ['2026-12-04', '2027-12-24', '2028-12-12', '2029-12-01', '2030-12-20', '2031-12-09', '2032-11-27', '2033-12-16', '2034-12-06', '2035-12-25'];
  var ORD = ['', 'первую', 'вторую', 'третью', 'четвёртую', 'пятую', 'шестую', 'седьмую', 'восьмую'];
  var $ = function (id) { return document.getElementById(id); };
  var usedOnce = false;
  function used(how) { if (!usedOnce && window.toolUsed) { usedOnce = true; window.toolUsed('chanuka_ru', { how: how }); } }
  function ymd(d) { return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); }
  function parse(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function longDate(u) { return u.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); }
  function candles(n) { return n + (n === 1 ? ' свеча' : (n < 5 ? ' свечи' : ' свечей')); }

  // Какой вечер сегодня (1..8) или 0, и ближайший первый вечер.
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
    // Свечи ставят справа налево; шамаш стоит посередине, выше остальных.
    for (var k = 8; k >= 1; k--) {
      if (k === 4) h += '<span class="ch-c on sh" title="Шамаш"></span>';
      h += '<span class="ch-c' + (k <= n ? ' on' : '') + '"></span>';
    }
    m.innerHTML = h;
    m.setAttribute('aria-label', 'Ханукия: ' + candles(n) + ' и шамаш');
    var c = $('ch-count');
    if (c) c.textContent = candles(n) + ' и шамаш. Благословения: ' + (n === 1 ? 'все три, включая «Шехехьяну».' : 'первые два («Шехехьяну» говорят только в первый вечер).');
    var b3 = $('b3'); if (b3) b3.classList.toggle('off', n !== 1);
    var btns = document.querySelectorAll('#ch-pick [data-n]');
    for (var j = 0; j < btns.length; j++) btns[j].setAttribute('aria-pressed', String(+btns[j].getAttribute('data-n') === n));
  }

  function init() {
    var t = tonight(), line = $('ch-night'), n = 1;
    if (t.n) {
      n = t.n;
      line.textContent = 'Сегодня вечером зажигаем ' + ORD[n] + ' свечу Хануки' + (n === 8 ? ' – последний вечер.' : '.');
    } else if (t.next) {
      line.textContent = 'Ханука начинается вечером, ' + longDate(t.next) + ' (ниже – первый вечер).';
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
      try { localStorage.setItem('chanuka-ru-big', on ? '1' : ''); } catch (e) {}
      if (on) { var b1 = $('b1'); if (b1) b1.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      used('big');
    });
    try { if (big && localStorage.getItem('chanuka-ru-big') === '1') { document.body.classList.add('ch-big'); big.setAttribute('aria-pressed', 'true'); } } catch (e) {}
    var wa = $('ch-wa');
    if (wa) wa.addEventListener('click', function () {
      wa.href = 'https://wa.me/?text=' + encodeURIComponent('Благословения Хануки на иврите, с транслитерацией русскими буквами: https://hakelim.com/kodesh/chanuka/ru/');
      used('wa');
    });
    var pr = $('ch-print');
    if (pr) pr.addEventListener('click', function () { used('print'); window.print(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
