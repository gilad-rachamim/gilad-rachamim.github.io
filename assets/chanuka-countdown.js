/* חנוכה תשפ"ז: ספירה לאחור, "הלילה נר X" ובאנר עונתי שנעלם אחרי 13.12.2026 */
(function () {
  var NAMES = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'שמיני'];
  var TARGET = Date.UTC(2026, 11, 4, 13, 45); /* 15:45 שעון ישראל, לפני כניסת השבת */
  function ilParts(d) {
    try {
      var f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).split('-');
      return { y: +f[0], m: +f[1], d: +f[2] };
    } catch (e) { return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; }
  }
  function state(now) {
    var p = ilParts(now);
    if (p.y > 2026 || (p.y === 2026 && p.m > 12) || (p.y === 2026 && p.m === 12 && p.d >= 14)) return { k: 'over' };
    if (p.y === 2026 && p.m === 12 && p.d >= 4 && p.d <= 11) return { k: 'night', n: p.d - 3 };
    if (p.y === 2026 && p.m === 12 && (p.d === 12 || p.d === 13)) return { k: 'ninth' };
    return { k: 'before', ms: TARGET - now.getTime() };
  }
  function link(n) { return '/kodesh/chanuka/nerot/#nerot-' + n; }
  function days(ms) { return Math.max(0, Math.ceil(ms / 86400000)); }
  var box = document.getElementById('cd-box'), ban = document.getElementById('cd-banner');
  function render() {
    var s = state(new Date());
    if (box) {
      if (s.k === 'before') {
        var t = Math.max(0, s.ms), d = Math.floor(t / 86400000), h = Math.floor(t % 86400000 / 3600000), m = Math.floor(t % 3600000 / 60000), sec = Math.floor(t % 60000 / 1000);
        box.innerHTML = '<b>עד הדלקת הנר הראשון</b><div class="cd-t" role="timer" aria-live="off"><span><em>' + d + '</em>ימים</span><span><em>' + h + '</em>שעות</span><span><em>' + m + '</em>דקות</span><span><em>' + sec + '</em>שניות</span></div>' +
          '<p class="cg-st">ההדלקה ביום שישי, 4 בדצמבר 2026, לפני כניסת השבת. <a class="gold" href="/kodesh/chanuka/nerot/">הזמן המדויק לעיר שלכם</a>.</p>';
      } else if (s.k === 'night') {
        box.innerHTML = '<b>הלילה: נר ' + NAMES[s.n] + '</b><p>' + (s.n === 1 ? 'נר אחד ושמש' : s.n + ' נרות ושמש') + '. <a class="gold" href="' + link(s.n) + '">סדר ההדלקה והברכות של הלילה</a>.</p>' +
          '<p class="cg-st"><a class="gold" href="/kodesh/chanuka/sipurim/?n=' + s.n + '">סיפור הלילה</a> · <a class="gold" href="/kodesh/chanuka/mischakim/hadlaka/">להתאמן בהדלקה</a></p>';
      } else if (s.k === 'ninth') {
        box.innerHTML = '<b>היום התשיעי</b><p>החג נגמר. <a class="gold" href="/kodesh/chanuka/tshii/">המדורה של היום התשיעי</a>.</p>';
      } else { box.hidden = true; }
    }
    if (ban) {
      var txt = '';
      if (s.k === 'before') txt = '<b>חנוכה תשפ"ז בעוד ' + days(s.ms) + ' ימים</b> · משחקים, יצירה ושירים למשפחה ←';
      else if (s.k === 'night') txt = '<b>הלילה נר ' + NAMES[s.n] + '</b> · סדר ההדלקה ←';
      else if (s.k === 'ninth') txt = '<b>היום התשיעי</b> · המדורה והסיום ←';
      if (txt) { ban.innerHTML = txt; ban.href = s.k === 'night' ? link(s.n) : (s.k === 'ninth' ? '/kodesh/chanuka/tshii/' : '/kodesh/chanuka/'); ban.hidden = false; }
      else { ban.hidden = true; }
    }
    if (s.k === 'before' && box) setTimeout(render, 1000);
  }
  if (box || ban) render();
})();
