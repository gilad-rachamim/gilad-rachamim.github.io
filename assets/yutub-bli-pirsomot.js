/* יוטיוב בלי פרסומות בחינם (24.11.2026): בחירת מכשיר, כפתור פתיחה ב-Brave ושליחת ההוראות למייל.
   שום דבר לא נשלח בלי שהמשתמש מילא את הטופס. מדידה: kelimEv מ-kelim.js. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function ev(name, extra) { try { if (window.kelimEv) window.kelimEv(name, extra || {}); } catch (e) { /* בלי מדידה */ } }

  // ---------- בחירת מכשיר ----------
  var chips = Array.prototype.slice.call(document.querySelectorAll('#yt-dev .chip'));
  var panes = { android: $('yt-android'), iphone: $('yt-iphone'), pc: $('yt-pc') };
  function pick(dev, manual) {
    chips.forEach(function (c) { var on = c.getAttribute('data-dev') === dev; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    Object.keys(panes).forEach(function (k) { if (panes[k]) panes[k].hidden = k !== dev; });
    if (manual) ev('yt_device', { device: dev });
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { pick(c.getAttribute('data-dev'), true); }); });
  var ua = navigator.userAgent || '';
  pick(/android/i.test(ua) ? 'android' : /iphone|ipad|ipod/i.test(ua) ? 'iphone' : 'pc', false);

  var open = $('yt-open-android');
  if (open) open.addEventListener('click', function () { ev('yt_open_brave', { device: 'android' }); });

  // ---------- שליחה למייל ----------
  var f = $('yt-form'), res = $('yt-res');
  if (!f) return;
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!f.reportValidity()) return;
    if (f.querySelector('[name=_honey]').value) return;
    var name = f.querySelector('[name=fname]').value.trim();
    var mail = f.querySelector('[name=mail]').value.trim();
    var btn = f.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'שולח…';
    var fd = new FormData();
    fd.append('שם', name); fd.append('email', mail);
    fd.append('מקור', 'כלים: יוטיוב בלי פרסומות');
    fd.append('עיר', 'יוטיוב בלי פרסומות');
    fd.append('הסכמה למשפחת הכלים', 'כן');
    fd.append('_page', location.pathname);
    fetch(f.getAttribute('action'), { method: 'POST', body: fd, mode: 'no-cors', keepalive: true })
      .catch(function () { /* no-cors: אין תשובה לקרוא */ })
      .then(function () {
        ev('yt_mail_sent', {});
        f.outerHTML = '<div class="done" role="status">תודה, ' + name.replace(/[&<>"']/g, '') + '. ההוראות בדרך למייל. אם לא הגיעו תוך כמה דקות, בדקו בספאם.</div>';
      });
  });
})();
