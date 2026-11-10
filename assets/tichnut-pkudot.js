// מחולל פקודות ל-GPU: בוחרים מה רוצים לעשות (nvidia-smi, Docker, PyTorch, nvcc), ממלאים פרטים,
// ומקבלים פקודה מדויקת ל-Linux או ל-Windows עם הסבר בעברית לכל חלק בה.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_pkudot', $ = function (id) { return document.getElementById(id); };
  var F = {
    gpu: ['מספר הכרטיס', 'number', '0'], n: ['כל כמה שניות', 'number', '2'], script: ['שם הקובץ', 'text', 'train.py'],
    file: ['קובץ הפלט', 'text', 'gpu_log.csv'], w: ['הספק מקסימלי (וואט)', 'number', '250'], pid: ['מספר התהליך (PID)', 'number', '12345'],
    cu: ['גרסת CUDA', 'select', '124', [['118', 'CUDA 11.8'], ['121', 'CUDA 12.1'], ['124', 'CUDA 12.4'], ['126', 'CUDA 12.6'], ['128', 'CUDA 12.8 (RTX 50)']]],
    cc: ['הדור של הכרטיס', 'select', '89', [['75', '7.5 – RTX 20, T4'], ['80', '8.0 – A100'], ['86', '8.6 – RTX 30'], ['89', '8.9 – RTX 40, L4'], ['90', '9.0 – H100'], ['120', '12.0 – RTX 50']]],
    src: ['קובץ ה-CUDA', 'text', 'kernel.cu'], out: ['שם התוכנית', 'text', 'kernel'], model: ['המודל', 'text', 'Qwen/Qwen2.5-7B-Instruct'],
    port: ['פורט', 'number', '8000']
  };
  // c=קבוצה, t=כותרת, f=שדות, x(p,win)=הפקודה, e=[[חלק, הסבר]], warn=אזהרה, lin=רק Linux
  var R = [
    { c: 'nvidia-smi', t: 'מה מצב הכרטיס עכשיו', f: [], x: function () { return 'nvidia-smi'; },
      e: [['nvidia-smi', 'מציג את כל הכרטיסים: שם, טמפרטורה, הספק, זיכרון בשימוש, אחוז ניצול, ומי רץ עליהם. מגיע עם הדרייבר של NVIDIA.']] },
    { c: 'nvidia-smi', t: 'מעקב חי שמתעדכן', f: ['n'], x: function (p, win) { return win ? 'nvidia-smi -l ' + p.n : 'watch -n ' + p.n + ' nvidia-smi'; },
      e: [['watch -n N', 'ב-Linux: מריץ את הפקודה מחדש כל N שניות ומנקה את המסך. יוצאים עם Ctrl+C.'], ['-l N', 'ב-Windows: nvidia-smi עצמו חוזר כל N שניות (loop).']] },
    { c: 'nvidia-smi', t: 'מי תופס את הזיכרון בכרטיס', f: [], x: function () { return 'nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv'; },
      e: [['--query-compute-apps', 'רשימת התהליכים שמשתמשים בכרטיס כרגע.'], ['pid,process_name,used_memory', 'אילו עמודות להציג: מספר תהליך, שם, וכמה זיכרון.'], ['--format=csv', 'פלט בטבלה פשוטה, נוח להעתקה לאקסל.']] },
    { c: 'nvidia-smi', t: 'לשמור לוג של שימוש וטמפרטורה', f: ['n', 'file'],
      x: function (p) { return 'nvidia-smi --query-gpu=timestamp,name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw --format=csv -l ' + p.n + ' > ' + p.file; },
      e: [['--query-gpu=...', 'אילו נתונים לרשום: זמן, שם, אחוז ניצול, זיכרון, טמפרטורה והספק.'], ['-l N', 'שורה חדשה כל N שניות.'], ['> file', 'שומר לקובץ במקום להדפיס למסך. עוצרים עם Ctrl+C ופותחים באקסל.']] },
    { c: 'nvidia-smi', t: 'איזה דרייבר, CUDA ודור כרטיס יש לי', f: [],
      x: function () { return 'nvidia-smi --query-gpu=name,driver_version,compute_cap,memory.total --format=csv\nnvcc --version'; },
      e: [['driver_version', 'גרסת הדרייבר. בכותרת של nvidia-smi רגיל מופיעה גם "CUDA Version" – זו הגרסה המקסימלית שהדרייבר תומך בה.'], ['compute_cap', 'הדור של הכרטיס (Compute Capability), למשל 8.9. בדרייברים ישנים השדה לא קיים.'], ['nvcc --version', 'גרסת ה-CUDA Toolkit שמותקנת לקומפילציה. יכולה להיות שונה מזו של הדרייבר, וזה תקין.']] },
    { c: 'nvidia-smi', t: 'להגביל הספק (פחות חום ורעש)', f: ['gpu', 'w'], lin: false,
      x: function (p, win) { return (win ? '' : 'sudo ') + 'nvidia-smi -i ' + p.gpu + ' -pl ' + p.w; },
      e: [['sudo', 'ב-Linux צריך הרשאות מנהל. ב-Windows: לפתוח את המסוף "כמנהל".'], ['-i N', 'על איזה כרטיס (0 הוא הראשון).'], ['-pl W', 'Power Limit בוואט. חייב להיות בטווח שהכרטיס מרשה – nvidia-smi -q -d POWER מראה את הטווח.']],
      warn: 'משנה הגדרה של הכרטיס עד הפעלה מחדש. כרטיסי GeForce רבים לא מאפשרים לשנות.' },
    { c: 'nvidia-smi', t: 'לסגור תהליך שתקוע על הכרטיס', f: ['pid'],
      x: function (p, win) { return win ? 'taskkill /F /PID ' + p.pid : 'kill -9 ' + p.pid; },
      e: [['PID', 'את המספר לוקחים מהטבלה של nvidia-smi או מ"מי תופס את הזיכרון".'], ['kill -9 / taskkill /F', 'סוגר את התהליך מיד, בלי לשמור. הזיכרון בכרטיס משתחרר.']],
      warn: 'עבודה שלא נשמרה בתהליך הזה תאבד. לבדוק פעמיים שזה המספר הנכון.' },
    { c: 'PyTorch', t: 'האם PyTorch רואה את הכרטיס', f: [],
      x: function (p, win) { return 'python -c "import torch; print(torch.__version__, torch.version.cuda, torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else \'no GPU\')"'; },
      e: [['torch.version.cuda', 'עם איזו גרסת CUDA PyTorch נבנה. None אומר שהותקנה גרסת CPU בלבד.'], ['torch.cuda.is_available()', 'True אם הכול עובד. False – הדרייבר או ההתקנה.'], ['get_device_name(0)', 'שם הכרטיס הראשון.']] },
    { c: 'PyTorch', t: 'להתקין PyTorch עם תמיכה בכרטיס', f: ['cu'],
      x: function (p) { return 'python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu' + p.cu; },
      e: [['python -m pip', 'מוודא שההתקנה הולכת ל-Python שמריץ את הקוד, ולא לאחר.'], ['--index-url .../cuXXX', 'מוריד את הגרסה שבנויה עם CUDA. בלי זה ב-Windows מקבלים גרסת CPU.'], ['cuXXX', 'צריך להיות שווה או נמוך מ-"CUDA Version" שבכותרת של nvidia-smi. לא כל גרסת CUDA קיימת לכל גרסת PyTorch – בודקים ב-pytorch.org.']] },
    { c: 'PyTorch', t: 'להריץ על כרטיס מסוים בלבד', f: ['gpu', 'script'],
      x: function (p, win) { return win ? '$env:CUDA_VISIBLE_DEVICES="' + p.gpu + '"; python ' + p.script : 'CUDA_VISIBLE_DEVICES=' + p.gpu + ' python ' + p.script; },
      e: [['CUDA_VISIBLE_DEVICES', 'משתנה סביבה שמסתיר את שאר הכרטיסים. התוכנית תראה רק את מה שכתוב, והוא יהיה אצלה cuda:0.'], ['$env:...', 'ב-PowerShell של Windows ככה מגדירים משתנה סביבה.']] },
    { c: 'Docker', t: 'לבדוק ש-Docker רואה את הכרטיס', f: [],
      x: function () { return 'docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi'; },
      e: [['--rm', 'למחוק את הקונטיינר כשהוא מסיים.'], ['--gpus all', 'לתת לקונטיינר את כל הכרטיסים. דורש NVIDIA Container Toolkit (ב-Linux) או Docker Desktop עם WSL2 (ב-Windows).'], ['nvidia/cuda:...-base', 'אימג\' קטן ורשמי של NVIDIA. אם רואים את הטבלה של nvidia-smi – הכול מחובר.']] },
    { c: 'Docker', t: 'להריץ קוד PyTorch בקונטיינר', f: ['gpu', 'script'],
      x: function (p, win) {
        var g = p.gpu === 'all' ? '--gpus all' : '--gpus \'"device=' + p.gpu + '"\'';
        return 'docker run --rm -it ' + g + ' --shm-size=8g -v "' + (win ? '${PWD}' : '$(pwd)') + '":/work -w /work pytorch/pytorch:2.4.1-cuda12.4-cudnn9-runtime python ' + p.script;
      },
      e: [['--gpus \'"device=N"\'', 'רק כרטיס מסוים (המירכאות הכפולות בתוך הבודדות חשובות). כתבו all במספר הכרטיס כדי לתת את כולם.'], ['--shm-size=8g', 'זיכרון משותף גדול יותר. בלעדיו DataLoader עם num_workers נופל.'], ['-v ...:/work', 'מחבר את התיקייה הנוכחית שלכם לתוך הקונטיינר, כך שהקבצים והתוצאות נשמרים אצלכם.'], ['-w /work', 'להתחיל לרוץ מתוך התיקייה הזאת.']] },
    { c: 'Docker', t: 'שרת מודל שפה (vLLM) עם API', f: ['model', 'port'],
      x: function (p) { return 'docker run --rm --gpus all --ipc=host -p ' + p.port + ':8000 -v ~/.cache/huggingface:/root/.cache/huggingface vllm/vllm-openai:latest --model ' + p.model; },
      e: [['--ipc=host', 'זיכרון משותף מהמחשב – vLLM צריך את זה.'], ['-p PORT:8000', 'לפתוח את השרת בכתובת http://localhost:PORT. ה-API זהה לזה של OpenAI.'], ['-v ~/.cache/huggingface', 'לשמור את המודל שהורד, כדי שלא ירד שוב בכל הפעלה.'], ['--model', 'שם המודל מ-Hugging Face. לבדוק במחשבון ה-VRAM שהוא נכנס בכרטיס.']] },
    { c: 'nvcc', t: 'לקמפל קובץ CUDA', f: ['src', 'out', 'cc'],
      x: function (p, win) { return 'nvcc -O3 -arch=sm_' + p.cc + ' ' + p.src + ' -o ' + p.out + (win ? '.exe' : '') + '\n' + (win ? '.\\' : './') + p.out + (win ? '.exe' : ''); },
      e: [['nvcc', 'הקומפיילר של NVIDIA. מגיע עם CUDA Toolkit.'], ['-O3', 'אופטימיזציה מלאה.'], ['-arch=sm_XX', 'לבנות בשביל הדור של הכרטיס שלכם. דור לא נכון = "no kernel image is available".'], ['-o', 'שם הקובץ שייווצר. השורה השנייה מריצה אותו.']] },
    { c: 'nvcc', t: 'למדוד קרנל (Nsight Compute)', f: ['out'],
      x: function (p, win) { return 'ncu --set full -o report ' + (win ? '.\\' + p.out + '.exe' : './' + p.out); },
      e: [['ncu', 'Nsight Compute – מודד כל קרנל: occupancy, רוחב פס, איפה צוואר הבקבוק.'], ['--set full', 'כל המדדים (איטי יותר, מפורט יותר).'], ['-o report', 'שומר report.ncu-rep, שנפתח בתוכנה הגרפית של Nsight Compute.']] },
    { c: 'nvcc', t: 'ציר זמן של כל התוכנית (Nsight Systems)', f: ['script'],
      x: function (p) { return 'nsys profile -o timeline --trace=cuda,nvtx python ' + p.script; },
      e: [['nsys profile', 'Nsight Systems – רואים על ציר זמן מתי ה-CPU עובד, מתי ה-GPU, ומתי מחכים להעתקות.'], ['--trace=cuda,nvtx', 'מה לעקוב: קריאות CUDA וסימונים שלכם בקוד.'], ['-o timeline', 'שומר timeline.nsys-rep לפתיחה בתוכנה הגרפית.']] },
    { c: 'nvcc', t: 'למצוא גישה לא חוקית לזיכרון', f: ['out'],
      x: function (p, win) { return 'compute-sanitizer ' + (win ? '.\\' + p.out + '.exe' : './' + p.out); },
      e: [['compute-sanitizer', 'מריץ את התוכנית ובודק כל גישה לזיכרון בכרטיס. מראה באיזה קרנל ובאיזה thread הייתה גישה מחוץ לגבולות. איטי, אבל חוסך שעות.']] }
  ];
  var st = T.load(KEY, { i: 0, win: false, p: {} });
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function val(k) { return st.p[k] != null && st.p[k] !== '' ? st.p[k] : F[k][2]; }

  function list() {
    var q = $('pk-q').value.trim().toLowerCase(), cat = '';
    $('pk-list').innerHTML = R.map(function (r, i) {
      if (q && (r.t + ' ' + r.c + ' ' + r.x(defaults(r), st.win)).toLowerCase().indexOf(q) < 0) return '';
      var h = r.c !== cat ? '<li class="cat">' + r.c + '</li>' : ''; cat = r.c;
      return h + '<li><button type="button" data-i="' + i + '"' + (i === st.i ? ' aria-current="true"' : '') + '>' + r.t + '</button></li>';
    }).join('') || '<li class="cat">לא נמצא. נסו מילה אחרת.</li>';
  }
  function defaults(r) { var p = {}; r.f.forEach(function (k) { p[k] = val(k); }); return p; }
  function fields() {
    var r = R[st.i];
    $('pk-f').innerHTML = r.f.map(function (k) {
      var d = F[k], v = esc(val(k));
      if (d[1] === 'select') return '<div class="field"><label for="pk-' + k + '">' + d[0] + '</label><select id="pk-' + k + '" data-k="' + k + '">' +
        d[3].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val(k) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
      return '<div class="field"><label for="pk-' + k + '">' + d[0] + '</label><input id="pk-' + k + '" data-k="' + k + '" type="text" inputmode="' + (d[1] === 'number' ? 'numeric' : 'text') + '" dir="ltr" value="' + v + '"></div>';
    }).join('');
  }
  function render() {
    var r = R[st.i], cmd = r.x(defaults(r), st.win);
    $('pk-t').textContent = r.t;
    $('pk-cmd').textContent = cmd;
    $('pk-e').innerHTML = r.e.map(function (e) { return '<li><code dir="ltr">' + esc(e[0]) + '</code><span>' + esc(e[1]) + '</span></li>'; }).join('');
    $('pk-warn').textContent = r.warn ? '⚠️ ' + r.warn : ''; $('pk-warn').hidden = !r.warn;
    T.wa($('pk-wa'), r.t + ':\n\n' + cmd + '\n\nהסבר על כל חלק: https://hakelim.com/kelim/tichnut/pkudot/');
    T.save(KEY, st);
  }
  function pick(i) { st.i = i; fields(); list(); render(); }

  $('pk-list').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]'); if (!b) return;
    pick(+b.getAttribute('data-i')); T.used('tichnut_pkudot', 'pick');
    if (window.innerWidth < 760) $('pk-t').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('pk-f').addEventListener('input', function (e) { var k = e.target.getAttribute('data-k'); if (k) { st.p[k] = e.target.value.trim(); render(); } });
  $('pk-os').addEventListener('change', function () { st.win = $('pk-win').checked; list(); render(); });
  $('pk-q').addEventListener('input', list);
  $('pk-copy').addEventListener('click', function () {
    try { navigator.clipboard.writeText($('pk-cmd').textContent); $('pk-copy').textContent = 'הועתק ✓'; setTimeout(function () { $('pk-copy').textContent = 'להעתיק'; }, 1500); } catch (e) {}
    T.used('tichnut_pkudot', 'copy');
  });
  $('pk-wa').addEventListener('click', function () { T.used('tichnut_pkudot', 'wa'); });
  $('pk-win').checked = !!st.win; $('pk-lin').checked = !st.win;
  if (!R[st.i]) st.i = 0;
  pick(st.i);
})();
