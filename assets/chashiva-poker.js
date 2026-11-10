// פוקר (טקסס הולדם) על נקודות – /kelim/chashiva/poker/
// על נקודות בלבד: בלי כסף אמיתי, בלי הימורים, בלי קישורים לאתרי הימורים.
// כל אחד מתחיל עם 1,000 נקודות, בליינדים 10/20 שמוכפלים כל 10 ידיים. נשאר אחרון עם נקודות – ניצח.
(function () {
  'use strict';
  var CH = window.CH;
  if (!document.getElementById('tb') || !CH.table) return;
  var C = CH.cards, START = 1000, SB = 10;
  var CAT = ['קלף גבוה', 'זוג', 'שני זוגות', 'שלישייה', 'רצף', 'צבע', 'פול האוס', 'רביעייה', 'רצף בצבע'];
  function clone(s) { return JSON.parse(JSON.stringify(s)); }
  function rv(c) { return c % 13 === 0 ? 14 : c % 13 + 1; }
  // ציון ל-5 קלפים
  function rank5(cs) {
    var r = cs.map(rv).sort(function (a, b) { return b - a; }), fl = cs.every(function (c) { return Math.floor(c / 13) === Math.floor(cs[0] / 13); });
    var u = r.filter(function (x, i) { return r.indexOf(x) === i; }), st = 0;
    if (u.length === 5) { if (r[0] - r[4] === 4) st = r[0]; else if (r[0] === 14 && r[1] === 5) st = 5; }
    var cnt = {}; r.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; });
    var g = Object.keys(cnt).map(Number).sort(function (a, b) { return cnt[b] - cnt[a] || b - a; }), sh = g.map(function (x) { return cnt[x]; });
    var cat = st && fl ? 8 : sh[0] === 4 ? 7 : sh[0] === 3 && sh[1] === 2 ? 6 : fl ? 5 : st ? 4 : sh[0] === 3 ? 3 : sh[0] === 2 && sh[1] === 2 ? 2 : sh[0] === 2 ? 1 : 0;
    var tb = st ? [st] : g; var v = cat; for (var i = 0; i < 5; i++) v = v * 15 + (tb[i] || 0);
    return v;
  }
  // הציון הטוב ביותר מכל 5 קלפים מתוך 5-7
  function best(cs) {
    if (cs.length < 5) return 0;
    var b = 0, n = cs.length;
    for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
      if (n === 5 && (i || j > 1)) continue;
      var five = n === 5 ? cs : n === 6 ? cs.filter(function (x, k) { return k !== i; }) : cs.filter(function (x, k) { return k !== i && k !== j; });
      var v = rank5(five); if (v > b) b = v;
    }
    return b;
  }
  function catOf(v) { return CAT[Math.floor(v / Math.pow(15, 5))]; }
  function alive(s) { var a = []; for (var k = 0; k < s.n; k++) if (s.chips[k] > 0 || s.tot[k] > 0) a.push(k); return a; }
  function inHand(s) { return alive(s).filter(function (k) { return !s.fold[k] && s.inn[k]; }); }
  function nextSeat(s, from, pred) { for (var i = 1; i <= s.n; i++) { var k = (from + i) % s.n; if (pred(k)) return k; } return -1; }
  function canAct(s, k) { return s.inn[k] && !s.fold[k] && s.chips[k] > 0; }
  function pot(s) { return s.tot.reduce(function (a, x) { return a + x; }, 0); }
  function blind(s) { return SB * Math.pow(2, Math.floor((s.hn - 1) / 10)); }
  function isBot(s, k) { return /^🤖/.test(s.nm[k]); }

  function startHand(s) {
    s.hn++; s.board = []; s.fold = []; s.inn = []; s.bet = []; s.tot = []; s.hole = []; s.reveal = null; s.acted = [];
    for (var k = 0; k < s.n; k++) { s.inn.push(s.chips[k] > 0); s.fold.push(false); s.bet.push(0); s.tot.push(0); s.hole.push([]); s.acted.push(false); }
    s.deck = CH.shuffle(C.deck(0), CH.rng(s.seed + ':' + s.hn));
    s.btn = nextSeat(s, s.btn, function (k) { return s.inn[k]; });
    var ppl = s.inn.filter(Boolean).length, sb = blind(s);
    var sbS = ppl === 2 ? s.btn : nextSeat(s, s.btn, function (k) { return s.inn[k]; }), bbS = nextSeat(s, sbS, function (k) { return s.inn[k]; });
    put(s, sbS, Math.min(sb, s.chips[sbS])); put(s, bbS, Math.min(sb * 2, s.chips[bbS]));
    for (var r = 0; r < 2; r++) for (var j = 0; j < s.n; j++) if (s.inn[j]) s.hole[j].push(s.deck.shift());
    s.cur = sb * 2; s.minR = sb * 2; s.phase = 'pre';
    s.t = nextSeat(s, bbS, function (k) { return canAct(s, k); });
    s.log.push('🃏 יד ' + s.hn + ' · בליינדים ' + sb + '/' + sb * 2);
    if (s.t < 0 || needsNoAction(s)) runOut(s);
  }
  function put(s, k, x) { x = Math.min(x, s.chips[k]); s.chips[k] -= x; s.bet[k] += x; s.tot[k] += x; }
  function needsNoAction(s) { var can = inHand(s).filter(function (k) { return s.chips[k] > 0; }); return can.length <= 1 && can.every(function (k) { return s.bet[k] >= s.cur; }); }
  function streetDone(s) { return inHand(s).every(function (k) { return s.chips[k] === 0 || (s.acted[k] && s.bet[k] === s.cur); }); }
  function nextStreet(s) {
    for (var k = 0; k < s.n; k++) { s.bet[k] = 0; s.acted[k] = false; }
    s.cur = 0; s.minR = blind(s) * 2;
    if (s.phase === 'pre') { s.board.push(s.deck.shift(), s.deck.shift(), s.deck.shift()); s.phase = 'flop'; }
    else if (s.phase === 'flop') { s.board.push(s.deck.shift()); s.phase = 'turn'; }
    else if (s.phase === 'turn') { s.board.push(s.deck.shift()); s.phase = 'river'; }
    else return showdown(s);
    if (needsNoAction(s)) return runOut(s);
    s.t = nextSeat(s, s.btn, function (k) { return canAct(s, k); });
  }
  function runOut(s) { while (s.board.length < 5) s.board.push(s.deck.shift()); s.phase = 'river'; showdown(s); }
  function showdown(s) {
    var players = inHand(s), score = {}, lines = [];
    players.forEach(function (k) { score[k] = best(s.hole[k].concat(s.board)); });
    // קופה ראשית וקופות צד: לפי שכבות של כמה כל אחד שם
    var won = new Array(s.n).fill(0), levels = s.tot.filter(function (x, i, arr) { return x > 0 && arr.indexOf(x) === i; }).sort(function (x, y) { return x - y; }), prev = 0;
    levels.forEach(function (L) {
      var piece = 0; s.tot.forEach(function (x) { piece += Math.max(0, Math.min(x, L) - prev); });
      var elig = players.filter(function (k) { return s.tot[k] >= L; });
      if (!elig.length) { var back = []; s.tot.forEach(function (x, k) { if (x >= L) back.push(k); }); back.forEach(function (k, i) { won[k] += Math.floor(piece / back.length) + (i ? 0 : piece % back.length); }); }
      else { var top = Math.max.apply(null, elig.map(function (k) { return score[k]; })), ws = elig.filter(function (k) { return score[k] === top; }); ws.forEach(function (k, i) { won[k] += Math.floor(piece / ws.length) + (i ? 0 : piece % ws.length); }); }
      prev = L;
    });
    won.forEach(function (x, k) { if (x) { s.chips[k] += x; lines.push(s.nm[k] + ' +' + x + (players.length > 1 ? ' (' + catOf(score[k]) + ')' : '')); } });
    s.reveal = players.length > 1 ? players.reduce(function (o, k) { o[k] = s.hole[k]; return o; }, {}) : null;
    s.log.push('🏆 ' + lines.join(' · '));
    for (var k = 0; k < s.n; k++) s.tot[k] = 0;
    s.phase = 'show';
    var hum = alive(s).filter(function (k) { return !isBot(s, k) && s.chips[k] > 0; });
    s.t = hum.length ? hum[0] : alive(s).filter(function (k) { return s.chips[k] > 0; })[0] || 0;
  }
  // ---------- המחשב ----------
  function preStrength(h) {
    var a = rv(h[0]), b = rv(h[1]), hi = Math.max(a, b), lo = Math.min(a, b), v = hi / 14 * 0.45 + lo / 14 * 0.2;
    if (a === b) v += 0.35 + a / 14 * 0.15; if (Math.floor(h[0] / 13) === Math.floor(h[1] / 13)) v += 0.06; if (hi - lo === 1) v += 0.05;
    return Math.min(1, v);
  }
  function equity(s, k, iters) {
    var opp = inHand(s).length - 1, known = s.hole[k].concat(s.board), rest = C.deck(0).filter(function (c) { return known.indexOf(c) < 0; }), win = 0, rnd = Math.random;
    for (var i = 0; i < iters; i++) {
      var d = rest.slice(); for (var j = d.length - 1; j > 0; j--) { var x = Math.floor(rnd() * (j + 1)), t = d[j]; d[j] = d[x]; d[x] = t; }
      var bd = s.board.concat(d.splice(0, 5 - s.board.length)), me = best(s.hole[k].concat(bd)), beat = true;
      for (var o = 0; o < opp && beat; o++) if (best(d.splice(0, 2).concat(bd)) > me) beat = false;
      if (beat) win++;
    }
    return win / iters;
  }

  var game = {
    g: 'poker', tool: 'chashiva_poker', name: 'פוקר', minP: 2, maxP: 6, defP: 4, botDelay: 900,
    botNames: ['רוני', 'נועה', 'איתי', 'מאיה', 'עומר'],
    botDelayFor: function (s) { return s.phase === 'show' ? 3500 : 0; },
    init: function (seed, n, names) {
      var s = { seed: seed, n: n, nm: names, chips: new Array(n).fill(START), hn: 0, btn: n - 1, log: [] };
      startHand(s); return s;
    },
    turn: function (s) { return s.t; },
    over: function (s) {
      var al = []; for (var k = 0; k < s.n; k++) if (s.chips[k] > 0) al.push(k);
      if (s.phase !== 'show') return null;
      var hum = al.filter(function (k) { return !isBot(s, k); }), anyHuman = s.nm.some(function (x, k) { return !isBot(s, k); });
      if (al.length <= 1 || (anyHuman && !hum.length)) { var top = Math.max.apply(null, s.chips), w = []; s.chips.forEach(function (c, k) { if (c === top) w.push(k); }); return { w: w, text: top.toLocaleString('he-IL') + ' נקודות' }; }
      return null;
    },
    view: function (s, seat) {
      var me = seat >= 0 ? seat : -1, call = me >= 0 ? Math.min(s.cur - s.bet[me], s.chips[me]) : 0;
      return { seat: me, hole: me >= 0 ? s.hole[me] : [], board: s.board, chips: s.chips, bet: s.bet, fold: s.fold, inn: s.inn, btn: s.btn, phase: s.phase, pot: pot(s) + 0, reveal: s.reveal, t: s.t, hn: s.hn,
        call: call, minTo: s.cur + s.minR, maxTo: me >= 0 ? s.bet[me] + s.chips[me] : 0, cur: s.cur, mybet: me >= 0 ? s.bet[me] : 0, blind: blind(s),
        mine: me >= 0 && s.hole[me].length && s.board.length >= 3 ? catOf(best(s.hole[me].concat(s.board))) : '',
        log: s.log.slice(-6), score: 'קופה: ' + pot(s) + ' · יד ' + s.hn };
    },
    act: function (s0, seat, a) {
      var s = clone(s0);
      if (s.phase === 'show') { if (!a.next) return 'ממשיכים ליד הבאה'; startHand(s); return s; }
      var call = s.cur - s.bet[seat];
      if (a.a === 'fold') { s.fold[seat] = true; s.log.push('🙅 ' + s.nm[seat] + ': מקפלים'); }
      else if (a.a === 'check') { if (call > 0) return 'אי אפשר צ׳ק – יש הימור. משווים או מקפלים'; s.log.push('✋ ' + s.nm[seat] + ': צ׳ק'); }
      else if (a.a === 'call') { if (call <= 0) return 'אין מה להשוות – אפשר צ׳ק'; put(s, seat, call); s.log.push('🪙 ' + s.nm[seat] + ': משווים ' + Math.min(call, s.bet[seat])); }
      else if (a.a === 'raise') {
        var to = Math.floor(+a.to || 0), max = s.bet[seat] + s.chips[seat];
        if (to > max) to = max;
        if (to < s.cur + s.minR && to < max) return 'העלאה מינימלית: ל-' + (s.cur + s.minR);
        if (to <= s.cur) return 'העלאה חייבת להיות גבוהה מ-' + s.cur;
        var add = to - s.bet[seat]; if (to - s.cur >= s.minR) s.minR = to - s.cur;
        s.cur = to; put(s, seat, add);
        for (var k = 0; k < s.n; k++) if (k !== seat) s.acted[k] = false;
        s.log.push('⬆️ ' + s.nm[seat] + ': מעלים ל-' + to + (s.chips[seat] ? '' : ' (הכול!)'));
      } else return 'פעולה לא מוכרת';
      s.acted[seat] = true;
      var left = inHand(s);
      if (left.length === 1) { showdown(s); return s; }
      if (streetDone(s)) nextStreet(s);
      else s.t = nextSeat(s, seat, function (k) { return canAct(s, k) && !(s.acted[k] && s.bet[k] === s.cur); });
      return s;
    },
    bot: function (s, k) {
      if (s.phase === 'show') return { next: 1 };
      var call = s.cur - s.bet[k], p = pot(s), eq = s.board.length ? equity(s, k, 160) : preStrength(s.hole[k]) * (inHand(s).length > 3 ? 0.8 : 1);
      var odds = call / (p + call || 1), r = Math.random();
      var canRaise = s.bet[k] + s.chips[k] > s.cur;
      if (canRaise && (eq > 0.72 || (eq > 0.55 && r < 0.3) || (r < 0.04 && call === 0))) { var to = s.cur + Math.max(s.minR, Math.floor(p * (eq > 0.8 ? 1 : 0.6))); return { a: 'raise', to: to }; }
      if (call === 0) return { a: 'check' };
      if (eq > odds + 0.07 || (call <= blind(s) * 2 && eq > 0.3)) return { a: 'call' };
      return { a: 'fold' };
    },
    render: function (v, el, ctx) {
      var h = '<div class="pk-seats">' + ctx.names.map(function (nm, k) {
        if (k === v.seat) return '';
        var out = !v.inn[k] && v.chips[k] <= 0, rvl = v.reveal && v.reveal[k];
        return '<div class="rv-p' + (v.t === k && v.phase !== 'show' ? ' turn' : '') + (v.fold[k] || out ? ' pk-out' : '') + '"><b>' + CH.esc(nm) + (v.btn === k ? ' 🔘' : '') + '</b><span>🪙 ' + v.chips[k] + '</span><span>' + (out ? 'יצא' : v.fold[k] ? 'קיפל' : rvl ? rvl.map(function (c) { return C.html(c, { cls: 'sm' }); }).join('') : (v.bet[k] ? 'הימור ' + v.bet[k] : '🂠🂠')) + '</span></div>';
      }).join('') + '</div>';
      h += '<div class="pk-board">' + [0, 1, 2, 3, 4].map(function (i) { return v.board[i] !== undefined ? C.html(v.board[i]) : '<span class="cd pk-ph"></span>'; }).join('') + '</div><p class="pk-pot">💰 בקופה: <b>' + v.pot + '</b></p>';
      if (v.seat >= 0) {
        h += '<div class="pk-me"><div class="bj-cards">' + v.hole.map(function (c) { return C.html(c); }).join('') + '</div><span>🪙 ' + v.chips[v.seat] + (v.mybet ? ' · הימור ' + v.mybet : '') + (v.btn === v.seat ? ' · 🔘 מחלק' : '') + (v.mine && v.board.length ? ' · ' + v.mine : '') + '</span></div>';
        if (v.phase === 'show') h += ctx.mine ? '<div class="ch-tools"><button type="button" class="on" data-next>▶️ ליד הבאה</button></div>' : '<p class="rv-help">' + (ctx.over ? '🏁 המשחק נגמר' : 'עוד רגע יד חדשה…') + '</p>';
        else if (ctx.mine && !v.fold[v.seat]) {
          var raiseTo = Math.min(v.maxTo, Math.max(v.minTo, el._to || v.minTo)); el._to = raiseTo;
          h += '<div class="ch-tools pk-acts"><button type="button" data-a="fold">🙅 לקפל</button>' + (v.call > 0 ? '<button type="button" class="on" data-a="call">🪙 להשוות ' + v.call + '</button>' : '<button type="button" class="on" data-a="check">✋ צ׳ק</button>') + '</div>';
          if (v.maxTo > v.cur) h += '<div class="pk-raise"><button type="button" data-d="-1">−</button><b>להעלות ל-' + raiseTo + '</b><button type="button" data-d="1">+</button><button type="button" data-half>½ קופה</button><button type="button" data-all>הכול</button><button type="button" class="on" data-a="raise">⬆️ להעלות</button></div>';
        } else h += '<p class="rv-help">' + (v.fold[v.seat] ? 'קיפלתם. מחכים לסוף היד…' : 'מחכים לתור שלכם…') + '</p>';
      }
      el.innerHTML = h;
      el.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { var a = b.getAttribute('data-a'); ctx.act(a === 'raise' ? { a: a, to: el._to } : { a: a }); el._to = 0; }; });
      el.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { el._to = Math.max(v.minTo, Math.min(v.maxTo, el._to + (+b.getAttribute('data-d')) * v.blind * 2)); game.render(v, el, ctx); }; });
      var hf = el.querySelector('[data-half]'); if (hf) hf.onclick = function () { el._to = Math.max(v.minTo, Math.min(v.maxTo, v.cur + Math.floor(v.pot / 2))); game.render(v, el, ctx); };
      var al = el.querySelector('[data-all]'); if (al) al.onclick = function () { el._to = v.maxTo; game.render(v, el, ctx); };
      var nx = el.querySelector('[data-next]'); if (nx) nx.onclick = function () { ctx.act({ next: 1 }); };
    },
    share: function (s, ov) { return '🃏 ניצחתי בפוקר על נקודות (בלי כסף!) עם ' + ov.text + '.\nבחינם ובלי פרסומות. בואו לשחק איתי:'; }
  };
  CH.table(game);
})();
