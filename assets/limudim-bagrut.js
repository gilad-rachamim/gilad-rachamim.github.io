/* מחשבון ממוצע בגרות – הכלים של גילעד רחמים. הערכה בלבד */
(function () {
  var tb = document.getElementById('bg-rows'); if (!tb) return;
  var DEF = [['מתמטיקה', 4, ''], ['אנגלית', 4, ''], ['לשון', 2, ''], ['ספרות', 2, ''], ['היסטוריה', 2, ''], ['אזרחות', 2, ''], ['תנ"ך', 2, ''], ['מקצוע מוגבר', 5, '']];
  var KEY = 'bagrut-rows', firstUse = true, out = document.getElementById('bg-res');
  function load() { try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && d.length) return d; } catch (e) {} return DEF; }
  function row(r) {
    var tr = document.createElement('div'); tr.className = 'bg-row';
    tr.innerHTML = '<input class="bg-s" aria-label="מקצוע" value="' + String(r[0]).replace(/"/g, '&quot;') + '">' +
      '<select class="bg-u" aria-label="יחידות לימוד">' + [1, 2, 3, 4, 5].map(function (u) { return '<option' + (u == r[1] ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select>' +
      '<input class="bg-g" aria-label="ציון" type="number" inputmode="numeric" min="0" max="100" placeholder="ציון" value="' + r[2] + '">' +
      '<button type="button" class="bg-x" aria-label="למחוק את השורה">✕</button>';
    tb.appendChild(tr);
  }
  function rows() { return [].map.call(tb.querySelectorAll('.bg-row'), function (tr) { return [tr.querySelector('.bg-s').value, +tr.querySelector('.bg-u').value, tr.querySelector('.bg-g').value]; }); }
  function bonus(name, u, g) {
    if (g < 60) return 0;
    if (u === 5) return /מתמטיקה/.test(name) ? 35 : 25;
    if (u === 4) return 12.5;
    return 0;
  }
  function calc() {
    var R = rows(), su = 0, sg = 0, sb = 0, n = 0;
    try { localStorage.setItem(KEY, JSON.stringify(R)); } catch (e) {}
    R.forEach(function (r) { var g = parseFloat(r[2]); if (!(g >= 0 && g <= 100)) return; n++; su += r[1]; sg += g * r[1]; sb += (g + bonus(r[0], r[1], g)) * r[1]; });
    if (!n) { out.hidden = true; return; }
    var avg = sg / su, avgB = sb / su;
    out.hidden = false;
    out.innerHTML = '<h3>ממוצע הבגרות שלכם</h3><p class="big">' + avg.toFixed(2) + ' <span class="g">ממוצע משוקלל, בלי בונוס</span></p>' +
      '<ul><li>עם בונוס נפוץ באוניברסיטאות: <b>' + avgB.toFixed(2) + '</b></li><li>' + n + ' מקצועות, ' + su + ' יחידות לימוד' + (su < 21 ? ' (לתעודת בגרות מלאה צריך לפחות 21)' : '') + '.</li></ul>';
    if (firstUse) { firstUse = false; try { window.toolUsed && window.toolUsed('limudim_bagrut', { how: 'calc' }); } catch (e) {} }
  }
  load().forEach(row);
  tb.addEventListener('input', calc); tb.addEventListener('change', calc);
  tb.addEventListener('click', function (e) { if (e.target.classList.contains('bg-x')) { e.target.parentNode.remove(); calc(); } });
  document.getElementById('bg-add').addEventListener('click', function () { row(['', 2, '']); tb.lastChild.querySelector('.bg-s').focus(); });
  document.getElementById('bg-reset').addEventListener('click', function () { tb.innerHTML = ''; DEF.forEach(row); calc(); });
  calc();
})();
