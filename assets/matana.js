/* דפי מתנה /matana/: כותרת לפי utm_content, שליחת טופס, אירועי Lead, וידאו עצל, סרגל תחתון */
(function () {
  var q = new URLSearchParams(location.search), $ = function (s, r) { return (r || document).querySelector(s); };
  var slug = location.pathname.split('/')[2] || '';
  function ev(name, ch) {
    try { if (window.fbq) fbq('track', 'Lead', { content_name: 'matana_' + slug + '_' + ch }); } catch (e) {}
    try { if (window.gtag) gtag('event', name, { page: slug, channel: ch, utm_content: q.get('utm_content') || '' }); } catch (e) {}
  }
  var h1 = $('h1[data-h]');
  if (h1) { try { var m = JSON.parse(h1.getAttribute('data-h')), c = q.get('utm_content'); if (c && m[c]) h1.textContent = m[c]; } catch (e) {} }
  var f = $('form.mt-form');
  if (f) {
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) { var i = f.elements[k]; if (i) i.value = q.get(k) || ''; });
    if (f.elements._page) f.elements._page.value = location.pathname;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (f.elements._honey && f.elements._honey.value) return;
      var em = f.elements.email.value.trim(), nm = f.elements['שם'].value.trim(), er = $('.mt-err', f);
      if (!nm || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { er.textContent = 'נא למלא שם ומייל תקין'; return; }
      er.textContent = '';
      var b = $('button[type=submit]', f); b.disabled = true; b.textContent = 'שולח…';
      ev('generate_lead', 'form');
      var go = function () { location.href = f.getAttribute('data-next'); }, t = setTimeout(go, 8000);
      fetch(f.action, { method: 'POST', body: new FormData(f), mode: 'no-cors', keepalive: true }).then(function () { clearTimeout(t); setTimeout(go, 250); }, function () { clearTimeout(t); go(); });
    });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-wa]');
    if (a) ev('generate_lead', 'wa_' + a.getAttribute('data-wa'));
  });
  var v = $('.mt-vid[data-src]');
  if (v) {
    var load = function () {
      if (v.querySelector('video')) return;
      v.innerHTML = '<video controls playsinline preload="none" poster="' + v.getAttribute('data-poster') + '"><source src="' + v.getAttribute('data-src') + '" type="video/mp4"></video>';
      v.querySelector('video').addEventListener('play', function () { try { gtag('event', 'video_play', { page: slug }); } catch (e) {} }, { once: true });
    };
    if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { load(); io.disconnect(); } }, { rootMargin: '200px' }); io.observe(v); } else load();
  }
  var dock = $('.mt-dock'), form = $('#form');
  if (dock && form && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { dock.classList.toggle('off', en[0].isIntersecting); }).observe(form);
  }
})();
