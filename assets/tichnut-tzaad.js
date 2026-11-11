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
    ['ספירת תווים', "function countChars(s) {\n  const count = {};\n  for (const ch of s) {\n    count[ch] = (count[ch] || 0) + 1;\n  }\n  return count;\n}\n\nconsole.log(countChars('banana'));\n"],
    ['רשימה מקושרת: היפוך', "class Node {\n  constructor(val, next = null) {\n    this.val = val;\n    this.next = next;\n  }\n}\n\nfunction reverseList(head) {\n  let prev = null, curr = head;\n  while (curr !== null) {\n    const next = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = next;\n  }\n  return prev;\n}\n\nconst head = new Node(1);\nlet tail = head;\nfor (const v of [2, 3, 4, 5]) {\n  tail.next = new Node(v);\n  tail = tail.next;\n}\nreverseList(head);\n"],
    ['עץ חיפוש בינארי', "class TreeNode {\n  constructor(val) {\n    this.val = val;\n    this.left = null;\n    this.right = null;\n  }\n}\n\nfunction insert(root, val) {\n  if (root === null) return new TreeNode(val);\n  if (val < root.val) root.left = insert(root.left, val);\n  else root.right = insert(root.right, val);\n  return root;\n}\n\nfunction inorder(node, out) {\n  if (node === null) return out;\n  inorder(node.left, out);\n  out.push(node.val);\n  inorder(node.right, out);\n  return out;\n}\n\nlet root = null;\nfor (const v of [8, 3, 10, 1, 6, 14, 4]) root = insert(root, v);\nconsole.log(inorder(root, []));\n"],
    ['BFS בגרף', "function bfs(graph, start) {\n  const visited = new Set([start]);\n  const queue = [start];\n  const order = [];\n  while (queue.length > 0) {\n    const node = queue.shift();\n    order.push(node);\n    for (const nb of graph[node]) {\n      if (!visited.has(nb)) {\n        visited.add(nb);\n        queue.push(nb);\n      }\n    }\n  }\n  return order;\n}\n\nconst graph = {\n  A: ['B', 'C'],\n  B: ['A', 'D', 'E'],\n  C: ['A', 'F'],\n  D: ['B'],\n  E: ['B', 'F'],\n  F: ['C', 'E']\n};\nbfs(graph, 'A');\n"]
  ];


  var PYEX = [
    ['חיפוש בינארי', "def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid\n        if arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n\nbinary_search([2, 5, 8, 12, 16, 23, 38, 56, 72, 91], 23)\n"],
    ['מיון בועות', "def bubble_sort(arr):\n    for i in range(len(arr) - 1):\n        for j in range(len(arr) - 1 - i):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    return arr\n\nbubble_sort([5, 1, 4, 2, 8])\n"],
    ['עצרת ברקורסיה', "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(5))\n"],
    ['פיבונאצ׳י עם זיכרון', "def fib(n, memo=None):\n    if memo is None:\n        memo = {}\n    if n <= 1:\n        return n\n    if n in memo:\n        return memo[n]\n    value = fib(n - 1, memo) + fib(n - 2, memo)\n    memo[n] = value\n    return value\n\nfib(6)\n"],
    ['היפוך בשני מצביעים', "def reverse(arr):\n    left, right = 0, len(arr) - 1\n    while left < right:\n        arr[left], arr[right] = arr[right], arr[left]\n        left += 1\n        right -= 1\n    return arr\n\nreverse(['a', 'b', 'c', 'd', 'e'])\n"],
    ['ספירת תווים', "def count_chars(s):\n    count = {}\n    for ch in s:\n        count[ch] = count.get(ch, 0) + 1\n    return count\n\nprint(count_chars('banana'))\n"],
    ['רשימה מקושרת: היפוך', "class Node:\n    def __init__(self, val, next=None):\n        self.val = val\n        self.next = next\n\ndef reverse_list(head):\n    prev, curr = None, head\n    while curr is not None:\n        nxt = curr.next\n        curr.next = prev\n        prev = curr\n        curr = nxt\n    return prev\n\nhead = Node(1)\ntail = head\nfor v in [2, 3, 4, 5]:\n    tail.next = Node(v)\n    tail = tail.next\nreverse_list(head)\n"],
    ['עץ חיפוש בינארי', "class TreeNode:\n    def __init__(self, val):\n        self.val = val\n        self.left = None\n        self.right = None\n\ndef insert(root, val):\n    if root is None:\n        return TreeNode(val)\n    if val < root.val:\n        root.left = insert(root.left, val)\n    else:\n        root.right = insert(root.right, val)\n    return root\n\ndef inorder(node, out):\n    if node is None:\n        return out\n    inorder(node.left, out)\n    out.append(node.val)\n    inorder(node.right, out)\n    return out\n\nroot = None\nfor v in [8, 3, 10, 1, 6, 14, 4]:\n    root = insert(root, v)\nprint(inorder(root, []))\n"],
    ['BFS בגרף', "from collections import deque\n\ndef bfs(graph, start):\n    visited = {start}\n    queue = deque([start])\n    order = []\n    while queue:\n        node = queue.popleft()\n        order.append(node)\n        for nb in graph[node]:\n            if nb not in visited:\n                visited.add(nb)\n                queue.append(nb)\n    return order\n\ngraph = {\n    'A': ['B', 'C'],\n    'B': ['A', 'D', 'E'],\n    'C': ['A', 'F'],\n    'D': ['B'],\n    'E': ['B', 'F'],\n    'F': ['C', 'E'],\n}\nbfs(graph, 'A')\n"]
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
    // כל אובייקט מקבל מספר זהות קבוע (id), כדי לצייר רשימות מקושרות ועצים: אותו צומת = אותו id.
    // אובייקט שכבר הופיע באותו משתנה חוזר כ-{ref} (מגן ממעגלים), ועד 60 אובייקטים למשתנה.
    var ids = new WeakMap(), nid = 0;
    function ser(v, d, sn) {
      sn = sn || { n: 0, m: new Set() };
      if (v === undefined) return { u: 1 };
      if (v === null || typeof v === 'boolean') return v;
      if (typeof v === 'number') return isFinite(v) ? v : { n: String(v) };
      if (typeof v === 'string') return { s: v.length > 200 ? v.slice(0, 200) + '…' : v };
      if (typeof v === 'bigint') return { n: v + 'n' };
      if (typeof v === 'function') return { f: v.name || 'פונקציה' };
      if (typeof v !== 'object') return { n: String(v) };
      if (Array.isArray(v) || ArrayBuffer.isView(v)) { if (d > 4) return { r: '[…]' }; var a = Array.prototype.slice.call(v, 0, 40); return { a: a.map(function (x) { return ser(x, d + 1, sn); }), len: v.length }; }
      if (v instanceof Map) { if (d > 4) return { r: '{…}' }; var m = []; v.forEach(function (x, k) { if (m.length < 30) m.push([ser(k, d + 1, sn), ser(x, d + 1, sn)]); }); return { m: m, len: v.size }; }
      if (v instanceof Set) { if (d > 4) return { r: '{…}' }; var st = []; v.forEach(function (x) { if (st.length < 30) st.push(ser(x, d + 1, sn)); }); return { set: st, len: v.size }; }
      var id = ids.get(v); if (!id) { id = ++nid; ids.set(v, id); }
      if (sn.m.has(v)) return { ref: id };
      if (sn.n >= 60) return { r: '{…}' };
      sn.m.add(v); sn.n++;
      var o = {}, ks = Object.keys(v).slice(0, 20);
      ks.forEach(function (k) { o[k] = ser(v[k], d, sn); });
      return { ob: o, len: Object.keys(v).length, id: id };
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
  if (st.lang !== 'py') st.lang = 'js';
  var PY = function () { return st.lang === 'py'; };

  function run(code) {
    if (PY()) return runPy(code);
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
      show(e.data);
    };
    worker.postMessage(null);
  }
  function show(data) {
    R = data; R.py = PY();
    $('tz-edit').hidden = true; $('tz-view').hidden = false; $('tz-msg').innerHTML = '';
    $('tz-range').max = R.steps.length - 1;
    go(0);
    T.used('tichnut_tzaad', R.py ? 'run_py' : 'run');
  }

  // ---------- Python: Pyodide ב-Worker נפרד (assets/tichnut-tzaad-py.js) ----------
  var pyW = null, pyReady = false, pyId = 0, pyKill = null, pyPending = 0, PYTIMEOUT = 6000;
  function pyWorker() {
    if (pyW) return pyW;
    pyReady = false;
    try { pyW = new Worker('/assets/tichnut-tzaad-py.js?v=4', { type: 'module' }); } catch (x) { pyW = null; return null; }
    pyW.onmessage = function (e) {
      var d = e.data || {};
      if (d.ready) { pyReady = true; if (pyPending) { showMsg('<p class="note">מריץ…</p>'); arm(pyPending); } return; }
      if (d.id !== pyId) return;
      clearTimeout(pyKill); pyPending = 0;
      if (d.fatal) { pyW.terminate(); pyW = null; fail('<p class="sm-bad">לא הצלחתי לטעון את Python: ' + esc(d.fatal) + '</p><p class="note">בדקו את החיבור לאינטרנט ונסו שוב.</p>'); return; }
      if (d.syntax) { fail('<p class="sm-bad">שגיאת תחביר' + (d.syntax.line ? ' בשורה ' + d.syntax.line : '') + ': <span dir="ltr">' + esc(d.syntax.msg) + '</span></p><p class="note">בדקו נקודתיים בסוף שורת def / if / for, הזחה (רווחים בתחילת השורה), סוגריים ומרכאות.</p>'); return; }
      if (!d.steps.length) { R = null; fail('<p class="sm-bad">לא היה מה להריץ. הוסיפו בסוף קריאה לפונקציה, למשל <code dir="ltr">my_func(5)</code></p>'); return; }
      show(d);
    };
    pyW.onerror = function (e) { e.preventDefault(); clearTimeout(pyKill); pyPending = 0; if (pyW) pyW.terminate(); pyW = null; fail('<p class="sm-bad">שגיאה בטעינת Python: ' + esc(e.message || '') + '</p>'); };
    pyW.postMessage({});
    return pyW;
  }
  function arm(id) {
    clearTimeout(pyKill);
    pyKill = setTimeout(function () {
      if (id !== pyId) return;
      pyPending = 0; if (pyW) pyW.terminate(); pyW = null;
      fail('<p class="sm-bad">⏱ הקוד רץ יותר מ-6 שניות בלי להתקדם בשורות. כנראה חישוב כבד מאוד בשורה אחת (למשל sum(range(10**10))) או לולאה אינסופית. נסו קלט קטן יותר.</p>');
    }, PYTIMEOUT);
  }
  function runPy(code) {
    stop(); src = code; st.pycode = code; save();
    if (worker) { worker.terminate(); worker = null; }
    var w = pyWorker();
    if (!w) { fail('<p class="sm-bad">הדפדפן הזה לא מאפשר להריץ Python כאן.</p>'); return; }
    var id = ++pyId; pyPending = id;
    w.postMessage({ id: id, code: code, cap: CAP });
    if (pyReady) { showMsg('<p class="note">מריץ…</p>'); arm(id); }
    else showMsg('<p class="note">⏳ טוען את Python… בפעם הראשונה זה לוקח כמה שניות (בערך 14MB). אחר כך הוא נשמר בדפדפן ונפתח מהר.</p>');
  }
  function showMsg(h) { $('tz-msg').innerHTML = h; }
  function fail(h) { showMsg(h); $('tz-edit').hidden = false; $('tz-view').hidden = true; }
  function save() { T.save(KEY, st); }

  // ---------- תצוגה ----------
  var PTR = /^(i|j|k|l|r|lo|hi|mid|left|right|start|end|low|high|p|q|slow|fast|idx|index|pos|top|front|back)$/;
  function isInt(x) { return typeof x === 'number' && Math.floor(x) === x; }
  function pyStr(t) { return t.indexOf("'") >= 0 && t.indexOf('"') < 0 ? '"' + t + '"' : "'" + t.replace(/'/g, "\\'") + "'"; }
  function val(x, ctx) {
    var py = R && R.py;
    if (x === null) return '<span class="tz-k">' + (py ? 'None' : 'null') + '</span>';
    if (typeof x === 'boolean' && py) return '<span class="tz-n">' + (x ? 'True' : 'False') + '</span>';
    if (typeof x === 'number' || typeof x === 'boolean') return '<span class="tz-n">' + x + '</span>';
    if (x.s !== undefined) return py ? '<span class="tz-s">' + esc(pyStr(x.s)) + '</span>' : '<span class="tz-s">"' + esc(x.s) + '"</span>';
    if (x.u) return '<span class="tz-k">undefined</span>';
    if (x.n !== undefined) return '<span class="tz-n">' + esc(x.n) + '</span>';
    if (x.f !== undefined) return '<span class="tz-k">ƒ ' + esc(x.f) + '</span>';
    if (x.r) return '<span class="tz-k">' + x.r + '</span>';
    if (x.ref) return '<span class="tz-k">' + (NODES[x.ref] ? '→' : '↺') + '</span>';
    if (x.ob && x.id && NODES[x.id]) return compact(x);
    if (x.a) {
      if (ctx && x.a.length && x.a.every(function (c) { return c && c.a; })) return grid(x, ctx);
      if (ctx) return cells(x, ctx);
      return '[' + x.a.map(function (c) { return val(c); }).join(', ') + (x.len > x.a.length ? ', …' : '') + ']';
    }
    if (x.m) return '<span class="tz-k">Map</span> {' + x.m.map(function (kv) { return val(kv[0]) + ' → ' + val(kv[1]); }).join(', ') + (x.len > x.m.length ? ', …' : '') + '}';
    if (x.set && py) return x.set.length ? '{' + x.set.map(function (c) { return val(c); }).join(', ') + (x.len > x.set.length ? ', …' : '') + '}' : '<span class="tz-k">set()</span>';
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

  // ---------- ציור: רשימות מקושרות, עצים וגרפים ----------
  // מכל צעד מוציאים "צמתים" (אובייקטים עם id שמצביעים זה על זה), ומציירים אותם עם חיצים.
  // המיקום של כל צומת נקבע פעם אחת לכל הריצה, כדי שהציור לא יקפוץ בין צעדים.
  var LINK = /^(next|prev|previous|left|right|parent|child|children|kids|nodes|neighbors|neighbours|adj|nxt|down|up|head|tail|random)$/;
  var LISTK = /^(next|prev|previous|nxt|head|tail|random)$/;
  var LABK = ['val', 'value', 'data', 'key', 'v', 'name', 'label', 'item', 'num', 'x'];
  var GPTR = /^(node|cur|curr|current|u|v|n|start|nb|nei|neighbor|neighbour|nxt|src|dst|source|target|end|goal|at|w|vertex|vert)$/;
  var NODES = {};
  function nk(k) { return String(k).replace(/^'([\s\S]*)'$/, '$1'); }
  function oref(x) { return x && typeof x === 'object' ? (x.ob && x.id ? x.id : (x.ref || 0)) : 0; }
  function scal(x) {
    if (typeof x === 'number') return String(x);
    if (x && x.s !== undefined) return x.s;
    if (x && x.n !== undefined) return /inf/i.test(x.n) ? '∞' : x.n;
    return null;
  }
  function extract(i) {
    R.ex = R.ex || [];
    if (R.ex[i]) return R.ex[i];
    var s = R.steps[i], all = {}, order = [];
    function walk(x) {
      if (!x || typeof x !== 'object') return;
      if (x.ob && x.id) {
        if (all[x.id]) return;
        var n = all[x.id] = { id: x.id, ob: x.ob, out: [], nul: [] };
        order.push(x.id);
        Object.keys(x.ob).forEach(function (k) {
          var v = x.ob[k], key = nk(k), t = oref(v);
          if (t) { n.out.push({ k: key, to: t }); walk(v); }
          else if (v && v.a) v.a.forEach(function (c) { var tc = oref(c); if (tc) { n.out.push({ k: key, to: tc }); walk(c); } });
          else if (v === null && LINK.test(key)) n.nul.push(key);
        });
        return;
      }
      if (x.a) x.a.forEach(walk);
      else if (x.m) x.m.forEach(function (kv) { walk(kv[1]); });
      else if (x.set) x.set.forEach(walk);
    }
    // מהקריאה העליונה (הכי עדכנית) למטה
    for (var k = s.f.length - 1; k >= 0; k--) { var fv = s.f[k].v; Object.keys(fv).forEach(function (nm) { walk(fv[nm]); }); }
    if (s.ret !== undefined) walk(s.ret);
    var g = null;
    for (k = s.f.length - 1; k >= 0 && !g; k--) { var gv = s.f[k].v; Object.keys(gv).some(function (nm) { g = adj(gv[nm], nm); return g; }); }
    // גרף ששמור כמילון של מילונים לא מצויר שוב כ"צמתים"
    var tgt = {};
    order.forEach(function (id) { if (g && id === g.src) return; all[id].out.forEach(function (o) { if (all[o.to]) tgt[o.to] = 1; }); });
    var nodes = {}, ids = [];
    order.forEach(function (id) { var n = all[id]; if (g && id === g.src) return; if (n.out.length || n.nul.length || tgt[id]) { nodes[id] = n; ids.push(id); } });
    var top = s.f[s.f.length - 1], ptr = {};
    Object.keys(top.v).forEach(function (nm) { var t = oref(top.v[nm]); if (t && nodes[t]) (ptr[t] = ptr[t] || []).push(nm); });
    if (s.ret !== undefined && oref(s.ret) && nodes[oref(s.ret)]) (ptr[oref(s.ret)] = ptr[oref(s.ret)] || []).push('↩');
    return (R.ex[i] = { nodes: nodes, ids: ids, ptr: ptr, g: g, top: top });
  }
  // גרף כרשימת שכנים: {A: ['B','C'], ...} או {A: {B: 4}} (משקלים) או [[1,2],[0],...] במשתנה בשם graph/adj
  function adj(x, nm) {
    if (!x) return null;
    var keys, vals;
    if (x.ob) {
      var ks = Object.keys(x.ob); keys = ks.map(nk); vals = ks.map(function (k) { return x.ob[k]; });
    } else if (x.a && /^(graph|adj|adjacency|g|neighbors|neighbours|edges_of|tree)$/i.test(nm) && x.a.length >= 2 && x.a.every(function (c) { return c && c.a && c.a.every(function (e) { return isInt(e) && e >= 0 && e < x.a.length; }); })) {
      keys = x.a.map(function (c, i) { return String(i); }); vals = x.a;
    } else return null;
    if (keys.length < 2 || keys.length > 16) return null;
    var set = {}, E = [], ok = true;
    keys.forEach(function (k) { set[k] = 1; });
    vals.forEach(function (v, i) {
      if (!ok) return;
      var items = v && (v.a || v.set);
      if (!items && v && v.ob) items = Object.keys(v.ob).map(function (kk) { return { a: [{ s: nk(kk) }, v.ob[kk]] }; });
      if (!items) { ok = false; return; }
      items.forEach(function (c) {
        var to = scal(c), w = null;
        if (to === null && c && c.a && c.a.length) { to = scal(c.a[0]); w = c.a.length > 1 ? scal(c.a[1]) : null; }
        if (to === null || !set[to]) { ok = false; return; }
        E.push({ a: keys[i], b: to, w: w });
      });
    });
    if (!ok || !E.length) return null;
    var has = {};
    E.forEach(function (e) { has[e.a + '\u0001' + e.b] = 1; });
    var und = E.every(function (e) { return has[e.b + '\u0001' + e.a]; });
    return { nm: nm, keys: keys, E: E, und: und, src: x.id || 0 };
  }
  function layout() {
    if (R.lay) return R.lay;
    // הצעד שבו יש הכי הרבה צמתים, ומביניהם הכי מחובר (הכי מעט שורשים), ומביניהם הראשון
    var best = -1, bn = 0, br = 1e9;
    for (var i = 0; i < R.steps.length; i++) {
      var ei = extract(i), c = ei.ids.length;
      if (!c || c < bn) continue;
      var hit = {};
      ei.ids.forEach(function (id) { ei.nodes[id].out.forEach(function (o) { if (o.to !== id) hit[o.to] = 1; }); });
      var rc = ei.ids.filter(function (id) { return !hit[id]; }).length;
      if (c > bn || rc < br) { bn = c; br = rc; best = i; }
    }
    var L = R.lay = { pos: {}, kind: 'tree', nx: 0, my: 0 };
    if (best < 0) return L;
    var e = extract(best), N = e.nodes, inc = {}, keys = {}, seen = {}, x = 0;
    e.ids.forEach(function (id) { N[id].out.forEach(function (o) { if (N[o.to]) { keys[o.k] = 1; if (o.to !== id) inc[o.to] = 1; } }); });
    var roots = e.ids.filter(function (id) { return !inc[id]; });
    if (!roots.length) roots = [e.ids[0]];
    if (keys.left || keys.right) {
      var ino = function (id, d) {
        if (!id || seen[id] || !N[id]) return;
        seen[id] = 1;
        var l = 0, r = 0;
        N[id].out.forEach(function (o) { if (o.k === 'left') l = o.to; else if (o.k === 'right') r = o.to; });
        ino(l, d + 1); L.pos[id] = { x: x++, y: d }; ino(r, d + 1);
      };
      roots.forEach(function (r) { ino(r, 0); });
    } else if (Object.keys(keys).every(function (k) { return LISTK.test(k); })) {
      L.kind = 'list';
      roots.forEach(function (r) {
        var id = r;
        while (id && N[id] && !seen[id]) {
          seen[id] = 1; L.pos[id] = { x: x++, y: 0 };
          var nx = 0;
          N[id].out.forEach(function (o) { if (!nx && /^(next|nxt|head)$/.test(o.k)) nx = o.to; });
          id = nx;
        }
      });
    } else {
      var dfs = function (id, d) {
        seen[id] = 1;
        var xs = [];
        N[id].out.forEach(function (o) { if (N[o.to] && !seen[o.to]) { dfs(o.to, d + 1); xs.push(L.pos[o.to].x); } });
        L.pos[id] = { x: xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : x++, y: d };
      };
      roots.forEach(function (r) { if (!seen[r]) dfs(r, 0); });
    }
    Object.keys(L.pos).forEach(function (id) { L.nx = Math.max(L.nx, L.pos[id].x + 1); L.my = Math.max(L.my, L.pos[id].y); });
    var extra = 0;
    e.ids.forEach(function (id) { if (!L.pos[id]) L.pos[id] = { x: extra++, y: L.my + 1 }; });
    if (extra) L.my++;
    return L;
  }
  function nlabel(n) {
    var ks = Object.keys(n.ob), pick = null;
    LABK.some(function (want) { return ks.some(function (k) { if (nk(k) === want && scal(n.ob[k]) !== null) { pick = scal(n.ob[k]); return true; } }); });
    if (pick === null) ks.some(function (k) { var v = n.ob[k]; if (typeof v === 'boolean') { pick = String(v); return true; } pick = scal(v); return pick !== null; });
    pick = pick === null ? '' : String(pick);
    return pick.length > 5 ? pick.slice(0, 4) + '…' : pick;
  }
  function svgWrap(W, H, body, mk) {
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" style="width:100%;max-width:' + W + 'px;min-width:' + Math.min(W, Math.round(W * 0.62)) + 'px" direction="ltr" role="img" aria-label="ציור המבנה">' +
      '<defs><marker id="' + mk + 'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="tz-ah"/></marker>' +
      '<marker id="' + mk + 'n" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="tz-ahn"/></marker></defs>' + body + '</svg>';
  }
  function f1(v) { return Math.round(v * 10) / 10; }
  function drawNodes(i, e) {
    var L = layout(), list = L.kind === 'list', sx = list ? 74 : 46, sy = list ? 76 : 64, hw = list ? 22 : 17, pad = 14, top = 30;
    var P = {}, maxx = 0, maxy = 0, py = R.py;
    e.ids.forEach(function (id) {
      var p = L.pos[id];
      if (!p) p = L.pos[id] = { x: L.nx++, y: L.my + 1 };
      P[id] = { x: pad + hw + p.x * sx, y: top + 16 + p.y * sy };
      maxx = Math.max(maxx, P[id].x); maxy = Math.max(maxy, P[id].y);
    });
    var W = Math.round(maxx + hw + pad + (list ? 12 : 0)), H = Math.round(maxy + 16 + (list ? 50 : 14));
    var pe = i > 0 ? extract(i - 1) : null, old = {}, body = '', labels = '';
    if (pe) pe.ids.forEach(function (id) { pe.nodes[id].out.forEach(function (o) { old[id + '>' + o.k + '>' + o.to] = 1; }); });
    e.ids.forEach(function (id) {
      e.nodes[id].out.forEach(function (o) {
        var a = P[id], b = P[o.to];
        if (!b) return;
        var nw = pe && !old[id + '>' + o.k + '>' + o.to], cls = 'tz-e' + (nw ? ' new' : ''), mk = nw ? 'url(#tzLn)' : 'url(#tzLa)';
        if (a === b) { body += '<path class="' + cls + '" d="M' + (a.x - 6) + ' ' + (a.y - hw + 2) + ' C' + (a.x - 18) + ' ' + (a.y - hw - 26) + ' ' + (a.x + 18) + ' ' + (a.y - hw - 26) + ' ' + (a.x + 6) + ' ' + (a.y - hw + 1) + '" marker-end="' + mk + '"/>'; return; }
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (list && Math.abs(dy) < 1 && !(dx > 0 && dx < sx + 1)) {
          var up = dx > 0 ? -1 : 1, sg = dx > 0 ? 1 : -1, cy = a.y + up * (34 + Math.min(30, Math.abs(dx) / 6));
          body += '<path class="' + cls + '" d="M' + (a.x + sg * 8) + ' ' + (a.y + up * 15) + ' Q' + f1((a.x + b.x) / 2) + ' ' + f1(cy) + ' ' + (b.x - sg * 8) + ' ' + (b.y + up * 17) + '" marker-end="' + mk + '"/>';
          return;
        }
        var ra = list ? (Math.abs(dy) < 1 ? hw : 15) : hw, rb = ra + 2;
        body += '<line class="' + cls + '" x1="' + f1(a.x + dx / d * ra) + '" y1="' + f1(a.y + dy / d * ra) + '" x2="' + f1(b.x - dx / d * rb) + '" y2="' + f1(b.y - dy / d * rb) + '" marker-end="' + mk + '"/>';
      });
    });
    e.ids.forEach(function (id) {
      var n = e.nodes[id], p = P[id], on = e.ptr[id];
      body += list ? '<rect class="tz-nd' + (on ? ' on' : '') + '" x="' + (p.x - hw) + '" y="' + (p.y - 15) + '" width="' + (hw * 2) + '" height="30" rx="7"/>'
        : '<circle class="tz-nd' + (on ? ' on' : '') + '" cx="' + p.x + '" cy="' + p.y + '" r="' + hw + '"/>';
      body += '<text class="tz-nt" x="' + p.x + '" y="' + (p.y + 4.5) + '" text-anchor="middle">' + esc(nlabel(n)) + '</text>';
      if (list && n.nul.some(function (k) { return /^(next|nxt)$/.test(k); }))
        body += '<line class="tz-e nul" x1="' + p.x + '" y1="' + (p.y + 15) + '" x2="' + p.x + '" y2="' + (p.y + 25) + '"/><text class="tz-nl" x="' + p.x + '" y="' + (p.y + 37) + '" text-anchor="middle">' + (py ? 'None' : 'null') + '</text>';
      if (on) labels += '<text class="tz-pl" x="' + p.x + '" y="' + (p.y - hw - (list ? 5 : 6)) + '" text-anchor="middle">' + esc(on.join(', ')) + '</text>';
    });
    var title = list ? 'הרשימה המקושרת' : 'העץ / המבנה';
    return '<div class="tz-draw"><p class="tz-dt">' + title + ' <span>· זהב = משתנה שמצביע · ירוק = חץ חדש</span></p>' + svgWrap(W, H, body + labels, 'tzL') + '</div>';
  }
  function gItems(v, g) {
    var out = [];
    if (!v) return out;
    if (v.set) v.set.forEach(function (c) { var s = scal(c); if (s !== null) out.push(s); });
    else if (v.a) {
      if (v.a.length && v.a.every(function (c) { return typeof c === 'boolean'; })) v.a.forEach(function (c, i) { if (c) out.push(String(i)); });
      else v.a.forEach(function (c) { var s = scal(c); if (s === null && c && c.a && c.a.length) s = scal(c.a[c.a.length - 1]); if (s !== null) out.push(s); });
    } else if (v.ob) Object.keys(v.ob).forEach(function (k) { var x = v.ob[k]; if (x !== false && x !== null && x !== 0) out.push(nk(k)); });
    return out;
  }
  function drawGraph(e) {
    // סידור בשכבות לפי מרחק (BFS) מהצומת הראשון: פחות קווים חוצים מעיגול
    var g = e.g, P = {}, nb = {}, lvl = {}, rows = [];
    g.keys.forEach(function (k) { nb[k] = []; });
    g.E.forEach(function (ed) { nb[ed.a].push(ed.b); nb[ed.b].push(ed.a); });
    var base = 0;
    g.keys.forEach(function (s0) {
      if (lvl[s0] !== undefined) return;
      var q = [s0], top0 = base; lvl[s0] = base;
      while (q.length) { var u = q.shift(); (rows[lvl[u]] = rows[lvl[u]] || []).push(u); base = Math.max(base, lvl[u] + 1); nb[u].forEach(function (w) { if (lvl[w] === undefined) { lvl[w] = lvl[u] + 1; q.push(w); } }); }
      if (base === top0) base++;
    });
    var gx = 66, gy = 70, wide = Math.max.apply(null, rows.map(function (r) { return r.length; })), W = Math.max(220, wide * gx + 40), H = 50 + (rows.length - 1) * gy + 17 + 24;
    rows.forEach(function (r, l) { r.forEach(function (k, j) { P[k] = { x: f1(W / 2 + (j - (r.length - 1) / 2) * gx), y: 50 + l * gy }; }); });
    var tv = e.top.v, vis = {}, que = {}, ptr = {}, dist = {}, used = {};
    Object.keys(tv).forEach(function (nm) {
      var v = tv[nm];
      if (/^(visited|seen|vis|done|explored|closed|marked)$/i.test(nm)) { gItems(v, g).forEach(function (k) { vis[k] = 1; }); used.vis = nm; }
      else if (/^(queue|q|stack|st|frontier|pq|heap|todo|to_visit|open)$/i.test(nm)) { gItems(v, g).forEach(function (k) { que[k] = 1; }); used.que = nm; }
      else if (/^(dist|dists|distance|distances|cost|costs)$/i.test(nm) && v && (v.ob || v.a)) {
        if (v.ob) Object.keys(v.ob).forEach(function (k) { var s = scal(v.ob[k]); if (s !== null) dist[nk(k)] = s; });
        else v.a.forEach(function (c, i) { var s = scal(c); if (s !== null) dist[String(i)] = s; });
        used.dist = nm;
      } else if (GPTR.test(nm)) { var s = scal(v); if (s !== null && P[s]) (ptr[s] = ptr[s] || []).push(nm); }
    });
    var body = '', done = {}, r = 17;
    g.E.forEach(function (ed) {
      var a = P[ed.a], b = P[ed.b];
      if (g.und) { var key = ed.a < ed.b ? ed.a + '\u0001' + ed.b : ed.b + '\u0001' + ed.a; if (done[key]) return; done[key] = 1; }
      var hot = ptr[ed.a] && ptr[ed.b], cls = 'tz-e' + (hot ? ' on' : '');
      if (ed.a === ed.b) return;
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, rb = g.und ? r : r + 3;
      if (Math.abs(dy) < 1 && Math.abs(dx) > gx + 1) { // באותה שורה ולא שכנים: קשת מעל
        var sg = dx > 0 ? 1 : -1, cyy = a.y - 30 - Math.abs(dx) / 8;
        body += '<path class="' + cls + '" d="M' + (a.x + sg * 6) + ' ' + (a.y - r + 2) + ' Q' + f1((a.x + b.x) / 2) + ' ' + f1(cyy) + ' ' + (b.x - sg * 6) + ' ' + (b.y - r + 1) + '"' + (g.und ? '' : ' marker-end="url(#tzGa)"') + '/>';
        if (ed.w !== null) body += '<text class="tz-w" x="' + f1((a.x + b.x) / 2) + '" y="' + f1((a.y + cyy) / 2 - 2) + '" text-anchor="middle">' + esc(ed.w) + '</text>';
        return;
      }
      body +='<line class="' + cls + '" x1="' + f1(a.x + dx / d * r) + '" y1="' + f1(a.y + dy / d * r) + '" x2="' + f1(b.x - dx / d * rb) + '" y2="' + f1(b.y - dy / d * rb) + '"' + (g.und ? '' : ' marker-end="url(#tzGa)"') + '/>';
      if (ed.w !== null) body += '<text class="tz-w" x="' + f1((a.x + b.x) / 2 - dy / d * 9) + '" y="' + f1((a.y + b.y) / 2 + dx / d * 9 + 4) + '" text-anchor="middle">' + esc(ed.w) + '</text>';
    });
    var labels = '';
    g.keys.forEach(function (k) {
      var p = P[k], c = 'tz-nd' + (vis[k] ? ' vis' : '') + (que[k] ? ' que' : '') + (ptr[k] ? ' on' : '');
      body += '<circle class="' + c + '" cx="' + p.x + '" cy="' + p.y + '" r="' + r + '"/><text class="tz-nt" x="' + p.x + '" y="' + (p.y + 4.5) + '" text-anchor="middle">' + esc(k.length > 4 ? k.slice(0, 3) + '…' : k) + '</text>';
      if (dist[k] !== undefined) body += '<text class="tz-dd" x="' + p.x + '" y="' + f1(p.y + r + 12) + '" text-anchor="middle">' + esc(dist[k]) + '</text>';
      if (ptr[k]) labels += '<text class="tz-pl" x="' + p.x + '" y="' + f1(p.y - r - 6) + '" text-anchor="middle">' + esc(ptr[k].join(', ')) + '</text>';
    });
    var lg = [];
    if (used.vis) lg.push('<span><i class="v"></i><b dir="ltr">' + esc(used.vis) + '</b> (ביקרנו)</span>');
    if (used.que) lg.push('<span><i class="q"></i><b dir="ltr">' + esc(used.que) + '</b> (מחכים בתור)</span>');
    if (used.dist) lg.push('<span><i class="d"></i><b dir="ltr">' + esc(used.dist) + '</b> (המספר מתחת)</span>');
    return '<div class="tz-draw"><p class="tz-dt">הגרף <b dir="ltr">' + esc(g.nm) + '</b> <span>· זהב = הצומת שמטפלים בו</span></p>' + svgWrap(W, H, body + labels, 'tzG') +
      (lg.length ? '<p class="tz-lgd">' + lg.join('') + '</p>' : '') + '</div>';
  }
  function drawHtml(i) {
    var e = extract(i), h = '';
    NODES = e.nodes;
    if (e.ids.length) h += drawNodes(i, e);
    if (e.g) h += drawGraph(e);
    return h;
  }
  function compact(x) {
    var ks = Object.keys(x.ob);
    return '{' + ks.map(function (k) {
      var v = x.ob[k], t = oref(v), body;
      if (t) body = '<span class="tz-k">→</span>';
      else if (v && v.a && v.a.some(oref)) body = '[' + v.a.map(function (c) { return oref(c) ? '<span class="tz-k">→</span>' : val(c); }).join(', ') + ']';
      else body = val(v);
      return '<span class="tz-p">' + esc(k) + '</span>: ' + body;
    }).join(', ') + (x.len > ks.length ? ', …' : '') + '}';
  }

  function plain(v) { var o = {}; Object.keys(v).forEach(function (k) { o[k] = v[k]; }); return o; }
  function outHtml(n) {
    var lines = R ? R.out.slice(0, n) : [];
    return lines.length ? '<div class="tz-out"><b>פלט (' + (R.py ? 'print' : 'console.log') + ')</b><pre dir="ltr">' + lines.map(esc).join('\n') + '</pre></div>' : '';
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
    if (end) ev += R.err ? '<br><span class="sm-bad">✗ נזרקה שגיאה' + (R.errLine ? ' בשורה ' + R.errLine : '') + ': <span dir="ltr">' + esc(R.err) + '</span></span>' :
      R.cap ? '<br><span class="sm-bad">עצרנו אחרי ' + CAP + ' צעדים, כדי לא להיתקע. נסו קלט קטן יותר.</span>' : '<br><span class="sm-ok">✓ סוף הריצה</span>';
    $('tz-ev').innerHTML = ev;
    // ציור (רשימות, עצים, גרפים)
    var dh = drawHtml(cur);
    $('tz-draw').innerHTML = dh; $('tz-draw').hidden = !dh;
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
  function fillEx() {
    var ex = PY() ? PYEX : EX;
    $('tz-ex').innerHTML = '<optgroup label="דוגמאות">' + ex.map(function (x, i) { return '<option value="' + i + '">' + x[0] + '</option>'; }).join('') + '</optgroup>' +
      (P.length && !PY() ? '<optgroup label="פתרונות מסימולטור הראיון">' + P.map(function (p) { return '<option value="sim:' + p.id + '">' + esc(p.t) + '</option>'; }).join('') + '</optgroup>' : '') +
      '<option value="mine">הקוד שלי</option>';
    $('tz-lang').value = st.lang;
    $('tz-note-js').hidden = PY(); $('tz-note-py').hidden = !PY();
  }
  function loadEx(v, go) {
    var code = null, ex = PY() ? PYEX : EX;
    if (/^sim:/.test(v)) { if (PY()) return false; var id = v.slice(4); P.forEach(function (p) { if (p.id === id) code = simCode(p); }); }
    else if (ex[+v]) code = ex[+v][1];
    if (code === null) return false;
    if (PY()) st.pyex = v; else st.ex = v;
    $('tz-ex').value = v; $('tz-in').value = code;
    if (go) run(code);
    return true;
  }
  $('tz-ex').addEventListener('change', function () { if (this.value === 'mine') { $('tz-in').value = (PY() ? st.pycode : st.code) || ''; $('tz-in').focus(); return; } loadEx(this.value, true); });
  function setLang(l, go) {
    st.lang = l === 'py' ? 'py' : 'js'; save(); fillEx();
    var ex = PY() ? PYEX : EX, v = PY() ? (st.pyex || '0') : (st.ex || '0');
    $('tz-ex').value = v;
    $('tz-in').value = (PY() ? st.pycode : st.code) || ex[0][1];
    if (PY()) pyWorker(); // מתחילים לטעון ברקע
    if (go) run($('tz-in').value);
  }
  $('tz-lang').addEventListener('change', function () { setLang(this.value, true); T.used('tichnut_tzaad', 'lang_' + st.lang); });

  // התחלה: מהסימולטור (#sim=id), או #py, או מהקוד האחרון, או דוגמה – ומריצים מיד כדי שיהיה מה לראות
  var h = location.hash.match(/sim=([\w-]+)/);
  if (h) { st.lang = 'js'; fillEx(); }
  if (!(h && loadEx('sim:' + h[1], true))) {
    if (/(^|[#&])(py|lang=py)\b/.test(location.hash)) st.lang = 'py';
    else if (/(^|[#&])(js|lang=js)\b/.test(location.hash)) st.lang = 'js';
    setLang(st.lang, true);
  }
  window.TICHNUT.tzaad = { extract: function (i) { return extract(i); }, layout: function () { return layout(); }, instrument: instrument, run: run, go: go, simCode: simCode, EX: EX, PYEX: PYEX, setLang: setLang, state: function () { return { R: R, cur: cur }; } };
})();
