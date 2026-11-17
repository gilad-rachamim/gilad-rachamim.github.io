/* מחולל מבוכים להדפסה: מבוך חדש בכל לחיצה, עם פתרון */
(function () {
  var box = document.getElementById('mv-svg'); if (!box) return;
  var LV = { kal: [8, 10], benoni: [14, 18], kashe: [22, 28], meatger: [30, 38] }, lv = 'benoni', showSol = false, M = null;
  function gen(w, h) {
    var n = w * h, vis = new Uint8Array(n), walls = [], i;
    for (i = 0; i < n; i++) walls.push([1, 1, 1, 1]); /* למעלה, ימין, למטה, שמאל */
    var st = [0]; vis[0] = 1;
    while (st.length) {
      var c = st[st.length - 1], x = c % w, y = (c - x) / w, nb = [];
      if (y > 0 && !vis[c - w]) nb.push([c - w, 0, 2]);
      if (x < w - 1 && !vis[c + 1]) nb.push([c + 1, 1, 3]);
      if (y < h - 1 && !vis[c + w]) nb.push([c + w, 2, 0]);
      if (x > 0 && !vis[c - 1]) nb.push([c - 1, 3, 1]);
      if (!nb.length) { st.pop(); continue; }
      var p = nb[Math.floor(Math.random() * nb.length)];
      walls[c][p[1]] = 0; walls[p[0]][p[2]] = 0; vis[p[0]] = 1; st.push(p[0]);
    }
    /* פתרון: חיפוש לרוחב מהכניסה ליציאה */
    var prev = new Int32Array(n).fill(-1), q = [0], D = [-w, 1, w, -1]; prev[0] = 0;
    while (q.length) { var u = q.shift(); if (u === n - 1) break; for (var d = 0; d < 4; d++) if (!walls[u][d]) { var v = u + D[d]; if (prev[v] < 0) { prev[v] = u; q.push(v); } } }
    var path = [n - 1]; while (path[path.length - 1] !== 0) path.push(prev[path[path.length - 1]]);
    return { w: w, h: h, walls: walls, path: path.reverse() };
  }
  function draw() {
    var w = M.w, h = M.h, s = 20, pad = 26, W = w * s + pad * 2, H = h * s + pad * 2, d = '', x, y, c;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      c = M.walls[y * w + x]; var X = pad + x * s, Y = pad + y * s;
      if (c[0] && !(x === 0 && y === 0)) d += 'M' + X + ' ' + Y + 'h' + s;
      if (c[3]) d += 'M' + X + ' ' + Y + 'v' + s;
      if (x === w - 1 && c[1]) d += 'M' + (X + s) + ' ' + Y + 'v' + s;
      if (y === h - 1 && c[2] && !(x === w - 1)) d += 'M' + X + ' ' + (Y + s) + 'h' + s;
    }
    var sol = '';
    if (showSol) { sol = '<polyline fill="none" stroke="#d33" stroke-width="' + (s * .22) + '" stroke-linecap="round" stroke-linejoin="round" points="' + (pad + s / 2) + ',' + (pad - 8) + ' ' + M.path.map(function (i) { return (pad + (i % w) * s + s / 2) + ',' + (pad + Math.floor(i / w) * s + s / 2); }).join(' ') + ' ' + (pad + (w - .5) * s) + ',' + (pad + h * s + 8) + '"/>'; }
    box.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="מבוך להדפסה">' + sol +
      '<path d="' + d + '" fill="none" stroke="#000" stroke-width="' + (s > 18 ? 2.2 : 2) + '" stroke-linecap="square"/>' +
      '<text x="' + (pad + s / 2) + '" y="' + (pad - 9) + '" text-anchor="middle" font-size="13" font-weight="700">▼</text>' +
      '<text x="' + (pad + (w - .5) * s) + '" y="' + (pad + h * s + 19) + '" text-anchor="middle" font-size="13" font-weight="700">▼</text></svg>';
  }
  function fresh() { M = gen(LV[lv][0], LV[lv][1]); draw(); }
  [].forEach.call(document.querySelectorAll('#mv-lv button'), function (b) {
    b.addEventListener('click', function () { lv = b.dataset.v; [].forEach.call(document.querySelectorAll('#mv-lv button'), function (o) { o.setAttribute('aria-pressed', o === b); }); fresh(); });
  });
  document.getElementById('mv-new').addEventListener('click', fresh);
  document.getElementById('mv-sol').addEventListener('click', function () { showSol = !showSol; this.textContent = showSol ? 'להסתיר את הפתרון' : 'להראות את הפתרון'; draw(); });
  document.getElementById('mv-print').addEventListener('click', function () { window.print(); });
  fresh();
})();
