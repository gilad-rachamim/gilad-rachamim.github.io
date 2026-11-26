/* פס "החדשות ב-3 דקות" בדפי הכלים (18.11.2026): ממלא את שם המהדורה והשעה מ-/history.
   בלי כותרת: דפי הכלים (גם שיקום ונפש) נשארים רגועים – כותרת על פיגוע או תאונה לא קופצת באמצע כלי.
   לא קורא ל-/latest כדי לא לנפח את ספירת הכניסות בשרת – נספרים רק מי שלוחצים (utm_source=home). */
(function () {
  'use strict';
  var bar = document.querySelector('[data-newsbar]');
  if (!bar) return;
  var KEY = 'kelim_newsbar', API = 'https://kelim-news.gilad4049.workers.dev/history';
  function fill(e) {
    if (!e || !e.name) return;
    bar.querySelector('[data-nb-ed]').textContent = 'סיכום ' + e.name + ', ' + (e.time || '');
  }
  var c = null;
  try { c = JSON.parse(sessionStorage.getItem(KEY)); } catch (x) {}
  if (c && Date.now() - c.t < 600000) fill(c.e);
  else fetch(API).then(function (r) { return r.json(); }).then(function (h) {
    var e = h && h[0];
    if (!e) return;
    e = { name: e.name, time: e.time };
    fill(e);
    try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), e: e })); } catch (x) {}
  }).catch(function () {});
  bar.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-nb]');
    if (a && window.gtag) window.gtag('event', 'newsbar_click', { what: a.getAttribute('data-nb'), page: location.pathname });
  });
})();
