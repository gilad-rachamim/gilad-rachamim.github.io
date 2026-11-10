// דמקה – /kelim/chashiva/damka/
// החוקים הנפוצים בארץ: לוח 8×8, חייל זז קדימה באלכסון ואוכל גם קדימה וגם אחורה, אכילה חובה,
// אכילה בשרשרת, ומלך "עף" (זז ואוכל לכל מרחק באלכסון). מי שנשאר בלי כלים או בלי מהלך – הפסיד.
// שלוש דרכים לשחק: מול המחשב, עם חבר בקישור (בלי שרת), ושניים על טלפון אחד.
(function () {
  'use strict';
  var CH = window.CH, TOOL = 'chashiva_damka', G = 'damka';
  function $(id) { return document.getElementById(id); }
  if (!$('dm-board')) return;

  // ---------- מנוע ----------
  // לוח: 64 משבצות, '' / w / b / W (מלך לבן) / B. לבן למטה ומתחיל, זז למעלה.
  function startPos() { var b = []; for (var i = 0; i < 64; i++) { var r = i >> 3, c = i & 7, d = (r + c) % 2 === 1; b.push(d && r < 3 ? 'b' : d && r > 4 ? 'w' : ''); } return { b: b, w: true, q: 0 }; }
  function isW(p) { return p === 'w' || p === 'W'; }
  function isK(p) { return p === 'W' || p === 'B'; }
  function at(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8 ? r * 8 + c : -1; }
  var DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  // קידוד לקישור: 32 משבצות כהות + תור + מונה מהלכים בלי אכילה
  var DARK = []; for (var i0 = 0; i0 < 64; i0++) if (((i0 >> 3) + (i0 & 7)) % 2 === 1) DARK.push(i0);
  function enc(s) { return (s.w ? 'w' : 'b') + DARK.map(function (i) { return s.b[i] || '.'; }).join('') + s.q; }
  function dec(z) {
    if (typeof z !== 'string' || !/^[wb][.wbWB]{32}\d{1,3}$/.test(z)) return null;
    var b = new Array(64).fill(''); DARK.forEach(function (i, k) { var ch = z[1 + k]; b[i] = ch === '.' ? '' : ch; });
    return { b: b, w: z[0] === 'w', q: +z.slice(33) || 0 };
  }
  // כל ההכאות מהמשבצת f (בשרשרת). taken = מה שכבר נאכל בשרשרת הזאת
  function caps(b, f, p, taken, path, out) {
    var r = f >> 3, c = f & 7, w = isW(p), found = false;
    DIRS.forEach(function (d) {
      if (isK(p)) {
        var s = 1, t;
        while ((t = at(r + d[0] * s, c + d[1] * s)) >= 0 && !b[t]) s++;
        if (t < 0 || isW(b[t]) === w || taken.indexOf(t) >= 0) return;
        var s2 = s + 1, l;
        while ((l = at(r + d[0] * s2, c + d[1] * s2)) >= 0 && !b[l]) {
          found = true; var b2 = b.slice(); b2[l] = p; b2[f] = '';
          caps(b2, l, p, taken.concat([t]), path.concat([l]), out); s2++;
        }
      } else {
        var t1 = at(r + d[0], c + d[1]), l1 = at(r + 2 * d[0], c + 2 * d[1]);
        if (t1 < 0 || l1 < 0 || !b[t1] || isW(b[t1]) === w || b[l1] || taken.indexOf(t1) >= 0) return;
        found = true; var b3 = b.slice(); b3[l1] = p; b3[f] = '';
        caps(b3, l1, p, taken.concat([t1]), path.concat([l1]), out);
      }
    });
    if (!found && taken.length) out.push({ path: path, caps: taken });
  }
  function moves(s) {
    var b = s.b, all = [], quiet = [];
    for (var f = 0; f < 64; f++) {
      var p = b[f]; if (!p || isW(p) !== s.w) continue;
      var out = []; caps(b, f, p, [], [], out);
      out.forEach(function (m) { m.f = f; all.push(m); });
      if (all.length) continue;
      var r = f >> 3, c = f & 7;
      DIRS.forEach(function (d) {
        if (!isK(p) && d[0] !== (s.w ? -1 : 1)) return;
        for (var k = 1; k < 8; k++) { var t = at(r + d[0] * k, c + d[1] * k); if (t < 0 || b[t]) break; quiet.push({ f: f, path: [t], caps: [] }); if (!isK(p)) break; }
      });
    }
    return all.length ? all : quiet;
  }
  function play(s, m) {
    var b = s.b.slice(), p = b[m.f], to = m.path[m.path.length - 1];
    b[m.f] = ''; m.caps.forEach(function (x) { b[x] = ''; });
    if (p === 'w' && to < 8) p = 'W'; if (p === 'b' && to >= 56) p = 'B';
    b[to] = p;
    return { b: b, w: !s.w, q: m.caps.length || !isK(s.b[m.f]) ? 0 : s.q + 1 };
  }
  function count(b) { var o = { w: 0, b: 0, W: 0, B: 0 }; b.forEach(function (p) { if (p) o[p]++; }); return o; }
  function outcome(s) {
    if (!moves(s).length) return { r: s.w ? 'b' : 'w', why: count(s.b)[s.w ? 'w' : 'b'] + count(s.b)[s.w ? 'W' : 'B'] ? 'block' : 'none' };
    if (s.q >= 50) return { r: 'd', why: 'kings' };
    return null;
  }

  // ---------- המחשב ----------
  function evalW(b) {
    var v = 0;
    for (var i = 0; i < 64; i++) {
      var p = b[i]; if (!p) continue; var r = i >> 3, c = i & 7, center = (c > 1 && c < 6 ? 6 : 0);
      if (p === 'w') v += 100 + (7 - r) * 4 + center + (r === 7 ? 8 : 0); else if (p === 'b') v -= 100 + r * 4 + center + (r === 0 ? 8 : 0);
      else if (p === 'W') v += 300; else v -= 300;
    }
    return v;
  }
  function search(s, d, a, bt) {
    var L = moves(s); if (!L.length) return -100000 - d;
    if (d <= 0 && !L[0].caps.length) return (s.w ? 1 : -1) * evalW(s.b);
    if (d <= -4) return (s.w ? 1 : -1) * evalW(s.b);
    for (var i = 0; i < L.length; i++) { var v = -search(play(s, L[i]), d - 1, -bt, -a); if (v >= bt) return bt; if (v > a) a = v; }
    return a;
  }
  var LEVELS = { 1: { name: 'קל', depth: 1, noise: 120 }, 2: { name: 'בינוני', depth: 3, noise: 20 }, 3: { name: 'קשה', depth: 5, noise: 0 } };
  function botMove(s, lv) {
    var L = moves(s), best = null, bv = -Infinity, L0 = LEVELS[lv];
    L.forEach(function (m) { var v = -search(play(s, m), L0.depth - 1, -Infinity, Infinity) + (Math.random() - 0.5) * L0.noise; if (v > bv) { bv = v; best = m; } });
    return best;
  }

  // ---------- תצוגה ----------
  var data = CH.load(G); data.lv = LEVELS[data.lv] ? data.lv : 1; data.col = data.col === 'b' ? 'b' : 'w';
  var mode = 'bot', S = startPos(), undo = [], sel = -1, part = [], last = null, over = null, busy = false, friend = null, started = false;
  var clock = CH.clock(null);
  function persist() { var d = CH.load(G); d.lv = data.lv; d.col = data.col; d.autoflip = data.autoflip ? 1 : 0; d.cur = d.cur || {}; d.cur[mode] = { z: enc(S), l: last, over: over, fr: friend, sec: clock.sec }; CH.save(G, d); }
  function turn() { return S.w ? 'w' : 'b'; }
  function myColor() { return mode === 'bot' ? data.col : mode === 'friend' ? (friend ? friend.me : 'w') : turn(); }
  function canMove() {
    if (over || busy) return false;
    if (mode === 'phone') return true;
    if (mode === 'friend') return friend && !friend.sent && turn() === friend.me;
    return turn() === data.col;
  }
  function cands() { return sel < 0 ? [] : moves(S).filter(function (m) { if (m.f !== sel) return false; for (var k = 0; k < part.length; k++) if (m.path[k] !== part[k]) return false; return true; }); }
  function draw() {
    var flip = mode === 'phone' ? (data.autoflip && !S.w) : myColor() === 'b';
    var C = cands(), tgt = {}; C.forEach(function (m) { tgt[m.path[part.length]] = 1; });
    var must = {}; if (canMove() && sel < 0) moves(S).forEach(function (m) { if (m.caps.length) must[m.f] = 1; });
    var h = '';
    for (var k = 0; k < 64; k++) {
      var i = flip ? 63 - k : k, r = i >> 3, c = i & 7, p = S.b[i], cur = part.length ? part[part.length - 1] : -1;
      if (part.length && i === sel) p = '';
      if (i === cur) p = S.b[sel];
      var cls = ((r + c) % 2 ? 'dk' : 'lt') + (i === sel && !part.length || i === cur ? ' sel' : '') + (last && last.indexOf(i) >= 0 ? ' last' : '') + (tgt[i] ? ' dot' : '') + (must[i] ? ' must' : '');
      h += '<button type="button" data-i="' + i + '" class="' + cls + '"' + ((r + c) % 2 ? '' : ' tabindex="-1"') + ' aria-label="' + (p ? (isW(p) ? 'לבן' : 'שחור') + (isK(p) ? ' מלך' : '') : 'ריק') + '">' + (p ? '<span class="disc ' + (isW(p) ? 'w' : 'b') + (isK(p) ? ' k' : '') + '">' + (isK(p) ? '👑' : '') + '</span>' : '') + '</button>';
    }
    $('dm-board').innerHTML = h; $('dm-board').classList.toggle('won', !!over);
    var n = count(S.b);
    $('dm-capt').innerHTML = '<span>⚪ ' + (n.w + n.W) + ' · ⚫ ' + (n.b + n.B) + '</span>';
    status();
    $('dm-undo').hidden = mode === 'friend' || !undo.length || !!over;
    $('dm-flip').hidden = mode !== 'phone'; $('dm-flip').classList.toggle('on', !!data.autoflip);
  }
  function who(w) { return w ? 'לבן' : 'שחור'; }
  function status() {
    var t;
    if (over) t = over.r === 'd' ? '🤝 תיקו' : '🏁 ' + who(over.r === 'w') + ' ניצח';
    else if (busy) t = '🤖 המחשב חושב…';
    else if (mode === 'friend' && friend && friend.sent) t = '📨 נשלח. מחכים למהלך של ' + (friend.op || 'החבר');
    else if (mode === 'friend' && friend && turn() !== friend.me) t = '⏳ התור של ' + (friend.op || 'החבר');
    else t = (mode === 'phone' ? 'התור של ' + who(S.w) : 'התור שלכם (' + who(S.w) + ')') + (moves(S)[0] && moves(S)[0].caps.length ? ' · חובה לאכול!' : '');
    $('dm-status').textContent = t;
  }
  function say(t) { $('dm-msg').textContent = t || ''; }

  $('dm-board').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]'); if (!b) return;
    var i = +b.getAttribute('data-i');
    if (!canMove()) { if (mode === 'friend' && friend && friend.sent) say('המהלך כבר נשלח. כשהחבר יענה, פותחים את הקישור שלו.'); return; }
    var C = cands();
    if (sel >= 0 && C.some(function (m) { return m.path[part.length] === i; })) {
      part.push(i);
      var done = C.filter(function (m) { return m.path.length === part.length && m.path[part.length - 1] === i; })[0];
      if (done) { doMove(done, true); return; }
      say('ממשיכים לאכול…'); draw(); return;
    }
    if (part.length) return; // באמצע שרשרת – רק ממשיכים
    var p = S.b[i];
    if (p && isW(p) === S.w) {
      if (!moves(S).some(function (m) { return m.f === i; })) { say(moves(S)[0].caps.length ? 'חובה לאכול – יש כלי אחר שיכול לאכול (מסומן באדום).' : 'לכלי הזה אין לאן לזוז.'); sel = -1; draw(); return; }
      sel = i === sel ? -1 : i; say('');
    } else sel = -1;
    draw();
  });
  function doMove(m, human) {
    if (!started) { started = true; clock.on = true; CH.used(TOOL, 'start', { mode: mode, level: mode === 'bot' ? data.lv : 0 }); }
    undo.push({ z: enc(S), l: last });
    S = play(S, m); last = [m.f].concat(m.path); sel = -1; part = [];
    say(m.caps.length ? '✓ ' + (m.caps.length === 1 ? 'כלי אחד נאכל' : m.caps.length + ' כלים נאכלו') : '');
    over = outcome(S); persist(); draw();
    if (over) return finish();
    if (mode === 'bot' && human) { busy = true; status(); setTimeout(bot, 250); }
    if (mode === 'friend' && human) sendTurn();
  }
  function bot() { var m = botMove(S, data.lv); busy = false; if (m) doMove(m, false); }
  $('dm-undo').onclick = function () {
    if (!undo.length || busy) return;
    var steps = mode === 'bot' ? (turn() === data.col ? 2 : 1) : 1, u;
    while (steps-- && undo.length) u = undo.pop();
    if (u) { S = dec(u.z); last = u.l; over = null; sel = -1; part = []; say('↶ המהלך בוטל'); persist(); draw(); CH.used(TOOL, 'undo', { mode: mode }); }
  };
  $('dm-flip').onclick = function () { data.autoflip = !data.autoflip; persist(); draw(); };
  $('dm-new').onclick = function () { if (!over && started && !confirm('להתחיל משחק חדש?')) return; newGame(); };

  // ---------- עם חבר ----------
  function sendTurn() {
    friend.sent = true; persist(); draw();
    CH.turnSend({ el: $('dm-send'), tool: TOOL, p: { g: G, z: enc(S), l: last, i: friend.id, o: friend.op || '' },
      title: over ? '📨 לשלוח לחבר את המהלך האחרון' : '📨 עכשיו התור של ' + (friend.op || 'החבר'),
      msg: function (nm) { return '⚫⚪ ' + (nm || 'חבר') + ' שיחק בדמקה' + (over && over.r !== 'd' ? ' – והמשחק נגמר! 😉' : '') + '. התור שלך:'; } });
    CH.used(TOOL, 'turn', {});
  }
  function friendStart(theyStart) {
    S = startPos(); undo = []; last = null; over = null; sel = -1; part = []; started = false; clock.set(0);
    friend = { id: Math.random().toString(36).slice(2, 9), me: theyStart ? 'b' : 'w', op: '' };
    $('dm-send').innerHTML = ''; $('dm-win').innerHTML = '';
    if (theyStart) { sendTurn(); say('שלחו לחבר את הקישור. הוא משחק בלבן ומתחיל.'); } else say('אתם בלבן. עושים מהלך ראשון, ואז שולחים לחבר.');
    persist(); draw();
  }
  $('dm-fr-me').onclick = function () { friendStart(false); };
  $('dm-fr-them').onclick = function () { friendStart(true); };

  function finish() {
    clock.on = false; $('dm-send').innerHTML = '';
    var me = myColor(), why = { block: 'ליריב לא נשאר מהלך', none: 'כל הכלים של היריב נאכלו', kings: '25 סבבים של מלכים בלי אכילה' }[over.why];
    var iWon = over.r !== 'd' && (mode === 'phone' || over.r === me);
    if (mode === 'friend') sendTurn();
    if (!iWon) {
      $('dm-win').innerHTML = '<div class="ch-win"><h2>' + (over.r === 'd' ? '🤝 תיקו' : mode === 'friend' ? '💪 הפעם הניצחון של ' + CH.esc(friend.op || 'החבר') : '💪 הפעם המחשב ניצח') + '</h2><p class="ch-hint">' + why + '</p><div class="ch-next"><button class="btn btn-gold" type="button" id="dm-again">משחק חדש</button></div></div>';
      $('dm-again').onclick = function () { newGame(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      CH.used(TOOL, 'end', { mode: mode, r: over.r === 'd' ? 'draw' : 'lose' }); return;
    }
    var st = mode === 'phone' ? CH.stats(G) : CH.record(G, true, clock.sec, 0);
    CH.used(TOOL, 'win', { mode: mode, level: mode === 'bot' ? data.lv : 0 });
    var vs = mode === 'bot' ? 'את המחשב ברמה ' + LEVELS[data.lv].name : mode === 'friend' ? 'את ' + (friend.op || 'החבר') : '';
    CH.win({ tool: TOOL, el: $('dm-win'), daily: mode !== 'phone', stats: st,
      title: mode === 'phone' ? '🏁 ' + who(over.r === 'w') + ' ניצח!' : '⚪ ניצחתם' + (vs ? ' ' + vs : '') + '! 🎉',
      line: '<span>⚪ <b>' + why + '</b></span><span>⏱ ' + CH.fmt(clock.sec) + '</span>',
      share: '⚫⚪ ניצחתי ' + (vs || '') + ' בדמקה!\nבחינם ובלי פרסומות. בואו לשחק איתי:',
      next: [{ label: 'משחק חדש', fn: newGame }].concat(mode === 'bot' && data.lv < 3 ? [{ label: 'לנסות רמה ' + LEVELS[data.lv + 1].name, fn: function () { data.lv++; newGame(); } }] : []) });
  }
  function newGame() {
    $('dm-win').innerHTML = ''; $('dm-send').innerHTML = ''; CH.turnBanner('');
    if (mode === 'friend') { friendStart(false); return; }
    S = startPos(); undo = []; last = null; over = null; sel = -1; part = []; started = false; busy = false; clock.set(0); clock.on = false;
    say(mode === 'bot' ? (data.col === 'b' ? 'אתם בשחור. המחשב מתחיל.' : 'אתם בלבן. בהצלחה!') : 'לבן מתחיל. מעבירים את הטלפון אחרי כל מהלך.');
    persist(); drawOpts(); draw();
    if (mode === 'bot' && data.col === 'b') { busy = true; status(); setTimeout(bot, 300); }
  }
  function drawOpts() {
    $('dm-botopts').hidden = mode !== 'bot'; $('dm-fropts').hidden = mode !== 'friend';
    $('dm-levels').innerHTML = [1, 2, 3].map(function (l) { return '<button type="button" data-l="' + l + '" class="' + (data.lv == l ? 'on' : '') + '">' + LEVELS[l].name + '</button>'; }).join('') +
      '<span class="ch-sep"></span>' + ['w', 'b'].map(function (c) { return '<button type="button" data-c="' + c + '" class="' + (data.col === c ? 'on' : '') + '">' + (c === 'w' ? '⚪ אני לבן' : '⚫ אני שחור') + '</button>'; }).join('');
    $('dm-levels').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { if (b.hasAttribute('data-l')) data.lv = +b.getAttribute('data-l'); else data.col = b.getAttribute('data-c'); newGame(); CH.used(TOOL, 'level', { level: data.lv, col: data.col }); };
    });
  }
  function tab(m) {
    CH.vsReset(); mode = m;
    document.querySelectorAll('#dm-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === m); });
    $('dm-win').innerHTML = ''; $('dm-send').innerHTML = ''; say('');
    var cur = (CH.load(G).cur || {})[m];
    if (cur && dec(cur.z) && !(m === 'friend' && !cur.fr)) {
      S = dec(cur.z); last = cur.l || null; over = cur.over || null; friend = cur.fr || null; undo = []; sel = -1; part = []; busy = false; started = true; clock.set(cur.sec || 0); clock.on = !over;
      drawOpts(); draw();
      if (m === 'friend' && friend.sent && !over) sendTurn();
      if (m === 'bot' && !over && turn() !== data.col) { busy = true; status(); setTimeout(bot, 300); }
    } else newGame();
    var d = CH.load(G); d.tab = m; CH.save(G, d);
  }
  document.querySelectorAll('#dm-tabs button').forEach(function (b) { b.onclick = function () { tab(b.getAttribute('data-m')); }; });

  var V = CH.vsIn && CH.vsIn.g === G ? CH.vsIn : null, P0 = V && dec(V.z);
  if (P0) {
    mode = 'friend';
    document.querySelectorAll('#dm-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === 'friend'); });
    var prev = ((CH.load(G).cur || {}).friend) || {}, same = prev.fr && prev.fr.id === V.i;
    S = P0; last = Array.isArray(V.l) ? V.l.slice(0, 12).map(function (x) { return x | 0; }) : null; undo = []; sel = -1; part = [];
    friend = { id: String(V.i || '').slice(0, 12) || 'x', me: turn(), op: V.m || (same && prev.fr.op) || '' };
    started = true; clock.set(same ? prev.sec || 0 : 0); clock.on = true;
    over = outcome(S);
    CH.turnBanner('⚪ <b>' + (over ? 'המשחק הסתיים' : 'התור שלכם!') + '</b> ' + CH.esc(friend.op || 'החבר') + ' שיחק.' + (over ? '' : ' אתם ב' + who(S.w) + '. המהלך שלו מסומן בצהוב.'));
    CH.used(TOOL, 'turn_open');
    persist(); drawOpts(); draw();
    if (over) finish();
  } else tab(CH.load(G).tab || 'bot');
})();
