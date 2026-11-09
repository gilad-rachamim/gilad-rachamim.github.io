// לוח עליות ותורנויות לבית הכנסת: מתפללים (כהן/לוי מסומנים), תפקידים, וחלוקה הוגנת לכמה שבתות קדימה.
// הכול נשמר בטלפון (localStorage). הלוח מתחיל תמיד מהשבת הקרובה, כך שהוא מתקדם לבד כל שבוע.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('al-form');
  if (!form) return;
  var KEY = 'kelim-kehila-aliyot', TOOL = 'kehila_aliyot';
  var ROLES = 'פתיחת ההיכל\nכהן\nלוי\nשלישי\nרביעי\nחמישי\nשישי\nשביעי\nמפטיר\nחזן שחרית\nחזן מוסף\nחזן מנחה\nסידור וניקיון';
  // שמות בדויים לדוגמה
  var DEMO_P = 'שמעון אזולאי (כ)\nיעקב פרץ (כ)\nמשה לוי (ל)\nאהרן ביטון (ל)\nיוסף אוחיון\nדוד מימון\nבנימין חדד\nשלמה עמר\nאליהו דהן\nנתנאל אסולין\nיצחק בן חמו\nרפאל אלמוג\nמאיר שושן\nחיים אבוטבול';
  var ISR = { 'שלישי': 1, 'רביעי': 1, 'חמישי': 1, 'שישי': 1, 'שביעי': 1 };
  var st = { demo: 1, shul: 'בית הכנסת אוהל משה', people: DEMO_P, roles: ROLES, n: 4, theme: 'lavan', w: {} };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.roles != null) st = sv; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how, theme: st.theme }); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dm(s) { var p = s.split('-'); return +p[2] + '.' + +p[1]; }
  // תאריך עברי (אותיות) בלי ספרייה: Intl עם לוח עברי
  var HM = { Tishri: 'תשרי', Heshvan: 'חשוון', Kislev: 'כסלו', Tevet: 'טבת', Shevat: 'שבט', Adar: 'אדר', 'Adar I': 'אדר א׳', 'Adar II': 'אדר ב׳', Nisan: 'ניסן', Iyar: 'אייר', Sivan: 'סיוון', Tamuz: 'תמוז', Av: 'אב', Elul: 'אלול' };
  function gem(n) {
    var h = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'], t = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], u = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    var o = h[Math.floor(n / 100)], r = n % 100;
    o += r === 15 ? 'טו' : r === 16 ? 'טז' : t[Math.floor(r / 10)] + u[r % 10];
    return o.length > 1 ? o.slice(0, -1) + '״' + o.slice(-1) : o + '׳';
  }
  var HF = null;
  try { HF = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', timeZone: 'UTC' }); } catch (e) {}
  function hdate(s) {
    if (!HF) return '';
    var p = s.split('-'), d = {}, parts = HF.formatToParts(new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])));
    parts.forEach(function (x) { d[x.type] = x.value; });
    return HM[d.month] ? gem(+d.day) + ' ב' + HM[d.month] : '';
  }
  function people() {
    return st.people.split('\n').map(function (l) {
      l = l.trim(); if (!l) return null;
      var k = /\((כ|כהן)\)\s*$/.test(l) ? 'k' : /\((ל|לוי)\)\s*$/.test(l) ? 'l' : '';
      return { n: l.replace(/\s*\((כ|כהן|ל|לוי)\)\s*$/, '').trim(), k: k };
    }).filter(function (x) { return x && x.n; });
  }
  function roles() { return st.roles.split('\n').map(function (r) { return r.trim(); }).filter(Boolean); }
  function pool(role, ps) {
    if (role === 'כהן') return ps.filter(function (p) { return p.k === 'k'; });
    if (role === 'לוי') return ps.filter(function (p) { return p.k === 'l'; });
    if (ISR[role]) return ps.filter(function (p) { return !p.k; });
    return ps;
  }
  function weeks() {
    var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + (6 - d.getDay()));
    var out = [];
    for (var i = 0; i < +st.n; i++) { out.push(iso(d)); d.setDate(d.getDate() + 7); }
    return out;
  }
  // חלוקה הוגנת: בכל תפקיד – מי שקיבל אותו הכי מעט פעמים, ואחר כך מי שקיבל הכי מעט בסך הכול.
  // שבתות קודמות שכבר נשמרו נספרות, כך שהסבב ממשיך מאיפה שעצר.
  function auto() {
    var ps = people(), rs = roles(), ws = weeks(), byRole = {}, tot = {};
    ps.forEach(function (p) { tot[p.n] = 0; byRole[p.n] = {}; });
    Object.keys(st.w).forEach(function (k) {
      if (k >= ws[0]) return;
      var a = st.w[k]; Object.keys(a).forEach(function (r) { var n = a[r]; if (tot[n] == null) return; tot[n]++; byRole[n][r] = (byRole[n][r] || 0) + 1; });
    });
    ws.forEach(function (wk, wi) {
      var a = {}, taken = {};
      rs.forEach(function (r) {
        var c = pool(r, ps); if (!c.length) { a[r] = ''; return; }
        var free = c.filter(function (p) { return !taken[p.n]; }); if (free.length) c = free;
        var best = null, bs = Infinity;
        c.forEach(function (p, i) {
          var s = (byRole[p.n][r] || 0) * 1000 + tot[p.n] * 10 + ((i + wi) % c.length) / c.length;
          if (s < bs) { bs = s; best = p; }
        });
        a[r] = best.n; taken[best.n] = 1; tot[best.n]++; byRole[best.n][r] = (byRole[best.n][r] || 0) + 1;
      });
      st.w[wk] = a;
    });
    // שבתות ישנות מאוד לא צריך לשמור לנצח
    var old = new Date(); old.setDate(old.getDate() - 120); old = iso(old);
    Object.keys(st.w).forEach(function (k) { if (k < old) delete st.w[k]; });
  }
  function wtext(wk) {
    var a = st.w[wk] || {}, h = hdate(wk);
    return 'שבת ' + dm(wk) + (h ? ' (' + h + ')' : '') + '\n' + roles().map(function (r) { return r + ': ' + (a[r] || '—'); }).join('\n');
  }
  function head() { return 'לוח העליות והתורנויות' + (st.shul ? ' – ' + st.shul : ''); }
  function draw() {
    $('al-demo').hidden = !st.demo;
    var ps = people(), rs = roles(), ws = weeks();
    var names = ps.map(function (p) { return p.n; });
    $('al-weeks').innerHTML = ws.map(function (wk, wi) {
      var a = st.w[wk] || {}, h = hdate(wk);
      return '<div class="kh-week"><h3>' + (wi === 0 ? 'השבת הקרובה' : 'שבת ' + dm(wk)) + '<span>' + dm(wk) + (h ? ' · ' + h : '') + '</span></h3>' +
        rs.map(function (r, ri) {
          var cur = a[r] || '', opts = names.slice();
          if (cur && opts.indexOf(cur) < 0) opts.unshift(cur);
          var id = 'al-' + wi + '-' + ri;
          return '<div class="r"><label for="' + id + '">' + esc(r) + '</label><select id="' + id + '" data-w="' + wk + '" data-r="' + esc(r) + '"><option value="">—</option>' +
            opts.map(function (n) { return '<option' + (n === cur ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div>';
        }).join('') + '</div>';
    }).join('') || '<p class="kh-empty">אין תפקידים. כותבים אותם למעלה.</p>';
    var th = st.theme || 'lavan';
    [].forEach.call($('al-theme').children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === th); });
    var card = $('al-card'); card.className = 'kh-card t-' + th;
    card.innerHTML = '<h3>' + esc(head()) + '</h3><p class="s2">' + ws.length + ' השבתות הקרובות</p><table><thead><tr><th></th>' +
      ws.map(function (wk) { var h = hdate(wk); return '<th>שבת ' + dm(wk) + (h ? '<br><small>' + h + '</small>' : '') + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rs.map(function (r) { return '<tr><td class="rl">' + esc(r) + '</td>' + ws.map(function (wk) { return '<td>' + esc((st.w[wk] || {})[r] || '') + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table><p class="ft">שינוי או החלפה – מדברים עם הגבאי. שבת שלום!</p>';
    $('al-wa1').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(head() + '\n\n' + wtext(ws[0]) + '\n\nשבת שלום!');
    $('al-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(head() + '\n\n' + ws.map(wtext).join('\n\n') + '\n\nשבת שלום!');
  }
  function fill() { $('al-shul').value = st.shul || ''; $('al-people').value = st.people; $('al-roles').value = st.roles; $('al-n').value = String(st.n); }
  // בכניסה הראשונה: דוגמה מלאה
  if (st.demo && !Object.keys(st.w).length) { auto(); save(); }
  // שבתות חדשות שעוד לא חולקו (הלוח התקדם לבד) – משלימים אותן
  (function () { var ws = weeks(), miss = ws.some(function (wk) { return !st.w[wk]; }); if (miss && people().length) { var keep = {}; ws.forEach(function (wk) { if (st.w[wk]) keep[wk] = st.w[wk]; }); auto(); Object.keys(keep).forEach(function (k) { st.w[k] = keep[k]; }); save(); } })();
  fill(); draw();
  $('al-shul').addEventListener('input', function () { st.shul = this.value; save(); draw(); });
  $('al-people').addEventListener('input', function () { st.people = this.value; st.demo = 0; save(); draw(); });
  $('al-roles').addEventListener('input', function () { st.roles = this.value; save(); draw(); });
  $('al-n').addEventListener('change', function () {
    st.n = +this.value; var ws = weeks(), keep = {}; ws.forEach(function (wk) { if (st.w[wk]) keep[wk] = st.w[wk]; });
    auto(); Object.keys(keep).forEach(function (k) { st.w[k] = keep[k]; }); save(); draw();
  });
  $('al-auto').addEventListener('click', function () {
    var msg = $('al-msg');
    if (!people().length) { msg.textContent = 'חסרים מתפללים. כותבים שם בכל שורה.'; $('al-people').focus(); return; }
    auto(); save(); draw(); msg.textContent = 'חולק מחדש ✓ אפשר לשנות כל שורה ביד.'; used('add');
  });
  $('al-weeks').addEventListener('change', function (e) {
    var s = e.target.closest('select[data-w]'); if (!s) return;
    var wk = s.getAttribute('data-w'); st.w[wk] = st.w[wk] || {}; st.w[wk][s.getAttribute('data-r')] = s.value; save(); draw(); used('edit');
  });
  $('al-demo-x').addEventListener('click', function () { st = { demo: 0, shul: '', people: '', roles: ROLES, n: st.n, theme: st.theme, w: {} }; save(); fill(); draw(); });
  $('al-theme').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.theme = b.getAttribute('data-t'); save(); draw(); });
  $('al-print').addEventListener('click', function () { used('print'); window.print(); });
  $('al-wa1').addEventListener('click', function () { used('wa'); });
  $('al-wa').addEventListener('click', function () { used('wa'); });
})();
