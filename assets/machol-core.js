// מנוע משותף למחוללים (/kelim/chashiva/bingo|tashbetz|tifzoret|tzviya-misparim):
// שלוש דרכים להכניס מילים (אני כותב / לפי נושא / גם וגם), בנקי מילים (machol-banks.js), עוזר מילים בענן (kelim-machol),
// דפי A4 להדפסה, PDF בדפדפן, קישור לשיתוף ששומר את הכול בכתובת עצמה (בלי שרת), ומדידה.
(function () {
  'use strict';
  var MC = window.MC = window.MC || {};
  MC.AI_URL = 'https://kelim-machol.gilad4049.workers.dev/words';

  MC.$ = function (id) { return document.getElementById(id); };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  MC.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };

  // ---------- אקראיות עם זרע: אותו זרע = אותו לוח בכל טלפון ----------
  MC.hash = function (s) { s = String(s); var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  MC.rng = function (seed) {
    var a = typeof seed === 'number' ? seed >>> 0 : MC.hash(seed);
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  MC.shuffle = function (arr, rnd) { var a = arr.slice(); rnd = rnd || Math.random; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  MC.seed = function () { try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0].toString(36); } catch (e) { return Math.floor(Math.random() * 1e9).toString(36); } };

  // ---------- אותיות ----------
  var FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }, TOFIN = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
  MC.norm = function (ch) { return FIN[ch] || ch; };
  MC.fin = function (ch) { return TOFIN[ch] || ch; };
  MC.isEn = function (w) { return /[A-Za-z]/.test(w) && !/[א-ת]/.test(w); };
  // רק האותיות (בלי ניקוד, רווחים, גרש ומקף). אנגלית – באותיות גדולות.
  MC.letters = function (w) {
    w = String(w || '').replace(/[֑-ׇ]/g, '');
    return MC.isEn(w) ? w.toUpperCase().replace(/[^A-Z]/g, '') : w.replace(/[^א-ת]/g, '');
  };
  MC.key = function (w) { return MC.letters(w).split('').map(MC.norm).join(''); };
  MC.clean = function (s, n) { return String(s || '').replace(/[֑-ׇ]/g, '').replace(/\s+/g, ' ').trim().slice(0, n || 40); };

  // ---------- שמירה בטלפון ----------
  MC.load = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  MC.save = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  // ---------- מדידה (אירוע אחד בחצי דקה לכל פעולה) ----------
  var last = {};
  MC.used = function (tool, how, extra) {
    var k = tool + ':' + how, now = Date.now();
    if (last[k] && now - last[k] < 30000) return; last[k] = now;
    var o = { how: how }; if (extra) for (var x in extra) o[x] = extra[x];
    try { if (window.toolUsed) window.toolUsed(tool, o); } catch (e) {}
  };

  // ---------- קישור לשיתוף: כל הנתונים בתוך הכתובת ----------
  MC.enc = function (o) {
    var b = new TextEncoder().encode(JSON.stringify(o)), bin = '';
    for (var i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  MC.dec = function (s) {
    try { var bin = atob(String(s).replace(/-/g, '+').replace(/_/g, '/')); return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, function (c) { return c.charCodeAt(0); }))); } catch (e) { return null; }
  };
  MC.param = function (k) { var m = location.search.match(new RegExp('[?&]' + k + '=([^&#]*)')); return m ? decodeURIComponent(m[1]) : ''; };
  MC.link = function (o) { return location.origin + location.pathname + '?d=' + MC.enc(o); };
  MC.wa = function (text) { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); };
  MC.copy = function (text, btn) {
    function ok() { if (btn) { var t = btn.textContent; btn.textContent = '✓ הועתק'; setTimeout(function () { btn.textContent = t; }, 1800); } }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { window.prompt('להעתקה:', text); });
    else window.prompt('להעתקה:', text);
  };

  // ---------- בנקי המילים ----------
  var BANKS = (window.MC_BANKS || []).slice();
  BANKS.forEach(function (b) { b.list = b.items.map(function (s) { var p = s.split('|'); return { w: p[0], c: p[1] || '', e: p[2] || '' }; }); });
  var CHAGIM = ['tishrei', 'sukot', 'chanuka', 'tubishvat', 'purim', 'pesach', 'shavuot'];
  BANKS.push({ id: 'chagim', name: 'חגי ישראל', em: '📅', keys: ['חגים', 'חגי ישראל', 'חגי השנה', 'מעגל השנה', 'חג'], list: [].concat.apply([], BANKS.filter(function (b) { return CHAGIM.indexOf(b.id) >= 0; }).map(function (b) { return b.list.slice(0, 9); })) });
  MC.banks = BANKS;
  var DICT = {};
  BANKS.forEach(function (b) { b.list.forEach(function (it) { var k = MC.key(it.w); if (!DICT[k]) DICT[k] = it; }); });
  MC.lookup = function (w) { return DICT[MC.key(w)] || null; };
  function nk(s) { return String(s || '').replace(/[֑-ׇ"'״׳`.,!?]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  // מוצא את הנושא שהכי מתאים למה שכתבו ("תפזורת לחנוכה" -> חנוכה). אין התאמה -> null
  MC.topic = function (text) {
    var t = nk(text); if (!t) return null;
    var best = null, score = 0;
    BANKS.forEach(function (b) {
      [b.name].concat(b.keys || []).forEach(function (k) {
        k = nk(k); var s = 0;
        if (k === t) s = 100;
        else if (k.length >= 2 && (' ' + t + ' ').indexOf(' ' + k) >= 0) s = 50 + k.length;
        else if (t.length >= 3 && k.indexOf(t) === 0) s = 30 + t.length;
        if (s > score) { score = s; best = b; }
      });
    });
    return best;
  };

  // ---------- עוזר המילים בענן (נושא שאין במאגר, והגדרות למילים שלכם) ----------
  MC.ai = function (body) {
    var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 100000);
    var h = { 'content-type': 'application/json' };
    try { var c = localStorage.getItem('kelim-partner'); if (c) h['x-kelim-partner'] = c; } catch (e) {}
    return fetch(MC.AI_URL, { method: 'POST', headers: h, body: JSON.stringify(body), signal: ctl && ctl.signal }).then(function (r) {
      clearTimeout(tm);
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.items) { var e = new Error(j.error || 'ai'); e.rest = j.rest || r.status === 429; throw e; } return j; });
    }, function (e) { clearTimeout(tm); throw e; });
  };
  function okItem(it, en) {
    var L = MC.letters(it.w);
    return L.length >= 2 && L.length <= 14 && (en ? MC.isEn(it.w) : !MC.isEn(it.w));
  }

  // ---------- פאנל המילים: שלוש דרכים ----------
  // cfg: {key, tool, clues (תשבץ), min, n, minLen, label, example:'chanuka', onChange(items)}
  MC.panel = function (root, cfg) {
    var P = root.id || 'mcw', st = MC.load(cfg.key, null);
    var first = !st;
    st = st || { m: 'topic', t: '', n: cfg.n || 20, text: '' };
    var HOW = {
      mine: cfg.clues ? 'כותבים מילה בכל שורה, ואחריה מקף והגדרה. למשל: <b>אריה - מלך החיות</b>. מילה בלי הגדרה? אפשר לבקש שנשלים לכם.' : 'כותבים מילה בכל שורה (או מפרידים בפסיקים). אפשר גם צירופים קצרים.',
      topic: 'כותבים נושא, או בוחרים אחד מהרשימה, ואנחנו ממציאים את המילים' + (cfg.clues ? ' וההגדרות' : '') + '. אחר כך אפשר לשנות, למחוק ולהוסיף.',
      mix: 'כותבים כמה מילים משלכם, בוחרים נושא, ואנחנו משלימים את השאר' + (cfg.clues ? ' – כולל הגדרות למילים שכתבתם בלי הגדרה' : '') + '.'
    };
    var chips = BANKS.filter(function (b) { return b.id !== 'chagim'; }).map(function (b) { return '<button type="button" class="mc-chip" data-t="' + MC.esc(b.name) + '">' + b.em + ' ' + MC.esc(b.name) + '</button>'; }).join('');
    root.classList.add('mc-words');
    root.innerHTML =
      '<div class="mc-src" role="radiogroup" aria-label="מאיפה יגיעו המילים?">' +
      '<button type="button" role="radio" data-m="mine"><span aria-hidden="true">✍️</span><b>אני כותב/ת</b><small>המילים שלי</small></button>' +
      '<button type="button" role="radio" data-m="topic"><span aria-hidden="true">✨</span><b>לפי נושא</b><small>אנחנו ממציאים</small></button>' +
      '<button type="button" role="radio" data-m="mix"><span aria-hidden="true">🤝</span><b>גם וגם</b><small>אתם מתחילים, אנחנו משלימים</small></button></div>' +
      '<p class="mc-how" id="' + P + '-how"></p>' +
      '<div class="mc-topic" id="' + P + '-tp"><div class="field"><label for="' + P + '-t">על איזה נושא?</label>' +
      '<div class="mc-row"><input id="' + P + '-t" type="text" maxlength="60" autocomplete="off" placeholder="חנוכה, חיות, החלל, גוף האדם..." enterkeyhint="go">' +
      '<label class="mc-n"><span>כמה מילים</span><input id="' + P + '-n" type="number" min="4" max="60" inputmode="numeric"></label></div>' +
      '<button class="btn btn-gold btn-sm mc-go" type="button" id="' + P + '-go"></button></div>' +
      '<div class="mc-chips" id="' + P + '-chips" aria-label="נושאים מוכנים">' + chips + '</div></div>' +
      '<div class="field mc-ta"><label for="' + P + '-w" id="' + P + '-wl"></label>' +
      '<textarea id="' + P + '-w" rows="9" spellcheck="false" dir="auto"></textarea>' +
      '<div class="mc-tabar"><span class="mc-cnt" id="' + P + '-cnt" aria-live="polite"></span>' +
      '<button type="button" class="mc-link" id="' + P + '-clear">ניקוי הרשימה</button></div></div>' +
      '<p class="mc-msg" id="' + P + '-msg" aria-live="polite"></p>';
    var $ = function (s) { return MC.$(P + '-' + s); };
    var ta = $('w'), ti = $('t'), ni = $('n'), msg = $('msg');
    ta.value = st.text || ''; ti.value = st.t || ''; ni.value = st.n || cfg.n || 20;
    ta.placeholder = cfg.clues ? 'אריה - מלך החיות\nפיל - יש לו חדק ארוך\nצב - הולך לאט' : 'אריה\nפיל\nצב\nג׳ירפה';
    function say(t, bad) { msg.innerHTML = t || ''; msg.classList.toggle('bad', !!bad); }
    function items() { return MC.parse(ta.value, cfg.clues); }
    function count() {
      var it = items(), n = it.length, noc = cfg.clues ? it.filter(function (x) { return !x.c; }).length : 0;
      $('cnt').textContent = n ? (n === 1 ? 'מילה אחת' : n + ' מילים') + (noc ? ' · ל-' + noc + ' חסרה הגדרה' : '') : '';
      return it;
    }
    function persist() { st.text = ta.value; st.t = ti.value; st.n = +ni.value || cfg.n || 20; MC.save(cfg.key, st); }
    var tmr = 0;
    function changed(now) { count(); persist(); clearTimeout(tmr); tmr = setTimeout(function () { if (cfg.onChange) cfg.onChange(items(), api); }, now ? 0 : 700); }
    function setMode(m) {
      st.m = m; root.setAttribute('data-m', m);
      [].forEach.call(root.querySelectorAll('.mc-src button'), function (b) { b.setAttribute('aria-checked', b.getAttribute('data-m') === m ? 'true' : 'false'); });
      $('how').innerHTML = HOW[m];
      $('go').textContent = m === 'mix' ? '✨ להשלים לי מילים' : '✨ ליצור מילים';
      $('wl').textContent = m === 'topic' ? 'המילים' + (cfg.clues ? ' וההגדרות' : '') + ' (אפשר לשנות)' : cfg.clues ? 'המילים וההגדרות שלכם' : 'המילים שלכם';
      ni.parentNode.querySelector('span').textContent = m === 'mix' ? 'כמה בסך הכול' : 'כמה מילים';
      persist();
    }
    function lines(list) { return list.map(function (it) { return cfg.clues && it.c ? it.w + ' - ' + it.c : it.w; }).join('\n'); }
    var busy = false;
    function gen(fromChip) {
      if (busy) return;
      var topic = MC.clean(ti.value, 60), want = Math.max(4, Math.min(60, +ni.value || cfg.n || 20)), mine = st.m === 'mix' ? items() : [];
      if (!topic) { say('כתבו נושא, או בחרו אחד מהרשימה למטה.', true); ti.focus(); return; }
      var need = st.m === 'mix' ? Math.max(0, want - mine.length) : want, b = MC.topic(topic);
      // במצב "גם וגם": קודם הגדרות למילים שלכם מהמאגר
      if (cfg.clues && mine.length) mine.forEach(function (it) { if (!it.c) { var f = MC.lookup(it.w); if (f) it.c = f.c; } });
      var go = $('go'); busy = true; go.disabled = true; go.textContent = '⏳ רגע...';
      var done = function () { busy = false; go.disabled = false; setMode(st.m); };
      if (b) {
        var have = {}; mine.forEach(function (it) { have[MC.key(it.w)] = 1; });
        var add = MC.shuffle(b.list.filter(function (it) { return !have[MC.key(it.w)]; })).slice(0, need);
        ta.value = lines(mine.concat(add)); changed(true); done();
        var short = need - add.length;
        st.tn = b.name; persist();
        say((st.m === 'mix' ? 'השלמנו ' + add.length + ' מילים' : 'יצרנו ' + add.length + ' מילים') + ' בנושא ' + b.em + ' ' + MC.esc(b.name) + '. אפשר לשנות אותן כאן.' + (short > 0 ? ' (במאגר שלנו לנושא הזה יש ' + b.list.length + ' מילים.)' : ''));
        MC.used(cfg.tool, 'topic', { src: 'bank', topic: b.id, mode: st.m });
        if (cfg.clues) fillClues(true);
        return;
      }
      say('✨ עוזר המילים מחפש מילים בנושא "' + MC.esc(topic) + '" ומנסח הגדרות. זה לוקח כדקה – נושא שכבר ביקשו חוזר מיד...');
      MC.ai({ tool: cfg.tool, topic: topic, n: need, have: mine.map(function (it) { return it.w; }).slice(0, 60), clues: !!cfg.clues, clueFor: cfg.clues ? mine.filter(function (it) { return !it.c; }).map(function (it) { return it.w; }).slice(0, 40) : [] }).then(function (j) {
        var en = /אנגלית|english/i.test(topic);
        var got = (j.items || []).map(function (x) { return { w: MC.clean(x.w, 30), c: MC.clean(x.c, 110) }; }).filter(function (x) { return okItem(x, en) || okItem(x, !en); });
        var cl = j.clues || {};
        mine.forEach(function (it) { if (!it.c && cl[it.w]) it.c = MC.clean(cl[it.w], 110); });
        var have = {}; mine.forEach(function (it) { have[MC.key(it.w)] = 1; });
        got = got.filter(function (x) { var k = MC.key(x.w); if (have[k]) return false; have[k] = 1; return true; }).slice(0, need);
        ta.value = lines(mine.concat(got)); changed(true); done();
        st.tn = topic; persist();
        say('✨ עוזר המילים הציע ' + got.length + ' מילים בנושא "' + MC.esc(topic) + '". כדאי לעבור עליהן – אפשר לשנות כל מילה.');
        MC.used(cfg.tool, 'topic', { src: 'ai', mode: st.m });
      }).catch(function (e) {
        done();
        var near = BANKS.filter(function (x) { return x.id !== 'chagim'; }).slice(0, 8).map(function (x) { return x.name; }).join(', ');
        say((e && e.rest ? 'עוזר המילים נח להיום. ' : 'הנושא "' + MC.esc(topic) + '" עוד לא במאגר שלנו. ') + 'בחרו נושא מהרשימה (' + MC.esc(near) + ' ועוד), או כתבו את המילים בעצמכם.', true);
        MC.used(cfg.tool, 'topic_miss', { mode: st.m });
      });
    }
    // הגדרות חסרות (תשבץ): מהמאגר, ואם אין – מעוזר המילים
    function fillClues(silent) {
      var it = items(), miss = [];
      it.forEach(function (x) { if (!x.c) { var f = MC.lookup(x.w); if (f) x.c = f.c; else miss.push(x.w); } });
      ta.value = lines(it); changed(true);
      if (!miss.length || silent === true) return Promise.resolve(miss);
      say('כותבים הגדרות ל-' + miss.length + ' מילים...');
      return MC.ai({ tool: cfg.tool, topic: MC.clean(ti.value, 60), n: 0, clueFor: miss.slice(0, 40), clues: true }).then(function (j) {
        var cl = j.clues || {}, left = 0;
        it.forEach(function (x) { if (!x.c) { if (cl[x.w]) x.c = MC.clean(cl[x.w], 110); else left++; } });
        ta.value = lines(it); changed(true);
        say(left ? 'נשארו ' + left + ' מילים בלי הגדרה – כתבו אותן אחרי מקף.' : '✨ נוספו הגדרות. כדאי לעבור עליהן ולתקן מה שצריך.');
        return [];
      }).catch(function () {
        say('למילים האלה אין עדיין הגדרה: <b>' + MC.esc(miss.join(', ')) + '</b>. כתבו הגדרה אחרי מקף, או שנשים אותן במחסן מילים מתחת לתשבץ.', true);
        return miss;
      });
    }
    [].forEach.call(root.querySelectorAll('.mc-src button'), function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-m')); MC.used(cfg.tool, 'src_' + b.getAttribute('data-m')); }); });
    [].forEach.call(root.querySelectorAll('.mc-chip'), function (b) { b.addEventListener('click', function () { ti.value = b.getAttribute('data-t'); if (st.m === 'mine') setMode('topic'); gen(true); }); });
    $('go').addEventListener('click', function () { gen(); });
    ti.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); gen(); } });
    ti.addEventListener('input', persist); ni.addEventListener('change', persist);
    ta.addEventListener('input', function () { changed(); });
    $('clear').addEventListener('click', function () { ta.value = ''; st.tn = ''; changed(true); say(''); ta.focus(); });
    setMode(st.m);
    var api = {
      items: items, el: root, say: say, fillClues: fillClues, mode: function () { return st.m; },
      topicName: function () { return st.m === 'mine' && !st.tn ? '' : (st.tn || ''); },
      set: function (text, topic) { ta.value = text; if (topic != null) ti.value = topic; changed(true); }
    };
    // כניסה ראשונה: דוגמה מלאה (נושא מוכן), כדי שהכלי לא ייראה ריק
    if (first && cfg.example) {
      var b0 = BANKS.filter(function (b) { return b.id === cfg.example; })[0];
      if (b0) { ti.value = b0.name; st.tn = b0.name; ta.value = lines(MC.shuffle(b0.list, MC.rng('ex-' + cfg.tool)).slice(0, cfg.n || 20)); persist(); }
    }
    count();
    return api;
  };

  // שורה -> {w, c}. "מילה - הגדרה" (גם : = | – או טאב). שורה בלי הגדרה: פסיקים מפרידים בין מילים.
  MC.parse = function (text) {
    var out = [], seen = {};
    String(text || '').split(/\n/).forEach(function (line) {
      line = line.replace(/[֑-ׇ]/g, '').replace(/^\s*(\d+[.)]|[*•])\s+/, '').trim();
      if (!line) return;
      var m = line.match(/^(.+?)\s*(?:\s-\s|\s-$|[–—:=|\t])\s*(.*)$/);
      var parts = m ? [[m[1], m[2]]] : line.split(/[,،;]/).map(function (x) { return [x, '']; });
      parts.forEach(function (p) {
        var w = MC.clean(p[0], 40), c = MC.clean(p[1], 120), k = MC.key(w);
        if (!k || seen[k]) return; seen[k] = 1;
        var f = MC.lookup(w);
        out.push({ w: w, c: c, e: f ? f.e : '', bc: f ? f.c : '' });
      });
    });
    return out;
  };

  // ---------- דפי A4: הדפסה, תצוגה ו-PDF ----------
  // pages = [html, ...]  כל אחד הופך ל-<section class="mc-page">
  function box() { var b = MC.$('mc-print'); if (!b) { b = document.createElement('div'); b.id = 'mc-print'; b.setAttribute('aria-hidden', 'true'); document.body.appendChild(b); } return b; }
  MC.print = function (pages, title) {
    box().innerHTML = pages.map(function (p) { return '<section class="mc-page">' + p + '</section>'; }).join('');
    var t0 = document.title;
    if (title) document.title = title; // שם הקובץ כששומרים כ-PDF
    var back = function () { document.title = t0; window.removeEventListener('afterprint', back); };
    window.addEventListener('afterprint', back); setTimeout(back, 60000);
    setTimeout(function () { window.print(); }, 60);
  };
  // תצוגה מוקטנת של הדפים, בדיוק כמו בהדפסה
  MC.preview = function (el, pages, max) {
    max = max || 2;
    var w = el.clientWidth || 340, s = Math.min(1, (w - 2) / 794);
    var html = pages.slice(0, max).map(function (p, i) {
      return '<div class="mc-pv" style="height:' + Math.round(1123 * s) + 'px"><section class="mc-page" style="transform:scale(' + s.toFixed(4) + ')">' + p + '</section><span class="mc-pvn">דף ' + (i + 1) + ' מתוך ' + pages.length + '</span></div>';
    }).join('');
    el.innerHTML = html + (pages.length > max ? '<p class="note mc-more">ועוד ' + (pages.length - max) + ' דפים בהדפסה ובקובץ.</p>' : '');
  };
  function loadJs(src) { return new Promise(function (ok, no) { var x = document.createElement('script'); x.src = src; x.onload = ok; x.onerror = no; document.head.appendChild(x); }); }
  MC.pdf = function (pages, onStep) {
    var host = document.createElement('div'); host.className = 'mc-pdfhost'; host.setAttribute('aria-hidden', 'true'); document.body.appendChild(host);
    var libs = [window.htmlToImage ? 0 : loadJs('/assets/vendor/html-to-image/html-to-image-1.11.11.js'), window.jspdf ? 0 : loadJs('/assets/vendor/jspdf/jspdf-2.5.1.umd.min.js')];
    return Promise.all(libs).then(function () { return document.fonts ? document.fonts.ready : 0; }).then(function () {
      var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true }), i = 0, fc = null;
      function next() {
        if (i >= pages.length) return doc.output('blob');
        host.innerHTML = '<section class="mc-page">' + pages[i] + '</section>';
        var pg = host.firstChild;
        if (onStep) onStep(i + 1, pages.length);
        var p = fc === null ? window.htmlToImage.getFontEmbedCSS(pg).catch(function () { return ''; }).then(function (f) { fc = f || ''; }) : Promise.resolve();
        return p.then(function () {
          return window.htmlToImage.toCanvas(pg, { width: 794, height: 1123, pixelRatio: 2, backgroundColor: '#ffffff', fontEmbedCSS: fc || undefined, cacheBust: false });
        }).then(function (cv) {
          if (i) doc.addPage('a4', 'p');
          doc.addImage(cv.toDataURL('image/jpeg', 0.86), 'JPEG', 0, 0, 210, 297);
          i++; return next();
        });
      }
      return next();
    }).then(function (b) { host.parentNode.removeChild(host); return b; }, function (e) { if (host.parentNode) host.parentNode.removeChild(host); throw e; });
  };
  // כפתור PDF: יוצר, מוריד, ובטלפון מציע לשתף את הקובץ (בלחיצה נפרדת – הדפדפן דורש לחיצה טרייה)
  MC.pdfButton = function (btn, getPages, name, tool) {
    var label = btn.innerHTML, file = null;
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      if (file) { share(); return; }
      btn.disabled = true;
      MC.pdf(getPages(), function (i, n) { btn.textContent = '⏳ דף ' + i + ' מתוך ' + n; }).then(function (blob) {
        var fn = (typeof name === 'function' ? name() : name).replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.pdf';
        var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        try { var f = new File([blob], fn, { type: 'application/pdf' }); if (navigator.canShare && navigator.canShare({ files: [f] })) file = f; } catch (e) {}
        btn.disabled = false; btn.innerHTML = file ? '📤 לשלוח את הקובץ' : label;
        if (file) setTimeout(function () { file = null; btn.innerHTML = label; }, 120000);
        MC.used(tool, 'pdf');
      }).catch(function () { btn.disabled = false; btn.innerHTML = label; alertish(btn, 'לא הצלחנו ליצור קובץ. אפשר "להדפיס" ולבחור "שמירה כ-PDF".'); });
    });
    function share() { navigator.share({ files: [file], title: file.name }).catch(function () {}); MC.used(tool, 'pdf_share'); }
  };
  function alertish(near, t) { var p = document.createElement('p'); p.className = 'mc-msg bad'; p.setAttribute('role', 'alert'); p.textContent = t; near.parentNode.insertBefore(p, near.nextSibling); setTimeout(function () { p.remove(); }, 8000); }

  // כותרת ושורת שם בראש דף מודפס
  MC.head = function (title, sub, nameLine) {
    return '<header class="mc-ph"><h2>' + MC.esc(title) + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + (nameLine ? '<div class="mc-name"><span>שם: ____________________</span><span>תאריך: ____________</span></div>' : '') + '</header>';
  };
  MC.foot = function () { return '<footer class="mc-pf">נוצר בחינם ב-hakelim.com/kelim/chashiva · הכלים של גילעד רחמים</footer>'; };
})();
