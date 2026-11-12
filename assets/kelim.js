// הכלים של גילעד רחמים – משותף לכל הדפים: אפליקציה לטלפון (PWA), טפסים, תמיכה ושיתוף.
(function () {
  'use strict';
  var body = document.body, site = body.getAttribute('data-site') || 'kelim', home = body.getAttribute('data-home') || '/kelim/';
  function ev(name, params) { if (window.gtag) window.gtag('event', name, Object.assign({ site: site, page: location.pathname }, params || {})); }
  window.kelimEv = ev;
  // כל כלי קורא לזה כשהשימוש הצליח (חישוב, תמלול...). אירוע אחד: tool_use{site,tool}
  window.toolUsed = function (tool, extra) { ev('tool_use', Object.assign({ tool: tool || body.getAttribute('data-tool') || '' }, extra || {})); };

  // ---------- אפליקציה לטלפון ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register(home + 'sw.js', { scope: home }).catch(function () {});
  }
  var deferred = null, bar = document.getElementById('install-bar');
  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  var closed = false, visits = 1;
  try { closed = Date.now() - (+localStorage.getItem('kelim-install-closed-at') || 0) < 14 * 864e5; } catch (e) {}
  try { visits = (+localStorage.getItem('kelim-visits') || 0) + 1; localStorage.setItem('kelim-visits', visits); } catch (e) {}
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  function showInstall() {
    document.querySelectorAll('[data-install-wrap]').forEach(function (w) { w.hidden = false; });
    if (bar && !closed) bar.hidden = false;
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; showInstall(); });
  if (ios && !standalone) {
    document.querySelectorAll('[data-install-wrap]').forEach(function (w) { w.hidden = false; });
    if (bar && !closed && visits >= 2) {
      var it = bar.querySelector('[data-install-text]'), ib = bar.querySelector('[data-install]');
      if (it) it.innerHTML = '📲 באייפון: לוחצים על כפתור השיתוף <b>⬆︎</b> למטה, ואז "הוספה למסך הבית". מעכשיו הכלים נפתחים בלחיצה, כמו אפליקציה.';
      if (ib) ib.style.display = 'none';
      bar.hidden = false; ev('tool_install', { how: 'ios_bar' });
    }
  }
  window.addEventListener('appinstalled', function () { ev('tool_install', { how: 'installed' }); if (bar) bar.hidden = true; });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-install]');
    if (b) {
      if (deferred) {
        deferred.prompt();
        deferred.userChoice.then(function (c) { ev('tool_install', { how: 'prompt', outcome: c.outcome }); deferred = null; if (bar) bar.hidden = true; });
      } else {
        var tip = document.getElementById('ios-tip');
        if (tip) { tip.hidden = false; tip.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        ev('tool_install', { how: ios ? 'ios_tip' : 'tip' });
      }
      return;
    }
    if (e.target.closest('[data-install-close]')) {
      if (bar) bar.hidden = true;
      try { localStorage.setItem('kelim-install-closed-at', String(Date.now())); } catch (err) {}
      return;
    }
    // תמיכה: העתקת המספר לביט/פייבוקס
    var d = e.target.closest('[data-donate]');
    if (d) {
      var how = d.getAttribute('data-donate');
      ev('donate_click', { how: how });
      if (how === 'copy') {
        var num = d.getAttribute('data-num') || '0584049049';
        (navigator.clipboard ? navigator.clipboard.writeText(num) : Promise.reject()).then(function () {
          d.textContent = 'הועתק ✓ עכשיו לפתוח את ביט או פייבוקס';
        }).catch(function () { d.textContent = num; });
      }
    }
    // שיתוף
    var s = e.target.closest('[data-share-tool]');
    if (s) {
      var how = s.getAttribute('data-share-tool');
      var url = 'https://hakelim.com' + location.pathname; // קישור נקי וקצר (בלי utm), כמו בכל שיתוף באתר – assets/kishur.js
      var text = s.getAttribute('data-text') || document.title;
      ev('share', { tool: body.getAttribute('data-tool') || '', how: how });
      if (how === 'native' && navigator.share) {
        e.preventDefault();
        navigator.share({ title: document.title, text: text, url: url }).catch(function () {});
      } else if (how === 'copy') {
        e.preventDefault();
        copyText(text + '\n' + url, s, 'הקישור הועתק ✓ אפשר להדביק בכל הודעה');
      } else if (how === 'sms' && s.tagName === 'A') {
        // אנדרואיד ואייפון מבינים את שתי הצורות; ?&body= עובד בשניהם
        s.href = 'sms:?&body=' + encodeURIComponent(text + '\n' + url);
      } else if (s.tagName === 'A') {
        s.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text + '\n' + url);
      }
    }
    // כפתור העתקה כללי: data-copy="הטקסט" או data-copy-from="#id"
    var cp = e.target.closest('[data-copy],[data-copy-from]');
    if (cp) {
      e.preventDefault();
      var src = cp.getAttribute('data-copy-from'), el = src && document.querySelector(src);
      copyText(el ? (el.value || el.textContent).trim() : cp.getAttribute('data-copy'), cp, cp.getAttribute('data-copied') || 'הועתק ✓');
      ev('copy_click', { what: cp.getAttribute('data-copy-what') || src || '' });
    }
  }, true);

  // העתקה ללוח, גם בדפדפנים ישנים או מסוננים שאין בהם navigator.clipboard
  function copyText(t, btn, okMsg) {
    var old = btn.getAttribute('data-old') || btn.innerHTML;
    btn.setAttribute('data-old', old);
    function ok() { btn.textContent = okMsg; setTimeout(function () { btn.innerHTML = old; }, 3500); }
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-9999px';
      document.body.appendChild(ta); ta.select();
      var done = false; try { done = document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(ta);
      if (done) ok(); else window.prompt('להעתיק את זה:', t);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(ok, legacy);
    else legacy();
  }
  window.kelimCopy = copyText;

  // ליד כל כפתור "לשלוח בווטסאפ": גם SMS וגם העתקת קישור.
  // לא לכולם יש ווטסאפ: בטלפון כשר או מסונן הוא לעיתים חסום.
  function addShareAlts(root) {
    (root || document).querySelectorAll('a[data-share-tool="wa"]:not([data-alts])').forEach(function (a) {
      a.setAttribute('data-alts', '1');
      if (a.closest('.topbar,.no-alts')) return;
      var t = a.getAttribute('data-text');
      var wrap = document.createElement('span');
      wrap.className = 'share-alts';
      wrap.innerHTML = '<a class="btn btn-line btn-sm" href="sms:" data-share-tool="sms">📱 ב-SMS</a><button class="btn btn-line btn-sm" type="button" data-share-tool="copy">🔗 להעתיק קישור</button>';
      if (t) wrap.querySelectorAll('[data-share-tool]').forEach(function (b) { b.setAttribute('data-text', t); });
      a.insertAdjacentElement('afterend', wrap);
    });
  }
  addShareAlts();
  if (window.MutationObserver) new MutationObserver(function (m) {
    for (var i = 0; i < m.length; i++) if (m[i].addedNodes.length) { addShareAlts(); break; }
  }).observe(document.body, { childList: true, subtree: true });

  // ---------- טפסים ("רוצים כלי?", "רוצים לתרום?") → גיליון הלידים הקיים, עם תגית ----------
  // צינור הלידים שולח מייל עם מדריך הברית למי שממלא מייל, לכן כאן אין שדה email:
  // התגית והפרטים נכנסים לעמודות "מקור" ו"עיר", וגילעד מקבל אותם במייל ההתראה.
  document.querySelectorAll('form[data-kform]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var hp = form.querySelector('[name=_honey]');
      if (hp && hp.value) return;
      var kind = form.getAttribute('data-kform'); // tool / truma
      var g = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      var checks = Array.prototype.map.call(form.querySelectorAll('input[type=checkbox]:checked'), function (c) { return c.value; }).join(', ');
      var fd = new FormData();
      fd.append('שם', g('name'));
      var toolName = (document.title.split('|')[0].split(' – ')[0] || '').trim(), toolId = body.getAttribute('data-tool') || '';
      if (kind === 'shipur') {
        var ct = g('contact'), isMail = ct.indexOf('@') > -1;
        fd.append('טלפון', isMail ? '' : ct); fd.append('email', isMail ? ct : '');
        fd.append('עיר', 'שיפור כלי · ' + site + ' · ' + toolName);
        var nameOk = form.querySelector('[name=name_ok]:checked') && g('name') ? ' · ✔ מותר לפרסם שם פרטי' : '';
        fd.append('מקור', 'כלים: שיפור · ' + toolName + ' (' + toolId + ') · ' + g('what') + nameOk);
      } else fd.append('טלפון', g('phone'));
      if (kind === 'shipur') {}
      else if (kind === 'tool') {
        fd.append('עיר', 'בקשת כלי · ' + (g('domain') || 'כללי') + ' · ' + (g('for') || ''));
        fd.append('מקור', 'כלים: בקשת כלי (' + (g('use') || '') + ') · ' + g('what') + (g('contact') ? ' · מייל: ' + g('contact') : ''));
      } else {
        fd.append('עיר', 'תרומה ושותפות · ' + checks);
        fd.append('מקור', 'כלים: רוצים לתרום · ' + checks + ' · ' + g('note') + (g('contact') ? ' · מייל: ' + g('contact') : ''));
      }
      fd.append('_page', location.pathname);
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'שולח…';
      if (kind === 'shipur') ev('tool_suggest', { tool: toolId });
      else ev(kind === 'tool' ? 'request_tool' : 'donate_click', kind === 'tool' ? { domain: g('domain'), use: g('use') } : { how: 'form', what: checks });
      var finish = function () {
        form.innerHTML = '<div class="done" role="status">' + (kind === 'shipur' ? 'תודה רבה! 🙏 קיבלתי את ההצעה. אני קורא כל אחת, ואעדכן אותך כשהכלי ישתפר.' : kind === 'tool'
          ? 'תודה רבה! קיבלתי את הרעיון, והוא נשמר. את כל הבקשות ומה נבנה רואים בדף בקשת הכלי.'
          : 'תודה מכל הלב! קיבלתי, ואחזור אליכם בווטסאפ.') + '</div>';
      };
      fetch(form.getAttribute('action'), { method: 'POST', body: fd, mode: 'no-cors', keepalive: true }).catch(function () {}).then(finish);
    });
  });
  // "הכלי עזר לך?" + הצעה לשיפור, בתחתית כל כלי. הדירוג נספר ב-GA (tool_rating), פעם אחת לכל כלי בטלפון.
  (function () {
    var fb = document.querySelector('[data-fb]'); if (!fb) return;
    var tool = body.getAttribute('data-tool') || location.pathname, key = 'kelim-rated:' + tool;
    var title = (document.title.split('|')[0].split(' – ')[0] || '').trim();
    var wa = fb.querySelector('[data-fb-wa]');
    if (wa) wa.href = 'https://wa.me/972584049049?text=' + encodeURIComponent('שלום גילעד, יש לי רעיון לשיפור הכלי "' + title + '": ');
    var rate = fb.querySelector('.fb-rate'), thanks = fb.querySelector('.fb-thanks'), more = fb.querySelector('.fb-more');
    var done = null; try { done = localStorage.getItem(key); } catch (e) {}
    function after(r) {
      rate.hidden = true; thanks.hidden = false;
      var sh = fb.querySelector('.fb-share'); if (sh) sh.hidden = r !== 'yes';
      thanks.textContent = r === 'yes' ? 'שמח לשמוע! 🙏 ואם יש משהו שהיה עושה אותו עוד יותר טוב, ספרו לי למטה.' : 'תודה על הכנות. ספרו לי מה חסר, ואשתדל לתקן.';
    }
    if (done) after(done);
    rate.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rate]'); if (!b) return;
      var r = b.getAttribute('data-rate');
      ev('tool_rating', { tool: tool, rating: r });
      try { localStorage.setItem(key, r); } catch (er) {}
      after(r); if (r === 'no') more.open = true;
    });
    more.addEventListener('toggle', function () { if (more.open) ev('tool_suggest_open', { tool: tool }); });
  })();
})();

// כיתות (/kelim/chashiva/kita/): מי שהצטרף לכיתה – טוענים את kita.js, שמוסיף נקודות מהמשחקים ומהתרגול ללוח הכיתה.
(function () {
  try {
    if (!localStorage.getItem('kita-me') || document.querySelector('script[src^="/assets/kita.js"]')) return;
    var s = document.createElement('script'); s.src = '/assets/kita.js?d=' + new Date().toISOString().slice(0, 10); s.defer = true; document.head.appendChild(s);
  } catch (e) {}
})();

// קוד שותף (פס "בחינם, ללא הגבלה" בכלים עם מכסה): נשמר ב-'kelim-partner' וגם ב-'chaye-code' (ההחייאה קוראת משם)
(function () {
  var inp = document.querySelector('[data-partner-code]'); if (!inp) return;
  var ok = document.querySelector('[data-partner-ok]'), box = inp.closest('details');
  var get = function (k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  var cur = get('kelim-partner') || get('chaye-code');
  if (cur) { inp.value = cur; if (ok) ok.hidden = false; }
  inp.addEventListener('input', function () {
    var v = inp.value.replace(/\s/g, ''), good = /^\d{3}-?\d{5}$/.test(v);
    try { if (good) { localStorage.setItem('kelim-partner', v); localStorage.setItem('chaye-code', v); var tq = JSON.parse(localStorage.getItem('kelim-tamlul') || '{}'); tq.free = true; localStorage.setItem('kelim-tamlul', JSON.stringify(tq)); } else if (!v) { localStorage.removeItem('kelim-partner'); } } catch (e) {}
    if (ok) ok.hidden = !good;
    if (good && window.gtag) gtag('event', 'partner_code_saved', { tool: document.body.getAttribute('data-tool') || '' });
  });
  if (box) box.addEventListener('toggle', function () { if (box.open) inp.focus(); });
})();

// נגישות (WCAG 2.1.1, 12.11.2026): אזור עם גלילה פנימית (קוד, כרטיס רחב, טבלה) מקבל פוקוס מקלדת,
// כדי שמי שלא משתמש בעכבר יוכל לגלול אותו בחיצים. רק כשיש בו באמת מה לגלול ואין בו כבר משהו לחיץ.
(function () {
  var main = document.getElementById('main'); if (!main || !window.getComputedStyle) return;
  var FOC = 'a[href],button,input,select,textarea,[tabindex]';
  function scan() {
    var els = main.querySelectorAll('pre,div,section,table,figure,ul,ol,p');
    for (var i = 0; i < els.length; i++) {
      var el = els[i]; if (el.hasAttribute('tabindex')) continue;
      var cs = getComputedStyle(el), sc = /(auto|scroll)/, pre = el.tagName === 'PRE' && (sc.test(cs.overflowX) || sc.test(cs.overflowY));
      if (!pre && !(sc.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) && !(sc.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1)) continue;
      if (el.querySelector(FOC)) continue;
      el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('aria-label') && !el.hasAttribute('role')) { el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'אזור עם גלילה'); }
    }
  }
  var t; function later() { clearTimeout(t); t = setTimeout(scan, 400); }
  window.addEventListener('load', later); window.addEventListener('resize', later);
  if (window.MutationObserver) new MutationObserver(later).observe(main, { childList: true, subtree: true });
})();

// נגישות (WCAG 4.1.2, 12.11.2026): כפתורי בחירה בקבוצה (צ'יפים, לשוניות, מקטעים) מסמנים את הבחירה רק בצבע (class "on").
// כאן הבחירה נמסרת גם לקורא מסך: aria-pressed="true/false". נוגעים רק בקבוצה שבה כפתור כלשהו באמת מסומן כנבחר,
// ורק בכפתורים שהכלי עצמו לא הגדיר להם תפקיד או מצב.
(function () {
  var main = document.getElementById('main'); if (!main) return;
  var GRP = /(^|[\s-])(chips|seg|tabs|opts|pills|toggle)(\s|$)/, ON = /(^|\s)(on|active|sel|selected|picked)(\s|$)/;
  function own(b) { return b.hasAttribute('data-ap') || !(b.hasAttribute('aria-pressed') || b.hasAttribute('aria-selected') || b.hasAttribute('aria-checked') || b.hasAttribute('role')); }
  function sync() {
    var gs = main.querySelectorAll('[class]');
    for (var i = 0; i < gs.length; i++) {
      var g = gs[i]; if (!GRP.test(g.className) || typeof g.className !== 'string' || g.getAttribute('role') === 'tablist') continue;
      var bs = [], any = false;
      for (var j = 0; j < g.children.length; j++) { var b = g.children[j]; if (b.tagName === 'BUTTON' && own(b)) { bs.push(b); if (ON.test(b.className)) any = true; } }
      if (!any && !(bs.length && bs[0].hasAttribute('data-ap'))) continue;
      bs.forEach(function (b) { b.setAttribute('data-ap', ''); var v = ON.test(b.className) ? 'true' : 'false'; if (b.getAttribute('aria-pressed') !== v) b.setAttribute('aria-pressed', v); });
    }
  }
  var t; function later() { clearTimeout(t); t = setTimeout(sync, 150); }
  sync(); window.addEventListener('load', later);
  if (window.MutationObserver) new MutationObserver(later).observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})();
