// דף הברוכים הבאים: נפתח פעם אחת אחרי התקנה. מסביר איך להצמיד את הכפתור ומה כדאי לנסות.
(function () {
  var STORE = 'https://chromewebstore.google.com/detail/ckjmijllmaoooihonpedfajaofhbegfg';
  [].forEach.call(document.querySelectorAll('[data-open]'), function (b) {
    b.addEventListener('click', function () { chrome.tabs.create({ url: chrome.runtime.getURL(b.dataset.open) }); });
  });
  document.getElementById('share').href = 'https://wa.me/?text=' + encodeURIComponent('מצאתי תוסף חינמי לכרום בעברית: מתרגם אתרים בלי לשבור אותם, מסדר כרטיסיות, מפנה מקום בגוגל, פתקים ועוד. בלי פרסומות ובלי לאסוף מידע 👇\n' + STORE + '?utm_source=share_welcome');
})();
