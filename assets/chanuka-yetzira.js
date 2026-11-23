/* יצירה לחנוכה: סינון לפי גיל וזמן + תבניות להדפסה שנוצרות בקוד (SVG), כל אחת על דף A4 אחד */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function used(how, t) { try { if (window.toolUsed) window.toolUsed('chanuka_yetzira', { how: how, t: t || '' }); } catch (e) {} }
  var NS = 'http://www.w3.org/2000/svg';
  var F = 'font-family="Arial,Helvetica,sans-serif"';

  /* ---- תבניות (viewBox בס"מ-ממ: 190 x 275) ---- */
  function wrap(inner) { return '<svg xmlns="' + NS + '" viewBox="0 0 190 275" direction="rtl" role="img">' + inner + '</svg>'; }
  function title(t, sub) {
    return '<text x="95" y="14" text-anchor="middle" font-size="9" font-weight="700" ' + F + '>' + t + '</text><text x="95" y="22" text-anchor="middle" font-size="4.2" fill="#444" ' + F + '>' + sub + '</text>';
  }
  function footer() { return '<text x="95" y="270" text-anchor="middle" font-size="3.6" fill="#666" ' + F + '>hakelim.com/kodesh/chanuka/yetzira/</text>'; }
  function dreidel() {
    var s = 40, y0 = 95, xs = [15, 55, 95, 135], L = ['נ', 'ג', 'ה', 'פ'], i, o = '';
    var cut = 'fill="none" stroke="#000" stroke-width=".7"', fold = 'fill="none" stroke="#000" stroke-width=".4" stroke-dasharray="2 1.6"';
    // לשוניות (חיתוך)
    function tab(x1, y1, x2, y2, dx, dy) { return '<path d="M' + x1 + ' ' + y1 + ' L' + (x1 + dx * 1.2 + (dy ? (x2 > x1 ? 4 : -4) * 0 : 0)) + ' ' + (y1 + dy * 1.2) + ' L' + (x2 + dx * 1.2) + ' ' + (y2 + dy * 1.2) + ' L' + x2 + ' ' + y2 + '" ' + cut + '/>'; }
    var T = 6;
    // תקרה: x=55..95, y=55..95. לשוניות: שמאל, ימין, למעלה
    o += '<path d="M55 55 L50 ' + (55 - 0) + ' L50 95 L55 95" ' + cut + '/>';
    o += '<path d="M95 55 L100 55 L100 95 L95 95" ' + cut + '/>';
    o += '<path d="M55 55 L59 49 L91 49 L95 55" ' + cut + '/>';
    // רצפה: y=135..175
    o += '<path d="M55 135 L50 135 L50 175 L55 175" ' + cut + '/>';
    o += '<path d="M95 135 L100 135 L100 175 L95 175" ' + cut + '/>';
    o += '<path d="M55 175 L59 181 L91 181 L95 175" ' + cut + '/>';
    // לשונית צד: ימין של הפאה הרביעית
    o += '<path d="M175 95 L181 99 L181 131 L175 135" ' + cut + '/>';
    // ארבע פאות
    for (i = 0; i < 4; i++) {
      o += '<rect x="' + xs[i] + '" y="' + y0 + '" width="' + s + '" height="' + s + '" ' + cut + '/>';
      o += '<text x="' + (xs[i] + s / 2) + '" y="' + (y0 + 29) + '" text-anchor="middle" font-size="26" font-weight="700" ' + F + '>' + L[i] + '</text>';
    }
    o += '<rect x="55" y="55" width="40" height="40" ' + cut + '/><rect x="55" y="135" width="40" height="40" ' + cut + '/>';
    o += '<circle cx="75" cy="75" r="1.4" fill="none" stroke="#000" stroke-width=".4"/><text x="75" y="88" text-anchor="middle" font-size="3.6" ' + F + '>נקב כאן (מבוגר)</text>';
    o += '<circle cx="75" cy="155" r="1.4" fill="none" stroke="#000" stroke-width=".4"/><text x="75" y="168" text-anchor="middle" font-size="3.6" ' + F + '>נקב כאן (מבוגר)</text>';
    o += '<g ' + fold + '><line x1="55" y1="95" x2="95" y2="95"/><line x1="55" y1="135" x2="95" y2="135"/></g>';
    var note = '<text x="95" y="200" text-anchor="middle" font-size="4.6" ' + F + '>קו מלא: גוזרים. קו מקווקו: מקפלים. את הלשוניות מדביקים פנימה.</text>' +
      '<text x="95" y="208" text-anchor="middle" font-size="4.6" ' + F + '>בנקב שבאמצע מחדירים קיסם עגול, ומסובבים. רצוי להדפיס על נייר עבה.</text>';
    // קווי קיפול אנכיים בין הפאות
    o += '<g ' + fold + '><line x1="55" y1="95" x2="55" y2="135"/><line x1="95" y1="95" x2="95" y2="135"/><line x1="135" y1="95" x2="135" y2="135"/></g>';
    return wrap(title('סביבון להדפסה וגזירה', 'קובייה עם נ ג ה פ: נס גדול היה פה') + o + note + footer());
  }
  function chanukiya() {
    var o = '', i, cut = 'fill="none" stroke="#000" stroke-width=".7"';
    var xs = [24, 44, 64, 84, 144, 164, 184 - 12, 124 - 0];
    // חנוכייה: בסיס, עמוד, קנה
    var arm = [22, 42, 62, 82, 108, 128, 148, 168];
    o += '<path d="M25 100 H165" ' + cut + ' stroke-width="1.2"/><rect x="20" y="100" width="150" height="9" rx="3" ' + cut + '/>';
    o += '<rect x="88" y="109" width="14" height="40" ' + cut + '/><path d="M60 160 H130 L122 149 H68 Z" ' + cut + '/>';
    for (i = 0; i < 8; i++) { o += '<rect x="' + (arm[i] - 6) + '" y="86" width="12" height="14" rx="2" ' + cut + '/><rect x="' + (arm[i] - 4) + '" y="46" width="8" height="40" ' + cut + ' stroke-dasharray="2 1.5"/>'; }
    o += '<rect x="91" y="60" width="8" height="40" ' + cut + '/>';
    o += '<text x="95" y="178" text-anchor="middle" font-size="4.6" ' + F + '>צובעים את החנוכייה, גוזרים את הנרות והלהבות מהשורה שלמטה ומדביקים.</text>';
    // רצועת נרות ולהבות לגזירה
    var y = 192;
    for (i = 0; i < 9; i++) {
      var x = 10 + i * 19.5;
      o += '<rect x="' + x + '" y="' + (y + 12) + '" width="8" height="40" ' + cut + '/>';
      o += '<path d="M' + (x + 4) + ' ' + (y + 12) + ' C' + (x + 9) + ' ' + (y + 4) + ' ' + (x + 7) + ' ' + (y - 2) + ' ' + (x + 4) + ' ' + (y - 8) + ' C' + (x + 1) + ' ' + (y - 2) + ' ' + (x - 1) + ' ' + (y + 4) + ' ' + (x + 4) + ' ' + (y + 12) + ' Z" ' + cut + '/>';
    }
    o += '<text x="95" y="262" text-anchor="middle" font-size="4" fill="#444" ' + F + '>תשעה נרות: שמונה לימים ועוד שמש. בכל לילה מדביקים להבה נוספת.</text>';
    return wrap(title('חנוכיית נייר', 'צובעים, גוזרים ומדביקים') + o + footer());
  }
  function pach() {
    var o = '', cut = 'fill="none" stroke="#000" stroke-width=".8"';
    o += '<rect x="68" y="34" width="54" height="12" rx="3" ' + cut + '/>';
    o += '<path d="M76 46 H114 V64 C150 76 164 112 160 150 C156 205 134 242 95 242 C56 242 34 205 30 150 C26 112 40 76 76 64 Z" ' + cut + '/>';
    o += '<path d="M48 120 C62 100 128 100 142 120" ' + cut + ' stroke-dasharray="2 1.6"/>';
    o += '<path d="M95 60 C102 50 100 44 95 36" fill="none"/>';
    o += '<text x="95" y="150" text-anchor="middle" font-size="7" ' + F + '>נס גדול היה פה</text>';
    o += '<text x="95" y="162" text-anchor="middle" font-size="4.4" fill="#444" ' + F + '>כותבים או מציירים כאן את הנס שאתם זוכרים</text>';
    o += '<path d="M95 22 C101 14 99 10 95 4" fill="none"/>';
    o += '<text x="95" y="256" text-anchor="middle" font-size="4.6" ' + F + '>צובעים את הפך, את השמן ואת הלהבה, גוזרים ומדביקים על דף כחול.</text>';
    // להבה קטנה ליד הפך
    o += '<path d="M168 56 C176 46 173 36 168 26 C163 36 160 46 168 56 Z" ' + cut + '/>';
    return wrap(title('פך שמן לצביעה', 'צובעים, כותבים וגוזרים') + o + footer());
  }
  function garland() {
    var o = '', i, L = ['נ', 'ג', 'ה', 'פ'], cut = 'fill="none" stroke="#000" stroke-width=".7"';
    for (i = 0; i < 8; i++) {
      var cx = 50 + (i % 2) * 90, cy = 56 + Math.floor(i / 2) * 55;
      o += '<path d="M' + (cx - 4) + ' ' + (cy - 24) + ' H' + (cx + 4) + ' V' + (cy - 15) + ' H' + (cx + 24) + ' V' + (cy + 11) + ' L' + (cx + 4) + ' ' + (cy + 24) + ' H' + (cx - 4) + ' L' + (cx - 24) + ' ' + (cy + 11) + ' V' + (cy - 15) + ' H' + (cx - 4) + ' Z" ' + cut + '/>';
      o += '<circle cx="' + cx + '" cy="' + (cy - 20) + '" r="1.3" ' + cut + '/>';
      o += '<text x="' + cx + '" y="' + (cy + 8) + '" text-anchor="middle" font-size="25" font-weight="700" ' + F + '>' + L[i % 4] + '</text>';
    }
    o += '<text x="95" y="262" text-anchor="middle" font-size="4.4" ' + F + '>צובעים, גוזרים לפי הקו, מחוררים את העיגול הקטן וקושרים כל סביבון לחוט.</text>';
    return wrap(title('שרשרת סביבונים', 'שמונה סביבונים לגזירה בדף אחד') + o + footer());
  }
  var TPL = { dreidel: dreidel, chanukiya: chanukiya, pach: pach, garland: garland };
  var cur = '';

  function openTpl(key) {
    cur = key; $('yz-svgbox').innerHTML = TPL[key](); $('yz-preview').hidden = false;
    try { $('yz-preview').scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    used('open', key);
  }
  function doPrint() {
    if (!cur) return;
    var pr = $('yz-print'); pr.innerHTML = TPL[cur](); document.body.classList.add('yz-printing');
    used('print', cur);
    var done = function () { document.body.classList.remove('yz-printing'); pr.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); setTimeout(done, 1500); }, 60);
  }

  /* ---- סינון ---- */
  var f = { age: 'all', min: 'all' };
  function apply() {
    var cards = $('yz-list').children, n = 0, i;
    for (i = 0; i < cards.length; i++) {
      var c = cards[i], ok = (f.age === 'all' || c.getAttribute('data-age') === f.age) && (f.min === 'all' || +c.getAttribute('data-min') <= +f.min);
      c.hidden = !ok; if (ok) n++;
    }
    $('yz-count').textContent = n ? 'מוצגות ' + n + ' יצירות' : 'אין יצירה כזו. נסו זמן ארוך יותר או גיל אחר.';
  }
  function bar(id, key) {
    var bs = $(id).querySelectorAll('button'), i;
    for (i = 0; i < bs.length; i++) bs[i].onclick = function () {
      f[key] = this.getAttribute('data-v');
      var all = $(id).querySelectorAll('button'), j; for (j = 0; j < all.length; j++) all[j].setAttribute('aria-pressed', String(all[j] === this));
      apply(); used('filter', key + ':' + f[key]);
    };
  }
  function init() {
    if (!$('yz-list')) return;
    bar('yz-age', 'age'); bar('yz-min', 'min'); apply();
    var b = document.querySelectorAll('.yz-open'), i;
    for (i = 0; i < b.length; i++) b[i].onclick = function () { openTpl(this.getAttribute('data-t')); };
    $('yz-do-print').onclick = doPrint;
    $('yz-close').onclick = function () { $('yz-preview').hidden = true; };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
