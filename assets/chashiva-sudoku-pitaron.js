// פותר סודוקו – /kelim/chashiva/sudoku/pitaron/
// מקלידים לוח (מהעיתון, מאפליקציה, מחוברת) -> בדיקת טעויות, כמה פתרונות יש, הצעד הבא עם הסבר, או פתרון מלא.
// הכול בדפדפן. הלוח נשמר בטלפון וגם בקישור (?g=81 ספרות).
(function () {
  'use strict';
  var TOOL = 'chashiva_sudoku_pitaron', KEY = 'sudoku-pitaron';
  function $(id) { return document.getElementById(id); }
  var board = $('sp-board'); if (!board) return;

  // ---------- מבנה הלוח ----------
  var UNITS = [], PEERS = [], UNIT_OF = [];
  for (var r = 0; r < 9; r++) { var row = []; for (var c = 0; c < 9; c++) row.push(r * 9 + c); UNITS.push(row); }
  for (c = 0; c < 9; c++) { var col = []; for (r = 0; r < 9; r++) col.push(r * 9 + c); UNITS.push(col); }
  for (var b = 0; b < 9; b++) { var box = []; for (var k = 0; k < 9; k++) box.push((Math.floor(b / 3) * 3 + Math.floor(k / 3)) * 9 + (b % 3) * 3 + k % 3); UNITS.push(box); }
  for (var i = 0; i < 81; i++) {
    UNIT_OF[i] = [Math.floor(i / 9), 9 + i % 9, 18 + Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3)];
    var s = {}; UNIT_OF[i].forEach(function (u) { UNITS[u].forEach(function (j) { if (j !== i) s[j] = 1; }); });
    PEERS[i] = Object.keys(s).map(Number);
  }
  var ALL = 0x3FE;
  function bits(m) { var n = 0; while (m) { m &= m - 1; n++; } return n; }
  function digitsOf(m) { var a = []; for (var d = 1; d <= 9; d++) if (m & (1 << d)) a.push(d); return a; }
  function cands(g, i) { var m = ALL; PEERS[i].forEach(function (j) { if (g[j]) m &= ~(1 << g[j]); }); return m; }

  // סופר פתרונות עד limit (MRV + ביטמאסקים). out מקבל את הפתרון הראשון.
  function solve(g0, limit, out) {
    var g = g0.slice(), n = 0, steps = 0;
    (function rec() {
      if (n >= limit || ++steps > 400000) return;
      var best = -1, bm = 0, bc = 10;
      for (var i = 0; i < 81; i++) if (!g[i]) { var m = cands(g, i), c = bits(m); if (c < bc) { bc = c; best = i; bm = m; if (c < 2) break; } }
      if (best < 0) { n++; if (out && n === 1) for (var j = 0; j < 81; j++) out[j] = g[j]; return; }
      if (!bc) return;
      for (var d = 1; d <= 9 && n < limit; d++) if (bm & (1 << d)) { g[best] = d; rec(); g[best] = 0; }
    })();
    return { count: n, timeout: steps > 400000 };
  }

  // ---------- שמות בעברית ----------
  function rowName(i) { return 'שורה ' + (Math.floor(i / 9) + 1); }
  function colName(i) { return 'טור ' + (i % 9 + 1); }
  function boxName(i) { return 'ריבוע ' + (UNIT_OF[i][2] - 18 + 1); }
  function where(i) { return rowName(i) + ', ' + colName(i); }
  function unitName(u, i) { return u < 9 ? 'ב' + rowName(i) : u < 18 ? 'ב' + colName(i) : 'ב' + boxName(i); }

  // הצעד ההגיוני הבא: מספר יחיד במשבצת, ואחריו מקום יחיד ביחידה
  function nextStep(g) {
    var best = null;
    for (var i = 0; i < 81; i++) if (!g[i]) {
      var m = cands(g, i);
      if (!m) return { kind: 'dead', i: i };
      if (bits(m) === 1) { best = { kind: 'single', i: i, d: digitsOf(m)[0] }; break; }
    }
    if (best) return best;
    for (var u = 0; u < 27; u++) for (var d = 1; d <= 9; d++) {
      if (UNITS[u].some(function (x) { return g[x] === d; })) continue;
      var spots = UNITS[u].filter(function (x) { return !g[x] && (cands(g, x) & (1 << d)); });
      if (spots.length === 1) return { kind: 'hidden', i: spots[0], d: d, u: u };
    }
    return null;
  }
  function logicOnly(g0) { // נפתר רק בצעדים פשוטים? -> הערכת קושי
    var g = g0.slice(), n = 0;
    for (;;) { var st = nextStep(g); if (!st || st.kind === 'dead') break; g[st.i] = st.d; n++; }
    return g.every(Boolean);
  }

  // ---------- מצב ----------
  var given = new Array(81).fill(0), shown = new Array(81).fill(0), sel = 0, hintCell = -1, solvedView = false;
  function load() {
    var q = (location.search.match(/[?&]g=([0-9.]{81})/) || [])[1];
    var src = q || (function () { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } })();
    if (/^[0-9.]{81}$/.test(src)) given = src.split('').map(function (ch) { return ch === '.' ? 0 : +ch; });
    shown = given.slice();
  }
  function save() { try { localStorage.setItem(KEY, given.join('')); } catch (e) {} }
  function code() { return given.join(''); }
  function filled() { return given.filter(Boolean).length; }

  // ---------- ציור ----------
  for (i = 0; i < 81; i++) {
    var bt = document.createElement('button'); bt.type = 'button'; bt.setAttribute('data-i', i);
    if (i % 9 === 2 || i % 9 === 5) bt.className = 'c3';
    if (Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5) bt.className += ' r3';
    board.appendChild(bt);
  }
  function conflicts(g) { var bad = {}; for (var i = 0; i < 81; i++) if (g[i]) PEERS[i].forEach(function (j) { if (g[j] === g[i]) { bad[i] = 1; bad[j] = 1; } }); return bad; }
  function draw() {
    var bad = conflicts(given), cells = board.children;
    for (var i = 0; i < 81; i++) {
      var el = cells[i], v = solvedView ? shown[i] : given[i];
      el.textContent = v || '';
      el.classList.toggle('g', !!given[i]);
      el.classList.toggle('err', !!bad[i]);
      el.classList.toggle('sel', i === sel);
      el.classList.toggle('hinted', i === hintCell);
      el.classList.toggle('peer', i !== sel && PEERS[sel].indexOf(i) >= 0);
      var lbl = where(i) + ': ' + (v ? v : 'ריק') + (given[i] ? '' : v ? ' (מהפתרון)' : '');
      el.setAttribute('aria-label', lbl);
    }
    $('sp-count').textContent = filled() + ' מספרים בלוח';
  }
  function say(t, cls) { var m = $('sp-msg'); m.textContent = t || ''; m.className = 'ch-msg' + (cls ? ' ' + cls : ''); }
  function used(how, extra) { if (window.toolUsed) window.toolUsed(TOOL, Object.assign({ how: how }, extra || {})); }
  var usedOnce = {};
  function once(how, extra) { if (usedOnce[how]) return; usedOnce[how] = 1; used(how, extra); }

  // ---------- עריכה ----------
  function set(d) {
    if (solvedView) backToMine();
    given[sel] = d; shown = given.slice(); hintCell = -1; save(); draw(); once('type');
    var bad = conflicts(given);
    if (d && bad[sel]) say('הספרה ' + d + ' כבר מופיעה באותה שורה, טור או ריבוע. כדאי לבדוק מול הלוח המקורי.', 'warn');
    else say('');
    if (d && sel < 80) { sel++; draw(); }
  }
  function backToMine() { solvedView = false; shown = given.slice(); hintCell = -1; }
  board.addEventListener('click', function (e) { var t = e.target.closest('[data-i]'); if (!t) return; sel = +t.getAttribute('data-i'); draw(); });
  $('sp-pad').addEventListener('click', function (e) { var t = e.target.closest('[data-d]'); if (t) set(+t.getAttribute('data-d')); });
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var ae = document.activeElement;
    if (ae && ae !== document.body && !(ae.closest && ae.closest('#sp-app'))) return;
    var k = e.key;
    if (/^[1-9]$/.test(k)) { set(+k); e.preventDefault(); }
    else if (k === '0' || k === 'Backspace' || k === 'Delete' || k === ' ') { set(0); if (k === 'Backspace' && sel > 0) { sel--; draw(); } e.preventDefault(); }
    else if (/^Arrow/.test(k)) {
      var r = Math.floor(sel / 9), c = sel % 9;
      if (k === 'ArrowUp') r = (r + 8) % 9; if (k === 'ArrowDown') r = (r + 1) % 9;
      if (k === 'ArrowLeft') c = (c + 8) % 9; if (k === 'ArrowRight') c = (c + 1) % 9;
      sel = r * 9 + c; draw(); board.children[sel].focus(); e.preventDefault();
    }
  });

  // ---------- פעולות ----------
  function precheck() {
    var bad = conflicts(given);
    if (Object.keys(bad).length) { say('יש ספרה שחוזרת פעמיים באותה שורה, טור או ריבוע (באדום). מתקנים אותה, ואז ממשיכים.', 'warn'); return false; }
    if (filled() < 17) { say('יש רק ' + filled() + ' מספרים. ללוח סודוקו אמיתי צריך לפחות 17 מספרים נתונים, אחרת יש לו יותר מפתרון אחד. מקלידים את כל המספרים מהלוח המקורי.', 'warn'); return false; }
    return true;
  }
  function analyze() {
    var out = [], r = solve(given, 2, out);
    return { r: r, sol: out };
  }
  $('sp-solve').onclick = function () {
    if (!precheck()) return;
    var a = analyze();
    if (a.r.timeout) { say('הלוח מסובך מדי לבדיקה מהירה. כדאי לבדוק שהוקלד נכון.', 'warn'); return; }
    if (!a.r.count) { say('ללוח הזה אין פתרון. כנראה ספרה אחת הוקלדה לא נכון – כדאי להשוות שוב מול המקור.', 'warn'); used('solve', { result: 'none' }); return; }
    shown = a.sol; solvedView = true; hintCell = -1; draw();
    var easy = logicOnly(given);
    say((a.r.count > 1 ? 'שימו לב: ללוח הזה יש יותר מפתרון אחד (חסרים בו מספרים), וזה אחד מהם. ' : 'זה הפתרון, והוא היחיד. ') +
      'רמת הלוח: ' + (easy ? 'קל–בינוני (נפתר בצעדים פשוטים).' : 'קשה (צריך שיטות מתקדמות כמו זוגות סגורים).') + ' המספרים בצבע ירוק הם הפתרון.', 'ok');
    used('solve', { result: a.r.count > 1 ? 'multi' : 'one', level: easy ? 'easy' : 'hard' });
  };
  $('sp-step').onclick = function () {
    if (!precheck()) return;
    if (solvedView) backToMine();
    var g = given.slice(), st = nextStep(g);
    if (st && st.kind === 'dead') { sel = st.i; draw(); say('ב' + where(st.i) + ' לא נשאר אף מספר אפשרי. כנראה יש טעות באחד המספרים שהוקלדו.', 'warn'); return; }
    if (!st) {
      var a = analyze();
      if (!a.r.count) { say('ללוח הזה אין פתרון. כדאי לבדוק שהוקלד נכון.', 'warn'); return; }
      var best = -1, bc = 10; for (var i = 0; i < 81; i++) if (!g[i]) { var c = bits(cands(g, i)); if (c < bc) { bc = c; best = i; } }
      st = { kind: 'adv', i: best, d: a.sol[best] };
    }
    sel = hintCell = st.i; shown = given.slice(); shown[st.i] = st.d; solvedView = true; draw();
    var why = st.kind === 'single'
      ? 'כל שאר המספרים כבר מופיעים בשורה, בטור או בריבוע שלה, ולכן נשאר רק ' + st.d + '.'
      : st.kind === 'hidden'
        ? unitName(st.u, st.i) + ' הספרה ' + st.d + ' יכולה להיכנס רק למשבצת הזאת – בכל שאר המשבצות הריקות שם היא כבר חסומה.'
        : 'כאן כבר אין צעד פשוט. במשבצת יש ' + bc + ' אפשרויות (' + digitsOf(cands(g, st.i)).join(', ') + '), והתשובה הנכונה היא ' + st.d + '. בלוחות קשים משתמשים כאן בזוגות סגורים או ב-X-Wing.';
    say('💡 ' + where(st.i) + ': ' + st.d + '. ' + why + ' לוחצים "לרשום את הצעד" כדי להמשיך.', 'ok');
    $('sp-take').hidden = false;
    once('step');
  };
  $('sp-take').onclick = function () { if (hintCell < 0) return; given[hintCell] = shown[hintCell]; backToMine(); save(); draw(); this.hidden = true; say('נרשם. אפשר לבקש את הצעד הבא.'); };
  $('sp-check').onclick = function () {
    if (solvedView) backToMine();
    var bad = conflicts(given); draw();
    if (Object.keys(bad).length) { say('יש ספרות שחוזרות (באדום). תקנו אותן מול הלוח המקורי.', 'warn'); used('check', { result: 'conflict' }); return; }
    if (filled() < 17) { say('בינתיים אין טעויות. יש ' + filled() + ' מספרים – ממשיכים להקליד.'); return; }
    var a = analyze();
    say(!a.r.count ? 'אין ספרות כפולות, אבל ללוח אין פתרון – כנראה ספרה אחת שגויה.' : a.r.count > 1 ? 'אין טעויות, אבל ללוח יש יותר מפתרון אחד. כנראה חסר מספר אחד או יותר מהמקור.' : 'הלוח תקין ויש לו פתרון אחד בדיוק. ✓', a.r.count === 1 ? 'ok' : 'warn');
    used('check', { result: !a.r.count ? 'none' : a.r.count > 1 ? 'multi' : 'one' });
  };
  $('sp-mine').onclick = function () { backToMine(); $('sp-take').hidden = true; draw(); say('חזרנו ללוח שהקלדתם.'); };
  $('sp-clear').onclick = function () { given = new Array(81).fill(0); backToMine(); sel = 0; save(); draw(); say('הלוח נוקה.'); $('sp-take').hidden = true; };
  $('sp-paste-go').onclick = function () {
    var t = ($('sp-paste').value || '').replace(/[^0-9.\-_*xX]/g, '').replace(/[\-_*xX]/g, '0');
    if (t.length !== 81) { say('צריך בדיוק 81 תווים (ספרות, ו-0 או נקודה למשבצת ריקה). נמצאו ' + t.length + '.', 'warn'); return; }
    given = t.split('').map(function (ch) { return ch === '.' ? 0 : +ch; }); backToMine(); save(); draw(); say('הלוח נטען. אפשר לפתור או לבקש צעד.'); used('paste');
  };
  $('sp-share').onclick = function () {
    var url = location.origin + location.pathname + '?g=' + code();
    var done = function () { say('הקישור הועתק – מי שיפתח אותו יקבל את אותו לוח.', 'ok'); };
    if (navigator.share) navigator.share({ title: 'פותר סודוקו', text: 'הלוח שלי בפותר הסודוקו:', url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('הקישור:', url); });
    used('share');
  };
  $('sp-example').onclick = function () {
    given = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'.split('').map(Number);
    backToMine(); save(); draw(); say('נטען לוח לדוגמה. נסו "הצעד הבא".');
  };

  load(); draw();
})();
