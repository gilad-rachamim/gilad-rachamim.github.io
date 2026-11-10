// שחור ופתור (נונוגרם) – /kelim/chashiva/shachor/
// כל לוח נבדק בפותר שורות לפני שהוא מוצג: יש לו פתרון אחד, ומגיעים אליו בהיגיון בלי לנחש.
(function () {
  'use strict';
  var CH = window.CH, TOOL = 'chashiva_nono', G = 'nono';
  function $(id) { return document.getElementById(id); }
  if (!$('nn-board')) return;

  // ---------- פותר שורות ----------
  var ARR = {};
  function arrangements(clue, len) {
    var key = clue.join(',') + '/' + len;
    if (ARR[key]) return ARR[key];
    var out = [];
    if (clue.length === 1 && clue[0] === 0) { out.push(new Array(len).fill(0)); return (ARR[key] = out); }
    (function rec(i, pos, cur) {
      if (i === clue.length) { var a = cur.slice(); for (var k = pos; k < len; k++) a[k] = 0; out.push(a); return; }
      var rest = 0; for (var j = i + 1; j < clue.length; j++) rest += clue[j] + 1;
      for (var s = pos; s + clue[i] + rest <= len; s++) {
        var a2 = cur.slice(); for (var k2 = pos; k2 < s; k2++) a2[k2] = 0;
        for (var k3 = s; k3 < s + clue[i]; k3++) a2[k3] = 1;
        if (s + clue[i] < len) a2[s + clue[i]] = 0;
        rec(i + 1, s + clue[i] + 1, a2);
      }
    })(0, 0, new Array(len).fill(0));
    return (ARR[key] = out);
  }
  function clueOf(line) { var c = [], run = 0; for (var i = 0; i < line.length; i++) { if (line[i] === 1) run++; else if (run) { c.push(run); run = 0; } } if (run) c.push(run); return c.length ? c : [0]; }
  function lineSolvable(rows, cols, n) {
    var g = new Array(n * n).fill(-1), changed = true, guard = 0;
    function step(idx, clue) {
      var known = idx.map(function (i) { return g[i]; });
      var poss = arrangements(clue, n).filter(function (a) { for (var k = 0; k < n; k++) if (known[k] !== -1 && known[k] !== a[k]) return false; return true; });
      if (!poss.length) return false;
      for (var k = 0; k < n; k++) {
        if (known[k] !== -1) continue;
        var v = poss[0][k], same = true;
        for (var p = 1; p < poss.length; p++) if (poss[p][k] !== v) { same = false; break; }
        if (same) { g[idx[k]] = v; changed = true; }
      }
      return true;
    }
    while (changed && guard++ < 200) {
      changed = false;
      for (var r = 0; r < n; r++) { var ri = []; for (var c = 0; c < n; c++) ri.push(r * n + c); if (!step(ri, rows[r])) return false; }
      for (var c2 = 0; c2 < n; c2++) { var ci = []; for (var r2 = 0; r2 < n; r2++) ci.push(r2 * n + c2); if (!step(ci, cols[c2])) return false; }
    }
    return g.indexOf(-1) === -1;
  }
  function cluesOf(sol, n) {
    var rows = [], cols = [];
    for (var r = 0; r < n; r++) rows.push(clueOf(sol.slice(r * n, r * n + n)));
    for (var c = 0; c < n; c++) { var col = []; for (var r2 = 0; r2 < n; r2++) col.push(sol[r2 * n + c]); cols.push(clueOf(col)); }
    return { rows: rows, cols: cols };
  }
  function generate(seed, n) {
    var rnd = CH.rng(seed), dens = n <= 5 ? .62 : n <= 10 ? .6 : .58, last = null;
    for (var t = 0; t < 400; t++) {
      var sol = [];
      for (var i = 0; i < n * n; i++) sol.push(rnd() < dens ? 1 : 0);
      var cl = cluesOf(sol, n);
      // שורה או עמודה ריקה לגמרי – לוח משעמם, מדלגים
      if (cl.rows.concat(cl.cols).some(function (x) { return x[0] === 0; })) continue;
      last = { sol: sol, rows: cl.rows, cols: cl.cols, n: n };
      if (lineSolvable(cl.rows, cl.cols, n)) return last;
    }
    return last;
  }

  // ---------- מצב ----------
  function sizeForLevel(l) { return l <= 5 ? 5 : l <= 15 ? 8 : l <= 30 ? 10 : 15; }
  var data = CH.load(G);
  data.lvl = data.lvl || 1; data.done = data.done || {};
  var P = null, cur = [], undo = [], hints = 0, mode = 'daily', tool = 'f', won = false;
  var clock = CH.clock($('nn-time'));

  function keyOf() { return P.key; }
  // שומרים על מה שכבר רשום (רצף, מספר פתרונות) ומעדכנים רק את השלבים ואת הלוח הפתוח
  function persist() { data.cur = won ? null : { key: keyOf(), cells: cur.join(''), sec: clock.sec, hints: hints }; var s = CH.load(G); s.lvl = data.lvl; s.done = data.done; s.cur = data.cur; CH.save(G, s); }
  function say(t) { $('nn-msg').textContent = t || ''; }

  function start(m, arg) {
    if (m !== 'vs') CH.vsReset();
    mode = m; won = false; undo = []; hints = 0; $('nn-win').innerHTML = ''; say('');
    var seed, n, label;
    if (m === 'daily') { n = 10; seed = 'nono-daily-' + CH.today(); label = 'האתגר היומי · ' + CH.shortDate(); }
    else if (m === 'level') { n = sizeForLevel(arg); seed = 'nono-level-' + arg; label = 'שלב ' + arg; }
    else if (m === 'vs') { n = +arg.n; seed = arg.s; label = 'אתגר מחבר'; }
    else { n = arg; seed = 'nono-free-' + n + '-' + Date.now(); label = 'לוח חופשי'; }
    P = generate(seed, n); P.key = seed; P.label = label; P.level = arg;
    cur = new Array(n * n).fill(0);
    var sv = data.cur;
    if (sv && sv.key === seed && sv.cells && sv.cells.length === n * n) { cur = sv.cells.split('').map(Number); clock.set(sv.sec); hints = sv.hints || 0; }
    else clock.set(0);
    clock.on = true;
    $('nn-label').textContent = label + ' · ' + n + '×' + n;
    draw();
    var st = CH.stats(G);
    $('nn-today').hidden = !(m === 'daily' && st.doneToday);
    if (m === 'daily' && st.doneToday) $('nn-today').innerHTML = 'כבר פתרתם את האתגר של היום ב-' + CH.fmt(st.todaySec) + ' ✓ רצף: ' + st.streak + '. מחר מחכה לוח חדש. בינתיים, <a class="gold" href="#" id="nn-go-lvl">לשלבים ←</a>';
    var gl = $('nn-go-lvl'); if (gl) gl.onclick = function (e) { e.preventDefault(); tab('level'); };
    persist();
  }

  // ---------- ציור ----------
  function draw() {
    var n = P.n, b = $('nn-board');
    var cr = Math.max.apply(0, P.rows.map(function (x) { return x.length; }));
    var cc = Math.max.apply(0, P.cols.map(function (x) { return x.length; }));
    var W = Math.min((b.parentNode.clientWidth || window.innerWidth - 32) - 8, 560); if (W < 240) W = 340;
    var cell = Math.floor(W / (n + cr * 0.62 + 0.4));
    cell = Math.max(17, Math.min(44, cell));
    var fs = Math.max(10, Math.round(cell * 0.52));
    var clueW = Math.ceil(cr * fs * 0.95 + 8);
    b.className = 'nn-board';
    b.style.gridTemplateColumns = clueW + 'px repeat(' + n + ',' + cell + 'px)';
    b.style.gridTemplateRows = Math.ceil(cc * fs * 1.08 + 6) + 'px repeat(' + n + ',' + cell + 'px)';
    b.style.fontSize = fs + 'px';
    var h = '<div></div>';
    for (var c = 0; c < n; c++) h += '<div class="cc" data-col="' + c + '">' + P.cols[c].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>';
    for (var r = 0; r < n; r++) {
      h += '<div class="rc" data-row="' + r + '">' + P.rows[r].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>';
      for (var c2 = 0; c2 < n; c2++) {
        var cls = 'c' + (c2 % 5 === 4 && c2 < n - 1 ? ' b5' : '') + (r % 5 === 4 && r < n - 1 ? ' d5' : '') + (c2 === 0 ? ' l0' : '') + (r === 0 ? ' t0' : '');
        h += '<div class="' + cls + '" data-i="' + (r * n + c2) + '"></div>';
      }
    }
    b.innerHTML = h;
    paint();
  }
  function paint() {
    var n = P.n, cells = $('nn-board').querySelectorAll('.c');
    for (var i = 0; i < cells.length; i++) { cells[i].classList.toggle('f', cur[i] === 1); cells[i].classList.toggle('x', cur[i] === 2); }
    for (var r = 0; r < n; r++) { var row = []; for (var c = 0; c < n; c++) row.push(cur[r * n + c] === 1 ? 1 : 0); $('nn-board').querySelector('[data-row="' + r + '"]').classList.toggle('ok', clueOf(row).join() === P.rows[r].join()); }
    for (var c2 = 0; c2 < n; c2++) { var col = []; for (var r2 = 0; r2 < n; r2++) col.push(cur[r2 * n + c2] === 1 ? 1 : 0); $('nn-board').querySelector('[data-col="' + c2 + '"]').classList.toggle('ok', clueOf(col).join() === P.cols[c2].join()); }
  }
  function solvedNow() {
    var n = P.n, f = cur.map(function (v) { return v === 1 ? 1 : 0; }), cl = cluesOf(f, n);
    return cl.rows.every(function (x, i) { return x.join() === P.rows[i].join(); }) && cl.cols.every(function (x, i) { return x.join() === P.cols[i].join(); });
  }

  // ---------- נגיעה וגרירה ----------
  var drag = null, firstMove = true;
  function cellAt(x, y) { var el = document.elementFromPoint(x, y); return el && el.classList && el.classList.contains('c') && el.closest('#nn-board') ? +el.getAttribute('data-i') : -1; }
  function setCell(i, v) { if (cur[i] === v) return; cur[i] = v; }
  $('nn-board').addEventListener('pointerdown', function (e) {
    if (won) return;
    var i = cellAt(e.clientX, e.clientY); if (i < 0) return;
    e.preventDefault();
    var target = tool === 'f' ? 1 : 2;
    undo.push(cur.join('')); if (undo.length > 300) undo.shift();
    drag = { v: cur[i] === target ? 0 : target, r: Math.floor(i / P.n), c: i % P.n, axis: null };
    setCell(i, drag.v); paint();
    if (firstMove) { firstMove = false; CH.used(TOOL, 'start', { mode: mode, n: P.n }); }
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var i = cellAt(e.clientX, e.clientY); if (i < 0) return;
    var r = Math.floor(i / P.n), c = i % P.n;
    if (!drag.axis && (r !== drag.r || c !== drag.c)) drag.axis = r === drag.r ? 'r' : c === drag.c ? 'c' : null;
    if ((drag.axis === 'r' && r !== drag.r) || (drag.axis === 'c' && c !== drag.c) || !drag.axis) return;
    setCell(i, drag.v); paint();
  });
  function end() { if (!drag) return; drag = null; persist(); if (solvedNow()) finish(); }
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);

  // ---------- כלים ----------
  document.querySelectorAll('#nn-tool button').forEach(function (b) {
    b.onclick = function () { tool = b.getAttribute('data-t'); document.querySelectorAll('#nn-tool button').forEach(function (x) { x.classList.toggle('on', x === b); }); };
  });
  $('nn-undo').onclick = function () { if (won || !undo.length) return; cur = undo.pop().split('').map(Number); paint(); persist(); };
  $('nn-clear').onclick = function () { if (won) return; undo.push(cur.join('')); cur = cur.map(function () { return 0; }); paint(); persist(); say('הלוח נוקה. אפשר לבטל עם ↶'); };
  $('nn-check').onclick = function () {
    if (won) return;
    var bad = [];
    cur.forEach(function (v, i) { if (v === 1 && P.sol[i] === 0) bad.push(i); });
    CH.used(TOOL, 'check', { mode: mode });
    if (!bad.length) { say('אין טעויות עד עכשיו ✓ ממשיכים!'); return; }
    var cells = $('nn-board').querySelectorAll('.c');
    bad.forEach(function (i) { cells[i].classList.add('bad'); });
    setTimeout(function () { bad.forEach(function (i) { cells[i].classList.remove('bad'); }); }, 1800);
    say(bad.length === 1 ? 'משבצת אחת צבועה בטעות (באדום)' : bad.length + ' משבצות צבועות בטעות (באדום)');
  };
  $('nn-hint').onclick = function () {
    if (won) return;
    var wrong = [], missing = [];
    cur.forEach(function (v, i) { if (v === 1 && P.sol[i] === 0) wrong.push(i); else if (P.sol[i] === 1 && v !== 1) missing.push(i); });
    var pool = wrong.length ? wrong : missing; if (!pool.length) return;
    var i = pool[Math.floor(Math.random() * pool.length)];
    undo.push(cur.join(''));
    cur[i] = P.sol[i] === 1 ? 1 : 2; hints++;
    paint(); persist();
    var el = $('nn-board').querySelectorAll('.c')[i]; el.classList.add('hint'); setTimeout(function () { el.classList.remove('hint'); }, 2500);
    say(wrong.length ? 'תיקנתי משבצת שהייתה צבועה בטעות 💡' : 'צבעתי משבצת אחת נכונה 💡');
    CH.used(TOOL, 'hint', { mode: mode });
    if (solvedNow()) finish();
  };

  // ---------- ניצחון ----------
  function finish() {
    if (won) return; won = true; clock.on = false;
    cur = cur.map(function (v) { return v === 1 ? 1 : 0; }); paint();
    $('nn-board').classList.add('won');
    var daily = mode === 'daily', st;
    var already = daily && CH.stats(G).doneToday;
    st = CH.record(G, daily && !already, clock.sec, hints);
    if (mode === 'level') { data.done[P.level] = Math.min(data.done[P.level] || 1e9, clock.sec); data.lvl = Math.max(data.lvl, P.level + 1); }
    persist();
    CH.used(TOOL, 'solve', { mode: mode, n: P.n, sec: clock.sec, hints: hints });
    var share = '⬛ שחור ופתור · ' + (daily ? 'אתגר יומי #' + CH.dayNum() : P.label) + ' (' + P.n + '×' + P.n + ')\n⏱ ' + CH.fmt(clock.sec) + (hints ? ' · 💡 ' + hints + ' רמזים' : ' · בלי רמזים') + (daily && st.streak ? '\n🔥 רצף ' + CH.days(st.streak) : '') + '\nמי פותר מהר יותר? 😉';
    var next = [];
    if (mode === 'level') next.push({ label: 'לשלב ' + (P.level + 1) + ' ←', fn: function () { start('level', P.level + 1); drawLevels(); } });
    else if (mode === 'free') next.push({ label: 'עוד לוח ' + P.n + '×' + P.n, fn: function () { start('free', P.n); } });
    else next.push({ label: 'להמשיך בשלבים ←', fn: function () { tab('level'); } });
    CH.win({ tool: TOOL, el: $('nn-win'), daily: daily && !already, stats: st,
      title: hints ? 'פתרתם! 🎉' : 'פתרתם בלי רמזים! 🎉',
      line: '<span>⏱ <b>' + CH.fmt(clock.sec) + '</b></span>' + (hints ? '<span>💡 ' + hints + ' רמזים</span>' : ''),
      share: share, next: next,
      vs: { g: 'nono', s: P.key, n: P.n }, vsMine: { t: clock.sec, h: hints, q: 'time' }, vsWhat: 'אותו לוח',
      vsMsg: '⚔️ אתגר בשחור ופתור: פתרתי את הלוח הזה ב-' + CH.fmt(clock.sec) + (hints ? ' (עם ' + hints + ' רמזים)' : '') + '. תצליחו מהר יותר?' });
  }

  // ---------- לשוניות ושלבים ----------
  function drawLevels() {
    var max = Math.max(40, data.lvl + 4), h = '';
    for (var l = 1; l <= max; l++) {
      var open = l <= data.lvl, done = data.done[l];
      h += '<button type="button" data-l="' + l + '"' + (open ? '' : ' disabled') + ' class="' + (done ? 'done' : '') + (P && mode === 'level' && P.level === l ? ' on' : '') + '" title="' + sizeForLevel(l) + '×' + sizeForLevel(l) + '">' + (open ? (done ? '✓' + l : l) : '🔒') + '</button>';
    }
    $('nn-levels').innerHTML = h;
    $('nn-levels').querySelectorAll('button').forEach(function (b) { b.onclick = function () { start('level', +b.getAttribute('data-l')); drawLevels(); }; });
  }
  function tab(m) {
    CH.vsReset();
    document.querySelectorAll('#nn-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === m); });
    $('nn-lvlbox').hidden = m !== 'level'; $('nn-freebox').hidden = m !== 'free';
    if (m === 'daily') start('daily');
    else if (m === 'level') { var l = data.cur && /^nono-level-(\d+)$/.test(data.cur.key) ? +RegExp.$1 : data.lvl; start('level', Math.min(l, data.lvl)); drawLevels(); }
    else start('free', +(document.querySelector('#nn-sizes .on') || { getAttribute: function () { return 8; } }).getAttribute('data-n'));
  }
  document.querySelectorAll('#nn-tabs button').forEach(function (b) { b.onclick = function () { tab(b.getAttribute('data-m')); }; });
  document.querySelectorAll('#nn-sizes button').forEach(function (b) {
    b.onclick = function () { document.querySelectorAll('#nn-sizes button').forEach(function (x) { x.classList.toggle('on', x === b); }); start('free', +b.getAttribute('data-n')); };
  });
  var rs; window.addEventListener('resize', function () { clearTimeout(rs); rs = setTimeout(function () { if (P) draw(); if (won) $('nn-board').classList.add('won'); }, 200); });

  var first = location.hash === '#shlavim' ? 'level' : data.cur && /^nono-level-/.test(data.cur.key) ? 'level' : 'daily';
  var V = CH.vsIn && CH.vsIn.g === 'nono' && typeof CH.vsIn.s === 'string' && /^nono-/.test(CH.vsIn.s) && [5, 8, 10, 15].indexOf(+CH.vsIn.n) > -1 ? CH.vsIn : null;
  if (V && V.s === 'nono-daily-' + CH.today()) { tab('daily'); CH.vsStart(TOOL, 'הלוח הזה'); }
  else if (V) { document.querySelectorAll('#nn-tabs button').forEach(function (b) { b.setAttribute('aria-selected', 'false'); }); start('vs', V); CH.vsStart(TOOL, 'הלוח הזה'); }
  else tab(first);
})();
