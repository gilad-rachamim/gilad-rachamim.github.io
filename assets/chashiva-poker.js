// פוקר (טקסס הולדם) על נקודות – /kelim/chashiva/poker/
// על נקודות בלבד: בלי כסף אמיתי, בלי הימורים, בלי קישורים לאתרי הימורים.
// הקובץ הזה = המנוע (החוקים, הקופות, המחשב). התצוגה (השולחן, האנימציות, הצלילים) ב-chashiva-poker-ui.js.
// שני סוגי משחק: "טורניר" (1,000 נקודות, בליינדים מוכפלים כל 10 ידיים, אחרון שנשאר מנצח)
// ו"שולחן פתוח" (בליינדים קבועים, מי שנגמרו לו הנקודות מקבל 1,000 חדשות, קמים מתי שרוצים).
// המנוע רץ גם ב-Node לבדיקה: tools/test_poker.mjs
(function (root) {
  'use strict';
  var CH = root.CH || {};
  var START = 1000, SB = 10, EVERY = 10, P15 = [1, 15, 225, 3375, 50625, 759375];
  var CAT = ['קלף גבוה', 'זוג', 'שני זוגות', 'שלישייה', 'רצף', 'צבע', 'פול האוס', 'רביעייה', 'רצף בצבע'];
  // היריבים: לכל אחד שם, דמות וסגנון קבוע (כך לומדים להכיר אותם)
  var BOTS = [
    { n: 'רוני', av: '🐯', p: 'bold' }, { n: 'נועה', av: '🦊', p: 'careful' }, { n: 'איתי', av: '🐻', p: 'normal' },
    { n: 'מאיה', av: '🦉', p: 'bluff' }, { n: 'עומר', av: '🐼', p: 'normal' }, { n: 'שירה', av: '🐱', p: 'bold' }, { n: 'דני', av: '🐨', p: 'careful' }
  ];
  var STYLE = {
    careful: { he: 'זהיר', loose: -0.07, aggr: 0.65, bluff: 0.01 },
    normal: { he: 'רגיל', loose: 0, aggr: 1, bluff: 0.04 },
    bold: { he: 'נועז', loose: 0.06, aggr: 1.45, bluff: 0.07 },
    bluff: { he: 'בלפן', loose: 0.03, aggr: 1.2, bluff: 0.16 }
  };
  var LEVEL = { easy: { it: 50, noise: 0.18, pos: 0 }, normal: { it: 160, noise: 0.08, pos: 0.03 }, hard: { it: 420, noise: 0.03, pos: 0.05 } };

  // העתק של המצב לפני כל מהלך. ההיסטוריה לא משתנה אחרי שנכתבה, לכן מעתיקים רק את הרשימה (מהיר פי כמה)
  function clone(s) { var h = s.hist; s.hist = null; var o = JSON.parse(JSON.stringify(s)); s.hist = h; o.hist = (h || []).slice(); return o; }
  function deck() { var a = []; for (var c = 0; c < 52; c++) a.push(c); return a; }
  function rv(c) { return c % 13 === 0 ? 14 : c % 13 + 1; }
  function suit(c) { return Math.floor(c / 13); }
  // ציון ל-5 קלפים: קטגוריה ואחריה שוברי שוויון, בבסיס 15
  function rank5(cs) {
    var r = cs.map(rv).sort(function (a, b) { return b - a; }), s0 = suit(cs[0]), fl = suit(cs[1]) === s0 && suit(cs[2]) === s0 && suit(cs[3]) === s0 && suit(cs[4]) === s0;
    var u = r.filter(function (x, i) { return r.indexOf(x) === i; }), st = 0;
    if (u.length === 5) { if (r[0] - r[4] === 4) st = r[0]; else if (r[0] === 14 && r[1] === 5) st = 5; }
    var cnt = {}; r.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; });
    var g = Object.keys(cnt).map(Number).sort(function (a, b) { return cnt[b] - cnt[a] || b - a; }), sh = g.map(function (x) { return cnt[x]; });
    var cat = st && fl ? 8 : sh[0] === 4 ? 7 : sh[0] === 3 && sh[1] === 2 ? 6 : fl ? 5 : st ? 4 : sh[0] === 3 ? 3 : sh[0] === 2 && sh[1] === 2 ? 2 : sh[0] === 2 ? 1 : 0;
    var tb = st ? [st] : g; var v = cat; for (var i = 0; i < 5; i++) v = v * 15 + (tb[i] || 0);
    return v;
  }
  // היד הטובה ביותר מ-5 קלפים מתוך 5-7: הציון וחמשת הקלפים
  function bestFive(cs) {
    if (cs.length < 5) return { v: 0, five: [] };
    var b = -1, bf = null, n = cs.length;
    function tryFive(five) { var v = rank5(five); if (v > b) { b = v; bf = five; } }
    if (n === 5) tryFive(cs);
    else if (n === 6) for (var q = 0; q < 6; q++) tryFive(cs.filter(function (x, k) { return k !== q; }));
    else for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) tryFive(cs.filter(function (x, k) { return k !== i && k !== j; }));
    return { v: b, five: bf.slice() };
  }
  function best(cs) { return bestFive(cs).v; }
  function catOf(v) { return CAT[Math.floor(v / P15[5])]; }
  var FACE1 = { 11: 'נסיך', 12: 'מלכה', 13: 'מלך', 14: 'אס' }, FACEN = { 11: 'נסיכים', 12: 'מלכות', 13: 'מלכים', 14: 'אסים' };
  function one(x) { return FACE1[x] || String(x); }
  function many(x) { return FACEN[x] || String(x); }
  // תיאור היד בעברית: "שלישייה של מלכים"
  function describe(v) {
    if (!v) return '';
    var c = Math.floor(v / P15[5]), a = Math.floor(v / P15[4]) % 15, b = Math.floor(v / P15[3]) % 15;
    switch (c) {
      case 0: return 'קלף גבוה: ' + one(a);
      case 1: return 'זוג ' + (a > 10 ? many(a) : 'של ' + a);
      case 2: return 'שני זוגות: ' + many(a) + ' ו-' + many(b);
      case 3: return 'שלישייה של ' + many(a);
      case 4: return 'רצף עד ' + one(a);
      case 5: return 'צבע, ' + one(a) + ' גבוה';
      case 6: return 'פול האוס: ' + many(a) + ' על ' + many(b);
      case 7: return 'רביעייה של ' + many(a);
      default: return a === 14 ? 'רויאל פלאש!' : 'רצף בצבע עד ' + one(a);
    }
  }
  // סיכוי לנצח (מונטה קרלו): היד שלי מול opp יריבים עם קלפים אקראיים. תיקו נספר כחצי.
  function equity(hole, board, opp, iters, rnd) {
    rnd = rnd || Math.random; opp = Math.max(1, opp);
    var known = hole.concat(board), rest = deck().filter(function (c) { return known.indexOf(c) < 0; }), win = 0;
    for (var i = 0; i < iters; i++) {
      var d = rest.slice(), need = 5 - board.length + opp * 2;
      for (var j = 0; j < need; j++) { var x = j + Math.floor(rnd() * (d.length - j)), t = d[j]; d[j] = d[x]; d[x] = t; }
      var bd = board.concat(d.slice(0, 5 - board.length)), me = best(hole.concat(bd)), p = 5 - board.length, res = 1;
      for (var o = 0; o < opp; o++) { var them = best([d[p + o * 2], d[p + o * 2 + 1]].concat(bd)); if (them > me) { res = 0; break; } if (them === me) res = 0.5; }
      win += res;
    }
    return win / iters;
  }
  function preStrength(h) {
    var a = rv(h[0]), b = rv(h[1]), hi = Math.max(a, b), lo = Math.min(a, b), v = hi / 14 * 0.45 + lo / 14 * 0.2;
    if (a === b) v += 0.35 + a / 14 * 0.15; if (suit(h[0]) === suit(h[1])) v += 0.06; if (hi - lo === 1) v += 0.05;
    return Math.min(1, v);
  }

  // ---------- מצב היד ----------
  function alive(s) { var a = []; for (var k = 0; k < s.n; k++) if (s.chips[k] > 0 || s.tot[k] > 0) a.push(k); return a; }
  function inHand(s) { return alive(s).filter(function (k) { return !s.fold[k] && s.inn[k]; }); }
  function nextSeat(s, from, pred) { for (var i = 1; i <= s.n; i++) { var k = (from + i) % s.n; if (pred(k)) return k; } return -1; }
  function canAct(s, k) { return !!s.inn[k] && !s.fold[k] && s.chips[k] > 0; }
  function pot(s) { return s.tot.reduce(function (a, x) { return a + x; }, 0); }
  function blind(s) { return s.mode === 'ring' ? SB : SB * Math.pow(2, Math.floor((Math.max(1, s.hn) - 1) / EVERY)); }
  function isBot(s, k) { return /^🤖/.test(s.nm[k] || ''); }
  function botOf(name) { var n = String(name || '').replace(/^🤖\s*/, ''); for (var i = 0; i < BOTS.length; i++) if (BOTS[i].n === n) return BOTS[i]; return null; }
  function short(s, k) { return String(s.nm[k] || '').replace(/^🤖\s*/, ''); }
  var PH = { pre: 0, flop: 1, turn: 2, river: 3 };
  function note(s, k, a, x) { s.acts.push([PH[s.phase] || 0, k, a, x || 0]); }

  function startHand(s) {
    // מצטרפים חדשים (בשולחן פתוח בחדר) נכנסים בתחילת יד
    (s.pend || []).forEach(function (nm) { s.nm.push(nm); s.chips.push(START); s.rebuy.push(0); s.pers.push(''); s.n++; s.log.push('👋 ' + nm.replace(/^🤖\s*/, '') + ' הצטרף/ה לשולחן'); });
    s.pend = [];
    if (s.mode === 'ring') for (var q = 0; q < s.n; q++) if (s.chips[q] <= 0) { s.chips[q] = START; s.rebuy[q]++; s.log.push('🔄 ' + short(s, q) + ' קיבל/ה ' + START.toLocaleString('he-IL') + ' נקודות חדשות'); }
    s.hn++; s.board = []; s.fold = []; s.inn = []; s.bet = []; s.tot = []; s.hole = []; s.reveal = null; s.acted = []; s.cap = []; s.last = []; s.res = null; s.acts = [];
    for (var k = 0; k < s.n; k++) { s.inn.push(s.chips[k] > 0); s.fold.push(false); s.bet.push(0); s.tot.push(0); s.hole.push([]); s.acted.push(false); s.cap.push(false); s.last.push(''); }
    s.deck = s.rig ? s.rig.slice() : CH.shuffle(deck(), CH.rng(s.seed + ':' + s.hn));
    s.btn = nextSeat(s, s.btn, function (k) { return s.inn[k]; });
    var ppl = s.inn.filter(Boolean).length, sb = blind(s);
    var sbS = ppl === 2 ? s.btn : nextSeat(s, s.btn, function (k) { return s.inn[k]; }), bbS = nextSeat(s, sbS, function (k) { return s.inn[k]; });
    s.sbS = sbS; s.bbS = bbS;
    put(s, sbS, Math.min(sb, s.chips[sbS])); put(s, bbS, Math.min(sb * 2, s.chips[bbS]));
    for (var r = 0; r < 2; r++) for (var j = 0; j < s.n; j++) if (s.inn[j]) s.hole[j].push(s.deck.shift());
    s.cur = sb * 2; s.minR = sb * 2; s.phase = 'pre';
    s.t = nextSeat(s, bbS, function (k) { return canAct(s, k); });
    s.log.push('🃏 יד ' + s.hn + ' · בליינדים ' + sb + '/' + sb * 2);
    if (s.t < 0 || needsNoAction(s)) runOut(s);
  }
  function put(s, k, x) { x = Math.min(x, s.chips[k]); s.chips[k] -= x; s.bet[k] += x; s.tot[k] += x; return x; }
  function needsNoAction(s) { var can = inHand(s).filter(function (k) { return s.chips[k] > 0; }); return can.length <= 1 && can.every(function (k) { return s.bet[k] >= s.cur; }); }
  function streetDone(s) { return inHand(s).every(function (k) { return s.chips[k] === 0 || (s.acted[k] && s.bet[k] === s.cur); }); }
  function nextStreet(s) {
    for (var k = 0; k < s.n; k++) { s.bet[k] = 0; s.acted[k] = false; s.cap[k] = false; if (s.last[k] !== 'fold' && s.last[k] !== 'allin') s.last[k] = ''; }
    s.cur = 0; s.minR = blind(s) * 2;
    if (s.phase === 'pre') { s.board.push(s.deck.shift(), s.deck.shift(), s.deck.shift()); s.phase = 'flop'; }
    else if (s.phase === 'flop') { s.board.push(s.deck.shift()); s.phase = 'turn'; }
    else if (s.phase === 'turn') { s.board.push(s.deck.shift()); s.phase = 'river'; }
    else return showdown(s);
    if (needsNoAction(s)) return runOut(s);
    s.t = nextSeat(s, s.btn, function (k) { return canAct(s, k); });
  }
  function runOut(s) { while (s.board.length < 5) s.board.push(s.deck.shift()); s.phase = 'river'; showdown(s); }
  // הימור שאף אחד לא השווה חוזר למי ששם אותו (ולא נספר כ"זכייה")
  function returnUncalled(s) {
    var top = -1, k1 = -1, second = 0;
    for (var k = 0; k < s.n; k++) { if (s.tot[k] > top) { second = Math.max(second, top); top = s.tot[k]; k1 = k; } else second = Math.max(second, s.tot[k]); }
    if (k1 < 0 || top <= second) return null;
    var back = top - second; s.tot[k1] -= back; s.bet[k1] = Math.max(0, s.bet[k1] - back); s.chips[k1] += back;
    s.log.push('↩️ ' + short(s, k1) + ': הוחזרו ' + back);
    return { k: k1, x: back };
  }
  // קופה ראשית וקופות צד, לפי שכבות של כמה כל אחד שם
  function layers(s, players) {
    var levels = s.tot.filter(function (x, i, arr) { return x > 0 && arr.indexOf(x) === i; }).sort(function (x, y) { return x - y; }), prev = 0, out = [];
    levels.forEach(function (L) {
      var piece = 0; s.tot.forEach(function (x) { piece += Math.max(0, Math.min(x, L) - prev); });
      var elig = players.filter(function (k) { return s.tot[k] >= L; });
      var last = out[out.length - 1];
      if (last && last.elig.join() === elig.join()) { last.amt += piece; last.L = L; } else out.push({ amt: piece, elig: elig, L: L });
      prev = L;
    });
    return out;
  }
  function showdown(s) {
    var ret = returnUncalled(s), players = inHand(s), score = {}, five = {}, lines = [];
    var show = players.length > 1;
    players.forEach(function (k) { var b = bestFive(s.hole[k].concat(s.board)); score[k] = b.v; five[k] = b.five; });
    var won = new Array(s.n).fill(0), pots = [];
    // מחלקים לפי הסדר אחרי הכפתור (השארית לראשון)
    var order = []; for (var i = 1; i <= s.n; i++) order.push((s.btn + i) % s.n);
    layers(s, players).forEach(function (P) {
      var elig = P.elig;
      if (!elig.length) { var back = []; s.tot.forEach(function (x, k) { if (x >= P.L) back.push(k); }); back.forEach(function (k, i) { won[k] += Math.floor(P.amt / back.length) + (i ? 0 : P.amt % back.length); }); return; }
      var top = Math.max.apply(null, elig.map(function (k) { return score[k]; })), ws = order.filter(function (k) { return elig.indexOf(k) >= 0 && score[k] === top; });
      ws.forEach(function (k, i) { won[k] += Math.floor(P.amt / ws.length) + (i ? 0 : P.amt % ws.length); });
      pots.push({ amt: P.amt, w: ws, cat: show ? describe(top) : '' });
    });
    won.forEach(function (x, k) { if (x) { s.chips[k] += x; lines.push(short(s, k) + ' +' + x + (show ? ' (' + describe(score[k]) + ')' : '')); } });
    s.reveal = show ? players.reduce(function (o, k) { o[k] = s.hole[k]; return o; }, {}) : null;
    var allWin = []; won.forEach(function (x, k) { if (x) allWin.push(k); });
    var cats = show ? players.reduce(function (o, k) { o[k] = describe(score[k]); return o; }, {}) : {};
    s.res = { won: won, pots: pots, show: show, five: show ? five : {}, cat: cats, w: allWin, ret: ret };
    s.log.push('🏆 ' + lines.join(' · '));
    s.hist.push({ hn: s.hn, board: s.board.slice(), holes: s.hole.map(function (h) { return h.slice(); }), shown: show ? players.slice() : [], won: won.slice(), cat: cats, acts: s.acts.slice(), nm: s.nm.slice(), pot: pots.reduce(function (a, p) { return a + p.amt; }, 0), best: show ? score : {} });
    if (s.hist.length > 20) s.hist.shift();
    for (var k = 0; k < s.n; k++) s.tot[k] = 0;
    s.phase = 'show';
    // מי ממשיך ליד הבאה: האדם הראשון שעוד במשחק (בשולחן פתוח – תמיד יש)
    var hum = []; for (var h = 0; h < s.n; h++) if (!isBot(s, h) && (s.mode === 'ring' || s.chips[h] > 0)) hum.push(h);
    s.t = hum.length ? hum[0] : alive(s).filter(function (k) { return s.chips[k] > 0; })[0] || 0;
  }
  // קופות צד בזמן היד (לתצוגה)
  function livePots(s) {
    var players = inHand(s); if (!players.some(function (k) { return s.chips[k] === 0; })) return [pot(s)];
    var caps = players.filter(function (k) { return s.chips[k] === 0; }).map(function (k) { return s.tot[k]; }).sort(function (a, b) { return a - b; }), prev = 0, out = [];
    caps.concat([Infinity]).forEach(function (cap) {
      if (cap === prev) return;
      var piece = 0; s.tot.forEach(function (x) { piece += Math.max(0, Math.min(x, cap) - prev); });
      if (piece > 0) out.push(piece); prev = cap;
    });
    return out.length ? out : [pot(s)];
  }

  // ---------- המחשב ----------
  function botAct(s, k, rnd) {
    rnd = rnd || Math.random;
    if (s.phase === 'show') return { next: 1 };
    var B = botOf(s.nm[k]), P = STYLE[(s.pers && s.pers[k]) || (B && B.p) || 'normal'], L = LEVEL[s.lvl] || LEVEL.normal;
    var call = s.cur - s.bet[k], p = pot(s), opp = inHand(s).length - 1;
    var eq = s.board.length ? equity(s.hole[k], s.board, opp, L.it, rnd) : preStrength(s.hole[k]) * (opp > 2 ? 0.8 : 1);
    eq += (rnd() - 0.5) * 2 * L.noise + P.loose;
    // מיקום: מי שפועל אחרון בסיבוב יודע יותר
    var after = 0; for (var i = 1; i < s.n; i++) { var q = (k + i) % s.n; if (canAct(s, q) && !(s.acted[q] && s.bet[q] === s.cur)) after++; if (q === s.btn) break; }
    if (after === 0) eq += L.pos;
    var odds = call / (p + call || 1), r = rnd();
    var canRaise = !s.cap[k] && s.bet[k] + s.chips[k] > s.cur;
    var hiT = 0.74 - (P.aggr - 1) * 0.08;
    if (canRaise && (eq > hiT || (eq > hiT - 0.17 && r < 0.3 * P.aggr) || (call === 0 && r < P.bluff) || (s.board.length >= 3 && call <= p * 0.5 && r < P.bluff / 2))) {
      var f = [0.5, 0.66, 0.75, 1][Math.floor(rnd() * 4)] * (eq > 0.85 ? 1.3 : 1);
      var to = s.cur + Math.max(s.minR, Math.floor(p * f / 10) * 10);
      if (eq > 0.9 && rnd() < 0.25) to = s.bet[k] + s.chips[k];
      return { a: 'raise', to: to };
    }
    if (call === 0) return { a: 'check' };
    if (eq > odds + 0.07 - P.loose / 2 || (call <= blind(s) * 2 && eq > 0.3 - P.loose)) return { a: 'call' };
    return { a: 'fold' };
  }

  function act(s0, seat, a) {
    var s = clone(s0);
    a = a || {};
    if (a.a === 'stand') { if (s.mode !== 'ring') return 'רק בשולחן פתוח'; s.stood = true; s.log.push('🚪 קמים מהשולחן'); return s; }
    if (a.a === 'show') {
      if (s.phase !== 'show' || !s.res || s.res.show || !s.hole[seat] || !s.hole[seat].length || (s.reveal && s.reveal[seat])) return 'אין מה להראות עכשיו';
      s.reveal = s.reveal || {}; s.reveal[seat] = s.hole[seat];
      var hi = s.hist.length - 1, hh = s.hist[hi];
      if (hh && hh.hn === s.hn && hh.shown.indexOf(seat) < 0) { hh = Object.assign({}, hh, { shown: hh.shown.concat([seat]) }); s.hist[hi] = hh; }
      s.log.push('👀 ' + short(s, seat) + ' הראה/תה את הקלפים'); return s;
    }
    if (s.phase === 'show') { if (!a.next) return 'ממשיכים ליד הבאה'; startHand(s); return s; }
    if (seat < 0 || seat >= s.n || !canAct(s, seat)) return 'עכשיו לא התור שלכם';
    var call = s.cur - s.bet[seat], nm = short(s, seat);
    if (a.a === 'fold') { s.fold[seat] = true; s.last[seat] = 'fold'; note(s, seat, 'f'); s.log.push('🙅 ' + nm + ': מקפלים'); }
    else if (a.a === 'check') { if (call > 0) return 'אי אפשר צ׳ק – יש הימור. משווים או מקפלים'; s.last[seat] = 'check'; note(s, seat, 'x'); s.log.push('✋ ' + nm + ': צ׳ק'); }
    else if (a.a === 'call') {
      if (call <= 0) return 'אין מה להשוות – אפשר צ׳ק';
      var paid = put(s, seat, call); s.last[seat] = s.chips[seat] ? 'call' : 'allin'; note(s, seat, 'c', paid);
      s.log.push('🪙 ' + nm + ': משווים ' + paid + (s.chips[seat] ? '' : ' (הכול!)'));
    } else if (a.a === 'raise') {
      if (s.cap[seat]) return 'אי אפשר להעלות שוב בסיבוב הזה (ההעלאה האחרונה הייתה קטנה). משווים או מקפלים';
      var to = Math.floor(+a.to || 0), max = s.bet[seat] + s.chips[seat];
      if (to > max) to = max;
      if (max <= s.cur) return 'אין מספיק נקודות להעלות – אפשר להשוות בכל הנקודות';
      if (to < s.cur + s.minR && to < max) return 'העלאה מינימלית: ל-' + (s.cur + s.minR);
      if (to <= s.cur) return 'העלאה חייבת להיות גבוהה מ-' + s.cur;
      var full = to - s.cur >= s.minR, wasBet = s.cur === 0;
      if (full) s.minR = to - s.cur;
      put(s, seat, to - s.bet[seat]);
      // העלאה מלאה פותחת מחדש את ההימורים לכולם; אול-אין קטן – מי שכבר פעל רק משווה או מקפל
      for (var k = 0; k < s.n; k++) if (k !== seat) { if (full) { s.acted[k] = false; s.cap[k] = false; } else if (s.acted[k]) s.cap[k] = true; }
      s.cur = to;
      s.last[seat] = s.chips[seat] ? (wasBet ? 'bet' : 'raise') : 'allin'; note(s, seat, 'r', to);
      s.log.push('⬆️ ' + nm + ': ' + (wasBet ? 'מהמרים ' : 'מעלים ל-') + to + (s.chips[seat] ? '' : ' (הכול!)'));
    } else return 'פעולה לא מוכרת';
    s.acted[seat] = true;
    var left = inHand(s);
    if (left.length === 1) { showdown(s); return s; }
    if (streetDone(s)) nextStreet(s);
    else s.t = nextSeat(s, seat, function (k) { return canAct(s, k) && !(s.acted[k] && s.bet[k] === s.cur); });
    return s;
  }
  function init(seed, n, names, o) {
    o = o || {};
    var s = { seed: seed, n: n, nm: names.slice(), chips: new Array(n).fill(START), hn: 0, btn: n - 1, log: [], hist: [], mode: o.mode === 'ring' ? 'ring' : 'tour', lvl: LEVEL[o.lvl] ? o.lvl : 'normal', rebuy: new Array(n).fill(0), pend: [] };
    s.pers = names.map(function (nm) { var b = botOf(nm); return b && /^🤖/.test(nm) ? b.p : ''; });
    if (o.chips) s.chips = o.chips.slice(); // לבדיקות בלבד: נקודות וחפיסה קבועות
    if (o.rig) s.rig = o.rig.slice();
    startHand(s); return s;
  }
  function over(s) {
    if (s.mode === 'ring') {
      if (!s.stood) return null;
      var net = s.chips.map(function (c, k) { return c - START * (1 + (s.rebuy[k] || 0)); }), top = Math.max.apply(null, net), w = [];
      net.forEach(function (x, k) { if (x === top) w.push(k); });
      return { w: w, ring: true, net: net, text: 'סיכום השולחן: ' + s.nm.map(function (nm, k) { return short(s, k) + ' ' + (net[k] >= 0 ? '+' : '−') + Math.abs(net[k]).toLocaleString('he-IL'); }).join(' · ') };
    }
    var al = []; for (var k = 0; k < s.n; k++) if (s.chips[k] > 0) al.push(k);
    if (s.phase !== 'show') return null;
    var hum = al.filter(function (k) { return !isBot(s, k); }), anyHuman = s.nm.some(function (x, k) { return !isBot(s, k); });
    if (al.length <= 1 || (anyHuman && !hum.length)) { var t2 = Math.max.apply(null, s.chips), w2 = []; s.chips.forEach(function (c, k) { if (c === t2) w2.push(k); }); return { w: w2, text: t2.toLocaleString('he-IL') + ' נקודות' }; }
    return null;
  }
  function view(s, seat) {
    var me = seat >= 0 && seat < s.n ? seat : -1, call = me >= 0 ? Math.min(s.cur - s.bet[me], s.chips[me]) : 0;
    var mineV = me >= 0 && s.hole[me].length ? best(s.hole[me].concat(s.board)) : 0;
    var res = s.res ? { won: s.res.won, pots: s.res.pots, show: s.res.show, w: s.res.w, ret: s.res.ret, five: s.res.five, cat: s.res.cat } : null;
    var hist = s.hist.map(function (h) {
      var holes = {}; h.shown.forEach(function (k) { holes[k] = h.holes[k]; }); if (me >= 0 && h.holes[me] && h.holes[me].length) holes[me] = h.holes[me];
      return { hn: h.hn, board: h.board, holes: holes, won: h.won, cat: h.cat, acts: h.acts, nm: h.nm, pot: h.pot, shown: h.shown, myBest: me >= 0 && h.best ? h.best[me] || 0 : 0 };
    });
    return {
      id: s.seed, n: s.n, nm: s.nm, seat: me, hole: me >= 0 ? s.hole[me] : [], board: s.board, chips: s.chips, bet: s.bet, fold: s.fold, inn: s.inn, btn: s.btn, sbS: s.sbS, bbS: s.bbS,
      phase: s.phase, pot: pot(s), pots: s.phase === 'show' ? [] : livePots(s), reveal: s.reveal, t: s.t, hn: s.hn, last: s.last, cards: s.hole.map(function (h) { return h.length; }),
      call: call, minTo: s.cur + s.minR, maxTo: me >= 0 ? s.bet[me] + s.chips[me] : 0, cur: s.cur, mybet: me >= 0 ? s.bet[me] : 0, blind: blind(s), canRaise: me >= 0 && !s.cap[me] && s.bet[me] + s.chips[me] > s.cur,
      mode: s.mode, lvl: s.lvl, every: EVERY, nextUp: s.mode === 'ring' ? 0 : EVERY - ((s.hn - 1) % EVERY), rebuy: s.rebuy, start: START, pend: (s.pend || []).length, stood: !!s.stood,
      mine: mineV && s.board.length >= 3 ? describe(mineV) : '', mineV: mineV, opp: inHand(s).length - 1,
      res: res, hist: hist, log: s.log.slice(-6), score: 'קופה: ' + pot(s) + ' · יד ' + s.hn, pers: s.pers || []
    };
  }
  // הצטרפות באמצע (שולחן פתוח בלבד): נכנסים ביד הבאה
  function join(s0, name) {
    if (s0.mode !== 'ring') return 'בטורניר אי אפשר להצטרף באמצע – צופים עד הסוף';
    if (s0.n + (s0.pend || []).length >= 8) return 'השולחן מלא';
    var s = clone(s0); s.pend = s.pend || []; s.pend.push(name); return { st: s, seat: s.n + s.pend.length - 1 };
  }

  root.PKE = {
    START: START, BOTS: BOTS, STYLE: STYLE, LEVEL: LEVEL, CAT: CAT,
    rank5: rank5, best: best, bestFive: bestFive, describe: describe, catOf: catOf, equity: equity, preStrength: preStrength,
    init: init, act: act, view: view, over: over, bot: botAct, join: join, pot: pot, inHand: inHand, blind: blind, botOf: botOf
  };

  if (typeof document === 'undefined' || !document.getElementById('tb') || !CH.table) return;
  var UI = root.PKUI;
  var game = {
    g: 'poker', tool: 'chashiva_poker', name: 'פוקר', minP: 2, maxP: 8, defP: 4, botDelay: 900,
    botNames: BOTS.map(function (b) { return b.n; }),
    botDelayFor: function (s) { return s.phase === 'show' ? 3500 : 700 + Math.floor(Math.random() * 1500); },
    init: function (seed, n, names) { return init(seed, n, names, UI ? UI.opts() : {}); },
    turn: function (s) { return s.t; },
    anyTurn: function (s, seat, a) { return !!a && (a.a === 'stand' || a.a === 'show'); },
    over: over, view: view, act: act,
    bot: function (s, k) { return botAct(s, k); },
    join: join,
    timeoutAct: function (s, k) { return s.phase === 'show' ? { next: 1 } : s.cur - s.bet[k] > 0 ? { a: 'fold' } : { a: 'check' }; },
    turnSec: 30, reconnect: true, liveSeats: true,
    render: function (v, el, ctx) { if (UI) UI.render(v, el, ctx); },
    onMsg: function (d, seat) { if (UI && UI.onMsg) UI.onMsg(d, seat); },
    lobbyExtra: function (el, isHost) { if (UI && UI.lobby) UI.lobby(el, isHost); },
    share: function (s, ov) { return '🃏 ניצחתי בפוקר על נקודות (בלי כסף!) עם ' + ov.text + '.\nבחינם ובלי פרסומות. בואו לשחק איתי:'; }
  };
  if (UI && UI.setup) UI.setup(game);
  CH.table(game);
})(typeof window !== 'undefined' ? window : globalThis);
