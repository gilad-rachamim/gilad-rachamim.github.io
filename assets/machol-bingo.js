// מחולל בינגו – /kelim/chashiva/bingo/
// מילים (שלוש דרכים, machol-core.js) או מספרים -> כרטיסים שונים זה מזה (3×3/4×4/5×5, משבצת חינם) להדפסה ול-PDF,
// דף מנחה + פתקים לגזירה, מצב מנחה על המסך (הגרלה, הקראה בקול, בדיקת כרטיס לפי מספר),
// וקישור שבו כל משתתף מקבל כרטיס משלו בטלפון. כרטיס מס' k נבנה תמיד אותו דבר מהזרע – לכן אפשר לבדוק כל כרטיס.
(function () {
  'use strict';
  var MC = window.MC, $ = MC.$, TOOL = 'machol_bingo', KEY = 'machol-bingo';
  var app = $('bg-app'); if (!app) return;
  var O = MC.load(KEY + '-o', { k: 'w', z: 4, free: true, ft: 'חינם ★', cnt: 30, per: 2, title: '', em: true, name: true, call: true, slips: false, from: 1, to: 75, cols: true, seed: '' });
  if (!O.seed) O.seed = MC.seed();
  var shared = MC.dec(MC.param('d') || ''), panel = null, POOL = [], EMO = {};
  var HEAD = ['ב', 'י', 'נ', 'ג', 'ו'];

  // ================= כרטיסים =================
  function cellsN(z, free) { return z * z - (free && z % 2 ? 1 : 0); }
  function pool() {
    if (O.k === 'n') { var a = [], f = Math.max(0, Math.min(+O.from || 1, 998)), t = Math.max(f + 1, Math.min(+O.to || 75, 999)); for (var i = f; i <= t; i++) a.push(String(i)); return a; }
    return POOL.slice();
  }
  // כל הכרטיסים עד k, בסדר קבוע (בלי כפילויות כשאפשר)
  var memo = { key: '', list: [] };
  function cards(k) {
    var P = pool(), z = +O.z, free = !!O.free && z % 2 === 1, need = cellsN(z, free);
    var mk = O.seed + '|' + z + '|' + free + '|' + O.k + '|' + (O.k === 'n' ? O.from + '-' + O.to + (O.cols ? 'c' : '') : P.join('\u0001'));
    if (memo.key !== mk) memo = { key: mk, list: [], seen: {} };
    if (P.length < need) return null;
    var colMode = O.k === 'n' && O.cols && z === 5 && P.length >= 25;
    while (memo.list.length < k) {
      var i = memo.list.length + 1, card = null;
      for (var t = 0; t < 25; t++) {
        var rnd = MC.rng(O.seed + ':' + i + ':' + t), pick;
        if (colMode) { // עמודות ב-י-נ-ג-ו: לכל עמודה טווח משלה
          var seg = Math.floor(P.length / 5), colsArr = [];
          for (var c = 0; c < 5; c++) colsArr.push(MC.shuffle(P.slice(c * seg, c === 4 ? P.length : (c + 1) * seg), rnd).slice(0, 5).sort(function (a, b) { return a - b; }));
          pick = []; for (var r = 0; r < 5; r++) for (c = 0; c < 5; c++) pick.push(colsArr[c][r]);
          if (free) pick[12] = null;
        } else {
          var s = MC.shuffle(P, rnd).slice(0, need); pick = [];
          for (var j = 0, q = 0; j < z * z; j++) pick.push(free && j === (z * z - 1) / 2 ? null : s[q++]);
        }
        var sig = pick.filter(function (x) { return x != null; }).slice().sort().join('\u0001');
        if (!memo.seen[sig] || t === 24) { memo.seen[sig] = 1; card = pick; break; }
      }
      memo.list.push(card);
    }
    return memo.list.slice(0, k);
  }
  function card(k) { var l = cards(k); return l ? l[k - 1] : null; }
  function wins(cells, marked, z) { // שורות, טורים ואלכסונים שלמים
    var ok = function (i) { return cells[i] == null || marked[i]; }, n = 0, full = true;
    for (var r = 0; r < z; r++) { var a = true; for (var c = 0; c < z; c++) a = a && ok(r * z + c); if (a) n++; }
    for (c = 0; c < z; c++) { var b = true; for (r = 0; r < z; r++) b = b && ok(r * z + c); if (b) n++; }
    var d1 = true, d2 = true; for (r = 0; r < z; r++) { d1 = d1 && ok(r * z + r); d2 = d2 && ok(r * z + z - 1 - r); }
    if (d1) n++; if (d2) n++;
    for (var i = 0; i < cells.length; i++) full = full && ok(i);
    return { lines: n, full: full };
  }

  // ================= HTML של כרטיס (מסך והדפסה) =================
  function fit(text, cell, em) { // גודל אות במ"מ שנכנס במשבצת
    var words = String(text).split(' '), L = Math.max(2, Math.max.apply(0, words.map(function (w) { return w.length; }))), lines = words.length > 1 ? 2 : 1;
    var f = Math.min(cell * (O.k === 'n' ? 0.42 : 0.3), cell * 0.86 / (0.56 * L), cell * (em ? 0.5 : 0.78) / (lines * 1.2));
    return Math.max(2.2, f).toFixed(2);
  }
  function cardHtml(cells, k, gs, title, marks) {
    var z = Math.round(Math.sqrt(cells.length)), cs = gs / z, h = '';
    var head = O.k === 'n' && O.cols && z === 5 ? '<div class="bg-letters" style="font-size:' + (cs * 0.55).toFixed(1) + 'mm">' + HEAD.map(function (l) { return '<b>' + l + '</b>'; }).join('') + '</div>' : '';
    cells.forEach(function (v, i) {
      if (v == null) { h += '<div class="bg-c free" style="font-size:' + fit(O.ft || 'חינם', cs, false) + 'mm">' + MC.esc(O.ft || 'חינם ★') + '</div>'; return; }
      var e = O.k === 'w' && O.em && EMO[v] ? EMO[v] : '';
      h += '<div class="bg-c' + (marks && marks[i] ? ' on' : '') + '" data-i="' + i + '">' + (e ? '<span class="bg-e" style="font-size:' + (cs * 0.34).toFixed(1) + 'mm">' + e + '</span>' : '') +
        '<span style="font-size:' + fit(v, cs, !!e) + 'mm">' + MC.esc(v) + '</span></div>';
    });
    return '<div class="bg-card" style="width:' + gs.toFixed(1) + 'mm"><div class="bg-ttl"><b>' + MC.esc(title) + '</b><span>כרטיס ' + k + '</span></div>' + head +
      '<div class="bg-grid" style="grid-template-columns:repeat(' + z + ',minmax(0,1fr));height:' + gs.toFixed(1) + 'mm">' + h + '</div>' +
      (O.name ? '<div class="bg-name">שם: ______________________</div>' : '') + '</div>';
  }
  function scrGs(el) { var w = (el && el.clientWidth) || 330; return Math.max(50, Math.min(120, (w - 28) / 3.7795)); }
  function title() { return O.title || (O.k === 'n' ? 'בינגו' : ('בינגו ' + (panel ? panel.topicName() : '')).trim()); }

  // ================= דפים להדפסה =================
  function pages() {
    var n = Math.max(1, Math.min(200, +O.cnt || 30)), list = cards(n); if (!list) return [];
    var per = +O.per || 2, lay = { 1: [1, 1], 2: [1, 2], 4: [2, 2], 6: [2, 3] }[per] || [1, 2];
    var colW = (186 - (lay[0] - 1) * 8) / lay[0], rowH = (270 - (lay[1] - 1) * 8) / lay[1];
    var extra = 14 + (O.name ? 9 : 0) + (O.k === 'n' && O.cols && +O.z === 5 ? 11 : 0), gs = Math.min(colW, rowH - extra, 170);
    var out = [], t = title();
    for (var i = 0; i < list.length; i += per) {
      var h = '<div class="bg-sheet" style="grid-template-columns:repeat(' + lay[0] + ',1fr);grid-template-rows:repeat(' + lay[1] + ',1fr)">';
      for (var j = i; j < Math.min(list.length, i + per); j++) h += '<div class="bg-slot">' + cardHtml(list[j], j + 1, gs, t) + '</div>';
      out.push(h + '</div>' + MC.foot());
    }
    var P = pool();
    if (O.call) {
      var items = O.k === 'n' ? P : P.slice().sort(function (a, b) { return a.localeCompare(b, 'he'); });
      var fs = items.length > 90 ? 8.5 : items.length > 60 ? 9.5 : 11;
      out.push(MC.head('דף המנחה: ' + t, 'מגרילים פריט, מקריאים אותו ומסמנים כאן ✓. כשמישהו קורא "בינגו!" – בודקים לפי מספר הכרטיס בכלי שבאתר.', false) +
        '<ul class="bg-call' + (O.k === 'n' ? ' num' : '') + '" style="font-size:' + fs + 'pt">' + items.map(function (x) { return '<li><span class="mc-box"></span>' + MC.esc(x) + '</li>'; }).join('') + '</ul>' + MC.foot());
    }
    if (O.slips) {
      for (var s = 0; s < P.length; s += 48) {
        out.push(MC.head('פתקים לגזירה: ' + t, 'גוזרים לאורך הקווים, מקפלים ומגרילים מתוך כובע או קופסה.', false) +
          '<div class="bg-slips">' + P.slice(s, s + 48).map(function (x) { var e = O.k === 'w' && O.em && EMO[x] ? EMO[x] + ' ' : ''; return '<div>' + e + MC.esc(x) + '</div>'; }).join('') + '</div>' + MC.foot());
      }
    }
    return out;
  }
  function refreshPreview() { var p = pages(); if (p.length) MC.preview($('bg-prev'), p, 2); else $('bg-prev').innerHTML = ''; }

  // ================= תצוגה על המסך =================
  var view = 1;
  function show() {
    var z = +O.z, free = !!O.free && z % 2 === 1, need = cellsN(z, free), P = pool();
    var ok = P.length >= need;
    $('bg-need').innerHTML = ok ? (O.k === 'w' && P.length < need * 1.5 ? '⚠️ יש ' + P.length + ' מילים ללוח של ' + need + ' משבצות. הכרטיסים יהיו דומים מאוד, וכמה ילדים יגיעו לבינגו יחד. מומלץ לפחות <b>' + Math.ceil(need * 1.5) + '</b> מילים.' : '') :
      'ללוח ' + z + '×' + z + ' צריך לפחות <b>' + need + '</b> ' + (O.k === 'n' ? 'מספרים' : 'מילים') + ' (יש ' + P.length + '). הוסיפו מילים, בחרו נושא, או לוח קטן יותר.';
    $('bg-need').className = 'mc-msg' + (ok ? '' : ' bad');
    $('bg-out').hidden = !ok;
    if (!ok) return;
    var n = Math.max(1, Math.min(200, +O.cnt || 30)); if (view > n) view = 1;
    var c = card(view);
    $('bg-one').innerHTML = cardHtml(c, view, scrGs($('bg-one')), title());
    $('bg-pos').textContent = 'כרטיס ' + view + ' מתוך ' + n;
    $('bg-sum').textContent = n + ' כרטיסים · ' + z + '×' + z + ' · ' + P.length + (O.k === 'n' ? ' מספרים' : ' מילים');
    refreshPreview();
    caller.reset(false);
  }

  // ================= מצב מנחה =================
  var caller = (function () {
    var CK = KEY + '-call', st = MC.load(CK, null);
    function sig() { return MC.hash(pool().join('\u0001')); }
    function order() { return MC.shuffle(pool(), MC.rng(O.seed + ':call:' + (st ? st.round : 0))); }
    function reset(force) {
      if (force || !st || st.sig !== sig()) { st = { sig: sig(), n: 0, round: st && force ? (st.round || 0) + 1 : (st ? st.round || 0 : 0) }; MC.save(CK, st); }
      render();
    }
    function render() {
      var o = order(), done = o.slice(0, st.n), now = done[done.length - 1];
      $('bg-now').innerHTML = now ? (O.em && EMO[now] ? '<span class="bg-e">' + EMO[now] + '</span>' : '') + MC.esc(now) : '<small>לוחצים "להגריל"</small>';
      $('bg-cnt').textContent = st.n ? 'הוגרלו ' + st.n + ' מתוך ' + o.length : '';
      $('bg-hist').innerHTML = done.slice(0, -1).reverse().map(function (x) { return '<li>' + MC.esc(x) + '</li>'; }).join('');
      $('bg-next').disabled = st.n >= o.length;
      $('bg-undo').disabled = !st.n;
    }
    function speak(t) {
      if (!$('bg-voice').checked || !window.speechSynthesis) return;
      try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); u.lang = MC.isEn(t) ? 'en-US' : 'he-IL'; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) {}
    }
    $('bg-next').addEventListener('click', function () { var o = order(); if (st.n >= o.length) return; st.n++; MC.save(CK, st); render(); speak(o[st.n - 1]); MC.used(TOOL, 'call'); });
    $('bg-undo').addEventListener('click', function () { if (st.n) { st.n--; MC.save(CK, st); render(); } });
    $('bg-again').addEventListener('click', function () { reset(true); MC.used(TOOL, 'call_reset'); });
    $('bg-say').addEventListener('click', function () { var o = order(); if (st.n) speak(o[st.n - 1]); });
    $('bg-chk').addEventListener('click', function () {
      var k = Math.floor(+$('bg-chkn').value || 0), out = $('bg-chkout');
      if (k < 1 || k > 2000) { out.innerHTML = '<p class="mc-msg bad">כתבו מספר כרטיס (מופיע בפינת הכרטיס).</p>'; return; }
      var c = card(k); if (!c) return;
      var called = {}; order().slice(0, st.n).forEach(function (x) { called[x] = 1; });
      var marks = c.map(function (v) { return v != null && !!called[v]; }), w = wins(c, marks, +O.z);
      out.innerHTML = cardHtml(c, k, scrGs(out) - 4, title(), marks) + '<p class="mc-msg ' + (w.lines ? 'ok' : 'bad') + '">' + (w.full ? '🎉 כרטיס מלא! בינגו!' : w.lines ? '✓ יש ' + (w.lines === 1 ? 'שורה מלאה' : w.lines + ' שורות מלאות') + ' (שורה, טור או אלכסון).' : 'עוד אין שורה מלאה בכרטיס הזה.') + '</p>';
      MC.used(TOOL, 'verify');
    });
    return { reset: reset, render: render };
  })();

  // ================= משתתף עם קישור: כרטיס בטלפון =================
  function player(d) {
    document.body.classList.add('mc-student');
    O = { k: d.k === 'n' ? 'n' : 'w', z: d.z || 4, free: !!d.f, ft: d.ft || 'חינם ★', cnt: 1, per: 1, title: d.t || 'בינגו', em: !!d.e, name: false, from: d.a || 1, to: d.b || 75, cols: !!d.c, seed: d.s || 'x' };
    POOL = (d.i || []).map(String); (d.m || []).forEach(function (e, i) { if (e && POOL[i]) EMO[POOL[i]] = e; });
    var LK = KEY + '-me:' + MC.hash(MC.enc(d)), me = MC.load(LK, null);
    if (!me) { me = { k: 101 + Math.floor(Math.random() * 899), m: {} }; MC.save(LK, me); }
    $('bg-from').hidden = false; $('bg-from-t').textContent = d.t || 'בינגו';
    function render() {
      var c = card(me.k), z = +O.z; if (!c) { $('bg-mine').innerHTML = '<p class="mc-msg bad">הקישור לא שלם.</p>'; return; }
      var marks = c.map(function (v, i) { return !!me.m[i]; });
      $('bg-mine').innerHTML = cardHtml(c, me.k, scrGs($('bg-mine')), O.title, marks);
      var w = wins(c, marks, z), b = $('bg-yes');
      b.hidden = !w.lines; b.innerHTML = w.full ? '🎉 בינגו! כרטיס מלא – הראו למנחה את כרטיס ' + me.k : '🎉 בינגו! יש לכם שורה – קראו "בינגו" והראו למנחה את כרטיס ' + me.k;
      if (w.lines && !me.won) { me.won = 1; MC.save(LK, me); MC.used(TOOL, 'player_bingo'); }
      [].forEach.call($('bg-mine').querySelectorAll('.bg-c[data-i]'), function (el) {
        el.setAttribute('role', 'button'); el.tabIndex = 0;
        var tog = function () { var i = +el.getAttribute('data-i'); if (me.m[i]) delete me.m[i]; else me.m[i] = 1; MC.save(LK, me); render(); MC.used(TOOL, 'player_mark'); };
        el.addEventListener('click', tog); el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
      });
    }
    $('bg-newcard').addEventListener('click', function () { me = { k: 101 + Math.floor(Math.random() * 899), m: {} }; MC.save(LK, me); render(); });
    $('bg-clearm').addEventListener('click', function () { me.m = {}; me.won = 0; MC.save(LK, me); render(); });
    $('bg-own').addEventListener('click', function () { location.href = location.pathname; });
    render(); MC.used(TOOL, 'open_link');
  }
  function shareData() {
    var d = { t: title(), k: O.k, z: +O.z, f: O.free ? 1 : 0, ft: O.ft, s: O.seed };
    if (O.k === 'n') { d.a = +O.from; d.b = +O.to; d.c = O.cols ? 1 : 0; } else { d.i = POOL; if (O.em) { d.e = 1; d.m = POOL.map(function (w) { return EMO[w] || ''; }); } }
    return d;
  }

  // ================= הגדרות =================
  function bind(id, prop, kind, after) {
    var el = $(id); if (!el) return;
    if (kind === 'c') el.checked = !!O[prop]; else el.value = O[prop] == null ? '' : String(O[prop]);
    el.addEventListener(kind === 'c' ? 'change' : 'input', function () {
      O[prop] = kind === 'c' ? el.checked : kind === 'n' ? +el.value : el.value; MC.save(KEY + '-o', O);
      clearTimeout(el._t); el._t = setTimeout(function () { syncUi(); (after || show)(); }, kind === 'c' ? 0 : 450);
    });
  }
  function syncUi() {
    app.setAttribute('data-k', O.k);
    [].forEach.call(document.querySelectorAll('#bg-kind button'), function (b) { b.setAttribute('aria-checked', b.getAttribute('data-k') === O.k ? 'true' : 'false'); });
    [].forEach.call(document.querySelectorAll('#bg-size button'), function (b) { b.setAttribute('aria-checked', +b.getAttribute('data-z') === +O.z ? 'true' : 'false'); });
    $('bg-freef').hidden = +O.z % 2 === 0;
    $('bg-colsf').hidden = !(O.k === 'n' && +O.z === 5);
  }
  function settings() {
    [].forEach.call(document.querySelectorAll('#bg-kind button'), function (b) { b.addEventListener('click', function () { O.k = b.getAttribute('data-k'); if (O.k === 'n' && +O.z === 4) O.z = 5; MC.save(KEY + '-o', O); syncUi(); show(); MC.used(TOOL, 'kind_' + O.k); }); });
    [].forEach.call(document.querySelectorAll('#bg-size button'), function (b) { b.addEventListener('click', function () { O.z = +b.getAttribute('data-z'); MC.save(KEY + '-o', O); syncUi(); show(); }); });
    bind('bg-free', 'free', 'c'); bind('bg-ft', 'ft', 't'); bind('bg-cntn', 'cnt', 'n'); bind('bg-per', 'per', 'n', refreshPreview); bind('bg-title', 'title', 't');
    bind('bg-em', 'em', 'c'); bind('bg-name', 'name', 'c', refreshPreview); bind('bg-callp', 'call', 'c', refreshPreview); bind('bg-slips', 'slips', 'c', refreshPreview);
    bind('bg-nfrom', 'from', 'n'); bind('bg-nto', 'to', 'n'); bind('bg-cols', 'cols', 'c');
    syncUi();
  }
  function actions() {
    $('bg-prevc').addEventListener('click', function () { view = view > 1 ? view - 1 : Math.max(1, +O.cnt || 30); show(); });
    $('bg-nextc').addEventListener('click', function () { view = view < (+O.cnt || 30) ? view + 1 : 1; show(); });
    $('bg-shuf').addEventListener('click', function () { O.seed = MC.seed(); MC.save(KEY + '-o', O); show(); MC.used(TOOL, 'shuffle'); });
    $('bg-make').addEventListener('click', function () { POOL = panel ? panel.items().map(function (x) { return x.w; }) : POOL; show(); MC.used(TOOL, 'make', { k: O.k, z: O.z, n: O.cnt, mode: panel ? panel.mode() : '' }); var t = $('bg-out'); if (t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('bg-print').addEventListener('click', function () { var p = pages(); if (!p.length) return; MC.print(p, title()); MC.used(TOOL, 'print', { k: O.k, z: O.z, n: O.cnt }); });
    MC.pdfButton($('bg-pdf'), pages, title, TOOL);
    $('bg-send').addEventListener('click', function () { MC.wa('🎉 ' + title() + ' – כל אחד פותח את הקישור ומקבל כרטיס משלו בטלפון:\n' + MC.link(shareData())); MC.used(TOOL, 'send_link'); });
    $('bg-copy').addEventListener('click', function () { MC.copy(MC.link(shareData()), this); MC.used(TOOL, 'copy_link'); });
  }
  function fromPanel(items) {
    POOL = []; EMO = {};
    items.forEach(function (x) { POOL.push(x.w); if (x.e) EMO[x.w] = x.e; });
    show();
  }

  window.addEventListener('resize', function () { clearTimeout(window._bgr); window._bgr = setTimeout(refreshPreview, 300); });
  if (shared && (shared.i || shared.k === 'n')) { player(shared); return; }
  settings(); actions();
  panel = MC.panel($('bg-words'), { key: KEY + '-w', tool: TOOL, clues: false, n: 24, example: 'chanuka', onChange: fromPanel });
  fromPanel(panel.items());
})();
