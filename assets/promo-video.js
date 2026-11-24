// סרטוני תדמית לכלים: טעינה עצלה (נטען רק כשהגולש מגיע אליו) ואירוע video_play ל-GA4. 24.11.2026
(function () {
  'use strict';
  var boxes = document.querySelectorAll('.k-promo[data-promo]');
  if (!boxes.length) return;
  function build(b) {
    if (b.getAttribute('data-ready')) return;
    b.setAttribute('data-ready', '1');
    var n = b.getAttribute('data-promo'), fmt = b.getAttribute('data-fmt'), pre = b.getAttribute('data-pre') || 'esek';
    var wide = fmt === 'wide' ? true : fmt === 'tall' ? false : window.matchMedia('(min-width:720px)').matches;
    var base = '/assets/promo/' + pre + '-' + n + (wide ? '-wide' : '');
    var v = document.createElement('video');
    v.controls = true; v.preload = 'none'; v.playsInline = true; v.poster = base + '.jpg';
    v.setAttribute('playsinline', ''); v.setAttribute('aria-label', b.getAttribute('data-label') || 'סרטון הדגמה');
    v.innerHTML = '<source src="' + base + '.mp4" type="video/mp4">';
    var sent = false;
    v.addEventListener('play', function () {
      if (sent) return; sent = true;
      try { if (window.toolUsed) window.toolUsed(pre + '_promo_' + n.replace(/-/g, '_'), { action: 'video_play' }); } catch (e) {}
      try { if (window.kelimEv) window.kelimEv('video_play', { video: pre + '_' + n }); } catch (e) {}
    });
    b.innerHTML = ''; b.appendChild(v);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { build(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '200px' });
    boxes.forEach(function (b) { io.observe(b); });
  } else boxes.forEach(build);
})();
