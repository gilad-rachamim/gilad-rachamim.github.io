// בלאק ג'ק (21) – /kelim/chashiva/blackjack/
// על נקודות בלבד. בלי כסף אמיתי ובלי הימורים.
// אתגר יומי: אותה חפיסה לכולם (זרע לפי התאריך), 20 ידיים, מתחילים עם 1,000 נקודות.
// משחק עם חבר: אותה חפיסה בדיוק, ומי שמסיים עם יותר נקודות – ניצח (מנגנון ?vs= הרגיל, q:'pts').
(function () {
  'use strict';
  var CH = window.CH, TOOL = 'chashiva_blackjack', G = 'blackjack';
  function $(id) { return document.getElementById(id); }
  if (!$('bj-table')) return;

  var ROUND = 20, START = 1000, BETS = [10, 25, 50, 100];
  var SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  function rank(c) { return c % 13; }
  function cval(c) { var r = rank(c); return r === 0 ? 11 : r >= 9 ? 10 : r + 1; }
  function total(cards) { var t = 0, a = 0; cards.forEach(function (c) { t += cval(c); if (rank(c) === 0) a++; }); while (t > 21 && a) { t -= 10; a--; } return { t: t, soft: a > 0 }; }
  function isBJ(cards) { return cards.length === 2 && total(cards).t === 21; }
  function shoe(seed) { var a = []; for (var d = 0; d < 6; d++) for (var c = 0; c < 52; c++) a.push(c); return CH.shuffle(a, CH.rng(seed)); }
  CH.cardHtml = CH.cardHtml || function (c, hidden) {
    if (hidden) return '<span class="cd back" aria-label="קלף הפוך"></span>';
    var s = Math.floor(c / 13) % 4, red = s === 1 || s === 2;
    return '<span class="cd' + (red ? ' red' : '') + '" aria-label="' + RANKS[rank(c)] + ' ' + SUITS[s] + '"><b>' + RANKS[rank(c)] + '</b><i>' + SUITS[s] + '︎</i></span>';
  };

  // ---------- מצב ----------
  var data = CH.load(G); if (typeof data.free !== 'number') data.free = START; data.bet = BETS.indexOf(data.bet) >= 0 ? data.bet : 50;
  var mode = 'daily', seed, deck, pos, pts, handNo, hands, act, dealer, phase, hints = 0, started = false, already = false;
  function persist() { var d = CH.load(G); d.free = data.free; d.bet = data.bet; d.tab = mode === 'vs' ? d.tab : mode; CH.save(G, d); }
  function draw1() { if (pos >= deck.length - 20) { deck = deck.concat(shoe(seed + '#' + pos)); } return deck[pos++]; }
  function start(m, sd) {
    if (m !== 'vs') CH.vsReset();
    mode = m; seed = sd || (m === 'daily' ? 'blackjack-daily-' + CH.today() : 'blackjack-free-' + Date.now());
    deck = shoe(seed); pos = 0; handNo = 0; hands = []; dealer = []; act = 0; phase = 'bet'; hints = 0; started = false;
    pts = m === 'free' ? data.free : START;
    already = m === 'daily' && CH.stats(G).doneToday;
    $('bj-win').innerHTML = ''; say(m === 'free' ? 'משחק חופשי: הנקודות נשמרות בטלפון.' : already ? 'כבר סיימתם את האתגר של היום. אפשר לשחק שוב לאימון (לא נספר).' : 'סבב של ' + ROUND + ' ידיים. מתחילים עם ' + fmt(START) + ' נקודות. בהצלחה!');
    render();
  }
  function fmt(n) { return Number(n).toLocaleString('he-IL'); }
  function say(t) { $('bj-msg').textContent = t || ''; }

  // ---------- חלוקה ומהלכים ----------
  function deal() {
    if (phase !== 'bet') return;
    if (pts < data.bet) { say('אין מספיק נקודות לסכום הזה. בחרו סכום קטן יותר.'); return; }
    if (!started) { started = true; CH.used(TOOL, 'start', { mode: mode }); }
    pts -= data.bet; hands = [{ c: [draw1()], bet: data.bet, done: false }]; dealer = [draw1()]; hands[0].c.push(draw1()); dealer.push(draw1()); act = 0; phase = 'play';
    say('');
    if (isBJ(hands[0].c) || isBJ(dealer)) { hands[0].done = true; return settle(); }
    render();
  }
  function cur() { return hands[act]; }
  function next() {
    while (act < hands.length && hands[act].done) act++;
    if (act >= hands.length) dealerPlay(); else render();
  }
  function hit() {
    if (phase !== 'play') return; var h = cur(); h.c.push(draw1());
    var t = total(h.c).t; if (t >= 21) { h.done = true; if (t > 21) say('💥 עברתם את 21'); }
    next();
  }
  function stand() { if (phase !== 'play') return; cur().done = true; next(); }
  function dbl() {
    var h = cur(); if (phase !== 'play' || h.c.length !== 2 || pts < h.bet) return;
    pts -= h.bet; h.bet *= 2; h.c.push(draw1()); h.done = true; h.dbl = 1; next();
  }
  function split() {
    var h = cur(); if (!canSplit()) return;
    pts -= h.bet; var h2 = { c: [h.c.pop()], bet: h.bet, done: false, sp: 1 }; h.sp = 1;
    h.c.push(draw1()); h2.c.push(draw1()); hands.splice(act + 1, 0, h2);
    if (rank(h.c[0]) === 0) { h.done = true; h2.done = true; } // אסים מפוצלים: קלף אחד לכל יד
    next();
  }
  function canSplit() { var h = cur(); return phase === 'play' && hands.length === 1 && h.c.length === 2 && cval(h.c[0]) === cval(h.c[1]) && pts >= h.bet; }
  function dealerPlay() {
    phase = 'dealer'; // הדילר עוצר על 17 (גם רך)
    var live = hands.some(function (h) { return total(h.c).t <= 21; });
    if (live) while (true) { var d = total(dealer); if (d.t < 17) dealer.push(draw1()); else break; }
    settle();
  }
  function settle() {
    phase = 'done';
    var d = total(dealer).t, dBJ = isBJ(dealer), lines = [], gain = 0;
    hands.forEach(function (h, k) {
      var t = total(h.c).t, bj = isBJ(h.c) && !h.sp, back = 0, res;
      if (t > 21) res = 'עברתם 21 – הפסד';
      else if (bj && !dBJ) { back = h.bet * 2.5; res = '🂡 בלאק ג\'ק! משלם 3 ל-2'; }
      else if (dBJ && !bj) res = 'לדילר בלאק ג\'ק – הפסד';
      else if (bj && dBJ) { back = h.bet; res = 'שניכם בלאק ג\'ק – תיקו'; }
      else if (d > 21) { back = h.bet * 2; res = 'הדילר עבר 21 – ניצחון'; }
      else if (t > d) { back = h.bet * 2; res = t + ' מול ' + d + ' – ניצחון'; }
      else if (t === d) { back = h.bet; res = t + ' מול ' + d + ' – תיקו'; }
      else res = t + ' מול ' + d + ' – הפסד';
      back = Math.floor(back); pts += back; gain += back - h.bet;
      lines.push((hands.length > 1 ? 'יד ' + (k + 1) + ': ' : '') + res);
    });
    handNo++;
    say(lines.join(' · ') + ' (' + (gain >= 0 ? '+' : '') + fmt(gain) + ')');
    if (mode === 'free') { data.free = pts; if (data.free < 10) { data.free = pts = 500; say(lines.join(' · ') + '. נגמרו הנקודות – קיבלתם 500 חדשות במתנה 🎁'); } persist(); }
    CH.used(TOOL, 'hand', { mode: mode, n: handNo });
    render();
    if (mode !== 'free' && handNo >= ROUND) setTimeout(finish, 900);
    else if (mode !== 'free' && pts < BETS[0]) setTimeout(finish, 900);
  }

  // ---------- רמז: האסטרטגיה הבסיסית ----------
  function advice() {
    var h = cur(), t = total(h.c), up = cval(dealer[0]), two = h.c.length === 2;
    if (canSplit()) { var v = cval(h.c[0]); if (v === 11 || v === 8) return 'לפצל'; if ((v === 9 && [7, 10, 11].indexOf(up) < 0) || (v <= 3 && up >= 2 && up <= 7) || (v === 7 && up <= 7) || (v === 6 && up <= 6)) return 'לפצל'; }
    if (t.soft && t.t <= 21) {
      if (t.t >= 19) return 'לעצור'; if (t.t === 18) return up >= 9 ? 'לקחת קלף' : (two && up >= 3 && up <= 6 ? 'להכפיל' : 'לעצור');
      return two && up >= 4 && up <= 6 ? 'להכפיל' : 'לקחת קלף';
    }
    if (t.t >= 17) return 'לעצור'; if (t.t >= 13) return up <= 6 ? 'לעצור' : 'לקחת קלף';
    if (t.t === 12) return up >= 4 && up <= 6 ? 'לעצור' : 'לקחת קלף';
    if (t.t === 11) return two ? 'להכפיל' : 'לקחת קלף'; if (t.t === 10) return two && up <= 9 ? 'להכפיל' : 'לקחת קלף';
    return 'לקחת קלף';
  }

  // ---------- תצוגה ----------
  function render() {
    var hide = phase === 'play';
    $('bj-dealer').innerHTML = dealer.map(function (c, i) { return CH.cardHtml(c, hide && i === 1); }).join('');
    $('bj-dtot').textContent = dealer.length ? (hide ? cval(dealer[0]) + ' + ?' : total(dealer).t) : '';
    $('bj-hands').innerHTML = hands.map(function (h, k) {
      var t = total(h.c);
      return '<div class="bj-hand' + (phase === 'play' && k === act ? ' on' : '') + '"><div class="bj-cards">' + h.c.map(function (c) { return CH.cardHtml(c); }).join('') + '</div><span>' + (t.soft && t.t < 21 ? t.t - 10 + '/' : '') + t.t + ' · הימור ' + h.bet + (h.dbl ? ' (כפול)' : '') + '</span></div>';
    }).join('');
    $('bj-pts').textContent = fmt(pts);
    $('bj-hand').textContent = mode === 'free' ? 'חופשי' : 'יד ' + Math.min(handNo + (phase === 'done' ? 0 : 1), ROUND) + ' מתוך ' + ROUND;
    $('bj-bets').innerHTML = BETS.map(function (b) { return '<button type="button" data-b="' + b + '" class="' + (data.bet === b ? 'on' : '') + '"' + (pts < b ? ' disabled' : '') + '>' + b + '</button>'; }).join('');
    $('bj-bets').querySelectorAll('button').forEach(function (b) { b.onclick = function () { data.bet = +b.getAttribute('data-b'); persist(); render(); }; });
    var betting = phase === 'bet' || phase === 'done', over = mode !== 'free' && (handNo >= ROUND || pts < BETS[0]);
    $('bj-betbox').hidden = !betting || over;
    $('bj-deal').hidden = !betting || over; $('bj-deal').textContent = handNo ? '🃏 היד הבאה' : '🃏 לחלק';
    ['bj-hit', 'bj-stand', 'bj-hint'].forEach(function (id) { $(id).hidden = phase !== 'play'; });
    $('bj-dbl').hidden = !(phase === 'play' && cur().c.length === 2 && pts >= cur().bet);
    $('bj-split').hidden = !canSplit();
  }
  $('bj-deal').onclick = function () { if (phase === 'done') { phase = 'bet'; hands = []; dealer = []; } deal(); };
  $('bj-hit').onclick = hit; $('bj-stand').onclick = stand; $('bj-dbl').onclick = dbl; $('bj-split').onclick = split;
  $('bj-hint').onclick = function () { hints++; say('💡 לפי האסטרטגיה הבסיסית: ' + advice()); CH.used(TOOL, 'hint', { mode: mode }); };

  function finish() {
    var daily = mode === 'daily' && !already;
    var st = CH.record(G, daily, 0, hints);
    var d = CH.load(G); d.best = Math.max(d.best || 0, pts); CH.save(G, d);
    CH.used(TOOL, 'round', { mode: mode, pts: pts });
    var diff = pts - START;
    var share = '🃏 בלאק ג\'ק · ' + (mode === 'daily' ? 'אתגר יומי #' + CH.dayNum() : 'סבב') + '\nסיימתי ' + ROUND + ' ידיים עם ' + fmt(pts) + ' נקודות (' + (diff >= 0 ? '+' : '') + fmt(diff) + ')' + (daily && st.streak ? '\n🔥 רצף ' + CH.days(st.streak) : '') + '\nעל נקודות בלבד, בלי כסף. מצליחים יותר?';
    CH.win({ tool: TOOL, el: $('bj-win'), daily: daily, stats: st,
      title: diff > 0 ? 'סיימתם ברווח! 🎉' : diff === 0 ? 'סיימתם בדיוק באפס 🤝' : 'סיימתם את הסבב 🃏',
      line: '<span>🪙 <b>' + fmt(pts) + '</b> נקודות</span><span>' + (diff >= 0 ? '+' : '') + fmt(diff) + '</span>' + (hints ? '<span>💡 ' + hints + '</span>' : ''),
      share: share, next: [{ label: 'משחק חופשי', fn: function () { tab('free'); } }],
      vs: { g: G, s: seed }, vsMine: { t: pts, h: hints, q: 'pts' }, vsWhat: 'אותה חפיסה',
      vsMsg: '🃏 אתגר בבלאק ג\'ק (על נקודות, בלי כסף): סיימתי ' + ROUND + ' ידיים עם ' + fmt(pts) + ' נקודות. אותה חפיסה בדיוק – תצליחו יותר?' });
  }

  function tab(m) {
    CH.vsReset();
    document.querySelectorAll('#bj-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === m); });
    start(m); persist();
  }
  document.querySelectorAll('#bj-tabs button').forEach(function (b) { b.onclick = function () { tab(b.getAttribute('data-m')); }; });
  var V = CH.vsIn && CH.vsIn.g === G && typeof CH.vsIn.s === 'string' && /^blackjack-/.test(CH.vsIn.s) ? CH.vsIn : null;
  if (V && V.s === 'blackjack-daily-' + CH.today()) { tab('daily'); CH.vsStart(TOOL, 'אותה חפיסה:'); }
  else if (V) { document.querySelectorAll('#bj-tabs button').forEach(function (b) { b.setAttribute('aria-selected', 'false'); }); start('vs', V.s.slice(0, 60)); CH.vsStart(TOOL, 'אותה חפיסה:'); }
  else tab(CH.load(G).tab === 'free' ? 'free' : 'daily');
})();
