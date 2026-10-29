// מחשבון מועד הברית – גילעד רחמים המוהל
// בלי ספריות: תאריך עברי דרך Intl (מובנה בדפדפן), שקיעה בירושלים לפי נוסחת NOAA.
(function () {
  'use strict';
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var LAT = 31.778, LON = 35.235; // ירושלים

  // ---------- תאריך עברי ----------
  var enFmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
  var MONTHS = { tishri: 'תשרי', tishrei: 'תשרי', heshvan: 'חשוון', cheshvan: 'חשוון', kislev: 'כסלו', tevet: 'טבת', shevat: 'שבט', 'adar i': 'אדר א׳', 'adar ii': 'אדר ב׳', adar: 'אדר', nisan: 'ניסן', iyar: 'אייר', sivan: 'סיוון', tamuz: 'תמוז', av: 'אב', elul: 'אלול' };
  // גימטריה: 19 → י״ט, 5784 → תשפ״ד
  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hunds = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    s += hunds[Math.floor(n / 100)]; n %= 100;
    if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else { s += tens[Math.floor(n / 10)]; s += ones[n % 10]; }
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  function hebrew(d) {
    var h = heParts(d);
    var mon = MONTHS[h.month] || h.month;
    return gem(h.day) + ' ב' + mon + ' ' + gem(h.year % 1000);
  }
  function heParts(d) {
    var o = {};
    enFmt.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return { day: parseInt(o.day, 10), month: (o.month || '').toLowerCase(), year: parseInt(o.year, 10) };
  }
  // חגים שבהם ברית בזמנה נעשית אבל יש מה לתאם
  function holiday(d) {
    var h = heParts(d), m = h.month, n = h.day;
    if (/^tishri|^tishrei/.test(m)) {
      if (n === 1 || n === 2) return 'ראש השנה';
      if (n === 10) return 'יום הכיפורים';
      if (n === 15) return 'סוכות';
      if (n === 22) return 'שמחת תורה';
      if (n >= 16 && n <= 21) return 'חול המועד סוכות';
    }
    if (/^nisan/.test(m)) {
      if (n === 15) return 'פסח';
      if (n === 21) return 'שביעי של פסח';
      if (n >= 16 && n <= 20) return 'חול המועד פסח';
    }
    if (/^sivan/.test(m) && n === 6) return 'שבועות';
    return '';
  }
  function isYomTov(name) { return name && !/חול המועד/.test(name); }

  // ---------- שקיעה (NOAA) ----------
  function israelOffset(d) { // שעון קיץ: משישי שלפני יום ראשון האחרון של מרץ עד יום ראשון האחרון של אוקטובר
    var y = d.getFullYear();
    function lastSunday(month) { var x = new Date(Date.UTC(y, month + 1, 0)); return new Date(Date.UTC(y, month, x.getUTCDate() - x.getUTCDay())); }
    var start = lastSunday(2); start = new Date(start.getTime() - 2 * 864e5); start.setUTCHours(0, 0, 0, 0); // שישי
    var end = lastSunday(9); end.setUTCHours(23, 0, 0, 0); // 2:00 בשעון ישראל = 23:00 UTC ביום שלפני... מקורב ליום
    var t = Date.UTC(y, d.getMonth(), d.getDate(), 12);
    return (t >= start.getTime() && t < end.getTime()) ? 3 : 2;
  }
  function sunset(d) {
    var rad = Math.PI / 180;
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    var jd = day + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    var n = jd - 2451545 + 0.0008 - LON / 360;
    var M = (357.5291 + 0.98560028 * n) % 360;
    var C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    var L = (M + C + 180 + 102.9372) % 360;
    var Jt = 2451545 + n + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    var dec = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
    var cosw = (Math.sin(-0.833 * rad) - Math.sin(LAT * rad) * Math.sin(dec)) / (Math.cos(LAT * rad) * Math.cos(dec));
    var w = Math.acos(cosw) / rad;
    var Jset = Jt + w / 360;
    var hoursUTC = ((Jset - Math.floor(Jset)) * 24 + 12) % 24; // שעה UTC
    var local = hoursUTC + israelOffset(d);
    var hh = Math.floor(local), mi = Math.round((local - hh) * 60);
    if (mi === 60) { hh++; mi = 0; }
    return { h: hh, m: mi, text: (hh < 10 ? '0' : '') + hh + ':' + (mi < 10 ? '0' : '') + mi };
  }

  // ---------- עזרים ----------
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function fmtG(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parseDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }

  // חישוב מועד הברית מיום לידה הלכתי
  function compute(halachicBirth, caesarean) {
    var brit = addDays(halachicBirth, 7);
    var flags = [];
    var hol = holiday(brit);
    var shabbat = brit.getDay() === 6;
    var postponed = null;
    if (caesarean && (shabbat || isYomTov(hol))) {
      // ברית שלא בזמנה (אחרי קיסרי) אינה דוחה שבת ויום טוב – ליום החול הבא
      var x = addDays(brit, 1);
      while (x.getDay() === 6 || isYomTov(holiday(x))) x = addDays(x, 1);
      postponed = x;
    }
    return { brit: brit, shabbat: shabbat, holiday: hol, postponed: postponed };
  }

  // ---------- ממשק ----------
  var form = document.getElementById('moed-form');
  if (!form) return;
  var out = document.getElementById('moed-out');
  var dateIn = form.querySelector('[name=date]');
  var timeIn = form.querySelector('[name=time]');
  var sunsetNote = document.getElementById('sunset-note');

  function updateSunset() {
    if (!dateIn.value) { sunsetNote.textContent = ''; return; }
    var d = parseDate(dateIn.value);
    var s = sunset(d);
    var txt = 'השקיעה בירושלים ב-' + fmtG(d) + ': ' + s.text;
    if (timeIn.value) {
      var t = timeIn.value.split(':'), mins = (+t[0]) * 60 + (+t[1]);
      var sm = s.h * 60 + s.m;
      if (mins >= sm - 20 && mins <= sm + 25) txt += ' · הלידה סמוכה לשקיעה (בין השמשות) – כדאי שנדבר על זה';
      else if (mins > sm) { txt += ' · הלידה אחרי השקיעה'; form.querySelector('[name=when][value=after]').checked = true; }
      else { txt += ' · הלידה לפני השקיעה'; form.querySelector('[name=when][value=before]').checked = true; }
    }
    sunsetNote.textContent = txt;
  }
  dateIn.addEventListener('change', updateSunset);
  timeIn.addEventListener('change', updateSunset);

  function renderResult(born, halachic, r, mode) {
    var lines = [];
    var britHe = hebrew(r.brit);
    var main = r.postponed || r.brit;
    var html = '<div class="res">';
    html += '<div class="res-k">' + (mode === 'born' ? 'הברית, בעזרת ה\':' : 'אם הבן ייוולד ב-' + fmtG(born) + ', הברית:') + '</div>';
    html += '<div class="res-d">יום ' + DAYS[r.brit.getDay()] + ', ' + britHe + '</div>';
    html += '<div class="res-g">' + fmtG(r.brit) + '</div>';
    if (r.shabbat) lines.push('הברית חלה בשבת. ברית בזמנה נעשית גם בשבת (חוץ מאחרי ניתוח קיסרי). יש הכנות מיוחדות – נדבר.');
    if (r.holiday) lines.push('הברית חלה ב' + r.holiday + '. ' + (isYomTov(r.holiday) ? 'ברית בזמנה נעשית גם ביום טוב (חוץ מאחרי ניתוח קיסרי). נתאם את הפרטים.' : 'אפשר לערוך ברית בחול המועד, בשמחה.'));
    if (r.postponed) lines.push('אחרי ניתוח קיסרי הברית לא דוחה שבת ויום טוב, ולכן היא נדחית ל<b>יום ' + DAYS[r.postponed.getDay()] + ', ' + hebrew(r.postponed) + ' (' + fmtG(r.postponed) + ')</b>.');
    if (mode === 'born') lines.push('יום הלידה ההלכתי: יום ' + DAYS[halachic.getDay()] + ', ' + hebrew(halachic) + '. הברית ביום השמיני – שבוע אחרי, באותו יום בשבוע.');
    lines.push('כל זה בתנאי שהתינוק בריא וכשיר לברית. בדיקת צהבת וביקור שלי לפני הברית יקבעו סופית.');
    html += '<ul class="res-notes">' + lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>';

    var wa = 'שלום גילעד 🙂 ' + (mode === 'born' ? 'הבן נולד ב-' + fmtG(born) : 'הלידה צפויה ב-' + fmtG(born)) +
      (mode === 'born' ? (halachic.getTime() !== born.getTime() ? ' אחרי השקיעה' : ' לפני השקיעה') : '') +
      ', ולפי המחשבון הברית יוצאת ביום ' + DAYS[main.getDay()] + ', ' + hebrew(main) + ' (' + fmtG(main) + '). אשמח לדבר על הברית.';
    html += '<div class="actions" style="margin-top:1.4rem">';
    html += '<a class="btn btn-gold" href="https://wa.me/972584049049?text=' + encodeURIComponent(wa) + '"><svg class="ic"><use href="#wa"/></svg> שלחו לי את התאריך בווטסאפ</a>';
    html += '<button class="btn btn-line" type="button" id="ics"><svg class="ic"><use href="#cal"/></svg> הוסיפו ליומן</button>';
    html += '</div>';
    html += '<p class="note" style="margin-top:1rem;text-align:center">רוצים שאשמור לכם את התאריך? שלחו לי אותו, ואחזור אליכם עם כל מה שצריך לדעת.</p>';
    html += '</div>';
    out.innerHTML = html;
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });

    document.getElementById('ics').addEventListener('click', function () {
      var d1 = iso(main).replace(/-/g, ''), d2 = iso(addDays(main, 1)).replace(/-/g, '');
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//gilad-rachamim.github.io//moed//HE', 'BEGIN:VEVENT',
        'UID:brit-' + d1 + '@gilad-rachamim.github.io', 'DTSTAMP:' + iso(new Date()).replace(/-/g, '') + 'T090000',
        'DTSTART;VALUE=DATE:' + d1, 'DTEND;VALUE=DATE:' + d2,
        'SUMMARY:ברית מילה בעז"ה – ' + hebrew(main),
        'DESCRIPTION:חושב במחשבון מועד הברית של גילעד רחמים המוהל. לתיאום: 058-4049049 · https://gilad-rachamim.github.io/mohel/',
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:מחר הברית בעז"ה', 'END:VALARM',
        'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'brit-mila.ics'; document.body.appendChild(a); a.click(); a.remove();
    });
  }

  function renderRange(expected, caesarean) {
    var html = '<div class="res"><div class="res-k">הברית לפי תאריך הלידה (אם הלידה לפני השקיעה):</div><table class="rng"><thead><tr><th>אם ייוולד ב</th><th>הברית</th></tr></thead><tbody>';
    for (var i = -3; i <= 3; i++) {
      var b = addDays(expected, i);
      var r = compute(b, caesarean);
      var m = r.postponed || r.brit;
      var flag = r.postponed ? ' <small>(נדחית אחרי קיסרי)</small>' : (r.shabbat ? ' <small>(שבת)</small>' : (r.holiday ? ' <small>(' + r.holiday + ')</small>' : ''));
      html += '<tr' + (i === 0 ? ' class="now"' : '') + '><td>יום ' + DAYS[b.getDay()] + ' ' + fmtG(b) + '</td><td>יום ' + DAYS[m.getDay()] + ', ' + hebrew(m) + '<br><span>' + fmtG(m) + '</span>' + flag + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<ul class="res-notes"><li>לידה אחרי השקיעה נחשבת ליום המחרת, והברית מתאחרת ביום.</li><li>ברגע שהבן ייוולד, חזרו לכאן עם התאריך המדויק, או פשוט כתבו לי.</li></ul>';
    var wa = 'שלום גילעד 🙂 הלידה צפויה בסביבות ' + fmtG(expected) + '. אשמח להכיר ולדבר על הברית מראש.';
    html += '<div class="actions" style="margin-top:1.4rem"><a class="btn btn-gold" href="https://wa.me/972584049049?text=' + encodeURIComponent(wa) + '"><svg class="ic"><use href="#wa"/></svg> נדבר כבר עכשיו</a><a class="btn btn-line" href="/mohel/madrich/">המדריך להכנה</a></div></div>';
    out.innerHTML = html; out.hidden = false; out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!dateIn.value) { dateIn.focus(); return; }
    var born = parseDate(dateIn.value);
    var mode = form.querySelector('[name=mode]:checked').value;
    var caesarean = form.querySelector('[name=cs]').checked;
    if (mode === 'expected') { renderRange(born, caesarean); return; }
    var when = (form.querySelector('[name=when]:checked') || {}).value || 'before';
    var halachic = when === 'after' ? addDays(born, 1) : born;
    renderResult(born, halachic, compute(halachic, caesarean), 'born');
  });

  form.querySelectorAll('[name=mode]').forEach(function (r) {
    r.addEventListener('change', function () {
      var born = r.value === 'born';
      document.getElementById('when-row').hidden = !born;
      document.getElementById('time-row').hidden = !born;
      form.querySelector('button[type=submit]').textContent = born ? 'מתי הברית?' : 'הראו לי את התאריכים';
    });
  });

  // לבדיקות אוטומטיות
  window.__moed = { compute: compute, hebrew: hebrew, sunset: sunset, holiday: holiday };
})();
