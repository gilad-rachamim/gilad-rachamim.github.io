// כרטיס ביקור דיגיטלי: שמירת איש קשר (vCard), שיתוף, העתקה.
(function () {
  var VCARD = [
    'BEGIN:VCARD', 'VERSION:3.0',
    'N;CHARSET=UTF-8:אביעד;גילעד רחמים;;;',
    'FN;CHARSET=UTF-8:גילעד רחמים אביעד – המוהל',
    'ORG;CHARSET=UTF-8:גילעד רחמים המוהל',
    'TITLE;CHARSET=UTF-8:מוהל מוסמך',
    'TEL;TYPE=CELL,VOICE:+972584049049',
    'EMAIL;TYPE=INTERNET:gilad4049@gmail.com',
    'URL:https://hakelim.com/mohel/',
    'ADR;CHARSET=UTF-8;TYPE=WORK:;;;ירושלים;;;ישראל',
    'NOTE;CHARSET=UTF-8:ברית מכל הלב והנשמה. מוהל מוסמך מטעם מכון עלייה. שיחת היכרות לפני הברית, ביקור בית אחריה.',
    'END:VCARD'
  ].join('\r\n');

  var save = document.getElementById('vcard');
  if (save) save.addEventListener('click', function (e) {
    e.preventDefault();
    var blob = new Blob([VCARD], { type: 'text/vcard;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'gilad-rachamim-mohel.vcf';
    document.body.appendChild(a); a.click(); a.remove();
  });

  var share = document.getElementById('share');
  if (share) share.addEventListener('click', function () {
    var data = { title: 'גילעד רחמים המוהל', text: 'גילעד רחמים המוהל – ברית מכל הלב והנשמה · 058-404-9049 (ווטסאפ)', url: 'https://hakelim.com/mohel/kartis/' };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    (window.kelimShort ? window.kelimShort.go('https://wa.me/?text=' + encodeURIComponent(data.text + ' ' + data.url)) : (location.href = 'https://wa.me/?text=' + encodeURIComponent(data.text + ' ' + data.url)));
  });

  var copy = document.getElementById('copy');
  if (copy) copy.addEventListener('click', function () {
    var t = 'https://hakelim.com/mohel/kartis/';
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () {
      copy.textContent = 'הקישור הועתק';
      setTimeout(function () { copy.textContent = 'העתקת קישור'; }, 2000);
    }).catch(function () { prompt('העתיקו את הקישור:', t); });
  });

  // רמז להוספה למסך הבית
  var hint = document.getElementById('a2hs');
  if (hint && !window.matchMedia('(display-mode: standalone)').matches) {
    var ios = /iphone|ipad/i.test(navigator.userAgent);
    hint.textContent = ios ? 'באייפון: שיתוף ← "הוסף למסך הבית", והכרטיס יהיה אצלכם כמו אפליקציה.' : 'באנדרואיד: תפריט הדפדפן ← "הוסף למסך הבית", והכרטיס יהיה אצלכם כמו אפליקציה.';
  }
})();
