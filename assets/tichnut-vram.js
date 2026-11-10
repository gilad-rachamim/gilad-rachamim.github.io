// מחשבון VRAM: כמה זיכרון כרטיס מסך צריך כדי להריץ / לאמן מודל שפה, ואיזה כרטיס NVIDIA מספיק.
// הערכה בלבד: משקלות + KV cache + הפעלות + תקורה של CUDA.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_vram';
  // [שם, מיליארדי פרמטרים, שכבות, KV heads, head dim, hidden]
  var M = [
    ['Llama 3.2 3B', 3.2, 28, 8, 128, 3072],
    ['Mistral 7B', 7.2, 32, 8, 128, 4096],
    ['Llama 3.1 8B', 8.0, 32, 8, 128, 4096],
    ['Gemma 2 9B', 9.2, 42, 8, 256, 3584],
    ['Qwen2.5 14B', 14.8, 48, 8, 128, 5120],
    ['Qwen2.5 32B', 32.8, 64, 8, 128, 5120],
    ['Mixtral 8x7B', 46.7, 32, 8, 128, 4096],
    ['Llama 3.3 70B', 70.6, 80, 8, 128, 8192],
    ['Llama 3.1 405B', 405, 126, 8, 128, 16384]
  ];
  var $ = function (id) { return document.getElementById(id); };
  var GB = 1073741824;
  var def = { m: 2, p: 0.5, kv: 2, ctx: 8192, batch: 1, mode: 'inf', P: 8, L: 32, kvh: 8, hd: 128, hid: 4096 };
  var st = T.load(KEY, def);

  var sel = $('vr-model');
  M.forEach(function (m, i) { var o = document.createElement('option'); o.value = i; o.textContent = m[0] + ' (' + m[1] + 'B)'; sel.appendChild(o); });
  var oc = document.createElement('option'); oc.value = 'c'; oc.textContent = 'מודל אחר – אמלא בעצמי'; sel.appendChild(oc);

  function fill() {
    sel.value = String(st.m); $('vr-prec').value = String(st.p); $('vr-kv').value = String(st.kv);
    $('vr-ctx').value = st.ctx; $('vr-batch').value = st.batch;
    ['P', 'L', 'kvh', 'hd', 'hid'].forEach(function (k) { $('vr-' + k).value = st[k]; });
    var r = document.querySelector('input[name=vr-mode][value=' + st.mode + ']'); if (r) r.checked = true;
    $('vr-custom').hidden = st.m !== 'c';
  }
  function read() {
    st.m = sel.value === 'c' ? 'c' : +sel.value;
    st.p = +$('vr-prec').value; st.kv = +$('vr-kv').value;
    st.ctx = Math.max(1, +$('vr-ctx').value || 1); st.batch = Math.max(1, +$('vr-batch').value || 1);
    var r = document.querySelector('input[name=vr-mode]:checked'); st.mode = r ? r.value : 'inf';
    if (st.m !== 'c') { var m = M[st.m]; st.P = m[1]; st.L = m[2]; st.kvh = m[3]; st.hd = m[4]; st.hid = m[5]; }
    else ['P', 'L', 'kvh', 'hd', 'hid'].forEach(function (k) { st[k] = Math.max(0, +$('vr-' + k).value || 0); });
  }
  function f(x) { return x < 10 ? x.toFixed(1) : Math.round(x).toString(); }

  function calc() {
    var P = st.P * 1e9, parts = [];
    var wBytes = st.mode === 'full' ? 2 : st.p;
    var w = P * wBytes / GB;
    parts.push(['משקלות המודל', w]);
    if (st.mode === 'inf') {
      var kv = 2 * st.L * st.kvh * st.hd * st.ctx * st.batch * st.kv / GB;
      parts.push(['KV cache (זיכרון ההקשר)', kv]);
      parts.push(['הפעלות זמניות', st.ctx * st.batch * st.hid * 2 * 4 / GB]);
    } else {
      var act = st.ctx * st.batch * st.hid * (2 * st.L + 34) / GB;
      if (st.mode === 'lora') parts.push(['מתאמי LoRA + אופטימייזר', P * 0.01 * 16 / GB]);
      else parts.push(['גרדיאנטים + Adam (FP32)', P * 14 / GB]);
      parts.push(['הפעלות (עם gradient checkpointing)', act]);
    }
    var sub = parts.reduce(function (a, b) { return a + b[1]; }, 0);
    parts.push(['תקורה של CUDA וספריות', 0.8 + sub * 0.05]);
    var tot = parts.reduce(function (a, b) { return a + b[1]; }, 0);
    return { parts: parts, tot: tot };
  }

  function render() {
    var r = calc(), name = st.m === 'c' ? 'מודל ' + st.P + 'B' : M[st.m][0];
    $('vr-total').textContent = f(r.tot) + ' GB';
    var mode = { inf: 'הרצה (inference)', lora: 'אימון LoRA / QLoRA', full: 'אימון מלא' }[st.mode];
    $('vr-what').textContent = name + ' · ' + mode + ' · הקשר ' + st.ctx.toLocaleString('he-IL') + ' טוקנים';
    $('vr-bars').innerHTML = r.parts.map(function (p) {
      return '<li><span>' + p[0] + '</span><b>' + f(p[1]) + ' GB</b><i style="width:' + Math.max(2, p[1] / r.tot * 100).toFixed(1) + '%"></i></li>';
    }).join('');
    var fit = T.gpus.filter(function (g) { return g.vram >= r.tot; }).sort(function (a, b) { return a.vram - b.vram || a.w - b.w; });
    var html = fit.slice(0, 8).map(function (g) {
      return '<li><b>' + g.name + '</b><span><bdi>' + g.vram + ' GB</bdi> · ' + T.fam[g.fam] + '</span></li>';
    }).join('');
    if (!fit.length) {
      var big = T.gpus.filter(function (g) { return g.fam === 'dc'; }).sort(function (a, b) { return b.vram - a.vram; }).slice(0, 3);
      html = big.map(function (g) {
        return '<li><b>' + Math.ceil(r.tot / (g.vram * 0.9)) + ' × ' + g.name + '</b><span><bdi>' + g.vram + ' GB</bdi> כל אחד, מחולק בין כמה כרטיסים</span></li>';
      }).join('');
      $('vr-fit-h').textContent = 'אין כרטיס יחיד שמספיק. צריך כמה:';
    } else $('vr-fit-h').textContent = 'כרטיסים שמספיקים (הקטן ביותר ראשון):';
    $('vr-fit').innerHTML = html;
    T.wa($('vr-wa'), 'מחשבון VRAM: ' + name + ', ' + mode + ' – צריך בערך ' + f(r.tot) + ' GB זיכרון בכרטיס מסך.\n' +
      (fit.length ? 'מספיק למשל: ' + fit.slice(0, 3).map(function (g) { return g.name; }).join(', ') + '\n' : '') +
      'חישבתי כאן: https://hakelim.com/kelim/tichnut/vram/');
    T.save(KEY, st);
  }

  fill(); render();
  $('vr-form').addEventListener('input', function () { read(); $('vr-custom').hidden = st.m !== 'c'; render(); });
  $('vr-form').addEventListener('change', function () { read(); render(); T.used('tichnut_vram', 'add'); });
  $('vr-form').addEventListener('submit', function (e) { e.preventDefault(); });
  $('vr-wa').addEventListener('click', function () { T.used('tichnut_vram', 'wa'); });
  $('vr-reset').addEventListener('click', function () { st = JSON.parse(JSON.stringify(def)); fill(); render(); });
})();
