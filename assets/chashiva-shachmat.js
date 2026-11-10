// שחמט – /kelim/chashiva/shachmat/
// שלוש דרכים לשחק: מול המחשב (שלוש רמות), עם חבר בקישור (כל מהלך נשלח בווטסאפ, בלי שרת),
// ושניים על טלפון אחד. כל החוקים: הצרחה, הכאה דרך הילוכו, הכתרה, שח-מט, פט ותיקו.
(function () {
  'use strict';
  var CH = window.CH, TOOL = 'chashiva_shachmat', G = 'shachmat';
  function $(id) { return document.getElementById(id); }
  if (!$('sm-board')) return;

  // ---------- מנוע ----------
  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var FILES = 'abcdefgh';
  function isW(p) { return p && p === p.toUpperCase(); }
  function sqName(i) { return FILES[i % 8] + (8 - Math.floor(i / 8)); }
  function parse(fen) {
    var f = String(fen || '').trim().split(/\s+/); if (f.length < 4) return null;
    var rows = f[0].split('/'); if (rows.length !== 8) return null;
    var b = [];
    for (var r = 0; r < 8; r++) for (var k = 0; k < rows[r].length; k++) {
      var ch = rows[r][k];
      if (/[1-8]/.test(ch)) for (var e = 0; e < +ch; e++) b.push('');
      else if (/[pnbrqkPNBRQK]/.test(ch)) b.push(ch); else return null;
    }
    if (b.length !== 64 || b.indexOf('K') < 0 || b.indexOf('k') < 0) return null;
    var ep = f[3] === '-' ? -1 : FILES.indexOf(f[3][0]) + (8 - +f[3][1]) * 8;
    return { b: b, w: f[1] !== 'b', c: f[2] === '-' ? '' : f[2].replace(/[^KQkq]/g, ''), ep: ep, h: +f[4] || 0, n: +f[5] || 1 };
  }
  function fen(s) {
    var out = '';
    for (var r = 0; r < 8; r++) {
      var e = 0;
      for (var c = 0; c < 8; c++) { var p = s.b[r * 8 + c]; if (!p) e++; else { if (e) { out += e; e = 0; } out += p; } }
      if (e) out += e; if (r < 7) out += '/';
    }
    return out + ' ' + (s.w ? 'w' : 'b') + ' ' + (s.c || '-') + ' ' + (s.ep >= 0 ? sqName(s.ep) : '-') + ' ' + s.h + ' ' + s.n;
  }
  var KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  var KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var DI = [[-1, -1], [-1, 1], [1, -1], [1, 1]], OR = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  function at(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8 ? r * 8 + c : -1; }
  // האם המשבצת מאוימת ע"י הצד byW
  function attacked(b, sq, byW) {
    var r = sq >> 3, c = sq & 7, i, j, p;
    var pr = byW ? r + 1 : r - 1, pp = byW ? 'P' : 'p';
    if ((j = at(pr, c - 1)) >= 0 && b[j] === pp) return true;
    if ((j = at(pr, c + 1)) >= 0 && b[j] === pp) return true;
    for (i = 0; i < 8; i++) { j = at(r + KN[i][0], c + KN[i][1]); if (j >= 0 && b[j] === (byW ? 'N' : 'n')) return true; }
    for (i = 0; i < 8; i++) { j = at(r + KG[i][0], c + KG[i][1]); if (j >= 0 && b[j] === (byW ? 'K' : 'k')) return true; }
    function ray(dirs, a, q) {
      for (var d = 0; d < 4; d++) for (var s = 1; s < 8; s++) {
        var t = at(r + dirs[d][0] * s, c + dirs[d][1] * s); if (t < 0) break; p = b[t];
        if (p) { if (p === (byW ? a : a.toLowerCase()) || p === (byW ? q : q.toLowerCase())) return true; break; }
      }
      return false;
    }
    return ray(DI, 'B', 'Q') || ray(OR, 'R', 'Q');
  }
  function kingSq(b, w) { return b.indexOf(w ? 'K' : 'k'); }
  function inCheck(s) { return attacked(s.b, kingSq(s.b, s.w), !s.w); }
  function pseudo(s) {
    var b = s.b, w = s.w, out = [];
    function add(f, t, x) { var m = { f: f, t: t }; if (x) for (var k in x) m[k] = x[k]; out.push(m); }
    for (var f = 0; f < 64; f++) {
      var p = b[f]; if (!p || isW(p) !== w) continue;
      var r = f >> 3, c = f & 7, u = p.toUpperCase(), t, i, s2;
      if (u === 'P') {
        var dr = w ? -1 : 1, last = w ? 0 : 7, home = w ? 6 : 1;
        t = at(r + dr, c);
        if (t >= 0 && !b[t]) {
          if ((t >> 3) === last) 'QRBN'.split('').forEach(function (q) { add(f, t, { p: q }); }); else add(f, t);
          var t2 = at(r + 2 * dr, c); if (r === home && !b[t2]) add(f, t2, { dbl: 1 });
        }
        [-1, 1].forEach(function (dc) {
          var x = at(r + dr, c + dc); if (x < 0) return;
          if (b[x] && isW(b[x]) !== w) { if ((x >> 3) === last) 'QRBN'.split('').forEach(function (q) { add(f, x, { p: q }); }); else add(f, x); }
          else if (x === s.ep) add(f, x, { ep: 1 });
        });
      } else if (u === 'N' || u === 'K') {
        var L = u === 'N' ? KN : KG;
        for (i = 0; i < 8; i++) { t = at(r + L[i][0], c + L[i][1]); if (t >= 0 && (!b[t] || isW(b[t]) !== w)) add(f, t); }
        if (u === 'K') {
          var row = w ? 7 : 0, KS = w ? 'K' : 'k', QS = w ? 'Q' : 'q';
          if (f === row * 8 + 4 && !attacked(b, f, !w)) {
            if (s.c.indexOf(KS) >= 0 && !b[f + 1] && !b[f + 2] && b[f + 3] === (w ? 'R' : 'r') && !attacked(b, f + 1, !w) && !attacked(b, f + 2, !w)) add(f, f + 2, { cs: 'k' });
            if (s.c.indexOf(QS) >= 0 && !b[f - 1] && !b[f - 2] && !b[f - 3] && b[f - 4] === (w ? 'R' : 'r') && !attacked(b, f - 1, !w) && !attacked(b, f - 2, !w)) add(f, f - 2, { cs: 'q' });
          }
        }
      } else {
        var dirs = u === 'B' ? DI : u === 'R' ? OR : DI.concat(OR);
        for (i = 0; i < dirs.length; i++) for (s2 = 1; s2 < 8; s2++) {
          t = at(r + dirs[i][0] * s2, c + dirs[i][1] * s2); if (t < 0) break;
          if (!b[t]) add(f, t); else { if (isW(b[t]) !== w) add(f, t); break; }
        }
      }
    }
    return out;
  }
  function play(s, m) {
    var b = s.b.slice(), p = b[m.f], cap = b[m.t], w = s.w;
    b[m.t] = m.p ? (w ? m.p : m.p.toLowerCase()) : p; b[m.f] = '';
    if (m.ep) { cap = b[m.t + (w ? 8 : -8)]; b[m.t + (w ? 8 : -8)] = ''; }
    if (m.cs === 'k') { b[m.t - 1] = b[m.t + 1]; b[m.t + 1] = ''; }
    if (m.cs === 'q') { b[m.t + 1] = b[m.t - 2]; b[m.t - 2] = ''; }
    var c = s.c;
    if (p === 'K') c = c.replace(/[KQ]/g, ''); if (p === 'k') c = c.replace(/[kq]/g, '');
    [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']].forEach(function (x) { if (m.f === x[0] || m.t === x[0]) c = c.replace(x[1], ''); });
    return { b: b, w: !w, c: c, ep: m.dbl ? (m.f + m.t) / 2 : -1, h: (p.toUpperCase() === 'P' || cap) ? 0 : s.h + 1, n: s.n + (w ? 0 : 1), cap: cap || '' };
  }
  function legal(s) { return pseudo(s).filter(function (m) { var n = play(s, m); return !attacked(n.b, kingSq(n.b, s.w), !s.w); }); }
  function material(b) { var o = {}; b.forEach(function (p) { if (p) o[p] = (o[p] || 0) + 1; }); return o; }
  function insufficient(b) {
    var m = material(b), n = 0; for (var k in m) if (k !== 'K' && k !== 'k') { if (/[pPrRqQ]/.test(k)) return false; n += m[k]; }
    return n <= 1;
  }
  function posKey(s) { return fen(s).split(' ').slice(0, 4).join(' '); }
  // מצב המשחק: null = ממשיכים
  function outcome(s, hist) {
    var L = legal(s);
    if (!L.length) return inCheck(s) ? { r: s.w ? 'b' : 'w', why: 'mate' } : { r: 'd', why: 'stale' };
    if (insufficient(s.b)) return { r: 'd', why: 'material' };
    if (s.h >= 100) return { r: 'd', why: 'fifty' };
    if (hist) { var k = posKey(s), n = 0; hist.forEach(function (x) { if (x === k) n++; }); if (n >= 3) return { r: 'd', why: 'rep' }; }
    return null;
  }

  // ---------- המחשב: חיפוש אלפא-בטא עם טבלאות מיקום ----------
  var VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
  var PST = {
    P: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    R: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    K: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
  };
  function evalW(b) { // מנקודת המבט של לבן
    var v = 0;
    for (var i = 0; i < 64; i++) { var p = b[i]; if (!p) continue; var u = p.toUpperCase(); if (isW(p)) v += VAL[u] + PST[u][i]; else v -= VAL[u] + PST[u][(7 - (i >> 3)) * 8 + (i & 7)]; }
    return v;
  }
  function order(s, L) {
    return L.map(function (m) { var c = s.b[m.t]; m._o = (c ? 10 * VAL[c.toUpperCase()] - VAL[s.b[m.f].toUpperCase()] / 10 + 1000 : 0) + (m.p === 'Q' ? 900 : 0); return m; }).sort(function (a, b) { return b._o - a._o; });
  }
  var nodes = 0;
  function quiesce(s, a, bt, d) {
    var stand = (s.w ? 1 : -1) * evalW(s.b); if (stand >= bt) return bt; if (stand > a) a = stand; if (d <= 0) return a;
    var L = order(s, legal(s).filter(function (m) { return s.b[m.t] || m.ep; }));
    for (var i = 0; i < L.length; i++) { var v = -quiesce(play(s, L[i]), -bt, -a, d - 1); if (v >= bt) return bt; if (v > a) a = v; }
    return a;
  }
  function search(s, depth, a, bt, ply) {
    nodes++;
    var L = legal(s);
    if (!L.length) return inCheck(s) ? -100000 + ply : 0;
    if (s.h >= 100 || insufficient(s.b)) return 0;
    if (depth <= 0) return quiesce(s, a, bt, 4);
    L = order(s, L);
    for (var i = 0; i < L.length; i++) { var v = -search(play(s, L[i]), depth - 1, -bt, -a, ply + 1); if (v >= bt) return bt; if (v > a) a = v; }
    return a;
  }
  var LEVELS = { 1: { name: 'קל', depth: 1, noise: 160 }, 2: { name: 'בינוני', depth: 2, noise: 25 }, 3: { name: 'קשה', depth: 3, noise: 0 } };
  function botMove(s, lv, hist) {
    var L = order(s, legal(s)), L0 = LEVELS[lv], best = null, bv = -Infinity, rnd = Math.random;
    nodes = 0;
    for (var i = 0; i < L.length; i++) {
      var n = play(s, L[i]), v = -search(n, L0.depth - 1, -Infinity, Infinity, 1);
      if (hist && v > -50 && hist.indexOf(posKey(n)) >= 0) v -= 30; // לא לחזור על עמדות סתם
      v += (rnd() - 0.5) * L0.noise;
      if (v > bv) { bv = v; best = L[i]; }
    }
    return best;
  }

  // ---------- תצוגה ----------
  var GL = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
  var NAMES = { K: 'מלך', Q: 'מלכה', R: 'צריח', B: 'רץ', N: 'פרש', P: 'רגלי' };
  function glyph(p) { return '<span class="pc ' + (isW(p) ? 'w' : 'b') + '">' + GL[p.toUpperCase()] + '︎</span>'; }
  var data = CH.load(G); data.lv = LEVELS[data.lv] ? data.lv : 1; data.col = data.col === 'b' ? 'b' : 'w';
  var mode = 'bot', S = parse(START), hist = [], undo = [], sel = -1, last = null, over = null, flip = false, busy = false, friend = null, pendingPromo = null, started = false;
  var clock = CH.clock(null);
  function persist() {
    var d = CH.load(G); d.lv = data.lv; d.col = data.col; d.autoflip = data.autoflip ? 1 : 0;
    d.cur = d.cur || {}; d.cur[mode] = { z: fen(S), h: hist.slice(-60), l: last, over: over, fr: friend, sec: clock.sec };
    CH.save(G, d);
  }
  function myColor() { return mode === 'bot' ? data.col : mode === 'friend' ? (friend ? friend.me : 'w') : (S.w ? 'w' : 'b'); }
  function canMove() {
    if (over || busy || pendingPromo) return false;
    if (mode === 'phone') return true;
    if (mode === 'friend') return friend && !friend.sent && (S.w ? 'w' : 'b') === friend.me;
    return (S.w ? 'w' : 'b') === data.col;
  }
  function draw() {
    var view = mode === 'phone' ? (data.autoflip && !S.w) : myColor() === 'b';
    flip = view;
    var L = sel >= 0 ? legal(S).filter(function (m) { return m.f === sel; }) : [];
    var tgt = {}; L.forEach(function (m) { tgt[m.t] = 1; });
    var chk = inCheck(S) ? kingSq(S.b, S.w) : -1, h = '';
    for (var k = 0; k < 64; k++) {
      var i = flip ? 63 - k : k, r = i >> 3, c = i & 7, p = S.b[i];
      var cls = ((r + c) % 2 ? 'dk' : 'lt') + (i === sel ? ' sel' : '') + (last && (i === last[0] || i === last[1]) ? ' last' : '') + (i === chk ? ' chk' : '') + (tgt[i] ? (p ? ' cap' : ' dot') : '');
      var lab = ((k & 7) === 0 ? '<i class="rk">' + (8 - r) + '</i>' : '') + (k >= 56 ? '<i class="fl">' + FILES[c] + '</i>' : '');
      h += '<button type="button" data-i="' + i + '" class="' + cls + '" aria-label="' + sqName(i) + (p ? ' ' + (isW(p) ? 'לבן' : 'שחור') + ' ' + NAMES[p.toUpperCase()] : '') + '">' + lab + (p ? glyph(p) : '') + '</button>';
    }
    $('sm-board').innerHTML = h;
    $('sm-board').classList.toggle('won', !!over);
    // שבויים
    var m = material(S.b), lost = { w: '', b: '' };
    'QRBNP'.split('').forEach(function (u) { var full = { Q: 1, R: 2, B: 2, N: 2, P: 8 }[u]; for (var x = 0; x < full - (m[u] || 0); x++) lost.w += GL[u] + '︎'; for (x = 0; x < full - (m[u.toLowerCase()] || 0); x++) lost.b += GL[u] + '︎'; });
    $('sm-capt').innerHTML = '<span class="pcs w">' + lost.b + '</span><span class="pcs b">' + lost.w + '</span>';
    status();
    $('sm-undo').hidden = mode === 'friend' || !undo.length || !!over;
    $('sm-flip').hidden = mode !== 'phone';
    $('sm-flip').classList.toggle('on', !!data.autoflip);
  }
  function who(w) { return w ? 'לבן' : 'שחור'; }
  function status() {
    var t;
    if (over) t = over.r === 'd' ? '🤝 תיקו' : '🏁 ' + who(over.r === 'w') + ' ניצח';
    else if (busy) t = '🤖 המחשב חושב…';
    else if (mode === 'friend' && friend && friend.sent) t = '📨 נשלח. מחכים למהלך של ' + (friend.op || 'החבר');
    else if (mode === 'friend' && friend && (S.w ? 'w' : 'b') !== friend.me) t = '⏳ התור של ' + (friend.op || 'החבר');
    else t = (mode === 'phone' ? 'התור של ' + who(S.w) : 'התור שלכם (' + who(S.w) + ')') + (inCheck(S) ? ' · ⚠️ שח!' : '');
    $('sm-status').textContent = t;
  }
  function say(t) { $('sm-msg').textContent = t || ''; }

  // ---------- מהלכים ----------
  $('sm-board').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]'); if (!b) return;
    var i = +b.getAttribute('data-i');
    if (!canMove()) { if (mode === 'friend' && friend && friend.sent) say('המהלך כבר נשלח. כשהחבר יענה, פותחים את הקישור שלו.'); return; }
    var p = S.b[i];
    if (sel >= 0) {
      var ms = legal(S).filter(function (m) { return m.f === sel && m.t === i; });
      if (ms.length) {
        if (ms.length > 1) { askPromo(ms); return; }
        doMove(ms[0], true); return;
      }
    }
    if (p && isW(p) === S.w) { sel = i === sel ? -1 : i; say(''); }
    else sel = -1;
    draw();
  });
  function askPromo(ms) {
    pendingPromo = ms;
    var w = S.w;
    $('sm-promo').hidden = false;
    $('sm-promo').innerHTML = '<span>לאיזה כלי להכתיר?</span>' + ['Q', 'R', 'B', 'N'].map(function (q) { return '<button type="button" data-q="' + q + '"><span class="pc ' + (w ? 'w' : 'b') + '">' + GL[q] + '︎</span><small>' + NAMES[q] + '</small></button>'; }).join('');
    $('sm-promo').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { var q = b.getAttribute('data-q'), m = pendingPromo.filter(function (x) { return x.p === q; })[0]; pendingPromo = null; $('sm-promo').hidden = true; doMove(m, true); };
    });
  }
  function doMove(m, human) {
    if (!started) { started = true; clock.on = true; CH.used(TOOL, 'start', { mode: mode, level: mode === 'bot' ? data.lv : 0 }); }
    undo.push({ z: fen(S), h: hist.slice(), l: last });
    var n = play(S, m), capd = n.cap;
    delete n.cap; S = n; hist.push(posKey(S)); last = [m.f, m.t]; sel = -1;
    say(capd ? '✓ ' + NAMES[capd.toUpperCase()] + ' נאכל' : '');
    over = outcome(S, hist);
    persist(); draw();
    if (over) return finish();
    if (mode === 'bot' && human) { busy = true; status(); setTimeout(bot, 60); }
    if (mode === 'friend' && human) sendTurn();
  }
  function bot() {
    var m = botMove(S, data.lv, hist); busy = false;
    if (m) { if (m.p) m.p = 'Q'; m = legal(S).filter(function (x) { return x.f === m.f && x.t === m.t && (!x.p || x.p === 'Q'); })[0]; doMove(m, false); }
  }
  $('sm-undo').onclick = function () {
    if (!undo.length || busy) return;
    var steps = mode === 'bot' ? ((S.w ? 'w' : 'b') === data.col ? 2 : 1) : 1, u;
    while (steps-- && undo.length) u = undo.pop();
    if (u) { S = parse(u.z); hist = u.h; last = u.l; over = null; sel = -1; say('↶ המהלך בוטל'); persist(); draw(); CH.used(TOOL, 'undo', { mode: mode }); }
  };
  $('sm-flip').onclick = function () { data.autoflip = !data.autoflip; persist(); draw(); };
  $('sm-resign').onclick = function () {
    if (over) return;
    if (!confirm('לסיים את המשחק הזה ולהתחיל חדש?')) return;
    CH.used(TOOL, 'resign', { mode: mode }); newGame();
  };
  $('sm-new').onclick = function () { if (!over && started && !confirm('להתחיל משחק חדש?')) return; newGame(); };

  // ---------- עם חבר בקישור ----------
  function sendTurn() {
    friend.sent = true; persist(); draw();
    var mv = sqName(last[0]) + '-' + sqName(last[1]);
    CH.turnSend({ el: $('sm-send'), tool: TOOL, p: { g: G, z: fen(S), l: last, i: friend.id, o: friend.op || '' },
      title: over ? '📨 לשלוח לחבר את המהלך האחרון' : '📨 עכשיו התור של ' + (friend.op || 'החבר'),
      msg: function (nm) { return '♟ ' + (nm || 'חבר') + ' שיחק ' + mv + ' בשחמט' + (over && over.why === 'mate' ? ' – ושח-מט! 😉' : inCheck(S) ? ' – שח!' : '') + '. התור שלך:'; } });
    CH.used(TOOL, 'turn', { n: S.n });
  }
  function friendStart(theyStart) {
    S = parse(START); hist = [posKey(S)]; undo = []; last = null; over = null; sel = -1; started = false; clock.set(0);
    friend = { id: Math.random().toString(36).slice(2, 9), me: theyStart ? 'b' : 'w', op: '' };
    $('sm-send').innerHTML = ''; $('sm-win').innerHTML = '';
    if (theyStart) { sendTurn(); say('שלחו לחבר את הקישור. הוא משחק בלבן ומתחיל.'); }
    else say('אתם בלבן. עושים מהלך ראשון, ואז שולחים לחבר.');
    persist(); draw();
  }
  $('sm-fr-me').onclick = function () { friendStart(false); };
  $('sm-fr-them').onclick = function () { friendStart(true); };

  // ---------- סיום ----------
  function finish() {
    clock.on = false; $('sm-send').innerHTML = '';
    var me = myColor(), why = { mate: 'שח-מט', stale: 'פט (אין מהלך חוקי, בלי שח)', material: 'לא נשארו מספיק כלים למט', fifty: '50 מהלכים בלי הכאה ובלי רגלי', rep: 'אותה עמדה שלוש פעמים' }[over.why];
    var iWon = over.r !== 'd' && (mode === 'phone' || over.r === me);
    if (mode === 'friend' && !friend.sent && over.r === me) { /* אני ניצחתי – קודם שולחים לחבר את המהלך */ }
    if (mode === 'friend') sendTurn();
    if (!iWon) {
      $('sm-win').innerHTML = '<div class="ch-win"><h2>' + (over.r === 'd' ? '🤝 תיקו' : '💪 הפעם המחשב ניצח') + '</h2><p class="ch-hint">' + why + '</p><div class="ch-next"><button class="btn btn-gold" type="button" id="sm-again">משחק חדש</button></div></div>';
      if (mode === 'friend' && over.r !== 'd') $('sm-win').querySelector('h2').textContent = '💪 הפעם הניצחון של ' + (friend.op || 'החבר');
      $('sm-again').onclick = function () { newGame(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      CH.used(TOOL, 'end', { mode: mode, r: over.r === 'd' ? 'draw' : 'lose' });
      return;
    }
    var st = mode === 'phone' ? CH.stats(G) : CH.record(G, true, clock.sec, 0);
    if (mode !== 'phone') { data.wins = data.wins || {}; var d = CH.load(G); d.wins = d.wins || {}; var key = mode === 'bot' ? 'l' + data.lv : 'fr'; d.wins[key] = (d.wins[key] || 0) + 1; CH.save(G, d); }
    CH.used(TOOL, 'win', { mode: mode, level: mode === 'bot' ? data.lv : 0, moves: S.n });
    var vs = mode === 'bot' ? 'את המחשב ברמה ' + LEVELS[data.lv].name : mode === 'friend' ? 'את ' + (friend.op || 'החבר') : '';
    CH.win({ tool: TOOL, el: $('sm-win'), daily: mode !== 'phone', stats: st,
      title: mode === 'phone' ? '🏁 ' + who(over.r === 'w') + ' ניצח! ' + why : '♟ ניצחתם' + (vs ? ' ' + vs : '') + '! 🎉',
      line: '<span>♟ <b>' + why + '</b></span><span>⏱ ' + CH.fmt(clock.sec) + '</span><span>' + (S.n - 1) + ' מהלכים</span>',
      share: '♟ ניצחתי ' + (vs || 'בשחמט') + ' בשחמט, ב-' + (S.n - 1) + ' מהלכים.\nבחינם ובלי פרסומות. בואו לשחק איתי:',
      next: [{ label: 'משחק חדש', fn: newGame }].concat(mode === 'bot' && data.lv < 3 ? [{ label: 'לנסות רמה ' + LEVELS[data.lv + 1].name, fn: function () { data.lv++; newGame(); } }] : []) });
  }

  // ---------- מצבים ----------
  function newGame() {
    $('sm-win').innerHTML = ''; $('sm-send').innerHTML = ''; $('sm-promo').hidden = true; pendingPromo = null; CH.turnBanner('');
    if (mode === 'friend') { friendStart(false); return; }
    S = parse(START); hist = [posKey(S)]; undo = []; last = null; over = null; sel = -1; started = false; busy = false; clock.set(0); clock.on = false;
    say(mode === 'bot' ? (data.col === 'b' ? 'אתם בשחור. המחשב מתחיל.' : 'אתם בלבן. בהצלחה!') : 'לבן מתחיל. מעבירים את הטלפון אחרי כל מהלך.');
    persist(); drawOpts(); draw();
    if (mode === 'bot' && data.col === 'b') { busy = true; status(); setTimeout(bot, 300); }
  }
  function restore(cur) {
    S = parse(cur.z) || parse(START); hist = cur.h || [posKey(S)]; last = cur.l || null; over = cur.over || null; friend = cur.fr || null;
    undo = []; sel = -1; busy = false; started = true; clock.set(cur.sec || 0); clock.on = !over;
  }
  function drawOpts() {
    $('sm-botopts').hidden = mode !== 'bot'; $('sm-fropts').hidden = mode !== 'friend';
    $('sm-levels').innerHTML = [1, 2, 3].map(function (l) { return '<button type="button" data-l="' + l + '" class="' + (data.lv == l ? 'on' : '') + '">' + LEVELS[l].name + '</button>'; }).join('') +
      '<span class="ch-sep"></span>' + ['w', 'b'].map(function (c) { return '<button type="button" data-c="' + c + '" class="' + (data.col === c ? 'on' : '') + '">' + (c === 'w' ? '♔ אני לבן' : '♚ אני שחור') + '</button>'; }).join('');
    $('sm-levels').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        if (b.hasAttribute('data-l')) data.lv = +b.getAttribute('data-l'); else data.col = b.getAttribute('data-c');
        newGame(); CH.used(TOOL, 'level', { level: data.lv, col: data.col });
      };
    });
  }
  function tab(m) {
    CH.vsReset(); mode = m;
    document.querySelectorAll('#sm-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === m); });
    $('sm-win').innerHTML = ''; $('sm-send').innerHTML = ''; say('');
    var cur = (CH.load(G).cur || {})[m];
    if (cur && cur.z && parse(cur.z) && !(m === 'friend' && !cur.fr)) {
      restore(cur); drawOpts(); draw();
      if (m === 'friend' && friend.sent && !over) sendTurn();
      if (m === 'bot' && !over && (S.w ? 'w' : 'b') !== data.col) { busy = true; status(); setTimeout(bot, 300); }
    } else newGame();
  }
  document.querySelectorAll('#sm-tabs button').forEach(function (b) { b.onclick = function () { tab(b.getAttribute('data-m')); }; });

  // ---------- פתיחת קישור מחבר ----------
  var V = CH.vsIn && CH.vsIn.g === G && typeof CH.vsIn.z === 'string' ? CH.vsIn : null, P0 = V && parse(V.z);
  if (P0) {
    mode = 'friend';
    document.querySelectorAll('#sm-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === 'friend'); });
    var prev = ((CH.load(G).cur || {}).friend) || {}, sameGame = prev.fr && prev.fr.id === V.i;
    S = P0; last = Array.isArray(V.l) && V.l.length === 2 ? [V.l[0] | 0, V.l[1] | 0] : null; undo = []; sel = -1;
    hist = sameGame && prev.h ? prev.h.concat([posKey(S)]) : [posKey(S)];
    friend = { id: String(V.i || '').slice(0, 12) || 'x', me: S.w ? 'w' : 'b', op: V.m || (sameGame && prev.fr.op) || '' };
    started = true; clock.set(sameGame ? prev.sec || 0 : 0); clock.on = true;
    over = outcome(S, hist);
    CH.turnBanner('♟ <b>' + (over ? 'המשחק הסתיים' : 'התור שלכם!') + '</b> ' + CH.esc(friend.op || 'החבר') + ' שיחק' + (last ? ' ' + sqName(last[0]) + '-' + sqName(last[1]) : '') + (over ? '' : '. אתם ב' + who(S.w) + '.' + (inCheck(S) ? ' ⚠️ שח!' : '')));
    CH.used(TOOL, 'turn_open');
    persist(); drawOpts(); draw();
    if (over) finish();
  } else tab(CH.load(G).tab || 'bot');
  document.querySelectorAll('#sm-tabs button').forEach(function (b) { b.addEventListener('click', function () { var d = CH.load(G); d.tab = mode; CH.save(G, d); }); });
})();
