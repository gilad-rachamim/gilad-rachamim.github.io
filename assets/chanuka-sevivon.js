/* סביבון דיגיטלי לחנוכה – מסתובב בטלפון, בלי שרת, עובד גם בלי אינטרנט. */
(function () {
  'use strict';
  var KEY = 'chanuka_sevivon_v1';
  function $(id) { return document.getElementById(id); }
  function used(how) { try { if (window.toolUsed) window.toolUsed('chanuka_sevivon', { how: how }); } catch (e) {} }
  function rnd(n) {
    try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } catch (e) { return Math.floor(Math.random() * n); }
  }

  var st = { abroad: false, game: null, last: null };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && typeof sv === 'object') { st.abroad = !!sv.abroad; st.game = sv.game || null; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ abroad: st.abroad, game: st.game })); } catch (e) {} }

  function letters() { return ['נ', 'ג', 'ה', st.abroad ? 'ש' : 'פ']; }
  var WORDS = function () { return ['נס', 'גדול', 'היה', st.abroad ? 'שם' : 'פה']; };

  /* ---------- הציור: מנסרה מרובעת שמסתובבת (שני פאות נראות) ---------- */
  var W = 120, CX = 150, TOP = 92, H = 104;
  var faceA, faceB, txtA, txtB, tip, tipB, handle, cap, top, svgEl;
  function draw(angle, tilt) {
    var a = ((angle % 360) + 360) % 360, idx = Math.floor(a / 90), phi = (a - idx * 90) * Math.PI / 180;
    var wa = W * Math.cos(phi), wb = W * Math.sin(phi), tot = wa + wb, x0 = CX - tot / 2;
    var L = letters();
    // פאה A (נכנסת שמאלה) ופאה B (יוצאת מימין) – בעברית הסיבוב קדימה
    faceA.setAttribute('x', x0 + wb); faceA.setAttribute('width', Math.max(0.01, wa));
    faceB.setAttribute('x', x0); faceB.setAttribute('width', Math.max(0.01, wb));
    txtA.textContent = L[idx]; txtB.textContent = L[(idx + 1) % 4];
    txtA.setAttribute('transform', 'translate(' + (x0 + wb + wa / 2) + ' ' + (TOP + H / 2 + 26) + ') scale(' + Math.max(0.01, wa / W) + ' 1)');
    txtB.setAttribute('transform', 'translate(' + (x0 + wb / 2) + ' ' + (TOP + H / 2 + 26) + ') scale(' + Math.max(0.01, wb / W) + ' 1)');
    faceA.setAttribute('fill', shade(Math.cos(phi)));
    faceB.setAttribute('fill', shade(Math.sin(phi) * 0.85));
    var bot = TOP + H;
    tip.setAttribute('d', 'M' + (x0 + wb) + ' ' + bot + ' L' + (x0 + tot) + ' ' + bot + ' L' + CX + ' ' + (bot + 62) + ' Z');
    tipB.setAttribute('d', 'M' + x0 + ' ' + bot + ' L' + (x0 + wb) + ' ' + bot + ' L' + CX + ' ' + (bot + 62) + ' Z');
    top.setAttribute('d', 'M' + x0 + ' ' + TOP + ' L' + (x0 + tot) + ' ' + TOP + ' L' + (x0 + tot - 10) + ' ' + (TOP - 12) + ' L' + (x0 + 10) + ' ' + (TOP - 12) + ' Z');
    svgEl.style.transform = 'rotate(' + (tilt || 0).toFixed(2) + 'deg)';
  }
  function shade(k) { var l = Math.round(40 + 22 * k); return 'hsl(40,62%,' + l + '%)'; }

  function buildTop() {
    var box = $('sv-top');
    box.innerHTML = '<svg viewBox="0 0 300 280" id="sv-svg" aria-hidden="true">' +
      '<defs><linearGradient id="svh" x1="0" x2="1"><stop offset="0" stop-color="#7a5c1e"/><stop offset=".5" stop-color="#f1d48a"/><stop offset="1" stop-color="#7a5c1e"/></linearGradient></defs>' +
      '<ellipse cx="150" cy="268" rx="46" ry="7" fill="rgba(0,0,0,.35)"/>' +
      '<rect x="140" y="22" width="20" height="60" rx="6" fill="url(#svh)"/>' +
      '<path id="sv-tp" fill="#f1d48a"/>' +
      '<rect id="sv-fb" y="' + TOP + '" height="' + H + '" stroke="#3b2a0b" stroke-width="2"/>' +
      '<rect id="sv-fa" y="' + TOP + '" height="' + H + '" stroke="#3b2a0b" stroke-width="2"/>' +
      '<text id="sv-tb" text-anchor="middle" font-size="80" font-weight="800" fill="#fff8e6" font-family="Frank Ruhl Libre, David, serif"></text>' +
      '<text id="sv-ta" text-anchor="middle" font-size="80" font-weight="800" fill="#fff8e6" font-family="Frank Ruhl Libre, David, serif"></text>' +
      '<path id="sv-tib" fill="#8a6a26" stroke="#3b2a0b" stroke-width="2"/>' +
      '<path id="sv-ti" fill="#b48a3c" stroke="#3b2a0b" stroke-width="2"/>' +
      '</svg>';
    svgEl = $('sv-svg'); faceA = $('sv-fa'); faceB = $('sv-fb'); txtA = $('sv-ta'); txtB = $('sv-tb'); tip = $('sv-ti'); tipB = $('sv-tib'); top = $('sv-tp');
  }

  /* ---------- סיבוב ---------- */
  var angle = 0, busy = false;
  function spin() {
    if (busy) return;
    if (st.game && st.game.over) return;
    busy = true;
    $('sv-spin').disabled = true;
    $('sv-res').classList.remove('on');
    $('sv-res').innerHTML = '&nbsp;';
    var res = rnd(4), start = angle % 360, turns = 5 + rnd(3);
    var end = turns * 360 + res * 90 + 4; // עוצר קצת אחרי האמצע של הפאה, כמו סביבון אמיתי שנופל
    var dur = 2600 + rnd(900), t0 = null, wob = (rnd(2) ? 1 : -1);
    function ease(t) { return 1 - Math.pow(1 - t, 3.2); }
    function step(ts) {
      if (t0 === null) t0 = ts;
      var t = Math.min(1, (ts - t0) / dur), e = ease(t);
      angle = start + (end - start) * e;
      var tilt = wob * (3 + 9 * t * t) * Math.sin(ts / 70) * (t < 0.9 ? 1 : (1 - t) * 10) + wob * 14 * Math.max(0, (t - 0.86) / 0.14);
      draw(angle, tilt);
      if (t < 1) requestAnimationFrame(step); else { angle = res * 90 + 4; done(res); }
    }
    requestAnimationFrame(step);
    used(st.game ? 'spin_game' : 'spin');
  }

  function done(res) {
    busy = false;
    var L = letters()[res], w = WORDS()[res];
    try { if (navigator.vibrate) navigator.vibrate(35); } catch (e) {}
    var line = '<b>' + L + '</b> – ' + w;
    if (st.game) line += '<br><span>' + applyRule(res) + '</span>';
    else line += '<br><span>' + ['לא קורה כלום', 'לוקחים את כל הקופה', 'לוקחים חצי מהקופה', 'מוסיפים אחד לקופה'][res] + '</span>';
    $('sv-res').innerHTML = line;
    $('sv-res').classList.add('on');
    $('sv-spin').disabled = !!(st.game && st.game.over);
    renderGame();
  }

  /* ---------- משחק משפחתי ---------- */
  function active(g) { return g.players.filter(function (p) { return !p.out; }); }
  function ante(g) {
    var note = [];
    g.players.forEach(function (p) {
      if (p.out) return;
      if (p.coins > 0) { p.coins--; g.pot++; } else { p.out = true; note.push(p.name); }
    });
    return note.length ? ' ' + note.join(', ') + ' ' + (note.length > 1 ? 'יצאו' : 'יצא/ה') + ' מהמשחק.' : '';
  }
  function nextTurn(g) {
    var n = g.players.length, k;
    for (k = 1; k <= n; k++) { var i = (g.turn + k) % n; if (!g.players[i].out) { g.turn = i; return; } }
  }
  function checkEnd(g) {
    var a = active(g);
    if (a.length <= 1) { g.over = true; if (a[0]) { a[0].coins += g.pot; g.pot = 0; } return true; }
    return false;
  }
  function applyRule(res) {
    var g = st.game, p = g.players[g.turn], msg = '', got;
    if (res === 0) msg = p.name + ': נ – לא קורה כלום.';
    else if (res === 1) { got = g.pot; p.coins += got; g.pot = 0; msg = p.name + ' לוקח/ת את כל הקופה! (' + got + ')'; }
    else if (res === 2) { got = Math.ceil(g.pot / 2); p.coins += got; g.pot -= got; msg = p.name + ' לוקח/ת חצי: ' + got + '.'; }
    else {
      if (p.coins > 0) { p.coins--; g.pot++; msg = p.name + ' מוסיף/ה אחד לקופה.'; }
      else { p.out = true; msg = p.name + ' צריך/ה לשלם ואין לו/ה, ולכן יוצא/ת מהמשחק.'; }
    }
    if (!checkEnd(g) && g.pot <= 1) msg += ' הקופה כמעט ריקה: כל אחד שם אחד.' + ante(g);
    if (!checkEnd(g)) nextTurn(g);
    else { var w = active(g)[0]; msg += w ? ' 🏆 ' + w.name + ' ניצח/ה עם ' + w.coins + '!' : ''; used('game_over'); }
    save();
    return msg;
  }
  function renderGame() {
    var g = st.game, box = $('sv-board');
    $('sv-setup').hidden = !!g;
    box.hidden = !g;
    if (!g) { $('sv-spin').textContent = 'לסובב!'; return; }
    var cur = g.players[g.turn], h = '<p class="sv-pot">בקופה: <b>' + g.pot + '</b> ' + g.unit + '</p><ul class="sv-pl">';
    g.players.forEach(function (p, i) {
      h += '<li class="' + (p.out ? 'out' : '') + (i === g.turn && !g.over ? ' now' : '') + '"><span></span><b>' + p.coins + '</b></li>';
    });
    box.querySelector('.sv-g').innerHTML = h + '</ul>';
    var lis = box.querySelectorAll('.sv-pl li span');
    g.players.forEach(function (p, i) { lis[i].textContent = (i === g.turn && !g.over ? '👉 ' : '') + p.name + (p.out ? ' (יצא/ה)' : ''); });
    $('sv-spin').textContent = g.over ? 'המשחק נגמר' : 'תור ' + cur.name + ': לסובב!';
    $('sv-spin').disabled = busy || !!g.over;
  }
  function startGame() {
    var names = [].map.call(document.querySelectorAll('.sv-nm'), function (i) { return i.value.trim(); }).filter(Boolean);
    if (names.length < 2) { $('sv-err').textContent = 'צריך לפחות שני שחקנים'; return; }
    var coins = Math.max(2, Math.min(100, parseInt($('sv-coins').value, 10) || 10));
    var g = { players: names.map(function (n) { return { name: n.slice(0, 20), coins: coins, out: false }; }), pot: 0, turn: 0, over: false, unit: $('sv-unit').value };
    ante(g);
    st.game = g; save();
    $('sv-err').textContent = '';
    $('sv-res').innerHTML = 'כל אחד שם אחד בקופה. ' + g.players[0].name + ' מתחיל/ה.';
    $('sv-res').classList.add('on');
    renderGame(); used('game_start');
    $('sv-top').scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function endGame() {
    if (st.game && !st.game.over && !confirm('לסיים את המשחק?')) return;
    st.game = null; save(); $('sv-res').innerHTML = '&nbsp;'; $('sv-res').classList.remove('on'); renderGame(); used('game_end');
  }
  function addRow(v) {
    var list = $('sv-names');
    if (list.children.length >= 8) return;
    var i = document.createElement('input');
    i.className = 'sv-nm'; i.type = 'text'; i.maxLength = 20; i.placeholder = 'שם שחקן ' + (list.children.length + 1); i.value = v || '';
    list.appendChild(i);
  }

  function setAbroad(v) {
    st.abroad = v; save();
    var ls = document.querySelectorAll('.sv-p'), k;
    for (k = 0; k < ls.length; k++) ls[k].textContent = v ? 'ש' : 'פ';
    var ws = document.querySelectorAll('.sv-pw'); for (k = 0; k < ws.length; k++) ws[k].textContent = v ? 'שם' : 'פה';
    draw(angle, 0);
  }

  function init() {
    if (!$('sv-top')) return;
    buildTop();
    angle = 4; draw(angle, 0);
    $('sv-spin').onclick = spin;
    $('sv-top').onclick = spin;
    $('sv-ab').checked = st.abroad; setAbroad(st.abroad);
    $('sv-ab').onchange = function () { setAbroad(this.checked); used('abroad'); };
    ['אבא', 'אמא', 'ילד/ה'].forEach(function (n) { addRow(n); });
    $('sv-add').onclick = function () { addRow(); };
    $('sv-start').onclick = startGame;
    $('sv-end').onclick = endGame;
    renderGame();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
