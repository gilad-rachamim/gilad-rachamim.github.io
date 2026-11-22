/* דף האלף-בית באנגלית: לחיצה על אות, הקראה בקול עברי של המכשיר, בוחן, ממיר מספרים לאותיות. הכל בדפדפן. */
(function () {
  'use strict';
  var L = window.AB_L || [];
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };

  // הקראה: רק כשיש במכשיר קול עברי
  var heVoice = null;
  function findVoice() {
    if (!('speechSynthesis' in window)) return;
    var vs = speechSynthesis.getVoices() || [];
    for (var i = 0; i < vs.length; i++) if (/^he|^iw/i.test(vs[i].lang)) { heVoice = vs[i]; break; }
  }
  if ('speechSynthesis' in window) { findVoice(); speechSynthesis.onvoiceschanged = findVoice; }
  function say(t) {
    if (!heVoice) return;
    try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); u.voice = heVoice; u.lang = heVoice.lang; u.rate = .85; speechSynthesis.speak(u); } catch (e) {}
  }

  // פרטי אות
  var det = $('ab-det'), grid = $('ab-grid');
  function show(i) {
    var r = L[i]; if (!r || !det) return;
    grid.querySelectorAll('.ab-c').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-i') == i ? 'true' : 'false'); });
    det.innerHTML = '<span class="ab-dg" lang="he">' + r[0] + (r[9] ? ' ' + r[9] : '') + '</span>' +
      '<h3>' + esc(r[1]) + ' <span lang="he">(' + r[5] + ')</span></h3>' +
      '<p><b>Sound:</b> ' + esc(r[3]) + '</p>' +
      '<p><b>Transliteration:</b> ' + esc(r[2]) + ' &nbsp; <b>Number:</b> ' + r[4] + '</p>' +
      '<p><b>Example:</b> <span lang="he" class="ab-tw">' + r[6] + '</span> <i>' + esc(r[7]) + '</i> – ' + esc(r[8]) + '</p>' +
      (r[9] ? '<p><b>At the end of a word:</b> <span lang="he" class="ab-tw">' + r[9] + '</span></p>' : '') +
      (heVoice ? '<p><button type="button" class="btn btn-line btn-sm" id="ab-say">🔊 Hear it in Hebrew</button></p>' : '');
    det.hidden = false;
    var sb = $('ab-say'); if (sb) sb.onclick = function () { say(r[5] + '. ' + r[6]); };
    say(r[5]);
  }
  if (grid) grid.addEventListener('click', function (e) { var b = e.target.closest('.ab-c'); if (b) show(+b.getAttribute('data-i')); });

  // בוחן: אות, ארבע תשובות
  var score = 0, total = 0;
  function quiz() {
    var q = $('ab-quiz'); q.hidden = false;
    var a = Math.floor(Math.random() * L.length), opts = [a];
    while (opts.length < 4) { var x = Math.floor(Math.random() * L.length); if (opts.indexOf(x) < 0) opts.push(x); }
    opts.sort(function () { return Math.random() - .5; });
    $('ab-qg').textContent = L[a][0];
    $('ab-qr').textContent = '';
    var box = $('ab-qa'); box.innerHTML = '';
    opts.forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-line btn-sm'; b.textContent = L[o][1];
      b.onclick = function () {
        if (box.getAttribute('data-done')) return; box.setAttribute('data-done', '1'); total++;
        if (o === a) { score++; b.className += ' ok'; $('ab-qr').textContent = 'Correct! ' + L[a][1] + ' sounds like ' + L[a][2] + '.'; say(L[a][5]); }
        else { b.className += ' no'; box.children[opts.indexOf(a)].className += ' ok'; $('ab-qr').textContent = 'This is ' + L[a][1] + ' (' + L[a][2] + ').'; }
        $('ab-score').textContent = score + ' / ' + total;
        setTimeout(function () { box.removeAttribute('data-done'); quiz(); }, 1400);
      };
      box.appendChild(b);
    });
    box.removeAttribute('data-done');
  }
  var qg = $('ab-quiz-go'); if (qg) qg.onclick = function () { quiz(); $('ab-quiz').scrollIntoView({ behavior: 'smooth', block: 'center' }); };

  // מספר → אותיות (כמו בתאריך עברי: טו, טז, גרשיים לפני האות האחרונה)
  var ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], HUN = ['', 'ק', 'ר', 'ש', 'ת'];
  var VAL = {}; [ONES, TENS].forEach(function (arr, k) { arr.forEach(function (c, i) { if (c) VAL[c] = i * (k ? 10 : 1); }); }); HUN.forEach(function (c, i) { if (c) VAL[c] = i * 100; });
  function toHeb(n) {
    var th = Math.floor(n / 1000), s = '', parts = [];
    n = n % 1000;
    var h = Math.floor(n / 100); while (h > 4) { s += 'ת'; parts.push(400); h -= 4; } if (h) { s += HUN[h]; parts.push(h * 100); }
    var r = n % 100;
    if (r === 15 || r === 16) { s += 'ט' + ONES[r - 9]; parts.push(9, r - 9); }
    else { var t = Math.floor(r / 10), o = r % 10; if (t) { s += TENS[t]; parts.push(t * 10); } if (o) { s += ONES[o]; parts.push(o); } }
    if (s.length === 1) s += '׳'; else if (s.length > 1) s = s.slice(0, -1) + '״' + s.slice(-1);
    var pre = th ? ONES[th] + '׳' : '';
    return { h: pre + (pre && s ? ' ' : '') + s, parts: (th ? [th + ' thousand'] : []).concat(parts) };
  }
  var ni = $('ab-n'), no = $('ab-nout');
  function conv() {
    var n = parseInt(ni.value, 10);
    if (!(n >= 1 && n <= 9999)) { no.textContent = 'Type a whole number from 1 to 9999.'; return; }
    var r = toHeb(n);
    no.innerHTML = '<span lang="he" class="ab-tg">' + r.h + '</span> = ' + r.parts.join(' + ');
  }
  if (ni && no) { ni.addEventListener('input', conv); conv(); }
})();
