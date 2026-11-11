// מחשבון גימטריה (/kodesh/gimatria/) – מקלידים מילה, שם או משפט, ומקבלים את הגימטריה תוך כדי הקלדה.
// שלוש שיטות: מספר הכרחי (רגיל, סופיות כרגילות), סופיות גדולות (ך=500 … ץ=900), ומספר קטן (בלי האפסים: י=1, ק=1).
// ניקוד, טעמים, גרש, גרשיים ומרכאות נמחקים לפני החישוב; כל תו שאינו אות עברית מפריד בין מילים.
// הכול בטלפון, בלי שרת. נשמר רק ב-localStorage במפתח kodesh-gimatria (הכפתור data-wipe מוחק אותו).
// innerHTML נבנה רק מאותיות עבריות ומספרים שעברו סינון, אף פעם לא מטקסט גולמי של המשתמש.
// מדידה: window.toolUsed(tool, {action}) מ-kelim.js – type / method / num / pick / copy / wa / reset, פעם אחת לכל פעולה בביקור.
(function () {
  'use strict';
  var root = document.getElementById('gimatria');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'kodesh-gimatria';
  var TOOL = document.body.getAttribute('data-tool') || 'gimatria';
  var LINK = 'https://hakelim.com/kodesh/gimatria/';
  var DEF = { t: 'שלום עליכם', m: 'reg', n: '' };
  var MAX_ROWS = 30;

  var LET = 'אבגדהוזחטיכלמנסעפצקרשת';
  var VAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400];
  var FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  var BIG = { 'ך': 500, 'ם': 600, 'ן': 700, 'ף': 800, 'ץ': 900 };
  var NAMES = { reg: 'מספר הכרחי', big: 'סופיות גדולות', small: 'מספר קטן' };

  // ערך של אות בשיטה: reg / big / small
  function val(ch, m) {
    if (m === 'big' && BIG[ch]) return BIG[ch];
    var base = FIN[ch] || ch, i = LET.indexOf(base);
    if (i < 0) return 0;
    var v = VAL[i];
    if (m === 'small') { while (v >= 10) v = v / 10; }
    return v;
  }

  // טקסט ← רשימת מילים בעברית נקייה + כמה תווים לועזיים או ספרות דילגנו
  function parse(raw) {
    var s = String(raw || '').normalize('NFKD')
      .replace(/װ/g, 'וו').replace(/ױ/g, 'וי').replace(/ײ/g, 'יי') // ליגטורות יידיש
      .replace(/[֑-ׇֽֿׁׂׅׄ̀-ͯ‎‏‪-‮]/g, '') // ניקוד, טעמים, סימני כיוון
      .replace(/[׳״'"`׳״‘’“”]/g, ''); // גרש, גרשיים ומרכאות: ת"ו = תו
    var skipped = (s.match(/[^\sא-ת\p{P}\p{S}]/gu) || []).filter(function (c) { return /[\p{L}\p{N}]/u.test(c); });
    var words = s.split(/[^א-ת]+/).filter(Boolean);
    return { words: words, skipped: skipped };
  }
  function wordVal(w, m) { var t = 0; for (var i = 0; i < w.length; i++) t += val(w[i], m); return t; }

  // מספר ← כתיב עברי: 376 = שע״ו, 15 = ט״ו, 5787 = ה׳תשפ״ז
  function hebNum(n) {
    if (!(n > 0) || n >= 1000000) return '';
    var th = Math.floor(n / 1000), r = n % 1000, out = '';
    if (th) out = hebNum(th).replace(/[׳״]/g, '') + '׳';
    if (!r) return out;
    var s = '';
    while (r >= 400) { s += 'ת'; r -= 400; }
    if (r >= 100) { s += 'קרש'[Math.floor(r / 100) - 1]; r %= 100; }
    if (r === 15) s += 'טו';
    else if (r === 16) s += 'טז';
    else {
      if (r >= 10) { s += 'יכלמנסעפצ'[Math.floor(r / 10) - 1]; r %= 10; }
      if (r) s += 'אבגדהוזחט'[r - 1];
    }
    s = s.length > 1 ? s.slice(0, -1) + '״' + s.slice(-1) : s + '׳';
    return out + s;
  }

  // רשימה מקומית של מילים ושמות מוכרים. הערכים מחושבים כאן בקוד, ולכן תמיד מדויקים.
  // מילה בודדת מופרדת ברווח; ביטוי של כמה מילים כתוב עם קו תחתון ומוצג עם רווח.
  var BANK = ('אחד אהבה חי חיים יין סוד שלום אמת חסד צדקה תורה מצוה שבת ישראל משיח נחש גאולה אמונה ברכה שמחה טוב לב מזל ' +
    'בית אור ציון ירושלים תפילה תשובה ברית מילה נשמה נפש רוח שמים ארץ אדם מים אש עולם שנה יום לילה שמש ירח ' +
    'כוכב עץ פרי לחם מלך כהן לוי נביא חכם חכמה בינה דעת ענוה יראה שמע אמן הללויה קדוש קדושה טהרה שכינה ' +
    'מלאך כבוד נס פלא מנורה חנוכה פורים פסח שבועות סוכות סוכה לולב אתרוג שופר מזוזה תפילין ציצית טלית ' +
    'כיפה ספר תהילים משנה גמרא הלכה פרשה פסוק אות שם בן בת אב אם אח אחות סבא סבתא משפחה חתן כלה חופה ' +
    'נישואין זיווג בשורה הצלחה פרנסה בריאות רפואה תודה חן שירה רינה גילה עם ' +
    'אברהם יצחק יעקב שרה רבקה רחל לאה יוסף משה אהרן מרים דוד שלמה אליהו יהושע שמואל דניאל ' +
    'נח אליעזר בנימין יהודה ראובן שמעון יששכר זבולון דן נפתלי גד אשר מנחם נחמן מאיר ' +
    'יונתן נתן אריה צבי מרדכי אסתר רות נעמי חנה נעמה דבורה יהודית תמר מיכל אביגיל אורי איתי אלון עדי ' +
    'טבע נצח הוד יסוד מלכות כתר גבורה תפארת ' +
    'גן_עדן פדיון_הבן רפואה_שלמה אהבת_ישראל עם_ישראל ארץ_ישראל שבת_שלום חג_שמח מזל_טוב בית_המקדש ספר_תורה בר_מצוה בת_מצוה').split(' ');
  var seen = {};
  BANK = BANK.filter(function (w) { if (!w || seen[w]) return false; seen[w] = 1; return true; })
    .map(function (w) { return w.replace(/_/g, ' '); });
  function bankVal(w, m) { return w.split(' ').reduce(function (t, x) { return t + wordVal(x, m); }, 0); }

  // ---------- התנ"ך: כל המילים והרצפים שיש להם אותו ערך ----------
  // assets/kodesh-tanach.txt: כל התנ"ך בלי ניקוד (ספריא, Tanach with Text Only, נחלת הכלל), נטען ברקע אחרי שהדף עולה.
  // '#ספר', '@' לפרק חדש, ושורה לכל פסוק. רצף = מילים צמודות באותו פרק (גם מעבר לסוף פסוק), 2 עד MAXW מילים.
  // שמות הקודש (יהוה, אלהים וכו') לא מוצגים: מילה כזו לא נכנסת לרשימה, ורצף לא עובר דרכה.
  var TANACH_URL = '/assets/kodesh-tanach.txt?v=1';
  var MAXW = 120, PAGE = 100, CAP = 8000;
  var BAN_RE = /יהוה|אלהי|אלוה/, BAN_X = { 'יה': 1, 'אדני': 1, 'שדי': 1, 'אל': 1 };
  var T = null, tState = 'idle'; // idle / loading / ready / fail
  function loadTanach() {
    if (tState !== 'idle') return;
    tState = 'loading';
    fetch(TANACH_URL).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.text(); }).then(function (txt) {
      var tok = [], tv = [], books = [], vb = [], vc = [], vn = [], chap = [], book = -1, ch = 0, vs = 0;
      var lines = txt.split('\n');
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i];
        if (!l) continue;
        if (l.charAt(0) === '#') { books.push(l.slice(1)); book++; ch = 0; continue; }
        if (l === '@') { ch++; vs = 0; chap.push(tok.length); continue; }
        vs++; var vi = vb.length; vb.push(book); vc.push(ch); vn.push(vs);
        var ws = l.split(' ');
        for (var k = 0; k < ws.length; k++) { tok.push(ws[k]); tv.push(vi); }
      }
      chap.push(tok.length);
      var ban = new Uint8Array(tok.length), freq = new Map();
      for (var j = 0; j < tok.length; j++) {
        var w = tok[j];
        if (BAN_RE.test(w) || BAN_X[w]) { ban[j] = 1; continue; }
        freq.set(w, (freq.get(w) || 0) + 1);
      }
      var uw = Array.from(freq.keys()).sort(function (a, c) { return freq.get(c) - freq.get(a); }); // הנפוצות קודם
      T = { tok: tok, tv: tv, books: books, vb: vb, vc: vc, vn: vn, chap: chap, ban: ban, uw: uw, vals: {}, uvals: {} };
      tState = 'ready'; cache = {}; calc(); byNum();
    }).catch(function () { tState = 'fail'; calc(); byNum(); });
  }
  function tVals(m) {
    if (!T.vals[m]) {
      var a = new Int32Array(T.tok.length);
      for (var i = 0; i < a.length; i++) a[i] = T.ban[i] ? -1 : wordVal(T.tok[i], m);
      var u = new Int32Array(T.uw.length);
      for (var j = 0; j < u.length; j++) u[j] = wordVal(T.uw[j], m);
      T.vals[m] = a; T.uvals[m] = u;
    }
    return T.vals[m];
  }
  function plain(n) { return hebNum(n).replace(/[׳״]/g, ''); }
  function ref(vi) { return T.books[T.vb[vi]] + ' ' + plain(T.vc[vi]) + ', ' + plain(T.vn[vi]); }
  // כל המילים והרצפים בערך n: קודם מהרשימה המוכרת, אחר כך מילים מהתנ"ך (הנפוצות קודם), ואז רצפים (הקצרים קודם).
  // כל הערכים חיוביים, ולכן חלון זז (two pointers) מוצא בכל פרק את כל הרצפים בסכום n במעבר אחד.
  var cache = {}, cacheN = 0;
  function matches(n, m, not) {
    var key = m + ':' + n, out = cache[key];
    if (!out) {
      out = [];
      var seenT = {};
      var add = function (t, r) { if (seenT[t]) return; seenT[t] = 1; out.push({ t: t, r: r || '' }); };
      for (var i = 0; i < BANK.length; i++) if (bankVal(BANK[i], m) === n) add(BANK[i]);
      if (T) {
        var vals = tVals(m), u = T.uvals[m], ph = [];
        for (var j = 0; j < u.length; j++) if (u[j] === n) add(T.uw[j]);
        for (var c = 0; c + 1 < T.chap.length && ph.length < CAP; c++) {
          var e = T.chap[c + 1], lo = T.chap[c], s = 0;
          for (var r = lo; r < e; r++) {
            if (vals[r] < 0) { lo = r + 1; s = 0; continue; }
            s += vals[r];
            while (s > n && lo <= r) s -= vals[lo++];
            if (s === n && r > lo && r - lo < MAXW) ph.push([lo, r]);
          }
        }
        ph.sort(function (x, y) { return (x[1] - x[0]) - (y[1] - y[0]) || x[0] - y[0]; });
        for (var p = 0; p < ph.length; p++) add(T.tok.slice(ph[p][0], ph[p][1] + 1).join(' '), ref(T.tv[ph[p][0]]));
      }
      if (++cacheN > 60) { cache = {}; cacheN = 0; }
      cache[key] = out;
    }
    return not ? out.filter(function (x) { return x.t !== not; }) : out;
  }

  function load() { try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var sent = {};
  function used(a) { if (sent[a]) return; sent[a] = 1; if (window.toolUsed) window.toolUsed(TOOL, { action: a }); }
  function b(s) { return '<bdi>' + s + '</bdi>'; }
  function fmt(n) { return n.toLocaleString('en-US'); }

  var st = Object.assign({}, DEF, load() || {});
  if (!NAMES[st.m]) st.m = 'reg';
  var text = '';
  var inT = $('gm-t'), inN = $('gm-n'), segBtns = root.querySelectorAll('#gm-m button');

  function setWa() {
    $('gm-wa').href = 'https://wa.me/?text=' + encodeURIComponent((text ? text + '\n\n' : '') + 'מחשבון גימטריה בחינם, בלי הרשמה:\n' + LINK);
    $('gm-copy').disabled = !text;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function chips(list) {
    return list.map(function (x) {
      return '<button type="button" data-w="' + esc(x.t) + '">' + esc(x.t) + (x.r ? '<small>' + esc(x.r) + '</small>' : '') + '</button>';
    }).join('');
  }
  // רשימת ההתאמות: 100 בכל פעם, וכפתור "עוד 100"
  var shown = { main: PAGE, num: PAGE }, lastKey = { main: '', num: '' };
  function list(where, n, m, not) {
    var all = matches(n, m, not), key = m + ':' + n;
    if (lastKey[where] !== key) { lastKey[where] = key; shown[where] = PAGE; }
    var cnt = all.length, k = Math.min(shown[where], cnt);
    var head = cnt
      ? 'נמצאו ' + b(fmt(cnt)) + ' מילים ורצפי מילים בגימטריה ' + b(fmt(n)) + (cnt > k ? '. מוצגים ' + b(fmt(k)) + ', מהקצרים לארוכים:' : ':')
      : 'לא מצאנו מילה או רצף בגימטריה ' + b(fmt(n)) + '.';
    var note = '';
    if (tState === 'loading' || tState === 'idle') note = '<p class="gm-load">טוען עוד מילים ורצפים מכל התנ״ך…</p>';
    else if (tState === 'fail') note = '<p class="gm-load">לא הצלחנו לטעון את התנ״ך (אולי אין אינטרנט), ולכן מוצגות רק מילים מהרשימה הקצרה.</p>';
    else if (cnt < PAGE) note = '<p class="gm-load">בערך קטן כמו ' + b(fmt(n)) + ' יש בתנ״ך מעט מילים ורצפים, ולכן הרשימה קצרה.</p>';
    return '<p class="gm-sh">' + head + '</p>' + (cnt ? '<div class="gm-chips">' + chips(all.slice(0, k)) + '</div>' : '') +
      (cnt > k ? '<button type="button" class="gm-morebtn" data-more="' + where + '">להציג עוד ' + b(fmt(Math.min(PAGE, cnt - k))) + '</button>' : '') + note;
  }

  function calc() {
    var m = st.m, p = parse(st.t), words = p.words;
    Array.prototype.forEach.call(segBtns, function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === m ? 'true' : 'false'); });
    var res = root.querySelector('.gm-res');
    var sk = p.skipped.length ? 'דילגנו על ' + b(fmt(p.skipped.length)) + ' ' + (p.skipped.length === 1 ? 'תו שאינו' : 'תווים שאינם') + ' אות עברית (אותיות לועזיות או ספרות).' : '';
    $('gm-skip').innerHTML = sk;
    $('gm-skip').hidden = !sk;
    if (!words.length) {
      res.classList.add('empty');
      $('gm-b').textContent = p.skipped.length ? 'אין כאן אותיות עבריות' : 'מקלידים מילה, שם או משפט';
      $('gm-h').textContent = '';
      $('gm-words').innerHTML = ''; $('gm-same').hidden = true;
      text = ''; setWa(); return;
    }
    res.classList.remove('empty');
    var tot = { reg: 0, big: 0, small: 0 }, letters = 0;
    words.forEach(function (w) { letters += w.length; for (var k in tot) tot[k] += wordVal(w, k); });
    var n = tot[m];
    $('gm-l').textContent = 'הגימטריה (' + NAMES[m] + ')';
    $('gm-b').innerHTML = b(fmt(n));
    $('gm-h').textContent = hebNum(n);
    $('gm-reg').innerHTML = b(fmt(tot.reg));
    $('gm-big').innerHTML = b(fmt(tot.big));
    $('gm-small').innerHTML = b(fmt(tot.small));
    $('gm-cnt').innerHTML = b(fmt(words.length)) + ' ' + (words.length === 1 ? 'מילה' : 'מילים') + ' · ' + b(fmt(letters)) + ' אותיות';

    // פירוט לכל מילה ולכל אות
    var rows = words.slice(0, MAX_ROWS).map(function (w) {
      var parts = [];
      for (var i = 0; i < w.length; i++) parts.push('<span class="gm-ch"><b>' + w[i] + '</b>' + b(fmt(val(w[i], m))) + '</span>');
      return '<li><div class="gm-wt"><span class="gm-w">' + w + '</span><span class="gm-wv">' + b(fmt(wordVal(w, m))) + '</span></div><div class="gm-chs">' + parts.join('') + '</div></li>';
    });
    if (words.length > MAX_ROWS) rows.push('<li class="gm-more">ועוד ' + b(fmt(words.length - MAX_ROWS)) + ' מילים. הסכום למעלה כולל את כולן.</li>');
    $('gm-words').innerHTML = rows.join('');

    // מילים ורצפים עם אותו ערך
    $('gm-same').hidden = false;
    $('gm-same').innerHTML = list('main', n, m, words.join(' '));

    var joined = words.join(' ');
    text = joined + '\nגימטריה (' + NAMES[m] + '): ' + fmt(n) + (hebNum(n) ? ' (' + hebNum(n) + ')' : '') +
      (m !== 'reg' ? '\nמספר הכרחי: ' + fmt(tot.reg) : '') +
      (words.length > 1 && words.length <= 12 ? '\n' + words.map(function (w) { return w + ' = ' + fmt(wordVal(w, m)); }).join('\n') : '');
    setWa();
  }

  // מספר ← מילים מהרשימה
  function byNum() {
    var raw = String(inN.value || '').replace(/[,\s]/g, '');
    var box = $('gm-nr');
    if (raw === '') { box.innerHTML = ''; return; }
    var n = /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (!(n > 0)) { box.innerHTML = '<p class="gm-none">מקלידים מספר שלם, למשל 26.</p>'; return; }
    var h = hebNum(n);
    box.innerHTML = (h ? '<p class="gm-none">' + b(fmt(n)) + ' בכתיב עברי: <b class="gm-hn">' + h + '</b></p>' : '') + list('num', n, st.m);
  }

  function fill() { inT.value = st.t; inN.value = st.n || ''; }
  fill();
  inT.addEventListener('input', function () { st.t = inT.value; store(); used('type'); calc(); });
  inN.addEventListener('input', function () { st.n = inN.value; store(); used('num'); byNum(); });
  Array.prototype.forEach.call(segBtns, function (x) {
    x.addEventListener('click', function () { st.m = x.getAttribute('data-v'); store(); used('method'); calc(); byNum(); });
  });
  // "להציג עוד": עוד 100 ברשימה
  root.addEventListener('click', function (ev) {
    var mb = ev.target.closest('button[data-more]'); if (!mb) return;
    var w = mb.getAttribute('data-more'); shown[w] += PAGE; used('more');
    if (w === 'main') calc(); else byNum();
  });
  // לחיצה על מילה או רצף ← הם נכנסים לשדה
  root.addEventListener('click', function (ev) {
    var c = ev.target.closest('button[data-w]'); if (!c) return;
    st.t = c.getAttribute('data-w'); inT.value = st.t; store(); used('pick'); calc();
    inT.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('gm-copy').addEventListener('click', function () {
    if (!text) return;
    used('copy');
    if (window.kelimCopy) window.kelimCopy(text, $('gm-copy'), 'הועתק ✓');
    else if (navigator.clipboard) navigator.clipboard.writeText(text);
  });
  $('gm-wa').addEventListener('click', function () { used('wa'); });
  $('gm-clear').addEventListener('click', function () { st.t = ''; inT.value = ''; store(); calc(); inT.focus(); });
  $('gm-reset').addEventListener('click', function () { st = Object.assign({}, DEF); store(); used('reset'); fill(); calc(); byNum(); });
  root.addEventListener('click', function (e) {
    var w = e.target.closest('[data-wipe]'); if (!w) return;
    if (!confirm('למחוק מהטלפון את מה ששמרת בכלי הזה? אי אפשר להחזיר.')) return;
    try { localStorage.removeItem(KEY); } catch (er) {}
    location.reload();
  });
  // לבדיקות: window.__gm.calc('שלום', 'reg')
  window.__gm = {
    calc: function (t, m) { return parse(t).words.reduce(function (s, w) { return s + wordVal(w, m || 'reg'); }, 0); }, heb: hebNum, parse: parse,
    matches: function (n, m) { return matches(n, m || 'reg'); }, state: function () { return tState; }
  };
  calc(); byNum();
  // התנ"ך נטען ברקע, אחרי שהדף כבר מוצג
  if (window.requestIdleCallback) requestIdleCallback(loadTanach, { timeout: 1500 }); else setTimeout(loadTanach, 600);
})();
