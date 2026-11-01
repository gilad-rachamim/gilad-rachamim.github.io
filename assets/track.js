// מעקב Google Analytics 4: אירועי המרה (לידים, ווטסאפ, טלפון, איש קשר, PDF).
// נטען רק כש-GA_ID מוגדר ב-build.py. בלי gtag – לא עושה כלום.
(function () {
  function ev(name, params) { if (window.gtag) window.gtag('event', name, params || {}); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href');
    var where = { page: location.pathname };
    if (/wa\.me|whatsapp/.test(h)) ev('whatsapp_click', where);
    else if (h.indexOf('tel:') === 0) ev('phone_click', where);
    else if (/\.vcf($|\?)/.test(h)) ev('save_contact', where);
    else if (/\.pdf($|\?)/.test(h)) ev('guide_download', where);
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.matches && f.matches('form[data-lead]')) {
      var s = f.querySelector('[name="מקור"]');
      ev('generate_lead', { page: location.pathname, source: s ? s.value : '', transport_type: 'beacon' });
    }
  }, true);
})();
