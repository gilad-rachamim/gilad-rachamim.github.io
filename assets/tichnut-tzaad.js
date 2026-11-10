// מריץ צעד אחר צעד: מפרק את הקוד עם acorn, מוסיף לפני כל שורה "צילום" של המשתנים,
// מריץ ב-Web Worker מבודד, ומציג את הריצה צעד אחרי צעד: שורה, משתנים, מערכים, מחסנית קריאות ופלט.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_tzaad', $ = function (id) { return document.getElementById(id); };
  var CAP = 2000, TIMEOUT = 4000;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var EX = [
    ['חיפוש בינארי', "function binarySearch(arr, target) {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = Math.floor((lo + hi) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}\n\nbinarySearch([2, 5, 8, 12, 16, 23, 38, 56, 72, 91], 23);\n"],
    ['מיון בועות', "function bubbleSort(arr) {\n  for (let i = 0; i < arr.length - 1; i++) {\n    for (let j = 0; j < arr.length - 1 - i; j++) {\n      if (arr[j] > arr[j + 1]) {\n        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];\n      }\n    }\n  }\n  return arr;\n}\n\nbubbleSort([5, 1, 4, 2, 8]);\n"],
    ['עצרת ברקורסיה', "function factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}\n\nconsole.log(factorial(5));\n"],
    ['פיבונאצ׳י עם זיכרון', "function fib(n, memo = new Map()) {\n  if (n <= 1) return n;\n  if (memo.has(n)) return memo.get(n);\n  const value = fib(n - 1, memo) + fib(n - 2, memo);\n  memo.set(n, value);\n  return value;\n}\n\nfib(6);\n"],
    ['היפוך בשני מצביעים', "function reverse(arr) {\n  let left = 0, right = arr.length - 1;\n  while (left < right) {\n    const tmp = arr[left];\n    arr[left] = arr[right];\n    arr[right] = tmp;\n    left++;\n    right--;\n  }\n  return arr;\n}\n\nreverse(['a', 'b', 'c', 'd', 'e']);\n"],
    ['ספירת תווים', "function countChars(s) {\n  const count = {};\n  for (const ch of s) {\n    count[ch] = (count[ch] || 0) + 1;\n  }\n  return count;\n}\n\nconsole.log(countChars('banana'));\n"]
  ];

  // ---------- הכנסת "צילומים" לקוד ----------
  function isFn(n) { return n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression'; }
  function eachChild(n, f) {
    for (var k in n) {
      if (k === 'loc' || k === 'type' || k === 'start' || k === 'end') continue;
      var v = n[k];
      if (Array.isArray(v)) v.forEach(function (x) { if (x && typeof x.type === 'string') f(x); });
      else if (v && typeof v.type === 'string') f(v);
    }
  }
  function patNames(p, out) {
    if (!p) return;
    if (p.type === 'Identifier') out.push(p.name);
    else if (p.type === 'ObjectPattern') p.properties.forEach(function (q) { patNames(q.type === 'RestElement' ? q.argument : q.value, out); });
    else if (p.type === 'ArrayPattern') p.elements.forEach(function (e) { patNames(e, out); });
    else if (p.type === 'RestElement') patNames(p.argument, out);
    else if (p.type === 'AssignmentPattern') patNames(p.left, out);
  }
  function varNames(n, out) { // var שמוגדרים בתוך פונקציה (בלי פונקציות פנימיות)
    if (!n || isFn(n)) return;
    if (n.type === 'VariableDeclaration' && n.kind === 'var') n.declarations.forEach(function (d) { patNames(d.id, out); });
    eachChild(n, function (c) { varNames(c, out); });
  }
  function blockNames(stmts) {
    var out = [];
    stmts.forEach(function (s) {
      if (s.type === 'VariableDeclaration' && s.kind !== 'var') s.declarations.forEach(function (d) { patNames(d.id, out); });
      else if ((s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') && s.id) out.push(s.id.name);
    });
    return out;
  }
  function loopScope(init) { var out = []; if (init && init.type === 'VariableDeclaration' && init.kind !== 'var') init.declarations.forEach(function (d) { patNames(d.id, out); }); return out; }

  function instrument(src) {
    var ast = acorn.parse(src, { ecmaVersion: 'latest', locations: true, preserveParens: true });
    var ins = [];
    function add(p, t, k) { ins.push({ p: p, t: t, k: k, s: ins.length }); }
    function snap(scopes) {
      var names = [];
      scopes.forEach(function (s) { s.forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); }); });
      return 'function(){var __o={};' + names.map(function (n) { return 'try{__o[' + JSON.stringify(n) + ']=' + n + '}catch(__q){}'; }).join('') + 'return __o}';
    }
    function step(s, scopes) { return '__s(' + s.loc.start.line + ',' + snap(scopes) + ');'; }
    function stmtList(list, scopes, d) {
      list.forEach(function (s) {
        if (s.type !== 'FunctionDeclaration' && s.type !== 'ClassDeclaration' && s.type !== 'EmptyStatement') add(s.start, step(s, scopes), d);
        walk(s, scopes, d + 1);
      });
    }
    function wrap(s, scopes, d) { // גוף של if / לולאה שאולי אינו בלוק
      if (s.type === 'BlockStatement') return walk(s, scopes, d);
      add(s.start, '{' + (s.type === 'EmptyStatement' ? '' : step(s, scopes)), d);
      add(s.end, '}', -1000 - d);
      walk(s, scopes, d + 1);
    }
    function doFn(n, hint, d) {
      var params = []; n.params.forEach(function (p) { patNames(p, params); });
      n.params.forEach(function (p) { walk(p, [params], d + 1); });
      var name = JSON.stringify((n.id && n.id.name) || hint || 'פונקציה'), L = n.loc.start.line;
      if (n.body.type === 'BlockStatement') {
        var sc = params.slice(); varNames(n.body, sc); sc = sc.concat(blockNames(n.body.body));
        if (!n.body.body.length) { add(n.body.start + 1, '__e(' + name + ',' + L + ');__x();', d); return; }
        add(n.body.start + 1, '__e(' + name + ',' + L + ');try{', d);
        add(n.body.end - 1, '}finally{__x()}', -1000 - d);
        stmtList(n.body.body, [sc], d + 1);
      } else {
        add(n.body.start, '{__e(' + name + ',' + L + ');try{return __r(' + n.body.loc.start.line + ',(', d);
        add(n.body.end, '))}finally{__x()}}', -1000 - d);
        walk(n.body, [params], d + 1);
      }
    }
    function walk(n, scopes, d, hint) {
      if (!n) return;
      switch (n.type) {
        case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': return doFn(n, hint, d);
        case 'BlockStatement': return stmtList(n.body, scopes.concat([blockNames(n.body)]), d);
        case 'SwitchStatement':
          walk(n.discriminant, scopes, d);
          var all = []; n.cases.forEach(function (c) { all = all.concat(c.consequent); });
          var ss = scopes.concat([blockNames(all)]);
          n.cases.forEach(function (c) { if (c.test) walk(c.test, ss, d); stmtList(c.consequent, ss, d + 1); });
          return;
        case 'IfStatement': walk(n.test, scopes, d); wrap(n.consequent, scopes, d + 1); if (n.alternate) wrap(n.alternate, scopes, d + 1); return;
        case 'ForStatement':
          var s2 = scopes.concat([loopScope(n.init)]);
          walk(n.init, s2, d); walk(n.test, s2, d); walk(n.update, s2, d); wrap(n.body, s2, d + 1); return;
        case 'ForInStatement': case 'ForOfStatement':
          var s3 = scopes.concat([loopScope(n.left)]);
          walk(n.left, s3, d); walk(n.right, scopes, d); wrap(n.body, s3, d + 1); return;
        case 'WhileStatement': walk(n.test, scopes, d); wrap(n.body, scopes, d + 1); return;
        case 'DoWhileStatement': wrap(n.body, scopes, d + 1); walk(n.test, scopes, d); return;
        case 'TryStatement':
          walk(n.block, scopes, d);
          if (n.handler) { var cp = []; patNames(n.handler.param, cp); walk(n.handler.body, scopes.concat([cp]), d); }
          walk(n.finalizer, scopes, d); return;
        case 'ReturnStatement':
          if (n.argument) { add(n.argument.start, '__r(' + n.loc.start.line + ',(', d); add(n.argument.end, '))', -1000 - d); walk(n.argument, scopes, d + 1); }
          return;
        case 'VariableDeclarator': walk(n.id, scopes, d); walk(n.init, scopes, d, n.id.type === 'Identifier' ? n.id.name : null); return;
        case 'Property': case 'MethodDefinition': case 'PropertyDefinition':
          walk(n.key, scopes, d); walk(n.value, scopes, d, n.key && (n.key.name || n.key.value)); return;
        case 'AssignmentExpression':
          walk(n.left, scopes, d); walk(n.right, scopes, d, n.left.type === 'Identifier' ? n.left.name : (n.left.property && n.left.property.name)); return;
        default: eachChild(n, function (c) { walk(c, scopes, d); });
      }
    }
    var top = []; varNames(ast, top); top = top.concat(blockNames(ast.body));
    stmtList(ast.body, [top], 0);
    ins.sort(function (a, b) { return a.p - b.p || a.k - b.k || a.s - b.s; });
    var out = '', last = 0;
    ins.forEach(function (x) { out += src.slice(last, x.p) + x.t; last = x.p; });
    return out + src.slice(last);
  }

  // ---------- סביבת הריצה בתוך ה-Worker ----------
  function RUNTIME(CAP) {
    var steps = [], frames = [{ n: 'ראשי', v: {}, l: 0 }], out = [], cnt = 0;
    function ser(v, d) {
      if (v === undefined) return { u: 1 };
      if (v === null || typeof v === 'boolean') return v;
      if (typeof v === 'number') return isFinite(v) ? v : { n: String(v) };
      if (typeof v === 'string') return { s: v.length > 200 ? v.slice(0, 200) + '…' : v };
      if (typeof v === 'bigint') return { n: v + 'n' };
      if (typeof v === 'function') return { f: v.name || 'פונקציה' };
      if (typeof v !== 'object') return { n: String(v) };
      if (d > 4) return { r: Array.isArray(v) ? '[…]' : '{…}' };
      if (Array.isArray(v) || ArrayBuffer.isView(v)) { var a = Array.prototype.slice.call(v, 0, 40); return { a: a.map(function (x) { return ser(x, d + 1); }), len: v.length }; }
      if (v instanceof Map) { var m = []; v.forEach(function (x, k) { if (m.length < 30) m.push([ser(k, d + 1), ser(x, d + 1)]); }); return { m: m, len: v.size }; }
      if (v instanceof Set) { var st = []; v.forEach(function (x) { if (st.length < 30) st.push(ser(x, d + 1)); }); return { set: st, len: v.size }; }
      var o = {}, ks = Object.keys(v).slice(0, 20);
      ks.forEach(function (k) { o[k] = ser(v[k], d + 1); });
      return { ob: o, len: Object.keys(v).length };
    }
    function copy() { return frames.map(function (f) { return { n: f.n, v: f.v, l: f.l }; }); }
    function tick() { if (++cnt > CAP) throw { __cap: 1 }; }
    function txt(a) { return typeof a === 'string' ? a : (function () { try { return JSON.stringify(a); } catch (e) { return String(a); } })(); }
    self.__s = function (line, get) {
      tick(); var raw = {}, vars = {};
      try { raw = get(); } catch (e) {}
      for (var k in raw) if (typeof raw[k] !== 'function') vars[k] = ser(raw[k], 0);
      var f = frames[frames.length - 1]; f.v = vars; f.l = line;
      steps.push({ l: line, f: copy(), o: out.length });
    };
    self.__e = function (name, line) { tick(); frames.push({ n: name, v: {}, l: line }); steps.push({ l: line, f: copy(), o: out.length, call: name }); };
    self.__x = function () { if (frames.length > 1) frames.pop(); };
    self.__r = function (line, val) { tick(); var f = frames[frames.length - 1]; f.l = line; steps.push({ l: line, f: copy(), o: out.length, ret: ser(val, 0), fn: f.n }); return val; };
    var log = function () { if (out.length < 300) out.push(Array.prototype.map.call(arguments, txt).join(' ')); };
    self.console = { log: log, info: log, warn: log, error: log };
    self.__done = function (e) {
      var cap = !!(e && e.__cap), err = e && !cap ? ((e.name ? e.name + ': ' : '') + (e.message || String(e))) : null;
      postMessage({ steps: steps, out: out, err: err, cap: cap });
    };
  }

  // ---------- ריצה ----------
  var R = null, cur = 0, worker = null, play = null, src = '';
  var st = T.load(KEY, { code: EX[0][1], ex: '0' });

  function run(code) {
    stop(); src = code; st.code = code; save();
    var inst;
    try { inst = instrument(code); }
    catch (e) {
      fail('<p class="sm-bad">שגיאת תחביר' + (e.loc ? ' בשורה ' + e.loc.line : '') + ': ' + esc(e.message.replace(/\s*\(\d+:\d+\)$/, '')) + '</p><p class="note">בדקו סוגריים, פסיקים ומרכאות בשורה הזו או בזו שלפניה.</p>');
      return;
    }
    if (worker) worker.terminate();
    var blob = '(' + RUNTIME.toString() + ')(' + CAP + ');\ntry{(function(){\n' + inst + '\n})();__done(null)}catch(__err){__done(__err)}';
    showMsg('<p class="note">מריץ…</p>');
    try { worker = new Worker(URL.createObjectURL(new Blob([blob], { type: 'text/javascript' }))); }
    catch (x) { fail('<p class="sm-bad">לא הצלחתי להריץ: ' + esc(x.message) + '</p>'); return; }
    var killer = setTimeout(function () {
      worker.terminate(); worker = null;
      fail('<p class="sm-bad">⏱ הקוד רץ יותר מ-4 שניות. כנראה יש לולאה אינסופית (או לולאה ריקה בלי שום שורה בפנים). בדקו את תנאי העצירה.</p>');
    }, TIMEOUT);
    worker.onerror = function (e) { clearTimeout(killer); e.preventDefault(); fail('<p class="sm-bad">שגיאה: ' + esc(e.message) + '</p>'); };
    worker.onmessage = function (e) {
      clearTimeout(killer); worker.terminate(); worker = null;
      if (!e.data.steps.length) { R = null; fail('<p class="sm-bad">לא היה מה להריץ. הוסיפו בסוף קריאה לפונקציה, למשל <code dir="ltr">myFunc(5);</code></p>'); return; }
      R = e.data;
      $('tz-edit').hidden = true; $('tz-view').hidden = false; $('tz-msg').innerHTML = '';
      $('tz-range').max = R.steps.length - 1;
      go(0);
      T.used('tichnut_tzaad', 'run');
    };
    worker.postMessage(null);
  }
  function showMsg(h) { $('tz-msg').innerHTML = h; }
  function fail(h) { showMsg(h); $('tz-edit').hidden = false; $('tz-view').hidden = true; }
  function save() { T.save(KEY, st); }

  // ---------- תצוגה ----------
  var PTR = /^(i|j|k|l|r|lo|hi|mid|left|right|start|end|low|high|p|q|slow|fast|idx|index|pos|top|front|back)$/;
  function isInt(x) { return typeof x === 'number' && Math.floor(x) === x; }
  function val(x, ctx) {
    if (x === null) return '<span class="tz-k">null</span>';
    if (typeof x === 'number' || typeof x === 'boolean') return '<span class="tz-n">' + x + '</span>';
    if (x.s !== undefined) return '<span class="tz-s">"' + esc(x.s) + '"</span>';
    if (x.u) return '<span class="tz-k">undefined</span>';
    if (x.n !== undefined) return '<span class="tz-n">' + esc(x.n) + '</span>';
    if (x.f !== undefined) return '<span class="tz-k">ƒ ' + esc(x.f) + '</span>';
    if (x.r) return '<span class="tz-k">' + x.r + '</span>';
    if (x.a) {
      if (ctx && x.a.length && x.a.every(function (c) { return c && c.a; })) return grid(x, ctx);
      if (ctx) return cells(x, ctx);
      return '[' + x.a.map(function (c) { return val(c); }).join(', ') + (x.len > x.a.length ? ', …' : '') + ']';
    }
    if (x.m) return '<span class="tz-k">Map</span> {' + x.m.map(function (kv) { return val(kv[0]) + ' → ' + val(kv[1]); }).join(', ') + (x.len > x.m.length ? ', …' : '') + '}';
    if (x.set) return '<span class="tz-k">Set</span> {' + x.set.map(function (c) { return val(c); }).join(', ') + (x.len > x.set.length ? ', …' : '') + '}';
    if (x.ob) { var ks = Object.keys(x.ob); return '{' + ks.map(function (k) { return '<span class="tz-p">' + esc(k) + '</span>: ' + val(x.ob[k]); }).join(', ') + (x.len > ks.length ? ', …' : '') + '}'; }
    return esc(JSON.stringify(x));
  }
  function cells(x, ctx) {
    var at = {};
    Object.keys(ctx).forEach(function (n) { var v = ctx[n]; if (PTR.test(n) && isInt(v) && v >= 0 && v < x.a.length) (at[v] = at[v] || []).push(n); });
    return '<span class="tz-arr">' + x.a.map(function (c, i) {
      return '<span class="tz-cell' + (at[i] ? ' on' : '') + '"><b>' + val(c) + '</b><i>' + i + '</i>' + (at[i] ? '<em>' + at[i].join(' ') + '</em>' : '') + '</span>';
    }).join('') + (x.len > x.a.length ? '<span class="tz-cell"><b>…</b></span>' : '') + '</span>';
  }
  function grid(x, ctx) {
    var ri = isInt(ctx.i) ? ctx.i : (isInt(ctx.r) ? ctx.r : -1), cj = isInt(ctx.j) ? ctx.j : (isInt(ctx.c) ? ctx.c : -1);
    return '<table class="tz-grid">' + x.a.map(function (row, i) {
      return '<tr>' + row.a.map(function (c, j) { return '<td' + (i === ri && j === cj ? ' class="on"' : (i === ri || j === cj ? ' class="half"' : '')) + '>' + val(c) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</table>';
  }
  function plain(v) { var o = {}; Object.keys(v).forEach(function (k) { o[k] = v[k]; }); return o; }
  function outHtml(n) {
    var lines = R ? R.out.slice(0, n) : [];
    return lines.length ? '<div class="tz-out"><b>פלט (console.log)</b><pre dir="ltr">' + lines.map(esc).join('\n') + '</pre></div>' : '';
  }
  function go(i) {
    if (!R || !R.steps.length) return;
    cur = Math.max(0, Math.min(R.steps.length - 1, i));
    var s = R.steps[cur], prev = R.steps[cur - 1], end = cur === R.steps.length - 1;
    $('tz-range').value = cur;
    $('tz-count').textContent = 'צעד ' + (cur + 1) + ' מתוך ' + R.steps.length + ' · שורה ' + s.l;
    // קוד
    var prevLine = prev ? prev.l : 0;
    $('tz-code').innerHTML = src.replace(/\n$/, '').split('\n').map(function (t, k) {
      var n = k + 1;
      return '<div class="tz-ln' + (n === s.l ? ' cur' : (n === prevLine ? ' was' : '')) + '"><span>' + n + '</span>' + (esc(t) || ' ') + '</div>';
    }).join('');
    var cl = $('tz-code').querySelector('.cur'), box = $('tz-code');
    if (cl && (cl.offsetTop < box.scrollTop || cl.offsetTop > box.scrollTop + box.clientHeight - 30)) box.scrollTop = cl.offsetTop - 40;
    // מה קורה
    var ev = s.call ? '📞 נכנסים לפונקציה <b dir="ltr">' + esc(s.call) + '</b>' :
      s.ret !== undefined ? '↩ <b dir="ltr">' + esc(s.fn) + '</b> מחזירה <span dir="ltr">' + val(s.ret) + '</span>' : 'עומדים להריץ את שורה ' + s.l;
    if (end) ev += R.err ? '<br><span class="sm-bad">✗ נזרקה שגיאה: <span dir="ltr">' + esc(R.err) + '</span></span>' :
      R.cap ? '<br><span class="sm-bad">עצרנו אחרי ' + CAP + ' צעדים, כדי לא להיתקע. נסו קלט קטן יותר.</span>' : '<br><span class="sm-ok">✓ סוף הריצה</span>';
    $('tz-ev').innerHTML = ev;
    // מחסנית
    var fr = s.f, show = fr.map(function (f, k) { return k; });
    if (fr.length > 1 && !Object.keys(fr[0].v).length) show.shift();
    var hidden = 0; if (show.length > 6) { hidden = show.length - 6; show = show.slice(-6); }
    show.reverse(); // הקריאה שרצה עכשיו למעלה, מי שמחכה לה מתחת
    $('tz-frames').innerHTML = show.map(function (k) {
      var f = fr[k], top = k === fr.length - 1, pf = prev && prev.f[k] && prev.f[k].n === f.n ? prev.f[k].v : null, ks = Object.keys(f.v), ctx = plain(f.v);
      return '<div class="tz-frame' + (top ? ' top' : '') + '"><h3 dir="ltr">' + esc(f.n) + (k ? '()' : '') + (top ? '' : ' <small>מחכה</small>') + '</h3>' +
        (ks.length ? '<dl>' + ks.map(function (n) {
          var ch = top && (!pf || JSON.stringify(pf[n]) !== JSON.stringify(f.v[n]));
          return '<div class="tz-var' + (ch ? ' chg' : '') + '"><dt dir="ltr">' + esc(n) + '</dt><dd dir="ltr">' + val(f.v[n], ctx) + '</dd></div>';
        }).join('') + '</dl>' : '<p class="note">עוד אין משתנים</p>') + '</div>';
    }).join('') + (hidden ? '<p class="note">… ועוד ' + hidden + ' קריאות קודמות שמחכות במחסנית</p>' : '');
    $('tz-outbox').innerHTML = outHtml(end ? R.out.length : s.o);
    $('tz-prev').disabled = cur === 0; $('tz-next').disabled = end;
    if (end) stop();
  }
  function stop() { if (play) { clearInterval(play); play = null; } $('tz-play').textContent = '▶ ניגון'; }

  // ---------- אירועים ----------
  $('tz-run').addEventListener('click', function () { run($('tz-in').value); });
  $('tz-in').addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(this.value); }
    if (e.key === 'Tab') { e.preventDefault(); var a = this.selectionStart; this.value = this.value.slice(0, a) + '  ' + this.value.slice(this.selectionEnd); this.selectionStart = this.selectionEnd = a + 2; }
  });
  $('tz-editbtn').addEventListener('click', function () { stop(); $('tz-view').hidden = true; $('tz-edit').hidden = false; $('tz-in').focus(); });
  $('tz-first').addEventListener('click', function () { stop(); go(0); });
  $('tz-prev').addEventListener('click', function () { stop(); go(cur - 1); });
  $('tz-next').addEventListener('click', function () { stop(); go(cur + 1); });
  $('tz-last').addEventListener('click', function () { stop(); go(R ? R.steps.length - 1 : 0); });
  $('tz-range').addEventListener('input', function () { stop(); go(+this.value); });
  $('tz-play').addEventListener('click', function () {
    if (play) return stop();
    if (R && cur >= R.steps.length - 1) go(0);
    this.textContent = '⏸ השהיה';
    play = setInterval(function () { go(cur + 1); }, +$('tz-speed').value);
    T.used('tichnut_tzaad', 'play');
  });
  $('tz-speed').addEventListener('change', function () { if (play) { stop(); $('tz-play').click(); } });
  document.addEventListener('keydown', function (e) {
    if ($('tz-view').hidden || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); go(cur + 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); stop(); go(cur - 1); }
  });

  // דוגמאות + תרגילי הסימולטור
  var P = window.SIM_CODE || [];
  function simCode(p) {
    var best = p.tests[0], bl = -1;
    p.tests.forEach(function (t) {
      var j = JSON.stringify(t[0]), big = (j.match(/\d+/g) || []).some(function (n) { return +n > 5000; });
      if (!big && j.length <= 90 && j.length > bl) { best = t; bl = j.length; }
    });
    return p.sol + '\n\n' + p.fn + '(' + best[0].map(function (a) { return JSON.stringify(a); }).join(', ') + ');\n';
  }
  $('tz-ex').innerHTML = '<optgroup label="דוגמאות">' + EX.map(function (x, i) { return '<option value="' + i + '">' + x[0] + '</option>'; }).join('') + '</optgroup>' +
    (P.length ? '<optgroup label="פתרונות מסימולטור הראיון">' + P.map(function (p) { return '<option value="sim:' + p.id + '">' + esc(p.t) + '</option>'; }).join('') + '</optgroup>' : '') +
    '<option value="mine">הקוד שלי</option>';
  function loadEx(v, go) {
    var code = null;
    if (/^sim:/.test(v)) { var id = v.slice(4); P.forEach(function (p) { if (p.id === id) code = simCode(p); }); }
    else if (EX[+v]) code = EX[+v][1];
    if (code === null) return false;
    st.ex = v; $('tz-ex').value = v; $('tz-in').value = code;
    if (go) run(code);
    return true;
  }
  $('tz-ex').addEventListener('change', function () { if (this.value === 'mine') { $('tz-in').value = st.code || ''; $('tz-in').focus(); return; } loadEx(this.value, true); });

  // התחלה: מהסימולטור (#sim=id), או מהקוד האחרון, או דוגמה – ומריצים מיד כדי שיהיה מה לראות
  var h = location.hash.match(/sim=([\w-]+)/);
  if (!(h && loadEx('sim:' + h[1], true))) {
    $('tz-ex').value = st.ex || '0';
    $('tz-in').value = st.code || EX[0][1];
    run($('tz-in').value);
  }
  window.TICHNUT.tzaad = { instrument: instrument, run: run, go: go, simCode: simCode, EX: EX, state: function () { return { R: R, cur: cur }; } };
})();
