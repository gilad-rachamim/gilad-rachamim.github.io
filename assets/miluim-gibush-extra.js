// הכנה לגיבוש – שלושה כלים קטנים שמשלימים את התוכנית היומית (miluim-gibush.js):
// 1. בדיקת מוכנות מנטלית (#gx-check): 10 משפטים על חמשת הדברים שמפילים בגיבוש, ציון לכל תחום והמלצה לימים בתוכנית.
// 2. נשימה להרגעה (#gx-breath): נשימת קופסה 4-4-4-4 או נשיפה ארוכה 4-6, עם עיגול, טיימר ורטט.
// 3. מה לקחת לגיבוש (#gx-pack): רשימה לסמן בטלפון, פריטים משלכם, הדפסה ושליחה.
// כל כלי נדלק רק אם יש לו מקום בדף. הכול נשמר רק בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var used = {};
  function track(tool, how, extra) { var k = tool + how; if (used[k]) return; used[k] = 1; if (window.toolUsed) window.toolUsed(tool, Object.assign({ how: how }, extra || {})); }
  var PLAN = '/kelim/miluim/gibush/';
  function wa(text) { return 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text); }

  // ================= 1. בדיקת מוכנות מנטלית =================
  var AREAS = [
    { id: 'lama', n: 'ה"למה" שלי', days: [2, 32], f: 1, tip: 'לבנות "למה" אישי: חמש פעמים "למה?" עד שמגיעים לסלע, לכתוב במשפט אחד ולתלות ליד המיטה.' },
    { id: 'yeda', n: 'לדעת מה מחכה', days: [8, 9], f: 2, tip: 'ללמוד את הגיבוש: מאתר "מתגייסים" של צה"ל, משיחה עם מי שעבר אותו, ממאמן רציני. מה שלא מפתיע – לא שובר.' },
    { id: 'hergel', n: 'הרגל יומי', days: [1, 10, 14], f: 3, tip: 'לבחור הרגל אחד בלבד ולסמן וי כל יום. לא להוסיף שני לפני שהראשון יושב.' },
    { id: 'nefila', n: 'קימה מנפילה', days: [22, 24, 12], f: 4, tip: 'לקבוע מראש: לעולם לא שני ימים ברצף. ובגיבוש – רק המשימה הבאה, לא כל הגיבוש.' },
    { id: 'zrizut', n: 'זריזות ושינה', days: [4, 15, 18], f: 5, tip: 'לקום בלי משא ומתן עם המזרן, לזוז ראשונים, ולישון 7–8 שעות. הגוף מושך את הראש.' }
  ];
  var QS = [
    ['lama', 'אני יכול להגיד במשפט אחד למה אני רוצה את הגיבוש הזה – בשביל עצמי, לא כדי להרשים מישהו.'],
    ['lama', 'ה"למה" שלי כתוב ותלוי במקום שאני רואה כל יום.'],
    ['yeda', 'אני יודע כמה זמן נמשך הגיבוש שלי, כמה ישנים בו בערך ומה בודקים בו.'],
    ['yeda', 'דיברתי עם מישהו שעבר את הגיבוש הזה, ושאלתי מה היה לו הכי קשה.'],
    ['hergel', 'יש לי הרגל אחד שאני עושה כל יום, כבר שבועיים לפחות.'],
    ['hergel', 'גם בשבוע עמוס (מבחנים, אירוע, חורף) אני לא מפספס יותר מיום אחד.'],
    ['nefila', 'כשאני נכשל באימון או מפספס יום, אני חוזר למחרת ולא מוותר על כל התוכנית.'],
    ['nefila', 'יש לי משפט מוכן שאני אומר לעצמי ברגע שבא לי לפרוש.'],
    ['zrizut', 'אני קם בבוקר בלי לדחות את השעון המעורר.'],
    ['zrizut', 'אני ישן 7–8 שעות ברוב הלילות.']
  ];
  var ANS = [['לא', 0], ['חלקית', 1], ['כן', 2]];
  function check() {
    var box = $('gx-check'); if (!box) return;
    var KEY = 'kelim-gibush-check', a = {};
    try { a = JSON.parse(get(KEY) || '{}') || {}; } catch (e) {}
    box.innerHTML = '<ol class="gx-qs">' + QS.map(function (q, i) {
      return '<li><p id="gx-q' + i + '">' + esc(q[1]) + '</p><div class="gx-opts" role="radiogroup" aria-labelledby="gx-q' + i + '">' +
        ANS.map(function (o) { return '<label><input type="radio" name="gx' + i + '" value="' + o[1] + '"' + (a[i] === o[1] ? ' checked' : '') + '><span>' + o[0] + '</span></label>'; }).join('') + '</div></li>';
    }).join('') + '</ol><p class="gx-left" id="gx-left" aria-live="polite"></p><div class="gx-res" id="gx-res" aria-live="polite" hidden></div>';
    box.addEventListener('change', function (e) {
      if (!e.target.name) return;
      a[+e.target.name.slice(2)] = +e.target.value; set(KEY, JSON.stringify(a));
      show(true);
    });
    function show(fresh) {
      var n = Object.keys(a).length, res = $('gx-res');
      $('gx-left').textContent = n < QS.length ? 'עניתם על ' + n + ' מתוך ' + QS.length + '. התוצאה תופיע כשתסיימו.' : '';
      if (n < QS.length) { res.hidden = true; return; }
      var sc = {}, tot = 0;
      AREAS.forEach(function (ar) { sc[ar.id] = 0; });
      QS.forEach(function (q, i) { sc[q[0]] += a[i]; tot += a[i]; });
      var pct = Math.round(100 * tot / (QS.length * 2));
      var sorted = AREAS.slice().sort(function (x, y) { return sc[x.id] - sc[y.id]; });
      var weak = sorted[0], strong = sorted[sorted.length - 1];
      var level = pct >= 80 ? 'מוכנות גבוהה. עכשיו רק לשמור על מה שבניתם עד הגיבוש.' : pct >= 55 ? 'בסיס טוב. יש תחום אחד או שניים שכדאי לחזק בשבועות הקרובים.' : 'יש עבודה – וזה בדיוק הזמן. הכנה בראש נבנית יום אחרי יום, ואפשר להתחיל היום.';
      res.hidden = false;
      res.innerHTML = '<div class="gx-score"><b>' + pct + '%</b><span>מוכנות מנטלית</span></div><p class="gx-level">' + level + '</p>' +
        '<ul class="gx-bars">' + AREAS.map(function (ar) {
          var p = Math.round(100 * sc[ar.id] / 4);
          return '<li' + (ar === weak && sc[weak.id] < 4 ? ' class="weak"' : '') + '><span>' + ar.n + '</span><i aria-hidden="true"><em style="width:' + p + '%"></em></i><b>' + p + '%</b></li>';
        }).join('') + '</ul>' +
        (sc[weak.id] < 4 ? '<div class="gx-focus"><p><b>לחזק קודם: ' + weak.n + '.</b> ' + weak.tip + '</p><p>בתוכנית היומית זה ' + weak.days.map(function (d) { return 'יום ' + d; }).join(', ') + ' · <a class="gold" href="' + PLAN + '#gb-f' + weak.f + '">במדריך: איך לא ליפול כאן</a></p></div>' : '') +
        (sc[strong.id] >= 3 && strong !== weak ? '<p class="gx-strong">החוזקה שלכם: ' + strong.n + '. תשענו עליה ביום הקשה.</p>' : '') +
        '<div class="actions"><a class="btn btn-gold btn-sm" href="' + PLAN + '#gb-form">לבנות תוכנית יומית עד הגיבוש</a>' +
        '<a class="btn btn-line btn-sm" target="_blank" rel="noopener" href="' + wa('עשיתי בדיקת מוכנות מנטלית לגיבוש: ' + pct + '%. הכי חזק אצלי: ' + strong.n + '. לחזק: ' + weak.n + '. נסו גם:\n' + location.origin + PLAN + '#gx-check') + '"><svg class="ic"><use href="#wa"/></svg> לשלוח את התוצאה</a>' +
        '<button class="btn btn-line btn-sm" type="button" id="gx-again">לענות שוב</button></div>' +
        '<p class="note">הבדיקה עוזרת לראות איפה לחזק. היא לא מבחן פסיכולוגי ולא מנבאת אם תעברו.</p>';
      $('gx-again').addEventListener('click', function () { a = {}; set(KEY, null); check(); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      if (fresh) { track('miluim_gibush', 'check', { pct: pct, weak: weak.id }); res.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    }
    show(false);
  }

  // ================= 2. נשימה להרגעה =================
  var MODES = {
    box: { n: 'נשימת קופסה 4-4-4-4', ph: [['שואפים מהאף', 4, 1], ['מחזיקים', 4, 1], ['נושפים לאט מהפה', 4, 0], ['מחזיקים', 4, 0]] },
    long: { n: 'נשיפה ארוכה 4-6', ph: [['שואפים מהאף', 4, 1], ['נושפים לאט, ארוך', 6, 0]] }
  };
  function breath() {
    var box = $('gx-breath'); if (!box) return;
    var mode = 'box', mins = 2, timer = null, endAt = 0, pi = 0, left = 0;
    box.innerHTML = '<div class="gx-bmode" role="radiogroup" aria-label="סוג הנשימה">' +
      Object.keys(MODES).map(function (k) { return '<label><input type="radio" name="gxm" value="' + k + '"' + (k === mode ? ' checked' : '') + '><span>' + MODES[k].n + '</span></label>'; }).join('') + '</div>' +
      '<div class="gx-bmode" role="radiogroup" aria-label="כמה זמן">' + [1, 2, 4].map(function (m) { return '<label><input type="radio" name="gxt" value="' + m + '"' + (m === mins ? ' checked' : '') + '><span>' + m + (m === 1 ? ' דקה' : ' דקות') + '</span></label>'; }).join('') + '</div>' +
      '<div class="gx-orb-wrap"><div class="gx-orb" id="gx-orb"><b id="gx-ph">מוכנים?</b><span id="gx-cnt"></span></div></div>' +
      '<p class="gx-btime" id="gx-btime" aria-live="off"></p>' +
      '<button class="btn btn-gold btn-block" type="button" id="gx-bgo">להתחיל לנשום</button>' +
      '<p class="gx-sr" id="gx-blive" aria-live="assertive"></p>';
    var orb = $('gx-orb');
    box.addEventListener('change', function (e) {
      if (e.target.name === 'gxm') mode = e.target.value;
      if (e.target.name === 'gxt') mins = +e.target.value;
      if (timer) stop();
    });
    function stop(done) {
      clearInterval(timer); timer = null;
      orb.className = 'gx-orb'; orb.style.transitionDuration = '';
      $('gx-ph').textContent = done ? 'כל הכבוד ❤' : 'מוכנים?'; $('gx-cnt').textContent = '';
      $('gx-btime').textContent = done ? 'עכשיו – רק המשימה הבאה.' : '';
      $('gx-bgo').textContent = done ? 'עוד סבב' : 'להתחיל לנשום';
    }
    function phase() {
      var ph = MODES[mode].ph[pi % MODES[mode].ph.length];
      left = ph[1];
      $('gx-ph').textContent = ph[0]; $('gx-cnt').textContent = left;
      $('gx-blive').textContent = ph[0];
      orb.style.transitionDuration = ph[1] + 's';
      orb.className = 'gx-orb on ' + (ph[2] ? 'big' : 'small');
      if (navigator.vibrate) try { navigator.vibrate(ph[2] ? 40 : [20, 60, 20]); } catch (e) {}
    }
    $('gx-bgo').addEventListener('click', function () {
      if (timer) { stop(); return; }
      endAt = Date.now() + mins * 60000; pi = 0; phase();
      $('gx-bgo').textContent = 'לעצור';
      track(box.getAttribute('data-tool') || 'miluim_gibush', 'breath', { mode: mode, mins: mins });
      timer = setInterval(function () {
        var rest = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        $('gx-btime').textContent = 'נשארו ' + Math.floor(rest / 60) + ':' + ('0' + rest % 60).slice(-2);
        left--;
        if (left > 0) { $('gx-cnt').textContent = left; return; }
        pi++;
        if (Date.now() >= endAt && pi % MODES[mode].ph.length === 0) { stop(true); return; }
        phase();
      }, 1000);
    });
    // המשפט לרגע הקשה
    var m = $('gx-mishpat');
    if (m) {
      m.value = get('kelim-gibush-mishpat');
      m.addEventListener('input', function () { set('kelim-gibush-mishpat', m.value); });
      var big = $('gx-big');
      $('gx-show').addEventListener('click', function () {
        if (!m.value.trim()) { m.focus(); return; }
        big.querySelector('p').textContent = m.value.trim(); big.hidden = false; big.focus();
        track('miluim_gibush_pachad', 'mishpat');
      });
      big.addEventListener('click', function () { big.hidden = true; });
      big.addEventListener('keydown', function (e) { if (e.key === 'Escape' || e.key === 'Enter') big.hidden = true; });
    }
  }

  // ================= 3. מה לקחת לגיבוש =================
  var PACK = [
    ['מסמכים', ['תעודת זהות', 'הזימון לגיבוש (מודפס או בטלפון)', 'אישורים רפואיים, אם ביקשו בזימון', 'רשימה של תרופות קבועות, אם יש']],
    ['נעליים ולבוש', ['נעלי ריצה שכבר רצתם בהן (לא חדשות!)', 'זוג נעליים נוסף להחלפה', 'הרבה זוגות גרביים', 'בגדי ספורט להחלפה', 'ביגוד חם ללילה', 'כובע']],
    ['לגוף', ['בקבוק מים גדול', 'קרם הגנה', 'תרופות קבועות, אם יש', 'פלסטרים לשפשופים', 'משהו קטן לאכול בדרך']],
    ['לינה ורחצה', ['כלי רחצה ומגבת', 'שקיות ניילון לבגדים רטובים ומלוכלכים', 'מטען לטלפון']],
    ['לראש', ['דף ה"למה" שלי, מקופל בתיק', 'המשפט שלי לרגע הקשה', 'מספר טלפון של ההורים כתוב על דף']]
  ];
  function pack() {
    var box = $('gx-pack'); if (!box) return;
    var KEY = 'kelim-gibush-pack', s = { c: {}, mine: [] };
    try { s = JSON.parse(get(KEY) || 'null') || s; } catch (e) {}
    s.c = s.c || {}; s.mine = s.mine || [];
    function save() { set(KEY, JSON.stringify(s)); }
    function all() { return PACK.concat(s.mine.length ? [['שהוספתי', s.mine]] : []); }
    function draw() {
      var tot = 0, got = 0;
      box.innerHTML = '<div class="gx-pprog"><b id="gx-pn"></b><i aria-hidden="true"><em id="gx-pbar"></em></i></div>' +
        all().map(function (g, gi) {
          return '<fieldset class="gx-pg"><legend>' + esc(g[0]) + '</legend>' + g[1].map(function (it) {
            var k = it, on = !!s.c[k]; tot++; if (on) got++;
            return '<label class="gx-pi' + (on ? ' on' : '') + '"><input type="checkbox" data-k="' + esc(k) + '"' + (on ? ' checked' : '') + '><span>' + esc(it) + '</span>' +
              (g[0] === 'שהוספתי' ? '<button type="button" class="gx-del" data-del="' + esc(k) + '" aria-label="למחוק את ' + esc(it) + '">✕</button>' : '') + '</label>';
          }).join('') + '</fieldset>';
        }).join('') +
        '<form class="gx-add" id="gx-add"><label for="gx-new" class="gx-sr">להוסיף פריט</label><input id="gx-new" type="text" maxlength="60" placeholder="להוסיף פריט משלי (למשל: משקפיים)"><button class="btn btn-line btn-sm" type="submit">להוסיף</button></form>' +
        '<div class="actions"><button class="btn btn-gold btn-sm" type="button" id="gx-pprint">🖨 להדפיס את הרשימה</button>' +
        '<a class="btn btn-line btn-sm" id="gx-pwa" target="_blank" rel="noopener" href="#"><svg class="ic"><use href="#wa"/></svg> לשלוח את הרשימה</a>' +
        '<button class="btn btn-line btn-sm" type="button" id="gx-pclear">לנקות סימונים</button></div>';
      $('gx-pn').textContent = got === tot ? '✓ הכול בתיק. בהצלחה ❤' : 'ארזתם ' + got + ' מתוך ' + tot;
      $('gx-pbar').style.width = Math.round(100 * got / tot) + '%';
      var txt = 'מה לקחת לגיבוש – הרשימה שלי:\n' + all().map(function (g) { return '\n' + g[0] + ':\n' + g[1].map(function (it) { return (s.c[it] ? '✅ ' : '⬜ ') + it; }).join('\n'); }).join('\n') + '\n\nמה שכתוב בזימון קובע. הרשימה מ: ' + location.origin + '/kelim/miluim/gibush/ma-lakachat/';
      $('gx-pwa').href = wa(txt);
      $('gx-add').addEventListener('submit', function (e) {
        e.preventDefault(); var v = $('gx-new').value.trim(); if (!v) return;
        if (s.mine.indexOf(v) < 0) s.mine.push(v); save(); draw(); $('gx-new').focus(); track('miluim_gibush_pack', 'add_item');
      });
      $('gx-pprint').addEventListener('click', function () { track('miluim_gibush_pack', 'print'); window.print(); });
      $('gx-pclear').addEventListener('click', function () { s.c = {}; save(); draw(); });
      $('gx-pwa').addEventListener('click', function () { track('miluim_gibush_pack', 'share'); });
    }
    box.addEventListener('change', function (e) {
      var k = e.target.getAttribute('data-k'); if (k == null) return;
      if (e.target.checked) s.c[k] = 1; else delete s.c[k];
      save(); track('miluim_gibush_pack', 'check');
      var y = window.scrollY; draw(); window.scrollTo(0, y);
      var el = box.querySelector('input[data-k="' + k.replace(/"/g, '\\"') + '"]'); if (el) el.focus();
    });
    box.addEventListener('click', function (e) {
      var d = e.target.getAttribute('data-del'); if (d == null) return;
      e.preventDefault(); s.mine = s.mine.filter(function (x) { return x !== d; }); delete s.c[d]; save(); draw();
    });
    draw();
  }

  check(); breath(); pack();
})();
