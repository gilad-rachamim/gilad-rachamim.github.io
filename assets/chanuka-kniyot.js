// מחשבון קניות לחנוכה – /kodesh/chanuka/kniyot/
// חשבון פשוט: בשמונה לילות מדליקים 1+2+...+8 = 36 נרות לכל חנוכייה, ועוד שמש בכל לילה = 8.
(function () {
  'use strict';
  var TOOL = 'chanuka_kniyot', KEY = 'kodesh-chanuka-kniyot';
  function $(id) { return document.getElementById(id); }
  var st = { n: 2, kind: 'oil', shamash: 'candle', ml: 25, have: {} };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || '{}'); for (var k in sv) if (k in st) st[k] = sv[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var once = {};
  function used(how) { if (once[how]) return; once[how] = 1; if (window.toolUsed) window.toolUsed(TOOL, { how: how, n: st.n, kind: st.kind }); }
  function fmt(x) { return String(Math.round(x * 100) / 100).replace(/\.0+$/, ''); }

  function calc() {
    var n = Math.max(1, Math.min(30, parseInt(st.n, 10) || 1)), rows = [];
    var lights = 36 * n, sham = 8 * n;
    if (st.kind === 'oil') {
      var cups = lights + (st.shamash === 'oil' ? sham : 0), ml = Math.max(5, Math.min(200, +st.ml || 25));
      var liters = cups * ml / 1000;
      rows.push(['שמן זית', fmt(Math.ceil(liters * 4) / 4) + ' ליטר', 'בערך: ' + cups + ' כוסות × ' + ml + ' מ"ל. בערב שבת שמים יותר.']);
      rows.push(['פתילות צפות', Math.ceil(cups * 1.1) + ' פתילות', cups + ' לשמונה הלילות, ועוד קצת ליתר ביטחון.']);
      rows.push(['כוסות (אם הן חד-פעמיות)', cups + ' כוסות', 'כוסות זכוכית קבועות – ' + (8 + (st.shamash === 'oil' ? 1 : 0)) + ' לכל חנוכייה, ושוטפים כל יום.']);
    } else {
      var all = lights + (st.shamash === 'candle' || st.shamash === 'oil' ? sham : 0);
      rows.push(['נרות חנוכה', all + ' נרות', 'קופסה רגילה של 44 נרות מספיקה לחנוכייה אחת עם שמש: צריך ' + Math.ceil(all / 44) + ' קופסאות.']);
    }
    if (st.kind === 'oil' && st.shamash === 'candle') rows.push(['נרות לשמש', sham + ' נרות', 'נר אחד לכל לילה, לכל חנוכייה.']);
    rows.push(['גפרורים או מצית', '1', '']);
    $('kn-rows').innerHTML = rows.map(function (r) { return '<tr><td><b>' + r[0] + '</b>' + (r[2] ? '<small>' + r[2] + '</small>' : '') + '</td><td class="t">' + r[1] + '</td></tr>'; }).join('');
    $('kn-sum').textContent = n === 1 ? 'לחנוכייה אחת: 36 נרות בשמונה הלילות, ועוד 8 פעמים השמש.' : 'ל-' + n + ' חנוכיות: ' + lights + ' נרות בשמונה הלילות, ועוד ' + sham + ' פעמים השמש.';
    $('kn-ml-row').style.display = st.kind === 'oil' ? '' : 'none';
    var opt = $('kn-shamash').querySelector('option[value=oil]'); opt.disabled = st.kind !== 'oil';
    if (st.kind !== 'oil' && st.shamash === 'oil') { st.shamash = 'candle'; $('kn-shamash').value = 'candle'; }
    var t = 'רשימת קניות לחנוכה (' + n + (n === 1 ? ' חנוכייה' : ' חנוכיות') + '):\n' + rows.map(function (r) { return '• ' + r[0] + ': ' + r[1]; }).join('\n') +
      '\n\nהמחשבון בחינם:\n' + location.origin + '/kodesh/chanuka/kniyot/';
    $('kn-wa').href = 'https://wa.me/?text=' + encodeURIComponent(t);
  }

  $('kn-n').value = st.n; $('kn-ml').value = st.ml; $('kn-shamash').value = st.shamash;
  document.querySelectorAll('input[name=kn-kind]').forEach(function (r) {
    r.checked = r.value === st.kind;
    r.addEventListener('change', function () { if (r.checked) { st.kind = r.value; save(); calc(); used('calc'); } });
  });
  $('kn-n').addEventListener('input', function () { st.n = $('kn-n').value; save(); calc(); used('calc'); });
  $('kn-ml').addEventListener('input', function () { st.ml = $('kn-ml').value; save(); calc(); used('calc'); });
  $('kn-shamash').addEventListener('change', function () { st.shamash = $('kn-shamash').value; save(); calc(); used('calc'); });
  document.querySelectorAll('[data-step]').forEach(function (b) {
    b.addEventListener('click', function () { var v = Math.max(1, Math.min(30, (parseInt($('kn-n').value, 10) || 1) + (+b.getAttribute('data-step')))); $('kn-n').value = st.n = v; save(); calc(); used('calc'); });
  });
  $('kn-wa').addEventListener('click', function () { used('wa'); });
  $('kn-print').onclick = function () { used('print'); window.print(); };
  calc();
})();
