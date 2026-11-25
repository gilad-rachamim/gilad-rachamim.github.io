/* השבוע הראשון שלי כיהודי – שיתוף הדף בווטסאפ */
(function () {
  'use strict';
  var b = document.querySelector('[data-sharepage]');
  if (!b) return;
  b.addEventListener('click', function () {
    var G = window.GIUR;
    var t = 'אחרי הגיור: שאלות ותשובות מתוך "פניני הלכה – גיור"\nhttps://hakelim.com/kodesh/giur/shut/shavua-rishon/';
    if (G && G.wa) G.wa(t); else window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
  });
})();
