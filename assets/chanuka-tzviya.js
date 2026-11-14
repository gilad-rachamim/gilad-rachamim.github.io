/* דפי צביעה לחנוכה – נוגעים באזור והוא נצבע. הכול בטלפון, בלי שרת. */
(function () {
  'use strict';
  var KEY = 'chanuka_tzviya_v1';
  var NS = 'http://www.w3.org/2000/svg';
  var COLORS = ['#e53935', '#fb8c00', '#fdd835', '#ffe8a3', '#43a047', '#a5d6a7', '#1e88e5', '#90caf9', '#3949ab', '#8e24aa', '#f48fb1', '#8d6e63', '#d4b062', '#9e9e9e', '#212121', '#ffffff'];
  var CNAMES = ['אדום', 'כתום', 'צהוב', 'שמנת', 'ירוק', 'ירוק בהיר', 'כחול', 'תכלת', 'כחול כהה', 'סגול', 'ורוד', 'חום', 'זהב', 'אפור', 'שחור', 'לבן (מחק)'];

  /* ---------- עזרים לציור: כל אזור סגור הוא "r" שאפשר לצבוע ---------- */
  function R(x, y, w, h, rx) { return '<rect class="r" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (rx ? ' rx="' + rx + '"' : '') + '/>'; }
  function P(d) { return '<path class="r" d="' + d + '"/>'; }
  function C(cx, cy, r) { return '<circle class="r" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>'; }
  function E(cx, cy, rx, ry) { return '<ellipse class="r" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"/>'; }
  function L(d) { return '<path class="ln" d="' + d + '"/>'; }
  function T(x, y, s, txt) { return '<text class="r tx" x="' + x + '" y="' + y + '" font-size="' + s + '" text-anchor="middle">' + txt + '</text>'; }
  function flame(x, t) { return P('M' + x + ' ' + t + ' C' + (x + 11) + ' ' + (t - 8) + ' ' + (x + 4) + ' ' + (t - 21) + ' ' + x + ' ' + (t - 30) + ' C' + (x - 4) + ' ' + (t - 21) + ' ' + (x - 11) + ' ' + (t - 8) + ' ' + x + ' ' + t + ' Z'); }
  function star(cx, cy, r) {
    var d = '', i, a, rr;
    for (i = 0; i < 10; i++) { a = Math.PI / 5 * i - Math.PI / 2; rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1) + ' '; }
    return P(d + 'Z');
  }
  function bg() { return R(4, 4, 292, 292, 18); }

  var DRAW = [
    { id: 'chanukiya', name: 'חנוכייה', svg: function () {
      var s = bg(), xs = [48, 74, 100, 126, 174, 200, 226, 252], i;
      s += P('M88 272 L212 272 L194 246 L106 246 Z');
      s += R(138, 150, 24, 96, 4);
      s += R(30, 138, 240, 16, 8);
      for (i = 0; i < 8; i++) { s += R(xs[i] - 10, 122, 20, 16, 3) + R(xs[i] - 5, 82, 10, 40, 2) + flame(xs[i], 80); }
      s += R(141, 104, 18, 34, 3) + R(138, 92, 24, 14, 3) + R(145, 52, 10, 40, 2) + flame(150, 50);
      s += star(40, 36, 13) + star(262, 40, 10) + star(244, 220, 9);
      return s;
    } },
    { id: 'sevivon', name: 'סביבון', svg: function () {
      var s = bg();
      s += P('M88 112 L118 96 L238 96 L208 112 Z');
      s += R(88, 112, 120, 92, 4);
      s += P('M208 112 L238 96 L238 186 L208 204 Z');
      s += P('M88 204 L208 204 L150 266 Z');
      s += P('M208 204 L238 186 L150 266 Z');
      s += R(152, 40, 22, 64, 6);
      s += T(148, 182, 76, 'נ');
      s += star(48, 50, 14) + star(256, 240, 12) + star(46, 236, 9) + C(262, 52, 10);
      return s;
    } },
    { id: 'sufganiya', name: 'סופגנייה', svg: function () {
      var s = bg();
      s += E(150, 238, 122, 30) + E(150, 236, 92, 18);
      s += E(150, 180, 100, 60);
      s += P('M58 168 Q72 118 150 116 Q228 118 242 168 Q222 160 206 174 Q190 160 170 172 Q150 158 130 172 Q110 160 94 174 Q78 160 58 168 Z');
      s += P('M150 120 C134 118 136 100 150 84 C164 100 166 118 150 120 Z');
      s += C(100, 146, 6) + C(124, 136, 6) + C(178, 138, 6) + C(204, 150, 6) + C(150, 150, 6) + C(80, 160, 5) + C(222, 162, 5);
      s += star(44, 44, 13) + star(256, 48, 11);
      return s;
    } },
    { id: 'kad', name: 'פך השמן', svg: function () {
      var s = bg();
      s += P('M190 122 Q246 120 240 176 Q234 210 210 214 L210 198 Q222 194 224 174 Q228 136 192 138 Z');
      s += P('M112 108 Q70 150 80 210 Q90 262 150 264 Q210 262 220 210 Q230 150 188 108 Z');
      s += P('M100 124 Q150 138 200 124 L208 140 Q150 156 92 140 Z');
      s += R(124, 70, 52, 40, 4);
      s += R(112, 58, 76, 16, 7);
      s += E(150, 200, 40, 28) + T(150, 212, 30, 'שמן');
      s += P('M150 52 C142 40 144 30 150 18 C156 30 158 40 150 52 Z');
      s += C(46, 48, 12) + star(254, 54, 13) + star(44, 250, 9);
      s += L('M92 236 Q150 250 208 236');
      return s;
    } },
    { id: 'magen', name: 'מגן המכבים', svg: function () {
      var s = bg();
      s += R(236, 40, 10, 240, 3) + P('M241 14 L254 46 L228 46 Z');
      s += R(54, 40, 10, 240, 3) + P('M59 14 L72 46 L46 46 Z');
      s += C(150, 164, 104) + C(150, 164, 80);
      s += T(150, 186, 58, 'מכבי');
      var i, a;
      for (i = 0; i < 12; i++) { a = Math.PI / 6 * i; s += C((150 + 92 * Math.cos(a)).toFixed(1), (164 + 92 * Math.sin(a)).toFixed(1), 5); }
      return s;
    } },
    { id: 'mikdash', name: 'בית המקדש', svg: function () {
      var s = bg(), i;
      s += C(250, 46, 22);
      s += P('M4 232 Q80 206 150 226 Q220 206 296 232 L296 282 Q296 296 282 296 L18 296 Q4 296 4 282 Z');
      s += R(12, 168, 62, 70) + R(226, 168, 62, 70);
      for (i = 0; i < 4; i++) { s += R(14 + i * 16, 156, 10, 12) + R(228 + i * 16, 156, 10, 12); }
      s += R(90, 98, 120, 126);
      s += R(64, 76, 172, 24, 2);
      for (i = 0; i < 9; i++) { s += R(66 + i * 19.5, 62, 12, 14); }
      s += R(100, 116, 16, 108) + R(184, 116, 16, 108);
      s += P('M128 224 L128 156 Q150 124 172 156 L172 224 Z');
      s += R(78, 224, 144, 12) + R(70, 236, 160, 12);
      s += star(44, 50, 11) + star(150, 30, 9);
      return s;
    } },
    /* 13.11.2026: עוד חמישה ציורים (מנדלה, חנוכה שמח, לביבות, ענף זית, חנוכייה לקטנים) */
    { id: 'mandala', name: 'מנדלה לחנוכה', svg: function () {
      var s = bg(), i, a, x, y;
      s += C(150, 150, 138);
      for (i = 0; i < 16; i++) { a = i * 22.5; s += '<ellipse class="r" cx="150" cy="35" rx="13" ry="22" transform="rotate(' + a + ' 150 150)"/>'; }
      s += C(150, 150, 98);
      for (i = 0; i < 8; i++) { a = i * 45; s += '<path class="r" d="M150 62 L166 92 L150 122 L134 92 Z" transform="rotate(' + a + ' 150 150)"/>'; }
      for (i = 0; i < 8; i++) { a = (i * 45 + 22.5) * Math.PI / 180; x = 150 + 78 * Math.sin(a); y = 150 - 78 * Math.cos(a); s += C(x.toFixed(1), y.toFixed(1), 9); }
      s += C(150, 150, 44);
      for (i = 0; i < 8; i++) { a = i * 45; s += '<ellipse class="r" cx="150" cy="122" rx="7" ry="14" transform="rotate(' + a + ' 150 150)"/>'; }
      s += C(150, 150, 16);
      return s;
    } },
    { id: 'sameach', name: 'חנוכה שמח', svg: function () {
      var s = bg(), i;
      s += R(24, 24, 252, 252, 14);
      s += T(150, 132, 64, 'חנוכה') + T(150, 214, 64, 'שמח');
      for (i = 0; i < 8; i++) { s += R(38 + i * 30, 238, 12, 26, 2) + flame(44 + i * 30, 236); }
      s += star(48, 54, 14) + star(252, 54, 14) + star(150, 50, 10);
      return s;
    } },
    { id: 'levivot', name: 'לביבות במחבת', svg: function () {
      var s = bg();
      s += R(222, 150, 70, 18, 8);
      s += E(130, 170, 104, 70) + E(130, 162, 88, 54);
      s += E(96, 150, 26, 16) + E(156, 140, 26, 16) + E(104, 186, 26, 16) + E(166, 182, 26, 16);
      s += L('M96 92 C86 78 106 70 96 54') + L('M130 88 C120 74 140 66 130 50') + L('M164 92 C154 78 174 70 164 54');
      s += E(70, 268, 46, 14) + E(70, 262, 30, 8) + C(240, 250, 22);
      return s;
    } },
    { id: 'zayit', name: 'ענף זית', svg: function () {
      var s = bg(), i, t, px, py, th, cx, cy, ts = [0.12, 0.26, 0.4, 0.54, 0.68, 0.82];
      s += L('M60 40 L250 240');
      for (i = 0; i < ts.length; i++) {  // עלים לסירוגין משני צדי הענף, מכוונים קדימה
        t = ts[i]; px = 60 + 190 * t; py = 40 + 200 * t; th = i % 2 ? 95 : -5;
        cx = px + 25 * Math.cos(th * Math.PI / 180); cy = py + 25 * Math.sin(th * Math.PI / 180);
        s += '<ellipse class="r" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="24" ry="9" transform="rotate(' + th + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')"/>';
      }
      for (i = 0; i < 3; i++) { t = 0.33 + i * 0.28; px = 60 + 190 * t; py = 40 + 200 * t; s += E((px + 18).toFixed(1), (py - 12).toFixed(1), 9, 12); }
      s += P('M40 276 L40 236 Q40 222 54 216 L54 204 L74 204 L74 216 Q88 222 88 236 L88 276 Z');
      return s;
    } },
    { id: 'ktanim', name: 'חנוכייה לקטנים', svg: function () {
      var s = bg(), i, xs = [34, 62, 90, 118, 182, 210, 238, 266];
      s += R(16, 210, 268, 26, 10) + P('M100 236 L200 236 L222 280 L78 280 Z');
      for (i = 0; i < 8; i++) { s += R(xs[i] - 11, 130, 22, 80, 4) + flame(xs[i], 128); }
      s += R(139, 96, 22, 114, 4) + flame(150, 94);
      return s;
    } }
  ];

  /* ---------- מצב (נשמר בטלפון) ---------- */
  var st = { cur: 0, color: 1, fills: {} };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && typeof sv === 'object') { st.cur = Math.min(DRAW.length - 1, Math.max(0, sv.cur | 0)); st.color = Math.min(COLORS.length - 1, Math.max(0, sv.color | 0)); st.fills = sv.fills || {}; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var undo = [], tracked = {};
  function used(how) { try { if (window.toolUsed) window.toolUsed('chanuka_tzviya', { how: how }); } catch (e) {} }

  function $(id) { return document.getElementById(id); }
  function build(i, colored) {
    var d = DRAW[i];
    var svg = '<svg xmlns="' + NS + '" viewBox="0 0 300 300" class="tz-svg" role="img" aria-label="' + d.name + ' לצביעה">' + d.svg() + '</svg>';
    var wrap = document.createElement('div');
    wrap.innerHTML = svg;
    var el = wrap.firstChild, rs = el.querySelectorAll('.r'), f = colored ? (st.fills[d.id] || {}) : {}, k;
    for (k = 0; k < rs.length; k++) {
      rs[k].setAttribute('data-i', k); rs[k].setAttribute('fill', f[k] || '#ffffff');
      rs[k].setAttribute('stroke', '#1d1d1d'); rs[k].setAttribute('stroke-width', rs[k].tagName === 'text' ? '2.5' : '3'); rs[k].setAttribute('stroke-linejoin', 'round');
      if (rs[k].tagName === 'text') { rs[k].setAttribute('font-weight', '800'); rs[k].setAttribute('font-family', 'Assistant, Arial, sans-serif'); }
    }
    var ls = el.querySelectorAll('.ln');
    for (k = 0; k < ls.length; k++) { ls[k].setAttribute('fill', 'none'); ls[k].setAttribute('stroke', '#1d1d1d'); ls[k].setAttribute('stroke-width', '2.5'); ls[k].setAttribute('stroke-linecap', 'round'); ls[k].setAttribute('pointer-events', 'none'); }
    return el;
  }

  var stage, pal, tabs, msg;
  function render() {
    stage.innerHTML = '';
    stage.appendChild(build(st.cur, true));
    var b = tabs.querySelectorAll('button'), k;
    for (k = 0; k < b.length; k++) b[k].setAttribute('aria-pressed', k === st.cur ? 'true' : 'false');
    $('tz-name').textContent = DRAW[st.cur].name;
    $('tz-undo').disabled = !undo.some(function (u) { return u.d === st.cur; });
  }
  function paintPal() {
    var b = pal.querySelectorAll('button'), k;
    for (k = 0; k < b.length; k++) b[k].setAttribute('aria-pressed', k === st.color ? 'true' : 'false');
  }
  function say(t) { msg.textContent = t; clearTimeout(say.t); say.t = setTimeout(function () { msg.textContent = ''; }, 2600); }

  function onTap(e) {
    var t = e.target;
    if (!t || !t.classList || !t.classList.contains('r')) return;
    var d = DRAW[st.cur], i = t.getAttribute('data-i'), f = st.fills[d.id] || (st.fills[d.id] = {});
    var prev = f[i] || '#ffffff', c = COLORS[st.color];
    if (prev === c) return;
    undo.push({ d: st.cur, i: i, prev: prev });
    if (undo.length > 300) undo.shift();
    if (c === '#ffffff') delete f[i]; else f[i] = c;
    t.setAttribute('fill', c);
    save();
    $('tz-undo').disabled = false;
    if (!tracked[d.id]) { tracked[d.id] = 1; used('fill'); }
  }

  function doUndo() {
    for (var k = undo.length - 1; k >= 0; k--) {
      if (undo[k].d !== st.cur) continue;
      var u = undo.splice(k, 1)[0], d = DRAW[u.d], f = st.fills[d.id] || (st.fills[d.id] = {});
      if (u.prev === '#ffffff') delete f[u.i]; else f[u.i] = u.prev;
      save(); render(); used('undo'); return;
    }
  }
  function doClear() {
    var d = DRAW[st.cur];
    if (!st.fills[d.id] || !Object.keys(st.fills[d.id]).length) { say('הציור כבר נקי'); return; }
    if (!confirm('למחוק את כל הצבעים מה' + d.name + '?')) return;
    st.fills[d.id] = {};
    undo = undo.filter(function (u) { return u.d !== st.cur; });
    save(); render(); used('clear'); say('הציור נקי, אפשר להתחיל מחדש');
  }

  function doPrint(mode) {
    var box = $('tz-print'); box.innerHTML = '';
    var list = mode === 'all' ? DRAW.map(function (_, i) { return i; }) : [st.cur], k;
    for (k = 0; k < list.length; k++) {
      var pg = document.createElement('div'); pg.className = 'tz-page';
      var h = document.createElement('p'); h.className = 'tz-ph'; h.textContent = DRAW[list[k]].name + ' · חנוכה שמח!';
      pg.appendChild(h); pg.appendChild(build(list[k], mode === 'mine'));
      var ft = document.createElement('p'); ft.className = 'tz-pf'; ft.textContent = 'דפי צביעה לחנוכה בחינם · hakelim.com/kodesh/chanuka/tzviya';
      pg.appendChild(ft); box.appendChild(pg);
    }
    used(mode === 'all' ? 'print_all' : mode === 'mine' ? 'print_mine' : 'print');
    setTimeout(function () { window.print(); }, 60);
  }

  function doSave() {
    var el = build(st.cur, true), xml = new XMLSerializer().serializeToString(el);
    xml = xml.replace('<svg ', '<svg width="1200" height="1200" ');
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = 1200; c.height = 1300;
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1200, 1300);
      g.drawImage(img, 0, 0, 1200, 1200);
      g.fillStyle = '#7a5c1e'; g.font = 'bold 44px Assistant, Arial, sans-serif'; g.textAlign = 'center'; g.direction = 'rtl';
      g.fillText('צבעתי ' + DRAW[st.cur].name + ' · חנוכה שמח!', 600, 1265);
      c.toBlob(function (b) {
        if (!b) { say('לא הצלחתי לשמור. אפשר לצלם מסך'); return; }
        var name = 'tzviya-' + DRAW[st.cur].id + '.png', file;
        try { file = new File([b], name, { type: 'image/png' }); } catch (e) {}
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'צבעתי לחנוכה' }).catch(function () {});
        } else {
          var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        }
        used('save');
      }, 'image/png');
    };
    img.onerror = function () { say('לא הצלחתי לשמור. אפשר לצלם מסך'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  }

  function init() {
    stage = $('tz-stage'); pal = $('tz-pal'); tabs = $('tz-tabs'); msg = $('tz-msg');
    if (!stage) return;
    document.body.appendChild($('tz-print'));
    DRAW.forEach(function (d, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tz-tab';
      b.appendChild(build(i, false)); var s = document.createElement('span'); s.textContent = d.name; b.appendChild(s);
      b.onclick = function () { st.cur = i; save(); render(); used('pick'); stage.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
      tabs.appendChild(b);
    });
    COLORS.forEach(function (c, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tz-c' + (c === '#ffffff' ? ' er' : '');
      b.style.background = c; b.title = CNAMES[i]; b.setAttribute('aria-label', CNAMES[i]);
      b.onclick = function () { st.color = i; save(); paintPal(); };
      pal.appendChild(b);
    });
    stage.addEventListener('click', onTap);
    $('tz-undo').onclick = doUndo;
    $('tz-clear').onclick = doClear;
    $('tz-p1').onclick = function () { doPrint('blank'); };
    $('tz-p2').onclick = function () { doPrint('mine'); };
    $('tz-pall').onclick = function () { doPrint('all'); };
    $('tz-save').onclick = doSave;
    render(); paintPal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
