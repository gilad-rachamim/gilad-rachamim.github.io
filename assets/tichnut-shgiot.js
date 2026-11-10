// מסביר שגיאות Python, PyTorch ו-CUDA בעברית: מזהה את השגיאה לפי תבניות, מוצא באיזה קובץ ושורה, ומסביר מה לבדוק.
// הכול רץ בדפדפן מתוך מילון קבוע – שום דבר לא נשלח לשרת ולא ל-AI.
(function () {
  var T = window.TICHNUT, $ = function (id) { return document.getElementById(id); };
  // [תבנית, כותרת, מה קרה, מה לבדוק (מופרד ב-|), דוגמת תיקון, קישור לכלי]
  var D = [
    // ---- CUDA / PyTorch ----
    [/CUDA out of memory|OutOfMemoryError|cudaErrorMemoryAllocation|CUBLAS_STATUS_ALLOC_FAILED/i, 'נגמר הזיכרון בכרטיס המסך (VRAM)',
      'התוכנה ביקשה מהכרטיס יותר זיכרון ממה שיש לו פנוי. זה קורה כשהמודל, ה-batch או ההקשר גדולים מדי, או כשתהליך אחר כבר תופס את הזיכרון.',
      'להקטין את batch size (למשל חצי)|לטעון את המודל בדיוק נמוך יותר: FP16, 8-bit או 4-bit|להריץ nvidia-smi ולבדוק אם תהליך אחר תופס זיכרון|בהרצה (לא אימון) לעטוף ב-torch.no_grad()|לקצר את אורך ההקשר (max_length)',
      'with torch.no_grad():\n    out = model(x)\ntorch.cuda.empty_cache()', ['/kelim/tichnut/vram/', 'מחשבון VRAM – כמה זיכרון צריך']],
    [/device-side assert triggered/i, 'בדיקה נכשלה בתוך הכרטיס (device-side assert)',
      'משהו בתוך קוד שרץ על ה-GPU נכשל. כמעט תמיד זה אינדקס מחוץ לטווח – למשל תווית (label) גדולה ממספר המחלקות, או טוקן שלא קיים במילון.',
      'לבדוק שכל ה-labels בין 0 למספר המחלקות פחות 1|להריץ עם CUDA_LAUNCH_BLOCKING=1 כדי לראות את השורה האמיתית|להריץ פעם אחת על CPU – שם השגיאה ברורה יותר|אחרי השגיאה הזאת צריך להפעיל מחדש את התוכנית (או את ה-kernel במחברת)',
      'import os\nos.environ["CUDA_LAUNCH_BLOCKING"] = "1"  # לפני import torch\nprint(labels.min(), labels.max(), num_classes)'],
    [/Expected all tensors to be on the same device|found at least two devices/i, 'טנזורים על מכשירים שונים (CPU מול GPU)',
      'ניסיתם לחשב משהו בין טנזור שנמצא בכרטיס המסך (cuda) לטנזור שנמצא במעבד (cpu). הם חייבים להיות באותו מקום.',
      'להעביר גם את המודל וגם את הקלט לאותו device|לחפש טנזור שנוצר בתוך הקוד בלי device=|לבדוק עם print(x.device, next(model.parameters()).device)',
      'device = "cuda" if torch.cuda.is_available() else "cpu"\nmodel = model.to(device)\nx = x.to(device)'],
    [/shapes cannot be multiplied|size mismatch|mat1 and mat2/i, 'הממדים של הטנזורים לא מתאימים',
      'בכפל מטריצות, מספר העמודות של הראשונה חייב להיות שווה למספר השורות של השנייה. בדרך כלל השכבה מצפה לגודל קלט אחר ממה שהגיע אליה.',
      'להדפיס x.shape לפני השכבה שנכשלה|לבדוק את in_features של שכבת ה-Linear|אחרי Conv לפעמים שוכחים flatten|אם זה בטעינת משקלות – המודל לא בנוי בדיוק כמו המודל ששמר אותם',
      'print(x.shape)          # למשל [32, 512]\nself.fc = nn.Linear(512, 10)  # in_features = 512'],
    [/Torch not compiled with CUDA enabled|no CUDA GPUs are available|Found no NVIDIA driver|CUDA driver version is insufficient|cuda\.is_available\(\)\s*(==|returns?|is)\s*False/i, 'PyTorch לא רואה את כרטיס המסך',
      'או שהותקנה גרסת PyTorch בלי תמיכה ב-CUDA (גרסת CPU), או שהדרייבר של NVIDIA ישן או חסר.',
      'להריץ nvidia-smi – אם זה לא עובד, הבעיה בדרייבר|להתקין PyTorch מחדש עם הפקודה לגרסת CUDA מהאתר pytorch.org|לבדוק python -c "import torch; print(torch.version.cuda)" – None אומר גרסת CPU|לעדכן את הדרייבר של NVIDIA',
      'pip uninstall torch\npip install torch --index-url https://download.pytorch.org/whl/cu124'],
    [/no kernel image is available|sm_\d+ is not compatible|unsupported gpu architecture/i, 'הקוד לא נבנה בשביל הדור של הכרטיס שלכם',
      'הספרייה קומפלה בשביל Compute Capability אחר. זה קורה עם כרטיס חדש מאוד (למשל RTX 50) וגרסה ישנה של PyTorch, או עם כרטיס ישן מאוד שכבר לא נתמך.',
      'לעדכן את PyTorch לגרסה חדשה שתומכת בכרטיס|לבדוק את ה-Compute Capability של הכרטיס|בקומפילציה עם nvcc להוסיף -arch=sm_XX המתאים',
      'nvcc -arch=sm_89 kernel.cu -o kernel   # 8.9 = RTX 40', ['/kelim/tichnut/gpu/', 'השוואת כרטיסים – ה-CC של כל כרטיס']],
    [/illegal memory access|misaligned address|unspecified launch failure/i, 'גישה לא חוקית לזיכרון בכרטיס',
      'הקוד שרץ על ה-GPU ניסה לקרוא או לכתוב מחוץ לזיכרון שהוקצה לו. בקרנל שכתבתם – בדרך כלל אינדקס שלא נבדק מול הגודל.',
      'בקרנל: if (i < n) לפני כל גישה למערך|להריץ compute-sanitizer ./program כדי למצוא את השורה|להריץ עם CUDA_LAUNCH_BLOCKING=1',
      '__global__ void add(float* a, int n) {\n  int i = blockIdx.x * blockDim.x + threadIdx.x;\n  if (i < n) a[i] += 1.0f;\n}'],
    [/too many resources requested for launch/i, 'הקרנל מבקש יותר מדי משאבים',
      'גודל הבלוק כפול כמות הרגיסטרים לכל thread גדול ממה שה-SM יכול לתת.',
      'להקטין את מספר ה-threads בבלוק (למשל 256 במקום 1024)|להגביל רגיסטרים עם __launch_bounds__ או -maxrregcount',
      '__global__ void __launch_bounds__(256) myKernel(...)', ['/kelim/tichnut/occupancy/', 'מחשבון Occupancy – כמה משאבים יש']],
    [/invalid device ordinal/i, 'מספר כרטיס שלא קיים',
      'ביקשתם כרטיס (למשל cuda:1) שלא קיים במחשב, או ש-CUDA_VISIBLE_DEVICES מסתיר אותו.',
      'להריץ nvidia-smi ולראות כמה כרטיסים יש|לבדוק את CUDA_VISIBLE_DEVICES|להשתמש ב-cuda:0 אם יש כרטיס אחד', 'print(torch.cuda.device_count())'],
    [/CUDNN_STATUS|cuDNN error/i, 'שגיאה בספריית cuDNN',
      'cuDNN היא הספרייה של NVIDIA לרשתות נוירונים. לרוב זו בעצם בעיית זיכרון, או אי-התאמה בין גרסאות.',
      'קודם לנסות batch קטן יותר|לבדוק שגרסאות PyTorch ו-CUDA מתאימות|לנסות torch.backends.cudnn.benchmark = False', 'torch.backends.cudnn.benchmark = False'],
    [/NCCL (error|WARN)|ProcessGroupNCCL/i, 'שגיאה בתקשורת בין כרטיסים (NCCL)',
      'NCCL מחברת בין כמה כרטיסים באימון מבוזר. השגיאה אומרת שהכרטיסים לא הצליחו לדבר זה עם זה, או שאחד מהם נפל.',
      'לבדוק שכל התהליכים רצים עם אותו world_size|להריץ עם NCCL_DEBUG=INFO לפרטים|לבדוק אם אחד התהליכים נפל קודם עם שגיאה אחרת (למשל זיכרון)', 'NCCL_DEBUG=INFO torchrun --nproc_per_node=2 train.py'],
    [/expected scalar type (\w+) but found (\w+)|Input type \(.*\) and weight type \(.*\) should be the same/i, 'סוגי מספרים לא תואמים (dtype)',
      'חלק מהחישוב ב-float32 וחלק ב-float16 (או double). PyTorch לא מערבב לבד.',
      'להמיר את הקלט לאותו dtype של המודל|לשים לב ש-numpy יוצר float64 – צריך .float()|באימון ב-FP16 להשתמש ב-torch.autocast',
      'x = x.to(model.dtype)\n# או\nx = torch.from_numpy(arr).float()'],
    [/does not require grad and does not have a grad_fn/i, 'אין גרדיאנט לחשב',
      'קראתם ל-backward() על תוצאה שלא מחוברת לשום פרמטר שמתאמן – למשל כי הכול רץ בתוך no_grad, או שהפרמטרים קפואים.',
      'לוודא שאין torch.no_grad() סביב שלב האימון|לבדוק requires_grad של הפרמטרים|לא להמיר ל-numpy באמצע החישוב', 'model.train()\nfor p in model.parameters():\n    p.requires_grad = True'],
    [/backward through the graph a second time/i, 'backward פעמיים על אותו חישוב',
      'אחרי backward() PyTorch מוחק את הגרף כדי לחסוך זיכרון. ניסיתם להשתמש בו שוב.',
      'לחשב את ה-loss מחדש בכל צעד|אם צריך באמת פעמיים – retain_graph=True|לבדוק שאין משתנה ששומר תוצאה מצעד קודם (צריך .detach())', 'hidden = hidden.detach()'],
    // ---- Python ----
    [/IndentationError|TabError|unexpected indent|unindent does not match/i, 'בעיית הזחה (רווחים בתחילת שורה)',
      'ב-Python הרווחים בתחילת השורה הם חלק מהקוד. שורה זזה ברווח אחד, או שעירבבו טאבים ורווחים.',
      'לבדוק את השורה שבשגיאה ואת זו שלפניה|להשתמש רק ברווחים – 4 לכל רמה|בעורך: "המרת טאבים לרווחים"', 'def hello():\n    print("שלום")   # 4 רווחים'],
    [/unterminated string|EOL while scanning string|EOF while scanning/i, 'מחרוזת שלא נסגרה',
      'פתחתם מירכאות ולא סגרתם אותן באותה שורה.', 'לחפש " או \' בלי זוג|לטקסט על כמה שורות להשתמש ב-""" """', 'text = """שורה ראשונה\nשורה שנייה"""'],
    [/expected ':'/i, 'חסרות נקודתיים (:)',
      'אחרי if, for, while, def, class ו-else חייבות לבוא נקודתיים.', 'לבדוק את סוף השורה שבשגיאה', 'if x > 5:\n    print(x)'],
    [/unexpected EOF|was never closed|'\(' was never closed/i, 'סוגריים שלא נסגרו',
      'פתחתם ( או [ או { ולא סגרתם. Python מגלה את זה רק בסוף, לכן השורה בשגיאה לפעמים אחרי המקום האמיתי.', 'לספור סוגריים בשורה שבשגיאה ובשורות שלפניה', 'print(sum([1, 2, 3]))'],
    [/SyntaxError/i, 'שגיאת תחביר',
      'Python לא מצליח לקרוא את השורה. בדרך כלל חסר סימן, יש סימן מיותר, או מילה במקום לא נכון.',
      'להסתכל על החץ ^ שמסמן את המקום|לבדוק את השורה שלפני|לבדוק = מול == בתנאים|מירכאות "חכמות" שהועתקו מוורד', ''],
    [/ModuleNotFoundError|No module named/i, 'הספרייה לא מותקנת',
      'ה-import מחפש ספרייה שלא קיימת בסביבת ה-Python שמריצה את הקוד.',
      'להתקין: pip install <שם>|לבדוק שה-pip וה-python הם מאותה סביבה (python -m pip install)|לפעמים שם החבילה שונה: cv2 → opencv-python, sklearn → scikit-learn, PIL → pillow',
      'python -m pip install opencv-python'],
    [/ImportError: cannot import name/i, 'אין דבר כזה בספרייה',
      'הספרייה מותקנת, אבל השם שביקשתם לא קיים בה – לרוב כי הגרסה ישנה או חדשה מדי, או כי הקובץ שלכם נקרא כמו הספרייה.',
      'לבדוק את הגרסה: pip show <שם>|לוודא שאין לכם קובץ בשם torch.py / numpy.py בתיקייה|לבדוק בתיעוד של הגרסה שמותקנת', 'pip show transformers'],
    [/'NoneType' object (has no attribute|is not subscriptable)/i, 'משתנה ריק (None)',
      'ציפיתם שמשתנה יכיל משהו, אבל הוא None. בדרך כלל פונקציה שלא מחזירה כלום (שכחו return), או חיפוש שלא מצא.',
      'לבדוק שיש return בפונקציה|list.sort() ו-append מחזירים None – לא להציב את התוצאה|להדפיס את המשתנה לפני השורה שנכשלה', 'nums.sort()      # נכון\n# nums = nums.sort()  # שגוי: nums הופך ל-None'],
    [/AttributeError/i, 'אין לאובייקט תכונה כזאת',
      'ניסיתם להשתמש ב-.משהו שלא קיים על האובייקט – טעות כתיב, או שהמשתנה מסוג אחר ממה שחשבתם.',
      'לבדוק כתיב (אותיות גדולות וקטנות)|print(type(x)) כדי לראות מה זה באמת|dir(x) מראה את כל התכונות', 'print(type(x))\nprint(dir(x))'],
    [/NameError/i, 'שם שלא מוגדר',
      'השתמשתם במשתנה או בפונקציה שעוד לא הוגדרו – טעות כתיב, או שההגדרה מופיעה אחרי השימוש.',
      'לבדוק כתיב|לוודא שההגדרה למעלה|במחברת: להריץ קודם את התא שמגדיר|לא לשכוח import', ''],
    [/takes \d+ positional arguments? but \d+ (were|was) given|missing \d+ required positional argument/i, 'מספר פרמטרים לא נכון',
      'קראתם לפונקציה עם יותר או פחות ערכים ממה שהיא מצפה. במתודה של מחלקה – לרוב שכחו self.',
      'להשוות בין ההגדרה (def) לקריאה|במחלקה: הפרמטר הראשון הוא self', 'class A:\n    def run(self, x):   # self!\n        return x'],
    [/can only concatenate str|unsupported operand type|must be str, not/i, 'פעולה בין סוגים שלא מתאימים',
      'למשל חיבור של טקסט ומספר. Python לא ממיר לבד.', 'להמיר עם str() או int()|להשתמש ב-f-string', 'print(f"יש {n} כלים")'],
    [/is not callable/i, 'קריאה למשהו שאינו פונקציה',
      'שמתם () אחרי משתנה שאינו פונקציה – לרוב כי דרסתם שם של פונקציה (למשל list = [...] ואז list()).',
      'לחפש משתנה בשם של פונקציה מובנית: list, str, dict, sum, max|לבדוק שלא כתבתם x(1) במקום x[1]', ''],
    [/is not subscriptable/i, 'שימוש בסוגריים מרובעים על משהו שאינו רשימה',
      'כתבתם x[0] על מספר, פונקציה או אובייקט שלא תומך בזה.', 'print(type(x))|אולי התכוונתם ל-x(0)?', ''],
    [/KeyError/i, 'מפתח שלא קיים במילון',
      'ביקשתם מהמילון (dict) מפתח שאין בו. שימו לב לאותיות גדולות/קטנות ולרווחים.',
      'להדפיס d.keys()|להשתמש ב-d.get("key") שמחזיר None במקום לקרוס|ב-pandas: לבדוק df.columns', 'value = d.get("name", "ברירת מחדל")'],
    [/IndexError|index out of range|out of bounds/i, 'אינדקס מחוץ לטווח',
      'ביקשתם איבר במקום שלא קיים – למשל [5] ברשימה של 5 איברים (הספירה מתחילה מ-0).',
      'האיבר האחרון הוא len(x)-1 או x[-1]|לבדוק שהרשימה לא ריקה|בלולאה: range(len(x))', 'if items:\n    last = items[-1]'],
    [/invalid literal for int\(\)|could not convert string to float/i, 'טקסט שלא אפשר להפוך למספר',
      'ניסיתם להמיר טקסט כמו "12a", "" או "3.5" (ל-int) למספר.', 'להדפיס את הטקסט עם repr() – לפעמים יש רווח או ירידת שורה|להשתמש ב-.strip()|למספר עשרוני: float()', 'n = int(text.strip())'],
    [/too many values to unpack|not enough values to unpack/i, 'מספר משתנים לא תואם למספר הערכים',
      'בפירוק כמו a, b = x – מספר המשתנים משמאל חייב להיות כמו מספר האיברים.', 'להדפיס את x|בלולאה על dict צריך .items()', 'for key, value in d.items():\n    print(key, value)'],
    [/ZeroDivisionError/i, 'חלוקה באפס', 'המכנה יצא 0.', 'לבדוק לפני החלוקה|לחפש רשימה ריקה כשמחשבים ממוצע', 'avg = total / len(x) if x else 0'],
    [/FileNotFoundError|No such file or directory/i, 'הקובץ לא נמצא',
      'הנתיב לא מוביל לקובץ. לרוב כי התוכנית רצה מתיקייה אחרת ממה שחשבתם.', 'print(os.getcwd()) – מאיפה זה רץ|להשתמש בנתיב מלא|ב-Windows: r"C:\\..." או /', 'from pathlib import Path\np = Path(__file__).parent / "data.csv"'],
    [/PermissionError|Access is denied/i, 'אין הרשאה לקובץ', 'הקובץ פתוח בתוכנה אחרת (למשל Excel), או שאין הרשאת כתיבה לתיקייה.', 'לסגור את הקובץ בתוכנות אחרות|לשמור לתיקייה אחרת', ''],
    [/UnicodeDecodeError|UnicodeEncodeError|codec can't (de|en)code/i, 'בעיית קידוד (עברית!)',
      'הקובץ או הטקסט בקידוד אחר ממה ש-Python ניחש. קורה הרבה עם עברית ב-Windows.', 'לפתוח קבצים עם encoding="utf-8"|לקובץ מ-Excel ישן לנסות "cp1255"|במסוף של Windows: set PYTHONIOENCODING=utf-8', 'open("data.txt", encoding="utf-8")'],
    [/JSONDecodeError/i, 'JSON לא תקין', 'הטקסט שניסיתם לקרוא כ-JSON שבור, או ריק בכלל (למשל שרת שהחזיר שגיאה).', 'להדפיס את הטקסט לפני json.loads|להדביק אותו במסדר ה-JSON', 'print(resp.status_code, resp.text[:200])', ['/kelim/tichnut/json/', 'מסדר JSON – מראה איפה השגיאה']],
    [/RecursionError|maximum recursion depth/i, 'פונקציה שקוראת לעצמה בלי סוף', 'ברקורסיה חסר תנאי עצירה, או שהוא אף פעם לא מתקיים.', 'לבדוק את תנאי העצירה|לשקול לולאה במקום רקורסיה', 'def f(n):\n    if n <= 0:\n        return 0   # תנאי עצירה\n    return n + f(n - 1)']
  ];
  var EX = {
    oom: 'Traceback (most recent call last):\n  File "train.py", line 42, in <module>\n    loss = model(batch).loss\ntorch.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.00 GiB. GPU 0 has a total capacity of 7.75 GiB of which 1.12 GiB is free.',
    dev: 'Traceback (most recent call last):\n  File "app.py", line 18, in predict\n    y = model(x)\nRuntimeError: Expected all tensors to be on the same device, but found at least two devices, cuda:0 and cpu!',
    none: 'Traceback (most recent call last):\n  File "main.py", line 7, in <module>\n    print(names[0])\nTypeError: \'NoneType\' object is not subscriptable',
    mod: 'Traceback (most recent call last):\n  File "cam.py", line 1, in <module>\n    import cv2\nModuleNotFoundError: No module named \'cv2\''
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // קטעי קוד באנגלית בתוך משפט בעברית – עוטפים ב-bdi כדי שלא יתהפכו
  function bidi(s) {
    var out = '', at = 0, re = /\(?[A-Za-z_](?:[^֐-׿]*[A-Za-z0-9_)\]])?/g, m;
    while ((m = re.exec(s))) { out += esc(s.slice(at, m.index)) + '<bdi dir="ltr">' + esc(m[0]) + '</bdi>'; at = m.index + m[0].length; }
    return out + esc(s.slice(at));
  }
  function where(text) {
    var re = /File "([^"]+)", line (\d+)(?:, in (\S+))?/g, m, last = null;
    while ((m = re.exec(text))) { if (!/site-packages|dist-packages|[\\/]lib[\\/]python|<frozen/.test(m[1])) last = m; }
    return last;
  }
  function lastLine(text) {
    var ls = text.trim().split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    for (var i = ls.length - 1; i >= 0; i--) if (/^[\w.]*(Error|Exception|Interrupt)\b|^error:|^RuntimeError/.test(ls[i])) return ls[i];
    return ls[ls.length - 1] || '';
  }
  function run(track) {
    var text = $('sh-in').value, box = $('sh-out');
    if (!text.trim()) { box.innerHTML = ''; return; }
    var hits = D.filter(function (d) { return d[0].test(text); });
    // המילון מסודר מהספציפי לכללי – לוקחים את ההתאמה הראשונה
    hits = hits.slice(0, 1);
    var w = where(text), ll = lastLine(text), html = '';
    if (w) html += '<p class="sh-where">📍 המקום בקוד שלכם: <b dir="ltr">' + esc(w[1].split(/[\\/]/).pop()) + '</b>, שורה <b>' + w[2] + '</b>' + (w[3] && w[3] !== '<module>' ? ', בפונקציה <b dir="ltr">' + esc(w[3]) + '</b>' : '') + '</p>';
    if (ll) html += '<p class="sh-last" dir="ltr">' + esc(ll) + '</p>';
    if (!hits.length) {
      html += '<div class="sh-card"><h3>לא זיהיתי את השגיאה הזאת</h3><p>הטיפ הכי חשוב: קוראים את השורה האחרונה של השגיאה (היא למעלה), ואת השורה בקוד שלכם שמסומנת ב-📍. אם זה עדיין לא ברור – מחפשים את השורה האחרונה בגוגל, במירכאות.</p></div>';
    }
    hits.forEach(function (d) {
      html += '<div class="sh-card"><h3>' + d[1] + '</h3><p>' + d[2] + '</p><h4>מה לבדוק</h4><ol>' +
        d[3].split('|').map(function (s) { return '<li>' + bidi(s) + '</li>'; }).join('') + '</ol>' +
        (d[4] ? '<h4>דוגמה</h4><pre dir="ltr">' + esc(d[4]) + '</pre>' : '') +
        (d[5] ? '<a class="btn btn-line btn-sm" href="' + d[5][0] + '">' + d[5][1] + ' ←</a>' : '') + '</div>';
    });
    box.innerHTML = html;
    var sum = hits.length ? hits.map(function (d) { return d[1] + '\n' + d[3].split('|').map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n'); }).join('\n\n') : '';
    T.wa($('sh-wa'), (ll ? ll + '\n\n' : '') + sum + '\n\nהסבר בעברית: https://hakelim.com/kelim/tichnut/shgiot/');
    if (track) T.used('tichnut_shgiot', hits.length ? 'add' : 'miss');
  }
  $('sh-go').addEventListener('click', function () { run(true); });
  $('sh-in').addEventListener('input', function () { run(false); });
  $('sh-in').addEventListener('paste', function () { setTimeout(function () { run(true); }, 0); });
  $('sh-ex').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-ex]'); if (!b) return;
    $('sh-in').value = EX[b.getAttribute('data-ex')]; run(false); T.used('tichnut_shgiot', 'example');
  });
  $('sh-wa').addEventListener('click', function () { T.used('tichnut_shgiot', 'wa'); });
  $('sh-clear').addEventListener('click', function () { $('sh-in').value = ''; run(false); $('sh-in').focus(); });
  $('sh-n').textContent = D.length;
  $('sh-in').value = EX.oom; run(false);
})();
