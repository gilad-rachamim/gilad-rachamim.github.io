/* מודעה להדפסה של "החדשות ב-3 דקות": קוד QR לדף (utm_source=qr) ונוסח קצר לקבוצות (utm_source=share). */
(function () {
  'use strict';
  var TOOL = 'chadashot_moda';
  var PAGE = 'https://hakelim.com/kelim/machshev/chadashot/';
  var $ = function (id) { return document.getElementById(id); };
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  var TEXT = '📰 החדשות ב-3 דקות\n' +
    'רוצים לדעת מה קורה בלי לרפרש אתרי חדשות כל היום?\n' +
    'סיכום רגוע של 5 נקודות, 3 פעמים ביום (07:00, 13:00, 20:00). קו כשר: בלי רכילות, פשע ובידור. בחינם ובלי פרסומות.\n' +
    '👈 ' + PAGE + '?utm_source=share\n' +
    '☎️ בטלפון כשר: 077-2253345 שלוחה 8';

  function init() {
    if (window.QRCode) new window.QRCode($('md-qr'), { text: PAGE + '?utm_source=qr', width: 600, height: 600, correctLevel: window.QRCode.CorrectLevel.M });
    $('md-txt').value = TEXT;
    $('md-wa').href = 'https://wa.me/?text=' + encodeURIComponent(TEXT);
    $('md-print').addEventListener('click', function () { used('print'); window.print(); });
    $('md-wa').addEventListener('click', function () { used('wa'); });
    $('md-copy').addEventListener('click', function () {
      var btn = this;
      (navigator.clipboard ? navigator.clipboard.writeText(TEXT) : Promise.reject()).then(function () {
        btn.textContent = 'הועתק ✓'; setTimeout(function () { btn.textContent = 'להעתיק את הנוסח'; }, 2000);
      }).catch(function () { $('md-txt').select(); });
      used('copy');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
