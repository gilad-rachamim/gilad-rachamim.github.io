// תשבץ ותפזורת לחנוכה – /kodesh/chanuka/tashbetz/
// כל לחיצה על "חדש" בונה לוח אחר. הטבלה מוצגת מימין לשמאל: עמודה 0 בצד ימין.
(function () {
  'use strict';
  var TOOL = 'chanuka_tashbetz';
  function $(id) { return document.getElementById(id); }
  var once = {};
  function used(how, extra) { var k = how + (extra || ''); if (once[k]) return; once[k] = 1; if (window.toolUsed) window.toolUsed(TOOL, { how: how, mode: mode, level: extra || '' }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  function norm(ch) { return FIN[ch] || ch; }
  var mode = 'tashbetz';

  // ================= תשבץ =================
  var CLUES = [
    ['חנוכייה', 'בה מדליקים את הנרות'], ['סביבון', 'מסתובב ונופל על נ, ג, ה או פ'], ['סופגנייה', 'מאפה מטוגן, לפעמים עם ריבה'],
    ['לביבה', 'מטגנים אותה מתפוחי אדמה'], ['מכבים', 'כינוי לחשמונאים'], ['מתתיהו', 'אביהם של יהודה ואחיו'],
    ['שמש', 'הנר שמדליק את כל השאר'], ['כסלו', 'החודש שבו מתחיל החג'], ['יוונים', 'נגדם נלחמו החשמונאים'],
    ['מקדש', 'שם הדליקו את המנורה'], ['שמונה', 'מספר ימי החג'], ['פתילה', 'טובלים אותה בשמן ומדליקים'],
    ['מנורה', 'היו לה שבעה קנים במקדש'], ['שמן', 'נמצא פך אחד טהור ממנו'], ['נרות', 'מוסיפים אחד בכל לילה'],
    ['יהודה', 'המכבי, מנהיג המלחמה'], ['אורים', 'החג נקרא גם חג ה...'], ['טבת', 'החודש שבו מסתיים החג'], ['הלל', 'אומרים אותו כל יום בחנוכה, בתפילה']
  ];
  var cw = null;
  function buildCrossword(count) {
    var best = null;
    for (var attempt = 0; attempt < 40; attempt++) {
      var words = shuffle(CLUES).slice(0, count + 4).sort(function (a, b) { return b[0].length - a[0].length; });
      var grid = {}, placed = [];
      function get(r, c) { return grid[r + ',' + c]; }
      function can(w, r, c, h) {
        var dr = h ? 0 : 1, dc = h ? 1 : 0, cross = 0;
        if (get(r - dr, c - dc) || get(r + dr * w.length, c + dc * w.length)) return -1;
        for (var i = 0; i < w.length; i++) {
          var rr = r + dr * i, cc = c + dc * i, e = get(rr, cc);
          if (e) { if (e !== w[i]) return -1; cross++; }
          else if (get(rr + dc, cc + dr) || get(rr - dc, cc - dr)) return -1;
        }
        return cross;
      }
      function put(x, r, c, h) {
        for (var i = 0; i < x[0].length; i++) grid[(h ? r : r + i) + ',' + (h ? c + i : c)] = x[0][i];
        placed.push({ w: x[0], clue: x[1], r: r, c: c, h: h });
      }
      put(words[0], 0, 0, true);
      for (var k = 1; k < words.length && placed.length < count; k++) {
        var w = words[k][0], opts = [];
        placed.forEach(function (p) {
          for (var i = 0; i < p.w.length; i++) for (var j = 0; j < w.length; j++) {
            if (p.w[i] !== w[j]) continue;
            var h = !p.h, pr = p.h ? p.r : p.r + i, pc = p.h ? p.c + i : p.c;
            var r = h ? pr : pr - j, c = h ? pc - j : pc, s = can(w, r, c, h);
            if (s > 0) opts.push([s + Math.random() * .5, r, c, h]);
          }
        });
        if (opts.length) { opts.sort(function (a, b) { return b[0] - a[0]; }); put(words[k], opts[0][1], opts[0][2], opts[0][3]); }
      }
      var rs = [], cs = []; Object.keys(grid).forEach(function (k2) { var p = k2.split(','); rs.push(+p[0]); cs.push(+p[1]); });
      var R0 = Math.min.apply(0, rs), C0 = Math.min.apply(0, cs), rows = Math.max.apply(0, rs) - R0 + 1, cols = Math.max.apply(0, cs) - C0 + 1;
      var score = placed.length * 100 - Math.max(rows, cols) * 3 - (cols > 13 ? 1000 : 0);
      if (!best || score > best.score) best = { score: score, placed: placed, R0: R0, C0: C0, rows: rows, cols: cols };
      if (best && best.placed.length >= count && Math.max(rows, cols) <= 11) break;
    }
    best.placed.forEach(function (p) { p.r -= best.R0; p.c -= best.C0; });
    // מספור לפי סדר הקריאה: שורה, ואז מימין לשמאל
    var starts = {}, n = 0;
    best.placed.slice().sort(function (a, b) { return a.r - b.r || a.c - b.c; }).forEach(function (p) {
      var k3 = p.r + ',' + p.c; if (!starts[k3]) starts[k3] = ++n; p.n = starts[k3];
    });
    best.starts = starts;
    return best;
  }
  function drawCrossword() {
    var lvl = $('tb-level').value, count = lvl === 'kal' ? 6 : lvl === 'kashe' ? 12 : 9;
    cw = buildCrossword(count);
    var cells = {};
    cw.placed.forEach(function (p) { for (var i = 0; i < p.w.length; i++) cells[(p.h ? p.r : p.r + i) + ',' + (p.h ? p.c + i : p.c)] = p.w[i]; });
    cw.cells = cells;
    var g = $('tb-grid'); g.style.gridTemplateColumns = 'repeat(' + cw.cols + ',1fr)'; g.className = 'tb-grid cw';
    var html = '';
    for (var r = 0; r < cw.rows; r++) for (var c = 0; c < cw.cols; c++) {
      var k = r + ',' + c;
      if (!cells[k]) { html += '<div class="x"></div>'; continue; }
      html += '<div class="c">' + (cw.starts[k] ? '<i>' + cw.starts[k] + '</i>' : '') + '<input maxlength="1" data-k="' + k + '" aria-label="משבצת"></div>';
    }
    g.innerHTML = html;
    function list(h) {
      return cw.placed.filter(function (p) { return p.h === h; }).sort(function (a, b) { return a.n - b.n; })
        .map(function (p) { return '<li><b>' + p.n + '.</b> ' + p.clue + ' <small>(' + p.w.length + ')</small></li>'; }).join('');
    }
    $('tb-side').innerHTML = '<h3>מאוזן</h3><ol>' + list(true) + '</ol><h3>מאונך</h3><ol>' + list(false) + '</ol>';
    var dir = 'h';
    g.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('focus', function () { inp.select(); });
      inp.addEventListener('input', function () {
        inp.value = inp.value.slice(-1); inp.parentNode.classList.remove('bad', 'ok'); used('play');
        if (!inp.value) return;
        var p = inp.getAttribute('data-k').split(','), r = +p[0], c = +p[1];
        var nx = g.querySelector('[data-k="' + (dir === 'h' ? r + ',' + (c + 1) : (r + 1) + ',' + c) + '"]');
        if (!nx) { dir = dir === 'h' ? 'v' : 'h'; nx = g.querySelector('[data-k="' + (dir === 'h' ? r + ',' + (c + 1) : (r + 1) + ',' + c) + '"]'); }
        if (nx && !nx.value) nx.focus();
      });
      inp.addEventListener('click', function () {
        var p = inp.getAttribute('data-k').split(','), r = +p[0], c = +p[1];
        var hasH = g.querySelector('[data-k="' + r + ',' + (c + 1) + '"]') || g.querySelector('[data-k="' + r + ',' + (c - 1) + '"]');
        dir = hasH ? 'h' : 'v';
      });
    });
    say('');
  }

  // ================= תפזורת =================
  var WORDS = ['חנוכה', 'סביבון', 'סופגנייה', 'לביבות', 'שמן', 'פך', 'נס', 'נרות', 'שמש', 'מכבים', 'חשמונאים', 'יהודה', 'מתתיהו',
    'מקדש', 'מנורה', 'אור', 'פתילה', 'יוונים', 'גבורה', 'כסלו', 'טבת', 'הלל', 'חנוכייה', 'שמונה'];
  var LET = 'אבגדהוזחטיכלמנסעפצקרשת';
  var tz = null, pick = null;
  function buildSearch(lvl) {
    var N = lvl === 'kal' ? 8 : lvl === 'kashe' ? 12 : 10, cnt = lvl === 'kal' ? 7 : lvl === 'kashe' ? 14 : 10;
    var dirs = [[0, 1], [1, 0]]; if (lvl !== 'kal') dirs.push([1, 1], [1, -1]); if (lvl === 'kashe') dirs.push([0, -1], [-1, 0], [-1, -1], [-1, 1]);
    for (var attempt = 0; attempt < 30; attempt++) {
      var g = [], placed = [];
      for (var r = 0; r < N; r++) { g.push([]); for (var c = 0; c < N; c++) g[r].push(''); }
      shuffle(WORDS.filter(function (w) { return w.length <= N; })).some(function (w) {
        for (var t = 0; t < 120; t++) {
          var d = dirs[Math.floor(Math.random() * dirs.length)], r0 = Math.floor(Math.random() * N), c0 = Math.floor(Math.random() * N), ok = true;
          for (var i = 0; i < w.length; i++) {
            var rr = r0 + d[0] * i, cc = c0 + d[1] * i;
            if (rr < 0 || cc < 0 || rr >= N || cc >= N || (g[rr][cc] && g[rr][cc] !== w[i])) { ok = false; break; }
          }
          if (!ok) continue;
          for (i = 0; i < w.length; i++) g[r0 + d[0] * i][c0 + d[1] * i] = w[i];
          placed.push({ w: w, r: r0, c: c0, d: d, found: false });
          break;
        }
        return placed.length >= cnt;
      });
      if (placed.length >= cnt) break;
    }
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (!g[r][c]) g[r][c] = LET[Math.floor(Math.random() * LET.length)];
    return { N: N, g: g, placed: placed };
  }
  function drawSearch() {
    tz = buildSearch($('tb-level').value); pick = null;
    var g = $('tb-grid'); g.style.gridTemplateColumns = 'repeat(' + tz.N + ',1fr)'; g.className = 'tb-grid ws';
    var html = '';
    for (var r = 0; r < tz.N; r++) for (var c = 0; c < tz.N; c++) html += '<button type="button" data-r="' + r + '" data-c="' + c + '">' + tz.g[r][c] + '</button>';
    g.innerHTML = html;
    g.querySelectorAll('button').forEach(function (b) { b.onclick = function () { tap(+b.getAttribute('data-r'), +b.getAttribute('data-c'), b); }; });
    sideSearch(); say('לוחצים על האות הראשונה של מילה, ואז על האות האחרונה שלה.');
  }
  function sideSearch() {
    var left = tz.placed.filter(function (p) { return !p.found; }).length;
    $('tb-side').innerHTML = '<h3>מילים למצוא (' + (tz.placed.length - left) + '/' + tz.placed.length + ')</h3><ul class="ws-list">' +
      tz.placed.slice().sort(function (a, b) { return a.w.localeCompare(b.w, 'he'); }).map(function (p) { return '<li' + (p.found ? ' class="f"' : '') + '>' + p.w + '</li>'; }).join('') + '</ul>';
  }
  function cell(r, c) { return $('tb-grid').querySelector('[data-r="' + r + '"][data-c="' + c + '"]'); }
  function tap(r, c, b) {
    used('play');
    if (!pick) { pick = [r, c]; b.classList.add('sel'); return; }
    var a = pick; pick = null; cell(a[0], a[1]).classList.remove('sel');
    var dr = r - a[0], dc = c - a[1], len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
    if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) { say('המילים הולכות בקו ישר. נסו שוב.'); return; }
    var sr = Math.sign(dr), sc = Math.sign(dc), s = '';
    for (var i = 0; i < len; i++) s += tz.g[a[0] + sr * i][a[1] + sc * i];
    var rev = s.split('').reverse().join('');
    var hit = tz.placed.filter(function (p) { return !p.found && (p.w === s || p.w === rev); })[0];
    if (!hit) { say('זו לא אחת המילים. נסו שוב.'); return; }
    hit.found = true;
    for (i = 0; i < len; i++) cell(a[0] + sr * i, a[1] + sc * i).classList.add('f');
    sideSearch();
    var left = tz.placed.filter(function (p) { return !p.found; }).length;
    say(left ? 'מצאתם: ' + hit.w + '! נשארו ' + left + '.' : 'מצאתם את כל המילים. חנוכה שמח! 🎉');
    if (!left) used('solved', $('tb-level').value);
  }

  // ================= משותף =================
  function say(t) { $('tb-msg').textContent = t; }
  function draw() {
    $('tb-check').style.display = $('tb-show').style.display = mode === 'tashbetz' ? '' : 'none';
    if (mode === 'tashbetz') drawCrossword(); else drawSearch();
    document.querySelectorAll('#tb-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === mode); });
    $('tb-ph').textContent = mode === 'tashbetz' ? 'תשבץ חנוכה' : 'תפזורת חנוכה';
  }
  $('tb-check').onclick = function () {
    var all = true, full = true;
    $('tb-grid').querySelectorAll('input').forEach(function (inp) {
      var want = cw.cells[inp.getAttribute('data-k')], v = inp.value.trim();
      inp.parentNode.classList.remove('bad', 'ok');
      if (!v) { full = false; all = false; return; }
      if (norm(v) === norm(want)) inp.parentNode.classList.add('ok'); else { inp.parentNode.classList.add('bad'); all = false; }
    });
    say(all ? 'פתרתם הכול נכון. חנוכה שמח! 🎉' : full ? 'יש משבצות באדום. נסו לתקן אותן.' : 'מה שבירוק נכון. ממשיכים למלא.');
    used(all ? 'solved' : 'check', $('tb-level').value);
  };
  $('tb-show').onclick = function () {
    $('tb-grid').querySelectorAll('input').forEach(function (inp) { inp.value = cw.cells[inp.getAttribute('data-k')]; inp.parentNode.classList.remove('bad'); });
    say('אלה התשובות. אפשר ללחוץ "לוח חדש".'); used('reveal');
  };
  $('tb-new').onclick = function () { draw(); used('new'); };
  $('tb-level').onchange = function () { draw(); };
  $('tb-print').onclick = function () { used('print'); window.print(); };
  document.querySelectorAll('#tb-tabs button').forEach(function (b) {
    b.onclick = function () { mode = b.getAttribute('data-m'); draw(); used('mode'); };
  });
  if (/[?&]m=tapzoret/.test(location.search)) mode = 'tapzoret';
  draw();
})();
