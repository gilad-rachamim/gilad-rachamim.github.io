// שירון לחנוכה – מציג את הנוסח מ-chanuka-nusach.js (ספריא, סידור עדות המזרח, CC0).
// המילים והניקוד כמו במקור. לתצוגה בלבד: הטעמים (סימני הנגינה) מוסתרים כדי שיהיה קל לקרוא ליד החנוכייה,
// ובמזמורים כל פסוק בשורה משלו.
(function () {
  'use strict';
  var TOOL = 'chanuka_shiron', KEY = 'chanuka_shiron_v1';
  var N = window.CHANUKA_NUSACH;
  function $(id) { return document.getElementById(id); }
  var once = {};
  function used(how, extra) {
    var k = how + (extra ? JSON.stringify(extra) : '');
    if (once[k]) return; once[k] = 1;
    if (window.toolUsed) { var o = { how: how }; if (extra) for (var p in extra) o[p] = extra[p]; window.toolUsed(TOOL, o); }
  }
  var st = { size: 1, night: false };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || '{}'); if (typeof sv.size === 'number') st.size = sv.size; st.night = !!sv.night; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  // טעמים: U+0591–U+05AF, וגם פסיק (U+05C0) ומתג (U+05BD) שנשען עליהם
  function noTaamim(h) { return h.replace(/[֑-ֽ֯]/g, '').replace(/\s*׀\s*/g, ' '); }
  function para(s, cls) { return '<p' + (cls ? ' class="' + cls + '"' : '') + '>' + noTaamim(s.h) + '</p>'; }
  // הוראה (לא נאמרת): פותחת ב-<small> ואין בה ניקוד
  function isNote(h) { return /^<small>/.test(h) && !/[ְ-ּ]/.test(h.replace(/<[^>]+>/g, '')); }
  // פסוק בשורה משלו: אחרי כל סוף פסוק (׃)
  function verses(s) { return '<p class="sh-ps">' + noTaamim(s.h).replace(/׃ /g, '׃<br>') + '</p>'; }

  function render() {
    if (!N) { $('sh-songs').innerHTML = '<p class="sh-st">לא הצלחנו לטעון את הנוסח. נסו לרענן את הדף.</p>'; return; }
    var P = N.parts;
    var put = function (id, list, fn) { var el = $(id); if (el) el.innerHTML = list.map(fn).join(''); };
    put('sh-brachot', P.brachot, function (s) { return isNote(s.h) ? para(s, 'sh-ins') : para(s); });
    put('sh-halalu', P.halalu, function (s) { return isNote(s.h) ? para(s, 'sh-ins') : para(s); });
    put('sh-maoz', P.maoz.slice(2), function (s) {
      // כל בית בפסקה משלו, כמו במקור (רק בבית הראשון יש במקור נקודות בין השורות, ולכן לא מפרקים לשורות)
      return '<p class="sh-bayit">' + noTaamim(s.h) + '</p>';
    });
    var simanEl = $('sh-siman'); if (simanEl && P.maoz[1]) simanEl.innerHTML = noTaamim(P.maoz[1].h.replace(/<[^>]+>/g, ''));
    put('sh-mizmor', P.mizmor, verses);
    put('sh-segula', P.segula, function (s) { return isNote(s.h) ? para(s, 'sh-ins') : verses(s); });
    $('sh-src').textContent = 'הנוסח: ' + N.src + '. המילים והניקוד כמו במקור; שם ה׳ נכתב ה׳, וסימני הטעמים הוסתרו לנוחות הקריאה.';
  }

  var SIZES = [1.15, 1.3, 1.5, 1.75, 2.05, 2.4];
  function apply() {
    st.size = Math.max(0, Math.min(SIZES.length - 1, st.size));
    document.documentElement.style.setProperty('--sh-fs', SIZES[st.size] + 'rem');
    document.body.classList.toggle('sh-night', st.night);
    $('sh-night').setAttribute('aria-pressed', st.night ? 'true' : 'false');
    $('sh-night').textContent = st.night ? '☀️ מצב רגיל' : '🌙 מצב לילה';
    $('sh-minus').disabled = st.size === 0;
    $('sh-plus').disabled = st.size === SIZES.length - 1;
  }

  render();
  apply();
  $('sh-plus').onclick = function () { st.size++; apply(); save(); used('font', { size: st.size }); };
  $('sh-minus').onclick = function () { st.size--; apply(); save(); used('font', { size: st.size }); };
  $('sh-night').onclick = function () { st.night = !st.night; apply(); save(); used(st.night ? 'night_on' : 'night_off'); };
  $('sh-print').onclick = function () { used('print'); window.print(); };
  var wa = $('sh-wa'); if (wa) wa.addEventListener('click', function () { used('wa'); });
  document.querySelectorAll('.sh-chips a').forEach(function (a) {
    a.addEventListener('click', function () { used('jump', { to: a.getAttribute('href').slice(1) }); });
  });
})();
