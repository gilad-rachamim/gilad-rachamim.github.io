/* Shared call-transcript helpers: summary, dates, tasks, calendar (ICS + Google Calendar link).
   Used by the iPhone call-recording page and the Android call pages. Everything runs in the
   browser; nothing here is sent to any server. Exposes window.SichaCore. */
(function () {
  var IOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- summary ---------- */
  var CUE = /(סיכמנו|סוכם|נקבע|קבענו|הוחלט|מסכים|מסכימים|צריך|צריכה|חייב|חייבת|תשלח|אשלח|תתקשר|אתקשר|נדבר|נפגש|ניפגש|תזכיר|לזכור|אל תשכח|תעביר|אעביר|לשלם|תשלום|מחיר|עולה|₪|שקל|חוזה|פגישה|תור|דדליין|עד יום|מחר|מחרתיים|השבוע|בשבוע הבא|בשעה)/;
  var STOP = ' של את על עם זה זו זאת הוא היא הם הן אני אתה את אנחנו אתם לא כן גם רק אבל או כי אם מה מי איך למה כמו יש אין היה היתה היו הזה הזאת כל עוד כבר אז פה שם לי לך לו לה לנו להם אותו אותה ממש טוב בסדר אוקיי נו יאללה סבבה רגע ';
  function sentences(t) {
    return String(t || '').replace(/\s+/g, ' ').split(/(?<=[.!?…])\s+|\s+(?=(?:אז|ובנוסף|ועוד|ודבר נוסף)\s)/).map(function (s) { return s.trim(); })
      .filter(function (s) { return s.split(' ').length >= 4; });
  }
  function summarize(t) {
    var ss = sentences(t); if (!ss.length) return [];
    var freq = {};
    ss.forEach(function (s) { s.split(/[^\u0590-\u05FFa-zA-Z0-9₪]+/).forEach(function (w) { w = w.replace(/^[ובהלמשכ](?=[\u0590-\u05FF]{3,})/, ''); if (w.length > 2 && STOP.indexOf(' ' + w + ' ') < 0) freq[w] = (freq[w] || 0) + 1; }); });
    var scored = ss.map(function (s, i) {
      var ws = s.split(/[^\u0590-\u05FFa-zA-Z0-9₪]+/), sc = 0;
      ws.forEach(function (w) { w = w.replace(/^[ובהלמשכ](?=[\u0590-\u05FF]{3,})/, ''); sc += freq[w] > 1 ? Math.log(freq[w]) : 0; });
      sc = sc / Math.sqrt(ws.length + 1);
      if (CUE.test(s)) sc += 2.5; if (/\d/.test(s)) sc += 1; if (i < 2) sc += .5;
      return { s: s.length > 220 ? s.slice(0, 217) + '…' : s, i: i, sc: sc };
    });
    var n = Math.min(8, Math.max(3, Math.round(ss.length / 6)));
    return scored.sort(function (a, b) { return b.sc - a.sc; }).slice(0, n).sort(function (a, b) { return a.i - b.i; }).map(function (x) { return x.s; });
  }

  /* ---------- tasks (things someone has to do) ---------- */
  var TASK = /(צריך|צריכה|צריכים|חייב|חייבת|תשלח|אשלח|נשלח|תתקשר|אתקשר|תחזור|אחזור|תעביר|אעביר|תזכיר|לזכור|אל תשכח|תביא|אביא|לשלם|תשלם|אשלם|לבדוק|תבדוק|אבדוק|לקבוע|תקבע|אקבע|להגיש|תגיש|אגיש)/;
  function findTasks(t) {
    var seen = {}, out = [];
    sentences(t).forEach(function (s) {
      if (!TASK.test(s)) return; var k = s.slice(0, 30); if (seen[k]) return; seen[k] = 1;
      out.push(s.length > 140 ? s.slice(0, 137) + '…' : s);
    });
    return out.slice(0, 10);
  }

  /* ---------- dates and times ---------- */
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var NUM = { 'אחת': 1, 'שתיים': 2, 'שלוש': 3, 'ארבע': 4, 'חמש': 5, 'שש': 6, 'שבע': 7, 'שמונה': 8, 'תשע': 9, 'עשר': 10, 'אחת עשרה': 11, 'שתים עשרה': 12 };
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function findDates(t, base) {
    var now = base ? new Date(base) : new Date(), res = [], seen = {};
    sentences(t).forEach(function (s) {
      var d = null, m;
      if (/מחרתיים/.test(s)) { d = new Date(now); d.setDate(d.getDate() + 2); }
      else if (/מחר/.test(s)) { d = new Date(now); d.setDate(d.getDate() + 1); }
      else if ((m = s.match(/(?:ב)?יום\s+(ראשון|שני|שלישי|רביעי|חמישי|שישי)|ב?שבת(?!\s*שלום)/))) {
        var k = m[1] ? DAYS.indexOf(m[1]) : 6; d = new Date(now); var add = (k - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + add);
      }
      else if ((m = s.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/))) {
        var dd = +m[1], mm = +m[2], yy = m[3] ? +m[3] : now.getFullYear(); if (yy < 100) yy += 2000;
        if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) { d = new Date(yy, mm - 1, dd); if (!m[3] && d < now) d.setFullYear(yy + 1); }
      }
      else if ((m = s.match(/ב(?:עוד)?\s*(\d+|שבוע|שבועיים|יומיים)\s*(ימים|יום)?/)) && /בעוד/.test(s)) {
        var nd = m[1] === 'שבוע' ? 7 : m[1] === 'שבועיים' ? 14 : m[1] === 'יומיים' ? 2 : +m[1];
        if (nd > 0 && nd < 120) { d = new Date(now); d.setDate(d.getDate() + nd); }
      }
      else if (/בשבוע הבא/.test(s)) { d = new Date(now); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); }
      if (!d) return;
      var hh = '', mt;
      if ((mt = s.match(/(\d{1,2}):(\d{2})/))) hh = String(+mt[1]).padStart(2, '0') + ':' + mt[2];
      else if ((mt = s.match(/בשעה\s+(\d{1,2})/))) hh = String(+mt[1]).padStart(2, '0') + ':00';
      else { for (var w in NUM) { if (new RegExp('(?:בשעה|ב)' + w + '(?![\u0590-\u05FF])').test(s)) { hh = String(NUM[w]).padStart(2, '0') + ':00'; } } }
      if (hh) { var h = +hh.slice(0, 2); if (h < 12 && /(אחר הצהריים|אחה"צ|בערב|בלילה)/.test(s)) hh = String(h + 12).padStart(2, '0') + hh.slice(2); else if (h <= 7 && !/בבוקר/.test(s)) hh = String(h + 12).padStart(2, '0') + hh.slice(2); }
      var key = ymd(d) + hh + s.slice(0, 20); if (seen[key]) return; seen[key] = 1;
      res.push({ title: s.length > 90 ? s.slice(0, 87) + '…' : s, date: ymd(d), time: hh || '09:00' });
    });
    return res.slice(0, 8);
  }

  /* ---------- calendar ---------- */
  function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function stamp(date, time) { return date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00'; }
  function endStamp(it) {
    var end = new Date(it.date + 'T' + it.time + ':00'); end.setMinutes(end.getMinutes() + 30);
    return ymd(end).replace(/-/g, '') + 'T' + String(end.getHours()).padStart(2, '0') + String(end.getMinutes()).padStart(2, '0') + '00';
  }
  /* opt: { prodid: 'iphone-sicha', desc: 'מתוך שיחה מוקלטת. hakelim.com/...' } */
  function ics(items, opt) {
    opt = opt || {};
    var now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//' + (opt.prodid || 'sicha') + '//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    items.forEach(function (it, i) {
      L.push('BEGIN:VEVENT', 'UID:' + Date.now() + '-' + i + '@hakelim.com', 'DTSTAMP:' + now,
        'DTSTART;TZID=Asia/Jerusalem:' + stamp(it.date, it.time), 'DTEND;TZID=Asia/Jerusalem:' + endStamp(it),
        'SUMMARY:' + icsText(it.title), 'DESCRIPTION:' + icsText(it.desc || opt.desc || 'מתוך שיחה מוקלטת. hakelim.com'),
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(it.title), 'TRIGGER:-PT15M', 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR'); return L.join('\r\n');
  }
  function download(items, opt) {
    var body = ics(items, opt);
    if (IOS) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body); return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
    a.download = (opt && opt.file) || 'tizkorot-mehasicha.ics'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function gcal(it, details) {
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&ctz=Asia/Jerusalem&text=' + encodeURIComponent(it.title) +
      '&dates=' + stamp(it.date, it.time) + '/' + endStamp(it) + (details ? '&details=' + encodeURIComponent(details) : '');
  }

  window.SichaCore = { IOS: IOS, esc: esc, sentences: sentences, summarize: summarize, findTasks: findTasks, findDates: findDates, ymd: ymd, ics: ics, download: download, gcal: gcal };
})();
