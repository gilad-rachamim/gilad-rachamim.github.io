/* משחק הנחש – הכלים של גילעד רחמים */
(function () {
  var cv = document.getElementById('sn-cv'); if (!cv) return;
  var ctx = cv.getContext('2d'), G = 18, S, dir, next, food, score, alive, loop = null, speed, firstUse = true,
      scoreEl = document.getElementById('sn-score'), bestEl = document.getElementById('sn-best'), msg = document.getElementById('sn-msg'),
      goBtn = document.getElementById('sn-go');
  function best() { try { return +localStorage.getItem('snake-best') || 0; } catch (e) { return 0; } }
  function setBest(v) { try { localStorage.setItem('snake-best', v); } catch (e) {} }
  function used(how) { try { window.toolUsed && window.toolUsed('chashiva_snake', { how: how }); } catch (e) {} }
  function size() { var w = Math.min(cv.parentNode.clientWidth || 450, 480); cv.width = cv.height = Math.floor(w / G) * G; draw(); }
  function place() {
    do { food = [Math.floor(Math.random() * G), Math.floor(Math.random() * G)]; }
    while (S.some(function (p) { return p[0] === food[0] && p[1] === food[1]; }));
  }
  function reset() {
    S = [[9, 9], [10, 9], [11, 9]]; dir = [-1, 0]; next = dir; score = 0; speed = 150; alive = true;
    place(); scoreEl.textContent = 0; bestEl.textContent = best(); draw();
  }
  function draw() {
    if (!S) return; var c = cv.width / G, st = getComputedStyle(document.documentElement);
    ctx.fillStyle = '#0b1615'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    for (var y = 0; y < G; y++) for (var x = (y % 2); x < G; x += 2) ctx.fillRect(x * c, y * c, c, c);
    ctx.fillStyle = '#e8483f'; ctx.beginPath(); ctx.arc(food[0] * c + c / 2, food[1] * c + c / 2 + c * .05, c * .38, 0, 7); ctx.fill();
    ctx.fillStyle = '#6cc04a'; ctx.fillRect(food[0] * c + c * .5, food[1] * c + c * .06, c * .14, c * .22);
    S.forEach(function (p, i) {
      ctx.fillStyle = i === 0 ? '#f0cf7a' : (i % 2 ? '#5fbfa6' : '#4fae95');
      var r = c * .18; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(p[0] * c + 1, p[1] * c + 1, c - 2, c - 2, r); else ctx.rect(p[0] * c + 1, p[1] * c + 1, c - 2, c - 2);
      ctx.fill();
    });
  }
  function step() {
    dir = next; var h = [S[0][0] + dir[0], S[0][1] + dir[1]];
    var hit = h[0] < 0 || h[1] < 0 || h[0] >= G || h[1] >= G || S.some(function (p, i) { return i < S.length - 1 && p[0] === h[0] && p[1] === h[1]; });
    if (hit) return die();
    S.unshift(h);
    if (h[0] === food[0] && h[1] === food[1]) {
      score++; scoreEl.textContent = score; place();
      if (speed > 70) { speed -= 4; clearInterval(loop); loop = setInterval(step, speed); }
    } else S.pop();
    draw();
  }
  function die() {
    alive = false; clearInterval(loop); loop = null;
    var b = best(), rec = score > b; if (rec) { setBest(score); bestEl.textContent = score; }
    msg.textContent = (rec && score ? '🏆 שיא חדש: ' : 'הנחש נתקע. אכלתם ') + score + (rec && score ? ' תפוחים!' : ' תפוחים.') + ' לוחצים "לשחק" ומנסים שוב.';
    goBtn.textContent = '▶ לשחק שוב'; used('end');
  }
  function go() {
    if (loop) { clearInterval(loop); loop = null; goBtn.textContent = '▶ להמשיך'; msg.textContent = 'בהפסקה.'; return; }
    if (!alive) reset();
    loop = setInterval(step, speed); goBtn.textContent = '⏸ הפסקה';
    msg.textContent = 'מחליקים על הלוח, לוחצים על החיצים או משתמשים במקשי החיצים.';
    if (firstUse) { used('start'); firstUse = false; }
  }
  function turn(d) {
    if (d[0] === -dir[0] && d[1] === -dir[1]) return; next = d;
    if (!loop && alive) go();
  }
  var K = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  document.addEventListener('keydown', function (e) {
    if (K[e.key] && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); turn(K[e.key]); }
    if (e.key === ' ' && e.target === document.body) { e.preventDefault(); go(); }
  });
  document.querySelectorAll('[data-sn]').forEach(function (b) { b.addEventListener('click', function () { turn(K[b.dataset.sn]); }); });
  var sx = 0, sy = 0;
  cv.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  cv.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  cv.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) { if (!loop) go(); return; }
    turn(Math.abs(dx) > Math.abs(dy) ? [dx > 0 ? 1 : -1, 0] : [0, dy > 0 ? 1 : -1]);
  });
  goBtn.addEventListener('click', go);
  document.addEventListener('visibilitychange', function () { if (document.hidden && loop) go(); });
  window.addEventListener('resize', size);
  reset(); size();
})();
