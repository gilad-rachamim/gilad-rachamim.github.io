// מחשבון Occupancy ל-CUDA: כמה warps פעילים על כל SM לפי גודל בלוק, רגיסטרים ו-shared memory, ומה מגביל.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_occ', $ = function (id) { return document.getElementById(id); };
  var def = { cc: '8.9', t: 256, r: 64, s: 16384 };
  var st = T.load(KEY, def);
  var REGS = 65536, REG_UNIT = 256, SMEM_UNIT = 128;

  var sel = $('oc-cc');
  Object.keys(T.cc).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = k + ' – ' + T.cc[k].name; sel.appendChild(o); });

  function occ(c, t, r, s) {
    var lim = T.cc[c], wpb = Math.ceil(t / 32), maxW = lim.warps;
    if (t < 1 || t > 1024) return { err: 'בלוק יכול להכיל 1 עד 1024 threads.' };
    if (r > 255) return { err: 'מקסימום 255 רגיסטרים ל-thread.' };
    if (s > lim.smemBlock * 1024) return { err: 'מקסימום ' + lim.smemBlock + ' KB של shared memory לבלוק ב-CC ' + c + '.' };
    var byWarps = Math.floor(maxW / wpb);
    var byBlocks = lim.blocks;
    var regsWarp = Math.ceil(Math.max(r, 1) * 32 / REG_UNIT) * REG_UNIT;
    var byRegs = r > 0 ? Math.floor(Math.floor(REGS / regsWarp) / wpb) : Infinity;
    var smemB = s > 0 ? Math.ceil((s + lim.resv * 1024) / SMEM_UNIT) * SMEM_UNIT : 0;
    var bySmem = smemB > 0 ? Math.floor(lim.smem * 1024 / smemB) : Infinity;
    var act = Math.min(byWarps, byBlocks, byRegs, bySmem);
    var why = act === byRegs ? 'regs' : act === bySmem ? 'smem' : act === byWarps ? 'warps' : 'blocks';
    return { wpb: wpb, maxW: maxW, act: act, warps: act * wpb, pct: act * wpb / maxW, why: why,
      lims: [['warps ל-SM', byWarps], ['בלוקים ל-SM', byBlocks], ['רגיסטרים', byRegs], ['shared memory', bySmem]] };
  }
  var WHY = {
    regs: 'הרגיסטרים מגבילים. נסו להוריד רגיסטרים ל-thread (למשל __launch_bounds__ או -maxrregcount).',
    smem: 'ה-shared memory מגבילה. נסו בלוק עם פחות shared memory, או לחלק את העבודה לחלקים קטנים יותר.',
    warps: 'גודל הבלוק מנצל את כל ה-warps האפשריים. זה המקסימום כאן.',
    blocks: 'מגבלת מספר הבלוקים ל-SM. בלוקים גדולים יותר ינצלו יותר warps.'
  };

  function fill() { sel.value = st.cc; $('oc-t').value = st.t; $('oc-r').value = st.r; $('oc-s').value = st.s; }
  function read() { st.cc = sel.value; st.t = +$('oc-t').value || 0; st.r = +$('oc-r').value || 0; st.s = +$('oc-s').value || 0; }
  function render() {
    var o = occ(st.cc, st.t, st.r, st.s);
    if (o.err) { $('oc-pct').textContent = '—'; $('oc-sub').textContent = o.err; $('oc-lims').innerHTML = ''; $('oc-tip').textContent = ''; $('oc-chart').innerHTML = ''; return; }
    var p = Math.round(o.pct * 100);
    $('oc-pct').textContent = p + '%';
    $('oc-sub').textContent = o.warps + ' מתוך ' + o.maxW + ' warps פעילים · ' + o.act + ' בלוקים על כל SM';
    $('oc-lims').innerHTML = o.lims.map(function (l) {
      var v = l[1] === Infinity ? '∞' : l[1];
      return '<li' + (l[1] === o.act ? ' class="on"' : '') + '><span>' + l[0] + '</span><b>' + v + ' בלוקים</b></li>';
    }).join('');
    $('oc-tip').textContent = WHY[o.why];
    // גרף: occupancy לכל גודל בלוק (כפולות של 32)
    var best = 0, bars = [];
    for (var t = 32; t <= 1024; t += 32) {
      var q = occ(st.cc, t, st.r, st.s); var v = q.err ? 0 : q.pct; if (v > best) best = v;
      bars.push([t, v]);
    }
    $('oc-chart').innerHTML = bars.map(function (b) {
      var cls = b[0] === Math.ceil(st.t / 32) * 32 ? ' class="me"' : '';
      return '<i' + cls + ' title="' + b[0] + ' threads: ' + Math.round(b[1] * 100) + '%" style="height:' + Math.max(2, b[1] * 100) + '%"></i>';
    }).join('');
    var good = bars.filter(function (b) { return b[1] === best; }).map(function (b) { return b[0]; });
    $('oc-best').textContent = 'הכי גבוה: ' + Math.round(best * 100) + '% עם ' + good.slice(0, 6).join(', ') + ' threads בבלוק.';
    T.wa($('oc-wa'), 'CUDA Occupancy · CC ' + st.cc + ' · ' + st.t + ' threads, ' + st.r + ' regs, ' + st.s + ' B shared\n= ' + p + '% (' + o.warps + '/' + o.maxW + ' warps)\nhttps://hakelim.com/kelim/tichnut/occupancy/');
    T.save(KEY, st);
  }
  fill(); render();
  $('oc-form').addEventListener('input', function () { read(); render(); });
  $('oc-form').addEventListener('change', function () { T.used('tichnut_occupancy', 'add'); });
  $('oc-form').addEventListener('submit', function (e) { e.preventDefault(); });
  $('oc-wa').addEventListener('click', function () { T.used('tichnut_occupancy', 'wa'); });
  $('oc-reset').addEventListener('click', function () { st = JSON.parse(JSON.stringify(def)); fill(); render(); });
  window.TICHNUT.occ = occ;
})();
