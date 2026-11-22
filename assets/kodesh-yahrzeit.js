/* מחשבון אזכרה ויארצייט (/kodesh/yahrzeit/): רשימה אישית של יקירים, תאריך הפטירה העברי (או לועזי + אחרי השקיעה),
   ומתי חל יום השנה בחמש השנים הבאות. החישוב: @hebcal/core (getYahrzeit) בדפדפן. הכול נשמר בטלפון (localStorage).
   באפליקציית אנדרואיד (window.HakelimApp.setEvents) נשלחת רשימת התאריכים להתראות: שבוע לפני, ערב לפני, וביום עצמו.
   לא מכריעים מנהג: באדר, בל׳ בחודש ובשנה הראשונה מוצגת הערה "שואלים את הרב". */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('yz-form');
  if (!form) return;
  var KEY = 'kodesh-yahrzeit', TOOL = 'yahrzeit', YEARS = 5;
  var WD = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  // סדר החודשים בתפריט: מתשרי. הערך: מספר החודש ב-hebcal; "A" = אדר של שנה רגילה.
  var MONTHS = [[7, 'תשרי'], [8, 'חשוון'], [9, 'כסלו'], [10, 'טבת'], [11, 'שבט'], ['A', 'אדר (שנה רגילה)'], [12, 'אדר א׳'], [13, 'אדר ב׳'], [1, 'ניסן'], [2, 'אייר'], [3, 'סיוון'], [4, 'תמוז'], [5, 'אב'], [6, 'אלול']];
  var MN = { 1: 'ניסן', 2: 'אייר', 3: 'סיוון', 4: 'תמוז', 5: 'אב', 6: 'אלול', 7: 'תשרי', 8: 'חשוון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר א׳', 13: 'אדר ב׳' };
  var st = { items: [], rem: { on: true, h: 9, m: 0, week: true, eve: true, day: true } };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.items) { st.items = sv.items; if (sv.rem) st.rem = sv.rem; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function used(how) { try { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); } catch (e) {} }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dmy(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

  function start(H) {
    var HD = H.HDate, today = new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var hyNow = new HD(today).getFullYear();
    function gem(n) { return H.gematriya(n); }
    function monthName(m, y) { return (m === 12 && !HD.isLeapYear(y)) ? 'אדר' : MN[m]; }
    function hlabel(hd) { return gem(hd.getDate()) + ' ב' + monthName(hd.getMonth(), hd.getFullYear()) + ' ' + gem(hd.getFullYear() % 1000); }

    // ---------- טופס ----------
    var selD = $('yz-d'), selM = $('yz-m'), i;
    for (i = 1; i <= 30; i++) selD.insertAdjacentHTML('beforeend', '<option value="' + i + '">' + gem(i) + '</option>');
    MONTHS.forEach(function (m) { selM.insertAdjacentHTML('beforeend', '<option value="' + m[0] + '">' + m[1] + '</option>'); });
    var nowHd = new HD(today); selD.value = nowHd.getDate();

    function parseYear(s) {
      s = String(s || '').trim(); if (!s) return 0;
      if (/^\d{4}$/.test(s)) return +s;
      try { var n = H.gematriyaStrToNum(s.replace(/^ה['׳]?(?=.{2,})/, '')); if (n > 0 && n < 1000) n += 5000; return n > 5000 && n < 6000 ? n : -1; } catch (e) { return -1; }
    }
    $('yz-conv').addEventListener('click', function () {
      var v = $('yz-greg').value, msg = $('yz-msg');
      if (!v) { msg.textContent = 'בחרו קודם תאריך לועזי.'; return; }
      var p = v.split('-'), hd = new HD(new Date(+p[0], +p[1] - 1, +p[2]));
      if ($('yz-night').checked) hd = hd.next();
      selD.value = hd.getDate();
      var m = hd.getMonth(); selM.value = (m === 12 && !HD.isLeapYear(hd.getFullYear())) ? 'A' : String(m);
      $('yz-y').value = gem(hd.getFullYear() % 1000);
      msg.textContent = 'התאריך העברי: ' + hlabel(hd) + '. עכשיו לוחצים "להוסיף לרשימה".';
      used('convert');
    });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = $('yz-name').value.trim(), msg = $('yz-msg');
      if (!name) { msg.textContent = 'כתבו את שם הנפטר.'; $('yz-name').focus(); return; }
      var y = parseYear($('yz-y').value);
      if (y < 0) { msg.textContent = 'לא הצלחתי לקרוא את השנה. כתבו למשל תשע״ה, או השאירו ריק.'; return; }
      var mv = selM.value, m = mv === 'A' ? 12 : +mv, d = +selD.value;
      if (y) {
        var leap = HD.isLeapYear(y);
        if (mv === 'A' && leap) { msg.textContent = 'שנת ' + gem(y % 1000) + ' הייתה מעוברת. בחרו אדר א׳ או אדר ב׳.'; return; }
        if (m === 13 && !leap) { msg.textContent = 'בשנת ' + gem(y % 1000) + ' היה רק אדר אחד. בחרו "אדר (שנה רגילה)".'; return; }
        if (m === 12 && mv !== 'A' && !leap) { msg.textContent = 'בשנת ' + gem(y % 1000) + ' היה רק אדר אחד. בחרו "אדר (שנה רגילה)".'; return; }
        if (d > HD.daysInMonth(m, y)) { msg.textContent = 'בחודש הזה בשנת ' + gem(y % 1000) + ' היו רק כ״ט ימים.'; return; }
      }
      st.items.push({ id: 'y' + Date.now(), name: name.slice(0, 80), rel: $('yz-rel').value.trim().slice(0, 40), d: d, m: m, ap: mv === 'A', y: y });
      save(); $('yz-name').value = ''; $('yz-rel').value = ''; $('yz-greg').value = ''; $('yz-night').checked = false;
      msg.textContent = 'נוסף לרשימה.'; draw(); used('add');
    });

    // ---------- חישוב ----------
    // יום השנה בשנה עברית hy. מחזיר { hd, g, note } או null.
    function occ(r, hy) {
      var note = '', hd = null;
      if (r.y) {
        if (hy <= r.y) return null;
        try { var g0 = H.HebrewCalendar.getYahrzeit(hy, new HD(r.d, r.m, r.y)); if (g0) hd = new HD(g0); } catch (e) {}
        if (!hd) return null;
        if (hd.getDate() !== r.d) note = 'התאריך זז השנה לפי כללי הלוח';
      } else {
        var m = r.m, leap = HD.isLeapYear(hy);
        if (m === 12 || m === 13) m = leap ? (r.ap ? 13 : r.m) : 12;
        var dim = HD.daysInMonth(m, hy), d = r.d;
        if (d > dim) { d = dim; note = 'השנה אין ל׳ בחודש הזה'; }
        hd = new HD(d, m, hy);
      }
      if (r.m === 12 || r.m === 13) { if (HD.isLeapYear(hy) || !r.ap) note = (note ? note + '; ' : '') + 'באדר המנהגים חלוקים בשנה מעוברת'; }
      if (r.y && hy === r.y + 1) note = (note ? note + '; ' : '') + 'זו השנה הראשונה, ויש בה מנהגים מיוחדים';
      return { hd: hd, g: hd.greg(), note: note ? note + ' – שואלים את הרב' : '' };
    }
    function upcoming(r) {
      var out = [];
      for (var hy = hyNow; out.length < YEARS && hy < hyNow + YEARS + 2; hy++) {
        var o = occ(r, hy);
        if (o && o.g >= today) out.push(o);
      }
      return out;
    }
    function daysLeft(g) { return Math.round((g - today) / 864e5); }
    function leftTxt(n) { return n === 0 ? 'היום' : n === 1 ? 'מחר' : n === 2 ? 'בעוד יומיים' : 'בעוד ' + n + ' ימים'; }
    function when(g) { return 'יום ' + WD[g.getDay()] + ', ' + dmy(g); }
    function deathLabel(r) { return gem(r.d) + ' ב' + (r.ap ? 'אדר' : MN[r.m]) + (r.y ? ' ' + gem(r.y % 1000) : ''); }
    function shabbatBefore(g) { var k = g.getDay() === 6 ? 7 : g.getDay() + 1; return addDays(g, -k); }
    function waText(r, o) {
      return 'תזכורת למשפחה: ב' + when(o.g) + ' (' + hlabel(o.hd) + ') יחול יום השנה של ' + r.name + ' ז״ל.\n' +
        'היום העברי מתחיל בערב שלפני, ואז מדליקים נר נשמה.\n' +
        'מחשבון אזכרה וסדר האזכרה: https://hakelim.com/kodesh/yahrzeit/?utm_source=share';
    }

    // ---------- תצוגה ----------
    var list = $('yz-list');
    function draw() {
      var rows = st.items.map(function (r) { return { r: r, up: upcoming(r) }; }).filter(function (x) { return x.up.length; });
      rows.sort(function (a, b) { return a.up[0].g - b.up[0].g; });
      $('yz-empty').hidden = st.items.length > 0;
      list.innerHTML = rows.map(function (x) {
        var r = x.r, o = x.up[0], n = daysLeft(o.g), sb = shabbatBefore(o.g);
        var more = x.up.slice(1).map(function (u) { return '<li>' + esc(hlabel(u.hd)) + ' – ' + esc(when(u.g)) + (u.note ? ' <span class="warn">(' + esc(u.note) + ')</span>' : '') + '</li>'; }).join('');
        return '<div class="kh-item' + (n <= 7 ? ' soon' : '') + '" data-id="' + r.id + '">' +
          '<div class="top"><b>' + esc(r.name) + ' ז״ל</b><span>' + esc(r.rel) + '</span></div>' +
          '<p><span class="lbl">נפטר/ה:</span> ' + esc(deathLabel(r)) + '</p>' +
          '<p><span class="lbl">יום השנה הקרוב:</span> ' + esc(hlabel(o.hd)) + ' – ' + esc(when(o.g)) + ' (' + leftTxt(n) + ')</p>' +
          '<p><span class="lbl">נר נשמה:</span> ' + (o.g.getDay() === 0 ? 'מדליקים במוצאי שבת, ' + esc(dmy(addDays(o.g, -1))) : o.g.getDay() === 6 ? 'מדליקים ביום שישי לפני הדלקת נרות שבת, ' + esc(dmy(addDays(o.g, -1))) : 'מדליקים בערב שלפני, ' + esc(when(addDays(o.g, -1)))) + '</p>' +
          '<p><span class="lbl">השבת שלפני:</span> ' + esc(dmy(sb)) + '</p>' +
          (o.note ? '<p class="warn">' + esc(o.note) + '</p>' : '') +
          (more ? '<details><summary>השנים הבאות</summary><ul class="yz-more">' + more + '</ul></details>' : '') +
          '<div class="acts"><a class="btn btn-line btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(waText(r, o)) + '" data-act="wa"><svg class="ic"><use href="#wa"/></svg> להזכיר למשפחה</a>' +
          '<a class="btn btn-line btn-sm" href="/kodesh/tehillim/shem/">תהילים לפי אותיות השם</a>' +
          '<button class="btn btn-line btn-sm" type="button" data-act="del">למחוק</button></div></div>';
      }).join('');
      pushToApp();
    }
    list.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return;
      var id = b.closest('.kh-item').getAttribute('data-id');
      if (b.getAttribute('data-act') === 'wa') { used('whatsapp'); return; }
      if (b.getAttribute('data-act') === 'del') {
        if (!window.confirm('למחוק את השם מהרשימה?')) return;
        st.items = st.items.filter(function (r) { return r.id !== id; }); save(); draw(); used('delete');
      }
    });

    // ---------- חישוב מהיר בלי לשמור (גם למי שרק רוצה תשובה) ----------
    $('yz-quick').addEventListener('click', function () {
      var y = parseYear($('yz-y').value), mv = selM.value, out = $('yz-quick-out');
      var r = { d: +selD.value, m: mv === 'A' ? 12 : +mv, ap: mv === 'A', y: y > 0 ? y : 0 };
      var up = upcoming(r);
      out.innerHTML = up.length ? '<ul class="yz-more">' + up.map(function (u) { return '<li><b>' + esc(hlabel(u.hd)) + '</b> – ' + esc(when(u.g)) + (u.note ? ' <span class="warn">(' + esc(u.note) + ')</span>' : '') + '</li>'; }).join('') + '</ul>' : '<p>לא נמצא תאריך. בדקו את השנה.</p>';
      used('quick');
    });

    // ---------- התראות (באפליקציה בלבד) ----------
    var remBox = $('yz-rem'), A = window.HakelimApp;
    function events() {
      var ev = [];
      st.items.forEach(function (r) {
        upcoming(r).forEach(function (o) {
          var lbl = hlabel(o.hd), w = when(o.g);
          if (st.rem.week) ev.push({ date: iso(addDays(o.g, -7)), title: 'בעוד שבוע: יום השנה של ' + r.name, text: lbl + ', ' + w + '. זמן לתאם מניין ועלייה לקבר.' });
          if (st.rem.eve) ev.push({ date: iso(addDays(o.g, -1)), title: 'הערב מדליקים נר נשמה', text: 'מחר, ' + lbl + ', יום השנה של ' + r.name + ' ז״ל.' });
          if (st.rem.day) ev.push({ date: iso(o.g), title: 'היום יום השנה של ' + r.name, text: lbl + '. קדיש, לימוד לעילוי הנשמה ועלייה לקבר.' });
        });
      });
      return ev;
    }
    function pushToApp() {
      if (!A || !A.setEvents) return;
      try { A.setEvents(JSON.stringify(events())); A.setReminder(!!st.rem.on && st.items.length > 0, st.rem.h, st.rem.m); } catch (e) {}
    }
    if (remBox && A && A.setEvents) {
      remBox.hidden = false;
      var on = $('yz-rem-on'), tm = $('yz-rem-time');
      on.checked = !!st.rem.on; tm.value = pad(st.rem.h) + ':' + pad(st.rem.m);
      ['week', 'eve', 'day'].forEach(function (k) {
        var c = $('yz-rem-' + k); c.checked = !!st.rem[k];
        c.addEventListener('change', function () { st.rem[k] = c.checked; save(); pushToApp(); });
      });
      var apply = function () {
        var p = (tm.value || '09:00').split(':');
        st.rem.on = on.checked; st.rem.h = +p[0] || 0; st.rem.m = +p[1] || 0; save(); pushToApp();
        used(on.checked ? 'reminder_on' : 'reminder_off');
      };
      on.addEventListener('change', apply); tm.addEventListener('change', apply);
    }
    draw();
  }
  if (window.hebcal) start(window.hebcal);
  else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', function () { start(window.hebcal); }); }
})();
