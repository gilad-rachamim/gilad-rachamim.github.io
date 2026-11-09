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
      var url = location.origin + location.pathname + '?utm_source=share&utm_medium=friend&utm_campaign=' + (body.getAttribute('data-tool') || site);
      var text = s.getAttribute('data-text') || document.title;
      ev('share', { tool: body.getAttribute('data-tool') || '', how: s.getAttribute('data-share-tool') });
      if (s.getAttribute('data-share-tool') === 'native' && navigator.share) {
        e.preventDefault();
        navigator.share({ title: document.title, text: text, url: url }).catch(function () {});
      } else if (s.tagName === 'A') {
        s.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text + '\n' + url);
      }
    }
  }, true);

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
          ? 'תודה רבה! קיבלתי את הרעיון. אני עובר על כל בקשה, ואחזור אליכם בווטסאפ.'
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
