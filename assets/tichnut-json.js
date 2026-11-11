// מסדר JSON: מסדר, מכווץ, ממיין מפתחות ומראה בדיוק איפה השגיאה (שורה ועמודה). הכול בדפדפן, שום דבר לא נשמר.
(function () {
  var T = window.TICHNUT, $ = function (id) { return document.getElementById(id); };
  var EX = '{"name":"גילעד","tools":["vram","occupancy","gpu"],"gpu":{"model":"RTX 4090","vram_gb":24,"cuda":true},"projects":[{"id":1,"lang":"Python"},{"id":2,"lang":"CUDA C++"}]}';
  var inp = $('js-in'), out = $('js-out'), msg = $('js-msg'), last = '';

  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = sortKeys(v[k]); }); return o; }
    return v;
  }
  function stats(v) {
    var keys = 0, depth = 0;
    (function walk(x, d) {
      if (d > depth) depth = d;
      if (Array.isArray(x)) x.forEach(function (y) { walk(y, d + 1); });
      else if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { keys++; walk(x[k], d + 1); });
    })(v, 0);
    return { keys: keys, depth: depth };
  }
  function where(text, err) {
    var m = /position (\d+)/.exec(err.message), pos = m ? +m[1] : -1;
    var lc = /line (\d+) column (\d+)/.exec(err.message);
    if (lc) return { line: +lc[1], col: +lc[2] };
    if (pos < 0) return null;
    var before = text.slice(0, pos).split('\n');
    return { line: before.length, col: before[before.length - 1].length + 1, pos: pos };
  }
  function run(mode) {
    var text = inp.value.trim();
    if (!text) { out.textContent = ''; msg.textContent = 'הדביקו JSON בתיבה למעלה.'; msg.className = 'note'; return; }
    try {
      var v = JSON.parse(text);
      if ($('js-sort').checked) v = sortKeys(v);
      last = mode === 'min' ? JSON.stringify(v) : JSON.stringify(v, null, $('js-ind').value === 'tab' ? '	' : +$('js-ind').value);
      out.textContent = last;
      var s = stats(v), kb = new Blob([last]).size;
      msg.textContent = '✓ JSON תקין · ' + s.keys + ' מפתחות · עומק ' + s.depth + ' · ' + (kb < 1024 ? kb + ' bytes' : (kb / 1024).toFixed(1) + ' KB');
      msg.className = 'note ok';
      T.used('tichnut_json', mode === 'min' ? 'min' : 'add');
    } catch (e) {
      var w = where(text, e);
      out.textContent = '';
      msg.textContent = '✗ לא תקין' + (w ? ': שורה ' + w.line + ', עמודה ' + w.col : '') + '. ' + hint(text, w);
      msg.className = 'note bad';
      if (w && w.pos != null) { inp.focus(); inp.setSelectionRange(Math.max(0, w.pos - 1), w.pos + 1); }
    }
  }
  function hint(text, w) {
    if (/'/.test(text) && !/"/.test(text)) return 'ב-JSON משתמשים במירכאות כפולות " ולא בגרש \'.';
    if (/,\s*[}\]]/.test(text)) return 'יש פסיק מיותר לפני סוגר.';
    if (/[{,]\s*[A-Za-z_]\w*\s*:/.test(text)) return 'שמות מפתחות חייבים להיות בתוך מירכאות כפולות.';
    return 'בדקו פסיקים, סוגריים ומירכאות סביב המקום הזה.';
  }
  $('js-pretty').addEventListener('click', function () { run('pretty'); });
  $('js-min').addEventListener('click', function () { run('min'); });
  $('js-copy').addEventListener('click', function () {
    if (!last) return;
    try { navigator.clipboard.writeText(last); $('js-copy').textContent = 'הועתק ✓'; setTimeout(function () { $('js-copy').textContent = 'להעתיק את התוצאה'; }, 1500); } catch (e) {}
    T.used('tichnut_json', 'copy');
  });
  $('js-ex').addEventListener('click', function () { inp.value = EX; run('pretty'); });
  $('js-clear').addEventListener('click', function () { inp.value = ''; out.textContent = ''; last = ''; msg.textContent = ''; inp.focus(); });
  inp.value = EX; run('pretty');
})();
