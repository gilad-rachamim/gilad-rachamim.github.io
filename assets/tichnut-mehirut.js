// מחשבון מהירות מודל שפה: כמה טוקנים לשנייה המודל יכתוב על כרטיס מסוים.
// כתיבת התשובה (decode) מוגבלת בעיקר במהירות הזיכרון: בכל טוקן קוראים את כל המשקלות + ה-KV cache.
// קריאת השאלה (prefill) מוגבלת בכוח החישוב. הערכה בלבד.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_mehirut', $ = function (id) { return document.getElementById(id); };
  var M = [ // [שם, B פרמטרים, שכבות, KV heads, head dim, פרמטרים פעילים לטוקן (MoE)]
    ['Llama 3.2 3B', 3.2, 28, 8, 128], ['Mistral 7B', 7.2, 32, 8, 128], ['Llama 3.1 8B', 8, 32, 8, 128],
    ['Gemma 2 9B', 9.2, 42, 8, 256], ['Qwen2.5 14B', 14.8, 48, 8, 128], ['Qwen2.5 32B', 32.8, 64, 8, 128],
    ['Mixtral 8x7B', 46.7, 32, 8, 128, 12.9], ['Llama 3.3 70B', 70.6, 80, 8, 128]
  ];
  // TFLOPS BF16 dense, לחישוב זמן קריאת השאלה. כרטיס שאין לו ערך – מחושב רק לפי הזיכרון.
  var TF = { 'RTX 3060': 51, 'RTX 3080': 119, 'RTX 3090': 71, 'RTX 4060': 60, 'RTX 4060 Ti 16GB': 88, 'RTX 4070': 117, 'RTX 4070 Ti Super': 176, 'RTX 4080': 195, 'RTX 4090': 165, 'RTX 5070': 123, 'RTX 5070 Ti': 176, 'RTX 5080': 225, 'RTX 5090': 209, 'RTX A6000': 155, 'RTX 6000 Ada': 364, 'Tesla T4': 65, 'V100 32GB': 125, 'A10': 125, 'L4': 121, 'L40S': 362, 'A100 40GB': 312, 'A100 80GB': 312, 'H100 PCIe': 756, 'H100 SXM': 989, 'H200': 989, 'B200': 2250 };
  var GP = T.gpus.filter(function (g) { return g.cc !== '6.1'; });
  var def = { m: 2, p: 0.56, g: 'RTX 4090', n: 1, ctx: 4096, b: 1, ans: 500 };
  var st = T.load(KEY, def);
  var ms = $('mh-model'), gs = $('mh-gpu');
  M.forEach(function (m, i) { var o = document.createElement('option'); o.value = i; o.textContent = m[0]; ms.appendChild(o); });
  GP.forEach(function (g) { var o = document.createElement('option'); o.value = g.name; o.textContent = g.name + ' – ' + g.vram + ' GB'; gs.appendChild(o); });

  function fill() { ms.value = String(st.m); $('mh-p').value = String(st.p); gs.value = st.g; $('mh-n').value = st.n; $('mh-ctx').value = st.ctx; $('mh-b').value = st.b; $('mh-ans').value = st.ans; }
  function n(id, d, lo) { var v = parseFloat($(id).value); return isFinite(v) && v >= (lo || 0) ? v : d; }
  function read() { st.m = +ms.value; st.p = +$('mh-p').value; st.g = gs.value; st.n = Math.max(1, Math.round(n('mh-n', 1, 1))); st.ctx = n('mh-ctx', 4096, 1); st.b = Math.max(1, Math.round(n('mh-b', 1, 1))); st.ans = n('mh-ans', 500, 1); }

  function speed(gpu, cnt) {
    var m = M[st.m], P = m[1] * 1e9, act = (m[5] || m[1]) * 1e9;
    var w = P * st.p, kvTok = 2 * m[2] * m[3] * m[4] * 2, kv = kvTok * st.ctx * st.b;
    var bw = gpu.bw * 1e9 * cnt * (cnt > 1 ? 0.85 : 1) * 0.7; // 70% מרוחב הפס מנוצל בפועל
    var read = act * st.p + kv;            // בכל צעד: המשקלות הפעילים + ה-KV של כל המשתמשים
    var stepMem = read / bw;
    var tf = TF[gpu.name] ? TF[gpu.name] * 1e12 * cnt * 0.5 : 0;
    var stepCmp = tf ? 2 * act * st.b / tf : 0;
    var step = Math.max(stepMem, stepCmp);
    return { per: 1 / step, all: st.b / step, ttft: tf ? 2 * act * st.ctx / tf : NaN, need: (w + kv) / 1073741824 * 1.1 + 0.8, bound: stepCmp > stepMem ? 'cmp' : 'mem' };
  }
  function f(x) { return x >= 100 ? Math.round(x).toLocaleString('en') : x.toFixed(x >= 10 ? 0 : 1); }
  function sec(s) { return !isFinite(s) ? '—' : s < 1 ? Math.round(s * 1000) + ' מילישניות' : s < 90 ? s.toFixed(s < 10 ? 1 : 0) + ' שניות' : Math.round(s / 60) + ' דקות'; }

  function render() {
    var g = GP.filter(function (x) { return x.name === st.g; })[0] || GP[0], r = speed(g, st.n), fits = r.need <= g.vram * st.n;
    $('mh-tps').textContent = fits ? f(r.per) : '—';
    $('mh-tps-l').textContent = st.b > 1 ? 'טוקנים לשנייה לכל משתמש' : 'טוקנים לשנייה';
    $('mh-all').textContent = fits ? (st.b > 1 ? f(r.all) + ' טוקנים לשנייה לכל ' + st.b + ' המשתמשים יחד · ' : '') +
      'בערך ' + f(r.per * 0.75) + ' מילים באנגלית לשנייה (בעברית בערך חצי מזה)' : '';
    $('mh-ttft').textContent = fits ? sec(r.ttft) : '—';
    $('mh-total').textContent = fits ? sec(r.ttft + st.ans / r.per) : '—';
    var read = r.per * 0.75 > 5 ? 'מהר יותר ממה שאדם קורא (בערך 4–5 מילים בשנייה).' : 'לאט יותר מקצב קריאה רגיל – ירגיש איטי.';
    $('mh-note').innerHTML = fits ? (r.bound === 'mem' ? 'הצוואר כאן הוא מהירות הזיכרון של הכרטיס. ' : 'כאן הצוואר כבר כוח החישוב (הרבה משתמשים במקביל). ') + read
      : '⚠️ המודל לא נכנס: צריך בערך ' + Math.round(r.need) + ' GB, ויש ' + g.vram * st.n + ' GB. אפשר דיוק נמוך יותר, יותר כרטיסים, או <a class="gold" href="/kelim/tichnut/vram/">לבדוק במחשבון ה-VRAM ←</a>';
    var rows = GP.map(function (x) { var q = speed(x, st.n); return [x.name, q.need <= x.vram * st.n ? q.per : 0, x.name === g.name, x.bw]; })
      .filter(function (x) { return x[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; });
    var max = rows.length ? rows[0][1] : 1;
    $('mh-cmp').innerHTML = rows.map(function (x) {
      return '<li' + (x[2] ? ' class="me"' : '') + '><span>' + x[0] + '</span><b>' + f(x[1]) + ' טוקנים/שנ׳</b><i style="width:' + Math.max(1, x[1] / max * 100).toFixed(1) + '%"></i></li>';
    }).join('') || '<li><span>אף כרטיס לא מספיק לבד. נסו יותר כרטיסים או דיוק נמוך יותר.</span></li>';
    T.wa($('mh-wa'), M[st.m][0] + ' על ' + st.n + ' × ' + g.name + ': ' + (fits ? 'בערך ' + f(r.per) + ' טוקנים לשנייה' : 'לא נכנס בזיכרון') + '\nhttps://hakelim.com/kelim/tichnut/mehirut/');
    T.save(KEY, st);
  }
  fill(); render();
  $('mh-form').addEventListener('input', function () { read(); render(); });
  $('mh-form').addEventListener('change', function () { T.used('tichnut_mehirut', 'add'); });
  $('mh-form').addEventListener('submit', function (e) { e.preventDefault(); });
  $('mh-wa').addEventListener('click', function () { T.used('tichnut_mehirut', 'wa'); });
  $('mh-reset').addEventListener('click', function () { st = JSON.parse(JSON.stringify(def)); fill(); render(); });
})();
