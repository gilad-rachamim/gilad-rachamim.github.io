/* Shared iPhone install panel for /kelim/iphone/* pages.
   Shows only on iPhone/iPad when the page is not already opened from the home screen.
   Uses the same "closed" key as the site-wide install bar in kelim.js, so one dismiss covers both. */
(function () {
  var KEY = 'kelim-install-closed-at';
  var ua = navigator.userAgent || '';
  var ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  var inApp = /FBAN|FBAV|Instagram|Line\/|WhatsApp|Telegram|GSA\//i.test(ua);
  var closed = false;
  try { closed = Date.now() - (+localStorage.getItem(KEY) || 0) < 14 * 864e5; } catch (e) {}
  var force = /[?&]ip-install=1/.test(location.search);
  if (!force && (!ios || standalone || closed)) return;

  function ev(n, p) { try { if (window.kelimEv) window.kelimEv(n, p || {}); } catch (e) {} }
  var SHARE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var PLUS = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function build(box) {
    var steps = inApp
      ? '<li>הדף נפתח בתוך אפליקציה (ווטסאפ, פייסבוק או אחרת). לוחצים על <b>⋯</b> או על החץ, ובוחרים <b>פתיחה ב-Safari</b>.</li>' +
        '<li>ב-Safari לוחצים על כפתור <b>השיתוף</b> <span class="ipi-ic">' + SHARE + '</span> (אם לא רואים אותו, קודם על <b>⋯</b>).</li>' +
        '<li>בוחרים <b>הוספה למסך הבית</b> <span class="ipi-ic">' + PLUS + '</span> ואז <b>הוסף</b>.</li>'
      : '<li>לוחצים על כפתור <b>השיתוף</b> <span class="ipi-ic">' + SHARE + '</span> בתחתית המסך (בגרסאות חדשות: קודם על <b>⋯</b>).</li>' +
        '<li>גוללים מעט ובוחרים <b>הוספה למסך הבית</b> <span class="ipi-ic">' + PLUS + '</span>.</li>' +
        '<li>לוחצים <b>הוסף</b>. מעכשיו הכלי נפתח מהאייקון, במסך מלא, כמו אפליקציה.</li>';
    box.innerHTML =
      '<div class="ipi" role="region" aria-label="התקנה במסך הבית של האייפון">' +
      '<button type="button" class="ipi-x" aria-label="לסגור את הסבר ההתקנה">×</button>' +
      '<div class="ipi-pic" aria-hidden="true"><div class="ipi-phone"><span class="ipi-icon">כ</span><span class="ipi-bar">' + SHARE + '</span></div></div>' +
      '<div class="ipi-txt"><b class="ipi-h">📲 להתקין את הכלי באייפון, ב-3 לחיצות</b>' +
      '<ol class="ipi-steps">' + steps + '</ol>' +
      '<p class="ipi-note">בחינם, בלי App Store ובלי הרשמה. אפשר למחוק בכל רגע בלחיצה ארוכה על האייקון.</p></div></div>';
    box.hidden = false;
    box.querySelector('.ipi-x').addEventListener('click', function () {
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      box.hidden = true; ev('tool_install', { how: 'ios_panel_close' });
    });
    var bar = document.getElementById('install-bar'); if (bar) bar.hidden = true;
    ev('tool_install', { how: inApp ? 'ios_panel_inapp' : 'ios_panel' });
  }
  function init() { document.querySelectorAll('[data-ip-install]').forEach(build); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
