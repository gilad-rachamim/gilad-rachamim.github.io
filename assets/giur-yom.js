/* יום הגיור: הדפסה ושיתוף בווטסאפ */
(function () {
  'use strict';
  var G = window.GIUR || { used: function () {}, wa: function (t) { window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener'); } };
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-print],[data-share],[data-share-page]');
    if (!t) return;
    if (t.hasAttribute('data-print')) { G.used('giur_yom_print'); window.print(); }
    else if (t.hasAttribute('data-share-page')) { G.used('giur_yom_share_page'); G.wa('מה קורה ביום הגיור, לפי הספר פניני הלכה – גיור:\nhttps://hakelim.com/kodesh/giur/shut/yom-hagiur/'); }
    else {
      var c = t.closest('article'); G.used('giur_yom_share');
      G.wa('מה קורה ביום הגיור: ' + c.querySelector('h3').textContent.trim() + '\nhttps://hakelim.com/kodesh/giur/shut/yom-hagiur/#' + c.id);
    }
  });
})();
