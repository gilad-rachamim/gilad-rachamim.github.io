// סרטוני התדמית של מיזם הכלים (15.11.2026): מעקב צפייה ושיתוף.
// אירועי Analytics: promo_play / promo_share / promo_download, עם video = מזהה הסרטון ו-page = איפה בדף.
(function () {
  // תמונת הפתיחה (data-poster, ראו LAZY_POSTERS ב-build.py) נטענת רק כשהסרטון מתקרב למסך (27.11.2026)
  var lazy = document.querySelectorAll('video[data-poster]');
  var show = function (v) { v.poster = v.getAttribute('data-poster'); };
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (x) { if (x.isIntersecting) { show(x.target); io.unobserve(x.target); } });
    }, { rootMargin: '600px' });
    lazy.forEach(function (v) { io.observe(v); });
  } else lazy.forEach(show);
  var ev = function (n, el, p) {
    try { window.gtag && gtag('event', n, Object.assign({ video: el.getAttribute('data-promo'), page: location.pathname }, p || {})); } catch (e) {}
  };
  document.addEventListener('play', function (e) {
    var v = e.target;
    if (!v.matches || !v.matches('video[data-promo]')) return;
    document.querySelectorAll('video[data-promo]').forEach(function (o) { if (o !== v) o.pause(); });
    if (!v.dataset.played) { v.dataset.played = 1; ev('promo_play', v); }
  }, true);
  document.addEventListener('click', async function (e) {
    var dl = e.target.closest('[data-promo-dl]');
    if (dl) { ev('promo_download', dl); return; }
    var b = e.target.closest('[data-promo-share]');
    if (!b) return;
    var src = b.getAttribute('data-promo-share');
    var text = b.getAttribute('data-text') + ' 👇\nhttps://hakelim.com' + b.getAttribute('data-url') + '?utm_source=promo-video&utm_medium=share';
    b.disabled = true;
    try {
      if (navigator.canShare) {
        var blob = await (await fetch(src)).blob();
        var f = new File([blob], src.split('/').pop(), { type: 'video/mp4' });
        if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: text }); ev('promo_share', b, { how: 'file' }); return; }
      }
      throw 0;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      ev('promo_share', b, { how: 'wa_link' });
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    } finally { b.disabled = false; }
  });
})();
