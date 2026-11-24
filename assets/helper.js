/* עוזר צף "עזרה במציאת כלי": כפתור קטן, בועה אחת בביקור, ושיחה קצרה מול /ask. הטקסט נשלח רק בלחיצה על "מצאו לי". */
(function () {
  var NEW = [["/kodesh/tefillin/afula/","זמן הנחת תפילין עפולה"],["/kesef/zchuyot-pitorin/","מחשבון זכויות בפיטורין"],["/kesef/shaot-nosafot/","מחשבון שעות נוספות"],["/kesef/pitzuyim-shaati/","מחשבון פיצויי פיטורין לעובד שעתי"],["/kesef/pitzuyim-pitorin/","מחשבון פיצויי פיטורין"],["/kesef/pidyon-chufsha/","מחשבון פדיון חופשה"],["/kesef/hodaa-mukdemet/","מחשבון הודעה מוקדמת"],["/kesef/dmey-havraa/","מחשבון דמי הבראה"],["/kesef/delek/","מחשבון דלק"],["/kelim/shir/metronom/","מטרונום"],["/kelim/shir/kivun-gitara/","כיוון גיטרה"],["/kelim/machshevon-leroe-cheshbon/","מחשבון לאתר רואה חשבון"]], SF = ["/kelim/chashiva/","/kelim/chashiva/avanim/","/kelim/chashiva/bingo/","/kelim/chashiva/bingo/yeladim/","/kelim/chashiva/blackjack/","/kelim/chashiva/chidon/","/kelim/chashiva/chidon/sheelot/","/kelim/chashiva/damka/","/kelim/chashiva/galgal-shemot/","/kelim/chashiva/galgal/","/kelim/chashiva/galgal/ken-o-lo/","/kelim/chashiva/galgal/sheelot/","/kelim/chashiva/gil-shlishi/","/kelim/chashiva/hagrala/","/kelim/chashiva/kita/","/kelim/chashiva/kita/beit-sefer/","/kelim/chashiva/klafim/","/kelim/chashiva/kubiya/","/kelim/chashiva/lishnayim/","/kelim/chashiva/luach/","/kelim/chashiva/matbea/","/kelim/chashiva/mila/","/kelim/chashiva/mokshim/","/kelim/chashiva/poker/","/kelim/chashiva/reviiot/","/kelim/chashiva/shachmat/","/kelim/chashiva/shachor/","/kelim/chashiva/shesh-besh/","/kelim/chashiva/snake/","/kelim/chashiva/solitaire/","/kelim/chashiva/sudoku/","/kelim/chashiva/sudoku/beinoni/","/kelim/chashiva/sudoku/kal/","/kelim/chashiva/sudoku/kashe/","/kelim/chashiva/sudoku/lehadpasa/","/kelim/chashiva/sudoku/pitaron/","/kelim/chashiva/sudoku/yeladim/","/kelim/chashiva/tashbetz/","/kelim/chashiva/tashchetz/","/kelim/chashiva/tifzoret/","/kelim/chashiva/tzviya-misparim/","/kelim/chashiva/yaniv/","/kelim/chashiva/yeladim/","/kodesh/azkara/","/kodesh/tahara/shiva-nekiyim/","/nefesh/","/nefesh/hayom/","/nefesh/koach/","/nefesh/michtav/","/nefesh/mishpacha/","/nefesh/rega/","/nefesh/tmicha/","/nefesh/yoman/"];
  var ASK = 'https://kelim-ask.gilad4049.workers.dev/ask', p = location.pathname, d = document;
  if (!d.body || d.documentElement.classList.contains('in-app') || SF.indexOf(p) > -1 || /^\/(nefesh|go|k|s|horim|mohel)\/|azkara|avel|shiva|levaya|kadish|rega|tmicha|nefesh/.test(p)) return;
  var OFF = 'hk-hbub-ts', now = Date.now();
  function gt(n, o) { try { if (window.gtag) window.gtag('event', n, o); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var s = d.createElement('style');
  s.textContent = '.hk-hb{position:fixed;inset-inline-start:.8rem;bottom:5.4rem;z-index:41;width:52px;height:52px;border-radius:50%;border:2px solid #1b1b1b;background:#d8b35f;color:#1b1b1b;font-size:1.5rem;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)}.hk-hb:focus-visible,.hk-hp button:focus-visible,.hk-hp a:focus-visible,.hk-hp textarea:focus-visible{outline:3px solid #6b5314;outline-offset:2px}' +
    '.hk-hq{position:fixed;inset-inline-start:.8rem;bottom:9.4rem;z-index:41;max-width:15rem;padding:.5rem .7rem;border-radius:.7rem;background:#1b1b1b;color:#f3ead2;border:1px solid #d8b35f;font-size:.9rem;line-height:1.4}' +
    '.hk-hp{position:fixed;inset-inline:.6rem;bottom:.6rem;z-index:60;max-width:26rem;margin-inline-start:.6rem;margin-inline-end:auto;max-height:80vh;overflow:auto;padding:.8rem;border-radius:.9rem;background:#fff;color:#1b1b1b;border:2px solid #d8b35f;box-shadow:0 10px 30px rgba(0,0,0,.4);font-size:.95rem;line-height:1.45}' +
    '.hk-hp h2{margin:0 0 .4rem;font-size:1.05rem}.hk-hp textarea{width:100%;box-sizing:border-box;font:inherit;padding:.5rem;border:1px solid #888;border-radius:.5rem;color:#1b1b1b;background:#fff}.hk-hp button{font:inherit;min-height:44px;padding:.4rem .9rem;border-radius:.5rem;border:0;background:#d8b35f;color:#1b1b1b;font-weight:700;cursor:pointer}.hk-hp .hk-x{float:inline-end;background:transparent;font-size:1.3rem;min-width:44px;padding:0}' +
    '.hk-hp ul{list-style:none;margin:.5rem 0 0;padding:0}.hk-hp li a{display:block;min-height:44px;box-sizing:border-box;padding:.45rem .5rem;border-radius:.4rem;color:#1b1b1b;text-decoration:none;border:1px solid #e3d7b0;margin-bottom:.3rem}.hk-hp li a:hover{background:#f0ead7}.hk-hp li span{display:block;font-size:.85rem;color:#555}.hk-hp small{display:block;color:#555;margin:.4rem 0}.hk-hp .hk-c{display:flex;flex-wrap:wrap;gap:.4rem;margin:.4rem 0}.hk-hp .hk-c button{background:#fbf6e6;border:1px solid #d8b35f}.hk-hp .hk-m a{color:#6b5314}@media print,(prefers-reduced-motion:reduce){.hk-hb,.hk-hq{animation:none}}@media print{.hk-hb,.hk-hq,.hk-hp{display:none}}';
  d.head.appendChild(s);
  var btn = d.createElement('button'); btn.type = 'button'; btn.className = 'hk-hb'; btn.setAttribute('aria-label', 'עזרה במציאת כלי'); btn.textContent = '💡';
  d.body.appendChild(btn);
  function lift() { var bar = d.getElementById('install-bar'); var h = bar && !bar.hidden && bar.offsetHeight ? bar.offsetHeight : 0; btn.style.bottom = (86 + h) + 'px'; }
  lift(); setTimeout(lift, 1500);
  var bub = null, panel = null, bubShown = false;
  function closeBub() { if (bub) { bub.remove(); bub = null; } }
  function showBub() {
    if (bubShown || panel || window.__hkSlot) return; bubShown = true;
    try { if (sessionStorage.getItem('hk-hbub') || now - (+localStorage.getItem(OFF) || 0) < 30 * 864e5) return; sessionStorage.setItem('hk-hbub', '1'); localStorage.setItem(OFF, String(now)); } catch (e) {}
    bub = d.createElement('div'); bub.className = 'hk-hq'; bub.setAttribute('role', 'status');
    bub.textContent = 'מחפשים משהו? תארו במילים שלכם ואמצא כלי';
    var h = btn.style.bottom; bub.style.bottom = (parseInt(h, 10) + 62) + 'px'; d.body.appendChild(bub);
    setTimeout(closeBub, 12000);
  }
  var idle = setTimeout(showBub, 20000);
  ['pointerdown', 'keydown', 'scroll'].forEach(function (e) { addEventListener(e, function () { clearTimeout(idle); idle = setTimeout(showBub, 20000); }, { passive: true }); });
  d.addEventListener('hk-noresult', showBub);
  function open() {
    if (panel) return; closeBub(); clearTimeout(idle); gt('discover_click', { src: 'helper', to: 'open' });
    panel = d.createElement('div'); panel.className = 'hk-hp'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'עזרה במציאת כלי');
    panel.innerHTML = '<button type="button" class="hk-x" aria-label="סגירה">×</button><h2>במה לעזור?</h2>' +
      '<textarea rows="2" maxlength="200" aria-label="תארו במילים שלכם מה אתם צריכים" placeholder="למשל: להכין קורות חיים, או לחשב ימי מילואים"></textarea>' +
      '<div class="hk-c"><button type="button" class="hk-go">מצאו לי</button><button type="button" data-q="now">מה מתאים עכשיו?</button><button type="button" data-q="new">מה חדש?</button></div>' +
      '<small>השאלה נשלחת לשרת כדי למצוא כלי, בלי פרטים מזהים. אל תכתבו שם או טלפון.</small><div class="hk-r" role="status"></div>' +
      '<p class="hk-m"><a href="/kelim/bakasha/">לא זה? הציעו כלי חדש</a> · <a href="https://t.me/HakelimBot?start=helper" target="_blank" rel="noopener">להמשיך בטלגרם</a></p>';
    d.body.appendChild(panel);
    var ta = panel.querySelector('textarea'), r = panel.querySelector('.hk-r');
    function list(a, src) {
      if (!a.length) { r.textContent = 'לא מצאתי התאמה טובה. אפשר להציע כלי חדש.'; return; }
      r.innerHTML = '<ul>' + a.slice(0, 3).map(function (x) { return '<li><a href="' + esc(x.u) + '"><b>' + esc(x.n) + '</b>' + (x.why ? '<span>' + esc(x.why) + '</span>' : '') + '</a></li>'; }).join('') + '</ul>';
      r.querySelectorAll('a').forEach(function (l) { l.addEventListener('click', function () { gt('discover_click', { src: src, to: l.getAttribute('href') }); }); });
    }
    function names(urls) {
      return fetch('/assets/catalog.json').then(function (x) { return x.json(); }).then(function (c) {
        var by = {}; c.items.forEach(function (i) { by[i.u] = i; });
        return urls.filter(function (u) { return by[u] && !by[u].sf; }).map(function (u) { return { u: u, n: by[u].n.split(':')[0].split(',')[0].split(' – ')[0].trim(), why: (by[u].d || '').slice(0, 90) }; });
      });
    }
    panel.querySelector('.hk-x').onclick = close;
    panel.querySelector('.hk-go').onclick = function () {
      var q = ta.value.trim(); if (q.length < 3) { r.textContent = 'כתבו בכמה מילים מה אתם צריכים.'; return; }
      r.textContent = 'מחפשים…'; var done = false, t = setTimeout(function () { if (!done) { done = true; r.textContent = 'לא הצלחתי כרגע. אפשר לנסות בטלגרם.'; } }, 9000);
      fetch(ASK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: q.slice(0, 200) }) }).then(function (x) { return x.json(); }).then(function (j) {
        if (done) return; done = true; clearTimeout(t); gt('hakelim_search', { how: 'helper' });
        list((j.items || []).filter(function (x) { return x && /^\/[^\/]/.test(x.u); }), 'helper');
      }).catch(function () { if (!done) { done = true; clearTimeout(t); r.textContent = 'לא הצלחתי כרגע. אפשר לנסות בטלגרם.'; } });
    };
    panel.querySelectorAll('[data-q]').forEach(function (b) {
      b.onclick = function () {
        var urls = b.getAttribute('data-q') === 'now' ? ((window.hkNow && window.hkNow()) || []) : NEW.map(function (x) { return x[0]; });
        if (!urls.length) { r.textContent = 'עכשיו אין הצעה מיוחדת. תארו במילים שלכם מה צריך.'; return; }
        names(urls).then(function (a) { list(a, 'helper'); }).catch(function () { r.textContent = ''; });
      };
    });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    ta.focus();
  }
  function close() { if (!panel) return; panel.remove(); panel = null; btn.focus(); }
  btn.onclick = function () { open(); };
})();
