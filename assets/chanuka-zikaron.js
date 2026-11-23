/* משחק זיכרון לחנוכה – זוגות קלפים בשלוש רמות, שחקן אחד או שניים בתור. בלי שרת, עובד גם בלי אינטרנט אחרי הטעינה. */
(function () {
  'use strict';
  var KEY = 'chanuka_zikaron_v1';
  function $(id) { return document.getElementById(id); }
  function used(how) { try { if (window.toolUsed) window.toolUsed('chanuka_zikaron', { how: how }); } catch (e) {} }
  function rnd(n) {
    try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } catch (e) { return Math.floor(Math.random() * n); }
  }

  /* ציורים קטנים (viewBox 60x60), שנוצרו בקוד – בלי תמונות מהרשת */
  var G = '#f1c24b', GD = '#b8860b', B = '#1e5aa8', R = '#d9482b', BR = '#a9642b';
  var ICONS = [
    { n: 'חנוכייה', s: '<rect x="8" y="46" width="44" height="6" rx="3" fill="' + GD + '"/><rect x="27" y="32" width="6" height="16" fill="' + G + '"/><rect x="6" y="38" width="48" height="5" rx="2.5" fill="' + G + '"/><g fill="#fff4cf"><rect x="8" y="26" width="3" height="12"/><rect x="14" y="26" width="3" height="12"/><rect x="20" y="26" width="3" height="12"/><rect x="26" y="26" width="3" height="12"/><rect x="31" y="22" width="3" height="16"/><rect x="37" y="26" width="3" height="12"/><rect x="43" y="26" width="3" height="12"/><rect x="49" y="26" width="3" height="12"/></g><g fill="#ff9a1f"><ellipse cx="9.5" cy="23" rx="2" ry="3.4"/><ellipse cx="15.5" cy="23" rx="2" ry="3.4"/><ellipse cx="21.5" cy="23" rx="2" ry="3.4"/><ellipse cx="27.5" cy="23" rx="2" ry="3.4"/><ellipse cx="32.5" cy="19" rx="2" ry="3.4"/><ellipse cx="38.5" cy="23" rx="2" ry="3.4"/><ellipse cx="44.5" cy="23" rx="2" ry="3.4"/><ellipse cx="50.5" cy="23" rx="2" ry="3.4"/></g>' },
    { n: 'סביבון', s: '<rect x="28" y="6" width="4" height="10" rx="2" fill="' + BR + '"/><rect x="15" y="16" width="30" height="24" rx="3" fill="' + B + '"/><path d="M15 40 L45 40 L30 56 Z" fill="#14407a"/><text x="30" y="35" text-anchor="middle" font-size="19" font-weight="800" fill="#fff" font-family="Arial,sans-serif">נ</text>' },
    { n: 'סופגנייה', s: '<ellipse cx="30" cy="34" rx="22" ry="16" fill="#d99a4e"/><ellipse cx="30" cy="30" rx="22" ry="14" fill="#e8b36a"/><ellipse cx="30" cy="27" rx="15" ry="8" fill="#fff"/><circle cx="30" cy="27" r="4" fill="' + R + '"/><g fill="#fff" opacity=".8"><circle cx="18" cy="34" r="1.2"/><circle cx="26" cy="40" r="1.2"/><circle cx="38" cy="39" r="1.2"/><circle cx="44" cy="33" r="1.2"/></g>' },
    { n: 'פך שמן', s: '<path d="M24 8 H36 V16 C48 20 52 30 50 42 C48 52 40 56 30 56 C20 56 12 52 10 42 C8 30 12 20 24 16 Z" fill="#c58a3d" stroke="#7a4e17" stroke-width="2"/><rect x="22" y="6" width="16" height="6" rx="2" fill="#7a4e17"/><path d="M18 34 C22 28 38 28 42 34" stroke="#f0cf8a" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="30" cy="44" rx="9" ry="5" fill="#f1c24b" opacity=".7"/>' },
    { n: 'נר', s: '<rect x="23" y="26" width="14" height="30" rx="2" fill="#4f9ee8"/><rect x="23" y="26" width="14" height="5" fill="#8cc4f5"/><rect x="29" y="22" width="2" height="6" fill="#333"/><path d="M30 4 C36 11 37 17 30 23 C23 17 24 11 30 4 Z" fill="#ff9a1f"/><path d="M30 11 C33 15 33 18 30 21 C27 18 27 15 30 11 Z" fill="#ffe27a"/>' },
    { n: 'מגן דוד', s: '<path d="M30 6 L52 44 H8 Z" fill="none" stroke="' + B + '" stroke-width="5" stroke-linejoin="round"/><path d="M30 54 L8 16 H52 Z" fill="none" stroke="' + B + '" stroke-width="5" stroke-linejoin="round"/>' },
    { n: 'דמי חנוכה', s: '<circle cx="30" cy="30" r="22" fill="' + G + '" stroke="' + GD + '" stroke-width="3"/><circle cx="30" cy="30" r="16" fill="none" stroke="' + GD + '" stroke-width="1.5"/><text x="30" y="38" text-anchor="middle" font-size="24" font-weight="800" fill="' + GD + '" font-family="Arial,sans-serif">ח</text>' },
    { n: 'לביבה', s: '<ellipse cx="30" cy="34" rx="22" ry="10" fill="#8f5a1f"/><ellipse cx="30" cy="30" rx="22" ry="12" fill="#c98a36"/><g fill="#f0cf8a"><circle cx="20" cy="28" r="2.2"/><circle cx="32" cy="25" r="2.2"/><circle cx="41" cy="31" r="2.2"/><circle cx="27" cy="35" r="2.2"/></g>' },
    { n: 'מגן המכבים', s: '<path d="M10 10 H50 V30 C50 42 40 50 30 56 C20 50 10 42 10 30 Z" fill="' + B + '" stroke="#0f3d78" stroke-width="3"/><text x="30" y="40" text-anchor="middle" font-size="30" font-weight="800" fill="#fff" font-family="Arial,sans-serif">מ</text>' },
    { n: 'מנורת שמן', s: '<path d="M8 36 C8 46 18 52 30 52 C42 52 50 46 52 36 L46 34 H14 Z" fill="' + GD + '"/><path d="M52 36 L58 28" stroke="' + GD + '" stroke-width="4" stroke-linecap="round"/><rect x="20" y="30" width="20" height="5" fill="' + G + '"/><path d="M58 28 C62 22 60 18 57 14 C54 19 54 23 58 28 Z" fill="#ff9a1f" transform="translate(-2 0)"/>' }
  ];
  var LEVELS = { 1: { pairs: 6, cols: 3, name: 'קל' }, 2: { pairs: 8, cols: 4, name: 'בינוני' }, 3: { pairs: 10, cols: 4, name: 'קשה' } };

  var st = { lvl: 1, two: false, best: {} };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && typeof sv === 'object') { st.lvl = [1, 2, 3].indexOf(sv.lvl) > -1 ? sv.lvl : 1; st.two = !!sv.two; st.best = sv.best || {}; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  var g = null; // מצב משחק
  function newGame() {
    var L = LEVELS[st.lvl], idx = [], i, j, t;
    for (i = 0; i < ICONS.length; i++) idx.push(i);
    for (i = idx.length - 1; i > 0; i--) { j = rnd(i + 1); t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    var cards = [];
    for (i = 0; i < L.pairs; i++) { cards.push(idx[i]); cards.push(idx[i]); }
    for (i = cards.length - 1; i > 0; i--) { j = rnd(i + 1); t = cards[i]; cards[i] = cards[j]; cards[j] = t; }
    g = { cards: cards, open: [], done: {}, lock: false, moves: 0, turn: 0, score: [0, 0], found: 0, start: Date.now() };
    render(); used('start');
  }

  function cardHtml(k) {
    var ic = ICONS[g.cards[k]];
    return '<button type="button" class="zk-card" data-k="' + k + '" aria-label="קלף ' + (k + 1) + ', הפוך"><span class="zk-in"><span class="zk-back" aria-hidden="true">✦</span><span class="zk-front"><svg viewBox="0 0 60 60" role="img" aria-label="' + ic.n + '">' + ic.s + '</svg></span></span></button>';
  }
  function render() {
    var L = LEVELS[st.lvl], b = $('zk-board'), h = '', k;
    b.style.setProperty('--cols', L.cols);
    for (k = 0; k < g.cards.length; k++) h += cardHtml(k);
    b.innerHTML = h;
    status();
    $('zk-win').hidden = true;
    var bs = $('zk-lvls').querySelectorAll('button'), x;
    for (x = 0; x < bs.length; x++) bs[x].setAttribute('aria-pressed', String(+bs[x].getAttribute('data-l') === st.lvl));
    $('zk-p1').setAttribute('aria-pressed', String(!st.two)); $('zk-p2').setAttribute('aria-pressed', String(st.two));
  }
  function status() {
    var s = $('zk-st'), best = st.best[st.lvl];
    if (st.two) {
      s.innerHTML = '<span class="zk-pl' + (g.turn === 0 ? ' on' : '') + '">שחקן 1: <b>' + g.score[0] + '</b></span><span class="zk-pl' + (g.turn === 1 ? ' on' : '') + '">שחקן 2: <b>' + g.score[1] + '</b></span>';
    } else {
      s.innerHTML = '<span class="zk-pl on">מהלכים: <b>' + g.moves + '</b></span>' + (best ? '<span class="zk-pl">שיא ברמה הזאת: <b>' + best + '</b></span>' : '');
    }
  }
  function flip(el, on) { el.classList[on ? 'add' : 'remove']('up'); el.setAttribute('aria-label', on ? 'קלף ' + (+el.getAttribute('data-k') + 1) + ': ' + ICONS[g.cards[+el.getAttribute('data-k')]].n : 'קלף ' + (+el.getAttribute('data-k') + 1) + ', הפוך'); }

  function onTap(e) {
    var el = e.target.closest ? e.target.closest('.zk-card') : null;
    if (!el || !g || g.lock) return;
    var k = +el.getAttribute('data-k');
    if (g.done[k] || g.open.indexOf(k) > -1) return;
    flip(el, true); g.open.push(k);
    if (g.open.length < 2) return;
    g.moves++;
    var a = g.open[0], b = g.open[1], ea = el.parentNode.children[a], eb = el.parentNode.children[b];
    if (g.cards[a] === g.cards[b]) {
      g.done[a] = g.done[b] = true; g.found++;
      if (st.two) g.score[g.turn]++;
      ea.classList.add('ok'); eb.classList.add('ok'); g.open = []; status();
      if (g.found === LEVELS[st.lvl].pairs) win();
    } else {
      g.lock = true;
      setTimeout(function () {
        flip(ea, false); flip(eb, false); g.open = []; g.lock = false;
        if (st.two) g.turn = 1 - g.turn;
        status();
      }, 950);
      status();
    }
  }
  function win() {
    var w = $('zk-win'), msg, sec = Math.round((Date.now() - g.start) / 1000);
    if (st.two) {
      msg = g.score[0] === g.score[1] ? 'תיקו! שניכם מצאתם ' + g.score[0] + ' זוגות. חנוכה שמח!' : 'שחקן ' + (g.score[0] > g.score[1] ? 1 : 2) + ' ניצח, ' + Math.max(g.score[0], g.score[1]) + ' זוגות מול ' + Math.min(g.score[0], g.score[1]) + '. חנוכה שמח!';
    } else {
      var prev = st.best[st.lvl];
      msg = 'כל הכבוד! מצאתם את כל הזוגות ב-' + g.moves + ' מהלכים (' + sec + ' שניות).';
      if (!prev || g.moves < prev) { st.best[st.lvl] = g.moves; save(); msg += prev ? ' שיא חדש!' : ' זה השיא הראשון שלכם ברמה הזאת.'; }
    }
    $('zk-wm').textContent = msg; w.hidden = false;
    used('win');
    try { w.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
  }

  function init() {
    if (!$('zk-board')) return;
    $('zk-board').addEventListener('click', onTap);
    var bs = $('zk-lvls').querySelectorAll('button'), i;
    for (i = 0; i < bs.length; i++) bs[i].onclick = function () { st.lvl = +this.getAttribute('data-l'); save(); newGame(); used('level'); };
    $('zk-p1').onclick = function () { st.two = false; save(); newGame(); };
    $('zk-p2').onclick = function () { st.two = true; save(); newGame(); };
    $('zk-new').onclick = function () { newGame(); };
    $('zk-again').onclick = function () { newGame(); };
    $('zk-wa').onclick = function (e) {
      e.preventDefault();
      used('wa');
      window.open('https://wa.me/?text=' + encodeURIComponent('משחק זיכרון לחנוכה, בחינם ובלי הרשמה: https://hakelim.com/kodesh/chanuka/mischakim/zikaron/'), '_blank', 'noopener');
    };
    newGame();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
