/* סוליטר קלאסי (קלונדייק) – הכלים של גילעד רחמים. לחיצה אחת על קלף מזיזה אותו למקום הכי טוב */
(function () {
  var app = document.getElementById('sl'); if (!app) return;
  var SU = ['♠', '♥', '♦', '♣'], RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var st, hist = [], moves = 0, t0 = 0, tick = null, won = false, firstUse = true;
  var $ = function (id) { return document.getElementById(id); };
  var msg = $('sl-msg'), timeEl = $('sl-time'), movesEl = $('sl-moves');
  function used(how) { try { window.toolUsed && window.toolUsed('chashiva_solitaire', { how: how }); } catch (e) {} }
  function red(c) { return c.s === 1 || c.s === 2; }
  function deal() {
    var d = [];
    for (var s = 0; s < 4; s++) for (var r = 1; r <= 13; r++) d.push({ s: s, r: r, up: false });
    for (var i = d.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = d[i]; d[i] = d[j]; d[j] = t; }
    st = { stock: [], waste: [], f: [[], [], [], []], t: [[], [], [], [], [], [], []] };
    for (var c = 0; c < 7; c++) for (var k = 0; k <= c; k++) { var card = d.pop(); card.up = k === c; st.t[c].push(card); }
    st.stock = d; hist = []; moves = 0; won = false; t0 = 0; clearInterval(tick); timeEl.textContent = '0:00'; movesEl.textContent = 0;
    msg.textContent = 'לוחצים על קלף, והוא עובר לבד למקום המתאים. לוחצים על החפיסה כדי לפתוח קלף.'; msg.className = 'sl-msg';
    render();
  }
  function snap() { hist.push(JSON.stringify(st)); if (hist.length > 200) hist.shift(); }
  function began() {
    if (t0) return; t0 = Date.now();
    tick = setInterval(function () { var s = Math.round((Date.now() - t0) / 1000); timeEl.textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }, 1000);
    if (firstUse) { used('start'); firstUse = false; }
  }
  function top(a) { return a[a.length - 1]; }
  function canF(c, f) { var t = top(f); return t ? (t.s === c.s && c.r === t.r + 1) : c.r === 1; }
  function canT(c, col) { var t = top(col); return t ? (t.up && red(t) !== red(c) && c.r === t.r - 1) : c.r === 13; }
  function flipTops() { st.t.forEach(function (col) { var t = top(col); if (t && !t.up) t.up = true; }); }
  function done() { moves++; movesEl.textContent = moves; flipTops(); render(); check(); }
  function tryMove(src, idx) { // src: 'w' | ['t', c] | ['f', i]
    var from = src === 'w' ? st.waste : st[src[0]][src[1]], run = from.slice(idx), c = run[0];
    if (!c || !c.up) return false;
    if (run.length === 1 && src[0] !== 'f') for (var i = 0; i < 4; i++) if (canF(c, st.f[i])) { snap(); from.pop(); st.f[i].push(c); return true; }
    var order = [];
    for (var k = 0; k < 7; k++) if (!(src[0] === 't' && src[1] === k)) order.push(k);
    order.sort(function (a, b) { return (st.t[a].length ? 0 : 1) - (st.t[b].length ? 0 : 1); }); // עמודה מלאה לפני ריקה
    for (var n = 0; n < order.length; n++) {
      var col = st.t[order[n]];
      if (canT(c, col)) {
        if (c.r === 13 && !col.length && src[0] === 't' && idx === 0) continue; // מלך שכבר בתחתית עמודה – לא להזיז סתם
        snap(); from.splice(idx); Array.prototype.push.apply(col, run); return true;
      }
    }
    return false;
  }
  function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  function cardHTML(c, attrs) {
    if (!c.up) return '<div class="sl-card back" ' + (attrs || '') + '></div>';
    return '<button type="button" class="sl-card' + (red(c) ? ' red' : '') + '" ' + (attrs || '') + ' aria-label="' + RK[c.r] + ' ' + SU[c.s] + '">' +
      '<b>' + RK[c.r] + '</b><i>' + SU[c.s] + '</i><em>' + SU[c.s] + '</em></button>';
  }
  function render() {
    var s = st.stock.length ? '<button type="button" class="sl-card back" data-a="stock" aria-label="חפיסה: לפתוח קלף"><span>' + st.stock.length + '</span></button>'
      : '<button type="button" class="sl-slot" data-a="stock" aria-label="להחזיר את הקלפים לחפיסה">↻</button>';
    var w = st.waste.length ? cardHTML(top(st.waste), 'data-a="w"') : '<div class="sl-slot"></div>';
    $('sl-stock').innerHTML = s; $('sl-waste').innerHTML = w;
    $('sl-found').innerHTML = st.f.map(function (f, i) {
      return f.length ? cardHTML(top(f), 'data-a="f" data-c="' + i + '"') : '<div class="sl-slot">' + SU[i] + '</div>';
    }).join('');
    $('sl-tab').innerHTML = st.t.map(function (col, c) {
      return '<div class="sl-col" data-col="' + c + '">' + (col.length ? col.map(function (card, k) {
        return cardHTML(card, 'data-a="t" data-c="' + c + '" data-k="' + k + '"');
      }).join('') : '<div class="sl-slot">K</div>') + '</div>';
    }).join('');
    $('sl-undo').disabled = !hist.length;
    var auto = !st.stock.length && !st.waste.length && st.t.every(function (col) { return col.every(function (c) { return c.up; }); });
    $('sl-auto').hidden = !auto || won;
  }
  function check() {
    var n = st.f.reduce(function (a, f) { return a + f.length; }, 0);
    if (n === 52 && !won) {
      won = true; clearInterval(tick); var sec = Math.round((Date.now() - t0) / 1000), best = 0;
      try { best = +localStorage.getItem('solitaire-best') || 0; if (!best || sec < best) localStorage.setItem('solitaire-best', sec); } catch (e) {}
      var rec = !best || sec < best;
      msg.textContent = '🎉 ניצחתם! ' + moves + ' מהלכים ב-' + timeEl.textContent + ' דקות.' + (rec ? ' שיא חדש!' : ''); msg.className = 'sl-msg win';
      used('win'); render(); showBest();
    }
  }
  function showBest() { try { var b = +localStorage.getItem('solitaire-best'); $('sl-best').textContent = b ? 'השיא שלכם: ' + Math.floor(b / 60) + ':' + ('0' + b % 60).slice(-2) + ' דקות' : ''; } catch (e) {} }
  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-a]'); if (!el || won) return; var a = el.dataset.a;
    if (a === 'stock') {
      began(); snap();
      if (st.stock.length) { var c = st.stock.pop(); c.up = true; st.waste.push(c); }
      else if (st.waste.length) { st.stock = st.waste.reverse().map(function (c) { c.up = false; return c; }); st.waste = []; }
      else { hist.pop(); return; }
      done(); return;
    }
    var ok = false;
    if (a === 'w') ok = tryMove('w', st.waste.length - 1);
    else if (a === 'f') ok = tryMove(['f', +el.dataset.c], st.f[+el.dataset.c].length - 1);
    else if (a === 't') ok = tryMove(['t', +el.dataset.c], +el.dataset.k);
    if (ok) { began(); done(); } else shake(el);
  });
  $('sl-undo').addEventListener('click', function () { if (!hist.length || won) return; st = JSON.parse(hist.pop()); render(); });
  $('sl-new').addEventListener('click', deal);
  $('sl-auto').addEventListener('click', function () {
    var guard = 0;
    (function stepAuto() {
      for (var c = 0; c < 7; c++) { var col = st.t[c], t = top(col); if (!t) continue;
        for (var i = 0; i < 4; i++) if (canF(t, st.f[i])) { col.pop(); st.f[i].push(t); moves++; movesEl.textContent = moves; render(); check(); if (!won && guard++ < 60) setTimeout(stepAuto, 70); return; } }
    })();
  });
  deal(); showBest();
})();
