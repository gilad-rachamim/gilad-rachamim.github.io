// שש-בש – /kelim/chashiva/shesh-besh/
// חוקים מלאים: הכאה, עלייה מהבר, הוצאה הביתה, חובה לנצל כמה שיותר קוביות (ואם רק אחת – את הגבוהה), מרס.
// הקוביות נקבעות מראש לפי מספר המשחק ומספר התור (זרע), כך שאי אפשר "להטיל שוב" גם במשחק עם חבר בקישור.
(function () {
  'use strict';
  var CH = window.CH, TOOL = 'chashiva_shesh', G = 'shesh';
  function $(id) { return document.getElementById(id); }
  if (!$('sb-board')) return;

  // ---------- מנוע ----------
  // p[0..23]: חיובי = לבן, שלילי = שחור. לבן נע מ-23 ל-0 (הבית: 0-5), שחור מ-0 ל-23 (הבית: 18-23).
  function startPos(seed) {
    var p = new Array(24).fill(0); p[23] = 2; p[12] = 5; p[7] = 3; p[5] = 5; p[0] = -2; p[11] = -5; p[16] = -3; p[18] = -5;
    return { p: p, bar: { w: 0, b: 0 }, off: { w: 0, b: 0 }, t: 'w', n: 1, s: seed };
  }
  function clone(s) { return { p: s.p.slice(), bar: { w: s.bar.w, b: s.bar.b }, off: { w: s.off.w, b: s.off.b }, t: s.t, n: s.n, s: s.s }; }
  function dice(s) { var r = CH.rng(s.s + ':' + s.n); return [1 + Math.floor(r() * 6), 1 + Math.floor(r() * 6)]; }
  function diceList(d) { return d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : [d[0], d[1]]; }
  function mine(s, i) { return s.t === 'w' ? s.p[i] > 0 : s.p[i] < 0; }
  function cnt(s, i) { return Math.abs(s.p[i]); }
  function allHome(s) {
    if (s.bar[s.t]) return false;
    for (var i = 0; i < 24; i++) if (mine(s, i) && (s.t === 'w' ? i > 5 : i < 18)) return false;
    return true;
  }
  // מהלך בודד: from = -1 (בר) או 0..23; to = 0..23 או 'off'
  function single(s, from, d) {
    var w = s.t === 'w';
    if (s.bar[s.t] && from !== -1) return null;
    if (from === -1) { if (!s.bar[s.t]) return null; var e = w ? 24 - d : d - 1; return open(s, e) ? { f: -1, to: e, d: d } : null; }
    if (!mine(s, from)) return null;
    var to = w ? from - d : from + d;
    if (to >= 0 && to < 24) return open(s, to) ? { f: from, to: to, d: d } : null;
    if (!allHome(s)) return null;
    if (to === -1 || to === 24) return { f: from, to: 'off', d: d };
    // קובייה גדולה מהנדרש: רק מהכלי הרחוק ביותר
    for (var i = 0; i < 24; i++) if (mine(s, i) && (w ? i > from : i < from)) return null;
    return { f: from, to: 'off', d: d };
  }
  function open(s, i) { var v = s.p[i]; return s.t === 'w' ? v >= -1 : v <= 1; }
  function apply(s, m) {
    var n = clone(s), w = s.t === 'w', sg = w ? 1 : -1, op = w ? 'b' : 'w';
    if (m.f === -1) n.bar[s.t]--; else n.p[m.f] -= sg;
    if (m.to === 'off') n.off[s.t]++;
    else { if (n.p[m.to] === -sg) { n.p[m.to] = 0; n.bar[op]++; m.hit = 1; } n.p[m.to] += sg; }
    return n;
  }
  function singles(s, ds) {
    var out = [], seen = {};
    ds.forEach(function (d) {
      if (seen[d]) return; seen[d] = 1;
      if (s.bar[s.t]) { var m = single(s, -1, d); if (m) out.push(m); return; }
      for (var i = 0; i < 24; i++) { var x = single(s, i, d); if (x) out.push(x); }
    });
    return out;
  }
  function without(ds, d) { var a = ds.slice(); a.splice(a.indexOf(d), 1); return a; }
  function maxUse(s, ds) {
    if (!ds.length || s.off[s.t] === 15) return 0;
    var best = 0, L = singles(s, ds);
    for (var k = 0; k < L.length; k++) { var v = 1 + maxUse(apply(s, L[k]), without(ds, L[k].d)); if (v > best) best = v; if (best === ds.length) break; }
    return best;
  }
  // המהלכים המותרים עכשיו, לפי חובת ניצול הקוביות
  function legalNow(s, ds) {
    var M = maxUse(s, ds); if (!M) return [];
    var L = singles(s, ds).filter(function (m) { return 1 + maxUse(apply(s, m), without(ds, m.d)) === M; });
    if (M === 1 && ds.length === 2 && ds[0] !== ds[1]) { var hi = Math.max(ds[0], ds[1]), H = L.filter(function (m) { return m.d === hi; }); if (H.length) L = H; }
    return L;
  }
  function pips(s, t) { var v = t === 'w' ? s.bar.w * 25 : s.bar.b * 25; for (var i = 0; i < 24; i++) { if (t === 'w' && s.p[i] > 0) v += s.p[i] * (i + 1); if (t === 'b' && s.p[i] < 0) v += -s.p[i] * (24 - i); } return v; }

  // ---------- המחשב: עובר על כל סדרות המהלכים ובוחר את העמדה הטובה ביותר ----------
  function sequences(s, ds, acc, out, seen) {
    var L = legalNow(s, ds);
    if (!L.length) { var k = JSON.stringify([s.p, s.bar, s.off]); if (!seen[k]) { seen[k] = 1; out.push({ s: s, ms: acc }); } return; }
    L.forEach(function (m) { sequences(apply(s, m), without(ds, m.d), acc.concat([m]), out, seen); });
  }
  function evalFor(s, me) {
    var op = me === 'w' ? 'b' : 'w', sg = me === 'w' ? 1 : -1, v = (pips(s, op) - pips(s, me)) * 1.0;
    v += (s.off[me] - s.off[op]) * 6 + (s.bar[op] - s.bar[me]) * 14;
    for (var i = 0; i < 24; i++) {
      var c = s.p[i] * sg; if (c <= 0) continue;
      var home = me === 'w' ? i <= 5 : i >= 18;
      if (c >= 2) v += home ? 7 : 4;
      if (c === 1) {
        // כמה כלים של היריב יכולים להגיע אליו (עד 12 צעדים)
        var shots = 0; for (var k = 1; k <= 12; k++) { var j = me === 'w' ? i + k : i - k; if (j >= 0 && j < 24 && s.p[j] * sg < 0) shots++; }
        if (s.bar[op]) shots++;
        v -= 3 + shots * 2.2 * (me === 'w' ? (24 - i) / 24 + .5 : (i + 1) / 24 + .5);
      }
    }
    return v;
  }
  var LEVELS = { 1: { name: 'קל', noise: 40 }, 2: { name: 'בינוני', noise: 6 }, 3: { name: 'קשה', noise: 0 } };
  function botPlan(s, ds, lv) {
    var out = []; sequences(s, ds, [], out, {});
    var best = null, bv = -Infinity;
    out.forEach(function (o) { var v = evalFor(o.s, s.t) + (Math.random() - .5) * LEVELS[lv].noise; if (v > bv) { bv = v; best = o; } });
    return best ? best.ms : [];
  }

  // ---------- קידוד לקישור ----------
  function enc(s) { return JSON.stringify([s.t, s.n, s.p, s.bar.w, s.bar.b, s.off.w, s.off.b, s.s]); }
  function dec(z) {
    try {
      var a = JSON.parse(z); if (!Array.isArray(a) || a.length !== 8 || !Array.isArray(a[2]) || a[2].length !== 24) return null;
      var s = { t: a[0] === 'b' ? 'b' : 'w', n: a[1] | 0 || 1, p: a[2].map(function (x) { return Math.max(-15, Math.min(15, x | 0)); }), bar: { w: a[3] | 0, b: a[4] | 0 }, off: { w: a[5] | 0, b: a[6] | 0 }, s: String(a[7] || 'x').slice(0, 24) };
      var w = s.bar.w + s.off.w, b = s.bar.b + s.off.b; s.p.forEach(function (x) { if (x > 0) w += x; else b -= x; });
      return w === 15 && b === 15 ? s : null;
    } catch (e) { return null; }
  }

  // ---------- תצוגה ----------
  var data = CH.load(G); data.lv = LEVELS[data.lv] ? data.lv : 2; data.col = data.col === 'b' ? 'b' : 'w';
  var mode = 'bot', S, T0, rem = [], rolled = false, sel = null, moved = [], over = null, busy = false, friend = null, started = false;
  var clock = CH.clock(null);
  function newSeed() { return Math.random().toString(36).slice(2, 10); }
  function persist() { var d = CH.load(G); d.lv = data.lv; d.col = data.col; d.cur = d.cur || {}; d.cur[mode] = { z: enc(T0 || S), over: over, fr: friend, sec: clock.sec }; CH.save(G, d); }
  function viewer() { return mode === 'bot' ? data.col : mode === 'friend' ? (friend ? friend.me : 'w') : (data.autoflip ? S.t : 'w'); }
  function canAct() {
    if (over || busy) return false;
    if (mode === 'phone') return true;
    if (mode === 'friend') return friend && !friend.sent && S.t === friend.me;
    return S.t === data.col;
  }
  function who(t) { return t === 'w' ? 'לבן' : 'שחור'; }
  function legal() { return rolled ? legalNow(S, rem) : []; }
  function chk(t, n) {
    var h = '', show = Math.min(n, 5);
    for (var k = 0; k < show; k++) h += '<i class="ck ' + t + '">' + (k === show - 1 && n > 5 ? n : '') + '</i>';
    return h;
  }
  function draw() {
    var v = viewer(), L = legal(), from = {}, to = {};
    L.forEach(function (m) { from[m.f] = 1; if (sel !== null && m.f === sel) to[m.to] = 1; });
    // סדר העמודות: למטה מימין לשמאל, למעלה משמאל לימין (הבית של מי שמחזיק את הטלפון – למטה מימין)
    var bottom = [], top = [];
    for (var k = 0; k < 12; k++) { bottom.push(v === 'w' ? k : 23 - k); top.push(v === 'w' ? 12 + k : 11 - k); }
    bottom.reverse();
    function pt(i, up) {
      var c = S.p[i], t = c > 0 ? 'w' : 'b', cls = 'pt ' + (up ? 'up' : 'dn') + ' ' + (i % 2 ? 'o' : 'e') + (sel === i ? ' sel' : '') + (to[i] ? ' to' : '') + (canAct() && sel === null && from[i] ? ' can' : '');
      return '<button type="button" class="' + cls + '" data-i="' + i + '" aria-label="נקודה ' + (v === 'w' ? i + 1 : 24 - i) + (c ? ', ' + Math.abs(c) + ' ' + who(t) : '') + '"><span class="tri"></span><span class="stack">' + (c ? chk(t, Math.abs(c)) : '') + '</span><small>' + (v === 'w' ? i + 1 : 24 - i) + '</small></button>';
    }
    var h = '<div class="sb-half">' + top.slice(0, 6).map(function (i) { return pt(i, false); }).join('') + '</div>' +
      '<button type="button" class="sb-bar' + (sel === -1 ? ' sel' : '') + (canAct() && sel === null && from[-1] ? ' can' : '') + '" data-i="-1" aria-label="הבר"><span class="stack">' + chk(v === 'w' ? 'b' : 'w', S.bar[v === 'w' ? 'b' : 'w']) + '</span><span class="stack">' + chk(v, S.bar[v]) + '</span></button>' +
      '<div class="sb-half">' + top.slice(6).map(function (i) { return pt(i, false); }).join('') + '</div>' +
      '<div class="sb-half">' + bottom.slice(0, 6).map(function (i) { return pt(i, true); }).join('') + '</div>' +
      '<div class="sb-half">' + bottom.slice(6).map(function (i) { return pt(i, true); }).join('') + '</div>';
    $('sb-board').innerHTML = h;
    $('sb-off').innerHTML = '<button type="button" class="sb-offb' + (to.off ? ' to' : '') + '" data-i="off">🏠 הוצאה<br><b>' + who(v) + ' ' + S.off[v] + '/15</b><small>' + who(v === 'w' ? 'b' : 'w') + ' ' + S.off[v === 'w' ? 'b' : 'w'] + '/15</small></button>';
    // קוביות
    var d = dice(S), used = diceList(d).length - rem.length;
    $('sb-dice').innerHTML = rolled ? diceList(d).map(function (x, k) { return '<span class="die' + (k < used ? ' used' : '') + '">' + '⚀⚁⚂⚃⚄⚅'[x - 1] + '</span>'; }).join('') : '';
    $('sb-roll').hidden = !(canAct() && !rolled);
    $('sb-end').hidden = !(canAct() && rolled && !L.length);
    $('sb-reset').hidden = !(canAct() && rolled && moved.length);
    $('sb-flip').hidden = mode !== 'phone'; $('sb-flip').classList.toggle('on', !!data.autoflip);
    status();
  }
  function status() {
    var t;
    if (over) t = '🏁 ' + who(over.r) + ' ניצח' + (over.mars ? ' – מרס!' : '');
    else if (busy) t = '🤖 המחשב משחק…';
    else if (mode === 'friend' && friend && friend.sent) t = '📨 נשלח. מחכים לתור של ' + (friend.op || 'החבר');
    else if (mode === 'friend' && friend && S.t !== friend.me) t = '⏳ התור של ' + (friend.op || 'החבר');
    else if (!rolled) t = (mode === 'phone' ? 'התור של ' + who(S.t) : 'התור שלכם (' + who(S.t) + ')') + ' · להטיל קוביות';
    else if (!legal().length) t = rem.length && !moved.length ? 'אין מהלך אפשרי עם הקוביות האלה' : 'סיימתם. לוחצים "סיום התור"';
    else t = (mode === 'phone' ? who(S.t) + ': ' : '') + 'בוחרים כלי ולאן להזיז' + (S.bar[S.t] ? ' (קודם מהבר!)' : '');
    $('sb-status').textContent = t;
    $('sb-pips').textContent = 'צעדים לסוף: ⚪ ' + pips(S, 'w') + ' · ⚫ ' + pips(S, 'b');
  }
  function say(t) { $('sb-msg').textContent = t || ''; }

  function roll() {
    if (!canAct() || rolled) return;
    if (!started) { started = true; clock.on = true; CH.used(TOOL, 'start', { mode: mode, level: mode === 'bot' ? data.lv : 0 }); }
    rolled = true; rem = diceList(dice(S)); moved = []; T0 = clone(S); sel = null;
    var L = legal(); say(L.length ? '' : '😕 אין מהלך אפשרי. לוחצים "סיום התור".');
    if (L.length && L.every(function (m) { return m.f === L[0].f; })) sel = L[0].f;
    draw();
  }
  $('sb-roll').onclick = roll;
  function tapAt(i) {
    if (!canAct() || !rolled) return;
    var L = legal();
    if (sel !== null) {
      var ms = L.filter(function (m) { return m.f === sel && String(m.to) === String(i); });
      if (ms.length) {
        // אם כמה קוביות מובילות לאותו מקום (אין דבר כזה במהלך בודד) – לוקחים את הראשונה
        var m = ms[0]; S = apply(S, m); rem = without(rem, m.d); moved.push(m);
        say(m.hit ? '💥 הכאה! הכלי של היריב עלה לבר' : m.to === 'off' ? '🏠 כלי יצא הביתה' : '');
        if (S.off[S.t] === 15) return endTurn();
        var L2 = legal();
        sel = L2.length && L2.some(function (x) { return x.f === m.to; }) ? m.to : (L2.length && L2.every(function (x) { return x.f === L2[0].f; }) ? L2[0].f : null);
        if (sel === 'off') sel = null;
        draw(); return;
      }
    }
    if (i === 'off') return;
    i = +i;
    if (L.some(function (m) { return m.f === i; })) { sel = sel === i ? null : i; say(''); }
    else { sel = null; if (S.bar[S.t]) say('קודם מעלים את הכלי מהבר'); }
    draw();
  }
  $('sb-board').addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) tapAt(b.getAttribute('data-i')); });
  $('sb-off').addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) tapAt('off'); });
  $('sb-reset').onclick = function () { if (!T0) return; S = clone(T0); rem = diceList(dice(S)); moved = []; sel = null; say('↶ התור חזר להתחלה'); draw(); };
  $('sb-end').onclick = function () { endTurn(); };
  $('sb-flip').onclick = function () { data.autoflip = !data.autoflip; persist(); draw(); };
  $('sb-new').onclick = function () { if (!over && started && !confirm('להתחיל משחק חדש?')) return; newGame(); };

  function endTurn() {
    var who0 = S.t;
    if (S.off[who0] === 15) { over = { r: who0, mars: S.off[who0 === 'w' ? 'b' : 'w'] === 0 }; }
    else { S.t = who0 === 'w' ? 'b' : 'w'; S.n++; }
    rolled = false; rem = []; sel = null; T0 = null; var last = moved; moved = [];
    persist(); draw();
    if (over) return finish();
    if (mode === 'bot' && S.t !== data.col) { busy = true; draw(); setTimeout(botTurn, 500); }
    if (mode === 'friend') sendTurn(last);
    if (mode === 'phone') say('🎲 התור של ' + who(S.t) + '. מעבירים את הטלפון.');
  }
  function botTurn() {
    var ds = diceList(dice(S)), plan = botPlan(S, ds, data.lv), d = dice(S);
    say('🤖 המחשב הטיל ' + d[0] + ' ו-' + d[1] + (plan.length ? '' : ' – ואין לו מהלך'));
    var k = 0;
    (function step() {
      if (k < plan.length) {
        var m = plan[k++]; S = apply(S, m); rolled = true; rem = ds.slice(k); draw(); if (m.hit) say('🤖 המחשב הכה כלי שלכם!');
        setTimeout(step, 420); return;
      }
      busy = false; endTurn();
    })();
  }

  // ---------- עם חבר ----------
  function sendTurn(last) {
    friend.sent = true; persist(); draw();
    var d = dice({ s: S.s, n: S.n - 1 });
    CH.turnSend({ el: $('sb-send'), tool: TOOL, p: { g: G, z: enc(S), i: friend.id, o: friend.op || '' },
      title: over ? '📨 לשלוח לחבר את התור האחרון' : '📨 עכשיו התור של ' + (friend.op || 'החבר'),
      msg: function (nm) { return '🎲 ' + (nm || 'חבר') + ' הטיל ' + d[0] + ' ו-' + d[1] + ' בשש-בש' + (over ? ' – וניצח! 😉' : '') + '. התור שלך:'; } });
    CH.used(TOOL, 'turn', { n: S.n });
  }
  function friendStart(theyStart) {
    S = startPos(newSeed()); T0 = null; rolled = false; rem = []; moved = []; sel = null; over = null; started = false; clock.set(0);
    friend = { id: Math.random().toString(36).slice(2, 9), me: theyStart ? 'b' : 'w', op: '' };
    $('sb-send').innerHTML = ''; $('sb-win').innerHTML = '';
    if (theyStart) { sendTurn([]); say('שלחו לחבר את הקישור. הוא משחק בלבן ומתחיל.'); } else say('אתם בלבן ומתחילים. מטילים, משחקים, ושולחים לחבר.');
    persist(); draw();
  }
  $('sb-fr-me').onclick = function () { friendStart(false); };
  $('sb-fr-them').onclick = function () { friendStart(true); };

  function finish() {
    clock.on = false; $('sb-send').innerHTML = '';
    var me = viewer(), iWon = mode === 'phone' || over.r === me;
    if (mode === 'friend' && over.r === me) sendTurn([]);
    if (!iWon) {
      $('sb-win').innerHTML = '<div class="ch-win"><h2>' + (mode === 'friend' ? '💪 הפעם הניצחון של ' + CH.esc(friend.op || 'החבר') : '💪 הפעם המחשב ניצח') + (over.mars ? ' (מרס)' : '') + '</h2><div class="ch-next"><button class="btn btn-gold" type="button" id="sb-again">משחק חדש</button></div></div>';
      $('sb-again').onclick = function () { newGame(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      CH.used(TOOL, 'end', { mode: mode, r: 'lose' }); return;
    }
    var st = mode === 'phone' ? CH.stats(G) : CH.record(G, true, clock.sec, 0);
    CH.used(TOOL, 'win', { mode: mode, level: mode === 'bot' ? data.lv : 0, mars: over.mars ? 1 : 0 });
    var vs = mode === 'bot' ? 'את המחשב ברמה ' + LEVELS[data.lv].name : mode === 'friend' ? 'את ' + (friend.op || 'החבר') : '';
    CH.win({ tool: TOOL, el: $('sb-win'), daily: mode !== 'phone', stats: st,
      title: mode === 'phone' ? '🏁 ' + who(over.r) + ' ניצח!' + (over.mars ? ' מרס!' : '') : '🎲 ניצחתם' + (vs ? ' ' + vs : '') + (over.mars ? ' – במרס!' : '!') + ' 🎉',
      line: '<span>🏠 <b>15/15 בבית</b></span><span>⏱ ' + CH.fmt(clock.sec) + '</span>' + (over.mars ? '<span>✌️ מרס – ניצחון כפול</span>' : ''),
      share: '🎲 ניצחתי ' + (vs || '') + ' בשש-בש' + (over.mars ? ' – במרס!' : '!') + '\nבחינם ובלי פרסומות. בואו לשחק איתי:',
      next: [{ label: 'משחק חדש', fn: newGame }].concat(mode === 'bot' && data.lv < 3 ? [{ label: 'לנסות רמה ' + LEVELS[data.lv + 1].name, fn: function () { data.lv++; newGame(); } }] : []) });
  }
  function newGame() {
    $('sb-win').innerHTML = ''; $('sb-send').innerHTML = ''; CH.turnBanner('');
    if (mode === 'friend') { friendStart(false); return; }
    S = startPos(newSeed()); T0 = null; rolled = false; rem = []; moved = []; sel = null; over = null; started = false; busy = false; clock.set(0); clock.on = false;
    say(mode === 'bot' ? (data.col === 'b' ? 'אתם בשחור. המחשב מתחיל.' : 'אתם בלבן ומתחילים. להטיל!') : 'לבן מתחיל. מעבירים את הטלפון בכל תור.');
    persist(); drawOpts(); draw();
    if (mode === 'bot' && data.col === 'b') { busy = true; draw(); setTimeout(botTurn, 600); }
  }
  function drawOpts() {
    $('sb-botopts').hidden = mode !== 'bot'; $('sb-fropts').hidden = mode !== 'friend';
    $('sb-levels').innerHTML = [1, 2, 3].map(function (l) { return '<button type="button" data-l="' + l + '" class="' + (data.lv == l ? 'on' : '') + '">' + LEVELS[l].name + '</button>'; }).join('') +
      '<span class="ch-sep"></span>' + ['w', 'b'].map(function (c) { return '<button type="button" data-c="' + c + '" class="' + (data.col === c ? 'on' : '') + '">' + (c === 'w' ? '⚪ אני לבן' : '⚫ אני שחור') + '</button>'; }).join('');
    $('sb-levels').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { if (b.hasAttribute('data-l')) data.lv = +b.getAttribute('data-l'); else data.col = b.getAttribute('data-c'); newGame(); CH.used(TOOL, 'level', { level: data.lv, col: data.col }); };
    });
  }
  function tab(m) {
    CH.vsReset(); mode = m;
    document.querySelectorAll('#sb-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === m); });
    $('sb-win').innerHTML = ''; $('sb-send').innerHTML = ''; say('');
    var cur = (CH.load(G).cur || {})[m];
    if (cur && dec(cur.z) && !(m === 'friend' && !cur.fr)) {
      S = dec(cur.z); T0 = null; over = cur.over || null; friend = cur.fr || null; rolled = false; rem = []; moved = []; sel = null; busy = false; started = true; clock.set(cur.sec || 0); clock.on = !over;
      drawOpts(); draw();
      if (m === 'friend' && friend.sent && !over) sendTurn([]);
      if (m === 'bot' && !over && S.t !== data.col) { busy = true; draw(); setTimeout(botTurn, 500); }
    } else newGame();
    var d = CH.load(G); d.tab = m; CH.save(G, d);
  }
  document.querySelectorAll('#sb-tabs button').forEach(function (b) { b.onclick = function () { tab(b.getAttribute('data-m')); }; });

  var V = CH.vsIn && CH.vsIn.g === G ? CH.vsIn : null, P0 = V && dec(V.z);
  if (P0) {
    mode = 'friend';
    document.querySelectorAll('#sb-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === 'friend'); });
    var prev = ((CH.load(G).cur || {}).friend) || {}, same = prev.fr && prev.fr.id === V.i;
    S = P0; T0 = null; rolled = false; rem = []; moved = []; sel = null;
    friend = { id: String(V.i || '').slice(0, 12) || 'x', me: S.t, op: V.m || (same && prev.fr.op) || '' };
    started = true; clock.set(same ? prev.sec || 0 : 0); clock.on = true;
    over = null; ['w', 'b'].forEach(function (t) { if (S.off[t] === 15) over = { r: t, mars: S.off[t === 'w' ? 'b' : 'w'] === 0 }; });
    var pd = S.n > 1 ? dice({ s: S.s, n: S.n - 1 }) : null;
    CH.turnBanner('🎲 <b>' + (over ? 'המשחק הסתיים' : 'התור שלכם!') + '</b> ' + (pd ? CH.esc(friend.op || 'החבר') + ' הטיל ' + pd[0] + ' ו-' + pd[1] + '.' : CH.esc(friend.op || 'החבר') + ' הזמין אתכם לשש-בש.') + (over ? '' : ' אתם ב' + who(S.t) + '.'));
    CH.used(TOOL, 'turn_open');
    persist(); drawOpts(); draw();
    if (over) finish();
  } else tab(CH.load(G).tab || 'bot');
})();
