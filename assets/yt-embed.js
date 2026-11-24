/* הטמעת יוטיוב עצלה (25.11.2026): התמונה נטענת מיד, ה-iframe רק בלחיצה (youtube-nocookie). מדידה: GA4 video_play */
(function () {
  'use strict';
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.yte-play'); if (!b) return;
    var box = b.closest('.yte'); var id = box.getAttribute('data-id');
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
    f.title = box.getAttribute('data-title') || 'סרטון';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true; f.loading = 'lazy';
    box.innerHTML = ''; box.appendChild(f);
    try { if (window.gtag) window.gtag('event', 'video_play', { video_id: id, video_title: box.getAttribute('data-title'), video_provider: 'youtube', page_path: location.pathname }); } catch (x) { /* בלי מדידה */ }
  });
})();
