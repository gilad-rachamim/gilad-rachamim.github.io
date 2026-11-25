/* חידון חזרה לגרים – שאלה אחת בכל פעם, הצג תשובה, ידעתי / לא ידעתי, ציון וקישורים. הכול בדפדפן. */
(function () {
  'use strict';
  var app = document.getElementById('ch-app');
  var dataEl = document.getElementById('ch-data');
  if (!app || !dataEl) return;
  var G = window.GIUR || { used: function () {}, wa: function (t) { window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener'); } };
  var ALL = JSON.parse(dataEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var setup = $('ch-setup'), quiz = $('ch-quiz'), result = $('ch-result');
  var stage = 'all', len = 10, deck = [], pos = 0, known = [], missed = [], seen = [];

  function pressGroup(box, attr, val) {
    [].forEach.call(box.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute(attr) === String(val) ? 'true' : 'false'); });
  }
  $('ch-stages').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    stage = b.getAttribute('data-cat'); pressGroup(this, 'data-cat', stage);
  });
  $('ch-lens').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    len = parseInt(b.getAttribute('data-len'), 10); pressGroup(this, 'data-len', len);
  });

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function start(pool, n) {
    deck = shuffle(pool); if (n > 0) deck = deck.slice(0, n);
    pos = 0; known = []; missed = []; seen = [];
    setup.hidden = true; result.hidden = true; quiz.hidden = false;
    G.used('giur_chidon_start', { stage: stage, n: deck.length });
    show();
  }
  function poolFor(s) { return ALL.filter(function (x) { return s === 'all' || x.cat === s; }); }
  $('ch-start').addEventListener('click', function () { start(poolFor(stage), len); });

  function show() {
    var it = deck[pos];
    $('ch-prog').textContent = 'שאלה ' + (pos + 1) + ' מתוך ' + deck.length;
    $('ch-score-live').textContent = 'ידעתי: ' + known.length;
    $('ch-fill').style.width = Math.round(pos * 100 / deck.length) + '%';
    $('ch-qstage').textContent = 'שלב: ' + it.cat;
    var q = $('ch-q'); q.textContent = it.q;
    $('ch-ans').hidden = true; $('ch-show').hidden = false;
    q.focus();
  }
  $('ch-show').addEventListener('click', function () {
    var it = deck[pos];
    $('ch-a').textContent = it.a;
    var s = $('ch-src'); s.textContent = '';
    s.appendChild(document.createTextNode('מקור: ספר "פניני הלכה – גיור", ' + it.src + ' · '));
    var a = document.createElement('a'); a.href = it.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'להלכה המלאה באתר פניני הלכה';
    s.appendChild(a);
    $('ch-ans').hidden = false; this.hidden = true;
    $('ch-ans').focus();
  });
  function answer(ok) {
    var it = deck[pos]; seen.push(it);
    (ok ? known : missed).push(it);
    pos++;
    if (pos >= deck.length) finish(); else show();
  }
  $('ch-yes').addEventListener('click', function () { answer(true); });
  $('ch-no').addEventListener('click', function () { answer(false); });
  $('ch-quit').addEventListener('click', function () { finish(); });

  function li(it, withLink) {
    var l = document.createElement('li');
    var a = document.createElement('a');
    a.href = '/kodesh/giur/shut/#' + it.id; a.textContent = it.q; l.appendChild(a);
    if (withLink) {
      var s = document.createElement('div'); s.className = 'ch-src2';
      s.appendChild(document.createTextNode('מקור: ספר "פניני הלכה – גיור", ' + it.src + ' · '));
      var b = document.createElement('a'); b.href = it.url; b.target = '_blank'; b.rel = 'noopener'; b.textContent = 'להלכה המלאה בספר';
      s.appendChild(b); l.appendChild(s);
    }
    return l;
  }
  function finish() {
    quiz.hidden = true; result.hidden = false;
    var total = seen.length, k = known.length;
    $('ch-res-score').textContent = total ? 'ידעתם ' + k + ' מתוך ' + total + ' (' + Math.round(k * 100 / total) + '%)' : 'עוד לא ענית על שאלות';
    var msg = '';
    if (!total) msg = 'אפשר להתחיל חידון חדש.';
    else if (!missed.length) msg = 'כל הכבוד, ידעתם הכול. אפשר להמשיך לחידון נוסף.';
    else msg = 'את מה שלא ידעתם כדאי לקרוא בדף השאלות והתשובות המלא, ובספר עצמו.';
    $('ch-res-msg').textContent = msg;
    var mb = $('ch-miss'); mb.textContent = '';
    missed.forEach(function (it) { mb.appendChild(li(it, false)); });
    $('ch-miss-box').hidden = !missed.length;
    $('ch-again-miss').hidden = !missed.length;
    var all = $('ch-all'); all.textContent = '';
    seen.forEach(function (it) { all.appendChild(li(it, true)); });
    G.used('giur_chidon_done', { n: total, known: k });
    $('ch-res-h').focus();
  }
  $('ch-again-miss').addEventListener('click', function () { start(missed.slice(), 0); });
  $('ch-again').addEventListener('click', function () {
    result.hidden = true; setup.hidden = false; $('ch-start').focus();
  });
  $('ch-share').addEventListener('click', function () {
    G.used('giur_chidon_share');
    G.wa('חידון הלכה לגרים: ידעתי ' + known.length + ' מתוך ' + seen.length + '. נסו גם: https://hakelim.com/kodesh/giur/shut/chidon/');
  });
})();
