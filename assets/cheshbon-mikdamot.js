// מחשבון דוח מע"מ תקופתי ומקדמות מס הכנסה (כולל ניכוי במקור), לקוח אחד או טבלה לכל המשרד.
(function () {
  'use strict';
  var CH = window.CH; if (!CH || !CH.$('mikdamot')) return;
  var $ = CH.$, TOOL = 'cheshbon_mikdamot', KEY = 'kelim-cheshbon-mikdamot';
  var F = ['a', 'b', 'c', 'd', 'p', 'f', 'rate', 'name'];
  var st = CH.load(KEY, null);

  function calc(v) {
    var A = v.a || 0, B = v.b || 0, C = v.c || 0, D = v.d || 0, rate = (isFinite(v.rate) ? v.rate : 18) / 100, P = (v.p || 0) / 100, N = v.f || 0;
    var r = { outVat: CH.r2(A * rate), inVat: CH.r2(C + D) };
    r.vat = CH.r2(r.outVat - r.inVat);
    r.turn = CH.r2(A + B);
    r.adv = CH.r2(r.turn * P);
    r.advPay = Math.max(0, CH.r2(r.adv - N));
    r.left = Math.max(0, CH.r2(N - r.adv));
    r.total = CH.r2(Math.max(0, r.vat) + r.advPay);
    return r;
  }
  function vals() { var o = {}; F.forEach(function (k) { var el = $('mk-' + k); o[k] = k === 'name' ? el.value.trim() : CH.num(el.value); if (k !== 'name' && isNaN(o[k])) o[k] = k === 'rate' ? 18 : 0; }); return o; }

  // תקופות: מהחודש שעבר אחורה ושנה קדימה, לפי הלוח
  var per = $('mk-per'), freq = $('mk-freq');
  function fillPer() {
    var f = +freq.value, keep = per.value, opts = [];
    Object.keys(CH.DATES).forEach(function (y) { CH.DATES[y].forEach(function (_, m) { if (f === 2 && m % 2 === 0) return; opts.push({ v: y + '-' + m, t: f === 2 ? CH.MONTHS[m - 1] + '–' + CH.MONTHS[m] + ' ' + y : CH.MONTHS[m] + ' ' + y }); }); });
    per.innerHTML = opts.map(function (o) { return '<option value="' + o.v + '">' + o.t + '</option>'; }).join('');
    if (keep && opts.some(function (o) { return o.v === keep; })) per.value = keep;
    else { // ברירת מחדל: התקופה שהמועד שלה הוא הבא בתור
      var nx = CH.deadlines('vat', f, today())[0]; if (nx) per.value = nx.y + '-' + nx.m;
    }
  }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function due() { var p = per.value.split('-'); var row = CH.DATES[p[0]] && CH.DATES[p[0]][+p[1]]; return row ? CH.date(row[0]) : null; }
  function perText() { return per.options[per.selectedIndex] ? per.options[per.selectedIndex].text : ''; }

  var res = $('mk-res'), lastK = '';
  function summary(v, r, d) {
    var L = [];
    L.push((v.name ? v.name + ' – ' : '') + 'דיווח ל' + perText());
    L.push('מע"מ עסקאות: ' + CH.money(r.outVat) + ', מע"מ תשומות: ' + CH.money(r.inVat));
    L.push(r.vat >= 0 ? 'מע"מ לתשלום: ' + CH.money(r.vat) : 'מע"מ להחזר: ' + CH.money(-r.vat));
    L.push('מקדמה למס הכנסה: ' + CH.money(r.adv) + (v.f ? ', פחות ניכוי במקור ' + CH.money(v.f) + ' = ' + CH.money(r.advPay) : ''));
    L.push('סה"כ לתשלום: ' + CH.money(r.total));
    if (d) L.push('מועד אחרון: ' + CH.heDate(d));
    return L.join('\n');
  }
  function show() {
    var v = vals(), r = calc(v), d = due();
    var h = '<h3>' + CH.esc((v.name ? v.name + ' · ' : '') + perText()) + '</h3><div class="sum">';
    h += '<div>מע"מ עסקאות (' + (v.rate) + '%)<b>' + CH.money(r.outVat) + '</b></div>';
    h += '<div>מע"מ תשומות<b>' + CH.money(r.inVat) + '</b></div>';
    h += '<div>' + (r.vat >= 0 ? 'מע"מ לתשלום' : 'מע"מ להחזר') + '<b>' + CH.money(Math.abs(r.vat)) + '</b></div>';
    h += '<div>מחזור למקדמה<b>' + CH.money(r.turn) + '</b></div>';
    h += '<div>מקדמה (' + (v.p || 0) + '%)<b>' + CH.money(r.adv) + '</b></div>';
    if (v.f) h += '<div>פחות ניכוי במקור<b>' + CH.money(-Math.min(v.f, r.adv)) + '</b></div><div>מקדמה לתשלום<b>' + CH.money(r.advPay) + '</b></div>';
    h += '<div class="tot">סה"כ לתשלום' + '<b>' + CH.money(r.total) + '</b></div></div>';
    if (r.left) h += '<p class="hint">הניכוי במקור גדול מהמקדמה ב-' + CH.money(r.left) + '. בתקופה הזאת אין מקדמה לתשלום, וההפרש נלקח בחשבון בדוח השנתי.</p>';
    if (r.vat < 0) h += '<p class="hint">יוצא החזר מע"מ. ההחזר מתקבל אחרי הגשת הדוח, לפי הכללים של רשות המסים.</p>';
    if (d) { var days = Math.round((d - today()) / 864e5); h += '<p class="g" style="margin-top:.6rem">מועד אחרון לדיווח ולתשלום: <b>' + CH.heDate(d) + '</b>' + (days >= 0 ? ' (בעוד ' + days + ' ימים)' : ' (עבר)') + '</p>'; }
    res.innerHTML = h;
    $('mk-wa').href = CH.wa(summary(v, r, d));
    st = vals(); st.per = per.value; st.freq = freq.value; CH.save(KEY, st);
    var k = JSON.stringify(st); if (k !== lastK && (v.a || v.p)) { lastK = k; CH.used(TOOL, 'calc'); }
  }
  var t;
  $('mk-one').addEventListener('input', function () { clearTimeout(t); t = setTimeout(show, 200); });
  $('mk-one').addEventListener('change', function (e) { if (e.target === freq) fillPer(); show(); });
  $('mk-one').addEventListener('submit', function (e) { e.preventDefault(); show(); });
  $('mk-copy').addEventListener('click', function () { var v = vals(); CH.copy(summary(v, calc(v), due()), $('mk-msg1')); CH.used(TOOL, 'copy'); });
  $('mk-wa').addEventListener('click', function () { CH.used(TOOL, 'wa'); });
  $('mk-clear').addEventListener('click', function () { F.forEach(function (k) { $('mk-' + k).value = k === 'rate' ? '18' : ''; }); show(); });

  // ---------- כל הלקוחות ----------
  var out = $('mk-out'), msg = $('mk-msg');
  function runMany() {
    var rows = CH.rows($('mk-list').value), list = [];
    rows.forEach(function (r) {
      if (!r.length) return;
      var name = r[0], nums = r.slice(1).map(CH.num);
      if (!isFinite(nums[0])) { if (isFinite(CH.num(name))) { nums = r.map(CH.num); name = ''; } else return; } // שורת כותרת
      var v = { name: name, a: nums[0] || 0, c: 0, d: isFinite(nums[1]) ? nums[1] : 0, p: isFinite(nums[2]) ? nums[2] : 0, f: isFinite(nums[3]) ? nums[3] : 0, b: isFinite(nums[4]) ? nums[4] : 0, rate: CH.num($('mk-rate').value) || 18 };
      list.push({ v: v, r: calc(v) });
    });
    if (!list.length) { msg.textContent = 'לא מצאתי שורות. בכל שורה: שם, עסקאות, מע"מ תשומות, אחוז מקדמה.'; out.innerHTML = ''; return; }
    CH.save(KEY + '-list', $('mk-list').value.slice(0, 60000));
    msg.textContent = '';
    var T = { vat: 0, adv: 0, tot: 0 };
    var h = '<div class="tbl-wrap"><table><thead><tr><th>לקוח</th><th>עסקאות</th><th>מע"מ לתשלום</th><th>מקדמה</th><th>ניכוי במקור</th><th>מקדמה לתשלום</th><th>סה"כ</th></tr></thead><tbody>';
    var csv = [['לקוח', 'עסקאות חייבות', 'עסקאות פטורות', 'מע"מ עסקאות', 'מע"מ תשומות', 'מע"מ לתשלום (מינוס = החזר)', 'אחוז מקדמה', 'מקדמה', 'ניכוי במקור', 'מקדמה לתשלום', 'סה"כ לתשלום']];
    list.forEach(function (x) {
      var v = x.v, r = x.r; T.vat += r.vat; T.adv += r.advPay; T.tot += r.total;
      h += '<tr><td>' + CH.esc(v.name) + '</td><td class="n">' + CH.money(v.a, 0) + '</td><td class="n' + (r.vat < 0 ? ' ok' : '') + '">' + (r.vat < 0 ? 'החזר ' + CH.money(-r.vat) : CH.money(r.vat)) + '</td><td class="n">' + CH.money(r.adv) + '</td><td class="n">' + (v.f ? CH.money(v.f) : '—') + '</td><td class="n">' + CH.money(r.advPay) + '</td><td class="n"><b>' + CH.money(r.total) + '</b></td></tr>';
      csv.push([v.name, v.a, v.b, r.outVat, r.inVat, r.vat, v.p, r.adv, v.f, r.advPay, r.total]);
    });
    h += '<tr><th>סה"כ (' + list.length + ')</th><th></th><th class="n">' + CH.money(CH.r2(T.vat)) + '</th><th></th><th></th><th class="n">' + CH.money(CH.r2(T.adv)) + '</th><th class="n">' + CH.money(CH.r2(T.tot)) + '</th></tr>';
    h += '</tbody></table></div>';
    out.innerHTML = '<div class="res"><h3>' + list.length + ' לקוחות</h3><div class="btns no-print"><button class="btn btn-gold btn-sm" type="button" id="mk-csv">להוריד לאקסל</button><button class="btn btn-line btn-sm" type="button" onclick="window.print()">להדפיס</button></div>' + h + '</div>';
    $('mk-csv').onclick = function () { CH.csv('mikdamot-maam-' + CH.iso(new Date()) + '.csv', csv); CH.used(TOOL, 'csv'); };
    CH.used(TOOL, 'batch');
  }
  $('mk-go').addEventListener('click', runMany);

  function setMode(m) {
    CH.pick($('mk-mode'), m);
    $('mk-one').hidden = res.hidden = $('mk-btns').hidden = m !== 'one';
    $('mk-many').hidden = out.hidden = m !== 'many';
    if (m === 'many' && !out.innerHTML) runMany();
  }
  CH.seg($('mk-mode'), setMode);

  // ---------- כניסה: דוגמה מלאה ----------
  var ex = { a: 42000, b: 3000, c: 1800, d: 2350, p: 5, f: 600, rate: 18, name: 'לקוח לדוגמה' };
  var s = st && (st.a || st.p) ? st : ex;
  if (st && st.freq) freq.value = st.freq;
  fillPer(); if (st && st.per) per.value = st.per; if (!per.value) fillPer();
  F.forEach(function (k) { var v = s[k]; $('mk-' + k).value = v == null || v === 0 && k !== 'rate' ? (k === 'rate' ? '18' : '') : (k === 'name' ? v : String(v)); });
  $('mk-list').value = CH.load(KEY + '-list', '') || 'לקוח א\t42,000\t4,150\t5\t600\nלקוח ב\t18,500\t5,900\t3.5\nלקוח ג (חברה)\t160,000\t21,300\t7\t2,400\t15,000\nלקוח ד\t9,800\t2,600\t2';
  show();
})();
