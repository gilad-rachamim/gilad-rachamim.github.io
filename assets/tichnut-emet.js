// טבלת אמת: מפרש ביטוי לוגי (NOT/AND/OR/XOR/→/↔), בונה טבלת אמת, ומסווג: טאוטולוגיה / סתירה / ספיק. ועוד DNF.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_emet', $ = function (id) { return document.getElementById(id); };
  var st = T.load(KEY, { e: '(A -> B) <-> (!B -> !A)' });
  // טוקנים: מזהים, סוגריים, אופרטורים (כולל סימנים מתמטיים ומילים)
  function lex(s) {
    var t = [], re = /\s*(<->|<=>|↔|->|=>|→|&&|\|\||[!~¬&∧|∨^⊕()01]|\bAND\b|\bOR\b|\bNOT\b|\bXOR\b|[A-Za-z_]\w*)/gy, m, i = 0;
    s = s.trim();
    while (i < s.length) {
      re.lastIndex = i; m = re.exec(s);
      if (!m) { var j = i; while (/\s/.test(s[j])) j++; throw new Error('תו לא מוכר: "' + s[j] + '" (מקום ' + (j + 1) + ')'); }
      var x = m[1], up = x.toUpperCase();
      if (/^(<->|<=>|↔)$/.test(x)) x = 'IFF'; else if (/^(->|=>|→)$/.test(x)) x = 'IMP';
      else if (/^(&&|&|∧)$/.test(x) || up === 'AND') x = 'AND'; else if (/^(\|\||\||∨)$/.test(x) || up === 'OR') x = 'OR';
      else if (/^(!|~|¬)$/.test(x) || up === 'NOT') x = 'NOT'; else if (/^(\^|⊕)$/.test(x) || up === 'XOR') x = 'XOR';
      t.push(x); i = re.lastIndex;
    }
    return t;
  }
  // עדיפויות: NOT > AND > XOR > OR > IMP (ימני) > IFF
  function parse(tk) {
    var p = 0, vars = {};
    function peek() { return tk[p]; }
    function eat(x) { if (tk[p] !== x) throw new Error('ציפיתי ל-"' + (x === ')' ? ')' : x) + '"' + (tk[p] ? ' ומצאתי "' + tk[p] + '"' : ' והביטוי נגמר')); p++; }
    function iff() { var l = imp(); while (peek() === 'IFF') { p++; var r = imp(); l = { op: 'IFF', a: l, b: r }; } return l; }
    function imp() { var l = or(); if (peek() === 'IMP') { p++; return { op: 'IMP', a: l, b: imp() }; } return l; }
    function or() { var l = xor(); while (peek() === 'OR') { p++; l = { op: 'OR', a: l, b: xor() }; } return l; }
    function xor() { var l = and(); while (peek() === 'XOR') { p++; l = { op: 'XOR', a: l, b: and() }; } return l; }
    function and() { var l = not(); while (peek() === 'AND') { p++; l = { op: 'AND', a: l, b: not() }; } return l; }
    function not() { if (peek() === 'NOT') { p++; return { op: 'NOT', a: not() }; } return atom(); }
    function atom() {
      var x = peek(); if (x == null) throw new Error('הביטוי נגמר באמצע');
      if (x === '(') { p++; var e = iff(); eat(')'); return e; }
      if (x === '0' || x === '1') { p++; return { op: 'C', v: x === '1' }; }
      if (/^[A-Za-z_]/.test(x) && ['AND', 'OR', 'NOT', 'XOR', 'IMP', 'IFF'].indexOf(x) < 0) { p++; vars[x] = 1; return { op: 'V', n: x }; }
      throw new Error('לא ציפיתי ל-"' + x + '"');
    }
    var tree = iff(); if (p < tk.length) throw new Error('יש משהו מיותר אחרי: "' + tk[p] + '"');
    return { tree: tree, vars: Object.keys(vars).sort() };
  }
  function ev(n, env) {
    switch (n.op) {
      case 'C': return n.v; case 'V': return env[n.n]; case 'NOT': return !ev(n.a, env);
      case 'AND': return ev(n.a, env) && ev(n.b, env); case 'OR': return ev(n.a, env) || ev(n.b, env);
      case 'XOR': return ev(n.a, env) !== ev(n.b, env); case 'IMP': return !ev(n.a, env) || ev(n.b, env);
      case 'IFF': return ev(n.a, env) === ev(n.b, env);
    }
  }
  function render() {
    var out = $('em-out');
    try {
      var r = parse(lex(st.e)), V = r.vars;
      if (V.length > 6) throw new Error('עד 6 משתנים (' + V.length + ' זה ' + Math.pow(2, V.length) + ' שורות)');
      var rows = [], trues = 0, mins = [];
      for (var k = 0; k < Math.pow(2, V.length); k++) {
        var env = {}, bits = [];
        V.forEach(function (v, i) { var b = !!(k >> (V.length - 1 - i) & 1); env[v] = b; bits.push(b); });
        var res = ev(r.tree, env); if (res) { trues++; mins.push(V.map(function (v, i) { return (bits[i] ? '' : '¬') + v; }).join('∧')); }
        rows.push('<tr' + (res ? ' class="t"' : '') + '>' + bits.map(function (b) { return '<td>' + (b ? 1 : 0) + '</td>'; }).join('') + '<td class="r">' + (res ? 1 : 0) + '</td></tr>');
      }
      var n = rows.length, kind = trues === n ? ['tauto', '✓ טאוטולוגיה – נכון תמיד'] : trues === 0 ? ['contra', '✗ סתירה – אף פעם לא נכון'] : ['sat', '◐ ספיק – נכון ב-' + trues + ' מתוך ' + n + ' שורות'];
      out.innerHTML = '<p class="em-kind ' + kind[0] + '">' + kind[1] + '</p>' +
        '<div class="em-tw"><table class="em-t" dir="ltr"><thead><tr>' + V.map(function (v) { return '<th>' + v + '</th>'; }).join('') + '<th class="r">תוצאה</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
        (trues && trues < n ? '<h3 class="em-h">DNF (סכום מינטרמים)</h3><p class="em-dnf" dir="ltr">' + mins.map(function (m) { return '(' + m + ')'; }).join(' ∨ ') + '</p>' : '');
      T.save(KEY, st);
    } catch (e) { out.innerHTML = '<p class="em-kind bad">' + e.message + '</p>'; }
  }
  $('em-in').value = st.e; render();
  $('em-in').addEventListener('input', function () { st.e = $('em-in').value; render(); });
  $('em-in').addEventListener('change', function () { T.used('tichnut_emet', 'add'); });
  $('em-ex').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-e]'); if (b) { st.e = b.getAttribute('data-e'); $('em-in').value = st.e; render(); T.used('tichnut_emet', 'example'); return; }
    var k = e.target.closest('button[data-k]'); if (k) { var i = $('em-in'), s = i.selectionStart || i.value.length; i.value = i.value.slice(0, s) + k.getAttribute('data-k') + i.value.slice(i.selectionEnd || s); st.e = i.value; i.focus(); render(); }
  });
})();
