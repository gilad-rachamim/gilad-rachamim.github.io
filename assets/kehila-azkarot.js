// יארצייטים של הקהילה: שם + תאריך עברי של הפטירה -> מתי חל השנה, השבת שלפני, הודעה למשפחה, יומן ודף לתלייה.
// הלוח העברי מחושב בטלפון בעזרת Intl (בלי ספרייה ובלי שרת). הכול נשמר בטלפון (localStorage).
// לא מכריעים מנהג: בשנה מעוברת ובחודש בלי ל׳ – מציגים הערה "שואלים את הרב".
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('az-form');
  if (!form) return;
  var KEY = 'kelim-kehila-azkarot', TOOL = 'kehila_azkarot';
  var MK = ['Tishri', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar I', 'Adar II', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul'];
  var HM = { Tishri: 'תשרי', Heshvan: 'חשוון', Kislev: 'כסלו', Tevet: 'טבת', Shevat: 'שבט', Adar: 'אדר', 'Adar I': 'אדר א׳', 'Adar II': 'אדר ב׳', Nisan: 'ניסן', Iyar: 'אייר', Sivan: 'סיוון', Tamuz: 'תמוז', Av: 'אב', Elul: 'אלול' };
  var WD = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function gem(n) {
    var h = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'], t = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], u = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    var o = h[Math.floor(n / 100)], r = n % 100;
    o += r === 15 ? 'טו' : r === 16 ? 'טז' : t[Math.floor(r / 10)] + u[r % 10];
    return o.length > 1 ? o.slice(0, -1) + '״' + o.slice(-1) : o + '׳';
  }
  function iso(d) { return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2); }
  function dm(s) { var p = s.split('-'); return +p[2] + '.' + +p[1]; }
  function addDays(s, n) { var p = s.split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return iso(d); }
  var HF;
  try { HF = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', timeZone: 'UTC' }); } catch (e) { HF = null; }
  function hparts(s) {
    var p = s.split('-'), o = {};
    HF.formatToParts(new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]))).forEach(function (x) { o[x.type] = x.value; });
    return { d: +o.day, m: o.month };
  }
  function hlabel(d, m) { return gem(d) + ' ב' + HM[m]; }
  // טבלה של 390 הימים הבאים (שנה עברית ארוכה היא 385 ימים)
  var now = new Date(), T0 = iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))), TAB = [];
  if (HF) for (var i = 0; i < 390; i++) { var s = addDays(T0, i), hp = hparts(s); TAB.push({ s: s, d: hp.d, m: hp.m, wd: new Date(s + 'T12:00:00Z').getUTCDay() }); }
  function mm(stored, m) {
    if (stored === m) return true;
    if (stored === 'Adar') return m === 'Adar I' || m === 'Adar II';
    if (stored === 'Adar I' || stored === 'Adar II') return m === 'Adar';
    return false;
  }
  function occ(r) {
    var e = -1, f = -1;
    for (var i = 0; i < TAB.length; i++) {
      var x = TAB[i];
      if (mm(r.m, x.m) && x.d === r.d) { e = i; break; }
      if (r.d === 30 && f < 0 && mm(r.m, x.m) && x.d === 29 && TAB[i + 1] && TAB[i + 1].m !== x.m) f = i;
    }
    if (e < 0 && f < 0) return null;
    var o = { i: e, note: '' };
    if (f >= 0 && (e < 0 || f < e)) { o.i = f; o.note = 'השנה אין ל׳ ב' + HM[r.m] + ' – שואלים את הרב באיזה יום. ביום כ״ט:'; }
    var x0 = TAB[o.i];
    o.s = x0.s; o.wd = x0.wd; o.hm = x0.m;
    if (r.m === 'Adar' && x0.m === 'Adar I') {
      for (var j = o.i + 1; j < TAB.length; j++) if (TAB[j].m === 'Adar II' && TAB[j].d === r.d) { o.s2 = TAB[j].s; break; }
    }
    if (r.m === 'Adar' && (x0.m === 'Adar I' || x0.m === 'Adar II')) o.note = 'השנה מעוברת – שואלים את הרב אם באדר א׳ או באדר ב׳.';
    o.sat = x0.wd === 6 ? '' : addDays(x0.s, -(x0.wd + 1));
    return o;
  }
  function pick(i) { var x = TAB[Math.min(i, TAB.length - 1)]; return { d: x.d, m: x.m }; }
  // בכניסה הראשונה: דוגמה עם שמות בדויים, בתאריכים שנופלים השבוע, החודש ובהמשך השנה
  function demo() {
    var a = pick(3), b = pick(12), c = pick(26), d = pick(95), e = pick(210);
    return { demo: 1, shul: 'בית הכנסת אוהל משה', sig: 'הגבאי', theme: 'lavan', items: [
      { id: 'd1', name: 'יעקב בן שרה', d: a.d, m: a.m, fam: 'הבן, משה', phone: '' },
      { id: 'd2', name: 'מזל בת רחל', d: b.d, m: b.m, fam: 'הבת, אורית', phone: '' },
      { id: 'd3', name: 'אברהם בן מסעודה', d: c.d, m: c.m, fam: 'הנכד, אליה', phone: '' },
      { id: 'd4', name: 'שמחה בת יקוט', d: d.d, m: d.m, fam: '', phone: '' },
      { id: 'd5', name: 'חיים בן אסתר', d: e.d, m: e.m, fam: 'האח, שלום', phone: '' }
    ] };
  }
  var st = null;
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.items) st = sv; } catch (e) {}
  if (!st) st = HF ? demo() : { demo: 0, shul: '', sig: '', theme: 'lavan', items: [] };
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how, theme: st.theme }); }
  function waNum(p) { var d = String(p || '').replace(/\D/g, ''); if (!d) return ''; if (d[0] === '0') d = '972' + d.slice(1); return d; }
  function when(o) { return 'יום ' + WD[o.wd] + ' ' + dm(o.s); }
  function msg(r, o) {
    var t = 'שלום' + (r.fam ? ' ' + r.fam.replace(/^(הבן|הבת|הנכד|הנכדה|האח|האחות|האישה|הבעל|האב|האם),?\s*/, '') : '') + ',\n' +
      'ב' + when(o) + ' (' + hlabel(r.d, r.m) + ') יחול יום השנה של ' + r.name + ' ז״ל. היום מתחיל בערב שלפני, ' + dm(addDays(o.s, -1)) + '.\n' +
      (st.shul || 'בית הכנסת') + ' ישמח לכבד אתכם בעלייה לתורה' + (o.sat && o.sat >= T0 ? ' בשבת שלפני (' + dm(o.sat) + ')' : '') + ', ולעזור בכל מה שצריך לעילוי נשמתו.\nרק תעדכנו אותי.' + (st.sig ? '\n' + st.sig : '');
    var n = waNum(r.phone);
    return (n ? 'https://wa.me/' + n : 'https://api.whatsapp.com/send') + '?text=' + encodeURIComponent(t);
  }
  function gcal(r, o) {
    var a = o.s.replace(/-/g, ''), b = addDays(o.s, 1).replace(/-/g, '');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('יארצייט: ' + r.name) + '&dates=' + a + '/' + b +
      '&details=' + encodeURIComponent(hlabel(r.d, r.m) + (r.fam ? '\nמשפחה: ' + r.fam + (r.phone ? ' ' + r.phone : '') : '') + '\nמתחיל בערב שלפני.');
  }
  function card(x) {
    var r = x.r, o = x.o;
    if (!o) return '<div class="kh-item"><div class="top"><b>' + esc(r.name) + '</b><span>' + hlabel(r.d, r.m) + '</span></div><p class="warn">לא נמצא תאריך השנה. בודקים את היום והחודש.</p><div class="acts"><button type="button" data-del="' + r.id + '">למחוק</button></div></div>';
    var days = o.i === 0 ? 'היום' : o.i === 1 ? 'מחר' : 'בעוד ' + o.i + ' ימים';
    return '<div class="kh-item' + (o.i <= 7 ? ' soon' : '') + '"><div class="top"><b>' + esc(r.name) + '</b><span>' + hlabel(r.d, r.m) + ' · ' + days + '</span></div>' +
      (o.note ? '<p class="warn">' + o.note + '</p>' : '') +
      '<p><span class="lbl">השנה:</span> ' + when(o) + (o.s2 ? ' או ' + dm(o.s2) + ' (אדר ב׳)' : '') + ' · מתחיל בערב ' + dm(addDays(o.s, -1)) + '</p>' +
      '<p><span class="lbl">שבת לפני:</span> ' + (o.sat ? dm(o.sat) + (o.sat < T0 ? ' (כבר עברה)' : '') : 'היארצייט חל בשבת') + (r.fam ? ' · <span class="lbl">משפחה:</span> ' + esc(r.fam) : '') + '</p>' +
      '<div class="acts"><a href="' + msg(r, o) + '" target="_blank" rel="noopener" data-wa1="1">הודעה למשפחה</a><a href="' + gcal(r, o) + '" target="_blank" rel="noopener" data-cal="1">ליומן</a><button type="button" data-del="' + r.id + '">למחוק</button></div></div>';
  }
  function list() {
    return st.items.map(function (r) { return { r: r, o: HF ? occ(r) : null }; }).sort(function (a, b) { return (a.o ? a.o.i : 999) - (b.o ? b.o.i : 999); });
  }
  function draw() {
    $('az-demo').hidden = !st.demo;
    var L = list(), wk = L.filter(function (x) { return x.o && x.o.i <= 7; }), mo = L.filter(function (x) { return x.o && x.o.i > 7 && x.o.i <= 31; });
    $('az-week').innerHTML = wk.length ? wk.map(card).join('') : '<p class="kh-empty">אין יארצייט בשבוע הקרוב.</p>';
    $('az-month').innerHTML = mo.length ? mo.map(card).join('') : '<p class="kh-empty">אין עוד יארצייטים בחודש הקרוב.</p>';
    $('az-all').innerHTML = L.length ? L.map(card).join('') : '<p class="kh-empty">עוד אין שמות. רושמים את הראשון למעלה.</p>';
    var th = st.theme || 'lavan';
    [].forEach.call($('az-theme').children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === th); });
    var c = $('az-card'); c.className = 'kh-card t-' + th;
    c.innerHTML = '<h3>לוח היארצייטים' + (st.shul ? ' – ' + esc(st.shul) : '') + '</h3><p class="s2">לפי הסדר מהיום, שנה קדימה</p>' +
      '<table><thead><tr><th>שם</th><th>תאריך עברי</th><th>השנה חל ב</th><th>שבת לפני</th></tr></thead><tbody>' +
      L.filter(function (x) { return x.o; }).map(function (x) { return '<tr><td class="rl">' + esc(x.r.name) + ' ז״ל</td><td>' + hlabel(x.r.d, x.r.m) + '</td><td>' + when(x.o) + (x.o.s2 ? ' / ' + dm(x.o.s2) : '') + '</td><td>' + (x.o.sat ? dm(x.o.sat) : 'בשבת') + '</td></tr>'; }).join('') +
      '</tbody></table><p class="ft">מי שיש לו יארצייט ולא מופיע כאן – מוזמן לגשת לגבאי.</p>';
    var mt = 'יארצייטים בחודש הקרוב' + (st.shul ? ' – ' + st.shul : '') + '\n\n' + wk.concat(mo).map(function (x) { return '• ' + x.r.name + ' ז״ל – ' + hlabel(x.r.d, x.r.m) + ' (' + when(x.o) + ')'; }).join('\n');
    $('az-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(mt);
  }
  // בחירת יום וחודש
  var ds = ''; for (var k = 1; k <= 30; k++) ds += '<option value="' + k + '">' + gem(k) + '</option>';
  $('az-d').innerHTML = ds;
  $('az-m').innerHTML = MK.map(function (m) { return '<option value="' + m + '">' + HM[m] + '</option>'; }).join('');
  if (HF) { var t0 = hparts(T0); $('az-d').value = String(t0.d); $('az-m').value = t0.m; }
  $('az-conv').addEventListener('click', function () {
    var v = $('az-greg').value, m = $('az-msg');
    if (!v || !HF) { m.textContent = 'בוחרים תאריך לועזי קודם.'; return; }
    var h = hparts($('az-night').checked ? addDays(v, 1) : v);
    $('az-d').value = String(h.d); $('az-m').value = h.m;
    m.textContent = 'התאריך העברי: ' + hlabel(h.d, h.m) + ' ✓';
  });
  function fill() { $('az-shul').value = st.shul || ''; $('az-sig').value = st.sig || ''; }
  ['shul', 'sig'].forEach(function (k) { $('az-' + k).addEventListener('input', function () { st[k] = this.value.trim(); save(); draw(); }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('az-name').value.trim(), m = $('az-msg');
    if (!name) { m.textContent = 'חסר שם הנפטר.'; $('az-name').focus(); return; }
    if (st.demo) { st.items = []; st.demo = 0; }
    st.items.push({ id: 'z' + Date.now(), name: name, d: +$('az-d').value, m: $('az-m').value, fam: $('az-fam').value.trim(), phone: $('az-phone').value.trim() });
    save(); draw();
    m.textContent = 'נוסף לרשימה ✓';
    ['az-name', 'az-fam', 'az-phone', 'az-greg'].forEach(function (id) { $(id).value = ''; });
    used('add');
  });
  $('az-demo-x').addEventListener('click', function () { st.items = []; st.demo = 0; save(); draw(); });
  $('az-theme').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.theme = b.getAttribute('data-t'); save(); draw(); });
  document.querySelector('.tool').addEventListener('click', function (e) {
    var t = e.target.closest('[data-del],[data-wa1],[data-cal]'); if (!t) return;
    if (t.hasAttribute('data-wa1')) { used('wa'); return; }
    if (t.hasAttribute('data-cal')) { used('calendar'); return; }
    var id = t.getAttribute('data-del'), r = st.items.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    if (!confirm('למחוק את ' + r.name + ' מהרשימה?')) return;
    st.items = st.items.filter(function (x) { return x !== r; }); save(); draw();
  });
  $('az-print').addEventListener('click', function () { used('print'); window.print(); });
  $('az-wa').addEventListener('click', function () { used('wa'); });
  fill(); draw();
})();
