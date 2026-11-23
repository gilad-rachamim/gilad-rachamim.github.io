/* אני לא רובוט: אשף, תרגול ומכתב. הכול בדפדפן, שום דבר לא נשלח ולא נשמר. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var out = $('nr-out');
  if (!out) return;

  /* ---------- א. אשף ---------- */
  var DEV = {
    win: 'מחשב Windows', mac: 'מחשב Mac', ios: 'אייפון או אייפד', and: 'טלפון אנדרואיד'
  };
  var SR = {
    win: 'בקורא המסך (NVDA או JAWS)',
    mac: 'ב-VoiceOver',
    ios: 'ב-VoiceOver',
    and: 'ב-TalkBack'
  };
  var MOVE = {
    win: 'מגיעים אליה עם מקש Tab ומסמנים ברווח',
    mac: 'מגיעים אליה עם Tab (או עם VO+חץ ימינה) ומסמנים עם VO+רווח',
    ios: 'מחליקים ימינה עד שהיא מוקראת ומקישים פעמיים',
    and: 'מחליקים ימינה עד שהיא מוקראת ומקישים פעמיים'
  };
  var TAP = {
    win: 'לוחצים Enter או רווח',
    mac: 'לוחצים VO+רווח',
    ios: 'מקישים פעמיים',
    and: 'מקישים פעמיים'
  };

  var APPLE = {
    ios: 'באייפון או באייפד: הגדרות, השם שלכם בראש הרשימה, כניסה ואבטחה (Sign-In & Security), אימות אוטומטי (Automatic Verification). הוא פעיל כברירת מחדל. כשהוא כבוי במכשיר אחד, הוא כבוי גם בשאר המכשירים.',
    mac: 'במק: תפריט Apple, הגדרות מערכת, השם שלכם, כניסה ואבטחה, אימות אוטומטי (Automatic Verification). הוא פעיל כברירת מחדל. כשהוא כבוי במכשיר אחד, הוא כבוי גם בשאר המכשירים.'
  };

  function steps(dev, sit) {
    var t = '', list = [];
    if (sit === 'box') {
      t = 'תיבת הסימון "אני לא רובוט"';
      list = [
        'מוצאים את התיבה ' + SR[dev] + ': ' + MOVE[dev] + '.',
        'מסמנים אותה: ' + TAP[dev] + '. אם שמעתם "You are verified" או שהתיבה מסומנת, סיימתם.',
        'אם נפתח אתגר: ראו את הצעדים שמופיעים תחת "אתגר תמונות". בחרו שוב בשאלה השנייה.',
        'אם קורא המסך לא נכנס לשדות, הפעילו בו מצב טפסים בכוח (בגוגל מציינים שזה עוזר).',
        'אחרי שהאימות פג ("Verification expired") מסמנים את התיבה מחדש. כדאי להשלים אימות אחרון לפני לחיצה על שליחה.'
      ];
    } else if (sit === 'img') {
      t = 'אתגר תמונות: עוברים לאתגר הקולי';
      list = [
        'באתגר מחפשים כפתור עם סמל אוזניות, והקורא מכריז עליו כ"audio" או "get an audio challenge". ' + (dev === 'win' || dev === 'mac' ? 'אפשר לעבור בין הכפתורים עם Tab.' : 'מחליקים ימינה עד שהוא מוקרא.') + ' בוחרים בו.',
        'לוחצים על Play, ומקשיבים לספרות.',
        'מקלידים את הספרות בשדה הטקסט שאחרי הכפתור. אם הפוקוס לא שם, ' + (dev === 'win' || dev === 'mac' ? 'לוחצים Tab.' : 'מחליקים עד השדה.'),
        'בתוך השדה לוחצים R כדי לשמוע שוב מההתחלה (עובד במקלדת). יש גם כפתור לאתגר קולי אחר.',
        'לוחצים Enter או "Verify". תשובה שגויה מביאה אתגר חדש, ותשובה נכונה מסמנת את התיבה.',
        'אם הקול לא מתנגן, אפשר להוריד את הקובץ דרך הקישור שבאתגר.',
        'אין כפתור שמע בכלל? אל תתעקשו. עברו לשלוש הדרכים האחרונות: עזרה של אדם, מוקד טלפוני של הגוף, או המכתב המוכן שבהמשך הדף.'
      ];
    } else if (sit === 'blk') {
      t = 'הודעת "תנועה חריגה" או "שאילתות אוטומטיות"';
      list = [
        'זו לא אשמתכם. גוגל אומרת שההודעה מופיעה כשהרשת נראית כמי ששולחת תנועה אוטומטית, גם כשאתם אדם אמיתי.',
        'אם יש VPN או שירות פרוקסי פעיל, מנתקים אותו ומנסים שוב.',
        'ברשת משותפת (בית ספר, עסק, מכללה) ההודעה שכיחה. נסו רשת אחרת, למשל נתונים סלולריים.',
        'מוודאים שהדפדפן מעודכן ושה-JavaScript פעיל.',
        'ההודעה בדרך כלל מציגה אימות, ופתרון שלו מסיר אותה. אם הוא מופיע, ראו "אתגר תמונות".',
        'אם זה חוזר שוב ושוב: ייתכן שזה הספק או תוכנה זדונית. בקשו מאיש טכני לבדוק, או פנו לספק האינטרנט.'
      ];
    } else if (sit === 'hc') {
      t = 'hCaptcha: יש אפשרות נגישות רשמית';
      list = [
        'במקום אתגר התמונות, באתרים שהפעילו זאת יש בתפריט של הווידג\'ט אפשרות "Accessibility Challenge" שמבוססת על טקסט.',
        'אפשרות שנייה: נרשמים לנגישות אצל hCaptcha בדף הנגישות הרשמי שלהם (hcaptcha.com/accessibility). מקבלים עוגייה מוצפנת שמאפשרת לעבור כמה פעמים ביום בלי אתגר חזותי, והיא מתחדשת מדי פעם בכניסה.',
        'ההרשמה היא בדף של hCaptcha עצמם ולא אצלנו, ואפשר לפנות גם בכתובת support@hcaptcha.com.'
      ];
    } else if (sit === 'cf') {
      t = 'Cloudflare: "מאמת שאתה אנושי"';
      list = [
        'בדרך כלל אין מה לפתור. לפי Cloudflare, הווידג\'ט (Turnstile) יכול להיות תיבת סימון, לא אינטראקטיבי בכלל, או בלתי נראה.',
        'אם מופיעה תיבת סימון, ' + MOVE[dev] + '.',
        'Cloudflare מצהירה שהווידג\'ט עומד ב-WCAG 2.2 ברמה AA.',
        'אם אתם נתקעים באתר מסוים, השתמשו במכתב המוכן ופנו לרכז הנגישות שלו.'
      ];
    } else {
      t = 'גרירת חלק, סיבוב תמונה, או אתגר בלי שמע';
      list = [
        'אין לנו דרך עצמאית לפתור אתגר כזה, ואנחנו לא ממליצים על תוספים או שירותים שפותרים אימות במקומכם.',
        'מבקשים מאדם קרוב לעזור ברגע האימות בלבד.',
        'מתקשרים למוקד של הגוף (בנק, קופת חולים, משרד) ומבקשים לבצע את הפעולה בטלפון.',
        'שולחים לרכז הנגישות של האתר את המכתב המוכן שבהמשך הדף. אתר שפונה לציבור בישראל צריך להיות נגיש, ולפי כל-זכות מי שנודע לו על הפרה צריך לתקן תוך 60 יום.'
      ];
    }
    var extra = '';
    if (APPLE[dev]) {
      extra = '<h3>טיפ שחוסך אימותים באפל</h3><p>' + APPLE[dev] + ' אם עדיין מופיעים אימותים, וודאו שאתם מחוברים ל-Apple Account ושהמכשיר מעודכן. ייתכן שהאתר לא תומך בתכונה.</p>';
    }
    var h = '<h3>' + t + '</h3><p>מכשיר: ' + DEV[dev] + '.</p><ol>';
    for (var i = 0; i < list.length; i++) h += '<li>' + list[i] + '</li>';
    h += '</ol>' + extra;
    return h;
  }

  function wiz(move) {
    var d = document.querySelector('input[name=nr-dev]:checked');
    var s = document.querySelector('input[name=nr-sit]:checked');
    if (!d || !s) return;
    out.innerHTML = steps(d.value, s.value);
    if (move) out.focus();
  }
  var radios = document.querySelectorAll('input[name=nr-dev],input[name=nr-sit]');
  for (var r = 0; r < radios.length; r++) {
    radios[r].addEventListener('change', function () { wiz(false); });
  }

  /* ---------- ב. תרגול ---------- */
  var cb = $('nr-cb');
  function toggleCb() {
    var on = cb.getAttribute('aria-checked') === 'true';
    cb.setAttribute('aria-checked', on ? 'false' : 'true');
    $('nr-pr-msg').className = 'nr-msg ok';
    $('nr-pr-msg').textContent = on ? 'התיבה לא מסומנת' : 'התיבה מסומנת. זה תרגול בלבד.';
  }
  cb.addEventListener('click', toggleCb);
  cb.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') { e.preventDefault(); toggleCb(); }
  });

  var code = '';
  function newCode() {
    var a = new Uint32Array(4), s = '';
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < 4; i++) s += (a[i] % 10);
    code = s;
    $('nr-show').textContent = s.split('').join(' ');
    $('nr-ans').value = '';
  }
  function speak() {
    var msg = $('nr-pr-msg');
    if (!('speechSynthesis' in window)) {
      msg.className = 'nr-msg bad';
      msg.textContent = 'הדפדפן הזה לא מקריא. פתחו את הקטע "אין לי קול" ותראו את הספרות.';
      return;
    }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(code.split('').join(', '));
    u.lang = 'en-US';
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  }
  $('nr-play').addEventListener('click', speak);
  $('nr-new').addEventListener('click', function () {
    newCode();
    $('nr-pr-msg').className = 'nr-msg';
    $('nr-pr-msg').textContent = 'אתגר חדש מוכן. לחצו על השמעה.';
    $('nr-ans').focus();
  });
  $('nr-ans').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); verify(); }
    if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); speak(); }
  });
  $('nr-ans').addEventListener('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '').slice(0, 4);
  });
  function verify() {
    var m = $('nr-pr-msg'), v = $('nr-ans').value;
    if (v === code) {
      m.className = 'nr-msg ok';
      m.textContent = 'נכון. עברתם את התרגול. באתר אמיתי זה היה מסמן את התיבה.';
    } else {
      m.className = 'nr-msg bad';
      m.textContent = 'לא נכון. זה בסדר, מקבלים אתגר חדש. לחצו על השמעה.';
      newCode();
    }
  }
  $('nr-verify').addEventListener('click', verify);
  newCode();

  /* ---------- ג. מכתב ---------- */
  var WHAT = {
    img: 'האתר דורש אימות באמצעות בחירת תמונות, ואין חלופה שאפשר להפעיל עם קורא מסך',
    aud: 'האתגר הקולי באימות חסום או לא עובד, ולא ניתן להמשיך',
    slid: 'האתר דורש אימות באמצעות גרירת חלק או סיבוב תמונה, שאי אפשר לבצע בלי ראייה',
    loop: 'האימות חוזר שוב ושוב ולא מאפשר לי להמשיך'
  };
  function letter() {
    var site = $('nr-site').value.trim() || '[שם האתר]';
    var name = $('nr-name').value.trim();
    var t = 'שלום רב,\n\n' +
      'אני אדם עיוור ומשתמש בקורא מסך. ניסיתי להשתמש באתר "' + site + '" ונתקלתי בבעיה: ' + WHAT[$('nr-what').value] + '.\n\n' +
      'כתוצאה מכך איני יכול להשלים את הפעולה באופן עצמאי.\n\n' +
      'אני מבקש:\n' +
      '1. חלופה נגישה לאימות, למשל אתגר קולי תקין או אימות שאינו חזותי.\n' +
      '2. עד שתהיה חלופה, דרך אנושית להשלים את הפעולה, למשל בטלפון.\n' +
      '3. אישור קבלה והודעה על מועד התיקון.\n\n' +
      'אתר שפונה לציבור נדרש להיות נגיש לפי תקן ישראלי 5568, והצהרת הנגישות כוללת פרטי פנייה לרכז הנגישות, ולכן אני פונה אליכם.\n\n' +
      'תודה מראש על הטיפול,\n' + (name || '[שם]');
    $('nr-letter').value = t;
    var enc = encodeURIComponent(t);
    $('nr-mail').href = 'mailto:?subject=' + encodeURIComponent('בקשה לחלופה נגישה לאימות באתר') + '&body=' + enc;
    $('nr-wa').href = 'https://wa.me/?text=' + enc;
  }
  var fields = ['nr-site', 'nr-what', 'nr-name'];
  for (var f = 0; f < fields.length; f++) {
    $(fields[f]).addEventListener('input', letter);
    $(fields[f]).addEventListener('change', letter);
  }
  $('nr-letter').addEventListener('input', function () {
    var enc = encodeURIComponent(this.value);
    $('nr-mail').href = 'mailto:?subject=' + encodeURIComponent('בקשה לחלופה נגישה לאימות באתר') + '&body=' + enc;
    $('nr-wa').href = 'https://wa.me/?text=' + enc;
  });
  $('nr-copy').addEventListener('click', function () {
    var m = $('nr-lt-msg'), ta = $('nr-letter');
    function ok() { m.className = 'nr-msg ok'; m.textContent = 'המכתב הועתק.'; }
    function bad() { ta.focus(); ta.select(); m.className = 'nr-msg bad'; m.textContent = 'ההעתקה האוטומטית לא עבדה. הטקסט סומן, לחצו Ctrl+C.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(ok, bad);
    } else { bad(); }
  });
  letter();
})();
