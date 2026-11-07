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
  var closed = false;
  try { closed = localStorage.getItem('kelim-install-closed') === '1'; } catch (e) {}
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  function showInstall() {
    document.querySelectorAll('[data-install-wrap]').forEach(function (w) { w.hidden = false; });
    if (bar && !closed) bar.hidden = false;
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; showInstall(); });
  if (ios && !standalone) document.querySelectorAll('[data-install-wrap]').forEach(function (w) { w.hidden = false; });
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
      try { localStorage.setItem('kelim-install-closed', '1'); } catch (err) {}
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
      fd.append('טלפון', g('phone'));
      if (kind === 'tool') {
        fd.append('עיר', 'בקשת כלי · ' + (g('domain') || 'כללי') + ' · ' + (g('for') || ''));
        fd.append('מקור', 'כלים: בקשת כלי (' + (g('use') || '') + ') · ' + g('what') + (g('contact') ? ' · מייל: ' + g('contact') : ''));
      } else {
        fd.append('עיר', 'תרומה ושותפות · ' + checks);
        fd.append('מקור', 'כלים: רוצים לתרום · ' + checks + ' · ' + g('note') + (g('contact') ? ' · מייל: ' + g('contact') : ''));
      }
      fd.append('_page', location.pathname);
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'שולח…';
      ev(kind === 'tool' ? 'request_tool' : 'donate_click', kind === 'tool' ? { domain: g('domain'), use: g('use') } : { how: 'form', what: checks });
      var finish = function () {
        form.innerHTML = '<div class="done" role="status">' + (kind === 'tool'
          ? 'תודה רבה! קיבלתי את הרעיון. אני עובר על כל בקשה, ואחזור אליכם בווטסאפ.'
          : 'תודה מכל הלב! קיבלתי, ואחזור אליכם בווטסאפ.') + '</div>';
      };
      fetch(form.getAttribute('action'), { method: 'POST', body: fd, mode: 'no-cors', keepalive: true }).catch(function () {}).then(finish);
    });
  });
})();
