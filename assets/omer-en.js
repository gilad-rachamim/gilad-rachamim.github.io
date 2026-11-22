/* Omer count (English) – /kodesh/omer/en/ : tonight's count from the Hebrew date, nusach, what to show, big print, share, print. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var usedOnce = false;
  function used(how) { if (!usedOnce && window.toolUsed) { usedOnce = true; window.toolUsed('omer_en', { how: how }); } }

  /* Hebrew calendar helpers (same logic as /assets/omer-avot.js) */
  var fEn = null;
  try { fEn = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long' }); } catch (e) {}
  function hp(d) { var o = {}; fEn.formatToParts(d).forEach(function (p) { o[p.type] = p.value; }); return o; }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); }
  function dayOnly(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }
  function nisan16(y) {
    for (var d = new Date(y, 2, 10, 12); d.getMonth() < 5; d = addDays(d, 1)) {
      var p = hp(d); if (/^Nisan/.test(p.month) && +p.day === 16) return d;
    }
    return null;
  }
  function pickStart(now) {
    var s = nisan16(now.getFullYear());
    if (s && dayOnly(now) > addDays(s, 48)) s = nisan16(now.getFullYear() + 1);
    return s;
  }
  var fDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  var current = 0;
  function showDay(n, title, sub) {
    var box = $('om-tn-box'), src = $('day-' + n);
    $('om-tn-title').textContent = title;
    if (sub) $('om-tn-sub').textContent = sub;
    box.innerHTML = '';
    var marks = document.querySelectorAll('.om-d.om-now');
    for (var i = 0; i < marks.length; i++) marks[i].classList.remove('om-now');
    if (!src) return;
    current = n;
    src.classList.add('om-now');
    var bl = $('om-bless');
    if (bl) { var b = bl.cloneNode(true); b.removeAttribute('id'); box.appendChild(b); }
    var c = src.cloneNode(true);
    c.removeAttribute('id'); c.classList.remove('om-now');
    box.appendChild(c);
  }

  function tonight() {
    var m = /^#day-(\d{1,2})$/.exec(location.hash);
    if (m && +m[1] >= 1 && +m[1] <= 49) {
      showDay(+m[1], 'Day ' + m[1] + ' of the omer', 'You opened day ' + m[1] + ' from a link. Tonight\'s count by the date is shown when you open the page without a day number.');
      return;
    }
    if (!fEn) { $('om-tn-title').textContent = 'Choose the day in the list below.'; return; }
    var now = new Date(), today = dayOnly(now), start = pickStart(now);
    if (!start) { $('om-tn-title').textContent = 'Choose the day in the list below.'; return; }
    var n = Math.round((today - start) / 864e5) + 2; /* the count said this evening */
    if (n < 1) {
      var eve = addDays(start, -1), left = Math.round((eve - today) / 864e5);
      $('om-tn-title').textContent = 'The omer count begins on the evening of ' + fDate.format(eve) + '.';
      $('om-tn-sub').textContent = (left === 1 ? 'That is tomorrow evening' : 'That is in ' + left + ' days') + ', the second night of Passover. Here is the count of the first night:';
      showDay(1, $('om-tn-title').textContent, null);
      current = 0;
      var d1 = $('day-1'); if (d1) d1.classList.remove('om-now');
      return;
    }
    if (n > 49) {
      showDay(49, 'Today is day 49 of the omer – Shavuot begins this evening.', 'The count is complete. This was the last night\'s count:');
      return;
    }
    showDay(n, 'Tonight is day ' + n + ' of the omer', 'This evening, ' + fDate.format(today) + ', after nightfall. Until nightfall it is still day ' + (n - 1 > 0 ? n - 1 : 0) + (n - 1 > 0 ? '.' : ' – the count has not begun yet.'));
  }

  var MODES = { all: [], tr: ['kd-nohe', 'kd-noen'], he: ['kd-notr', 'kd-noen'], en: ['kd-nohe', 'kd-notr'] };
  function setMode(m) {
    if (!MODES[m]) m = 'all';
    var b = document.body;
    ['kd-nohe', 'kd-notr', 'kd-noen'].forEach(function (c) { b.classList.remove(c); });
    MODES[m].forEach(function (c) { b.classList.add(c); });
    var btns = document.querySelectorAll('#kd-mode [data-m]');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', String(btns[i].getAttribute('data-m') === m));
    try { localStorage.setItem('omer-en-mode', m); } catch (e) {}
  }
  function setNus(n) {
    if (n !== 's') n = 'a';
    document.body.classList.toggle('om-sf', n === 's');
    var btns = document.querySelectorAll('#om-nus [data-n]');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', String(btns[i].getAttribute('data-n') === n));
    try { localStorage.setItem('omer-en-nusach', n); } catch (e) {}
  }

  function init() {
    try { var nn = localStorage.getItem('omer-en-nusach'); if (nn) setNus(nn); } catch (e) {}
    try { var m = localStorage.getItem('omer-en-mode'); if (m) setMode(m); } catch (e) {}
    tonight();
    window.addEventListener('hashchange', tonight);
    var nus = $('om-nus');
    if (nus) nus.addEventListener('click', function (e) {
      var b = e.target.closest('[data-n]'); if (!b) return;
      setNus(b.getAttribute('data-n')); used('nusach');
    });
    var mode = $('kd-mode');
    if (mode) mode.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      setMode(b.getAttribute('data-m')); used('mode');
    });
    var list = document.querySelector('#om-all-h') && document.querySelector('#om-all-h').parentNode;
    if (list) list.addEventListener('click', function (e) {
      var d = e.target.closest('.om-d'); if (!d || e.target.closest('a')) return;
      var n = +d.getAttribute('data-n');
      showDay(n, 'Day ' + n + ' of the omer', 'You chose day ' + n + ' from the list.');
      var t = $('om-tonight'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      used('pick');
    });
    var big = $('kd-big');
    if (big) big.addEventListener('click', function () {
      var on = document.body.classList.toggle('kd-big');
      big.setAttribute('aria-pressed', String(on));
      try { localStorage.setItem('omer-en-big', on ? '1' : ''); } catch (e) {}
      if (on) { var k = $('om-tonight'); if (k) k.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      used('big');
    });
    try { if (big && localStorage.getItem('omer-en-big') === '1') { document.body.classList.add('kd-big'); big.setAttribute('aria-pressed', 'true'); } } catch (e) {}
    var wa = $('kd-wa');
    if (wa) wa.addEventListener('click', function () {
      var url = 'https://hakelim.com/kodesh/omer/en/' + (current ? '#day-' + current : '');
      var txt = current ? 'Tonight is day ' + current + ' of the omer. The count in Hebrew, transliteration and English: ' + url
                        : 'The omer count in Hebrew, transliteration and English: ' + url;
      wa.href = 'https://wa.me/?text=' + encodeURIComponent(txt);
      used('wa');
    });
    var pr = $('kd-print');
    if (pr) pr.addEventListener('click', function () { used('print'); window.print(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
