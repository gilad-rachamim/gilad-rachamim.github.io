/* שולה המוקשים – הכלים של גילעד רחמים */
(function () {
  var app = document.getElementById('mk'); if (!app) return;
  var boardEl = document.getElementById('mk-board'), msg = document.getElementById('mk-msg'),
      leftEl = document.getElementById('mk-left'), timeEl = document.getElementById('mk-time'),
      flagBtn = document.getElementById('mk-flag'), bestEl = document.getElementById('mk-best');
  var LV = { kal: [9, 9, 10], beinoni: [12, 12, 24], kashe: [14, 14, 40] };
  var lv = 'kal', W, H, N, cells, opened, flags, over, started, flagMode = false, t0 = 0, tick = null, firstUse = true;
  function load() { try { return JSON.parse(localStorage.getItem('mokshim-best') || '{}'); } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem('mokshim-best', JSON.stringify(o)); } catch (e) {} }
  function used(how) { try { window.toolUsed && window.toolUsed('chashiva_mokshim', { how: how }); } catch (e) {} }
  function showBest() { var b = load()[lv]; bestEl.textContent = b ? 'השיא שלכם ברמה הזאת: ' + b + ' שניות' : ''; }
  function start(l) {
    lv = l || lv; var c = LV[lv]; W = c[0]; H = c[1]; N = c[2];
    cells = []; opened = 0; flags = 0; over = false; started = false; clearInterval(tick); timeEl.textContent = '0';
    boardEl.style.setProperty('--w', W); boardEl.innerHTML = '';
    for (var i = 0; i < W * H; i++) {
      cells.push({ m: false, n: 0, o: false, f: false });
      var b = document.createElement('button'); b.type = 'button'; b.className = 'mk-c'; b.dataset.i = i;
      b.setAttribute('aria-label', 'משבצת ' + (i + 1)); boardEl.appendChild(b);
    }
    leftEl.textContent = N; msg.textContent = 'לוחצים על משבצת כדי להתחיל. הלחיצה הראשונה תמיד בטוחה.'; msg.className = 'mk-msg';
    showBest();
    document.querySelectorAll('#mk-lv button').forEach(function (x) { x.setAttribute('aria-selected', x.dataset.lv === lv); });
  }
  function nb(i) {
    var x = i % W, y = (i / W) | 0, r = [];
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; var X = x + dx, Y = y + dy;
      if (X >= 0 && X < W && Y >= 0 && Y < H) r.push(Y * W + X);
    }
    return r;
  }
  function plant(safe) {
    var no = nb(safe).concat(safe), placed = 0;
    while (placed < N) { var k = Math.floor(Math.random() * W * H); if (cells[k].m || no.indexOf(k) >= 0) continue; cells[k].m = true; placed++; }
    cells.forEach(function (c, i) { c.n = nb(i).filter(function (j) { return cells[j].m; }).length; });
  }
  function el(i) { return boardEl.children[i]; }
  function paint(i) {
    var c = cells[i], b = el(i);
    b.className = 'mk-c' + (c.o ? ' o' : '') + (c.f ? ' f' : '') + (c.o && c.m ? ' boom' : '') + (c.o && c.n ? ' n' + c.n : '');
    b.textContent = c.f && !c.o ? '🚩' : c.o ? (c.m ? '💣' : c.n || '') : '';
  }
  function open(i) {
    var st = [i];
    while (st.length) {
      var k = st.pop(), c = cells[k]; if (c.o || c.f) continue;
      c.o = true; opened++; paint(k);
      if (!c.m && c.n === 0) nb(k).forEach(function (j) { if (!cells[j].o) st.push(j); });
    }
  }
  function end(win) {
    over = true; clearInterval(tick);
    var sec = Math.round((Date.now() - t0) / 1000);
    cells.forEach(function (c, i) { if (c.m && !win) { c.o = true; paint(i); } if (c.m && win && !c.f) { c.f = true; paint(i); } });
    if (win) {
      var b = load(), best = !b[lv] || sec < b[lv]; if (best) { b[lv] = sec; save(b); }
      msg.textContent = '🎉 ניקיתם את כל השדה ב-' + sec + ' שניות!' + (best ? ' שיא חדש!' : ''); msg.className = 'mk-msg win';
      used('win'); showBest();
    } else { msg.textContent = '💥 בום! עליתם על מוקש. "משחק חדש" ומנסים שוב.'; msg.className = 'mk-msg lose'; used('lose'); }
  }
  function act(i, flag) {
    if (over) return; var c = cells[i];
    if (!started) {
      if (flag) return; started = true; plant(i); t0 = Date.now();
      tick = setInterval(function () { timeEl.textContent = Math.round((Date.now() - t0) / 1000); }, 1000);
      if (firstUse) { used('start'); firstUse = false; }
      msg.textContent = 'המספר אומר כמה מוקשים נוגעים במשבצת. 🚩 מסמן מוקש.';
    }
    if (flag) { if (c.o) return; c.f = !c.f; flags += c.f ? 1 : -1; leftEl.textContent = N - flags; paint(i); return; }
    if (c.f) return;
    if (c.o) { // לחיצה על מספר פתוח: פותחת את השכנים כשמספר הדגלים מתאים
      var ns = nb(i), fl = ns.filter(function (j) { return cells[j].f; }).length;
      if (c.n && fl === c.n) ns.forEach(function (j) { if (!over && !cells[j].o && !cells[j].f) { open(j); if (cells[j].m) end(false); } });
    } else { open(i); if (c.m) return end(false); }
    if (!over && opened === W * H - N) end(true);
  }
  var press = null, longDone = false;
  boardEl.addEventListener('pointerdown', function (e) {
    var b = e.target.closest('.mk-c'); if (!b) return; longDone = false;
    press = setTimeout(function () { longDone = true; act(+b.dataset.i, true); if (navigator.vibrate) navigator.vibrate(30); }, 450);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { boardEl.addEventListener(ev, function () { clearTimeout(press); }); });
  boardEl.addEventListener('click', function (e) {
    var b = e.target.closest('.mk-c'); if (!b || longDone) return; act(+b.dataset.i, flagMode);
  });
  boardEl.addEventListener('contextmenu', function (e) { var b = e.target.closest('.mk-c'); if (!b) return; e.preventDefault(); if (!longDone) act(+b.dataset.i, true); });
  flagBtn.addEventListener('click', function () { flagMode = !flagMode; flagBtn.setAttribute('aria-pressed', flagMode); flagBtn.textContent = flagMode ? '🚩 מצב דגל: פועל' : '🚩 מצב דגל: כבוי'; });
  document.getElementById('mk-new').addEventListener('click', function () { start(); });
  document.querySelectorAll('#mk-lv button').forEach(function (x) { x.addEventListener('click', function () { start(x.dataset.lv); }); });
  start('kal');
})();
