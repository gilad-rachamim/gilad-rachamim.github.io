/* אני לא רובוט: אשף, תרגול ומכתב. הכול בדפדפן, שום דבר לא נשלח ולא נשמר. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var out = $('nr-out');
  if (!out) return;

  /* ---------- א. אשף ---------- */
  var Core = window.NegishutRobotCore;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  var lastText = '';
  function steps(dev, sit) {
    var s = Core.steps(dev, sit);
    var h = '<h3>' + esc(s.title) + '</h3><p>מכשיר: ' + esc(s.device) + '.</p><ol>';
    for (var i = 0; i < s.items.length; i++) h += '<li>' + esc(s.items[i]) + '</li>';
    h += '</ol>';
    if (s.extra) h += '<h3>טיפ שחוסך אימותים באפל</h3><p>' + esc(s.extra) + '</p>';
    h += '<p><button type="button" class="btn btn-line" id="nr-say">הקראת הצעדים בקול</button> <button type="button" class="btn btn-line" id="nr-stop" hidden>עצירת ההקראה</button></p>';
    lastText = s.title + '. ' + s.items.map(function (x, i) { return 'צעד ' + (i + 1) + '. ' + x; }).join(' ') + (s.extra ? ' ' + s.extra : '');
    return h;
  }

  function wiz(move) {
    var d = document.querySelector('input[name=nr-dev]:checked');
    var s = document.querySelector('input[name=nr-sit]:checked');
    if (!d || !s) return;
    out.innerHTML = steps(d.value, s.value);
    bindSay();
    if (move) out.focus();
  }
  /* הקראת הצעדים בקול המכשיר (עברית), עם כפתור עצירה. לקורא מסך יש את הרשימה כטקסט, וזה לשאר האנשים. */
  function bindSay() {
    var go = $('nr-say'), stop = $('nr-stop');
    if (!go) return;
    if (!('speechSynthesis' in window)) { go.hidden = true; return; }
    function end() { stop.hidden = true; go.hidden = false; }
    go.addEventListener('click', function () {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(lastText);
      u.lang = 'he-IL';
      u.onend = u.onerror = end;
      window.speechSynthesis.speak(u);
      go.hidden = true; stop.hidden = false; stop.focus();
    });
    stop.addEventListener('click', function () { window.speechSynthesis.cancel(); end(); go.focus(); });
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
