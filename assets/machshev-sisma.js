// בודק סיסמה ומחולל סיסמה (/kelim/machshev/sisma/).
// הכול רץ בדפדפן בלבד: הסיסמה לא נשלחת, לא נשמרת ולא נכנסת למדידה. נשמרים רק סוג הסיסמה והאורך שבחרו.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var pw = $('ss-pw');
  if (!pw) return;
  var KEY = 'kelim-machshev-sisma';
  var RATE = 1e10; // ניחושים בשנייה: מחשב חזק עם כרטיס מסך
  // סיסמאות נפוצות (בלי מספרים בסוף), כולל כאלה שנפוצות בישראל
  var COMMON = ('123456 1234567 12345678 123456789 1234567890 12345 1234 111111 000000 0000 123123 654321 666666 121212 112233 123321 7777777 159753 ' +
    'password passw0rd qwerty qwertyuiop qwerty123 abc abcd abcdef abc123 iloveyou admin welcome letmein monkey dragon master sunshine princess football ' +
    'shalom israel yisrael maccabi hapoel beitar telaviv jerusalem yerushalaim ahava love baby hello hallo freedom secret 1q2w3e4r 1qaz2wsx zaq12wsx asdfgh asdfghjkl zxcvbnm ' +
    'q1w2e3r4 aa123456 a123456 qazwsx michael david daniel moshe yosef').split(' ');
  var ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'abcdefghijklmnopqrstuvwxyz', '1qaz2wsx3edc', 'קראטוןםפ', 'שדגכעיחלךף', 'זסבהנמצתץ'];

  function log2(n) { return Math.log(n) / Math.LN2; }
  function analyze(s) {
    var tips = [], soft = [], low = /[a-z]/.test(s), up = /[A-Z]/.test(s), dig = /[0-9]/.test(s), heb = /[֐-׿]/.test(s);
    var sym = /[^a-zA-Z0-9֐-׿]/.test(s);
    var cs = (low ? 26 : 0) + (up ? 26 : 0) + (dig ? 10 : 0) + (sym ? 33 : 0) + (heb ? 27 : 0);
    // אורך "אמיתי": תו שחוזר על הקודם, או ממשיך רצף (abc, 123), שווה מעט
    var eff = 0;
    for (var i = 0; i < s.length; i++) {
      if (i === 0) { eff += 1; continue; }
      var d = s.charCodeAt(i) - s.charCodeAt(i - 1);
      eff += (d === 0 || d === 1 || d === -1) ? 0.25 : 1;
    }
    var lowS = s.toLowerCase(), seq = false;
    ROWS.forEach(function (r) { for (var k = 0; k + 4 <= r.length; k++) if (lowS.indexOf(r.substr(k, 4)) > -1) seq = true; });
    if (seq) { eff -= 2; tips.push('יש בה רצף מהמקלדת או מהאלף-בית (כמו qwer או 1234). פורצים מנסים רצפים כאלה ראשונים.'); }
    var bits = Math.max(0, eff) * log2(cs || 1);
    var core = lowS.replace(/[0-9!@#$%^&*.?_\-]+$/, '').replace(/^[0-9]+/, '');
    if (COMMON.indexOf(lowS) > -1 || (core.length >= 3 && COMMON.indexOf(core) > -1)) {
      bits = Math.min(bits, 12); tips.unshift('זו אחת הסיסמאות הנפוצות בעולם, או מבוססת עליה. היא נבדקת בשנייה הראשונה.');
    }
    if (/^\d+$/.test(s)) {
      if (/^0?5\d{8}$/.test(s)) { bits = Math.min(bits, 18); tips.push('נראה כמו מספר טלפון. מספר טלפון קל לגלות.'); }
      else if (/^(0?[1-9]|[12]\d|3[01])(0?[1-9]|1[0-2])(19|20)?\d{2}$/.test(s)) { bits = Math.min(bits, 18); tips.push('נראה כמו תאריך (אולי יום הולדת). תאריכים מנוחשים מהר.'); }
      tips.push('רק מספרים. כדאי להוסיף אותיות – זה מכפיל את הקושי פי הרבה.');
    } else if (/(19[4-9]\d|20[0-3]\d)/.test(s)) bits -= 7, tips.push('יש בה שנה. שנת לידה או שנה של אירוע היא ניחוש ראשון.');
    if (/(.)\1\1/.test(s)) tips.push('יש תו שחוזר כמה פעמים ברצף. חזרות כמעט לא מוסיפות חוזק.');
    if (s.length < 12) tips.push('קצרה. כדאי לפחות 12 תווים, ועדיף 16.');
    if (!heb && s.length >= 6 && !(low && up) && !/^\d+$/.test(s)) soft.push('אפשר לערבב אותיות גדולות וקטנות.');
    if (!sym && !heb && s.length >= 6 && !/^\d+$/.test(s)) soft.push('סימן אחד או שניים (! ? -) מחזקים עוד.');
    if (heb) tips.push('יש בה אותיות בעברית. חלק מהאתרים לא מקבלים אותן, ובמחשב אחר או בחו"ל קשה להקליד אותן.');
    return { bits: Math.max(0, bits), tips: tips, soft: soft };
  }
  function when(sec) {
    if (sec < 1) return 'פחות משנייה';
    var U = [[1, 'שנייה', 'שניות'], [60, 'דקה', 'דקות'], [3600, 'שעה', 'שעות'], [86400, 'יום', 'ימים'], [2629800, 'חודש', 'חודשים'], [31557600, 'שנה', 'שנים']];
    var u = U[0];
    U.forEach(function (x) { if (sec >= x[0]) u = x; });
    var n = Math.round(sec / u[0]);
    if (u[0] === 31557600) {
      if (n >= 1e9) return 'יותר ממיליארד שנים';
      if (n >= 1e6) return 'בערך ' + Math.round(n / 1e6).toLocaleString('he-IL') + ' מיליון שנים';
      if (n >= 1e3) return 'בערך ' + Math.round(n / 1e3).toLocaleString('he-IL') + ' אלף שנים';
    }
    return 'בערך ' + (n === 1 ? u[1] : n.toLocaleString('he-IL') + ' ' + u[2]);
  }
  var LEVELS = [
    [30, 'חלשה מאוד', '#d9534f', 12],
    [45, 'חלשה', '#e8833a', 30],
    [64, 'בינונית', '#e0b84a', 55],
    [80, 'חזקה', '#8fbf5a', 80],
    [1e9, 'חזקה מאוד', '#4caf6e', 100]
  ];
  var used = 0, timer;
  function check() {
    var s = pw.value, bar = $('ss-bar');
    if (!s) { bar.style.width = '0'; $('ss-verdict').textContent = 'מחכה לסיסמה'; $('ss-time').textContent = ''; $('ss-tips').innerHTML = ''; return; }
    var a = analyze(s), L = LEVELS.filter(function (l) { return a.bits < l[0]; })[0], lvl = LEVELS.indexOf(L);
    bar.style.width = L[3] + '%'; bar.style.background = L[2];
    $('ss-verdict').textContent = 'הסיסמה ' + L[1];
    $('ss-time').textContent = 'זמן לפרוץ אותה: ' + when(Math.pow(2, a.bits) / 2 / RATE);
    var tips = a.tips.concat(lvl < 4 ? a.soft : []);
    if (lvl >= 3 && !tips.length) tips.push('מצוין. רק לוודא שהיא לא משמשת גם באתר אחר.');
    $('ss-tips').innerHTML = tips.map(function (t) { var li = document.createElement('li'); li.textContent = t; return li.outerHTML; }).join('');
    clearTimeout(timer);
    timer = setTimeout(function () { if (!used && window.toolUsed) { used = 1; window.toolUsed('machshev_sisma', { how: 'check', level: lvl }); } }, 1500);
  }
  pw.addEventListener('input', check);
  $('ss-eye').addEventListener('click', function () {
    var show = pw.type === 'password'; pw.type = show ? 'text' : 'password';
    this.textContent = show ? 'להסתיר' : 'להציג'; this.setAttribute('aria-pressed', String(show));
  });

  // ---------- מחולל ----------
  var MODES = {
    strong: { min: 12, max: 32, def: 16, note: 'אותיות, מספרים וסימנים. לא צריך לזכור אותה: שומרים במנהל הסיסמאות של Google או Apple.' },
    phone: { min: 12, max: 24, def: 16, note: 'רק אותיות קטנות ומספרים, בקבוצות של ארבע – קל להקליד גם במקלדת של טלפון או טלוויזיה. המקפים הם חלק מהסיסמה.' },
    pin: { min: 4, max: 12, def: 6, note: 'קוד מספרים מתאים לנעילת טלפון או כרטיס. לחשבון באינטרנט – עדיף סיסמה רגילה.' }
  };
  var st = { mode: 'strong', len: {} };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && MODES[sv.mode]) { st.mode = sv.mode; st.len = sv.len || {}; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function rnd(n) { // מספר אקראי הוגן 0..n-1 מתוך crypto
    var max = Math.floor(4294967296 / n) * n, b = new Uint32Array(1);
    do { crypto.getRandomValues(b); } while (b[0] >= max);
    return b[0] % n;
  }
  function pick(chars, n) { var o = ''; for (var i = 0; i < n; i++) o += chars.charAt(rnd(chars.length)); return o; }
  var LO = 'abcdefghijkmnopqrstuvwxyz', UP = 'ABCDEFGHJKLMNPQRSTUVWXYZ', DG = '23456789', SY = '!@#$%&*-_=+?';
  function gen() {
    var m = st.mode, n = st.len[m] || MODES[m].def, out;
    if (m === 'strong') {
      do { out = pick(LO + UP + DG + SY, n); } while (!(/[a-z]/.test(out) && /[A-Z]/.test(out) && /\d/.test(out) && /[^a-zA-Z0-9]/.test(out)));
    } else if (m === 'phone') {
      do { out = pick('abcdefghijkmnpqrstuvwxyz23456789', n); } while (!/\d/.test(out) || !/[a-z]/.test(out));
      out = out.match(/.{1,4}/g).join('-');
    } else {
      do { out = pick('0123456789', n); } while (/(\d)\1\1/.test(out) || '01234567890 9876543210'.indexOf(out.substr(0, 4)) > -1);
    }
    return out;
  }
  var cur = '';
  function draw() {
    var m = MODES[st.mode], n = st.len[st.mode] || m.def;
    [].forEach.call($('ss-mode').children, function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-mode') === st.mode)); });
    $('ss-n').min = m.min; $('ss-n').max = m.max; $('ss-n').value = n; $('ss-nv').textContent = n;
    $('ss-mnote').textContent = m.note;
    cur = gen(); $('ss-out').textContent = cur;
  }
  $('ss-mode').addEventListener('click', function (e) { var b = e.target.closest('[data-mode]'); if (!b) return; st.mode = b.getAttribute('data-mode'); save(); draw(); });
  $('ss-n').addEventListener('input', function () { st.len[st.mode] = +this.value; save(); draw(); });
  $('ss-new').addEventListener('click', function () { draw(); if (window.toolUsed) window.toolUsed('machshev_sisma', { how: 'gen', mode: st.mode }); });
  $('ss-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(cur) : Promise.reject()).then(function () {
      b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800);
    }).catch(function () { var r = document.createRange(); r.selectNodeContents($('ss-out')); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); b.textContent = 'מסומן – להעתיק ידנית'; });
    if (window.toolUsed) window.toolUsed('machshev_sisma', { how: 'copy', mode: st.mode });
  });
  $('ss-test').addEventListener('click', function () { pw.value = cur; check(); pw.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  draw();
})();
