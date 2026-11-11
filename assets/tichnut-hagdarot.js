// בונה הגדרות להרצת מודל אצלכם: בוחרים מודל, כרטיס וכמה משתמשים – והכלי בוחר דיוק ואורך הקשר שנכנסים לזיכרון,
// ומוציא הגדרות מוכנות ל-Ollama, ל-vLLM ול-llama.cpp, עם הסבר לכל החלטה.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_hagdarot', $ = function (id) { return document.getElementById(id); };
  // [שם, B, שכבות, KV heads, head dim, תג Ollama, שם ב-Hugging Face, גרסת AWQ רשמית/מוכרת]
  var M = [
    ['Llama 3.2 3B', 3.2, 28, 8, 128, 'llama3.2:3b-instruct', 'meta-llama/Llama-3.2-3B-Instruct', ''],
    ['Mistral 7B', 7.2, 32, 8, 128, 'mistral:7b-instruct', 'mistralai/Mistral-7B-Instruct-v0.3', ''],
    ['Llama 3.1 8B', 8, 32, 8, 128, 'llama3.1:8b-instruct', 'meta-llama/Llama-3.1-8B-Instruct', 'hugging-quants/Meta-Llama-3.1-8B-Instruct-AWQ-INT4'],
    ['Gemma 2 9B', 9.2, 42, 8, 256, 'gemma2:9b-instruct', 'google/gemma-2-9b-it', ''],
    ['Qwen2.5 14B', 14.8, 48, 8, 128, 'qwen2.5:14b-instruct', 'Qwen/Qwen2.5-14B-Instruct', 'Qwen/Qwen2.5-14B-Instruct-AWQ'],
    ['Qwen2.5 32B', 32.8, 64, 8, 128, 'qwen2.5:32b-instruct', 'Qwen/Qwen2.5-32B-Instruct', 'Qwen/Qwen2.5-32B-Instruct-AWQ'],
    ['Llama 3.3 70B', 70.6, 80, 8, 128, 'llama3.3:70b-instruct', 'meta-llama/Llama-3.3-70B-Instruct', '']
  ];
  var Q = [ // [מפתח, תווית, bytes לפרמטר, סיומת Ollama, קוונטיזציה ב-llama.cpp]
    ['fp16', 'FP16 – דיוק מלא', 2, 'fp16', 'F16'], ['q8', '8 ביט – כמעט בלי הבדל באיכות', 1.07, 'q8_0', 'Q8_0'], ['q4', '4 ביט – האיכות יורדת קצת', 0.6, 'q4_K_M', 'Q4_K_M']
  ];
  var CTX = [32768, 16384, 8192, 4096, 2048];
  var USERS = { 1: ['רק אני', 1], 4: ['כמה אנשים (עד 4)', 4], 16: ['שרת לצוות (16 במקביל)', 16] };
  var GP = T.gpus.filter(function (g) { return g.cc !== '6.1'; });
  var def = { m: 2, g: 'RTX 4090', n: 1, u: 1, eng: 'ollama' };
  var st = T.load(KEY, def);
  var ms = $('hg-model'), gs = $('hg-gpu');
  M.forEach(function (m, i) { var o = document.createElement('option'); o.value = i; o.textContent = m[0]; ms.appendChild(o); });
  GP.forEach(function (g) { var o = document.createElement('option'); o.value = g.name; o.textContent = g.name + ' – ' + g.vram + ' GB'; gs.appendChild(o); });
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function plan() {
    var m = M[st.m], g = GP.filter(function (x) { return x.name === st.g; })[0] || GP[0], vram = g.vram * st.n * 0.9, users = USERS[st.u][1];
    var kvTok = 2 * m[2] * m[3] * m[4] * 2 / 1073741824; // GB לטוקן, FP16
    for (var qi = 0; qi < Q.length; qi++) {
      var w = m[1] * Q[qi][2] + 1;
      for (var ci = 0; ci < CTX.length; ci++) {
        var need = w + kvTok * CTX[ci] * users;
        // מעדיפים דיוק גבוה, אבל לא אם הוא מכריח הקשר קצר מ-8K
        if (need <= vram && (CTX[ci] >= 8192 || qi === Q.length - 1)) return { q: Q[qi], ctx: CTX[ci], need: need, vram: vram, g: g, m: m, users: users };
      }
    }
    return { fail: true, need: m[1] * Q[2][2] + 1 + kvTok * 2048 * users, vram: vram, g: g, m: m, users: users };
  }
  function block(title, code, note) {
    return '<div class="hg-blk"><div class="hg-bh"><b>' + title + '</b><button type="button" class="btn btn-line btn-sm" data-copy>להעתיק</button></div><pre dir="ltr">' + esc(code) + '</pre>' + (note ? '<p class="note">' + note + '</p>' : '') + '</div>';
  }
  function render() {
    [].forEach.call(document.querySelectorAll('#hg-eng button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-e') === st.eng); });
    var p = plan(), out = '', why = '';
    if (p.fail) {
      $('hg-why').innerHTML = '<li>⚠️ ' + p.m[0] + ' לא נכנס גם ב-4 ביט: צריך בערך ' + Math.round(p.need) + ' GB, ויש ' + Math.round(p.vram) + ' GB שמישים. צריך יותר כרטיסים, כרטיס גדול יותר, או מודל קטן יותר. <a class="gold" href="/kelim/tichnut/vram/">מחשבון VRAM ←</a></li>';
      $('hg-out').innerHTML = ''; T.save(KEY, st); return;
    }
    var k = p.ctx >= 1024 ? p.ctx / 1024 + 'K' : p.ctx;
    why += '<li><b>דיוק: ' + p.q[1] + '.</b> ' + (p.q[0] === 'fp16' ? 'יש מספיק זיכרון, אז אין סיבה לוותר על איכות.' : p.q[0] === 'q8' ? 'FP16 לא נכנס עם הקשר סביר, ו-8 ביט כמעט זהה באיכות.' : 'רק 4 ביט נכנס בזיכרון עם הקשר שימושי.') + '</li>';
    why += '<li><b>הקשר: ' + k + ' טוקנים</b> ' + (p.users > 1 ? 'לכל אחד מ-' + p.users + ' המשתמשים' : '') + ' – הכי ארוך שעוד נכנס. בערך ' + Math.round(p.ctx * 0.75).toLocaleString('he-IL') + ' מילים באנגלית.</li>';
    why += '<li><b>זיכרון: בערך ' + Math.round(p.need) + ' GB מתוך ' + Math.round(p.vram) + ' GB שמישים</b> (השארתי 10% מרווח לתקורה).</li>';
    if (st.n > 1) why += '<li><b>' + st.n + ' כרטיסים:</b> המודל מתחלק ביניהם (tensor parallel).</li>';
    $('hg-why').innerHTML = why;
    var m = p.m, ot = m[5] + '-' + p.q[3], tp = st.n;
    if (st.eng === 'ollama') {
      out += block('1. להוריד ולהריץ', 'ollama pull ' + ot + '\nollama run ' + ot, 'אם התג לא נמצא – בדקו את השם המדויק בדף המודל ב-ollama.com/library.');
      out += block('2. קובץ Modelfile – כדי שהקשר הארוך יישמר', 'FROM ' + ot + '\nPARAMETER num_ctx ' + p.ctx + '\nPARAMETER temperature 0.7', 'ב-Ollama ברירת המחדל להקשר קצרה – בלי השורה num_ctx המודל "שוכח" שיחות ארוכות.');
      out += block('3. ליצור מודל משלכם עם ההגדרות', 'ollama create my-' + m[5].split(':')[0] + ' -f Modelfile\nollama run my-' + m[5].split(':')[0]);
      if (p.users > 1) out += block('4. לאפשר כמה משתמשים במקביל', 'OLLAMA_NUM_PARALLEL=' + p.users + ' ollama serve', 'ב-Windows (PowerShell): $env:OLLAMA_NUM_PARALLEL="' + p.users + '"; ollama serve. כל משתמש במקביל מקבל הקשר משלו – לכן חישבתי זיכרון לכולם.');
    } else if (st.eng === 'vllm') {
      var model = m[6], qa = '';
      if (p.q[0] === 'q4') { if (m[7]) model = m[7]; else qa = ' --quantization fp8'; }
      if (p.q[0] === 'q8') qa = ' --quantization fp8';
      out += block('שרת vLLM (API כמו של OpenAI)', 'vllm serve ' + model + qa + ' \\\n  --max-model-len ' + p.ctx + ' \\\n  --gpu-memory-utilization 0.90 \\\n  --max-num-seqs ' + Math.max(p.users, 4) + (tp > 1 ? ' \\\n  --tensor-parallel-size ' + tp : ''),
        (qa ? 'fp8 מקטין את המשקלות לחצי בזמן הטעינה. הכי מהיר בכרטיסים מדור 8.9 ומעלה (RTX 40, L4, H100).' + (p.q[0] === 'q4' ? ' ל-4 ביט אמיתי חפשו גרסת AWQ של המודל ב-Hugging Face.' : '') + ' ' : '') +
        (model !== m[6] ? 'זו גרסת AWQ (4 ביט) של המודל. ' : '') + 'מודלים של Llama ו-Gemma דורשים לאשר רישיון ב-Hugging Face ו-HF_TOKEN.');
      out += block('לבדוק שהשרת עונה', 'curl http://localhost:8000/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -d \'{"model": "' + model + '", "messages": [{"role": "user", "content": "שלום"}]}\'');
    } else {
      out += block('שרת llama.cpp', 'llama-server -m ./' + m[0].replace(/\s+/g, '-') + '-' + p.q[4] + '.gguf \\\n  -c ' + p.ctx * p.users + ' -np ' + p.users + ' -ngl 99 --port 8080',
        'קובץ GGUF מורידים מ-Hugging Face (מחפשים "' + m[0] + ' GGUF" ובוחרים ' + p.q[4] + '). ' + (p.users > 1 ? 'ב-llama.cpp ההקשר ב-c- מתחלק בין המשתמשים (np-), לכן הכפלתי. ' : '') + '-ngl 99 מעביר את כל השכבות לכרטיס.');
      out += block('לפתוח בדפדפן', 'http://localhost:8080', 'ל-llama-server יש ממשק צ\'אט מובנה בכתובת הזאת.');
    }
    $('hg-out').innerHTML = out;
    T.wa($('hg-wa'), 'הגדרות ל-' + m[0] + ' על ' + st.n + ' × ' + p.g.name + ': ' + p.q[1] + ', הקשר ' + k + '\n\n' + [].map.call(document.querySelectorAll('#hg-out pre'), function (x) { return x.textContent; }).join('\n\n') + '\n\nhttps://hakelim.com/kelim/tichnut/hagdarot/');
    T.save(KEY, st);
  }
  function fill() { ms.value = String(st.m); gs.value = st.g; $('hg-n').value = st.n; $('hg-u').value = String(st.u); }
  fill(); render();
  $('hg-form').addEventListener('input', function () {
    st.m = +ms.value; st.g = gs.value; st.n = Math.max(1, Math.min(8, parseInt($('hg-n').value, 10) || 1)); st.u = +$('hg-u').value; render();
  });
  $('hg-form').addEventListener('change', function () { T.used('tichnut_hagdarot', 'add'); });
  $('hg-form').addEventListener('submit', function (e) { e.preventDefault(); });
  $('hg-eng').addEventListener('click', function (e) { var b = e.target.closest('button[data-e]'); if (!b) return; st.eng = b.getAttribute('data-e'); render(); T.used('tichnut_hagdarot', st.eng); });
  $('hg-out').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-copy]'); if (!b) return;
    try { navigator.clipboard.writeText(b.closest('.hg-blk').querySelector('pre').textContent); b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1500); } catch (x) {}
    T.used('tichnut_hagdarot', 'copy');
  });
  $('hg-wa').addEventListener('click', function () { T.used('tichnut_hagdarot', 'wa'); });
})();
