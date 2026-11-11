// מחשבון זמן ועלות אימון: כמה FLOPs צריך (בערך 6 × פרמטרים × טוקנים), כמה שעות זה ייקח על הכרטיס שבחרתם,
// וכמה זה יעלה לפי המחיר לשעה שאתם מזינים. הערכה גסה – לתכנון, לא להצעת מחיר.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_imun', $ = function (id) { return document.getElementById(id); };
  // [שם, TFLOPS BF16/FP16 dense (צבירה ב-FP32, בלי sparsity), VRAM]
  var G = [
    ['RTX 3090', 71, 24], ['RTX 4090', 165, 24], ['RTX 5090', 209, 32], ['RTX A6000', 155, 48],
    ['Tesla T4', 65, 16], ['A10', 125, 24], ['L4', 121, 24], ['L40S', 362, 48], ['V100 32GB', 125, 32],
    ['A100 80GB', 312, 80], ['H100 PCIe', 756, 80], ['H100 SXM', 989, 80], ['H200', 989, 141], ['B200', 2250, 192]
  ];
  var MODELS = [['Llama 3.2 1B', 1.2], ['Llama 3.2 3B', 3.2], ['Mistral 7B', 7.2], ['Llama 3.1 8B', 8], ['Qwen2.5 14B', 14.8], ['Qwen2.5 32B', 32.8], ['Llama 3.3 70B', 70.6]];
  var def = { m: 3, P: 8, mode: 'lora', inMode: 'ex', ex: 20000, len: 512, ep: 3, tok: 1, g: 1, n: 1, mfu: 40, price: 2 };
  var st = T.load(KEY, def);

  var ms = $('im-model'), gs = $('im-gpu');
  MODELS.forEach(function (m, i) { var o = document.createElement('option'); o.value = i; o.textContent = m[0] + ' (' + m[1] + 'B)'; ms.appendChild(o); });
  var oc = document.createElement('option'); oc.value = 'c'; oc.textContent = 'גודל אחר'; ms.appendChild(oc);
  G.forEach(function (g, i) { var o = document.createElement('option'); o.value = i; o.textContent = g[0] + ' – ' + g[1] + ' TFLOPS'; gs.appendChild(o); });

  function fill() {
    ms.value = String(st.m); $('im-P').value = st.P; $('im-Pbox').hidden = st.m !== 'c';
    [['im-ex', 'ex'], ['im-len', 'len'], ['im-ep', 'ep'], ['im-tok', 'tok'], ['im-n', 'n'], ['im-mfu', 'mfu'], ['im-price', 'price']].forEach(function (a) { $(a[0]).value = st[a[1]]; });
    gs.value = String(st.g);
    document.querySelector('input[name=im-mode][value=' + st.mode + ']').checked = true;
    document.querySelector('input[name=im-in][value=' + st.inMode + ']').checked = true;
    $('im-exbox').hidden = st.inMode !== 'ex'; $('im-tokbox').hidden = st.inMode !== 'tok';
  }
  function num(id, d) { var v = parseFloat($(id).value); return isFinite(v) && v >= 0 ? v : d; }
  function read() {
    st.m = ms.value === 'c' ? 'c' : +ms.value; st.P = st.m === 'c' ? num('im-P', 1) : MODELS[st.m][1];
    st.mode = document.querySelector('input[name=im-mode]:checked').value;
    st.inMode = document.querySelector('input[name=im-in]:checked').value;
    st.ex = num('im-ex', 0); st.len = num('im-len', 0); st.ep = num('im-ep', 1); st.tok = num('im-tok', 0);
    st.g = +gs.value; st.n = Math.max(1, Math.round(num('im-n', 1))); st.mfu = Math.min(80, Math.max(5, num('im-mfu', 40))); st.price = num('im-price', 0);
    $('im-mfu-v').textContent = st.mfu + '%';
    $('im-Pbox').hidden = st.m !== 'c'; $('im-exbox').hidden = st.inMode !== 'ex'; $('im-tokbox').hidden = st.inMode !== 'tok';
  }
  function tokens() { return st.inMode === 'ex' ? st.ex * st.len * st.ep : st.tok * 1e9; }
  function hoursOn(gTF, n) {
    var k = st.mode === 'full' ? 6 : 4; // LoRA: בלי גרדיאנטים למשקלות הבסיס – בערך שני שלישים
    var flops = k * st.P * 1e9 * tokens();
    return { flops: flops, h: flops / (gTF * 1e12 * n * st.mfu / 100) / 3600 };
  }
  function dur(h) {
    if (!isFinite(h)) return '—';
    if (h < 1 / 60) return 'פחות מדקה';
    if (h < 1) return Math.round(h * 60) + ' דקות';
    if (h < 48) return (h < 10 ? h.toFixed(1) : Math.round(h)) + ' שעות';
    return Math.round(h / 24) + ' ימים';
  }
  function sci(x) { var e = Math.floor(Math.log10(x)); return (x / Math.pow(10, e)).toFixed(1) + '×10^' + e; }
  function money(x) { return '$' + (x < 10 ? x.toFixed(2) : Math.round(x).toLocaleString('en')); }

  function render() {
    var g = G[st.g], r = hoursOn(g[1], st.n), tk = tokens();
    $('im-h').textContent = dur(r.h);
    $('im-sub').textContent = st.n + ' × ' + g[0] + ' · ' + (tk / 1e6 < 1000 ? (tk / 1e6).toFixed(tk < 1e7 ? 1 : 0) + ' מיליון' : (tk / 1e9).toFixed(1) + ' מיליארד') + ' טוקנים · ' + sci(r.flops) + ' FLOPs';
    var cost = r.h * st.n * st.price;
    $('im-cost').textContent = st.price > 0 ? money(cost) : '—';
    $('im-cost-l').textContent = st.price > 0 ? 'עלות משוערת (' + st.n + ' כרטיסים × ' + money(st.price) + ' לשעה)' : 'הזינו מחיר לשעה כדי לראות עלות';
    var need = st.mode === 'full' ? st.P * 16 : st.P * 2 * 1.2;
    $('im-mem').innerHTML = need > g[2] * st.n ? '⚠️ ' + (st.mode === 'full' ? 'אימון מלא' : 'LoRA') + ' של מודל כזה צריך בערך ' + Math.round(need) + ' GB, ויש לכם ' + g[2] * st.n + ' GB. <a class="gold" href="/kelim/tichnut/vram/">לבדוק במחשבון ה-VRAM ←</a>' : '';
    // השוואה: אותה עבודה על כל כרטיס (אותו מספר כרטיסים)
    var rows = G.map(function (x) { return [x[0], hoursOn(x[1], st.n).h, x[0] === g[0]]; });
    var max = Math.max.apply(null, rows.map(function (x) { return x[1]; }));
    $('im-cmp').innerHTML = rows.map(function (x) {
      return '<li' + (x[2] ? ' class="me"' : '') + '><span>' + x[0] + '</span><b>' + dur(x[1]) + '</b><i style="width:' + Math.max(1, x[1] / max * 100).toFixed(1) + '%"></i></li>';
    }).join('');
    T.wa($('im-wa'), 'הערכת אימון: מודל ' + st.P + 'B, ' + (st.mode === 'full' ? 'אימון מלא' : 'LoRA') + ', ' + (tk / 1e6).toFixed(1) + ' מיליון טוקנים\nעל ' + st.n + ' × ' + g[0] + ': ' + dur(r.h) + (st.price > 0 ? ', בערך ' + money(cost) : '') + '\nhttps://hakelim.com/kelim/tichnut/imun/');
    T.save(KEY, st);
  }
  fill(); read(); render();
  $('im-form').addEventListener('input', function () { read(); render(); });
  $('im-form').addEventListener('change', function () { read(); render(); T.used('tichnut_imun', 'add'); });
  $('im-form').addEventListener('submit', function (e) { e.preventDefault(); });
  $('im-wa').addEventListener('click', function () { T.used('tichnut_imun', 'wa'); });
  $('im-reset').addEventListener('click', function () { st = JSON.parse(JSON.stringify(def)); fill(); read(); render(); });
})();
