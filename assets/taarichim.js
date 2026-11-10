// מחשבון תאריכים לרב (R1) – כלי קודש. בלי ספריות: תאריך עברי דרך Intl, שקיעה לפי נוסחת NOAA (כמו moed.js).
// ברית · פדיון הבן · בר/בת מצווה · שבעה · שלושים · יארצייט · שקיעה לפי מקום.
(function () {
  'use strict';
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var fmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
  var MON = { tishri: 'תשרי', tishrei: 'תשרי', heshvan: 'חשוון', cheshvan: 'חשוון', kislev: 'כסלו', tevet: 'טבת', shevat: 'שבט', 'adar i': 'אדר א׳', 'adar ii': 'אדר ב׳', adar: 'אדר', nisan: 'ניסן', iyar: 'אייר', sivan: 'סיוון', tamuz: 'תמוז', av: 'אב', elul: 'אלול' };
  var NEXT = { heshvan: 'kislev', cheshvan: 'kislev', kislev: 'tevet', 'adar i': 'adar ii' };

  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hunds = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    s += hunds[Math.floor(n / 100)]; n %= 100;
    if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else { s += tens[Math.floor(n / 10)]; s += ones[n % 10]; }
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  function parts(d) {
    var o = {};
    fmt.formatToParts(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)).forEach(function (p) { o[p.type] = p.value; });
    return { day: +o.day, month: (o.month || '').toLowerCase(), year: +o.year };
  }
  function heb(d) { var h = parts(d); return gem(h.day) + ' ב' + (MON[h.month] || h.month) + ' ' + gem(h.year % 1000); }
  function leap(y) { return ((7 * y + 1) % 19) < 7; }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function g(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function iso(d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }
  function parseDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function line(d) { return 'יום ' + DAYS[d.getDay()] + ', ' + heb(d) + ' · ' + g(d); }

  // היום בשנה העברית targetYear שבו חל day/month (חיפוש סביב התאריך המשוער)
  function find(y, month, day, near) {
    for (var i = -50; i <= 50; i++) {
      var d = addDays(near, i), h = parts(d);
      if (h.year === y && h.month === month && h.day === day) return d;
    }
    return null;
  }
  // יום השנה העברי. kind: 'mitzva' (אדר רגיל → אדר ב׳) או 'yahrzeit' (שתי האפשרויות)
  function anniversary(from, years, kind) {
    var h = parts(from), y = h.year + years, near = addDays(from, Math.round(years * 365.2468));
    var months = [h.month], notes = [];
    if (h.month === 'adar' && leap(y)) {
      if (kind === 'mitzva') { months = ['adar ii']; notes.push('נולד באדר בשנה רגילה, והשנה מעוברת: בר/בת המצווה באדר ב׳.'); }
      else { months = ['adar ii', 'adar i']; notes.push('נפטר באדר בשנה רגילה, והשנה מעוברת: לפי השולחן ערוך באדר ב׳, ולפי הרמ״א באדר א׳ (ויש הנוהגים בשניהם).'); }
    } else if ((h.month === 'adar i' || h.month === 'adar ii') && !leap(y)) months = ['adar'];
    var out = months.map(function (m) {
      var d = find(y, m, h.day, near);
      if (!d && h.day === 30) { // ל׳ חשוון/כסלו/אדר א׳ שאין בשנה הזאת
        d = kind === 'mitzva' ? find(y, NEXT[m] || m, 1, near) : find(y, m, 29, near);
        notes.push(kind === 'mitzva' ? 'אין השנה יום ל׳ בחודש, לכן בא׳ בחודש שאחריו.' : 'אין השנה יום ל׳ בחודש. נהגים שונים: כ״ט בחודש או א׳ בחודש שאחריו – כדאי לשאול את הרב.');
      }
      return d;
    }).filter(Boolean);
    return { dates: out, notes: notes, year: y };
  }

  // ---------- חגים ושבת ----------
  function holiday(d) {
    var h = parts(d), m = h.month, n = h.day;
    if (/^tishr/.test(m)) { if (n === 1 || n === 2) return 'ראש השנה'; if (n === 10) return 'יום הכיפורים'; if (n === 15) return 'סוכות'; if (n === 22) return 'שמחת תורה'; if (n > 15 && n < 22) return 'חול המועד סוכות'; }
    if (m === 'nisan') { if (n === 15) return 'פסח'; if (n === 21) return 'שביעי של פסח'; if (n > 15 && n < 21) return 'חול המועד פסח'; }
    if (m === 'sivan' && n === 6) return 'שבועות';
    return '';
  }
  function yomTov(d) { var x = holiday(d); return x && !/חול המועד/.test(x) ? x : ''; }

  // ---------- שקיעה (NOAA, כמו moed.js) ----------
  function israelOffset(d) {
    var y = d.getFullYear();
    function lastSunday(month) { var x = new Date(Date.UTC(y, month + 1, 0)); return new Date(Date.UTC(y, month, x.getUTCDate() - x.getUTCDay())); }
    var start = lastSunday(2); start = new Date(start.getTime() - 2 * 864e5);
    var end = lastSunday(9);
    var t = Date.UTC(y, d.getMonth(), d.getDate(), 12);
    return (t >= start.getTime() && t < end.getTime()) ? 3 : 2;
  }
  function sunset(d, lat, lon) {
    var rad = Math.PI / 180, y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    var jd = day + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    var n = jd - 2451545 + 0.0008 - lon / 360;
    var M = (357.5291 + 0.98560028 * n) % 360;
    var C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    var L = (M + C + 180 + 102.9372) % 360;
    var Jt = 2451545 + n + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    var dec = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
    var w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec))) / rad;
    var Jset = Jt + w / 360;
    var local = ((Jset - Math.floor(Jset)) * 24 + 12) % 24 + israelOffset(d);
    var mins = Math.round(local * 60);
    return { mins: mins, text: hm(mins) };
  }
  function hm(mins) { var h = Math.floor(mins / 60) % 24, mi = mins % 60; return (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi; }

  // ---------- ממשק ----------
  var root = document.getElementById('taarichim');
  if (!root) return;
  var out = document.getElementById('t-out');
  var tabs = root.querySelectorAll('.tabs button');
  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      tabs.forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      root.querySelectorAll('form[data-pane]').forEach(function (f) { f.hidden = f.getAttribute('data-pane') !== b.getAttribute('data-for'); });
      out.hidden = true;
    });
  });
  function place(sel) {
    var v = sel.value.split(','), o = sel.options[sel.selectedIndex];
    return { lat: +v[0], lon: +v[1], name: o.getAttribute('data-city') || o.textContent };
  }
  // "המיקום שלי"
  root.querySelectorAll('select[data-place]').forEach(function (sel) {
    sel.addEventListener('change', function () {
      if (sel.value !== 'gps') return;
      if (!navigator.geolocation) { sel.selectedIndex = 0; return; }
      navigator.geolocation.getCurrentPosition(function (p) {
        var o = sel.querySelector('option[value=gps]');
        o.value = p.coords.latitude.toFixed(3) + ',' + p.coords.longitude.toFixed(3);
        o.setAttribute('data-city', 'המיקום שלך');
        sel.value = o.value;
      }, function () { sel.selectedIndex = 0; });
    });
  });
  // נולד/נפטר אחרי השקיעה → התאריך העברי של מחר
  function halachic(form) {
    var d = parseDate(form.querySelector('[name=date]').value), pl = place(form.querySelector('[data-place]'));
    var s = sunset(d, pl.lat, pl.lon), t = form.querySelector('[name=time]').value, when = form.querySelector('[name=when]:checked');
    var after = when && when.value === 'after', note = 'השקיעה ב' + pl.name + ' באותו יום: ' + s.text + '.';
    if (t) {
      var mins = +t.split(':')[0] * 60 + +t.split(':')[1];
      if (Math.abs(mins - s.mins) <= 20) note += ' השעה קרובה מאוד לשקיעה (בין השמשות) – כדאי לשאול את הרב.';
      after = mins > s.mins;
    }
    return { d: after ? addDays(d, 1) : d, civil: d, after: after, note: note };
  }
  function card(title, d, sub, notes) {
    return '<div class="res"><h3>' + title + '</h3><div class="big">' + (d ? heb(d) : '') + '</div>' +
      (d ? '<div class="g">יום ' + DAYS[d.getDay()] + ' · ' + g(d) + '</div>' : '') + (sub ? '<p class="note">' + sub + '</p>' : '') +
      (notes && notes.length ? '<ul>' + notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul>' : '') +
      (d ? '<p style="margin-top:.7rem"><button class="btn btn-line btn-sm" type="button" data-ics="' + iso(d) + '" data-title="' + title.replace(/"/g, '') + '">להוסיף ליומן</button></p>' : '') + '</div>';
  }
  function show(html, tool) {
    out.innerHTML = html + '<div class="share-row"><a class="btn btn-gold btn-sm" href="#" data-share-tool="wa" data-text="מחשבון תאריכים לרב: ברית, פדיון הבן, בר מצווה, שלושים ויארצייט, בחינם" target="_blank" rel="noopener">לשלוח לחבר בווטסאפ</a></div>';
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.toolUsed) window.toolUsed('taarichim', { calc: tool });
  }

  root.querySelector('form[data-pane=lida]').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (!f.reportValidity()) return;
    var hb = halachic(f), boy = f.querySelector('[name=sex]:checked').value === 'boy', cs = f.querySelector('[name=cs]').checked;
    var h = '<div class="res"><h3>תאריך הלידה העברי</h3><div class="big">' + heb(hb.d) + '</div><p class="note">' + hb.note + (hb.after ? ' הלידה אחרי השקיעה, ולכן התאריך העברי הוא של היום שאחרי.' : '') + '</p></div>';
    if (boy) {
      var brit = addDays(hb.d, 7), bn = [], hol = holiday(brit);
      if (brit.getDay() === 6) bn.push(cs ? 'יוצא בשבת. ברית אחרי ניתוח קיסרי לא נעשית בשבת – נדחית ליום ראשון.' : 'יוצא בשבת. ברית בזמנה נעשית גם בשבת.');
      if (hol) bn.push('יוצא ב' + hol + '.' + (cs && yomTov(brit) ? ' אחרי ניתוח קיסרי – לא ביום טוב, ליום החול הבא.' : ''));
      if (cs && (brit.getDay() === 6 || yomTov(brit))) { var x = addDays(brit, 1); while (x.getDay() === 6 || yomTov(x)) x = addDays(x, 1); bn.push('המועד בפועל: ' + line(x) + '.'); }
      bn.push('ברית נעשית רק כשהתינוק בריא. צהבת או משקל נמוך דוחים אותה, לפי המוהל והרופא.');
      h += card('ברית מילה (היום השמיני)', brit, '', bn);
      var pid = addDays(hb.d, 30), pn = [];
      while (pid.getDay() === 6 || yomTov(pid)) { pn.push('היום ה-31 יוצא ב' + (pid.getDay() === 6 ? 'שבת' : yomTov(pid)) + ', ולכן הפדיון נדחה למחרת.'); pid = addDays(pid, 1); }
      pn.push(cs ? 'נולד בניתוח קיסרי: אין חיוב פדיון הבן.' : 'פדיון הבן נוהג בבן בכור לאמו, שנולד בלידה רגילה, כשהאב אינו כהן או לוי והאם אינה בת כהן או לוי. בכל ספק – שואלים את הרב.');
      h += card('פדיון הבן (היום ה-31)', cs ? null : pid, '', pn);
    }
    var bm = anniversary(hb.d, boy ? 13 : 12, 'mitzva');
    bm.notes.push('המצוות מתחילות כבר בלילה שלפני, מצאת הכוכבים.');
    h += card(boy ? 'בר מצווה (13 שנים)' : 'בת מצווה (12 שנים)', bm.dates[0], '', bm.notes);
    var now = new Date(), age = parts(now).year - parts(hb.d).year, bd = anniversary(hb.d, age, 'mitzva').dates[0];
    if (!bd || bd < addDays(now, -1)) bd = anniversary(hb.d, age + 1, 'mitzva').dates[0];
    h += card('יום ההולדת העברי הבא', bd, '', []);
    show(h, 'lida');
  });

  root.querySelector('form[data-pane=avel]').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (!f.reportValidity()) return;
    var hb = halachic(f), bv = f.querySelector('[name=kvura]').value, kv = bv ? parseDate(bv) : hb.civil;
    var h = '<div class="res"><h3>תאריך הפטירה העברי</h3><div class="big">' + heb(hb.d) + '</div><p class="note">' + hb.note + (hb.after ? ' הפטירה אחרי השקיעה, ולכן התאריך העברי הוא של היום שאחרי.' : '') + '</p></div>';
    h += card('קימה מהשבעה (בבוקר היום השביעי)', addDays(kv, 6), 'סופרים מיום הקבורה. שבת נספרת בשבעה.', ['חג באמצע השבעה מפסיק אותה – במקרה כזה שואלים את הרב.']);
    h += card('סיום השלושים (בבוקר היום ה-30)', addDays(kv, 29), 'סופרים מיום הקבורה.', ['חג יכול לקצר את השלושים – שואלים את הרב.']);
    var yz = '', notes = [];
    for (var i = 1; i <= 3; i++) {
      var a = anniversary(hb.d, i, 'yahrzeit');
      a.dates.forEach(function (d) { yz += '<li><b>' + ['', 'השנה הראשונה', 'השנה השנייה', 'השנה השלישית'][i] + ':</b> ' + line(d) + ' <button class="btn btn-line btn-sm" type="button" data-ics="' + iso(d) + '" data-title="יארצייט">ליומן</button></li>'; });
      a.notes.forEach(function (n) { if (notes.indexOf(n) < 0) notes.push(n); });
    }
    notes.push('היארצייט מתחיל בערב שלפני (נרות, קדיש בערבית).');
    if (bv && Math.round((kv - hb.civil) / 864e5) >= 3) notes.push('הקבורה הייתה שלושה ימים או יותר אחרי הפטירה: יש שנוהגים בשנה הראשונה לפי יום הקבורה – שואלים את הרב.');
    h += '<div class="res"><h3>היארצייט (יום השנה)</h3><div class="big">' + heb(hb.d).replace(/ [^ ]+$/, '') + '</div><ul>' + yz + '</ul><ul>' + notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul></div>';
    show(h, 'avel');
  });

  root.querySelector('form[data-pane=shkia]').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (!f.reportValidity()) return;
    var d = parseDate(f.querySelector('[name=date]').value), pl = place(f.querySelector('[data-place]')), s = sunset(d, pl.lat, pl.lon), notes = [];
    if (d.getDay() === 5) notes.push('יום שישי: הדלקת נרות בערך ' + hm(s.mins - (pl.name === 'ירושלים' ? 40 : 20)) + ' (' + (pl.name === 'ירושלים' ? '40 דקות לפני השקיעה, כמנהג ירושלים' : '20 דקות לפני השקיעה') + ').');
    notes.push('שקיעה מישורית לפי חישוב אסטרונומי, בדיוק של דקה-שתיים. לזמנים מדויקים להלכה – לוח של בית הכנסת.');
    var h = '<div class="res"><h3>השקיעה ב' + pl.name + '</h3><div class="big">' + s.text + '</div><div class="g">יום ' + DAYS[d.getDay()] + ', ' + heb(d) + ' · ' + g(d) + '</div><ul>' + notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul><p class="note" style="margin-top:.5rem">אחרי השקיעה מתחיל כבר ' + heb(addDays(d, 1)) + '.</p></div>';
    show(h, 'shkia');
  });

  // קובץ יומן לכל תוצאה
  out.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ics]');
    if (!b) return;
    var d1 = b.getAttribute('data-ics'), p = d1.match(/(\d{4})(\d{2})(\d{2})/), d2 = iso(addDays(new Date(+p[1], +p[2] - 1, +p[3]), 1));
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//kodesh//HE', 'BEGIN:VEVENT',
      'UID:' + d1 + '-' + Math.random().toString(36).slice(2) + '@hakelim.com', 'DTSTAMP:' + iso(new Date()) + 'T090000',
      'DTSTART;VALUE=DATE:' + d1, 'DTEND;VALUE=DATE:' + d2, 'SUMMARY:' + b.getAttribute('data-title'),
      'DESCRIPTION:מחשבון התאריכים של כלי קודש · https://hakelim.com/kodesh/taarichim/', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'taarich.ics'; document.body.appendChild(a); a.click(); a.remove();
  });

  window.__taarichim = { heb: heb, anniversary: anniversary, sunset: sunset, parts: parts, addDays: addDays };
})();
