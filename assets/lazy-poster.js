// תמונות הפתיחה של סרטונים (data-poster, ראו EAGER_POSTERS ב-build.py) נטענות רק כשהסרטון מתקרב למסך (27.11.2026)
(function () {
  var show = function (v) { v.poster = v.getAttribute('data-poster'); };
  function watch() {
    var list = document.querySelectorAll('video[data-poster]');
    if (!window.IntersectionObserver) { list.forEach(show); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '600px' });
    list.forEach(function (v) { io.observe(v); });
  }
  // אחרי שתוכן הדף נבנה; אחרת סרטון שבסוף הדף עוד נראה למעלה ונטען מיד
  var later = function () { setTimeout(watch, 300); };
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later);
})();
