// סודוקו – /kelim/chashiva/sudoku/
// המחולל מוריד ספרות אחת-אחת ובודק אחרי כל הורדה שנשאר פתרון אחד בלבד.
// קל ובינוני: נפתרים גם רק בצעדים פשוטים ("רק ספרה אחת יכולה להיכנס כאן"). קשה ומומחה: פחות רמזים.
(function () {
  'use strict';
  var CH = window.CH, TOOL = 'chashiva_sudoku', G = 'sudoku';
  function $(id) { return document.getElementById(id); }

  // ---------- מנוע (משותף גם לדף "סודוקו להדפסה": window.SDGEN) ----------
  var ROW = [], COL = [], BOX = [], PEERS = [];
  for (var i = 0; i < 81; i++) { ROW.push(Math.floor(i / 9)); COL.push(i % 9); BOX.push(Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3)); }
  for (var a = 0; a < 81; a++) { var p = []; for (var b = 0; b < 81; b++) if (a !== b && (ROW[a] === ROW[b] || COL[a] === COL[b] || BOX[a] === BOX[b])) p.push(b); PEERS.push(p); }
  function bits(m) { var n = 0; while (m) { m &= m - 1; n++; } return n; }
  function cands(g, i) { var m = 0x3FE; PEERS[i].forEach(function (j) { if (g[j]) m &= ~(1 << g[j]); }); return m; }
  // סופר פתרונות עד limit
  function count(g, limit, rnd, out) {
    var best = -1, bm = 0, bc = 10;
    for (var i = 0; i < 81; i++) if (!g[i]) { var m = cands(g, i), c = bits(m); if (c < bc) { bc = c; best = i; bm = m; if (c <= 1) break; } }
    if (best < 0) { if (out) out.push(g.slice()); return 1; }
    if (!bc) return 0;
    var ds = []; for (var d = 1; d <= 9; d++) if (bm & (1 << d)) ds.push(d);
    if (rnd) ds = CH.shuffle(ds, rnd);
    var total = 0;
    for (var k = 0; k < ds.length; k++) { g[best] = ds[k]; total += count(g, limit - total, rnd, out); g[best] = 0; if (total >= limit) break; }
    return total;
  }
  // נפתר רק עם "ספרה יחידה במשבצת" ו"מקום יחיד לספרה"?
  function singles(g0) {
    var g = g0.slice(), prog = true;
    while (prog) {
      prog = false;
      for (var i = 0; i < 81; i++) if (!g[i]) { var m = cands(g, i); if (bits(m) === 1) { g[i] = Math.log2(m); prog = true; } }
      if (prog) continue;
      for (var u = 0; u < 27 && !prog; u++) {
        var cells = []; for (var j = 0; j < 81; j++) if ((u < 9 && ROW[j] === u) || (u >= 9 && u < 18 && COL[j] === u - 9) || (u >= 18 && BOX[j] === u - 18)) cells.push(j);
        for (var d = 1; d <= 9 && !prog; d++) {
          if (cells.some(function (c) { return g[c] === d; })) continue;
          var spots = cells.filter(function (c) { return !g[c] && (cands(g, c) & (1 << d)); });
          if (spots.length === 1) { g[spots[0]] = d; prog = true; }
        }
      }
    }
    return g.indexOf(0) === -1;
  }
  var LEVELS = { kal: { name: 'קל', clues: 40, simple: true }, beinoni: { name: 'בינוני', clues: 32, simple: true }, kashe: { name: 'קשה', clues: 27 }, mumche: { name: 'מומחה', clues: 22 } };
  var ORDER = ['kal', 'beinoni', 'kashe', 'mumche'];
  var NEED = { beinoni: ['kal', 1], kashe: ['beinoni', 2], mumche: ['kashe', 3] };
  function generate(seed, lv) {
    var L = LEVELS[lv], out = null;
    // קשה ומומחה: מנסים עד 12 פעמים לוח שאי אפשר לפתור רק בצעדים פשוטים
    for (var t = 0; t < 12; t++) {
      var rnd = CH.rng(seed + (t ? '#' + t : ''));
      var sol = []; count(new Array(81).fill(0), 1, rnd, sol); sol = sol[0];
      var g = sol.slice(), left = 81;
      var order = CH.shuffle(Array.from({ length: 41 }, function (_, k) { return k; }), rnd); // זוגות סימטריים
      for (var k = 0; k < order.length && left > L.clues; k++) {
        var x = order[k], y = 80 - x, sx = g[x], sy = g[y];
        g[x] = 0; g[y] = 0;
        var ok = count(g.slice(), 2) === 1 && (!L.simple || singles(g));
        if (ok) left -= x === y ? 1 : 2; else { g[x] = sx; g[y] = sy; }
      }
      if (lv === 'mumche') { // מומחה: ממשיכים להוריד גם משבצות בודדות, עד המינימום
        var one = CH.shuffle(Array.from({ length: 81 }, function (_, k) { return k; }), rnd);
        for (var q = 0; q < 81 && left > L.clues; q++) { var z = one[q]; if (!g[z]) continue; var sz = g[z]; g[z] = 0; if (count(g.slice(), 2) === 1) left--; else g[z] = sz; }
      }
      out = { give: g, sol: sol };
      if (L.simple || !singles(g)) break;
    }
    return out;
  }
  window.SDGEN = { generate: generate, LEVELS: LEVELS, ORDER: ORDER };
  if (!$('sd-board')) return;

  // ---------- מצב ----------
  var data = CH.load(G); data.wins = data.wins || {}; data.best = data.best || {};
  var P = null, v = [], notes = [], hinted = {}, undo = [], sel = -1, pencil = false, won = false, mode = 'daily', lv = 'beinoni', hints = 0, mistakes = 0, started = false;
  var clock = CH.clock($('sd-time'));
  // 13.11.2026: כל הרמות פתוחות מההתחלה (מי שמחפש "סודוקו קשה" צריך לקבל לוח קשה מיד). NEED נשאר רק להודעת "כל הכבוד".
  function unlocked() { return true; }
  var PAGE_LV = $('sd-board').getAttribute('data-level'); if (!LEVELS[PAGE_LV]) PAGE_LV = null;
  function say(t) { $('sd-msg').textContent = t || ''; }
  function persist() {
    var s = CH.load(G); s.wins = data.wins; s.best = data.best;
    s.cur = won ? null : { key: P.key, lv: P.lv, v: v.join(''), n: notes.join(','), h: Object.keys(hinted).join(','), sec: clock.sec, hints: hints };
    data.cur = s.cur; CH.save(G, s);
  }
  function start(m, level, seedOverride) {
    if (m !== 'vs') CH.vsReset();
    mode = m; lv = level; won = false; undo = []; hinted = {}; hints = 0; sel = -1; started = false; $('sd-win').innerHTML = ''; say('');
    var seed = seedOverride || (m === 'daily' ? 'sudoku-daily-' + CH.today() : 'sudoku-' + level + '-' + Date.now());
    P = generate(seed, level); P.key = seed; P.lv = level;
    v = P.give.slice(); notes = new Array(81).fill(0);
    var sv = data.cur;
    if (sv && sv.key === seed && sv.v && sv.v.length === 81) {
      v = sv.v.split('').map(Number); notes = (sv.n || '').split(',').map(Number); if (notes.length !== 81) notes = new Array(81).fill(0);
      (sv.h || '').split(',').forEach(function (x) { if (x !== '') hinted[x] = 1; }); hints = sv.hints || 0; clock.set(sv.sec);
    } else clock.set(0);
    clock.on = true;
    $('sd-label').textContent = (m === 'daily' ? 'האתגר היומי · ' + CH.shortDate() + ' · ' : m === 'vs' ? 'אתגר מחבר · ' : '') + LEVELS[level].name;
    $('sd-board').classList.remove('won');
    var st = CH.stats(G);
    $('sd-today').hidden = !(m === 'daily' && st.doneToday);
    if (m === 'daily' && st.doneToday) $('sd-today').textContent = 'כבר פתרתם את האתגר של היום ב-' + CH.fmt(st.todaySec) + ' ✓ רצף: ' + st.streak + '. מחר מחכה לוח חדש.';
    draw(); persist();
  }

  // ---------- ציור ----------
  function draw() {
    var b = $('sd-board');
    if (!b.children.length) {
      var h = '';
      for (var i = 0; i < 81; i++) h += '<button type="button" data-i="' + i + '" class="' + (COL[i] % 3 === 2 && COL[i] < 8 ? 'c3 ' : '') + (ROW[i] % 3 === 2 && ROW[i] < 8 ? 'r3' : '') + '"></button>';
      b.innerHTML = h;
    }
    var selV = sel >= 0 ? v[sel] : 0, cnt = new Array(10).fill(0);
    for (var k = 0; k < 81; k++) {
      var el = b.children[k], val = v[k];
      if (val) cnt[val]++;
      var err = val && PEERS[k].some(function (j) { return v[j] === val; });
      el.className = (COL[k] % 3 === 2 && COL[k] < 8 ? 'c3 ' : '') + (ROW[k] % 3 === 2 && ROW[k] < 8 ? 'r3 ' : '') + (P.give[k] ? 'g ' : '') + (hinted[k] ? 'hinted ' : '') + (err && !P.give[k] ? 'err ' : '') +
        (k === sel ? 'sel' : sel >= 0 && (ROW[k] === ROW[sel] || COL[k] === COL[sel] || BOX[k] === BOX[sel]) ? 'peer' : '') + (selV && val === selV && k !== sel ? ' same' : '');
      if (val) el.textContent = val;
      else if (notes[k]) { var n = '<span class="nt">'; for (var d = 1; d <= 9; d++) n += '<i>' + (notes[k] & (1 << d) ? d : '') + '</i>'; el.innerHTML = n + '</span>'; }
      else el.textContent = '';
      el.setAttribute('aria-label', 'שורה ' + (ROW[k] + 1) + ' עמודה ' + (COL[k] + 1) + (val ? ', ' + val : ', ריק'));
    }
    $('sd-pad').querySelectorAll('button').forEach(function (pb) { var d = +pb.getAttribute('data-d'); pb.classList.toggle('gone', cnt[d] >= 9); pb.querySelector('small').textContent = 9 - cnt[d] > 0 ? 9 - cnt[d] : ''; });
    $('sd-pad').classList.toggle('pencil', pencil);
  }

  // ---------- פעולות ----------
  function snap() { undo.push(v.join('') + '|' + notes.join(',')); if (undo.length > 300) undo.shift(); }
  function first() { if (!started) { started = true; CH.used(TOOL, 'start', { mode: mode, level: lv }); } }
  function put(d) {
    if (won || sel < 0 || P.give[sel]) return;
    first(); snap();
    if (pencil) { if (v[sel]) return; notes[sel] ^= (1 << d); }
    else {
      if (v[sel] === d) { v[sel] = 0; }
      else {
        v[sel] = d; notes[sel] = 0;
        PEERS[sel].forEach(function (j) { notes[j] &= ~(1 << d); }); // מוחקים את הספרה מההערות של השכנים
        if (d !== P.sol[sel]) mistakes++;
      }
    }
    draw(); persist(); check();
  }
  function erase() { if (won || sel < 0 || P.give[sel]) return; snap(); v[sel] = 0; notes[sel] = 0; delete hinted[sel]; draw(); persist(); }
  function check() { if (v.every(function (x, i) { return x === P.sol[i]; })) finish(); }
  $('sd-board').addEventListener('click', function (e) { var t = e.target.closest('[data-i]'); if (!t) return; sel = +t.getAttribute('data-i'); draw(); });
  $('sd-pad').addEventListener('click', function (e) { var t = e.target.closest('[data-d]'); if (t) put(+t.getAttribute('data-d')); });
  $('sd-pencil').onclick = function () { pencil = !pencil; this.classList.toggle('on', pencil); this.setAttribute('aria-pressed', pencil); draw(); };
  $('sd-erase').onclick = erase;
  $('sd-undo').onclick = function () { if (won || !undo.length) return; var s = undo.pop().split('|'); v = s[0].split('').map(Number); notes = s[1].split(',').map(Number); draw(); persist(); };
  $('sd-check').onclick = function () {
    if (won) return;
    var bad = []; v.forEach(function (x, i) { if (x && x !== P.sol[i]) bad.push(i); });
    CH.used(TOOL, 'check', { mode: mode, level: lv });
    if (!bad.length) { say('הכול נכון עד עכשיו ✓'); return; }
    var cells = $('sd-board').children; bad.forEach(function (i) { cells[i].classList.add('bad'); });
    setTimeout(function () { bad.forEach(function (i) { cells[i].classList.remove('bad'); }); }, 2000);
    say(bad.length === 1 ? 'ספרה אחת לא במקום (באדום)' : bad.length + ' ספרות לא במקום (באדום)');
  };
  $('sd-hint').onclick = function () {
    if (won) return;
    var i = sel >= 0 && !P.give[sel] && v[sel] !== P.sol[sel] ? sel : -1;
    if (i < 0) { // המשבצת הריקה עם הכי מעט אפשרויות
      var bc = 10; for (var k = 0; k < 81; k++) if (v[k] !== P.sol[k]) { var c = v[k] ? 0 : bits(cands(v, k)); if (c < bc) { bc = c; i = k; } }
    }
    if (i < 0) return;
    first(); snap(); v[i] = P.sol[i]; notes[i] = 0; hinted[i] = 1; hints++; sel = i;
    PEERS[i].forEach(function (j) { notes[j] &= ~(1 << v[i]); });
    say('💡 הספרה ' + v[i] + ' במשבצת המסומנת'); CH.used(TOOL, 'hint', { mode: mode, level: lv });
    draw(); persist(); check();
  };
  $('sd-new').onclick = function () { if (mode === 'daily') { tab('levels'); return; } start('level', lv); CH.used(TOOL, 'new', { level: lv }); };
  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (/^[1-9]$/.test(e.key)) { put(+e.key); e.preventDefault(); }
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { erase(); e.preventDefault(); }
    else if (/^Arrow/.test(e.key) && sel >= 0) {
      var r = ROW[sel], c = COL[sel];
      if (e.key === 'ArrowUp') r = (r + 8) % 9; if (e.key === 'ArrowDown') r = (r + 1) % 9;
      if (e.key === 'ArrowLeft') c = (c + 8) % 9; if (e.key === 'ArrowRight') c = (c + 1) % 9;
      sel = r * 9 + c; draw(); e.preventDefault();
    } else if (e.key === 'n' || e.key === 'מ') $('sd-pencil').click();
  });

  // ---------- ניצחון ----------
  function finish() {
    if (won) return; won = true; clock.on = false; sel = -1; draw();
    $('sd-board').classList.add('won');
    var daily = mode === 'daily', already = daily && CH.stats(G).doneToday;
    var st = CH.record(G, daily && !already, clock.sec, hints);
    data.wins[lv] = (data.wins[lv] || 0) + 1;
    var rec = !data.best[lv] || clock.sec < data.best[lv]; if (rec && !hints) data.best[lv] = clock.sec;
    persist(); drawLevels();
    CH.used(TOOL, 'solve', { mode: mode, level: lv, sec: clock.sec, hints: hints });
    var share = '🔢 סודוקו · ' + (daily ? 'אתגר יומי #' + CH.dayNum() + ' · ' : '') + LEVELS[lv].name + '\n⏱ ' + CH.fmt(clock.sec) + (hints ? ' · 💡 ' + hints + ' רמזים' : ' · בלי רמזים') + (daily && st.streak ? '\n🔥 רצף ' + CH.days(st.streak) : '') + '\nמנסים לנצח אותי? 😉';
    var newly = ORDER.filter(function (l) { return NEED[l] && NEED[l][0] === lv && data.wins[lv] === NEED[l][1]; })[0];
    var next = [{ label: 'עוד לוח ' + LEVELS[lv].name, fn: function () { tab('levels'); start('level', lv); } }];
    if (newly) next.unshift({ label: '🪜 מוכנים לרמת ' + LEVELS[newly].name + '? ←', fn: function () { tab('levels'); pick(newly); } });
    CH.win({ tool: TOOL, el: $('sd-win'), daily: daily && !already, stats: st,
      title: hints ? 'פתרתם! 🎉' : 'פתרתם בלי רמזים! 🎉',
      line: '<span>⏱ <b>' + CH.fmt(clock.sec) + '</b></span>' + (rec && !hints ? '<span>🏆 שיא חדש ב' + LEVELS[lv].name + '</span>' : data.best[lv] ? '<span>השיא שלכם: ' + CH.fmt(data.best[lv]) + '</span>' : '') + (hints ? '<span>💡 ' + hints + '</span>' : ''),
      share: share, next: next,
      vs: { g: 'sudoku', s: P.key, l: lv }, vsMine: { t: clock.sec, h: hints, q: 'time' }, vsWhat: 'אותו לוח',
      vsMsg: '⚔️ אתגר בסודוקו (' + LEVELS[lv].name + '): פתרתי את הלוח הזה ב-' + CH.fmt(clock.sec) + (hints ? ' (עם ' + hints + ' רמזים)' : '') + '. תצליחו מהר יותר?' });
  }

  // ---------- רמות ולשוניות ----------
  function drawLevels() {
    $('sd-levels').innerHTML = ORDER.map(function (l) {
      var open = unlocked(l), n = NEED[l];
      return '<button type="button" data-l="' + l + '"' + (open ? '' : ' disabled') + ' class="' + (mode === 'level' && lv === l ? 'on' : '') + '" title="' + (open ? '' : 'נפתח אחרי ' + n[1] + ' לוחות ' + LEVELS[n[0]].name) + '">' + (open ? '' : '🔒 ') + LEVELS[l].name + (data.wins[l] ? ' · ' + data.wins[l] + '✓' : '') + '</button>';
    }).join('');
    $('sd-lockmsg').textContent = 'קל ובינוני נפתרים בלי לנחש. קשה ומומחה (קשה מאוד) דורשים לחשוב כמה צעדים קדימה.';
    $('sd-levels').querySelectorAll('button').forEach(function (b) { b.onclick = function () { pick(b.getAttribute('data-l')); }; });
  }
  function pick(l) { if (!unlocked(l)) return; start('level', l); drawLevels(); }
  function tab(m) {
    CH.vsReset();
    document.querySelectorAll('#sd-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === m); });
    $('sd-lvlbox').hidden = m !== 'levels';
    $('sd-new').hidden = m === 'daily';
    if (m === 'daily') start('daily', 'beinoni');
    else {
      var sv = data.cur;
      if (sv && /^sudoku-(kal|beinoni|kashe|mumche)-\d+$/.test(sv.key) && (!PAGE_LV || sv.lv === PAGE_LV)) start('level', sv.lv, sv.key);
      else start('level', PAGE_LV || 'beinoni');
      drawLevels();
    }
  }
  document.querySelectorAll('#sd-tabs button').forEach(function (b) { b.onclick = function () { tab(b.getAttribute('data-m')); }; });
  var V = CH.vsIn && CH.vsIn.g === 'sudoku' && typeof CH.vsIn.s === 'string' && /^sudoku-/.test(CH.vsIn.s) && LEVELS[CH.vsIn.l] ? CH.vsIn : null;
  if (V && V.s === 'sudoku-daily-' + CH.today()) { tab('daily'); CH.vsStart(TOOL, 'הלוח הזה'); }
  else if (V) { document.querySelectorAll('#sd-tabs button').forEach(function (b) { b.setAttribute('aria-selected', 'false'); }); $('sd-new').hidden = false; start('vs', V.l, V.s); CH.vsStart(TOOL, 'הלוח הזה'); }
  else tab(PAGE_LV || (data.cur && /^sudoku-(kal|beinoni|kashe|mumche)-/.test(data.cur.key)) ? 'levels' : 'daily');
})();
