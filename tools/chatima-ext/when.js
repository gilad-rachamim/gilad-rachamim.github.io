// מפענח "מה ומתי" בעברית לאירוע ביומן גוגל, בלי שרת.
// "רופא שיניים מחר ב-10:30" ← { title: 'רופא שיניים', start: Date, end: Date, allDay: false }
// מבין: היום, מחר, מחרתיים, יום ראשון..שבת ("ביום שלישי", "בשלישי"), 15.11, 15/11/2026, 15.11.26,
// שעה: 10:30, ב-10, בשעה 8, 8 בערב / בבוקר / בצהריים / בלילה, "לשעתיים" / "לחצי שעה" / "ל-3 שעות".
(function (root) {
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function at(d, h, m) { var x = new Date(d); x.setHours(h, m || 0, 0, 0); return x; }
  function parseWhen(text, now) {
    now = now || new Date();
    var s = ' ' + String(text || '').replace(/\s+/g, ' ').trim() + ' ', day = null, h = null, mi = 0, dur = 60, m;
    function cut(re) { s = s.replace(re, ' '); }
    // משך
    if ((m = s.match(/\sל(?:משך\s)?(?:-\s?)?(\d{1,2})\s?שעות\s/))) { dur = +m[1] * 60; cut(m[0]); }
    else if (/\sלשעתיים\s/.test(s)) { dur = 120; cut(/\sלשעתיים\s/); }
    else if (/\sלחצי\sשעה\s/.test(s)) { dur = 30; cut(/\sלחצי\sשעה\s/); }
    else if (/\sלשעה\s/.test(s)) { dur = 60; cut(/\sלשעה\s/); }
    else if ((m = s.match(/\sל(?:-\s?)?(\d{1,3})\s?דקות\s/))) { dur = +m[1]; cut(m[0]); }
    // תאריך מספרי
    if ((m = s.match(/\s(?:ב-?\s?|ביום\s)?(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?=\s)/))) {
      var y = m[3] ? +m[3] : now.getFullYear(); if (y < 100) y += 2000;
      day = new Date(y, +m[2] - 1, +m[1]);
      if (!m[3] && day < at(now, 0)) day.setFullYear(y + 1);
      cut(m[0]);
    }
    if (!day) {
      if (/\s(?:ה)?יום\s/.test(s) && !/\sיום\s(?:ה)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)/.test(s)) { day = at(now, 0); cut(/\s(?:ה)?יום(?=\s)/); }
      else if (/\sמחרתיים\s/.test(s)) { day = at(now, 0); day.setDate(day.getDate() + 2); cut(/\sמחרתיים(?=\s)/); }
      else if (/\s(?:ו)?מחר\s/.test(s)) { day = at(now, 0); day.setDate(day.getDate() + 1); cut(/\s(?:ו)?מחר(?=\s)/); }
      else {
        for (var i = 0; i < DAYS.length; i++) {
          var re = new RegExp('\\s(?:ב|ביום\\s|יום\\s)(?:ה)?' + DAYS[i] + '(?:\\sהבא)?(?=\\s)');
          if ((m = s.match(re))) {
            day = at(now, 0); var add = (i - day.getDay() + 7) % 7; if (add === 0) add = 7;
            day.setDate(day.getDate() + add); cut(m[0]); break;
          }
        }
      }
    }
    // שעה
    if ((m = s.match(/\s(?:ב|ב-|בשעה\s|ב\s)?(\d{1,2}):(\d{2})(?=\s)/))) { h = +m[1]; mi = +m[2]; cut(m[0]); }
    else if ((m = s.match(/\s(?:בשעה\s|ב-|ב)(\d{1,2})(?=\s)/))) { h = +m[1]; cut(m[0]); }
    if (h !== null) {
      if ((m = s.match(/\s(?:ב)?(ערב|לילה|צהריים|אחה"צ|אחר\sהצהריים)\s/))) { if (h < 12 && !(m[1] === 'לילה' && h >= 11)) h += 12; if (m[1] === 'לילה' && h === 24) h = 0; cut(m[0]); }
      else if ((m = s.match(/\s(?:ב)?בוקר\s/))) cut(m[0]);
      else if (h >= 1 && h <= 6) h += 12;   // "ב-4" כמעט תמיד אחר הצהריים
    }
    var title = s.replace(/\s+/g, ' ').replace(/\s(?:ב|ב-|בשעה|ביום|ל)\s*$/, ' ').replace(/^[\s,.\-–]+|[\s,.\-–]+$/g, '').trim();
    if (!day && h === null) return { title: title, start: null };
    if (!day) { day = at(now, 0); if (at(day, h, mi) < now) day.setDate(day.getDate() + 1); }
    if (h === null) { var e = new Date(day); e.setDate(e.getDate() + 1); return { title: title, start: day, end: e, allDay: true }; }
    var st = at(day, h, mi); return { title: title, start: st, end: new Date(st.getTime() + dur * 60000), allDay: false };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(d, allDay) { var x = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); return allDay ? x : x + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function calendarUrl(w, details) {
    var u = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(w.title || 'אירוע');
    if (w.start) u += '&dates=' + stamp(w.start, w.allDay) + '/' + stamp(w.end, w.allDay) + '&ctz=Asia/Jerusalem';
    if (details) u += '&details=' + encodeURIComponent(details.slice(0, 1500));
    return u;
  }
  function describe(w) {
    if (!w.start) return 'בלי תאריך – תבחרו ביומן';
    var d = w.start, s = 'יום ' + DAYS[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1);
    return w.allDay ? s + ' · כל היום' : s + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '–' + pad(w.end.getHours()) + ':' + pad(w.end.getMinutes());
  }
  root.HKWhen = { parse: parseWhen, calendarUrl: calendarUrl, describe: describe };
})(typeof self !== 'undefined' ? self : this);
