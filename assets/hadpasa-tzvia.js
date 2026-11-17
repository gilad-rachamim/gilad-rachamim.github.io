/* דפי צביעה להדפסה: ציורים פשוטים לקטנים ומנדלות שנוצרות בכל לחיצה */
(function () {
  var box = document.getElementById('dz-svg'); if (!box) return;
  var S = 'fill="none" stroke="#000" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
  function rays(cx, cy, r1, r2, n) { var o = ''; for (var i = 0; i < n; i++) { var a = i * 2 * Math.PI / n, b = a + Math.PI / n; o += '<path d="M' + (cx + r1 * Math.cos(a - .12)) + ' ' + (cy + r1 * Math.sin(a - .12)) + 'L' + (cx + r2 * Math.cos(a)) + ' ' + (cy + r2 * Math.sin(a)) + 'L' + (cx + r1 * Math.cos(a + .12)) + ' ' + (cy + r1 * Math.sin(a + .12)) + '"/>'; } return o; }
  function petals(cx, cy, d, rx, ry, n) { var o = ''; for (var i = 0; i < n; i++) o += '<ellipse cx="' + cx + '" cy="' + (cy - d) + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + (i * 360 / n) + ' ' + cx + ' ' + cy + ')"/>'; return o; }
  function star(cx, cy, R, r, n) { var p = []; for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : R; p.push((cx + q * Math.cos(a)).toFixed(1) + ',' + (cy + q * Math.sin(a)).toFixed(1)); } return '<polygon points="' + p.join(' ') + '"/>'; }
  var PIC = {
    shemesh: ['☀️', 'שמש', function () { return '<circle cx="200" cy="230" r="80"/>' + rays(200, 230, 100, 165, 12) + '<circle cx="172" cy="212" r="8"/><circle cx="228" cy="212" r="8"/><path d="M165 250q35 34 70 0"/><path d="M40 470q40-30 80 0t80 0 80 0 80 0"/>'; }],
    perach: ['🌸', 'פרח', function () { return petals(200, 180, 78, 36, 56, 8) + '<circle cx="200" cy="180" r="38" fill="#fff"/><path d="M200 300V490"/><path d="M200 400q-70-10-90-70 70 0 90 70zM200 440q70-10 90-70-70 0-90 70z"/><path d="M60 490h280"/>'; }],
    bayit: ['🏠', 'בית', function () { return '<rect x="90" y="250" width="220" height="200"/><path d="M60 250L200 110 340 250z"/><rect x="175" y="350" width="50" height="100"/><circle cx="215" cy="402" r="4"/><rect x="115" y="285" width="50" height="50"/><path d="M140 285v50M115 310h50"/><rect x="235" y="285" width="50" height="50"/><path d="M260 285v50M235 310h50"/><path d="M265 172v-50h30v80"/><path d="M30 450h340"/><circle cx="70" cy="80" r="30"/>'; }],
    dag: ['🐟', 'דג', function () { return '<ellipse cx="185" cy="260" rx="130" ry="80"/><path d="M305 260l70-65v130z"/><circle cx="110" cy="240" r="12"/><circle cx="110" cy="240" r="3"/><path d="M70 282q20 14 40 0"/><path d="M150 205q20 55 0 110M195 190q24 70 0 140M240 205q20 55 0 110"/><path d="M170 182q30-50 70-8"/><circle cx="60" cy="150" r="12"/><circle cx="85" cy="105" r="8"/><circle cx="55" cy="70" r="5"/><path d="M30 440q40-30 80 0t80 0 80 0 80 0"/>'; }],
    lev: ['❤️', 'לב', function () { return '<path d="M200 430C60 320 40 210 80 150c40-58 110-40 120 20 10-60 80-78 120-20 40 60 20 170-120 280z"/><path d="M200 340c-56-44-70-90-52-118 16-24 46-18 52 10 6-28 36-34 52-10 18 28 4 74-52 118z"/>'; }],
    kochav: ['⭐', 'כוכב', function () { return star(200, 250, 170, 70, 5) + star(200, 258, 70, 30, 5) + '<circle cx="70" cy="90" r="14"/><circle cx="335" cy="110" r="10"/><circle cx="330" cy="440" r="14"/><circle cx="60" cy="430" r="10"/>'; }],
    parpar: ['🦋', 'פרפר', function () { return '<ellipse cx="200" cy="260" rx="16" ry="90"/><circle cx="200" cy="155" r="20"/><path d="M190 138q-20-50-50-50M210 138q20-50 50-50"/><path d="M186 200C90 80 20 150 60 230c14 28 70 40 126 20zM214 200c96-120 166-50 126 30-14 28-70 40-126 20zM186 270c-90-10-130 60-90 110 30 36 80 10 90-50zM214 270c90-10 130 60 90 110-30 36-80 10-90-50z"/><circle cx="110" cy="190" r="22"/><circle cx="290" cy="190" r="22"/><circle cx="130" cy="330" r="16"/><circle cx="270" cy="330" r="16"/>'; }],
    sira: ['⛵', 'סירה', function () { return '<path d="M60 340h280l-50 80H110z"/><path d="M200 340V90"/><path d="M200 100l110 200H200zM190 140L100 300h90z"/><path d="M200 90l40 14-40 14"/><path d="M20 440q40-30 80 0t80 0 80 0 80 0 40 0M20 480q40-30 80 0t80 0 80 0 80 0 40 0"/><circle cx="330" cy="80" r="34"/>'; }],
    etz: ['🌳', 'עץ', function () { return '<path d="M175 480V330h50v150z"/><circle cx="200" cy="200" r="90"/><circle cx="120" cy="260" r="70"/><circle cx="280" cy="260" r="70"/><circle cx="170" cy="190" r="12"/><circle cx="245" cy="230" r="12"/><circle cx="130" cy="270" r="12"/><circle cx="270" cy="290" r="12"/><circle cx="205" cy="270" r="12"/><path d="M40 480h320"/>'; }],
    balon: ['🎈', 'בלונים', function () { return '<ellipse cx="130" cy="170" rx="62" ry="78"/><path d="M122 248l-8 16h32l-8-16"/><ellipse cx="270" cy="150" rx="62" ry="78"/><path d="M262 228l-8 16h32l-8-16"/><ellipse cx="200" cy="270" rx="56" ry="70"/><path d="M193 340l-7 14h28l-7-14"/><path d="M130 264q10 100 70 220M270 244q-10 120-70 240M200 354v130"/>'; }]
  };
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function mandala(detail) {
    var c = 200, o = '', n = [6, 8, 8, 10, 12][Math.floor(Math.random() * 5)], rings = detail === 1 ? 3 : detail === 2 ? 5 : 7, R = 188, step = (R - 26) / rings;
    if (detail === 1) n = Math.min(n, 8);
    o += '<circle cx="' + c + '" cy="' + c + '" r="' + R + '"/><circle cx="' + c + '" cy="' + c + '" r="24"/>';
    for (var i = 0; i < rings; i++) {
      var r0 = 26 + i * step, r1 = r0 + step, mid = (r0 + r1) / 2, t = Math.floor(Math.random() * 4), k, a;
      if (t === 0) o += petals(c, c, mid, Math.max(6, mid * Math.sin(Math.PI / n) * rnd(.55, .9)), step / 2, n);
      else if (t === 1) { for (k = 0; k < n; k++) { a = k * 2 * Math.PI / n; o += '<circle cx="' + (c + mid * Math.cos(a)) + '" cy="' + (c + mid * Math.sin(a)) + '" r="' + Math.min(step / 2, mid * Math.sin(Math.PI / n) * .9) + '"/>'; } }
      else if (t === 2) { var p = []; for (k = 0; k < n * 2; k++) { a = k * Math.PI / n; var q = k % 2 ? r0 : r1; p.push((c + q * Math.cos(a)).toFixed(1) + ',' + (c + q * Math.sin(a)).toFixed(1)); } o += '<polygon points="' + p.join(' ') + '"/>'; }
      else { for (k = 0; k < n; k++) { a = k * 2 * Math.PI / n; var b = a + 2 * Math.PI / n, m = a + Math.PI / n; o += '<path d="M' + (c + r0 * Math.cos(a)) + ' ' + (c + r0 * Math.sin(a)) + 'Q' + (c + r1 * 1.12 * Math.cos(m)) + ' ' + (c + r1 * 1.12 * Math.sin(m)) + ' ' + (c + r0 * Math.cos(b)) + ' ' + (c + r0 * Math.sin(b)) + '"/>'; } }
      if (i < rings - 1 && Math.random() < .5) o += '<circle cx="' + c + '" cy="' + c + '" r="' + r1 + '"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="מנדלה לצביעה"><g fill="none" stroke="#000" stroke-width="' + (detail === 1 ? 3 : 2) + '" stroke-linejoin="round">' + o + '</g></svg>';
  }
  var cur = 'shemesh', det = 2, pick = document.getElementById('dz-pick'), ttl = document.getElementById('dz-ttl');
  Object.keys(PIC).forEach(function (k) { var b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.innerHTML = PIC[k][0] + '<span>' + PIC[k][1] + '</span>'; pick.appendChild(b); });
  var mb = document.createElement('button'); mb.type = 'button'; mb.dataset.k = 'mandala'; mb.innerHTML = '🌀<span>מנדלה</span>'; pick.appendChild(mb);
  function draw() {
    [].forEach.call(pick.children, function (b) { b.setAttribute('aria-pressed', b.dataset.k === cur); });
    document.getElementById('dz-mrow').hidden = cur !== 'mandala';
    if (cur === 'mandala') { box.innerHTML = mandala(det); ttl.textContent = 'מנדלה לצביעה'; }
    else { box.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" role="img" aria-label="דף צביעה: ' + PIC[cur][1] + '"><g ' + S + '>' + PIC[cur][2]() + '</g></svg>'; ttl.textContent = PIC[cur][1]; }
  }
  pick.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { cur = b.dataset.k; draw(); } });
  [].forEach.call(document.querySelectorAll('#dz-det button'), function (b) { b.addEventListener('click', function () { det = +b.dataset.v; [].forEach.call(document.querySelectorAll('#dz-det button'), function (o) { o.setAttribute('aria-pressed', o === b); }); draw(); }); });
  document.getElementById('dz-new').addEventListener('click', draw);
  document.getElementById('dz-print').addEventListener('click', function () { window.print(); });
  draw();
})();
