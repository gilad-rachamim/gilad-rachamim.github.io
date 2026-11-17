/* מחשבון גיל: שנים, חודשים וימים, יום ההולדת הבא, תאריך עברי */
(function () {
  var b = document.getElementById('gl-b'); if (!b) return;
  function $(i) { return document.getElementById(i); }
  var t = $('gl-t'), DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(v) { if (!v) return null; var p = v.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d) ? null : d; }
  t.value = iso(new Date());
  try { var s = localStorage.getItem('kelim_gil'); if (s) b.value = s; } catch (e) {}
  function n(v) { return v.toLocaleString('he-IL'); }
  function run() {
    var bd = parse(b.value), td = parse(t.value) || new Date();
    if (!bd || bd > td) { $('gl-out').hidden = true; $('gl-err').textContent = bd ? 'תאריך הלידה מאוחר מהתאריך שבודקים.' : ''; return; }
    $('gl-err').textContent = '';
    var y = td.getFullYear() - bd.getFullYear(), m = td.getMonth() - bd.getMonth(), d = td.getDate() - bd.getDate();
    if (d < 0) { m--; d += new Date(td.getFullYear(), td.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    var days = Math.round((Date.UTC(td.getFullYear(), td.getMonth(), td.getDate()) - Date.UTC(bd.getFullYear(), bd.getMonth(), bd.getDate())) / 864e5);
    $('gl-main').textContent = y + ' שנים, ' + m + ' חודשים ו-' + d + ' ימים';
    $('gl-months').textContent = n(y * 12 + m); $('gl-weeks').textContent = n(Math.floor(days / 7)); $('gl-days').textContent = n(days); $('gl-hours').textContent = n(days * 24);
    $('gl-dow').textContent = 'יום ' + DAYS[bd.getDay()];
    var nx = new Date(td.getFullYear(), bd.getMonth(), bd.getDate()); if (nx < td) nx = new Date(td.getFullYear() + 1, bd.getMonth(), bd.getDate());
    var left = Math.round((Date.UTC(nx.getFullYear(), nx.getMonth(), nx.getDate()) - Date.UTC(td.getFullYear(), td.getMonth(), td.getDate())) / 864e5);
    $('gl-next').textContent = left === 0 ? 'היום! מזל טוב 🎉' : 'בעוד ' + n(left) + ' ימים, ביום ' + DAYS[nx.getDay()] + ' (גיל ' + (nx.getFullYear() - bd.getFullYear()) + ')';
    try { $('gl-heb').textContent = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }).format(bd); } catch (e) { $('gl-heb').textContent = '–'; }
    $('gl-out').hidden = false;
    try { localStorage.setItem('kelim_gil', b.value); } catch (e) {}
  }
  b.addEventListener('input', run); t.addEventListener('input', run); run();
})();
