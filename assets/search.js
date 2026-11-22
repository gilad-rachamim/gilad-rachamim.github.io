/* חיפוש בראש כל דף באתר: טקסט חופשי בעברית על כל הדפים והכלים.
   אין תוצאה? מציעים לשלוח בקשה לכלי חדש (השרת kelim-bakasha, אותו שרת של /kelim/bakasha/). */
(function () {
  'use strict';
  var box = document.getElementById('hk-search');
  if (!box) return;
  var API = 'https://kelim-bakasha.gilad4049.workers.dev';
  var idx = null, loading = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[֑-ׇ]/g, '').replace(/[׳'"”“״]/g, '').replace(/[^א-תa-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  // מורידים קידומת דקדוקית (ה/ב/ל/ו/כ/מ/ש) כדי ש"לתרגם" ימצא "תרגום"
  function stem(w) { return w.length > 3 && /^[הבלוכמש]/.test(w) ? w.slice(1) : w; }
  function track(name, extra) { try { if (window.toolUsed) window.toolUsed(name, extra || {}); } catch (e) {} }
  box.innerHTML = '<form class="hk-s" role="search" autocomplete="off"><label class="hk-s-l" for="hk-q">חיפוש כלי או דף באתר</label>' +
    '<div class="hk-s-row"><input id="hk-q" type="search" inputmode="search" enterkeyhint="search" placeholder="חפשו כלי: מה אתם רוצים לעשות?" maxlength="80">' +
    '<button type="submit">חיפוש</button></div><div class="hk-s-out" aria-live="polite"></div></form>';
  var form = box.firstChild, q = form.querySelector('input'), out = form.querySelector('.hk-s-out');
  function load() {
    if (idx) return Promise.resolve(idx);
    if (!loading) loading = fetch('/assets/search-index.json').then(function (r) { return r.json(); }).then(function (j) {
      j.forEach(function (it) { it._n = norm(it.n + ' ' + it.t); it._d = norm(it.d); it._u = norm(it.u.replace(/[\/-]+/g, ' ')); });
      return (idx = j);
    }).catch(function () { loading = null; return []; });
    return loading;
  }
  function score(it, words) {
    var s = 0, hit = 0;
    words.forEach(function (w) {
      var st = stem(w), a = 0;
      if (it._n.indexOf(w) > -1) a = 6; else if (it._n.indexOf(st) > -1) a = 5;
      else if (it._d.indexOf(w) > -1) a = 3; else if (it._d.indexOf(st) > -1) a = 2;
      else if (it._u.indexOf(st) > -1) a = 1;
      if (a) { hit++; s += a; }
    });
    if (!hit) return 0;
    if (words.length > 1 && hit < Math.ceil(words.length / 2)) return 0;
    return s + hit * 2;
  }
  function suggest(text) {
    out.innerHTML = '<div class="hk-none"><p>לא מצאנו כלי כזה אצלנו. אפשר להציע אותו, וגילעד יראה את ההצעה.</p>' +
      '<div class="hk-sg"><textarea rows="2" maxlength="160" aria-label="מה הכלי שחסר">' + esc(text) + '</textarea>' +
      '<input type="email" placeholder="מייל, אם רוצים הודעה כשהכלי מוכן (לא חובה)" maxlength="120" dir="ltr">' +
      '<input class="hk-hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button type="button">שלחו את ההצעה</button><p class="hk-msg" role="status"></p></div></div>';
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
  function run(text) {
    var n = norm(text);
    if (n.length < 2) { out.innerHTML = ''; return; }
    var words = n.split(' ').filter(function (w) { return w.length > 1; });
    load().then(function (list) {
      var res = list.map(function (it) { return [score(it, words), it]; }).filter(function (x) { return x[0] > 0; })
        .sort(function (a, b) { return b[0] - a[0]; }).slice(0, 8);
      if (!res.length) { track('hakelim_search', { how: 'no_result' }); suggest(text.trim()); return; }
      out.innerHTML = '<ul class="hk-res">' + res.map(function (x) { return '<li><a href="' + esc(x[1].u) + '"><b>' + esc(x[1].n) + '</b>' + (x[1].d ? '<span>' + esc(x[1].d) + '</span>' : '') + '</a></li>'; }).join('') +
        '</ul><p class="hk-miss">לא זה? <a href="#" data-sg>הציעו כלי חדש</a></p>';
      out.querySelector('[data-sg]').onclick = function (e) { e.preventDefault(); suggest(text.trim()); };
    });
  }
  var t; q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { run(q.value); }, 180); });
  q.addEventListener('focus', load, { once: true });
  form.addEventListener('submit', function (e) { e.preventDefault(); track('hakelim_search', { how: 'submit' }); run(q.value); });
})();
