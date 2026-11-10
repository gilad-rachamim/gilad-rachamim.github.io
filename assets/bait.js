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
  // סנכרון בין ההורים: כל ההגדרות בתוך הקישור (#d=), ומי שפותח מקבל שאלה אם לייבא
  function partnerSync(o) {
    var inc = hashData();
    if (inc && inc.sync === o.kind && inc.s) {
      var b = document.createElement('div'); b.className = 'mv-banner no-print'; b.setAttribute('role', 'status');
      b.innerHTML = '<p>' + esc(o.ask) + '</p><div class="tools" style="margin-top:.6rem"><button class="btn btn-gold btn-sm" type="button" data-y>לייבא (במקום מה שיש כאן)</button><button class="btn btn-line btn-sm" type="button" data-n>לא עכשיו</button></div>';
      o.at.parentNode.insertBefore(b, o.at);
      b.querySelector('[data-y]').onclick = function () { o.set(inc.s); b.parentNode.removeChild(b); clearHash(); toast('עודכן ✓ עכשיו זה אותו דבר בשני הטלפונים'); use(o.T, 'sync_import'); };
      b.querySelector('[data-n]').onclick = function () { b.parentNode.removeChild(b); clearHash(); };
    }
    function link() { return location.origin + location.pathname + '#d=' + enc({ sync: o.kind, s: o.get() }); }
    var w = $(o.id + '-sync-wa'), c = $(o.id + '-sync-copy');
    if (w) w.addEventListener('click', function () { w.href = wa(o.msg + '\n' + link()); use(o.T, 'sync_send'); });
    if (c) c.onclick = function () { copy(link()); use(o.T, 'sync_copy'); };
  }
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
        '<div class="legend">' + rot().map(pn).join('') + '</div><p class="ft">כל שבוע הסבב זז באחד, כדי שיהיה הוגן<br><span dir="ltr">hakelim.com/bait</span></p>';
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
    partnerSync({ kind: 'toranut', id: 'tr', T: T, at: $('tr-today'),
      ask: 'קיבלת לוח תורנויות מבן או בת הזוג. לייבא אותו לטלפון הזה? הלוח שיש כאן עכשיו יוחלף בו.',
      msg: '🧹 זה לוח התורנויות שלנו. פותחים את הקישור ולוחצים "לייבא", ואז יש לשנינו את אותו לוח:',
      get: function () { return { fam: st.fam, people: st.people, days: st.days, start: st.start, chores: st.chores }; },
      set: function (s) { if (!s || !s.people || !s.chores) return; st = { fam: s.fam || '', people: s.people, days: s.days && s.days.length ? s.days : [0, 1, 2, 3, 4, 5], start: s.start || st.start, chores: s.chores }; persist(); drawEdit(); draw(); } });
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
  // ======================================================================
  // 5. המסמכים של הבית – מה פג מתי, ותזכורת ליומן
  // ======================================================================
  (function mismachim() {
    var box = $('ms-list'); if (!box) return;
    var T = 'bait_mismachim', KEY = 'bait-mismachim';
    var st = load(KEY, { docs: [] });
    var editId = null;
    function persist() { save(KEY, st); }
    function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
    function pd(s) { var p = String(s || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
    function days(s) { var d = pd(s); return d ? Math.round((d - today()) / 864e5) : null; }
    function he(s) { var d = pd(s); return d ? d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() : ''; }
    function ymd(d) { return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
    function status(x) {
      var n = days(x.exp);
      if (n == null) return ['ok', 'בלי תאריך'];
      if (n < 0) return ['bad', 'פג לפני ' + (-n) + ' ימים'];
      if (n === 0) return ['bad', 'פג היום'];
      if (n <= 30) return ['warn', 'עוד ' + n + ' ימים'];
      if (n <= 90) return ['soon', 'עוד ' + Math.round(n / 7) + ' שבועות'];
      return ['ok', n > 365 ? 'עוד ' + (Math.round(n / 36.5) / 10) + ' שנים' : 'עוד ' + Math.round(n / 30) + ' חודשים'];
    }
    function remindDate(x) { var d = pd(x.exp); if (!d) return null; d.setDate(d.getDate() - 30); return d < today() ? today() : d; }
    function gcal(x) {
      var d = remindDate(x); if (!d) return '#';
      var e = new Date(d); e.setDate(e.getDate() + 1);
      return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('לחדש: ' + x.n + (x.who ? ' (' + x.who + ')' : '')) +
        '&dates=' + ymd(d) + '/' + ymd(e) + '&details=' + encodeURIComponent('בתוקף עד ' + he(x.exp) + (x.where ? '\nאיפה זה נמצא: ' + x.where : '') + '\n\nמהכלי "המסמכים של הבית": ' + location.origin + location.pathname);
    }
    function ics(x) {
      var d = remindDate(x); if (!d) return;
      var e = new Date(d); e.setDate(e.getDate() + 1);
      var body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//gilad-rachamim//bait//HE', 'BEGIN:VEVENT', 'UID:' + x.id + '@hakelim.com', 'DTSTAMP:' + ymd(new Date()) + 'T000000Z',
        'DTSTART;VALUE=DATE:' + ymd(d), 'DTEND;VALUE=DATE:' + ymd(e), 'SUMMARY:לחדש: ' + x.n + (x.who ? ' (' + x.who + ')' : ''), 'DESCRIPTION:בתוקף עד ' + he(x.exp),
        'BEGIN:VALARM', 'TRIGGER:PT9H', 'ACTION:DISPLAY', 'DESCRIPTION:תזכורת', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' })); a.download = 'tizkoret.ics'; document.body.appendChild(a); a.click(); a.remove();
    }
    function sorted() { return st.docs.slice().sort(function (a, b) { var x = days(a.exp), y = days(b.exp); return (x == null ? 1e9 : x) - (y == null ? 1e9 : y); }); }
    function draw() {
      var list = sorted();
      var soon = list.filter(function (x) { var n = days(x.exp); return n != null && n <= 90; }).length;
      $('ms-sum').textContent = !list.length ? 'עוד אין מסמכים ברשימה' : list.length + ' מסמכים · ' + (soon ? soon + ' צריכים חידוש ב-3 החודשים הקרובים' : 'אין מה לחדש בקרוב ✓');
      box.innerHTML = list.map(function (x) {
        var s = status(x);
        return '<li class="ms-' + s[0] + '"><div class="nm" data-ed="' + x.id + '"><b>' + esc(x.n) + '</b>' + (x.who ? ' · ' + esc(x.who) : '') +
          '<span class="meta">' + (x.exp ? 'בתוקף עד ' + he(x.exp) + ' · ' : '') + '<em>' + s[1] + '</em>' + (x.where ? '<br>📁 ' + esc(x.where) : '') + '</span></div>' +
          (x.exp ? '<div class="acts"><a class="btn btn-line btn-sm" href="' + gcal(x) + '" target="_blank" rel="noopener" data-cal="g">📅 ליומן גוגל</a><button type="button" class="btn btn-line btn-sm" data-ics="' + x.id + '">לאייפון</button></div>' : '') + '</li>';
      }).join('') || '<li class="empty" style="display:block">לוחצים על מסמך למעלה, או כותבים שם משלכם.</li>';
      var up = list.filter(function (x) { var n = days(x.exp); return n != null && n <= 90; });
      $('ms-wa').href = wa('📁 מסמכים של הבית שצריך לחדש בקרוב:\n\n' + (up.length ? up.map(function (x) { return '▫️ ' + x.n + (x.who ? ' (' + x.who + ')' : '') + ' – עד ' + he(x.exp); }).join('\n') : 'אין, הכול בתוקף ✓') + '\n\n' + location.origin + location.pathname);
      $('ms-print-list').innerHTML = list.map(function (x) { return '<tr><td>' + esc(x.n) + '</td><td>' + esc(x.who || '') + '</td><td>' + he(x.exp) + '</td><td>' + esc(x.where || '') + '</td></tr>'; }).join('');
    }
    function fill(x) {
      editId = x ? x.id : null;
      $('ms-n').value = x ? x.n : ''; $('ms-who').value = x ? x.who : ''; $('ms-exp').value = x ? x.exp : ''; $('ms-where').value = x ? x.where : '';
      $('ms-save').textContent = x ? 'לשמור שינויים' : 'להוסיף לרשימה';
      $('ms-del').hidden = !x;
    }
    $('ms-presets').addEventListener('click', function (e) {
      var b = e.target.closest('[data-pre]'); if (!b) return;
      fill(null); $('ms-n').value = b.getAttribute('data-pre'); $('ms-exp').focus();
    });
    $('ms-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var x = { n: $('ms-n').value.trim().slice(0, 50), who: $('ms-who').value.trim().slice(0, 30), exp: $('ms-exp').value, where: $('ms-where').value.trim().slice(0, 60) };
      if (!x.n) { toast('מה שם המסמך?'); $('ms-n').focus(); return; }
      if (editId) { var o = st.docs.filter(function (d) { return d.id === editId; })[0]; if (o) { o.n = x.n; o.who = x.who; o.exp = x.exp; o.where = x.where; } }
      else { x.id = uid(); st.docs.push(x); }
      persist(); fill(null); draw(); toast('נשמר'); use(T, 'add');
    });
    $('ms-del').onclick = function () { if (!editId || !confirm('למחוק את המסמך מהרשימה?')) return; st.docs = st.docs.filter(function (d) { return d.id !== editId; }); persist(); fill(null); draw(); };
    $('ms-cancel').onclick = function () { fill(null); };
    box.addEventListener('click', function (e) {
      var ed = e.target.closest('[data-ed]'), ic = e.target.closest('[data-ics]'), g = e.target.closest('[data-cal]');
      if (ic) { ics(st.docs.filter(function (d) { return d.id === ic.getAttribute('data-ics'); })[0]); use(T, 'ics'); }
      else if (g) use(T, 'gcal');
      else if (ed) { fill(st.docs.filter(function (d) { return d.id === ed.getAttribute('data-ed'); })[0]); window.scrollTo({ top: $('ms-form').getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); }
    });
    $('ms-wa').addEventListener('click', function () { use(T, 'wa'); });
    $('ms-print').onclick = function () { use(T, 'print'); window.print(); };
    fill(null); draw();
  })();

  // ======================================================================
  // 6. מתנה קבוצתית – מי השתתף, כמה נאסף. בלי שרת: הכול בקישור. לא מעביר כסף.
  // ======================================================================
  (function matana() {
    var root = $('mt-root'); if (!root) return;
    var T = 'bait_matana', ME = 'bait-mevi-me', LAST = 'bait-matana-last';
    var st = hashData(), fromLink = !!st;
    if (!st) st = load(LAST, null);
    var editing = !st || !st.t;
    if (!st) st = { t: '', g: 0, p: '', d: '', h: 0, l: [] };
    if (!st.l) st.l = [];
    var me = load(ME, '');
    function total() { return st.l.reduce(function (s, x) { return s + num(x[1], 0); }, 0); }
    function link() { return location.origin + location.pathname + '#d=' + enc(st); }
    function persist() { save(LAST, st); try { history.replaceState(null, '', location.pathname + '#d=' + enc(st)); } catch (e) {} }
    function bar(p) { var n = Math.max(0, Math.min(10, Math.round(p / 10))); return '🟩'.repeat(n) + '⬜'.repeat(10 - n); }
    function msg() {
      var tt = total(), G = num(st.g, 0), pc = G ? Math.round(tt / G * 100) : 0;
      return '🎁 *' + st.t + '*' + (st.d ? '\n' + st.d : '') + '\n\n' +
        (G ? 'נאסף ' + heCount(tt) + ' ₪ מתוך ' + heCount(G) + ' ₪ (' + pc + '%)\n' + bar(pc) : 'נאסף עד עכשיו: ' + heCount(tt) + ' ₪') +
        '\n\nמי כבר בפנים (' + st.l.length + '):\n' + (st.l.length ? st.l.map(function (x) { return '✅ ' + x[0] + (st.h ? '' : ' – ' + heCount(num(x[1], 0)) + ' ₪'); }).join('\n') : 'עוד אף אחד, תהיו הראשונים 🙂') +
        (st.p ? '\n\nאיך משלמים: ' + st.p : '') + '\n\nלהצטרף (בלי הרשמה), תמיד מהקישור בהודעה האחרונה:\n' + link();
    }
    function draw() {
      $('mt-edit').hidden = !editing; $('mt-view').hidden = editing;
      if (editing) { $('mt-t').value = st.t; $('mt-g').value = st.g || ''; $('mt-p').value = st.p; $('mt-d').value = st.d; $('mt-h').checked = !!st.h; return; }
      var tt = total(), G = num(st.g, 0), pc = G ? Math.min(100, tt / G * 100) : 0;
      $('mt-title').textContent = '🎁 ' + st.t; $('mt-when').textContent = st.d || '';
      $('mt-bar').style.width = pc + '%';
      $('mt-sum').textContent = G ? (tt >= G ? 'הגענו ליעד! ' : '') + 'נאסף ' + heCount(tt) + ' ₪ מתוך ' + heCount(G) + ' ₪' + (tt < G ? ' · חסר ' + heCount(G - tt) + ' ₪' : '') : 'נאסף ' + heCount(tt) + ' ₪';
      $('mt-pay').hidden = !st.p; $('mt-pay-t').textContent = st.p;
      $('mt-me').value = me;
      $('mt-list').innerHTML = st.l.map(function (x, k) {
        var mine = me && x[0] === me;
        return '<li class="taken' + (mine ? ' mine' : '') + '"><span class="nm">' + esc(x[0]) + (st.h ? '' : '<span class="who">' + heCount(num(x[1], 0)) + ' ₪</span>') + '</span>' + (mine ? '<button type="button" class="btn btn-line btn-sm" data-out="' + k + '">להסיר</button>' : '') + '</li>';
      }).join('') || '<li style="display:block" class="muted">עוד אף אחד לא נרשם.</li>';
      $('mt-wa').href = wa(msg());
    }
    $('mt-join').addEventListener('submit', function (e) {
      e.preventDefault();
      me = $('mt-me').value.trim().slice(0, 25); var a = num($('mt-amt').value, 0);
      if (!me) { toast('קודם כותבים את השם'); $('mt-me').focus(); return; }
      if (!(a > 0)) { toast('כמה ₪?'); $('mt-amt').focus(); return; }
      save(ME, me);
      var ex = st.l.filter(function (x) { return x[0] === me; })[0];
      if (ex) ex[1] = a; else st.l.push([me, a]);
      $('mt-amt').value = ''; persist(); draw(); $('mt-nudge').hidden = false; toast('נרשמת. עכשיו לשלוח עדכון לקבוצה ↓'); use(T, 'join');
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-out]'); if (!b) return;
      st.l.splice(+b.getAttribute('data-out'), 1); persist(); draw(); $('mt-nudge').hidden = false;
    });
    root.addEventListener('click', function (e) { var b = e.target.closest('[data-amt]'); if (b) $('mt-amt').value = b.getAttribute('data-amt'); });
    $('mt-go').onclick = function () {
      st.t = $('mt-t').value.trim().slice(0, 60); st.g = num($('mt-g').value, 0); st.p = $('mt-p').value.trim().slice(0, 80); st.d = $('mt-d').value.trim().slice(0, 60); st.h = $('mt-h').checked ? 1 : 0;
      if (!st.t) { toast('למי המתנה?'); $('mt-t').focus(); return; }
      editing = false; persist(); draw(); $('mt-nudge').hidden = false; use(T, 'create'); window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    $('mt-wa').addEventListener('click', function () { use(T, 'wa'); $('mt-nudge').hidden = true; });
    $('mt-copy').onclick = function () { copy(link()); use(T, 'link'); };
    $('mt-editbtn').onclick = function () { editing = true; draw(); };
    $('mt-new').onclick = function () { if (!confirm('לפתוח איסוף חדש? (הישן נשאר בקישור שכבר נשלח)')) return; st = { t: '', g: 0, p: '', d: '', h: 0, l: [] }; editing = true; clearHash(); save(LAST, null); draw(); };
    if (fromLink) use(T, 'open_link');
    draw();
  })();

  // ======================================================================
  // 7. שגרת בוקר וערב לילדים – לוח עם ציורים, הילד מסמן, כוכב בסוף
  // ======================================================================
  (function shigra() {
    var grid = $('sg-grid'); if (!grid) return;
    var T = 'bait_shigra', KEY = 'bait-shigra';
    var DEF = {
      boker: [['🛏️', 'לסדר את המיטה'], ['🚽', 'שירותים ונטילת ידיים'], ['👕', 'להתלבש'], ['🦷', 'לצחצח שיניים'], ['🥣', 'ארוחת בוקר'], ['🎒', 'לקחת תיק'], ['👟', 'לנעול נעליים']],
      erev: [['🧸', 'לסדר צעצועים'], ['🛁', 'מקלחת'], ['🩳', 'פיג׳מה'], ['🦷', 'לצחצח שיניים'], ['🎒', 'להכין תיק למחר'], ['📖', 'סיפור'], ['🙏', 'קריאת שמע']]
    };
    var st = load(KEY, null) || { kids: ['נועה', 'איתי'], kid: 0, mode: new Date().getHours() >= 14 ? 'erev' : 'boker', items: DEF, day: '', done: {}, stars: {} };
    function persist() { save(KEY, st); }
    var td = new Date().toDateString();
    if (st.day !== td) { st.day = td; st.done = {}; persist(); }
    function kidName() { return st.kids[st.kid] || ''; }
    function dk() { return st.kid + ':' + st.mode; }
    function drawKids() {
      $('sg-kids').innerHTML = st.kids.map(function (k, i) { return '<button type="button" class="chip' + (i === st.kid ? ' on' : '') + '" data-kid="' + i + '">' + esc(k) + ' ⭐' + (st.stars[k] || 0) + '</button>'; }).join('');
      Array.prototype.forEach.call(document.querySelectorAll('[data-sg-mode]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-sg-mode') === st.mode ? 'true' : 'false'); });
    }
    function draw() {
      drawKids();
      var items = st.items[st.mode] || [], d = st.done[dk()] || {};
      grid.innerHTML = items.map(function (x, i) { return '<button type="button" class="sg-card' + (d[i] ? ' on' : '') + '" data-i="' + i + '" aria-pressed="' + (d[i] ? 'true' : 'false') + '"><span class="e">' + esc(x[0]) + '</span><span class="t">' + esc(x[1]) + '</span>' + (d[i] ? '<span class="v">✓</span>' : '') + '</button>'; }).join('');
      var n = items.filter(function (x, i) { return d[i]; }).length;
      $('sg-bar').style.width = (items.length ? n / items.length * 100 : 0) + '%';
      var all = items.length && n === items.length;
      $('sg-txt').textContent = all ? '⭐ כל הכבוד, ' + kidName() + '! ' + (st.mode === 'boker' ? 'יום טוב!' : 'לילה טוב!') : n + ' מתוך ' + items.length + (kidName() ? ' · ' + kidName() : '');
      $('sg-win').hidden = !all;
      drawPrint(); drawPrize();
    }
    function drawAll() { draw(); drawEdit(); }
    function drawEdit() {
      $('sg-items').innerHTML = (st.items[st.mode] || []).map(function (x, i) {
        return '<div class="row" style="margin-top:.4rem"><input type="text" maxlength="4" value="' + esc(x[0]) + '" data-ie="' + i + '" aria-label="ציור" style="flex:0 0 3.6rem;text-align:center;font-size:1.3rem"><input type="text" maxlength="30" value="' + esc(x[1]) + '" data-it="' + i + '" aria-label="מה עושים"><button type="button" class="x no-flex" data-idel="' + i + '" aria-label="להסיר">×</button></div>';
      }).join('');
      $('sg-kidlist').innerHTML = st.kids.map(function (k, i) { return '<div class="row" style="margin-top:.4rem"><input type="text" maxlength="15" value="' + esc(k) + '" data-kn="' + i + '" aria-label="שם"><button type="button" class="x no-flex" data-kdel="' + i + '" aria-label="להסיר">×</button></div>'; }).join('');
    }
    function drawPrint() {
      var DS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
      $('sg-paper').innerHTML = '<h3>' + (st.mode === 'boker' ? '☀️ שגרת הבוקר' : '🌙 שגרת הערב') + (kidName() ? ' של ' + esc(kidName()) : '') + '</h3><p class="sub2">כל מה שעשיתי – מסמנים ✓</p>' +
        '<table><tr><th></th>' + DS.map(function (d) { return '<th>' + d + '</th>'; }).join('') + '</tr>' +
        (st.items[st.mode] || []).map(function (x) { return '<tr><td class="ch"><span style="font-size:1.4em">' + esc(x[0]) + '</span> ' + esc(x[1]) + '</td>' + DS.map(function () { return '<td style="height:2.2rem"></td>'; }).join('') + '</tr>'; }).join('') +
        '</table><p class="ft">hakelim.com/bait</p>';
    }
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]'); if (!b) return;
      var k = dk(), i = b.getAttribute('data-i'); st.done[k] = st.done[k] || {};
      var items = st.items[st.mode] || [], before = items.every(function (x, j) { return st.done[k][j]; });
      if (st.done[k][i]) delete st.done[k][i]; else st.done[k][i] = 1;
      var after = items.length && items.every(function (x, j) { return st.done[k][j]; });
      if (after && !before) { st.stars[kidName()] = (st.stars[kidName()] || 0) + 1; use(T, 'done'); }
      if (!after && before) st.stars[kidName()] = Math.max(0, (st.stars[kidName()] || 0) - 1);
      persist(); draw(); use(T, 'tap');
    });
    $('sg-kids').addEventListener('click', function (e) { var b = e.target.closest('[data-kid]'); if (!b) return; st.kid = +b.getAttribute('data-kid'); persist(); draw(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-sg-mode]'), function (b) { b.addEventListener('click', function () { st.mode = b.getAttribute('data-sg-mode'); persist(); drawAll(); }); });
    var ed = $('sg-edit');
    ed.addEventListener('input', function (e) {
      var t = e.target, a, L = st.items[st.mode];
      if ((a = t.getAttribute('data-ie')) != null) L[+a][0] = t.value;
      else if ((a = t.getAttribute('data-it')) != null) L[+a][1] = t.value;
      else if ((a = t.getAttribute('data-kn')) != null) { var old = st.kids[+a]; st.kids[+a] = t.value; ['stars', 'jars', 'goals'].forEach(function (f) { if (st[f] && st[f][old] != null) { st[f][t.value] = st[f][old]; delete st[f][old]; } }); }
      else return;
      persist(); draw();
    });
    ed.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var a;
      if ((a = b.getAttribute('data-idel')) != null) { st.items[st.mode].splice(+a, 1); st.done = {}; }
      else if ((a = b.getAttribute('data-kdel')) != null) { if (st.kids.length < 2) return; st.kids.splice(+a, 1); st.kid = 0; st.done = {}; }
      else if (b.id === 'sg-iadd') st.items[st.mode].push(['⭐', '']);
      else if (b.id === 'sg-kadd') st.kids.push('');
      else if (b.id === 'sg-reset') { if (!confirm('לחזור לרשימות המקוריות?')) return; st.items = JSON.parse(JSON.stringify(DEF)); st.done = {}; }
      else return;
      persist(); drawAll();
    });
    // ---------- המבצע: כוכבים → מתנה, או כוכבים → כסף בשלוש צנצנות (להוציא, לחסוך, צדקה) ----------
    st.cfg = st.cfg || { val: 1, mult: 2, tz: 10 };
    st.goals = st.goals || {};
    st.jars = st.jars || {};
    function goal() { var k = kidName(); return st.goals[k] = st.goals[k] || { n: 20, prize: '' }; }
    function jars() { var k = kidName(); return st.jars[k] = st.jars[k] || { spend: 0, save: 0, tz: 0, given: 0 }; }
    function stars() { return st.stars[kidName()] || 0; }
    function nis(v) { return (Math.round(v * 10) / 10) + ' ₪'; }
    function split() {
      var n = Math.max(0, Math.min(stars(), Math.floor(num($('pz-n').value, 0)))), base = n * num(st.cfg.val, 1);
      var tzp = Math.max(num(st.cfg.tz, 0), num($('pz-tz').value, 0)), svp = Math.min(100 - tzp, num($('pz-sv').value, 0));
      var tz = base * tzp / 100, sv = base * svp / 100, sp = base - tz - sv, bonus = sv * (num(st.cfg.mult, 1) - 1);
      return { n: n, base: base, tz: tz, sv: sv, sp: sp, bonus: bonus, tzp: tzp, svp: svp };
    }
    function drawPreview() {
      var s = split();
      $('pz-tz-v').textContent = s.tzp + '%'; $('pz-sv-v').textContent = s.svp + '%';
      $('pz-prev').innerHTML = s.n ? s.n + ' כוכבים = <b>' + nis(s.base) + '</b><br>🛍️ להוציא: ' + nis(s.sp) + '<br>🐷 לחיסכון: ' + nis(s.sv) +
        (s.bonus > 0 ? ' <b class="pz-bonus">+ ' + nis(s.bonus) + ' מאבא ואמא = ' + nis(s.sv + s.bonus) + '</b>' : '') + '<br>💝 לצדקה: ' + nis(s.tz) : 'כמה כוכבים להפוך לכסף?';
    }
    function drawPrize() {
      var k = kidName(), g = goal(), j = jars(), s = stars();
      $('pz-name').textContent = k;
      $('pz-stars').textContent = '⭐ ' + s;
      $('pz-goal-bar').style.width = Math.min(100, g.n ? s / g.n * 100 : 0) + '%';
      $('pz-goal-txt').textContent = g.prize ? (s >= g.n ? '🎉 הגיע/ה ל-' + g.n + ' כוכבים! מגיע: ' + g.prize : s + ' מתוך ' + g.n + ' כוכבים → ' + g.prize + ' (עוד ' + (g.n - s) + ')') : 'עוד לא נבחרה מתנה. בוחרים למטה, ב"להגדיר את המבצע".';
      $('pz-got').hidden = !(g.prize && s >= g.n);
      $('pz-j-sp').textContent = nis(j.spend); $('pz-j-sv').textContent = nis(j.save); $('pz-j-tz').textContent = nis(j.tz);
      $('pz-given').textContent = j.given ? 'נתן/ה צדקה עד היום: ' + nis(j.given) + ' 💝' : '';
      $('pz-n').max = s; if (num($('pz-n').value, 0) > s) $('pz-n').value = s;
      $('pz-tz').min = st.cfg.tz; if (num($('pz-tz').value, 0) < num(st.cfg.tz, 0)) $('pz-tz').value = st.cfg.tz;
      $('pz-g-n').value = g.n; $('pz-g-p').value = g.prize; $('pz-val').value = st.cfg.val; $('pz-mult').value = String(st.cfg.mult); $('pz-mintz').value = st.cfg.tz;
      $('pz-mult-t').textContent = num(st.cfg.mult, 1) > 1 ? 'כל שקל שנכנס לחיסכון, אבא ואמא מוסיפים עוד ' + (num(st.cfg.mult, 1) === 2 ? 'שקל' : (num(st.cfg.mult, 1) - 1) + ' ₪') + '.' : '';
      drawPreview();
    }
    var pz = $('pz-root');
    pz.addEventListener('input', function (e) {
      var id = e.target.id;
      if (id === 'pz-n' || id === 'pz-tz' || id === 'pz-sv') { drawPreview(); return; }
      if (id === 'pz-g-n') goal().n = Math.max(1, Math.floor(num(e.target.value, 20)));
      else if (id === 'pz-g-p') goal().prize = e.target.value.slice(0, 40);
      else if (id === 'pz-val') st.cfg.val = Math.max(0, num(e.target.value, 1));
      else if (id === 'pz-mintz') st.cfg.tz = Math.max(0, Math.min(100, num(e.target.value, 10)));
      else return;
      persist(); drawPrize(); drawKids();
    });
    $('pz-mult').addEventListener('change', function () { st.cfg.mult = num(this.value, 1); persist(); drawPrize(); });
    pz.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var k = kidName(), j = jars(), a;
      if (b.id === 'pz-plus') { st.stars[k] = stars() + 1; toast('⭐ כוכב בונוס ל' + k); use(T, 'bonus_star'); }
      else if (b.id === 'pz-minus') { st.stars[k] = Math.max(0, stars() - 1); }
      else if (b.id === 'pz-got') { if (!confirm('לסמן שקיבל/ה את המתנה? יורדים ' + goal().n + ' כוכבים.')) return; st.stars[k] = stars() - goal().n; use(T, 'prize'); toast('🎁 מזל טוב! מתחילים מבצע חדש'); }
      else if (b.id === 'pz-go') {
        var s = split(); if (!s.n) { toast('כמה כוכבים?'); $('pz-n').focus(); return; }
        st.stars[k] = stars() - s.n; j.spend += s.sp; j.save += s.sv + s.bonus; j.tz += s.tz;
        $('pz-n').value = ''; use(T, 'redeem');
        toast(s.bonus > 0 ? '🐷 נכנס לחיסכון, ואבא ואמא הוסיפו ' + nis(s.bonus) + '!' : 'הכסף נכנס לצנצנות');
      }
      else if ((a = b.getAttribute('data-jar'))) {
        if (a === 'tz') { if (!j.tz) { toast('צנצנת הצדקה ריקה'); return; } if (!confirm('לסמן שנתת ' + nis(j.tz) + ' לצדקה?')) return; j.given += j.tz; j.tz = 0; use(T, 'tzedaka'); toast('💝 אשריך! השפע חוזר'); }
        else {
          var v = num(prompt(a === 'spend' ? 'כמה הוצאת? (₪)' : 'כמה מוציאים מהחיסכון? (₪)'), 0); if (!(v > 0)) return;
          var key = a === 'spend' ? 'spend' : 'save'; if (v > j[key]) { toast('אין מספיק בצנצנת'); return; } j[key] -= v;
        }
      }
      else return;
      persist(); drawKids(); drawPrize();
    });
    $('sg-print').onclick = function () { use(T, 'print'); window.print(); };
    $('sg-again').onclick = function () { st.done[dk()] = {}; persist(); draw(); };
    partnerSync({ kind: 'shigra', id: 'sg', T: T, at: $('sg-kids'),
      ask: 'קיבלת את השגרה של הילדים מבן או בת הזוג: הרשימות, הכוכבים, המבצע והצנצנות. לייבא לטלפון הזה? מה שיש כאן עכשיו יוחלף.',
      msg: '☀️ זו השגרה של הילדים, עם הכוכבים והצנצנות. פותחים את הקישור ולוחצים "לייבא", ואז יש לשנינו את אותו מצב:',
      get: function () { return { kids: st.kids, items: st.items, stars: st.stars, cfg: st.cfg, goals: st.goals, jars: st.jars }; },
      set: function (s) {
        if (!s || !s.kids || !s.items) return;
        ['kids', 'items', 'stars', 'cfg', 'goals', 'jars'].forEach(function (f) { if (s[f] != null) st[f] = s[f]; });
        st.kid = 0; st.done = {}; persist(); drawAll();
      } });
    drawAll();
  })();
  // ======================================================================
  // גיבוי ושחזור של כל הכלים (דף הבית /bait/): כל המפתחות bait-* בקובץ JSON אחד
  // ======================================================================
  (function backup() {
    var sv = $('bk-save'); if (!sv) return;
    var T = 'bait_home';
    function keys() { var a = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('bait-') === 0) a.push(k); } } catch (e) {} return a.sort(); }
    var NAMES = { 'bait-kniyot': 'קניות', 'bait-toranut': 'תורנויות', 'bait-shabat': 'שבת ואורחים', 'bait-shigra': 'שגרה לילדים', 'bait-mismachim': 'המסמכים של הבית' };
    function status() {
      var k = keys(), n = k.map(function (x) { return NAMES[x]; }).filter(Boolean);
      $('bk-status').textContent = k.length ? 'שמור כרגע בטלפון: ' + (n.length ? n.join(', ') : k.length + ' פריטים') + '.' : 'עוד לא נשמר כלום בכלים בטלפון הזה.';
    }
    sv.onclick = function () {
      var k = keys(); if (!k.length) { toast('אין עדיין מה לגבות'); return; }
      var d = { app: 'bait', v: 1, saved: new Date().toISOString(), data: {} };
      k.forEach(function (x) { d.data[x] = localStorage.getItem(x); });
      var now = new Date(), name = 'gibui-bait-' + now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2) + '.json';
      var blob = new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }), f = null;
      try { f = new File([blob], name, { type: 'application/json' }); } catch (e) {}
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1500);
      toast('הגיבוי נשמר: ' + name); use(T, 'backup');
      if (f && navigator.canShare && navigator.canShare({ files: [f] })) $('bk-share').hidden = false, $('bk-share').onclick = function () { navigator.share({ files: [f], title: 'גיבוי – כלים למשפחה ולבית' }).catch(function () {}); };
    };
    $('bk-file').addEventListener('change', function () {
      var file = this.files && this.files[0], inp = this; if (!file) return;
      var r = new FileReader();
      r.onload = function () {
        var d; try { d = JSON.parse(r.result); } catch (e) { d = null; }
        if (!d || d.app !== 'bait' || !d.data) { toast('זה לא קובץ גיבוי של כלים למשפחה ולבית'); inp.value = ''; return; }
        var k = Object.keys(d.data).filter(function (x) { return x.indexOf('bait-') === 0; });
        var when = d.saved ? new Date(d.saved).toLocaleDateString('he-IL') : '';
        if (!confirm('לשחזר ' + k.length + ' פריטים מגיבוי' + (when ? ' מ-' + when : '') + '? מה ששמור עכשיו בכלים האלה יוחלף.')) { inp.value = ''; return; }
        try { k.forEach(function (x) { localStorage.setItem(x, d.data[x]); }); } catch (e) { toast('לא הצלחתי לשמור בטלפון'); return; }
        inp.value = ''; status(); toast('שוחזר ✓ ' + k.length + ' פריטים'); use(T, 'restore');
      };
      r.readAsText(file);
    });
    status();
  })();
})();
