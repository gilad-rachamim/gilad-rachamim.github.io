// סודוקו לילדים – /kelim/chashiva/sudoku/yeladim/ (13.11.2026)
// לוחות 4×4 (ריבועים 2×2) ו-6×6 (ריבועים 2×3), במספרים או בציורים. לכל לוח פתרון אחד בלבד.
// המחולל זמין גם לדף "סודוקו להדפסה" דרך window.SDKIDS.
(function () {
  'use strict';
  var CH = window.CH;
  function $(id) { return document.getElementById(id); }

  // ---------- מנוע ----------
  var GEO = {};
  function geo(N) {
    if (GEO[N]) return GEO[N];
    var bw = N === 4 ? 2 : 3, bh = 2, peers = [];
    for (var a = 0; a < N * N; a++) {
      var ra = Math.floor(a / N), ca = a % N, ba = Math.floor(ra / bh) * (N / bw) + Math.floor(ca / bw), p = [];
      for (var b = 0; b < N * N; b++) {
        if (a === b) continue;
        var rb = Math.floor(b / N), cb = b % N, bb = Math.floor(rb / bh) * (N / bw) + Math.floor(cb / bw);
        if (ra === rb || ca === cb || ba === bb) p.push(b);
      }
      peers.push(p);
    }
    return (GEO[N] = { N: N, bw: bw, bh: bh, peers: peers });
  }
  function count(G, g, limit, rnd, out) {
    var i = g.indexOf(0);
    if (i < 0) { if (out) out.push(g.slice()); return 1; }
    var used = {}; G.peers[i].forEach(function (j) { used[g[j]] = 1; });
    var ds = []; for (var d = 1; d <= G.N; d++) if (!used[d]) ds.push(d);
    if (rnd) ds = CH.shuffle(ds, rnd);
    var n = 0;
    for (var k = 0; k < ds.length && n < limit; k++) { g[i] = ds[k]; n += count(G, g, limit - n, rnd, out); }
    g[i] = 0; return n;
  }
  // clues = כמה משבצות נשארות מלאות. 4×4: קל 8, מאתגר 6. 6×6: קל 22, מאתגר 16.
  function gen(N, seed, clues) {
    var G = geo(N), rnd = CH.rng(seed), sol = [];
    count(G, new Array(N * N).fill(0), 1, rnd, sol); sol = sol[0];
    var g = sol.slice(), left = N * N;
    var order = CH.shuffle(Array.from({ length: N * N }, function (_, k) { return k; }), rnd);
    for (var k = 0; k < order.length && left > clues; k++) {
      var x = order[k], s = g[x]; g[x] = 0;
      if (count(G, g.slice(), 2) === 1) left--; else g[x] = s;
    }
    return { give: g, sol: sol, N: N, bw: G.bw, bh: G.bh };
  }
  var CLUES = { 4: { kal: 8, kashe: 6 }, 6: { kal: 22, kashe: 16 } };
  var PICS = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉'];
  window.SDKIDS = { gen: gen, CLUES: CLUES, PICS: PICS };

  // ---------- משחק ----------
  if (!$('sk-board')) return;
  var TOOL = 'chashiva_sudoku_kids', N = 4, lvl = 'kal', pics = false, P = null, v = [], sel = -1, won = false, hints = 0, started = false;
  var st = {}; try { st = JSON.parse(localStorage.getItem('sudoku-kids') || '{}') || {}; } catch (e) { st = {}; }
  if (st.N === 6) N = 6; if (st.lvl === 'kashe') lvl = 'kashe'; if (st.pics) pics = true;
  function save() { try { localStorage.setItem('sudoku-kids', JSON.stringify({ N: N, lvl: lvl, pics: pics, solved: st.solved || 0 })); } catch (e) {} }
  function sym(d) { return d ? (pics ? PICS[d - 1] : String(d)) : ''; }
  function say(t) { $('sk-msg').textContent = t || ''; }
  function fresh() {
    P = gen(N, 'kids-' + N + '-' + lvl + '-' + Date.now(), CLUES[N][lvl]);
    v = P.give.slice(); sel = -1; won = false; hints = 0; started = false; say(''); $('sk-win').hidden = true;
    var b = $('sk-board'); b.style.gridTemplateColumns = 'repeat(' + N + ',1fr)'; b.classList.remove('won'); b.classList.toggle('sk-6', N === 6);
    $('sk-pad').style.gridTemplateColumns = 'repeat(' + N + ',1fr)';
    draw(); chips();
  }
  function draw() {
    var h = '';
    for (var i = 0; i < N * N; i++) {
      var r = Math.floor(i / N), c = i % N, g = !!P.give[i], val = v[i];
      var err = val && geo(N).peers[i].some(function (j) { return v[j] === val; });
      var cls = (g ? 'g ' : '') + ((c + 1) % P.bw === 0 && c < N - 1 ? 'c3 ' : '') + ((r + 1) % P.bh === 0 && r < N - 1 ? 'r3 ' : '') + (i === sel ? 'sel ' : '') + (err && !g ? 'err ' : '') + (sel > -1 && val && v[sel] === val ? 'same' : '');
      h += '<button type="button" data-i="' + i + '" class="' + cls + '" aria-label="שורה ' + (r + 1) + ', משבצת ' + (c + 1) + ': ' + (val ? (pics ? 'ציור ' + val : val) : 'ריקה') + (g ? ' (נתון)' : '') + '">' + sym(val) + '</button>';
    }
    $('sk-board').innerHTML = h;
    var ph = ''; for (var d = 1; d <= N; d++) ph += '<button type="button" data-d="' + d + '" aria-label="' + (pics ? 'ציור ' + d : d) + '">' + sym(d) + '</button>';
    ph += '<button type="button" data-d="0" class="sk-er" aria-label="מחיקה">⌫</button>';
    $('sk-pad').innerHTML = ph;
  }
  function chips() {
    document.querySelectorAll('#sk-size button').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-n') === N); });
    document.querySelectorAll('#sk-lvl button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-l') === lvl); });
    $('sk-pics').setAttribute('aria-pressed', pics); $('sk-pics').textContent = pics ? '🔢 מספרים' : '🍎 ציורים';
  }
  function put(d) {
    if (won || sel < 0 || P.give[sel]) return;
    if (!started) { started = true; if (CH.used) CH.used(TOOL, 'start', { size: N, pics: pics }); }
    v[sel] = d; draw();
    if (v.every(function (x, i) { return x === P.sol[i]; })) finish();
    else if (v.indexOf(0) < 0) say('הלוח מלא, אבל משהו לא מסתדר. חפשו משבצת אדומה 🔍');
  }
  function finish() {
    won = true; st.solved = (st.solved || 0) + 1; save();
    $('sk-board').classList.add('won');
    $('sk-win').hidden = false;
    $('sk-win-t').textContent = '🎉 כל הכבוד! פתרתם' + (hints ? ' (עם ' + hints + ' רמזים)' : ' בלי רמזים') + '. עד עכשיו: ' + (st.solved === 1 ? 'לוח אחד' : st.solved + ' לוחות') + '.';
    say('');
  }
  $('sk-board').addEventListener('click', function (e) { var t = e.target.closest('[data-i]'); if (!t || won) return; sel = +t.getAttribute('data-i'); draw(); });
  $('sk-pad').addEventListener('click', function (e) { var t = e.target.closest('[data-d]'); if (t) put(+t.getAttribute('data-d')); });
  document.addEventListener('keydown', function (e) {
    if (!P || /INPUT|TEXTAREA/.test((e.target.tagName || ''))) return;
    if (e.key >= '1' && e.key <= String(N)) { put(+e.key); e.preventDefault(); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { put(0); e.preventDefault(); }
    else if (/Arrow/.test(e.key) && sel > -1) {
      var r = Math.floor(sel / N), c = sel % N;
      if (e.key === 'ArrowUp') r = Math.max(0, r - 1); if (e.key === 'ArrowDown') r = Math.min(N - 1, r + 1);
      if (e.key === 'ArrowLeft') c = Math.min(N - 1, c + 1); if (e.key === 'ArrowRight') c = Math.max(0, c - 1);
      sel = r * N + c; draw(); var b = $('sk-board').children[sel]; if (b) b.focus(); e.preventDefault();
    }
  });
  $('sk-hint').onclick = function () {
    if (won) return;
    var empty = []; v.forEach(function (x, i) { if (x !== P.sol[i]) empty.push(i); });
    if (!empty.length) return;
    var i = sel > -1 && v[sel] !== P.sol[sel] ? sel : empty[Math.floor(Math.random() * empty.length)];
    v[i] = P.sol[i]; sel = i; hints++; draw(); say('💡 הנה עזרה קטנה: המשבצת המסומנת.');
    if (v.every(function (x, k) { return x === P.sol[k]; })) finish();
  };
  $('sk-new').onclick = fresh; $('sk-again').onclick = fresh;
  document.querySelectorAll('#sk-size button').forEach(function (b) { b.onclick = function () { N = +b.getAttribute('data-n'); save(); fresh(); }; });
  document.querySelectorAll('#sk-lvl button').forEach(function (b) { b.onclick = function () { lvl = b.getAttribute('data-l'); save(); fresh(); }; });
  $('sk-pics').onclick = function () { pics = !pics; save(); draw(); chips(); };
  fresh();
})();
