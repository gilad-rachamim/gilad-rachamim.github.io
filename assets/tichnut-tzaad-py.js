// מריץ צעד אחר צעד – Python. Web Worker: טוען את Pyodide מקומית (assets/vendor/pyodide),
// שומר אותו ב-Cache Storage משלו (בפעם השנייה בלי הורדה), ומריץ את הקוד עם sys.settrace:
// בכל שורה, כניסה ויציאה מפונקציה נשמר "צילום" של המשתנים ושל מחסנית הקריאות,
// באותו פורמט צעדים שהתצוגה של JavaScript כבר מציגה.
var BASE = self.location.origin + '/assets/vendor/pyodide/', CACHE = 'tzaad-pyodide-314.0.7';
var NOCACHE = /[?&]nocache\b/.test(self.location.search);

// fetch עם מטמון: קבצי Pyodide הגדולים נשמרים פעם אחת
var realFetch = self.fetch.bind(self);
self.fetch = function (input, init) {
  var url = typeof input === 'string' ? input : (input && input.url) || '';
  if (NOCACHE || url.indexOf(BASE) < 0 || !self.caches) return realFetch(input, init);
  return caches.open(CACHE).then(function (c) {
    return c.match(url).then(function (hit) {
      if (hit) return hit;
      return realFetch(input, init).then(function (r) {
        if (r.ok) c.put(url, r.clone()).catch(function () {});
        return r;
      });
    });
  }).catch(function () { return realFetch(input, init); });
};
// ניקוי גרסאות ישנות של המטמון
if (self.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { if (k.indexOf('tzaad-pyodide-') === 0 && k !== CACHE) caches.delete(k); }); }).catch(function () {});

var HARNESS = [
  'import sys, json, ast, types',
  'class _Cap(BaseException): pass',
  'def tz_run(code, CAP):',
  '    steps, out, frames, buf = [], [], [], [""]',
  '    cnt = [0]',
  '    ids, keep = {}, []',
  '    def oid(v):',
  '        k = id(v)',
  '        if k not in ids:',
  '            ids[k] = len(ids) + 1',
  '            keep.append(v)',
  '        return ids[k]',
  '    def ser(v, d=0, sn=None):',
  '        if sn is None: sn = {"n": 0, "m": set()}',
  '        if v is None or isinstance(v, bool): return v',
  '        if isinstance(v, int): return v if abs(v) < 2**53 else {"n": str(v)}',
  '        if isinstance(v, float): return v if v == v and v not in (float("inf"), float("-inf")) else {"n": repr(v)}',
  '        if isinstance(v, str): return {"s": v if len(v) <= 200 else v[:200] + "…"}',
  '        if isinstance(v, (list, tuple)) or type(v).__name__ == "deque":',
  '            if d > 4: return {"r": "[…]"}',
  '            a = list(v)',
  '            return {"a": [ser(x, d + 1, sn) for x in a[:40]], "len": len(a)}',
  '        if isinstance(v, (set, frozenset)):',
  '            if d > 4: return {"r": "{…}"}',
  '            a = list(v)',
  '            try: a.sort()',
  '            except Exception: pass',
  '            return {"set": [ser(x, d + 1, sn) for x in a[:30]], "len": len(a)}',
  '        if isinstance(v, (types.FunctionType, types.BuiltinFunctionType, type, types.MethodType)):',
  '            return {"f": getattr(v, "__name__", "פונקציה")}',
  '        if isinstance(v, types.ModuleType): return {"n": "module " + v.__name__}',
  '        isd = isinstance(v, dict)',
  '        if isd or (hasattr(v, "__dict__") and not isinstance(v, type)):',
  '            i = oid(v)',
  '            if id(v) in sn["m"]: return {"ref": i}',
  '            if sn["n"] >= 60: return {"r": "{…}"}',
  '            sn["m"].add(id(v)); sn["n"] += 1',
  '            if isd: items = [(repr(k), x) for k, x in list(v.items())]',
  '            else: items = [(k, x) for k, x in vars(v).items() if not k.startswith("__")]',
  '            return {"ob": {k: ser(x, d, sn) for k, x in items[:20]}, "len": len(items), "id": i}',
  '        r = repr(v)',
  '        return {"n": r if len(r) <= 80 else r[:80] + "…"}',
  '    def snap(fr):',
  '        o = {}',
  '        for k, v in list(fr.f_locals.items()):',
  '            if k.startswith("__") or isinstance(v, (types.FunctionType, type, types.ModuleType, types.BuiltinFunctionType)): continue',
  '            try: o[k] = ser(v)',
  '            except Exception: o[k] = {"n": "?"}',
  '        return o',
  '    def copy():',
  '        n = len(frames)',
  '        for i, rec in enumerate(frames):',
  '            if i >= n - 8: rec["v"] = snap(rec["fr"])',
  '        return [{"n": r["n"], "v": r["v"], "l": r["l"]} for r in frames]',
  '    def tick():',
  '        cnt[0] += 1',
  '        if cnt[0] > CAP: raise _Cap()',
  '    def oc(): return len(out)',
  '    skip = set()',
  '    def local(fr, ev, arg):',
  '        rec = frames[-1] if frames and frames[-1]["fr"] is fr else None',
  '        if rec is None: return local',
  '        if ev == "line":',
  '            rec["exc"] = False',
  '            if rec["mod"] and fr.f_lineno in skip: return local',
  '            tick(); rec["l"] = fr.f_lineno',
  '            steps.append({"l": fr.f_lineno, "f": copy(), "o": oc()})',
  '        elif ev == "exception":',
  '            rec["exc"] = True',
  '        elif ev == "return":',
  '            if not rec["mod"] and not rec["exc"]:',
  '                tick(); rec["l"] = fr.f_lineno',
  '                steps.append({"l": fr.f_lineno, "f": copy(), "o": oc(), "ret": ser(arg), "fn": rec["n"]})',
  '            if not rec["mod"]: frames.pop()',
  '        return local',
  '    def glob(fr, ev, arg):',
  '        if ev != "call" or fr.f_code.co_filename != "<tz>": return None',
  '        mod = fr.f_code.co_name == "<module>"',
  '        if not mod and not (fr.f_code.co_flags & 1): return None',
  '        rec = {"n": "ראשי" if mod else fr.f_code.co_name, "fr": fr, "v": {}, "l": fr.f_lineno, "mod": mod, "exc": False}',
  '        frames.append(rec)',
  '        if not mod:',
  '            tick()',
  '            steps.append({"l": fr.f_lineno, "f": copy(), "o": oc(), "call": rec["n"]})',
  '        return local',
  '    class W:',
  '        def write(self, s):',
  '            parts = (buf[0] + s).split("\\n")',
  '            buf[0] = parts.pop()',
  '            for p in parts:',
  '                if len(out) < 300: out.append(p)',
  '            return len(s)',
  '        def flush(self): pass',
  '    def no_input(*a): raise RuntimeError("input() לא נתמך כאן. שימו את הערך ישר בקוד, למשל n = 5")',
  '    res = {"steps": steps, "out": out, "err": None, "cap": False, "errLine": None}',
  '    try:',
  '        tree = ast.parse(code, "<tz>")',
  '    except SyntaxError as e:',
  '        res["syntax"] = {"line": e.lineno, "msg": e.msg}',
  '        return json.dumps(res)',
  '    for n in tree.body:',
  '        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Import, ast.ImportFrom)):',
  '            skip.add(n.lineno)',
  '            for dec in getattr(n, "decorator_list", []): skip.add(dec.lineno)',
  '    g = {"__name__": "__main__", "__builtins__": __builtins__}',
  '    import builtins',
  '    old_out, old_in = sys.stdout, builtins.input',
  '    sys.stdout = W(); builtins.input = no_input',
  '    try:',
  '        cobj = compile(tree, "<tz>", "exec")',
  '        sys.settrace(glob)',
  '        exec(cobj, g)',
  '    except _Cap:',
  '        res["cap"] = True',
  '    except BaseException as e:',
  '        tb, line = e.__traceback__, None',
  '        while tb is not None:',
  '            if tb.tb_frame.f_code.co_filename == "<tz>": line = tb.tb_lineno',
  '            tb = tb.tb_next',
  '        res["err"] = type(e).__name__ + ": " + str(e)',
  '        res["errLine"] = line',
  '    finally:',
  '        sys.settrace(None)',
  '        sys.stdout = old_out; builtins.input = old_in',
  '    if buf[0] and len(out) < 300: out.append(buf[0])',
  '    return json.dumps(res)'
].join('\n');

var py = null, ready = null, errs = [];
function boot() {
  if (ready) return ready;
  // Worker מסוג module (pyodide.asm.mjs נטען ב-import)
  ready = import(BASE + 'pyodide.mjs').then(function (m) {
    return m.loadPyodide({ indexURL: BASE, stdout: function () {}, stderr: function (s) { if (errs.length < 80) errs.push(s); } });
  }).then(function (p) {
    py = p;
    py.runPython(HARNESS);
    postMessage({ ready: 1 });
  });
  return ready;
}
self.onmessage = function (e) {
  var d = e.data || {};
  boot().then(function () {
    if (d.code === undefined) return;
    var fn = py.globals.get('tz_run'), s;
    try { s = fn(d.code, d.cap || 2000); } finally { fn.destroy(); }
    var r = JSON.parse(s);
    r.id = d.id;
    postMessage(r);
  }).catch(function (x) {
    postMessage({ id: d.id, fatal: String((x && x.message) || x), log: errs.slice(-30).join('\n') });
  });
};
