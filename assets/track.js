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
    else if (/\.pdf($|\?)/.test(h)) ev('guide_download', { page: location.pathname, file: h.split('?')[0].split('/').pop() });
  }, true);
  // ליד = הגעה לעמוד התודה עם פרטים ב-hash (אמין יותר מאירוע submit, שנחתך במעבר דף).
  // נספר פעם אחת לכל ליד, גם אם מרעננים את עמוד התודה.
  if (location.pathname === '/mohel/todah/' && /(^|[#&])n=/.test(location.hash)) {
    var key = 'mohel-lead-counted-' + location.hash;
    var seen = false;
    try { seen = sessionStorage.getItem(key); sessionStorage.setItem(key, '1'); } catch (err) {}
    if (!seen) {
      var src = '';
      try { src = (JSON.parse(sessionStorage.getItem('mohel-utm') || '{}').utm_source) || ''; } catch (err) {}
      ev('generate_lead', { page: document.referrer ? new URL(document.referrer).pathname : '', source: src });
    }
  }
})();
