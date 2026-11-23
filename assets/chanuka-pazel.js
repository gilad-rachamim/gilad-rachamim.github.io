/* פאזל חנוכה – ציורים צבעוניים שנוצרו בקוד, שלוש רמות. גוררים חלק על חלק או נוגעים בשניים כדי להחליף. עובד בלי אינטרנט. */
(function () {
  'use strict';
  var KEY = 'chanuka_pazel_v1';
  function $(id) { return document.getElementById(id); }
  function used(how) { try { if (window.toolUsed) window.toolUsed('chanuka_pazel', { how: how }); } catch (e) {} }
  function rnd(n) {
    try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } catch (e) { return Math.floor(Math.random() * n); }
  }
  var NS = 'http://www.w3.org/2000/svg';

  function stars(list) { var s = '', i; for (i = 0; i < list.length; i++) s += '<path d="M' + list[i][0] + ' ' + (list[i][1] - list[i][2]) + ' L' + (list[i][0] + list[i][2] * 0.3) + ' ' + (list[i][1] - list[i][2] * 0.3) + ' L' + (list[i][0] + list[i][2]) + ' ' + list[i][1] + ' L' + (list[i][0] + list[i][2] * 0.3) + ' ' + (list[i][1] + list[i][2] * 0.3) + ' L' + list[i][0] + ' ' + (list[i][1] + list[i][2]) + ' L' + (list[i][0] - list[i][2] * 0.3) + ' ' + (list[i][1] + list[i][2] * 0.3) + ' L' + (list[i][0] - list[i][2]) + ' ' + list[i][1] + ' L' + (list[i][0] - list[i][2] * 0.3) + ' ' + (list[i][1] - list[i][2] * 0.3) + ' Z" fill="#fff4b8"/>'; return s; }
  function flame(x, y) { return '<path d="M' + x + ' ' + y + ' C' + (x + 9) + ' ' + (y - 8) + ' ' + (x + 4) + ' ' + (y - 20) + ' ' + x + ' ' + (y - 28) + ' C' + (x - 4) + ' ' + (y - 20) + ' ' + (x - 9) + ' ' + (y - 8) + ' ' + x + ' ' + y + ' Z" fill="#ff9a1f"/><path d="M' + x + ' ' + y + ' C' + (x + 4) + ' ' + (y - 4) + ' ' + (x + 2) + ' ' + (y - 10) + ' ' + x + ' ' + (y - 14) + ' C' + (x - 2) + ' ' + (y - 10) + ' ' + (x - 4) + ' ' + (y - 4) + ' ' + x + ' ' + y + ' Z" fill="#ffe27a"/>'; }

  var PICS = [
    { n: 'חנוכייה', s: function () {
      var o = '<rect width="300" height="300" fill="#16306b"/>' + stars([[40, 40, 8], [250, 30, 6], [270, 110, 7], [30, 130, 6], [150, 25, 5]]) +
        '<path d="M92 282 L208 282 L192 250 L108 250 Z" fill="#b8860b"/><rect x="138" y="156" width="24" height="96" rx="4" fill="#e6b53a"/><rect x="30" y="144" width="240" height="16" rx="8" fill="#e6b53a"/><rect x="141" y="108" width="18" height="38" rx="3" fill="#e6b53a"/>';
      var xs = [48, 74, 100, 126, 174, 200, 226, 252], i;
      for (i = 0; i < 8; i++) o += '<rect x="' + (xs[i] - 10) + '" y="128" width="20" height="16" rx="3" fill="#e6b53a"/><rect x="' + (xs[i] - 5) + '" y="88" width="10" height="40" rx="2" fill="#f4f0e4"/>' + flame(xs[i], 86);
      o += '<rect x="145" y="60" width="10" height="48" rx="2" fill="#f4f0e4"/>' + flame(150, 58);
      return o; } },
    { n: 'סביבון', s: function () {
      return '<rect width="300" height="300" fill="#bfe3f7"/><circle cx="240" cy="55" r="26" fill="#fff4b8"/><ellipse cx="150" cy="276" rx="70" ry="10" fill="#8cc1de"/><rect x="138" y="30" width="24" height="50" rx="8" fill="#a9642b"/><path d="M86 112 L118 90 L214 90 L182 112 Z" fill="#3b7fd1"/><rect x="86" y="112" width="96" height="100" rx="4" fill="#1e5aa8"/><path d="M182 112 L214 90 L214 190 L182 212 Z" fill="#144680"/><path d="M86 212 L182 212 L150 268 L134 268 Z" fill="#144680"/><path d="M182 212 L214 190 L158 262 L150 268 Z" fill="#0f3a6d"/><text x="134" y="186" text-anchor="middle" font-size="84" font-weight="800" fill="#fff" font-family="Arial,sans-serif">נ</text>'; } },
    { n: 'סופגנייה', s: function () {
      return '<rect width="300" height="300" fill="#fde9c9"/><ellipse cx="150" cy="238" rx="105" ry="16" fill="#e8c795"/><ellipse cx="150" cy="190" rx="112" ry="64" fill="#c97f30"/><ellipse cx="150" cy="170" rx="112" ry="62" fill="#e3a251"/><ellipse cx="150" cy="150" rx="84" ry="38" fill="#fff"/><path d="M150 140 C170 128 190 140 184 156 C178 170 150 168 130 158 C116 148 130 132 150 140 Z" fill="#d9302b"/><g fill="#fff" opacity=".9"><circle cx="70" cy="190" r="4"/><circle cx="108" cy="224" r="4"/><circle cx="196" cy="226" r="4"/><circle cx="238" cy="196" r="4"/><circle cx="222" cy="152" r="4"/></g>' + stars([[50, 50, 9], [250, 60, 8]]).replace(/#fff4b8/g, '#f4b942'); } },
    { n: 'פך שמן', s: function () {
      return '<rect width="300" height="300" fill="#2b1f4d"/>' + stars([[40, 50, 8], [260, 40, 7], [250, 140, 6], [34, 160, 5]]) + '<path d="M112 40 H188 V84 C246 106 262 160 252 214 C244 262 200 282 150 282 C100 282 56 262 48 214 C38 160 54 106 112 84 Z" fill="#c58a3d" stroke="#7a4e17" stroke-width="6"/><rect x="100" y="28" width="100" height="26" rx="8" fill="#7a4e17"/><path d="M80 170 C104 140 196 140 220 170" stroke="#f0cf8a" stroke-width="12" fill="none" stroke-linecap="round"/><ellipse cx="150" cy="224" rx="52" ry="26" fill="#f1c24b" opacity=".75"/>'; } },
    { n: 'חנוכייה בחלון', s: function () {
      var o = '<rect width="300" height="300" fill="#7a4e2b"/><rect x="22" y="22" width="256" height="256" rx="6" fill="#0f2350"/><circle cx="224" cy="74" r="24" fill="#fff4b8"/><circle cx="234" cy="68" r="22" fill="#0f2350"/>' + stars([[60, 60, 7], [110, 90, 5], [180, 50, 6], [70, 130, 5]]) + '<rect x="146" y="22" width="8" height="256" fill="#7a4e2b"/><rect x="22" y="146" width="256" height="8" fill="#7a4e2b"/><rect x="22" y="262" width="256" height="22" fill="#9a6837"/>';
      var xs = [60, 82, 104, 126, 174, 196, 218, 240], i;
      o += '<rect x="46" y="244" width="208" height="12" rx="6" fill="#e6b53a"/><rect x="142" y="226" width="16" height="22" fill="#e6b53a"/>';
      for (i = 0; i < 8; i++) o += '<rect x="' + (xs[i] - 4) + '" y="204" width="8" height="40" rx="2" fill="#f4f0e4"/>' + flame(xs[i], 202);
      o += '<rect x="146" y="192" width="8" height="52" rx="2" fill="#f4f0e4"/>' + flame(150, 190);
      return o; } }
  ];
  var LEVELS = { 1: { c: 2, r: 3, name: 'קל' }, 2: { c: 3, r: 4, name: 'בינוני' }, 3: { c: 4, r: 5, name: 'קשה' } };

  var st = { lvl: 1, pic: 0, best: {} };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && typeof sv === 'object') { st.lvl = [1, 2, 3].indexOf(sv.lvl) > -1 ? sv.lvl : 1; st.pic = Math.min(PICS.length - 1, Math.max(0, sv.pic | 0)); st.best = sv.best || {}; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  var g = null;
  function tileSvg(piece, L) {
    var w = 300 / L.c, h = 300 / L.r, cx = piece % L.c, cy = Math.floor(piece / L.c);
    return '<svg xmlns="' + NS + '" viewBox="' + (cx * w) + ' ' + (cy * h) + ' ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><use href="#pz-pic"/></svg>';
  }
  function newGame(keepPic) {
    var L = LEVELS[st.lvl], n = L.c * L.r, order = [], i, j, t, tries = 0;
    for (i = 0; i < n; i++) order.push(i);
    do {
      for (i = n - 1; i > 0; i--) { j = rnd(i + 1); t = order[i]; order[i] = order[j]; order[j] = t; }
      tries++;
    } while (solved(order) && tries < 20);
    g = { order: order, sel: -1, moves: 0, start: Date.now(), done: false };
    var defs = $('pz-defs');
    defs.innerHTML = '<g id="pz-pic">' + PICS[st.pic].s() + '</g>';
    render();
    $('pz-win').hidden = true;
    used('start');
  }
  function solved(o) { for (var i = 0; i < o.length; i++) if (o[i] !== i) return false; return true; }
  function render() {
    var L = LEVELS[st.lvl], b = $('pz-board'), h = '', k;
    b.style.setProperty('--c', L.c); b.style.setProperty('--r', L.r);
    b.style.aspectRatio = L.c + ' / ' + L.r;
    for (k = 0; k < g.order.length; k++) h += '<div class="pz-t' + (g.sel === k ? ' sel' : '') + (g.order[k] === k ? ' right' : '') + '" data-k="' + k + '" role="button" tabindex="0" aria-label="חלק ' + (k + 1) + '">' + tileSvg(g.order[k], L) + '</div>';
    b.innerHTML = h;
    $('pz-mv').textContent = g.moves;
    var bs = $('pz-lvls').querySelectorAll('button'), x;
    for (x = 0; x < bs.length; x++) bs[x].setAttribute('aria-pressed', String(+bs[x].getAttribute('data-l') === st.lvl));
    var ps = $('pz-pics').querySelectorAll('button');
    for (x = 0; x < ps.length; x++) ps[x].setAttribute('aria-pressed', String(+ps[x].getAttribute('data-p') === st.pic));
    var b0 = st.best[st.lvl + '-' + st.pic];
    $('pz-best').textContent = b0 ? 'שיא: ' + b0 + ' מהלכים' : '';
  }
  function swap(a, b) {
    if (a === b || g.done) return;
    var t = g.order[a]; g.order[a] = g.order[b]; g.order[b] = t; g.moves++; g.sel = -1;
    render();
    if (solved(g.order)) win();
  }
  function win() {
    g.done = true;
    var key = st.lvl + '-' + st.pic, prev = st.best[key], msg = 'הפאזל הושלם ב-' + g.moves + ' מהלכים. חנוכה שמח!';
    if (!prev || g.moves < prev) { st.best[key] = g.moves; save(); if (prev) msg += ' שיא חדש!'; }
    $('pz-wm').textContent = msg; $('pz-win').hidden = false;
    $('pz-board').classList.add('done');
    var nx = $('pz-next'); nx.textContent = 'לציור הבא';
    used('win');
    try { $('pz-win').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
  }

  /* גרירה או נגיעה בשניים */
  var down = -1, moved = false;
  function tileAt(x, y) { var el = document.elementFromPoint(x, y); el = el && el.closest ? el.closest('.pz-t') : null; return el ? +el.getAttribute('data-k') : -1; }
  function onDown(e) {
    var el = e.target.closest ? e.target.closest('.pz-t') : null; if (!el || g.done) return;
    down = +el.getAttribute('data-k'); moved = false;
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
    el.classList.add('drag');
  }
  function onMove(e) { if (down > -1) moved = true; }
  function onUp(e) {
    if (down < 0) return;
    var from = down, to = tileAt(e.clientX, e.clientY); down = -1;
    var els = $('pz-board').children, i; for (i = 0; i < els.length; i++) els[i].classList.remove('drag');
    if (to < 0) return;
    if (to !== from) { swap(from, to); return; }
    if (g.sel < 0) { g.sel = from; render(); } else if (g.sel === from) { g.sel = -1; render(); } else swap(g.sel, from);
  }
  function onKey(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest ? e.target.closest('.pz-t') : null; if (!el || g.done) return;
    e.preventDefault(); var k = +el.getAttribute('data-k');
    if (g.sel < 0) { g.sel = k; render(); var n = $('pz-board').children[k]; if (n) n.focus(); } else if (g.sel === k) { g.sel = -1; render(); } else swap(g.sel, k);
  }

  function init() {
    var b = $('pz-board'); if (!b) return;
    b.addEventListener('pointerdown', onDown); b.addEventListener('pointermove', onMove); b.addEventListener('pointerup', onUp);
    b.addEventListener('pointercancel', function () { down = -1; });
    b.addEventListener('keydown', onKey);
    var ls = $('pz-lvls').querySelectorAll('button'), i;
    for (i = 0; i < ls.length; i++) ls[i].onclick = function () { st.lvl = +this.getAttribute('data-l'); save(); b.classList.remove('done'); newGame(); used('level'); };
    var pb = $('pz-pics');
    for (i = 0; i < PICS.length; i++) {
      var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn btn-line pz-pb'; bt.setAttribute('data-p', i); bt.textContent = PICS[i].n;
      bt.onclick = function () { st.pic = +this.getAttribute('data-p'); save(); b.classList.remove('done'); newGame(); used('pic'); };
      pb.appendChild(bt);
    }
    $('pz-new').onclick = function () { b.classList.remove('done'); newGame(); };
    $('pz-next').onclick = function () { st.pic = (st.pic + 1) % PICS.length; save(); b.classList.remove('done'); newGame(); };
    $('pz-peek').onmousedown = $('pz-peek').ontouchstart = function () { $('pz-ref').hidden = false; };
    $('pz-peek').onmouseup = $('pz-peek').onmouseleave = $('pz-peek').ontouchend = function () { $('pz-ref').hidden = true; };
    $('pz-peek').onclick = function () { used('peek'); };
    $('pz-wa').onclick = function (e) {
      e.preventDefault(); used('wa');
      window.open('https://wa.me/?text=' + encodeURIComponent('פאזל חנוכה אונליין, בחינם ובלי הרשמה: https://hakelim.com/kodesh/chanuka/mischakim/pazel/'), '_blank', 'noopener');
    };
    newGame();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  // הציור המלא להצצה
  window.addEventListener('load', function () { var r = $('pz-ref'); if (r) r.innerHTML = '<svg viewBox="0 0 300 300" aria-label="התמונה השלמה" role="img"><use href="#pz-pic"/></svg>'; });
})();
