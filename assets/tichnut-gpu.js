// השוואת כרטיסי NVIDIA: סינון לפי משפחה, VRAM ו-Compute Capability, ובחירה של עד 3 כרטיסים להשוואה צד לצד.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_gpu', $ = function (id) { return document.getElementById(id); };
  var def = { fam: 'all', min: 0, cc: 0, q: '', sort: 'vram', pick: ['RTX 4090', 'RTX 5090', 'H100 SXM'] };
  var st = T.load(KEY, def);
  var maxBw = Math.max.apply(null, T.gpus.map(function (g) { return g.bw; }));
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function byName(n) { return T.gpus.filter(function (g) { return g.name === n; })[0]; }

  function fill() { $('gp-fam').value = st.fam; $('gp-min').value = String(st.min); $('gp-cc').value = String(st.cc); $('gp-q').value = st.q; $('gp-sort').value = st.sort; }
  function read() { st.fam = $('gp-fam').value; st.min = +$('gp-min').value; st.cc = +$('gp-cc').value; st.q = $('gp-q').value.trim(); st.sort = $('gp-sort').value; }

  function render() {
    var q = st.q.toLowerCase();
    var list = T.gpus.filter(function (g) {
      return (st.fam === 'all' || g.fam === st.fam) && g.vram >= st.min && parseFloat(g.cc) >= st.cc &&
        (!q || (g.name + ' ' + g.arch).toLowerCase().indexOf(q) > -1);
    }).sort(function (a, b) {
      if (st.sort === 'gbw') return b.vram / b.w - a.vram / a.w;
      return b[st.sort] - a[st.sort] || b.vram - a.vram;
    });
    $('gp-count').textContent = list.length + ' כרטיסים';
    $('gp-list').innerHTML = list.map(function (g) {
      var on = st.pick.indexOf(g.name) > -1;
      return '<li' + (on ? ' class="on"' : '') + '><button type="button" data-n="' + esc(g.name) + '" aria-pressed="' + on + '">' + (on ? '★' : '☆') + '</button>' +
        '<div><b>' + esc(g.name) + '</b><small>' + g.arch + ' · ' + g.year + ' · ' + T.fam[g.fam] + '</small>' +
        '<i style="width:' + (g.bw / maxBw * 100).toFixed(1) + '%"></i></div>' +
        '<dl><dt>VRAM</dt><dd>' + g.vram + ' GB</dd><dt>CC</dt><dd>' + g.cc + '</dd><dt>רוחב פס</dt><dd>' + g.bw.toLocaleString('en') + ' GB/s</dd><dt>הספק</dt><dd>' + g.w + ' W</dd></dl></li>';
    }).join('') || '<li class="empty">אין כרטיס שמתאים לכל הסינונים. נסו להוריד אחד מהם.</li>';
    var pk = st.pick.map(byName).filter(Boolean);
    if (pk.length < 2) { $('gp-cmp').innerHTML = '<p class="note">מסמנים ★ ליד שניים או שלושה כרטיסים, וההשוואה מופיעה כאן.</p>'; }
    else {
      var rows = [['ארכיטקטורה', 'arch'], ['Compute Capability', 'cc'], ['VRAM', 'vram', ' GB'], ['רוחב פס', 'bw', ' GB/s'], ['הספק', 'w', ' W'], ['שנה', 'year']];
      $('gp-cmp').innerHTML = '<table><thead><tr><th></th>' + pk.map(function (g) { return '<th>' + esc(g.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) {
          var vals = pk.map(function (g) { return g[r[1]]; }), num = typeof vals[0] === 'number' && r[1] !== 'year' && r[1] !== 'w';
          var best = num ? Math.max.apply(null, vals) : null;
          return '<tr><th>' + r[0] + '</th>' + vals.map(function (v) { return '<td' + (num && v === best ? ' class="best"' : '') + '>' + (typeof v === 'number' && r[1] !== 'year' ? v.toLocaleString('en') : v) + (r[2] || '') + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
    }
    T.wa($('gp-wa'), 'השוואת כרטיסי NVIDIA:\n' + pk.map(function (g) { return '• ' + g.name + ' – ' + g.vram + ' GB, ' + g.bw + ' GB/s, CC ' + g.cc + ', ' + g.w + ' W'; }).join('\n') +
      '\nhttps://hakelim.com/kelim/tichnut/gpu/');
    T.save(KEY, st);
  }
  fill(); render();
  $('gp-form').addEventListener('input', function () { read(); render(); });
  $('gp-form').addEventListener('submit', function (e) { e.preventDefault(); });
  $('gp-list').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-n]'); if (!b) return;
    var n = b.getAttribute('data-n'), i = st.pick.indexOf(n);
    if (i > -1) st.pick.splice(i, 1); else { st.pick.push(n); if (st.pick.length > 3) st.pick.shift(); }
    render(); T.used('tichnut_gpu', 'add');
  });
  $('gp-wa').addEventListener('click', function () { T.used('tichnut_gpu', 'wa'); });
  $('gp-print').addEventListener('click', function () { T.used('tichnut_gpu', 'print'); window.print(); });
  $('gp-reset').addEventListener('click', function () { st = JSON.parse(JSON.stringify(def)); fill(); render(); });
})();
