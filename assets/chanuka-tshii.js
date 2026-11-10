// הלילה התשיעי – /kodesh/chanuka/tshii/
// התאריך מחושב מלוח עברי (hebcal): ערב הנר הראשון = כ"ד בכסלו, הלילה התשיעי = שמונה ימים אחריו.
(function () {
  'use strict';
  var TOOL = 'chanuka_tshii', KEY = 'kodesh-chanuka-tshii';
  var H, info;
  function $(id) { return document.getElementById(id); }
  var once = {};
  function used(how) { if (once[how]) return; once[how] = 1; if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function noon(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }
  function add(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return noon(x); }
  function dm(d) { return d.getDate() + '.' + (d.getMonth() + 1); }
  function day(d) { return 'יום ' + DAYS[d.getDay()] + ' ' + dm(d); }

  function compute(now) {
    var hy = new H.HDate(now).getFullYear();
    var f = noon(new H.HDate(24, H.months.KISLEV, hy).greg());
    if (add(f, 9) < noon(now)) f = noon(new H.HDate(24, H.months.KISLEV, hy + 1).greg());
    var ev = add(f, 8); // הערב שבו מתחיל היום התשיעי
    var o = { first: f, ev: ev };
    if (ev.getDay() === 5) { // היום התשיעי חל בשבת
      o.main = 'מוצאי שבת ' + dm(add(ev, 1)) + ', אחרי צאת השבת';
      o.alt = 'או ביום ראשון ' + dm(add(ev, 2)) + ' בערב';
      o.at = add(ev, 1);
    } else if (ev.getDay() === 6) { // מתחיל במוצאי שבת
      o.main = 'מוצאי שבת ' + dm(ev) + ', אחרי צאת השבת';
      o.alt = 'או ביום ראשון ' + dm(add(ev, 1)) + ' בערב';
      o.at = ev;
    } else {
      o.main = 'ערב ' + day(ev);
      o.alt = '';
      o.at = ev;
    }
    o.heb = new H.HDate(add(ev, 1)).renderGematriya(true).replace(/ תש.*$|\s*\d+$/, '');
    return o;
  }

  function draw() {
    info = compute(new Date());
    var left = Math.round((noon(info.at) - noon(new Date())) / 864e5);
    $('ts-when').textContent = info.main;
    $('ts-alt').textContent = info.alt;
    $('ts-heb').textContent = 'היום התשיעי: ' + info.heb;
    $('ts-left').textContent = left > 1 ? 'עוד ' + left + ' ימים' : left === 1 ? 'מחר!' : left === 0 ? 'הערב!' : '';
    $('ts-first').textContent = 'הנר הראשון: ' + day(info.first) + ' בערב.';
    waText();
  }

  // ---------- רשימת הכנה ----------
  var st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var boxes = document.querySelectorAll('.ts-list input[type=checkbox]');
  function count() {
    var n = 0; boxes.forEach(function (b) { if (b.checked) n++; });
    $('ts-count').textContent = n === boxes.length ? 'הכול מוכן. מדורה שמחה! 🔥' : 'סימנתם ' + n + ' מתוך ' + boxes.length;
  }
  boxes.forEach(function (b) {
    b.checked = !!st[b.value];
    b.addEventListener('change', function () { st[b.value] = b.checked ? 1 : 0; save(); count(); used('check'); });
  });
  count();
  $('ts-reset').onclick = function () { st = {}; save(); boxes.forEach(function (b) { b.checked = false; }); count(); };

  // ---------- הזמנה בווטסאפ ----------
  function waText() {
    if (!info) return;
    var place = $('ts-place').value.trim(), time = $('ts-time').value;
    var t = 'מוזמנים למדורת היום התשיעי של חנוכה! 🔥\n' + info.main + (time ? ', בשעה ' + time : '') + '\n' +
      (place ? 'המקום: ' + place + '\n' : '') + 'מביאים את הפתילות והשמן שנשארו מהחנוכייה, ושורפים יחד בשמחה.\n\n' +
      'לפרטים ולרשימת הכנה:\n' + location.origin + '/kodesh/chanuka/tshii/';
    $('ts-wa').href = 'https://wa.me/?text=' + encodeURIComponent(t);
  }
  $('ts-place').addEventListener('input', waText);
  $('ts-time').addEventListener('input', waText);
  $('ts-wa').addEventListener('click', function () { used('wa_invite'); });

  // ---------- תזכורת ביומן ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n'); }
  $('ts-ics').onclick = function () {
    if (!info) return;
    var tm = ($('ts-time').value || '19:00').split(':');
    var at = new Date(info.at.getFullYear(), info.at.getMonth(), info.at.getDate(), +tm[0] || 19, +tm[1] || 0);
    var end = new Date(at.getTime() + 90 * 60000), url = location.origin + '/kodesh/chanuka/tshii/';
    var title = 'מדורת היום התשיעי של חנוכה', desc = 'שורפים את הפתילות והשמן שנשארו מהחנוכייה.' + (info.alt ? '\nאפשר גם ' + info.alt.replace(/^או /, '') + '.' : '') + '\n' + url;
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kodesh//chanuka-tshii//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:chanuka-tshii-' + at.getFullYear() + '@kodesh', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'),
      'DTSTART:' + stamp(at), 'DTEND:' + stamp(end), 'SUMMARY:' + esc(title), 'DESCRIPTION:' + esc(desc), 'URL:' + url,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc('מחר: ' + title + '. להכין את צנצנת הפתילות והשמן'), 'TRIGGER:-P1D', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(title), 'TRIGGER:-PT30M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
    var blob = new Blob([L.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chanuka-tshii.ics';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    $('ts-ics-note').innerHTML = '<b>הקובץ ירד.</b> פותחים אותו מההורדות ובוחרים "יומן Google" או "לוח שנה". תקבלו תזכורת יום לפני, וחצי שעה לפני.';
    used('ics');
  };

  function start() { H = window.hebcal; if (H) draw(); else setTimeout(start, 120); }
  start();
})();
