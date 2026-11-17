/* מערכת שעות להדפסה: ממלאים בדף, נשמר במכשיר, מדפיסים */
(function () {
  var host = document.getElementById('ms-host'); if (!host) return;
  var KEY = 'kelim_maarechet_shaot', DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
  var st = { rows: 8, fri: true, hours: false, color: '#e8f0ff', name: '', c: {} };
  try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) for (var k in s) st[k] = s[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(v) { return String(v || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function draw() {
    var days = st.fri ? DAYS : DAYS.slice(0, 5), h = '<table class="ms-tbl" style="--ms-c:' + st.color + '"><thead><tr><th style="width:34px">#</th>';
    if (st.hours) h += '<th style="width:70px">שעה</th>';
    days.forEach(function (d) { h += '<th>' + d + '</th>'; });
    h += '</tr></thead><tbody>';
    for (var r = 0; r < st.rows; r++) {
      h += '<tr><td class="ms-n">' + (r + 1) + '</td>';
      if (st.hours) h += '<td><input data-k="h' + r + '" value="' + esc(st.c['h' + r]) + '" aria-label="שעה, שיעור ' + (r + 1) + '" dir="ltr"></td>';
      days.forEach(function (d, i) { h += '<td><input data-k="' + r + '_' + i + '" value="' + esc(st.c[r + '_' + i]) + '" aria-label="יום ' + d + ', שיעור ' + (r + 1) + '"></td>'; });
      h += '</tr>';
    }
    host.innerHTML = h + '</tbody></table>';
  }
  host.addEventListener('input', function (e) { var k = e.target.dataset.k; if (k) { st.c[k] = e.target.value; save(); } });
  var nm = document.getElementById('ms-name'); nm.value = st.name; nm.addEventListener('input', function () { st.name = nm.value; save(); });
  var rw = document.getElementById('ms-rows'); rw.value = st.rows; rw.addEventListener('change', function () { st.rows = +rw.value; save(); draw(); });
  var fr = document.getElementById('ms-fri'); fr.checked = st.fri; fr.addEventListener('change', function () { st.fri = fr.checked; save(); draw(); });
  var hr = document.getElementById('ms-hours'); hr.checked = st.hours; hr.addEventListener('change', function () { st.hours = hr.checked; save(); draw(); });
  [].forEach.call(document.querySelectorAll('#ms-colors button'), function (b) {
    b.style.background = b.dataset.v; b.setAttribute('aria-pressed', b.dataset.v === st.color);
    b.addEventListener('click', function () { st.color = b.dataset.v; save(); draw(); [].forEach.call(document.querySelectorAll('#ms-colors button'), function (o) { o.setAttribute('aria-pressed', o === b); }); });
  });
  document.getElementById('ms-print').addEventListener('click', function () { window.print(); });
  document.getElementById('ms-clear').addEventListener('click', function () { if (confirm('למחוק את כל מה שכתבתם במערכת?')) { st.c = {}; st.name = ''; nm.value = ''; save(); draw(); } });
  draw();
})();
