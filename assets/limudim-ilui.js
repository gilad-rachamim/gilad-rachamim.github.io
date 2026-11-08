// כלים ללימודים – לימוד לעילוי נשמה ולזכות (/limudim/ilui/) ולימוד משותף בקבוצה (/limudim/kvutza/).
// בלי שרת: כל התוכנית יושבת בתוך הקישור (אחרי #), והסימונים נשמרים רק בטלפון.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var B = window.LIMUD_BOOKS, EN = window.LIMUD_EN, FIRST = window.MISHNA_FIRST || '';
  if (!B || !EN) return;
  function load(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function used(tool, extra) { if (window.toolUsed) window.toolUsed(tool, extra); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function today() { return ymd(new Date()); }
  function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }
  var DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];
  function dayLabel(s) { var d = parse(s); var w = d.getDay(); return (w === 6 ? 'שבת' : 'יום ' + DAYS[w]) + ' ' + d.getDate() + '.' + (d.getMonth() + 1); }
  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hund = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    if (n >= 100) { s += hund[Math.floor(n / 100)]; n %= 100; }
    if (n === 15) return s + 'טו';
    if (n === 16) return s + 'טז';
    return s + tens[Math.floor(n / 10)] + ones[n % 10];
  }

  // ---------- קידוד התוכנית לתוך הקישור ----------
  function enc(o) {
    var bytes = new TextEncoder().encode(JSON.stringify(o)), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function dec(s) {
    try {
      var bin = atob(s.replace(/-/g, '+').replace(/_/g, '/')), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { return null; }
  }
  function hashOf(o) { var s = JSON.stringify(o), h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

  // ---------- ההקדשה ----------
  var PURP = { niftar: 'לעילוי נשמת', refua: 'לרפואת', hatzlacha: 'להצלחת', zivug: 'לזיווג הגון ל', zchut: 'לזכות', none: '' };
  function dedLine(d) {
    if (!d || !d.n) return '';
    var who = d.n + (d.par ? ' ' + (d.bb || 'בן') + ' ' + d.par : '');
    var tail = d.k === 'niftar' ? ' ז״ל' : d.k === 'refua' ? ' בתוך שאר חולי ישראל' : '';
    return (PURP[d.k] || '') + ' ' + who + tail;
  }
  function readDed(prefix) {
    return { k: $(prefix + '-k').value, n: $(prefix + '-n').value.trim().slice(0, 50), bb: $(prefix + '-bb').value, par: $(prefix + '-par').value.trim().slice(0, 40) };
  }

  // ---------- המאגר: פרקים ומשניות ----------
  var PARTN = { torah: 'תורה', neviim: 'נביאים', ketuvim: 'כתובים', zeraim: 'סדר זרעים', moed: 'סדר מועד', nashim: 'סדר נשים', nezikin: 'סדר נזיקין', kodashim: 'סדר קדשים', tahorot: 'סדר טהרות' };
  // scope: "mishnah:all" | "mishnah:moed" | "mishnah:b39" | "tanakh:b26" ...
  function items(scope, unit) {
    var p = scope.split(':'), w = p[0], s = p[1], out = [];
    B[w].forEach(function (b, bi) {
      if (s !== 'all' && s !== 'b' + bi && s !== b[2]) return;
      for (var c = 1; c <= b[1]; c++) {
        if (w === 'mishnah' && unit === 'm') { for (var m = 1; m <= b[3][c - 1]; m++) out.push({ w: w, b: bi, c: c, m: m }); }
        else out.push({ w: w, b: bi, c: c });
      }
    });
    return out;
  }
  function scopeName(scope) {
    var p = scope.split(':'), w = p[0], s = p[1];
    if (s === 'all') return w === 'mishnah' ? 'ששה סדרי משנה' : 'כל התנ״ך';
    if (s[0] === 'b') { var b = B[w][+s.slice(1)]; return (w === 'mishnah' ? 'מסכת ' : '') + b[0]; }
    return w === 'mishnah' ? 'משנה, ' + PARTN[s] : PARTN[s];
  }
  function itLabel(x) { return B[x.w][x.b][0] + ' ' + gem(x.c) + (x.m ? ', ' + gem(x.m) : ''); }
  function sefRef(x) { return EN[x.w][x.b] + '.' + x.c + (x.m ? '.' + x.m : ''); }
  function sefUrl(x) { return 'https://www.sefaria.org/' + encodeURIComponent(sefRef(x).replace(/ /g, '_')) + '?lang=he'; }
  // תווית לטווח רציף של פריטים
  function rangeLabel(arr) {
    if (!arr.length) return '';
    var a = arr[0], z = arr[arr.length - 1], bn = function (x) { return B[x.w][x.b][0]; };
    if (arr.length === 1) return itLabel(a);
    var whole = function (x0, x1) { return x0.c === 1 && (!x0.m || x0.m === 1) && x1.c === B[x1.w][x1.b][1] && (!x1.m || x1.m === B[x1.w][x1.b][3][x1.c - 1]); };
    if (a.b === z.b) {
      if (whole(a, z)) return (a.w === 'mishnah' ? 'מסכת ' : '') + bn(a) + ' כולה';
      if (!a.m) return bn(a) + ' פרקים ' + gem(a.c) + '–' + gem(z.c);
      if (a.c === z.c) return bn(a) + ' ' + gem(a.c) + ', ' + gem(a.m) + '–' + gem(z.m);
      return bn(a) + ' ' + gem(a.c) + ',' + gem(a.m) + ' עד ' + gem(z.c) + ',' + gem(z.m);
    }
    var first = (a.c === 1 && (!a.m || a.m === 1)) ? bn(a) : itLabel(a);
    var lastWhole = z.c === B[z.w][z.b][1] && (!z.m || z.m === B[z.w][z.b][3][z.c - 1]);
    return 'מ' + first + ' עד ' + (lastWhole ? 'סוף ' + bn(z) : itLabel(z));
  }
  // חלוקה רציפה למנות כמעט שוות
  function split(arr, n) {
    var out = [], i = 0;
    for (var k = 0; k < n; k++) { var e = Math.round((k + 1) * arr.length / n); out.push(arr.slice(i, e)); i = e; }
    return out;
  }
  // חלוקה בלי לחתוך ספר או מסכת באמצע
  function splitWhole(arr, n) {
    var groups = [];
    arr.forEach(function (x) { var g = groups[groups.length - 1]; if (!g || g[0].b !== x.b) groups.push([x]); else g.push(x); });
    if (n >= groups.length) return groups;
    var out = [], left = arr.length, cur = [];
    groups.forEach(function (g, gi) {
      var slotsLeft = n - out.length, target = left / slotsLeft;
      var groupsLeft = groups.length - gi;
      if (cur.length && (cur.length + g.length / 2 > target || groupsLeft <= slotsLeft - 1) && out.length < n - 1) { out.push(cur); left -= cur.length; cur = []; }
      cur = cur.concat(g);
    });
    if (cur.length) out.push(cur);
    return out;
  }

  // ---------- טקסט מספריא בתוך הדף ----------
  function loadText(x, el) {
    el.innerHTML = '<p class="note">טוען מספריא...</p>';
    fetch('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(sefRef(x)) + '?version=hebrew').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var t = d && d.versions && d.versions[0] && d.versions[0].text;
      if (!t) throw 0;
      var arr = Array.isArray(t) ? t : [t];
      el.innerHTML = '<div class="txt-body">' + arr.map(function (p, i) { return '<p>' + (arr.length > 1 ? '<span class="vn">' + gem(i + 1) + '</span> ' : '') + String(p).replace(/<(?!\/?(b|i|small|br)\b)[^>]*>/g, '') + '</p>'; }).join('') + '<p class="note">הטקסט מספריא (sefaria.org), ברישיון פתוח.</p></div>';
    }).catch(function () { el.innerHTML = '<p class="note">לא הצלחתי לטעון עכשיו. <a class="gold" href="' + sefUrl(x) + '" target="_blank" rel="noopener">לפתוח בספריא</a></p>'; });
  }
  function textToggle(root) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-txt]'); if (!b) return;
      var box = b.parentNode.querySelector('.il-txt');
      if (!box) { box = document.createElement('div'); box.className = 'il-txt'; b.parentNode.appendChild(box); }
      if (box.dataset.open) { box.hidden = !box.hidden; return; }
      box.dataset.open = 1; var p = b.dataset.txt.split('.'); loadText({ w: p[0], b: +p[1], c: +p[2], m: p[3] ? +p[3] : 0 }, box);
    });
  }
  function itKey(x) { return x.w + '.' + x.b + '.' + x.c + (x.m ? '.' + x.m : ''); }

  // ---------- משניות לפי אותיות השם ----------
  var FINAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  function letters(s) { return String(s || '').replace(/[^א-ת]/g, '').split('').map(function (c) { return FINAL[c] || c; }); }
  var MALL = null;
  function allMishnayot() { if (!MALL) MALL = items('mishnah:all', 'm'); return MALL; }
  // לכל אות: משנה שמתחילה בה. אות שחוזרת מקבלת משנה אחרת. seed משנה את הבחירה ("להחליף").
  function pickForLetters(ls, seed) {
    var all = allMishnayot(), usedIdx = {}, out = [];
    ls.forEach(function (L, i) {
      var cand = [];
      for (var j = 0; j < FIRST.length; j++) if (FIRST[j] === L && !usedIdx[j]) cand.push(j);
      if (!cand.length) { out.push({ L: L, x: null }); return; }
      var k = cand[(seed * 7 + i * 13 + L.charCodeAt(0)) % cand.length];
      usedIdx[k] = 1; out.push({ L: L, x: all[k] });
    });
    return out;
  }

  // =========================================================
  //  לימוד לעילוי נשמה ולזכות
  // =========================================================
  function ilui() {
    var KEY = 'limudim-ilui', st = load(KEY, { done: {} });
    var cfg = null, AVOT = B.mishnah.map(function (b) { return b[0]; }).indexOf('אבות');
    function partOpts(w) {
      var o = w === 'mishnah'
        ? [['mishnah:b' + AVOT, 'פרקי אבות (6 פרקים)'], ['mishnah:all', 'כל ששה סדרי משנה (525 פרקים)'], ['mishnah:zeraim', 'סדר זרעים'], ['mishnah:moed', 'סדר מועד'], ['mishnah:nashim', 'סדר נשים'], ['mishnah:nezikin', 'סדר נזיקין'], ['mishnah:kodashim', 'סדר קדשים'], ['mishnah:tahorot', 'סדר טהרות']]
        : [['tanakh:b26', 'תהילים (150 פרקים)'], ['tanakh:torah', 'תורה (187 פרקים)'], ['tanakh:all', 'כל התנ״ך (929 פרקים)'], ['tanakh:b27', 'משלי (31 פרקים)']];
      var html = o.map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('');
      html += '<optgroup label="' + (w === 'mishnah' ? 'מסכת אחת' : 'ספר אחד') + '">' + B[w].map(function (b, i) { return '<option value="' + w + ':b' + i + '">' + b[0] + ' (' + b[1] + ' פרקים)</option>'; }).join('') + '</optgroup>';
      return html;
    }
    function syncForm() {
      var mode = document.querySelector('input[name="il-mode"]:checked').value;
      $('il-plan-f').hidden = mode !== 'plan';
      var w = $('il-what').value;
      if ($('il-part').dataset.w !== w) { $('il-part').innerHTML = partOpts(w); $('il-part').dataset.w = w; }
      $('il-unit-w').hidden = w !== 'mishnah';
      $('il-until-w').hidden = $('il-len').value !== 'date';
    }
    $('il-form').addEventListener('change', syncForm);
    syncForm();
    if (!$('il-start').value) $('il-start').value = today();

    function daysFor(len, start, until) {
      var s = parse(start);
      if (len === 'date') return Math.max(1, daysBetween(start, until) + 1);
      if (len === 'm11') return daysBetween(start, ymd(new Date(s.getFullYear(), s.getMonth() + 11, s.getDate())));
      if (len === 'y1') return daysBetween(start, ymd(new Date(s.getFullYear() + 1, s.getMonth(), s.getDate())));
      return +len;
    }
    $('il-new').addEventListener('submit', function (e) {
      e.preventDefault();
      var d = readDed('il');
      if (!d.n) { $('il-st').textContent = 'צריך לכתוב שם.'; $('il-n').focus(); return; }
      var mode = document.querySelector('input[name="il-mode"]:checked').value;
      var c = { v: 1, d: d, mode: mode, x: $('il-x').value.trim().slice(0, 140), by: $('il-by').value.trim().slice(0, 40) };
      if (mode === 'plan') {
        var len = $('il-len').value, start = $('il-start').value || today();
        if (len === 'date' && (!$('il-until').value || $('il-until').value < start)) { $('il-st').textContent = 'צריך לבחור תאריך סיום אחרי תאריך ההתחלה.'; return; }
        c.sc = $('il-part').value; c.u = $('il-what').value === 'mishnah' ? $('il-unit').value : 'c';
        c.s = start; c.n = Math.min(daysFor(len, start, $('il-until').value), items(c.sc, c.u).length); c.len = len;
      } else c.seed = 0;
      $('il-st').textContent = '';
      show(c, true);
      used('ilui', { mode: mode, purpose: d.k, scope: c.sc || 'otiyot' });
    });

    function link(c) { return location.origin + '/limudim/ilui/#p=' + enc(c); }
    function show(c, fresh) {
      cfg = c;
      history.replaceState(null, '', '#p=' + enc(c));
      $('il-new').hidden = true; $('il-out').hidden = false;
      render();
      if (fresh) $('il-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function render() {
      var c = cfg, id = hashOf(c), done = st.done[id] || {}, line = dedLine(c.d);
      var head = '<div class="ded-card" id="il-card"><span class="bsd">בס״ד</span>' +
        '<p class="ded-kind">' + (c.mode === 'otiyot' ? 'משניות לפי אותיות השם' : 'לימוד ' + esc(scopeName(c.sc))) + '</p>' +
        '<p class="ded-name">' + esc(line) + '</p>' +
        (c.mode === 'plan' ? '<p class="ded-sub">' + esc(lenText(c)) + '</p>' : '') +
        (c.x ? '<p class="ded-x">' + esc(c.x) + '</p>' : '') +
        (c.d.k === 'niftar' ? '<p class="ded-tnzbh">תנצב״ה</p>' : '') +
        (c.by ? '<p class="ded-by">' + esc(c.by) + '</p>' : '') + '</div>';
      var body = '', total = 0, got = 0;
      if (c.mode === 'otiyot') {
        var nameL = letters(c.d.n), parL = letters(c.d.par), list = pickForLetters(nameL, c.seed || 0);
        var nsh = c.d.k === 'niftar' ? pickForLetters(letters('נשמה'), (c.seed || 0) + 3) : [];
        var row = function (r) {
          if (!r.x) return '<li><span class="ot">' + r.L + '</span><span class="note">אין משנה שמתחילה באות הזאת.</span></li>';
          var k = itKey(r.x); total++; if (done[k]) got++;
          return '<li class="' + (done[k] ? 'done' : '') + '"><span class="ot">' + r.L + '</span><div><label class="chk"><input type="checkbox" data-k="' + k + '"' + (done[k] ? ' checked' : '') + '> <b>' + esc(itLabel(r.x)) + '</b></label>' +
            '<div class="btns"><button class="btn btn-line btn-sm" type="button" data-txt="' + k + '">📜 המשנה כאן</button><a class="linkish" href="' + sefUrl(r.x) + '" target="_blank" rel="noopener">בספריא</a></div></div></li>';
        };
        body = '<div class="panel"><h3>אותיות השם: ' + esc(c.d.n) + '</h3><ol class="ot-list">' + list.map(row).join('') + '</ol>' +
          (nsh.length ? '<h3>ואחריהן אותיות "נשמה"</h3><ol class="ot-list">' + nsh.map(row).join('') + '</ol>' : '') +
          '<p class="note">לכל אות משנה שמתחילה בה, לפי הטקסט בספריא. אות שחוזרת בשם מקבלת משנה אחרת.</p>' +
          '<div class="btns no-print"><button class="linkish" type="button" id="il-reseed">לבחור משניות אחרות לאותן אותיות</button></div></div>';
        if (c.d.par) body += '<p class="note no-print" style="margin-top:.6rem">יש שנוהגים ללמוד גם את אותיות שם ההורה. אפשר לפתוח רשימה נפרדת עם השם "' + esc(c.d.par) + '".</p>';
      } else {
        var its = items(c.sc, c.u), parts = split(its, c.n), t = today();
        var rows = parts.map(function (p, i) {
          if (!p.length) return '';
          var date = ymd(addDays(parse(c.s), i)), k = 'd' + i; total++; if (done[k]) got++;
          var cls = (date === t ? 'today ' : '') + (done[k] ? 'done' : '');
          return '<tr class="' + cls + '"><td class="x"><input type="checkbox" data-k="' + k + '"' + (done[k] ? ' checked' : '') + ' aria-label="למדתי"></td><td class="d">' + dayLabel(date) + '</td><td>' + esc(rangeLabel(p)) +
            ' <span class="no-print"><button class="linkish" type="button" data-txt="' + itKey(p[0]) + '">הטקסט</button></span></td></tr>';
        }).join('');
        var ti = daysBetween(c.s, t), tp = parts[ti];
        body = (tp && tp.length ? '<div class="today-box no-print" style="margin-top:1rem"><b>היום:</b> ' + esc(rangeLabel(tp)) + ' <a class="linkish" href="' + sefUrl(tp[0]) + '" target="_blank" rel="noopener">בספריא</a></div>' : ti < 0 ? '<div class="today-box no-print" style="margin-top:1rem">מתחילים ב-' + dayLabel(c.s) + '.</div>' : '') +
          '<div class="panel"><h3>התוכנית, יום אחרי יום</h3><table class="plan">' + rows + '</table>' +
          '<p class="note">פספסתם יום? לא נורא. ממשיכים מהשורה של היום, ואת מה שנשאר משלימים כשנוח. הלימוד נחשב בכל מקרה.</p></div>';
      }
      var pct = total ? Math.round(got * 100 / total) : 0;
      $('il-view').innerHTML = head + '<div class="no-print" style="margin-top:.8rem"><div class="bar"><i style="width:' + pct + '%"></i></div><p class="note" style="text-align:center">' + (got === total && total ? 'סיימתם! יהי רצון שיעלה הלימוד לפני כיסא הכבוד.' : 'למדתם ' + got + ' מתוך ' + total) + '</p></div>' + body;
      var wa = 'לימוד ' + (c.mode === 'otiyot' ? 'משניות לפי אותיות השם' : scopeName(c.sc)) + ' ' + line + '.\nמי שרוצה להצטרף, הכול בקישור, עם הטקסט:\n' + link(c);
      $('il-wa').href = 'https://wa.me/?text=' + encodeURIComponent(wa);
      $('il-more').innerHTML = c.d.k === 'niftar'
        ? '<a href="/kodesh/tehillim/shem/">📖 תהילים לפי אותיות השם (פרק קיט)</a><a href="/kodesh/tehillim/">👥 סיום תהילים בקישור, כל אחד לוקח פרקים</a><a href="/limudim/kvutza/">📚 חלוקת משניות בין המשפחה והחברים</a><a href="/kodesh/azkara/">🕯 מודעת אזכרה ושלושים</a>'
        : '<a href="/kodesh/tehillim/shem/">📖 תהילים לפי אותיות השם</a><a href="/kodesh/tehillim/">👥 סיום תהילים בקישור</a><a href="/limudim/kvutza/">📚 לימוד משותף בקבוצה</a>';
    }
    function lenText(c) {
      var L = { 7: 'בשבעה ימים', 30: 'בשלושים יום', m11: 'באחד עשר חודשים', y1: 'בשנה' }[c.len];
      return (L || 'ב-' + c.n + ' ימים') + ', מ-' + dayLabel(c.s);
    }
    $('il-view').addEventListener('change', function (e) {
      var k = e.target.dataset.k; if (!k) return;
      var id = hashOf(cfg); st.done[id] = st.done[id] || {};
      if (e.target.checked) st.done[id][k] = 1; else delete st.done[id][k];
      save(KEY, st); render(); if (e.target.checked) used('ilui', { action: 'done' });
    });
    $('il-view').addEventListener('click', function (e) {
      if (e.target.id === 'il-reseed') { cfg.seed = (cfg.seed || 0) + 1; show(cfg); }
    });
    textToggle($('il-view'));
    $('il-copy').addEventListener('click', function () {
      var u = link(cfg);
      (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { $('il-copy-st').textContent = 'הקישור הועתק.'; }, function () { prompt('להעתיק את הקישור:', u); });
    });
    $('il-print').addEventListener('click', function () { used('ilui', { action: 'print' }); window.print(); });
    $('il-again').addEventListener('click', function () { history.replaceState(null, '', location.pathname); $('il-out').hidden = true; $('il-new').hidden = false; $('il-new').scrollIntoView({ behavior: 'smooth' }); });
    var m = location.hash.match(/^#p=(.+)$/);
    if (m) { var c = dec(m[1]); if (c && c.d && c.mode) { show(c); used('ilui', { action: 'open_link' }); } }
  }

  // =========================================================
  //  לימוד משותף בקבוצה
  // =========================================================
  function kvutza() {
    var KEY = 'limudim-kvutza', st = load(KEY, { done: {}, me: {} });
    var cfg = null, admin = false;
    function syncForm() {
      var w = $('kv-what').value;
      $('kv-other').hidden = w !== 'other';
      $('kv-part-w').hidden = w === 'other';
      if (w !== 'other' && $('kv-part').dataset.w !== w) {
        $('kv-part').dataset.w = w;
        var o = w === 'mishnah'
          ? [['mishnah:all', 'כל ששה סדרי משנה – 63 מסכתות'], ['mishnah:zeraim', 'סדר זרעים'], ['mishnah:moed', 'סדר מועד'], ['mishnah:nashim', 'סדר נשים'], ['mishnah:nezikin', 'סדר נזיקין'], ['mishnah:kodashim', 'סדר קדשים'], ['mishnah:tahorot', 'סדר טהרות']]
          : [['tanakh:all', 'כל התנ״ך – 39 ספרים'], ['tanakh:torah', 'תורה'], ['tanakh:neviim', 'נביאים'], ['tanakh:ketuvim', 'כתובים']];
        $('kv-part').innerHTML = o.map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('') +
          '<optgroup label="' + (w === 'mishnah' ? 'מסכת אחת' : 'ספר אחד') + '">' + B[w].map(function (b, i) { return '<option value="' + w + ':b' + i + '">' + b[0] + ' (' + b[1] + ' פרקים)</option>'; }).join('') + '</optgroup>';
      }
      $('kv-names-w').hidden = $('kv-how').value !== 'names';
      $('kv-count-w').hidden = $('kv-how').value !== 'count';
    }
    $('kv-form').addEventListener('change', syncForm);
    syncForm();
    $('kv-new').addEventListener('submit', function (e) {
      e.preventDefault();
      var w = $('kv-what').value, c = { v: 1, d: readDed('kv'), t: $('kv-title').value.trim().slice(0, 60), g: $('kv-goal').value || '', by: $('kv-by').value.trim().slice(0, 40) };
      if (w === 'other') {
        c.o = { n: $('kv-oname').value.trim().slice(0, 50), c: Math.min(5000, +$('kv-ocount').value || 0), u: $('kv-ounit').value };
        if (!c.o.n || c.o.c < 1) { $('kv-st').textContent = 'צריך שם ספר וכמה פרקים יש בו.'; return; }
      } else { c.sc = $('kv-part').value; c.wh = $('kv-whole').checked ? 1 : 0; }
      var names = $('kv-names').value.split(/\r?\n|,/).map(function (s) { return s.trim().slice(0, 30); }).filter(Boolean);
      var n = $('kv-how').value === 'names' ? names.length : Math.max(1, Math.min(300, +$('kv-count').value || 0));
      if (!n) { $('kv-st').textContent = 'צריך לפחות שם אחד, או לבחור מספר חלקים.'; return; }
      c.n = n; c.who = $('kv-how').value === 'names' ? names : [];
      var parts = portions(c);
      c.n = parts.length; c.who = c.who.slice(0, c.n);
      $('kv-st').textContent = '';
      admin = true; save(KEY + '-admin-' + hashOf(baseOf(c)), 1);
      show(c, true);
      used('kvutza', { scope: c.sc || 'other', parts: c.n });
    });
    function baseOf(c) { return { d: c.d, t: c.t, sc: c.sc, o: c.o, n: c.n, g: c.g }; }
    function portions(c) {
      if (c.o) {
        var arr = []; for (var i = 1; i <= c.o.c; i++) arr.push(i);
        return split(arr, Math.min(c.n, arr.length)).map(function (p) { return { label: c.o.n + ' ' + (p.length === 1 ? p[0] : p[0] + '–' + p[p.length - 1]), first: null, size: p.length }; });
      }
      var its = items(c.sc, 'c'), ps = c.wh ? splitWhole(its, c.n) : split(its, Math.min(c.n, its.length));
      return ps.filter(function (p) { return p.length; }).map(function (p) { return { label: rangeLabel(p), first: p[0], last: p[p.length - 1], size: p.length }; });
    }
    function title(c) { return c.t || (c.o ? c.o.n : scopeName(c.sc)); }
    function link(c) { return location.origin + '/limudim/kvutza/#g=' + enc(c); }
    function show(c, fresh) {
      cfg = c; history.replaceState(null, '', '#g=' + enc(c));
      admin = admin || !!load(KEY + '-admin-' + hashOf(baseOf(c)), 0);
      $('kv-new').hidden = true; $('kv-out').hidden = false; render();
      if (fresh) $('kv-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function render() {
      var c = cfg, id = hashOf(baseOf(c)), done = st.done[id] || {}, parts = portions(c), line = dedLine(c.d);
      var got = parts.filter(function (p, i) { return done[i]; }).length, me = st.me[id];
      var head = '<div class="ded-card"><span class="bsd">בס״ד</span><p class="ded-kind">לימוד משותף</p><p class="ded-name">' + esc(title(c)) + '</p>' +
        (line ? '<p class="ded-sub">' + esc(line) + '</p>' : '') +
        (c.g ? '<p class="ded-x">מסיימים יחד עד ' + esc(dayLabel(c.g)) + '</p>' : '') + (c.by ? '<p class="ded-by">' + esc(c.by) + '</p>' : '') + '</div>';
      var mine = '';
      if (me != null && parts[me]) {
        var p = parts[me];
        mine = '<div class="today-box no-print" style="margin-top:1rem"><b>החלק שלי: ' + esc(p.label) + '</b>' +
          (p.first ? '<div class="btns" style="margin-top:.5rem"><button class="btn btn-line btn-sm" type="button" data-txt="' + itKey(p.first) + '">📜 להתחיל כאן</button><a class="btn btn-line btn-sm" href="' + sefUrl(p.first) + '" target="_blank" rel="noopener">בספריא</a></div>' : '') +
          '<div class="btns" style="margin-top:.5rem"><a class="btn btn-gold btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('סיימתי את החלק שלי בלימוד "' + title(c) + '": ' + p.label + ' ✓') + '">✓ סיימתי, לבשר בווטסאפ</a><button class="linkish" type="button" id="kv-notme">זה לא החלק שלי</button></div></div>';
      }
      var rows = parts.map(function (p, i) {
        var who = c.who[i] || '';
        return '<tr class="' + (done[i] ? 'done' : '') + (me === i ? ' today' : '') + '"><td class="x"><input type="checkbox" data-i="' + i + '"' + (done[i] ? ' checked' : '') + ' aria-label="סיים"></td>' +
          '<td>' + esc(p.label) + ' <small class="muted">(' + p.size + ')</small>' + (p.first ? ' <span class="no-print"><button class="linkish" type="button" data-txt="' + itKey(p.first) + '">טקסט</button></span>' : '') + '</td>' +
          '<td class="who">' + (admin ? '<input class="who-in no-print" data-w="' + i + '" value="' + esc(who) + '" placeholder="פנוי" maxlength="30"><span class="print-only">' + esc(who) + '</span>' : esc(who) || '<span class="muted">פנוי</span>') + '</td>' +
          '<td class="no-print">' + (me === i ? '' : '<button class="linkish" type="button" data-me="' + i + '">שלי</button>') + '</td></tr>';
      }).join('');
      $('kv-view').innerHTML = head +
        '<div class="no-print" style="margin-top:.8rem"><div class="bar"><i style="width:' + Math.round(got * 100 / parts.length) + '%"></i></div><p class="note" style="text-align:center">' + (got === parts.length ? 'כל החלקים נלמדו! זמן לסיום יחד.' : got + ' מתוך ' + parts.length + ' חלקים סומנו כסיימו') + '</p></div>' + mine +
        '<div class="panel"><h3>' + parts.length + ' חלקים</h3><table class="plan kv-table">' + rows + '</table>' +
        '<p class="note no-print">' + (admin ? 'אתם המארגנים: כותבים שם ליד כל חלק, ואז "לשלוח לקבוצה". הקישור החדש כולל את השמות.' : 'לוחצים "שלי" ליד החלק שלכם, ומבשרים למארגן בווטסאפ.') + ' הסימון ✓ נשמר רק בטלפון הזה.</p></div>';
      $('kv-wa').href = 'https://wa.me/?text=' + encodeURIComponent(waText(c, parts));
      $('kv-admin-tip').hidden = !admin;
    }
    function waText(c, parts) {
      var line = dedLine(c.d), s = '📚 לימוד משותף: ' + title(c) + (line ? '\n' + line : '') + (c.g ? '\nמסיימים יחד עד ' + dayLabel(c.g) : '') + '\n\n';
      s += parts.map(function (p, i) { return (i + 1) + '. ' + p.label + ' – ' + (c.who[i] || 'פנוי'); }).join('\n');
      return s + '\n\nלקחת חלק? לוחצים "שלי" בקישור, ושם גם הטקסט:\n' + link(c);
    }
    $('kv-view').addEventListener('change', function (e) {
      var id = hashOf(baseOf(cfg));
      if (e.target.dataset.i != null) {
        st.done[id] = st.done[id] || {}; var i = +e.target.dataset.i;
        if (e.target.checked) st.done[id][i] = 1; else delete st.done[id][i];
        save(KEY, st); render(); if (e.target.checked) used('kvutza', { action: 'done' });
      } else if (e.target.dataset.w != null) {
        cfg.who[+e.target.dataset.w] = e.target.value.trim().slice(0, 30);
        while (cfg.who.length && !cfg.who[cfg.who.length - 1]) cfg.who.pop();
        for (var k = 0; k < cfg.who.length; k++) if (cfg.who[k] == null) cfg.who[k] = '';
        history.replaceState(null, '', '#g=' + enc(cfg)); $('kv-wa').href = 'https://wa.me/?text=' + encodeURIComponent(waText(cfg, portions(cfg)));
      }
    });
    $('kv-view').addEventListener('click', function (e) {
      var id = hashOf(baseOf(cfg));
      var m = e.target.closest('[data-me]'); if (m) { st.me[id] = +m.dataset.me; save(KEY, st); render(); window.scrollTo({ top: $('kv-out').offsetTop, behavior: 'smooth' }); used('kvutza', { action: 'mine' }); return; }
      if (e.target.id === 'kv-notme') { delete st.me[id]; save(KEY, st); render(); }
    });
    textToggle($('kv-view'));
    $('kv-copy').addEventListener('click', function () {
      var u = link(cfg);
      (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { $('kv-copy-st').textContent = 'הקישור הועתק.'; }, function () { prompt('להעתיק את הקישור:', u); });
    });
    $('kv-print').addEventListener('click', function () { used('kvutza', { action: 'print' }); window.print(); });
    $('kv-again').addEventListener('click', function () { history.replaceState(null, '', location.pathname); admin = false; $('kv-out').hidden = true; $('kv-new').hidden = false; });
    var g = location.hash.match(/^#g=(.+)$/);
    if (g) { var c = dec(g[1]); if (c && (c.sc || c.o) && c.n) { c.who = c.who || []; show(c); used('kvutza', { action: 'open_link' }); } }
  }

  if ($('il-form')) ilui();
  if ($('kv-form')) kvutza();
})();
