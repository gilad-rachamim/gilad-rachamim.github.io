// נגן יוטיוב קל: ה-iframe (youtube-nocookie) נוצר רק כשלוחצים על התמונה.
(function () {
  document.querySelectorAll('.yt[data-id]').forEach(function (box) {
    var btn = box.querySelector('.yt-play');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + box.getAttribute('data-id') + '?autoplay=1&rel=0&hl=he&cc_lang_pref=he';
      f.title = box.getAttribute('data-title') || 'סרטון';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      box.replaceChild(f, btn);
      if (window.gtag) window.gtag('event', 'video_play', { page: location.pathname });
    });
  });
})();
