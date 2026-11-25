/* דפי מתנה /matana/: כותרת לפי utm_content, שליחת טופס, אירועי Lead, וידאו עצל, סרגל תחתון */
(function () {
  var q = new URLSearchParams(location.search), $ = function (s, r) { return (r || document).querySelector(s); };
  var slug = location.pathname.split('/')[2] || '';
  var path = location.pathname.replace(/\/+$/, '').split('/');
  var leaf = path[path.length - 1];
  var stage = leaf === 'toda' ? 'toda' : leaf === 'shidrug' ? 'shidrug' : (leaf === 'toda-shidrug' || leaf === 'toda-kurs') ? 'toda-shidrug' : leaf === 'toda-kniya' ? 'toda-kniya' : leaf === 'asara' ? 'asara' : 'landing';
  function fb(type, data) { try { if (window.fbq) fbq('track', type, data || {}); } catch (e) {} }
  function ga(name, data) { try { if (window.gtag) gtag('event', name, data || {}); } catch (e) {} }
  function ev(name, ch) {
    var d = { page: slug, channel: ch, utm_content: q.get('utm_content') || '' };
    if (name === 'contact') fb('Contact', { content_name: 'matana_' + slug + '_' + ch });
    else fb('Lead', { content_name: 'matana_' + slug + '_' + ch });
    ga(name === 'contact' ? 'generate_lead' : name, d);
  }
  // צפייה בתוכן: דף המתנה ודף המדרגות
  if (stage === 'landing' || stage === 'shidrug') fb('ViewContent', { content_name: 'matana_' + slug + '_' + stage });
  // הרשמה הושלמה: דף תודה אחרי רכישה, פעם אחת בלבד לכל דפדפן
  if (stage === 'toda-shidrug') {
    try { if (!sessionStorage.getItem('mt_cr_' + slug)) { sessionStorage.setItem('mt_cr_' + slug, '1'); fb('CompleteRegistration', { content_name: 'matana_' + slug }); ga('sign_up', { page: slug }); } } catch (e) {}
  }
  // רכישה אמיתית (24.11.2026): רק בדפים שפייהיפ מעביר אליהם אחרי תשלום, ורק אם הגיעו מלחיצת קנייה ב-24 השעות האחרונות
  // או מ-payhip. כניסה ישירה לקישור לא נספרת. פעם אחת לכל דף בדפדפן (12 שעות).
  if (stage === 'toda-kniya' || stage === 'toda-shidrug') {
    try {
      var co = null, now = Date.now(), pk = 'mt_pu_' + slug + '_' + leaf;
      try { co = JSON.parse(localStorage.getItem('mt_co') || 'null'); } catch (e) {}
      if (co && !(now - (co.ts || 0) < 864e5)) co = null;
      var fromPay = /payhip/i.test(document.referrer || '');
      var last = +localStorage.getItem(pk) || 0;
      if ((co || fromPay) && now - last > 432e5) {
        var mb = $('#mt-buy'), dv = mb ? parseFloat(mb.getAttribute('data-value')) || 0 : 0;
        var val = co && co.price ? +co.price : dv, nm = (co && co.name) || (mb && mb.getAttribute('data-name')) || ('matana_' + slug);
        localStorage.setItem(pk, String(now));
        localStorage.removeItem('mt_co');
        fb('Purchase', { value: val, currency: 'ILS', content_name: nm });
      }
    } catch (e) {}
  }
  var h1 = $('h1[data-h]');
  if (h1) { try { var m = JSON.parse(h1.getAttribute('data-h')), c = q.get('utm_content'); if (c && m[c]) h1.textContent = m[c]; } catch (e) {} }
  // קוד מקור בנוסח הווטסאפ (25.11.2026): "(קוד: קמפיין-מודעה)" בשורה אחרונה משלו, אחרי שורות המילוי, מה-utm, כדי שנדע מאיזו מודעה הגיע הליד. נקרא ב-tools/matana_reply.py
  (function () {
    var cl = function (v) { return (v || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16); };
    var code = [cl(q.get('utm_campaign')), cl(q.get('utm_content'))].filter(Boolean).join('-');
    if (!code) return;
    var as = document.querySelectorAll('a[data-wa]');
    for (var i = 0; i < as.length; i++) {
      try { var u = new URL(as[i].href); var t = u.searchParams.get('text'); if (t && t.indexOf('(קוד:') < 0) { u.searchParams.set('text', t.replace(/\s+$/, '') + '\n(קוד: ' + code + ')'); as[i].href = u.toString(); } } catch (e) {}
    }
  })();
  var f = $('form.mt-form');
  if (f) {
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) { var i = f.elements[k]; if (i) i.value = q.get(k) || ''; });
    if (f.elements._page) f.elements._page.value = location.pathname;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (f.elements._honey && f.elements._honey.value) return;
      var em = f.elements.email.value.trim(), nm = f.elements['שם'].value.trim(), er = $('.mt-err', f);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { er.textContent = 'נא למלא מייל תקין'; return; }
      er.textContent = '';
      var b = $('button[type=submit]', f); b.disabled = true; b.textContent = 'שולח…';
      ev('generate_lead', 'form');
      var go = function () { location.href = f.getAttribute('data-next'); }, t = setTimeout(go, 8000);
      fetch(f.action, { method: 'POST', body: new FormData(f), mode: 'no-cors', keepalive: true }).then(function () { clearTimeout(t); setTimeout(go, 250); }, function () { clearTimeout(t); go(); });
    });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-wa]');
    if (a) ev('contact', 'wa_' + a.getAttribute('data-wa'));
    var c = e.target.closest && e.target.closest('a[data-co]');
    if (c) {
      var val = parseFloat(c.getAttribute('data-co')) || 0, nm = c.getAttribute('data-name') || '';
      fb('InitiateCheckout', { value: val, currency: 'ILS', content_name: nm });
      try { localStorage.setItem('mt_co', JSON.stringify({ price: val, name: nm, ts: Date.now() })); } catch (e) {}
      ga('begin_checkout', { currency: 'ILS', value: val, items: [{ item_name: nm, price: val }], page: slug });
    }
  });
  var v = $('.mt-vid[data-src]');
  if (v) {
    var load = function () {
      if (v.querySelector('video')) return;
      v.innerHTML = '<video controls playsinline preload="none" poster="' + v.getAttribute('data-poster') + '"><source src="' + v.getAttribute('data-src') + '" type="video/mp4"></video>';
      var vd = v.querySelector('video'), sent = {};
      vd.addEventListener('play', function () { ga('video_play', { page: slug }); try { if (window.fbq) fbq('trackCustom', 'VideoPlay', { content_name: 'matana_' + slug }); } catch (e) {} }, { once: true });
      // התקדמות צפייה: חצי ועד הסוף, פעם אחת כל אחד
      vd.addEventListener('timeupdate', function () {
        if (!vd.duration) return;
        [50, 95].forEach(function (p) {
          if (sent[p] || vd.currentTime / vd.duration * 100 < p) return;
          sent[p] = 1; var pc = p === 95 ? 100 : p;
          ga('video_progress', { page: slug, percent: pc });
          try { if (window.fbq) fbq('trackCustom', 'VideoProgress', { content_name: 'matana_' + slug, percent: pc }); } catch (e) {}
        });
      });
    };
    var vc = $('.mt-vid-cta');
    if (vc) vc.addEventListener('click', function () { ga('video_cta_click', { page: slug }); setTimeout(function () { var i = form && form.elements.email; if (i) i.focus({ preventScroll: true }); }, 400); });
    if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { load(); io.disconnect(); } }, { rootMargin: '200px' }); io.observe(v); } else load();
  }
  var dock = $('.mt-dock'), form = $('#form');
  if (dock && form && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { dock.classList.toggle('off', en[0].isIntersecting); }).observe(form);
  }
})();
