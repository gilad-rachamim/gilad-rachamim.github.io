/* הדלק את החנוכייה – בוחרים לילה, לוחצים על השמש ואז מדליקים את הנרות מהחדש אל הישן (משמאל לימין). עובד בלי אינטרנט. */
(function () {
  'use strict';
  var KEY = 'chanuka_hadlaka_v1';
  function $(id) { return document.getElementById(id); }
  function used(how) { try { if (window.toolUsed) window.toolUsed('chanuka_hadlaka', { how: how }); } catch (e) {} }
  var ORD = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'שמיני'];
  var st = { night: 1, done: {} };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && typeof sv === 'object') { st.night = Math.min(8, Math.max(1, sv.night | 0 || 1)); st.done = sv.done || {}; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  /* מצב המשחק: placed = כמה נרות הוצבו (מימין לשמאל), lit = כמה נרות הודלקו (משמאל לימין), shamash */
  var g;
  var XS = [];  // מיקום x של כל תא: 0 = הימני ביותר
  function slotX(i) { return 330 - i * 40; }  // תא 0 בימין

  function reset() { g = { placed: 0, lit: 0, sh: false, errs: 0, done: false }; draw(); say('מניחים נרות: לוחצים על "הוסף נר" כדי להציב את הנר של הלילה. נר חדש תמיד מימין.'); }

  function draw() {
    var n = st.night, h = '', i;
    h += '<rect x="20" y="170" width="340" height="12" rx="6" fill="#e6b53a"/><rect x="178" y="182" width="24" height="46" rx="4" fill="#e6b53a"/><path d="M130 246 L250 246 L236 226 L144 226 Z" fill="#b8860b"/>';
    // שמש באמצע
    h += '<rect x="170" y="150" width="40" height="20" rx="4" fill="#e6b53a"/>';
    h += '<g id="hd-sh" class="hd-c' + (g.sh ? ' lit' : '') + '" data-k="sh" tabindex="0" role="button" aria-label="נר השמש"><rect x="185" y="92" width="10" height="58" rx="2" fill="#f4f0e4"/>' + (g.sh ? fl(190, 90) : '<rect x="168" y="80" width="44" height="70" fill="transparent"/>') + '</g>';
    for (i = 0; i < 8; i++) {
      var x = slotX(i);
      h += '<rect x="' + (x - 14) + '" y="156" width="28" height="14" rx="3" fill="#e6b53a" opacity="' + (i < 8 ? 1 : 0) + '"/>';
      if (i < g.placed) {
        var order = g.placed - 1 - i;           // 0 = הנר הכי שמאלי (החדש)
        var lit = order < g.lit;
        h += '<g class="hd-c' + (lit ? ' lit' : '') + '" data-k="' + i + '" tabindex="0" role="button" aria-label="נר ' + (i + 1) + '"><rect x="' + (x - 5) + '" y="104" width="10" height="52" rx="2" fill="#f4f0e4"/>' + (lit ? fl(x, 102) : '<rect x="' + (x - 18) + '" y="88" width="36" height="68" fill="transparent"/>') + '</g>';
      }
    }
    $('hd-svg').innerHTML = '<rect width="380" height="260" fill="#16306b" rx="14"/>' +
      '<path d="M30 30 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z M340 40 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z M60 120 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fff4b8"/>' + h;
    $('hd-add').disabled = g.placed >= n || g.done;
    var ls = $('hd-nights').querySelectorAll('button'), x;
    for (x = 0; x < ls.length; x++) ls[x].setAttribute('aria-pressed', String(+ls[x].getAttribute('data-n') === st.night));
    $('hd-night-name').textContent = 'לילה ' + ORD[n - 1] + ': ' + n + (n === 1 ? ' נר' : ' נרות') + ' ועוד השמש';
    $('hd-stars').textContent = st.done[n] ? '⭐ הלילה הזה כבר הודלק' : '';
  }
  function fl(x, y) { return '<path class="hd-f" d="M' + x + ' ' + y + ' C' + (x + 9) + ' ' + (y - 9) + ' ' + (x + 4) + ' ' + (y - 20) + ' ' + x + ' ' + (y - 30) + ' C' + (x - 4) + ' ' + (y - 20) + ' ' + (x - 9) + ' ' + (y - 9) + ' ' + x + ' ' + y + ' Z" fill="#ff9a1f"/><path d="M' + x + ' ' + y + ' C' + (x + 4) + ' ' + (y - 4) + ' ' + (x + 2) + ' ' + (y - 11) + ' ' + x + ' ' + (y - 15) + ' C' + (x - 2) + ' ' + (y - 11) + ' ' + (x - 4) + ' ' + (y - 4) + ' ' + x + ' ' + y + ' Z" fill="#ffe27a"/>'; }
  function say(t, bad) { var m = $('hd-msg'); m.textContent = t; m.className = 'hd-msg' + (bad ? ' bad' : ''); }

  function add() {
    if (g.done || g.placed >= st.night) return;
    g.placed++;
    if (g.placed < st.night) say('עוד ' + (st.night - g.placed) + ' נרות להציב. הנר החדש תמיד מימין.');
    else say('הנרות במקום. עכשיו מדליקים: קודם את השמש, ואז את הנר השמאלי, ומשם ימינה.');
    draw(); used('add');
  }
  function tap(k) {
    if (g.done) return;
    if (g.placed < st.night) { say('קודם מניחים את כל נרות הלילה (' + st.night + ').', true); return; }
    if (k === 'sh') {
      if (g.sh) return;
      if (g.lit > 0) { say('בדרך כלל מדליקים את השמש קודם, ממנה מדליקים את שאר הנרות.', true); g.errs++; return; }
      g.sh = true; say('השמש דולקת. עכשיו הנר השמאלי ביותר, החדש.'); draw(); return;
    }
    if (!g.sh) { say('קודם מדליקים את נר השמש, ממנו מדליקים את כל השאר.', true); g.errs++; return; }
    var i = +k, order = g.placed - 1 - i;
    if (order < g.lit) return;
    if (order !== g.lit) { g.errs++; say('כמעט! מתחילים מהנר החדש, השמאלי, וממשיכים ימינה. נסו את הנר שלידו.', true); return; }
    g.lit++; draw();
    if (g.lit >= st.night) finish(); else say('יפה! ממשיכים ימינה.');
  }
  function finish() {
    g.done = true; st.done[st.night] = 1; save(); draw();
    say('כל הנרות דולקים! חנוכה שמח. ' + (g.errs ? 'היו ' + g.errs + ' טעויות קטנות, וזה בסדר גמור.' : 'בלי אף טעות.'));
    $('hd-win').hidden = false; used('win');
    var next = $('hd-next'); next.hidden = st.night >= 8;
  }
  function startNight(n) { st.night = n; save(); $('hd-win').hidden = true; reset(); used('night'); }

  function init() {
    if (!$('hd-svg')) return;
    var b = $('hd-nights'), i;
    for (i = 1; i <= 8; i++) { var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn btn-line hd-nb'; bt.setAttribute('data-n', i); bt.textContent = i; bt.setAttribute('aria-label', 'לילה ' + ORD[i - 1]); bt.onclick = function () { startNight(+this.getAttribute('data-n')); }; b.appendChild(bt); }
    $('hd-add').onclick = add;
    $('hd-again').onclick = function () { startNight(st.night); };
    $('hd-next').onclick = function () { startNight(Math.min(8, st.night + 1)); };
    $('hd-wa').onclick = function (e) { e.preventDefault(); used('wa'); window.open('https://wa.me/?text=' + encodeURIComponent('משחק הדלקת נרות חנוכה לילדים, בחינם ובלי הרשמה: https://hakelim.com/kodesh/chanuka/mischakim/hadlaka/'), '_blank', 'noopener'); };
    $('hd-svg').addEventListener('click', function (e) { var el = e.target.closest ? e.target.closest('.hd-c') : null; if (el) tap(el.getAttribute('data-k')); });
    $('hd-svg').addEventListener('keydown', function (e) { if (e.key !== 'Enter' && e.key !== ' ') return; var el = e.target.closest ? e.target.closest('.hd-c') : null; if (el) { e.preventDefault(); tap(el.getAttribute('data-k')); } });
    // מתחילים בלילה הראשון שלא הודלק, או באחרון
    var s = 1; while (s < 8 && st.done[s]) s++; st.night = s;
    reset();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
