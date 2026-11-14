// מחולל תפזורת – /kelim/chashiva/tifzoret/
// מילים (שלוש דרכים, machol-core.js) -> לוח אותיות בכיוונים לפי רמה -> משחק בטלפון (גרירה או שתי נגיעות),
// הדפסה עם דף פתרון, PDF, וקישור לתלמידים (?d=). בעברית הלוח מימין לשמאל: עמודה 0 בצד ימין.
(function () {
  'use strict';
  var MC = window.MC, $ = MC.$, TOOL = 'machol_tifzoret', KEY = 'machol-tifzoret';
  var app = $('tz-app'); if (!app) return;
  var O = MC.load(KEY + '-o', { lvl: 2, size: 0, list: 'w', title: '', ans: true, seed: '' });
  if (!O.seed) O.seed = MC.seed();
  var shared = MC.dec(MC.param('d') || ''), cur = null, panel = null;
  var DIRS = { 1: [[0, 1], [1, 0]], 2: [[0, 1], [1, 0], [1, 1], [1, -1]], 3: [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0]], 4: [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]] };
  var LVL = { 1: 'קל', 2: 'בינוני', 3: 'קשה', 4: 'מומחה' };
  var HE = 'אבגדהוזחטיכלמנסעפצקרשת', HEW = 'אאאבבגדדהההווווזחחטייייכככללללממממנננסעעפפצקקררררששתתת', FINS = 'ךםןףץ', EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // ================= בניית הלוח =================
  function build(items, seed, lvl, size) {
    var words = [], seen = {};
    items.forEach(function (it) { var L = MC.letters(it.w); if (L.length < 2 || L.length > 20 || seen[L]) return; seen[L] = 1; words.push({ w: it.w, c: it.c || it.bc || '', L: L.split(''), n: L.length }); });
    if (!words.length) return null;
    var en = MC.isEn(words[0].w), dirs = DIRS[lvl] || DIRS[2], rnd = MC.rng(seed + ':' + lvl + ':' + size + ':' + words.map(function (w) { return w.L.join(''); }).join(','));
    var longest = Math.max.apply(0, words.map(function (w) { return w.n; })), tot = words.reduce(function (s, w) { return s + w.n; }, 0);
    var N = size || Math.max(8, Math.min(20, Math.max(longest + (lvl < 3 ? 1 : 0), Math.ceil(Math.sqrt(tot / (lvl === 1 ? 0.45 : lvl === 2 ? 0.55 : 0.65))))));
    N = Math.max(N, Math.min(20, longest));
    var best = null;
    for (var grow = 0; grow < 6; grow++) {
      for (var t = 0; t < 12; t++) {
        var r = place(words, N, dirs, rnd, lvl);
        if (!best || r.placed.length > best.placed.length || (r.placed.length === best.placed.length && r.ov > best.ov)) best = r;
        if (best.placed.length === words.length) break;
      }
      if (best.placed.length === words.length || size) break;
      if (N >= 20) break;
      N++; best = null;
    }
    // מילוי
    var g = best.g, letters = en ? EN : HEW;
    if (lvl >= 3 && !en) letters = words.map(function (w) { return w.L.map(MC.norm).join(''); }).join('') + HE; // אותיות מתוך המילים – קשה יותר
    for (var y = 0; y < best.N; y++) for (var x = 0; x < best.N; x++) if (!g[y][x]) {
      var ch = letters[Math.floor(rnd() * letters.length)];
      if (!en && lvl >= 3 && rnd() < 0.05) ch = FINS[Math.floor(rnd() * 5)];
      g[y][x] = ch;
    }
    best.missing = words.filter(function (w) { return best.placed.every(function (p) { return p.src !== w; }); });
    best.en = en; best.lvl = lvl;
    return best;
  }
  function place(words, N, dirs, rnd, lvl) {
    var g = [], placed = [], ov = 0, wOv = [0, 0, 1, 3, 5][lvl];
    if (wOv == null) wOv = 1;
    for (var i = 0; i < N; i++) { g.push([]); for (var j = 0; j < N; j++) g[i].push(''); }
    var order = words.slice().sort(function (a, b) { return b.n - a.n + (rnd() - 0.5); });
    order.forEach(function (w) {
      if (w.n > N) return;
      var opts = [];
      dirs.forEach(function (d) {
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          var r2 = r + d[0] * (w.n - 1), c2 = c + d[1] * (w.n - 1);
          if (r2 < 0 || c2 < 0 || r2 >= N || c2 >= N) continue;
          var o = 0, ok = true;
          for (var k = 0; k < w.n; k++) { var e = g[r + d[0] * k][c + d[1] * k]; if (e) { if (MC.norm(e) !== MC.norm(w.L[k])) { ok = false; break; } o++; } }
          if (ok && o < w.n && !(lvl === 1 && o > 0)) opts.push([o * wOv + rnd() * 2, r, c, d, o]);
        }
      });
      if (!opts.length) return;
      // מגוון כיוונים: מערבבים, ואז בוחרים מבין הטובים
      opts.sort(function (a, b) { return b[0] - a[0]; });
      var pick = opts[Math.floor(rnd() * Math.min(opts.length, 6))];
      for (var k = 0; k < w.n; k++) { var rr = pick[1] + pick[3][0] * k, cc = pick[2] + pick[3][1] * k; if (!g[rr][cc]) g[rr][cc] = w.L[k]; }
      ov += pick[4];
      placed.push({ src: w, w: w.w, c: w.c, L: w.L, n: w.n, r: pick[1], c0: pick[2], d: pick[3], found: false });
    });
    return { g: g, N: N, placed: placed, ov: ov };
  }

  // ================= משחק =================
  var pend = null, drag = null, found = 0, t0 = 0, tick = 0, PK = '', COLORS = 6;
  function draw() {
    var X = cur, g = $('tz-grid'), h = '';
    g.setAttribute('dir', X.en ? 'ltr' : 'rtl'); g.style.gridTemplateColumns = 'repeat(' + X.N + ',minmax(0,1fr))';
    g.style.setProperty('--n', X.N);
    for (var r = 0; r < X.N; r++) for (var c = 0; c < X.N; c++) h += '<button type="button" data-r="' + r + '" data-c="' + c + '" aria-label="' + X.g[r][c] + '">' + X.g[r][c] + '</button>';
    g.innerHTML = h;
    X.placed.forEach(function (p, i) { if (p.found) paint(p, i); });
    side(); timer();
    var miss = $('tz-miss'); miss.hidden = !X.missing.length;
    miss.innerHTML = X.missing.length ? 'לא נכנסו ללוח: <b>' + X.missing.map(function (w) { return MC.esc(w.w); }).join(', ') + '</b>. בחרו לוח גדול יותר או רמה עם יותר כיוונים.' : '';
  }
  function side() {
    var X = cur, n = X.placed.filter(function (p) { return p.found; }).length;
    var list = X.placed.slice().sort(function (a, b) { return a.w.localeCompare(b.w, X.en ? 'en' : 'he'); }).map(function (p) {
      var t = O.list === 'c' && p.c ? p.c + ' (' + p.n + ')' : p.w;
      return '<li' + (p.found ? ' class="f"' : '') + '>' + MC.esc(p.found && O.list === 'c' ? p.w : t) + '</li>';
    }).join('');
    $('tz-list').innerHTML = '<h3>' + (O.list === 'c' ? 'מוצאים לפי ההגדרה' : 'מילים למצוא') + ' <span>(' + n + '/' + X.placed.length + ')</span></h3><ul class="mc-wl">' + list + '</ul>';
  }
  function cell(r, c) { return $('tz-grid').querySelector('button[data-r="' + r + '"][data-c="' + c + '"]'); }
  function paint(p, i) { for (var k = 0; k < p.n; k++) { var b = cell(p.r + p.d[0] * k, p.c0 + p.d[1] * k); if (b) { b.className = 'f f' + (i % COLORS); } } }
  function line(a, b) {
    var dr = b[0] - a[0], dc = b[1] - a[1], n = Math.max(Math.abs(dr), Math.abs(dc));
    if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return null;
    var out = []; for (var k = 0; k <= n; k++) out.push([a[0] + Math.sign(dr) * k, a[1] + Math.sign(dc) * k]); return out;
  }
  function hl(cells) { [].forEach.call($('tz-grid').querySelectorAll('.sel'), function (b) { b.classList.remove('sel'); }); (cells || []).forEach(function (rc) { var b = cell(rc[0], rc[1]); if (b) b.classList.add('sel'); }); }
  function tryWord(a, b) {
    var cs = line(a, b); hl(null);
    if (!cs) { say('המילים הולכות בקו ישר – לרוחב, לאורך או באלכסון.'); return; }
    var s = cs.map(function (rc) { return MC.norm(cur.g[rc[0]][rc[1]]); }).join(''), rev = s.split('').reverse().join('');
    var hit = null, hi = -1;
    cur.placed.forEach(function (p, i) {
      if (hit || p.found) return; var k = p.L.map(MC.norm).join('');
      if (k === s && p.r === a[0] && p.c0 === a[1]) { hit = p; hi = i; }
      else if (k === s || k === rev) {
        var end = [p.r + p.d[0] * (p.n - 1), p.c0 + p.d[1] * (p.n - 1)];
        if ((p.r === a[0] && p.c0 === a[1] && end[0] === b[0] && end[1] === b[1]) || (p.r === b[0] && p.c0 === b[1] && end[0] === a[0] && end[1] === a[1])) { hit = p; hi = i; }
      }
    });
    if (!hit) { // מילה נכונה שמופיעה במקום אחר (נדיר) – גם נחשבת
      cur.placed.forEach(function (p, i) { if (!hit && !p.found && cs.length === p.n && (p.L.map(MC.norm).join('') === s || p.L.map(MC.norm).join('') === rev)) { hit = p; hi = i; } });
    }
    if (!hit) { say('זו לא אחת המילים. נסו שוב.'); MC.used(TOOL, 'miss'); return; }
    hit.found = true; paint(hit, hi); side(); saveProg();
    var left = cur.placed.filter(function (p) { return !p.found; }).length;
    if (!t0) t0 = Date.now();
    if (left) say('מצאתם: ' + hit.w + '! נשארו ' + left + '.', 'ok');
    else { var sec = Math.round((Date.now() - t0) / 1000); say('🎉 מצאתם את כל ' + cur.placed.length + ' המילים' + (sec > 5 ? ' ב-' + fmt(sec) : '') + '! כל הכבוד.', 'ok'); clearInterval(tick); MC.used(TOOL, 'solved', { lvl: cur.lvl, n: cur.placed.length, sec: sec }); }
    MC.used(TOOL, 'play');
  }
  function fmt(s) { return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function timer() { clearInterval(tick); var el = $('tz-time'); t0 = 0; el.textContent = ''; tick = setInterval(function () { if (t0 && cur.placed.some(function (p) { return !p.found; })) el.textContent = '⏱ ' + fmt(Math.round((Date.now() - t0) / 1000)); }, 1000); }
  function rcOf(el) { return el && el.getAttribute && el.hasAttribute('data-r') ? [+el.getAttribute('data-r'), +el.getAttribute('data-c')] : null; }
  function wireGrid() {
    var g = $('tz-grid');
    g.addEventListener('pointerdown', function (e) {
      var a = rcOf(e.target); if (!a) return; e.preventDefault();
      if (!t0) t0 = Date.now();
      drag = { a: a, b: a, id: e.pointerId };
      try { g.setPointerCapture(e.pointerId); } catch (x) {}
      hl([a]);
    });
    g.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var b = rcOf(document.elementFromPoint(e.clientX, e.clientY)); if (!b) return;
      drag.b = b; var cs = line(drag.a, b); hl(cs || [drag.a]);
    });
    g.addEventListener('pointerup', function () {
      if (!drag) return; var d = drag; drag = null;
      if (d.a[0] !== d.b[0] || d.a[1] !== d.b[1]) { pend = null; tryWord(d.a, d.b); return; }
      if (!pend) { pend = d.a; hl([d.a]); say('ועכשיו נוגעים באות האחרונה של המילה.'); return; }
      var a = pend; pend = null;
      if (a[0] === d.a[0] && a[1] === d.a[1]) { hl(null); say(''); return; }
      tryWord(a, d.a);
    });
    g.addEventListener('pointercancel', function () { drag = null; hl(pend ? [pend] : null); });
    // מקלדת: Enter על אות = נגיעה
    g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { var a = rcOf(e.target); if (!a) return; e.preventDefault(); if (!pend) { pend = a; hl([a]); } else { var p = pend; pend = null; tryWord(p, a); } } });
  }
  function saveProg() { if (PK) MC.save(PK, cur.placed.filter(function (p) { return p.found; }).map(function (p) { return p.L.join(''); })); }
  function say(t, cls) { var m = $('tz-msg'); m.textContent = t; m.className = 'mc-msg' + (cls ? ' ' + cls : ''); }

  // ================= דפים להדפסה =================
  function gridSvg(X, wmm, ans) {
    var cs = wmm / X.N, W = cs * X.N, s = '', caps = '';
    var cx = function (c) { return ((X.en ? c : X.N - 1 - c) + 0.5) * cs; }, cy = function (r) { return (r + 0.5) * cs; };
    if (ans) X.placed.forEach(function (p, i) {
      var r1 = p.r + p.d[0] * (p.n - 1), c1 = p.c0 + p.d[1] * (p.n - 1);
      caps += '<line x1="' + cx(p.c0).toFixed(2) + '" y1="' + cy(p.r).toFixed(2) + '" x2="' + cx(c1).toFixed(2) + '" y2="' + cy(r1).toFixed(2) + '" stroke="' + ['#f6c343', '#8fd3f4', '#b5e48c', '#f4a6c6', '#c3a6f4', '#f7a072'][i % 6] + '" stroke-width="' + (cs * 0.78).toFixed(2) + '" stroke-linecap="round" opacity=".75"/>';
    });
    for (var r = 0; r < X.N; r++) for (var c = 0; c < X.N; c++) s += '<text x="' + cx(c).toFixed(2) + '" y="' + (cy(r) + cs * 0.22).toFixed(2) + '" font-size="' + (cs * 0.6).toFixed(2) + '" text-anchor="middle">' + MC.esc(X.g[r][c]) + '</text>';
    return '<svg class="mc-svg" direction="ltr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W.toFixed(2) + ' ' + W.toFixed(2) + '" width="' + W.toFixed(1) + 'mm" height="' + W.toFixed(1) + 'mm" font-family="Assistant, Arial, sans-serif" font-weight="600" fill="#111">' +
      '<rect x="0.3" y="0.3" width="' + (W - 0.6).toFixed(2) + '" height="' + (W - 0.6).toFixed(2) + '" rx="3" fill="none" stroke="#333" stroke-width="0.6"/>' + caps + s + '</svg>';
  }
  function pages() {
    var X = cur, title = O.title || ('תפזורת ' + (panel ? panel.topicName() : '')).trim();
    var words = X.placed.slice().sort(function (a, b) { return a.w.localeCompare(b.w, X.en ? 'en' : 'he'); });
    var cnt = words.length, gw = cnt > 30 ? 150 : cnt > 20 ? 165 : 178;
    var dirTxt = { 1: 'המילים מסתתרות לרוחב (מימין לשמאל) ולאורך (מלמעלה למטה).', 2: 'המילים מסתתרות לרוחב, לאורך ובאלכסון.', 3: 'המילים מסתתרות בכל הכיוונים הישרים – גם הפוך.', 4: 'המילים מסתתרות בכל שמונה הכיוונים, וחלקן חולקות אותיות.' }[X.lvl];
    if (X.en) dirTxt = dirTxt.replace('(מימין לשמאל)', '(משמאל לימין)');
    var li = words.map(function (p) { return '<li><span class="mc-box"></span>' + MC.esc(O.list === 'c' && p.c ? p.c + ' (' + p.n + ')' : p.w) + '</li>'; }).join('');
    var p1 = MC.head(title, 'תפזורת · ' + cnt + ' מילים · רמה ' + LVL[X.lvl] + ' · ' + dirTxt, true) +
      '<div class="mc-gridbox">' + gridSvg(X, gw, false) + '</div>' +
      '<ul class="mc-plist' + (O.list === 'c' ? ' cl' : '') + '"' + (X.en && O.list !== 'c' ? ' dir="ltr"' : '') + ' style="font-size:' + (cnt > 30 ? 10 : cnt > 20 ? 11 : 12.5) + 'pt">' + li + '</ul>' + MC.foot();
    var out = [p1];
    if (O.ans) out.push(MC.head('פתרון: ' + title, 'למורה / להורה', false) + '<div class="mc-gridbox">' + gridSvg(X, 178, true) + '</div>' +
      '<ul class="mc-plist sm">' + words.map(function (p) { return '<li>' + MC.esc(O.list === 'c' && p.c ? p.c + ' – ' + p.w : p.w) + '</li>'; }).join('') + '</ul>' + MC.foot());
    return out;
  }
  function refreshPreview() { if (cur) MC.preview($('tz-prev'), pages(), 2); }

  // ================= יצירה =================
  function make(items, keep) {
    var X = build(items, O.seed, +O.lvl || 2, +O.size || 0);
    if (!X || !X.placed.length) { cur = null; $('tz-play').hidden = true; say('כתבו לפחות מילה אחת, או בחרו נושא.', 'bad'); return; }
    cur = X; pend = null;
    PK = KEY + '-p:' + MC.hash(O.seed + '|' + O.lvl + '|' + X.N + '|' + X.placed.map(function (p) { return p.L.join(''); }).join(','));
    var got = keep ? MC.load(PK, []) : [];
    X.placed.forEach(function (p) { p.found = got.indexOf(p.L.join('')) >= 0; });
    $('tz-play').hidden = false; draw(); say(''); refreshPreview();
    $('tz-sum').textContent = X.placed.length + ' מילים · ' + X.N + '×' + X.N + ' · ' + LVL[X.lvl];
  }
  function fromPanel() { var it = panel.items(); if (!it.length) { say('כתבו מילים, או בחרו נושא.', 'bad'); return; } make(it, true); }
  function shareData() { return { t: O.title || ('תפזורת ' + panel.topicName()).trim(), i: cur.placed.concat(cur.missing.map(function (w) { return { w: w.w, c: w.c }; })).map(function (p) { return p.c ? [p.w, p.c] : [p.w]; }), s: O.seed, l: +O.lvl || 2, z: cur.N, m: O.list }; }

  function opts() {
    $('tz-lvl').value = String(O.lvl); $('tz-size').value = String(O.size || 0); $('tz-listm').value = O.list; $('tz-title').value = O.title || ''; $('tz-ans').checked = O.ans !== false;
    var re = function () { if (!shared) MC.save(KEY + '-o', O); if (shared) make(shared.i.map(function (x) { return { w: x[0], c: x[1] || '' }; }), false); else fromPanel(); };
    $('tz-lvl').addEventListener('change', function () { O.lvl = +this.value; re(); MC.used(TOOL, 'level', { lvl: O.lvl }); });
    $('tz-size').addEventListener('change', function () { O.size = +this.value; re(); });
    $('tz-listm').addEventListener('change', function () { O.list = this.value; if (!shared) MC.save(KEY + '-o', O); if (cur) { side(); refreshPreview(); } });
    $('tz-ans').addEventListener('change', function () { O.ans = this.checked; MC.save(KEY + '-o', O); refreshPreview(); });
    $('tz-title').addEventListener('input', function () { O.title = MC.clean(this.value, 50); MC.save(KEY + '-o', O); clearTimeout(this._t); this._t = setTimeout(refreshPreview, 500); });
  }
  function actions() {
    $('tz-new').addEventListener('click', function () { O.seed = MC.seed(); if (!shared) MC.save(KEY + '-o', O); if (shared) make(shared.i.map(function (x) { return { w: x[0], c: x[1] || '' }; }), false); else make(panel.items(), false); MC.used(TOOL, 'shuffle'); });
    $('tz-make').addEventListener('click', function () { fromPanel(); MC.used(TOOL, 'make', { n: cur ? cur.placed.length : 0, mode: panel.mode() }); var t = $('tz-play'); if (t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('tz-reveal').addEventListener('click', function () { cur.placed.forEach(function (p, i) { if (!p.found) { p.found = true; paint(p, i); } }); side(); saveProg(); say('אלה כל המילים. "🔀 לוח חדש" מסדר אותן מחדש.'); clearInterval(tick); MC.used(TOOL, 'reveal'); });
    $('tz-restart').addEventListener('click', function () { cur.placed.forEach(function (p) { p.found = false; }); saveProg(); draw(); say(''); });
    $('tz-print').addEventListener('click', function () { MC.print(pages(), O.title || 'תפזורת'); MC.used(TOOL, 'print', { n: cur.placed.length, lvl: cur.lvl }); });
    MC.pdfButton($('tz-pdf'), pages, function () { return O.title || ('תפזורת ' + (panel ? panel.topicName() : '')).trim(); }, TOOL);
    $('tz-send').addEventListener('click', function () { var d = shared || shareData(); MC.wa('🔎 ' + (d.t || 'תפזורת') + ' – מי ימצא את כל המילים? (בחינם, בלי הרשמה)\n' + MC.link(d)); MC.used(TOOL, 'send_link'); });
    $('tz-copy').addEventListener('click', function () { MC.copy(MC.link(shared || shareData()), this); MC.used(TOOL, 'copy_link'); });
  }

  opts(); actions(); wireGrid();
  window.addEventListener('resize', function () { clearTimeout(window._tzr); window._tzr = setTimeout(refreshPreview, 300); });
  if (shared && shared.i && shared.i.length) {
    document.body.classList.add('mc-student');
    $('tz-from').hidden = false; $('tz-from-t').textContent = shared.t || 'תפזורת';
    O = { lvl: shared.l || 2, size: shared.z || 0, list: shared.m === 'c' ? 'c' : 'w', title: shared.t || '', ans: true, seed: shared.s || 'x' };
    $('tz-lvl').value = String(O.lvl); $('tz-listm').value = O.list;
    make(shared.i.map(function (x) { return { w: String(x[0] || ''), c: String(x[1] || '') }; }), true);
    MC.used(TOOL, 'open_link');
    $('tz-own').addEventListener('click', function () { location.href = location.pathname; });
  } else {
    panel = MC.panel($('tz-words'), { key: KEY + '-w', tool: TOOL, clues: false, n: 15, example: 'chanuka', onChange: function () { fromPanel(); } });
    fromPanel();
  }
})();
