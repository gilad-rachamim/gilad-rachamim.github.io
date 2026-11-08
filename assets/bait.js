// כלים למשפחה ולבית: קניות, תורנויות, שבת ואורחים, מי מביא מה.
// הכול בטלפון (localStorage). שיתוף עם אחרים: ווטסאפ + קישור שמכיל את המצב (#d=...), בלי שרת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function wa(t) { return 'https://api.whatsapp.com/send?text=' + encodeURIComponent(t); }
  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return JSON.parse(decodeURIComponent(escape(atob(s)))); }
  function hashData() { var m = /[#&]d=([A-Za-z0-9_-]+)/.exec(location.hash); if (!m) return null; try { return dec(m[1]); } catch (e) { return null; } }
  function clearHash() { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
  var used = {};
  function use(tool, act) { if (used[tool + act]) return; used[tool + act] = 1; if (window.toolUsed) window.toolUsed(tool, { action: act }); }
  var toastT;
  function toast(msg) {
    var t = document.querySelector('.bt .toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); (document.querySelector('.bt') || document.body).appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function copy(text) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast('הקישור הועתק'); })
      .catch(function () { window.prompt('להעתיק את הקישור:', text); });
  }
  function toImage(el, name, tool) {
    if (!window.htmlToImage) { toast('רגע, עוד נטען… לנסות שוב'); return; }
    window.htmlToImage.toBlob(el, { pixelRatio: 2, backgroundColor: '#fffdf7' }).then(function (b) {
      var f = new File([b], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).catch(function () {});
      else { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
      use(tool, 'image');
    }).catch(function () { toast('לא הצלחתי ליצור תמונה. אפשר להדפיס במקום'); });
  }
  function num(v, d) { v = parseFloat(String(v).replace(',', '.')); return isFinite(v) ? v : d; }
  function heCount(n) { return Math.round(n * 10) / 10; }

  // ---------- קטגוריות לרשימת הקניות (לפי מילים בשם) ----------
  var CATS = [
    ['ניקיון ובית', ['נייר', 'סבון', 'אקונומיקה', 'מגבונ', 'שקיות', 'כביסה', 'ספוג', 'אלומיניום', 'ניילון', 'מרכך', 'שמפו', 'משחת', 'טיטול', 'חיתול', 'מטהר', 'חד-פעמי', 'חד פעמי', 'צלחות', 'כוסות', 'סכו', 'נרות', 'פחמים', 'מפות']],
    ['קפואים', ['קפוא', 'גלידה', 'שלגון', 'ארטיק']],
    ['משקאות', ['מיץ', 'יין', 'שתיה', 'שתייה', 'מים מינרל', 'סודה', 'קולה', 'בירה', 'ספרייט', 'פטל']],
    ['חלב וביצים', ['חלב', 'גבינ', 'יוגורט', 'שמנת', 'חמאה', 'ביצ', 'קוטג', 'לבנה', 'מעדן', 'שוקו', 'מוצרל', 'צפתית', 'בולגרית']],
    ['בשר, עוף ודגים', ['עוף', 'בשר', 'דג', 'סלמון', 'טונה', 'שניצל', 'כרעיים', 'חזה', 'טחון', 'נקניק', 'פרגית', 'קבב', 'המבורגר', 'הודו', 'צלי', 'כנפיים', 'אנטריקוט', 'סטייק']],
    ['לחם ומאפים', ['לחם', 'חלה', 'חלות', 'פית', 'לחמני', 'עוג', 'בורקס', 'טורטי', 'בגט', 'קרואסון', 'מאפ']],
    ['ירקות ופירות', ['עגבני', 'מלפפון', 'בצל', 'שום', 'גזר', 'תפוח', 'בננ', 'לימון', 'חסה', 'פלפל', 'תפו"א', 'תפו״א', 'ירק', 'פטרוזיליה', 'כוסברה', 'שמיר', 'אבוקדו', 'קישוא', 'חציל', 'כרוב', 'ענב', 'תות', 'אבטיח', 'מלון', 'תפוז', 'קלמנטינ', 'אגס', 'פרי', 'פירות', 'נענע', 'בטטה', 'סלק', 'דלעת', 'פטריות', 'סלרי', 'צנונ']],
    ['מזווה', ['אורז', 'פסטה', 'קמח', 'סוכר', 'מלח', 'שמן', 'קפה', 'תה', 'רסק', 'שימור', 'עדשים', 'חומוס', 'טחינה', 'תבלינ', 'פתיתים', 'קוסקוס', 'דגני', 'קורנפלקס', 'ריבה', 'דבש', 'שוקולד', 'ממרח', 'חטיפ', 'במבה', 'ביסלי', 'אבקת', 'קקאו', 'אגוז', 'שקדים', 'צימוק', 'פופקורן', 'ופל', 'אטריות', 'שעועית', 'חיטה', 'קטשופ', 'מיונז', 'חרדל', 'שמרים', 'פירורי', 'עמילן', 'וניל']]
  ];
  var CAT_ORDER = ['ירקות ופירות', 'לחם ומאפים', 'חלב וביצים', 'בשר, עוף ודגים', 'מזווה', 'משקאות', 'קפואים', 'ניקיון ובית', 'עוד דברים'];
  function guessCat(n) {
    for (var i = 0; i < CATS.length; i++) for (var j = 0; j < CATS[i][1].length; j++) if (n.indexOf(CATS[i][1][j]) > -1) return CATS[i][0];
    return 'עוד דברים';
  }
  var KN_KEY = 'bait-kniyot';
  function knLoad() {
    return load(KN_KEY, { items: [], always: ['חלב', 'לחם', 'ביצים', 'עגבניות', 'מלפפונים', 'גבינה לבנה', 'קוטג׳', 'בננות', 'נייר טואלט'], mode: 'home', budget: 100, kid: '' });
  }
  // מוסיף פריטים לרשימת הקניות (גם מהמתכנן של שבת). מחזיר כמה נוספו.
  function knAdd(st, name, qty) {
    name = String(name || '').trim(); if (!name) return 0;
    var ex = st.items.filter(function (i) { return i.n === name && !i.on; })[0];
    if (ex) { if (qty) ex.q = qty; return 0; }
    st.items.push({ id: uid(), n: name, q: qty || '', c: guessCat(name), on: 0, p: '' });
    return 1;
  }

  // ======================================================================
  // 1. רשימת קניות שבועית + משחק הקניות
  // ======================================================================
  (function kniyot() {
    var box = $('kn-list'); if (!box) return;
    var T = 'bait_kniyot';
    var st = knLoad();
    var CH = ['מצאו את אותו מוצר במחיר זול יותר', 'בדקו: כמה עולה 100 גרם? (כתוב קטן על המדף)', 'מצאו מוצר במבצע שבאמת צריך', 'מי מגיע ראשון למחלקת הירקות?', 'נחשו כמה יעלה הכול, ונבדוק בקופה', 'מצאו מוצר כחול-לבן (תוצרת הארץ)', 'בחרו פרי אחד חדש שעוד לא טעמנו', 'בדקו את התאריך על החלב, ובחרו את הארוך'];
    var chI = Math.floor(Math.random() * CH.length);
    function persist() { save(KN_KEY, st); }

    // קיבלנו רשימה בקישור?
    var inc = hashData();
    if (inc && inc.k) {
      var b = $('kn-import');
      b.hidden = false;
      $('kn-import-txt').textContent = 'קיבלת רשימה' + (inc.f ? ' מ' + inc.f : '') + ' עם ' + inc.k.length + ' פריטים.';
      $('kn-import-add').onclick = function () { inc.k.forEach(function (x) { knAdd(st, x[0], x[1]); }); persist(); b.hidden = true; clearHash(); draw(); toast('נוסף לרשימה שלך'); use(T, 'import'); };
      $('kn-import-rep').onclick = function () { st.items = []; inc.k.forEach(function (x) { knAdd(st, x[0], x[1]); }); persist(); b.hidden = true; clearHash(); draw(); toast('הרשימה הוחלפה'); use(T, 'import'); };
      $('kn-import-no').onclick = function () { b.hidden = true; clearHash(); };
    }

    function inList(n) { return st.items.some(function (i) { return i.n === n && !i.on; }); }
    function drawAlways() {
      $('kn-always').innerHTML = st.always.map(function (n) {
        return '<button type="button" class="chip' + (inList(n) ? ' on' : '') + '" data-al="' + esc(n) + '">' + (inList(n) ? '✓ ' : '+ ') + esc(n) + '</button>';
      }).join('') || '<span class="muted">עוד אין. מסמנים ☆ ליד פריט ברשימה, והוא נכנס לכאן.</span>';
    }
    function li(i, game) {
      var al = st.always.indexOf(i.n) > -1;
      return '<li class="' + (i.on ? 'done' : '') + '"><input type="checkbox" data-on="' + i.id + '"' + (i.on ? ' checked' : '') + ' aria-label="' + esc(i.n) + '">' +
        '<span class="nm" data-tap="' + i.id + '">' + esc(i.n) + (i.q ? '<small>' + esc(i.q) + '</small>' : '') + '</span>' +
        (game ? '<input class="pr" type="number" inputmode="decimal" min="0" step="0.1" placeholder="₪ מחיר" data-pr="' + i.id + '" value="' + esc(i.p) + '" aria-label="מחיר של ' + esc(i.n) + '">' :
          '<button type="button" class="star kn-edit-only' + (al ? ' on' : '') + '" data-star="' + i.id + '" aria-label="' + (al ? 'להוציא מהקבועים' : 'תמיד קונים') + '" title="תמיד קונים">' + (al ? '★' : '☆') + '</button>') +
        '<button type="button" class="x kn-edit-only" data-del="' + i.id + '" aria-label="למחוק">×</button></li>';
    }
    function draw() {
      var mode = st.mode, game = mode === 'game';
      document.body.classList.toggle('kn-shop', mode !== 'home');
      Array.prototype.forEach.call(document.querySelectorAll('[data-mode]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === mode ? 'true' : 'false'); });
      $('kn-game').hidden = !game;
      $('kn-home-only').hidden = mode !== 'home';
      drawAlways();
      if (!st.items.length) { box.innerHTML = '<p class="empty">הרשימה ריקה. כותבים למעלה, או לוחצים על מה שתמיד קונים.</p>'; meter(); return; }
      var groups = {};
      st.items.forEach(function (i) { var g = (mode !== 'home' && i.on) ? '__cart' : (i.c || 'עוד דברים'); (groups[g] = groups[g] || []).push(i); });
      var order = CAT_ORDER.concat(['__cart']);
      box.innerHTML = order.filter(function (g) { return groups[g]; }).map(function (g) {
        var list = groups[g];
        var name = g === '__cart' ? 'בעגלה ✓' : g;
        return '<div class="kn-cat">' + name + ' <small>' + list.length + '</small></div><ul class="kn-list">' + list.map(function (i) { return li(i, game); }).join('') + '</ul>';
      }).join('');
      meter();
    }
    function spent() { return st.items.reduce(function (s, i) { return s + (i.on ? num(i.p, 0) : 0); }, 0); }
    function meter() {
      var n = st.items.filter(function (i) { return i.on; }).length, all = st.items.length;
      var fill = $('kn-bar'), txt = $('kn-txt');
      if (st.mode === 'game') {
        var B = num(st.budget, 0), s = spent(), left = B - s;
        fill.style.width = (B ? Math.min(100, s / B * 100) : 0) + '%';
        fill.classList.toggle('over', left < 0);
        txt.textContent = left < 0 ? 'עברנו את התקציב ב-' + heCount(-left) + ' ₪. מה מחזירים למדף?' : 'נשאר ' + heCount(left) + ' ₪ מתוך ' + heCount(B) + ' · ' + n + '/' + all + ' בעגלה';
        var stars = $('kn-stars');
        if (all && n === all) {
          var k = left < 0 ? 0 : (left >= B * 0.1 ? 3 : (left >= B * 0.03 ? 2 : 1));
          stars.textContent = k ? '⭐'.repeat(k) + ' כל הכבוד' + (st.kid ? ', ' + st.kid : '') + '! נשאר ' + heCount(left) + ' ₪' : 'קרוב! בפעם הבאה נצליח';
          if (k) use(T, 'game_done');
        } else stars.textContent = '';
      } else {
        fill.classList.remove('over');
        fill.style.width = (all ? n / all * 100 : 0) + '%';
        txt.textContent = !all ? 'הרשימה ריקה' : (n === all ? 'הכול בעגלה ✓' : (st.mode === 'shop' ? n + ' מתוך ' + all + ' בעגלה' : all - n + ' פריטים לקנות'));
      }
      var left2 = st.items.filter(function (i) { return !i.on; });
      var link = location.origin + location.pathname + '#d=' + enc({ k: left2.map(function (i) { return i.q ? [i.n, i.q] : [i.n]; }) });
      var byCat = {};
      left2.forEach(function (i) { (byCat[i.c] = byCat[i.c] || []).push(i); });
      var body = CAT_ORDER.filter(function (c) { return byCat[c]; }).map(function (c) { return '*' + c + '*\n' + byCat[c].map(function (i) { return '▫️ ' + i.n + (i.q ? ' (' + i.q + ')' : ''); }).join('\n'); }).join('\n\n');
      $('kn-wa').href = wa(left2.length ? '🛒 רשימת קניות:\n\n' + body + '\n\nלסמן בטלפון בחנות:\n' + link : 'הכול נקנה ✓');
      $('kn-wa').onclick = function () { use(T, 'wa'); };
      $('kn-link').onclick = function () { copy(link); use(T, 'link'); };
    }
    function find(id) { return st.items.filter(function (i) { return i.id === id; })[0]; }
    $('kn-add').addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('kn-new'), q = $('kn-qty');
      String(n.value).split(/[,،\n]/).forEach(function (p) { knAdd(st, p, q.value.trim()); });
      n.value = ''; q.value = ''; n.focus(); persist(); draw(); use(T, 'add');
    });
    $('kn-always').addEventListener('click', function (e) {
      var b = e.target.closest('[data-al]'); if (!b) return;
      var n = b.getAttribute('data-al');
      if (inList(n)) st.items = st.items.filter(function (i) { return !(i.n === n && !i.on); }); else knAdd(st, n, '');
      persist(); draw(); use(T, 'always');
    });
    $('kn-all').onclick = function () { var c = 0; st.always.forEach(function (n) { c += knAdd(st, n, ''); }); persist(); draw(); toast(c ? 'נוספו ' + c + ' פריטים קבועים' : 'כל הקבועים כבר ברשימה'); use(T, 'always_all'); };
    box.addEventListener('change', function (e) {
      var id = e.target.getAttribute('data-on'), it;
      if (id && (it = find(id))) { it.on = e.target.checked ? 1 : 0; persist(); draw(); use(T, st.mode === 'game' ? 'game' : 'check'); }
    });
    box.addEventListener('input', function (e) {
      var id = e.target.getAttribute('data-pr'), it;
      if (id && (it = find(id))) { it.p = e.target.value; if (it.p !== '' && !it.on) { it.on = 1; persist(); draw(); var el = box.querySelector('[data-pr="' + id + '"]'); if (el) { el.focus(); var v = el.value; el.value = ''; el.value = v; } } else { persist(); meter(); } }
    });
    box.addEventListener('click', function (e) {
      var s = e.target.closest('[data-star]'), d = e.target.closest('[data-del]'), t = e.target.closest('[data-tap]'), it;
      if (s && (it = find(s.getAttribute('data-star')))) {
        var k = st.always.indexOf(it.n);
        if (k > -1) st.always.splice(k, 1); else { st.always.push(it.n); toast('"' + it.n + '" נכנס ל"תמיד קונים"'); }
        persist(); draw();
      } else if (d) { st.items = st.items.filter(function (i) { return i.id !== d.getAttribute('data-del'); }); persist(); draw(); }
      else if (t && (it = find(t.getAttribute('data-tap')))) { it.on = it.on ? 0 : 1; persist(); draw(); }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-mode]'), function (b) {
      b.addEventListener('click', function () { st.mode = b.getAttribute('data-mode'); persist(); draw(); use(T, 'mode_' + st.mode); window.scrollTo({ top: $('kn-modes').offsetTop - 70, behavior: 'smooth' }); });
    });
    $('kn-budget').value = st.budget; $('kn-kid').value = st.kid || '';
    $('kn-budget').addEventListener('input', function () { st.budget = num(this.value, 0); persist(); meter(); });
    $('kn-kid').addEventListener('input', function () { st.kid = this.value.trim(); persist(); });
    function ch() { $('kn-ch').textContent = '🎯 ' + CH[chI % CH.length]; }
    $('kn-ch-next').onclick = function () { chI++; ch(); };
    ch();
    $('kn-clear-done').onclick = function () { var c = st.items.filter(function (i) { return i.on; }).length; if (!c) { toast('אין עדיין מה שנקנה'); return; } st.items = st.items.filter(function (i) { return !i.on; }); persist(); draw(); toast('הוסרו ' + c + ' פריטים שנקנו'); };
    $('kn-clear-all').onclick = function () { if (!st.items.length || !confirm('למחוק את כל הרשימה? (הקבועים נשארים)')) return; st.items = []; persist(); draw(); };
    $('kn-prices-reset').onclick = function () { st.items.forEach(function (i) { i.p = ''; i.on = 0; }); persist(); draw(); };
    draw();
  })();

  // ======================================================================
  // 2. לוח תורנויות משפחתי
  // ======================================================================
  (function toranut() {
    var card = $('tr-card'); if (!card) return;
    var T = 'bait_toranut', KEY = 'bait-toranut';
    var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'], DS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
    var COL = ['#f6d7a7', '#bfe3c8', '#c9d8f5', '#f5c4c4', '#e3d0f2', '#f8e79c', '#c6ece9', '#f3cfe4'];
    function sunday(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; }
    function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function fromIso(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
    function dm(d) { return d.getDate() + '.' + (d.getMonth() + 1); }
    var st = load(KEY, null) || {
      fam: '', people: ['אבא', 'אמא', 'נועה', 'איתי'], days: [0, 1, 2, 3, 4, 5], start: iso(sunday(new Date())),
      chores: [{ id: uid(), n: 'שטיפת כלים', f: 'd', w: '' }, { id: uid(), n: 'הוצאת הזבל', f: 'd', w: '' }, { id: uid(), n: 'עריכת שולחן', f: 'd', w: '' },
        { id: uid(), n: 'איסוף מהגן', f: 'd', w: 'אמא' }, { id: uid(), n: 'סידור לשבת', f: 'w', w: '' }, { id: uid(), n: 'השקיית עציצים', f: 'w', w: '' }]
    };
    var view = 0;
    function persist() { save(KEY, st); }
    function weekIdx(off) { return Math.round((sunday(new Date()).getTime() + off * 7 * 864e5 - fromIso(st.start).getTime()) / (7 * 864e5)); }
    function rot(ppl) { return st.people.filter(function (p) { return p.trim(); }); }
    // מי עושה את המטלה ci ביום di (מיקום בתוך הימים הפעילים) בשבוע wk
    function who(c, ci, wk, di) {
      if (c.w) return c.w;
      var P = rot(); if (!P.length) return '';
      var D = st.days.length || 1;
      var k = c.f === 'w' ? wk + ci : wk * D + di + ci;
      return P[((k % P.length) + P.length) % P.length];
    }
    function pcol(n) { var i = st.people.indexOf(n); return i < 0 ? '#eee' : COL[i % COL.length]; }
    function pn(n) { return n ? '<span class="pn" style="background:' + pcol(n) + '">' + esc(n) + '</span>' : '<span style="color:#aaa">—</span>'; }
    function weekText(wk, sun) {
      var days = st.days.slice().sort();
      return st.chores.filter(function (c) { return c.n.trim(); }).map(function (c, ci) {
        if (c.f === 'w') return '▫️ ' + c.n + ' (השבוע): ' + who(c, ci, wk, 0);
        return '*' + c.n + '*\n' + days.map(function (d, di) { return DS[d] + ' ' + who(c, ci, wk, di); }).join(' · ');
      }).join('\n');
    }
    function draw() {
      var wk = weekIdx(view), sun = sunday(new Date()); sun.setDate(sun.getDate() + view * 7);
      var end = new Date(sun); end.setDate(end.getDate() + 6);
      var days = st.days.slice().sort(), today = new Date(), tdi = view === 0 ? days.indexOf(today.getDay()) : -1;
      var chores = st.chores.filter(function (c) { return c.n.trim(); });
      $('tr-week').textContent = view === 0 ? 'השבוע' : (view === 1 ? 'שבוע הבא' : (view === -1 ? 'שבוע שעבר' : (view > 0 ? 'בעוד ' + view + ' שבועות' : 'לפני ' + (-view) + ' שבועות')));
      var head = '<tr><th>מטלה</th>' + days.map(function (d, di) { return '<th' + (di === tdi ? ' class="today"' : '') + '>' + DS[d] + '<br><small style="font-weight:400">' + (function () { var x = new Date(sun); x.setDate(x.getDate() + d); return dm(x); })() + '</small></th>'; }).join('') + '</tr>';
      var rows = chores.map(function (c) {
        var ci = st.chores.indexOf(c);
        if (c.f === 'w') return '<tr><td class="ch">' + esc(c.n) + '</td><td colspan="' + days.length + '">כל השבוע: ' + pn(who(c, ci, wk, 0)) + '</td></tr>';
        return '<tr><td class="ch">' + esc(c.n) + '</td>' + days.map(function (d, di) { return '<td' + (di === tdi ? ' class="today"' : '') + '>' + pn(who(c, ci, wk, di)) + '</td>'; }).join('') + '</tr>';
      }).join('');
      card.innerHTML = '<h3>' + esc(st.fam ? 'התורנויות של ' + st.fam : 'לוח התורנויות שלנו') + '</h3><p class="sub2">שבוע ' + dm(sun) + '–' + dm(end) + '</p>' +
        (chores.length && rot().length ? '<table>' + head + rows + '</table>' : '<p class="sub2">מוסיפים בני משפחה ומטלות למטה, והלוח נבנה לבד.</p>') +
        '<div class="legend">' + rot().map(pn).join('') + '</div><p class="ft">כל שבוע הסבב זז באחד, כדי שיהיה הוגן<br><span dir="ltr">gilad-rachamim.github.io/bait</span></p>';
      // היום
      var td = $('tr-today');
      if (view === 0 && tdi > -1 && chores.length) {
        td.innerHTML = chores.map(function (c) { var ci = st.chores.indexOf(c); return '<div><span>' + esc(c.n) + (c.f === 'w' ? ' <small class="muted">(השבוע)</small>' : '') + '</span><b>' + esc(who(c, ci, wk, tdi) || '—') + '</b></div>'; }).join('');
      } else td.innerHTML = '<p class="muted">' + (view === 0 ? 'היום אין תורנויות בלוח. ' : '') + 'בלוח למטה רואים את כל השבוע.</p>';
      var link = location.origin + location.pathname;
      var todayTxt = tdi > -1 ? chores.map(function (c) { var ci = st.chores.indexOf(c); return '▫️ ' + c.n + ': ' + who(c, ci, wk, tdi); }).join('\n') : '';
      $('tr-wa-today').href = wa('🧹 מי עושה מה היום (' + DAYS[today.getDay()] + '):\n\n' + (todayTxt || 'היום חופש מתורנויות 🙂') + '\n\n' + link);
      $('tr-wa-week').href = wa('🧹 לוח התורנויות, שבוע ' + dm(sun) + '–' + dm(end) + ':\n\n' + weekText(wk, sun) + '\n\n' + link);
    }
    function drawEdit() {
      $('tr-fam').value = st.fam;
      $('tr-people').innerHTML = st.people.map(function (p, i) {
        return '<div class="row"><span class="no-flex" style="width:1.3rem;height:1.3rem;border-radius:50%;background:' + COL[i % COL.length] + '"></span><input type="text" maxlength="20" value="' + esc(p) + '" data-p="' + i + '" aria-label="שם"><button type="button" class="x no-flex" data-pdel="' + i + '" aria-label="להסיר">×</button></div>';
      }).join('');
      var opts = function (w) { return '<option value="">בסבב</option>' + rot().map(function (p) { return '<option' + (p === w ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join(''); };
      $('tr-chores').innerHTML = st.chores.map(function (c, i) {
        return '<div class="box" style="margin-top:.5rem;padding:.7rem"><div class="row"><input type="text" maxlength="30" value="' + esc(c.n) + '" data-cn="' + i + '" aria-label="מטלה"><button type="button" class="x no-flex" data-cdel="' + i + '" aria-label="להסיר">×</button></div>' +
          '<div class="row" style="margin-top:.4rem"><select data-cf="' + i + '" aria-label="כל כמה זמן"><option value="d"' + (c.f === 'd' ? ' selected' : '') + '>כל יום</option><option value="w"' + (c.f === 'w' ? ' selected' : '') + '>פעם בשבוע</option></select>' +
          '<select data-cw="' + i + '" aria-label="מי">' + opts(c.w) + '</select></div></div>';
      }).join('');
      $('tr-days').innerHTML = DAYS.map(function (d, i) { return '<button type="button" class="chip' + (st.days.indexOf(i) > -1 ? ' on' : '') + '" data-day="' + i + '">' + d + '</button>'; }).join('');
    }
    var ed = $('tr-edit');
    ed.addEventListener('input', function (e) {
      var t = e.target, a;
      if (t.id === 'tr-fam') st.fam = t.value.trim();
      else if ((a = t.getAttribute('data-p')) != null) {
        var old = st.people[+a]; st.people[+a] = t.value;
        st.chores.forEach(function (c) { if (c.w && c.w === old) c.w = t.value; });
      } else if ((a = t.getAttribute('data-cn')) != null) st.chores[+a].n = t.value;
      else return;
      persist(); draw(); use(T, 'edit');
    });
    ed.addEventListener('change', function (e) {
      var t = e.target, a;
      if ((a = t.getAttribute('data-cf')) != null) st.chores[+a].f = t.value;
      else if ((a = t.getAttribute('data-cw')) != null) st.chores[+a].w = t.value;
      else if (t.getAttribute('data-p') != null) { drawEdit(); return; }
      else return;
      persist(); draw();
    });
    ed.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return; var a;
      if ((a = t.getAttribute('data-pdel')) != null) { var gone = st.people.splice(+a, 1)[0]; st.chores.forEach(function (c) { if (c.w === gone) c.w = ''; }); }
      else if ((a = t.getAttribute('data-cdel')) != null) st.chores.splice(+a, 1);
      else if ((a = t.getAttribute('data-day')) != null) { a = +a; var k = st.days.indexOf(a); if (k > -1) { if (st.days.length > 1) st.days.splice(k, 1); } else st.days.push(a); }
      else if (t.id === 'tr-padd') { st.people.push(''); persist(); drawEdit(); draw(); var ins = $('tr-people').querySelectorAll('input'); ins[ins.length - 1].focus(); return; }
      else if (t.id === 'tr-cadd') { st.chores.push({ id: uid(), n: '', f: 'd', w: '' }); persist(); drawEdit(); draw(); var cs = $('tr-chores').querySelectorAll('[data-cn]'); cs[cs.length - 1].focus(); return; }
      else return;
      persist(); drawEdit(); draw(); use(T, 'edit');
    });
    $('tr-prev').onclick = function () { view--; draw(); };
    $('tr-next').onclick = function () { view++; draw(); };
    $('tr-print').onclick = function () { use(T, 'print'); window.print(); };
    $('tr-img').onclick = function () { toImage(card, 'toranut.png', T); };
    $('tr-wa-today').addEventListener('click', function () { use(T, 'wa_today'); });
    $('tr-wa-week').addEventListener('click', function () { use(T, 'wa_week'); });
    $('tr-shift').onclick = function () { var d = fromIso(st.start); d.setDate(d.getDate() - 7); st.start = iso(d); persist(); draw(); toast('הסבב זז באחד'); };
    drawEdit(); draw();
  })();

  // ======================================================================
  // 3. מתכנן שבת ואורחים
  // ======================================================================
  (function shabat() {
    var root = $('sh-root'); if (!root) return;
    var T = 'bait_shabat', KEY = 'bait-shabat';
    var MEALS = [['fri', 'ליל שבת'], ['lunch', 'סעודת שבת בצהריים'], ['s3', 'סעודה שלישית']];
    var WHEN = { wed: 'רביעי: קונים', thu: 'חמישי: מכינים מראש', fri: 'שישי בבוקר', pre: 'שישי לפני שבת' };
    // כל מנה: [שם פריט, כמות לסועד, יחידה, עיגול] · כמות לסועד מוכפלת במספר הסועדים (ילד = 0.6)
    var D = {
      challot: { n: 'חלות', s: [['חלות', 0.25, 'יח׳', 1, 2]], w: 'fri', t: 'קונים או אופים חלות' },
      wine: { n: 'יין / מיץ ענבים לקידוש', s: [['יין או מיץ ענבים', 0.12, 'בקבוקים', 1, 1]], w: 'wed' },
      fish: { n: 'דג לפתיחה', s: [['פילה סלמון או דג', 0.12, 'ק״ג', 0.1]], w: 'thu', t: 'מכינים את הדג' },
      salads: { n: 'סלטים', s: [['עגבניות', 0.1, 'ק״ג', 0.1], ['מלפפונים', 0.1, 'ק״ג', 0.1], ['חסה', 0.1, 'ראשים', 1], ['חומוס / טחינה / מטבוחה', 0.15, 'קופסאות', 1]], w: 'fri', t: 'חותכים סלטים' },
      soup: { n: 'מרק עוף', s: [['עוף למרק (גב / כנפיים)', 0.12, 'ק״ג', 0.1], ['גזר', 0.07, 'ק״ג', 0.1], ['קישואים', 0.06, 'ק״ג', 0.1], ['שקדי מרק', 0.08, 'שקיות', 1]], w: 'thu', t: 'מבשלים מרק' },
      chicken: { n: 'עוף בתנור', s: [['עוף (כרעיים / שוקיים)', 0.3, 'ק״ג', 0.1]], w: 'fri', t: 'מכניסים עוף לתנור' },
      meat: { n: 'בשר / צלי', s: [['בשר לצלי', 0.22, 'ק״ג', 0.1]], w: 'thu', t: 'מבשלים את הצלי' },
      rice: { n: 'אורז', s: [['אורז', 0.08, 'ק״ג', 0.1]], w: 'pre', t: 'מבשלים אורז' },
      potato: { n: 'תפוחי אדמה בתנור', s: [['תפוחי אדמה', 0.25, 'ק״ג', 0.1]], w: 'fri', t: 'תפוחי אדמה לתנור' },
      kugel: { n: 'קוגל', s: [['אטריות דקות לקוגל', 0.1, 'חבילות', 1], ['ביצים', 0.3, 'יח׳', 1]], w: 'thu', t: 'אופים קוגל' },
      chamin: { n: 'חמין', s: [['בשר לחמין', 0.18, 'ק״ג', 0.1], ['תפוחי אדמה לחמין', 0.2, 'ק״ג', 0.1], ['חיטה / שעועית', 0.05, 'ק״ג', 0.1], ['ביצים לחמין', 1, 'יח׳', 1]], w: 'pre', t: 'מעלים את החמין לפלטה' },
      dessert: { n: 'קינוח', s: [['פירות', 0.15, 'ק״ג', 0.1], ['עוגה או קינוח', 0.1, 'יח׳', 1]], w: 'thu', t: 'מכינים קינוח' },
      cake: { n: 'עוגה וקפה', s: [['עוגה', 0.1, 'יח׳', 1], ['קפה ותה', 0.05, 'חבילות', 1]], w: 'thu' },
      cheese: { n: 'גבינות וממרחים', s: [['גבינות', 0.08, 'ק״ג', 0.1], ['ממרחים', 0.15, 'קופסאות', 1]], w: 'wed' },
      drinks: { n: 'שתייה קלה', s: [['שתייה (בקבוקים של 1.5 ליטר)', 0.3, 'בקבוקים', 1]], w: 'wed' },
      dispo: { n: 'כלים חד-פעמיים', s: [['צלחות חד-פעמיות', 1.2, 'יח׳', 10], ['כוסות חד-פעמיות', 1.5, 'יח׳', 10]], w: 'wed' }
    };
    var MD = {
      fri: ['challot', 'wine', 'fish', 'salads', 'soup', 'chicken', 'rice', 'potato', 'meat', 'dessert', 'drinks', 'dispo'],
      lunch: ['challot', 'wine', 'salads', 'chamin', 'kugel', 'meat', 'chicken', 'dessert', 'drinks', 'dispo'],
      s3: ['challot', 'salads', 'fish', 'cheese', 'cake', 'drinks', 'dispo']
    };
    var DEF = { fri: ['challot', 'wine', 'fish', 'salads', 'soup', 'chicken', 'rice', 'dessert', 'drinks'], lunch: ['challot', 'wine', 'salads', 'chamin', 'kugel', 'dessert', 'drinks'], s3: ['challot', 'salads', 'cake'] };
    var st = load(KEY, null);
    if (!st) { st = { a: 6, k: 3, m: { fri: 1, lunch: 1, s3: 0 }, sel: {}, mine: [] }; Object.keys(DEF).forEach(function (m) { DEF[m].forEach(function (d) { st.sel[m + ':' + d] = 1; }); }); }
    function persist() { save(KEY, st); }
    function P() { return Math.max(0, num(st.a, 0)) + Math.max(0, num(st.k, 0)) * 0.6; }
    function rnd(v, r) { return r >= 1 ? Math.ceil(v / r - 1e-9) * r : Math.ceil(v / r - 1e-9) * r; }
    function fmt(v, u) { v = Math.round(v * 100) / 100; if (u === 'ק״ג' && v < 1) return Math.round(v * 1000 / 50) * 50 + ' גרם'; v = Math.round(v * 10) / 10; var one = { 'שקיות': 'שקית אחת', 'חבילות': 'חבילה אחת', 'בקבוקים': 'בקבוק אחד', 'קופסאות': 'קופסה אחת', 'ראשים': 'ראש אחד' }; return v === 1 && one[u] ? one[u] : v + ' ' + u; }
    function selected() {
      var out = [];
      MEALS.forEach(function (m) { if (!st.m[m[0]]) return; MD[m[0]].forEach(function (d) { if (st.sel[m[0] + ':' + d]) out.push([m[0], d]); }); });
      return out;
    }
    function shopping() {
      var p = P(), agg = {}, order = [];
      selected().forEach(function (x) {
        D[x[1]].s.forEach(function (s) {
          var k = s[0] + '|' + s[2];
          if (!agg[k]) { agg[k] = { n: s[0], u: s[2], v: 0, r: s[3] }; order.push(k); }
          agg[k].v += Math.max(s[4] || 0, p * s[1]);
        });
      });
      return order.map(function (k) { var a = agg[k]; return { n: a.n, q: fmt(rnd(a.v, a.r), a.u) }; });
    }
    function drawMeals() {
      $('sh-meals').innerHTML = MEALS.map(function (m) {
        var on = !!st.m[m[0]];
        return '<div class="sh-meal' + (on ? '' : ' off') + '"><label><input type="checkbox" data-meal="' + m[0] + '"' + (on ? ' checked' : '') + '> ' + m[1] + '</label><div class="chips">' +
          MD[m[0]].map(function (d) { var s = st.sel[m[0] + ':' + d]; return '<button type="button" class="chip' + (s ? ' on' : '') + '" data-dish="' + m[0] + ':' + d + '">' + (s ? '✓ ' : '') + D[d].n + '</button>'; }).join('') +
          st.mine.filter(function (x) { return x.m === m[0]; }).map(function (x) { return '<span class="chip on">✓ ' + esc(x.n) + ' <button type="button" class="x" style="font-size:1rem;padding:0 .2rem" data-mdel="' + x.id + '" aria-label="להסיר">×</button></span>'; }).join('') +
          '<button type="button" class="chip add" data-madd="' + m[0] + '">+ מנה משלי</button></div></div>';
      }).join('');
    }
    function draw() {
      var p = P(), sel = selected(), people = Math.round(num(st.a, 0) + num(st.k, 0));
      $('sh-sum').textContent = people ? people + ' סועדים (' + num(st.a, 0) + ' מבוגרים, ' + num(st.k, 0) + ' ילדים) · ' + MEALS.filter(function (m) { return st.m[m[0]]; }).length + ' סעודות' : 'כמה אנשים יהיו?';
      var sh = shopping();
      $('sh-shop').innerHTML = sh.length ? sh.map(function (x) { return '<li><span>' + esc(x.n) + '</span><b>' + esc(x.q) + '</b></li>'; }).join('') : '<li class="muted">בוחרים מנות למעלה</li>';
      // מה מכינים ומתי
      var by = { wed: [], thu: [], fri: [], pre: [] }, seen = {};
      by.wed.push('קונים הכול (הרשימה למעלה), ובודקים שיש ' + people + ' כיסאות וצלחות');
      sel.forEach(function (x) { var d = D[x[1]]; if (d.t && !seen[x[1]]) { seen[x[1]] = 1; by[d.w].push(d.t); } });
      st.mine.forEach(function (x) { if (st.m[x.m]) by[x.w || 'thu'].push(x.n); });
      if (st.m.lunch && !seen.chamin) by.pre.push('מחממים אוכל לצהריים על הפלטה');
      by.pre.push('מדליקים פלטה ומיחם', 'עורכים שולחן', 'נרות שבת');
      $('sh-time').innerHTML = Object.keys(WHEN).map(function (w) { return by[w].length ? '<h3>' + WHEN[w] + '</h3><ul class="sh-out">' + by[w].map(function (t) { return '<li><span>▫️ ' + esc(t) + '</span></li>'; }).join('') + '</ul>' : ''; }).join('');
      var dishes = []; sel.forEach(function (x) { var n = D[x[1]].n; if (dishes.indexOf(n) < 0) dishes.push(n); }); st.mine.forEach(function (x) { if (st.m[x.m] && dishes.indexOf(x.n) < 0) dishes.push(x.n); });
      var txt = '🕯️ תכנון שבת · ' + $('sh-sum').textContent + '\n\n' + MEALS.filter(function (m) { return st.m[m[0]]; }).map(function (m) {
        var ds = MD[m[0]].filter(function (d) { return st.sel[m[0] + ':' + d]; }).map(function (d) { return D[d].n; }).concat(st.mine.filter(function (x) { return x.m === m[0]; }).map(function (x) { return x.n; }));
        return '*' + m[1] + '*: ' + ds.join(', ');
      }).join('\n') + '\n\n*לקנות:*\n' + sh.map(function (x) { return '▫️ ' + x.n + ' – ' + x.q; }).join('\n') + '\n\n' + location.origin + location.pathname;
      $('sh-wa').href = wa(txt);
      $('sh-mevi').href = '/bait/mevi/#d=' + enc({ t: 'שבת אצלנו', w: '', i: dishes.map(function (n) { return [n, '']; }) });
    }
    $('sh-a').value = st.a; $('sh-k').value = st.k;
    $('sh-a').addEventListener('input', function () { st.a = Math.max(0, num(this.value, 0)); persist(); draw(); use(T, 'guests'); });
    $('sh-k').addEventListener('input', function () { st.k = Math.max(0, num(this.value, 0)); persist(); draw(); use(T, 'guests'); });
    root.addEventListener('change', function (e) { var m = e.target.getAttribute('data-meal'); if (m) { st.m[m] = e.target.checked ? 1 : 0; persist(); drawMeals(); draw(); } });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var a;
      if ((a = b.getAttribute('data-dish'))) { if (st.sel[a]) delete st.sel[a]; else st.sel[a] = 1; use(T, 'dish'); }
      else if ((a = b.getAttribute('data-mdel'))) st.mine = st.mine.filter(function (x) { return x.id !== a; });
      else if ((a = b.getAttribute('data-madd'))) {
        var n = (prompt('איזו מנה? (למשל: פשטידה, מלאווח)') || '').trim(); if (!n) return;
        var w = prompt('מתי מכינים? 1 = חמישי, 2 = שישי בבוקר, 3 = לפני שבת', '1');
        st.mine.push({ id: uid(), m: a, n: n.slice(0, 40), w: w === '2' ? 'fri' : (w === '3' ? 'pre' : 'thu') });
      } else return;
      persist(); drawMeals(); draw();
    });
    $('sh-to-kn').onclick = function () {
      var kn = knLoad(), c = 0;
      shopping().forEach(function (x) { c += knAdd(kn, x.n, x.q); });
      save(KN_KEY, kn); use(T, 'to_kniyot');
      $('sh-done').hidden = false; $('sh-done-txt').textContent = c ? 'נוספו ' + c + ' פריטים לרשימת הקניות.' : 'הכול כבר היה ברשימת הקניות (עדכנתי כמויות).';
    };
    $('sh-print').onclick = function () { use(T, 'print'); window.print(); };
    $('sh-wa').addEventListener('click', function () { use(T, 'wa'); });
    $('sh-mevi').addEventListener('click', function () { use(T, 'to_mevi'); });
    $('sh-reset').onclick = function () { if (!confirm('לחזור לתכנון ברירת המחדל?')) return; localStorage.removeItem(KEY); location.reload(); };
    drawMeals(); draw();
  })();

  // ======================================================================
  // 4. מי מביא מה – בלי שרת: כל המצב בתוך הקישור, וכל עדכון = הודעת ווטסאפ חדשה
  // ======================================================================
  (function mevi() {
    var root = $('mv-root'); if (!root) return;
    var T = 'bait_mevi', ME = 'bait-mevi-me', LAST = 'bait-mevi-last';
    var TPL = {
      'על האש': ['פחמים ומדליק', 'בשר ונקניקיות', 'עוף / פרגיות', 'לחמניות ופיתות', 'סלטים', 'רטבים (טחינה, קטשופ)', 'שתייה', 'אבטיח / פירות', 'כלים חד-פעמיים', 'שקיות זבל', 'מנגל'],
      'שבת משפחתית': ['חלות', 'יין לקידוש', 'סלטים', 'דג', 'מרק', 'עוף', 'תוספת', 'קוגל', 'קינוח', 'שתייה'],
      'מסיבת כיתה': ['שתייה', 'חטיפים', 'עוגה', 'פירות חתוכים', 'פיצות', 'כלים חד-פעמיים', 'מפות שולחן', 'בלונים וקישוטים', 'מוזיקה ורמקול'],
      'פיקניק': ['שמיכה / מחצלת', 'כריכים', 'ירקות חתוכים', 'פירות', 'שתייה וקרח', 'עוגיות', 'כלים חד-פעמיים', 'משחקים (כדור, פריזבי)', 'שקיות זבל'],
      'יום הולדת': ['עוגה ונרות', 'שתייה', 'חטיפים', 'פיצות / כריכים', 'כלים חד-פעמיים', 'קישוטים ובלונים', 'שקיות הפתעה', 'מוזיקה']
    };
    var st = hashData(), fromLink = !!st;
    if (!st) st = load(LAST, null);
    var editing = !st || !st.i || !st.i.length;
    if (!st || !st.i) st = { t: '', w: '', i: [] };
    var me = load(ME, '');
    function persist() {
      save(LAST, st);
      try { history.replaceState(null, '', location.pathname + '#d=' + enc(st)); } catch (e) {}
    }
    function link() { return location.origin + location.pathname + '#d=' + enc(st); }
    function msg() {
      var free = st.i.filter(function (x) { return !x[1]; }).length;
      return '🎉 *' + (st.t || 'מי מביא מה') + '*' + (st.w ? '\n' + st.w : '') + '\n\nמי מביא מה:\n' +
        st.i.map(function (x) { return (x[1] ? '✅ ' : '⬜ ') + x[0] + ' – ' + (x[1] || 'פנוי'); }).join('\n') +
        '\n\n' + (free ? 'עוד פנוי: ' + free + ' מתוך ' + st.i.length : 'הכול מסודר, תודה לכולם! 🙏') +
        '\n\nלהירשם (נפתח בטלפון, בלי הרשמה). חשוב: תמיד מהקישור בהודעה האחרונה:\n' + link();
    }
    function draw() {
      $('mv-edit').hidden = !editing; $('mv-view').hidden = editing;
      if (editing) {
        $('mv-t').value = st.t; $('mv-w').value = st.w;
        $('mv-items').innerHTML = st.i.map(function (x, k) { return '<li><span class="nm">' + esc(x[0]) + (x[1] ? '<span class="who">' + esc(x[1]) + '</span>' : '') + '</span><button type="button" class="x" data-rm="' + k + '" aria-label="להסיר">×</button></li>'; }).join('') || '<li class="muted" style="display:block">עוד אין פריטים. בוחרים תבנית או כותבים למטה.</li>';
        $('mv-tpl').innerHTML = Object.keys(TPL).map(function (k) { return '<button type="button" class="chip" data-tpl="' + esc(k) + '">' + esc(k) + '</button>'; }).join('');
        return;
      }
      $('mv-title').textContent = st.t || 'מי מביא מה';
      $('mv-when').textContent = st.w || '';
      $('mv-me').value = me;
      var free = st.i.filter(function (x) { return !x[1]; }).length;
      $('mv-count').textContent = free ? 'עוד פנוי: ' + free + ' מתוך ' + st.i.length : 'הכול מסודר ✓';
      $('mv-list').innerHTML = st.i.map(function (x, k) {
        var mine = me && x[1] === me;
        return '<li class="' + (x[1] ? 'taken' : '') + (mine ? ' mine' : '') + '"><span class="nm">' + esc(x[0]) + (x[1] ? '<span class="who">✅ ' + esc(x[1]) + '</span>' : '<span class="free">פנוי</span>') + '</span>' +
          (mine ? '<button type="button" class="btn btn-line btn-sm" data-un="' + k + '">לבטל</button>' : (x[1] ? '' : '<button type="button" class="btn btn-gold btn-sm" data-take="' + k + '">אני מביא/ה</button>')) + '</li>';
      }).join('');
      $('mv-wa').href = wa(msg());
    }
    function needMe() {
      me = ($('mv-me').value || '').trim();
      if (!me) { toast('קודם כותבים את השם שלך למעלה'); $('mv-me').focus(); return false; }
      save(ME, me); return true;
    }
    function changed(t) { persist(); draw(); $('mv-nudge').hidden = false; toast(t + ' עכשיו לשלוח עדכון לקבוצה ↓'); }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var a;
      if ((a = b.getAttribute('data-take')) != null) { if (!needMe()) return; st.i[+a][1] = me; use(T, 'take'); changed('נרשמת.'); }
      else if ((a = b.getAttribute('data-un')) != null) { st.i[+a][1] = ''; use(T, 'untake'); changed('ביטלת.'); }
      else if ((a = b.getAttribute('data-rm')) != null) { st.i.splice(+a, 1); persist(); draw(); }
      else if ((a = b.getAttribute('data-tpl'))) {
        TPL[a].forEach(function (n) { if (!st.i.some(function (x) { return x[0] === n; })) st.i.push([n, '']); });
        if (!st.t) st.t = a; persist(); draw(); use(T, 'template');
      }
    });
    $('mv-add').addEventListener('submit', function (e) {
      e.preventDefault(); var v = $('mv-new').value.trim(); if (!v) return;
      v.split(/[,،\n]/).forEach(function (n) { n = n.trim(); if (n) st.i.push([n.slice(0, 50), '']); });
      $('mv-new').value = ''; $('mv-new').focus(); persist(); draw();
    });
    $('mv-t').addEventListener('input', function () { st.t = this.value.slice(0, 60); persist(); });
    $('mv-w').addEventListener('input', function () { st.w = this.value.slice(0, 80); persist(); });
    $('mv-go').onclick = function () {
      if (!st.i.length) { toast('מוסיפים לפחות פריט אחד'); return; }
      editing = false; persist(); draw(); use(T, 'create'); $('mv-nudge').hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    $('mv-mine').addEventListener('submit', function (e) {
      e.preventDefault(); var v = $('mv-mine-n').value.trim(); if (!v || !needMe()) return;
      st.i.push([v.slice(0, 50), me]); $('mv-mine-n').value = ''; use(T, 'add_mine'); changed('נוסף.');
    });
    $('mv-me').addEventListener('change', function () { me = this.value.trim(); save(ME, me); draw(); });
    $('mv-wa').addEventListener('click', function () { use(T, 'wa'); $('mv-nudge').hidden = true; });
    $('mv-copy').onclick = function () { copy(link()); use(T, 'link'); };
    $('mv-editbtn').onclick = function () { editing = true; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    $('mv-newev').onclick = function () { if (!confirm('להתחיל אירוע חדש? (הישן נשאר בקישור שכבר נשלח)')) return; st = { t: '', w: '', i: [] }; editing = true; clearHash(); save(LAST, null); draw(); };
    if (fromLink) use(T, 'open_link');
    draw();
  })();
})();
