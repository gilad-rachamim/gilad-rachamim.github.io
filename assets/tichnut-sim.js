// סימולטור ראיון טכני: (1) תרגילי קוד שרצים ב-Web Worker מול בדיקות, עם טיימר, רמזים ופתרון;
// (2) שאלות מהירות – מה שטעיתם בו חוזר שוב בהמשך הסבב. ההתקדמות נשמרת בטלפון.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_sim', $ = function (id) { return document.getElementById(id); };
  var P = window.SIM_CODE, Q = window.SIM_QUIZ;
  var st = T.load(KEY, { tab: 'code', i: 0, code: {}, solved: {}, quiz: {} });
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function save() { T.save(KEY, st); }

  // ---------- טאבים ----------
  function tab(t) {
    st.tab = t; save();
    [].forEach.call(document.querySelectorAll('.sm-tabs button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-t') === t); });
    $('sm-code').hidden = t !== 'code'; $('sm-quiz').hidden = t !== 'quiz';
    if (t === 'quiz' && qs.cur === null) quizStart();
  }
  document.querySelector('.sm-tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-t]'); if (b) tab(b.getAttribute('data-t')); });

  // ---------- קוד ----------
  var timer = null, t0 = 0, hintN = 0, worker = null;
  function starter(p) { return 'function ' + p.fn + '(' + p.args + ') {\n  // your code here\n  \n}\n'; }
  function list() {
    var tag = $('sm-tag').value;
    $('sm-list').innerHTML = P.map(function (p, i) {
      if (tag && p.tag !== tag) return '';
      return '<button type="button" data-i="' + i + '"' + (i === st.i ? ' aria-current="true"' : '') + (st.solved[p.id] ? ' class="ok"' : '') + '>' +
        (st.solved[p.id] ? '✓ ' : '') + p.t + ' <small>' + '★'.repeat(p.lvl) + '</small></button>';
    }).join('');
    $('sm-solved').textContent = Object.keys(st.solved).length + ' מתוך ' + P.length + ' נפתרו';
  }
  function fmt(s) { return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function tick() { var s = Math.floor((Date.now() - t0) / 1000); $('sm-time').textContent = fmt(s); $('sm-time').classList.toggle('late', s > 20 * 60); }
  function pick(i) {
    st.i = i; var p = P[i]; save();
    $('sm-title').textContent = p.t; $('sm-meta').textContent = p.tag + ' · ' + ['', 'קל', 'בינוני', 'קשה'][p.lvl];
    $('sm-q').textContent = p.q;
    $('sm-ex').innerHTML = p.tests.slice(0, 2).map(function (t) { return '<code dir="ltr">' + p.fn + '(' + t[0].map(function (a) { return JSON.stringify(a); }).join(', ') + ') → ' + JSON.stringify(t[1]) + '</code>'; }).join('');
    $('sm-in').value = st.code[p.id] || starter(p);
    $('sm-out').innerHTML = ''; $('sm-hints').innerHTML = ''; $('sm-sol').hidden = true; hintN = 0;
    $('sm-hint').disabled = false; $('sm-hint').textContent = 'רמז (0/' + p.hints.length + ')';
    clearInterval(timer); t0 = Date.now(); tick(); timer = setInterval(tick, 1000);
    list();
  }
  function showSol(p, solved) {
    $('sm-sol').hidden = false;
    $('sm-sol').innerHTML = '<h3>' + (solved ? '✓ פתרתם! ככה נראה פתרון מקובל:' : 'הפתרון:') + '</h3><pre dir="ltr">' + esc(p.sol) + '</pre><p><b>סיבוכיות:</b> <span dir="ltr">' + esc(p.big) + '</span></p><p>' + esc(p.why) + '</p>' +
      '<p><a class="btn btn-line btn-sm" href="/kelim/tichnut/tzaad/#sim=' + p.id + '">▶ לראות את הפתרון רץ צעד אחר צעד</a></p>' +
      '<p class="note">בראיון אמיתי: הסבירו בקול את הרעיון לפני שכותבים, ואמרו את הסיבוכיות בסוף.</p>';
  }
  function runTests() {
    var p = P[st.i], code = $('sm-in').value; st.code[p.id] = code; save();
    if (worker) worker.terminate();
    var src = code + '\n;onmessage=function(e){var T=e.data,R=[];for(var k=0;k<T.length;k++){try{var a=JSON.parse(JSON.stringify(T[k][0]));var r=' + p.fn + '.apply(null,a);R.push({ok:JSON.stringify(r)===JSON.stringify(T[k][1]),got:JSON.stringify(r)});}catch(x){R.push({ok:false,err:String(x&&x.message||x)});}}postMessage(R);};';
    var out = $('sm-out'); out.innerHTML = '<p class="note">מריץ…</p>';
    try { worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))); }
    catch (x) { out.innerHTML = '<p class="sm-bad">לא הצלחתי להריץ: ' + esc(x.message) + '</p>'; return; }
    var killer = setTimeout(function () { worker.terminate(); worker = null; out.innerHTML = '<p class="sm-bad">⏱ הקוד רץ יותר מ-3 שניות – כנראה לולאה אינסופית. בדקו את תנאי העצירה.</p>'; }, 3000);
    worker.onerror = function (e) { clearTimeout(killer); e.preventDefault(); out.innerHTML = '<p class="sm-bad">שגיאה בקוד: ' + esc(e.message) + (e.lineno ? ' (שורה ' + e.lineno + ')' : '') + '</p>'; };
    worker.onmessage = function (e) {
      clearTimeout(killer); worker.terminate(); worker = null;
      var R = e.data, pass = R.filter(function (r) { return r.ok; }).length;
      out.innerHTML = '<p class="' + (pass === R.length ? 'sm-ok' : 'sm-bad') + '">' + pass + ' מתוך ' + R.length + ' בדיקות עברו</p><ul class="sm-tests">' +
        R.map(function (r, k) {
          var t = p.tests[k];
          return '<li class="' + (r.ok ? 'ok' : 'no') + '">' + (r.ok ? '✓' : '✗') + ' <code dir="ltr">' + esc(p.fn + '(' + t[0].map(function (a) { return JSON.stringify(a); }).join(', ') + ')') + '</code>' +
            (r.ok ? '' : ' <span>ציפינו ל-<code dir="ltr">' + esc(JSON.stringify(t[1])) + '</code>, ' + (r.err ? 'נזרקה שגיאה: ' + esc(r.err) : 'קיבלנו <code dir="ltr">' + esc(r.got) + '</code>') + '</span>') + '</li>';
        }).join('') + '</ul>';
      if (pass === R.length) {
        var secs = Math.floor((Date.now() - t0) / 1000);
        if (!st.solved[p.id]) st.solved[p.id] = { t: secs, h: hintN, at: Date.now() };
        if (st.mock && st.mock.code.indexOf(p.id) >= 0 && st.mock.solved[p.id] == null) { st.mock.solved[p.id] = mockSecs(); mockBar(); }
        save();
        clearInterval(timer);
        out.insertAdjacentHTML('beforeend', '<p class="note">זמן: ' + fmt(secs) + ' · רמזים: ' + hintN + '</p>');
        if (st.mock && st.mock.code.indexOf(p.id) >= 0) { out.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-gold btn-sm" id="sm-mnext">לפריט הבא בראיון ←</button>'); $('sm-mnext').onclick = mockNext; }
        showSol(p, true); list(); T.used('tichnut_sim', 'solved');
      } else T.used('tichnut_sim', 'run');
    };
    worker.postMessage(p.tests);
  }
  $('sm-list').addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (b) { pick(+b.getAttribute('data-i')); if (window.innerWidth < 760) $('sm-title').scrollIntoView({ behavior: 'smooth' }); } });
  $('sm-tag').addEventListener('change', list);
  $('sm-run').addEventListener('click', runTests);
  $('sm-in').addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runTests(); }
    if (e.key === 'Tab') { e.preventDefault(); var a = this.selectionStart; this.value = this.value.slice(0, a) + '  ' + this.value.slice(this.selectionEnd); this.selectionStart = this.selectionEnd = a + 2; }
  });
  $('sm-hint').addEventListener('click', function () {
    var p = P[st.i]; if (hintN >= p.hints.length) return;
    $('sm-hints').insertAdjacentHTML('beforeend', '<li>💡 ' + esc(p.hints[hintN]) + '</li>'); hintN++;
    $('sm-hint').textContent = 'רמז (' + hintN + '/' + p.hints.length + ')'; if (hintN >= p.hints.length) $('sm-hint').disabled = true;
    T.used('tichnut_sim', 'hint');
  });
  $('sm-giveup').addEventListener('click', function () { showSol(P[st.i], false); T.used('tichnut_sim', 'giveup'); });
  $('sm-reset').addEventListener('click', function () { var p = P[st.i]; delete st.code[p.id]; save(); $('sm-in').value = starter(p); });
  $('sm-rand').addEventListener('click', function () {
    var left = P.map(function (p, i) { return i; }).filter(function (i) { return !st.solved[P[i].id]; });
    var pool = left.length ? left : P.map(function (p, i) { return i; });
    pick(pool[Math.floor(Math.random() * pool.length)]); T.used('tichnut_sim', 'random');
  });

  // ---------- שאלות מהירות ----------
  var qs = { queue: [], cur: null, right: 0, total: 0, mock: false };
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function quizStart() {
    var topic = $('sm-topic').value, pool = Q.map(function (q, i) { return i; }).filter(function (i) { return !topic || Q[i][0] === topic; });
    // קודם שאלות שטעיתם בהן בעבר
    pool.sort(function (a, b) { return ((st.quiz[b] || {}).w || 0) - ((st.quiz[a] || {}).w || 0); });
    var weak = pool.filter(function (i) { return (st.quiz[i] || {}).w; }).slice(0, 4);
    var rest = shuffle(pool.filter(function (i) { return weak.indexOf(i) < 0; }));
    qs.queue = weak.concat(rest).slice(0, 10); qs.right = 0; qs.total = 0;
    next();
  }
  function next() {
    if (!qs.queue.length) {
      qs.cur = null;
      $('sm-qbox').innerHTML = '<div class="sm-end"><b>' + qs.right + ' / ' + qs.total + '</b><p>' + (qs.right === qs.total ? 'מושלם! 🎉' : 'שאלות שטעיתם בהן יחזרו ראשונות בסבב הבא.') + '</p><button type="button" class="btn btn-gold btn-sm" id="sm-again">עוד סבב</button></div>';
      $('sm-again').onclick = quizStart; stats(); return;
    }
    qs.mock = false;
    var i = qs.queue.shift(); renderQ(i, 'נשארו ' + (qs.queue.length + 1));
  }
  function renderQ(i, label) {
    var q = Q[i]; qs.cur = i;
    var order = shuffle(q[2].map(function (x, k) { return k; }));
    $('sm-qbox').innerHTML = '<p class="sm-qtopic">' + q[0] + ' · ' + label + '</p><h3 class="sm-qq">' + esc(q[1]) + '</h3><div class="sm-opts">' +
      order.map(function (k) { return '<button type="button" data-k="' + k + '">' + esc(q[2][k]) + '</button>'; }).join('') + '</div><div id="sm-qexp"></div>';
  }
  $('sm-qbox').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-k]'); if (!b || qs.cur === null || b.parentNode.classList.contains('done')) return;
    var q = Q[qs.cur], k = +b.getAttribute('data-k'), ok = k === q[3], rec = st.quiz[qs.cur] || { r: 0, w: 0 };
    b.parentNode.classList.add('done');
    [].forEach.call(b.parentNode.children, function (x) { if (+x.getAttribute('data-k') === q[3]) x.classList.add('right'); });
    if (!ok) { b.classList.add('wrong'); rec.w++; if (!qs.mock) qs.queue.splice(Math.min(3, qs.queue.length), 0, qs.cur); } // חוזרת בעוד כמה שאלות
    else { rec.r++; if (rec.w) rec.w--; qs.right++; }
    qs.total++; st.quiz[qs.cur] = rec; save();
    var inMock = qs.mock && st.mock;
    if (inMock && st.mock.ans[qs.cur] == null) { st.mock.ans[qs.cur] = ok; save(); mockBar(); }
    $('sm-qexp').innerHTML = '<p class="' + (ok ? 'sm-ok' : 'sm-bad') + '">' + (ok ? '✓ נכון' : (inMock ? '✗ לא נכון' : '✗ לא נכון – השאלה תחזור עוד מעט')) + '</p><p class="sm-why">' + esc(q[4]) + '</p><button type="button" class="btn btn-gold btn-sm" id="sm-next">' + (inMock ? 'לפריט הבא בראיון ←' : 'הבאה ←') + '</button>';
    $('sm-next').onclick = inMock ? mockNext : next; $('sm-next').focus();
    T.used('tichnut_sim', ok ? 'quiz_right' : 'quiz_wrong');
  });
  function stats() {
    var by = {};
    Q.forEach(function (q, i) { var r = st.quiz[i]; if (!r) return; by[q[0]] = by[q[0]] || [0, 0]; by[q[0]][0] += r.r; by[q[0]][1] += r.r + r.w; });
    $('sm-stats').innerHTML = Object.keys(by).map(function (t) { var p = Math.round(by[t][0] / by[t][1] * 100); return '<li><span>' + t + '</span><b>' + p + '%</b><i style="width:' + p + '%"></i></li>'; }).join('') || '<li><span>עוד אין נתונים – ענו על סבב ראשון.</span></li>';
  }
  $('sm-topic').addEventListener('change', quizStart);
  $('sm-qreset').addEventListener('click', function () { st.quiz = {}; save(); stats(); quizStart(); });

  // ---------- ראיון מדומה: 2 תרגילי קוד + 5 שאלות, שעון אחד של 45 דקות ----------
  var MOCK_SEC = 45 * 60, mockTimer = null;
  function mockSecs() { return st.mock ? Math.floor((Date.now() - st.mock.at) / 1000) : 0; }
  function mockStart() {
    if (st.mock && !confirm('יש ראיון פתוח. להתחיל ראיון חדש במקומו?')) return;
    function one(l) {
      var c = P.filter(function (p) { return p.lvl === l && !st.solved[p.id]; });
      if (!c.length) c = P.filter(function (p) { return p.lvl === l; });
      return c[Math.floor(Math.random() * c.length)].id;
    }
    var seen = {}, qi = [], all = shuffle(Q.map(function (q, i) { return i; }));
    all.forEach(function (i) { if (qi.length < 5 && !seen[Q[i][0]]) { seen[Q[i][0]] = 1; qi.push(i); } }); // נושאים שונים
    all.forEach(function (i) { if (qi.length < 5 && qi.indexOf(i) < 0) qi.push(i); });
    st.mock = { at: Date.now(), code: [one(1), one(2)], q: qi, ans: {}, solved: {}, cur: 0 };
    st.mockLast = null; save();
    $('sm-report').hidden = true;
    clearInterval(mockTimer); mockTimer = setInterval(mockTick, 1000); mockTick();
    mockGo(0); T.used('tichnut_sim', 'mock_start');
  }
  function mockItems() {
    var m = st.mock;
    return m.code.map(function (id) { return { k: 'c', id: id }; }).concat(m.q.map(function (i) { return { k: 'q', i: i }; }));
  }
  function mockDone(it) { var m = st.mock; return it.k === 'c' ? m.solved[it.id] != null : m.ans[it.i] != null; }
  function mockBar() {
    var m = st.mock;
    $('sm-mock').hidden = !m; $('sm-mockrow').hidden = !!m;
    if (!m) return;
    $('sm-mitems').innerHTML = mockItems().map(function (it, n) {
      var lbl = it.k === 'c' ? '💻 קוד ' + (n + 1) : '⚡ שאלה ' + (n - 1), d = mockDone(it);
      return '<button type="button" data-m="' + n + '"' + (n === m.cur ? ' aria-current="true"' : '') + (d ? ' class="ok"' : '') + '>' + (d ? '✓ ' : '') + lbl + '</button>';
    }).join('');
  }
  function mockGo(n) {
    var m = st.mock, it = mockItems()[n]; if (!it) return;
    m.cur = n; save();
    if (it.k === 'c') { tab('code'); for (var i = 0; i < P.length; i++) if (P[i].id === it.id) pick(i); }
    else { tab('quiz'); qs.mock = true; renderQ(it.i, 'ראיון: שאלה ' + (n - 1) + ' מתוך ' + m.q.length + (m.ans[it.i] != null ? ' (כבר עניתם)' : '')); }
    mockBar();
    var tb = document.querySelector('.sm-tabs'); if (tb.getBoundingClientRect().top < 0) tb.scrollIntoView({ behavior: 'smooth' });
  }
  function mockNext() {
    var its = mockItems(), m = st.mock;
    for (var k = 1; k <= its.length; k++) { var n = (m.cur + k) % its.length; if (!mockDone(its[n])) return mockGo(n); }
    mockEnd(false); // הכול נעשה
  }
  function mockTick() {
    if (!st.mock) { clearInterval(mockTimer); return; }
    var left = MOCK_SEC - mockSecs();
    if (left <= 0) return mockEnd(true);
    $('sm-mclock').textContent = fmt(left); $('sm-mclock').classList.toggle('late', left < 5 * 60);
  }
  function mockEnd(timeUp) {
    var m = st.mock; if (!m) return;
    var r = { at: m.at, used: Math.min(mockSecs(), MOCK_SEC), timeUp: !!timeUp,
      code: m.code.map(function (id) { return { id: id, s: m.solved[id] }; }),
      q: m.q.map(function (i) { return { i: i, ok: m.ans[i] }; }) };
    st.mock = null; st.mockLast = r; save(); clearInterval(mockTimer); qs.mock = false; mockBar();
    mockReport(r, true); T.used('tichnut_sim', timeUp ? 'mock_timeup' : 'mock_end');
  }
  function mockReport(r, scroll) {
    var byId = {}; P.forEach(function (p) { byId[p.id] = p; });
    var codeOk = r.code.filter(function (c) { return c.s != null; }).length, qOk = r.q.filter(function (x) { return x.ok; }).length, weak = [];
    r.code.forEach(function (c) { var p = byId[c.id]; if (p && c.s == null && !weak.some(function (w) { return w[1] === p.tag; })) weak.push(['c', p.tag]); });
    r.q.forEach(function (x) { var q = Q[x.i]; if (q && !x.ok && !weak.some(function (w) { return w[1] === q[0]; })) weak.push(['q', q[0]]); });
    var verdict = codeOk === r.code.length && qOk >= 4 ? 'ביצוע חזק. ככה נראה ראיון שעובר 💪'
      : codeOk >= 1 && qOk >= 3 ? 'כיוון טוב. עוד כמה ראיונות מדומים, והביטחון יגיע.'
      : 'זו נקודת התחלה. כל ראיון מדומה מקרב אתכם לראיון האמיתי.';
    $('sm-report').innerHTML = '<h2>📋 דוח הראיון</h2>' + (r.timeUp ? '<p class="sm-bad">⏱ הזמן נגמר, כמו בראיון אמיתי.</p>' : '') +
      '<div class="sm-rnums"><div><b>' + codeOk + '/' + r.code.length + '</b><span>תרגילי קוד</span></div><div><b>' + qOk + '/' + r.q.length + '</b><span>שאלות נכונות</span></div><div><b>' + fmt(r.used) + '</b><span>מתוך 45:00</span></div></div>' +
      '<p class="sm-q">' + verdict + '</p><ul class="sm-tests">' +
      r.code.map(function (c) { var p = byId[c.id]; if (!p) return ''; return '<li class="' + (c.s != null ? 'ok' : 'no') + '">' + (c.s != null ? '✓ ' : '✗ ') + esc(p.t) + ' <span>' + (c.s != null ? '– נפתר אחרי ' + fmt(c.s) + ' מתחילת הראיון' : '– לא נפתר (' + esc(p.tag) + ')') + '</span></li>'; }).join('') +
      r.q.map(function (x) { var q = Q[x.i]; if (!q) return ''; return '<li class="' + (x.ok ? 'ok' : 'no') + '">' + (x.ok ? '✓ ' : x.ok === false ? '✗ ' : '– ') + esc(q[1]) + ' <span>(' + esc(q[0]) + (x.ok == null ? ', לא נענתה' : '') + ')</span></li>'; }).join('') + '</ul>' +
      (weak.length ? '<p class="sm-q"><b>נושאים לחזק</b> (לחיצה פותחת תרגול בנושא):</p><div class="sm-btns">' + weak.map(function (w) { return '<button type="button" class="btn btn-line btn-sm" data-wk="' + w[0] + '" data-wt="' + esc(w[1]) + '">' + (w[0] === 'c' ? '💻 ' : '⚡ ') + esc(w[1]) + '</button>'; }).join('') + '</div>' : '<p class="sm-q"><b>אין נושא חלש בסבב הזה.</b> נסו עוד ראיון: התרגילים יהיו אחרים.</p>') +
      '<p class="note">בראיון אמיתי בודקים גם איך מדברים: אומרים את הרעיון בקול לפני הקוד, ואת הסיבוכיות בסוף. הכנה לנושאים: <a class="gold" href="/kelim/tichnut/reayon-tech/">18 נושאים לראיון</a>.</p>' +
      '<p class="note">💛 הסימולטור חינמי ובלי פרסומות, ואני משלם עליו מהכיס. אם הוא עזר לכם, אפשר <a class="gold" href="/kelim/tichnut/#shutafim">להיות שותפים</a> או לשלוח אותו לחבר שמתכונן לראיון.</p>' +
      '<div class="sm-btns"><button type="button" class="btn btn-gold btn-sm" id="sm-mockagain">🎯 ראיון חדש</button><button type="button" class="btn btn-line btn-sm" id="sm-rclose">לסגור את הדוח</button></div>';
    $('sm-report').hidden = false;
    if (scroll) $('sm-report').scrollIntoView({ behavior: 'smooth' });
  }
  $('sm-mockgo').addEventListener('click', mockStart);
  $('sm-mend').addEventListener('click', function () { if (confirm('לסיים את הראיון ולראות דוח?')) mockEnd(false); });
  $('sm-mitems').addEventListener('click', function (e) { var b = e.target.closest('button[data-m]'); if (b) mockGo(+b.getAttribute('data-m')); });
  $('sm-report').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 'sm-mockagain') return mockStart();
    if (b.id === 'sm-rclose') { st.mockLast = null; save(); $('sm-report').hidden = true; return; }
    var k = b.getAttribute('data-wk'), t = b.getAttribute('data-wt'); if (!k) return;
    if (k === 'q') { $('sm-topic').value = t; tab('quiz'); quizStart(); } else { $('sm-tag').value = t; list(); tab('code'); }
    document.querySelector('.sm-tabs').scrollIntoView({ behavior: 'smooth' });
  });

  // ---------- התחלה ----------
  var topics = [], tags = [];
  Q.forEach(function (q) { if (topics.indexOf(q[0]) < 0) topics.push(q[0]); });
  P.forEach(function (p) { if (tags.indexOf(p.tag) < 0) tags.push(p.tag); });
  $('sm-topic').innerHTML = '<option value="">כל הנושאים (' + Q.length + ')</option>' + topics.map(function (t) { return '<option>' + t + '</option>'; }).join('');
  $('sm-tag').innerHTML = '<option value="">כל התרגילים (' + P.length + ')</option>' + tags.map(function (t) { return '<option>' + t + '</option>'; }).join('');
  $('sm-qn').textContent = Q.length; $('sm-pn').textContent = P.length;
  pick(st.i < P.length ? st.i : 0); stats();
  var h = location.hash.replace('#', ''); tab(h === 'quiz' || h === 'code' ? h : st.tab);
  if (st.mock) { mockBar(); mockTimer = setInterval(mockTick, 1000); mockTick(); } else if (st.mockLast) mockReport(st.mockLast, false);
  window.TICHNUT.simRun = runTests;
})();
