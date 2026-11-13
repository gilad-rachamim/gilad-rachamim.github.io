// מחולל תשבצים אישי – /kelim/chashiva/tashbetz/
// מילים והגדרות (שלוש דרכים, machol-core.js) -> סידור אוטומטי שבו המילים מצטלבות -> פתרון בטלפון, הדפסה עם דף פתרון, PDF,
// וקישור לתלמידים: כל התשבץ בתוך הכתובת (?d=), אותו זרע = אותו סידור בכל טלפון.
// התצוגה מימין לשמאל: עמודה 0 בצד ימין, ומילה "מאוזן" נקראת ימינה->שמאלה. באנגלית – הפוך.
(function () {
  'use strict';
  var MC = window.MC, $ = MC.$, TOOL = 'machol_tashbetz', KEY = 'machol-tashbetz';
  var app = $('tb-app'); if (!app) return;
  var O = MC.load(KEY + '-o', { size: 14, bank: false, title: '', ans: true, seed: '' });
  if (!O.seed) O.seed = MC.seed();
  var shared = MC.dec(MC.param('d') || ''), cur = null, panel = null;

  // ================= הסידור =================
  function build(items, seed, maxN) {
    var words = [], seen = {};
    items.forEach(function (it) {
      var L = MC.letters(it.w); if (L.length < 2 || L.length > maxN) return;
      var K = L.split('').map(MC.norm).join(''); if (seen[K]) return; seen[K] = 1;
      words.push({ w: it.w, c: it.c || '', L: L.split(''), K: K.split(''), n: L.length });
    });
    var rnd = MC.rng(seed + ':' + words.map(function (w) { return w.K.join(''); }).join(',') + ':' + maxN);
    var best = null, t0 = Date.now();
    for (var t = 0; t < 600; t++) {
      if (t > 30 && Date.now() - t0 > 650) break;
      var order = words.slice().sort(function (a, b) { return (b.n - a.n) + (rnd() - 0.5) * (t ? 5 : 0); });
      var res = layout(order, rnd, maxN);
      if (!best || res.score > best.score) best = res;
    }
    if (!best) return null;
    var ps = best.placed.map(function (x) { return x.src; });
    best.missing = words.filter(function (w) { return ps.indexOf(w) < 0; });
    best.words = words; best.en = words.length ? MC.isEn(words[0].w) : false;
    return finish(best);
  }
  function layout(order, rnd, maxN) {
    var grid = {}, placed = [], R0 = 0, R1 = 0, C0 = 0, C1 = 0, cross = 0;
    function at(r, c) { return grid[r + ',' + c]; }
    function fits(w, r, c, h) {
      var dr = h ? 0 : 1, dc = h ? 1 : 0, x = 0;
      if (at(r - dr, c - dc) || at(r + dr * w.n, c + dc * w.n)) return -1;
      var r2 = r + dr * (w.n - 1), c2 = c + dc * (w.n - 1);
      if (Math.max(R1, r2) - Math.min(R0, r) + 1 > maxN || Math.max(C1, c2) - Math.min(C0, c) + 1 > maxN) return -1;
      for (var i = 0; i < w.n; i++) {
        var rr = r + dr * i, cc = c + dc * i, e = at(rr, cc);
        if (e) { if (e.k !== w.K[i] || (h ? e.h : e.v)) return -1; x++; }
        else if (at(rr + dc, cc + dr) || at(rr - dc, cc - dr)) return -1;
      }
      return x;
    }
    function put(w, r, c, h) {
      for (var i = 0; i < w.n; i++) {
        var rr = h ? r : r + i, cc = h ? c + i : c, k = rr + ',' + cc, e = grid[k] || (grid[k] = { k: w.K[i] });
        if (h) e.h = w; else e.v = w;
      }
      w.r = r; w.c = c; w.h = h; placed.push(w);
      R0 = Math.min(R0, r); C0 = Math.min(C0, c); R1 = Math.max(R1, h ? r : r + w.n - 1); C1 = Math.max(C1, h ? c + w.n - 1 : c);
    }
    var ws = order.map(function (w) { return { w: w.w, c: w.c, L: w.L, K: w.K, n: w.n, src: w }; });
    put(ws[0], 0, 0, rnd() < 0.7);
    var rest = ws.slice(1);
    for (var pass = 0; pass < 3 && rest.length; pass++) {
      var left = [];
      rest.forEach(function (w) {
        var opts = [];
        placed.forEach(function (p) {
          for (var i = 0; i < p.n; i++) for (var j = 0; j < w.n; j++) {
            if (p.K[i] !== w.K[j]) continue;
            var h = !p.h, pr = p.h ? p.r : p.r + i, pc = p.h ? p.c + i : p.c, r = h ? pr : pr - j, c = h ? pc - j : pc, s = fits(w, r, c, h);
            if (s > 0) {
              var nr = Math.max(R1, h ? r : r + w.n - 1) - Math.min(R0, r) + 1, nc = Math.max(C1, h ? c + w.n - 1 : c) - Math.min(C0, c) + 1;
              opts.push([s * 12 - nr * nc * 0.08 - Math.abs(nr - nc) * 0.6 + rnd() * 3, r, c, h]);
            }
          }
        });
        if (!opts.length) { left.push(w); return; }
        opts.sort(function (a, b) { return b[0] - a[0]; });
        cross += fits(w, opts[0][1], opts[0][2], opts[0][3]);
        put(w, opts[0][1], opts[0][2], opts[0][3]);
      });
      rest = left;
    }
    var rows = R1 - R0 + 1, cols = C1 - C0 + 1;
    placed.forEach(function (w) { w.r -= R0; w.c -= C0; });
    return { placed: placed.map(function (w) { return { src: w.src, r: w.r, c: w.c, h: w.h }; }), rows: rows, cols: cols,
      score: placed.length * 1000 + cross * 20 - rows * cols * 0.7 - Math.abs(rows - cols) * 3 };
  }
  function finish(b) {
    var P = b.placed.map(function (x) { return { w: x.src.w, c: x.src.c, L: x.src.L, K: x.src.K, n: x.src.n, r: x.r, c0: x.c, h: x.h }; });
    var cells = {}, starts = {}, num = 0;
    P.forEach(function (p) {
      for (var i = 0; i < p.n; i++) {
        var k = (p.h ? p.r : p.r + i) + ',' + (p.h ? p.c0 + i : p.c0), e = cells[k] || (cells[k] = { k: p.K[i], l: p.L[i], end: false });
        if (i === p.n - 1) { e.l = p.L[i]; e.end = true; } else if (!e.end && p.h) e.l = p.L[i];
        (e.ws || (e.ws = [])).push(p);
      }
    });
    P.slice().sort(function (a, b) { return a.r - b.r || a.c0 - b.c0; }).forEach(function (p) { var k = p.r + ',' + p.c0; if (!starts[k]) starts[k] = ++num; p.num = starts[k]; });
    return { P: P, cells: cells, starts: starts, rows: b.rows, cols: b.cols, missing: b.missing, en: b.en };
  }

  // ================= הלוח בטלפון =================
  var dir = true, act = null, fill = {}, PK = '';
  function cellsOf(p) { var a = []; for (var i = 0; i < p.n; i++) a.push((p.h ? p.r : p.r + i) + ',' + (p.h ? p.c0 + i : p.c0)); return a; }
  function draw() {
    var g = $('tb-grid'), X = cur, html = '';
    g.style.setProperty('--cols', X.cols); g.setAttribute('dir', X.en ? 'ltr' : 'rtl');
    g.style.gridTemplateColumns = 'repeat(' + X.cols + ',minmax(0,1fr))';
    g.setAttribute('aria-label', 'תשבץ ' + X.rows + ' שורות על ' + X.cols + ' עמודות');
    for (var r = 0; r < X.rows; r++) for (var c = 0; c < X.cols; c++) {
      var k = r + ',' + c, e = X.cells[k];
      if (!e) { html += '<div class="x" aria-hidden="true"></div>'; continue; }
      html += '<div class="c" data-k="' + k + '">' + (X.starts[k] ? '<i aria-hidden="true">' + X.starts[k] + '</i>' : '') +
        '<input maxlength="2" size="1" autocomplete="off" autocorrect="off" spellcheck="false" ' + (X.en ? 'autocapitalize="characters" ' : '') + 'data-k="' + k + '" aria-label="משבצת ' + (r + 1) + '-' + (c + 1) + '" value="' + MC.esc(fill[k] || '') + '"></div>';
    }
    g.innerHTML = html;
    var list = function (h) {
      return X.P.filter(function (p) { return p.h === h; }).sort(function (a, b) { return a.num - b.num; }).map(function (p) {
        return '<li><button type="button" data-w="' + X.P.indexOf(p) + '"><b>' + p.num + '.</b> ' + MC.esc(p.c || 'מילה בת ' + p.n + ' אותיות') + ' <small>(' + p.n + ')</small></button></li>';
      }).join('');
    };
    $('tb-clues').innerHTML = '<div><h3>' + (X.en ? 'מאוזן (משמאל לימין)' : 'מאוזן') + '</h3><ol>' + list(true) + '</ol></div><div><h3>מאונך</h3><ol>' + list(false) + '</ol></div>';
    var bank = $('tb-bank');
    bank.hidden = !(O.bank || X.P.some(function (p) { return !p.c; }));
    bank.innerHTML = '<h3>מחסן מילים</h3><p>' + X.P.map(function (p) { return p.w; }).sort(function (a, b) { return a.localeCompare(b, 'he'); }).map(MC.esc).join(' · ') + '</p>';
    var miss = $('tb-miss');
    miss.hidden = !X.missing.length;
    miss.innerHTML = X.missing.length ? 'לא הצלחנו לשבץ ' + (X.missing.length === 1 ? 'מילה אחת' : X.missing.length + ' מילים') + ': <b>' + X.missing.map(function (w) { return MC.esc(w.w); }).join(', ') + '</b>. נסו "🔀 סידור אחר", לוח גדול יותר, או מילים עם אותיות משותפות.' : '';
    [].forEach.call(g.querySelectorAll('input'), wire);
    [].forEach.call($('tb-clues').querySelectorAll('button'), function (b) { b.addEventListener('click', function () { var p = X.P[+b.getAttribute('data-w')]; focusWord(p); }); });
    $('tb-sum').textContent = X.P.length + ' מילים · ' + X.rows + '×' + X.cols;
    say('');
  }
  function inp(k) { return $('tb-grid').querySelector('input[data-k="' + k + '"]'); }
  function wordAt(k, h) { var e = cur.cells[k]; if (!e) return null; return e.ws.filter(function (p) { return p.h === h; })[0] || null; }
  function focusWord(p, k) {
    act = p; dir = p.h; var cs = cellsOf(p);
    if (!k) { k = cs.filter(function (x) { return !fill[x]; })[0] || cs[0]; }
    mark(); var el = inp(k); if (el) el.focus({ preventScroll: false });
  }
  function mark() {
    [].forEach.call($('tb-grid').querySelectorAll('.c'), function (d) { d.classList.remove('on', 'cur'); });
    [].forEach.call($('tb-clues').querySelectorAll('button'), function (b) { b.classList.remove('on'); });
    if (!act) { $('tb-now').textContent = 'נוגעים במשבצת כדי להתחיל.'; return; }
    cellsOf(act).forEach(function (k) { var d = $('tb-grid').querySelector('.c[data-k="' + k + '"]'); if (d) d.classList.add('on'); });
    var b = $('tb-clues').querySelector('button[data-w="' + cur.P.indexOf(act) + '"]'); if (b) b.classList.add('on');
    $('tb-now').innerHTML = '<b>' + act.num + ' ' + (act.h ? 'מאוזן' : 'מאונך') + ':</b> ' + MC.esc(act.c || 'מילה בת ' + act.n + ' אותיות') + ' <small>(' + act.n + ')</small>';
  }
  function step(k, d) { // המשבצת הבאה במילה הפעילה
    if (!act) return null; var cs = cellsOf(act), i = cs.indexOf(k); return cs[i + d] || null;
  }
  function wire(el) {
    var k = el.getAttribute('data-k');
    el.addEventListener('focus', function () {
      if (!act || cellsOf(act).indexOf(k) < 0) { act = wordAt(k, dir) || wordAt(k, !dir); if (act) dir = act.h; }
      mark(); el.parentNode.classList.add('cur'); setTimeout(function () { try { el.select(); } catch (e) {} keepVisible(el); }, 0);
    });
    el.addEventListener('blur', function () { el.parentNode.classList.remove('cur'); });
    el.addEventListener('click', function () { // נגיעה שנייה באותה משבצת מחליפה כיוון
      if (el._t && Date.now() - el._t < 4000 && wordAt(k, !dir)) { act = wordAt(k, !dir); dir = act.h; mark(); el.parentNode.classList.add('cur'); }
      el._t = Date.now();
    });
    el.addEventListener('input', function () {
      var v = MC.letters(el.value).slice(-1);
      el.value = v; el.parentNode.classList.remove('bad', 'ok');
      if (v) fill[k] = v; else delete fill[k];
      saveFill(); MC.used(TOOL, 'play');
      if (v) { var n = step(k, 1); if (n) { var x = inp(n); if (x) x.focus(); } else checkDone(); }
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !el.value) { var p = step(k, -1); if (p) { e.preventDefault(); var x = inp(p); x.value = ''; delete fill[p]; saveFill(); x.focus(); } }
      var mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowRight: [0, cur.en ? 1 : -1], ArrowLeft: [0, cur.en ? -1 : 1] }[e.key];
      if (mv) { e.preventDefault(); var rc = k.split(','), r = +rc[0], c = +rc[1]; for (var i = 1; i < 30; i++) { var y = inp((r + mv[0] * i) + ',' + (c + mv[1] * i)); if (y) { dir = mv[0] === 0; act = wordAt(y.getAttribute('data-k'), dir) || wordAt(y.getAttribute('data-k'), !dir); y.focus(); break; } } }
      if (e.key === 'Enter') { e.preventDefault(); var i2 = cur.P.indexOf(act); focusWord(cur.P[(i2 + 1) % cur.P.length]); }
    });
  }
  // שורת ההגדרה דביקה למעלה: משבצת שנכנסה מתחתיה (או מתחת למקלדת) – גוללים אותה למקום שרואים
  function keepVisible(el) {
    var bar = $('tb-now').getBoundingClientRect(), r = el.getBoundingClientRect(), vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    if (r.top < bar.bottom + 6) window.scrollBy(0, r.top - bar.bottom - 14);
    else if (r.bottom > vh - 8) window.scrollBy(0, r.bottom - vh + 24);
  }
  function saveFill() { if (PK) MC.save(PK, fill); }
  function right(k) { var e = cur.cells[k], v = fill[k]; return v && MC.norm(v) === e.k; }
  function checkDone() {
    var ks = Object.keys(cur.cells), all = ks.every(right);
    if (all) { say('🎉 פתרתם את כל התשבץ! כל הכבוד.', 'ok'); MC.used(TOOL, 'solved', { n: cur.P.length }); }
    return all;
  }
  function say(t, cls) { var m = $('tb-msg'); m.textContent = t; m.className = 'mc-msg' + (cls ? ' ' + cls : ''); }

  // ================= דפים להדפסה =================
  function gridSvg(X, wmm, hmm, ans) {
    var cs = Math.min(wmm / X.cols, hmm / X.rows, 13), W = cs * X.cols, H = cs * X.rows, s = '';
    for (var k in X.cells) {
      var rc = k.split(','), r = +rc[0], c = +rc[1], x = (X.en ? c : X.cols - 1 - c) * cs, y = r * cs, e = X.cells[k];
      s += '<rect x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + cs.toFixed(2) + '" height="' + cs.toFixed(2) + '" fill="#fff" stroke="#111" stroke-width="' + (cs * 0.045).toFixed(2) + '"/>';
      if (X.starts[k]) s += '<text x="' + (X.en ? x + cs * 0.08 : x + cs * 0.92).toFixed(2) + '" y="' + (y + cs * 0.3).toFixed(2) + '" font-size="' + (cs * 0.28).toFixed(2) + '" text-anchor="' + (X.en ? 'start' : 'end') + '" fill="#333">' + X.starts[k] + '</text>';
      if (ans) s += '<text x="' + (x + cs / 2).toFixed(2) + '" y="' + (y + cs * 0.74).toFixed(2) + '" font-size="' + (cs * 0.55).toFixed(2) + '" text-anchor="middle" font-weight="700" fill="#1d3a6e">' + MC.esc(e.l) + '</text>';
    }
    return '<svg class="mc-svg" direction="ltr" xmlns="http://www.w3.org/2000/svg" viewBox="-0.5 -0.5 ' + (W + 1).toFixed(2) + ' ' + (H + 1).toFixed(2) + '" width="' + (W + 1).toFixed(1) + 'mm" height="' + (H + 1).toFixed(1) + 'mm" font-family="Assistant, Arial, sans-serif">' + s + '</svg>';
  }
  function pages() {
    var X = cur, title = O.title || ('תשבץ ' + (panel ? panel.topicName() : '')).trim();
    var cl = function (h, ans) {
      return X.P.filter(function (p) { return p.h === h; }).sort(function (a, b) { return a.num - b.num; }).map(function (p) {
        return '<li><b>' + p.num + '.</b> ' + MC.esc(p.c || 'מילה בת ' + p.n + ' אותיות') + ' (' + p.n + ')' + (ans ? ' – <b>' + MC.esc(p.w) + '</b>' : '') + '</li>';
      }).join('');
    };
    var lines = X.P.reduce(function (s, p) { return s + 1 + Math.floor((p.c || '').length / 34); }, 0), fs = lines > 44 ? 9 : lines > 30 ? 10 : 11.5;
    var clueH = Math.ceil(lines / 2) * fs * 0.46 + 14, bankOn = O.bank || X.P.some(function (p) { return !p.c; });
    var gh = Math.max(70, Math.min(170, 236 - clueH - (bankOn ? 22 : 0)));
    var bank = bankOn ? '<div class="mc-bank"><b>מחסן מילים:</b> ' + X.P.map(function (p) { return p.w; }).sort(function (a, b) { return a.localeCompare(b, 'he'); }).map(MC.esc).join(' · ') + '</div>' : '';
    var p1 = MC.head(title, 'תשבץ · ' + X.P.length + ' מילים', true) +
      '<div class="mc-gridbox" style="height:' + gh + 'mm">' + gridSvg(X, 186, gh, false) + '</div>' +
      '<div class="mc-clues" style="font-size:' + fs + 'pt"><div><h3>' + (X.en ? 'מאוזן (משמאל לימין)' : 'מאוזן') + '</h3><ol>' + cl(true) + '</ol></div><div><h3>מאונך</h3><ol>' + cl(false) + '</ol></div></div>' + bank + MC.foot();
    var out = [p1];
    if (O.ans) out.push(MC.head('פתרון: ' + title, 'למורה / להורה', false) + '<div class="mc-gridbox" style="height:150mm">' + gridSvg(X, 186, 150, true) + '</div>' +
      '<div class="mc-clues sm"><div><h3>מאוזן</h3><ol>' + cl(true, true) + '</ol></div><div><h3>מאונך</h3><ol>' + cl(false, true) + '</ol></div></div>' + MC.foot());
    return out;
  }
  function refreshPreview() { if (cur && cur.P.length) MC.preview($('tb-prev'), pages(), 2); }

  // ================= יצירה =================
  function make(items, seed, keepFill) {
    var X = build(items, seed, +O.size || 14);
    if (!X || !X.P.length) { cur = null; $('tb-play').hidden = true; say('צריך לפחות שתי מילים כדי לבנות תשבץ.', 'bad'); return; }
    cur = X; act = null;
    PK = KEY + '-p:' + MC.hash(seed + '|' + X.P.map(function (p) { return p.K.join(''); }).join(','));
    fill = keepFill ? MC.load(PK, {}) : {};
    if (!keepFill) MC.save(PK, {});
    $('tb-play').hidden = false; draw(); mark(); refreshPreview();
  }
  function fromPanel() {
    var it = panel.items();
    if (it.length < 2) { say('כתבו לפחות שתי מילים, או בחרו נושא.', 'bad'); return; }
    make(it, O.seed, true);
  }
  function shareData() {
    return { t: O.title || ('תשבץ ' + panel.topicName()).trim(), i: cur.P.map(function (p) { return p.c ? [p.w, p.c] : [p.w]; }).concat(cur.missing.map(function (w) { return w.c ? [w.w, w.c] : [w.w]; })), s: O.seed, z: +O.size || 14, b: O.bank ? 1 : 0 };
  }

  // ================= חיבור הכפתורים =================
  function opts() {
    $('tb-size').value = String(O.size); $('tb-bankon').checked = !!O.bank; $('tb-title').value = O.title || ''; $('tb-ans').checked = O.ans !== false;
    $('tb-size').addEventListener('change', function () { O.size = +this.value; MC.save(KEY + '-o', O); fromPanel(); });
    $('tb-bankon').addEventListener('change', function () { O.bank = this.checked; MC.save(KEY + '-o', O); if (cur) { draw(); mark(); refreshPreview(); } });
    $('tb-ans').addEventListener('change', function () { O.ans = this.checked; MC.save(KEY + '-o', O); refreshPreview(); });
    $('tb-title').addEventListener('input', function () { O.title = MC.clean(this.value, 50); MC.save(KEY + '-o', O); clearTimeout(this._t); this._t = setTimeout(refreshPreview, 500); });
  }
  function actions() {
    $('tb-new').addEventListener('click', function () { O.seed = MC.seed(); if (!shared) MC.save(KEY + '-o', O); if (shared) { make(shared.i.map(function (x) { return { w: x[0], c: x[1] || '' }; }), O.seed, false); } else fromPanel(); MC.used(TOOL, 'shuffle'); });
    $('tb-make').addEventListener('click', function () { fromPanel(); MC.used(TOOL, 'make', { n: cur ? cur.P.length : 0, mode: panel.mode() }); var t = $('tb-play'); if (t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('tb-check').addEventListener('click', function () {
      var ks = Object.keys(cur.cells), bad = 0, empty = 0;
      ks.forEach(function (k) { var d = $('tb-grid').querySelector('.c[data-k="' + k + '"]'); d.classList.remove('ok', 'bad'); if (!fill[k]) { empty++; return; } if (right(k)) d.classList.add('ok'); else { d.classList.add('bad'); bad++; } });
      if (!checkDone()) say(bad ? bad + ' משבצות באדום – נסו לתקן אותן.' : 'הכול נכון עד עכשיו! נשארו ' + empty + ' משבצות.', bad ? 'bad' : '');
      MC.used(TOOL, 'check');
    });
    $('tb-hint').addEventListener('click', function () {
      if (!act) { say('נוגעים קודם במשבצת.'); return; }
      var k = cellsOf(act).filter(function (x) { return !right(x); })[0]; if (!k) { say('המילה הזאת כבר נכונה.'); return; }
      fill[k] = cur.cells[k].l; var el = inp(k); el.value = fill[k]; el.parentNode.classList.add('ok'); saveFill(); checkDone(); MC.used(TOOL, 'hint');
    });
    $('tb-reveal').addEventListener('click', function () {
      Object.keys(cur.cells).forEach(function (k) { fill[k] = cur.cells[k].l; }); saveFill(); draw(); mark(); say('אלה התשובות. "🔀 סידור אחר" בונה את התשבץ מחדש.'); MC.used(TOOL, 'reveal');
    });
    $('tb-clear').addEventListener('click', function () { fill = {}; saveFill(); draw(); mark(); });
    $('tb-print').addEventListener('click', function () { MC.print(pages(), O.title || 'תשבץ'); MC.used(TOOL, 'print', { n: cur.P.length }); });
    MC.pdfButton($('tb-pdf'), pages, function () { return O.title || ('תשבץ ' + (panel ? panel.topicName() : '')).trim(); }, TOOL);
    $('tb-send').addEventListener('click', function () {
      var d = shared || shareData(), l = MC.link(d);
      MC.wa('🧩 ' + (d.t || 'תשבץ') + ' – פתרו אותו בטלפון (בחינם, בלי הרשמה):\n' + l); MC.used(TOOL, 'send_link', { n: d.i.length });
    });
    $('tb-copy').addEventListener('click', function () { MC.copy(MC.link(shared || shareData()), this); MC.used(TOOL, 'copy_link'); });
  }

  opts(); actions();
  window.addEventListener('resize', function () { clearTimeout(window._tbr); window._tbr = setTimeout(refreshPreview, 300); });
  if (shared && shared.i && shared.i.length) {
    // תלמיד שקיבל קישור: רק התשבץ, והבונה מוסתר
    document.body.classList.add('mc-student');
    $('tb-from').hidden = false; $('tb-from-t').textContent = shared.t || 'תשבץ';
    O = { size: shared.z || 14, bank: !!shared.b, title: shared.t || '', ans: true, seed: shared.s || 'x' };
    make(shared.i.map(function (x) { return { w: String(x[0] || ''), c: String(x[1] || '') }; }), O.seed, true);
    MC.used(TOOL, 'open_link');
    $('tb-own').addEventListener('click', function () { document.body.classList.remove('mc-student'); location.href = location.pathname; });
  } else {
    panel = MC.panel($('tb-words'), { key: KEY + '-w', tool: TOOL, clues: true, n: 14, example: 'chanuka', onChange: function () { fromPanel(); } });
    fromPanel();
  }
})();
