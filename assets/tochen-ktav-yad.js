// יצירת חתימה בכתב יד – חותמים באצבע/בעכבר או מקלידים שם ובוחרים סגנון. הכול בדפדפן.
// החתימה נשמרת ב-localStorage תחת 'chatima-sigs' – אותו מקום שבו "חתימה על PDF" שומר חתימות,
// כך שחתימה שיצרתם כאן מוכנה גם לחתימה על מסמך וגם לחתימת המייל.
(function () {
  'use strict';
  var TOOL = 'ktav_yad', SIGS = 'chatima-sigs', STATE = 'hk_ktav_yad_v1', MAIL = 'hk_chatimat_mail_v1';
  var $ = function (id) { return document.getElementById(id); };
  var HE = /[֐-׿]/;
  var STYLES = [
    { id: 'gv', label: 'Great Vibes', fam: '"KY Great Vibes"', size: 64, slant: 0, fl: true, latin: true },
    { id: 'ds', label: 'Dancing Script', fam: '"KY Dancing Script"', size: 56, slant: 0, fl: false, latin: true },
    { id: 'sa', label: 'Sacramento', fam: '"KY Sacramento"', size: 66, slant: 0, fl: true, latin: true },
    { id: 'al', label: 'Allura', fam: '"KY Allura"', size: 66, slant: 0, fl: false, latin: true },
    { id: 'md', label: 'Mr Dafoe', fam: '"KY Mr Dafoe"', size: 62, slant: 0, fl: true, latin: true },
    { id: 'am', label: 'כתב יד דק', fam: '"KY Amatic"', size: 66, slant: -0.18, fl: true, he: true, latin: true, w: 700 },
    { id: 'ka', label: 'כתב יד מודגש', fam: '"KY Karantina"', size: 64, slant: -0.2, fl: false, he: true, latin: true, w: 700 },
    { id: 'ra', label: 'כתב רש״י', fam: '"KY Rashi"', size: 50, slant: -0.12, fl: true, he: true },
    { id: 'dv', label: 'דוד נטוי', fam: '"KY David"', size: 50, slant: -0.25, fl: false, he: true, latin: true, w: 700 },
    { id: 'am2', label: 'כתב יד עם קו', fam: '"KY Amatic"', size: 70, slant: -0.28, fl: true, he: true, latin: true, w: 400, line: true }
  ];
  var PENS = { blue: '#1b3a8f', black: '#16130f', navy: '#0f2a5c', green: '#0f5a3a' };

  var st = { mode: 'type', name: 'נועה לוי', style: 'am', pen: 'blue', w: 3, white: false };
  try { var o = JSON.parse(localStorage.getItem(STATE) || 'null'); if (o) for (var k in o) st[k] = o[k]; } catch (e) {}
  function saveSt() { try { localStorage.setItem(STATE, JSON.stringify(st)); } catch (e) {} }
  function msg(t) { var m = $('ky-msg'); if (m) m.textContent = t; }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how, mode: st.mode }); }
  function style() { return STYLES.filter(function (s) { return s.id === st.style; })[0] || STYLES[5]; }

  // ---------- ציור טקסט בסגנון חתימה ----------
  function drawName(g, W, H, s, name, color, scale) {
    scale = scale || 1;
    g.save();
    var size = s.size * scale;
    g.font = (s.w || 400) + ' ' + size + 'px ' + s.fam + ', cursive';
    var tw = g.measureText(name).width;
    var max = W * 0.86;
    if (tw > max) { size = size * max / tw; g.font = (s.w || 400) + ' ' + size + 'px ' + s.fam + ', cursive'; tw = g.measureText(name).width; }
    var rtl = HE.test(name);
    g.direction = rtl ? 'rtl' : 'ltr';
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = color; g.strokeStyle = color;
    var cx = W / 2, by = H * 0.62;
    g.translate(cx, by); g.transform(1, 0, s.slant, 1, 0, 0);
    g.fillText(name, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (s.fl || s.line) {
      g.lineCap = 'round'; g.lineWidth = Math.max(1.4, size / 26);
      var x0 = cx - tw / 2 - size * 0.1, x1 = cx + tw / 2 + size * 0.25, y = by + size * 0.18;
      g.beginPath();
      if (s.line) { g.moveTo(x0, y); g.lineTo(x1, y - size * 0.06); }
      else if (rtl) { g.moveTo(x1, y - size * 0.05); g.bezierCurveTo(cx + tw * 0.1, y + size * 0.22, cx - tw * 0.3, y - size * 0.08, x0 - size * 0.1, y + size * 0.04); }
      else { g.moveTo(x0, y - size * 0.05); g.bezierCurveTo(cx - tw * 0.1, y + size * 0.22, cx + tw * 0.3, y - size * 0.08, x1 + size * 0.1, y + size * 0.04); }
      g.stroke();
    }
    g.restore();
  }

  // ---------- לוח ציור ----------
  var pad, pg, strokes = [], cur = null, dpr = 1;
  function padSize() {
    var r = pad.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 3);
    pad.width = Math.max(300, Math.round(r.width * dpr)); pad.height = Math.max(150, Math.round(r.height * dpr));
    redraw();
  }
  function seg(g, s, scale) {
    var p = s.pts; if (!p.length) return;
    g.strokeStyle = g.fillStyle = PENS[s.c] || PENS.blue; g.lineCap = g.lineJoin = 'round';
    if (p.length === 1) { g.beginPath(); g.arc(p[0].x * scale, p[0].y * scale, s.w * scale / 2, 0, 7); g.fill(); return; }
    for (var i = 1; i < p.length; i++) {
      var a = p[i - 1], b = p[i], d = Math.hypot(b.x - a.x, b.y - a.y), dt = Math.max(1, b.t - a.t), v = d / dt;
      var w = s.w * Math.max(0.45, Math.min(1.35, 1.3 - v * 0.35));
      b.lw = a.lw ? a.lw * 0.6 + w * 0.4 : w;
      g.lineWidth = b.lw * scale;
      var m0 = i > 1 ? { x: (p[i - 2].x + a.x) / 2, y: (p[i - 2].y + a.y) / 2 } : a, m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      g.beginPath(); g.moveTo(m0.x * scale, m0.y * scale); g.quadraticCurveTo(a.x * scale, a.y * scale, m1.x * scale, m1.y * scale); g.stroke();
    }
  }
  function redraw() {
    if (!pg) return;
    pg.clearRect(0, 0, pad.width, pad.height);
    strokes.forEach(function (s) { seg(pg, s, dpr); }); if (cur) seg(pg, cur, dpr);
    var hint = $('ky-hint'); if (hint) hint.hidden = strokes.length > 0 || !!cur;
  }
  function bindPad() {
    pad = $('ky-pad'); if (!pad) return; pg = pad.getContext('2d');
    function pt(e) { var r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp || Date.now() }; }
    pad.addEventListener('pointerdown', function (e) { cur = { c: st.pen, w: st.w, pts: [pt(e)] }; try { pad.setPointerCapture(e.pointerId); } catch (x) {} redraw(); e.preventDefault(); });
    pad.addEventListener('pointermove', function (e) {
      if (!cur) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      if (!evs || !evs.length) evs = [e];
      evs.forEach(function (ev) { cur.pts.push(pt(ev)); });
      redraw(); e.preventDefault();
    });
    function up() { if (!cur) return; strokes.push(cur); cur = null; redraw(); out(); }
    pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); pad.addEventListener('pointerleave', function (e) { if (e.buttons === 0) up(); });
    window.addEventListener('resize', padSize);
  }

  // ---------- תוצאה ----------
  function render(scale) {   // מחזיר canvas חתוך בגודל אמיתי
    scale = scale || 3;
    var W, H, cv = document.createElement('canvas'), g;
    if (st.mode === 'draw') {
      if (!strokes.length) return null;
      var r = pad.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = Math.round(W * scale); cv.height = Math.round(H * scale); g = cv.getContext('2d');
      strokes.forEach(function (s) { seg(g, s, scale); });
    } else {
      var name = (st.name || '').trim(); if (!name) return null;
      W = 600; H = 220; cv.width = W * scale; cv.height = H * scale; g = cv.getContext('2d');
      drawName(g, cv.width, cv.height, style(), name, PENS[st.pen], scale);
    }
    return trim(cv);
  }
  function trim(cv) {
    var g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data, x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
    for (var y = 0; y < cv.height; y += 1) for (var x = 0; x < cv.width; x += 1) if (d[(y * cv.width + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    var m = 12, w = x1 - x0 + 1 + 2 * m, h = y1 - y0 + 1 + 2 * m, o = document.createElement('canvas'); o.width = w; o.height = h;
    var og = o.getContext('2d');
    if (st.white) { og.fillStyle = '#ffffff'; og.fillRect(0, 0, w, h); }
    og.drawImage(cv, x0 - m, y0 - m, w, h, 0, 0, w, h);
    return o;
  }
  var lastOut = null;
  function out() {
    var box = $('ky-out'); if (!box) return;
    var c = render(2);
    lastOut = c;
    box.innerHTML = '';
    if (!c) { box.innerHTML = '<p class="ky-empty">' + (st.mode === 'draw' ? 'חותמים בתוך המסגרת למעלה' : 'כותבים שם למעלה') + ' – והחתימה תופיע כאן.</p>'; return; }
    var im = new Image(); im.alt = 'החתימה שלכם'; im.src = c.toDataURL('image/png'); box.appendChild(im);
    box.classList.toggle('ky-white', !!st.white);
  }

  // ---------- סגנונות להקלדה ----------
  function stylesGrid() {
    var grid = $('ky-styles'); if (!grid) return;
    var name = (st.name || '').trim() || 'החתימה שלי', he = HE.test(name);
    grid.innerHTML = '';
    STYLES.filter(function (s) { return he ? s.he : s.latin; }).forEach(function (s) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ky-st'; b.setAttribute('aria-pressed', String(s.id === st.style));
      b.setAttribute('aria-label', 'סגנון ' + s.label);
      var cv = document.createElement('canvas'); cv.width = 520; cv.height = 180; drawName(cv.getContext('2d'), 520, 180, s, name, PENS[st.pen], 1.6);
      var l = document.createElement('span'); l.textContent = s.label;
      b.appendChild(cv); b.appendChild(l);
      b.addEventListener('click', function () { st.style = s.id; saveSt(); stylesGrid(); out(); used('style'); });
      grid.appendChild(b);
    });
    if (!STYLES.some(function (s) { return s.id === st.style && (he ? s.he : s.latin); })) { st.style = he ? 'am' : 'gv'; stylesGrid(); }
  }

  // ---------- חתימות שמורות ----------
  function sigs() { try { return JSON.parse(localStorage.getItem(SIGS) || '[]'); } catch (e) { return []; } }
  function keep(c) {
    var url = c.toDataURL('image/png'), l = sigs().filter(function (s) { return s.url !== url; });
    l.unshift({ url: url, ratio: c.height / c.width });
    try { localStorage.setItem(SIGS, JSON.stringify(l.slice(0, 3))); return true; } catch (e) { return false; }
  }
  function savedList() {
    var box = $('ky-saved'); if (!box) return;
    var l = sigs(); box.innerHTML = '';
    $('ky-saved-wrap').hidden = !l.length;
    l.forEach(function (s, i) {
      var d = document.createElement('div'); d.className = 'ky-sv';
      var im = new Image(); im.src = s.url; im.alt = 'חתימה שמורה ' + (i + 1);
      var x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'למחוק את החתימה השמורה');
      x.addEventListener('click', function () { var a = sigs(); a.splice(i, 1); try { localStorage.setItem(SIGS, JSON.stringify(a)); } catch (e) {} savedList(); });
      d.appendChild(im); d.appendChild(x); box.appendChild(d);
    });
  }

  function mode(m) {
    st.mode = m; saveSt();
    $('ky-draw').hidden = m !== 'draw'; $('ky-type').hidden = m !== 'type';
    $('ky-tab-draw').setAttribute('aria-pressed', String(m === 'draw')); $('ky-tab-type').setAttribute('aria-pressed', String(m === 'type'));
    if (m === 'draw') padSize(); else stylesGrid();
    out();
  }

  function init() {
    if (!$('ky-out')) return;
    var root = document.querySelector('[data-ky-start]');
    if (root && root.dataset.kyMode && !localStorage.getItem(STATE)) st.mode = root.dataset.kyMode;
    bindPad();
    $('ky-name').value = st.name || '';
    $('ky-w').value = st.w; $('ky-white').checked = !!st.white;
    [].forEach.call(document.querySelectorAll('[data-pen]'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.pen === st.pen));
      b.addEventListener('click', function () {
        st.pen = b.dataset.pen; saveSt();
        [].forEach.call(document.querySelectorAll('[data-pen]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        strokes.forEach(function (s) { s.c = st.pen; }); redraw(); if (st.mode === 'type') stylesGrid(); out();
      });
    });
    $('ky-tab-draw').addEventListener('click', function () { mode('draw'); });
    $('ky-tab-type').addEventListener('click', function () { mode('type'); });
    $('ky-name').addEventListener('input', function () { st.name = this.value; saveSt(); stylesGrid(); out(); });
    $('ky-w').addEventListener('input', function () { st.w = +this.value || 3; saveSt(); strokes.forEach(function (s) { s.w = st.w; }); redraw(); out(); });
    $('ky-white').addEventListener('change', function () { st.white = this.checked; saveSt(); out(); });
    $('ky-undo').addEventListener('click', function () { strokes.pop(); redraw(); out(); });
    $('ky-clear').addEventListener('click', function () { strokes = []; redraw(); out(); });
    function need() { var c = render(3); if (!c) msg(st.mode === 'draw' ? 'קודם חותמים בתוך המסגרת.' : 'קודם כותבים שם.'); return c; }
    $('ky-png').addEventListener('click', function () {
      var c = need(); if (!c) return;
      var a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = st.white ? 'chatima.png' : 'chatima-shkufa.png';
      document.body.appendChild(a); a.click(); a.remove(); used('download');
      msg('✓ החתימה ירדה כקובץ PNG' + (st.white ? ' עם רקע לבן.' : ' עם רקע שקוף – אפשר לשים אותה על כל מסמך.'));
    });
    $('ky-copy').addEventListener('click', function () {
      var c = need(); if (!c) return;
      if (!(navigator.clipboard && window.ClipboardItem)) { msg('הדפדפן הזה לא מעתיק תמונות. מורידים כ-PNG.'); return; }
      c.toBlob(function (b) {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(function () { msg('✓ החתימה הועתקה כתמונה. מדביקים (Ctrl+V) בוורד, במייל או במסמך.'); used('copy'); },
          function () { msg('ההעתקה לא עבדה. מורידים כ-PNG.'); });
      }, 'image/png');
    });
    $('ky-save').addEventListener('click', function () {
      var c = need(); if (!c) return;
      msg(keep(c) ? '✓ נשמרה בדפדפן. עכשיו היא מחכה לכם בכלי "חתימה על PDF" ובחתימת המייל.' : 'לא הצלחתי לשמור בדפדפן הזה (אולי מצב גלישה פרטית).');
      savedList(); used('save');
    });
    $('ky-pdf').addEventListener('click', function () { var c = render(3); if (c) keep(c); used('to_pdf'); location.href = '/kelim/machshev/chatima/'; });
    $('ky-mail').addEventListener('click', function () {
      var c = need(); if (!c) return;
      keep(c);
      try { var m = JSON.parse(localStorage.getItem(MAIL) || 'null'); if (m) { m.hand = true; localStorage.setItem(MAIL, JSON.stringify(m)); } } catch (e) {}
      used('to_mail'); location.href = '/kelim/tochen/chatimat-mail/';
    });
    savedList();
    var go = function () { mode(st.mode === 'draw' ? 'draw' : 'type'); };
    if (document.fonts && document.fonts.load) {
      Promise.all(STYLES.map(function (s) { return document.fonts.load((s.w || 400) + ' 40px ' + s.fam, HE.test(s.label) ? 'אב' : 'Ab').catch(function () {}); })).then(go, go);
      setTimeout(function () { if (st.mode === 'type') stylesGrid(); out(); }, 1500);
    } else go();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
