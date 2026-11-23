/* חיפוש בראש כל דף באתר (גרסה 2, 24.11.2026): קטלוג אחד (assets/catalog.json) עם נושא, שם קצר ומילות הקשר לכל כלי.
   מבין ניסוחים יומיומיים ("הקובץ גדול מדי"), שגיאות כתיב קלות, כתיב מלא/חסר, ריבוי וקידומות; מקבץ תוצאות לפי נושא.
   אין תוצאה? מציעים לשלוח בקשה לכלי חדש (השרת kelim-bakasha). טקסט החיפוש לעולם לא נשלח ל-GA ולא לשרת בלי לחיצה על "שלחו". */
(function () {
  'use strict';
  var box = document.getElementById('hk-search');
  if (!box) return;
  var API = 'https://kelim-bakasha.gilad4049.workers.dev', ASK = 'https://kelim-ask.gilad4049.workers.dev/ask';
  var LANG = (document.documentElement.lang || 'he').slice(0, 2);
  if (LANG !== 'en' && LANG !== 'ru') LANG = 'he';
  var UI = {
    he: { label: 'חיפוש כלי או דף באתר', ph: 'חפשו כלי: מה אתם רוצים לעשות?', go: 'חיפוש', hint: 'כלים בעברית', none: 'לא מצאנו כלי כזה אצלנו.', hebrew: '', all: '', n: function (k) { return k + ' תוצאות'; } },
    en: { label: 'Search tools on this site', ph: 'Search a tool: what do you need to do?', go: 'Search', hint: 'Tools in English', none: 'No tool in English matches. These Hebrew pages may help:', hebrew: ' (Hebrew)', all: 'No tool in English matches your search.', n: function (k) { return k + ' results'; } },
    ru: { label: 'Поиск инструментов на сайте', ph: 'Найдите инструмент: что вам нужно сделать?', go: 'Найти', hint: 'Инструменты на русском', none: 'На русском ничего не найдено. Возможно, помогут эти страницы на иврите:', hebrew: ' (иврит)', all: 'На русском ничего не найдено.', n: function (k) { return k + ' результатов'; } }
  }[LANG];
  var cat = null, loading = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // כתיב אחיד: בלי ניקוד/גרשיים, אותיות סופיות כרגילות (כדי ש"מחשבון" ו"מחשבונים" ייפגשו)
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[֑-ׇ]/g, '').replace(/[׳'"”“״]/g, '').replace(/[^א-תa-z0-9а-яё ]+/g, ' ')
      .replace(/ך/g, 'כ').replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ').replace(/\s+/g, ' ').trim();
  }
  function track(name, extra) { try { if (window.toolUsed) window.toolUsed(name, extra || {}); } catch (e) {} }
  function ev(name, params) { try { if (window.kelimEv) window.kelimEv(name, params); } catch (e) {} }
  var STOP = ' מה איך אני לי של את על עם זה יש אין אפשר צריכ צריכה רוצה רוצים איפה האם כל גם או אבל לא אנחנו שלי מי מתי כמה ';
  // צורות התאמה של מילה: כמות, בלי קידומת (ה/ב/ל/ו/כ/מ/ש), בלי סיומת רבים (ים/ות), ובכתיב חסר (בלי ו/י באמצע)
  function stem(w) { return w.length > 3 && /^[הבלוכמש]/.test(w) ? w.slice(1) : w; }
  function suf(w) { return w.length > 4 && /(ימ|ות)$/.test(w) ? w.slice(0, -2) : w; }
  function skel(w) { return w.length > 3 ? w.charAt(0) + w.slice(1).replace(/[וי]/g, '') : w; }
  function forms(w) {
    var o = {}, a = [w, stem(w)];
    a.concat([suf(a[0]), suf(a[1])]).forEach(function (x) { o[x] = 1; var k = skel(x); if (k.length > 1) o[k] = 1; });
    return Object.keys(o);
  }
  function skelAll(t) { return t.split(' ').map(skel).join(' '); }
  function lev1(a, b) { // מרחק עריכה ≤ 1
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    var i = 0; while (i < la && i < lb && a.charAt(i) === b.charAt(i)) i++;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a.charAt(i) === b.charAt(i + 1) && a.charAt(i + 1) === b.charAt(i) && a.slice(i + 2) === b.slice(i + 2));
    return la > lb ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
  }

  box.innerHTML = '<form class="hk-s" role="search" autocomplete="off"><label class="hk-s-l" for="hk-q">' + UI.label + '</label>' +
    '<div class="hk-s-row"><input id="hk-q" type="search" inputmode="search" enterkeyhint="search" placeholder="' + UI.ph + '" maxlength="80" role="combobox" aria-expanded="false" aria-controls="hk-out" aria-autocomplete="list">' +
    '<button type="submit">' + UI.go + '</button></div><p class="hk-sr" id="hk-sr" role="status" aria-live="polite"></p><div class="hk-s-out" id="hk-out"></div></form>';
  var form = box.firstChild, q = form.querySelector('input'), out = form.querySelector('.hk-s-out'), sr = form.querySelector('.hk-sr');

  // ---------- טעינה ואינדוקס ----------
  var items = [], post = {}, vkeys = [], topicName = {}, topicList = [];
  function put(form_, i, w) { var a = post[form_] || (post[form_] = []); a.push(i * 8 + w); }
  function indexText(text, i, w) { norm(text).split(' ').forEach(function (t) { if (t.length > 1) forms(t).forEach(function (f) { put(f, i, w); }); }); }
  function load() {
    if (cat) return Promise.resolve(cat);
    if (!loading) loading = fetch('/assets/catalog.json').then(function (r) { return r.json(); }).then(function (j) {
      cat = j; topicList = j.topics || []; topicList.forEach(function (t) { topicName[t.id] = t; });
      items = j.items;
      var maxp = 0; items.forEach(function (it) { if (it.p > maxp) maxp = it.p; });
      items.forEach(function (it, i) {
        it._i = i; it._nn = norm(it.n + ' ' + it.t); it._ns = norm(it.s); it._nk = norm(it.k); it._pop = maxp ? it.p / maxp : 0;
        indexText(it.n + ' ' + it.t + ' ' + it.s, i, 6); indexText(it.k, i, 5); indexText(it.d, i, 3); indexText(it.u.replace(/[\/-]+/g, ' '), i, 1);
      });
      vkeys = Object.keys(post);
      return cat;
    }).catch(function () { loading = null; return null; });
    return loading;
  }

  // ---------- דירוג ----------
  function tokens(text) {
    var all = norm(text).split(' ').filter(function (w) { return w.length > 1; });
    var keep = all.filter(function (w) { return STOP.indexOf(' ' + w + ' ') < 0; });
    return keep.length ? keep : all;
  }
  function wordHits(w, isLast) { // → {idx: {w: משקל, nm: נמצא בשם}}
    var hits = {}, found = false;
    function add(list, mult) { list.forEach(function (c) { var i = c >> 3, wt = (c & 7) * mult, h = hits[i]; if (!h) h = hits[i] = { w: 0, nm: 0 }; if (wt > h.w) h.w = wt; if ((c & 7) === 6) h.nm = 1; found = true; }); }
    forms(w).forEach(function (f) { if (post[f]) add(post[f], 1); });
    if (!found && isLast && w.length >= 3) vkeys.forEach(function (k) { if (k.indexOf(w) === 0) add(post[k], .6); });
    if (!found && w.length >= 4) vkeys.forEach(function (k) { if (lev1(k, w)) add(post[k], .5); });
    return hits;
  }
  function search(text, lang) {
    var words = tokens(text); if (!words.length) return [];
    var per = words.map(function (w, n) { return wordHits(w, n === words.length - 1); });
    var need = words.length <= 1 ? 1 : (words.length === 2 ? 2 : Math.ceil(words.length * 0.6)), nq = norm(text), res = [];
    function collect(min) {
      var tally = {};
      per.forEach(function (h) { for (var i in h) { var t = tally[i] || (tally[i] = { s: 0, c: 0, nm: 0 }); t.s += h[i].w; t.c++; t.nm += h[i].nm; } });
      for (var i in tally) {
        var t = tally[i], it = items[i];
        if (t.c < min || it.l !== lang) continue;
        if (it.ty === 'landing' && t.nm < min) continue;
        var s = t.s + t.c * 2 + (t.c === words.length ? 4 : 0);
        if (nq.length > 3 && (it._nn.indexOf(nq) > -1 || it._nk.indexOf(nq) > -1)) s += 6;
        s += t.nm * 1.5;
        if (it._ns && (it._ns === nq || skelAll(it._ns) === skelAll(nq))) s += 8; // השם הקצר הוא בדיוק מה שחיפשו (גם בכתיב חסר/מלא)
        s += it.ty === 'tool' ? 2 : it.ty === 'hub' ? 1 : it.ty === 'landing' ? -2 : 0;
        s += it._pop * 2;
        res.push([s, it]);
      }
    }
    collect(need); if (!res.length && need > 1) collect(1);
    return res.sort(function (a, b) { return b[0] - a[0]; });
  }

  // ---------- תצוגה ----------
  var shown = [];   // הפריטים שמוצגים (לפי סדר) – למדידת מיקום
  function itemHtml(it, n) {
    shown.push(it);
    return '<a class="hk-opt" role="option" id="hk-o' + n + '" href="' + esc(it.u) + '" data-i="' + n + '"><b>' + esc(it.n) + '</b>' +
      (it.nw && !it.sf ? '<i class="hk-new">חדש</i>' : '') + (it.d ? '<span>' + esc(it.d) + '</span>' : '') + '</a>';
  }
  function chipHtml(it) { shown.push(it); return '<li><a class="hk-opt" role="option" id="hk-o' + (shown.length - 1) + '" href="' + esc(it.u) + '" data-i="' + (shown.length - 1) + '">' + esc(it.s || it.n) + '</a></li>'; }
  function topicTools(g, n) {
    return items.filter(function (it) { return it.g === g && it.ty === 'tool' && it.l === 'he'; })
      .sort(function (a, b) { return (b.p - a.p) || (a.nw ? -1 : 0) - (b.nw ? -1 : 0) || a.u.length - b.u.length; }).slice(0, n || 8);
  }
  function setOpen(o) { q.setAttribute('aria-expanded', o ? 'true' : 'false'); if (!o) q.removeAttribute('aria-activedescendant'); }
  function say(t) { sr.textContent = t; }
  var TOP = ['/kodesh/zmanim/', '/kodesh/shabat/', '/kodesh/birkat-hamazon/', '/kodesh/tefillin/', '/kodesh/tehillim/', '/kelim/tamlul/', '/kelim/android/', '/kesef/bruto-neto/', '/limudim/poter/', '/kodesh/gimatria/'];
  function byU(u) { for (var i = 0; i < items.length; i++) if (items[i].u === u) return items[i]; return null; }
  function recent() {
    try { return JSON.parse(localStorage.getItem('hk-recent') || '[]').filter(function (r) { return r && r.u && r.u !== location.pathname; }).slice(0, 3); } catch (e) { return []; }
  }
  function home() {
    shown = [];
    load().then(function (c) {
      if (!c) { out.innerHTML = ''; return; }
      if (LANG !== 'he') {
        var mine = items.filter(function (it) { return it.l === LANG; }).slice(0, 14);
        out.innerHTML = '<div class="hk-home" role="listbox" aria-label="' + UI.hint + '"><p class="hk-h">' + UI.hint + '</p><ul class="hk-top">' + mine.map(chipHtml).join('') + '</ul></div>';
        setOpen(true); return;
      }
      var h = '<div class="hk-home" role="listbox" aria-label="חיפוש: הצעות">';
      var now = (window.hkNow && window.hkNow()) || [];
      if (now.length) h += '<p class="hk-h">מתאים לעכשיו</p><ul class="hk-top hk-now">' + now.map(function (u) { var it = byU(u); return it ? chipHtml(it) : ''; }).join('') + '</ul>';
      var rc = recent();
      if (rc.length) h += '<p class="hk-h">המשכתם לאחרונה</p><ul class="hk-top">' + rc.map(function (r) { var it = byU(r.u); return it ? chipHtml(it) : ''; }).join('') + '</ul>';
      var top = items.filter(function (it) { return it.p > 0 && it.ty === 'tool' && it.l === 'he'; }).sort(function (a, b) { return b.p - a.p; }).slice(0, 8);
      if (!top.length) top = TOP.map(byU).filter(Boolean);
      h += '<p class="hk-h">הכי שימושיים</p><ul class="hk-top">' + top.map(chipHtml).join('') + '</ul>';
      h += '<p class="hk-h" id="hk-th">נושאים</p><ul class="hk-topics" aria-labelledby="hk-th">' + topicList.map(function (t) {
        return '<li><button type="button" class="hk-tp" data-g="' + esc(t.id) + '">' + esc(t.e) + ' ' + esc(t.n) + '</button></li>'; }).join('') + '</ul></div>';
      out.innerHTML = h; setOpen(true);
    });
  }
  function showTopic(g) {
    var t = topicName[g]; if (!t) return;
    shown = [];
    out.innerHTML = '<div class="hk-home" role="listbox" aria-label="' + esc(t.n) + '"><p class="hk-h">' + esc(t.e) + ' ' + esc(t.n) + '</p><div class="hk-res">' +
      topicTools(g, 8).map(function (it, n) { return itemHtml(it, n); }).join('') + '</div><button type="button" class="hk-back">← חזרה לנושאים</button></div>';
    say(t.n); track('hakelim_search', { how: 'topic', to: g });
  }
  // "תארו במילים שלכם": נשלח לשרת רק בלחיצה מפורשת. נכשל? נשארים עם החיפוש המקומי, בלי הודעת שגיאה.
  function askHtml() {
    return '<div class="hk-ask"><button type="button" class="hk-askb">לא מצאתם? תארו במילים שלכם ואמצא לכם כלי</button>' +
      '<p class="hk-askn">השאלה נשלחת לשרת כדי למצוא כלי, בלי פרטים מזהים. <a href="/kelim/pratiut/">פרטיות</a></p><div class="hk-askr" role="status"></div></div>';
  }
  function wireAsk(text) {
    var box = out.querySelector('.hk-ask'); if (!box || LANG !== 'he') return;
    var b = box.querySelector('.hk-askb'), r = box.querySelector('.hk-askr');
    b.onclick = function () {
      b.disabled = true; r.textContent = 'מחפשים…';
      var done = false, t = setTimeout(function () { if (!done) { done = true; r.textContent = ''; b.disabled = false; } }, 9000);
      fetch(ASK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: text.slice(0, 200) }) })
        .then(function (x) { return x.json(); }).then(function (j) {
          if (done) return; done = true; clearTimeout(t);
          var list = (j && j.items || []).filter(function (x) { return x && /^\/[^\/]/.test(x.u); }).slice(0, 5);
          track('hakelim_search', { how: 'ask' });
          if (!list.length) { r.textContent = 'לא מצאתי התאמה טובה. אפשר להציע כלי חדש.'; b.disabled = false; return; }
          r.innerHTML = '<ul class="hk-asl">' + list.map(function (x) {
            return '<li><a href="' + esc(x.u) + '" data-ask="1"><b>' + esc(x.n) + '</b>' + (x.why ? '<span>' + esc(x.why) + '</span>' : '') + '</a></li>';
          }).join('') + '</ul>';
          r.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { try { if (window.gtag) window.gtag('event', 'discover_click', { src: 'ask', to: a.getAttribute('href') }); } catch (e) {} }); });
          b.style.display = 'none';
        }).catch(function () { if (done) return; done = true; clearTimeout(t); r.textContent = ''; b.disabled = false; });
    };
  }
  function suggest(text) {
    shown = [];
    if (LANG !== 'he') { out.innerHTML = '<div class="hk-none"><p>' + UI.all + '</p></div>'; return; }
    out.innerHTML = '<div class="hk-none"><p>לא מצאנו כלי כזה אצלנו.</p>' + askHtml() + '<p>אפשר גם להציע אותו, וגילעד יראה את ההצעה.</p>' +
      '<div class="hk-sg"><textarea rows="2" maxlength="160" aria-label="מה הכלי שחסר">' + esc(text) + '</textarea>' +
      '<input type="email" placeholder="מייל, אם רוצים הודעה כשהכלי מוכן (לא חובה)" maxlength="120" dir="ltr">' +
      '<input class="hk-hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button type="button">שלחו את ההצעה</button><p class="hk-msg" role="status"></p></div>' +
      '<p class="hk-bot">🤖 אפשר גם לכתוב לבוט הכלים בטלגרם, במילים שלכם: <a href="https://t.me/HakelimBot?start=search" target="_blank" rel="noopener">לפתוח את הבוט</a></p></div>';
    wireAsk(text);
    var d = out.querySelector('.hk-sg'), ta = d.querySelector('textarea'), em = d.querySelector('input[type=email]'), hp = d.querySelector('.hk-hp'), b = d.querySelector('button'), m = d.querySelector('.hk-msg');
    b.onclick = function () {
      var what = ta.value.trim();
      if (what.length < 4) { m.textContent = 'כתבו בכמה מילים איזה כלי חסר.'; return; }
      b.disabled = true; m.textContent = 'שולחים…';
      fetch(API + '/req', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ what: what, who: '', dom: '', email: em.value.trim(), hp: hp.value }) })
        .then(function (r) { return r.json(); }).then(function (j) {
          if (j && j.error) { m.textContent = j.error; b.disabled = false; return; }
          track('hakelim_search', { how: 'suggest_sent' });
          d.innerHTML = '<p class="hk-ok">תודה! ההצעה התקבלה' + (j && j.no ? ' (בקשה ' + j.no + ')' : '') + ', וגילעד יראה אותה. <a href="/kelim/bakasha/">לוח הבקשות</a></p>';
        }).catch(function () { m.textContent = 'השליחה לא הצליחה כרגע. נסו שוב בעוד רגע.'; b.disabled = false; });
    };
  }
  // תוצאות מקובצות לפי נושא: עד 3 לנושא ו-9 בסך הכול; "כל התוצאות בנושא" פותח עד 8 בנושא
  function render(res, text, onlyG) {
    shown = [];
    var html = '', n = 0, groups = [], by = {};
    res.forEach(function (x) { var g = x[1].g; if (!by[g]) { by[g] = []; groups.push(g); } by[g].push(x[1]); });
    if (LANG !== 'he') groups = ['_'], by._ = res.map(function (x) { return x[1]; }).slice(0, 9);
    var total = 0;
    groups.forEach(function (g) {
      if (onlyG && g !== onlyG) return;
      var list = by[g], cap = onlyG ? 8 : 3, take = total >= 9 ? [] : list.slice(0, Math.min(cap, 9 - total));
      if (!take.length) return;
      total += take.length;
      var t = topicName[g];
      html += '<div class="hk-grp" role="group"' + (t ? ' aria-label="' + esc(t.n) + '"' : '') + '>' + (t && LANG === 'he' ? '<p class="hk-gh">' + esc(t.e) + ' ' + esc(t.n) + '</p>' : '') +
        take.map(function (it) { return itemHtml(it, n++); }).join('') +
        (!onlyG && list.length > take.length ? '<button type="button" class="hk-more" data-g="' + esc(g) + '">כל התוצאות בנושא (' + list.length + ')</button>' : '') + '</div>';
    });
    out.innerHTML = '<div class="hk-res" role="listbox" aria-label="תוצאות חיפוש">' + html + '</div>' + (LANG === 'he' ? '<p class="hk-miss">לא זה? <a href="#" data-sg>הציעו כלי חדש</a></p>' : '') + ((LANG === 'he' && !onlyG && (tokens(text).length >= 4 || !res.length || res[0][0] < 12)) ? askHtml() : '');
    wireAsk(text);
    var sg = out.querySelector('[data-sg]'); if (sg) sg.onclick = function (e) { e.preventDefault(); suggest(text.trim()); };
    say(UI.n(shown.length));
  }
  var lastText = '', lastRes = [];
  function run(text, how) {
    var tk = tokens(text);
    if (norm(text).length < 2 || !tk.length) { home(); return; }
    load().then(function (c) {
      if (!c) return;
      var res = search(text, LANG), note = '';
      if (!res.length && LANG !== 'he') { res = search(text, 'he'); note = res.length ? '<p class="hk-note">' + UI.none + '</p>' : ''; }
      if (!res.length) { track('hakelim_search', { how: 'no_result' }); try { document.dispatchEvent(new Event('hk-noresult')); } catch (e) {} suggest(text.trim()); setOpen(true); return; }
      lastText = text; lastRes = res; render(res, text);
      if (note) out.insertAdjacentHTML('afterbegin', note);
      setOpen(true);
      if (how) track('hakelim_search', { how: how });
    });
  }

  if (window.__hkTest) window.__hkTest({ load: load, search: search, norm: norm });

  // ---------- אירועים ----------
  var t, typed = false;
  q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { run(q.value, typed ? '' : 'type'); typed = true; }, 160); });
  q.addEventListener('focus', load, { once: true });
  function showHome() { if (norm(q.value).length < 2 && !out.querySelector('.hk-home')) home(); }
  q.addEventListener('focus', showHome);
  q.addEventListener('click', showHome);
  function opts() { return [].slice.call(out.querySelectorAll('.hk-opt, .hk-more, .hk-tp, .hk-back')); }
  function activate(el, move) {
    var all = opts(); all.forEach(function (o) { o.classList.remove('hk-act'); o.removeAttribute('aria-selected'); });
    if (!el) { q.removeAttribute('aria-activedescendant'); return; }
    el.classList.add('hk-act'); el.setAttribute('aria-selected', 'true');
    if (!el.id) el.id = 'hk-x' + all.indexOf(el);
    q.setAttribute('aria-activedescendant', el.id);
    if (move && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
  q.addEventListener('keydown', function (e) {
    var all = opts(), cur = all.indexOf(out.querySelector('.hk-act'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!all.length) return;
      e.preventDefault();
      var nx = e.key === 'ArrowDown' ? (cur + 1) % all.length : (cur <= 0 ? all.length - 1 : cur - 1);
      activate(all[nx], true);
    } else if (e.key === 'Enter' && cur > -1) {
      e.preventDefault(); all[cur].click();
    } else if (e.key === 'Escape') {
      if (out.innerHTML) { e.preventDefault(); out.innerHTML = ''; setOpen(false); say(''); if (q.value) q.value = ''; }
    }
  });
  out.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.hk-opt');
    if (a) { var it = shown[+a.getAttribute('data-i')]; ev('discover_click', { src: 'search', to: a.getAttribute('href'), pos: (+a.getAttribute('data-i')) + 1 }); track('hakelim_search', { how: 'result_pick', to: a.getAttribute('href') }); return; }
    var m = e.target.closest && e.target.closest('.hk-more'); if (m) { render(lastRes, lastText, m.getAttribute('data-g')); track('hakelim_search', { how: 'more_in_topic' }); return; }
    var tp = e.target.closest && e.target.closest('.hk-tp'); if (tp) { showTopic(tp.getAttribute('data-g')); return; }
    if (e.target.closest && e.target.closest('.hk-back')) { home(); }
  });
  document.addEventListener('click', function (e) { if (!box.contains(e.target) && out.innerHTML && !q.value) { out.innerHTML = ''; setOpen(false); } });
  // כפתור 🔍 בסרגל הנדבק וקיצור "/": קופצים לשורת החיפוש ושמים בה פוקוס (שורת החיפוש עצמה לא נדבקת, כדי לא לכסות כלים)
  function goSearch(e) {
    if (e) e.preventDefault();
    box.scrollIntoView({ block: 'start', behavior: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    q.focus({ preventScroll: true });
    showHome();
    track('hakelim_search', { how: 'btn_open' });
  }
  var sb = document.querySelector('.hk-sbtn'); if (sb) sb.addEventListener('click', goSearch);
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var tg = e.target, tag = tg && tg.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tg && tg.isContentEditable)) return;
    goSearch(e);
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); track('hakelim_search', { how: 'submit' }); run(q.value); });

  // "המשכתם לאחרונה": שומרים בדפדפן בלבד את הדף הנוכחי (בלי הקטלוג, בלי דפים רגישים); לא נשלח לשום שרת
  try {
    var p = location.pathname;
    if (LANG === 'he' && p.length > 1 && !/^\/(nefesh|go|k|s|horim)\/|azkara|avel|shiva|levaya|kadish|rega|tmicha/.test(p) && p.split('/').length > 3) {
      var rc = JSON.parse(localStorage.getItem('hk-recent') || '[]').filter(function (r) { return r.u !== p; });
      rc.unshift({ u: p }); localStorage.setItem('hk-recent', JSON.stringify(rc.slice(0, 6)));
    }
  } catch (e) {}
})();
